// Architect assigns fabricator narrative wings to librarians (by signed-in email).

const STORAGE_KEY = "librarian_fabricator_wing_assign_v1";

/**
 * @typedef {{ wingId: string; librarianEmail: string; assignedAt: string }} WingAssignment
 */

function loadRaw() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

function saveRaw(list) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn("fabricatorWingAssignmentStore save failed", e);
  }
}

function normEmail(e) {
  return String(e || "")
    .trim()
    .toLowerCase();
}

/** @returns {WingAssignment[]} */
export function listWingAssignments() {
  return loadRaw();
}

/**
 * @param {string} wingId
 * @param {string[]} librarianEmails
 */
export function assignWingToEmails(wingId, librarianEmails) {
  if (!wingId) return { ok: false, error: "Missing wing id." };
  const emails = [...new Set(librarianEmails.map(normEmail).filter(Boolean))];
  if (!emails.length) return { ok: false, error: "No librarians selected." };
  const list = loadRaw().filter((a) => a.wingId !== wingId);
  const now = new Date().toISOString();
  for (const em of emails) {
    list.push({ wingId, librarianEmail: em, assignedAt: now });
  }
  saveRaw(list);
  return { ok: true, count: emails.length };
}

/**
 * @param {string | null | undefined} librarianEmail
 * @returns {string[]} wing ids
 */
export function listWingIdsForLibrarianEmail(librarianEmail) {
  const em = normEmail(librarianEmail);
  if (!em) return [];
  return loadRaw()
    .filter((a) => a.librarianEmail === em)
    .map((a) => a.wingId);
}

/**
 * Replace this librarian's assignments from API and cache wings locally for explore/menu.
 * @param {string} librarianEmail
 * @param {Array<{id:string,wingName:string,requestId?:string,shelves?:Array<any>,platforms?:Array<any>,assignedAt?:string}>} wings
 */
export function replaceAssignmentsFromApi(librarianEmail, wings) {
  const em = normEmail(librarianEmail);
  if (!em) return;
  const safe = Array.isArray(wings) ? wings : [];
  const next = loadRaw().filter((a) => a.librarianEmail !== em);
  safe.forEach((w) => {
    if (!w?.id) return;
    next.push({
      wingId: String(w.id),
      librarianEmail: em,
      assignedAt: w.assignedAt || new Date().toISOString()
    });
  });
  saveRaw(next);
}

export async function refreshAssignedWingsFromApi() {
  const { getState } = await import("./state.js");
  const st = getState();
  const email = normEmail(st.auth?.email || "");
  if (!email) return { ok: false, error: "No librarian email in session." };
  const { listAssignedWingsForLibrarian } = await import("../api/architectQuizzesApi.js");
  const { upsertFabricatorWings } = await import("./fabricatorWingStore.js");
  const data = await listAssignedWingsForLibrarian();
  const wings = Array.isArray(data?.wings) ? data.wings : [];
  upsertFabricatorWings(wings);
  replaceAssignmentsFromApi(email, wings);
  return { ok: true, count: wings.length };
}

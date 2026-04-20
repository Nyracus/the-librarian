// Fabricator-authored narrative rooms (tileset template): shelves + platform MCQs.

const STORAGE_KEY = "librarian_fabricator_wings_v1";

/**
 * @typedef {{
 *   id: string;
 *   wingName: string;
 *   requestId: string | null;
 *   templateId: "tileset-v1";
 *   createdAt: string;
 *   shelves: { x: number; y: number; w: number; h: number; label: string; text: string }[];
 *   platforms: { x: number; y: number; w: number; h: number; label: string; item: object }[];
 * }} FabricatorWingRoom
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
    console.warn("fabricatorWingStore save failed", e);
  }
  void import("../api/mysqlSync.js")
    .then((m) => m.notifyAuxPersisted())
    .catch(() => {});
}

function genId() {
  return `fw_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}

const W = 640;
const MARGIN = 32;

/**
 * @param {string[]} shelfTexts
 * @param {object[]} platformItems - AssessmentItem-shaped multiple_choice
 * @returns {{ shelves: FabricatorWingRoom["shelves"]; platforms: FabricatorWingRoom["platforms"] }}
 */
function layoutFromCounts(shelfTexts, platformItems) {
  const n = Math.max(0, shelfTexts.length);
  const shelfW = n > 0 ? Math.min(104, (W - 2 * MARGIN) / Math.max(n, 1) - 8) : 96;
  const gap =
    n > 0 ? (W - 2 * MARGIN - n * shelfW) / Math.max(n + 1, 1) : 0;
  /** @type {FabricatorWingRoom["shelves"]} */
  const shelves = [];
  for (let i = 0; i < n; i++) {
    const x = MARGIN + gap + i * (shelfW + gap) + shelfW / 2;
    shelves.push({
      x,
      y: 132,
      w: shelfW,
      h: 40,
      label: `shelf-${i + 1}`,
      text: shelfTexts[i] || ""
    });
  }

  const pCount = platformItems.length;
  const pW = 100;
  const pGap =
    pCount > 0 ? (W - 2 * MARGIN - pCount * pW) / Math.max(pCount + 1, 1) : 0;
  /** @type {FabricatorWingRoom["platforms"]} */
  const platforms = [];
  for (let i = 0; i < pCount; i++) {
    const x = MARGIN + pGap + i * (pW + pGap) + pW / 2;
    platforms.push({
      x,
      y: 288,
      w: pW,
      h: 44,
      label: `platform-${i + 1}`,
      item: platformItems[i]
    });
  }
  return { shelves, platforms };
}

/** @returns {FabricatorWingRoom[]} */
export function listFabricatorWings() {
  return loadRaw().slice().sort((a, b) => {
    const ta = new Date(b.createdAt || 0).getTime();
    const tb = new Date(a.createdAt || 0).getTime();
    return ta - tb;
  });
}

/** @param {string} id */
export function getFabricatorWing(id) {
  if (!id) return null;
  return loadRaw().find((w) => w.id === id) || null;
}

/**
 * @param {{
 *   wingName: string;
 *   requestId: string | null;
 *   shelfTexts: string[];
 *   platformItems: object[];
 * }} data
 * @returns {FabricatorWingRoom}
 */
export function addFabricatorWing(data) {
  const { shelves, platforms } = layoutFromCounts(data.shelfTexts, data.platformItems);
  const wing = {
    id: genId(),
    wingName: data.wingName.trim() || "Untitled wing",
    requestId: data.requestId || null,
    templateId: "tileset-v1",
    createdAt: new Date().toISOString(),
    shelves,
    platforms
  };
  saveRaw([wing, ...loadRaw()]);
  return wing;
}

export function exportFabricatorWingsJson() {
  return JSON.stringify(listFabricatorWings(), null, 2);
}

/**
 * Merge server-provided wing rows into local cache by id.
 * @param {FabricatorWingRoom[]} rows
 */
export function upsertFabricatorWings(rows) {
  if (!Array.isArray(rows)) return;
  const list = loadRaw();
  const byId = new Map(list.map((w) => [w.id, w]));
  rows.forEach((r) => {
    if (!r || !r.id) return;
    byId.set(r.id, {
      ...byId.get(r.id),
      ...r,
      templateId: "tileset-v1"
    });
  });
  saveRaw([...byId.values()]);
}

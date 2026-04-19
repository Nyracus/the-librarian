// src/core/architectRequestsStore.js — local queue for teacher (Architect) quiz/content requests.

const STORAGE_KEY = "librarian_architect_requests_v1";

/**
 * @typedef {{
 *   id: string;
 *   createdAt: string;
 *   title: string;
 *   wing: string;
 *   difficulty: string;
 *   framing: string;
 *   tags: string;
 *   notes: string;
 *   requesterHint: string;
 * }} ArchitectRequest
 */

function loadRaw() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRaw(list) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn("architectRequestsStore save failed", e);
  }
  void import("../api/mysqlSync.js")
    .then((m) => m.notifyAuxPersisted())
    .catch(() => {});
}

export function listArchitectRequests() {
  return loadRaw().slice().sort((a, b) => {
    const ta = new Date(a.createdAt || 0).getTime();
    const tb = new Date(b.createdAt || 0).getTime();
    return tb - ta;
  });
}

/**
 * @param {Omit<ArchitectRequest, "id" | "createdAt">} data
 * @returns {ArchitectRequest}
 */
export function addArchitectRequest(data) {
  const entry = {
    id: `req_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    ...data
  };
  const next = [entry, ...loadRaw()];
  saveRaw(next);
  return entry;
}

export function removeArchitectRequest(id) {
  if (!id) return;
  const next = loadRaw().filter((r) => r.id !== id);
  saveRaw(next);
}

export function exportArchitectRequestsJson() {
  return JSON.stringify(listArchitectRequests(), null, 2);
}

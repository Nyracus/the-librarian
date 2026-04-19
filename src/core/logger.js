// src/core/logger.js

import { getState } from "./state.js";

const LOG_STORAGE_KEY = "librarian_logs_v1";

let logs = loadInitialLogs();

function loadInitialLogs() {
  try {
    const raw = window.localStorage.getItem(LOG_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn("Failed to load logs from storage", err);
  }
  return [];
}

function persistLogs() {
  try {
    window.localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs));
  } catch (err) {
    console.warn("Failed to save logs to storage", err);
  }
}

function generateLocalId() {
  return `log_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function logEvent(baseData) {
  const auth = getState().auth || {};
  const entry = {
    id: generateLocalId(),
    participantId: baseData.participantId ?? null,
    condition: baseData.condition ?? null,
    phase: baseData.phase ?? "unknown",
    screenId: baseData.screenId ?? "unknown",
    itemId: baseData.itemId ?? "unknown",
    response: baseData.response ?? null,
    correctness: baseData.correctness ?? null,
    responseTimeMs: baseData.responseTimeMs ?? null,
    authUserId: baseData.authUserId ?? auth.userId ?? null,
    authUserEmail: baseData.authUserEmail ?? auth.email ?? null,
    timestamp: new Date().toISOString(),
    synced: baseData.synced ?? false
  };

  logs.push(entry);
  persistLogs();
  void import("../api/mysqlSync.js")
    .then((m) => m.scheduleLogsFlush())
    .catch(() => {});
  return entry;
}

/** Legacy: optional Firestore sync (see firestoreEvents.js if re-enabled). */
export function markLogFirestoreSynced(localId, firestoreDocId) {
  if (!localId) return;
  logs = logs.map((log) =>
    log.id === localId ? { ...log, synced: true, firestoreDocId: firestoreDocId || null } : log
  );
  persistLogs();
}

export function getLogs() {
  return logs.slice();
}

export function getUnsyncedLogs() {
  return logs.filter((l) => !l.synced);
}

export function markLogsSynced(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return;
  const idSet = new Set(ids);
  logs = logs.map((log) => (idSet.has(log.id) ? { ...log, synced: true } : log));
  persistLogs();
}

export function logScreenEntry({ participantId, condition, phase, screenId }) {
  return logEvent({
    participantId,
    condition,
    phase,
    screenId,
    itemId: "screen-entry",
    response: { type: "screen-entry" },
    correctness: null,
    responseTimeMs: null
  });
}

export function clearLogs() {
  logs = [];
  persistLogs();
}

export function replaceLogs(nextLogs) {
  if (!Array.isArray(nextLogs)) return;
  logs = nextLogs.filter((item) => item && typeof item === "object");
  persistLogs();
}


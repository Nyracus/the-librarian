// Sync game data to PHP + MySQL when Firebase user is signed in.

import { apiFetch } from "./http.js";
import { getState, replaceState, subscribe, updateState } from "../core/state.js";
import { markLogsSynced, getUnsyncedLogs } from "../core/logger.js";
import { listQuestionBank, replaceQuestionBankRemote } from "../core/questionBankStore.js";
import { listArchitectRequests } from "../core/architectRequestsStore.js";
import { listWorkflowRecords } from "../core/fabricatorWorkflowStore.js";
import { replaceAuxDataRemote } from "../core/auxLocalStores.js";

let suppressRemoteHooks = false;
let stateSaveTimer = null;
let auxSaveTimer = null;
let qbSaveTimer = null;
let logFlushTimer = null;

export function cancelDebouncedRemoteSaves() {
  if (stateSaveTimer) {
    clearTimeout(stateSaveTimer);
    stateSaveTimer = null;
  }
  if (auxSaveTimer) {
    clearTimeout(auxSaveTimer);
    auxSaveTimer = null;
  }
  if (qbSaveTimer) {
    clearTimeout(qbSaveTimer);
    qbSaveTimer = null;
  }
  if (logFlushTimer) {
    clearTimeout(logFlushTimer);
    logFlushTimer = null;
  }
}

const STATE_DEBOUNCE_MS = 1200;
const AUX_DEBOUNCE_MS = 800;
const QB_DEBOUNCE_MS = 800;

export function isRemoteSyncSuppressed() {
  return suppressRemoteHooks;
}

export async function syncAuthProfileFromServer() {
  const st = getState();
  if (st.auth?.status !== "authenticated" || !st.auth.userId) return;
  try {
    const data = await apiFetch("auth/sync.php", { method: "POST" });
    if (data && Object.prototype.hasOwnProperty.call(data, "userRole")) {
      updateState({ userRole: data.userRole ?? null });
    }
  } catch (e) {
    console.warn("[mysqlSync] auth profile sync failed", e?.message);
  }
}

export async function pullAllFromServer() {
  const st = getState();
  if (st.auth?.status !== "authenticated" || !st.auth.userId) {
    return;
  }
  cancelDebouncedRemoteSaves();
  suppressRemoteHooks = true;
  try {
    const stateRes = await apiFetch("me/state.php", { method: "GET" });
    const localAuth = getState().auth;
    if (stateRes?.state && typeof stateRes.state === "object") {
      const pulled = stateRes.state;
      replaceState({
        ...pulled,
        auth: localAuth
      });
    } else if (typeof stateRes?.userRole === "string") {
      updateState({ userRole: stateRes.userRole, auth: localAuth });
    }

    const qbRes = await apiFetch("me/question-bank.php", { method: "GET" });
    if (qbRes?.entries && Array.isArray(qbRes.entries)) {
      replaceQuestionBankRemote(qbRes.entries);
    }

    const auxRes = await apiFetch("me/aux.php", { method: "GET" });
    if (auxRes) {
      replaceAuxDataRemote(auxRes.architectRequests || [], auxRes.fabricatorWorkflows || []);
    }
  } catch (e) {
    console.warn("[mysqlSync] pull failed (using local data)", e?.message || e);
  } finally {
    suppressRemoteHooks = false;
  }
}

export function notifyStatePersisted() {
  if (suppressRemoteHooks) return;
  const st = getState();
  if (st.auth?.status !== "authenticated" || !st.auth.userId) return;
  if (stateSaveTimer) clearTimeout(stateSaveTimer);
  stateSaveTimer = setTimeout(async () => {
    stateSaveTimer = null;
    try {
      const snapshot = getState();
      await apiFetch("me/state.php", {
        method: "PUT",
        body: JSON.stringify({ state: snapshot })
      });
    } catch (e) {
      console.warn("[mysqlSync] state save failed", e.message);
    }
  }, STATE_DEBOUNCE_MS);
}

export function notifyQuestionBankPersisted() {
  if (suppressRemoteHooks) return;
  const st = getState();
  if (st.auth?.status !== "authenticated" || !st.auth.userId) return;
  if (qbSaveTimer) clearTimeout(qbSaveTimer);
  qbSaveTimer = setTimeout(async () => {
    qbSaveTimer = null;
    try {
      const entries = listQuestionBank();
      await apiFetch("me/question-bank.php", {
        method: "PUT",
        body: JSON.stringify({ entries })
      });
    } catch (e) {
      console.warn("[mysqlSync] question bank save failed", e.message);
    }
  }, QB_DEBOUNCE_MS);
}

export function notifyAuxPersisted() {
  if (suppressRemoteHooks) return;
  const st = getState();
  if (st.auth?.status !== "authenticated" || !st.auth.userId) return;
  if (auxSaveTimer) clearTimeout(auxSaveTimer);
  auxSaveTimer = setTimeout(async () => {
    auxSaveTimer = null;
    try {
      await apiFetch("me/aux.php", {
        method: "PUT",
        body: JSON.stringify({
          architectRequests: listArchitectRequests(),
          fabricatorWorkflows: listWorkflowRecords()
        })
      });
    } catch (e) {
      console.warn("[mysqlSync] aux save failed", e.message);
    }
  }, AUX_DEBOUNCE_MS);
}

export async function flushLogsToServer() {
  const st = getState();
  if (st.auth?.status !== "authenticated" || !st.auth.userId) return;
  const unsynced = getUnsyncedLogs();
  if (!unsynced.length) return;
  try {
    await apiFetch("me/logs.php", {
      method: "POST",
      body: JSON.stringify({ entries: unsynced })
    });
    markLogsSynced(unsynced.map((l) => l.id));
  } catch (e) {
    console.warn("[mysqlSync] logs flush failed", e.message);
  }
}

export function scheduleLogsFlush() {
  if (suppressRemoteHooks) return;
  if (logFlushTimer) clearTimeout(logFlushTimer);
  logFlushTimer = setTimeout(() => {
    logFlushTimer = null;
    void flushLogsToServer();
  }, 2000);
}

export async function pushLeaderboardStats(stats) {
  const st = getState();
  if (st.auth?.status !== "authenticated" || !st.auth.userId) {
    return { ok: false, reason: "auth" };
  }
  try {
    await apiFetch("me/leaderboard-stats.php", {
      method: "PUT",
      body: JSON.stringify({
        stats: {
          ...stats,
          displayEmail: st.auth?.email ?? null,
          participantId: st.participantId ?? null
        }
      })
    });
    return { ok: true };
  } catch {
    return { ok: false, reason: "api" };
  }
}

export async function fetchLeaderboardRowsFromApi(limit = 40) {
  const st = getState();
  if (st.auth?.status !== "authenticated" || !st.auth.userId) {
    return [];
  }
  try {
    const data = await apiFetch(`leaderboard.php?limit=${encodeURIComponent(String(limit))}`, {
      method: "GET"
    });
    const raw = Array.isArray(data?.rows) ? data.rows : [];
    return raw.map((r) => ({
      id: r.id,
      displayEmail: r.display_email ?? "",
      participantId: r.participant_id ?? null,
      correctCount: r.correct_count ?? 0,
      wrongCount: r.wrong_count ?? 0,
      gradedCount: r.graded_count ?? 0,
      accuracyPct: r.accuracy_pct ?? 0,
      totalResponseTimeMs: Number(r.total_response_time_ms) || 0,
      updatedAt: r.updated_at ?? null
    }));
  } catch {
    return [];
  }
}

export function initMysqlSync() {
  let prevAuthed = !!(getState().auth?.status === "authenticated" && getState().auth?.userId);
  if (prevAuthed) {
    void pullAllFromServer();
  }
  subscribe((s) => {
    const now = !!(s.auth?.status === "authenticated" && s.auth?.userId);
    if (now && !prevAuthed) {
      void pullAllFromServer();
    }
    prevAuthed = now;
  });
}

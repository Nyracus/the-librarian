// Leaderboard aggregates → PHP + MySQL (`leaderboard_stats`); read rankings via `api/leaderboard.php`.

import { getState } from "./state.js";
import { getLogs } from "./logger.js";

let lastSyncAt = 0;
const SYNC_THROTTLE_MS = 45_000;

/**
 * Stats from local logs for the current signed-in user (rows with matching authUserId, or null authUserId).
 * @param {object[]} logs
 * @param {string} uid
 */
export function aggregateGradedStatsForUser(logs, uid) {
  const pool = logs.filter((l) => !l.authUserId || l.authUserId === uid);
  const graded = pool.filter((l) => l.correctness === true || l.correctness === false);
  const correctCount = graded.filter((l) => l.correctness === true).length;
  const gradedCount = graded.length;
  const accuracyPct = gradedCount > 0 ? Math.round((100 * correctCount) / gradedCount) : 0;
  const totalResponseTimeMs = graded.reduce((sum, l) => {
    const t = l.responseTimeMs;
    return sum + (typeof t === "number" && Number.isFinite(t) ? t : 0);
  }, 0);
  return {
    correctCount,
    wrongCount: gradedCount - correctCount,
    gradedCount,
    accuracyPct,
    totalResponseTimeMs
  };
}

/**
 * Composite score for tie-breaking: accuracy dominates, then volume, then speed (lower ms slightly better when tied).
 */
export function leaderboardSortScore(row) {
  const g = row.gradedCount || 0;
  const a = row.accuracyPct || 0;
  const t = row.totalResponseTimeMs || 0;
  return a * 1e9 + g * 1e3 - Math.min(t / 1e6, 1e3);
}

/**
 * Push current user's aggregate to MySQL (throttled). Call after sign-in or from leaderboard screen.
 * @param {{ force?: boolean }} [opts] — pass `force: true` to bypass throttle (e.g. Refresh).
 * @returns {Promise<{ ok: boolean; reason?: string }>}
 */
export async function syncLeaderboardStatsFromLocalLogs(opts = {}) {
  const force = Boolean(opts.force);
  const state = getState();
  if (state.auth?.status !== "authenticated" || !state.auth.userId) {
    return { ok: false, reason: "auth" };
  }

  const now = Date.now();
  if (!force && now - lastSyncAt < SYNC_THROTTLE_MS) {
    return { ok: true, reason: "throttled" };
  }
  lastSyncAt = now;

  const uid = state.auth.userId;
  const logs = getLogs();
  const stats = aggregateGradedStatsForUser(logs, uid);

  const { pushLeaderboardStats } = await import("../api/mysqlSync.js");
  return pushLeaderboardStats(stats);
}

/**
 * Fetch leaderboard rows (signed-in users only; PHP reads `leaderboard_stats`).
 * @param {number} limitN
 * @returns {Promise<Array<object>>}
 */
export async function fetchLeaderboardRows(limitN = 40) {
  const { fetchLeaderboardRowsFromApi } = await import("../api/mysqlSync.js");
  const rows = await fetchLeaderboardRowsFromApi(limitN);
  const sorted = [...rows].sort((a, b) => leaderboardSortScore(b) - leaderboardSortScore(a));
  return sorted;
}

export function maskEmailForDisplay(email) {
  if (!email || typeof email !== "string") return "—";
  const at = email.indexOf("@");
  if (at < 1) return email.slice(0, 3) + "***";
  const local = email.slice(0, at);
  const domain = email.slice(at);
  const show = local.length <= 2 ? local[0] : local.slice(0, 2);
  return `${show}***${domain}`;
}

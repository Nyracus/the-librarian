// src/core/nonNarrativeSessionStats.js — lightweight stats for non-narrative UI only (from local logs).

import { inferContentDomain } from "./contentDomain.js";

/**
 * @param {object} state
 * @param {object[]} logs
 * @returns {{
 *   currentScreenId: string | null;
 *   gradedCount: number;
 *   correctCount: number;
 *   accuracyPct: number | null;
 *   responseTimeMsTotal: number;
 *   weakestDomain: string | null;
 *   weakestWrongCount: number;
 * }}
 */
export function buildNonNarrativeSessionSnapshot(state, logs) {
  const pid = state.participantId ?? null;
  const pool = Array.isArray(logs)
    ? logs.filter((l) => !pid || l.participantId === pid)
    : [];

  const graded = pool.filter((l) => l.correctness === true || l.correctness === false);
  const correctCount = pool.filter((l) => l.correctness === true).length;
  const gradedCount = graded.length;
  const accuracyPct =
    gradedCount > 0 ? Math.round((100 * correctCount) / gradedCount) : null;

  const responseTimeMsTotal = pool.reduce((sum, l) => {
    const t = l.responseTimeMs;
    return sum + (typeof t === "number" && Number.isFinite(t) ? t : 0);
  }, 0);

  const wrongByDomain = {};
  for (const l of pool) {
    if (l.correctness !== false) continue;
    const d = inferContentDomain(l.screenId, l.itemId);
    wrongByDomain[d] = (wrongByDomain[d] || 0) + 1;
  }

  let weakestDomain = null;
  let worst = 0;
  for (const [d, n] of Object.entries(wrongByDomain)) {
    if (n > worst) {
      worst = n;
      weakestDomain = d;
    }
  }

  return {
    currentScreenId: state.currentScreenId ?? null,
    gradedCount,
    correctCount,
    accuracyPct,
    responseTimeMsTotal,
    weakestDomain: worst > 0 ? weakestDomain : null,
    weakestWrongCount: worst
  };
}

export function formatMsAsMmSs(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

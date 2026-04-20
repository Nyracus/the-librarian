// Helpers for architect quiz sessions (metadata on items, learner-safe copies).

/**
 * Remove architect-only fields before logging or rendering for learners.
 * @param {object} item
 * @returns {object}
 */
export function stripAssessmentItemMeta(item) {
  if (!item || typeof item !== "object") return item;
  const o = JSON.parse(JSON.stringify(item));
  delete o._bankQuestionId;
  return o;
}

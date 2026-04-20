// Maps latency (ms from question shown → submit) to low / medium / high confidence.
// Inverted-U: very fast = rushed (low), comfortable window = high, very slow = hesitation (low).

/** Below this, answers are treated as too fast for typical reading → low. */
export const CONFIDENCE_RT_READ_MIN_MS = 1000;

/** Start of the “comfortable deliberation” band → high begins here. */
export const CONFIDENCE_RT_HIGH_START_MS = 3200;

/** End of the high-confidence band (longer = slower / less fluent → medium, then low). */
export const CONFIDENCE_RT_HIGH_END_MS = 16000;

/** Above this total latency, treat as struggling / distraction → low. */
export const CONFIDENCE_RT_STRUGGLE_MS = 52000;

/**
 * @param {number} responseTimeMs
 * @returns {"low" | "medium" | "high"}
 */
export function confidenceFromResponseTimeMs(responseTimeMs) {
  const t = Math.max(0, Number(responseTimeMs) || 0);
  if (t < CONFIDENCE_RT_READ_MIN_MS) return "low";
  if (t < CONFIDENCE_RT_HIGH_START_MS) return "medium";
  if (t <= CONFIDENCE_RT_HIGH_END_MS) return "high";
  if (t <= CONFIDENCE_RT_STRUGGLE_MS) return "medium";
  return "low";
}

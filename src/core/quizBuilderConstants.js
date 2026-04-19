// Shared quiz builder constants (Architect → student quiz runner).

/** Single blank marker in the question text (Classroom-style). */
export const BLANK_PLACEHOLDER = "[[blank]]";

export const QUESTION_TYPE_CHOICES = [
  { value: "multiple_choice", label: "Multiple choice (MCQ)" },
  { value: "fill_blank", label: "Fill in the blank" },
  { value: "dropdown", label: "Dropdown" }
];

/**
 * Every `value` matches `item.type` in `components/AssessmentItem.js` (live quiz runner).
 * Includes ordering (not in the template wizard slots — use question bank / composer for that).
 */
export const RUNNER_ITEM_TYPE_OPTIONS = [
  { value: "multiple_choice", label: "Multiple choice" },
  { value: "fill_blank", label: "Fill in the blank" },
  { value: "dropdown", label: "Dropdown" },
  { value: "ordering", label: "Ordering" }
];

export function questionTypeLabel(type) {
  const f = QUESTION_TYPE_CHOICES.find((x) => x.value === type);
  return f ? f.label : type;
}

// src/core/nonNarrative.js — helpers + UX checklist for non-narrative presentation only.
// Narrative paths stay unchanged; branch UI/copy with isNonNarrativeCondition().

/**
 * @param {{ condition?: string | null } | null | undefined} state
 * @returns {boolean}
 */
export function isNonNarrativeCondition(state) {
  return state?.condition === "non-narrative";
}

/**
 * Tracked non-narrative UX items (increment as you ship). Not shown in UI.
 * @type {{ id: string; label: string; done: boolean }[]}
 */
export const NON_NARRATIVE_UX_CHECKLIST = [
  { id: "welcome_subtitle", label: "Welcome: subtitle when condition is non-narrative", done: true },
  { id: "hub_mode_line", label: "Hub: extra line for non-narrative", done: true },
  { id: "game_menu_mode_line", label: "Main menu: extra line for non-narrative", done: true },
  { id: "history_learning_ribbon", label: "History learning slice: mode ribbon", done: true },
  { id: "history_pretest_ribbon", label: "History pretest: mode ribbon", done: true },
  { id: "history_posttest_ribbon", label: "History posttest: mode ribbon", done: true },
  { id: "history_delayed_ribbon", label: "History delayed test: mode ribbon", done: true },
  {
    id: "main_menu_session_snapshot",
    label: "Main menu: session snapshot (accuracy, time, weakest domain) for non-narrative",
    done: true
  },
  {
    id: "hub_quick_progress",
    label: "Library Hub: quick progress + focus line for non-narrative",
    done: true
  },
  {
    id: "feature_blueprint_ui",
    label: "Main menu + Welcome: visible feature blueprint (four pillars vs build)",
    done: true
  }
];

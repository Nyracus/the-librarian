// src/core/roles.js — role-based routes (Librarian = player, Architect, Fabricator).

/** @typedef {'librarian' | 'architect' | 'fabricator'} UserRole */

export const ROLE = {
  LIBRARIAN: "librarian",
  ARCHITECT: "architect",
  FABRICATOR: "fabricator"
};

const SETUP_LIBRARIAN = new Set([
  "welcome",
  "device-setup",
  "participant-id",
  "condition",
  "consent"
]);

const LIBRARIAN = new Set([
  "game-menu",
  "hub",
  "leaderboard",
  "library-world",
  "history-1",
  "history-1-pre",
  "history-1-post",
  "history-1-delayed",
  "geography-game",
  "librarian-assigned-quizzes",
  "librarian-quiz-play",
  ...SETUP_LIBRARIAN
]);

const ARCHITECT = new Set([
  "architect-home",
  "architect-requests",
  "architect-quiz-hub",
  "architect-quiz-studio",
  "architect-quiz-build",
  "architect-quiz-run",
  "architect-question-edit",
  "architect-quiz-assign",
  "architect-wing-assign",
  "architect-approval"
]);

const FABRICATOR = new Set([
  "fabricator-home",
  "fabricator-queue",
  "fabricator-request-detail",
  "fabricator-wing-builder",
  "fabricator-users"
]);

const AUTH_SCREENS = new Set(["login", "auth", "auth-librarian", "auth-architect", "auth-fabricator"]);

/**
 * @param {string} screenId
 * @param {UserRole | null | undefined} role
 */
export function canAccessRoute(screenId, role) {
  if (AUTH_SCREENS.has(screenId)) return true;
  if (!role) return false;

  if (role === ROLE.LIBRARIAN) return LIBRARIAN.has(screenId);
  if (role === ROLE.ARCHITECT) return ARCHITECT.has(screenId);
  if (role === ROLE.FABRICATOR) return FABRICATOR.has(screenId);
  return false;
}

/**
 * @param {UserRole | null | undefined} role
 * @returns {string}
 */
export function homeRouteForRole(role) {
  switch (role) {
    case ROLE.ARCHITECT:
      return "architect-home";
    case ROLE.FABRICATOR:
      return "fabricator-home";
    case ROLE.LIBRARIAN:
    default:
      return "game-menu";
  }
}

/**
 * @param {string} screenId
 * @returns {UserRole}
 */
export function roleFromAuthScreenId(screenId) {
  if (screenId === "auth-architect") return ROLE.ARCHITECT;
  if (screenId === "auth-fabricator") return ROLE.FABRICATOR;
  return ROLE.LIBRARIAN;
}

/** Chapter dropdown entries allowed per role (menu + main menu). */
export function chapterIdsForRole(role) {
  if (role === ROLE.ARCHITECT) {
    return [
      "architect-home",
      "architect-quiz-hub",
      "architect-quiz-assign",
      "architect-wing-assign",
      "architect-requests",
      "architect-approval"
    ];
  }
  if (role === ROLE.FABRICATOR) {
    return [
      "fabricator-home",
      "fabricator-queue",
      "fabricator-request-detail",
      "fabricator-wing-builder",
      "fabricator-users"
    ];
  }
  // Librarian "chapters" are wings plus assigned architect quizzes.
  return ["history-1", "geography-game", "librarian-assigned-quizzes"];
}

// src/core/router.js

import { getState, updateState } from "./state.js";
import {
  canAccessRoute,
  homeRouteForRole,
  roleFromAuthScreenId,
  ROLE
} from "./roles.js";

import { renderWelcomeScreen } from "../screens/WelcomeScreen.js";
import { renderRolePickerScreen } from "../screens/RolePickerScreen.js";
import { renderAuthScreen } from "../screens/AuthScreen.js";
import { renderArchitectHomeScreen } from "../screens/ArchitectHomeScreen.js";
import { renderFabricatorHomeScreen } from "../screens/FabricatorHomeScreen.js";
import { renderDeviceSetupScreen } from "../screens/DeviceSetupScreen.js";
import { renderParticipantIdScreen } from "../screens/ParticipantIdScreen.js";
import { renderConditionScreen } from "../screens/ConditionScreen.js";
import { renderConsentScreen } from "../screens/ConsentScreen.js";
import { renderHubScreen } from "../screens/HubScreen.js";
import { renderLeaderboardScreen } from "../screens/LeaderboardScreen.js";
import { renderHistorySlice1Screen } from "../screens/HistorySlice1Screen.js";
import { renderHistoryWing1PretestScreen } from "../screens/HistoryWing1PretestScreen.js";
import { renderHistoryWing1PosttestScreen } from "../screens/HistoryWing1PosttestScreen.js";
import { renderHistoryWing1DelayedTestScreen } from "../screens/HistoryWing1DelayedTestScreen.js";
import {
  renderGeographyGameScreen,
  cleanupGeographySession
} from "../screens/GeographyGameScreen.js";
import {
  renderGameWorldScreen,
  cleanupGameWorldSession
} from "../screens/GameWorldScreen.js";
import { renderGameMainMenuScreen } from "../screens/GameMainMenuScreen.js";
import { renderArchitectRequestScreen } from "../screens/ArchitectRequestScreen.js";
import { renderArchitectQuizStudioScreen } from "../screens/ArchitectQuizStudioScreen.js";
import { renderArchitectQuizBuildScreen } from "../screens/ArchitectQuizBuildScreen.js";
import { renderTemplatedQuizRunScreen } from "../screens/TemplatedQuizRunScreen.js";
import { renderArchitectQuizHubScreen } from "../screens/ArchitectQuizHubScreen.js";
import { renderArchitectQuestionEditScreen } from "../screens/ArchitectQuestionEditScreen.js";
import { renderArchitectQuizAssignScreen } from "../screens/ArchitectQuizAssignScreen.js";
import { renderArchitectWingAssignScreen } from "../screens/ArchitectWingAssignScreen.js";
import { renderLibrarianAssignedQuizzesScreen } from "../screens/LibrarianAssignedQuizzesScreen.js";
import { renderLibrarianQuizPlayScreen } from "../screens/LibrarianQuizPlayScreen.js";
import { renderFabricatorQueueScreen } from "../screens/FabricatorQueueScreen.js";
import { renderFabricatorRequestDetailScreen } from "../screens/FabricatorRequestDetailScreen.js";
import { renderFabricatorWingBuilderScreen } from "../screens/FabricatorWingBuilderScreen.js";
import { renderFabricatorUsersScreen } from "../screens/FabricatorUsersScreen.js";
import { renderArchitectApprovalScreen } from "../screens/ArchitectApprovalScreen.js";

const ROUTES = {
  login: renderRolePickerScreen,
  "auth-librarian": renderAuthScreen,
  "auth-architect": renderAuthScreen,
  "auth-fabricator": renderAuthScreen,
  "game-menu": renderGameMainMenuScreen,
  "architect-home": renderArchitectHomeScreen,
  "fabricator-home": renderFabricatorHomeScreen,
  "architect-requests": renderArchitectRequestScreen,
  "architect-quiz-studio": renderArchitectQuizStudioScreen,
  "architect-quiz-build": renderArchitectQuizBuildScreen,
  "architect-quiz-run": renderTemplatedQuizRunScreen,
  "architect-quiz-hub": renderArchitectQuizHubScreen,
  "architect-question-edit": renderArchitectQuestionEditScreen,
  "architect-quiz-assign": renderArchitectQuizAssignScreen,
  "architect-wing-assign": renderArchitectWingAssignScreen,
  "librarian-assigned-quizzes": renderLibrarianAssignedQuizzesScreen,
  "librarian-quiz-play": renderLibrarianQuizPlayScreen,
  "fabricator-queue": renderFabricatorQueueScreen,
  "fabricator-request-detail": renderFabricatorRequestDetailScreen,
  "fabricator-wing-builder": renderFabricatorWingBuilderScreen,
  "fabricator-users": renderFabricatorUsersScreen,
  "architect-approval": renderArchitectApprovalScreen,
  welcome: renderWelcomeScreen,
  auth: renderAuthScreen,
  "device-setup": renderDeviceSetupScreen,
  "participant-id": renderParticipantIdScreen,
  condition: renderConditionScreen,
  consent: renderConsentScreen,
  hub: renderHubScreen,
  leaderboard: renderLeaderboardScreen,
  "library-world": renderGameWorldScreen,
  "history-1": renderHistorySlice1Screen,
  "history-1-pre": renderHistoryWing1PretestScreen,
  "history-1-post": renderHistoryWing1PosttestScreen,
  "history-1-delayed": renderHistoryWing1DelayedTestScreen,
  "geography-game": renderGeographyGameScreen
};

export function initRouter({ container }) {
  function handleRouteChange() {
    const raw = getCurrentScreenIdFromHash();
    if (!raw) {
      const s = getState();
      const authed = s.auth?.status === "authenticated";
      const role = s.userRole;
      if (!authed) {
        window.location.hash = "#login";
      } else if (!role) {
        window.location.hash = "#login";
      } else {
        window.location.hash = `#${homeRouteForRole(role)}`;
      }
      return;
    }
    const screenId = normalizeScreenId(raw);
    if (raw !== screenId) {
      window.location.hash = `#${screenId}`;
      return;
    }
    navigateTo(screenId, { container });
  }

  window.addEventListener("hashchange", handleRouteChange);
  handleRouteChange();
}

function normalizeScreenId(raw) {
  if (raw === "auth") return "auth-librarian";
  return raw;
}

function getCurrentScreenIdFromHash() {
  const hash = window.location.hash || "";
  return hash.startsWith("#") ? hash.slice(1) : hash;
}

export function navigateTo(screenId, { container }) {
  const fromHash = getCurrentScreenIdFromHash();
  // Sync URL first; actual cleanup + render run on hashchange so we never mount a screen
  // and then immediately tear it down when the hash event fires (was blanking geography, etc.).
  if (fromHash !== screenId) {
    window.location.hash = `#${screenId}`;
    return;
  }

  cleanupGeographySession();
  cleanupGameWorldSession();

  const state = getState();
  const authed = state.auth?.status === "authenticated";
  let role = state.userRole;

  // Role is assigned once per account on the server (see api/auth/register-role.php). Do not infer from route.

  const ALLOWED_BEFORE_AUTH = new Set([
    "login",
    "auth-librarian",
    "auth-architect",
    "auth-fabricator",
    "welcome",
    "device-setup",
    "participant-id",
    "condition",
    "consent"
  ]);

  if (!authed && !ALLOWED_BEFORE_AUTH.has(screenId)) {
    updateState({
      auth: {
        ...(state.auth || {}),
        postAuthRoute: screenId
      }
    });
    window.location.hash = "#login";
    return;
  }

  if (authed && role && screenId === "login") {
    window.location.hash = `#${homeRouteForRole(role)}`;
    return;
  }

  if (authed && role && (screenId === "auth-librarian" || screenId === "auth-architect" || screenId === "auth-fabricator")) {
    if (roleFromAuthScreenId(screenId) !== role) {
      window.location.hash = `#${homeRouteForRole(role)}`;
      return;
    }
  }

  if (authed && !role && !ALLOWED_BEFORE_AUTH.has(screenId)) {
    window.location.hash = "#login";
    return;
  }

  if (authed && role && !canAccessRoute(screenId, role)) {
    window.location.hash = `#${homeRouteForRole(role)}`;
    return;
  }

  const renderFn = ROUTES[screenId];
  if (!renderFn) {
    console.warn(`Unknown route: ${screenId}, falling back`);
    if (!authed || !role) {
      return navigateTo("login", { container });
    }
    return navigateTo(homeRouteForRole(role), { container });
  }

  const context = { state: getState() };
  renderFn(container, context, { screenId });
}


// src/core/state.js

const STORAGE_KEY = "librarian_state_v1";

let state = loadInitialState();
const subscribers = [];

function createDefaultState() {
  return {
    participantId: null,
    condition: null, // "narrative" | "non-narrative"
    phase: "setup", // "setup" | "pretest" | "learning" | "immediate-posttest" | "delayed-posttest"
    currentScreenId: "welcome",
    consentGiven: false,
    auth: {
      status: "anonymous", // "anonymous" | "authenticated"
      userId: null,
      email: null,
      // Where to send the user after auth (set by router or welcome button).
      postAuthRoute: null
    },
    progress: {
      completedScreens: [],
      wingHistory01Step: 0
    },
    world: {
      exploreMode: false,
      room: "hub",
      historyWingComplete: false,
      geographyUnlocked: false,
      geographyReturnRoute: null,
      geographyPuzzle1Complete: false,
      geographyPuzzle2Complete: false
    },
    config: {
      conditionMode: "url", // "url" | "fixed" | "random"
      fixedCondition: "narrative",
      playerDevice: "pc", // "pc" | "mobile-tablet"
      controlScheme: "auto" // "auto" | "keyboard" | "touch"
    },
    /** @type {null | { title: string; templateId: string; items: object[]; builtAt: string }} */
    architectQuizSession: null,
    /** Wizard state while composing a custom quiz (topic + per-question types → step-by-step items). */
    architectQuizBuild: null,
    /** Architect CMS: question id being edited, or null for new. */
    architectQuestionEditId: null,
    /** Fabricator workflow: which Architect request id is open in detail, or null. */
    fabricatorActiveRequestId: null,
    /** After consent/setup, jump here instead of hub (e.g. chapter chosen from main menu). */
    pendingChapterRoute: null,
    /** Set at sign-in: librarian | architect | fabricator */
    userRole: null
  };
}

function loadInitialState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn("Failed to load state from storage", err);
  }

  return createDefaultState();
}

function persistState() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn("Failed to save state to storage", err);
  }
  void import("../api/mysqlSync.js")
    .then((m) => m.notifyStatePersisted())
    .catch(() => {});
}

export function getState() {
  return state;
}

export function updateState(partial) {
  state = {
    ...state,
    ...partial,
    progress: {
      ...state.progress,
      ...(partial.progress || {})
    },
    config: {
      ...state.config,
      ...(partial.config || {})
    },
    world: {
      ...state.world,
      ...(partial.world || {})
    },
    // Shallow-merge auth so partial updates (e.g. postAuthRoute) never drop status / userId / email.
    auth:
      partial.auth !== undefined
        ? { ...state.auth, ...partial.auth }
        : state.auth
  };
  persistState();
  subscribers.forEach((fn) => fn(state));
}

export function subscribe(listener) {
  subscribers.push(listener);
  return () => {
    const idx = subscribers.indexOf(listener);
    if (idx >= 0) subscribers.splice(idx, 1);
  };
}

export function resetState() {
  const prevAuth = state.auth;
  const prevUserRole = state.userRole;
  state = createDefaultState();
  state.auth = prevAuth;
  state.userRole = prevUserRole;
  persistState();
  subscribers.forEach((fn) => fn(state));
}

export function replaceState(nextState) {
  if (!nextState || typeof nextState !== "object") return;
  state = {
    ...createDefaultState(),
    ...nextState,
    progress: {
      ...createDefaultState().progress,
      ...(nextState.progress || {})
    },
    config: {
      ...createDefaultState().config,
      ...(nextState.config || {})
    },
    world: {
      ...createDefaultState().world,
      ...(nextState.world || {})
    },
    architectQuizSession:
      nextState.architectQuizSession !== undefined
        ? nextState.architectQuizSession
        : createDefaultState().architectQuizSession,
    architectQuizBuild:
      nextState.architectQuizBuild !== undefined
        ? nextState.architectQuizBuild
        : createDefaultState().architectQuizBuild,
    architectQuestionEditId:
      nextState.architectQuestionEditId !== undefined
        ? nextState.architectQuestionEditId
        : createDefaultState().architectQuestionEditId,
    fabricatorActiveRequestId:
      nextState.fabricatorActiveRequestId !== undefined
        ? nextState.fabricatorActiveRequestId
        : createDefaultState().fabricatorActiveRequestId,
    pendingChapterRoute:
      nextState.pendingChapterRoute !== undefined
        ? nextState.pendingChapterRoute
        : createDefaultState().pendingChapterRoute,
    userRole:
      nextState.userRole !== undefined ? nextState.userRole : createDefaultState().userRole
  };
  persistState();
  subscribers.forEach((fn) => fn(state));
}


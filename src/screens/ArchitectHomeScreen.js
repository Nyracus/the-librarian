// src/screens/ArchitectHomeScreen.js — Architect workspace (no learner / fabricator tools).

import { createElement } from "../components/ui.js";
import { updateState, getState } from "../core/state.js";
import { logScreenEntry } from "../core/logger.js";
import { navigateTo } from "../core/router.js";

export function renderArchitectHomeScreen(container, context, { screenId }) {
  updateState({ currentScreenId: screenId, phase: "learning" });
  const state = getState();

  logScreenEntry({
    participantId: state.participantId,
    condition: state.condition,
    phase: state.phase,
    screenId
  });

  container.innerHTML = "";
  const screenEl = createElement("section", { className: "screen architect-home" });

  screenEl.appendChild(
    createElement("div", { className: "screen__badge", text: "Architect workspace" })
  );
  screenEl.appendChild(
    createElement("h1", { className: "screen__title", text: "Teaching tools" })
  );
  screenEl.appendChild(
    createElement("p", {
      className: "screen__subtitle",
      text:
        "Author quizzes (single items or full sets), assign them to librarians, and manage fabricator requests from here."
    })
  );

  const add = (label, route, primary = false) =>
    screenEl.appendChild(
      createElement("button", {
        className: primary ? "btn btn--primary" : "btn btn--ghost",
        text: label,
        onClick: () => navigateTo(route, { container })
      })
    );

  add("Quizzes hub", "architect-quiz-hub", true);
  add("Assign quiz to librarians", "architect-quiz-assign");
  add("Assign narrative wings (tileset rooms)", "architect-wing-assign");
  add("Requests & fabricators (narrative handoff)", "architect-requests");
  add("Review fabricator submissions", "architect-approval");

  screenEl.appendChild(
    createElement("p", {
      className: "screen__body text-muted",
      text: "Use the header Menu to jump chapters, sign out, or switch account."
    })
  );

  container.appendChild(screenEl);
}

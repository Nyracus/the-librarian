// src/screens/ConditionScreen.js

import { createElement } from "../components/ui.js";
import { updateState, getState } from "../core/state.js";
import { logScreenEntry } from "../core/logger.js";
import { navigateTo } from "../core/router.js";

export function renderConditionScreen(container, context, { screenId }) {
  const stateBefore = getState();
  const assignedCondition = ensureConditionAssigned(stateBefore);

  updateState({ currentScreenId: screenId, condition: assignedCondition, phase: "setup" });
  const state = getState();

  logScreenEntry({
    participantId: state.participantId,
    condition: state.condition,
    phase: "setup",
    screenId
  });

  container.innerHTML = "";
  const screenEl = createElement("section", { className: "screen" });

  screenEl.appendChild(
    createElement("div", { className: "screen__badge", text: "Setup • Condition" })
  );
  screenEl.appendChild(
    createElement("h1", { className: "screen__title", text: "Condition assigned" })
  );
  screenEl.appendChild(
    createElement("p", {
      className: "screen__subtitle",
      text:
        state.condition === "narrative"
          ? "Narrative condition."
          : "Non-narrative condition."
    })
  );
  screenEl.appendChild(
    createElement("p", {
      className: "screen__body",
      text: "Tasks, order, timing, and scoring are the same across conditions."
    })
  );

  screenEl.appendChild(
    createElement("button", {
      className: "btn btn--primary",
      text: "Continue to consent",
      onClick: () => navigateTo("consent", { container })
    })
  );

  container.appendChild(screenEl);
}

function ensureConditionAssigned(state) {
  if (state.condition) return state.condition;

  const mode = state.config?.conditionMode || "random";
  if (mode === "fixed") {
    return state.config?.fixedCondition === "non-narrative" ? "non-narrative" : "narrative";
  }

  if (mode === "url") {
    if (state.condition === "narrative" || state.condition === "non-narrative") return state.condition;
  }

  return Math.random() < 0.5 ? "narrative" : "non-narrative";
}


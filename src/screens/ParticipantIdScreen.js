// src/screens/ParticipantIdScreen.js

import { createElement } from "../components/ui.js";
import { updateState, getState } from "../core/state.js";
import { logScreenEntry } from "../core/logger.js";
import { navigateTo } from "../core/router.js";

export function renderParticipantIdScreen(container, context, { screenId }) {
  updateState({ currentScreenId: screenId, phase: "setup" });
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
    createElement("div", { className: "screen__badge", text: "Setup • Participant ID" })
  );
  screenEl.appendChild(
    createElement("h1", { className: "screen__title", text: "Enter participant ID" })
  );
  screenEl.appendChild(
    createElement("p", {
      className: "screen__subtitle",
      text: "Use the ID provided by the researcher."
    })
  );

  const form = createElement("form", { className: "screen__form" });
  const input = createElement("input", {
    attrs: { type: "text", required: "true", placeholder: "e.g., P001" }
  });
  if (state.participantId) input.value = state.participantId;

  const feedback = createElement("div", { className: "screen__feedback text-danger" });

  form.appendChild(input);
  form.appendChild(
    createElement("button", {
      className: "btn btn--primary",
      text: "Continue",
      attrs: { type: "submit" }
    })
  );

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const value = input.value.trim();
    if (!value) {
      feedback.textContent = "Please enter a participant ID.";
      return;
    }
    updateState({ participantId: value });
    navigateTo("condition", { container });
  });

  screenEl.appendChild(form);
  screenEl.appendChild(feedback);
  container.appendChild(screenEl);
}


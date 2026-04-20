// src/screens/FabricatorHomeScreen.js — Fabricator workspace (narrative handoff only).

import { createElement } from "../components/ui.js";
import { updateState, getState } from "../core/state.js";
import { logScreenEntry } from "../core/logger.js";
import { navigateTo } from "../core/router.js";

export function renderFabricatorHomeScreen(container, context, { screenId }) {
  updateState({ currentScreenId: screenId, phase: "learning" });
  const state = getState();

  logScreenEntry({
    participantId: state.participantId,
    condition: state.condition,
    phase: state.phase,
    screenId
  });

  container.innerHTML = "";
  const screenEl = createElement("section", { className: "screen fabricator-home" });

  screenEl.appendChild(
    createElement("div", { className: "screen__badge", text: "Fabricator workspace" })
  );
  screenEl.appendChild(
    createElement("h1", { className: "screen__title", text: "Requests & handoff" })
  );
  screenEl.appendChild(
    createElement("p", {
      className: "screen__subtitle",
      text: "Claim Architect requests, document implementation, submit for approval."
    })
  );

  screenEl.appendChild(
    createElement("button", {
      className: "btn btn--primary",
      text: "Open request queue",
      onClick: () => navigateTo("fabricator-queue", { container })
    })
  );

  screenEl.appendChild(
    createElement("button", {
      className: "btn btn--ghost",
      text: "Tileset narrative wing (from open request)",
      onClick: () => navigateTo("fabricator-wing-builder", { container })
    })
  );

  screenEl.appendChild(
    createElement("button", {
      className: "btn btn--ghost",
      text: "Manage users (admin)",
      onClick: () => navigateTo("fabricator-users", { container })
    })
  );

  screenEl.appendChild(
    createElement("p", {
      className: "screen__body text-muted",
      text: "Use Menu for chapter navigation and sign out."
    })
  );

  container.appendChild(screenEl);
}

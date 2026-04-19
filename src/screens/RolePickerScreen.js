// src/screens/RolePickerScreen.js — choose Librarian / Architect / Fabricator before sign-in.

import { createElement } from "../components/ui.js";
import { updateState, getState } from "../core/state.js";
import { logScreenEntry } from "../core/logger.js";
import { navigateTo } from "../core/router.js";

export function renderRolePickerScreen(container, context, { screenId }) {
  updateState({ currentScreenId: screenId, phase: "setup" });
  const state = getState();

  logScreenEntry({
    participantId: state.participantId,
    condition: state.condition,
    phase: "setup",
    screenId
  });

  container.innerHTML = "";
  const screenEl = createElement("section", { className: "screen role-picker-screen" });

  screenEl.appendChild(
    createElement("div", { className: "screen__badge", text: "Sign in" })
  );
  screenEl.appendChild(
    createElement("h1", { className: "screen__title", text: "Choose your role" })
  );
  screenEl.appendChild(
    createElement("p", {
      className: "screen__subtitle",
      text: "Each Google or email account can register for one role only (first choice is final)."
    })
  );

  const row = createElement("div", { className: "role-picker-screen__grid" });

  row.appendChild(
    createElement("button", {
      attrs: { type: "button" },
      className: "btn btn--primary role-picker-screen__card",
      text: "Librarian (player)",
      onClick: () => navigateTo("auth-librarian", { container })
    })
  );
  row.appendChild(
    createElement("button", {
      attrs: { type: "button" },
      className: "btn btn--ghost role-picker-screen__card",
      text: "Architect",
      onClick: () => navigateTo("auth-architect", { container })
    })
  );
  row.appendChild(
    createElement("button", {
      attrs: { type: "button" },
      className: "btn btn--ghost role-picker-screen__card",
      text: "Fabricator",
      onClick: () => navigateTo("auth-fabricator", { container })
    })
  );

  screenEl.appendChild(row);

  if (state.auth?.status === "authenticated") {
    screenEl.appendChild(
      createElement("p", {
        className: "screen__body text-muted",
        text: `You are already signed in as ${state.auth?.email || "—"}. Open your workspace from the menu, or sign out first to switch role.`
      })
    );
  }

  container.appendChild(screenEl);
}

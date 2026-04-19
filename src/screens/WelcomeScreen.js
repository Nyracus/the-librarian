// src/screens/WelcomeScreen.js

import { createElement } from "../components/ui.js";
import { updateState, getState } from "../core/state.js";
import { logScreenEntry } from "../core/logger.js";
import { navigateTo } from "../core/router.js";

export function renderWelcomeScreen(container, context, { screenId }) {
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
    createElement("div", { className: "screen__badge", text: "Welcome" })
  );
  screenEl.appendChild(createElement("h1", { className: "screen__title", text: "The Librarian" }));
  screenEl.appendChild(
    createElement("p", {
      className: "screen__subtitle",
      text:
        state.pendingChapterRoute === "history-1"
          ? "Continue through the short setup; you’ll start in the History wing (pre-test and post-test are in the side menu there)."
          : "Continue to set up your session, or sign in if prompted."
    })
  );

  screenEl.appendChild(
    createElement("button", {
      className: "btn btn--primary",
      text: "Begin",
      onClick: () => {
        const s = getState();
        if (s.auth?.status !== "authenticated") {
          updateState({
            auth: {
              ...(s.auth || {}),
              postAuthRoute: "welcome"
            }
          });
          navigateTo("auth-librarian", { container });
          return;
        }
        if (s.pendingChapterRoute) {
          navigateTo("device-setup", { container });
          return;
        }
        navigateTo("hub", { container });
      }
    })
  );

  container.appendChild(screenEl);
}


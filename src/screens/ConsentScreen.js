// src/screens/ConsentScreen.js
// Placeholder copy — replace with IRB / ethics-approved text before running participants.

import { createElement } from "../components/ui.js";
import { updateState, getState } from "../core/state.js";
import { logScreenEntry, logEvent } from "../core/logger.js";
import { navigateTo } from "../core/router.js";

export function renderConsentScreen(container, context, { screenId }) {
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

  screenEl.appendChild(createElement("div", { className: "screen__badge", text: "Setup • Consent" }));
  screenEl.appendChild(createElement("h1", { className: "screen__title", text: "Research participation" }));

  const body = createElement("div", { className: "screen__body consent-placeholder" });
  body.innerHTML = `
    <p><strong>[DRAFT — edit before data collection]</strong> You are invited to use <em>The Librarian</em>, a browser-based learning prototype inspired by historical library traditions (including the idea of great manuscript halls such as those associated with Nālandā).</p>
    <p>The app records <strong>how you move through activities</strong> (screens visited, responses, timings, and similar events) so researchers can study learning and design. With your account sign-in, we may store <strong>identifiers and related profile fields</strong> as needed for this project. Data may be stored in <strong>Google Firebase</strong> (authentication and cloud database) in addition to temporary storage on your device.</p>
    <p>Participation is voluntary. You may stop at any time by closing the browser; some information may already have been transmitted while you played. For questions about this study, contact the research team (add your email / PI details here).</p>
    <p class="text-muted">Replace this entire block with your institution’s consent language and privacy notices.</p>
  `;
  screenEl.appendChild(body);

  const form = createElement("form", { className: "screen__form" });
  const label = createElement("label", { className: "text-muted", text: " " });
  const checkbox = createElement("input", { attrs: { type: "checkbox", required: "true" } });
  label.textContent = "";
  label.appendChild(checkbox);
  label.appendChild(
    document.createTextNode(
      " I have read the above (or will read the final approved version) and agree to participate."
    )
  );

  const feedback = createElement("div", { className: "screen__feedback text-danger" });

  form.appendChild(label);
  form.appendChild(
    createElement("button", {
      className: "btn btn--primary",
      text: "I agree and continue",
      attrs: { type: "submit" }
    })
  );

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!checkbox.checked) {
      feedback.textContent = "You must agree before continuing.";
      return;
    }

    const pending = getState().pendingChapterRoute;
    updateState({ consentGiven: true, pendingChapterRoute: null });
    const s = getState();
    logEvent({
      participantId: s.participantId,
      condition: s.condition,
      phase: "setup",
      screenId,
      itemId: "consent",
      response: { consentGiven: true },
      correctness: null,
      responseTimeMs: null
    });

    if (pending && typeof pending === "string" && pending.length > 0) {
      navigateTo(pending, { container });
    } else {
      navigateTo("hub", { container });
    }
  });

  screenEl.appendChild(form);
  screenEl.appendChild(feedback);
  container.appendChild(screenEl);
}

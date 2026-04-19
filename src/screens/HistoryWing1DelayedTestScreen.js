// src/screens/HistoryWing1DelayedTestScreen.js

import { createElement } from "../components/ui.js";
import { getHistoryWing1 } from "../content/historyWing1.js";
import { renderAssessmentItem } from "../components/AssessmentItem.js";
import { getState, updateState } from "../core/state.js";
import { logScreenEntry } from "../core/logger.js";
import { navigateTo } from "../core/router.js";
import { isNonNarrativeCondition } from "../core/nonNarrative.js";

export function renderHistoryWing1DelayedTestScreen(container, context, { screenId }) {
  updateState({ currentScreenId: screenId, phase: "delayed-posttest" });
  const state = getState();
  const wing = getHistoryWing1(state.condition || "narrative");

  logScreenEntry({
    participantId: state.participantId,
    condition: state.condition,
    phase: state.phase,
    screenId
  });

  container.innerHTML = "";
  const screenEl = createElement("section", { className: "screen" });
  container.appendChild(screenEl);

  screenEl.appendChild(
    createElement("div", { className: "screen__badge", text: `History • ${wing.wingTitle} • Delayed Test` })
  );
  screenEl.appendChild(createElement("h1", { className: "screen__title", text: "Delayed test" }));
  screenEl.appendChild(
    createElement("p", { className: "screen__subtitle", text: "Follow-up questions (prototype screen)." })
  );
  if (isNonNarrativeCondition(state)) {
    screenEl.appendChild(
      createElement("p", {
        className: "non-narrative-ribbon",
        text: "Non-narrative • delayed check (same item style as other tests)"
      })
    );
  }

  const items = wing.assessments.delayedTest || [];
  const itemContainer = createElement("div");
  screenEl.appendChild(itemContainer);

  let index = 0;
  renderNext();

  function renderNext() {
    if (index >= items.length) {
      itemContainer.innerHTML = "";
      itemContainer.appendChild(createElement("p", { className: "screen__body", text: "Delayed test complete." }));
      itemContainer.appendChild(
        createElement("button", {
          className: "btn btn--primary",
          text: "Back to hub",
          onClick: () => navigateTo("hub", { container })
        })
      );
      return;
    }

    renderAssessmentItem(itemContainer, {
      item: items[index],
      context: {
        participantId: state.participantId,
        condition: state.condition,
        phase: "delayed-posttest",
        screenId
      },
      onComplete: () => {
        index += 1;
        renderNext();
      }
    });
  }
}


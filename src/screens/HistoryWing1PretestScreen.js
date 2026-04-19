// src/screens/HistoryWing1PretestScreen.js

import { createElement } from "../components/ui.js";
import { getHistoryWing1 } from "../content/historyWing1.js";
import { renderAssessmentItem } from "../components/AssessmentItem.js";
import { getState, updateState } from "../core/state.js";
import { logScreenEntry } from "../core/logger.js";
import { navigateTo } from "../core/router.js";
import { isNonNarrativeCondition } from "../core/nonNarrative.js";

export function renderHistoryWing1PretestScreen(container, context, { screenId }) {
  const before = getState();
  updateState({
    currentScreenId: screenId,
    phase: "pretest",
    progress: {
      ...(before.progress || {}),
      wingHistory01Step: 0,
      score: {
        snippetCorrectCount: 0,
        puzzleCorrect: false,
        posttestCorrectCount: 0,
        posttestAnsweredCount: 0
      }
    }
  });
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
    createElement("div", { className: "screen__badge", text: `History • ${wing.wingTitle} • Pre-test` })
  );
  screenEl.appendChild(createElement("h1", { className: "screen__title", text: "Pre-test" }));
  screenEl.appendChild(
    createElement("p", { className: "screen__subtitle", text: "Answer a few questions before the learning module." })
  );
  if (isNonNarrativeCondition(state)) {
    screenEl.appendChild(
      createElement("p", {
        className: "non-narrative-ribbon",
        text: "Non-narrative • pretest items use the same skills as the module"
      })
    );
  }

  const items = wing.assessments.pretest || [];
  const itemContainer = createElement("div");
  screenEl.appendChild(itemContainer);

  let index = 0;
  renderNext();

  function renderNext() {
    if (index >= items.length) {
      itemContainer.innerHTML = "";
      itemContainer.appendChild(createElement("p", { className: "screen__body", text: "Pre-test complete." }));
      itemContainer.appendChild(
        createElement("button", {
          className: "btn btn--primary",
          text: "Start learning module",
          onClick: () => navigateTo("history-1", { container })
        })
      );
      return;
    }

    renderAssessmentItem(itemContainer, {
      item: items[index],
      context: {
        participantId: state.participantId,
        condition: state.condition,
        phase: "pretest",
        screenId
      },
      onComplete: () => {
        index += 1;
        renderNext();
      }
    });
  }
}


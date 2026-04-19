// src/screens/HistoryWing1PosttestScreen.js

import { createElement } from "../components/ui.js";
import { getHistoryWing1 } from "../content/historyWing1.js";
import { renderAssessmentItem } from "../components/AssessmentItem.js";
import { getState, updateState } from "../core/state.js";
import { logScreenEntry, logEvent, getLogs } from "../core/logger.js";
import { navigateTo } from "../core/router.js";
import { isNonNarrativeCondition } from "../core/nonNarrative.js";

export function renderHistoryWing1PosttestScreen(container, context, { screenId }) {
  updateState({ currentScreenId: screenId, phase: "immediate-posttest" });
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
    createElement("div", { className: "screen__badge", text: `History • ${wing.wingTitle} • Post-test` })
  );
  screenEl.appendChild(createElement("h1", { className: "screen__title", text: "Post-test" }));
  screenEl.appendChild(
    createElement("p", { className: "screen__subtitle", text: "Answer a few questions after completing the module." })
  );
  if (isNonNarrativeCondition(state)) {
    screenEl.appendChild(
      createElement("p", {
        className: "non-narrative-ribbon",
        text: "Non-narrative • post-test checks retention of the model"
      })
    );
  }

  const items = wing.assessments.posttest || [];
  const itemContainer = createElement("div");
  screenEl.appendChild(itemContainer);

  let index = 0;
  renderNext();

  function renderNext() {
    if (index >= items.length) {
      itemContainer.innerHTML = "";
      const score = getState().progress?.score || {};
      itemContainer.appendChild(createElement("p", { className: "screen__body", text: "Post-test complete." }));
      itemContainer.appendChild(
        createElement("p", {
          className: "screen__subtitle",
          text: `Post-test score: ${score.posttestCorrectCount || 0}/${score.posttestAnsweredCount || 0}`
        })
      );
      writeSessionSummaryIfNeeded(screenId);
      itemContainer.appendChild(
        createElement("button", {
          className: "btn btn--primary",
          text: "Back to hub",
          onClick: () => navigateTo("hub", { container })
        })
      );
      return;
    }

    itemContainer.innerHTML = "";
    itemContainer.appendChild(
      createElement("p", {
        className: "text-muted",
        text: `Progress: ${index + 1}/${items.length}`
      })
    );

    renderAssessmentItem(itemContainer, {
      item: items[index],
      context: {
        participantId: state.participantId,
        condition: state.condition,
        phase: "immediate-posttest",
        screenId
      },
      onComplete: () => {
        index += 1;
        renderNext();
      }
    });
  }
}

function writeSessionSummaryIfNeeded(screenId) {
  const state = getState();
  const existing = getLogs().some(
    (l) =>
      l.response?.type === "session-summary" &&
      l.screenId === screenId &&
      l.participantId === state.participantId
  );
  if (existing) return;

  const score = state.progress?.score || {};
  logEvent({
    participantId: state.participantId,
    condition: state.condition,
    phase: "immediate-posttest",
    screenId,
    itemId: "session_summary_history_01",
    response: {
      type: "session-summary",
      wingId: "history_01",
      snippetCorrectCount: score.snippetCorrectCount || 0,
      snippetTotal: 3,
      puzzleCorrect: Boolean(score.puzzleCorrect),
      posttestCorrectCount: score.posttestCorrectCount || 0,
      posttestAnsweredCount: score.posttestAnsweredCount || 0
    },
    correctness: null,
    responseTimeMs: null
  });
}


// Librarian plays an assigned quiz (real attempt; latency-based confidence in AssessmentItem).

import { createElement } from "../components/ui.js";
import { renderAssessmentItem } from "../components/AssessmentItem.js";
import { getState, updateState } from "../core/state.js";
import { logScreenEntry } from "../core/logger.js";
import { navigateTo } from "../core/router.js";
import { stripAssessmentItemMeta } from "../core/quizSessionUtils.js";

export function renderLibrarianQuizPlayScreen(container, context, { screenId }) {
  updateState({ currentScreenId: screenId, phase: "learning" });
  let state = getState();
  const session = state.librarianQuizPlaySession;

  logScreenEntry({
    participantId: state.participantId,
    condition: state.condition,
    phase: state.phase,
    screenId
  });

  container.innerHTML = "";
  const screenEl = createElement("section", { className: "screen templated-quiz-run" });

  if (!session || !Array.isArray(session.items) || session.items.length === 0) {
    screenEl.appendChild(
      createElement("p", {
        className: "screen__body",
        text: "No quiz loaded. Open Attend quiz from the hub and choose one."
      })
    );
    screenEl.appendChild(
      createElement("button", {
        attrs: { type: "button" },
        className: "btn btn--primary",
        text: "Architect quizzes",
        onClick: () => navigateTo("librarian-assigned-quizzes", { container })
      })
    );
    container.appendChild(screenEl);
    return;
  }

  screenEl.appendChild(
    createElement("div", { className: "screen__badge", text: "Architect quiz" })
  );
  screenEl.appendChild(
    createElement("h1", { className: "screen__title", text: session.title })
  );

  const itemHost = createElement("div");
  screenEl.appendChild(itemHost);

  const ctxBase = {
    participantId: state.participantId,
    condition: state.condition,
    phase: state.phase,
    screenId
  };

  let index = 0;
  let correctCount = 0;
  let answered = 0;

  function renderNext() {
    state = getState();
    if (index >= session.items.length) {
      itemHost.innerHTML = "";
      itemHost.appendChild(
        createElement("p", {
          className: "screen__body",
          text: `Finished. ${correctCount} / ${answered} correct.`
        })
      );
      itemHost.appendChild(
        createElement("div", { className: "templated-quiz-run__end" }, [
          createElement("button", {
            attrs: { type: "button" },
            className: "btn btn--primary",
            text: "Architect quizzes",
            onClick: () => {
              updateState({ librarianQuizPlaySession: null });
              navigateTo("librarian-assigned-quizzes", { container });
            }
          }),
          createElement("button", {
            attrs: { type: "button" },
            className: "btn btn--ghost",
            text: "Library Hub",
            onClick: () => {
              updateState({ librarianQuizPlaySession: null });
              navigateTo("hub", { container });
            }
          })
        ])
      );
      return;
    }

    const rawItem = session.items[index];
    const item = stripAssessmentItemMeta(rawItem);
    const progress = createElement("p", {
      className: "text-muted",
      text: `Item ${index + 1} of ${session.items.length}`
    });
    itemHost.innerHTML = "";
    itemHost.appendChild(progress);
    const wrap = createElement("div");
    itemHost.appendChild(wrap);

    renderAssessmentItem(wrap, {
      item,
      context: ctxBase,
      onComplete: ({ correctness }) => {
        answered += 1;
        if (correctness) correctCount += 1;
        index += 1;
        renderNext();
      }
    });
  }

  renderNext();
  container.appendChild(screenEl);
}

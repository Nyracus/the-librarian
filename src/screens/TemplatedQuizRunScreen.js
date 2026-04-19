// src/screens/TemplatedQuizRunScreen.js — run a template-generated quiz from architectQuizSession.

import { createElement } from "../components/ui.js";
import { renderAssessmentItem } from "../components/AssessmentItem.js";
import { getState, updateState } from "../core/state.js";
import { logScreenEntry } from "../core/logger.js";
import { navigateTo } from "../core/router.js";

export function renderTemplatedQuizRunScreen(container, context, { screenId }) {
  updateState({ currentScreenId: screenId, phase: "learning" });
  let state = getState();
  const session = state.architectQuizSession;

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
        text: "No quiz in session yet. Go back to create or pick questions first."
      })
    );
    screenEl.appendChild(
      createElement("button", {
        attrs: { type: "button" },
        className: "btn btn--primary",
        text: "Open quizzes & questions",
        onClick: () => navigateTo("architect-quiz-hub", { container })
      })
    );
    container.appendChild(screenEl);
    return;
  }

  screenEl.appendChild(
    createElement("div", { className: "screen__badge", text: "Quiz • preview" })
  );
  screenEl.appendChild(
    createElement("h1", { className: "screen__title", text: session.title })
  );
  const tplHuman =
    session.templateId === "question-bank"
      ? "Saved questions"
      : session.templateId === "custom-classroom"
        ? "Custom quiz (composer)"
        : `Template: ${session.templateId}`;
  screenEl.appendChild(
    createElement("p", {
      className: "screen__subtitle",
      text: `${tplHuman} · ${session.items.length} item(s)`
    })
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
          text: `Finished. ${correctCount} / ${answered} correct (with confidence logged per item).`
        })
      );
      itemHost.appendChild(
        createElement("div", { className: "templated-quiz-run__end" }, [
          createElement("button", {
            attrs: { type: "button" },
            className: "btn btn--primary",
            text: "Quizzes & questions",
            onClick: () => navigateTo("architect-quiz-hub", { container })
          }),
          createElement("button", {
            attrs: { type: "button" },
            className: "btn btn--ghost",
            text: "Clear session",
            onClick: () => {
              updateState({ architectQuizSession: null });
              navigateTo("architect-quiz-hub", { container });
            }
          }),
          createElement("button", {
            attrs: { type: "button" },
            className: "btn btn--ghost",
            text: "Architect home",
            onClick: () => navigateTo("architect-home", { container })
          })
        ])
      );
      return;
    }

    const item = session.items[index];
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

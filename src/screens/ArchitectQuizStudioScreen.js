// src/screens/ArchitectQuizStudioScreen.js — topic + per-question types, then step-by-step composer (Classroom-style).

import { createElement } from "../components/ui.js";
import { getState, updateState } from "../core/state.js";
import { logScreenEntry } from "../core/logger.js";
import { navigateTo } from "../core/router.js";
import { QUESTION_TYPE_CHOICES } from "../core/quizBuilderConstants.js";

const MAX_QUESTIONS = 15;

export function renderArchitectQuizStudioScreen(container, context, { screenId }) {
  updateState({ currentScreenId: screenId, phase: "learning" });
  const state = getState();

  logScreenEntry({
    participantId: state.participantId,
    condition: state.condition,
    phase: state.phase,
    screenId
  });

  container.innerHTML = "";
  const screenEl = createElement("section", { className: "screen architect-quiz-studio" });

  screenEl.appendChild(
    createElement("div", { className: "screen__badge", text: "Architect • Quiz composer" })
  );
  screenEl.appendChild(
    createElement("h1", { className: "screen__title", text: "Build a quiz for students" })
  );
  screenEl.appendChild(
    createElement("p", {
      className: "screen__subtitle",
      text: "Set the topic, choose how many questions you want, and pick the format for each (multiple choice, fill in the blank, or dropdown — like Google Classroom). Then you’ll write each question one at a time."
    })
  );

  const statusEl = createElement("p", { className: "architect-quiz-studio__status", text: "" });

  const topicInput = document.createElement("input");
  topicInput.type = "text";
  topicInput.id = "aqs-topic";
  topicInput.className = "screen__input";
  topicInput.placeholder = "Topic / unit (shown to you while authoring; use it in stems as you like)";

  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.id = "aqs-title";
  titleInput.className = "screen__input";
  titleInput.placeholder = "Quiz title for students (optional)";

  const countSel = document.createElement("select");
  countSel.id = "aqs-count";
  countSel.className = "screen__input";
  for (let i = 1; i <= MAX_QUESTIONS; i++) {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = `${i} question${i === 1 ? "" : "s"}`;
    countSel.appendChild(opt);
  }

  const typeRowsHost = createElement("div", { className: "architect-quiz-studio__type-rows" });

  function buildTypeSelectors(n) {
    typeRowsHost.innerHTML = "";
    for (let i = 0; i < n; i++) {
      const row = createElement("div", { className: "architect-quiz-studio__type-row" });
      row.appendChild(
        createElement("span", {
          className: "architect-quiz-studio__type-label",
          text: `Question ${i + 1}`
        })
      );
      const sel = document.createElement("select");
      sel.className = "screen__input";
      QUESTION_TYPE_CHOICES.forEach((c) => {
        const opt = document.createElement("option");
        opt.value = c.value;
        opt.textContent = c.label;
        sel.appendChild(opt);
      });
      row.appendChild(sel);
      typeRowsHost.appendChild(row);
    }
  }

  countSel.addEventListener("change", () => {
    buildTypeSelectors(parseInt(countSel.value, 10) || 1);
  });
  buildTypeSelectors(1);

  const form = createElement("div", { className: "architect-quiz-studio__form" });
  form.appendChild(
    createElement("label", {
      className: "architect-request-label",
      attrs: { for: "aqs-topic" },
      text: "Topic / unit"
    })
  );
  form.appendChild(topicInput);
  form.appendChild(
    createElement("label", {
      className: "architect-request-label",
      attrs: { for: "aqs-title" },
      text: "Quiz title (optional)"
    })
  );
  form.appendChild(titleInput);
  form.appendChild(
    createElement("label", {
      className: "architect-request-label",
      attrs: { for: "aqs-count" },
      text: "How many questions?"
    })
  );
  form.appendChild(countSel);
  form.appendChild(
    createElement("p", {
      className: "text-muted",
      text: "For each slot, choose whether students will see multiple choice (four options), a fill-in-the-blank, or a dropdown."
    })
  );
  form.appendChild(typeRowsHost);

  const goBtn = createElement("button", {
    attrs: { type: "button" },
    className: "btn btn--primary",
    text: "Continue — write questions",
    onClick: () => {
      const topic = topicInput.value.trim();
      if (!topic) {
        statusEl.textContent = "Enter a topic or unit label.";
        statusEl.className = "architect-quiz-studio__status text-danger";
        return;
      }
      const n = parseInt(countSel.value, 10) || 1;
      const selects = typeRowsHost.querySelectorAll("select");
      const types = [];
      for (let i = 0; i < n; i++) {
        const sel = selects[i];
        types.push(sel ? sel.value : "multiple_choice");
      }
      updateState({
        architectQuizBuild: {
          topic,
          quizTitle: titleInput.value.trim(),
          types,
          items: [],
          idx: 0
        }
      });
      statusEl.textContent = "";
      statusEl.className = "architect-quiz-studio__status";
      navigateTo("architect-quiz-build", { container });
    }
  });

  form.appendChild(goBtn);
  form.appendChild(statusEl);
  screenEl.appendChild(form);

  screenEl.appendChild(
    createElement("div", { className: "architect-quiz-studio__actions" }, [
      createElement("button", {
        attrs: { type: "button" },
        className: "btn btn--ghost",
        text: "Quizzes & questions menu",
        onClick: () => navigateTo("architect-quiz-hub", { container })
      }),
      createElement("button", {
        attrs: { type: "button" },
        className: "btn btn--ghost",
        text: "Session from saved questions",
        onClick: () => navigateTo("architect-quiz-bank-pick", { container })
      }),
      createElement("button", {
        attrs: { type: "button" },
        className: "btn btn--ghost",
        text: "Architect home",
        onClick: () => navigateTo("architect-home", { container })
      })
    ])
  );

  container.appendChild(screenEl);
}

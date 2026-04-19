// src/screens/ArchitectQuizBuildScreen.js — step-by-step quiz authoring (Classroom-style).

import { createElement } from "../components/ui.js";
import { getState, updateState } from "../core/state.js";
import { logScreenEntry } from "../core/logger.js";
import { navigateTo } from "../core/router.js";
import {
  BLANK_PLACEHOLDER,
  questionTypeLabel
} from "../core/quizBuilderConstants.js";

function genItemId() {
  return `q_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`;
}

function clone(x) {
  return JSON.parse(JSON.stringify(x));
}

function makeEmptyItem(type) {
  const id = genItemId();
  if (type === "multiple_choice") {
    return {
      id,
      type: "multiple_choice",
      prompt: "",
      options: [
        { id: "a", text: "" },
        { id: "b", text: "" },
        { id: "c", text: "" },
        { id: "d", text: "" }
      ],
      correctOptionId: "a"
    };
  }
  if (type === "fill_blank") {
    return {
      id,
      type: "fill_blank",
      prompt: `The main idea is [[blank]].`,
      correctAnswer: ""
    };
  }
  if (type === "dropdown") {
    return {
      id,
      type: "dropdown",
      prompt: "",
      options: [
        { id: "d1", text: "", priority: 1 },
        { id: "d2", text: "", priority: 2 },
        { id: "d3", text: "", priority: 3 }
      ],
      correctOptionId: "d1"
    };
  }
  return null;
}

export function renderArchitectQuizBuildScreen(container, context, { screenId }) {
  updateState({ currentScreenId: screenId, phase: "learning" });
  const state = getState();
  const build = state.architectQuizBuild;

  logScreenEntry({
    participantId: state.participantId,
    condition: state.condition,
    phase: state.phase,
    screenId
  });

  container.innerHTML = "";
  const screenEl = createElement("section", { className: "screen architect-quiz-build" });

  if (
    !build ||
    !Array.isArray(build.types) ||
    build.types.length === 0 ||
    typeof build.idx !== "number"
  ) {
    screenEl.appendChild(
      createElement("p", {
        className: "screen__body",
        text: "No quiz draft. Start from the quiz composer."
      })
    );
    screenEl.appendChild(
      createElement("button", {
        attrs: { type: "button" },
        className: "btn btn--primary",
        text: "Go to quiz composer",
        onClick: () => navigateTo("architect-quiz-studio", { container })
      })
    );
    container.appendChild(screenEl);
    return;
  }

  const { topic, quizTitle, types, items, idx } = build;
  const n = types.length;
  const qType = types[idx];
  let working = items[idx] ? clone(items[idx]) : makeEmptyItem(qType);
  if (!working) {
    screenEl.appendChild(
      createElement("p", { className: "text-danger", text: "Invalid question type in draft." })
    );
    container.appendChild(screenEl);
    return;
  }

  screenEl.appendChild(
    createElement("div", { className: "screen__badge", text: "Architect • Compose quiz" })
  );
  screenEl.appendChild(
    createElement("h1", {
      className: "screen__title",
      text: `Question ${idx + 1} of ${n}`
    })
  );
  screenEl.appendChild(
    createElement("p", {
      className: "screen__subtitle",
      text: `Topic: ${topic} · Type: ${questionTypeLabel(qType)}`
    })
  );

  const statusEl = createElement("p", { className: "architect-quiz-build__status", text: "" });
  const formHost = createElement("div", { className: "architect-quiz-build__form-host" });

  function validateAndSerialize() {
    if (working.type === "multiple_choice") {
      if (!String(working.prompt || "").trim()) {
        statusEl.textContent = "Enter the question text.";
        statusEl.className = "architect-quiz-build__status text-danger";
        return null;
      }
      for (const o of working.options) {
        if (!String(o.text || "").trim()) {
          statusEl.textContent = "Fill in all four answer choices.";
          statusEl.className = "architect-quiz-build__status text-danger";
          return null;
        }
      }
      return clone(working);
    }
    if (working.type === "fill_blank") {
      const parts = String(working.prompt || "").split(BLANK_PLACEHOLDER);
      if (parts.length !== 2) {
        statusEl.textContent = `Use exactly one blank marker: ${BLANK_PLACEHOLDER} (use “Insert blank”).`;
        statusEl.className = "architect-quiz-build__status text-danger";
        return null;
      }
      if (!String(working.correctAnswer || "").trim()) {
        statusEl.textContent = "Enter the correct answer for the blank.";
        statusEl.className = "architect-quiz-build__status text-danger";
        return null;
      }
      return clone(working);
    }
    if (working.type === "dropdown") {
      if (!String(working.prompt || "").trim()) {
        statusEl.textContent = "Enter the question text.";
        statusEl.className = "architect-quiz-build__status text-danger";
        return null;
      }
      if (!Array.isArray(working.options) || working.options.length < 2) {
        statusEl.textContent = "Add at least two dropdown options.";
        statusEl.className = "architect-quiz-build__status text-danger";
        return null;
      }
      const seen = new Set();
      for (const o of working.options) {
        if (!String(o.text || "").trim()) {
          statusEl.textContent = "Each option needs a label.";
          statusEl.className = "architect-quiz-build__status text-danger";
          return null;
        }
        if (typeof o.priority !== "number" || Number.isNaN(o.priority)) {
          statusEl.textContent = "Each option needs a numeric priority (display order).";
          statusEl.className = "architect-quiz-build__status text-danger";
          return null;
        }
        seen.add(o.id);
      }
      if (seen.size !== working.options.length) {
        statusEl.textContent = "Option ids must be unique.";
        statusEl.className = "architect-quiz-build__status text-danger";
        return null;
      }
      if (!seen.has(working.correctOptionId)) {
        statusEl.textContent = "Mark which option is correct.";
        statusEl.className = "architect-quiz-build__status text-danger";
        return null;
      }
      return clone(working);
    }
    return null;
  }

  function renderMcqForm() {
    formHost.innerHTML = "";
    const prompt = document.createElement("textarea");
    prompt.className = "screen__textarea";
    prompt.rows = 3;
    prompt.value = working.prompt;
    prompt.placeholder = "Question (students see this as the stem)";
    prompt.addEventListener("input", () => {
      working.prompt = prompt.value;
    });
    formHost.appendChild(
      createElement("label", { className: "architect-request-label", text: "Question" })
    );
    formHost.appendChild(prompt);

    formHost.appendChild(
      createElement("p", {
        className: "text-muted",
        text: "Four choices appear as a list (like Google Classroom). Pick the one correct answer."
      })
    );

    const grid = createElement("div", { className: "architect-q-edit__options-grid" });
    working.options.forEach((opt, i) => {
      const row = createElement("div", { className: "architect-q-edit__option-row" });
      row.appendChild(
        createElement("span", { className: "architect-q-edit__opt-id", text: `${String.fromCharCode(65 + i)}.` })
      );
      const inp = document.createElement("input");
      inp.type = "text";
      inp.className = "screen__input";
      inp.value = opt.text;
      inp.addEventListener("input", () => {
        working.options[i].text = inp.value;
      });
      row.appendChild(inp);
      grid.appendChild(row);
    });
    formHost.appendChild(grid);

    const corr = document.createElement("select");
    corr.className = "screen__input";
    working.options.forEach((o, i) => {
      const opt = document.createElement("option");
      opt.value = o.id;
      opt.textContent = `Correct: ${String.fromCharCode(65 + i)}`;
      corr.appendChild(opt);
    });
    corr.value = working.correctOptionId;
    corr.addEventListener("change", () => {
      working.correctOptionId = corr.value;
    });
    formHost.appendChild(
      createElement("label", { className: "architect-request-label", text: "Correct answer" })
    );
    formHost.appendChild(corr);
  }

  function renderFillForm() {
    formHost.innerHTML = "";
    const prompt = document.createElement("textarea");
    prompt.className = "screen__textarea";
    prompt.rows = 4;
    prompt.value = working.prompt;
    prompt.placeholder = `Include exactly one ${BLANK_PLACEHOLDER} where the student should type an answer.`;
    prompt.addEventListener("input", () => {
      working.prompt = prompt.value;
    });
    formHost.appendChild(
      createElement("label", { className: "architect-request-label", text: "Question with blank" })
    );
    formHost.appendChild(prompt);

    const insertBtn = createElement("button", {
      attrs: { type: "button" },
      className: "btn btn--ghost",
      text: "Insert blank at cursor",
      onClick: () => {
        const start = prompt.selectionStart ?? prompt.value.length;
        const end = prompt.selectionEnd ?? start;
        const v = prompt.value;
        prompt.value = v.slice(0, start) + BLANK_PLACEHOLDER + v.slice(end);
        working.prompt = prompt.value;
        const pos = start + BLANK_PLACEHOLDER.length;
        prompt.focus();
        prompt.setSelectionRange(pos, pos);
      }
    });
    formHost.appendChild(insertBtn);

    const ans = document.createElement("input");
    ans.type = "text";
    ans.className = "screen__input";
    ans.value = working.correctAnswer;
    ans.placeholder = "Correct answer (grading is case-insensitive)";
    ans.addEventListener("input", () => {
      working.correctAnswer = ans.value;
    });
    formHost.appendChild(
      createElement("label", { className: "architect-request-label", text: "Correct answer" })
    );
    formHost.appendChild(ans);
  }

  function renderDropdownForm() {
    formHost.innerHTML = "";
    const prompt = document.createElement("textarea");
    prompt.className = "screen__textarea";
    prompt.rows = 3;
    prompt.value = working.prompt;
    prompt.placeholder = "Question stem";
    prompt.addEventListener("input", () => {
      working.prompt = prompt.value;
    });
    formHost.appendChild(
      createElement("label", { className: "architect-request-label", text: "Question" })
    );
    formHost.appendChild(prompt);

    formHost.appendChild(
      createElement("p", {
        className: "text-muted",
        text: "Students see a single dropdown. Lower priority numbers appear first. Mark the correct option."
      })
    );

    const table = document.createElement("div");
    table.className = "architect-quiz-build__dd-table";

    working.options.forEach((row, i) => {
      const line = createElement("div", { className: "architect-quiz-build__dd-row" });
      const lab = document.createElement("input");
      lab.type = "text";
      lab.className = "screen__input";
      lab.placeholder = "Option label";
      lab.value = row.text;
      lab.addEventListener("input", () => {
        working.options[i].text = lab.value;
      });

      const pri = document.createElement("input");
      pri.type = "number";
      pri.className = "screen__input architect-quiz-build__dd-pri";
      pri.min = "0";
      pri.step = "1";
      pri.value = String(row.priority ?? i + 1);
      pri.addEventListener("input", () => {
        working.options[i].priority = Number(pri.value) || 0;
      });

      const rad = document.createElement("input");
      rad.type = "radio";
      rad.name = "dd-correct";
      rad.checked = working.correctOptionId === row.id;
      rad.addEventListener("change", () => {
        if (rad.checked) working.correctOptionId = row.id;
      });

      const rLabel = createElement("label", { className: "architect-quiz-build__dd-correct" });
      rLabel.appendChild(rad);
      rLabel.appendChild(document.createTextNode(" Correct"));

      line.appendChild(lab);
      line.appendChild(pri);
      line.appendChild(rLabel);
      table.appendChild(line);
    });

    formHost.appendChild(table);

    const addOpt = createElement("button", {
      attrs: { type: "button" },
      className: "btn btn--ghost",
      text: "Add option",
      onClick: () => {
        const next = working.options.length + 1;
        working.options.push({ id: genItemId(), text: "", priority: next });
        renderDropdownForm();
      }
    });
    formHost.appendChild(addOpt);
  }

  if (working.type === "multiple_choice") renderMcqForm();
  else if (working.type === "fill_blank") renderFillForm();
  else if (working.type === "dropdown") renderDropdownForm();

  const actions = createElement("div", { className: "architect-quiz-build__actions" });

  if (idx > 0) {
    actions.appendChild(
      createElement("button", {
        attrs: { type: "button" },
        className: "btn btn--ghost",
        text: "← Previous question",
        onClick: () => {
          const nextItems = [...(items || [])];
          const v = validateAndSerialize();
          if (!v) return;
          nextItems[idx] = v;
          updateState({
            architectQuizBuild: {
              ...build,
              items: nextItems,
              idx: idx - 1
            }
          });
          navigateTo("architect-quiz-build", { container });
        }
      })
    );
  }

  actions.appendChild(
    createElement("button", {
      attrs: { type: "button" },
      className: "btn btn--primary",
      text: idx >= n - 1 ? "Finish & preview quiz" : "Next question →",
      onClick: () => {
        const v = validateAndSerialize();
        if (!v) return;
        const nextItems = [...(items || [])];
        nextItems[idx] = v;
        if (idx >= n - 1) {
          const title =
            (quizTitle && String(quizTitle).trim()) || `Quiz — ${topic}`;
          updateState({
            architectQuizSession: {
              title,
              templateId: "custom-classroom",
              topic,
              items: nextItems,
              builtAt: new Date().toISOString()
            },
            architectQuizBuild: null
          });
          navigateTo("architect-quiz-run", { container });
        } else {
          updateState({
            architectQuizBuild: {
              ...build,
              items: nextItems,
              idx: idx + 1
            }
          });
          navigateTo("architect-quiz-build", { container });
        }
      }
    })
  );

  actions.appendChild(
    createElement("button", {
      attrs: { type: "button" },
      className: "btn btn--ghost",
      text: "Discard draft",
      onClick: () => {
        if (!window.confirm("Discard this quiz draft?")) return;
        updateState({ architectQuizBuild: null });
        navigateTo("architect-quiz-hub", { container });
      }
    })
  );

  screenEl.appendChild(formHost);
  screenEl.appendChild(statusEl);
  screenEl.appendChild(actions);
  container.appendChild(screenEl);
}

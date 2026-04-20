// src/screens/ArchitectQuestionEditScreen.js — create/edit one saved quiz (single item; MCQ, fill blank, dropdown, ordering).

import { createElement } from "../components/ui.js";
import { getState, updateState } from "../core/state.js";
import { logScreenEntry, logEvent } from "../core/logger.js";
import { navigateTo } from "../core/router.js";
import { BLANK_PLACEHOLDER, RUNNER_ITEM_TYPE_OPTIONS } from "../core/quizBuilderConstants.js";
import {
  getQuestionBankEntry,
  createQuestionBankEntry,
  updateQuestionBankEntry,
  assessmentItemFromBankQuestion
} from "../core/questionBankStore.js";
import { saveArchitectQuiz } from "../api/architectQuizzesApi.js";
import { isLikelyMissingPhpApiError } from "../api/http.js";

const WINGS = [
  { v: "history", l: "History" },
  { v: "geography", l: "Geography" },
  { v: "literature", l: "Literature" },
  { v: "theology", l: "Theology" },
  { v: "general", l: "General / cross-wing" }
];

function genOptId() {
  return `d_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 6)}`;
}

function defaultMcqItem() {
  return {
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

function defaultFibItem() {
  return {
    type: "fill_blank",
    prompt: `The answer is ${BLANK_PLACEHOLDER}.`,
    correctAnswer: ""
  };
}

function defaultDdItem() {
  return {
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

function defaultOrdItem() {
  return {
    type: "ordering",
    prompt: "",
    items: [
      { id: "s1", text: "" },
      { id: "s2", text: "" },
      { id: "s3", text: "" },
      { id: "s4", text: "" }
    ],
    correctOrder: ["s1", "s2", "s3", "s4"]
  };
}

function inferItemType(item) {
  const t = item?.type;
  if (t === "ordering") return "ordering";
  if (t === "fill_blank") return "fill_blank";
  if (t === "dropdown") return "dropdown";
  return "multiple_choice";
}

export function renderArchitectQuestionEditScreen(container, context, { screenId }) {
  updateState({ currentScreenId: screenId, phase: "learning" });
  const state = getState();
  const editId = state.architectQuestionEditId;
  const existing = editId ? getQuestionBankEntry(editId) : null;

  logScreenEntry({
    participantId: state.participantId,
    condition: state.condition,
    phase: state.phase,
    screenId
  });

  container.innerHTML = "";
  const screenEl = createElement("section", { className: "screen architect-question-edit" });

  screenEl.appendChild(
    createElement("div", {
      className: "screen__badge",
      text: existing ? "Architect • Edit quiz" : "Architect • New quiz"
    })
  );
  screenEl.appendChild(
    createElement("h1", {
      className: "screen__title",
      text: existing ? "Edit quiz" : "New quiz"
    })
  );
  screenEl.appendChild(
    createElement("p", {
      className: "screen__subtitle",
      text:
        "One saved quiz can be a single item or match the same shapes as the live runner (multiple_choice, fill_blank, dropdown, ordering). Saving stores a copy on this device and syncs a single-item quiz to your account database for assignment."
    })
  );

  const statusEl = createElement("p", { className: "architect-q-edit__status", text: "" });

  const labelInput = document.createElement("input");
  labelInput.type = "text";
  labelInput.className = "screen__input";
  labelInput.id = "aqe-label";
  labelInput.value = existing?.label || "";
  labelInput.placeholder = "Short label (list view)";

  const wingSel = document.createElement("select");
  wingSel.className = "screen__input";
  WINGS.forEach((o) => {
    const opt = document.createElement("option");
    opt.value = o.v;
    opt.textContent = o.l;
    wingSel.appendChild(opt);
  });
  wingSel.value = existing?.wing || "general";

  const diffSel = document.createElement("select");
  diffSel.className = "screen__input";
  ["easy", "medium", "hard"].forEach((d) => {
    const opt = document.createElement("option");
    opt.value = d;
    opt.textContent = d.charAt(0).toUpperCase() + d.slice(1);
    diffSel.appendChild(opt);
  });
  diffSel.value = existing?.difficulty || "medium";

  const tagsInput = document.createElement("input");
  tagsInput.type = "text";
  tagsInput.className = "screen__input";
  tagsInput.placeholder = "Tags, comma-separated (e.g. WW2, maps)";
  tagsInput.value = existing?.tags?.join(", ") || "";

  const statusDraft = document.createElement("select");
  statusDraft.className = "screen__input";
  ["published", "draft"].forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s.charAt(0).toUpperCase() + s.slice(1);
    statusDraft.appendChild(opt);
  });
  statusDraft.value = existing?.status || "draft";

  const notesTa = document.createElement("textarea");
  notesTa.className = "screen__textarea";
  notesTa.rows = 2;
  notesTa.placeholder = "Internal notes (sources, licensing, not shown to learners)";
  notesTa.value = existing?.notes || "";

  const exItem = existing?.item;
  let itemType = exItem ? inferItemType(exItem) : "multiple_choice";

  let mcq = exItem?.type === "multiple_choice" ? clone(exItem) : defaultMcqItem();
  let fib = exItem?.type === "fill_blank" ? clone(exItem) : defaultFibItem();
  let dd = exItem?.type === "dropdown" ? clone(exItem) : defaultDdItem();
  let ord = exItem?.type === "ordering" ? clone(exItem) : defaultOrdItem();

  const typeSel = document.createElement("select");
  typeSel.className = "screen__input";
  typeSel.setAttribute("aria-label", "Quiz item type (live runner)");
  RUNNER_ITEM_TYPE_OPTIONS.forEach((o) => {
    const opt = document.createElement("option");
    opt.value = o.value;
    opt.textContent = o.label;
    typeSel.appendChild(opt);
  });
  typeSel.value = itemType;

  const itemHost = createElement("div", { className: "architect-q-edit__item-host" });

  function clone(x) {
    return JSON.parse(JSON.stringify(x));
  }

  function renderItemForm() {
    itemHost.innerHTML = "";
    if (itemType === "multiple_choice") {
      const prompt = document.createElement("textarea");
      prompt.className = "screen__textarea";
      prompt.rows = 3;
      prompt.value = mcq.prompt;
      prompt.placeholder = "Question stem";
      prompt.addEventListener("input", () => {
        mcq.prompt = prompt.value;
      });
      itemHost.appendChild(
        createElement("label", { className: "architect-request-label", text: "Prompt" })
      );
      itemHost.appendChild(prompt);

      const grid = createElement("div", { className: "architect-q-edit__options-grid" });
      mcq.options.forEach((opt, idx) => {
        const row = createElement("div", { className: "architect-q-edit__option-row" });
        row.appendChild(
          createElement("span", { className: "architect-q-edit__opt-id", text: `${opt.id})` })
        );
        const inp = document.createElement("input");
        inp.type = "text";
        inp.className = "screen__input";
        inp.value = opt.text;
        inp.placeholder = `Option ${opt.id}`;
        inp.addEventListener("input", () => {
          mcq.options[idx].text = inp.value;
        });
        row.appendChild(inp);
        grid.appendChild(row);
      });
      itemHost.appendChild(
        createElement("label", { className: "architect-request-label", text: "Options (A–D)" })
      );
      itemHost.appendChild(grid);

      const corr = document.createElement("select");
      corr.className = "screen__input";
      mcq.options.forEach((o) => {
        const opt = document.createElement("option");
        opt.value = o.id;
        opt.textContent = `Correct: ${o.id}`;
        corr.appendChild(opt);
      });
      corr.value = mcq.correctOptionId;
      corr.addEventListener("change", () => {
        mcq.correctOptionId = corr.value;
      });
      itemHost.appendChild(
        createElement("label", { className: "architect-request-label", text: "Correct answer" })
      );
      itemHost.appendChild(corr);
      return;
    }

    if (itemType === "fill_blank") {
      const prompt = document.createElement("textarea");
      prompt.className = "screen__textarea";
      prompt.rows = 4;
      prompt.value = fib.prompt;
      prompt.placeholder = `Include exactly one ${BLANK_PLACEHOLDER} where the learner types an answer.`;
      prompt.addEventListener("input", () => {
        fib.prompt = prompt.value;
      });
      itemHost.appendChild(
        createElement("label", { className: "architect-request-label", text: "Question with blank" })
      );
      itemHost.appendChild(prompt);

      const insertBtn = createElement("button", {
        attrs: { type: "button" },
        className: "btn btn--ghost",
        text: "Insert blank at cursor",
        onClick: () => {
          const start = prompt.selectionStart ?? prompt.value.length;
          const end = prompt.selectionEnd ?? start;
          const v = prompt.value;
          prompt.value = v.slice(0, start) + BLANK_PLACEHOLDER + v.slice(end);
          fib.prompt = prompt.value;
          const pos = start + BLANK_PLACEHOLDER.length;
          prompt.focus();
          prompt.setSelectionRange(pos, pos);
        }
      });
      itemHost.appendChild(insertBtn);

      const ans = document.createElement("input");
      ans.type = "text";
      ans.className = "screen__input";
      ans.value = fib.correctAnswer;
      ans.placeholder = "Correct answer (grading is case-insensitive)";
      ans.addEventListener("input", () => {
        fib.correctAnswer = ans.value;
      });
      itemHost.appendChild(
        createElement("label", { className: "architect-request-label", text: "Correct answer" })
      );
      itemHost.appendChild(ans);
      return;
    }

    if (itemType === "dropdown") {
      const prompt = document.createElement("textarea");
      prompt.className = "screen__textarea";
      prompt.rows = 3;
      prompt.value = dd.prompt;
      prompt.placeholder = "Question stem";
      prompt.addEventListener("input", () => {
        dd.prompt = prompt.value;
      });
      itemHost.appendChild(
        createElement("label", { className: "architect-request-label", text: "Prompt" })
      );
      itemHost.appendChild(prompt);

      itemHost.appendChild(
        createElement("p", {
          className: "text-muted",
          text: "Lower priority numbers appear first in the learner dropdown. Mark the correct option."
        })
      );

      const table = document.createElement("div");
      table.className = "architect-quiz-build__dd-table";

      function renderDdRows() {
        table.innerHTML = "";
        dd.options.forEach((row, i) => {
          const line = createElement("div", { className: "architect-quiz-build__dd-row" });
          const lab = document.createElement("input");
          lab.type = "text";
          lab.className = "screen__input";
          lab.placeholder = "Option label";
          lab.value = row.text;
          lab.addEventListener("input", () => {
            dd.options[i].text = lab.value;
          });

          const pri = document.createElement("input");
          pri.type = "number";
          pri.className = "screen__input architect-quiz-build__dd-pri";
          pri.min = "0";
          pri.step = "1";
          pri.value = String(row.priority ?? i + 1);
          pri.addEventListener("input", () => {
            dd.options[i].priority = Number(pri.value) || 0;
          });

          const rad = document.createElement("input");
          rad.type = "radio";
          rad.name = "aqe-dd-correct";
          rad.checked = dd.correctOptionId === row.id;
          rad.addEventListener("change", () => {
            if (rad.checked) dd.correctOptionId = row.id;
          });

          const rLabel = document.createElement("label");
          rLabel.className = "architect-quiz-build__dd-correct";
          rLabel.appendChild(rad);
          rLabel.appendChild(document.createTextNode(" Correct"));

          line.appendChild(lab);
          line.appendChild(pri);
          line.appendChild(rLabel);
          table.appendChild(line);
        });
      }

      renderDdRows();
      itemHost.appendChild(table);

      itemHost.appendChild(
        createElement("button", {
          attrs: { type: "button" },
          className: "btn btn--ghost",
          text: "Add option",
          onClick: () => {
            const next = dd.options.length + 1;
            dd.options.push({ id: genOptId(), text: "", priority: next });
            renderDdRows();
          }
        })
      );
      return;
    }

    const prompt = document.createElement("textarea");
    prompt.className = "screen__textarea";
    prompt.rows = 3;
    prompt.value = ord.prompt;
    prompt.placeholder = "Ordering task instructions";
    prompt.addEventListener("input", () => {
      ord.prompt = prompt.value;
    });
    itemHost.appendChild(
      createElement("label", { className: "architect-request-label", text: "Prompt" })
    );
    itemHost.appendChild(prompt);

    ord.items.forEach((line, idx) => {
      const row = createElement("div", { className: "architect-q-edit__option-row" });
      row.appendChild(
        createElement("span", { className: "architect-q-edit__opt-id", text: `${line.id}:` })
      );
      const inp = document.createElement("input");
      inp.type = "text";
      inp.className = "screen__input";
      inp.value = line.text;
      inp.addEventListener("input", () => {
        ord.items[idx].text = inp.value;
      });
      row.appendChild(inp);
      itemHost.appendChild(row);
    });

    const ordStr = document.createElement("input");
    ordStr.type = "text";
    ordStr.className = "screen__input";
    ordStr.value = ord.correctOrder.join(",");
    ordStr.placeholder = "Correct order, comma-separated ids (e.g. s1,s2,s3,s4)";
    ordStr.addEventListener("input", () => {
      ord.correctOrder = ordStr.value
        .split(/[,;\s]+/)
        .map((x) => x.trim())
        .filter(Boolean);
    });
    itemHost.appendChild(
      createElement("label", {
        className: "architect-request-label",
        text: "Correct order (permutation of line ids)"
      })
    );
    itemHost.appendChild(ordStr);
  }

  typeSel.addEventListener("change", () => {
    itemType = typeSel.value;
    renderItemForm();
  });

  const meta = createElement("div", { className: "architect-q-edit__meta" });
  meta.appendChild(
    createElement("label", { className: "architect-request-label", attrs: { for: "aqe-label" }, text: "Label" })
  );
  meta.appendChild(labelInput);
  meta.appendChild(
    createElement("label", { className: "architect-request-label", text: "Wing" })
  );
  meta.appendChild(wingSel);
  meta.appendChild(
    createElement("label", { className: "architect-request-label", text: "Difficulty" })
  );
  meta.appendChild(diffSel);
  meta.appendChild(
    createElement("label", { className: "architect-request-label", text: "Tags" })
  );
  meta.appendChild(tagsInput);
  meta.appendChild(
    createElement("label", { className: "architect-request-label", text: "Status" })
  );
  meta.appendChild(statusDraft);
  meta.appendChild(
    createElement("label", { className: "architect-request-label", text: "Notes" })
  );
  meta.appendChild(notesTa);

  const typeRow = createElement("div", { className: "architect-q-edit__type-row" });
  typeRow.appendChild(createElement("span", { className: "architect-request-label", text: "Item type" }));
  typeRow.appendChild(typeSel);

  const runnerLegend = createElement("p", {
    className: "architect-q-edit__runner-legend text-muted",
    text: `Runner types: ${RUNNER_ITEM_TYPE_OPTIONS.map((o) => o.value).join(", ")}`
  });

  const runnerBlock = createElement("div", { className: "architect-q-edit__runner-block" });
  runnerBlock.appendChild(
    createElement("h2", {
      className: "architect-q-edit__runner-heading",
      text: "Quiz content (same as live quiz)"
    })
  );
  runnerBlock.appendChild(typeRow);
  runnerBlock.appendChild(runnerLegend);
  runnerBlock.appendChild(itemHost);

  const metaHeading = createElement("h2", {
    className: "architect-q-edit__meta-heading",
    text: "Metadata"
  });

  screenEl.appendChild(runnerBlock);
  renderItemForm();
  screenEl.appendChild(metaHeading);
  screenEl.appendChild(meta);

  const actions = createElement("div", { className: "architect-q-edit__actions" });
  actions.appendChild(
    createElement("button", {
      attrs: { type: "button" },
      className: "btn btn--primary",
      text: "Save quiz",
      onClick: async () => {
        const label = labelInput.value.trim();
        if (!label) {
          statusEl.textContent = "Label is required.";
          statusEl.className = "architect-q-edit__status";
          return;
        }
        const tags = tagsInput.value
          .split(/[,;]/)
          .map((t) => t.trim())
          .filter(Boolean);
        const wing = wingSel.value;
        const difficulty = diffSel.value;
        const status = statusDraft.value === "draft" ? "draft" : "published";
        const notes = notesTa.value.trim();

        let item;
        if (itemType === "multiple_choice") {
          item = { ...clone(mcq), type: "multiple_choice" };
        } else if (itemType === "fill_blank") {
          item = { ...clone(fib), type: "fill_blank" };
        } else if (itemType === "dropdown") {
          item = { ...clone(dd), type: "dropdown" };
        } else {
          item = { ...clone(ord), type: "ordering" };
        }

        const base = {
          label,
          wing,
          difficulty,
          tags,
          status,
          notes,
          item
        };

        const prevServerQuizId =
          existing?.serverQuizId && !String(existing.serverQuizId).startsWith("local_")
            ? String(existing.serverQuizId)
            : null;

        let result;
        if (existing) {
          result = updateQuestionBankEntry(existing.id, base);
        } else {
          result = createQuestionBankEntry(base);
        }

        if (!result.ok) {
          statusEl.textContent = (result.errors && result.errors.join(" ")) || "Validation failed.";
          statusEl.className = "architect-q-edit__status";
          return;
        }

        const bankId = result.entry.id;
        const saved = getQuestionBankEntry(bankId);
        if (!saved) {
          statusEl.textContent = "Entry not found.";
          statusEl.className = "architect-q-edit__status text-danger";
          return;
        }

        const itemPayload = { ...assessmentItemFromBankQuestion(saved) };
        itemPayload.id = saved.item.id;
        itemPayload._bankQuestionId = saved.id;

        statusEl.textContent = "Saving…";
        statusEl.className = "architect-q-edit__status";

        try {
          const data = await saveArchitectQuiz({
            id: prevServerQuizId || undefined,
            title: saved.label,
            templateId: "question-bank",
            items: [itemPayload]
          });
          const sid = data.id;
          updateQuestionBankEntry(bankId, { serverQuizId: sid });

          logEvent({
            participantId: state.participantId,
            condition: state.condition,
            phase: state.phase,
            screenId,
            itemId: bankId,
            response: {
              type: "architect-question-save",
              wing,
              difficulty,
              itemType: item.type,
              quizId: sid
            },
            correctness: null,
            responseTimeMs: null
          });

          updateState({ architectQuestionEditId: null });
          statusEl.textContent = "Saved.";
          statusEl.className = "architect-q-edit__status text-success";
          navigateTo("architect-quiz-hub", { container });
        } catch (err) {
          statusEl.textContent = isLikelyMissingPhpApiError(err)
            ? "Could not reach the database. Check PHP and MySQL."
            : err?.message || "Could not save quiz.";
          statusEl.className = "architect-q-edit__status text-danger";
        }
      }
    })
  );
  actions.appendChild(
    createElement("button", {
      attrs: { type: "button" },
      className: "btn btn--ghost",
      text: "Cancel",
      onClick: () => {
        updateState({ architectQuestionEditId: null });
        navigateTo("architect-quiz-hub", { container });
      }
    })
  );
  actions.appendChild(statusEl);
  screenEl.appendChild(actions);

  container.appendChild(screenEl);
}

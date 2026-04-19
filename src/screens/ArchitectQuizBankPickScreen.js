// src/screens/ArchitectQuizBankPickScreen.js — build a runnable quiz session from saved questions.

import { createElement } from "../components/ui.js";
import { getState, updateState } from "../core/state.js";
import { logScreenEntry } from "../core/logger.js";
import { navigateTo } from "../core/router.js";
import {
  listQuestionBank,
  getQuestionBankEntry,
  assessmentItemFromBankQuestion
} from "../core/questionBankStore.js";

const MAX_ITEMS = 25;

export function renderArchitectQuizBankPickScreen(container, context, { screenId }) {
  updateState({ currentScreenId: screenId, phase: "learning" });
  const state = getState();

  logScreenEntry({
    participantId: state.participantId,
    condition: state.condition,
    phase: state.phase,
    screenId
  });

  container.innerHTML = "";
  const screenEl = createElement("section", { className: "screen architect-quiz-bank-pick" });

  screenEl.appendChild(
    createElement("div", { className: "screen__badge", text: "Architect • Class session" })
  );
  screenEl.appendChild(
    createElement("h1", { className: "screen__title", text: "Build a session from saved questions" })
  );
  screenEl.appendChild(
    createElement("p", {
      className: "screen__subtitle",
      text: `Select up to ${MAX_ITEMS} published or draft items. Order follows selection order (click in order).`
    })
  );

  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.className = "screen__input";
  titleInput.id = "aqbp-title";
  titleInput.placeholder = "Session title (e.g. “Week 3 review”)";
  screenEl.appendChild(
    createElement("label", {
      className: "architect-request-label",
      attrs: { for: "aqbp-title" },
      text: "Quiz title"
    })
  );
  screenEl.appendChild(titleInput);

  const wingF = document.createElement("select");
  wingF.className = "screen__input";
  [
    { v: "", l: "All wings" },
    { v: "history", l: "History" },
    { v: "geography", l: "Geography" },
    { v: "literature", l: "Literature" },
    { v: "theology", l: "Theology" },
    { v: "general", l: "General" }
  ].forEach((o) => {
    const opt = document.createElement("option");
    opt.value = o.v;
    opt.textContent = o.l;
    wingF.appendChild(opt);
  });

  const searchInp = document.createElement("input");
  searchInp.type = "search";
  searchInp.className = "screen__input";
  searchInp.placeholder = "Search label or tags…";

  const filtRow = createElement("div", { className: "architect-quiz-bank-pick__filters" });
  filtRow.appendChild(
    createElement("label", { className: "architect-request-label", text: "Wing" })
  );
  filtRow.appendChild(wingF);
  filtRow.appendChild(
    createElement("label", { className: "architect-request-label", text: "Search" })
  );
  filtRow.appendChild(searchInp);
  screenEl.appendChild(filtRow);

  const statusEl = createElement("p", { className: "architect-quiz-bank-pick__status", text: "" });
  screenEl.appendChild(statusEl);

  const listHost = createElement("div", { className: "architect-quiz-bank-pick__list" });
  screenEl.appendChild(listHost);

  /** @type {string[]} */
  let selectionOrder = [];

  function filteredRows() {
    return listQuestionBank().filter((q) => {
      if (wingF.value && q.wing !== wingF.value) return false;
      const s = searchInp.value.trim().toLowerCase();
      if (s) {
        const blob = `${q.label} ${(q.tags || []).join(" ")}`.toLowerCase();
        if (!blob.includes(s)) return false;
      }
      return true;
    });
  }

  function renderList() {
    listHost.innerHTML = "";
    const rows = filteredRows();
    if (!rows.length) {
      listHost.appendChild(
        createElement("p", {
          className: "text-muted",
          text: "No saved questions match, or none yet. Add questions from “Create quizzes & questions” first."
        })
      );
      return;
    }

    rows.forEach((q) => {
      const row = createElement("label", { className: "architect-quiz-bank-pick__row" });
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.value = q.id;
      cb.checked = selectionOrder.includes(q.id);
      cb.addEventListener("change", () => {
        if (cb.checked) {
          if (selectionOrder.length >= MAX_ITEMS) {
            cb.checked = false;
            statusEl.textContent = `Maximum ${MAX_ITEMS} items.`;
            return;
          }
          selectionOrder.push(q.id);
        } else {
          selectionOrder = selectionOrder.filter((id) => id !== q.id);
        }
        statusEl.textContent = `${selectionOrder.length} selected.`;
      });
      const meta = createElement("span", {
        className: "architect-quiz-bank-pick__row-text",
        text: `${q.label} — ${q.wing} · ${q.difficulty} · ${q.item?.type || "?"}`
      });
      row.appendChild(cb);
      row.appendChild(meta);
      listHost.appendChild(row);
    });
  }

  wingF.addEventListener("change", renderList);
  searchInp.addEventListener("input", renderList);

  const actions = createElement("div", { className: "architect-quiz-bank-pick__actions" });
  actions.appendChild(
    createElement("button", {
      attrs: { type: "button" },
      className: "btn btn--primary",
      text: "Generate & preview run",
      onClick: () => {
        if (selectionOrder.length === 0) {
          statusEl.textContent = "Select at least one question.";
          return;
        }
        const title =
          titleInput.value.trim() ||
          `Bank quiz (${selectionOrder.length} items)`;
        const items = [];
        for (const id of selectionOrder) {
          const q = getQuestionBankEntry(id);
          if (q) items.push(assessmentItemFromBankQuestion(q));
        }
        if (!items.length) {
          statusEl.textContent = "Could not load selected items.";
          return;
        }
        updateState({
          architectQuizSession: {
            title,
            templateId: "question-bank",
            items,
            builtAt: new Date().toISOString()
          }
        });
        navigateTo("architect-quiz-run", { container });
      }
    })
  );
  actions.appendChild(
    createElement("button", {
      attrs: { type: "button" },
      className: "btn btn--ghost",
      text: "Quizzes & questions",
      onClick: () => navigateTo("architect-quiz-hub", { container })
    })
  );
  actions.appendChild(
    createElement("button", {
      attrs: { type: "button" },
      className: "btn btn--ghost",
      text: "Template studio",
      onClick: () => navigateTo("architect-quiz-studio", { container })
    })
  );
  screenEl.appendChild(actions);

  renderList();
  container.appendChild(screenEl);
}

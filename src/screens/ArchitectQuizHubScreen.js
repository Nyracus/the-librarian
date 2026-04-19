// src/screens/ArchitectQuizHubScreen.js — one place to build quizzes: wizard, session from saved questions, preview, and CRUD for the four item types.

import { createElement } from "../components/ui.js";
import { getState, updateState } from "../core/state.js";
import { logScreenEntry } from "../core/logger.js";
import { navigateTo } from "../core/router.js";
import {
  listQuestionBank,
  removeQuestionBankEntry,
  getQuestionBankEntry,
  exportQuestionBankJson,
  assessmentItemFromBankQuestion,
  createQuestionBankEntry
} from "../core/questionBankStore.js";

export function renderArchitectQuizHubScreen(container, context, { screenId }) {
  updateState({ currentScreenId: screenId, phase: "learning" });
  const state = getState();

  logScreenEntry({
    participantId: state.participantId,
    condition: state.condition,
    phase: state.phase,
    screenId
  });

  container.innerHTML = "";
  const screenEl = createElement("section", { className: "screen architect-quiz-hub" });

  screenEl.appendChild(
    createElement("div", { className: "screen__badge", text: "Architect" })
  );
  screenEl.appendChild(
    createElement("h1", { className: "screen__title", text: "Create quizzes & questions" })
  );
  screenEl.appendChild(
    createElement("p", {
      className: "screen__subtitle",
      text:
        "Build multiple-choice, fill-in-the-blank, dropdown, or ordering questions, then use them in a class quiz. Everything is saved on this device unless your school sync is set up."
    })
  );

  const quick = createElement("div", { className: "architect-quiz-hub__quick" });
  quick.appendChild(
    createElement("h2", {
      className: "architect-quiz-hub__section-title",
      text: "Start here"
    })
  );
  quick.appendChild(
    createElement("button", {
      attrs: { type: "button" },
      className: "btn btn--primary architect-quiz-hub__quick-btn",
      text: "Step-by-step quiz (topic and question slots)",
      onClick: () => navigateTo("architect-quiz-studio", { container })
    })
  );
  quick.appendChild(
    createElement("button", {
      attrs: { type: "button" },
      className: "btn btn--ghost architect-quiz-hub__quick-btn",
      text: "Build a class session from questions you already saved",
      onClick: () => navigateTo("architect-quiz-bank-pick", { container })
    })
  );
  quick.appendChild(
    createElement("button", {
      attrs: { type: "button" },
      className: "btn btn--ghost architect-quiz-hub__quick-btn",
      text: "Preview last quiz",
      onClick: () => navigateTo("architect-quiz-run", { container })
    })
  );
  screenEl.appendChild(quick);

  screenEl.appendChild(
    createElement("h2", {
      className: "architect-quiz-hub__section-title",
      text: "Your saved questions"
    })
  );

  const toolbar = createElement("div", { className: "architect-qbank-toolbar" });
  toolbar.appendChild(
    createElement("button", {
      attrs: { type: "button" },
      className: "btn btn--primary",
      text: "New question",
      onClick: () => {
        updateState({ architectQuestionEditId: null });
        navigateTo("architect-question-edit", { container });
      }
    })
  );
  screenEl.appendChild(toolbar);

  const filters = createElement("div", { className: "architect-qbank-filters" });
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

  const diffF = document.createElement("select");
  diffF.className = "screen__input";
  [
    { v: "", l: "All levels" },
    { v: "easy", l: "Easy" },
    { v: "medium", l: "Medium" },
    { v: "hard", l: "Hard" }
  ].forEach((o) => {
    const opt = document.createElement("option");
    opt.value = o.v;
    opt.textContent = o.l;
    diffF.appendChild(opt);
  });

  const searchInp = document.createElement("input");
  searchInp.type = "search";
  searchInp.className = "screen__input";
  searchInp.placeholder = "Filter by label or tag…";

  filters.appendChild(
    createElement("label", { className: "architect-request-label", text: "Wing" })
  );
  filters.appendChild(wingF);
  filters.appendChild(
    createElement("label", { className: "architect-request-label", text: "Difficulty" })
  );
  filters.appendChild(diffF);
  filters.appendChild(
    createElement("label", { className: "architect-request-label", text: "Search" })
  );
  filters.appendChild(searchInp);
  screenEl.appendChild(filters);

  const statusEl = createElement("p", { className: "architect-qbank-status", text: "" });
  screenEl.appendChild(statusEl);

  const listHost = createElement("div", { className: "architect-qbank-list" });
  screenEl.appendChild(listHost);

  const io = createElement("div", { className: "architect-qbank-io" });

  io.appendChild(
    createElement("button", {
      attrs: { type: "button" },
      className: "btn btn--ghost",
      text: "Download backup copy",
      onClick: () => {
        const blob = new Blob([exportQuestionBankJson()], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `librarian_question_bank_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
        a.click();
        URL.revokeObjectURL(url);
        statusEl.textContent = "Backup downloaded.";
      }
    })
  );

  io.appendChild(
    createElement("button", {
      attrs: { type: "button" },
      className: "btn btn--primary",
      text: "Architect home",
      onClick: () => navigateTo("architect-home", { container })
    })
  );
  screenEl.appendChild(io);

  function matchesFilters(q) {
    if (wingF.value && q.wing !== wingF.value) return false;
    if (diffF.value && q.difficulty !== diffF.value) return false;
    const s = searchInp.value.trim().toLowerCase();
    if (s) {
      const blob = `${q.label} ${(q.tags || []).join(" ")}`.toLowerCase();
      if (!blob.includes(s)) return false;
    }
    return true;
  }

  function renderList() {
    listHost.innerHTML = "";
    const rows = listQuestionBank().filter(matchesFilters);
    if (!rows.length) {
      listHost.appendChild(
        createElement("p", {
          className: "text-muted",
          text: "No questions yet. Use “New question” to add one, or start with the step-by-step quiz above."
        })
      );
      return;
    }

    rows.forEach((q) => {
      const card = createElement("article", { className: "architect-qbank-card" });
      const typeLabel =
        q.item?.type === "ordering"
          ? "Ordering"
          : q.item?.type === "fill_blank"
            ? "Fill in the blank"
            : q.item?.type === "dropdown"
              ? "Dropdown"
              : "Multiple choice";
      card.appendChild(
        createElement("h3", { className: "architect-qbank-card__title", text: q.label })
      );
      card.appendChild(
        createElement("p", {
          className: "architect-qbank-card__meta",
          text: `${q.wing} · ${q.difficulty} · ${q.status} · ${typeLabel} · updated ${new Date(
            q.updatedAt || q.createdAt
          ).toLocaleString()}`
        })
      );
      if (q.tags?.length) {
        card.appendChild(
          createElement("p", {
            className: "architect-qbank-card__tags",
            text: `Tags: ${q.tags.join(", ")}`
          })
        );
      }
      const actions = createElement("div", { className: "architect-qbank-card__actions" });
      actions.appendChild(
        createElement("button", {
          attrs: { type: "button" },
          className: "btn btn--ghost",
          text: "Edit",
          onClick: () => {
            updateState({ architectQuestionEditId: q.id });
            navigateTo("architect-question-edit", { container });
          }
        })
      );
      actions.appendChild(
        createElement("button", {
          attrs: { type: "button" },
          className: "btn btn--ghost",
          text: "Preview",
          onClick: () => {
            const item = assessmentItemFromBankQuestion(q);
            updateState({
              architectQuizSession: {
                title: `Preview: ${q.label}`,
                templateId: "question-bank",
                items: [item],
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
          text: "Duplicate",
          onClick: () => {
            const src = getQuestionBankEntry(q.id);
            if (!src) return;
            const copy = {
              label: `${src.label} (copy)`,
              wing: src.wing,
              difficulty: src.difficulty,
              tags: [...(src.tags || [])],
              status: src.status,
              notes: src.notes || "",
              item: JSON.parse(JSON.stringify(src.item))
            };
            const r = createQuestionBankEntry(copy);
            if (r.ok) {
              statusEl.textContent = "Duplicated.";
              renderList();
            } else {
              statusEl.textContent = (r.errors && r.errors.join(" ")) || "Duplicate failed.";
            }
          }
        })
      );
      actions.appendChild(
        createElement("button", {
          attrs: { type: "button" },
          className: "btn btn--ghost architect-qbank-card__remove",
          text: "Delete",
          onClick: () => {
            if (!window.confirm(`Delete “${q.label}”?`)) return;
            removeQuestionBankEntry(q.id);
            statusEl.textContent = "Deleted.";
            renderList();
          }
        })
      );
      card.appendChild(actions);
      listHost.appendChild(card);
    });
  }

  [wingF, diffF].forEach((el) => el.addEventListener("change", renderList));
  searchInp.addEventListener("input", renderList);

  renderList();
  container.appendChild(screenEl);
}

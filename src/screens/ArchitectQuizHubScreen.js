// src/screens/ArchitectQuizHubScreen.js — create quiz sets, single-item quizzes, preview, assign, and CRUD.

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
import { listArchitectQuizzes } from "../api/architectQuizzesApi.js";
import { isLikelyMissingPhpApiError } from "../api/http.js";

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
    createElement("h1", { className: "screen__title", text: "Create and assign quizzes" })
  );
  screenEl.appendChild(
    createElement("p", {
      className: "screen__subtitle",
      text:
        "A quiz can be one item or many. New quiz and Create Quiz Set both save to your account database when you save (PHP + MySQL). Use Assign quiz to librarians for any saved quiz."
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
      text: "Create Quiz Set",
      onClick: () => navigateTo("architect-quiz-studio", { container })
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
  quick.appendChild(
    createElement("button", {
      attrs: { type: "button" },
      className: "btn btn--ghost architect-quiz-hub__quick-btn",
      text: "Assign quiz to librarians",
      onClick: () => navigateTo("architect-quiz-assign", { container })
    })
  );
  screenEl.appendChild(quick);

  screenEl.appendChild(
    createElement("h2", {
      className: "architect-quiz-hub__section-title",
      text: "Your saved quizzes"
    })
  );
  const savedBox = createElement("section", { className: "architect-quiz-hub__saved-box" });
  savedBox.appendChild(
    createElement("p", {
      className: "screen__body text-muted architect-quiz-hub__saved-note",
      text: "Saved to database. Search by title, quiz id, or template."
    })
  );
  const savedSearch = document.createElement("input");
  savedSearch.type = "search";
  savedSearch.className = "screen__input";
  savedSearch.placeholder = "Search saved quizzes…";
  savedBox.appendChild(savedSearch);
  const savedStatus = createElement("p", { className: "text-muted", text: "Loading saved quizzes…" });
  const savedHost = createElement("div", { className: "architect-qbank-list" });
  savedBox.appendChild(savedStatus);
  savedBox.appendChild(savedHost);
  screenEl.appendChild(savedBox);

  const toolbar = createElement("div", { className: "architect-qbank-toolbar" });
  toolbar.appendChild(
    createElement("button", {
      attrs: { type: "button" },
      className: "btn btn--primary",
      text: "New quiz",
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

  /** @type {Array<{id:string,title:string,templateId?:string,items?:Array<unknown>,updatedAt?:string,createdAt?:string}>} */
  let savedRows = [];

  function renderSavedList() {
    savedHost.innerHTML = "";
    const q = savedSearch.value.trim().toLowerCase();
    const rows = savedRows.filter((r) => {
      if (!q) return true;
      const blob = `${r.title || ""} ${r.id || ""} ${r.templateId || ""}`.toLowerCase();
      return blob.includes(q);
    });
    if (!rows.length) {
      savedHost.appendChild(
        createElement("p", {
          className: "text-muted",
          text: q
            ? "No saved quizzes match your search."
            : "No saved quizzes yet. Save from New quiz or Create Quiz Set preview."
        })
      );
      return;
    }
    rows.forEach((qz) => {
      const card = createElement("article", { className: "architect-qbank-card" });
      card.appendChild(
        createElement("h3", {
          className: "architect-qbank-card__title",
          text: qz.title || "Untitled quiz"
        })
      );
      card.appendChild(
        createElement("p", {
          className: "architect-qbank-card__meta",
          text: `${qz.templateId || "custom"} · ${Array.isArray(qz.items) ? qz.items.length : 0} item(s) · id ${qz.id}`
        })
      );
      const actions = createElement("div", { className: "architect-qbank-card__actions" });
      actions.appendChild(
        createElement("button", {
          attrs: { type: "button" },
          className: "btn btn--ghost",
          text: "Assign",
          onClick: () => {
            updateState({
              architectQuizSession: {
                ...(getState().architectQuizSession || {}),
                savedQuizId: qz.id
              }
            });
            navigateTo("architect-quiz-assign", { container });
          }
        })
      );
      card.appendChild(actions);
      savedHost.appendChild(card);
    });
  }

  async function loadSavedQuizzes() {
    savedStatus.textContent = "Loading saved quizzes…";
    try {
      const data = await listArchitectQuizzes();
      savedRows = Array.isArray(data?.quizzes) ? data.quizzes : [];
      savedStatus.textContent = `${savedRows.length} saved quiz(es)`;
      renderSavedList();
    } catch (err) {
      savedRows = [];
      savedStatus.textContent = isLikelyMissingPhpApiError(err)
        ? "Cannot load saved quizzes from database API."
        : err?.message || "Failed to load saved quizzes.";
      renderSavedList();
    }
  }

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
          text: "No quizzes in the list yet. Use New quiz for one item, or Create Quiz Set above for multiple."
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
          text: `${q.wing} · ${q.difficulty} · ${q.status} · ${typeLabel} · ${
            q.serverQuizId ? "on server" : "not synced yet"
          } · updated ${new Date(q.updatedAt || q.createdAt).toLocaleString()}`
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
            const item = {
              ...assessmentItemFromBankQuestion(q),
              _bankQuestionId: q.id
            };
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
              serverQuizId: null,
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
  savedSearch.addEventListener("input", renderSavedList);

  renderList();
  void loadSavedQuizzes();
  container.appendChild(screenEl);
}

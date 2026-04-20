import { createElement } from "../components/ui.js";
import { getState, updateState } from "../core/state.js";
import { logScreenEntry } from "../core/logger.js";
import { navigateTo } from "../core/router.js";
import {
  listArchitectQuizzes,
  searchLibrarians,
  assignQuizToLibrarians
} from "../api/architectQuizzesApi.js";
import { isLikelyMissingPhpApiError } from "../api/http.js";

export function renderArchitectQuizAssignScreen(container, context, { screenId }) {
  updateState({ currentScreenId: screenId, phase: "learning" });
  const state = getState();

  logScreenEntry({
    participantId: state.participantId,
    condition: state.condition,
    phase: state.phase,
    screenId
  });

  container.innerHTML = "";
  const screenEl = createElement("section", { className: "screen architect-quiz-assign" });

  screenEl.appendChild(
    createElement("div", { className: "screen__badge", text: "Architect" })
  );
  screenEl.appendChild(
    createElement("h1", { className: "screen__title", text: "Assign quiz to librarians" })
  );
  screenEl.appendChild(
    createElement("p", {
      className: "screen__subtitle",
      text: "Quizzes listed here are stored in the database on your account. Select one, choose librarians, then assign."
    })
  );

  const quizRow = createElement("div", { className: "architect-quiz-assign__row" });
  quizRow.appendChild(
    createElement("label", { className: "architect-request-label", text: "Saved quiz" })
  );
  const quizSelect = document.createElement("select");
  quizSelect.className = "screen__input";
  quizRow.appendChild(quizSelect);

  const searchRow = createElement("div", { className: "architect-quiz-assign__row" });
  const searchInp = document.createElement("input");
  searchInp.type = "search";
  searchInp.className = "screen__input";
  searchInp.placeholder = "Filter librarians by email or id…";
  searchRow.appendChild(
    createElement("label", { className: "architect-request-label", text: "Search librarians" })
  );
  searchRow.appendChild(searchInp);

  const libHost = createElement("div", { className: "architect-quiz-assign__librarians" });
  const statusEl = createElement("p", { className: "text-muted", text: "" });

  /** @type {Set<number>} */
  const selected = new Set();

  /** @type {Map<string, object>} */
  let quizById = new Map();

  async function loadQuizzes() {
    statusEl.textContent = "";
    try {
      const data = await listArchitectQuizzes();
      const rows = Array.isArray(data?.quizzes) ? data.quizzes : [];
      quizById = new Map(rows.map((q) => [String(q.id), q]));

      quizSelect.innerHTML = "";
      const ph = document.createElement("option");
      ph.value = "";
      ph.textContent = rows.length ? "Select a quiz…" : "No saved quizzes yet — save from the quiz hub or preview";
      quizSelect.appendChild(ph);

      rows.forEach((q) => {
        const o = document.createElement("option");
        o.value = String(q.id);
        o.textContent = `${q.title || "Untitled"} · ${q.id}`;
        quizSelect.appendChild(o);
      });

      const sess = getState().architectQuizSession;
      if (sess?.savedQuizId && quizById.has(String(sess.savedQuizId))) {
        quizSelect.value = String(sess.savedQuizId);
      }
    } catch (err) {
      quizSelect.innerHTML = "";
      const ph = document.createElement("option");
      ph.value = "";
      ph.textContent = "Could not load quizzes";
      quizSelect.appendChild(ph);
      statusEl.textContent = isLikelyMissingPhpApiError(err)
        ? "Cannot reach the database API."
        : err?.message || "Failed to load quizzes.";
    }
  }

  const assignBtn = createElement("button", {
    attrs: { type: "button" },
    className: "btn btn--primary",
    text: "Assign selected",
    onClick: async () => {
      const qid = quizSelect.value;
      if (!qid) {
        statusEl.textContent = "Select a quiz.";
        return;
      }
      const ids = Array.from(selected);
      if (!ids.length) {
        statusEl.textContent = "Select at least one librarian.";
        return;
      }

      let row = quizById.get(String(qid));
      if (!row) {
        await loadQuizzes();
        row = quizById.get(String(qid));
      }
      if (!row || !Array.isArray(row.items) || row.items.length === 0) {
        statusEl.textContent = "This quiz has no questions.";
        return;
      }

      statusEl.textContent = "Assigning…";
      try {
        const res = await assignQuizToLibrarians(String(qid), ids);
        statusEl.textContent = `Assigned (${res?.assignedCount ?? 0} new link(s)).`;
      } catch (err) {
        statusEl.textContent = isLikelyMissingPhpApiError(err)
          ? "Cannot reach the database API."
          : err?.message || "Assignment failed.";
      }
    }
  });

  screenEl.appendChild(quizRow);
  screenEl.appendChild(searchRow);
  screenEl.appendChild(libHost);
  screenEl.appendChild(assignBtn);
  screenEl.appendChild(statusEl);
  screenEl.appendChild(
    createElement("button", {
      attrs: { type: "button" },
      className: "btn btn--ghost",
      text: "Architect home",
      onClick: () => navigateTo("architect-home", { container })
    })
  );

  function renderLibs(rows) {
    libHost.innerHTML = "";
    rows.forEach((u) => {
      const id = Number(u.id);
      const row = createElement("label", { className: "architect-quiz-assign__lib-row" });
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = selected.has(id);
      cb.addEventListener("change", () => {
        if (cb.checked) selected.add(id);
        else selected.delete(id);
      });
      const em = u.email || `user #${id}`;
      row.appendChild(cb);
      row.appendChild(
        createElement("span", {
          text: `${em} (id ${id})`
        })
      );
      libHost.appendChild(row);
    });
  }

  async function loadLibs() {
    try {
      const data = await searchLibrarians(searchInp.value);
      const rows = Array.isArray(data?.librarians) ? data.librarians : [];
      renderLibs(rows);
    } catch (err) {
      libHost.innerHTML = "";
      statusEl.textContent = isLikelyMissingPhpApiError(err)
        ? "Could not load librarians."
        : err?.message || "Failed.";
    }
  }

  searchInp.addEventListener(
    "input",
    debounce(() => {
      void loadLibs();
    }, 300)
  );

  void loadQuizzes();
  void loadLibs();

  container.appendChild(screenEl);
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

import { createElement } from "../components/ui.js";
import { getState, updateState } from "../core/state.js";
import { logScreenEntry } from "../core/logger.js";
import { navigateTo } from "../core/router.js";
import { listAssignedQuizzesForLibrarian } from "../api/architectQuizzesApi.js";
import { isLikelyMissingPhpApiError } from "../api/http.js";

export function renderLibrarianAssignedQuizzesScreen(container, context, { screenId }) {
  updateState({ currentScreenId: screenId, phase: "learning" });
  const state = getState();

  logScreenEntry({
    participantId: state.participantId,
    condition: state.condition,
    phase: state.phase,
    screenId
  });

  container.innerHTML = "";
  const screenEl = createElement("section", { className: "screen librarian-assigned-quizzes" });

  screenEl.appendChild(
    createElement("div", { className: "screen__badge", text: "Librarian" })
  );
  screenEl.appendChild(
    createElement("h1", { className: "screen__title", text: "Architect quizzes" })
  );
  screenEl.appendChild(
    createElement("p", {
      className: "screen__subtitle",
      text: "Quizzes your architect assigned to you appear below. Choose one to attend (take) it."
    })
  );

  const listHost = createElement("div", { className: "librarian-assigned-quizzes__list" });
  const statusEl = createElement("p", { className: "text-muted", text: "Loading…" });

  screenEl.appendChild(statusEl);
  screenEl.appendChild(listHost);

  screenEl.appendChild(
    createElement("button", {
      attrs: { type: "button" },
      className: "btn btn--ghost",
      text: "Back to Library Hub",
      onClick: () => navigateTo("hub", { container })
    })
  );

  async function load() {
    listHost.innerHTML = "";
    try {
      const data = await listAssignedQuizzesForLibrarian();
      const rows = Array.isArray(data?.assignments) ? data.assignments : [];
      statusEl.textContent =
        rows.length === 0
          ? "No quizzes assigned yet."
          : `${rows.length} assignment(s).`;
      rows.forEach((row) => {
        const card = createElement("article", { className: "librarian-assigned-card" });
        card.appendChild(
          createElement("h3", { className: "librarian-assigned-card__title", text: row.title })
        );
        card.appendChild(
          createElement("p", {
            className: "text-muted",
            text: `${row.templateId || "quiz"} · ${(row.items || []).length} item(s)`
          })
        );
        card.appendChild(
          createElement("button", {
            attrs: { type: "button" },
            className: "btn btn--primary",
            text: "Attend quiz",
            onClick: () => {
              updateState({
                librarianQuizPlaySession: {
                  title: row.title,
                  templateId: row.templateId || "assigned",
                  items: Array.isArray(row.items) ? row.items : [],
                  quizId: row.quizId,
                  builtAt: row.updatedAt || new Date().toISOString()
                }
              });
              navigateTo("librarian-quiz-play", { container });
            }
          })
        );
        listHost.appendChild(card);
      });
    } catch (err) {
      if (isLikelyMissingPhpApiError(err)) {
        statusEl.textContent =
          "Could not load assignments (PHP API or database unavailable).";
      } else {
        statusEl.textContent = err?.message || "Failed to load.";
      }
    }
  }

  load();
  container.appendChild(screenEl);
}

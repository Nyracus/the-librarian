// src/screens/TemplatedQuizRunScreen.js — Architect preview; Save writes to MySQL architect_quizzes.

import { createElement } from "../components/ui.js";
import { renderAssessmentItemPreview } from "../components/AssessmentItemPreview.js";
import { getState, updateState } from "../core/state.js";
import { logScreenEntry } from "../core/logger.js";
import { navigateTo } from "../core/router.js";
import { saveArchitectQuiz } from "../api/architectQuizzesApi.js";
import { isLikelyMissingPhpApiError } from "../api/http.js";

export function renderTemplatedQuizRunScreen(container, context, { screenId }) {
  updateState({ currentScreenId: screenId, phase: "learning" });
  const state = getState();
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
    createElement("div", { className: "screen__badge", text: "Quiz • preview (architect)" })
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
      text: `${tplHuman} · ${session.items.length} item(s) — browse with Prev/Next; no learner attempt here.`
    })
  );

  if (session.savedQuizId) {
    screenEl.appendChild(
      createElement("p", {
        className: "text-muted",
        text: `Saved in database: ${session.savedQuizId}`
      })
    );
  }

  const itemHost = createElement("div", { className: "templated-quiz-run__preview-host" });
  const nav = createElement("div", { className: "templated-quiz-run__nav" });
  const statusEl = createElement("p", { className: "screen__feedback text-muted", text: "" });

  const prevBtn = createElement("button", {
    attrs: { type: "button" },
    className: "btn btn--ghost",
    text: "← Previous",
    onClick: () => step(-1)
  });
  const nextBtn = createElement("button", {
    attrs: { type: "button" },
    className: "btn btn--ghost",
    text: "Next →",
    onClick: () => step(1)
  });
  const editBtn = createElement("button", {
    attrs: { type: "button" },
    className: "btn btn--primary",
    text: "Edit this question",
    onClick: () => {
      const sess = getState().architectQuizSession;
      if (!sess) return;
      const it = sess.items[index];
      const bid = it && it._bankQuestionId;
      if (!bid) {
        window.alert(
          "This item was authored in Create Quiz Set. To edit as a saved item, add it from New quiz on the quizzes hub, or adjust the draft in the composer."
        );
        return;
      }
      updateState({ architectQuestionEditId: bid });
      navigateTo("architect-question-edit", { container });
    }
  });

  nav.appendChild(prevBtn);
  nav.appendChild(nextBtn);
  nav.appendChild(editBtn);

  const actions = createElement("div", { className: "templated-quiz-run__actions" });
  const saveBtn = createElement("button", {
    attrs: { type: "button" },
    className: "btn btn--primary",
    text: "Save quiz",
    onClick: async () => {
      const cur = getState().architectQuizSession;
      if (!cur) return;
      statusEl.textContent = "Saving…";
      statusEl.className = "screen__feedback text-muted";
      try {
        const existingId =
          cur.savedQuizId &&
          String(cur.savedQuizId).trim() &&
          !String(cur.savedQuizId).startsWith("local_")
            ? String(cur.savedQuizId).trim()
            : undefined;
        const data = await saveArchitectQuiz({
          id: existingId,
          title: cur.title || "Untitled quiz",
          templateId: cur.templateId || "custom",
          items: cur.items
        });
        updateState({
          architectQuizSession: {
            ...cur,
            savedQuizId: data.id,
            draftLocalQuizId: undefined
          }
        });
        statusEl.textContent = "Saved.";
        statusEl.className = "screen__feedback text-success";
      } catch (err) {
        statusEl.textContent = isLikelyMissingPhpApiError(err)
          ? "Could not reach the database. Check that PHP and MySQL are running and the app is served so /api/ runs PHP."
          : err?.message || "Could not save quiz.";
        statusEl.className = "screen__feedback text-danger";
      }
    }
  });
  const assignBtn = createElement("button", {
    attrs: { type: "button" },
    className: "btn btn--ghost",
    text: "Assign to librarians…",
    onClick: () => navigateTo("architect-quiz-assign", { container })
  });
  const hubBtn = createElement("button", {
    attrs: { type: "button" },
    className: "btn btn--ghost",
    text: "Quizzes & questions",
    onClick: () => navigateTo("architect-quiz-hub", { container })
  });

  actions.appendChild(saveBtn);
  actions.appendChild(assignBtn);
  actions.appendChild(hubBtn);

  screenEl.appendChild(itemHost);
  screenEl.appendChild(nav);
  screenEl.appendChild(statusEl);
  screenEl.appendChild(actions);

  let index = 0;

  function step(delta) {
    const s = getState().architectQuizSession;
    if (!s) return;
    const n = s.items.length;
    index = Math.max(0, Math.min(n - 1, index + delta));
    renderItem();
  }

  function renderItem() {
    const s = getState().architectQuizSession;
    if (!s || !Array.isArray(s.items) || s.items.length === 0) return;
    const n = s.items.length;
    index = Math.max(0, Math.min(n - 1, index));
    const it = s.items[index];
    itemHost.innerHTML = "";
    itemHost.appendChild(
      createElement("p", {
        className: "text-muted",
        text: `Question ${index + 1} of ${n} · read-only preview`
      })
    );
    const wrap = createElement("div");
    itemHost.appendChild(wrap);
    renderAssessmentItemPreview(wrap, { item: it });
    prevBtn.disabled = index <= 0;
    nextBtn.disabled = index >= n - 1;
    const bid = it && it._bankQuestionId;
    editBtn.disabled = !bid;
    editBtn.title = bid
      ? "Open this question in the editor"
      : "Only bank-sourced items can be opened for edit here";
  }

  renderItem();
  container.appendChild(screenEl);
}

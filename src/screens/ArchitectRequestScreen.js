// src/screens/ArchitectRequestScreen.js — Teachers (Architects) request new quizzes / content (local queue → Fabricator handoff in full product).

import { createElement } from "../components/ui.js";
import { getState, updateState } from "../core/state.js";
import { logScreenEntry, logEvent } from "../core/logger.js";
import { navigateTo } from "../core/router.js";
import {
  listArchitectRequests,
  addArchitectRequest,
  removeArchitectRequest,
  exportArchitectRequestsJson
} from "../core/architectRequestsStore.js";
import {
  effectiveWorkflowStatus,
  workflowStatusLabel,
  getWorkflowByRequestId,
  exportCombinedHandoffJson,
  removeWorkflowForRequest
} from "../core/fabricatorWorkflowStore.js";

export function renderArchitectRequestScreen(container, context, { screenId }) {
  updateState({ currentScreenId: screenId, phase: "learning" });
  const state = getState();

  logScreenEntry({
    participantId: state.participantId,
    condition: state.condition,
    phase: state.phase,
    screenId
  });

  container.innerHTML = "";
  const screenEl = createElement("section", { className: "screen architect-request-screen" });

  screenEl.appendChild(
    createElement("div", {
      className: "screen__badge",
      text: "Architect • Fabricators & narrative"
    })
  );
  screenEl.appendChild(
    createElement("h1", {
      className: "screen__title",
      text: "Requests & narrative handoff"
    })
  );
  screenEl.appendChild(
    createElement("p", {
      className: "screen__subtitle",
      text:
        "Ask for narrative versions of non-narrative quizzes or other content. Requests stay on this device. Fabricators pick up work from their queue; you review submissions when ready."
    })
  );

  screenEl.appendChild(
    createElement("div", { className: "architect-request-toolbar" }, [
      createElement("button", {
        attrs: { type: "button" },
        className: "btn btn--primary",
        text: "Create quizzes & questions",
        onClick: () => navigateTo("architect-quiz-hub", { container })
      }),
      createElement("button", {
        attrs: { type: "button" },
        className: "btn btn--ghost",
        text: "Fabricator queue",
        onClick: () => navigateTo("fabricator-queue", { container })
      }),
      createElement("button", {
        attrs: { type: "button" },
        className: "btn btn--ghost",
        text: "Review submissions",
        onClick: () => navigateTo("architect-approval", { container })
      })
    ])
  );

  const formWrap = createElement("div", { className: "architect-request-form" });

  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.id = "arch-req-title";
  titleInput.className = "screen__input";
  titleInput.required = true;
  titleInput.placeholder = "Short title (e.g. “Cold War alliances — 10 MCQs”)";
  formWrap.appendChild(
    createElement("label", {
      className: "architect-request-label",
      attrs: { for: "arch-req-title" },
      text: "Title"
    })
  );
  formWrap.appendChild(titleInput);

  const wingSel = document.createElement("select");
  wingSel.id = "arch-req-wing";
  wingSel.className = "screen__input";
  [
    { v: "history", l: "History wing" },
    { v: "geography", l: "Geography wing" },
    { v: "literature", l: "Literature (planned)" },
    { v: "theology", l: "Theology (planned)" },
    { v: "general", l: "General / cross-wing" }
  ].forEach((o) => {
    const opt = document.createElement("option");
    opt.value = o.v;
    opt.textContent = o.l;
    wingSel.appendChild(opt);
  });
  formWrap.appendChild(
    createElement("label", {
      className: "architect-request-label",
      attrs: { for: "arch-req-wing" },
      text: "Target wing"
    })
  );
  formWrap.appendChild(wingSel);

  const diffSel = document.createElement("select");
  diffSel.id = "arch-req-diff";
  diffSel.className = "screen__input";
  ["mixed", "easy", "medium", "hard"].forEach((d) => {
    const opt = document.createElement("option");
    opt.value = d;
    opt.textContent = d.charAt(0).toUpperCase() + d.slice(1);
    diffSel.appendChild(opt);
  });
  formWrap.appendChild(
    createElement("label", {
      className: "architect-request-label",
      attrs: { for: "arch-req-diff" },
      text: "Difficulty mix"
    })
  );
  formWrap.appendChild(diffSel);

  const frameSel = document.createElement("select");
  frameSel.id = "arch-req-frame";
  frameSel.className = "screen__input";
  [
    { v: "either", l: "Either framing" },
    { v: "narrative", l: "Narrative presentation" },
    { v: "non-narrative", l: "Non-narrative (direct instruction)" }
  ].forEach((o) => {
    const opt = document.createElement("option");
    opt.value = o.v;
    opt.textContent = o.l;
    frameSel.appendChild(opt);
  });
  formWrap.appendChild(
    createElement("label", {
      className: "architect-request-label",
      attrs: { for: "arch-req-frame" },
      text: "Preferred framing"
    })
  );
  formWrap.appendChild(frameSel);

  const tagsInput = document.createElement("input");
  tagsInput.type = "text";
  tagsInput.id = "arch-req-tags";
  tagsInput.className = "screen__input";
  tagsInput.placeholder = "Tags, comma-separated (e.g. WW2, maps, treaties)";
  formWrap.appendChild(
    createElement("label", {
      className: "architect-request-label",
      attrs: { for: "arch-req-tags" },
      text: "Tags"
    })
  );
  formWrap.appendChild(tagsInput);

  const notesTa = document.createElement("textarea");
  notesTa.id = "arch-req-notes";
  notesTa.className = "screen__textarea";
  notesTa.rows = 4;
  notesTa.placeholder =
    "Learning objectives, source texts, number of items, deadline, or links. This is what a Fabricator or developer would use to scope the work.";
  formWrap.appendChild(
    createElement("label", {
      className: "architect-request-label",
      attrs: { for: "arch-req-notes" },
      text: "Notes for authors / developers"
    })
  );
  formWrap.appendChild(notesTa);

  const statusEl = createElement("p", { className: "architect-request-status", text: "" });

  const submitBtn = createElement("button", {
    attrs: { type: "button" },
    className: "btn btn--primary",
    text: "Submit request",
    onClick: () => {
      const title = titleInput.value.trim();
      if (!title) {
        statusEl.textContent = "Please enter a title.";
        return;
      }
      const email = state.auth?.email || "";
      const entry = addArchitectRequest({
        title,
        wing: wingSel.value,
        difficulty: diffSel.value,
        framing: frameSel.value,
        tags: tagsInput.value.trim(),
        notes: notesTa.value.trim(),
        requesterHint: email ? `Signed in: ${email}` : "Anonymous / not signed in"
      });
      logEvent({
        participantId: state.participantId,
        condition: state.condition,
        phase: state.phase,
        screenId,
        itemId: entry.id,
        response: {
          type: "architect-request",
          title,
          wing: wingSel.value,
          difficulty: diffSel.value,
          framing: frameSel.value
        },
        correctness: null,
        responseTimeMs: null
      });
      titleInput.value = "";
      tagsInput.value = "";
      notesTa.value = "";
      statusEl.textContent = "Request saved on this device.";
      renderList();
    }
  });

  formWrap.appendChild(submitBtn);
  formWrap.appendChild(statusEl);
  screenEl.appendChild(formWrap);

  const listHost = createElement("div", { className: "architect-request-list-host" });
  screenEl.appendChild(
    createElement("h2", { className: "architect-request-list-title", text: "Your requests (this browser)" })
  );
  screenEl.appendChild(listHost);

  const actions = createElement("div", { className: "architect-request-actions" });
  actions.appendChild(
    createElement("button", {
      attrs: { type: "button" },
      className: "btn btn--ghost",
      text: "Copy all as JSON",
      onClick: async () => {
        const json = exportArchitectRequestsJson();
        try {
          await navigator.clipboard.writeText(json);
          statusEl.textContent = "Copied request list JSON to clipboard.";
        } catch {
          statusEl.textContent = "Clipboard failed — use Download JSON.";
        }
      }
    })
  );
  actions.appendChild(
    createElement("button", {
      attrs: { type: "button" },
      className: "btn btn--ghost",
      text: "Download JSON",
      onClick: () => {
        const blob = new Blob([exportArchitectRequestsJson()], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `librarian_architect_requests_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    })
  );
  actions.appendChild(
    createElement("button", {
      attrs: { type: "button" },
      className: "btn btn--ghost",
      text: "Download handoff (requests + workflow)",
      onClick: () => {
        const blob = new Blob([exportCombinedHandoffJson()], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `librarian_handoff_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    })
  );
  actions.appendChild(
    createElement("button", {
      attrs: { type: "button" },
      className: "btn btn--primary",
      text: "Back to Architect home",
      onClick: () => navigateTo("architect-home", { container })
    })
  );
  screenEl.appendChild(actions);

  function renderList() {
    listHost.innerHTML = "";
    const rows = listArchitectRequests();
    if (!rows.length) {
      listHost.appendChild(
        createElement("p", {
          className: "text-muted",
          text: "No requests yet. Submit a title and notes above."
        })
      );
      return;
    }
    rows.forEach((r) => {
      const wfSt = effectiveWorkflowStatus(r.id);
      const wf = getWorkflowByRequestId(r.id);
      const card = createElement("article", { className: "architect-request-card" });
      card.appendChild(
        createElement("h3", { className: "architect-request-card__title", text: r.title })
      );
      card.appendChild(
        createElement("p", {
          className: `fabricator-queue-card__badge fabricator-queue-card__badge--${wfSt}`,
          text: `Workflow: ${workflowStatusLabel(wfSt)}`
        })
      );
      card.appendChild(
        createElement("p", {
          className: "architect-request-card__meta",
          text: `${new Date(r.createdAt).toLocaleString()} · ${r.wing} · ${r.difficulty} · ${r.framing}`
        })
      );
      if (r.tags) {
        card.appendChild(createElement("p", { className: "architect-request-card__tags", text: `Tags: ${r.tags}` }));
      }
      if (r.notes) {
        card.appendChild(createElement("p", { className: "architect-request-card__notes", text: r.notes }));
      }
      if (r.requesterHint) {
        card.appendChild(
          createElement("p", { className: "architect-request-card__hint", text: r.requesterHint })
        );
      }
      if (wf?.architectNotes && (wfSt === "revision_requested" || wfSt === "rejected" || wfSt === "approved")) {
        card.appendChild(
          createElement("p", {
            className: "architect-request-card__wf-note",
            text: `Latest architect ↔ fabricator note: ${wf.architectNotes}`
          })
        );
      }
      card.appendChild(
        createElement("button", {
          attrs: { type: "button" },
          className: "btn btn--ghost architect-request-card__remove",
          text: "Remove",
          onClick: () => {
            removeArchitectRequest(r.id);
            removeWorkflowForRequest(r.id);
            renderList();
            statusEl.textContent = "Request removed.";
          }
        })
      );
      listHost.appendChild(card);
    });
  }

  renderList();
  container.appendChild(screenEl);
}

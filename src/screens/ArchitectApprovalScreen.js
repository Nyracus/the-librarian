// src/screens/ArchitectApprovalScreen.js — Architect: approve / revision / reject Fabricator submissions.

import { createElement } from "../components/ui.js";
import { getState, updateState } from "../core/state.js";
import { logScreenEntry, logEvent } from "../core/logger.js";
import { navigateTo } from "../core/router.js";
import { listArchitectRequests } from "../core/architectRequestsStore.js";
import {
  getWorkflowByRequestId,
  architectApprove,
  architectRequestRevision,
  architectReject
} from "../core/fabricatorWorkflowStore.js";

export function renderArchitectApprovalScreen(container, context, { screenId }) {
  updateState({ currentScreenId: screenId, phase: "learning" });
  const state = getState();

  logScreenEntry({
    participantId: state.participantId,
    condition: state.condition,
    phase: state.phase,
    screenId
  });

  container.innerHTML = "";
  const screenEl = createElement("section", { className: "screen architect-approval-screen" });

  screenEl.appendChild(
    createElement("div", { className: "screen__badge", text: "Architect • Approvals" })
  );
  screenEl.appendChild(
    createElement("h1", { className: "screen__title", text: "Review Fabricator submissions" })
  );
  screenEl.appendChild(
    createElement("p", {
      className: "screen__subtitle",
      text:
        "When a Fabricator submits work, it appears here. Approve, request revision with notes, or reject. Revision and rejection require feedback text."
    })
  );

  const statusEl = createElement("p", { className: "architect-approval__status", text: "" });
  screenEl.appendChild(statusEl);

  const listHost = createElement("div", { className: "architect-approval__list" });
  screenEl.appendChild(listHost);

  const footer = createElement("div", { className: "architect-approval__footer" });
  footer.appendChild(
    createElement("button", {
      attrs: { type: "button" },
      className: "btn btn--ghost",
      text: "Architect requests",
      onClick: () => navigateTo("architect-requests", { container })
    })
  );
  footer.appendChild(
    createElement("button", {
      attrs: { type: "button" },
      className: "btn btn--ghost",
      text: "Fabricator queue",
      onClick: () => navigateTo("fabricator-queue", { container })
    })
  );
  footer.appendChild(
    createElement("button", {
      attrs: { type: "button" },
      className: "btn btn--primary",
      text: "Architect home",
      onClick: () => navigateTo("architect-home", { container })
    })
  );
  screenEl.appendChild(footer);

  function pendingRows() {
    return listArchitectRequests().filter((r) => {
      const w = getWorkflowByRequestId(r.id);
      return w && w.status === "submitted_for_review";
    });
  }

  function renderList() {
    listHost.innerHTML = "";
    const rows = pendingRows();
    if (!rows.length) {
      listHost.appendChild(
        createElement("p", {
          className: "text-muted",
          text: "Nothing awaiting review. When a Fabricator submits a request, it will show up here."
        })
      );
      return;
    }

    rows.forEach((r) => {
      const w = getWorkflowByRequestId(r.id);
      const card = createElement("article", { className: "architect-approval-card" });
      card.appendChild(
        createElement("h3", { className: "architect-approval-card__title", text: r.title })
      );
      card.appendChild(
        createElement("p", {
          className: "architect-approval-card__meta",
          text: `${r.wing} · ${r.framing} · submitted ${w?.submittedForReviewAt ? new Date(w.submittedForReviewAt).toLocaleString() : "—"}`
        })
      );
      card.appendChild(
        createElement("p", {
          className: "screen__body",
          text: `Original request notes: ${r.notes || "—"}`
        })
      );
      card.appendChild(
        createElement("p", {
          className: "screen__body",
          text: `Fabricator notes: ${w?.fabricatorNotes || "—"}`
        })
      );
      card.appendChild(
        createElement("p", {
          className: "screen__body",
          text: `Handoff: ${w?.handoffSummary || "—"}`
        })
      );

      const notesTa = document.createElement("textarea");
      notesTa.className = "screen__textarea";
      notesTa.rows = 2;
      notesTa.placeholder = "Your response (required for revision / reject; optional for approve)";
      card.appendChild(
        createElement("label", {
          className: "architect-request-label",
          text: "Architect response"
        })
      );
      card.appendChild(notesTa);

      const row = createElement("div", { className: "architect-approval-card__actions" });
      row.appendChild(
        createElement("button", {
          attrs: { type: "button" },
          className: "btn btn--primary",
          text: "Approve",
          onClick: () => {
            const text = notesTa.value.trim();
            const result = architectApprove(r.id, text);
            if (!result) {
              statusEl.textContent = "Could not approve — wrong state?";
              return;
            }
            logEvent({
              participantId: state.participantId,
              condition: state.condition,
              phase: state.phase,
              screenId,
              itemId: r.id,
              response: { type: "architect-approve", requestId: r.id },
              correctness: null,
              responseTimeMs: null
            });
            statusEl.textContent = `Approved: ${r.title}`;
            renderList();
          }
        })
      );
      row.appendChild(
        createElement("button", {
          attrs: { type: "button" },
          className: "btn btn--ghost",
          text: "Request revision",
          onClick: () => {
            const text = notesTa.value.trim();
            if (!text) {
              statusEl.textContent = "Add feedback for the Fabricator before requesting revision.";
              return;
            }
            const result = architectRequestRevision(r.id, text);
            if (!result) {
              statusEl.textContent = "Could not update — wrong state?";
              return;
            }
            logEvent({
              participantId: state.participantId,
              condition: state.condition,
              phase: state.phase,
              screenId,
              itemId: r.id,
              response: { type: "architect-revision", requestId: r.id },
              correctness: null,
              responseTimeMs: null
            });
            statusEl.textContent = `Revision requested: ${r.title}`;
            renderList();
          }
        })
      );
      row.appendChild(
        createElement("button", {
          attrs: { type: "button" },
          className: "btn btn--ghost",
          text: "Reject",
          onClick: () => {
            const text = notesTa.value.trim();
            if (!text) {
              statusEl.textContent = "Add a short reason before rejecting.";
              return;
            }
            const result = architectReject(r.id, text);
            if (!result) {
              statusEl.textContent = "Could not reject — wrong state?";
              return;
            }
            logEvent({
              participantId: state.participantId,
              condition: state.condition,
              phase: state.phase,
              screenId,
              itemId: r.id,
              response: { type: "architect-reject", requestId: r.id },
              correctness: null,
              responseTimeMs: null
            });
            statusEl.textContent = `Rejected: ${r.title}`;
            renderList();
          }
        })
      );
      card.appendChild(row);
      listHost.appendChild(card);
    });
  }

  renderList();
  container.appendChild(screenEl);
}

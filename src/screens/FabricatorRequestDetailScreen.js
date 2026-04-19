// src/screens/FabricatorRequestDetailScreen.js — one request: notes, handoff, submit for review.

import { createElement } from "../components/ui.js";
import { getState, updateState } from "../core/state.js";
import { logScreenEntry, logEvent } from "../core/logger.js";
import { navigateTo } from "../core/router.js";
import { listArchitectRequests } from "../core/architectRequestsStore.js";
import {
  getWorkflowByRequestId,
  ensureWorkflow,
  claimRequest,
  updateWorkflow,
  submitForReview,
  reopenAfterRejection,
  effectiveWorkflowStatus,
  workflowStatusLabel
} from "../core/fabricatorWorkflowStore.js";

export function renderFabricatorRequestDetailScreen(container, context, { screenId }) {
  updateState({ currentScreenId: screenId, phase: "learning" });
  let state = getState();
  const requestId = state.fabricatorActiveRequestId;

  logScreenEntry({
    participantId: state.participantId,
    condition: state.condition,
    phase: state.phase,
    screenId
  });

  container.innerHTML = "";
  const screenEl = createElement("section", { className: "screen fabricator-detail-screen" });

  const req = requestId ? listArchitectRequests().find((r) => r.id === requestId) : null;

  if (!req || !requestId) {
    screenEl.appendChild(
      createElement("p", {
        className: "screen__body",
        text: "No request selected. Open the Fabricator queue and choose a request."
      })
    );
    screenEl.appendChild(
      createElement("button", {
        attrs: { type: "button" },
        className: "btn btn--primary",
        text: "Fabricator queue",
        onClick: () => {
          updateState({ fabricatorActiveRequestId: null });
          navigateTo("fabricator-queue", { container });
        }
      })
    );
    container.appendChild(screenEl);
    return;
  }

  ensureWorkflow(requestId);
  let wf = getWorkflowByRequestId(requestId);

  screenEl.appendChild(
    createElement("div", { className: "screen__badge", text: "Fabricator • Request detail" })
  );
  screenEl.appendChild(
    createElement("h1", { className: "screen__title", text: req.title })
  );

  const statusLine = createElement("p", {
    className: "fabricator-detail__statusline",
    text: ""
  });
  screenEl.appendChild(statusLine);

  function refreshStatusLine() {
    wf = getWorkflowByRequestId(requestId);
    const st = effectiveWorkflowStatus(requestId);
    statusLine.textContent = `Status: ${workflowStatusLabel(st)}`;
  }
  refreshStatusLine();

  screenEl.appendChild(
    createElement("div", { className: "fabricator-detail__readonly" }, [
      createElement("p", {
        className: "screen__body",
        text: `Submitted: ${new Date(req.createdAt).toLocaleString()} · Wing: ${req.wing} · Difficulty mix: ${req.difficulty} · Framing: ${req.framing}`
      }),
      req.tags
        ? createElement("p", { className: "screen__body", text: `Tags: ${req.tags}` })
        : null,
      createElement("p", { className: "screen__body", text: `Architect notes: ${req.notes || "—"}` }),
      createElement("p", {
        className: "text-muted",
        text: req.requesterHint || ""
      })
    ])
  );

  const archFeedback = createElement("div", {
    className: "fabricator-detail__architect-feedback",
    attrs: { hidden: "hidden" }
  });
  screenEl.appendChild(archFeedback);

  function syncArchitectFeedback() {
    wf = getWorkflowByRequestId(requestId);
    const st = effectiveWorkflowStatus(requestId);
    if ((st === "revision_requested" || st === "rejected" || st === "approved") && wf?.architectNotes) {
      archFeedback.hidden = false;
      archFeedback.innerHTML = "";
      const title =
        st === "approved"
          ? "Architect decision (approved)"
          : st === "rejected"
            ? "Architect decision (rejected)"
            : "Architect feedback (revision)";
      archFeedback.appendChild(createElement("h2", { className: "fabricator-detail__af-title", text: title }));
      archFeedback.appendChild(
        createElement("p", { className: "fabricator-detail__af-body", text: wf.architectNotes })
      );
    } else {
      archFeedback.hidden = true;
      archFeedback.innerHTML = "";
    }
  }
  syncArchitectFeedback();

  const fabNotes = document.createElement("textarea");
  fabNotes.className = "screen__textarea";
  fabNotes.rows = 4;
  fabNotes.placeholder = "Fabricator notes (implementation plan, branch name, risks)";
  fabNotes.value = wf?.fabricatorNotes || "";

  const handoff = document.createElement("textarea");
  handoff.className = "screen__textarea";
  handoff.rows = 4;
  handoff.placeholder =
    "Handoff summary (paths changed, how to verify in-game, PR link if applicable)";
  handoff.value = wf?.handoffSummary || "";

  screenEl.appendChild(
    createElement("label", { className: "architect-request-label", text: "Fabricator notes" })
  );
  screenEl.appendChild(fabNotes);
  screenEl.appendChild(
    createElement("label", { className: "architect-request-label", text: "Handoff summary" })
  );
  screenEl.appendChild(handoff);

  const saveStatus = createElement("p", { className: "fabricator-detail__hint", text: "" });

  const actionRow = createElement("div", { className: "fabricator-detail__actions" });

  function saveDraft() {
    updateWorkflow(requestId, {
      fabricatorNotes: fabNotes.value.trim(),
      handoffSummary: handoff.value.trim()
    });
    saveStatus.textContent = "Draft saved.";
  }

  function syncFieldsReadonly(st) {
    const lock = st === "submitted_for_review" || st === "approved";
    fabNotes.disabled = lock;
    handoff.disabled = lock;
  }

  function rebuildActions() {
    state = getState();
    actionRow.innerHTML = "";
    wf = getWorkflowByRequestId(requestId);
    const st = effectiveWorkflowStatus(requestId);
    syncFieldsReadonly(st);

    if (st !== "approved" && st !== "submitted_for_review") {
      actionRow.appendChild(
        createElement("button", {
          attrs: { type: "button" },
          className: "btn btn--ghost",
          text: "Save draft",
          onClick: () => saveDraft()
        })
      );
    }

    if (st === "queued") {
      actionRow.appendChild(
        createElement("button", {
          attrs: { type: "button" },
          className: "btn btn--primary",
          text: "Claim this request",
          onClick: () => {
            claimRequest(requestId);
            logEvent({
              participantId: state.participantId,
              condition: state.condition,
              phase: state.phase,
              screenId,
              itemId: requestId,
              response: { type: "fabricator-claim", requestId },
              correctness: null,
              responseTimeMs: null
            });
            refreshStatusLine();
            syncArchitectFeedback();
            rebuildActions();
          }
        })
      );
    }

    if (st === "in_progress" || st === "revision_requested") {
      actionRow.appendChild(
        createElement("button", {
          attrs: { type: "button" },
          className: "btn btn--primary",
          text: "Submit for architect review",
          onClick: () => {
            saveDraft();
            const w = getWorkflowByRequestId(requestId);
            if (!w?.handoffSummary?.trim()) {
              saveStatus.textContent = "Add a short handoff summary before submitting.";
              return;
            }
            const result = submitForReview(requestId);
            if (!result || result.status !== "submitted_for_review") {
              saveStatus.textContent = "Cannot submit from this status.";
              return;
            }
            logEvent({
              participantId: state.participantId,
              condition: state.condition,
              phase: state.phase,
              screenId,
              itemId: requestId,
              response: { type: "fabricator-submit-review", requestId },
              correctness: null,
              responseTimeMs: null
            });
            refreshStatusLine();
            syncArchitectFeedback();
            saveStatus.textContent = "Submitted for architect review.";
            rebuildActions();
          }
        })
      );
    }

    if (st === "submitted_for_review") {
      actionRow.appendChild(
        createElement("p", {
          className: "text-muted",
          text: "Waiting on the Architect — they approve, request revision, or reject from Architect approval."
        })
      );
    }

    if (st === "approved") {
      actionRow.appendChild(
        createElement("p", {
          className: "text-muted",
          text: "Approved — narrative/content can ship per your team process."
        })
      );
    }

    if (st === "rejected") {
      actionRow.appendChild(
        createElement("button", {
          attrs: { type: "button" },
          className: "btn btn--ghost",
          text: "Reopen as in progress",
          onClick: () => {
            reopenAfterRejection(requestId);
            refreshStatusLine();
            syncArchitectFeedback();
            rebuildActions();
          }
        })
      );
    }

    actionRow.appendChild(
      createElement("button", {
        attrs: { type: "button" },
        className: "btn btn--ghost",
        text: "Back to queue",
        onClick: () => {
          updateState({ fabricatorActiveRequestId: null });
          navigateTo("fabricator-queue", { container });
        }
      })
    );
  }

  screenEl.appendChild(saveStatus);
  screenEl.appendChild(actionRow);
  rebuildActions();

  container.appendChild(screenEl);
}

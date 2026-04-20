// src/screens/FabricatorQueueScreen.js — Fabricator: see Architect requests + workflow status.

import { createElement } from "../components/ui.js";
import { getState, updateState } from "../core/state.js";
import { logScreenEntry, logEvent } from "../core/logger.js";
import { navigateTo } from "../core/router.js";
import { listArchitectRequests } from "../core/architectRequestsStore.js";
import { listAssignedRequestsForFabricator } from "../api/architectQuizzesApi.js";
import { updateFabricatorWorkflow } from "../api/architectQuizzesApi.js";
import { isLikelyMissingPhpApiError } from "../api/http.js";
import {
  effectiveWorkflowStatus,
  workflowStatusLabel,
  exportWorkflowJson,
  exportCombinedHandoffJson
} from "../core/fabricatorWorkflowStore.js";

export function renderFabricatorQueueScreen(container, context, { screenId }) {
  updateState({ currentScreenId: screenId, phase: "learning" });
  const state = getState();

  logScreenEntry({
    participantId: state.participantId,
    condition: state.condition,
    phase: state.phase,
    screenId
  });

  container.innerHTML = "";
  const screenEl = createElement("section", { className: "screen fabricator-queue-screen" });

  screenEl.appendChild(
    createElement("div", { className: "screen__badge", text: "Fabricator • Request queue" })
  );
  screenEl.appendChild(
    createElement("h1", { className: "screen__title", text: "Narrative & content requests" })
  );
  screenEl.appendChild(
    createElement("p", {
      className: "screen__subtitle",
      text:
        "Architects submit and assign requests from their screen. You claim work, implement in-repo, document the handoff, then submit for architect approval."
    })
  );

  const statusEl = createElement("p", { className: "fabricator-queue__status", text: "" });

  const toolbar = createElement("div", { className: "fabricator-queue__toolbar" });
  toolbar.appendChild(
    createElement("button", {
      attrs: { type: "button" },
      className: "btn btn--ghost",
      text: "Export workflow JSON",
      onClick: () => {
        const blob = new Blob([exportWorkflowJson()], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `librarian_fabricator_workflow_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
        a.click();
        URL.revokeObjectURL(url);
        statusEl.textContent = "Workflow JSON downloaded.";
      }
    })
  );
  toolbar.appendChild(
    createElement("button", {
      attrs: { type: "button" },
      className: "btn btn--ghost",
      text: "Export requests + workflow (full handoff)",
      onClick: () => {
        const blob = new Blob([exportCombinedHandoffJson()], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `librarian_handoff_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
        a.click();
        URL.revokeObjectURL(url);
        statusEl.textContent = "Combined handoff JSON downloaded.";
      }
    })
  );
  toolbar.appendChild(
    createElement("button", {
      attrs: { type: "button" },
      className: "btn btn--ghost",
      text: "Architect requests (submit side)",
      onClick: () => navigateTo("architect-requests", { container })
    })
  );
  toolbar.appendChild(
    createElement("button", {
      attrs: { type: "button" },
      className: "btn btn--ghost",
      text: "Architect approval",
      onClick: () => navigateTo("architect-approval", { container })
    })
  );
  toolbar.appendChild(
    createElement("button", {
      attrs: { type: "button" },
      className: "btn btn--primary",
      text: "Fabricator home",
      onClick: () => navigateTo("fabricator-home", { container })
    })
  );
  screenEl.appendChild(toolbar);
  screenEl.appendChild(statusEl);

  const listHost = createElement("div", { className: "fabricator-queue__list" });
  screenEl.appendChild(listHost);
  let remoteRows = null;

  function openDetail(request) {
    updateState({
      fabricatorActiveRequestId: request.id,
      fabricatorActiveRequestPayload: request
    });
    navigateTo("fabricator-request-detail", { container });
  }

  async function renderList() {
    listHost.innerHTML = "";
    let rows = Array.isArray(remoteRows) ? remoteRows : [];
    if (!rows.length) {
      try {
        const data = await listAssignedRequestsForFabricator();
        rows = Array.isArray(data?.requests) ? data.requests : [];
        remoteRows = rows;
      } catch (err) {
        rows = listArchitectRequests();
        statusEl.textContent = isLikelyMissingPhpApiError(err)
          ? "Could not load assigned requests from API. Showing local queue."
          : err?.message || "Could not load API queue. Showing local queue.";
      }
    }
    if (!rows.length) {
      listHost.appendChild(
        createElement("p", {
          className: "text-muted",
          text: "No requests yet. Ask an Architect to submit from Architect → request a new quiz."
        })
      );
      return;
    }

    rows.forEach((r) => {
      const st = r?.workflow?.status || effectiveWorkflowStatus(r.id);
      const card = createElement("article", { className: "fabricator-queue-card" });
      card.appendChild(
        createElement("h3", { className: "fabricator-queue-card__title", text: r.title })
      );
      card.appendChild(
        createElement("p", {
          className: "fabricator-queue-card__meta",
          text: `${new Date(r.createdAt || r.assignedAt || r.updatedAt || Date.now()).toLocaleString()} · ${r.wing} · ${r.framing}`
        })
      );
      card.appendChild(
        createElement("p", {
          className: `fabricator-queue-card__badge fabricator-queue-card__badge--${st}`,
          text: workflowStatusLabel(st)
        })
      );

      const actions = createElement("div", { className: "fabricator-queue-card__actions" });

      actions.appendChild(
        createElement("button", {
          attrs: { type: "button" },
          className: "btn btn--primary",
          text: "Open",
          onClick: () => openDetail(r)
        })
      );

      if (st === "queued") {
        actions.appendChild(
          createElement("button", {
            attrs: { type: "button" },
            className: "btn btn--ghost",
            text: "Claim work",
            onClick: async () => {
              try {
                await updateFabricatorWorkflow({ requestId: r.id, action: "claim" });
              } catch (err) {
                statusEl.textContent = isLikelyMissingPhpApiError(err)
                  ? "Could not claim (API unavailable)."
                  : err?.message || "Claim failed.";
                return;
              }
              logEvent({
                participantId: state.participantId,
                condition: state.condition,
                phase: state.phase,
                screenId,
                itemId: r.id,
                response: { type: "fabricator-claim", requestId: r.id },
                correctness: null,
                responseTimeMs: null
              });
              statusEl.textContent = "Claimed — open the request to add notes.";
              remoteRows = null;
              void renderList();
            }
          })
        );
      }

      card.appendChild(actions);
      listHost.appendChild(card);
    });
  }

  void renderList();
  container.appendChild(screenEl);
}

// src/core/fabricatorWorkflowStore.js — Fabricator ↔ Architect handoff (local), keyed by Architect request id.

import { listArchitectRequests } from "./architectRequestsStore.js";

const STORAGE_KEY = "librarian_fabricator_workflow_v1";

/**
 * @typedef {'queued' | 'in_progress' | 'submitted_for_review' | 'revision_requested' | 'approved' | 'rejected'} WorkflowStatus
 *
 * @typedef {{
 *   requestId: string;
 *   status: WorkflowStatus;
 *   fabricatorNotes: string;
 *   handoffSummary: string;
 *   fabricatorWingId: string | null;
 *   architectNotes: string;
 *   claimedAt: string | null;
 *   submittedForReviewAt: string | null;
 *   lastDecisionAt: string | null;
 *   createdAt: string;
 *   updatedAt: string;
 * }} WorkflowRecord
 */

function loadRaw() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRaw(list) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn("fabricatorWorkflowStore save failed", e);
  }
  void import("../api/mysqlSync.js")
    .then((m) => m.notifyAuxPersisted())
    .catch(() => {});
}

/** @param {string} requestId @returns {WorkflowRecord | null} */
export function getWorkflowByRequestId(requestId) {
  if (!requestId) return null;
  return loadRaw().find((w) => w.requestId === requestId) || null;
}

/**
 * @param {string} requestId
 * @returns {WorkflowRecord}
 */
export function ensureWorkflow(requestId) {
  const existing = getWorkflowByRequestId(requestId);
  if (existing) return existing;
  const now = new Date().toISOString();
  const row = {
    requestId,
    status: "queued",
    fabricatorNotes: "",
    handoffSummary: "",
    fabricatorWingId: null,
    architectNotes: "",
    claimedAt: null,
    submittedForReviewAt: null,
    lastDecisionAt: null,
    createdAt: now,
    updatedAt: now
  };
  saveRaw([row, ...loadRaw()]);
  return row;
}

/**
 * @param {string} requestId
 * @param {Partial<WorkflowRecord>} patch
 * @returns {WorkflowRecord | null}
 */
export function updateWorkflow(requestId, patch) {
  const list = loadRaw();
  const idx = list.findIndex((w) => w.requestId === requestId);
  if (idx < 0) return null;
  const next = {
    ...list[idx],
    ...patch,
    requestId,
    updatedAt: new Date().toISOString()
  };
  list[idx] = next;
  saveRaw(list);
  return next;
}

/**
 * Claim work: queued → in_progress
 * @param {string} requestId
 */
export function claimRequest(requestId) {
  ensureWorkflow(requestId);
  const w = getWorkflowByRequestId(requestId);
  if (!w || w.status !== "queued") return w;
  return updateWorkflow(requestId, {
    status: "in_progress",
    claimedAt: w.claimedAt || new Date().toISOString()
  });
}

/**
 * Fabricator submits for architect review.
 * @param {string} requestId
 */
export function submitForReview(requestId) {
  ensureWorkflow(requestId);
  const w = getWorkflowByRequestId(requestId);
  if (!w) return null;
  if (w.status !== "in_progress" && w.status !== "revision_requested") return w;
  return updateWorkflow(requestId, {
    status: "submitted_for_review",
    submittedForReviewAt: new Date().toISOString()
  });
}

/**
 * Architect: approve
 * @param {string} requestId
 * @param {string} [architectNotes]
 */
export function architectApprove(requestId, architectNotes = "") {
  const w = getWorkflowByRequestId(requestId);
  if (!w || w.status !== "submitted_for_review") return null;
  return updateWorkflow(requestId, {
    status: "approved",
    architectNotes: architectNotes || "",
    lastDecisionAt: new Date().toISOString()
  });
}

/**
 * Architect: request revision
 * @param {string} requestId
 * @param {string} architectNotes
 */
export function architectRequestRevision(requestId, architectNotes) {
  const w = getWorkflowByRequestId(requestId);
  if (!w || w.status !== "submitted_for_review") return null;
  return updateWorkflow(requestId, {
    status: "revision_requested",
    architectNotes: architectNotes || "",
    lastDecisionAt: new Date().toISOString()
  });
}

/**
 * Architect: reject
 * @param {string} requestId
 * @param {string} architectNotes
 */
export function architectReject(requestId, architectNotes) {
  const w = getWorkflowByRequestId(requestId);
  if (!w || w.status !== "submitted_for_review") return null;
  return updateWorkflow(requestId, {
    status: "rejected",
    architectNotes: architectNotes || "",
    lastDecisionAt: new Date().toISOString()
  });
}

/** Reopen rejected → in_progress (fabricator) */
export function reopenAfterRejection(requestId) {
  const w = getWorkflowByRequestId(requestId);
  if (!w || w.status !== "rejected") return w;
  return updateWorkflow(requestId, { status: "in_progress" });
}

/** Call when an Architect request is deleted so workflow rows do not linger. */
export function removeWorkflowForRequest(requestId) {
  if (!requestId) return;
  saveRaw(loadRaw().filter((w) => w.requestId !== requestId));
}

export function listWorkflowRecords() {
  return loadRaw().slice();
}

export function exportWorkflowJson() {
  return JSON.stringify(
    { version: 1, exportedAt: new Date().toISOString(), workflows: listWorkflowRecords() },
    null,
    2
  );
}

/** Requests + workflows for thesis / email handoff. */
export function exportCombinedHandoffJson() {
  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      architectRequests: listArchitectRequests(),
      workflows: listWorkflowRecords()
    },
    null,
    2
  );
}

/**
 * @param {string} jsonText
 * @param {{ merge?: boolean }} [opts]
 */
export function importWorkflowJson(jsonText, opts = {}) {
  const merge = opts.merge !== false;
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { ok: false, error: "Invalid JSON" };
  }
  const rows = Array.isArray(parsed) ? parsed : parsed?.workflows;
  if (!Array.isArray(rows)) return { ok: false, error: "Expected array or { workflows }" };
  const base = merge ? loadRaw() : [];
  const byId = new Map(base.map((w) => [w.requestId, w]));
  for (const row of rows) {
    if (!row.requestId) continue;
    byId.set(row.requestId, {
      ...row,
      updatedAt: new Date().toISOString()
    });
  }
  saveRaw([...byId.values()]);
  return { ok: true, count: byId.size };
}

/**
 * Status for UI when a workflow row may not exist yet (treat as queued).
 * @param {string} requestId
 * @returns {WorkflowStatus}
 */
export function effectiveWorkflowStatus(requestId) {
  const w = getWorkflowByRequestId(requestId);
  return w ? w.status : "queued";
}

/** Display label for status */
export function workflowStatusLabel(status) {
  switch (status) {
    case "queued":
      return "Queued (unclaimed)";
    case "in_progress":
      return "In progress";
    case "submitted_for_review":
      return "Awaiting architect review";
    case "revision_requested":
      return "Revision requested";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    default:
      return String(status || "—");
  }
}

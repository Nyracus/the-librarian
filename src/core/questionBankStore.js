// src/core/questionBankStore.js — Architect saved quizzes (local CMS + optional serverQuizId): CRUD + import/export.
// Persists in localStorage; items match AssessmentItem shapes (MCQ, fill blank, dropdown, ordering).

import { BLANK_PLACEHOLDER } from "./quizBuilderConstants.js";

const STORAGE_KEY = "librarian_question_bank_v1";

/** @typedef {'history'|'geography'|'literature'|'theology'|'general'} BankWing */
/** @typedef {'easy'|'medium'|'hard'} BankDifficulty */
/** @typedef {'draft'|'published'} BankStatus */

/**
 * @typedef {{ id: string; text: string }} BankMcqOption
 * @typedef {{ id: string; type: 'multiple_choice'; prompt: string; options: BankMcqOption[]; correctOptionId: string }} BankMcqItem
 * @typedef {{ id: string; type: 'fill_blank'; prompt: string; correctAnswer: string }} BankFillBlankItem
 * @typedef {{ id: string; text: string; priority: number }} BankDropdownOption
 * @typedef {{ id: string; type: 'dropdown'; prompt: string; options: BankDropdownOption[]; correctOptionId: string }} BankDropdownItem
 * @typedef {{ id: string; text: string }} BankOrdRow
 * @typedef {{ id: string; type: 'ordering'; prompt: string; items: BankOrdRow[]; correctOrder: string[] }} BankOrdItem
 * @typedef {BankMcqItem | BankFillBlankItem | BankDropdownItem | BankOrdItem} BankAssessmentItem
 *
 * @typedef {{
 *   id: string;
 *   createdAt: string;
 *   updatedAt: string;
 *   label: string;
 *   wing: BankWing;
 *   difficulty: BankDifficulty;
 *   tags: string[];
 *   status: BankStatus;
 *   notes: string;
 *   item: BankAssessmentItem;
 *   serverQuizId?: string | null;
 * }} BankQuestion
 * (serverQuizId matches architect_quizzes.id after Save syncs a single-item quiz.)
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
    console.warn("questionBankStore save failed", e);
  }
  void import("../api/mysqlSync.js")
    .then((m) => m.notifyQuestionBankPersisted())
    .catch(() => {});
}

/** Replace bank from server pull without triggering a remote PUT. */
export function replaceQuestionBankRemote(entries) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(Array.isArray(entries) ? entries : [])
    );
  } catch (e) {
    console.warn("replaceQuestionBankRemote failed", e);
  }
}

function genId() {
  return `qb_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}

/** @returns {BankQuestion[]} */
export function listQuestionBank() {
  return loadRaw()
    .slice()
    .sort((a, b) => {
      const ta = new Date(b.updatedAt || b.createdAt || 0).getTime();
      const tb = new Date(a.updatedAt || a.createdAt || 0).getTime();
      return ta - tb;
    });
}

/** @param {string} id @returns {BankQuestion | null} */
export function getQuestionBankEntry(id) {
  if (!id) return null;
  return loadRaw().find((q) => q.id === id) || null;
}

/**
 * @param {Omit<BankQuestion, "id" | "createdAt" | "updatedAt">} data
 * @returns {{ ok: true; entry: BankQuestion } | { ok: false; errors: string[] }}
 */
export function createQuestionBankEntry(data) {
  const id = genId();
  const entry = {
    ...data,
    id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    serverQuizId:
      data.serverQuizId !== undefined && data.serverQuizId !== null
        ? String(data.serverQuizId)
        : null,
    item: data.item ? { ...data.item, id: `${id}_item` } : data.item
  };
  const v = validateBankQuestion(entry);
  if (!v.ok) return v;
  saveRaw([entry, ...loadRaw()]);
  return { ok: true, entry };
}

/**
 * @param {string} id
 * @param {Partial<BankQuestion>} patch
 * @returns {{ ok: true; entry: BankQuestion } | { ok: false; errors: string[] }}
 */
export function updateQuestionBankEntry(id, patch) {
  const prev = getQuestionBankEntry(id);
  if (!prev) return { ok: false, errors: ["Question not found."] };
  const mergedItem =
    patch.item !== undefined
      ? { ...patch.item, id: patch.item.id || `${prev.id}_item` }
      : prev.item;
  const entry = {
    ...prev,
    ...patch,
    id: prev.id,
    createdAt: prev.createdAt,
    updatedAt: new Date().toISOString(),
    item: mergedItem
  };
  if (patch.serverQuizId !== undefined) {
    entry.serverQuizId =
      patch.serverQuizId === null || patch.serverQuizId === ""
        ? null
        : String(patch.serverQuizId);
  }
  const v = validateBankQuestion(entry);
  if (!v.ok) return v;
  const next = loadRaw().map((q) => (q.id === id ? entry : q));
  saveRaw(next);
  return { ok: true, entry };
}

/** @param {string} id */
export function removeQuestionBankEntry(id) {
  if (!id) return;
  saveRaw(loadRaw().filter((q) => q.id !== id));
}

/** @param {BankQuestion} q @returns {BankAssessmentItem} shallow clone for sessions */
export function assessmentItemFromBankQuestion(q) {
  const it = q.item;
  return JSON.parse(JSON.stringify(it));
}

/**
 * @param {string} jsonText
 * @param {{ merge?: boolean }} [opts]
 * @returns {{ ok: true; count: number } | { ok: false; errors: string[] }}
 */
export function importQuestionBankJson(jsonText, opts = {}) {
  const merge = opts.merge !== false;
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { ok: false, errors: ["Invalid JSON."] };
  }

  const incoming = Array.isArray(parsed)
    ? parsed
    : parsed && Array.isArray(parsed.questions)
      ? parsed.questions
      : null;
  if (!incoming) {
    return { ok: false, errors: ["Expected an array or { questions: [...] } ."] };
  }

  const base = merge ? loadRaw() : [];
  const seen = new Set(base.map((q) => q.id));
  const merged = merge ? [...base] : [];
  const errors = [];

  for (const row of incoming) {
    let id = row.id && String(row.id).trim() ? String(row.id).trim() : genId();
    while (seen.has(id)) id = genId();
    seen.add(id);
    const entry = {
      ...row,
      id,
      createdAt: row.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      label: String(row.label || "").trim() || "Untitled",
      wing: normalizeWing(row.wing),
      difficulty: normalizeDifficulty(row.difficulty),
      tags: normalizeTags(row.tags),
      status: row.status === "draft" ? "draft" : "published",
      notes: String(row.notes || "").trim(),
      serverQuizId:
        row.serverQuizId !== undefined && row.serverQuizId !== null && String(row.serverQuizId).trim()
          ? String(row.serverQuizId).trim()
          : null,
      item: row.item ? { ...row.item, id: `${id}_item` } : row.item
    };
    const v = validateBankQuestion(entry);
    if (!v.ok) {
      errors.push(`${entry.label}: ${v.errors.join("; ")}`);
      continue;
    }
    const idx = merged.findIndex((q) => q.id === id);
    if (idx >= 0) merged[idx] = entry;
    else merged.push(entry);
  }

  if (errors.length && !merged.length) {
    return { ok: false, errors };
  }
  saveRaw(merged);
  return { ok: true, count: merged.length, warnings: errors.length ? errors : undefined };
}

export function exportQuestionBankJson() {
  const rows = listQuestionBank();
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), questions: rows }, null, 2);
}

/** @param {BankQuestion} q */
export function validateBankQuestion(q) {
  const errors = [];
  if (!q.label || !String(q.label).trim()) errors.push("Label is required.");
  if (!q.item || typeof q.item !== "object") errors.push("Item payload is required.");
  else if (q.item.type === "multiple_choice") {
    const it = q.item;
    if (!String(it.prompt || "").trim()) errors.push("MCQ prompt is required.");
    if (!Array.isArray(it.options) || it.options.length < 2) errors.push("At least two options required.");
    const ids = new Set();
    for (const o of it.options || []) {
      if (!o.id || !String(o.text || "").trim()) errors.push("Each option needs id and text.");
      ids.add(o.id);
    }
    if (it.correctOptionId && !ids.has(it.correctOptionId)) {
      errors.push("Correct option id must match one of the options.");
    }
  } else if (q.item.type === "fill_blank") {
    const it = q.item;
    if (!String(it.prompt || "").trim()) errors.push("Fill-in prompt is required.");
    const parts = String(it.prompt).split(BLANK_PLACEHOLDER);
    if (parts.length !== 2) {
      errors.push(`Prompt must contain exactly one blank marker: ${BLANK_PLACEHOLDER}`);
    }
    if (!String(it.correctAnswer || "").trim()) errors.push("Correct answer for the blank is required.");
  } else if (q.item.type === "dropdown") {
    const it = q.item;
    if (!String(it.prompt || "").trim()) errors.push("Dropdown prompt is required.");
    if (!Array.isArray(it.options) || it.options.length < 2) errors.push("At least two dropdown options required.");
    const ids = new Set();
    for (const o of it.options || []) {
      if (!o.id || !String(o.text || "").trim()) errors.push("Each dropdown option needs id and display text.");
      const pr = Number(o.priority);
      if (Number.isNaN(pr)) {
        errors.push("Each dropdown option needs a numeric priority (sort order).");
      }
      ids.add(o.id);
    }
    if ((it.options || []).length !== ids.size) errors.push("Dropdown option ids must be unique.");
    if (!it.correctOptionId || !ids.has(it.correctOptionId)) {
      errors.push("Mark one correct dropdown option (correctOptionId).");
    }
  } else if (q.item.type === "ordering") {
    const it = q.item;
    if (!String(it.prompt || "").trim()) errors.push("Ordering prompt is required.");
    if (!Array.isArray(it.items) || it.items.length < 2) errors.push("At least two ordering lines required.");
    const ids = new Set((it.items || []).map((x) => x.id));
    if (ids.size !== (it.items || []).length) errors.push("Ordering line ids must be unique.");
    for (const row of it.items || []) {
      if (!row.id || !String(row.text || "").trim()) errors.push("Each ordering line needs id and text.");
    }
    const ord = it.correctOrder || [];
    if (ord.length !== (it.items || []).length) errors.push("Correct order length must match number of lines.");
    const ordSet = new Set(ord);
    if (ordSet.size !== ord.length) errors.push("Correct order must be a permutation (no duplicates).");
    for (const x of ord) {
      if (!ids.has(x)) errors.push("Correct order references unknown id.");
    }
  } else {
    errors.push("Item type must be multiple_choice, fill_blank, dropdown, or ordering.");
  }

  return errors.length ? { ok: false, errors } : { ok: true };
}

/** @param {unknown} w */
function normalizeWing(w) {
  const s = String(w || "general").toLowerCase();
  if (["history", "geography", "literature", "theology", "general"].includes(s)) return s;
  return "general";
}

/** @param {unknown} d */
function normalizeDifficulty(d) {
  const s = String(d || "medium").toLowerCase();
  if (["easy", "medium", "hard"].includes(s)) return s;
  return "medium";
}

/** @param {unknown} t */
function normalizeTags(t) {
  if (Array.isArray(t)) return t.map((x) => String(x).trim()).filter(Boolean);
  if (typeof t === "string") {
    return t
      .split(/[,;]/)
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
}

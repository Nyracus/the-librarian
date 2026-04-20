import { apiFetch } from "./http.js";

/**
 * Save quiz to MySQL (architect_quizzes). Server always returns { id: "aq_..." } on success.
 * @param {object} payload
 * @param {string} [payload.id] - existing row id to update (omit for new quiz)
 * @param {string} payload.title
 * @param {string} [payload.templateId]
 * @param {object[]} payload.items
 */
export async function saveArchitectQuiz(payload) {
  const data = await apiFetch("architect/quizzes.php", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  if (!data || typeof data !== "object") {
    throw new Error("Quiz save failed: server did not return JSON.");
  }

  // Accept both current and legacy response shapes.
  const idCandidate =
    data.id ??
    data.quizId ??
    data.quiz_id ??
    (data.quiz && typeof data.quiz === "object" ? data.quiz.id : undefined);
  let id = idCandidate != null ? String(idCandidate).trim() : "";

  // Some PHP hosts may prepend notices/warnings and break JSON parsing.
  // If apiFetch returned { raw: "..." }, try extracting id from raw text.
  if (!id && typeof data.raw === "string" && data.raw.trim()) {
    const raw = data.raw.trim();
    const m =
      raw.match(/"id"\s*:\s*"([^"]+)"/) ||
      raw.match(/"quizId"\s*:\s*"([^"]+)"/) ||
      raw.match(/"quiz_id"\s*:\s*"([^"]+)"/);
    if (m && m[1]) id = String(m[1]).trim();
  }
  if (!id) {
    const backendMsg =
      typeof data.error === "string" && data.error.trim()
        ? data.error.trim()
        : typeof data.message === "string" && data.message.trim()
          ? data.message.trim()
          : "";
    const rawMsg =
      typeof data.raw === "string" && data.raw.trim()
        ? data.raw.trim().slice(0, 220)
        : "";
    throw new Error(
      backendMsg ||
        (rawMsg
          ? `Quiz save failed: ${rawMsg}`
          : "Quiz save failed: server response did not include a quiz id.")
    );
  }
  return { ...data, id };
}

export async function listArchitectQuizzes() {
  return apiFetch("architect/quizzes.php", { method: "GET" });
}

export async function searchLibrarians(q) {
  const qs = q && String(q).trim() ? `?q=${encodeURIComponent(String(q).trim())}` : "";
  return apiFetch(`architect/librarians.php${qs}`, { method: "GET" });
}

export async function assignQuizToLibrarians(quizId, librarianUserIds) {
  return apiFetch("architect/assign-quiz.php", {
    method: "POST",
    body: JSON.stringify({ quizId, librarianUserIds })
  });
}

export async function listAssignedQuizzesForLibrarian() {
  return apiFetch("librarian/assigned-quizzes.php", { method: "GET" });
}

export async function listArchitectRequestsApi() {
  return apiFetch("architect/requests.php", { method: "GET" });
}

export async function createArchitectRequest(payload) {
  return apiFetch("architect/requests.php", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function searchFabricators(q) {
  const qs = q && String(q).trim() ? `?q=${encodeURIComponent(String(q).trim())}` : "";
  return apiFetch(`architect/fabricators.php${qs}`, { method: "GET" });
}

export async function assignRequestToFabricators(requestId, fabricatorUserIds) {
  return apiFetch("architect/assign-request.php", {
    method: "POST",
    body: JSON.stringify({ requestId, fabricatorUserIds })
  });
}

export async function listAssignedRequestsForFabricator() {
  return apiFetch("fabricator/assigned-requests.php", { method: "GET" });
}

export async function updateFabricatorWorkflow(payload) {
  return apiFetch("fabricator/workflow.php", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function createOrUpdateFabricatorWing(payload) {
  return apiFetch("fabricator/wings.php", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function listReviewRequestsForArchitect() {
  return apiFetch("architect/review-requests.php", { method: "GET" });
}

export async function reviewRequestByArchitect(payload) {
  return apiFetch("architect/review-request.php", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function listAssignedWingsForLibrarian() {
  return apiFetch("librarian/assigned-wings.php", { method: "GET" });
}

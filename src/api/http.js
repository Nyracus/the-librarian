import { getApiBaseUrl } from "../config/apiConfig.js";
import { getFirebaseIdToken } from "../auth/googleAuth.js";

/**
 * True when the PHP API is not running or cannot handle POST (e.g. `python -m http.server` → 501).
 * @param {unknown} err
 */
export function isLikelyMissingPhpApiError(err) {
  if (!err || typeof err !== "object") return false;
  const st = /** @type {{ status?: number }} */ (err).status;
  if (st === 501 || st === 405 || st === 0) return true;
  const msg = String(
    /** @type {{ message?: string }} */ (err).message || ""
  );
  if (/Unsupported method|Not Implemented|Failed to fetch|NetworkError|Load failed|CORS/i.test(msg)) {
    return true;
  }
  return false;
}

/**
 * @param {string} path e.g. "health.php" or "me/state.php"
 * @param {RequestInit} [init]
 */
export async function apiFetch(path, init = {}) {
  const base = getApiBaseUrl();
  const url = `${base}/${path.replace(/^\//, "")}`;
  const token = await getFirebaseIdToken();
  const headers = {
    "Content-Type": "application/json",
    ...(init.headers || {})
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  let res;
  try {
    res = await fetch(url, { ...init, headers });
  } catch (e) {
    const err = new Error(e?.message || "Network error");
    err.status = 0;
    err.cause = e;
    throw err;
  }
  const text = await res.text();
  const trimmed = text.trim();
  // SPA dev servers often return index.html with 200 for unknown paths — not valid API JSON.
  if (
    res.ok &&
    trimmed.length > 0 &&
    (trimmed.startsWith("<!") || trimmed.startsWith("<html") || trimmed.startsWith("<HTML"))
  ) {
    const err = new Error("The API returned a web page instead of JSON. Configure the host so /api/ runs PHP.");
    err.status = res.status;
    err.body = { raw: trimmed.slice(0, 400) };
    throw err;
  }
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    let msg = res.statusText || "API error";
    if (data && typeof data === "object") {
      if (data.error) msg = String(data.error);
      else if (typeof data.raw === "string" && /Unsupported method|POST/i.test(data.raw)) {
        msg = "Unsupported method (is the PHP API running?)";
      }
    }
    const err = new Error(String(msg).trim() || "API error");
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

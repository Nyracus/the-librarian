// Base URL for PHP + MySQL API (same origin by default: ./api/…).

/**
 * @returns {string} Base without trailing slash, e.g. https://example.com/app/api
 */
export function getApiBaseUrl() {
  if (typeof window !== "undefined" && window.__LIBRARIAN_API_BASE__) {
    return String(window.__LIBRARIAN_API_BASE__).replace(/\/$/, "");
  }
  try {
    const base = new URL("./api/", window.location.href);
    return base.href.replace(/\/$/, "");
  } catch {
    return "/api";
  }
}

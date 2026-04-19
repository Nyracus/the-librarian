import { apiFetch } from "./http.js";

/**
 * Binds the signed-in Firebase account to exactly one role (first request wins).
 * @param {'librarian'|'architect'|'fabricator'} role
 */
export function registerServerRole(role) {
  return apiFetch("auth/register-role.php", {
    method: "POST",
    body: JSON.stringify({ role })
  });
}

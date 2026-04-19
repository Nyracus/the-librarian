// Fabricator-only admin API (PHP `api/admin/users.php`).

import { apiFetch } from "./http.js";

/** @returns {Promise<{ ok?: boolean, users?: object[] }>} */
export async function listUsers() {
  return apiFetch("admin/users.php", { method: "GET" });
}

/**
 * @param {{ id: number, email: string | null, userRole: string | null }} payload
 */
export async function updateUser(payload) {
  return apiFetch("admin/users.php", {
    method: "POST",
    body: JSON.stringify({
      op: "update",
      id: payload.id,
      email: payload.email,
      userRole: payload.userRole
    })
  });
}

/**
 * @param {number} id
 */
export async function deleteUser(id) {
  return apiFetch("admin/users.php", {
    method: "POST",
    body: JSON.stringify({ op: "delete", id })
  });
}

// src/screens/FabricatorUsersScreen.js — Fabricator admin: CRUD MySQL users (roles + email).

import { createElement } from "../components/ui.js";
import { updateState, getState } from "../core/state.js";
import { logScreenEntry } from "../core/logger.js";
import { navigateTo } from "../core/router.js";
import { listUsers, updateUser, deleteUser } from "../api/adminUsers.js";
import { isLikelyMissingPhpApiError } from "../api/http.js";

const ROLE_OPTIONS = [
  { value: "unassigned", label: "— Unassigned —" },
  { value: "librarian", label: "Librarian" },
  { value: "architect", label: "Architect" },
  { value: "fabricator", label: "Fabricator" }
];

function roleToSelectValue(role) {
  return role || "unassigned";
}

function selectValueToRole(value) {
  if (value === "unassigned") return null;
  return value;
}

export function renderFabricatorUsersScreen(container, context, { screenId }) {
  updateState({ currentScreenId: screenId, phase: "learning" });
  const state = getState();

  logScreenEntry({
    participantId: state.participantId,
    condition: state.condition,
    phase: state.phase,
    screenId
  });

  container.innerHTML = "";
  const screenEl = createElement("section", { className: "screen fabricator-users" });

  screenEl.appendChild(
    createElement("div", { className: "screen__badge", text: "Fabricator • Admin" })
  );
  screenEl.appendChild(
    createElement("h1", { className: "screen__title", text: "Users" })
  );
  screenEl.appendChild(
    createElement("p", {
      className: "screen__subtitle",
      text: "Edit roles and emails, or remove accounts from this app database. New sign-ins create rows automatically (Firebase). You cannot delete your own account or strip your fabricator role."
    })
  );

  const feedback = createElement("p", {
    className: "screen__feedback text-muted",
    text: ""
  });
  screenEl.appendChild(feedback);

  const toolbar = createElement("div", { className: "fabricator-users__toolbar" });
  const refreshBtn = createElement("button", {
    className: "btn btn--primary",
    text: "Refresh",
    attrs: { type: "button" }
  });
  const backBtn = createElement("button", {
    className: "btn btn--ghost",
    text: "Back to fabricator home",
    attrs: { type: "button" }
  });
  backBtn.addEventListener("click", () => navigateTo("fabricator-home", { container }));
  toolbar.appendChild(refreshBtn);
  toolbar.appendChild(backBtn);
  screenEl.appendChild(toolbar);

  const tableWrap = createElement("div", { className: "fabricator-users__table-wrap" });
  const table = createElement("table", { className: "fabricator-users__table" });
  table.appendChild(
    createElement("thead", {}, [
      createElement("tr", {}, [
        createElement("th", { text: "ID" }),
        createElement("th", { text: "Email" }),
        createElement("th", { text: "Role" }),
        createElement("th", { text: "Firebase UID" }),
        createElement("th", { text: "Last seen" }),
        createElement("th", { text: "Actions" })
      ])
    ])
  );
  const tbody = createElement("tbody", { id: "fabricator-users-tbody" });
  table.appendChild(tbody);
  tableWrap.appendChild(table);
  screenEl.appendChild(tableWrap);

  container.appendChild(screenEl);

  function setFeedback(msg, kind = "muted") {
    feedback.textContent = msg || "";
    feedback.classList.remove("text-danger", "text-success", "text-muted");
    if (kind === "error") feedback.classList.add("text-danger");
    else if (kind === "success") feedback.classList.add("text-success");
    else feedback.classList.add("text-muted");
  }

  async function load() {
    tbody.innerHTML = "";
    setFeedback("Loading…");
    const myUid = getState().auth?.userId || null;
    try {
      const data = await listUsers();
      const users = Array.isArray(data?.users) ? data.users : [];
      setFeedback(`${users.length} user(s). Edits save to the server database.`);
      users.forEach((u) => {
        const id = Number(u.id);
        const isSelf = myUid && u.firebaseUid === myUid;

        const tr = document.createElement("tr");

        const tdId = document.createElement("td");
        tdId.textContent = String(id);

        const tdEmail = document.createElement("td");
        const emailInput = document.createElement("input");
        emailInput.type = "text";
        emailInput.className = "fabricator-users__input";
        emailInput.value = u.email || "";
        emailInput.disabled = false;
        tdEmail.appendChild(emailInput);

        const tdRole = document.createElement("td");
        const roleSel = document.createElement("select");
        roleSel.className = "fabricator-users__select";
        ROLE_OPTIONS.forEach((opt) => {
          const o = document.createElement("option");
          o.value = opt.value;
          o.textContent = opt.label;
          roleSel.appendChild(o);
        });
        roleSel.value = roleToSelectValue(u.userRole);
        if (isSelf) {
          roleSel.disabled = true;
          const note = document.createElement("span");
          note.className = "fabricator-users__self-note";
          note.textContent = " (you)";
          tdRole.appendChild(roleSel);
          tdRole.appendChild(note);
        } else {
          tdRole.appendChild(roleSel);
        }

        const tdUid = document.createElement("td");
        const code = document.createElement("code");
        code.className = "fabricator-users__uid";
        code.textContent = u.firebaseUid || "—";
        tdUid.appendChild(code);

        const tdSeen = document.createElement("td");
        tdSeen.className = "fabricator-users__muted";
        tdSeen.textContent = u.lastSeenAt ? String(u.lastSeenAt).replace("T", " ").slice(0, 19) : "—";

        const tdAct = document.createElement("td");
        tdAct.className = "fabricator-users__actions";

        const saveBtn = createElement("button", {
          className: "btn btn--primary",
          text: "Save",
          attrs: { type: "button" }
        });
        saveBtn.addEventListener("click", async () => {
          setFeedback("Saving…");
          try {
            const emailVal = emailInput.value.trim();
            await updateUser({
              id,
              email: emailVal === "" ? null : emailVal,
              userRole: isSelf ? "fabricator" : selectValueToRole(roleSel.value)
            });
            setFeedback(`Saved user #${id}.`, "success");
            await load();
          } catch (err) {
            setFeedback(err?.message || "Save failed", "error");
          }
        });

        const delBtn = createElement("button", {
          className: "btn btn--ghost",
          text: "Delete",
          attrs: { type: "button" }
        });
        if (isSelf) {
          delBtn.disabled = true;
          delBtn.title = "Cannot delete your own account";
        } else {
          delBtn.addEventListener("click", async () => {
            const ok = window.confirm(
              `Delete user #${id} from the database? This removes their saved game state and related rows.`
            );
            if (!ok) return;
            setFeedback("Deleting…");
            try {
              await deleteUser(id);
              setFeedback(`Deleted user #${id}.`, "success");
              await load();
            } catch (err) {
              setFeedback(err?.message || "Delete failed", "error");
            }
          });
        }

        tdAct.appendChild(saveBtn);
        tdAct.appendChild(delBtn);

        tr.appendChild(tdId);
        tr.appendChild(tdEmail);
        tr.appendChild(tdRole);
        tr.appendChild(tdUid);
        tr.appendChild(tdSeen);
        tr.appendChild(tdAct);
        tbody.appendChild(tr);
      });
    } catch (err) {
      if (isLikelyMissingPhpApiError(err)) {
        setFeedback(
          "Could not reach the PHP API. Run a server that executes PHP (not plain static hosting) and open the app from that origin.",
          "error"
        );
      } else {
        setFeedback(err?.message || "Failed to load users", "error");
      }
    }
  }

  refreshBtn.addEventListener("click", () => load());
  load();
}

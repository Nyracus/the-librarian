// Architect: assign approved fabricator narrative wings to librarians (by email).

import { createElement } from "../components/ui.js";
import { getState, updateState } from "../core/state.js";
import { logScreenEntry } from "../core/logger.js";
import { navigateTo } from "../core/router.js";
import { listFabricatorWings } from "../core/fabricatorWingStore.js";
import { assignWingToEmails } from "../core/fabricatorWingAssignmentStore.js";
import { searchLibrarians } from "../api/architectQuizzesApi.js";
import { isLikelyMissingPhpApiError } from "../api/http.js";
import { effectiveWorkflowStatus } from "../core/fabricatorWorkflowStore.js";

export function renderArchitectWingAssignScreen(container, context, { screenId }) {
  updateState({ currentScreenId: screenId, phase: "learning" });
  const state = getState();

  logScreenEntry({
    participantId: state.participantId,
    condition: state.condition,
    phase: state.phase,
    screenId
  });

  container.innerHTML = "";
  const screenEl = createElement("section", { className: "screen architect-wing-assign" });

  screenEl.appendChild(
    createElement("div", { className: "screen__badge", text: "Architect" })
  );
  screenEl.appendChild(
    createElement("h1", { className: "screen__title", text: "Assign narrative wings" })
  );
  screenEl.appendChild(
    createElement("p", {
      className: "screen__subtitle",
      text:
        "Only wings built by Fabricators and tied to an approved request are listed. Librarians see doors in Explore the library when signed in with the same email."
    })
  );

  const wingRow = createElement("div", { className: "architect-wing-assign__row" });
  const wingSelect = document.createElement("select");
  wingSelect.className = "screen__input";
  wingRow.appendChild(
    createElement("label", { className: "architect-request-label", text: "Narrative wing" })
  );
  wingRow.appendChild(wingSelect);

  const searchRow = createElement("div", { className: "architect-wing-assign__row" });
  const searchInp = document.createElement("input");
  searchInp.type = "search";
  searchInp.className = "screen__input";
  searchInp.placeholder = "Filter librarians by email…";
  searchRow.appendChild(
    createElement("label", { className: "architect-request-label", text: "Search librarians" })
  );
  searchRow.appendChild(searchInp);

  const libHost = createElement("div", { className: "architect-wing-assign__libs" });
  const statusEl = createElement("p", { className: "text-muted", text: "" });

  /** @type {Set<string>} */
  const selectedEmails = new Set();

  function eligibleWings() {
    return listFabricatorWings().filter((w) => {
      if (!w.requestId) return false;
      const st = effectiveWorkflowStatus(w.requestId);
      return st === "approved";
    });
  }

  function populateWings() {
    wingSelect.innerHTML = "";
    const rows = eligibleWings();
    const ph = document.createElement("option");
    ph.value = "";
    ph.textContent = rows.length
      ? "Select a wing…"
      : "No approved narrative wings yet";
    wingSelect.appendChild(ph);
    rows.forEach((w) => {
      const o = document.createElement("option");
      o.value = w.id;
      o.textContent = `${w.wingName} (${w.id})`;
      wingSelect.appendChild(o);
    });
  }

  function renderLibs(rows) {
    libHost.innerHTML = "";
    rows.forEach((u) => {
      const email = (u.email || "").trim().toLowerCase();
      if (!email) return;
      const row = createElement("label", { className: "architect-wing-assign__lib-row" });
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = selectedEmails.has(email);
      cb.addEventListener("change", () => {
        if (cb.checked) selectedEmails.add(email);
        else selectedEmails.delete(email);
      });
      row.appendChild(cb);
      row.appendChild(
        createElement("span", { text: `${u.email} (id ${u.id})` })
      );
      libHost.appendChild(row);
    });
  }

  async function loadLibs() {
    try {
      const data = await searchLibrarians(searchInp.value);
      const rows = Array.isArray(data?.librarians) ? data.librarians : [];
      renderLibs(rows);
    } catch (err) {
      libHost.innerHTML = "";
      statusEl.textContent = isLikelyMissingPhpApiError(err)
        ? "Could not load librarians (API)."
        : err?.message || "Failed.";
    }
  }

  searchInp.addEventListener(
    "input",
    debounce(() => {
      void loadLibs();
    }, 300)
  );

  screenEl.appendChild(wingRow);
  screenEl.appendChild(searchRow);
  screenEl.appendChild(libHost);
  screenEl.appendChild(
    createElement("button", {
      attrs: { type: "button" },
      className: "btn btn--primary",
      text: "Assign wing",
      onClick: () => {
        const wingId = wingSelect.value;
        if (!wingId) {
          statusEl.textContent = "Select a wing.";
          return;
        }
        const emails = Array.from(selectedEmails);
        if (!emails.length) {
          statusEl.textContent = "Select at least one librarian (with an email on file).";
          return;
        }
        const res = assignWingToEmails(wingId, emails);
        statusEl.textContent = res.ok
          ? `Assigned to ${res.count} email(s). They will see a door in Explore the library.`
          : res.error || "Failed.";
      }
    })
  );
  screenEl.appendChild(statusEl);
  screenEl.appendChild(
    createElement("button", {
      attrs: { type: "button" },
      className: "btn btn--ghost",
      text: "Architect home",
      onClick: () => navigateTo("architect-home", { container })
    })
  );

  populateWings();
  void loadLibs();

  container.appendChild(screenEl);
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

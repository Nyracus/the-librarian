// Fabricator: build a tileset narrative room (shelves + platform MCQs) from template.

import { createElement } from "../components/ui.js";
import { getState, updateState } from "../core/state.js";
import { logScreenEntry, logEvent } from "../core/logger.js";
import { navigateTo } from "../core/router.js";
import { addFabricatorWing } from "../core/fabricatorWingStore.js";
import { updateWorkflow } from "../core/fabricatorWorkflowStore.js";
import {
  createOrUpdateFabricatorWing,
  updateFabricatorWorkflow
} from "../api/architectQuizzesApi.js";
import { isLikelyMissingPhpApiError } from "../api/http.js";

const OPT_IDS = ["a", "b", "c", "d"];

export function renderFabricatorWingBuilderScreen(container, context, { screenId }) {
  updateState({ currentScreenId: screenId, phase: "learning" });
  const state = getState();
  const requestId = state.fabricatorWingBuilderRequestId;

  logScreenEntry({
    participantId: state.participantId,
    condition: state.condition,
    phase: state.phase,
    screenId
  });

  container.innerHTML = "";
  const screenEl = createElement("section", { className: "screen fabricator-wing-builder" });

  if (!requestId) {
    screenEl.appendChild(
      createElement("p", {
        className: "screen__body",
        text: "No request linked. Open a request from the Fabricator queue first."
      })
    );
    screenEl.appendChild(
      createElement("button", {
        attrs: { type: "button" },
        className: "btn btn--primary",
        text: "Fabricator queue",
        onClick: () => navigateTo("fabricator-queue", { container })
      })
    );
    container.appendChild(screenEl);
    return;
  }

  screenEl.appendChild(
    createElement("div", { className: "screen__badge", text: "Fabricator • Narrative room" })
  );
  screenEl.appendChild(
    createElement("h1", { className: "screen__title", text: "Tileset wing from template" })
  );
  screenEl.appendChild(
    createElement("p", {
      className: "screen__subtitle",
      text:
        "Set how many shelves and platforms to place. Shelves show your flavor text. Platforms spawn a multiple-choice question when librarians interact. Uses the existing pixel tileset (Dungeon_Tileset) in the library world."
    })
  );

  const wingNameInp = document.createElement("input");
  wingNameInp.type = "text";
  wingNameInp.className = "screen__input";
  wingNameInp.placeholder = "Wing name (e.g. History • Manuscripts)";
  wingNameInp.id = "fwb-wing-name";

  const shelfCountInp = document.createElement("input");
  shelfCountInp.type = "number";
  shelfCountInp.min = "0";
  shelfCountInp.max = "12";
  shelfCountInp.value = "3";
  shelfCountInp.className = "screen__input";

  const platCountInp = document.createElement("input");
  platCountInp.type = "number";
  platCountInp.min = "0";
  platCountInp.max = "8";
  platCountInp.value = "2";
  platCountInp.className = "screen__input";

  screenEl.appendChild(
    createElement("label", { className: "architect-request-label", attrs: { for: "fwb-wing-name" }, text: "Wing name" })
  );
  screenEl.appendChild(wingNameInp);

  screenEl.appendChild(
    createElement("label", { className: "architect-request-label", text: "Number of shelves" })
  );
  screenEl.appendChild(shelfCountInp);

  screenEl.appendChild(
    createElement("label", { className: "architect-request-label", text: "Number of quiz platforms" })
  );
  screenEl.appendChild(platCountInp);

  const shelfHost = createElement("div", { className: "fabricator-wing-builder__dynamic" });
  const platHost = createElement("div", { className: "fabricator-wing-builder__dynamic" });
  screenEl.appendChild(createElement("h2", { className: "fabricator-wing-builder__h2", text: "Shelf texts" }));
  screenEl.appendChild(shelfHost);
  screenEl.appendChild(createElement("h2", { className: "fabricator-wing-builder__h2", text: "Platform questions (multiple choice)" }));
  screenEl.appendChild(platHost);

  const statusEl = createElement("p", { className: "text-muted", text: "" });

  function renderShelfFields(n) {
    shelfHost.innerHTML = "";
    for (let i = 0; i < n; i++) {
      shelfHost.appendChild(
        createElement("label", { className: "architect-request-label", text: `Shelf ${i + 1} text` })
      );
      const ta = document.createElement("textarea");
      ta.className = "screen__textarea";
      ta.rows = 2;
      ta.dataset.shelfIndex = String(i);
      ta.placeholder = "Flavor text shown when the librarian interacts with this shelf.";
      shelfHost.appendChild(ta);
    }
  }

  function renderPlatFields(n) {
    platHost.innerHTML = "";
    for (let i = 0; i < n; i++) {
      const box = createElement("div", { className: "fabricator-wing-builder__plat" });
      box.appendChild(
        createElement("h3", { className: "fabricator-wing-builder__plat-title", text: `Platform ${i + 1}` })
      );
      const prompt = document.createElement("input");
      prompt.type = "text";
      prompt.className = "screen__input";
      prompt.placeholder = "Question prompt";
      prompt.dataset.platIndex = String(i);
      prompt.dataset.part = "prompt";
      box.appendChild(prompt);
      for (let o = 0; o < 4; o++) {
        const oInp = document.createElement("input");
        oInp.type = "text";
        oInp.className = "screen__input";
        oInp.placeholder = `Option ${o + 1}`;
        oInp.dataset.platIndex = String(i);
        oInp.dataset.part = `opt${o}`;
        box.appendChild(oInp);
      }
      const corr = document.createElement("select");
      corr.className = "screen__input";
      corr.dataset.platIndex = String(i);
      corr.dataset.part = "correct";
      [1, 2, 3, 4].forEach((k) => {
        const op = document.createElement("option");
        op.value = String(k);
        op.textContent = `Correct: option ${k}`;
        corr.appendChild(op);
      });
      box.appendChild(
        createElement("label", { className: "architect-request-label", text: "Correct answer" })
      );
      box.appendChild(corr);
      platHost.appendChild(box);
    }
  }

  function syncDynamic() {
    const ns = Math.max(0, Math.min(12, parseInt(shelfCountInp.value, 10) || 0));
    const np = Math.max(0, Math.min(8, parseInt(platCountInp.value, 10) || 0));
    renderShelfFields(ns);
    renderPlatFields(np);
  }

  shelfCountInp.addEventListener("change", syncDynamic);
  platCountInp.addEventListener("change", syncDynamic);
  syncDynamic();

  screenEl.appendChild(statusEl);

  screenEl.appendChild(
    createElement("button", {
      attrs: { type: "button" },
      className: "btn btn--primary",
      text: "Generate wing",
      onClick: async () => {
        const wingName = wingNameInp.value.trim();
        if (!wingName) {
          statusEl.textContent = "Enter a wing name.";
          return;
        }
        const ns = Math.max(0, Math.min(12, parseInt(shelfCountInp.value, 10) || 0));
        const np = Math.max(0, Math.min(8, parseInt(platCountInp.value, 10) || 0));
        /** @type {string[]} */
        const shelfTexts = [];
        shelfHost.querySelectorAll("textarea").forEach((ta, i) => {
          if (i < ns) shelfTexts.push(ta.value.trim());
        });
        while (shelfTexts.length < ns) shelfTexts.push("");
        /** @type {object[]} */
        const platformItems = [];
        for (let i = 0; i < np; i++) {
          const promptEl = platHost.querySelector(`input[data-plat-index="${i}"][data-part="prompt"]`);
          const texts = [];
          for (let o = 0; o < 4; o++) {
            const el = platHost.querySelector(`input[data-plat-index="${i}"][data-part="opt${o}"]`);
            texts.push((el && el.value.trim()) || "");
          }
          const corrEl = platHost.querySelector(`select[data-plat-index="${i}"][data-part="correct"]`);
          const corr = corrEl ? parseInt(corrEl.value, 10) : 1;
          const prompt = (promptEl && promptEl.value.trim()) || "";
          if (!prompt || texts.some((t) => !t)) {
            statusEl.textContent = `Fill prompt and all four options for platform ${i + 1}.`;
            return;
          }
          const correctOptionId = OPT_IDS[Math.max(0, Math.min(3, corr - 1))];
          platformItems.push({
            id: `plat_${i}_mcq`,
            type: "multiple_choice",
            prompt,
            options: OPT_IDS.map((id, j) => ({ id, text: texts[j] })),
            correctOptionId
          });
        }

        const wing = addFabricatorWing({
          wingName,
          requestId,
          shelfTexts,
          platformItems
        });
        try {
          const r = await createOrUpdateFabricatorWing({
            id: wing.id,
            requestId,
            wingName: wing.wingName,
            shelves: wing.shelves,
            platforms: wing.platforms
          });
          await updateFabricatorWorkflow({
            requestId,
            action: "save",
            fabricatorWingId: r?.wingId || wing.id
          });
        } catch (err) {
          statusEl.textContent = isLikelyMissingPhpApiError(err)
            ? "Wing saved locally, but server sync failed (API unavailable)."
            : err?.message || "Wing saved locally, but server sync failed.";
        }

        const summary = `Generated tileset narrative wing "${wing.wingName}" (id ${wing.id}). Shelves: ${wing.shelves.length}. Quiz platforms: ${wing.platforms.length}. Template: ${wing.templateId}.`;
        updateWorkflow(requestId, {
          fabricatorWingId: wing.id,
          handoffSummary: summary
        });

        logEvent({
          participantId: state.participantId,
          condition: state.condition,
          phase: state.phase,
          screenId,
          itemId: requestId,
          response: { type: "fabricator-wing-generated", wingId: wing.id, wingName: wing.wingName },
          correctness: null,
          responseTimeMs: null
        });

        statusEl.textContent = "Wing generated and synced. Return to request and submit for architect review.";
        updateState({ fabricatorWingBuilderRequestId: null });

        setTimeout(() => {
          updateState({ fabricatorActiveRequestId: requestId });
          navigateTo("fabricator-request-detail", { container });
        }, 600);
      }
    })
  );

  screenEl.appendChild(
    createElement("button", {
      attrs: { type: "button" },
      className: "btn btn--ghost",
      text: "Cancel",
      onClick: () => {
        updateState({ fabricatorWingBuilderRequestId: null });
        navigateTo("fabricator-request-detail", { container });
      }
    })
  );

  container.appendChild(screenEl);
}

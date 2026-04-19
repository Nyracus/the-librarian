// src/screens/GameMainMenuScreen.js — in-app main menu (Continue / New game / Load / Settings)

import { getState, updateState, resetState, replaceState } from "../core/state.js";
import { clearLogs, replaceLogs, getLogs } from "../core/logger.js";
import { navigateTo } from "../core/router.js";
import { CHAPTERS } from "../core/chapters.js";
import { getSlotPayload } from "../core/saveSlots.js";
import { playUiSfx, stopSceneLoop } from "../core/audioManager.js";
import { isNonNarrativeCondition } from "../core/nonNarrative.js";
import {
  buildNonNarrativeSessionSnapshot,
  formatMsAsMmSs
} from "../core/nonNarrativeSessionStats.js";

function formatResumeLabel(screenId) {
  const ch = CHAPTERS.find((c) => c.id === screenId);
  return ch ? ch.label : screenId;
}

export function renderGameMainMenuScreen(container, context, { screenId }) {
  updateState({ currentScreenId: screenId, phase: "setup" });

  container.innerHTML = "";
  const root = document.createElement("div");
  root.className = "game-main-menu screen";

  root.innerHTML = `
    <div class="game-main-menu__card">
      <h1 class="game-main-menu__title">The Librarian</h1>
      <p class="game-main-menu__subtitle">Use <strong>Menu</strong> in the header to move between History and Geography wings, adjust settings, and use save slots. Pre-test and post-test are opened from the side menu while you are in History.</p>
      <div class="game-main-menu__actions" id="game-main-menu-actions"></div>
      <p class="game-main-menu__hint" id="game-main-menu-resume-hint"></p>
      <div class="game-main-menu__snapshot" id="game-main-menu-nn-snapshot" hidden></div>
      <div class="game-main-menu__row">
        <label class="game-main-menu__label" for="game-main-menu-slot">Load slot</label>
        <select id="game-main-menu-slot" class="game-main-menu__select">
          <option value="1">Slot 1</option>
          <option value="2">Slot 2</option>
          <option value="3">Slot 3</option>
        </select>
        <button type="button" class="btn btn--ghost" id="game-main-menu-load">Load</button>
      </div>
      <p class="game-main-menu__status" id="game-main-menu-status"></p>
    </div>
  `;

  const actions = root.querySelector("#game-main-menu-actions");
  const resumeHint = root.querySelector("#game-main-menu-resume-hint");
  const slotSelect = root.querySelector("#game-main-menu-slot");
  const statusEl = root.querySelector("#game-main-menu-status");
  const nnSnapshotEl = root.querySelector("#game-main-menu-nn-snapshot");

  function refreshNnSnapshot() {
    if (!nnSnapshotEl) return;
    if (!isNonNarrativeCondition(getState())) {
      nnSnapshotEl.hidden = true;
      nnSnapshotEl.innerHTML = "";
      return;
    }
    const snap = buildNonNarrativeSessionSnapshot(getState(), getLogs());
    const chapter = formatResumeLabel(snap.currentScreenId || "welcome");
    const acc =
      snap.accuracyPct === null
        ? "— (no graded items yet)"
        : `${snap.accuracyPct}% (${snap.correctCount}/${snap.gradedCount})`;
    const time =
      snap.responseTimeMsTotal > 0
        ? formatMsAsMmSs(snap.responseTimeMsTotal)
        : "—";
    const weak =
      snap.weakestDomain && snap.weakestWrongCount > 0
        ? `${snap.weakestDomain} (${snap.weakestWrongCount} missed)`
        : "—";
    nnSnapshotEl.hidden = false;
    nnSnapshotEl.innerHTML = `
      <h3 class="game-main-menu__snapshot-title">Session snapshot</h3>
      <dl class="game-main-menu__snapshot-dl">
        <dt>Last screen</dt><dd>${escapeHtml(chapter)}</dd>
        <dt>Accuracy</dt><dd>${escapeHtml(acc)}</dd>
        <dt>Logged response time</dt><dd>${escapeHtml(time)}</dd>
        <dt>Most misses (domain)</dt><dd>${escapeHtml(weak)}</dd>
      </dl>
      <p class="game-main-menu__snapshot-note">Based on this browser’s event log. Export from the side menu when enabled.</p>
    `;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text || "";
  }

  function refreshResume(state) {
    const sid = state.currentScreenId;
    const canResume = sid && sid !== "game-menu" && sid !== "welcome";
    resumeHint.textContent = canResume
      ? `Last screen: ${formatResumeLabel(sid)}. Press Continue, or use Menu to jump wings.`
      : "No saved position yet — use New game or Load a slot.";
  }

  function wireActions() {
    actions.innerHTML = "";

    const continueBtn = document.createElement("button");
    continueBtn.type = "button";
    continueBtn.className = "btn btn--primary";
    continueBtn.textContent = "Continue";
    const st = getState();
    const sid = st.currentScreenId;
    const canResume = sid && sid !== "game-menu" && sid !== "welcome";
    continueBtn.disabled = !canResume;
    continueBtn.addEventListener("click", () => {
      const s = getState();
      const id = s.currentScreenId;
      if (!id || id === "game-menu") return;
      playUiSfx("click");
      navigateTo(id, { container: document.getElementById("app-root") });
    });

    const newBtn = document.createElement("button");
    newBtn.type = "button";
    newBtn.className = "btn btn--ghost";
    newBtn.textContent = "New game";
    newBtn.addEventListener("click", () => {
      const ok = window.confirm(
        "Start a new game? Progress and local logs reset; you stay signed in if you were."
      );
      if (!ok) return;
      stopSceneLoop();
      clearLogs();
      resetState();
      updateState({
        currentScreenId: "welcome",
        pendingChapterRoute: "history-1"
      });
      playUiSfx("click");
      window.location.hash = "#welcome";
    });

    const settingsBtn = document.createElement("button");
    settingsBtn.type = "button";
    settingsBtn.className = "btn btn--ghost";
    settingsBtn.textContent = "Settings (side menu)";
    settingsBtn.addEventListener("click", () => {
      playUiSfx("click");
      const menuBtn = document.getElementById("menu-open-btn");
      if (menuBtn) menuBtn.click();
    });

    actions.appendChild(continueBtn);
    actions.appendChild(newBtn);
    actions.appendChild(settingsBtn);
  }

  refreshResume(getState());
  wireActions();
  refreshNnSnapshot();

  root.querySelector("#game-main-menu-load").addEventListener("click", () => {
    const slot = slotSelect.value || "1";
    const payload = getSlotPayload(slot);
    if (!payload) {
      setStatus(`Slot ${slot} is empty.`);
      playUiSfx("error");
      return;
    }
    replaceState(payload.state || {});
    replaceLogs(payload.logs || []);
    setStatus(`Loaded slot ${slot}.`);
    playUiSfx("success");
    const nextScreen = (payload.state && payload.state.currentScreenId) || "game-menu";
    window.location.hash = `#${nextScreen}`;
  });

  slotSelect.addEventListener("change", () => {
    const slot = slotSelect.value || "1";
    const payload = getSlotPayload(slot);
    setStatus(
      payload
        ? `Slot ${slot}: saved — ready to load.`
        : `Slot ${slot} is empty.`
    );
  });

  const initialSlot = slotSelect.value || "1";
  const initialPayload = getSlotPayload(initialSlot);
  setStatus(
    initialPayload
      ? `Slot ${initialSlot}: saved — ready to load.`
      : `Slot ${initialSlot} is empty.`
  );

  container.appendChild(root);
}

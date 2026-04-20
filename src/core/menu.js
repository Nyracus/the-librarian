// src/core/menu.js

import { getState, updateState, resetState, replaceState } from "./state.js";
import { clearLogs, getLogs, replaceLogs } from "./logger.js";
import { navigateTo } from "./router.js";
import { createElement } from "../components/ui.js";
import {
  isAudioMuted,
  setAudioMuted,
  playUiSfx,
  stopSceneLoop
} from "./audioManager.js";
import { signOutGoogle } from "../auth/googleAuth.js";
import { CHAPTERS } from "./chapters.js";
import { ROLE, chapterIdsForRole } from "./roles.js";
import { getSlotPayload, getSlotStorageKey, setSlotPayload } from "./saveSlots.js";
import {
  listWingIdsForLibrarianEmail,
  refreshAssignedWingsFromApi
} from "./fabricatorWingAssignmentStore.js";
import { getFabricatorWing } from "./fabricatorWingStore.js";

export { CHAPTERS };
const MAX_PREVIEW_ROWS = 8;
const RESEARCHER_MODE_KEY = "librarian_researcher_mode_v1";

export function initGameMenu() {
  const root = document.getElementById("menu-root");
  const openBtn = document.getElementById("menu-open-btn");
  if (!root || !openBtn) return;

  root.innerHTML = "";

  const backdrop = document.createElement("div");
  backdrop.className = "game-menu-backdrop";

  const panel = document.createElement("aside");
  panel.className = "game-menu-panel";

  panel.appendChild(createTitleRow(closeMenu));
  panel.appendChild(createSectionQuickStart(closeMenu));
  panel.appendChild(createSectionSettings());
  panel.appendChild(createSectionControls());
  panel.appendChild(createSectionCondition());
  panel.appendChild(createSectionDisplay());
  panel.appendChild(createSectionChapter());
  panel.appendChild(createSectionSaveSlots(closeMenu));
  panel.appendChild(createSectionAccount());
  panel.appendChild(createSectionProfile());
  if (isResearcherModeEnabled()) {
    panel.appendChild(createSectionResearchData());
  }
  panel.appendChild(createSectionSession(closeMenu));

  root.appendChild(backdrop);
  root.appendChild(panel);

  function openMenu() {
    root.classList.add("is-open");
    refreshMenuState(panel);
    playUiSfx("click");
  }

  function closeMenu() {
    root.classList.remove("is-open");
  }

  openBtn.addEventListener("click", openMenu);
  backdrop.addEventListener("click", closeMenu);
  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (root.classList.contains("is-open")) closeMenu();
    else openMenu();
  });
}

function createTitleRow(onClose) {
  const row = document.createElement("div");
  row.className = "game-menu-title-row";

  const title = document.createElement("h2");
  title.className = "game-menu-title";
  title.textContent = "Game Menu";

  const closeBtn = createButton("Close", "btn btn--ghost");
  closeBtn.addEventListener("click", onClose);

  row.appendChild(title);
  row.appendChild(closeBtn);
  return row;
}

function createSectionQuickStart(onClose) {
  const section = createSection("Quick start");

  const hint = document.createElement("p");
  hint.className = "menu-meta";
  hint.textContent = "Same as Welcome: jump to the Library Hub.";

  const beginBtn = createButton("Begin", "btn btn--primary");
  beginBtn.addEventListener("click", () => {
    const appRoot = document.getElementById("app-root");
    if (!appRoot) return;
    navigateTo("hub", { container: appRoot });
    playUiSfx("click");
    onClose();
  });

  section.appendChild(hint);
  section.appendChild(beginBtn);
  return section;
}

function populateMenuChapterSelect(select) {
  const state = getState();
  const role = state.userRole ?? ROLE.LIBRARIAN;
  const ids = chapterIdsForRole(role);
  select.innerHTML = "";
  ids.forEach((id) => {
    const chapter = CHAPTERS.find((c) => c.id === id);
    if (!chapter) return;
    const opt = document.createElement("option");
    opt.value = chapter.id;
    opt.textContent = chapter.label;
    opt.dataset.requiresGeography = chapter.requiresGeography ? "1" : "";
    select.appendChild(opt);
  });
  if (role === ROLE.LIBRARIAN) {
    const email = state.auth?.email || "";
    const wingIds = listWingIdsForLibrarianEmail(email);
    wingIds.forEach((wid) => {
      const wing = getFabricatorWing(wid);
      if (!wing) return;
      const opt = document.createElement("option");
      opt.value = `wing:${wid}`;
      opt.textContent = `Narrative wing: ${wing.wingName}`;
      opt.dataset.dynamicWing = "1";
      select.appendChild(opt);
    });
  }
}

function createSectionSettings() {
  const section = createSection("Settings");

  const muteLabel = document.createElement("label");
  muteLabel.className = "menu-inline";
  muteLabel.textContent = "Audio";

  const muteToggle = document.createElement("input");
  muteToggle.type = "checkbox";
  muteToggle.checked = !isAudioMuted();
  muteToggle.id = "menu-audio-toggle";
  muteToggle.addEventListener("change", () => {
    setAudioMuted(!muteToggle.checked);
    playUiSfx("click");
  });

  muteLabel.appendChild(muteToggle);
  section.appendChild(muteLabel);
  return section;
}

function createSectionControls() {
  const section = createSection("Controls");

  const deviceLabel = document.createElement("label");
  deviceLabel.className = "menu-meta";
  deviceLabel.textContent = "Device";
  const deviceSelect = document.createElement("select");
  deviceSelect.id = "menu-device-select";
  [
    { id: "pc", label: "PC / Laptop" },
    { id: "mobile-tablet", label: "Mobile / Tablet" }
  ].forEach((optData) => {
    const opt = document.createElement("option");
    opt.value = optData.id;
    opt.textContent = optData.label;
    deviceSelect.appendChild(opt);
  });

  const schemeLabel = document.createElement("label");
  schemeLabel.className = "menu-meta";
  schemeLabel.textContent = "Control Scheme";
  const schemeSelect = document.createElement("select");
  schemeSelect.id = "menu-control-scheme-select";
  [
    { id: "auto", label: "Auto" },
    { id: "keyboard", label: "Keyboard" },
    { id: "touch", label: "Touch joystick/buttons" }
  ].forEach((optData) => {
    const opt = document.createElement("option");
    opt.value = optData.id;
    opt.textContent = optData.label;
    schemeSelect.appendChild(opt);
  });

  const applyBtn = createButton("Apply Controls", "btn btn--primary");
  applyBtn.addEventListener("click", () => {
    const current = getState();
    updateState({
      config: {
        ...(current.config || {}),
        playerDevice: deviceSelect.value,
        controlScheme: schemeSelect.value
      }
    });
    playUiSfx("click");
    window.alert("Controls updated.");
  });

  section.appendChild(deviceLabel);
  section.appendChild(deviceSelect);
  section.appendChild(schemeLabel);
  section.appendChild(schemeSelect);
  section.appendChild(
    createElement("p", {
      className: "menu-meta",
      text: "Touch controls appear in gameplay screens. Pause with P, touch Pause, or menu."
    })
  );
  section.appendChild(applyBtn);
  return section;
}

function createSectionCondition() {
  const section = createSection("Experience Mode");

  const description = document.createElement("p");
  description.className = "menu-meta";
  description.textContent =
    "Choose narrative or non-narrative. Mid-wing changes are locked for consistency.";

  const select = document.createElement("select");
  select.id = "menu-condition-select";
  [
    { id: "narrative", label: "Narrative" },
    { id: "non-narrative", label: "Non-narrative" }
  ].forEach((optData) => {
    const opt = document.createElement("option");
    opt.value = optData.id;
    opt.textContent = optData.label;
    select.appendChild(opt);
  });

  const applyBtn = createButton("Apply & Restart Wing", "btn btn--primary");
  applyBtn.id = "menu-condition-apply";
  applyBtn.addEventListener("click", () => {
    const state = getState();
    if (!isConditionChangeAllowed(state.currentScreenId)) {
      window.alert(
        "Condition is locked during active wing play. Move to a chapter boundary (Hub, Pre-test, Post-test, or Delayed test) first."
      );
      return;
    }

    const nextCondition = select.value;
    if (!nextCondition || nextCondition === state.condition) return;

    updateState({
      condition: nextCondition,
      progress: {
        ...(state.progress || {}),
        wingHistory01Step: 0
      }
    });

    playUiSfx("click");
    window.alert(
      "Condition updated. History Wing progress reset. Start from wing beginning."
    );
    window.location.hash = "#history-1-pre";
  });

  const lockNote = document.createElement("p");
  lockNote.className = "menu-meta";
  lockNote.id = "menu-condition-lock-note";
  lockNote.textContent = "";

  section.appendChild(description);
  section.appendChild(select);
  section.appendChild(applyBtn);
  section.appendChild(lockNote);
  return section;
}

function createSectionDisplay() {
  const section = createSection("Display");
  const fullscreenBtn = createButton("Fullscreen (Landscape)", "btn btn--ghost");
  fullscreenBtn.addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        if (window.screen?.orientation?.lock) {
          try {
            await window.screen.orientation.lock("landscape");
          } catch {
            // Some browsers/devices block orientation lock.
          }
        }
      } else {
        if (window.screen?.orientation?.unlock) {
          try {
            window.screen.orientation.unlock();
          } catch {
            // No-op.
          }
        }
        await document.exitFullscreen();
      }
      playUiSfx("click");
    } catch (err) {
      console.warn("Fullscreen not available", err);
    }
  });
  section.appendChild(fullscreenBtn);
  return section;
}

function createSectionChapter() {
  const section = createSection("Jump to wing");

  const hint = document.createElement("p");
  hint.className = "menu-meta";
  hint.textContent =
    "History and Geography only. Inside History, use the wing sidebar for pre-test, learning, and post-tests.";

  const select = document.createElement("select");
  select.id = "menu-chapter-select";

  populateMenuChapterSelect(select);

  const goBtn = createButton("Go", "btn btn--primary");
  goBtn.addEventListener("click", () => {
    const route = select.value;
    if (!route) return;
    if (route.startsWith("wing:")) {
      const wingId = route.slice("wing:".length);
      updateState({
        world: {
          ...getState().world,
          room: "fabricator_wing",
          fabricatorWingActiveId: wingId
        }
      });
      playUiSfx("click");
      window.location.hash = "#library-world";
      return;
    }
    const opt = select.querySelector(`option[value="${route}"]`);
    if (opt && opt.disabled) {
      window.alert(
        "Complete the History learning wing first to unlock Geography."
      );
      playUiSfx("error");
      return;
    }
    playUiSfx("click");
    window.location.hash = `#${route}`;
  });

  section.appendChild(hint);
  section.appendChild(select);
  section.appendChild(goBtn);
  return section;
}

function createSectionSaveSlots(onClose) {
  const section = createSection("Save Slots");

  const slotSelect = document.createElement("select");
  slotSelect.id = "menu-save-slot-select";
  [1, 2, 3].forEach((slot) => {
    const opt = document.createElement("option");
    opt.value = String(slot);
    opt.textContent = `Slot ${slot}`;
    slotSelect.appendChild(opt);
  });

  const status = document.createElement("p");
  status.id = "menu-save-slot-status";
  status.className = "menu-meta";
  status.textContent = "Select a slot to save or load.";

  const saveBtn = createButton("Save to Slot", "btn btn--primary");
  saveBtn.addEventListener("click", () => {
    const slot = slotSelect.value;
    const payload = {
      version: 1,
      savedAt: new Date().toISOString(),
      state: getState(),
      logs: getLogs()
    };
    setSlotPayload(slot, payload);
    status.textContent = `Saved to Slot ${slot} at ${formatTimestamp(payload.savedAt)}.`;
    playUiSfx("success");
  });

  const loadBtn = createButton("Load Slot", "btn btn--ghost");
  loadBtn.addEventListener("click", () => {
    const slot = slotSelect.value;
    const payload = getSlotPayload(slot);
    if (!payload) {
      status.textContent = `Slot ${slot} is empty.`;
      playUiSfx("error");
      return;
    }
    replaceState(payload.state || {});
    replaceLogs(payload.logs || []);
    status.textContent = `Loaded Slot ${slot} from ${formatTimestamp(payload.savedAt)}.`;
    playUiSfx("success");
    onClose();
    const nextScreen = (payload.state && payload.state.currentScreenId) || "game-menu";
    window.location.hash = `#${nextScreen}`;
  });

  const clearBtn = createButton("Clear Slot", "btn btn--ghost");
  clearBtn.addEventListener("click", () => {
    const slot = slotSelect.value;
    const ok = window.confirm(`Clear Slot ${slot}?`);
    if (!ok) return;
    window.localStorage.removeItem(getSlotStorageKey(slot));
    status.textContent = `Cleared Slot ${slot}.`;
    playUiSfx("click");
  });

  section.appendChild(slotSelect);
  section.appendChild(saveBtn);
  section.appendChild(loadBtn);
  section.appendChild(clearBtn);
  section.appendChild(status);
  return section;
}

function createSectionAccount() {
  const section = createSection("Account");

  const status = document.createElement("p");
  status.id = "menu-auth-meta";
  status.className = "menu-meta";
  status.textContent = "Not signed in.";

  const popupHint = document.createElement("p");
  popupHint.className = "menu-meta";
  popupHint.textContent =
    "Sign in opens the role picker (Librarian, Architect, Fabricator). Allow pop-ups for Google on the next screen if you use it.";

  const loginBtn = createButton("Sign in", "btn btn--primary");
  loginBtn.id = "menu-google-login-btn";

  const registerBtn = createButton("Register", "btn btn--ghost");
  registerBtn.id = "menu-google-register-btn";

  const signOutBtn = createButton("Sign out", "btn btn--ghost");
  signOutBtn.id = "menu-google-signout-btn";

  async function runSignOut() {
    status.textContent = "Signing out...";
    loginBtn.disabled = true;
    registerBtn.disabled = true;
    signOutBtn.disabled = true;

    try {
      await signOutGoogle();
      updateState({ userRole: null });
      window.location.hash = "#login";
      playUiSfx("success");
    } catch (err) {
      console.warn("Sign out failed", err);
      status.textContent = "Sign out failed. Try again.";
      playUiSfx("error");
    } finally {
      loginBtn.disabled = false;
      registerBtn.disabled = false;
      signOutBtn.disabled = false;
    }
  }

  loginBtn.addEventListener("click", () => {
    window.location.hash = "#login";
    playUiSfx("click");
    status.textContent = "Choose your role, then sign in.";
  });
  registerBtn.addEventListener("click", () => {
    window.location.hash = "#login";
    playUiSfx("click");
    status.textContent = "Choose your role, then register.";
  });
  signOutBtn.addEventListener("click", () => runSignOut());

  section.appendChild(status);
  section.appendChild(popupHint);
  section.appendChild(loginBtn);
  section.appendChild(registerBtn);
  section.appendChild(signOutBtn);
  return section;
}

function createSectionProfile() {
  const section = createSection("Profile");
  const p = document.createElement("p");
  p.className = "menu-meta";
  p.id = "menu-profile-meta";
  p.textContent = "Account: - | Condition: -";
  section.appendChild(p);
  return section;
}

function createSectionResearchData() {
  const section = createSection("Research Data");

  const summary = document.createElement("p");
  summary.className = "menu-meta";
  summary.id = "menu-results-summary";
  summary.textContent = "No data summary yet.";

  const preview = document.createElement("textarea");
  preview.id = "menu-results-preview";
  preview.className = "menu-results-preview";
  preview.readOnly = true;
  preview.rows = MAX_PREVIEW_ROWS;
  preview.value = "";

  const refreshBtn = createButton("Refresh Preview", "btn btn--ghost");
  refreshBtn.addEventListener("click", () => {
    const logs = getLogs();
    summary.textContent = buildSummaryLine(logs);
    preview.value = JSON.stringify(logs.slice(-20), null, 2);
    playUiSfx("click");
  });

  const copyBtn = createButton("Copy JSON", "btn btn--ghost");
  copyBtn.addEventListener("click", async () => {
    const logs = getLogs();
    const json = JSON.stringify(logs, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      playUiSfx("success");
      window.alert("Results JSON copied to clipboard.");
    } catch {
      playUiSfx("error");
      window.alert("Clipboard unavailable. Use Download JSON instead.");
    }
  });

  const jsonBtn = createButton("Download JSON", "btn btn--primary");
  jsonBtn.addEventListener("click", () => {
    const logs = getLogs();
    downloadTextFile(
      `librarian_results_${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
      JSON.stringify(logs, null, 2),
      "application/json"
    );
    playUiSfx("success");
  });

  const csvBtn = createButton("Download CSV", "btn btn--primary");
  csvBtn.addEventListener("click", () => {
    const logs = getLogs();
    downloadTextFile(
      `librarian_results_${new Date().toISOString().replace(/[:.]/g, "-")}.csv`,
      logsToCsv(logs),
      "text/csv;charset=utf-8"
    );
    playUiSfx("success");
  });

  section.appendChild(summary);
  section.appendChild(preview);
  section.appendChild(refreshBtn);
  section.appendChild(copyBtn);
  section.appendChild(jsonBtn);
  section.appendChild(csvBtn);
  return section;
}

function createSectionSession(onClose) {
  const section = createSection("Session");

  const newGameBtn = createButton("Start New Game", "btn btn--primary");
  newGameBtn.addEventListener("click", () => {
    const ok = window.confirm(
      "Start a new game? This will reset progress and clear local logs."
    );
    if (!ok) return;

    stopSceneLoop();
    clearLogs();
    resetState();
    updateState({ currentScreenId: "game-menu" });
    playUiSfx("click");
    onClose();
    window.location.hash = "#game-menu";
  });

  const quickResetBtn = createButton("Reset Wing Progress", "btn btn--ghost");
  quickResetBtn.addEventListener("click", () => {
    const current = getState();
    updateState({
      progress: {
        ...(current.progress || {}),
        wingHistory01Step: 0
      }
    });
    playUiSfx("click");
    window.alert("Wing progress reset.");
  });

  section.appendChild(newGameBtn);
  section.appendChild(quickResetBtn);
  return section;
}

function refreshMenuState(panel) {
  const state = getState();
  const profile = panel.querySelector("#menu-profile-meta");
  if (profile) {
    const pid = state.auth?.email || "anonymous";
    const condition = state.condition || "-";
    profile.textContent = `Account: ${pid} | Condition: ${condition}`;
  }

  const deviceSelect = panel.querySelector("#menu-device-select");
  const schemeSelect = panel.querySelector("#menu-control-scheme-select");
  if (deviceSelect) {
    deviceSelect.value = state.config?.playerDevice || "pc";
  }
  if (schemeSelect) {
    schemeSelect.value = state.config?.controlScheme || "auto";
  }

  const authMeta = panel.querySelector("#menu-auth-meta");
  const loginBtn = panel.querySelector("#menu-google-login-btn");
  const registerBtn = panel.querySelector("#menu-google-register-btn");
  const signOutBtn = panel.querySelector("#menu-google-signout-btn");
  if (authMeta) {
    const authed = state.auth?.status === "authenticated";
    const email = state.auth?.email;
    authMeta.textContent = authed
      ? `Signed in${email ? ` as ${email}` : ""}.`
      : "Not signed in.";
    if (loginBtn) loginBtn.disabled = authed;
    if (registerBtn) registerBtn.disabled = authed;
    if (signOutBtn) signOutBtn.disabled = !authed;
  }

  const chapterSelect = panel.querySelector("#menu-chapter-select");
  if (chapterSelect) {
    if ((state.userRole ?? ROLE.LIBRARIAN) === ROLE.LIBRARIAN) {
      void refreshAssignedWingsFromApi()
        .then(() => {
          populateMenuChapterSelect(chapterSelect);
        })
        .catch(() => {});
    }
    populateMenuChapterSelect(chapterSelect);
    const role = state.userRole ?? ROLE.LIBRARIAN;
    if (role === ROLE.LIBRARIAN) {
      const geoUnlocked = Boolean(state.world?.geographyUnlocked);
      const geoChapter = CHAPTERS.find((c) => c.id === "geography-game");
      chapterSelect.querySelectorAll("option").forEach((opt) => {
        if (opt.dataset.requiresGeography === "1" && geoChapter) {
          opt.disabled = !geoUnlocked;
          opt.textContent = geoUnlocked
            ? geoChapter.label
            : `${geoChapter.label} — locked`;
        }
      });
    }
    if (state.currentScreenId) {
      const cur = chapterSelect.querySelector(
        `option[value="${state.currentScreenId}"]`
      );
      if (cur && !cur.disabled) {
        chapterSelect.value = state.currentScreenId;
      }
    }
  }

  const audioToggle = panel.querySelector("#menu-audio-toggle");
  if (audioToggle) {
    audioToggle.checked = !isAudioMuted();
  }

  const conditionSelect = panel.querySelector("#menu-condition-select");
  const conditionApply = panel.querySelector("#menu-condition-apply");
  const conditionLockNote = panel.querySelector("#menu-condition-lock-note");
  if (conditionSelect) {
    conditionSelect.value = state.condition || "narrative";
  }
  if (conditionApply && conditionLockNote) {
    const allowed = isConditionChangeAllowed(state.currentScreenId);
    conditionApply.disabled = !allowed;
    conditionLockNote.textContent = allowed
      ? "Condition can be changed here."
      : "Condition locked while actively inside a wing chapter.";
  }

  const slotSelect = panel.querySelector("#menu-save-slot-select");
  const slotStatus = panel.querySelector("#menu-save-slot-status");
  if (slotSelect && slotStatus) {
    const payload = getSlotPayload(slotSelect.value || "1");
    slotStatus.textContent = payload
      ? `Slot ${slotSelect.value}: saved ${formatTimestamp(payload.savedAt)}`
      : `Slot ${slotSelect.value} is empty.`;
    slotSelect.onchange = () => {
      const p = getSlotPayload(slotSelect.value || "1");
      slotStatus.textContent = p
        ? `Slot ${slotSelect.value}: saved ${formatTimestamp(p.savedAt)}`
        : `Slot ${slotSelect.value} is empty.`;
    };
  }

  if (isResearcherModeEnabled()) {
    const summary = panel.querySelector("#menu-results-summary");
    const preview = panel.querySelector("#menu-results-preview");
    if (summary && preview) {
      const logs = getLogs();
      summary.textContent = buildSummaryLine(logs);
      preview.value = JSON.stringify(logs.slice(-20), null, 2);
    }
  }
}

function createSection(title) {
  const section = document.createElement("section");
  section.className = "game-menu-section";
  const h = document.createElement("h3");
  h.className = "game-menu-section-title";
  h.textContent = title;
  section.appendChild(h);
  return section;
}

function createButton(text, className) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = className;
  btn.textContent = text;
  return btn;
}

function isConditionChangeAllowed(screenId) {
  // Locked during active learning scene.
  // Allowed at chapter boundaries and setup screens.
  return screenId !== "history-1";
}

function formatTimestamp(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

function buildSummaryLine(logs) {
  if (!logs.length) return "No logs yet.";
  const total = logs.length;
  const puzzleSubmits = logs.filter((l) => l.response?.type === "puzzle-submit").length;
  const assessmentSubmits = logs.filter((l) => l.response?.type === "assessment-submit").length;
  const correct = logs.filter((l) => l.correctness === true).length;
  return `Events: ${total} | Puzzle submits: ${puzzleSubmits} | Assessment submits: ${assessmentSubmits} | Correct: ${correct}`;
}

function logsToCsv(logs) {
  const headers = [
    "id",
    "participantId",
    "authUserId",
    "authUserEmail",
    "condition",
    "phase",
    "screenId",
    "itemId",
    "response",
    "correctness",
    "responseTimeMs",
    "timestamp",
    "synced"
  ];
  const rows = logs.map((log) => [
    log.id,
    log.participantId,
    log.authUserId ?? "",
    log.authUserEmail ?? "",
    log.condition,
    log.phase,
    log.screenId,
    log.itemId,
    JSON.stringify(log.response ?? null),
    log.correctness,
    log.responseTimeMs,
    log.timestamp,
    log.synced
  ]);
  return [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
}

function csvEscape(value) {
  const v = value === undefined || value === null ? "" : String(value);
  if (v.includes(",") || v.includes('"') || v.includes("\n")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

function downloadTextFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function isResearcherModeEnabled() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("researcher") === "1") {
    window.localStorage.setItem(RESEARCHER_MODE_KEY, "1");
  }
  return window.localStorage.getItem(RESEARCHER_MODE_KEY) === "1";
}


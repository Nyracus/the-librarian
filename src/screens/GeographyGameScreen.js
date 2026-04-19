// src/screens/GeographyGameScreen.js — narrative vs non-narrative geography wing (same puzzle logic)

import { getState, updateState } from "../core/state.js";
import { logScreenEntry } from "../core/logger.js";
import { setInputPaused, clearVirtualControls } from "../engine/input.js";
import {
  mountTouchControls,
  shouldUseTouchControls
} from "../engine/touchControls.js";
import { runHubScene } from "../scenes/HubScene.js";
import { runGeographyWingScene } from "../scenes/GeographyWingScene.js";
import { mountPortion1PuzzleScene } from "../scenes/Portion1PuzzleScene.js";
import { mountPortion2PuzzleScene } from "../scenes/Portion2PuzzleScene.js";

let geographyCleanup = null;

export function cleanupGeographySession() {
  if (typeof geographyCleanup === "function") {
    geographyCleanup();
    geographyCleanup = null;
  }
}

export function renderGeographyGameScreen(container, context, { screenId }) {
  updateState({ currentScreenId: screenId, phase: "learning" });
  const state = getState();
  const narrative = state.condition !== "non-narrative";

  logScreenEntry({
    participantId: state.participantId,
    condition: state.condition,
    phase: state.phase,
    screenId
  });

  container.innerHTML = "";
  const outer = document.createElement("div");
  outer.className = "geography-game-root";

  if (getState().world?.geographyReturnRoute === "library-world") {
    const exitRow = document.createElement("div");
    exitRow.className = "geography-exit-row";
    const exitBtn = document.createElement("button");
    exitBtn.type = "button";
    exitBtn.className = "btn btn--ghost";
    exitBtn.textContent = "Exit to library";
    exitBtn.addEventListener("click", () => {
      updateState({ world: { geographyReturnRoute: null } });
      window.location.hash = "#library-world";
    });
    exitRow.appendChild(exitBtn);
    outer.appendChild(exitRow);
  }

  const root = document.createElement("div");
  root.className = "geography-game-inner";
  outer.appendChild(root);

  let paused = false;
  let lastPauseToggleAt = 0;
  const pauseOverlay = document.createElement("div");
  pauseOverlay.className = "game-pause-overlay";
  pauseOverlay.hidden = true;
  pauseOverlay.innerHTML = `
    <div class="game-pause-card">
      <h2>Paused</h2>
      <p>Gameplay is paused.</p>
      <button type="button" class="btn btn--primary" data-action="resume">Resume</button>
      <button type="button" class="btn btn--ghost" data-action="menu">Open Settings Menu</button>
      <button type="button" class="btn btn--ghost" data-action="exit">Exit to Hub</button>
    </div>
  `;
  outer.appendChild(pauseOverlay);

  function togglePause(next) {
    paused = typeof next === "boolean" ? next : !paused;
    setInputPaused(paused);
    pauseOverlay.hidden = !paused;
  }

  pauseOverlay.addEventListener("click", (e) => {
    const action = e.target?.dataset?.action;
    if (!action) return;
    if (action === "resume") {
      togglePause(false);
      return;
    }
    if (action === "menu") {
      togglePause(false);
      const menuBtn = document.getElementById("menu-open-btn");
      if (menuBtn) menuBtn.click();
      return;
    }
    if (action === "exit") {
      togglePause(false);
      window.location.hash = "#hub";
    }
  });

  const keyPauseHandler = (e) => {
    if (e.code !== "KeyP") return;
    if (e.repeat) return;
    e.preventDefault();
    if (Date.now() - lastPauseToggleAt < 250) return;
    lastPauseToggleAt = Date.now();
    togglePause();
  };
  window.addEventListener("keydown", keyPauseHandler);

  const usingTouch = shouldUseTouchControls(state);
  const unmountTouch = usingTouch
    ? mountTouchControls(outer, {
        onPause: () => togglePause()
      })
    : null;

  container.appendChild(outer);

  let stopHub = null;
  let stopWing = null;
  let puzzleMount = null;
  /** When set, puzzle modal lives on document.body (avoids stacking/clip issues inside game layout). */
  let puzzleOverlayHost = null;

  function clearRoot() {
    root.innerHTML = "";
  }

  function disposePuzzleLayer() {
    if (puzzleMount && typeof puzzleMount.destroy === "function") {
      puzzleMount.destroy();
    }
    puzzleMount = null;
    if (puzzleOverlayHost && puzzleOverlayHost.parentNode) {
      puzzleOverlayHost.remove();
    }
    puzzleOverlayHost = null;
    setInputPaused(false);
  }

  function stopLoops() {
    if (typeof stopHub === "function") stopHub();
    if (typeof stopWing === "function") stopWing();
    stopHub = null;
    stopWing = null;
  }

  function tearDown() {
    stopLoops();
    window.removeEventListener("keydown", keyPauseHandler);
    clearVirtualControls();
    if (typeof unmountTouch === "function") unmountTouch();
    disposePuzzleLayer();
  }

  geographyCleanup = tearDown;

  function openPuzzleOverlay() {
    const latest = getState();
    const nextPuzzle = latest.world?.geographyPuzzle1Complete ? 2 : 1;
    openPuzzleOverlayFor(nextPuzzle);
  }

  function openPuzzleOverlayFor(puzzleNo) {
    const latest = getState();
    if (puzzleNo === 2 && !latest.world?.geographyPuzzle1Complete) {
      puzzleNo = 1;
    }
    if (puzzleMount) return;
    const overlay = document.createElement("div");
    overlay.className = "puzzle-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "River chart puzzle");
    document.body.appendChild(overlay);
    puzzleOverlayHost = overlay;
    setInputPaused(true);
    try {
      if (puzzleNo === 2) {
        puzzleMount = mountPortion2PuzzleScene(overlay, {
          mode: narrative ? "narrative" : "non-narrative",
          screenId: "geography-puzzle-p2",
          onSolved: () => {
            updateState({
              world: { geographyPuzzle1Complete: true, geographyPuzzle2Complete: true }
            });
          },
          onClose: () => disposePuzzleLayer()
        });
      } else {
        puzzleMount = mountPortion1PuzzleScene(overlay, {
          mode: narrative ? "narrative" : "non-narrative",
          screenId: "geography-puzzle-p1",
          onSolved: () => {
            updateState({ world: { geographyPuzzle1Complete: true } });
          },
          onClose: () => disposePuzzleLayer()
        });
      }
    } catch (err) {
      console.error("openPuzzleOverlayFor failed", err);
      disposePuzzleLayer();
    }
  }

  function startHub() {
    stopLoops();
    clearRoot();
    stopHub = runHubScene(root, {
      onEnterGeography: () => {
        startWing();
      },
      onOpenPuzzle1: () => openPuzzleOverlayFor(1),
      onOpenPuzzle2: () => openPuzzleOverlayFor(2)
    });
  }

  function startWing() {
    stopLoops();
    clearRoot();
    stopWing = runGeographyWingScene(root, {
      onOpenPuzzle1: () => openPuzzleOverlayFor(1),
      onOpenPuzzle2: () => openPuzzleOverlayFor(2),
      onBack: () => startHub()
    });
  }

  // Narrative and non-narrative both use the hub → wing flow so refresh/state
  // never drops players straight into a fullscreen puzzle without the wing rooms.
  startHub();
}

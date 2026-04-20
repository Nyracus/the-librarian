// src/screens/GameWorldScreen.js — walkable library hub + History wing room (Stardew-style loop)

import { getState, updateState } from "../core/state.js";
import { logScreenEntry, logEvent } from "../core/logger.js";
import { getFabricatorWing } from "../core/fabricatorWingStore.js";
import {
  listWingIdsForLibrarianEmail,
  refreshAssignedWingsFromApi
} from "../core/fabricatorWingAssignmentStore.js";
import { confidenceFromResponseTimeMs } from "../core/confidenceFromTiming.js";
import { startGameLoop } from "../engine/gameLoop.js";
import {
  getMovementVector,
  isInteractPressed,
  initInput,
  setInputPaused,
  clearVirtualControls
} from "../engine/input.js";
import {
  mountTouchControls,
  shouldUseTouchControls
} from "../engine/touchControls.js";
import {
  drawTechTile,
  drawTechTiledArea,
  TechProp
} from "../assets/techDungeonPack.js";
import { Player } from "../entities/Player.js";
import { InteractiveObject } from "../entities/InteractiveObject.js";
import { playUiSfx } from "../core/audioManager.js";

let gameWorldCleanup = null;

export function cleanupGameWorldSession() {
  if (typeof gameWorldCleanup === "function") {
    gameWorldCleanup();
    gameWorldCleanup = null;
  }
}

const W = 640;
const H = 400;
const MARGIN = 24;
const NEAR = 52;

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export function renderGameWorldScreen(container, context, { screenId }) {
  updateState({ currentScreenId: screenId, phase: "learning" });
  const state = getState();

  logScreenEntry({
    participantId: state.participantId,
    condition: state.condition,
    phase: state.phase,
    screenId
  });

  initInput();

  container.innerHTML = "";
  const root = document.createElement("div");
  root.className = "library-world-root";

  const hud = document.createElement("div");
  hud.className = "library-world-hud";
  const usingTouch = shouldUseTouchControls(state);
  hud.innerHTML = usingTouch
    ? "<p><strong>Explore the library</strong> — Move joystick · Tap E to interact · Pause button available</p>"
    : "<p><strong>Explore the library</strong> — Move: WASD / arrows · Interact: E · Pause: P</p>";

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  canvas.className = "pixel-canvas library-world-canvas";
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "Library exploration view");

  const dialogueEl = document.createElement("div");
  dialogueEl.className = "library-world-dialogue";
  dialogueEl.hidden = true;

  const dialogueText = document.createElement("p");
  dialogueText.className = "library-world-dialogue__text";
  const dialogueNext = document.createElement("button");
  dialogueNext.type = "button";
  dialogueNext.className = "btn btn--primary library-world-dialogue__next";
  dialogueNext.textContent = "Next";

  dialogueEl.appendChild(dialogueText);
  dialogueEl.appendChild(dialogueNext);

  const mcqOverlay = document.createElement("div");
  mcqOverlay.className = "library-world-mcq";
  mcqOverlay.hidden = true;
  const mcqHost = document.createElement("div");
  mcqHost.className = "library-world-mcq__inner";
  mcqOverlay.appendChild(mcqHost);

  root.appendChild(hud);
  root.appendChild(canvas);
  root.appendChild(dialogueEl);
  root.appendChild(mcqOverlay);
  container.appendChild(root);

  let paused = false;
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
  root.appendChild(pauseOverlay);

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

  let pauseKeyCooldown = 0;
  const keyPauseHandler = (e) => {
    if (e.code !== "KeyP") return;
    if (e.repeat) return;
    e.preventDefault();
    if (pauseKeyCooldown > 0) return;
    pauseKeyCooldown = 250;
    togglePause();
  };
  window.addEventListener("keydown", keyPauseHandler);

  const unmountTouch = usingTouch
    ? mountTouchControls(root, {
        onPause: () => togglePause()
      })
    : null;

  const ctx = canvas.getContext("2d");

  let room =
    state.world?.room === "history"
      ? "history"
      : state.world?.room === "fabricator_wing" && state.world?.fabricatorWingActiveId
        ? "fabricator_wing"
        : "hub";
  if (state.world?.room === "fabricator_wing" && !state.world?.fabricatorWingActiveId) {
    room = "hub";
  }
  updateState({
    world: {
      ...getState().world,
      room,
      fabricatorWingActiveId: room === "fabricator_wing" ? state.world?.fabricatorWingActiveId : null
    }
  });

  const player = new Player(W / 2, H - 72);

  function placePlayerForRoom(r) {
    if (r === "hub") {
      player.x = W * 0.22;
      player.y = H * 0.52;
    } else {
      player.x = W / 2;
      player.y = H - 72;
    }
  }
  placePlayerForRoom(room);

  let fabricatorHubDoors = [];
  let fabRoomCacheKey = "";
  /** @type {InteractiveObject[]} */
  let fabShelfObjs = [];
  /** @type {InteractiveObject[]} */
  let fabPlatObjs = [];
  let mcqOpen = false;
  let mcqStartedAt = 0;

  function rebuildFabricatorHubDoors() {
    fabricatorHubDoors = [];
    const email = getState().auth?.email;
    const ids = listWingIdsForLibrarianEmail(email);
    ids.forEach((wid, i) => {
      const wing = getFabricatorWing(wid);
      if (!wing) return;
      const x = 120 + i * 88;
      const y = 328;
      const door = new InteractiveObject({
        x,
        y,
        w: 64,
        h: 52,
        label: `wing-door-${wid}`,
        onInteract: () => {
          updateState({
            world: {
              ...getState().world,
              room: "fabricator_wing",
              fabricatorWingActiveId: wid
            }
          });
          room = "fabricator_wing";
          fabRoomCacheKey = "";
          placePlayerForRoom("fabricator_wing");
          playUiSfx("click");
        }
      });
      door.wingTitle = wing.wingName;
      fabricatorHubDoors.push(door);
    });
  }

  function ensureFabRoomObjects() {
    const id = getState().world?.fabricatorWingActiveId;
    if (room !== "fabricator_wing" || !id) {
      fabShelfObjs = [];
      fabPlatObjs = [];
      fabRoomCacheKey = "";
      return;
    }
    if (fabRoomCacheKey === id) return;
    const wing = getFabricatorWing(id);
    if (!wing) return;
    fabRoomCacheKey = id;
    fabShelfObjs = wing.shelves.map((s) => {
      return new InteractiveObject({
        x: s.x,
        y: s.y,
        w: s.w,
        h: s.h,
        label: s.label,
        onInteract: () => {
          showDialogue([s.text || "—"]);
        }
      });
    });
    fabPlatObjs = wing.platforms.map((p) => {
      return new InteractiveObject({
        x: p.x,
        y: p.y,
        w: p.w,
        h: p.h,
        label: p.label,
        onInteract: () => {
          openPlatformMcq(p.item, wing.id, p.label);
        }
      });
    });
  }

  function openPlatformMcq(item, wingId, platformLabel) {
    if (!item || item.type !== "multiple_choice") return;
    mcqOpen = true;
    mcqStartedAt = performance.now();
    mcqOverlay.hidden = false;
    mcqHost.innerHTML = "";
    const st = getState();
    const title = document.createElement("p");
    title.className = "library-world-mcq__prompt";
    title.textContent = item.prompt || "";
    mcqHost.appendChild(title);
    const form = document.createElement("form");
    form.className = "library-world-mcq__form";
    (item.options || []).forEach((opt) => {
      const lab = document.createElement("label");
      lab.className = "library-world-mcq__opt";
      const rad = document.createElement("input");
      rad.type = "radio";
      rad.name = "mcq";
      rad.value = opt.id;
      lab.appendChild(rad);
      lab.appendChild(document.createTextNode(` ${opt.text}`));
      form.appendChild(lab);
    });
    const row = document.createElement("div");
    row.className = "library-world-mcq__actions";
    const submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "btn btn--primary";
    submit.textContent = "Submit answer";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "btn btn--ghost";
    cancel.textContent = "Close";
    cancel.addEventListener("click", () => {
      mcqOpen = false;
      mcqOverlay.hidden = true;
      mcqHost.innerHTML = "";
    });
    row.appendChild(submit);
    row.appendChild(cancel);
    form.appendChild(row);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const sel = form.querySelector('input[name="mcq"]:checked');
      const responseTimeMs = Math.round(performance.now() - mcqStartedAt);
      const confidence = confidenceFromResponseTimeMs(responseTimeMs);
      const correctness = Boolean(sel && sel.value === item.correctOptionId);
      logEvent({
        participantId: st.participantId,
        condition: st.condition,
        phase: st.phase,
        screenId,
        itemId: `${wingId}:${platformLabel}`,
        response: {
          type: "assessment-submit",
          format: "multiple_choice",
          source: "fabricator_wing_platform",
          wingId,
          selectedOptionId: sel ? sel.value : "",
          confidence,
          confidenceFrom: "response_latency_ms"
        },
        correctness,
        responseTimeMs
      });
      mcqOpen = false;
      mcqOverlay.hidden = true;
      mcqHost.innerHTML = "";
      playUiSfx(correctness ? "success" : "error");
    });
    mcqHost.appendChild(form);
  }

  rebuildFabricatorHubDoors();
  void refreshAssignedWingsFromApi()
    .then(() => {
      rebuildFabricatorHubDoors();
    })
    .catch(() => {});

  let dialogue = null;
  let dialogueCooldown = 0;
  let interactCooldown = 0;

  function showDialogue(lines) {
    dialogue = { lines, i: 0 };
    dialogueEl.hidden = false;
    dialogueCooldown = 0.4;
    syncDialogueLine();
  }

  function syncDialogueLine() {
    if (!dialogue) return;
    dialogueText.textContent = dialogue.lines[dialogue.i] ?? "";
    dialogueNext.textContent =
      dialogue.i + 1 >= dialogue.lines.length ? "Close" : "Next";
  }

  function advanceDialogue() {
    if (!dialogue) return;
    dialogue.i += 1;
    if (dialogue.i >= dialogue.lines.length) {
      dialogue = null;
      dialogueEl.hidden = true;
      playUiSfx("click");
    } else {
      syncDialogueLine();
      playUiSfx("click");
    }
  }

  dialogueNext.addEventListener("click", () => {
    advanceDialogue();
  });

  const historyDoor = new InteractiveObject({
    x: 56,
    y: 188,
    w: 72,
    h: 104,
    label: "history-door",
    onInteract: () => {
      room = "history";
      updateState({
        world: { ...getState().world, room: "history", fabricatorWingActiveId: null }
      });
      placePlayerForRoom("history");
      playUiSfx("click");
    }
  });

  const geoDoor = new InteractiveObject({
    x: W - 56,
    y: 188,
    w: 72,
    h: 104,
    label: "geo-door",
    onInteract: () => {
      const unlocked = getState().world?.geographyUnlocked;
      if (!unlocked) {
        showDialogue([
          "The Geography Wing is locked.",
          "Complete History Wing I (the learning module at the lectern) to open this door."
        ]);
        playUiSfx("error");
        return;
      }
      playUiSfx("click");
      updateState({
        world: { geographyReturnRoute: "library-world" }
      });
      window.location.hash = "#geography-game";
    }
  });

  const backToHub = new InteractiveObject({
    x: W / 2,
    y: H - 36,
    w: 120,
    h: 48,
    label: "back",
    onInteract: () => {
      room = "hub";
      updateState({ world: { ...getState().world, room: "hub", fabricatorWingActiveId: null } });
      placePlayerForRoom("hub");
      rebuildFabricatorHubDoors();
      playUiSfx("click");
    }
  });

  const backFabWing = new InteractiveObject({
    x: W / 2,
    y: H - 36,
    w: 120,
    h: 48,
    label: "back-fabricator",
    onInteract: () => {
      room = "hub";
      updateState({ world: { ...getState().world, room: "hub", fabricatorWingActiveId: null } });
      fabRoomCacheKey = "";
      placePlayerForRoom("hub");
      rebuildFabricatorHubDoors();
      playUiSfx("click");
    }
  });

  const lectern = new InteractiveObject({
    x: W / 2,
    y: 228,
    w: 56,
    h: 44,
    label: "lectern",
    onInteract: () => {
      playUiSfx("click");
      updateState({ world: { exploreMode: true } });
      window.location.hash = "#history-1";
    }
  });

  const shelfA = new InteractiveObject({
    x: 110,
    y: 118,
    w: 96,
    h: 40,
    label: "shelf-a",
    onInteract: () => {
      showDialogue([
        "Shelf: Early Printing — woodcuts and movable type spread knowledge beyond scriptoria."
      ]);
    }
  });

  const shelfB = new InteractiveObject({
    x: 320,
    y: 118,
    w: 96,
    h: 40,
    label: "shelf-b",
    onInteract: () => {
      showDialogue([
        "Shelf: Archives — how societies record memory shapes what future readers can know."
      ]);
    }
  });

  const shelfC = new InteractiveObject({
    x: 530,
    y: 118,
    w: 96,
    h: 40,
    label: "shelf-c",
    onInteract: () => {
      showDialogue([
        "Shelf: Historiography — who tells the story matters as much as the facts on the page."
      ]);
    }
  });

  const archivist = new InteractiveObject({
    x: 132,
    y: 248,
    w: 40,
    h: 48,
    label: "archivist",
    onInteract: () => {
      showDialogue([
        "Archivist: Welcome to the History reading room.",
        "Browse the shelves for flavor text. The lectern starts your formal module — that is where we log your learning.",
        "When the module is complete, the Geography Wing door unlocks."
      ]);
    }
  });

  function getObjects() {
    if (room === "hub") return [historyDoor, geoDoor, ...fabricatorHubDoors];
    if (room === "history") {
      return [backToHub, lectern, shelfA, shelfB, shelfC, archivist];
    }
    if (room === "fabricator_wing") {
      ensureFabRoomObjects();
      return [backFabWing, ...fabShelfObjs, ...fabPlatObjs];
    }
    return [historyDoor, geoDoor];
  }

  function drawRoomBackground(r) {
    if (r === "hub") {
      drawTechTiledArea(ctx, TechProp.FLOOR, 0, 0, W, H, 32);
      drawTechTiledArea(ctx, TechProp.WALL, 0, 0, W, 56, 32);
      drawTechTiledArea(ctx, TechProp.WALKWAY, 0, H - 52, W, 52, 32);
      drawTechTile(ctx, TechProp.DOOR, historyDoor.x - 34, historyDoor.y - 52, 68, 104);
      drawTechTile(ctx, TechProp.DOOR, geoDoor.x - 34, geoDoor.y - 52, 68, 104);
      for (const d of fabricatorHubDoors) {
        drawTechTile(ctx, TechProp.DOOR, d.x - 32, d.y - 40, 64, 80);
        ctx.fillStyle = "#e5e7eb";
        ctx.font = "10px system-ui, sans-serif";
        const label = d.wingTitle ? String(d.wingTitle).slice(0, 22) : "Wing";
        ctx.fillText(label, d.x - 36, d.y + 36);
      }
      ctx.fillStyle = "#6b7280";
      ctx.font = "12px system-ui, sans-serif";
      ctx.fillText("Main hall — doors to wings (assigned narrative wings appear below)", 16, 32);
    } else if (r === "fabricator_wing") {
      const wid = getState().world?.fabricatorWingActiveId;
      const wing = wid ? getFabricatorWing(wid) : null;
      drawTechTiledArea(ctx, TechProp.FLOOR, 0, 0, W, H, 32);
      drawTechTiledArea(ctx, TechProp.WALL, 0, 0, W, 56, 32);
      drawTechTiledArea(ctx, TechProp.WALKWAY, 0, H - 52, W, 52, 32);
      if (wing) {
        for (const s of wing.shelves) {
          drawTechTile(ctx, TechProp.BOOKSHELF, s.x - s.w / 2, s.y - 24, s.w, 40);
        }
        for (const p of wing.platforms) {
          drawTechTile(ctx, TechProp.TABLE, p.x - p.w / 2, p.y - p.h / 2, p.w, p.h);
        }
        ctx.fillStyle = "#6b7280";
        ctx.font = "12px system-ui, sans-serif";
        ctx.fillText(wing.wingName, 16, 28);
        ctx.fillText("Shelves: flavor · Platforms: quiz", 16, 44);
      }
      drawTechTile(ctx, TechProp.DOOR, backFabWing.x - 38, backFabWing.y - 28, 76, 56);
    } else {
      drawTechTiledArea(ctx, TechProp.FLOOR, 0, 0, W, H, 32);
      drawTechTiledArea(ctx, TechProp.WALKWAY, 40, 56, W - 80, 72, 32);
      drawTechTiledArea(ctx, TechProp.WALKWAY, 0, H - 52, W, 52, 32);
      drawTechTile(ctx, TechProp.BOOKSHELF, shelfA.x - 48, shelfA.y - 24, 96, 40);
      drawTechTile(ctx, TechProp.BOOKSHELF, shelfB.x - 48, shelfB.y - 24, 96, 40);
      drawTechTile(ctx, TechProp.BOOKSHELF, shelfC.x - 48, shelfC.y - 24, 96, 40);
      drawTechTile(ctx, TechProp.LECTERN, lectern.x - 28, lectern.y - 24, 56, 44);
      drawTechTile(ctx, TechProp.NPC_ARCHIVIST, archivist.x - 20, archivist.y - 28, 40, 48);
      drawTechTile(ctx, TechProp.DOOR, backToHub.x - 38, backToHub.y - 28, 76, 56);
      ctx.fillStyle = "#6b7280";
      ctx.font = "12px system-ui, sans-serif";
      ctx.fillText("History wing — shelves, lectern, archivist", 16, 28);
    }
  }

  const stop = startGameLoop(
    (dt) => {
      if (pauseKeyCooldown > 0) pauseKeyCooldown -= dt * 1000;
      if (paused) return;
      dialogueCooldown = Math.max(0, dialogueCooldown - dt);
      interactCooldown = Math.max(0, interactCooldown - dt);

      if (dialogue) {
        if (
          dialogueCooldown === 0 &&
          isInteractPressed() &&
          interactCooldown === 0
        ) {
          interactCooldown = 0.35;
          advanceDialogue();
        }
        return;
      }

      if (mcqOpen) return;

      const mv = getMovementVector();
      player.update(dt, mv);
      player.x = clamp(player.x, MARGIN, W - MARGIN);
      player.y = clamp(player.y, MARGIN, H - MARGIN);

      const objs = getObjects();
      for (const o of objs) {
        const near = o.canInteract(player.x, player.y, NEAR);
        o.update(dt, near);
      }

      if (isInteractPressed() && interactCooldown === 0) {
        let best = null;
        let bestDist = Infinity;
        for (const o of objs) {
          if (o.canInteract(player.x, player.y, NEAR)) {
            const d = o.distanceTo(player.x, player.y);
            if (d < bestDist) {
              bestDist = d;
              best = o;
            }
          }
        }
        if (best) {
          interactCooldown = 0.35;
          best.onInteract();
        }
      }
    },
    () => {
      drawRoomBackground(room);
      const objs = getObjects();
      for (const o of objs) {
        const near = o.canInteract(player.x, player.y, NEAR);
        if (near) {
          ctx.strokeStyle = "rgba(251,191,36,0.9)";
          ctx.lineWidth = 3;
          ctx.strokeRect(o.x - o.w / 2 - 3, o.y - o.h / 2 - 3, o.w + 6, o.h + 6);
        }
      }
      if (room === "hub" && !getState().world?.geographyUnlocked) {
        const g = geoDoor;
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(g.x - g.w / 2, g.y - g.h / 2, g.w, g.h);
        ctx.fillStyle = "#fca5a5";
        ctx.font = "11px system-ui, sans-serif";
        ctx.fillText("Locked", g.x - 22, g.y + 4);
      }
      player.draw(ctx);
    }
  );

  function tearDown() {
    window.removeEventListener("keydown", keyPauseHandler);
    setInputPaused(false);
    clearVirtualControls();
    if (typeof unmountTouch === "function") unmountTouch();
    stop();
    root.remove();
  }

  gameWorldCleanup = tearDown;
}

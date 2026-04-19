// src/scenes/GeographyWingScene.js — wing room + puzzle trigger (narrative)

import { startGameLoop } from "../engine/gameLoop.js";
import {
  getMovementVector,
  isInteractPressed,
  initInput
} from "../engine/input.js";
import { createCanvasMount, clear } from "../engine/renderer.js";
import { getState } from "../core/state.js";
import { shouldUseTouchControls } from "../engine/touchControls.js";
import { drawTechTile, drawTechTiledArea, TechProp } from "../assets/techDungeonPack.js";
import { Player } from "../entities/Player.js";
import { InteractiveObject } from "../entities/InteractiveObject.js";
import { playUiSfx } from "../core/audioManager.js";

const TABLE_INTERACT_RANGE = 88;

const MANUSCRIPTS = [
  {
    title: "On the Wandering Channel",
    html: `<p>The river does not always keep its place. In years of heavy rain, it spreads wide, abandoning its former banks and carving new paths across the plain. Villages once built beside its edge have found themselves far from water within a single generation.</p><p>The elders say the river prefers movement to memory. What appears stable in one season may not remain so in the next. Those who follow the old paths will often find only dry ground, while new channels emerge elsewhere without warning.</p>`
  },
  {
    title: "On the Silent Passage",
    html: `<p>There are stretches where the river seems to vanish. The bed lies open, wide and pale, as if abandoned. Yet the ground remains cool, and the sand holds a quiet weight.</p><p>Travelers have learned not to trust what is seen alone. Beneath the surface, the current continues—not broken, only concealed. Wells dug into the dry bed fill quickly, even when no water flows above.</p><p class="manuscript-hint"><span class="manuscript-hint__blue">What disappears from sight may still persist below.</span></p>`
  },
  {
    title: "On the Divided Course",
    html: `<p>The river does not remain whole along its journey. In certain stretches, it separates—splitting into two channels that run apart for a distance, only to meet again further ahead.</p><p>Those unfamiliar with the land often mistake one branch for the river itself, unaware that it is only a fragment of a larger flow. Beyond these divisions, the waters continue onward, eventually joining a far greater current that gathers many such rivers into one.</p><p>What appears divided is not lost—it is simply part of something larger.</p>`
  }
];

function openManuscriptModal(index) {
  const data = MANUSCRIPTS[index];
  if (!data) return;
  const wrap = document.createElement("div");
  wrap.className = "geo-manuscript-overlay";
  wrap.setAttribute("role", "dialog");
  wrap.innerHTML = `
    <div class="geo-manuscript-card">
      <h3 class="geo-manuscript-card__title"></h3>
      <div class="geo-manuscript-card__body"></div>
      <button type="button" class="btn btn--primary geo-manuscript-close">Close</button>
    </div>
  `;
  wrap.querySelector("h3").textContent = data.title;
  wrap.querySelector(".geo-manuscript-card__body").innerHTML = data.html;
  const close = () => {
    wrap.remove();
    document.removeEventListener("keydown", onEsc);
  };
  function onEsc(e) {
    if (e.code === "Escape") close();
  }
  wrap.addEventListener("click", (e) => {
    if (e.target === wrap || e.target.classList.contains("geo-manuscript-close")) close();
  });
  document.addEventListener("keydown", onEsc);
  document.body.appendChild(wrap);
  playUiSfx("click");
}

export function runGeographyWingScene(container, { onOpenPuzzle1, onOpenPuzzle2, onBack }) {
  initInput();

  const wrap = document.createElement("div");
  wrap.className = "geo-wing-wrap";
  const hint = document.createElement("p");
  hint.className = "geo-hub-hint";
  hint.textContent = shouldUseTouchControls(getState())
    ? "Geography hallway. Enter rooms from doors; Room II unlocks after Room I."
    : "Geography hallway. Move to a door and press E. Room I can be replayed anytime.";
  const { canvas, ctx } = createCanvasMount(wrap, 480, 320);
  container.appendChild(wrap);
  container.appendChild(hint);

  const w = canvas.width;
  const h = canvas.height;
  const player = new Player(w / 2, h - 54);
  let room = "hall"; // hall | room1 | room2 | room3
  let interactCooldown = 0;

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function placePlayerForRoom(nextRoom) {
    room = nextRoom;
    if (room === "hall") {
      player.x = w / 2;
      player.y = h - 54;
      return;
    }
    player.x = w / 2;
    player.y = h - 54;
  }

  const doorRoom1 = new InteractiveObject({
    x: w * 0.22,
    y: 58,
    w: 62,
    h: 84,
    label: "geo-room1-door",
    onInteract: () => {
      playUiSfx("click");
      placePlayerForRoom("room1");
    }
  });
  const doorRoom2 = new InteractiveObject({
    x: w * 0.5,
    y: 58,
    w: 62,
    h: 84,
    label: "geo-room2-door",
    onInteract: () => {
      if (!getState().world?.geographyPuzzle1Complete) {
        playUiSfx("error");
        return;
      }
      playUiSfx("click");
      placePlayerForRoom("room2");
    }
  });
  const doorRoom3 = new InteractiveObject({
    x: w * 0.78,
    y: 58,
    w: 62,
    h: 84,
    label: "geo-room3-door",
    onInteract: () => {
      if (!getState().world?.geographyPuzzle2Complete) {
        playUiSfx("error");
        return;
      }
      playUiSfx("click");
      placePlayerForRoom("room3");
    }
  });

  const backDoor = new InteractiveObject({
    x: w / 2,
    y: h - 32,
    w: 110,
    h: 44,
    label: "geo-room-back",
    onInteract: () => {
      playUiSfx("click");
      placePlayerForRoom("hall");
    }
  });

  const room1Table = new InteractiveObject({
    x: w / 2,
    y: h / 2 - 26,
    w: 80,
    h: 48,
    label: "geo-room1-table",
    onInteract: () => {
      if (typeof onOpenPuzzle1 === "function") onOpenPuzzle1();
    }
  });
  const room2Table = new InteractiveObject({
    x: w / 2,
    y: h / 2 - 26,
    w: 80,
    h: 48,
    label: "geo-room2-table",
    onInteract: () => {
      if (!getState().world?.geographyPuzzle1Complete) {
        playUiSfx("error");
        return;
      }
      if (typeof onOpenPuzzle2 === "function") onOpenPuzzle2();
    }
  });
  const room3Shelf = new InteractiveObject({
    x: w / 2,
    y: h / 2 - 26,
    w: 90,
    h: 52,
    label: "geo-room3-shelf",
    onInteract: () => {
      openManuscriptModal(2);
    }
  });

  function getObjects() {
    if (room === "hall") return [doorRoom1, doorRoom2, doorRoom3];
    if (room === "room1") return [backDoor, room1Table];
    if (room === "room2") return [backDoor, room2Table];
    return [backDoor, room3Shelf];
  }

  function drawHall() {
    clear(ctx, w, h, "#0f172a");
    drawTechTiledArea(ctx, TechProp.FLOOR, 0, 0, w, h, 32);
    drawTechTiledArea(ctx, TechProp.WALL, 0, 0, w, 56, 32);
    drawTechTiledArea(ctx, TechProp.WALKWAY, 0, h - 52, w, 52, 32);
    drawTechTile(ctx, TechProp.DOOR, doorRoom1.x - 31, doorRoom1.y - 42, 62, 84);
    drawTechTile(ctx, TechProp.DOOR, doorRoom2.x - 31, doorRoom2.y - 42, 62, 84);
    drawTechTile(ctx, TechProp.DOOR, doorRoom3.x - 31, doorRoom3.y - 42, 62, 84);
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillText("Room I", doorRoom1.x - 20, doorRoom1.y + 58);
    ctx.fillText("Room II", doorRoom2.x - 22, doorRoom2.y + 58);
    ctx.fillText("Room III", doorRoom3.x - 24, doorRoom3.y + 58);
    if (!getState().world?.geographyPuzzle1Complete) {
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(doorRoom2.x - doorRoom2.w / 2, doorRoom2.y - doorRoom2.h / 2, doorRoom2.w, doorRoom2.h);
      ctx.fillStyle = "#fca5a5";
      ctx.fillText("Locked", doorRoom2.x - 18, doorRoom2.y + 4);
    }
    if (!getState().world?.geographyPuzzle2Complete) {
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(doorRoom3.x - doorRoom3.w / 2, doorRoom3.y - doorRoom3.h / 2, doorRoom3.w, doorRoom3.h);
      ctx.fillStyle = "#fca5a5";
      ctx.fillText("Locked", doorRoom3.x - 18, doorRoom3.y + 4);
    }
  }

  function drawRoom(label, tableObj, npc = null) {
    clear(ctx, w, h, "#0f172a");
    drawTechTiledArea(ctx, TechProp.FLOOR, 0, 0, w, h, 32);
    drawTechTiledArea(ctx, TechProp.WALKWAY, 36, 48, w - 72, 72, 32);
    drawTechTiledArea(ctx, TechProp.WALKWAY, 0, h - 52, w, 52, 32);
    drawTechTile(ctx, TechProp.DOOR, backDoor.x - 38, backDoor.y - 28, 76, 56);
    drawTechTile(ctx, TechProp.TABLE, tableObj.x - 44, tableObj.y - 28, 88, 56);
    if (npc === "shelf") {
      drawTechTile(ctx, TechProp.BOOKSHELF, room3Shelf.x - 48, room3Shelf.y - 28, 96, 56);
    }
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillText(label, 16, 28);
  }

  const stop = startGameLoop(
    (dt) => {
      interactCooldown = Math.max(0, interactCooldown - dt);
      const mv = getMovementVector();
      player.update(dt, mv);
      player.x = clamp(player.x, 16, w - 16);
      player.y = clamp(player.y, 16, h - 16);
      const objs = getObjects();
      for (const o of objs) {
        const near = o.canInteract(player.x, player.y, TABLE_INTERACT_RANGE);
        o.update(dt, near);
      }
      if (isInteractPressed() && interactCooldown === 0) {
        let best = null;
        let bestDist = Infinity;
        for (const o of objs) {
          if (o.canInteract(player.x, player.y, TABLE_INTERACT_RANGE)) {
            const d = o.distanceTo(player.x, player.y);
            if (d < bestDist) {
              best = o;
              bestDist = d;
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
      if (room === "hall") {
        drawHall();
      } else if (room === "room1") {
        drawRoom("Geography Room I — The First Leak", room1Table);
      } else if (room === "room2") {
        drawRoom("Geography Room II — Beneath the Surface", room2Table);
      } else {
        drawRoom("Geography Room III — Archive", room3Shelf, "shelf");
      }
      const objs = getObjects();
      for (const o of objs) {
        if (o.canInteract(player.x, player.y, TABLE_INTERACT_RANGE)) {
          ctx.strokeStyle = "rgba(251,191,36,0.85)";
          ctx.lineWidth = 3;
          ctx.strokeRect(o.x - o.w / 2 - 2, o.y - o.h / 2 - 2, o.w + 4, o.h + 4);
        }
      }
      player.draw(ctx);
    }
  );

  const actions = document.createElement("div");
  actions.className = "geo-wing-actions";

  const room1Btn = document.createElement("button");
  room1Btn.type = "button";
  room1Btn.className = "btn btn--primary";
  room1Btn.textContent = "Go to Room I";
  room1Btn.addEventListener("click", () => placePlayerForRoom("room1"));

  const room2Btn = document.createElement("button");
  room2Btn.type = "button";
  room2Btn.className = "btn btn--ghost";
  room2Btn.textContent = "Go to Room II";
  room2Btn.disabled = !getState().world?.geographyPuzzle1Complete;
  room2Btn.addEventListener("click", () => {
    if (!getState().world?.geographyPuzzle1Complete) return;
    placePlayerForRoom("room2");
  });

  const hallBtn = document.createElement("button");
  hallBtn.type = "button";
  hallBtn.className = "btn btn--ghost";
  hallBtn.textContent = "Back to hallway";
  hallBtn.addEventListener("click", () => placePlayerForRoom("hall"));

  const back = document.createElement("button");
  back.type = "button";
  back.className = "btn btn--ghost geo-wing-back";
  back.textContent = "Back to hub";
  back.addEventListener("click", () => {
    if (typeof onBack === "function") onBack();
  });

  actions.appendChild(room1Btn);
  actions.appendChild(room2Btn);
  actions.appendChild(hallBtn);
  actions.appendChild(back);
  container.appendChild(actions);

  const shelfRow = document.createElement("div");
  shelfRow.className = "geo-wing-shelves";
  shelfRow.innerHTML =
    '<p class="geo-wing-shelves__label">Shelves — geography manuscripts</p><div class="geo-wing-shelves__btns"></div>';
  const shelfBtns = shelfRow.querySelector(".geo-wing-shelves__btns");
  ["Shelf I", "Shelf II", "Shelf III"].forEach((label, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "btn btn--ghost geo-wing-shelf-btn";
    b.textContent = label;
    b.addEventListener("click", () => openManuscriptModal(i));
    shelfBtns.appendChild(b);
  });
  container.appendChild(shelfRow);

  return () => {
    stop();
    wrap.remove();
    hint.remove();
    actions.remove();
    shelfRow.remove();
  };
}

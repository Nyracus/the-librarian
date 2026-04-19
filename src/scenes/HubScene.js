// src/scenes/HubScene.js — pixel hub (narrative path)

import { startGameLoop } from "../engine/gameLoop.js";
import { getMovementVector, isInteractPressed, initInput } from "../engine/input.js";
import { createCanvasMount, clear } from "../engine/renderer.js";
import { getState } from "../core/state.js";
import { shouldUseTouchControls } from "../engine/touchControls.js";
import { drawTechTile, drawTechTiledArea, TechProp } from "../assets/techDungeonPack.js";
import { Player } from "../entities/Player.js";
import { InteractiveObject } from "../entities/InteractiveObject.js";

export function runHubScene(container, { onEnterGeography, onOpenPuzzle1, onOpenPuzzle2 }) {
  initInput();

  const wrap = document.createElement("div");
  wrap.className = "geo-hub-wrap";
  const hint = document.createElement("p");
  hint.className = "geo-hub-hint";
  hint.textContent = shouldUseTouchControls(getState())
    ? "Use joystick to move. Tap E near the door."
    : "WASD / arrows to move. E near the door to enter the wing.";
  const { canvas, ctx } = createCanvasMount(wrap, 480, 320);
  container.appendChild(wrap);
  container.appendChild(hint);

  const w = canvas.width;
  const h = canvas.height;
  const player = new Player(w / 2, h / 2 + 40);
  const door = new InteractiveObject({
    x: w / 2,
    y: 48,
    w: 48,
    h: 64,
    label: "door",
    onInteract: () => {
      if (typeof onEnterGeography === "function") onEnterGeography();
    }
  });

  let interactCooldown = 0;

  const stop = startGameLoop(
    (dt) => {
      interactCooldown = Math.max(0, interactCooldown - dt);
      const mv = getMovementVector();
      player.update(dt, mv);
      player.x = Math.max(16, Math.min(w - 16, player.x));
      player.y = Math.max(16, Math.min(h - 16, player.y));

      const nearDoor = door.canInteract(player.x, player.y, 52);
      door.update(dt, nearDoor);

      if (nearDoor && isInteractPressed() && interactCooldown === 0) {
        interactCooldown = 0.35;
        door.onInteract();
      }
    },
    () => {
      clear(ctx, w, h, "#1f2937");
      drawTechTiledArea(ctx, TechProp.FLOOR, 0, 0, w, h, 32);
      drawTechTiledArea(ctx, TechProp.WALL, 0, 0, w, 40, 32);
      drawTechTile(ctx, TechProp.DOOR, door.x - 26, door.y - 34, 52, 68);

      if (door.canInteract(player.x, player.y, 52)) {
        ctx.strokeStyle = "rgba(251,191,36,0.85)";
        ctx.lineWidth = 3;
        ctx.strokeRect(door.x - 30, door.y - 38, 60, 76);
      }
      player.draw(ctx);
    }
  );

  const shortcuts = document.createElement("div");
  shortcuts.className = "geo-wing-actions";

  const p1 = document.createElement("button");
  p1.type = "button";
  p1.className = "btn btn--ghost";
  p1.textContent = "Shortcut: Puzzle I";
  p1.addEventListener("click", () => {
    if (typeof onOpenPuzzle1 === "function") onOpenPuzzle1();
  });

  const p2 = document.createElement("button");
  p2.type = "button";
  p2.className = "btn btn--ghost";
  p2.textContent = "Shortcut: Puzzle II";
  p2.addEventListener("click", () => {
    if (typeof onOpenPuzzle2 === "function") onOpenPuzzle2();
  });

  shortcuts.appendChild(p1);
  shortcuts.appendChild(p2);
  container.appendChild(shortcuts);

  return () => {
    stop();
    wrap.remove();
    hint.remove();
    shortcuts.remove();
  };
}

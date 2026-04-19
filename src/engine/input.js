// src/engine/input.js

const keys = new Set();
let inputInitialized = false;
let inputPaused = false;
let virtualMove = { x: 0, y: 0 };
let virtualInteractHold = false;
let virtualInteractPulseUntil = 0;

export function initInput() {
  if (inputInitialized) return;
  inputInitialized = true;
  window.addEventListener("keydown", (e) => {
    keys.add(e.code);
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
      e.preventDefault();
    }
  });
  window.addEventListener("keyup", (e) => keys.delete(e.code));
}

export function isKeyDown(code) {
  if (inputPaused) return false;
  return keys.has(code);
}

export function isInteractPressed() {
  if (inputPaused) return false;
  return keys.has("KeyE") || virtualInteractHold || Date.now() < virtualInteractPulseUntil;
}

export function getMovementVector() {
  if (inputPaused) return { x: 0, y: 0 };
  let x = 0;
  let y = 0;
  if (isKeyDown("KeyA") || isKeyDown("ArrowLeft")) x -= 1;
  if (isKeyDown("KeyD") || isKeyDown("ArrowRight")) x += 1;
  if (isKeyDown("KeyW") || isKeyDown("ArrowUp")) y -= 1;
  if (isKeyDown("KeyS") || isKeyDown("ArrowDown")) y += 1;
  if (x === 0 && y === 0) {
    x = virtualMove.x;
    y = virtualMove.y;
  }
  const len = Math.hypot(x, y) || 1;
  return { x: x / len, y: y / len };
}

export function setVirtualMovement(x, y) {
  virtualMove = { x: Number(x) || 0, y: Number(y) || 0 };
}

export function setVirtualInteractHold(pressed) {
  virtualInteractHold = Boolean(pressed);
}

export function pulseVirtualInteract(ms = 180) {
  virtualInteractPulseUntil = Date.now() + ms;
}

export function clearVirtualControls() {
  virtualMove = { x: 0, y: 0 };
  virtualInteractHold = false;
  virtualInteractPulseUntil = 0;
}

export function setInputPaused(paused) {
  inputPaused = Boolean(paused);
}

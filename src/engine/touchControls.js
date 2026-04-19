// src/engine/touchControls.js

import {
  setVirtualMovement,
  setVirtualInteractHold,
  pulseVirtualInteract,
  clearVirtualControls
} from "./input.js";

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export function shouldUseTouchControls(state) {
  const scheme = state?.config?.controlScheme || "auto";
  const device = state?.config?.playerDevice || "pc";
  if (scheme === "touch") return true;
  if (scheme === "keyboard") return false;
  return device === "mobile-tablet";
}

export function mountTouchControls(container, { onPause } = {}) {
  const root = document.createElement("div");
  root.className = "touch-controls";

  const left = document.createElement("div");
  left.className = "touch-controls__left";
  const stick = document.createElement("div");
  stick.className = "touch-joystick";
  const knob = document.createElement("div");
  knob.className = "touch-joystick__knob";
  stick.appendChild(knob);
  left.appendChild(stick);

  const right = document.createElement("div");
  right.className = "touch-controls__right";
  const interactBtn = document.createElement("button");
  interactBtn.type = "button";
  interactBtn.className = "touch-btn touch-btn--interact";
  interactBtn.textContent = "E";
  const pauseBtn = document.createElement("button");
  pauseBtn.type = "button";
  pauseBtn.className = "touch-btn touch-btn--pause";
  pauseBtn.textContent = "Pause";
  right.appendChild(interactBtn);
  right.appendChild(pauseBtn);

  root.appendChild(left);
  root.appendChild(right);
  container.appendChild(root);

  const maxRadius = 44;
  let activePointerId = null;
  let centerX = 0;
  let centerY = 0;

  function placeKnob(nx, ny) {
    knob.style.transform = `translate(${nx}px, ${ny}px)`;
  }

  function resetStick() {
    setVirtualMovement(0, 0);
    placeKnob(0, 0);
  }

  function updateFromPointer(clientX, clientY) {
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const d = Math.hypot(dx, dy) || 1;
    const limited = Math.min(maxRadius, d);
    const nx = (dx / d) * limited;
    const ny = (dy / d) * limited;
    placeKnob(nx, ny);
    setVirtualMovement(clamp(nx / maxRadius, -1, 1), clamp(ny / maxRadius, -1, 1));
  }

  stick.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    activePointerId = e.pointerId;
    const rect = stick.getBoundingClientRect();
    centerX = rect.left + rect.width / 2;
    centerY = rect.top + rect.height / 2;
    updateFromPointer(e.clientX, e.clientY);
    stick.setPointerCapture(e.pointerId);
  });

  stick.addEventListener("pointermove", (e) => {
    if (activePointerId !== e.pointerId) return;
    e.preventDefault();
    updateFromPointer(e.clientX, e.clientY);
  });

  function stopStick(e) {
    if (activePointerId !== e.pointerId) return;
    e.preventDefault();
    activePointerId = null;
    resetStick();
  }
  stick.addEventListener("pointerup", stopStick);
  stick.addEventListener("pointercancel", stopStick);

  interactBtn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    setVirtualInteractHold(true);
    pulseVirtualInteract();
  });
  const releaseInteract = (e) => {
    e.preventDefault();
    setVirtualInteractHold(false);
  };
  interactBtn.addEventListener("pointerup", releaseInteract);
  interactBtn.addEventListener("pointercancel", releaseInteract);
  interactBtn.addEventListener("click", (e) => {
    e.preventDefault();
    pulseVirtualInteract();
  });

  pauseBtn.addEventListener("click", () => {
    if (typeof onPause === "function") onPause();
  });

  return () => {
    clearVirtualControls();
    root.remove();
  };
}


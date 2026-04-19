// src/core/presentation.js

export function applySceneBackground(screenEl, backgroundClass) {
  if (!screenEl) return;
  screenEl.classList.remove("scene-grain", "scene-oath", "scene-dispatch");
  if (backgroundClass) {
    screenEl.classList.add(backgroundClass);
  }
}

export function runFadeTransition(screenEl, durationMs, renderFn) {
  if (!screenEl) {
    renderFn();
    return;
  }
  screenEl.style.transition = `opacity ${durationMs}ms ease`;
  screenEl.classList.add("scene-fade-out");
  window.setTimeout(() => {
    renderFn();
    screenEl.classList.remove("scene-fade-out");
    screenEl.classList.add("scene-fade-in");
    window.setTimeout(() => {
      screenEl.classList.remove("scene-fade-in");
    }, durationMs);
  }, durationMs);
}

export function typewriterText(targetEl, fullText, speedMs = 12) {
  if (!targetEl) return { skip: () => {}, done: Promise.resolve() };
  const text = String(fullText || "");
  let index = 0;
  let timerId = null;
  let skipped = false;

  let resolveDone;
  const done = new Promise((resolve) => {
    resolveDone = resolve;
  });

  function finishNow() {
    if (skipped) return;
    skipped = true;
    if (timerId) window.clearTimeout(timerId);
    targetEl.textContent = text;
    resolveDone();
  }

  function tick() {
    if (skipped) return;
    index += 1;
    targetEl.textContent = text.slice(0, index);
    if (index >= text.length) {
      resolveDone();
      return;
    }
    timerId = window.setTimeout(tick, speedMs);
  }

  targetEl.textContent = "";
  tick();

  return {
    skip: finishNow,
    done
  };
}


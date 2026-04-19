// Portion 1 — "The First Leak": placement-only 4×4 puzzle

import { playUiSfx } from "../core/audioManager.js";
import { logScreenEntry } from "../core/logger.js";
import { getState } from "../core/state.js";
import { applyPortion1ArrowTile } from "../puzzle/portion1ArrowTile.js";
import {
  PORTION1_ROWS,
  PORTION1_COLS,
  PORTION1_START,
  PORTION1_END,
  PORTION1_BLOCKED,
  PORTION1_INVENTORY,
  portion1Flood,
  portion1CheckWin,
  portion1FlowOrder,
  portion1CanonicalFlowOrder
} from "../puzzle/portion1FirstLeak.js";

function isBlocked(r, c) {
  return PORTION1_BLOCKED.some((b) => b.row === r && b.col === c);
}

function isFixed(r, c) {
  return (
    (r === PORTION1_START.row && c === PORTION1_START.col) ||
    (r === PORTION1_END.row && c === PORTION1_END.col) ||
    isBlocked(r, c)
  );
}

export function mountPortion1PuzzleScene(container, options = {}) {
  const { mode = "narrative", screenId = "geography-puzzle-p1", onClose, onSolved } = options;
  const state = getState();
  logScreenEntry({
    participantId: state.participantId,
    condition: state.condition,
    phase: state.phase || "learning",
    screenId
  });

  const placements = new Map();
  let cursorR = 0;
  let cursorC = 2;
  let selectedIdx = 0;
  let selectedRotation = 0;
  let solved = false;
  let flowTimeouts = [];

  const root = document.createElement("div");
  root.className = `puzzle-scene puzzle-scene--portion1 puzzle-scene--${mode}`;

  const title = document.createElement("h2");
  title.className = "puzzle-scene__title";
  title.textContent = "The first leak";

  const intro = document.createElement("p");
  intro.className = "puzzle-scene__instr portion1-intro";
  intro.textContent =
    mode === "narrative"
      ? "The leak has begun. Contain it before it spreads."
      : "Connect the source to the exit.";

  const gridWrap = document.createElement("div");
  gridWrap.className = "portion1-grid-wrap";

  const gridEl = document.createElement("div");
  gridEl.className = "portion1-grid";
  gridEl.style.gridTemplateColumns = `repeat(${PORTION1_COLS}, minmax(52px, 64px))`;

  const rackEl = document.createElement("div");
  rackEl.className = "portion1-rack";

  const statusEl = document.createElement("p");
  statusEl.className = "puzzle-scene__status portion1-status";

  const completionEl = document.createElement("div");
  completionEl.className = "portion1-completion";
  completionEl.hidden = true;
  completionEl.setAttribute("role", "status");
  completionEl.innerHTML =
    mode === "narrative"
      ? "<strong>Contained.</strong> <span>For now.</span>"
      : "<strong>Flow restored.</span> <span>The path holds.</span>";

  const controls = document.createElement("p");
  controls.className = "portion1-controls-hint";
  controls.innerHTML =
    "<kbd>Arrows</kbd> move · <kbd>1–5</kbd> pick · <kbd>Q/E</kbd> rotate -/+90° · <kbd>Enter</kbd> place · <kbd>Backspace</kbd> clear · <kbd>Space</kbd> test flow";

  function usedInvIds() {
    return new Set(Array.from(placements.values()).map((v) => v.id));
  }

  function clearFlowAnim() {
    flowTimeouts.forEach((id) => clearTimeout(id));
    flowTimeouts = [];
    gridEl.querySelectorAll(".geo-portion-cell--flow").forEach((el) => {
      el.classList.remove("geo-portion-cell--flow");
    });
  }

  function renderRack() {
    rackEl.innerHTML = "";
    const used = usedInvIds();
    PORTION1_INVENTORY.forEach((piece, i) => {
      const slot = document.createElement("button");
      slot.type = "button";
      slot.className = "portion1-rack-slot";
      if (i === selectedIdx) slot.classList.add("portion1-rack-slot--selected");
      if (used.has(piece.id)) slot.classList.add("portion1-rack-slot--used");
      slot.dataset.idx = String(i);
      slot.title = piece.label;
      const inner = document.createElement("span");
      const rot = i === selectedIdx ? selectedRotation : 0;
      applyPortion1ArrowTile(inner, { kind: piece.kind, rotation: rot });
      slot.appendChild(inner);
      const lab = document.createElement("span");
      lab.className = "portion1-rack-label";
      lab.textContent = `${i + 1}`;
      slot.appendChild(lab);
      slot.addEventListener("click", () => {
        if (solved) return;
        selectedIdx = i;
        selectedRotation = 0;
        playUiSfx("click");
        renderRack();
      });
      rackEl.appendChild(slot);
    });
  }

  function cellKey(r, c) {
    return `${r},${c}`;
  }

  function renderGrid() {
    gridEl.innerHTML = "";
    for (let r = 0; r < PORTION1_ROWS; r++) {
      for (let c = 0; c < PORTION1_COLS; c++) {
        const cell = document.createElement("div");
        cell.className = "geo-portion-cell";
        cell.dataset.r = String(r);
        cell.dataset.c = String(c);

        if (isBlocked(r, c)) {
          cell.classList.add("geo-portion-cell--rock");
          cell.textContent = "";
        } else if (r === PORTION1_START.row && c === PORTION1_START.col) {
          cell.classList.add("geo-portion-cell--fixed", "geo-portion-cell--start");
          const inner = document.createElement("span");
          applyPortion1ArrowTile(inner, { fixed: "start" });
          cell.appendChild(inner);
        } else if (r === PORTION1_END.row && c === PORTION1_END.col) {
          cell.classList.add("geo-portion-cell--fixed", "geo-portion-cell--end");
          const inner = document.createElement("span");
          applyPortion1ArrowTile(inner, { fixed: "end" });
          cell.appendChild(inner);
        } else {
          cell.classList.add("geo-portion-cell--sand");
          const placed = placements.get(cellKey(r, c));
          if (placed) {
            const piece = PORTION1_INVENTORY.find((p) => p.id === placed.id);
            if (piece) {
              const inner = document.createElement("span");
              applyPortion1ArrowTile(inner, {
                kind: piece.kind,
                rotation: placed.rotation
              });
              cell.appendChild(inner);
            }
          }
        }

        if (r === cursorR && c === cursorC && !solved) {
          cell.classList.add("geo-portion-cell--cursor");
        }

        gridEl.appendChild(cell);
      }
    }
  }

  function updateStatus() {
    if (solved) {
      statusEl.textContent =
        mode === "narrative" ? "Contained. For now." : "Flow restored.";
      return;
    }
    statusEl.textContent = `Place exactly five tiles · ${placements.size}/5`;
  }

  function tryPlace() {
    if (solved) return;
    if (isFixed(cursorR, cursorC)) {
      playUiSfx("error");
      return;
    }
    const piece = PORTION1_INVENTORY[selectedIdx];
    if (!piece) return;
    if (usedInvIds().has(piece.id)) {
      playUiSfx("error");
      return;
    }
    const key = cellKey(cursorR, cursorC);
    if (placements.has(key)) {
      playUiSfx("error");
      return;
    }
    placements.set(key, { id: piece.id, rotation: selectedRotation });
    playUiSfx("stone");
    renderGrid();
    renderRack();
    const chk = portion1CheckWin(placements);
    if (chk.win) {
      solved = true;
      playUiSfx("success");
      root.classList.add("puzzle-scene--solved");
      completionEl.hidden = false;
      updateStatus();
      runFlowAnim(true);
      if (typeof onSolved === "function") {
        window.setTimeout(() => onSolved(), 80);
      }
    } else {
      updateStatus();
    }
  }

  function tryRemove() {
    if (solved) return;
    if (isFixed(cursorR, cursorC)) return;
    const key = cellKey(cursorR, cursorC);
    if (placements.delete(key)) {
      playUiSfx("click");
      renderGrid();
      renderRack();
      updateStatus();
    }
  }

  function runFlowAnim(isWin) {
    clearFlowAnim();
    const { reachedEnd } = portion1Flood(placements);
    const order = isWin ? portion1CanonicalFlowOrder() : portion1FlowOrder(placements);
    const delay = 140;
    order.forEach((pos, i) => {
      const id = window.setTimeout(() => {
        const idx = pos.row * PORTION1_COLS + pos.col;
        const cells = gridEl.querySelectorAll(".geo-portion-cell");
        const el = cells[idx];
        if (el) {
          el.classList.add("geo-portion-cell--flow");
          if (i % 2 === 0) playUiSfx("trickle");
        }
      }, i * delay);
      flowTimeouts.push(id);
    });
    const endId = window.setTimeout(() => {
      if (isWin) return;
      if (!reachedEnd) {
        playUiSfx("dry");
        statusEl.textContent =
          mode === "narrative" ? "The flow breaks." : "Flow interrupted.";
      }
    }, order.length * delay + 80);
    flowTimeouts.push(endId);
  }

  function onKeyDown(e) {
    if (solved && e.code !== "Escape") return;
    const tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA") return;

    if (e.code === "ArrowUp") {
      e.preventDefault();
      cursorR = Math.max(0, cursorR - 1);
      renderGrid();
      return;
    }
    if (e.code === "ArrowDown") {
      e.preventDefault();
      cursorR = Math.min(PORTION1_ROWS - 1, cursorR + 1);
      renderGrid();
      return;
    }
    if (e.code === "ArrowLeft") {
      e.preventDefault();
      cursorC = Math.max(0, cursorC - 1);
      renderGrid();
      return;
    }
    if (e.code === "ArrowRight") {
      e.preventDefault();
      cursorC = Math.min(PORTION1_COLS - 1, cursorC + 1);
      renderGrid();
      return;
    }
    const n = e.code === "Digit1" ? 0 : e.code === "Digit2" ? 1 : e.code === "Digit3" ? 2 : e.code === "Digit4" ? 3 : e.code === "Digit5" ? 4 : -1;
    if (n >= 0 && n < PORTION1_INVENTORY.length) {
      e.preventDefault();
      selectedIdx = n;
      selectedRotation = 0;
      renderRack();
      return;
    }
    if (e.code === "KeyQ") {
      e.preventDefault();
      selectedRotation = (selectedRotation + 270) % 360;
      playUiSfx("click");
      renderRack();
      return;
    }
    if (e.code === "KeyE") {
      e.preventDefault();
      selectedRotation = (selectedRotation + 90) % 360;
      playUiSfx("click");
      renderRack();
      return;
    }
    if (e.code === "Enter") {
      e.preventDefault();
      tryPlace();
      return;
    }
    if (e.code === "Backspace") {
      e.preventDefault();
      tryRemove();
      return;
    }
    if (e.code === "Space") {
      e.preventDefault();
      if (placements.size === 0) return;
      const chk = portion1CheckWin(placements);
      runFlowAnim(chk.win);
      return;
    }
  }

  root.appendChild(title);
  root.appendChild(intro);
  root.appendChild(gridWrap);
  gridWrap.appendChild(gridEl);
  root.appendChild(rackEl);
  root.appendChild(controls);
  root.appendChild(statusEl);
  root.appendChild(completionEl);

  const back = document.createElement("button");
  back.type = "button";
  back.className = "btn btn--ghost puzzle-scene__back";
  back.textContent = mode === "narrative" ? "Close" : "Back to Library Hub";
  back.addEventListener("click", () => {
    clearFlowAnim();
    window.removeEventListener("keydown", onKeyDown, true);
    if (typeof onClose === "function") onClose();
  });
  root.appendChild(back);

  window.addEventListener("keydown", onKeyDown, true);
  renderRack();
  renderGrid();
  updateStatus();

  container.appendChild(root);

  return {
    destroy() {
      clearFlowAnim();
      window.removeEventListener("keydown", onKeyDown, true);
      root.remove();
    }
  };
}

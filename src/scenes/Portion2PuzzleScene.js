import { playUiSfx } from "../core/audioManager.js";
import { logScreenEntry } from "../core/logger.js";
import { getState } from "../core/state.js";
import { applyPortion2ArrowTile } from "../puzzle/portion2ArrowTile.js";
import {
  PORTION2_ROWS,
  PORTION2_COLS,
  PORTION2_START,
  PORTION2_END,
  PORTION2_BLOCKED,
  PORTION2_SANDS,
  PORTION2_INVENTORY,
  portion2Flood,
  portion2CheckWin,
  portion2FlowOrder,
  portion2CanonicalFlowOrder
} from "../puzzle/portion2BeneathSurface.js";

function isBlocked(r, c) {
  return PORTION2_BLOCKED.some((b) => b.row === r && b.col === c);
}

function sandAt(r, c) {
  return PORTION2_SANDS.find((s) => s.row === r && s.col === c) || null;
}

function isFixed(r, c) {
  return (
    (r === PORTION2_START.row && c === PORTION2_START.col) ||
    (r === PORTION2_END.row && c === PORTION2_END.col) ||
    isBlocked(r, c) ||
    Boolean(sandAt(r, c))
  );
}

export function mountPortion2PuzzleScene(container, options = {}) {
  const { mode = "narrative", screenId = "geography-puzzle-p2", onClose, onSolved } = options;
  const state = getState();
  logScreenEntry({
    participantId: state.participantId,
    condition: state.condition,
    phase: state.phase || "learning",
    screenId
  });

  const placements = new Map();
  let cursorR = PORTION2_START.row;
  let cursorC = PORTION2_START.col + 1;
  let selectedIdx = 0;
  let selectedRotation = 0;
  let solved = false;
  let flowTimeouts = [];

  const root = document.createElement("div");
  root.className = `puzzle-scene puzzle-scene--portion1 puzzle-scene--portion2 puzzle-scene--${mode}`;

  const title = document.createElement("h2");
  title.className = "puzzle-scene__title";
  title.textContent = "Beneath the surface";

  const intro = document.createElement("p");
  intro.className = "puzzle-scene__instr portion1-intro";
  intro.textContent =
    mode === "narrative"
      ? "The channel vanishes, but it does not end."
      : "Use sand teleport to connect source and exit.";

  const gridWrap = document.createElement("div");
  gridWrap.className = "portion1-grid-wrap";
  const gridEl = document.createElement("div");
  gridEl.className = "portion1-grid";
  gridEl.style.gridTemplateColumns = `repeat(${PORTION2_COLS}, minmax(52px, 64px))`;

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
      ? "<strong>You found it.</strong> <span>The hidden flow holds.</span>"
      : "<strong>Flow restored.</strong> <span>Subsurface channel connected.</span>";

  const controls = document.createElement("p");
  controls.className = "portion1-controls-hint";
  controls.innerHTML =
    "<kbd>Arrows</kbd> move · <kbd>1–9</kbd> pick · <kbd>Q/E</kbd> rotate -/+90° · <kbd>Enter</kbd> place · <kbd>Backspace</kbd> clear · <kbd>Space</kbd> test flow";

  function usedInvIds() {
    return new Set(Array.from(placements.values()).map((v) => v.id));
  }
  function key(r, c) {
    return `${r},${c}`;
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
    PORTION2_INVENTORY.forEach((piece, i) => {
      const slot = document.createElement("button");
      slot.type = "button";
      slot.className = "portion1-rack-slot";
      if (i === selectedIdx) slot.classList.add("portion1-rack-slot--selected");
      if (used.has(piece.id)) slot.classList.add("portion1-rack-slot--used");
      slot.dataset.idx = String(i);
      slot.title = piece.label;
      const inner = document.createElement("span");
      const rot = i === selectedIdx ? selectedRotation : 0;
      applyPortion2ArrowTile(inner, { kind: piece.kind, rotation: rot });
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

  function renderGrid() {
    gridEl.innerHTML = "";
    for (let r = 0; r < PORTION2_ROWS; r++) {
      for (let c = 0; c < PORTION2_COLS; c++) {
        const cell = document.createElement("div");
        cell.className = "geo-portion-cell";
        cell.dataset.r = String(r);
        cell.dataset.c = String(c);
        if (isBlocked(r, c)) {
          cell.classList.add("geo-portion-cell--rock");
        } else if (r === PORTION2_START.row && c === PORTION2_START.col) {
          cell.classList.add("geo-portion-cell--fixed", "geo-portion-cell--start");
          const inner = document.createElement("span");
          applyPortion2ArrowTile(inner, { fixed: "start" });
          cell.appendChild(inner);
        } else if (r === PORTION2_END.row && c === PORTION2_END.col) {
          cell.classList.add("geo-portion-cell--fixed", "geo-portion-cell--end");
          const inner = document.createElement("span");
          applyPortion2ArrowTile(inner, { fixed: "end" });
          cell.appendChild(inner);
        } else if (sandAt(r, c)) {
          cell.classList.add("geo-portion-cell--fixed", "geo-portion-cell--sand-teleport");
          const inner = document.createElement("span");
          const s = sandAt(r, c);
          applyPortion2ArrowTile(inner, {
            fixed: s.role === "entry" ? "sand-entry" : "sand-exit"
          });
          cell.appendChild(inner);
        } else {
          cell.classList.add("geo-portion-cell--sand");
          const placed = placements.get(key(r, c));
          if (placed) {
            const piece = PORTION2_INVENTORY.find((p) => p.id === placed.id);
            if (piece) {
              const inner = document.createElement("span");
              applyPortion2ArrowTile(inner, { kind: piece.kind, rotation: placed.rotation });
              cell.appendChild(inner);
            }
          }
        }
        if (r === cursorR && c === cursorC && !solved) cell.classList.add("geo-portion-cell--cursor");
        gridEl.appendChild(cell);
      }
    }
  }

  function updateStatus() {
    if (solved) {
      statusEl.textContent =
        mode === "narrative" ? "Hidden channel restored." : "Flow restored.";
      return;
    }
    statusEl.textContent = `Exact placements only (4 tiles) · ${placements.size}/4`;
  }

  function tryPlace() {
    if (solved) return;
    if (isFixed(cursorR, cursorC)) {
      playUiSfx("error");
      return;
    }
    const piece = PORTION2_INVENTORY[selectedIdx];
    if (!piece) return;
    if (usedInvIds().has(piece.id)) {
      playUiSfx("error");
      return;
    }
    const k = key(cursorR, cursorC);
    if (placements.has(k)) {
      playUiSfx("error");
      return;
    }
    placements.set(k, { id: piece.id, rotation: selectedRotation });
    playUiSfx("stone");
    renderGrid();
    renderRack();
    const chk = portion2CheckWin(placements);
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
    const k = key(cursorR, cursorC);
    if (placements.delete(k)) {
      playUiSfx("click");
      renderGrid();
      renderRack();
      updateStatus();
    }
  }

  function runFlowAnim(isWin) {
    clearFlowAnim();
    const { reachedEnd } = portion2Flood(placements);
    const order = isWin ? portion2CanonicalFlowOrder() : portion2FlowOrder(placements);
    const delay = 140;
    order.forEach((pos, i) => {
      const id = window.setTimeout(() => {
        const idx = pos.row * PORTION2_COLS + pos.col;
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
          mode === "narrative" ? "The hidden flow breaks." : "Flow interrupted.";
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
      cursorR = Math.min(PORTION2_ROWS - 1, cursorR + 1);
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
      cursorC = Math.min(PORTION2_COLS - 1, cursorC + 1);
      renderGrid();
      return;
    }
    const map = {
      Digit1: 0,
      Digit2: 1,
      Digit3: 2,
      Digit4: 3,
      Digit5: 4,
      Digit6: 5,
      Digit7: 6,
      Digit8: 7,
      Digit9: 8
    };
    const n = map[e.code];
    if (typeof n === "number" && n < PORTION2_INVENTORY.length) {
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
      const chk = portion2CheckWin(placements);
      runFlowAnim(chk.win);
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

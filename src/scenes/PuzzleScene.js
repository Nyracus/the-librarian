// src/scenes/PuzzleScene.js — geography_wing_01 (shared puzzle; presentation differs by mode)

import { PuzzleController } from "../puzzle/puzzleController.js";
import { getFlowVisitOrder } from "../puzzle/tileEngine.js";
import { floodReachable } from "../puzzle/tileEngine.js";
import { SOURCE, ENDPOINTS, SOLUTION_GRID } from "../puzzle/geographyWing01.js";
import { playUiSfx } from "../core/audioManager.js";
import { logScreenEntry } from "../core/logger.js";
import { getState } from "../core/state.js";
import { applyGeoRiverTileInner } from "../assets/geoRiverTileset.js";

/** Set false to use monospace glyphs only (no PNG). */
const USE_GEO_RIVER_SPRITES = true;

const KIND_LABEL = {
  straight: "━",
  corner: "┗",
  t_junction: "┳",
  cross: "╋",
  broken: "╎",
  blank: "·"
};

export function mountPuzzleScene(container, options = {}) {
  const {
    mode = "non-narrative",
    screenId = "geography-puzzle",
    onClose,
    onSolved
  } = options;

  const useSelectUi = mode === "non-narrative";
  const winMode = mode === "narrative" ? "connectivity" : "match-reference";

  const state = getState();
  logScreenEntry({
    participantId: state.participantId,
    condition: state.condition,
    phase: state.phase || "learning",
    screenId
  });

  const root = document.createElement("div");
  root.className = `puzzle-scene puzzle-scene--${mode}`;
  root.tabIndex = -1;

  const title = document.createElement("h2");
  title.className = "puzzle-scene__title";
  title.textContent = mode === "narrative" ? "Survey chamber" : "River reconstruction";

  const instr = document.createElement("div");
  instr.className = "puzzle-scene__instr";
  if (mode === "narrative") {
    const p1 = document.createElement("p");
    p1.textContent =
      "The river chart is broken — channels do not meet the springs or the outfalls.";
    const p2 = document.createElement("p");
    p2.textContent =
      "Click a tile to rotate it clockwise. Reconnect water from the source (cyan) to every outlet (orange).";
    instr.appendChild(p1);
    instr.appendChild(p2);
  } else {
    instr.innerHTML = `
      <p><strong>Goal:</strong> Rotate your tiles so they <strong>exactly match</strong> the reference map (same symbol and rotation in each cell). The cyan cell is the water source; orange cells are outlets.</p>
      <p><strong>Controls:</strong> <kbd>Arrow keys</kbd> or <kbd>WASD</kbd> move the highlight. Click a tile to select it. Use <strong>Rotate clockwise</strong> / <strong>Rotate counter-clockwise</strong>. Optional: <kbd>Q</kbd> = CCW, <kbd>E</kbd> = CW.</p>
    `;
  }

  const mid = document.createElement("p");
  mid.className = "puzzle-scene__mid";
  mid.textContent = "What is hidden still flows.";

  const gridEl = document.createElement("div");
  gridEl.className = "geo-grid";

  const statusEl = document.createElement("p");
  statusEl.className = "puzzle-scene__status";

  const controller = new PuzzleController({ screenId, winMode });
  let flowTimeouts = [];

  function clearFlowAnim() {
    flowTimeouts.forEach((id) => clearTimeout(id));
    flowTimeouts = [];
    gridEl.querySelectorAll(".geo-tile--flow").forEach((el) => el.classList.remove("geo-tile--flow"));
  }

  function renderReferenceGrid(targetEl) {
    targetEl.innerHTML = "";
    const g = SOLUTION_GRID;
    for (let r = 0; r < g.length; r++) {
      const row = document.createElement("div");
      row.className = "geo-grid__row";
      for (let c = 0; c < g[r].length; c++) {
        const cell = g[r][c];
        const tile = document.createElement("div");
        tile.className = "geo-tile geo-tile--reference";
        tile.dataset.kind = cell.kind;
        tile.dataset.rotation = String(cell.rotation);
        if (r === SOURCE.row && c === SOURCE.col) tile.classList.add("geo-tile--source");
        if (ENDPOINTS.some((p) => p.row === r && p.col === c)) {
          tile.classList.add("geo-tile--endpoint");
        }
        const inner = document.createElement("span");
        inner.className = "geo-tile__inner";
        inner.setAttribute("aria-hidden", "true");
        if (USE_GEO_RIVER_SPRITES) {
          tile.classList.add("geo-tile--river-pack");
          applyGeoRiverTileInner(inner, cell, {
            source: SOURCE,
            endpoints: ENDPOINTS,
            gridRow: r,
            gridCol: c
          });
        } else {
          inner.textContent = KIND_LABEL[cell.kind] || "?";
        }
        tile.appendChild(inner);
        row.appendChild(tile);
      }
      targetEl.appendChild(row);
    }
  }

  function renderGrid() {
    gridEl.innerHTML = "";
    const g = controller.grid;
    for (let r = 0; r < g.length; r++) {
      const row = document.createElement("div");
      row.className = "geo-grid__row";
      for (let c = 0; c < g[r].length; c++) {
        const cell = g[r][c];
        const tile = document.createElement("button");
        tile.type = "button";
        tile.className = "geo-tile";
        tile.dataset.kind = cell.kind;
        tile.dataset.rotation = String(cell.rotation);
        if (r === SOURCE.row && c === SOURCE.col) tile.classList.add("geo-tile--source");
        if (ENDPOINTS.some((p) => p.row === r && p.col === c)) {
          tile.classList.add("geo-tile--endpoint");
        }
        if (useSelectUi && r === controller.selectedRow && c === controller.selectedCol) {
          tile.classList.add("geo-tile--selected");
        }
        tile.setAttribute("aria-label", `Tile row ${r + 1} column ${c + 1}`);
        const inner = document.createElement("span");
        inner.className = "geo-tile__inner";
        inner.setAttribute("aria-hidden", "true");
        if (USE_GEO_RIVER_SPRITES) {
          tile.classList.add("geo-tile--river-pack");
          applyGeoRiverTileInner(inner, cell, {
            source: SOURCE,
            endpoints: ENDPOINTS,
            gridRow: r,
            gridCol: c
          });
        } else {
          inner.textContent = KIND_LABEL[cell.kind] || "?";
        }
        tile.appendChild(inner);
        tile.addEventListener("click", () => {
          if (controller.solved) return;
          playUiSfx("click");
          if (useSelectUi) {
            controller.setSelection(r, c);
          } else {
            controller.rotateAt(r, c);
          }
        });
        row.appendChild(tile);
      }
      gridEl.appendChild(row);
    }
  }

  function runFlowAnimation() {
    clearFlowAnim();
    const { allEndpointsReached } = floodReachable(
      controller.grid,
      controller.source,
      controller.endpoints
    );
    if (!allEndpointsReached) return;
    const order = getFlowVisitOrder(controller.grid, SOURCE);
    order.forEach((pos, i) => {
      const id = window.setTimeout(() => {
        const rows = gridEl.querySelectorAll(".geo-grid__row");
        const row = rows[pos.row];
        if (!row) return;
        const tiles = row.querySelectorAll(".geo-tile");
        const el = tiles[pos.col];
        if (el) {
          el.classList.add("geo-tile--flow");
          if (mode === "narrative") el.classList.add("geo-tile--glow");
        }
      }, i * (mode === "narrative" ? 120 : 60));
      flowTimeouts.push(id);
    });
  }

  function updateStatusText() {
    if (controller.solved) {
      statusEl.textContent =
        mode === "narrative" ? "The pattern is restored." : "Complete — matches reference.";
    } else if (useSelectUi) {
      statusEl.textContent = "Match the reference map exactly.";
    } else {
      statusEl.textContent = "Rotate tiles to connect all endpoints.";
    }
  }

  controller.on("change", () => {
    renderGrid();
    updateStatusText();
  });

  controller.on("solved", () => {
    playUiSfx("success");
    runFlowAnimation();
    if (typeof onSolved === "function") onSolved();
  });

  root.appendChild(title);
  root.appendChild(instr);
  if (mode === "narrative") root.appendChild(mid);

  if (useSelectUi) {
    const refSection = document.createElement("div");
    refSection.className = "puzzle-scene__ref-block";
    const refTitle = document.createElement("p");
    refTitle.className = "puzzle-scene__ref-title";
    refTitle.textContent = "Reference (target)";
    const refGrid = document.createElement("div");
    refGrid.className = "geo-grid geo-grid--reference";
    refSection.appendChild(refTitle);
    refSection.appendChild(refGrid);
    renderReferenceGrid(refGrid);

    const playBlock = document.createElement("div");
    playBlock.className = "puzzle-scene__play-block";
    const playTitle = document.createElement("p");
    playTitle.className = "puzzle-scene__ref-title";
    playTitle.textContent = "Your map";
    playBlock.appendChild(playTitle);
    playBlock.appendChild(gridEl);

    const controls = document.createElement("div");
    controls.className = "puzzle-scene__rotate-btns";
    const btnCw = document.createElement("button");
    btnCw.type = "button";
    btnCw.className = "btn btn--primary";
    btnCw.textContent = "Rotate clockwise";
    btnCw.addEventListener("click", () => {
      if (controller.solved) return;
      playUiSfx("click");
      controller.rotateSelected(1);
    });
    const btnCcw = document.createElement("button");
    btnCcw.type = "button";
    btnCcw.className = "btn btn--ghost";
    btnCcw.textContent = "Rotate counter-clockwise";
    btnCcw.addEventListener("click", () => {
      if (controller.solved) return;
      playUiSfx("click");
      controller.rotateSelected(-1);
    });
    controls.appendChild(btnCcw);
    controls.appendChild(btnCw);
    playBlock.appendChild(controls);

    const panels = document.createElement("div");
    panels.className = "puzzle-scene__panels";
    panels.appendChild(refSection);
    panels.appendChild(playBlock);
    root.appendChild(panels);
  } else {
    root.appendChild(gridEl);
  }

  root.appendChild(statusEl);

  if (typeof onClose === "function") {
    const back = document.createElement("button");
    back.type = "button";
    back.className = "btn btn--ghost puzzle-scene__back";
    back.textContent = useSelectUi ? "Back to Library Hub" : "Close";
    back.addEventListener("click", () => {
      controller.destroy();
      clearFlowAnim();
      window.removeEventListener("keydown", keyNavHandler);
      onClose();
    });
    root.appendChild(back);
  }

  function keyNavHandler(e) {
    if (!useSelectUi || controller.solved) return;
    const tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || e.target?.isContentEditable) return;

    const key = e.code;
    const moves = {
      ArrowUp: [-1, 0],
      KeyW: [-1, 0],
      ArrowDown: [1, 0],
      KeyS: [1, 0],
      ArrowLeft: [0, -1],
      KeyA: [0, -1],
      ArrowRight: [0, 1],
      KeyD: [0, 1]
    };
    if (moves[key]) {
      e.preventDefault();
      playUiSfx("click");
      controller.moveSelection(moves[key][0], moves[key][1]);
      return;
    }
    if (key === "KeyQ") {
      e.preventDefault();
      playUiSfx("click");
      controller.rotateSelected(-1);
      return;
    }
    if (key === "KeyE") {
      e.preventDefault();
      playUiSfx("click");
      controller.rotateSelected(1);
    }
  }

  if (useSelectUi) {
    window.addEventListener("keydown", keyNavHandler);
  }

  container.appendChild(root);
  renderGrid();
  updateStatusText();

  return {
    controller,
    destroy() {
      window.removeEventListener("keydown", keyNavHandler);
      controller.destroy();
      clearFlowAnim();
      root.remove();
    }
  };
}

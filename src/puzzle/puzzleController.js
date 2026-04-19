// src/puzzle/puzzleController.js — geography_wing_01

import { floodReachable, rotateTileCellBy } from "./tileEngine.js";
import {
  GEOGRAPHY_WING_01_ID,
  createInitialGrid,
  SOURCE,
  ENDPOINTS,
  gridMatchesSolution,
  SOLUTION_GRID
} from "./geographyWing01.js";
import { logEvent } from "../core/logger.js";
import { getState } from "../core/state.js";

export class PuzzleController {
  constructor(options = {}) {
    this.puzzleId = GEOGRAPHY_WING_01_ID;
    this.winMode = options.winMode || "match-reference";
    this.grid = options.initialGrid || createInitialGrid(this.winMode);
    this.source = SOURCE;
    this.endpoints = ENDPOINTS;
    this.startTime = performance.now();
    this.incorrectStateCount = 0;
    this.rotationCount = 0;
    this.placementCount = 0;
    this.solved = false;
    this.listeners = [];
    this.screenId = options.screenId || "geography-puzzle";
    this.selectedRow = 0;
    this.selectedCol = 0;
  }

  getStateSnapshot() {
    const { visited, allEndpointsReached } = floodReachable(
      this.grid,
      this.source,
      this.endpoints
    );
    return { visited, allEndpointsReached };
  }

  matchesTarget() {
    return gridMatchesSolution(this.grid, SOLUTION_GRID);
  }

  setSelection(row, col) {
    if (this.solved) return;
    const rows = this.grid.length;
    const cols = this.grid[0]?.length || 0;
    if (row < 0 || row >= rows || col < 0 || col >= cols) return;
    this.selectedRow = row;
    this.selectedCol = col;
    this.emit("change", { grid: this.grid, solved: this.solved, selection: true });
  }

  moveSelection(dr, dc) {
    if (this.solved) return;
    const rows = this.grid.length;
    const cols = this.grid[0]?.length || 0;
    this.selectedRow = Math.max(0, Math.min(rows - 1, this.selectedRow + dr));
    this.selectedCol = Math.max(0, Math.min(cols - 1, this.selectedCol + dc));
    this.emit("change", { grid: this.grid, solved: this.solved, selection: true });
  }

  rotateSelected(quarterTurns) {
    this.rotateCell(this.selectedRow, this.selectedCol, quarterTurns);
  }

  /** Narrative / click: rotate one cell clockwise once. */
  rotateAt(row, col) {
    this.rotateCell(row, col, 1);
  }

  rotateCell(row, col, quarterTurns) {
    if (this.solved) return;
    const cell = this.grid[row][col];
    this.grid[row][col] = rotateTileCellBy(cell, quarterTurns);
    this.rotationCount += 1;

    const s = getState();
    logEvent({
      participantId: s.participantId,
      condition: s.condition,
      phase: s.phase || "learning",
      screenId: this.screenId,
      itemId: `${this.puzzleId}_rotate`,
      response: {
        type: "puzzle-tile-rotate",
        puzzleId: this.puzzleId,
        row,
        col,
        quarterTurns,
        rotation: this.grid[row][col].rotation,
        kind: this.grid[row][col].kind
      },
      correctness: null,
      responseTimeMs: Math.round(performance.now() - this.startTime)
    });

    const won = this.checkWin();
    if (!won && !this.solved) {
      this.incorrectStateCount += 1;
    }

    if (won) {
      this.complete();
    }

    this.emit("change", { grid: this.grid, solved: this.solved });
    if (this.solved) {
      this.emit("solved", { elapsed: Math.round(performance.now() - this.startTime) });
    }
  }

  checkWin() {
    if (this.winMode === "connectivity") {
      return floodReachable(this.grid, this.source, this.endpoints).allEndpointsReached;
    }
    return this.matchesTarget();
  }

  /** Optional: place tile (same grid for now — counts as placement op for logging) */
  placeAt(row, col, kind) {
    if (this.solved) return;
    this.grid[row][col] = { kind, rotation: this.grid[row][col].rotation || 0 };
    this.placementCount += 1;
    const s = getState();
    logEvent({
      participantId: s.participantId,
      condition: s.condition,
      phase: s.phase || "learning",
      screenId: this.screenId,
      itemId: `${this.puzzleId}_place`,
      response: {
        type: "puzzle-tile-place",
        puzzleId: this.puzzleId,
        row,
        col,
        kind
      },
      correctness: null,
      responseTimeMs: Math.round(performance.now() - this.startTime)
    });
    const won = this.checkWin();
    if (!won && !this.solved) this.incorrectStateCount += 1;
    if (won) this.complete();
    this.emit("change", { grid: this.grid, solved: this.solved });
    if (this.solved) {
      this.emit("solved", { elapsed: Math.round(performance.now() - this.startTime) });
    }
  }

  complete() {
    if (this.solved) return;
    this.solved = true;
    const elapsed = Math.round(performance.now() - this.startTime);
    const s = getState();
    logEvent({
      participantId: s.participantId,
      condition: s.condition,
      phase: s.phase || "learning",
      screenId: this.screenId,
      itemId: `${this.puzzleId}_complete`,
      response: {
        type: "puzzle-complete",
        puzzleId: this.puzzleId,
        timeToCompletionMs: elapsed,
        rotationCount: this.rotationCount,
        placementCount: this.placementCount,
        incorrectStateCount: this.incorrectStateCount
      },
      correctness: true,
      responseTimeMs: elapsed
    });
  }

  on(event, fn) {
    this.listeners.push({ event, fn });
  }

  emit(event, payload) {
    this.listeners.filter((l) => l.event === event).forEach((l) => l.fn(payload));
  }

  destroy() {
    this.listeners = [];
  }
}

// Portion 1 — "The First Leak": 4×4 placement puzzle (unique exact solution).
// Coordinates in this module: row and col are 0-based (top-left = 0,0).
// Handoff 1-based: column x, row y → col = x - 1, row = y - 1.

import { getTileEdges } from "./tileTypes.js";

export const PORTION1_PUZZLE_ID = "geography_wing_01_portion_1";

export const PORTION1_ROWS = 4;
export const PORTION1_COLS = 4;

/** Fixed cells (0-based) */
export const PORTION1_START = { row: 0, col: 0 };
export const PORTION1_END = { row: 3, col: 3 };
/** Blocked — 1-based (2,2) */
export const PORTION1_BLOCKED = [{ row: 1, col: 1 }];

/**
 * Five unique rack pieces. The unique path uses three straights and two corners
 * (handoff text listed three corners — geometry requires three straights).
 * Win rule: placements must match PORTION1_SOLUTION exactly (cell, kind, rotation).
 */
export const PORTION1_INVENTORY = [
  { id: "s1", label: "Straight", kind: "straight" },
  { id: "s2", label: "Straight", kind: "straight" },
  { id: "s3", label: "Straight", kind: "straight" },
  { id: "c1", label: "Corner", kind: "corner" },
  { id: "c2", label: "Corner", kind: "corner" }
];

const F = { v: false, h: false };
const T = { v: true, h: false };

/**
 * Portion 1 rotation convention (does not change global tileTypes — other puzzles keep legacy edges).
 * 0° straight = horizontal (E–W). 0° corner = open E+S ("right + down").
 * 90° straight = vertical. 90° corner = S+W ("down + left").
 * 180° corner = W+N. 270° corner = N+E.
 */
const P1_STRAIGHT = {
  0: [F, T, F, T],
  90: [T, F, T, F],
  180: [F, T, F, T],
  270: [T, F, T, F]
};

const P1_CORNER = {
  0: [F, T, T, F],
  90: [F, F, T, T],
  180: [T, F, F, T],
  270: [T, T, F, F]
};

/**
 * Which sides are open (N,E,S,W) — matches flood / win logic.
 * @param {string} kind straight | corner | start | end
 * @param {number} [rotationDeg]
 * @returns {[boolean,boolean,boolean,boolean]}
 */
export function portion1OpenSidesNEWS(kind, rotationDeg) {
  if (kind === "start") return [false, true, false, false];
  if (kind === "end") return [false, false, false, true];
  const r = portion1NormalizeRotation(rotationDeg ?? 0);
  const edges =
    kind === "straight"
      ? P1_STRAIGHT[r]
      : kind === "corner"
        ? P1_CORNER[r]
        : null;
  if (!edges) return [false, false, false, false];
  return edges.map((e) => e.v);
}

/** @param {number} deg */
export function portion1NormalizeRotation(deg) {
  const step = Math.round(Number(deg) / 90) % 4;
  const s = step < 0 ? step + 4 : step;
  return s * 90;
}

function getPortion1TileEdges(kind, rotationDeg) {
  const r = portion1NormalizeRotation(rotationDeg);
  if (kind === "straight") {
    const e = P1_STRAIGHT[r];
    return e.map((x) => ({ ...x }));
  }
  if (kind === "corner") {
    const e = P1_CORNER[r];
    return e.map((x) => ({ ...x }));
  }
  return getTileEdges(kind, rotationDeg);
}

const DIR = [
  { dr: -1, dc: 0, fromEdge: 0, toEdge: 2 },
  { dr: 0, dc: 1, fromEdge: 1, toEdge: 3 },
  { dr: 1, dc: 0, fromEdge: 2, toEdge: 0 },
  { dr: 0, dc: -1, fromEdge: 3, toEdge: 1 }
];

function isBlocked(r, c) {
  return PORTION1_BLOCKED.some((b) => b.row === r && b.col === c);
}

/**
 * Unique winning board: 1-based (col,row) → rotation in Portion 1 convention.
 * Note: prose sometimes says (3,1) corner 180°; under this edge table the bend
 * that turns E→S after the first straight is 90° (S+W). 180° would be W+N and
 * would not connect downward into column 3.
 */
export const PORTION1_SOLUTION = [
  { row: 0, col: 1, kind: "straight", rotation: 0 },
  { row: 0, col: 2, kind: "corner", rotation: 90 },
  { row: 1, col: 2, kind: "straight", rotation: 90 },
  { row: 2, col: 2, kind: "straight", rotation: 90 },
  { row: 3, col: 2, kind: "corner", rotation: 270 }
];

/** Canonical flow path (0-based) for animation after exact win — source → exit. */
export const PORTION1_CANONICAL_FLOW = [
  { row: 0, col: 0 },
  { row: 0, col: 1 },
  { row: 0, col: 2 },
  { row: 1, col: 2 },
  { row: 2, col: 2 },
  { row: 3, col: 2 },
  { row: 3, col: 3 }
];

function blockHidden(edges) {
  return edges.map((e) => ({ v: Boolean(e?.v), h: false }));
}

/** Edges for start/end/fixed; placed tiles use Portion 1 rotation table. */
function getFixedEdges(cell) {
  if (cell.kind === "start") {
    return [F, T, F, F];
  }
  if (cell.kind === "end") {
    // Enter from the west (last piece exits east into this cell).
    return [F, F, F, T];
  }
  if (cell.kind === "blocked" || cell === null) {
    return [F, F, F, F];
  }
  return blockHidden(getPortion1TileEdges(cell.kind, cell.rotation));
}

/**
 * @param {Map<string, { id: string, rotation: number }>} placements
 */
export function buildPortion1Cell(r, c, placements) {
  if (r === PORTION1_START.row && c === PORTION1_START.col) {
    return { kind: "start", rotation: 0, fixed: "start" };
  }
  if (r === PORTION1_END.row && c === PORTION1_END.col) {
    return { kind: "end", rotation: 0, fixed: "end" };
  }
  if (isBlocked(r, c)) {
    return { kind: "blocked", rotation: 0, fixed: "blocked" };
  }
  const key = `${r},${c}`;
  const placed = placements.get(key);
  if (!placed) return null;
  const piece = PORTION1_INVENTORY.find((p) => p.id === placed.id);
  if (!piece) return null;
  return {
    kind: piece.kind,
    rotation: Number.isFinite(placed.rotation) ? placed.rotation : 0,
    invId: piece.id
  };
}

/**
 * @param {Map<string, { id: string, rotation: number }>} placements
 */
export function portion1Flood(placements) {
  const rows = PORTION1_ROWS;
  const cols = PORTION1_COLS;
  const grid = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      row.push(buildPortion1Cell(r, c, placements));
    }
    grid.push(row);
  }

  const sr = PORTION1_START.row;
  const sc = PORTION1_START.col;
  const er = PORTION1_END.row;
  const ec = PORTION1_END.col;

  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const queue = [[sr, sc]];
  visited[sr][sc] = true;

  while (queue.length) {
    const [r, c] = queue.shift();
    const cell = grid[r][c];
    if (!cell || cell.kind === "blocked") continue;
    const edges = getFixedEdges(cell);

    for (const d of DIR) {
      const nr = r + d.dr;
      const nc = c + d.dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (visited[nr][nc]) continue;
      const neighbor = grid[nr][nc];
      if (!neighbor || neighbor.kind === "blocked") continue;

      const outEdge = edges[d.fromEdge];
      const nEdges = getFixedEdges(neighbor);
      const inEdge = nEdges[d.toEdge];
      if (outEdge.v && inEdge.v) {
        visited[nr][nc] = true;
        queue.push([nr, nc]);
      }
    }
  }

  const reachedEnd = visited[er][ec];
  return { visited, grid, reachedEnd };
}

function solutionKeys() {
  return new Set(PORTION1_SOLUTION.map((s) => `${s.row},${s.col}`));
}

/**
 * Victory only when all five placements match solution coordinates, kinds, and rotations.
 * @param {Map<string, { id: string, rotation: number }>} placements
 */
export function portion1MatchesExactSolution(placements) {
  if (placements.size !== PORTION1_SOLUTION.length) return false;
  const keys = solutionKeys();
  for (const exp of PORTION1_SOLUTION) {
    const key = `${exp.row},${exp.col}`;
    const placed = placements.get(key);
    if (!placed) return false;
    const piece = PORTION1_INVENTORY.find((p) => p.id === placed.id);
    if (!piece || piece.kind !== exp.kind) return false;
    if (portion1NormalizeRotation(placed.rotation) !== portion1NormalizeRotation(exp.rotation)) {
      return false;
    }
  }
  for (const k of placements.keys()) {
    if (!keys.has(k)) return false;
  }
  return true;
}

/**
 * @param {Map<string, { id: string, rotation: number }>} placements
 */
export function portion1CheckWin(placements) {
  return portion1MatchesExactSolution(placements)
    ? { win: true, reason: "exact" }
    : { win: false, reason: "nomatch" };
}

/** BFS order from start (for Space “test flow” on partial boards). */
export function portion1FlowOrder(placements) {
  const rows = PORTION1_ROWS;
  const cols = PORTION1_COLS;
  const grid = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      row.push(buildPortion1Cell(r, c, placements));
    }
    grid.push(row);
  }

  const sr = PORTION1_START.row;
  const sc = PORTION1_START.col;
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const order = [];
  const queue = [[sr, sc]];
  visited[sr][sc] = true;

  while (queue.length) {
    const [r, c] = queue.shift();
    order.push({ row: r, col: c });
    const cell = grid[r][c];
    if (!cell || cell.kind === "blocked") continue;
    const edges = getFixedEdges(cell);

    for (const d of DIR) {
      const nr = r + d.dr;
      const nc = c + d.dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (visited[nr][nc]) continue;
      const neighbor = grid[nr][nc];
      if (!neighbor || neighbor.kind === "blocked") continue;
      const outEdge = edges[d.fromEdge];
      const nEdges = getFixedEdges(neighbor);
      const inEdge = nEdges[d.toEdge];
      if (outEdge.v && inEdge.v) {
        visited[nr][nc] = true;
        queue.push([nr, nc]);
      }
    }
  }
  return order;
}

/** Use after exact win so animation follows the intended path. */
export function portion1CanonicalFlowOrder() {
  return PORTION1_CANONICAL_FLOW.map((p) => ({ ...p }));
}

/** Design handoff (1-based x=column, y=row). Inventory matches geometry: 3 straight, 2 corner. */
export const PORTION1_HANDOFF = {
  puzzleId: PORTION1_PUZZLE_ID,
  grid: {
    cols: 4,
    rows: 4,
    fixed: [
      { x: 1, y: 1, type: "start" },
      { x: 4, y: 4, type: "end" },
      { x: 2, y: 2, type: "blocked" }
    ]
  },
  inventory: [
    { tile: "straight", count: 3 },
    { tile: "corner", count: 2 }
  ],
  solution: [
    { x: 2, y: 1, tile: "straight", rotation: 0 },
    { x: 3, y: 1, tile: "corner", rotation: 90 },
    { x: 3, y: 2, tile: "straight", rotation: 90 },
    { x: 3, y: 3, tile: "straight", rotation: 90 },
    { x: 3, y: 4, tile: "corner", rotation: 270 }
  ],
  winRule:
    "Victory only if all five placements exactly match solution coordinates, tile kinds, and rotations (no connectivity-only check)."
};

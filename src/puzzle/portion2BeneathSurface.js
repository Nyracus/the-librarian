// Portion 2 — "Beneath the Surface" (unique-solution build): 6x6 + sand teleport.
// Coordinates in code are 0-based: row, col. (Spec 1-based x,y → col=x-1, row=y-1.)

import { getTileEdges } from "./tileTypes.js";

export const PORTION2_PUZZLE_ID = "geo_p2_unique";
export const PORTION2_ROWS = 6;
export const PORTION2_COLS = 6;

export const PORTION2_START = { row: 2, col: 0 };
export const PORTION2_END = { row: 1, col: 5 };

/** Funnel: force sand entry from the west; block bypasses (see design doc). */
export const PORTION2_BLOCKED = [
  { row: 1, col: 1 },
  { row: 3, col: 1 },
  { row: 2, col: 3 },
  { row: 1, col: 3 },
  { row: 3, col: 3 }
];

// Sand A: entry accepts from west; exit sends south (1-based x5,y1 → row0 col4).
export const PORTION2_SANDS = [
  { row: 2, col: 2, pair: "A", role: "entry" },
  { row: 0, col: 4, pair: "A", role: "exit" }
];

/**
 * Tight inventory: 2 straight, 3 corner, 1 T (trap). Exactly 4 placements win; 2 pieces unused.
 * Order matches rack keys 1–6.
 */
export const PORTION2_INVENTORY = [
  { id: "s1", label: "Straight", kind: "straight" },
  { id: "s2", label: "Straight", kind: "straight" },
  { id: "c1", label: "Corner", kind: "corner" },
  { id: "c2", label: "Corner", kind: "corner" },
  { id: "c3", label: "Corner", kind: "corner" },
  { id: "t1", label: "T (trap)", kind: "t_junction" }
];

/**
 * Exact win: these cells, kinds, rotations, and inventory ids.
 * Rotations follow tileTypes.js (straight 0 = vertical N–S, 90 = horizontal E–W).
 */
export const PORTION2_SOLUTION = [
  { row: 2, col: 1, id: "s1", kind: "straight", rotation: 90 },
  { row: 1, col: 4, id: "s2", kind: "straight", rotation: 0 },
  // Corner 0 @ (2,4): N+E (from sand column into eastward run). Corner 270 @ (2,5): N+W (west from bend, north into end).
  { row: 2, col: 4, id: "c1", kind: "corner", rotation: 0 },
  { row: 2, col: 5, id: "c2", kind: "corner", rotation: 270 }
];

export const PORTION2_CANONICAL_FLOW = [
  { row: 2, col: 0 },
  { row: 2, col: 1 },
  { row: 2, col: 2 },
  { row: 0, col: 4 },
  { row: 1, col: 4 },
  { row: 2, col: 4 },
  { row: 2, col: 5 },
  { row: 1, col: 5 }
];

const DIR = [
  { dr: -1, dc: 0, fromEdge: 0, toEdge: 2 },
  { dr: 0, dc: 1, fromEdge: 1, toEdge: 3 },
  { dr: 1, dc: 0, fromEdge: 2, toEdge: 0 },
  { dr: 0, dc: -1, fromEdge: 3, toEdge: 1 }
];

const F = { v: false, h: false };
const T = { v: true, h: false };

function normalizeRotation(deg) {
  const step = Math.round(Number(deg) / 90) % 4;
  const s = step < 0 ? step + 4 : step;
  return s * 90;
}

function samePos(a, b) {
  return a.row === b.row && a.col === b.col;
}

function sandAt(r, c) {
  return PORTION2_SANDS.find((s) => s.row === r && s.col === c) || null;
}

function isBlocked(r, c) {
  return PORTION2_BLOCKED.some((b) => b.row === r && b.col === c);
}

function pairForSand(cell) {
  if (!cell || cell.kind !== "sand") return null;
  return PORTION2_SANDS.find(
    (s) => s.pair === cell.pair && s.role !== cell.fixedRole
  ) || null;
}

export function portion2OpenSidesNEWS(kind, rotationDeg, fixedRole = "") {
  if (kind === "start") return [false, true, false, false]; // out east
  // End only accepts flow from the cell below (south); last tile connects north into end.
  if (kind === "end") return [false, false, true, false]; // in from south
  if (kind === "sand" && fixedRole === "entry") return [false, false, false, true];
  if (kind === "sand" && fixedRole === "exit") return [false, false, true, false];
  if (kind === "blocked") return [false, false, false, false];

  const edges = getTileEdges(kind, normalizeRotation(rotationDeg ?? 0));
  return edges.map((e) => Boolean(e?.v));
}

function edgeObjectsFromMask(mask) {
  return mask.map((v) => (v ? T : F));
}

function getEdges(cell) {
  if (!cell) return [F, F, F, F];
  return edgeObjectsFromMask(
    portion2OpenSidesNEWS(cell.kind, cell.rotation, cell.fixedRole || "")
  );
}

/**
 * @param {Map<string, { id: string, rotation: number }>} placements
 */
export function buildPortion2Cell(r, c, placements) {
  if (samePos({ row: r, col: c }, PORTION2_START)) {
    return { kind: "start", rotation: 0, fixed: "start" };
  }
  if (samePos({ row: r, col: c }, PORTION2_END)) {
    return { kind: "end", rotation: 0, fixed: "end" };
  }
  if (isBlocked(r, c)) {
    return { kind: "blocked", rotation: 0, fixed: "blocked" };
  }
  const sand = sandAt(r, c);
  if (sand) {
    return {
      kind: "sand",
      rotation: 0,
      fixed: "sand",
      fixedRole: sand.role,
      pair: sand.pair
    };
  }
  const key = `${r},${c}`;
  const placed = placements.get(key);
  if (!placed) return null;
  const piece = PORTION2_INVENTORY.find((p) => p.id === placed.id);
  if (!piece) return null;
  return {
    kind: piece.kind,
    rotation: Number.isFinite(placed.rotation) ? placed.rotation : 0,
    invId: piece.id
  };
}

function buildGrid(placements) {
  const grid = [];
  for (let r = 0; r < PORTION2_ROWS; r++) {
    const row = [];
    for (let c = 0; c < PORTION2_COLS; c++) {
      row.push(buildPortion2Cell(r, c, placements));
    }
    grid.push(row);
  }
  return grid;
}

/**
 * Flood with teleport support.
 * @param {Map<string, { id: string, rotation: number }>} placements
 */
export function portion2Flood(placements) {
  const grid = buildGrid(placements);
  const visited = Array.from({ length: PORTION2_ROWS }, () =>
    Array(PORTION2_COLS).fill(false)
  );
  const queue = [[PORTION2_START.row, PORTION2_START.col]];
  visited[PORTION2_START.row][PORTION2_START.col] = true;
  const order = [];

  while (queue.length) {
    const [r, c] = queue.shift();
    order.push({ row: r, col: c });
    const cell = grid[r][c];
    if (!cell || cell.kind === "blocked") continue;

    if (cell.kind === "sand") {
      const p = pairForSand(cell);
      if (p && !visited[p.row][p.col]) {
        visited[p.row][p.col] = true;
        queue.push([p.row, p.col]);
      }
    }

    const edges = getEdges(cell);
    for (const d of DIR) {
      const nr = r + d.dr;
      const nc = c + d.dc;
      if (nr < 0 || nr >= PORTION2_ROWS || nc < 0 || nc >= PORTION2_COLS) continue;
      if (visited[nr][nc]) continue;
      const n = grid[nr][nc];
      if (!n || n.kind === "blocked") continue;
      const outEdge = edges[d.fromEdge];
      const inEdge = getEdges(n)[d.toEdge];
      if (outEdge.v && inEdge.v) {
        visited[nr][nc] = true;
        queue.push([nr, nc]);
      }
    }
  }

  return {
    visited,
    grid,
    order,
    reachedEnd: visited[PORTION2_END.row][PORTION2_END.col]
  };
}

function solutionKeys() {
  return new Set(PORTION2_SOLUTION.map((s) => `${s.row},${s.col}`));
}

/**
 * Exact placement + rotation check.
 * @param {Map<string, { id: string, rotation: number }>} placements
 */
export function portion2MatchesExactSolution(placements) {
  if (placements.size !== PORTION2_SOLUTION.length) return false;
  const keys = solutionKeys();
  for (const exp of PORTION2_SOLUTION) {
    const key = `${exp.row},${exp.col}`;
    const placed = placements.get(key);
    if (!placed) return false;
    if (exp.id && placed.id !== exp.id) return false;
    const piece = PORTION2_INVENTORY.find((p) => p.id === placed.id);
    if (!piece || piece.kind !== exp.kind) return false;
    if (normalizeRotation(placed.rotation) !== normalizeRotation(exp.rotation)) return false;
  }
  for (const k of placements.keys()) {
    if (!keys.has(k)) return false;
  }
  return true;
}

/**
 * Win requires both exact layout and valid flow through teleport to endpoint.
 * @param {Map<string, { id: string, rotation: number }>} placements
 */
export function portion2CheckWin(placements) {
  if (!portion2MatchesExactSolution(placements)) {
    return { win: false, reason: "nomatch" };
  }
  const flow = portion2Flood(placements);
  return flow.reachedEnd ? { win: true, reason: "exact-and-flow" } : { win: false, reason: "noflow" };
}

export function portion2FlowOrder(placements) {
  return portion2Flood(placements).order;
}

export function portion2CanonicalFlowOrder() {
  return PORTION2_CANONICAL_FLOW.map((p) => ({ ...p }));
}

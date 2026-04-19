// src/puzzle/geography_wing01.js
// Puzzle id: geography_wing_01 — 5×5 river reconstruction (solvable layout)

import { TILE_KIND } from "./tileTypes.js";
import { floodReachable } from "./tileEngine.js";

export const GEOGRAPHY_WING_01_ID = "geography_wing_01";

/**
 * Tile kinds per cell (fixed). Rotations are what the player adjusts.
 * Layout: source (0,0) connects along row 0 to endpoint (0,4); branch at (0,2)
 * goes down column 2 to (4,2), then to endpoint (4,4). Unused cells are blank.
 */
const KINDS = [
  [
    TILE_KIND.CORNER,
    TILE_KIND.STRAIGHT,
    TILE_KIND.CROSS,
    TILE_KIND.STRAIGHT,
    TILE_KIND.STRAIGHT
  ],
  [
    TILE_KIND.BLANK,
    TILE_KIND.BLANK,
    TILE_KIND.STRAIGHT,
    TILE_KIND.BLANK,
    TILE_KIND.BLANK
  ],
  [
    TILE_KIND.BLANK,
    TILE_KIND.BLANK,
    TILE_KIND.STRAIGHT,
    TILE_KIND.BLANK,
    TILE_KIND.BLANK
  ],
  [
    TILE_KIND.BLANK,
    TILE_KIND.BLANK,
    TILE_KIND.STRAIGHT,
    TILE_KIND.BLANK,
    TILE_KIND.BLANK
  ],
  [
    TILE_KIND.BLANK,
    TILE_KIND.BLANK,
    TILE_KIND.CORNER,
    TILE_KIND.STRAIGHT,
    TILE_KIND.STRAIGHT
  ]
];

/** Authoritative target rotations (degrees). Win = player grid matches this exactly. */
export const SOLUTION_GRID = KINDS.map((row, r) =>
  row.map((kind, c) => {
    const solutionRotations = [
      [0, 90, 0, 90, 90],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 90, 90]
    ];
    return { kind, rotation: solutionRotations[r][c] };
  })
);

export function gridMatchesSolution(grid, solution = SOLUTION_GRID) {
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const a = grid[r][c];
      const b = solution[r][c];
      if (a.kind !== b.kind || a.rotation !== b.rotation) return false;
    }
  }
  return true;
}

function cloneGrid(g) {
  return g.map((row) => row.map((cell) => ({ ...cell })));
}

/** Scramble by random 90° twists while water still reaches all endpoints (narrative mode). */
function createConnectivityScramble() {
  let grid = cloneGrid(SOLUTION_GRID);
  const targetTwists = 12 + Math.floor(Math.random() * 10);
  let twists = 0;
  let guard = 0;
  while (twists < targetTwists && guard++ < 400) {
    const r = Math.floor(Math.random() * 5);
    const c = Math.floor(Math.random() * 5);
    const trial = cloneGrid(grid);
    trial[r][c] = {
      ...trial[r][c],
      rotation: (trial[r][c].rotation + 90) % 360
    };
    if (!floodReachable(trial, SOURCE, ENDPOINTS).allEndpointsReached) continue;
    grid = trial;
    twists += 1;
  }
  if (gridMatchesSolution(grid, SOLUTION_GRID)) {
    for (let attempt = 0; attempt < 80; attempt++) {
      const r = Math.floor(Math.random() * 5);
      const c = Math.floor(Math.random() * 5);
      const trial = cloneGrid(grid);
      trial[r][c] = {
        ...trial[r][c],
        rotation: (trial[r][c].rotation + 90) % 360
      };
      if (
        floodReachable(trial, SOURCE, ENDPOINTS).allEndpointsReached &&
        !gridMatchesSolution(trial, SOLUTION_GRID)
      ) {
        grid = trial;
        break;
      }
    }
  }
  return grid;
}

/**
 * @param {"match-reference"|"connectivity"} winMode
 * match-reference: random twists mod 90° (may disconnect; win = exact SOLUTION_GRID).
 * connectivity: twists that keep endpoints reachable (narrative).
 */
export function createInitialGrid(winMode = "match-reference") {
  if (winMode === "connectivity") {
    return createConnectivityScramble();
  }
  const grid = cloneGrid(SOLUTION_GRID);
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const k = 1 + Math.floor(Math.random() * 3);
      grid[r][c].rotation = (SOLUTION_GRID[r][c].rotation + 90 * k) % 360;
    }
  }
  let guard = 0;
  while (gridMatchesSolution(grid, SOLUTION_GRID) && guard++ < 50) {
    const r = Math.floor(Math.random() * 5);
    const c = Math.floor(Math.random() * 5);
    grid[r][c].rotation = (grid[r][c].rotation + 90) % 360;
  }
  return grid;
}

export const SOURCE = { row: 0, col: 0 };
export const ENDPOINTS = [
  { row: 4, col: 4 },
  { row: 0, col: 4 }
];

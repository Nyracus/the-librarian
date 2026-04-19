// src/puzzle/tileEngine.js

import { getTileEdges, edgesConnect } from "./tileTypes.js";

const DIR = [
  { dr: -1, dc: 0, fromEdge: 0, toEdge: 2 },
  { dr: 0, dc: 1, fromEdge: 1, toEdge: 3 },
  { dr: 1, dc: 0, fromEdge: 2, toEdge: 0 },
  { dr: 0, dc: -1, fromEdge: 3, toEdge: 1 }
];

/**
 * @param {Array<Array<{ kind: string, rotation: number }>>} grid
 * @param {{ row: number, col: number }} source
 * @param {Array<{ row: number, col: number }>} endpoints
 */
export function floodReachable(grid, source, endpoints) {
  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  const visited = rows
    ? Array.from({ length: rows }, () => Array(cols).fill(false))
    : [];
  const queue = [[source.row, source.col]];
  visited[source.row][source.col] = true;

  while (queue.length) {
    const [r, c] = queue.shift();
    const cell = grid[r][c];
    const edges = getTileEdges(cell.kind, cell.rotation);

    for (const d of DIR) {
      const nr = r + d.dr;
      const nc = c + d.dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (visited[nr][nc]) continue;

      const outEdge = edges[d.fromEdge];
      const neighbor = grid[nr][nc];
      const nEdges = getTileEdges(neighbor.kind, neighbor.rotation);
      const inEdge = nEdges[d.toEdge];

      if (edgesConnect(outEdge, inEdge)) {
        visited[nr][nc] = true;
        queue.push([nr, nc]);
      }
    }
  }

  const reached = endpoints.filter((p) => visited[p.row]?.[p.col]);
  return { visited, reached, allEndpointsReached: reached.length === endpoints.length };
}

/** BFS order from source for flow animation */
export function getFlowVisitOrder(grid, source) {
  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const order = [];
  const queue = [[source.row, source.col]];
  visited[source.row][source.col] = true;

  while (queue.length) {
    const [r, c] = queue.shift();
    order.push({ row: r, col: c });
    const cell = grid[r][c];
    const edges = getTileEdges(cell.kind, cell.rotation);

    for (const d of DIR) {
      const nr = r + d.dr;
      const nc = c + d.dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (visited[nr][nc]) continue;

      const outEdge = edges[d.fromEdge];
      const neighbor = grid[nr][nc];
      const nEdges = getTileEdges(neighbor.kind, neighbor.rotation);
      const inEdge = nEdges[d.toEdge];

      if (edgesConnect(outEdge, inEdge)) {
        visited[nr][nc] = true;
        queue.push([nr, nc]);
      }
    }
  }

  return order;
}

export function createEmptyGrid(rows, cols, defaultKind, defaultRotation = 0) {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      kind: defaultKind,
      rotation: defaultRotation
    }))
  );
}

/** @param {number} quarterTurns +1 = clockwise 90°, -1 = counter-clockwise 90° */
export function rotateTileCellBy(cell, quarterTurns = 1) {
  const steps = Math.round(quarterTurns) % 4;
  const delta = ((steps % 4) + 4) % 4;
  const next = (cell.rotation || 0) + delta * 90;
  return {
    ...cell,
    rotation: ((next % 360) + 360) % 360
  };
}

export function rotateTileCell(cell) {
  return rotateTileCellBy(cell, 1);
}

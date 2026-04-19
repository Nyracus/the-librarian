// src/puzzle/tileTypes.js
// Edge indices: 0=N, 1=E, 2=S, 3=W
// Each edge: { v: visible connection, h: hidden connection }

export const TILE_KIND = {
  STRAIGHT: "straight",
  CORNER: "corner",
  T_JUNCTION: "t_junction",
  CROSS: "cross",
  BROKEN: "broken",
  BLANK: "blank"
};

/** Base definitions at rotation 0 (N,E,S,W) */
const BASE = {
  straight: [
    { v: true, h: false },
    { v: false, h: false },
    { v: true, h: false },
    { v: false, h: false }
  ],
  corner: [
    { v: true, h: false },
    { v: true, h: false },
    { v: false, h: false },
    { v: false, h: false }
  ],
  t_junction: [
    { v: true, h: false },
    { v: true, h: false },
    { v: true, h: false },
    { v: false, h: false }
  ],
  cross: [
    { v: true, h: false },
    { v: true, h: false },
    { v: true, h: false },
    { v: true, h: false }
  ],
  broken: [
    { v: true, h: false },
    { v: false, h: false },
    { v: false, h: true },
    { v: false, h: false }
  ],
  blank: [
    { v: false, h: true },
    { v: false, h: true },
    { v: false, h: true },
    { v: false, h: true }
  ]
};

function rotateEdgesCW(edges, quarterTurns) {
  const e = edges.map((x) => ({ ...x }));
  const n = ((quarterTurns % 4) + 4) % 4;
  for (let i = 0; i < n; i++) {
    const next = [e[3], e[0], e[1], e[2]];
    e[0] = next[0];
    e[1] = next[1];
    e[2] = next[2];
    e[3] = next[3];
  }
  return e;
}

export function getTileEdges(kind, rotationDeg) {
  const turns = Math.round(rotationDeg / 90) % 4;
  const key =
    kind === TILE_KIND.STRAIGHT
      ? "straight"
      : kind === TILE_KIND.CORNER
        ? "corner"
        : kind === TILE_KIND.T_JUNCTION
          ? "t_junction"
          : kind === TILE_KIND.CROSS
            ? "cross"
            : kind === TILE_KIND.BROKEN
              ? "broken"
              : kind === TILE_KIND.BLANK
                ? "blank"
                : "straight";
  const base = BASE[key] || BASE.straight;
  return rotateEdgesCW(base.map((x) => ({ ...x })), turns);
}

export function edgesConnect(aOut, bIn) {
  const vis = aOut.v && bIn.v;
  const hid = aOut.h && bIn.h;
  return vis || hid;
}

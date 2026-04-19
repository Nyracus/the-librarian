// Flowchart-style arrow-only rendering for Portion 1 (no bitmap tiles).

import { portion1OpenSidesNEWS } from "./portion1FirstLeak.js";

const NS = "http://www.w3.org/2000/svg";
const C = 24;

let _markerSeq = 0;
function nextMarkerId() {
  _markerSeq += 1;
  return `p1mk_${_markerSeq}`;
}

function appendMarkerDefs(svg, markerId) {
  const defs = document.createElementNS(NS, "defs");
  const marker = document.createElementNS(NS, "marker");
  marker.setAttribute("id", markerId);
  marker.setAttribute("markerWidth", "8");
  marker.setAttribute("markerHeight", "8");
  marker.setAttribute("refX", "6");
  marker.setAttribute("refY", "4");
  marker.setAttribute("orient", "auto");
  const poly = document.createElementNS(NS, "polygon");
  poly.setAttribute("points", "0 0, 8 4, 0 8");
  poly.setAttribute("fill", "currentColor");
  marker.appendChild(poly);
  defs.appendChild(marker);
  svg.appendChild(defs);
}

function addLine(svg, x1, y1, x2, y2, markerId) {
  const line = document.createElementNS(NS, "line");
  line.setAttribute("x1", String(x1));
  line.setAttribute("y1", String(y1));
  line.setAttribute("x2", String(x2));
  line.setAttribute("y2", String(y2));
  line.setAttribute("stroke", "currentColor");
  line.setAttribute("stroke-width", "2.5");
  line.setAttribute("stroke-linecap", "round");
  line.setAttribute("marker-end", `url(#${markerId})`);
  svg.appendChild(line);
}

/**
 * @param {HTMLElement} el
 * @param {{ fixed?: 'start' | 'end'; kind?: string; rotation?: number }} spec
 */
export function applyPortion1ArrowTile(el, spec) {
  el.textContent = "";
  el.className = "portion1-arrow-tile";

  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 48 48");
  svg.setAttribute("class", "portion1-arrow-svg");
  svg.setAttribute("aria-hidden", "true");

  const markerId = nextMarkerId();
  appendMarkerDefs(svg, markerId);

  if (spec.fixed === "start") {
    addLine(svg, C, C, 40, C, markerId);
  } else if (spec.fixed === "end") {
    addLine(svg, 8, C, C, C, markerId);
  } else {
    const kind = spec.kind || "straight";
    const rot = spec.rotation ?? 0;
    const mask = portion1OpenSidesNEWS(kind, rot);
    const targets = [
      [C, 10],
      [38, C],
      [C, 38],
      [10, C]
    ];
    for (let i = 0; i < 4; i++) {
      if (!mask[i]) continue;
      const [x2, y2] = targets[i];
      addLine(svg, C, C, x2, y2, markerId);
    }
  }

  el.appendChild(svg);
}

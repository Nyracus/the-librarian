import { portion2OpenSidesNEWS } from "./portion2BeneathSurface.js";

const NS = "http://www.w3.org/2000/svg";
const C = 24;
let seq = 0;

function nextMarkerId() {
  seq += 1;
  return `p2mk_${seq}`;
}

function addMarker(svg, markerId) {
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

function addLine(svg, markerId, x1, y1, x2, y2) {
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
 * @param {{ fixed?: "start"|"end"|"sand-entry"|"sand-exit"; kind?: string; rotation?: number }} spec
 */
export function applyPortion2ArrowTile(el, spec) {
  el.textContent = "";
  el.className = "portion2-arrow-tile";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 48 48");
  svg.setAttribute("class", "portion2-arrow-svg");
  svg.setAttribute("aria-hidden", "true");
  const markerId = nextMarkerId();
  addMarker(svg, markerId);

  if (spec.fixed === "start") {
    addLine(svg, markerId, C, C, 40, C);
  } else if (spec.fixed === "end") {
    // Flow enters end from the cell below (northbound channel).
    addLine(svg, markerId, C, 40, C, C);
  } else if (spec.fixed === "sand-entry") {
    addLine(svg, markerId, C, C, 8, C);
    const txt = document.createElementNS(NS, "text");
    txt.setAttribute("x", "24");
    txt.setAttribute("y", "44");
    txt.setAttribute("text-anchor", "middle");
    txt.setAttribute("font-size", "10");
    txt.textContent = "A in";
    svg.appendChild(txt);
  } else if (spec.fixed === "sand-exit") {
    addLine(svg, markerId, C, C, C, 40);
    const txt = document.createElementNS(NS, "text");
    txt.setAttribute("x", "24");
    txt.setAttribute("y", "44");
    txt.setAttribute("text-anchor", "middle");
    txt.setAttribute("font-size", "10");
    txt.textContent = "A out";
    svg.appendChild(txt);
  } else {
    const mask = portion2OpenSidesNEWS(spec.kind || "straight", spec.rotation ?? 0);
    const targets = [
      [C, 10],
      [38, C],
      [C, 38],
      [10, C]
    ];
    for (let i = 0; i < 4; i++) {
      if (!mask[i]) continue;
      const [x2, y2] = targets[i];
      addLine(svg, markerId, C, C, x2, y2);
    }
  }

  el.appendChild(svg);
}

// Geography wing river tiles — PNGs live next to this module:
//   src/assets/packs/geo-river/tiles/<name>.png
// At runtime the browser loads them from that folder (same origin as your app).
//
// Required filenames (lowercase):
//   start.png, end.png, corner.png, straight.png (or flow.png — see fallbacks),
//   tjunction.png, cross.png, broken.png, blank.png, rock.png

const TILE_BASE = new URL("./packs/geo-river/tiles/", import.meta.url);

const TILE_URLS = {
  start: new URL("start.png", TILE_BASE).href,
  end: new URL("end.png", TILE_BASE).href,
  tjunction: new URL("tjunction.png", TILE_BASE).href,
  straight: new URL("straight.png", TILE_BASE).href,
  flow: new URL("flow.png", TILE_BASE).href,
  hidden: new URL("hidden.png", TILE_BASE).href,
  cross: new URL("cross.png", TILE_BASE).href,
  corner: new URL("corner.png", TILE_BASE).href,
  broken: new URL("broken.png", TILE_BASE).href,
  blank: new URL("blank.png", TILE_BASE).href,
  rock: new URL("rock.png", TILE_BASE).href
};

/** If primary file is missing, try these logical keys in order (no broken icon). */
const TILE_LOAD_FALLBACKS = {
  straight: ["straight", "flow", "hidden"],
  tjunction: ["tjunction"],
  cross: ["cross"],
  corner: ["corner"],
  broken: ["broken"],
  blank: ["blank"],
  start: ["start"],
  end: ["end"],
  flow: ["flow", "straight", "hidden"]
};

function tileNameFor(cell, meta = {}) {
  const { source, endpoints, gridRow = -1, gridCol = -1 } = meta;
  if (source && gridRow === source.row && gridCol === source.col) return "start";
  if (
    endpoints &&
    endpoints.some((p) => p.row === gridRow && p.col === gridCol)
  ) {
    return "end";
  }

  if (cell.kind === "corner") return "corner";
  if (cell.kind === "t_junction") return "tjunction";
  if (cell.kind === "cross") return "cross";
  if (cell.kind === "broken") return "broken";
  if (cell.kind === "blank") return "blank";
  if (cell.kind === "straight") return "straight";
  return "flow";
}

/**
 * Renders a tile image inside .geo-tile__inner.
 * @param {HTMLElement} innerEl
 * @param {{ kind: string; rotation: number }} cell
 * @param {{ source?: { row: number; col: number }; endpoints?: { row: number; col: number }[]; gridRow?: number; gridCol?: number }} [meta]
 */
export function applyGeoRiverTileInner(innerEl, cell, meta = {}) {
  innerEl.classList.add("geo-tile__inner--river-pack");
  innerEl.style.setProperty("--geo-river-rot", `${cell.rotation}deg`);
  innerEl.textContent = "";

  const logical = tileNameFor(cell, meta);
  const chain = TILE_LOAD_FALLBACKS[logical] || [logical];

  const img = document.createElement("img");
  img.className = "geo-tile__img";
  img.alt = "";
  img.decoding = "async";
  img.loading = "lazy";

  let attempt = 0;
  const urls = chain
    .map((k) => TILE_URLS[k])
    .filter((u, i, a) => u && a.indexOf(u) === i);

  function tryLoad() {
    if (urls.length === 0 || attempt >= urls.length) {
      innerEl.classList.add("geo-tile__inner--missing");
      return;
    }
    img.onerror = () => {
      attempt += 1;
      tryLoad();
    };
    img.onload = () => {
      innerEl.classList.remove("geo-tile__inner--missing");
    };
    img.src = urls[attempt];
  }
  tryLoad();
  innerEl.appendChild(img);
}

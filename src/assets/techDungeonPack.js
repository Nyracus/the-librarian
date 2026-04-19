// src/assets/techDungeonPack.js
// Default visual provider now points to copied 2D Pixel Dungeon Asset Pack.

const TILE_SHEET_PATH =
  "src/assets/packs/2D Pixel Dungeon Asset Pack/character and tileset/Dungeon_Tileset.png";
const PLAYER_SHEET_PATH =
  "src/assets/packs/2D Pixel Dungeon Asset Pack/character and tileset/Dungeon_Character.png";

const TILE = 16;
const SPACING = 0;
const COLS = 11;

let tileImage = null;
let tileLoaded = false;
let playerImage = null;
let playerLoaded = false;

function ensureTileImage() {
  if (tileImage) return tileImage;
  tileImage = new Image();
  tileImage.src = TILE_SHEET_PATH;
  tileImage.onload = () => {
    tileLoaded = true;
  };
  tileImage.onerror = () => {
    tileLoaded = false;
  };
  return tileImage;
}

function ensurePlayerImage() {
  if (playerImage) return playerImage;
  playerImage = new Image();
  playerImage.src = PLAYER_SHEET_PATH;
  playerImage.onload = () => {
    playerLoaded = true;
  };
  playerImage.onerror = () => {
    playerLoaded = false;
  };
  return playerImage;
}

function tileRect(index, cols = COLS) {
  const x = (index % cols) * (TILE + SPACING);
  const y = Math.floor(index / cols) * (TILE + SPACING);
  return { x, y, w: TILE, h: TILE };
}

export function hasTechPackLoaded() {
  ensureTileImage();
  ensurePlayerImage();
  return tileLoaded && playerLoaded;
}

export function drawTechTile(ctx, index, dx, dy, dw = TILE, dh = TILE) {
  const img = ensureTileImage();
  if (!tileLoaded) return false;
  const src = tileRect(index);
  ctx.drawImage(img, src.x, src.y, src.w, src.h, dx, dy, dw, dh);
  return true;
}

export function drawTechTiledArea(ctx, index, x, y, w, h, tileSize = 32) {
  for (let py = y; py < y + h; py += tileSize) {
    for (let px = x; px < x + w; px += tileSize) {
      drawTechTile(ctx, index, px, py, tileSize, tileSize);
    }
  }
}

export function drawTechPlayer(ctx, x, y, size, anim, moving) {
  const img = ensurePlayerImage();
  if (!playerLoaded) return false;

  // Uses first human row from Dungeon_Character sheet.
  const frames = moving ? [0, 1, 2, 3] : [0];
  const idx = frames[Math.floor(anim) % frames.length];
  const half = size / 2;
  const src = tileRect(idx, 11);
  ctx.drawImage(
    img,
    src.x,
    src.y,
    src.w,
    src.h,
    Math.round(x - half),
    Math.round(y - half),
    size,
    size
  );
  return true;
}

export const TechProp = {
  DOOR: 57,
  BOOKSHELF: 45,
  LECTERN: 79,
  TABLE: 46,
  NPC_ARCHIVIST: 5,
  FLOOR: 67,
  WALL: 1,
  WALKWAY: 34
};


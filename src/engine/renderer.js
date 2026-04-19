// src/engine/renderer.js

export function createCanvasMount(parent, width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.className = "pixel-canvas";
  parent.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
  }
  return { canvas, ctx };
}

export function clear(ctx, w, h, color = "#1a1c2c") {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
}

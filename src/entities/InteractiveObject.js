// src/entities/InteractiveObject.js

export class InteractiveObject {
  constructor({ x, y, w, h, label, onInteract }) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.label = label;
    this.onInteract = onInteract;
    this.glow = 0;
  }

  distanceTo(px, py) {
    const dx = Math.max(this.x - this.w / 2, Math.min(px, this.x + this.w / 2)) - px;
    const dy = Math.max(this.y - this.h / 2, Math.min(py, this.y + this.h / 2)) - py;
    return Math.hypot(dx, dy);
  }

  canInteract(px, py, maxDist) {
    return this.distanceTo(px, py) < maxDist;
  }

  update(dt, isNear) {
    this.glow += dt * (isNear ? 4 : 1);
  }

  draw(ctx, isNear) {
    const pulse = isNear ? 0.35 + 0.12 * Math.sin(this.glow * 3) : 0.15;
    ctx.fillStyle = `rgba(255, 200, 100, ${pulse})`;
    ctx.fillRect(this.x - this.w / 2, this.y - this.h / 2, this.w, this.h);
    ctx.strokeStyle = "#c49a6c";
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x - this.w / 2, this.y - this.h / 2, this.w, this.h);
  }
}

// src/entities/Player.js

import { drawTechPlayer } from "../assets/techDungeonPack.js";

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 20;
    this.h = 20;
    this.speed = 120;
    this.anim = 0;
    this.moving = false;
  }

  update(dt, moveVec) {
    this.moving = moveVec.x !== 0 || moveVec.y !== 0;
    this.x += moveVec.x * this.speed * dt;
    this.y += moveVec.y * this.speed * dt;
    this.anim += dt * (this.moving ? 8 : 2);
  }

  draw(ctx) {
    const bob = Math.sin(this.anim) * (this.moving ? 1.5 : 0.8);
    const ok = drawTechPlayer(
      ctx,
      this.x,
      this.y + bob,
      24,
      this.anim * 0.7,
      this.moving
    );
    if (ok) return;

    // Fallback placeholder if image failed to load.
    ctx.fillStyle = "#6abe30";
    ctx.fillRect(Math.round(this.x - this.w / 2), Math.round(this.y - this.h / 2 + bob), this.w, this.h);
    ctx.strokeStyle = "#306230";
    ctx.lineWidth = 2;
    ctx.strokeRect(Math.round(this.x - this.w / 2), Math.round(this.y - this.h / 2 + bob), this.w, this.h);
  }
}

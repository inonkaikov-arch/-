// Procedurally generated 3-layer parallax city skyline.
// Drawn entirely in screen-space; parallax is applied manually from cameraX.

import Phaser from 'phaser';

interface Building {
  x: number;           // world x position
  w: number;
  h: number;
  baseColor: number;
  winColor: number;
  wins: { rx: number; ry: number }[];
  layer: number;
}

const TOTAL_W = 65_000;

const LAYER_CFG = [
  // far: small, very slow
  { parallax: 0.08, floorY: 610, minW: 50,  maxW: 140, minH: 60,  maxH: 180, gap: [3,  12], density: 0.35, baseColor: 0x0d1a2e, winColor: 0x1a4060 },
  // mid
  { parallax: 0.28, floorY: 575, minW: 70,  maxW: 210, minH: 130, maxH: 310, gap: [6,  30], density: 0.22, baseColor: 0x090f1c, winColor: 0x0f2535 },
  // near: tall, faster
  { parallax: 0.52, floorY: 540, minW: 90,  maxW: 260, minH: 200, maxH: 460, gap: [20, 90], density: 0.18, baseColor: 0x050a14, winColor: 0x0a1828 },
];

export class CityBackground {
  private g: Phaser.GameObjects.Graphics;
  private scene: Phaser.Scene;
  private buildings: Building[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.g = scene.add.graphics().setScrollFactor(0).setDepth(-2);
    this.generate();
  }

  private generate(): void {
    for (let layer = 0; layer < LAYER_CFG.length; layer++) {
      const cfg = LAYER_CFG[layer];
      let x = -500;
      while (x < TOTAL_W + 500) {
        const w = Phaser.Math.Between(cfg.minW, cfg.maxW);
        const h = Phaser.Math.Between(cfg.minH, cfg.maxH);
        const wins: { rx: number; ry: number }[] = [];
        const cols = Math.floor(w / 16);
        const rows = Math.floor(h / 18);
        for (let c = 0; c < cols; c++) {
          for (let r = 0; r < rows; r++) {
            if (Math.random() < cfg.density && Math.random() < 0.65) {
              wins.push({ rx: (c + 0.5) / cols, ry: (r + 0.5) / rows });
            }
          }
        }
        this.buildings.push({ x, w, h, layer, baseColor: cfg.baseColor, winColor: cfg.winColor, wins });
        x += w + Phaser.Math.Between(cfg.gap[0], cfg.gap[1]);
      }
    }
  }

  draw(cameraX: number): void {
    const g = this.g;
    const W = this.scene.scale.width;
    const H = this.scene.scale.height;
    g.clear();

    // Sky
    g.fillStyle(0x000814);
    g.fillRect(0, 0, W, H);

    // Subtle horizon glow
    g.fillStyle(0x001833, 0.5);
    g.fillRect(0, H * 0.55, W, H * 0.2);

    // Moon
    g.fillStyle(0x223355, 0.4);
    g.fillCircle(W - 110, 75, 55);
    g.fillStyle(0x8899bb, 0.85);
    g.fillCircle(W - 110, 75, 22);

    // Buildings back-to-front
    for (let layer = 0; layer < LAYER_CFG.length; layer++) {
      const cfg = LAYER_CFG[layer];
      const sx = cameraX * cfg.parallax;

      for (const b of this.buildings) {
        if (b.layer !== layer) continue;
        const bx = b.x - sx;
        if (bx + b.w < 0 || bx > W) continue;
        const by = cfg.floorY - b.h;

        // Body
        g.fillStyle(b.baseColor);
        g.fillRect(bx, by, b.w, b.h);

        // Left edge highlight (fake depth)
        g.fillStyle(0x1a3060, 0.25);
        g.fillRect(bx, by, 2, b.h);

        // Top edge
        g.fillStyle(0x2244aa, 0.12);
        g.fillRect(bx, by, b.w, 2);

        // Lit windows
        g.fillStyle(b.winColor, 0.95);
        for (const win of b.wins) {
          g.fillRect(bx + win.rx * b.w - 3, by + win.ry * b.h - 2, 5, 4);
        }
      }

      // Ground strip between layers
      g.fillStyle(0x020609);
      g.fillRect(0, cfg.floorY, W, H - cfg.floorY);
    }
  }

  destroy(): void { this.g.destroy(); }
}

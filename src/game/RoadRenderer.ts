// Draws the stock-chart road with:
//  - Multi-pass neon glow on the chart line
//  - Candlestick bars below the line
//  - Dimmed red "past" line behind the car

import Phaser from 'phaser';
import type { Segment } from './RoadGenerator';

export class RoadRenderer {
  private scene: Phaser.Scene;
  private pastGfx: Phaser.GameObjects.Graphics;   // red past line
  private candleGfx: Phaser.GameObjects.Graphics; // candlestick decorations
  private roadGfx: Phaser.GameObjects.Graphics;   // main green line + glow

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.pastGfx   = scene.add.graphics().setDepth(1);
    this.candleGfx = scene.add.graphics().setDepth(2);
    this.roadGfx   = scene.add.graphics().setDepth(3);
  }

  draw(waypoints: Segment[], cameraX: number, carX: number): void {
    const visible   = this.visibleSlice(waypoints, cameraX);
    const pastSlice = this.visibleSlice(waypoints.filter(wp => wp.x <= carX + 60), cameraX);

    this.drawPastLine(pastSlice);
    this.drawCandlesticks(visible);
    this.drawRoadLine(visible);
  }

  // ── helpers ────────────────────────────────────────────────────────────────

  private visibleSlice(waypoints: Segment[], cameraX: number): Segment[] {
    const W = this.scene.scale.width;
    const lo = cameraX - 100;
    const hi = cameraX + W + 100;
    let start = waypoints.findIndex(wp => wp.x >= lo);
    if (start < 0) start = 0;
    if (start > 0) start--;
    return waypoints.filter((_, i) => i >= start && waypoints[i].x <= hi);
  }

  private stroke(g: Phaser.GameObjects.Graphics, pts: Segment[]): void {
    if (pts.length < 2) return;
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.strokePath();
  }

  // ── past line ──────────────────────────────────────────────────────────────

  private drawPastLine(pts: Segment[]): void {
    const g = this.pastGfx;
    g.clear();
    if (pts.length < 2) return;

    g.lineStyle(12, 0xff2200, 0.06); this.stroke(g, pts);
    g.lineStyle(6,  0xff3322, 0.15); this.stroke(g, pts);
    g.lineStyle(3,  0xff4444, 0.55); this.stroke(g, pts);
  }

  // ── candlestick decorations ────────────────────────────────────────────────

  private drawCandlesticks(pts: Segment[]): void {
    const g = this.candleGfx;
    g.clear();
    if (pts.length < 4) return;

    for (let i = 4; i < pts.length - 1; i += 5) {
      const open  = pts[i - 4].y;
      const close = pts[i].y;
      const wick_top    = Math.min(open, close) - 12;
      const wick_bottom = Math.max(open, close) + 12;
      const x = pts[i].x;
      const isGreen = close < open;   // lower y = higher price
      const col   = isGreen ? 0x00cc44 : 0xcc2200;
      const alpha = 0.45;

      // Wick
      g.lineStyle(1, col, alpha);
      g.beginPath();
      g.moveTo(x, wick_top);
      g.lineTo(x, wick_bottom);
      g.strokePath();

      // Body
      g.fillStyle(col, alpha);
      const bodyTop = Math.min(open, close);
      const bodyH   = Math.max(Math.abs(close - open), 4);
      g.fillRect(x - 5, bodyTop, 10, bodyH);
    }
  }

  // ── main glowing road line ─────────────────────────────────────────────────

  private drawRoadLine(pts: Segment[]): void {
    const g = this.roadGfx;
    g.clear();
    if (pts.length < 2) return;

    // Area fill beneath chart (like a market area chart)
    g.fillStyle(0x002a18, 0.45);
    g.beginPath();
    g.moveTo(pts[0].x, 840);
    for (const p of pts) g.lineTo(p.x, p.y);
    g.lineTo(pts[pts.length - 1].x, 840);
    g.closePath();
    g.fillPath();

    // Glow passes — wide + transparent first, narrow + bright last
    const passes: [number, number, number][] = [
      [28, 0x00ff88, 0.03],
      [18, 0x00ff88, 0.07],
      [12, 0x00ff88, 0.15],
      [7,  0x00ff88, 0.55],
      [3,  0x88ffcc, 1.00],
    ];
    for (const [w, col, a] of passes) {
      g.lineStyle(w, col, a);
      this.stroke(g, pts);
    }

    // Glowing node dots at every 5th waypoint
    for (let i = 0; i < pts.length; i += 5) {
      g.fillStyle(0x00ff88, 0.35);
      g.fillCircle(pts[i].x, pts[i].y, 6);
      g.fillStyle(0xeeffee, 0.9);
      g.fillCircle(pts[i].x, pts[i].y, 2.5);
    }
  }
}

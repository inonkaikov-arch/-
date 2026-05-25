// Draws the stock-chart road:
//  - a financial-grid background that scrolls with the camera
//  - a thick polyline representing the chart/road surface
//  - a thin filled area below the line (like a candlestick area chart)

import Phaser from 'phaser';
import type { Segment } from './RoadGenerator';

const ROAD_THICKNESS = 6;
const GRID_COLS = 10;
const GRID_ROWS = 6;

export class RoadRenderer {
  private scene: Phaser.Scene;
  private roadGraphics: Phaser.GameObjects.Graphics;
  private gridGraphics: Phaser.GameObjects.Graphics;
  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Grid is drawn in screen space (fixed) using camera offset.
    this.gridGraphics = scene.add.graphics();
    this.gridGraphics.setScrollFactor(0);
    this.gridGraphics.setDepth(0);

    this.roadGraphics = scene.add.graphics();
    this.roadGraphics.setDepth(1);
  }

  /** Called every frame — redraws the visible portion of the road. */
  draw(waypoints: Segment[], cameraX: number): void {
    this.drawGrid(cameraX);
    this.drawRoad(waypoints, cameraX);
  }

  private drawGrid(cameraX: number): void {
    const g = this.gridGraphics;
    const W = this.scene.scale.width;
    const H = this.scene.scale.height;

    g.clear();

    // Dark background
    g.fillStyle(0x0a0a1a);
    g.fillRect(0, 0, W, H);

    // Vertical grid lines — shift with camera so they look fixed
    g.lineStyle(1, 0x1a2a3a, 0.8);
    const colW = W / GRID_COLS;
    const offsetX = cameraX % colW;
    for (let i = 0; i <= GRID_COLS + 1; i++) {
      const x = i * colW - offsetX;
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, H);
      g.strokePath();
    }

    // Horizontal grid lines (fixed)
    const rowH = H / GRID_ROWS;
    for (let j = 0; j <= GRID_ROWS; j++) {
      const y = j * rowH;
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(W, y);
      g.strokePath();
    }

    // Y-axis price labels would go here — kept in HUD text objects instead.
  }

  private drawRoad(waypoints: Segment[], cameraX: number): void {
    const g = this.roadGraphics;
    const W = this.scene.scale.width;
    g.clear();

    if (waypoints.length < 2) return;

    // Only draw waypoints visible on screen (± 2 steps margin)
    const startX = cameraX - 80;
    const endX = cameraX + W + 80;

    let firstIdx = waypoints.findIndex(wp => wp.x >= startX);
    if (firstIdx < 0) firstIdx = 0;
    if (firstIdx > 0) firstIdx--;          // include one offscreen left

    const visible = waypoints.filter(wp => wp.x <= endX + 80);
    const slice = visible.slice(Math.max(0, firstIdx));
    if (slice.length < 2) return;

    // Filled area beneath the chart line
    g.fillStyle(0x003322, 0.5);
    g.beginPath();
    g.moveTo(slice[0].x, 800);
    for (const pt of slice) g.lineTo(pt.x, pt.y);
    g.lineTo(slice[slice.length - 1].x, 800);
    g.closePath();
    g.fillPath();

    // Chart line (the road surface)
    g.lineStyle(ROAD_THICKNESS, 0x00ff88);
    g.beginPath();
    g.moveTo(slice[0].x, slice[0].y);
    for (let i = 1; i < slice.length; i++) {
      g.lineTo(slice[i].x, slice[i].y);
    }
    g.strokePath();

    // Bright highlight on top of the line
    g.lineStyle(2, 0xaaffcc, 0.8);
    g.beginPath();
    g.moveTo(slice[0].x, slice[0].y);
    for (let i = 1; i < slice.length; i++) {
      g.lineTo(slice[i].x, slice[i].y);
    }
    g.strokePath();
  }
}

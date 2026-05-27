// Full HUD matching the Market Racer screenshot design:
//   top bar  | breaking-news strip | event-impact panel
//   bottom bar: mini-map | boost | power-up slots

import Phaser from 'phaser';
import type { Segment } from '../game/RoadGenerator';
import type { NewsEventType } from '../game/RoadGenerator';

// ── palette ──────────────────────────────────────────────────────────────────
const PANEL      = 0x050d1a;
const BORDER     = 0x1a4060;
const COL_GREEN  = '#00ff88';
const COL_RED    = '#ff4444';
const COL_YELLOW = '#ffcc00';
const COL_CYAN   = '#00ccff';
const COL_GREY   = '#556677';
const MONO       = 'monospace';

const STOCKS = ['NVIDIA', 'APPLE', 'TESLA', 'BITCOIN', 'META', 'SPY 500'];

export type PowerUpCounts = { turbo: number; shield: number; repair: number };

function txt(
  scene: Phaser.Scene,
  x: number, y: number,
  str: string,
  size: number,
  color: string,
  bold = false,
  depth = 12,
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, str, {
    fontFamily: MONO,
    fontSize: `${size}px`,
    color,
    stroke: '#000000',
    strokeThickness: 3,
    fontStyle: bold ? 'bold' : 'normal',
  }).setScrollFactor(0).setDepth(depth);
}

export class HUD {
  private scene: Phaser.Scene;
  readonly stock: string;

  // Dynamic panels (redrawn each frame)
  private panelGfx:  Phaser.GameObjects.Graphics;
  private barGfx:    Phaser.GameObjects.Graphics;
  private bottomGfx: Phaser.GameObjects.Graphics;
  private mapGfx:    Phaser.GameObjects.Graphics; // mini-map

  // Top-bar texts
  private scoreVal:  Phaser.GameObjects.Text;
  private bestVal:   Phaser.GameObjects.Text;
  private speedVal:  Phaser.GameObjects.Text;
  private damageVal: Phaser.GameObjects.Text;
  private bellVal:   Phaser.GameObjects.Text;

  // News strip
  private newsStrip:   Phaser.GameObjects.Graphics;
  private newsContent: Phaser.GameObjects.Text;
  private newsTween:   Phaser.Tweens.Tween | null = null;

  // Event-impact panel
  private evPanel: Phaser.GameObjects.Graphics;
  private evArrow: Phaser.GameObjects.Text;
  private evLabel: Phaser.GameObjects.Text;
  private evSub:   Phaser.GameObjects.Text;
  private evTimer: Phaser.Time.TimerEvent | null = null;

  // Bottom bar
  private boostMulti: Phaser.GameObjects.Text;
  private puCounts:   Phaser.GameObjects.Text[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.stock = STOCKS[Phaser.Math.Between(0, STOCKS.length - 1)];

    const W = scene.scale.width;
    const H = scene.scale.height;
    const D = 12;

    // Graphics layers (all scroll-factor 0)
    this.panelGfx  = scene.add.graphics().setScrollFactor(0).setDepth(10);
    this.barGfx    = scene.add.graphics().setScrollFactor(0).setDepth(11);
    this.bottomGfx = scene.add.graphics().setScrollFactor(0).setDepth(10);
    this.mapGfx    = scene.add.graphics().setScrollFactor(0).setDepth(11);
    this.newsStrip = scene.add.graphics().setScrollFactor(0).setDepth(10);
    this.evPanel   = scene.add.graphics().setScrollFactor(0).setDepth(10);

    // ── TOP BAR static labels ──────────────────────────────────────────────

    // Logo
    txt(scene, 14, 8,  'MARKET', 17, COL_GREEN,  true);
    txt(scene, 14, 26, 'RACER',  22, '#ffffff',   true);

    // MAP label
    txt(scene, 130, 12, 'MAP',             10, COL_GREY);
    txt(scene, 130, 24, this.stock,        16, COL_CYAN, true);

    // Score
    txt(scene, W / 2 - 130, 8,  'SCORE', 10, COL_GREY).setOrigin(0.5, 0);
    this.scoreVal = txt(scene, W / 2 - 130, 20, '0', 22, COL_GREEN, true).setOrigin(0.5, 0);
    txt(scene, W / 2 - 130, 44, '🏆 BEST', 9, COL_GREY).setOrigin(0.5, 0);
    this.bestVal  = txt(scene, W / 2 - 130, 55, '0', 13, COL_YELLOW).setOrigin(0.5, 0);

    // Speed
    txt(scene, W / 2 + 10, 8,  'SPEED', 10, COL_GREY);
    this.speedVal = txt(scene, W / 2 + 10, 20, '0 MPH', 22, COL_GREEN, true);

    // Damage
    txt(scene, W / 2 + 185, 8,  'DAMAGE', 10, COL_GREY);
    this.damageVal = txt(scene, W / 2 + 185, 20, '0%', 22, COL_RED, true);

    // Closing bell
    txt(scene, W - 175, 8,  'CLOSING BELL',    10, COL_GREY);
    this.bellVal = txt(scene, W - 175, 20, '09:30', 28, COL_GREEN, true);
    txt(scene, W - 150, 55, 'TO MARKET CLOSE', 9,  COL_GREY);

    // ── BREAKING NEWS strip (hidden until triggered) ───────────────────────
    this.newsContent = txt(scene, W / 2 + 80, 84, '', 15, COL_YELLOW).setOrigin(0, 0.5);
    this.newsContent.setVisible(false);

    // ── EVENT IMPACT panel ────────────────────────────────────────────────
    txt(scene, W - 118, 100, 'EVENT IMPACT', 10, COL_GREY).setOrigin(0.5, 0).setDepth(D);
    this.evArrow = txt(scene, W - 148, 116, '↗', 24, COL_GREEN, true).setDepth(D);
    this.evLabel = txt(scene, W - 112, 116, '',  18, COL_GREEN, true).setOrigin(0, 0).setDepth(D);
    this.evSub   = txt(scene, W - 112, 138, '',  12, '#aaaaaa').setOrigin(0, 0).setDepth(D);
    [this.evArrow, this.evLabel, this.evSub].forEach(t => t.setVisible(false));

    // ── BOTTOM BAR static labels ───────────────────────────────────────────
    txt(scene, W / 2 - 60, H - 56, 'BOOST',  11, COL_GREY).setOrigin(0.5, 0);
    this.boostMulti = txt(scene, W / 2 + 105, H - 44, 'x1', 20, COL_CYAN, true).setOrigin(0, 0.5);

    const puNames  = ['TURBO',  'SHIELD', 'REPAIR'];
    const puColors = [COL_CYAN, COL_GREEN, '#ff6600'];
    for (let i = 0; i < 3; i++) {
      const px = W - 300 + i * 102;
      txt(scene, px + 45, H - 57, puNames[i], 10, COL_GREY).setOrigin(0.5, 0);
      const c = txt(scene, px + 45, H - 40, '0', 22, puColors[i], true).setOrigin(0.5, 0);
      this.puCounts.push(c);
    }
  }

  // ── per-frame update ──────────────────────────────────────────────────────

  update(
    score:     number,
    best:      number,
    speedMph:  number,
    distKm:    number,
    damagePct: number,   // 0-100
    boostPct:  number,   // 0-100
    pu:        PowerUpCounts,
    waypoints: Segment[],
    carX:      number,
  ): void {
    const W = this.scene.scale.width;
    const H = this.scene.scale.height;

    this.drawTopBar(W, speedMph, damagePct);
    this.drawBottomBar(W, H, boostPct);
    this.drawMinimap(W, H, waypoints, carX, distKm);

    // Update text values
    this.scoreVal.setText(score.toLocaleString());
    this.bestVal.setText(best.toLocaleString());
    this.speedVal.setText(`${Math.round(speedMph)} MPH`);
    this.damageVal.setText(`${Math.round(damagePct)}%`);

    const totalSec = Math.max(0, Math.round(distKm * 10));
    const mm = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const ss = (totalSec % 60).toString().padStart(2, '0');
    this.bellVal.setText(`${mm}:${ss}`);

    const mult = boostPct > 66 ? 3 : boostPct > 33 ? 2 : 1;
    this.boostMulti.setText(`x${mult}`);

    this.puCounts[0].setText(String(pu.turbo));
    this.puCounts[1].setText(String(pu.shield));
    this.puCounts[2].setText(String(pu.repair));
  }

  private drawTopBar(W: number, speed: number, damage: number): void {
    const g = this.panelGfx;
    g.clear();

    // Background
    g.fillStyle(PANEL, 0.93);
    g.fillRect(0, 0, W, 76);
    g.lineStyle(1, BORDER, 1);
    g.beginPath(); g.moveTo(0, 76); g.lineTo(W, 76); g.strokePath();

    // Dividers
    g.lineStyle(1, BORDER, 0.45);
    for (const dx of [120, 290, W / 2 - 40, W / 2 + 175, W - 178]) {
      g.beginPath(); g.moveTo(dx, 6); g.lineTo(dx, 70); g.strokePath();
    }

    const bars = this.barGfx;
    bars.clear();

    // Speed bar
    const sbX = W / 2 + 10;
    bars.fillStyle(0x081808);
    bars.fillRect(sbX, 48, 140, 9);
    const spPct = Math.min(speed / 700, 1);
    bars.fillStyle(speed > 500 ? 0xff6600 : 0x00ff44);
    bars.fillRect(sbX, 48, 140 * spPct, 9);
    bars.lineStyle(1, BORDER, 0.5);
    bars.strokeRect(sbX, 48, 140, 9);

    // Damage bar
    const dmgX = W / 2 + 185;
    bars.fillStyle(0x180808);
    bars.fillRect(dmgX, 48, 110, 9);
    const dpPct = Math.min(damage / 100, 1);
    bars.fillStyle(dpPct > 0.65 ? 0xff1100 : dpPct > 0.35 ? 0xff8800 : 0xff4444);
    bars.fillRect(dmgX, 48, 110 * dpPct, 9);
    bars.lineStyle(1, BORDER, 0.5);
    bars.strokeRect(dmgX, 48, 110, 9);

    // Damage icon (small car)
    bars.fillStyle(0xff4444, 0.9);
    bars.fillRect(dmgX - 30, 44, 22, 10);
    bars.fillStyle(0xff4444);
    bars.fillCircle(dmgX - 25, 56, 4);
    bars.fillCircle(dmgX - 13, 56, 4);
  }

  private drawBottomBar(W: number, H: number, boost: number): void {
    const g = this.bottomGfx;
    g.clear();

    // Background
    g.fillStyle(PANEL, 0.93);
    g.fillRect(0, H - 64, W, 64);
    g.lineStyle(1, BORDER, 1);
    g.beginPath(); g.moveTo(0, H - 64); g.lineTo(W, H - 64); g.strokePath();

    // Minimap box
    g.lineStyle(1, BORDER, 0.8);
    g.strokeRect(10, H - 60, 260, 56);

    // Boost bar
    const bx = W / 2 - 80;
    g.fillStyle(0x081520);
    g.fillRect(bx, H - 40, 180, 16);
    g.fillStyle(0x0088cc);
    g.fillRect(bx, H - 40, 180 * Math.min(boost / 100, 1), 16);
    g.lineStyle(1, BORDER);
    g.strokeRect(bx, H - 40, 180, 16);

    // Power-up boxes
    for (let i = 0; i < 3; i++) {
      const px = W - 300 + i * 102;
      g.fillStyle(PANEL);
      g.fillRect(px, H - 62, 92, 58);
      g.lineStyle(1, BORDER, 0.9);
      g.strokeRect(px, H - 62, 92, 58);
    }
  }

  private drawMinimap(
    _W: number, H: number,
    waypoints: Segment[],
    carX: number,
    _distKm: number,
  ): void {
    const g = this.mapGfx;
    g.clear();
    if (waypoints.length < 2) return;

    const mx = 14, my = H - 58, mw = 252, mh = 50;
    const totalX  = waypoints[waypoints.length - 1].x;
    const minY    = Math.min(...waypoints.map(w => w.y));
    const maxY    = Math.max(...waypoints.map(w => w.y));
    const rangeY  = maxY - minY || 1;

    // Sample every 10th waypoint for performance
    const sampled = waypoints.filter((_, i) => i % 10 === 0);

    // Past (red) portion
    const pastPts = sampled.filter(wp => wp.x <= carX);
    if (pastPts.length > 1) {
      g.lineStyle(1.5, 0xff3333, 0.7);
      g.beginPath();
      pastPts.forEach((wp, i) => {
        const px = mx + (wp.x / totalX) * mw;
        const py = my + mh - ((wp.y - minY) / rangeY) * mh;
        i === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
      });
      g.strokePath();
    }

    // Future (green) portion
    const futurePts = sampled.filter(wp => wp.x >= carX);
    if (futurePts.length > 1) {
      g.lineStyle(1.5, 0x00ff88, 0.6);
      g.beginPath();
      futurePts.forEach((wp, i) => {
        const px = mx + (wp.x / totalX) * mw;
        const py = my + mh - ((wp.y - minY) / rangeY) * mh;
        i === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
      });
      g.strokePath();
    }

    // Car dot
    const dotX = mx + (carX / totalX) * mw;
    const dotWp = waypoints.find(wp => wp.x >= carX) ?? waypoints[waypoints.length - 1];
    const dotY  = my + mh - ((dotWp.y - minY) / rangeY) * mh;
    g.fillStyle(0x00ff88);
    g.fillCircle(dotX, dotY, 4);

    // Finish flag marker
    g.fillStyle(0xffffff, 0.7);
    g.fillRect(mx + mw - 3, my, 3, mh);

    // Distance label
    g.fillStyle(0x001020, 0.6);
    g.fillRect(mx, H - 60, 120, 14);
  }

  // ── breaking news ──────────────────────────────────────────────────────────

  showNews(headline: string, type: NewsEventType): void {
    const W  = this.scene.scale.width;
    const ns = this.newsStrip;
    const nc = this.newsContent;

    // Strip background
    ns.clear();
    ns.fillStyle(0x000000, 0.88);
    ns.fillRect(0, 72, W, 30);
    ns.lineStyle(1, 0x440000, 1);
    ns.beginPath(); ns.moveTo(0, 102); ns.lineTo(W, 102); ns.strokePath();

    // Red "BREAKING NEWS" badge
    ns.fillStyle(0xcc0000);
    ns.fillRect(8, 75, 130, 24);

    // Badge text (static — recreated here as graphics)
    ns.fillStyle(0xffffff, 0.95);
    // We just overlay the text object below

    // Badge label text (one-shot)
    const badge = this.scene.add.text(73, 87, 'BREAKING NEWS', {
      fontFamily: MONO, fontSize: '11px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(13);
    this.scene.time.delayedCall(6000, () => badge.destroy());

    // Arrow icon based on type
    const isPositive = type === 'pump' || type === 'fakeRecoveryThenCrash';
    const arrow      = isPositive ? ' ↗' : type === 'flatMarket' ? ' →' : ' ↘';
    nc.setText(headline + arrow);
    nc.setColor(COL_YELLOW);
    nc.setVisible(true);
    nc.setAlpha(1);

    if (this.newsTween) this.newsTween.stop();
    this.newsTween = this.scene.tweens.add({
      targets: nc,
      alpha: 0,
      delay: 4800,
      duration: 800,
      onComplete: () => {
        nc.setVisible(false);
        ns.clear();
      },
    });
  }

  // ── event impact panel ─────────────────────────────────────────────────────

  showEventImpact(title: string, sub: string, positive: boolean): void {
    const W = this.scene.scale.width;
    const g = this.evPanel;
    g.clear();

    g.fillStyle(PANEL, 0.93);
    g.fillRect(W - 218, 96, 208, 88);
    g.lineStyle(1, positive ? 0x00aa44 : 0xaa2200, 0.9);
    g.strokeRect(W - 218, 96, 208, 88);

    const col = positive ? COL_GREEN : COL_RED;
    this.evArrow.setText(positive ? '↗' : '↘').setColor(col).setVisible(true);
    this.evLabel.setText(title).setColor(col).setVisible(true);
    this.evSub.setText(sub).setVisible(true);

    if (this.evTimer) this.evTimer.remove();
    this.evTimer = this.scene.time.delayedCall(7000, () => {
      g.clear();
      this.evArrow.setVisible(false);
      this.evLabel.setVisible(false);
      this.evSub.setVisible(false);
    });
  }
}

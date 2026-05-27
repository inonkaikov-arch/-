// Player car: sleek sports car with glow effects drawn procedurally.

import Phaser from 'phaser';

const CAR_W = 76;
const CAR_H = 28;
const TEX_W = CAR_W + 14;
const TEX_H = CAR_H + 20;

export class Car {
  readonly sprite: Phaser.Physics.Arcade.Image;
  private boostGfx: Phaser.GameObjects.Graphics;
  private shieldGfx: Phaser.GameObjects.Graphics;

  private isOnGround: boolean = false;
  private flipAngle: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const g = scene.make.graphics({ x: 0, y: 0 });
    this.drawCar(g);
    g.generateTexture('car', TEX_W, TEX_H);
    g.destroy();

    this.sprite = scene.physics.add.image(x, y, 'car');
    this.sprite.setCollideWorldBounds(false);
    (this.sprite.body as Phaser.Physics.Arcade.Body).setDamping(false);

    this.boostGfx = scene.add.graphics().setDepth(6);
    this.shieldGfx = scene.add.graphics().setDepth(6);
  }

  private drawCar(g: Phaser.GameObjects.Graphics): void {
    const ox = 6;  // horizontal offset to leave room for glow

    // Ground shadow
    g.fillStyle(0x001122, 0.4);
    g.fillEllipse(ox + CAR_W / 2, CAR_H + 14, CAR_W + 10, 10);

    // Underbody / diffuser
    g.fillStyle(0x0a0a0a);
    g.fillRect(ox + 10, CAR_H - 2, CAR_W - 22, 8);

    // --- Main body ---
    g.fillStyle(0x00bb44);
    g.fillRoundedRect(ox + 2, 10, CAR_W - 4, CAR_H - 6, 7);

    // --- Nose (tapered front) ---
    g.fillStyle(0x009933);
    g.fillTriangle(
      ox + CAR_W - 4, 10,
      ox + CAR_W + 8, 19,
      ox + CAR_W - 4, CAR_H - 6,
    );

    // --- Roof & cockpit ---
    g.fillStyle(0x008822);
    g.fillRoundedRect(ox + 22, 2, CAR_W - 38, 16, 5);

    // --- Windshield (angled) ---
    g.fillStyle(0x99ddff, 0.75);
    g.fillRect(ox + CAR_W - 30, 3, 14, 13);

    // --- Side window ---
    g.fillStyle(0x66bbdd, 0.6);
    g.fillRect(ox + 28, 4, 12, 11);

    // --- Side stripe (sponsorship line) ---
    g.fillStyle(0x00ff88, 0.45);
    g.fillRect(ox + 4, 20, CAR_W - 10, 3);

    // --- Rear spoiler blade ---
    g.fillStyle(0x006611);
    g.fillRect(ox + 0, 5, 12, 2);   // blade
    g.fillRect(ox + 3, 7, 3, 8);    // mount

    // --- Headlight ---
    g.fillStyle(0xffffaa);
    g.fillRect(ox + CAR_W + 2, 12, 5, 8);

    // --- Headlight glow ---
    g.fillStyle(0xffff44, 0.45);
    g.fillRect(ox + CAR_W + 4, 11, 3, 10);

    // --- Brake light ---
    g.fillStyle(0xff2200);
    g.fillRect(ox + 0, 13, 4, 7);
    g.fillStyle(0xff6600, 0.5);
    g.fillRect(ox - 2, 12, 3, 9);

    // --- Exhaust ---
    g.fillStyle(0x334455);
    g.fillRect(ox + 4, CAR_H - 4, 6, 4);
    g.fillRect(ox + 12, CAR_H - 4, 4, 4);

    // --- Wheel arches (cut-out look) ---
    g.fillStyle(0x0a0a10);
    g.fillCircle(ox + 16, CAR_H + 6, 11);
    g.fillCircle(ox + CAR_W - 14, CAR_H + 6, 11);

    // --- Tires ---
    g.fillStyle(0x1a1a1a);
    g.fillCircle(ox + 16, CAR_H + 6, 10);
    g.fillCircle(ox + CAR_W - 14, CAR_H + 6, 10);

    // --- Rim ---
    g.fillStyle(0x999999);
    g.fillCircle(ox + 16, CAR_H + 6, 5);
    g.fillCircle(ox + CAR_W - 14, CAR_H + 6, 5);
    g.fillStyle(0xbbbbbb);
    g.fillCircle(ox + 16, CAR_H + 6, 2);
    g.fillCircle(ox + CAR_W - 14, CAR_H + 6, 2);
  }

  update(
    keys: { right: boolean; left: boolean; space: boolean },
    onGround: boolean,
    turboActive: boolean,
    shieldActive: boolean,
  ): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.isOnGround = onGround;

    if (onGround) {
      this.sprite.angle = Phaser.Math.Linear(this.sprite.angle, 0, 0.2);
    } else {
      this.sprite.angle += body.velocity.y * 0.003;
    }
    this.flipAngle = Math.abs(this.sprite.angle);

    const maxV  = turboActive ? 980 : 700;
    const accel = turboActive ? 26  : 18;

    if (keys.right) {
      body.setVelocityX(Math.min(body.velocity.x + accel, maxV));
    } else if (keys.left) {
      body.setVelocityX(Math.max(body.velocity.x - 25, 30));
    } else {
      body.setVelocityX(body.velocity.x * 0.985);
    }

    if (keys.space && onGround) {
      body.setVelocityY(-520);
    }

    this.drawBoostFX(turboActive);
    this.drawShieldFX(shieldActive);
  }

  private drawBoostFX(active: boolean): void {
    const g = this.boostGfx;
    g.clear();
    if (!active) return;
    const cx = this.sprite.x - 34;
    const cy = this.sprite.y + 2;
    g.fillStyle(0x00aaff, 0.25);
    g.fillEllipse(cx, cy, 55, 18);
    g.fillStyle(0x0055ff, 0.5);
    g.fillEllipse(cx + 6, cy, 32, 10);
    g.fillStyle(0xaaeeff, 0.8);
    g.fillEllipse(cx + 14, cy, 12, 6);
  }

  private drawShieldFX(active: boolean): void {
    const g = this.shieldGfx;
    g.clear();
    if (!active) return;
    const cx = this.sprite.x;
    const cy = this.sprite.y;
    g.lineStyle(3, 0x00ff88, 0.6);
    g.strokeEllipse(cx, cy, 110, 55);
    g.lineStyle(1, 0x00ff88, 0.2);
    g.strokeEllipse(cx, cy, 120, 62);
  }

  isFlipped(): boolean {
    return this.flipAngle > 100 && !this.isOnGround;
  }

  getSpeed(): number {
    return (this.sprite.body as Phaser.Physics.Arcade.Body).velocity.x;
  }
}

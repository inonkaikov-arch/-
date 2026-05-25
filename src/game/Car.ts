// Player car: rendered as a simple graphic, driven by arcade physics.

import Phaser from 'phaser';

const CAR_W = 52;
const CAR_H = 26;

export class Car {
  readonly sprite: Phaser.Physics.Arcade.Image;
  private isOnGround: boolean = false;
  private airTime: number = 0;       // frames in the air
  private flipAngle: number = 0;     // accumulated rotation for game-over detection

  constructor(scene: Phaser.Scene, x: number, y: number) {
    // Draw a tiny cartoon car onto a texture at runtime.
    const gfx = scene.make.graphics({ x: 0, y: 0 });
    this.drawCar(gfx);
    gfx.generateTexture('car', CAR_W, CAR_H + 14);
    gfx.destroy();

    this.sprite = scene.physics.add.image(x, y, 'car');
    this.sprite.setCollideWorldBounds(false);
    (this.sprite.body as Phaser.Physics.Arcade.Body).setDamping(false);
  }

  private drawCar(g: Phaser.GameObjects.Graphics): void {
    // Body
    g.fillStyle(0x22aaff);
    g.fillRoundedRect(2, 10, CAR_W - 4, CAR_H - 4, 6);

    // Windscreen
    g.fillStyle(0xaaddff, 0.7);
    g.fillRect(28, 12, 14, 10);

    // Roof
    g.fillStyle(0x1188dd);
    g.fillRoundedRect(18, 4, 22, 14, 4);

    // Wheels
    g.fillStyle(0x222222);
    g.fillCircle(12, CAR_H + 4, 8);
    g.fillCircle(38, CAR_H + 4, 8);

    // Wheel highlight
    g.fillStyle(0x888888);
    g.fillCircle(12, CAR_H + 4, 3);
    g.fillCircle(38, CAR_H + 4, 3);

    // Headlight
    g.fillStyle(0xffff88);
    g.fillRect(CAR_W - 6, 14, 4, 6);
  }

  update(
    keys: { right: boolean; left: boolean; space: boolean },
    onGround: boolean,
  ): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.isOnGround = onGround;

    if (onGround) {
      this.airTime = 0;
      // Dampen rotation back to 0 when on the ground.
      this.sprite.angle = Phaser.Math.Linear(this.sprite.angle, 0, 0.2);
    } else {
      this.airTime++;
      // Gently rotate while airborne to show the car is tumbling.
      this.sprite.angle += body.velocity.y * 0.004;
    }

    this.flipAngle = Math.abs(this.sprite.angle);

    if (keys.right) {
      body.setVelocityX(Math.min(body.velocity.x + 18, 700));
    } else if (keys.left) {
      body.setVelocityX(Math.max(body.velocity.x - 25, 30));
    } else {
      // Mild coast deceleration
      body.setVelocityX(body.velocity.x * 0.98);
    }

    // Jump — only when on ground
    if (keys.space && onGround) {
      body.setVelocityY(-520);
    }
  }

  /** Returns true when the car has flipped far enough to trigger game over. */
  isFlipped(): boolean {
    return this.flipAngle > 100 && !this.isOnGround;
  }

  getSpeed(): number {
    return (this.sprite.body as Phaser.Physics.Arcade.Body).velocity.x;
  }
}

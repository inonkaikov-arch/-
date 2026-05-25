import Phaser from 'phaser';
import { RoadGenerator, NEWS_EVENTS } from '../game/RoadGenerator';
import { RoadRenderer } from '../game/RoadRenderer';
import { Car } from '../game/Car';
import { HUD } from '../ui/HUD';

// Total "race distance" before the closing bell.
const TOTAL_DISTANCE_PX = 60_000;

// How far ahead to generate road (in pixels beyond the camera right edge).
const ROAD_LOOKAHEAD = 2000;

export class GameScene extends Phaser.Scene {
  private roadGen!: RoadGenerator;
  private roadRenderer!: RoadRenderer;
  private car!: Car;
  private hud!: HUD;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey!: Phaser.Input.Keyboard.Key;

  // Physics ground platform that we reposition each frame under the car.
  private groundSensor!: Phaser.Physics.Arcade.Image;

  private score: number = 0;
  private portfolioDamage: number = 0;
  private newsTimer: number = 0;
  private newsInterval: number = 12000;  // ms between events
  private pendingFakeRecovery: boolean = false;

  private isGameOver: boolean = false;

  create(): void {
    this.isGameOver = false;
    this.score = 0;
    this.portfolioDamage = 0;
    this.newsTimer = 0;
    this.pendingFakeRecovery = false;

    this.roadGen = new RoadGenerator();

    // Build enough road for the screen before we place the car.
    this.roadGen.extend(4000);

    this.roadRenderer = new RoadRenderer(this);

    // Place car at the start of the road.
    const startY = this.roadGen.getYAtX(400) - 30;
    this.car = new Car(this, 400, startY);

    // Camera follows the car horizontally.
    this.cameras.main.startFollow(this.car.sprite, false, 0.08, 0);
    this.cameras.main.setFollowOffset(-200, 0);  // keep car slightly left of centre

    // Invisible thin ground slab — repositioned each frame to match road surface.
    const gs = this.physics.add.image(400, startY + 30, '__DEFAULT');
    gs.setVisible(false);
    gs.setImmovable(true);
    gs.setSize(80, 8);
    (gs.body as Phaser.Physics.Arcade.Body).allowGravity = false;
    this.groundSensor = gs;

    // Collider between car and ground slab.
    this.physics.add.collider(this.car.sprite, this.groundSensor);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.hud = new HUD(this);

    // World bounds — very wide so the car never hits an invisible wall.
    this.physics.world.setBounds(0, -200, TOTAL_DISTANCE_PX + 2000, 1200);
  }

  update(_time: number, delta: number): void {
    if (this.isGameOver) return;

    const carX = this.car.sprite.x;
    const cameraX = this.cameras.main.scrollX;

    // Extend the road ahead.
    this.roadGen.extend(cameraX + ROAD_LOOKAHEAD);

    // Keep road shape gradual over time.
    this.roadGen.normalise();

    // Reposition the ground slab directly under the car on the road line.
    const roadY = this.roadGen.getYAtX(carX);
    this.groundSensor.setPosition(carX, roadY + 4);
    (this.groundSensor.body as Phaser.Physics.Arcade.Body).reset(carX, roadY + 4);

    // Determine if car is on ground: within 30px above road surface.
    const carBottom = this.car.sprite.y + (this.car.sprite.displayHeight / 2);
    const onGround = carBottom >= roadY - 8 && carBottom <= roadY + 20;

    const keys = {
      right: this.cursors.right!.isDown,
      left:  this.cursors.left!.isDown,
      space: Phaser.Input.Keyboard.JustDown(this.spaceKey),
    };

    this.car.update(keys, onGround);

    // Score = distance driven.
    this.score = Math.round(carX);

    // Portfolio damage accumulates when falling (chart crashing).
    const roadDelta = roadY - this.roadGen.getYAtX(carX - 5);
    if (roadDelta > 1.5) {
      this.portfolioDamage += Math.round(roadDelta * 80 * (delta / 16));
    }

    // News event timer.
    this.newsTimer += delta;
    if (this.newsTimer >= this.newsInterval) {
      this.newsTimer = 0;
      this.newsInterval = Phaser.Math.Between(10000, 15000);
      this.triggerNewsEvent();
    }

    // HUD update.
    const distKm = Math.max(0, (TOTAL_DISTANCE_PX - carX) / 1000);
    const speedMph = Math.round(this.car.getSpeed() * 0.05);
    this.hud.update(this.score, speedMph, distKm, this.portfolioDamage);

    // --- Game-over checks ---

    // 1. Car fell far below the road.
    if (this.car.sprite.y > roadY + 400) {
      this.triggerGameOver('Your car fell into a bear market abyss!');
      return;
    }

    // 2. Car flipped too much.
    if (this.car.isFlipped()) {
      this.triggerGameOver('Your portfolio flipped! Total loss!');
      return;
    }

    // 3. Car stopped moving (stalled).
    if (carX > 600 && this.car.getSpeed() < 5) {
      this.triggerGameOver('Market stalled. You ran out of momentum!');
      return;
    }

    // 4. Reached the closing bell.
    if (carX >= TOTAL_DISTANCE_PX) {
      this.triggerGameOver('🔔 Closing bell! You survived the trading day!');
      return;
    }

    // Draw the road last (so it's on top of the fill area but below HUD).
    this.roadRenderer.draw(this.roadGen.getWaypoints(), cameraX);
  }

  private triggerNewsEvent(): void {
    const pick = NEWS_EVENTS[Phaser.Math.Between(0, NEWS_EVENTS.length - 1)];
    this.roadGen.applyNewsEvent(pick.type);
    this.hud.showNews(pick.headline);

    if (pick.type === 'fakeRecoveryThenCrash' && !this.pendingFakeRecovery) {
      this.pendingFakeRecovery = true;
      this.time.delayedCall(3500, () => {
        this.roadGen.triggerCrashAfterFakeRecovery();
        this.pendingFakeRecovery = false;
        this.hud.showNews('📉 SUCKERS! It was fake — CRASH INCOMING!');
      });
    }
  }

  private triggerGameOver(reason: string): void {
    this.isGameOver = true;

    // Save best score.
    const prev = parseInt(localStorage.getItem('marketRacerBest') ?? '0', 10);
    const best = Math.max(prev, this.score);
    localStorage.setItem('marketRacerBest', String(best));

    // Brief pause then switch scene.
    this.time.delayedCall(1200, () => {
      this.scene.start('GameOverScene');
      this.scene.get('GameOverScene').registry.set('goData', {
        score: this.score,
        best,
        reason,
      });
    });

    // Flash screen red.
    this.cameras.main.flash(600, 200, 0, 0);
    this.cameras.main.shake(400, 0.02);
  }
}

import Phaser from 'phaser';
import { RoadGenerator, NEWS_EVENTS } from '../game/RoadGenerator';
import { RoadRenderer } from '../game/RoadRenderer';
import { CityBackground } from '../game/CityBackground';
import { Car } from '../game/Car';
import { HUD, type PowerUpCounts } from '../ui/HUD';

const TOTAL_DISTANCE_PX = 60_000;
const ROAD_LOOKAHEAD    = 2400;

// ── power-up collectible ──────────────────────────────────────────────────
type PUType = 'turbo' | 'shield' | 'repair';
interface PowerUp {
  type: PUType;
  worldX: number;
  gfx: Phaser.GameObjects.Graphics;
  collected: boolean;
}

const PU_COLORS: Record<PUType, number> = { turbo: 0x00ccff, shield: 0x00ff44, repair: 0xff6600 };
const PU_LABELS: Record<PUType, string> = { turbo: 'T', shield: 'S', repair: 'R' };

export class GameScene extends Phaser.Scene {
  private road!:    RoadGenerator;
  private roadRend!: RoadRenderer;
  private city!:    CityBackground;
  private car!:     Car;
  private hud!:     HUD;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private qKey!:    Phaser.Input.Keyboard.Key;
  private wKey!:    Phaser.Input.Keyboard.Key;
  private eKey!:    Phaser.Input.Keyboard.Key;

  // Thin invisible slab repositioned under car each frame
  private ground!:  Phaser.Physics.Arcade.Image;

  // Game state
  private score:    number = 0;
  private damage:   number = 0;   // 0-100
  private boost:    number = 40;  // 0-100 (starts partly full)
  private newsTimer: number = 0;
  private newsInterval: number = 12000;
  private pendingFake:  boolean = false;
  private isOver:   boolean = false;

  // Power-ups
  private powerups: PowerUp[] = [];
  private puCounts: PowerUpCounts = { turbo: 0, shield: 0, repair: 0 };
  private puSpawnX: number = 900;

  // Active effects
  private turboActive:  boolean = false;
  private shieldActive: boolean = false;
  private turboTimer:   number  = 0;

  create(): void {
    this.isOver       = false;
    this.score        = 0;
    this.damage       = 0;
    this.boost        = 40;
    this.newsTimer    = 0;
    this.pendingFake  = false;
    this.turboActive  = false;
    this.shieldActive = false;
    this.turboTimer   = 0;
    this.puCounts     = { turbo: 0, shield: 0, repair: 0 };
    this.powerups     = [];
    this.puSpawnX     = 900;

    this.road = new RoadGenerator();
    this.road.extend(4000);

    // Background
    this.city     = new CityBackground(this);
    this.roadRend = new RoadRenderer(this);

    // Car
    const startY = this.road.getYAtX(400) - 30;
    this.car = new Car(this, 400, startY);

    // Camera
    this.cameras.main.startFollow(this.car.sprite, false, 0.08, 0);
    this.cameras.main.setFollowOffset(-200, 0);

    // Ground slab (physics)
    const gs = this.physics.add.image(400, startY + 30, '__DEFAULT');
    gs.setVisible(false).setImmovable(true).setSize(80, 8);
    (gs.body as Phaser.Physics.Arcade.Body).allowGravity = false;
    this.ground = gs;
    this.physics.add.collider(this.car.sprite, this.ground);

    // Input
    this.cursors  = this.input.keyboard!.createCursorKeys();
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.qKey     = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    this.wKey     = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.eKey     = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    this.hud = new HUD(this);

    this.physics.world.setBounds(0, -200, TOTAL_DISTANCE_PX + 2000, 1200);
  }

  update(_time: number, delta: number): void {
    if (this.isOver) return;

    const carX   = this.car.sprite.x;
    const camX   = this.cameras.main.scrollX;
    const roadY  = this.road.getYAtX(carX);

    // Extend road ahead
    this.road.extend(camX + ROAD_LOOKAHEAD);
    this.road.normalise();

    // Move ground slab
    this.ground.setPosition(carX, roadY + 4);
    (this.ground.body as Phaser.Physics.Arcade.Body).reset(carX, roadY + 4);

    // On-ground check
    const carBottom = this.car.sprite.y + this.car.sprite.displayHeight / 2;
    const onGround  = carBottom >= roadY - 8 && carBottom <= roadY + 20;

    // Power-up key inputs
    if (Phaser.Input.Keyboard.JustDown(this.qKey))  this.useTurbo();
    if (Phaser.Input.Keyboard.JustDown(this.wKey))  this.useShield();
    if (Phaser.Input.Keyboard.JustDown(this.eKey))  this.useRepair();

    // Turbo timer
    if (this.turboActive) {
      this.turboTimer -= delta;
      if (this.turboTimer <= 0) this.turboActive = false;
    }

    // Car update
    this.car.update(
      {
        right: this.cursors.right!.isDown,
        left:  this.cursors.left!.isDown,
        space: Phaser.Input.Keyboard.JustDown(this.spaceKey),
      },
      onGround,
      this.turboActive,
      this.shieldActive,
    );

    // Score
    this.score = Math.round(carX);

    // Damage — accrues when road slopes sharply downward under the car
    const slopeDelta = roadY - this.road.getYAtX(carX - 5);
    if (slopeDelta > 2 && !this.shieldActive) {
      this.damage = Math.min(100, this.damage + slopeDelta * 0.06 * (delta / 16));
    }

    // Boost regenerates passively, drains when turbo is active
    if (this.turboActive) {
      this.boost = Math.max(0, this.boost - 0.25 * (delta / 16));
    } else {
      this.boost = Math.min(100, this.boost + 0.08 * (delta / 16));
    }

    // Spawn and collect power-ups
    this.spawnPowerUps(camX + ROAD_LOOKAHEAD);
    this.collectPowerUps(carX);

    // News timer
    this.newsTimer += delta;
    if (this.newsTimer >= this.newsInterval) {
      this.newsTimer    = 0;
      this.newsInterval = Phaser.Math.Between(10000, 15000);
      this.fireNewsEvent();
    }

    // Best score
    const best = parseInt(localStorage.getItem('marketRacerBest') ?? '0', 10);
    const distKm = Math.max(0, (TOTAL_DISTANCE_PX - carX) / 1000);
    const speedMph = Math.round(this.car.getSpeed() * 0.05);

    this.hud.update(
      this.score, best, speedMph, distKm,
      this.damage, this.boost, this.puCounts,
      this.road.getWaypoints(), carX,
    );

    // Draw scene
    this.city.draw(camX);
    this.roadRend.draw(this.road.getWaypoints(), camX, carX);

    // ── game-over checks ──────────────────────────────────────────────────
    if (this.car.sprite.y > roadY + 400) {
      this.triggerGameOver('Your car fell into a bear market abyss!');
    } else if (this.car.isFlipped()) {
      this.triggerGameOver('Portfolio flipped! Total loss!');
    } else if (carX > 600 && this.car.getSpeed() < 5) {
      this.triggerGameOver('Market stalled. You ran out of momentum!');
    } else if (carX >= TOTAL_DISTANCE_PX) {
      this.triggerGameOver('🔔 Closing bell! You survived the trading day!');
    }
  }

  // ── power-up spawning ─────────────────────────────────────────────────────

  private spawnPowerUps(upToX: number): void {
    const types: PUType[] = ['turbo', 'shield', 'repair'];
    while (this.puSpawnX < upToX) {
      this.puSpawnX += Phaser.Math.Between(600, 1200);
      if (Math.random() < 0.45) {
        const type = types[Phaser.Math.Between(0, 2)];
        const wy   = this.road.getYAtX(this.puSpawnX) - 38;
        const g    = this.add.graphics().setDepth(4);
        this.drawPUIcon(g, type);
        g.setPosition(this.puSpawnX, wy);
        this.powerups.push({ type, worldX: this.puSpawnX, gfx: g, collected: false });
      }
    }
  }

  private drawPUIcon(g: Phaser.GameObjects.Graphics, type: PUType): void {
    const col = PU_COLORS[type];
    g.fillStyle(col, 0.18);
    g.fillCircle(0, 0, 18);
    g.lineStyle(2, col, 0.9);
    g.strokeCircle(0, 0, 18);
    g.fillStyle(col, 0.85);
    g.fillCircle(0, 0, 9);
    // Letter drawn via a text object attached as overlay (skipped here; icon color is enough)
    // Could add via scene.add.text but would need cleanup — kept simple.
    void PU_LABELS[type]; // suppress unused-var
  }

  private collectPowerUps(carX: number): void {
    for (const pu of this.powerups) {
      if (pu.collected) continue;
      // Update Y to track road
      pu.gfx.setY(this.road.getYAtX(pu.worldX) - 38);
      if (Math.abs(pu.worldX - carX) < 35) {
        pu.collected = true;
        pu.gfx.setVisible(false);
        this.puCounts[pu.type]++;
        // Flash feedback
        this.cameras.main.flash(120, 0, 60, 30);
      }
    }
  }

  // ── power-up usage ────────────────────────────────────────────────────────

  private useTurbo(): void {
    if (this.puCounts.turbo > 0 && !this.turboActive) {
      this.puCounts.turbo--;
      this.turboActive = true;
      this.turboTimer  = 5000;
      this.boost       = 100;
    }
  }

  private useShield(): void {
    if (this.puCounts.shield > 0) {
      this.puCounts.shield--;
      this.shieldActive = true;
      this.time.delayedCall(6000, () => { this.shieldActive = false; });
    }
  }

  private useRepair(): void {
    if (this.puCounts.repair > 0) {
      this.puCounts.repair--;
      this.damage = Math.max(0, this.damage - 40);
      this.cameras.main.flash(200, 0, 80, 0);
    }
  }

  // ── news events ────────────────────────────────────────────────────────────

  private fireNewsEvent(): void {
    const pick = NEWS_EVENTS[Phaser.Math.Between(0, NEWS_EVENTS.length - 1)];
    this.road.applyNewsEvent(pick.type);
    this.hud.showNews(pick.headline, pick.type);

    const positive = pick.type === 'pump' || pick.type === 'fakeRecoveryThenCrash';
    const labels: Record<typeof pick.type, [string, string]> = {
      crash:                ['BEAR CRASH',    'SELL EVERYTHING!'],
      pump:                 ['BULL RUN',       'PUMP AHEAD!'],
      volatility:           ['HIGH VOLT.',     'BUCKLE UP!'],
      fakeRecoveryThenCrash:['BULL TRAP',      'PUMP AHEAD!'],
      flatMarket:           ['DEAD MARKET',    'ZERO VOLUME.'],
    };
    const [title, sub] = labels[pick.type];
    this.hud.showEventImpact(title, sub, positive);

    if (pick.type === 'fakeRecoveryThenCrash' && !this.pendingFake) {
      this.pendingFake = true;
      this.time.delayedCall(3500, () => {
        this.road.triggerCrashAfterFakeRecovery();
        this.pendingFake = false;
        this.hud.showNews('📉 SUCKERS! It was fake — CRASH INCOMING!', 'crash');
        this.hud.showEventImpact('DEAD CAT', 'CRASH NOW!', false);
      });
    }
  }

  // ── game over ──────────────────────────────────────────────────────────────

  private triggerGameOver(reason: string): void {
    if (this.isOver) return;
    this.isOver = true;

    const prev = parseInt(localStorage.getItem('marketRacerBest') ?? '0', 10);
    const best = Math.max(prev, this.score);
    localStorage.setItem('marketRacerBest', String(best));

    this.cameras.main.flash(700, 180, 0, 0);
    this.cameras.main.shake(450, 0.022);

    this.time.delayedCall(1300, () => {
      this.powerups.forEach(p => p.gfx.destroy());
      this.city.destroy();
      this.scene.start('GameOverScene');
      this.scene.get('GameOverScene').registry.set('goData', { score: this.score, best, reason });
    });
  }
}

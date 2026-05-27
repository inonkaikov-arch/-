import Phaser from 'phaser';

export class StartScene extends Phaser.Scene {
  constructor() { super({ key: 'StartScene' }); }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;

    // Sky
    this.add.rectangle(W / 2, H / 2, W, H, 0x000814);

    // Moon
    const gfx = this.add.graphics();
    gfx.fillStyle(0x223355, 0.4);
    gfx.fillCircle(W - 100, 70, 50);
    gfx.fillStyle(0x8899bb, 0.85);
    gfx.fillCircle(W - 100, 70, 20);

    // Decorative background chart
    this.drawDecorChart(gfx, W, H);

    // Dark gradient overlay
    gfx.fillStyle(0x000814, 0.55);
    gfx.fillRect(0, 0, W, H);

    // Logo
    this.add.text(W / 2, H * 0.18, 'MARKET', {
      fontFamily: 'monospace', fontSize: '70px',
      color: '#00ff88', stroke: '#000', strokeThickness: 6, fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(W / 2, H * 0.31, 'RACER', {
      fontFamily: 'monospace', fontSize: '80px',
      color: '#ffffff', stroke: '#000', strokeThickness: 6, fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(W / 2, H * 0.47, '🚗  Drive the stock market — or crash trying!', {
      fontFamily: 'monospace', fontSize: '20px', color: '#aaffcc',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);

    // Controls
    const controls = [
      ['→', 'Accelerate'],
      ['←', 'Brake'],
      ['SPACE', 'Jump'],
      ['Q / W / E', 'Use Turbo / Shield / Repair'],
    ];
    controls.forEach(([key, action], i) => {
      this.add.text(W / 2 - 120, H * 0.56 + i * 28, key, {
        fontFamily: 'monospace', fontSize: '16px', color: '#00ccff', fontStyle: 'bold',
      });
      this.add.text(W / 2 - 50, H * 0.56 + i * 28, action, {
        fontFamily: 'monospace', fontSize: '16px', color: '#888888',
      });
    });

    // Best score
    const best = localStorage.getItem('marketRacerBest') ?? '0';
    this.add.text(W / 2, H * 0.75, `🏆  Best Score: ${parseInt(best).toLocaleString()}`, {
      fontFamily: 'monospace', fontSize: '20px', color: '#ffcc00',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);

    // Start prompt
    const prompt = this.add.text(W / 2, H * 0.86, 'PRESS  ENTER  OR  CLICK  TO  START', {
      fontFamily: 'monospace', fontSize: '22px', color: '#ffffff',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.15, yoyo: true, repeat: -1, duration: 650 });

    this.input.keyboard!.once('keydown-ENTER', () => this.scene.start('GameScene'));
    this.input.once('pointerdown',             () => this.scene.start('GameScene'));
  }

  private drawDecorChart(g: Phaser.GameObjects.Graphics, W: number, H: number): void {
    // Glowing background chart line
    let y = H * 0.65;
    const pts: [number, number][] = [];
    for (let x = 0; x <= W; x += 24) {
      y += (Math.random() - 0.5) * 35;
      y = Phaser.Math.Clamp(y, H * 0.35, H * 0.9);
      pts.push([x, y]);
    }
    // Glow passes
    [[16, 0x00ff88, 0.04], [8, 0x00ff88, 0.10], [3, 0x00ff88, 0.30]].forEach(([w, c, a]) => {
      g.lineStyle(w as number, c as number, a as number);
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      pts.forEach(p => g.lineTo(p[0], p[1]));
      g.strokePath();
    });

    // Fill under line
    g.fillStyle(0x00ff88, 0.06);
    g.beginPath();
    g.moveTo(0, H);
    pts.forEach(p => g.lineTo(p[0], p[1]));
    g.lineTo(W, H);
    g.closePath();
    g.fillPath();
  }
}

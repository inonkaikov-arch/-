import Phaser from 'phaser';

export class GameOverScene extends Phaser.Scene {
  constructor() { super({ key: 'GameOverScene' }); }

  init(data: { score: number; best: number; reason: string }): void {
    this.registry.set('goData', data);
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;

    const { score, best, reason } = this.registry.get('goData') as {
      score: number; best: number; reason: string;
    };

    const gfx = this.add.graphics();

    // Dark bg with chart silhouette
    gfx.fillStyle(0x000814);
    gfx.fillRect(0, 0, W, H);
    this.drawCrashChart(gfx, W, H);
    gfx.fillStyle(0x000814, 0.7);
    gfx.fillRect(0, 0, W, H);

    // Central panel
    gfx.fillStyle(0x050d1a, 0.95);
    gfx.fillRoundedRect(W / 2 - 340, H / 2 - 200, 680, 400, 12);
    gfx.lineStyle(1, 0x1a4060);
    gfx.strokeRoundedRect(W / 2 - 340, H / 2 - 200, 680, 400, 12);
    // Red top border
    gfx.lineStyle(3, 0xcc0000);
    gfx.beginPath();
    gfx.moveTo(W / 2 - 340, H / 2 - 200);
    gfx.lineTo(W / 2 + 340, H / 2 - 200);
    gfx.strokePath();

    this.add.text(W / 2, H / 2 - 165, 'MARKET  CRASHED', {
      fontFamily: 'monospace', fontSize: '52px',
      color: '#ff3333', stroke: '#000', strokeThickness: 6, fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(W / 2, H / 2 - 100, reason, {
      fontFamily: 'monospace', fontSize: '18px', color: '#ffaaaa',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5);

    // Score panel
    gfx.fillStyle(0x080f20);
    gfx.fillRoundedRect(W / 2 - 180, H / 2 - 60, 360, 80, 8);

    this.add.text(W / 2, H / 2 - 38, 'FINAL SCORE', {
      fontFamily: 'monospace', fontSize: '13px', color: '#556677',
    }).setOrigin(0.5);
    this.add.text(W / 2, H / 2 - 14, score.toLocaleString(), {
      fontFamily: 'monospace', fontSize: '38px',
      color: '#ffcc00', stroke: '#000', strokeThickness: 4, fontStyle: 'bold',
    }).setOrigin(0.5);

    const newBest = score >= best;
    this.add.text(W / 2, H / 2 + 44, newBest ? `🏆  NEW BEST: ${score.toLocaleString()}` : `Best: ${best.toLocaleString()}`, {
      fontFamily: 'monospace', fontSize: '20px',
      color: newBest ? '#00ff88' : '#888888',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);

    // Buttons
    const retry = this.add.text(W / 2, H / 2 + 110, '[ ENTER ]  PLAY AGAIN', {
      fontFamily: 'monospace', fontSize: '22px',
      color: '#ffffff', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);
    this.tweens.add({ targets: retry, alpha: 0.2, yoyo: true, repeat: -1, duration: 700 });

    this.add.text(W / 2, H / 2 + 148, '[ ESC ]  main menu', {
      fontFamily: 'monospace', fontSize: '14px', color: '#556677',
    }).setOrigin(0.5);

    this.input.keyboard!.once('keydown-ENTER', () => this.scene.start('GameScene'));
    this.input.keyboard!.once('keydown-ESC',   () => this.scene.start('StartScene'));
    this.input.once('pointerdown',             () => this.scene.start('GameScene'));
  }

  private drawCrashChart(g: Phaser.GameObjects.Graphics, W: number, H: number): void {
    let y = H * 0.3;
    const pts: [number, number][] = [[0, y]];
    for (let x = 30; x <= W; x += 20) {
      const halfway = x > W * 0.5;
      const slope   = halfway ? 4 : -0.5;
      y += slope + (Math.random() - 0.5) * 20;
      y = Phaser.Math.Clamp(y, 40, H - 40);
      pts.push([x, y]);
    }
    g.lineStyle(4, 0xff2200, 0.5);
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    pts.forEach(p => g.lineTo(p[0], p[1]));
    g.strokePath();
    g.fillStyle(0xff2200, 0.07);
    g.beginPath();
    g.moveTo(0, H);
    pts.forEach(p => g.lineTo(p[0], p[1]));
    g.lineTo(W, H);
    g.closePath();
    g.fillPath();
  }
}

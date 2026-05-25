import Phaser from 'phaser';

export class StartScene extends Phaser.Scene {
  constructor() {
    super({ key: 'StartScene' });
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;

    // Background gradient via rectangle
    this.add.rectangle(W / 2, H / 2, W, H, 0x0a0a1a);

    // Fake mini chart in the background
    this.drawDecorChart(W, H);

    // Title
    this.add.text(W / 2, H * 0.22, 'MARKET RACER', {
      fontFamily: 'monospace',
      fontSize: '64px',
      color: '#00ff88',
      stroke: '#000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(W / 2, H * 0.36, '🚗  Drive the market — or crash trying!', {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#aaffcc',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Controls cheat-sheet
    const controls = [
      '→  Accelerate',
      '←  Brake',
      'SPACE  Jump',
    ];
    controls.forEach((line, i) => {
      this.add.text(W / 2, H * 0.52 + i * 32, line, {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#88ccff',
      }).setOrigin(0.5);
    });

    // Best score from localStorage
    const best = localStorage.getItem('marketRacerBest') ?? '0';
    this.add.text(W / 2, H * 0.7, `Best Score: ${best}`, {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#ffcc00',
    }).setOrigin(0.5);

    // Pulsing start prompt
    const startBtn = this.add.text(W / 2, H * 0.82, 'PRESS  ENTER  OR  CLICK  TO  START', {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#ffffff',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: startBtn,
      alpha: 0.2,
      yoyo: true,
      repeat: -1,
      duration: 700,
    });

    // Start on Enter or click
    this.input.keyboard!.once('keydown-ENTER', () => this.startGame());
    this.input.once('pointerdown', () => this.startGame());
  }

  private drawDecorChart(W: number, H: number): void {
    const g = this.add.graphics();
    g.lineStyle(2, 0x003322, 0.6);
    // Random squiggly line across the background
    const pts: [number, number][] = [];
    let y = H * 0.6;
    for (let x = 0; x <= W; x += 30) {
      y += (Math.random() - 0.5) * 40;
      y = Phaser.Math.Clamp(y, H * 0.3, H * 0.85);
      pts.push([x, y]);
    }
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    pts.forEach(p => g.lineTo(p[0], p[1]));
    g.strokePath();
  }

  private startGame(): void {
    this.scene.start('GameScene');
  }
}

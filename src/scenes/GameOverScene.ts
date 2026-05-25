import Phaser from 'phaser';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data: { score: number; best: number; reason: string }): void {
    this.registry.set('goData', data);
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;

    const { score, best, reason } = this.registry.get('goData') as {
      score: number;
      best: number;
      reason: string;
    };

    this.add.rectangle(W / 2, H / 2, W, H, 0x0a0a1a, 0.92);

    this.add.text(W / 2, H * 0.2, 'MARKET CRASHED', {
      fontFamily: 'monospace',
      fontSize: '58px',
      color: '#ff4444',
      stroke: '#000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(W / 2, H * 0.35, reason, {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#ffaaaa',
    }).setOrigin(0.5);

    this.add.text(W / 2, H * 0.48, `Score: ${score}`, {
      fontFamily: 'monospace',
      fontSize: '32px',
      color: '#ffcc00',
    }).setOrigin(0.5);

    const newBest = score >= best;
    const bestLabel = newBest ? `🏆 NEW BEST: ${score}` : `Best: ${best}`;
    this.add.text(W / 2, H * 0.58, bestLabel, {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: newBest ? '#00ff88' : '#aaaaaa',
    }).setOrigin(0.5);

    // Restart prompt
    const prompt = this.add.text(W / 2, H * 0.75, 'PRESS  ENTER  OR  CLICK  TO  RETRY', {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.tweens.add({ targets: prompt, alpha: 0.2, yoyo: true, repeat: -1, duration: 700 });

    this.add.text(W / 2, H * 0.86, 'PRESS  ESC  FOR  MAIN  MENU', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#888888',
    }).setOrigin(0.5);

    this.input.keyboard!.once('keydown-ENTER', () => this.scene.start('GameScene'));
    this.input.keyboard!.once('keydown-ESC',   () => this.scene.start('StartScene'));
    this.input.once('pointerdown',             () => this.scene.start('GameScene'));
  }
}

// Heads-up display: score, speed, distance, portfolio damage, news ticker.

import Phaser from 'phaser';

const PAD = 16;
const LINE = 26;

export class HUD {
  private scene: Phaser.Scene;

  private scoreText: Phaser.GameObjects.Text;
  private speedText: Phaser.GameObjects.Text;
  private distText: Phaser.GameObjects.Text;
  private damageText: Phaser.GameObjects.Text;
  private newsText: Phaser.GameObjects.Text;
  private newsBg: Phaser.GameObjects.Rectangle;
  private flashTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'monospace',
      fontSize: '17px',
      color: '#00ff88',
      stroke: '#000000',
      strokeThickness: 3,
    };

    const W = scene.scale.width;

    // Top-left panel
    this.scoreText  = scene.add.text(PAD, PAD,           'SCORE: 0',           style).setScrollFactor(0).setDepth(10);
    this.speedText  = scene.add.text(PAD, PAD + LINE,    'SPEED: 0 mph',       style).setScrollFactor(0).setDepth(10);
    this.distText   = scene.add.text(PAD, PAD + LINE * 2,'BELL:  100.0 km',    style).setScrollFactor(0).setDepth(10);
    this.damageText = scene.add.text(PAD, PAD + LINE * 3,'DAMAGE: $0',         { ...style, color: '#ff4444' }).setScrollFactor(0).setDepth(10);

    // Breaking-news banner at bottom
    const bannerH = 44;
    this.newsBg = scene.add.rectangle(W / 2, scene.scale.height - bannerH / 2, W, bannerH, 0x000000, 0.75)
      .setScrollFactor(0).setDepth(10);
    this.newsText = scene.add.text(W / 2, scene.scale.height - bannerH / 2, '', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ffcc00',
      stroke: '#000',
      strokeThickness: 3,
      align: 'center',
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(11);
    this.newsBg.setVisible(false);
  }

  update(score: number, speed: number, distKm: number, damage: number): void {
    this.scoreText.setText(`SCORE: ${score}`);
    this.speedText.setText(`SPEED: ${Math.round(speed)} mph`);
    this.distText.setText(`BELL:  ${distKm.toFixed(1)} km`);
    this.damageText.setText(`DAMAGE: $${damage.toLocaleString()}`);
  }

  showNews(headline: string): void {
    this.newsBg.setVisible(true);
    this.newsText.setText(`⚡ BREAKING: ${headline}`);

    // Flash effect
    if (this.flashTween) this.flashTween.stop();
    this.newsText.setAlpha(1);
    this.flashTween = this.scene.tweens.add({
      targets: this.newsText,
      alpha: 0,
      delay: 4500,
      duration: 800,
      onComplete: () => {
        this.newsBg.setVisible(false);
        this.newsText.setText('');
      },
    });
  }
}

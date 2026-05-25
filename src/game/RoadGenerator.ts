// Procedural stock-chart road generator.
// Builds a list of (x, y) waypoints that look like a candlestick-free line chart.

export type Segment = {
  x: number;
  y: number;
};

export type NewsEventType =
  | 'crash'
  | 'pump'
  | 'volatility'
  | 'fakeRecoveryThenCrash'
  | 'flatMarket';

export const NEWS_EVENTS: { type: NewsEventType; headline: string }[] = [
  { type: 'crash',              headline: '🔴 FED RAISES RATES BY 2%! MARKET IN FREEFALL!' },
  { type: 'crash',              headline: '🔴 TECH GIANT FILES FOR BANKRUPTCY!' },
  { type: 'pump',               headline: '🟢 TRILLION-DOLLAR STIMULUS PACKAGE APPROVED!' },
  { type: 'pump',               headline: '🟢 AI CURES CANCER — BIOTECH SECTOR EXPLODES!' },
  { type: 'volatility',         headline: '⚡ PRESIDENT LIVE-TWEETS TRADE WAR THREATS!' },
  { type: 'volatility',         headline: '⚡ LEAKED DOCUMENTS CAUSE MARKET WHIPLASH!' },
  { type: 'fakeRecoveryThenCrash', headline: '📈 RECOVERY RALLY... WAIT — IT WAS FAKE NEWS!' },
  { type: 'fakeRecoveryThenCrash', headline: '📈 DEAD CAT BOUNCE CONFIRMED! SELL EVERYTHING!' },
  { type: 'flatMarket',         headline: '😴 NOTHING HAPPENING. TRADERS ASLEEP.' },
  { type: 'flatMarket',         headline: '😴 HOLIDAY TRADING. ZERO VOLUME.' },
];

const ROAD_STEP = 40;         // horizontal pixels per waypoint
const BASE_Y = 360;           // vertical centre of the chart road
const MAX_Y = 660;            // floor — car falls off below this
const MIN_Y = 80;             // ceiling

export class RoadGenerator {
  private waypoints: Segment[] = [];
  private currentY: number = BASE_Y;
  private trend: number = 0;          // persistent slope (-ve = up, +ve = down)
  private volatility: number = 0.4;   // amplitude of random noise

  constructor() {
    // Seed initial flat section so the car has time to land.
    for (let i = 0; i < 30; i++) {
      this.waypoints.push({ x: i * ROAD_STEP, y: BASE_Y });
    }
    this.currentY = BASE_Y;
  }

  /** Extend the road up to worldX + lookahead pixels. */
  extend(upToX: number): void {
    const lastX = this.waypoints[this.waypoints.length - 1].x;
    if (lastX >= upToX) return;

    let x = lastX + ROAD_STEP;
    while (x <= upToX) {
      const noise = (Math.random() - 0.5) * 60 * this.volatility;
      this.currentY = Phaser.Math.Clamp(
        this.currentY + this.trend * 6 + noise,
        MIN_Y,
        MAX_Y,
      );
      this.waypoints.push({ x, y: this.currentY });
      x += ROAD_STEP;
    }
  }

  /** Apply a news event to upcoming road shape. */
  applyNewsEvent(type: NewsEventType): void {
    switch (type) {
      case 'crash':
        this.trend = 3.5;
        this.volatility = 0.6;
        break;
      case 'pump':
        this.trend = -3.5;
        this.volatility = 0.5;
        break;
      case 'volatility':
        this.trend = 0;
        this.volatility = 2.0;
        break;
      case 'fakeRecoveryThenCrash':
        this.trend = -2;
        this.volatility = 0.3;
        // After a short delay we'll slam to crash — handled in GameScene via timer.
        break;
      case 'flatMarket':
        this.trend = 0;
        this.volatility = 0.05;
        break;
    }
  }

  triggerCrashAfterFakeRecovery(): void {
    this.trend = 4;
    this.volatility = 0.8;
  }

  normalise(): void {
    this.trend = Phaser.Math.Linear(this.trend, 0, 0.05);
    this.volatility = Phaser.Math.Linear(this.volatility, 0.4, 0.03);
  }

  getWaypoints(): Segment[] {
    return this.waypoints;
  }

  /** Y value of the road at a given world X (interpolated). */
  getYAtX(worldX: number): number {
    const points = this.waypoints;
    // Binary-search for surrounding pair.
    let lo = 0;
    let hi = points.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (points[mid].x <= worldX) lo = mid;
      else hi = mid;
    }
    if (lo >= points.length - 1) return points[points.length - 1].y;
    const t = (worldX - points[lo].x) / (points[hi].x - points[lo].x);
    return Phaser.Math.Linear(points[lo].y, points[hi].y, t);
  }

  getRoadStep(): number {
    return ROAD_STEP;
  }

  getMaxY(): number {
    return MAX_Y;
  }
}

import { JUDGMENT_BAR_TOTAL_WIDTH, SUCCESS_ZONE_MIN_WIDTH } from '../config';
import { EffectiveStats } from '../player/PlayerState';
import { clamp } from '../utils/helpers';

export class StaminaSystem {
  current: number;
  private stats: EffectiveStats;

  constructor(stats: EffectiveStats) {
    this.stats = stats;
    this.current = stats.staminaMax;
  }

  /** Called when a successful judgment occurs */
  consumeOnSuccess(): void {
    this.current = Math.max(0, this.current - this.stats.staminaCost);
  }

  /** Called every frame to regenerate stamina */
  update(dt: number): void {
    this.current = clamp(
      this.current + this.stats.staminaRegen * dt,
      0,
      this.stats.staminaMax,
    );
  }

  /** Get the success zone width in pixels */
  getSuccessZoneWidth(): number {
    const ratio = this.current / this.stats.staminaMax;
    const width = JUDGMENT_BAR_TOTAL_WIDTH * ratio * this.stats.successZoneMaxRatio;
    return width < SUCCESS_ZONE_MIN_WIDTH ? 0 : width;
  }

  /** Get stamina ratio (0-1) */
  getRatio(): number {
    return this.current / this.stats.staminaMax;
  }

  /** Update stats (when upgrades change between runs) */
  updateStats(stats: EffectiveStats): void {
    this.stats = stats;
  }

  /** Reset to full */
  reset(stats: EffectiveStats): void {
    this.stats = stats;
    this.current = stats.staminaMax;
  }
}

import {
  JUDGMENT_BAR_TOTAL_WIDTH,
  JUDGMENT_FLOOR,
  JUDGMENT_BASE_RANGE,
  JUDGMENT_BONUS_PER_STAMINA,
  JUDGMENT_BASE_MAX_STAMINA,
  JUDGMENT_MAX_RANGE,
  JUDGMENT_EXPONENT,
} from '../config';
import { EffectiveStats } from '../player/PlayerState';
import { clamp } from '../utils/helpers';

export class StaminaSystem {
  current: number;
  private stats: EffectiveStats;

  constructor(stats: EffectiveStats) {
    this.stats = stats;
    this.current = stats.staminaMax;
  }

  /** Called when a successful judgment occurs. costMultiplier < 1 reduces cost (e.g. dual push bonus). */
  consumeOnSuccess(costMultiplier = 1.0): void {
    this.current = Math.max(0, this.current - this.stats.staminaCost * costMultiplier);
  }

  /** Called every frame to regenerate stamina */
  update(dt: number): void {
    this.current = clamp(
      this.current + this.stats.staminaRegen * dt,
      0,
      this.stats.staminaMax,
    );
  }

  /**
   * Power-curve success zone width.
   *
   * if stamina <= 0 → 0
   * else:
   *   t = currentStamina / maxStamina
   *   range = min(baseRange + bonus × (maxStamina - baseMaxStamina), maxRange)
   *   width = min(barWidth, floor + range × t^exponent)
   */
  getSuccessZoneWidth(): number {
    if (this.current <= 0) return 0;

    const t = this.current / this.stats.staminaMax;
    const range = Math.min(
      JUDGMENT_BASE_RANGE
        + JUDGMENT_BONUS_PER_STAMINA * (this.stats.staminaMax - JUDGMENT_BASE_MAX_STAMINA),
      JUDGMENT_MAX_RANGE,
    );

    return Math.min(
      JUDGMENT_BAR_TOTAL_WIDTH,
      JUDGMENT_FLOOR + range * Math.pow(t, JUDGMENT_EXPONENT),
    );
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

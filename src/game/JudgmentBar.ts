import {
  JUDGMENT_HOLD_SUCCESS_TIME,
  JUDGMENT_HOLD_BAR_MULTIPLIER,
  JUDGMENT_BAR_TOTAL_WIDTH,
} from '../config';

const BASE_HOLD_RANGE = JUDGMENT_HOLD_SUCCESS_TIME * JUDGMENT_HOLD_BAR_MULTIPLIER;

export type JudgmentResult = 'success' | 'fail';

export class JudgmentBar {
  /** Pointer position 0..1 across the current effective bar length */
  pointerPosition = 0;
  /** Threshold line ratio in full-bar space (0..1+, fixed anchor) */
  thresholdRatio = 1 / JUDGMENT_HOLD_BAR_MULTIPLIER;
  /** Success zone start ratio in full-bar space (0..1) */
  successZoneStartRatio = 0;
  /** Success zone end ratio in full-bar space (0..1) */
  successZoneEndRatio = 0;
  /** Whether the bar is currently active (visible, timing in progress) */
  active = false;
  /** Seconds held in the current judgment attempt */
  holdElapsed = 0;
  /** Current hold range in seconds (bar represents 0..holdRange) */
  holdRange = BASE_HOLD_RANGE;
  /** Effective visual bar ratio vs full default 3x range (0..1) */
  barRatio = 1;
  /** Current required hold threshold (x) */
  successThresholdTime = JUDGMENT_HOLD_SUCCESS_TIME;

  /** Start the judgment timer (mouse down). */
  start(holdRange: number, successThresholdTime: number, successZoneWidth: number): void {
    this.pointerPosition = 0;
    this.active = true;
    this.holdElapsed = 0;
    this.holdRange = Math.max(0, holdRange);
    this.successThresholdTime = Math.max(0, successThresholdTime);

    this.barRatio = BASE_HOLD_RANGE > 0
      ? Math.max(0, Math.min(1, this.holdRange / BASE_HOLD_RANGE))
      : 0;

    // Keep the single-push requirement anchored in full-bar space.
    this.thresholdRatio = BASE_HOLD_RANGE > 0
      ? Math.max(0, this.successThresholdTime / BASE_HOLD_RANGE)
      : 0;

    const successZoneRatio = JUDGMENT_BAR_TOTAL_WIDTH > 0
      ? Math.max(0, Math.min(1, successZoneWidth / JUDGMENT_BAR_TOTAL_WIDTH))
      : 0;
    const centerRatio = Math.max(0, this.thresholdRatio);
    const halfZone = successZoneRatio / 2;
    this.successZoneStartRatio = Math.max(0, centerRatio - halfZone);
    this.successZoneEndRatio = Math.min(1, centerRatio + halfZone);
  }

  /** Update hold timer each frame */
  update(dt: number): void {
    if (!this.active) return;

    this.holdElapsed += dt;
    if (this.holdRange <= 0) {
      this.pointerPosition = 1;
      return;
    }

    this.pointerPosition = Math.min(1, this.holdElapsed / this.holdRange);
  }

  /** Stop timing and judge by hold duration (mouse up) */
  judge(): JudgmentResult {
    this.active = false;

    if (this.holdRange < this.successThresholdTime) return 'fail';
    const pointerRatioInFullBar = this.pointerPosition * this.barRatio;
    return pointerRatioInFullBar >= this.successZoneStartRatio
      && pointerRatioInFullBar <= this.successZoneEndRatio
      ? 'success'
      : 'fail';
  }
}

import {
  JUDGMENT_BAR_TOTAL_WIDTH,
  JUDGMENT_POINTER_SPEED,
} from '../config';

export type JudgmentResult = 'success' | 'fail';

export class JudgmentBar {
  /** Pointer position 0..1 across the bar */
  pointerPosition = 0;
  /** Direction: 1 = moving right, -1 = moving left */
  private direction = 1;
  /** Whether the bar is currently active (visible, pointer moving) */
  active = false;
  /**
   * Normalized offset (0..1) of the success zone's left edge within the
   * available space: left_px = successZoneOffsetRatio * (barWidth - successZoneWidth)
   * Randomized each time start() is called.
   */
  successZoneOffsetRatio = 0.5;

  /**
   * Start the judgment bar (mouse down).
   * @param successZoneWidth Current success zone width in px — used to enforce the
   *   1/3 constraint: the zone's right edge must extend past the bar's 1/3 mark,
   *   so even a very narrow zone is never entirely hidden in the leftmost section.
   */
  start(successZoneWidth: number): void {
    this.pointerPosition = 0;
    this.direction = 1;
    this.active = true;

    // Constraint: zoneLeft + zoneWidth > barWidth/3
    //  => offsetRatio * availableSpace > barWidth/3 - zoneWidth
    //  => offsetRatio > (barWidth/3 - zoneWidth) / availableSpace
    const barWidth = JUDGMENT_BAR_TOTAL_WIDTH;
    const availableSpace = Math.max(1, barWidth - successZoneWidth);
    const minOffsetRatio = Math.max(0, (barWidth / 3 - successZoneWidth) / availableSpace);

    this.successZoneOffsetRatio = minOffsetRatio + Math.random() * (1 - minOffsetRatio);
  }

  /** Update pointer position each frame */
  update(dt: number): void {
    if (!this.active) return;

    const speed = JUDGMENT_POINTER_SPEED / JUDGMENT_BAR_TOTAL_WIDTH; // normalized speed
    this.pointerPosition += speed * dt * this.direction;

    // Bounce at edges
    if (this.pointerPosition >= 1) {
      this.pointerPosition = 1;
      this.direction = -1;
    } else if (this.pointerPosition <= 0) {
      this.pointerPosition = 0;
      this.direction = 1;
    }
  }

  /** Stop the bar and judge the result (mouse up) */
  judge(successZoneWidth: number): JudgmentResult {
    this.active = false;

    if (successZoneWidth <= 0) return 'fail';

    const barWidth = JUDGMENT_BAR_TOTAL_WIDTH;
    const availableSpace = barWidth - successZoneWidth;
    const successStart = this.successZoneOffsetRatio * availableSpace;
    const successEnd = successStart + successZoneWidth;

    const pointerPx = this.pointerPosition * barWidth;

    return (pointerPx >= successStart && pointerPx <= successEnd) ? 'success' : 'fail';
  }
}

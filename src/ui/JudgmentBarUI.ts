import {
  JUDGMENT_BAR_TOTAL_WIDTH,
  JUDGMENT_BAR_HEIGHT,
  JUDGMENT_FAIL_COLOR,
  JUDGMENT_POINTER_COLOR,
  JUDGMENT_BAR_Y_OFFSET,
} from '../config';

export class JudgmentBarUI {
  private container: HTMLElement;
  private bar: HTMLElement;
  private failBg: HTMLElement;
  private pointer: HTMLElement;
  private thresholdLine: HTMLElement;

  constructor() {
    this.container = document.getElementById('judgment-bar-container')!;
    this.bar = document.getElementById('judgment-bar')!;
    this.failBg = document.getElementById('judgment-bar-fail-bg')!;
    this.pointer = document.getElementById('judgment-bar-pointer')!;
    this.thresholdLine = document.getElementById('judgment-bar-crit')!;

    this.bar.style.width = JUDGMENT_BAR_TOTAL_WIDTH + 'px';
    this.bar.style.height = JUDGMENT_BAR_HEIGHT + 'px';
    this.bar.style.overflow = 'visible';

    this.failBg.style.backgroundColor = JUDGMENT_FAIL_COLOR;
    this.pointer.style.backgroundColor = JUDGMENT_POINTER_COLOR;

    this.thresholdLine.style.display = 'block';
    this.thresholdLine.style.width = '2px';
    this.thresholdLine.style.height = '100%';
    this.thresholdLine.style.opacity = '0.95';
    this.thresholdLine.style.zIndex = '9';
    this.thresholdLine.style.transform = 'translateX(-50%)';
  }

  show(screenX: number, screenY: number): void {
    this.container.style.display = 'block';
    this.container.style.left = (screenX - JUDGMENT_BAR_TOTAL_WIDTH / 2) + 'px';
    this.container.style.top = (screenY + JUDGMENT_BAR_Y_OFFSET) + 'px';
  }

  hide(): void {
    this.container.style.display = 'none';
  }

  /**
   * @param pointerPosition Current hold pointer progress on effective bar (0..1)
   * @param barRatio Effective bar length ratio vs full 3x bar (0..1)
   * @param thresholdRatio Threshold ratio in full-bar space
   */
  update(
    pointerPosition: number,
    barRatio: number,
    thresholdRatio: number,
  ): void {
    const progress = Math.max(0, Math.min(1, pointerPosition));
    const ratio = Math.max(0, Math.min(1, barRatio));

    const activeWidth = ratio * JUDGMENT_BAR_TOTAL_WIDTH;
    this.bar.style.width = `${activeWidth}px`;

    this.failBg.style.width = '100%';

    const pointerPx = progress * activeWidth;
    this.pointer.style.left = pointerPx + 'px';

    const thresholdPx = Math.max(0, thresholdRatio) * JUDGMENT_BAR_TOTAL_WIDTH;
    const thresholdReachable = activeWidth >= thresholdPx;

    this.thresholdLine.style.left = thresholdPx + 'px';

    if (thresholdReachable) {
      this.thresholdLine.style.background = '#FFFFFF';
      this.thresholdLine.style.borderLeft = 'none';
      this.thresholdLine.style.boxShadow = '0 0 6px rgba(255,255,255,0.85)';
    } else {
      // Keep a ghost threshold marker when x is outside the current bar length.
      this.thresholdLine.style.background = 'transparent';
      this.thresholdLine.style.borderLeft = '2px dashed rgba(255,255,255,0.45)';
      this.thresholdLine.style.boxShadow = 'none';
    }
  }
}

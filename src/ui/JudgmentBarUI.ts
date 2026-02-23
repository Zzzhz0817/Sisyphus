import {
  JUDGMENT_BAR_TOTAL_WIDTH,
  JUDGMENT_BAR_HEIGHT,
  JUDGMENT_SUCCESS_COLOR,
  JUDGMENT_FAIL_COLOR,
  JUDGMENT_POINTER_COLOR,
  JUDGMENT_BAR_Y_OFFSET,
} from '../config';

export class JudgmentBarUI {
  private container: HTMLElement;
  private bar: HTMLElement;
  private failBg: HTMLElement;
  private successZone: HTMLElement;
  private pointer: HTMLElement;

  constructor() {
    this.container = document.getElementById('judgment-bar-container')!;
    this.bar = document.getElementById('judgment-bar')!;
    this.failBg = document.getElementById('judgment-bar-fail-bg')!;
    this.successZone = document.getElementById('judgment-bar-success')!;
    this.pointer = document.getElementById('judgment-bar-pointer')!;

    // Set fixed dimensions
    this.bar.style.width = JUDGMENT_BAR_TOTAL_WIDTH + 'px';
    this.bar.style.height = JUDGMENT_BAR_HEIGHT + 'px';
    this.failBg.style.backgroundColor = JUDGMENT_FAIL_COLOR;
    this.successZone.style.backgroundColor = JUDGMENT_SUCCESS_COLOR;
    this.pointer.style.backgroundColor = JUDGMENT_POINTER_COLOR;
  }

  show(screenX: number, screenY: number): void {
    this.container.style.display = 'block';
    this.container.style.left = (screenX - JUDGMENT_BAR_TOTAL_WIDTH / 2) + 'px';
    this.container.style.top = (screenY + JUDGMENT_BAR_Y_OFFSET) + 'px';
  }

  hide(): void {
    this.container.style.display = 'none';
  }

  /** Update the success zone width, its randomized position, and pointer position */
  update(successZoneWidth: number, pointerPosition: number, successZoneOffsetRatio: number): void {
    // Success zone at randomized position within bar bounds
    const availableSpace = JUDGMENT_BAR_TOTAL_WIDTH - successZoneWidth;
    const successLeft = successZoneOffsetRatio * availableSpace;
    this.successZone.style.left = successLeft + 'px';
    this.successZone.style.width = successZoneWidth + 'px';

    // Pointer position (0-1 normalized); transform: translateX(-50%) in CSS centers it
    const pointerPx = pointerPosition * JUDGMENT_BAR_TOTAL_WIDTH;
    this.pointer.style.left = pointerPx + 'px';
  }
}

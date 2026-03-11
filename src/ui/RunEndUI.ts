export class RunEndUI {
  private overlay: HTMLElement;
  private peakEl: HTMLElement;
  private continueBtn: HTMLButtonElement;
  private backBtn: HTMLButtonElement;

  constructor() {
    this.overlay = document.getElementById('run-end-overlay')!;
    this.peakEl = document.getElementById('run-end-peak')!;
    this.continueBtn = document.getElementById('run-end-continue-btn') as HTMLButtonElement;
    this.backBtn = document.getElementById('run-end-map-btn') as HTMLButtonElement;
  }

  show(peakHeight: number, onContinue: () => void, onBackToMap: () => void): void {
    this.peakEl.textContent = `${Math.floor(peakHeight)}m`;
    this.continueBtn.onclick = onContinue;
    this.backBtn.onclick = onBackToMap;
    this.overlay.style.display = 'flex';
  }

  hide(): void {
    this.overlay.style.display = 'none';
  }
}
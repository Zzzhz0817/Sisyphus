import { PersistentState } from '../player/PlayerState';

export class HUD {
  private obolEl: HTMLElement;
  private ingotEl: HTMLElement;
  private heightEl: HTMLElement;
  private notificationEl: HTMLElement;
  private mountainNameEl: HTMLElement | null;
  private tutorialHintEl: HTMLElement;
  private notificationVisible = false;

  constructor() {
    this.obolEl = document.getElementById('hud-obol')!;
    this.ingotEl = document.getElementById('hud-ingot')!;
    this.heightEl = document.getElementById('hud-height')!;
    this.notificationEl = document.getElementById('checkpoint-notification')!;
    this.mountainNameEl = document.getElementById('hud-mountain-name');
    this.tutorialHintEl = document.getElementById('tutorial-hint')!;
  }

  setMountainName(name: string): void {
    if (this.mountainNameEl) {
      this.mountainNameEl.textContent = name;
    }
  }

  update(persistent: PersistentState, currentHeight: number): void {
    this.obolEl.textContent = String(persistent.obol);
    this.ingotEl.textContent = String(persistent.ingot);
    this.heightEl.textContent = `${Math.floor(currentHeight)}m`;
  }

  showNotification(text: string): void {
    if (this.notificationVisible) return;
    this.notificationVisible = true;
    this.notificationEl.textContent = text;
    this.notificationEl.classList.add('show');
  }

  hideNotification(): void {
    if (!this.notificationVisible) return;
    this.notificationVisible = false;
    this.notificationEl.classList.remove('show');
  }

  showTutorialHint(text: string): void {
    this.tutorialHintEl.textContent = text;
    this.tutorialHintEl.classList.add('show');
  }

  hideTutorialHint(): void {
    this.tutorialHintEl.classList.remove('show');
  }
}

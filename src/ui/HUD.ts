import { PersistentState } from '../player/PlayerState';

export class HUD {
  private obolusEl: HTMLElement;
  private drachmaEl: HTMLElement;
  private staterEl: HTMLElement;
  private ingotEl: HTMLElement;
  private heightEl: HTMLElement;
  private notificationEl: HTMLElement;
  private notificationVisible = false;

  constructor() {
    this.obolusEl = document.getElementById('hud-obolus')!;
    this.drachmaEl = document.getElementById('hud-drachma')!;
    this.staterEl = document.getElementById('hud-stater')!;
    this.ingotEl = document.getElementById('hud-ingot')!;
    this.heightEl = document.getElementById('hud-height')!;
    this.notificationEl = document.getElementById('checkpoint-notification')!;
  }

  update(persistent: PersistentState, currentHeight: number): void {
    this.obolusEl.textContent = String(persistent.obolus);
    this.drachmaEl.textContent = String(persistent.drachma);
    this.staterEl.textContent = String(persistent.stater);
    this.ingotEl.textContent = String(persistent.ingot);
    this.heightEl.textContent = `${Math.floor(currentHeight)}m`;
  }

  showNotification(text: string): void {
    if (this.notificationVisible) return; // already showing, don't re-trigger
    this.notificationVisible = true;
    this.notificationEl.textContent = text;
    this.notificationEl.classList.add('show');
  }

  hideNotification(): void {
    if (!this.notificationVisible) return;
    this.notificationVisible = false;
    this.notificationEl.classList.remove('show');
  }
}

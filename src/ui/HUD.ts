import { PersistentState } from '../player/PlayerState';

export class HUD {
  private obolusEl: HTMLElement;
  private drachmaEl: HTMLElement;
  private staterEl: HTMLElement;
  private ingotEl: HTMLElement;
  private heightEl: HTMLElement;
  private maxHeightEl: HTMLElement;
  private longestDistanceEl: HTMLElement;
  private currentDistanceEl: HTMLElement;
  private notificationEl: HTMLElement;
  private devBuffEl: HTMLElement;
  private notificationVisible = false;

  constructor() {
    this.obolusEl = document.getElementById('hud-obolus')!;
    this.drachmaEl = document.getElementById('hud-drachma')!;
    this.staterEl = document.getElementById('hud-stater')!;
    this.ingotEl = document.getElementById('hud-ingot')!;
    this.heightEl = document.getElementById('hud-height')!;
    this.maxHeightEl = document.getElementById('hud-max-height')!;
    this.longestDistanceEl = document.getElementById('hud-longest-distance')!;
    this.currentDistanceEl = document.getElementById('hud-current-distance')!;
    this.notificationEl = document.getElementById('checkpoint-notification')!;
    this.devBuffEl = document.getElementById('dev-buffs')!;
  }

  update(persistent: PersistentState, currentHeight: number, currentDistance: number): void {
    this.obolusEl.textContent = String(persistent.obolus);
    this.drachmaEl.textContent = String(persistent.drachma);
    this.staterEl.textContent = String(persistent.stater);
    this.ingotEl.textContent = String(persistent.ingot);
    this.heightEl.textContent = `${Math.floor(currentHeight)}m`;
    this.maxHeightEl.textContent = `${Math.floor(persistent.highestEver)}m`;
    this.longestDistanceEl.textContent = `${Math.floor(persistent.longestDistanceEver)}m`;
    this.currentDistanceEl.textContent = `${Math.floor(currentDistance)}m`;

    const buffs = persistent.mapRewards;
    this.devBuffEl.innerHTML = [
      '<div class="dev-buff-title">DEV BUFFS</div>',
      `<div>+ Max Stamina: ${buffs.staminaMaxGrowth.toFixed(0)}</div>`,
      `<div>- Hold Threshold: ${buffs.thresholdReduction.toFixed(2)}s</div>`,
      `<div>+ Push Distance: ${buffs.pushDistanceBonus.toFixed(0)}</div>`,
      `<div>- Cost Growth: ${buffs.staminaCostGrowthReduction.toFixed(2)}/push</div>`,
    ].join('');
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
}

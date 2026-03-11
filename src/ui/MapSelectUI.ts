import { MAP_TEMPLATES, MapRewardType } from '../config';

function rewardLabel(type: MapRewardType): string {
  switch (type) {
    case 'staminaMaxGrowth':
      return 'Reward: Max Stamina Growth (inverse / push)';
    case 'thresholdReduction':
      return 'Reward: Lower Hold Threshold (inverse / push)';
    case 'pushDistanceBonus':
      return 'Reward: Push Distance Up (inverse / push)';
    case 'staminaCostGrowthReduction':
      return 'Reward: Lower Cost Growth (inverse / push)';
  }
}

export class MapSelectUI {
  private overlay: HTMLElement;
  private list: HTMLElement;

  constructor() {
    this.overlay = document.getElementById('map-select-overlay')!;
    this.list = document.getElementById('map-select-list')!;
  }

  show(onSelect: (index: number) => void): void {
    this.list.innerHTML = '';

    MAP_TEMPLATES.forEach((map, index) => {
      const btn = document.createElement('button');
      btn.className = 'map-card';
      btn.innerHTML = `
        <div class="map-card-title">${map.name}</div>
        <div class="map-card-sub">Placeholder Copy</div>
        <div class="map-card-reward">${rewardLabel(map.rewardType)}</div>
      `;
      btn.addEventListener('click', () => onSelect(index));
      this.list.appendChild(btn);
    });

    this.overlay.style.display = 'block';
  }

  hide(): void {
    this.overlay.style.display = 'none';
  }
}
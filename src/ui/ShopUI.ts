import { UPGRADES, ARTIFACTS, MAX_EQUIPPED_ARTIFACTS, MOUNTAINS } from '../config';
import { PersistentState } from '../player/PlayerState';
import { canAfford } from '../player/CurrencyManager';
import { getUpgradeCost, isPrerequisiteMet, purchaseUpgrade } from '../player/UpgradeManager';

export class ShopUI {
  private overlay: HTMLElement;
  private upgradesContainer: HTMLElement;
  private artifactsContainer: HTMLElement;
  private artifactSection: HTMLElement;
  private currencyBar: HTMLElement;
  private statsEl: HTMLElement;
  private departBtn: HTMLElement;

  private onDepart: (() => void) | null = null;

  constructor() {
    this.overlay = document.getElementById('shop-overlay')!;
    this.upgradesContainer = document.getElementById('shop-upgrades')!;
    this.artifactsContainer = document.getElementById('shop-artifacts')!;
    this.artifactSection = document.getElementById('shop-artifact-section')!;
    this.currencyBar = document.createElement('div');
    this.statsEl = document.getElementById('shop-stats')!;
    this.departBtn = document.getElementById('shop-depart-btn')!;

    this.departBtn.addEventListener('click', () => {
      if (this.onDepart) this.onDepart();
    });
  }

  show(state: PersistentState, runEarnings: { obol: number; ingot: number }, onDepart: () => void): void {
    this.onDepart = onDepart;
    this.overlay.style.display = 'block';
    this.refresh(state, runEarnings);
  }

  hide(): void {
    this.overlay.style.display = 'none';
  }

  private refresh(state: PersistentState, runEarnings: { obol: number; ingot: number }): void {
    this.statsEl.innerHTML = `
      <div style="display: flex; justify-content: center; gap: 24px; align-items: center;">
        <div class="currency-display"><div class="currency-icon obol"></div><span>${state.obol}</span></div>
        <div class="currency-display"><div class="currency-icon ingot"></div><span>${state.ingot}</span></div>
      </div>
    `;

    // Upgrades
    this.upgradesContainer.innerHTML = '';

    const upgradeKeys = Object.keys(UPGRADES).sort((a, b) => {
      const aMet = isPrerequisiteMet(a, state);
      const bMet = isPrerequisiteMet(b, state);
      if (aMet && !bMet) return -1;
      if (!aMet && bMet) return 1;
      return 0;
    });

    for (const id of upgradeKeys) {
      const config = UPGRADES[id];
      const level = state.upgradeLevels[id] ?? 0;
      const maxed = level >= config.maxLevel;
      const prereqMet = isPrerequisiteMet(id, state);
      const cost = getUpgradeCost(id, level);
      const affordable = canAfford(state, cost);
      const locked = !prereqMet;

      const card = document.createElement('div');
      card.className = 'upgrade-card';
      if (locked) card.classList.add('locked');
      if (maxed) card.classList.add('maxed');

      let costText = '';
      if (!maxed) {
        costText = `${cost.obol} Obol`;
      }

      let statusText = '';
      if (maxed) statusText = '<span style="color:#4caf50">MAXED</span>';
      else if (locked) {
        if (config.prerequisite) {
          const [pid, plvl] = config.prerequisite.split(':');
          const pConfig = UPGRADES[pid];
          statusText = `Requires ${pConfig?.name ?? pid} Lv${plvl}`;
        } else {
          statusText = 'Locked';
        }
      } else {
        statusText = costText;
      }

      card.innerHTML = `
        <div class="upgrade-name">${config.name} <span style="float:right; font-size:12px; opacity:0.7">Lv ${level}/${config.maxLevel}</span></div>
        <div class="upgrade-desc">${config.description}</div>
        <div class="upgrade-cost" ${!affordable && !maxed && !locked ? 'style="color:var(--fail-red)"' : ''}>
            ${statusText}
        </div>
      `;

      if (!locked && !maxed) {
        card.addEventListener('click', () => {
          if (canAfford(state, cost)) {
            purchaseUpgrade(id, state);
            this.refresh(state, runEarnings);
          }
        });
      }

      this.upgradesContainer.appendChild(card);
    }

    // Artifacts (always visible)
    {
      this.artifactSection.style.display = 'block';
      this.artifactsContainer.innerHTML = '';

      for (const artifact of ARTIFACTS) {
        const crafted = state.craftedArtifacts.includes(artifact.id);
        const equipped = state.equippedArtifacts.includes(artifact.id);
        const canCraft = !crafted && state.ingot >= artifact.ingotCost;

        const card = document.createElement('div');
        card.className = 'artifact-card';
        if (crafted) card.classList.add('crafted');
        if (equipped) card.classList.add('equipped');
        if (!crafted && !canCraft) card.classList.add('unavailable');

        let actionText = '';
        if (equipped) actionText = 'EQUIPPED (Click to unequip)';
        else if (crafted) actionText = 'OWNED (Click to equip)';
        else actionText = `${artifact.ingotCost} Ingot to Craft`;

        card.innerHTML = `
          <div class="artifact-name">${artifact.name}</div>
          <div class="artifact-desc">${artifact.description}</div>
          <div class="artifact-cost" style="${equipped ? 'color:var(--success-green)' : crafted ? 'color:var(--primary-gold)' : ''}">
            ${actionText}
          </div>
        `;

        card.addEventListener('click', () => {
          if (!crafted && canCraft) {
            state.ingot -= artifact.ingotCost;
            state.craftedArtifacts.push(artifact.id);
            this.refresh(state, runEarnings);
          } else if (crafted && !equipped) {
            if (state.equippedArtifacts.length < MAX_EQUIPPED_ARTIFACTS) {
              state.equippedArtifacts.push(artifact.id);
              this.refresh(state, runEarnings);
            }
          } else if (equipped) {
            state.equippedArtifacts = state.equippedArtifacts.filter((id) => id !== artifact.id);
            this.refresh(state, runEarnings);
          }
        });

        this.artifactsContainer.appendChild(card);
      }
    }

    // Mountain selector
    this.renderMountainSelector(state, runEarnings);
  }

  private renderMountainSelector(state: PersistentState, runEarnings: { obol: number; ingot: number }): void {
    let container = document.getElementById('shop-mountain-selector');
    if (!container) {
      container = document.createElement('div');
      container.id = 'shop-mountain-selector';
      // Insert before the depart button
      this.departBtn.parentElement!.insertBefore(container, this.departBtn);
    }

    container.innerHTML = `
      <div style="margin: 20px 0 10px; text-align: center; font-family: 'Cinzel', serif; color: var(--primary-gold, #FFD740); font-size: 16px; letter-spacing: 1px;">
        Choose Your Mountain
      </div>
      <div id="mountain-options" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;"></div>
    `;

    const optionsEl = container.querySelector('#mountain-options')!;

    for (let i = 0; i < MOUNTAINS.length; i++) {
      const m = MOUNTAINS[i];
      const unlocked = state.mountainsUnlocked[i];
      const summited = state.mountainsSummited[i];
      const selected = state.selectedMountainIndex === i;

      const option = document.createElement('div');
      option.style.cssText = `
        display: flex; align-items: center; gap: 12px;
        padding: 10px 16px; border-radius: 8px; cursor: ${unlocked ? 'pointer' : 'default'};
        background: ${selected ? 'rgba(255, 215, 64, 0.15)' : 'rgba(255,255,255,0.05)'};
        border: 2px solid ${selected ? 'var(--primary-gold, #FFD740)' : 'rgba(255,255,255,0.1)'};
        opacity: ${unlocked ? '1' : '0.4'};
        transition: all 0.2s;
      `;

      const radio = selected ? '&#9679;' : '&#9675;';
      const lockIcon = unlocked ? '' : ' &#128274;';
      const summitBadge = summited ? ' <span style="color:#4caf50; font-size:12px;">&#10003; Summited</span>' : '';
      const multiplierColor = m.pushDistanceMultiplier < 1 ? '#FF5252' : '#4caf50';

      option.innerHTML = `
        <span style="font-size: 18px; color: var(--primary-gold, #FFD740);">${radio}</span>
        <div style="flex: 1;">
          <div style="font-family: 'Cinzel', serif; font-size: 14px; color: #fff;">
            ${m.name}${lockIcon}${summitBadge}
          </div>
          <div style="font-size: 11px; color: rgba(255,255,255,0.6);">
            Height: ${m.height.toLocaleString()} | Push: <span style="color:${multiplierColor}">&times;${m.pushDistanceMultiplier}</span>
          </div>
        </div>
      `;

      if (unlocked) {
        option.addEventListener('click', () => {
          state.selectedMountainIndex = i;
          this.refresh(state, runEarnings);
        });
        option.addEventListener('mouseenter', () => {
          if (!selected) option.style.background = 'rgba(255, 215, 64, 0.08)';
        });
        option.addEventListener('mouseleave', () => {
          if (!selected) option.style.background = 'rgba(255,255,255,0.05)';
        });
      }

      optionsEl.appendChild(option);
    }
  }
}

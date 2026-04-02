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
        costText = `
          <div class="currency-icon obol" style="transform: scale(0.8); transform-origin: center;"></div>
          <span>${cost.obol}</span>
        `;
      }

      let statusText = '';
      if (maxed) statusText = '<span style="color:#4caf50">MAXED</span>';
      else if (locked) {
        if (config.prerequisite) {
          const [pid, plvl] = config.prerequisite.split(':');
          const pConfig = UPGRADES[pid];
          statusText = `<span style="font-size: 12px;">Requires ${pConfig?.name ?? pid} Lv${plvl}</span>`;
        } else {
          statusText = 'Locked';
        }
      } else {
        statusText = costText;
      }

      const progressPercent = (level / config.maxLevel) * 100;

      card.innerHTML = `
        <div class="pillar-top">
          <div class="upgrade-name">${config.name}</div>
          <div class="upgrade-level">Level ${level} / ${config.maxLevel}</div>
        </div>
        <div class="pillar-mid">
          <div class="upgrade-desc">${config.description}</div>
          <div class="upgrade-progress-bg">
            <div class="upgrade-progress-fill" style="width: ${progressPercent}%"></div>
          </div>
        </div>
        <div class="pillar-bottom">
          <div class="upgrade-cost" ${!affordable && !maxed && !locked ? 'style="color:var(--fail-red)"' : ''}>
            ${statusText}
          </div>
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

    // Artifacts (visible only after player has obtained at least one ingot or crafted an artifact)
    {
      const shouldShowArtifacts = state.ingot > 0 || state.craftedArtifacts.length > 0;
      this.artifactSection.style.display = shouldShowArtifacts ? 'block' : 'none';
      this.artifactsContainer.innerHTML = '';

      for (const artifact of ARTIFACTS) {
        const crafted = state.craftedArtifacts.includes(artifact.id);
        const equipped = state.equippedArtifacts.includes(artifact.id);
        const canCraft = !crafted && state.ingot >= artifact.ingotCost;

        const card = document.createElement('div');
        card.className = 'artifact-pedestal';
        if (crafted) card.classList.add('crafted');
        if (equipped) card.classList.add('equipped');
        if (!crafted && !canCraft) card.classList.add('unavailable');

        let actionText = '';
        if (equipped) actionText = 'EQUIPPED (Click to unequip)';
        else if (crafted) actionText = 'OWNED (Click to equip)';
        else actionText = `
          <div class="currency-icon ingot" style="transform: scale(0.8); transform-origin: center;"></div>
          <span>${artifact.ingotCost} to Craft</span>
        `;

        // Map artifact ID to specific CSS icon class
        let iconClass = 'art-ares'; // Default
        if (artifact.id === 'dualPush') iconClass = 'art-heracles';
        if (artifact.id === 'wedge') iconClass = 'art-hephaestus';
        if (artifact.id === 'qte') iconClass = 'art-wheel';

        card.innerHTML = `
          <div class="artifact-icon-container">
            <div class="art-icon ${iconClass}"></div>
          </div>
          <div class="artifact-name">${artifact.name}</div>
          <div class="artifact-cost" style="${equipped ? 'color:var(--success-green)' : crafted ? 'color:var(--primary-gold)' : ''}">
            ${actionText}
          </div>
          <div class="artifact-tooltip">
            <div class="artifact-name" style="font-size: 14px; margin-bottom: 4px;">${artifact.name}</div>
            <div class="artifact-desc" style="margin-bottom: 0;">${artifact.description}</div>
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
    // Only show after player has summited the first mountain (index 0)
    if (!state.mountainsSummited[0]) {
      // Hide container if it exists
      const existingContainer = document.getElementById('shop-mountain-selector');
      if (existingContainer) {
        existingContainer.style.display = 'none';
      }
      return;
    }

    let container = document.getElementById('shop-mountain-selector');
    if (!container) {
      container = document.createElement('div');
      container.id = 'shop-mountain-selector';
      container.className = 'shop-section';
      // Insert before the depart button
      this.departBtn.parentElement!.insertBefore(container, this.departBtn);
    }
    container.style.display = '';

    container.innerHTML = `
      <h2>Choose Your Mountain</h2>
      <div class="mountain-track" id="mountain-options"></div>
    `;

    const optionsEl = container.querySelector('#mountain-options')!;

    for (let i = 0; i < MOUNTAINS.length; i++) {
      const m = MOUNTAINS[i];
      const unlocked = state.mountainsUnlocked[i];
      const summited = state.mountainsSummited[i];
      const selected = state.selectedMountainIndex === i;

      const node = document.createElement('div');
      node.className = `mountain-node ${unlocked ? '' : 'locked'} ${selected ? 'selected' : ''}`;

      const multiplierColor = m.pushDistanceMultiplier < 1 ? 'var(--fail-red)' : 'var(--success-green)';
      
      let markerHtml = '';
      if (selected) {
        markerHtml = `<div class="mountain-marker">▼</div>`;
      } else if (!unlocked) {
        markerHtml = `<div class="mountain-marker" style="animation:none; color:#888; font-size:18px;">🔒</div>`;
      } else if (summited) {
        markerHtml = `<div class="mountain-marker" style="animation:none; color:var(--success-green); font-size:16px;">★</div>`;
      }

      node.innerHTML = `
        <div class="mountain-visuals">
          ${markerHtml}
          <div class="mountain-glow"></div>
          <div class="mountain-peak"></div>
        </div>
        <div class="mountain-info">
          <div class="mountain-name">${m.name}</div>
          <div class="mountain-stats">
            ${m.height.toLocaleString()}m<br>
            Push: <span style="color:${multiplierColor}">&times;${m.pushDistanceMultiplier}</span>
          </div>
        </div>
      `;

      if (unlocked) {
        node.addEventListener('click', () => {
          state.selectedMountainIndex = i;
          this.refresh(state, runEarnings);
        });
      }

      optionsEl.appendChild(node);
    }
  }
}

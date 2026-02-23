import { UPGRADES, ARTIFACTS, MAX_EQUIPPED_ARTIFACTS } from '../config';
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
    // Note: shop-currency-bar is no longer in the new HTML, we might remove it or repurpose
    // But let's check index.html again. Ah, I removed shop-currency-bar in the new HTML.
    // I should probably remove it here too or add it back if needed.
    // The new HTML has HUD visible behind? No, shop overlay covers everything.
    // Wait, the new HTML shop content has:
    // <div id="shop-stats"></div>
    // <div class="shop-section">...</div>
    // It does NOT have shop-currency-bar.
    // I should add a currency display to the shop or rely on the HUD if it's visible (but overlay background is opaque-ish).
    // Let's add a currency display to the shop header or stats area.
    
    this.currencyBar = document.createElement('div'); // Dummy for now to avoid null check errors if I don't fully refactor
    this.statsEl = document.getElementById('shop-stats')!;
    this.departBtn = document.getElementById('shop-depart-btn')!;

    this.departBtn.addEventListener('click', () => {
      if (this.onDepart) this.onDepart();
    });
  }

  show(state: PersistentState, runEarnings: { obolus: number; drachma: number; stater: number; ingot: number }, onDepart: () => void): void {
    this.onDepart = onDepart;
    this.overlay.style.display = 'block';
    this.refresh(state, runEarnings);
  }

  hide(): void {
    this.overlay.style.display = 'none';
  }

  private refresh(state: PersistentState, runEarnings: { obolus: number; drachma: number; stater: number; ingot: number }): void {
    this.statsEl.innerHTML = `
      <div style="display: flex; justify-content: center; gap: 24px; align-items: center;">
        <div class="currency-display"><div class="currency-icon obolus"></div><span>${state.obolus}</span></div>
        <div class="currency-display"><div class="currency-icon drachma"></div><span>${state.drachma}</span></div>
        <div class="currency-display"><div class="currency-icon stater"></div><span>${state.stater}</span></div>
        <div class="currency-display"><div class="currency-icon ingot"></div><span>${state.ingot}</span></div>
      </div>
    `;

    // Upgrades
    this.upgradesContainer.innerHTML = '';
    
    // Sort upgrades: unlocked first, then locked
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
        const parts: string[] = [];
        if ((cost.obolus ?? 0) > 0) parts.push(`${cost.obolus} C`);
        if ((cost.drachma ?? 0) > 0) parts.push(`${cost.drachma} S`);
        if ((cost.stater ?? 0) > 0) parts.push(`${cost.stater} G`);
        costText = parts.join(' ');
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

    // Artifacts
    // Always show artifact section if we have ingots or any artifacts, or if we want to tease them
    // For now, keep logic: show if we have ingot or any artifact
    if (state.ingot > 0 || state.craftedArtifacts.length > 0) {
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
            // Craft
            state.ingot -= artifact.ingotCost;
            state.craftedArtifacts.push(artifact.id);
            this.refresh(state, runEarnings);
          } else if (crafted && !equipped) {
            // Equip
            if (state.equippedArtifacts.length < MAX_EQUIPPED_ARTIFACTS) {
              state.equippedArtifacts.push(artifact.id);
              this.refresh(state, runEarnings);
            }
          } else if (equipped) {
            // Unequip
            state.equippedArtifacts = state.equippedArtifacts.filter(id => id !== artifact.id);
            this.refresh(state, runEarnings);
          }
        });

        this.artifactsContainer.appendChild(card);
      }
    } else {
      this.artifactSection.style.display = 'none';
    }
  }
}

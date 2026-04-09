import { UPGRADES, ARTIFACTS, MAX_EQUIPPED_ARTIFACTS, MOUNTAINS } from '../config';
import { PersistentState } from '../player/PlayerState';
import { canAfford } from '../player/CurrencyManager';
import { getUpgradeCost, isPrerequisiteMet, purchaseUpgrade } from '../player/UpgradeManager';
import { ui, toggleLang, getLang, getMountainName, getUpgradeName, getUpgradeDesc, getArtifactName, getArtifactDesc } from '../i18n';

export class ShopUI {
  private overlay: HTMLElement;
  private upgradesContainer: HTMLElement;
  private artifactsContainer: HTMLElement;
  private artifactSection: HTMLElement;
  private statsEl: HTMLElement;
  private departBtn: HTMLElement;
  private titleEl: HTMLElement;
  private upgradesTitleEl: HTMLElement;
  private artifactsTitleEl: HTMLElement;
  private langBtn: HTMLButtonElement;

  private onDepart: (() => void) | null = null;
  private currentState: PersistentState | null = null;
  private currentEarnings: { obol: number; ingot: number } | null = null;

  constructor() {
    this.overlay = document.getElementById('shop-overlay')!;
    this.upgradesContainer = document.getElementById('shop-upgrades')!;
    this.artifactsContainer = document.getElementById('shop-artifacts')!;
    this.artifactSection = document.getElementById('shop-artifact-section')!;
    this.statsEl = document.getElementById('shop-stats')!;
    this.departBtn = document.getElementById('shop-depart-btn')!;
    this.titleEl = document.getElementById('shop-title')!;
    this.upgradesTitleEl = document.getElementById('shop-upgrades-title')!;
    this.artifactsTitleEl = document.getElementById('shop-artifacts-title')!;

    this.departBtn.addEventListener('click', () => {
      if (this.onDepart) this.onDepart();
    });

    // Language toggle button (top-right of shop overlay)
    this.langBtn = document.createElement('button');
    this.langBtn.id = 'lang-toggle-btn';
    this.langBtn.textContent = ui().langBtn;
    this.langBtn.style.cssText = [
      'position:fixed',
      'top:16px',
      'right:20px',
      'z-index:1000',
      'padding:6px 14px',
      'background:rgba(255,255,255,0.08)',
      'border:1px solid rgba(255,255,255,0.25)',
      'border-radius:6px',
      'color:#fff',
      'font-size:13px',
      'font-family:var(--font-body,sans-serif)',
      'letter-spacing:1px',
      'cursor:pointer',
      'transition:background 0.2s',
    ].join(';');
    this.langBtn.addEventListener('mouseenter', () => {
      this.langBtn.style.background = 'rgba(255,255,255,0.18)';
    });
    this.langBtn.addEventListener('mouseleave', () => {
      this.langBtn.style.background = 'rgba(255,255,255,0.08)';
    });
    this.langBtn.addEventListener('click', () => {
      toggleLang();
      this.langBtn.textContent = ui().langBtn;
      if (this.currentState && this.currentEarnings) {
        this.updateStaticText();
        this.refresh(this.currentState, this.currentEarnings);
      }
    });
    this.overlay.appendChild(this.langBtn);
  }

  show(state: PersistentState, runEarnings: { obol: number; ingot: number }, onDepart: () => void): void {
    this.onDepart = onDepart;
    this.currentState = state;
    this.currentEarnings = runEarnings;
    this.overlay.style.display = 'block';
    this.overlay.scrollTop = 0;
    this.langBtn.style.display = 'block';
    this.updateStaticText();
    this.departBtn.textContent = state.totalRuns === 0 ? ui().startClimbing : ui().climbAgain;
    this.refresh(state, runEarnings);
  }

  hide(): void {
    this.overlay.style.display = 'none';
    this.langBtn.style.display = 'none';
  }

  private updateStaticText(): void {
    this.titleEl.textContent = ui().shopTitle;
    this.upgradesTitleEl.textContent = ui().upgrades;
    this.artifactsTitleEl.textContent = ui().artifactForge;
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

      const localName = getUpgradeName(id, config.name);
      const localDesc = getUpgradeDesc(id, config.description);

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
      if (maxed) statusText = `<span style="color:#4caf50">${ui().maxed}</span>`;
      else if (locked) {
        if (config.prerequisite) {
          const [pid, plvl] = config.prerequisite.split(':');
          const pConfig = UPGRADES[pid];
          const prereqLocalName = getUpgradeName(pid, pConfig?.name ?? pid);
          statusText = `<span style="font-size: 12px;">${ui().requires(prereqLocalName, plvl)}</span>`;
        } else {
          statusText = ui().locked;
        }
      } else {
        statusText = costText;
      }

      const progressPercent = (level / config.maxLevel) * 100;

      card.innerHTML = `
        <div class="pillar-top">
          <div class="upgrade-name">${localName}</div>
          <div class="upgrade-level">${ui().levelDisplay(level, config.maxLevel)}</div>
        </div>
        <div class="pillar-mid">
          <div class="upgrade-desc">${localDesc}</div>
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

        const localName = getArtifactName(artifact.id, artifact.name);
        const localDesc = getArtifactDesc(artifact.id, artifact.description);

        const card = document.createElement('div');
        card.className = 'artifact-pedestal';
        if (crafted) card.classList.add('crafted');
        if (equipped) card.classList.add('equipped');
        if (!crafted && !canCraft) card.classList.add('unavailable');

        let actionText = '';
        if (equipped) actionText = ui().equipped;
        else if (crafted) actionText = ui().owned;
        else actionText = `
          <div class="currency-icon ingot" style="transform: scale(0.8); transform-origin: center;"></div>
          <span>${artifact.ingotCost}</span>
        `;

        let iconClass = 'art-ares';
        if (artifact.id === 'dualPush') iconClass = 'art-heracles';
        if (artifact.id === 'wedge') iconClass = 'art-hephaestus';
        if (artifact.id === 'qte') iconClass = 'art-wheel';

        card.innerHTML = `
          <div class="artifact-icon-container">
            <div class="art-icon ${iconClass}"></div>
          </div>
          <div class="artifact-name">${localName}</div>
          <div class="artifact-cost" style="${equipped ? 'color:var(--success-green)' : crafted ? 'color:var(--primary-gold)' : ''}">
            ${actionText}
          </div>
          <div class="artifact-tooltip">
            <div class="artifact-name" style="font-size: 14px; margin-bottom: 4px;">${localName}</div>
            <div class="artifact-desc" style="margin-bottom: 8px;">${localDesc}</div>
            <div style="font-size: 11px; color: ${equipped ? 'var(--fail-red)' : 'var(--success-green)'}; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">
              ${equipped ? ui().clickUnequip : crafted ? ui().clickEquip : ui().clickCraft}
            </div>
          </div>
        `;

        card.addEventListener('click', () => {
          if (!crafted && canCraft) {
            state.ingot -= artifact.ingotCost;
            state.craftedArtifacts.push(artifact.id);
            if (state.equippedArtifacts.length < MAX_EQUIPPED_ARTIFACTS) {
              state.equippedArtifacts.push(artifact.id);
            }
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
    if (!state.mountainsSummited[0]) {
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
      this.departBtn.parentElement!.insertBefore(container, this.departBtn);
    }
    container.style.display = '';

    container.innerHTML = `
      <h2>${ui().chooseMountain}</h2>
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
          <div class="mountain-name">${getMountainName(m.name)}</div>
          <div class="mountain-stats">
            ${m.height.toLocaleString()}m<br>
            ${ui().push}: <span style="color:${multiplierColor}">&times;${m.pushDistanceMultiplier}</span>
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

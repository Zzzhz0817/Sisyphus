import { UPGRADES, UPGRADE_COST_MULTIPLIER, UpgradeConfig } from '../config';
import { PersistentState } from './PlayerState';
import { canAfford, spendCurrency, CurrencyCost } from './CurrencyManager';

/** Get the cost for the next level of an upgrade */
export function getUpgradeCost(upgradeId: string, currentLevel: number): CurrencyCost {
  const config = UPGRADES[upgradeId];
  if (!config) return { obol: Infinity };
  const mult = Math.pow(UPGRADE_COST_MULTIPLIER, currentLevel); // level 0->1 = base cost
  return {
    obol: Math.floor(config.baseCost.obol * mult),
  };
}

/** Check if prerequisite is met */
export function isPrerequisiteMet(upgradeId: string, state: PersistentState): boolean {
  const config = UPGRADES[upgradeId];
  if (!config || !config.prerequisite) return true;
  const [prereqId, prereqLevelStr] = config.prerequisite.split(':');
  const prereqLevel = parseInt(prereqLevelStr, 10);
  return (state.upgradeLevels[prereqId] ?? 0) >= prereqLevel;
}

/** Check if an upgrade can be purchased */
export function canPurchaseUpgrade(upgradeId: string, state: PersistentState): boolean {
  const config = UPGRADES[upgradeId];
  if (!config) return false;
  const currentLevel = state.upgradeLevels[upgradeId] ?? 0;
  if (currentLevel >= config.maxLevel) return false;
  if (!isPrerequisiteMet(upgradeId, state)) return false;
  const cost = getUpgradeCost(upgradeId, currentLevel);
  return canAfford(state, cost);
}

/** Purchase an upgrade. Returns true on success. */
export function purchaseUpgrade(upgradeId: string, state: PersistentState): boolean {
  if (!canPurchaseUpgrade(upgradeId, state)) return false;
  const currentLevel = state.upgradeLevels[upgradeId] ?? 0;
  const cost = getUpgradeCost(upgradeId, currentLevel);
  if (!spendCurrency(state, cost)) return false;
  state.upgradeLevels[upgradeId] = currentLevel + 1;
  return true;
}

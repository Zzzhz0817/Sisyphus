import { STAMINA_MAX_BASE, STAMINA_REGEN_RATE_BASE, STAMINA_COST_PER_SUCCESS, PUSH_DISTANCE_BASE, UPGRADES } from '../config';

/** Per-run analytics record */
export interface RunRecord {
  runNumber: number;
  peakHeight: number;
  pushSuccess: number;
  pushFail: number;
  qteAttempted: number;
  qteSuccess: number;
  earnings: { obolus: number; drachma: number; stater: number; ingot: number };
}

/** Persistent state across runs (reset on page refresh) */
export interface PersistentState {
  obolus: number;
  drachma: number;
  stater: number;
  ingot: number;
  upgradeLevels: Record<string, number>;
  craftedArtifacts: string[];
  equippedArtifacts: string[];
  claimedMilestones: number[];
  highestEver: number;
  totalRuns: number;
  runHistory: RunRecord[];
  // Mountain system
  mountainsUnlocked: boolean[];   // which mountains are accessible
  mountainsSummited: boolean[];   // which mountains have been summited (for one-time ingot)
  selectedMountainIndex: number;  // which mountain to climb next
}

/** Derived stats computed from upgrades */
export interface EffectiveStats {
  pushDistance: number;
  staminaMax: number;
  staminaCost: number;
  staminaRegen: number;
}

export function createInitialPersistentState(): PersistentState {
  return {
    obolus: 0,
    drachma: 0,
    stater: 0,
    ingot: 0,
    upgradeLevels: {},
    craftedArtifacts: [],
    equippedArtifacts: [],
    claimedMilestones: [],
    highestEver: 0,
    totalRuns: 0,
    runHistory: [],
    mountainsUnlocked: [true, false, false, false],
    mountainsSummited: [false, false, false, false],
    selectedMountainIndex: 0,
  };
}

function getUpgradeEffect(upgradeId: string, persistent: PersistentState): number {
  const config = UPGRADES[upgradeId];
  if (!config) return 0;
  const level = persistent.upgradeLevels[upgradeId] ?? 0;
  // Level 0 means not purchased → return 0 so the caller's || fallback uses the base config value
  if (level === 0) return 0;
  return config.effectPerLevel[Math.min(level, config.maxLevel) - 1];
}

export function getEffectiveStats(persistent: PersistentState): EffectiveStats {
  const pushLevel = persistent.upgradeLevels['pushDistance'] ?? 0;
  const pushMultiplier = pushLevel > 0 ? getUpgradeEffect('pushDistance', persistent) : 1.0;

  return {
    pushDistance: PUSH_DISTANCE_BASE * pushMultiplier,
    staminaMax: getUpgradeEffect('staminaMax', persistent) || STAMINA_MAX_BASE,
    staminaCost: getUpgradeEffect('staminaCostReduction', persistent) || STAMINA_COST_PER_SUCCESS,
    staminaRegen: getUpgradeEffect('staminaRegen', persistent) || STAMINA_REGEN_RATE_BASE,
  };
}

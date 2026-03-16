import {
  STAMINA_MAX_BASE,
  STAMINA_REGEN_RATE_BASE,
  STAMINA_COST_PER_SUCCESS,
  STAMINA_COST_GROWTH_PER_PUSH_BASE,
  STAMINA_COST_MAX_PER_SUCCESS_BASE,
  SUCCESS_ZONE_MAX_RATIO,
  PUSH_DISTANCE_BASE,
  JUDGMENT_HOLD_SUCCESS_TIME,
  JUDGMENT_HOLD_SUCCESS_TIME_MIN,
  MAP_TEMPLATES,
  UPGRADES,
} from '../config';

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

export interface MapRewardProgress {
  staminaMaxGrowth: number;
  thresholdReduction: number;
  pushDistanceBonus: number;
  staminaCostGrowthReduction: number;
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
  mapRewards: MapRewardProgress;
  /** Per-map total successful pushes used for inverse reward scaling. */
  mapPushCounts: Record<string, number>;
  highestEver: number;
  longestDistanceEver: number;
  totalRuns: number;
  runHistory: RunRecord[];
}

/** Derived stats computed from upgrades + map rewards */
export interface EffectiveStats {
  pushDistance: number;
  staminaMax: number;
  staminaCost: number;
  staminaCostGrowthPerPush: number;
  staminaCostMaxPerPush: number;
  staminaRegen: number;
  successZoneMaxRatio: number;
  holdSuccessTime: number;
}

export function createInitialPersistentState(): PersistentState {
  const mapPushCounts: Record<string, number> = {};
  for (const map of MAP_TEMPLATES) {
    mapPushCounts[map.id] = 0;
  }

  return {
    obolus: 0,
    drachma: 0,
    stater: 0,
    ingot: 0,
    upgradeLevels: {},
    craftedArtifacts: [],
    equippedArtifacts: [],
    claimedMilestones: [],
    mapRewards: {
      staminaMaxGrowth: 0,
      thresholdReduction: 0,
      pushDistanceBonus: 0,
      staminaCostGrowthReduction: 0,
    },
    mapPushCounts,
    highestEver: 0,
    longestDistanceEver: 0,
    totalRuns: 0,
    runHistory: [],
  };
}

function getUpgradeEffect(upgradeId: string, persistent: PersistentState): number {
  const config = UPGRADES[upgradeId];
  if (!config) return 0;
  const level = persistent.upgradeLevels[upgradeId] ?? 0;
  if (level === 0) return 0;
  return config.effectPerLevel[Math.min(level, config.maxLevel) - 1];
}

export function getEffectiveStats(persistent: PersistentState): EffectiveStats {
  const pushLevel = persistent.upgradeLevels['pushDistance'] ?? 0;
  const pushMultiplier = pushLevel > 0 ? getUpgradeEffect('pushDistance', persistent) : 1.0;
  const mapRewards = persistent.mapRewards;

  const holdSuccessTime = Math.max(
    JUDGMENT_HOLD_SUCCESS_TIME_MIN,
    JUDGMENT_HOLD_SUCCESS_TIME - mapRewards.thresholdReduction,
  );

  const staminaCostGrowthPerPush = Math.max(
    0,
    STAMINA_COST_GROWTH_PER_PUSH_BASE - mapRewards.staminaCostGrowthReduction,
  );

  return {
    pushDistance: PUSH_DISTANCE_BASE * pushMultiplier + mapRewards.pushDistanceBonus,
    staminaMax: (getUpgradeEffect('staminaMax', persistent) || STAMINA_MAX_BASE) + mapRewards.staminaMaxGrowth,
    staminaCost: getUpgradeEffect('staminaCostReduction', persistent) || STAMINA_COST_PER_SUCCESS,
    staminaCostGrowthPerPush,
    staminaCostMaxPerPush: STAMINA_COST_MAX_PER_SUCCESS_BASE,
    staminaRegen: getUpgradeEffect('staminaRegen', persistent) || STAMINA_REGEN_RATE_BASE,
    successZoneMaxRatio: getUpgradeEffect('successZoneRatio', persistent) || SUCCESS_ZONE_MAX_RATIO,
    holdSuccessTime,
  };
}

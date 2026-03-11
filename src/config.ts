// ============================================================
// Sisyphus Game - Central Configuration (Single Source of Truth)
// ALL game values are defined here. No hardcoded values in logic.
// ============================================================

// --- Judgment Bar ---
export const JUDGMENT_BAR_TOTAL_WIDTH = 300;      // px
export const JUDGMENT_BAR_HEIGHT = 24;             // px (thicker)
export const JUDGMENT_POINTER_SPEED = 200;         // px/s
export const JUDGMENT_HOLD_SUCCESS_TIME = 0.45;    // s, default hold duration needed for success
export const JUDGMENT_HOLD_SUCCESS_TIME_MIN = 0.15;// s, lower clamp after threshold-reduction rewards
export const JUDGMENT_HOLD_BAR_MULTIPLIER = 3;     // bar covers 0..(multiplier * default success time)
export const JUDGMENT_SUCCESS_COLOR = '#00E676';   // Neon Green
export const JUDGMENT_FAIL_COLOR = '#FF5252';      // Vibrant Red
export const JUDGMENT_POINTER_COLOR = '#FFD740';   // Amber/Gold
export const JUDGMENT_BAR_Y_OFFSET = -50;          // px above character head

// --- Stamina ---
export const STAMINA_MAX_BASE = 100;
export const STAMINA_COST_PER_SUCCESS = 10;
export const STAMINA_REGEN_RATE_BASE = 0.25;       // points/s
export const STAMINA_COST_MAX_PER_SUCCESS_BASE = 9; // cap per-push stamina cost (lowered)
export const STAMINA_COST_GROWTH_PER_PUSH_BASE = 0.5; // extra stamina cost added after each success in a run
export const SUCCESS_ZONE_MAX_RATIO = 0.6;
export const SUCCESS_ZONE_MIN_WIDTH = 5;           // px

// --- Slide / Failure ---
export const SWEAT_DELAY = 1.0;                    // s after last success -> sweating
export const SLIDE_DELAY = 3.0;                    // s after sweating -> irreversible slide
export const SLIDE_DURATION = 2.0;                 // s from slide start to bottom
export const SWEAT_SLIDE_SPEED = 10;               // game units/s
export const SLIDE_INITIAL_SPEED = 40;             // game units/s
export const SLIDE_MAX_SPEED = 400;                // game units/s

// --- Push ---
export const PUSH_DISTANCE_BASE = 40;              // game units per success
export const PUSH_ANIMATION_DURATION = 0.32;       // seconds for push easing animation

// --- Maps / Checkpoints ---
export type MapRewardType =
  | 'staminaMaxGrowth'
  | 'thresholdReduction'
  | 'pushDistanceBonus'
  | 'staminaCostGrowthReduction';

export interface MapTemplateConfig {
  id: string;
  name: string;
  rewardType: MapRewardType;
  rewardPerPush: number;
}

// Placeholder map set: same terrain copied per reward type.
export const MAP_TEMPLATES: MapTemplateConfig[] = [
  { id: 'map-1', name: 'Map I',   rewardType: 'staminaMaxGrowth',           rewardPerPush: 0.40 },
  { id: 'map-2', name: 'Map II',  rewardType: 'thresholdReduction',         rewardPerPush: 0.0014 },
  { id: 'map-3', name: 'Map III', rewardType: 'pushDistanceBonus',         rewardPerPush: 0.10 },
  { id: 'map-4', name: 'Map IV',  rewardType: 'staminaCostGrowthReduction', rewardPerPush: 0.0035 },
];

// Renderer checkpoint markers disabled for now: rewards are granted per successful push.
export interface CheckpointConfig {
  height: number;
}
export const CHECKPOINTS: CheckpointConfig[] = [];
export interface MilestoneConfig {
  height: number;
  ingotReward: number;
}
export const MILESTONES: MilestoneConfig[] = [
  { height: 480,  ingotReward: 1 },
  { height: 1400, ingotReward: 1 },
  { height: 2080, ingotReward: 2 },
  { height: 3000, ingotReward: 2 },
  { height: 4200, ingotReward: 3 },
];

export const CHECKPOINT_VISUAL_RADIUS = 15;
export const CHECKPOINT_COLLECT_ANIMATION_DURATION = 0.5; // s

// --- Currency ---
export const OBOLUS_TO_DRACHMA_RATE = 10000;
export const DRACHMA_TO_STATER_RATE = 10000;

// --- Camera ---
export const CAMERA_BASE_ZOOM = 3.0;              // initial zoom (world looks bigger)
export const CAMERA_ZOOM_RATE = 0.0005;           // slow zoom-out as height increases
export const CAMERA_ZOOM_STEP_HEIGHT = 100;
export const CAMERA_ZOOM_STEP_FACTOR = 0.3;
export const CAMERA_ZOOM_MODE: 'continuous' | 'stepped' = 'continuous';
export const CAMERA_FOLLOW_SPEED = 5.0;
/** Fraction of screen width where the player appears (0.25 = left quarter) */
export const CAMERA_VIEWPORT_X = 0.25;
/** Fraction of screen height where the player appears (0.75 = bottom quarter) */
export const CAMERA_VIEWPORT_Y = 0.75;

// --- Visual / Mountain ---
export const MOUNTAIN_SLOPE_ANGLE = 30;            // degrees
export const START_PLATFORM_LENGTH = 140;          // world units of flat start platform
// Vibrant Mythos Palette
export const BACKGROUND_COLOR_TOP = '#2962FF';     // Royal Blue (high altitude)
export const BACKGROUND_COLOR_BOTTOM = '#4FC3F7';  // Light Blue (low altitude)
export const MOUNTAIN_GRASS_COLOR = '#76FF03';     // Bright Lime Green
export const MOUNTAIN_SOIL_COLOR = '#795548';      // Earthy Brown
export const CLOUD_COLOR = 'rgba(255, 255, 255, 0.4)';

export const CHARACTER_COLOR = '#212121';          // Soft Black
export const BOULDER_COLOR = '#546E7A';            // Blue Grey
export const BOULDER_HIGHLIGHT_COLOR = '#78909C';  // Lighter Blue Grey
export const BOULDER_RADIUS = 12;                  // slightly larger for better visibility
export const CHARACTER_HEIGHT = 24;                // slightly taller

// --- Critical Hit (artifact-gated, config only) ---
export const CRIT_ZONE_WIDTH = 20;                 // px
export const CRIT_ZONE_RATIO = 0.3;
export const CRIT_ZONE_MIN_SUCCESS_WIDTH = 30;     // px
export const CRIT_MULTIPLIER_BASE = 2.0;
export const CRIT2_ZONE_WIDTH = 8;                 // px
export const CRIT2_MULTIPLIER_BASE = 4.0;

// --- Dual Push (artifact-gated) ---
export const DUAL_PUSH_LEFT_COLOR = '#4CAF50';
export const DUAL_PUSH_RIGHT_COLOR = '#2196F3';

// --- Wedge (artifact-gated) ---
export const WEDGE_KEY = 'Space';
export const WEDGE_DURATION_BASE = 5.0;            // s
export const WEDGE_COOLDOWN = 2.0;                 // s
export const WEDGE_MAX_CARRY_BASE = 2;
export const WEDGE_SHOP_COST = { obolus: 30 };

// --- QTE (artifact-gated) ---
export const QTE_DURATION = 8.0;                   // s
export const QTE_TARGET_CLICKS = 30;
export const QTE_PENALTY_LIMIT = 3;
export const QTE_REWARD_MULTIPLIER_BASE = 2.0;
export const QTE_POINTER_SPEED = 180;              // deg/s
export const QTE_WHEEL_SEGMENTS = [
  { type: 'safe'   as const, angleDeg: 60 },
  { type: 'danger' as const, angleDeg: 30 },
  { type: 'safe'   as const, angleDeg: 45 },
  { type: 'danger' as const, angleDeg: 45 },
  { type: 'safe'   as const, angleDeg: 90 },
  { type: 'danger' as const, angleDeg: 30 },
  { type: 'safe'   as const, angleDeg: 60 },
];
export const QTE_WHEEL_RADIUS = 120;               // px
export const QTE_SAFE_COLOR = '#C8A96E';
export const QTE_DANGER_COLOR = '#8B0000';

// --- Artifacts ---
export interface ArtifactConfig {
  id: string;
  name: string;
  description: string;
  ingotCost: number;
}
export const ARTIFACTS: ArtifactConfig[] = [
  { id: 'criticalHit', name: "Ares' Fury",       description: 'Critical hit zone in judgment bar',          ingotCost: 1 },
  { id: 'dualPush',    name: "Heracles' Armlet",  description: 'Alternate L/R click with dual stamina',     ingotCost: 2 },
  { id: 'wedge',       name: "Hephaestus' Wedge", description: 'Fix boulder in place temporarily',          ingotCost: 2 },
  { id: 'qte',         name: 'Wheel of Fate',     description: 'QTE challenge at checkpoints for 2x reward', ingotCost: 3 },
];
export const MAX_EQUIPPED_ARTIFACTS = 3;

// --- Upgrades ---
export const UPGRADE_COST_MULTIPLIER = 1.8;

export interface UpgradeConfig {
  name: string;
  description: string;
  maxLevel: number;
  baseCost: { obolus: number; drachma: number; stater: number };
  effectPerLevel: number[];
  prerequisite: string | null; // "upgradeId:level" or null
}

export const UPGRADES: Record<string, UpgradeConfig> = {
  pushDistance: {
    name: 'Pushing Force',
    description: 'Increase push distance per success',
    maxLevel: 20,
    baseCost: { obolus: 5, drachma: 0, stater: 0 },
    effectPerLevel: [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 4.0, 4.8, 5.7, 6.8, 8.0, 9.4, 11.0, 12.8, 14.9, 17.3, 20.0, 23.1, 26.7],
    prerequisite: null,
  },
  staminaMax: {
    name: 'Unyielding Will',
    description: 'Increase maximum stamina',
    maxLevel: 20,
    baseCost: { obolus: 8, drachma: 0, stater: 0 },
    effectPerLevel: [100, 115, 130, 150, 175, 200, 230, 265, 305, 350, 400, 455, 515, 580, 650, 725, 810, 900, 1000, 1110],
    prerequisite: null,
  },
  staminaCostReduction: {
    name: 'Stamina Saver',
    description: 'Reduce stamina cost per success',
    maxLevel: 10,
    baseCost: { obolus: 20, drachma: 0, stater: 0 },
    effectPerLevel: [5.0, 4.7, 4.4, 4.0, 3.6, 3.2, 2.8, 2.4, 2.0, 1.6],
    prerequisite: 'staminaMax:3',
  },
  staminaRegen: {
    name: 'Second Wind',
    description: 'Increase stamina regen rate',
    maxLevel: 10,
    baseCost: { obolus: 15, drachma: 0, stater: 0 },
    effectPerLevel: [0.25, 0.35, 0.50, 0.70, 1.0, 1.4, 1.9, 2.5, 3.2, 4.0],
    prerequisite: 'staminaMax:5',
  },
  successZoneRatio: {
    name: 'Keen Instinct',
    description: 'Widen the success zone at full stamina',
    maxLevel: 10,
    baseCost: { obolus: 12, drachma: 0, stater: 0 },
    effectPerLevel: [0.60, 0.63, 0.66, 0.70, 0.74, 0.78, 0.82, 0.86, 0.90, 0.95],
    prerequisite: 'pushDistance:3',
  },
};


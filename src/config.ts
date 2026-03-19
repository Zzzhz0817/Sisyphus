// ============================================================
// Sisyphus Game - Central Configuration (Single Source of Truth)
// ALL game values are defined here. No hardcoded values in logic.
// ============================================================

// --- Judgment Bar ---
export const JUDGMENT_BAR_TOTAL_WIDTH = 300;      // px
export const JUDGMENT_BAR_HEIGHT = 24;             // px (thicker)
export const JUDGMENT_POINTER_SPEED = 200;         // px/s
export const JUDGMENT_SUCCESS_COLOR = '#00E676';   // Neon Green
export const JUDGMENT_FAIL_COLOR = '#FF5252';      // Vibrant Red
export const JUDGMENT_POINTER_COLOR = '#FFD740';   // Amber/Gold
export const JUDGMENT_BAR_Y_OFFSET = -50;          // px above character head

// --- Stamina ---
export const STAMINA_MAX_BASE = 100;
export const STAMINA_COST_PER_SUCCESS = 10;
export const STAMINA_REGEN_RATE_BASE = 0.25;       // points/s

// --- Judgment Zone Curve (power-curve model) ---
// successZoneWidth = floor + range × t^exponent   (t = currentStamina/maxStamina)
// range = min(baseRange + bonus × (maxStamina - baseMaxStamina), maxRange)
export const JUDGMENT_FLOOR = 10;                   // px – minimum zone when stamina > 0
export const JUDGMENT_BASE_RANGE = 70;              // px – base variation (full-stam zone 80 - floor 10)
export const JUDGMENT_BONUS_PER_STAMINA = 0.55;     // px per maxStamina point above base
export const JUDGMENT_BASE_MAX_STAMINA = 100;       // baseline for bonus calculation
export const JUDGMENT_MAX_RANGE = 290;              // px – cap (barWidth - floor)
export const JUDGMENT_EXPONENT = 2.0;               // >1 → fast drop at high stamina, slow at low

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

// --- Checkpoints ---
export interface CheckpointConfig {
  height: number;
  reward: { obolus: number; drachma: number; stater: number };
}

export const CHECKPOINT_VISUAL_RADIUS = 15;
export const CHECKPOINT_COLLECT_ANIMATION_DURATION = 0.5; // s

// --- Mountains (Four-Mountain System) ---
export interface MountainConfig {
  id: number;
  name: string;
  height: number;                  // summit height (game units)
  slopeAngle: number;             // degrees
  pushDistanceMultiplier: number; // effective push = base × upgrade × this
  summitIngotReward: number;      // first-summit-only ingot reward
  checkpoints: CheckpointConfig[];
  // Visual theme
  grassColor: string;
  soilColor: string;
  bgColorTop: string;
  bgColorBottom: string;
}

export const MOUNTAINS: MountainConfig[] = [
  {
    id: 0,
    name: 'Tartarus Hills',
    height: 2000,
    slopeAngle: 25,
    pushDistanceMultiplier: 1.0,
    summitIngotReward: 2,
    checkpoints: [
      { height: 200,  reward: { obolus: 10,  drachma: 0, stater: 0 } },
      { height: 480,  reward: { obolus: 25,  drachma: 0, stater: 0 } },
      { height: 880,  reward: { obolus: 50,  drachma: 0, stater: 0 } },
      { height: 1400, reward: { obolus: 100, drachma: 0, stater: 0 } },
      { height: 1800, reward: { obolus: 150, drachma: 0, stater: 0 } },
    ],
    grassColor: '#76FF03',
    soilColor: '#795548',
    bgColorTop: '#2962FF',
    bgColorBottom: '#4FC3F7',
  },
  {
    id: 1,
    name: 'Underworld Slope',
    height: 5000,
    slopeAngle: 30,
    pushDistanceMultiplier: 0.5,
    summitIngotReward: 3,
    checkpoints: [
      { height: 400,  reward: { obolus: 50,  drachma: 0, stater: 0 } },
      { height: 1000, reward: { obolus: 120, drachma: 0, stater: 0 } },
      { height: 2000, reward: { obolus: 0,   drachma: 1, stater: 0 } },
      { height: 3200, reward: { obolus: 0,   drachma: 2, stater: 0 } },
      { height: 4500, reward: { obolus: 0,   drachma: 4, stater: 0 } },
    ],
    grassColor: '#558B2F',
    soilColor: '#4E342E',
    bgColorTop: '#1A237E',
    bgColorBottom: '#303F9F',
  },
  {
    id: 2,
    name: 'Olympus Foothills',
    height: 12000,
    slopeAngle: 35,
    pushDistanceMultiplier: 0.35,
    summitIngotReward: 5,
    checkpoints: [
      { height: 800,   reward: { obolus: 200, drachma: 0, stater: 0 } },
      { height: 2500,  reward: { obolus: 0,   drachma: 3, stater: 0 } },
      { height: 5000,  reward: { obolus: 0,   drachma: 6, stater: 0 } },
      { height: 8000,  reward: { obolus: 0,   drachma: 0, stater: 1 } },
      { height: 11000, reward: { obolus: 0,   drachma: 0, stater: 2 } },
    ],
    grassColor: '#33691E',
    soilColor: '#3E2723',
    bgColorTop: '#311B92',
    bgColorBottom: '#4527A0',
  },
  {
    id: 3,
    name: "Summit of the Gods",
    height: 24000,
    slopeAngle: 40,
    pushDistanceMultiplier: 0.25,
    summitIngotReward: 10,
    checkpoints: [
      { height: 2000,  reward: { obolus: 0,   drachma: 5,  stater: 0 } },
      { height: 6000,  reward: { obolus: 0,   drachma: 0,  stater: 2 } },
      { height: 12000, reward: { obolus: 0,   drachma: 0,  stater: 5 } },
      { height: 18000, reward: { obolus: 0,   drachma: 0,  stater: 10 } },
      { height: 23000, reward: { obolus: 0,   drachma: 0,  stater: 20 } },
    ],
    grassColor: '#1B5E20',
    soilColor: '#212121',
    bgColorTop: '#0D0D0D',
    bgColorBottom: '#1A0033',
  },
];

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
};

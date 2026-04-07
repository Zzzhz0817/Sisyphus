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
export const STAMINA_REGEN_RATE_BASE = 0;           // points/s (no passive regen)

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

// --- Descent ---
export const DESCENT_SLOPE_ANGLE = 60;        // 下山坡度（度）
export const SUMMIT_FLAT_LENGTH = 20;         // 山顶小平台长度（game units），让山顶不是刀尖
export const VALLEY_FLAT_LENGTH = 5000;       // 山谷平地长度（game units）增加到5000
export const DESCENT_ROLL_SPEED = 800;        // 下山滚动速度（game units/s）— 比失败滑落快 2x
                                               // 对比: SLIDE_MAX_SPEED = 400
export const BASE_FLAT_LENGTH = 100;          // 起点平地长度（game units）

// --- Push ---
export const PUSH_DISTANCE_BASE = 40;              // game units per success
export const PUSH_ANIMATION_DURATION = 0.32;       // seconds for push easing animation

// --- Checkpoints ---
export interface CheckpointConfig {
  height: number;
  reward: { obol?: number; ingot?: number };
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
    summitIngotReward: 0,
    checkpoints: [
      { height: 200,  reward: { obol: 10 } },
      { height: 480,  reward: { obol: 25 } },
      { height: 880,  reward: { obol: 60 } },
      { height: 1400, reward: { obol: 100 } },
      { height: 1800, reward: { obol: 130 } },
      { height: 1990, reward: { ingot: 1 } },
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
    summitIngotReward: 0,
    checkpoints: [
      { height: 400,  reward: { obol: 50 } },
      { height: 1000, reward: { obol: 120 } },
      { height: 2000, reward: { obol: 250 } },
      { height: 3200, reward: { obol: 400 } },
      { height: 4500, reward: { obol: 570 } },
      { height: 4990, reward: { ingot: 3 } },
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
    summitIngotReward: 0,
    checkpoints: [
      { height: 800,   reward: { obol: 200 } },
      { height: 2500,  reward: { obol: 600 } },
      { height: 5000,  reward: { obol: 1240 } },
      { height: 8000,  reward: { obol: 2000 } },
      { height: 11000, reward: { obol: 2760 } },
      { height: 11990, reward: { ingot: 3 } },
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
    summitIngotReward: 0,
    checkpoints: [
      { height: 2000,  reward: { obol: 1000 } },
      { height: 6000,  reward: { obol: 4000 } },
      { height: 12000, reward: { obol: 12000 } },
      { height: 18000, reward: { obol: 20000 } },
      { height: 23000, reward: { obol: 30000 } },
    ],
    grassColor: '#1B5E20',
    soilColor: '#212121',
    bgColorTop: '#0D0D0D',
    bgColorBottom: '#1A0033',
  },
];

// Single currency: Obol (visually silver)

// --- Camera ---
export const CAMERA_BASE_ZOOM = 3.0;              // initial zoom (world looks bigger)
export const CAMERA_ZOOM_RATE = 0.0005;           // slow zoom-out as height increases
export const CAMERA_ZOOM_STEP_HEIGHT = 100;
export const CAMERA_ZOOM_STEP_FACTOR = 0.3;
export const CAMERA_ZOOM_MODE: 'continuous' | 'stepped' = 'continuous';
export const CAMERA_FOLLOW_SPEED = 3.5;           // Lower value = more lag/elasticity (was 5.0)
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

// --- Critical Hit (artifact-gated) ---
export const CRIT_ZONE_WIDTH = 10;                 // px – fixed crit zone width
export const CRIT_MIN_SUCCESS_WIDTH = 40;          // px – success zone must be > this for crit to appear
export const CRIT_MULTIPLIER = 2.0;               // push distance multiplier on crit
export const CRIT_ZONE_COLOR = '#1B5E20';         // dark green

// --- Dual Push (artifact-gated) ---
export const DUAL_PUSH_LEFT_COLOR = '#4CAF50';
export const DUAL_PUSH_RIGHT_COLOR = '#2196F3';
export const DUAL_PUSH_BONUS_POINTER_COLOR = '#69F0AE';  // Mint green pointer when alternate bonus active
export const DUAL_PUSH_STAMINA_DISCOUNT = 0.5;           // 50% stamina cost when alternating

// --- Wedge (artifact-gated, passive) ---
export const WEDGE_DELAY_MULTIPLIER = 3.0;         // slide timers ×3 when equipped

// --- Divine Blessing (artifact-gated, passive) ---
export const BLESSING_CHANCE = 1 / 3;              // probability per push attempt
export const BLESSING_BAR_COLOR = '#8C9EFF';       // light blue-purple blessed bar color

// --- Artifacts ---
export interface ArtifactConfig {
  id: string;
  name: string;
  description: string;
  ingotCost: number;
}
export const ARTIFACTS: ArtifactConfig[] = [
  { id: 'criticalHit', name: "Ares' Fury",       description: 'Critical hit zone in judgment bar',          ingotCost: 1 },
  { id: 'dualPush',    name: "Heracles' Armlet",  description: 'Alternate L/R click: half stamina cost',     ingotCost: 1 },
  { id: 'wedge',       name: "Hephaestus' Wedge", description: 'Steady your footing — 3× slower to slip',    ingotCost: 2 },
  { id: 'qte',         name: 'Wheel of Fate',     description: '1/3 chance each push is divinely blessed — any timing succeeds', ingotCost: 3 },
];
export const MAX_EQUIPPED_ARTIFACTS = 3;

// --- Upgrades ---
export const UPGRADE_COST_MULTIPLIER = 1.8;

export interface UpgradeConfig {
  name: string;
  description: string;
  maxLevel: number;
  baseCost: { obol: number };
  effectPerLevel: number[];
  prerequisite: string | null; // "upgradeId:level" or null
}

export const UPGRADES: Record<string, UpgradeConfig> = {
  pushDistance: {
    name: 'Pushing Force',
    description: 'Increase push distance per success',
    maxLevel: 20,
    baseCost: { obol: 5 },
    effectPerLevel: [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 4.0, 4.8, 5.7, 6.8, 8.0, 9.4, 11.0, 12.8, 14.9, 17.3, 20.0, 23.1, 26.7],
    prerequisite: null,
  },
  staminaMax: {
    name: 'Unyielding Will',
    description: 'Increase maximum stamina',
    maxLevel: 20,
    baseCost: { obol: 8 },
    effectPerLevel: [120, 150, 165, 185, 210, 235, 265, 300, 340, 385, 435, 490, 550, 615, 685, 760, 845, 935, 1035, 1145],
    prerequisite: null,
  },
  staminaCostReduction: {
    name: 'Stamina Saver',
    description: 'Reduce stamina cost per success',
    maxLevel: 10,
    baseCost: { obol: 20 },
    effectPerLevel: [5.0, 4.7, 4.4, 4.0, 3.6, 3.2, 2.8, 2.4, 2.0, 1.6],
    prerequisite: 'staminaMax:3',
  },
  staminaRegen: {
    name: 'Second Wind',
    description: 'Increase stamina regen rate',
    maxLevel: 10,
    baseCost: { obol: 15 },
    effectPerLevel: [0.25, 0.35, 0.50, 0.70, 1.0, 1.4, 1.9, 2.5, 3.2, 4.0],
    prerequisite: 'staminaMax:5',
  },
};

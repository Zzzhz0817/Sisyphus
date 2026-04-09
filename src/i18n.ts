// ============================================================
// Sisyphus – Internationalisation (EN / ZH)
// ============================================================

type Lang = 'en' | 'zh';

interface UIStrings {
  shopTitle: string;
  upgrades: string;
  artifactForge: string;
  chooseMountain: string;
  climbAgain: string;
  startClimbing: string;
  maxed: string;
  locked: string;
  levelDisplay: (l: number, m: number) => string;
  requires: (name: string, lvl: string) => string;
  equipped: string;
  owned: string;
  clickUnequip: string;
  clickEquip: string;
  clickCraft: string;
  obolAcquired: string;
  summitNotif: (v: number) => string;
  ingotNotif: (v: number) => string;
  runLog: string;
  totalRuns: string;
  highestEver: string;
  avgHeight: string;
  overallHitRate: string;
  qteSuccessRate: string;
  noRuns: string;
  runCol: string;
  heightCol: string;
  hitPct: string;
  earnings: string;
  push: string;
  langBtn: string;
  tutorialHint: string;
}

const UI: Record<Lang, UIStrings> = {
  en: {
    shopTitle:       "Hermes' Blessing",
    upgrades:        'Upgrades',
    artifactForge:   'Artifact Forge',
    chooseMountain:  'Choose Your Mountain',
    climbAgain:      'CLIMB AGAIN',
    startClimbing:   'START CLIMBING',
    maxed:           'MAXED',
    locked:          'Locked',
    levelDisplay:    (l, m) => `Level ${l} / ${m}`,
    requires:        (name, lvl) => `Requires ${name} Lv${lvl}`,
    equipped:        'EQUIPPED',
    owned:           'OWNED',
    clickUnequip:    __MOBILE__ ? 'Tap to Unequip'  : 'Click to Unequip',
    clickEquip:      __MOBILE__ ? 'Tap to Equip'    : 'Click to Equip',
    clickCraft:      __MOBILE__ ? 'Tap to Craft'    : 'Click to Craft',
    obolAcquired:    'OBOL ACQUIRED',
    summitNotif:     (v) => `Summit! +${v} Ingot`,
    ingotNotif:      (v) => `+${v} Ingot`,
    runLog:          'Run Log',
    totalRuns:       'Total Runs',
    highestEver:     'Highest Ever',
    avgHeight:       'Avg Height',
    overallHitRate:  'Overall Hit Rate',
    qteSuccessRate:  'QTE Success Rate',
    noRuns:          'No runs recorded yet.',
    runCol:          'Run',
    heightCol:       'Height',
    hitPct:          'Hit%',
    earnings:        'Earnings',
    push:            'Push',
    langBtn:         '中文',
    tutorialHint:    __MOBILE__ ? 'Hold the Screen to Push the Boulder' : 'Hold Left Click to Push the Boulder',
  },
  zh: {
    shopTitle:       '赫尔墨斯的祝福',
    upgrades:        '能力强化',
    artifactForge:   '神器锻造',
    chooseMountain:  '选择山峰',
    climbAgain:      '再次攀登',
    startClimbing:   '开始攀登',
    maxed:           '已满级',
    locked:          '已锁定',
    levelDisplay:    (l, m) => `等级 ${l} / ${m}`,
    requires:        (name, lvl) => `需要 ${name} 等级 ${lvl}`,
    equipped:        '已装备',
    owned:           '已拥有',
    clickUnequip:    __MOBILE__ ? '轻触卸下' : '点击卸下',
    clickEquip:      __MOBILE__ ? '轻触装备' : '点击装备',
    clickCraft:      __MOBILE__ ? '轻触锻造' : '点击锻造',
    obolAcquired:    '获得银币',
    summitNotif:     (v) => `登顶！+${v} 金锭`,
    ingotNotif:      (v) => `+${v} 金锭`,
    runLog:          '跑局记录',
    totalRuns:       '总跑局数',
    highestEver:     '历史最高',
    avgHeight:       '平均高度',
    overallHitRate:  '总体命中率',
    qteSuccessRate:  'QTE成功率',
    noRuns:          '暂无跑局记录。',
    runCol:          '局次',
    heightCol:       '高度',
    hitPct:          '命中率',
    earnings:        '收益',
    push:            '推力',
    langBtn:         'EN',
    tutorialHint:    __MOBILE__ ? '按住屏幕开始推动巨石' : '按住左键开始推动巨石',
  },
};

function detectLang(): Lang {
  const nav = (navigator.language ?? '').toLowerCase();
  return nav.startsWith('zh') ? 'zh' : 'en';
}

let _lang: Lang = detectLang();

export function getLang(): Lang { return _lang; }
export function setLang(l: Lang): void { _lang = l; }
export function toggleLang(): Lang {
  _lang = _lang === 'en' ? 'zh' : 'en';
  return _lang;
}
export function ui(): UIStrings { return UI[_lang]; }

// --- Mountain name translations (keyed by English name) ---
const MOUNTAIN_ZH: Record<string, string> = {
  'Tartarus Hills':    '塔耳塔罗斯丘陵',
  'Underworld Path':   '冥界山路',
  'Olympus Cliffs':    '奥林匹斯绝壁',
  'Summit of the Gods':'众神之巅',
};
export function getMountainName(enName: string): string {
  return _lang === 'zh' ? (MOUNTAIN_ZH[enName] ?? enName) : enName;
}

// --- Upgrade translations (keyed by upgrade ID) ---
const UPGRADE_ZH: Record<string, { name: string; description: string }> = {
  pushDistance:         { name: '泰坦之力', description: '增加每次推动的距离' },
  staminaMax:           { name: '不屈意志', description: '增加最大体力上限' },
  staminaCostReduction: { name: '钢铁之握', description: '减少每次推动消耗的体力' },
  staminaRegen:         { name: '神圣之息', description: '提升体力回复速度' },
};
export function getUpgradeName(id: string, enName: string): string {
  return _lang === 'zh' ? (UPGRADE_ZH[id]?.name ?? enName) : enName;
}
export function getUpgradeDesc(id: string, enDesc: string): string {
  return _lang === 'zh' ? (UPGRADE_ZH[id]?.description ?? enDesc) : enDesc;
}

// --- Artifact translations (keyed by artifact ID) ---
const ARTIFACT_ZH: Record<string, { name: string; description: string }> = {
  criticalHit: { name: '阿瑞斯之怒',     description: '精确的推动可以触发暴击，将巨石推得更远。' },
  dualPush:    { name: '赫拉克勒斯臂环', description: __MOBILE__ ? '交替按住屏幕左右两侧进行推动，可大幅减少每次推动消耗的体力。' : '交替点击左右键进行推动，可大幅减少每次推动消耗的体力。' },
  wedge:       { name: '赫菲斯托斯楔块', description: '你可以站得更稳，坚持不滑落的时间变得更长。' },
  qte:         { name: '命运之轮',       description: '每次推动都有几率获得护佑，使该次推动百分之百成功。' },
};
export function getArtifactName(id: string, enName: string): string {
  return _lang === 'zh' ? (ARTIFACT_ZH[id]?.name ?? enName) : enName;
}
export function getArtifactDesc(id: string, enDesc: string): string {
  return _lang === 'zh' ? (ARTIFACT_ZH[id]?.description ?? enDesc) : enDesc;
}

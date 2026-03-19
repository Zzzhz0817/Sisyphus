# 判定条系统开发规格书

**Judgment Bar System — Dev Spec v1.0**
2026.03.19

---

## 1. 变更概述

重写判定条成功区（绿色区域）的宽度计算逻辑。设计目标：

1. 体力高段时成功区缩小**快**（惩罚浪费体力）
2. 体力低段时成功区缩小**慢**（趋近底线，保持约30%成功率的挣扎空间）
3. 体力归零时成功区**消失**（强制结束本轮攀爬）
4. 升级最大体力后，满体力时成功区**变宽**（玩家可直观看到成长）

---

## 2. 核心公式

### 2.1 成功区宽度

```
if currentStamina <= 0:
    successZoneWidth = 0

else:
    t = currentStamina / maxStamina
    range = min(baseRange + bonus × (maxStamina - baseMaxStamina), maxRange)
    successZoneWidth = min(barWidth, floor + range × t^exponent)
```

### 2.2 参数表

| 参数 | 变量名 | 值 | 说明 |
|------|--------|-----|------|
| 底线宽度 | `JUDGMENT_FLOOR` | 10 px | 体力接近0但未归零时的最小成功区 |
| 基础变化范围 | `JUDGMENT_BASE_RANGE` | 70 px | 未升级时的变化范围（= 满体力zone 80 - floor 10） |
| 体力加成系数 | `JUDGMENT_BONUS_PER_STAMINA` | 0.55 px/点 | 每多1点maxStamina，满体力zone增加的像素 |
| 基础最大体力 | `JUDGMENT_BASE_MAX_STAMINA` | 100 | 用于计算bonus偏移的基准值 |
| 变化范围上限 | `JUDGMENT_MAX_RANGE` | 290 px | = barWidth - floor，防止超出条宽 |
| 幂次 | `JUDGMENT_EXPONENT` | 2.0 | >1 实现高段快降、低段慢降的曲线 |
| 判定条宽度 | `BAR_WIDTH` | 300 px | **不变** |
| 指针速度 | `POINTER_SPEED` | 200 px/s | **不变** |

### 2.3 成功率计算（无变化，供参考）

```
reactionPixels = pointerSpeed × (playerReactionTime / 1000)
effectiveZone = max(0, successZoneWidth - reactionPixels)
successProbability = min(1, effectiveZone / barWidth)
```

---

## 3. TypeScript 实现参考

```typescript
// config.ts
export const JUDGMENT = {
  FLOOR: 10,
  BASE_RANGE: 70,
  BONUS_PER_STAMINA: 0.55,
  BASE_MAX_STAMINA: 100,
  MAX_RANGE: 290,
  EXPONENT: 2.0,
} as const;

// judgment.ts
export function getSuccessZoneWidth(
  currentStamina: number,
  maxStamina: number
): number {
  if (currentStamina <= 0) return 0;

  const t = currentStamina / maxStamina;
  const range = Math.min(
    JUDGMENT.BASE_RANGE
      + JUDGMENT.BONUS_PER_STAMINA * (maxStamina - JUDGMENT.BASE_MAX_STAMINA),
    JUDGMENT.MAX_RANGE
  );

  return Math.min(
    BAR_WIDTH,
    JUDGMENT.FLOOR + range * Math.pow(t, JUDGMENT.EXPONENT)
  );
}
```

---

## 4. 升级交互：「意志 Unyielding Will」

升级 maxStamina 有**双重收益**：

- **更多推次数**：maxStamina ÷ staminaCost
- **更大初始成功区**：满体力时 zone = floor + min(baseRange + 0.55 × (maxStam - 100), 290)

示例数据（staminaCost = 10, pushDistance = 40, playerReaction = 50ms）：

| MaxStamina | 可推次数 | 满体力Zone | 满体力成功率 | 末次Zone | 期望攀爬高度 |
|------------|---------|-----------|------------|---------|------------|
| 100 | 10 | 80 px | 23% | 17 px | ~93 单位 |
| 150 | 15 | 107 px | 32% | 11.4 px | ~195 单位 |
| 200 | 20 | 135 px | 42% | 10.9 px | ~338 单位 |
| 300 | 30 | 190 px | 60% | 10.6 px | ~725 单位 |
| 500 | 50 | 290 px | 93% | 10.4 px | ~1876 单位 |

> 其他升级项不受影响：推力影响 pushDistance，节能影响 staminaCost，恢复影响 staminaRegen。

---

## 5. 边界情况

| 情况 | 处理 | 原因 |
|------|------|------|
| currentStamina = 0 | return 0 | 体力耗尽 → 成功区消失 → 强制滑落 |
| currentStamina < 0 | clamp to 0, return 0 | 防御性编程 |
| zone 计算结果 > barWidth | min(result, 300) | 成功区不能超出判定条 |
| range > maxRange (290) | min(range, 290) | floor + 290 = 300 = barWidth |
| 判定失败 | 不扣体力，zone 不变 | 只有成功才消耗体力 |
| regen 导致体力 > maxStamina | min(stamina, maxStamina) | 体力不能超过上限 |

---

## 6. 视觉反馈

- 成功区（绿色）宽度**实时**反映 `getSuccessZoneWidth()` 返回值
- 升级 maxStamina 后回到攀爬阶段，初始绿色区域应**明显变宽**
- 成功区位置仍然**每次判定随机偏移**（不变）
- 可选：zone 接近 floor 时加入视觉警告（变红/闪烁）

---

## 7. 曲线行为（QA 参考）

exponent = 2.0 时，基础100体力的逐推衰减：

- 推第0次（满体力）：zone = 80px
- 推第1次（90体力）：zone ≈ 67px（↓13px）
- 推第2次（80体力）：zone ≈ 55px（↓12px）
- 推第5次（50体力）：zone ≈ 27px（↓7px）
- 推第8次（20体力）：zone ≈ 13px（↓2px）
- 推第9次（10体力）：zone ≈ 11px（↓2px）
- 推第10次（0体力）：zone = 0px（消失）

**设计意图**：前几次推石头成功率下降明显，制造「体力在流逝」的紧迫感；后期成功率下降变缓，给玩家「还能挣扎一下」的感觉；体力归零后彻底无法操作。

---

## 8. config.ts 修改清单

### 新增

| Key | Value | Type |
|-----|-------|------|
| `JUDGMENT_FLOOR` | 10 | number (px) |
| `JUDGMENT_BASE_RANGE` | 70 | number (px) |
| `JUDGMENT_BONUS_PER_STAMINA` | 0.55 | number (px/point) |
| `JUDGMENT_BASE_MAX_STAMINA` | 100 | number |
| `JUDGMENT_MAX_RANGE` | 290 | number (px) |
| `JUDGMENT_EXPONENT` | 2.0 | number |

### 不变（确认）

| Key | Value |
|-----|-------|
| `BAR_WIDTH` | 300 px |
| `BAR_HEIGHT` | 24 px |
| `POINTER_SPEED` | 200 px/s |
| `BASE_MAX_STAMINA` | 100 |
| `STAMINA_COST_PER_SUCCESS` | 10 |
| `BASE_PUSH_DISTANCE` | 40 单位 |

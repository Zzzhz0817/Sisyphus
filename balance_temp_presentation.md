# ⚠️ Temporary Balance Adjustments — Final Presentation
# ⚠️ 临时平衡性调整 — 期末展示版

> These values are **temporary overrides** made for the final presentation playtest session.
> Revert to the "Original" values after the presentation.
>
> 以下数值为期末展示游玩测试的**临时调整**，展示结束后请恢复至"调整前"的原始数值。

---

## 1. Max Equipped Artifacts / 最大装备神器数量

| | Value / 数值 |
|---|---|
| **Before / 调整前** | `3` |
| **After (temp) / 调整后（临时）** | `4` |

**Location / 位置:** `src/config.ts` → `MAX_EQUIPPED_ARTIFACTS`

---

## 2. Titan's Might — `pushDistance` Base Cost / 初始价格

| | Value / 数值 |
|---|---|
| **Before / 调整前** | `5` obol |
| **After (temp) / 调整后（临时）** | `5` obol *(unchanged / 未改变)* |

---

## 3. Unyielding Will — `staminaMax` Base Cost / 初始价格

| | Value / 数值 |
|---|---|
| **Before / 调整前** | `8` obol |
| **After (temp) / 调整后（临时）** | `5` obol |

**Location / 位置:** `src/config.ts` → `UPGRADES.staminaMax.baseCost`

---

## 4. Titan's Might — `pushDistance` Effect Per Level / 每级效果（倍率）

> Rule applied: first 5 inter-level diffs × 3; remaining diffs unchanged.
> 调整规则：前5个差值乘以3，第6级起差值与原版相同。

| Level | Before / 调整前 | After (temp) / 调整后（临时）| Diff change / 差值变化 |
|:-----:|:--------------:|:---------------------------:|:----------------------:|
| 1  | 1.0  | 1.0  | — (base) |
| 2  | 1.2  | 1.6  | 0.2 → **0.6** |
| 3  | 1.5  | 2.5  | 0.3 → **0.9** |
| 4  | 1.8  | 3.4  | 0.3 → **0.9** |
| 5  | 2.2  | 4.6  | 0.4 → **1.2** |
| 6  | 2.7  | 6.1  | 0.5 → **1.5** |
| 7  | 3.3  | 6.7  | 0.6 (unchanged) |
| 8  | 4.0  | 7.4  | 0.7 (unchanged) |
| 9  | 4.8  | 8.2  | 0.8 (unchanged) |
| 10 | 5.7  | 9.1  | 0.9 (unchanged) |
| 11 | 6.8  | 10.2 | 1.1 (unchanged) |
| 12 | 8.0  | 11.4 | 1.2 (unchanged) |
| 13 | 9.4  | 12.8 | 1.4 (unchanged) |
| 14 | 11.0 | 14.4 | 1.6 (unchanged) |
| 15 | 12.8 | 16.2 | 1.8 (unchanged) |
| 16 | 14.9 | 18.3 | 2.1 (unchanged) |
| 17 | 17.3 | 20.7 | 2.4 (unchanged) |
| 18 | 20.0 | 23.4 | 2.7 (unchanged) |
| 19 | 23.1 | 26.5 | 3.1 (unchanged) |
| 20 | 26.7 | 30.1 | 3.6 (unchanged) |

**Location / 位置:** `src/config.ts` → `UPGRADES.pushDistance.effectPerLevel`

---

## 5. Unyielding Will — `staminaMax` Effect Per Level / 每级效果（最大体力）

> Rule applied: first 5 inter-level diffs × 3; remaining diffs unchanged.
> 调整规则：前5个差值乘以3，第6级起差值与原版相同。

| Level | Before / 调整前 | After (temp) / 调整后（临时）| Diff change / 差值变化 |
|:-----:|:--------------:|:---------------------------:|:----------------------:|
| 1  | 120  | 120  | — (base) |
| 2  | 150  | 210  | 30 → **90** |
| 3  | 165  | 255  | 15 → **45** |
| 4  | 185  | 315  | 20 → **60** |
| 5  | 210  | 390  | 25 → **75** |
| 6  | 235  | 465  | 25 → **75** |
| 7  | 265  | 495  | 30 (unchanged) |
| 8  | 300  | 530  | 35 (unchanged) |
| 9  | 340  | 570  | 40 (unchanged) |
| 10 | 385  | 615  | 45 (unchanged) |
| 11 | 435  | 665  | 50 (unchanged) |
| 12 | 490  | 720  | 55 (unchanged) |
| 13 | 550  | 780  | 60 (unchanged) |
| 14 | 615  | 845  | 65 (unchanged) |
| 15 | 685  | 915  | 70 (unchanged) |
| 16 | 760  | 990  | 75 (unchanged) |
| 17 | 845  | 1075 | 85 (unchanged) |
| 18 | 935  | 1165 | 90 (unchanged) |
| 19 | 1035 | 1265 | 100 (unchanged) |
| 20 | 1145 | 1375 | 110 (unchanged) |

**Location / 位置:** `src/config.ts` → `UPGRADES.staminaMax.effectPerLevel`

---

## How to Revert / 如何恢复

In `src/config.ts`, restore the following values:

```ts
export const MAX_EQUIPPED_ARTIFACTS = 3;  // was 4

// staminaMax
baseCost: { obol: 8 },  // was 5
effectPerLevel: [120, 150, 165, 185, 210, 235, 265, 300, 340, 385, 435, 490, 550, 615, 685, 760, 845, 935, 1035, 1145],

// pushDistance
effectPerLevel: [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 4.0, 4.8, 5.7, 6.8, 8.0, 9.4, 11.0, 12.8, 14.9, 17.3, 20.0, 23.1, 26.7],
```

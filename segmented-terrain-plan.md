# 分段地形实施计划

## 目标

在 main 分支的四座山系统基础上，为每座山加入**分段变坡地形**。每段坡度在该山默认角度 ±5° 范围内随机浮动，坡度直接影响推进距离（不影响体力消耗）。一次推进如果跨越多段地形，需按段分别计算实际推进距离。

---

## 当前架构（main）

```
推进距离 = stats.pushDistance × mountain.pushDistanceMultiplier
高度位置 = heightToSlopePosition(height, slopeAngleRad)  // 等角直线
渲染     = 两点直线（surfaceLeft → surfaceRight）
```

- `logicalHeight` 是沿坡面的一维距离，每次推进直接 `+= pushDist`
- `heightToSlopePosition` 把这个一维距离转成世界坐标 `(x, y)`
- 整座山坡度一致，所有计算都用单一 `slopeAngleRad`

## 目标架构

```
推进距离 = 按段计算：遍历途经的每段地形，分别用该段的坡度系数缩放
高度位置 = 沿分段折线累加（不再是单一角度的三角函数）
渲染     = 多点折线（沿每段不同坡度绘制）
```

---

## 数据结构变更

### 1. config.ts — 新增地形分段配置

```ts
// 每座山的分段地形模板
export interface TerrainSegmentTemplate {
  length: number;    // 该段沿坡面的长度（game units）
  slopeDelta: number; // 相对于山默认角度的偏移（度），范围 [-5, +5]
}

// 在 MountainConfig 中新增字段
export interface MountainConfig {
  // ... 现有字段不变 ...
  terrainSegments: TerrainSegmentTemplate[];  // 新增：分段地形定义
}
```

每座山在 `MOUNTAINS` 数组中配置自己的 `terrainSegments`，例如：

```ts
{
  id: 0,
  name: 'Tartarus Hills',
  slopeAngle: 25,           // 基准角度
  terrainSegments: [
    { length: 200, slopeDelta: -3 },   // 22° 缓坡
    { length: 250, slopeDelta: +2 },   // 27° 稍陡
    { length: 180, slopeDelta: -1 },   // 24°
    { length: 220, slopeDelta: +4 },   // 29° 较陡
    { length: 200, slopeDelta: 0 },    // 25° 标准
    { length: 260, slopeDelta: -4 },   // 21° 最缓
    { length: 190, slopeDelta: +3 },   // 28°
    { length: 230, slopeDelta: -2 },   // 23°
  ],
  // ... 其余不变
}
```

分段循环使用（走完最后一段后从第一段重新开始），确保任意高度的山都有地形覆盖。

### 2. 新增类：TerrainSystem

新建 `src/terrain/TerrainSystem.ts`，封装所有分段地形的查询逻辑，供 GameManager 和 MountainRenderer 共用。

```ts
export class TerrainSystem {
  private baseAngleDeg: number;
  private segments: TerrainSegmentTemplate[];

  constructor(mountain: MountainConfig) { ... }

  /** 给定坡面距离 height，返回所在段的实际坡度（度） */
  getSlopeAtHeight(height: number): number;

  /** 给定坡面距离 height，返回世界坐标 (x, y) —— 沿折线累加 */
  getWorldPosition(height: number): { x: number; y: number };

  /** 给定坡面距离 height，返回该位置的推进距离缩放系数 */
  getPushMultiplierAtHeight(height: number): number;

  /** 计算一次推进的实际高度增量（核心：按段拆分计算）*/
  calculatePush(currentHeight: number, rawPushDistance: number): number;

  /** 返回从 startHeight 到 endHeight 之间的采样点，用于渲染 */
  getSurfacePoints(startHeight: number, endHeight: number, step: number): Array<{x: number, y: number}>;

  /** 切换到新山 */
  setMountain(mountain: MountainConfig): void;
}
```

---

## 核心算法

### 推进距离的分段计算 — `calculatePush()`

这是最关键的函数。一次推进的"原始距离"需要沿地形分段消耗：

```
输入：currentHeight（当前坡面位置）、rawPush（= stats.pushDistance × mountain.pushDistanceMultiplier）
输出：actualHeightGain（实际沿坡面前进的距离）

算法：
  remaining = rawPush
  pos = currentHeight

  while remaining > 0:
    seg = 当前 pos 所在的地形段
    segEnd = 该段结束位置
    distToSegEnd = segEnd - pos

    slopeDeg = baseAngle + seg.slopeDelta
    // 坡度越陡，同样的推力走得越近
    // 用 cos 比值作为缩放：cos(当前坡度) / cos(基准坡度)
    efficiency = cos(slopeDeg) / cos(baseAngleDeg)

    // 在这一段内，remaining 推力能走多远
    segAdvance = min(remaining * efficiency, distToSegEnd)

    pos += segAdvance
    remaining -= segAdvance / efficiency

  return pos - currentHeight
```

**坡度影响推进的公式选择**：`cos(θ) / cos(base)`

- 缓坡（base-5°）：cos 更大 → efficiency > 1 → 推得更远
- 陡坡（base+5°）：cos 更小 → efficiency < 1 → 推得更近
- ±5° 范围内效果温和（约 ±5~8% 变化），不会太极端

### 世界坐标计算 — `getWorldPosition()`

```
输入：height（坡面距离）
输出：(x, y) 世界坐标

算法：
  x = 0, y = 0
  remaining = height
  segIndex = 0

  while remaining > 0:
    seg = segments[segIndex % segments.length]
    slopeRad = degToRad(baseAngle + seg.slopeDelta)
    advance = min(seg.length, remaining)

    x += advance * cos(slopeRad)
    y -= advance * sin(slopeRad)   // y 轴向上为负

    remaining -= advance
    segIndex++

  return { x, y }
```

---

## 文件修改清单

### Step 1: 数据层 — config.ts

- [ ] 新增 `TerrainSegmentTemplate` 接口
- [ ] 在 `MountainConfig` 中加 `terrainSegments` 字段
- [ ] 为 4 座山各配置 8~10 段地形（手工设计，偏移在 ±5 内）

### Step 2: 逻辑层 — 新建 TerrainSystem

- [ ] 新建 `src/terrain/TerrainSystem.ts`
- [ ] 实现 `getSlopeAtHeight()`：定位当前所在段，返回 `baseAngle + delta`
- [ ] 实现 `getWorldPosition()`：沿分段折线累加坐标
- [ ] 实现 `calculatePush()`：按段拆分计算推进距离
- [ ] 实现 `getSurfacePoints()`：生成渲染用的折线采样点
- [ ] 实现 `setMountain()`：切换山时重新初始化

### Step 3: 游戏逻辑层 — GameManager.ts

- [ ] 引入 `TerrainSystem` 实例
- [ ] 修改 `getEffectivePushDistance()` → 删除，不再是一个固定值
- [ ] 修改推进成功处理：
  ```ts
  // 旧
  run.logicalHeight += getEffectivePushDistance();
  // 新
  const rawPush = stats.pushDistance * currentMountain.pushDistanceMultiplier;
  const actualGain = terrainSystem.calculatePush(run.logicalHeight, rawPush);
  run.logicalHeight += actualGain;
  ```
- [ ] `startNewRun()` 中调用 `terrainSystem.setMountain(mountain)`
- [ ] 体力消耗保持不变（不受坡度影响）

### Step 4: 渲染层 — MountainRenderer.ts

- [ ] 接收 `TerrainSystem` 引用（构造函数或 setter）
- [ ] 修改 `drawMountain()`：
  - 旧：两点直线 `surfaceLeft → surfaceRight`
  - 新：通过 `terrainSystem.getSurfacePoints()` 获取折线点序列，用 `lineTo` 连接
  - 土壤层：同样用折线上边 + 底部矩形围成多边形
  - 草皮层：沿折线画 stroke（参考 godfreys_edit 的做法）
- [ ] 修改 `getWorldPosition()`：委托给 `terrainSystem.getWorldPosition()`

### Step 5: 辅助修改

- [ ] `helpers.ts`：`heightToSlopePosition()` 保留（作为 fallback 或其他用途），但主路径改用 TerrainSystem
- [ ] `CharacterRenderer.ts`：角色站立角度需跟随当前段坡度
  - 从 `terrainSystem.getSlopeAtHeight()` 获取当前坡度
  - 角色的旋转角度 = 当前段坡度（不再是山的统一角度）
- [ ] `Camera.ts`：跟随逻辑不变，只是输入的世界坐标来源改为 TerrainSystem

---

## 渲染细节

### 山体绘制（drawMountain 改造）

```
旧：
  surfaceLeft ─────────────────── surfaceRight   （直线）
  │                                           │
  └───────── soil fill ───────────────────────┘

新：
  p0 ──── p1 ──── p2 ──── p3 ──── p4 ──── p5   （折线）
   \      /\      \       /\       \      /
    \    /  \      \     /  \       \    /
     ── soil fill (polygon: 折线上边 + 底部两角) ──

草皮：沿 p0-p5 折线画粗 stroke（绿色）
高亮：沿同一折线画细 stroke（亮绿）
```

采样策略：
1. 计算可视区域对应的 height 范围 `[hMin, hMax]`
2. 在此范围内，每个地形段边界 + 等间距插值点 → 生成屏幕坐标数组
3. 用此数组绘制所有层

### 角色站立角度

- 当前：角色始终以山的统一 `slopeAngle` 旋转
- 改后：从 `terrainSystem.getSlopeAtHeight(visualHeight)` 取当前段角度
- 段与段交界处可做简单线性插值（可选，避免突兀跳变）

---

## 设计约束与注意事项

1. **偏移范围 ±5°**：保持温和变化。以第一座山（25°）为例，段坡度在 20°~30° 之间。第四座山（40°）则在 35°~45° 之间。
2. **体力消耗不变**：坡度只影响推进距离，不影响 `staminaSystem.consumeOnSuccess()` 的参数。
3. **段循环使用**：`segIndex = floor(height / totalSegLength) * segCount + localIndex`，确保无穷远也有地形。
4. **兼容性**：检查点（checkpoint）位置仍按 `height` 定义，渲染时用 `terrainSystem.getWorldPosition(cp.height)` 定位。
5. **登顶判定**：`run.logicalHeight >= mountain.height` 不变，只是到达此高度所需的推进次数会因地形而略有波动。
6. **推进动画**：`visualHeight` 的 easing 逻辑不变，只是 `heightToWorldPosition` 的映射路径变了。

---

## 实施顺序建议

```
Step 1 (config)  →  Step 2 (TerrainSystem)  →  Step 3 (GameManager)
                                              →  Step 4 (MountainRenderer)  // 可与 Step 3 并行
                                              →  Step 5 (Character + 辅助)
```

预计改动文件 6 个，新增文件 1 个。

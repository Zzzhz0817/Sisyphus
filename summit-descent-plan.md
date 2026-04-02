# 山顶 + 下山 + 平地商店 实施计划

## 目标效果

玩家登顶后，视觉上看到一个尖尖的山顶（上坡与下坡的交汇），然后角色沿 60° 下坡一路滚到海拔零处的平地，平地上有商店小牌子，角色到达平地后进入商店 UI。下一局从新山的山脚开始爬。

整个流程：**上坡 → 山顶 → 下坡滚落动画 → 平地 → 商店 → 下一座山上坡**

---

## 当前流程（需要改的部分）

```
checkSummit()
  → logicalHeight 被 clamp 到 mountain.height
  → 发放首登奖励
  → endRun()
      → showShop()  // 直接弹出 HTML 商店遮罩

startNewRun()
  → 新 RunState，logicalHeight = 0
  → renderer.setMountain(newMountain)
  → camera.snap() 到 height=0 的位置
```

**问题**：登顶后直接弹商店，没有下山过渡。山坡无限延伸无山顶。

---

## 新增游戏状态

当前 `GameState = 'climbing' | 'shop'`，需要新增一个 descent（下山）状态：

```ts
// GameManager.ts
export type GameState = 'climbing' | 'descending' | 'shop';
```

| 状态 | 玩家操作 | 画面 |
|---|---|---|
| `climbing` | 正常推石 | 上坡 |
| `descending` | 无操作，纯动画 | 角色沿下坡滚落到平地 |
| `shop` | 商店 UI | 角色站在平地上，商店牌子可见 |

---

## Step 1: 地形数据 — 每座山的完整地形轮廓

### 1.1 config.ts 新增常量

```ts
export const DESCENT_SLOPE_ANGLE = 60;        // 下山坡度（度）
export const SUMMIT_FLAT_LENGTH = 20;         // 山顶小平台长度（game units），让山顶不是刀尖
export const VALLEY_FLAT_LENGTH = 200;        // 山谷平地长度（game units）
export const DESCENT_ROLL_SPEED = 800;        // 下山滚动速度（game units/s）— 比失败滑落快 2x
                                               // 对比: SLIDE_MAX_SPEED = 400
```

> 注：`DESCENT_ROLL_SPEED = 800` 是 `SLIDE_MAX_SPEED(400)` 的 2 倍，满足"比失败滑落快两倍"的要求。

### 1.2 地形分区概念

每座山的完整世界地形由 4 段组成，用 `height`（沿坡面一维距离）作为统一坐标轴：

```
区段            height 范围                              坡度
──────────────────────────────────────────────────────────────
上坡 (ascent)   [0, mountain.height]                     mountain.slopeAngle
山顶平台        [mountain.height, mountain.height + SUMMIT_FLAT_LENGTH]   0°
下坡 (descent)  [summit_end, descent_end]                DESCENT_SLOPE_ANGLE (60°)
山谷平地        [descent_end, descent_end + VALLEY_FLAT_LENGTH]           0°

其中:
  summit_end = mountain.height + SUMMIT_FLAT_LENGTH
  // 下坡需要从山顶高度降到海拔 0
  // 山顶的实际海拔 = mountain.height × sin(mountain.slopeAngle)
  // 下坡沿坡面长度 = 海拔 / sin(60°)
  descent_length = mountain.height × sin(mountain.slopeAngle) / sin(DESCENT_SLOPE_ANGLE)
  descent_end = summit_end + descent_length
```

---

## Step 2: 新建 TerrainProfile 类

**新建文件**：`src/terrain/TerrainProfile.ts`

这个类负责把一维的 `height` 映射到世界坐标 `(x, y)`，同时返回当前位置的坡度。它封装了"上坡 → 山顶 → 下坡 → 平地"四段逻辑。

```ts
import { MountainConfig, DESCENT_SLOPE_ANGLE, SUMMIT_FLAT_LENGTH, VALLEY_FLAT_LENGTH } from '../config';
import { degToRad } from '../utils/helpers';

interface TerrainZone {
  name: 'ascent' | 'summit' | 'descent' | 'valley';
  startHeight: number;   // 沿坡面距离起点
  length: number;        // 沿坡面距离长度
  slopeDeg: number;      // 该段坡度
  direction: 1 | -1;     // 1=上升, -1=下降
}

export class TerrainProfile {
  private zones: TerrainZone[] = [];
  private totalLength = 0;

  /** 每个 zone 起点处的累计世界坐标，预计算缓存 */
  private zoneWorldOrigins: Array<{ x: number; y: number }> = [];

  constructor(mountain: MountainConfig) {
    this.build(mountain);
  }

  setMountain(mountain: MountainConfig): void {
    this.build(mountain);
  }

  private build(mountain: MountainConfig): void {
    const ascentAngleRad = degToRad(mountain.slopeAngle);
    const summitAltitude = mountain.height * Math.sin(ascentAngleRad);
    const descentLength = summitAltitude / Math.sin(degToRad(DESCENT_SLOPE_ANGLE));

    this.zones = [
      { name: 'ascent',  startHeight: 0, length: mountain.height, slopeDeg: mountain.slopeAngle, direction: 1 },
      { name: 'summit',  startHeight: mountain.height, length: SUMMIT_FLAT_LENGTH, slopeDeg: 0, direction: 1 },
      { name: 'descent', startHeight: mountain.height + SUMMIT_FLAT_LENGTH, length: descentLength, slopeDeg: DESCENT_SLOPE_ANGLE, direction: -1 },
      { name: 'valley',  startHeight: mountain.height + SUMMIT_FLAT_LENGTH + descentLength, length: VALLEY_FLAT_LENGTH, slopeDeg: 0, direction: 1 },
    ];
    this.totalLength = this.zones[this.zones.length - 1].startHeight + VALLEY_FLAT_LENGTH;

    // 预计算每个 zone 起点处的世界坐标
    this.zoneWorldOrigins = [];
    let cx = 0, cy = 0;
    for (const zone of this.zones) {
      this.zoneWorldOrigins.push({ x: cx, y: cy });
      const rad = degToRad(zone.slopeDeg);
      cx += zone.length * Math.cos(rad);
      cy -= zone.length * Math.sin(rad) * zone.direction;
      // direction: 上坡 y 减小（向上），下坡 y 增大（向下）
    }
  }

  /** 给定 height，返回世界坐标 */
  getWorldPosition(height: number): { x: number; y: number } {
    const h = Math.max(0, Math.min(height, this.totalLength));
    for (let i = 0; i < this.zones.length; i++) {
      const zone = this.zones[i];
      if (h <= zone.startHeight + zone.length || i === this.zones.length - 1) {
        const local = h - zone.startHeight;
        const rad = degToRad(zone.slopeDeg);
        const origin = this.zoneWorldOrigins[i];
        return {
          x: origin.x + local * Math.cos(rad),
          y: origin.y - local * Math.sin(rad) * zone.direction,
        };
      }
    }
    return this.zoneWorldOrigins[0]; // fallback
  }

  /** 给定 height，返回当前段坡度（弧度），带方向（下坡返回负值） */
  getSlopeRad(height: number): number {
    const zone = this.getZoneAt(height);
    return degToRad(zone.slopeDeg) * zone.direction;
  }

  /** 给定 height，返回当前所在区域名称 */
  getZoneName(height: number): 'ascent' | 'summit' | 'descent' | 'valley' {
    return this.getZoneAt(height).name;
  }

  /** 返回 valley 的起始 height（用于判断是否到达谷底） */
  getValleyStartHeight(): number {
    const valley = this.zones.find(z => z.name === 'valley')!;
    return valley.startHeight;
  }

  /** 返回整个地形的总长度 */
  getTotalLength(): number {
    return this.totalLength;
  }

  /** 返回山顶的 height 值 */
  getSummitHeight(): number {
    return this.zones[0].length; // = mountain.height
  }

  private getZoneAt(height: number): TerrainZone {
    const h = Math.max(0, Math.min(height, this.totalLength));
    for (let i = this.zones.length - 1; i >= 0; i--) {
      if (h >= this.zones[i].startHeight) return this.zones[i];
    }
    return this.zones[0];
  }

  /** 返回所有 zone 信息（供渲染用） */
  getZones(): TerrainZone[] {
    return this.zones;
  }
}
```

---

## Step 3: MountainRenderer 改造 — 渲染完整地形轮廓

### 3.1 接入 TerrainProfile

**文件**：`src/render/MountainRenderer.ts`

```ts
// 新增引用
import { TerrainProfile } from '../terrain/TerrainProfile';

export class MountainRenderer {
  private terrainProfile: TerrainProfile;
  // ... 其余现有字段不变
}
```

在 `setMountain()` 中初始化/更新 `TerrainProfile`：

```ts
setMountain(mountain: MountainConfig): void {
  this.slopeAngleRad = degToRad(mountain.slopeAngle);  // 保留，用于背景视差
  this.grassColor = mountain.grassColor;
  // ... 颜色设置不变 ...
  this.terrainProfile = new TerrainProfile(mountain);   // 新增
}
```

### 3.2 修改 drawMountain() — 从直线变折线

**当前逻辑**（需替换）：
```ts
// 旧: 用单一 tanAngle 算两个端点，画直线
const tanAngle = Math.tan(this.slopeAngleRad);
const leftSurfaceY = -worldLeft * tanAngle;
const rightSurfaceY = -worldRight * tanAngle;
// ... 画直线
```

**新逻辑**：

```ts
private drawMountain(ctx, camera, canvasWidth, canvasHeight): void {
  const buffer = 1000;
  const visibleWorldWidth = canvasWidth / camera.zoom;
  const visibleWorldHeight = canvasHeight / camera.zoom;

  // 1. 确定可见区域在世界坐标中的范围
  const worldLeft = camera.x - visibleWorldWidth / 2 - buffer;
  const worldRight = camera.x + visibleWorldWidth / 2 + buffer;

  // 2. 沿地形 zone 列表生成折线顶点
  //    需要把世界 X 范围映射回 height，然后沿 height 采样
  //    但更简单的做法是：直接遍历所有 zone 的关键点 + 可见范围内等距采样
  const zones = this.terrainProfile.getZones();
  const totalLen = this.terrainProfile.getTotalLength();

  // 收集地形折线的世界坐标点
  const surfacePoints: Array<{x: number, y: number}> = [];
  const step = 30;  // 每 30 game units 采样一个点
  for (let h = 0; h <= totalLen; h += step) {
    const wp = this.terrainProfile.getWorldPosition(h);
    surfacePoints.push(wp);
  }
  // 确保最后一个点
  surfacePoints.push(this.terrainProfile.getWorldPosition(totalLen));

  // 同时在每个 zone 边界处插入精确点（确保山顶尖角不被 step 跳过）
  // （zone 边界: 山顶、下坡起点、谷底起点）

  // 3. 只保留可见范围内的点（带 buffer）
  const visibleSurfacePoints = surfacePoints.filter(
    p => p.x >= worldLeft && p.x <= worldRight
  );

  // 4. 转为屏幕坐标
  const screenPoints = visibleSurfacePoints.map(
    p => camera.worldToScreen(p.x, p.y, canvasWidth, canvasHeight)
  );

  // 5. 绘制（与现有逻辑类似，但用折线代替直线）
  //    土壤层: 折线顶部 + 底部两角围成的多边形
  //    草皮层: 沿折线画粗 stroke
  //    高亮线: 沿折线画细 stroke
  //    条纹:   保留，偏移固定像素

  // ... （具体绘制代码见下方"渲染细节"）
}
```

### 3.3 渲染细节

**土壤填充**：与现有逻辑一致，只是顶边从两点直线变成折线：

```ts
// 土壤 gradient
const soilGradient = ctx.createLinearGradient(
  screenPoints[0].sx, screenPoints[0].sy,
  screenPoints[0].sx, screenPoints[0].sy + depth * camera.zoom
);
soilGradient.addColorStop(0, this.soilColor);
soilGradient.addColorStop(1, '#3E2723');

ctx.fillStyle = soilGradient;
ctx.beginPath();
// 沿折线走上边
ctx.moveTo(screenPoints[0].sx, screenPoints[0].sy);
for (let i = 1; i < screenPoints.length; i++) {
  ctx.lineTo(screenPoints[i].sx, screenPoints[i].sy);
}
// 走下边（屏幕底部以下）
const last = screenPoints[screenPoints.length - 1];
const first = screenPoints[0];
ctx.lineTo(last.sx, last.sy + depth * camera.zoom);
ctx.lineTo(first.sx, first.sy + depth * camera.zoom);
ctx.closePath();
ctx.fill();
```

**草皮层**：改为沿折线画 stroke（参考 godfreys_edit）：

```ts
// 粗草皮
ctx.strokeStyle = this.grassColor;
ctx.lineWidth = grassThickness;
ctx.lineJoin = 'round';
ctx.beginPath();
ctx.moveTo(screenPoints[0].sx, screenPoints[0].sy);
for (let i = 1; i < screenPoints.length; i++) {
  ctx.lineTo(screenPoints[i].sx, screenPoints[i].sy);
}
ctx.stroke();

// 高亮线
ctx.strokeStyle = '#B2FF59';
ctx.lineWidth = 6 * camera.zoom;
ctx.beginPath();
ctx.moveTo(screenPoints[0].sx, screenPoints[0].sy);
for (let i = 1; i < screenPoints.length; i++) {
  ctx.lineTo(screenPoints[i].sx, screenPoints[i].sy);
}
ctx.stroke();
```

### 3.4 修改 getWorldPosition()

```ts
// 旧
getWorldPosition(height: number): { x: number; y: number } {
  return heightToSlopePosition(height, this.slopeAngleRad);
}

// 新: 委托给 TerrainProfile
getWorldPosition(height: number): { x: number; y: number } {
  return this.terrainProfile.getWorldPosition(height);
}
```

同时暴露 TerrainProfile 给外部（GameManager 需要查询 zone）：

```ts
getTerrainProfile(): TerrainProfile {
  return this.terrainProfile;
}
```

---

## Step 4: CharacterRenderer 改造 — 动态坡度旋转

**文件**：`src/render/CharacterRenderer.ts`

### 当前

- 构造函数中 `this.slopeAngleRad = degToRad(MOUNTAIN_SLOPE_ANGLE)` 固定值
- `render()` 中 `ctx.rotate(-this.slopeAngleRad)` 统一旋转
- `setSlopeAngle(deg)` 只在换山时调一次

### 改动

`render()` 方法需要接收**当前位置的实际坡度**，而不是用固定的 `this.slopeAngleRad`。

**方案**：给 `render()` 新增参数 `currentSlopeRad`：

```ts
// 旧签名
render(ctx, camera, worldX, worldY, canvasW, canvasH, slideState, time): void

// 新签名
render(ctx, camera, worldX, worldY, canvasW, canvasH, slideState, time, currentSlopeRad: number): void
```

在函数体内：

```ts
// 旧
ctx.rotate(-this.slopeAngleRad);

// 新: 使用传入的当前坡度
ctx.rotate(-currentSlopeRad);
```

> 注意 `currentSlopeRad` 在下坡时为负值（因为 `TerrainProfile.getSlopeRad()` 返回带方向的角度），`-负值 = 正值`，角色会面朝下坡方向倾斜。

`getHeadScreenPosition()` 也要同步改，接收 `currentSlopeRad` 参数：

```ts
// 旧
getHeadScreenPosition(camera, worldX, worldY, canvasW, canvasH): { sx, sy }

// 新
getHeadScreenPosition(camera, worldX, worldY, canvasW, canvasH, currentSlopeRad: number): { sx, sy }
```

**下坡时角色朝向**：

下坡时 `currentSlopeRad` 为负（因为 direction=-1），角色 `ctx.rotate(-负值)` = 正向旋转，自然面朝右下方。boulder 在前方（下坡方向），角色在后面推——视觉上就是"跟着石头往下滚"。不需要额外翻转，因为上坡时角色也是面朝坡上方向推的，坡度取反后自然翻转。

---

## Step 5: Renderer.ts 传递坡度

**文件**：`src/render/Renderer.ts`

`render()` 方法需要从 TerrainProfile 查当前坡度，传给 CharacterRenderer：

```ts
render(currentHeight, slideState, time, checkpoints, collectedCheckpoints): void {
  const worldPos = this.mountain.getWorldPosition(currentHeight);
  const slopeRad = this.mountain.getTerrainProfile().getSlopeRad(currentHeight); // 新增

  this.camera.setTarget(worldPos.x, worldPos.y, currentHeight);

  this.ctx.save();
  this.mountain.render(this.ctx, this.camera, w, h, checkpoints, collectedCheckpoints, time);
  this.character.render(this.ctx, this.camera, worldPos.x, worldPos.y, w, h, slideState, time, slopeRad); // 传入坡度
  this.ctx.restore();
}
```

`getCharacterHeadScreen()` 同步改：

```ts
getCharacterHeadScreen(currentHeight: number): { sx: number; sy: number } {
  const worldPos = this.mountain.getWorldPosition(currentHeight);
  const slopeRad = this.mountain.getTerrainProfile().getSlopeRad(currentHeight);
  return this.character.getHeadScreenPosition(this.camera, worldPos.x, worldPos.y, this.width, this.height, slopeRad);
}
```

---

## Step 6: GameManager 改造 — 下山状态机

**文件**：`src/game/GameManager.ts`

### 6.1 新增 GameState

```ts
export type GameState = 'climbing' | 'descending' | 'shop';
```

### 6.2 修改 checkSummit() — 只负责进入 descending，不调用 endRun()

> **关键设计**：`checkSummit()` 不再调用 `endRun()`。整个流程中 `endRun()` **只在 `updateDescending()` 到达谷底时调用一次**，避免重复触发商店或奖励计算。
>
> 调用链：`checkSummit()` → 设置 `gameState = 'descending'` → `updateDescending()` 每帧推进 → 到达谷底 → `endRun()` → `showShop()`

```ts
// 旧: checkSummit() 直接调 endRun()
private checkSummit(): void {
  if (this.run.logicalHeight < mountain.height) return;
  this.run.logicalHeight = mountain.height;
  // ... 发奖 ...
  this.endRun();   // ← 删除这行
}

// 新: checkSummit() 只负责发奖 + 切状态，不调 endRun()
private checkSummit(): void {
  const mountain = this.currentMountain;
  if (this.run.logicalHeight < mountain.height) return;

  this.run.logicalHeight = mountain.height;

  // 首登奖励（保持不变）
  if (!this.persistent.mountainsSummited[mountain.id]) {
    this.persistent.mountainsSummited[mountain.id] = true;
    this.persistent.ingot += mountain.summitIngotReward;
    this.run.runEarnings.ingot += mountain.summitIngotReward;
    const nextIdx = mountain.id + 1;
    if (nextIdx < MOUNTAINS.length) {
      this.persistent.mountainsUnlocked[nextIdx] = true;
    }
  }

  // 禁用所有玩家输入
  this.judgmentBarUI.hide();
  this.mouseDown = false;
  this.judgmentBar.active = false;

  // 记录登顶时的 zoom，供下山阶段使用
  this.descentZoom = this.renderer.camera.zoom;

  // 只切状态，不调 endRun()
  this.gameState = 'descending';
}
```

### 6.3 新增 updateDescending()

```ts
private updateDescending(dt: number): void {
  // 以 DESCENT_ROLL_SPEED 匀速推进 height
  this.run.logicalHeight += DESCENT_ROLL_SPEED * dt;

  // 直接同步（不用 push 动画的 easing，下山是匀速滚动）
  this.run.visualHeight = this.run.logicalHeight;

  // 检查是否到达谷底平地
  const profile = this.renderer.mountain.getTerrainProfile();
  const valleyStart = profile.getValleyStartHeight();
  if (this.run.logicalHeight >= valleyStart) {
    this.run.logicalHeight = valleyStart;
    this.run.visualHeight = valleyStart;
    // 在平地上停下 → 进入商店
    this.endRun();
    return;
  }

  // 相机跟随
  this.renderer.camera.update(dt);

  // 渲染（下山期间用 'sliding' 状态复用滑落动画）
  this.renderer.render(
    this.run.visualHeight,
    'sliding',              // 复用滑落的角色动画（快速腿部摆动、身体后倾）
    this.totalTime,
    this.checkpointSystem.getCheckpoints(),
    this.checkpointSystem.collectedThisRun,
  );
}
```

> **复用说明**：下山时传 `slideState = 'sliding'`，CharacterRenderer 会自动：
> - `legPhase = time * 20`（快速腿部摆动） — 来自 CharacterRenderer.ts 第 103 行
> - `bodyTilt = degToRad(-15)`（身体后倾） — 第 110 行
> - `bob = 0`（无呼吸起伏） — 第 114 行
> - 手臂 flailing 动画 — 第 189 行
>
> 加上 `currentSlopeRad` 此时为负值，角色会自然面朝下坡方向，看起来就是"追着石头往下跑"。

### 6.4 修改主循环 loop()

```ts
// 旧
private loop = (now: number) => {
  requestAnimationFrame(this.loop);
  const dt = Math.min((now - this.lastTime) / 1000, 0.05);
  this.lastTime = now;
  this.totalTime += dt;
  if (this.gameState === 'climbing') {
    this.updateClimbing(dt);
  }
};

// 新: 加入 descending 分支
private loop = (now: number) => {
  requestAnimationFrame(this.loop);
  const dt = Math.min((now - this.lastTime) / 1000, 0.05);
  this.lastTime = now;
  this.totalTime += dt;
  if (this.gameState === 'climbing') {
    this.updateClimbing(dt);
  } else if (this.gameState === 'descending') {
    this.updateDescending(dt);
  }
};
```

### 6.5 修改 endRun()

endRun 保持原来的逻辑（记录历史、弹商店），不需要改。
但 `showShop()` 不再隐藏游戏画面——玩家站在谷底平地上，商店 UI 叠加在上面。

### 6.6 修改 startNewRun()

```ts
private startNewRun(): void {
  this.persistent.totalRuns++;
  this.stats = getEffectiveStats(this.persistent);

  const mountainIdx = this.persistent.selectedMountainIndex;
  const mountain = MOUNTAINS[mountainIdx];

  this.run = this.createRunState(mountainIdx);
  // ... 重置各系统（不变）...

  // 切换到新山
  this.renderer.setMountain(mountain);

  this.shopUI.hide();
  this.gameState = 'climbing';

  // 新山的 height=0 就是山脚
  const worldPos = this.renderer.mountain.getWorldPosition(0);
  this.renderer.camera.setTarget(worldPos.x, worldPos.y, 0);
  this.renderer.camera.snap();

  this.hud.setMountainName(mountain.name);
}
```

这里逻辑基本不变。每座山的 TerrainProfile 会在 `setMountain()` 时重建，height=0 对应新山的山脚。

### 6.7 修改 updateClimbing() 中的滑落归零检测

```ts
// 旧: 滑到 height<=0 结束
if (this.slideSystem.state === 'sliding' && this.run.logicalHeight <= 0) {
  this.run.logicalHeight = 0;
  this.run.visualHeight = 0;
  this.endRun();
  return;
}

// 不变。上坡失败滑到 0 还是直接结束 run（失败回到商店）。
// 只有登顶才会走 descending 路线。
```

---

## Step 7: 山谷平地商店牌子 — 纯视觉

### 7.1 MountainRenderer 新增 drawShopSign()

在渲染循环中，当 height 接近谷底平地时，画一个商店牌子：

```ts
private drawShopSign(ctx: CanvasRenderingContext2D, camera: Camera, canvasW: number, canvasH: number): void {
  const profile = this.terrainProfile;
  const valleyStart = profile.getValleyStartHeight();
  const signWorldPos = profile.getWorldPosition(valleyStart + 60); // 平地上偏右一点

  const screen = camera.worldToScreen(signWorldPos.x, signWorldPos.y, canvasW, canvasH);

  const postW = 6 * camera.zoom;
  const postH = 50 * camera.zoom;
  const signW = 60 * camera.zoom;
  const signH = 30 * camera.zoom;

  // 木桩
  ctx.fillStyle = '#5D4037';
  ctx.fillRect(screen.sx - postW / 2, screen.sy - postH, postW, postH);

  // 招牌板
  ctx.fillStyle = '#8D6E63';
  ctx.fillRect(screen.sx - signW / 2, screen.sy - postH - signH, signW, signH);

  // 边框
  ctx.strokeStyle = '#4E342E';
  ctx.lineWidth = 2 * camera.zoom;
  ctx.strokeRect(screen.sx - signW / 2, screen.sy - postH - signH, signW, signH);

  // 文字 "SHOP"
  ctx.fillStyle = '#FFD740';
  ctx.font = `bold ${14 * camera.zoom}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SHOP', screen.sx, screen.sy - postH - signH / 2);
}
```

### 7.2 在 render() 中调用

```ts
render(ctx, camera, canvasW, canvasH, checkpoints, collectedCheckpoints, time): void {
  // ... 现有渲染 ...
  this.drawMountain(ctx, camera, canvasW, canvasH);
  this.drawShopSign(ctx, camera, canvasW, canvasH);  // 新增：始终画牌子
  this.drawCheckpoints(ctx, camera, canvasW, canvasH, checkpoints, collectedCheckpoints, time);
}
```

> 牌子在山谷平地上，上山时看不到（不在可视范围），只有下山到达谷底时才进入画面。

---

## Step 8: Checkpoint 渲染适配

**文件**：`src/render/MountainRenderer.ts` 的 `drawCheckpoints()`

当前 checkpoint 位置用 `heightToSlopePosition(cp.height, this.slopeAngleRad)` 计算。改为：

```ts
// 旧
const pos = heightToSlopePosition(cp.height, this.slopeAngleRad);

// 新
const pos = this.terrainProfile.getWorldPosition(cp.height);
```

所有 checkpoint 都在 `ascent` 区段内（height < mountain.height），所以坐标结果与原来一致。

---

## 完整文件修改清单

| 文件 | 操作 | 改动内容 |
|---|---|---|
| `src/config.ts` | 修改 | 新增 4 个常量：`DESCENT_SLOPE_ANGLE`, `SUMMIT_FLAT_LENGTH`, `VALLEY_FLAT_LENGTH`, `DESCENT_ROLL_SPEED` |
| `src/terrain/TerrainProfile.ts` | **新建** | 完整的地形轮廓类（上坡→山顶→下坡→平地），提供 `getWorldPosition()`, `getSlopeRad()`, `getZoneName()` 等 |
| `src/render/MountainRenderer.ts` | 修改 | 引入 TerrainProfile；`drawMountain()` 改为折线渲染；新增 `drawShopSign()`；`getWorldPosition()` 委托给 TerrainProfile |
| `src/render/CharacterRenderer.ts` | 修改 | `render()` 和 `getHeadScreenPosition()` 新增 `currentSlopeRad` 参数，替代固定的 `this.slopeAngleRad` |
| `src/render/Renderer.ts` | 修改 | `render()` 查询当前坡度并传给 CharacterRenderer |
| `src/game/GameManager.ts` | 修改 | 新增 `'descending'` 状态；`checkSummit()` 进入下山而非直接结束；新增 `updateDescending()`；主循环加入 descending 分支 |

**不需要改的文件**：
- `SlideSystem.ts` — 下山不复用 SlideSystem 的逻辑，只复用其视觉状态 `'sliding'`
- `StaminaSystem.ts` — 不受影响
- `ShopUI.ts` — 接口不变，只是触发时机从"登顶后立即"变成"下山到谷底后"
- `Camera.ts` — 不变，自动跟随新坐标
- `PlayerState.ts` — 不变
- `helpers.ts` — `heightToSlopePosition` 保留不删，TerrainProfile 内部自行计算

---

## 实施顺序

```
1. config.ts          — 加常量（5 分钟）
2. TerrainProfile.ts  — 新建核心类（独立，无依赖）
3. MountainRenderer   — 接入 TerrainProfile + 折线渲染 + 商店牌子
4. CharacterRenderer  — 加 currentSlopeRad 参数
5. Renderer.ts        — 传递坡度
6. GameManager        — descending 状态 + checkSummit 改造 + updateDescending
```

Step 2 可以先写好并单独测试坐标计算。Step 3-5 是渲染层改动，可以一起做。Step 6 是游戏逻辑，最后接入。

---

## 边界情况

1. **第一座山之前没有前一座山的下坡** — height=0 就是山脚平地起点，正常开始。无需特殊处理。
2. **玩家上坡失败滑到 0** — 仍然是 `endRun()` → 商店，不走下山流程。只有登顶才下山。
3. **最后一座山登顶后** — 正常下山到谷底进商店，与其他山一致。可以之后加特殊胜利画面。
4. **相机缩放** — 下山时 height 持续增长（越过山顶继续加），Camera 的 zoom 会继续缩小。如果不希望下山时镜头缩太远，可在 `Camera.setTarget()` 中对 descending 状态 clamp zoom。但这是可选优化，初版可不做。
5. **山顶小平台 20 units** — 防止山顶是完美刀尖（渲染上可能出现像素级锐角）。20 units 非常短，视觉上看起来就是个尖顶。

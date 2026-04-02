import {
  CLOUD_COLOR,
  CHECKPOINT_VISUAL_RADIUS,
  CheckpointConfig,
  MountainConfig,
  MOUNTAINS,
  BASE_FLAT_LENGTH,
} from '../config';
import { degToRad, heightToSlopePosition } from '../utils/helpers';
import { Camera } from './Camera';
import { TerrainProfile } from '../terrain/TerrainProfile';

export class MountainRenderer {
  private slopeAngleRad: number;
  private terrainProfile: TerrainProfile;
  private clouds: { x: number; y: number; scale: number; speed: number }[];
  private stars: { x: number; y: number; size: number; alpha: number }[];

  // Current mountain visual theme (mutable per run)
  private grassColor: string;
  private soilColor: string;
  private bgColorTop: string;
  private bgColorBottom: string;

  constructor() {
    const m = MOUNTAINS[0];
    this.slopeAngleRad = degToRad(m.slopeAngle);
    this.terrainProfile = new TerrainProfile(m);
    this.grassColor = m.grassColor;
    this.soilColor = m.soilColor;
    this.bgColorTop = m.bgColorTop;
    this.bgColorBottom = m.bgColorBottom;

    this.clouds = [];
    for (let i = 0; i < 20; i++) {
      this.clouds.push({
        x: Math.random() * 6000 - 3000,
        y: Math.random() * -2000 - 500,
        scale: 0.5 + Math.random() * 2.0,
        speed: 1 + Math.random() * 4,
      });
    }

    this.stars = [];
    for (let i = 0; i < 100; i++) {
      this.stars.push({
        x: Math.random() * 4000 - 2000,
        y: Math.random() * -3000 - 1000,
        size: Math.random() * 2,
        alpha: 0.2 + Math.random() * 0.8,
      });
    }
  }

  /** Switch visual theme to a different mountain */
  setMountain(mountain: MountainConfig): void {
    this.slopeAngleRad = degToRad(mountain.slopeAngle);
    this.terrainProfile.setMountain(mountain);
    this.grassColor = mountain.grassColor;
    this.soilColor = mountain.soilColor;
    this.bgColorTop = mountain.bgColorTop;
    this.bgColorBottom = mountain.bgColorBottom;
  }

  render(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    canvasWidth: number,
    canvasHeight: number,
    checkpoints: CheckpointConfig[],
    collectedCheckpoints: number[],
    time: number,
  ): void {
    // 1. Sky
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    skyGradient.addColorStop(0, this.bgColorTop);
    skyGradient.addColorStop(1, this.bgColorBottom);
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    this.drawSkyObjects(ctx, camera, canvasWidth, canvasHeight, time);
    this.drawParallaxLayer(ctx, camera, canvasWidth, canvasHeight, 0.15, '#3F51B5', canvasHeight * 0.5, 150);
    this.drawParallaxLayer(ctx, camera, canvasWidth, canvasHeight, 0.35, '#5C6BC0', canvasHeight * 0.7, 80);
    this.drawClouds(ctx, camera, canvasWidth, canvasHeight, time);
    this.drawMountain(ctx, camera, canvasWidth, canvasHeight);
    this.drawShopSign(ctx, camera, canvasWidth, canvasHeight);
    this.drawCheckpoints(ctx, camera, canvasWidth, canvasHeight, checkpoints, collectedCheckpoints, time);
  }

  private drawSkyObjects(ctx: CanvasRenderingContext2D, camera: Camera, canvasWidth: number, canvasHeight: number, time: number): void {
    ctx.fillStyle = '#FFFFFF';
    this.stars.forEach((star) => {
      const screenX = star.x - camera.x * 0.05 + canvasWidth / 2;
      const screenY = star.y - camera.y * 0.05 + canvasHeight / 2;
      if (screenX > 0 && screenX < canvasWidth && screenY > 0 && screenY < canvasHeight) {
        ctx.globalAlpha = star.alpha * (0.5 + 0.5 * Math.sin(time * 2 + star.x));
        ctx.beginPath();
        ctx.arc(screenX, screenY, star.size * camera.zoom, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.globalAlpha = 1.0;

    const sunWorldX = 1000;
    const sunWorldY = -1500;
    const sunScreenX = sunWorldX - camera.x * 0.02 + canvasWidth / 2;
    const sunScreenY = sunWorldY - camera.y * 0.02 + canvasHeight / 2;
    if (sunScreenX > -200 && sunScreenX < canvasWidth + 200 && sunScreenY > -200 && sunScreenY < canvasHeight + 200) {
      const sunRadius = 80 * camera.zoom;
      const glow = ctx.createRadialGradient(sunScreenX, sunScreenY, sunRadius, sunScreenX, sunScreenY, sunRadius * 3);
      glow.addColorStop(0, 'rgba(255, 235, 59, 0.4)');
      glow.addColorStop(1, 'rgba(255, 235, 59, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(sunScreenX, sunScreenY, sunRadius * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFEE58';
      ctx.beginPath();
      ctx.arc(sunScreenX, sunScreenY, sunRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawParallaxLayer(ctx: CanvasRenderingContext2D, camera: Camera, canvasWidth: number, canvasHeight: number, parallaxFactor: number, color: string, baseYOffset: number, amplitude: number): void {
    ctx.fillStyle = color;
    ctx.beginPath();
    const slopeOffset = Math.tan(this.slopeAngleRad * 0.5);
    const startX = -canvasWidth;
    const endX = canvasWidth * 2;
    const step = 100;
    const camX = camera.x * parallaxFactor;
    const camY = camera.y * parallaxFactor;
    ctx.moveTo(startX, canvasHeight + 500);
    for (let x = startX; x <= endX; x += step) {
      const wx = x + camX;
      const noise = Math.sin(wx * 0.003) * amplitude + Math.sin(wx * 0.007) * (amplitude * 0.4) + Math.sin(wx * 0.015) * (amplitude * 0.2);
      const slopeRise = wx * slopeOffset;
      const sy = baseYOffset - noise - slopeRise - camY;
      ctx.lineTo(x, sy);
    }
    ctx.lineTo(endX, canvasHeight + 500);
    ctx.closePath();
    ctx.fill();
  }

  private drawClouds(ctx: CanvasRenderingContext2D, camera: Camera, canvasWidth: number, canvasHeight: number, time: number): void {
    ctx.fillStyle = CLOUD_COLOR;
    this.clouds.forEach((cloud) => {
      const parallaxFactor = 0.2;
      const drift = time * cloud.speed * 10;
      const worldX = cloud.x + drift;
      const worldY = cloud.y;
      const screenX = worldX - camera.x * parallaxFactor + canvasWidth / 2;
      const screenY = worldY - camera.y * parallaxFactor + canvasHeight / 2;
      const size = 40 * cloud.scale * camera.zoom;
      if (screenX > -size * 5 && screenX < canvasWidth + size * 5 && screenY > -size * 5 && screenY < canvasHeight + size * 5) {
        ctx.beginPath();
        ctx.arc(screenX, screenY, size, Math.PI, 0);
        ctx.arc(screenX + size * 1.2, screenY + size * 0.2, size * 0.8, Math.PI, 0);
        ctx.arc(screenX - size * 1.2, screenY + size * 0.2, size * 0.8, Math.PI, 0);
        ctx.rect(screenX - size * 2, screenY, size * 4, size * 0.2);
        ctx.fill();
      }
    });
  }

  private drawMountain(ctx: CanvasRenderingContext2D, camera: Camera, canvasWidth: number, canvasHeight: number): void {
    const buffer = 1000;
    const visibleWorldWidth = canvasWidth / camera.zoom;
    const visibleWorldHeight = canvasHeight / camera.zoom;

    // 1. 确定可见区域在世界坐标中的范围
    const worldLeft = camera.x - visibleWorldWidth / 2 - buffer;
    const worldRight = camera.x + visibleWorldWidth / 2 + buffer;

    // 2. 沿地形 zone 列表生成折线顶点
    const totalLen = this.terrainProfile.getTotalLength();

    // 收集地形折线的世界坐标点
    const surfacePoints: Array<{x: number, y: number}> = [];
    const step = 30;  // 每 30 game units 采样一个点
    
    // 从-3*BASE_FLAT_LENGTH开始采样，以在玩家身后绘制平地（延长三倍）
    const startHeight = -3 * BASE_FLAT_LENGTH;
    for (let h = startHeight; h <= totalLen; h += step) {
      let wp: {x: number, y: number};
      if (h < 0) {
        // 对于负高度，使用base区域的坐标（平地，y=0）
        wp = { x: h, y: 0 }; // 平地，y坐标为0
      } else {
        wp = this.terrainProfile.getWorldPosition(h);
      }
      surfacePoints.push(wp);
    }
    // 确保最后一个点
    surfacePoints.push(this.terrainProfile.getWorldPosition(totalLen));

    // 3. 只保留可见范围内的点（带 buffer）
    const visibleSurfacePoints = surfacePoints.filter(
      p => p.x >= worldLeft && p.x <= worldRight
    );

    // 4. 转为屏幕坐标
    const screenPoints = visibleSurfacePoints.map(
      p => camera.worldToScreen(p.x, p.y, canvasWidth, canvasHeight)
    );

    // 5. 绘制
    if (screenPoints.length < 2) return;

    // 土壤填充
    const depth = visibleWorldHeight * 2 + buffer;
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

    // 条纹
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.beginPath();
    for (let i = 0; i < screenPoints.length; i++) {
      const p = screenPoints[i];
      if (i === 0) {
        ctx.moveTo(p.sx, p.sy + 100 * camera.zoom);
      } else {
        ctx.lineTo(p.sx, p.sy + 100 * camera.zoom);
      }
    }
    for (let i = screenPoints.length - 1; i >= 0; i--) {
      const p = screenPoints[i];
      ctx.lineTo(p.sx, p.sy + 150 * camera.zoom);
    }
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    for (let i = 0; i < screenPoints.length; i++) {
      const p = screenPoints[i];
      if (i === 0) {
        ctx.moveTo(p.sx, p.sy + 300 * camera.zoom);
      } else {
        ctx.lineTo(p.sx, p.sy + 300 * camera.zoom);
      }
    }
    for (let i = screenPoints.length - 1; i >= 0; i--) {
      const p = screenPoints[i];
      ctx.lineTo(p.sx, p.sy + 320 * camera.zoom);
    }
    ctx.closePath();
    ctx.fill();

    // 草皮层
    const grassThickness = 28 * camera.zoom;
    ctx.fillStyle = this.grassColor;
    ctx.beginPath();
    for (let i = 0; i < screenPoints.length; i++) {
      const p = screenPoints[i];
      if (i === 0) {
        ctx.moveTo(p.sx, p.sy);
      } else {
        ctx.lineTo(p.sx, p.sy);
      }
    }
    // 反向走下边
    for (let i = screenPoints.length - 1; i >= 0; i--) {
      const p = screenPoints[i];
      // 计算草皮偏移（根据当前点的斜率）
      const h = Math.min(i * step, totalLen);
      const slopeRad = this.terrainProfile.getSlopeRad(h);
      const xOff = grassThickness * Math.sin(slopeRad);
      const yOff = grassThickness * Math.cos(slopeRad);
      ctx.lineTo(p.sx + xOff, p.sy + yOff);
    }
    ctx.closePath();
    ctx.fill();

    // 高亮线
    ctx.strokeStyle = '#B2FF59';
    ctx.lineWidth = 6 * camera.zoom;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i < screenPoints.length; i++) {
      const p = screenPoints[i];
      if (i === 0) {
        ctx.moveTo(p.sx, p.sy);
      } else {
        ctx.lineTo(p.sx, p.sy);
      }
    }
    ctx.stroke();

    // 草皮下边缘线
    ctx.strokeStyle = 'rgba(51, 105, 30, 0.4)';
    ctx.lineWidth = 4 * camera.zoom;
    ctx.beginPath();
    for (let i = 0; i < screenPoints.length; i++) {
      const p = screenPoints[i];
      const h = Math.min(i * step, totalLen);
      const slopeRad = this.terrainProfile.getSlopeRad(h);
      const xOff = grassThickness * Math.sin(slopeRad);
      const yOff = grassThickness * Math.cos(slopeRad);
      if (i === 0) {
        ctx.moveTo(p.sx + xOff, p.sy + yOff);
      } else {
        ctx.lineTo(p.sx + xOff, p.sy + yOff);
      }
    }
    ctx.stroke();
  }

  private drawShopSign(ctx: CanvasRenderingContext2D, camera: Camera, canvasW: number, canvasH: number): void {
    const valleyStart = this.terrainProfile.getValleyStartHeight();
    const signWorldPos = this.terrainProfile.getWorldPosition(valleyStart + 60); // 平地上偏右一点

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

  private drawCheckpoints(ctx: CanvasRenderingContext2D, camera: Camera, canvasWidth: number, canvasHeight: number, checkpoints: CheckpointConfig[], collectedCheckpoints: number[], time: number): void {
    for (let i = 0; i < checkpoints.length; i++) {
      const cp = checkpoints[i];
      const pos = this.terrainProfile.getWorldPosition(cp.height);
      const screen = camera.worldToScreen(pos.x, pos.y, canvasWidth, canvasHeight);
      const collected = collectedCheckpoints.includes(i);
      const floatOffset = Math.sin(time * 4 + i) * 6 * camera.zoom;

      if (cp.reward.ingot) {
        // --- INGOT CHECKPOINT (Fancy with post and dome) ---
        const r = CHECKPOINT_VISUAL_RADIUS * camera.zoom;
        const postWidth = 10 * camera.zoom;
        const postHeight = 36 * camera.zoom;
        const postLift = 6 * camera.zoom;

        ctx.fillStyle = '#CFD8DC';
        ctx.fillRect(screen.sx - postWidth / 2, screen.sy - postHeight - postLift, postWidth, postHeight);
        ctx.fillStyle = '#ECEFF1';
        ctx.fillRect(screen.sx - postWidth / 2 + 2, screen.sy - postHeight - postLift + 2, postWidth - 4, postHeight - 2);

        ctx.save();
        const lift = 4 * camera.zoom;
        ctx.translate(screen.sx, screen.sy);
        ctx.rotate(-this.slopeAngleRad);
        ctx.translate(0, -lift);
        const domeRadius = 18 * camera.zoom;
        ctx.scale(1, 0.6);
        ctx.beginPath();
        ctx.arc(0, 0, domeRadius, 0, Math.PI, true);
        ctx.fillStyle = '#90A4AE';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, 0, domeRadius * 0.7, 0, Math.PI, true);
        ctx.fillStyle = '#B0BEC5';
        ctx.fill();
        ctx.fillStyle = '#607D8B';
        ctx.fillRect(-domeRadius * 1.1, -2 * camera.zoom, domeRadius * 2.2, 10 * camera.zoom);
        ctx.restore();

        const orbY = screen.sy - postHeight - postLift - r * 1.2 + floatOffset;
        const glowColor = collected ? 'rgba(144, 164, 174, 0.6)' : 'rgba(255, 213, 79, 0.7)';
        const orbColor = collected ? '#90A4AE' : '#FFCA28';
        const orbOutline = collected ? '#546E7A' : '#FFF9C4';
        
        const glowGradient = ctx.createRadialGradient(screen.sx, orbY, r * 0.2, screen.sx, orbY, r * 3);
        glowGradient.addColorStop(0, glowColor);
        glowGradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(screen.sx, orbY, r * 3, 0, Math.PI * 2);
        ctx.fill();

        // Draw Ingot (Trapezoid)
        const topW = r * 0.8;
        const botW = r * 1.4;
        const h = r * 1.2;
        
        ctx.fillStyle = orbColor;
        ctx.beginPath();
        ctx.moveTo(screen.sx - topW, orbY - h/2);
        ctx.lineTo(screen.sx + topW, orbY - h/2);
        ctx.lineTo(screen.sx + botW, orbY + h/2);
        ctx.lineTo(screen.sx - botW, orbY + h/2);
        ctx.closePath();
        ctx.fill();
        
        ctx.strokeStyle = orbOutline;
        ctx.lineWidth = 2.5 * camera.zoom;
        ctx.stroke();
        
        // Inner detail for ingot
        ctx.strokeStyle = collected ? '#78909C' : '#FFE082';
        ctx.lineWidth = 1 * camera.zoom;
        ctx.beginPath();
        ctx.moveTo(screen.sx - topW + 2*camera.zoom, orbY - h/2 + 2*camera.zoom);
        ctx.lineTo(screen.sx + topW - 2*camera.zoom, orbY - h/2 + 2*camera.zoom);
        ctx.lineTo(screen.sx + botW - 3*camera.zoom, orbY + h/2 - 2*camera.zoom);
        ctx.lineTo(screen.sx - botW + 3*camera.zoom, orbY + h/2 - 2*camera.zoom);
        ctx.closePath();
        ctx.stroke();

      } else {
        // --- OBOL CHECKPOINT (Small coin with skull) ---
        const r = CHECKPOINT_VISUAL_RADIUS * 0.33 * camera.zoom; // Smaller (1/3 of original size)
        const coinY = screen.sy - r * 1.5 + floatOffset; // Float closer to the ground
        
        const glowColor = collected ? 'rgba(144, 164, 174, 0.4)' : 'rgba(224, 224, 224, 0.6)';
        const coinColor = collected ? '#78909C' : '#E0E0E0';
        const coinOutline = collected ? '#455A64' : '#FAFAFA';
        const skullColor = collected ? '#546E7A' : '#9E9E9E';

        // Subtle glow
        const glowGradient = ctx.createRadialGradient(screen.sx, coinY, r * 0.2, screen.sx, coinY, r * 2);
        glowGradient.addColorStop(0, glowColor);
        glowGradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(screen.sx, coinY, r * 2, 0, Math.PI * 2);
        ctx.fill();

        // Coin base
        ctx.fillStyle = coinColor;
        ctx.beginPath();
        ctx.arc(screen.sx, coinY, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = coinOutline;
        ctx.lineWidth = 2 * camera.zoom;
        ctx.stroke();

        // Inner rim
        ctx.strokeStyle = skullColor;
        ctx.lineWidth = 0.5 * camera.zoom;
        ctx.beginPath();
        ctx.arc(screen.sx, coinY, r * 0.8, 0, Math.PI * 2);
        ctx.stroke();

        // Cute Skull (简笔画骷髅头)
        ctx.fillStyle = skullColor;
        // Skull top half (semi-circle)
        const skullR = r * 0.45;
        ctx.beginPath();
        ctx.arc(screen.sx, coinY - skullR*0.1, skullR, Math.PI, 0);
        // Skull bottom half (jaw)
        ctx.lineTo(screen.sx + skullR*0.6, coinY + skullR*0.9);
        ctx.lineTo(screen.sx - skullR*0.6, coinY + skullR*0.9);
        ctx.closePath();
        ctx.fill();

        // Eyes
        ctx.fillStyle = coinColor; // punch out eyes
        ctx.beginPath();
        ctx.arc(screen.sx - skullR*0.4, coinY + skullR*0.1, skullR*0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(screen.sx + skullR*0.4, coinY + skullR*0.1, skullR*0.25, 0, Math.PI * 2);
        ctx.fill();

        // Teeth lines
        ctx.strokeStyle = coinColor;
        ctx.lineWidth = 1 * camera.zoom;
        ctx.beginPath();
        ctx.moveTo(screen.sx - skullR*0.3, coinY + skullR*0.5);
        ctx.lineTo(screen.sx - skullR*0.3, coinY + skullR*0.9);
        ctx.moveTo(screen.sx, coinY + skullR*0.5);
        ctx.lineTo(screen.sx, coinY + skullR*0.9);
        ctx.moveTo(screen.sx + skullR*0.3, coinY + skullR*0.5);
        ctx.lineTo(screen.sx + skullR*0.3, coinY + skullR*0.9);
        ctx.stroke();
      }
    }
  }

  /** Get world position for a given height along the slope */
  getWorldPosition(height: number): { x: number; y: number } {
    return this.terrainProfile.getWorldPosition(height);
  }

  /** 返回 TerrainProfile 供外部查询 */
  getTerrainProfile(): TerrainProfile {
    return this.terrainProfile;
  }
}

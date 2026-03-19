import {
  CLOUD_COLOR,
  CHECKPOINT_VISUAL_RADIUS,
  CheckpointConfig,
  MountainConfig,
  MOUNTAINS,
} from '../config';
import { degToRad, heightToSlopePosition } from '../utils/helpers';
import { Camera } from './Camera';

export class MountainRenderer {
  private slopeAngleRad: number;
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
    const visibleWorldHeight = canvasHeight / camera.zoom;
    const visibleWorldWidth = canvasWidth / camera.zoom;
    const worldLeft = camera.x - visibleWorldWidth / 2 - buffer;
    const worldRight = camera.x + visibleWorldWidth / 2 + buffer;
    const tanAngle = Math.tan(this.slopeAngleRad);
    const leftSurfaceY = -worldLeft * tanAngle;
    const rightSurfaceY = -worldRight * tanAngle;
    const surfaceLeft = camera.worldToScreen(worldLeft, leftSurfaceY, canvasWidth, canvasHeight);
    const surfaceRight = camera.worldToScreen(worldRight, rightSurfaceY, canvasWidth, canvasHeight);
    const depth = visibleWorldHeight * 2 + buffer;
    const pBotLeft = camera.worldToScreen(worldLeft, leftSurfaceY + depth, canvasWidth, canvasHeight);
    const pBotRight = camera.worldToScreen(worldRight, rightSurfaceY + depth, canvasWidth, canvasHeight);

    // Soil
    const soilGradient = ctx.createLinearGradient(surfaceLeft.sx, surfaceLeft.sy, pBotLeft.sx, pBotLeft.sy);
    soilGradient.addColorStop(0, this.soilColor);
    soilGradient.addColorStop(1, '#3E2723');
    ctx.fillStyle = soilGradient;
    ctx.beginPath();
    ctx.moveTo(surfaceLeft.sx, surfaceLeft.sy);
    ctx.lineTo(surfaceRight.sx, surfaceRight.sy);
    ctx.lineTo(pBotRight.sx, pBotRight.sy);
    ctx.lineTo(pBotLeft.sx, pBotLeft.sy);
    ctx.closePath();
    ctx.fill();

    // Stripes
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.beginPath();
    ctx.moveTo(surfaceLeft.sx, surfaceLeft.sy + 100 * camera.zoom);
    ctx.lineTo(surfaceRight.sx, surfaceRight.sy + 100 * camera.zoom);
    ctx.lineTo(surfaceRight.sx, surfaceRight.sy + 150 * camera.zoom);
    ctx.lineTo(surfaceLeft.sx, surfaceLeft.sy + 150 * camera.zoom);
    ctx.moveTo(surfaceLeft.sx, surfaceLeft.sy + 300 * camera.zoom);
    ctx.lineTo(surfaceRight.sx, surfaceRight.sy + 300 * camera.zoom);
    ctx.lineTo(surfaceRight.sx, surfaceRight.sy + 320 * camera.zoom);
    ctx.lineTo(surfaceLeft.sx, surfaceLeft.sy + 320 * camera.zoom);
    ctx.fill();

    // Grass
    const grassThickness = 28 * camera.zoom;
    const xOff = grassThickness * Math.sin(this.slopeAngleRad);
    const yOff = grassThickness * Math.cos(this.slopeAngleRad);
    ctx.fillStyle = this.grassColor;
    ctx.beginPath();
    ctx.moveTo(surfaceLeft.sx, surfaceLeft.sy);
    ctx.lineTo(surfaceRight.sx, surfaceRight.sy);
    ctx.lineTo(surfaceRight.sx + xOff, surfaceRight.sy + yOff);
    ctx.lineTo(surfaceLeft.sx + xOff, surfaceLeft.sy + yOff);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#B2FF59';
    ctx.lineWidth = 6 * camera.zoom;
    ctx.beginPath();
    ctx.moveTo(surfaceLeft.sx, surfaceLeft.sy);
    ctx.lineTo(surfaceRight.sx, surfaceRight.sy);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(51, 105, 30, 0.4)';
    ctx.lineWidth = 4 * camera.zoom;
    ctx.beginPath();
    ctx.moveTo(surfaceLeft.sx + xOff, surfaceLeft.sy + yOff);
    ctx.lineTo(surfaceRight.sx + xOff, surfaceRight.sy + yOff);
    ctx.stroke();
  }

  private drawCheckpoints(ctx: CanvasRenderingContext2D, camera: Camera, canvasWidth: number, canvasHeight: number, checkpoints: CheckpointConfig[], collectedCheckpoints: number[], time: number): void {
    for (let i = 0; i < checkpoints.length; i++) {
      const cp = checkpoints[i];
      const pos = heightToSlopePosition(cp.height, this.slopeAngleRad);
      const screen = camera.worldToScreen(pos.x, pos.y, canvasWidth, canvasHeight);
      const r = CHECKPOINT_VISUAL_RADIUS * camera.zoom;
      const collected = collectedCheckpoints.includes(i);

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

      const floatOffset = Math.sin(time * 4 + i) * 6 * camera.zoom;
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

      ctx.fillStyle = orbColor;
      ctx.beginPath();
      ctx.moveTo(screen.sx, orbY - r * 1.2);
      ctx.lineTo(screen.sx + r * 1.2, orbY);
      ctx.lineTo(screen.sx, orbY + r * 1.2);
      ctx.lineTo(screen.sx - r * 1.2, orbY);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = orbOutline;
      ctx.lineWidth = 2.5 * camera.zoom;
      ctx.stroke();
    }
  }

  /** Get world position for a given height along the slope */
  getWorldPosition(height: number): { x: number; y: number } {
    return heightToSlopePosition(height, this.slopeAngleRad);
  }
}

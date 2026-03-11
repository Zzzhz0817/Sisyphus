import {
  MOUNTAIN_SLOPE_ANGLE,
  MOUNTAIN_GRASS_COLOR,
  MOUNTAIN_SOIL_COLOR,
  BACKGROUND_COLOR_TOP,
  BACKGROUND_COLOR_BOTTOM,
  CLOUD_COLOR,
  CHECKPOINT_VISUAL_RADIUS,
  CHECKPOINTS,
  START_PLATFORM_LENGTH,
} from '../config';
import { degToRad, heightToSlopePosition } from '../utils/helpers';
import { Camera } from './Camera';

export class MountainRenderer {
  private slopeAngleRad: number;
  private clouds: { x: number; y: number; scale: number; speed: number }[];
  private stars: { x: number; y: number; size: number; alpha: number }[];

  constructor() {
    this.slopeAngleRad = degToRad(MOUNTAIN_SLOPE_ANGLE);
    
    // Initialize random clouds
    this.clouds = [];
    for (let i = 0; i < 20; i++) {
      this.clouds.push({
        x: Math.random() * 6000 - 3000,
        y: Math.random() * -2000 - 500, // Varying heights
        scale: 0.5 + Math.random() * 2.0, 
        speed: 1 + Math.random() * 4, 
      });
    }

    // Initialize stars (visible when high up)
    this.stars = [];
    for (let i = 0; i < 100; i++) {
      this.stars.push({
        x: Math.random() * 4000 - 2000,
        y: Math.random() * -3000 - 1000, // Very high altitude
        size: Math.random() * 2,
        alpha: 0.2 + Math.random() * 0.8
      });
    }
  }

  render(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    canvasWidth: number,
    canvasHeight: number,
    collectedCheckpoints: number[],
    time: number
  ): void {
    // 1. Draw Sky Gradient
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    skyGradient.addColorStop(0, BACKGROUND_COLOR_TOP);
    skyGradient.addColorStop(1, BACKGROUND_COLOR_BOTTOM);
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 1.5 Draw Sun/Moon & Stars (Static relative to high altitude)
    this.drawSkyObjects(ctx, camera, canvasWidth, canvasHeight, time);

    // 2. Draw Distant Mountains (Parallax 0.15)
    this.drawParallaxLayer(ctx, camera, canvasWidth, canvasHeight, 0.15, '#3F51B5', canvasHeight * 0.5, 150);

    // 3. Draw Mid-ground Hills (Parallax 0.35)
    this.drawParallaxLayer(ctx, camera, canvasWidth, canvasHeight, 0.35, '#5C6BC0', canvasHeight * 0.7, 80);

    // 4. Draw Clouds (Parallax 0.2 + drift)
    this.drawClouds(ctx, camera, canvasWidth, canvasHeight, time);

    // 5. Draw Main Foreground Mountain
    this.drawMountain(ctx, camera, canvasWidth, canvasHeight);

    // 5.5 Draw flat start platform (spawn + fall destination)
    this.drawStartPlatform(ctx, camera, canvasWidth, canvasHeight);

    // 6. Draw Checkpoints
    this.drawCheckpoints(ctx, camera, canvasWidth, canvasHeight, collectedCheckpoints, time);
  }

  private drawSkyObjects(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    canvasWidth: number,
    canvasHeight: number,
    time: number
  ): void {
    // Stars - parallax factor 0.05
    ctx.fillStyle = '#FFFFFF';
    this.stars.forEach(star => {
      const screenX = (star.x - camera.x * 0.05) + canvasWidth / 2;
      const screenY = (star.y - camera.y * 0.05) + canvasHeight / 2;
      
      if (screenX > 0 && screenX < canvasWidth && screenY > 0 && screenY < canvasHeight) {
        ctx.globalAlpha = star.alpha * (0.5 + 0.5 * Math.sin(time * 2 + star.x));
        ctx.beginPath();
        ctx.arc(screenX, screenY, star.size * camera.zoom, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.globalAlpha = 1.0;

    // Draw a stylized Sun
    const sunWorldX = 1000;
    const sunWorldY = -1500;
    const sunScreenX = (sunWorldX - camera.x * 0.02) + canvasWidth / 2;
    const sunScreenY = (sunWorldY - camera.y * 0.02) + canvasHeight / 2;

    if (sunScreenX > -200 && sunScreenX < canvasWidth + 200 && sunScreenY > -200 && sunScreenY < canvasHeight + 200) {
      const sunRadius = 80 * camera.zoom;
      
      // Sun glow
      const glow = ctx.createRadialGradient(sunScreenX, sunScreenY, sunRadius, sunScreenX, sunScreenY, sunRadius * 3);
      glow.addColorStop(0, 'rgba(255, 235, 59, 0.4)');
      glow.addColorStop(1, 'rgba(255, 235, 59, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(sunScreenX, sunScreenY, sunRadius * 3, 0, Math.PI * 2);
      ctx.fill();

      // Sun core
      ctx.fillStyle = '#FFEE58';
      ctx.beginPath();
      ctx.arc(sunScreenX, sunScreenY, sunRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawParallaxLayer(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    canvasWidth: number,
    canvasHeight: number,
    parallaxFactor: number,
    color: string,
    baseYOffset: number,
    amplitude: number
  ): void {
    ctx.fillStyle = color;
    ctx.beginPath();
    
    // We want the mountains to follow the general slope, but flatter
    const slopeOffset = Math.tan(this.slopeAngleRad * 0.5); // Flatter slope for background
    
    const startX = -canvasWidth;
    const endX = canvasWidth * 2;
    const step = 100;
    
    const camX = camera.x * parallaxFactor;
    const camY = camera.y * parallaxFactor;

    ctx.moveTo(startX, canvasHeight + 500);

    for (let x = startX; x <= endX; x += step) {
      const wx = x + camX; 
      // Add multiple octaves of sine waves for mountain-like ridges
      const noise = Math.sin(wx * 0.003) * amplitude + 
                    Math.sin(wx * 0.007) * (amplitude * 0.4) + 
                    Math.sin(wx * 0.015) * (amplitude * 0.2);
      
      // Slope the background layer upwards as world X increases
      const slopeRise = (wx * slopeOffset);
      
      const sy = baseYOffset - noise - slopeRise - camY;
      ctx.lineTo(x, sy);
    }

    ctx.lineTo(endX, canvasHeight + 500);
    ctx.closePath();
    ctx.fill();
  }

  private drawClouds(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    canvasWidth: number,
    canvasHeight: number,
    time: number
  ): void {
    ctx.fillStyle = CLOUD_COLOR;
    
    this.clouds.forEach(cloud => {
      const parallaxFactor = 0.2; 
      const drift = time * cloud.speed * 10;
      
      const worldX = cloud.x + drift;
      const worldY = cloud.y;

      const screenX = (worldX - camera.x * parallaxFactor) + canvasWidth / 2;
      const screenY = (worldY - camera.y * parallaxFactor) + canvasHeight / 2;

      const size = 40 * cloud.scale * camera.zoom;
      
      if (screenX > -size * 5 && screenX < canvasWidth + size * 5 && screenY > -size * 5 && screenY < canvasHeight + size * 5) {
        ctx.beginPath();
        // Flat bottom stylized clouds
        ctx.arc(screenX, screenY, size, Math.PI, 0);
        ctx.arc(screenX + size * 1.2, screenY + size * 0.2, size * 0.8, Math.PI, 0);
        ctx.arc(screenX - size * 1.2, screenY + size * 0.2, size * 0.8, Math.PI, 0);
        
        // Fill the bottom gap
        ctx.rect(screenX - size * 2, screenY, size * 4, size * 0.2);
        ctx.fill();
      }
    });
  }

  private drawMountain(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    // Reduced buffer from 4000 to 1000 to avoid extreme coordinate culling on some hardware.
    // 1000 world units * 3 zoom = 3000 px, which is plenty to cover the screen bounds.
    const buffer = 1000; 
    const visibleWorldHeight = canvasHeight / camera.zoom;
    const visibleWorldWidth = canvasWidth / camera.zoom;
    
    const worldLeft = camera.x - visibleWorldWidth / 2 - buffer;
    const worldRight = camera.x + visibleWorldWidth / 2 + buffer;
    
    // Compute Y along the slope surface: y = -x * tan(angle)
    const tanAngle = Math.tan(this.slopeAngleRad);
    const leftSurfaceY = -worldLeft * tanAngle;
    const rightSurfaceY = -worldRight * tanAngle;

    // Project the 4 corners of our mountain polygon into screen space
    const surfaceLeft = camera.worldToScreen(worldLeft, leftSurfaceY, canvasWidth, canvasHeight);
    const surfaceRight = camera.worldToScreen(worldRight, rightSurfaceY, canvasWidth, canvasHeight);
    
    // Project the bottom corners. We use a generous depth (e.g. visibleWorldHeight * 2 + buffer)
    // to ensure the mountain fills the bottom of the screen.
    const depth = visibleWorldHeight * 2 + buffer;
    const pBotLeft = camera.worldToScreen(worldLeft, leftSurfaceY + depth, canvasWidth, canvasHeight);
    const pBotRight = camera.worldToScreen(worldRight, rightSurfaceY + depth, canvasWidth, canvasHeight);

    // --- Draw Soil (Base) ---
    // Make the soil look more earthy by using a linear gradient down into the earth
    const soilGradient = ctx.createLinearGradient(surfaceLeft.sx, surfaceLeft.sy, pBotLeft.sx, pBotLeft.sy);
    soilGradient.addColorStop(0, MOUNTAIN_SOIL_COLOR);
    soilGradient.addColorStop(1, '#3E2723'); // Very dark brown deep underground

    ctx.fillStyle = soilGradient;
    ctx.beginPath();
    ctx.moveTo(surfaceLeft.sx, surfaceLeft.sy);
    ctx.lineTo(surfaceRight.sx, surfaceRight.sy);
    ctx.lineTo(pBotRight.sx, pBotRight.sy);
    ctx.lineTo(pBotLeft.sx, pBotLeft.sy);
    ctx.closePath();
    ctx.fill();

    // Add textured geometric stripes to soil for a stylized look
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'; 
    ctx.beginPath();
    // Stripe 1
    ctx.moveTo(surfaceLeft.sx, surfaceLeft.sy + 100 * camera.zoom);
    ctx.lineTo(surfaceRight.sx, surfaceRight.sy + 100 * camera.zoom);
    ctx.lineTo(surfaceRight.sx, surfaceRight.sy + 150 * camera.zoom);
    ctx.lineTo(surfaceLeft.sx, surfaceLeft.sy + 150 * camera.zoom);
    // Stripe 2
    ctx.moveTo(surfaceLeft.sx, surfaceLeft.sy + 300 * camera.zoom);
    ctx.lineTo(surfaceRight.sx, surfaceRight.sy + 300 * camera.zoom);
    ctx.lineTo(surfaceRight.sx, surfaceRight.sy + 320 * camera.zoom);
    ctx.lineTo(surfaceLeft.sx, surfaceLeft.sy + 320 * camera.zoom);
    ctx.fill();

    // --- Draw Grass (Top Layer) ---
    const grassThickness = 28 * camera.zoom;
    const xOff = grassThickness * Math.sin(this.slopeAngleRad);
    const yOff = grassThickness * Math.cos(this.slopeAngleRad);

    ctx.fillStyle = MOUNTAIN_GRASS_COLOR;
    ctx.beginPath();
    ctx.moveTo(surfaceLeft.sx, surfaceLeft.sy);
    ctx.lineTo(surfaceRight.sx, surfaceRight.sy);
    ctx.lineTo(surfaceRight.sx + xOff, surfaceRight.sy + yOff);
    ctx.lineTo(surfaceLeft.sx + xOff, surfaceLeft.sy + yOff);
    ctx.closePath();
    ctx.fill();
    
    // Lighter top edge (Grass Highlight)
    ctx.strokeStyle = '#B2FF59'; 
    ctx.lineWidth = 6 * camera.zoom;
    ctx.beginPath();
    ctx.moveTo(surfaceLeft.sx, surfaceLeft.sy);
    ctx.lineTo(surfaceRight.sx, surfaceRight.sy);
    ctx.stroke();
    
    // Inner grass shadow line
    ctx.strokeStyle = 'rgba(51, 105, 30, 0.4)'; 
    ctx.lineWidth = 4 * camera.zoom;
    ctx.beginPath();
    ctx.moveTo(surfaceLeft.sx + xOff, surfaceLeft.sy + yOff);
    ctx.lineTo(surfaceRight.sx + xOff, surfaceRight.sy + yOff);
    ctx.stroke();
  }


  private drawStartPlatform(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    canvasWidth: number,
    canvasHeight: number,
  ): void {
    const startX = -40;
    const endX = START_PLATFORM_LENGTH + 80;
    const topY = 0;
    const thickness = 34;

    const p1 = camera.worldToScreen(startX, topY, canvasWidth, canvasHeight);
    const p2 = camera.worldToScreen(endX, topY, canvasWidth, canvasHeight);
    const p3 = camera.worldToScreen(endX, topY + thickness, canvasWidth, canvasHeight);
    const p4 = camera.worldToScreen(startX, topY + thickness, canvasWidth, canvasHeight);

    const grad = ctx.createLinearGradient(p1.sx, p1.sy, p4.sx, p4.sy);
    grad.addColorStop(0, '#6D4C41');
    grad.addColorStop(1, '#3E2723');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(p1.sx, p1.sy);
    ctx.lineTo(p2.sx, p2.sy);
    ctx.lineTo(p3.sx, p3.sy);
    ctx.lineTo(p4.sx, p4.sy);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#B2FF59';
    ctx.lineWidth = 4 * camera.zoom;
    ctx.beginPath();
    ctx.moveTo(p1.sx, p1.sy);
    ctx.lineTo(p2.sx, p2.sy);
    ctx.stroke();
  }
  private drawCheckpoints(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    canvasWidth: number,
    canvasHeight: number,
    collectedCheckpoints: number[],
    time: number
  ): void {
    for (let i = 0; i < CHECKPOINTS.length; i++) {
      const cp = CHECKPOINTS[i];
      const pos = this.getWorldPosition(cp.height);
      const screen = camera.worldToScreen(pos.x, pos.y, canvasWidth, canvasHeight);
      const r = CHECKPOINT_VISUAL_RADIUS * camera.zoom;
      const collected = collectedCheckpoints.includes(i);

      const postWidth = 10 * camera.zoom; 
      const postHeight = 36 * camera.zoom; 
      const postLift = 6 * camera.zoom;

      // 1. Upright Post
      ctx.fillStyle = '#CFD8DC'; // Brighter silver/stone
      ctx.fillRect(screen.sx - postWidth / 2, screen.sy - postHeight - postLift, postWidth, postHeight);
      ctx.fillStyle = '#ECEFF1';
      ctx.fillRect(screen.sx - postWidth / 2 + 2, screen.sy - postHeight - postLift + 2, postWidth - 4, postHeight - 2);

      // 2. Base Dome
      ctx.save();
      const lift = 4 * camera.zoom;
      ctx.translate(screen.sx, screen.sy);
      ctx.rotate(-this.slopeAngleRad); 
      ctx.translate(0, -lift);

      const domeRadius = 18 * camera.zoom; 
      
      // Draw dome using arc instead of ellipse to ensure maximum browser compatibility
      ctx.scale(1, 0.6); // Scale Y by 0.6 to flatten the circle into an ellipse
      ctx.beginPath();
      ctx.arc(0, 0, domeRadius, 0, Math.PI, true); // True = counterclockwise from 0 to PI (top half)
      ctx.fillStyle = '#90A4AE'; 
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(0, 0, domeRadius * 0.7, 0, Math.PI, true);
      ctx.fillStyle = '#B0BEC5'; 
      ctx.fill();
      
      // Base rim
      ctx.fillStyle = '#607D8B';
      // Adjust rim coordinates for the scaled context
      ctx.fillRect(-domeRadius * 1.1, -2 * camera.zoom, domeRadius * 2.2, 10 * camera.zoom);
      
      ctx.restore();

      // 3. Floating Orb
      const floatOffset = Math.sin(time * 4 + i) * 6 * camera.zoom;
      const orbY = screen.sy - postHeight - postLift - r * 1.2 + floatOffset;

      const glowColor = collected ? 'rgba(144, 164, 174, 0.6)' : 'rgba(255, 213, 79, 0.7)';
      const orbColor = collected ? '#90A4AE' : '#FFCA28';
      const orbOutline = collected ? '#546E7A' : '#FFF9C4';

      // Glow
      const glowGradient = ctx.createRadialGradient(screen.sx, orbY, r * 0.2, screen.sx, orbY, r * 3);
      glowGradient.addColorStop(0, glowColor);
      glowGradient.addColorStop(1, 'rgba(0,0,0,0)');
      
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(screen.sx, orbY, r * 3, 0, Math.PI * 2);
      ctx.fill();

      // Orb
      ctx.fillStyle = orbColor;
      ctx.beginPath();
      // Draw a perfect diamond
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

  /** Get world position for a given height along terrain (flat start + slope). */
  getWorldPosition(height: number): { x: number; y: number } {
    if (height <= START_PLATFORM_LENGTH) {
      return { x: height, y: 0 };
    }

    const slopePos = heightToSlopePosition(height - START_PLATFORM_LENGTH, this.slopeAngleRad);
    return {
      x: START_PLATFORM_LENGTH + slopePos.x,
      y: slopePos.y,
    };
  }
}

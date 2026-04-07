import { CheckpointConfig, MountainConfig } from '../config';
import { Camera } from './Camera';
import { MountainRenderer } from './MountainRenderer';
import { CharacterRenderer, SlideVisualState } from './CharacterRenderer';
import { ParticleSystem } from './ParticleSystem';

import { BLESSING_BAR_COLOR, DUAL_PUSH_BONUS_POINTER_COLOR, PUSH_DISTANCE_BASE } from '../config';

export class Renderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  camera: Camera;
  mountain: MountainRenderer;
  character: CharacterRenderer;
  particles: ParticleSystem;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.camera = new Camera();
    this.mountain = new MountainRenderer();
    this.character = new CharacterRenderer();
    this.particles = new ParticleSystem();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  /** Switch visual theme and slope for a new mountain */
  setMountain(mountain: MountainConfig): void {
    this.mountain.setMountain(mountain);
    this.character.setSlopeAngle(mountain.slopeAngle);
  }

  resize(): void {
    this.canvas.width = this.canvas.clientWidth * window.devicePixelRatio;
    this.canvas.height = this.canvas.clientHeight * window.devicePixelRatio;
    this.ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
  }

  get width(): number {
    return this.canvas.clientWidth;
  }

  get height(): number {
    return this.canvas.clientHeight;
  }

  private flashColor: string | null = null;
  private flashAlpha: number = 0;

  render(
    currentHeight: number,
    slideState: SlideVisualState,
    time: number,
    checkpoints: CheckpointConfig[],
    collectedCheckpoints: number[],
    permanentlyClaimedIngot: number[] = [],
    dt: number = 0.016,
  ): void {
    const w = this.width;
    const h = this.height;

    const worldPos = this.mountain.getWorldPosition(currentHeight);
    const slopeRad = this.mountain.getTerrainProfile().getSlopeRad(currentHeight);

    this.camera.setTarget(worldPos.x, worldPos.y, currentHeight);

    this.ctx.save();

    this.mountain.render(this.ctx, this.camera, w, h, checkpoints, collectedCheckpoints, time, permanentlyClaimedIngot);
    this.particles.render(this.ctx, this.camera, w, h);
    this.character.render(this.ctx, this.camera, worldPos.x, worldPos.y, w, h, slideState, time, slopeRad);

    // Render flash effect
    if (this.flashAlpha > 0 && this.flashColor) {
      this.ctx.save();
      this.ctx.globalCompositeOperation = 'screen';
      this.ctx.fillStyle = this.flashColor;
      this.ctx.globalAlpha = this.flashAlpha;
      this.ctx.fillRect(0, 0, w, h);
      this.ctx.restore();
      
      this.flashAlpha -= dt * 2.0; // Fade out over 0.5s
      if (this.flashAlpha <= 0) {
        this.flashAlpha = 0;
        this.flashColor = null;
      }
    }

    this.ctx.restore();
  }

  triggerFlash(color: string, intensity: number = 0.4): void {
    this.flashColor = color;
    this.flashAlpha = intensity;
  }

  emitPushParticles(currentHeight: number, result: 'success' | 'crit', isBlessed: boolean, isDualPushBonus: boolean, pushDistance: number, dt: number): void {
    const worldPos = this.mountain.getWorldPosition(currentHeight);
    const slopeRad = this.mountain.getTerrainProfile().getSlopeRad(currentHeight);
    
    // Base velocity pointing backward and slightly up (so gravity pulls it down)
    // Backward is -cos, sin (since positive Y is down in world space)
    const baseSpeed = 150 + Math.random() * 100;
    const vx = -Math.cos(slopeRad) * baseSpeed;
    const vy = Math.sin(slopeRad) * baseSpeed - 150; // slight upward kick before gravity takes over

    // Calculate how many particles to emit this frame
    // Base rate reduced by 4x (was 30 for normal, 80 for crit -> now 7.5 and 20)
    const baseRate = result === 'crit' ? 20 : 7.5;
    
    // Scale density proportionally based on current push distance vs base push distance
    const distanceRatio = pushDistance / PUSH_DISTANCE_BASE;
    const rate = baseRate * distanceRatio;

    let count = Math.floor(rate * dt);
    if (Math.random() < (rate * dt) % 1) count += 1;

    if (count <= 0) return;

    if (isBlessed) {
      // Artifact 4 (Wheel of Fate): Special colored particles
      this.particles.emit(worldPos.x, worldPos.y, vx, vy, BLESSING_BAR_COLOR, 4, count, 0.6);
    } else if (result === 'crit') {
      // Artifact 1 (Ares' Fury): Gold/Red sparks, more intense
      this.particles.emit(worldPos.x, worldPos.y, vx * 1.2, vy * 1.2, '#FFD700', 3, count, 0.6);
      this.particles.emit(worldPos.x, worldPos.y, vx * 1.1, vy * 1.1, '#FF5252', 4, count, 0.5);
    } else {
      // Normal dust
      this.particles.emit(worldPos.x, worldPos.y, vx, vy, '#B0BEC5', 3, count, 0.5);
      this.particles.emit(worldPos.x, worldPos.y, vx, vy, '#78909C', 4, count, 0.5); // darker rocks
    }

    if (isDualPushBonus) {
      // Artifact 2 (Heracles' Armlet): A small burst of cyan
      this.particles.emit(worldPos.x, worldPos.y, vx, vy, DUAL_PUSH_BONUS_POINTER_COLOR, 4, count, 0.5);
    }
  }

  /** Get the screen position of the character's head */
  getCharacterHeadScreen(currentHeight: number): { sx: number; sy: number } {
    const worldPos = this.mountain.getWorldPosition(currentHeight);
    const slopeRad = this.mountain.getTerrainProfile().getSlopeRad(currentHeight);
    return this.character.getHeadScreenPosition(
      this.camera,
      worldPos.x,
      worldPos.y,
      this.width,
      this.height,
      slopeRad,
    );
  }
}

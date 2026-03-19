import { CheckpointConfig, MountainConfig } from '../config';
import { Camera } from './Camera';
import { MountainRenderer } from './MountainRenderer';
import { CharacterRenderer, SlideVisualState } from './CharacterRenderer';

export class Renderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  camera: Camera;
  mountain: MountainRenderer;
  character: CharacterRenderer;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.camera = new Camera();
    this.mountain = new MountainRenderer();
    this.character = new CharacterRenderer();
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

  render(
    currentHeight: number,
    slideState: SlideVisualState,
    time: number,
    checkpoints: CheckpointConfig[],
    collectedCheckpoints: number[],
  ): void {
    const w = this.width;
    const h = this.height;

    const worldPos = this.mountain.getWorldPosition(currentHeight);

    this.camera.setTarget(worldPos.x, worldPos.y, currentHeight);

    this.ctx.save();

    this.mountain.render(this.ctx, this.camera, w, h, checkpoints, collectedCheckpoints, time);
    this.character.render(this.ctx, this.camera, worldPos.x, worldPos.y, w, h, slideState, time);

    this.ctx.restore();
  }

  /** Get the screen position of the character's head */
  getCharacterHeadScreen(currentHeight: number): { sx: number; sy: number } {
    const worldPos = this.mountain.getWorldPosition(currentHeight);
    return this.character.getHeadScreenPosition(
      this.camera,
      worldPos.x,
      worldPos.y,
      this.width,
      this.height,
    );
  }
}

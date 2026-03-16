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
    collectedCheckpoints: number[],
  ): void {
    const w = this.width;
    const h = this.height;

    // Get character world position
    const worldPos = this.mountain.getWorldPosition(currentHeight);
    const terrainSlopeAngleRad = this.mountain.getSlopeRadAtHeight(currentHeight);

    // Update camera
    this.camera.setTarget(worldPos.x, worldPos.y, currentHeight);
    // camera.update is called in game loop

    // Clear and draw
    this.ctx.save();

    // Draw mountain & checkpoints
    this.mountain.render(this.ctx, this.camera, w, h, collectedCheckpoints, time);

    // Draw character
    this.character.render(
      this.ctx,
      this.camera,
      worldPos.x,
      worldPos.y,
      w,
      h,
      slideState,
      time,
      terrainSlopeAngleRad,
    );

    this.ctx.restore();
  }

  /** Get the screen position of the character's head */
  getCharacterHeadScreen(currentHeight: number): { sx: number; sy: number } {
    const worldPos = this.mountain.getWorldPosition(currentHeight);
    const terrainSlopeAngleRad = this.mountain.getSlopeRadAtHeight(currentHeight);
    return this.character.getHeadScreenPosition(
      this.camera,
      worldPos.x,
      worldPos.y,
      this.width,
      this.height,
      terrainSlopeAngleRad,
    );
  }
}

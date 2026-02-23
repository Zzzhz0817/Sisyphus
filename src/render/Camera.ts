import {
  CAMERA_BASE_ZOOM,
  CAMERA_ZOOM_RATE,
  CAMERA_ZOOM_STEP_HEIGHT,
  CAMERA_ZOOM_STEP_FACTOR,
  CAMERA_ZOOM_MODE,
  CAMERA_FOLLOW_SPEED,
  CAMERA_VIEWPORT_X,
  CAMERA_VIEWPORT_Y,
} from '../config';
import { lerp } from '../utils/helpers';

export class Camera {
  /** Camera center in world coordinates */
  x = 0;
  y = 0;
  zoom = CAMERA_BASE_ZOOM;

  private targetX = 0;
  private targetY = 0;
  private targetZoom = CAMERA_BASE_ZOOM;

  /** Update camera target to follow a world position */
  setTarget(worldX: number, worldY: number, height: number): void {
    this.targetX = worldX;
    this.targetY = worldY;

    if (CAMERA_ZOOM_MODE === 'continuous') {
      this.targetZoom = CAMERA_BASE_ZOOM / (1 + height * CAMERA_ZOOM_RATE);
    } else {
      const zoomLevel = Math.floor(height / CAMERA_ZOOM_STEP_HEIGHT);
      this.targetZoom = CAMERA_BASE_ZOOM / (1 + zoomLevel * CAMERA_ZOOM_STEP_FACTOR);
    }
  }

  /** Smoothly interpolate towards target */
  update(dt: number): void {
    const t = 1 - Math.exp(-CAMERA_FOLLOW_SPEED * dt);
    this.x = lerp(this.x, this.targetX, t);
    this.y = lerp(this.y, this.targetY, t);
    this.zoom = lerp(this.zoom, this.targetZoom, t);
  }

  /** Snap instantly (for reset) */
  snap(): void {
    this.x = this.targetX;
    this.y = this.targetY;
    this.zoom = this.targetZoom;
  }

  /**
   * Convert world coords to screen coords.
   * The tracked world point (camera.x, camera.y) maps to
   * (canvasWidth * CAMERA_VIEWPORT_X, canvasHeight * CAMERA_VIEWPORT_Y),
   * placing the player in the bottom-left quarter of the screen.
   */
  worldToScreen(wx: number, wy: number, canvasWidth: number, canvasHeight: number): { sx: number; sy: number } {
    const sx = (wx - this.x) * this.zoom + canvasWidth * CAMERA_VIEWPORT_X;
    const sy = (wy - this.y) * this.zoom + canvasHeight * CAMERA_VIEWPORT_Y;
    return { sx, sy };
  }
}

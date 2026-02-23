/** Clamp a value between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Linear interpolation */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Convert degrees to radians */
export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Convert game-world position to slope position (x, y on screen before camera) */
export function heightToSlopePosition(height: number, slopeAngleRad: number): { x: number; y: number } {
  return {
    x: height * Math.cos(slopeAngleRad),
    y: -height * Math.sin(slopeAngleRad), // y increases upward in game, but down on canvas
  };
}

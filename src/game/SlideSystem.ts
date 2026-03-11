import {
  SWEAT_DELAY,
  SLIDE_DELAY,
  SLIDE_DURATION,
  SWEAT_SLIDE_SPEED,
  SLIDE_INITIAL_SPEED,
  SLIDE_MAX_SPEED,
} from '../config';
import { lerp } from '../utils/helpers';

export type SlideState = 'normal' | 'sweating' | 'sliding';

export class SlideSystem {
  state: SlideState = 'normal';
  /** Time since last successful judgment */
  timeSinceSuccess = 0;
  /** Time spent in irreversible slide state */
  slideTime = 0;
  /** Whether the player has ever attempted a judgment this run */
  hasAttempted = false;

  /** Call when a judgment attempt happens (success or fail) */
  onAttempt(): void {
    this.hasAttempted = true;
  }

  /** Call when a successful judgment occurs */
  onSuccess(): void {
    this.hasAttempted = true;
    this.state = 'normal';
    this.timeSinceSuccess = 0;
    this.slideTime = 0;
  }

  /** Update each frame. Returns height delta (negative = sliding down) */
  update(dt: number, isWedgeActive: boolean): number {
    if (isWedgeActive) {
      return 0;
    }

    // Don't start slide timer until the player has attempted at least once
    if (!this.hasAttempted) return 0;

    if (this.state === 'sliding') {
      this.slideTime += dt;
      const t = Math.min(this.slideTime / SLIDE_DURATION, 1);
      const speed = lerp(SLIDE_INITIAL_SPEED, SLIDE_MAX_SPEED, t);
      return -speed * dt;
    }

    this.timeSinceSuccess += dt;

    if (this.timeSinceSuccess >= SWEAT_DELAY + SLIDE_DELAY) {
      // Enter irreversible slide
      this.state = 'sliding';
      this.slideTime = 0;
      return 0;
    }

    if (this.timeSinceSuccess >= SWEAT_DELAY) {
      // Sweating state - slow slide
      this.state = 'sweating';
      return -SWEAT_SLIDE_SPEED * dt;
    }

    this.state = 'normal';
    return 0;
  }

  /** Reset for new run */
  reset(): void {
    this.state = 'normal';
    this.timeSinceSuccess = 0;
    this.slideTime = 0;
    this.hasAttempted = false;
  }
}
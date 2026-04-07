import { CheckpointConfig, CHECKPOINT_COLLECT_ANIMATION_DURATION } from '../config';
import { PersistentState } from '../player/PlayerState';
import { addCurrency } from '../player/CurrencyManager';

export class CheckpointSystem {
  /** Checkpoint indices collected this run */
  collectedThisRun: number[] = [];

  /** The checkpoint list for the current mountain */
  private checkpoints: CheckpointConfig[] = [];

  /** Current mountain index (for persistent ingot tracking) */
  private mountainIndex: number = 0;

  /** Pending notification text and timer */
  notification: string | null = null;
  notificationTimer = 0;

  /** Set checkpoints and mountain index for the current run */
  setCheckpoints(checkpoints: CheckpointConfig[], mountainIndex: number): void {
    this.checkpoints = checkpoints;
    this.mountainIndex = mountainIndex;
  }

  /** Return which checkpoint indices for this mountain have been permanently claimed */
  getPermanentlyClaimedIngotIndices(persistent: PersistentState): number[] {
    return persistent.claimedIngotCheckpoints[this.mountainIndex] ?? [];
  }

  /** Get current checkpoint list (for rendering) */
  getCheckpoints(): CheckpointConfig[] {
    return this.checkpoints;
  }

  /** Check if any new checkpoints have been passed */
  checkProgress(
    currentHeight: number,
    persistent: PersistentState,
    runEarnings: { obol: number; ingot: number },
  ): void {
    for (let i = 0; i < this.checkpoints.length; i++) {
      if (this.collectedThisRun.includes(i)) continue;
      const cp = this.checkpoints[i];
      if (currentHeight >= cp.height) {
        this.collectedThisRun.push(i);
        if (cp.reward.ingot) {
          // Ingot checkpoints are one-time only across all runs
          const claimed = persistent.claimedIngotCheckpoints[this.mountainIndex] ?? [];
          if (!claimed.includes(i)) {
            claimed.push(i);
            persistent.claimedIngotCheckpoints[this.mountainIndex] = claimed;
            addCurrency(persistent, { ingot: cp.reward.ingot });
            runEarnings.ingot += cp.reward.ingot;
            this.notification = `+${cp.reward.ingot} Ingot`;
            this.notificationTimer = CHECKPOINT_COLLECT_ANIMATION_DURATION;
          }
          if (cp.reward.obol) {
            addCurrency(persistent, { obol: cp.reward.obol });
            runEarnings.obol += cp.reward.obol;
          }
        } else {
          addCurrency(persistent, cp.reward);
          if (cp.reward.obol) {
            runEarnings.obol += cp.reward.obol;
          }
        }
      }
    }

    // Update highest ever
    if (currentHeight > persistent.highestEver) {
      persistent.highestEver = currentHeight;
    }
  }

  /** Update notification timer */
  update(dt: number): void {
    if (this.notificationTimer > 0) {
      this.notificationTimer -= dt;
      if (this.notificationTimer <= 0) {
        this.notification = null;
      }
    }
  }

  /** Reset for new run */
  reset(): void {
    this.collectedThisRun = [];
    this.notification = null;
    this.notificationTimer = 0;
  }
}

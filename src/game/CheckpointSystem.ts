import { CheckpointConfig, CHECKPOINT_COLLECT_ANIMATION_DURATION } from '../config';
import { PersistentState } from '../player/PlayerState';
import { addCurrency } from '../player/CurrencyManager';

export class CheckpointSystem {
  /** Checkpoint indices collected this run */
  collectedThisRun: number[] = [];

  /** The checkpoint list for the current mountain */
  private checkpoints: CheckpointConfig[] = [];

  /** Pending notification text and timer */
  notification: string | null = null;
  notificationTimer = 0;

  /** Set checkpoints for the current mountain */
  setCheckpoints(checkpoints: CheckpointConfig[]): void {
    this.checkpoints = checkpoints;
  }

  /** Get current checkpoint list (for rendering) */
  getCheckpoints(): CheckpointConfig[] {
    return this.checkpoints;
  }

  /** Check if any new checkpoints have been passed */
  checkProgress(
    currentHeight: number,
    persistent: PersistentState,
    runEarnings: { obolus: number; drachma: number; stater: number; ingot: number },
  ): void {
    for (let i = 0; i < this.checkpoints.length; i++) {
      if (this.collectedThisRun.includes(i)) continue;
      const cp = this.checkpoints[i];
      if (currentHeight >= cp.height) {
        this.collectedThisRun.push(i);
        addCurrency(persistent, cp.reward);
        runEarnings.obolus += cp.reward.obolus;
        runEarnings.drachma += cp.reward.drachma;
        runEarnings.stater += cp.reward.stater;

        const parts: string[] = [];
        if (cp.reward.obolus > 0) parts.push(`+${cp.reward.obolus} Obolus`);
        if (cp.reward.drachma > 0) parts.push(`+${cp.reward.drachma} Drachma`);
        if (cp.reward.stater > 0) parts.push(`+${cp.reward.stater} Stater`);
        this.notification = parts.join('  ');
        this.notificationTimer = CHECKPOINT_COLLECT_ANIMATION_DURATION;
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

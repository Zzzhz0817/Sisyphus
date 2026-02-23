import { CHECKPOINTS, MILESTONES, CHECKPOINT_COLLECT_ANIMATION_DURATION } from '../config';
import { PersistentState } from '../player/PlayerState';
import { addCurrency } from '../player/CurrencyManager';

export interface CheckpointEvent {
  index: number;
  reward: { obolus: number; drachma: number; stater: number };
}

export interface MilestoneEvent {
  height: number;
  ingotReward: number;
}

export class CheckpointSystem {
  /** Checkpoint indices collected this run */
  collectedThisRun: number[] = [];

  /** Pending notification text and timer */
  notification: string | null = null;
  notificationTimer = 0;

  /** Check if any new checkpoints have been passed */
  checkProgress(currentHeight: number, persistent: PersistentState, runEarnings: { obolus: number; drachma: number; stater: number; ingot: number }): void {
    // Check regular checkpoints
    for (let i = 0; i < CHECKPOINTS.length; i++) {
      if (this.collectedThisRun.includes(i)) continue;
      const cp = CHECKPOINTS[i];
      if (currentHeight >= cp.height) {
        this.collectedThisRun.push(i);
        addCurrency(persistent, cp.reward);
        runEarnings.obolus += cp.reward.obolus;
        runEarnings.drachma += cp.reward.drachma;
        runEarnings.stater += cp.reward.stater;

        // Build notification
        const parts: string[] = [];
        if (cp.reward.obolus > 0) parts.push(`+${cp.reward.obolus} Obolus`);
        if (cp.reward.drachma > 0) parts.push(`+${cp.reward.drachma} Drachma`);
        if (cp.reward.stater > 0) parts.push(`+${cp.reward.stater} Stater`);
        this.notification = parts.join('  ');
        this.notificationTimer = CHECKPOINT_COLLECT_ANIMATION_DURATION;
      }
    }

    // Check milestones (first-time only)
    for (const ms of MILESTONES) {
      if (currentHeight >= ms.height && !persistent.claimedMilestones.includes(ms.height)) {
        persistent.claimedMilestones.push(ms.height);
        persistent.ingot += ms.ingotReward;
        runEarnings.ingot += ms.ingotReward;

        this.notification = `Milestone! +${ms.ingotReward} Ingot`;
        this.notificationTimer = CHECKPOINT_COLLECT_ANIMATION_DURATION * 2;
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

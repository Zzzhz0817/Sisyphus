import {
  CHECKPOINT_COLLECT_ANIMATION_DURATION,
  MAP_TEMPLATES,
  MILESTONES,
  MapRewardType,
} from '../config';
import { PersistentState } from '../player/PlayerState';

export class CheckpointSystem {
  collectedThisRun: number[] = [];

  notification: string | null = null;
  notificationTimer = 0;

  private activeMapIndex = 0;

  setActiveMapIndex(index: number): void {
    this.activeMapIndex = Math.max(0, Math.min(index, MAP_TEMPLATES.length - 1));
  }

  private applyMapReward(persistent: PersistentState, rewardType: MapRewardType, rewardAmount: number): void {
    switch (rewardType) {
      case 'staminaMaxGrowth': {
        persistent.mapRewards.staminaMaxGrowth += rewardAmount;
        return;
      }
      case 'thresholdReduction': {
        persistent.mapRewards.thresholdReduction += rewardAmount;
        return;
      }
      case 'pushDistanceBonus': {
        persistent.mapRewards.pushDistanceBonus += rewardAmount;
        return;
      }
      case 'staminaCostGrowthReduction': {
        persistent.mapRewards.staminaCostGrowthReduction += rewardAmount;
        return;
      }
    }
  }

  /**
   * Inverse reward per successful push:
   * reward = baseRewardPerPush / (1 + mapPushCount)
   */
  applyPushBuff(persistent: PersistentState): void {
    const map = MAP_TEMPLATES[this.activeMapIndex];
    const pushCount = persistent.mapPushCounts[map.id] ?? 0;
    const rewardAmount = map.rewardPerPush / (1 + pushCount);

    this.applyMapReward(persistent, map.rewardType, rewardAmount);
    persistent.mapPushCounts[map.id] = pushCount + 1;
  }

  checkProgress(
    currentHeight: number,
    persistent: PersistentState,
    runEarnings: { obolus: number; drachma: number; stater: number; ingot: number },
  ): void {
    // Preserve existing first-time milestone ingot rewards.
    for (const ms of MILESTONES) {
      if (currentHeight >= ms.height && !persistent.claimedMilestones.includes(ms.height)) {
        persistent.claimedMilestones.push(ms.height);
        persistent.ingot += ms.ingotReward;
        runEarnings.ingot += ms.ingotReward;

        this.notification = `Milestone! +${ms.ingotReward} Ingot`;
        this.notificationTimer = CHECKPOINT_COLLECT_ANIMATION_DURATION * 2;
      }
    }

    if (currentHeight > persistent.highestEver) {
      persistent.highestEver = currentHeight;
    }
  }

  update(dt: number): void {
    if (this.notificationTimer > 0) {
      this.notificationTimer -= dt;
      if (this.notificationTimer <= 0) {
        this.notification = null;
      }
    }
  }

  reset(): void {
    this.collectedThisRun = [];
    this.notification = null;
    this.notificationTimer = 0;
  }
}
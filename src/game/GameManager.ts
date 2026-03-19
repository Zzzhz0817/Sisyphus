import { Renderer } from '../render/Renderer';
import { JudgmentBar } from './JudgmentBar';
import { StaminaSystem } from './StaminaSystem';
import { SlideSystem } from './SlideSystem';
import { CheckpointSystem } from './CheckpointSystem';
import { JudgmentBarUI } from '../ui/JudgmentBarUI';
import { HUD } from '../ui/HUD';
import { ShopUI } from '../ui/ShopUI';
import { LogUI } from '../ui/LogUI';
import {
  PersistentState,
  createInitialPersistentState,
  getEffectiveStats,
  EffectiveStats,
} from '../player/PlayerState';
import { PUSH_ANIMATION_DURATION, MOUNTAINS, MountainConfig, CHECKPOINT_COLLECT_ANIMATION_DURATION } from '../config';
import { lerp } from '../utils/helpers';

export type GameState = 'climbing' | 'shop';

interface RunState {
  /** True game-logic height relative to current mountain base (0 = base, mountainHeight = summit). */
  logicalHeight: number;
  /** Animated display height for rendering (chases logicalHeight with easing). */
  visualHeight: number;
  pushAnimFrom: number;
  pushAnimElapsed: number;
  isPushAnimating: boolean;
  isWedgeActive: boolean;
  runEarnings: { obolus: number; drachma: number; stater: number; ingot: number };
  peakHeight: number;
  pushSuccess: number;
  pushFail: number;
  /** Index of the mountain being climbed this run */
  currentMountainIndex: number;
}

/** Cubic ease-out: fast at start, decelerates to rest — feels like a strong push. */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export class GameManager {
  private renderer: Renderer;
  private judgmentBar: JudgmentBar;
  private judgmentBarUI: JudgmentBarUI;
  private staminaSystem: StaminaSystem;
  private slideSystem: SlideSystem;
  private checkpointSystem: CheckpointSystem;
  private hud: HUD;
  private shopUI: ShopUI;
  private logUI: LogUI;

  private persistent: PersistentState;
  private stats: EffectiveStats;
  private run: RunState;
  private gameState: GameState = 'shop';

  private lastTime = 0;
  private totalTime = 0;
  private mouseDown = false;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    this.judgmentBar = new JudgmentBar();
    this.judgmentBarUI = new JudgmentBarUI();
    this.staminaSystem = new StaminaSystem(getEffectiveStats(createInitialPersistentState()));
    this.slideSystem = new SlideSystem();
    this.checkpointSystem = new CheckpointSystem();
    this.hud = new HUD();
    this.shopUI = new ShopUI();
    this.persistent = createInitialPersistentState();
    this.logUI = new LogUI(() => this.persistent);
    this.stats = getEffectiveStats(this.persistent);
    this.run = this.createRunState(0);

    this.setupInput();
    this.showShop();
  }

  private get currentMountain(): MountainConfig {
    return MOUNTAINS[this.run.currentMountainIndex];
  }

  /** Effective push distance = base push × upgrade multiplier × mountain multiplier */
  private getEffectivePushDistance(): number {
    return this.stats.pushDistance * this.currentMountain.pushDistanceMultiplier;
  }

  private createRunState(mountainIndex: number): RunState {
    return {
      logicalHeight: 0,
      visualHeight: 0,
      pushAnimFrom: 0,
      pushAnimElapsed: 0,
      isPushAnimating: false,
      isWedgeActive: false,
      runEarnings: { obolus: 0, drachma: 0, stater: 0, ingot: 0 },
      peakHeight: 0,
      pushSuccess: 0,
      pushFail: 0,
      currentMountainIndex: mountainIndex,
    };
  }

  private setupInput(): void {
    const canvas = this.renderer.canvas;

    canvas.addEventListener('mousedown', (e) => {
      if (this.gameState !== 'climbing') return;
      if (e.button !== 0) return;
      if (this.slideSystem.state === 'sliding') return;

      this.mouseDown = true;
      this.judgmentBar.start(this.staminaSystem.getSuccessZoneWidth());

      const headPos = this.renderer.getCharacterHeadScreen(this.run.visualHeight);
      this.judgmentBarUI.show(headPos.sx, headPos.sy);
    });

    canvas.addEventListener('mouseup', (e) => {
      if (this.gameState !== 'climbing') return;
      if (e.button !== 0) return;
      if (!this.mouseDown) return;

      this.mouseDown = false;

      const successZoneWidth = this.staminaSystem.getSuccessZoneWidth();
      const result = this.judgmentBar.judge(successZoneWidth);
      this.judgmentBarUI.hide();

      // Mark attempted (starts slide timer if first attempt)
      this.slideSystem.onAttempt();

      if (result === 'success') {
        this.run.pushSuccess++;

        // Advance logical height with mountain multiplier
        this.run.logicalHeight += this.getEffectivePushDistance();
        if (this.run.logicalHeight > this.run.peakHeight) {
          this.run.peakHeight = this.run.logicalHeight;
        }

        // Start push animation
        this.run.pushAnimFrom = this.run.visualHeight;
        this.run.pushAnimElapsed = 0;
        this.run.isPushAnimating = true;

        // Consume stamina
        this.staminaSystem.consumeOnSuccess();

        // Reset slide timer
        this.slideSystem.onSuccess();

        // Check checkpoints
        this.checkpointSystem.checkProgress(
          this.run.logicalHeight,
          this.persistent,
          this.run.runEarnings,
        );

        // Check summit
        this.checkSummit();
      } else {
        this.run.pushFail++;
        // If stamina depleted and player fails, force immediate slide
        if (this.staminaSystem.getSuccessZoneWidth() <= 0) {
          this.slideSystem.forceMaxSlide();
        }
      }
    });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Debug key: Space = instant push +40 (debug)
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && this.gameState === 'climbing') {
        e.preventDefault();
        this.run.logicalHeight += 40;
        if (this.run.logicalHeight > this.run.peakHeight) {
          this.run.peakHeight = this.run.logicalHeight;
        }
        this.run.pushAnimFrom = this.run.visualHeight;
        this.run.pushAnimElapsed = 0;
        this.run.isPushAnimating = true;
        this.run.pushSuccess++;

        // Reset slide timer so debug push counts as success
        this.slideSystem.onAttempt();
        this.slideSystem.onSuccess();

        this.checkpointSystem.checkProgress(
          this.run.logicalHeight,
          this.persistent,
          this.run.runEarnings,
        );
        this.checkSummit();
      }
    });
  }

  /** Check if player has reached the mountain summit */
  private checkSummit(): void {
    const mountain = this.currentMountain;
    if (this.run.logicalHeight < mountain.height) return;

    // Clamp height to summit
    this.run.logicalHeight = mountain.height;

    // First-time summit reward
    if (!this.persistent.mountainsSummited[mountain.id]) {
      this.persistent.mountainsSummited[mountain.id] = true;
      this.persistent.ingot += mountain.summitIngotReward;
      this.run.runEarnings.ingot += mountain.summitIngotReward;

      // Unlock next mountain
      const nextIdx = mountain.id + 1;
      if (nextIdx < MOUNTAINS.length) {
        this.persistent.mountainsUnlocked[nextIdx] = true;
        this.persistent.selectedMountainIndex = nextIdx;
      }

      // Show summit notification
      this.checkpointSystem.notification = `Summit! +${mountain.summitIngotReward} Ingot`;
      this.checkpointSystem.notificationTimer = CHECKPOINT_COLLECT_ANIMATION_DURATION * 3;
    }

    // End run → shop (default to next mountain if available)
    this.endRun();
  }

  private showShop(): void {
    this.gameState = 'shop';
    this.shopUI.show(this.persistent, this.run.runEarnings, () => {
      this.startNewRun();
    });
  }

  private startNewRun(): void {
    this.persistent.totalRuns++;
    this.stats = getEffectiveStats(this.persistent);

    const mountainIdx = this.persistent.selectedMountainIndex;
    const mountain = MOUNTAINS[mountainIdx];

    this.run = this.createRunState(mountainIdx);
    this.staminaSystem.reset(this.stats);
    this.slideSystem.reset();
    this.checkpointSystem.reset();
    this.checkpointSystem.setCheckpoints(mountain.checkpoints);
    this.judgmentBarUI.hide();
    this.mouseDown = false;

    // Update renderer for new mountain
    this.renderer.setMountain(mountain);

    this.shopUI.hide();
    this.gameState = 'climbing';

    // Snap camera to start
    const worldPos = this.renderer.mountain.getWorldPosition(0);
    this.renderer.camera.setTarget(worldPos.x, worldPos.y, 0);
    this.renderer.camera.snap();

    // Update HUD mountain name
    this.hud.setMountainName(mountain.name);
  }

  private endRun(): void {
    this.judgmentBarUI.hide();
    this.mouseDown = false;
    this.judgmentBar.active = false;

    if (this.run.peakHeight > this.persistent.highestEver) {
      this.persistent.highestEver = this.run.peakHeight;
    }

    this.persistent.runHistory.push({
      runNumber: this.persistent.totalRuns,
      peakHeight: this.run.peakHeight,
      pushSuccess: this.run.pushSuccess,
      pushFail: this.run.pushFail,
      qteAttempted: 0,
      qteSuccess: 0,
      earnings: { ...this.run.runEarnings },
    });

    this.showShop();
  }

  start(): void {
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  private loop(timestamp: number): void {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;
    this.totalTime += dt;

    if (this.gameState === 'climbing') {
      this.updateClimbing(dt);
    }

    requestAnimationFrame((t) => this.loop(t));
  }

  private updateClimbing(dt: number): void {
    // 1. Stamina regen
    this.staminaSystem.update(dt);

    // 2. Judgment bar pointer
    if (this.judgmentBar.active) {
      this.judgmentBar.update(dt);

      const headPos = this.renderer.getCharacterHeadScreen(this.run.visualHeight);
      this.judgmentBarUI.show(headPos.sx, headPos.sy);
      this.judgmentBarUI.update(
        this.staminaSystem.getSuccessZoneWidth(),
        this.judgmentBar.pointerPosition,
        this.judgmentBar.successZoneOffsetRatio,
      );
    }

    // 3. Slide system (affects logical height)
    const slideDelta = this.slideSystem.update(dt, this.run.isWedgeActive);
    if (slideDelta !== 0) {
      this.run.logicalHeight = Math.max(0, this.run.logicalHeight + slideDelta);
      this.run.visualHeight = this.run.logicalHeight;
      this.run.isPushAnimating = false;
    }

    // 4. Push animation (ease-out cubic)
    if (this.run.isPushAnimating) {
      this.run.pushAnimElapsed += dt;
      const t = Math.min(this.run.pushAnimElapsed / PUSH_ANIMATION_DURATION, 1);
      this.run.visualHeight = lerp(
        this.run.pushAnimFrom,
        this.run.logicalHeight,
        easeOutCubic(t),
      );
      if (t >= 1) {
        this.run.isPushAnimating = false;
        this.run.visualHeight = this.run.logicalHeight;
      }
    }

    // 5. End-of-run check: sliding and height reached zero (mountain base)
    if (this.slideSystem.state === 'sliding' && this.run.logicalHeight <= 0) {
      this.run.logicalHeight = 0;
      this.run.visualHeight = 0;
      this.endRun();
      return;
    }

    // 6. Camera follows visual height
    this.renderer.camera.update(dt);

    // 7. Checkpoint notifications
    this.checkpointSystem.update(dt);

    // 8. HUD
    this.hud.update(this.persistent, this.run.visualHeight);

    if (this.checkpointSystem.notification) {
      this.hud.showNotification(this.checkpointSystem.notification);
    } else {
      this.hud.hideNotification();
    }

    // 9. Render
    this.renderer.render(
      this.run.visualHeight,
      this.slideSystem.state,
      this.totalTime,
      this.checkpointSystem.getCheckpoints(),
      this.checkpointSystem.collectedThisRun,
    );
  }
}

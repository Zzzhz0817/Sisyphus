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
import { PUSH_ANIMATION_DURATION } from '../config';
import { lerp } from '../utils/helpers';

export type GameState = 'climbing' | 'shop';

interface RunState {
  /** True game-logic height used for checkpoint detection, slide math, etc. */
  logicalHeight: number;
  /** Animated display height for rendering (chases logicalHeight with easing). */
  visualHeight: number;
  /** The visual height at the moment a push animation started. */
  pushAnimFrom: number;
  /** Seconds elapsed since the current push animation started. */
  pushAnimElapsed: number;
  /** Whether a push animation is currently in progress. */
  isPushAnimating: boolean;
  isWedgeActive: boolean;
  runEarnings: { obolus: number; drachma: number; stater: number; ingot: number };
  /** Peak height reached this run (logicalHeight can drop during slide). */
  peakHeight: number;
  /** Number of successful judgment presses this run. */
  pushSuccess: number;
  /** Number of failed judgment presses this run. */
  pushFail: number;
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
    this.run = this.createRunState();

    this.setupInput();
    this.showShop();
  }

  private createRunState(): RunState {
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
    };
  }

  private setupInput(): void {
    const canvas = this.renderer.canvas;

    canvas.addEventListener('mousedown', (e) => {
      if (this.gameState !== 'climbing') return;
      if (e.button !== 0) return;
      if (this.slideSystem.state === 'sliding') return;

      this.mouseDown = true;
      // Pass current zone width so start() can apply the 1/3 constraint
      this.judgmentBar.start(this.staminaSystem.getSuccessZoneWidth());

      // Show judgment bar at the current visual character position
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

        // Advance logical height immediately (game logic)
        this.run.logicalHeight += this.stats.pushDistance;
        if (this.run.logicalHeight > this.run.peakHeight) {
          this.run.peakHeight = this.run.logicalHeight;
        }

        // Start push animation: from current visual position to new logical target
        this.run.pushAnimFrom = this.run.visualHeight;
        this.run.pushAnimElapsed = 0;
        this.run.isPushAnimating = true;

        // Consume stamina
        this.staminaSystem.consumeOnSuccess();

        // Reset slide timer
        this.slideSystem.onSuccess();

        // Check checkpoints (use logical height for accuracy)
        this.checkpointSystem.checkProgress(
          this.run.logicalHeight,
          this.persistent,
          this.run.runEarnings,
        );
      } else {
        this.run.pushFail++;
      }
    });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
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

    this.run = this.createRunState();
    this.staminaSystem.reset(this.stats);
    this.slideSystem.reset();
    this.checkpointSystem.reset();
    this.judgmentBarUI.hide();
    this.mouseDown = false;

    this.shopUI.hide();
    this.gameState = 'climbing';

    // Snap camera to start
    const worldPos = this.renderer.mountain.getWorldPosition(0);
    this.renderer.camera.setTarget(worldPos.x, worldPos.y, 0);
    this.renderer.camera.snap();
  }

  private endRun(): void {
    this.judgmentBarUI.hide();
    this.mouseDown = false;
    this.judgmentBar.active = false;

    if (this.run.peakHeight > this.persistent.highestEver) {
      this.persistent.highestEver = this.run.peakHeight;
    }

    // Record run for analytics log
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

    // 3a. Stamina-depletion check: force immediate max-speed slide
    if (
      this.slideSystem.hasAttempted &&
      this.slideSystem.state !== 'sliding' &&
      !this.mouseDown &&
      this.staminaSystem.getSuccessZoneWidth() <= 0
    ) {
      this.slideSystem.forceMaxSlide();
    }

    // 3b. Slide system (affects logical height)
    const slideDelta = this.slideSystem.update(dt, this.run.isWedgeActive);
    if (slideDelta !== 0) {
      this.run.logicalHeight = Math.max(0, this.run.logicalHeight + slideDelta);
      // During slide, visual follows logical directly (no easing — continuous motion)
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

    // 5. End-of-run check: sliding and height reached zero
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

    // 8. HUD — show visual height (matches what player sees)
    this.hud.update(this.persistent, this.run.visualHeight);

    if (this.checkpointSystem.notification) {
      this.hud.showNotification(this.checkpointSystem.notification);
    } else {
      this.hud.hideNotification();
    }

    // 9. Render using visual height
    this.renderer.render(
      this.run.visualHeight,
      this.slideSystem.state,
      this.totalTime,
      this.checkpointSystem.collectedThisRun,
    );
  }
}

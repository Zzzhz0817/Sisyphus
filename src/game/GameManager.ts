import { Renderer } from '../render/Renderer';
import { JudgmentBar } from './JudgmentBar';
import { StaminaSystem } from './StaminaSystem';
import { SlideSystem } from './SlideSystem';
import { CheckpointSystem } from './CheckpointSystem';
import { JudgmentBarUI } from '../ui/JudgmentBarUI';
import { HUD } from '../ui/HUD';
import { LogUI } from '../ui/LogUI';
import { MapSelectUI } from '../ui/MapSelectUI';
import { RunEndUI } from '../ui/RunEndUI';
import {
  PersistentState,
  createInitialPersistentState,
  getEffectiveStats,
  EffectiveStats,
} from '../player/PlayerState';
import {
  PUSH_ANIMATION_DURATION,
  JUDGMENT_HOLD_SUCCESS_TIME,
  JUDGMENT_HOLD_BAR_MULTIPLIER,
} from '../config';
import { lerp } from '../utils/helpers';

export type GameState = 'climbing' | 'menu';

interface RunState {
  logicalHeight: number;
  visualHeight: number;
  pushAnimFrom: number;
  pushAnimElapsed: number;
  isPushAnimating: boolean;
  isWedgeActive: boolean;
  runEarnings: { obolus: number; drachma: number; stater: number; ingot: number };
  peakHeight: number;
  pushSuccess: number;
  pushFail: number;
}

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
  private logUI: LogUI;
  private mapSelectUI: MapSelectUI;
  private runEndUI: RunEndUI;

  private persistent: PersistentState;
  private stats: EffectiveStats;
  private run: RunState;
  private gameState: GameState = 'menu';

  private lastTime = 0;
  private totalTime = 0;
  private mouseDown = false;
  private activeMouseButton: 0 | 2 | null = null;
  private lastUsedMouseButton: 0 | 2 | null = null;
  private selectedMapIndex = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    this.judgmentBar = new JudgmentBar();
    this.judgmentBarUI = new JudgmentBarUI();
    this.staminaSystem = new StaminaSystem(getEffectiveStats(createInitialPersistentState()));
    this.slideSystem = new SlideSystem();
    this.checkpointSystem = new CheckpointSystem();
    this.hud = new HUD();
    this.mapSelectUI = new MapSelectUI();
    this.runEndUI = new RunEndUI();
    this.persistent = createInitialPersistentState();
    this.logUI = new LogUI(() => this.persistent);
    this.stats = getEffectiveStats(this.persistent);
    this.run = this.createRunState();

    this.setupInput();
    this.showMapSelect();
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

  private showMapSelect(): void {
    this.gameState = 'menu';
    this.runEndUI.hide();
    this.mapSelectUI.show((index) => {
      this.selectedMapIndex = index;
      this.mapSelectUI.hide();
      this.startNewRun();
    });
  }

  private showRunEndMenu(): void {
    this.gameState = 'menu';
    this.runEndUI.show(
      this.run.peakHeight,
      () => {
        this.runEndUI.hide();
        this.startNewRun();
      },
      () => {
        this.runEndUI.hide();
        this.showMapSelect();
      },
    );
  }

  private getCurrentHoldRange(): number {
    return JUDGMENT_HOLD_SUCCESS_TIME * JUDGMENT_HOLD_BAR_MULTIPLIER * this.staminaSystem.getRatio();
  }

  private setupInput(): void {
    const canvas = this.renderer.canvas;

    canvas.addEventListener('mousedown', (e) => {
      if (this.gameState !== 'climbing') return;
      if (e.button !== 0 && e.button !== 2) return;
      if (this.slideSystem.state === 'sliding') return;
      if (this.mouseDown) return;
      if (this.lastUsedMouseButton === e.button) return;

      this.mouseDown = true;
      this.activeMouseButton = e.button as 0 | 2;
      this.judgmentBar.start(this.getCurrentHoldRange(), this.stats.holdSuccessTime);

      const headPos = this.renderer.getCharacterHeadScreen(this.run.visualHeight);
      this.judgmentBarUI.show(headPos.sx, headPos.sy);
    });

    canvas.addEventListener('mouseup', (e) => {
      if (this.gameState !== 'climbing') return;
      if (e.button !== 0 && e.button !== 2) return;
      if (!this.mouseDown) return;
      if (this.activeMouseButton !== e.button) return;

      this.mouseDown = false;
      this.activeMouseButton = null;
      this.lastUsedMouseButton = e.button as 0 | 2;

      const result = this.judgmentBar.judge();
      this.judgmentBarUI.hide();

      this.slideSystem.onAttempt();

      if (result === 'success') {
        this.run.pushSuccess++;

        this.run.logicalHeight += this.stats.pushDistance;
        if (this.run.logicalHeight > this.run.peakHeight) {
          this.run.peakHeight = this.run.logicalHeight;
        }

        this.run.pushAnimFrom = this.run.visualHeight;
        this.run.pushAnimElapsed = 0;
        this.run.isPushAnimating = true;

        this.staminaSystem.consumeOnSuccess();
        this.slideSystem.onSuccess();

        this.checkpointSystem.applyPushBuff(this.persistent);

        this.checkpointSystem.checkProgress(
          this.run.logicalHeight,
          this.persistent,
          this.run.runEarnings,
        );

        this.stats = getEffectiveStats(this.persistent);
        this.staminaSystem.updateStats(this.stats);
      } else {
        this.run.pushFail++;
      }
    });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private startNewRun(): void {
    this.persistent.totalRuns++;
    this.stats = getEffectiveStats(this.persistent);

    this.run = this.createRunState();
    this.staminaSystem.reset(this.stats);
    this.slideSystem.reset();
    this.checkpointSystem.setActiveMapIndex(this.selectedMapIndex);
    this.checkpointSystem.reset();
    this.judgmentBarUI.hide();
    this.mouseDown = false;
    this.activeMouseButton = null;
    this.lastUsedMouseButton = null;

    this.mapSelectUI.hide();
    this.runEndUI.hide();
    this.gameState = 'climbing';

    const worldPos = this.renderer.mountain.getWorldPosition(0);
    this.renderer.camera.setTarget(worldPos.x, worldPos.y, 0);
    this.renderer.camera.snap();
  }

  private endRun(): void {
    this.judgmentBarUI.hide();
    this.mouseDown = false;
    this.activeMouseButton = null;
    this.lastUsedMouseButton = null;
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

    // Refill to full stamina when back at low ground.
    this.stats = getEffectiveStats(this.persistent);
    this.staminaSystem.reset(this.stats);

    this.showRunEndMenu();
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
    this.staminaSystem.update(dt);

    if (this.judgmentBar.active) {
      this.judgmentBar.update(dt);

      const headPos = this.renderer.getCharacterHeadScreen(this.run.visualHeight);
      this.judgmentBarUI.show(headPos.sx, headPos.sy);
      this.judgmentBarUI.update(
        this.judgmentBar.pointerPosition,
        this.judgmentBar.barRatio,
        this.judgmentBar.thresholdRatio,
      );
    }

    const slideDelta = this.slideSystem.update(dt, this.run.isWedgeActive);
    if (slideDelta !== 0) {
      this.run.logicalHeight = Math.max(0, this.run.logicalHeight + slideDelta);
      this.run.visualHeight = this.run.logicalHeight;
      this.run.isPushAnimating = false;
    }

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

    if (this.slideSystem.state === 'sliding' && this.run.logicalHeight <= 0) {
      this.run.logicalHeight = 0;
      this.run.visualHeight = 0;
      this.endRun();
      return;
    }

    this.renderer.camera.update(dt);

    this.checkpointSystem.update(dt);

    this.hud.update(this.persistent, this.run.visualHeight);

    if (this.checkpointSystem.notification) {
      this.hud.showNotification(this.checkpointSystem.notification);
    } else {
      this.hud.hideNotification();
    }

    this.renderer.render(
      this.run.visualHeight,
      this.slideSystem.state,
      this.totalTime,
      this.checkpointSystem.collectedThisRun,
    );
  }
}
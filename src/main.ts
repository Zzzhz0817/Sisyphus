import { GameManager } from './game/GameManager';

// On mobile builds, add class for CSS overrides and lock orientation
if (__MOBILE__) {
  document.documentElement.classList.add('mobile');
  (screen.orientation as any)?.lock?.('landscape').catch(() => {
    // Silently fail — CSS rotation fallback handles this
  });
}

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const game = new GameManager(canvas);
game.start();

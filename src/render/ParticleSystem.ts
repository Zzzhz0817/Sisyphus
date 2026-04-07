import { Camera } from './Camera';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export class ParticleSystem {
  particles: Particle[] = [];

  emit(x: number, y: number, vx: number, vy: number, color: string, size: number, count: number, life: number = 0.5) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x,
        y,
        vx: vx + (Math.random() - 0.5) * 50,
        vy: vy + (Math.random() - 0.5) * 50,
        life: life * (0.8 + Math.random() * 0.4),
        maxLife: life,
        color,
        size: size * (0.8 + Math.random() * 0.4),
      });
    }
  }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      // Add gravity (positive Y is downwards in world space)
      p.vy += 800 * dt;
      // Add slight friction to horizontal movement
      p.vx *= Math.pow(0.5, dt);
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, camera: Camera, canvasWidth: number, canvasHeight: number) {
    for (const p of this.particles) {
      const screen = camera.worldToScreen(p.x, p.y, canvasWidth, canvasHeight);
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(screen.sx, screen.sy, p.size * camera.zoom, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
  }
}

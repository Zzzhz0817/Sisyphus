import {
  CHARACTER_COLOR,
  BOULDER_COLOR,
  BOULDER_HIGHLIGHT_COLOR,
  BOULDER_RADIUS,
  CHARACTER_HEIGHT,
  MOUNTAIN_SLOPE_ANGLE,
} from '../config';
import { degToRad } from '../utils/helpers';
import { Camera } from './Camera';

export type SlideVisualState = 'normal' | 'sweating' | 'sliding';

export class CharacterRenderer {
  private slopeAngleRad: number;
  private visualSlopeAngleRad = 0;

  constructor() {
    this.slopeAngleRad = degToRad(MOUNTAIN_SLOPE_ANGLE);
  }

  render(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    worldX: number,
    worldY: number,
    canvasWidth: number,
    canvasHeight: number,
    slideState: SlideVisualState,
    time: number,
    terrainSlopeAngleRad: number,
  ): void {
    const screen = camera.worldToScreen(worldX, worldY, canvasWidth, canvasHeight);
    const scale = camera.zoom;
    const targetSlope = Number.isFinite(terrainSlopeAngleRad) ? terrainSlopeAngleRad : this.slopeAngleRad;
    this.visualSlopeAngleRad += (targetSlope - this.visualSlopeAngleRad) * 0.25;
    const slopeAngleRad = this.visualSlopeAngleRad;

    ctx.save();
    ctx.translate(screen.sx, screen.sy);

    // Rotate to align with slope
    ctx.rotate(-slopeAngleRad);

    const charH = CHARACTER_HEIGHT * scale;
    const boulderR = BOULDER_RADIUS * scale;

    // --- Draw Boulder ---
    // Calculate boulder rotation based on world position (rolling effect)
    const rotationAngle = worldX / BOULDER_RADIUS;

    const boulderCenterX = charH * 0.6; // Slightly more forward
    const boulderCenterY = -(boulderR + charH * 0.05);

    ctx.save();
    ctx.translate(boulderCenterX, boulderCenterY);
    ctx.rotate(rotationAngle);

    // Boulder 3D Body (Radial Gradient)
    const boulderGradient = ctx.createRadialGradient(
      -boulderR * 0.3, -boulderR * 0.3, boulderR * 0.1, // highlight center
      0, 0, boulderR // outer edge
    );
    boulderGradient.addColorStop(0, BOULDER_HIGHLIGHT_COLOR);
    boulderGradient.addColorStop(0.7, BOULDER_COLOR);
    boulderGradient.addColorStop(1, '#37474F'); // Dark shadow edge

    ctx.fillStyle = boulderGradient;
    ctx.beginPath();
    ctx.arc(0, 0, boulderR, 0, Math.PI * 2);
    ctx.fill();

    // Boulder Craters / Details
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; // Dark subtle craters
    const craters = [
      { x: boulderR * 0.4, y: boulderR * 0.2, r: boulderR * 0.25 },
      { x: -boulderR * 0.3, y: -boulderR * 0.4, r: boulderR * 0.15 },
      { x: -boulderR * 0.5, y: boulderR * 0.3, r: boulderR * 0.2 },
      { x: boulderR * 0.1, y: -boulderR * 0.6, r: boulderR * 0.12 }
    ];
    craters.forEach(c => {
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fill();
      // Highlight inside crater
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1 * scale;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r * 0.8, Math.PI * 0.5, Math.PI * 1.5);
      ctx.stroke();
    });

    ctx.restore(); // End boulder rotation

    // --- Draw Stick Figure (Procedural Animation) ---
    const isSliding = slideState === 'sliding';
    const isSweating = slideState === 'sweating';
    
    let legPhase = 0;
    const legAmp = charH * 0.18;
    
    if (isSliding) {
      legPhase = time * 20;
    } else {
      legPhase = worldX * 0.5;
    }
    
    // Body tilt & Bobbing
    let bodyTilt = degToRad(20); 
    if (isSliding) bodyTilt = degToRad(-15); 
    if (isSweating) bodyTilt = degToRad(10); 

    // Add breathing/struggling bob to the hip
    const bob = isSliding ? 0 : Math.sin(time * 8) * charH * 0.05;

    const headRadius = charH * 0.15;
    const bodyLength = charH * 0.45;
    
    const hipY = -charH * 0.35 + bob;
    // Keep hip fixed horizontally relative to character origin
    const hipX = 0;

    // Use a slight gradient for the character to make it pop
    const charGradient = ctx.createLinearGradient(0, -charH, 0, 0);
    charGradient.addColorStop(0, '#424242'); // Slightly lighter top
    charGradient.addColorStop(1, CHARACTER_COLOR);

    ctx.strokeStyle = charGradient;
    ctx.fillStyle = charGradient;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Legs
    ctx.lineWidth = 3.5 * scale;
    ctx.beginPath();
    // Left leg
    const leftLegX = Math.sin(legPhase) * legAmp;
    const leftLegY = Math.max(0, Math.cos(legPhase)) * legAmp * 0.5; // Only lift when stepping forward
    
    // Knee joint calculation (simple IK approximation)
    const kneeLeftX = hipX + leftLegX * 0.5 + charH * 0.05; // Reduced forward knee bend to keep legs under body
    const kneeLeftY = hipY * 0.5 - leftLegY;

    // Start drawing leg from slightly below the very top of the hip to avoid "butt sticking out"
    ctx.moveTo(hipX, hipY + charH * 0.02);
    ctx.quadraticCurveTo(kneeLeftX, kneeLeftY, hipX + leftLegX, 0 - leftLegY); // Straightened foot position slightly
    ctx.stroke();

    ctx.beginPath();
    // Right leg
    const rightLegX = Math.sin(legPhase + Math.PI) * legAmp;
    const rightLegY = Math.max(0, Math.cos(legPhase + Math.PI)) * legAmp * 0.5;
    
    const kneeRightX = hipX + rightLegX * 0.5 + charH * 0.05;
    const kneeRightY = hipY * 0.5 - rightLegY;

    // Start drawing leg from slightly below the very top of the hip
    ctx.moveTo(hipX, hipY + charH * 0.02);
    ctx.quadraticCurveTo(kneeRightX, kneeRightY, hipX + rightLegX, 0 - rightLegY);
    ctx.stroke();

    // Torso & Head
    ctx.save();
    ctx.translate(hipX, hipY);
    ctx.rotate(bodyTilt);

    // Torso
    ctx.lineWidth = 4.5 * scale;
    ctx.beginPath();
    // Start spine exactly at 0,0 (which is hipX, hipY after translation)
    // and draw straight up to -bodyLength.
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -bodyLength);
    ctx.stroke();

    // Head
    ctx.beginPath();
    ctx.arc(0, -bodyLength - headRadius * 0.8, headRadius, 0, Math.PI * 2);
    ctx.fill();

    // Arms
    ctx.lineWidth = 3.0 * scale;
    const shoulderY = -bodyLength * 0.85;
    ctx.beginPath();
    ctx.moveTo(0, shoulderY);
    
    if (isSliding) {
        // Flailing arms
        const armWave = Math.sin(time * 30) * 0.3;
        ctx.lineTo(charH * 0.3, shoulderY - charH * 0.2 + armWave * charH);
    } else {
        // Pushing arms (bent elbows)
        const elbowX = charH * 0.15;
        const elbowY = shoulderY + charH * 0.1;
        const handX = charH * 0.35;
        const handY = shoulderY - charH * 0.05;
        
        ctx.lineTo(elbowX, elbowY);
        ctx.lineTo(handX, handY);
    }
    ctx.stroke();

    // Sweat (Attached to head)
    if (isSweating || isSliding) {
        const sweatScale = isSliding ? 1.2 : 0.8;
        ctx.fillStyle = '#81D4FA'; 
        ctx.strokeStyle = '#0277BD'; // Dark blue outline
        ctx.lineWidth = 1 * scale;
        
        const sweatX = -headRadius * 1.1; 
        const sweatY = -bodyLength - headRadius * 0.5;
        
        const dropY = (time * 4 % 1) * charH * 0.2;
        
        ctx.beginPath();
        const dropSize = 1.5 * scale * sweatScale;
        ctx.arc(sweatX, sweatY + dropY, dropSize, 0, Math.PI); 
        ctx.lineTo(sweatX, sweatY + dropY - dropSize * 2.5); 
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    ctx.restore(); // End body rotation

    ctx.restore(); // End slope rotation
  }

  getHeadScreenPosition(
    camera: Camera,
    worldX: number,
    worldY: number,
    canvasWidth: number,
    canvasHeight: number,
    terrainSlopeAngleRad: number,
  ): { sx: number; sy: number } {
    const screen = camera.worldToScreen(worldX, worldY, canvasWidth, canvasHeight);
    const charH = CHARACTER_HEIGHT * camera.zoom;
    const slopeAngleRad = Number.isFinite(terrainSlopeAngleRad) ? terrainSlopeAngleRad : this.slopeAngleRad;
    return {
      sx: screen.sx - Math.sin(slopeAngleRad) * charH * 0.9,
      sy: screen.sy - Math.cos(slopeAngleRad) * charH * 0.9,
    };
  }
}

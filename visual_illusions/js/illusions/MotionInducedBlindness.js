import { IllusionBase } from './IllusionBase.js';


export class MotionInducedBlindness extends IllusionBase {
  constructor(width, height) {
    super(width, height);
    this.gridRotation = 0;

    this.params = {
      gridSpacing: 30,
      targetDistance: 100,
      targetSize: 8,
      haloMultiplier: 2.0
    };
  }

  getCustomParams() {
    return [
      {
        id: 'gridSpacing',
        label: 'Grid Spacing (px)',
        type: 'range',
        min: 15,
        max: 80,
        step: 5,
        value: this.params.gridSpacing
      },
      {
        id: 'targetDistance',
        label: 'Target Spread (px)',
        type: 'range',
        min: 50,
        max: 200,
        step: 10,
        value: this.params.targetDistance
      },
      {
        id: 'targetSize',
        label: 'Target Size (px)',
        type: 'range',
        min: 4,
        max: 20,
        step: 2,
        value: this.params.targetSize
      },
      {
        id: 'haloMultiplier',
        label: 'Black Halo Size (x)',
        type: 'range',
        min: 1.0,
        max: 4.0,
        step: 0.5,
        value: this.params.haloMultiplier
      }
    ];
  }

  onParamsChanged(newParams) {
    this.params = { ...this.params, ...newParams };
  }

  update(deltaTime, config) {
    this.gridRotation += deltaTime * 0.0005 * config.speedMultiplier;
  }

  render(ctx) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.width, this.height);

    const cx = this.width / 2;
    const cy = this.height / 2;

    
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.gridRotation);

    ctx.strokeStyle = '#0055ff';
    ctx.lineWidth = 4;
    ctx.beginPath();

    
    
    const maxRadius = Math.ceil(Math.sqrt(cx * cx + cy * cy));
    const spacing = this.params.gridSpacing;

    
    for (let i = -maxRadius; i <= maxRadius; i += spacing) {
      
      ctx.moveTo(i, -maxRadius);
      ctx.lineTo(i, maxRadius);
      
      ctx.moveTo(-maxRadius, i);
      ctx.lineTo(maxRadius, i);
    }

    ctx.stroke();
    ctx.restore();

    
    const targets = [];
    
    const angles = [-Math.PI / 2, Math.PI / 6, (5 * Math.PI) / 6];

    for (const angle of angles) {
      targets.push({
        x: cx + Math.cos(angle) * this.params.targetDistance,
        y: cy + Math.sin(angle) * this.params.targetDistance
      });
    }

    
    ctx.fillStyle = '#000';
    const haloRadius = this.params.targetSize * this.params.haloMultiplier;

    ctx.beginPath();
    for (const pos of targets) {
      ctx.moveTo(pos.x, pos.y);
      ctx.arc(pos.x, pos.y, haloRadius, 0, Math.PI * 2);
    }
    ctx.fill();

    
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    for (const pos of targets) {
      ctx.moveTo(pos.x, pos.y);
      ctx.arc(pos.x, pos.y, this.params.targetSize, 0, Math.PI * 2);
    }
    ctx.fill();

    
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  getExplanationText() {
    return `<b>Motion Induced Blindness:</b> Stare strictly at the center red dot. The static yellow dots will randomly vanish from your perception as your visual cortex prioritizes the global moving field.<br><br><b>DVS Link:</b> Switch to DVS view. Event-based sensors naturally replicate this biological "blindness" to static objects. The rotating grid continuously fires ON/OFF events, while the perfectly static yellow dots generate zero luminance change over time, effectively disappearing from the data stream.`;
  }
}

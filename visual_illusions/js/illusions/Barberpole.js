import { IllusionBase } from './IllusionBase.js';


export class Barberpole extends IllusionBase {
  constructor(width, height) {
    super(width, height);
    this.offsetY = 0;

    this.params = {
      apertureShape: 'Vertical',
      showTrueMotion: false,
      stripeSpacing: 40,
      lineWidth: 20
    };
  }

  getCustomParams() {
    return [
      {
        id: 'apertureShape',
        label: 'Aperture Shape',
        type: 'select',
        options: ['Vertical', 'Horizontal', 'Square', 'Circle'],
        value: this.params.apertureShape
      },
      {
        id: 'showTrueMotion',
        label: 'Show True Motion (Unmasked)',
        type: 'checkbox',
        value: this.params.showTrueMotion
      },
      {
        id: 'stripeSpacing',
        label: 'Stripe Spacing (px)',
        type: 'range',
        min: 20,
        max: 100,
        step: 10,
        value: this.params.stripeSpacing
      },
      {
        id: 'lineWidth',
        label: 'Line Width (px)',
        type: 'range',
        min: 5,
        max: 40,
        step: 5,
        value: this.params.lineWidth
      }
    ];
  }

  onParamsChanged(newParams) {
    this.params = { ...this.params, ...newParams };
  }

  update(deltaTime, config) {
    
    this.offsetY += deltaTime * 0.1 * config.speedMultiplier;

    
    if (this.offsetY > this.params.stripeSpacing) {
      this.offsetY = this.offsetY % this.params.stripeSpacing;
    }
  }

  #drawStripes(ctx) {
    ctx.strokeStyle = '#000';
    ctx.lineWidth = this.params.lineWidth;
    ctx.lineCap = 'square';

    
    const spacing = this.params.stripeSpacing;
    for (let i = -this.height; i < this.height * 2; i += spacing) {
      ctx.beginPath();
      
      ctx.moveTo(0, i + this.offsetY);
      ctx.lineTo(this.width, i + this.width + this.offsetY);
      ctx.stroke();
    }
  }

  render(ctx) {
    
    ctx.fillStyle = '#444';
    ctx.fillRect(0, 0, this.width, this.height);

    const cx = this.width / 2;
    const cy = this.height / 2;

    
    if (this.params.showTrueMotion) {
      ctx.save();
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, this.width, this.height);
      this.#drawStripes(ctx);
      ctx.restore();
    }

    ctx.save();
    ctx.beginPath();

    
    switch (this.params.apertureShape) {
      case 'Horizontal':
        ctx.rect(cx - 200, cy - 50, 400, 100);
        break;
      case 'Square':
        ctx.rect(cx - 150, cy - 150, 300, 300);
        break;
      case 'Circle':
        ctx.arc(cx, cy, 150, 0, Math.PI * 2);
        break;
      case 'Vertical':
      default:
        ctx.rect(cx - 50, cy - 200, 100, 400);
        break;
    }

    
    ctx.clip();

    
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, this.width, this.height);

    
    this.#drawStripes(ctx);

    ctx.restore();

    
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 10;
    ctx.stroke();
  }

  getExplanationText() {
    return `<b>The Aperture Problem:</b> Change the Aperture Shape. The brain tracks where the lines intersect the border. A vertical window forces intersection points to travel Down. A horizontal window forces them Left. Enable "Show True Motion" to prove the lines are actually sliding diagonally down-and-left.<br><br><b>DVS Link:</b> Event cameras strictly trigger on local 1D luminance changes orthogonal to the edge. A single DVS pixel cluster cannot determine true 2D motion velocity along a uniform straight edge (this is the Aperture Problem). It requires higher-level optical flow clustering or corner-tracking to resolve the true motion vector.`;
  }
}

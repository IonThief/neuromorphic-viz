import { IllusionBase } from './IllusionBase.js';


export class Troxler extends IllusionBase {
  constructor(width, height) {
    super(width, height);

    this.params = {
      autoFade: false, 
      fadeRate: 0.5,
      blurRadius: 15
    };

    this.currentAlpha = 1.0;
  }

  getCustomParams() {
    return [
      {
        id: 'autoFade',
        label: 'Enable Auto Fade',
        type: 'checkbox',
        value: this.params.autoFade
      },
      {
        id: 'fadeRate',
        label: 'Simulated Fade Rate',
        type: 'range',
        min: 0.1,
        max: 2.0,
        step: 0.1,
        value: this.params.fadeRate
      },
      {
        id: 'blurRadius',
        label: 'Peripheral Blur (px)',
        type: 'range',
        min: 0,
        max: 30,
        step: 1,
        value: this.params.blurRadius
      }
    ];
  }

  onParamsChanged(newParams) {
    this.params = { ...this.params, ...newParams };

    
    if (!this.params.autoFade) {
      this.currentAlpha = 1.0;
    }
  }

  update(deltaTime, config) {
    if (this.params.autoFade) {
      this.currentAlpha = Math.max(
        0,
        this.currentAlpha - this.params.fadeRate * deltaTime * 0.001
      );
    }
  }

  onUserInteraction() {
    this.currentAlpha = 1.0;
  }

  render(ctx) {
    
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, this.width, this.height);

    const cx = this.width / 2;
    const cy = this.height / 2;

    ctx.save();

    
    ctx.globalAlpha = this.currentAlpha;
    ctx.filter = `blur(${this.params.blurRadius}px)`;
    const gradient = ctx.createRadialGradient(cx, cy, 50, cx, cy, 200);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.5, 'rgba(255, 100, 100, 0.8)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    
    ctx.globalAlpha = 1.0;
    ctx.filter = 'none';

    ctx.fillStyle = '#fff';
    ctx.fillRect(cx - 10, cy - 2, 20, 4);
    ctx.fillRect(cx - 2, cy - 10, 4, 20);

    ctx.restore();
  }

  getExplanationText() {
    return `<b>Troxler Fading:</b> Stare perfectly still at the cross. The red ring will simulate neural adaptation by fading away. Move your mouse or click to simulate a saccade (eye jump).<br><br><b>DVS Link:</b> A DVS pixel ignores static stimuli just like your peripheral vision. It generates zero bandwidth until an edge moves. Saccades provide the necessary change over time to refresh the visual field.`;
  }
}

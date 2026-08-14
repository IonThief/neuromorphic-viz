import { IllusionBase } from './IllusionBase.js';


export class RotatingSpiral extends IllusionBase {
  constructor(width, height) {
    super(width, height);
    this.angle = 0;

    this.params = {
      isPaused: false,
      reverseDirection: false,
      lineWidth: 15,
      armSpacing: 30 
    };
  }

  getCustomParams() {
    return [
      {
        id: 'isPaused',
        label: 'Pause Rotation',
        type: 'checkbox',
        value: this.params.isPaused
      },
      {
        id: 'reverseDirection',
        label: 'Reverse (Contract/Expand)',
        type: 'checkbox',
        value: this.params.reverseDirection
      },
      {
        id: 'lineWidth',
        label: 'Line Width (px)',
        type: 'range',
        min: 2,
        max: 40,
        step: 2,
        value: this.params.lineWidth
      },
      {
        id: 'armSpacing',
        label: 'Arm Spacing (px)',
        type: 'range',
        min: 10,
        max: 100,
        step: 5,
        value: this.params.armSpacing
      }
    ];
  }

  onParamsChanged(newParams) {
    this.params = { ...this.params, ...newParams };
  }

  update(deltaTime, config) {
    if (!this.params.isPaused) {
      
      const direction = this.params.reverseDirection ? -1 : 1;
      this.angle += direction * deltaTime * 0.002 * config.speedMultiplier;
    }
  }

  render(ctx) {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.save();
    ctx.translate(this.width / 2, this.height / 2);
    ctx.rotate(this.angle);

    ctx.lineWidth = this.params.lineWidth;
    ctx.strokeStyle = '#fff';
    ctx.lineCap = 'round';
    ctx.beginPath();

    
    
    const b = this.params.armSpacing / (2 * Math.PI);

    
    const maxRadius = Math.sqrt(
      Math.pow(this.width / 2, 2) + Math.pow(this.height / 2, 2)
    );

    
    const maxTheta = maxRadius / b;

    
    for (let theta = 0; theta <= maxTheta; theta += 0.05) {
      const r = b * theta;
      const x = r * Math.cos(theta);
      const y = r * Math.sin(theta);

      if (theta === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();
    ctx.restore();
  }

  getExplanationText() {
    return `<b>Rotating Spiral (Motion Aftereffect):</b> Stare at the center for 15 seconds, then pause the rotation. Your brain's motion detectors will adapt, creating an illusory expansion or contraction.<br><br><b>DVS Link:</b> Notice the precise, continuous stream of ON (leading edge) and OFF (trailing edge) events. DVS elegantly handles rotation and continuous curves, tracing the exact spatial-temporal gradient of the object in real-time with sub-millisecond precision.`;
  }
}

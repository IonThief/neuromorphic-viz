import { IllusionBase } from './IllusionBase.js';


export class ReversePhi extends IllusionBase {
  constructor(width, height) {
    super(width, height);

    this.pos = 0;
    this.accumulatedTime = 0;
    this.isReversedPolarity = false;

    this.params = {
      enableInversion: true,
      barWidth: 40,
      stepInterval: 100 
    };
  }

  getCustomParams() {
    return [
      {
        id: 'enableInversion',
        label: 'Enable Contrast Inversion',
        type: 'checkbox',
        value: this.params.enableInversion
      },
      {
        id: 'barWidth',
        label: 'Bar Width (px)',
        type: 'range',
        min: 20,
        max: 120,
        step: 10,
        value: this.params.barWidth
      },
      {
        id: 'stepInterval',
        label: 'Step Interval (ms)',
        type: 'range',
        min: 16,
        max: 400,
        step: 16,
        value: this.params.stepInterval
      }
    ];
  }

  onParamsChanged(newParams) {
    this.params = { ...this.params, ...newParams };

    
    if (!this.params.enableInversion) {
      this.isReversedPolarity = false;
    }
  }

  update(deltaTime, config) {
    this.accumulatedTime += deltaTime;

    
    
    if (this.accumulatedTime >= this.params.stepInterval) {
      this.accumulatedTime -= this.params.stepInterval;

      
      this.pos += this.params.barWidth * 0.25;

      
      const period = this.params.barWidth * 2;
      if (this.pos > period * 1000) {
        this.pos = this.pos % period;
      }

      
      if (this.params.enableInversion) {
        this.isReversedPolarity = !this.isReversedPolarity;
      }
    }
  }

  render(ctx) {
    
    ctx.fillStyle = '#777';
    ctx.fillRect(0, 0, this.width, this.height);

    const primary = this.isReversedPolarity ? '#fff' : '#000';
    const secondary = this.isReversedPolarity ? '#000' : '#fff';

    const period = this.params.barWidth * 2;
    const offset = this.pos % period;

    const yStart = this.height * 0.2;
    const boxHeight = this.height * 0.6;

    
    for (let x = -period; x < this.width + period; x += period) {
      
      ctx.fillStyle = primary;
      ctx.fillRect(x + offset, yStart, this.params.barWidth, boxHeight);

      
      ctx.fillStyle = secondary;
      ctx.fillRect(
        x + offset + this.params.barWidth,
        yStart,
        this.params.barWidth,
        boxHeight
      );
    }
  }

  getExplanationText() {
    return `<b>Reverse Phi Phenomenon:</b> Uncheck 'Enable Inversion' to verify the bars are physically moving RIGHT. Check it, and your brain perceives motion to the LEFT.<br><br><b>DVS Link:</b> DVS sensors separate ON (luminance increase) and OFF (decrease) events. Motion algorithms (like Reichardt detectors) track edges. Temporal inversion forces OFF pixels to trigger exactly where ON pixels used to be, aliasing the motion vector calculation in the opposite direction.`;
  }
}

import { IllusionBase } from './IllusionBase.js';


export class SteppingFeet extends IllusionBase {
  constructor(width, height) {
    super(width, height);
    this.posX = 0;

    this.params = {
      showStripes: true,
      stripeWidth: 20,
      verticalSpacing: 40 
    };
  }

  getCustomParams() {
    return [
      {
        id: 'showStripes',
        label: 'Show Background Stripes',
        type: 'checkbox',
        value: this.params.showStripes
      },
      {
        id: 'stripeWidth',
        label: 'Stripe Width (px)',
        type: 'range',
        min: 10,
        max: 50,
        step: 2,
        value: this.params.stripeWidth
      },
      {
        id: 'verticalSpacing',
        label: 'Block Gap (px)',
        type: 'range',
        min: 0,
        max: 150,
        step: 10,
        value: this.params.verticalSpacing
      }
    ];
  }

  onParamsChanged(newParams) {
    this.params = { ...this.params, ...newParams };
  }

  update(deltaTime, config) {
    
    this.posX += deltaTime * 0.1 * config.speedMultiplier;

    
    const blockWidth = this.params.stripeWidth * 4;

    
    if (this.posX > this.width) {
      this.posX = -blockWidth;
    }
  }

  render(ctx) {
    
    if (this.params.showStripes) {
      
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, this.width, this.height);

      
      ctx.fillStyle = '#000000';
      const period = this.params.stripeWidth * 2;
      for (let x = 0; x < this.width; x += period) {
        ctx.fillRect(x, 0, this.params.stripeWidth, this.height);
      }
    } else {
      
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, this.width, this.height);
    }

    
    const blockWidth = this.params.stripeWidth * 4;
    const blockHeight = 40;
    const centerY = this.height / 2;
    const gap = this.params.verticalSpacing / 2;

    
    
    ctx.fillStyle = '#f0f000'; 
    ctx.fillRect(
      this.posX,
      centerY - gap - blockHeight,
      blockWidth,
      blockHeight
    );

    
    ctx.fillStyle = '#0000a0'; 
    ctx.fillRect(this.posX, centerY + gap, blockWidth, blockHeight);
  }

  getExplanationText() {
    return `<b>Stepping Feet:</b> Both blocks are moving at the exact same constant speed. Uncheck "Show Background Stripes" to instantly prove this to your brain.<br><br><b>DVS Link:</b> This illusion occurs because the human visual system processes high-contrast edges faster than low-contrast edges. The light block has high contrast against the black stripes but low contrast against the white stripes, causing perceived motion to "stutter". In the DVS view, notice how crossing the contrasting stripes creates massive bursts of events. You can manipulate the DVS Threshold slider to simulate how lowering contrast sensitivity affects event generation latency.`;
  }
}

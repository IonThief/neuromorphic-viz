import { IllusionBase } from './IllusionBase.js';


export class HermannGrid extends IllusionBase {
  constructor(width, height) {
    super(width, height);

    this.offsetX = 0;
    this.offsetY = 0;
    this.targetOffsetX = 0;
    this.targetOffsetY = 0;
    this.timeSinceSaccade = 0;

    this.params = {
      autoSaccade: true,
      invertPolarity: false,
      gridSpacing: 60,
      lineWidth: 12
    };
  }

  getCustomParams() {
    return [
      {
        id: 'autoSaccade',
        label: 'Auto Microsaccades',
        type: 'checkbox',
        value: this.params.autoSaccade
      },
      {
        id: 'invertPolarity',
        label: 'Invert Polarity (Black Lines)',
        type: 'checkbox',
        value: this.params.invertPolarity
      },
      {
        id: 'gridSpacing',
        label: 'Grid Spacing (px)',
        type: 'range',
        min: 40,
        max: 120,
        step: 5,
        value: this.params.gridSpacing
      },
      {
        id: 'lineWidth',
        label: 'Line Width (px)',
        type: 'range',
        min: 4,
        max: 24,
        step: 2,
        value: this.params.lineWidth
      }
    ];
  }

  onParamsChanged(newParams) {
    this.params = { ...this.params, ...newParams };
  }

  update(deltaTime, config) {
    this.timeSinceSaccade += deltaTime;

    
    if (this.params.autoSaccade && this.timeSinceSaccade > 1500) {
      this.timeSinceSaccade = 0;
      this.targetOffsetX = (Math.random() - 0.5) * 15;
      this.targetOffsetY = (Math.random() - 0.5) * 15;
    }

    
    this.offsetX += (this.targetOffsetX - this.offsetX) * 0.1;
    this.offsetY += (this.targetOffsetY - this.offsetY) * 0.1;

    
    this.targetOffsetX *= 0.9;
    this.targetOffsetY *= 0.9;
  }

  onUserInteraction() {
    if (!this.params.autoSaccade) {
      
      this.targetOffsetX = (Math.random() - 0.5) * 15;
      this.targetOffsetY = (Math.random() - 0.5) * 15;
    }
  }

  render(ctx) {
    const bgCol = this.params.invertPolarity ? '#fff' : '#000';
    const fgCol = this.params.invertPolarity ? '#000' : '#fff';

    ctx.fillStyle = bgCol;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);

    ctx.fillStyle = fgCol;

    const spacing = this.params.gridSpacing;
    const thickness = this.params.lineWidth;
    const padding = 50; 

    
    for (let x = -padding; x < this.width + padding; x += spacing) {
      ctx.fillRect(x, -padding, thickness, this.height + padding * 2);
    }

    
    for (let y = -padding; y < this.height + padding; y += spacing) {
      ctx.fillRect(-padding, y, this.width + padding * 2, thickness);
    }

    ctx.restore();
  }

  getExplanationText() {
    return `<b>Hermann Grid:</b> You perceive illusory blobs at the grid intersections caused by lateral inhibition in retinal ganglion cells. Toggle the Bio-Filter to mathematically reveal them.<br><br><b>DVS Link:</b> Switch to DVS view and disable Auto-Saccades. Hold perfectly still—the screen goes black because no temporal changes occur. The moment you move your mouse, the spatial edges translate across pixels, triggering ON/OFF events. DVS sensors inherently filter out global redundant information just like biological retinas.`;
  }
}

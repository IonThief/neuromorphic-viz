import { IllusionBase } from './IllusionBase.js';


export class Contrast extends IllusionBase {
  constructor(width, height) {
    super(width, height);

    
    
    this.offsetX = 0;

    this.params = {
      stripeWidth: 40,
      shadowContrast: 15 
    };

    
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = width;
    this.offscreenCanvas.height = height / 2;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', {
      willReadFrequently: true
    });

    this.#buildSineWavePattern();
  }

  getCustomParams() {
    return [
      {
        id: 'stripeWidth',
        label: 'Stripe Width (px)',
        type: 'range',
        min: 10,
        max: 100,
        step: 5,
        value: this.params.stripeWidth
      },
      {
        id: 'shadowContrast',
        label: 'Shadow Contrast (Amplitude)',
        type: 'range',
        min: 1,
        max: 50,
        step: 1,
        value: this.params.shadowContrast
      }
    ];
  }

  onParamsChanged(newParams) {
    const contrastChanged =
      this.params.shadowContrast !== newParams.shadowContrast;
    this.params = { ...this.params, ...newParams };

    
    if (contrastChanged) {
      this.#buildSineWavePattern();
    }
  }

  
  #buildSineWavePattern() {
    const w = this.offscreenCanvas.width;
    const h = this.offscreenCanvas.height;
    const imgData = this.offscreenCtx.createImageData(w, h);
    const data = imgData.data;

    const baseGray = 128;
    const amplitude = this.params.shadowContrast;

    for (let x = 0; x < w; x++) {
      
      const theta = (x / w) * Math.PI * 2;
      const val = Math.round(baseGray + Math.sin(theta) * amplitude);
      const clamped = Math.max(0, Math.min(255, val));

      for (let y = 0; y < h; y++) {
        const idx = (y * w + x) * 4;
        data[idx] = clamped; 
        data[idx + 1] = clamped; 
        data[idx + 2] = clamped; 
        data[idx + 3] = 255; 
      }
    }

    this.offscreenCtx.putImageData(imgData, 0, 0);
  }

  update(deltaTime, config) {
    
    this.offsetX += deltaTime * 0.05 * config.speedMultiplier;

    
    if (this.offsetX > this.width * 1000) {
      this.offsetX = this.offsetX % this.width;
    }
  }

  render(ctx) {
    const halfHeight = this.height / 2;

    
    ctx.save();

    
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.width, halfHeight);

    
    ctx.fillStyle = '#fff';
    const period = this.params.stripeWidth * 2;
    const squareOffset = this.offsetX % period;

    
    for (let x = squareOffset - period; x < this.width; x += period) {
      ctx.fillRect(x, 0, this.params.stripeWidth, halfHeight);
    }

    ctx.restore();

    
    ctx.save();

    
    const sineOffset = this.offsetX % this.width;

    
    ctx.drawImage(this.offscreenCanvas, sineOffset - this.width, halfHeight);
    ctx.drawImage(this.offscreenCanvas, sineOffset, halfHeight);

    ctx.restore();
  }

  getExplanationText() {
    return `<b>Spatial Frequency & Contrast Sensitivity:</b> The top shows a high spatial frequency, maximum contrast square wave. The bottom shows a low spatial frequency, low contrast continuous sine wave.<br><br><b>DVS Link:</b> DVS cameras excel at sharp edges (top). For the soft shadow (bottom), the intensity change per pixel over time (temporal gradient) is very small. You must either increase the speed or lower the Event Threshold for the camera to perceive the smooth shadow.`;
  }
}

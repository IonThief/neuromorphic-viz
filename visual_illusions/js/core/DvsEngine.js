
export class DvsEngine {
  constructor(width, height, options = {}) {
    if (!width || !height) {
      throw new Error('DvsEngine requires valid dimensions.');
    }

    this.width = width;
    this.height = height;
    this.pixelCount = width * height;

    
    
    this.prevLuminance = new Float32Array(this.pixelCount);

    
    this.dvsImageData = new ImageData(width, height);

    
    this.onColor = options.onColor || [0, 255, 255, 255];
    this.offColor = options.offColor || [255, 0, 0, 255];
  }

  setEventColors(onColor, offColor) {
    this.onColor = onColor;
    this.offColor = offColor;
  }

  
  processFrame(currImageData, threshold) {
    const rawPixels = currImageData.data;
    const dvsPixels = this.dvsImageData.data;
    let eventCount = 0;

    for (let i = 0; i < this.pixelCount; i++) {
      const pxIdx = i * 4;

      
      const r = rawPixels[pxIdx];
      const g = rawPixels[pxIdx + 1];
      const b = rawPixels[pxIdx + 2];
      const currLum = (r * 3 + g * 4 + b) >> 3;

      const prevLum = this.prevLuminance[i];
      const diff = currLum - prevLum;

      
      dvsPixels[pxIdx] = 0;
      dvsPixels[pxIdx + 1] = 0;
      dvsPixels[pxIdx + 2] = 0;
      dvsPixels[pxIdx + 3] = 255;

      
      if (Math.abs(diff) > threshold) {
        eventCount++;

        const color = diff > 0 ? this.onColor : this.offColor;

        dvsPixels[pxIdx] = color[0]; 
        dvsPixels[pxIdx + 1] = color[1]; 
        dvsPixels[pxIdx + 2] = color[2]; 
        dvsPixels[pxIdx + 3] = color[3]; 

        
        this.prevLuminance[i] = currLum;
      }
    }

    return eventCount;
  }

  render(ctx) {
    ctx.putImageData(this.dvsImageData, 0, 0);
  }

  resetHistory() {
    this.prevLuminance.fill(0);
  }
}

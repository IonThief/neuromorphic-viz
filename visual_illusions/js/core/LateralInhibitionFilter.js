
export class LateralInhibitionFilter {
  constructor(
    width,
    height,
    kernelSize = 11,
    centerSigma = 1.0,
    surroundSigma = 3.0
  ) {
    this.width = width;
    this.height = height;
    this.pixelCount = width * height;
    this.kernelSize = kernelSize;
    this.halfKernel = Math.floor(kernelSize / 2);

    
    this.grayBuffer = new Float32Array(this.pixelCount);
    this.tempBuffer = new Float32Array(this.pixelCount);
    this.centerBuffer = new Float32Array(this.pixelCount);
    this.surroundBuffer = new Float32Array(this.pixelCount);

    this.outputImageData = new ImageData(width, height);

    this.centerKernel = this.#build1DKernel(kernelSize, centerSigma);
    this.surroundKernel = this.#build1DKernel(kernelSize, surroundSigma);
  }

  #build1DKernel(size, sigma) {
    const kernel = new Float32Array(size);
    const half = Math.floor(size / 2);
    let sum = 0;

    for (let i = -half; i <= half; i++) {
      const val = Math.exp(-(i * i) / (2 * sigma * sigma));
      kernel[i + half] = val;
      sum += val;
    }

    
    for (let i = 0; i < size; i++) {
      kernel[i] /= sum;
    }

    return kernel;
  }

  #convolve1D(input, output, kernel, isHorizontal) {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        let sum = 0;

        for (let k = -this.halfKernel; k <= this.halfKernel; k++) {
          const kIdx = k + this.halfKernel;

          
          let px = x + (isHorizontal ? k : 0);
          let py = y + (isHorizontal ? 0 : k);

          px = Math.max(0, Math.min(this.width - 1, px));
          py = Math.max(0, Math.min(this.height - 1, py));

          sum += input[py * this.width + px] * kernel[kIdx];
        }

        output[y * this.width + x] = sum;
      }
    }
  }

  processFrame(currImageData) {
    const input = currImageData.data;
    const output = this.outputImageData.data;

    
    for (let i = 0; i < this.pixelCount; i++) {
      const idx = i * 4;
      this.grayBuffer[i] =
        (input[idx] * 3 + input[idx + 1] * 4 + input[idx + 2]) >> 3;
    }

    
    this.#convolve1D(this.grayBuffer, this.tempBuffer, this.centerKernel, true);
    this.#convolve1D(
      this.tempBuffer,
      this.centerBuffer,
      this.centerKernel,
      false
    );

    
    this.#convolve1D(
      this.grayBuffer,
      this.tempBuffer,
      this.surroundKernel,
      true
    );
    this.#convolve1D(
      this.tempBuffer,
      this.surroundBuffer,
      this.surroundKernel,
      false
    );

    
    for (let i = 0; i < this.pixelCount; i++) {
      const centerVal = this.centerBuffer[i];
      const surroundVal = this.surroundBuffer[i];

      
      const sum = centerVal * 1.5 - surroundVal * 0.5;
      const val = Math.max(0, Math.min(255, sum));

      const idx = i * 4;
      output[idx] = val; 
      output[idx + 1] = val; 
      output[idx + 2] = val; 
      output[idx + 3] = 255; 
    }

    return this.outputImageData;
  }
}

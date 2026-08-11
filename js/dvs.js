export class DVSProcessor {
  constructor(videoEl, hiddenCanvas, heatmapCanvas) {
    if (!videoEl || !hiddenCanvas || !heatmapCanvas) {
      throw new Error('DVSProcessor requires valid DOM elements.');
    }
    this.videoEl = videoEl;
    this.hiddenCtx = hiddenCanvas.getContext('2d', {
      willReadFrequently: true
    });
    this.heatmapCanvas = heatmapCanvas;
    this.heatmapCtx = heatmapCanvas.getContext('2d');

    this.gridSize = 256;
    this.pixelCount = this.gridSize * this.gridSize;
    this.noiseThreshold = 15;
    this.velocityGain = 20.0;

    this.cfg = {
      displayMode: 'overlay',
      heatmapStyle: 'fire',
      trailDecay: 0.85
    };

    this.prevLuma = new Float32Array(this.pixelCount);
    this.heatmapData = new ImageData(this.gridSize, this.gridSize);

    hiddenCanvas.width = this.gridSize;
    hiddenCanvas.height = this.gridSize;
    heatmapCanvas.width = this.gridSize;
    heatmapCanvas.height = this.gridSize;

    this.isCalibrated = false;
    this.stream = null;
  }

  updateConfig(newConfig) {
    if (newConfig.noiseThreshold !== undefined)
      this.noiseThreshold = newConfig.noiseThreshold;
    if (newConfig.velocityGain !== undefined)
      this.velocityGain = newConfig.velocityGain;
    this.cfg = { ...this.cfg, ...newConfig };
    this._updateDisplayMode();
  }

  _updateDisplayMode() {
    if (this.cfg.displayMode === 'overlay') {
      this.videoEl.style.opacity = '1';
      this.heatmapCanvas.style.opacity = '0.85';
      this.heatmapCanvas.style.mixBlendMode = 'screen';
    } else if (this.cfg.displayMode === 'raw') {
      this.videoEl.style.opacity = '1';
      this.heatmapCanvas.style.opacity = '0';
    } else if (this.cfg.displayMode === 'heat') {
      this.videoEl.style.opacity = '0';
      this.heatmapCanvas.style.opacity = '1';
      this.heatmapCanvas.style.mixBlendMode = 'normal';
    }
  }

  _applyPalette(dataIndex, diff) {
    const style = this.cfg.heatmapStyle;
    const out = this.heatmapData.data;
    let r = 0,
      g = 0,
      b = 0;

    if (style === 'fire') {
      r = diff * 4;
      g = diff * 1.5;
      b = diff > 100 ? (diff - 100) * 2 : 0;
    } else if (style === 'classic') {
      r = diff > 80 ? 255 : diff * 3;
      g = diff > 80 ? 255 - (diff - 80) * 3 : diff * 2;
      b = diff < 80 ? 255 - diff * 2 : 0;
    } else if (style === 'matrix') {
      g = diff * 3;
    } else if (style === 'ghost') {
      r = 255;
      g = 255;
      b = 255;
    }

    out[dataIndex] = r > 255 ? 255 : r;
    out[dataIndex + 1] = g > 255 ? 255 : g;
    out[dataIndex + 2] = b > 255 ? 255 : b;
    out[dataIndex + 3] = diff * 4 > 255 ? 255 : diff * 4;
  }

  async start() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('WebRTC not supported or HTTPS required.');
    }
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 } },
      audio: false
    });
    this.videoEl.srcObject = this.stream;

    return new Promise((resolve) => {
      this.videoEl.onloadedmetadata = () => {
        this.videoEl.play();
        this._updateDisplayMode();
        resolve();
      };
    });
  }

  stop() {
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    this.videoEl.srcObject = null;
  }

  processFrame() {
    if (this.videoEl.readyState < 2) return { onSignal: 0, offSignal: 0 };

    this.hiddenCtx.drawImage(this.videoEl, 0, 0, this.gridSize, this.gridSize);
    const frameData = this.hiddenCtx.getImageData(
      0,
      0,
      this.gridSize,
      this.gridSize
    ).data;

    let totalON = 0;
    let totalOFF = 0;
    const out = this.heatmapData.data;

    for (let i = 0; i < this.pixelCount; i++) {
      const dataIndex = i << 2;
      const luma =
        (frameData[dataIndex] +
          frameData[dataIndex + 1] +
          frameData[dataIndex + 2]) /
        3;

      if (!this.isCalibrated) {
        this.prevLuma[i] = luma;
        continue;
      }

      const diff = luma - this.prevLuma[i];
      this.prevLuma[i] = luma;

      if (Math.abs(diff) > this.noiseThreshold) {
        if (diff > 0) totalON += diff;
        else totalOFF += Math.abs(diff);
        this._applyPalette(dataIndex, Math.abs(diff));
      } else {
        const currentAlpha = out[dataIndex + 3];
        if (currentAlpha > 0)
          out[dataIndex + 3] = (currentAlpha * this.cfg.trailDecay) | 0;
      }
    }

    if (!this.isCalibrated) {
      this.isCalibrated = true;
      return { onSignal: 0, offSignal: 0 };
    }

    this.heatmapCtx.putImageData(this.heatmapData, 0, 0);

    const gainFactor = this.velocityGain / 20.0;
    return {
      onSignal: Math.min(1.0, (totalON / (this.pixelCount * 2)) * gainFactor),
      offSignal: Math.min(1.0, (totalOFF / (this.pixelCount * 2)) * gainFactor)
    };
  }
}

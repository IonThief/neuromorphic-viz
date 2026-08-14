import { IllusionBase } from './IllusionBase.js';



export class LilacChaser extends IllusionBase {
  constructor(width, height) {
    super(width, height);
    this.activeMissingIndex = 0;
    this.stepTimer = 0;

    this.params = {
      dotCount: 12,
      radius: 160,
      stepInterval: 150,
      dotColor: '#ff78dc'
    };
  }

  getCustomParams() {
    const compColor = this.#getComplementaryHex(this.params.dotColor);

    return [
      {
        id: 'dotColor',
        label: 'Dot Color',
        type: 'color',
        value: this.params.dotColor
      },
      {
        id: 'afterimagePreview',
        label: 'Predicted Afterimage',
        type: 'color-preview',
        value: compColor
      },
      {
        id: 'dotCount',
        label: 'Dot Count',
        type: 'range',
        min: 6,
        max: 20,
        step: 2,
        value: this.params.dotCount
      },
      {
        id: 'radius',
        label: 'Ring Radius (px)',
        type: 'range',
        min: 80,
        max: 240,
        step: 10,
        value: this.params.radius
      },
      {
        id: 'stepInterval',
        label: 'Step Interval (ms)',
        type: 'range',
        min: 50,
        max: 300,
        step: 25,
        value: this.params.stepInterval
      }
    ];
  }

  onParamsChanged(newParams) {
    this.params = { ...this.params, ...newParams };

    const previewBox = document.getElementById('afterimagePreview');
    if (previewBox) {
      previewBox.style.backgroundColor = this.#getComplementaryHex(
        this.params.dotColor
      );
    }
  }

  #getComplementaryHex(hexColor) {
    let hex = hexColor.replace('#', '');
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((c) => c + c)
        .join('');
    }
    const num = parseInt(hex, 16);
    const r = 255 - ((num >> 16) & 255);
    const g = 255 - ((num >> 8) & 255);
    const b = 255 - (num & 255);

    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  update(deltaTime, config) {
    const interval = Math.max(
      20,
      this.params.stepInterval / Math.max(0.1, config.speedMultiplier)
    );

    this.stepTimer += deltaTime;
    if (this.stepTimer > interval) {
      this.stepTimer = 0;
      this.activeMissingIndex =
        (this.activeMissingIndex + 1) % this.params.dotCount;
    }
  }

  render(ctx) {
    ctx.fillStyle = '#888888';
    ctx.fillRect(0, 0, this.width, this.height);

    const cx = this.width / 2;
    const cy = this.height / 2;

    ctx.fillStyle = this.params.dotColor;

    for (let i = 0; i < this.params.dotCount; i++) {
      if (i === this.activeMissingIndex) continue;

      const angle = (i / this.params.dotCount) * Math.PI * 2;
      const x = cx + Math.cos(angle) * this.params.radius;
      const y = cy + Math.sin(angle) * this.params.radius;

      ctx.beginPath();
      ctx.arc(x, y, 20, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#000000';
    ctx.fillRect(cx - 10, cy - 2, 20, 4);
    ctx.fillRect(cx - 2, cy - 10, 4, 20);
  }

  getExplanationText() {
    return `<b>Lilac Chaser:</b> Stare strictly at the central black cross. Check the sidebar swatch to see your <b>Predicted Afterimage</b> color, then let your biological retina naturally hallucinate it in the blank animation gap.<br><br><b>DVS Link:</b> Switch to DVS view. DVS hardware is monochromatic and log-luminance based; it cannot experience biological color fatigue or opponent-process afterimages.`;
  }
}

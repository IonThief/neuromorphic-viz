import { IllusionBase } from './IllusionBase.js';


export class FlashLag extends IllusionBase {
  constructor(width, height) {
    super(width, height);
    this.ringPositionX = -100;
    this.prevRingPositionX = -100;

    this.isFlashing = false;
    this.flashTimer = 0;
    this.cooldownTimer = 0;

    
    this.keys = { ArrowLeft: false, ArrowRight: false };
    this.#bindKeyboardEvents();

    this.params = {
      manualMode: false,
      manualSpeed: 0.5,
      showGuides: false,
      flashOffset: 0,
      flashDuration: 40,
      ringRadius: 35
    };
  }

  #bindKeyboardEvents() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        this.keys[e.key] = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        this.keys[e.key] = false;
      }
    });
  }

  getCustomParams() {
    return [
      {
        id: 'manualMode',
        label: 'Manual Control (L/R Keys)',
        type: 'checkbox',
        value: this.params.manualMode
      },
      {
        id: 'manualSpeed',
        label: 'Manual Speed',
        type: 'range',
        min: 0.1,
        max: 1.5,
        step: 0.1,
        value: this.params.manualSpeed
      },
      {
        id: 'showGuides',
        label: 'Show Alignment Guides',
        type: 'checkbox',
        value: this.params.showGuides
      },
      {
        id: 'flashOffset',
        label: 'Flash Offset (Measure Lag)',
        type: 'range',
        min: -50,
        max: 50,
        step: 1,
        value: this.params.flashOffset
      },
      {
        id: 'flashDuration',
        label: 'Flash Duration (ms)',
        type: 'range',
        min: 16,
        max: 150,
        step: 16,
        value: this.params.flashDuration
      },
      {
        id: 'ringRadius',
        label: 'Ring Size (px)',
        type: 'range',
        min: 20,
        max: 80,
        step: 5,
        value: this.params.ringRadius
      }
    ];
  }

  onParamsChanged(newParams) {
    this.params = { ...this.params, ...newParams };
  }

  update(deltaTime, config) {
    
    if (this.cooldownTimer > 0) {
      this.cooldownTimer -= deltaTime;
    }

    
    let velocity = 0;
    if (this.params.manualMode) {
      
      const dir =
        (this.keys.ArrowRight ? 1 : 0) - (this.keys.ArrowLeft ? 1 : 0);
      velocity = dir * this.params.manualSpeed;
    } else {
      velocity = 0.4 * config.speedMultiplier;
    }

    const dx = deltaTime * velocity;

    this.prevRingPositionX = this.ringPositionX;
    this.ringPositionX += dx;

    
    if (this.ringPositionX > this.width + 100) {
      this.ringPositionX = -100;
      this.prevRingPositionX = this.ringPositionX;
    } else if (this.ringPositionX < -100) {
      this.ringPositionX = this.width + 100;
      this.prevRingPositionX = this.ringPositionX;
    }

    const cx = this.width / 2;

    
    
    const crossedRight =
      this.prevRingPositionX < cx && this.ringPositionX >= cx;
    const crossedLeft = this.prevRingPositionX > cx && this.ringPositionX <= cx;

    if ((crossedRight || crossedLeft) && this.cooldownTimer <= 0) {
      this.isFlashing = true;
      this.flashTimer = this.params.flashDuration;
      this.cooldownTimer = 300; 
    }

    
    if (this.isFlashing) {
      this.flashTimer -= deltaTime;
      if (this.flashTimer <= 0) {
        this.isFlashing = false;
      }
    }
  }

  render(ctx) {
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, this.width, this.height);

    const cx = this.width / 2;
    const cy = this.height / 2;

    
    if (this.params.showGuides) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, this.height);
      ctx.moveTo(0, cy);
      ctx.lineTo(this.width, cy);
      ctx.stroke();
    }

    
    ctx.strokeStyle = '#00aaff';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(this.ringPositionX, cy, this.params.ringRadius, 0, Math.PI * 2);
    ctx.stroke();

    
    if (this.isFlashing) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      
      
      const dirSign = this.params.manualMode && this.keys.ArrowLeft ? -1 : 1;
      const flashX = cx + this.params.flashOffset * dirSign;

      ctx.arc(flashX, cy, this.params.ringRadius * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }

    
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(cx - 10, cy + 80, 20, 4);
    ctx.fillRect(cx - 2, cy + 72, 4, 20);
  }

  getExplanationText() {
    return `<b>Flash Lag Effect (Predictive Coding):</b> Stare at the red cross. The white dot flashes exactly when the ring crosses the center, but appears to lag behind. Use the <b>Flash Offset</b> slider to move the dot forward until it looks centered, revealing your neural latency. Toggle <b>Manual Control</b> and use Left/Right arrows to test if self-generated motion (efference copy) reduces the lag.<br><br><b>DVS Link:</b> Your visual cortex predictively extrapolates moving objects to compensate for neural delays. In the DVS view, you will see the absolute ground-truth physics: the events overlap perfectly at the center, because a silicon sensor has microseconds of latency and requires zero predictive coding.`;
  }
}

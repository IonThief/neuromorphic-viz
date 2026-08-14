export class CanvasRenderer {
  constructor(canvasId, lineColor) {
    const canvas = document.getElementById(canvasId);
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.width = canvas.width;
    this.height = canvas.height;
    this.lineColor = lineColor;
  }

  draw(history, threshold, maxVal = 150) {
    const ctx = this.ctx;
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, this.width, this.height);

    const cap = history.capacity;
    const head = history.head;

    if (threshold !== null && threshold !== undefined) {
      const yThreshold = this.height - (threshold / maxVal) * this.height;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(0, yThreshold);
      ctx.lineTo(this.width, yThreshold);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.strokeStyle = this.lineColor;
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let i = 0; i < cap; i++) {
      const index = (head + i) % cap;
      const val = history.voltage[index];
      const x = (i / cap) * this.width;
      const y = this.height - (val / maxVal) * this.height;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let i = 0; i < cap; i++) {
      const index = (head + i) % cap;
      if (history.spikes[index] === 1) {
        const x = (i / cap) * this.width;
        ctx.moveTo(x, this.height);
        ctx.lineTo(x, 0);
      }
    }
    ctx.stroke();
  }
}

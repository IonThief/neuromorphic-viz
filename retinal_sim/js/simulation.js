export class TimeSeriesData {
  constructor(capacity) {
    this.capacity = capacity;
    this.voltage = new Float32Array(capacity);
    this.spikes = new Uint8Array(capacity);
    this.head = 0;
  }
  push(v, s) {
    this.voltage[this.head] = v;
    this.spikes[this.head] = s;
    this.head = (this.head + 1) % this.capacity;
  }
}

class LeakyIntegrateAndFire {
  constructor(capacity) {
    this.voltage = 0;
    this.isSpiking = false;
    this.history = new TimeSeriesData(capacity);
  }
  inject(amount, leakRate, threshold) {
    this.voltage += amount - leakRate;
    if (this.voltage < 0) this.voltage = 0;

    if (this.voltage >= threshold) {
      this.isSpiking = true;
      this.history.push(threshold, 1);
      this.voltage = 0;
    } else {
      this.isSpiking = false;
      this.history.push(this.voltage, 0);
    }
  }
}

export class BiologicalPipeline {
  constructor(capacity = 800) {
    this.ganglionON = new LeakyIntegrateAndFire(capacity);
    this.ganglionOFF = new LeakyIntegrateAndFire(capacity);
    this.stimulusHistory = new TimeSeriesData(capacity);
    this.rhodopsin = 1.0;
    this.previousSignal = 0;
    this.signalON = 0;
    this.signalOFF = 0;
  }

  tick(params, dvsData) {
    let effectiveStimulus = 0;

    if (dvsData) {
      this.signalON = dvsData.onSignal * params.gain * 50;
      this.signalOFF = dvsData.offSignal * params.gain * 50;
      effectiveStimulus = (this.signalON + this.signalOFF) / 2;
    } else {
      const lightPct = params.intensity / 100;
      this.rhodopsin +=
        0.01 * (1.0 - this.rhodopsin) - 0.015 * lightPct * this.rhodopsin;
      this.rhodopsin = Math.max(0.1, Math.min(1.0, this.rhodopsin));

      const noiseVal = (Math.random() - 0.5) * params.noise;
      const rawStimulus = Math.max(0, params.intensity * 0.4 + noiseVal);

      effectiveStimulus = rawStimulus * this.rhodopsin;
      let deltaV = effectiveStimulus - this.previousSignal;
      deltaV *= 10.0;

      this.signalON = deltaV > 0 ? deltaV * params.gain : 0;
      this.signalOFF = deltaV < 0 ? Math.abs(deltaV) * params.gain : 0;
      this.previousSignal = effectiveStimulus;
    }

    this.stimulusHistory.push(effectiveStimulus, 0);
    this.ganglionON.inject(this.signalON, params.leakRate, params.threshGC);
    this.ganglionOFF.inject(this.signalOFF, params.leakRate, params.threshGC);
  }
}

export class StimulusController {
  constructor() {
    this.mode = 'manual';
    this.frequency = 1.0;
    this.minIntensity = 0;
    this.maxIntensity = 100;
    this.dutyCycle = 0.5;
  }

  getIntensity(nowMs, currentManual) {
    if (this.mode === 'manual' || this.mode === 'webcam') return currentManual;

    const periodMs = 1000 / Math.max(0.01, this.frequency);
    const phase = (nowMs % periodMs) / periodMs;
    const minI = this.minIntensity;
    const maxI = this.maxIntensity;
    const amp = maxI - minI;

    switch (this.mode) {
      case 'square':
        return phase < this.dutyCycle ? maxI : minI;
      case 'sine':
        return minI + amp * ((Math.sin(phase * Math.PI * 2) + 1) / 2);
      case 'sawtooth':
        return minI + amp * phase;
      default:
        return currentManual;
    }
  }
}

export class Node {
  constructor(id, type, x, y) {
    this.id = id;
    this.type = type;
    this.x = x;
    this.y = y;
    this.charge = 0.0;
  }
}

export class Edge {
  constructor(id, source, target, type, scale = 1.0) {
    this.id = id;
    this.source = source;
    this.target = target;
    this.type = type;
    this.isAnalog = source.type === 'pr' || source.type.includes('bp');

    this.p0 = { x: source.x + 10 * scale, y: source.y };
    this.p3 = { x: target.x - 10 * scale, y: target.y };

    const tension = Math.min(Math.abs(this.p3.x - this.p0.x) * 0.5, 100);
    this.p1 = { x: this.p0.x + tension, y: this.p0.y };
    this.p2 = { x: this.p3.x - tension, y: this.p3.y };

    this.svgPath = `M ${this.p0.x},${this.p0.y} C ${this.p1.x},${this.p1.y} ${this.p2.x},${this.p2.y} ${this.p3.x},${this.p3.y}`;
    this.dashOffset = 0;
  }
}

export class Spike {
  constructor(edge) {
    this.edge = edge;
    this.progress = 0;
    this.speed = 0.01 + Math.random() * 0.015;
    this.domElement = null;
  }
}

export class NetworkGenerator {
  constructor() {
    this.nodes = [];
    this.layers = {};
    this.lastCountsStr = '';
  }

  buildNodes(counts) {
    const countsStr = JSON.stringify(counts);
    if (this.lastCountsStr === countsStr) return;

    this.lastCountsStr = countsStr;
    this.nodes = [];
    this.layers = {
      pr: { count: counts.pr, types: ['pr'], nodes: [] },
      bp: { count: counts.bp, types: ['bp-on', 'bp-off'], nodes: [] },
      gc: { count: counts.gc, types: ['gc-on', 'gc-off'], nodes: [] },
      lgn: { count: counts.lgn, types: ['lgn'], nodes: [] },
      v1: { count: counts.v1, types: ['v1'], nodes: [] }
    };

    Object.keys(this.layers).forEach((k) => {
      for (let i = 0; i < this.layers[k].count; i++) {
        let type;
        if (i < this.layers[k].types.length) {
          type = this.layers[k].types[i];
        } else {
          type =
            this.layers[k].types[
              Math.floor(Math.random() * this.layers[k].types.length)
            ];
        }
        const n = new Node(`${k}-${i}`, type, 0, 0);
        this.layers[k].nodes.push(n);
        this.nodes.push(n);
      }
    });
  }

  layout(w, h, scale = 1.0) {
    const edges = [];
    const padY = 50,
      netH = h - padY * 2;
    const xs = {
      pr: w * 0.1,
      bp: w * 0.28,
      gc: w * 0.45,
      lgn: w * 0.7,
      v1: w * 0.9
    };

    Object.keys(this.layers).forEach((k) => {
      const layerNodes = this.layers[k].nodes;
      layerNodes.forEach((n, i) => {
        n.x = xs[k];
        n.y = padY + (netH / layerNodes.length) * (i + 0.5);
      });
    });

    let edgeId = 0;
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

    const connectLayers = (sources, targets, typeFn) => {
      if (!sources.length || !targets.length) return;

      sources.forEach((s) => {
        let nearest = targets[0],
          minD = dist(s, nearest);
        for (let i = 1; i < targets.length; i++) {
          if (dist(s, targets[i]) < minD) {
            minD = dist(s, targets[i]);
            nearest = targets[i];
          }
        }
        edges.push(
          new Edge(
            `e-${edgeId++}`,
            s,
            nearest,
            typeof typeFn === 'function' ? typeFn(s, nearest) : typeFn,
            scale
          )
        );
      });

      targets.forEach((t) => {
        if (!edges.some((e) => e.target === t)) {
          let nearest = sources[0],
            minD = dist(t, nearest);
          for (let i = 1; i < sources.length; i++) {
            if (dist(t, sources[i]) < minD) {
              minD = dist(t, sources[i]);
              nearest = sources[i];
            }
          }
          edges.push(
            new Edge(
              `e-${edgeId++}`,
              nearest,
              t,
              typeof typeFn === 'function' ? typeFn(nearest, t) : typeFn,
              scale
            )
          );
        }
      });
    };

    connectLayers(this.layers.pr.nodes, this.layers.bp.nodes, (s, t) =>
      t.type.includes('on') ? 'on' : 'off'
    );

    ['on', 'off'].forEach((pathway) => {
      const bpNodes = this.layers.bp.nodes.filter((n) =>
        n.type.includes(pathway)
      );
      const gcNodes = this.layers.gc.nodes.filter((n) =>
        n.type.includes(pathway)
      );
      connectLayers(bpNodes, gcNodes, pathway);
    });

    connectLayers(this.layers.gc.nodes, this.layers.lgn.nodes, 'optic');
    connectLayers(this.layers.lgn.nodes, this.layers.v1.nodes, 'axon');

    return { nodes: this.nodes, edges };
  }
}

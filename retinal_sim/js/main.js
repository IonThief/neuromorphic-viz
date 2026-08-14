import {
  BiologicalPipeline,
  StimulusController,
  NetworkGenerator,
  Spike
} from './simulation.js?v=11.0';
import { CanvasRenderer } from './renderer.js?v=11.0';
import { DVSProcessor } from './dvs.js?v=11.0';

const SVG_TEMPLATES = {
  pr: `<rect x="-15" y="-6" width="15" height="12" fill="#546E7A" /><circle cx="0" cy="0" r="10" fill="#263238" stroke="#78909C" stroke-width="1.5" /><circle cx="0" cy="0" r="2" fill="#E0F7FA" class="core-indicator" /><path d="M 10 0 L 15 0" stroke="#757575" stroke-width="2" />`,
  'bp-on': `<circle cx="0" cy="0" r="11" fill="#004D40" stroke="#00E5FF" stroke-width="1.5" /><circle cx="0" cy="0" r="2" fill="#00E5FF" class="core-indicator" />`,
  'bp-off': `<circle cx="0" cy="0" r="11" fill="#3E2723" stroke="#FF3D00" stroke-width="1.5" /><circle cx="0" cy="0" r="2" fill="#FF3D00" class="core-indicator" />`,
  'gc-on': `<circle cx="0" cy="0" r="12" fill="#212121" /><circle cx="0" cy="0" r="16" fill="none" stroke="#00E5FF" stroke-width="2" stroke-dasharray="100" stroke-dashoffset="100" class="accumulator" />`,
  'gc-off': `<circle cx="0" cy="0" r="12" fill="#212121" /><circle cx="0" cy="0" r="16" fill="none" stroke="#FF3D00" stroke-width="2" stroke-dasharray="100" stroke-dashoffset="100" class="accumulator" />`,
  lgn: `<polygon points="0,-12 12,0 0,12 -12,0" fill="#311B92" /><circle cx="0" cy="0" r="18" fill="none" stroke="#D1C4E9" stroke-width="2" stroke-dasharray="113" stroke-dashoffset="113" class="accumulator" />`,
  v1: `<polygon points="-10,10 15,0 -10,-10" fill="#1B5E20" /><circle cx="-2" cy="0" r="12" fill="none" stroke="#C8E6C9" stroke-width="2" stroke-dasharray="75" stroke-dashoffset="75" class="accumulator" />`
};

class App {
  constructor() {
    this.pipeline = new BiologicalPipeline(800);
    this.stimulus = new StimulusController();
    this.gen = new NetworkGenerator();
    this.graph = null;
    this.spikes = [];

    this.inputs = {
      type: document.getElementById('stimulus-type'),
      light: document.getElementById('sim-light'),
      gain: document.getElementById('sim-gain'),
      leak: document.getElementById('sim-leak'),
      noise: document.getElementById('sim-noise'),
      threshGC: document.getElementById('thresh-gc'),
      threshLGN: document.getElementById('thresh-lgn'),
      weightLGN: document.getElementById('weight-lgn'),
      threshV1: document.getElementById('thresh-v1'),
      weightV1: document.getElementById('weight-v1'),
      scale: document.getElementById('sim-scale')
    };

    this.waveInputs = {
      freq: document.getElementById('wave-freq'),
      min: document.getElementById('wave-min'),
      max: document.getElementById('wave-max'),
      duty: document.getElementById('wave-duty')
    };

    this.dvsInputs = {
      display: document.getElementById('dvs-display'),
      palette: document.getElementById('dvs-palette'),
      noise: document.getElementById('dvs-noise'),
      vel: document.getElementById('dvs-vel'),
      trail: document.getElementById('dvs-trail')
    };

    this.renderers = {
      stimulus: new CanvasRenderer('graph-stimulus', '#00ffcc'),
      on: new CanvasRenderer('graph-on', '#00e5ff'),
      off: new CanvasRenderer('graph-off', '#ff3d00')
    };

    const videoEl = document.getElementById('rawWebcam');
    const hiddenCanvas = document.getElementById('hiddenCanvas');
    const heatmapCanvas = document.getElementById('heatmapCanvas');
    this.dvs = new DVSProcessor(videoEl, hiddenCanvas, heatmapCanvas);

    this.svg = {
      root: document.getElementById('network-svg'),
      edges: document.getElementById('layer-edges'),
      nodes: document.getElementById('layer-nodes'),
      spikes: document.getElementById('layer-spikes'),
      fx: document.getElementById('layer-fx')
    };

    this.domNodes = {};
    this.domEdges = {};

    this.bindEvents();
    this.rebuildTopology();
    requestAnimationFrame((ts) => this.loop(ts));
  }

  bindEvents() {
    Object.keys(this.inputs).forEach((key) => {
      this.inputs[key].addEventListener('input', (e) => {
        if (key === 'type') {
          this.stimulus.mode = e.target.value;
          this.inputs.light.disabled = e.target.value !== 'manual';

          const dvsView = document.getElementById('dvs-view');
          const dvsConfig = document.getElementById('dvs-config');
          const waveConfig = document.getElementById('wave-config');
          const groupDuty = document.getElementById('group-duty');

          if (e.target.value === 'webcam') {
            dvsView.style.display = 'block';
            dvsConfig.style.display = 'flex';
            waveConfig.style.display = 'none';
            this.dvs
              .start()
              .catch((err) => alert('Webcam Error: ' + err.message));
          } else if (['sine', 'square', 'sawtooth'].includes(e.target.value)) {
            dvsView.style.display = 'none';
            dvsConfig.style.display = 'none';
            waveConfig.style.display = 'flex';
            groupDuty.style.display =
              e.target.value === 'square' ? 'flex' : 'none';
            this.dvs.stop();
          } else {
            dvsView.style.display = 'none';
            dvsConfig.style.display = 'none';
            waveConfig.style.display = 'none';
            this.dvs.stop();
          }
        } else {
          const valDisplay = document.getElementById(
            `val-${key.toLowerCase().replace('thresh', 'thresh-').replace('weight', 'weight-')}`
          );
          if (valDisplay)
            valDisplay.textContent = parseFloat(e.target.value).toFixed(
              e.target.step ? (e.target.step.includes('.') ? 2 : 1) : 0
            );
        }
        if (key === 'scale') this.rebuildTopology();
      });
    });

    Object.keys(this.waveInputs).forEach((key) => {
      this.waveInputs[key].addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        document.getElementById(`val-wave-${key}`).textContent = val.toFixed(
          e.target.step ? 2 : 0
        );

        if (key === 'freq') this.stimulus.frequency = val;
        if (key === 'min') this.stimulus.minIntensity = val;
        if (key === 'max') this.stimulus.maxIntensity = val;
        if (key === 'duty') this.stimulus.dutyCycle = val;
      });
    });

    Object.keys(this.dvsInputs).forEach((key) => {
      this.dvsInputs[key].addEventListener('input', (e) => {
        const val = ['trail', 'vel'].includes(key)
          ? parseFloat(e.target.value)
          : key === 'noise'
            ? parseInt(e.target.value, 10)
            : e.target.value;
        if (document.getElementById(`val-dvs-${key}`)) {
          document.getElementById(`val-dvs-${key}`).textContent =
            typeof val === 'number' ? val.toFixed(e.target.step ? 2 : 0) : val;
        }

        const configMap = {
          display: 'displayMode',
          palette: 'heatmapStyle',
          trail: 'trailDecay',
          noise: 'noiseThreshold',
          vel: 'velocityGain'
        };
        this.dvs.updateConfig({ [configMap[key]]: val });
      });
    });

    document.querySelectorAll('input[type="number"]').forEach((el) => {
      el.addEventListener('change', () => this.rebuildTopology());
    });
    window.addEventListener('resize', () => this.rebuildTopology());
  }

  rebuildTopology() {
    const rect = this.svg.root.parentElement.getBoundingClientRect();
    this.svg.root.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);

    const counts = {
      pr: parseInt(document.getElementById('count-pr').value) || 10,
      bp: parseInt(document.getElementById('count-bp').value) || 8,
      gc: parseInt(document.getElementById('count-gc').value) || 5,
      lgn: parseInt(document.getElementById('count-lgn').value) || 3,
      v1: parseInt(document.getElementById('count-v1').value) || 6
    };

    const scale = parseFloat(this.inputs.scale.value);

    this.gen.buildNodes(counts);
    this.graph = this.gen.layout(rect.width, rect.height, scale);

    this.spikes = [];
    this.svg.spikes.innerHTML = '';
    this.svg.fx.innerHTML = '';
    this.domNodes = {};
    this.domEdges = {};

    this.svg.edges.innerHTML = this.graph.edges
      .map(
        (e) =>
          `<path id="${e.id}" class="edge ${e.isAnalog ? 'edge-analog' : 'edge-digital'} edge-${e.type}" d="${e.svgPath}"></path>`
      )
      .join('');

    this.svg.nodes.innerHTML = this.graph.nodes
      .map((n) => {
        return `<g id="${n.id}" transform="translate(${n.x}, ${n.y}) scale(${scale})">
          ${SVG_TEMPLATES[n.type]}
          <text class="node-label" x="-12" y="22">${n.type.toUpperCase()}</text>
        </g>`;
      })
      .join('');

    this.graph.nodes.forEach((n) => {
      this.domNodes[n.id] = {
        core: document.querySelector(`#${n.id} .core-indicator`),
        accumulator: document.querySelector(`#${n.id} .accumulator`),
        group: document.getElementById(n.id)
      };
    });
    this.graph.edges.forEach((e) => {
      this.domEdges[e.id] = document.getElementById(e.id);
    });
  }

  spawnLeakParticle(node) {
    const scale = parseFloat(this.inputs.scale.value);
    const circle = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'circle'
    );

    circle.setAttribute('r', (4 * scale).toString());
    circle.setAttribute('fill', '#ffea00');

    circle.style.filter =
      'drop-shadow(0px 0px 6px #ff9e00) drop-shadow(0px 0px 14px #ff0000)';
    circle.classList.add('ion');

    circle.setAttribute('cx', node.x + (Math.random() - 0.5) * (24 * scale));
    circle.setAttribute('cy', node.y + 10 * scale);
    this.svg.fx.appendChild(circle);

    const fallDistance = 40 + Math.random() * 40;
    const anim = circle.animate(
      [
        { transform: 'translate(0px, 0px)', opacity: 1 },
        { transform: `translate(0px, ${fallDistance * 0.5}px)`, opacity: 0.9 },
        { transform: `translate(0px, ${fallDistance}px)`, opacity: 0 }
      ],
      {
        duration: 700 + Math.random() * 500,
        easing: 'ease-out'
      }
    );

    anim.onfinish = () => circle.remove();
  }

  spawnSynapticVesicle(edge) {
    const circle = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'circle'
    );
    circle.setAttribute('r', '4');
    const color = edge.type === 'on' ? '#00e5ff' : '#ff3d00';
    circle.setAttribute('fill', color);
    circle.style.filter = `drop-shadow(0px 0px 6px ${color})`;
    circle.classList.add('vesicle');
    this.svg.fx.appendChild(circle);

    const anim = circle.animate(
      [
        { transform: `translate(${edge.p0.x}px, ${edge.p0.y}px)`, opacity: 1 },
        { transform: `translate(${edge.p3.x}px, ${edge.p3.y}px)`, opacity: 0 }
      ],
      { duration: 300, easing: 'linear' }
    );
    anim.onfinish = () => circle.remove();
  }

  spawnCortexFlash(node) {
    const scale = parseFloat(this.inputs.scale.value);
    const poly = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'polygon'
    );
    poly.setAttribute('points', '-10,10 15,0 -10,-10');
    poly.classList.add('cortex-flash');

    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute(
      'transform',
      `translate(${node.x}, ${node.y}) scale(${scale})`
    );
    group.appendChild(poly);

    this.svg.fx.appendChild(group);
    setTimeout(() => group.remove(), 500);
  }

  loop(now) {
    if (!this.graph) return requestAnimationFrame((ts) => this.loop(ts));

    const manualIntensity = parseFloat(this.inputs.light.value);
    const targetIntensity = this.stimulus.getIntensity(now, manualIntensity);

    if (this.stimulus.mode !== 'manual' && this.stimulus.mode !== 'webcam') {
      this.inputs.light.value = targetIntensity;
      document.getElementById('val-intensity').textContent =
        Math.round(targetIntensity);
    }

    const params = {
      intensity: targetIntensity,
      gain: parseFloat(this.inputs.gain.value),
      leakRate: parseFloat(this.inputs.leak.value),
      noise: parseFloat(this.inputs.noise.value),
      threshGC: parseInt(this.inputs.threshGC.value, 10),
      threshLGN: parseFloat(this.inputs.threshLGN.value),
      weightLGN: parseFloat(this.inputs.weightLGN.value),
      threshV1: parseFloat(this.inputs.threshV1.value),
      weightV1: parseFloat(this.inputs.weightV1.value)
    };

    const dvsData =
      this.stimulus.mode === 'webcam' ? this.dvs.processFrame() : null;
    this.pipeline.tick(params, dvsData);

    this.renderers.stimulus.draw(this.pipeline.stimulusHistory, null, 100);
    this.renderers.on.draw(
      this.pipeline.ganglionON.history,
      params.threshGC,
      150
    );
    this.renderers.off.draw(
      this.pipeline.ganglionOFF.history,
      params.threshGC,
      150
    );

    const onNorm = Math.min(1.0, this.pipeline.signalON / 10);
    const offNorm = Math.min(1.0, this.pipeline.signalOFF / 10);

    this.graph.nodes.forEach((n) => {
      if (n.type === 'pr') n.charge = params.intensity / 100;
      else if (n.type === 'bp-on') n.charge = onNorm;
      else if (n.type === 'bp-off') n.charge = offNorm;
      else if (n.type === 'gc-on')
        n.charge = this.pipeline.ganglionON.voltage / params.threshGC;
      else if (n.type === 'gc-off')
        n.charge = this.pipeline.ganglionOFF.voltage / params.threshGC;
      else n.charge = Math.max(0, n.charge - params.leakRate * 0.005);

      if (
        n.type !== 'pr' &&
        n.charge > 0.05 &&
        Math.random() < params.leakRate * 0.015
      ) {
        this.spawnLeakParticle(n);
      }
    });

    if (this.pipeline.ganglionON.isSpiking) {
      this.graph.nodes
        .filter((n) => n.type === 'gc-on')
        .forEach((n) => (n.charge = 1.0));
    }
    if (this.pipeline.ganglionOFF.isSpiking) {
      this.graph.nodes
        .filter((n) => n.type === 'gc-off')
        .forEach((n) => (n.charge = 1.0));
    }

    if (params.noise > 0 && Math.random() < params.noise * 0.05) {
      const prNodes = this.graph.nodes.filter((n) => n.type === 'pr');
      if (prNodes.length > 0) {
        const pr = prNodes[Math.floor(Math.random() * prNodes.length)];
        const prEdges = this.graph.edges.filter((e) => e.source === pr);
        if (prEdges.length > 0) {
          const edge = prEdges[Math.floor(Math.random() * prEdges.length)];
          this.spawnSynapticVesicle(edge);
        }
      }
    }

    this.graph.nodes.forEach((n) => {
      if (this.domNodes[n.id].core) {
        this.domNodes[n.id].core.setAttribute('r', 2 + n.charge * 6);
      }

      if (this.domNodes[n.id].accumulator) {
        const threshVal =
          n.type === 'lgn'
            ? params.threshLGN
            : n.type === 'v1'
              ? params.threshV1
              : 1.0;
        const normCharge = n.charge / threshVal;

        if (normCharge >= 1.0) {
          n.charge = 0;
          const outgoingEdges = this.graph.edges.filter((e) => e.source === n);
          if (outgoingEdges.length > 0) {
            outgoingEdges.forEach((edge) => this.spikes.push(new Spike(edge)));
          } else if (n.type === 'v1') {
            this.spawnCortexFlash(n);
          }
        }

        const circum = n.type.includes('gc')
          ? 100
          : n.type === 'lgn'
            ? 113
            : 75;
        this.domNodes[n.id].accumulator.style.strokeDashoffset =
          circum - Math.min(1.0, normCharge) * circum;

        let ringColor = '#FFF';
        if (normCharge > 0.9) ringColor = '#FFF';
        else if (n.type === 'gc-on') ringColor = '#00e5ff';
        else if (n.type === 'gc-off') ringColor = '#ff3d00';
        else if (n.type === 'lgn') ringColor = '#D1C4E9';
        else if (n.type === 'v1') ringColor = '#C8E6C9';
        this.domNodes[n.id].accumulator.style.stroke = ringColor;
      }
    });

    this.graph.edges.forEach((e) => {
      if (e.isAnalog) {
        e.dashOffset -= e.source.charge * 1.5;
        this.domEdges[e.id].style.strokeDashoffset = e.dashOffset;
      }
    });

    for (let i = this.spikes.length - 1; i >= 0; i--) {
      const s = this.spikes[i];
      s.progress += s.speed;

      if (s.progress >= 1.0) {
        const target = s.edge.target;
        if (target.charge !== undefined && !target.type.includes('gc')) {
          const addedWeight =
            target.type === 'lgn'
              ? params.weightLGN
              : target.type === 'v1'
                ? params.weightV1
                : 0.35;
          target.charge = Math.min(2.0, target.charge + addedWeight);
        }
        if (s.domElement) s.domElement.remove();
        this.spikes.splice(i, 1);
      } else {
        const u = 1 - s.progress;
        const tt = s.progress * s.progress;
        const uu = u * u;
        const x =
          uu * u * s.edge.p0.x +
          3 * uu * s.progress * s.edge.p1.x +
          3 * u * tt * s.edge.p2.x +
          tt * s.progress * s.edge.p3.x;
        const y =
          uu * u * s.edge.p0.y +
          3 * uu * s.progress * s.edge.p1.y +
          3 * u * tt * s.edge.p2.y +
          tt * s.progress * s.edge.p3.y;

        if (!s.domElement) {
          s.domElement = document.createElementNS(
            'http://www.w3.org/2000/svg',
            'circle'
          );
          s.domElement.setAttribute('fill', '#ffffff');
          s.domElement.style.filter = 'drop-shadow(0px 0px 8px #ffffff)';
          this.svg.spikes.appendChild(s.domElement);
        }

        const radius = 3 + Math.sin(s.progress * Math.PI * 10) * 2;
        s.domElement.setAttribute('r', radius);
        s.domElement.setAttribute('cx', x);
        s.domElement.setAttribute('cy', y);
      }
    }

    requestAnimationFrame((ts) => this.loop(ts));
  }
}

document.addEventListener('DOMContentLoaded', () => new App());

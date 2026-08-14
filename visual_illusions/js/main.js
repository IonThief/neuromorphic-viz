import { Config } from './core/Config.js';
import { DvsEngine } from './core/DvsEngine.js';
import { LateralInhibitionFilter } from './core/LateralInhibitionFilter.js';
import { Troxler } from './illusions/Troxler.js';
import { Contrast } from './illusions/Contrast.js';
import { ReversePhi } from './illusions/ReversePhi.js';
import { HermannGrid } from './illusions/HermannGrid.js';
import { RotatingSpiral } from './illusions/RotatingSpiral.js';
import { SteppingFeet } from './illusions/SteppingFeet.js';
import { Barberpole } from './illusions/Barberpole.js';
import { MotionInducedBlindness } from './illusions/MotionInducedBlindness.js';
import { FlashLag } from './illusions/FlashLag.js';
import { LilacChaser } from './illusions/LilacChaser.js';

const rawCanvas = document.getElementById('raw-canvas');
const rawCtx = rawCanvas.getContext('2d', { willReadFrequently: true });
const dvsCanvas = document.getElementById('dvs-canvas');
const dvsCtx = dvsCanvas.getContext('2d');
const canvasWrapper = document.getElementById('canvas-wrapper');
const epsCounter = document.getElementById('eps-counter');
const explanationBox = document.getElementById('explanation-box');

const illusionSelect = document.getElementById('illusion-select');
const dvsToggleBtn = document.getElementById('dvs-toggle');
const bioToggleBtn = document.getElementById('bio-toggle');
const scaleInput = document.getElementById('canvas-scale');
const thresholdInput = document.getElementById('threshold');
const speedInput = document.getElementById('speed');

let dvsEngine = null;
let bioFilter = null;
let currentIllusion = null;
let lastTime = performance.now();
let accumulatedEvents = 0;
let lastEpsUpdate = performance.now();

const triggerInteraction = () => {
  if (
    currentIllusion &&
    typeof currentIllusion.onUserInteraction === 'function'
  ) {
    currentIllusion.onUserInteraction();
  }
};
document.addEventListener('mousemove', triggerInteraction);
document.addEventListener('mousedown', triggerInteraction);

function initSystem() {
  const width = Config.getState('width');
  const height = Config.getState('height');

  dvsEngine = new DvsEngine(width, height);

  bioFilter = new LateralInhibitionFilter(width, height, 11, 1.0, 3.0);

  loadIllusion(illusionSelect.value);

  Config.subscribe('showDvs', (isDvsActive) => {
    dvsToggleBtn.classList.toggle('active', isDvsActive);
    dvsToggleBtn.innerText = isDvsActive
      ? 'Show Raw (RGB) View'
      : 'Show DVS (Event) View';
    dvsCanvas.classList.toggle('hidden', !isDvsActive);
    if (!isDvsActive) epsCounter.innerText = `EPS: 0 (Raw View)`;
  });

  Config.subscribe('showBioFilter', (isBioActive) => {
    bioToggleBtn.classList.toggle('active', isBioActive);
    if (isBioActive && Config.getState('showDvs')) {
      Config.setState('showDvs', false);
    }
  });

  Config.subscribe('displayScale', (scale) => {
    canvasWrapper.style.transform = `scale(${scale})`;
  });

  illusionSelect.addEventListener('change', (e) =>
    loadIllusion(e.target.value)
  );

  dvsToggleBtn.addEventListener('click', () => {
    Config.setState('showDvs', !Config.getState('showDvs'));
  });

  bioToggleBtn.addEventListener('click', () => {
    Config.setState('showBioFilter', !Config.getState('showBioFilter'));
  });

  scaleInput.addEventListener('input', (e) => {
    Config.setState('displayScale', parseFloat(e.target.value));
  });

  thresholdInput.addEventListener('input', (e) => {
    Config.setState('threshold', parseInt(e.target.value, 10));
  });

  speedInput.addEventListener('input', (e) => {
    Config.setState('speedMultiplier', parseFloat(e.target.value));
  });

  requestAnimationFrame(renderLoop);
}

function loadIllusion(id) {
  const width = Config.getState('width');
  const height = Config.getState('height');

  switch (id) {
    case 'troxler':
      currentIllusion = new Troxler(width, height);
      break;
    case 'contrast':
      currentIllusion = new Contrast(width, height);
      break;
    case 'reverse-phi':
      currentIllusion = new ReversePhi(width, height);
      break;
    case 'hermann':
      currentIllusion = new HermannGrid(width, height);
      break;
    case 'spiral':
      currentIllusion = new RotatingSpiral(width, height);
      break;
    case 'stepping-feet':
      currentIllusion = new SteppingFeet(width, height);
      break;
    case 'barberpole':
      currentIllusion = new Barberpole(width, height);
      break;
    case 'mib':
      currentIllusion = new MotionInducedBlindness(width, height);
      break;
    case 'flash-lag':
      currentIllusion = new FlashLag(width, height);
      break;
    case 'lilac-chaser':
      currentIllusion = new LilacChaser(width, height);
      break;
    default:
      throw new Error(`Unknown illusion id: ${id}`);
  }

  dvsEngine.resetHistory();
  explanationBox.innerHTML = currentIllusion.getExplanationText();

  buildCustomControls(currentIllusion);
}


function buildCustomControls(activeIllusion) {
  const container = document.getElementById('custom-controls');
  if (!container) return;

  container.innerHTML = '';

  if (typeof activeIllusion.getCustomParams !== 'function') return;

  const paramsSchema = activeIllusion.getCustomParams();
  if (!paramsSchema || paramsSchema.length === 0) return;

  const currentParams = {};

  paramsSchema.forEach((schema) => {
    currentParams[schema.id] = schema.value;
    const inputType = schema.type || 'range';

    const label = document.createElement('label');
    label.htmlFor = schema.id;

    if (inputType === 'range') {
      const input = document.createElement('input');
      input.type = 'range';
      input.id = schema.id;
      input.min = schema.min;
      input.max = schema.max;
      input.step = schema.step;
      input.value = schema.value;
      label.innerText = `${schema.label}: ${schema.value}`;

      input.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        label.innerText = `${schema.label}: ${val}`;
        currentParams[schema.id] = val;
        activeIllusion.onParamsChanged(currentParams);
      });
      container.appendChild(label);
      container.appendChild(input);
    } else if (inputType === 'checkbox') {
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.id = schema.id;
      input.checked = schema.value;
      label.innerText = schema.label;

      input.addEventListener('change', (e) => {
        currentParams[schema.id] = e.target.checked;
        activeIllusion.onParamsChanged(currentParams);
      });
      container.appendChild(label);
      container.appendChild(input);
    } else if (inputType === 'color') {
      const input = document.createElement('input');
      input.type = 'color';
      input.id = schema.id;
      input.value = schema.value;
      label.innerText = schema.label;

      input.addEventListener('input', (e) => {
        currentParams[schema.id] = e.target.value;
        activeIllusion.onParamsChanged(currentParams);
      });
      container.appendChild(label);
      container.appendChild(input);
    } else if (inputType === 'color-preview' || inputType === 'display-box') {
      const display = document.createElement('div');
      display.id = schema.id;
      display.style.width = '100%';
      display.style.height = '28px';
      display.style.backgroundColor = schema.value;
      display.style.border = '1px solid #555';
      display.style.borderRadius = '4px';
      display.style.marginTop = '4px';

      label.innerText = schema.label;
      container.appendChild(label);
      container.appendChild(display);
    } else if (inputType === 'select') {
      const select = document.createElement('select');
      select.id = schema.id;
      label.innerText = schema.label;

      schema.options.forEach((opt) => {
        const option = document.createElement('option');
        option.value = opt;
        option.innerText = opt;
        if (opt === schema.value) option.selected = true;
        select.appendChild(option);
      });

      select.addEventListener('change', (e) => {
        currentParams[schema.id] = e.target.value;
        activeIllusion.onParamsChanged(currentParams);
      });
      container.appendChild(label);
      container.appendChild(select);
    }
  });

  if (typeof activeIllusion.onParamsChanged === 'function') {
    activeIllusion.onParamsChanged(currentParams);
  }
}


function renderLoop(currentTime) {
  const deltaTime = currentTime - lastTime;
  lastTime = currentTime;

  const configState = Config.getAll();

  currentIllusion.update(deltaTime, configState);

  currentIllusion.render(rawCtx);
  let frameData = rawCtx.getImageData(
    0,
    0,
    configState.width,
    configState.height
  );

  if (configState.showBioFilter) {
    frameData = bioFilter.processFrame(frameData);
    rawCtx.putImageData(frameData, 0, 0);
  }

  if (configState.showDvs) {
    const newEvents = dvsEngine.processFrame(frameData, configState.threshold);
    dvsEngine.render(dvsCtx);

    accumulatedEvents += newEvents;
    if (currentTime - lastEpsUpdate >= 1000) {
      epsCounter.innerText = `EPS: ${accumulatedEvents.toLocaleString()}`;
      accumulatedEvents = 0;
      lastEpsUpdate = currentTime;
    }
  }

  requestAnimationFrame(renderLoop);
}

window.onload = initSystem;

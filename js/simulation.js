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

class GanglionNode {
    constructor(capacity) {
        this.voltage = 0;
        this.isSpiking = false;
        this.history = new TimeSeriesData(capacity);
    }

    receiveSignal(amount, leakRate, threshold) {
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
        this.ganglionON = new GanglionNode(capacity);
        this.ganglionOFF = new GanglionNode(capacity);
        
        this.rhodopsin = 1.0; 
        this.previousSignal = 0;
        
        this.signalON = 0;
        this.signalOFF = 0;
        this.effectiveSignal = 0;
    }

    tick(params) {
        const depletionRate = (params.intensity / 100) * 0.01;
        const recoveryRate = 0.005; 
        
        this.rhodopsin -= depletionRate;
        this.rhodopsin += recoveryRate;
        if (this.rhodopsin > 1.0) this.rhodopsin = 1.0;
        if (this.rhodopsin < 0.0) this.rhodopsin = 0.0;

        const noiseVal = (Math.random() - 0.5) * params.noise;
        const rawStimulus = Math.max(0, (params.intensity * 0.4) + noiseVal);
        
        this.effectiveSignal = rawStimulus * this.rhodopsin;

        const deltaV = this.effectiveSignal - this.previousSignal;
        
        this.signalON = deltaV > 0 ? deltaV * params.gain : 0; 
        this.signalOFF = deltaV < 0 ? Math.abs(deltaV) * params.gain : 0; 

        this.ganglionON.receiveSignal(this.signalON, params.leakRate, params.threshold);
        this.ganglionOFF.receiveSignal(this.signalOFF, params.leakRate, params.threshold);

        this.previousSignal = this.effectiveSignal;
    }
}

export class StimulusController {
    constructor() {
        this.mode = 'manual';
        this.periodMs = 1500; 
    }

    getIntensity(nowMs, currentManual) {
        if (this.mode === 'manual') return currentManual;

        const cycleTime = nowMs % this.periodMs;
        const phase = cycleTime / this.periodMs;

        switch (this.mode) {
            case 'square':
                return phase < 0.5 ? 100 : 0;
            case 'sine':
                return (Math.sin(phase * Math.PI * 2) + 1) * 50; 
            case 'sawtooth':
                return phase * 100;
            default:
                return currentManual;
        }
    }
}

import { BiologicalPipeline, StimulusController, TimeSeriesData } from './simulation.js';
import { CanvasRenderer } from './renderer.js';

class App {
    constructor() {
        this.inputs = {
            stimulus: document.getElementById('stimulus-type'),
            intensity: document.getElementById('intensity'),
            gain: document.getElementById('gain'),
            leak: document.getElementById('leak'),
            threshold: document.getElementById('threshold'),
            noise: document.getElementById('noise')
        };
        
        this.displays = {
            intensity: document.getElementById('intensity-val'),
            gain: document.getElementById('gain-val'),
            leak: document.getElementById('leak-val'),
            threshold: document.getElementById('threshold-val'),
            noise: document.getElementById('noise-val')
        };
        
        this.svgOverlay = document.getElementById('connection-lines');
        
        this.nodes = {
            led: document.getElementById('node-led'),
            photo: document.getElementById('node-photoreceptor'),
            bpON: document.getElementById('node-bipolar-on'),
            bpOFF: document.getElementById('node-bipolar-off'),
            gON: document.getElementById('node-ganglion-on'),
            gOFF: document.getElementById('node-ganglion-off'),
            nON: document.getElementById('node-nerve-on'),
            nOFF: document.getElementById('node-nerve-off')
        };

        this.fx = {
            photo: document.getElementById('fx-photo'),
            gON: document.getElementById('fx-ganglion-on'),
            gOFF: document.getElementById('fx-ganglion-off')
        };

        this.fills = {
            on: document.getElementById('fill-on'),
            off: document.getElementById('fill-off')
        };

        this.threshON = document.getElementById('thresh-on');
        this.threshOFF = document.getElementById('thresh-off');

        this.imgPhoto = document.getElementById('img-photo');
        this.lblRhodopsin = document.getElementById('rhodopsin-val');
        this.imgBpON = document.getElementById('img-bipolar-on');
        this.imgBpOFF = document.getElementById('img-bipolar-off');

        this.pipeline = new BiologicalPipeline(800);
        this.stimulusController = new StimulusController();
	this.stimulusController.mode = this.inputs.stimulus.value;
        
        this.stimulusHistory = new TimeSeriesData(800);
        
        this.rendererStimulus = new CanvasRenderer('graph-stimulus', '#00ffcc');
        this.rendererON = new CanvasRenderer('graph-on', '#43e97b');
        this.rendererOFF = new CanvasRenderer('graph-off', '#ff758c');

        this.lastPacketTime = 0;
        this.lastONTime = 0;
        this.lastOFFTime = 0;

        this.initLines();
        this.bindEvents();
        window.addEventListener('resize', () => this.initLines());
    }

    bindEvents() {
        Object.keys(this.inputs).forEach(key => {
            this.inputs[key].addEventListener('input', () => {
                if (key === 'stimulus') {
                    this.stimulusController.mode = this.inputs[key].value;
                } else {
                    this.displays[key].textContent = this.inputs[key].value;
                }
            });
        });
    }

    initLines() {
        this.svgOverlay.innerHTML = '';
        this.drawLine(this.nodes.led, this.nodes.photo);
        this.drawLine(this.nodes.photo, this.nodes.bpON);
        this.drawLine(this.nodes.photo, this.nodes.bpOFF);
        this.drawLine(this.nodes.bpON, this.nodes.gON);
        this.drawLine(this.nodes.gON, this.nodes.nON);
        this.drawLine(this.nodes.bpOFF, this.nodes.gOFF);
        this.drawLine(this.nodes.gOFF, this.nodes.nOFF);
    }

    spawnIonParticle(node) {
        const rect = node.getBoundingClientRect();
        const svgRect = this.svgOverlay.getBoundingClientRect();

        const startX = rect.left + rect.width / 2 - svgRect.left + (Math.random() - 0.5) * 40;
        const startY = rect.bottom - svgRect.top - 10;

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('r', '2');
        circle.classList.add('ion');
        this.svgOverlay.appendChild(circle);

        const animation = circle.animate([
            { transform: `translate(${startX}px, ${startY}px)`, opacity: 1 },
            { transform: `translate(${startX}px, ${startY + 30 + Math.random() * 20}px)`, opacity: 0 }
        ], {
            duration: 400 + Math.random() * 300,
            easing: 'ease-in'
        });

        animation.onfinish = () => circle.remove();
    }

    drawLine(nodeA, nodeB) {
        const rectA = nodeA.getBoundingClientRect();
        const rectB = nodeB.getBoundingClientRect();
        const svgRect = this.svgOverlay.getBoundingClientRect();

        const x1 = rectA.left + rectA.width / 2 - svgRect.left;
        const y1 = rectA.top + 35 - svgRect.top; 
        const x2 = rectB.left + rectB.width / 2 - svgRect.left;
        const y2 = rectB.top + 35 - svgRect.top;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.setAttribute('stroke', '#30363d');
        line.setAttribute('stroke-width', '2');
        this.svgOverlay.appendChild(line);
    }

    spawnPacket(startNode, endNode, type = 'normal', options = {}) {
        return new Promise(resolve => {
            const rectA = startNode.getBoundingClientRect();
            const rectB = endNode.getBoundingClientRect();
            const svgRect = this.svgOverlay.getBoundingClientRect();

            const cxA = rectA.left + rectA.width / 2 - svgRect.left;
            const cyA = rectA.top + rectA.height / 2 - svgRect.top;
            
            let x1 = cxA;
            let y1 = rectA.top + 35 - svgRect.top;
            
            const x2 = rectB.left + rectB.width / 2 - svgRect.left;
            const y2 = rectB.top + 35 - svgRect.top;

            if (type.includes('noise')) {
                const angle = Math.random() * Math.PI * 2;
                const radius = 40; 
                x1 = cxA + Math.cos(angle) * radius;
                y1 = cyA + Math.sin(angle) * radius;
            }

            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            
            if (type.includes('spike')) {
                circle.setAttribute('r', '6');
                circle.classList.add('packet', type);
            } else if (type === 'delta-on') {
                circle.setAttribute('r', '4');
                circle.classList.add('packet-on');
            } else if (type === 'delta-off') {
                circle.setAttribute('r', '4');
                circle.classList.add('packet-off');
            } else if (type.includes('noise')) {
                circle.setAttribute('r', '3');
                circle.classList.add(type === 'noise-on' ? 'vesicle-on' : 'vesicle-off');
            } else {
                circle.classList.add('packet');
                if (options.intensity !== undefined) {
                    const radius = 2 + (options.intensity / 100) * 3; 
                    const glow = options.intensity / 100;
                    circle.setAttribute('r', radius.toString());
                    circle.style.opacity = Math.max(0.3, glow);
                    circle.style.filter = `drop-shadow(0 0 ${4 + glow * 8}px #00ffcc)`;
                } else {
                    circle.setAttribute('r', '3');
                }
            }
            
            this.svgOverlay.appendChild(circle);

            const duration = type.includes('spike') ? 200 : (type.includes('noise') ? 350 : 300); 

            const animation = circle.animate([
                { transform: `translate(${x1}px, ${y1}px)` },
                { transform: `translate(${x2}px, ${y2}px)` }
            ], {
                duration: duration,
                easing: 'linear'
            });

            animation.onfinish = () => {
                circle.remove();
                resolve(); 
            };
        });
    }

    triggerRipple(container, type = 'receptor') {
        const ripple = document.createElement('div');
        ripple.classList.add(type === 'receptor' ? 'receptor-ripple' : 'micro-ripple');
        container.appendChild(ripple);
        setTimeout(() => ripple.remove(), 400); 
    }

    handleVisuals(now, params) {
        const maxThreshold = 150; 
        const threshPct = (params.threshold / maxThreshold) * 100;
        this.threshON.style.left = `${Math.min(100, threshPct)}%`;
        this.threshOFF.style.left = `${Math.min(100, threshPct)}%`;

        const rhodopsinPct = Math.round(this.pipeline.rhodopsin * 100);
        this.lblRhodopsin.textContent = `Pigment: ${rhodopsinPct}%`;
        this.imgPhoto.style.filter = `grayscale(${100 - rhodopsinPct}%) brightness(${0.5 + (this.pipeline.rhodopsin * 0.5)})`;

        const polarON = Math.min(1, this.pipeline.signalON / (20 * (params.gain / 5)));
        const polarOFF = Math.min(1, this.pipeline.signalOFF / (20 * (params.gain / 5)));
        
        this.imgBpON.style.boxShadow = `0 0 15px 2px rgba(67, 233, 123, ${polarON})`;
        this.imgBpON.style.borderColor = `rgba(67, 233, 123, ${Math.max(0.2, polarON)})`;
        
        this.imgBpOFF.style.boxShadow = `0 0 15px 2px rgba(255, 117, 140, ${polarOFF})`;
        this.imgBpOFF.style.borderColor = `rgba(255, 117, 140, ${Math.max(0.2, polarOFF)})`;

        this.fills.on.style.width = `${Math.min(100, (this.pipeline.ganglionON.voltage / maxThreshold) * 100)}%`;
        this.fills.off.style.width = `${Math.min(100, (this.pipeline.ganglionOFF.voltage / maxThreshold) * 100)}%`;

        if (params.leakRate > 0) {
            if (this.pipeline.ganglionON.voltage > 0 && Math.random() < (params.leakRate * 0.05)) {
                this.spawnIonParticle(this.nodes.gON);
            }
            if (this.pipeline.ganglionOFF.voltage > 0 && Math.random() < (params.leakRate * 0.05)) {
                this.spawnIonParticle(this.nodes.gOFF);
            }
        }

        if (params.noise > 0) {
            if (Math.random() < (params.noise * 0.015)) {
                this.spawnPacket(this.nodes.bpON, this.nodes.gON, 'noise-on').then(() => this.triggerRipple(this.fx.gON, 'micro'));
            }
            if (Math.random() < (params.noise * 0.015)) {
                this.spawnPacket(this.nodes.bpOFF, this.nodes.gOFF, 'noise-off').then(() => this.triggerRipple(this.fx.gOFF, 'micro'));
            }
        }

        const rawStimulus = params.intensity * 0.4;
        if (rawStimulus > 0 && (now - this.lastPacketTime > (1000 / (rawStimulus + 1)))) {
            this.lastPacketTime = now;
            this.spawnPacket(this.nodes.led, this.nodes.photo, 'normal', { intensity: params.intensity }).then(() => {
                this.triggerRipple(this.fx.photo, 'receptor');
            });
        }

        if (this.pipeline.signalON > 0.5 && (now - this.lastONTime > (1000 / (this.pipeline.signalON * 2 + 1)))) {
            this.lastONTime = now;
            this.spawnPacket(this.nodes.photo, this.nodes.bpON, 'delta-on');
        }
        
        if (this.pipeline.signalOFF > 0.5 && (now - this.lastOFFTime > (1000 / (this.pipeline.signalOFF * 2 + 1)))) {
            this.lastOFFTime = now;
            this.spawnPacket(this.nodes.photo, this.nodes.bpOFF, 'delta-off');
        }

        if (this.pipeline.ganglionON.isSpiking) {
            this.nodes.gON.classList.add('spike-on-glow');
            this.nodes.nON.classList.add('spike-on-glow');
            this.spawnPacket(this.nodes.gON, this.nodes.nON, 'packet-on');
            setTimeout(() => {
                this.nodes.gON.classList.remove('spike-on-glow');
                this.nodes.nON.classList.remove('spike-on-glow');
            }, 100);
        }

        if (this.pipeline.ganglionOFF.isSpiking) {
            this.nodes.gOFF.classList.add('spike-off-glow');
            this.nodes.nOFF.classList.add('spike-off-glow');
            this.spawnPacket(this.nodes.gOFF, this.nodes.nOFF, 'packet-off');
            setTimeout(() => {
                this.nodes.gOFF.classList.remove('spike-off-glow');
                this.nodes.nOFF.classList.remove('spike-off-glow');
            }, 100);
        }
    }

    loop(now) {
        const manualIntensity = parseInt(this.inputs.intensity.value, 10);
        const autoIntensity = this.stimulusController.getIntensity(now, manualIntensity);

        if (this.stimulusController.mode !== 'manual') {
            this.inputs.intensity.value = autoIntensity;
            this.displays.intensity.textContent = Math.round(autoIntensity);
        }

        const params = {
            intensity: autoIntensity,
            gain: parseFloat(this.inputs.gain.value),
            leakRate: parseFloat(this.inputs.leak.value),
            threshold: parseInt(this.inputs.threshold.value, 10),
            noise: parseFloat(this.inputs.noise.value)
        };

        this.stimulusHistory.push(params.intensity, 0);
        this.pipeline.tick(params);
        
        this.rendererStimulus.draw(this.stimulusHistory, null, 100); 
        this.rendererON.draw(this.pipeline.ganglionON.history, params.threshold, 150);
        this.rendererOFF.draw(this.pipeline.ganglionOFF.history, params.threshold, 150);
        
        this.handleVisuals(now, params);
        
        requestAnimationFrame((ts) => this.loop(ts));
    }

    start() {
        requestAnimationFrame((ts) => this.loop(ts));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.start();
});

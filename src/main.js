import './style.css';
import { CloudScene } from './cloud.js';
import { ParticleSystem } from './particles.js';
import { CounterManager } from './counter.js';
import gsap from 'gsap';

document.addEventListener('DOMContentLoaded', () => {
    const cloud = new CloudScene('canvas-container');
    const particles = new ParticleSystem();
    const counters = new CounterManager();

    const dumpBtn = document.getElementById('dump-btn');

    dumpBtn.addEventListener('click', (e) => {
        // 1. Spawn particles
        particles.spawnParticles(dumpBtn);

        // 2. Increment counters
        counters.increment();

        // 3. Button animation (Outline color change)
        // "Animate white button outline color change to green-brown gradient"
        // CSS border animation is tricky, can use gsap on borderColor
        gsap.to(dumpBtn, {
            borderColor: "#4a5d23",
            duration: 0.1,
            yoyo: true,
            repeat: 1,
            onComplete: () => {
                dumpBtn.style.borderColor = "white";
            }
        });

        // 4. Cloud growth (simplified)
        // cloud.grow(...);
    });
});

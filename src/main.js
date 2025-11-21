import './style.css';
import { CloudScene } from './cloud.js';
import { CounterManager } from './counter.js';
import gsap from 'gsap';

document.addEventListener('DOMContentLoaded', () => {
    const cloud = new CloudScene('canvas-container');
    const counters = new CounterManager();

    const dumpBtn = document.getElementById('dump-btn');
    const particleContainer = document.getElementById('particle-container');

    dumpBtn.addEventListener('click', (e) => {
        // 1. Spawn Gooey Particles
        spawnGooeyParticles(dumpBtn, particleContainer);

        // 2. Increment counters
        counters.increment();

        // 3. Button animation
        gsap.to(dumpBtn, {
            borderColor: "#4a5d23",
            duration: 0.1,
            yoyo: true,
            repeat: 1,
            onComplete: () => {
                dumpBtn.style.borderColor = "white";
            }
        });
    });

    function spawnGooeyParticles(btn, container) {
        const rect = btn.getBoundingClientRect();
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2; // Target: Center of screen (Main Object)

        for (let i = 0; i < 10; i++) {
            const p = document.createElement('div');
            p.classList.add('gooey-particle');

            // Random size 5px to 20px
            const size = 5 + Math.random() * 15;
            p.style.width = `${size}px`;
            p.style.height = `${size}px`;

            // Gradient Color (Fire Palette)
            const gradients = [
                'radial-gradient(circle at 30% 30%, #ffeb3b, #ff9800)', // Yellow -> Orange
                'radial-gradient(circle at 30% 30%, #ff9800, #f44336)', // Orange -> Red
                'radial-gradient(circle at 30% 30%, #ffffff, #ffeb3b)', // White -> Yellow
                'radial-gradient(circle at 30% 30%, #f44336, #d32f2f)'  // Red -> Dark Red
            ];
            const gradient = gradients[Math.floor(Math.random() * gradients.length)];
            p.style.backgroundImage = gradient;

            // Spawn at random border position
            // Perimeter = 2w + 2h
            const perimeter = 2 * rect.width + 2 * rect.height;
            const pos = Math.random() * perimeter;
            let startX, startY;

            if (pos < rect.width) { // Top
                startX = rect.left + pos;
                startY = rect.top;
            } else if (pos < rect.width + rect.height) { // Right
                startX = rect.right;
                startY = rect.top + (pos - rect.width);
            } else if (pos < 2 * rect.width + rect.height) { // Bottom
                startX = rect.right - (pos - (rect.width + rect.height));
                startY = rect.bottom;
            } else { // Left
                startX = rect.left;
                startY = rect.bottom - (pos - (2 * rect.width + rect.height));
            }

            p.style.left = `${startX}px`;
            p.style.top = `${startY}px`;
            container.appendChild(p);

            // Animate
            animateParticle(p, startX, startY, centerX, centerY);
        }
    }

    function animateParticle(el, startX, startY, targetX, targetY) {
        let progress = 0;
        const speed = 0.005 + Math.random() * 0.005; // Random speed

        // Random control points for "2 smooth direction changes"
        // We can use a cubic bezier or just sine wave offsets
        // Let's use sine wave offsets for "fluid" feel
        const offsetFreq = 0.05 + Math.random() * 0.05;
        const offsetAmp = 50 + Math.random() * 50;
        const phase = Math.random() * Math.PI * 2;

        function loop() {
            progress += speed;
            if (progress >= 1) {
                el.remove();
                return;
            }

            // Linear interpolation
            const currentX = startX + (targetX - startX) * progress;
            const currentY = startY + (targetY - startY) * progress;

            // Add fluid noise/wave
            // 2 direction changes can be simulated by a sine wave with ~1 period
            const wave = Math.sin(progress * Math.PI * 2 + phase);

            // Perpendicular vector to path
            const dx = targetX - startX;
            const dy = targetY - startY;
            const len = Math.sqrt(dx * dx + dy * dy);
            const nx = -dy / len;
            const ny = dx / len;

            const x = currentX + nx * wave * offsetAmp * (1 - progress); // Dampen amplitude as it gets closer
            const y = currentY + ny * wave * offsetAmp * (1 - progress);

            el.style.left = `${x}px`;
            el.style.top = `${y}px`;

            // Scale down at the end (absorb)
            if (progress > 0.8) {
                el.style.transform = `scale(${1 - (progress - 0.8) * 5})`;
            }

            requestAnimationFrame(loop);
        }
        loop();
    }
});

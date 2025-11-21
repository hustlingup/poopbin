import './style.css';
import { CloudScene } from './cloud.js';
import { CounterManager } from './counter.js';
import gsap from 'gsap';
import * as THREE from 'three';

document.addEventListener('DOMContentLoaded', () => {
    const cloud = new CloudScene('canvas-container');
    const counters = new CounterManager();

    const dumpBtn = document.getElementById('dump-btn');
    const colorsBtn = document.getElementById('btn-colors');
    const particleContainer = document.getElementById('particle-container');

    let currentThemeColor = '#ffff00'; // Default yellow

    if (colorsBtn) {
        colorsBtn.addEventListener('click', () => {
            // Random hex color
            const randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
            currentThemeColor = randomColor;

            // Update cloud
            if (cloud) cloud.updateColor(randomColor);

            // Animate button
            gsap.to(colorsBtn, {
                scale: 0.9,
                yoyo: true,
                repeat: 1,
                duration: 0.1
            });
        });
    }

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
        const centerY = window.innerHeight / 2;

        // Define "Surface" radius (approximate fire size)
        const surfaceRadius = 60;

        for (let i = 0; i < 10; i++) {
            const p = document.createElement('div');
            p.classList.add('gooey-particle');

            // Random size 5px to 30px
            const size = 5 + Math.random() * 25;
            p.style.width = `${size}px`;
            p.style.height = `${size}px`;

            // Dynamic Gradient Color based on currentThemeColor
            const base = new THREE.Color(currentThemeColor);
            const hsl = {};
            base.getHSL(hsl);

            // Generate variations
            const lighter = new THREE.Color().setHSL(hsl.h, hsl.s, Math.min(1, hsl.l + 0.1)).getStyle();
            const darker = new THREE.Color().setHSL(hsl.h, hsl.s, Math.max(0, hsl.l - 0.2)).getStyle();
            const core = '#ffffff';
            const baseStyle = base.getStyle();

            const gradients = [
                `radial-gradient(circle at 30% 30%, ${core} 0%, ${baseStyle} 20%, ${darker} 100%)`,
                `radial-gradient(circle at 30% 30%, ${baseStyle} 0%, ${lighter} 40%, ${darker} 100%)`,
                `radial-gradient(circle at 30% 30%, ${core} 10%, ${baseStyle} 30%, ${darker} 100%)`
            ];

            const gradient = gradients[Math.floor(Math.random() * gradients.length)];
            p.style.backgroundImage = gradient;

            // Spawn at random border position
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

            // Calculate random destination on the surface
            const angle = Math.random() * Math.PI * 2;
            const targetX = centerX + Math.cos(angle) * surfaceRadius;
            const targetY = centerY + Math.sin(angle) * surfaceRadius;

            // Animate
            animateParticle(p, startX, startY, targetX, targetY, angle);
        }
    }

    function animateParticle(el, startX, startY, targetX, targetY, angle) {
        let progress = 0;
        const speed = 0.005 + Math.random() * 0.005; // Random speed

        const offsetFreq = 0.05 + Math.random() * 0.05;
        const offsetAmp = 50 + Math.random() * 50;
        const phase = Math.random() * Math.PI * 2;

        function loop() {
            progress += speed;
            if (progress >= 1) {
                el.remove();
                // Trigger ripple on the 3D object
                if (cloud && cloud.triggerRipple) {
                    cloud.triggerRipple(angle);
                }
                return;
            }

            // Linear interpolation
            const currentX = startX + (targetX - startX) * progress;
            const currentY = startY + (targetY - startY) * progress;

            // Add fluid noise/wave
            const wave = Math.sin(progress * Math.PI * 2 + phase);

            // Perpendicular vector to path
            const dx = targetX - startX;
            const dy = targetY - startY;
            const len = Math.sqrt(dx * dx + dy * dy);
            const nx = -dy / len;
            const ny = dx / len;

            // Dampen amplitude as it gets closer to 1 to hit the target precisely
            const amp = offsetAmp * (1 - progress);

            const x = currentX + nx * wave * amp;
            const y = currentY + ny * wave * amp;

            el.style.left = `${x}px`;
            el.style.top = `${y}px`;

            // Absorption Effect (Gooey Merge)
            // Start shrinking/fading when close
            if (progress > 0.85) {
                const absorbProgress = (progress - 0.85) / 0.15; // 0 to 1
                // Scale down
                const scale = 1 - absorbProgress;
                // Maybe stretch towards the center to look like being sucked in?
                // For now, simple scale is good for gooey effect
                el.style.transform = `scale(${scale})`;
                el.style.opacity = `${scale}`;
            }

            requestAnimationFrame(loop);
        }
        loop();
    }
});

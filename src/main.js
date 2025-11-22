import './style.css';
import { SlimeScene } from './slime.js';
import { CounterManager } from './counter.js';
import gsap from 'gsap';
import * as THREE from 'three';

document.addEventListener('DOMContentLoaded', () => {
    const slime = new SlimeScene('canvas-container');
    const counters = new CounterManager();

    const dumpBtn = document.getElementById('dump-btn');
    const colorsBtn = document.getElementById('btn-colors');
    const particleContainer = document.getElementById('particle-container');

    let currentThemeColor = '#ffff00'; // Default yellow

    // --- Particle Manager for Optimization ---
    const particleManager = {
        particles: [],
        isRunning: false,

        add(el, startX, startY, targetX, targetY, angle) {
            this.particles.push({
                el,
                startX,
                startY,
                targetX,
                targetY,
                angle,
                progress: 0,
                speed: 0.003 + Math.random() * 0.003,
                offsetFreq: 0.05 + Math.random() * 0.05,
                offsetAmp: 50 + Math.random() * 50,
                phase: Math.random() * Math.PI * 2
            });

            if (!this.isRunning) {
                this.isRunning = true;
                this.loop();
            }
        },

        loop() {
            if (this.particles.length === 0) {
                this.isRunning = false;
                return;
            }

            // Process backwards to allow safe removal
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                p.progress += p.speed;

                if (p.progress >= 1) {
                    p.el.remove();
                    // Trigger ripple on the 3D object
                    if (slime && slime.triggerRipple) {
                        slime.triggerRipple(p.angle);
                    }
                    this.particles.splice(i, 1);
                    continue;
                }

                // Linear interpolation
                const currentX = p.startX + (p.targetX - p.startX) * p.progress;
                const currentY = p.startY + (p.targetY - p.startY) * p.progress;

                // Add fluid noise/wave
                const wave = Math.sin(p.progress * Math.PI * 2 + p.phase);

                // Perpendicular vector to path
                const dx = p.targetX - p.startX;
                const dy = p.targetY - p.startY;
                const len = Math.sqrt(dx * dx + dy * dy);
                const nx = -dy / len; // Normal X
                const ny = dx / len;  // Normal Y

                // Dampen amplitude as it gets closer to 1 to hit the target precisely
                const amp = p.offsetAmp * (1 - p.progress);

                const x = currentX + nx * wave * amp;
                const y = currentY + ny * wave * amp;

                p.el.style.left = `${x}px`;
                p.el.style.top = `${y}px`;

                // Absorption Effect (Gooey Merge)
                if (p.progress > 0.85) {
                    const absorbProgress = (p.progress - 0.85) / 0.15; // 0 to 1
                    const scale = 1 - absorbProgress;
                    p.el.style.transform = `scale(${scale})`;
                    p.el.style.opacity = `${scale}`;
                }
            }

            requestAnimationFrame(() => this.loop());
        }
    };

    if (colorsBtn) {
        colorsBtn.addEventListener('click', () => {
            // Random bright color using HSL
            // Hue: 0-1 (all colors)
            // Saturation: 0.6-1.0 (vivid)
            // Lightness: 0.4-0.7 (avoid too dark or too white)
            const hue = Math.random();
            const saturation = 0.6 + Math.random() * 0.4;
            const lightness = 0.4 + Math.random() * 0.3;

            const color = new THREE.Color().setHSL(hue, saturation, lightness);
            const randomColor = '#' + color.getHexString();
            currentThemeColor = randomColor;

            // Update cloud
            if (slime) slime.updateColor(randomColor);

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

        // Reduced count to 3
        for (let i = 0; i < 3; i++) {
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

            // Add to manager instead of starting individual loop
            particleManager.add(p, startX, startY, targetX, targetY, angle);
        }
    }
});

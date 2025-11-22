import './style.css';
import { MainScene } from './slime.js';
import { CounterManager } from './counter.js';
import gsap from 'gsap';
import * as THREE from 'three';

document.addEventListener('DOMContentLoaded', () => {
    const mainScene = new MainScene('canvas-container');
    const counters = new CounterManager();

    const dumpBtn = document.getElementById('dump-btn');
    const colorsBtn = document.getElementById('btn-colors');
    const changeBtn = document.getElementById('btn-change');
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
                    if (mainScene && mainScene.triggerRipple) {
                        mainScene.triggerRipple(p.angle);
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
            if (mainScene) mainScene.updateColor(randomColor);

            // Animate button
            gsap.to(colorsBtn, {
                scale: 0.9,
                yoyo: true,
                repeat: 1,
                duration: 0.1
            });
        });
    }

    if (changeBtn) {
        changeBtn.addEventListener('click', () => {
            if (mainScene) {
                const newShape = mainScene.nextShape();
                console.log('Switched to shape:', newShape);
            }

            // Animate button
            gsap.to(changeBtn, {
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
        const surfaceRadius = 60;
        const currentShape = mainScene ? mainScene.currentShape : 'slime';

        // Reduced count to 3
        for (let i = 0; i < 3; i++) {
            const p = document.createElement('div');
            p.classList.add('gooey-particle');

            // Default Size
            let size = 5 + Math.random() * 25;

            // Shape specific styles
            let color1, color2, color3;
            let borderRadius = '50%';

            if (currentShape === 'flower') {
                // Petals: Pink/Red/Purple
                color1 = '#ff69b4'; // HotPink
                color2 = '#ff1493'; // DeepPink
                color3 = '#da70d6'; // Orchid
                borderRadius = '50% 0 50% 0'; // Petal shape
                p.style.transform = `rotate(${Math.random() * 360}deg)`;
            } else if (currentShape === 'fire') {
                // Fire: Red/Orange/Yellow
                color1 = '#ffff00';
                color2 = '#ff4500';
                color3 = '#ff0000';
                borderRadius = '50% 50% 50% 0'; // Teardrop
                size = 10 + Math.random() * 20;
            } else if (currentShape === 'cloud') {
                // Cloud: White/Gray
                color1 = '#ffffff';
                color2 = '#dddddd';
                color3 = '#bbbbbb';
                size = 20 + Math.random() * 30; // Larger puffs
            } else if (currentShape === 'plasmaball') {
                // Plasma: Cyan/Blue/White
                color1 = '#ffffff';
                color2 = '#00ffff';
                color3 = '#0000ff';
                size = 5 + Math.random() * 10; // Small sparks
            } else {
                // Slime (Default)
                // Dynamic Gradient Color based on currentThemeColor
                const base = new THREE.Color(currentThemeColor);
                const hsl = {};
                base.getHSL(hsl);
                color1 = '#ffffff'; // Core
                color2 = base.getStyle(); // Base
                color3 = new THREE.Color().setHSL(hsl.h, hsl.s, Math.max(0, hsl.l - 0.2)).getStyle(); // Darker
            }

            p.style.width = `${size}px`;
            p.style.height = `${size}px`;
            p.style.borderRadius = borderRadius;

            const gradients = [
                `radial-gradient(circle at 30% 30%, ${color1} 0%, ${color2} 20%, ${color3} 100%)`,
                `radial-gradient(circle at 30% 30%, ${color2} 0%, ${color1} 40%, ${color3} 100%)`,
                `radial-gradient(circle at 30% 30%, ${color1} 10%, ${color2} 30%, ${color3} 100%)`
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

            // Add to manager
            particleManager.add(p, startX, startY, targetX, targetY, angle);
        }
    }
});

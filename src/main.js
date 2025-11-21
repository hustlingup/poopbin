import './style.css';
import { CloudScene } from './cloud.js';
import { CounterManager } from './counter.js';
import gsap from 'gsap';
import * as THREE from 'three';
import { SimplexNoise } from './utils/noise.js';

document.addEventListener('DOMContentLoaded', () => {
    const cloud = new CloudScene('canvas-container');
    const counters = new CounterManager();

    const dumpBtn = document.getElementById('dump-btn');
    const colorsBtn = document.getElementById('btn-colors');
    const particleContainer = document.getElementById('particle-container');

    let currentThemeColor = '#ffff00'; // Default yellow

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

    const noise = new SimplexNoise();

    function spawnGooeyParticles(btn, container) {
        const rect = btn.getBoundingClientRect();
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        // Define "Surface" radius (approximate fire size)
        const surfaceRadius = 40; // Slightly smaller to go "into" the fire

        for (let i = 0; i < 12; i++) { // Increased count slightly
            const p = document.createElement('div');
            p.classList.add('gooey-particle');

            // Random size 10px to 35px
            const size = 10 + Math.random() * 25;
            p.style.width = `${size}px`;
            p.style.height = `${size}px`;

            // Initial Colors
            const base = new THREE.Color(currentThemeColor);
            const hsl = {};
            base.getHSL(hsl);

            // Store initial HSL for degradation
            p.dataset.h = hsl.h;
            p.dataset.s = hsl.s;
            p.dataset.l = hsl.l;

            // Set initial look
            updateParticleAppearance(p, 0, size);

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
            animateParticle(p, startX, startY, targetX, targetY, angle, size);
        }
    }

    function updateParticleAppearance(p, progress, size) {
        // Degradation Logic
        // 0.0 -> 1.0
        // Glossy/Vibrant -> Matte/Absorbed

        const h = parseFloat(p.dataset.h);
        const s = parseFloat(p.dataset.s);
        const l = parseFloat(p.dataset.l);

        // As progress increases:
        // Saturation decreases slightly
        // Lightness decreases (gets darker/absorbed)
        // Core opacity decreases (glossiness fades)

        const currentS = s * (1 - progress * 0.3);
        const currentL = l * (1 - progress * 0.5); // Darken significantly

        const baseColor = new THREE.Color().setHSL(h, currentS, currentL);
        const darkerColor = new THREE.Color().setHSL(h, currentS, Math.max(0, currentL - 0.2));

        // Specular highlight (Core)
        // Fades out as progress goes > 0.5
        const coreOpacity = Math.max(0, 1 - progress * 1.5);
        const coreColor = `rgba(255, 255, 255, ${coreOpacity})`;

        const baseStyle = baseColor.getStyle();
        const darkerStyle = darkerColor.getStyle();

        // Shift gradient center slightly to simulate 3D sphere rotation/movement
        const gradX = 30 + progress * 20; // 30% -> 50%
        const gradY = 30 + progress * 20;

        const gradient = `radial-gradient(circle at ${gradX}% ${gradY}%, ${coreColor} 0%, ${baseStyle} 40%, ${darkerStyle} 100%)`;

        p.style.backgroundImage = gradient;
        p.style.boxShadow = `0 0 ${10 * (1 - progress)}px ${baseStyle}`; // Glow fades
    }

    function animateParticle(el, startX, startY, targetX, targetY, angle, size) {
        let progress = 0;
        const duration = 100 + Math.random() * 100; // Frames roughly
        const speed = 1 / duration;

        // Fluid Noise Parameters
        const noiseScale = 0.005; // Spatial scale
        const timeScale = 0.01;   // Temporal scale
        const amp = 30;           // Amplitude of noise displacement

        // Unique offset for this particle
        const seed = Math.random() * 1000;

        function loop() {
            progress += speed;

            if (progress >= 1) {
                el.remove();
                if (cloud && cloud.triggerRipple) {
                    cloud.triggerRipple(angle);
                }
                return;
            }

            // 1. Linear Path
            const linearX = startX + (targetX - startX) * progress;
            const linearY = startY + (targetY - startY) * progress;

            // 2. Fluid Noise Displacement
            // We use noise to perturb the position
            const nX = noise.noise2D(linearX * noiseScale, progress * 10 + seed);
            const nY = noise.noise2D(linearY * noiseScale, progress * 10 + seed + 100);

            // Fade in noise, then fade out near target to ensure it hits the center
            const noiseStrength = Math.sin(progress * Math.PI) * amp;

            const x = linearX + nX * noiseStrength;
            const y = linearY + nY * noiseStrength;

            el.style.left = `${x}px`;
            el.style.top = `${y}px`;

            // 3. Appearance & Degradation
            updateParticleAppearance(el, progress, size);

            // 4. Scale/Absorb
            // Start shrinking later, very fast at the end
            if (progress > 0.8) {
                const absorb = (progress - 0.8) / 0.2;
                const scale = 1 - absorb;
                el.style.transform = `scale(${scale})`;
                el.style.opacity = `${scale}`;
            } else {
                // Slight pulse or stretch could go here
                el.style.transform = `scale(1)`;
                el.style.opacity = `1`;
            }

            requestAnimationFrame(loop);
        }
        loop();
    }
});

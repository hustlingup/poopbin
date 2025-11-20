import gsap from 'gsap';

export class ParticleSystem {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        // We can use a separate canvas for particles or just DOM elements.
        // Spec says "5–10 small cloud particles spawn... fly upward... absorbed into main cloud"
        // DOM elements might be easier for simple 2D overlay, but Three.js particles would be more performant if many.
        // Given the "absorbed into main cloud" (which is 3D), maybe 3D particles are better?
        // But the button is 2D HTML. 
        // Let's use DOM elements for now as it's easier to position relative to the button.
        // Or use a 2D canvas overlay.

        // Let's use simple DOM elements for MVP.
    }

    spawnParticles(buttonElement) {
        const rect = buttonElement.getBoundingClientRect();
        const count = Math.floor(Math.random() * 6) + 5; // 5-10

        for (let i = 0; i < count; i++) {
            this.createParticle(rect);
        }
    }

    createParticle(buttonRect) {
        const el = document.createElement('div');
        el.classList.add('particle');

        // Style
        el.style.position = 'absolute';
        el.style.width = '10px';
        el.style.height = '10px';
        el.style.borderRadius = '50%';
        el.style.backgroundColor = '#4a5d23'; // Match cloud color
        el.style.opacity = '0.8';
        el.style.pointerEvents = 'none';
        el.style.zIndex = '100'; // Above UI? Or below? Spec says "absorbed into main cloud"
        // If cloud is in canvas (z-index 1) and UI is z-index 10, particles need to be in between or on top.
        // Let's put them on top for now.

        // Initial position: top outline of button
        const startX = buttonRect.left + Math.random() * buttonRect.width;
        const startY = buttonRect.top;

        el.style.left = `${startX}px`;
        el.style.top = `${startY}px`;

        document.body.appendChild(el);

        // Animate
        // Fly upward in random direction
        // "Absorbed into main cloud" -> Cloud is at center of screen (50% 50%)
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        // Randomize target slightly around center
        const targetX = centerX + (Math.random() - 0.5) * 100;
        const targetY = centerY + (Math.random() - 0.5) * 100;

        gsap.to(el, {
            x: targetX - startX,
            y: targetY - startY,
            opacity: 0,
            scale: 0.5,
            duration: 1,
            ease: "power2.in",
            onComplete: () => {
                el.remove();
            }
        });
    }
}

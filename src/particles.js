import gsap from 'gsap';

export class ParticleSystem {
    constructor() {
        this.container = document.getElementById('particle-container');
    }

    spawnParticles(buttonElement) {
        const rect = buttonElement.getBoundingClientRect();
        const count = Math.floor(Math.random() * 8) + 8; // More particles for goo effect

        for (let i = 0; i < count; i++) {
            this.createParticle(rect);
        }
    }

    createParticle(buttonRect) {
        const el = document.createElement('div');
        el.classList.add('particle');

        // Size variation
        const size = Math.random() * 20 + 10; // 10-30px
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;

        // Color: Vibrant Green to Dark Brown mix
        // Mostly green for the "energy" look
        el.style.backgroundColor = Math.random() > 0.3 ? '#00ffaa' : '#4a5d23';

        // Initial position: Center of button
        const startX = buttonRect.left + buttonRect.width / 2 - size / 2;
        const startY = buttonRect.top + buttonRect.height / 2 - size / 2;

        el.style.left = `${startX}px`;
        el.style.top = `${startY}px`;

        this.container.appendChild(el);

        // Animate
        // Fly upward towards center
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        // Randomize target
        const targetX = centerX + (Math.random() - 0.5) * 50;
        const targetY = centerY + (Math.random() - 0.5) * 50;

        gsap.to(el, {
            x: targetX - startX,
            y: targetY - startY,
            scale: 0, // Shrink as it gets absorbed
            duration: Math.random() * 1 + 0.5, // 0.5 - 1.5s
            ease: "power2.in",
            onComplete: () => {
                el.remove();
            }
        });
    }
}

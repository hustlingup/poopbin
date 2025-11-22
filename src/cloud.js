import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class CloudScene {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`Container with id '${containerId}' not found.`);
      return;
    }
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050505); // Dark background

    // Camera
    this.camera = new THREE.PerspectiveCamera(60, this.width / this.height, 0.1, 1000);
    this.camera.position.set(0, 20, 120);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.maxDistance = 300;
    this.controls.minDistance = 50;

    // Clock
    this.clock = new THREE.Clock();

    // this.initFire(); // Removed background plane

    // this.initParticles(); // Removed spark effect
    this.addEvents();
    this.animate();
  }

  // initFire removed


  // triggerRipple removed


  // updateColor removed


  initParticles() {
    // Fire Particles Overlay
    const particleCount = 1600;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const lifetimes = new Float32Array(particleCount);
    const ages = new Float32Array(particleCount);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      this.resetParticle(i, positions, velocities, lifetimes, ages, sizes, true);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Create a simple circle texture programmatically
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.4, 'rgba(255, 200, 0, 0.8)');
    grad.addColorStop(1, 'rgba(255, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      map: texture,
      size: 1.0,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: false,
      color: 0xffaa00
    });

    this.particles = new THREE.Points(geometry, material);
    this.particles.userData = { velocities, lifetimes, ages, sizes };
    this.scene.add(this.particles);
  }

  resetParticle(i, pos, vel, life, age, size, initial = false) {
    // Emit from bottom center
    const r = Math.random() * 10;
    const theta = Math.random() * Math.PI * 2;

    pos[i * 3] = r * Math.cos(theta);     // x
    pos[i * 3 + 1] = -30 + Math.random() * 10; // y (start at bottom of fire)
    pos[i * 3 + 2] = r * Math.sin(theta); // z

    // Upward velocity with spread
    vel[i * 3] = (Math.random() - 0.5) * 20;
    vel[i * 3 + 1] = 50 + Math.random() * 100; // Speed ~200 scaled down
    vel[i * 3 + 2] = (Math.random() - 0.5) * 20;

    life[i] = 1.0 + Math.random() * 1.5;
    age[i] = initial ? Math.random() * life[i] : 0;
    size[i] = 20 + Math.random() * 20; // Size ~40
  }

  addEvents() {
    window.addEventListener('resize', this.onResize.bind(this));
  }

  onResize() {
    if (!this.container) return;
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    this.renderer.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();
    const elapsed = this.clock.elapsedTime;

    // Update Fire Mesh
    // Fire Mesh update removed


    // Update Particles
    if (this.particles) {
      const positions = this.particles.geometry.attributes.position.array;
      const { velocities, lifetimes, ages, sizes } = this.particles.userData;

      for (let i = 0; i < lifetimes.length; i++) {
        ages[i] += delta;

        if (ages[i] > lifetimes[i]) {
          this.resetParticle(i, positions, velocities, lifetimes, ages, sizes);
        } else {
          // Move
          positions[i * 3] += velocities[i * 3] * delta;
          positions[i * 3 + 1] += velocities[i * 3 + 1] * delta;
          positions[i * 3 + 2] += velocities[i * 3 + 2] * delta;

          // Drag / Gravity-ish
          velocities[i * 3] *= 0.98;
          velocities[i * 3 + 2] *= 0.98;
        }
      }
      this.particles.geometry.attributes.position.needsUpdate = true;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

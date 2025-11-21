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
    this.scene.background = new THREE.Color(0x111118);

    // Camera
    this.camera = new THREE.PerspectiveCamera(60, this.width / this.height, 0.1, 1000);
    this.camera.position.set(0, 80, 350);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    // Clock
    this.clock = new THREE.Clock();

    this.init();
    this.addEvents();
    this.animate();
  }

  init() {
    // Lights
    this.scene.add(new THREE.AmbientLight(0x404060, 1.5));
    const topLight = new THREE.DirectionalLight(0xaaddff, 1);
    topLight.position.set(200, 300, 200);
    this.scene.add(topLight);

    // Smoke Texture
    const smokeTex = new THREE.TextureLoader().load('/textures/smoke.png');

    // 3D Blobby Ball
    const ballGeo = new THREE.IcosahedronGeometry(80, 4);
    this.blobbyBall = new THREE.Mesh(ballGeo, new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        colorA: { value: new THREE.Color(0x00ffaa) },
        colorB: { value: new THREE.Color(0x8b4513) }
      },
      vertexShader: `
        varying vec3 vPos;
        uniform float time;
        void main(){
            vPos = position;
            vec3 p = position * (1.0 + 0.15 * sin(time*2.0 + length(position)*0.1));
            gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vPos;
        uniform vec3 colorA;
        uniform vec3 colorB;
        void main(){
            float mixVal = smoothstep(-80.0,80.0,vPos.y);
            vec3 col = mix(colorB,colorA,mixVal);
            gl_FragColor = vec4(col*0.9, 0.9);
        }
      `,
      transparent: true,
      depthWrite: false
    }));
    this.scene.add(this.blobbyBall);

    // Smoke Particles
    this.particleCount = 1200;
    this.geometry = new THREE.BufferGeometry();

    this.positions = new Float32Array(this.particleCount * 3);
    this.velocities = new Float32Array(this.particleCount * 3);
    this.ages = new Float32Array(this.particleCount);
    this.lifetimes = new Float32Array(this.particleCount);
    this.customSizes = new Float32Array(this.particleCount);
    this.colorArray = new Float32Array(this.particleCount * 3);
    this.alphas = new Float32Array(this.particleCount);

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('customColor', new THREE.BufferAttribute(this.colorArray, 3));
    this.geometry.setAttribute('customSize', new THREE.BufferAttribute(this.customSizes, 1).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('alpha', new THREE.BufferAttribute(this.alphas, 1).setUsage(THREE.DynamicDrawUsage));

    const material = new THREE.PointsMaterial({
      map: smokeTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
      sizeAttenuation: true,
      size: 1.0
    });

    material.onBeforeCompile = (shader) => {
      shader.vertexShader = `
        attribute float customSize;
        attribute float alpha;
        varying float vAlpha;
        ${shader.vertexShader}
      `.replace(
        `#include <color_vertex>`,
        `#include <color_vertex>
        vAlpha = alpha;`
      ).replace(
        `gl_PointSize = size;`,
        `gl_PointSize = customSize;`
      );
      shader.fragmentShader = `
        varying float vAlpha;
        ${shader.fragmentShader}
      `.replace(
        `gl_FragColor = vec4( color * vColor, opacity );`,
        `gl_FragColor = vec4( color * vColor, opacity * vAlpha );`
      );
    };

    this.smoke = new THREE.Points(this.geometry, material);
    this.scene.add(this.smoke);

    // Emitters
    this.emitters = [];
    for (let i = 0; i < 100; i++) {
      let phi = Math.acos(2 * Math.random() - 1);
      if (Math.cos(phi) > 0.0) phi = Math.PI - phi;
      const theta = Math.random() * Math.PI * 2;
      const r = 82 + Math.random() * 10;
      this.emitters.push(new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
      ));
    }

    // Initial spawn
    for (let i = 0; i < this.particleCount; i++) this.spawn(i);
  }

  spawn(i) {
    const e = this.emitters[i % this.emitters.length];
    this.positions[i * 3] = e.x;
    this.positions[i * 3 + 1] = e.y;
    this.positions[i * 3 + 2] = e.z;

    const normal = e.clone().normalize();
    const tangent = new THREE.Vector3().crossVectors(normal, new THREE.Vector3(0, 1, 0)).normalize();
    if (tangent.lengthSq() < 0.01) tangent.set(1, 0, 0);

    const vel = new THREE.Vector3()
      .addScaledVector(tangent, (Math.random() - 0.5) * 20)
      .addScaledVector(normal, 10 + Math.random() * 25)
      .add(new THREE.Vector3(0, 40 + Math.random() * 40, 0));

    this.velocities[i * 3] = vel.x;
    this.velocities[i * 3 + 1] = vel.y;
    this.velocities[i * 3 + 2] = vel.z;

    this.ages[i] = 0;
    this.lifetimes[i] = 4 + Math.random() * 5;
    this.customSizes[i] = 15 + Math.random() * 35;
    this.alphas[i] = 1.0;

    if (Math.random() > 0.5) {
      this.colorArray[i * 3] = 0.0; this.colorArray[i * 3 + 1] = 1.0; this.colorArray[i * 3 + 2] = 0.7;
    } else {
      this.colorArray[i * 3] = 0.545; this.colorArray[i * 3 + 1] = 0.27; this.colorArray[i * 3 + 2] = 0.075;
    }
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

    if (this.blobbyBall) {
      this.blobbyBall.material.uniforms.time.value = elapsed;
      this.blobbyBall.rotation.y += delta * 0.05;
    }

    if (this.geometry) {
      const pos = this.geometry.getAttribute('position');
      const sizeAttr = this.geometry.getAttribute('customSize');
      const alphaAttr = this.geometry.getAttribute('alpha');
      const col = this.geometry.getAttribute('customColor');

      for (let i = 0; i < this.particleCount; i++) {
        this.ages[i] += delta;

        if (this.ages[i] > this.lifetimes[i]) {
          this.spawn(i);
          continue;
        }

        const prog = this.ages[i] / this.lifetimes[i];

        // Physics
        this.velocities[i * 3 + 1] += 35 * delta;
        this.velocities[i * 3] += (Math.sin(elapsed + i * 0.7) * 10 - this.velocities[i * 3] * 0.4) * delta;
        this.velocities[i * 3 + 2] += (Math.cos(elapsed + i * 1.1) * 10 - this.velocities[i * 3 + 2] * 0.4) * delta;

        pos.array[i * 3] += this.velocities[i * 3] * delta;
        pos.array[i * 3 + 1] += this.velocities[i * 3 + 1] * delta;
        pos.array[i * 3 + 2] += this.velocities[i * 3 + 2] * delta;

        // Size & fade
        const s = Math.sin(prog * Math.PI);
        sizeAttr.array[i] = this.customSizes[i] * (0.5 + s * 1.8);
        alphaAttr.array[i] = 1 - prog;
      }

      pos.needsUpdate = true;
      sizeAttr.needsUpdate = true;
      alphaAttr.needsUpdate = true;
      col.needsUpdate = true;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}


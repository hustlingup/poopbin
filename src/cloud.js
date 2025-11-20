import * as THREE from 'three';

export class CloudScene {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;

    this.scene = new THREE.Scene();
    // Background is handled by CSS, so we keep scene transparent or match color
    // Spec says "Light gray (fixed)" background, which is in CSS.
    // Three.js canvas should be transparent to show CSS background? 
    // Or we set scene background. Let's set scene background to null (transparent)
    // so CSS background shows through.
    
    this.camera = new THREE.PerspectiveCamera(75, this.width / this.height, 0.1, 1000);
    this.camera.position.z = 5;

    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setSize(this.width, this.height);
    this.container.appendChild(this.renderer.domElement);

    this.initLights();
    this.initCloud();
    this.animate();

    window.addEventListener('resize', this.onResize.bind(this));
  }

  initLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    this.scene.add(directionalLight);
  }

  initCloud() {
    // Placeholder for "Alive weightless dark green-brown cloud"
    // Using a group of spheres to look like a cloud clump
    this.cloudGroup = new THREE.Group();

    const geometry = new THREE.IcosahedronGeometry(1, 1); // Low poly look or high? Spec says "billowing", maybe smooth.
    // Let's use a StandardMaterial with the requested color
    const material = new THREE.MeshStandardMaterial({
      color: 0x4a5d23, // Dark green-brown
      roughness: 0.4,
      metalness: 0.1,
      flatShading: true // Low poly aesthetic might fit "billowing" if animated well, or we can smooth it.
    });

    // Create a few blobs to form a cloud shape
    const positions = [
      { x: 0, y: 0, z: 0, s: 1.5 },
      { x: 1, y: 0.2, z: 0.1, s: 1.0 },
      { x: -1, y: -0.1, z: 0.2, s: 1.1 },
      { x: 0.5, y: 0.8, z: -0.2, s: 0.9 },
      { x: -0.4, y: -0.7, z: 0.1, s: 0.8 },
      { x: 0, y: 0, z: 1, s: 0.9 },
      { x: 0, y: 0, z: -1, s: 0.9 }
    ];

    positions.forEach(pos => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(pos.x, pos.y, pos.z);
      mesh.scale.set(pos.s, pos.s, pos.s);
      this.cloudGroup.add(mesh);
    });

    this.scene.add(this.cloudGroup);
  }

  grow(scaleFactor) {
    // Target scale based on clicks
    // We will tween this in the main loop or using GSAP
    // For now, just direct set or use a method to animate to target
    // this.cloudGroup.scale.setScalar(scaleFactor);
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));

    // "Slowly spinning"
    if (this.cloudGroup) {
      this.cloudGroup.rotation.y += 0.002;
      this.cloudGroup.rotation.z += 0.001;
      
      // "Billowing" - simple scale pulse for now
      const time = Date.now() * 0.001;
      this.cloudGroup.children.forEach((child, i) => {
        const offset = i * 0.5;
        const scaleBase = child.userData.originalScale || child.scale.x; // Store original scale if needed
        // Simple breathing
        // child.scale.setScalar(scaleBase + Math.sin(time + offset) * 0.05);
      });
    }

    this.renderer.render(this.scene, this.camera);
  }

  onResize() {
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }
}

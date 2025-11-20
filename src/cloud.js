import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class CloudScene {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;

    this.scene = new THREE.Scene();
    // Keeping background transparent to match app style (CSS handles background)
    // this.scene.background = new THREE.Color(0x111111); 

    this.camera = new THREE.PerspectiveCamera(60, this.width / this.height, 0.1, 100);
    this.camera.position.set(0, 0, 5);

    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setSize(this.width, this.height);
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.enableZoom = false; // Disable zoom to keep layout stable? User didn't specify, but usually good for background.

    this.initCloud();
    const layerCount = 6;
    for (let i = 0; i < layerCount; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: smokeTex,
        color: 0x4a5d23, // Apply the "dark green-brown" from spec
        transparent: true,
        depthWrite: false,
        opacity: 0.25,
        side: THREE.DoubleSide
      });

      const geo = new THREE.PlaneGeometry(3, 4);
      const mesh = new THREE.Mesh(geo, mat);

      mesh.position.z = i * -0.1;
      mesh.rotation.z = (Math.random() - 0.5) * 0.4;

      this.smokeGroup.add(mesh);
    }
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));

    if (this.smokeGroup) {
      this.smokeGroup.rotation.y += 0.002;
      this.smokeGroup.rotation.x += 0.001;
    }

    this.controls.update();
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

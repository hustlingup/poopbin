import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// GLSL Textureless Classic 3D Noise "cnoise"
// Author: Stefan Gustavson
const noiseGLSL = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
vec3 fade(vec3 t) { return t*t*t*(t*(t*6.0-15.0)+10.0); }

float cnoise(vec3 P) {
  vec3 Pi0 = floor(P);
  vec3 Pi1 = Pi0 + vec3(1.0);
  Pi0 = mod289(Pi0);
  Pi1 = mod289(Pi1);
  vec3 Pf0 = fract(P);
  vec3 Pf1 = Pf0 - vec3(1.0);
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = Pi0.zzzz;
  vec4 iz1 = Pi1.zzzz;

  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0);
  vec4 ixy1 = permute(ixy + iz1);

  vec4 gx0 = ixy0 * (1.0 / 7.0);
  vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);

  vec4 gx1 = ixy1 * (1.0 / 7.0);
  vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(0.0, gx1) - 0.5);
  gy1 -= sz1 * (step(0.0, gy1) - 0.5);

  vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
  vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
  vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
  vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
  vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
  vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
  vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
  vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

  vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
  g000 *= norm0.x;
  g010 *= norm0.y;
  g100 *= norm0.z;
  g110 *= norm0.w;
  vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
  g001 *= norm1.x;
  g011 *= norm1.y;
  g101 *= norm1.z;
  g111 *= norm1.w;

  float n000 = dot(g000, Pf0);
  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
  float n111 = dot(g111, Pf1);

  vec3 fade_xyz = fade(Pf0);
  vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
  float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
  return 2.2 * n_xyz;
}

float turbulence(vec3 p) {
  float w = 100.0;
  float t = -0.5;
  for (float f = 1.0; f <= 10.0; f++) {
    float power = pow(2.0, f);
    t += abs(cnoise(vec3(power * p)) / power);
  }
  return t;
}
`;

const vertexShader = `
${noiseGLSL}

varying vec2 vUv;
varying float vNoise;
varying vec3 vNormal;
varying vec3 vPos;

uniform float time;
uniform float displacementStrength;
uniform float noiseScale;

void main() {
  vUv = uv;
  vNormal = normal;

  // Increased time speed for more "surging" feel
  float noiseVal = turbulence(normal * noiseScale + time * 0.2);
  
  // Deeper, more dramatic low-frequency shape
  float b = 8.0 * cnoise(0.03 * position + vec3(time * 0.3));
  
  // Combine with higher amplitude
  float displacement = -15.0 * noiseVal + b;
  
  vNoise = noiseVal;
  
  vec3 newPosition = position + normal * (displacement * displacementStrength);
  vPos = newPosition; // Pass to fragment for 3D noise
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}
`;

const fragmentShader = `
${noiseGLSL}

varying vec2 vUv;
varying float vNoise;
varying vec3 vNormal;
varying vec3 vPos;

uniform float time;

// Fractal Brownian Motion for lightning details
float fbm(vec3 p) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 0.0;
  for (int i = 0; i < 5; i++) {
    value += amplitude * abs(cnoise(p));
    p *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  // Updated colors based on image: Dark Brown/Black mixing with Vibrant Green
  vec3 colorDeep = vec3(0.05, 0.02, 0.0); // Deep Black/Brown
  vec3 colorMid = vec3(0.2, 0.15, 0.1); // Brownish
  vec3 colorHigh = vec3(0.0, 0.8, 0.4); // Vibrant Green (Toxic/Magic look)

  float n = smoothstep(-1.0, 1.0, vNoise);
  vec3 cloudColor = mix(colorDeep, colorMid, n);
  // Use a sharper mix for the green to make it look like "ink" or "magic"
  cloudColor = mix(cloudColor, colorHigh, pow(n, 4.0));

  // --- UPGRADED STATIC ELECTRICITY ---
  
  // 1. Dynamic "Plasma" Noise
  vec3 lightningPos = vPos * 0.2 + vec3(time * 0.5);
  float lightningNoise = fbm(lightningPos);
  
  // 2. Sharp Veins
  float veins = 1.0 / (abs(lightningNoise * 10.0 - 5.0) + 0.1);
  veins = pow(veins, 3.0); 
  
  // 3. Intermittent Flashing
  float flash = step(0.98, fract(sin(dot(vPos.xy, vec2(12.9898, 78.233)) + time) * 43758.5453));
  float pulse = sin(time * 20.0) * 0.5 + 0.5;
  
  // 4. Combine for Electric Glow
  vec3 electricColor = vec3(0.6, 1.0, 0.8); // Greenish-white electricity
  vec3 spark = electricColor * veins * (0.5 + flash * 5.0) * pulse;
  
  spark *= smoothstep(0.2, 0.8, vNoise);

  // Rim lighting
  vec3 viewDir = vec3(0.0, 0.0, 1.0);
  float rim = 1.0 - max(dot(vNormal, viewDir), 0.0);
  rim = pow(rim, 3.0);
  vec3 rimColor = vec3(0.0, 0.2, 0.1) * rim;

  gl_FragColor = vec4(cloudColor + spark + rimColor, 1.0);
}
`;

export class CloudScene {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`Container with id '${containerId}' not found.`);
      return;
    }
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;

    this.scene = new THREE.Scene();

    // Transparent background to let CSS gradient show
    this.scene.background = null;

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(60, this.width / this.height, 0.1, 1000);
    this.camera.position.set(0, 0, 40);

    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.enableZoom = false;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.8;

    this.clock = new THREE.Clock();

    this.initCloud();
    this.animate();

    window.addEventListener('resize', this.onResize.bind(this));
  }

  initCloud() {
    // High resolution geometry
    const geometry = new THREE.IcosahedronGeometry(10, 6);

    this.uniforms = {
      time: { value: 0.0 },
      displacementStrength: { value: 2.5 },
      noiseScale: { value: 2.5 }
    };

    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      wireframe: false,
      side: THREE.DoubleSide
    });

    this.cloudMesh = new THREE.Mesh(geometry, material);

    // Scale down to 20% of original size
    this.cloudMesh.scale.set(0.2, 0.2, 0.2);

    this.scene.add(this.cloudMesh);
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();

    if (this.uniforms) {
      this.uniforms.time.value += delta;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  onResize() {
    if (!this.container) return;
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }
}

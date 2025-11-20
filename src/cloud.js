import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// GLSL Simplex Noise
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

// FBM
float fbm(vec3 x) {
  float v = 0.0;
  float a = 0.5;
  vec3 shift = vec3(100.0);
  for (int i = 0; i < 5; ++i) {
    v += a * cnoise(x);
    x = x * 2.0 + shift;
    a *= 0.5;
  }
  return v;
}
`;

// --- BLOB SHADERS ---

const blobVertexShader = `
${noiseGLSL}

uniform float uTime;
uniform float uDisplacementStrength;
uniform vec2 uMouse;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPos;
varying float vNoise;

void main() {
  vUv = uv;
  vNormal = normal;

  // 1. Blobby Displacement
  // Large, slow noise for the "breathing" shape
  float t = uTime * 0.5;
  float noise = cnoise(position * 0.8 + vec3(t));
  
  // Add some mouse interaction (simple push)
  // float mouseDist = distance(uv, uMouse); // UV based interaction is tricky on sphere, keeping it simple for now
  
  vec3 newPos = position + normal * (noise * uDisplacementStrength);
  
  vPos = newPos;
  vNoise = noise;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
}
`;

const blobFragmentShader = `
${noiseGLSL}

uniform float uTime;
varying vec3 vPos;
varying float vNoise;

// Cosine Palette (Slime/Toxic/Neural)
vec3 palette( in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d ) {
    return a + b*cos( 6.28318*(c*t+d) );
}

// Domain Warping Pattern (Neural Noise)
float pattern( in vec3 p, out vec3 q, out vec3 r ) {
    q.x = fbm( p + vec3(0.0,0.0,0.0) );
    q.y = fbm( p + vec3(5.2,1.3,2.8) );
    q.z = fbm( p + vec3(1.2,3.4,5.6) );

    r.x = fbm( p + 4.0*q + vec3(1.7,9.2,5.2) );
    r.y = fbm( p + 4.0*q + vec3(8.3,2.8,1.2) );
    r.z = fbm( p + 4.0*q + vec3(1.2,3.4,5.6) );

    return fbm( p + 4.0*r );
}

void main() {
  // Scale coordinate for texture
  vec3 p = vPos * 0.5; 
  p += vec3(uTime * 0.1); // Flow
  
  vec3 q, r;
  float f = pattern(p, q, r);
  
  // Color Palette: Dark Green/Brown/Slime
  // a, b, c, d
  vec3 col = palette(f + vNoise * 0.2, 
                     vec3(0.5, 0.5, 0.5), 
                     vec3(0.5, 0.5, 0.5), 
                     vec3(1.0, 1.0, 1.0), 
                     vec3(0.0, 0.33, 0.67) // Blue-ish base
                     );
                     
  // Adjust to Slime colors (Green/Yellow/Dark)
  // Replacing the blue-ish palette with a custom mix
  vec3 slimeColor1 = vec3(0.1, 0.4, 0.1); // Dark Green
  vec3 slimeColor2 = vec3(0.6, 0.8, 0.2); // Bright Slime
  vec3 slimeColor3 = vec3(0.05, 0.1, 0.05); // Very Dark
  
  vec3 finalColor = mix(slimeColor3, slimeColor1, smoothstep(0.0, 0.5, f));
  finalColor = mix(finalColor, slimeColor2, smoothstep(0.5, 1.0, f));
  
  // Add some "neural" highlights
  finalColor += vec3(0.2) * smoothstep(0.4, 0.45, abs(f - 0.5));

  // Rim light
  vec3 viewDir = vec3(0.0, 0.0, 1.0);
  float rim = 1.0 - max(dot(normalize(cross(dFdx(vPos), dFdy(vPos))), viewDir), 0.0);
  finalColor += vec3(0.4, 0.8, 0.4) * pow(rim, 3.0) * 0.5;

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

// --- SMOKE SHADERS ---

const smokeVertexShader = `
${noiseGLSL}

uniform float uTime;
attribute float size;
attribute float speed;
attribute float offset;

varying float vOpacity;

void main() {
  // Time loop for endless effect
  float t = mod(uTime * speed + offset, 1.0);
  
  // Start on surface (approximate)
  vec3 pos = position;
  vec3 normal = normalize(pos);
  
  // Move outward and upward/swirl
  // Fluid-like motion using noise
  
  // 1. Outward expansion
  float expansion = t * 4.0; // Move far out
  pos += normal * expansion;
  
  // 2. Turbulence/Swirl
  float noiseScale = 0.5;
  vec3 noisePos = pos * noiseScale + vec3(uTime * 0.5);
  
  vec3 turbulence;
  turbulence.x = cnoise(noisePos);
  turbulence.y = cnoise(noisePos + vec3(100.0));
  turbulence.z = cnoise(noisePos + vec3(200.0));
  
  pos += turbulence * t * 2.0; // Turbulence increases with distance/time
  
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  
  gl_PointSize = size * (1.0 + t) * (300.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
  
  // Fade in/out
  vOpacity = smoothstep(0.0, 0.1, t) * (1.0 - smoothstep(0.6, 1.0, t));
}
`;

const smokeFragmentShader = `
varying float vOpacity;

void main() {
  // Soft particle
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  if(d > 0.5) discard;
  
  float alpha = 1.0 - smoothstep(0.0, 0.5, d);
  
  // Thick fluid color (matching blob)
  vec3 color = vec3(0.2, 0.5, 0.2); 
  
  gl_FragColor = vec4(color, alpha * vOpacity * 0.6);
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
    this.scene.background = null; // Transparent

    this.camera = new THREE.PerspectiveCamera(60, this.width / this.height, 0.1, 1000);
    this.camera.position.set(0, 0, 15);

    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.enableZoom = false;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 2.0; // Horizontal spin

    this.clock = new THREE.Clock();
    this.mouse = new THREE.Vector2();

    this.initBlob();
    this.initSmoke();
    this.addEvents();
    this.animate();
  }

  initBlob() {
    // High resolution for smooth displacement
    const geometry = new THREE.IcosahedronGeometry(3, 30);

    this.blobUniforms = {
      uTime: { value: 0.0 },
      uDisplacementStrength: { value: 1.2 },
      uMouse: { value: new THREE.Vector2(0, 0) }
    };

    const material = new THREE.ShaderMaterial({
      uniforms: this.blobUniforms,
      vertexShader: blobVertexShader,
      fragmentShader: blobFragmentShader,
      side: THREE.DoubleSide
    });

    this.blob = new THREE.Mesh(geometry, material);
    this.scene.add(this.blob);
  }

  initSmoke() {
    const particleCount = 2000;
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const sizes = [];
    const speeds = [];
    const offsets = [];

    for (let i = 0; i < particleCount; i++) {
      // Spawn on surface of radius ~3
      const r = 3.0;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );

      sizes.push(Math.random() * 5.0 + 2.0);
      speeds.push(Math.random() * 0.2 + 0.1);
      offsets.push(Math.random());
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
    geometry.setAttribute('speed', new THREE.Float32BufferAttribute(speeds, 1));
    geometry.setAttribute('offset', new THREE.Float32BufferAttribute(offsets, 1));

    this.smokeUniforms = {
      uTime: { value: 0.0 }
    };

    const material = new THREE.ShaderMaterial({
      uniforms: this.smokeUniforms,
      vertexShader: smokeVertexShader,
      fragmentShader: smokeFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending // Normal blending for "thick" look, Additive for "glowing"
    });

    this.smoke = new THREE.Points(geometry, material);
    this.scene.add(this.smoke);
  }

  addEvents() {
    window.addEventListener('resize', this.onResize.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
  }

  onMouseMove(event) {
    // Normalize mouse position -1 to 1
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    if (this.blobUniforms) {
      this.blobUniforms.uMouse.value.copy(this.mouse);
    }
  }

  onResize() {
    if (!this.container) return;
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    if (this.blobUniforms) {
      this.blobUniforms.uTime.value = time;
    }
    if (this.smokeUniforms) {
      this.smokeUniforms.uTime.value = time;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

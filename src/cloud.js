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

// FBM for Domain Warping
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

const vertexShader = `
${noiseGLSL}

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPos;
varying float vDisplacement;

uniform float time;
uniform float displacementStrength;

void main() {
  vUv = uv;
  vNormal = normal;

  // Fluid-like displacement: faster flow
  float t = time * 0.5;
  
  // Base shape
  float noise1 = cnoise(position * 0.5 + vec3(t));
  
  // Detail shape
  float noise2 = cnoise(position * 1.5 - vec3(t * 1.5));
  
  float displacement = (noise1 + noise2 * 0.5) * displacementStrength;
  
  vDisplacement = displacement;
  
  vec3 newPosition = position + normal * displacement;
  vPos = newPosition; 
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}
`;

const fragmentShader = `
${noiseGLSL}

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPos;
varying float vDisplacement;

uniform float time;

// Cosine Palette for rich colors
// Link: http://dev.thi.ng/gradients/
vec3 palette( in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d ) {
    return a + b*cos( 6.28318*(c*t+d) );
}

// Domain Warping Pattern
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
  // 1. FLUID TEXTURE via Domain Warping
  vec3 q, r;
  vec3 p = vPos * 0.1; // Scale coordinate
  p += vec3(time * 0.2); // Flow
  
  float f = pattern(p, q, r);
  
  // 2. COLOR PALETTE
  // We use the warped value 'f' and the intermediate 'q' length to drive color
  // Palette inspired by iridescent/fluid looks
  vec3 col = palette(f + length(q), 
                     vec3(0.5, 0.5, 0.5), 
                     vec3(0.5, 0.5, 0.5), 
                     vec3(1.0, 1.0, 1.0), 
                     vec3(0.0, 0.33, 0.67));
                     
  // Mix with a dark base for the "cloud" density
  vec3 darkBase = vec3(0.1, 0.1, 0.15);
  col = mix(darkBase, col, smoothstep(0.2, 0.8, f));

  // 3. RANDOM LIGHTS
  // Procedural lights moving inside
  vec3 lightColor = vec3(0.0);
  
  for(int i = 0; i < 4; i++) {
      float fi = float(i);
      // Randomize motion for each light
      float speed = 0.5 + fi * 0.1;
      vec3 lightPos = vec3(
          sin(time * speed + fi * 10.0) * 8.0,
          cos(time * speed * 0.8 + fi * 23.0) * 8.0,
          sin(time * speed * 0.5 + fi * 55.0) * 8.0
      );
      
      float dist = distance(vPos, lightPos);
      
      // Light falloff
      float intensity = 1.0 / (1.0 + dist * dist * 0.5);
      intensity = pow(intensity, 2.0) * 10.0; // Sharpen and boost
      
      // Random color for each light
      vec3 lCol = palette(fi * 0.1 + time * 0.1, 
                          vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.10, 0.20));
                          
      lightColor += lCol * intensity;
  }
  
  // Add lights to base color
  col += lightColor;
  
  // 4. RIM LIGHTING for 3D volume feel
  vec3 viewDir = vec3(0.0, 0.0, 1.0); // Simplified view dir
  float rim = 1.0 - max(dot(vNormal, viewDir), 0.0);
  rim = pow(rim, 2.0);
  col += vec3(0.2, 0.4, 0.6) * rim * 0.5;

  gl_FragColor = vec4(col, 1.0);
}
`;

const smokeVertexShader = `
uniform float time;
attribute float size;
attribute float speed;
attribute float shift;

varying float vOpacity;

void main() {
  float t = mod(time * speed + shift, 1.0);
  
  // Start at center, move up
  vec3 pos = position;
  pos.y += t * 12.0; // Move up
  
  // Expand outward slightly as it goes up (cone shape)
  float expansion = t * 4.0;
  // Simple radial expansion based on initial position direction
  vec3 dir = normalize(position + vec3(0.001)); // Avoid zero div
  pos.x += dir.x * expansion;
  pos.z += dir.z * expansion;
  
  // Turbulence
  pos.x += sin(time * 2.0 + pos.y) * 0.5;
  pos.z += cos(time * 1.5 + pos.y) * 0.5;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  
  // Scale size by distance
  gl_PointSize = size * (1.0 + t * 3.0) * (300.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
  
  // Fade in/out
  vOpacity = smoothstep(0.0, 0.15, t) * (1.0 - smoothstep(0.6, 1.0, t));
}
`;

const smokeFragmentShader = `
varying float vOpacity;

void main() {
  // Soft circular particle
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  if(d > 0.5) discard;
  
  float alpha = 1.0 - smoothstep(0.0, 0.5, d);
  
  // Dark thick smoke color
  vec3 color = vec3(0.15, 0.15, 0.18); 
  
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

    // Transparent background to let CSS gradient show
    this.scene.background = null;

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(60, this.width / this.height, 0.1, 1000);
    this.camera.position.set(0, 0, 30);

    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.enableZoom = false;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 1.0;

    this.clock = new THREE.Clock();

    this.initCloud();
    this.initSmoke();
    this.animate();

    window.addEventListener('resize', this.onResize.bind(this));
  }

  initCloud() {
    // High resolution geometry for smooth displacement
    // Reduced size to 30% (10 -> 3) and detail (20 -> 6) for performance
    const geometry = new THREE.IcosahedronGeometry(3, 6);

    this.uniforms = {
      time: { value: 0.0 },
      displacementStrength: { value: 0.6 }, // Scaled down displacement
    };

    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      wireframe: false,
      side: THREE.DoubleSide
    });

    this.cloudMesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.cloudMesh);
  }

  initSmoke() {
    const particleCount = 800;
    const geometry = new THREE.BufferGeometry();

    const positions = [];
    const sizes = [];
    const speeds = [];
    const shifts = [];

    for (let i = 0; i < particleCount; i++) {
      // Spawn in small core area
      const r = Math.random() * 1.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;

      positions.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi) * 0.5, // Flattened sphere
        r * Math.sin(phi) * Math.sin(theta)
      );

      sizes.push(Math.random() * 5.0 + 3.0); // Large particles
      speeds.push(Math.random() * 0.2 + 0.1);
      shifts.push(Math.random());
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
    geometry.setAttribute('speed', new THREE.Float32BufferAttribute(speeds, 1));
    geometry.setAttribute('shift', new THREE.Float32BufferAttribute(shifts, 1));

    this.smokeUniforms = {
      time: { value: 0.0 }
    };

    const material = new THREE.ShaderMaterial({
      uniforms: this.smokeUniforms,
      vertexShader: smokeVertexShader,
      fragmentShader: smokeFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    this.smokePoints = new THREE.Points(geometry, material);
    this.scene.add(this.smokePoints);
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();

    if (this.uniforms) {
      this.uniforms.time.value += delta;
    }
    if (this.smokeUniforms) {
      this.smokeUniforms.time.value += delta;
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

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class MainScene {
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

    this.shapes = ['slime', 'flower', 'fire', 'cloud', 'plasmaball'];
    this.currentShapeIndex = 0;
    this.currentMesh = null;

    this.switchShape(this.shapes[0]);

    this.addEvents();
    this.animate();
  }

  switchShape(shapeName) {
    // Clear existing
    if (this.currentMesh) {
      this.scene.remove(this.currentMesh);
      if (this.currentMesh.geometry) this.currentMesh.geometry.dispose();
      if (this.currentMesh.material) this.currentMesh.material.dispose();
      this.currentMesh = null;
    }

    this.currentShape = shapeName;

    switch (shapeName) {
      case 'slime':
        this.initSlime();
        break;
      case 'flower':
        this.initFlower();
        break;
      case 'fire':
        this.initFire();
        break;
      case 'cloud':
        this.initCloud();
        break;
      case 'plasmaball':
        this.initPlasmaball();
        break;
      default:
        this.initSlime();
        break;
    }
  }

  nextShape() {
    this.currentShapeIndex = (this.currentShapeIndex + 1) % this.shapes.length;
    this.switchShape(this.shapes[this.currentShapeIndex]);
    return this.shapes[this.currentShapeIndex];
  }

  initSlime() {
    // 3D Slime Shader Material
    // Based on noise and displacement to mimic the reference

    const geometry = new THREE.SphereGeometry(15, 64, 64); // Reduced size 50%

    // Max ripples to track
    const MAX_RIPPLES = 10;
    this.ripples = []; // { pos: vec3, time: float }

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        colorOuter: { value: new THREE.Color(0xff0000) }, // Red
        colorInner: { value: new THREE.Color(0xffff00) }, // Yellow
        colorCore: { value: new THREE.Color(0xffffff) },  // White
        uRipples: { value: new Array(MAX_RIPPLES).fill(new THREE.Vector4(0, 0, 0, -1000)) } // x,y,z, startTime
      },
      vertexShader: `
        uniform float time;
        uniform vec4 uRipples[${MAX_RIPPLES}];
        varying vec2 vUv;
        varying float vDisplace;
        
        // Simplex Noise (simplified)
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
        float snoise(vec3 v) {
          const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
          const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
          vec3 i  = floor(v + dot(v, C.yyy) );
          vec3 x0 = v - i + dot(i, C.xxx) ;
          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min( g.xyz, l.zxy );
          vec3 i2 = max( g.xyz, l.zxy );
          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;
          i = mod289(i);
          vec4 p = permute( permute( permute(
                    i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                  + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
                  + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
          float n_ = 0.142857142857;
          vec3  ns = n_ * D.wyz - D.xzx;
          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_ );
          vec4 x = x_ *ns.x + ns.yyyy;
          vec4 y = y_ *ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);
          vec4 b0 = vec4( x.xy, y.xy );
          vec4 b1 = vec4( x.zw, y.zw );
          vec4 s0 = floor(b0)*2.0 + 1.0;
          vec4 s1 = floor(b1)*2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));
          vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
          vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
          vec3 p0 = vec3(a0.xy,h.x);
          vec3 p1 = vec3(a0.zw,h.y);
          vec3 p2 = vec3(a1.xy,h.z);
          vec3 p3 = vec3(a1.zw,h.w);
          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
          p0 *= norm.x;
          p1 *= norm.y;
          p2 *= norm.z;
          p3 *= norm.w;
          return 42.0 * dot( p0, p0 );
        }

        void main() {
          vUv = uv;
          
          // Turbulence
          float noise = sin(position.x * 0.1 + time * 2.0) * sin(position.y * 0.1 + time) * sin(position.z * 0.1 + time * 1.5);
          
          // Ripple Effect
          float rippleSum = 0.0;
          for(int i = 0; i < ${MAX_RIPPLES}; i++) {
            vec4 r = uRipples[i];
            if(r.w > -900.0) { // Active ripple
               float age = time - r.w;
               if(age > 0.0 && age < 2.0) { // Lasts 2 seconds
                 float dist = distance(position, r.xyz);
                 // Wave function: sin(dist * freq - age * speed) * decay
                 float wave = sin(dist * 0.5 - age * 10.0);
                 float decay = exp(-age * 2.0) * smoothstep(15.0, 0.0, dist); // Decay over time and distance
                 rippleSum += wave * decay * 0.03; // Amplitude (Adjusted to 0.03)
               }
            }
          }

          vDisplace = noise + rippleSum;
          
          vec3 newPos = position + normal * (vDisplace * 10.0);
          
          // Taper up
          float yNorm = (position.y + 30.0) / 60.0; // 0 to 1 approx
          newPos.x *= (1.5 - yNorm);
          newPos.z *= (1.5 - yNorm);
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 colorOuter;
        uniform vec3 colorInner;
        uniform vec3 colorCore;
        varying float vDisplace;
        varying vec2 vUv;

        void main() {
          // Mix colors based on displacement/noise
          float t = vDisplace * 0.5 + 0.5; // 0 to 1
          
          vec3 col = mix(colorOuter, colorInner, t);
          col = mix(col, colorCore, smoothstep(0.7, 1.0, t));
          
          // Add a pulsing glow
          float pulse = 0.8 + 0.2 * sin(time * 5.0);
          
          gl_FragColor = vec4(col * pulse, 1.0);
        }
      `,
      side: THREE.DoubleSide,
      transparent: true
    });

    this.currentMesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.currentMesh);
  }

  initFlower() {
    // Flower Shader
    // Vertex shader displaces vertices to form petals
    const geometry = new THREE.SphereGeometry(10, 128, 128);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(0xff69b4) } // Hot pink
      },
      vertexShader: `
        uniform float time;
        varying vec2 vUv;
        varying float vElevation;

        void main() {
          vUv = uv;
          
          // Petal shape logic
          // Use sine waves based on UV coordinates
          float petals = sin(uv.y * 20.0 - time) * sin(uv.x * 10.0);
          
          vec3 newPos = position + normal * petals * 2.0;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
          vElevation = petals;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        varying float vElevation;

        void main() {
            // Color variation based on elevation
            vec3 finalColor = color + vElevation * 0.2;
            gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      side: THREE.DoubleSide,
      wireframe: false
    });

    this.currentMesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.currentMesh);
  }

  initFire() {
    // Fire Shader based on https://note-space.tauhoo.dev/experiments/3d-fire-effect-in-threejs/

    const vertexShader = `
      precision mediump float;
      #define PI 3.14
      uniform float uAnimationProgress;
      varying vec3 vPosition;

      // Helper functions
      float random(in vec2 _st) {
        return fract(sin(dot(_st.xy, vec2(12.9898,78.233))) * 43758.5453123);
      }

      float wrap(float value){
        if(value >= 1.){ return mod(value, 1.); }
        if(value < 0.){ return 1. - mod(value * -1., 1.); }
        return value;
      }

      vec2 wrap(vec2 value){
        return vec2(wrap(value.x), wrap(value.y));
      }

      float voronoi(vec2 position, vec2 cellNumber){
        vec2 cellSize = 1. / cellNumber;
        vec2 cellPosition = floor(position / cellSize) * cellSize + cellSize / 2.;
        float maxDistance = distance(vec2(0.), cellSize);
        float minDistance = maxDistance;
        for(float offsetX = -1.; offsetX < 2.; offsetX++){
          for(float offsetY = -1.; offsetY < 2.; offsetY++){
            vec2 currentCellPosition = cellPosition + vec2(offsetX, offsetY) * cellSize;
            vec2 wrapCellPosition = wrap(currentCellPosition);
            vec2 offsettedCurrentCellPosition = currentCellPosition + (random(wrapCellPosition) * 2. - 1.) * cellSize / 2.;
            float currentDistance = distance(position, offsettedCurrentCellPosition);
            if(minDistance > currentDistance){
              minDistance = currentDistance;
            }
          }
        }
        return minDistance / maxDistance;
      }

      void main() {
        vPosition = position;
        
        vec2 coord = vec2(atan(position.z, position.x) / (2. * PI), position.y * 0.5 + 0.5);
        vec2 animateOffset = vec2(0., -uAnimationProgress);
        
        float noise = voronoi(mod(coord + animateOffset, 1.), vec2(5.));
        float smallNoise = voronoi(mod(coord + 0.2 + animateOffset, 1.), vec2(8.));
        float bigNoise = voronoi(mod(coord + 0.4 + animateOffset, 1.), vec2(3.));
        
        float distortionScale = (noise + smallNoise + bigNoise) / 3.;
        vec2 newHorizontalPosition = distance(position.xz, vec2(0)) * (1. - distortionScale * 0.6) * normalize(position.xz);
        vec3 newPosition = vec3(newHorizontalPosition.x, position.y, newHorizontalPosition.y);
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
      }
    `;

    const fragmentShader = `
      precision mediump float;
      #define PI 3.14
      uniform float uAnimationProgress;
      uniform vec3 uColor;
      varying vec3 vPosition;

      float random(in vec2 _st) {
        return fract(sin(dot(_st.xy, vec2(12.9898,78.233))) * 43758.5453123);
      }

      float wrap(float value){
        if(value >= 1.){ return mod(value, 1.); }
        if(value < 0.){ return 1. - mod(value * -1., 1.); }
        return value;
      }

      vec2 wrap(vec2 value){
        return vec2(wrap(value.x), wrap(value.y));
      }

      float voronoi(vec2 position, vec2 cellNumber){
        vec2 cellSize = 1. / cellNumber;
        vec2 cellPosition = floor(position / cellSize) * cellSize + cellSize / 2.;
        float maxDistance = distance(vec2(0.), cellSize);
        float minDistance = maxDistance;
        for(float offsetX = -1.; offsetX < 2.; offsetX++){
          for(float offsetY = -1.; offsetY < 2.; offsetY++){
            vec2 currentCellPosition = cellPosition + vec2(offsetX, offsetY) * cellSize;
            vec2 wrapCellPosition = wrap(currentCellPosition);
            vec2 offsettedCurrentCellPosition = currentCellPosition + (random(wrapCellPosition) * 2. - 1.) * cellSize / 2.;
            float currentDistance = distance(position, offsettedCurrentCellPosition);
            if(minDistance > currentDistance){
              minDistance = currentDistance;
            }
          }
        }
        return minDistance / maxDistance;
      }

      void main() {
        vec2 coord = vec2(atan(vPosition.z, vPosition.x) / (2. * PI), vPosition.y * 0.5 + 0.5);
        vec2 animateOffset = vec2(0., -uAnimationProgress);
        
        float noise = voronoi(mod(coord + animateOffset, 1.), vec2(20.));
        float smallNoise = voronoi(mod(coord + 0.2 + animateOffset, 1.), vec2(30.));
        float bigNoise = voronoi(mod(coord + 0.4 + animateOffset, 1.), vec2(10.));
        
        float verticalGradient = (-1. * vPosition.y * 0.5 + 0.5) * 1.3 + 0.1;
        
        if((noise + smallNoise + bigNoise + verticalGradient) / 4. > 0.3){
          fragColor = vec4(uColor, 1.0);
        } else {
          fragColor = vec4(0.0);
        }
      }
    `;

    // Use a Group to hold both meshes
    this.currentMesh = new THREE.Group();

    // Geometry (Cylinder or Cone - reference uses loaded GLB but we can approximate with Cylinder/Cone)
    // Reference uses a specific shape, but let's use a Cylinder with open ends
    // Actually, let's use the ConeGeometry we had but with more segments
    const geometry = new THREE.CylinderGeometry(2, 10, 30, 64, 64, true);
    geometry.translate(0, 5, 0); // Adjust pivot

    const getMaterial = (color) => new THREE.ShaderMaterial({
      fragmentShader,
      vertexShader,
      uniforms: {
        uAnimationProgress: { value: 0 },
        uColor: { value: new THREE.Color(color) }
      },
      transparent: true,
      side: THREE.DoubleSide, // Simplified from the double-pass render
      depthWrite: false, // Helps with transparency
      blending: THREE.NormalBlending // Or Additive
    });

    const material1 = getMaterial(0xff0000); // Red
    const material2 = getMaterial(0xffff00); // Yellow

    const mesh1 = new THREE.Mesh(geometry, material1);

    const mesh2 = new THREE.Mesh(geometry, material2);
    mesh2.scale.set(0.8, 0.8, 0.8); // Smaller inner flame
    mesh2.position.y = 0.5; // Slightly offset

    this.currentMesh.add(mesh1);
    this.currentMesh.add(mesh2);

    this.scene.add(this.currentMesh);
  }

  initCloud() {
    // Cloud Shader
    // Sphere with soft noise displacement
    const geometry = new THREE.SphereGeometry(15, 128, 128);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        colorBase: { value: new THREE.Color(0xffffff) }, // White
        colorShadow: { value: new THREE.Color(0xccccff) } // Light Blue-ish Gray
      },
      vertexShader: `
        uniform float time;
        varying vec2 vUv;
        varying float vNoise;

        // Simplex Noise (simplified)
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
        float snoise(vec3 v) {
          const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
          const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
          vec3 i  = floor(v + dot(v, C.yyy) );
          vec3 x0 = v - i + dot(i, C.xxx) ;
          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min( g.xyz, l.zxy );
          vec3 i2 = max( g.xyz, l.zxy );
          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;
          i = mod289(i);
          vec4 p = permute( permute( permute(
                    i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                  + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
                  + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
          float n_ = 0.142857142857;
          vec3  ns = n_ * D.wyz - D.xzx;
          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_ );
          vec4 x = x_ *ns.x + ns.yyyy;
          vec4 y = y_ *ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);
          vec4 b0 = vec4( x.xy, y.xy );
          vec4 b1 = vec4( x.zw, y.zw );
          vec4 s0 = floor(b0)*2.0 + 1.0;
          vec4 s1 = floor(b1)*2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));
          vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
          vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
          vec3 p0 = vec3(a0.xy,h.x);
          vec3 p1 = vec3(a0.zw,h.y);
          vec3 p2 = vec3(a1.xy,h.z);
          vec3 p3 = vec3(a1.zw,h.w);
          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
          p0 *= norm.x;
          p1 *= norm.y;
          p2 *= norm.z;
          p3 *= norm.w;
          return 42.0 * dot( p0, p0 );
        }

        void main() {
          vUv = uv;
          
          // Soft noise
          float noise = snoise(vec3(position.x * 0.05, position.y * 0.05 + time * 0.5, position.z * 0.05));
          vNoise = noise;
          
          // Displace vertices
          vec3 newPos = position + normal * noise * 5.0;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 colorBase;
        uniform vec3 colorShadow;
        varying float vNoise;

        void main() {
            // Mix colors based on noise
            vec3 finalColor = mix(colorShadow, colorBase, vNoise * 0.5 + 0.5);
            // Increase opacity and add a bit of glow
            gl_FragColor = vec4(finalColor, 0.9);
        }
      `,
      side: THREE.DoubleSide,
      transparent: true
    });

    this.currentMesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.currentMesh);
  }

  initPlasmaball() {
    // Plasmaball Shader
    // Sphere with Voronoi-like noise for electric effect
    const geometry = new THREE.SphereGeometry(15, 64, 64);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        colorBase: { value: new THREE.Color(0x000000) }, // Black core
        colorPlasma: { value: new THREE.Color(0x00ffff) } // Cyan plasma
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          vUv = uv;
          vNormal = normal;
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 colorBase;
        uniform vec3 colorPlasma;
        varying vec2 vUv;
        varying vec3 vPosition;

        // Cellular noise (Voronoi)
        vec2 hash2( vec2 p ) {
            return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);
        }

        float voronoi( in vec2 x ) {
            vec2 n = floor(x);
            vec2 f = fract(x);
            float m = 8.0;
            for( int j=-1; j<=1; j++ )
            for( int i=-1; i<=1; i++ ) {
                vec2 g = vec2( float(i),float(j) );
                vec2 o = hash2( n + g );
                o = 0.5 + 0.5*sin( time + 6.2831*o );
                vec2 r = g + o - f;
                float d = dot(r,r);
                if( d<m ) m=d;
            }
            return m;
        }

        void main() {
            // Map 3D position to 2D for noise (simple projection)
            vec2 p = vPosition.xy * 0.1 + vPosition.z * 0.05;
            
            float v = voronoi( p * 5.0 + time * 0.5 );
            
            // Invert for electric look
            float intensity = 1.0 - smoothstep(0.0, 0.1, v);
            
            // Add glow
            intensity += 0.1 / (v + 0.1);
            
            vec3 finalColor = mix(colorBase, colorPlasma, intensity);
            
            gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      side: THREE.DoubleSide,
      transparent: true
    });

    this.currentMesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.currentMesh);
  }

  triggerRipple(angle) {
    if (!this.currentMesh || !this.currentMesh.material.uniforms || !this.currentMesh.material.uniforms.uRipples) return;

    // Calculate impact point on the sphere surface
    // Sphere radius is 15.
    // Angle is in XY plane (screen space projection)
    // Map to 3D: x = r*cos(theta), y = r*sin(theta), z = 0 (approx front face)
    // Actually, let's put it slightly on the front hemisphere
    const r = 15;
    const x = r * Math.cos(angle);
    const y = r * Math.sin(angle);
    const z = 5.0; // Slightly in front

    const impactPos = new THREE.Vector3(x, y, z);

    // Find oldest ripple slot to overwrite
    const uniforms = this.currentMesh.material.uniforms;
    const ripples = uniforms.uRipples.value;
    const time = uniforms.time.value;

    // Simple round-robin or find oldest
    if (!this.rippleIndex) this.rippleIndex = 0;

    ripples[this.rippleIndex].set(x, y, z, time);
    this.rippleIndex = (this.rippleIndex + 1) % ripples.length;
  }

  updateColor(hexColor) {
    if (!this.currentMesh || !this.currentMesh.material.uniforms || !this.currentMesh.material.uniforms.colorOuter) return;

    const base = new THREE.Color(hexColor);
    const hsl = {};
    base.getHSL(hsl);

    // Outer: Darker
    const outer = new THREE.Color().setHSL(hsl.h, hsl.s, Math.max(0, hsl.l - 0.2));

    // Inner: Base color
    const inner = base.clone();

    // Core: Lighter, almost white
    const core = new THREE.Color().setHSL(hsl.h, hsl.s, Math.min(1, hsl.l + 0.4));

    const uniforms = this.currentMesh.material.uniforms;
    uniforms.colorOuter.value.copy(outer);
    uniforms.colorInner.value.copy(inner);
    uniforms.colorCore.value.copy(core);
  }

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

    // Update Current Mesh
    if (this.currentMesh) {
      // Handle Group (Fire)
      if (this.currentMesh.isGroup) {
        this.currentMesh.children.forEach(child => {
          if (child.material.uniforms) {
            if (child.material.uniforms.time) child.material.uniforms.time.value = elapsed;
            if (child.material.uniforms.uAnimationProgress) {
              // Cycle every 2 seconds
              child.material.uniforms.uAnimationProgress.value = (Date.now() / 2000) % 1;
            }
          }
        });
        this.currentMesh.rotation.y = elapsed * 0.2;
      }
      // Handle Single Mesh
      else if (this.currentMesh.material && this.currentMesh.material.uniforms) {
        if (this.currentMesh.material.uniforms.time) {
          this.currentMesh.material.uniforms.time.value = elapsed;
        }
        this.currentMesh.rotation.y = elapsed * 0.2;
      } else {
        this.currentMesh.rotation.y = elapsed * 0.2;
      }
    }

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

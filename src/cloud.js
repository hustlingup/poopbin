import * as THREE from 'three';

// --- SHADERS ---

const vertexShader = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
}
`;

const fragmentShader = `
varying vec2 vUv;
uniform float u_ratio;
uniform float u_time;
uniform vec2 u_pointer;
uniform float u_click_time;
uniform vec2 u_click;

// -----------------------------------------------------
// Noise functions
// -----------------------------------------------------

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
                        0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
                        -0.577350269189626, // -1.0 + 2.0 * C.x
                        0.024390243902439); // 1.0 / 41.0
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
        + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

// -----------------------------------------------------
// Main Logic
// -----------------------------------------------------

float fbm(vec2 p) {
    float f = 0.0;
    float w = 0.5;
    for (int i = 0; i < 5; i++) {
        f += w * snoise(p);
        p *= 2.0;
        w *= 0.5;
    }
    return f;
}

float get_ring_shape(vec2 p, float innerRadius, float outerRadius) {
    float d = length(p);
    return smoothstep(innerRadius, innerRadius + 0.02, d) - smoothstep(outerRadius, outerRadius + 0.02, d);
}

float get_dot_shape(vec2 p, vec2 center, float radius) {
    float d = length(p - center);
    return 1.0 - smoothstep(radius, radius + 0.02, d);
}

void main() {
    // Normalized coordinates
    vec2 p = vUv * 2.0 - 1.0;
    p.x *= u_ratio;

    // --- NOISE & DISTORTION ---
    float noise_val = fbm(p * 3.0 + u_time * 0.2);
    
    // Distort the coordinate for the ring
    vec2 ring_p = p + vec2(noise_val * 0.1);
    
    // Polar coordinates for more interesting noise movement
    float angle = atan(ring_p.y, ring_p.x);
    float radius = length(ring_p);
    
    // Add noise based on angle to create the "wobbly" ring effect
    float angle_noise = fbm(vec2(angle * 2.0, u_time * 0.5));
    float radius_noise = fbm(vec2(radius * 5.0, u_time * 0.3));
    
    // Combine noise
    float final_noise = (angle_noise + radius_noise) * 0.5;
    
    // --- SHAPE ---
    // Base Ring
    float ring = get_ring_shape(ring_p, 0.5 + final_noise * 0.2, 0.6 + final_noise * 0.2);
    
    // Interaction: Mouse influence
    // Distort ring near mouse
    float mouse_dist = distance(p, u_pointer);
    float mouse_influence = smoothstep(0.5, 0.0, mouse_dist);
    ring += mouse_influence * 0.5 * snoise(p * 10.0 + u_time);
    
    // Click ripple (simple expansion)
    float click_age = u_time - u_click_time;
    if (click_age < 1.0 && click_age > 0.0) {
        float ripple_radius = click_age * 2.0;
        float ripple = get_ring_shape(p - u_click, ripple_radius, ripple_radius + 0.05);
        ring += ripple * (1.0 - click_age); // Fade out
    }

    // --- COLOR ---
    // Original was orange/red. Changing to Purple/Blue/Pink as requested.
    
    vec3 color_bg = vec3(0.0, 0.0, 0.05); // Deep dark blue background
    
    // Gradient for the ring
    vec3 color_1 = vec3(0.2, 0.0, 0.8); // Purple/Blue
    vec3 color_2 = vec3(0.0, 0.8, 0.9); // Cyan
    vec3 color_3 = vec3(1.0, 0.0, 0.5); // Pink
    
    // Mix colors based on noise and position
    vec3 ring_color = mix(color_1, color_2, final_noise + 0.5);
    ring_color = mix(ring_color, color_3, sin(angle + u_time) * 0.5 + 0.5);
    
    // Apply shape mask
    vec3 final_color = mix(color_bg, ring_color, ring);
    
    // Add a glow
    final_color += ring_color * ring * 0.5;

    gl_FragColor = vec4(final_color, 1.0);
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
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1); // 2D Camera

    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();
    this.mouse = new THREE.Vector2(0.5, 0.5);
    this.clickPos = new THREE.Vector2(0.5, 0.5);
    this.clickTime = -100.0;

    this.init();
    this.addEvents();
    this.animate();
  }

  init() {
    const geometry = new THREE.PlaneGeometry(2, 2);

    this.uniforms = {
      u_time: { value: 0.0 },
      u_ratio: { value: this.width / this.height },
      u_pointer: { value: new THREE.Vector2(0.5, 0.5) },
      u_click: { value: new THREE.Vector2(0.5, 0.5) },
      u_click_time: { value: -100.0 }
    };

    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      depthWrite: false,
      depthTest: false
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.mesh);
  }

  addEvents() {
    window.addEventListener('resize', this.onResize.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('click', this.onClick.bind(this));
    window.addEventListener('touchmove', (e) => {
      const touch = e.targetTouches[0];
      this.onMouseMove(touch);
    }, { passive: false });
    window.addEventListener('touchstart', (e) => {
      const touch = e.targetTouches[0];
      this.onClick(touch);
    }, { passive: false });
  }

  onMouseMove(event) {
    // Map to -1 to 1 range, accounting for aspect ratio in shader if needed, 
    // but shader expects normalized 0-1 or -1-1? 
    // CodePen shader uses: vec2 p = vUv * 2.0 - 1.0; p.x *= u_ratio;
    // So pointer should probably be in the same space or normalized UV space.
    // Let's pass normalized UV space (0 to 1) and convert in shader if needed, 
    // or convert here to -1 to 1.
    // The shader uses `distance(p, u_pointer)`. `p` is (-ratio, -1) to (ratio, 1).
    // So we need to map mouse to that space.

    const x = (event.clientX / window.innerWidth) * 2 - 1;
    const y = -(event.clientY / window.innerHeight) * 2 + 1;

    const ratio = this.width / this.height;
    this.uniforms.u_pointer.value.set(x * ratio, y);
  }

  onClick(event) {
    const x = (event.clientX / window.innerWidth) * 2 - 1;
    const y = -(event.clientY / window.innerHeight) * 2 + 1;

    const ratio = this.width / this.height;
    this.uniforms.u_click.value.set(x * ratio, y);
    this.uniforms.u_click_time.value = this.clock.getElapsedTime();
  }

  onResize() {
    if (!this.container) return;
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    this.renderer.setSize(this.width, this.height);

    if (this.uniforms) {
      this.uniforms.u_ratio.value = this.width / this.height;
    }
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));

    if (this.uniforms) {
      this.uniforms.u_time.value = this.clock.getElapsedTime();
    }

    this.renderer.render(this.scene, this.camera);
  }
}

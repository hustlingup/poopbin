import * as THREE from 'three';

// --- SHADERS FROM smoke.html ---

const vertexShader = `
varying vec2 vUv;
void main(){vUv=uv;gl_Position=vec4(position,1);}
`;

const fragmentShader = `
uniform float t;
uniform vec2 r;
varying vec2 vUv;

// Ultra-stable hash noise (impossible to fail)
float n(vec3 p){
    p = fract(p*0.3183099 + 0.1);
    p = p*p*(3.0-2.0*p);
    return fract(p.x*p.y*p.z*(p.x+p.y+p.z));
}

float fbm(vec3 p){
    float v = 0.0, a = 0.5;
    for(int i=0; i<5; i++){
        v += a * n(p);
        p *= 2.02;
        p += vec3(0.12, t*0.08, t*0.06);
        a *= 0.5;
    }
    return v;
}

void main(){
    vec2 uv = vUv - 0.5;
    uv.x *= r.x/r.y;

    vec3 ro = vec3(sin(t*0.35)*0.15, -t*0.08, 3.2);
    vec3 rd = normalize(vec3(uv, -1.0));

    vec3 col = vec3(0.0);
    float T = 1.0;

    for(int i = 0; i < 72; i++){
        vec3 p = ro + rd * 0.05 * float(i);
        p.y -= t * 0.13;

        float den = fbm(p * 1.4) * 1.3;
        den += (1.0 - smoothstep(0.0, 2.3, length(p + vec3(0., 0.6, 0.)))) * 3.2;
        den += fbm(p * 3.1 + vec3(t*0.1)) * 0.7;
        den = max(den - 0.7, 0.0) * 2.5;

        vec3 smoke = mix(vec3(0.04,0.015,0.008), vec3(0.18,0.07,0.04), den);
        smoke += vec3(0.0, 1.5, 1.4) * pow(den, 3.8) * 3.8;  // cyan glow

        col += smoke * T * 0.12;
        T *= exp(-den * 0.09);

        if(T < 0.02) break;
    }

    col += vec3(0.05,0.05,0.11) * T;
    col /= col + 1.0;
    col = pow(col, vec3(0.82));

    gl_FragColor = vec4(col, 1.0);
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
    this.camera = new THREE.Camera();
    this.camera.position.z = 1;

    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(1); // As per smoke.html recommendation
    this.container.appendChild(this.renderer.domElement);

    this.init();
    this.addEvents();
    this.animate();
  }

  init() {
    const geometry = new THREE.PlaneGeometry(2, 2);

    this.uniforms = {
      t: { value: 0 },
      r: { value: new THREE.Vector2(this.width, this.height) }
    };

    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.mesh);
  }

  addEvents() {
    window.addEventListener('resize', this.onResize.bind(this));
  }

  onResize() {
    if (!this.container) return;
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    this.renderer.setSize(this.width, this.height);

    if (this.uniforms) {
      this.uniforms.r.value.set(this.width, this.height);
    }
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));

    if (this.uniforms) {
      this.uniforms.t.value = performance.now() * 0.001;
    }

    this.renderer.render(this.scene, this.camera);
  }
}

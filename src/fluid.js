import * as THREE from 'three';

export class FluidSimulator {
    constructor(renderer, width, height) {
        this.renderer = renderer;
        this.width = width >> 1; // Downscale for performance
        this.height = height >> 1;

        // Simulation parameters
        this.dt = 0.016;
        this.iterations = 10; // Jacobi iterations for pressure
        this.curl = 30;
        this.splatRadius = 0.005;
        this.dissipation = 0.98;

        this.initShaders();
        this.initFBOs();

        // Quad for rendering
        this.quad = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2),
            this.advectionMaterial // Initial material
        );
        this.scene = new THREE.Scene();
        this.scene.add(this.quad);
        this.camera = new THREE.Camera(); // Orthographic camera for full screen quad
    }

    initShaders() {
        const baseVertex = `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = vec4(position, 1.0);
            }
        `;

        // 1. Advection: Moves the velocity/density field along the velocity field
        this.advectionMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uVelocity: { value: null },
                uSource: { value: null },
                dt: { value: this.dt },
                dissipation: { value: this.dissipation },
                texelSize: { value: new THREE.Vector2(1.0 / this.width, 1.0 / this.height) }
            },
            vertexShader: baseVertex,
            fragmentShader: `
                varying vec2 vUv;
                uniform sampler2D uVelocity;
                uniform sampler2D uSource;
                uniform vec2 texelSize;
                uniform float dt;
                uniform float dissipation;

                void main() {
                    vec2 coord = vUv - texture2D(uVelocity, vUv).xy * texelSize * dt;
                    gl_FragColor = texture2D(uSource, coord) * dissipation;
                }
            `
        });

        // 2. Divergence: Calculates how much "stuff" is entering/leaving a cell
        this.divergenceMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uVelocity: { value: null },
                texelSize: { value: new THREE.Vector2(1.0 / this.width, 1.0 / this.height) }
            },
            vertexShader: baseVertex,
            fragmentShader: `
                varying vec2 vUv;
                uniform sampler2D uVelocity;
                uniform vec2 texelSize;

                void main() {
                    float L = texture2D(uVelocity, vUv - vec2(texelSize.x, 0.0)).x;
                    float R = texture2D(uVelocity, vUv + vec2(texelSize.x, 0.0)).x;
                    float T = texture2D(uVelocity, vUv + vec2(0.0, texelSize.y)).y;
                    float B = texture2D(uVelocity, vUv - vec2(0.0, texelSize.y)).y;

                    vec2 C = texture2D(uVelocity, vUv).xy;
                    if (vUv.x < 0.0) L = -C.x;
                    if (vUv.x > 1.0) R = -C.x;
                    if (vUv.y > 1.0) T = -C.y;
                    if (vUv.y < 0.0) B = -C.y;

                    float div = 0.5 * (R - L + T - B);
                    gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
                }
            `
        });

        // 3. Pressure: Solves for pressure to make the field incompressible
        this.pressureMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uPressure: { value: null },
                uDivergence: { value: null },
                texelSize: { value: new THREE.Vector2(1.0 / this.width, 1.0 / this.height) }
            },
            vertexShader: baseVertex,
            fragmentShader: `
                varying vec2 vUv;
                uniform sampler2D uPressure;
                uniform sampler2D uDivergence;
                uniform vec2 texelSize;

                void main() {
                    float L = texture2D(uPressure, vUv - vec2(texelSize.x, 0.0)).x;
                    float R = texture2D(uPressure, vUv + vec2(texelSize.x, 0.0)).x;
                    float T = texture2D(uPressure, vUv + vec2(0.0, texelSize.y)).x;
                    float B = texture2D(uPressure, vUv - vec2(0.0, texelSize.y)).x;
                    float C = texture2D(uPressure, vUv).x;
                    float divergence = texture2D(uDivergence, vUv).x;
                    
                    float pressure = (L + R + B + T - divergence) * 0.25;
                    gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
                }
            `
        });

        // 4. Gradient Subtract: Subtracts pressure gradient from velocity
        this.gradientSubtractMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uPressure: { value: null },
                uVelocity: { value: null },
                texelSize: { value: new THREE.Vector2(1.0 / this.width, 1.0 / this.height) }
            },
            vertexShader: baseVertex,
            fragmentShader: `
                varying vec2 vUv;
                uniform sampler2D uPressure;
                uniform sampler2D uVelocity;
                uniform vec2 texelSize;

                void main() {
                    float L = texture2D(uPressure, vUv - vec2(texelSize.x, 0.0)).x;
                    float R = texture2D(uPressure, vUv + vec2(texelSize.x, 0.0)).x;
                    float T = texture2D(uPressure, vUv + vec2(0.0, texelSize.y)).x;
                    float B = texture2D(uPressure, vUv - vec2(0.0, texelSize.y)).x;
                    
                    vec2 velocity = texture2D(uVelocity, vUv).xy;
                    velocity.xy -= vec2(R - L, T - B);
                    gl_FragColor = vec4(velocity, 0.0, 1.0);
                }
            `
        });

        // 5. Splat: Adds force/color
        this.splatMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTarget: { value: null },
                aspectRatio: { value: this.width / this.height },
                point: { value: new THREE.Vector2() },
                color: { value: new THREE.Vector3() },
                radius: { value: this.splatRadius }
            },
            vertexShader: baseVertex,
            fragmentShader: `
                varying vec2 vUv;
                uniform sampler2D uTarget;
                uniform float aspectRatio;
                uniform vec3 color;
                uniform vec2 point;
                uniform float radius;

                void main() {
                    vec2 p = vUv - point.xy;
                    p.x *= aspectRatio;
                    vec3 splat = exp(-dot(p, p) / radius) * color;
                    vec3 base = texture2D(uTarget, vUv).xyz;
                    gl_FragColor = vec4(base + splat, 1.0);
                }
            `
        });

        // 6. Display: Renders the density
        this.displayMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTexture: { value: null }
            },
            vertexShader: baseVertex,
            fragmentShader: `
                varying vec2 vUv;
                uniform sampler2D uTexture;
                void main() {
                    vec3 c = texture2D(uTexture, vUv).rgb;
                    // Add a bit of glow/intensity curve
                    // c = pow(c, vec3(1.0/2.2)); // Gamma correction if needed
                    gl_FragColor = vec4(c, length(c) * 0.5); // Alpha based on brightness
                }
            `,
            transparent: true
        });
    }

    initFBOs() {
        const type = THREE.FloatType; // Or HalfFloatType if supported
        const options = {
            type: type,
            format: THREE.RGBAFormat,
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            depthBuffer: false,
            stencilBuffer: false
        };

        this.velocity = this.createDoubleFBO(options);
        this.density = this.createDoubleFBO(options);
        this.divergence = new THREE.WebGLRenderTarget(this.width, this.height, options);
        this.pressure = this.createDoubleFBO(options);
    }

    createDoubleFBO(options) {
        return {
            read: new THREE.WebGLRenderTarget(this.width, this.height, options),
            write: new THREE.WebGLRenderTarget(this.width, this.height, options),
            swap: function () {
                const temp = this.read;
                this.read = this.write;
                this.write = temp;
            }
        };
    }

    step() {
        const gl = this.renderer;

        // 1. Advect Velocity
        this.advectionMaterial.uniforms.uVelocity.value = this.velocity.read.texture;
        this.advectionMaterial.uniforms.uSource.value = this.velocity.read.texture;
        this.advectionMaterial.uniforms.dissipation.value = this.dissipation;
        this.render(this.velocity.write, this.advectionMaterial);
        this.velocity.swap();

        // 2. Advect Density
        this.advectionMaterial.uniforms.uVelocity.value = this.velocity.read.texture;
        this.advectionMaterial.uniforms.uSource.value = this.density.read.texture;
        this.advectionMaterial.uniforms.dissipation.value = 0.97; // Fade out slowly
        this.render(this.density.write, this.advectionMaterial);
        this.density.swap();

        // 3. Divergence
        this.divergenceMaterial.uniforms.uVelocity.value = this.velocity.read.texture;
        this.render(this.divergence, this.divergenceMaterial);

        // 4. Pressure
        this.pressureMaterial.uniforms.uDivergence.value = this.divergence.texture;
        for (let i = 0; i < this.iterations; i++) {
            this.pressureMaterial.uniforms.uPressure.value = this.pressure.read.texture;
            this.render(this.pressure.write, this.pressureMaterial);
            this.pressure.swap();
        }

        // 5. Gradient Subtract
        this.gradientSubtractMaterial.uniforms.uPressure.value = this.pressure.read.texture;
        this.gradientSubtractMaterial.uniforms.uVelocity.value = this.velocity.read.texture;
        this.render(this.velocity.write, this.gradientSubtractMaterial);
        this.velocity.swap();
    }

    addSplat(x, y, dx, dy, color) {
        // Splat into Velocity
        this.splatMaterial.uniforms.uTarget.value = this.velocity.read.texture;
        this.splatMaterial.uniforms.point.value.set(x, y);
        this.splatMaterial.uniforms.color.value.set(dx, dy, 1.0).multiplyScalar(5.0); // Force
        this.splatMaterial.uniforms.radius.value = this.splatRadius;
        this.render(this.velocity.write, this.splatMaterial);
        this.velocity.swap();

        // Splat into Density
        this.splatMaterial.uniforms.uTarget.value = this.density.read.texture;
        this.splatMaterial.uniforms.color.value.set(color.r, color.g, color.b);
        this.render(this.density.write, this.splatMaterial);
        this.density.swap();
    }

    render(target, material) {
        this.quad.material = material;
        this.renderer.setRenderTarget(target);
        this.renderer.render(this.scene, this.camera);
        this.renderer.setRenderTarget(null);
    }

    getTexture() {
        return this.density.read.texture;
    }
}

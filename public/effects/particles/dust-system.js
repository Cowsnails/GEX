// Purple Light Dust Particle System - Simple and Clean
// Particles flow in light direction, visible throughout the beam

export class DustParticleSystem {
  constructor(particleCount = 400, options = {}) {
    this.particleCount = particleCount;
    this.options = {
      speed: options.speed || 1.0,
      color: options.color || 0xaa88ff, // Purple dust particles
      size: options.size || 0.01, // TINY particles
      spread: options.spread || 30  // Full screen spread
    };

    this.particles = null;
    this.velocities = [];
    this.positions = null;
    this.opacities = null;

    this.init();
  }

  init() {
    // Create buffer geometry for particles
    const geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.particleCount * 3);
    this.opacities = new Float32Array(this.particleCount);

    // Initialize particle positions and velocities
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;

      // Particles distributed throughout the entire light beam
      this.positions[i3] = (Math.random() - 0.5) * this.options.spread;     // x (full width)
      this.positions[i3 + 1] = (Math.random() - 0.5) * this.options.spread; // y (full height)
      this.positions[i3 + 2] = (Math.random() - 0.5) * 8;                   // z (depth)

      // Flow from left to right (light direction)
      this.velocities.push({
        x: (Math.random() * 0.015 + 0.01) * this.options.speed,  // Rightward flow
        y: (Math.random() - 0.5) * 0.005 * this.options.speed,   // Minimal vertical
        z: (Math.random() - 0.5) * 0.003 * this.options.speed    // Minimal depth
      });

      // Start with full opacity - will be calculated based on position in light beam
      this.opacities[i] = 0.8;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('opacity', new THREE.BufferAttribute(this.opacities, 1));

    // Create particle material with custom vertex colors for individual opacity
    const material = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(this.options.color) },
        pointSize: { value: this.options.size * 20.0 } // Much smaller multiplier
      },
      vertexShader: `
        attribute float opacity;
        varying float vOpacity;
        uniform float pointSize;

        void main() {
          vOpacity = opacity;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = pointSize * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        varying float vOpacity;

        void main() {
          // Circular particle shape
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;

          // Soft edges
          float alpha = (1.0 - smoothstep(0.0, 0.5, dist)) * vOpacity * 0.8;

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particles = new THREE.Points(geometry, material);
  }

  update() {
    const positions = this.particles.geometry.attributes.position.array;
    const opacities = this.particles.geometry.attributes.opacity.array;

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;

      // Update positions based on velocity (flowing left to right)
      positions[i3] += this.velocities[i].x;
      positions[i3 + 1] += this.velocities[i].y;
      positions[i3 + 2] += this.velocities[i].z;

      // Add gentle atmospheric turbulence
      const time = Date.now() * 0.0005;
      positions[i3 + 1] += Math.sin(time + i * 0.1) * 0.002;    // Gentle vertical sway
      positions[i3 + 2] += Math.cos(time * 0.8 + i * 0.15) * 0.001; // Subtle depth variation

      const boundary = this.options.spread / 2;

      // Reset particle if it flows too far right
      if (positions[i3] > boundary) {
        positions[i3] = -boundary; // Respawn on left
        positions[i3 + 1] = (Math.random() - 0.5) * this.options.spread;
        positions[i3 + 2] = (Math.random() - 0.5) * 8;
      }

      // Vertical boundaries
      if (Math.abs(positions[i3 + 1]) > boundary) {
        positions[i3 + 1] = (Math.random() - 0.5) * this.options.spread;
      }

      // Depth boundaries
      if (Math.abs(positions[i3 + 2]) > 5) {
        positions[i3 + 2] = (Math.random() - 0.5) * 8;
      }

      // Particles visible throughout the entire light beam
      // Gradual fade from left (bright) to right (dimmer)
      const normalizedX = (positions[i3] + boundary) / this.options.spread; // 0 to 1
      const lightIntensity = Math.max(0.2, 1.0 - normalizedX * 0.7); // Stay visible throughout

      opacities[i] = lightIntensity * 0.9;
    }

    this.particles.geometry.attributes.position.needsUpdate = true;
    this.particles.geometry.attributes.opacity.needsUpdate = true;
  }

  getMesh() {
    return this.particles;
  }

  setColor(color) {
    if (this.particles && this.particles.material) {
      this.particles.material.color.setHex(color);
    }
  }

  setSpeed(speed) {
    this.options.speed = speed;
    // Update velocities
    for (let i = 0; i < this.velocities.length; i++) {
      const baseSpeed = 0.015;
      this.velocities[i] = {
        x: (Math.random() - 0.5) * baseSpeed * speed,
        y: (Math.random() * baseSpeed + 0.01) * speed,
        z: (Math.random() - 0.5) * baseSpeed * speed
      };
    }
  }

  dispose() {
    if (this.particles) {
      this.particles.geometry.dispose();
      this.particles.material.dispose();
    }
  }
}
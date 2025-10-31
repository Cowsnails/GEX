// Ambient Background Scene Manager - Dual-Color Light Atmosphere
// Clean dual-color light beam from left with flowing dust particles
// NOW WITH UNIQUE THEMED VISUAL ELEMENTS!

import { gradientVertexShader, gradientFragmentShader } from './shaders/gradient-shader.js';
import { lightBeamVertexShader, lightBeamFragmentShader } from './shaders/light-beam-shader.js';
import { DustParticleSystem } from './particles/dust-system.js';
import { VisualElementsManager } from './visual-elements.js';

export class AmbientBackground {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error('[AMBIENT] Container not found:', containerId);
      return;
    }

    // Store color scheme (default purple if not provided)
    this.colorScheme = options.scheme || {
      name: 'Purple Dream',
      color1: { r: 0.6, g: 0.2, b: 0.95 },
      color2: { r: 0.95, g: 0.3, b: 0.7 },
      darkColor: { r: 0.08, g: 0.02, b: 0.15 },
      particleColor: 0xbb66ff
    };

    this.options = {
      particleCount: options.particleCount || 400,
      lightBeamCount: 1, // Single beam only
      enableParallax: false, // Disabled to prevent unwanted movement
      gradientSpeed: options.gradientSpeed || 0.3,
      particleSpeed: options.particleSpeed || 1.0,
      lightIntensity: options.lightIntensity || 1.2
    };

    // Three.js core
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });

    // Animation state
    this.time = 0;
    this.animationFrameId = null;
    this.isActive = true;

    // Components
    this.gradientPlane = null;
    this.lightBeams = [];
    this.particleSystem = null;
    this.visualElements = null;

    // Mouse parallax
    this.mouse = { x: 0, y: 0 };
    this.targetCameraPos = { x: 0, y: 0 };

    this.init();
  }

  init() {
    // Setup renderer
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit to 2x for performance
    this.container.appendChild(this.renderer.domElement);

    // Position camera
    this.camera.position.z = 5;

    // Create scene elements
    this.createGradientBackground();
    this.createLightBeams();
    this.createParticles();
    this.createVisualElements();

    // Event listeners
    this.bindEvents();

    // Start animation
    this.animate();

    console.log('[AMBIENT] Background initialized with options:', this.options);
  }

  createGradientBackground() {
    const geometry = new THREE.PlaneGeometry(50, 50); // MUCH bigger for full screen
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color1: { value: new THREE.Vector3(this.colorScheme.color1.r, this.colorScheme.color1.g, this.colorScheme.color1.b) },
        color2: { value: new THREE.Vector3(this.colorScheme.color2.r, this.colorScheme.color2.g, this.colorScheme.color2.b) },
        darkColor: { value: new THREE.Vector3(this.colorScheme.darkColor.r, this.colorScheme.darkColor.g, this.colorScheme.darkColor.b) }
      },
      vertexShader: gradientVertexShader,
      fragmentShader: gradientFragmentShader,
      depthWrite: false
    });

    this.gradientPlane = new THREE.Mesh(geometry, material);
    this.gradientPlane.position.z = -5;
    this.scene.add(this.gradientPlane);
  }

  createLightBeams() {
    // ONE single light beam - HUGE to cover entire screen
    const geometry = new THREE.BoxGeometry(
      40,   // width (MUCH wider to cover full screen)
      30,   // height (MUCH taller to cover full screen)
      5     // depth (volumetric thickness)
    );

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color1: { value: new THREE.Vector3(this.colorScheme.color1.r, this.colorScheme.color1.g, this.colorScheme.color1.b) },
        color2: { value: new THREE.Vector3(this.colorScheme.color2.r, this.colorScheme.color2.g, this.colorScheme.color2.b) },
        intensity: { value: 1.2 } // Bright enough to illuminate
      },
      vertexShader: lightBeamVertexShader,
      fragmentShader: lightBeamFragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const beam = new THREE.Mesh(geometry, material);

    // Position single beam from left, centered vertically
    beam.position.set(
      0,    // x (centered, beam extends left and right)
      0,    // y (centered vertically)
      0     // z (center depth)
    );

    this.scene.add(beam);
    this.lightBeams.push(beam);
  }

  createParticles() {
    this.particleSystem = new DustParticleSystem(this.options.particleCount, {
      speed: this.options.particleSpeed,
      color: this.colorScheme.particleColor, // Color from scheme
      size: 0.01,      // Tiny particles
      spread: 30       // Full screen spread
    });

    this.scene.add(this.particleSystem.getMesh());
  }

  createVisualElements() {
    this.visualElements = new VisualElementsManager(this.scene, this.colorScheme);
    console.log(`[AMBIENT] Created themed visual elements: ${this.colorScheme.visualElements?.join(', ') || 'none'}`);
  }

  bindEvents() {
    // Resize handler
    window.addEventListener('resize', () => this.onResize());

    // Mouse parallax
    if (this.options.enableParallax) {
      window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    }

    // Pause when tab is hidden, resume when visible
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Tab hidden - pause animation
        this.isActive = false;
        if (this.animationFrameId) {
          cancelAnimationFrame(this.animationFrameId);
          this.animationFrameId = null;
        }
      } else {
        // Tab visible - resume animation
        this.isActive = true;
        if (!this.animationFrameId) {
          console.log('[AMBIENT] Resuming animation after visibility change');
          this.animate();
        }
      }
    });
  }

  onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  onMouseMove(event) {
    // Normalize mouse position (-1 to 1)
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Target camera position (subtle parallax)
    this.targetCameraPos.x = this.mouse.x * 0.5;
    this.targetCameraPos.y = this.mouse.y * 0.3;
  }

  animate() {
    if (!this.isActive) return;

    this.animationFrameId = requestAnimationFrame(() => this.animate());

    this.time += 0.01 * this.options.gradientSpeed;

    // Update gradient shader
    if (this.gradientPlane) {
      this.gradientPlane.material.uniforms.time.value = this.time;
    }

    // Update light beams
    this.lightBeams.forEach((beam, i) => {
      beam.material.uniforms.time.value = this.time;

      // Very subtle swaying motion (like sunlight through moving atmosphere)
      beam.rotation.z += Math.sin(this.time * 0.1 + i) * 0.0002;
      beam.position.y += Math.sin(this.time * 0.08 + i * 0.5) * 0.001;
    });

    // Update particles
    if (this.particleSystem) {
      this.particleSystem.update();
    }

    // Update visual elements
    if (this.visualElements) {
      this.visualElements.update(0.016); // ~60fps
    }

    // Smooth camera parallax
    if (this.options.enableParallax) {
      const lerp = 0.05; // Smoothness factor
      this.camera.position.x += (this.targetCameraPos.x - this.camera.position.x) * lerp;
      this.camera.position.y += (this.targetCameraPos.y - this.camera.position.y) * lerp;
      this.camera.lookAt(0, 0, 0);
    }

    this.renderer.render(this.scene, this.camera);
  }

  // Public API
  pause() {
    this.isActive = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  resume() {
    if (!this.isActive || !this.animationFrameId) {
      this.isActive = true;
      if (!this.animationFrameId) {
        console.log('[AMBIENT] Manually resuming animation');
        this.animate();
      }
    }
  }

  setGradientSpeed(speed) {
    this.options.gradientSpeed = speed;
  }

  setParticleSpeed(speed) {
    this.options.particleSpeed = speed;
    if (this.particleSystem) {
      this.particleSystem.setSpeed(speed);
    }
  }

  setLightIntensity(intensity) {
    this.options.lightIntensity = intensity;
    this.lightBeams.forEach(beam => {
      beam.material.uniforms.intensity.value = intensity;
    });
  }

  updateColorScheme(scheme) {
    console.log(`[AMBIENT] Updating to color scheme: ${scheme.name}`);
    this.colorScheme = scheme;

    // Update gradient background colors
    if (this.gradientPlane) {
      this.gradientPlane.material.uniforms.color1.value.set(scheme.color1.r, scheme.color1.g, scheme.color1.b);
      this.gradientPlane.material.uniforms.color2.value.set(scheme.color2.r, scheme.color2.g, scheme.color2.b);
      this.gradientPlane.material.uniforms.darkColor.value.set(scheme.darkColor.r, scheme.darkColor.g, scheme.darkColor.b);
    }

    // Update light beam colors
    this.lightBeams.forEach(beam => {
      beam.material.uniforms.color1.value.set(scheme.color1.r, scheme.color1.g, scheme.color1.b);
      beam.material.uniforms.color2.value.set(scheme.color2.r, scheme.color2.g, scheme.color2.b);
    });

    // Update particle color
    if (this.particleSystem) {
      this.particleSystem.setColor(scheme.particleColor);
    }

    // Recreate visual elements for new theme
    if (this.visualElements) {
      this.visualElements.dispose();
    }
    this.createVisualElements();
  }

  destroy() {
    this.pause();

    // Clean up geometries and materials
    if (this.gradientPlane) {
      this.gradientPlane.geometry.dispose();
      this.gradientPlane.material.dispose();
    }

    this.lightBeams.forEach(beam => {
      beam.geometry.dispose();
      beam.material.dispose();
    });

    if (this.particleSystem) {
      this.particleSystem.dispose();
    }

    if (this.visualElements) {
      this.visualElements.dispose();
    }

    // Remove renderer
    if (this.container && this.renderer.domElement) {
      this.container.removeChild(this.renderer.domElement);
    }

    this.renderer.dispose();

    console.log('[AMBIENT] Background destroyed');
  }
}
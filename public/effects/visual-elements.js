// Visual Elements System - Simple glowing particles for each color scheme
// Clean, minimal, beautiful

// Ensure THREE is accessible (loaded via CDN script tag)
const THREE = window.THREE;

export class VisualElementsManager {
  constructor(scene, colorScheme) {
    this.scene = scene;
    this.colorScheme = colorScheme;
    this.elements = [];
    this.time = 0;

    this.createElements();
  }

  // Create simple glowing circle texture
  createGlowingCircleTexture(color) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const center = 32;

    // Beautiful radial gradient - white center fading to colored glow
    const gradient = ctx.createRadialGradient(center, center, 0, center, center, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.1, `rgba(${color.r * 255}, ${color.g * 255}, ${color.b * 255}, 1)`);
    gradient.addColorStop(0.4, `rgba(${color.r * 255}, ${color.g * 255}, ${color.b * 255}, 0.8)`);
    gradient.addColorStop(1, `rgba(${color.r * 255}, ${color.g * 255}, ${color.b * 255}, 0)`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  createElements() {
    if (!this.colorScheme.visualElements) return;

    // Create simple particles for whatever elements are requested
    this.colorScheme.visualElements.forEach(elementType => {
      this.createParticles(elementType);
    });
  }

  createParticles(type) {
    const color = new THREE.Color(this.colorScheme.particleColor);
    const texture = this.createGlowingCircleTexture(color);

    // Different particle counts for different types
    const counts = {
      'butterflies': 15,
      'sparkles': 50,
      'bubbles': 20,
      'waves': 30,
      'leaves': 25,
      'fireflies': 30,
      'hearts': 15,
      'clouds': 20,
      'crowns': 15,
      'lightning': 10,
      'electric': 25,
      'stars': 60,
      'planets': 10
    };

    const count = counts[type] || 30;

    for (let i = 0; i < count; i++) {
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0.7 + Math.random() * 0.3,
        blending: THREE.AdditiveBlending
      });

      const particle = new THREE.Sprite(material);

      // Random size variation
      const size = 0.3 + Math.random() * 0.4;
      particle.scale.set(size, size, 1);

      // Random starting position
      particle.position.set(
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 8
      );

      // Store animation data
      particle.userData = {
        type: 'particle',
        baseSize: size,
        velocity: {
          x: (Math.random() - 0.5) * 0.02,
          y: (Math.random() - 0.5) * 0.02,
          z: 0
        },
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 1 + Math.random() * 2,
        driftPhase: Math.random() * Math.PI * 2,
        driftSpeed: 0.5 + Math.random() * 0.5
      };

      this.scene.add(particle);
      this.elements.push(particle);
    }
  }

  update(deltaTime) {
    this.time += deltaTime;

    this.elements.forEach(particle => {
      const data = particle.userData;

      // Gentle drifting motion
      data.driftPhase += data.driftSpeed * deltaTime;
      particle.position.x += Math.sin(data.driftPhase) * 0.01;
      particle.position.y += Math.cos(data.driftPhase * 0.8) * 0.01;

      // Slow constant drift
      particle.position.x += data.velocity.x;
      particle.position.y += data.velocity.y;

      // Wrap around edges
      if (particle.position.x > 15) particle.position.x = -15;
      if (particle.position.x < -15) particle.position.x = 15;
      if (particle.position.y > 10) particle.position.y = -10;
      if (particle.position.y < -10) particle.position.y = 10;

      // Gentle twinkling with scale pulse
      data.twinklePhase += data.twinkleSpeed * deltaTime;
      const twinkle = (Math.sin(data.twinklePhase) + 1) * 0.5;
      particle.material.opacity = 0.5 + twinkle * 0.4;

      const scale = data.baseSize * (0.9 + twinkle * 0.2);
      particle.scale.set(scale, scale, 1);
    });
  }

  dispose() {
    this.elements.forEach(element => {
      if (element.geometry) element.geometry.dispose();
      if (element.material) {
        if (element.material.map) element.material.map.dispose();
        element.material.dispose();
      }
      this.scene.remove(element);
    });
    this.elements = [];
  }
}
// Dual-Color Light Background - Clean and Minimal
// Blends 2 colors smoothly with matching atmosphere

export const gradientVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const gradientFragmentShader = `
  uniform float time;
  uniform vec3 color1;     // First color (brighter)
  uniform vec3 color2;     // Second color (blends with first)
  uniform vec3 darkColor;  // Dark shadow color
  varying vec2 vUv;

  // Simple noise for subtle atmosphere (no blobs)
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    vec2 uv = vUv;

    // Simple gradient from left (light) to right (dark)
    float lightIntensity = smoothstep(1.0, 0.0, uv.x);

    // Very subtle atmospheric variation (NO BLOBS)
    float atmosphere = noise(uv * 2.0 + vec2(time * 0.02, time * 0.01)) * 0.1;
    lightIntensity += atmosphere;

    // Smooth blend between the two colors
    vec3 blendedLight = mix(color2, color1, smoothstep(0.0, 1.0, uv.x));

    // REDUCE BRIGHTNESS on left side (multiply by 0.5 to cut brightness in half)
    blendedLight *= 0.5;

    // Smooth color transition from dark to blended light colors
    vec3 color = darkColor;
    color = mix(color, darkColor * 1.5, smoothstep(0.0, 0.3, lightIntensity));
    color = mix(color, blendedLight, smoothstep(0.2, 0.6, lightIntensity));

    gl_FragColor = vec4(color, 1.0);
  }
`;
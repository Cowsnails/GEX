// Dual-Color Light Beam Shader - Clean Single Ray
// One volumetric light beam that blends between 2 colors

export const lightBeamVertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const lightBeamFragmentShader = `
  uniform float time;
  uniform vec3 color1;     // First color
  uniform vec3 color2;     // Second color
  uniform float intensity;

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;

  // Simple noise
  float hash(float n) {
    return fract(sin(n) * 43758.5453);
  }

  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float n = i.x + i.y * 57.0 + 113.0 * i.z;
    return mix(
      mix(mix(hash(n), hash(n + 1.0), f.x),
          mix(hash(n + 57.0), hash(n + 58.0), f.x), f.y),
      mix(mix(hash(n + 113.0), hash(n + 114.0), f.x),
          mix(hash(n + 170.0), hash(n + 171.0), f.x), f.y), f.z
    );
  }

  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);

    // Volumetric edge glow
    float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 1.5);

    // Gentle pulse
    float pulse = sin(time * 0.15) * 0.15 + 0.85;

    // Simple atmospheric variation
    float atmosphericNoise = noise(vPosition * 1.5 + vec3(time * 0.08, 0.0, 0.0));
    atmosphericNoise = atmosphericNoise * 0.3 + 0.7;

    // Beam intensity
    float beamIntensity = fresnel * pulse * intensity * atmosphericNoise;

    // Fade from left to right
    float horizontalFade = smoothstep(6.0, -4.0, vPosition.x);
    beamIntensity *= horizontalFade;

    // Blend between the two colors based on horizontal position
    float colorBlend = (vPosition.x + 20.0) / 40.0; // Normalize to 0-1
    vec3 lightColor = mix(color1, color2, colorBlend);

    // REDUCE BRIGHTNESS on left side (cut brightness in half)
    lightColor *= 0.5;

    // Final alpha (also reduced from 0.4 to 0.3 for less intensity)
    float alpha = beamIntensity * 0.3;

    gl_FragColor = vec4(lightColor, alpha);
  }
`;
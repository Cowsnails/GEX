// Ambient Background Controller - API with 10 Color Schemes
// Each scheme has 2 colors that blend beautifully

import { AmbientBackground } from './ambient-background.js';

// 7 GORGEOUS COLOR SCHEMES (2 colors each that blend beautifully)
// Each with unique themed visual elements!
export const COLOR_SCHEMES = {
  purpleDream: {
    name: 'Purple Dream',
    color1: { r: 0.6, g: 0.2, b: 0.95 },      // Bright purple
    color2: { r: 0.95, g: 0.3, b: 0.7 },      // Hot pink
    darkColor: { r: 0.08, g: 0.02, b: 0.15 }, // Deep purple shadow
    particleColor: 0xbb66ff,                   // Purple-pink particles
    visualElements: ['butterflies', 'sparkles'] // Magical butterflies and sparkles
  },

  oceanBlue: {
    name: 'Ocean Blue',
    color1: { r: 0.0, g: 0.5, b: 1.0 },       // Bright blue
    color2: { r: 0.0, g: 0.9, b: 0.9 },       // Cyan
    darkColor: { r: 0.0, g: 0.05, b: 0.15 },  // Deep ocean
    particleColor: 0x00ccff,                   // Cyan particles
    visualElements: ['bubbles', 'waves']       // Floating bubbles and wave patterns
  },

  forestMatrix: {
    name: 'Forest Matrix',
    color1: { r: 0.0, g: 0.9, b: 0.4 },       // Bright green
    color2: { r: 0.0, g: 0.8, b: 0.7 },       // Teal
    darkColor: { r: 0.0, g: 0.08, b: 0.05 },  // Deep forest
    particleColor: 0x00ff88,                   // Green-teal particles
    visualElements: ['leaves', 'fireflies']    // Falling leaves and fireflies
  },

  cottonCandy: {
    name: 'Cotton Candy',
    color1: { r: 1.0, g: 0.4, b: 0.8 },       // Pink
    color2: { r: 0.4, g: 0.7, b: 1.0 },       // Light blue
    darkColor: { r: 0.1, g: 0.05, b: 0.15 },  // Soft shadow
    particleColor: 0xff88cc,                   // Pink particles
    visualElements: ['hearts', 'clouds']       // Floating hearts and soft clouds
  },

  royalNight: {
    name: 'Royal Night',
    color1: { r: 0.8, g: 0.0, b: 0.3 },       // Deep red
    color2: { r: 0.5, g: 0.0, b: 0.7 },       // Royal purple
    darkColor: { r: 0.08, g: 0.0, b: 0.08 },  // Very dark purple
    particleColor: 0xaa0088,                   // Magenta particles
    visualElements: ['crowns', 'sparkles']     // Floating crowns and royal sparkles
  },

  neonElectric: {
    name: 'Neon Electric',
    color1: { r: 0.0, g: 1.0, b: 1.0 },       // Bright cyan
    color2: { r: 1.0, g: 0.0, b: 1.0 },       // Magenta
    darkColor: { r: 0.05, g: 0.0, b: 0.1 },   // Electric dark
    particleColor: 0x00ffff,                   // Cyan particles
    visualElements: ['lightning', 'electric']  // Lightning bolts and electric arcs
  },

  deepSpace: {
    name: 'Deep Space',
    color1: { r: 0.1, g: 0.2, b: 0.9 },       // Deep blue
    color2: { r: 0.4, g: 0.1, b: 0.8 },       // Space purple
    darkColor: { r: 0.01, g: 0.01, b: 0.05 }, // Near black
    particleColor: 0x4466ff,                   // Blue-purple particles
    visualElements: ['stars', 'planets']       // Twinkling stars and rotating planets
  }
};

let backgroundInstance = null;

/**
 * Initialize the ambient background with a color scheme
 * @param {string} containerId - ID of the DOM element to render into
 * @param {Object} options - Configuration options
 * @param {string} options.colorScheme - Name of color scheme or 'random' (default: 'purpleDream')
 */
export function init(containerId, options = {}) {
  // Check if Three.js is loaded
  if (typeof THREE === 'undefined') {
    console.error('[AMBIENT] Three.js not loaded. Please include Three.js before initializing.');
    return null;
  }

  // Clean up existing instance
  if (backgroundInstance) {
    console.warn('[AMBIENT] Destroying existing background instance');
    backgroundInstance.destroy();
  }

  // Select color scheme
  let schemeName = options.colorScheme || 'purpleDream';

  // Handle random selection
  if (schemeName === 'random') {
    const schemeNames = Object.keys(COLOR_SCHEMES);
    schemeName = schemeNames[Math.floor(Math.random() * schemeNames.length)];
  }

  const selectedScheme = COLOR_SCHEMES[schemeName] || COLOR_SCHEMES.purpleDream;

  console.log(`[AMBIENT] Initializing with color scheme: ${selectedScheme.name}`);

  // Merge color scheme into options
  const mergedOptions = {
    ...options,
    scheme: selectedScheme
  };

  // Create new instance
  try {
    backgroundInstance = new AmbientBackground(containerId, mergedOptions);
    console.log('[AMBIENT] Background created successfully');
    return backgroundInstance;
  } catch (error) {
    console.error('[AMBIENT] Failed to create background:', error);
    return null;
  }
}

/**
 * Switch to a different color scheme
 * @param {string} schemeName - Name of the scheme or 'random'
 */
export function setColorScheme(schemeName) {
  if (!backgroundInstance) {
    console.warn('[AMBIENT] No background instance to update');
    return;
  }

  // Handle random selection
  if (schemeName === 'random') {
    const schemeNames = Object.keys(COLOR_SCHEMES);
    schemeName = schemeNames[Math.floor(Math.random() * schemeNames.length)];
  }

  const scheme = COLOR_SCHEMES[schemeName];
  if (!scheme) {
    console.warn(`[AMBIENT] Unknown color scheme: ${schemeName}`);
    return;
  }

  console.log(`[AMBIENT] Switching to color scheme: ${scheme.name}`);
  backgroundInstance.updateColorScheme(scheme);
}

/**
 * Get list of all available color scheme names
 */
export function getColorSchemes() {
  return Object.keys(COLOR_SCHEMES);
}

/**
 * Get the current background instance
 */
export function getInstance() {
  return backgroundInstance;
}

/**
 * Pause the background animation
 */
export function pause() {
  if (backgroundInstance) {
    backgroundInstance.pause();
  }
}

/**
 * Resume the background animation
 */
export function resume() {
  if (backgroundInstance) {
    backgroundInstance.resume();
  }
}

/**
 * Destroy the background completely
 */
export function destroy() {
  if (backgroundInstance) {
    backgroundInstance.destroy();
    backgroundInstance = null;
  }
}
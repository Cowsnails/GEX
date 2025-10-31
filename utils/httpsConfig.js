// utils/httpsConfig.js - HTTPS/SSL Configuration for Production

import { readFileSync } from 'fs';

/**
 * Get HTTPS configuration for production
 * For development: Use HTTP
 * For production: Use HTTPS with SSL certificates
 */
export function getHTTPSConfig() {
  const isProd = process.env.NODE_ENV === 'production';
  const enableHTTPS = process.env.ENABLE_HTTPS === 'true';
  
  if (!isProd || !enableHTTPS) {
    console.log('⚠️  Running in HTTP mode (development)');
    return null;
  }
  
  try {
    // Load SSL certificates
    const certPath = process.env.SSL_CERT_PATH || './certs/cert.pem';
    const keyPath = process.env.SSL_KEY_PATH || './certs/key.pem';
    
    const cert = readFileSync(certPath, 'utf8');
    const key = readFileSync(keyPath, 'utf8');
    
    console.log('✅ HTTPS enabled with SSL certificates');
    
    return {
      cert,
      key,
      // Optional: CA certificate for full chain
      ca: process.env.SSL_CA_PATH ? readFileSync(process.env.SSL_CA_PATH, 'utf8') : undefined
    };
    
  } catch (error) {
    console.error('❌ Failed to load SSL certificates:', error.message);
    console.error('⚠️  Falling back to HTTP mode');
    return null;
  }
}

/**
 * Get secure cookie options based on environment
 */
export function getSecureCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  
  return {
    httpOnly: true,
    secure: isProd, // Only send over HTTPS in production
    sameSite: 'Strict',
    maxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000'), // 24 hours default
    path: '/'
  };
}

/**
 * Force HTTPS redirect middleware (for production)
 */
export function forceHTTPS(req) {
  const isProd = process.env.NODE_ENV === 'production';
  const enableHTTPS = process.env.ENABLE_HTTPS === 'true';
  
  if (!isProd || !enableHTTPS) {
    return null; // Skip in development
  }
  
  const protocol = req.headers.get('x-forwarded-proto') || 'http';
  
  if (protocol !== 'https') {
    const url = new URL(req.url);
    url.protocol = 'https:';
    
    return new Response(null, {
      status: 301,
      headers: {
        'Location': url.toString(),
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
      }
    });
  }
  
  return null;
}

/**
 * Setup instructions for SSL certificates
 */
export function printSSLInstructions() {
  console.log('\n📋 SSL Certificate Setup:');
  console.log('');
  console.log('For Development (self-signed):');
  console.log('  openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes');
  console.log('');
  console.log('For Production:');
  console.log('  1. Use Let\'s Encrypt (free): https://letsencrypt.org/');
  console.log('  2. Or get certificates from: Cloudflare, AWS Certificate Manager, etc.');
  console.log('  3. Set SSL_CERT_PATH and SSL_KEY_PATH in .env');
  console.log('');
}
// utils/securityHeaders.js - SECURED Security Headers for All Responses
import { randomBytes } from 'crypto';

/**
 * Generate a nonce for inline scripts
 * Nonces are random values that allow specific inline scripts while blocking others
 */
export function generateNonce() {
  return randomBytes(16).toString('base64');
}

/**
 * Get security headers for responses
 * Protects against XSS, clickjacking, MIME sniffing, etc.
 * 
 * @param {string} nonce - Optional nonce for inline scripts (CSP)
 */
export function getSecurityHeaders(nonce = null) {
  const isProd = process.env.NODE_ENV === 'production';
  
  // Build CSP script-src directive
  let scriptSrc = "'self' https://cdnjs.cloudflare.com https://unpkg.com";
  
  // 🔒 SECURED: Use nonce instead of unsafe-inline
  if (nonce) {
    scriptSrc += " 'nonce-" + nonce + "'";
  }
  
  // 🔒 DEVELOPMENT ONLY: Allow eval for better debugging
  // In production, we remove unsafe-eval completely
  if (!isProd) {
    console.log('⚠️  Development mode: unsafe-eval enabled for debugging');
    scriptSrc += " 'unsafe-eval'";
  }
  
  return {
    // Prevent XSS attacks
    'X-Content-Type-Options': 'nosniff',
    
    // Prevent clickjacking
    'X-Frame-Options': 'DENY',
    
    // XSS Protection (legacy but still useful)
    'X-XSS-Protection': '1; mode=block',
    
    // Referrer policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // 🔒 Content Security Policy - SECURED (no unsafe-inline!)
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src " + scriptSrc, // 🔒 NO unsafe-inline, uses nonces
      "style-src 'self' 'unsafe-inline'", // Styles are safe with inline (no code execution)
      "img-src 'self' data: https:",
      "font-src 'self' data: https://cdnjs.cloudflare.com",
      "connect-src 'self' ws://localhost:3000 wss://localhost:3000 ws://127.0.0.1:3000 wss://127.0.0.1:3000 http://127.0.0.1:25510 https://paper-api.alpaca.markets https://api.alpaca.markets", // WebSocket + APIs
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'", // Block plugins like Flash
      "upgrade-insecure-requests" // Automatically upgrade HTTP to HTTPS in production
    ].join('; '),
    
    // 🔒 HTTPS-only in production
    ...(isProd && {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
    }),
    
    // Permissions Policy - disable unnecessary features
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  };
}

/**
 * Apply security headers to a Response object
 * 
 * @param {Response} response - The response to add headers to
 * @param {string} nonce - Optional nonce for CSP
 */
export function applySecurityHeaders(response, nonce = null) {
  const headers = getSecurityHeaders(nonce);
  const responseHeaders = new Headers(response.headers);
  
  for (const [key, value] of Object.entries(headers)) {
    if (value !== undefined) { // Skip undefined values (like conditional HSTS)
      responseHeaders.set(key, value);
    }
  }
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders
  });
}

/**
 * Create a response with security headers
 * 
 * @param {any} body - Response body
 * @param {object} options - Response options
 * @param {string} options.nonce - Optional nonce for inline scripts
 */
export function createSecureResponse(body, options = {}) {
  const nonce = options.nonce || null;
  const headers = { ...getSecurityHeaders(nonce), ...options.headers };
  
  // Remove nonce from options to avoid passing it as a header
  const { nonce: _, ...restOptions } = options;
  
  return new Response(body, {
    ...restOptions,
    headers
  });
}

/**
 * Create an HTML response with nonce-enabled inline scripts
 * Use this for serving HTML pages with inline JavaScript
 * 
 * @param {string} html - HTML content
 * @param {object} options - Response options
 */
export function createSecureHTMLResponse(html, options = {}) {
  // Generate a nonce for this response
  const nonce = generateNonce();
  
  // Add a meta tag with the nonce so scripts can access it
  let htmlWithNonce = html.replace(
    '</head>',
    '<meta name="csp-nonce" content="' + nonce + '"></head>'
  );
  
  // Replace all <script> tags to include nonce attribute
  // This matches any <script> tag that doesn't already have nonce= or src=
  htmlWithNonce = htmlWithNonce.replace(
    /<script(?![^>]*\bnonce=)(?![^>]*\bsrc=)([^>]*)>/gi,
    function(match, attributes) {
      return '<script nonce="' + nonce + '"' + attributes + '>';
    }
  );
  
  return createSecureResponse(htmlWithNonce, {
    ...options,
    nonce,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      ...options.headers
    }
  });
}

// 🔒 Log security configuration on startup
console.log('');
console.log('🛡️  Security Headers Configuration:');
console.log('   Environment: ' + (process.env.NODE_ENV || 'development'));
console.log('   CSP: ' + (process.env.NODE_ENV === 'production' ? '🔒 Strict (no unsafe-eval)' : '⚠️  Relaxed (unsafe-eval for debugging)'));
console.log('   HSTS: ' + (process.env.NODE_ENV === 'production' ? '✅ Enabled' : '❌ Disabled (dev only)'));
console.log('   Nonce Support: ✅ Enabled for inline scripts');
console.log('');
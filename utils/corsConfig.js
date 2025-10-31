// utils/corsConfig.js - Secure CORS Configuration

/**
 * Allowed origins for CORS
 */
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  // Add your production domain here:
  // 'https://yourdomain.com'
];

/**
 * Check if origin is allowed
 */
export function isOriginAllowed(origin) {
  if (!origin) return true; // Same-origin requests
  return ALLOWED_ORIGINS.includes(origin);
}

/**
 * Get CORS headers for response
 */
export function getCORSHeaders(req) {
  const origin = req.headers.get('Origin');
  
  if (!origin || !isOriginAllowed(origin)) {
    // No CORS headers for disallowed origins
    return {};
  }
  
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400' // 24 hours
  };
}

/**
 * Handle OPTIONS preflight requests
 */
export function handleCORSPreflight(req) {
  const origin = req.headers.get('Origin');
  
  if (!origin || !isOriginAllowed(origin)) {
    return new Response('Forbidden', { status: 403 });
  }
  
  return new Response(null, {
    status: 204,
    headers: getCORSHeaders(req)
  });
}
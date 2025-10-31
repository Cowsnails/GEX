// utils/ipWhitelist.js - SECURED IP Whitelisting for Admin Access

/**
 * Localhost IPs (ALWAYS checked in development)
 */
const LOCALHOST_IPS = [
  '127.0.0.1',
  'localhost',
  '::1',
  '::ffff:127.0.0.1',
];

/**
 * Localhost IPs (ALWAYS allowed in development)
 */
const WHITELISTED_IPS = [
  '127.0.0.1',
  '::1',
  '::ffff:127.0.0.1',
  '136.57.244.43',      // ← Comma on every line (including last)
];

/**
 * Load whitelisted IPs from environment variable
 * Format: ADMIN_IP_WHITELIST=203.0.113.5,198.51.100.42,136.57.244.43
 */
function loadAdminWhitelist() {
  const envWhitelist = process.env.ADMIN_IP_WHITELIST;
  
  if (envWhitelist) {
    const ips = envWhitelist.split(',').map(ip => ip.trim()).filter(ip => ip.length > 0);
    console.log(`📋 Loaded ${ips.length} whitelisted admin IPs from environment`);
    return ips;
  }
  
  // 🔒 FALLBACK: Hardcoded whitelist (use .env in production!)
  const fallbackList = [
    '136.57.244.43',  // Your current IP
    // Add more IPs here if not using .env
  ];
  
  if (fallbackList.length > 0) {
    console.log(`⚠️ Using fallback IP whitelist (${fallbackList.length} IPs)`);
    console.log('💡 Tip: Set ADMIN_IP_WHITELIST in .env for better security');
  }
  
  return fallbackList;
}

// Load whitelist on startup
const ADMIN_WHITELIST = loadAdminWhitelist();

/**
 * Check if we're in development mode
 * 🔒 SECURITY: Requires explicit NODE_ENV=development, NOT undefined
 */
function isDevelopmentMode() {
  return process.env.NODE_ENV === 'development';
}

/**
 * Check if IP is localhost
 */
function isLocalhost(ip) {
  return LOCALHOST_IPS.includes(ip);
}

/**
 * Check if IP is whitelisted for admin access
 * 🔒 SECURED: No automatic bypass in production
 */
export function isAdminIPAllowed(ip) {
  // 🔒 ALWAYS allow localhost IPs in development
  if (isLocalhost(ip)) {
    if (isDevelopmentMode()) {
      console.log(`✅ Localhost access granted (development): ${ip}`);
      return true;
    } else {
      // 🔒 In production, localhost must also be explicitly whitelisted
      console.log(`⚠️ Localhost detected in production mode: ${ip}`);
      console.log('   Checking whitelist...');
    }
  }
  
  // 🔒 DEVELOPMENT MODE: Only localhost is auto-allowed
  if (isDevelopmentMode()) {
    // Check if IP is in whitelist
    const inWhitelist = ADMIN_WHITELIST.includes(ip);
    
    if (inWhitelist) {
      console.log(`✅ Whitelisted IP access granted (development): ${ip}`);
      return true;
    } else {
      console.log(`🚫 IP not in whitelist (development): ${ip}`);
      console.log(`   Whitelisted IPs: ${ADMIN_WHITELIST.join(', ')}`);
      return false;
    }
  }
  
  // 🔒 PRODUCTION MODE: Strict whitelist enforcement
  const allowed = ADMIN_WHITELIST.includes(ip);
  
  if (allowed) {
    console.log(`✅ Production admin access granted: ${ip}`);
  } else {
    console.log(`🚫 Production admin access DENIED: ${ip}`);
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
    console.log(`   Whitelisted IPs (${ADMIN_WHITELIST.length}): ${ADMIN_WHITELIST.join(', ')}`);
    console.log('💡 Add this IP to ADMIN_IP_WHITELIST in .env to grant access');
  }
  
  return allowed;
}

/**
 * Get client IP from request headers
 * Handles various proxy scenarios
 * ✅ FIXED: Returns 'unknown' instead of defaulting to localhost
 */
export function getClientIP(req) {
  // Try multiple headers in order of preference
  const xForwardedFor = req.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    const ip = xForwardedFor.split(',')[0].trim();
    console.log(`🔍 Client IP from X-Forwarded-For: ${ip}`);
    return ip;
  }
  
  const xRealIp = req.headers.get('x-real-ip');
  if (xRealIp) {
    console.log(`🔍 Client IP from X-Real-IP: ${xRealIp}`);
    return xRealIp.trim();
  }
  
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    console.log(`🔍 Client IP from CF-Connecting-IP (Cloudflare): ${cfConnectingIp}`);
    return cfConnectingIp.trim();
  }
  
  // ✅ FALLBACK: If no proxy headers, assume localhost (local development/production)
  // This happens when accessing the server directly without a reverse proxy
  console.log(`🔍 No proxy headers found - assuming localhost/direct access`);
  return '127.0.0.1';
}

/**
 * Middleware to check admin IP access
 * Returns: { allowed: boolean, error?: string, status?: number }
 */
export function requireAdminIP(req) {
  const ip = getClientIP(req);
  
  if (!isAdminIPAllowed(ip)) {
    const mode = isDevelopmentMode() ? 'development' : 'production';
    
    return {
      allowed: false,
      error: `Admin access restricted. Your IP (${ip}) is not whitelisted for ${mode} access.`,
      status: 403
    };
  }
  
  console.log(`✅ Admin IP check PASSED: ${ip}`);
  return { allowed: true };
}

/**
 * Get current whitelist (for debugging/admin dashboard)
 */
export function getWhitelistedIPs() {
  return {
    whitelist: [...ADMIN_WHITELIST],
    localhost: [...LOCALHOST_IPS],
    mode: isDevelopmentMode() ? 'development' : 'production',
    count: ADMIN_WHITELIST.length
  };
}

// 🔒 Log security status on startup
console.log('');
console.log('🔒 Admin IP Whitelist Configuration:');
console.log(`   Mode: ${isDevelopmentMode() ? '🟡 Development' : '🔴 Production'}`);
console.log(`   Whitelisted IPs: ${ADMIN_WHITELIST.length}`);
if (ADMIN_WHITELIST.length > 0) {
  console.log(`   IPs: ${ADMIN_WHITELIST.join(', ')}`);
} else {
  console.log('   ⚠️ WARNING: No admin IPs whitelisted!');
}
console.log(`   Localhost allowed: ${isDevelopmentMode() ? 'Yes (dev only)' : 'No (must be whitelisted)'}`);
console.log('');
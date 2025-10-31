// utils/advancedRateLimiter.js - Rate Limiting for ALL Endpoints

import { rateLimiter } from './rateLimiter.js';

/**
 * Rate limit configurations for different endpoint types
 */
const RATE_LIMITS = {
  // Authentication endpoints
  login: { max: 5, window: 60 * 60 * 1000, lockout: 60 * 60 * 1000 }, // 5 per hour
  register: { max: 3, window: 60 * 60 * 1000, lockout: 60 * 60 * 1000 }, // 3 per hour
  passwordChange: { max: 5, window: 60 * 60 * 1000, lockout: 60 * 60 * 1000 }, // 🔥 NEW: 5 per hour
  emailChange: { max: 5, window: 60 * 60 * 1000, lockout: 60 * 60 * 1000 }, // 5 per hour
  
  // Trading endpoints - stricter limits
  placeOrder: { max: 20, window: 60 * 1000, lockout: 5 * 60 * 1000 }, // 20 per minute
  exitPosition: { max: 20, window: 60 * 1000, lockout: 5 * 60 * 1000 }, // 20 per minute
  
  // Broker connection - very strict
  brokerConnect: { max: 10, window: 60 * 60 * 1000, lockout: 60 * 60 * 1000 }, // 10 per hour
  
  // Account/settings - moderate
  accountUpdate: { max: 30, window: 60 * 60 * 1000, lockout: 10 * 60 * 1000 }, // 30 per hour
  
  // 💬 CHAT: New rate limit for chat messages
  chatMessage: { max: 10, window: 60 * 1000, lockout: 5 * 60 * 1000 }, // 10 messages per minute
  
  // General API - generous but prevents abuse
  general: { max: 100, window: 60 * 1000, lockout: 60 * 1000 }, // 100 per minute
};

/**
 * Get client identifier (IP + optional user ID)
 */
function getClientId(req, userId = null) {
  const ip = req.headers.get('x-forwarded-for') || 
             req.headers.get('x-real-ip') || 
             'unknown';
  
  return userId ? `${ip}:${userId}` : ip;
}

/**
 * Check rate limit for an endpoint
 */
export function checkRateLimit(endpoint, req, userId = null) {
  const config = RATE_LIMITS[endpoint] || RATE_LIMITS.general;
  const clientId = getClientId(req, userId);
  const key = `${endpoint}:${clientId}`;
  
  return rateLimiter.checkLimit(
    key,
    config.max,
    config.window,
    config.lockout
  );
}

/**
 * Middleware wrapper for rate limiting
 * Usage: const rateCheck = requireRateLimit('placeOrder', req, userId);
 */
export function requireRateLimit(endpoint, req, userId = null) {
  const result = checkRateLimit(endpoint, req, userId);
  
  if (!result.allowed) {
    return {
      allowed: false,
      response: new Response(JSON.stringify({
        success: false,
        error: result.message,
        retryAfter: result.retryAfter,
        remainingAttempts: 0
      }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(result.retryAfter)
        }
      })
    };
  }
  
  return {
    allowed: true,
    remainingAttempts: result.remainingAttempts
  };
}

/**
 * Reset rate limit on successful operation
 */
export function resetRateLimit(endpoint, req, userId = null) {
  const clientId = getClientId(req, userId);
  const key = `${endpoint}:${clientId}`;
  rateLimiter.reset(key);
}
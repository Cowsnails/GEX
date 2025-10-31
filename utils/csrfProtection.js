// utils/csrfProtection.js - CSRF Token Protection

import { randomBytes } from 'crypto';

class CSRFProtection {
  constructor() {
    // Store tokens per session: sessionToken -> csrfToken
    this.tokens = new Map();
    
    // Cleanup old tokens every 10 minutes
    setInterval(() => this.cleanup(), 10 * 60 * 1000);
  }
  
  /**
   * Generate a CSRF token for a session
   */
  generateToken(sessionToken) {
    const csrfToken = randomBytes(32).toString('hex');
    this.tokens.set(sessionToken, {
      token: csrfToken,
      createdAt: Date.now()
    });
    return csrfToken;
  }
  
  /**
   * Verify CSRF token matches session
   */
  verifyToken(sessionToken, csrfToken) {
    const stored = this.tokens.get(sessionToken);
    
    if (!stored) {
      return { valid: false, error: 'No CSRF token found for session' };
    }
    
    // Check if token expired (1 hour)
    const oneHour = 60 * 60 * 1000;
    if (Date.now() - stored.createdAt > oneHour) {
      this.tokens.delete(sessionToken);
      return { valid: false, error: 'CSRF token expired' };
    }
    
    // Compare tokens
    if (stored.token !== csrfToken) {
      return { valid: false, error: 'Invalid CSRF token' };
    }
    
    return { valid: true };
  }
  
  /**
   * Remove token when session ends
   */
  removeToken(sessionToken) {
    this.tokens.delete(sessionToken);
  }
  
  /**
   * Cleanup expired tokens
   */
  cleanup() {
    const oneHour = 60 * 60 * 1000;
    const now = Date.now();
    
    for (const [sessionToken, data] of this.tokens.entries()) {
      if (now - data.createdAt > oneHour) {
        this.tokens.delete(sessionToken);
      }
    }
  }
  
  /**
   * Get or create token for session
   */
  getToken(sessionToken) {
    const stored = this.tokens.get(sessionToken);
    
    if (!stored || Date.now() - stored.createdAt > 60 * 60 * 1000) {
      return this.generateToken(sessionToken);
    }
    
    return stored.token;
  }
}

// Singleton instance
export const csrfProtection = new CSRFProtection();

/**
 * Middleware function for server.js
 * Add this to check CSRF on state-changing requests
 */
export function requireCSRF(req, sessionToken) {
  // Only check CSRF for state-changing methods
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    return { valid: true };
  }
  
  // Get CSRF token from header
  const csrfToken = req.headers.get('X-CSRF-Token');
  
  if (!csrfToken) {
    return { 
      valid: false, 
      error: 'Missing CSRF token',
      status: 403
    };
  }
  
  // Verify token
  const result = csrfProtection.verifyToken(sessionToken, csrfToken);
  
  if (!result.valid) {
    return {
      valid: false,
      error: result.error,
      status: 403
    };
  }
  
  return { valid: true };
}
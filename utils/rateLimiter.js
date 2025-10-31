// utils/rateLimiter.js - Prevent Brute Force Attacks
export class RateLimiter {
  constructor() {
    // Store: IP -> { attempts: number, firstAttempt: timestamp, lockedUntil: timestamp }
    this.attempts = new Map();
    this.lockouts = new Map();
    
    // Cleanup old entries every 10 minutes
    setInterval(() => this.cleanup(), 10 * 60 * 1000);
  }
  
  /**
   * Check if IP is allowed to attempt action
   * @param {string} identifier - IP address or username
   * @param {number} maxAttempts - Max attempts before lockout (default: 5)
   * @param {number} windowMs - Time window in ms (default: 1 hour)
   * @param {number} lockoutMs - Lockout duration in ms (default: 1 hour)
   * @returns {object} { allowed: boolean, remainingAttempts: number, retryAfter: number }
   */
  checkLimit(identifier, maxAttempts = 5, windowMs = 60 * 60 * 1000, lockoutMs = 60 * 60 * 1000) {
    const now = Date.now();
    
    // Check if currently locked out
    const lockout = this.lockouts.get(identifier);
    if (lockout && lockout > now) {
      const retryAfter = Math.ceil((lockout - now) / 1000);
      return {
        allowed: false,
        remainingAttempts: 0,
        retryAfter,
        message: `Too many attempts. Try again in ${Math.ceil(retryAfter / 60)} minutes.`
      };
    } else if (lockout && lockout <= now) {
      // Lockout expired, clear it
      this.lockouts.delete(identifier);
      this.attempts.delete(identifier);
    }
    
    // Get attempt record
    let record = this.attempts.get(identifier);
    
    if (!record) {
      // First attempt
      record = { attempts: 1, firstAttempt: now };
      this.attempts.set(identifier, record);
      
      return {
        allowed: true,
        remainingAttempts: maxAttempts - 1,
        retryAfter: 0,
        message: `${maxAttempts - 1} attempts remaining`
      };
    }
    
    // ✅ FIXED: Increment attempts FIRST, then check window
    record.attempts++;
    
    // Check if window expired AFTER incrementing
    if (now - record.firstAttempt > windowMs) {
      // Reset window - set attempts to 1 since we already incremented
      record.attempts = 1;
      record.firstAttempt = now;
      
      return {
        allowed: true,
        remainingAttempts: maxAttempts - 1,
        retryAfter: 0,
        message: `${maxAttempts - 1} attempts remaining`
      };
    }
    
    // Check if exceeded limit
    if (record.attempts > maxAttempts) {
      // Lock them out
      const lockedUntil = now + lockoutMs;
      this.lockouts.set(identifier, lockedUntil);
      
      console.log(`🚫 Rate limit exceeded for ${identifier} - locked for ${lockoutMs / 1000 / 60} minutes`);
      
      return {
        allowed: false,
        remainingAttempts: 0,
        retryAfter: Math.ceil(lockoutMs / 1000),
        message: `Too many attempts. Account locked for ${lockoutMs / 1000 / 60} minutes.`
      };
    }
    
    return {
      allowed: true,
      remainingAttempts: maxAttempts - record.attempts,
      retryAfter: 0,
      message: `${maxAttempts - record.attempts} attempts remaining`
    };
  }
  
  /**
   * Reset attempts for an identifier (call on successful login)
   */
  reset(identifier) {
    this.attempts.delete(identifier);
    this.lockouts.delete(identifier);
    console.log(`✅ Rate limit reset for ${identifier}`);
  }
  
  /**
   * Cleanup old entries
   */
  cleanup() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    // Clean up old attempts
    for (const [identifier, record] of this.attempts.entries()) {
      if (record.firstAttempt < oneHourAgo) {
        this.attempts.delete(identifier);
      }
    }
    
    // Clean up expired lockouts
    for (const [identifier, lockedUntil] of this.lockouts.entries()) {
      if (lockedUntil < now) {
        this.lockouts.delete(identifier);
      }
    }
    
    console.log(`🧹 Rate limiter cleanup complete`);
  }
  
  /**
   * Get current status for identifier
   */
  getStatus(identifier) {
    const record = this.attempts.get(identifier);
    const lockout = this.lockouts.get(identifier);
    
    if (lockout && lockout > Date.now()) {
      return {
        locked: true,
        attempts: record?.attempts || 0,
        lockedUntil: new Date(lockout).toISOString()
      };
    }
    
    return {
      locked: false,
      attempts: record?.attempts || 0,
      lockedUntil: null
    };
  }
}

// Create singleton instance
export const rateLimiter = new RateLimiter();
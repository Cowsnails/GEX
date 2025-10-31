// utils/sessionRotation.js - Automatic Session Token Rotation

import { UserManager } from '../auth/userManager.js';
import { csrfProtection } from './csrfProtection.js';

/**
 * Check if session needs rotation (every 1 hour)
 */
export function shouldRotateSession(session) {
  if (!session || !session.valid) return false;
  
  // Get session creation time from database
  const stmt = global.db?.prepare('SELECT created_at FROM sessions WHERE user_id = ?');
  const result = stmt?.get(session.userId);
  
  if (!result) return false;
  
  const createdAt = new Date(result.created_at);
  const hoursSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
  
  // Rotate if session is older than 1 hour
  return hoursSinceCreation >= 1;
}

/**
 * Rotate session token (call on sensitive operations)
 */
export function rotateSessionToken(oldToken) {
  const result = UserManager.rotateSession(oldToken);
  
  if (result.success) {
    // Update CSRF token for new session
    csrfProtection.removeToken(oldToken);
    csrfProtection.generateToken(result.newToken);
    
    return {
      success: true,
      newToken: result.newToken,
      csrfToken: csrfProtection.getToken(result.newToken)
    };
  }
  
  return { success: false };
}

/**
 * Middleware to check and rotate session if needed
 */
export async function checkSessionRotation(req, token) {
  const session = UserManager.verifySession(token);
  
  if (!session.valid) return null;
  
  if (shouldRotateSession(session)) {
    const rotated = rotateSessionToken(token);
    
    if (rotated.success) {
      console.log(`🔄 Session rotated for user ${session.userId}`);
      return {
        rotated: true,
        newToken: rotated.newToken,
        csrfToken: rotated.csrfToken
      };
    }
  }
  
  return { rotated: false };
}
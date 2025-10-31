// utils/passwordValidator.js - Strong Password Requirements

/**
 * Validate password strength
 * Requirements:
 * - At least 12 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 */
export function validatePassword(password) {
  const errors = [];
  
  // Length check
  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long');
  }
  
  // Uppercase check
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  // Lowercase check
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  // Number check
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  // Special character check
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*...)');
  }
  
  // Common password check
  const commonPasswords = [
    'password123', 'Password123!', '123456789abc', 'qwerty123',
    'admin123456', 'letmein123', 'welcome123', 'Password1!'
  ];
  
  if (commonPasswords.some(common => password.toLowerCase().includes(common.toLowerCase()))) {
    errors.push('Password is too common, please choose a more unique password');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    strength: calculateStrength(password)
  };
}

/**
 * Calculate password strength score (0-100)
 */
function calculateStrength(password) {
  let score = 0;
  
  // Length bonus
  score += Math.min(password.length * 2, 40);
  
  // Character variety
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 10;
  if (/[0-9]/.test(password)) score += 10;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 10;
  
  // Multiple character types
  const types = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter(regex => regex.test(password)).length;
  score += types * 5;
  
  // Penalize repetition
  if (/(.)\1{2,}/.test(password)) score -= 10;
  
  // Penalize sequential characters
  if (/abc|bcd|cde|123|234|345/.test(password.toLowerCase())) score -= 10;
  
  return Math.min(Math.max(score, 0), 100);
}

/**
 * Get password strength label
 */
export function getStrengthLabel(score) {
  if (score < 40) return { label: 'Weak', color: '#ef4444' };
  if (score < 60) return { label: 'Fair', color: '#f59e0b' };
  if (score < 80) return { label: 'Good', color: '#3b82f6' };
  return { label: 'Strong', color: '#10b981' };
}
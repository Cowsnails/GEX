// utils/inputValidator.js - Sanitize and Validate All Inputs

/**
 * Validate and sanitize username
 */
export function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required' };
  }
  
  const trimmed = username.trim();
  
  if (trimmed.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }
  
  if (trimmed.length > 30) {
    return { valid: false, error: 'Username must be less than 30 characters' };
  }
  
  // Only allow alphanumeric and underscores
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return { valid: false, error: 'Username can only contain letters, numbers, and underscores' };
  }
  
  return { valid: true, value: trimmed };
}

/**
 * Validate email
 */
export function validateEmail(email) {
  if (!email) {
    return { valid: true, value: null }; // Email is optional
  }
  
  if (typeof email !== 'string') {
    return { valid: false, error: 'Invalid email format' };
  }
  
  const trimmed = email.trim();
  
  // Basic email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: 'Invalid email format' };
  }
  
  if (trimmed.length > 100) {
    return { valid: false, error: 'Email too long' };
  }
  
  return { valid: true, value: trimmed.toLowerCase() };
}

/**
 * Validate API key format
 */
export function validateApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    return { valid: false, error: 'API key is required' };
  }
  
  const trimmed = apiKey.trim();
  
  if (trimmed.length < 10) {
    return { valid: false, error: 'API key appears too short' };
  }
  
  if (trimmed.length > 200) {
    return { valid: false, error: 'API key too long' };
  }
  
  // Check for common placeholders
  const invalidPatterns = ['test', 'fake', 'invalid', 'xxx', '123'];
  if (invalidPatterns.some(pattern => trimmed.toLowerCase().includes(pattern))) {
    return { valid: false, error: 'API key appears to be a placeholder' };
  }
  
  return { valid: true, value: trimmed };
}

/**
 * Validate stock symbol
 */
export function validateSymbol(symbol) {
  if (!symbol || typeof symbol !== 'string') {
    return { valid: false, error: 'Symbol is required' };
  }
  
  const trimmed = symbol.trim().toUpperCase();
  
  if (trimmed.length < 1 || trimmed.length > 5) {
    return { valid: false, error: 'Symbol must be 1-5 characters' };
  }
  
  // Only allow letters
  if (!/^[A-Z]+$/.test(trimmed)) {
    return { valid: false, error: 'Symbol can only contain letters' };
  }
  
  return { valid: true, value: trimmed };
}

/**
 * Validate expiration date format (YYYY-MM-DD)
 */
export function validateExpiration(expiration) {
  if (!expiration || typeof expiration !== 'string') {
    return { valid: false, error: 'Expiration date is required' };
  }
  
  const trimmed = expiration.trim();
  
  // Check format YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return { valid: false, error: 'Invalid expiration format (use YYYY-MM-DD)' };
  }
  
  // Validate it's a real date
  const date = new Date(trimmed + 'T00:00:00'); // Parse as local time at midnight
  if (isNaN(date.getTime())) {
    return { valid: false, error: 'Invalid expiration date' };
  }

  // Check if date is not in the past (allow 0 DTE - today is valid)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Allow today or future dates (0 DTE is valid)
  if (date < today) {
    return { valid: false, error: 'Expiration date cannot be in the past' };
  }
  
  return { valid: true, value: trimmed };
}

/**
 * Validate strike price
 */
export function validateStrike(strike) {
  if (strike === undefined || strike === null) {
    return { valid: false, error: 'Strike price is required' };
  }
  
  const num = Number(strike);
  
  if (isNaN(num)) {
    return { valid: false, error: 'Strike must be a number' };
  }
  
  if (num <= 0) {
    return { valid: false, error: 'Strike must be positive' };
  }
  
  if (num > 100000) {
    return { valid: false, error: 'Strike price too high' };
  }
  
  return { valid: true, value: num };
}

/**
 * Validate quantity
 */
export function validateQuantity(quantity) {
  if (quantity === undefined || quantity === null) {
    return { valid: false, error: 'Quantity is required' };
  }
  
  const num = Number(quantity);
  
  if (isNaN(num)) {
    return { valid: false, error: 'Quantity must be a number' };
  }
  
  if (!Number.isInteger(num)) {
    return { valid: false, error: 'Quantity must be a whole number' };
  }
  
  if (num <= 0) {
    return { valid: false, error: 'Quantity must be positive' };
  }
  
  if (num > 10000) {
    return { valid: false, error: 'Quantity too large (max 10000)' };
  }
  
  return { valid: true, value: num };
}

/**
 * Validate option type (call or put)
 */
export function validateOptionType(type) {
  if (!type || typeof type !== 'string') {
    return { valid: false, error: 'Option type is required' };
  }
  
  const normalized = type.trim().toLowerCase();
  
  if (normalized !== 'call' && normalized !== 'put') {
    return { valid: false, error: 'Option type must be "call" or "put"' };
  }
  
  return { valid: true, value: normalized };
}

/**
 * Validate order action (buy or sell)
 */
export function validateAction(action) {
  if (!action || typeof action !== 'string') {
    return { valid: false, error: 'Action is required' };
  }
  
  const normalized = action.trim().toLowerCase();
  
  if (normalized !== 'buy' && normalized !== 'sell') {
    return { valid: false, error: 'Action must be "buy" or "sell"' };
  }
  
  return { valid: true, value: normalized };
}

/**
 * Validate account type (default, paper, or live)
 */
export function validateAccountType(accountType) {
  if (!accountType || typeof accountType !== 'string') {
    return { valid: false, error: 'Account type is required' };
  }

  const normalized = accountType.trim().toLowerCase();

  // Accept both 'default' and 'manual' for backward compatibility
  if (normalized !== 'default' && normalized !== 'manual' && normalized !== 'paper' && normalized !== 'live') {
    return { valid: false, error: 'Account type must be "default", "paper", or "live"' };
  }

  // Normalize 'manual' to 'default'
  const value = normalized === 'manual' ? 'default' : normalized;

  return { valid: true, value };
}

/**
 * Sanitize general string input (prevent XSS)
 */
export function sanitizeString(input, maxLength = 1000) {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  let sanitized = input.trim();
  
  // Truncate if too long
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  // Remove any HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');
  
  return sanitized;
}

/**
 * Validate complete order object
 */
export function validateOrder(order) {
  const errors = [];
  
  const symbolCheck = validateSymbol(order.symbol);
  if (!symbolCheck.valid) errors.push(symbolCheck.error);
  
  const expirationCheck = validateExpiration(order.expiration);
  if (!expirationCheck.valid) errors.push(expirationCheck.error);
  
  const strikeCheck = validateStrike(order.strike);
  if (!strikeCheck.valid) errors.push(strikeCheck.error);
  
  const typeCheck = validateOptionType(order.type);
  if (!typeCheck.valid) errors.push(typeCheck.error);
  
  const actionCheck = validateAction(order.action);
  if (!actionCheck.valid) errors.push(actionCheck.error);
  
  const quantityCheck = validateQuantity(order.quantity);
  if (!quantityCheck.valid) errors.push(quantityCheck.error);
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  return {
    valid: true,
    value: {
      symbol: symbolCheck.value,
      expiration: expirationCheck.value,
      strike: strikeCheck.value,
      type: typeCheck.value,
      action: actionCheck.value,
      quantity: quantityCheck.value
    }
  };
}
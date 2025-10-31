// utils/requestValidator.js - Validate All Incoming Requests - UPDATED WITH GMAIL VALIDATION

import { 
  validateUsername, 
  validateEmail, 
  validateApiKey,
  validateSymbol,
  validateExpiration,
  validateStrike,
  validateQuantity,
  validateOptionType,
  validateAction,
  validateAccountType,
  sanitizeString
} from './inputValidator.js';
// 📧 NEW: Import Gmail validation
import { isValidGmail } from './emailService.js';

/**
 * Maximum request body sizes (in bytes)
 */
const MAX_BODY_SIZE = {
  default: 1024 * 100,      // 100KB default
  upload: 1024 * 1024 * 10  // 10MB for file uploads
};

/**
 * Validate and parse JSON request body with size limit
 */
export async function parseAndValidateBody(req, maxSize = MAX_BODY_SIZE.default) {
  try {
    // Get content length
    const contentLength = parseInt(req.headers.get('content-length') || '0');
    
    if (contentLength > maxSize) {
      return {
        valid: false,
        error: `Request body too large (max ${maxSize} bytes)`,
        status: 413
      };
    }
    
    // Parse JSON
    const body = await req.json();
    
    // Basic type check
    if (typeof body !== 'object' || body === null) {
      return {
        valid: false,
        error: 'Invalid request body format',
        status: 400
      };
    }
    
    return {
      valid: true,
      body
    };
    
  } catch (error) {
    return {
      valid: false,
      error: 'Invalid JSON in request body',
      status: 400
    };
  }
}

/**
 * Validate registration request - 📧 UPDATED: Gmail REQUIRED
 */
export function validateRegistrationRequest(body) {
  const errors = [];
  
  // Username validation
  const usernameCheck = validateUsername(body.username);
  if (!usernameCheck.valid) errors.push(usernameCheck.error);
  
  // 📧 NEW: Email validation - REQUIRED and must be Gmail
  if (!body.email) {
    errors.push('Gmail address is required for registration');
  } else {
    const gmailCheck = isValidGmail(body.email);
    if (!gmailCheck.valid) {
      errors.push(gmailCheck.error);
    }
  }
  
  // Password validation
  if (!body.password || typeof body.password !== 'string') {
    errors.push('Password is required');
  } else if (body.password.length < 12) {
    errors.push('Password must be at least 12 characters');
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  const gmailCheck = isValidGmail(body.email);
  
  return {
    valid: true,
    data: {
      username: usernameCheck.value,
      email: gmailCheck.email, // Always lowercase Gmail
      password: body.password
    }
  };
}

/**
 * Validate login request
 */
export function validateLoginRequest(body) {
  const errors = [];
  
  if (!body.username || typeof body.username !== 'string') {
    errors.push('Username is required');
  }
  
  if (!body.password || typeof body.password !== 'string') {
    errors.push('Password is required');
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  return {
    valid: true,
    data: {
      username: sanitizeString(body.username, 30),
      password: body.password
    }
  };
}

/**
 * Validate broker connection request
 */
export function validateBrokerConnectRequest(body) {
  const errors = [];
  
  const apiKeyCheck = validateApiKey(body.apiKey);
  if (!apiKeyCheck.valid) errors.push(apiKeyCheck.error);
  
  const apiSecretCheck = validateApiKey(body.apiSecret);
  if (!apiSecretCheck.valid) errors.push(apiSecretCheck.error);
  
  const accountTypeCheck = validateAccountType(body.accountType || (body.isPaper ? 'paper' : 'live'));
  if (!accountTypeCheck.valid) errors.push(accountTypeCheck.error);
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  return {
    valid: true,
    data: {
      apiKey: apiKeyCheck.value,
      apiSecret: apiSecretCheck.value,
      accountType: accountTypeCheck.value,
      isPaper: accountTypeCheck.value === 'paper'
    }
  };
}

/**
 * Validate order placement request
 */
export function validateOrderRequest(body) {
  const errors = [];

  // Validate symbol
  const symbolCheck = validateSymbol(body.symbol);
  if (!symbolCheck.valid) errors.push(symbolCheck.error);

  // Validate expiration
  const expirationCheck = validateExpiration(body.expiration);
  if (!expirationCheck.valid) errors.push(expirationCheck.error);

  // Validate direction (CALL or PUT for options)
  if (!body.direction || typeof body.direction !== 'string') {
    errors.push('Direction is required');
  } else {
    const dir = body.direction.trim().toUpperCase();
    if (dir !== 'CALL' && dir !== 'PUT') {
      errors.push('Direction must be "CALL" or "PUT"');
    }
  }

  // Validate cash amount
  if (!body.cashAmount || isNaN(body.cashAmount)) {
    errors.push('Cash amount must be a valid number');
  } else if (body.cashAmount <= 0) {
    errors.push('Cash amount must be positive');
  } else if (body.cashAmount > 1000000) {
    errors.push('Cash amount too large');
  }

  // Validate currentPrice
  if (!body.currentPrice || isNaN(body.currentPrice)) {
    errors.push('Current price must be a valid number');
  } else if (body.currentPrice <= 0) {
    errors.push('Current price must be positive');
  }

  // Validate optionsData is array
  if (!Array.isArray(body.optionsData)) {
    errors.push('Options data must be an array');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      symbol: symbolCheck.value,
      expiration: expirationCheck.value,
      direction: body.direction.trim().toUpperCase(), // CALL or PUT
      cashAmount: parseFloat(body.cashAmount),
      currentPrice: parseFloat(body.currentPrice),
      optionsData: body.optionsData,
      accountType: body.accountType,
      premiumPrice: body.premiumPrice ? parseFloat(body.premiumPrice) : undefined,  // PASS THROUGH THE EXACT PREMIUM
      strike: body.strike ? parseFloat(body.strike) : undefined,
      signalId: body.signalId,
      isManual: body.isManual
    }
  };
}

/**
 * Validate account switch request
 */
export function validateAccountSwitchRequest(body) {
  const accountTypeCheck = validateAccountType(body.accountType);
  
  if (!accountTypeCheck.valid) {
    return { valid: false, errors: [accountTypeCheck.error] };
  }
  
  return {
    valid: true,
    data: {
      accountType: accountTypeCheck.value
    }
  };
}

/**
 * Validate position exit request
 */
export function validateExitPositionRequest(body) {
  // ✅ FIXED: Accept both numbers AND strings (for manual/paper positions)
  if (!body.positionId || (typeof body.positionId !== 'number' && typeof body.positionId !== 'string')) {
    return {
      valid: false,
      errors: ['Position ID must be a valid number or string']
    };
  }

  // For numeric IDs, validate they're positive
  if (typeof body.positionId === 'number' && body.positionId <= 0) {
    return {
      valid: false,
      errors: ['Invalid position ID']
    };
  }

  // For string IDs, validate they're not empty
  if (typeof body.positionId === 'string' && body.positionId.trim() === '') {
    return {
      valid: false,
      errors: ['Position ID cannot be empty']
    };
  }

  return {
    valid: true,
    data: {
      positionId: body.positionId,
      accountType: body.accountType,
      // 🔥 CRITICAL FIX: Pass through exit prices for accurate premium accounting
      currentPrice: body.currentPrice ? parseFloat(body.currentPrice) : undefined,
      entryPrice: body.entryPrice ? parseFloat(body.entryPrice) : undefined,
      // Pass through exit settings
      aggressiveFill: body.aggressiveFill,
      exitGuarantee: body.exitGuarantee,
      fallbackGuarantee: body.fallbackGuarantee,
      declineProtection: body.declineProtection,
      marketOrderProtection: body.marketOrderProtection,
      marketOrderTimer: body.marketOrderTimer
    }
  };
}
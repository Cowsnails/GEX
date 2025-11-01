// auth/userManager.js - Multi-User Authentication & Session Management - SECURED + EMAIL VERIFICATION
import { Database } from 'bun:sqlite';
import { randomBytes } from 'crypto';
import { encrypt, decrypt } from '../utils/encryption.js';
import { validatePassword } from '../utils/passwordValidator.js';
import { validateUsername, validateEmail } from '../utils/inputValidator.js';

// 🔒 SECURITY: Sliding window session - refreshes on activity
const SESSION_INACTIVITY_TIMEOUT = 8 * 60 * 60 * 1000; // 8 hours of inactivity
const SESSION_MAX_LIFETIME = 7 * 24 * 60 * 60 * 1000; // Max 7 days total (security limit)

// 🔒 SECURITY: Account lockout settings
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 60 * 60 * 1000; // 1 hour lockout

// Initialize SQLite database for user management
const db = new Database('users.db');

// Create tables
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email TEXT,
    is_admin BOOLEAN DEFAULT 0,
    active_account TEXT DEFAULT 'default',
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS user_brokers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    broker_name TEXT NOT NULL,
    account_type TEXT NOT NULL,
    api_key TEXT NOT NULL,
    api_secret TEXT NOT NULL,
    is_paper BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, broker_name, account_type)
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    session_token TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    last_activity DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS activation_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_code TEXT UNIQUE NOT NULL,
    is_used BOOLEAN DEFAULT 0,
    used_by_user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    used_at DATETIME,
    FOREIGN KEY (used_by_user_id) REFERENCES users(id)
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS positions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    symbol TEXT NOT NULL,
    option_symbol TEXT NOT NULL,
    strike REAL NOT NULL,
    expiration TEXT NOT NULL,
    right TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    entry_price REAL NOT NULL,
    entry_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    exit_price REAL,
    exit_time DATETIME,
    pnl REAL,
    status TEXT DEFAULT 'OPEN',
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

// 🔥 MIGRATION: Add account_type column if it doesn't exist
try {
  const testQuery = db.prepare('SELECT account_type FROM user_brokers LIMIT 1');
  testQuery.get();
} catch (error) {
  console.log('🔄 Migrating user_brokers table...');
  try {
    db.run('ALTER TABLE user_brokers ADD COLUMN account_type TEXT DEFAULT "paper"');
    db.run('UPDATE user_brokers SET account_type = CASE WHEN is_paper = 1 THEN "paper" ELSE "live" END WHERE account_type IS NULL');
  } catch (alterError) {
    console.error('❌ Migration failed:', alterError.message);
  }
}

// 🔥 MIGRATION: Add active_account column (one-time only)
try {
  const testQuery = db.prepare('SELECT active_account FROM users LIMIT 1');
  testQuery.get();
  // Column exists, migration already complete
} catch (error) {
  console.log('🔄 Migrating users table (active_account)...');
  try {
    db.run('ALTER TABLE users ADD COLUMN active_account TEXT DEFAULT "default"');
    console.log('✅ Added active_account column to users table');
  } catch (alterError) {
    console.log('⚠️ Could not add active_account column (may already exist)');
  }
}

// ❌ REMOVED: Migration that was resetting active_account on every server start
// This was causing accounts to reset to 'default' even after user switched them
// The active_account column now persists user selection correctly

// 🔥 MIGRATION: Add is_admin column
try {
  const testQuery = db.prepare('SELECT is_admin FROM users LIMIT 1');
  testQuery.get();
} catch (error) {
  console.log('🔄 Migrating users table (is_admin)...');
  try {
    db.run('ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0');
  } catch (alterError) {}
}

// 🔥 MIGRATION: Add last_activity column for sliding window sessions
try {
  const testQuery = db.prepare('SELECT last_activity FROM sessions LIMIT 1');
  testQuery.get();
  console.log('✅ sessions table has last_activity column');
} catch (error) {
  console.log('🔄 Adding last_activity column for sliding sessions...');
  try {
    // Windows SQLite doesn't allow DEFAULT CURRENT_TIMESTAMP in ALTER TABLE
    // So we add it without default, then set values
    db.run('ALTER TABLE sessions ADD COLUMN last_activity DATETIME');
    // Set last_activity = created_at for existing sessions
    db.run('UPDATE sessions SET last_activity = created_at WHERE last_activity IS NULL');
    console.log('✅ Sliding window session support added');
  } catch (alterError) {
    console.error('Session migration warning:', alterError.message);
    console.log('Tip: Delete users.db to recreate with new schema');
  }
}

// 🔒 NEW: Add lockout columns
try {
  const testQuery = db.prepare('SELECT failed_login_attempts, locked_until FROM users LIMIT 1');
  testQuery.get();
  console.log('✅ users table has lockout columns');
} catch (error) {
  console.log('🔄 Adding account lockout columns...');
  try {
    db.run('ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0');
    db.run('ALTER TABLE users ADD COLUMN locked_until DATETIME');
    console.log('✅ Account lockout columns added');
  } catch (alterError) {
    console.error('Lockout migration warning:', alterError.message);
  }
}

// 📧 NEW: Add email_verified column
try {
  const testQuery = db.prepare('SELECT email_verified FROM users LIMIT 1');
  testQuery.get();
  console.log('✅ users table has email_verified column');
} catch (error) {
  console.log('🔄 Adding email_verified column...');
  try {
    db.run('ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0');
    console.log('✅ Email verification column added');
  } catch (alterError) {
    console.error('Email verification migration warning:', alterError.message);
  }
}

// 🔥 MIGRATION: Add entry_order_id and exit_order_id columns to positions table
try {
  const testQuery = db.prepare('SELECT entry_order_id, exit_order_id FROM positions LIMIT 1');
  testQuery.get();
  console.log('✅ positions table has order ID columns');
} catch (error) {
  console.log('🔄 Adding order ID columns to positions table...');
  try {
    db.run('ALTER TABLE positions ADD COLUMN entry_order_id TEXT');
    db.run('ALTER TABLE positions ADD COLUMN exit_order_id TEXT');
    console.log('✅ Order ID columns added to positions table');
  } catch (alterError) {
    console.error('Order ID migration warning:', alterError.message);
  }
}

// 🔑 MIGRATION: Add activation_key column to users table
try {
  const testQuery = db.prepare('SELECT activation_key FROM users LIMIT 1');
  testQuery.get();
  console.log('✅ users table has activation_key column');
} catch (error) {
  console.log('🔄 Adding activation_key column to users table...');
  try {
    db.run('ALTER TABLE users ADD COLUMN activation_key TEXT');
    console.log('✅ Activation key column added to users table');
  } catch (alterError) {
    console.error('Activation key migration warning:', alterError.message);
  }
}

// Password hashing
function hashPassword(password) {
  return Bun.password.hashSync(password);
}

function verifyPassword(password, hash) {
  return Bun.password.verifySync(password, hash);
}

// Generate session token
function generateSessionToken() {
  return randomBytes(32).toString('hex');
}

// User Management Functions
export class UserManager {
  
  // Make user admin
  static makeAdmin(userId) {
    try {
      const stmt = db.prepare('UPDATE users SET is_admin = 1 WHERE id = ?');
      stmt.run(userId);
      console.log(`👑 User ${userId} is now an ADMIN`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error making admin:', error.message);
      return { success: false };
    }
  }
  
  // Make user admin by username
  static makeAdminByUsername(username) {
    try {
      const stmt = db.prepare('UPDATE users SET is_admin = 1 WHERE username = ?');
      const result = stmt.run(username);
      
      if (result.changes === 0) {
        return { success: false, error: 'User not found' };
      }
      
      console.log(`👑 ${username} is now an ADMIN`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error making admin:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  // Remove admin privileges
  static removeAdmin(userId) {
    try {
      const stmt = db.prepare('UPDATE users SET is_admin = 0 WHERE id = ?');
      stmt.run(userId);
      console.log(`👤 User ${userId} is no longer an admin`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error removing admin:', error.message);
      return { success: false };
    }
  }
  
  // Check if user is admin
  static isAdmin(userId) {
    try {
      const stmt = db.prepare('SELECT is_admin FROM users WHERE id = ?');
      const user = stmt.get(userId);
      return user && user.is_admin === 1;
    } catch (error) {
      console.error('❌ Error checking admin status:', error.message);
      return false;
    }
  }
  
  // 🔒 NEW: Check if account is locked
  static isAccountLocked(userId) {
    try {
      const stmt = db.prepare('SELECT locked_until, failed_login_attempts FROM users WHERE id = ?');
      const user = stmt.get(userId);
      
      if (!user) return false;
      
      // Check if locked_until is in the future
      if (user.locked_until) {
        const lockExpiry = new Date(user.locked_until);
        const now = new Date();
        
        if (lockExpiry > now) {
          const minutesRemaining = Math.ceil((lockExpiry - now) / 60000);
          return { locked: true, minutesRemaining };
        } else {
          // Lock expired, reset counter
          const resetStmt = db.prepare('UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?');
          resetStmt.run(userId);
          return { locked: false };
        }
      }
      
      return { locked: false };
    } catch (error) {
      console.error('❌ Error checking lock status:', error.message);
      return { locked: false };
    }
  }
  
  // 🔒 NEW: Record failed login attempt
  static recordFailedLogin(userId) {
    try {
      const stmt = db.prepare('SELECT failed_login_attempts FROM users WHERE id = ?');
      const user = stmt.get(userId);
      
      if (!user) return;
      
      const newAttempts = (user.failed_login_attempts || 0) + 1;
      
      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        // Lock the account
        const lockUntil = new Date(Date.now() + LOCKOUT_DURATION);
        const lockStmt = db.prepare('UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?');
        lockStmt.run(newAttempts, lockUntil.toISOString(), userId);
        console.log(`🔒 Account ${userId} locked until ${lockUntil.toLocaleString()}`);
      } else {
        // Increment failed attempts
        const updateStmt = db.prepare('UPDATE users SET failed_login_attempts = ? WHERE id = ?');
        updateStmt.run(newAttempts, userId);
        console.log(`Failed login attempt ${newAttempts}/${MAX_LOGIN_ATTEMPTS} for user ${userId}`);
      }
    } catch (error) {
      console.error('❌ Error recording failed login:', error.message);
    }
  }
  
  // 🔒 NEW: Reset failed login attempts on successful login
  static resetFailedLogins(userId) {
    try {
      const stmt = db.prepare('UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?');
      stmt.run(userId);
    } catch (error) {
      console.error('❌ Error resetting failed logins:', error.message);
    }
  }
  
  // 📧 NEW: Check if user's email is verified
  static isEmailVerified(userId) {
    try {
      const stmt = db.prepare('SELECT email_verified FROM users WHERE id = ?');
      const user = stmt.get(userId);
      return user ? !!user.email_verified : false;
    } catch (error) {
      console.error('❌ Error checking email verification:', error);
      return false;
    }
  }
  
  // 📧 NEW: Mark user's email as verified
  static setEmailVerified(userId) {
    try {
      const stmt = db.prepare('UPDATE users SET email_verified = 1 WHERE id = ?');
      stmt.run(userId);
      console.log(`✅ Email verified for user ${userId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error setting email verified:', error);
      return { success: false, error: error.message };
    }
  }
  
  // 📧 NEW: Get user's email by userId
  static getUserEmail(userId) {
    try {
      const stmt = db.prepare('SELECT email FROM users WHERE id = ?');
      const user = stmt.get(userId);
      return user ? user.email : null;
    } catch (error) {
      console.error('❌ Error getting user email:', error);
      return null;
    }
  }

  // 🔑 NEW: Generate activation key
  static generateActivationKey() {
    try {
      // Generate a random 16-character key
      const keyCode = randomBytes(8).toString('hex').toUpperCase();

      const stmt = db.prepare('INSERT INTO activation_keys (key_code) VALUES (?)');
      const result = stmt.run(keyCode);

      console.log(`✅ Generated activation key: ${keyCode}`);
      return { success: true, keyCode, keyId: result.lastInsertRowid };
    } catch (error) {
      console.error('❌ Error generating activation key:', error.message);
      return { success: false, error: 'Failed to generate activation key' };
    }
  }

  // 🔑 NEW: Generate multiple activation keys
  static generateActivationKeys(count = 1) {
    try {
      const keys = [];
      for (let i = 0; i < count; i++) {
        const result = this.generateActivationKey();
        if (result.success) {
          keys.push(result.keyCode);
        }
      }
      console.log(`✅ Generated ${keys.length} activation keys`);
      return { success: true, keys };
    } catch (error) {
      console.error('❌ Error generating activation keys:', error.message);
      return { success: false, error: 'Failed to generate activation keys' };
    }
  }

  // 🔑 NEW: Validate activation key
  static validateActivationKey(keyCode) {
    try {
      const stmt = db.prepare('SELECT * FROM activation_keys WHERE key_code = ?');
      const key = stmt.get(keyCode);

      if (!key) {
        return { valid: false, error: 'Invalid activation key' };
      }

      if (key.is_used) {
        return { valid: false, error: 'Activation key has already been used' };
      }

      return { valid: true, keyId: key.id };
    } catch (error) {
      console.error('❌ Error validating activation key:', error.message);
      return { valid: false, error: 'Failed to validate activation key' };
    }
  }

  // 🔑 NEW: Mark activation key as used
  static markActivationKeyUsed(keyCode, userId) {
    try {
      const stmt = db.prepare('UPDATE activation_keys SET is_used = 1, used_by_user_id = ?, used_at = CURRENT_TIMESTAMP WHERE key_code = ?');
      stmt.run(userId, keyCode);
      console.log(`✅ Activation key ${keyCode} marked as used by user ${userId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error marking activation key as used:', error.message);
      return { success: false, error: 'Failed to mark activation key as used' };
    }
  }

  // 🔑 NEW: Get all activation keys (admin)
  static getAllActivationKeys() {
    try {
      const stmt = db.prepare(`
        SELECT ak.*, u.username as used_by_username
        FROM activation_keys ak
        LEFT JOIN users u ON ak.used_by_user_id = u.id
        ORDER BY ak.created_at DESC
      `);
      const keys = stmt.all();
      return { success: true, keys };
    } catch (error) {
      console.error('❌ Error getting activation keys:', error.message);
      return { success: false, keys: [] };
    }
  }

  // Register new user
  static registerUser(username, password, email = null, isAdmin = false, activationKey = null) {
    try {
      // 🔑 Validate activation key (required for non-admin registrations)
      if (!isAdmin && activationKey) {
        const keyValidation = this.validateActivationKey(activationKey);
        if (!keyValidation.valid) {
          return { success: false, error: keyValidation.error };
        }
      } else if (!isAdmin && !activationKey) {
        return { success: false, error: 'Activation key is required to create an account' };
      }

      // Validate username
      const usernameValidation = validateUsername(username);
      if (!usernameValidation.valid) {
        return { success: false, error: usernameValidation.error };
      }

      // Validate email
      const emailValidation = validateEmail(email);
      if (!emailValidation.valid) {
        return { success: false, error: emailValidation.error };
      }

      // Validate password strength
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return {
          success: false,
          error: 'Password does not meet requirements',
          errors: passwordValidation.errors
        };
      }

      const hash = hashPassword(password);
      const stmt = db.prepare('INSERT INTO users (username, password_hash, email, is_admin, active_account, failed_login_attempts, email_verified, activation_key) VALUES (?, ?, ?, ?, ?, 0, 0, ?)');
      const result = stmt.run(
        usernameValidation.value,
        hash,
        emailValidation.value,
        isAdmin ? 1 : 0,
        'default',
        activationKey || null
      );

      // 🔑 Mark activation key as used
      if (!isAdmin && activationKey) {
        this.markActivationKeyUsed(activationKey, result.lastInsertRowid);
      }

      console.log(`✅ User registered: ${usernameValidation.value}${isAdmin ? ' (ADMIN)' : ''}${activationKey ? ` (Key: ${activationKey})` : ''}`);
      return { success: true, userId: result.lastInsertRowid };
    } catch (error) {
      console.error('❌ Registration error:', error.message);
      return { success: false, error: 'Username already exists or invalid data' };
    }
  }
  
  // 🔒 UPDATED: Login user with account lockout check
  static loginUser(username, password) {
    try {
      const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
      const user = stmt.get(username);
      
      if (!user) {
        return { success: false, error: 'Invalid username or password' };
      }
      
      // 🔒 Check if account is locked
      const lockStatus = this.isAccountLocked(user.id);
      if (lockStatus.locked) {
        return { 
          success: false, 
          error: `Account is locked. Try again in ${lockStatus.minutesRemaining} minutes.`,
          locked: true,
          minutesRemaining: lockStatus.minutesRemaining
        };
      }
      
      // Verify password
      if (!verifyPassword(password, user.password_hash)) {
        // 🔒 Record failed attempt
        this.recordFailedLogin(user.id);
        
        const remainingAttempts = MAX_LOGIN_ATTEMPTS - ((user.failed_login_attempts || 0) + 1);
        
        if (remainingAttempts <= 0) {
          return { 
            success: false, 
            error: `Account locked after ${MAX_LOGIN_ATTEMPTS} failed attempts. Try again in 1 hour.`,
            locked: true
          };
        }
        
        return { 
          success: false, 
          error: `Invalid username or password. ${remainingAttempts} attempts remaining.`,
          remainingAttempts
        };
      }
      
      // 🔒 Reset failed attempts on successful login
      this.resetFailedLogins(user.id);
      
      // Create session with sliding window (8 hours inactivity, max 7 days total)
      const sessionToken = generateSessionToken();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + SESSION_INACTIVITY_TIMEOUT); // 8 hours from now
      const maxLifetime = new Date(now.getTime() + SESSION_MAX_LIFETIME); // Max 7 days
      
      const sessionStmt = db.prepare('INSERT INTO sessions (user_id, session_token, expires_at, last_activity) VALUES (?, ?, ?, ?)');
      sessionStmt.run(user.id, sessionToken, maxLifetime.toISOString(), now.toISOString());
      
      // Update last login
      const updateStmt = db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?');
      updateStmt.run(user.id);
      
      console.log(`✅ User logged in: ${username}${user.is_admin ? ' (ADMIN)' : ''} - Session: 8hr inactivity timeout, ${SESSION_MAX_LIFETIME / (24 * 60 * 60 * 1000)} day max`);
      return { 
        success: true, 
        sessionToken, 
        userId: user.id,
        username: user.username,
        isAdmin: user.is_admin === 1,
        expiresIn: SESSION_INACTIVITY_TIMEOUT,
        maxLifetime: SESSION_MAX_LIFETIME
      };
    } catch (error) {
      console.error('❌ Login error:', error.message);
      return { success: false, error: 'Login failed' };
    }
  }
  
  // 🔒 UPDATED: Verify session with sliding window (refreshes on activity)
  static verifySession(sessionToken) {
    try {
      const stmt = db.prepare(`
        SELECT s.*, u.username, u.email, u.is_admin, u.active_account, u.created_at, u.last_login
        FROM sessions s 
        JOIN users u ON s.user_id = u.id 
        WHERE s.session_token = ?
      `);
      const session = stmt.get(sessionToken);
      
      if (!session) {
        return { valid: false, error: 'Session not found' };
      }
      
      const now = new Date();
      const lastActivity = new Date(session.last_activity);
      const createdAt = new Date(session.created_at);
      const expiresAt = new Date(session.expires_at);
      
      // Check if session exceeded max lifetime (7 days)
      if (now > expiresAt) {
        return { valid: false, error: 'Session exceeded maximum lifetime' };
      }
      
      // Check if inactive for more than 8 hours
      const inactiveTime = now - lastActivity;
      if (inactiveTime > SESSION_INACTIVITY_TIMEOUT) {
        // Session expired due to inactivity
        const hoursInactive = Math.floor(inactiveTime / (60 * 60 * 1000));
        console.log(`⏰ Session expired after ${hoursInactive}h of inactivity`);
        return { valid: false, error: 'Session expired due to inactivity' };
      }
      
      // 🔄 Session is valid - REFRESH last_activity (sliding window)
      const updateStmt = db.prepare('UPDATE sessions SET last_activity = ? WHERE session_token = ?');
      updateStmt.run(now.toISOString(), sessionToken);
      
      // Calculate time until session expires
      const timeUntilInactivityExpire = SESSION_INACTIVITY_TIMEOUT - inactiveTime;
      const timeUntilMaxExpire = expiresAt - now;
      
      return {
        valid: true,
        userId: session.user_id,
        username: session.username,
        email: session.email,
        isAdmin: session.is_admin === 1,
        activeAccount: session.active_account || 'default',
        createdAt: session.created_at,
        lastLogin: session.last_login,
        expiresAt: session.expires_at,
        lastActivity: session.last_activity,
        timeUntilExpire: Math.min(timeUntilInactivityExpire, timeUntilMaxExpire)
      };
    } catch (error) {
      console.error('❌ Session verification error:', error.message);
      return { valid: false, error: 'Session verification failed' };
    }
  }
  
  // Logout user
  static logoutUser(sessionToken) {
    try {
      const stmt = db.prepare('DELETE FROM sessions WHERE session_token = ?');
      stmt.run(sessionToken);
      console.log('✅ User logged out');
      return { success: true };
    } catch (error) {
      console.error('❌ Logout error:', error.message);
      return { success: false };
    }
  }
  
  // Save broker credentials WITH ENCRYPTION
  static saveBrokerCredentials(userId, brokerName, accountType, apiKey, apiSecret, isPaper = true) {
    try {
      console.log(`🔐 Encrypting and saving credentials for user ${userId}: ${brokerName} ${accountType}`);
      
      const encryptedApiKey = encrypt(apiKey);
      const encryptedApiSecret = encrypt(apiSecret);
      
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO user_brokers (user_id, broker_name, account_type, api_key, api_secret, is_paper) 
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(userId, brokerName, accountType, encryptedApiKey, encryptedApiSecret, isPaper ? 1 : 0);
      
      console.log(`✅ Encrypted ${accountType} credentials saved for user ${userId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error saving broker credentials:', error.message);
      return { success: false, error: 'Failed to save credentials: ' + error.message };
    }
  }
  
  // Get broker credentials WITH DECRYPTION
  static getBrokerCredentials(userId, brokerName = 'alpaca', accountType = null) {
    try {
      if (!accountType) {
        const userStmt = db.prepare('SELECT active_account FROM users WHERE id = ?');
        const user = userStmt.get(userId);
        accountType = user?.active_account || 'default';
      }
      
      const stmt = db.prepare('SELECT * FROM user_brokers WHERE user_id = ? AND broker_name = ? AND account_type = ?');
      const credentials = stmt.get(userId, brokerName, accountType);
      
      if (!credentials) {
        return { success: false, error: 'No broker credentials found' };
      }
      
      let decryptedApiKey, decryptedApiSecret;
      
      try {
        decryptedApiKey = decrypt(credentials.api_key);
        decryptedApiSecret = decrypt(credentials.api_secret);
      } catch (decryptError) {
        console.error('❌ Decryption failed:', decryptError.message);
        return { 
          success: false, 
          error: 'Failed to decrypt credentials - encryption key may have changed or data is corrupted' 
        };
      }
      
      return { 
        success: true, 
        apiKey: decryptedApiKey,
        apiSecret: decryptedApiSecret,
        isPaper: credentials.is_paper === 1,
        accountType: credentials.account_type
      };
    } catch (error) {
      console.error('❌ Error getting broker credentials:', error.message);
      return { success: false, error: 'Failed to retrieve credentials' };
    }
  }
  
  // Get all broker accounts for user
  static getAllBrokerAccounts(userId, brokerName = 'alpaca') {
    try {
      const stmt = db.prepare('SELECT * FROM user_brokers WHERE user_id = ? AND broker_name = ?');
      const accounts = stmt.all(userId, brokerName);
      
      return {
        success: true,
        paper: accounts.find(a => a.account_type === 'paper'),
        live: accounts.find(a => a.account_type === 'live')
      };
    } catch (error) {
      console.error('❌ Error getting accounts:', error.message);
      return { success: false, paper: null, live: null };
    }
  }
  
  // Set active account
  static setActiveAccount(userId, accountType) {
    try {
      const stmt = db.prepare('UPDATE users SET active_account = ? WHERE id = ?');
      stmt.run(accountType, userId);
      
      console.log(`✅ Active account set to ${accountType} for user ${userId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error setting active account:', error.message);
      return { success: false };
    }
  }
  
  // Get active account type
  static getActiveAccount(userId) {
    try {
      const stmt = db.prepare('SELECT active_account FROM users WHERE id = ?');
      const user = stmt.get(userId);

      return { success: true, activeAccount: user?.active_account || 'default' };
    } catch (error) {
      return { success: false, activeAccount: 'default' };
    }
  }
  
  // Delete broker credentials
  static deleteBrokerCredentials(userId, brokerName = 'alpaca', accountType = null) {
    try {
      let stmt;
      if (accountType) {
        stmt = db.prepare('DELETE FROM user_brokers WHERE user_id = ? AND broker_name = ? AND account_type = ?');
        stmt.run(userId, brokerName, accountType);
      } else {
        stmt = db.prepare('DELETE FROM user_brokers WHERE user_id = ? AND broker_name = ?');
        stmt.run(userId, brokerName);
      }
      console.log(`✅ Broker credentials deleted for user ${userId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting credentials:', error.message);
      return { success: false };
    }
  }
  
  // Track position
  static savePosition(userId, positionData) {
    try {
      const stmt = db.prepare(`
        INSERT INTO positions (user_id, symbol, option_symbol, strike, expiration, right, quantity, entry_price, entry_order_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const result = stmt.run(
        userId,
        positionData.symbol,
        positionData.optionSymbol,
        positionData.strike,
        positionData.expiration,
        positionData.right,
        positionData.quantity,
        positionData.entryPrice,
        positionData.entryOrderId || null
      );

      console.log(`✅ Position saved for user ${userId} with entry order ID: ${positionData.entryOrderId || 'N/A'}`);
      return { success: true, positionId: result.lastInsertRowid };
    } catch (error) {
      console.error('❌ Error saving position:', error.message);
      return { success: false };
    }
  }
  
  // Close position
  static closePosition(positionId, exitPrice) {
    try {
      const getStmt = db.prepare('SELECT * FROM positions WHERE id = ?');
      const position = getStmt.get(positionId);
      
      if (!position) {
        return { success: false, error: 'Position not found' };
      }
      
      const pnl = (exitPrice - position.entry_price) * position.quantity * 100;
      
      const updateStmt = db.prepare(`
        UPDATE positions 
        SET exit_price = ?, exit_time = CURRENT_TIMESTAMP, pnl = ?, status = 'CLOSED'
        WHERE id = ?
      `);
      updateStmt.run(exitPrice, pnl, positionId);
      
      console.log(`✅ Position closed: P&L = $${pnl.toFixed(2)}`);
      return { success: true, pnl };
    } catch (error) {
      console.error('❌ Error closing position:', error.message);
      return { success: false };
    }
  }
  
  // Get user's open positions
  static getOpenPositions(userId) {
    try {
      const stmt = db.prepare(`
        SELECT * FROM positions
        WHERE user_id = ? AND status = 'OPEN'
        ORDER BY entry_time DESC
      `);
      const positions = stmt.all(userId);
      return { success: true, positions };
    } catch (error) {
      console.error('❌ Error getting positions:', error.message);
      return { success: false, positions: [] };
    }
  }

  // Get position by ID (any status)
  static getPositionById(userId, positionId) {
    try {
      const stmt = db.prepare(`
        SELECT * FROM positions
        WHERE user_id = ? AND id = ?
      `);
      const position = stmt.get(userId, positionId);
      return { success: true, position };
    } catch (error) {
      console.error('❌ Error getting position by ID:', error.message);
      return { success: false, position: null };
    }
  }
  
  // Get user's trading history
  static getTradingHistory(userId, limit = 50) {
    try {
      const stmt = db.prepare(`
        SELECT * FROM positions
        WHERE user_id = ?
        ORDER BY entry_time DESC
        LIMIT ?
      `);
      const history = stmt.all(userId, limit);
      return { success: true, history };
    } catch (error) {
      console.error('❌ Error getting history:', error.message);
      return { success: false, history: [] };
    }
  }

  // Update exit order ID for a position
  static updateExitOrderId(positionId, exitOrderId) {
    try {
      const stmt = db.prepare('UPDATE positions SET exit_order_id = ? WHERE id = ?');
      stmt.run(exitOrderId, positionId);
      console.log(`✅ Exit order ID ${exitOrderId} saved for position ${positionId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating exit order ID:', error.message);
      return { success: false };
    }
  }

  // Get pending order IDs for a position
  static getPendingOrders(positionId) {
    try {
      const stmt = db.prepare('SELECT entry_order_id, exit_order_id, status FROM positions WHERE id = ?');
      const position = stmt.get(positionId);

      if (!position) {
        return { success: false, error: 'Position not found' };
      }

      const pendingOrders = {
        entryOrderId: position.entry_order_id,
        exitOrderId: position.exit_order_id,
        hasEntry: !!position.entry_order_id,
        hasExit: !!position.exit_order_id,
        isOpen: position.status === 'OPEN'
      };

      return { success: true, ...pendingOrders };
    } catch (error) {
      console.error('❌ Error getting pending orders:', error.message);
      return { success: false };
    }
  }

  // Clear pending order IDs (after filled or cancelled)
  static clearPendingOrders(positionId, orderType = 'both') {
    try {
      let stmt;
      if (orderType === 'entry') {
        stmt = db.prepare('UPDATE positions SET entry_order_id = NULL WHERE id = ?');
      } else if (orderType === 'exit') {
        stmt = db.prepare('UPDATE positions SET exit_order_id = NULL WHERE id = ?');
      } else {
        stmt = db.prepare('UPDATE positions SET entry_order_id = NULL, exit_order_id = NULL WHERE id = ?');
      }
      stmt.run(positionId);
      console.log(`✅ Cleared ${orderType} order ID(s) for position ${positionId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error clearing order IDs:', error.message);
      return { success: false };
    }
  }

  // 🔒 UPDATED: Rotate session with sliding window
  static rotateSession(oldToken) {
    try {
      const stmt = db.prepare('SELECT * FROM sessions WHERE session_token = ?');
      const oldSession = stmt.get(oldToken);
      
      if (!oldSession) {
        return { success: false, error: 'Session not found' };
      }
      
      const newToken = generateSessionToken();
      const now = new Date();
      const createdAt = new Date(oldSession.created_at);
      const maxLifetime = new Date(createdAt.getTime() + SESSION_MAX_LIFETIME);
      
      const updateStmt = db.prepare(`
        UPDATE sessions 
        SET session_token = ?, last_activity = ? 
        WHERE session_token = ?
      `);
      updateStmt.run(newToken, now.toISOString(), oldToken);
      
      console.log(`🔄 Session rotated for user ${oldSession.user_id}`);
      return { success: true, newToken };
    } catch (error) {
      console.error('❌ Session rotation error:', error.message);
      return { success: false, error: 'Failed to rotate session' };
    }
  }
  
  // 🔒 UPDATED: Clean up expired sessions (inactive OR past max lifetime)
  static cleanupExpiredSessions() {
    try {
      const now = new Date();
      const inactivityCutoff = new Date(now - SESSION_INACTIVITY_TIMEOUT);
      
      // Delete sessions that are either:
      // 1. Inactive for 8+ hours, OR
      // 2. Past their max lifetime (7 days)
      const stmt = db.prepare(`
        DELETE FROM sessions 
        WHERE last_activity < ? OR expires_at < ?
      `);
      const result = stmt.run(inactivityCutoff.toISOString(), now.toISOString());
      
      if (result.changes > 0) {
        console.log(`🧹 Cleaned up ${result.changes} expired sessions`);
      }
      
      return { success: true, deleted: result.changes };
    } catch (error) {
      console.error('❌ Session cleanup error:', error.message);
      return { success: false };
    }
  }
  
  // Change password
  static changePassword(userId, currentPassword, newPassword) {
    try {
      const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
      const user = stmt.get(userId);
      
      if (!user) {
        return { success: false, error: 'User not found' };
      }
      
      if (!verifyPassword(currentPassword, user.password_hash)) {
        return { success: false, error: 'Current password is incorrect' };
      }
      
      const validation = validatePassword(newPassword);
      if (!validation.valid) {
        return { 
          success: false, 
          error: 'New password does not meet requirements',
          errors: validation.errors 
        };
      }
      
      const newHash = hashPassword(newPassword);
      const updateStmt = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?');
      updateStmt.run(newHash, userId);
      
      console.log(`✅ Password changed for user ${userId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Password change error:', error.message);
      return { success: false, error: 'Failed to change password' };
    }
  }
  
  // 📧 NEW: Change user's email
  static changeEmail(userId, newEmail, password) {
    try {
      // Get user to verify password
      const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
      const user = stmt.get(userId);
      
      if (!user) {
        return { success: false, error: 'User not found' };
      }
      
      // Verify current password
      if (!verifyPassword(password, user.password_hash)) {
        return { success: false, error: 'Current password is incorrect' };
      }
      
      // Validate email
      const emailValidation = validateEmail(newEmail);
      if (!emailValidation.valid) {
        return { success: false, error: emailValidation.error };
      }
      
      // Update email and reset verification status
      const updateStmt = db.prepare('UPDATE users SET email = ?, email_verified = 0 WHERE id = ?');
      updateStmt.run(emailValidation.value, userId);
      
      console.log(`✅ Email updated for user ${userId} to ${emailValidation.value}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating email:', error.message);
      return { success: false, error: 'Failed to update email' };
    }
  }
}

// AUTO-CLEANUP: Run session cleanup every hour
setInterval(() => {
  UserManager.cleanupExpiredSessions();
}, 60 * 60 * 1000);

// Initial cleanup on start
UserManager.cleanupExpiredSessions();

console.log('✅ UserManager initialized:');
console.log(`   🔄 Sliding window sessions: ${SESSION_INACTIVITY_TIMEOUT / (60 * 60 * 1000)}h inactivity timeout`);
console.log(`   ⏰ Max session lifetime: ${SESSION_MAX_LIFETIME / (24 * 60 * 60 * 1000)} days`);
console.log(`   🔒 Max login attempts: ${MAX_LOGIN_ATTEMPTS}`);
console.log(`   🔒 Lockout duration: ${LOCKOUT_DURATION / 60000} minutes`);
console.log(`   📧 Email verification: ENABLED`);

export default UserManager;
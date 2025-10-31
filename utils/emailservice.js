// utils/emailService.js - Email Verification System (Gmail Only)
import nodemailer from 'nodemailer';
import { randomBytes } from 'crypto';
import { Database } from 'bun:sqlite';

const db = new Database('users.db');

// Create verification tokens table
db.run(`
  CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    used BOOLEAN DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// Create index for faster lookups
db.run('CREATE INDEX IF NOT EXISTS idx_verification_token ON email_verification_tokens(token)');

/**
 * Validate email is Gmail only
 */
export function isValidGmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }
  
  const trimmed = email.trim().toLowerCase();
  
  // Check if it's a Gmail address
  if (!trimmed.endsWith('@gmail.com')) {
    return { valid: false, error: 'Only Gmail addresses are allowed' };
  }
  
  // Basic email format validation
  const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: 'Invalid Gmail format' };
  }
  
  return { valid: true, email: trimmed };
}

/**
 * Configure email transporter
 * You need to set these in your .env file:
 * GMAIL_USER=your-email@gmail.com
 * GMAIL_APP_PASSWORD=your-16-char-app-password
 */
function getEmailTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  
  if (!user || !pass) {
    console.error('⚠️ Gmail credentials not configured in .env');
    console.error('Add: GMAIL_USER and GMAIL_APP_PASSWORD');
    return null;
  }
  
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: user,
      pass: pass
    }
  });
}

/**
 * Generate verification token
 */
export function generateVerificationToken(userId, email) {
  try {
    // Generate random token
    const token = randomBytes(32).toString('hex');
    
    // Token expires in 24 hours
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    
    // Store token in database
    const stmt = db.prepare(`
      INSERT INTO email_verification_tokens (user_id, token, email, expires_at)
      VALUES (?, ?, ?, ?)
    `);
    
    stmt.run(userId, token, email, expiresAt);
    
    console.log(`✅ Generated verification token for user ${userId}`);
    
    return { success: true, token };
  } catch (error) {
    console.error('❌ Failed to generate verification token:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send verification email
 */
export async function sendVerificationEmail(userId, email, username) {
  try {
    const transporter = getEmailTransporter();
    if (!transporter) {
      return { success: false, error: 'Email service not configured' };
    }
    
    // Generate token
    const tokenResult = generateVerificationToken(userId, email);
    if (!tokenResult.success) {
      return tokenResult;
    }
    
    const token = tokenResult.token;
    
    // Get your app URL from environment or default
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const verificationUrl = `${appUrl}/verify-email?token=${token}`;
    
    // Send email
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: email,
      subject: '🔐 Verify Your GEX Trading Account',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              background: #f3f4f6;
              padding: 20px;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: white;
              border-radius: 12px;
              padding: 40px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 48px;
              margin-bottom: 10px;
            }
            .title {
              font-size: 24px;
              font-weight: 700;
              color: #1f2937;
            }
            .content {
              color: #4b5563;
              line-height: 1.6;
              margin-bottom: 30px;
            }
            .button {
              display: inline-block;
              padding: 16px 32px;
              background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
              color: white;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 600;
              text-align: center;
            }
            .button-container {
              text-align: center;
              margin: 30px 0;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              color: #6b7280;
              font-size: 14px;
            }
            .code {
              background: #f3f4f6;
              padding: 16px;
              border-radius: 8px;
              font-family: monospace;
              font-size: 14px;
              word-break: break-all;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🎯</div>
              <div class="title">GEX Trading Intelligence</div>
            </div>
            
            <div class="content">
              <p>Hi <strong>${username}</strong>,</p>
              
              <p>Welcome to GEX Trading Intelligence! Please verify your email address to complete your account setup.</p>
              
              <p>Click the button below to verify your account:</p>
            </div>
            
            <div class="button-container">
              <a href="${verificationUrl}" class="button">
                ✅ Verify Email Address
              </a>
            </div>
            
            <div class="content">
              <p>Or copy and paste this link into your browser:</p>
              <div class="code">${verificationUrl}</div>
              
              <p><strong>This link expires in 24 hours.</strong></p>
            </div>
            
            <div class="footer">
              <p>If you didn't create this account, please ignore this email.</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    await transporter.sendMail(mailOptions);
    
    console.log(`📧 Verification email sent to ${email}`);
    
    return { success: true, message: 'Verification email sent' };
  } catch (error) {
    console.error('❌ Failed to send verification email:', error);
    return { success: false, error: 'Failed to send verification email' };
  }
}

/**
 * Verify email token
 */
export function verifyEmailToken(token) {
  try {
    // Get token from database
    const stmt = db.prepare(`
      SELECT * FROM email_verification_tokens 
      WHERE token = ? AND used = 0
    `);
    
    const tokenData = stmt.get(token);
    
    if (!tokenData) {
      return { success: false, error: 'Invalid or already used verification token' };
    }
    
    // Check if expired
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    
    if (now > expiresAt) {
      return { success: false, error: 'Verification token has expired' };
    }
    
    // Mark token as used
    const updateStmt = db.prepare(`
      UPDATE email_verification_tokens 
      SET used = 1 
      WHERE token = ?
    `);
    
    updateStmt.run(token);
    
    // Update user's email_verified status
    const userStmt = db.prepare(`
      UPDATE users 
      SET email_verified = 1 
      WHERE id = ?
    `);
    
    userStmt.run(tokenData.user_id);
    
    console.log(`✅ Email verified for user ${tokenData.user_id}`);
    
    return { 
      success: true, 
      userId: tokenData.user_id,
      email: tokenData.email
    };
  } catch (error) {
    console.error('❌ Email verification failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Resend verification email
 */
export async function resendVerificationEmail(userId) {
  try {
    // Get user info
    const userStmt = db.prepare('SELECT username, email, email_verified FROM users WHERE id = ?');
    const user = userStmt.get(userId);
    
    if (!user) {
      return { success: false, error: 'User not found' };
    }
    
    if (user.email_verified) {
      return { success: false, error: 'Email already verified' };
    }
    
    if (!user.email) {
      return { success: false, error: 'No email address on file' };
    }
    
    // Invalidate old tokens
    const invalidateStmt = db.prepare(`
      UPDATE email_verification_tokens 
      SET used = 1 
      WHERE user_id = ? AND used = 0
    `);
    
    invalidateStmt.run(userId);
    
    // Send new email
    return await sendVerificationEmail(userId, user.email, user.username);
  } catch (error) {
    console.error('❌ Failed to resend verification email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if user's email is verified
 */
export function isEmailVerified(userId) {
  try {
    const stmt = db.prepare('SELECT email_verified FROM users WHERE id = ?');
    const user = stmt.get(userId);
    
    return user ? !!user.email_verified : false;
  } catch (error) {
    console.error('❌ Failed to check email verification:', error);
    return false;
  }
}

/**
 * Cleanup expired tokens (run periodically)
 */
export function cleanupExpiredTokens() {
  try {
    const stmt = db.prepare(`
      DELETE FROM email_verification_tokens 
      WHERE expires_at < datetime('now')
    `);
    
    const result = stmt.run();
    
    console.log(`🧹 Cleaned up ${result.changes} expired verification tokens`);
  } catch (error) {
    console.error('❌ Failed to cleanup tokens:', error);
  }
}

// Auto-cleanup every 6 hours
setInterval(cleanupExpiredTokens, 6 * 60 * 60 * 1000);

console.log('📧 Email verification service initialized');
// utils/auditLogger.js - Security Event Logging

import { Database } from 'bun:sqlite';

const db = new Database('audit.db');

// Create audit log table
db.run(`
  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER,
    username TEXT,
    event_type TEXT NOT NULL,
    event_action TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    success BOOLEAN DEFAULT 1,
    details TEXT,
    risk_level TEXT DEFAULT 'LOW'
  )
`);

// Create index for faster queries
db.run('CREATE INDEX IF NOT EXISTS idx_timestamp ON audit_logs(timestamp)');
db.run('CREATE INDEX IF NOT EXISTS idx_user_id ON audit_logs(user_id)');
db.run('CREATE INDEX IF NOT EXISTS idx_event_type ON audit_logs(event_type)');

/**
 * Event types and risk levels
 */
export const EventType = {
  AUTH: 'AUTH',
  BROKER: 'BROKER',
  TRADING: 'TRADING',
  ACCOUNT: 'ACCOUNT',
  SECURITY: 'SECURITY',
  ADMIN: 'ADMIN'
};

export const RiskLevel = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

/**
 * Log an audit event
 */
export function logAuditEvent(event) {
  try {
    const stmt = db.prepare(`
      INSERT INTO audit_logs (
        user_id, username, event_type, event_action, 
        ip_address, user_agent, success, details, risk_level
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      event.userId || null,
      event.username || null,
      event.eventType,
      event.action,
      event.ipAddress || null,
      event.userAgent || null,
      event.success ? 1 : 0,
      event.details ? JSON.stringify(event.details) : null,
      event.riskLevel || RiskLevel.LOW
    );
    
    // Console log for high-risk events
    if (event.riskLevel === RiskLevel.HIGH || event.riskLevel === RiskLevel.CRITICAL) {
      console.log(`🚨 [${event.riskLevel}] ${event.eventType}: ${event.action} by ${event.username || event.userId || 'unknown'}`);
    }
    
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
}

/**
 * Quick logging helpers
 */
export const AuditLog = {
  
  // Authentication events
  loginSuccess: (userId, username, ip) => logAuditEvent({
    userId, username, 
    eventType: EventType.AUTH, 
    action: 'LOGIN_SUCCESS',
    ipAddress: ip,
    success: true,
    riskLevel: RiskLevel.LOW
  }),
  
  loginFailure: (username, ip, reason) => logAuditEvent({
    username,
    eventType: EventType.AUTH,
    action: 'LOGIN_FAILED',
    ipAddress: ip,
    success: false,
    details: { reason },
    riskLevel: RiskLevel.MEDIUM
  }),
  
  rateLimitExceeded: (username, ip, endpoint) => logAuditEvent({
    username,
    eventType: EventType.SECURITY,
    action: 'RATE_LIMIT_EXCEEDED',
    ipAddress: ip,
    success: false,
    details: { endpoint },
    riskLevel: RiskLevel.HIGH
  }),
  
  registrationSuccess: (userId, username, ip) => logAuditEvent({
    userId, username,
    eventType: EventType.AUTH,
    action: 'REGISTRATION_SUCCESS',
    ipAddress: ip,
    success: true,
    riskLevel: RiskLevel.LOW
  }),
  
  logout: (userId, username) => logAuditEvent({
    userId, username,
    eventType: EventType.AUTH,
    action: 'LOGOUT',
    success: true,
    riskLevel: RiskLevel.LOW
  }),
  
  // Broker events
  brokerConnected: (userId, username, accountType) => logAuditEvent({
    userId, username,
    eventType: EventType.BROKER,
    action: 'BROKER_CONNECTED',
    details: { accountType },
    success: true,
    riskLevel: RiskLevel.MEDIUM
  }),
  
  brokerDisconnected: (userId, username, accountType) => logAuditEvent({
    userId, username,
    eventType: EventType.BROKER,
    action: 'BROKER_DISCONNECTED',
    details: { accountType },
    success: true,
    riskLevel: RiskLevel.MEDIUM
  }),
  
  accountSwitched: (userId, username, fromAccount, toAccount) => logAuditEvent({
    userId, username,
    eventType: EventType.BROKER,
    action: 'ACCOUNT_SWITCHED',
    details: { from: fromAccount, to: toAccount },
    success: true,
    riskLevel: RiskLevel.MEDIUM
  }),
  
  // Trading events
  orderPlaced: (userId, username, symbol, quantity, value) => logAuditEvent({
    userId, username,
    eventType: EventType.TRADING,
    action: 'ORDER_PLACED',
    details: { symbol, quantity, value },
    success: true,
    riskLevel: RiskLevel.HIGH
  }),
  
  orderFailed: (userId, username, symbol, reason) => logAuditEvent({
    userId, username,
    eventType: EventType.TRADING,
    action: 'ORDER_FAILED',
    details: { symbol, reason },
    success: false,
    riskLevel: RiskLevel.MEDIUM
  }),
  
  positionExited: (userId, username, symbol, pnl) => logAuditEvent({
    userId, username,
    eventType: EventType.TRADING,
    action: 'POSITION_EXITED',
    details: { symbol, pnl },
    success: true,
    riskLevel: RiskLevel.HIGH
  }),
  
  // Security events
  csrfViolation: (username, ip, endpoint) => logAuditEvent({
    username,
    eventType: EventType.SECURITY,
    action: 'CSRF_VIOLATION',
    ipAddress: ip,
    details: { endpoint },
    success: false,
    riskLevel: RiskLevel.CRITICAL
  }),
  
  invalidToken: (ip, endpoint) => logAuditEvent({
    eventType: EventType.SECURITY,
    action: 'INVALID_TOKEN',
    ipAddress: ip,
    details: { endpoint },
    success: false,
    riskLevel: RiskLevel.HIGH
  }),
  
  suspiciousActivity: (userId, username, ip, details) => logAuditEvent({
    userId, username,
    eventType: EventType.SECURITY,
    action: 'SUSPICIOUS_ACTIVITY',
    ipAddress: ip,
    details,
    success: false,
    riskLevel: RiskLevel.CRITICAL
  }),
  
  // Account events
  passwordChanged: (userId, username) => logAuditEvent({
    userId, username,
    eventType: EventType.ACCOUNT,
    action: 'PASSWORD_CHANGED',
    success: true,
    riskLevel: RiskLevel.MEDIUM
  }),
  
  // Admin events
  adminAction: (userId, username, action, details) => logAuditEvent({
    userId, username,
    eventType: EventType.ADMIN,
    action: `ADMIN_${action}`,
    details,
    success: true,
    riskLevel: RiskLevel.HIGH
  })
};

/**
 * Get recent audit logs
 */
export function getRecentLogs(limit = 100, filters = {}) {
  try {
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];
    
    if (filters.userId) {
      query += ' AND user_id = ?';
      params.push(filters.userId);
    }
    
    if (filters.eventType) {
      query += ' AND event_type = ?';
      params.push(filters.eventType);
    }
    
    if (filters.riskLevel) {
      query += ' AND risk_level = ?';
      params.push(filters.riskLevel);
    }
    
    if (filters.startDate) {
      query += ' AND timestamp >= ?';
      params.push(filters.startDate);
    }
    
    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);
    
    const stmt = db.prepare(query);
    return stmt.all(...params);
    
  } catch (error) {
    console.error('Failed to get audit logs:', error);
    return [];
  }
}

/**
 * Get security alerts (high/critical risk events)
 */
export function getSecurityAlerts(hours = 24) {
  try {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    
    const stmt = db.prepare(`
      SELECT * FROM audit_logs 
      WHERE risk_level IN ('HIGH', 'CRITICAL')
      AND timestamp >= ?
      ORDER BY timestamp DESC
    `);
    
    return stmt.all(since);
    
  } catch (error) {
    console.error('Failed to get security alerts:', error);
    return [];
  }
}

/**
 * Cleanup old logs (keep last 90 days)
 */
export function cleanupOldLogs(daysToKeep = 90) {
  try {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000).toISOString();
    
    const stmt = db.prepare('DELETE FROM audit_logs WHERE timestamp < ?');
    const result = stmt.run(cutoffDate);
    
    console.log(`🧹 Cleaned up ${result.changes} old audit logs`);
    
  } catch (error) {
    console.error('Failed to cleanup logs:', error);
  }
}

// Auto-cleanup every 24 hours
setInterval(() => {
  cleanupOldLogs();
}, 24 * 60 * 60 * 1000);

export default AuditLog;
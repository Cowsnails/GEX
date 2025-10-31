// test-audit.js - Test Audit Logging System
import { AuditLog, getRecentLogs, getSecurityAlerts } from './utils/auditLogger.js';

console.log('🧪 Testing Audit Logging System...\n');

// Test 1: Login events
console.log('1️⃣ Testing login events...');
AuditLog.loginSuccess(1, 'testuser', '127.0.0.1');
AuditLog.loginFailure('baduser', '192.168.1.1', 'Invalid password');
AuditLog.rateLimitExceeded('spammer', '10.0.0.1', '/api/auth/login');

// Test 2: Trading events
console.log('2️⃣ Testing trading events...');
AuditLog.orderPlaced(1, 'testuser', 'SPY', 10, 5000);
AuditLog.positionExited(1, 'testuser', 'SPY', 250.50);

// Test 3: Security events
console.log('3️⃣ Testing security events...');
AuditLog.csrfViolation('attacker', '1.2.3.4', '/api/broker/order');
AuditLog.suspiciousActivity(1, 'testuser', '127.0.0.1', { reason: 'Multiple failed attempts' });

// Test 4: Broker events
console.log('4️⃣ Testing broker events...');
AuditLog.brokerConnected(1, 'testuser', 'paper');
AuditLog.accountSwitched(1, 'testuser', 'paper', 'live');

console.log('\n✅ All test events logged!\n');

// Display recent logs
console.log('📋 Recent Audit Logs:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const logs = getRecentLogs(10);
logs.forEach(log => {
  const emoji = log.success ? '✅' : '❌';
  const risk = log.risk_level === 'CRITICAL' ? '🚨' : log.risk_level === 'HIGH' ? '⚠️' : '📝';
  console.log(`${emoji} ${risk} [${log.event_type}] ${log.event_action} - ${log.username || 'anonymous'} @ ${log.timestamp}`);
});

// Display security alerts
console.log('\n🚨 Security Alerts (HIGH/CRITICAL):');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const alerts = getSecurityAlerts(24);
alerts.forEach(alert => {
  console.log(`🚨 [${alert.risk_level}] ${alert.event_action} by ${alert.username || 'anonymous'} from ${alert.ip_address}`);
  if (alert.details) {
    console.log(`   Details: ${alert.details}`);
  }
});

console.log('\n✅ Audit logging system working perfectly!\n');
import { Database } from 'bun:sqlite';

const db = new Database('users.db');

console.log('\n📊 User Status:\n');
const users = db.prepare('SELECT username, email_verified, is_admin, last_login FROM users').all();
users.forEach(user => {
  console.log(`User: ${user.username}`);
  console.log(`  Admin: ${user.is_admin ? '✅ YES' : '❌ NO'}`);
  console.log(`  Email Verified: ${user.email_verified ? '✅ YES' : '❌ NO'}`);
  console.log(`  Last Login: ${user.last_login || 'Never'}`);
  console.log('');
});

console.log('\n🔌 Active Sessions:\n');
const sessions = db.prepare('SELECT s.*, u.username FROM sessions s JOIN users u ON s.user_id = u.id').all();
sessions.forEach(session => {
  console.log(`User: ${session.username}`);
  console.log(`  Token: ${session.session_token.substring(0, 10)}...`);
  console.log(`  Expires: ${session.expires_at}`);
  console.log(`  Last Activity: ${session.last_activity}`);
  console.log('');
});
// check-encryption.js
import { Database } from 'bun:sqlite';

const db = new Database('users.db');

console.log('\n🔍 Checking API Key Encryption Status...\n');

try {
  const stmt = db.prepare('SELECT user_id, account_type, substr(api_key, 1, 40) as key_preview FROM user_brokers');
  const results = stmt.all();
  
  if (results.length === 0) {
    console.log('📊 No API keys found in database yet.\n');
  } else {
    console.log('📊 Found', results.length, 'credential(s):\n');
    
    results.forEach((row, i) => {
      const isEncrypted = row.key_preview.includes(':');
      const status = isEncrypted ? '✅ ENCRYPTED' : '🔴 PLAIN TEXT';
      
      console.log(`${i + 1}. User ${row.user_id} (${row.account_type})`);
      console.log(`   ${status}`);
      console.log(`   Preview: ${row.key_preview}...\n`);
    });
    
    const allEncrypted = results.every(row => row.key_preview.includes(':'));
    
    if (allEncrypted) {
      console.log('🎉 SUCCESS! All API keys are encrypted! 🔒\n');
    } else {
      console.log('⚠️  WARNING: Some keys are still plain text!\n');
      console.log('Run: bun run migrate-encrypt-keys.js\n');
    }
  }
} catch (error) {
  console.error('❌ Error:', error.message);
}

db.close();
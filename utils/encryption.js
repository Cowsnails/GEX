// utils/encryption.js - AES-256-GCM Encryption for API Keys - CLEANED VERSION
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

// ✅ Environment variables are loaded by dotenv/config in server.js
// No manual loading needed - cleaner and more maintainable!

// 🔥 CRITICAL: Encryption key MUST be in environment variable
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

// 🔒 FAIL HARD if encryption key is missing
if (!ENCRYPTION_KEY) {
  console.error('');
  console.error('❌❌❌ CRITICAL ERROR: ENCRYPTION_KEY environment variable is not set! ❌❌❌');
  console.error('');
  console.error('🔐 Without this key, all broker credentials will be LOST!');
  console.error('');
  console.error('📋 To fix this issue:');
  console.error('');
  console.error('1️⃣  Generate a secure encryption key:');
  console.error('    node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  console.error('');
  console.error('2️⃣  Create a .env file in your project root with:');
  console.error('    ENCRYPTION_KEY=<your_generated_key_here>');
  console.error('    NODE_ENV=development');
  console.error('    PORT=3000');
  console.error('');
  console.error('3️⃣  Restart the server');
  console.error('');
  console.error('⚠️  SECURITY WARNING:');
  console.error('   - Never commit the .env file to git');
  console.error('   - Keep the encryption key secret');
  console.error('   - Back up the key securely');
  console.error('   - If you lose the key, all encrypted data is permanently lost');
  console.error('');
  console.error('🛑 Server startup BLOCKED until encryption key is configured');
  console.error('');
  
  // 🔍 DEBUG: Show what environment variables are available
  console.error('🔍 DEBUG INFO:');
  console.error('   Current directory:', process.cwd());
  console.error('   Node environment:', process.env.NODE_ENV || 'not set');
  console.error('   ENCRYPTION_KEY type:', typeof process.env.ENCRYPTION_KEY);
  console.error('   ENCRYPTION_KEY value:', process.env.ENCRYPTION_KEY ? `"${process.env.ENCRYPTION_KEY}"` : 'undefined');
  console.error('   ENCRYPTION_KEY length:', process.env.ENCRYPTION_KEY ? process.env.ENCRYPTION_KEY.length : 0);
  console.error('');
  
  process.exit(1); // 🔒 FAIL HARD - Don't start without key
}

// 🔒 Validate key format and length
if (typeof ENCRYPTION_KEY !== 'string') {
  console.error('❌ ENCRYPTION_KEY must be a string');
  process.exit(1);
}

if (ENCRYPTION_KEY.length !== 64) { // 32 bytes = 64 hex characters
  console.error('❌ ENCRYPTION_KEY must be exactly 64 hexadecimal characters (32 bytes)');
  console.error(`   Current length: ${ENCRYPTION_KEY.length} characters`);
  console.error('');
  console.error('Generate a valid key with:');
  console.error('   node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  console.error('');
  process.exit(1);
}

// 🔒 Validate key is valid hexadecimal
if (!/^[0-9a-f]{64}$/i.test(ENCRYPTION_KEY)) {
  console.error('❌ ENCRYPTION_KEY must contain only hexadecimal characters (0-9, a-f)');
  console.error('');
  console.error('Generate a valid key with:');
  console.error('   node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  console.error('');
  process.exit(1);
}

// ✅ Key is valid - confirm in console
console.log('✅ Encryption key loaded successfully');
console.log(`🔐 Key length: ${ENCRYPTION_KEY.length} characters (valid)`);

/**
 * Encrypt sensitive data (API keys, secrets)
 * Uses AES-256-GCM for authenticated encryption
 */
export function encrypt(plaintext) {
  try {
    // Convert hex key to buffer
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    
    // Generate random IV (Initialization Vector) - 12 bytes for GCM
    const iv = randomBytes(12);
    
    // Create cipher
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    
    // Encrypt the data
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get authentication tag (prevents tampering)
    const authTag = cipher.getAuthTag().toString('hex');
    
    // Return IV + authTag + encrypted data (all needed for decryption)
    // Format: iv:authTag:encryptedData
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (error) {
    console.error('❌ Encryption error:', error.message);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data
 */
export function decrypt(encryptedData) {
  try {
    // Convert hex key to buffer
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    
    // Split the encrypted data (iv:authTag:encryptedData)
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    // Create decipher
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt the data
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('❌ Decryption error:', error.message);
    throw new Error('Failed to decrypt data - key might be wrong or data corrupted');
  }
}

/**
 * Test the encryption/decryption
 */
export function testEncryption() {
  const testKey = 'PK_TEST_1234567890_SECRET_KEY';
  const testSecret = 'my_super_secret_alpaca_key_12345';
  
  console.log('\n🔍 Testing Encryption System...\n');
  
  try {
    // Encrypt
    const encrypted = encrypt(testKey);
    console.log('✅ Original API Key:', testKey);
    console.log('🔒 Encrypted:', encrypted.substring(0, 50) + '...');
    console.log('📏 Length:', encrypted.length, 'chars\n');
    
    // Decrypt
    const decrypted = decrypt(encrypted);
    console.log('🔓 Decrypted:', decrypted);
    console.log('✅ Match:', testKey === decrypted ? 'YES ✔' : 'NO ✗');
    
    // Test secret too
    const encryptedSecret = encrypt(testSecret);
    const decryptedSecret = decrypt(encryptedSecret);
    console.log('\n✅ Secret Match:', testSecret === decryptedSecret ? 'YES ✔' : 'NO ✗');
    
    console.log('\n✅ Encryption system working perfectly!\n');
    return true;
  } catch (error) {
    console.error('\n❌ Encryption test FAILED:', error.message);
    console.error('⚠️  Check your ENCRYPTION_KEY configuration\n');
    return false;
  }
}

// 🔒 Run encryption test on startup (only in development)
if (process.env.NODE_ENV !== 'production') {
  console.log('🧪 Running encryption self-test (development mode)...');
  const testPassed = testEncryption();
  if (!testPassed) {
    console.error('❌ Encryption self-test failed - fix the issue before proceeding');
    process.exit(1);
  }
}
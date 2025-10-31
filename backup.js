// backup.js - Automated Database Backups WITH RESTORE

import { copyFileSync, mkdirSync, readdirSync, statSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { Database } from 'bun:sqlite';

const BACKUP_DIR = './backups';
const DATABASES = ['users.db', 'audit.db'];
const MAX_BACKUPS = 30; // Keep last 30 backups

/**
 * Create backup directory if it doesn't exist
 */
function ensureBackupDir() {
  try {
    mkdirSync(BACKUP_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create backup directory:', error);
  }
}

/**
 * Generate backup filename with timestamp
 */
function getBackupFilename(dbName) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const nameWithoutExt = dbName.replace('.db', '');
  return `${nameWithoutExt}_${timestamp}.db`;
}

/**
 * Backup a single database
 */
function backupDatabase(dbName) {
  try {
    const sourcePath = `./${dbName}`;
    const backupFilename = getBackupFilename(dbName);
    const backupPath = join(BACKUP_DIR, backupFilename);
    
    copyFileSync(sourcePath, backupPath);
    console.log(`✅ Backed up ${dbName} to ${backupFilename}`);
    
    return true;
  } catch (error) {
    console.error(`❌ Failed to backup ${dbName}:`, error.message);
    return false;
  }
}

/**
 * Delete old backups (keep only MAX_BACKUPS most recent)
 */
function cleanupOldBackups(dbName) {
  try {
    const namePrefix = dbName.replace('.db', '');
    const files = readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith(namePrefix) && f.endsWith('.db'))
      .map(f => ({
        name: f,
        path: join(BACKUP_DIR, f),
        time: statSync(join(BACKUP_DIR, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time); // Sort by newest first
    
    // Delete old backups beyond MAX_BACKUPS
    if (files.length > MAX_BACKUPS) {
      const toDelete = files.slice(MAX_BACKUPS);
      toDelete.forEach(file => {
        unlinkSync(file.path);
        console.log(`🗑️  Deleted old backup: ${file.name}`);
      });
    }
  } catch (error) {
    console.error('Failed to cleanup old backups:', error);
  }
}

/**
 * Backup all databases
 */
export function backupAllDatabases() {
  console.log('\n📦 Starting database backup...');
  
  ensureBackupDir();
  
  let successCount = 0;
  
  DATABASES.forEach(dbName => {
    if (backupDatabase(dbName)) {
      successCount++;
      cleanupOldBackups(dbName);
    }
  });
  
  console.log(`\n✅ Backup complete: ${successCount}/${DATABASES.length} databases backed up\n`);
  
  return successCount === DATABASES.length;
}

/**
 * 🔥 NEW: List available backups for a database
 */
export function listBackups(dbName) {
  try {
    const namePrefix = dbName.replace('.db', '');
    const backups = readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith(namePrefix) && f.endsWith('.db'))
      .map(f => {
        const stats = statSync(join(BACKUP_DIR, f));
        return {
          filename: f,
          path: join(BACKUP_DIR, f),
          size: stats.size,
          created: stats.mtime,
          age: Date.now() - stats.mtime.getTime()
        };
      })
      .sort((a, b) => b.created - a.created); // Newest first
    
    return { success: true, backups };
  } catch (error) {
    console.error('Failed to list backups:', error);
    return { success: false, backups: [], error: error.message };
  }
}

/**
 * 🔥 NEW: Get most recent backup for a database
 */
export function getMostRecentBackup(dbName) {
  const result = listBackups(dbName);
  if (!result.success || result.backups.length === 0) {
    return { success: false, error: 'No backups found' };
  }
  
  return { success: true, backup: result.backups[0] };
}

/**
 * 🔥 NEW: Restore database from backup
 * WARNING: This will overwrite the current database!
 */
export function restoreDatabase(dbName, backupFilename = null) {
  try {
    console.log(`\n📥 Restoring ${dbName}...`);
    
    let backupPath;
    
    if (backupFilename) {
      // Restore from specific backup
      backupPath = join(BACKUP_DIR, backupFilename);
    } else {
      // Restore from most recent backup
      const recent = getMostRecentBackup(dbName);
      if (!recent.success) {
        return { success: false, error: 'No backups available' };
      }
      backupPath = recent.backup.path;
      backupFilename = recent.backup.filename;
    }
    
    // Verify backup exists
    if (!existsSync(backupPath)) {
      return { success: false, error: `Backup file not found: ${backupFilename}` };
    }
    
    // Create a safety backup of current database before restoring
    const safetyBackup = `./${dbName}.before-restore`;
    try {
      copyFileSync(`./${dbName}`, safetyBackup);
      console.log(`✅ Created safety backup: ${safetyBackup}`);
    } catch (err) {
      console.warn('⚠️  Could not create safety backup:', err.message);
    }
    
    // Restore the backup
    const targetPath = `./${dbName}`;
    copyFileSync(backupPath, targetPath);
    
    console.log(`✅ Restored ${dbName} from ${backupFilename}\n`);
    return { success: true, restored: backupFilename };
  } catch (error) {
    console.error(`❌ Failed to restore ${dbName}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 🔥 NEW: Test backup integrity
 * Verifies that a backup file can be opened and read
 */
export function testBackupIntegrity(dbName, backupFilename = null) {
  try {
    console.log(`\n🧪 Testing backup integrity for ${dbName}...`);
    
    let backupPath;
    
    if (backupFilename) {
      backupPath = join(BACKUP_DIR, backupFilename);
    } else {
      const recent = getMostRecentBackup(dbName);
      if (!recent.success) {
        return { success: false, error: 'No backups available' };
      }
      backupPath = recent.backup.path;
      backupFilename = recent.backup.filename;
    }
    
    // Verify file exists
    if (!existsSync(backupPath)) {
      return { success: false, error: `Backup file not found: ${backupFilename}` };
    }
    
    // Try to open the database
    const testDb = new Database(backupPath, { readonly: true });
    
    // Test query
    const tables = testDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    
    testDb.close();
    
    console.log(`✅ Backup integrity verified: ${backupFilename}`);
    console.log(`   Tables found: ${tables.length}`);
    console.log(`   Tables: ${tables.map(t => t.name).join(', ')}\n`);
    
    return { 
      success: true, 
      backup: backupFilename,
      tables: tables.map(t => t.name),
      tableCount: tables.length
    };
  } catch (error) {
    console.error(`❌ Backup integrity test FAILED:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 🔥 NEW: Test all recent backups
 */
export function testAllBackups() {
  console.log('\n🧪 Testing integrity of all recent backups...\n');
  
  const results = {};
  let totalBackups = 0;
  let validBackups = 0;
  
  DATABASES.forEach(dbName => {
    console.log(`\n📊 Testing backups for ${dbName}:`);
    
    const backupList = listBackups(dbName);
    if (!backupList.success || backupList.backups.length === 0) {
      console.log(`   No backups found for ${dbName}`);
      results[dbName] = { tested: 0, valid: 0, invalid: 0 };
      return;
    }
    
    // Test up to 3 most recent backups
    const toTest = backupList.backups.slice(0, 3);
    let dbValid = 0;
    let dbInvalid = 0;
    
    toTest.forEach(backup => {
      totalBackups++;
      const test = testBackupIntegrity(dbName, backup.filename);
      if (test.success) {
        validBackups++;
        dbValid++;
      } else {
        dbInvalid++;
        console.error(`   ❌ CORRUPT: ${backup.filename}`);
      }
    });
    
    results[dbName] = { tested: toTest.length, valid: dbValid, invalid: dbInvalid };
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Backup Integrity Test Summary:');
  console.log('='.repeat(60));
  console.log(`Total backups tested: ${totalBackups}`);
  console.log(`✅ Valid backups: ${validBackups}`);
  console.log(`❌ Corrupt backups: ${totalBackups - validBackups}`);
  
  Object.entries(results).forEach(([db, stats]) => {
    console.log(`\n${db}:`);
    console.log(`  Tested: ${stats.tested}`);
    console.log(`  Valid: ${stats.valid}`);
    console.log(`  Invalid: ${stats.invalid}`);
  });
  
  console.log('='.repeat(60) + '\n');
  
  return {
    success: true,
    totalBackups,
    validBackups,
    corruptBackups: totalBackups - validBackups,
    results
  };
}

/**
 * Schedule automatic backups (every 24 hours)
 */
export function scheduleBackups() {
  const BACKUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  
  // Initial backup on startup
  setTimeout(() => {
    backupAllDatabases();
  }, 5000); // Wait 5 seconds after startup
  
  // Schedule recurring backups
  setInterval(() => {
    backupAllDatabases();
  }, BACKUP_INTERVAL);
  
  console.log('📦 Automatic backups scheduled (every 24 hours)');
}

// Run backup if called directly
if (import.meta.main) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'backup':
      backupAllDatabases();
      break;
    
    case 'test':
      testAllBackups();
      break;
    
    case 'list':
      const dbName = args[1] || 'users.db';
      const result = listBackups(dbName);
      if (result.success) {
        console.log(`\n📋 Backups for ${dbName}:`);
        result.backups.forEach((b, i) => {
          const ageHours = Math.floor(b.age / (1000 * 60 * 60));
          const ageDays = Math.floor(ageHours / 24);
          const ageStr = ageDays > 0 ? `${ageDays}d ago` : `${ageHours}h ago`;
          console.log(`  ${i + 1}. ${b.filename} (${(b.size / 1024).toFixed(1)}KB, ${ageStr})`);
        });
      }
      break;
    
    case 'restore':
      const dbToRestore = args[1] || 'users.db';
      const backupFile = args[2];
      const restoreResult = restoreDatabase(dbToRestore, backupFile);
      if (restoreResult.success) {
        console.log(`✅ Restore successful!`);
      } else {
        console.error(`❌ Restore failed: ${restoreResult.error}`);
      }
      break;
    
    default:
      console.log(`
📦 Backup Management Commands:

  bun run backup.js backup          - Create backups now
  bun run backup.js test             - Test all recent backups
  bun run backup.js list [db]        - List backups for database
  bun run backup.js restore [db] [file] - Restore from backup

Examples:
  bun run backup.js test
  bun run backup.js list users.db
  bun run backup.js restore users.db users_2025-01-15T10-30-00-000Z.db
      `);
  }
}
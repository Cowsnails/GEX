// utils/appSettingsManager.js - Manage global app settings (ticker, expiration, etc.)
import { Database } from 'bun:sqlite';

const db = new Database('trade_history.db');

// Create table for app settings
db.run(`
  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

console.log('✅ App Settings Database initialized');

export class AppSettingsManager {

  // Save a setting
  static saveSetting(key, value) {
    try {
      const stmt = db.prepare(`
        INSERT INTO app_settings (key, value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key)
        DO UPDATE SET
          value = excluded.value,
          updated_at = CURRENT_TIMESTAMP
      `);

      stmt.run(key, value);
      console.log(`✅ Saved setting: ${key} = ${value}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Error saving setting ${key}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  // Get a setting
  static getSetting(key, defaultValue = null) {
    try {
      const stmt = db.prepare(`
        SELECT value FROM app_settings WHERE key = ?
      `);

      const row = stmt.get(key);

      if (row) {
        console.log(`📊 Loaded setting: ${key} = ${row.value}`);
        return row.value;
      }

      console.log(`📊 Setting not found: ${key}, using default: ${defaultValue}`);
      return defaultValue;
    } catch (error) {
      console.error(`❌ Error getting setting ${key}:`, error.message);
      return defaultValue;
    }
  }

  // Get current ticker and expiration
  static getCurrentTicker() {
    const symbol = this.getSetting('current_symbol', 'SPY');
    const expiration = this.getSetting('current_expiration', '20251219');

    return { symbol, expiration };
  }

  // Save current ticker and expiration
  static saveCurrentTicker(symbol, expiration) {
    this.saveSetting('current_symbol', symbol.toUpperCase());
    this.saveSetting('current_expiration', expiration);
    console.log(`✅ Saved ticker: ${symbol} with expiration: ${expiration}`);
  }
}

export default AppSettingsManager;
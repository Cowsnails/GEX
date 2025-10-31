// utils/exitSettingsManager.js - Manage per-trader exit settings (stop loss & take profit)
import { Database } from 'bun:sqlite';

const db = new Database('trade_history.db');

// Create table for exit settings
db.run(`
  CREATE TABLE IF NOT EXISTS exit_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    trader_type TEXT NOT NULL,
    stop_loss REAL,
    take_profit REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, trader_type)
  )
`);

console.log('✅ Exit Settings Database initialized');

export class ExitSettingsManager {

  // Save or update exit settings for a user
  static saveSettings(userId, settings) {
    try {
      const traders = ['manual', 'elite', 'brando'];

      db.run('BEGIN TRANSACTION');

      for (const trader of traders) {
        if (settings[trader]) {
          const { stopLoss, takeProfit } = settings[trader];

          const stmt = db.prepare(`
            INSERT INTO exit_settings (user_id, trader_type, stop_loss, take_profit, updated_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(user_id, trader_type)
            DO UPDATE SET
              stop_loss = excluded.stop_loss,
              take_profit = excluded.take_profit,
              updated_at = CURRENT_TIMESTAMP
          `);

          stmt.run(userId, trader, stopLoss, takeProfit);
        }
      }

      db.run('COMMIT');

      console.log(`✅ Exit settings saved for user ${userId}`);
      return { success: true };
    } catch (error) {
      db.run('ROLLBACK');
      console.error('❌ Error saving exit settings:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Get exit settings for a user
  static getSettings(userId) {
    try {
      const stmt = db.prepare(`
        SELECT trader_type, stop_loss, take_profit
        FROM exit_settings
        WHERE user_id = ?
      `);

      const rows = stmt.all(userId);

      const settings = {};
      for (const row of rows) {
        settings[row.trader_type] = {
          stopLoss: row.stop_loss,
          takeProfit: row.take_profit
        };
      }

      console.log(`📊 Loaded exit settings for user ${userId}`);
      return { success: true, settings };
    } catch (error) {
      console.error('❌ Error getting exit settings:', error.message);
      return { success: false, settings: {}, error: error.message };
    }
  }

  // Get exit settings for a specific trader type
  static getTraderSettings(userId, traderType) {
    try {
      const stmt = db.prepare(`
        SELECT stop_loss, take_profit
        FROM exit_settings
        WHERE user_id = ? AND trader_type = ?
      `);

      const row = stmt.get(userId, traderType);

      if (row) {
        return {
          success: true,
          stopLoss: row.stop_loss,
          takeProfit: row.take_profit
        };
      }

      // Return null if no settings found for this trader
      return { success: true, stopLoss: null, takeProfit: null };
    } catch (error) {
      console.error('❌ Error getting trader settings:', error.message);
      return { success: false, stopLoss: null, takeProfit: null, error: error.message };
    }
  }

  // Check if a signal should be auto-exited based on current P&L
  static shouldAutoExit(userId, signal, currentPnlPercent) {
    try {
      // Determine trader type
      let traderType;
      if (signal.isManual) {
        traderType = 'manual';
      } else if (signal.trader === 'elite') {
        traderType = 'elite';
      } else if (signal.trader === 'brando') {
        traderType = 'brando';
      } else {
        // No exit settings for this trader type
        return { shouldExit: false, reason: null };
      }

      const settings = this.getTraderSettings(userId, traderType);

      if (!settings.success) {
        return { shouldExit: false, reason: null };
      }

      // Check stop loss
      if (settings.stopLoss !== null && currentPnlPercent <= settings.stopLoss) {
        return {
          shouldExit: true,
          reason: 'stop_loss',
          threshold: settings.stopLoss,
          currentPnl: currentPnlPercent
        };
      }

      // Check take profit
      if (settings.takeProfit !== null && currentPnlPercent >= settings.takeProfit) {
        return {
          shouldExit: true,
          reason: 'take_profit',
          threshold: settings.takeProfit,
          currentPnl: currentPnlPercent
        };
      }

      return { shouldExit: false, reason: null };
    } catch (error) {
      console.error('❌ Error checking auto-exit:', error.message);
      return { shouldExit: false, reason: null, error: error.message };
    }
  }
}

export default ExitSettingsManager;
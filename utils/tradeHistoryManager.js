// utils/tradeHistoryManager.js - Store & Calculate Trade History + Winrates with USER-SPECIFIC Manual Entries
import { Database } from 'bun:sqlite';

const db = new Database('trade_history.db');

// Create tables for trade signals with USER-SPECIFIC manual entry support
db.run(`
  CREATE TABLE IF NOT EXISTS trade_signals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    signal_id TEXT UNIQUE NOT NULL,
    user_id INTEGER,
    trader TEXT NOT NULL,
    root TEXT NOT NULL,
    expiration TEXT NOT NULL,
    strike REAL NOT NULL,
    right TEXT NOT NULL,
    entry_price REAL,
    received_at INTEGER NOT NULL,
    status TEXT DEFAULT 'active',
    confluence_score INTEGER,
    analysis_action TEXT,
    analysis_reason TEXT,
    is_manual BOOLEAN DEFAULT 0,
    trader_type TEXT DEFAULT 'ocr',
    exit_price REAL,
    exit_time INTEGER,
    pnl_percent REAL,
    pnl_dollars REAL,
    duration_seconds INTEGER,
    outcome TEXT,
    account_type TEXT DEFAULT 'default',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// 🏷️ Add account_type column to existing databases (migration)
try {
  db.prepare(`ALTER TABLE trade_signals ADD COLUMN account_type TEXT DEFAULT 'default'`).run();
  console.log('✅ Added account_type column to existing trade_signals table');
} catch (e) {
  // Column already exists, ignore error
  if (!e.message.includes('duplicate column')) {
    console.error('⚠️ Error adding account_type column:', e.message);
  }
}

db.run(`
  CREATE TABLE IF NOT EXISTS trade_outcomes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    signal_id TEXT NOT NULL,
    trader TEXT NOT NULL,
    outcome TEXT NOT NULL,
    exit_price REAL,
    pnl_percent REAL,
    pnl_dollars REAL,
    duration_seconds INTEGER,
    closed_at INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (signal_id) REFERENCES trade_signals(signal_id)
  )
`);

// Add columns if they don't exist (migration support)
try {
  db.run('ALTER TABLE trade_signals ADD COLUMN user_id INTEGER');
  console.log('✅ Added user_id column to trade_signals');
} catch (e) {
  // Column already exists
}

try {
  db.run('ALTER TABLE trade_signals ADD COLUMN is_manual BOOLEAN DEFAULT 0');
} catch (e) {
  // Column already exists
}

try {
  db.run('ALTER TABLE trade_signals ADD COLUMN trader_type TEXT DEFAULT "ocr"');
} catch (e) {
  // Column already exists
}

try {
  db.run('ALTER TABLE trade_signals ADD COLUMN trading_mode TEXT DEFAULT "default"');
  console.log('✅ Added trading_mode column to trade_signals');
} catch (e) {
  // Column already exists
}

// Update NULL trading_mode values to 'default' for backward compatibility
try {
  db.run('UPDATE trade_signals SET trading_mode = "default" WHERE trading_mode IS NULL');
  console.log('✅ Updated NULL trading_mode values to "default"');
} catch (e) {
  // Already updated
}

// 🔧 FIX: Change completed trades from 'deleted' to 'closed'
// Some trades were incorrectly marked as 'deleted' when they're actually completed trades
try {
  const result = db.run(`
    UPDATE trade_signals
    SET status = 'closed'
    WHERE status = 'deleted'
    AND exit_price IS NOT NULL
  `);
  if (result.changes > 0) {
    console.log(`✅ Fixed ${result.changes} completed trades that were marked as 'deleted' - changed to 'closed'`);
  }
} catch (e) {
  console.error('❌ Error fixing deleted trades:', e.message);
}

try {
  db.run('ALTER TABLE trade_signals ADD COLUMN exit_price REAL');
} catch (e) {
  // Column already exists
}

try {
  db.run('ALTER TABLE trade_signals ADD COLUMN exit_time INTEGER');
} catch (e) {
  // Column already exists
}

try {
  db.run('ALTER TABLE trade_signals ADD COLUMN pnl_percent REAL');
} catch (e) {
  // Column already exists
}

try {
  db.run('ALTER TABLE trade_signals ADD COLUMN pnl_dollars REAL');
} catch (e) {
  // Column already exists
}

try {
  db.run('ALTER TABLE trade_signals ADD COLUMN duration_seconds INTEGER');
} catch (e) {
  // Column already exists
}

try {
  db.run('ALTER TABLE trade_signals ADD COLUMN outcome TEXT');
} catch (e) {
  // Column already exists
}

try {
  db.run('ALTER TABLE trade_signals ADD COLUMN is_public BOOLEAN DEFAULT 0');
  console.log('✅ Added is_public column to trade_signals');
} catch (e) {
  // Column already exists
}

// Update NULL is_public values to 0 for backward compatibility
try {
  db.run('UPDATE trade_signals SET is_public = 0 WHERE is_public IS NULL');
  console.log('✅ Updated NULL is_public values to 0');
} catch (e) {
  // Already updated
}

try {
  db.run('ALTER TABLE trade_signals ADD COLUMN shared_at INTEGER');
} catch (e) {
  // Column already exists
}

try {
  db.run('ALTER TABLE trade_signals ADD COLUMN exit_reason TEXT');
} catch (e) {
  // Column already exists
}

try {
  db.run('ALTER TABLE trade_signals ADD COLUMN quantity INTEGER DEFAULT 1');
} catch (e) {
  // Column already exists
}

// ✅ ADD COLUMNS FOR MANUAL TRADE STATE (position tracking)
try {
  db.run('ALTER TABLE trade_signals ADD COLUMN has_position BOOLEAN DEFAULT 0');
  console.log('✅ Added has_position column to trade_signals');
} catch (e) {
  // Column already exists
}

try {
  db.run('ALTER TABLE trade_signals ADD COLUMN watch_only BOOLEAN DEFAULT 1');
  console.log('✅ Added watch_only column to trade_signals');
} catch (e) {
  // Column already exists
}

try {
  db.run('ALTER TABLE trade_signals ADD COLUMN position_id TEXT');
  console.log('✅ Added position_id column to trade_signals');
} catch (e) {
  // Column already exists
}

try {
  db.run('ALTER TABLE trade_signals ADD COLUMN current_price REAL');
  console.log('✅ Added current_price column to trade_signals');
} catch (e) {
  // Column already exists
}

// Create indexes for faster queries
db.run('CREATE INDEX IF NOT EXISTS idx_trader ON trade_signals(trader)');
db.run('CREATE INDEX IF NOT EXISTS idx_status ON trade_signals(status)');
db.run('CREATE INDEX IF NOT EXISTS idx_is_manual ON trade_signals(is_manual)');
db.run('CREATE INDEX IF NOT EXISTS idx_trader_type ON trade_signals(trader_type)');
db.run('CREATE INDEX IF NOT EXISTS idx_user_id ON trade_signals(user_id)');
db.run('CREATE INDEX IF NOT EXISTS idx_user_status ON trade_signals(user_id, status)');
db.run('CREATE INDEX IF NOT EXISTS idx_user_manual ON trade_signals(user_id, is_manual)');
db.run('CREATE INDEX IF NOT EXISTS idx_outcome_trader ON trade_outcomes(trader)');
db.run('CREATE INDEX IF NOT EXISTS idx_public ON trade_signals(is_public)');
db.run('CREATE INDEX IF NOT EXISTS idx_public_status ON trade_signals(is_public, status)');

// 🔥 PHASE 7: Add exited_at timestamp column
try {
  db.run('ALTER TABLE trade_signals ADD COLUMN exited_at INTEGER');
  console.log('✅ Added exited_at column to trade_signals');
} catch (e) {
  // Column already exists
}

// 🔥 PHASE 7: Add database indexes for faster exit lookups
db.run('CREATE INDEX IF NOT EXISTS idx_signal_position ON trade_signals(signal_id, position_id, has_position)');
db.run('CREATE INDEX IF NOT EXISTS idx_active_signals ON trade_signals(user_id, status, watch_only, received_at)');
console.log('✅ Phase 7 indexes created for optimized exit performance');

console.log('✅ Trade History Database initialized with user-specific support');

export class TradeHistoryManager {
  
  // 🔥 SAVE NEW TRADE SIGNAL (supports manual entries WITH userId)
  static saveSignal(signal, userId = null) {
    try {
      const isManual = signal.isManual ? 1 : 0;
      const traderType = signal.isManual ? 'manual' : (signal.trader || 'ocr');

      // 🆕 CRITICAL: Store userId for manual entries, NULL for OCR signals (global)
      const signalUserId = isManual ? userId : null;

      console.log('💾 Attempting to save signal:', {
        signal_id: signal.id,
        user_id: signalUserId,
        trader: signal.trader || 'unknown',
        root: signal.root,
        expiration: signal.expiration,
        strike: signal.strike,
        right: signal.right,
        entry_price: signal.entryPrice || signal.price || signal.ocrPrice || null,
        received_at: signal.receivedAt || Date.now(),
        is_manual: isManual,
        trader_type: traderType,
        has_position: signal.hasPosition,
        exit_price: signal.exitPrice,
        pnl: signal.pnl,
        status: signal.unwatched ? 'closed' : 'active'
      });

      // Check if signal already exists
      const checkStmt = db.prepare('SELECT status, exit_price, pnl_percent FROM trade_signals WHERE signal_id = ?');
      const existing = checkStmt.get(signal.id);

      let stmt, params;

      if (existing && signal.exitPrice && signal.pnl !== undefined) {
        // UPDATE existing signal with exit data
        // Use provided pnlDollars if available, otherwise calculate it
        const quantity = signal.quantity || existing.quantity || 1;
        let pnlDollars;

        if (signal.pnlDollars !== undefined) {
          // Use the pnlDollars already calculated (more accurate for default account)
          pnlDollars = signal.pnlDollars;
        } else {
          // Fallback: calculate based on entry/exit prices
          const entryPrice = signal.entryPrice || signal.price || signal.ocrPrice || existing.entry_price || 0;
          pnlDollars = (signal.exitPrice - entryPrice) * quantity * 100;
        }

        stmt = db.prepare(`
          UPDATE trade_signals
          SET status = 'closed',
              exit_price = ?,
              exit_time = ?,
              pnl_percent = ?,
              pnl_dollars = ?,
              outcome = ?,
              has_position = 0,
              watch_only = ?,
              current_price = ?,
              quantity = ?
          WHERE signal_id = ?
        `);

        const outcome = signal.pnl > 0 ? 'WIN' : signal.pnl < 0 ? 'LOSS' : 'NEUTRAL';

        stmt.run(
          signal.exitPrice,
          signal.exitedAt ? new Date(signal.exitedAt).getTime() : Date.now(),
          signal.pnl,
          pnlDollars,
          outcome,
          signal.watchOnly ? 1 : 0,
          signal.currentPrice || signal.exitPrice,
          quantity,
          signal.id
        );

        console.log(`✅ Exit saved: ${signal.root} ${signal.strike}${signal.right} - P&L: ${signal.pnl.toFixed(2)}% ($${pnlDollars.toFixed(2)}) (${outcome})`);
      } else {
        // INSERT new signal
        stmt = db.prepare(`
          INSERT OR REPLACE INTO trade_signals
          (signal_id, user_id, trader, root, expiration, strike, right, entry_price, received_at, status, is_manual, trader_type, trading_mode, has_position, watch_only, position_id, current_price, quantity, account_type)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const tradingMode = signal.tradingMode || signal.trading_mode || 'default';
        const accountType = signal.accountType || 'default';  // 🏷️ Get account type from signal

        stmt.run(
          signal.id,
          signalUserId,
          signal.trader || 'unknown',
          signal.root,
          signal.expiration,
          signal.strike,
          signal.right,
          signal.entryPrice || signal.price || signal.ocrPrice || null,
          signal.receivedAt || Date.now(),
          isManual,
          traderType,
          tradingMode,
          signal.hasPosition ? 1 : 0,
          signal.watchOnly ? 1 : 0,
          signal.positionId || null,
          signal.currentPrice || signal.entryPrice || null,
          signal.quantity || 1,  // ✅ CRITICAL: Save quantity on INSERT
          accountType  // 🏷️ Save account type
        );

        const ownershipType = isManual ? `USER ${userId}` : 'GLOBAL (OCR)';
        console.log(`✅ Trade signal saved: ${signal.root} ${signal.strike}${signal.right} (${signal.trader}) - ${ownershipType} ${isManual ? '(MANUAL 📝)' : '(OCR 📸)'}`);
        if (signal.quantity) {
          console.log(`   📊 Quantity saved: ${signal.quantity} contracts`);
        }
      }

      // 🌍 AUTO-SHARE OCR TRADES TO GLOBAL FEED
      if (!isManual && !existing) {
        try {
          const shareStmt = db.prepare(`
            UPDATE trade_signals
            SET is_public = 1, shared_at = ?
            WHERE signal_id = ?
          `);
          shareStmt.run(Date.now(), signal.id);
          console.log(`🌍 OCR trade auto-shared to Global Trades`);
        } catch (shareError) {
          console.error('⚠️ Error auto-sharing OCR trade:', shareError.message);
        }
      }

      return { success: true, userId: signalUserId };
    } catch (error) {
      console.error('❌ Error saving signal:', error.message);
      console.error('❌ Error code:', error.code);
      console.error('❌ Full error:', error);
      return { success: false, error: error.message };
    }
  }
  
  // 📊 UPDATE SIGNAL WITH ANALYSIS RESULTS
  static updateAnalysis(signalId, confluenceScore, action, reason) {
    try {
      const stmt = db.prepare(`
        UPDATE trade_signals 
        SET confluence_score = ?, analysis_action = ?, analysis_reason = ?
        WHERE signal_id = ?
      `);
      
      stmt.run(confluenceScore, action, reason, signalId);
      
      console.log(`📊 Analysis updated for ${signalId}: ${confluenceScore}% - ${action}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating analysis:', error.message);
      return { success: false };
    }
  }
  
  // 💰 RECORD TRADE OUTCOME (WIN/LOSS)
  static recordOutcome(signalId, outcome, exitPrice = null, pnlPercent = null, pnlDollars = null, durationSeconds = null) {
    try {
      // Get signal info
      const signalStmt = db.prepare('SELECT * FROM trade_signals WHERE signal_id = ?');
      const signal = signalStmt.get(signalId);
      
      if (!signal) {
        console.error('❌ Signal not found:', signalId);
        return { success: false, error: 'Signal not found' };
      }
      
      // Insert outcome
      const outcomeStmt = db.prepare(`
        INSERT INTO trade_outcomes 
        (signal_id, trader, outcome, exit_price, pnl_percent, pnl_dollars, duration_seconds, closed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      outcomeStmt.run(
        signalId,
        signal.trader,
        outcome,
        exitPrice,
        pnlPercent,
        pnlDollars,
        durationSeconds,
        Date.now()
      );
      
      // Update signal status and outcome data
      const updateStmt = db.prepare(`
        UPDATE trade_signals 
        SET status = 'closed', 
            outcome = ?,
            exit_price = ?,
            exit_time = ?,
            pnl_percent = ?,
            pnl_dollars = ?,
            duration_seconds = ?
        WHERE signal_id = ?
      `);
      
      updateStmt.run(
        outcome.toUpperCase(),
        exitPrice,
        Date.now(),
        pnlPercent,
        pnlDollars,
        durationSeconds,
        signalId
      );
      
      console.log(`💰 Outcome recorded: ${signalId} - ${outcome.toUpperCase()}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error recording outcome:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  // 📋 GET ACTIVE SIGNALS - USER-SPECIFIC (includes global OCR + user's manual entries)
  static getActiveSignals(userId = null) {
    try {
      let stmt;
      let signals;

      // Get today's date at midnight in milliseconds
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTimestamp = today.getTime();

      if (userId) {
        // Return OCR signals from TODAY only + ALL user's manual entries (regardless of date)
        // INCLUDE closed signals that are still being watched (watch_only=1)
        // EXCLUDE deleted/unwatched signals
        stmt = db.prepare(`
          SELECT * FROM trade_signals
          WHERE (status = 'active' OR (status = 'closed' AND watch_only = 1))
          AND (
            (user_id IS NULL AND received_at >= ?)
            OR user_id = ?
          )
          ORDER BY received_at DESC
        `);
        signals = stmt.all(todayTimestamp, userId);
      } else {
        // If no userId provided, return only today's global OCR signals
        stmt = db.prepare(`
          SELECT * FROM trade_signals
          WHERE (status = 'active' OR (status = 'closed' AND watch_only = 1))
          AND user_id IS NULL
          AND received_at >= ?
          ORDER BY received_at DESC
        `);
        signals = stmt.all(todayTimestamp);
      }

      console.log(`📋 Retrieved ${signals.length} active signals for ${userId ? `user ${userId}` : 'global'} (OCR filtered to today only)`);

      // Debug: Show breakdown of manual vs OCR signals
      const manualCount = signals.filter(s => s.is_manual === 1).length;
      const ocrCount = signals.length - manualCount;
      console.log(`  ├─ Manual entries: ${manualCount} (all time)`);
      console.log(`  └─ OCR signals: ${ocrCount} (today only)`);

      if (manualCount > 0) {
        console.log('📝 Manual entries:', signals.filter(s => s.is_manual === 1).map(s => ({
          id: s.signal_id,
          root: s.root,
          strike: s.strike,
          right: s.right,
          user_id: s.user_id
        })));
      }

      return {
        success: true,
        signals: signals.map(s => ({
          id: s.signal_id,
          trader: s.trader,
          root: s.root,
          expiration: s.expiration,
          strike: s.strike,
          right: s.right,
          entryPrice: s.entry_price,
          receivedAt: s.received_at,
          status: s.status || (s.confluence_score ? 'complete' : 'analyzing'),
          confluence: s.confluence_score,
          action: s.analysis_action,
          reason: s.analysis_reason,
          isManual: s.is_manual === 1,
          traderType: s.trader_type,
          userId: s.user_id,
          isGlobal: s.user_id === null,
          hasPosition: s.has_position === 1,
          watchOnly: s.watch_only === 1,
          positionId: s.position_id,
          currentPrice: s.current_price,
          exitPrice: s.exit_price,
          exitTime: s.exit_time,
          pnl: s.pnl_percent,
          outcome: s.outcome,
          quantity: s.quantity || 1,  // ✅ CRITICAL: Include quantity from database
          accountType: s.account_type || 'default'  // 🏷️ Include account type badge
        }))
      };
    } catch (error) {
      console.error('❌ Error getting active signals:', error.message);
      return { success: false, signals: [] };
    }
  }
  
  // 🗑️ REMOVE SIGNAL FROM USER'S WATCHLIST (for manual entries only)
  static removeSignal(signalId, userId) {
    try {
      console.log(`🔍 REMOVE SIGNAL - signalId: "${signalId}", userId: ${userId}`);

      // First verify this is a manual entry owned by this user
      const checkStmt = db.prepare(`
        SELECT signal_id, user_id, is_manual, status FROM trade_signals
        WHERE signal_id = ?
      `);
      const signal = checkStmt.get(signalId);

      console.log(`🔍 Found signal in DB:`, signal);

      if (!signal) {
        console.error('❌ Signal not found:', signalId);
        return { success: false, error: 'Signal not found' };
      }

      // Can't remove global OCR signals
      if (signal.user_id === null) {
        console.error('❌ Cannot remove global OCR signal:', signalId);
        return { success: false, error: 'Cannot remove global OCR signals' };
      }

      // Can only remove your own manual entries
      if (signal.user_id !== userId) {
        console.error(`❌ User ${userId} does not own signal (owned by ${signal.user_id})`);
        return { success: false, error: 'Not authorized to remove this signal' };
      }

      // ⚠️ IMPORTANT: Don't delete closed trades - just stop watching them!
      // Closed trades should remain in history for metrics.
      // Set watch_only = 0 so they don't appear in the sidebar anymore.

      if (signal.status === 'closed') {
        console.log(`🛑 Stopping watch for closed trade ${signalId} (will hide from sidebar but preserve in history)`);

        // Set watch_only = 0 to hide from sidebar
        const updateStmt = db.prepare(`
          UPDATE trade_signals
          SET watch_only = 0
          WHERE signal_id = ? AND user_id = ?
        `);

        const result = updateStmt.run(signalId, userId);

        if (result.changes > 0) {
          console.log(`✅ Stopped watching closed trade ${signalId} - hidden from sidebar but preserved in history`);
          return { success: true, message: 'Stopped watching (trade preserved in history)' };
        } else {
          console.error('❌ Failed to update watch_only flag');
          return { success: false, error: 'Failed to stop watching' };
        }
      }

      // Mark as deleted instead of actually deleting (preserves history for non-closed trades)
      const updateStmt = db.prepare(`
        UPDATE trade_signals
        SET status = 'deleted'
        WHERE signal_id = ? AND user_id = ? AND status != 'closed'
      `);

      const result = updateStmt.run(signalId, userId);

      console.log(`🔍 UPDATE result - changes: ${result.changes}`);

      if (result.changes > 0) {
        console.log(`✅ Marked signal ${signalId} as DELETED for user ${userId}`);
        return { success: true };
      } else {
        console.error('❌ No rows updated - signal may be closed or not found');
        return { success: false, error: 'Signal not found or already closed' };
      }

    } catch (error) {
      console.error('❌ Error removing signal:', error.message);
      console.error('❌ Stack:', error.stack);
      return { success: false, error: error.message };
    }
  }

  // 🎯 CLOSE SIGNAL - Mark signal as exited (for auto-exit or manual exit)
  static closeSignal(signalId, exitPrice, realizedPnl, exitReason = 'manual') {
    try {
      console.log(`🎯 Closing signal ${signalId} at $${exitPrice} (${exitReason})`);

      const stmt = db.prepare(`
        UPDATE trade_signals
        SET
          status = 'closed',
          exit_price = ?,
          exit_time = ?,
          pnl_dollars = ?,
          pnl_percent = (? - entry_price) / entry_price * 100,
          exit_reason = ?
        WHERE signal_id = ?
      `);

      const result = stmt.run(
        exitPrice,
        Date.now(),
        realizedPnl,
        exitPrice,
        exitReason,
        signalId
      );

      if (result.changes > 0) {
        console.log(`✅ Signal ${signalId} closed successfully`);
        return { success: true };
      } else {
        console.error(`❌ Signal ${signalId} not found`);
        return { success: false, error: 'Signal not found' };
      }
    } catch (error) {
      console.error('❌ Error closing signal:', error.message);
      return { success: false, error: error.message };
    }
  }

  // 📜 GET TRADE HISTORY WITH FILTERING (all, manual, ocr) - USER-SPECIFIC
  static getTradeHistory(limit = 50, filter = 'all', userId = null) {
    try {
      let query = `
        SELECT 
          s.signal_id,
          s.user_id,
          s.trader,
          s.root,
          s.expiration,
          s.strike,
          s.right,
          s.entry_price,
          s.received_at,
          s.confluence_score,
          s.is_manual,
          s.trader_type,
          s.status,
          s.outcome,
          s.exit_price,
          s.exit_time,
          s.pnl_percent,
          s.pnl_dollars,
          s.duration_seconds,
          o.outcome as outcome_table,
          o.exit_price as outcome_exit_price,
          o.pnl_percent as outcome_pnl_percent,
          o.pnl_dollars as outcome_pnl_dollars,
          o.duration_seconds as outcome_duration,
          o.closed_at as outcome_closed_at
        FROM trade_signals s
        LEFT JOIN trade_outcomes o ON s.signal_id = o.signal_id
        WHERE 1=1
      `;
      
      // 🆕 CRITICAL: Filter by userId (show global OCR + user's manual entries)
      if (userId) {
        query += ' AND (s.user_id IS NULL OR s.user_id = ?)';
      } else {
        query += ' AND s.user_id IS NULL';
      }
      
      // Apply filter
      if (filter === 'manual') {
        query += ' AND s.is_manual = 1';
      } else if (filter === 'ocr') {
        query += ' AND s.is_manual = 0';
      }
      // filter === 'all' includes everything
      
      query += ' ORDER BY COALESCE(s.exit_time, o.closed_at, s.received_at) DESC LIMIT ?';
      
      const stmt = db.prepare(query);
      const history = userId ? stmt.all(userId, limit) : stmt.all(limit);
      
      console.log(`📊 Retrieved ${history.length} trades (filter: ${filter}, user: ${userId || 'global'})`);
      
      return {
        success: true,
        trades: history.map(t => ({
          signalId: t.signal_id,
          symbol: `${t.root} $${t.strike} ${t.right === 'C' ? 'CALL' : 'PUT'}`,
          trader: t.trader,
          date: new Date(t.outcome_closed_at || t.exit_time || t.received_at).toLocaleDateString(),
          entry: `$${t.entry_price?.toFixed(2) || 'N/A'}`,
          exit: `$${(t.exit_price || t.outcome_exit_price)?.toFixed(2) || 'N/A'}`,
          pnl: (t.pnl_percent || t.outcome_pnl_percent) ? `${(t.pnl_percent || t.outcome_pnl_percent) > 0 ? '+' : ''}${(t.pnl_percent || t.outcome_pnl_percent).toFixed(1)}%` : 'N/A',
          outcome: (t.outcome || t.outcome_table || 'ACTIVE').toUpperCase(),
          duration: (t.duration_seconds || t.outcome_duration) ? this.formatDuration(t.duration_seconds || t.outcome_duration) : 'N/A',
          confluence: t.confluence_score || 0,
          isManual: t.is_manual === 1,
          traderType: t.trader_type,
          status: t.status,
          userId: t.user_id,
          isGlobal: t.user_id === null
        })),
        filter: filter,
        count: history.length,
        userId: userId
      };
    } catch (error) {
      console.error('❌ Error getting trade history:', error.message);
      return { success: false, trades: [], error: error.message };
    }
  }
  
  // 📊 CALCULATE WINRATES (separated by manual/OCR/elite/combo) - USER-SPECIFIC
  static getWinrates(userId = null) {
    try {
      // Build WHERE clause for user filtering
      const userFilter = userId ? 'AND (user_id IS NULL OR user_id = ?)' : 'AND user_id IS NULL';
      
      // Overall stats (all closed trades)
      const allStmt = db.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN outcome = 'WIN' THEN 1 ELSE 0 END) as wins,
          SUM(CASE WHEN outcome = 'LOSS' THEN 1 ELSE 0 END) as losses
        FROM trade_signals 
        WHERE status = 'closed' AND outcome IS NOT NULL
        ${userFilter}
      `);
      const allStats = userId ? allStmt.get(userId) : allStmt.get();
      
      // Manual entries only (user-specific)
      const manualStmt = db.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN outcome = 'WIN' THEN 1 ELSE 0 END) as wins,
          SUM(CASE WHEN outcome = 'LOSS' THEN 1 ELSE 0 END) as losses
        FROM trade_signals 
        WHERE status = 'closed' AND outcome IS NOT NULL AND is_manual = 1
        ${userId ? 'AND user_id = ?' : ''}
      `);
      const manualStats = userId ? manualStmt.get(userId) : manualStmt.get();
      
      // OCR signals only (always global)
      const ocrStmt = db.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN outcome = 'WIN' THEN 1 ELSE 0 END) as wins,
          SUM(CASE WHEN outcome = 'LOSS' THEN 1 ELSE 0 END) as losses
        FROM trade_signals 
        WHERE status = 'closed' AND outcome IS NOT NULL AND is_manual = 0 AND user_id IS NULL
      `);
      const ocrStats = ocrStmt.get();
      
      // Elite trader stats (from OCR only - always global)
      const eliteStmt = db.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN outcome = 'WIN' THEN 1 ELSE 0 END) as wins,
          SUM(CASE WHEN outcome = 'LOSS' THEN 1 ELSE 0 END) as losses
        FROM trade_signals 
        WHERE status = 'closed' AND outcome IS NOT NULL AND is_manual = 0 AND trader = 'elite' AND user_id IS NULL
      `);
      const eliteStats = eliteStmt.get();
      
      // Combo trader stats (from OCR, non-elite - always global)
      const comboStmt = db.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN outcome = 'WIN' THEN 1 ELSE 0 END) as wins,
          SUM(CASE WHEN outcome = 'LOSS' THEN 1 ELSE 0 END) as losses
        FROM trade_signals 
        WHERE status = 'closed' AND outcome IS NOT NULL AND is_manual = 0 AND trader != 'elite' AND user_id IS NULL
      `);
      const comboStats = comboStmt.get();
      
      // Calculate winrate helper
      const calculateWinrate = (stats) => {
        if (!stats || stats.total === 0) return 0;
        return Math.round((stats.wins / stats.total) * 100);
      };
      
      return {
        success: true,
        userId: userId,
        overall: {
          winrate: calculateWinrate(allStats),
          wins: allStats.wins || 0,
          losses: allStats.losses || 0,
          total: allStats.total || 0
        },
        manual: {
          winrate: calculateWinrate(manualStats),
          wins: manualStats.wins || 0,
          losses: manualStats.losses || 0,
          total: manualStats.total || 0
        },
        ocr: {
          winrate: calculateWinrate(ocrStats),
          wins: ocrStats.wins || 0,
          losses: ocrStats.losses || 0,
          total: ocrStats.total || 0
        },
        elite: {
          winrate: calculateWinrate(eliteStats),
          wins: eliteStats.wins || 0,
          losses: eliteStats.losses || 0,
          total: eliteStats.total || 0
        },
        combo: {
          winrate: calculateWinrate(comboStats),
          wins: comboStats.wins || 0,
          losses: comboStats.losses || 0,
          total: comboStats.total || 0
        }
      };
    } catch (error) {
      console.error('❌ Error calculating winrates:', error.message);
      return {
        success: false,
        userId: userId,
        overall: { winrate: 0, wins: 0, losses: 0, total: 0 },
        manual: { winrate: 0, wins: 0, losses: 0, total: 0 },
        ocr: { winrate: 0, wins: 0, losses: 0, total: 0 },
        elite: { winrate: 0, wins: 0, losses: 0, total: 0 },
        combo: { winrate: 0, wins: 0, losses: 0, total: 0 }
      };
    }
  }
  
  // 🔍 GET MANUAL ENTRY STATISTICS - USER-SPECIFIC
  static getManualEntryStats(userId = null) {
    try {
      const userFilter = userId ? 'AND user_id = ?' : '';
      
      const stmt = db.prepare(`
        SELECT 
          COUNT(*) as total_entries,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed,
          SUM(CASE WHEN outcome = 'WIN' THEN 1 ELSE 0 END) as wins,
          AVG(CASE WHEN pnl_percent IS NOT NULL THEN pnl_percent ELSE 0 END) as avg_pnl
        FROM trade_signals 
        WHERE is_manual = 1 ${userFilter}
      `);
      
      const stats = userId ? stmt.get(userId) : stmt.get();
      
      console.log(`🔍 Manual entry stats for ${userId ? `user ${userId}` : 'all users'}: ${stats.total_entries} total, ${stats.active} active, ${stats.closed} closed`);
      
      return {
        success: true,
        userId: userId,
        totalEntries: stats.total_entries || 0,
        active: stats.active || 0,
        closed: stats.closed || 0,
        wins: stats.wins || 0,
        avgPnL: stats.avg_pnl || 0
      };
    } catch (error) {
      console.error('❌ Error getting manual entry stats:', error.message);
      return { 
        success: false, 
        error: error.message,
        userId: userId,
        totalEntries: 0,
        active: 0,
        closed: 0,
        wins: 0,
        avgPnL: 0
      };
    }
  }
  
  // 🕐 FORMAT DURATION
  static formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }
  
  // 🧹 CLEANUP OLD COMPLETED SIGNALS (keep last 7 days only)
  static cleanupOldSignals() {
    try {
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

      // NEVER delete public trades or manual trades - only auto-generated OCR trades
      const stmt = db.prepare(`
        DELETE FROM trade_signals
        WHERE status = 'closed'
          AND received_at < ?
          AND is_public = 0
          AND is_manual = 0
      `);

      const result = stmt.run(sevenDaysAgo);

      if (result.changes > 0) {
        console.log(`🧹 Cleaned up ${result.changes} old OCR trade signals (kept public and manual trades)`);
      }

      return { success: true, deleted: result.changes };
    } catch (error) {
      console.error('❌ Error cleaning up signals:', error.message);
      return { success: false };
    }
  }
  
  // 📊 GET USER'S SIGNAL COUNT
  static getUserSignalCount(userId) {
    try {
      const stmt = db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN is_manual = 1 THEN 1 ELSE 0 END) as manual_count,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_count
        FROM trade_signals
        WHERE user_id = ?
      `);

      const stats = stmt.get(userId);

      return {
        success: true,
        userId: userId,
        total: stats.total || 0,
        manualCount: stats.manual_count || 0,
        activeCount: stats.active_count || 0
      };
    } catch (error) {
      console.error('❌ Error getting user signal count:', error.message);
      return {
        success: false,
        userId: userId,
        total: 0,
        manualCount: 0,
        activeCount: 0
      };
    }
  }

  // 🌍 SHARE TRADE PUBLICLY
  static setTradePublic(signalId, userId, isPublic = true) {
    try {
      console.log(`🌍 setTradePublic called: signalId=${signalId}, userId=${userId}, isPublic=${isPublic}`);

      // First verify the user owns this trade
      const checkStmt = db.prepare('SELECT user_id, is_manual, is_public FROM trade_signals WHERE signal_id = ?');
      const signal = checkStmt.get(signalId);

      console.log(`🌍 Found signal:`, signal);

      if (!signal) {
        console.log(`❌ Trade not found: ${signalId}`);
        return { success: false, error: 'Trade not found' };
      }

      if (signal.user_id !== userId) {
        console.log(`❌ Not authorized: signal.user_id=${signal.user_id}, userId=${userId}`);
        return { success: false, error: 'Not authorized' };
      }

      // Update public status
      const updateStmt = db.prepare(`
        UPDATE trade_signals
        SET is_public = ?, shared_at = ?
        WHERE signal_id = ? AND user_id = ?
      `);

      const result = updateStmt.run(isPublic ? 1 : 0, isPublic ? Date.now() : null, signalId, userId);

      console.log(`🌍 Update result:`, { changes: result.changes });
      console.log(`🌍 Trade ${signalId} ${isPublic ? 'shared publicly' : 'made private'} by user ${userId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error setting trade public:', error.message);
      console.error('❌ Error stack:', error.stack);
      return { success: false, error: error.message };
    }
  }

  // 🌍 GET PUBLIC TRADES (Global feed)
  static getPublicTrades(limit = 50, filters = {}) {
    try {
      let query = `
        SELECT
          s.*,
          u.username
        FROM trade_signals s
        LEFT JOIN (SELECT id, username FROM users) u ON s.user_id = u.id
        WHERE s.is_public = 1 AND s.user_id IS NOT NULL
      `;

      const params = [];

      // Apply filters
      if (filters.right) {
        query += ' AND s.right = ?';
        params.push(filters.right);
      }

      if (filters.outcome) {
        query += ' AND s.outcome = ?';
        params.push(filters.outcome);
      }

      if (filters.root) {
        query += ' AND s.root = ?';
        params.push(filters.root);
      }

      if (filters.userId) {
        query += ' AND s.user_id = ?';
        params.push(filters.userId);
      }

      query += ' ORDER BY s.shared_at DESC LIMIT ?';
      params.push(limit);

      const stmt = db.prepare(query);
      const trades = stmt.all(...params);

      console.log(`🌍 Retrieved ${trades.length} public trades`);

      return {
        success: true,
        trades: trades.map(t => ({
          signalId: t.signal_id,
          userId: t.user_id,
          username: t.username || 'Anonymous',
          trader: t.trader,
          root: t.root,
          expiration: t.expiration,
          strike: t.strike,
          right: t.right,
          entryPrice: t.entry_price,
          exitPrice: t.exit_price,
          pnlPercent: t.pnl_percent,
          pnlDollars: t.pnl_dollars,
          outcome: t.outcome,
          duration: t.duration_seconds,
          receivedAt: t.received_at,
          sharedAt: t.shared_at,
          status: t.status,
          accountType: t.account_type || 'default'  // 🏷️ Include account type badge
        }))
      };
    } catch (error) {
      console.error('❌ Error getting public trades:', error.message);
      return { success: false, trades: [], error: error.message };
    }
  }

  // 📊 GET ADVANCED METRICS (Sharpe, Sortino, Profit Factor, etc.)
  static getAdvancedMetrics(userId = null, filters = {}) {
    try {
      let query = `
        SELECT
          pnl_percent,
          pnl_dollars,
          outcome,
          duration_seconds,
          right
        FROM trade_signals
        WHERE status = 'closed' AND pnl_percent IS NOT NULL
      `;

      const params = [];

      // User filter
      if (userId) {
        query += ' AND (user_id IS NULL OR user_id = ?)';
        params.push(userId);
      } else {
        query += ' AND user_id IS NULL';
      }

      // Additional filters
      if (filters.right) {
        query += ' AND right = ?';
        params.push(filters.right);
      }

      if (filters.trader) {
        query += ' AND trader = ?';
        params.push(filters.trader);
      }

      if (filters.tradingMode) {
        query += ' AND trading_mode = ?';
        params.push(filters.tradingMode);
      }

      const stmt = db.prepare(query);
      const trades = stmt.all(...params);

      if (trades.length === 0) {
        return {
          success: true,
          metrics: {
            totalTrades: 0,
            winRate: 0,
            profitFactor: 0,
            sharpeRatio: 0,
            sortinoRatio: 0,
            avgWin: 0,
            avgLoss: 0,
            largestWin: 0,
            largestLoss: 0,
            avgDuration: 0,
            maxConsecutiveWins: 0,
            maxConsecutiveLosses: 0,
            expectancy: 0
          }
        };
      }

      // Calculate metrics
      const returns = trades.map(t => t.pnl_percent);
      // Auto-determine outcome from pnl_percent if outcome is null
      const wins = trades.filter(t => (t.outcome === 'WIN') || (!t.outcome && t.pnl_percent > 0));
      const losses = trades.filter(t => (t.outcome === 'LOSS') || (!t.outcome && t.pnl_percent < 0));

      const totalWins = wins.reduce((sum, t) => sum + (t.pnl_dollars || 0), 0);
      const totalLosses = Math.abs(losses.reduce((sum, t) => sum + (t.pnl_dollars || 0), 0));

      const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
      const stdDev = Math.sqrt(
        returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
      );

      // Downside deviation (for Sortino)
      const downsideReturns = returns.filter(r => r < 0);
      const downsideDeviation = downsideReturns.length > 0
        ? Math.sqrt(
            downsideReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / downsideReturns.length
          )
        : 0;

      // Sharpe Ratio (assuming 0 risk-free rate, annualized)
      const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

      // Sortino Ratio (annualized)
      const sortinoRatio = downsideDeviation > 0 ? (avgReturn / downsideDeviation) * Math.sqrt(252) : 0;

      // Profit Factor
      const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

      // Consecutive wins/losses
      let maxConsecutiveWins = 0;
      let maxConsecutiveLosses = 0;
      let currentWinStreak = 0;
      let currentLossStreak = 0;

      trades.forEach(t => {
        if (t.outcome === 'WIN') {
          currentWinStreak++;
          currentLossStreak = 0;
          maxConsecutiveWins = Math.max(maxConsecutiveWins, currentWinStreak);
        } else {
          currentLossStreak++;
          currentWinStreak = 0;
          maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentLossStreak);
        }
      });

      // Average duration
      const avgDuration = trades.reduce((sum, t) => sum + (t.duration_seconds || 0), 0) / trades.length;

      // Expectancy
      const winRate = wins.length / trades.length;
      const avgWinAmount = wins.length > 0 ? wins.reduce((sum, t) => sum + t.pnl_percent, 0) / wins.length : 0;
      const avgLossAmount = losses.length > 0 ? losses.reduce((sum, t) => sum + Math.abs(t.pnl_percent), 0) / losses.length : 0;
      const expectancy = (winRate * avgWinAmount) - ((1 - winRate) * avgLossAmount);

      return {
        success: true,
        metrics: {
          totalTrades: trades.length,
          winRate: Math.round(winRate * 100),
          profitFactor: Math.round(profitFactor * 100) / 100,
          sharpeRatio: Math.round(sharpeRatio * 100) / 100,
          sortinoRatio: Math.round(sortinoRatio * 100) / 100,
          avgWin: avgWinAmount.toFixed(2),
          avgLoss: avgLossAmount.toFixed(2),
          largestWin: wins.length > 0 ? Math.max(...wins.map(t => t.pnl_percent)).toFixed(2) : 0,
          largestLoss: losses.length > 0 ? Math.min(...losses.map(t => t.pnl_percent)).toFixed(2) : 0,
          avgDuration: Math.round(avgDuration),
          maxConsecutiveWins,
          maxConsecutiveLosses,
          expectancy: expectancy.toFixed(2)
        }
      };
    } catch (error) {
      console.error('❌ Error calculating advanced metrics:', error.message);
      return { success: false, error: error.message };
    }
  }

  // 📊 GET DETAILED TRADE HISTORY FOR MY TRADES VIEW
  static getDetailedTradeHistory(userId, filters = {}, limit = 10000) {
    try {
      // CRITICAL DEBUG: Get total count of ALL trades for this user
      const countStmt = db.prepare('SELECT COUNT(*) as total FROM trade_signals WHERE user_id = ?');
      const countResult = countStmt.get(userId);
      console.log(`📊 ==========================================`);
      console.log(`📊 TOTAL trades in database for user ${userId}: ${countResult.total}`);

      // Get sample of ALL trades to see what's there
      const sampleStmt = db.prepare('SELECT signal_id, root, status, is_manual, entry_price, exit_price, is_public FROM trade_signals WHERE user_id = ? ORDER BY received_at DESC LIMIT 20');
      const sampleTrades = sampleStmt.all(userId);
      console.log(`📊 Sample of last 20 trades in DB:`, sampleTrades);
      console.log(`📊 ==========================================`);

      let query = `
        SELECT * FROM trade_signals
        WHERE user_id = ?
      `;

      const params = [userId];

      console.log(`📊 Getting detailed trade history for user ${userId} with filters:`, filters);

      // Apply filters
      if (filters.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }

      if (filters.right) {
        query += ' AND right = ?';
        params.push(filters.right);
      }

      if (filters.outcome) {
        if (filters.outcome === 'NA') {
          // N/A trades are those with missing entry or exit price
          query += ' AND (entry_price IS NULL OR exit_price IS NULL)';
        } else {
          query += ' AND outcome = ?';
          params.push(filters.outcome);
        }
      }

      if (filters.trader) {
        query += ' AND trader = ?';
        params.push(filters.trader);
      }

      if (filters.isManual !== undefined) {
        query += ' AND is_manual = ?';
        params.push(filters.isManual ? 1 : 0);
      }

      query += ' ORDER BY received_at DESC LIMIT ?';
      params.push(limit);

      console.log(`📊 SQL Query:`, query);
      console.log(`📊 Query params:`, params);

      const stmt = db.prepare(query);
      const trades = stmt.all(...params);

      console.log(`📊 Found ${trades.length} trades for user ${userId}`);

      return {
        success: true,
        trades: trades.map(t => ({
          signalId: t.signal_id,
          trader: t.trader,
          root: t.root,
          expiration: t.expiration,
          strike: t.strike,
          right: t.right,
          entryPrice: t.entry_price,
          exitPrice: t.exit_price,
          pnlPercent: t.pnl_percent,
          pnlDollars: t.pnl_dollars,
          outcome: t.outcome,
          status: t.status,
          duration: t.duration_seconds,
          receivedAt: t.received_at,
          exitTime: t.exit_time,
          isManual: t.is_manual === 1,
          isPublic: t.is_public === 1,
          confluenceScore: t.confluence_score,
          accountType: t.account_type || 'default'  // 🏷️ Include account type badge
        }))
      };
    } catch (error) {
      console.error('❌ Error getting detailed trade history:', error.message);
      return { success: false, trades: [], error: error.message };
    }
  }

  // 🗑️ REMOVE SINGLE N/A TRADE
  static removeNATrade(signalId, userId) {
    try {
      // First verify the user owns this trade
      const checkStmt = db.prepare('SELECT user_id, entry_price, exit_price, status, trading_mode FROM trade_signals WHERE signal_id = ?');
      const trade = checkStmt.get(signalId);

      if (!trade) {
        return { success: false, error: 'Trade not found' };
      }

      if (trade.user_id !== userId) {
        return { success: false, error: 'Unauthorized - you can only delete your own trades' };
      }

      // 🚫 PROTECTION: Cannot delete ACTIVE trades (would mess up account balance)
      if (trade.status === 'active') {
        return { success: false, error: 'Cannot delete active trades. You must close the position first.' };
      }

      // 🚫 PROTECTION: For safety, only allow deleting N/A trades (no entry or exit price)
      // N/A trades are watch-only or never-entered trades
      if (trade.entry_price || trade.exit_price) {
        return { success: false, error: 'Only N/A trades (never entered) can be deleted. Closed trades are preserved for history.' };
      }

      // Delete the trade
      const deleteStmt = db.prepare('DELETE FROM trade_signals WHERE signal_id = ? AND user_id = ?');
      deleteStmt.run(signalId, userId);

      console.log(`🗑️ Removed N/A trade ${signalId} for user ${userId}`);

      return { success: true };
    } catch (error) {
      console.error('❌ Error removing N/A trade:', error.message);
      return { success: false, error: error.message };
    }
  }

  // 🗑️ REMOVE ALL N/A TRADES FOR USER
  static removeAllNATrades(userId) {
    try {
      // Delete all trades where entry_price OR exit_price is NULL
      const deleteStmt = db.prepare(`
        DELETE FROM trade_signals
        WHERE user_id = ?
        AND (entry_price IS NULL OR exit_price IS NULL)
      `);

      const result = deleteStmt.run(userId);

      console.log(`🗑️ Removed ${result.changes} N/A trades for user ${userId}`);

      return {
        success: true,
        count: result.changes
      };
    } catch (error) {
      console.error('❌ Error removing all N/A trades:', error.message);
      return { success: false, error: error.message, count: 0 };
    }
  }

  // 🗑️ DELETE ALL DEFAULT ACCOUNT TRADES (Permanent deletion, not just marking as deleted)
  static deleteAllDefaultTrades(userId) {
    try {
      console.log(`🗑️ Starting deletion of Default account trades for user ${userId}`);

      // 🚫 PROTECTION: Check for active trades first
      const activeCheckStmt = db.prepare(`
        SELECT COUNT(*) as count FROM trade_signals
        WHERE user_id = ?
        AND trading_mode = 'default'
        AND status = 'active'
      `);
      const activeCount = activeCheckStmt.get(userId).count;

      if (activeCount > 0) {
        console.error(`❌ Cannot delete - user has ${activeCount} ACTIVE default trades`);
        return {
          success: false,
          error: `You have ${activeCount} active trade${activeCount > 1 ? 's' : ''}. Close all positions before deleting trade history.`,
          count: 0
        };
      }

      // Only delete CLOSED trades (status = 'closed') for safety
      const deleteStmt = db.prepare(`
        DELETE FROM trade_signals
        WHERE user_id = ?
        AND trading_mode = 'default'
        AND status = 'closed'
      `);

      const result = deleteStmt.run(userId);

      console.log(`✅ Permanently deleted ${result.changes} CLOSED Default account trades for user ${userId}`);
      console.log(`💰 Note: Account balance is preserved (not reset). Use Reset Balance button to reset to $100k.`);

      return {
        success: true,
        count: result.changes
      };
    } catch (error) {
      console.error('❌ Error deleting all Default trades:', error.message);
      return { success: false, error: error.message, count: 0 };
    }
  }

  // 🗑️ DELETE ALL PAPER ACCOUNT TRADES (Permanent deletion)
  static deleteAllPaperTrades(userId) {
    try {
      console.log(`🗑️ Starting deletion of Paper account trades for user ${userId}`);

      // 🚫 PROTECTION: Check for active trades first
      const activeCheckStmt = db.prepare(`
        SELECT COUNT(*) as count FROM trade_signals
        WHERE user_id = ?
        AND trading_mode = 'paper'
        AND status = 'active'
      `);
      const activeCount = activeCheckStmt.get(userId).count;

      if (activeCount > 0) {
        console.error(`❌ Cannot delete - user has ${activeCount} ACTIVE paper trades`);
        return {
          success: false,
          error: `⚠️ DANGER: You have ${activeCount} active paper trade${activeCount > 1 ? 's' : ''} in Alpaca. Close all positions in your broker before deleting trade history.`,
          count: 0
        };
      }

      // Only delete CLOSED trades (status = 'closed') for safety
      const deleteStmt = db.prepare(`
        DELETE FROM trade_signals
        WHERE user_id = ?
        AND trading_mode = 'paper'
        AND status = 'closed'
      `);

      const result = deleteStmt.run(userId);

      console.log(`✅ Permanently deleted ${result.changes} CLOSED Paper account trades for user ${userId}`);

      return {
        success: true,
        count: result.changes
      };
    } catch (error) {
      console.error('❌ Error deleting all Paper trades:', error.message);
      return { success: false, error: error.message, count: 0 };
    }
  }
}

// AUTO-CLEANUP: Run every 24 hours
setInterval(() => {
  TradeHistoryManager.cleanupOldSignals();
}, 24 * 60 * 60 * 1000);

console.log('✅ TradeHistoryManager initialized with user-specific manual entry support');

export default TradeHistoryManager;
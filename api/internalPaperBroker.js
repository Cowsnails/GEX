// api/internalPaperBroker.js - Internal Paper Trading Broker (No Alpaca Required)
import { Database } from 'bun:sqlite';

const db = new Database('paper_trades.db');

// Create tables for internal paper trading
db.run(`
  CREATE TABLE IF NOT EXISTS paper_positions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    position_id TEXT UNIQUE NOT NULL,
    root TEXT NOT NULL,
    expiration TEXT NOT NULL,
    strike REAL NOT NULL,
    right TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    entry_price REAL NOT NULL,
    entry_time INTEGER NOT NULL,
    current_price REAL,
    last_price_update INTEGER,
    pnl_percent REAL DEFAULT 0,
    pnl_dollars REAL DEFAULT 0,
    status TEXT DEFAULT 'open',
    exit_price REAL,
    exit_time INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.run('CREATE INDEX IF NOT EXISTS idx_user_positions ON paper_positions(user_id, status)');
db.run('CREATE INDEX IF NOT EXISTS idx_position_id ON paper_positions(position_id)');

console.log('✅ Internal Paper Trading Database initialized');

// Helper: Calculate number of contracts based on cash amount
function calculateContracts(premiumCost, cashAmount) {
  // Include 2% buffer for slippage
  const buffer = 1.02;
  const costPerContract = premiumCost * 100 * buffer; // Premium * 100 shares per contract
  const contracts = Math.floor(cashAmount / costPerContract);
  return Math.max(1, contracts); // At least 1 contract
}

// Find best strike with highest profit potential
function findBestStrike(optionsData, currentPrice, direction, targetStrike = null) {
  if (!optionsData || optionsData.length === 0) return null;

  // Filter by direction (calls or puts)
  const filtered = optionsData.filter(opt =>
    opt.right === (direction === 'CALL' ? 'C' : 'P')
  );

  // If target strike specified, find exact match
  if (targetStrike) {
    const exactMatch = filtered.find(opt =>
      Math.abs(opt.strike - targetStrike) < 0.01
    );
    if (exactMatch) return exactMatch;
  }

  // Find ATM options (within 1% of current price)
  const atmOptions = filtered.filter(opt =>
    Math.abs(opt.strike - currentPrice) / currentPrice < 0.01
  );

  if (atmOptions.length === 0) {
    // If no perfect ATM, find closest to current price
    filtered.sort((a, b) =>
      Math.abs(a.strike - currentPrice) - Math.abs(b.strike - currentPrice)
    );
    return filtered[0];
  }

  // Sort by highest liquidity (volume + open interest)
  atmOptions.sort((a, b) => {
    const liquidityA = (a.bid_size || 0) + (a.ask_size || 0) + (a.volume || 0);
    const liquidityB = (b.bid_size || 0) + (b.ask_size || 0) + (b.volume || 0);
    return liquidityB - liquidityA;
  });

  return atmOptions[0];
}

export class InternalPaperBroker {

  // Place paper trade order
  static async placeOrder(userId, orderParams) {
    try {
      const { symbol, expiration, strike, optionsData, currentPrice, direction, cashAmount, isManual, premiumPrice } = orderParams;

      // Find best strike (use provided strike if available)
      const bestOption = findBestStrike(optionsData, currentPrice, direction, strike);
      if (!bestOption) {
        return { success: false, error: 'No suitable option found' };
      }

      console.log(`🔍 BACKEND RECEIVED:`);
      console.log(`   premiumPrice param: ${premiumPrice}`);
      console.log(`   cashAmount param: ${cashAmount}`);
      console.log(`   bestOption.mid: ${bestOption.mid}`);
      console.log(`   bestOption.ask: ${bestOption.ask}`);
      console.log(`   bestOption.bid: ${bestOption.bid}`);

      // USE THE EXACT PREMIUM FROM THE SIGNAL IF PROVIDED - DON'T RECALCULATE
      // If premiumPrice is provided, use it. Otherwise fall back to calculating from options data.
      let premiumCost;
      if (premiumPrice && premiumPrice > 0) {
        premiumCost = premiumPrice;
        console.log(`Using EXACT premium from signal: $${premiumCost.toFixed(4)}/share`);
      } else {
        // Use ASK price (what you pay to BUY) instead of mid
        premiumCost = bestOption.ask || bestOption.mid || (bestOption.ask + bestOption.bid) / 2;
        console.log(`WARNING: No premium provided, using ASK price (market buy): $${premiumCost.toFixed(4)}/share`);
      }

      if (!premiumCost || premiumCost <= 0) {
        return { success: false, error: 'Invalid premium price' };
      }

      // Calculate contracts based on cash amount and the EXACT premium
      const buffer = 1.02;
      const costPerContract = premiumCost * 100 * buffer;
      const quantity = Math.floor(cashAmount / costPerContract);
      const actualQuantity = Math.max(1, quantity);
      const estimatedCost = actualQuantity * premiumCost * 100;

      console.log(`📊 BACKEND CALCULATION:`);
      console.log(`   premiumCost: $${premiumCost.toFixed(4)}/share`);
      console.log(`   costPerContract (with 2% buffer): $${costPerContract.toFixed(2)}`);
      console.log(`   quantity calculated: ${quantity}`);
      console.log(`   actual quantity (min 1): ${actualQuantity}`);
      console.log(`   estimatedCost: $${estimatedCost.toFixed(2)}`);

      // Generate position ID
      const positionId = `PAPER-${userId}-${symbol}-${Date.now()}`;

      // Save to database
      const stmt = db.prepare(`
        INSERT INTO paper_positions
        (user_id, position_id, root, expiration, strike, right, quantity, entry_price, entry_time, current_price, last_price_update)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const now = Date.now();
      stmt.run(
        userId,
        positionId,
        symbol,
        expiration,
        bestOption.strike,
        bestOption.right,
        actualQuantity,
        premiumCost,
        now,
        premiumCost,
        now
      );

      console.log(`✅ Paper trade placed for user ${userId}: ${actualQuantity}x ${symbol} ${bestOption.strike}${bestOption.right} @ $${premiumCost.toFixed(2)}`);

      return {
        success: true,
        positionId: positionId,
        optionSymbol: `${symbol} ${bestOption.strike}${bestOption.right}`,
        strike: bestOption.strike,
        right: bestOption.right,
        quantity: actualQuantity,
        entryPrice: premiumCost,
        estimatedCost: estimatedCost,
        message: 'Paper trade executed successfully',
        isPaper: true
      };
    } catch (error) {
      console.error('❌ Error placing paper trade:', error);
      return { success: false, error: error.message };
    }
  }

  // Exit paper trade position
  static async exitPosition(userId, positionId, currentPrice = null) {
    try {
      // Get position from database
      const stmt = db.prepare(`
        SELECT * FROM paper_positions
        WHERE user_id = ? AND position_id = ? AND status = 'open'
      `);

      const position = stmt.get(userId, positionId);
      if (!position) {
        return { success: false, error: 'Position not found or already closed' };
      }

      // 🔥 PHASE 5 FIX: Require current price - no fallback to stale data
      if (!currentPrice || currentPrice <= 0) {
        return {
          success: false,
          error: 'Current price required for exit. Please wait for price update or refresh the page.'
        };
      }

      const exitPrice = currentPrice;
      const pnlPercent = ((exitPrice - position.entry_price) / position.entry_price) * 100;
      const pnlDollars = (exitPrice - position.entry_price) * position.quantity * 100;

      console.log(`📊 Paper Exit: Entry=$${position.entry_price}, Exit=$${exitPrice}, P&L=${pnlPercent.toFixed(2)}%`);

      // Update position in database
      const updateStmt = db.prepare(`
        UPDATE paper_positions
        SET status = 'closed', exit_price = ?, exit_time = ?, pnl_percent = ?, pnl_dollars = ?
        WHERE position_id = ?
      `);

      updateStmt.run(exitPrice, Date.now(), pnlPercent, pnlDollars, positionId);

      console.log(`✅ Paper position exited for user ${userId}: ${position.root} ${position.strike}${position.right}, P&L: ${pnlPercent.toFixed(2)}%`);

      return {
        success: true,
        positionId: positionId,
        exitPrice: exitPrice,
        entryPrice: position.entry_price,  // Add entry price for balance calculation
        quantity: position.quantity,        // Add quantity for balance calculation
        pnl: pnlPercent,
        pnlDollars: pnlDollars,
        message: 'Paper position closed successfully',
        isPaper: true
      };
    } catch (error) {
      console.error('❌ Error exiting paper position:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user's paper positions
  static getPositions(userId) {
    try {
      const stmt = db.prepare(`
        SELECT * FROM paper_positions
        WHERE user_id = ? AND status = 'open'
        ORDER BY entry_time DESC
      `);

      const positions = stmt.all(userId);

      return {
        success: true,
        positions: positions.map(pos => ({
          id: pos.position_id,
          symbol: `${pos.root} ${pos.strike}${pos.right}`,
          root: pos.root,
          strike: pos.strike,
          right: pos.right,
          quantity: pos.quantity,
          entryPrice: pos.entry_price,
          currentPrice: pos.current_price,
          pnl: pos.pnl_percent,
          pnlDollars: pos.pnl_dollars,
          entryTime: pos.entry_time,
          isPaper: true
        }))
      };
    } catch (error) {
      console.error('❌ Error getting paper positions:', error);
      return { success: false, positions: [], error: error.message };
    }
  }

  // Update position price (called when new option quotes arrive)
  static updatePositionPrice(userId, root, expiration, strike, right, newPrice) {
    try {
      const stmt = db.prepare(`
        SELECT * FROM paper_positions
        WHERE user_id = ? AND root = ? AND expiration = ? AND strike = ? AND right = ? AND status = 'open'
      `);

      const position = stmt.get(userId, root, expiration, strike, right);
      if (!position) {
        return { success: false, message: 'Position not found' };
      }

      const pnlPercent = ((newPrice - position.entry_price) / position.entry_price) * 100;
      const pnlDollars = (newPrice - position.entry_price) * position.quantity * 100;

      const updateStmt = db.prepare(`
        UPDATE paper_positions
        SET current_price = ?, last_price_update = ?, pnl_percent = ?, pnl_dollars = ?
        WHERE position_id = ?
      `);

      updateStmt.run(newPrice, Date.now(), pnlPercent, pnlDollars, position.position_id);

      return {
        success: true,
        positionId: position.position_id,
        newPrice: newPrice,
        pnl: pnlPercent,
        pnlDollars: pnlDollars
      };
    } catch (error) {
      console.error('❌ Error updating paper position price:', error);
      return { success: false, error: error.message };
    }
  }

  // Get all open positions across all users (for price update subscriptions)
  static getAllOpenPositions() {
    try {
      const stmt = db.prepare(`
        SELECT DISTINCT root, expiration, strike, right
        FROM paper_positions
        WHERE status = 'open'
      `);

      return stmt.all();
    } catch (error) {
      console.error('❌ Error getting all open positions:', error);
      return [];
    }
  }
}
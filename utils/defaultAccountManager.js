// utils/defaultAccountManager.js - Default Account Balance Management (100k Virtual Trading)
import { Database } from 'bun:sqlite';

const db = new Database('default_accounts.db');

// Create table for default account balances
db.run(`
  CREATE TABLE IF NOT EXISTS default_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    balance REAL NOT NULL DEFAULT 100000.00,
    total_deposited REAL DEFAULT 100000.00,
    total_profit_loss REAL DEFAULT 0.00,
    total_trades INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create transaction history table
db.run(`
  CREATE TABLE IF NOT EXISTS default_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    signal_id TEXT,
    transaction_type TEXT NOT NULL,
    amount REAL NOT NULL,
    balance_before REAL NOT NULL,
    balance_after REAL NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES default_accounts(user_id)
  )
`);

db.run('CREATE INDEX IF NOT EXISTS idx_user_id ON default_accounts(user_id)');
db.run('CREATE INDEX IF NOT EXISTS idx_transactions_user ON default_transactions(user_id)');
db.run('CREATE INDEX IF NOT EXISTS idx_transactions_signal ON default_transactions(signal_id)');

console.log('✅ Default Account Database initialized');

export class DefaultAccountManager {

  // Initialize default account for user (if doesn't exist)
  static initializeAccount(userId, initialBalance = 100000.00) {
    try {
      const checkStmt = db.prepare('SELECT * FROM default_accounts WHERE user_id = ?');
      const existing = checkStmt.get(userId);

      if (existing) {
        console.log(`✅ Default account already exists for user ${userId}: $${existing.balance.toFixed(2)}`);
        return { success: true, balance: existing.balance, exists: true };
      }

      const insertStmt = db.prepare(`
        INSERT INTO default_accounts (user_id, balance, total_deposited)
        VALUES (?, ?, ?)
      `);

      insertStmt.run(userId, initialBalance, initialBalance);

      console.log(`✅ Created default account for user ${userId} with $${initialBalance.toFixed(2)}`);

      return { success: true, balance: initialBalance, exists: false };
    } catch (error) {
      console.error('❌ Error initializing default account:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Get account balance
  static getBalance(userId) {
    try {
      // Ensure account exists
      this.initializeAccount(userId);

      const stmt = db.prepare('SELECT * FROM default_accounts WHERE user_id = ?');
      const account = stmt.get(userId);

      if (!account) {
        return { success: false, error: 'Account not found' };
      }

      return {
        success: true,
        balance: account.balance,
        totalDeposited: account.total_deposited,
        totalProfitLoss: account.total_profit_loss,
        totalTrades: account.total_trades,
        returnPercent: account.total_deposited > 0
          ? ((account.balance - account.total_deposited) / account.total_deposited * 100).toFixed(2)
          : 0
      };
    } catch (error) {
      console.error('❌ Error getting default account balance:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Deduct money from account (for trade entry)
  static deductFunds(userId, amount, signalId, description = 'Trade entry') {
    try {
      // 🔍 DEBUG: Log every single deduction call with stack trace
      console.log(`🔍🔍🔍 DEDUCT FUNDS CALLED 🔍🔍🔍`);
      console.log(`   User ID: ${userId}`);
      console.log(`   Amount: $${amount.toFixed(2)}`);
      console.log(`   Signal ID: ${signalId}`);
      console.log(`   Description: ${description}`);
      console.log(`   CALL STACK:`);
      console.trace();

      const account = db.prepare('SELECT * FROM default_accounts WHERE user_id = ?').get(userId);

      if (!account) {
        this.initializeAccount(userId);
        return this.deductFunds(userId, amount, signalId, description);
      }

      if (account.balance < amount) {
        return {
          success: false,
          error: 'Insufficient funds',
          balance: account.balance,
          required: amount
        };
      }

      const newBalance = account.balance - amount;

      // Update account balance
      const updateStmt = db.prepare(`
        UPDATE default_accounts
        SET balance = ?, total_trades = total_trades + 1, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `);
      updateStmt.run(newBalance, userId);

      // Record transaction
      const transStmt = db.prepare(`
        INSERT INTO default_transactions
        (user_id, signal_id, transaction_type, amount, balance_before, balance_after, description)
        VALUES (?, ?, 'DEBIT', ?, ?, ?, ?)
      `);
      transStmt.run(userId, signalId, amount, account.balance, newBalance, description);

      console.log(`💸 Deducted $${amount.toFixed(2)} from user ${userId} default account. New balance: $${newBalance.toFixed(2)}`);

      return {
        success: true,
        balanceBefore: account.balance,
        balanceAfter: newBalance,
        amountDeducted: amount
      };
    } catch (error) {
      console.error('❌ Error deducting funds:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Add money to account (for trade exit or deposit)
  static addFunds(userId, amount, signalId, description = 'Trade exit', actualProfitLoss = null) {
    try {
      const account = db.prepare('SELECT * FROM default_accounts WHERE user_id = ?').get(userId);

      if (!account) {
        this.initializeAccount(userId);
        return this.addFunds(userId, amount, signalId, description, actualProfitLoss);
      }

      const newBalance = account.balance + amount;

      // Only update total_profit_loss if we have the actual P&L (not the full proceeds)
      let updateStmt;
      if (actualProfitLoss !== null) {
        updateStmt = db.prepare(`
          UPDATE default_accounts
          SET balance = ?, total_profit_loss = total_profit_loss + ?, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ?
        `);
        updateStmt.run(newBalance, actualProfitLoss, userId);
      } else {
        // Just update balance, not profit/loss
        updateStmt = db.prepare(`
          UPDATE default_accounts
          SET balance = ?, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ?
        `);
        updateStmt.run(newBalance, userId);
      }

      // Record transaction
      const transStmt = db.prepare(`
        INSERT INTO default_transactions
        (user_id, signal_id, transaction_type, amount, balance_before, balance_after, description)
        VALUES (?, ?, 'CREDIT', ?, ?, ?, ?)
      `);
      transStmt.run(userId, signalId, amount, account.balance, newBalance, description);

      console.log(`💰 Added $${amount.toFixed(2)} to user ${userId} default account. New balance: $${newBalance.toFixed(2)}`);

      return {
        success: true,
        balanceBefore: account.balance,
        balanceAfter: newBalance,
        amountAdded: amount
      };
    } catch (error) {
      console.error('❌ Error adding funds:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Process trade entry (deduct cost + fees)
  static processTradeEntry(userId, entryPrice, quantity = 1, signalId) {
    // Alpaca fees: $0.04950 per contract on entry
    const ENTRY_FEE_PER_CONTRACT = 0.04950;

    const contractCost = entryPrice * quantity * 100; // Options are per 100 shares
    const fees = ENTRY_FEE_PER_CONTRACT * quantity;
    const totalCost = contractCost + fees;

    console.log(`📊 TRADE ENTRY CALCULATION:`);
    console.log(`   Entry Price: $${entryPrice.toFixed(2)}`);
    console.log(`   Quantity: ${quantity} contract(s)`);
    console.log(`   Contract Cost: $${entryPrice.toFixed(2)} × ${quantity} × 100 = $${contractCost.toFixed(2)}`);
    console.log(`   Entry Fees: $${ENTRY_FEE_PER_CONTRACT.toFixed(5)} × ${quantity} = $${fees.toFixed(5)}`);
    console.log(`   TOTAL DEDUCTED: $${totalCost.toFixed(2)}`);

    return this.deductFunds(
      userId,
      totalCost,
      signalId,
      `Trade entry: ${quantity} contracts @ $${entryPrice.toFixed(2)} (fees: $${fees.toFixed(5)})`
    );
  }

  // Process trade exit (add proceeds - fees)
  static processTradeExit(userId, exitPrice, quantity = 1, entryPrice, signalId) {
    // Alpaca fees: $0.04950 entry + $0.05229 exit per contract
    const ENTRY_FEE_PER_CONTRACT = 0.04950;
    const EXIT_FEE_PER_CONTRACT = 0.05229;

    const grossProceeds = exitPrice * quantity * 100;
    const exitFees = EXIT_FEE_PER_CONTRACT * quantity;
    const netProceeds = grossProceeds - exitFees;

    const entryCost = entryPrice * quantity * 100;
    const entryFees = ENTRY_FEE_PER_CONTRACT * quantity;
    const totalEntryCost = entryCost + entryFees;

    // Actual P&L = what you got back - what you paid
    // netProceeds - totalEntryCost = net profit/loss after all fees
    const profitLoss = netProceeds - totalEntryCost;
    const totalFees = entryFees + exitFees;

    console.log(`📊 TRADE EXIT CALCULATION:`);
    console.log(`   Entry Price: $${entryPrice.toFixed(2)} | Exit Price: $${exitPrice.toFixed(2)}`);
    console.log(`   Quantity: ${quantity} contract(s)`);
    console.log(`   Exit Proceeds: $${exitPrice.toFixed(2)} × ${quantity} × 100 = $${grossProceeds.toFixed(2)}`);
    console.log(`   Exit Fees: $${EXIT_FEE_PER_CONTRACT.toFixed(5)} × ${quantity} = $${exitFees.toFixed(5)}`);
    console.log(`   Net Proceeds (after exit fees): $${netProceeds.toFixed(2)}`);
    console.log(`   Original Cost (entry + fees): $${totalEntryCost.toFixed(2)}`);
    console.log(`   Total Fees Paid: $${totalFees.toFixed(5)}`);
    console.log(`   NET P&L: ${profitLoss >= 0 ? '+' : ''}$${profitLoss.toFixed(2)} (${((exitPrice - entryPrice) / entryPrice * 100).toFixed(2)}%)`);
    console.log(`   AMOUNT RETURNED TO BALANCE: $${netProceeds.toFixed(2)}`);

    const result = this.addFunds(
      userId,
      netProceeds,
      signalId,
      `Trade exit: ${quantity} contracts @ $${exitPrice.toFixed(2)} (total fees: $${totalFees.toFixed(5)}, P&L: $${profitLoss.toFixed(5)})`,
      profitLoss  // Pass the ACTUAL profit/loss after all fees
    );

    return {
      ...result,
      profitLoss: profitLoss,
      profitLossPercent: ((exitPrice - entryPrice) / entryPrice * 100).toFixed(2),
      totalFees: totalFees
    };
  }

  // Reset account to initial balance
  static resetAccount(userId, newBalance = 100000.00) {
    try {
      const updateStmt = db.prepare(`
        UPDATE default_accounts
        SET balance = ?, total_deposited = ?, total_profit_loss = 0, total_trades = 0, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `);
      updateStmt.run(newBalance, newBalance, userId);

      console.log(`🔄 Reset default account for user ${userId} to $${newBalance.toFixed(2)}`);

      return { success: true, balance: newBalance };
    } catch (error) {
      console.error('❌ Error resetting account:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Get transaction history
  static getTransactionHistory(userId, limit = 50) {
    try {
      const stmt = db.prepare(`
        SELECT * FROM default_transactions
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `);

      const transactions = stmt.all(userId, limit);

      return {
        success: true,
        transactions: transactions.map(t => ({
          id: t.id,
          signalId: t.signal_id,
          type: t.transaction_type,
          amount: t.amount,
          balanceBefore: t.balance_before,
          balanceAfter: t.balance_after,
          description: t.description,
          timestamp: t.created_at
        }))
      };
    } catch (error) {
      console.error('❌ Error getting transaction history:', error.message);
      return { success: false, transactions: [], error: error.message };
    }
  }
}

console.log('✅ DefaultAccountManager initialized');

export default DefaultAccountManager;
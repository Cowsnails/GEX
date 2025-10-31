// utils/autoExitMonitor.js - Monitor open positions and auto-exit on stop loss / take profit
import ExitSettingsManager from './exitSettingsManager.js';
import TradeHistoryManager from './tradeHistoryManager.js';

class AutoExitMonitor {
  constructor() {
    this.isRunning = false;
    this.checkInterval = 5000; // Check every 5 seconds
    this.intervalId = null;
    this.isBacktestMode = null; // 🔥 FIX: Backtest mode checker
  }

  // 🔥 FIX: Set backtest mode checker
  setBacktestModeChecker(isBacktestMode) {
    this.isBacktestMode = isBacktestMode;
  }

  /**
   * Start monitoring for auto-exits
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️ Auto-exit monitor already running');
      return;
    }

    this.isRunning = true;
    console.log('🎯 Auto-exit monitor started (checking every 5 seconds)');

    // Run immediately, then on interval
    this.checkAllPositions();
    this.intervalId = setInterval(() => this.checkAllPositions(), this.checkInterval);
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🛑 Auto-exit monitor stopped');
  }

  /**
   * Check all active positions for exit conditions
   */
  async checkAllPositions() {
    // 🔥 FIX: Don't check positions in backtest mode
    if (this.isBacktestMode && this.isBacktestMode()) {
      // console.log('⏭️ [AutoExitMonitor] Skipping check - in backtest mode');
      return;
    }

    try {
      // Get all active signals from database
      const result = TradeHistoryManager.getActiveSignals();

      if (!result.success || !result.signals || result.signals.length === 0) {
        return; // No active signals to monitor
      }

      // Check each signal
      for (const signal of result.signals) {
        // Skip if no user ID (global OCR signals that user isn't tracking)
        if (!signal.user_id) continue;

        // Skip if no entry price
        if (!signal.entry_price) continue;

        // Fetch current price
        const currentPrice = await this.getCurrentPrice(signal);
        if (!currentPrice || currentPrice <= 0) continue;

        // Calculate P&L percentage
        const pnlPercent = ((currentPrice - signal.entry_price) / signal.entry_price) * 100;

        // Check if should auto-exit
        const exitCheck = ExitSettingsManager.shouldAutoExit(
          signal.user_id,
          signal,
          pnlPercent
        );

        if (exitCheck.shouldExit) {
          console.log(`🎯 AUTO-EXIT TRIGGERED for ${signal.root} ${signal.strike}${signal.right}`);
          console.log(`   Reason: ${exitCheck.reason.toUpperCase()}`);
          console.log(`   Threshold: ${exitCheck.threshold}% | Current P&L: ${pnlPercent.toFixed(2)}%`);

          // Execute exit
          await this.executeAutoExit(signal, currentPrice, exitCheck);
        }
      }
    } catch (error) {
      console.error('❌ Error in auto-exit monitor:', error.message);
    }
  }

  /**
   * Get current price for a contract
   */
  async getCurrentPrice(signal) {
    try {
      const THETA_HTTP = process.env.THETA_HTTP_API || "http://127.0.0.1:25510";
      const quoteUrl = `${THETA_HTTP}/v2/snapshot/option/quote?root=${signal.root}&exp=${signal.expiration}&strike=${parseFloat(signal.strike) * 1000}&right=${signal.right === 'C' ? 'CALL' : 'PUT'}`;

      const response = await fetch(quoteUrl, { timeout: 3000 });

      if (!response.ok) return null;

      const data = await response.json();

      if (data.response && data.response.length > 0) {
        const ticks = data.response[0];
        const bid = ticks[3] || 0;
        const ask = ticks[7] || 0;

        if (bid > 0 && ask > 0) {
          return (bid + ask) / 2; // Use mid price for exit
        }
      }

      return null;
    } catch (error) {
      // Silently fail - don't spam logs
      return null;
    }
  }

  /**
   * Execute auto-exit for a position
   */
  async executeAutoExit(signal, exitPrice, exitCheck) {
    try {
      // Import broker classes dynamically to avoid circular dependencies
      const { AlpacaBroker } = await import('../api/brokers/alpacaBroker.js');
      const { InternalPaperBroker } = await import('../api/brokers/internalPaperBroker.js');
      const { UserManager } = await import('./userManager.js');

      // Get user session for broker access
      const userSession = UserManager.getUserById(signal.user_id);
      if (!userSession) {
        console.error(`❌ User ${signal.user_id} not found for auto-exit`);
        return;
      }

      // Determine broker and trading mode
      let broker;
      let tradingMode = 'paper'; // Default to paper

      // Check if this was a copy trade (has trading_mode stored)
      // For now, default to paper - you can extend this to store mode per signal
      if (userSession.broker === 'alpaca' && userSession.alpacaKey) {
        broker = new AlpacaBroker(userSession.alpacaKey, userSession.alpacaSecret, tradingMode);
        console.log(`🎯 Using Alpaca broker (${tradingMode}) for auto-exit`);
      } else {
        broker = new InternalPaperBroker(signal.user_id);
        console.log(`🎯 Using internal paper broker for auto-exit`);
      }

      // Calculate quantity from signal (if stored) or default to 1
      const quantity = signal.quantity || 1;

      // Execute SELL order
      const orderResult = await broker.placeOrder({
        symbol: signal.root,
        strike: signal.strike,
        right: signal.right,
        expiration: signal.expiration,
        quantity: quantity,
        side: 'sell',
        orderType: 'market',
        limitPrice: null
      });

      if (orderResult.success) {
        // Calculate realized P&L
        const realizedPnl = (exitPrice - signal.entry_price) * quantity * 100;
        const realizedPnlPercent = ((exitPrice - signal.entry_price) / signal.entry_price) * 100;

        console.log(`✅ AUTO-EXIT EXECUTED`);
        console.log(`   Contract: ${signal.root} ${signal.strike}${signal.right}`);
        console.log(`   Entry: $${signal.entry_price.toFixed(2)} → Exit: $${exitPrice.toFixed(2)}`);
        console.log(`   P&L: ${realizedPnlPercent > 0 ? '+' : ''}${realizedPnlPercent.toFixed(2)}% ($${realizedPnl > 0 ? '+' : ''}${realizedPnl.toFixed(2)})`);

        // Update signal status in database
        TradeHistoryManager.closeSignal(signal.signal_id, exitPrice, realizedPnl, exitCheck.reason);

        // Broadcast notification to user
        if (global.broadcastToAllUsers) {
          global.broadcastToAllUsers({
            type: 'auto_exit_executed',
            userId: signal.user_id,
            signal: {
              id: signal.signal_id,
              root: signal.root,
              strike: signal.strike,
              right: signal.right,
              expiration: signal.expiration
            },
            exitReason: exitCheck.reason,
            entryPrice: signal.entry_price,
            exitPrice: exitPrice,
            pnl: realizedPnl,
            pnlPercent: realizedPnlPercent,
            threshold: exitCheck.threshold,
            orderId: orderResult.orderId
          });
        }
      } else {
        console.error(`❌ Auto-exit order failed for ${signal.root} ${signal.strike}${signal.right}:`, orderResult.error);

        // Broadcast failure
        if (global.broadcastToAllUsers) {
          global.broadcastToAllUsers({
            type: 'auto_exit_failed',
            userId: signal.user_id,
            signal: {
              root: signal.root,
              strike: signal.strike,
              right: signal.right
            },
            exitReason: exitCheck.reason,
            error: orderResult.error
          });
        }
      }
    } catch (error) {
      console.error(`❌ Error executing auto-exit for ${signal.root} ${signal.strike}${signal.right}:`, error.message);
    }
  }
}

// Create singleton instance
const autoExitMonitor = new AutoExitMonitor();

export default autoExitMonitor;
// api/optionsStreamManager.js - Full WebSocket Streaming for Stocks & Options
// Real-time bid/ask streaming with historical database storage
// ✅ FIXED: Proper WebSocket cleanup to prevent multiple connections

import { Database } from 'bun:sqlite';
import { WebSocket } from 'ws';

const THETA_WS = "ws://127.0.0.1:25520/v1/events"; // Streaming endpoint

class OptionsStreamManager {
  constructor() {
    this.db = null;
    this.ws = null; // Single WebSocket for both stocks and options
    this.isConnected = false;
    this.subscribers = new Map(); // clientId -> callback
    this.trackedContracts = new Set(); // Dynamic contracts from trade signals
    this.trackedStocks = new Set(); // Underlying stocks for tracked contracts
    this.contractData = new Map(); // contract -> latest quote
    this.stockData = new Map(); // ticker -> latest stock quote
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 5000;
  }

  // 📡 Initialize database and start streaming
  async initialize() {
    try {
      console.log('🚀 Initializing Options Stream Manager (Full WebSocket Streaming)...');
      
      // Step 1: Initialize database
      this.initDatabase();
      
      // Step 2: Load previously tracked contracts from database
      this.loadTrackedContracts();
      
      // Step 3: Connect to WebSocket
      await this.connectWebSocket();
      
      console.log('✅ Options Stream Manager initialized successfully');
      console.log(`📊 Streaming ${this.trackedContracts.size} contracts and ${this.trackedStocks.size} stocks`);
      
      return { success: true };
      
    } catch (error) {
      console.error('❌ Failed to initialize stream manager:', error);
      return { success: false, error: error.message };
    }
  }

  // 💾 Initialize SQLite database for quote history
  initDatabase() {
    console.log('💾 Initializing quote history database...');
    
    this.db = new Database('options_quotes.db');
    
    // Create tables for options quote history
    this.db.run(`
      CREATE TABLE IF NOT EXISTS options_quotes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contract_key TEXT NOT NULL,
        root TEXT NOT NULL,
        expiration TEXT NOT NULL,
        strike REAL NOT NULL,
        right TEXT NOT NULL,
        bid REAL,
        ask REAL,
        bid_size INTEGER,
        ask_size INTEGER,
        mid REAL,
        spread REAL,
        timestamp INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create index for faster queries
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_contract_timestamp 
      ON options_quotes(contract_key, timestamp)
    `);
    
    // Create table for stock quote history
    this.db.run(`
      CREATE TABLE IF NOT EXISTS stock_quotes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticker TEXT NOT NULL,
        price REAL NOT NULL,
        bid REAL,
        ask REAL,
        bid_size INTEGER,
        ask_size INTEGER,
        volume INTEGER,
        timestamp INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create index for stock quotes
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_stock_timestamp 
      ON stock_quotes(ticker, timestamp)
    `);
    
    // Create table for tracked contracts (persistence)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS tracked_contracts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contract_key TEXT UNIQUE NOT NULL,
        root TEXT NOT NULL,
        expiration TEXT NOT NULL,
        strike REAL NOT NULL,
        right TEXT NOT NULL,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT 1
      )
    `);
    
    console.log('✅ Database initialized');
  }

  // 📂 Load previously tracked contracts from database
  loadTrackedContracts() {
    try {
      const stmt = this.db.prepare('SELECT * FROM tracked_contracts WHERE is_active = 1');
      const contracts = stmt.all();
      
      for (const contract of contracts) {
        this.trackedContracts.add(contract.contract_key);
        this.trackedStocks.add(contract.root);
      }
      
      console.log(`📂 Loaded ${contracts.length} tracked contracts from database`);
    } catch (error) {
      console.error('❌ Error loading tracked contracts:', error.message);
    }
  }

  // 🔌 Connect to ThetaData WebSocket
  async connectWebSocket() {
    return new Promise((resolve, reject) => {
      try {
        console.log('🔌 Connecting to ThetaData stream...');
        
        // ✅ CRITICAL FIX: Close existing connection first
        if (this.ws) {
          console.log('⚠️ Closing existing WebSocket before creating new one...');
          try {
            this.ws.removeAllListeners();
            this.ws.close();
          } catch (e) {
            console.error('Error closing old WebSocket:', e);
          }
          this.ws = null;
        }
        
        this.ws = new WebSocket(THETA_WS);
        
        this.ws.on('open', () => {
          console.log('✅ [THETA] WebSocket connected to ThetaData');
          console.log(`   - Endpoint: ${THETA_WS}`);
          this.isConnected = true;
          this.reconnectAttempts = 0;

          // Subscribe to all tracked stocks and contracts
          this.subscribeAll();

          resolve();
        });
        
        this.ws.on('message', (data) => {
          this.handleMessage(data);
        });
        
        this.ws.on('error', (error) => {
          console.error('❌ WebSocket error:', error.message);
          this.isConnected = false;
          
          // ✅ CRITICAL FIX: Close on error to prevent zombie connections
          if (this.ws) {
            try {
              this.ws.removeAllListeners();
              this.ws.close();
            } catch (e) {}
            this.ws = null;
          }
        });
        
        this.ws.on('close', () => {
          console.log('🔌 WebSocket disconnected');
          this.isConnected = false;
          
          // ✅ CRITICAL FIX: Clean up reference
          this.ws = null;
          
          this.attemptReconnect();
        });
        
        // Timeout if connection takes too long
        setTimeout(() => {
          if (!this.isConnected) {
            // ✅ CRITICAL FIX: Close connection on timeout
            if (this.ws) {
              try {
                this.ws.removeAllListeners();
                this.ws.close();
              } catch (e) {}
              this.ws = null;
            }
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000);
        
      } catch (error) {
        reject(error);
      }
    });
  }

  // 🔄 Attempt reconnection with exponential backoff
  async attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`🔄 Reconnecting in ${delay/1000}s (attempt ${this.reconnectAttempts})...`);
    
    // ✅ CRITICAL FIX: Ensure old connection is fully cleaned up before reconnecting
    if (this.ws) {
      console.log('⚠️ Cleaning up old WebSocket before reconnect...');
      try {
        this.ws.removeAllListeners(); // Remove event listeners
        this.ws.close();
      } catch (e) {
        console.error('Error closing WebSocket during cleanup:', e);
      }
      this.ws = null;
    }
    
    setTimeout(async () => {
      try {
        await this.connectWebSocket();
        console.log('✅ WebSocket reconnected successfully');
      } catch (error) {
        console.error('❌ Reconnection failed:', error.message);
      }
    }, delay);
  }

  // 📡 Subscribe to all tracked stocks and contracts
  subscribeAll() {
    if (!this.isConnected) {
      console.warn('⚠️ Cannot subscribe - WebSocket not connected');
      return;
    }
    
    console.log(`📡 Subscribing to ${this.trackedStocks.size} stocks and ${this.trackedContracts.size} contracts...`);
    
    // Subscribe to stocks
    for (const ticker of this.trackedStocks) {
      this.subscribeStock(ticker);
    }
    
    // Subscribe to option contracts
    for (const contractKey of this.trackedContracts) {
      const [root, expiration, strike, right] = contractKey.split(':');
      this.subscribeContract(root, expiration, strike, right);
    }
  }

  // 📡 Subscribe to a stock via WebSocket
  subscribeStock(ticker) {
    if (!this.isConnected) {
      console.warn(`⚠️ Cannot subscribe ${ticker} - WebSocket not connected`);
      return;
    }
    
    const req = {
      msg_type: 'STREAM',
      sec_type: 'STOCK',
      req_type: 'QUOTE',
      add: true,
      id: 0,
      contract: {
        root: ticker
      }
    };
    
    this.ws.send(JSON.stringify(req));
    console.log(`✅ Subscribed to stock stream: ${ticker}`);
  }

  // 📡 Subscribe to an option contract via WebSocket
  subscribeContract(root, expiration, strike, right) {
    if (!this.isConnected) {
      console.warn(`⚠️ Cannot subscribe ${root} ${strike}${right} - WebSocket not connected`);
      return;
    }

    const req = {
      msg_type: 'STREAM',
      sec_type: 'OPTION',
      req_type: 'QUOTE',
      add: true,
      id: 0,
      contract: {
        root: root,
        expiration: parseInt(expiration.replace(/-/g, '')),  // 🔥 FIX: Strip dashes (2025-10-24 -> 20251024)
        strike: parseFloat(strike) * 1000, // ThetaData uses strike * 1000
        right: right === 'C' ? 'CALL' : 'PUT'
      }
    };

    console.log(`📡 [THETA] Subscribing to option:`, req);
    this.ws.send(JSON.stringify(req));
    console.log(`✅ Subscribed to option stream: ${root} ${strike}${right} ${expiration}`);
  }

  // 📡 Unsubscribe from a stock via WebSocket
  unsubscribeStock(ticker) {
    if (!this.isConnected) return;
    
    const req = {
      msg_type: 'STREAM',
      sec_type: 'STOCK',
      req_type: 'QUOTE',
      add: false,
      id: 0,
      contract: {
        root: ticker
      }
    };
    
    this.ws.send(JSON.stringify(req));
    console.log(`✅ Unsubscribed from stock stream: ${ticker}`);
  }

  // 📡 Unsubscribe from an option contract via WebSocket
  unsubscribeContract(root, expiration, strike, right) {
    if (!this.isConnected) return;

    const req = {
      msg_type: 'STREAM',
      sec_type: 'OPTION',
      req_type: 'QUOTE',
      add: false,
      id: 0,
      contract: {
        root: root,
        expiration: parseInt(expiration.replace(/-/g, '')),  // 🔥 FIX: Strip dashes (2025-10-24 -> 20251024)
        strike: parseFloat(strike) * 1000,
        right: right === 'C' ? 'CALL' : 'PUT'
      }
    };

    this.ws.send(JSON.stringify(req));
    console.log(`✅ Unsubscribed from option stream: ${root} ${strike}${right}`);
  }

  // 📨 Handle incoming WebSocket messages
  handleMessage(data) {
    try {
      const message = JSON.parse(data.toString());

      // Get security type from actual ThetaData format
      const securityType = message.contract?.security_type || message.sec_type || message.type;

      // Handle stock quotes
      if (securityType === 'STOCK') {
        this.handleStockQuote(message);
      }

      // Handle option quotes
      if (securityType === 'OPTION') {
        this.handleOptionQuote(message);
      }

    } catch (error) {
      console.error('❌ Error handling message:', error.message);
    }
  }

  // 📊 Handle stock quote message
  handleStockQuote(message) {
    try {
      const ticker = message.contract?.root || message.root;
      if (!ticker) return;

      // Extract quote data from message.quote (new ThetaData format)
      const quote = message.quote || message.data || message;

      const stockQuote = {
        ticker: ticker,
        price: quote.last || ((quote.bid && quote.ask) ? (quote.bid + quote.ask) / 2 : 0),
        bid: quote.bid || 0,
        ask: quote.ask || 0,
        bid_size: quote.bid_size || quote.bidSize || 0,
        ask_size: quote.ask_size || quote.askSize || 0,
        volume: quote.volume || 0,
        timestamp: Date.now()
      };

      this.stockData.set(ticker, stockQuote);

      // 🔥 SKIP DATABASE - too slow, causes lag
      // this.saveStockQuote(stockQuote);

      // Broadcast to subscribers
      this.broadcastStockUpdate(ticker, stockQuote);

    } catch (error) {
      console.error('❌ Error handling stock quote:', error.message);
    }
  }

  // 📊 Handle option quote message
  handleOptionQuote(message) {
    try {
      const contract = message.contract;
      if (!contract) return;

      const root = contract.root;
      const expiration = String(contract.expiration || contract.exp);
      const strike = (contract.strike / 1000); // ThetaData sends strike * 1000
      const right = contract.right; // Already 'C' or 'P' in new format

      const contractKey = `${root}:${expiration}:${strike}:${right}`;

      // Extract quote data from message.quote (new ThetaData format)
      const quote = message.quote || message.data || message;

      const quoteData = {
        root: root,
        expiration: expiration,
        strike: strike,
        right: right,
        bid: quote.bid || 0,
        ask: quote.ask || 0,
        bid_size: quote.bid_size || quote.bidSize || 0,
        ask_size: quote.ask_size || quote.askSize || 0,
        mid: (quote.bid && quote.ask) ? (quote.bid + quote.ask) / 2 : 0,
        spread: (quote.bid && quote.ask) ? quote.ask - quote.bid : 0,
        timestamp: Date.now()
      };

      this.contractData.set(contractKey, quoteData);

      // 🔥 SKIP DATABASE - too slow, causes lag
      // this.saveOptionQuote(contractKey, quoteData);

      // Broadcast to subscribers
      this.broadcastUpdate(contractKey, quoteData);

    } catch (error) {
      console.error('❌ Error handling option quote:', error.message);
    }
  }

  // 💾 Save option quote to database
  saveOptionQuote(contractKey, quoteData) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO options_quotes 
        (contract_key, root, expiration, strike, right, bid, ask, bid_size, ask_size, mid, spread, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        contractKey,
        quoteData.root,
        quoteData.expiration,
        quoteData.strike,
        quoteData.right,
        quoteData.bid,
        quoteData.ask,
        quoteData.bid_size,
        quoteData.ask_size,
        quoteData.mid,
        quoteData.spread,
        quoteData.timestamp
      );
    } catch (error) {
      // Silent fail for high-frequency inserts
      // console.error('❌ Error saving option quote:', error.message);
    }
  }

  // 💾 Save stock quote to database
  saveStockQuote(stockQuote) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO stock_quotes 
        (ticker, price, bid, ask, bid_size, ask_size, volume, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        stockQuote.ticker,
        stockQuote.price,
        stockQuote.bid,
        stockQuote.ask,
        stockQuote.bid_size,
        stockQuote.ask_size,
        stockQuote.volume,
        stockQuote.timestamp
      );
    } catch (error) {
      // Silent fail for high-frequency inserts
      // console.error('❌ Error saving stock quote:', error.message);
    }
  }

  // 📢 Broadcast quote update to all subscribers
  broadcastUpdate(contractKey, quoteData) {
    for (const [clientId, callback] of this.subscribers) {
      try {
        callback('options_quote', contractKey, quoteData);
      } catch (error) {
        console.error(`❌ Error broadcasting to client ${clientId}:`, error.message);
      }
    }
  }

  // 📢 Broadcast stock update to all subscribers
  broadcastStockUpdate(ticker, stockQuote) {
    for (const [clientId, callback] of this.subscribers) {
      try {
        callback('stock_quote', ticker, stockQuote);
      } catch (error) {
        console.error(`❌ Error broadcasting stock to client ${clientId}:`, error.message);
      }
    }
  }

  // 🎯 Add dynamic contract to monitor (from trade signal)
  async addDynamicContract(params) {
    // Support both object and individual parameters for backwards compatibility
    const root = typeof params === 'object' ? params.root : arguments[0];
    const expiration = typeof params === 'object' ? params.expiration : arguments[1];
    const strike = typeof params === 'object' ? params.strike : arguments[2];
    const right = typeof params === 'object' ? params.right : arguments[3];

    const contractKey = `${root}:${expiration}:${strike}:${right}`;

    if (this.trackedContracts.has(contractKey)) {
      console.log(`ℹ️ Contract already monitored: ${contractKey}`);
      return { success: true, alreadyMonitored: true };
    }

    this.trackedContracts.add(contractKey);

    // Add stock to tracking if not already tracked
    if (!this.trackedStocks.has(root)) {
      this.trackedStocks.add(root);
      this.subscribeStock(root);
      console.log(`📈 Now tracking stock: ${root}`);
    }

    // Subscribe to the option contract
    this.subscribeContract(root, expiration, strike, right);

    // Save to database for persistence
    try {
      const stmt = this.db.prepare(`
        INSERT OR IGNORE INTO tracked_contracts
        (contract_key, root, expiration, strike, right)
        VALUES (?, ?, ?, ?, ?)
      `);

      stmt.run(contractKey, root, expiration, strike, right);
    } catch (error) {
      console.error('❌ Error saving tracked contract:', error.message);
    }

    console.log(`✅ Added dynamic contract: ${contractKey}`);

    return { success: true };
  }

  // 🗑️ Remove dynamic contract from monitoring
  async removeDynamicContract(params) {
    // Support both object and individual parameters for backwards compatibility
    const root = typeof params === 'object' ? params.root : arguments[0];
    const expiration = typeof params === 'object' ? params.expiration : arguments[1];
    const strike = typeof params === 'object' ? params.strike : arguments[2];
    const right = typeof params === 'object' ? params.right : arguments[3];

    const contractKey = `${root}:${expiration}:${strike}:${right}`;

    if (!this.trackedContracts.has(contractKey)) {
      console.log(`ℹ️ Contract not monitored: ${contractKey}`);
      return { success: false, error: 'Not monitored' };
    }

    this.trackedContracts.delete(contractKey);

    // Unsubscribe from WebSocket
    this.unsubscribeContract(root, expiration, strike, right);

    // Mark as inactive in database (keep history)
    try {
      const stmt = this.db.prepare(`
        UPDATE tracked_contracts
        SET is_active = 0
        WHERE contract_key = ?
      `);

      stmt.run(contractKey);
    } catch (error) {
      console.error('❌ Error updating tracked contract:', error.message);
    }
    
    // Check if we should stop tracking the stock
    let stillNeedStock = false;
    for (const key of this.trackedContracts) {
      if (key.startsWith(`${root}:`)) {
        stillNeedStock = true;
        break;
      }
    }
    
    if (!stillNeedStock) {
      this.trackedStocks.delete(root);
      this.unsubscribeStock(root);
      console.log(`📉 Stopped tracking stock: ${root}`);
    }
    
    console.log(`✅ Removed dynamic contract: ${contractKey}`);
    
    return { success: true };
  }

  // 📊 Get quote history for a contract
  getContractHistory(root, expiration, strike, right, limit = 100) {
    const contractKey = `${root}:${expiration}:${strike}:${right}`;
    
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM options_quotes 
        WHERE contract_key = ? 
        ORDER BY timestamp DESC 
        LIMIT ?
      `);
      
      return stmt.all(contractKey, limit);
    } catch (error) {
      console.error('❌ Error getting contract history:', error.message);
      return [];
    }
  }

  // 📊 Get stock quote history
  getStockHistory(ticker, limit = 100) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM stock_quotes 
        WHERE ticker = ? 
        ORDER BY timestamp DESC 
        LIMIT ?
      `);
      
      return stmt.all(ticker, limit);
    } catch (error) {
      console.error('❌ Error getting stock history:', error.message);
      return [];
    }
  }

  // 🔔 Subscribe to quote updates
  subscribe(clientId, callback) {
    this.subscribers.set(clientId, callback);
    console.log(`✅ Client ${clientId} subscribed to quote updates`);
    
    // Send current contract data immediately
    for (const [contractKey, quoteData] of this.contractData) {
      try {
        callback('options_quote', contractKey, quoteData);
      } catch (error) {
        console.error(`❌ Error sending initial data to ${clientId}:`, error.message);
      }
    }
    
    // Send current stock data immediately
    for (const [ticker, stockQuote] of this.stockData) {
      try {
        callback('stock_quote', ticker, stockQuote);
      } catch (error) {
        console.error(`❌ Error sending initial stock data to ${clientId}:`, error.message);
      }
    }
  }

  // 🔕 Unsubscribe from quote updates
  unsubscribe(clientId) {
    this.subscribers.delete(clientId);
    console.log(`✅ Client ${clientId} unsubscribed`);
  }

  // 📊 Get current quote for specific contract
  getQuote(root, expiration, strike, right) {
    const contractKey = `${root}:${expiration}:${strike}:${right}`;
    return this.contractData.get(contractKey) || null;
  }

  // 📊 Get current stock quote
  getStockQuote(ticker) {
    return this.stockData.get(ticker) || null;
  }

  // 📊 Get all monitored contracts
  getAllQuotes() {
    return Array.from(this.contractData.values());
  }

  // 📊 Get all tracked stocks
  getAllStockQuotes() {
    return Array.from(this.stockData.values());
  }

  // 📊 Get statistics
  getStats() {
    return {
      connected: this.isConnected,
      trackedContracts: this.trackedContracts.size,
      trackedStocks: this.trackedStocks.size,
      totalContractQuotes: this.contractData.size,
      totalStockQuotes: this.stockData.size,
      subscribers: this.subscribers.size
    };
  }

  // 🛑 Cleanup and shutdown
  async shutdown() {
    console.log('🛑 Shutting down Options Stream Manager...');
    
    if (this.ws) {
      try {
        this.ws.removeAllListeners();
        this.ws.close();
      } catch (e) {
        console.error('Error closing WebSocket:', e);
      }
      this.ws = null;
    }
    
    this.subscribers.clear();
    this.contractData.clear();
    this.stockData.clear();
    
    if (this.db) {
      this.db.close();
    }
    
    console.log('✅ Shutdown complete');
  }
}

// 🌍 Export singleton instance
export const optionsStream = new OptionsStreamManager();

// Auto-initialize on import
optionsStream.initialize().catch(err => {
  console.error('❌ Failed to auto-initialize stream:', err);
});
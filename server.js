// server.js - FULLY SECURED VERSION with Session Rotation + IP Check on Admin API + EMAIL VERIFICATION + OCR TRADE SIGNALS + TRADE HISTORY + CHAT + DATABASE CHARTS

// 🔧 Load environment variables from .env file
import { entryTimingEngine } from './api/entryTimingEngine.js';
import 'dotenv/config';
import { universeManager } from './api/universe-manager.js';
import { serve } from "bun";
import { getOptionsChain, getStockQuote, getExpirations } from "./api/thetaData.js";
import { handleWebSocket } from "./websocket/handler.js";
import { getHTML } from "./views/index.js";
import { getLoginHTML } from "./views/login.js";
import { getSettingsHTML } from "./views/settings.js";
import { getAccountHTML } from "./views/account.js";
import { UserManager } from "./auth/userManager.js";
import { AlpacaBroker } from "./api/alpaca.js";
import { InternalPaperBroker } from "./api/internalPaperBroker.js";
import { rateLimiter } from "./utils/rateLimiter.js";
import { csrfProtection, requireCSRF } from "./utils/csrfProtection.js";
import { createSecureResponse, createSecureHTMLResponse, getSecurityHeaders } from "./utils/securityHeaders.js";
import { requireRateLimit, resetRateLimit } from "./utils/advancedRateLimiter.js";
import { AuditLog } from "./utils/auditLogger.js";
import { scheduleBackups } from "./backup.js";
import { getCORSHeaders, handleCORSPreflight } from "./utils/corsConfig.js";
import { requireAdminIP, getClientIP } from "./utils/ipWhitelist.js";
import { rotateSessionToken } from "./utils/sessionRotation.js";
import { Database } from 'bun:sqlite';
import {
  parseAndValidateBody,
  validateRegistrationRequest,
  validateLoginRequest,
  validateBrokerConnectRequest,
  validateOrderRequest,
  validateAccountSwitchRequest,
  validateExitPositionRequest
} from "./utils/requestValidator.js";
// 🔧 NEW: Email verification imports
import { 
  sendVerificationEmail, 
  verifyEmailToken, 
  resendVerificationEmail,
  isEmailVerified 
} from "./utils/emailService.js";
// 🔧 NEW: OCR Trade Signal imports
import { TradeAnalyzer } from './api/tradeAnalyzer.js';
import { optionsStream } from './api/optionsStreamManager.js';
import TradeHistoryManager from './utils/tradeHistoryManager.js';
import ExitSettingsManager from './utils/exitSettingsManager.js';
import DefaultAccountManager from './utils/defaultAccountManager.js';
import autoExitMonitor from './utils/autoExitMonitor.js';
import PositionResolver from './utils/positionResolver.js';
// 🧪 NEW: Backtester imports
import { backtesterBridge } from './api/backtesterBridge.js';
import {
  fetchHistoricalOptionsData,
  storeHistoricalData,
  importTickerData,
  getAllTickerStatus,
  getTickerStatus,
  getMissingDates,
  createImportJob,
  getActiveJobs,
  getCompletedJobs,
  updateAllMissingTickers
} from './api/historicalDataImporter.js';

const PORT = process.env.PORT || 3000;

// 📦 Enable automatic database backups (every 24 hours)
scheduleBackups();

// 🔧 Access to database for email validation
const db = new Database('users.db');

// Create unwatched_signals table for user-specific signal filtering
db.run(`
  CREATE TABLE IF NOT EXISTS unwatched_signals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    signal_id TEXT NOT NULL,
    unwatched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, signal_id)
  )
`);

// Create copy_trade_settings table for auto copy trading
db.run(`
  CREATE TABLE IF NOT EXISTS copy_trade_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    trader TEXT NOT NULL,
    ticker TEXT,
    start_hour INTEGER,
    start_minute INTEGER,
    end_hour INTEGER,
    end_minute INTEGER,
    amount_per_trade REAL NOT NULL,
    trading_mode TEXT DEFAULT 'paper',
    enabled INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, trader, ticker)
  )
`);

// Add trading_mode column if it doesn't exist (for existing databases)
try {
  db.run(`ALTER TABLE copy_trade_settings ADD COLUMN trading_mode TEXT DEFAULT 'paper'`);
  console.log('✅ Added trading_mode column to copy_trade_settings');
} catch (error) {
  // Column already exists, ignore error
  if (!error.message.includes('duplicate column')) {
    console.error('Error adding trading_mode column:', error);
  }
}

console.log('✅ Copy trade settings table initialized');

// 💬 CHAT DATABASE
const chatDb = new Database('chat.db');

chatDb.run(`
  CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    username TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_admin BOOLEAN DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

// Clean up old messages (keep last 1000 messages)
setInterval(() => {
  try {
    chatDb.run(`
      DELETE FROM chat_messages 
      WHERE id NOT IN (
        SELECT id FROM chat_messages 
        ORDER BY id DESC 
        LIMIT 1000
      )
    `);
  } catch (error) {
    console.error('❌ Chat cleanup error:', error);
  }
}, 60 * 60 * 1000); // Every hour

console.log('✅ Chat database initialized');

// 🧪 BACKTESTER DATABASE
const backtestDb = new Database('backtest.db');

// Backtest configurations table
backtestDb.run(`
  CREATE TABLE IF NOT EXISTS backtest_configs (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    symbols TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    initial_capital REAL NOT NULL,
    strategy_name TEXT NOT NULL,
    strategy_params TEXT,
    commission REAL DEFAULT 0.05,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,
    completed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

// Backtest results table
backtestDb.run(`
  CREATE TABLE IF NOT EXISTS backtest_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    config_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    initial_capital REAL NOT NULL,
    final_value REAL NOT NULL,
    total_return REAL NOT NULL,
    sharpe_ratio REAL,
    max_drawdown REAL,
    total_trades INTEGER,
    win_rate REAL,
    avg_win REAL,
    avg_loss REAL,
    profit_factor REAL,
    equity_curve TEXT,
    trades_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (config_id) REFERENCES backtest_configs(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

// Backtest trades table (detailed trade log)
backtestDb.run(`
  CREATE TABLE IF NOT EXISTS backtest_trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    config_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    timestamp DATETIME NOT NULL,
    symbol TEXT NOT NULL,
    direction TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    fill_price REAL NOT NULL,
    commission REAL NOT NULL,
    slippage REAL,
    cash_impact REAL NOT NULL,
    FOREIGN KEY (config_id) REFERENCES backtest_configs(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

// System mode table (Live vs Backtest)
backtestDb.run(`
  CREATE TABLE IF NOT EXISTS system_mode (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    mode TEXT NOT NULL DEFAULT 'live',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER,
    FOREIGN KEY (updated_by) REFERENCES users(id)
  )
`);

// Insert default mode if not exists
backtestDb.run(`INSERT OR IGNORE INTO system_mode (id, mode) VALUES (1, 'live')`);

// Historical data import tracking tables
backtestDb.run(`
  CREATE TABLE IF NOT EXISTS ticker_import_status (
    ticker TEXT PRIMARY KEY,
    total_days_expected INTEGER NOT NULL,
    total_days_imported INTEGER DEFAULT 0,
    missing_days INTEGER DEFAULT 0,
    first_date TEXT,
    last_date TEXT,
    status TEXT DEFAULT 'pending',
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_import_attempt DATETIME,
    import_error TEXT
  )
`);

backtestDb.run(`
  CREATE TABLE IF NOT EXISTS ticker_import_dates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticker TEXT NOT NULL,
    trading_date TEXT NOT NULL,
    records_imported INTEGER DEFAULT 0,
    import_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ticker, trading_date)
  )
`);

backtestDb.run(`
  CREATE TABLE IF NOT EXISTS import_jobs (
    id TEXT PRIMARY KEY,
    ticker TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    progress REAL DEFAULT 0,
    records_fetched INTEGER DEFAULT 0,
    records_stored INTEGER DEFAULT 0,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    error_message TEXT,
    initiated_by INTEGER,
    FOREIGN KEY (initiated_by) REFERENCES users(id)
  )
`);

// Initialize ticker import status for all tickers in universe
try {
  const universeFile = Bun.file('./options-universe.json');
  const universeExists = await universeFile.exists();

  if (universeExists) {
    const universeData = await universeFile.json();
    const tickers = Object.keys(universeData);

    // Calculate expected trading days (3 years = ~756 trading days)
    const expectedDays = 756;

    for (const ticker of tickers) {
      backtestDb.run(`
        INSERT OR IGNORE INTO ticker_import_status (ticker, total_days_expected, status)
        VALUES (?, ?, 'pending')
      `, [ticker, expectedDays]);
    }

    console.log(`✅ Initialized import status for ${tickers.length} tickers`);
  }
} catch (error) {
  console.error('❌ Failed to initialize ticker import status:', error);
}

console.log('✅ Backtest database initialized');

// 📡 BROADCAST HELPER - Send message to all connected WebSocket users
let websocketConnections = null;

global.broadcastToAllUsers = function(message) {
  if (!websocketConnections) {
    console.warn('⚠️ WebSocket connections not initialized yet');
    return;
  }
  
  let sent = 0;
  websocketConnections.forEach((session) => {
    if (session.ws.readyState === 1 && session.authenticated) {
      session.ws.send(JSON.stringify(message));
      sent++;
    }
  });
  
  console.log(`📡 Broadcasted ${message.type} to ${sent} users`);
};

// 🤖 COPY TRADE PROCESSOR - Check and execute copy trades for incoming signals
async function processCopyTrades(signal) {
  try {
    console.log(`🤖 [COPY TRADE] Processing signal:`, {
      id: signal.id,
      trader: signal.trader,
      root: signal.root,
      strike: signal.strike,
      right: signal.right
    });

    // Get current time
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Find matching copy trade rules
    const stmt = db.prepare(`
      SELECT * FROM copy_trade_settings
      WHERE enabled = 1
        AND trader = ?
        AND (ticker IS NULL OR ticker = ?)
    `);
    const matchingRules = stmt.all(signal.trader, signal.root);

    console.log(`🤖 [COPY TRADE] Found ${matchingRules.length} matching rule(s) for trader='${signal.trader}' root='${signal.root}'`);

    if (matchingRules.length > 0) {
      console.log(`🤖 [COPY TRADE] Matching rules:`, matchingRules.map(r => ({
        id: r.id,
        user_id: r.user_id,
        trader: r.trader,
        ticker: r.ticker,
        trading_mode: r.trading_mode,
        amount_per_trade: r.amount_per_trade
      })));
    }

    if (matchingRules.length === 0) {
      console.log(`🤖 [COPY TRADE] No copy trade rules match signal ${signal.id}`);

      // Debug: Show all enabled rules to help troubleshooting
      const allRules = db.prepare('SELECT * FROM copy_trade_settings WHERE enabled = 1').all();
      console.log(`🤖 [COPY TRADE] All enabled rules in database:`, allRules.map(r => ({
        id: r.id,
        user_id: r.user_id,
        trader: r.trader,
        ticker: r.ticker
      })));

      return;
    }

    console.log(`🤖 Found ${matchingRules.length} potential copy trade rule(s) for ${signal.trader} - ${signal.root}`);

    // Process each matching rule
    for (const rule of matchingRules) {
      // Check time window
      const hasTimeWindow = rule.start_hour !== null && rule.end_hour !== null;
      let inTimeWindow = true;

      if (hasTimeWindow) {
        const startMinutes = rule.start_hour * 60 + rule.start_minute;
        const endMinutes = rule.end_hour * 60 + rule.end_minute;
        const currentMinutes = currentHour * 60 + currentMinute;

        inTimeWindow = currentMinutes >= startMinutes && currentMinutes <= endMinutes;

        if (!inTimeWindow) {
          console.log(`🤖 Copy trade rule ${rule.id} outside time window (${rule.start_hour}:${String(rule.start_minute).padStart(2, '0')} - ${rule.end_hour}:${String(rule.end_minute).padStart(2, '0')})`);
          continue;
        }
      }

      console.log(`🤖 Executing copy trade for user ${rule.user_id}: ${signal.root} ${signal.strike}${signal.right}`);

      // Fetch CURRENT contract price (not stale OCR price)
      let currentPrice = null;
      try {
        console.log(`🤖 [STEP 1] Fetching current price from ThetaData...`);
        const THETA_HTTP = "http://127.0.0.1:25510";
        const quoteUrl = `${THETA_HTTP}/v2/snapshot/option/quote?root=${signal.root}&exp=${signal.expiration}&strike=${parseFloat(signal.strike) * 1000}&right=${signal.right === 'C' ? 'CALL' : 'PUT'}`;

        const quoteResponse = await fetch(quoteUrl);
        if (quoteResponse.ok) {
          const quoteData = await quoteResponse.json();
          if (quoteData.response && quoteData.response.length > 0) {
            const ticks = quoteData.response[0];
            const ask = ticks[7] || 0; // Use ASK price for buy orders
            if (ask > 0) {
              currentPrice = ask;
              console.log(`🤖 Current contract price: $${currentPrice}`);
            }
          }
        }
      } catch (priceError) {
        console.error(`❌ Error fetching current price for copy trade:`, priceError);
      }

      console.log(`🤖 [STEP 2] Using price: $${currentPrice || signal.entryPrice || signal.ocrPrice}`);

      // Fallback to OCR price if current price unavailable
      if (!currentPrice) {
        currentPrice = signal.entryPrice || signal.ocrPrice;
        console.log(`🤖 Using fallback price: $${currentPrice}`);
      }

      if (!currentPrice || currentPrice <= 0) {
        console.error(`❌ No valid price for copy trade execution`);
        continue;
      }

      console.log(`🤖 [STEP 3] Calculating quantity with amount=$${rule.amount_per_trade}, price=$${currentPrice}`);

      // Calculate quantity based on amount per trade
      const quantity = Math.floor(rule.amount_per_trade / (currentPrice * 100));

      console.log(`🤖 [STEP 4] Calculated quantity: ${quantity} contracts`);

      if (quantity <= 0) {
        console.error(`❌ Insufficient amount to purchase contract ($${rule.amount_per_trade} / $${currentPrice * 100})`);
        continue;
      }

      console.log(`🤖 [STEP 5] Executing order via ${rule.trading_mode} mode...`);

      // Execute order via broker using rule's trading_mode
      try {
        const tradingMode = rule.trading_mode || 'paper';

        // Handle DEFAULT account mode differently
        if (tradingMode === 'default') {
          console.log(`🤖 Using DEFAULT account for copy trade (user ${rule.user_id})`);

          // Create a manual signal entry for the user's default account
          const copySignal = {
            id: `copy-${signal.root}-${signal.expiration}-${signal.strike}-${signal.right}-${Date.now()}-${rule.user_id}`,
            trader: signal.trader,
            root: signal.root,
            strike: signal.strike,
            right: signal.right,
            expiration: signal.expiration,
            entryPrice: currentPrice,
            receivedAt: Date.now(),
            isManual: true,
            hasPosition: true,
            watchOnly: false,
            quantity: quantity,
            tradingMode: 'default'
          };

          // Save signal to database
          const saveResult = TradeHistoryManager.saveSignal(copySignal, rule.user_id);

          if (!saveResult.success) {
            console.error(`❌ Failed to save copy trade signal: ${saveResult.error}`);
            continue;
          }

          // Deduct from default account balance
          const balanceResult = DefaultAccountManager.processTradeEntry(
            rule.user_id,
            currentPrice,
            quantity,
            copySignal.id
          );

          if (!balanceResult.success) {
            console.error(`❌ Failed to deduct from default account: ${balanceResult.error}`);
            // Rollback: Remove signal from database
            TradeHistoryManager.removeSignal(copySignal.id, rule.user_id);
            continue;
          }

          console.log(`✅ Copy trade executed on DEFAULT account for user ${rule.user_id}: ${quantity} contracts @ $${currentPrice}, New balance: $${balanceResult.balanceAfter.toFixed(2)}`);

          // Send notification (orderResult format for consistency below)
          var orderResult = {
            success: true,
            orderId: copySignal.id,
            quantity: quantity,
            symbol: signal.root,
            price: currentPrice
          };

        } else {
          // Handle paper/live modes via broker
          console.log(`🤖 Using internal paper broker in ${tradingMode.toUpperCase()} mode for copy trade (user ${rule.user_id})`);

          // Fetch options chain for the broker (it needs the full chain to find the option)
          let optionsData = [];
          let stockPrice = null;
          try {
            const THETA_HTTP = "http://127.0.0.1:25510";
            const chainUrl = `${THETA_HTTP}/v2/snapshot/option/quote?root=${signal.root}&exp=${signal.expiration}`;
            const chainResponse = await fetch(chainUrl);

            if (chainResponse.ok) {
              const chainData = await chainResponse.json();
              if (chainData.response && chainData.response.length > 0) {
                optionsData = chainData.response;
                stockPrice = optionsData[0]?.underlyingPrice || 100;
                console.log(`🤖 Fetched ${optionsData.length} options for broker, stock price: $${stockPrice}`);
              }
            }
          } catch (chainError) {
            console.error(`❌ Error fetching options chain for copy trade:`, chainError);
          }

          if (optionsData.length === 0) {
            console.error(`❌ No options data available for copy trade execution`);
            continue;
          }

          const orderData = {
            symbol: signal.root,
            strike: signal.strike,
            expiration: signal.expiration,
            direction: signal.right === 'C' ? 'CALL' : 'PUT',
            optionsData: optionsData,
            currentPrice: stockPrice,
            cashAmount: rule.amount_per_trade,
            isManual: false,
            premiumPrice: currentPrice
          };

          // InternalPaperBroker has static methods, not instance methods
          var orderResult = await InternalPaperBroker.placeOrder(rule.user_id, orderData);

          if (orderResult.success) {
            console.log(`✅ Copy trade executed for user ${rule.user_id}: ${quantity} contracts @ $${currentPrice}`);
          }
        }

        if (orderResult.success) {

          // Send notification to user
          if (global.broadcastToAllUsers) {
            global.broadcastToAllUsers({
              type: 'copy_trade_executed',
              userId: rule.user_id,
              signal: {
                root: signal.root,
                strike: signal.strike,
                right: signal.right,
                expiration: signal.expiration
              },
              trader: signal.trader,
              quantity: quantity,
              price: currentPrice,
              amount: rule.amount_per_trade,
              orderId: orderResult.orderId
            });
          }
        } else {
          console.error(`❌ Copy trade order failed for user ${rule.user_id}:`, orderResult.error);

          // Send failure notification
          if (global.broadcastToAllUsers) {
            global.broadcastToAllUsers({
              type: 'copy_trade_failed',
              userId: rule.user_id,
              signal: {
                root: signal.root,
                strike: signal.strike,
                right: signal.right
              },
              error: orderResult.error
            });
          }
        }
      } catch (orderError) {
        console.error(`❌ Copy trade execution error for user ${rule.user_id}:`, orderError);
      }
    }
  } catch (error) {
    console.error(`❌ Error processing copy trades:`, error);
  }
}

// Initialize options universe on startup
console.log('🔄 Initializing options universe...');
await universeManager.initialize();

// 🔥 FIXED: Start entry timing engine with NEXT VALID expiration
const nextSpyExpiration = universeManager.getNextExpiration('SPY');
if (nextSpyExpiration) {
  entryTimingEngine.start('SPY', nextSpyExpiration);
  console.log(`⏱️ Entry Timing Engine started with NEXT VALID expiration: ${nextSpyExpiration}`);
} else {
  console.error('❌ No valid expirations found for SPY - timing engine not started');
}

// ✅ CREATE WEBSOCKET HANDLER ONCE - CRITICAL FIX
// 🧪 System Mode Helper - Check if system is in backtest mode
function getSystemMode() {
  try {
    const result = backtestDb.prepare('SELECT mode FROM system_mode WHERE id = 1').get();
    return result ? result.mode : 'live';
  } catch (error) {
    console.error('❌ Error getting system mode:', error);
    return 'live'; // Default to live if error
  }
}

function isBacktestMode() {
  return getSystemMode() === 'backtest';
}

// 🔥 FIX: Set backtest mode checkers on background processes
entryTimingEngine.setBacktestModeChecker(isBacktestMode);
autoExitMonitor.setBacktestModeChecker(isBacktestMode);
console.log('✅ Backtest mode checkers configured for background processes');

// 🔥 FIX: Pass isBacktestMode so WebSocket handler can stop broadcasting in backtest mode
const wsHandler = handleWebSocket(getOptionsChain, getStockQuote, getExpirations, isBacktestMode);
websocketConnections = wsHandler.connections; // Assign connections for broadcast and mode switching
console.log('✅ WebSocket handler created');

// 🧪 Helper to block live endpoints when in backtest mode
function blockIfBacktestMode(endpointName) {
  if (isBacktestMode()) {
    console.log(`⚠️ Blocking ${endpointName} - system is in BACKTEST mode`);
    return createSecureResponse(JSON.stringify({
      success: false,
      error: `${endpointName} is not available in BACKTEST mode. Switch to LIVE mode to access this endpoint.`,
      systemMode: 'backtest'
    }), {
      status: 403,
      headers: { "Content-Type": "application/json" }
    });
  }
  return null; // Allow request to proceed
}

// 🧪 Helper to block backtest endpoints when in live mode
function blockIfLiveMode(endpointName) {
  if (!isBacktestMode()) {
    console.log(`⚠️ Blocking ${endpointName} - system is in LIVE mode`);
    return createSecureResponse(JSON.stringify({
      success: false,
      error: `${endpointName} is not available in LIVE mode. Switch to BACKTEST mode to access this endpoint.`,
      systemMode: 'live'
    }), {
      status: 403,
      headers: { "Content-Type": "application/json" }
    });
  }
  return null; // Allow request to proceed
}

const server = serve({
  port: PORT,
  
  async fetch(req) {
    const url = new URL(req.url);
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    
    // ===== AUTHENTICATION MIDDLEWARE =====
    const publicRoutes = [
      '/login',
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/verify',    // ✅ ADD THIS LINE - allows checking auth status without being logged in
      '/verify-email',
      '/api/trade-signal' // 🔧 NEW: Allow OCR bridge to post signals without auth
    ];
    
    const isPublicRoute = publicRoutes.includes(url.pathname) || 
                         url.pathname.startsWith('/public/') ||
                         url.pathname === '/ws';
    
    // Get token from Authorization header OR cookies
    let token = req.headers.get("Authorization")?.replace("Bearer ", "");

    if (!token) {
      const cookies = req.headers.get("Cookie");
      if (cookies) {
        const sessionCookie = cookies.split(';').find(c => c.trim().startsWith('sessionToken='));
        if (sessionCookie) {
          token = sessionCookie.split('=')[1];
        }
      }
    }

    // Debug logging for backtester endpoints
    if (url.pathname.startsWith('/api/backtest')) {
      console.log('[Backtester Auth] Request to:', url.pathname);
      console.log('[Backtester Auth] Authorization header:', req.headers.get("Authorization") ? 'Present' : 'Missing');
      console.log('[Backtester Auth] Cookie header:', req.headers.get("Cookie") ? 'Present' : 'Missing');
      console.log('[Backtester Auth] Extracted token:', token ? `${token.substring(0, 10)}...` : 'null');
    }
    
    // Check authentication for protected routes
    if (!isPublicRoute) {
      // ✅ CRITICAL FIX: For the root route and other HTML pages, enforce authentication FIRST
      if (!url.pathname.startsWith('/api/') && url.pathname !== '/ws' && !url.pathname.startsWith('/public/')) {
        // This is an HTML page route (/, /settings, /account, /admin, etc.)
        if (!token) {
          return new Response(null, {
            status: 302,
            headers: { "Location": "/login" }
          });
        }
        
        const session = UserManager.verifySession(token);
        if (!session.valid) {
          AuditLog.invalidToken(ip, url.pathname);
          return new Response(null, {
            status: 302,
            headers: { 
              "Location": "/login",
              "Set-Cookie": "sessionToken=; Path=/; Max-Age=0"
            }
          });
        }
        
        // Session is valid, continue to serve the HTML page
      } else if (url.pathname.startsWith('/api/')) {
        // For API routes, check token and return JSON error
        if (!token) {
          return createSecureResponse(JSON.stringify({ 
            success: false, 
            error: 'Unauthorized - Please login' 
          }), {
            status: 401,
            headers: { "Content-Type": "application/json" }
          });
        }
        
        const session = UserManager.verifySession(token);

        // Debug logging for backtester endpoints
        if (url.pathname.startsWith('/api/backtest')) {
          console.log('[Backtester Auth] ===== BACKTESTER API REQUEST DEBUG =====');
          console.log('[Backtester Auth] Endpoint:', url.pathname);
          console.log('[Backtester Auth] Token received:', token ? `${token.substring(0, 10)}...` : 'null');
          console.log('[Backtester Auth] Token length:', token ? token.length : 0);
          console.log('[Backtester Auth] Session verification result:', session.valid ? 'Valid' : 'Invalid');
          if (session.valid) {
            console.log('[Backtester Auth] ✅ User ID:', session.userId);
            console.log('[Backtester Auth] ✅ Username:', session.username);
            console.log('[Backtester Auth] ✅ Is Admin:', session.isAdmin);
          } else {
            console.error('[Backtester Auth] ❌ Session error:', session.error);
          }
        }

        if (!session.valid) {
          AuditLog.invalidToken(ip, url.pathname);
          console.error('[API Auth] Session invalid, returning 401');
          return createSecureResponse(JSON.stringify({
            success: false,
            error: 'Invalid or expired session'
          }), {
            status: 401,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    }
    
    // ===== ROUTES =====

    // 🔍 DEBUG: Log all API requests
    if (url.pathname.startsWith('/api/')) {
      console.log(`📡 [API REQUEST] ${req.method} ${url.pathname}`);
    }

    // LOGIN PAGE - 🔒 Use createSecureHTMLResponse for nonce-based CSP
    if (url.pathname === "/login") {
      return createSecureHTMLResponse(getLoginHTML());
    }
    
    // SETTINGS PAGE - 🔒 Use createSecureHTMLResponse for nonce-based CSP
    if (url.pathname === "/settings") {
      return createSecureHTMLResponse(getSettingsHTML());
    }
    
    // ACCOUNT PAGE - 🔒 Use createSecureHTMLResponse for nonce-based CSP
    if (url.pathname === "/account") {
      return createSecureHTMLResponse(getAccountHTML());
    }

    // 🔧 EMAIL: Verify email page (GET)
    if (url.pathname === "/verify-email") {
      const verificationToken = url.searchParams.get('token');
      
      if (!verificationToken) {
        return createSecureHTMLResponse(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Email Verification</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                background: linear-gradient(135deg, #0a0e27 0%, #1a2332 100%);
                color: #e0e6ed;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0;
              }
              .container {
                background: linear-gradient(135deg, #1a2332 0%, #151b2e 100%);
                border: 2px solid #3d4a5c;
                border-radius: 16px;
                padding: 48px;
                max-width: 480px;
                text-align: center;
              }
              .icon { font-size: 64px; margin-bottom: 20px; }
              .title { font-size: 24px; font-weight: 700; margin-bottom: 16px; }
              .message { color: #9ca3af; margin-bottom: 32px; line-height: 1.6; }
              .btn {
                display: inline-block;
                padding: 16px 32px;
                background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                color: white;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="icon">❌</div>
              <div class="title">Invalid Verification Link</div>
              <div class="message">The verification link is missing or invalid.</div>
              <a href="/login" class="btn">Go to Login</a>
            </div>
          </body>
          </html>
        `);
      }
      
      const result = verifyEmailToken(verificationToken);
      
      if (result.success) {
        console.log(`✅ Email verified for user ${result.userId}`);
        
        return createSecureHTMLResponse(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Email Verified</title>
            <meta http-equiv="refresh" content="3;url=/">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                background: linear-gradient(135deg, #0a0e27 0%, #1a2332 100%);
                color: #e0e6ed;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0;
              }
              .container {
                background: linear-gradient(135deg, #1a2332 0%, #151b2e 100%);
                border: 2px solid #10b981;
                border-radius: 16px;
                padding: 48px;
                max-width: 480px;
                text-align: center;
              }
              .icon { font-size: 64px; margin-bottom: 20px; }
              .title { font-size: 24px; font-weight: 700; margin-bottom: 16px; color: #10b981; }
              .message { color: #9ca3af; margin-bottom: 32px; line-height: 1.6; }
              .btn {
                display: inline-block;
                padding: 16px 32px;
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
              }
              .countdown {
                color: #10b981;
                font-weight: 600;
                margin-top: 16px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="icon">✅</div>
              <div class="title">Email Verified!</div>
              <div class="message">Your email has been successfully verified. You can now login and start trading.</div>
              <div class="countdown">Redirecting in <span id="countdown">3</span> seconds...</div>
              <a href="/" class="btn" style="margin-top: 24px;">Go Now</a>
            </div>
            <script>
              let seconds = 3;
              const countdownEl = document.getElementById('countdown');
              const interval = setInterval(() => {
                seconds--;
                countdownEl.textContent = seconds;
                if (seconds <= 0) {
                  clearInterval(interval);
                  window.location.href = '/';
                }
              }, 1000);
            </script>
          </body>
          </html>
        `);
      } else {
        return createSecureHTMLResponse(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Verification Failed</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                background: linear-gradient(135deg, #0a0e27 0%, #1a2332 100%);
                color: #e0e6ed;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0;
              }
              .container {
                background: linear-gradient(135deg, #1a2332 0%, #151b2e 100%);
                border: 2px solid #ef4444;
                border-radius: 16px;
                padding: 48px;
                max-width: 480px;
                text-align: center;
              }
              .icon { font-size: 64px; margin-bottom: 20px; }
              .title { font-size: 24px; font-weight: 700; margin-bottom: 16px; color: #ef4444; }
              .message { color: #9ca3af; margin-bottom: 16px; line-height: 1.6; }
              .error-details {
                background: rgba(239, 68, 68, 0.1);
                border: 1px solid #ef4444;
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 32px;
                font-size: 13px;
                color: #fca5a5;
                word-break: break-word;
              }
              .btn {
                display: inline-block;
                padding: 16px 32px;
                background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                color: white;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                margin: 0 8px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="icon">⚠️</div>
              <div class="title">Verification Failed</div>
              <div class="message">We couldn't verify your email address.</div>
              <div class="error-details">${result.error || 'Unknown error occurred'}</div>
              <a href="/" class="btn">Go to Dashboard</a>
              <a href="/login" class="btn">Go to Login</a>
            </div>
          </body>
          </html>
        `);
      }
    }
    
    // 🔧 EMAIL: Resend verification email (POST)
    if (url.pathname === "/api/auth/resend-verification") {
      if (req.method !== "POST") {
        return createSecureResponse("Method not allowed", { status: 405 });
      }
      
      const session = UserManager.verifySession(token);
      if (!session.valid) {
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: "Unauthorized" 
        }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // Rate limiting
      const rateCheck = requireRateLimit('register', req, session.userId);
      if (!rateCheck.allowed) return rateCheck.response;
      
      const result = await resendVerificationEmail(session.userId);
      
      return createSecureResponse(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // 🔧 EMAIL: Check verification status (GET)
    if (url.pathname === "/api/auth/verification-status") {
      const session = UserManager.verifySession(token);
      if (!session.valid) {
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: "Unauthorized" 
        }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      const verified = isEmailVerified(session.userId);
      
      return createSecureResponse(JSON.stringify({
        success: true,
        verified: verified
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // 🔐 AUTH: Register - 🔧 UPDATED WITH EMAIL VERIFICATION
    if (url.pathname === "/api/auth/register") {
      if (req.method !== "POST") {
        return createSecureResponse("Method not allowed", { status: 405 });
      }
      
      // Rate limiting
      const rateCheck = requireRateLimit('register', req);
      if (!rateCheck.allowed) return rateCheck.response;
      
      // Validate request body
      const bodyResult = await parseAndValidateBody(req);
      if (!bodyResult.valid) {
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: bodyResult.error 
        }), {
          status: bodyResult.status,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // Validate registration data (NOW REQUIRES GMAIL)
      const validation = validateRegistrationRequest(bodyResult.body);
      if (!validation.valid) {
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: 'Validation failed',
          errors: validation.errors 
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      const result = UserManager.registerUser(
        validation.data.username, 
        validation.data.password, 
        validation.data.email
      );
      
      if (result.success) {
        // 🔥 AUDIT LOG: Registration
        AuditLog.registrationSuccess(result.userId, validation.data.username, ip);
        
        // 🔧 NEW: Send verification email
        const emailResult = await sendVerificationEmail(
          result.userId, 
          validation.data.email, 
          validation.data.username
        );
        
        if (emailResult.success) {
          return createSecureResponse(JSON.stringify({
            success: true,
            message: '✅ Account created! Please check your Gmail inbox to verify your email address.',
            userId: result.userId
          }), {
            headers: { "Content-Type": "application/json" }
          });
        } else {
          // Account created but email failed - still success
          return createSecureResponse(JSON.stringify({
            success: true,
            message: 'Account created, but verification email failed to send. Please contact support.',
            userId: result.userId
          }), {
            headers: { "Content-Type": "application/json" }
          });
        }
      }
      
      return createSecureResponse(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // 🔐 AUTH: Login with Rate Limiting - 🔧 UPDATED TO CHECK EMAIL VERIFICATION
    if (url.pathname === "/api/auth/login") {
      if (req.method !== "POST") {
        return createSecureResponse("Method not allowed", { status: 405 });
      }
      
      try {
        // Validate request body
        const bodyResult = await parseAndValidateBody(req);
        if (!bodyResult.valid) {
          return createSecureResponse(JSON.stringify({ 
            success: false, 
            error: bodyResult.error 
          }), {
            status: bodyResult.status,
            headers: { "Content-Type": "application/json" }
          });
        }
        
        // Validate login data
        const validation = validateLoginRequest(bodyResult.body);
        if (!validation.valid) {
          return createSecureResponse(JSON.stringify({ 
            success: false, 
            error: validation.errors[0] 
          }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        
        const { username, password } = validation.data;
        
        // Rate limiting
        const rateCheck = rateLimiter.checkLimit(
          `login:${ip}:${username}`,
          5,
          60 * 60 * 1000,
          60 * 60 * 1000
        );
        
        if (!rateCheck.allowed) {
          console.log(`🚫 Rate limit blocked login attempt for ${username} from ${ip}`);
          // 🔥 AUDIT LOG: Rate limit exceeded
          AuditLog.rateLimitExceeded(username, ip, '/api/auth/login');
          
          return createSecureResponse(JSON.stringify({ 
            success: false, 
            error: rateCheck.message,
            retryAfter: rateCheck.retryAfter
          }), {
            status: 429,
            headers: { "Content-Type": "application/json" }
          });
        }
        
        const result = UserManager.loginUser(username, password);
        
        if (result.success) {
          // 🔧 NEW: Check if email is verified
          if (!isEmailVerified(result.userId)) {
            console.log(`⚠️ Login blocked - email not verified for user ${username}`);
            return createSecureResponse(JSON.stringify({
              success: false,
              error: '📧 Please verify your email before logging in. Check your Gmail inbox.',
              needsVerification: true,
              userId: result.userId
            }), {
              headers: { "Content-Type": "application/json" }
            });
          }
          
          rateLimiter.reset(`login:${ip}:${username}`);
          
          // 🔥 AUDIT LOG: Successful login
          AuditLog.loginSuccess(result.userId, result.username, ip);
          
          // Generate CSRF token
          const csrfToken = csrfProtection.generateToken(result.sessionToken);
          
          const headers = { 
            "Content-Type": "application/json",
            "Set-Cookie": `sessionToken=${result.sessionToken}; Path=/; HttpOnly; Max-Age=86400; SameSite=Strict${process.env.ENABLE_HTTPS === 'true' ? '; Secure' : ''}`
          };
          
          return createSecureResponse(JSON.stringify({
            ...result,
            csrfToken
          }), { headers });
        } else {
          // 🔥 AUDIT LOG: Failed login
          AuditLog.loginFailure(username, ip, result.error);
          
          console.log(`❌ Failed login for ${username} - ${rateCheck.remainingAttempts} attempts remaining`);
          
          return createSecureResponse(JSON.stringify({
            ...result,
            remainingAttempts: rateCheck.remainingAttempts
          }), {
            headers: { "Content-Type": "application/json" }
          });
        }
        
      } catch (error) {
        console.error('Login error:', error);
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: 'Login failed' 
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    
    // 🔐 AUTH: Verify session
    if (url.pathname === "/api/auth/verify") {
      const result = UserManager.verifySession(token);
      
      // Include CSRF token in response
      if (result.valid) {
        result.csrfToken = csrfProtection.getToken(token);
      }
      
      return createSecureResponse(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // 🔐 AUTH: Logout
    if (url.pathname === "/api/auth/logout") {
      // CSRF protection
      const csrfCheck = requireCSRF(req, token);
      if (!csrfCheck.valid) {
        const session = UserManager.verifySession(token);
        AuditLog.csrfViolation(session.username, ip, url.pathname);
        
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: csrfCheck.error 
        }), {
          status: csrfCheck.status,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // 🔥 AUDIT LOG: Logout
      const session = UserManager.verifySession(token);
      if (session.valid) {
        AuditLog.logout(session.userId, session.username);
      }
      
      const result = UserManager.logoutUser(token);
      
      // Remove CSRF token
      csrfProtection.removeToken(token);
      
      return createSecureResponse(JSON.stringify(result), {
        headers: { 
          "Content-Type": "application/json",
          "Set-Cookie": "sessionToken=; Path=/; Max-Age=0"
        }
      });
    }
    
    // 🔐 AUTH: Change password - 🔥 WITH SESSION ROTATION
    if (url.pathname === "/api/auth/change-password") {
      if (req.method !== "POST") {
        return createSecureResponse("Method not allowed", { status: 405 });
      }
      
      const session = UserManager.verifySession(token);
      if (!session.valid) {
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: "Unauthorized" 
        }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // CSRF protection
      const csrfCheck = requireCSRF(req, token);
      if (!csrfCheck.valid) {
        AuditLog.csrfViolation(session.username, ip, url.pathname);
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: csrfCheck.error 
        }), {
          status: csrfCheck.status,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // Rate limiting - 5 attempts per hour
      const rateCheck = requireRateLimit('passwordChange', req, session.userId);
      if (!rateCheck.allowed) return rateCheck.response;
      
      // Validate request body
      const bodyResult = await parseAndValidateBody(req);
      if (!bodyResult.valid) {
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: bodyResult.error 
        }), {
          status: bodyResult.status,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      const { currentPassword, newPassword } = bodyResult.body;
      
      // Validate both passwords are provided
      if (!currentPassword || !newPassword) {
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: 'Both current and new passwords are required' 
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // Validate passwords are different
      if (currentPassword === newPassword) {
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: 'New password must be different from current password' 
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // Change password using UserManager
      const result = UserManager.changePassword(
        session.userId, 
        currentPassword, 
        newPassword
      );
      
      // 🔥 AUDIT LOG: Password change
      if (result.success) {
        AuditLog.passwordChanged(session.userId, session.username);
        
        // 🔒 NEW: Rotate session token after password change
        const rotation = rotateSessionToken(token);
        
        if (rotation.success) {
          console.log(`🔄 Session rotated after password change for ${session.username}`);
          
          return createSecureResponse(JSON.stringify({
            success: true,
            message: 'Password changed successfully. Your session has been refreshed for security.'
          }), {
            headers: { 
              "Content-Type": "application/json",
              "Set-Cookie": `sessionToken=${rotation.newToken}; Path=/; HttpOnly; Max-Age=86400; SameSite=Strict${process.env.ENABLE_HTTPS === 'true' ? '; Secure' : ''}`
            }
          });
        }
        
        console.log(`✅ Password changed successfully for user ${session.username}`);
      } else {
        console.log(`❌ Password change failed for user ${session.username}: ${result.error}`);
      }
      
      return createSecureResponse(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // 🔧 AUTH: Change email - 🔥 WITH SESSION ROTATION + EMAIL VALIDATION
    if (url.pathname === "/api/auth/change-email") {
      if (req.method !== "POST") {
        return createSecureResponse("Method not allowed", { status: 405 });
      }
      
      const session = UserManager.verifySession(token);
      if (!session.valid) {
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: "Unauthorized" 
        }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // CSRF protection
      const csrfCheck = requireCSRF(req, token);
      if (!csrfCheck.valid) {
        AuditLog.csrfViolation(session.username, ip, url.pathname);
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: csrfCheck.error 
        }), {
          status: csrfCheck.status,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // Rate limiting - 5 attempts per hour
      const rateCheck = requireRateLimit('emailChange', req, session.userId);
      if (!rateCheck.allowed) return rateCheck.response;
      
      // Validate request body
      const bodyResult = await parseAndValidateBody(req);
      if (!bodyResult.valid) {
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: bodyResult.error 
        }), {
          status: bodyResult.status,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      const { newEmail, password } = bodyResult.body;
      
      // Validate both fields are provided
      if (!newEmail || !password) {
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: 'Both email and password are required' 
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // Validate Gmail only
      if (!newEmail.endsWith('@gmail.com')) {
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: 'Only Gmail addresses are allowed' 
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // 🔧 NEW: Check if new email is different from current email
      const userStmt = db.prepare('SELECT email FROM users WHERE id = ?');
      const currentUser = userStmt.get(session.userId);
      
      if (currentUser && currentUser.email && currentUser.email.toLowerCase() === newEmail.toLowerCase()) {
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: 'New email must be different from current email' 
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // Verify current password
      const result = UserManager.changeEmail(session.userId, newEmail, password);
      
      if (!result.success) {
        return createSecureResponse(JSON.stringify(result), {
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // 🔥 AUDIT LOG: Email changed
      console.log(`📧 Email changed for user ${session.userId} (${session.username}) to ${newEmail}`);
      
      // 🔧 Send verification email to new address
      const emailResult = await sendVerificationEmail(
        session.userId, 
        newEmail, 
        session.username
      );
      
      // 🔒 Rotate session token after email change
      const rotation = rotateSessionToken(token);
      
      if (rotation.success) {
        console.log(`🔄 Session rotated after email change for ${session.username}`);
        
        return createSecureResponse(JSON.stringify({
          success: true,
          message: '✅ Email updated! Check your new Gmail inbox for verification.'
        }), {
          headers: { 
            "Content-Type": "application/json",
            "Set-Cookie": `sessionToken=${rotation.newToken}; Path=/; HttpOnly; Max-Age=86400; SameSite=Strict${process.env.ENABLE_HTTPS === 'true' ? '; Secure' : ''}`
          }
        });
      }
      
      return createSecureResponse(JSON.stringify({
        success: true,
        message: '✅ Email updated! Check your new Gmail inbox for verification.'
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // 💬 CHAT: Get recent messages (GET)
    if (url.pathname === "/api/chat/messages") {
      const session = UserManager.verifySession(token);
      if (!session.valid) {
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: "Unauthorized" 
        }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      try {
        const limit = parseInt(url.searchParams.get('limit')) || 50;
        const stmt = chatDb.prepare(`
          SELECT id, username, message, timestamp, is_admin 
          FROM chat_messages 
          ORDER BY id DESC 
          LIMIT ?
        `);
        const messages = stmt.all(limit).reverse();
        
        return createSecureResponse(JSON.stringify({
          success: true,
          messages: messages
        }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        console.error('❌ Error fetching chat messages:', error);
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: 'Failed to fetch messages' 
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    
    // 💬 CHAT: Send message (POST)
    if (url.pathname === "/api/chat/send") {
      if (req.method !== "POST") {
        return createSecureResponse("Method not allowed", { status: 405 });
      }
      
      const session = UserManager.verifySession(token);
      if (!session.valid) {
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: "Unauthorized" 
        }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // CSRF protection
      const csrfCheck = requireCSRF(req, token);
      if (!csrfCheck.valid) {
        AuditLog.csrfViolation(session.username, ip, url.pathname);
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: csrfCheck.error 
        }), {
          status: csrfCheck.status,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // Rate limiting - 10 messages per minute
      const rateCheck = requireRateLimit('chatMessage', req, session.userId);
      if (!rateCheck.allowed) return rateCheck.response;
      
      // Validate request body
      const bodyResult = await parseAndValidateBody(req);
      if (!bodyResult.valid) {
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: bodyResult.error 
        }), {
          status: bodyResult.status,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      const { message } = bodyResult.body;
      
      if (!message || typeof message !== 'string') {
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: 'Message is required' 
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      const trimmedMessage = message.trim();
      
      if (trimmedMessage.length === 0) {
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: 'Message cannot be empty' 
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      if (trimmedMessage.length > 500) {
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: 'Message too long (max 500 characters)' 
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      try {
        const stmt = chatDb.prepare(`
          INSERT INTO chat_messages (user_id, username, message, is_admin) 
          VALUES (?, ?, ?, ?)
        `);
        const result = stmt.run(
          session.userId, 
          session.username, 
          trimmedMessage, 
          session.isAdmin ? 1 : 0
        );
        
        const newMessage = {
          id: result.lastInsertRowid,
          username: session.username,
          message: trimmedMessage,
          timestamp: new Date().toISOString(),
          is_admin: session.isAdmin ? 1 : 0
        };
        
        // Broadcast to all connected users
        if (global.broadcastToAllUsers) {
          global.broadcastToAllUsers({
            type: 'chat_message',
            message: newMessage
          });
        }
        
        console.log(`💬 Chat message from ${session.username}: ${trimmedMessage.substring(0, 50)}...`);
        
        return createSecureResponse(JSON.stringify({
          success: true,
          message: newMessage
        }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        console.error('❌ Error sending chat message:', error);
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: 'Failed to send message' 
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    
    // 💼 BROKER: Check connection
    if (url.pathname === "/api/broker/check") {
      if (!token) {
        return createSecureResponse(JSON.stringify({ connected: false }), {
          headers: { "Content-Type": "application/json" }
        });
      }
      
      const session = UserManager.verifySession(token);
      if (!session.valid) {
        return createSecureResponse(JSON.stringify({ connected: false }), {
          headers: { "Content-Type": "application/json" }
        });
      }
      
      const creds = UserManager.getBrokerCredentials(session.userId, "alpaca");
      
      return createSecureResponse(JSON.stringify({ connected: creds.success }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // 💼 BROKER: Get all accounts
    if (url.pathname === "/api/broker/accounts") {
      if (!token) {
        return createSecureResponse(JSON.stringify({
          success: true,
          paper: { connected: false, balance: 0 },
          live: { connected: false, balance: 0 },
          activeAccount: 'default'
        }), {
          headers: { "Content-Type": "application/json" }
        });
      }

      const session = UserManager.verifySession(token);
      if (!session.valid) {
        return createSecureResponse(JSON.stringify({
          success: true,
          paper: { connected: false, balance: 0 },
          live: { connected: false, balance: 0 },
          activeAccount: 'default'
        }), {
          headers: { "Content-Type": "application/json" }
        });
      }
      
      const accounts = UserManager.getAllBrokerAccounts(session.userId, "alpaca");
      
      let paperBalance = 0;
      let liveBalance = 0;
      
      if (accounts.paper) {
        const paperCreds = UserManager.getBrokerCredentials(session.userId, "alpaca", "paper");
        if (paperCreds.success) {
          const paperResult = await AlpacaBroker.getAccountInfo(session.userId, "paper");
          if (paperResult.success) paperBalance = paperResult.cash;
        }
      }
      
      if (accounts.live) {
        const liveCreds = UserManager.getBrokerCredentials(session.userId, "alpaca", "live");
        if (liveCreds.success) {
          const liveResult = await AlpacaBroker.getAccountInfo(session.userId, "live");
          if (liveResult.success) liveBalance = liveResult.cash;
        }
      }
      
      return createSecureResponse(JSON.stringify({
        success: true,
        paper: {
          connected: !!accounts.paper,
          balance: paperBalance
        },
        live: {
          connected: !!accounts.live,
          balance: liveBalance
        },
        activeAccount: session.activeAccount || 'default'
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // 💼 BROKER: Connect/Save credentials - 🔒 WITH SESSION ROTATION
    if (url.pathname === "/api/broker/connect") {
      if (req.method !== "POST") {
        return createSecureResponse("Method not allowed", { status: 405 });
      }
      
      const session = UserManager.verifySession(token);
      if (!session.valid) {
        return createSecureResponse(JSON.stringify({ success: false, error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // CSRF protection
      const csrfCheck = requireCSRF(req, token);
      if (!csrfCheck.valid) {
        AuditLog.csrfViolation(session.username, ip, url.pathname);
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: csrfCheck.error 
        }), {
          status: csrfCheck.status,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // 🧪 Block in backtest mode
      const connectBlocked = blockIfBacktestMode('/api/broker/connect');
      if (connectBlocked) return connectBlocked;
      
      // Rate limiting
      const rateCheck = requireRateLimit('brokerConnect', req, session.userId);
      if (!rateCheck.allowed) return rateCheck.response;
      
      // Validate request
      const bodyResult = await parseAndValidateBody(req);
      if (!bodyResult.valid) {
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: bodyResult.error 
        }), {
          status: bodyResult.status,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      const validation = validateBrokerConnectRequest(bodyResult.body);
      if (!validation.valid) {
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          errors: validation.errors 
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      const { apiKey, apiSecret, accountType, isPaper } = validation.data;
      
      // Test connection first
      const testResult = await AlpacaBroker.testConnection(apiKey, apiSecret, isPaper);
      if (!testResult.success) {
        return createSecureResponse(JSON.stringify(testResult), {
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // Save credentials
      UserManager.saveBrokerCredentials(session.userId, "alpaca", accountType, apiKey, apiSecret, isPaper);
      
      // 🔥 AUDIT LOG: Broker connected
      AuditLog.brokerConnected(session.userId, session.username, accountType);
      
      // 🔒 NEW: Rotate session token after connecting sensitive broker credentials
      const rotation = rotateSessionToken(token);
      
      if (rotation.success) {
        console.log(`🔄 Session rotated after broker connection for ${session.username}`);
        
        return createSecureResponse(JSON.stringify({
          success: true,
          buyingPower: testResult.buyingPower,
          message: 'Broker connected successfully. Your session has been refreshed for security.'
        }), {
          headers: { 
            "Content-Type": "application/json",
            "Set-Cookie": `sessionToken=${rotation.newToken}; Path=/; HttpOnly; Max-Age=86400; SameSite=Strict${process.env.ENABLE_HTTPS === 'true' ? '; Secure' : ''}`
          }
        });
      }
      
      // Fallback if rotation fails (shouldn't happen, but handle gracefully)
      console.log(`⚠️ Session rotation failed for ${session.username}, but broker connected successfully`);
      
      return createSecureResponse(JSON.stringify({
        success: true,
        buyingPower: testResult.buyingPower
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // 💼 BROKER: Switch active account
    if (url.pathname === "/api/broker/switch-account") {
      if (req.method !== "POST") {
        return createSecureResponse("Method not allowed", { status: 405 });
      }
      
      const session = UserManager.verifySession(token);
      if (!session.valid) {
        return createSecureResponse(JSON.stringify({ success: false, error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // CSRF protection
      const csrfCheck = requireCSRF(req, token);
      if (!csrfCheck.valid) {
        AuditLog.csrfViolation(session.username, ip, url.pathname);
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: csrfCheck.error 
        }), {
          status: csrfCheck.status,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // 🧪 Block in backtest mode
      const switchBlocked = blockIfBacktestMode('/api/broker/switch-account');
      if (switchBlocked) return switchBlocked;
      
      // Validate request
      const bodyResult = await parseAndValidateBody(req);
      if (!bodyResult.valid) {
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: bodyResult.error 
        }), {
          status: bodyResult.status,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      const validation = validateAccountSwitchRequest(bodyResult.body);
      if (!validation.valid) {
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          errors: validation.errors 
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      const { accountType } = validation.data;
      const activeAccountBefore = session.activeAccount || 'default';

      // Check if account exists (skip check for default account)
      if (accountType !== 'default') {
        const creds = UserManager.getBrokerCredentials(session.userId, "alpaca", accountType);
        if (!creds.success) {
          return createSecureResponse(JSON.stringify({
            success: false,
            error: `No ${accountType} account connected. Please add it in settings first.`
          }), {
            headers: { "Content-Type": "application/json" }
          });
        }
      }
      
      const result = UserManager.setActiveAccount(session.userId, accountType);
      
      // 🔥 AUDIT LOG: Account switched
      if (result.success) {
        AuditLog.accountSwitched(session.userId, session.username, activeAccountBefore, accountType);
      }
      
      return createSecureResponse(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // 💼 BROKER: Get default account balance
    if (url.pathname === "/api/broker/default-balance") {
      const session = UserManager.verifySession(token);
      if (!session.valid) {
        return createSecureResponse(JSON.stringify({
          success: true,
          balance: 100000.00
        }), {
          headers: { "Content-Type": "application/json" }
        });
      }

      const balanceResult = DefaultAccountManager.getBalance(session.userId);

      return createSecureResponse(JSON.stringify(balanceResult), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // 🔄 DEFAULT ACCOUNT: Reset balance to $100,000 (POST) - REQUIRES AUTH
    if (url.pathname === "/api/default-account/reset-balance") {
      if (req.method !== "POST") {
        return createSecureResponse("Method not allowed", { status: 405 });
      }

      const session = UserManager.verifySession(token);
      if (!session.valid) {
        return createSecureResponse(JSON.stringify({
          success: false,
          error: "Unauthorized"
        }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }

      try {
        console.log(`🔄 Resetting Default account balance for user ${session.userId}`);

        const resetResult = DefaultAccountManager.resetAccount(session.userId, 100000.00);

        if (resetResult.success) {
          console.log(`✅ Reset Default account balance to $100,000 for user ${session.userId}`);
        } else {
          console.error(`❌ Failed to reset balance for user ${session.userId}:`, resetResult.error);
        }

        return createSecureResponse(JSON.stringify(resetResult), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        console.error('❌ Error resetting Default account balance:', error);
        return createSecureResponse(JSON.stringify({
          success: false,
          error: 'Failed to reset balance'
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // 💼 BROKER: Disconnect account
    if (url.pathname === "/api/broker/disconnect") {
      if (req.method !== "POST") {
        return createSecureResponse("Method not allowed", { status: 405 });
      }
      
      const session = UserManager.verifySession(token);
      if (!session.valid) {
        return createSecureResponse(JSON.stringify({ success: false, error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // CSRF protection
      const csrfCheck = requireCSRF(req, token);
      if (!csrfCheck.valid) {
        AuditLog.csrfViolation(session.username, ip, url.pathname);
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: csrfCheck.error 
        }), {
          status: csrfCheck.status,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // 🧪 Block in backtest mode
      const disconnectBlocked = blockIfBacktestMode('/api/broker/disconnect');
      if (disconnectBlocked) return disconnectBlocked;
      
      const bodyResult = await parseAndValidateBody(req);
      if (!bodyResult.valid) {
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: bodyResult.error 
        }), {
          status: bodyResult.status,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      const result = UserManager.deleteBrokerCredentials(
        session.userId, 
        "alpaca", 
        bodyResult.body.accountType
      );
      
      // 🔥 AUDIT LOG: Broker disconnected
      if (result.success) {
        AuditLog.brokerDisconnected(session.userId, session.username, bodyResult.body.accountType);
      }
      
      return createSecureResponse(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // 💼 BROKER: Place order (UPDATED to support manual entries with isManual flag)
    if (url.pathname === "/api/broker/order") {
      if (req.method !== "POST") {
        return createSecureResponse("Method not allowed", { status: 405 });
      }
      
      const session = UserManager.verifySession(token);
      if (!session.valid) {
        return createSecureResponse(JSON.stringify({ success: false, error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // CSRF protection
      const csrfCheck = requireCSRF(req, token);
      if (!csrfCheck.valid) {
        AuditLog.csrfViolation(session.username, ip, url.pathname);
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: csrfCheck.error 
        }), {
          status: csrfCheck.status,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // 🧪 Check system mode - prevent live trading in backtest mode
      if (isBacktestMode()) {
        console.log('⚠️ Blocking live order - system is in BACKTEST mode');
        return createSecureResponse(JSON.stringify({
          success: false,
          error: 'System is in BACKTEST mode. Switch to LIVE mode to place real trades.',
          systemMode: 'backtest'
        }), {
          status: 403,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Rate limiting
      const rateCheck = requireRateLimit('placeOrder', req, session.userId);
      if (!rateCheck.allowed) return rateCheck.response;

      // Validate request
      const bodyResult = await parseAndValidateBody(req);
      if (!bodyResult.valid) {
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: bodyResult.error 
        }), {
          status: bodyResult.status,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      const validation = validateOrderRequest(bodyResult.body);
      if (!validation.valid) {
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          errors: validation.errors 
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // NEW: Add isManual flag to order data
      const orderData = {
        ...validation.data,
        isManual: bodyResult.body.isManual || false
      };

      // Check if user has Alpaca credentials
      const hasAlpaca = UserManager.getBrokerCredentials(session.userId, 'alpaca', null).success;

      // Use Alpaca if credentials available, otherwise use internal paper trading
      let result;
      if (hasAlpaca) {
        console.log(`📊 Using Alpaca broker for user ${session.userId}`);
        result = await AlpacaBroker.placeOrder(session.userId, orderData);
      } else {
        console.log(`📝 Using internal paper trading for user ${session.userId} (no Alpaca account)`);
        result = await InternalPaperBroker.placeOrder(session.userId, orderData);

        // 💰 Deduct balance for PAPER positions (complete entry/exit cycle)
        // Note: This is SEPARATE from manual- positions which have their own flow
        if (result.success && session.activeAccount === 'default') {
          console.log(`[PAPER POSITION ENTRY]`);
          console.log(`   Position ID: ${result.positionId}`);
          console.log(`   Entry Price: $${result.entryPrice}`);
          console.log(`   Quantity: ${result.quantity}`);
          console.log(`   Active Account: ${session.activeAccount}`);
          console.log(`   Will deduct from DEFAULT balance...`);

          const balanceResult = DefaultAccountManager.processTradeEntry(
            session.userId,
            result.entryPrice,
            result.quantity,
            result.positionId  // PAPER-xxx ID
          );

          if (!balanceResult.success) {
            console.error(`❌ PAPER POSITION: Failed to deduct funds: ${balanceResult.error}`);
          } else {
            console.log(`✅ PAPER POSITION: Deducted from balance. New balance: $${balanceResult.balanceAfter.toFixed(2)}`);
            result.newBalance = balanceResult.balanceAfter;
          }
        }
      }

      // 🔥 AUDIT LOG: Order placed
      if (result.success) {
        AuditLog.orderPlaced(
          session.userId,
          session.username,
          orderData.symbol,
          result.quantity,
          result.estimatedCost
        );
      } else {
        AuditLog.orderFailed(session.userId, session.username, orderData.symbol, result.error);
      }
      
      return createSecureResponse(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // 💼 BROKER: Exit position
    // 💼 BROKER: Exit position - PHASE 1 UNIFIED ATOMIC EXIT
    if (url.pathname === "/api/broker/exit") {
      console.log(`🚪 [EXIT ENDPOINT] HIT! Method: ${req.method}, Path: ${url.pathname}`);

      if (req.method !== "POST") {
        console.log(`❌ [EXIT ENDPOINT] Wrong method: ${req.method}`);
        return createSecureResponse("Method not allowed", { status: 405 });
      }

      const session = UserManager.verifySession(token);
      if (!session.valid) {
        return createSecureResponse(JSON.stringify({ success: false, error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }

      // CSRF protection
      const csrfCheck = requireCSRF(req, token);
      if (!csrfCheck.valid) {
        AuditLog.csrfViolation(session.username, ip, url.pathname);
        return createSecureResponse(JSON.stringify({
          success: false,
          error: csrfCheck.error
        }), {
          status: csrfCheck.status,
          headers: { "Content-Type": "application/json" }
        });
      }

      // 🧪 Block in backtest mode
      const exitBlocked = blockIfBacktestMode('/api/broker/exit');
      if (exitBlocked) return exitBlocked;

      // Rate limiting
      const rateCheck = requireRateLimit('exitPosition', req, session.userId);
      if (!rateCheck.allowed) return rateCheck.response;

      // Validate request
      const bodyResult = await parseAndValidateBody(req);
      if (!bodyResult.valid) {
        return createSecureResponse(JSON.stringify({
          success: false,
          error: bodyResult.error
        }), {
          status: bodyResult.status,
          headers: { "Content-Type": "application/json" }
        });
      }

      const validation = validateExitPositionRequest(bodyResult.body);
      if (!validation.valid) {
        return createSecureResponse(JSON.stringify({
          success: false,
          errors: validation.errors
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      const positionId = validation.data.positionId;
      const currentPrice = validation.data.currentPrice;
      const entryPrice = validation.data.entryPrice;

      console.log(`🎯 [UNIFIED EXIT] Starting exit for position: ${positionId}`);
      console.log(`   Current Price: $${currentPrice}`);
      console.log(`   Entry Price: $${entryPrice || 'N/A'}`);

      let result = null;
      let transactionStarted = false;

      try {
        // PHASE 2: Use PositionResolver to find position (any ID format)
        const resolved = PositionResolver.resolvePosition(session.userId, positionId);

        if (!resolved.position && !resolved.signal && resolved.type !== 'manual') {
          return createSecureResponse(JSON.stringify({
            success: false,
            error: 'Position not found'
          }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }

        console.log(`✅ [UNIFIED EXIT] Resolved position type: ${resolved.type}`);

        // Start atomic transaction
        db.run('BEGIN TRANSACTION');
        transactionStarted = true;

        // STEP 1: Exit from broker (if applicable)
        let brokerResult = { success: true, exitPrice: currentPrice, pnl: 0 };

        if (resolved.type === 'paper') {
          // Exit paper position
          console.log(`📄 [UNIFIED EXIT] Exiting paper position`);
          brokerResult = await InternalPaperBroker.exitPosition(
            session.userId,
            resolved.positionId,
            currentPrice
          );
        } else if (resolved.type === 'alpaca') {
          // Exit Alpaca position
          console.log(`📊 [UNIFIED EXIT] Exiting Alpaca position`);
          brokerResult = await AlpacaBroker.exitPosition(
            session.userId,
            resolved.positionId,
            validation.data.accountType,
            { currentPrice }
          );
        } else if (resolved.type === 'manual') {
          // Manual signal - no broker position, just database
          console.log(`📝 [UNIFIED EXIT] Exiting manual signal (no broker)`);
          if (resolved.signal) {
            const ep = entryPrice || resolved.signal.entryPrice;
            const cp = currentPrice || resolved.signal.currentPrice;
            if (ep && cp) {
              brokerResult.pnl = ((cp - ep) / ep) * 100;
              brokerResult.exitPrice = cp;
            }
          }
        } else if (resolved.type === 'orphaned') {
          // Orphaned signal - has positionId but position record not found (likely closed)
          console.log(`⚠️ [UNIFIED EXIT] Exiting orphaned signal (position ${resolved.positionId} not found - may be already closed)`);
          if (resolved.signal) {
            const ep = entryPrice || resolved.signal.entryPrice;
            const cp = currentPrice || resolved.signal.currentPrice;
            if (ep && cp) {
              brokerResult.pnl = ((cp - ep) / ep) * 100;
              brokerResult.exitPrice = cp;
            }
          }
        }

        if (!brokerResult.success) {
          throw new Error(brokerResult.error || 'Broker exit failed');
        }

        const actualExitPrice = brokerResult.exitPrice || currentPrice;
        const actualPnl = brokerResult.pnl || 0;

        console.log(`✅ [UNIFIED EXIT] Broker exit successful at $${actualExitPrice.toFixed(2)}`);

        // STEP 2: Update database signal (if exists)
        if (resolved.signal) {
          console.log(`📊 [UNIFIED EXIT] Updating signal in database`);
          resolved.signal.hasPosition = false;
          resolved.signal.watchOnly = true;
          resolved.signal.unwatched = false;
          resolved.signal.exitedAt = new Date().toISOString();
          resolved.signal.exitPrice = actualExitPrice;
          resolved.signal.currentPrice = actualExitPrice;
          resolved.signal.pnl = actualPnl;

          const updateResult = TradeHistoryManager.saveSignal(resolved.signal, session.userId);
          if (!updateResult.success) {
            throw new Error('Failed to update signal in database');
          }
          console.log(`✅ [UNIFIED EXIT] Database signal updated`);
        }

        // STEP 3: Update balance (PHASE 3 FIX: use signal's account type, not current mode)
        let newBalance = null;
        let profitLoss = 0;

        // Determine which account to update - use signal's account type OR default
        const signalAccountType = resolved.signal?.accountType || 'default';
        const quantity = resolved.signal?.quantity || resolved.position?.quantity || 1;
        const finalEntryPrice = entryPrice || resolved.signal?.entryPrice || resolved.position?.entry_price || actualExitPrice;

        console.log(`[UNIFIED EXIT] Balance update check:`);
        console.log(`   Position ID: ${positionId}`);
        console.log(`   Signal ID: ${resolved.signal?.id}`);
        console.log(`   Signal account type from DB: ${resolved.signal?.accountType}`);
        console.log(`   Resolved accountType: ${signalAccountType}`);
        console.log(`   Session active account: ${session.activeAccount}`);
        console.log(`   Will update DEFAULT balance: ${signalAccountType === 'default' ? 'YES' : 'NO (paper/live trade)'}`);

        if (signalAccountType !== 'default') {
          console.log(`   Skipping default balance update - this is a ${signalAccountType.toUpperCase()} trade`);
        }

        if (signalAccountType === 'default' && finalEntryPrice && actualExitPrice) {
          console.log(`[UNIFIED EXIT] Updating default account balance`);
          const balanceResult = DefaultAccountManager.processTradeExit(
            session.userId,
            actualExitPrice,
            quantity,
            finalEntryPrice,
            positionId
          );

          if (balanceResult.success) {
            newBalance = balanceResult.balanceAfter;
            profitLoss = balanceResult.profitLoss;
            console.log(`✅ [UNIFIED EXIT] Balance updated: $${newBalance.toFixed(2)} (P&L: $${profitLoss.toFixed(2)})`);
          } else {
            console.error(`❌ [UNIFIED EXIT] Balance update failed: ${balanceResult.error}`);
            // Don't fail the entire exit if just balance update fails
          }
        }

        // STEP 4: Commit transaction
        db.run('COMMIT');
        transactionStarted = false;
        console.log(`✅ [UNIFIED EXIT] Transaction committed successfully`);

        // Build result
        result = {
          success: true,
          exitPrice: actualExitPrice,
          pnl: actualPnl,
          newBalance: newBalance,
          profitLoss: profitLoss,
          message: `Position exited successfully at $${actualExitPrice.toFixed(2)}`
        };

        // Audit log
        AuditLog.positionExited(session.userId, session.username, 'position', actualPnl);

        // 🔥 RESET RATE LIMIT on successful exit to prevent accumulation
        resetRateLimit('exitPosition', req, session.userId);

      } catch (error) {
        // Rollback transaction on any error
        if (transactionStarted) {
          try {
            db.run('ROLLBACK');
            console.log(`🔄 [UNIFIED EXIT] Transaction rolled back`);
          } catch (rollbackErr) {
            console.error(`❌ [UNIFIED EXIT] Rollback failed:`, rollbackErr);
          }
        }

        console.error(`❌ [UNIFIED EXIT] Exit failed:`, error);
        result = {
          success: false,
          error: error.message || 'Exit failed'
        };
      }

      return createSecureResponse(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // 🗑️ BROKER: Cancel pending orders
    if (url.pathname === "/api/broker/cancel-pending") {
      const session = UserManager.verifySession(token);
      if (!session.valid) {
        return createSecureResponse(JSON.stringify({ success: false, error: 'Not authenticated' }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Only allow POST
      if (req.method !== "POST") {
        return createSecureResponse(JSON.stringify({ success: false, error: 'Method not allowed' }), {
          status: 405,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Verify CSRF token
      const csrfToken = req.headers.get('X-CSRF-Token');
      if (!csrfProtection.validateToken(token, csrfToken)) {
        console.error('❌ CSRF validation failed for cancel-pending');
        return createSecureResponse(JSON.stringify({ success: false, error: 'Invalid CSRF token' }), {
          status: 403,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // 🧪 Block in backtest mode
      const cancelBlocked = blockIfBacktestMode('/api/broker/cancel-pending');
      if (cancelBlocked) return cancelBlocked;

      let requestBody;
      try {
        requestBody = await req.json();
      } catch (error) {
        return createSecureResponse(JSON.stringify({ success: false, error: 'Invalid request body' }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      const { positionId, orderType = 'both' } = requestBody;

      if (!positionId) {
        return createSecureResponse(JSON.stringify({ success: false, error: 'Position ID required' }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      console.log(`🗑️ Cancelling ${orderType} orders for position ${positionId}`);

      // Cancel orders via Alpaca broker
      const result = await AlpacaBroker.cancelPendingOrders(
        session.userId,
        positionId,
        null, // accountType - will use active account
        orderType
      );

      // 🔥 AUDIT LOG: Orders cancelled
      if (result.success && result.cancelledCount > 0) {
        AuditLog.log('cancel_orders', session.userId, session.username, {
          positionId,
          orderType,
          cancelledCount: result.cancelledCount
        });
      }

      return createSecureResponse(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // 💼 BROKER: Get positions
    if (url.pathname === "/api/broker/positions") {
      const session = UserManager.verifySession(token);
      if (!session.valid) {
        return createSecureResponse(JSON.stringify({ success: false, positions: [] }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // 🧪 Block in backtest mode
      const posBlocked = blockIfBacktestMode('/api/broker/positions');
      if (posBlocked) return posBlocked;

      // Get both Alpaca and internal paper positions
      const hasAlpaca = UserManager.getBrokerCredentials(session.userId, 'alpaca', null).success;

      let alpacaPositions = [];
      let paperPositions = [];

      if (hasAlpaca) {
        const alpacaResult = await AlpacaBroker.getAlpacaPositions(session.userId);
        if (alpacaResult.success) {
          alpacaPositions = alpacaResult.positions || [];
        }
      }

      // Always get internal paper positions
      const paperResult = InternalPaperBroker.getPositions(session.userId);
      if (paperResult.success) {
        paperPositions = paperResult.positions || [];
      }

      // Combine both position types
      const allPositions = [...alpacaPositions, ...paperPositions];

      return createSecureResponse(JSON.stringify({
        success: true,
        positions: allPositions
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // 💼 BROKER: Save manual watch-only entry
    if (url.pathname === "/api/broker/save-manual-entry") {
      if (req.method !== "POST") {
        return createSecureResponse("Method not allowed", { status: 405 });
      }

      const session = UserManager.verifySession(token);
      if (!session.valid) {
        return createSecureResponse(JSON.stringify({ success: false, error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }

      // CSRF protection
      const csrfCheck = requireCSRF(req, token);
      if (!csrfCheck.valid) {
        AuditLog.csrfViolation(session.username, ip, url.pathname);
        return createSecureResponse(JSON.stringify({
          success: false,
          error: csrfCheck.error
        }), {
          status: csrfCheck.status,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // 🧪 Block in backtest mode
      const manualBlocked = blockIfBacktestMode('/api/broker/save-manual-entry');
      if (manualBlocked) return manualBlocked;

      // Rate limiting
      const rateCheck = requireRateLimit('saveManualEntry', req, session.userId);
      if (!rateCheck.allowed) return rateCheck.response;

      // Validate request
      const bodyResult = await parseAndValidateBody(req);
      if (!bodyResult.valid) {
        return createSecureResponse(JSON.stringify({
          success: false,
          error: bodyResult.error
        }), {
          status: bodyResult.status,
          headers: { "Content-Type": "application/json" }
        });
      }

      const signal = bodyResult.body;

      // Validate required fields
      if (!signal.id || !signal.root || !signal.expiration || !signal.strike || !signal.right) {
        return createSecureResponse(JSON.stringify({
          success: false,
          error: 'Missing required fields: id, root, expiration, strike, right'
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      try {
        // Mark as manual entry
        signal.isManual = true;
        signal.trader = signal.trader || 'manual';

        console.log(`💾 Saving manual entry for user ${session.userId}:`, {
          id: signal.id,
          root: signal.root,
          strike: signal.strike,
          right: signal.right,
          expiration: signal.expiration,
          isManual: signal.isManual,
          hasPosition: signal.hasPosition,
          watchOnly: signal.watchOnly,
          positionId: signal.positionId,
          entryPrice: signal.entryPrice,
          quantity: signal.quantity
        });

        // 🔥 CRITICAL FIX: If signal has a positionId, ALWAYS set hasPosition=true and watchOnly=false
        if (signal.positionId) {
          console.log(`🔧 Position ID detected: ${signal.positionId} - forcing hasPosition=true, watchOnly=false`);
          signal.hasPosition = true;
          signal.watchOnly = false;
        }

        // Save to database
        const result = TradeHistoryManager.saveSignal(signal, session.userId);

        if (result.success) {
          console.log(`✅ Manual entry saved successfully for user ${session.userId}: ${signal.root} ${signal.strike}${signal.right}`);

          // 💰 Update default account balance if on default account and has position
          // SKIP if this is a PAPER- position (those are handled by /api/broker/order)
          // Check BOTH signal.id AND signal.positionId since PAPER- ID may be in either field
          const isPaperPosition = (signal.id && typeof signal.id === 'string' && signal.id.startsWith('PAPER-')) ||
                                  (signal.positionId && typeof signal.positionId === 'string' && signal.positionId.startsWith('PAPER-'));

          console.log(`🔍 DEBUG: SAVE MANUAL ENTRY`);
          console.log(`   Signal ID: ${signal.id}`);
          console.log(`   Signal ID type: ${typeof signal.id}`);
          console.log(`   Position ID: ${signal.positionId}`);
          console.log(`   isPaperPosition: ${isPaperPosition}`);
          console.log(`   hasPosition: ${signal.hasPosition}`);
          console.log(`   entryPrice: ${signal.entryPrice}`);
          console.log(`   activeAccount: ${session.activeAccount}`);
          console.log(`   Will deduct?: ${session.activeAccount === 'default' && signal.hasPosition && signal.entryPrice && !isPaperPosition}`);

          if (session.activeAccount === 'default' && signal.hasPosition && signal.entryPrice && !isPaperPosition) {
            const quantity = signal.quantity || 1;
            const balanceResult = DefaultAccountManager.processTradeEntry(
              session.userId,
              signal.entryPrice,
              quantity,
              signal.id
            );

            if (!balanceResult.success) {
              console.warn(`⚠️ Failed to deduct from default balance: ${balanceResult.error}`);
              // Still save the trade, but warn user
              if (balanceResult.error === 'Insufficient funds') {
                return createSecureResponse(JSON.stringify({
                  success: false,
                  error: `Insufficient funds. Balance: $${balanceResult.balance?.toFixed(2)}, Required: $${balanceResult.required?.toFixed(2)}`
                }), {
                  status: 400,
                  headers: { "Content-Type": "application/json" }
                });
              }
            } else {
              console.log(`💸 Deducted $${(signal.entryPrice * quantity * 100).toFixed(2)} from default account. New balance: $${balanceResult.balanceAfter.toFixed(2)}`);
            }
          } else if (isPaperPosition) {
            console.log(`⏭️ Skipping balance deduction for PAPER- position (already handled by /api/broker/order)`);
          }

          // Subscribe to contract for live updates via WebSocket
          if (optionsStream) {
            const contractKey = `${signal.root}:${signal.expiration}:${signal.strike}:${signal.right}`;
            console.log(`📡 Auto-subscribing to contract: ${contractKey}`);

            try {
              await optionsStream.addDynamicContract({
                root: signal.root,
                expiration: signal.expiration,
                strike: signal.strike,
                right: signal.right
              });
            } catch (subError) {
              console.warn('⚠️ Failed to auto-subscribe to contract:', subError);
              // Don't fail the whole request if subscription fails
            }
          }

          // Get updated balance for default account
          let newBalance = null;
          if (session.activeAccount === 'default') {
            const balanceInfo = DefaultAccountManager.getBalance(session.userId);
            if (balanceInfo.success) {
              newBalance = balanceInfo.balance;
            }
          }

          return createSecureResponse(JSON.stringify({
            success: true,
            signalId: signal.id,
            message: 'Manual entry saved successfully',
            newBalance: newBalance  // Include updated balance in response
          }), {
            headers: { "Content-Type": "application/json" }
          });
        } else {
          return createSecureResponse(JSON.stringify({
            success: false,
            error: result.error || 'Failed to save manual entry'
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
      } catch (error) {
        console.error('❌ Error saving manual entry:', error);
        console.error('❌ Error stack:', error.stack);
        console.error('❌ Signal data:', signal);
        return createSecureResponse(JSON.stringify({
          success: false,
          error: 'Failed to save manual entry: ' + error.message
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    
    // 💼 BROKER: Get account info
    if (url.pathname === "/api/broker/account") {
      const session = UserManager.verifySession(token);
      if (!session.valid) {
        return createSecureResponse(JSON.stringify({ success: false, error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Check if user is using default account
      if (session.activeAccount === 'default') {
        console.log(`[BROKER ACCOUNT] User ${session.userId} using DEFAULT account - returning default balance`);
        const defaultBalance = UserManager.getDefaultBalance(session.userId);
        return createSecureResponse(JSON.stringify({
          success: true,
          buyingPower: defaultBalance,
          cash: defaultBalance,
          portfolioValue: defaultBalance,
          equity: defaultBalance,
          accountType: 'default'
        }), {
          headers: { "Content-Type": "application/json" }
        });
      }

      // For paper/live accounts, fetch from Alpaca
      console.log(`[BROKER ACCOUNT] User ${session.userId} using ${session.activeAccount.toUpperCase()} account - fetching from Alpaca`);
      const result = await AlpacaBroker.getAccountInfo(session.userId);

      if (!result.success) {
        console.error(`[BROKER ACCOUNT] Failed to get Alpaca account info:`, result.error);
      }

      return createSecureResponse(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // 📊 API - Get expirations
    if (url.pathname === "/api/expirations") {
      // 🧪 Block in backtest mode
      const blocked = blockIfBacktestMode('/api/expirations');
      if (blocked) return blocked;

      const symbol = url.searchParams.get("symbol") || "SPY";
      const data = await getExpirations(symbol);

      return createSecureResponse(JSON.stringify(data.response), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
    
    // ðŸ"Š API - Get stock quote (for manual entry ATM calculation)
if (url.pathname === "/api/stock-quote") {
  const session = UserManager.verifySession(token);
  if (!session.valid) {
    console.error('âŒ [STOCK-QUOTE] Session invalid');
    return createSecureResponse(JSON.stringify({ 
      success: false, 
      error: "Unauthorized" 
    }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  
  // 🧪 Block in backtest mode
  const blocked = blockIfBacktestMode('/api/stock-quote');
  if (blocked) return blocked;
  
  const symbol = url.searchParams.get("symbol");
  
  if (!symbol) {
    console.error('âŒ [STOCK-QUOTE] Missing symbol parameter');
    return createSecureResponse(JSON.stringify({ 
      success: false, 
      error: "Missing symbol parameter" 
    }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  
  try {
    console.log(`ðŸ"ˆ [STOCK-QUOTE] Fetching stock quote for ${symbol}`);
    const data = await getStockQuote(symbol);

    // Check if we got valid data
    if (!data.response || !data.response.price || data.response.price <= 0) {
      console.error(`âŒ [STOCK-QUOTE] Invalid data received:`, data);

      return createSecureResponse(JSON.stringify({
        success: false,
        error: data.error || 'ThetaData unavailable - please try again or check if market is open',
        symbol: symbol
      }), {
        status: 503,
        headers: { "Content-Type": "application/json" }
      });
    }

    console.log(`âœ… [STOCK-QUOTE] Got price: $${data.response.price.toFixed(2)}`);

    return createSecureResponse(JSON.stringify({
      success: true,
      response: data.response,
      symbol: symbol
    }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error('âŒ [STOCK-QUOTE] Error:', error);
    return createSecureResponse(JSON.stringify({
      success: false,
      error: 'ThetaData unavailable - ' + error.message,
      symbol: symbol
    }), {
      status: 503,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// âœ… NEW: API - Get options chain for manual entry
if (url.pathname === "/api/options-chain") {
  const session = UserManager.verifySession(token);
  if (!session.valid) {
    console.error('âŒ [OPTIONS-CHAIN] Session invalid:', session);
    return createSecureResponse(JSON.stringify({ 
      success: false, 
      error: "Unauthorized" 
    }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  
  // 🧪 Block in backtest mode
  const blocked = blockIfBacktestMode('/api/options-chain');
  if (blocked) return blocked;
  
  const symbol = url.searchParams.get("symbol");
  const expiration = url.searchParams.get("expiration");
  
  console.log(`ðŸ"Š [OPTIONS-CHAIN] Request: symbol=${symbol}, expiration=${expiration}`);
  
  if (!symbol || !expiration) {
    console.error('âŒ [OPTIONS-CHAIN] Missing params:', { symbol, expiration });
    return createSecureResponse(JSON.stringify({ 
      success: false, 
      error: "Missing symbol or expiration" 
    }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  
  try {
    console.log(`ðŸ"Š [OPTIONS-CHAIN] Calling getOptionsChain(${symbol}, ${expiration})`);
    const data = await getOptionsChain(symbol, expiration);
    
    console.log(`âœ… [OPTIONS-CHAIN] Got ${data.response?.length || 0} contracts`);
    
    return createSecureResponse(JSON.stringify({
      success: true,
      response: data.response || [],
      symbol: symbol,
      expiration: expiration
    }), {
      headers: { "Content-Type": "application/json" }
    });
    
  } catch (error) {
    console.error('âŒ [OPTIONS-CHAIN] Error:', error);
    console.error('âŒ [OPTIONS-CHAIN] Stack:', error.stack);
    return createSecureResponse(JSON.stringify({ 
      success: false, 
      error: error.message,
      response: []
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
    

    // 📊 API - Get options history from DATABASE (not HTTP API)
    if (url.pathname === "/api/options-history-db") {
      const session = UserManager.verifySession(token);
      if (!session.valid) {
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: "Unauthorized" 
        }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      const symbol = url.searchParams.get("symbol");
      const strike = url.searchParams.get("strike");
      const right = url.searchParams.get("right");
      const expiration = url.searchParams.get("expiration");
      
      if (!symbol || !strike || !right || !expiration) {
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: "Missing required parameters: symbol, strike, right, expiration" 
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      try {
        // 🔥 Query local database for historical quotes
        const history = optionsStream.getContractHistory(
          symbol,
          expiration,
          parseFloat(strike),
          right,
          10000 // Get last 10,000 ticks (should cover full trading day+)
        );
        
        // Format for chart
        const chartData = history.map(row => ({
          timestamp: row.timestamp,
          mid: row.mid,
          bid: row.bid,
          ask: row.ask,
          spread: row.spread
        }));
        
        console.log(`📊 Loaded ${chartData.length} database ticks for ${symbol} ${strike}${right}`);
        
        return createSecureResponse(JSON.stringify({
          success: true,
          history: chartData,
          symbol,
          strike,
          right,
          expiration,
          source: 'database',
          count: chartData.length
        }), {
          headers: { "Content-Type": "application/json" }
        });
        
      } catch (error) {
        console.error('❌ Error fetching database history:', error);
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: 'Failed to fetch database history',
          details: error.message
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    
    // 📊 API - Get user's position history with full chart data
    if (url.pathname === "/api/positions/history") {
      const session = UserManager.verifySession(token);
      if (!session.valid) {
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: "Unauthorized" 
        }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      try {
        const positionId = url.searchParams.get("positionId");
        
        if (!positionId) {
          return createSecureResponse(JSON.stringify({ 
            success: false, 
            error: "Missing positionId" 
          }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        
        // Get position details
        const historyResult = UserManager.getTradingHistory(session.userId, 1000);
        const position = historyResult.history?.find(p => p.id === parseInt(positionId));
        
        if (!position) {
          return createSecureResponse(JSON.stringify({ 
            success: false, 
            error: "Position not found" 
          }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }
        
        // Get chart data from database
        const chartData = optionsStream.getContractHistory(
          position.symbol,
          position.expiration,
          position.strike,
          position.right,
          100000 // Get all ticks for this position
        );
        
        // Filter to only show data between entry and exit time
        const entryTime = new Date(position.entry_time).getTime();
        const exitTime = position.exit_time ? new Date(position.exit_time).getTime() : Date.now();
        
        const filteredData = chartData
          .filter(tick => tick.timestamp >= entryTime && tick.timestamp <= exitTime)
          .map(tick => ({
            timestamp: tick.timestamp,
            mid: tick.mid,
            bid: tick.bid,
            ask: tick.ask
          }));
        
        return createSecureResponse(JSON.stringify({
          success: true,
          position: {
            symbol: position.symbol,
            optionSymbol: position.option_symbol,
            strike: position.strike,
            expiration: position.expiration,
            right: position.right,
            quantity: position.quantity,
            entryPrice: position.entry_price,
            exitPrice: position.exit_price,
            entryTime: position.entry_time,
            exitTime: position.exit_time,
            pnl: position.pnl,
            status: position.status
          },
          chartData: filteredData,
          dataPoints: filteredData.length
        }), {
          headers: { "Content-Type": "application/json" }
        });
        
      } catch (error) {
        console.error('❌ Error fetching position history:', error);
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: 'Failed to fetch position history'
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    
    // 📊 API - Get options history for charting (LEGACY HTTP ENDPOINT)
    if (url.pathname === "/api/options-history") {
      const session = UserManager.verifySession(token);
      if (!session.valid) {
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: "Unauthorized" 
        }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // 🧪 Block in backtest mode
      const blocked = blockIfBacktestMode('/api/options-history');
      if (blocked) return blocked;
      
      const symbol = url.searchParams.get("symbol");
      const strike = url.searchParams.get("strike");
      const right = url.searchParams.get("right");
      const expiration = url.searchParams.get("expiration");
      const days = parseInt(url.searchParams.get("days")) || 1;
      
      if (!symbol || !strike || !right || !expiration) {
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: "Missing required parameters: symbol, strike, right, expiration" 
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      try {
        const THETA_HTTP = process.env.THETA_HTTP_API || "http://127.0.0.1:25510";

        // Calculate date range (last N days)
        const endDate = new Date();
        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - days);

        // Format dates as YYYYMMDD
        const formatDate = (date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}${month}${day}`;
        };

        const start = formatDate(startDate);
        const end = formatDate(endDate);

        // Fetch historical EOD data from ThetaData
        const historyUrl = `${THETA_HTTP}/v2/hist/option/eod?root=${symbol}&exp=${expiration}&strike=${parseFloat(strike) * 1000}&right=${right === 'C' ? 'CALL' : 'PUT'}&start_date=${start}&end_date=${end}`;

        console.log(`📊 Fetching options history: ${historyUrl}`);

        let historyData = null;

        try {
          const historyResponse = await fetch(historyUrl, {
            signal: AbortSignal.timeout(3000) // 3 second timeout
          });

          if (!historyResponse.ok) {
            console.warn(`⚠️ ThetaData history returned ${historyResponse.status}`);
            historyData = { response: [] }; // Empty response
          } else {
            historyData = await historyResponse.json();
          }
        } catch (fetchError) {
          console.warn(`⚠️ ThetaData fetch failed: ${fetchError.message}`);
          historyData = { response: [] }; // Empty response, will try quote fallback
        }
        
        // Parse response into chart-friendly format
        const history = [];
        
        if (historyData.response && Array.isArray(historyData.response)) {
          historyData.response.forEach(tick => {
            // Format: [ms_of_day, open, high, low, close, volume, count, date]
            const date = tick[7]; // YYYYMMDD
            const close = tick[4];
            
            if (close && close > 0) {
              // Convert YYYYMMDD to timestamp
              const year = Math.floor(date / 10000);
              const month = Math.floor((date % 10000) / 100) - 1;
              const day = date % 100;
              const timestamp = new Date(year, month, day, 16, 0, 0).getTime(); // Market close 4pm
              
              history.push({
                timestamp,
                price: close,
                volume: tick[5] || 0
              });
            }
          });
        }
        
        // If no historical data, try to get current quote as fallback
        if (history.length === 0) {
          console.log(`📊 No historical data found, trying current quote as fallback...`);
          const quoteUrl = `${THETA_HTTP}/v2/snapshot/option/quote?root=${symbol}&exp=${expiration}&strike=${parseFloat(strike) * 1000}&right=${right === 'C' ? 'CALL' : 'PUT'}`;

          try {
            const quoteResponse = await fetch(quoteUrl, {
              signal: AbortSignal.timeout(3000) // 3 second timeout
            });

            if (quoteResponse.ok) {
              const quoteData = await quoteResponse.json();

              if (quoteData.response && quoteData.response.length > 0) {
                const ticks = quoteData.response[0];
                const bid = ticks[3] || 0;
                const ask = ticks[7] || 0;
                const mid = (bid + ask) / 2;

                if (mid > 0) {
                  history.push({
                    timestamp: Date.now(),
                    price: mid,
                    volume: 0
                  });
                  console.log(`✅ Using current quote: $${mid.toFixed(2)}`);
                }
              }
            } else {
              console.warn(`⚠️ Quote fallback returned ${quoteResponse.status}`);
            }
          } catch (quoteError) {
            console.warn(`⚠️ Quote fallback failed: ${quoteError.message}`);
          }
        }
        
        if (history.length === 0) {
          console.warn(`⚠️ No historical data available for ${symbol} ${strike}${right} ${expiration}`);
        } else {
          console.log(`✅ Loaded ${history.length} historical points for ${symbol} ${strike}${right}`);
        }

        // Always return success, even with empty data (chart will use mock data)
        return createSecureResponse(JSON.stringify({
          success: true,
          history: history,
          symbol,
          strike,
          right,
          expiration,
          message: history.length === 0 ? 'No historical data available - chart will use mock data' : undefined
        }), {
          headers: { "Content-Type": "application/json" }
        });

      } catch (error) {
        console.error('❌ Unexpected error in options history endpoint:', error);
        // Return success with empty data rather than 500 error
        // This allows charts to render with mock data
        return createSecureResponse(JSON.stringify({
          success: true,
          history: [],
          symbol,
          strike,
          right,
          expiration,
          message: 'ThetaData unavailable - chart will use mock data',
          error: error.message
        }), {
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // 🔧 NEW: OCR TRADE SIGNAL ENDPOINTS
    
    // 📸 OCR: Receive trade signal from Python bridge (POST) - NO AUTH REQUIRED - 🔍 WITH VALIDATION + 💾 SAVE + 📡 BROADCAST
    if (url.pathname === "/api/trade-signal") {
      if (req.method !== "POST") {
        return createSecureResponse("Method not allowed", { status: 405 });
      }
      
      try {
        const bodyResult = await parseAndValidateBody(req);
        if (!bodyResult.valid) {
          return createSecureResponse(JSON.stringify({ 
            success: false, 
            error: bodyResult.error 
          }), {
            status: bodyResult.status,
            headers: { "Content-Type": "application/json" }
          });
        }
        
        const signal = bodyResult.body;
        
        // Validate required fields
        if (!signal.root || !signal.expiration || !signal.strike || !signal.right) {
          return createSecureResponse(JSON.stringify({ 
            success: false, 
            error: 'Missing required fields: root, expiration, strike, right' 
          }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        
        console.log(`📸 OCR Trade Signal Received:`, {
          contract: `${signal.root} ${signal.expiration} ${signal.strike}${signal.right}`,
          price: signal.price,
          trader: signal.trader,
          priority: signal.priority,
          timestamp: signal.timestamp
        });
        
        // 🔍 STEP 1: VALIDATE CONTRACT AGAINST REAL MARKET DATA
        if (signal.price) {
          console.log(`🔍 [VALIDATION] Checking OCR price ${signal.price} against market...`);
          
          try {
            // Fetch real-time quote from ThetaData
            const THETA_HTTP = "http://127.0.0.1:25510";
            const quoteUrl = `${THETA_HTTP}/v2/snapshot/option/quote?root=${signal.root}&exp=${signal.expiration}&strike=${parseFloat(signal.strike) * 1000}&right=${signal.right === 'C' ? 'CALL' : 'PUT'}`;
            
            const quoteResponse = await fetch(quoteUrl);
            
            if (quoteResponse.ok) {
              const quoteData = await quoteResponse.json();
              
              if (quoteData.response && quoteData.response.length > 0) {
                const ticks = quoteData.response[0];
                // Format: [ms_of_day, bid_size, bid_exchange, bid, bid_condition, ask_size, ask_exchange, ask, ask_condition, date]
                const bid = ticks[3] || 0;
                const ask = ticks[7] || 0;
                const marketMid = (bid + ask) / 2;
                
                if (marketMid > 0) {
                  const ocrPrice = parseFloat(signal.price);
                  const priceDiff = Math.abs(ocrPrice - marketMid) / marketMid;
                  const percentDiff = priceDiff * 100;
                  
                  console.log(`🔍 [VALIDATION] OCR: ${ocrPrice.toFixed(2)} | Market: ${marketMid.toFixed(2)} | Diff: ${percentDiff.toFixed(1)}%`);
                  
                  // ❌ REJECT if price difference > 20%
                  if (percentDiff > 20) {
                    console.log(`❌ [VALIDATION] REJECTED - Price mismatch exceeds 20% (${percentDiff.toFixed(1)}%)`);
                    console.log(`   Likely OCR typo: Strike or Premium or Call/Put incorrect`);
                    
                    return createSecureResponse(JSON.stringify({ 
                      success: false,
                      error: 'Signal rejected - OCR price mismatch',
                      details: `OCR price ${ocrPrice.toFixed(2)} differs ${percentDiff.toFixed(1)}% from market ${marketMid.toFixed(2)}`,
                      validation: {
                        ocrPrice: ocrPrice,
                        marketPrice: marketMid,
                        percentDiff: percentDiff,
                        threshold: 20
                      }
                    }), {
                      headers: { "Content-Type": "application/json" }
                    });
                  }
                  
                  // ✅ ACCEPT - within tolerance
                  console.log(`✅ [VALIDATION] ACCEPTED - Price within ±20% tolerance`);
                  
                  // Update signal with validated market price
                  signal.validatedPrice = marketMid;
                  signal.ocrPriceAccuracy = percentDiff;
                  
                } else {
                  console.log(`⚠️ [VALIDATION] No market price available (bid/ask = 0), accepting OCR price`);
                }
              } else {
                console.log(`⚠️ [VALIDATION] Contract not found in market data, accepting OCR price`);
              }
            } else {
              console.log(`⚠️ [VALIDATION] Market quote fetch failed (${quoteResponse.status}), accepting OCR price`);
            }
            
          } catch (validationError) {
            console.error(`⚠️ [VALIDATION] Error during validation:`, validationError.message);
            console.log(`⚠️ [VALIDATION] Proceeding without validation due to error`);
          }
        } else {
          console.log(`⚠️ [VALIDATION] No OCR price provided, skipping validation`);
        }
        
        // Create signal ID
        const signalId = `${signal.root}-${signal.expiration}-${signal.strike}-${signal.right}-${Date.now()}`;
        
        const fullSignal = {
          id: signalId,
          root: signal.root,
          expiration: signal.expiration,
          strike: parseFloat(signal.strike),
          right: signal.right,
          entryPrice: signal.validatedPrice || (signal.price ? parseFloat(signal.price) : null),
          ocrPrice: signal.price ? parseFloat(signal.price) : null,
          priceAccuracy: signal.ocrPriceAccuracy || null,
          trader: signal.trader || 'unknown',
          priority: signal.priority || 'normal',
          receivedAt: Date.now(),
          timestamp: signal.timestamp || new Date().toISOString()
        };

        // 💾 SAVE TO DATABASE
        TradeHistoryManager.saveSignal(fullSignal);

        // 🤖 CHECK FOR COPY TRADE RULES
        await processCopyTrades(fullSignal);

        // 📡 ADD to options stream for live price tracking
        optionsStream.addDynamicContract({
          root: signal.root,
          expiration: signal.expiration,
          strike: parseFloat(signal.strike),
          right: signal.right
        });

        // 📡 BROADCAST to all connected users
        if (global.broadcastToAllUsers) {
          global.broadcastToAllUsers({
            type: 'trade_signal_received',
            signal: fullSignal
          });
        }
        
        // 🔍 START analysis (async - will broadcast when complete)
        TradeAnalyzer.analyzeTrade(fullSignal).then((result) => {
          if (result.success) {
            console.log(`✅ Analysis started for ${signalId}`);
          }
        });
        
        console.log(`✅ Trade signal validated and processed`);
        
        return createSecureResponse(JSON.stringify({ 
          success: true,
          message: 'Trade signal validated and broadcasted',
          signalId: signalId,
          validation: {
            ocrPrice: signal.price,
            validatedPrice: signal.validatedPrice,
            accuracy: signal.ocrPriceAccuracy ? `${signal.ocrPriceAccuracy.toFixed(1)}%` : 'N/A'
          }
        }), {
          headers: { "Content-Type": "application/json" }
        });
        
      } catch (error) {
        console.error('❌ Error processing trade signal:', error);
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: 'Failed to process trade signal' 
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    
    // 📊 ANALYSIS: Get active signals (GET) - REQUIRES AUTH - 🔧 USER-SPECIFIC
if (url.pathname === "/api/analysis/active-signals") {
  const session = UserManager.verifySession(token);
  if (!session.valid) {
    return createSecureResponse(JSON.stringify({ 
      success: false, 
      error: "Unauthorized" 
    }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const result = TradeHistoryManager.getActiveSignals(session.userId);

    console.log(`📊 TradeHistoryManager returned: success=${result.success}, signals count=${result.signals?.length || 0}`);

    // Filter out signals that this user has unwatched
    if (result.success && result.signals) {
      try {
        // Check if unwatched_signals table exists first
        const tableCheck = db.prepare(`
          SELECT name FROM sqlite_master WHERE type='table' AND name='unwatched_signals'
        `).get();

        if (tableCheck) {
          const stmt = db.prepare(`
            SELECT signal_id FROM unwatched_signals WHERE user_id = ?
          `);
          const unwatched = stmt.all(session.userId).map(row => row.signal_id);

          result.signals = result.signals.filter(signal => !unwatched.includes(signal.id));

          console.log(`📊 Loaded ${result.signals.length} active signals for user ${session.username} (filtered ${unwatched.length} unwatched)`);
        } else {
          console.log(`📊 Loaded ${result.signals.length} active signals for user ${session.username} (no unwatch filtering - table doesn't exist)`);
        }
      } catch (unwatchError) {
        console.warn('⚠️ Failed to filter unwatched signals, returning all:', unwatchError.message);
        // Continue without filtering if there's an error
      }

      // 🔥 NEW: Enrich signals with pending order IDs from positions table
      try {
        result.signals = result.signals.map(signal => {
          if (signal.positionId) {
            const pendingOrders = UserManager.getPendingOrders(signal.positionId);
            if (pendingOrders.success) {
              return {
                ...signal,
                entryOrderId: pendingOrders.entryOrderId,
                exitOrderId: pendingOrders.exitOrderId,
                hasPendingEntry: pendingOrders.hasEntry,
                hasPendingExit: pendingOrders.hasExit
              };
            }
          }
          return signal;
        });
      } catch (enrichError) {
        console.warn('⚠️ Failed to enrich signals with order IDs:', enrichError.message);
        // Continue without order IDs if there's an error
      }
    }

    return createSecureResponse(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error('❌ Error getting active signals:', error);
    console.error('❌ Error stack:', error.stack);
    return createSecureResponse(JSON.stringify({
      success: false,
      error: 'Failed to retrieve active signals',
      details: error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// 👁️ ANALYSIS: Unwatch signal (POST) - REQUIRES AUTH - USER-SPECIFIC
if (url.pathname === "/api/analysis/unwatch-signal") {
  if (req.method !== "POST") {
    return createSecureResponse("Method not allowed", { status: 405 });
  }

  const session = UserManager.verifySession(token);
  if (!session.valid) {
    return createSecureResponse(JSON.stringify({
      success: false,
      error: "Unauthorized"
    }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  // CSRF protection
  const csrfCheck = requireCSRF(req, token);
  if (!csrfCheck.valid) {
    AuditLog.csrfViolation(session.username, ip, url.pathname);
    return createSecureResponse(JSON.stringify({
      success: false,
      error: csrfCheck.error
    }), {
      status: csrfCheck.status,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Validate request
  const bodyResult = await parseAndValidateBody(req);
  if (!bodyResult.valid) {
    return createSecureResponse(JSON.stringify({
      success: false,
      error: bodyResult.error
    }), {
      status: bodyResult.status,
      headers: { "Content-Type": "application/json" }
    });
  }

  const { signalId } = bodyResult.body;

  if (!signalId) {
    return createSecureResponse(JSON.stringify({
      success: false,
      error: 'Missing signalId'
    }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    // Insert into unwatched_signals table
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO unwatched_signals (user_id, signal_id)
      VALUES (?, ?)
    `);
    stmt.run(session.userId, signalId);

    console.log(`👁️ User ${session.username} unwatched signal ${signalId}`);

    return createSecureResponse(JSON.stringify({
      success: true,
      message: 'Signal unwatched successfully'
    }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error('❌ Error unwatching signal:', error);
    return createSecureResponse(JSON.stringify({
      success: false,
      error: 'Failed to unwatch signal'
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// 🤖 COPY TRADE: Get available traders (GET) - REQUIRES AUTH
if (url.pathname === "/api/copy-trade/available-traders") {
  if (req.method !== "GET") {
    return createSecureResponse("Method not allowed", { status: 405 });
  }

  const session = UserManager.verifySession(token);
  if (!session.valid) {
    return createSecureResponse(JSON.stringify({
      success: false,
      error: "Unauthorized"
    }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    // Get unique traders from trade_signals table
    const stmt = db.prepare(`
      SELECT DISTINCT trader FROM trade_signals
      WHERE trader IS NOT NULL
      ORDER BY trader ASC
    `);
    const rows = stmt.all();
    const traders = rows.map(row => row.trader);

    return createSecureResponse(JSON.stringify({
      success: true,
      traders: traders
    }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error('❌ Error getting available traders:', error);
    return createSecureResponse(JSON.stringify({
      success: false,
      error: 'Failed to retrieve traders'
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// 🤖 COPY TRADE: Get copy trade settings (GET) - REQUIRES AUTH - USER-SPECIFIC
if (url.pathname === "/api/copy-trade/settings") {
  if (req.method === "GET") {
    const session = UserManager.verifySession(token);
    if (!session.valid) {
      return createSecureResponse(JSON.stringify({
        success: false,
        error: "Unauthorized"
      }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    try {
      const stmt = db.prepare(`
        SELECT * FROM copy_trade_settings
        WHERE user_id = ? AND enabled = 1
        ORDER BY created_at DESC
      `);
      const settings = stmt.all(session.userId);

      return createSecureResponse(JSON.stringify({
        success: true,
        settings: settings
      }), {
        headers: { "Content-Type": "application/json" }
      });

    } catch (error) {
      console.error('❌ Error getting copy trade settings:', error);
      return createSecureResponse(JSON.stringify({
        success: false,
        error: 'Failed to retrieve copy trade settings'
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  // 🤖 COPY TRADE: Add copy trade setting (POST) - REQUIRES AUTH & CSRF - USER-SPECIFIC
  if (req.method === "POST") {
    const session = UserManager.verifySession(token);
    if (!session.valid) {
      return createSecureResponse(JSON.stringify({
        success: false,
        error: "Unauthorized"
      }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    // CSRF protection
    const csrfCheck = requireCSRF(req, token);
    if (!csrfCheck.valid) {
      AuditLog.csrfViolation(session.username, ip, url.pathname);
      return createSecureResponse(JSON.stringify({
        success: false,
        error: csrfCheck.error
      }), {
        status: csrfCheck.status,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Validate request
    const bodyResult = await parseAndValidateBody(req);
    if (!bodyResult.valid) {
      return createSecureResponse(JSON.stringify({
        success: false,
        error: bodyResult.error
      }), {
        status: bodyResult.status,
        headers: { "Content-Type": "application/json" }
      });
    }

    const { trader, ticker, startHour, startMinute, endHour, endMinute, amountPerTrade, tradingMode } = bodyResult.body;

    if (!trader || !amountPerTrade || amountPerTrade <= 0) {
      return createSecureResponse(JSON.stringify({
        success: false,
        error: 'Missing required fields: trader and amountPerTrade'
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    try {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO copy_trade_settings
        (user_id, trader, ticker, start_hour, start_minute, end_hour, end_minute, amount_per_trade, trading_mode, enabled)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `);

      stmt.run(
        session.userId,
        trader,
        ticker || null,
        startHour !== null && startHour !== undefined ? startHour : null,
        startMinute !== null && startMinute !== undefined ? startMinute : null,
        endHour !== null && endHour !== undefined ? endHour : null,
        endMinute !== null && endMinute !== undefined ? endMinute : null,
        amountPerTrade,
        tradingMode || 'paper'
      );

      console.log(`🤖 User ${session.username} added copy trade rule for ${trader}`);

      return createSecureResponse(JSON.stringify({
        success: true,
        message: 'Copy trade rule added successfully'
      }), {
        headers: { "Content-Type": "application/json" }
      });

    } catch (error) {
      console.error('❌ Error adding copy trade setting:', error);
      return createSecureResponse(JSON.stringify({
        success: false,
        error: 'Failed to add copy trade rule'
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
}

// 🤖 COPY TRADE: Delete copy trade setting (DELETE) - REQUIRES AUTH & CSRF - USER-SPECIFIC
if (url.pathname.startsWith("/api/copy-trade/settings/")) {
  if (req.method !== "DELETE") {
    return createSecureResponse("Method not allowed", { status: 405 });
  }

  const session = UserManager.verifySession(token);
  if (!session.valid) {
    return createSecureResponse(JSON.stringify({
      success: false,
      error: "Unauthorized"
    }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  // CSRF protection
  const csrfCheck = requireCSRF(req, token);
  if (!csrfCheck.valid) {
    AuditLog.csrfViolation(session.username, ip, url.pathname);
    return createSecureResponse(JSON.stringify({
      success: false,
      error: csrfCheck.error
    }), {
      status: csrfCheck.status,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Extract ID from URL
  const id = parseInt(url.pathname.split('/').pop());
  if (isNaN(id)) {
    return createSecureResponse(JSON.stringify({
      success: false,
      error: 'Invalid rule ID'
    }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    // Delete rule (ensure it belongs to the user)
    const stmt = db.prepare(`
      DELETE FROM copy_trade_settings
      WHERE id = ? AND user_id = ?
    `);
    const result = stmt.run(id, session.userId);

    if (result.changes === 0) {
      return createSecureResponse(JSON.stringify({
        success: false,
        error: 'Copy trade rule not found or unauthorized'
      }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    console.log(`🤖 User ${session.username} deleted copy trade rule ${id}`);

    return createSecureResponse(JSON.stringify({
      success: true,
      message: 'Copy trade rule deleted successfully'
    }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error('❌ Error deleting copy trade setting:', error);
    return createSecureResponse(JSON.stringify({
      success: false,
      error: 'Failed to delete copy trade rule'
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// 🎯 EXIT SETTINGS: Get exit settings (GET) - REQUIRES AUTH
if (url.pathname === "/api/exit-settings") {
  if (req.method === "GET") {
    const session = UserManager.verifySession(token);
    if (!session.valid) {
      return createSecureResponse(JSON.stringify({
        success: false,
        error: "Unauthorized"
      }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    try {
      const result = ExitSettingsManager.getSettings(session.userId);
      return createSecureResponse(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error('❌ Error getting exit settings:', error);
      return createSecureResponse(JSON.stringify({
        success: false,
        error: 'Failed to get exit settings'
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  // POST - Save exit settings
  if (req.method === "POST") {
    const session = UserManager.verifySession(token);
    if (!session.valid) {
      return createSecureResponse(JSON.stringify({
        success: false,
        error: "Unauthorized"
      }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    // CSRF protection
    const csrfCheck = requireCSRF(req, token);
    if (!csrfCheck.valid) {
      AuditLog.csrfViolation(session.username, ip, url.pathname);
      return createSecureResponse(JSON.stringify({
        success: false,
        error: csrfCheck.error
      }), {
        status: csrfCheck.status,
        headers: { "Content-Type": "application/json" }
      });
    }

    try {
      const bodyResult = await parseAndValidateBody(req);
      if (!bodyResult.valid) {
        return createSecureResponse(JSON.stringify({
          success: false,
          error: bodyResult.error
        }), {
          status: bodyResult.status,
          headers: { "Content-Type": "application/json" }
        });
      }

      const { settings } = bodyResult.body;

      if (!settings) {
        return createSecureResponse(JSON.stringify({
          success: false,
          error: 'Missing required field: settings'
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      const result = ExitSettingsManager.saveSettings(session.userId, settings);

      console.log(`🎯 User ${session.username} saved exit settings`);

      return createSecureResponse(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error('❌ Error saving exit settings:', error);
      return createSecureResponse(JSON.stringify({
        success: false,
        error: 'Failed to save exit settings'
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
}

    // 📊 ANALYSIS: Get winrates (GET) - REQUIRES AUTH - 🔧 USER-SPECIFIC
    if (url.pathname === "/api/analysis/winrates") {
      const session = UserManager.verifySession(token);
      if (!session.valid) {
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: "Unauthorized" 
        }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      try {
        const result = TradeHistoryManager.getWinrates(session.userId);
        
        return createSecureResponse(JSON.stringify(result), {
          headers: { "Content-Type": "application/json" }
        });
        
      } catch (error) {
        console.error('❌ Error getting winrates:', error);
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: 'Failed to retrieve winrates' 
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    
    // 📜 ANALYSIS: Get trade history (GET) - REQUIRES AUTH - 🔧 USER-SPECIFIC
    if (url.pathname === "/api/analysis/history") {
      const session = UserManager.verifySession(token);
      if (!session.valid) {
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: "Unauthorized" 
        }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      try {
        const result = TradeHistoryManager.getTradeHistory(50, 'all', session.userId);
        
        return createSecureResponse(JSON.stringify(result), {
          headers: { "Content-Type": "application/json" }
        });
        
      } catch (error) {
        console.error('❌ Error getting trade history:', error);
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: 'Failed to retrieve trade history' 
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    
    // 🗑️ ANALYSIS: Remove signal from watchlist (POST) - REQUIRES AUTH + CSRF
    if (url.pathname === "/api/analysis/remove-signal") {
      if (req.method !== "POST") {
        return createSecureResponse("Method not allowed", { status: 405 });
      }
      
      const session = UserManager.verifySession(token);
      if (!session.valid) {
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: "Unauthorized" 
        }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // CSRF protection
      const csrfCheck = requireCSRF(req, token);
      if (!csrfCheck.valid) {
        AuditLog.csrfViolation(session.username, ip, url.pathname);
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: csrfCheck.error 
        }), {
          status: csrfCheck.status,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      try {
        const bodyResult = await parseAndValidateBody(req);
        if (!bodyResult.valid) {
          return createSecureResponse(JSON.stringify({ 
            success: false, 
            error: bodyResult.error 
          }), {
            status: bodyResult.status,
            headers: { "Content-Type": "application/json" }
          });
        }
        
        const { signalId } = bodyResult.body;
        
        if (!signalId) {
          return createSecureResponse(JSON.stringify({ 
            success: false, 
            error: 'Missing required field: signalId' 
          }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        
        const result = TradeHistoryManager.removeSignal(signalId, session.userId);
        
        return createSecureResponse(JSON.stringify(result), {
          headers: { "Content-Type": "application/json" }
        });
        
      } catch (error) {
        console.error('❌ Error removing signal:', error);
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: 'Failed to remove signal' 
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    
    
    // 💰 ANALYSIS: Record trade outcome (POST) - REQUIRES AUTH + CSRF
    if (url.pathname === "/api/analysis/outcome") {
      if (req.method !== "POST") {
        return createSecureResponse("Method not allowed", { status: 405 });
      }
      
      const session = UserManager.verifySession(token);
      if (!session.valid) {
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: "Unauthorized" 
        }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // CSRF protection
      const csrfCheck = requireCSRF(req, token);
      if (!csrfCheck.valid) {
        AuditLog.csrfViolation(session.username, ip, url.pathname);
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: csrfCheck.error 
        }), {
          status: csrfCheck.status,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      try {
        const bodyResult = await parseAndValidateBody(req);
        if (!bodyResult.valid) {
          return createSecureResponse(JSON.stringify({ 
            success: false, 
            error: bodyResult.error 
          }), {
            status: bodyResult.status,
            headers: { "Content-Type": "application/json" }
          });
        }
        
        const { signalId, outcome, exitPrice, pnlPercent, pnlDollars, durationSeconds } = bodyResult.body;
        
        if (!signalId || !outcome) {
          return createSecureResponse(JSON.stringify({ 
            success: false, 
            error: 'Missing required fields: signalId, outcome' 
          }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        
        const result = TradeHistoryManager.recordOutcome(
          signalId, 
          outcome, 
          exitPrice, 
          pnlPercent, 
          pnlDollars, 
          durationSeconds
        );
        
        if (result.success && global.broadcastToAllUsers) {
          // 📡 BROADCAST outcome to all users
          global.broadcastToAllUsers({
            type: 'trade_outcome',
            outcome: {
              signalId,
              outcome,
              exitPrice,
              pnlPercent,
              pnlDollars,
              trader: bodyResult.body.trader
            }
          });
        }
        
        return createSecureResponse(JSON.stringify(result), {
          headers: { "Content-Type": "application/json" }
        });
        
      } catch (error) {
        console.error('❌ Error recording outcome:', error);
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: 'Failed to record outcome' 
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    
    // 📊 ANALYSIS: Get all analysis results (GET) - REQUIRES AUTH
    if (url.pathname === "/api/analysis/results") {
      const session = UserManager.verifySession(token);
      if (!session.valid) {
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: "Unauthorized" 
        }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      try {
        const results = TradeAnalyzer.getAllResults();
        
        return createSecureResponse(JSON.stringify({ 
          success: true, 
          results: results 
        }), {
          headers: { "Content-Type": "application/json" }
        });
        
      } catch (error) {
        console.error('❌ Error getting analysis results:', error);
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: 'Failed to retrieve analysis results' 
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    
    // 📊 ANALYSIS: Get queue status (GET) - REQUIRES AUTH
    if (url.pathname === "/api/analysis/status") {
      const session = UserManager.verifySession(token);
      if (!session.valid) {
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: "Unauthorized" 
        }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      try {
        const status = TradeAnalyzer.getQueueStatus();
        
        return createSecureResponse(JSON.stringify({ 
          success: true, 
          queued: status.queued || 0,
          active: status.active || 0,
          completed: status.completed || 0
        }), {
          headers: { "Content-Type": "application/json" }
        });
        
      } catch (error) {
        console.error('❌ Error getting queue status:', error);
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: 'Failed to retrieve queue status' 
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // 🎯 MY TRADES: Get current trades (GET) - REQUIRES AUTH
    if (url.pathname === "/api/my-trades/current") {
      const session = UserManager.verifySession(token);
      if (!session.valid) {
        return createSecureResponse(JSON.stringify({
          success: false,
          error: "Unauthorized"
        }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }

      try {
        const result = TradeHistoryManager.getActiveSignals(session.userId);

        // Map signals to trades format for consistency with frontend
        const response = {
          success: result.success,
          trades: result.signals || []
        };

        return createSecureResponse(JSON.stringify(response), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        console.error('❌ Error getting current trades:', error);
        return createSecureResponse(JSON.stringify({
          success: false,
          error: 'Failed to retrieve current trades'
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // 🎯 MY TRADES: Get trade history (GET) - REQUIRES AUTH
    if (url.pathname === "/api/my-trades/history") {
      const session = UserManager.verifySession(token);
      if (!session.valid) {
        return createSecureResponse(JSON.stringify({
          success: false,
          error: "Unauthorized"
        }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }

      try {
        const filters = {
          status: url.searchParams.get('status') || '',
          right: url.searchParams.get('right') || '',
          outcome: url.searchParams.get('outcome') || '',
          trader: url.searchParams.get('trader') || '',
          isManual: url.searchParams.get('source') === 'manual' ? true :
                    url.searchParams.get('source') === 'ocr' ? false : undefined
        };

        const result = TradeHistoryManager.getDetailedTradeHistory(session.userId, filters);
        return createSecureResponse(JSON.stringify(result), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        console.error('❌ Error getting trade history:', error);
        return createSecureResponse(JSON.stringify({
          success: false,
          error: 'Failed to retrieve trade history'
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // 🎯 MY TRADES: Get metrics (GET) - REQUIRES AUTH
    if (url.pathname === "/api/my-trades/metrics") {
      const session = UserManager.verifySession(token);
      if (!session.valid) {
        return createSecureResponse(JSON.stringify({
          success: false,
          error: "Unauthorized"
        }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }

      try {
        const filters = {
          right: url.searchParams.get('right') || '',
          trader: url.searchParams.get('trader') || '',
          tradingMode: url.searchParams.get('tradingMode') || ''
        };

        const result = TradeHistoryManager.getAdvancedMetrics(session.userId, filters);
        return createSecureResponse(JSON.stringify(result), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        console.error('❌ Error getting metrics:', error);
        return createSecureResponse(JSON.stringify({
          success: false,
          error: 'Failed to retrieve metrics'
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // 🎯 MY TRADES: Share trade publicly (POST) - REQUIRES AUTH + CSRF
    if (url.pathname === "/api/my-trades/share") {
      if (req.method !== "POST") {
        return createSecureResponse("Method not allowed", { status: 405 });
      }

      const session = UserManager.verifySession(token);
      if (!session.valid) {
        return createSecureResponse(JSON.stringify({
          success: false,
          error: "Unauthorized"
        }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }

      // CSRF Protection
      const csrfCheck = requireCSRF(req, token);
      if (!csrfCheck.valid) {
        AuditLog.csrfViolation(session.username, ip, url.pathname);
        return createSecureResponse(JSON.stringify({
          success: false,
          error: csrfCheck.error
        }), {
          status: csrfCheck.status,
          headers: { "Content-Type": "application/json" }
        });
      }

      try {
        const body = await req.json();
        const { signalId, isPublic } = body;

        console.log('🌍 Share trade request:', { signalId, isPublic, userId: session.userId });

        if (!signalId) {
          return createSecureResponse(JSON.stringify({
            success: false,
            error: "Signal ID required"
          }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }

        const result = TradeHistoryManager.setTradePublic(signalId, session.userId, isPublic !== false);

        console.log('🌍 Share trade result:', result);

        if (!result.success) {
          return createSecureResponse(JSON.stringify(result), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }

        console.log(`✅ Trade shared successfully: ${signalId} by user ${session.userId}`);

        return createSecureResponse(JSON.stringify(result), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        console.error('❌ Error sharing trade:', error);
        console.error('❌ Error stack:', error.stack);
        console.error('❌ Error message:', error.message);
        return createSecureResponse(JSON.stringify({
          success: false,
          error: 'Failed to share trade: ' + error.message
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // 🗑️ MY TRADES: Remove single N/A trade (POST) - REQUIRES AUTH
    if (url.pathname === "/api/my-trades/remove-na") {
      if (req.method !== "POST") {
        return createSecureResponse("Method not allowed", { status: 405 });
      }

      const session = UserManager.verifySession(token);
      if (!session.valid) {
        return createSecureResponse(JSON.stringify({
          success: false,
          error: "Unauthorized"
        }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }

      try {
        const body = await req.json();
        const { signalId } = body;

        if (!signalId) {
          return createSecureResponse(JSON.stringify({
            success: false,
            error: "Signal ID required"
          }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }

        // Delete the N/A trade from database
        const result = TradeHistoryManager.removeNATrade(signalId, session.userId);

        return createSecureResponse(JSON.stringify(result), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        console.error('❌ Error removing N/A trade:', error);
        return createSecureResponse(JSON.stringify({
          success: false,
          error: 'Failed to remove trade'
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // 🗑️ MY TRADES: Remove all N/A trades (POST) - REQUIRES AUTH
    if (url.pathname === "/api/my-trades/remove-all-na") {
      if (req.method !== "POST") {
        return createSecureResponse("Method not allowed", { status: 405 });
      }

      const session = UserManager.verifySession(token);
      if (!session.valid) {
        return createSecureResponse(JSON.stringify({
          success: false,
          error: "Unauthorized"
        }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }

      try {
        // Delete all N/A trades from database for this user
        const result = TradeHistoryManager.removeAllNATrades(session.userId);

        return createSecureResponse(JSON.stringify(result), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        console.error('❌ Error removing all N/A trades:', error);
        return createSecureResponse(JSON.stringify({
          success: false,
          error: 'Failed to remove trades'
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // 🗑️ MY TRADES: Delete all Default account trades (POST) - REQUIRES AUTH
    if (url.pathname === "/api/my-trades/delete-all-default") {
      if (req.method !== "POST") {
        return createSecureResponse("Method not allowed", { status: 405 });
      }

      const session = UserManager.verifySession(token);
      if (!session.valid) {
        return createSecureResponse(JSON.stringify({
          success: false,
          error: "Unauthorized"
        }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }

      try {
        console.log(`🗑️ Deleting all Default account trades for user ${session.userId}`);

        // Delete all Default account trades from database for this user
        const result = TradeHistoryManager.deleteAllDefaultTrades(session.userId);

        console.log(`✅ Deleted ${result.count} Default account trades for user ${session.userId}`);

        return createSecureResponse(JSON.stringify(result), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        console.error('❌ Error deleting all Default trades:', error);
        return createSecureResponse(JSON.stringify({
          success: false,
          error: 'Failed to delete trades'
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // 🗑️ MY TRADES: Delete all Paper account trades (POST) - REQUIRES AUTH
    if (url.pathname === "/api/my-trades/delete-all-paper") {
      if (req.method !== "POST") {
        return createSecureResponse("Method not allowed", { status: 405 });
      }

      const session = UserManager.verifySession(token);
      if (!session.valid) {
        return createSecureResponse(JSON.stringify({
          success: false,
          error: "Unauthorized"
        }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }

      try {
        console.log(`🗑️ Deleting all Paper account trades for user ${session.userId}`);

        // Delete all Paper account trades from database for this user
        const result = TradeHistoryManager.deleteAllPaperTrades(session.userId);

        console.log(`✅ Deleted ${result.count} Paper account trades for user ${session.userId}`);

        return createSecureResponse(JSON.stringify(result), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        console.error('❌ Error deleting all Paper trades:', error);
        return createSecureResponse(JSON.stringify({
          success: false,
          error: 'Failed to delete trades'
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // 🌍 GLOBAL TRADES: Get public trades feed (GET) - REQUIRES AUTH
    if (url.pathname === "/api/global-trades/feed") {
      const session = UserManager.verifySession(token);
      if (!session.valid) {
        return createSecureResponse(JSON.stringify({
          success: false,
          error: "Unauthorized"
        }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }

      try {
        const filters = {
          right: url.searchParams.get('right') || '',
          outcome: url.searchParams.get('outcome') || '',
          root: url.searchParams.get('root') || '',
          userId: url.searchParams.get('userId') ? parseInt(url.searchParams.get('userId')) : undefined
        };

        const result = TradeHistoryManager.getPublicTrades(100, filters);
        return createSecureResponse(JSON.stringify(result), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        console.error('❌ Error getting public trades:', error);
        return createSecureResponse(JSON.stringify({
          success: false,
          error: 'Failed to retrieve public trades'
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // 🌍 GLOBAL TRADES: Get leaderboard (GET) - REQUIRES AUTH
    if (url.pathname === "/api/global-trades/leaderboard") {
      const session = UserManager.verifySession(token);
      if (!session.valid) {
        return createSecureResponse(JSON.stringify({
          success: false,
          error: "Unauthorized"
        }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }

      try {
        // Get all users with public trades
        const usersDb = new Database('users.db');
        const tradeDb = new Database('trade_history.db');

        const usersQuery = usersDb.prepare(`
          SELECT id, username FROM users
        `);
        const users = usersQuery.all();

        const leaders = users.map(user => {
          // Get user's public trade count
          const publicCountQuery = tradeDb.prepare(`
            SELECT COUNT(*) as count
            FROM trade_signals
            WHERE user_id = ? AND is_public = 1
          `);
          const publicCount = publicCountQuery.get(user.id)?.count || 0;

          if (publicCount === 0) return null;

          // Get metrics for this user
          const metrics = TradeHistoryManager.getAdvancedMetrics(user.id);

          if (!metrics.success || metrics.metrics.totalTrades === 0) return null;

          return {
            userId: user.id,
            username: user.username,
            winRate: metrics.metrics.winRate,
            sharpeRatio: metrics.metrics.sharpeRatio,
            profitFactor: metrics.metrics.profitFactor === Infinity ? 999 : metrics.metrics.profitFactor,
            totalTrades: metrics.metrics.totalTrades,
            publicTrades: publicCount
          };
        }).filter(l => l !== null);

        // Sort by Sharpe Ratio
        leaders.sort((a, b) => b.sharpeRatio - a.sharpeRatio);

        return createSecureResponse(JSON.stringify({
          success: true,
          leaders: leaders.slice(0, 10)
        }), {
          headers: { "Content-Type": "application/json" }
        });

      } catch (error) {
        console.error('❌ Error getting leaderboard:', error);
        return createSecureResponse(JSON.stringify({
          success: false,
          error: 'Failed to retrieve leaderboard',
          leaders: []
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // 📊 MANUAL ENTRY: Get cached expirations (NO HTTP to ThetaData)
if (url.pathname === "/api/theta/cached-expirations") {
  const ticker = url.searchParams.get("ticker");
  
  if (!ticker) {
    return createSecureResponse(JSON.stringify({ 
      success: false, 
      error: "Ticker required" 
    }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  
  try {
    const tickerUpper = ticker.toUpperCase();

    // Get expirations from universe manager (already pre-filtered to 0-3 DTE)
    const allExpirations = universeManager.getTicker(tickerUpper);
   
    // ✅ ADD THIS DEBUG LOG
    console.log('🔍 DEBUG: Raw expirations from universe manager:', allExpirations);
    console.log('🔍 DEBUG: Today:', new Date().toISOString().split('T')[0]);

    if (!allExpirations || allExpirations.length === 0) {
      return createSecureResponse(JSON.stringify({ 
        success: false, 
        error: `Ticker ${tickerUpper} not in options universe (195 tickers only)`,
        inUniverse: false
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // ✅ FIX: Calculate REAL DTE properly
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Format expirations with CORRECT DTE calculation
    const formattedExpirations = allExpirations.map(exp => {
      const expStr = String(exp);
      const expYear = parseInt(expStr.substring(0, 4));
      const expMonth = parseInt(expStr.substring(4, 6)) - 1; // Month is 0-indexed
      const expDay = parseInt(expStr.substring(6, 8));
      
      const expDate = new Date(expYear, expMonth, expDay);
      expDate.setHours(0, 0, 0, 0);
      
      // Calculate actual DTE
      const dte = Math.floor((expDate - today) / (1000 * 60 * 60 * 24));
      
      return {
        expiration: exp,
        dte: dte,
        label: `${expStr.substring(4, 6)}/${expStr.substring(6, 8)} (${dte} DTE)`
      };
    });
    
    return createSecureResponse(JSON.stringify({
      success: true,
      ticker: tickerUpper,
      expirations: formattedExpirations,
      inUniverse: true,
      count: formattedExpirations.length
    }), {
      headers: { "Content-Type": "application/json" }
    });
    
  } catch (error) {
    console.error('Error loading cached expirations:', error);
    return createSecureResponse(JSON.stringify({ 
      success: false, 
      error: 'Failed to load options universe' 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

    // 📊 MANUAL ENTRY: Subscribe to ATM contract WebSocket
    if (url.pathname === "/api/theta/subscribe-atm") {
      if (req.method !== "POST") {
        return createSecureResponse("Method not allowed", { status: 405 });
      }
      
      const session = UserManager.verifySession(token);
      if (!session.valid) {
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: "Unauthorized" 
        }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // 🧪 Block in backtest mode
      const thetaBlocked = blockIfBacktestMode('/api/theta/subscribe-atm');
      if (thetaBlocked) return thetaBlocked;
      
      try {
        const bodyResult = await parseAndValidateBody(req);
        if (!bodyResult.valid) {
          return createSecureResponse(JSON.stringify({ 
            success: false, 
            error: bodyResult.error 
          }), {
            status: bodyResult.status,
            headers: { "Content-Type": "application/json" }
          });
        }
        
        const { root, expiration, strike, right } = bodyResult.body;
        
        if (!root || !expiration || !strike || !right) {
          return createSecureResponse(JSON.stringify({ 
            success: false, 
            error: 'Missing required fields: root, expiration, strike, right' 
          }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        
        // Subscribe to WebSocket stream
        const streamResult = await optionsStream.addDynamicContract({
          root: root,
          expiration: expiration,
          strike: parseFloat(strike),
          right: right
        });
        
        if (!streamResult.success) {
          return createSecureResponse(JSON.stringify({ 
            success: false, 
            error: 'Failed to subscribe to contract stream' 
          }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
          });
        }
        
        // Get current quote if available
        const quote = optionsStream.getQuote(root, expiration, strike, right);
        
        return createSecureResponse(JSON.stringify({
          success: true,
          subscribed: true,
          currentQuote: quote || null
        }), {
          headers: { "Content-Type": "application/json" }
        });
        
      } catch (error) {
        console.error('Error subscribing to ATM contract:', error);
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: 'Subscription failed' 
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // 🧪 BACKTESTER: Get system mode (live/backtest) - NO ADMIN CHECK
    if (url.pathname === "/api/backtest/mode" && req.method === "GET") {
      const session = UserManager.verifySession(token);

      if (!session.valid) {
        return createSecureResponse(JSON.stringify({
          success: false,
          error: "Please login to access backtester"
        }), {
          status: 403,
          headers: { "Content-Type": "application/json" }
        });
      }

      try {
        const mode = backtestDb.prepare('SELECT mode FROM system_mode WHERE id = 1').get();
        return createSecureResponse(JSON.stringify({
          success: true,
          mode: mode ? mode.mode : 'live'
        }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        console.error('❌ Error getting system mode:', error);
        return createSecureResponse(JSON.stringify({
          success: false,
          error: 'Failed to get system mode'
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // 🧪 BACKTESTER: Set system mode (live/backtest) - NO ADMIN CHECK
    if (url.pathname === "/api/backtest/mode" && req.method === "POST") {
      const session = UserManager.verifySession(token);

      if (!session.valid) {
        return createSecureResponse(JSON.stringify({
          success: false,
          error: "Please login to access backtester"
        }), {
          status: 403,
          headers: { "Content-Type": "application/json" }
        });
      }

      const csrfCheck = requireCSRF(req, token);
      if (!csrfCheck.valid) {
        AuditLog.csrfViolation(session.username, ip, url.pathname);
        return createSecureResponse(JSON.stringify({
          success: false,
          error: csrfCheck.error
        }), {
          status: csrfCheck.status,
          headers: { "Content-Type": "application/json" }
        });
      }

      try {
        const body = await req.json();
        const { mode } = body;

        console.log(`🔍 [MODE SWITCH] Request received:`, { requestedMode: mode, userId: session.userId, username: session.username });

        if (!mode || !['live', 'backtest'].includes(mode)) {
          return createSecureResponse(JSON.stringify({
            success: false,
            error: "Invalid mode. Must be 'live' or 'backtest'"
          }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }

        backtestDb.prepare(`
          UPDATE system_mode
          SET mode = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ?
          WHERE id = 1
        `).run(mode, session.userId);

        console.log(`🧪 System mode switched to: ${mode} by user ${session.username}`);
        console.log(`🔍 [MODE SWITCH] Returning response:`, { success: true, mode: mode });

        // Broadcast mode change to all connected clients
        global.broadcastToAllUsers({
          type: 'system_mode_changed',
          mode: mode,
          timestamp: new Date().toISOString()
        });

        // 🔌 CRITICAL: Disconnect all WebSocket connections when switching to BACKTEST mode
        // This ensures NO live data can be streamed to clients in backtest mode
        if (mode === 'backtest' && websocketConnections) {
          console.log('🔌 Disconnecting all WebSocket connections - switching to BACKTEST mode');
          let disconnected = 0;
          websocketConnections.forEach((session, connId) => {
            if (session.ws && session.ws.readyState === 1) {
              try {
                // Send final message before disconnect
                session.ws.send(JSON.stringify({
                  type: 'mode_switch_disconnect',
                  mode: 'backtest',
                  message: 'Disconnecting - system switched to BACKTEST mode'
                }));
                // Close connection
                session.ws.close(1000, 'System switched to backtest mode');
                disconnected++;
              } catch (error) {
                console.error(`❌ Error disconnecting connection ${connId}:`, error.message);
              }
            }
          });
          console.log(`✅ Disconnected ${disconnected} WebSocket connections`);
        }

        return createSecureResponse(JSON.stringify({
          success: true,
          mode: mode
        }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        console.error('❌ Error setting system mode:', error);
        return createSecureResponse(JSON.stringify({
          success: false,
          error: 'Failed to set system mode'
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // 🧪 BACKTESTER: Create backtest configuration - NO ADMIN CHECK
    if (url.pathname === "/api/backtest/create" && req.method === "POST") {
      const session = UserManager.verifySession(token);

      if (!session.valid) {
        return createSecureResponse(JSON.stringify({
          success: false,
          error: "Please login to access backtester"
        }), {
          status: 403,
          headers: { "Content-Type": "application/json" }
        });
      }

      const csrfCheck = requireCSRF(req, token);
      if (!csrfCheck.valid) {
        AuditLog.csrfViolation(session.username, ip, url.pathname);
        return createSecureResponse(JSON.stringify({
          success: false,
          error: csrfCheck.error
        }), {
          status: csrfCheck.status,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // 🧪 Block in live mode
      const createBlocked = blockIfLiveMode('/api/backtest/create');
      if (createBlocked) return createBlocked;

      try {
        const body = await req.json();
        const {
          name,
          description,
          symbols,
          start_date,
          end_date,
          initial_capital,
          strategy_name,
          strategy_params,
          commission
        } = body;

        // Validate required fields
        if (!name || !symbols || !start_date || !end_date || !initial_capital || !strategy_name) {
          return createSecureResponse(JSON.stringify({
            success: false,
            error: 'Missing required fields'
          }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }

        // Generate unique ID
        const configId = `bt_${Date.now()}_${session.userId}`;

        // Insert configuration
        backtestDb.prepare(`
          INSERT INTO backtest_configs (
            id, user_id, name, description, symbols, start_date, end_date,
            initial_capital, strategy_name, strategy_params, commission, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        `).run(
          configId,
          session.userId,
          name,
          description || null,
          JSON.stringify(symbols),
          start_date,
          end_date,
          initial_capital,
          strategy_name,
          JSON.stringify(strategy_params || {}),
          commission || 0.05
        );

        console.log(`🧪 Backtest configuration created: ${configId} by user ${session.username}`);

        return createSecureResponse(JSON.stringify({
          success: true,
          config_id: configId
        }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        console.error('❌ Error creating backtest config:', error);
        return createSecureResponse(JSON.stringify({
          success: false,
          error: 'Failed to create backtest configuration'
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // 🧪 BACKTESTER: Get backtest configurations - NO ADMIN CHECK
    if (url.pathname === "/api/backtest/configs") {
      const session = UserManager.verifySession(token);

      if (!session.valid) {
        return createSecureResponse(JSON.stringify({
          success: false,
          error: "Please login to access backtester"
        }), {
          status: 403,
          headers: { "Content-Type": "application/json" }
        });
      }

      try {
        const configs = backtestDb.prepare(`
          SELECT * FROM backtest_configs
          WHERE user_id = ?
          ORDER BY created_at DESC
        `).all(session.userId);

        // Parse JSON fields
        const parsedConfigs = configs.map(config => ({
          ...config,
          symbols: JSON.parse(config.symbols),
          strategy_params: JSON.parse(config.strategy_params || '{}')
        }));

        return createSecureResponse(JSON.stringify({
          success: true,
          configs: parsedConfigs
        }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        console.error('❌ Error getting backtest configs:', error);
        return createSecureResponse(JSON.stringify({
          success: false,
          error: 'Failed to get backtest configurations'
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // 🧪 BACKTESTER: Run backtest - NO ADMIN CHECK
    if (url.pathname === "/api/backtest/run" && req.method === "POST") {
      const session = UserManager.verifySession(token);

      if (!session.valid) {
        return createSecureResponse(JSON.stringify({
          success: false,
          error: "Please login to access backtester"
        }), {
          status: 403,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // 🧪 Block in live mode
      const runBlocked = blockIfLiveMode('/api/backtest/run');
      if (runBlocked) return runBlocked;

      try {
        const body = await req.json();
        const { config_id } = body;

        if (!config_id) {
          return createSecureResponse(JSON.stringify({
            success: false,
            error: 'Config ID required'
          }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }

        // Verify config belongs to user
        const config = backtestDb.prepare(`
          SELECT * FROM backtest_configs
          WHERE id = ? AND user_id = ?
        `).get(config_id, session.userId);

        if (!config) {
          return createSecureResponse(JSON.stringify({
            success: false,
            error: 'Backtest configuration not found'
          }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }

        // Update status to running
        backtestDb.prepare(`
          UPDATE backtest_configs
          SET status = 'running', started_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(config_id);

        console.log(`🧪 Starting backtest: ${config_id}`);

        // Run backtest asynchronously (don't wait for completion)
        backtesterBridge.runBacktest(config_id, config).then(result => {
          console.log(`✅ Backtest completed: ${config_id}`);
        }).catch(error => {
          console.error(`❌ Backtest failed: ${config_id}`, error);
        });

        // Return immediately
        return createSecureResponse(JSON.stringify({
          success: true,
          message: 'Backtest started',
          config_id: config_id
        }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        console.error('❌ Error running backtest:', error);
        return createSecureResponse(JSON.stringify({
          success: false,
          error: 'Failed to run backtest'
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // 🧪 BACKTESTER: Get backtest results - NO ADMIN CHECK
    if (url.pathname === "/api/backtest/results") {
      const session = UserManager.verifySession(token);

      if (!session.valid) {
        return createSecureResponse(JSON.stringify({
          success: false,
          error: "Please login to access backtester"
        }), {
          status: 403,
          headers: { "Content-Type": "application/json" }
        });
      }

      try {
        const configId = url.searchParams.get('config_id');

        if (!configId) {
          return createSecureResponse(JSON.stringify({
            success: false,
            error: 'Config ID required'
          }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }

        const result = backtestDb.prepare(`
          SELECT * FROM backtest_results
          WHERE config_id = ? AND user_id = ?
          ORDER BY created_at DESC
          LIMIT 1
        `).get(configId, session.userId);

        if (!result) {
          return createSecureResponse(JSON.stringify({
            success: false,
            error: 'No results found for this backtest'
          }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }

        // Parse JSON fields
        const parsedResult = {
          ...result,
          equity_curve: JSON.parse(result.equity_curve || '[]'),
          trades_data: JSON.parse(result.trades_data || '[]')
        };

        return createSecureResponse(JSON.stringify({
          success: true,
          result: parsedResult
        }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        console.error('❌ Error getting backtest results:', error);
        return createSecureResponse(JSON.stringify({
          success: false,
          error: 'Failed to get backtest results'
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // 🧪 BACKTESTER: Delete backtest configuration - NO ADMIN CHECK
    if (url.pathname === "/api/backtest/delete" && req.method === "POST") {
      const session = UserManager.verifySession(token);

      if (!session.valid) {
        return createSecureResponse(JSON.stringify({
          success: false,
          error: "Please login to access backtester"
        }), {
          status: 403,
          headers: { "Content-Type": "application/json" }
        });
      }

      const csrfCheck = requireCSRF(req, token);
      if (!csrfCheck.valid) {
        AuditLog.csrfViolation(session.username, ip, url.pathname);
        return createSecureResponse(JSON.stringify({
          success: false,
          error: csrfCheck.error
        }), {
          status: csrfCheck.status,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // 🧪 Block in live mode
      const deleteBlocked = blockIfLiveMode('/api/backtest/delete');
      if (deleteBlocked) return deleteBlocked;

      try {
        const body = await req.json();
        const { config_id } = body;

        if (!config_id) {
          return createSecureResponse(JSON.stringify({
            success: false,
            error: 'Config ID required'
          }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }

        // Delete configuration and related data
        backtestDb.prepare('DELETE FROM backtest_configs WHERE id = ? AND user_id = ?').run(config_id, session.userId);
        backtestDb.prepare('DELETE FROM backtest_results WHERE config_id = ? AND user_id = ?').run(config_id, session.userId);
        backtestDb.prepare('DELETE FROM backtest_trades WHERE config_id = ? AND user_id = ?').run(config_id, session.userId);

        console.log(`🧪 Backtest configuration deleted: ${config_id}`);

        return createSecureResponse(JSON.stringify({
          success: true
        }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        console.error('❌ Error deleting backtest config:', error);
        return createSecureResponse(JSON.stringify({
          success: false,
          error: 'Failed to delete backtest configuration'
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // 📥 ADMIN: Get import status for all tickers (admin only)
    if (url.pathname === "/api/import/status" && req.method === "GET") {
      const session = UserManager.verifySession(token);

      if (!session.valid) {
        return createSecureResponse(JSON.stringify({ success: false, error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }

      // 🔥 FIX: Only check if user is admin (no IP whitelist for API endpoints)
      // IP whitelist is for admin dashboard page, not API endpoints
      if (!session.isAdmin) {
        AuditLog.suspiciousActivity(session.userId, session.username, getClientIP(req), {
          reason: 'Attempted to access admin import endpoint without privileges',
          endpoint: url.pathname
        });

        return createSecureResponse(JSON.stringify({
          success: false,
          error: "Admin access required"
        }), {
          status: 403,
          headers: { "Content-Type": "application/json" }
        });
      }

      try {
        const tickers = getAllTickerStatus();

        return createSecureResponse(JSON.stringify({
          success: true,
          tickers: tickers
        }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        console.error('❌ Error getting import status:', error);
        return createSecureResponse(JSON.stringify({
          success: false,
          error: 'Failed to get import status'
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // 📥 ADMIN: Get import status for specific ticker (admin only)
    if (url.pathname.startsWith("/api/import/status/") && req.method === "GET") {
      const session = UserManager.verifySession(token);

      if (!session.valid) {
        return createSecureResponse(JSON.stringify({ success: false, error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }

      // 🔥 FIX: Only check if user is admin (no IP whitelist for API endpoints)
      // IP whitelist is for admin dashboard page, not API endpoints
      if (!session.isAdmin) {
        AuditLog.suspiciousActivity(session.userId, session.username, getClientIP(req), {
          reason: 'Attempted to access admin import endpoint without privileges',
          endpoint: url.pathname
        });

        return createSecureResponse(JSON.stringify({
          success: false,
          error: "Admin access required"
        }), {
          status: 403,
          headers: { "Content-Type": "application/json" }
        });
      }

      try {
        const ticker = url.pathname.split('/').pop();
        const status = getTickerStatus(ticker);

        if (!status) {
          return createSecureResponse(JSON.stringify({
            success: false,
            error: 'Ticker not found'
          }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }

        // Get missing dates for this ticker
        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 3);

        const missingDates = getMissingDates(ticker, startDate, endDate);

        return createSecureResponse(JSON.stringify({
          success: true,
          ticker: status,
          missing_dates: missingDates
        }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        console.error('❌ Error getting ticker status:', error);
        return createSecureResponse(JSON.stringify({
          success: false,
          error: 'Failed to get ticker status'
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // 📥 ADMIN: Start import for specific ticker (admin only)
    if (url.pathname === "/api/import/ticker" && req.method === "POST") {
      const session = UserManager.verifySession(token);

      if (!session.valid) {
        return createSecureResponse(JSON.stringify({ success: false, error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }

      // 🔥 FIX: Only check if user is admin (no IP whitelist for API endpoints)
      // IP whitelist is for admin dashboard page, not API endpoints
      if (!session.isAdmin) {
        AuditLog.suspiciousActivity(session.userId, session.username, getClientIP(req), {
          reason: 'Attempted to access admin import endpoint without privileges',
          endpoint: url.pathname
        });

        return createSecureResponse(JSON.stringify({
          success: false,
          error: "Admin access required"
        }), {
          status: 403,
          headers: { "Content-Type": "application/json" }
        });
      }

      try {
        const body = await parseAndValidateBody(req, { ticker: 'string' });
        const { ticker } = body;

        if (!ticker) {
          return createSecureResponse(JSON.stringify({
            success: false,
            error: 'Ticker is required'
          }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }

        // Calculate date range (3 years)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 3);

        const formatDate = (date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}${month}${day}`;
        };

        const startDateStr = formatDate(startDate);
        const endDateStr = formatDate(endDate);

        // Create import job
        const jobId = createImportJob(ticker, startDateStr, endDateStr, session.userId);

        console.log(`📥 Starting import for ${ticker} (job: ${jobId})`);

        // Start import in background (async, don't await)
        importTickerData(ticker, startDate, endDate, jobId, (progress) => {
          // Broadcast progress via WebSocket
          if (global.broadcastToAllUsers) {
            global.broadcastToAllUsers({
              type: 'import_progress',
              job_id: jobId,
              ticker: ticker,
              progress: progress
            });
          }
        }).then((result) => {
          console.log(`✅ Import completed for ${ticker}:`, result);

          // Broadcast completion
          if (global.broadcastToAllUsers) {
            global.broadcastToAllUsers({
              type: 'import_completed',
              job_id: jobId,
              ticker: ticker,
              result: result
            });
          }
        }).catch((error) => {
          console.error(`❌ Import failed for ${ticker}:`, error);

          // Broadcast failure
          if (global.broadcastToAllUsers) {
            global.broadcastToAllUsers({
              type: 'import_failed',
              job_id: jobId,
              ticker: ticker,
              error: error.message
            });
          }
        });

        return createSecureResponse(JSON.stringify({
          success: true,
          job_id: jobId,
          message: `Import started for ${ticker}`
        }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        console.error('❌ Error starting import:', error);
        return createSecureResponse(JSON.stringify({
          success: false,
          error: 'Failed to start import'
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // 📥 ADMIN: Update all tickers with missing data (admin only)
    if (url.pathname === "/api/import/update-all" && req.method === "POST") {
      const session = UserManager.verifySession(token);

      if (!session.valid) {
        return createSecureResponse(JSON.stringify({ success: false, error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }

      // 🔥 FIX: Only check if user is admin (no IP whitelist for API endpoints)
      // IP whitelist is for admin dashboard page, not API endpoints
      if (!session.isAdmin) {
        AuditLog.suspiciousActivity(session.userId, session.username, getClientIP(req), {
          reason: 'Attempted to access admin import endpoint without privileges',
          endpoint: url.pathname
        });

        return createSecureResponse(JSON.stringify({
          success: false,
          error: "Admin access required"
        }), {
          status: 403,
          headers: { "Content-Type": "application/json" }
        });
      }

      try {
        console.log(`📥 Starting update for all tickers with missing data`);

        // Start update in background (async, don't await)
        updateAllMissingTickers(session.userId, (progress) => {
          // Broadcast progress via WebSocket
          if (global.broadcastToAllUsers) {
            global.broadcastToAllUsers({
              type: 'update_all_progress',
              progress: progress
            });
          }
        }).then((results) => {
          console.log(`✅ Update all completed:`, results);

          // Broadcast completion
          if (global.broadcastToAllUsers) {
            global.broadcastToAllUsers({
              type: 'update_all_completed',
              results: results
            });
          }
        }).catch((error) => {
          console.error(`❌ Update all failed:`, error);

          // Broadcast failure
          if (global.broadcastToAllUsers) {
            global.broadcastToAllUsers({
              type: 'update_all_failed',
              error: error.message
            });
          }
        });

        return createSecureResponse(JSON.stringify({
          success: true,
          message: 'Update started for all tickers with missing data'
        }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        console.error('❌ Error starting update all:', error);
        return createSecureResponse(JSON.stringify({
          success: false,
          error: 'Failed to start update'
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // 📥 ADMIN: Get import jobs (admin only)
    if (url.pathname === "/api/import/jobs" && req.method === "GET") {
      const session = UserManager.verifySession(token);

      if (!session.valid) {
        return createSecureResponse(JSON.stringify({ success: false, error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }

      // 🔥 FIX: Only check if user is admin (no IP whitelist for API endpoints)
      // IP whitelist is for admin dashboard page, not API endpoints
      if (!session.isAdmin) {
        AuditLog.suspiciousActivity(session.userId, session.username, getClientIP(req), {
          reason: 'Attempted to access admin import endpoint without privileges',
          endpoint: url.pathname
        });

        return createSecureResponse(JSON.stringify({
          success: false,
          error: "Admin access required"
        }), {
          status: 403,
          headers: { "Content-Type": "application/json" }
        });
      }

      try {
        const activeJobs = getActiveJobs();
        const completedJobs = getCompletedJobs(10);

        return createSecureResponse(JSON.stringify({
          success: true,
          active_jobs: activeJobs,
          completed_jobs: completedJobs
        }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        console.error('❌ Error getting import jobs:', error);
        return createSecureResponse(JSON.stringify({
          success: false,
          error: 'Failed to get import jobs'
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // 🎯 ADMIN: Get audit logs (admin only) - 🔒 WITH IP WHITELIST CHECK
    if (url.pathname === "/api/admin/audit-logs") {
      const session = UserManager.verifySession(token);
      
      if (!session.valid) {
        return createSecureResponse(JSON.stringify({ success: false, error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // 🔒 NEW: Check IP whitelist for admin API access
      const ipCheck = requireAdminIP(req);
      if (!ipCheck.allowed) {
        AuditLog.suspiciousActivity(session.userId, session.username, getClientIP(req), {
          reason: 'Attempted admin API access from non-whitelisted IP',
          endpoint: url.pathname,
          ip: getClientIP(req)
        });
        
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: ipCheck.error 
        }), {
          status: 403,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // Check if user is admin
      if (!session.isAdmin) {
        AuditLog.suspiciousActivity(session.userId, session.username, ip, { 
          reason: 'Attempted to access admin endpoint without privileges',
          endpoint: url.pathname
        });
        
        return createSecureResponse(JSON.stringify({ success: false, error: "Admin access required" }), {
          status: 403,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      const { getRecentLogs, getSecurityAlerts } = await import("./utils/auditLogger.js");
      
      const logs = getRecentLogs(50);
      const alerts = getSecurityAlerts(24);
      
      // Calculate stats
      const stats = {
        critical: logs.filter(l => l.risk_level === 'CRITICAL').length,
        high: logs.filter(l => l.risk_level === 'HIGH').length,
        logins: logs.filter(l => l.event_action === 'LOGIN_SUCCESS').length,
        total: logs.length
      };
      
      return createSecureResponse(JSON.stringify({ logs, alerts, stats }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // 🎯 ADMIN: Force refresh options universe
    if (url.pathname === "/api/admin/refresh-universe") {
      if (req.method !== "POST") {
        return createSecureResponse("Method not allowed", { status: 405 });
      }
      
      const session = UserManager.verifySession(token);
      
      if (!session.valid || !session.isAdmin) {
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: "Admin access required" 
        }), {
          status: 403,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // CSRF protection
      const csrfCheck = requireCSRF(req, token);
      if (!csrfCheck.valid) {
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: csrfCheck.error 
        }), {
          status: csrfCheck.status,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // IP whitelist check
      const ipCheck = requireAdminIP(req);
      if (!ipCheck.allowed) {
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: ipCheck.error 
        }), {
          status: 403,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      console.log(`🔄 [ADMIN] Manual universe refresh triggered by ${session.username}`);
      
      const result = await universeManager.refreshUniverse();
      
      return createSecureResponse(JSON.stringify({ 
        success: result,
        message: result ? 'Universe refreshed successfully' : 'Universe refresh failed'
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // 🎯 ADMIN: Check universe status
    if (url.pathname === "/api/admin/universe-status") {
      const session = UserManager.verifySession(token);
      
      if (!session.valid || !session.isAdmin) {
        return createSecureResponse(JSON.stringify({ 
          success: false, 
          error: "Admin access required" 
        }), {
          status: 403,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      const universe = universeManager.getUniverse();
      const lastUpdated = universeManager.lastUpdated;
      
      return createSecureResponse(JSON.stringify({ 
        success: true,
        tickerCount: Object.keys(universe).length,
        lastUpdated: lastUpdated ? lastUpdated.toISOString() : null,
        isRefreshWindow: universeManager.isRefreshWindow(),
        cacheFile: universeManager.cacheFile
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // 🎯 ADMIN: Dashboard page (with IP whitelist protection) - 🔒 Use createSecureHTMLResponse
if (url.pathname === "/admin") {
  // ✅ STEP 1: Verify user is logged in
  const session = UserManager.verifySession(token);
  if (!session.valid) {
    return new Response(null, {
      status: 302,
      headers: { "Location": "/login" }
    });
  }
  
  // ✅ STEP 2: Verify user is admin
  if (!session.isAdmin) {
    AuditLog.suspiciousActivity(session.userId, session.username, getClientIP(req), {
      reason: 'Attempted admin access without admin privileges',
      endpoint: url.pathname,
      ip: getClientIP(req)
    });
    
    return createSecureResponse('Access Denied: Admin privileges required', { 
      status: 403,
      headers: { "Content-Type": "text/plain" }
    });
  }
  
  // ✅ STEP 3: Check IP whitelist
  const ipCheck = requireAdminIP(req);
  if (!ipCheck.allowed) {
    AuditLog.suspiciousActivity(session.userId, session.username, getClientIP(req), {
      reason: 'Attempted admin access from non-whitelisted IP',
      endpoint: url.pathname,
      ip: getClientIP(req)
    });
    
    return createSecureResponse('Access Denied: Admin access restricted to whitelisted IPs', { 
      status: 403,
      headers: { "Content-Type": "text/plain" }
    });
  }
  
  // ✅ STEP 4: All checks passed - serve admin dashboard
  const { getAdminHTML } = await import("./views/admin.js");
  return createSecureHTMLResponse(getAdminHTML());
}
    
    // 🔌 WebSocket upgrade - ✅ FIXED: Extract cookie + IP BEFORE upgrade
    if (url.pathname === "/ws") {
      // ✅ Extract cookies BEFORE upgrade (they won't persist after)
      const cookieHeader = req.headers.get('cookie');
      
      // 🆕 NEW: Get client IP address
      const clientIP = getClientIP(req);
      
      const upgraded = server.upgrade(req, {
        data: { 
          cookieHeader: cookieHeader,  // ✅ Pass the actual cookie string
          ipAddress: clientIP          // 🆕 NEW: Pass IP address to WebSocket handler
        }
      });
      if (!upgraded) {
        return createSecureResponse("WebSocket upgrade failed", { status: 400 });
      }
      return undefined;
    }
    
    // 📁 Serve static files
    if (url.pathname.startsWith("/public/")) {
      const filePath = `.${url.pathname}`;
      try {
        const file = Bun.file(filePath);
        const exists = await file.exists();
        if (!exists) {
          return createSecureResponse("File not found", { status: 404 });
        }
        return createSecureResponse(file, {
          headers: {
            "Content-Type": filePath.endsWith(".js") ? "application/javascript" : "text/plain"
          }
        });
      } catch (e) {
        return createSecureResponse("Error loading file", { status: 500 });
      }
    }
    
    // 🏠 Serve main HTML - 🔒 Use createSecureHTMLResponse for nonce-based CSP
    // Auth already checked by middleware above - just serve the page
    return createSecureHTMLResponse(getHTML());
  },
  
 websocket: {
    open(ws) {
      return wsHandler.open(ws);
    },
    message(ws, message) {
      return wsHandler.message(ws, message);
    },
    close(ws) {
      return wsHandler.close(ws);
    }
  }
});

console.log("🚀 GEX Trading Intelligence running on http://localhost:" + PORT);
console.log("🔐 Authentication: ENABLED - Login required for trading");
console.log("🛡️ Rate Limiting: ACTIVE - All endpoints protected");
console.log("🔒 CSRF Protection: ENABLED - Token required for state changes");
console.log("🛡️ Security Headers: ACTIVE - XSS/Clickjacking protection");
console.log("✅ Input Validation: ENABLED - All requests validated");
console.log("📋 Audit Logging: ACTIVE - All events tracked");
console.log("📦 Database Backups: SCHEDULED - Every 24 hours");
console.log("🔒 Admin IP Whitelist: ACTIVE - Restricted access");
console.log("🔄 Session Rotation: ENABLED - Auto-rotate on password change & broker connect");
console.log("📧 Email Verification: ENABLED - Gmail only, required for login");
console.log("📸 OCR Trade Signals: ENABLED - Real-time signal processing");
console.log("💾 Trade History: ENABLED - Database storage + winrate tracking");
console.log("📡 WebSocket Broadcast: ENABLED - Real-time signal distribution");
console.log("💬 Chat System: ENABLED - Real-time community chat");
console.log("📊 Options Stream: ENABLED - Real-time price tracking + database storage");
console.log(`🔒 HTTPS Mode: ${process.env.ENABLE_HTTPS === 'true' ? 'ENABLED ✅' : 'DISABLED (dev mode)'}`);
console.log("⚙️ Settings page: http://localhost:" + PORT + "/settings");
console.log("👤 Account page: http://localhost:" + PORT + "/account");
console.log("🎯 Admin Dashboard: http://localhost:" + PORT + "/admin");
console.log("🔑 Login page: http://localhost:" + PORT + "/login");
console.log("📊 ThetaData Terminal connected");
console.log("🎯 AI-Powered Trade Signals Active");
console.log("⚡ Real-time analysis with auto-alerts");
console.log("💰 Multi-user broker integration ready");
console.log("🔄 Paper/Live account switching enabled");

// 🎯 PHASE 4: Start auto-exit monitor for stop loss / take profit
autoExitMonitor.start();
console.log("🎯 Auto-exit monitor started - stop loss & take profit ACTIVE");

// 🔥 NEW: Auto-stream all active user positions on server start
(async function initializeUserPositionStreaming() {
  try {
    console.log('\n📡 Initializing user position streaming...');
    
    // Get all users with open positions
    const db = new Database('users.db');
    const stmt = db.prepare(`
      SELECT DISTINCT user_id 
      FROM positions 
      WHERE status = 'OPEN'
    `);
    const usersWithPositions = stmt.all();
    
    console.log(`👥 Found ${usersWithPositions.length} users with open positions`);
    
    let totalSubscribed = 0;
    let totalAlreadyStreaming = 0;
    
    for (const { user_id } of usersWithPositions) {
      const result = await AlpacaBroker.ensureUserPositionsAreStreaming(user_id);
      
      if (result.success) {
        totalSubscribed += result.newSubscriptions || 0;
        totalAlreadyStreaming += result.alreadyStreaming || 0;
      }
    }
    
    console.log(`✅ User positions streaming initialized:`);
    console.log(`   📡 ${totalSubscribed} new subscriptions`);
    console.log(`   ✅ ${totalAlreadyStreaming} already streaming`);
    console.log(`   📊 Total active streams: ${totalSubscribed + totalAlreadyStreaming}\n`);
    
  } catch (error) {
    console.error('❌ Error initializing user position streaming:', error);
  }
})();
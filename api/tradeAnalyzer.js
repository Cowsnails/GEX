// api/tradeAnalyzer.js - Real-Time Trade Analysis Engine (No Greeks Needed)
// Analyzes trades in 30 seconds using price action, momentum, and confluence
// 💾 NOW WITH: Database storage + WebSocket broadcasting + Auto-subscribe to ThetaData

const THETA_HTTP = "http://127.0.0.1:25510";

// Analysis queue and buffer
const analysisQueue = [];
const activeAnalysis = new Map();
const analysisResults = new Map();
let isProcessing = false;

// Buffer settings
const MAX_CONCURRENT_ANALYSIS = 3;
const BUFFER_EXTRA_TIME = 15000; // 15 seconds extra for buffered trades

class TradeAnalyzer {
  
  // 📊 Main entry point - Analyze a trade signal
  static async analyzeTrade(tradeSignal) {
    const contractKey = `${tradeSignal.root}:${tradeSignal.expiration}:${tradeSignal.strike}:${tradeSignal.right}`;
    
    console.log(`📊 [ANALYSIS] Starting analysis for ${contractKey}...`);
    
    // 🔥 NEW: IMMEDIATELY subscribe to ThetaData WebSocket stream (before analysis starts)
    console.log(`📡 [ANALYSIS] Auto-subscribing to ThetaData WebSocket for ${contractKey}...`);
    
    try {
      const { optionsStream } = await import('./optionsStreamManager.js');
      
      const streamResult = await optionsStream.addDynamicContract(
        tradeSignal.root,
        tradeSignal.expiration,
        tradeSignal.strike,
        tradeSignal.right
      );
      
      if (streamResult.success) {
        if (streamResult.alreadyMonitored) {
          console.log(`✅ [ANALYSIS] Contract already streaming: ${contractKey}`);
        } else {
          console.log(`✅ [ANALYSIS] ThetaData WebSocket streaming STARTED for ${contractKey}`);
        }
      } else {
        console.warn(`⚠️ [ANALYSIS] ThetaData WebSocket subscription failed for ${contractKey}:`, streamResult.error);
      }
    } catch (streamError) {
      console.error(`❌ [ANALYSIS] Error subscribing to stream:`, streamError.message);
      // Continue with analysis even if streaming fails
    }
    
    // Check if already in queue or active
    if (activeAnalysis.has(contractKey)) {
      console.log(`⚠️ [ANALYSIS] ${contractKey} already being analyzed`);
      return { success: false, error: 'Already analyzing' };
    }
    
    // Add to queue
    analysisQueue.push({
      ...tradeSignal,
      contractKey,
      queuedAt: Date.now()
    });
    
    // Start processing if not already
    if (!isProcessing) {
      this.processQueue();
    }
    
    return { success: true, queued: true };
  }
  
  // 🔄 Process analysis queue with buffer management
  static async processQueue() {
    isProcessing = true;
    
    while (analysisQueue.length > 0) {
      const concurrent = activeAnalysis.size;
      
      // Check if we can process more trades
      if (concurrent < MAX_CONCURRENT_ANALYSIS) {
        const trade = analysisQueue.shift();
        
        // Start analysis (non-blocking)
        this.runAnalysis(trade).catch(err => {
          console.error(`❌ [ANALYSIS] Error analyzing ${trade.contractKey}:`, err);
        });
      } else {
        // Buffer full - wait before checking again
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    isProcessing = false;
  }
  
  // 🎯 Run full analysis for a single trade
  static async runAnalysis(trade) {
    const { contractKey, root, expiration, strike, right, price, trader, priority, id } = trade;
    
    activeAnalysis.set(contractKey, {
      startedAt: Date.now(),
      status: 'analyzing'
    });
    
    try {
      // Calculate timeout based on buffer
      const concurrent = activeAnalysis.size;
      const timeout = concurrent > 1 ? 30000 + BUFFER_EXTRA_TIME : 30000;
      
      console.log(`⏱️ [ANALYSIS] ${contractKey} - Timeout: ${timeout/1000}s (concurrent: ${concurrent})`);
      
      // Step 1: Check if already being streamed (instant decision if yes)
      const alreadyStreaming = await this.isAlreadyStreaming(root, expiration, strike, right);
      
      let stockData = null;
      
      if (alreadyStreaming) {
        console.log(`✅ [ANALYSIS] ${contractKey} already streaming - FAST PATH`);
        // Just get current price, no historical needed
        stockData = await this.getCurrentStockPrice(root);
      } else {
        console.log(`📈 [ANALYSIS] ${contractKey} fetching 30min historical...`);
        // Fetch 30 minutes of historical stock data
        stockData = await this.fetchHistoricalStockData(root, 30);
      }
      
      // Step 2: Calculate score
      const score = await this.calculateTradeScore({
        trade,
        stockData,
        alreadyStreaming
      });
      
      // Step 3: Make decision
      const decision = this.makeDecision(score, trade);
      
      // 💾 STEP 4: Store result in database
      try {
        const { TradeHistoryManager } = await import('../utils/tradeHistoryManager.js');
        TradeHistoryManager.updateAnalysis(
          id || contractKey, 
          score.total, 
          decision.action, 
          decision.reason
        );
      } catch (dbError) {
        console.error(`⚠️ [ANALYSIS] Failed to save to database:`, dbError.message);
        // Continue even if database save fails
      }
      
      // Store result in memory
      analysisResults.set(contractKey, {
        ...decision,
        trade,
        completedAt: Date.now(),
        duration: Date.now() - activeAnalysis.get(contractKey).startedAt
      });
      
      console.log(`✅ [ANALYSIS] ${contractKey} - Score: ${score.total}/100 - Decision: ${decision.action}`);
      
      // 📡 STEP 5: Broadcast result to all connected clients
      this.broadcastAnalysisResult(contractKey, {
        signalId: id || contractKey,
        root: trade.root,
        expiration: trade.expiration,
        strike: trade.strike,
        right: trade.right,
        trader: trade.trader,
        score: score.total,
        action: decision.action,
        confidence: decision.confidence,
        reason: decision.reason,
        breakdown: score
      });
      
    } catch (error) {
      console.error(`❌ [ANALYSIS] ${contractKey} failed:`, error.message);
      
      analysisResults.set(contractKey, {
        action: 'ERROR',
        reason: error.message,
        trade,
        completedAt: Date.now()
      });
    } finally {
      activeAnalysis.delete(contractKey);
    }
  }
  
  // 🔍 Check if contract is already being streamed
  static async isAlreadyStreaming(root, expiration, strike, right) {
    // Import optionsStream
    const { optionsStream } = await import('./optionsStreamManager.js');
    
    const quote = optionsStream.getQuote(root, expiration, strike, right);
    return quote !== null;
  }
  
  // 📊 Get current stock price from stream
  static async getCurrentStockPrice(ticker) {
    const { optionsStream } = await import('./optionsStreamManager.js');
    
    const stockQuote = optionsStream.getStockQuote(ticker);
    
    if (stockQuote) {
      return {
        current: stockQuote.price,
        bid: stockQuote.bid,
        ask: stockQuote.ask,
        spread: stockQuote.ask - stockQuote.bid,
        momentum: 0, // Can't calculate without history
        volume: stockQuote.volume
      };
    }
    
    return null;
  }
  
  // 📈 Fetch historical stock data (OHLC)
  static async fetchHistoricalStockData(ticker, minutes = 30) {
    try {
      // Calculate date range
      const now = new Date();
      const start = new Date(now.getTime() - (minutes * 60 * 1000));
      
      const startDate = start.getFullYear() + 
                       String(start.getMonth() + 1).padStart(2, '0') + 
                       String(start.getDate()).padStart(2, '0');
      
      const endDate = now.getFullYear() + 
                     String(now.getMonth() + 1).padStart(2, '0') + 
                     String(now.getDate()).padStart(2, '0');
      
      // Fetch historical OHLC data
      const url = `${THETA_HTTP}/v2/hist/stock/ohlc?root=${ticker}&start_date=${startDate}&end_date=${endDate}&ivl=60000`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch historical data: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.response || data.response.length === 0) {
        throw new Error('No historical data available');
      }
      
      // Parse OHLC data: [ms_of_day, open, high, low, close, volume, count, date]
      const bars = data.response.map(bar => ({
        open: bar[1],
        high: bar[2],
        low: bar[3],
        close: bar[4],
        volume: bar[5],
        timestamp: bar[0]
      }));
      
      // Calculate metrics
      const current = bars[bars.length - 1].close;
      const oldest = bars[0].close;
      const momentum = ((current - oldest) / oldest) * 100;
      
      const avgVolume = bars.reduce((sum, bar) => sum + bar.volume, 0) / bars.length;
      const recentVolume = bars.slice(-5).reduce((sum, bar) => sum + bar.volume, 0) / 5;
      const volumeSpike = recentVolume > (avgVolume * 1.5);
      
      // Detect trend
      const highs = bars.map(b => b.high);
      const lows = bars.map(b => b.low);
      const highestHigh = Math.max(...highs);
      const lowestLow = Math.min(...lows);
      
      return {
        current,
        momentum,
        bars,
        volumeSpike,
        avgVolume,
        range: {
          high: highestHigh,
          low: lowestLow,
          percent: ((highestHigh - lowestLow) / lowestLow) * 100
        }
      };
      
    } catch (error) {
      console.error(`❌ Error fetching historical data for ${ticker}:`, error.message);
      return null;
    }
  }
  
  // 🧮 Calculate trade score (0-100)
  static async calculateTradeScore({ trade, stockData, alreadyStreaming }) {
    const score = {
      momentum: 0,      // 0-25 points
      volume: 0,        // 0-15 points
      strike: 0,        // 0-20 points
      trader: 0,        // 0-15 points
      timing: 0,        // 0-10 points
      liquidity: 0,     // 0-15 points
      total: 0
    };
    
    // 1. Momentum Score (0-25)
    if (stockData && stockData.momentum !== undefined) {
      const absMomentum = Math.abs(stockData.momentum);
      
      if (trade.right === 'C' && stockData.momentum > 0) {
        // Calls on uptrend
        score.momentum = Math.min(25, absMomentum * 5);
      } else if (trade.right === 'P' && stockData.momentum < 0) {
        // Puts on downtrend
        score.momentum = Math.min(25, absMomentum * 5);
      } else {
        // Against trend - penalty
        score.momentum = Math.max(0, 10 - absMomentum);
      }
    } else {
      score.momentum = 12; // Neutral if no data
    }
    
    // 2. Volume Score (0-15)
    if (stockData && stockData.volumeSpike) {
      score.volume = 15;
    } else {
      score.volume = 8; // Neutral
    }
    
    // 3. Strike Selection Score (0-20)
    if (stockData && stockData.current) {
      const strikeDistance = Math.abs(trade.strike - stockData.current) / stockData.current;
      
      if (strikeDistance < 0.02) {
        // ATM or very close - best
        score.strike = 20;
      } else if (strikeDistance < 0.05) {
        // Slightly OTM/ITM - good
        score.strike = 15;
      } else if (strikeDistance < 0.10) {
        // More OTM/ITM - ok
        score.strike = 10;
      } else {
        // Deep OTM/ITM - risky
        score.strike = 5;
      }
    } else {
      score.strike = 10; // Neutral
    }
    
    // 4. Trader Score (0-15)
    switch (trade.priority) {
      case 1: // Elite
        score.trader = 15;
        break;
      case 2:
        score.trader = 10;
        break;
      case 3:
        score.trader = 7;
        break;
      default:
        score.trader = 5;
    }
    
    // 5. Timing Score (0-10)
    const hour = new Date().getHours();
    const minute = new Date().getMinutes();
    
    if ((hour === 9 && minute < 35) || (hour === 15 && minute > 50)) {
      // First 5min or last 10min - avoid
      score.timing = 2;
    } else if (hour >= 10 && hour <= 14) {
      // Mid-day - best
      score.timing = 10;
    } else {
      // Other times - ok
      score.timing = 7;
    }
    
    // 6. Liquidity Score (0-15) - based on already streaming
    if (alreadyStreaming) {
      score.liquidity = 15; // Already liquid, we know it
    } else {
      score.liquidity = 8; // Unknown, assume average
    }
    
    // Calculate total
    score.total = score.momentum + score.volume + score.strike + 
                  score.trader + score.timing + score.liquidity;
    
    return score;
  }
  
  // 🎯 Make final decision based on score
  static makeDecision(score, trade) {
    let action = 'SKIP';
    let reason = '';
    let confidence = 'LOW';
    
    if (score.total >= 75) {
      action = 'BUY';
      confidence = 'HIGH';
      reason = 'Excellent setup - all indicators aligned';
    } else if (score.total >= 60) {
      action = 'BUY';
      confidence = 'MEDIUM';
      reason = 'Good setup - most indicators positive';
    } else if (score.total >= 45) {
      action = 'WATCH';
      confidence = 'LOW';
      reason = 'Marginal setup - monitor for improvement';
    } else {
      action = 'SKIP';
      confidence = 'LOW';
      reason = 'Poor setup - multiple red flags';
    }
    
    return {
      action,
      confidence,
      reason,
      score: score.total,
      breakdown: score
    };
  }
  
  // 📡 Broadcast analysis result to all connected clients (NEW METHOD)
  static broadcastAnalysisResult(contractKey, result) {
    // Use the global broadcast function from server.js
    if (global.broadcastToAllUsers) {
      global.broadcastToAllUsers({
        type: 'analysis_complete',
        result: result
      });
      console.log(`📡 [ANALYSIS] Broadcasted result for ${contractKey}`);
    } else {
      console.warn('⚠️ [ANALYSIS] broadcastToAllUsers not available');
    }
  }
  
  // 📢 Broadcast result to connected clients (DEPRECATED - kept for compatibility)
  static broadcastResult(contractKey, decision) {
    // This method is now handled by broadcastAnalysisResult
    console.log(`📢 [ANALYSIS] Result ready for ${contractKey}: ${decision.action}`);
  }
  
  // 📊 Get analysis result
  static getResult(contractKey) {
    return analysisResults.get(contractKey);
  }
  
  // 📊 Get all results
  static getAllResults() {
    return Array.from(analysisResults.values());
  }
  
  // 📊 Get queue status
  static getQueueStatus() {
    return {
      queued: analysisQueue.length,
      active: activeAnalysis.size,
      completed: analysisResults.size
    };
  }
}

export { TradeAnalyzer };
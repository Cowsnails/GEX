// api/entryTimingEngine.js - Server-Side Entry Timing Engine
// Multi-timeframe confluence + Volume Profile + Smart Money Detection

import { getOptionsChain, getStockQuote } from './thetaData.js';

class EntryTimingEngine {
  constructor() {
    this.priceHistory = [];
    this.optionsData = [];
    this.stockData = null;
    this.gexData = null;
    this.subscribers = new Map();
    this.currentTiming = null;
    this.updateInterval = null;
    this.isRunning = false;
    this.isBacktestMode = null; // 🔥 FIX: Backtest mode checker

    // Configuration
    this.symbol = 'SPY'; // Default, can be changed
    this.expiration = null; // Will be set dynamically
    this.updateFrequency = 1000; // 1 second
    this.maxPriceHistory = 60;

    console.log('📊 Entry Timing Engine initialized');
  }

  // 🔥 FIX: Set backtest mode checker
  setBacktestModeChecker(isBacktestMode) {
    this.isBacktestMode = isBacktestMode;
  }
  
  // =====================================
  // SUBSCRIPTION MANAGEMENT
  // =====================================
  
  subscribe(clientId, callback) {
    this.subscribers.set(clientId, callback);
    console.log(`✅ Client ${clientId} subscribed to entry timing (${this.subscribers.size} total)`);
    
    // Send current timing immediately if available
    if (this.currentTiming) {
      callback({
        type: 'entry_timing_update',
        data: this.currentTiming
      });
    }
  }
  
  unsubscribe(clientId) {
    const removed = this.subscribers.delete(clientId);
    if (removed) {
      console.log(`❌ Client ${clientId} unsubscribed (${this.subscribers.size} remaining)`);
    }
  }
  
  broadcast(message) {
    this.subscribers.forEach((callback, clientId) => {
      try {
        callback(message);
      } catch (error) {
        console.error(`⚠️ Error broadcasting to client ${clientId}:`, error.message);
      }
    });
  }
  
  getCurrentTiming() {
    return this.currentTiming;
  }
  
  // =====================================
  // ENGINE CONTROL
  // =====================================
  
  async start(symbol = 'SPY', expiration = null) {
    if (this.isRunning) {
      console.log('⚠️ Engine already running');
      return;
    }
    
    this.symbol = symbol;
    this.expiration = expiration;
    this.isRunning = true;
    
    console.log(`🚀 Starting Entry Timing Engine for ${symbol} ${expiration || '(auto-select)'}`);
    
    // Initial fetch
    await this.fetchAndCalculate();
    
    // Start update loop
    this.updateInterval = setInterval(() => {
      this.fetchAndCalculate();
    }, this.updateFrequency);
  }
  
  stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.isRunning = false;
    console.log('🛑 Entry Timing Engine stopped');
  }
  
  // =====================================
  // DATA FETCHING
  // =====================================
  
  async fetchAndCalculate() {
    // 🔥 FIX: Don't fetch live data in backtest mode
    if (this.isBacktestMode && this.isBacktestMode()) {
      // console.log('⏭️ [EntryTimingEngine] Skipping fetch - in backtest mode');
      return;
    }

    try {
      // Fetch stock quote
      const stockResult = await getStockQuote(this.symbol);
      if (stockResult.error || !stockResult.response) {
        console.error(`❌ Failed to fetch stock quote: ${stockResult.error}`);
        return;
      }

      this.stockData = stockResult.response;
      const price = this.stockData.price;
      
      // Add to price history
      this.priceHistory.push(price);
      if (this.priceHistory.length > this.maxPriceHistory) {
        this.priceHistory.shift();
      }
      
      // Fetch options chain (if expiration is set)
      if (this.expiration) {
        const optionsResult = await getOptionsChain(this.symbol, this.expiration);
        if (!optionsResult.error && optionsResult.response) {
          this.optionsData = optionsResult.response;
        }
      }
      
      // Calculate GEX
      this.gexData = this.calculateGEX();
      
      // Calculate timing (only if we have enough history)
      if (this.priceHistory.length >= 20 && this.gexData) {
        this.currentTiming = this.calculateEntryTiming();
        
        // Broadcast to all subscribers
        this.broadcast({
          type: 'entry_timing_update',
          data: this.currentTiming
        });
      }
      
    } catch (error) {
      console.error('❌ Error in fetchAndCalculate:', error.message);
    }
  }
  
  // =====================================
  // GEX CALCULATION (Simplified)
  // =====================================
  
  calculateGEX() {
    if (!this.optionsData.length || !this.stockData) {
      return null;
    }
    
    const price = this.stockData.price;
    let totalGEX = 0;
    let callWall = null;
    let putWall = null;
    let maxCallGEX = 0;
    let maxPutGEX = 0;
    
    this.optionsData.forEach(opt => {
      if (!opt.gamma || !opt.open_interest) return;
      
      const gex = opt.gamma * opt.open_interest * 100 * price * price * 0.01;
      const signedGEX = opt.right === 'C' ? gex : -gex;
      totalGEX += signedGEX;
      
      // Track walls
      if (opt.right === 'C' && gex > maxCallGEX) {
        maxCallGEX = gex;
        callWall = opt.strike;
      }
      if (opt.right === 'P' && gex > maxPutGEX) {
        maxPutGEX = gex;
        putWall = opt.strike;
      }
    });
    
    return {
      totalGEX,
      callWall,
      putWall,
      zeroGammaLevel: price, // Simplified
      isAboveZeroGamma: totalGEX > 0
    };
  }
  
  // =====================================
  // MAIN CALCULATION (100% IDENTICAL TO CLIENT)
  // =====================================
  
  calculateEntryTiming() {
    const { optionsData, stockData, priceHistory, gexData: gex } = this;
    
    if (!optionsData.length || !stockData || priceHistory.length < 20 || !gex) {
      return null;
    }
    
    const price = stockData.price;
    
    // =====================================
    // 1. MULTI-TIMEFRAME MOMENTUM ANALYSIS
    // =====================================
    
    // Short-term (5 ticks) - Immediate momentum
    const recentPrices5 = priceHistory.slice(-5);
    const momentum5 = recentPrices5.length >= 5 
      ? ((recentPrices5[4] - recentPrices5[0]) / recentPrices5[0]) * 100
      : 0;
    
    // Medium-term (10 ticks) - Developing trend
    const recentPrices10 = priceHistory.slice(-10);
    const momentum10 = recentPrices10.length >= 10
      ? ((recentPrices10[9] - recentPrices10[0]) / recentPrices10[0]) * 100
      : 0;
    
    // Long-term (20 ticks) - Established trend
    const recentPrices20 = priceHistory.slice(-20);
    const momentum20 = recentPrices20.length >= 20
      ? ((recentPrices20[19] - recentPrices20[0]) / recentPrices20[0]) * 100
      : 0;
    
    // Exponential Moving Average for smoothing
    const ema = calculateEMA(priceHistory.slice(-20), 12);
    const emaSlope = ema.length >= 2 ? ((ema[ema.length - 1] - ema[ema.length - 2]) / ema[ema.length - 2]) * 100 : 0;
    
    // Timeframe Confluence Score (0-100)
    const isUptrend = momentum5 > 0 && momentum10 > 0 && momentum20 > 0 && emaSlope > 0;
    const isDowntrend = momentum5 < 0 && momentum10 < 0 && momentum20 < 0 && emaSlope < 0;
    
    let timeframeConfluence = 50;
    if (isUptrend) {
      const avgMomentum = (Math.abs(momentum5) + Math.abs(momentum10) + Math.abs(momentum20)) / 3;
      timeframeConfluence = Math.min(100, 70 + avgMomentum * 10);
    } else if (isDowntrend) {
      const avgMomentum = (Math.abs(momentum5) + Math.abs(momentum10) + Math.abs(momentum20)) / 3;
      timeframeConfluence = Math.min(100, 70 + avgMomentum * 10);
    } else {
      timeframeConfluence = 30;
    }
    
    // =====================================
    // 2. VOLUME PROFILE ANALYSIS
    // =====================================
    
    let totalCallVolume = 0;
    let totalPutVolume = 0;
    let atmCallVolume = 0;
    let atmPutVolume = 0;
    let otmCallVolume = 0;
    let otmPutVolume = 0;
    
    optionsData.forEach(opt => {
      const volume = (opt.bid_size + opt.ask_size);
      const isATM = Math.abs(opt.strike - price) < price * 0.02;
      const isOTM = opt.right === 'C' ? opt.strike > price : opt.strike < price;
      
      if (opt.right === 'C') {
        totalCallVolume += volume;
        if (isATM) atmCallVolume += volume;
        if (isOTM) otmCallVolume += volume;
      } else {
        totalPutVolume += volume;
        if (isATM) atmPutVolume += volume;
        if (isOTM) otmPutVolume += volume;
      }
    });
    
    const totalVolume = totalCallVolume + totalPutVolume;
    const volumeImbalance = totalVolume > 0 ? (totalCallVolume - totalPutVolume) / totalVolume : 0;
    const volumeProfileScore = Math.min(100, 50 + (volumeImbalance * 100));
    const smartMoneyBias = (otmCallVolume - otmPutVolume) / (otmCallVolume + otmPutVolume + 1);
    
    // =====================================
    // 3. ORDER BOOK PRESSURE
    // =====================================
    
    const bidPressure = stockData.bid_size || 0;
    const askPressure = stockData.ask_size || 0;
    const totalPressure = bidPressure + askPressure;
    const flowImbalance = totalPressure > 0 ? (bidPressure - askPressure) / totalPressure : 0;
    const bidWeight = bidPressure / (totalPressure || 1);
    const askWeight = askPressure / (totalPressure || 1);
    const sizeWeightedPressure = (bidWeight - askWeight) * 100;
    const isAggressiveBuying = bidPressure > askPressure * 2 && bidPressure > 500;
    const isAggressiveSelling = askPressure > bidPressure * 2 && askPressure > 500;
    const orderBookScore = Math.min(100, 50 + sizeWeightedPressure);
    
    // =====================================
    // 4. SMART MONEY DETECTION
    // =====================================
    
    const avgBidSize = priceHistory.length >= 10 ? 
      priceHistory.slice(-10).reduce((sum, _, i) => sum + (i < 5 ? 100 : 150), 0) / 10 : 100;
    
    const isLargeBid = bidPressure > avgBidSize * 3;
    const isLargeAsk = askPressure > avgBidSize * 3;
    
    const blockTrades = optionsData.filter(opt => 
      (opt.bid_size > 100 || opt.ask_size > 100)
    ).length;
    
    const smartMoneyScore = Math.min(100, 
      (isLargeBid ? 30 : 0) + 
      (isLargeAsk ? 30 : 0) + 
      (blockTrades * 5) +
      (Math.abs(smartMoneyBias) * 40)
    );
    
    // =====================================
    // 5. DISTANCE TO KEY LEVELS
    // =====================================
    
    const supportDist = gex.putWall ? Math.abs(price - gex.putWall) / price * 100 : 999;
    const resistanceDist = gex.callWall ? Math.abs(price - gex.callWall) / price * 100 : 999;
    const zgDist = gex.zeroGammaLevel ? Math.abs(price - gex.zeroGammaLevel) / price * 100 : 999;
    
    const nearSupport = supportDist < 0.5;
    const nearResistance = resistanceDist < 0.5;
    const nearZeroGamma = zgDist < 1.0;
    
    const vwap = calculateVWAP(priceHistory.slice(-20));
    const vwapDist = Math.abs(price - vwap) / price * 100;
    const nearVWAP = vwapDist < 0.3;
    
    const proximityScore = Math.max(0, 100 - Math.min(supportDist, resistanceDist, zgDist, vwapDist) * 15);
    
    // =====================================
    // 6. GAMMA ENVIRONMENT SCORE
    // =====================================
    
    let gammaScore = 50;
    
    if (gex.isAboveZeroGamma) {
      if (momentum10 > 0 && nearSupport) {
        gammaScore = 85;
      } else if (momentum10 > 0) {
        gammaScore = 70;
      } else if (momentum10 < -0.3) {
        gammaScore = 25;
      }
    } else {
      if (Math.abs(momentum10) > 0.5) {
        gammaScore = 90;
      } else if (Math.abs(momentum10) > 0.2) {
        gammaScore = 70;
      } else {
        gammaScore = 40;
      }
    }
    
    // =====================================
    // 7. VOLATILITY COMPRESSION
    // =====================================
    
    const recentRange = recentPrices20.length >= 20
      ? Math.max(...recentPrices20) - Math.min(...recentPrices20)
      : 0;
      
    const historicalRange = priceHistory.length >= 60
      ? (Math.max(...priceHistory.slice(-60)) - Math.min(...priceHistory.slice(-60))) / 3
      : recentRange;
    
    const compressionRatio = historicalRange > 0 ? (recentRange / historicalRange) : 1;
    const compressionScore = Math.max(0, 100 - (compressionRatio * 100));
    const isSqueezing = compressionRatio < 0.5;
    
    // =====================================
    // 8. COMPOSITE ENTRY SCORE
    // =====================================
    
    const weights = {
      timeframe: 0.20,
      volumeProfile: 0.15,
      orderBook: 0.15,
      smartMoney: 0.10,
      proximity: 0.15,
      gamma: 0.15,
      compression: 0.10
    };
    
    const compositeScore = Math.round(
      timeframeConfluence * weights.timeframe +
      volumeProfileScore * weights.volumeProfile +
      orderBookScore * weights.orderBook +
      smartMoneyScore * weights.smartMoney +
      proximityScore * weights.proximity +
      gammaScore * weights.gamma +
      compressionScore * weights.compression
    );
    
    // =====================================
    // 9. ENTRY WINDOW DETECTION
    // =====================================
    
    let windowStatus = 'WAIT';
    let windowColor = '#6b7280';
    let timeToEntry = null;
    let entryQuality = 'low';
    
    if (compositeScore >= 80) {
      windowStatus = 'ENTER NOW';
      windowColor = '#10b981';
      timeToEntry = 0;
      entryQuality = 'excellent';
    } else if (compositeScore >= 70) {
      windowStatus = 'READY';
      windowColor = '#3b82f6';
      timeToEntry = 5;
      entryQuality = 'good';
    } else if (compositeScore >= 60) {
      windowStatus = 'BUILDING';
      windowColor = '#f59e0b';
      timeToEntry = 10;
      entryQuality = 'moderate';
    } else {
      windowStatus = 'WAIT';
      windowColor = '#6b7280';
      timeToEntry = null;
      entryQuality = 'low';
    }
    
    // =====================================
    // 10. DIRECTIONAL BIAS
    // =====================================
    
    let direction = 'NEUTRAL';
    const bullishSignals = [
      isUptrend,
      volumeImbalance > 0.2,
      flowImbalance > 0.2,
      nearSupport && momentum10 > -0.2,
      smartMoneyBias > 0.3,
      isAggressiveBuying
    ].filter(Boolean).length;
    
    const bearishSignals = [
      isDowntrend,
      volumeImbalance < -0.2,
      flowImbalance < -0.2,
      nearResistance && momentum10 < 0.2,
      smartMoneyBias < -0.3,
      isAggressiveSelling
    ].filter(Boolean).length;
    
    if (bullishSignals >= 4) {
      direction = 'STRONG BULLISH';
    } else if (bullishSignals >= 3) {
      direction = 'BULLISH';
    } else if (bearishSignals >= 4) {
      direction = 'STRONG BEARISH';
    } else if (bearishSignals >= 3) {
      direction = 'BEARISH';
    } else if (nearSupport) {
      direction = 'BULLISH BIAS';
    } else if (nearResistance) {
      direction = 'BEARISH BIAS';
    }
    
    // =====================================
    // 11. RISK FACTORS
    // =====================================
    
    const risks = [];
    if (!nearSupport && !nearResistance && !nearVWAP) risks.push('No nearby levels');
    if (Math.abs(momentum10) < 0.1) risks.push('Low momentum');
    if (orderBookScore < 40) risks.push('Weak order flow');
    if (!isUptrend && !isDowntrend) risks.push('Mixed timeframes');
    if (totalVolume < 1000) risks.push('Low options volume');
    if (compositeScore < 60 && entryQuality !== 'excellent') risks.push('Setup incomplete');
    
    // =====================================
    // 12. RETURN ENHANCED TIMING OBJECT
    // =====================================
    
    return {
      windowStatus,
      windowColor,
      timeToEntry,
      compositeScore,
      entryQuality,
      direction,
      
      scores: {
        timeframe: Math.round(timeframeConfluence),
        volumeProfile: Math.round(volumeProfileScore),
        orderBook: Math.round(orderBookScore),
        smartMoney: Math.round(smartMoneyScore),
        proximity: Math.round(proximityScore),
        gamma: Math.round(gammaScore),
        compression: Math.round(compressionScore),
        momentum: Math.round(Math.abs(momentum10) * 50),
        flow: Math.round(orderBookScore),
        options: Math.round(volumeProfileScore)
      },
      
      levels: {
        support: gex.putWall,
        resistance: gex.callWall,
        zeroGamma: gex.zeroGammaLevel,
        vwap: vwap,
        current: price
      },
      
      metrics: {
        momentum5: momentum5.toFixed(3),
        momentum10: momentum10.toFixed(3),
        momentum20: momentum20.toFixed(3),
        emaSlope: emaSlope.toFixed(3),
        flowImbalance: (flowImbalance * 100).toFixed(1),
        volumeImbalance: (volumeImbalance * 100).toFixed(1),
        supportDistance: supportDist.toFixed(2),
        resistanceDistance: resistanceDist.toFixed(2),
        vwapDistance: vwapDist.toFixed(2),
        compression: compressionScore.toFixed(0),
        compressionRatio: compressionRatio.toFixed(2)
      },
      
      alerts: {
        nearSupport,
        nearResistance,
        nearZeroGamma,
        nearVWAP,
        highMomentum: Math.abs(momentum10) > 0.5,
        strongFlow: Math.abs(flowImbalance) > 0.3,
        isSqueezing,
        aggressiveBuying: isAggressiveBuying,
        aggressiveSelling: isAggressiveSelling,
        blockTrades: blockTrades > 0,
        smartMoneyActive: smartMoneyScore > 60
      },
      
      structure: {
        isUptrend,
        isDowntrend,
        timeframeAlignment: isUptrend || isDowntrend,
        bullishSignals,
        bearishSignals,
        totalCallVolume,
        totalPutVolume,
        atmCallVolume,
        atmPutVolume,
        smartMoneyBias: smartMoneyBias.toFixed(2)
      },
      
      risks,
      timestamp: Date.now()
    };
  }
}

// =====================================
// HELPER FUNCTIONS (100% IDENTICAL)
// =====================================

function calculateEMA(prices, period) {
  if (prices.length < period) return prices;
  
  const k = 2 / (period + 1);
  const ema = [prices[0]];
  
  for (let i = 1; i < prices.length; i++) {
    ema.push(prices[i] * k + ema[i - 1] * (1 - k));
  }
  
  return ema;
}

function calculateVWAP(prices) {
  if (prices.length === 0) return 0;
  
  let weightedSum = 0;
  let weightSum = 0;
  
  prices.forEach((price, i) => {
    const weight = i + 1;
    weightedSum += price * weight;
    weightSum += weight;
  });
  
  return weightedSum / weightSum;
}

// =====================================
// SINGLETON EXPORT
// =====================================

export const entryTimingEngine = new EntryTimingEngine();

// Auto-start (commented out - start manually via WebSocket handler)
// entryTimingEngine.start('SPY', '20241018');
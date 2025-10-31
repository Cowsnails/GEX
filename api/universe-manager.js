// api/universe-manager.js - FIXED: Only grabs NEXT 3 VALID expirations (0-3 DTE)
import { getExpirations } from './thetaData.js';

// 195 Tickers to monitor (high-volume options)
const UNIVERSE_TICKERS = [
  // Major ETFs
  'SPY', 'QQQ', 'IWM', 'DIA', 'VOO', 'HYG', 'TLT', 'GLD', 'USO', 
  'XLF', 'XLE', 'XLK', 'SMH', 'SOXX', 'XLV', 'XLI', 'XLY', 'XLP', 
  'XLRE', 'XLU', 'XLB', 'XLC', 'ARKK', 'ARKW', 'TAN', 'ICLN', 
  'EWZ', 'FXI', 'EEM',
  
  // Mega Cap Tech
  'NVDA', 'TSLA', 'AMZN', 'AMD', 'AAPL', 'GOOGL', 'PLTR', 'META', 
  'MSFT', 'INTC', 'NFLX', 'DIS', 'UBER', 'ABNB', 'SHOP',
  
  // Semiconductors
  'TSM', 'AVGO', 'QCOM', 'AMAT', 'LRCX', 'KLAC', 'MU', 'MRVL', 
  'ON', 'NXPI', 'ADI', 'CIEN', 'JBL', 'APH', 'GLW', 'TER', 'WOLF',
  
  // Enterprise Software & SaaS
  'CRM', 'ORCL', 'ADBE', 'PANW', 'CRWD', 'GTLB', 'PATH', 
  'DOCU', 'ZM', 'TWLO', 'NET', 'DDOG', 'SNOW', 'MDB', 'TEAM', 
  'WDAY', 'NOW', 'INTU', 'VEEV', 'FICO', 'FTNT', 'ZS', 'OKTA', 'SPLK',
  
  // Finance & Payments
  'JPM', 'BAC', 'WFC', 'C', 'GS', 'MS', 'AXP', 'BLK', 'V', 'MA', 
  'PYPL', 'COIN', 'HOOD', 'RJF', 'SCHW', 'BX', 'KKR', 'APO', 
  'COF', 'AIG', 'MET', 'PRU', 'USB', 'PNC', 'TFC', 'BPOP',
  
  // Consumer & Retail
  'NKE', 'SBUX', 'MCD', 'WMT', 'TGT', 'COST', 'HD', 'LOW', 'RH', 
  'BKNG', 'EXPE', 'MNST', 'UAA', 'KMX', 'KO', 'PEP', 'PG', 'PM', 'MO',
  
  // Energy
  'XOM', 'CVX', 'SLB', 'VST', 'CEG', 'BKR', 'PCG',
  
  // Emerging Tech & Speculative
  'SOUN', 'IONQ', 'BIDU', 'SE', 'VNET', 'VG', 'IBM', 'BB', 
  'LCID', 'APP', 'MP', 'OKLO', 'TLN', 'CGNX', 'ATAI', 'BE',
  
  // Industrial & Manufacturing
  'KTOS', 'PBR', 'GFS', 'FUN', 'WU', 'TTD', 'PAYX', 'AXL', 
  'EXE', 'DLO', 'F', 'GE', 'WELL', 'MSI', 'BA', 'RTX', 
  'LMT', 'GD', 'CARR', 'CAT', 'DE', 'UNP',
  
  // Healthcare & Pharma
  'LLY', 'GILD', 'MRK', 'PFE', 'JNJ', 'ABBV', 'BMY', 'VRTX', 
  'REGN', 'THC', 'KVUE',
  
  // Telecom
  'T', 'VZ', 'CMCSA', 'TMUS',
  
  // Metals & Mining
  'NEM', 'AA', 'X', 'SCCO', 'FCX'
];

class UniverseManager {
  constructor() {
    this.universe = {};
    this.lastUpdated = null;
    this.cacheFile = './options-universe.json';
    this.isRefreshing = false;
  }

  // Check if current time is in refresh window (8:30-9:30am ET)
  isRefreshWindow() {
    const now = new Date();
    
    // Convert to ET (assume server runs in ET, adjust if needed)
    const etHour = now.getHours();
    const etMinute = now.getMinutes();
    const etTime = etHour * 60 + etMinute; // Minutes since midnight
    
    const windowStart = 8 * 60 + 30;  // 8:30am = 510 minutes
    const windowEnd = 9 * 60 + 30;    // 9:30am = 570 minutes
    
    const inWindow = etTime >= windowStart && etTime <= windowEnd;
    
    console.log(`🕐 Current time: ${etHour}:${String(etMinute).padStart(2, '0')} ET`);
    console.log(`🪟 Refresh window: ${inWindow ? 'YES ✅' : 'NO ❌'} (8:30-9:30am only)`);
    
    return inWindow;
  }

  // Load existing cached universe from file
  async loadCachedUniverse() {
    try {
      const file = Bun.file(this.cacheFile);
      const exists = await file.exists();
      
      if (exists) {
        this.universe = await file.json();
        const stats = await file.stat();
        this.lastUpdated = stats.mtime;
        
        console.log(`📂 Loaded cached universe: ${Object.keys(this.universe).length} tickers`);
        console.log(`📅 Last updated: ${this.lastUpdated.toLocaleString()}`);
        return true;
      } else {
        console.log('⚠️ No cached universe found - will fetch on first startup in window');
        return false;
      }
    } catch (error) {
      console.error('❌ Error loading cached universe:', error.message);
      return false;
    }
  }

  // 🔥 FIXED: Only grab NEXT 3 VALID expirations (today or future, before 4pm ET)
  async refreshUniverse() {
    if (this.isRefreshing) {
      console.log('⚠️ Universe refresh already in progress...');
      return false;
    }

    this.isRefreshing = true;
    console.log(`\n🔄 Starting universe refresh for ${UNIVERSE_TICKERS.length} tickers...`);
    console.log(`🎯 Target: NEXT 3 VALID expirations only (0-3 DTE from today)`);
    
    const newUniverse = {};
    let successCount = 0;
    let failCount = 0;

    // 🕐 Get current time to check if market is open
    const now = new Date();
    const etHour = now.getHours();
    const marketClosed = etHour >= 16; // After 4pm ET
    
    // 📅 Calculate today's date as integer (YYYYMMDD)
    const todayInt = parseInt(
      now.getFullYear() + 
      String(now.getMonth() + 1).padStart(2, '0') + 
      String(now.getDate()).padStart(2, '0')
    );
    
    console.log(`📅 Today: ${todayInt} | Market closed: ${marketClosed ? 'YES ✅' : 'NO ❌'}`);

    for (let i = 0; i < UNIVERSE_TICKERS.length; i++) {
      const ticker = UNIVERSE_TICKERS[i];
      
      try {
        console.log(`[${i + 1}/${UNIVERSE_TICKERS.length}] Fetching ${ticker}...`);
        
        const result = await getExpirations(ticker);
        
        if (result.response && result.response.length > 0) {
          // 🔥 CRITICAL FIX: Filter to ONLY NEXT 3 VALID expirations
          const validExpirations = result.response
            .map(exp => parseInt(exp))
            .filter(expInt => {
              // ✅ Include today ONLY if market is still open (before 4pm)
              if (expInt === todayInt) {
                return !marketClosed;
              }
              // ✅ Include future dates
              return expInt > todayInt;
            })
            .sort((a, b) => a - b) // Sort ascending (nearest first)
            .slice(0, 3) // 🎯 ONLY GRAB NEXT 3
            .map(expInt => String(expInt)); // Convert back to string
          
          if (validExpirations.length > 0) {
            newUniverse[ticker] = validExpirations;
            successCount++;
            console.log(`  ✅ ${ticker}: ${validExpirations.length} valid expirations (${validExpirations.join(', ')})`);
          } else {
            failCount++;
            console.log(`  ⚠️ ${ticker}: No valid expirations found`);
          }
        } else {
          failCount++;
          console.log(`  ⚠️ ${ticker}: No expirations found`);
        }
        
        // Rate limit: 100ms between requests (600 per minute max)
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        failCount++;
        console.error(`  ❌ ${ticker}: ${error.message}`);
      }
    }

    // Save to file
    try {
      await Bun.write(this.cacheFile, JSON.stringify(newUniverse, null, 2));
      this.universe = newUniverse;
      this.lastUpdated = new Date();
      
      console.log(`\n✅ Universe refresh complete!`);
      console.log(`📊 Success: ${successCount} tickers`);
      console.log(`⚠️ Failed: ${failCount} tickers`);
      console.log(`💾 Saved to ${this.cacheFile}`);
      
      this.isRefreshing = false;
      return true;
      
    } catch (error) {
      console.error('❌ Error saving universe:', error.message);
      this.isRefreshing = false;
      return false;
    }
  }

  // Initialize on server startup
  async initialize() {
    console.log('\n🚀 Initializing Options Universe Manager...\n');
    
    // Check if we're in the refresh window
    if (this.isRefreshWindow()) {
      console.log('✅ In refresh window (8:30-9:30am) - Fetching fresh data...\n');
      await this.refreshUniverse();
    } else {
      console.log('⏰ Outside refresh window - Using cached data...\n');
      const loaded = await this.loadCachedUniverse();
      
      if (!loaded) {
        console.log('⚠️ No cache available - Server should be started between 8:30-9:30am for first-time setup');
      }
    }
    
    return this.universe;
  }

  // Get universe (for API endpoints)
  getUniverse() {
    return this.universe;
  }

  // Get specific ticker expirations
  getTicker(ticker) {
    return this.universe[ticker.toUpperCase()] || null;
  }
  
  // 🔥 NEW: Get NEXT VALID expiration for a ticker
  getNextExpiration(ticker) {
    const expirations = this.getTicker(ticker);
    if (!expirations || expirations.length === 0) {
      console.error(`❌ getNextExpiration: No expirations found for ${ticker}`);
      return null;
    }
    
    const now = new Date();
    const todayInt = parseInt(
      now.getFullYear() + 
      String(now.getMonth() + 1).padStart(2, '0') + 
      String(now.getDate()).padStart(2, '0')
    );
    
    const etHour = now.getHours();
    const marketClosed = etHour >= 16;
    
    // Filter to valid expirations (today if market open, or future dates)
    const validExps = expirations.filter(exp => {
      const expInt = parseInt(exp);
      if (expInt === todayInt) {
        return !marketClosed;
      }
      return expInt > todayInt;
    });
    
    // Return first valid, or fallback to first expiration if none valid
    const result = validExps.length > 0 ? validExps[0] : expirations[0];
    console.log(`✅ getNextExpiration(${ticker}): ${result}`);
    return result;
  }
}

// Export singleton instance
export const universeManager = new UniverseManager();
// api/thetaData.js - Real ThetaData Terminal Integration with Sunday/Early Monday Fallback + Cached Universe Lookup
const THETA_TERMINAL = "http://127.0.0.1:25510";

// 🕒 Helper function to check if we should use EOD data
function shouldUseEOD() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const hour = now.getHours(); // 0-23

  // Use EOD on Sunday (all day)
  if (dayOfWeek === 0) {
    console.log(`📅 Sunday detected - using EOD mode`);
    return true;
  }

  // Use EOD on Monday before 4:00 AM
  if (dayOfWeek === 1 && hour < 4) {
    console.log(`🌙 Monday before 4:00 AM detected (${hour}:00) - using EOD mode`);
    return true;
  }

  // 🆕 Use EOD during 12am-4am EVERY DAY (ThetaData maintenance window)
  if (hour >= 0 && hour < 4) {
    console.log(`🌙 Maintenance window detected (${hour}:00) - using EOD mode`);
    return true;
  }

  // Otherwise, use live data
  return false;
}

// 🆕 Helper function to check if we're in low-frequency polling window (12am-4am daily)
// During this window, reduce API call frequency to save resources
function isInLowFrequencyWindow() {
  const now = new Date();
  const hour = now.getHours(); // 0-23

  // Between midnight (0) and 4am (4) - exclusive of 4am
  return hour >= 0 && hour < 4;
}

// Export for use in websocket handler
export { isInLowFrequencyWindow };

// 🆕 Get options chain snapshot data with ALL Greeks (for 12am-4am maintenance window)
// Uses bulk_snapshot/all_greeks which gives last available data with complete greeks including gamma
async function getOptionsChainEOD(symbol, expiration) {
  try {
    // Use all_greeks endpoint which includes gamma, vanna, charm for proper GEX calculations
    const url = `${THETA_TERMINAL}/v2/bulk_snapshot/option/all_greeks?root=${symbol}&exp=0`;

    console.log(`📊 Fetching snapshot options chain with ALL greeks for ${symbol} - ALL expirations`);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.response || data.response.length === 0) {
      throw new Error('No snapshot options data available');
    }

    console.log(`✅ Got ${data.response.length} contracts from all_greeks snapshot endpoint`);

    // Process and format the data
    const options = [];

    data.response.forEach(item => {
      const contract = item.contract;

      // Get ticks array - format: ["ms_of_day","bid","ask","delta","theta","vega","rho","epsilon","lambda","gamma","vanna","charm","vomma","veta","speed","zomma","color","ultima","implied_vol","iv_error","ms_of_day2","underlying_price","date"]
      const tick = item.ticks && item.ticks[0];

      if (tick && tick.length >= 22) {
        const strikeFormatted = contract.strike / 1000; // Convert from millistrikes

        // Only include contracts for the requested expiration
        if (!expiration || contract.expiration === parseInt(expiration)) {
          options.push({
            strike: strikeFormatted,
            right: contract.right,
            root: contract.root,
            expiration: contract.expiration.toString(),
            // Greeks from all_greeks snapshot
            delta: tick[3] || 0,
            gamma: tick[9] || 0,  // ✅ Now available!
            theta: tick[4] || 0,
            vega: tick[5] || 0,
            rho: tick[6] || 0,
            iv: tick[18] || 0,
            vanna: tick[10] || 0,  // ✅ Now available!
            charm: tick[11] || 0,  // ✅ Now available!
            vomma: tick[12] || 0,
            veta: tick[13] || 0,
            speed: tick[14] || 0,
            zomma: tick[15] || 0,
            color: tick[16] || 0,
            ultima: tick[17] || 0,
            // Quote data from snapshot
            bid: tick[1] || 0,
            ask: tick[2] || 0,
            bid_size: 0, // Not in greeks endpoint
            ask_size: 0, // Not in greeks endpoint
            mid: (tick[1] && tick[2]) ? (tick[1] + tick[2]) / 2 : 0,
            spread: (tick[1] && tick[2]) ? tick[2] - tick[1] : 0,
            // Open Interest not available in snapshot greeks
            open_interest: 0
          });
        }
      }
    });

    console.log(`✅ Processed ${options.length} contracts for expiration ${expiration}`);

    return {
      type: 'options',
      response: options,
      latency: 0,
      isSnapshot: true
    };

  } catch (error) {
    console.error(`❌ Snapshot options fetch error for ${symbol}:`, error.message);
    return {
      type: 'options',
      error: error.message,
      response: []
    };
  }
}

// Get options chain with complete Greeks and Open Interest
export async function getOptionsChain(symbol, expiration) {
  try {
    // 🆕 Check if we're in maintenance window (12am-4am)
    if (isInLowFrequencyWindow()) {
      console.log(`🌙 Maintenance window - using EOD options data for ${symbol} ${expiration}`);
      return await getOptionsChainEOD(symbol, expiration);
    }

    console.log(`🔍 Fetching 4 endpoints for ${symbol} ${expiration}...`);

    // Fetch all 4 endpoints in parallel for speed
    const [greeksResponse, greeks2Response, oiResponse, quoteResponse] = await Promise.all([
      fetch(`${THETA_TERMINAL}/v2/bulk_snapshot/option/greeks?root=${symbol}&exp=${expiration}`),
      fetch(`${THETA_TERMINAL}/v2/bulk_snapshot/option/greeks_second_order?root=${symbol}&exp=${expiration}`),
      fetch(`${THETA_TERMINAL}/v2/bulk_snapshot/option/open_interest?root=${symbol}&exp=${expiration}`),
      fetch(`${THETA_TERMINAL}/v2/bulk_snapshot/option/quote?root=${symbol}&exp=${expiration}`)
    ]);
    
    // 🔥 NEW: Make first-order greeks optional (just log warning if it fails)
    // We only need greeks2, OI, and quote for core functionality
    if (!greeks2Response.ok || !oiResponse.ok || !quoteResponse.ok) {
      console.error(`❌ CRITICAL endpoint failures for ${symbol} ${expiration}:`);
      if (!greeks2Response.ok) console.error(`   - greeks_second_order: ${greeks2Response.status} ${greeks2Response.statusText}`);
      if (!oiResponse.ok) console.error(`   - open_interest: ${oiResponse.status} ${oiResponse.statusText}`);
      if (!quoteResponse.ok) console.error(`   - quote: ${quoteResponse.status} ${quoteResponse.statusText}`);
      throw new Error(`Critical endpoints failed (greeks2:${greeks2Response.status} oi:${oiResponse.status} quote:${quoteResponse.status})`);
    }

    // Log warning if first-order greeks failed (non-critical)
    if (!greeksResponse.ok) {
      console.warn(`⚠️ First-order greeks endpoint failed (${greeksResponse.status}) - continuing without delta/theta/vega`);
    }
    
    const [greeksData, greeks2Data, oiData, quoteData] = await Promise.all([
      greeksResponse.json(),
      greeks2Response.json(),
      oiResponse.json(),
      quoteResponse.json()
    ]);
    
    console.log(`✅ All 4 endpoints fetched successfully`);
    
    // Create contract map to merge all data
    const contractMap = new Map();
    
    // Step 1: Process first-order Greeks (delta, theta, vega, rho, IV)
    // Format: ["ms_of_day","bid","ask","delta","theta","vega","rho","epsilon","lambda","implied_vol","iv_error","ms_of_day2","underlying_price","date"]
    if (greeksData.response) {
      greeksData.response.forEach(item => {
        const contract = item.contract;
        const key = `${contract.strike}-${contract.right}`;
        const ticks = item.ticks?.[0];
        
        if (ticks) {
          contractMap.set(key, {
            strike: contract.strike / 1000,
            right: contract.right,
            root: contract.root,
            expiration: contract.expiration,
            delta: ticks[3] || 0,
            theta: ticks[4] || 0,
            vega: ticks[5] || 0,
            rho: ticks[6] || 0,
            iv: ticks[9] || 0
          });
        }
      });
    }
    
    console.log(`📊 Step 1: Added delta/theta/vega - ${contractMap.size} contracts`);
    
    // Step 2: Add second-order Greeks (GAMMA, vanna, charm) - CRITICAL FOR GEX!
    // Format: ["ms_of_day","bid","ask","gamma","vanna","charm","vomma","veta","implied_vol","iv_error","ms_of_day2","underlying_price","date"]
    if (greeks2Data.response) {
      greeks2Data.response.forEach(item => {
        const contract = item.contract;
        const key = `${contract.strike}-${contract.right}`;
        const ticks = item.ticks?.[0];
        
        if (ticks && contractMap.has(key)) {
          const existing = contractMap.get(key);
          existing.gamma = ticks[3] || 0;  // THE MOST IMPORTANT VALUE FOR GEX!
          existing.vanna = ticks[4] || 0;
          existing.charm = ticks[5] || 0;
        }
      });
    }
    
    console.log(`📊 Step 2: Added GAMMA/vanna/charm`);
    
    // Step 3: Add Open Interest - CRITICAL FOR GEX FORMULA!
    // Format: ["ms_of_day","open_interest","date"]
    if (oiData.response) {
      oiData.response.forEach(item => {
        const contract = item.contract;
        const key = `${contract.strike}-${contract.right}`;
        const ticks = item.ticks?.[0];
        
        if (ticks && contractMap.has(key)) {
          const existing = contractMap.get(key);
          existing.open_interest = ticks[1] || 0;  // CRITICAL FOR GEX!
        }
      });
    }
    
    console.log(`📊 Step 3: Added Open Interest`);
    
    // Step 4: Add Quote data (bid/ask for display)
    // Format: [ms_of_day, bid_size, bid_exchange, bid, bid_condition, ask_size, ask_exchange, ask, ask_condition, date]
    if (quoteData.response) {
      quoteData.response.forEach(item => {
        const contract = item.contract;
        const key = `${contract.strike}-${contract.right}`;
        const ticks = item.ticks?.[0];
        
        if (ticks && contractMap.has(key)) {
          const existing = contractMap.get(key);
          existing.bid = ticks[3] || 0;
          existing.ask = ticks[7] || 0;
          existing.bid_size = ticks[1] || 0;
          existing.ask_size = ticks[5] || 0;
          existing.mid = (existing.bid && existing.ask) ? (existing.bid + existing.ask) / 2 : 0;
          existing.spread = (existing.bid && existing.ask) ? existing.ask - existing.bid : 0;
        }
      });
    }
    
    console.log(`📊 Step 4: Added bid/ask quotes`);
    
    const options = Array.from(contractMap.values());
    
    console.log(`✅✅✅ COMPLETE: ${options.length} fully-merged options with GAMMA + OI`);
    if (options.length > 0) {
      console.log(`📊 Sample option with ALL data:`, options[0]);
    }

    return {
      type: 'options',
      response: options,
      latency: 0
    };
  } catch (error) {
    console.error(`❌ Options fetch error for ${symbol}:`, error.message);
    return { 
      type: 'options', 
      error: error.message, 
      response: [] 
    };
  }
}

// Get stock quote with Sunday/Early Monday fallback to Friday's close
export async function getStockQuote(symbol) {
  try {
    // 🕒 CHECK: Should we use EOD data? (12am-4am ANY day, Sunday, or Monday before 4AM)
    if (shouldUseEOD()) {
      console.log(`📅 Using EOD mode - fetching PREVIOUS trading day close for ${symbol}...`);
      return await getPreviousTradingDayEOD(symbol);
    }

    // Otherwise, fetch live data
    const url = `${THETA_TERMINAL}/v2/snapshot/stock/quote?root=${symbol}`;

    const response = await fetch(url);

    if (!response.ok) {
      // Fallback to EOD if live data fails during off-hours
      if (shouldUseEOD()) {
        console.log(`📅 Live quote failed during off-hours - fetching PREVIOUS trading day close for ${symbol}...`);
        return await getPreviousTradingDayEOD(symbol);
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.response || data.response.length === 0) {
      // Fallback to EOD if no data during off-hours
      if (shouldUseEOD()) {
        console.log(`📅 No snapshot available during off-hours - fetching PREVIOUS trading day close for ${symbol}...`);
        return await getPreviousTradingDayEOD(symbol);
      }
      throw new Error('No quote data received');
    }

    // Stock quote returns ticks array with format:
    // ["ms_of_day","bid_size","bid_exchange","bid","bid_condition","ask_size","ask_exchange","ask","ask_condition","date"]
    const ticks = data.response[0];

    if (!ticks || ticks.length === 0) {
      // Fallback to EOD if empty ticks during off-hours
      if (shouldUseEOD()) {
        console.log(`📅 Empty ticks during off-hours - fetching PREVIOUS trading day close for ${symbol}...`);
        return await getPreviousTradingDayEOD(symbol);
      }
      throw new Error('No tick data in response');
    }

    const [ms_of_day, bid_size, bid_exchange, bid, bid_condition, ask_size, ask_exchange, ask, ask_condition, date] = ticks;

    const price = (bid && ask) ? (bid + ask) / 2 : 0;

    const result = {
      type: 'stock',
      response: {
        price: price,
        bid: bid || 0,
        ask: ask || 0,
        bid_size: bid_size || 0,
        ask_size: ask_size || 0,
        volume: 0,
        last: price
      },
      latency: data.header?.latency_ms || 0
    };

    console.log(`✅ Stock quote: ${symbol} = $${price.toFixed(2)}`);
    return result;
  } catch (error) {
    console.error(`❌ Stock quote error for ${symbol}:`, error.message);

    // Final fallback to EOD if error during off-hours
    if (shouldUseEOD()) {
      console.log(`📅 Error during off-hours - fetching PREVIOUS trading day close for ${symbol}...`);
      return await getPreviousTradingDayEOD(symbol);
    }

    return {
      type: 'stock',
      error: error.message,
      response: null
    };
  }
}

// 🔥 Get last available data using bulk_snapshot (works during maintenance window)
// Uses option all_greeks snapshot which includes underlying price and gamma for GEX
async function getPreviousTradingDayEOD(symbol) {
  try {
    // Use all_greeks endpoint which works during maintenance window (12am-4am)
    // This gives the last available data for the entire options chain + underlying price + all greeks
    const url = `${THETA_TERMINAL}/v2/bulk_snapshot/option/all_greeks?root=${symbol}&exp=0`;

    console.log(`📊 Fetching last available all_greeks snapshot for ${symbol}...`);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.response || data.response.length === 0) {
      throw new Error('No snapshot data available');
    }

    // Get underlying price from the first contract's ticks
    // Format: ["ms_of_day","bid","ask","delta","theta","vega","rho","epsilon","lambda","gamma","vanna","charm","vomma","veta","speed","zomma","color","ultima","implied_vol","iv_error","ms_of_day2","underlying_price","date"]
    // Underlying price is at index 21 (not 12!)
    const firstContract = data.response[0];

    let underlyingPrice = null;

    // Get underlying price from ticks array (index 21)
    if (firstContract?.ticks && firstContract.ticks[0] && firstContract.ticks[0][21]) {
      underlyingPrice = firstContract.ticks[0][21];
      console.log(`📍 Got underlying price from all_greeks ticks: $${underlyingPrice.toFixed(2)}`);
    }

    // Fallback: calculate from ATM option if underlying price not found
    if (!underlyingPrice || underlyingPrice <= 0) {
      console.log('⚠️ Underlying price not found in ticks, estimating from ATM options...');
      // Find ATM call to estimate underlying price
      for (const item of data.response) {
        if (item.contract?.right === 'C' && item.ticks && item.ticks[0]) {
          const strike = item.contract.strike / 1000;
          const delta = item.ticks[0][3] || 0; // Delta is at index 3

          // ATM call should have delta close to 0.5
          if (Math.abs(delta - 0.5) < 0.1) {
            underlyingPrice = strike;
            console.log(`📍 Estimated underlying from ATM call: $${underlyingPrice.toFixed(2)}`);
            break;
          }
        }
      }
    }

    if (!underlyingPrice || underlyingPrice <= 0) {
      throw new Error('Could not determine underlying price from snapshot');
    }

    console.log(`✅ Using snapshot data for ${symbol}: $${underlyingPrice.toFixed(2)}`);

    return {
      type: 'stock',
      response: {
        price: underlyingPrice,
        bid: underlyingPrice,
        ask: underlyingPrice,
        bid_size: 0,
        ask_size: 0,
        volume: 0,
        last: underlyingPrice,
        isSnapshot: true
      },
      latency: 0
    };

  } catch (error) {
    console.error(`❌ Snapshot fallback failed for ${symbol}:`, error.message);
    return {
      type: 'stock',
      error: 'No data available',
      response: null
    };
  }
}

// Get available expirations
export async function getExpirations(symbol) {
  try {
    const url = `${THETA_TERMINAL}/v2/list/expirations?root=${symbol}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      type: 'expirations',
      response: data.response || []
    };
  } catch (error) {
    console.error(`❌ Expirations error for ${symbol}:`, error.message);
    return { 
      type: 'expirations', 
      response: [] 
    };
  }
}

// Get cached expirations from local JSON file (NO HTTP call)
// Used by manual entry system for instant lookups
export async function getCachedExpirations(symbol) {
  try {
    console.log(`📂 Looking up ${symbol} in cached universe...`);
    
    // Load pre-cached universe from JSON file
    const universeFile = Bun.file('./options-universe.json');
    const universeExists = await universeFile.exists();
    
    if (!universeExists) {
      console.error('❌ options-universe.json not found!');
      return { 
        type: 'cached_expirations', 
        success: false,
        error: 'Options universe file not found',
        response: [] 
      };
    }
    
    const universeData = await universeFile.json();
    const tickerUpper = symbol.toUpperCase();
    
    // Check if ticker exists in universe
    if (!universeData[tickerUpper]) {
      console.log(`⚠️ ${tickerUpper} not in options universe (195 tickers only)`);
      return {
        type: 'cached_expirations',
        success: false,
        error: `Ticker ${tickerUpper} not in options universe`,
        inUniverse: false,
        response: []
      };
    }
    
    // Filter to 0-3 DTE only
    const today = new Date();
    const todayStr = today.getFullYear() + 
                     String(today.getMonth() + 1).padStart(2, '0') + 
                     String(today.getDate()).padStart(2, '0');
    const todayInt = parseInt(todayStr);
    
    const allExpirations = universeData[tickerUpper];
    
    // Calculate DTE and filter
    const filteredExpirations = allExpirations
      .map(exp => {
        const expInt = parseInt(exp);
        
        // Calculate actual DTE (days difference)
        const expDate = new Date(
          parseInt(exp.substring(0, 4)),
          parseInt(exp.substring(4, 6)) - 1,
          parseInt(exp.substring(6, 8))
        );
        const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const dte = Math.floor((expDate - todayDate) / (1000 * 60 * 60 * 24));
        
        return {
          expiration: exp,
          dte: dte,
          expInt: expInt
        };
      })
      .filter(item => item.dte >= 0 && item.dte <= 3) // 0-3 DTE only
      .sort((a, b) => a.dte - b.dte); // Sort by DTE ascending
    
    // Format for display
    const formatted = filteredExpirations.map(item => {
      const expStr = String(item.expiration);
      const month = expStr.substring(4, 6);
      const day = expStr.substring(6, 8);
      
      // Format as "Oct 17 (0 DTE)", "Oct 18 (1 DTE)", etc.
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthName = monthNames[parseInt(month) - 1];
      
      return {
        expiration: item.expiration,
        dte: item.dte,
        label: `${monthName} ${day} (${item.dte} DTE)`
      };
    });
    
    console.log(`✅ Found ${formatted.length} expirations (0-3 DTE) for ${tickerUpper}`);
    
    return {
      type: 'cached_expirations',
      success: true,
      ticker: tickerUpper,
      inUniverse: true,
      count: formatted.length,
      response: formatted
    };
    
  } catch (error) {
    console.error(`❌ Error loading cached expirations for ${symbol}:`, error.message);
    return { 
      type: 'cached_expirations',
      success: false,
      error: error.message,
      response: [] 
    };
  }
}
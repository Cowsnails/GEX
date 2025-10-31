// api/alpaca.js - Multi-User Alpaca Broker Integration with Paper/Live Support
import { UserManager } from '../auth/userManager.js';
import { optionsStream } from './optionsStreamManager.js';
import { TradeHistoryManager } from '../utils/tradeHistoryManager.js';

// Alpaca API endpoints
const PAPER_API_URL = 'https://paper-api.alpaca.markets';
const LIVE_API_URL = 'https://api.alpaca.markets';

// Helper: Get user-specific Alpaca client
function getAlpacaHeaders(apiKey, apiSecret) {
  return {
    'APCA-API-KEY-ID': apiKey,
    'APCA-API-SECRET-KEY': apiSecret,
    'Content-Type': 'application/json'
  };
}

// Helper: Calculate number of contracts based on cash amount
function calculateContracts(premiumCost, cashAmount) {
  // Include 2% buffer for slippage
  const buffer = 1.02;
  const costPerContract = premiumCost * 100 * buffer; // Premium * 100 shares per contract
  const contracts = Math.floor(cashAmount / costPerContract);
  return Math.max(1, contracts); // At least 1 contract
}

// Find best ATM strike with highest profit potential
function findBestStrike(optionsData, currentPrice, direction) {
  if (!optionsData || optionsData.length === 0) return null;
  
  // Filter by direction (calls or puts)
  const filtered = optionsData.filter(opt => 
    opt.right === (direction === 'CALL' ? 'C' : 'P')
  );
  
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
  
  // Sort by highest gamma (most responsive to price moves) and liquidity
  atmOptions.sort((a, b) => {
    const liquidityA = a.bid_size + a.ask_size;
    const liquidityB = b.bid_size + b.ask_size;
    const gammaScore = (b.gamma || 0) - (a.gamma || 0);
    const liquidityScore = (liquidityB - liquidityA) * 0.1;
    return gammaScore + liquidityScore;
  });
  
  return atmOptions[0];
}

// Convert internal format to Alpaca option symbol (OCC format)
function formatAlpacaSymbol(root, expiration, strike, right) {
  // Format: SPY251219C00650000
  // root + YYMMDD + C/P + strike with 8 digits (5 before decimal, 3 after)

  // Remove dashes if present (convert "2025-10-24" to "20251024")
  const exp = String(expiration).replace(/-/g, '');

  // Extract date components
  const year = exp.substring(2, 4);   // YY from YYYYMMDD
  const month = exp.substring(4, 6);  // MM
  const day = exp.substring(6, 8);    // DD

  const strikeFormatted = String(Math.round(strike * 1000)).padStart(8, '0');

  return `${root}${year}${month}${day}${right}${strikeFormatted}`;
}

export class AlpacaBroker {
  
  // Place option order for specific user
  static async placeOrder(userId, orderParams) {
    try {
      // Get user's broker credentials - use active account if not specified
      const accountType = orderParams.accountType || null;
      const creds = UserManager.getBrokerCredentials(userId, 'alpaca', accountType);
      if (!creds.success) {
        return { success: false, error: 'No Alpaca credentials found. Please connect your broker.' };
      }
      
      const baseUrl = creds.isPaper ? PAPER_API_URL : LIVE_API_URL;
      const headers = getAlpacaHeaders(creds.apiKey, creds.apiSecret);

      const { symbol, expiration, strike, optionsData, currentPrice, direction, cashAmount, premiumPrice } = orderParams;

      // Find the option contract to trade
      let bestOption;

      // If strike is provided (from trader signal), use EXACT strike - don't recalculate
      if (strike && optionsData && optionsData.length > 0) {
        console.log(` Using EXACT strike from signal: $${strike}`);

        // Find the exact strike and right in optionsData
        const rightLetter = direction === 'CALL' ? 'C' : 'P';
        bestOption = optionsData.find(opt =>
          opt.strike === strike && opt.right === rightLetter
        );

        if (!bestOption) {
          console.warn(`WARNING: Exact strike $${strike} not found in options data, falling back to findBestStrike()`);
          bestOption = findBestStrike(optionsData, currentPrice, direction);
        } else {
          console.log(`Found exact match: ${strike}${rightLetter}`);
        }
      } else {
        // No strike provided - use intelligent selection (manual entry, etc.)
        console.log(`No strike specified, using findBestStrike() for ATM selection`);
        bestOption = findBestStrike(optionsData, currentPrice, direction);
      }

      if (!bestOption) {
        return { success: false, error: 'No suitable option found' };
      }

      // USE THE EXACT PREMIUM FROM THE SIGNAL IF PROVIDED - DON'T RECALCULATE
      let premiumCost;
      if (premiumPrice && premiumPrice > 0) {
        premiumCost = premiumPrice;
        console.log(`Using EXACT premium from signal: $${premiumCost.toFixed(4)}/share`);
      } else {
        premiumCost = bestOption.mid || (bestOption.ask + bestOption.bid) / 2;
        console.log(`WARNING: No premium provided, calculating from options data: $${premiumCost.toFixed(4)}/share`);
      }

      const quantity = calculateContracts(premiumCost, cashAmount);

      // Format option symbol for Alpaca
      const optionSymbol = formatAlpacaSymbol(
        symbol,
        expiration,
        bestOption.strike,
        bestOption.right
      );

      console.log(` Order Details for User ${userId}:`);
      console.log(`   Symbol: ${optionSymbol}`);
      console.log(`   Direction: ${direction}`);
      console.log(`   Strike: $${bestOption.strike}`);
      console.log(`   Estimated Premium: $${premiumCost.toFixed(2)}`);
      console.log(`   Quantity: ${quantity} contracts`);
      console.log(`   Estimated Cost: $${(premiumCost * quantity * 100).toFixed(2)}`);

      // Place MARKET order with Alpaca (guaranteed fill)
      const orderBody = {
        symbol: optionSymbol,
        qty: quantity,
        side: 'buy',
        type: 'market',
        time_in_force: 'day',
        order_class: 'simple'
      };
      
      const response = await fetch(`${baseUrl}/v2/orders`, {
        method: 'POST',
        headers,
        body: JSON.stringify(orderBody)
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error(' Alpaca order failed:', error);
        return { success: false, error: error.message || 'Order failed' };
      }
      
      let order = await response.json();
      let currentOrderId = order.id;

      console.log(` Market order submitted to Alpaca: ${currentOrderId}, Status: ${order.status}`);

      //  WAIT FOR MARKET ORDER FILL with RETRY logic
      // Market orders should fill instantly, but if pending we cancel and retry
      let actualEntryPrice = null;
      let finalOrderStatus = order.status;
      let filled = false;

      const maxRetries = 3; // Max 3 retry attempts
      const pollInterval = 2000; // 2 seconds between checks
      const maxPollAttempts = 3; // Wait 3 polls (6 seconds) before canceling

      for (let retry = 0; retry < maxRetries && !filled; retry++) {
        if (retry > 0) {
          console.log(` Retry attempt ${retry}/${maxRetries} - placing new market order...`);

          // Place new market order
          const retryResponse = await fetch(`${baseUrl}/v2/orders`, {
            method: 'POST',
            headers,
            body: JSON.stringify(orderBody)
          });

          if (retryResponse.ok) {
            order = await retryResponse.json();
            currentOrderId = order.id;
            console.log(`   New order ID: ${currentOrderId}`);
          } else {
            console.error(` Retry order failed`);
            continue;
          }
        }

        // Poll for fill
        for (let poll = 0; poll < maxPollAttempts && !filled; poll++) {
          await new Promise(resolve => setTimeout(resolve, pollInterval));

          // Check order status from Alpaca
          const statusResponse = await fetch(`${baseUrl}/v2/orders/${currentOrderId}`, {
            method: 'GET',
            headers
          });

          if (statusResponse.ok) {
            const orderStatus = await statusResponse.json();
            finalOrderStatus = orderStatus.status;

            console.log(`   Poll ${poll + 1}/${maxPollAttempts}: Status = ${orderStatus.status}`);

            if (orderStatus.status === 'filled' && orderStatus.filled_avg_price) {
              //  GOT THE FILL! Use Alpaca's actual fill price
              actualEntryPrice = parseFloat(orderStatus.filled_avg_price);
              filled = true;
              console.log(` MARKET ORDER FILLED! Entry price: $${actualEntryPrice.toFixed(4)}/share`);
              console.log(`   (This is what you actually paid at Alpaca)`);
              break;
            } else if (orderStatus.status === 'canceled' || orderStatus.status === 'rejected') {
              console.warn(` Order ${orderStatus.status}, will retry...`);
              break; // Break poll loop, continue retry loop
            }
          }
        }

        // If not filled after polling, cancel pending order before retry
        if (!filled && retry < maxRetries - 1) {
          console.log(` Order still pending, canceling order ${currentOrderId}...`);
          try {
            await fetch(`${baseUrl}/v2/orders/${currentOrderId}`, {
              method: 'DELETE',
              headers
            });
            console.log(`   Order canceled, will retry...`);
          } catch (cancelError) {
            console.warn(`   Cancel failed, continuing anyway...`);
          }
        }
      }

      // If still not filled after all retries, error out
      if (!filled || !actualEntryPrice) {
        console.error(` Market order failed to fill after ${maxRetries} retries`);
        return { success: false, error: 'Market order failed to fill' };
      }

      //  NEW: Immediately subscribe to ThetaData WebSocket stream for this contract
      console.log(` Auto-subscribing to ThetaData WebSocket for ${symbol} ${bestOption.strike}${bestOption.right}...`);

      const streamResult = await optionsStream.addDynamicContract(
        symbol,
        expiration,
        bestOption.strike,
        bestOption.right
      );

      if (streamResult.success) {
        if (streamResult.alreadyMonitored) {
          console.log(` Contract already streaming from ThetaData: ${symbol} ${bestOption.strike}${bestOption.right}`);
        } else {
          console.log(` ThetaData WebSocket streaming STARTED for user ${userId}'s position`);
        }
      } else {
        console.warn(` ThetaData WebSocket subscription failed (position still saved):`, streamResult.error);
      }

      // Save position with ALPACA's ACTUAL fill price as entry, ThetaData for live tracking
      const saveResult = UserManager.savePosition(userId, {
        symbol,
        optionSymbol,
        strike: bestOption.strike,
        expiration,
        right: bestOption.right,
        quantity,
        entryPrice: actualEntryPrice, //  ACTUAL fill price from Alpaca (what we really paid)
        entryOrderId: currentOrderId, // Use the final filled order ID
        isManual: orderParams.isManual || false,
        signalId: orderParams.signalId || null
      });

      console.log(` Position saved with Alpaca's actual fill price: $${actualEntryPrice.toFixed(4)}`);
      console.log(` Position ID: ${saveResult.positionId}`);
      console.log(` Live tracking will use ThetaData WebSocket for current premiums`);

      return {
        success: true,
        orderId: currentOrderId, // Return the final filled order ID
        positionId: saveResult.positionId, //  CRITICAL: Return position ID for linking to signal
        optionSymbol,
        strike: bestOption.strike,
        quantity,
        entryPrice: actualEntryPrice, //  Alpaca's ACTUAL fill price (what you paid)
        estimatedCost: actualEntryPrice * quantity * 100,
        orderStatus: finalOrderStatus,
        streamingStarted: streamResult.success,
        isManual: orderParams.isManual || false
      };
      
    } catch (error) {
      console.error(' Order placement error:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  // Exit position (sell to close) - Comprehensive exit with modes
  static async exitPosition(userId, positionId, accountType = null, exitSettings = {}) {
    // Support both new and old parameter names for backward compatibility
    const aggressiveFill = exitSettings.aggressiveFill || false;
    const marketOrderProtection = exitSettings.marketOrderProtection || exitSettings.exitGuarantee || false;
    const marketOrderTimer = exitSettings.marketOrderTimer || exitSettings.declineProtection || false;
    const currentMidPrice = exitSettings.currentPrice || null;

    // Keep references with old names for code compatibility
    const exitGuarantee = marketOrderProtection;
    const declineProtection = marketOrderTimer;

    try {
      // Get user's broker credentials
      const creds = UserManager.getBrokerCredentials(userId, 'alpaca', accountType);
      if (!creds.success) {
        return { success: false, error: 'No Alpaca credentials found' };
      }

      const baseUrl = creds.isPaper ? PAPER_API_URL : LIVE_API_URL;
      const headers = getAlpacaHeaders(creds.apiKey, creds.apiSecret);

      // Get position from database (try OPEN first)
      let positionResult = UserManager.getOpenPositions(userId);
      if (!positionResult.success) {
        return { success: false, error: 'Failed to get position' };
      }

      //  FIX: Handle type mismatch (string "33" vs number 33)
      const numericPositionId = typeof positionId === 'string' ? parseInt(positionId, 10) : positionId;

      // Try to find position by ID first (handle both types)
      let position = positionResult.positions.find(p =>
        p.id === positionId ||
        p.id === numericPositionId ||
        String(p.id) === String(positionId)
      );

      //  FALLBACK: If not found in OPEN positions, check by ID with any status
      if (!position && typeof numericPositionId === 'number') {
        console.log(` Position ${positionId} not in OPEN list, checking by ID (any status)...`);
        const posById = UserManager.getPositionById(userId, numericPositionId);
        if (posById.success && posById.position) {
          console.log(` Found position ${positionId} with status: ${posById.position.status}`);
          position = posById.position;
        }
      }

      // If not found by ID, it might be a trader signal ID
      // Try to match by finding the position through the signal
      if (!position) {
        console.log(` Position not found by ID: ${positionId}, checking trader signals...`);

        try {
          const signalsResult = TradeHistoryManager.getActiveSignals(userId);
          if (signalsResult.success && signalsResult.signals) {
            const signal = signalsResult.signals.find(s => s.id === positionId);
            if (signal && signal.positionId) {
              // Found signal, now get the actual position using positionId
              const signalNumericId = typeof signal.positionId === 'string' ? parseInt(signal.positionId, 10) : signal.positionId;
              position = positionResult.positions.find(p =>
                p.id === signal.positionId ||
                p.id === signalNumericId ||
                String(p.id) === String(signal.positionId)
              );
              if (position) {
                console.log(` Found position via signal.positionId: ${signal.positionId}`);
              } else {
                // Try getPositionById as fallback
                const posById = UserManager.getPositionById(userId, signalNumericId);
                if (posById.success && posById.position) {
                  position = posById.position;
                  console.log(` Found position via signal.positionId (any status): ${signal.positionId}`);
                }
              }
            }
          }
        } catch (err) {
          console.warn(` Could not check trader signals: ${err.message}`);
        }
      }

      if (!position) {
        console.error(` Position not found in database: ${positionId} (type: ${typeof positionId})`);
        console.log(`   Available positions:`, positionResult.positions.map(p => `${p.id} (${typeof p.id})`));
        return { success: false, error: 'Position not found in Alpaca database' };
      }

      console.log(` Found position to exit:`, {
        id: position.id,
        symbol: position.option_symbol,
        quantity: position.quantity,
        entryPrice: position.entry_price
      });

      let order = null;
      let exitPrice = position.entry_price; // fallback

      // MODE 1: AGGRESSIVE FILL - Adaptive filling with retry logic
      if (aggressiveFill && !creds.isPaper && currentMidPrice) {
        console.log(` AGGRESSIVE FILL enabled`);
        console.log(`   Starting mid: $${currentMidPrice.toFixed(2)}`);

        const initialMid = currentMidPrice;
        const maxAttempts = 4; // 4 attempts = 6 seconds
        const waitTime = 1500; // 1.5 seconds
        let currentMid = currentMidPrice;
        let attemptsPassed = 0;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          attemptsPassed = attempt + 1;
          const elapsedSeconds = (attempt * waitTime) / 1000;

          console.log(`   Attempt ${attemptsPassed}/${maxAttempts} (${elapsedSeconds}s elapsed)`);

          // Get latest mid price
          try {
            const quoteResponse = await fetch(`${baseUrl}/v2/options/quotes/latest?symbols=${position.option_symbol}`, {
              method: 'GET',
              headers
            });

            if (quoteResponse.ok) {
              const quoteData = await quoteResponse.json();
              const quote = quoteData.quotes[position.option_symbol];
              if (quote) {
                const latestMid = (quote.bp + quote.ap) / 2;
                console.log(`   Latest mid: $${latestMid.toFixed(2)} (was $${currentMid.toFixed(2)})`);

                // Check if mid moved naturally
                if (Math.abs(latestMid - currentMid) >= 0.005) { // Moved by at least $0.005
                  console.log(`    Mid moved naturally, following it`);
                  currentMid = latestMid;
                } else {
                  // Mid is frozen, force drop by $0.01
                  console.log(`    Mid frozen, forcing drop by $0.01`);
                  currentMid = currentMid - 0.01;
                }
              }
            }
          } catch (quoteError) {
            console.warn(`    Failed to get latest quote:`, quoteError);
          }

          // Place limit order at current mid
          const orderBody = {
            symbol: position.option_symbol,
            qty: position.quantity,
            side: 'sell',
            type: 'limit',
            limit_price: currentMid.toFixed(2),
            time_in_force: 'day',
            order_class: 'simple'
          };

          console.log(`   Placing limit at $${currentMid.toFixed(2)}`);
          const response = await fetch(`${baseUrl}/v2/orders`, {
            method: 'POST',
            headers,
            body: JSON.stringify(orderBody)
          });

          if (!response.ok) {
            const error = await response.json();
            console.error(`    Order failed:`, error);
            continue;
          }

          order = await response.json();
          console.log(`    Order placed: ${order.id}`);

          // Wait 1.5 seconds
          await new Promise(resolve => setTimeout(resolve, waitTime));

          // Check order status
          const statusResponse = await fetch(`${baseUrl}/v2/orders/${order.id}`, {
            method: 'GET',
            headers
          });

          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            console.log(`    Order status: ${statusData.status}`);

            if (statusData.status === 'filled') {
              // Extract actual filled price from Alpaca
              exitPrice = parseFloat(statusData.filled_avg_price);
              console.log(`    FILLED at $${exitPrice.toFixed(4)} (actual Alpaca fill)`);
              order = statusData;
              break; // Success!
            }

            // Not filled - cancel order
            console.log(`    Not filled, cancelling...`);
            try {
              await fetch(`${baseUrl}/v2/orders/${order.id}`, {
                method: 'DELETE',
                headers
              });
            } catch (cancelError) {
              console.error(`    Cancel failed:`, cancelError);
            }
          }

          // CHECK: Market Order Timer (after 6 seconds / 4 attempts)
          if (declineProtection && elapsedSeconds >= 6) {
            const isPremiumDeclining = currentMid < initialMid;
            if (isPremiumDeclining) {
              console.log(`    MARKET ORDER TIMER triggered at 6 seconds!`);
              console.log(`   Initial: $${initialMid.toFixed(2)} -> Current: $${currentMid.toFixed(2)}`);
              console.log(`   Placing MARKET ORDER to exit immediately`);

              const marketOrderBody = {
                symbol: position.option_symbol,
                qty: position.quantity,
                side: 'sell',
                type: 'market',
                time_in_force: 'day',
                order_class: 'simple'
              };

              const marketResponse = await fetch(`${baseUrl}/v2/orders`, {
                method: 'POST',
                headers,
                body: JSON.stringify(marketOrderBody)
              });

              if (marketResponse.ok) {
                order = await marketResponse.json();
                console.log(`    Market order placed`);
                break; // Exit loop
              }
            }
          }
        }

        // If not filled after all attempts, place market order as last resort
        if (!order || order.status !== 'filled') {
          console.log(`    All aggressive attempts failed, placing MARKET order`);
          const marketOrderBody = {
            symbol: position.option_symbol,
            qty: position.quantity,
            side: 'sell',
            type: 'market',
            time_in_force: 'day',
            order_class: 'simple'
          };

          const marketResponse = await fetch(`${baseUrl}/v2/orders`, {
            method: 'POST',
            headers,
            body: JSON.stringify(marketOrderBody)
          });

          if (marketResponse.ok) {
            order = await marketResponse.json();
            console.log(`    Market order placed`);
          } else {
            const error = await marketResponse.json();
            return { success: false, error: error.message || 'All exit attempts failed' };
          }
        }
      }
      // MODE 2: NORMAL EXIT / MARKET ORDER PROTECTION - Simple market order
      else {
        console.log(` Normal exit with market order (guaranteed fill)`);
        const orderBody = {
          symbol: position.option_symbol,
          qty: position.quantity,
          side: 'sell',
          type: 'market',
          time_in_force: 'day',
          order_class: 'simple'
        };

        const response = await fetch(`${baseUrl}/v2/orders`, {
          method: 'POST',
          headers,
          body: JSON.stringify(orderBody)
        });

        if (!response.ok) {
          const error = await response.json();
          console.error(' Exit order failed:', error);
          return { success: false, error: error.message || 'Exit failed' };
        }

        order = await response.json();
        console.log(` Exit market order submitted: ${order.id}, Status: ${order.status}`);
      }

      // WAIT FOR ACTUAL FILL and get REAL exit price from Alpaca
      console.log(` Waiting for exit order fill confirmation...`);
      let actualExitPrice = null;
      let filled = false;
      const maxPolls = 30; // 30 seconds max wait
      const pollInterval = 1000; // 1 second

      for (let poll = 0; poll < maxPolls; poll++) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));

        const statusResponse = await fetch(`${baseUrl}/v2/orders/${order.id}`, {
          method: 'GET',
          headers
        });

        if (statusResponse.ok) {
          const orderStatus = await statusResponse.json();
          console.log(`  Poll ${poll + 1}/${maxPolls}: ${orderStatus.status}`);

          if (orderStatus.status === 'filled') {
            // GOT THE FILL! Extract actual exit price
            actualExitPrice = parseFloat(orderStatus.filled_avg_price);
            filled = true;
            console.log(` EXIT ORDER FILLED! Actual exit price: $${actualExitPrice.toFixed(4)}/share`);
            break;
          } else if (orderStatus.status === 'canceled' || orderStatus.status === 'rejected') {
            console.error(` Exit order ${orderStatus.status}`);
            return { success: false, error: `Exit order ${orderStatus.status}` };
          }
        }
      }

      if (!filled || !actualExitPrice) {
        console.warn(` Exit order did not fill within ${maxPolls} seconds, using quote estimate`);
        // Fallback to quote mid price
        const quoteResponse = await fetch(`${baseUrl}/v2/options/quotes/latest?symbols=${position.option_symbol}`, {
          method: 'GET',
          headers
        });

        if (quoteResponse.ok) {
          const quoteData = await quoteResponse.json();
          const quote = quoteData.quotes[position.option_symbol];
          if (quote) {
            actualExitPrice = (quote.bp + quote.ap) / 2;
          }
        }
      }

      exitPrice = actualExitPrice || exitPrice;

      // Update position in database
      const closeResult = UserManager.closePosition(positionId, exitPrice);

      console.log(` Position exited for user ${userId}. P&L: $${closeResult.pnl?.toFixed(2)}`);

      return {
        success: true,
        orderId: order.id,
        exitPrice,
        pnl: closeResult.pnl,
        orderStatus: order.status
      };

    } catch (error) {
      console.error(' Exit position error:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  // Get account info -  SUPPORTS accountType parameter
  static async getAccountInfo(userId, accountType = null) {
    try {
      const creds = UserManager.getBrokerCredentials(userId, 'alpaca', accountType);
      if (!creds.success) {
        return { success: false, error: 'No Alpaca credentials found' };
      }
      
      const baseUrl = creds.isPaper ? PAPER_API_URL : LIVE_API_URL;
      const headers = getAlpacaHeaders(creds.apiKey, creds.apiSecret);
      
      const response = await fetch(`${baseUrl}/v2/account`, {
        method: 'GET',
        headers
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(' Alpaca API error:', response.status, errorText);
        return { success: false, error: `Failed to get account info: ${response.status}` };
      }
      
      const account = await response.json();
      
      return {
        success: true,
        buyingPower: parseFloat(account.cash), // Using cash instead of buying_power
        cash: parseFloat(account.cash),
        portfolioValue: parseFloat(account.portfolio_value),
        equity: parseFloat(account.equity),
        accountType: creds.accountType
      };
      
    } catch (error) {
      console.error(' Account info error:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  // Get current positions from Alpaca with REAL-TIME P&L
  static async getAlpacaPositions(userId, accountType = null) {
    try {
      const creds = UserManager.getBrokerCredentials(userId, 'alpaca', accountType);
      if (!creds.success) {
        return { success: false, positions: [] };
      }

      const baseUrl = creds.isPaper ? PAPER_API_URL : LIVE_API_URL;
      const headers = getAlpacaHeaders(creds.apiKey, creds.apiSecret);

      const response = await fetch(`${baseUrl}/v2/positions`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        return { success: false, positions: [] };
      }

      const positions = await response.json();

      return {
        success: true,
        positions: positions.map(p => ({
          symbol: p.symbol, // OCC format symbol
          quantity: parseFloat(p.qty),
          avgEntryPrice: parseFloat(p.avg_entry_price),
          currentPrice: parseFloat(p.current_price),
          marketValue: parseFloat(p.market_value),
          unrealizedPnl: parseFloat(p.unrealized_pl), //  ACTUAL P&L in dollars
          unrealizedPnlPercent: parseFloat(p.unrealized_plpc) * 100, //  ACTUAL P&L percentage
          costBasis: parseFloat(p.cost_basis),
          side: p.side,
          assetClass: p.asset_class
        }))
      };

    } catch (error) {
      console.error(' Get positions error:', error.message);
      return { success: false, positions: [] };
    }
  }
  
  // Test connection
  static async testConnection(apiKey, apiSecret, isPaper = true) {
    try {
      const baseUrl = isPaper ? PAPER_API_URL : LIVE_API_URL;
      const headers = getAlpacaHeaders(apiKey, apiSecret);
      
      console.log(` Testing connection to ${isPaper ? 'Paper' : 'Live'} API...`);
      
      const response = await fetch(`${baseUrl}/v2/account`, {
        method: 'GET',
        headers
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(' Connection test failed:', response.status, errorText);
        
        let errorMessage = 'Invalid API credentials';
        if (response.status === 401) {
          errorMessage = 'Invalid API Key or Secret';
        } else if (response.status === 403) {
          errorMessage = 'API access forbidden - check your account status';
        }
        
        return { success: false, error: errorMessage };
      }
      
      const account = await response.json();
      
      console.log(` Connection successful - Account: ${account.account_number}`);
      
      return {
        success: true,
        message: 'Connection successful',
        accountId: account.account_number,
        buyingPower: parseFloat(account.cash)
      };
      
    } catch (error) {
      console.error(' Connection test error:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  //  NEW: Method to ensure all user positions are streaming from ThetaData
  static async ensureUserPositionsAreStreaming(userId) {
    try {
      const positionsResult = UserManager.getOpenPositions(userId);

      if (!positionsResult.success) {
        return { success: false, error: 'Failed to get positions' };
      }

      let subscribed = 0;
      let alreadyStreaming = 0;

      for (const position of positionsResult.positions) {
        const result = await optionsStream.addDynamicContract(
          position.symbol,
          position.expiration,
          position.strike,
          position.right
        );

        if (result.success) {
          if (result.alreadyMonitored) {
            alreadyStreaming++;
          } else {
            subscribed++;
          }
        }
      }

      console.log(` User ${userId} positions: ${subscribed} new ThetaData subscriptions, ${alreadyStreaming} already streaming`);

      return {
        success: true,
        totalPositions: positionsResult.positions.length,
        newSubscriptions: subscribed,
        alreadyStreaming: alreadyStreaming
      };

    } catch (error) {
      console.error(' Error ensuring positions are streaming:', error.message);
      return { success: false, error: error.message };
    }
  }

  //  NEW: Cancel pending orders for a position
  static async cancelPendingOrders(userId, positionId, accountType = null, orderType = 'both') {
    try {
      // Get user's broker credentials
      const creds = UserManager.getBrokerCredentials(userId, 'alpaca', accountType);
      if (!creds.success) {
        return { success: false, error: 'No Alpaca credentials found' };
      }

      const baseUrl = creds.isPaper ? PAPER_API_URL : LIVE_API_URL;
      const headers = getAlpacaHeaders(creds.apiKey, creds.apiSecret);

      // Get pending order IDs from database
      const pendingResult = UserManager.getPendingOrders(positionId);
      if (!pendingResult.success) {
        return { success: false, error: 'Failed to get pending orders' };
      }

      const ordersToCancel = [];
      if ((orderType === 'entry' || orderType === 'both') && pendingResult.entryOrderId) {
        ordersToCancel.push({ id: pendingResult.entryOrderId, type: 'entry' });
      }
      if ((orderType === 'exit' || orderType === 'both') && pendingResult.exitOrderId) {
        ordersToCancel.push({ id: pendingResult.exitOrderId, type: 'exit' });
      }

      if (ordersToCancel.length === 0) {
        return { success: true, message: 'No pending orders to cancel', cancelledCount: 0 };
      }

      console.log(` Cancelling ${ordersToCancel.length} pending order(s) for position ${positionId}`);

      const results = [];
      for (const order of ordersToCancel) {
        try {
          const response = await fetch(`${baseUrl}/v2/orders/${order.id}`, {
            method: 'DELETE',
            headers
          });

          if (response.ok || response.status === 404) {
            // 404 means order already filled/cancelled - that's ok
            console.log(` Cancelled ${order.type} order: ${order.id}`);
            results.push({ orderId: order.id, type: order.type, success: true });

            // Clear the order ID from database
            UserManager.clearPendingOrders(positionId, order.type);
          } else {
            const error = await response.json();
            console.error(` Failed to cancel ${order.type} order:`, error);
            results.push({ orderId: order.id, type: order.type, success: false, error: error.message });
          }
        } catch (cancelError) {
          console.error(` Error cancelling ${order.type} order:`, cancelError);
          results.push({ orderId: order.id, type: order.type, success: false, error: cancelError.message });
        }
      }

      const successCount = results.filter(r => r.success).length;
      console.log(` Cancelled ${successCount}/${ordersToCancel.length} pending orders`);

      return {
        success: true,
        cancelledCount: successCount,
        totalOrders: ordersToCancel.length,
        results
      };

    } catch (error) {
      console.error(' Cancel orders error:', error.message);
      return { success: false, error: error.message };
    }
  }
}

export default AlpacaBroker;
// websocket/handler.js - COMPLETE with Multi-User Reference Counting + Online Users + Timing Engine + Time-Based Polling
import { UserManager } from '../auth/userManager.js';
import { rateLimiter } from '../utils/rateLimiter.js';
import { optionsStream } from '../api/optionsStreamManager.js';
import { entryTimingEngine } from '../api/entryTimingEngine.js';
import { AppSettingsManager } from '../utils/appSettingsManager.js';
import { isInLowFrequencyWindow } from '../api/thetaData.js';

export function handleWebSocket(getOptionsChain, getStockQuote, getExpirations, isBacktestMode) {

  // 🔥 SHARED STATE - Everyone watches the same ticker (admin controls it)
  // Load from database to persist across server restarts
  const savedTicker = AppSettingsManager.getCurrentTicker();
  const sharedState = {
    symbol: savedTicker.symbol,
    expiration: savedTicker.expiration
  };

  console.log(`📊 Loaded ticker from database: ${sharedState.symbol} (${sharedState.expiration})`);

  const connections = new Map();
  const messageRateLimits = new Map();
  let connectionIdCounter = 0;
  
  // 🆕 CRITICAL: Reference counting for multi-user subscriptions
  // Map<contractKey, Set<connectionId>>
  const contractSubscriptions = new Map();
  
  /**
   * Get contract key from contract details
   */
  function getContractKey(root, expiration, strike, right) {
    return `${root}:${expiration}:${strike}:${right}`;
  }
  
  /**
   * Subscribe a user to a contract (with reference counting)
   * Only subscribes to WebSocket if this is the FIRST user watching
   */
  async function subscribeUserToContract(connectionId, root, expiration, strike, right) {
    const contractKey = getContractKey(root, expiration, strike, right);

    // Get or create subscription set for this contract
    if (!contractSubscriptions.has(contractKey)) {
      contractSubscriptions.set(contractKey, new Set());
    }

    const subscribers = contractSubscriptions.get(contractKey);
    const wasEmpty = subscribers.size === 0;

    // Add this user to the subscription set
    subscribers.add(connectionId);

    const session = connections.get(connectionId);
    const username = session?.username || 'unknown';

    console.log(`📡 [SUBSCRIBE] ${username} (${connectionId}) subscribed to ${contractKey}`);
    console.log(`   - Subscriber count: ${subscribers.size}`);
    console.log(`   - First subscriber: ${wasEmpty}`);

    // 🔥 CRITICAL FIX: AWAIT the async addDynamicContract call!
    console.log(`   📡 Ensuring ThetaData subscription for ${contractKey}...`);
    let streamResult = await optionsStream.addDynamicContract({
      root: root,
      expiration: expiration,
      strike: parseFloat(strike),
      right: right
    });

    if (streamResult.success) {
      if (streamResult.alreadyMonitored) {
        console.log(`   ℹ️ ThetaData already streaming this contract`);
      } else {
        console.log(`   ✅ Successfully subscribed to ThetaData stream`);
      }
    } else {
      console.log(`   ⚠️ Failed to subscribe to ThetaData stream:`, streamResult.error);
    }

    return {
      success: true,
      subscriberCount: subscribers.size,
      isFirstSubscriber: wasEmpty,
      streamSubscribed: streamResult.success
    };
  }
  
  /**
   * Unsubscribe a user from a contract (with reference counting)
   * Only unsubscribes from WebSocket if this is the LAST user watching
   */
  async function unsubscribeUserFromContract(connectionId, root, expiration, strike, right) {
    const contractKey = getContractKey(root, expiration, strike, right);

    if (!contractSubscriptions.has(contractKey)) {
      console.log(`⚠️ [UNSUBSCRIBE] ${connectionId} tried to unsubscribe from ${contractKey} but no subscription exists`);
      return {
        success: false,
        error: 'Not subscribed to this contract'
      };
    }

    const subscribers = contractSubscriptions.get(contractKey);

    if (!subscribers.has(connectionId)) {
      console.log(`⚠️ [UNSUBSCRIBE] ${connectionId} not in subscriber set for ${contractKey}`);
      return {
        success: false,
        error: 'User not subscribed to this contract'
      };
    }

    // Remove this user from the subscription set
    subscribers.delete(connectionId);

    const session = connections.get(connectionId);
    const username = session?.username || 'unknown';

    console.log(`📡 [UNSUBSCRIBE] ${username} (${connectionId}) unsubscribed from ${contractKey}`);
    console.log(`   - Remaining subscribers: ${subscribers.size}`);

    // If no more subscribers, clean up and unsubscribe from WebSocket
    if (subscribers.size === 0) {
      console.log(`   🗑️ Last subscriber - removing from WebSocket stream`);
      contractSubscriptions.delete(contractKey);

      // 🔥 CRITICAL FIX: AWAIT the async removeDynamicContract call!
      const streamResult = await optionsStream.removeDynamicContract(
        root,
        expiration,
        parseFloat(strike),
        right
      );

      if (streamResult.success) {
        console.log(`   ✅ Successfully unsubscribed from WebSocket stream`);
      } else {
        console.log(`   ⚠️ Failed to unsubscribe from WebSocket stream`);
      }

      return {
        success: true,
        subscriberCount: 0,
        isLastSubscriber: true,
        streamUnsubscribed: streamResult.success
      };
    } else {
      console.log(`   ℹ️ Other users still watching - stream remains active`);
      return {
        success: true,
        subscriberCount: subscribers.size,
        isLastSubscriber: false,
        streamUnsubscribed: false
      };
    }
  }
  
  /**
   * Clean up all subscriptions for a disconnecting user
   */
  async function cleanupUserSubscriptions(connectionId) {
    const session = connections.get(connectionId);
    const username = session?.username || 'unknown';
    
    console.log(`🧹 [CLEANUP] Cleaning up all subscriptions for ${username} (${connectionId})`);
    
    let cleaned = 0;
    const contractsToRemove = [];
    
    // Find all contracts this user is subscribed to
    contractSubscriptions.forEach((subscribers, contractKey) => {
      if (subscribers.has(connectionId)) {
        contractsToRemove.push(contractKey);
      }
    });
    
    console.log(`   - Found ${contractsToRemove.length} contracts to clean up`);

    // Unsubscribe from each contract
    for (const contractKey of contractsToRemove) {
      const [root, expiration, strike, right] = contractKey.split(':');
      const result = await unsubscribeUserFromContract(connectionId, root, expiration, strike, right);
      if (result.success) {
        cleaned++;
      }
    }
    
    console.log(`   ✅ Cleaned up ${cleaned} subscriptions`);
    
    return cleaned;
  }
  
  /**
   * Get subscription stats for monitoring
   */
  function getSubscriptionStats() {
    const stats = {
      totalContracts: contractSubscriptions.size,
      totalSubscriptions: 0,
      contracts: []
    };
    
    contractSubscriptions.forEach((subscribers, contractKey) => {
      stats.totalSubscriptions += subscribers.size;
      stats.contracts.push({
        contract: contractKey,
        subscribers: subscribers.size,
        connectionIds: Array.from(subscribers)
      });
    });
    
    return stats;
  }
  
  // 🔒 SECURED: Race condition fixed + only sends to authenticated users
  async function broadcastToAll() {
    // 🔥 FIX: Don't broadcast live data in backtest mode
    if (isBacktestMode && isBacktestMode()) {
      console.log('⏭️ Skipping broadcast - system is in BACKTEST mode');
      return;
    }

    const symbol = sharedState.symbol;
    const expiration = sharedState.expiration;

    // Check connection health BEFORE fetching data
    let alive = 0;
    let dead = 0;
    let authenticated = 0;
    connections.forEach((session) => {
      if (session.ws.readyState === 1) {
        alive++;
        if (session.authenticated) authenticated++;
      } else {
        dead++;
      }
    });
    
    // Don't broadcast if no one is listening
    if (authenticated === 0) {
      return;
    }
    
    console.log(`📡 Broadcasting ${symbol}/${expiration} to ${connections.size} users (👥 Alive: ${alive}, 🔐 Auth: ${authenticated}, 💀 Dead: ${dead})`);
    
    try {
      const [exps, optData, stockData] = await Promise.all([
        getExpirations(symbol),
        getOptionsChain(symbol, expiration),
        getStockQuote(symbol)
      ]);
      
      if (symbol !== sharedState.symbol || expiration !== sharedState.expiration) {
        console.log('⚠️ State changed during fetch, discarding stale data');
        return;
      }
      
      let authenticatedCount = 0;
      let sendErrors = 0;
      
      connections.forEach((session, connId) => {
        // ✅ CRITICAL: Check readyState RIGHT before sending
        if (session.ws.readyState !== 1) {
          return; // Skip if not open
        }
        
        if (!session.authenticated) {
          return; // Skip if not authenticated
        }
        
        try {
          authenticatedCount++;
          session.ws.send(JSON.stringify(exps));
          session.ws.send(JSON.stringify(optData));
          session.ws.send(JSON.stringify(stockData));
        } catch (error) {
          sendErrors++;
          console.error(`❌ Error broadcasting to connection ${connId}:`, error.message);
          console.error(`   ReadyState: ${session.ws.readyState}, Auth: ${session.authenticated}`);
        }
      });
      
      if (sendErrors > 0) {
        console.log(`⚠️ Broadcast had ${sendErrors} errors`);
      }
      
    } catch (error) {
      console.error("❌ Broadcast error:", error);
    }
  }
  
  // 🆕 NEW: Broadcast online users list for chat widget
  function broadcastActiveUsers() {
    const adminUsers = [];
    const allOnlineUsers = []; // NEW: For chat widget
    
    connections.forEach((session) => {
      if (session.authenticated && session.ws.readyState === 1) {
        // Add to online users list (for chat)
        allOnlineUsers.push({
          username: session.username,
          isAdmin: session.isAdmin || false,
          userId: session.userId
        });
        
        // Existing admin tracking
        if (session.isAdmin) {
          adminUsers.push({
            username: session.username,
            isAdmin: true,
            ip: session.ipAddress || 'unknown'
          });
        }
      }
    });
    
    const count = allOnlineUsers.length;

    console.log(`📡 Broadcasting active users: ${count} total (${adminUsers.length} admins)`);

    // Send to ALL authenticated users (for chat widget)
    connections.forEach((session) => {
      if (session.ws.readyState === 1 && session.authenticated) {
        try {
          // Determine if this user can change ticker (admin OR solo user)
          const canChangeTicker = session.isAdmin || count === 1;

          // Send online users list with permission status
          session.ws.send(JSON.stringify({
            type: 'online_users',
            users: allOnlineUsers,
            count: count,
            canChangeTicker: canChangeTicker,
            isSoloUser: count === 1
          }));
          
          // Send admin-specific data only to admins
          if (session.isAdmin) {
            session.ws.send(JSON.stringify({
              type: 'active_users',
              users: adminUsers,
              count: adminUsers.length
            }));
          }
        } catch (error) {
          console.error(`❌ Error broadcasting to session:`, error.message);
        }
      }
    });
  }
  
  // 🔒 Helper function to extract session token from Cookie header
  function getSessionTokenFromCookie(cookieHeader) {
    if (!cookieHeader) return null;
    
    const cookies = cookieHeader.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'sessionToken') {
        return value;
      }
    }
    return null;
  }
  
  // 🧹 CLEANUP: Remove dead connections every 5 seconds - ✅ FIXED
  setInterval(async () => {
    let cleaned = 0;
    const now = Date.now();
    const toDelete = [];
    
    connections.forEach((session, connId) => {
      // ✅ CRITICAL FIX: Verify session still exists and has required fields
      if (!session || !session.ws) {
        console.error(`🚨 [CLEANUP] Invalid session ${connId} - missing required fields`);
        toDelete.push(connId);
        return;
      }
      
      const connectionAge = now - (session.connectedAt || now);
      const readyState = session.ws.readyState;
      
      // ✅ CRITICAL: NEVER delete authenticated connections that are OPEN (readyState === 1)
      if (readyState === 1 && session.authenticated) {
        return; // Skip - this is a healthy, active connection
      }
      
      // ✅ FIX: Give new connections MORE time to authenticate (grace period: 60 seconds)
      if (connectionAge < 60000) {
        return; // Skip - connection is too new to judge
      }
      
      // ✅ Delete CLOSED connections (readyState 2 or 3) after 10 seconds
      const isClosed = readyState === 2 || readyState === 3;
      if (isClosed && connectionAge > 10000) {
        toDelete.push(connId);
        return;
      }
      
      // ✅ Delete unauthenticated connections after 90 seconds
      if (!session.authenticated && connectionAge > 90000) {
        console.log(`⏰ [CLEANUP] Marking connection ${connId} for deletion - unauthenticated for ${Math.floor(connectionAge / 1000)}s`);
        toDelete.push(connId);
        return;
      }
      
      // ✅ Delete connections in bad state (not open, not properly closed)
      const isInBadState = readyState !== 1 && !isClosed;
      if (isInBadState && connectionAge > 60000) {
        toDelete.push(connId);
        return;
      }
    });
    
    // Delete marked connections
    for (const connId of toDelete) {
      const session = connections.get(connId);
      if (session) {
        console.log(`🧹 [CLEANUP] Removing connection ${connId}:`);
        console.log(`   - Age: ${Math.floor((now - session.connectedAt) / 1000)}s`);
        console.log(`   - ReadyState: ${session.ws.readyState}`);
        console.log(`   - Authenticated: ${session.authenticated}`);
        console.log(`   - Username: ${session.username || 'none'}`);

        if (session.authTimeout) {
          clearTimeout(session.authTimeout);
          session.authTimeout = null;
        }

        // 🆕 CRITICAL: Clean up user's contract subscriptions
        await cleanupUserSubscriptions(connId);

        optionsStream.unsubscribe(connId);
        entryTimingEngine.unsubscribe(connId);
        connections.delete(connId);
        messageRateLimits.delete(connId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 [CLEANUP] Cleaned up ${cleaned} zombie connections`);
      setTimeout(() => {
        broadcastActiveUsers();
      }, 1000);
    }
  }, 5000);
  
  // 🔥 AUTO-BROADCAST WITH TIME-AWARE FREQUENCY
  // Normal hours (4am-12am): Every 1 second for real-time data
  // Maintenance window (12am-4am): Every 5 seconds for EOD data (reduces load)
  let broadcastInterval = null;
  let currentInterval = 1000;
  let wasInBacktestMode = false;

  function updateBroadcastInterval() {
    // 🔥 FIX: Stop broadcasting in backtest mode
    if (isBacktestMode && isBacktestMode()) {
      if (broadcastInterval) {
        clearInterval(broadcastInterval);
        broadcastInterval = null;
        console.log('⏭️ [BROADCAST] Stopped - system is in BACKTEST mode');
      }
      wasInBacktestMode = true;
      return;
    }

    // 🔥 FIX: Resume broadcasting when switching from backtest to live
    if (wasInBacktestMode) {
      console.log('🔄 [BROADCAST] Resuming - switched from BACKTEST to LIVE mode');
      wasInBacktestMode = false;
      // Force restart by clearing interval
      if (broadcastInterval) {
        clearInterval(broadcastInterval);
        broadcastInterval = null;
      }
    }

    const inMaintenanceWindow = isInLowFrequencyWindow();
    const newInterval = inMaintenanceWindow ? 5000 : 1000;

    if (newInterval !== currentInterval || !broadcastInterval) {
      if (newInterval !== currentInterval) {
        console.log(`⏰ [BROADCAST-MODE] Switching interval from ${currentInterval}ms to ${newInterval}ms`);
        console.log(`   - Time: ${new Date().toLocaleTimeString()}`);
        console.log(`   - Mode: ${inMaintenanceWindow ? 'EOD data (12am-4am, 5s interval)' : 'Live data (4am-12am, 1s interval)'}`);
      }

      currentInterval = newInterval;

      // Clear old interval
      if (broadcastInterval) {
        clearInterval(broadcastInterval);
      }

      // Start new interval with updated frequency
      broadcastInterval = setInterval(() => {
        if (connections.size > 0) {
          broadcastToAll();
        }
      }, currentInterval);

      // Broadcast immediately on mode change
      if (connections.size > 0) {
        broadcastToAll();
      }
    }
  }

  // Initial broadcast setup
  updateBroadcastInterval();

  // Check mode every minute and update if needed
  setInterval(() => {
    updateBroadcastInterval();
  }, 60000); // Check every 60 seconds
  
  // 🔥 BROADCAST ONLINE USERS EVERY 5 SECONDS
  setInterval(() => {
    if (connections.size > 0) {
      broadcastActiveUsers();
    }
  }, 5000);
  
  // 🕐 WATCHDOG: Monitor for auth timeouts on authenticated users (should NEVER happen)
  setInterval(() => {
    connections.forEach((session, connId) => {
      if (session.authenticated && session.authTimeout) {
        console.error(`🚨 [WATCHDOG] CRITICAL BUG: Authenticated user ${connId} (${session.username}) has an auth timeout set!`);
        console.error(`   - This should NEVER happen and will cause disconnects`);
        console.error(`   - Clearing timeout now...`);
        clearTimeout(session.authTimeout);
        session.authTimeout = null;
      }
    });
  }, 5000);
  
  // 📊 STATS LOGGER: Log subscription stats every 30 seconds
  setInterval(() => {
    const stats = getSubscriptionStats();
    if (stats.totalContracts > 0) {
      console.log(`📊 [SUBSCRIPTION STATS]`);
      console.log(`   - Total contracts: ${stats.totalContracts}`);
      console.log(`   - Total subscriptions: ${stats.totalSubscriptions}`);
      console.log(`   - Avg subscribers per contract: ${(stats.totalSubscriptions / stats.totalContracts).toFixed(1)}`);
      
      // Show top 5 most watched contracts
      const topContracts = stats.contracts
        .sort((a, b) => b.subscribers - a.subscribers)
        .slice(0, 5);
      
      if (topContracts.length > 0) {
        console.log(`   - Top watched contracts:`);
        topContracts.forEach((c, i) => {
          console.log(`     ${i + 1}. ${c.contract} (${c.subscribers} users)`);
        });
      }
    }
  }, 30000);
  
  return {
    connections: connections, // Expose connections Map for mode switching
    async open(ws) {
      const connectionId = ++connectionIdCounter;
      
      console.log(`🔌 [OPEN] Connection ${connectionId} opening...`);
      console.log(`🔌 [OPEN] ws.data:`, ws.data);
      console.log(`🔌 [OPEN] Has cookie header:`, !!ws.data?.cookieHeader);
      console.log(`🔌 [OPEN] IP address:`, ws.data?.ipAddress);
      
      // 🔒 FIXED: Get cookie and IP from ws.data
      let autoAuthenticated = false;
      let sessionToken = null;
      const ipAddress = ws.data?.ipAddress || 'unknown';
      
      console.log(`🔌 [OPEN] Starting cookie extraction...`);
      
      // ✅ Extract cookie from the WebSocket data
      if (ws.data && ws.data.cookieHeader) {
        sessionToken = getSessionTokenFromCookie(ws.data.cookieHeader);
        
        if (sessionToken) {
          const authResult = UserManager.verifySession(sessionToken);
          
          if (authResult.valid) {
            const newSession = {
              ws: ws,
              userId: authResult.userId,
              isAdmin: authResult.isAdmin,
              authenticated: true,
              connectionId: connectionId,
              username: authResult.username,
              connectedAt: Date.now(),
              ipAddress: ipAddress,
              authTimeout: null // ✅ CRITICAL: No timeout for auto-authenticated users
            };
            
            connections.set(connectionId, newSession);
            console.log(`✅ [MAP] Added connection ${connectionId} to Map (size: ${connections.size})`);
            
            autoAuthenticated = true;
            
            console.log(`✅ [User ${connectionId}] Auto-authenticated: ${authResult.username}${authResult.isAdmin ? ' (👑 ADMIN)' : ''} from ${ipAddress}`);
            console.log(`   - Auth timeout: ${connections.get(connectionId)?.authTimeout ? 'SET (WARNING!)' : 'null (correct)'}`);

            ws.data = { connectionId };
            
            ws.send(JSON.stringify({
              type: 'auth_success',
              isAdmin: authResult.isAdmin,
              username: authResult.username,
              message: 'Authentication successful'
            }));
            
            // 📡 Subscribe to options stream
            optionsStream.subscribe(connectionId, (type, key, data) => {
              const session = connections.get(connectionId);
              if (session && session.ws.readyState === 1) {
                try {
                  if (type === 'options_quote') {
                    session.ws.send(JSON.stringify({
                      type: 'options_quote',
                      contractKey: key,
                      ...data
                    }));
                  } else if (type === 'stock_quote') {
                    session.ws.send(JSON.stringify({
                      type: 'stock_quote',
                      ticker: key,
                      ...data
                    }));
                  }
                } catch (error) {
                  console.error(`❌ Error in options stream callback:`, error.message);
                }
              }
            });
            
            // Subscribe to entry timing updates
            entryTimingEngine.subscribe(connectionId, (message) => {
              const session = connections.get(connectionId);
              if (session && session.ws.readyState === 1) {
                try {
                  session.ws.send(JSON.stringify(message));
                } catch (error) {
                  console.error(`❌ Error sending timing to ${connectionId}:`, error.message);
                }
              }
            });
            
            // Send current timing immediately to new client
            const currentTiming = entryTimingEngine.getCurrentTiming();
            if (currentTiming) {
              ws.send(JSON.stringify({
                type: 'entry_timing_update',
                timing: currentTiming,
                timestamp: Date.now()
              }));
            }
            
            // 🆕 Broadcast updated online users
            setTimeout(() => {
              broadcastActiveUsers();
            }, 500);
            
            // Send initial data
            try {
              const exps = await getExpirations(sharedState.symbol);
              const optData = await getOptionsChain(sharedState.symbol, sharedState.expiration);
              const stockData = await getStockQuote(sharedState.symbol);
              
              const currentSession = connections.get(connectionId);
              if (currentSession && currentSession.ws.readyState === 1) {
                ws.send(JSON.stringify(exps));
                ws.send(JSON.stringify(optData));
                ws.send(JSON.stringify(stockData));
              }
            } catch (error) {
              console.error(`❌ [User ${connectionId}] Initial data error:`, error);
            }
            
            return;
          }
        }
      }
      
      // If we didn't auto-authenticate, create unauthenticated session
      if (!autoAuthenticated) {
        const newSession = {
          ws: ws,
          userId: null,
          isAdmin: false,
          authenticated: false,
          connectionId: connectionId,
          connectedAt: Date.now(),
          ipAddress: ipAddress,
          authTimeout: null
        };
        
        connections.set(connectionId, newSession);
        console.log(`✅ [MAP] Added unauthenticated connection ${connectionId} to Map (size: ${connections.size})`);
        
        ws.data = { connectionId };
        
        console.log(`🔌 [User ${connectionId}] Connected - Awaiting authentication (Total: ${connections.size})`);
        
        ws.send(JSON.stringify({
          type: 'auth_required',
          message: 'Please authenticate to receive data',
          connectionId: connectionId
        }));
        
        const authTimeout = setTimeout(() => {
          const session = connections.get(connectionId);
          if (session && !session.authenticated) {
            console.log(`⏰ [TIMEOUT] Auth timeout for connection ${connectionId} - closing`);
            try {
              ws.send(JSON.stringify({
                type: 'auth_timeout',
                error: 'Authentication timeout - please refresh and login'
              }));
            } catch (e) {
              console.error(`❌ Error sending timeout message:`, e);
            }
            
            console.log(`🔴 [TIMEOUT] Closing WebSocket for ${connectionId}`);
            ws.close(1000, 'Authentication timeout');
            connections.delete(connectionId);
            messageRateLimits.delete(connectionId);
          } else {
            console.log(`✅ [TIMEOUT] Connection ${connectionId} already authenticated, skipping timeout`);
          }
        }, 45000); // Increased to 45 seconds
        
        const session = connections.get(connectionId);
        if (session) {
          session.authTimeout = authTimeout;
        }
      }
    },
    
    async message(ws, message) {
      const connectionId = ws.data?.connectionId;
      
      console.log(`📨 [MESSAGE] Received from connection ${connectionId}:`, message.toString().substring(0, 200));
      
      try {
        const msg = JSON.parse(message);
        console.log(`📨 [MESSAGE] Parsed type: ${msg.type}`);
        
        const session = connections.get(connectionId);
        
        if (!session) {
          console.error(`❌ [MESSAGE] No session found for connection ${connectionId}`);
          console.error(`   Available connection IDs: ${Array.from(connections.keys()).join(', ')}`);
          ws.close();
          return;
        }
        
        // Rate limiting
        const rateLimitKey = `ws:${connectionId}`;
        const rateCheck = rateLimiter.checkLimit(rateLimitKey, 20, 1000, 10000);
        
        if (!rateCheck.allowed) {
          ws.send(JSON.stringify({
            type: 'rate_limit_exceeded',
            error: 'Too many messages. Please slow down.',
            retryAfter: rateCheck.retryAfter
          }));
          return;
        }
        
        // Handle manual authentication
        if (msg.type === "auth") {
          // ✅ NEW: If already authenticated, just confirm and skip
          if (session.authenticated) {
            console.log(`ℹ️ [AUTH] Connection ${connectionId} already authenticated via cookie, ignoring manual auth`);
            ws.send(JSON.stringify({
              type: 'auth_success',
              isAdmin: session.isAdmin,
              username: session.username,
              message: 'Already authenticated via cookie'
            }));
            return;
          }
          
          if (!msg.token) {
            ws.send(JSON.stringify({
              type: 'auth_failed',
              error: 'Missing authentication token'
            }));
            return;
          }
          
          const authResult = UserManager.verifySession(msg.token);
          
          if (!authResult.valid) {
            console.log(`❌ [AUTH] Manual auth failed for connection ${connectionId}: ${authResult.error || 'Invalid token'}`);
            ws.send(JSON.stringify({
              type: 'auth_failed',
              error: 'Invalid or expired session token'
            }));
            
            setTimeout(() => {
              console.log(`🔴 [AUTH] Closing connection ${connectionId} due to failed manual auth`);
              ws.close(1000, 'Authentication failed');
              connections.delete(connectionId);
              messageRateLimits.delete(connectionId);
            }, 1000);
            
            return;
          }
          
          if (session.authTimeout) {
            clearTimeout(session.authTimeout);
            session.authTimeout = null;
          }
          
          session.userId = authResult.userId;
          session.isAdmin = authResult.isAdmin;
          session.authenticated = true;
          session.username = authResult.username;

          // Count authenticated users to determine if solo user
          const authenticatedCount = Array.from(connections.values()).filter(s => s.authenticated).length;
          const canChangeTicker = authResult.isAdmin || authenticatedCount === 1;

          ws.send(JSON.stringify({
            type: 'auth_success',
            isAdmin: authResult.isAdmin,
            username: authResult.username,
            message: 'Authentication successful',
            canChangeTicker: canChangeTicker,
            isSoloUser: authenticatedCount === 1
          }));
          
          optionsStream.subscribe(connectionId, (type, key, data) => {
            const currentSession = connections.get(connectionId);
            if (currentSession && currentSession.ws.readyState === 1) {
              try {
                if (type === 'options_quote') {
                  currentSession.ws.send(JSON.stringify({
                    type: 'options_quote',
                    contractKey: key,
                    ...data
                  }));
                } else if (type === 'stock_quote') {
                  currentSession.ws.send(JSON.stringify({
                    type: 'stock_quote',
                    ticker: key,
                    ...data
                  }));
                }
              } catch (error) {
                console.error(`❌ Error in options stream callback:`, error.message);
              }
            }
          });
          
          // Subscribe to entry timing updates
          entryTimingEngine.subscribe(connectionId, (message) => {
            const currentSession = connections.get(connectionId);
            if (currentSession && currentSession.ws.readyState === 1) {
              try {
                currentSession.ws.send(JSON.stringify(message));
              } catch (error) {
                console.error(`❌ Error sending timing to ${connectionId}:`, error.message);
              }
            }
          });
          
          // Send current timing immediately to new client
          const currentTiming = entryTimingEngine.getCurrentTiming();
          if (currentTiming) {
            ws.send(JSON.stringify({
              type: 'entry_timing_update',
              timing: currentTiming,
              timestamp: Date.now()
            }));
          }
          
          // 🆕 Broadcast updated online users
          setTimeout(() => {
            broadcastActiveUsers();
          }, 500);
          
          try {
            const exps = await getExpirations(sharedState.symbol);
            const optData = await getOptionsChain(sharedState.symbol, sharedState.expiration);
            const stockData = await getStockQuote(sharedState.symbol);
            
            const currentSession = connections.get(connectionId);
            if (currentSession && currentSession.ws.readyState === 1) {
              ws.send(JSON.stringify(exps));
              ws.send(JSON.stringify(optData));
              ws.send(JSON.stringify(stockData));
            }
          } catch (error) {
            ws.send(JSON.stringify({
              type: 'error',
              error: 'Failed to fetch market data'
            }));
          }
          
          return;
        }
        
        // Block all other messages until authenticated
        if (!session.authenticated) {
          ws.send(JSON.stringify({
            type: 'auth_required',
            error: 'Please authenticate first',
            action: msg.type
          }));
          return;
        }
        
        // TICKER CHANGE - Admins OR solo users can change ticker
        if (msg.type === "subscribe") {
          // Count authenticated users
          const authenticatedCount = Array.from(connections.values()).filter(s => s.authenticated).length;
          const canChangeTicker = session.isAdmin || authenticatedCount === 1;

          if (!canChangeTicker) {
            ws.send(JSON.stringify({
              type: 'permission_denied',
              error: '🔒 Only admins can change tickers when multiple users are online.',
              isAdmin: false,
              isSoloUser: false
            }));
            return;
          }

          if (!msg.symbol || typeof msg.symbol !== 'string') {
            ws.send(JSON.stringify({
              type: 'error',
              error: 'Invalid symbol format'
            }));
            return;
          }
          
          const oldSymbol = sharedState.symbol;
          const oldExpiration = sharedState.expiration;

          sharedState.symbol = msg.symbol.toUpperCase().trim();
          sharedState.expiration = msg.expiration || "20251219";

          // 💾 Persist ticker change to database
          AppSettingsManager.saveCurrentTicker(sharedState.symbol, sharedState.expiration);
          console.log(`📊 [ADMIN] Ticker changed from ${oldSymbol} to ${sharedState.symbol} by ${session.username}`);

          connections.forEach((s, id) => {
            if (s.ws.readyState === 1 && s.authenticated) {
              try {
                s.ws.send(JSON.stringify({
                  type: 'ticker_changed',
                  symbol: sharedState.symbol,
                  expiration: sharedState.expiration,
                  changedBy: session.username
                }));
              } catch (error) {
                console.error(`❌ Error notifying connection ${id}:`, error.message);
              }
            }
          });
          
          await broadcastToAll();
        }
        
        // 📡 ADD DYNAMIC CONTRACT - WITH REFERENCE COUNTING
        if (msg.type === "track_contract") {
          if (!msg.root || !msg.expiration || !msg.strike || !msg.right) {
            ws.send(JSON.stringify({
              type: 'error',
              error: 'Missing contract parameters'
            }));
            return;
          }

          console.log(`📡 [TRACK_CONTRACT] Request from ${connectionId} (${session.username}):`, {
            root: msg.root,
            expiration: msg.expiration,
            strike: msg.strike,
            right: msg.right
          });

          // 🔥 CRITICAL FIX: AWAIT the async subscription
          const result = await subscribeUserToContract(
            connectionId,
            msg.root,
            msg.expiration,
            msg.strike,
            msg.right
          );

          console.log(`📡 [TRACK_CONTRACT] Result:`, result);

          ws.send(JSON.stringify({
            type: 'contract_tracked',
            success: result.success,
            contract: `${msg.root}:${msg.expiration}:${msg.strike}:${msg.right}`,
            subscriberCount: result.subscriberCount,
            isFirstSubscriber: result.isFirstSubscriber,
            streamSubscribed: result.streamSubscribed
          }));
        }
        
        // 📡 REMOVE DYNAMIC CONTRACT - WITH REFERENCE COUNTING
        if (msg.type === "untrack_contract") {
          if (!msg.root || !msg.expiration || !msg.strike || !msg.right) {
            ws.send(JSON.stringify({
              type: 'error',
              error: 'Missing contract parameters'
            }));
            return;
          }

          // 🔥 CRITICAL FIX: AWAIT the async unsubscription
          const result = await unsubscribeUserFromContract(
            connectionId,
            msg.root,
            msg.expiration,
            msg.strike,
            msg.right
          );

          ws.send(JSON.stringify({
            type: 'contract_untracked',
            success: result.success,
            contract: `${msg.root}:${msg.expiration}:${msg.strike}:${msg.right}`,
            subscriberCount: result.subscriberCount,
            isLastSubscriber: result.isLastSubscriber,
            streamUnsubscribed: result.streamUnsubscribed
          }));
        }
        
        // 📡 GET OPTIONS STREAM STATS
        if (msg.type === "stream_stats") {
          const stats = optionsStream.getStats();
          const subStats = getSubscriptionStats();
          
          ws.send(JSON.stringify({
            type: 'stream_stats',
            ...stats,
            userSubscriptions: {
              totalContracts: subStats.totalContracts,
              totalSubscriptions: subStats.totalSubscriptions,
              avgPerContract: subStats.totalContracts > 0 ? 
                (subStats.totalSubscriptions / subStats.totalContracts).toFixed(1) : 0
            }
          }));
        }
        
        // 📊 GET QUOTE FOR SPECIFIC CONTRACT
        if (msg.type === "get_quote") {
          if (!msg.root || !msg.expiration || !msg.strike || !msg.right) {
            ws.send(JSON.stringify({
              type: 'error',
              error: 'Missing contract parameters'
            }));
            return;
          }
          
          const quote = optionsStream.getQuote(msg.root, msg.expiration, msg.strike, msg.right);
          
          ws.send(JSON.stringify({
            type: 'quote_response',
            contract: `${msg.root}:${msg.expiration}:${msg.strike}:${msg.right}`,
            quote: quote
          }));
        }
        
        // 📊 GET ALL QUOTES FOR A TICKER
        if (msg.type === "get_ticker_quotes") {
          if (!msg.root) {
            ws.send(JSON.stringify({
              type: 'error',
              error: 'Missing root ticker symbol'
            }));
            return;
          }
          
          const quotes = optionsStream.getTickerQuotes(msg.root);
          
          ws.send(JSON.stringify({
            type: 'ticker_quotes_response',
            root: msg.root,
            quotes: quotes,
            count: quotes.length
          }));
        }
        
        // 📊 GET STOCK QUOTE
        if (msg.type === "get_stock_quote") {
          if (!msg.ticker) {
            ws.send(JSON.stringify({
              type: 'error',
              error: 'Missing ticker symbol'
            }));
            return;
          }
          
          const stockQuote = optionsStream.getStockQuote(msg.ticker);
          
          ws.send(JSON.stringify({
            type: 'stock_quote',
            ticker: msg.ticker,
            price: stockQuote?.price || null,
            quote: stockQuote
          }));
        }
        
      } catch (e) {
        console.error(`❌ Message error from ${connectionId}:`, e);
        
        try {
          ws.send(JSON.stringify({
            type: 'error',
            error: 'Invalid message format'
          }));
        } catch (sendError) {}
      }
    },
    
    async close(ws) {
      const connectionId = ws.data?.connectionId;

      console.log(`🔴 [CLOSE] WebSocket closing - ConnectionId: ${connectionId}`);
      console.log(`   - ReadyState: ${ws.readyState}`);

      if (!connectionId) {
        console.log(`   - No connectionId found, skipping cleanup`);
        return;
      }

      // 🆕 CRITICAL: Clean up ALL of this user's contract subscriptions
      await cleanupUserSubscriptions(connectionId);
      
      // Unsubscribe from timing engine
      entryTimingEngine.unsubscribe(connectionId);
      
      const session = connections.get(connectionId);
      
      if (session) {
        console.log(`❌ [User ${connectionId}] ${session.username ? `(${session.username})` : ''} Disconnected`);
        console.log(`   - Was authenticated: ${session.authenticated}`);
        console.log(`   - Connection age: ${Math.floor((Date.now() - session.connectedAt) / 1000)}s`);
        
        if (session.authTimeout) {
          clearTimeout(session.authTimeout);
          session.authTimeout = null;
        }
        
        optionsStream.unsubscribe(connectionId);
      }
      
      connections.delete(connectionId);
      messageRateLimits.delete(connectionId);
      
      console.log(`🔌 [CLOSE] Connection ${connectionId} cleanup complete. Remaining: ${connections.size}`);
      
      // 🆕 Broadcast updated online users
      setTimeout(() => {
        broadcastActiveUsers();
      }, 500);
    }
  };
}
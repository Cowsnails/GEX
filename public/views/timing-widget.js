// public/views/timing-widget.js - Fixed without inline handlers + no localStorage

export function renderEntryTimingWidget() {
  const timing = window.serverTiming;
  
  // If no data yet OR missing required data, show loading state
  if (!timing || !window.appState?.optionsData?.length || !window.appState?.stockData || !window.appState?.priceHistory?.length) {
    return `
      <div id="timing-widget-main" style="background:linear-gradient(135deg, #374151 0%, #4b5563 100%);border-radius:16px;padding:32px;border:3px solid #6b7280;margin-bottom:24px;">
        <div style="text-align:center;color:#9ca3af;">
          <div style="font-size:16px;margin-bottom:12px;">⏱️ Entry Timing System</div>
          <div style="font-size:48px;margin-bottom:8px;">⏳</div>
          <div style="font-size:14px;">Connecting to timing engine...</div>
          <div style="font-size:12px;margin-top:8px;color:#6b7280;">
            Options: ${window.appState?.optionsData?.length || 0} | 
            Stock: ${window.appState?.stockData ? '✓' : '✗'} |
            History: ${window.appState?.priceHistory?.length || 0}/20
          </div>
        </div>
      </div>
    `;
  }
  
  // Status-based styling
  const statusStyles = {
    'ENTER NOW': {
      bg: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
      border: '#10b981',
      pulse: true,
      icon: '🎯',
      text: 'ENTER NOW'
    },
    'READY': {
      bg: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
      border: '#3b82f6',
      pulse: false,
      icon: '⚡',
      text: 'READY (5s)'
    },
    'BUILDING': {
      bg: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
      border: '#f59e0b',
      pulse: false,
      icon: '⏳',
      text: 'BUILDING (10s)'
    },
    'WAIT': {
      bg: 'linear-gradient(135deg, #374151 0%, #4b5563 100%)',
      border: '#6b7280',
      pulse: false,
      icon: '⏸️',
      text: 'WAIT'
    }
  };
  
  const style = statusStyles[timing.windowStatus] || statusStyles['WAIT'];
  const pulseAnimation = style.pulse ? 'animation: timing-pulse 1.5s infinite;' : '';
  
  let html = `
    <style>
      @keyframes timing-pulse {
        0%, 100% { transform: scale(1); box-shadow: 0 8px 32px rgba(16, 185, 129, 0.4); }
        50% { transform: scale(1.02); box-shadow: 0 12px 48px rgba(16, 185, 129, 0.6); }
      }
      .trade-btn {
        padding: 16px 24px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        min-width: 120px;
      }
      .trade-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      .trade-btn:not(:disabled):hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0,0,0,0.3);
      }
      .buy-call-btn {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: #fff;
      }
      .buy-put-btn {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        color: #fff;
      }
      .exit-btn {
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        color: #fff;
      }
      .cash-btn {
        padding: 12px 20px;
        background: rgba(59, 130, 246, 0.1);
        border: 2px solid #3b82f6;
        border-radius: 6px;
        color: #3b82f6;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
      }
      .cash-btn:hover {
        background: rgba(59, 130, 246, 0.2);
        border-color: #60a5fa;
      }
      .cash-btn.active {
        background: #3b82f6;
        color: #fff;
      }
    </style>
  `;
  
  // Main timing display
  html += `
    <div id="timing-widget-main" style="background:${style.bg};border-radius:16px;padding:32px;border:3px solid ${style.border};margin-bottom:24px;${pulseAnimation}">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        
        <div style="flex:1;">
          <div style="font-size:14px;color:rgba(255,255,255,0.8);margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">
            ⏱️ ENTRY TIMING WINDOW
          </div>
          <div id="timing-status" style="font-size:56px;font-weight:900;color:#fff;margin-bottom:8px;display:flex;align-items:center;gap:16px;">
            <span>${style.icon}</span>
            <span>${style.text}</span>
          </div>
          <div id="timing-direction" style="font-size:16px;color:rgba(255,255,255,0.9);">
            ${timing.direction} • ${timing.entryQuality.toUpperCase()} Quality
            ${timing.sustainedEntry ? ' • 🔥 SUSTAINED' : ''}
          </div>
        </div>
        
        <div style="text-align:center;background:rgba(0,0,0,0.3);padding:24px;border-radius:12px;min-width:180px;">
          <div style="font-size:14px;color:rgba(255,255,255,0.8);margin-bottom:8px;">ENTRY SCORE</div>
          <div id="timing-score" style="font-size:72px;font-weight:900;color:#fff;line-height:1;">${timing.compositeScore}</div>
          <div style="font-size:14px;color:rgba(255,255,255,0.8);margin-top:8px;">/100</div>
        </div>
      </div>
      
      <div style="margin-top:24px;display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
        ${renderScoreBar('Proximity', timing.scores.proximity)}
        ${renderScoreBar('Gamma Env', timing.scores.gamma)}
        ${renderScoreBar('Momentum', timing.scores.momentum)}
        ${renderScoreBar('Order Flow', timing.scores.flow)}
        ${renderScoreBar('Options', timing.scores.options)}
        ${renderScoreBar('Compression', timing.scores.compression)}
      </div>
    </div>
  `;
  
  // 💰 TRADING PANEL - Buy/Exit Buttons (USER-ISOLATED)
  html += `
    <div style="background:linear-gradient(135deg, #1a2332 0%, #151b2e 100%);border:2px solid #3b82f6;border-radius:16px;padding:24px;margin-bottom:24px;box-shadow:0 8px 32px rgba(59,130,246,0.2);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <div>
          <div style="font-size:18px;font-weight:700;color:#fff;margin-bottom:4px;">💰 Your Quick Entry Panel</div>
          <div style="font-size:13px;color:#9ca3af;">Auto-selects best ATM strike • Your orders only</div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;">
          <div id="user-badge" style="padding:6px 12px;background:rgba(59,130,246,0.15);border:1px solid #3b82f6;border-radius:6px;font-size:12px;color:#3b82f6;font-weight:600;">
            <span id="current-username">Loading...</span>
          </div>
          <div id="broker-status" style="padding:8px 16px;background:rgba(107,114,128,0.2);border:1px solid #6b7280;border-radius:6px;font-size:12px;color:#9ca3af;display:flex;align-items:center;gap:8px;">
            <span id="broker-status-text">Not Connected</span>
            <span id="buying-power-display" style="display:none;color:#10b981;font-weight:700;"></span>
          </div>
        </div>
      </div>
      
      <!-- Cash Amount Selection -->
      <div style="margin-bottom:20px;">
        <div style="font-size:13px;color:#9ca3af;margin-bottom:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Select Position Size</div>
        <div style="display:flex;gap:12px;">
          <button class="cash-btn" data-amount="500">$500</button>
          <button class="cash-btn active" data-amount="1000">$1,000</button>
          <button class="cash-btn" data-amount="5000">$5,000</button>
        </div>
      </div>
      
      <!-- Buy Buttons -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
        <button class="trade-btn buy-call-btn" data-direction="CALL" id="buy-call-btn">
          <span>📈</span>
          <span>BUY CALL</span>
        </button>
        <button class="trade-btn buy-put-btn" data-direction="PUT" id="buy-put-btn">
          <span>📉</span>
          <span>BUY PUT</span>
        </button>
      </div>
      
      <!-- Open Positions Display (YOUR positions only) -->
      <div id="open-positions-container" style="display:none;margin-top:24px;padding-top:24px;border-top:1px solid #3d4a5c;">
        <div style="font-size:14px;color:#9ca3af;margin-bottom:12px;font-weight:600;">📊 YOUR OPEN POSITIONS</div>
        <div id="open-positions-list"></div>
      </div>
      
      <!-- Order Status Display -->
      <div id="order-status" style="display:none;margin-top:16px;padding:12px;border-radius:8px;font-size:13px;"></div>
    </div>
  `;
  
  html += `
    <div style="display:grid;grid-template-columns:2fr 1fr;gap:16px;margin-bottom:24px;">
      <div style="background:linear-gradient(135deg, #1a2332 0%, #151b2e 100%);border:1px solid #2a3547;border-radius:12px;padding:20px;">
        <div style="font-size:14px;color:#9ca3af;margin-bottom:16px;font-weight:600;">🎯 KEY LEVELS</div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;">
          <div style="background:rgba(16,185,129,0.1);border:1px solid #10b981;border-radius:8px;padding:12px;">
            <div style="font-size:11px;color:#6ee7b7;margin-bottom:4px;">🛡️ SUPPORT</div>
            <div style="font-size:24px;font-weight:700;color:#10b981;">$${timing.levels.support?.toFixed(0) || '--'}</div>
            <div style="font-size:12px;color:#9ca3af;margin-top:4px;">${timing.metrics.supportDistance}% away</div>
          </div>
          
          <div style="background:rgba(239,68,68,0.1);border:1px solid #ef4444;border-radius:8px;padding:12px;">
            <div style="font-size:11px;color:#fca5a5;margin-bottom:4px;">🚧 RESISTANCE</div>
            <div style="font-size:24px;font-weight:700;color:#ef4444;">$${timing.levels.resistance?.toFixed(0) || '--'}</div>
            <div style="font-size:12px;color:#9ca3af;margin-top:4px;">${timing.metrics.resistanceDistance}% away</div>
          </div>
        </div>
      </div>
      
      <div style="background:linear-gradient(135deg, #1a2332 0%, #151b2e 100%);border:1px solid #2a3547;border-radius:12px;padding:20px;">
        <div style="font-size:14px;color:#9ca3af;margin-bottom:16px;font-weight:600;">🚨 ALERTS</div>
        ${timing.alerts.nearSupport ? '<div style="padding:8px;background:rgba(16,185,129,0.1);border-left:3px solid #10b981;border-radius:4px;margin-bottom:8px;font-size:12px;color:#10b981;">• Near Support</div>' : ''}
        ${timing.alerts.nearResistance ? '<div style="padding:8px;background:rgba(239,68,68,0.1);border-left:3px solid #ef4444;border-radius:4px;margin-bottom:8px;font-size:12px;color:#ef4444;">• Near Resistance</div>' : ''}
        ${timing.alerts.highMomentum ? '<div style="padding:8px;background:rgba(59,130,246,0.1);border-left:3px solid #3b82f6;border-radius:4px;margin-bottom:8px;font-size:12px;color:#3b82f6;">• High Momentum</div>' : ''}
      </div>
    </div>
  `;
  
  html += `
    <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:12px;">
      ${renderMetricCard('Momentum', timing.metrics.momentum + '%', parseFloat(timing.metrics.momentum) > 0)}
      ${renderMetricCard('Velocity', timing.metrics.velocity + '%', parseFloat(timing.metrics.velocity) > 0)}
      ${renderMetricCard('Flow Imbalance', timing.metrics.flowImbalance + '%', parseFloat(timing.metrics.flowImbalance) > 0)}
      ${renderMetricCard('Support Dist', timing.metrics.supportDistance + '%', false)}
      ${renderMetricCard('Resist Dist', timing.metrics.resistanceDistance + '%', false)}
      ${renderMetricCard('Compression', timing.metrics.compression + '%', false)}
    </div>
  `;
  
  return html;
}

// 🔥 Explicit initialization function called after DOM render
export function initializeTimingWidget() {
  console.log('🔧 Initializing timing widget...');
  
  // Set default cash amount
  if (typeof window.selectedCashAmount === 'undefined') {
    window.selectedCashAmount = 1000;
  }
  
  // Cash amount buttons
  document.querySelectorAll('.cash-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const amount = parseInt(this.getAttribute('data-amount'));
      window.selectedCashAmount = amount;
      
      document.querySelectorAll('.cash-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      
      console.log(`💰 Position size selected: $${amount}`);
    });
  });
  
  // Buy CALL button
  const buyCallBtn = document.getElementById('buy-call-btn');
  if (buyCallBtn) {
    buyCallBtn.addEventListener('click', function() {
      placeBuyOrder('CALL');
    });
  }
  
  // Buy PUT button
  const buyPutBtn = document.getElementById('buy-put-btn');
  if (buyPutBtn) {
    buyPutBtn.addEventListener('click', function() {
      placeBuyOrder('PUT');
    });
  }
  
  // Update username display
  updateUsernameDisplay();
  
  // Check broker status immediately
  checkBrokerStatus();
  
  console.log('✅ Timing widget initialized');
}

// Make initialization function available globally
if (typeof window !== 'undefined') {
  window.initializeTimingWidget = initializeTimingWidget;
}

// Function to update widget without full re-render
export function updateTimingWidgetOnly() {
  const timing = window.serverTiming;
  if (!timing) return;
  
  // Update status
  const statusEl = document.getElementById('timing-status');
  if (statusEl) {
    const statusStyles = {
      'ENTER NOW': { icon: '🎯', text: 'ENTER NOW' },
      'READY': { icon: '⚡', text: 'READY (5s)' },
      'BUILDING': { icon: '⏳', text: 'BUILDING (10s)' },
      'WAIT': { icon: '⏸️', text: 'WAIT' }
    };
    const style = statusStyles[timing.windowStatus] || statusStyles['WAIT'];
    statusEl.innerHTML = '<span>' + style.icon + '</span><span>' + style.text + '</span>';
  }
  
  // Update direction
  const directionEl = document.getElementById('timing-direction');
  if (directionEl) {
    directionEl.textContent = timing.direction + ' • ' + timing.entryQuality.toUpperCase() + ' Quality' + (timing.sustainedEntry ? ' • 🔥 SUSTAINED' : '');
  }
  
  // Update score
  const scoreEl = document.getElementById('timing-score');
  if (scoreEl) {
    scoreEl.textContent = timing.compositeScore;
  }
  
  // Update open positions (only user's positions)
  updateOpenPositions();
}

// Trading state management (per-user)
window.selectedCashAmount = 1000; // Default
window.userPositions = []; // User's positions only
window.userBuyingPower = 0; // User's buying power

// Get current username from API
async function getCurrentUsername() {
  try {
    const response = await fetch('/api/auth/verify', {
      credentials: 'include'
    });
    const data = await response.json();
    return data.valid ? data.username : 'Guest';
  } catch {
    return 'Guest';
  }
}

// Check if user is authenticated
async function isAuthenticated() {
  try {
    const response = await fetch('/api/auth/verify', {
      credentials: 'include'
    });
    const data = await response.json();
    return data.valid;
  } catch {
    return false;
  }
}

// Place buy order (user-specific)
async function placeBuyOrder(direction) {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    showOrderStatus('❌ Please login to place orders', 'error');
    setTimeout(() => {
      window.location.href = '/login';
    }, 2000);
    return;
  }
  
  const buyBtn = direction === 'CALL' ? document.getElementById('buy-call-btn') : document.getElementById('buy-put-btn');
  buyBtn.disabled = true;
  buyBtn.innerHTML = '<span>⏳</span><span>PLACING...</span>';
  
  try {
    const symbol = document.getElementById('symbolInput').value.toUpperCase();
    const expiration = document.getElementById('expSelect').value;
    const cashAmount = window.selectedCashAmount;
    
    const response = await fetch('/api/broker/order', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        symbol,
        expiration,
        optionsData: window.appState.optionsData,
        currentPrice: window.appState.stockData.price,
        direction,
        cashAmount
      })
    });
    
    const result = await response.json();
    
    if (!result.success) {
      showOrderStatus(`❌ Order Failed: ${result.error}`, 'error');
      buyBtn.disabled = false;
      buyBtn.innerHTML = direction === 'CALL' ? '<span>📈</span><span>BUY CALL</span>' : '<span>📉</span><span>BUY PUT</span>';
      return;
    }
    
    // Success!
    showOrderStatus(
      `✅ Order Placed! ${result.quantity} contracts @ $${result.entryPrice.toFixed(2)} = $${result.estimatedCost.toFixed(2)}`,
      'success'
    );
    
    console.log(`✅ Order placed for user:`, result);
    
    // Refresh positions and buying power
    await loadUserPositions();
    await updateBuyingPower();
    
    // Re-enable button
    buyBtn.disabled = false;
    buyBtn.innerHTML = direction === 'CALL' ? '<span>📈</span><span>BUY CALL</span>' : '<span>📉</span><span>BUY PUT</span>';
    
  } catch (error) {
    console.error('❌ Order error:', error);
    showOrderStatus(`❌ Connection Error: ${error.message}`, 'error');
    buyBtn.disabled = false;
    buyBtn.innerHTML = direction === 'CALL' ? '<span>📈</span><span>BUY CALL</span>' : '<span>📉</span><span>BUY PUT</span>';
  }
}

// Exit position (user-specific)
async function exitPosition(positionIndex) {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    showOrderStatus('❌ Please login first', 'error');
    return;
  }
  
  if (!confirm('Exit this position at market price?')) return;
  
  const position = window.userPositions[positionIndex];
  if (!position) return;
  
  // Find the position ID (assuming it's stored in the position object)
  const positionId = positionIndex; // You may need to adjust this based on your data structure
  
  try {
    const response = await fetch('/api/broker/exit', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ positionId })
    });
    
    const result = await response.json();
    
    if (!result.success) {
      showOrderStatus(`❌ Exit Failed: ${result.error}`, 'error');
      return;
    }
    
    // Show P&L
    const pnlColor = result.pnl >= 0 ? '#10b981' : '#ef4444';
    const pnlSign = result.pnl >= 0 ? '+' : '';
    showOrderStatus(
      `✅ Position Closed! P&L: ${pnlSign}$${result.pnl.toFixed(2)}`,
      result.pnl >= 0 ? 'success' : 'warning'
    );
    
    console.log(`✅ Position exited with P&L: ${result.pnl}`);
    
    // Refresh positions and buying power
    await loadUserPositions();
    await updateBuyingPower();
    
  } catch (error) {
    console.error('❌ Exit error:', error);
    showOrderStatus(`❌ Connection Error: ${error.message}`, 'error');
  }
}

// Update buying power display
async function updateBuyingPower() {
  const authenticated = await isAuthenticated();
  if (!authenticated) return;

  // 🔥 FIX: Don't call live endpoints in backtest mode
  if (window.backtestMode) {
    console.log('⏭️ Skipping buying power update - in backtest mode');
    return;
  }

  try {
    const response = await fetch('/api/broker/account', {
      credentials: 'include'
    });
    
    const result = await response.json();
    
    if (result.success) {
      window.userBuyingPower = result.buyingPower;
      
      const buyingPowerEl = document.getElementById('buying-power-display');
      if (buyingPowerEl) {
        buyingPowerEl.textContent = `$${result.buyingPower.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        buyingPowerEl.style.display = 'inline';
      }
      
      console.log(`💰 Buying Power: $${result.buyingPower.toFixed(2)}`);
    }
    
  } catch (error) {
    console.error('❌ Failed to update buying power:', error);
  }
}

// Load user's positions (only theirs)
async function loadUserPositions() {
  const authenticated = await isAuthenticated();
  if (!authenticated) return;

  // 🔥 FIX: Don't call live endpoints in backtest mode
  if (window.backtestMode) {
    console.log('⏭️ Skipping positions load - in backtest mode');
    return;
  }

  try {
    const response = await fetch('/api/broker/positions', {
      credentials: 'include'
    });
    
    const result = await response.json();
    
    if (!result.success || !result.positions) {
      return;
    }
    
    window.userPositions = result.positions;
    displayOpenPositions(result.positions);
    
  } catch (error) {
    console.error('❌ Failed to load positions:', error);
  }
}

// Track if we've already warned about missing container
let positionsContainerWarned = false;

// Display user's open positions
function displayOpenPositions(positions) {
  const container = document.getElementById('open-positions-container');
  const list = document.getElementById('open-positions-list');

  // Check if elements exist in DOM (warn only once)
  if (!container || !list) {
    if (!positionsContainerWarned) {
      console.warn('⚠️ Open positions container not found in DOM - skipping display');
      positionsContainerWarned = true;
    }
    return;
  }

  if (!positions || positions.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';
  
  let html = '';
  positions.forEach((pos, index) => {
    const pnl = pos.unrealizedPnl || 0;
    const pnlPercent = pos.unrealizedPnlPercent || 0;
    const pnlColor = pnl >= 0 ? '#10b981' : '#ef4444';
    const pnlSign = pnl >= 0 ? '+' : '';
    
    html += `
      <div style="background:rgba(59,130,246,0.05);border:1px solid #3d4a5c;border-radius:8px;padding:16px;margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <div>
            <div style="font-size:15px;font-weight:700;color:#fff;margin-bottom:4px;">${pos.symbol}</div>
            <div style="font-size:12px;color:#9ca3af;">${pos.quantity} contracts @ $${pos.avgEntryPrice.toFixed(2)}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:18px;font-weight:700;color:${pnlColor};margin-bottom:4px;">
              ${pnlSign}$${pnl.toFixed(2)}
            </div>
            <div style="font-size:12px;color:${pnlColor};">${pnlSign}${(pnlPercent * 100).toFixed(2)}%</div>
          </div>
        </div>
        <button class="trade-btn exit-btn exit-position-btn" data-position-index="${index}" style="width:100%;">
          <span>💰</span>
          <span>EXIT AT MARKET</span>
        </button>
      </div>
    `;
  });
  
  list.innerHTML = html;
  
  // Add event listeners to exit buttons
  document.querySelectorAll('.exit-position-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const index = parseInt(this.getAttribute('data-position-index'));
      exitPosition(index);
    });
  });
}

// Update open positions (called periodically)
function updateOpenPositions() {
  // Only load if container exists (avoid unnecessary API calls)
  const container = document.getElementById('open-positions-container');
  if (container) {
    loadUserPositions();
  }
}

// Show order status message
function showOrderStatus(message, type) {
  const statusEl = document.getElementById('order-status');
  
  const colors = {
    success: { bg: 'rgba(16,185,129,0.1)', border: '#10b981', text: '#10b981' },
    error: { bg: 'rgba(239,68,68,0.1)', border: '#ef4444', text: '#ef4444' },
    warning: { bg: 'rgba(245,158,11,0.1)', border: '#f59e0b', text: '#f59e0b' }
  };
  
  const color = colors[type] || colors.error;
  
  statusEl.style.display = 'block';
  statusEl.style.background = color.bg;
  statusEl.style.border = `1px solid ${color.border}`;
  statusEl.style.color = color.text;
  statusEl.textContent = message;
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    statusEl.style.display = 'none';
  }, 5000);
}

// Check broker connection status
async function checkBrokerStatus() {
  const authenticated = await isAuthenticated();
  
  const statusTextEl = document.getElementById('broker-status-text');
  const statusEl = document.getElementById('broker-status');
  const buyCallBtn = document.getElementById('buy-call-btn');
  const buyPutBtn = document.getElementById('buy-put-btn');
  
  if (!authenticated) {
    if (statusTextEl) statusTextEl.textContent = 'Not Logged In';
    if (buyCallBtn) buyCallBtn.disabled = true;
    if (buyPutBtn) buyPutBtn.disabled = true;
    return;
  }
  
  try {
    const response = await fetch('/api/broker/check', {
      credentials: 'include'
    });
    
    const result = await response.json();
    
    if (result.connected) {
      if (statusTextEl) statusTextEl.textContent = '✅ Connected';
      if (statusEl) {
        statusEl.style.borderColor = '#10b981';
        statusEl.style.background = 'rgba(16,185,129,0.1)';
      }
      if (statusTextEl) statusTextEl.style.color = '#10b981';
      
      // Enable buttons
      if (buyCallBtn) buyCallBtn.disabled = false;
      if (buyPutBtn) buyPutBtn.disabled = false;
      
      // Load positions and buying power
      await loadUserPositions();
      await updateBuyingPower();
    } else {
      if (statusTextEl) statusTextEl.textContent = 'Not Connected';
      if (buyCallBtn) buyCallBtn.disabled = true;
      if (buyPutBtn) buyPutBtn.disabled = true;
    }
    
  } catch (error) {
    console.error('❌ Broker status check failed:', error);
  }
}

// Update username display
async function updateUsernameDisplay() {
  const username = await getCurrentUsername();
  const usernameEl = document.getElementById('current-username');
  if (usernameEl) {
    usernameEl.textContent = username;
  }
}

// Initialize on page load
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    updateUsernameDisplay();
    checkBrokerStatus();
    
    // Check status and update buying power every 1 second
    setInterval(() => {
      updateBuyingPower();
      updateOpenPositions();
    }, 1000);
    
    // Check broker connection every 5 seconds
    setInterval(() => {
      checkBrokerStatus();
    }, 5000);
  });
}

function renderScoreBar(label, score) {
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#3b82f6' : score >= 25 ? '#f59e0b' : '#ef4444';
  return `
    <div style="background:rgba(255,255,255,0.05);border-radius:8px;padding:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <div style="font-size:11px;color:rgba(255,255,255,0.7);">${label}</div>
        <div style="font-size:12px;font-weight:700;color:#fff;">${score}</div>
      </div>
      <div style="background:rgba(0,0,0,0.3);height:6px;border-radius:3px;overflow:hidden;">
        <div style="width:${score}%;background:${color};height:100%;border-radius:3px;transition:width 0.3s ease;"></div>
      </div>
    </div>
  `;
}

function renderMetricCard(label, value, isPositive) {
  const color = isPositive === true ? '#10b981' : isPositive === false ? '#ef4444' : '#3b82f6';
  return `
    <div style="background:linear-gradient(135deg, #1a2332 0%, #151b2e 100%);border:1px solid #2a3547;border-radius:8px;padding:16px;text-align:center;">
      <div style="font-size:11px;color:#9ca3af;margin-bottom:8px;text-transform:uppercase;">${label}</div>
      <div style="font-size:18px;font-weight:700;color:${color};">${value}</div>
    </div>
  `;
}
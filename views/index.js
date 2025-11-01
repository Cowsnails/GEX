// views/index.js - Admin System (SECURED VERSION - No inline handlers) - FIXED: WebSocket Initialization Order
import { styles } from './styles.js';

export function getHTML() {
  return `<!DOCTYPE html>
<html>
<head>
  <title>GEX Trading Intelligence</title>
  <script src="https://unpkg.com/lightweight-charts@3.8.0/dist/lightweight-charts.standalone.production.js"></script>
  <script src="https://unpkg.com/three@0.160.0/build/three.min.js"></script>
  <script>
    // Toast notification function
    window.showToast = function(options) {
      const {
        type = 'info', // 'success', 'error', 'warning', 'info'
        title = 'Notification',
        message = '',
        details = null,
        duration = 5000
      } = options;

      const container = document.getElementById('toastContainer');
      if (!container) {
        console.error('Toast container not found');
        return;
      }

      // Icon mapping
      const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
      };

      // Create toast element
      const toast = document.createElement('div');
      toast.className = \`toast \${type}\`;

      let detailsHTML = '';
      if (details) {
        detailsHTML = \`<div class="toast-details">\${details}</div>\`;
      }

      toast.innerHTML = \`
        <div class="toast-header">
          <div class="toast-icon">\${icons[type]}</div>
          <div class="toast-title">\${title}</div>
        </div>
        \${message ? \`<div class="toast-body">\${message}</div>\` : ''}
        \${detailsHTML}
        <div class="toast-progress"></div>
      \`;

      // Add to container
      container.appendChild(toast);

      // Auto-remove after duration
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(400px)';
        setTimeout(() => {
          container.removeChild(toast);
        }, 300);
      }, duration);

      return toast;
    };

    // Verify library loaded
    window.addEventListener('DOMContentLoaded', function() {
      console.log('📊 [CHART-LIB] Checking Lightweight Charts v3.8.0...');
      if (typeof LightweightCharts !== 'undefined') {
        console.log('✅ [CHART-LIB] Lightweight Charts loaded successfully');
        console.log('📊 [CHART-LIB] createChart method:', typeof LightweightCharts.createChart);

        // Test chart creation
        const testDiv = document.createElement('div');
        testDiv.style.width = '100px';
        testDiv.style.height = '100px';
        document.body.appendChild(testDiv);

        try {
          const testChart = LightweightCharts.createChart(testDiv, { width: 100, height: 100 });
          console.log('📊 [CHART-LIB] Test chart created:', testChart);
          console.log('📊 [CHART-LIB] addLineSeries method:', typeof testChart.addLineSeries);
          testChart.remove();
          document.body.removeChild(testDiv);

          if (typeof testChart.addLineSeries === 'function') {
            console.log('✅ [CHART-LIB] Chart API verified - addLineSeries available!');
          } else {
            console.error('❌ [CHART-LIB] Chart API broken - addLineSeries not found!');
          }
        } catch (e) {
          console.error('❌ [CHART-LIB] Test chart creation failed:', e);
          document.body.removeChild(testDiv);
        }
      } else {
        console.error('❌ [CHART-LIB] Lightweight Charts NOT loaded!');
      }
    });
  </script>
  <meta charset="UTF-8">
  <style>${styles}
  
  .admin-badge {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    border: 2px solid #f59e0b;
    padding: 4px 12px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 700;
    color: #fff;
    text-transform: uppercase;
    display: inline-block;
    margin-left: 8px;
    box-shadow: 0 0 12px rgba(245, 158, 11, 0.4);
  }
  
  .live-users-badge {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    border: 2px solid #10b981;
    padding: 4px 16px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 700;
    color: #fff;
    text-transform: uppercase;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-left: 8px;
    box-shadow: 0 0 12px rgba(16, 185, 129, 0.4);
  }
  
  .live-users-icon {
    font-size: 14px;
  }
  
  .live-users-list {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  
  .user-chip {
    background: rgba(255, 255, 255, 0.2);
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 600;
  }
  
  .user-ip {
    opacity: 0.7;
    font-size: 9px;
    margin-left: 4px;
  }
  
  .controls.locked input,
  .controls.locked select {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .admin-only-label {
    font-size: 11px;
    color: #f59e0b;
    font-weight: 600;
    text-transform: uppercase;
    margin-right: 8px;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.8;
      transform: scale(1.1);
    }
  }
  
  .settings-modal {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    z-index: 9999;
    overflow-y: scroll;
    backdrop-filter: blur(5px);
  }
  
  .settings-modal.active {
    display: block;
  }
  
  .settings-modal-content {
    max-width: 900px;
    margin: 40px auto;
    padding: 20px;
    min-height: calc(100vh - 80px);
  }
  
  .settings-modal-content.full-width {
    max-width: 100%;
    width: 100%;
    margin: 0;
    padding: 80px 40px 100px 40px;
    min-height: 100vh;
  }
  
  .settings-close-btn {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 24px;
    background: rgba(239, 68, 68, 0.9);
    border: 2px solid #ef4444;
    border-radius: 8px;
    color: #fff;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    z-index: 10000;
  }
  
  /* Stats Dropdown Styles */
  .stats-dropdown {
    position: relative;
    display: inline-block;
  }
  
  .stats-dropdown-btn {
    padding: 10px 20px;
    background: #1a2332;
    border: 1px solid #3d4a5c;
    color: #9ca3af;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
    font-size: 13px;
    font-weight: 500;
    border-radius: 6px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .stats-dropdown-btn:hover {
    background: rgba(59, 130, 246, 0.1);
    border-color: #3b82f6;
    color: #3b82f6;
  }
  
  .stats-dropdown-arrow {
    transition: transform 0.2s;
    font-size: 10px;
  }
  
  .stats-dropdown.active .stats-dropdown-arrow {
    transform: rotate(180deg);
  }
  
  .stats-dropdown-menu {
    display: none;
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    background: linear-gradient(135deg, #1a2332 0%, #151b2e 100%);
    border: 2px solid #3d4a5c;
    border-radius: 8px;
    min-width: 200px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    z-index: 1000;
    padding: 8px 0;
  }
  
  .stats-dropdown.active .stats-dropdown-menu {
    display: block;
  }
  
  .stats-dropdown-item {
    padding: 12px 20px;
    cursor: pointer;
    transition: all 0.2s;
    color: #e0e6ed;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .stats-dropdown-item:hover {
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
  }
  
  .stats-dropdown-item.active {
    background: rgba(59, 130, 246, 0.2);
    color: #3b82f6;
    font-weight: 600;
  }
  </style>
</head>
<body>
  <!-- 🎨 Ambient Background Layer -->
  <div id="ambient-background"></div>

  <!-- Toast Container -->
  <div class="toast-container" id="toastContainer"></div>

  <div class="container">
    <div class="header">
      <div class="title">
        <span>🎯</span>
        <span><span class="title-accent">GEX</span> Trading Intelligence</span>
        <span id="adminBadge" style="display: none;" class="admin-badge">👑 Admin</span>
        <span id="liveUsersDisplay" style="display: none;" class="live-users-badge">
          <span class="live-users-icon">👥</span>
          <span id="liveUsersList">Loading...</span>
        </span>
      </div>
      <div class="status-bar">
        <div class="status-item">
          <span id="status">&#9679;</span>
          <span id="statusText">Connecting...</span>
        </div>
        <div class="status-item">
          <span>&#9889;</span>
          <span id="latency">--ms</span>
        </div>
        <div class="status-item">
          <span>&#128200;</span>
          <span id="symbolDisplay">--</span>
          <span id="priceDisplay">$--</span>
        </div>
        <div class="status-item">
          <span id="regimeIcon">&#128260;</span>
          <span id="regimeText">Loading...</span>
        </div>
      </div>
    </div>

    <div class="nav-bar">
      <button class="nav-btn active" data-view="signals">🎯 Trade Signals</button>
      <button class="nav-btn" data-view="trader-signals">🎯 Live Signals</button>
      <button class="nav-btn" data-view="my-trades">📊 My Trades</button>
      <button class="nav-btn" data-view="global-trades">🌍 Global Trades</button>

      <!-- GEX Stats Dropdown -->
      <div class="stats-dropdown" id="gexStatsDropdown">
        <button class="stats-dropdown-btn" id="gexStatsDropdownBtn">
          <span>📊 GEX Stats</span>
          <span class="stats-dropdown-arrow">▼</span>
        </button>
        <div class="stats-dropdown-menu">
          <div class="stats-dropdown-item" data-view="gex">
            <span>📊</span>
            <span>GEX Dashboard</span>
          </div>
          <div class="stats-dropdown-item" data-view="advanced">
            <span>🔬</span>
            <span>Advanced Analytics</span>
          </div>
        </div>
      </div>

      <!-- Stats Dropdown -->
      <div class="stats-dropdown" id="statsDropdown">
        <button class="stats-dropdown-btn" id="statsDropdownBtn">
          <span>📊 Stats</span>
          <span class="stats-dropdown-arrow">▼</span>
        </button>
        <div class="stats-dropdown-menu">
          <div class="stats-dropdown-item" data-view="options">
            <span>📋</span>
            <span>Options Chain</span>
          </div>
          <div class="stats-dropdown-item" data-view="stock">
            <span>📈</span>
            <span>Stock Data</span>
          </div>
          <div class="stats-dropdown-item" data-view="levels">
            <span>🎯</span>
            <span>Key Levels</span>
          </div>
        </div>
      </div>

      <button class="nav-btn" data-view="backtester">🧪 Backtester</button>
      <button class="nav-btn" id="settings-btn">⚙️ Settings</button>
      <button class="nav-btn" id="account-btn">👤 Account</button>

      <div class="controls" id="tickerControls">
        <span class="admin-only-label" id="adminOnlyLabel" style="display: none;">🔒 Admin Only</span>
        <input type="text" id="symbolInput" value="SPY" placeholder="Symbol" />
        <select id="expSelect">
          <option value="">Loading...</option>
        </select>
        <button class="filter-btn" id="updateTickerBtn" style="background: #3b82f6; color: #fff; border-color: #3b82f6;">🔄 Update</button>
      </div>
    </div>

    <!-- BACKTESTER IN USE WARNING BANNER -->
    <div id="backtesterWarningBanner" style="display: none; background: linear-gradient(135deg, #fb923c 0%, #f97316 100%); border-bottom: 3px solid #ea580c; padding: 16px 24px; position: relative; z-index: 1000;">
      <div style="max-width: 1400px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 16px;">
          <div style="font-size: 32px; animation: pulse 2s infinite;">⚠️</div>
          <div>
            <div style="font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 4px;">
              🧪 Backtester In Use
            </div>
            <div style="font-size: 14px; color: rgba(255, 255, 255, 0.9);">
              <span id="backtesterWarningMessage">A backtest is currently running. Please stand by, expect 10-30 minutes. Live data continues normally.</span>
            </div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <div id="backtesterProgress" style="display: none; background: rgba(255, 255, 255, 0.2); border-radius: 8px; padding: 8px 16px; font-size: 13px; font-weight: 600; color: #fff;">
            Progress: <span id="backtesterProgressPercent">0%</span>
          </div>
          <button id="dismissBannerBtn" style="background: rgba(255, 255, 255, 0.2); border: 2px solid rgba(255, 255, 255, 0.4); border-radius: 6px; color: #fff; font-size: 12px; font-weight: 600; padding: 6px 12px; cursor: pointer; transition: all 0.2s;">
            Dismiss
          </button>
        </div>
      </div>
    </div>

    <div class="content" id="content">
      <div style="text-align: center; padding: 50px; color: #9ca3af;">
        Initializing GEX Trading Intelligence...
      </div>
    </div>
  </div>

  <div id="settingsModal" class="settings-modal">
    <button class="settings-close-btn" id="close-settings-btn">✖ Close</button>
    <div class="settings-modal-content" id="settingsContent"></div>
  </div>

  <!-- 💬 CHAT WIDGET -->
  <div class="chat-widget collapsed" id="chatWidget">
    <div class="chat-widget-header" id="chatHeader">
      <div class="chat-widget-title">
        <span class="chat-icon">💬</span>
        <span>Live Chat</span>
        <span class="chat-online-count" id="chatOnlineCount">0 online</span>
      </div>
      <button class="chat-toggle-btn" id="chatToggle">▼</button>
    </div>
    
    <div class="chat-widget-body">
      <div class="chat-online-users" id="chatOnlineUsers">
        <div class="chat-online-header">ONLINE NOW</div>
        <div class="chat-online-list" id="chatOnlineList">
          <div class="chat-empty-users">No users online</div>
        </div>
      </div>
      
      <div class="chat-messages" id="chatMessages">
        <div class="chat-loading">Loading messages...</div>
      </div>
      
      <div class="chat-input-container">
        <input 
          type="text" 
          class="chat-input" 
          id="chatInput" 
          placeholder="Type a message..."
          maxlength="500"
        />
        <button class="chat-send-btn" id="chatSendBtn">Send</button>
      </div>
      <div class="chat-char-count" id="chatCharCount">0 / 500</div>
    </div>
  </div>

  <script type="module">
    import { calculateGEX } from '/public/analysis/gex.js';
    import { analyzeTradeSignal } from '/public/analysis/signals.js';
    import { drawGEXChart, resetChartCache } from '/public/charts/gex-chart.js';
    import { updateTimingWidgetOnly } from '/public/views/timing-widget.js';
    import { getAdvancedAnalytics } from '/public/analysis/advanced-analytics.js';
    
    window.calculateGEX = calculateGEX;
    window.analyzeTradeSignal = analyzeTradeSignal;
    window.drawGEXChart = drawGEXChart;
    window.resetChartCache = resetChartCache;
    window.updateTimingWidgetOnly = updateTimingWidgetOnly;
    window.getAdvancedAnalytics = getAdvancedAnalytics;
    
    // Server-side timing data
    window.serverTiming = null;

    // Try multiple ways to get the nonce
    let SCRIPT_NONCE = null;
    
    // Method 1: Check meta tag
    const nonceMetaTag = document.querySelector('meta[name="csp-nonce"]');
    if (nonceMetaTag) {
      SCRIPT_NONCE = nonceMetaTag.getAttribute('content');
      console.log('✅ Nonce from meta tag:', SCRIPT_NONCE);
    }
    
    // Method 2: Try to find it from script tags
    if (!SCRIPT_NONCE) {
      const scripts = document.querySelectorAll('script[nonce]');
      if (scripts.length > 0) {
        SCRIPT_NONCE = scripts[0].getAttribute('nonce');
        console.log('✅ Nonce from script tag:', SCRIPT_NONCE);
      }
    }
    
    // Method 3: Extract from CSP header (last resort)
    if (!SCRIPT_NONCE) {
      const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      if (cspMeta) {
        const content = cspMeta.getAttribute('content');
        const match = content.match(/'nonce-([^']+)'/);
        if (match) {
          SCRIPT_NONCE = match[1];
          console.log('✅ Nonce from CSP meta:', SCRIPT_NONCE);
        }
      }
    }
    
    if (!SCRIPT_NONCE) {
      console.warn('⚠️ No nonce found - dynamic scripts may be blocked by CSP');
      console.log('Debug - meta tags:', document.querySelectorAll('meta'));
      console.log('Debug - script tags:', document.querySelectorAll('script'));
    }

    // Restore last viewed page from sessionStorage
    const savedView = sessionStorage.getItem('currentView') || 'signals';

    window.appState = {
      ws: null,
      currentView: savedView,
      optionsData: [],
      stockData: { price: 0 }, // 🔥 FIX: Initialize with empty object instead of null
      expirations: [],
      filterATM: false,
      filterVolume: false,
      priceHistory: [],
      lastExpiration: null,
      waitingForData: false,
      timingWidgetWasLoading: true,
      isAdmin: false
    };

    // Function to update ticker control permissions (solo user or admin)
    function updateTickerPermissions(canChangeTicker, isSoloUser) {
      const tickerControls = document.getElementById('tickerControls');
      const adminOnlyLabel = document.getElementById('adminOnlyLabel');
      const symbolInput = document.getElementById('symbolInput');
      const expSelect = document.getElementById('expSelect');
      const updateBtn = document.getElementById('updateTickerBtn');

      if (canChangeTicker) {
        // User can change ticker (admin OR solo user)
        tickerControls.classList.remove('locked');
        symbolInput.disabled = false;
        expSelect.disabled = false;
        if (updateBtn) updateBtn.disabled = false;

        if (isSoloUser && !window.appState.isAdmin) {
          // Solo user but not admin - show special message
          adminOnlyLabel.style.display = 'inline-block';
          adminOnlyLabel.textContent = '👤 Solo Mode';
          adminOnlyLabel.title = 'You can change the ticker while you are the only user online';
        } else {
          // Admin
          adminOnlyLabel.style.display = 'none';
        }

        console.log('✅ [TICKER] Controls unlocked:', isSoloUser ? 'Solo User' : 'Admin');
      } else {
        // User cannot change ticker (not admin and not solo)
        tickerControls.classList.add('locked');
        adminOnlyLabel.style.display = 'inline-block';
        adminOnlyLabel.textContent = '🔒 ADMIN ONLY';
        adminOnlyLabel.title = 'Only admins can change the ticker when multiple users are online';
        symbolInput.disabled = true;
        expSelect.disabled = true;
        if (updateBtn) updateBtn.disabled = true;
        console.log('🔒 [TICKER] Controls locked for regular user');
      }
    }

    // Check admin status and get CSRF token - STORE AS PROMISE
    window.authCheckPromise = (async function() {
      console.log('🔐 [AUTH] Starting authentication check...');
      try {
        const response = await fetch('/api/auth/verify', {
          credentials: 'include'
        });
        const data = await response.json();
        
        if (data.valid) {
          if (data.isAdmin) {
            window.appState.isAdmin = true;
            document.getElementById('adminBadge').style.display = 'inline-block';
            console.log('✅ [AUTH] Admin logged in');
          } else {
            // Lock controls initially - will be unlocked if solo user
            document.getElementById('tickerControls').classList.add('locked');
            document.getElementById('adminOnlyLabel').style.display = 'inline-block';
            document.getElementById('symbolInput').disabled = true;
            document.getElementById('expSelect').disabled = true;
            const updateBtn = document.getElementById('updateTickerBtn');
            if (updateBtn) updateBtn.disabled = true;
            console.log('✅ [AUTH] Controls locked for regular user');
          }
          console.log('✅ [AUTH] Authentication check complete');
          return true;
        } else {
          console.warn('⚠️ [AUTH] Authentication invalid');
          return false;
        }
      } catch (error) {
        console.error('❌ [AUTH] Auth check failed:', error);
        return false;
      }
    })();

    // 🆕 NEW: Update live users display (all users can see)
    function updateLiveUsersDisplay(users, count) {
      const display = document.getElementById('liveUsersDisplay');
      const list = document.getElementById('liveUsersList');

      display.style.display = 'inline-flex';

      if (count === 0) {
        list.innerHTML = 'No users online';
        return;
      }

      // Format: "user1 (IP), user2 (IP), user3 (IP)"
      const userChips = users.map(user => {
        const adminBadge = user.isAdmin ? ' 👑' : '';
        // Shorten IP for display (last 2 octets only)
        const shortIP = user.ip.split('.').slice(-2).join('.');
        return '<span class="user-chip">' + user.username + adminBadge + ' <span class="user-ip">(' + shortIP + ')</span></span>';
      }).join('');

      list.innerHTML = userChips;
    }

    // View management
    function setView(view) {
      console.log('🔥 [SETVIEW] Called with view:', view);
      window.appState.currentView = view;

      // Save current view to sessionStorage for persistence across refreshes
      sessionStorage.setItem('currentView', view);

      // Update nav buttons
      document.querySelectorAll('.nav-btn').forEach(function(btn) {
        btn.classList.remove('active');
      });

      // Check if it's a regular nav button
      const navBtn = document.querySelector('[data-view="' + view + '"]');
      if (navBtn && navBtn.classList.contains('nav-btn')) {
        navBtn.classList.add('active');
      }

      // Update dropdown items
      document.querySelectorAll('.stats-dropdown-item').forEach(function(item) {
        item.classList.remove('active');
      });

      const dropdownItem = document.querySelector('.stats-dropdown-item[data-view="' + view + '"]');
      if (dropdownItem) {
        dropdownItem.classList.add('active');
      }

      render(true);
    }

    // Modal functions
    async function openSettingsModal() {
      const modal = document.getElementById('settingsModal');
      const content = document.getElementById('settingsContent');
      
      content.classList.remove('full-width');
      modal.classList.add('active');
      content.innerHTML = '<div style="text-align:center;padding:50px;color:#9ca3af;">Loading...</div>';
      
      try {
        const response = await fetch('/settings', {
          credentials: 'include'
        });
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const styles = doc.querySelector('style');
        const settingsBody = doc.body.innerHTML;
        
        content.innerHTML = (styles ? styles.outerHTML : '') + settingsBody;
        
        // Add nonce to dynamically created scripts
        const scripts = content.querySelectorAll('script');
        scripts.forEach(script => {
          const newScript = document.createElement('script');
          if (SCRIPT_NONCE) {
            newScript.setAttribute('nonce', SCRIPT_NONCE);
          }
          newScript.textContent = script.textContent;
          script.parentNode.replaceChild(newScript, script);
        });
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    }
    
    async function openAccountModal() {
      const modal = document.getElementById('settingsModal');
      const content = document.getElementById('settingsContent');
      
      content.classList.add('full-width');
      modal.classList.add('active');
      content.innerHTML = '<div style="text-align:center;padding:50px;color:#9ca3af;">Loading...</div>';
      
      try {
        const response = await fetch('/account', {
          credentials: 'include'
        });
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const styles = doc.querySelector('style');
        const accountBody = doc.body.innerHTML;
        
        content.innerHTML = (styles ? styles.outerHTML : '') + accountBody;
        
        // Add nonce to dynamically created scripts
        const scripts = content.querySelectorAll('script');
        scripts.forEach(script => {
          const newScript = document.createElement('script');
          if (SCRIPT_NONCE) {
            newScript.setAttribute('nonce', SCRIPT_NONCE);
          }
          newScript.textContent = script.textContent;
          script.parentNode.replaceChild(newScript, script);
        });
      } catch (error) {
        console.error('Failed to load account:', error);
      }
    }
    
    function closeSettingsModal() {
      const modal = document.getElementById('settingsModal');
      const content = document.getElementById('settingsContent');
      modal.classList.remove('active');
      content.classList.remove('full-width');
      content.innerHTML = '';
      document.body.style.background = '#0a0e27';
    }

    // Update symbol
    function updateSymbol() {
      const symbol = document.getElementById('symbolInput').value.toUpperCase();
      const exp = document.getElementById('expSelect').value;

      window.appState.optionsData = [];
      window.appState.stockData = null;
      window.appState.timingWidgetWasLoading = true;

      const content = document.getElementById('content');
      content.innerHTML = '<div style="text-align:center;padding:50px;color:#9ca3af;">Loading...</div>';

      window.appState.waitingForData = true;

      window.appState.ws.send(JSON.stringify({
        type: 'subscribe',
        symbol: symbol,
        expiration: exp || '20251219'
      }));

      console.log('[USER] User changed to: ' + symbol);
    }

    function updateRegimeDisplay() {
      const gex = calculateGEX();
      if (!gex) return;
      
      const regimeIcon = document.getElementById('regimeIcon');
      const regimeText = document.getElementById('regimeText');
      
      if (gex.zeroGammaLevel && window.appState.stockData) {
        const spot = window.appState.stockData.price;
        const isAboveZeroGamma = spot > gex.zeroGammaLevel;
        
        if (isAboveZeroGamma) {
          regimeIcon.textContent = '🛡️';
          regimeText.textContent = 'Stabilizing';
          regimeText.style.color = '#10b981';
        } else {
          regimeIcon.textContent = '⚡';
          regimeText.textContent = 'Destabilizing';
          regimeText.style.color = '#ef4444';
        }
      } else if (gex.netGEX > 0) {
        regimeIcon.textContent = '📈';
        regimeText.textContent = 'Positive GEX';
        regimeText.style.color = '#10b981';
      } else {
        regimeIcon.textContent = '📉';
        regimeText.textContent = 'Negative GEX';
        regimeText.style.color = '#ef4444';
      }
    }

    let lastRenderedView = null;
    
    async function render(forceFullRender = false) {
      console.log('🔥 [RENDER] Called with view:', window.appState.currentView, 'forceFullRender:', forceFullRender);
      
      const content = document.getElementById('content');
      const view = window.appState.currentView;
      const viewChanged = lastRenderedView !== view;
      
      console.log('🔥 [RENDER] viewChanged:', viewChanged, 'lastRenderedView:', lastRenderedView);
      
      // ✅ NEW: Clean up fixed panels when switching away from trader-signals
      if (viewChanged && lastRenderedView === 'trader-signals' && view !== 'trader-signals') {
        document.querySelectorAll('.trader-signals-unified').forEach(el => {
          el.remove();
        });
        document.querySelectorAll('.signals-toggle-btn').forEach(el => {
          el.remove();
        });
        // Restore content visibility
        content.style.display = 'block';
      }
      
      if (window.appState.waitingForData && (window.appState.optionsData.length === 0 || !window.appState.stockData)) {
        return;
      }
      
      if (window.appState.waitingForData && window.appState.optionsData.length > 0 && window.appState.stockData) {
        window.appState.waitingForData = false;
        forceFullRender = true;
      }
      
      const currentExp = document.getElementById('expSelect')?.value;
      const expirationChanged = window.appState.lastExpiration !== currentExp;
      if (expirationChanged) {
        window.appState.lastExpiration = currentExp;
      }
      
      let timingWidgetBecameReady = false;
      if (view === 'signals' && window.serverTiming) {
        const timingNowReady = window.serverTiming !== null;
        if (window.appState.timingWidgetWasLoading && timingNowReady) {
          timingWidgetBecameReady = true;
          window.appState.timingWidgetWasLoading = false;
        }
      }
      
      // ✅ FIXED: Always do full render for trader-signals if panels don't exist
      const panelsExist = document.querySelector('.trader-signals-unified') !== null;
      const needsFullRender = forceFullRender || viewChanged || expirationChanged || timingWidgetBecameReady || (view === 'trader-signals' && !panelsExist);
      
      try {
        if (view === 'signals') {
          if (needsFullRender) {
            const { renderTradeSignals } = await import('/public/views/signals.js');
            content.innerHTML = renderTradeSignals();
            lastRenderedView = view;
          } else {
            if (window.updateTimingWidgetOnly) window.updateTimingWidgetOnly();
            const { updateSignalsLive } = await import('/public/views/signals.js');
            if (updateSignalsLive) updateSignalsLive();
          }
        } 
        else if (view === 'gex') {
          if (needsFullRender) {
            if (window.resetChartCache) window.resetChartCache();
            const { renderGEXDashboard } = await import('/public/views/gex.js');
            content.innerHTML = renderGEXDashboard();
            lastRenderedView = view;
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  const canvas = document.getElementById('gexProfileChart');
                  if (canvas && window.drawGEXChart && window.appState.stockData) {
                    const gex = calculateGEX();
                    if (gex) window.drawGEXChart('gexProfileChart', gex, window.appState.stockData.price);
                  }
                });
              });
            });
          } else {
            const { updateGEXLive } = await import('/public/views/gex.js');
            if (updateGEXLive) updateGEXLive();
          }
        }
        else if (view === 'advanced') {
          if (needsFullRender) {
            const { renderAdvancedAnalytics } = await import('/public/views/advanced.js');
            content.innerHTML = renderAdvancedAnalytics();
            lastRenderedView = view;
          } else {
            const { updateAdvancedLive } = await import('/public/views/advanced.js');
            if (updateAdvancedLive) updateAdvancedLive();
          }
        }
        else if (view === 'my-trades') {
          if (needsFullRender) {
            const { render: renderMyTrades, initMyTradesView } = await import('/public/views/my-trades.js');
            content.innerHTML = renderMyTrades();
            setTimeout(() => {
              initMyTradesView();
            }, 0);
            lastRenderedView = view;
          } else {
            const { updateLive: updateMyTradesLive } = await import('/public/views/my-trades.js');
            if (updateMyTradesLive) updateMyTradesLive();
          }
        }
        else if (view === 'global-trades') {
          if (needsFullRender) {
            const { render: renderGlobalTrades, initGlobalTradesView } = await import('/public/views/global-trades.js');
            content.innerHTML = renderGlobalTrades();
            setTimeout(() => {
              initGlobalTradesView();
            }, 0);
            lastRenderedView = view;
          } else {
            const { updateLive: updateGlobalTradesLive } = await import('/public/views/global-trades.js');
            if (updateGlobalTradesLive) updateGlobalTradesLive();
          }
        }
        else if (view === 'backtester') {
          if (needsFullRender) {
            const { render: renderBacktester, initBacktesterView } = await import('/public/views/backtester.js');
            content.innerHTML = renderBacktester();
            setTimeout(() => {
              initBacktesterView();
            }, 0);
            lastRenderedView = view;
          } else {
            const { updateLive: updateBacktesterLive } = await import('/public/views/backtester.js');
            if (updateBacktesterLive) updateBacktesterLive();
          }
        }
        else if (view === 'options') {
          if (needsFullRender) {
            const { renderOptionsChain } = await import('/public/views/options.js');
            content.innerHTML = renderOptionsChain();
            lastRenderedView = view;
          } else {
            const { updateOptionsLive } = await import('/public/views/options.js');
            if (updateOptionsLive) updateOptionsLive();
          }
        } 
        else if (view === 'stock') {
          if (needsFullRender) {
            const { renderStockView } = await import('/public/views/stock.js');
            content.innerHTML = renderStockView();
            lastRenderedView = view;
          } else {
            const { updateStockLive } = await import('/public/views/stock.js');
            if (updateStockLive) updateStockLive();
          }
        } 
        else if (view === 'levels') {
          if (needsFullRender) {
            const { renderKeyLevels } = await import('/public/views/levels.js');
            content.innerHTML = renderKeyLevels();
            lastRenderedView = view;
          } else {
            const { updateLevelsLive } = await import('/public/views/levels.js');
            if (updateLevelsLive) updateLevelsLive();
          }
        }
        else if (view === 'trader-signals') {
          console.log('🔥 [RENDER] trader-signals view triggered, needsFullRender:', needsFullRender);
          if (needsFullRender) {
            console.log('🔥 [RENDER] Starting trader-signals render...');
            
            // ✅ UPDATED: Import unified version only
            const { renderTraderSignals } = await import('/public/views/trader-signals-unified.js');
            
            console.log('🔥 [RENDER] Unified import loaded');
            
            // ✅ FIX: Clear content and prepare for fixed panels
            content.innerHTML = '';
            content.style.display = 'block';
            
            // ✅ FIX: Remove any existing fixed panels
            const existingPanels = document.querySelectorAll('.trader-signals-unified');
            console.log('🔥 [RENDER] Found existing panels:', existingPanels.length);
            existingPanels.forEach(el => {
              el.remove();
            });
            
            // ✅ FIX: Create temporary container and render
            const temp = document.createElement('div');
            const unifiedHTML = renderTraderSignals();
            
            console.log('🔥 [RENDER] Unified HTML length:', unifiedHTML.length);
            
            temp.innerHTML = unifiedHTML;
            
            console.log('🔥 [RENDER] Temp children count:', temp.children.length);
            console.log('🔥 [RENDER] Temp children classes:', Array.from(temp.children).map(c => c.className));
            
            // ✅ FIX: Append fixed panels directly to body (not content)
            let appendedCount = 0;
            while (temp.firstChild) {
              document.body.appendChild(temp.firstChild);
              appendedCount++;
            }
            
            console.log('🔥 [RENDER] Appended', appendedCount, 'elements to body');
            
            // ✅ NEW: Initialize panels immediately after they're in the DOM
            setTimeout(() => {
              const unifiedPanel = document.querySelector('.trader-signals-unified');
              console.log('🔥 [VERIFY] Unified panel in DOM:', !!unifiedPanel);
              if (unifiedPanel) {
                console.log('🔥 [VERIFY] Unified panel display:', window.getComputedStyle(unifiedPanel).display);
                unifiedPanel.style.display = 'flex';
                unifiedPanel.style.visibility = 'visible';
                unifiedPanel.style.opacity = '1';
              }
            }, 100);
            
            lastRenderedView = view;
          } else {
            // ✅ NEW: If panels exist but needsFullRender is false, make sure they're visible
            const unifiedPanel = document.querySelector('.trader-signals-unified');
            
            if (unifiedPanel) {
              console.log('🔥 [RENDER] Panel already exists, ensuring visibility');
              unifiedPanel.style.display = 'flex';
              unifiedPanel.style.visibility = 'visible';
            }
          }
        }
      } catch (error) {
        console.error('Render error:', error);
        content.innerHTML = '<div style="color:red;padding:20px;">Error: ' + error.message + '</div>';
      }
    }

    // 💬 CHAT WIDGET FUNCTIONALITY
    (function initChat() {
      const chatWidget = document.getElementById('chatWidget');
      const chatToggle = document.getElementById('chatToggle');
      const chatHeader = document.getElementById('chatHeader');
      const chatInput = document.getElementById('chatInput');
      const chatSendBtn = document.getElementById('chatSendBtn');
      const chatMessages = document.getElementById('chatMessages');
      const chatCharCount = document.getElementById('chatCharCount');
      const chatOnlineCount = document.getElementById('chatOnlineCount');
      const chatOnlineList = document.getElementById('chatOnlineList');
      
      let isExpanded = false;
      let csrfToken = null;
      
      // Get CSRF token
      (async function() {
        try {
          const response = await fetch('/api/auth/verify', {
            credentials: 'include'
          });
          const data = await response.json();
          if (data.valid && data.csrfToken) {
            csrfToken = data.csrfToken;
          }
        } catch (error) {
          console.error('Failed to get CSRF token:', error);
        }
      })();
      
      // Toggle chat widget
      function toggleChat() {
        isExpanded = !isExpanded;
        if (isExpanded) {
          chatWidget.classList.remove('collapsed');
          chatWidget.classList.add('expanded');
          chatToggle.textContent = '▲';
          loadMessages();
        } else {
          chatWidget.classList.add('collapsed');
          chatWidget.classList.remove('expanded');
          chatToggle.textContent = '▼';
        }
      }
      
      chatToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleChat();
      });
      
      chatHeader.addEventListener('click', toggleChat);
      
      // Load recent messages
      async function loadMessages() {
        try {
          const response = await fetch('/api/chat/messages?limit=50', {
            credentials: 'include'
          });
          const data = await response.json();
          
          if (data.success) {
            renderMessages(data.messages);
          } else {
            chatMessages.innerHTML = '<div class="chat-error">Failed to load messages</div>';
          }
        } catch (error) {
          console.error('Failed to load chat messages:', error);
          chatMessages.innerHTML = '<div class="chat-error">Failed to load messages</div>';
        }
      }
      
      // Helper: Escape HTML
      function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }
      
      // Render messages
      function renderMessages(messages) {
        if (messages.length === 0) {
          chatMessages.innerHTML = '<div class="chat-empty">No messages yet. Be the first to chat!</div>';
          return;
        }
        
        chatMessages.innerHTML = messages.map(function(msg) {
          const time = new Date(msg.timestamp).toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit' 
          });
          
          return '<div class="chat-message"><div class="chat-message-header"><span class="chat-message-user">' + msg.username + (msg.is_admin ? '<span class="chat-admin-badge">👑</span>' : '') + '</span><span class="chat-message-time">' + time + '</span></div><div class="chat-message-text">' + escapeHtml(msg.message) + '</div></div>';
        }).join('');
        
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
      
      // Add new message to UI
      function addMessage(msg) {
        const time = new Date(msg.timestamp).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit' 
        });
        
        const messageHtml = '<div class="chat-message chat-message-new"><div class="chat-message-header"><span class="chat-message-user">' + msg.username + (msg.is_admin ? '<span class="chat-admin-badge">👑</span>' : '') + '</span><span class="chat-message-time">' + time + '</span></div><div class="chat-message-text">' + escapeHtml(msg.message) + '</div></div>';
        
        const emptyState = chatMessages.querySelector('.chat-empty, .chat-loading');
        if (emptyState) {
          chatMessages.innerHTML = '';
        }
        
        chatMessages.insertAdjacentHTML('beforeend', messageHtml);
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
      
      // Send message
      async function sendMessage() {
        const message = chatInput.value.trim();
        
        if (!message) return;
        if (message.length > 500) {
          alert('Message too long (max 500 characters)');
          return;
        }
        
        chatSendBtn.disabled = true;
        
        try {
          const response = await fetch('/api/chat/send', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': csrfToken || ''
            },
            body: JSON.stringify({ message: message })
          });
          
          const data = await response.json();
          
          if (data.success) {
            // Immediately show the message you just sent
            if (data.message) {
              addMessage(data.message);
            }
            chatInput.value = '';
            chatCharCount.textContent = '0 / 500';
          } else {
            alert(data.error || 'Failed to send message');
          }
        } catch (error) {
          console.error('Failed to send message:', error);
          alert('Failed to send message');
        } finally {
          chatSendBtn.disabled = false;
          chatInput.focus();
        }
      }
      
      chatSendBtn.addEventListener('click', sendMessage);
      
      chatInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      });
      
      chatInput.addEventListener('input', function() {
        const length = chatInput.value.length;
        chatCharCount.textContent = length + ' / 500';
        if (length > 500) {
          chatCharCount.style.color = '#ef4444';
        } else {
          chatCharCount.style.color = '#9ca3af';
        }
      });
      
      // Update online users
      function updateOnlineUsers(users, count) {
        chatOnlineCount.textContent = count + ' online';
        
        if (count === 0) {
          chatOnlineList.innerHTML = '<div class="chat-empty-users">No users online</div>';
          return;
        }
        
        chatOnlineList.innerHTML = users.map(function(user) {
          return '<div class="chat-online-user"><div class="chat-user-dot"></div><span class="chat-user-name">' + user.username + '</span>' + (user.isAdmin ? '<span class="chat-user-admin-badge">👑</span>' : '') + '</div>';
        }).join('');
      }
      
      // Expose chat functions for WebSocket handler
      window.chatWidget = {
        addMessage: addMessage,
        updateOnlineUsers: updateOnlineUsers
      };
    })();

    // Event Listeners - ALL INSIDE DOMContentLoaded
    document.addEventListener('DOMContentLoaded', async function() {
      console.log('🚀 [INIT] DOM Content Loaded - Starting initialization...');
      
      // ⏳ WAIT FOR AUTHENTICATION TO COMPLETE FIRST
      console.log('⏳ [INIT] Waiting for authentication check to complete...');
      await window.authCheckPromise;
      console.log('✅ [INIT] Authentication complete, continuing initialization...');

      // Restore active nav button based on saved view
      const currentView = window.appState.currentView;
      const savedNavBtn = document.querySelector('[data-view="' + currentView + '"]');
      if (savedNavBtn) {
        if (savedNavBtn.classList.contains('nav-btn')) {
          savedNavBtn.classList.add('active');
        } else if (savedNavBtn.classList.contains('stats-dropdown-item')) {
          savedNavBtn.classList.add('active');
          // Also highlight the Stats dropdown button if a dropdown item is active
          document.querySelector('.nav-btn[data-view="stats"]')?.classList.add('active');
        }
      } else {
        // Default to signals if saved view not found
        document.querySelector('.nav-btn[data-view="signals"]')?.classList.add('active');
      }

      // Navigation buttons
      document.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
        btn.addEventListener('click', function() {
          const view = this.getAttribute('data-view');
          setView(view);
        });
      });
      
      // GEX Stats dropdown toggle
      const gexStatsDropdown = document.getElementById('gexStatsDropdown');
      const gexStatsDropdownBtn = document.getElementById('gexStatsDropdownBtn');

      if (gexStatsDropdownBtn) {
        gexStatsDropdownBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          // Close other dropdown
          if (statsDropdown) statsDropdown.classList.remove('active');
          gexStatsDropdown.classList.toggle('active');
        });
      }

      // GEX Stats dropdown items
      if (gexStatsDropdown) {
        gexStatsDropdown.querySelectorAll('.stats-dropdown-item').forEach(item => {
          item.addEventListener('click', function() {
            const view = this.getAttribute('data-view');
            setView(view);
            gexStatsDropdown.classList.remove('active');
          });
        });
      }

      // Stats dropdown toggle
      const statsDropdown = document.getElementById('statsDropdown');
      const statsDropdownBtn = document.getElementById('statsDropdownBtn');

      if (statsDropdownBtn) {
        statsDropdownBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          // Close other dropdown
          if (gexStatsDropdown) gexStatsDropdown.classList.remove('active');
          statsDropdown.classList.toggle('active');
        });
      }

      // Stats dropdown items
      if (statsDropdown) {
        statsDropdown.querySelectorAll('.stats-dropdown-item').forEach(item => {
          item.addEventListener('click', function() {
            const view = this.getAttribute('data-view');
            setView(view);
            statsDropdown.classList.remove('active');
          });
        });
      }

      // Close dropdowns when clicking outside
      document.addEventListener('click', function(e) {
        if (statsDropdown && !statsDropdown.contains(e.target)) {
          statsDropdown.classList.remove('active');
        }
        if (gexStatsDropdown && !gexStatsDropdown.contains(e.target)) {
          gexStatsDropdown.classList.remove('active');
        }
      });

      // Settings button
      const settingsBtn = document.getElementById('settings-btn');
      if (settingsBtn) {
        settingsBtn.addEventListener('click', openSettingsModal);
      }

      // Account button
      const accountBtn = document.getElementById('account-btn');
      if (accountBtn) {
        accountBtn.addEventListener('click', openAccountModal);
      }
      
      // Close settings button
      const closeBtn = document.getElementById('close-settings-btn');
      if (closeBtn) {
        closeBtn.addEventListener('click', closeSettingsModal);
      }
      
      // Symbol input
      const symbolInput = document.getElementById('symbolInput');
      if (symbolInput) {
        symbolInput.addEventListener('change', updateSymbol);
        // Also allow Enter key to trigger update
        symbolInput.addEventListener('keypress', function(e) {
          if (e.key === 'Enter') {
            updateSymbol();
          }
        });
      }

      // Expiration select
      const expSelect = document.getElementById('expSelect');
      if (expSelect) {
        expSelect.addEventListener('change', updateSymbol);
      }

      // Update ticker button
      const updateTickerBtn = document.getElementById('updateTickerBtn');
      if (updateTickerBtn) {
        updateTickerBtn.addEventListener('click', function() {
          console.log('🔄 [TICKER] Update button clicked');
          updateSymbol();
        });
      }
      
      // ESC key to close modals
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          closeSettingsModal();
          statsDropdown.classList.remove('active');
        }
      });

      // 🧪 Backtester warning banner dismiss button
      const dismissBannerBtn = document.getElementById('dismissBannerBtn');
      if (dismissBannerBtn) {
        dismissBannerBtn.addEventListener('click', function() {
          const banner = document.getElementById('backtesterWarningBanner');
          if (banner) {
            banner.style.display = 'none';
          }
        });
      }

      // ✅ WEBSOCKET INITIALIZATION - MOVED TO END OF DOMContentLoaded
      console.log('🔌 [WS] Initializing WebSocket AFTER DOM ready and event listeners attached...');
      
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = protocol + '//' + window.location.host + '/ws';
      
      console.log('🔌 [WS] Creating WebSocket connection to:', wsUrl);
      const ws = new WebSocket(wsUrl);
      window.appState.ws = ws;

      ws.onopen = function() {
        console.log('✅ [WS] WebSocket opened successfully');
        console.log('[WS] Connection state:', ws.readyState);
        console.log('[WS] Waiting for server to authenticate connection...');
        
        // Don't update UI to "Connected" yet - wait for auth_success
        document.getElementById('statusText').textContent = 'Authenticating...';
        document.getElementById('status').style.color = '#f59e0b';
      };

      ws.onmessage = function(event) {
        const data = JSON.parse(event.data);
        
        if (data.type === 'auth_success') {
          console.log('[WS] WebSocket authenticated:', data.username);
          // Update ticker permissions based on admin status or solo user status
          if (typeof data.canChangeTicker !== 'undefined') {
            updateTickerPermissions(data.canChangeTicker, data.isSoloUser);
          }
          return;
        }
        
        if (data.type === 'auth_failed' || data.type === 'auth_timeout') {
          console.error('[WS] WebSocket authentication failed:', data.error);
          console.log('[WS] Session invalid - please login again');
          return;
        }
        
        if (data.type === 'auth_required') {
          console.warn('[WS] WebSocket requires authentication');
          return;
        }
        
        if (data.type === 'ticker_changed') {
          console.log('[WS] Ticker changed to ' + data.symbol + ' by ' + data.changedBy);
          document.getElementById('symbolInput').value = data.symbol;
          return;
        }
        
        // 🆕 NEW: Handle active users update (admin only)
        if (data.type === 'active_users') {
          updateLiveUsersDisplay(data.users, data.count);
          return;
        }
        
        // Handle entry timing updates from server
        if (data.type === 'entry_timing_update') {
          window.serverTiming = data.timing;
          
          // Update widget if signals view is active
          if (window.appState.currentView === 'signals') {
            render();
          }
          return;
        }
        
        // Handle chat messages
        if (data.type === 'chat_message') {
          if (window.chatWidget && window.chatWidget.addMessage) {
            window.chatWidget.addMessage(data.message);
          }
          return;
        }
        
        // Handle online users update
        if (data.type === 'online_users') {
          if (window.chatWidget && window.chatWidget.updateOnlineUsers) {
            window.chatWidget.updateOnlineUsers(data.users, data.count);
          }
          // Update ticker permissions when user count changes
          if (typeof data.canChangeTicker !== 'undefined') {
            updateTickerPermissions(data.canChangeTicker, data.isSoloUser);
          }
          return;
        }

        // 🧪 Handle backtest started
        if (data.type === 'backtest_started') {
          const banner = document.getElementById('backtesterWarningBanner');
          const message = document.getElementById('backtesterWarningMessage');
          if (banner && message) {
            message.textContent = 'A backtest is currently running (' + (data.config_name || 'Unnamed') + '). Please stand by, expect 10-30 minutes. Live data continues normally.';
            banner.style.display = 'block';
          }
          return;
        }

        // 🧪 Handle backtest progress
        if (data.type === 'backtest_progress') {
          const progressDiv = document.getElementById('backtesterProgress');
          const progressPercent = document.getElementById('backtesterProgressPercent');
          const message = document.getElementById('backtesterWarningMessage');

          if (progressDiv && progressPercent) {
            progressDiv.style.display = 'block';

            // Use enhanced progress if available
            if (data.progress_percent !== undefined) {
              progressPercent.textContent = Math.round(data.progress_percent) + '%';

              // Update message with detailed info
              if (message && data.eta_formatted) {
                const configName = data.config_name || 'Unnamed';
                const speed = Math.round(data.iterations_per_second || 0);
                message.textContent = 'Backtest running: ' + configName + ' - ' +
                                     Math.round(data.progress_percent) + '% complete. ' +
                                     'ETA: ' + data.eta_formatted + ' (' + speed + ' iter/s)';
              }
            } else if (data.progress) {
              // Fallback to old progress format
              progressPercent.textContent = Math.round(data.progress) + '%';
            }
          }
          return;
        }

        // 🧪 Handle backtest completed
        if (data.type === 'backtest_completed') {
          const banner = document.getElementById('backtesterWarningBanner');
          if (banner) {
            // Auto-hide after 3 seconds
            setTimeout(() => {
              banner.style.display = 'none';
            }, 3000);
          }
          return;
        }

        if (data.error) {
          document.getElementById('statusText').textContent = 'Error';
          document.getElementById('status').style.color = '#ef4444';
          return;
        }

        if (data.type === 'options') {
          window.appState.optionsData = data.response || [];
          if (data.latency) document.getElementById('latency').textContent = data.latency + 'ms';
          updateRegimeDisplay();
          render();
        } 
        else if (data.type === 'stock') {
          window.appState.stockData = data.response;
          document.getElementById('symbolDisplay').textContent = document.getElementById('symbolInput').value;
          document.getElementById('priceDisplay').textContent = window.appState.stockData && window.appState.stockData.price ? '$' + window.appState.stockData.price.toFixed(2) : '$--';
          updateRegimeDisplay();
          render();
        } 
        else if (data.type === 'expirations') {
          window.appState.expirations = data.response || [];
          
          const today = new Date();
          const todayStr = today.getFullYear() + String(today.getMonth() + 1).padStart(2, '0') + String(today.getDate()).padStart(2, '0');
          const todayInt = parseInt(todayStr);
          
          const futureExpirations = window.appState.expirations.filter(function(exp) {
            return parseInt(exp) >= todayInt;
          });
          
          const select = document.getElementById('expSelect');
          const currentlySelected = select.value;
          
          if (select.options.length === 0 || select.options.length !== futureExpirations.length) {
            select.innerHTML = futureExpirations.map(function(exp) {
              const expStr = String(exp);
              const year = expStr.substring(0, 4);
              const month = expStr.substring(4, 6);
              const day = expStr.substring(6, 8);
              return '<option value="' + expStr + '">' + month + '/' + day + '/' + year + '</option>';
            }).join('');
            
            if (currentlySelected && futureExpirations.includes(parseInt(currentlySelected))) {
              select.value = currentlySelected;
            } else if (futureExpirations.length > 0) {
              select.value = futureExpirations[0];
              window.appState.lastExpiration = futureExpirations[0];
              if (!currentlySelected) updateSymbol();
            }
          }
        }
      };

      ws.onerror = function(error) {
        console.error('[WS] WebSocket error:', error);
        document.getElementById('statusText').textContent = 'Error';
        document.getElementById('status').style.color = '#ef4444';
      };

      ws.onclose = function(event) {
        console.error('[WS] WebSocket closed:', event.code, event.reason);

        // 🔥 FIX: Don't show error page when switching to backtest mode
        if (window.backtestMode || event.reason === 'System switched to backtest mode') {
          console.log('[WS] WebSocket closed for backtest mode - this is expected');
          document.getElementById('statusText').textContent = 'Backtest Mode';
          document.getElementById('status').style.color = '#8b5cf6';
          return;
        }

        document.getElementById('statusText').textContent = 'Disconnected';
        document.getElementById('status').style.color = '#6b7280';

        console.warn('[WS] Connection closed. Please refresh the page to reconnect.');

        const content = document.getElementById('content');
        content.innerHTML = '<div style="text-align:center;padding:50px;color:#ef4444;"><div style="font-size:48px;margin-bottom:20px;">⚠️</div><div style="font-size:24px;margin-bottom:16px;">Connection Lost</div><div style="color:#9ca3af;margin-bottom:32px;">The WebSocket connection was closed.</div><button onclick="window.location.reload()" style="padding:16px 32px;background:#3b82f6;border:none;border-radius:8px;color:#fff;font-size:16px;font-weight:600;cursor:pointer;">Reconnect</button></div>';
      };

      console.log('✅ [INIT] WebSocket initialization complete - all handlers attached');

      // 🎨 Initialize ambient background with random color scheme from 10 options
      import('/public/effects/ambient-controller.js').then(module => {
        module.init('ambient-background', {
          colorScheme: 'random', // Picks one of 10 gorgeous dual-color schemes randomly!
          particleCount: 400,
          gradientSpeed: 0.3,
          particleSpeed: 1.0,
          lightIntensity: 1.2
        });
        console.log('✅ [AMBIENT] Dual-color background initialized with random scheme');
      }).catch(err => {
        console.warn('⚠️ [AMBIENT] Failed to load background:', err);
      });
    });
  </script>
</body>
</html>`;
}
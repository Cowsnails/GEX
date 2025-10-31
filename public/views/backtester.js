// public/views/backtester.js - Backtester View (Dashboard Section)

export function render() {
  return `
    <div id="backtester-container" style="display: flex; height: calc(100vh - 140px); gap: 16px; padding: 16px; background: #0a0a0a;">

      <!-- LEFT PANEL: Mode Toggle + Create -->
      <div style="width: 450px; display: flex; flex-direction: column; gap: 16px;">

        <!-- MODE TOGGLE -->
        <div style="background: #1a1a1a; border-radius: 12px; border: 1px solid #2a2a2a; padding: 20px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div>
              <div style="font-size: 16px; font-weight: 600; color: #fff; margin-bottom: 4px;">System Mode</div>
              <div style="font-size: 13px; color: #9ca3af;">Switch between live trading and backtesting</div>
            </div>
            <div id="modeBadge" style="padding: 8px 16px; border-radius: 6px; font-size: 12px; font-weight: 700; text-transform: uppercase; background: rgba(16, 185, 129, 0.2); color: #10b981; border: 2px solid #10b981;">LIVE</div>
          </div>
          <button id="toggleModeBtn" style="width: 100%; margin-top: 16px; padding: 12px 24px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border: none; border-radius: 8px; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
            Switch to Backtest Mode
          </button>
        </div>

        <!-- QUICK STATS -->
        <div style="background: #1a1a1a; border-radius: 12px; border: 1px solid #2a2a2a; padding: 20px;">
          <h3 style="margin: 0 0 16px 0; color: #fff; font-size: 18px; font-weight: 600;">
            <span style="font-size: 20px;">📊</span> Quick Stats
          </h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div style="background: rgba(59, 130, 246, 0.05); border: 2px solid #3d4a5c; border-radius: 12px; padding: 12px; text-align: center;">
              <div style="font-size: 11px; color: #9ca3af; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Total Backtests</div>
              <div id="totalBacktests" style="font-size: 22px; font-weight: 700; color: #fff;">0</div>
            </div>
            <div style="background: rgba(59, 130, 246, 0.05); border: 2px solid #3d4a5c; border-radius: 12px; padding: 12px; text-align: center;">
              <div style="font-size: 11px; color: #9ca3af; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Running</div>
              <div id="runningBacktests" style="font-size: 22px; font-weight: 700; color: #fff;">0</div>
            </div>
            <div style="background: rgba(59, 130, 246, 0.05); border: 2px solid #3d4a5c; border-radius: 12px; padding: 12px; text-align: center;">
              <div style="font-size: 11px; color: #9ca3af; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Completed</div>
              <div id="completedBacktests" style="font-size: 22px; font-weight: 700; color: #fff;">0</div>
            </div>
            <div style="background: rgba(59, 130, 246, 0.05); border: 2px solid #3d4a5c; border-radius: 12px; padding: 12px; text-align: center;">
              <div style="font-size: 11px; color: #9ca3af; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Best Return</div>
              <div id="bestReturn" style="font-size: 22px; font-weight: 700; color: #10b981;">-</div>
            </div>
          </div>
        </div>

        <!-- CREATE NEW BACKTEST -->
        <div style="background: #1a1a1a; border-radius: 12px; border: 1px solid #2a2a2a; padding: 20px;">
          <h3 style="margin: 0 0 16px 0; color: #fff; font-size: 18px; font-weight: 600;">
            <span style="font-size: 20px;">➕</span> Actions
          </h3>
          <button id="createBacktestBtn" style="width: 100%; padding: 14px 24px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border: none; border-radius: 8px; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; margin-bottom: 12px;">
            ➕ Create Backtest
          </button>
          <button id="compareBacktestsBtn" style="width: 100%; padding: 14px 24px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border: none; border-radius: 8px; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; margin-bottom: 12px;">
            📊 Compare Backtests
          </button>
          <button id="deployStrategyBtn" style="width: 100%; padding: 14px 24px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border: none; border-radius: 8px; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden;">
            <span style="position: relative; z-index: 1;">🚀 Deploy Strategy</span>
            <span style="position: absolute; top: 4px; right: 8px; background: rgba(255, 255, 255, 0.2); padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700;">SOON</span>
          </button>
        </div>
      </div>

      <!-- RIGHT PANEL: Tabs (Backtests / Import Data) -->
      <div style="flex: 1; background: #1a1a1a; border-radius: 12px; border: 1px solid #2a2a2a; padding: 20px; display: flex; flex-direction: column;">

        <!-- TAB BUTTONS -->
        <div style="display: flex; gap: 8px; margin-bottom: 16px; border-bottom: 2px solid #2a2a2a; padding-bottom: 12px;">
          <button id="backtestsTab" class="backtester-tab active" style="padding: 10px 20px; background: rgba(59, 130, 246, 0.2); border: 2px solid #3b82f6; border-radius: 8px; color: #3b82f6; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
            <span style="font-size: 16px;">📝</span> Backtests
          </button>
          <button id="importDataTab" class="backtester-tab" style="padding: 10px 20px; background: transparent; border: 2px solid #2a2a2a; border-radius: 8px; color: #9ca3af; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
            <span style="font-size: 16px;">📥</span> Import Data
          </button>
        </div>

        <!-- TAB CONTENT: Backtests -->
        <div id="backtestsContent" class="tab-content" style="flex: 1; overflow-y: auto; display: block;">
          <div id="backtestList">
            <div style="text-align: center; padding: 40px; color: #666;">
              <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;">📊</div>
              <div>No backtests yet. Create your first one!</div>
            </div>
          </div>
        </div>

        <!-- TAB CONTENT: Import Data -->
        <div id="importDataContent" class="tab-content" style="flex: 1; overflow: hidden; display: none; flex-direction: column;">

          <!-- Import Controls -->
          <div style="display: flex; gap: 12px; margin-bottom: 16px; align-items: center;">
            <input
              type="text"
              id="tickerSearchInput"
              placeholder="Search tickers..."
              style="flex: 1; padding: 12px 16px; background: rgba(59, 130, 246, 0.05); border: 2px solid #2a2a2a; border-radius: 8px; color: #fff; font-size: 14px;"
            />
            <button
              id="updateAllBtn"
              style="padding: 12px 24px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border: none; border-radius: 8px; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; white-space: nowrap; transition: all 0.2s;"
            >
              🔄 Update All Missing
            </button>
          </div>

          <!-- Import Stats -->
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px;">
            <div style="background: rgba(16, 185, 129, 0.1); border: 2px solid #10b981; border-radius: 8px; padding: 12px; text-align: center;">
              <div style="font-size: 11px; color: #9ca3af; margin-bottom: 4px; text-transform: uppercase;">Complete</div>
              <div id="completeCount" style="font-size: 20px; font-weight: 700; color: #10b981;">0</div>
            </div>
            <div style="background: rgba(251, 146, 60, 0.1); border: 2px solid #fb923c; border-radius: 8px; padding: 12px; text-align: center;">
              <div style="font-size: 11px; color: #9ca3af; margin-bottom: 4px; text-transform: uppercase;">Partial</div>
              <div id="partialCount" style="font-size: 20px; font-weight: 700; color: #fb923c;">0</div>
            </div>
            <div style="background: rgba(107, 114, 128, 0.1); border: 2px solid #6b7280; border-radius: 8px; padding: 12px; text-align: center;">
              <div style="font-size: 11px; color: #9ca3af; margin-bottom: 4px; text-transform: uppercase;">Pending</div>
              <div id="pendingCount" style="font-size: 20px; font-weight: 700; color: #9ca3af;">0</div>
            </div>
          </div>

          <!-- Ticker List -->
          <div id="tickerImportList" style="flex: 1; overflow-y: auto;">
            <div style="text-align: center; padding: 40px; color: #666;">
              <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;">⏳</div>
              <div>Loading import status...</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Backtest Modal -->
    <div id="createModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.8); z-index: 10000; align-items: center; justify-content: center;">
      <div style="background: linear-gradient(135deg, #1a2332 0%, #151b2e 100%); border: 2px solid #3d4a5c; border-radius: 16px; padding: 32px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          <h2 style="font-size: 24px; font-weight: 700; color: #fff; margin: 0;">Create Backtest</h2>
          <button id="closeCreateModal" style="background: none; border: none; color: #9ca3af; font-size: 24px; cursor: pointer; padding: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 6px; transition: all 0.2s;">✕</button>
        </div>
        <form id="createForm">
          <div style="margin-bottom: 20px;">
            <label style="display: block; font-size: 14px; font-weight: 600; color: #e0e6ed; margin-bottom: 8px;">Name</label>
            <input type="text" id="backtestName" placeholder="My Strategy Backtest" required style="width: 100%; padding: 12px; background: rgba(59, 130, 246, 0.05); border: 2px solid #3d4a5c; border-radius: 8px; color: #e0e6ed; font-size: 14px;">
          </div>
          <div style="margin-bottom: 20px;">
            <label style="display: block; font-size: 14px; font-weight: 600; color: #e0e6ed; margin-bottom: 8px;">Description (Optional)</label>
            <input type="text" id="backtestDescription" placeholder="Testing a new strategy..." style="width: 100%; padding: 12px; background: rgba(59, 130, 246, 0.05); border: 2px solid #3d4a5c; border-radius: 8px; color: #e0e6ed; font-size: 14px;">
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
            <div>
              <label style="display: block; font-size: 14px; font-weight: 600; color: #e0e6ed; margin-bottom: 8px;">Symbols</label>
              <input type="text" id="backtestSymbols" placeholder="SPY" value="SPY" required style="width: 100%; padding: 12px; background: rgba(59, 130, 246, 0.05); border: 2px solid #3d4a5c; border-radius: 8px; color: #e0e6ed; font-size: 14px;">
            </div>
            <div>
              <label style="display: block; font-size: 14px; font-weight: 600; color: #e0e6ed; margin-bottom: 8px;">Initial Capital</label>
              <input type="number" id="backtestCapital" placeholder="100000" value="100000" required min="5000" style="width: 100%; padding: 12px; background: rgba(59, 130, 246, 0.05); border: 2px solid #3d4a5c; border-radius: 8px; color: #e0e6ed; font-size: 14px;">
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
            <div>
              <label style="display: block; font-size: 14px; font-weight: 600; color: #e0e6ed; margin-bottom: 8px;">Start Date</label>
              <input type="date" id="backtestStartDate" required style="width: 100%; padding: 12px; background: rgba(59, 130, 246, 0.05); border: 2px solid #3d4a5c; border-radius: 8px; color: #e0e6ed; font-size: 14px;">
            </div>
            <div>
              <label style="display: block; font-size: 14px; font-weight: 600; color: #e0e6ed; margin-bottom: 8px;">End Date</label>
              <input type="date" id="backtestEndDate" required style="width: 100%; padding: 12px; background: rgba(59, 130, 246, 0.05); border: 2px solid #3d4a5c; border-radius: 8px; color: #e0e6ed; font-size: 14px;">
            </div>
          </div>
          <div style="margin-bottom: 20px;">
            <label style="display: block; font-size: 14px; font-weight: 600; color: #e0e6ed; margin-bottom: 8px;">Strategy</label>
            <select id="backtestStrategy" required style="width: 100%; padding: 12px; background: rgba(59, 130, 246, 0.05); border: 2px solid #3d4a5c; border-radius: 8px; color: #e0e6ed; font-size: 14px; cursor: pointer;">
              <option value="BuyAndHold">Buy and Hold</option>
            </select>
          </div>
          <div style="margin-bottom: 20px;">
            <label style="display: block; font-size: 14px; font-weight: 600; color: #e0e6ed; margin-bottom: 8px;">Commission per Contract ($)</label>
            <input type="number" step="0.01" id="backtestCommission" placeholder="0.05" value="0.05" required style="width: 100%; padding: 12px; background: rgba(59, 130, 246, 0.05); border: 2px solid #3d4a5c; border-radius: 8px; color: #e0e6ed; font-size: 14px;">
          </div>
          <button type="submit" style="width: 100%; padding: 14px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border: none; border-radius: 8px; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; margin-top: 8px;">
            Create & Run Backtest
          </button>
        </form>
      </div>
    </div>

    <!-- Detailed Backtest Modal -->
    <div id="backtestDetailModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.9); z-index: 10001; align-items: center; justify-content: center; overflow-y: auto; padding: 40px 20px;">
      <div style="background: linear-gradient(135deg, #1a2332 0%, #151b2e 100%); border: 3px solid #3b82f6; border-radius: 20px; max-width: 1200px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(59, 130, 246, 0.4);">

        <!-- Modal Header -->
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 24px 32px; border-radius: 17px 17px 0 0; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 10;">
          <div>
            <h2 id="detailModalTitle" style="font-size: 28px; font-weight: 700; color: #fff; margin: 0 0 8px 0;">Backtest Details</h2>
            <div id="detailModalSubtitle" style="font-size: 14px; color: rgba(255, 255, 255, 0.8);"></div>
          </div>
          <button id="closeDetailModal" style="background: rgba(255, 255, 255, 0.2); border: 2px solid rgba(255, 255, 255, 0.4); border-radius: 8px; color: #fff; font-size: 20px; cursor: pointer; padding: 8px 16px; font-weight: 700; transition: all 0.2s;">✕</button>
        </div>

        <!-- Modal Content -->
        <div id="detailModalContent" style="padding: 32px;">
          <div style="text-align: center; padding: 60px; color: #666;">
            <div style="font-size: 48px; margin-bottom: 16px;">⏳</div>
            <div>Loading backtest details...</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Comparison Tool Modal -->
    <div id="comparisonModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.9); z-index: 10002; align-items: center; justify-content: center; overflow-y: auto; padding: 40px 20px;">
      <div style="background: linear-gradient(135deg, #1a2332 0%, #151b2e 100%); border: 3px solid #10b981; border-radius: 20px; max-width: 1400px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(16, 185, 129, 0.4);">

        <!-- Modal Header -->
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 24px 32px; border-radius: 17px 17px 0 0; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 10;">
          <div>
            <h2 style="font-size: 28px; font-weight: 700; color: #fff; margin: 0 0 8px 0;">📊 Backtest Comparison</h2>
            <div style="font-size: 14px; color: rgba(255, 255, 255, 0.8);">Compare multiple backtests side-by-side</div>
          </div>
          <button id="closeComparisonModal" style="background: rgba(255, 255, 255, 0.2); border: 2px solid rgba(255, 255, 255, 0.4); border-radius: 8px; color: #fff; font-size: 20px; cursor: pointer; padding: 8px 16px; font-weight: 700; transition: all 0.2s;">✕</button>
        </div>

        <!-- Modal Content -->
        <div id="comparisonModalContent" style="padding: 32px;">
          <div style="text-align: center; padding: 60px; color: #666;">
            <div style="font-size: 48px; margin-bottom: 16px;">📊</div>
            <div>Select backtests to compare</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function initBacktesterView() {
  let currentMode = 'live';

  // 🔥 Make mode globally accessible so other components can check it
  window.backtestMode = false;
  let backtests = [];
  let importTickers = [];
  let filteredTickers = [];
  let currentTab = 'backtests';

  // CSRF token cache
  let cachedCSRFToken = null;

  // Get CSRF token from API (not from cookies - it's HttpOnly)
  async function getCSRFToken() {
    // Return cached token if we have one
    if (cachedCSRFToken) {
      return cachedCSRFToken;
    }

    // Fetch token from API
    try {
      const response = await fetch('/api/auth/verify', {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.valid && data.csrfToken) {
        cachedCSRFToken = data.csrfToken;
        console.log('[Backtester] CSRF token obtained from API');
        return cachedCSRFToken;
      }
    } catch (error) {
      console.error('[Backtester] Failed to get CSRF token:', error);
    }
    return null;
  }

  // Get session token from cookie
  function getSessionToken() {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'sessionToken') return value;
    }
    return null;
  }

  // API call wrapper
  async function apiCall(url, options = {}) {
    console.log('[Backtester] Making API call to:', url);

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include'  // Browser automatically sends HttpOnly cookies
    });

    console.log('[Backtester] Response status:', response.status);

    if (response.status === 401) {
      console.error('[Backtester] Session expired, redirecting to login...');
      window.location.href = '/login';
      throw new Error('Session expired');
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  // 🔥 FIX: Define importTicker globally at the top so it's available when buttons are rendered
  window.importTicker = async function(ticker) {
    if (!confirm(`Start import for ${ticker}? This may take several minutes.`)) {
      return;
    }

    try {
      const csrfToken = await getCSRFToken();
      if (!csrfToken) {
        alert('Failed to get CSRF token. Please refresh the page.');
        return;
      }

      const data = await apiCall('/api/import/ticker', {
        method: 'POST',
        headers: { 'X-CSRF-Token': csrfToken },
        body: JSON.stringify({ ticker })
      });

      alert(`Import started for ${ticker}\nJob ID: ${data.job_id}\n\nProgress will be shown via notifications.`);

      // Refresh status after a delay
      setTimeout(() => loadImportStatus(), 2000);
    } catch (error) {
      alert(`Failed to start import for ${ticker}: ${error.message}`);
    }
  };

  // Load system mode
  async function loadMode() {
    try {
      const data = await apiCall('/api/backtest/mode');
      currentMode = data.mode;
      updateModeUI();

      // Only load backtests if we're in backtest mode
      if (currentMode === 'backtest') {
        console.log('[Backtester] In BACKTEST mode - loading configurations...');
        loadBacktests();
      } else {
        console.log('[Backtester] In LIVE mode - not loading backtest configurations');
      }
    } catch (error) {
      console.error('Failed to load mode:', error);
    }
  }

  // Update mode UI
  function updateModeUI() {
    const modeBadge = document.getElementById('modeBadge');
    const toggleBtn = document.getElementById('toggleModeBtn');

    // 🔥 FIX: Elements may not exist if not on backtester view yet
    if (!modeBadge || !toggleBtn) {
      console.log('[Backtester] UI elements not found - view not rendered yet');
      return;
    }

    if (currentMode === 'live') {
      modeBadge.textContent = 'LIVE';
      modeBadge.style.cssText = 'padding: 8px 16px; border-radius: 6px; font-size: 12px; font-weight: 700; text-transform: uppercase; background: rgba(16, 185, 129, 0.2); color: #10b981; border: 2px solid #10b981;';
      toggleBtn.textContent = 'Switch to Backtest Mode';
    } else {
      modeBadge.textContent = 'BACKTEST';
      modeBadge.style.cssText = 'padding: 8px 16px; border-radius: 6px; font-size: 12px; font-weight: 700; text-transform: uppercase; background: rgba(251, 146, 60, 0.2); color: #fb923c; border: 2px solid #fb923c;';
      toggleBtn.textContent = 'Switch to Live Mode';
    }
  }

  // Toggle mode
  async function toggleMode() {
    try {
      const newMode = currentMode === 'live' ? 'backtest' : 'live';
      const csrfToken = await getCSRFToken();

      if (!csrfToken) {
        console.error('[Backtester] Cannot switch mode - no CSRF token');
        if (window.showToast) {
          window.showToast({
            type: 'error',
            title: 'Error',
            message: 'Failed to get CSRF token. Please refresh the page.',
            duration: 5000
          });
        }
        return;
      }

      const data = await apiCall('/api/backtest/mode', {
        method: 'POST',
        headers: { 'X-CSRF-Token': csrfToken },
        body: JSON.stringify({ mode: newMode })
      });

      console.log('[Backtester] 🔍 Mode switch request:', { requestedMode: newMode, responseData: data });
      currentMode = data.mode;
      console.log('[Backtester] 🔍 Current mode set to:', currentMode);

      // 🔥 Update global flag
      window.backtestMode = (currentMode === 'backtest');

      updateModeUI();

      // Load backtests if switching to backtest mode
      if (currentMode === 'backtest') {
        console.log('[Backtester] Switched to BACKTEST mode - loading configurations...');

        // 🔥 FIX: Navigate to backtest view when switching to backtest mode
        if (typeof window.setView === 'function') {
          window.setView('backtester');
        }

        loadBacktests();
      } else {
        console.log('[Backtester] Switched to LIVE mode - clearing backtest data');
        // Clear backtest list when switching to live mode
        backtests = [];
        renderBacktests();
        updateStats();
      }

      // Show toast notification
      if (window.showToast) {
        window.showToast({
          type: 'success',
          title: 'Mode Switched',
          message: `System switched to ${newMode.toUpperCase()} mode`,
          duration: 3000
        });
      }
    } catch (error) {
      // Show error toast
      if (window.showToast) {
        window.showToast({
          type: 'error',
          title: 'Mode Switch Failed',
          message: error.message,
          duration: 5000
        });
      }
    }
  }

  // Load backtests
  async function loadBacktests() {
    try {
      const data = await apiCall('/api/backtest/configs');
      backtests = data.configs || [];
      renderBacktests();
      updateStats();
    } catch (error) {
      console.error('Failed to load backtests:', error);
    }
  }

  // Render backtests with immersive cards
  function renderBacktests() {
    const container = document.getElementById('backtestList');
    if (!container) return;

    if (backtests.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #666;">
          <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;">📊</div>
          <div>No backtests yet. Create your first one!</div>
        </div>
      `;
      return;
    }

    container.innerHTML = backtests.slice(0, 10).map((bt, index) => {
      const statusColor = bt.status === 'running' ? '#fb923c' : bt.status === 'completed' ? '#10b981' : '#3d4a5c';
      const statusBg = bt.status === 'running' ? 'rgba(251, 146, 60, 0.1)' : bt.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(107, 114, 128, 0.1)';

      // Parse results if available
      let resultsDisplay = '';
      let deploymentBadge = '';
      if (bt.status === 'completed' && bt.results) {
        const results = typeof bt.results === 'string' ? JSON.parse(bt.results) : bt.results;
        const totalReturn = results.total_return || 0;
        const sharpeRatio = results.sharpe_ratio || 0;
        const maxDrawdown = results.max_drawdown || 0;
        const winRate = results.win_rate || 0;

        // Check deployment readiness
        if (results.deployment_ready) {
          const score = Math.round(results.deployment_readiness_score || 0);
          deploymentBadge = `
            <div style="
              position: absolute;
              top: 12px;
              right: 12px;
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              color: white;
              padding: 4px 10px;
              border-radius: 6px;
              font-size: 10px;
              font-weight: 700;
              box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4);
              z-index: 1;
            ">
              🚀 DEPLOY READY ${score}%
            </div>
          `;
        }

        resultsDisplay = `
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 12px; padding-top: 12px; border-top: 2px solid #2a2a2a;">
            <div style="text-align: center;">
              <div style="font-size: 11px; color: #9ca3af; margin-bottom: 4px;">Return</div>
              <div style="font-size: 16px; font-weight: 700; color: ${totalReturn >= 0 ? '#10b981' : '#ef4444'};">
                ${totalReturn >= 0 ? '+' : ''}${(totalReturn * 100).toFixed(2)}%
              </div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 11px; color: #9ca3af; margin-bottom: 4px;">Sharpe</div>
              <div style="font-size: 16px; font-weight: 700; color: ${sharpeRatio >= 1 ? '#10b981' : sharpeRatio >= 0 ? '#fb923c' : '#ef4444'};">
                ${sharpeRatio.toFixed(2)}
              </div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 11px; color: #9ca3af; margin-bottom: 4px;">Max DD</div>
              <div style="font-size: 16px; font-weight: 700; color: #ef4444;">
                ${(maxDrawdown * 100).toFixed(2)}%
              </div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 11px; color: #9ca3af; margin-bottom: 4px;">Win Rate</div>
              <div style="font-size: 16px; font-weight: 700; color: ${winRate >= 0.5 ? '#10b981' : '#fb923c'};">
                ${(winRate * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        `;
      }

      return `
        <div
          data-backtest-id="${bt.id}"
          onclick="window.openBacktestDetails('${bt.id}')"
          style="
            background: ${statusBg};
            border: 2px solid ${statusColor};
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 12px;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
          "
          onmouseover="
            this.style.borderColor='#3b82f6';
            this.style.transform='translateX(6px) scale(1.02)';
            this.style.boxShadow='0 8px 24px rgba(59, 130, 246, 0.3)';
          "
          onmouseout="
            this.style.borderColor='${statusColor}';
            this.style.transform='translateX(0) scale(1)';
            this.style.boxShadow='none';
          "
        >
          <!-- Deployment Ready Badge -->
          ${deploymentBadge}

          <!-- Status indicator bar -->
          <div style="
            position: absolute;
            top: 0;
            left: 0;
            width: 6px;
            height: 100%;
            background: ${statusColor};
          "></div>

          <!-- Header -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div>
              <div style="font-size: 18px; font-weight: 700; color: #fff; margin-bottom: 4px;">
                ${bt.name}
              </div>
              <div style="font-size: 12px; color: #9ca3af;">
                ${bt.description || 'No description'}
              </div>
            </div>
            <div style="
              padding: 6px 14px;
              border-radius: 6px;
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              background: ${statusBg};
              color: ${statusColor};
              border: 2px solid ${statusColor};
            ">
              ${bt.status === 'running' ? '⏳ ' : bt.status === 'completed' ? '✅ ' : '⏸ '}${bt.status}
            </div>
          </div>

          <!-- Basic Info -->
          <div style="display: flex; gap: 16px; color: #9ca3af; font-size: 13px; flex-wrap: wrap;">
            <span>📅 ${bt.start_date} → ${bt.end_date}</span>
            <span>💰 $${(bt.initial_capital).toLocaleString()}</span>
            <span>🎯 ${bt.strategy_name}</span>
          </div>

          <!-- Results (if completed) -->
          ${resultsDisplay}

          <!-- Click hint -->
          <div style="
            margin-top: 12px;
            padding-top: 12px;
            border-top: 2px solid #2a2a2a;
            text-align: center;
            font-size: 12px;
            color: #3b82f6;
            font-weight: 600;
          ">
            ${bt.status === 'completed' ? '🔍 Click to view detailed analysis' : bt.status === 'running' ? '⏳ Backtest in progress...' : '👆 Click for details'}
          </div>
        </div>
      `;
    }).join('');
  }

  // Update stats
  function updateStats() {
    // 🔥 FIX: Check if elements exist before updating (they don't exist on non-backtest pages)
    const totalEl = document.getElementById('totalBacktests');
    const runningEl = document.getElementById('runningBacktests');
    const completedEl = document.getElementById('completedBacktests');

    if (!totalEl || !runningEl || !completedEl) {
      console.warn('[Backtester] Stats elements not found in DOM - skipping update');
      return;
    }

    const total = backtests.length;
    const running = backtests.filter(b => b.status === 'running').length;
    const completed = backtests.filter(b => b.status === 'completed').length;

    totalEl.textContent = total;
    runningEl.textContent = running;
    completedEl.textContent = completed;
  }

  // ========================================
  // DETAILED BACKTEST MODAL
  // ========================================

  window.openBacktestDetails = async function(configId) {
    const modal = document.getElementById('backtestDetailModal');
    const title = document.getElementById('detailModalTitle');
    const subtitle = document.getElementById('detailModalSubtitle');
    const content = document.getElementById('detailModalContent');

    if (!modal || !content) return;

    // Show modal with loading state
    modal.style.display = 'flex';
    content.innerHTML = `
      <div style="text-align: center; padding: 60px; color: #666;">
        <div style="font-size: 48px; margin-bottom: 16px; animation: spin 1s linear infinite;">⏳</div>
        <div>Loading backtest details...</div>
      </div>
    `;

    try {
      // Find backtest config
      const backtest = backtests.find(bt => bt.id === configId);
      if (!backtest) throw new Error('Backtest not found');

      // Update title
      if (title) title.textContent = backtest.name;
      if (subtitle) subtitle.textContent = `${backtest.start_date} to ${backtest.end_date} • ${backtest.strategy_name}`;

      // Load results
      const data = await apiCall(`/api/backtest/results?config_id=${configId}`);
      const results = data.results || {};

      // Render detailed view
      content.innerHTML = renderBacktestDetails(backtest, results);
    } catch (error) {
      content.innerHTML = `
        <div style="text-align: center; padding: 60px; color: #ef4444;">
          <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
          <div>Failed to load backtest details</div>
          <div style="font-size: 14px; margin-top: 8px; color: #9ca3af;">${error.message}</div>
        </div>
      `;
    }
  };

  function renderBacktestDetails(backtest, results) {
    const totalReturn = results.total_return || 0;
    const sharpeRatio = results.sharpe_ratio || 0;
    const maxDrawdown = results.max_drawdown || 0;
    const winRate = results.win_rate || 0;
    const totalTrades = results.total_trades || 0;
    const avgWin = results.avg_win || 0;
    const avgLoss = results.avg_loss || 0;
    const profitFactor = results.profit_factor || 0;
    const finalBalance = backtest.initial_capital * (1 + totalReturn);

    // Advanced metrics
    const alpha = results.alpha;
    const beta = results.beta;
    const rSquared = results.r_squared;
    const sortinoRatio = results.sortino_ratio;
    const calmarRatio = results.calmar_ratio;
    const informationRatio = results.information_ratio;

    return `
      <!-- Performance Summary -->
      <div style="background: rgba(59, 130, 246, 0.1); border: 2px solid #3b82f6; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <h3 style="font-size: 20px; font-weight: 700; color: #3b82f6; margin: 0 0 20px 0;">📈 Performance Summary</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
          <div style="background: rgba(0, 0, 0, 0.3); border-radius: 8px; padding: 16px;">
            <div style="font-size: 12px; color: #9ca3af; margin-bottom: 8px; text-transform: uppercase;">Total Return</div>
            <div style="font-size: 28px; font-weight: 700; color: ${totalReturn >= 0 ? '#10b981' : '#ef4444'};">
              ${totalReturn >= 0 ? '+' : ''}${(totalReturn * 100).toFixed(2)}%
            </div>
          </div>
          <div style="background: rgba(0, 0, 0, 0.3); border-radius: 8px; padding: 16px;">
            <div style="font-size: 12px; color: #9ca3af; margin-bottom: 8px; text-transform: uppercase;">Final Balance</div>
            <div style="font-size: 28px; font-weight: 700; color: #fff;">
              $${finalBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </div>
          </div>
          <div style="background: rgba(0, 0, 0, 0.3); border-radius: 8px; padding: 16px;">
            <div style="font-size: 12px; color: #9ca3af; margin-bottom: 8px; text-transform: uppercase;">Sharpe Ratio</div>
            <div style="font-size: 28px; font-weight: 700; color: ${sharpeRatio >= 1 ? '#10b981' : sharpeRatio >= 0 ? '#fb923c' : '#ef4444'};">
              ${sharpeRatio.toFixed(3)}
            </div>
          </div>
          <div style="background: rgba(0, 0, 0, 0.3); border-radius: 8px; padding: 16px;">
            <div style="font-size: 12px; color: #9ca3af; margin-bottom: 8px; text-transform: uppercase;">Max Drawdown</div>
            <div style="font-size: 28px; font-weight: 700; color: #ef4444;">
              ${(maxDrawdown * 100).toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      <!-- Trade Statistics -->
      <div style="background: rgba(16, 185, 129, 0.1); border: 2px solid #10b981; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <h3 style="font-size: 20px; font-weight: 700; color: #10b981; margin: 0 0 20px 0;">📊 Trade Statistics</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px;">
          <div style="background: rgba(0, 0, 0, 0.3); border-radius: 8px; padding: 16px;">
            <div style="font-size: 12px; color: #9ca3af; margin-bottom: 8px;">Total Trades</div>
            <div style="font-size: 24px; font-weight: 700; color: #fff;">${totalTrades}</div>
          </div>
          <div style="background: rgba(0, 0, 0, 0.3); border-radius: 8px; padding: 16px;">
            <div style="font-size: 12px; color: #9ca3af; margin-bottom: 8px;">Win Rate</div>
            <div style="font-size: 24px; font-weight: 700; color: ${winRate >= 0.5 ? '#10b981' : '#fb923c'};">${(winRate * 100).toFixed(1)}%</div>
          </div>
          <div style="background: rgba(0, 0, 0, 0.3); border-radius: 8px; padding: 16px;">
            <div style="font-size: 12px; color: #9ca3af; margin-bottom: 8px;">Avg Win</div>
            <div style="font-size: 24px; font-weight: 700; color: #10b981;">$${avgWin.toFixed(2)}</div>
          </div>
          <div style="background: rgba(0, 0, 0, 0.3); border-radius: 8px; padding: 16px;">
            <div style="font-size: 12px; color: #9ca3af; margin-bottom: 8px;">Avg Loss</div>
            <div style="font-size: 24px; font-weight: 700; color: #ef4444;">$${Math.abs(avgLoss).toFixed(2)}</div>
          </div>
          <div style="background: rgba(0, 0, 0, 0.3); border-radius: 8px; padding: 16px;">
            <div style="font-size: 12px; color: #9ca3af; margin-bottom: 8px;">Profit Factor</div>
            <div style="font-size: 24px; font-weight: 700; color: ${profitFactor >= 1.5 ? '#10b981' : profitFactor >= 1 ? '#fb923c' : '#ef4444'};">${profitFactor.toFixed(2)}</div>
          </div>
        </div>
      </div>

      <!-- Advanced Metrics (Alpha/Beta vs SPY) -->
      ${alpha !== null && alpha !== undefined ? `
        <div style="background: rgba(251, 146, 60, 0.1); border: 2px solid #fb923c; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <h3 style="font-size: 20px; font-weight: 700; color: #fb923c; margin: 0 0 20px 0;">📈 Advanced Metrics (vs SPY)</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px;">
            <div style="background: rgba(0, 0, 0, 0.3); border-radius: 8px; padding: 16px;">
              <div style="font-size: 12px; color: #9ca3af; margin-bottom: 8px;">Alpha (Annualized)</div>
              <div style="font-size: 24px; font-weight: 700; color: ${alpha >= 0 ? '#10b981' : '#ef4444'};">
                ${alpha >= 0 ? '+' : ''}${(alpha * 100).toFixed(2)}%
              </div>
              <div style="font-size: 11px; color: #9ca3af; margin-top: 4px;">Excess return vs SPY</div>
            </div>
            <div style="background: rgba(0, 0, 0, 0.3); border-radius: 8px; padding: 16px;">
              <div style="font-size: 12px; color: #9ca3af; margin-bottom: 8px;">Beta</div>
              <div style="font-size: 24px; font-weight: 700; color: ${Math.abs(beta - 1) < 0.2 ? '#10b981' : '#fb923c'};">
                ${beta.toFixed(3)}
              </div>
              <div style="font-size: 11px; color: #9ca3af; margin-top: 4px;">Market sensitivity</div>
            </div>
            <div style="background: rgba(0, 0, 0, 0.3); border-radius: 8px; padding: 16px;">
              <div style="font-size: 12px; color: #9ca3af; margin-bottom: 8px;">R-Squared</div>
              <div style="font-size: 24px; font-weight: 700; color: ${rSquared >= 0.7 ? '#10b981' : rSquared >= 0.4 ? '#fb923c' : '#9ca3af'};">
                ${(rSquared * 100).toFixed(1)}%
              </div>
              <div style="font-size: 11px; color: #9ca3af; margin-top: 4px;">Correlation strength</div>
            </div>
            <div style="background: rgba(0, 0, 0, 0.3); border-radius: 8px; padding: 16px;">
              <div style="font-size: 12px; color: #9ca3af; margin-bottom: 8px;">Information Ratio</div>
              <div style="font-size: 24px; font-weight: 700; color: ${informationRatio >= 0.5 ? '#10b981' : informationRatio >= 0 ? '#fb923c' : '#ef4444'};">
                ${informationRatio.toFixed(3)}
              </div>
              <div style="font-size: 11px; color: #9ca3af; margin-top: 4px;">Active return quality</div>
            </div>
            <div style="background: rgba(0, 0, 0, 0.3); border-radius: 8px; padding: 16px;">
              <div style="font-size: 12px; color: #9ca3af; margin-bottom: 8px;">Sortino Ratio</div>
              <div style="font-size: 24px; font-weight: 700; color: ${sortinoRatio >= 1.5 ? '#10b981' : sortinoRatio >= 0.5 ? '#fb923c' : '#ef4444'};">
                ${sortinoRatio.toFixed(3)}
              </div>
              <div style="font-size: 11px; color: #9ca3af; margin-top: 4px;">Downside risk-adjusted</div>
            </div>
            <div style="background: rgba(0, 0, 0, 0.3); border-radius: 8px; padding: 16px;">
              <div style="font-size: 12px; color: #9ca3af; margin-bottom: 8px;">Calmar Ratio</div>
              <div style="font-size: 24px; font-weight: 700; color: ${calmarRatio >= 1 ? '#10b981' : calmarRatio >= 0.5 ? '#fb923c' : '#ef4444'};">
                ${calmarRatio.toFixed(3)}
              </div>
              <div style="font-size: 11px; color: #9ca3af; margin-top: 4px;">Return / Max Drawdown</div>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Deploy Readiness Score -->
      ${results.validation ? `
        <div style="background: ${results.deployment_ready ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; border: 2px solid ${results.deployment_ready ? '#10b981' : '#ef4444'}; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <h3 style="font-size: 20px; font-weight: 700; color: ${results.deployment_ready ? '#10b981' : '#ef4444'}; margin: 0 0 20px 0;">
            🚀 Deployment Readiness Score: ${Math.round(results.deployment_readiness_score)}%
          </h3>

          <div style="background: rgba(0, 0, 0, 0.3); border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <div style="font-size: 16px; font-weight: 600; color: #fff; margin-bottom: 12px;">
              ${results.deployment_ready ? '✅ STRATEGY IS DEPLOYMENT READY' : '❌ STRATEGY NOT READY FOR DEPLOYMENT'}
            </div>
            <div style="font-size: 13px; color: #9ca3af;">
              Professional-grade validation ensures this strategy is robust, statistically significant, and not curve-fitted.
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
            <!-- Walk-Forward Efficiency -->
            <div style="background: rgba(0, 0, 0, 0.3); border-radius: 8px; padding: 16px; border-left: 4px solid ${results.validation.walk_forward_pass ? '#10b981' : '#ef4444'};">
              <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                <div style="font-size: 13px; color: #9ca3af;">Walk-Forward Efficiency</div>
                <div style="font-size: 18px;">${results.validation.walk_forward_pass ? '✅' : '❌'}</div>
              </div>
              <div style="font-size: 20px; font-weight: 700; color: ${results.validation.walk_forward_efficiency >= 0.7 ? '#10b981' : results.validation.walk_forward_efficiency >= 0.5 ? '#fb923c' : '#ef4444'};">
                ${results.validation.walk_forward_efficiency.toFixed(3)}
              </div>
              <div style="font-size: 11px; color: #9ca3af; margin-top: 4px;">Target: &gt; 0.5 (excellent &gt; 0.7)</div>
            </div>

            <!-- Monte Carlo p-value -->
            <div style="background: rgba(0, 0, 0, 0.3); border-radius: 8px; padding: 16px; border-left: 4px solid ${results.validation.monte_carlo_pass ? '#10b981' : '#ef4444'};">
              <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                <div style="font-size: 13px; color: #9ca3af;">Monte Carlo Significance</div>
                <div style="font-size: 18px;">${results.validation.monte_carlo_pass ? '✅' : '❌'}</div>
              </div>
              <div style="font-size: 20px; font-weight: 700; color: ${results.validation.monte_carlo_pass ? '#10b981' : '#ef4444'};">
                p = ${results.validation.monte_carlo_pvalue.toFixed(4)}
              </div>
              <div style="font-size: 11px; color: #9ca3af; margin-top: 4px;">Target: &lt; 0.05 (stat. significant)</div>
            </div>

            <!-- Deflated Sharpe Ratio -->
            <div style="background: rgba(0, 0, 0, 0.3); border-radius: 8px; padding: 16px; border-left: 4px solid ${results.validation.dsr_pass ? '#10b981' : '#ef4444'};">
              <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                <div style="font-size: 13px; color: #9ca3af;">Deflated Sharpe Ratio</div>
                <div style="font-size: 18px;">${results.validation.dsr_pass ? '✅' : '❌'}</div>
              </div>
              <div style="font-size: 20px; font-weight: 700; color: ${results.validation.dsr_pass ? '#10b981' : '#ef4444'};">
                ${(results.validation.dsr_confidence * 100).toFixed(1)}%
              </div>
              <div style="font-size: 11px; color: #9ca3af; margin-top: 4px;">Target: &gt; 95% confidence</div>
            </div>

            <!-- Trade Count -->
            <div style="background: rgba(0, 0, 0, 0.3); border-radius: 8px; padding: 16px; border-left: 4px solid ${results.validation.trade_count_pass ? '#10b981' : '#ef4444'};">
              <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                <div style="font-size: 13px; color: #9ca3af;">Trade Count</div>
                <div style="font-size: 18px;">${results.validation.trade_count_pass ? '✅' : '❌'}</div>
              </div>
              <div style="font-size: 20px; font-weight: 700; color: ${results.validation.trade_count >= 500 ? '#10b981' : results.validation.trade_count >= 100 ? '#fb923c' : '#ef4444'};">
                ${results.validation.trade_count}
              </div>
              <div style="font-size: 11px; color: #9ca3af; margin-top: 4px;">Target: ≥ 100 (ideal ≥ 500)</div>
            </div>

            <!-- 2x Cost Stress Test -->
            <div style="background: rgba(0, 0, 0, 0.3); border-radius: 8px; padding: 16px; border-left: 4px solid ${results.validation.stress_test_pass ? '#10b981' : '#ef4444'};">
              <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                <div style="font-size: 13px; color: #9ca3af;">2x Cost Stress Test</div>
                <div style="font-size: 18px;">${results.validation.stress_test_pass ? '✅' : '❌'}</div>
              </div>
              <div style="font-size: 20px; font-weight: 700; color: ${results.validation.stress_test_pass ? '#10b981' : '#ef4444'};">
                ${(results.validation.stress_test_return * 100).toFixed(2)}%
              </div>
              <div style="font-size: 11px; color: #9ca3af; margin-top: 4px;">Target: Profitable at 2x costs</div>
            </div>

            <!-- Market Regimes -->
            <div style="background: rgba(0, 0, 0, 0.3); border-radius: 8px; padding: 16px; border-left: 4px solid ${results.validation.regime_pass ? '#10b981' : '#ef4444'};">
              <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                <div style="font-size: 13px; color: #9ca3af;">Market Regime Robustness</div>
                <div style="font-size: 18px;">${results.validation.regime_pass ? '✅' : '❌'}</div>
              </div>
              <div style="font-size: 20px; font-weight: 700; color: ${results.validation.regime_pass ? '#10b981' : '#ef4444'};">
                ${Object.values(results.validation.regime_performance || {}).filter(r => r.return > 0).length}/5
              </div>
              <div style="font-size: 11px; color: #9ca3af; margin-top: 4px;">Target: Positive in ≥ 4/5 regimes</div>
            </div>
          </div>

          <div style="margin-top: 16px; padding: 16px; background: rgba(0, 0, 0, 0.2); border-radius: 8px; font-size: 12px; color: #9ca3af;">
            <strong style="color: #fb923c;">Why these criteria matter:</strong> They separate robust strategies from curve-fitted ones by testing statistical significance (Monte Carlo), out-of-sample performance (Walk-Forward), realistic costs (2x stress), adequate sample size (trade count), and adaptability (regime robustness).
          </div>
        </div>
      ` : ''}

      <!-- Configuration Details -->
      <div style="background: rgba(107, 114, 128, 0.1); border: 2px solid #6b7280; border-radius: 12px; padding: 24px;">
        <h3 style="font-size: 20px; font-weight: 700; color: #9ca3af; margin: 0 0 16px 0;">⚙️ Configuration</h3>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; color: #e0e6ed; font-size: 14px;">
          <div><span style="color: #9ca3af;">Initial Capital:</span> <strong>$${backtest.initial_capital.toLocaleString()}</strong></div>
          <div><span style="color: #9ca3af;">Strategy:</span> <strong>${backtest.strategy_name}</strong></div>
          <div><span style="color: #9ca3af;">Commission:</span> <strong>$${backtest.commission} per contract</strong></div>
          <div><span style="color: #9ca3af;">Status:</span> <strong style="color: ${backtest.status === 'completed' ? '#10b981' : '#fb923c'};">${backtest.status}</strong></div>
        </div>
        ${backtest.description ? `<div style="margin-top: 16px; padding-top: 16px; border-top: 2px solid #2a2a2a; color: #9ca3af;">${backtest.description}</div>` : ''}
      </div>
    `;
  }

  // ========================================
  // COMPARISON TOOL
  // ========================================

  let selectedBacktests = [];

  window.openComparisonTool = function() {
    const modal = document.getElementById('comparisonModal');
    const content = document.getElementById('comparisonModalContent');

    if (!modal || !content) return;

    // Get only completed backtests
    const completedBacktests = backtests.filter(bt => bt.status === 'completed');

    if (completedBacktests.length < 2) {
      content.innerHTML = `
        <div style="text-align: center; padding: 60px; color: #fb923c;">
          <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
          <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">Not Enough Backtests</div>
          <div style="color: #9ca3af;">You need at least 2 completed backtests to use the comparison tool.</div>
        </div>
      `;
      modal.style.display = 'flex';
      return;
    }

    // Show selection interface
    content.innerHTML = `
      <div style="margin-bottom: 24px;">
        <h3 style="font-size: 18px; font-weight: 600; color: #fff; margin: 0 0 16px 0;">Select Backtests to Compare (2-4)</h3>
        <div id="backtestSelector" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px;">
          ${completedBacktests.map(bt => `
            <div
              data-bt-id="${bt.id}"
              onclick="window.toggleBacktestSelection('${bt.id}')"
              style="
                background: rgba(59, 130, 246, 0.05);
                border: 2px solid #3d4a5c;
                border-radius: 8px;
                padding: 12px;
                cursor: pointer;
                transition: all 0.2s;
              "
              onmouseover="this.style.borderColor='#3b82f6';"
              onmouseout="if (!this.classList.contains('selected')) this.style.borderColor='#3d4a5c';"
            >
              <div style="font-size: 16px; font-weight: 600; color: #fff; margin-bottom: 4px;">${bt.name}</div>
              <div style="font-size: 12px; color: #9ca3af;">${bt.start_date} to ${bt.end_date}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <button
        id="compareSelectedBtn"
        onclick="window.compareSelected()"
        style="
          width: 100%;
          padding: 14px 24px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border: none;
          border-radius: 8px;
          color: #fff;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          opacity: 0.5;
        "
        disabled
      >
        Compare Selected Backtests
      </button>

      <div id="comparisonResults" style="margin-top: 24px;"></div>
    `;

    modal.style.display = 'flex';
    selectedBacktests = [];
  };

  window.toggleBacktestSelection = function(btId) {
    const element = document.querySelector(`[data-bt-id="${btId}"]`);
    if (!element) return;

    const index = selectedBacktests.indexOf(btId);
    if (index > -1) {
      // Deselect
      selectedBacktests.splice(index, 1);
      element.classList.remove('selected');
      element.style.borderColor = '#3d4a5c';
      element.style.background = 'rgba(59, 130, 246, 0.05)';
    } else {
      // Select (max 4)
      if (selectedBacktests.length >= 4) {
        alert('You can compare up to 4 backtests at a time');
        return;
      }
      selectedBacktests.push(btId);
      element.classList.add('selected');
      element.style.borderColor = '#10b981';
      element.style.background = 'rgba(16, 185, 129, 0.2)';
    }

    // Update button state
    const compareBtn = document.getElementById('compareSelectedBtn');
    if (compareBtn) {
      if (selectedBacktests.length >= 2) {
        compareBtn.disabled = false;
        compareBtn.style.opacity = '1';
      } else {
        compareBtn.disabled = true;
        compareBtn.style.opacity = '0.5';
      }
    }
  };

  window.compareSelected = async function() {
    const resultsDiv = document.getElementById('comparisonResults');
    if (!resultsDiv) return;

    resultsDiv.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #666;">
        <div style="font-size: 48px; margin-bottom: 16px; animation: spin 1s linear infinite;">⏳</div>
        <div>Loading comparison data...</div>
      </div>
    `;

    try {
      // Load results for all selected backtests
      const comparisons = await Promise.all(
        selectedBacktests.map(async (btId) => {
          const bt = backtests.find(b => b.id === btId);
          const data = await apiCall(`/api/backtest/results?config_id=${btId}`);
          return { config: bt, results: data.results || {} };
        })
      );

      resultsDiv.innerHTML = renderComparison(comparisons);
    } catch (error) {
      resultsDiv.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #ef4444;">
          <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
          <div>Failed to load comparison data</div>
          <div style="font-size: 14px; margin-top: 8px; color: #9ca3af;">${error.message}</div>
        </div>
      `;
    }
  };

  function renderComparison(comparisons) {
    const metrics = ['total_return', 'sharpe_ratio', 'max_drawdown', 'win_rate', 'profit_factor', 'total_trades'];
    const metricNames = {
      'total_return': 'Total Return',
      'sharpe_ratio': 'Sharpe Ratio',
      'max_drawdown': 'Max Drawdown',
      'win_rate': 'Win Rate',
      'profit_factor': 'Profit Factor',
      'total_trades': 'Total Trades'
    };

    // Find best/worst for each metric
    const findBest = (metric) => {
      const values = comparisons.map(c => c.results[metric] || 0);
      if (metric === 'max_drawdown') {
        // Lower is better for drawdown
        return Math.min(...values);
      }
      return Math.max(...values);
    };

    const bestValues = {};
    metrics.forEach(m => {
      bestValues[m] = findBest(m);
    });

    // Generate strategic insights
    const insights = generateInsights(comparisons);

    return `
      <!-- Comparison Table -->
      <div style="background: rgba(59, 130, 246, 0.05); border: 2px solid #3b82f6; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <h3 style="font-size: 20px; font-weight: 700; color: #3b82f6; margin: 0 0 20px 0;">📊 Side-by-Side Comparison</h3>

        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; color: #e0e6ed; font-size: 14px;">
            <thead>
              <tr style="border-bottom: 2px solid #3b82f6;">
                <th style="padding: 12px; text-align: left; color: #9ca3af; font-weight: 600;">Metric</th>
                ${comparisons.map(c => `
                  <th style="padding: 12px; text-align: center; color: #fff; font-weight: 600;">${c.config.name}</th>
                `).join('')}
              </tr>
            </thead>
            <tbody>
              ${metrics.map(metric => `
                <tr style="border-bottom: 1px solid #2a2a2a;">
                  <td style="padding: 12px; color: #9ca3af;">${metricNames[metric]}</td>
                  ${comparisons.map(c => {
                    const value = c.results[metric] || 0;
                    const isBest = value === bestValues[metric];
                    const formattedValue = metric === 'total_return' || metric === 'max_drawdown' || metric === 'win_rate'
                      ? `${(value * 100).toFixed(2)}%`
                      : metric === 'sharpe_ratio' || metric === 'profit_factor'
                      ? value.toFixed(2)
                      : value;

                    const color = isBest ? '#10b981' : '#fff';
                    const arrow = isBest ? ' ⬆️' : '';

                    return `<td style="padding: 12px; text-align: center; color: ${color}; font-weight: ${isBest ? '700' : '400'};">${formattedValue}${arrow}</td>`;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Strategic Insights -->
      <div style="background: rgba(16, 185, 129, 0.05); border: 2px solid #10b981; border-radius: 12px; padding: 24px;">
        <h3 style="font-size: 20px; font-weight: 700; color: #10b981; margin: 0 0 20px 0;">💡 Strategic Insights</h3>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          ${insights.map(insight => `
            <div style="background: rgba(0, 0, 0, 0.3); border-left: 4px solid ${insight.type === 'positive' ? '#10b981' : insight.type === 'negative' ? '#ef4444' : '#3b82f6'}; border-radius: 4px; padding: 12px;">
              <div style="font-weight: 600; color: #fff; margin-bottom: 4px;">${insight.title}</div>
              <div style="color: #9ca3af; font-size: 14px;">${insight.message}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function generateInsights(comparisons) {
    const insights = [];

    // Find best performer
    const returns = comparisons.map(c => ({ name: c.config.name, value: c.results.total_return || 0 }));
    const bestReturn = returns.reduce((prev, curr) => curr.value > prev.value ? curr : prev);
    insights.push({
      type: 'positive',
      title: '🏆 Best Overall Return',
      message: `${bestReturn.name} achieved the highest return at ${(bestReturn.value * 100).toFixed(2)}%.`
    });

    // Check consistency (Sharpe ratio)
    const sharpes = comparisons.map(c => ({ name: c.config.name, value: c.results.sharpe_ratio || 0 }));
    const bestSharpe = sharpes.reduce((prev, curr) => curr.value > prev.value ? curr : prev);
    if (bestSharpe.value >= 1.5) {
      insights.push({
        type: 'positive',
        title: '📈 Excellent Risk-Adjusted Performance',
        message: `${bestSharpe.name} shows strong risk-adjusted returns with a Sharpe ratio of ${bestSharpe.value.toFixed(2)}.`
      });
    }

    // Check drawdowns
    const drawdowns = comparisons.map(c => ({ name: c.config.name, value: Math.abs(c.results.max_drawdown || 0) }));
    const worstDrawdown = drawdowns.reduce((prev, curr) => curr.value > prev.value ? curr : prev);
    if (worstDrawdown.value > 0.3) {
      insights.push({
        type: 'negative',
        title: '⚠️ High Drawdown Risk',
        message: `${worstDrawdown.name} experienced a significant drawdown of ${(worstDrawdown.value * 100).toFixed(2)}%. Consider risk management improvements.`
      });
    }

    // Check win rates
    const winRates = comparisons.map(c => ({ name: c.config.name, value: c.results.win_rate || 0 }));
    const bestWinRate = winRates.reduce((prev, curr) => curr.value > prev.value ? curr : prev);
    if (bestWinRate.value > 0.6) {
      insights.push({
        type: 'positive',
        title: '🎯 High Win Rate',
        message: `${bestWinRate.name} maintains a strong win rate of ${(bestWinRate.value * 100).toFixed(1)}%.`
      });
    }

    // Compare similarities
    const returnDiff = Math.max(...returns.map(r => r.value)) - Math.min(...returns.map(r => r.value));
    if (returnDiff < 0.05) {
      insights.push({
        type: 'neutral',
        title: '🔄 Similar Performance',
        message: 'These strategies show similar overall returns. Consider other factors like drawdown and Sharpe ratio for differentiation.'
      });
    }

    return insights;
  }

  // Event listeners
  const toggleModeBtn = document.getElementById('toggleModeBtn');
  if (toggleModeBtn) {
    toggleModeBtn.addEventListener('click', toggleMode);
  }

  const createBacktestBtn = document.getElementById('createBacktestBtn');
  if (createBacktestBtn) {
    createBacktestBtn.addEventListener('click', () => {
      const modal = document.getElementById('createModal');
      if (modal) {
        modal.style.display = 'flex';

        // Set default dates
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);

        const endInput = document.getElementById('backtestEndDate');
        const startInput = document.getElementById('backtestStartDate');
        if (endInput) endInput.valueAsDate = endDate;
        if (startInput) startInput.valueAsDate = startDate;
      }
    });
  }

  const compareBacktestsBtn = document.getElementById('compareBacktestsBtn');
  if (compareBacktestsBtn) {
    compareBacktestsBtn.addEventListener('click', () => {
      window.openComparisonTool();
    });
  }

  const deployStrategyBtn = document.getElementById('deployStrategyBtn');
  if (deployStrategyBtn) {
    deployStrategyBtn.addEventListener('click', () => {
      alert('🚀 Deploy Strategy Feature\n\nComing Soon!\n\nThis feature will allow you to automatically deploy your backtested strategy to live trading with proper risk controls and monitoring.');
    });
  }

  const closeBtn = document.getElementById('closeCreateModal');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      const modal = document.getElementById('createModal');
      if (modal) modal.style.display = 'none';
    });
  }

  // Close modal on background click
  const modal = document.getElementById('createModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target.id === 'createModal') {
        modal.style.display = 'none';
      }
    });
  }

  // Detail modal close handlers
  const closeDetailBtn = document.getElementById('closeDetailModal');
  if (closeDetailBtn) {
    closeDetailBtn.addEventListener('click', () => {
      const detailModal = document.getElementById('backtestDetailModal');
      if (detailModal) detailModal.style.display = 'none';
    });
  }

  const detailModal = document.getElementById('backtestDetailModal');
  if (detailModal) {
    detailModal.addEventListener('click', (e) => {
      if (e.target.id === 'backtestDetailModal') {
        detailModal.style.display = 'none';
      }
    });
  }

  // Comparison modal close handlers
  const closeComparisonBtn = document.getElementById('closeComparisonModal');
  if (closeComparisonBtn) {
    closeComparisonBtn.addEventListener('click', () => {
      const comparisonModal = document.getElementById('comparisonModal');
      if (comparisonModal) comparisonModal.style.display = 'none';
    });
  }

  const comparisonModal = document.getElementById('comparisonModal');
  if (comparisonModal) {
    comparisonModal.addEventListener('click', (e) => {
      if (e.target.id === 'comparisonModal') {
        comparisonModal.style.display = 'none';
      }
    });
  }

  // Form submit
  const form = document.getElementById('createForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const capital = parseFloat(document.getElementById('backtestCapital').value);
      if (capital < 5000) {
        alert('Minimum capital is $5,000');
        return;
      }

      try {
        const csrfToken = await getCSRFToken();
        if (!csrfToken) {
          alert('Failed to get CSRF token. Please refresh the page.');
          return;
        }
        const symbols = document.getElementById('backtestSymbols').value.split(',').map(s => s.trim());

        const config = {
          name: document.getElementById('backtestName').value,
          description: document.getElementById('backtestDescription').value,
          symbols: symbols,
          start_date: document.getElementById('backtestStartDate').value,
          end_date: document.getElementById('backtestEndDate').value,
          initial_capital: capital,
          strategy_name: document.getElementById('backtestStrategy').value,
          commission: parseFloat(document.getElementById('backtestCommission').value)
        };

        // Create backtest
        const createData = await apiCall('/api/backtest/create', {
          method: 'POST',
          headers: { 'X-CSRF-Token': csrfToken },
          body: JSON.stringify(config)
        });

        // Run backtest
        await apiCall('/api/backtest/run', {
          method: 'POST',
          body: JSON.stringify({ config_id: createData.config_id })
        });

        alert('Backtest started successfully!');
        modal.style.display = 'none';
        form.reset();

        // Reload backtests
        setTimeout(() => loadBacktests(), 1000);
      } catch (error) {
        alert(`Failed to create backtest: ${error.message}`);
      }
    });
  }

  // ========================================
  // IMPORT DATA TAB FUNCTIONALITY
  // ========================================

  // Tab switching
  function switchTab(tab) {
    currentTab = tab;

    // Update tab buttons
    const backtestsTab = document.getElementById('backtestsTab');
    const importDataTab = document.getElementById('importDataTab');
    const backtestsContent = document.getElementById('backtestsContent');
    const importDataContent = document.getElementById('importDataContent');

    if (tab === 'backtests') {
      backtestsTab.style.background = 'rgba(59, 130, 246, 0.2)';
      backtestsTab.style.borderColor = '#3b82f6';
      backtestsTab.style.color = '#3b82f6';
      importDataTab.style.background = 'transparent';
      importDataTab.style.borderColor = '#2a2a2a';
      importDataTab.style.color = '#9ca3af';
      backtestsContent.style.display = 'block';
      importDataContent.style.display = 'none';
    } else {
      importDataTab.style.background = 'rgba(59, 130, 246, 0.2)';
      importDataTab.style.borderColor = '#3b82f6';
      importDataTab.style.color = '#3b82f6';
      backtestsTab.style.background = 'transparent';
      backtestsTab.style.borderColor = '#2a2a2a';
      backtestsTab.style.color = '#9ca3af';
      backtestsContent.style.display = 'none';
      importDataContent.style.display = 'flex';

      // Load import status when switching to import tab
      loadImportStatus();
    }
  }

  // Load import status from API
  async function loadImportStatus() {
    try {
      const data = await apiCall('/api/import/status');
      importTickers = data.tickers || [];
      filteredTickers = importTickers;
      renderImportTickers();
      updateImportStats();
    } catch (error) {
      console.error('Failed to load import status:', error);
      const list = document.getElementById('tickerImportList');
      if (list) {
        list.innerHTML = `
          <div style="text-align: center; padding: 40px; color: #ef4444;">
            <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;">❌</div>
            <div>Failed to load import status</div>
            <div style="font-size: 14px; margin-top: 8px; color: #9ca3af;">${error.message}</div>
          </div>
        `;
      }
    }
  }

  // Render import tickers
  function renderImportTickers() {
    const list = document.getElementById('tickerImportList');
    if (!list) return;

    if (filteredTickers.length === 0) {
      list.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #666;">
          <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;">🔍</div>
          <div>No tickers found</div>
        </div>
      `;
      return;
    }

    list.innerHTML = filteredTickers.map(ticker => {
      const statusColor = ticker.status === 'complete' ? '#10b981' : ticker.status === 'partial' ? '#fb923c' : '#6b7280';
      const statusBg = ticker.status === 'complete' ? 'rgba(16, 185, 129, 0.1)' : ticker.status === 'partial' ? 'rgba(251, 146, 60, 0.1)' : 'rgba(107, 114, 128, 0.1)';
      const progress = ticker.total_days_expected > 0 ? (ticker.total_days_imported / ticker.total_days_expected) * 100 : 0;

      return `
        <div style="background: ${statusBg}; border: 2px solid ${statusColor}; border-radius: 8px; padding: 12px; margin-bottom: 8px; transition: all 0.2s;" onmouseover="this.style.transform='translateX(4px)';" onmouseout="this.style.transform='translateX(0)';">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div>
              <div style="font-size: 16px; font-weight: 700; color: #fff;">${ticker.ticker}</div>
              <div style="font-size: 12px; color: #9ca3af; margin-top: 2px;">
                ${ticker.total_days_imported} / ${ticker.total_days_expected} days
                ${ticker.missing_days > 0 ? `<span style="color: ${statusColor}; font-weight: 600;">(${ticker.missing_days} missing)</span>` : ''}
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="padding: 4px 12px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; background: ${statusBg}; color: ${statusColor}; border: 2px solid ${statusColor};">
                ${ticker.status}
              </div>
              ${ticker.missing_days > 0 ? `
                <button
                  onclick="window.importTicker('${ticker.ticker}')"
                  style="padding: 6px 12px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border: none; border-radius: 6px; color: #fff; font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap;"
                >
                  📥 Import
                </button>
              ` : ''}
            </div>
          </div>
          <!-- Progress Bar -->
          <div style="width: 100%; height: 6px; background: #2a2a2a; border-radius: 3px; overflow: hidden;">
            <div style="height: 100%; width: ${progress}%; background: ${statusColor}; transition: width 0.3s;"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Update import stats
  function updateImportStats() {
    const complete = importTickers.filter(t => t.status === 'complete').length;
    const partial = importTickers.filter(t => t.status === 'partial').length;
    const pending = importTickers.filter(t => t.status === 'pending').length;

    document.getElementById('completeCount').textContent = complete;
    document.getElementById('partialCount').textContent = partial;
    document.getElementById('pendingCount').textContent = pending;
  }

  // Update all missing tickers
  async function updateAllMissing() {
    const missingCount = importTickers.filter(t => t.missing_days > 0).length;

    if (missingCount === 0) {
      alert('All tickers are up to date!');
      return;
    }

    if (!confirm(`Start import for ${missingCount} tickers with missing data?\n\nThis will take a significant amount of time.\n\nEstimated time: ${Math.ceil(missingCount * 2)} - ${Math.ceil(missingCount * 5)} minutes`)) {
      return;
    }

    try {
      const csrfToken = await getCSRFToken();
      if (!csrfToken) {
        alert('Failed to get CSRF token. Please refresh the page.');
        return;
      }
      const data = await apiCall('/api/import/update-all', {
        method: 'POST',
        headers: { 'X-CSRF-Token': csrfToken }
      });

      alert(`Update started for ${missingCount} tickers!\n\nProgress will be shown via notifications.`);

      // Refresh status periodically
      const refreshInterval = setInterval(() => {
        loadImportStatus();
      }, 10000); // Every 10 seconds

      // Stop refreshing after 30 minutes
      setTimeout(() => clearInterval(refreshInterval), 30 * 60 * 1000);
    } catch (error) {
      alert(`Failed to start update: ${error.message}`);
    }
  }

  // Search/filter tickers
  function filterTickers(searchTerm) {
    const term = searchTerm.toLowerCase();
    filteredTickers = importTickers.filter(t =>
      t.ticker.toLowerCase().includes(term)
    );
    renderImportTickers();
  }

  // Tab event listeners
  const backtestsTabBtn = document.getElementById('backtestsTab');
  if (backtestsTabBtn) {
    backtestsTabBtn.addEventListener('click', () => switchTab('backtests'));
  }

  const importDataTabBtn = document.getElementById('importDataTab');
  if (importDataTabBtn) {
    importDataTabBtn.addEventListener('click', () => switchTab('import'));
  }

  // Update All button
  const updateAllBtn = document.getElementById('updateAllBtn');
  if (updateAllBtn) {
    updateAllBtn.addEventListener('click', updateAllMissing);
  }

  // Search input
  const searchInput = document.getElementById('tickerSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => filterTickers(e.target.value));
  }

  // Initialize
  loadMode(); // This will load backtests if in backtest mode

  // Poll for updates only when in backtest mode
  const pollInterval = setInterval(() => {
    if (currentMode === 'backtest') {
      loadBacktests();
    }
  }, 5000);

  // Cleanup on view change
  window.addEventListener('beforeunload', () => {
    clearInterval(pollInterval);
  });
}

export function updateLive() {
  // Called on live updates - can refresh backtest list if needed
}
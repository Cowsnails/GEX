// public/views/my-trades.js - My Trades View with Advanced Filtering & Metrics

export function render() {
  return `
    <div id="my-trades-container" style="display: flex; height: calc(100vh - 140px); gap: 16px; padding: 16px; background: #0a0a0a;">

      <!-- LEFT PANEL: Current Trades (Top) + Metrics (Bottom) -->
      <div style="width: 400px; display: flex; flex-direction: column; gap: 16px;">

        <!-- CURRENT TRADES (TOP LEFT) -->
        <div style="flex: 1; background: #1a1a1a; border-radius: 12px; border: 1px solid #2a2a2a; padding: 16px; overflow-y: auto;">
          <h3 style="margin: 0 0 16px 0; color: #fff; font-size: 18px; font-weight: 600;">
            Current Trades
            <span id="current-trades-count" style="color: #666; font-size: 14px; font-weight: 400;"></span>
          </h3>
          <div id="current-trades-list" style="display: flex; flex-direction: column; gap: 12px;">
            <div style="text-align: center; color: #666; padding: 40px 20px;">
              Loading...
            </div>
          </div>
        </div>

        <!-- METRICS (BOTTOM LEFT) -->
        <div style="flex: 1; background: #1a1a1a; border-radius: 12px; border: 1px solid #2a2a2a; padding: 16px; overflow-y: auto;">
          <h3 style="margin: 0 0 8px 0; color: #fff; font-size: 18px; font-weight: 600;">
            Performance Metrics
            <span id="metrics-filter-label" style="color: #666; font-size: 14px; font-weight: 400;"></span>
          </h3>

          <!-- Trading Mode Filter -->
          <div style="display: flex; gap: 6px; margin-bottom: 12px;">
            <button id="metrics-filter-all" class="metrics-account-filter" data-account="all" style="flex: 1; padding: 6px 12px; background: #3b82f6; border: none; border-radius: 6px; color: #fff; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s;">All Trades</button>
            <button id="metrics-filter-default" class="metrics-account-filter" data-account="default" style="flex: 1; padding: 6px 12px; background: #2a2a2a; border: 1px solid #3d4a5c; border-radius: 6px; color: #9ca3af; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s;">Default📝</button>
            <button id="metrics-filter-paper" class="metrics-account-filter" data-account="paper" style="flex: 1; padding: 6px 12px; background: #2a2a2a; border: 1px solid #3d4a5c; border-radius: 6px; color: #9ca3af; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s;">Paper📄</button>
            <button id="metrics-filter-live" class="metrics-account-filter" data-account="live" style="flex: 1; padding: 6px 12px; background: #2a2a2a; border: 1px solid #3d4a5c; border-radius: 6px; color: #9ca3af; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s;">Live🔴</button>
          </div>

          <div id="metrics-content" style="display: flex; flex-direction: column; gap: 12px;">
            <div style="text-align: center; color: #666; padding: 40px 20px;">
              Loading...
            </div>
          </div>
        </div>

      </div>

      <!-- RIGHT PANEL: Historical Trades -->
      <div style="flex: 1; background: #1a1a1a; border-radius: 12px; border: 1px solid #2a2a2a; padding: 16px; display: flex; flex-direction: column;">

        <!-- HEADER & FILTERS -->
        <div style="margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h3 style="margin: 0; color: #fff; font-size: 18px; font-weight: 600;">
              Trade History
              <span id="history-count" style="color: #666; font-size: 14px; font-weight: 400;"></span>
            </h3>
            <div style="display: flex; gap: 8px;">
              <button id="delete-all-default-btn" style="padding: 8px 16px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border: none; border-radius: 6px; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                🗑️ Delete All Default Trades
              </button>
              <button id="delete-all-paper-btn" style="padding: 8px 16px; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); border: none; border-radius: 6px; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                🗑️ Delete All Paper Trades
              </button>
              <button id="bulk-share-btn" style="padding: 8px 16px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border: none; border-radius: 6px; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                📤 Share Trades
              </button>
            </div>
          </div>

          <!-- FILTER ROW -->
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">

            <!-- Status Filter -->
            <select id="filter-status" style="padding: 6px 12px; background: #2a2a2a; border: 1px solid #3a3a3a; border-radius: 6px; color: #fff; font-size: 13px; cursor: pointer;">
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
            </select>

            <!-- Type Filter -->
            <select id="filter-right" style="padding: 6px 12px; background: #2a2a2a; border: 1px solid #3a3a3a; border-radius: 6px; color: #fff; font-size: 13px; cursor: pointer;">
              <option value="">Calls & Puts</option>
              <option value="C">Calls Only</option>
              <option value="P">Puts Only</option>
            </select>

            <!-- Outcome Filter -->
            <select id="filter-outcome" style="padding: 6px 12px; background: #2a2a2a; border: 1px solid #3a3a3a; border-radius: 6px; color: #fff; font-size: 13px; cursor: pointer;">
              <option value="">All Outcomes</option>
              <option value="WIN">Wins Only</option>
              <option value="LOSS">Losses Only</option>
              <option value="NA">N/A Only</option>
            </select>

            <!-- Source Filter -->
            <select id="filter-source" style="padding: 6px 12px; background: #2a2a2a; border: 1px solid #3a3a3a; border-radius: 6px; color: #fff; font-size: 13px; cursor: pointer;">
              <option value="">All Sources</option>
              <option value="manual">Manual Entries</option>
              <option value="ocr">OCR Signals</option>
            </select>

            <!-- Trader Filter -->
            <select id="filter-trader" style="padding: 6px 12px; background: #2a2a2a; border: 1px solid #3a3a3a; border-radius: 6px; color: #fff; font-size: 13px; cursor: pointer;">
              <option value="">All Traders</option>
              <option value="elite">Elite</option>
              <option value="combo">Combo</option>
              <option value="manual">Manual</option>
            </select>

            <!-- Sort -->
            <select id="filter-sort" style="padding: 6px 12px; background: #2a2a2a; border: 1px solid #3a3a3a; border-radius: 6px; color: #fff; font-size: 13px; cursor: pointer;">
              <option value="recent">Most Recent</option>
              <option value="pnl-high">Highest P&L</option>
              <option value="pnl-low">Lowest P&L</option>
              <option value="duration">Longest Duration</option>
            </select>

            <!-- Clear Filters -->
            <button id="clear-filters" style="padding: 6px 12px; background: #3a3a3a; border: 1px solid #4a4a4a; border-radius: 6px; color: #fff; font-size: 13px; cursor: pointer; transition: all 0.2s;">
              Clear Filters
            </button>

            <!-- Remove All N/A Button (only shows when N/A filter is active) -->
            <button id="remove-all-na-btn" style="display: none; padding: 6px 12px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border: none; border-radius: 6px; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
              🗑️ Remove All N/A
            </button>

          </div>
        </div>

        <!-- TRADE LIST -->
        <div id="trade-history-list" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px;">
          <div style="text-align: center; color: #666; padding: 40px 20px;">
            Loading...
          </div>
        </div>

      </div>

    </div>

    <!-- BULK SHARE MODAL -->
    <div id="bulk-share-modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 1000; align-items: center; justify-content: center;">
      <div style="background: #1a1a1a; border: 2px solid #3d4a5c; border-radius: 16px; width: 90%; max-width: 800px; max-height: 80vh; overflow: hidden; display: flex; flex-direction: column;">

        <!-- MODAL HEADER -->
        <div style="padding: 20px; border-bottom: 1px solid #2a2a2a; display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin: 0; color: #fff; font-size: 20px; font-weight: 600;">📤 Share Trades to Global Feed</h3>
          <button id="close-bulk-share" style="background: transparent; border: none; color: #666; font-size: 24px; cursor: pointer; padding: 0; width: 32px; height: 32px;">✖</button>
        </div>

        <!-- MODAL FILTERS -->
        <div style="padding: 16px; border-bottom: 1px solid #2a2a2a; display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
          <button id="bulk-select-all" style="padding: 6px 12px; background: #10b981; border: none; border-radius: 6px; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer;">
            ✓ Select All
          </button>
          <button id="bulk-select-calls" style="padding: 6px 12px; background: #2a2a2a; border: 1px solid #3a3a3a; border-radius: 6px; color: #fff; font-size: 13px; cursor: pointer;">
            Select All Calls
          </button>
          <button id="bulk-select-puts" style="padding: 6px 12px; background: #2a2a2a; border: 1px solid #3a3a3a; border-radius: 6px; color: #fff; font-size: 13px; cursor: pointer;">
            Select All Puts
          </button>
          <button id="bulk-select-wins" style="padding: 6px 12px; background: #2a2a2a; border: 1px solid #3a3a3a; border-radius: 6px; color: #fff; font-size: 13px; cursor: pointer;">
            Select All Wins
          </button>
          <button id="bulk-select-losses" style="padding: 6px 12px; background: #2a2a2a; border: 1px solid #3a3a3a; border-radius: 6px; color: #fff; font-size: 13px; cursor: pointer;">
            Select All Losses
          </button>
          <button id="bulk-deselect-all" style="padding: 6px 12px; background: #ef4444; border: none; border-radius: 6px; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; margin-left: auto;">
            ✖ Deselect All
          </button>
        </div>

        <!-- MODAL CONTENT - Trade List -->
        <div id="bulk-share-list" style="flex: 1; overflow-y: auto; padding: 16px;">
          <div style="text-align: center; color: #666; padding: 40px 20px;">Loading trades...</div>
        </div>

        <!-- MODAL FOOTER -->
        <div style="padding: 16px; border-top: 1px solid #2a2a2a; display: flex; gap: 12px; justify-content: space-between; align-items: center;">
          <div style="color: #666; font-size: 13px;">
            <span id="bulk-selected-count" style="color: #3b82f6; font-weight: 600;">0</span> trades selected
          </div>
          <div style="display: flex; gap: 12px;">
            <button id="bulk-share-cancel" style="padding: 10px 24px; background: transparent; border: 1px solid #3d4a5c; border-radius: 8px; color: #9ca3af; font-size: 14px; font-weight: 600; cursor: pointer;">
              Cancel
            </button>
            <button id="bulk-share-finish" style="padding: 10px 24px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border: none; border-radius: 8px; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer;">
              Share Selected Trades
            </button>
          </div>
        </div>

      </div>
    </div>
  `;
}

let currentFilters = {
  status: '',
  right: '',
  outcome: '',
  source: '',
  trader: '',
  sort: 'recent',
  tradingMode: 'all'  // For performance metrics: all, paper, live
};

export async function initMyTradesView() {
  console.log('🎯 Initializing My Trades View');

  // Ensure exit modal functions are available by importing trader-signals-unified.js
  if (!window.showExitModal) {
    try {
      await import('/public/views/trader-signals-unified.js');
      console.log('✅ Exit modal functions loaded from trader-signals-unified.js');
    } catch (error) {
      console.error('❌ Failed to load exit modal functions:', error);
    }
  }

  // Attach filter event listeners
  document.getElementById('filter-status')?.addEventListener('change', handleFilterChange);
  document.getElementById('filter-right')?.addEventListener('change', handleFilterChange);
  document.getElementById('filter-outcome')?.addEventListener('change', handleFilterChange);
  document.getElementById('filter-source')?.addEventListener('change', handleFilterChange);
  document.getElementById('filter-trader')?.addEventListener('change', handleFilterChange);
  document.getElementById('filter-sort')?.addEventListener('change', handleFilterChange);
  document.getElementById('clear-filters')?.addEventListener('click', clearFilters);

  // Attach N/A trade removal event listeners
  document.getElementById('remove-all-na-btn')?.addEventListener('click', removeAllNATrades);

  // Attach delete all default trades event listener
  document.getElementById('delete-all-default-btn')?.addEventListener('click', deleteAllDefaultTrades);

  // Attach delete all paper trades event listener
  document.getElementById('delete-all-paper-btn')?.addEventListener('click', deleteAllPaperTrades);

  // Attach bulk share modal event listeners
  document.getElementById('bulk-share-btn')?.addEventListener('click', openBulkShareModal);
  document.getElementById('close-bulk-share')?.addEventListener('click', closeBulkShareModal);
  document.getElementById('bulk-share-cancel')?.addEventListener('click', closeBulkShareModal);
  document.getElementById('bulk-share-finish')?.addEventListener('click', bulkShareTrades);
  document.getElementById('bulk-select-all')?.addEventListener('click', () => bulkSelectBy('all'));
  document.getElementById('bulk-select-calls')?.addEventListener('click', () => bulkSelectBy('calls'));
  document.getElementById('bulk-select-puts')?.addEventListener('click', () => bulkSelectBy('puts'));
  document.getElementById('bulk-select-wins')?.addEventListener('click', () => bulkSelectBy('wins'));
  document.getElementById('bulk-select-losses')?.addEventListener('click', () => bulkSelectBy('losses'));
  document.getElementById('bulk-deselect-all')?.addEventListener('click', () => bulkSelectBy('none'));

  // Attach metrics account type filter event listeners
  document.querySelectorAll('.metrics-account-filter').forEach(btn => {
    btn.addEventListener('click', () => handleMetricsAccountFilter(btn.dataset.account));
  });

  // Load data
  await refreshData();

  // Auto-refresh every 30 seconds
  setInterval(refreshData, 30000);
}

function handleFilterChange(e) {
  const filterId = e.target.id.replace('filter-', '');
  currentFilters[filterId] = e.target.value;

  // Show/hide Remove All N/A button based on outcome filter
  const removeAllBtn = document.getElementById('remove-all-na-btn');
  if (removeAllBtn) {
    removeAllBtn.style.display = currentFilters.outcome === 'NA' ? 'block' : 'none';
  }

  refreshData();
}

function clearFilters() {
  currentFilters = {
    status: '',
    right: '',
    outcome: '',
    source: '',
    trader: '',
    sort: 'recent',
    tradingMode: 'all'
  };

  document.getElementById('filter-status').value = '';
  document.getElementById('filter-right').value = '';
  document.getElementById('filter-outcome').value = '';
  document.getElementById('filter-source').value = '';
  document.getElementById('filter-trader').value = '';
  document.getElementById('filter-sort').value = 'recent';

  // Reset metrics trading mode filter buttons
  document.querySelectorAll('.metrics-account-filter').forEach(btn => {
    if (btn.dataset.account === 'all') {
      btn.style.background = '#3b82f6';
      btn.style.color = '#fff';
      btn.style.border = 'none';
    } else {
      btn.style.background = '#2a2a2a';
      btn.style.color = '#9ca3af';
      btn.style.border = '1px solid #3d4a5c';
    }
  });

  refreshData();
}

function handleMetricsAccountFilter(tradingMode) {
  currentFilters.tradingMode = tradingMode;

  // Update button styles
  document.querySelectorAll('.metrics-account-filter').forEach(btn => {
    if (btn.dataset.account === tradingMode) {
      btn.style.background = '#3b82f6';
      btn.style.color = '#fff';
      btn.style.border = 'none';
    } else {
      btn.style.background = '#2a2a2a';
      btn.style.color = '#9ca3af';
      btn.style.border = '1px solid #3d4a5c';
    }
  });

  // Reload metrics only (not history)
  loadMetrics();
}

async function refreshData() {
  await Promise.all([
    loadCurrentTrades(),
    loadTradeHistory(),
    loadMetrics()
  ]);
}

async function loadCurrentTrades() {
  try {
    const response = await fetch('/api/my-trades/current', {
      credentials: 'include'
    });
    const data = await response.json();

    const container = document.getElementById('current-trades-list');
    const countEl = document.getElementById('current-trades-count');

    // Check if elements exist (user may have switched views)
    if (!container || !countEl) return;

    if (!data.success || !data.trades) {
      container.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">No active trades</div>';
      countEl.textContent = '(0)';
      return;
    }

    // Filter to only show trades with active positions
    const activeTrades = data.trades.filter(t => t.hasPosition);

    if (activeTrades.length === 0) {
      container.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">No active trades</div>';
      countEl.textContent = '(0)';
      return;
    }

    countEl.textContent = `(${activeTrades.length})`;

    container.innerHTML = activeTrades.map(trade => {
      // Generate account badge
      let accountBadge = '';
      if (trade.accountType) {
        const accountType = trade.accountType.toUpperCase();
        const accountEmoji = accountType === 'PAPER' ? '📄' : accountType === 'LIVE' ? '💵' : '⚪';
        const accountColor = accountType === 'PAPER' ? '#3b82f6' : accountType === 'LIVE' ? '#10b981' : '#6b7280';
        accountBadge = `<span style="background: ${accountColor}; color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-left: 6px;">${accountEmoji} ${accountType}</span>`;
      }

      return `
      <div style="background: #2a2a2a; border-radius: 8px; padding: 12px; border-left: 3px solid ${trade.right === 'C' ? '#10b981' : '#ef4444'};">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
          <div>
            <div style="color: #fff; font-weight: 600; font-size: 15px;">
              ${trade.root} $${trade.strike}${trade.right}
              ${accountBadge}
            </div>
            <div style="color: #888; font-size: 12px;">
              ${formatExpiration(trade.expiration)}
            </div>
          </div>
          <div style="text-align: right;">
            <div style="color: #10b981; font-weight: 600; font-size: 14px;">
              $${trade.entryPrice?.toFixed(2) || 'N/A'}
            </div>
            <div style="color: #10b981; font-size: 11px;">
              ${formatExactTime(trade.receivedAt)}
            </div>
          </div>
        </div>
        <div style="display: flex; gap: 6px; margin-top: 8px;">
          <button class="exit-current-trade-btn" data-signal-id="${trade.id || trade.signalId || trade.positionId}" style="flex: 1; padding: 6px; background: #ef4444; border: none; border-radius: 4px; color: #fff; font-size: 12px; cursor: pointer;">
            Close
          </button>
        </div>
      </div>
    `;
    }).join('');

    // Attach event listeners to exit buttons
    setTimeout(() => {
      document.querySelectorAll('.exit-current-trade-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          exitTrade(btn.dataset.signalId);
        });
      });
    }, 0);
  } catch (error) {
    console.error('Error loading current trades:', error);
  }
}

async function loadTradeHistory() {
  try {
    const params = new URLSearchParams();
    if (currentFilters.status) params.append('status', currentFilters.status);
    if (currentFilters.right) params.append('right', currentFilters.right);
    if (currentFilters.outcome) params.append('outcome', currentFilters.outcome);
    if (currentFilters.source) params.append('source', currentFilters.source);
    if (currentFilters.trader) params.append('trader', currentFilters.trader);

    const response = await fetch(`/api/my-trades/history?${params.toString()}`);
    const data = await response.json();

    const container = document.getElementById('trade-history-list');
    const countEl = document.getElementById('history-count');

    // Check if elements exist (user may have switched views)
    if (!container || !countEl) return;

    if (!data.success || !data.trades || data.trades.length === 0) {
      container.innerHTML = '<div style="text-align: center; color: #666; padding: 40px 20px;">No trades found</div>';
      countEl.textContent = '(0)';
      return;
    }

    // Apply sorting
    let trades = [...data.trades];
    if (currentFilters.sort === 'pnl-high') {
      trades.sort((a, b) => (b.pnlPercent || 0) - (a.pnlPercent || 0));
    } else if (currentFilters.sort === 'pnl-low') {
      trades.sort((a, b) => (a.pnlPercent || 0) - (b.pnlPercent || 0));
    } else if (currentFilters.sort === 'duration') {
      trades.sort((a, b) => (b.duration || 0) - (a.duration || 0));
    }

    countEl.textContent = `(${trades.length})`;

    // DEBUG: Log trade data to see isPublic status
    console.log('📊 Loaded trade history:', trades.map(t => ({
      signalId: t.signalId,
      isManual: t.isManual,
      isPublic: t.isPublic,
      status: t.status,
      root: t.root
    })));

    container.innerHTML = trades.map(trade => {
      const pnl = trade.pnlPercent || 0;
      const isWin = pnl > 0;
      const isActive = trade.status === 'active';
      const isNA = !trade.entryPrice || !trade.exitPrice || (trade.entryPrice === 'N/A' || trade.exitPrice === 'N/A');

      // DEBUG: Log each trade to see if share button should show
      const shouldShowShareBtn = trade.isManual && !trade.isPublic && trade.status === 'closed';
      console.log(`🔍 ${trade.root} ${trade.signalId}: isManual=${trade.isManual}, isPublic=${trade.isPublic}, status=${trade.status}, showShareBtn=${shouldShowShareBtn}`);

      // Generate account badge
      let accountBadge = '';
      if (trade.accountType) {
        const accountType = trade.accountType.toUpperCase();
        const accountEmoji = accountType === 'PAPER' ? '📄' : accountType === 'LIVE' ? '💵' : '⚪';
        const accountColor = accountType === 'PAPER' ? '#3b82f6' : accountType === 'LIVE' ? '#10b981' : '#6b7280';
        accountBadge = `<span style="background: ${accountColor}; color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-left: 6px;">${accountEmoji} ${accountType}</span>`;
      }

      return `
        <div style="background: #2a2a2a; border-radius: 8px; padding: 12px; border-left: 3px solid ${isActive ? '#fbbf24' : isWin ? '#10b981' : '#ef4444'}; position: relative;">
          ${isNA ? `
            <button class="remove-na-trade-btn" data-signal-id="${trade.signalId}" style="position: absolute; top: 8px; right: 8px; background: #ef4444; border: none; border-radius: 4px; color: #fff; width: 24px; height: 24px; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">
              ✕
            </button>
          ` : ''}

          <div style="display: flex; justify-content: space-between; align-items: center;">

            <!-- LEFT: Symbol & Details -->
            <div style="flex: 1;">
              <div style="color: #fff; font-weight: 600; font-size: 14px; margin-bottom: 4px;">
                ${trade.root} $${trade.strike}${trade.right}
                ${trade.isManual ? '<span style="background: #6366f1; color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-left: 6px;">MANUAL</span>' : ''}
                ${accountBadge}
                ${trade.isPublic ? '<span style="background: #10b981; color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-left: 6px;">PUBLIC</span>' : ''}
                ${isNA ? '<span style="background: #888; color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-left: 6px;">N/A</span>' : ''}
              </div>
              <div style="color: #888; font-size: 11px;">
                ${formatExpiration(trade.expiration)} • ${formatTime(trade.receivedAt)}
              </div>
            </div>

            <!-- MIDDLE: Entry/Exit Times & Prices -->
            <div style="text-align: center; padding: 0 16px; min-width: 200px;">
              <div style="color: #888; font-size: 11px; margin-bottom: 4px;">Entry → Exit</div>
              <div style="color: #10b981; font-size: 12px; margin-bottom: 2px;">
                ${formatExactTime(trade.receivedAt)} → ${formatExactTime(trade.exitTime)}
              </div>
              <div style="color: #888; font-size: 11px;">
                $${trade.entryPrice?.toFixed(2) || 'N/A'} → $${trade.exitPrice?.toFixed(2) || 'N/A'}
              </div>
            </div>

            <!-- RIGHT: P&L -->
            <div style="text-align: right; min-width: 100px;">
              ${isActive ? `
                <div style="color: #fbbf24; font-weight: 600; font-size: 14px;">ACTIVE</div>
              ` : `
                <div style="color: ${isWin ? '#10b981' : '#ef4444'}; font-weight: 600; font-size: 16px;">
                  ${pnl > 0 ? '+' : ''}${pnl.toFixed(1)}%
                </div>
                ${trade.pnlDollars != null ? `
                  <div style="color: ${isWin ? '#10b981' : '#ef4444'}; font-size: 12px; font-weight: 500;">
                    ${trade.pnlDollars > 0 ? '+' : ''}$${trade.pnlDollars.toFixed(2)}
                  </div>
                ` : ''}
                <div style="color: #666; font-size: 11px;">
                  ${formatDuration(trade.duration)}
                </div>
              `}
            </div>

          </div>

          ${trade.isManual && !trade.isPublic && trade.status === 'closed' ? `
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #3a3a3a;">
              <button class="share-history-trade-btn" data-signal-id="${trade.signalId}" style="width: 100%; padding: 6px; background: #3b82f6; border: none; border-radius: 4px; color: #fff; font-size: 12px; cursor: pointer;">
                Share to Global Trades
              </button>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    // Attach event listeners to buttons
    setTimeout(() => {
      document.querySelectorAll('.remove-na-trade-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const signalId = btn.getAttribute('data-signal-id');
          if (confirm('Remove this N/A trade from history?')) {
            await removeNATrade(signalId);
          }
        });
      });

      document.querySelectorAll('.share-history-trade-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          shareTradePublic(btn.dataset.signalId);
        });
      });
    }, 0);
  } catch (error) {
    console.error('Error loading trade history:', error);
  }
}

async function loadMetrics() {
  try {
    const params = new URLSearchParams();
    if (currentFilters.right) params.append('right', currentFilters.right);
    if (currentFilters.trader) params.append('trader', currentFilters.trader);
    if (currentFilters.tradingMode && currentFilters.tradingMode !== 'all') {
      params.append('tradingMode', currentFilters.tradingMode);
    }

    const response = await fetch(`/api/my-trades/metrics?${params.toString()}`);
    const data = await response.json();

    const container = document.getElementById('metrics-content');
    const labelEl = document.getElementById('metrics-filter-label');

    // Check if elements exist (user may have switched views)
    if (!container || !labelEl) return;

    if (!data.success) {
      container.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">Error loading metrics</div>';
      return;
    }

    const m = data.metrics;

    // Update label
    let filterDesc = '';
    if (currentFilters.right === 'C') filterDesc = '(Calls)';
    else if (currentFilters.right === 'P') filterDesc = '(Puts)';
    else if (currentFilters.trader) filterDesc = `(${currentFilters.trader})`;
    else filterDesc = '(All Trades)';
    labelEl.textContent = filterDesc;

    container.innerHTML = `
      <!-- Win Rate -->
      <div style="background: #2a2a2a; border-radius: 8px; padding: 12px;">
        <div style="color: #888; font-size: 11px; margin-bottom: 4px;">WIN RATE</div>
        <div style="color: #fff; font-size: 24px; font-weight: 700;">${m.winRate}%</div>
        <div style="color: #666; font-size: 11px; margin-top: 4px;">${m.totalTrades} total trades</div>
      </div>

      <!-- Sharpe Ratio -->
      <div style="background: #2a2a2a; border-radius: 8px; padding: 12px;">
        <div style="color: #888; font-size: 11px; margin-bottom: 4px;">SHARPE RATIO</div>
        <div style="color: ${m.sharpeRatio > 1 ? '#10b981' : m.sharpeRatio > 0 ? '#fbbf24' : '#ef4444'}; font-size: 24px; font-weight: 700;">
          ${m.sharpeRatio}
        </div>
        <div style="color: #666; font-size: 11px; margin-top: 4px;">Risk-adjusted returns</div>
      </div>

      <!-- Sortino Ratio -->
      <div style="background: #2a2a2a; border-radius: 8px; padding: 12px;">
        <div style="color: #888; font-size: 11px; margin-bottom: 4px;">SORTINO RATIO</div>
        <div style="color: ${m.sortinoRatio > 1 ? '#10b981' : m.sortinoRatio > 0 ? '#fbbf24' : '#ef4444'}; font-size: 24px; font-weight: 700;">
          ${m.sortinoRatio}
        </div>
        <div style="color: #666; font-size: 11px; margin-top: 4px;">Downside risk-adjusted</div>
      </div>

      <!-- Profit Factor -->
      <div style="background: #2a2a2a; border-radius: 8px; padding: 12px;">
        <div style="color: #888; font-size: 11px; margin-bottom: 4px;">PROFIT FACTOR</div>
        <div style="color: ${m.profitFactor > 2 ? '#10b981' : m.profitFactor > 1 ? '#fbbf24' : '#ef4444'}; font-size: 24px; font-weight: 700;">
          ${m.profitFactor === Infinity ? '∞' : m.profitFactor}
        </div>
        <div style="color: #666; font-size: 11px; margin-top: 4px;">Total wins / losses</div>
      </div>

      <!-- Expectancy -->
      <div style="background: #2a2a2a; border-radius: 8px; padding: 12px;">
        <div style="color: #888; font-size: 11px; margin-bottom: 4px;">EXPECTANCY</div>
        <div style="color: ${parseFloat(m.expectancy) > 0 ? '#10b981' : '#ef4444'}; font-size: 24px; font-weight: 700;">
          ${parseFloat(m.expectancy) > 0 ? '+' : ''}${m.expectancy}%
        </div>
        <div style="color: #666; font-size: 11px; margin-top: 4px;">Expected per trade</div>
      </div>

      <!-- Avg Win/Loss -->
      <div style="background: #2a2a2a; border-radius: 8px; padding: 12px;">
        <div style="color: #888; font-size: 11px; margin-bottom: 4px;">AVG WIN / LOSS</div>
        <div style="display: flex; gap: 8px; align-items: baseline;">
          <span style="color: #10b981; font-size: 18px; font-weight: 600;">+${m.avgWin}%</span>
          <span style="color: #666;">/</span>
          <span style="color: #ef4444; font-size: 18px; font-weight: 600;">${m.avgLoss}%</span>
        </div>
      </div>

      <!-- Largest Win/Loss -->
      <div style="background: #2a2a2a; border-radius: 8px; padding: 12px;">
        <div style="color: #888; font-size: 11px; margin-bottom: 4px;">LARGEST WIN / LOSS</div>
        <div style="display: flex; gap: 8px; align-items: baseline;">
          <span style="color: #10b981; font-size: 18px; font-weight: 600;">+${m.largestWin}%</span>
          <span style="color: #666;">/</span>
          <span style="color: #ef4444; font-size: 18px; font-weight: 600;">${m.largestLoss}%</span>
        </div>
      </div>

      <!-- Consecutive Streaks -->
      <div style="background: #2a2a2a; border-radius: 8px; padding: 12px;">
        <div style="color: #888; font-size: 11px; margin-bottom: 4px;">MAX STREAK (W/L)</div>
        <div style="display: flex; gap: 8px; align-items: baseline;">
          <span style="color: #10b981; font-size: 18px; font-weight: 600;">${m.maxConsecutiveWins}W</span>
          <span style="color: #666;">/</span>
          <span style="color: #ef4444; font-size: 18px; font-weight: 600;">${m.maxConsecutiveLosses}L</span>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Error loading metrics:', error);
  }
}

// Helper functions
function formatExpiration(exp) {
  if (!exp) return 'N/A';
  const year = exp.substring(0, 4);
  const month = exp.substring(4, 6);
  const day = exp.substring(6, 8);
  return `${month}/${day}/${year.substring(2)}`;
}

function formatTime(timestamp) {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  const minutes = Math.floor(diff / (1000 * 60));
  return `${minutes}m ago`;
}

function formatExactTime(timestamp) {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp);
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes}:${seconds} ${ampm}`;
}

function formatDuration(seconds) {
  if (!seconds) return 'N/A';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// Global functions for buttons
window.shareTradePublic = async function(signalId) {
  try {
    // Get CSRF token first
    const verifyResp = await fetch('/api/auth/verify', { credentials: 'include' });
    const verifyData = await verifyResp.json();

    if (!verifyData.valid || !verifyData.csrfToken) {
      alert('❌ Session expired. Please refresh the page.');
      return;
    }

    const response = await fetch('/api/my-trades/share', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': verifyData.csrfToken
      },
      body: JSON.stringify({ signalId, isPublic: true })
    });

    const data = await response.json();
    if (data.success) {
      alert('✅ Trade shared to Global Trades!');
      refreshData();
    } else {
      alert('❌ Error sharing trade: ' + data.error);
    }
  } catch (error) {
    console.error('Error sharing trade:', error);
    alert('❌ Error sharing trade');
  }
};

window.exitTrade = async function(signalId) {
  try {
    console.log(`🔍 EXIT TRADE: Looking for signal ID: ${signalId}`);

    // Fetch the current trade data
    const response = await fetch('/api/my-trades/current', {
      credentials: 'include'
    });
    const data = await response.json();

    if (!data.success || !data.trades) {
      alert('❌ Failed to load trade data');
      console.error('Failed to load trade data:', data);
      return;
    }

    console.log(`📊 Found ${data.trades.length} current trades`);
    console.log('Trade IDs:', data.trades.map(t => ({ id: t.id, signalId: t.signalId, positionId: t.positionId })));

    // Find the specific trade - check BOTH signalId AND id fields
    let trade = data.trades.find(t => t.signalId === signalId);
    if (!trade) {
      trade = data.trades.find(t => t.id === signalId);
    }
    if (!trade) {
      trade = data.trades.find(t => t.positionId === signalId);
    }

    if (!trade) {
      console.error(`❌ Trade not found. Looking for: ${signalId}`);
      console.error('Available trades:', data.trades);
      alert('❌ Trade not found');
      return;
    }

    console.log('✅ Found trade:', trade);

    // Check if showExitModal is available (requires trader-signals-unified.js to be loaded)
    if (!window.showExitModal) {
      alert('❌ Exit modal not available. Please refresh the page.');
      console.error('showExitModal function not found on window object');
      return;
    }

    // 🔥 CRITICAL FIX: Get LIVE price from window.liveSignals if available
    let livePrice = trade.currentPrice;

    if (window.liveSignals && Array.isArray(window.liveSignals)) {
      console.log(`🔍 Searching for live price in ${window.liveSignals.length} live signals`);

      // Try to find matching signal by contract details
      const liveSignal = window.liveSignals.find(s =>
        s.root === trade.root &&
        s.strike === trade.strike &&
        s.right === trade.right &&
        s.expiration === trade.expiration
      );

      if (liveSignal && liveSignal.currentPrice) {
        livePrice = liveSignal.currentPrice;
        console.log(`✅ Found LIVE price from liveSignals: $${livePrice}`);
      } else {
        console.warn(`⚠️ No live signal found, using stale price: $${trade.currentPrice}`);
      }
    } else {
      console.warn('⚠️ window.liveSignals not available, using stale price');
    }

    // Transform trade data to signal format that showExitModal expects
    const signal = {
      id: trade.id || trade.signalId,
      root: trade.root,
      strike: trade.strike,
      right: trade.right,
      expiration: trade.expiration,
      entryPrice: trade.entryPrice,
      currentPrice: livePrice || trade.entryPrice, // Use live price from liveSignals
      quantity: trade.quantity || 1,
      positionId: trade.positionId || trade.id || trade.signalId,
      hasPosition: trade.hasPosition
    };

    console.log('🎯 Calling showExitModal with signal:', signal);
    console.log(`   Entry: $${signal.entryPrice}, Current: $${signal.currentPrice}`);

    // Call the global showExitModal function from trader-signals-unified.js
    window.showExitModal(signal);
  } catch (error) {
    console.error('Error opening exit modal:', error);
    alert('❌ Error opening exit modal');
  }
};

// Bulk Share Modal Functions
let bulkShareTradesList = [];
let selectedTrades = new Set();

async function openBulkShareModal() {
  const modal = document.getElementById('bulk-share-modal');
  modal.style.display = 'flex';

  // Load shareable trades (manual, closed, not already public)
  await loadBulkShareTrades();
}

function closeBulkShareModal() {
  const modal = document.getElementById('bulk-share-modal');
  modal.style.display = 'none';
  selectedTrades.clear();
  updateBulkSelectedCount();
}

async function loadBulkShareTrades() {
  try {
    const response = await fetch('/api/my-trades/history?status=closed&source=manual', {
      credentials: 'include'
    });
    const data = await response.json();

    console.log('📊 Bulk share trades response:', data);

    if (!data.success || !data.trades) {
      document.getElementById('bulk-share-list').innerHTML =
        '<div style="text-align: center; color: #666; padding: 40px 20px;">No trades available to share</div>';
      document.getElementById('bulk-selected-count').textContent = '0';
      return;
    }

    // Filter out trades that are already public
    bulkShareTradesList = data.trades.filter(trade => !trade.isPublic);

    console.log(`✅ Found ${bulkShareTradesList.length} shareable trades (${data.trades.length} total closed)`);

    if (bulkShareTradesList.length === 0) {
      document.getElementById('bulk-share-list').innerHTML =
        '<div style="text-align: center; color: #666; padding: 40px 20px;">All your trades are already public!</div>';
      document.getElementById('bulk-selected-count').textContent = '0';
      return;
    }

    renderBulkShareList();
    updateBulkSelectedCount();
  } catch (error) {
    console.error('Error loading bulk share trades:', error);
    document.getElementById('bulk-share-list').innerHTML =
      '<div style="text-align: center; color: #ef4444; padding: 40px 20px;">Error loading trades</div>';
  }
}

function renderBulkShareList() {
  const container = document.getElementById('bulk-share-list');

  container.innerHTML = bulkShareTradesList.map(trade => {
    const pnl = trade.pnlPercent || 0;
    const isWin = pnl > 0;
    const isSelected = selectedTrades.has(trade.signalId);

    return `
      <div class="bulk-trade-item" data-signal-id="${trade.signalId}" style="background: #2a2a2a; border-radius: 8px; padding: 12px; margin-bottom: 8px; display: flex; align-items: center; gap: 12px; cursor: pointer; border: 2px solid ${isSelected ? '#3b82f6' : 'transparent'};">

        <!-- Checkbox -->
        <input type="checkbox" ${isSelected ? 'checked' : ''}
               class="bulk-trade-checkbox"
               data-signal-id="${trade.signalId}"
               style="width: 20px; height: 20px; cursor: pointer;">

        <!-- Trade Info -->
        <div style="flex: 1;">
          <div style="color: #fff; font-weight: 600; font-size: 14px; margin-bottom: 4px;">
            ${trade.root} $${trade.strike}${trade.right}
            ${trade.right === 'C' ?
              '<span style="background: #10b981; color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-left: 6px;">CALL</span>' :
              '<span style="background: #ef4444; color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-left: 6px;">PUT</span>'
            }
          </div>
          <div style="color: #888; font-size: 11px;">
            ${formatExpiration(trade.expiration)} • $${trade.entryPrice?.toFixed(2)} → $${trade.exitPrice?.toFixed(2)}
          </div>
        </div>

        <!-- P&L -->
        <div style="text-align: right;">
          <div style="color: ${isWin ? '#10b981' : '#ef4444'}; font-weight: 600; font-size: 16px;">
            ${pnl > 0 ? '+' : ''}${pnl.toFixed(1)}%
          </div>
          <div style="color: #666; font-size: 11px;">
            ${isWin ? 'WIN' : 'LOSS'}
          </div>
        </div>

      </div>
    `;
  }).join('');

  // Add event delegation for clicks
  container.querySelectorAll('.bulk-trade-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (!e.target.classList.contains('bulk-trade-checkbox')) {
        toggleTradeSelection(item.dataset.signalId);
      }
    });
  });

  container.querySelectorAll('.bulk-trade-checkbox').forEach(checkbox => {
    checkbox.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleTradeSelection(checkbox.dataset.signalId);
    });
  });

  updateBulkSelectedCount();
}

function toggleTradeSelection(signalId) {
  if (selectedTrades.has(signalId)) {
    selectedTrades.delete(signalId);
  } else {
    selectedTrades.add(signalId);
  }
  renderBulkShareList();
  updateBulkSelectedCount();
}

function bulkSelectBy(type) {
  if (type === 'all') {
    bulkShareTradesList.forEach(trade => selectedTrades.add(trade.signalId));
  } else if (type === 'none') {
    selectedTrades.clear();
  } else if (type === 'calls') {
    bulkShareTradesList.filter(t => t.right === 'C').forEach(trade => selectedTrades.add(trade.signalId));
  } else if (type === 'puts') {
    bulkShareTradesList.filter(t => t.right === 'P').forEach(trade => selectedTrades.add(trade.signalId));
  } else if (type === 'wins') {
    bulkShareTradesList.filter(t => (t.pnlPercent || 0) > 0).forEach(trade => selectedTrades.add(trade.signalId));
  } else if (type === 'losses') {
    bulkShareTradesList.filter(t => (t.pnlPercent || 0) <= 0).forEach(trade => selectedTrades.add(trade.signalId));
  }
  renderBulkShareList();
  updateBulkSelectedCount();
}

function updateBulkSelectedCount() {
  const countEl = document.getElementById('bulk-selected-count');
  if (countEl) {
    countEl.textContent = selectedTrades.size;
  }
}

async function bulkShareTrades() {
  if (selectedTrades.size === 0) {
    alert('Please select at least one trade to share');
    return;
  }

  try {
    const sharePromises = Array.from(selectedTrades).map(signalId =>
      fetch('/api/my-trades/share', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signalId, isPublic: true })
      })
    );

    await Promise.all(sharePromises);

    closeBulkShareModal();
    refreshData();

    // Show success message
    const successDiv = document.createElement('div');
    successDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #10b981; color: #fff; padding: 16px 24px; border-radius: 8px; font-weight: 600; z-index: 2000; box-shadow: 0 4px 12px rgba(0,0,0,0.3);';
    successDiv.textContent = `✅ ${selectedTrades.size} trade${selectedTrades.size > 1 ? 's' : ''} shared to Global Trades!`;
    document.body.appendChild(successDiv);

    setTimeout(() => successDiv.remove(), 3000);
  } catch (error) {
    console.error('Error bulk sharing trades:', error);
    alert('Error sharing some trades. Please try again.');
  }
}

async function removeNATrade(signalId) {
  try {
    const response = await fetch('/api/my-trades/remove-na', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signalId })
    });

    const data = await response.json();

    if (data.success) {
      console.log(`✅ Removed N/A trade: ${signalId}`);
      refreshData(); // Reload the list
    } else {
      alert(`Failed to remove trade: ${data.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error removing N/A trade:', error);
    alert('Failed to remove trade. Please try again.');
  }
}

async function removeAllNATrades() {
  if (!confirm('Remove ALL N/A trades from history? This cannot be undone.')) {
    return;
  }

  try {
    const response = await fetch('/api/my-trades/remove-all-na', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();

    if (data.success) {
      console.log(`✅ Removed ${data.count} N/A trades`);
      alert(`Removed ${data.count} N/A trade${data.count !== 1 ? 's' : ''} from history`);
      refreshData(); // Reload the list
    } else {
      alert(`Failed to remove trades: ${data.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error removing all N/A trades:', error);
    alert('Failed to remove trades. Please try again.');
  }
}

async function deleteAllDefaultTrades() {
  if (!confirm('⚠️ Delete ALL Default account trades from history?\n\nThis will permanently delete all trades from your Default account (not Paper or Live).\n\nThis action CANNOT be undone!')) {
    return;
  }

  // Double confirmation for this destructive action
  if (!confirm('Are you absolutely sure? This will delete ALL your Default account trade history permanently.')) {
    return;
  }

  try {
    const response = await fetch('/api/my-trades/delete-all-default', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();

    if (data.success) {
      console.log(`✅ Deleted ${data.count} Default account trades`);
      alert(`Successfully deleted ${data.count} Default account trade${data.count !== 1 ? 's' : ''} from history`);
      refreshData(); // Reload the list
    } else {
      alert(`Failed to delete trades: ${data.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error deleting all Default trades:', error);
    alert('Failed to delete trades. Please try again.');
  }
}

async function deleteAllPaperTrades() {
  if (!confirm('⚠️ Delete ALL Paper account trades from history?\n\nThis will permanently delete all trades from your Paper trading account (not Default or Live).\n\nThis action CANNOT be undone!')) {
    return;
  }

  // Double confirmation for this destructive action
  if (!confirm('Are you absolutely sure? This will delete ALL your Paper account trade history permanently.')) {
    return;
  }

  try {
    const response = await fetch('/api/my-trades/delete-all-paper', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();

    if (data.success) {
      console.log(`✅ Deleted ${data.count} Paper account trades`);
      alert(`Successfully deleted ${data.count} Paper account trade${data.count !== 1 ? 's' : ''} from history`);
      refreshData(); // Reload the list
    } else {
      alert(`Failed to delete trades: ${data.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error deleting all Paper trades:', error);
    alert('Failed to delete trades. Please try again.');
  }
}

export function updateLive() {
  // Live updates handled by auto-refresh
  console.log('🔄 My Trades live update');
}
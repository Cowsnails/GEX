// public/views/global-trades.js - Global Public Trades Feed

export function render() {
  return `
    <div id="global-trades-container" style="display: flex; height: calc(100vh - 140px); gap: 16px; padding: 16px; background: #0a0a0a;">

      <!-- LEFT PANEL: Top Traders Leaderboard -->
      <div style="width: 350px; background: #1a1a1a; border-radius: 12px; border: 1px solid #2a2a2a; padding: 16px; display: flex; flex-direction: column;">
        <h3 style="margin: 0 0 16px 0; color: #fff; font-size: 18px; font-weight: 600;">
          Top Traders
        </h3>
        <div id="leaderboard-list" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 12px;">
          <div style="text-align: center; color: #666; padding: 40px 20px;">
            Loading...
          </div>
        </div>
      </div>

      <!-- RIGHT PANEL: Public Trades Feed -->
      <div style="flex: 1; background: #1a1a1a; border-radius: 12px; border: 1px solid #2a2a2a; padding: 16px; display: flex; flex-direction: column;">

        <!-- HEADER & FILTERS -->
        <div style="margin-bottom: 16px;">
          <h3 style="margin: 0 0 12px 0; color: #fff; font-size: 18px; font-weight: 600;">
            Global Trades Feed
            <span id="global-count" style="color: #666; font-size: 14px; font-weight: 400;"></span>
          </h3>

          <!-- FILTER ROW -->
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">

            <!-- Type Filter -->
            <select id="global-filter-right" style="padding: 6px 12px; background: #2a2a2a; border: 1px solid #3a3a3a; border-radius: 6px; color: #fff; font-size: 13px; cursor: pointer;">
              <option value="">Calls & Puts</option>
              <option value="C">Calls Only</option>
              <option value="P">Puts Only</option>
            </select>

            <!-- Outcome Filter -->
            <select id="global-filter-outcome" style="padding: 6px 12px; background: #2a2a2a; border: 1px solid #3a3a3a; border-radius: 6px; color: #fff; font-size: 13px; cursor: pointer;">
              <option value="">All Outcomes</option>
              <option value="WIN">Wins Only</option>
              <option value="LOSS">Losses Only</option>
            </select>

            <!-- Symbol Filter -->
            <input id="global-filter-symbol" type="text" placeholder="Symbol (e.g., SPY)" style="padding: 6px 12px; background: #2a2a2a; border: 1px solid #3a3a3a; border-radius: 6px; color: #fff; font-size: 13px; width: 150px;" />

            <!-- User Filter -->
            <select id="global-filter-user" style="padding: 6px 12px; background: #2a2a2a; border: 1px solid #3a3a3a; border-radius: 6px; color: #fff; font-size: 13px; cursor: pointer;">
              <option value="">All Users</option>
            </select>

            <!-- Sort -->
            <select id="global-filter-sort" style="padding: 6px 12px; background: #2a2a2a; border: 1px solid #3a3a3a; border-radius: 6px; color: #fff; font-size: 13px; cursor: pointer;">
              <option value="recent">Most Recent</option>
              <option value="pnl-high">Highest P&L</option>
              <option value="pnl-low">Lowest P&L</option>
            </select>

            <!-- Clear Filters -->
            <button id="global-clear-filters" style="padding: 6px 12px; background: #3a3a3a; border: 1px solid #4a4a4a; border-radius: 6px; color: #fff; font-size: 13px; cursor: pointer; transition: all 0.2s;">
              Clear Filters
            </button>

          </div>
        </div>

        <!-- TRADES FEED -->
        <div id="global-trades-list" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 10px;">
          <div style="text-align: center; color: #666; padding: 40px 20px;">
            Loading...
          </div>
        </div>

      </div>

    </div>
  `;
}

let globalFilters = {
  right: '',
  outcome: '',
  symbol: '',
  userId: '',
  sort: 'recent'
};

export async function initGlobalTradesView() {
  console.log('🌍 Initializing Global Trades View');

  // Attach filter event listeners
  document.getElementById('global-filter-right')?.addEventListener('change', handleGlobalFilterChange);
  document.getElementById('global-filter-outcome')?.addEventListener('change', handleGlobalFilterChange);
  document.getElementById('global-filter-symbol')?.addEventListener('input', debounce(handleGlobalFilterChange, 500));
  document.getElementById('global-filter-user')?.addEventListener('change', handleGlobalFilterChange);
  document.getElementById('global-filter-sort')?.addEventListener('change', handleGlobalFilterChange);
  document.getElementById('global-clear-filters')?.addEventListener('click', clearGlobalFilters);

  // Load data
  await refreshGlobalData();

  // Auto-refresh every 30 seconds
  setInterval(refreshGlobalData, 30000);
}

function handleGlobalFilterChange(e) {
  const filterId = e.target.id.replace('global-filter-', '');
  globalFilters[filterId] = e.target.value;
  refreshGlobalData();
}

function clearGlobalFilters() {
  globalFilters = {
    right: '',
    outcome: '',
    symbol: '',
    userId: '',
    sort: 'recent'
  };

  document.getElementById('global-filter-right').value = '';
  document.getElementById('global-filter-outcome').value = '';
  document.getElementById('global-filter-symbol').value = '';
  document.getElementById('global-filter-user').value = '';
  document.getElementById('global-filter-sort').value = 'recent';

  refreshGlobalData();
}

async function refreshGlobalData() {
  await Promise.all([
    loadLeaderboard(),
    loadGlobalTrades()
  ]);
}

async function loadLeaderboard() {
  try {
    const response = await fetch('/api/global-trades/leaderboard');
    const data = await response.json();

    const container = document.getElementById('leaderboard-list');

    // Check if element exists (user may have switched views)
    if (!container) return;

    if (!data.success || !data.leaders || data.leaders.length === 0) {
      container.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">No traders yet</div>';
      return;
    }

    container.innerHTML = data.leaders.map((leader, index) => {
      const rankColor = index === 0 ? '#fbbf24' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : '#666';
      const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;

      return `
        <div style="background: #2a2a2a; border-radius: 8px; padding: 12px; border-left: 3px solid ${rankColor};">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span style="font-size: 16px;">${rankEmoji}</span>
                <span style="color: #fff; font-weight: 600; font-size: 14px;">${leader.username}</span>
              </div>
              <div style="color: #888; font-size: 11px;">
                ${leader.totalTrades} trades • ${leader.publicTrades} public
              </div>
            </div>
            <div style="text-align: right;">
              <div style="color: ${leader.winRate >= 60 ? '#10b981' : leader.winRate >= 50 ? '#fbbf24' : '#ef4444'}; font-weight: 700; font-size: 18px;">
                ${leader.winRate}%
              </div>
              <div style="color: #666; font-size: 11px;">winrate</div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding-top: 8px; border-top: 1px solid #3a3a3a;">
            <div>
              <div style="color: #666; font-size: 10px;">SHARPE</div>
              <div style="color: #fff; font-size: 13px; font-weight: 600;">${leader.sharpeRatio}</div>
            </div>
            <div>
              <div style="color: #666; font-size: 10px;">PROFIT FACTOR</div>
              <div style="color: #fff; font-size: 13px; font-weight: 600;">${leader.profitFactor}</div>
            </div>
          </div>

          <button onclick="filterByUser(${leader.userId}, '${leader.username}')" style="width: 100%; margin-top: 8px; padding: 6px; background: #3b82f6; border: none; border-radius: 4px; color: #fff; font-size: 11px; cursor: pointer;">
            View Trades
          </button>
        </div>
      `;
    }).join('');

    // Update user filter dropdown
    const userFilterSelect = document.getElementById('global-filter-user');
    if (userFilterSelect) {
      userFilterSelect.innerHTML = '<option value="">All Users</option>' +
        data.leaders.map(leader =>
          `<option value="${leader.userId}">${leader.username}</option>`
        ).join('');
    }
  } catch (error) {
    console.error('Error loading leaderboard:', error);
  }
}

async function loadGlobalTrades() {
  try {
    const params = new URLSearchParams();
    if (globalFilters.right) params.append('right', globalFilters.right);
    if (globalFilters.outcome) params.append('outcome', globalFilters.outcome);
    if (globalFilters.symbol) params.append('root', globalFilters.symbol.toUpperCase());
    if (globalFilters.userId) params.append('userId', globalFilters.userId);

    const response = await fetch(`/api/global-trades/feed?${params.toString()}`);
    const data = await response.json();

    const container = document.getElementById('global-trades-list');
    const countEl = document.getElementById('global-count');

    // Check if elements exist (user may have switched views)
    if (!container || !countEl) return;

    if (!data.success || !data.trades || data.trades.length === 0) {
      container.innerHTML = '<div style="text-align: center; color: #666; padding: 40px 20px;">No public trades found</div>';
      countEl.textContent = '(0)';
      return;
    }

    // Apply sorting
    let trades = [...data.trades];
    if (globalFilters.sort === 'pnl-high') {
      trades.sort((a, b) => (b.pnlPercent || 0) - (a.pnlPercent || 0));
    } else if (globalFilters.sort === 'pnl-low') {
      trades.sort((a, b) => (a.pnlPercent || 0) - (b.pnlPercent || 0));
    }

    countEl.textContent = `(${trades.length})`;

    container.innerHTML = trades.map(trade => {
      const pnl = trade.pnlPercent || 0;
      const isWin = pnl > 0;
      const isActive = trade.status === 'active';

      // Generate account badge
      let accountBadge = '';
      if (trade.accountType) {
        const accountType = trade.accountType.toUpperCase();
        const accountEmoji = accountType === 'PAPER' ? '📄' : accountType === 'LIVE' ? '💵' : '⚪';
        const accountColor = accountType === 'PAPER' ? '#3b82f6' : accountType === 'LIVE' ? '#10b981' : '#6b7280';
        accountBadge = `<span style="background: ${accountColor}; color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-left: 6px;">${accountEmoji} ${accountType}</span>`;
      }

      return `
        <div style="background: #2a2a2a; border-radius: 8px; padding: 14px; border-left: 3px solid ${isActive ? '#fbbf24' : isWin ? '#10b981' : '#ef4444'};">

          <!-- USER HEADER -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #3a3a3a;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 600; font-size: 14px;">
                ${trade.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style="color: #fff; font-weight: 600; font-size: 13px;">${trade.username}</div>
                <div style="color: #666; font-size: 11px;">${formatTime(trade.sharedAt)}</div>
              </div>
            </div>
            ${isActive ? '' : `
              <div style="text-align: right;">
                <div style="color: ${isWin ? '#10b981' : '#ef4444'}; font-weight: 700; font-size: 20px;">
                  ${pnl > 0 ? '+' : ''}${pnl.toFixed(1)}%
                </div>
              </div>
            `}
          </div>

          <!-- TRADE DETAILS -->
          <div style="display: flex; justify-content: space-between; align-items: center;">

            <!-- LEFT: Symbol & Details -->
            <div>
              <div style="color: #fff; font-weight: 600; font-size: 16px; margin-bottom: 4px;">
                ${trade.root} $${trade.strike}${trade.right}
                ${trade.right === 'C' ?
                  '<span style="background: #10b981; color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-left: 6px;">CALL</span>' :
                  '<span style="background: #ef4444; color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-left: 6px;">PUT</span>'
                }
                ${accountBadge}
              </div>
              <div style="color: #888; font-size: 12px;">
                Exp: ${formatExpiration(trade.expiration)}
              </div>
            </div>

            <!-- RIGHT: Entry/Exit Info -->
            <div style="text-align: right; min-width: 180px;">
              <div style="color: #888; font-size: 11px; margin-bottom: 2px;">Entry → Exit</div>
              <div style="color: #10b981; font-size: 12px; margin-bottom: 2px;">
                ${formatExactTime(trade.receivedAt)} ${!isActive && trade.exitTime ? `→ ${formatExactTime(trade.exitTime)}` : ''}
              </div>
              <div style="color: #fff; font-weight: 600; font-size: 14px;">
                $${trade.entryPrice?.toFixed(2) || 'N/A'} ${!isActive && trade.exitPrice ? `→ $${trade.exitPrice.toFixed(2)}` : ''}
              </div>
            </div>

          </div>

          ${!isActive ? `
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #3a3a3a; display: flex; justify-content: space-between; color: #888; font-size: 11px;">
              <span>${formatDuration(trade.duration)} hold</span>
              <span>${isWin ? 'WIN' : 'LOSS'}</span>
            </div>
          ` : `
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #3a3a3a; text-align: center;">
              <span style="background: #fbbf24; color: #000; padding: 4px 12px; border-radius: 4px; font-size: 11px; font-weight: 600;">
                ACTIVE TRADE
              </span>
            </div>
          `}

        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('Error loading global trades:', error);
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

// Debounce helper
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Global function for filtering by user
window.filterByUser = function(userId, username) {
  globalFilters.userId = userId;
  document.getElementById('global-filter-user').value = userId;
  refreshGlobalData();
};

export function updateLive() {
  console.log('🔄 Global Trades live update');
}
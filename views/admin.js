// views/admin.js - Admin Dashboard with Audit Logs - SECURED (No inline handlers)
export function getAdminHTML() {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Admin Dashboard - GEX Trading</title>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0a0e27;
      color: #e0e6ed;
      padding: 20px;
    }
    
    .container {
      max-width: 1400px;
      margin: 0 auto;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #3d4a5c;
    }
    
    .title {
      font-size: 32px;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .admin-badge {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      padding: 6px 16px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin-bottom: 40px;
    }
    
    .stat-card {
      background: linear-gradient(135deg, #1a2332 0%, #151b2e 100%);
      border: 2px solid #3d4a5c;
      border-radius: 12px;
      padding: 24px;
      text-align: center;
    }
    
    .stat-value {
      font-size: 36px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    
    .stat-value.critical { color: #ef4444; }
    .stat-value.high { color: #f59e0b; }
    .stat-value.success { color: #10b981; }
    .stat-value.info { color: #3b82f6; }
    
    .stat-label {
      font-size: 12px;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .admin-section {
      background: linear-gradient(135deg, #1a2332 0%, #151b2e 100%);
      border: 2px solid #3d4a5c;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 40px;
    }
    
    .admin-section-header {
      margin-bottom: 20px;
    }
    
    .admin-section-header h2 {
      font-size: 20px;
      font-weight: 700;
      color: #fff;
    }
    
    .metric-card {
      background: rgba(59, 130, 246, 0.05);
      border: 2px solid #3d4a5c;
      border-radius: 8px;
      padding: 16px;
    }
    
    .metric-title {
      font-size: 12px;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }
    
    .metric-value {
      font-size: 24px;
      font-weight: 700;
      color: #fff;
    }
    
    .admin-btn {
      padding: 12px 20px;
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      border: none;
      border-radius: 8px;
      color: #fff;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    
    .admin-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(59, 130, 246, 0.4);
    }
    
    .admin-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .filters {
      display: flex;
      gap: 12px;
      margin-bottom: 24px;
    }
    
    .filter-btn {
      padding: 10px 20px;
      background: #1a2332;
      border: 2px solid #3d4a5c;
      border-radius: 8px;
      color: #9ca3af;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .filter-btn:hover, .filter-btn.active {
      border-color: #3b82f6;
      color: #3b82f6;
      background: rgba(59, 130, 246, 0.1);
    }
    
    .logs-container {
      background: linear-gradient(135deg, #1a2332 0%, #151b2e 100%);
      border: 2px solid #3d4a5c;
      border-radius: 12px;
      padding: 24px;
    }
    
    .logs-title {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 20px;
      color: #fff;
    }
    
    .log-entry {
      padding: 16px;
      background: rgba(59, 130, 246, 0.05);
      border-left: 4px solid #3b82f6;
      border-radius: 8px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: start;
      transition: all 0.2s;
    }
    
    .log-entry:hover {
      background: rgba(59, 130, 246, 0.1);
      transform: translateX(4px);
    }
    
    .log-entry.critical {
      border-left-color: #ef4444;
      background: rgba(239, 68, 68, 0.05);
    }
    
    .log-entry.high {
      border-left-color: #f59e0b;
      background: rgba(245, 158, 11, 0.05);
    }
    
    .log-entry.success {
      border-left-color: #10b981;
      background: rgba(16, 185, 129, 0.05);
    }
    
    .log-main {
      flex: 1;
    }
    
    .log-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }
    
    .log-icon {
      font-size: 12px;
      font-weight: 700;
      background: #3b82f6;
      color: #fff;
      padding: 4px 8px;
      border-radius: 4px;
    }
    
    .log-action {
      font-weight: 600;
      font-size: 15px;
    }
    
    .log-badge {
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
    }
    
    .badge-critical { background: #ef4444; color: #fff; }
    .badge-high { background: #f59e0b; color: #fff; }
    .badge-medium { background: #3b82f6; color: #fff; }
    .badge-low { background: #6b7280; color: #fff; }
    
    .log-details {
      font-size: 13px;
      color: #9ca3af;
      margin-top: 4px;
    }
    
    .log-time {
      font-size: 12px;
      color: #6b7280;
      text-align: right;
    }
    
    .refresh-btn {
      padding: 12px 24px;
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      border: none;
      border-radius: 8px;
      color: #fff;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .refresh-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(59, 130, 246, 0.4);
    }
    
    .loading {
      text-align: center;
      padding: 40px;
      color: #9ca3af;
    }

    .user-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 16px;
      background: rgba(59, 130, 246, 0.05);
      border: 1px solid #3d4a5c;
      border-radius: 8px;
      margin-bottom: 8px;
      transition: all 0.2s;
    }

    .user-item:hover {
      background: rgba(59, 130, 246, 0.1);
      border-color: #3b82f6;
    }

    .user-info {
      flex: 1;
    }

    .user-username {
      font-size: 15px;
      font-weight: 700;
      color: #fff;
      margin-bottom: 4px;
    }

    .user-email {
      font-size: 12px;
      color: #9ca3af;
    }

    .user-admin-badge {
      background: #f59e0b;
      color: #fff;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      margin-left: 8px;
    }

    .delete-user-btn {
      padding: 8px 12px;
      background: #ef4444;
      border: none;
      border-radius: 6px;
      color: #fff;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
    }

    .delete-user-btn:hover {
      background: #dc2626;
      transform: translateY(-2px);
    }

    .generated-key {
      user-select: all;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title">
        <span>ADMIN</span>
        <span>Admin Dashboard</span>
        <span class="admin-badge">ADMIN</span>
      </div>
      <button class="refresh-btn" id="refresh-btn">Refresh</button>
    </div>
    
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value critical" id="stat-critical">0</div>
        <div class="stat-label">Critical Alerts</div>
      </div>
      <div class="stat-card">
        <div class="stat-value high" id="stat-high">0</div>
        <div class="stat-label">High Risk Events</div>
      </div>
      <div class="stat-card">
        <div class="stat-value success" id="stat-logins">0</div>
        <div class="stat-label">Successful Logins</div>
      </div>
      <div class="stat-card">
        <div class="stat-value info" id="stat-total">0</div>
        <div class="stat-label">Total Events (24h)</div>
      </div>
    </div>
    
    <div class="admin-section">
      <div class="admin-section-header">
        <h2>Options Universe Manager</h2>
      </div>
      <div class="admin-section-content">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
          <div class="metric-card">
            <div class="metric-title">Universe Status</div>
            <div class="metric-value" id="universe-ticker-count">--</div>
            <div style="font-size:11px;color:#9ca3af;margin-top:8px;" id="universe-last-updated">Loading...</div>
          </div>
          <div class="metric-card">
            <div class="metric-title">Refresh Window</div>
            <div class="metric-value" id="universe-refresh-window">--</div>
            <div style="font-size:11px;color:#9ca3af;margin-top:8px;">8:30-9:30am ET only</div>
          </div>
        </div>

        <div style="display:flex;gap:12px;">
          <button id="check-universe-btn" class="admin-btn" style="flex:1;">
            <span>Check Status</span>
          </button>
          <button id="refresh-universe-btn" class="admin-btn" style="flex:1;background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);">
            <span>Force Refresh (Admin Only)</span>
          </button>
        </div>

        <div id="universe-status-message" style="display:none;margin-top:16px;padding:12px;border-radius:8px;font-size:13px;"></div>
      </div>
    </div>

    <div class="admin-section">
      <div class="admin-section-header">
        <h2>🔑 Activation Key Generator</h2>
      </div>
      <div class="admin-section-content">
        <p style="color:#9ca3af;margin-bottom:16px;font-size:14px;">Generate activation keys for new user registrations. Each key can only be used once.</p>
        <div style="display:flex;gap:12px;align-items:center;">
          <button id="generate-key-btn" class="admin-btn">
            <span>Generate Activation Key</span>
          </button>
          <div id="generated-key-display" style="flex:1;padding:12px;background:rgba(59,130,246,0.1);border:2px solid #3b82f6;border-radius:8px;font-family:monospace;font-size:16px;font-weight:700;color:#3b82f6;text-align:center;display:none;">
          </div>
        </div>
        <div id="key-gen-message" style="display:none;margin-top:12px;padding:12px;border-radius:8px;font-size:13px;"></div>
      </div>
    </div>

    <div class="admin-section">
      <div class="admin-section-header">
        <h2>👥 User Management</h2>
      </div>
      <div class="admin-section-content">
        <div style="margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;">
          <div style="color:#9ca3af;font-size:14px;">Total Users: <span id="user-count" style="color:#fff;font-weight:700;">0</span></div>
          <button id="refresh-users-btn" class="admin-btn" style="padding:8px 16px;font-size:12px;">
            <span>Refresh List</span>
          </button>
        </div>
        <div id="users-list" style="max-height:400px;overflow-y:auto;">
          <div style="text-align:center;padding:40px;color:#9ca3af;">Loading users...</div>
        </div>
      </div>
    </div>

    <div class="filters">
      <button class="filter-btn active" data-filter="all">All Events</button>
      <button class="filter-btn" data-filter="CRITICAL">Critical</button>
      <button class="filter-btn" data-filter="HIGH">High Risk</button>
      <button class="filter-btn" data-filter="AUTH">Auth</button>
      <button class="filter-btn" data-filter="TRADING">Trading</button>
      <button class="filter-btn" data-filter="SECURITY">Security</button>
    </div>
    
    <div class="logs-container">
      <div class="logs-title">Audit Logs (Last 50 Events)</div>
      <div id="logs-content" class="loading">Loading audit logs...</div>
    </div>
  </div>
  
  <script>
    let allLogs = [];
    let currentFilter = 'all';
    let csrfToken = null;
    window.csrfToken = null;
    
    async function loadCSRFToken() {
      try {
        const response = await fetch('/api/auth/verify', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          if (data.csrfToken) {
            csrfToken = data.csrfToken;
            window.csrfToken = data.csrfToken;
          }
        }
      } catch (error) {
        console.error('Failed to load CSRF token:', error);
      }
    }
    
    async function loadDashboard() {
      try {
        const response = await fetch('/api/admin/audit-logs', { credentials: 'include' });
        if (!response.ok) {
          if (response.status === 403) {
            alert('Access Denied: Admin privileges required');
            window.location.href = '/';
            return;
          }
          throw new Error('Failed to load logs');
        }
        const data = await response.json();
        allLogs = data.logs || [];
        document.getElementById('stat-critical').textContent = data.stats.critical || 0;
        document.getElementById('stat-high').textContent = data.stats.high || 0;
        document.getElementById('stat-logins').textContent = data.stats.logins || 0;
        document.getElementById('stat-total').textContent = data.stats.total || 0;
        renderLogs();
      } catch (error) {
        console.error('Failed to load dashboard:', error);
        document.getElementById('logs-content').innerHTML = '<div style="color:#ef4444;">Failed to load audit logs</div>';
      }
    }
    
    function filterLogs(filter) {
      currentFilter = filter;
      document.querySelectorAll('.filter-btn').forEach(function(btn) {
        btn.classList.remove('active');
      });
      const activeBtn = document.querySelector('[data-filter="' + filter + '"]');
      if (activeBtn) activeBtn.classList.add('active');
      renderLogs();
    }
    
    function renderLogs() {
      const container = document.getElementById('logs-content');
      let filtered = allLogs;
      if (currentFilter !== 'all') {
        filtered = allLogs.filter(function(log) {
          return log.risk_level === currentFilter || log.event_type === currentFilter;
        });
      }
      if (filtered.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#9ca3af;">No logs found</div>';
        return;
      }
      const logsHTML = filtered.map(function(log) {
        const icon = getLogIcon(log);
        const riskClass = log.risk_level.toLowerCase();
        const successIcon = log.success ? 'OK' : 'FAIL';
        const username = log.username || 'anonymous';
        const ip = log.ip_address || 'unknown';
        const details = log.details ? ' - ' + log.details : '';
        const timestamp = formatTime(log.timestamp);
        return '<div class="log-entry ' + riskClass + '"><div class="log-main"><div class="log-header"><span class="log-icon">' + icon + '</span><span class="log-action">' + log.event_action + '</span><span class="log-badge badge-' + riskClass + '">' + log.risk_level + '</span><span>' + successIcon + '</span></div><div class="log-details"><strong>' + username + '</strong> from ' + ip + details + '</div></div><div class="log-time">' + timestamp + '</div></div>';
      });
      container.innerHTML = logsHTML.join('');
    }
    
    function getLogIcon(log) {
      if (log.event_type === 'AUTH') return 'AUTH';
      if (log.event_type === 'TRADING') return 'TRADE';
      if (log.event_type === 'SECURITY') return 'SEC';
      if (log.event_type === 'BROKER') return 'BRKR';
      if (log.event_type === 'ADMIN') return 'ADMN';
      return 'LOG';
    }
    
    function formatTime(timestamp) {
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now - date;
      if (diff < 60000) return 'Just now';
      if (diff < 3600000) return Math.floor(diff/60000) + 'm ago';
      if (diff < 86400000) return Math.floor(diff/3600000) + 'h ago';
      return date.toLocaleString();
    }
    
    async function checkUniverseStatus() {
      try {
        document.getElementById('check-universe-btn').disabled = true;
        const response = await fetch('/api/admin/universe-status', { credentials: 'include' });
        const data = await response.json();
        if (data.success) {
          document.getElementById('universe-ticker-count').textContent = data.tickerCount + ' tickers';
          if (data.lastUpdated) {
            const date = new Date(data.lastUpdated);
            document.getElementById('universe-last-updated').textContent = 'Last updated: ' + date.toLocaleString();
          } else {
            document.getElementById('universe-last-updated').textContent = 'Never updated';
          }
          document.getElementById('universe-refresh-window').textContent = data.isRefreshWindow ? 'ACTIVE' : 'CLOSED';
          document.getElementById('universe-refresh-window').style.color = data.isRefreshWindow ? '#10b981' : '#ef4444';
          showUniverseStatus('Status loaded', 'success');
        } else {
          showUniverseStatus('Error: ' + data.error, 'error');
        }
      } catch (error) {
        showUniverseStatus('Failed to check status: ' + error.message, 'error');
      } finally {
        document.getElementById('check-universe-btn').disabled = false;
      }
    }
    
    async function refreshUniverse() {
      if (!confirm('Force refresh universe? This will fetch fresh expiration data for all 195 tickers (3-5 minutes). Normally this only happens 8:30-9:30am ET.')) return;
      try {
        const btn = document.getElementById('refresh-universe-btn');
        btn.disabled = true;
        btn.innerHTML = '<span>Refreshing...</span>';
        const response = await fetch('/api/admin/refresh-universe', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': window.csrfToken || '' }
        });
        const data = await response.json();
        if (data.success) {
          showUniverseStatus('Universe refreshed successfully!', 'success');
          await checkUniverseStatus();
        } else {
          showUniverseStatus(data.message, 'error');
        }
      } catch (error) {
        showUniverseStatus('Refresh failed: ' + error.message, 'error');
      } finally {
        const btn = document.getElementById('refresh-universe-btn');
        btn.disabled = false;
        btn.innerHTML = '<span>Force Refresh (Admin Only)</span>';
      }
    }
    
    function showUniverseStatus(message, type) {
      const statusEl = document.getElementById('universe-status-message');
      const colors = {
        success: { bg: 'rgba(16,185,129,0.1)', border: '#10b981', text: '#10b981' },
        error: { bg: 'rgba(239,68,68,0.1)', border: '#ef4444', text: '#ef4444' }
      };
      const color = colors[type] || colors.error;
      statusEl.style.display = 'block';
      statusEl.style.background = color.bg;
      statusEl.style.border = '1px solid ' + color.border;
      statusEl.style.color = color.text;
      statusEl.textContent = message;
      setTimeout(function() { statusEl.style.display = 'none'; }, 5000);
    }
    
    async function generateActivationKey() {
      try {
        const btn = document.getElementById('generate-key-btn');
        btn.disabled = true;
        btn.innerHTML = '<span>Generating...</span>';

        const response = await fetch('/api/admin/generate-keys', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': window.csrfToken || ''
          },
          body: JSON.stringify({ count: 1 })
        });

        const data = await response.json();

        if (data.success && data.keys && data.keys.length > 0) {
          const key = data.keys[0];
          const displayEl = document.getElementById('generated-key-display');
          displayEl.textContent = key;
          displayEl.style.display = 'block';
          displayEl.classList.add('generated-key');
          showKeyGenMessage('✅ Key generated! Click to copy.', 'success');

          // Auto-select on click for easy copying
          displayEl.onclick = function() {
            const range = document.createRange();
            range.selectNodeContents(displayEl);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
            try {
              document.execCommand('copy');
              showKeyGenMessage('✅ Key copied to clipboard!', 'success');
            } catch (err) {
              showKeyGenMessage('Select and copy the key manually', 'success');
            }
          };
        } else {
          showKeyGenMessage('Error: ' + (data.error || 'Failed to generate key'), 'error');
        }
      } catch (error) {
        showKeyGenMessage('Failed to generate key: ' + error.message, 'error');
      } finally {
        const btn = document.getElementById('generate-key-btn');
        btn.disabled = false;
        btn.innerHTML = '<span>Generate Activation Key</span>';
      }
    }

    function showKeyGenMessage(message, type) {
      const messageEl = document.getElementById('key-gen-message');
      const colors = {
        success: { bg: 'rgba(16,185,129,0.1)', border: '#10b981', text: '#10b981' },
        error: { bg: 'rgba(239,68,68,0.1)', border: '#ef4444', text: '#ef4444' }
      };
      const color = colors[type] || colors.error;
      messageEl.style.display = 'block';
      messageEl.style.background = color.bg;
      messageEl.style.border = '1px solid ' + color.border;
      messageEl.style.color = color.text;
      messageEl.textContent = message;
      setTimeout(function() { messageEl.style.display = 'none'; }, 5000);
    }

    async function loadUsers() {
      try {
        const response = await fetch('/api/admin/users', { credentials: 'include' });
        const data = await response.json();

        if (data.success && data.users) {
          const users = data.users;
          document.getElementById('user-count').textContent = users.length;

          if (users.length === 0) {
            document.getElementById('users-list').innerHTML = '<div style="text-align:center;padding:40px;color:#9ca3af;">No users found</div>';
            return;
          }

          const usersHTML = users.map(function(user) {
            const adminBadge = user.is_admin ? '<span class="user-admin-badge">ADMIN</span>' : '';
            const email = user.email || 'No email';
            return '<div class="user-item"><div class="user-info"><div class="user-username">' + user.username + adminBadge + '</div><div class="user-email">' + email + '</div></div><button class="delete-user-btn" data-user-id="' + user.id + '" data-username="' + user.username + '">✕ Delete</button></div>';
          });

          document.getElementById('users-list').innerHTML = usersHTML.join('');

          // Add delete event listeners
          document.querySelectorAll('.delete-user-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
              const userId = this.getAttribute('data-user-id');
              const username = this.getAttribute('data-username');
              deleteUser(userId, username);
            });
          });
        } else {
          document.getElementById('users-list').innerHTML = '<div style="color:#ef4444;text-align:center;padding:40px;">Failed to load users</div>';
        }
      } catch (error) {
        console.error('Failed to load users:', error);
        document.getElementById('users-list').innerHTML = '<div style="color:#ef4444;text-align:center;padding:40px;">Error loading users</div>';
      }
    }

    async function deleteUser(userId, username) {
      if (!confirm('Are you sure you want to delete user "' + username + '"? This action cannot be undone.')) {
        return;
      }

      try {
        const response = await fetch('/api/admin/user/' + userId, {
          method: 'DELETE',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': window.csrfToken || ''
          }
        });

        const data = await response.json();

        if (data.success) {
          alert('User "' + username + '" deleted successfully');
          await loadUsers(); // Refresh the list
        } else {
          alert('Failed to delete user: ' + (data.error || 'Unknown error'));
        }
      } catch (error) {
        alert('Error deleting user: ' + error.message);
      }
    }

    (async function initializeAdminPage() {
      await loadCSRFToken();
      await loadDashboard();
      await loadUsers();

      const refreshBtn = document.getElementById('refresh-btn');
      if (refreshBtn) refreshBtn.addEventListener('click', loadDashboard);

      document.querySelectorAll('.filter-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          filterLogs(this.getAttribute('data-filter'));
        });
      });

      const checkUniverseBtn = document.getElementById('check-universe-btn');
      if (checkUniverseBtn) checkUniverseBtn.addEventListener('click', checkUniverseStatus);

      const refreshUniverseBtn = document.getElementById('refresh-universe-btn');
      if (refreshUniverseBtn) refreshUniverseBtn.addEventListener('click', refreshUniverse);

      const generateKeyBtn = document.getElementById('generate-key-btn');
      if (generateKeyBtn) generateKeyBtn.addEventListener('click', generateActivationKey);

      const refreshUsersBtn = document.getElementById('refresh-users-btn');
      if (refreshUsersBtn) refreshUsersBtn.addEventListener('click', loadUsers);

      checkUniverseStatus();
      setInterval(loadDashboard, 30000);
    })();
  </script>
</body>
</html>`;
}
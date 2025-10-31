// views/settings.js - Settings Page Export - SECURED (No inline handlers)
export function getSettingsHTML() {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Broker Settings - GEX Trading</title>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #0a0e27 0%, #1a2332 100%) !important;
      color: #e0e6ed;
      min-height: 100vh;
      padding: 40px 20px;
    }
    
    .container {
      max-width: 900px;
      margin: 0 auto;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 40px;
    }
    
    .title {
      font-size: 32px;
      font-weight: 700;
      color: #fff;
    }
    
    .header-buttons {
      display: flex;
      gap: 12px;
    }
    
    .refresh-btn {
      padding: 12px 24px;
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      border: none;
      border-radius: 8px;
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .refresh-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(59, 130, 246, 0.4);
    }
    
    .settings-card {
      background: linear-gradient(135deg, #1a2332 0%, #151b2e 100%);
      border: 2px solid #3d4a5c;
      border-radius: 16px;
      padding: 32px;
      margin-bottom: 24px;
    }
    
    .card-title {
      font-size: 24px;
      font-weight: 700;
      color: #fff;
      margin-bottom: 8px;
    }
    
    .card-subtitle {
      font-size: 14px;
      color: #9ca3af;
      margin-bottom: 32px;
    }
    
    .account-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 32px;
    }
    
    .account-box {
      background: rgba(59, 130, 246, 0.05);
      border: 2px solid #3d4a5c;
      border-radius: 12px;
      padding: 24px;
      position: relative;
      transition: all 0.2s;
    }
    
    .account-box.active {
      border-color: #10b981;
      background: rgba(16, 185, 129, 0.1);
    }
    
    .account-box.paper {
      border-color: #f59e0b;
    }
    
    .account-box.paper.active {
      border-color: #f59e0b;
      background: rgba(245, 158, 11, 0.1);
    }
    
    .account-badge {
      position: absolute;
      top: 16px;
      right: 16px;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .badge-live {
      background: #10b981;
      color: #fff;
    }
    
    .badge-paper {
      background: #f59e0b;
      color: #fff;
    }
    
    .account-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }
    
    .account-title {
      font-size: 20px;
      font-weight: 700;
      color: #fff;
      margin-bottom: 8px;
    }
    
    .account-desc {
      font-size: 13px;
      color: #9ca3af;
      line-height: 1.6;
      margin-bottom: 16px;
    }
    
    .account-status {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #6b7280;
    }
    
    .status-dot.connected {
      background: #10b981;
      box-shadow: 0 0 12px rgba(16, 185, 129, 0.5);
    }
    
    .form-group {
      margin-bottom: 20px;
    }
    
    .form-label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #9ca3af;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .form-input {
      width: 100%;
      padding: 14px 16px;
      background: #0a0e27;
      border: 2px solid #3d4a5c;
      border-radius: 8px;
      color: #e0e6ed;
      font-size: 15px;
      font-family: inherit;
      transition: all 0.2s;
    }
    
    .form-input:focus {
      outline: none;
      border-color: #3b82f6;
      background: #151b2e;
    }
    
    .btn-primary {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      border: none;
      border-radius: 8px;
      color: #fff;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(59, 130, 246, 0.4);
    }
    
    .btn-success {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    }
    
    .btn-warning {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    }
    
    .btn-danger {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    }
    
    .btn-secondary {
      width: 100%;
      padding: 12px;
      background: transparent;
      border: 2px solid #3d4a5c;
      border-radius: 8px;
      color: #9ca3af;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      margin-top: 8px;
    }
    
    .btn-secondary:hover {
      border-color: #ef4444;
      color: #ef4444;
    }
    
    .message {
      padding: 12px;
      border-radius: 8px;
      font-size: 13px;
      margin-bottom: 16px;
      display: none;
    }
    
    .message.success {
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid #10b981;
      color: #6ee7b7;
    }
    
    .message.error {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid #ef4444;
      color: #fca5a5;
    }
    
    .balance-display {
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid #3b82f6;
      border-radius: 8px;
      padding: 16px;
      margin-top: 16px;
      text-align: center;
    }
    
    .balance-label {
      font-size: 12px;
      color: #9ca3af;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .balance-amount {
      font-size: 32px;
      font-weight: 700;
      color: #3b82f6;
    }
    
    .switch-btn {
      width: 100%;
      padding: 16px;
      background: transparent;
      border: 2px solid #3b82f6;
      border-radius: 8px;
      color: #3b82f6;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
      text-transform: uppercase;
      margin-top: 16px;
    }
    
    .switch-btn:hover {
      background: rgba(59, 130, 246, 0.1);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title">⚙️ Broker Settings <span style="font-size:14px;color:#9ca3af;font-weight:400;margin-left:12px;">Alpaca Trading Only</span></div>
      <div class="header-buttons">
        <button class="refresh-btn" id="refresh-btn">🔄 Refresh</button>
      </div>
    </div>
    
    <!-- Active Account Display -->
    <div class="settings-card">
      <div class="card-title">Active Trading Account</div>
      <div class="card-subtitle">Select which account to use for manual trades:</div>

      <div id="active-account-display" style="background:rgba(59,130,246,0.05);border:2px solid #3b82f6;border-radius:12px;padding:24px;">
        <div style="font-size:14px;color:#9ca3af;margin-bottom:12px;text-align:center;">SELECT TRADING MODE</div>

        <!-- 3-Button Account Selector -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px;">
          <button class="account-select-btn" id="select-default-btn" data-account="default" style="
            padding:20px;
            background:linear-gradient(135deg, #10b981 0%, #059669 100%);
            color:white;
            border:3px solid #10b981;
            border-radius:12px;
            font-size:14px;
            font-weight:700;
            cursor:pointer;
            transition:all 0.2s;
            display:flex;
            flex-direction:column;
            align-items:center;
            gap:8px;
          ">
            <span style="font-size:32px;">💰</span>
            <span>Default</span>
            <span style="font-size:11px;opacity:0.9;">Virtual $100k</span>
          </button>

          <button class="account-select-btn" id="select-paper-btn" data-account="paper" style="
            padding:20px;
            background:rgba(255,255,255,0.05);
            color:#9ca3af;
            border:3px solid rgba(255,255,255,0.1);
            border-radius:12px;
            font-size:14px;
            font-weight:700;
            cursor:pointer;
            transition:all 0.2s;
            display:flex;
            flex-direction:column;
            align-items:center;
            gap:8px;
          ">
            <span style="font-size:32px;">📄</span>
            <span>Paper</span>
            <span style="font-size:11px;opacity:0.9;">Practice Mode</span>
          </button>

          <button class="account-select-btn" id="select-live-btn" data-account="live" style="
            padding:20px;
            background:rgba(255,255,255,0.05);
            color:#9ca3af;
            border:3px solid rgba(255,255,255,0.1);
            border-radius:12px;
            font-size:14px;
            font-weight:700;
            cursor:pointer;
            transition:all 0.2s;
            display:flex;
            flex-direction:column;
            align-items:center;
            gap:8px;
          ">
            <span style="font-size:32px;">🔴</span>
            <span>Live</span>
            <span style="font-size:11px;opacity:0.9;">Real Money</span>
          </button>
        </div>

        <!-- Current Active Account Info -->
        <div style="text-align:center;margin-bottom:16px;padding:16px;background:rgba(0,0,0,0.2);border-radius:8px;">
          <div style="font-size:13px;color:#9ca3af;margin-bottom:4px;">Currently Active:</div>
          <div id="current-active-type" style="font-size:24px;font-weight:700;color:#10b981;margin-bottom:4px;">Default Account</div>
          <div id="current-active-balance" style="font-size:16px;color:#6b7280;">$100,000.00</div>
        </div>

        <!-- Submit Button -->
        <button id="submit-account-change-btn" class="switch-btn" style="
          width:100%;
          padding:16px;
          background:linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color:white;
          border:none;
          border-radius:8px;
          font-size:16px;
          font-weight:700;
          cursor:pointer;
          transition:all 0.2s;
        ">
          ✅ Apply Account Change
        </button>

        <div style="font-size:12px;color:#6b7280;margin-top:12px;text-align:center;">
          💡 Manual trades will use the selected account. Copy trades work independently.
        </div>
      </div>
    </div>

    <!-- Trading Mode Accounts -->
    <div class="settings-card">
      <div class="account-grid">
        <!-- Default Trading (Broker-Free) -->
        <div class="account-box manual" id="default-account-box">
          <div class="account-badge" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);">📝 Default</div>
          <div class="account-icon">📝</div>
          <div class="account-title">Default Account</div>
          <div class="account-desc">Track trades without a broker. No API keys needed. FREE!</div>

          <div class="account-status">
            <div class="status-dot" style="background: #10b981;"></div>
            <span>Always Active</span>
          </div>

          <div class="balance-display">
            <div class="balance-label">Virtual Balance</div>
            <div class="balance-amount" id="default-balance-amount" style="color: #8b5cf6;">$100,000.00</div>
          </div>

          <div style="margin-top:16px;padding:12px;background:rgba(139,92,246,0.1);border-radius:8px;font-size:13px;color:#9ca3af;">
            ✅ No broker required<br>
            ✅ Unlimited trades<br>
            ✅ Track performance<br>
            ✅ Share publicly
          </div>

          <button class="btn-primary" id="reset-default-balance-btn" style="margin-top:16px;width:100%;background:linear-gradient(135deg, #f59e0b 0%, #d97706 100%);border:none;padding:12px;border-radius:8px;color:#fff;font-size:14px;font-weight:600;cursor:pointer;transition:all 0.2s;">
            🔄 Reset Balance to $100,000
          </button>
        </div>

        <!-- Paper Trading Account -->
        <div class="account-box paper" id="paper-account-box">
          <div class="account-badge badge-paper">📋 Paper</div>
          <div class="account-icon">📋</div>
          <div class="account-title">Paper Trading</div>
          <div class="account-desc">Practice with fake money. Perfect for testing strategies without risk.</div>
          
          <div class="account-status">
            <div class="status-dot" id="paper-status-dot"></div>
            <span id="paper-status-text">Not Connected</span>
          </div>
          
          <div id="paper-balance" class="balance-display" style="display:none;">
            <div class="balance-label">Paper Balance</div>
            <div class="balance-amount" id="paper-balance-amount">$0.00</div>
          </div>
          
          <div id="paper-message" class="message"></div>
          
          <div id="paper-form">
            <div class="form-group">
              <label class="form-label">Paper API Key</label>
              <input type="text" id="paper-api-key" class="form-input" placeholder="PK...">
            </div>
            
            <div class="form-group">
              <label class="form-label">Paper API Secret</label>
              <input type="password" id="paper-api-secret" class="form-input" placeholder="...">
            </div>
            
            <button class="btn-primary btn-warning" id="save-paper-btn">
              💾 Save Paper Account
            </button>
          </div>
        </div>
        
        <!-- Live Trading Account -->
        <div class="account-box" id="live-account-box">
          <div class="account-badge badge-live">🔴 Live</div>
          <div class="account-icon">💰</div>
          <div class="account-title">Live Trading</div>
          <div class="account-desc">Trade with real money. Use real API keys from Alpaca.</div>
          
          <div class="account-status">
            <div class="status-dot" id="live-status-dot"></div>
            <span id="live-status-text">Not Connected</span>
          </div>
          
          <div id="live-balance" class="balance-display" style="display:none;">
            <div class="balance-label">Live Balance</div>
            <div class="balance-amount" id="live-balance-amount">$0.00</div>
          </div>
          
          <div id="live-message" class="message"></div>
          
          <div id="live-form">
            <div class="form-group">
              <label class="form-label">Live API Key</label>
              <input type="text" id="live-api-key" class="form-input" placeholder="PK...">
            </div>
            
            <div class="form-group">
              <label class="form-label">Live API Secret</label>
              <input type="password" id="live-api-secret" class="form-input" placeholder="...">
            </div>
            
            <button class="btn-primary btn-success" id="save-live-btn">
              💾 Save Live Account
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <script>
    console.log('🚀 [SETTINGS] Script is executing!');
    (function() {
      console.log('🚀 [SETTINGS] IIFE started!');
      var csrfToken = null;
      var currentAccountType = 'default';  // Default to default mode
      var loadAttempts = 0;
      
      async function loadAccountSettings() {
        try {
          const cacheBuster = new Date().getTime();
          const response = await fetch('/api/broker/accounts?' + cacheBuster, {
            credentials: 'include',
            cache: 'no-store'
          });
          
          const data = await response.json();
          console.log('📊 API Response:', data);
          
          const verifyResp = await fetch('/api/auth/verify', { 
            credentials: 'include' 
          });
          const verifyData = await verifyResp.json();
          if (verifyData.valid && verifyData.csrfToken) {
            csrfToken = verifyData.csrfToken;
            console.log('🔐 CSRF token loaded');
          }
          
          if (data.success) {
            const paperStatusDot = document.getElementById('paper-status-dot');
            const paperStatusText = document.getElementById('paper-status-text');
            const paperAccountBox = document.getElementById('paper-account-box');
            const paperBalance = document.getElementById('paper-balance');
            const paperBalanceAmount = document.getElementById('paper-balance-amount');
            const paperForm = document.getElementById('paper-form');
            
            if (paperStatusDot && paperStatusText && paperAccountBox && paperBalance && paperBalanceAmount && paperForm) {
              if (data.paper.connected) {
                paperStatusDot.classList.add('connected');
                paperStatusText.textContent = '✅ Connected';
                paperAccountBox.classList.add('active');
                paperBalance.style.display = 'block';
                paperBalanceAmount.textContent = '$' + data.paper.balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
                
                paperForm.innerHTML = '<div style="background:rgba(16,185,129,0.1);border:1px solid #10b981;border-radius:8px;padding:16px;margin-bottom:12px;text-align:center;"><div style="font-size:14px;color:#10b981;font-weight:600;">✅ Paper Account Connected</div><div style="font-size:12px;color:#9ca3af;margin-top:4px;">Credentials saved securely</div></div><button class="btn-secondary" data-disconnect="paper">🗑️ Disconnect Paper Account</button>';
                
                attachDisconnectListener('paper');
              } else {
                paperStatusDot.classList.remove('connected');
                paperStatusText.textContent = 'Not Connected';
                paperAccountBox.classList.remove('active');
                paperBalance.style.display = 'none';
                
                paperForm.innerHTML = '<div class="form-group"><label class="form-label">Paper API Key</label><input type="text" id="paper-api-key" class="form-input" placeholder="PK..."></div><div class="form-group"><label class="form-label">Paper API Secret</label><input type="password" id="paper-api-secret" class="form-input" placeholder="..."></div><button class="btn-primary btn-warning" id="save-paper-btn">💾 Save Paper Account</button>';
                
                attachSaveListener('paper');
              }
            }
            
            const liveStatusDot = document.getElementById('live-status-dot');
            const liveStatusText = document.getElementById('live-status-text');
            const liveAccountBox = document.getElementById('live-account-box');
            const liveBalance = document.getElementById('live-balance');
            const liveBalanceAmount = document.getElementById('live-balance-amount');
            const liveForm = document.getElementById('live-form');
            
            if (liveStatusDot && liveStatusText && liveAccountBox && liveBalance && liveBalanceAmount && liveForm) {
              if (data.live.connected) {
                liveStatusDot.classList.add('connected');
                liveStatusText.textContent = '✅ Connected';
                liveAccountBox.classList.add('active');
                liveBalance.style.display = 'block';
                liveBalanceAmount.textContent = '$' + data.live.balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
                
                liveForm.innerHTML = '<div style="background:rgba(16,185,129,0.1);border:1px solid #10b981;border-radius:8px;padding:16px;margin-bottom:12px;text-align:center;"><div style="font-size:14px;color:#10b981;font-weight:600;">✅ Live Account Connected</div><div style="font-size:12px;color:#9ca3af;margin-top:4px;">Credentials saved securely</div></div><button class="btn-secondary" data-disconnect="live">🗑️ Disconnect Live Account</button>';
                
                attachDisconnectListener('live');
              } else {
                liveStatusDot.classList.remove('connected');
                liveStatusText.textContent = 'Not Connected';
                liveAccountBox.classList.remove('active');
                liveBalance.style.display = 'none';
                
                liveForm.innerHTML = '<div class="form-group"><label class="form-label">Live API Key</label><input type="text" id="live-api-key" class="form-input" placeholder="PK..."></div><div class="form-group"><label class="form-label">Live API Secret</label><input type="password" id="live-api-secret" class="form-input" placeholder="..."></div><button class="btn-primary btn-success" id="save-live-btn">💾 Save Live Account</button>';
                
                attachSaveListener('live');
              }
            }
            
            currentAccountType = data.activeAccount;
            updateActiveAccountDisplay();

            // Load default account balance
            try {
              const defaultBalanceResp = await fetch('/api/broker/default-balance', { credentials: 'include' });
              const defaultBalanceData = await defaultBalanceResp.json();
              if (defaultBalanceData.success) {
                const defaultBalanceEl = document.getElementById('default-balance-amount');
                if (defaultBalanceEl) {
                  defaultBalanceEl.textContent = '$' + defaultBalanceData.balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
                }
              }
            } catch (err) {
              console.error('Error loading default balance:', err);
            }
          }
        } catch (error) {
          console.error('Error loading settings:', error);
        }
      }
      
      // Track selected account (before submission)
      let selectedAccountType = currentAccountType;

      function updateActiveAccountDisplay() {
        const currentTypeEl = document.getElementById('current-active-type');
        const currentBalanceEl = document.getElementById('current-active-balance');

        if (!currentTypeEl || !currentBalanceEl) return;

        // Update current active account display
        if (currentAccountType === 'default') {
          currentTypeEl.textContent = '💰 Default Account';
          currentTypeEl.style.color = '#10b981';

          fetch('/api/broker/default-balance', { credentials: 'include' })
            .then(res => res.json())
            .then(data => {
              if (data.success && currentBalanceEl) {
                currentBalanceEl.textContent = '$' + data.balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
              }
            })
            .catch(err => {
              console.error('Error fetching default balance:', err);
              currentBalanceEl.textContent = '$100,000.00';
            });
        } else if (currentAccountType === 'paper') {
          currentTypeEl.textContent = '📄 Paper Trading';
          currentTypeEl.style.color = '#3b82f6';

          const paperBalanceAmount = document.getElementById('paper-balance-amount');
          if (paperBalanceAmount) {
            currentBalanceEl.textContent = paperBalanceAmount.textContent;
          }
        } else {
          currentTypeEl.textContent = '🔴 Live Trading';
          currentTypeEl.style.color = '#ef4444';

          const liveBalanceAmount = document.getElementById('live-balance-amount');
          if (liveBalanceAmount) {
            currentBalanceEl.textContent = liveBalanceAmount.textContent;
          }
        }

        // Update button selections
        updateAccountButtons();
      }

      function updateAccountButtons() {
        const defaultBtn = document.getElementById('select-default-btn');
        const paperBtn = document.getElementById('select-paper-btn');
        const liveBtn = document.getElementById('select-live-btn');

        if (!defaultBtn || !paperBtn || !liveBtn) return;

        // Reset all to inactive
        const inactiveStyle = 'background:rgba(255,255,255,0.05);color:#9ca3af;border:3px solid rgba(255,255,255,0.1);';
        defaultBtn.style = inactiveStyle + 'padding:20px;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;transition:all 0.2s;display:flex;flex-direction:column;align-items:center;gap:8px;';
        paperBtn.style = inactiveStyle + 'padding:20px;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;transition:all 0.2s;display:flex;flex-direction:column;align-items:center;gap:8px;';
        liveBtn.style = inactiveStyle + 'padding:20px;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;transition:all 0.2s;display:flex;flex-direction:column;align-items:center;gap:8px;';

        // Activate selected
        if (selectedAccountType === 'default') {
          defaultBtn.style = 'padding:20px;background:linear-gradient(135deg, #10b981 0%, #059669 100%);color:white;border:3px solid #10b981;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;transition:all 0.2s;display:flex;flex-direction:column;align-items:center;gap:8px;';
        } else if (selectedAccountType === 'paper') {
          paperBtn.style = 'padding:20px;background:linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);color:white;border:3px solid #3b82f6;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;transition:all 0.2s;display:flex;flex-direction:column;align-items:center;gap:8px;';
        } else if (selectedAccountType === 'live') {
          liveBtn.style = 'padding:20px;background:linear-gradient(135deg, #ef4444 0%, #dc2626 100%);color:white;border:3px solid #ef4444;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;transition:all 0.2s;display:flex;flex-direction:column;align-items:center;gap:8px;';
        }
      }

      async function resetDefaultBalance() {
        console.log('🔄 resetDefaultBalance called');

        if (!confirm('Reset your Default account balance to $100,000?\\n\\nThis will NOT delete your trade history, only reset the balance.')) {
          return;
        }

        try {
          const response = await fetch('/api/default-account/reset-balance', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json'
            }
          });

          const data = await response.json();

          if (data.success) {
            console.log('✅ Default balance reset successfully');
            alert('✅ Balance reset to $100,000!');

            // Update the displayed balance
            const balanceEl = document.getElementById('default-balance-amount');
            if (balanceEl) {
              balanceEl.textContent = '$' + data.balance.toFixed(2);
            }

            // Reload account settings to refresh everything
            loadAccountSettings();
          } else {
            console.error('❌ Reset failed:', data.error);
            alert('❌ Failed to reset balance: ' + (data.error || 'Unknown error'));
          }
        } catch (error) {
          console.error('❌ Error resetting balance:', error);
          alert('❌ Failed to reset balance. Please try again.');
        }
      }

      async function savePaperAccount() {
        console.log('💾 savePaperAccount called');
        const apiKeyEl = document.getElementById('paper-api-key');
        const apiSecretEl = document.getElementById('paper-api-secret');

        if (!apiKeyEl || !apiSecretEl) {
          console.error('❌ Input fields not found');
          showMessage('paper', '❌ Input fields not found', 'error');
          return;
        }
        
        const apiKey = apiKeyEl.value.trim();
        const apiSecret = apiSecretEl.value.trim();
        
        if (!apiKey || !apiSecret) {
          showMessage('paper', 'Please enter both API key and secret', 'error');
          return;
        }
        
        if (!csrfToken) {
          showMessage('paper', '❌ Session error. Please refresh the page.', 'error');
          return;
        }
        
        showMessage('paper', '⏳ Testing connection...', 'success');
        
        try {
          const response = await fetch('/api/broker/connect', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': csrfToken
            },
            body: JSON.stringify({
              apiKey,
              apiSecret,
              isPaper: true,
              accountType: 'paper'
            })
          });
          
          const data = await response.json();
          
          if (data.success) {
            showMessage('paper', '✅ Connected! Balance: $' + data.buyingPower.toFixed(2), 'success');
            
            setTimeout(() => {
              loadAccountSettings();
            }, 1500);
          } else {
            showMessage('paper', '❌ ' + data.error, 'error');
          }
        } catch (error) {
          showMessage('paper', '❌ Connection error', 'error');
          console.error('Connection error:', error);
        }
      }
      
      async function saveLiveAccount() {
        console.log('💾 saveLiveAccount called');
        const apiKeyEl = document.getElementById('live-api-key');
        const apiSecretEl = document.getElementById('live-api-secret');

        if (!apiKeyEl || !apiSecretEl) {
          console.error('❌ Input fields not found');
          showMessage('live', '❌ Input fields not found', 'error');
          return;
        }
        
        const apiKey = apiKeyEl.value.trim();
        const apiSecret = apiSecretEl.value.trim();
        
        if (!apiKey || !apiSecret) {
          showMessage('live', 'Please enter both API key and secret', 'error');
          return;
        }
        
        if (!confirm('⚠️ You are connecting LIVE trading credentials. Real money will be used. Continue?')) {
          return;
        }
        
        if (!csrfToken) {
          showMessage('live', '❌ Session error. Please refresh the page.', 'error');
          return;
        }
        
        showMessage('live', '⏳ Testing connection...', 'success');
        
        try {
          const response = await fetch('/api/broker/connect', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': csrfToken
            },
            body: JSON.stringify({
              apiKey,
              apiSecret,
              isPaper: false,
              accountType: 'live'
            })
          });
          
          const data = await response.json();
          
          if (data.success) {
            showMessage('live', '✅ Connected! Balance: $' + data.buyingPower.toFixed(2), 'success');
            
            setTimeout(() => {
              loadAccountSettings();
            }, 1500);
          } else {
            showMessage('live', '❌ ' + data.error, 'error');
          }
        } catch (error) {
          showMessage('live', '❌ Connection error', 'error');
          console.error('Connection error:', error);
        }
      }
      
      async function submitAccountChange() {
        if (!csrfToken) {
          alert('❌ Session error. Please refresh the page.');
          return;
        }

        if (selectedAccountType === currentAccountType) {
          alert('ℹ️ This account is already active.');
          return;
        }

        const submitBtn = document.getElementById('submit-account-change-btn');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = '⏳ Switching...';
        submitBtn.disabled = true;

        try {
          const response = await fetch('/api/broker/switch-account', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': csrfToken
            },
            body: JSON.stringify({ accountType: selectedAccountType })
          });

          const data = await response.json();

          if (data.success) {
            currentAccountType = selectedAccountType;
            updateActiveAccountDisplay();

            const modeNames = {
              'default': 'Default Account',
              'paper': 'Paper Trading',
              'live': 'Live Trading'
            };
            alert('✅ Switched to ' + modeNames[selectedAccountType] + '!');
          } else {
            alert('❌ ' + data.error);
          }
        } catch (error) {
          alert('❌ Failed to switch account');
        } finally {
          submitBtn.textContent = originalText;
          submitBtn.disabled = false;
        }
      }
      
      async function disconnectAccount(type) {
        if (!confirm('Disconnect ' + type + ' account?')) return;
        
        if (!csrfToken) {
          showMessage(type, '❌ Session error. Please refresh the page.', 'error');
          return;
        }
        
        try {
          const response = await fetch('/api/broker/disconnect', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': csrfToken
            },
            body: JSON.stringify({ accountType: type })
          });
          
          const data = await response.json();
          
          if (data.success) {
            showMessage(type, '✅ Account disconnected', 'success');
            setTimeout(() => loadAccountSettings(), 1000);
          }
        } catch (error) {
          showMessage(type, '❌ Failed to disconnect', 'error');
        }
      }
      
      function showMessage(type, message, status) {
        const msgEl = document.getElementById(type + '-message');
        if (!msgEl) return;
        
        msgEl.textContent = message;
        msgEl.className = 'message ' + status;
        msgEl.style.display = 'block';
        
        setTimeout(() => {
          msgEl.style.display = 'none';
        }, 5000);
      }
      
      function attachSaveListener(type) {
        const btn = document.getElementById('save-' + type + '-btn');
        if (btn) {
          // Remove any existing listener by cloning the button
          const newBtn = btn.cloneNode(true);
          btn.parentNode.replaceChild(newBtn, btn);
          // Attach new listener
          newBtn.addEventListener('click', type === 'paper' ? savePaperAccount : saveLiveAccount);
          console.log('✅ Attached save listener for ' + type);
        } else {
          console.warn('⚠️ Save button not found for ' + type);
        }
      }

      function attachDisconnectListener(type) {
        const btn = document.querySelector('[data-disconnect="' + type + '"]');
        if (btn) {
          // Remove any existing listener by cloning the button
          const newBtn = btn.cloneNode(true);
          btn.parentNode.replaceChild(newBtn, btn);
          // Attach new listener
          newBtn.addEventListener('click', function() {
            disconnectAccount(type);
          });
          console.log('✅ Attached disconnect listener for ' + type);
        } else {
          console.warn('⚠️ Disconnect button not found for ' + type);
        }
      }
      
      async function initializeSettings() {
        console.log('🔧 Initializing settings page... Time:', new Date().toLocaleTimeString());
        loadAttempts = 0;
        await loadAccountSettings();
        
        const activeText = document.getElementById('active-account-type');
        if (activeText && activeText.textContent === 'Loading...' && loadAttempts < 3) {
          loadAttempts++;
          console.log('🔄 Retrying load (attempt ' + loadAttempts + ')...');
          setTimeout(initializeSettings, 300);
        } else if (activeText && activeText.textContent !== 'Loading...') {
          console.log('✅ Settings loaded successfully!');
        }
      }
      
      // Initialize immediately - DOMContentLoaded won't fire in modal context
      console.log('📄 Starting initialization (modal context)');

      // Attach refresh button listener immediately (button exists in initial HTML)
      const refreshBtn = document.getElementById('refresh-btn');
      if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
          console.log('🔄 Refresh button clicked');
          loadAccountSettings();
        });
        console.log('✅ Refresh button listener attached');
      } else {
        console.error('❌ Refresh button not found!');
      }

      // Attach account selection button listeners
      const selectDefaultBtn = document.getElementById('select-default-btn');
      const selectPaperBtn = document.getElementById('select-paper-btn');
      const selectLiveBtn = document.getElementById('select-live-btn');
      const submitAccountBtn = document.getElementById('submit-account-change-btn');

      if (selectDefaultBtn && selectPaperBtn && selectLiveBtn && submitAccountBtn) {
        selectDefaultBtn.addEventListener('click', function() {
          selectedAccountType = 'default';
          updateAccountButtons();
        });

        selectPaperBtn.addEventListener('click', function() {
          selectedAccountType = 'paper';
          updateAccountButtons();
        });

        selectLiveBtn.addEventListener('click', function() {
          selectedAccountType = 'live';
          updateAccountButtons();
        });

        submitAccountBtn.addEventListener('click', function() {
          submitAccountChange();
        });

        console.log('✅ Account selection buttons listeners attached');
      } else {
        console.error('❌ Account selection buttons not found!');
      }

      // Attach reset default balance button listener
      const resetDefaultBtn = document.getElementById('reset-default-balance-btn');
      if (resetDefaultBtn) {
        resetDefaultBtn.addEventListener('click', function() {
          console.log('🔄 Reset Default balance button clicked');
          resetDefaultBalance();
        });
        console.log('✅ Reset Default balance button listener attached');
      } else {
        console.error('❌ Reset Default balance button not found!');
      }

      // Attach initial save button listeners (buttons exist in initial HTML)
      attachSaveListener('paper');
      attachSaveListener('live');

      // Initialize settings (this will reload and re-attach listeners)
      initializeSettings();
      
      // Removed aggressive auto-refresh listeners to prevent clearing user input
      // Users can manually refresh using the Refresh button if needed

    })();
  </script>
</body>
</html>`;
}
// views/account.js - Account Management Page - SECURED (With Email Management)
export function getAccountHTML() {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Account - GEX Trading</title>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0a0e27 !important;
      color: #e0e6ed;
      padding: 0;
      min-height: 100vh;
      overflow-y: auto;
      overflow-x: hidden;
    }
    
    .container {
      max-width: 100%;
      width: 100%;
      margin: 0;
      padding: 20px 60px 100px 60px;
      min-height: 100vh;
    }
    
    .header {
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #3d4a5c;
    }
    
    .title {
      font-size: 42px;
      font-weight: 700;
      color: #fff;
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    .subtitle {
      font-size: 14px;
      color: #9ca3af;
      margin-top: 8px;
    }
    
    .settings-card {
      background: linear-gradient(135deg, #1a2332 0%, #151b2e 100%);
      border: 2px solid #3d4a5c;
      border-radius: 16px;
      padding: 40px;
      margin-bottom: 30px;
      position: relative;
    }
    
    .settings-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 4px;
      height: 100%;
      background: linear-gradient(180deg, #3b82f6 0%, #8b5cf6 100%);
      border-radius: 16px 0 0 16px;
    }
    
    .card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 32px;
    }
    
    .card-icon {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      flex-shrink: 0;
    }
    
    .card-title {
      font-size: 22px;
      font-weight: 700;
      color: #fff;
    }
    
    .card-subtitle {
      font-size: 14px;
      color: #9ca3af;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
    }
    
    .info-item {
      background: rgba(59, 130, 246, 0.05);
      border: 1px solid #3d4a5c;
      border-radius: 12px;
      padding: 24px;
      transition: all 0.3s ease;
    }
    
    .info-item:hover {
      border-color: #3b82f6;
      background: rgba(59, 130, 246, 0.1);
      transform: translateY(-2px);
    }
    
    .info-label {
      font-size: 12px;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 600;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .info-label::before {
      content: '';
      width: 3px;
      height: 14px;
      background: #3b82f6;
      border-radius: 2px;
    }
    
    .info-value {
      font-size: 20px;
      color: #fff;
      font-weight: 600;
      word-break: break-all;
      line-height: 1.4;
    }
    
    .stats-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }
    
    .stat-box {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
      border: 2px solid #3b82f6;
      border-radius: 16px;
      padding: 40px;
      text-align: center;
      position: relative;
      overflow: hidden;
      min-height: 200px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }
    
    .stat-box::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, rgba(59, 130, 246, 0.05) 0%, transparent 70%);
      animation: pulse 3s ease-in-out infinite;
      pointer-events: none;
      z-index: 0;
    }
    
    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 0.5; }
      50% { transform: scale(1.1); opacity: 0.8; }
    }
    
    .stat-label {
      font-size: 12px;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 16px;
      font-weight: 600;
      position: relative;
      z-index: 2;
    }
    
    .stat-value {
      font-size: 48px;
      font-weight: 700;
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      position: relative;
      z-index: 2;
    }
    
    .stat-box.green {
      border-color: #10b981;
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%);
    }
    
    .stat-box.green::before {
      background: radial-gradient(circle, rgba(16, 185, 129, 0.05) 0%, transparent 70%);
      z-index: 0;
    }
    
    .stat-box.green .stat-value {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      z-index: 2;
    }
    
    .stat-box.orange {
      border-color: #f59e0b;
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.1) 100%);
    }
    
    .stat-box.orange::before {
      background: radial-gradient(circle, rgba(245, 158, 11, 0.05) 0%, transparent 70%);
      z-index: 0;
    }
    
    .stat-box.orange .stat-value {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      z-index: 2;
    }
    
    .three-column-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 30px;
    }
    
    .btn-primary {
      width: 100%;
      padding: 18px;
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      border: none;
      border-radius: 12px;
      color: #fff;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.3s ease;
      text-transform: uppercase;
      letter-spacing: 1px;
      position: relative;
      overflow: hidden;
    }
    
    .btn-primary::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 0;
      height: 0;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.2);
      transform: translate(-50%, -50%);
      transition: width 0.6s, height 0.6s;
    }
    
    .btn-primary:hover::before {
      width: 300px;
      height: 300px;
    }
    
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 40px rgba(59, 130, 246, 0.4);
    }
    
    .btn-danger {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    }
    
    .btn-danger:hover {
      box-shadow: 0 12px 40px rgba(239, 68, 68, 0.4);
    }
    
    .message {
      padding: 16px;
      border-radius: 12px;
      font-size: 14px;
      margin-bottom: 16px;
      display: none;
      font-weight: 500;
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
      padding: 16px;
      background: rgba(10, 14, 39, 0.8);
      border: 2px solid #3d4a5c;
      border-radius: 12px;
      color: #e0e6ed;
      font-size: 15px;
      font-family: inherit;
      transition: all 0.3s ease;
    }
    
    .form-input:focus {
      outline: none;
      border-color: #3b82f6;
      background: rgba(59, 130, 246, 0.05);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title">Account Settings</div>
      <div class="subtitle">Manage your profile and trading preferences</div>
    </div>
    
    <!-- Account Information -->
    <div class="settings-card">
      <div class="card-header">
        <div class="card-icon">👤</div>
        <div>
          <div class="card-title">Profile Information</div>
          <div class="card-subtitle">Your account details</div>
        </div>
      </div>
      
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Username</div>
          <div class="info-value" id="account-username">Loading...</div>
        </div>
        
        <div class="info-item">
          <div class="info-label">Email Address</div>
          <div class="info-value" id="account-email">Loading...</div>
        </div>
        
        <div class="info-item">
          <div class="info-label">Member Since</div>
          <div class="info-value" id="account-created">Loading...</div>
        </div>
        
        <div class="info-item">
          <div class="info-label">Last Login</div>
          <div class="info-value" id="account-last-login">Loading...</div>
        </div>
      </div>
    </div>
    
    <!-- Active Trading Account -->
    <div class="settings-card">
      <div class="card-header">
        <div class="card-icon">📊</div>
        <div>
          <div class="card-title">Trading Account Status</div>
          <div class="card-subtitle">Your active trading configuration</div>
        </div>
      </div>
      
      <div class="stats-container">
        <div class="stat-box" id="active-account-box">
          <div class="stat-label">Active Account</div>
          <div class="stat-value" id="active-account-type">Loading...</div>
        </div>
        
        <div class="stat-box green">
          <div class="stat-label">Buying Power</div>
          <div class="stat-value" id="account-buying-power">$0.00</div>
        </div>
      </div>
    </div>
    
    <!-- Three Column Layout for Email, Password and Logout -->
    <div class="three-column-grid">
      <!-- Email Change Section -->
      <div class="settings-card">
        <div class="card-header">
          <div class="card-icon">📧</div>
          <div>
            <div class="card-title">Email Settings</div>
            <div class="card-subtitle">Add or change email</div>
          </div>
        </div>
        
        <div id="email-message" class="message"></div>
        
        <div class="form-group">
          <label class="form-label">New Gmail Address</label>
          <input type="email" id="new-email" class="form-input" placeholder="your@gmail.com">
        </div>
        
        <div class="form-group">
          <label class="form-label">Confirm Password</label>
          <input type="password" id="email-password" class="form-input" placeholder="Enter your password">
        </div>
        
        <button class="btn-primary" id="change-email-btn">
          <span style="position: relative; z-index: 1;">Update Email</span>
        </button>
      </div>
      
      <!-- Password Change Section -->
      <div class="settings-card">
        <div class="card-header">
          <div class="card-icon">🔒</div>
          <div>
            <div class="card-title">Security Settings</div>
            <div class="card-subtitle">Update your password</div>
          </div>
        </div>
        
        <div id="password-message" class="message"></div>
        
        <div class="form-group">
          <label class="form-label">Current Password</label>
          <input type="password" id="current-password" class="form-input" placeholder="Enter current password">
        </div>
        
        <div class="form-group">
          <label class="form-label">New Password</label>
          <input type="password" id="new-password" class="form-input" placeholder="Enter new password">
        </div>
        
        <button class="btn-primary" id="change-password-btn">
          <span style="position: relative; z-index: 1;">Update Password</span>
        </button>
      </div>
      
      <!-- Logout Section -->
      <div class="settings-card">
        <div class="card-header">
          <div class="card-icon">🚪</div>
          <div>
            <div class="card-title">Session Management</div>
            <div class="card-subtitle">End your current session</div>
          </div>
        </div>
        
        <div id="logout-message" class="message"></div>
        
        <div style="display: flex; flex-direction: column; justify-content: center; height: calc(100% - 80px);">
          <p style="color: #9ca3af; margin-bottom: 24px; text-align: center;">
            Click the button below to securely log out of your account.
          </p>
          
          <button class="btn-primary btn-danger" id="logout-btn">
            <span style="position: relative; z-index: 1;">Logout</span>
          </button>
        </div>
      </div>
    </div>
  </div>
  
  <script>
    var csrfToken = null;
    
    // Immediate execution
    (async function() {
      await loadAccountInfo();
    })();
    
    async function loadAccountInfo() {
      try {
        const response = await fetch('/api/auth/verify', {
          credentials: 'include'
        });
        
        const data = await response.json();
        
        if (!data.valid) {
          document.getElementById('account-username').textContent = 'Session Expired';
          document.getElementById('account-email').textContent = 'Please login again';
          return;
        }
        
        // Store CSRF token
        csrfToken = data.csrfToken;
        console.log('🔐 CSRF token loaded');
        
        document.getElementById('account-username').textContent = data.username || 'N/A';
        document.getElementById('account-email').textContent = data.email || 'Not provided';
        document.getElementById('account-created').textContent = data.createdAt ? new Date(data.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
        document.getElementById('account-last-login').textContent = data.lastLogin ? new Date(data.lastLogin).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
        
        const accountResponse = await fetch('/api/broker/accounts', {
          credentials: 'include'
        });
        
        const accountData = await accountResponse.json();
        
        if (accountData.success) {
          const activeType = accountData.activeAccount || 'default';
          const activeBox = document.getElementById('active-account-box');

          if (activeType === 'default') {
            activeBox.className = 'stat-box';
            activeBox.style.borderColor = '#8b5cf6';
            activeBox.style.background = 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%)';
            document.getElementById('active-account-type').textContent = 'Default Account';

            // Fetch default balance
            fetch('/api/broker/default-balance', { credentials: 'include' })
              .then(res => res.json())
              .then(defaultData => {
                if (defaultData.success) {
                  document.getElementById('account-buying-power').textContent = '$' + defaultData.balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
                  document.getElementById('account-buying-power').parentElement.querySelector('.stat-value').style.background = 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)';
                  document.getElementById('account-buying-power').parentElement.querySelector('.stat-value').style.webkitBackgroundClip = 'text';
                  document.getElementById('account-buying-power').parentElement.querySelector('.stat-value').style.webkitTextFillColor = 'transparent';
                }
              })
              .catch(err => {
                console.error('Error fetching default balance:', err);
                document.getElementById('account-buying-power').textContent = '$100,000.00';
              });
          } else if (activeType === 'paper') {
            activeBox.className = 'stat-box orange';
            document.getElementById('active-account-type').textContent = 'Paper Trading';
            document.getElementById('account-buying-power').textContent = '$' + accountData.paper.balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
          } else {
            activeBox.className = 'stat-box green';
            document.getElementById('active-account-type').textContent = 'Live Trading';
            document.getElementById('account-buying-power').textContent = '$' + accountData.live.balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
          }
        }
        
      } catch (error) {
        console.error('Error loading account info:', error);
      }
    }
    
    async function handleEmailChange() {
      const newEmail = document.getElementById('new-email').value.trim();
      const password = document.getElementById('email-password').value;
      
      if (!newEmail || !password) {
        showMessage('email', 'Please enter both email and password', 'error');
        return;
      }
      
      // Validate Gmail
      if (!newEmail.endsWith('@gmail.com')) {
        showMessage('email', 'Only Gmail addresses are allowed', 'error');
        return;
      }
      
      if (!csrfToken) {
        showMessage('email', '❌ Session error. Please refresh the page.', 'error');
        return;
      }
      
      try {
        const response = await fetch('/api/auth/change-email', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken
          },
          body: JSON.stringify({ newEmail, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
          showMessage('email', '✅ Email updated! Check your inbox for verification.', 'success');
          document.getElementById('new-email').value = '';
          document.getElementById('email-password').value = '';
          
          // Reload account info
          setTimeout(() => loadAccountInfo(), 2000);
        } else {
          showMessage('email', '❌ ' + (data.error || 'Failed to update email'), 'error');
        }
      } catch (error) {
        showMessage('email', '❌ Connection error', 'error');
      }
    }
    
    async function handlePasswordChange() {
      const currentPassword = document.getElementById('current-password').value;
      const newPassword = document.getElementById('new-password').value;
      
      if (!currentPassword || !newPassword) {
        showMessage('password', 'Please fill in all password fields', 'error');
        return;
      }
      
      if (newPassword.length < 12) {
        showMessage('password', 'Password must be at least 12 characters', 'error');
        return;
      }
      
      if (!csrfToken) {
        showMessage('password', '❌ Session error. Please refresh the page.', 'error');
        return;
      }
      
      try {
        const response = await fetch('/api/auth/change-password', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken
          },
          body: JSON.stringify({ currentPassword, newPassword })
        });
        
        const data = await response.json();
        
        if (data.success) {
          showMessage('password', '✅ Password updated successfully!', 'success');
          document.getElementById('current-password').value = '';
          document.getElementById('new-password').value = '';
          
          // Update CSRF token after password change (server rotates session)
          const verifyResp = await fetch('/api/auth/verify', { credentials: 'include' });
          const verifyData = await verifyResp.json();
          if (verifyData.valid && verifyData.csrfToken) {
            csrfToken = verifyData.csrfToken;
            console.log('🔄 CSRF token updated after password change');
          }
        } else {
          showMessage('password', '❌ ' + (data.error || 'Failed to update password'), 'error');
        }
      } catch (error) {
        showMessage('password', '❌ Connection error', 'error');
      }
    }
    
    async function handleLogout() {
      if (!confirm('Are you sure you want to logout?')) {
        return;
      }
      
      if (!csrfToken) {
        showMessage('logout', '❌ Session error. Redirecting to login...', 'error');
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
        return;
      }
      
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'X-CSRF-Token': csrfToken
          }
        });

        // Clear sessionStorage to reset view on next login
        sessionStorage.clear();

        showMessage('logout', '✅ Logged out successfully! Redirecting...', 'success');

        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
        
      } catch (error) {
        console.error('Logout error:', error);
        showMessage('logout', '❌ Logout failed', 'error');
      }
    }
    
    function showMessage(type, message, status) {
      const msgEl = document.getElementById(type + '-message');
      msgEl.textContent = message;
      msgEl.className = 'message ' + status;
      msgEl.style.display = 'block';
      
      setTimeout(() => {
        msgEl.style.display = 'none';
      }, 5000);
    }
    
    // Event Listeners - FIXED: Attach immediately instead of waiting for DOMContentLoaded
    // This is necessary because the content is loaded dynamically into a modal
    (function attachEventListeners() {
      console.log('🔧 Attaching account page event listeners...');
      
      const changeEmailBtn = document.getElementById('change-email-btn');
      if (changeEmailBtn) {
        changeEmailBtn.addEventListener('click', handleEmailChange);
        console.log('✅ Email change button listener attached');
      } else {
        console.warn('⚠️ Email change button not found');
      }
      
      const changePasswordBtn = document.getElementById('change-password-btn');
      if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', handlePasswordChange);
        console.log('✅ Password change button listener attached');
      } else {
        console.warn('⚠️ Password change button not found');
      }
      
      const logoutBtn = document.getElementById('logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
        console.log('✅ Logout button listener attached');
      } else {
        console.warn('⚠️ Logout button not found');
      }
    })();
  </script>
</body>
</html>`;
}
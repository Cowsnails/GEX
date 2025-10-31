// views/login.js - Login Page - SECURED (No localStorage, Server Sets HttpOnly Cookie)
export function getLoginHTML() {
  return `<!DOCTYPE html>
<html>
<head>
  <title>GEX Trading Intelligence - Login</title>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #0a0e27 0%, #1a2332 100%);
      color: #e0e6ed;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .auth-container {
      background: linear-gradient(135deg, #1a2332 0%, #151b2e 100%);
      border: 2px solid #3d4a5c;
      border-radius: 16px;
      padding: 48px;
      width: 100%;
      max-width: 480px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    }
    
    .logo {
      text-align: center;
      margin-bottom: 40px;
    }
    
    .logo-icon {
      font-size: 64px;
      margin-bottom: 16px;
    }
    
    .logo-text {
      font-size: 28px;
      font-weight: 700;
      color: #fff;
    }
    
    .logo-accent {
      color: #3b82f6;
    }
    
    .subtitle {
      text-align: center;
      color: #9ca3af;
      font-size: 14px;
      margin-bottom: 32px;
    }
    
    .form-group {
      margin-bottom: 24px;
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
      padding: 16px;
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      border: none;
      border-radius: 8px;
      color: #fff;
      font-size: 16px;
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
    
    .btn-secondary {
      width: 100%;
      padding: 16px;
      background: transparent;
      border: 2px solid #3d4a5c;
      border-radius: 8px;
      color: #9ca3af;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      margin-top: 12px;
    }
    
    .btn-secondary:hover {
      border-color: #3b82f6;
      color: #3b82f6;
    }
    
    .divider {
      text-align: center;
      color: #6b7280;
      font-size: 13px;
      margin: 24px 0;
      position: relative;
    }
    
    .divider::before,
    .divider::after {
      content: '';
      position: absolute;
      top: 50%;
      width: 40%;
      height: 1px;
      background: #3d4a5c;
    }
    
    .divider::before { left: 0; }
    .divider::after { right: 0; }
    
    .error-message {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid #ef4444;
      border-radius: 8px;
      padding: 12px;
      color: #fca5a5;
      font-size: 13px;
      margin-bottom: 16px;
      display: none;
    }
    
    .success-message {
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid #10b981;
      border-radius: 8px;
      padding: 12px;
      color: #6ee7b7;
      font-size: 13px;
      margin-bottom: 16px;
      display: none;
    }
    
    .hidden {
      display: none !important;
    }
    
    .checkbox-group {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
    }
    
    .checkbox-group input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }
    
    .checkbox-group label {
      font-size: 13px;
      color: #9ca3af;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="auth-container">
    <!-- Login Form -->
    <div id="loginForm">
      <div class="logo">
        <div class="logo-icon">&#127919;</div>
        <div class="logo-text"><span class="logo-accent">GEX</span> Trading Intelligence</div>
      </div>
      <div class="subtitle">Professional Options Flow Analysis</div>
      
      <div id="loginError" class="error-message"></div>
      
      <div class="form-group">
        <label class="form-label">Username</label>
        <input type="text" id="loginUsername" class="form-input" placeholder="Enter username" autocomplete="username">
      </div>
      
      <div class="form-group">
        <label class="form-label">Password</label>
        <input type="password" id="loginPassword" class="form-input" placeholder="Enter password" autocomplete="current-password">
      </div>
      
      <button class="btn-primary" id="loginBtn">Sign In</button>
      
      <div class="divider">OR</div>
      
      <button class="btn-secondary" id="showRegisterBtn">Create New Account</button>
    </div>
    
    <!-- Register Form -->
    <div id="registerForm" class="hidden">
      <div class="logo">
        <div class="logo-icon">&#127919;</div>
        <div class="logo-text"><span class="logo-accent">GEX</span> Trading Intelligence</div>
      </div>
      <div class="subtitle">Create Your Account</div>
      
      <div id="registerError" class="error-message"></div>
      <div id="registerSuccess" class="success-message"></div>
      
      <div class="form-group">
        <label class="form-label">Username</label>
        <input type="text" id="registerUsername" class="form-input" placeholder="Choose username" autocomplete="username">
      </div>
      
      <div class="form-group">
        <label class="form-label">Email (Optional)</label>
        <input type="email" id="registerEmail" class="form-input" placeholder="your@email.com" autocomplete="email">
      </div>
      
      <div class="form-group">
        <label class="form-label">Password</label>
        <input type="password" id="registerPassword" class="form-input" placeholder="Create password (min 12 chars)" autocomplete="new-password">
      </div>
      
      <button class="btn-primary" id="registerBtn">Create Account</button>
      
      <button class="btn-secondary" id="showLoginBtn">Back to Sign In</button>
    </div>
    
    <!-- Broker Setup -->
    <div id="brokerSetup" class="hidden">
      <div class="logo">
        <div class="logo-icon">&#127919;</div>
        <div class="logo-text">Connect Your Broker</div>
      </div>
      
      <div id="brokerError" class="error-message"></div>
      <div id="brokerSuccess" class="success-message"></div>
      
      <div class="form-group">
        <label class="form-label">API Key</label>
        <input type="text" id="alpacaApiKey" class="form-input" placeholder="PK..." autocomplete="off">
      </div>
      
      <div class="form-group">
        <label class="form-label">API Secret</label>
        <input type="password" id="alpacaApiSecret" class="form-input" placeholder="..." autocomplete="off">
      </div>
      
      <div class="checkbox-group">
        <input type="checkbox" id="isPaper" checked>
        <label for="isPaper">Use Paper Trading (Recommended)</label>
      </div>
      
      <button class="btn-primary" id="brokerConnectBtn">Test & Save Connection</button>
      
      <button class="btn-secondary" id="skipBrokerBtn">Skip for Now</button>
    </div>
  </div>
  
  <script>
    let csrfToken = null;
    
    function showRegister() {
      document.getElementById('loginForm').classList.add('hidden');
      document.getElementById('registerForm').classList.remove('hidden');
    }
    
    function showLogin() {
      document.getElementById('registerForm').classList.add('hidden');
      document.getElementById('loginForm').classList.remove('hidden');
    }
    
    function showBrokerSetup() {
      document.getElementById('loginForm').classList.add('hidden');
      document.getElementById('registerForm').classList.add('hidden');
      document.getElementById('brokerSetup').classList.remove('hidden');
    }
    
    async function handleLogin() {
      const username = document.getElementById('loginUsername').value.trim();
      const password = document.getElementById('loginPassword').value;
      
      if (!username || !password) {
        showError('loginError', 'Please enter username and password');
        return;
      }
      
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (!data.success) {
          let errorMsg = data.error || 'Login failed';
          if (data.remainingAttempts !== undefined && data.remainingAttempts > 0) {
            errorMsg += ' (' + data.remainingAttempts + ' attempts remaining)';
          }
          showError('loginError', errorMsg);
          return;
        }
        
        csrfToken = data.csrfToken;
        console.log('[AUTH] Login successful');
        
        // Skip broker setup - users can configure it later in Settings
        window.location.href = '/';
        
      } catch (error) {
        showError('loginError', 'Connection error. Please try again.');
      }
    }
    
    async function handleRegister() {
      const username = document.getElementById('registerUsername').value.trim();
      const email = document.getElementById('registerEmail').value.trim();
      const password = document.getElementById('registerPassword').value;
      
      if (!username || !password) {
        showError('registerError', 'Username and password are required');
        return;
      }
      
      if (password.length < 12) {
        showError('registerError', 'Password must be at least 12 characters');
        return;
      }
      
      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json();
        
        if (!data.success) {
          const errorMsg = data.errors ? data.errors.join(', ') : (data.error || 'Registration failed');
          showError('registerError', errorMsg);
          return;
        }
        
        showSuccess('registerSuccess', 'Account created! You can now sign in.');
        setTimeout(() => {
          showLogin();
        }, 2000);
        
      } catch (error) {
        showError('registerError', 'Connection error. Please try again.');
      }
    }
    
    async function handleBrokerConnect() {
      const apiKey = document.getElementById('alpacaApiKey').value.trim();
      const apiSecret = document.getElementById('alpacaApiSecret').value.trim();
      const isPaper = document.getElementById('isPaper').checked;
      
      if (!apiKey || !apiSecret) {
        showError('brokerError', 'Please enter both API key and secret');
        return;
      }
      
      if (!csrfToken) {
        showError('brokerError', 'Session error. Please login again.');
        return;
      }
      
      try {
        const response = await fetch('/api/broker/connect', {
          method: 'POST',
          credentials: 'include',
          headers: { 
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken
          },
          body: JSON.stringify({ apiKey, apiSecret, isPaper, accountType: isPaper ? 'paper' : 'live' })
        });
        
        const data = await response.json();
        
        if (!data.success) {
          showError('brokerError', data.error || 'Connection failed');
          return;
        }
        
        showSuccess('brokerSuccess', 'Connected! Buying Power: $' + data.buyingPower.toFixed(2));
        
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
        
      } catch (error) {
        showError('brokerError', 'Connection error. Please check your credentials.');
      }
    }
    
    function skipBrokerSetup() {
      window.location.href = '/';
    }
    
    function showError(elementId, message) {
      const el = document.getElementById(elementId);
      el.textContent = message;
      el.style.display = 'block';
    }
    
    function showSuccess(elementId, message) {
      const el = document.getElementById(elementId);
      el.textContent = message;
      el.style.display = 'block';
    }
    
    window.addEventListener('DOMContentLoaded', async () => {
      document.getElementById('loginBtn').addEventListener('click', handleLogin);
      document.getElementById('showRegisterBtn').addEventListener('click', showRegister);
      document.getElementById('registerBtn').addEventListener('click', handleRegister);
      document.getElementById('showLoginBtn').addEventListener('click', showLogin);
      document.getElementById('brokerConnectBtn').addEventListener('click', handleBrokerConnect);
      document.getElementById('skipBrokerBtn').addEventListener('click', skipBrokerSetup);
      
      // Don't auto-redirect on login page - let user login first
    });
    
    document.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        if (!document.getElementById('loginForm').classList.contains('hidden')) {
          handleLogin();
        } else if (!document.getElementById('registerForm').classList.contains('hidden')) {
          handleRegister();
        } else if (!document.getElementById('brokerSetup').classList.contains('hidden')) {
          handleBrokerConnect();
        }
      }
    });
  </script>
</body>
</html>`;
}
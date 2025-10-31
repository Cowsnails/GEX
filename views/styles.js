// views/styles.js - Application Styles with Chat Widget
export const styles = `
  * { margin: 0; padding: 0; box-sizing: border-box; }

  /* 🎨 Ambient Background Layer */
  #ambient-background {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 9999;
    pointer-events: none;
    mix-blend-mode: screen;
    opacity: 0.45;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #000;
    color: #e0e6ed;
    overflow: hidden;
    height: 100vh;
  }
  .container {
    height: 100vh;
    display: flex;
    flex-direction: column;
    position: relative;
    z-index: 1;
  }
  
  /* Header Styles */
  .header {
    background: linear-gradient(135deg, rgba(26, 35, 50, 0.85) 0%, rgba(42, 53, 71, 0.85) 100%);
    backdrop-filter: blur(10px) saturate(1.2);
    -webkit-backdrop-filter: blur(10px) saturate(1.2);
    border-bottom: 1px solid rgba(61, 74, 92, 0.6);
    padding: 12px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  }
  .title {
    font-size: 20px;
    font-weight: 600;
    color: #fff;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .title-accent {
    color: #3b82f6;
    font-weight: 700;
  }
  .status-bar {
    display: flex;
    gap: 20px;
    align-items: center;
    font-size: 13px;
  }
  .status-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: rgba(59, 130, 246, 0.1);
    border-radius: 6px;
    border: 1px solid rgba(59, 130, 246, 0.2);
  }
  
  /* Navigation */
  .nav-bar {
    background: rgba(21, 27, 46, 0.85);
    backdrop-filter: blur(10px) saturate(1.2);
    -webkit-backdrop-filter: blur(10px) saturate(1.2);
    border-bottom: 1px solid rgba(42, 53, 71, 0.6);
    padding: 12px 24px;
    display: flex;
    gap: 12px;
    align-items: center;
  }
  .nav-btn {
    padding: 10px 20px;
    background: transparent;
    border: 1px solid #3d4a5c;
    color: #9ca3af;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
    font-size: 13px;
    font-weight: 500;
    border-radius: 6px;
  }
  .nav-btn:hover {
    background: rgba(59, 130, 246, 0.1);
    border-color: #3b82f6;
    color: #3b82f6;
  }
  .nav-btn.active {
    background: #3b82f6;
    color: #fff;
    border-color: #3b82f6;
  }
  .controls {
    display: flex;
    gap: 10px;
    align-items: center;
    margin-left: auto;
  }
  input, select {
    padding: 10px 14px;
    background: #1a2332;
    border: 1px solid #3d4a5c;
    color: #e0e6ed;
    font-family: inherit;
    font-size: 13px;
    border-radius: 6px;
    transition: all 0.2s;
  }
  input:focus, select:focus {
    outline: none;
    border-color: #3b82f6;
    background: #202838;
  }
  .filter-btn {
    padding: 10px 16px;
    background: #1a2332;
    border: 1px solid #3d4a5c;
    color: #9ca3af;
    cursor: pointer;
    font-size: 12px;
    border-radius: 6px;
    transition: all 0.2s;
    font-weight: 500;
  }
  .filter-btn:hover {
    border-color: #3b82f6;
    color: #3b82f6;
  }
  .filter-btn.active {
    background: #3b82f6;
    color: #fff;
    border-color: #3b82f6;
  }
  
  /* Content Area */
  .content {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
    background: transparent;
  }

  /* Component Styles */
  .signal-hero {
    background: linear-gradient(135deg, rgba(26, 35, 50, 0.85) 0%, rgba(21, 27, 46, 0.85) 100%);
    backdrop-filter: blur(10px) saturate(1.2);
    -webkit-backdrop-filter: blur(10px) saturate(1.2);
    border: 2px solid rgba(61, 74, 92, 0.6);
    border-radius: 16px;
    padding: 40px;
    text-align: center;
    margin-bottom: 24px;
    position: relative;
    overflow: hidden;
  }
  .signal-hero::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #10b981, #3b82f6, #8b5cf6);
  }
  .signal-status {
    font-size: 18px;
    color: #9ca3af;
    margin-bottom: 16px;
    text-transform: uppercase;
    letter-spacing: 2px;
    font-weight: 600;
  }
  .signal-action {
    font-size: 64px;
    font-weight: 900;
    margin-bottom: 20px;
    text-transform: uppercase;
    letter-spacing: 2px;
  }
  .signal-buy { color: #10b981; text-shadow: 0 0 30px rgba(16, 185, 129, 0.5); }
  .signal-sell { color: #ef4444; text-shadow: 0 0 30px rgba(239, 68, 68, 0.5); }
  .signal-wait { color: #f59e0b; text-shadow: 0 0 30px rgba(245, 158, 11, 0.5); }
  .signal-neutral { color: #6b7280; }
  
  .signal-subtitle {
    font-size: 20px;
    color: #9ca3af;
    margin-bottom: 24px;
  }
  .signal-confidence {
    display: inline-block;
    padding: 12px 32px;
    background: rgba(59, 130, 246, 0.15);
    border: 1px solid #3b82f6;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 32px;
  }
  
  .signal-metrics {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-top: 32px;
  }
  .signal-metric {
    background: rgba(59, 130, 246, 0.05);
    padding: 16px;
    border-radius: 8px;
    border: 1px solid #2a3547;
  }
  .signal-metric-label {
    font-size: 11px;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 8px;
  }
  .signal-metric-value {
    font-size: 24px;
    font-weight: 700;
  }
  
  .insight-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 24px;
  }
  .insight-card {
    background: linear-gradient(135deg, #1a2332 0%, #151b2e 100%);
    border: 1px solid #2a3547;
    border-radius: 12px;
    padding: 24px;
  }
  .insight-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }
  .insight-icon {
    font-size: 28px;
  }
  .insight-title {
    font-size: 16px;
    font-weight: 600;
    color: #fff;
  }
  .insight-body {
    font-size: 14px;
    line-height: 1.6;
    color: #9ca3af;
  }
  .insight-highlight {
    color: #3b82f6;
    font-weight: 600;
  }
  
  .alert-zone {
    background: linear-gradient(135deg, #7c2d12 0%, #991b1b 100%);
    border: 2px solid #dc2626;
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 24px;
    animation: pulse 2s infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.8; }
  }
  .alert-title {
    font-size: 18px;
    font-weight: 700;
    color: #fff;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .alert-message {
    font-size: 14px;
    color: #fecaca;
  }
  
  .action-items {
    background: linear-gradient(135deg, #1a2332 0%, #151b2e 100%);
    border: 1px solid #2a3547;
    border-radius: 12px;
    padding: 24px;
  }
  .action-item {
    display: flex;
    align-items: start;
    gap: 16px;
    padding: 16px;
    background: rgba(59, 130, 246, 0.05);
    border-radius: 8px;
    margin-bottom: 12px;
    border-left: 3px solid #3b82f6;
  }
  .action-number {
    min-width: 32px;
    height: 32px;
    background: #3b82f6;
    color: #fff;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 14px;
  }
  .action-content {
    flex: 1;
  }
  .action-title {
    font-weight: 600;
    margin-bottom: 4px;
    color: #fff;
  }
  .action-desc {
    font-size: 13px;
    color: #9ca3af;
  }
  
  .gex-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 24px;
  }
  .gex-card {
    background: linear-gradient(135deg, #1a2332 0%, #151b2e 100%);
    border: 1px solid #2a3547;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  }
  .gex-card-title {
    font-size: 14px;
    color: #9ca3af;
    margin-bottom: 12px;
    text-transform: uppercase;
    font-weight: 600;
    letter-spacing: 0.5px;
  }
  .gex-value {
    font-size: 32px;
    font-weight: 700;
    margin-bottom: 8px;
  }
  .gex-subtitle {
    font-size: 12px;
    color: #6b7280;
  }
  .positive { color: #10b981; }
  .negative { color: #ef4444; }
  .neutral { color: #3b82f6; }
  
  .chart-container {
    background: linear-gradient(135deg, #1a2332 0%, #151b2e 100%);
    border: 1px solid #2a3547;
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 24px;
    height: 400px;
  }
  
  .strike-levels {
    background: linear-gradient(135deg, #1a2332 0%, #151b2e 100%);
    border: 1px solid #2a3547;
    border-radius: 12px;
    padding: 20px;
  }
  .strike-bar {
    display: flex;
    align-items: center;
    padding: 12px;
    margin-bottom: 8px;
    background: rgba(59, 130, 246, 0.05);
    border-radius: 6px;
    border-left: 3px solid #3b82f6;
    transition: all 0.2s;
  }
  .strike-bar:hover {
    background: rgba(59, 130, 246, 0.1);
    transform: translateX(4px);
  }
  .strike-label {
    min-width: 80px;
    font-weight: 600;
  }
  .strike-bar-fill {
    flex: 1;
    height: 24px;
    background: linear-gradient(90deg, #3b82f6, #60a5fa);
    border-radius: 4px;
    margin: 0 12px;
  }
  .strike-bar-value {
    min-width: 100px;
    text-align: right;
    font-weight: 500;
  }
  
  .grid {
    display: grid;
    gap: 1px;
    background: #2a3547;
    border: 1px solid #2a3547;
    border-radius: 8px;
    overflow: hidden;
  }
  .grid-9 { grid-template-columns: repeat(9, 1fr); }
  .grid-header {
    background: #1a2332;
    padding: 14px 12px;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 11px;
    color: #9ca3af;
    letter-spacing: 0.5px;
  }
  .grid-row {
    background: #151b2e;
    padding: 12px;
    transition: background 0.2s;
    font-size: 13px;
  }
  .grid-row:hover {
    background: #1a2332;
  }
  .call-row { border-left: 3px solid #10b981; }
  .put-row { border-left: 3px solid #ef4444; }
  
  .metric-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 24px;
  }
  .metric-card {
    background: linear-gradient(135deg, #1a2332 0%, #151b2e 100%);
    border: 1px solid #2a3547;
    border-radius: 12px;
    padding: 20px;
    transition: all 0.2s;
  }
  .metric-card:hover {
    border-color: #3b82f6;
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(59, 130, 246, 0.2);
  }
  .metric-title {
    font-size: 12px;
    color: #9ca3af;
    margin-bottom: 10px;
    text-transform: uppercase;
    font-weight: 600;
  }
  .metric-value {
    font-size: 28px;
    font-weight: 700;
  }
  .atm { 
    font-weight: 700;
    background: rgba(59, 130, 246, 0.1);
    border-color: #3b82f6;
  }
  
  /* 💬 CHAT WIDGET STYLES */
  .chat-widget {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 350px;
    background: linear-gradient(135deg, #1a2332 0%, #151b2e 100%);
    border: 2px solid #3d4a5c;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    z-index: 9998;
    transition: all 0.3s ease;
    display: flex;
    flex-direction: column;
  }
  
  .chat-widget.collapsed {
    height: 60px;
  }
  
  .chat-widget.expanded {
    height: 600px;
  }
  
  .chat-widget-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    background: linear-gradient(135deg, #2a3547 0%, #1a2332 100%);
    border-radius: 10px 10px 0 0;
    cursor: pointer;
    border-bottom: 1px solid #3d4a5c;
  }
  
  .chat-widget-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 15px;
    font-weight: 700;
    color: #fff;
  }
  
  .chat-icon {
    font-size: 20px;
  }
  
  .chat-online-count {
    font-size: 11px;
    color: #10b981;
    background: rgba(16, 185, 129, 0.1);
    padding: 4px 8px;
    border-radius: 6px;
    font-weight: 600;
  }
  
  .chat-toggle-btn {
    background: transparent;
    border: none;
    color: #9ca3af;
    cursor: pointer;
    padding: 4px 8px;
    transition: all 0.2s;
    font-size: 16px;
  }
  
  .chat-toggle-btn:hover {
    color: #3b82f6;
  }
  
  .chat-widget-body {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease;
  }
  
  .chat-widget.expanded .chat-widget-body {
    opacity: 1;
    pointer-events: all;
  }
  
  .chat-online-users {
    background: rgba(59, 130, 246, 0.05);
    border-bottom: 1px solid #3d4a5c;
    padding: 12px 16px;
    max-height: 120px;
    overflow-y: auto;
  }
  
  .chat-online-header {
    font-size: 11px;
    font-weight: 700;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
  }
  
  .chat-online-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  
  .chat-online-user {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: #e0e6ed;
    padding: 4px;
  }
  
  .chat-user-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #10b981;
    box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
    animation: pulse-dot 2s infinite;
  }
  
  @keyframes pulse-dot {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  
  .chat-user-name {
    font-weight: 500;
  }
  
  .chat-user-admin-badge {
    font-size: 11px;
    margin-left: 4px;
  }
  
  .chat-empty-users {
    text-align: center;
    color: #6b7280;
    font-size: 12px;
    padding: 8px;
  }
  
  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .chat-message {
    background: rgba(59, 130, 246, 0.05);
    border: 1px solid #2a3547;
    border-radius: 8px;
    padding: 10px;
    transition: all 0.2s;
  }
  
  .chat-message:hover {
    background: rgba(59, 130, 246, 0.1);
    border-color: #3b82f6;
  }
  
  .chat-message-new {
    animation: slideIn 0.3s ease;
  }
  
  @keyframes slideIn {
    from {
      transform: translateX(20px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  .chat-message-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }
  
  .chat-message-user {
    font-size: 13px;
    font-weight: 600;
    color: #3b82f6;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  .chat-admin-badge {
    font-size: 12px;
  }
  
  .chat-message-time {
    font-size: 11px;
    color: #6b7280;
  }
  
  .chat-message-text {
    font-size: 13px;
    color: #e0e6ed;
    line-height: 1.5;
    word-wrap: break-word;
  }
  
  .chat-input-container {
    display: flex;
    gap: 8px;
    padding: 12px 16px;
    border-top: 1px solid #3d4a5c;
    background: rgba(26, 35, 50, 0.5);
  }
  
  .chat-input {
    flex: 1;
    padding: 10px 12px;
    background: #0a0e27;
    border: 2px solid #3d4a5c;
    border-radius: 6px;
    color: #e0e6ed;
    font-size: 13px;
    font-family: inherit;
    transition: all 0.2s;
  }
  
  .chat-input:focus {
    outline: none;
    border-color: #3b82f6;
    background: #151b2e;
  }
  
  .chat-send-btn {
    padding: 10px 16px;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    border: none;
    border-radius: 6px;
    color: #fff;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .chat-send-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  }
  
  .chat-send-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
  
  .chat-char-count {
    padding: 4px 16px 12px;
    text-align: right;
    font-size: 11px;
    color: #9ca3af;
  }
  
  .chat-loading,
  .chat-empty,
  .chat-error {
    text-align: center;
    padding: 40px 20px;
    color: #9ca3af;
    font-size: 13px;
  }
  
  .chat-error {
    color: #ef4444;
  }
  
  /* Scrollbar for chat */
  .chat-messages::-webkit-scrollbar,
  .chat-online-users::-webkit-scrollbar {
    width: 6px;
  }
  
  .chat-messages::-webkit-scrollbar-track,
  .chat-online-users::-webkit-scrollbar-track {
    background: #0a0e27;
  }
  
  .chat-messages::-webkit-scrollbar-thumb,
  .chat-online-users::-webkit-scrollbar-thumb {
    background: #3b82f6;
    border-radius: 3px;
  }
  
  .chat-messages::-webkit-scrollbar-thumb:hover,
  .chat-online-users::-webkit-scrollbar-thumb:hover {
    background: #60a5fa;
  }
  
  ::-webkit-scrollbar {
    width: 8px;
  }
  ::-webkit-scrollbar-track {
    background: #0a0e27;
  }
  ::-webkit-scrollbar-thumb {
    background: #3b82f6;
    border-radius: 4px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #60a5fa;
  }

  /* ===== TOAST NOTIFICATION SYSTEM ===== */
  .toast-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    gap: 10px;
    pointer-events: none;
  }

  .toast {
    background: linear-gradient(135deg, #1a2332 0%, #0a0e27 100%);
    border: 2px solid #3d4a5c;
    border-radius: 12px;
    padding: 16px 20px;
    min-width: 320px;
    max-width: 400px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    pointer-events: all;
    animation: toast-slide-in 0.3s ease-out;
    position: relative;
    overflow: hidden;
  }

  @keyframes toast-slide-in {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .toast.success {
    border-color: #10b981;
  }

  .toast.error {
    border-color: #ef4444;
  }

  .toast.warning {
    border-color: #f59e0b;
  }

  .toast.info {
    border-color: #3b82f6;
  }

  .toast-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
  }

  .toast-icon {
    font-size: 24px;
    line-height: 1;
  }

  .toast-title {
    font-size: 16px;
    font-weight: 700;
    color: #fff;
    flex: 1;
  }

  .toast-body {
    font-size: 13px;
    color: #9ca3af;
    line-height: 1.5;
    margin-left: 34px;
  }

  .toast-details {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    font-size: 12px;
    color: #6b7280;
  }

  .toast-progress {
    position: absolute;
    bottom: 0;
    left: 0;
    height: 3px;
    background: linear-gradient(90deg, #3b82f6, #10b981);
    animation: toast-progress 5s linear;
  }

  @keyframes toast-progress {
    from {
      width: 100%;
    }
    to {
      width: 0%;
    }
  }
`;
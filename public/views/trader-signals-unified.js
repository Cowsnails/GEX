
// public/views/trader-signals-unified.js - COMPLETE UNIFIED View (ALL FEATURES + MANUAL ENTRY UPDATES)
import { chartManager } from './chart-manager.js';

export function renderTraderSignals() {
  // Initialize after DOM loads with retry logic
  setTimeout(() => {
    const attempt = () => {
      const toggleBtn = document.getElementById('signalsToggleBtn');
      const sidebar = document.getElementById('signalsSidebar');
      
      if (toggleBtn && sidebar) {
        initUnifiedView();
      } else {
        // Retry if elements not found
        setTimeout(attempt, 50);
      }
    };
    attempt();
  }, 100);
  
  return `
    <style>
      /* ===== UNIFIED LAYOUT - NO CONFLICTS ===== */
      .trader-signals-unified {
        position: fixed;
        top: 135px;
        left: 0;
        right: 0;
        height: calc(100vh - 135px);
        display: flex;
        z-index: 40;
        background: #0a0e27;
      }
      
      /* LEFT SIDEBAR - Signals List */
      .signals-sidebar {
        width: 420px;
        background: linear-gradient(135deg, #0a0e27 0%, #1a2332 100%);
        border-right: 3px solid #3d4a5c;
        display: flex;
        flex-direction: column;
        overflow-y: auto;
        overflow-x: hidden;
        transition: margin-left 0.3s ease;
      }
      
      .signals-sidebar.collapsed {
        margin-left: -420px;
      }
      
      /* Toggle button */
      .signals-toggle-btn {
        position: fixed;
        bottom: 100px;
        left: 0;
        width: 40px;
        height: 40px;
        background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
        border: 2px solid #3d4a5c;
        border-left: none;
        border-radius: 0 8px 8px 0;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 51;
        transition: left 0.3s ease;
        color: #fff;
        font-size: 18px;
        font-weight: 700;
        box-shadow: 4px 0 12px rgba(0,0,0,0.3);
      }
      
      .signals-toggle-btn:hover {
        background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
      }
      
      .signals-sidebar:not(.collapsed) ~ .signals-toggle-btn {
        left: 420px;
      }
      
      .trader-signals-unified .signals-toggle-btn {
        display: flex;
      }

      /* RIGHT PANEL - Charts */
      .charts-main-panel {
        flex: 1;
        display: flex;
        flex-direction: column;
        background: linear-gradient(135deg, #0f1419 0%, #1a1f2e 100%);
        overflow: hidden;
        transition: margin-left 0.3s ease;
      }
      
      .signals-sidebar.collapsed ~ .charts-main-panel {
        margin-left: 0;
      }
      
      /* Sidebar Header */
      .signals-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 18px;
        border-bottom: 2px solid #3d4a5c;
        background: #1a2332;
        flex-shrink: 0;
      }
      
      .signals-title {
        font-size: 18px;
        font-weight: 700;
        background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      
      .header-buttons {
        display: flex;
        gap: 8px;
      }
      
      .auto-trade-btn {
        padding: 8px 14px;
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        border: none;
        border-radius: 6px;
        color: #fff;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        text-transform: uppercase;
      }
      
      /* Traders Container */
      .traders-container {
        flex: 1;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
      }
      
      .trader-section {
        background: rgba(59, 130, 246, 0.03);
        border-bottom: 2px solid #3d4a5c;
        display: flex;
        flex-direction: column;
      }
      
      .trader-section.elite {
        border-left: 4px solid #f59e0b;
      }
      
      .trader-section.combo {
        border-left: 4px solid #8b5cf6;
      }
      
      .section-header {
        padding: 14px 16px;
        background: #151b2e;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid #3d4a5c;
      }
      
      .section-header-left {
        display: flex;
        align-items: center;
        gap: 10px;
        flex: 1;
      }
      
      .trader-name {
        font-size: 14px;
        font-weight: 700;
        letter-spacing: 0.5px;
      }
      
      .trader-name.elite {
        color: #f59e0b;
      }
      
      .trader-name.combo {
        color: #8b5cf6;
        font-size: 13px;
      }
      
      .live-badge {
        padding: 3px 8px;
        background: rgba(239, 68, 68, 0.2);
        border: 1px solid #ef4444;
        border-radius: 4px;
        font-size: 9px;
        font-weight: 700;
        color: #ef4444;
        display: flex;
        align-items: center;
        gap: 5px;
      }
      
      .pulse-dot {
        width: 5px;
        height: 5px;
        background: #ef4444;
        border-radius: 50%;
        animation: pulse 2s infinite;
      }
      
      @keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

/* NEW: Flash animation for live price updates */
@keyframes flash-price {
  0%, 100% { 
    color: #10b981;
    transform: scale(1);
  }
  50% { 
    color: #34d399;
    transform: scale(1.1);
  }
}
      
      /* Trades List */
      .trades-list {
        overflow-y: auto;
        padding: 8px;
        max-height: 500px;
        display: flex;
        flex-direction: column;
      }
      
      .trade-item {
        padding: 10px;
        margin-bottom: 6px;
        background: rgba(59, 130, 246, 0.1);
        border: 1px solid #3d4a5c;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
        position: relative;
      }
      
      .trade-item:hover {
        background: rgba(59, 130, 246, 0.2);
        transform: translateX(3px);
      }
      
      .trade-item.analyzing {
        border-color: #f59e0b;
        animation: pulse-border 2s infinite;
      }
      
      @keyframes pulse-border {
        0%, 100% {
          border-color: #f59e0b;
          box-shadow: 0 0 10px rgba(245, 158, 11, 0.3);
        }
        50% {
          border-color: #d97706;
          box-shadow: 0 0 15px rgba(245, 158, 11, 0.5);
        }
      }
      
      .new-signal-pulse {
        position: absolute;
        top: -5px;
        right: -5px;
        width: 12px;
        height: 12px;
        background: #ef4444;
        border-radius: 50%;
        animation: pulse-scale 2s infinite;
      }
      
      @keyframes pulse-scale {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.3); opacity: 0.7; }
      }
      
      .trade-symbol {
        font-size: 14px;
        font-weight: 700;
        color: #fff;
        margin-bottom: 3px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .trade-details {
        font-size: 11px;
        color: #9ca3af;
        margin-bottom: 4px;
      }
      
      .trade-pnl {
        font-size: 13px;
        font-weight: 700;
        margin-top: 3px;
      }
      
      .trade-pnl.profit { color: #10b981; }
      .trade-pnl.loss { color: #ef4444; }
      .trade-pnl.pending { color: #6b7280; }
      
      .confluence-badge {
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 9px;
        font-weight: 700;
        text-transform: uppercase;
      }
      
      .confluence-badge.high {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: #fff;
      }
      
      .confluence-badge.medium {
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        color: #fff;
      }
      
      .confluence-badge.low {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        color: #fff;
      }
      
      .confluence-badge.analyzing {
        background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
        color: #fff;
        animation: pulse 1.5s infinite;
      }
      
      .mini-confluence-bar {
        height: 3px;
        background: rgba(107, 114, 128, 0.3);
        border-radius: 2px;
        overflow: hidden;
        margin-top: 6px;
      }
      
      .mini-confluence-fill {
        height: 100%;
        border-radius: 2px;
        transition: width 0.5s ease;
      }
      
      .mini-confluence-fill.high {
        background: linear-gradient(90deg, #10b981 0%, #059669 100%);
      }
      
      .mini-confluence-fill.medium {
        background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%);
      }
      
      .mini-confluence-fill.low {
        background: linear-gradient(90deg, #ef4444 0%, #dc2626 100%);
      }
      
      // Trade Action Buttons
.trade-action-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-top: 8px;
}

.trade-action-buttons.with-extra {
  grid-template-columns: 1fr 1fr 1fr;
}
      
      .trade-buy-btn, .trade-exit-btn, .trade-stop-btn {
        padding: 8px;
        border: none;
        border-radius: 4px;
        color: #fff;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        text-transform: uppercase;
        transition: all 0.2s;
      }
      
      .trade-buy-btn {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      }
      
      .trade-buy-btn:hover {
        background: linear-gradient(135deg, #059669 0%, #047857 100%);
        transform: translateY(-1px);
      }
      
      .trade-exit-btn {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      }
      
      .trade-exit-btn:hover {
        background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
        transform: translateY(-1px);
      }
      
      .trade-stop-btn {
        background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
      }
      
      .trade-stop-btn:hover {
        background: linear-gradient(135deg, #4b5563 0%, #374151 100%);
        transform: translateY(-1px);
      }
      
      /* ADD THIS: */
.trade-unwatch-btn {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}

.trade-unwatch-btn:hover {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  transform: translateY(-1px);
}

      /* 🚫 Cancel Button Styles */
      .trade-cancel-entry-btn,
      .trade-cancel-exit-btn {
        padding: 8px 12px;
        border: 2px solid #f59e0b;
        border-radius: 6px;
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        color: #fff;
        font-size: 10px;
        font-weight: 700;
        cursor: pointer;
        text-transform: uppercase;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
        position: relative;
        overflow: hidden;
      }

      .trade-cancel-entry-btn::before,
      .trade-cancel-exit-btn::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
        transition: left 0.5s;
      }

      .trade-cancel-entry-btn:hover,
      .trade-cancel-exit-btn:hover {
        background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
        border-color: #d97706;
        transform: translateY(-2px) scale(1.05);
        box-shadow: 0 4px 12px rgba(245, 158, 11, 0.5);
      }

      .trade-cancel-entry-btn:hover::before,
      .trade-cancel-exit-btn:hover::before {
        left: 100%;
      }

      .trade-cancel-entry-btn:active,
      .trade-cancel-exit-btn:active {
        transform: translateY(0) scale(1);
        box-shadow: 0 1px 4px rgba(245, 158, 11, 0.4);
      }

      .trade-cancel-entry-btn:disabled,
      .trade-cancel-exit-btn:disabled {
        opacity: 0.3;
        cursor: not-allowed;
        background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
        border-color: #4b5563;
        box-shadow: none;
        transform: none;
      }

      .trade-cancel-entry-btn:disabled:hover,
      .trade-cancel-exit-btn:disabled:hover {
        transform: none;
        box-shadow: none;
      }

      /* 🔥 Highlight style for buttons with ACTIVE pending orders */
      .trade-cancel-entry-btn.has-pending-order,
      .trade-cancel-exit-btn.has-pending-order {
        animation: pulse-orange 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        box-shadow: 0 4px 16px rgba(245, 158, 11, 0.6);
        border-color: #fbbf24;
      }

      @keyframes pulse-orange {
        0%, 100% {
          box-shadow: 0 4px 16px rgba(245, 158, 11, 0.6);
          border-color: #f59e0b;
        }
        50% {
          box-shadow: 0 6px 24px rgba(251, 191, 36, 0.8);
          border-color: #fbbf24;
        }
      }

      .trade-exit-btn:disabled,
      .trade-buy-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      /* Chart Panel Header */
      .chart-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 24px;
        border-bottom: 2px solid #3d4a5c;
        background: #1a1f2e;
        flex-shrink: 0;
      }
      
      .chart-title {
        font-size: 20px;
        font-weight: 700;
        background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      
      .chart-header-buttons {
        display: flex;
        gap: 10px;
      }
      
      .watch-all-btn, .unselect-all-btn, .my-trades-btn, .manual-entry-btn, .copy-trade-btn {
        padding: 10px 16px;
        border: none;
        border-radius: 6px;
        color: #fff;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        text-transform: uppercase;
      }

      .watch-all-btn {
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      }

      /* Account Balance Display */
      .account-balance-display {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 16px;
        background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.15) 100%);
        border: 2px solid #10b981;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 700;
        color: #fff;
        margin-right: 12px;
      }

      .account-balance-display .account-label {
        color: #9ca3af;
        text-transform: uppercase;
        font-size: 11px;
        letter-spacing: 0.5px;
      }

      .account-balance-display .account-name {
        color: #10b981;
        font-size: 12px;
      }

      .account-balance-display .balance-amount {
        color: #10b981;
        font-size: 14px;
      }

      .account-balance-display.paper {
        background: linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(245, 158, 11, 0.15) 100%);
        border-color: #fbbf24;
      }

      .account-balance-display.paper .account-name,
      .account-balance-display.paper .balance-amount {
        color: #fbbf24;
      }

      .account-balance-display.live {
        background: linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.15) 100%);
        border-color: #ef4444;
      }

      .account-balance-display.live .account-name,
      .account-balance-display.live .balance-amount {
        color: #ef4444;
      }

      .unselect-all-btn {
        background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
      }

      .my-trades-btn {
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      }

      .manual-entry-btn {
        background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
      }

      .manual-entry-btn:hover {
        background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
      }

      .copy-trade-btn {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      }

      .copy-trade-btn:hover {
        background: linear-gradient(135deg, #059669 0%, #047857 100%);
      }
      
      /* Chart Tabs */
      .chart-tabs {
        display: flex;
        gap: 0;
        border-bottom: 2px solid #3d4a5c;
        background: #151b2e;
      }
      
      .chart-tab {
        padding: 16px 32px;
        background: transparent;
        border: none;
        color: #9ca3af;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        border-bottom: 3px solid transparent;
        transition: all 0.2s;
      }
      
      .chart-tab:hover {
        color: #e0e6ed;
        background: rgba(59, 130, 246, 0.05);
      }
      
      .chart-tab.active {
        color: #3b82f6;
        border-bottom-color: #3b82f6;
        background: rgba(59, 130, 246, 0.1);
      }
      
      /* Trade Selection Area */
      .trade-selection {
        padding: 16px 24px;
        border-bottom: 2px solid #3d4a5c;
        background: #151b2e;
        max-height: 200px;
        overflow-y: auto;
      }
      
      .selection-title {
        font-size: 14px;
        font-weight: 700;
        color: #9ca3af;
        margin-bottom: 12px;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      
      .trade-checkboxes {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 10px;
      }
      
      .trade-checkbox-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        background: rgba(59, 130, 246, 0.1);
        border: 1px solid #3d4a5c;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .trade-checkbox-item:hover {
        background: rgba(59, 130, 246, 0.2);
        border-color: #3b82f6;
      }
      
      .trade-checkbox-item input[type="checkbox"] {
        width: 18px;
        height: 18px;
        cursor: pointer;
        accent-color: #3b82f6;
      }
      
      .trade-checkbox-label {
        font-size: 13px;
        font-weight: 600;
        color: #e0e6ed;
        cursor: pointer;
        flex: 1;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      /* Charts Container */
      .charts-container {
        flex: 1;
        padding: 16px;
        overflow-y: auto;
        display: grid;
        gap: 16px;
      }
      
      .charts-container.grid-1 { grid-template-columns: 1fr; }
      .charts-container.grid-2 { grid-template-columns: repeat(2, 1fr); }
      .charts-container.grid-3 { grid-template-columns: repeat(2, 1fr); grid-template-rows: repeat(2, 1fr); }
      .charts-container.grid-4 { grid-template-columns: repeat(2, 1fr); }
      .charts-container.grid-5, .charts-container.grid-6 { grid-template-columns: repeat(3, 1fr); }
      .charts-container.grid-7, .charts-container.grid-8 { grid-template-columns: repeat(3, 1fr); }
      .charts-container.grid-9 { grid-template-columns: repeat(3, 1fr); }
      
      .chart-box {
        background: rgba(26, 31, 46, 0.8);
        border: 2px solid #3d4a5c;
        border-radius: 8px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        min-height: 250px;
      }
      
      .chart-box-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 1px solid #3d4a5c;
      }
      
      .chart-box-symbol {
        font-size: 16px;
        font-weight: 700;
        color: #fff;
      }
      
      .chart-box-pnl {
        font-size: 14px;
        font-weight: 700;
      }
      
      .chart-box-pnl.profit { color: #10b981; }
      .chart-box-pnl.loss { color: #ef4444; }
      
      .chart-canvas {
        flex: 1;
        position: relative;
        min-height: 180px;
      }
      
      /* Winrate Stats */
      .winrate-stats {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 20px;
        margin-bottom: 24px;
      }
      
      .winrate-card {
        background: linear-gradient(135deg, #1a2332 0%, #151b2e 100%);
        border: 2px solid #3d4a5c;
        border-radius: 12px;
        padding: 24px;
        text-align: center;
        transition: all 0.3s ease;
      }
      
      .winrate-card:hover {
        border-color: #3b82f6;
        transform: translateY(-2px);
      }
      
      .winrate-card.elite {
        border-left: 4px solid #f59e0b;
      }
      
      .winrate-card.combo {
        border-left: 4px solid #8b5cf6;
      }
      
      .winrate-label {
        font-size: 12px;
        color: #9ca3af;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 12px;
        font-weight: 700;
      }
      
      .winrate-value {
        font-size: 48px;
        font-weight: 900;
        background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 8px;
      }
      
      .winrate-subtitle {
        font-size: 13px;
        color: #6b7280;
      }
      
      /* Live Signal Items */
      .live-signal-item {
        background: rgba(26, 31, 46, 0.8);
        border: 2px solid #3d4a5c;
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 16px;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }
      
      .live-signal-item:hover {
        border-color: #3b82f6;
        transform: translateX(4px);
      }
      
      .live-signal-item.analyzing {
        border-color: #f59e0b;
        animation: pulse-border-signal 2s infinite;
      }
      
      @keyframes pulse-border-signal {
        0%, 100% { border-color: #f59e0b; }
        50% { border-color: #d97706; }
      }
      
      .live-signal-item.complete {
        border-left: 4px solid #10b981;
      }
      
      .signal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }
      
      .signal-symbol {
        font-size: 18px;
        font-weight: 700;
        color: #fff;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .signal-timestamp {
        font-size: 11px;
        color: #6b7280;
      }
      
      .trader-badge {
        padding: 4px 10px;
        border-radius: 6px;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
      }
      
      .trader-badge.elite {
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        color: #fff;
      }
      
      .trader-badge.combo {
        background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
        color: #fff;
      }
      
      /* Confluence Meter */
      .confluence-meter {
        margin-bottom: 16px;
      }
      
      .confluence-meter-label {
        font-size: 12px;
        color: #9ca3af;
        margin-bottom: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .confluence-percentage {
        font-size: 16px;
        font-weight: 700;
      }
      
      .confluence-percentage.high { color: #10b981; }
      .confluence-percentage.medium { color: #f59e0b; }
      .confluence-percentage.low { color: #ef4444; }
      
      .confluence-bar {
        height: 12px;
        background: rgba(107, 114, 128, 0.3);
        border-radius: 6px;
        overflow: hidden;
      }
      
      .confluence-bar-fill {
        height: 100%;
        border-radius: 6px;
        transition: width 0.5s ease;
      }
      
      .confluence-bar-fill.high {
        background: linear-gradient(90deg, #10b981 0%, #059669 100%);
      }
      
      .confluence-bar-fill.medium {
        background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%);
      }
      
      .confluence-bar-fill.low {
        background: linear-gradient(90deg, #ef4444 0%, #dc2626 100%);
      }
      
      /* Analysis Status */
      .analysis-status {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px;
        background: rgba(59, 130, 246, 0.1);
        border-radius: 8px;
        font-size: 13px;
        margin-bottom: 16px;
      }
      
      .analysis-status.analyzing {
        background: rgba(245, 158, 11, 0.1);
        color: #f59e0b;
      }
      
      .analysis-status.complete {
        background: rgba(16, 185, 129, 0.1);
        color: #10b981;
      }
      
      .status-icon {
        font-size: 16px;
      }
      
      .status-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid transparent;
        border-top-color: #f59e0b;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      
      /* Trade Reasoning */
      .trade-reasoning {
        background: rgba(59, 130, 246, 0.05);
        border: 1px solid #3d4a5c;
        border-radius: 8px;
        padding: 16px;
      }
      
      .reasoning-title {
        font-size: 12px;
        color: #9ca3af;
        text-transform: uppercase;
        font-weight: 700;
        margin-bottom: 8px;
      }
      
      .reasoning-text {
        font-size: 13px;
        line-height: 1.6;
        color: #e0e6ed;
      }
      
      .reasoning-factors {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
        margin-top: 12px;
      }
      
      .factor-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
      }
      
      .factor-icon {
        font-size: 14px;
      }
      
      .factor-icon.positive { color: #10b981; }
      .factor-icon.negative { color: #ef4444; }
      .factor-icon.neutral { color: #6b7280; }
      
      /* Signal Action Buttons */
      .signal-action-buttons {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-top: 16px;
      }
      
      .signal-buy-btn, .signal-exit-btn {
        padding: 14px;
        border: none;
        border-radius: 8px;
        color: #fff;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        text-transform: uppercase;
        transition: all 0.2s;
      }
      
      .signal-buy-btn {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      }
      
      .signal-buy-btn:hover {
        background: linear-gradient(135deg, #059669 0%, #047857 100%);
        transform: translateY(-1px);
      }
      
      .signal-exit-btn {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      }
      
      .signal-exit-btn:hover {
        background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
        transform: translateY(-1px);
      }
      
      .signal-exit-btn:disabled,
      .signal-buy-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      /* Amount Selection Modal */
      .amount-modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        z-index: 10000;
        align-items: center;
        justify-content: center;
      }
      
      .amount-modal.active {
        display: flex;
      }
      
      .amount-modal-content {
        background: linear-gradient(135deg, #1a2332 0%, #151b2e 100%);
        border: 2px solid #3d4a5c;
        border-radius: 16px;
        padding: 32px;
        max-width: 400px;
        width: 90%;
      }
      
      .amount-modal-title {
        font-size: 20px;
        font-weight: 700;
        color: #fff;
        margin-bottom: 8px;
      }
      
      .amount-modal-subtitle {
        font-size: 13px;
        color: #9ca3af;
        margin-bottom: 24px;
      }
      
      .amount-options {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 16px;
      }
      
      .amount-option {
        padding: 16px;
        background: rgba(59, 130, 246, 0.1);
        border: 2px solid #3d4a5c;
        border-radius: 8px;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .amount-option:hover {
        border-color: #3b82f6;
        background: rgba(59, 130, 246, 0.2);
      }
      
      .amount-option.selected {
        border-color: #10b981;
        background: rgba(16, 185, 129, 0.2);
      }
      
      .amount-option-value {
        font-size: 18px;
        font-weight: 700;
        color: #fff;
      }
      
      .amount-option-label {
        font-size: 11px;
        color: #9ca3af;
        text-transform: uppercase;
        margin-top: 4px;
      }
      
      .custom-amount-input {
        width: 100%;
        padding: 14px;
        background: #0a0e27;
        border: 2px solid #3d4a5c;
        border-radius: 8px;
        color: #fff;
        font-size: 15px;
        margin-bottom: 16px;
        box-sizing: border-box;
      }
      
      .custom-amount-input:focus {
        outline: none;
        border-color: #3b82f6;
      }
      
      .amount-warning {
        background: rgba(245, 158, 11, 0.1);
        border: 1px solid #f59e0b;
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 16px;
        font-size: 12px;
        color: #fbbf24;
        display: none;
      }
      
      .amount-error {
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid #ef4444;
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 16px;
        font-size: 12px;
        color: #fca5a5;
        display: none;
      }
      
      .amount-modal-buttons {
        display: flex;
        gap: 12px;
      }
      
      .amount-modal-btn {
        flex: 1;
        padding: 14px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        text-transform: uppercase;
      }
      
      .amount-modal-btn.confirm {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: #fff;
      }
      
      .amount-modal-btn.cancel {
        background: transparent;
        border: 2px solid #3d4a5c;
        color: #9ca3af;
      }
      
      /* Manual Entry Modal */
      .manual-entry-modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        z-index: 10000;
        align-items: center;
        justify-content: center;
      }
      
      .manual-entry-modal.active {
        display: flex;
      }
      
      .manual-entry-modal-content {
        background: linear-gradient(135deg, #1a2332 0%, #151b2e 100%);
        border: 2px solid #3d4a5c;
        border-radius: 16px;
        padding: 32px;
        max-width: 500px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
      }
      
      .manual-entry-modal-title {
        font-size: 22px;
        font-weight: 700;
        color: #fff;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .manual-entry-modal-subtitle {
        font-size: 13px;
        color: #9ca3af;
        margin-bottom: 24px;
      }
      
      .manual-entry-form {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      
      .form-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .form-label {
        font-size: 12px;
        color: #9ca3af;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .form-input {
        width: 100%;
        padding: 12px;
        background: #0a0e27;
        border: 2px solid #3d4a5c;
        border-radius: 8px;
        color: #fff;
        font-size: 14px;
        box-sizing: border-box;
      }
      
      .form-input:focus {
        outline: none;
        border-color: #3b82f6;
      }
      
      .form-input::placeholder {
        color: #6b7280;
      }
      
      .form-hint {
        font-size: 11px;
        color: #6b7280;
        margin-top: 4px;
      }
      
      .form-hint.success {
        color: #10b981;
      }
      
      .form-hint.error {
        color: #ef4444;
      }
      
      .ticker-search-row {
        display: flex;
        gap: 8px;
      }
      
      .ticker-search-row .form-input {
        flex: 1;
      }
      
      .manual-search-btn {
        padding: 12px 20px;
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        border: none;
        border-radius: 8px;
        color: #fff;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        text-transform: uppercase;
        white-space: nowrap;
      }
      
      .manual-search-btn:hover:not(:disabled) {
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      }
      
      .manual-search-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .form-radio-group {
        display: flex;
        gap: 12px;
      }
      
      .form-radio-option {
        flex: 1;
        padding: 12px;
        background: rgba(59, 130, 246, 0.1);
        border: 2px solid #3d4a5c;
        border-radius: 8px;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 13px;
        font-weight: 700;
        color: #e0e6ed;
        text-transform: uppercase;
      }
      
      .form-radio-option:hover {
        border-color: #3b82f6;
        background: rgba(59, 130, 246, 0.2);
      }
      
      .form-radio-option.selected {
        border-color: #10b981;
        background: rgba(16, 185, 129, 0.2);
        color: #10b981;
      }
      
      .trader-type-options {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      
      .trader-type-option {
        padding: 14px;
        background: rgba(59, 130, 246, 0.1);
        border: 2px solid #3d4a5c;
        border-radius: 8px;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .trader-type-option:hover {
        border-color: #3b82f6;
        background: rgba(59, 130, 246, 0.2);
      }
      
      .trader-type-option.selected {
        border-color: #10b981;
        background: rgba(16, 185, 129, 0.2);
      }
      
      .trader-type-option.elite.selected {
        border-color: #f59e0b;
        background: rgba(245, 158, 11, 0.2);
      }
      
      .trader-type-option.combo.selected {
        border-color: #8b5cf6;
        background: rgba(139, 92, 246, 0.2);
      }
      
      .trader-type-icon {
        font-size: 24px;
        margin-bottom: 8px;
      }
      
      .trader-type-name {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        color: #e0e6ed;
      }
      
      /* Three-button layout for modal */
      .manual-entry-modal-buttons {
        display: flex;
        gap: 12px;
        margin-top: 8px;
      }
      
      .manual-entry-modal-btn {
        flex: 1;
        padding: 14px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        text-transform: uppercase;
      }
      
      .manual-entry-modal-btn.cancel {
        background: transparent;
        border: 2px solid #3d4a5c;
        color: #9ca3af;
      }
      
      .manual-entry-modal-btn.watch {
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        color: #fff;
      }
      
      .manual-entry-modal-btn.watch:hover:not(:disabled) {
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      }
      
      .manual-entry-modal-btn.buy {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: #fff;
      }
      
      .manual-entry-modal-btn.buy:hover:not(:disabled) {
        background: linear-gradient(135deg, #059669 0%, #047857 100%);
      }
      
      .manual-entry-modal-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      /* ATM Strike Display */
      .atm-strike-display {
        padding: 12px;
        background: rgba(59, 130, 246, 0.1);
        border: 2px solid #3d4a5c;
        border-radius: 8px;
        text-align: center;
      }
      
      .atm-strike-label {
        font-size: 11px;
        color: #9ca3af;
        text-transform: uppercase;
        margin-bottom: 4px;
      }
      
      .atm-strike-value {
        font-size: 20px;
        font-weight: 700;
        color: #3b82f6;
        transition: color 0.3s;
      }
      
      .atm-strike-hint {
        font-size: 10px;
        color: #6b7280;
        margin-top: 6px;
        font-style: italic;
      }
      
      /* Premium Display */
      .premium-display {
        padding: 12px;
        background: rgba(16, 185, 129, 0.1);
        border: 2px solid #3d4a5c;
        border-radius: 8px;
        text-align: center;
      }
      
      .premium-label {
        font-size: 11px;
        color: #9ca3af;
        text-transform: uppercase;
        margin-bottom: 4px;
      }
      
      .premium-value {
        font-size: 20px;
        font-weight: 700;
        color: #10b981;
      }
      
      .premium-value.loading {
        color: #6b7280;
        animation: pulse 1.5s infinite;
      }
      
      .premium-value.live::before {
  content: "🟢 ";
  font-size: 8px;
  animation: pulse-dot 1.5s infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.premium-display.live {
  border-color: #10b981;
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.3);
}

      /* Manual Entry Badge */
      .manual-badge {
        background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 9px;
        font-weight: 700;
        color: #fff;
        margin-left: 6px;
      }

      /* Account Type Badge */
      .account-badge {
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 9px;
        font-weight: 700;
        color: #fff;
        margin-left: 6px;
      }

      .account-badge.default {
        background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
        border: 1px solid #9ca3af;
      }

      .account-badge.paper {
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        border: 1px solid #60a5fa;
      }

      .account-badge.live {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        border: 1px solid #34d399;
      }

      /* Auto-charted indicator */
      .auto-charted-indicator {
        color: #10b981;
        font-size: 10px;
        margin-top: 4px;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: #6b7280;
      }
      
      .empty-state-icon {
        font-size: 64px;
        margin-bottom: 16px;
      }
      
      .empty-state-text {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 8px;
      }
      
      .empty-state-hint {
        font-size: 14px;
      }
      
      .hidden {
        display: none !important;
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
    </style>

    <!-- Toast Container -->
    <div class="toast-container" id="toastContainer"></div>

    <!-- Toggle Button -->
    <button class="signals-toggle-btn" id="signalsToggleBtn">⚡</button>
    
    <!-- Unified Container -->
    <div class="trader-signals-unified">
      
      
      <!-- LEFT: Signals Sidebar -->
      <div class="signals-sidebar" id="signalsSidebar">

        <div class="traders-container">
          <!-- Manual Section (Your Trades) -->
          <div class="trader-section manual">
            <div class="section-header">
              <div class="section-header-left">
                <div class="trader-name" style="color: #8b5cf6;">📝 MY TRADES</div>
              </div>
              <div class="live-badge">
                <div class="pulse-dot"></div>
                <span id="manualCount">0/0</span>
              </div>
            </div>
            <div class="trades-list" id="manualTradesList">
              <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <div class="empty-state-text">No manual entries<br>Click Manual Entry to add</div>
              </div>
            </div>
          </div>

          <!-- Elite Section -->
          <div class="trader-section elite">
            <div class="section-header">
              <div class="section-header-left">
                <div class="trader-name elite">ELITE ($50K MIN)</div>
              </div>
              <div class="live-badge">
                <div class="pulse-dot"></div>
                <span id="eliteCount">0/0</span>
              </div>
            </div>
            <div class="trades-list" id="eliteTradesList">
              <div class="empty-state">
                <div class="empty-state-icon">🔥</div>
                <div class="empty-state-text">No active Elite trades<br>Waiting for signals...</div>
              </div>
            </div>
          </div>
          
          <!-- Combo Section -->
          <div class="trader-section combo">
            <div class="section-header">
              <div class="section-header-left">
                <div class="trader-name combo">BRANDO + SHOOF ($10K MIN)</div>
              </div>
              <div class="live-badge">
                <div class="pulse-dot"></div>
                <span id="comboCount">0/0</span>
              </div>
            </div>
            <div class="trades-list" id="comboTradesList">
              <div class="empty-state">
                <div class="empty-state-icon">💜</div>
                <div class="empty-state-text">No active combo trades<br>Waiting for signals...</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- RIGHT: Chart Viewer -->
      <div class="charts-main-panel">
        <div class="chart-header">
          <div class="chart-title">📊 Live Charts</div>
          <div class="chart-header-buttons">
            <div class="account-balance-display" id="accountBalanceDisplay">
              <div class="account-label">Account:</div>
              <div class="account-name" id="activeAccountName">Default</div>
              <div class="balance-amount" id="activeAccountBalance">$100,000.00</div>
            </div>
            <button class="watch-all-btn" id="watchAllBtn">Watch All</button>
            <button class="unselect-all-btn" id="unselectAllBtn">Unselect All</button>
            <button class="my-trades-btn" id="myTradesBtn">My Trades</button>
            <button class="manual-entry-btn" id="manualEntryBtn">✏️ Manual Entry</button>
            <button class="copy-trade-btn" id="copyTradeBtn">🤖 Copy Trade</button>
            <button class="copy-trade-btn" id="exitSettingsBtn">🎯 Exit Settings</button>
          </div>
        </div>
        
        <!-- Trade Selection Area (for Live Charts tab) -->
        <div class="trade-selection hidden" id="tradeSelection">
          <div class="selection-title">Select Trades to Watch</div>
          <div class="trade-checkboxes" id="tradeCheckboxes">
            <!-- Dynamically populated from liveSignals -->
          </div>
        </div>
        
        <div class="chart-tabs">
          <button class="chart-tab active" data-tab="live">📈 Live Charts</button>
          <button class="chart-tab" data-tab="confluence">⚡ Confluence Meter</button>
          <button class="chart-tab" data-tab="past">📜 Past Trades</button>
        </div>
        
        <div class="charts-container" id="chartsContainer">
          <div class="empty-state">
            <div class="empty-state-icon">📈</div>
            <div class="empty-state-text">No Charts Selected</div>
            <div class="empty-state-hint">Select trades from the left sidebar</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Amount Selection Modal -->
    <div class="amount-modal" id="amountModal">
      <div class="amount-modal-content">
        <div class="amount-modal-title" id="amountModalTitle">Select Amount</div>
        <div class="amount-modal-subtitle" id="amountModalSubtitle">Choose your entry amount</div>
        
        <div class="amount-options" id="amountOptions">
          <div class="amount-option" data-amount="250">
            <div class="amount-option-value">$250</div>
            <div class="amount-option-label">Starter</div>
          </div>
          <div class="amount-option" data-amount="500">
            <div class="amount-option-value">$500</div>
            <div class="amount-option-label">Standard</div>
          </div>
          <div class="amount-option" data-amount="1000">
            <div class="amount-option-value">$1,000</div>
            <div class="amount-option-label">Recommended</div>
          </div>
          <div class="amount-option" data-amount="5000">
            <div class="amount-option-value">$5,000</div>
            <div class="amount-option-label">Premium</div>
          </div>
        </div>
        
        <input type="number" class="custom-amount-input" id="customAmountInput" placeholder="Or enter custom amount..." />
        
        <div class="amount-warning" id="amountWarning">⚠️ This exceeds 30% of your account balance</div>
        <div class="amount-error" id="amountError">❌ Insufficient funds</div>
        
        <div class="amount-modal-buttons">
          <button class="amount-modal-btn cancel" id="cancelAmountBtn">Cancel</button>
          <button class="amount-modal-btn confirm" id="confirmAmountBtn">Confirm Order</button>
        </div>
      </div>
    </div>
    
    <!-- Manual Entry Modal -->
    <div class="manual-entry-modal" id="manualEntryModal">
      <div class="manual-entry-modal-content">
        <div class="manual-entry-modal-title">
          🔍 Add Ticker to Watchlist
        </div>
        <div class="manual-entry-modal-subtitle">Search for a ticker to track live options data</div>

        <div class="manual-entry-form">
          <!-- Ticker Input -->
          <div class="form-group">
            <label class="form-label">Ticker Symbol</label>
            <div class="ticker-search-row">
              <input type="text" class="form-input" id="manualTicker" placeholder="AAPL" />
              <button class="manual-search-btn" id="manualSearchBtn" disabled>🔍 Search</button>
            </div>
            <div class="form-hint" id="searchStatus"></div>
          </div>

          <!-- DTE Dropdown (hidden until search) -->
          <div class="form-group" id="dteGroup" style="display: none;">
            <label class="form-label">Days to Expiration (0-3 DTE)</label>
            <select class="form-input" id="manualDTE">
              <option value="">Select expiration...</option>
            </select>
          </div>

          <!-- Strike Selector (hidden until DTE selected) -->
          <div class="form-group" id="strikeGroup" style="display: none;">
            <label class="form-label">Strike Selection (4 Closest OTM)</label>
            <select class="form-input" id="manualStrike">
              <option value="">Select strike...</option>
            </select>
          </div>

          <!-- Call/Put Selection (hidden until search) -->
          <div class="form-group" id="optionTypeGroup" style="display: none;">
            <label class="form-label">Option Type</label>
            <div class="form-radio-group">
              <div class="form-radio-option selected" data-value="C" id="manualCallOption">CALL</div>
              <div class="form-radio-option" data-value="P" id="manualPutOption">PUT</div>
            </div>
          </div>

          <!-- ATM Strike Display (hidden until DTE selected) -->
          <div class="form-group" id="atmStrikeGroup" style="display: none;">
            <div class="atm-strike-display">
              <div class="atm-strike-label">ATM Strike</div>
              <div class="atm-strike-value" id="atmStrikeValue">--</div>
              <div class="atm-strike-hint">
                Calls favor OTM (cheaper), Puts favor OTM (cheaper)
              </div>
            </div>
          </div>

          <!-- Premium Display (hidden until DTE selected) -->
          <div class="form-group" id="premiumGroup" style="display: none;">
            <div class="premium-display">
              <div class="premium-label">Current Premium</div>
              <div class="premium-value loading" id="premiumValue">Loading...</div>
            </div>
          </div>
        </div>

        <!-- Updated Button Layout -->
        <div class="manual-entry-modal-buttons">
          <button class="manual-entry-modal-btn cancel" id="cancelManualEntryBtn">Cancel</button>
          <button class="manual-entry-modal-btn watch" id="watchOnlyBtn" disabled>📊 Watch Only</button>
          <button class="manual-entry-modal-btn buy" id="buyInBtn" disabled>💰 Buy In</button>
        </div>
      </div>
    </div>

    <!-- Copy Trade Modal -->
    <div class="manual-entry-modal" id="copyTradeModal">
      <div class="manual-entry-modal-content" style="max-width: 700px;">
        <div class="manual-entry-modal-title">
          🤖 Copy Trade Settings
        </div>
        <div class="manual-entry-modal-subtitle">Automatically copy trades from elite traders</div>

        <div class="manual-entry-form">
          <!-- Trading Mode Selection -->
          <div class="form-group" style="border-bottom: 2px solid rgba(255,255,255,0.1); padding-bottom: 16px; margin-bottom: 20px;">
            <label class="form-label" style="font-size: 16px; font-weight: 600;">Trading Mode</label>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 8px;">
              <button class="trading-mode-btn" id="defaultModeBtn" data-mode="default" style="
                padding: 16px;
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
                border: 3px solid #10b981;
                border-radius: 12px;
                font-size: 15px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 6px;
              ">
                <span style="font-size: 24px;">💰</span>
                <span>Default Account</span>
                <span style="font-size: 12px; opacity: 0.9;">Virtual $100k</span>
              </button>
              <button class="trading-mode-btn" id="paperModeBtn" data-mode="paper" style="
                padding: 16px;
                background: rgba(255,255,255,0.05);
                color: #9ca3af;
                border: 3px solid rgba(255,255,255,0.1);
                border-radius: 12px;
                font-size: 15px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 6px;
              ">
                <span style="font-size: 24px;">📄</span>
                <span>Paper Trading</span>
                <span style="font-size: 12px; opacity: 0.9;">Practice Mode</span>
              </button>
              <button class="trading-mode-btn" id="liveModeBtn" data-mode="live" style="
                padding: 16px;
                background: rgba(255,255,255,0.05);
                color: #9ca3af;
                border: 3px solid rgba(255,255,255,0.1);
                border-radius: 12px;
                font-size: 15px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 6px;
              ">
                <span style="font-size: 24px;">🔴</span>
                <span>Live Trading</span>
                <span style="font-size: 12px; opacity: 0.9;">Real Money</span>
              </button>
            </div>
          </div>

          <!-- Trader Selection -->
          <div class="form-group">
            <label class="form-label">Select Trader to Copy</label>
            <select class="form-input" id="copyTrader">
              <option value="">Select a trader...</option>
              <option value="elite">🔥 Elite Trades</option>
              <option value="brando">💜 Brando + Shoof</option>
            </select>
          </div>

          <!-- Ticker Filter -->
          <div class="form-group">
            <label class="form-label">Ticker Filter (Optional)</label>
            <div style="display: flex; gap: 8px; margin-bottom: 8px;">
              <input type="text" class="form-input" id="copyTickerInput" placeholder="Enter ticker (e.g., AAPL)" style="flex: 1; text-transform: uppercase;" maxlength="10" />
              <button class="manual-entry-modal-btn buy" id="addTickerBtn" style="padding: 8px 16px; font-size: 14px;">➕ Add</button>
            </div>
            <div id="tickerChipsContainer" style="display: flex; flex-wrap: wrap; gap: 6px; min-height: 20px;">
              <!-- Ticker chips populated here -->
            </div>
            <div class="form-hint">Add specific tickers to copy, or leave empty to copy all trades</div>
          </div>

          <!-- Trading Hours -->
          <div class="form-group">
            <label class="form-label">Trading Hours (Optional)</label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div>
                <label class="form-hint">Start Time</label>
                <select class="form-input" id="copyStartTime">
                  <option value="">No start time</option>
                  <option value="9:30">9:30 AM</option>
                  <option value="10:00">10:00 AM</option>
                  <option value="10:30">10:30 AM</option>
                  <option value="11:00">11:00 AM</option>
                  <option value="11:30">11:30 AM</option>
                  <option value="12:00">12:00 PM</option>
                  <option value="12:30">12:30 PM</option>
                  <option value="13:00">1:00 PM</option>
                  <option value="13:30">1:30 PM</option>
                  <option value="14:00">2:00 PM</option>
                  <option value="14:30">2:30 PM</option>
                  <option value="15:00">3:00 PM</option>
                  <option value="15:30">3:30 PM</option>
                </select>
              </div>
              <div>
                <label class="form-hint">End Time</label>
                <select class="form-input" id="copyEndTime">
                  <option value="">No end time</option>
                  <option value="10:00">10:00 AM</option>
                  <option value="10:30">10:30 AM</option>
                  <option value="11:00">11:00 AM</option>
                  <option value="11:30">11:30 AM</option>
                  <option value="12:00">12:00 PM</option>
                  <option value="12:30">12:30 PM</option>
                  <option value="13:00">1:00 PM</option>
                  <option value="13:30">1:30 PM</option>
                  <option value="14:00">2:00 PM</option>
                  <option value="14:30">2:30 PM</option>
                  <option value="15:00">3:00 PM</option>
                  <option value="15:30">3:30 PM</option>
                  <option value="16:00">4:00 PM</option>
                </select>
              </div>
            </div>
            <div class="form-hint">Leave empty to copy trades all day</div>
          </div>

          <!-- Amount Per Trade -->
          <div class="form-group">
            <label class="form-label">Amount Per Trade ($)</label>
            <input type="number" class="form-input" id="copyAmount" placeholder="500" min="1" step="1" />
            <div class="form-hint">How much money to allocate per copied trade</div>
          </div>

          <!-- Active Copy Trade Rules -->
          <div class="form-group" id="activeCopyTradesGroup" style="display: none;">
            <label class="form-label">Active Copy Trade Rules</label>
            <div id="activeCopyTradesList" style="max-height: 200px; overflow-y: auto;">
              <!-- Populated dynamically -->
            </div>
          </div>
        </div>

        <!-- Buttons -->
        <div class="manual-entry-modal-buttons">
          <button class="manual-entry-modal-btn cancel" id="cancelCopyTradeBtn">Close</button>
          <button class="manual-entry-modal-btn buy" id="addCopyTradeBtn" disabled">➕ Add Copy Trade Rule</button>
        </div>
      </div>
    </div>

    <!-- Trade Exit Settings Modal -->
    <div class="manual-entry-modal" id="exitSettingsModal">
      <div class="manual-entry-modal-content" style="max-width: 800px;">
        <div class="manual-entry-modal-title">
          🎯 Trade Exit Settings
        </div>
        <div class="manual-entry-modal-subtitle">Set stop loss & take profit for each trader</div>

        <div class="manual-entry-form">
          <!-- Manual Trades Settings -->
          <div class="trader-exit-section">
            <div class="trader-exit-header">
              <span class="trader-icon">📝</span>
              <span class="trader-name">Manual Entries</span>
            </div>
            <div class="exit-inputs">
              <div class="form-group" style="flex: 1;">
                <label class="form-label">Stop Loss (%)</label>
                <input type="number" class="manual-entry-input" id="manualStopLoss" placeholder="e.g. -20" step="1" min="-100" max="0">
              </div>
              <div class="form-group" style="flex: 1;">
                <label class="form-label">Take Profit (%)</label>
                <input type="number" class="manual-entry-input" id="manualTakeProfit" placeholder="e.g. 50" step="1" min="0">
              </div>
            </div>
          </div>

          <!-- Elite Trader Settings -->
          <div class="trader-exit-section">
            <div class="trader-exit-header">
              <span class="trader-icon">🔥</span>
              <span class="trader-name">Elite Trades</span>
            </div>
            <div class="exit-inputs">
              <div class="form-group" style="flex: 1;">
                <label class="form-label">Stop Loss (%)</label>
                <input type="number" class="manual-entry-input" id="eliteStopLoss" placeholder="e.g. -20" step="1" min="-100" max="0">
              </div>
              <div class="form-group" style="flex: 1;">
                <label class="form-label">Take Profit (%)</label>
                <input type="number" class="manual-entry-input" id="eliteTakeProfit" placeholder="e.g. 50" step="1" min="0">
              </div>
            </div>
          </div>

          <!-- Brando Trader Settings -->
          <div class="trader-exit-section">
            <div class="trader-exit-header">
              <span class="trader-icon">💜</span>
              <span class="trader-name">Brando+Shoof</span>
            </div>
            <div class="exit-inputs">
              <div class="form-group" style="flex: 1;">
                <label class="form-label">Stop Loss (%)</label>
                <input type="number" class="manual-entry-input" id="brandoStopLoss" placeholder="e.g. -20" step="1" min="-100" max="0">
              </div>
              <div class="form-group" style="flex: 1;">
                <label class="form-label">Take Profit (%)</label>
                <input type="number" class="manual-entry-input" id="brandoTakeProfit" placeholder="e.g. 50" step="1" min="0">
              </div>
            </div>
          </div>

          <style>
            .trader-exit-section {
              background: rgba(255,255,255,0.03);
              border-radius: 12px;
              padding: 16px;
              margin-bottom: 16px;
            }

            .trader-exit-header {
              display: flex;
              align-items: center;
              gap: 10px;
              margin-bottom: 16px;
              padding-bottom: 12px;
              border-bottom: 2px solid rgba(255,255,255,0.1);
            }

            .trader-icon {
              font-size: 24px;
            }

            .trader-name {
              font-size: 16px;
              font-weight: 600;
              color: #10b981;
            }

            .exit-inputs {
              display: flex;
              gap: 16px;
            }
          </style>

          <!-- Auto-Stop After Exit Setting -->
          <div class="trader-exit-section">
            <div class="trader-exit-header">
              <span class="trader-icon">⚙️</span>
              <span class="trader-name">Watching Behavior</span>
            </div>
            <div style="padding: 8px 0;">
              <label style="display: flex; align-items: center; gap: 12px; cursor: pointer; user-select: none;">
                <input type="checkbox" id="autoStopAfterExitCheckbox" style="width: 20px; height: 20px; cursor: pointer;">
                <span style="color: #e5e7eb; font-size: 14px;">
                  <strong>Automatically stop watching after exit</strong>
                  <br>
                  <span style="color: #9ca3af; font-size: 13px;">
                    When enabled, trades will be removed from your watchlist immediately after exit.
                    When disabled, they'll continue to be watched until you manually click Stop.
                  </span>
                </span>
              </label>
            </div>
            <div style="padding: 8px 0; margin-top: 16px; border-top: 1px solid #374151;">
              <label style="display: flex; align-items: center; gap: 12px; cursor: pointer; user-select: none;">
                <input type="checkbox" id="instantExitCheckbox" style="width: 20px; height: 20px; cursor: pointer;">
                <span style="color: #e5e7eb; font-size: 14px;">
                  <strong>⚡ Instant Exit (Skip Modal)</strong>
                  <br>
                  <span style="color: #9ca3af; font-size: 13px;">
                    When enabled, clicking Exit will immediately sell at mid price without showing the exit modal.
                    When disabled, the exit modal will show with chart and P&L before confirming.
                  </span>
                </span>
              </label>
            </div>
          </div>
        </div>

        <!-- Buttons -->
        <div class="manual-entry-modal-buttons">
          <button class="manual-entry-modal-btn cancel" id="cancelExitSettingsBtn">Close</button>
          <button class="manual-entry-modal-btn buy" id="saveExitSettingsBtn">💾 Save Settings</button>
        </div>
      </div>
    </div>
  `;
}

// ===== TOAST NOTIFICATION SYSTEM =====
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
  toast.className = `toast ${type}`;

  let detailsHTML = '';
  if (details) {
    detailsHTML = `<div class="toast-details">${details}</div>`;
  }

  toast.innerHTML = `
    <div class="toast-header">
      <div class="toast-icon">${icons[type]}</div>
      <div class="toast-title">${title}</div>
    </div>
    ${message ? `<div class="toast-body">${message}</div>` : ''}
    ${detailsHTML}
    <div class="toast-progress"></div>
  `;

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

// Global state
window.liveSignals = window.liveSignals || [];
let currentBuySignal = null;

// Function to update account balance display
async function updateAccountBalanceDisplay() {
  // 🔥 FIX: Don't call live endpoints in backtest mode
  if (window.backtestMode) {
    console.log('⏭️ Skipping account balance update - in backtest mode');
    return;
  }

  try {
    const displayEl = document.getElementById('accountBalanceDisplay');
    const nameEl = document.getElementById('activeAccountName');
    const balanceEl = document.getElementById('activeAccountBalance');

    if (!displayEl || !nameEl || !balanceEl) return;

    // Fetch account info
    const accountsResponse = await fetch('/api/broker/accounts', { credentials: 'include' });
    const accountsData = await accountsResponse.json();

    if (!accountsData.success) return;

    const activeAccount = accountsData.activeAccount || 'default';

    // Get balance based on active account
    let balance = 0;
    let accountDisplayName = 'Default';

    if (activeAccount === 'default') {
      const balanceResponse = await fetch('/api/broker/default-balance', { credentials: 'include' });
      const balanceData = await balanceResponse.json();
      if (balanceData.success) {
        balance = balanceData.balance;
      }
      accountDisplayName = 'Default';
      displayEl.className = 'account-balance-display';
    } else if (activeAccount === 'paper') {
      balance = accountsData.paper.balance || 0;
      accountDisplayName = 'Paper';
      displayEl.className = 'account-balance-display paper';
    } else if (activeAccount === 'live') {
      balance = accountsData.live.balance || 0;
      accountDisplayName = 'Live';
      displayEl.className = 'account-balance-display live';
    }

    // Update display
    nameEl.textContent = accountDisplayName;
    balanceEl.textContent = `$${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    console.log(`💰 Updated balance display: ${accountDisplayName} - $${balance.toFixed(2)}`);
  } catch (error) {
    console.error('❌ Error updating account balance display:', error);
  }
}

// Make it globally available so it can be called after trades
window.updateAccountBalanceDisplay = updateAccountBalanceDisplay;

window.initUnifiedView = function() {
  const toggleBtn = document.getElementById('signalsToggleBtn');
  const sidebar = document.getElementById('signalsSidebar');
  
  if (!toggleBtn || !sidebar) return;
  
  // ✅ Remove all old listeners by cloning and replacing the button
  const newToggleBtn = toggleBtn.cloneNode(true);
  toggleBtn.parentNode.replaceChild(newToggleBtn, toggleBtn);
  
  // ✅ Add fresh listener directly to the button
  newToggleBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    const sidebar = document.getElementById('signalsSidebar');
    
    if (!sidebar) return;
    
    const isCollapsed = sidebar.classList.contains('collapsed');
    
    if (isCollapsed) {
      sidebar.classList.remove('collapsed');
      this.textContent = '✕';
    } else {
      sidebar.classList.add('collapsed');
      this.textContent = '⚡';
    }
  });
  
  initChartTabs();

  // Initialize account balance display
  updateAccountBalanceDisplay();

  // Refresh balance every 5 seconds
  setInterval(updateAccountBalanceDisplay, 5000);

  const watchAllBtn = document.getElementById('watchAllBtn');
  const unselectAllBtn = document.getElementById('unselectAllBtn');
  const myTradesBtn = document.getElementById('myTradesBtn');
  const manualEntryBtn = document.getElementById('manualEntryBtn');
  
  if (watchAllBtn) {
    watchAllBtn.addEventListener('click', function() {
      const checkboxes = document.querySelectorAll('#tradeCheckboxes input[type="checkbox"]');
      checkboxes.forEach(cb => cb.checked = true);
      updateCharts();
    });
  }
  
  if (unselectAllBtn) {
    unselectAllBtn.addEventListener('click', function() {
      const checkboxes = document.querySelectorAll('#tradeCheckboxes input[type="checkbox"]');
      checkboxes.forEach(cb => cb.checked = false);
      updateCharts();
    });
  }
  
  if (myTradesBtn) {
    myTradesBtn.addEventListener('click', function() {
      // Switch to Live Charts tab
      const liveChartsTab = document.querySelector('[data-tab="live"]');
      if (liveChartsTab) {
        liveChartsTab.click();
      }

      // Find all checkboxes for trades the user owns (has position in)
      const checkboxes = document.querySelectorAll('#tradeCheckboxes input[type="checkbox"]');

      // Uncheck all first
      checkboxes.forEach(cb => cb.checked = false);

      // Check only the trades where user has a position
      checkboxes.forEach(cb => {
        if (cb.getAttribute('data-owned') === 'true') {
          cb.checked = true;
        }
      });

      // Update the charts to show selected trades
      updateCharts();

      console.log('📊 [MY TRADES] Displaying charts for user\'s active positions');
    });
  }
  
  if (manualEntryBtn) {
    manualEntryBtn.addEventListener('click', function() {
      openManualEntryModal();
    });
  }

  const copyTradeBtn = document.getElementById('copyTradeBtn');
  if (copyTradeBtn) {
    copyTradeBtn.addEventListener('click', function() {
      openCopyTradeModal();
    });
  }

  const exitSettingsBtn = document.getElementById('exitSettingsBtn');
  if (exitSettingsBtn) {
    exitSettingsBtn.addEventListener('click', function() {
      openExitSettingsModal();
    });
  }

  setupAmountModal();
  setupManualEntryModal();
  setupCopyTradeModal();
  setupExitSettingsModal();

  connectToSignalStream();

  loadTraderSignals();
  loadWinrateStats();
  
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function setupAmountModal() {
  // Prevent multiple initializations
  if (window._amountModalInitialized) return;
  window._amountModalInitialized = true;

  const modal = document.getElementById('amountModal');
  const confirmBtn = document.getElementById('confirmAmountBtn');
  const cancelBtn = document.getElementById('cancelAmountBtn');
  const customInput = document.getElementById('customAmountInput');
  const options = document.querySelectorAll('.amount-option');

  if (!modal || !confirmBtn || !cancelBtn || !customInput) {
    window._amountModalInitialized = false;
    return;
  }
  
  options.forEach(opt => {
    opt.addEventListener('click', function() {
      options.forEach(o => o.classList.remove('selected'));
      this.classList.add('selected');
      customInput.value = '';
      validateAmount(parseInt(this.dataset.amount));
    });
  });
  
  customInput.addEventListener('input', function() {
    options.forEach(o => o.classList.remove('selected'));
    validateAmount(parseFloat(this.value));
  });
  
  cancelBtn.addEventListener('click', () => {
    modal.classList.remove('active');
    currentBuySignal = null;
  });
  
  confirmBtn.addEventListener('click', () => {
    const selected = document.querySelector('.amount-option.selected');
    const amount = selected ? parseInt(selected.dataset.amount) : parseFloat(customInput.value);
    
    if (amount && currentBuySignal) {
      executeOrder(currentBuySignal, amount);
      modal.classList.remove('active');
    }
  });
  
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      modal.classList.remove('active');
      currentBuySignal = null;
    }
  });
}

function setupManualEntryModal() {
  // Prevent multiple initializations
  if (window._manualEntryModalInitialized) return;
  window._manualEntryModalInitialized = true;

  const modal = document.getElementById('manualEntryModal');
  const cancelBtn = document.getElementById('cancelManualEntryBtn');
  const watchOnlyBtn = document.getElementById('watchOnlyBtn');
  const buyInBtn = document.getElementById('buyInBtn');
  const searchBtn = document.getElementById('manualSearchBtn');
  const tickerInput = document.getElementById('manualTicker');
  const dteSelect = document.getElementById('manualDTE');
  const callOption = document.getElementById('manualCallOption');
  const putOption = document.getElementById('manualPutOption');

  if (!modal) {
    window._manualEntryModalInitialized = false;
    return;
  }

  // Enable search button when ticker typed
  tickerInput.addEventListener('input', function() {
    searchBtn.disabled = this.value.trim().length === 0;
  });

  // Search button click
  searchBtn.addEventListener('click', async function() {
    await handleManualSearch();
  });
  
  // Call/Put selection
  if (callOption && putOption) {
    callOption.addEventListener('click', function() {
      callOption.classList.add('selected');
      putOption.classList.remove('selected');
      if (dteSelect.value) {
        updateATMandPremium(true); // Force reset strike when switching option type
      }
    });

    putOption.addEventListener('click', function() {
      putOption.classList.add('selected');
      callOption.classList.remove('selected');
      if (dteSelect.value) {
        updateATMandPremium(true); // Force reset strike when switching option type
      }
    });
  }
  
  // DTE selection
  dteSelect.addEventListener('change', function() {
    if (this.value) {
      updateATMandPremium();
      watchOnlyBtn.disabled = false;
      buyInBtn.disabled = false;
    } else {
      watchOnlyBtn.disabled = true;
      buyInBtn.disabled = true;
      document.getElementById('atmStrikeGroup').style.display = 'none';
      document.getElementById('premiumGroup').style.display = 'none';
      document.getElementById('strikeGroup').style.display = 'none';
    }
  });

  // Strike selection
  const strikeSelect = document.getElementById('manualStrike');
  strikeSelect.addEventListener('change', async function() {
    if (this.value) {
      // 🔒 SAFETY: Disable buttons while loading premium for new strike
      watchOnlyBtn.disabled = true;
      buyInBtn.disabled = true;

      // Show loading state in premium display
      const premiumValue = document.getElementById('premiumValue');
      premiumValue.textContent = 'Loading...';
      premiumValue.classList.add('loading');

      // Update premium for selected strike
      await updatePremiumForStrike(parseFloat(this.value));

      // Re-enable buttons after premium is loaded
      // Small delay to ensure UI has updated
      setTimeout(() => {
        watchOnlyBtn.disabled = false;
        buyInBtn.disabled = false;
      }, 100);
    }
  });

  // Cancel button
  cancelBtn.addEventListener('click', () => {
    modal.classList.remove('active');
    resetManualEntryForm();
  });

  // Watch Only button
  watchOnlyBtn.addEventListener('click', () => {
    handleWatchOnly();
  });

  // Buy In button
  buyInBtn.addEventListener('click', () => {
    handleBuyIn();
  });
  
  // Close on background click
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      modal.classList.remove('active');
      resetManualEntryForm();
    }
  });
}

function setupCopyTradeModal() {
  // Prevent multiple initializations
  if (window._copyTradeModalInitialized) return;
  window._copyTradeModalInitialized = true;

  const modal = document.getElementById('copyTradeModal');
  const cancelBtn = document.getElementById('cancelCopyTradeBtn');
  const addBtn = document.getElementById('addCopyTradeBtn');
  const traderSelect = document.getElementById('copyTrader');
  const amountInput = document.getElementById('copyAmount');
  const tickerInput = document.getElementById('copyTickerInput');
  const addTickerBtn = document.getElementById('addTickerBtn');
  const tickerChipsContainer = document.getElementById('tickerChipsContainer');
  const defaultModeBtn = document.getElementById('defaultModeBtn');
  const paperModeBtn = document.getElementById('paperModeBtn');
  const liveModeBtn = document.getElementById('liveModeBtn');

  if (!modal) {
    window._copyTradeModalInitialized = false;
    return;
  }

  // Store selected tickers and trading mode in memory
  window.selectedCopyTickers = window.selectedCopyTickers || [];
  window.selectedTradingMode = window.selectedTradingMode || 'default'; // Default to default account

  // Trading mode button functionality
  const selectTradingMode = (mode) => {
    window.selectedTradingMode = mode;

    // Reset all buttons to inactive state
    defaultModeBtn.style.background = 'rgba(255,255,255,0.05)';
    defaultModeBtn.style.color = '#9ca3af';
    defaultModeBtn.style.borderColor = 'rgba(255,255,255,0.1)';
    paperModeBtn.style.background = 'rgba(255,255,255,0.05)';
    paperModeBtn.style.color = '#9ca3af';
    paperModeBtn.style.borderColor = 'rgba(255,255,255,0.1)';
    liveModeBtn.style.background = 'rgba(255,255,255,0.05)';
    liveModeBtn.style.color = '#9ca3af';
    liveModeBtn.style.borderColor = 'rgba(255,255,255,0.1)';

    // Activate selected mode
    if (mode === 'default') {
      defaultModeBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
      defaultModeBtn.style.color = 'white';
      defaultModeBtn.style.borderColor = '#10b981';
    } else if (mode === 'paper') {
      paperModeBtn.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
      paperModeBtn.style.color = 'white';
      paperModeBtn.style.borderColor = '#3b82f6';
    } else if (mode === 'live') {
      liveModeBtn.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
      liveModeBtn.style.color = 'white';
      liveModeBtn.style.borderColor = '#ef4444';
    }
  };

  defaultModeBtn.addEventListener('click', () => selectTradingMode('default'));
  paperModeBtn.addEventListener('click', () => selectTradingMode('paper'));
  liveModeBtn.addEventListener('click', () => selectTradingMode('live'));

  // Initialize with default mode selected
  selectTradingMode('default');

  // Ticker chip functionality
  const addTickerChip = (ticker) => {
    const upperTicker = ticker.toUpperCase().trim();
    if (!upperTicker || window.selectedCopyTickers.includes(upperTicker)) return;

    window.selectedCopyTickers.push(upperTicker);
    renderTickerChips();
    tickerInput.value = '';
  };

  const removeTickerChip = (ticker) => {
    window.selectedCopyTickers = window.selectedCopyTickers.filter(t => t !== ticker);
    renderTickerChips();
  };

  const renderTickerChips = () => {
    if (window.selectedCopyTickers.length === 0) {
      tickerChipsContainer.innerHTML = '<div style="color: #6b7280; font-size: 13px; padding: 4px 0;">No tickers selected (will copy all tickers)</div>';
      return;
    }

    tickerChipsContainer.innerHTML = window.selectedCopyTickers.map(ticker => `
      <div class="ticker-chip" data-ticker="${ticker}" style="
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        color: white;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      ">
        <span>${ticker}</span>
        <span style="opacity: 0.8; font-size: 16px; line-height: 1;">×</span>
      </div>
    `).join('');

    // Add click handlers to remove chips
    tickerChipsContainer.querySelectorAll('.ticker-chip').forEach(chip => {
      chip.addEventListener('click', function() {
        removeTickerChip(this.getAttribute('data-ticker'));
      });
    });
  };

  // Add ticker button
  addTickerBtn.addEventListener('click', () => {
    addTickerChip(tickerInput.value);
  });

  // Add ticker on Enter key
  tickerInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTickerChip(tickerInput.value);
    }
  });

  // Validate form on input changes
  const validateForm = () => {
    const trader = traderSelect.value;
    const amount = parseFloat(amountInput.value);
    addBtn.disabled = !trader || !amount || amount <= 0;
  };

  traderSelect.addEventListener('change', validateForm);
  amountInput.addEventListener('input', validateForm);

  // Cancel button
  cancelBtn.addEventListener('click', () => {
    modal.classList.remove('active');
    window.selectedCopyTickers = [];
    renderTickerChips();
  });

  // Add copy trade rule
  addBtn.addEventListener('click', async () => {
    await addCopyTradeRule();
  });

  // Close on background click
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      modal.classList.remove('active');
      window.selectedCopyTickers = [];
      renderTickerChips();
    }
  });

  // Initialize ticker chips display
  renderTickerChips();
}

async function openCopyTradeModal() {
  const modal = document.getElementById('copyTradeModal');
  if (!modal) return;

  modal.classList.add('active');

  // Reset ticker chips
  window.selectedCopyTickers = [];
  const tickerChipsContainer = document.getElementById('tickerChipsContainer');
  if (tickerChipsContainer) {
    tickerChipsContainer.innerHTML = '<div style="color: #6b7280; font-size: 13px; padding: 4px 0;">No tickers selected (will copy all tickers)</div>';
  }

  // Load active rules
  await loadActiveCopyTrades();
}

async function loadActiveCopyTrades() {
  const listContainer = document.getElementById('activeCopyTradesList');
  const groupContainer = document.getElementById('activeCopyTradesGroup');

  if (!listContainer || !groupContainer) return;

  try {
    const response = await fetch('/api/copy-trade/settings', {
      credentials: 'include'
    });

    const data = await response.json();

    if (data.success && data.settings && data.settings.length > 0) {
      groupContainer.style.display = 'block';

      listContainer.innerHTML = data.settings.map(rule => {
        const timeStr = (rule.start_hour !== null && rule.end_hour !== null)
          ? `${String(rule.start_hour).padStart(2, '0')}:${String(rule.start_minute).padStart(2, '0')} - ${String(rule.end_hour).padStart(2, '0')}:${String(rule.end_minute).padStart(2, '0')}`
          : 'All Day';

        const tickerStr = rule.ticker ? rule.ticker : 'ALL TICKERS';

        // Display name with emoji
        const traderDisplay = rule.trader === 'elite' ? '🔥 Elite' : rule.trader === 'brando' ? '💜 Brando+Shoof' : rule.trader;

        // Trading mode badge
        const tradingMode = rule.trading_mode || 'paper';
        let modeEmoji, modeColor, modeText;

        if (tradingMode === 'default') {
          modeEmoji = '💰';
          modeColor = '#10b981';
          modeText = 'DEFAULT';
        } else if (tradingMode === 'live') {
          modeEmoji = '🔴';
          modeColor = '#ef4444';
          modeText = 'LIVE';
        } else {
          modeEmoji = '📄';
          modeColor = '#3b82f6';
          modeText = 'PAPER';
        }

        return `
          <div class="copy-trade-rule" data-id="${rule.id}" style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span style="font-weight: 600; color: #10b981;">${traderDisplay}</span>
                <span style="background: ${modeColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 700;">${modeEmoji} ${modeText}</span>
              </div>
              <div style="font-size: 13px; color: #9ca3af;">
                <span style="color: #3b82f6;">${tickerStr}</span> •
                <span>${timeStr}</span> •
                <span style="color: #fbbf24;">$${rule.amount_per_trade}</span>
              </div>
            </div>
            <button class="delete-copy-trade-btn" data-id="${rule.id}" style="background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">Delete</button>
          </div>
        `;
      }).join('');

      // Add delete button listeners
      document.querySelectorAll('.delete-copy-trade-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
          const id = this.getAttribute('data-id');
          await deleteCopyTradeRule(id);
        });
      });
    } else {
      groupContainer.style.display = 'none';
    }
  } catch (error) {
    console.error('Error loading copy trades:', error);
    groupContainer.style.display = 'none';
  }
}

async function addCopyTradeRule() {
  const trader = document.getElementById('copyTrader').value;
  const startTimeStr = document.getElementById('copyStartTime').value;
  const endTimeStr = document.getElementById('copyEndTime').value;
  const amount = parseFloat(document.getElementById('copyAmount').value);

  if (!trader || !amount || amount <= 0) {
    alert('Please fill in all required fields');
    return;
  }

  // Parse time strings (format: "HH:MM")
  let startHour = null, startMinute = null, endHour = null, endMinute = null;

  if (startTimeStr) {
    const [h, m] = startTimeStr.split(':');
    startHour = parseInt(h);
    startMinute = parseInt(m);
  }

  if (endTimeStr) {
    const [h, m] = endTimeStr.split(':');
    endHour = parseInt(h);
    endMinute = parseInt(m);
  }

  // Validate time inputs if provided
  if ((startTimeStr || endTimeStr) && !(startTimeStr && endTimeStr)) {
    alert('Please provide both start and end times, or leave both empty for all-day trading');
    return;
  }

  const addBtn = document.getElementById('addCopyTradeBtn');
  const originalText = addBtn.textContent;
  addBtn.disabled = true;
  addBtn.textContent = '⏳ Adding...';

  try {
    // Get fresh CSRF token
    const verifyResp = await fetch('/api/auth/verify', { credentials: 'include' });
    const verifyData = await verifyResp.json();

    if (!verifyData.valid || !verifyData.csrfToken) {
      showToast({
        type: 'error',
        title: 'Session Expired',
        message: 'Please login again to continue.'
      });
      return;
    }

    // If no tickers selected, create one rule for all tickers
    const tickersToAdd = window.selectedCopyTickers.length > 0 ? window.selectedCopyTickers : [null];
    const tradingMode = window.selectedTradingMode || 'paper';

    let successCount = 0;
    let errorCount = 0;

    for (const ticker of tickersToAdd) {
      const response = await fetch('/api/copy-trade/settings', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': verifyData.csrfToken
        },
        body: JSON.stringify({
          trader,
          ticker,
          startHour,
          startMinute,
          endHour,
          endMinute,
          amountPerTrade: amount,
          tradingMode: tradingMode
        })
      });

      const data = await response.json();

      if (data.success) {
        successCount++;
      } else {
        errorCount++;
        console.error(`Failed to add rule for ticker ${ticker}:`, data.error);
      }
    }

    if (successCount > 0) {
      // Reset form
      document.getElementById('copyTickerInput').value = '';
      document.getElementById('copyStartTime').value = '';
      document.getElementById('copyEndTime').value = '';
      document.getElementById('copyAmount').value = '';
      window.selectedCopyTickers = [];

      const tickerChipsContainer = document.getElementById('tickerChipsContainer');
      if (tickerChipsContainer) {
        tickerChipsContainer.innerHTML = '<div style="color: #6b7280; font-size: 13px; padding: 4px 0;">No tickers selected (will copy all tickers)</div>';
      }

      // Reload active copy trades
      await loadActiveCopyTrades();

      if (errorCount > 0) {
        alert(`⚠️ Added ${successCount} rule(s), but ${errorCount} failed`);
      } else {
        alert(`✅ Successfully added ${successCount} copy trade rule(s)!`);
      }
    } else {
      alert('❌ Failed to add copy trade rules');
    }
  } catch (error) {
    console.error('Error adding copy trade rule:', error);
    alert('❌ Failed to add copy trade rule');
  } finally {
    addBtn.disabled = false;
    addBtn.textContent = originalText;
  }
}

async function deleteCopyTradeRule(id) {
  if (!confirm('Are you sure you want to delete this copy trade rule?')) {
    return;
  }

  try {
    // Get fresh CSRF token
    const verifyResp = await fetch('/api/auth/verify', { credentials: 'include' });
    const verifyData = await verifyResp.json();

    if (!verifyData.valid || !verifyData.csrfToken) {
      showToast({
        type: 'error',
        title: 'Session Expired',
        message: 'Please login again to continue.'
      });
      return;
    }

    const response = await fetch(`/api/copy-trade/settings/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'X-CSRF-Token': verifyData.csrfToken
      }
    });

    const data = await response.json();

    if (data.success) {
      await loadActiveCopyTrades();
      alert('✅ Copy trade rule deleted successfully!');
    } else {
      alert('❌ Failed to delete copy trade rule: ' + (data.error || 'Unknown error'));
    }
  } catch (error) {
    console.error('Error deleting copy trade rule:', error);
    alert('❌ Failed to delete copy trade rule');
  }
}

// ===== EXIT SETTINGS MODAL =====

function setupExitSettingsModal() {
  // Prevent multiple initializations
  if (window._exitSettingsModalInitialized) return;
  window._exitSettingsModalInitialized = true;

  const modal = document.getElementById('exitSettingsModal');
  const cancelBtn = document.getElementById('cancelExitSettingsBtn');
  const saveBtn = document.getElementById('saveExitSettingsBtn');

  if (!modal) {
    window._exitSettingsModalInitialized = false;
    return;
  }

  // Cancel button
  cancelBtn.addEventListener('click', () => {
    modal.classList.remove('active');
  });

  // Save button
  saveBtn.addEventListener('click', async () => {
    await saveExitSettings();
  });

  // Close on background click
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  });
}

async function openExitSettingsModal() {
  const modal = document.getElementById('exitSettingsModal');
  if (!modal) return;

  modal.classList.add('active');

  // Load existing settings
  await loadExitSettings();
}

async function loadExitSettings() {
  try {
    const response = await fetch('/api/exit-settings', {
      credentials: 'include'
    });

    const data = await response.json();

    if (data.success && data.settings) {
      // Populate inputs with saved settings
      const settings = data.settings;

      document.getElementById('manualStopLoss').value = settings.manual?.stopLoss || '';
      document.getElementById('manualTakeProfit').value = settings.manual?.takeProfit || '';
      document.getElementById('eliteStopLoss').value = settings.elite?.stopLoss || '';
      document.getElementById('eliteTakeProfit').value = settings.elite?.takeProfit || '';
      document.getElementById('brandoStopLoss').value = settings.brando?.stopLoss || '';
      document.getElementById('brandoTakeProfit').value = settings.brando?.takeProfit || '';
    }

    // Load auto-stop after exit setting from localStorage
    const autoStopCheckbox = document.getElementById('autoStopAfterExitCheckbox');
    if (autoStopCheckbox) {
      const autoStopValue = localStorage.getItem('autoStopAfterExit');
      autoStopCheckbox.checked = autoStopValue === 'true';
    }

    // Load instant exit setting from localStorage
    const instantExitCheckbox = document.getElementById('instantExitCheckbox');
    if (instantExitCheckbox) {
      const instantExitValue = localStorage.getItem('instantExit');
      instantExitCheckbox.checked = instantExitValue === 'true';
    }
  } catch (error) {
    console.error('Error loading exit settings:', error);
  }
}

async function saveExitSettings() {
  const saveBtn = document.getElementById('saveExitSettingsBtn');
  const originalText = saveBtn.textContent;
  saveBtn.disabled = true;
  saveBtn.textContent = '⏳ Saving...';

  try {
    // Get fresh CSRF token
    const verifyResp = await fetch('/api/auth/verify', { credentials: 'include' });
    const verifyData = await verifyResp.json();

    if (!verifyData.valid || !verifyData.csrfToken) {
      alert('❌ Session expired. Please login again.');
      saveBtn.disabled = false;
      saveBtn.textContent = originalText;
      return;
    }

    // Collect settings from inputs
    const settings = {
      manual: {
        stopLoss: parseFloat(document.getElementById('manualStopLoss').value) || null,
        takeProfit: parseFloat(document.getElementById('manualTakeProfit').value) || null
      },
      elite: {
        stopLoss: parseFloat(document.getElementById('eliteStopLoss').value) || null,
        takeProfit: parseFloat(document.getElementById('eliteTakeProfit').value) || null
      },
      brando: {
        stopLoss: parseFloat(document.getElementById('brandoStopLoss').value) || null,
        takeProfit: parseFloat(document.getElementById('brandoTakeProfit').value) || null
      }
    };

    const response = await fetch('/api/exit-settings', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': verifyData.csrfToken
      },
      body: JSON.stringify({ settings })
    });

    const data = await response.json();

    // Save auto-stop after exit setting to localStorage
    const autoStopCheckbox = document.getElementById('autoStopAfterExitCheckbox');
    if (autoStopCheckbox) {
      localStorage.setItem('autoStopAfterExit', autoStopCheckbox.checked ? 'true' : 'false');
      console.log('✅ Auto-stop after exit setting saved:', autoStopCheckbox.checked);
    }

    // Save instant exit setting to localStorage
    const instantExitCheckbox = document.getElementById('instantExitCheckbox');
    if (instantExitCheckbox) {
      localStorage.setItem('instantExit', instantExitCheckbox.checked ? 'true' : 'false');
      console.log('✅ Instant exit setting saved:', instantExitCheckbox.checked);
    }

    if (data.success) {
      alert('✅ Exit settings saved successfully!');
      document.getElementById('exitSettingsModal').classList.remove('active');
    } else {
      alert('❌ Failed to save exit settings: ' + (data.error || 'Unknown error'));
    }
  } catch (error) {
    console.error('Error saving exit settings:', error);
    alert('❌ Failed to save exit settings');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = originalText;
  }
}

async function handleManualSearch() {
  const ticker = document.getElementById('manualTicker').value.trim().toUpperCase();
  const searchStatus = document.getElementById('searchStatus');
  const searchBtn = document.getElementById('manualSearchBtn');
  const dteGroup = document.getElementById('dteGroup');
  const optionTypeGroup = document.getElementById('optionTypeGroup');
  const dteSelect = document.getElementById('manualDTE');

  if (!ticker) return;

  // Clear cache for previous ticker to ensure fresh data
  if (window.cachedOptionsChain) {
    console.log('🗑️ Clearing previous ticker cache');
    window.cachedOptionsChain = {};
  }

  // Reset previous ATM/premium data
  document.getElementById('atmStrikeGroup').style.display = 'none';
  document.getElementById('premiumGroup').style.display = 'none';
  document.getElementById('atmStrikeValue').textContent = '--';
  document.getElementById('premiumValue').textContent = 'Loading...';
  document.getElementById('watchOnlyBtn').disabled = true;
  document.getElementById('buyInBtn').disabled = true;
  
  // Show loading
  searchBtn.disabled = true;
  searchBtn.textContent = '⏳ Searching...';
  searchStatus.textContent = 'Looking up ticker...';
  searchStatus.className = 'form-hint';
  
  try {
    // Call backend to get cached expirations
    const response = await fetch(`/api/theta/cached-expirations?ticker=${ticker}`, {
      credentials: 'include'
    });
    
    const data = await response.json();
    
    if (data.success && data.expirations && data.expirations.length > 0) {
  // Success - populate dropdown with first option selected
  dteSelect.innerHTML = data.expirations.map((exp, index) => {
    return `<option value="${exp.expiration}" ${index === 0 ? 'selected' : ''}>${exp.label}</option>`;
  }).join('');
  
  // Show groups
  dteGroup.style.display = 'block';
  optionTypeGroup.style.display = 'block';
  
  searchStatus.textContent = `✅ Found ${data.expirations.length} expirations`;
  searchStatus.className = 'form-hint success';
  
  // Auto-trigger ATM/premium fetch since CALL is pre-selected and we now have a DTE
  setTimeout(() => {
    updateATMandPremium();
  }, 100);
} else {
      // Not found
      searchStatus.textContent = '⚠️ Ticker not in options universe (195 tickers only)';
      searchStatus.className = 'form-hint error';
      dteGroup.style.display = 'none';
      optionTypeGroup.style.display = 'none';
    }
  } catch (error) {
    console.error('Search error:', error);
    searchStatus.textContent = '❌ Search failed';
    searchStatus.className = 'form-hint error';
  } finally {
    searchBtn.disabled = false;
    searchBtn.textContent = '🔍 Search';
  }
}

function recalculateATMStrike(stockPrice, optionType) {
  const ticker = document.getElementById('manualTicker')?.value?.trim()?.toUpperCase();
  const expiration = document.getElementById('manualDTE')?.value;

  if (!ticker || !expiration || !window.cachedOptionsChain || !window.cachedOptionsChain[ticker + expiration]) {
    console.warn('⚠️ Cannot recalculate ATM - missing data');
    return;
  }

  console.log('🔄 Recalculating ATM strike with new stock price:', stockPrice);

  const optionsData = window.cachedOptionsChain[ticker + expiration];
  const filteredOptions = optionsData.filter(opt => opt.right === optionType);

  if (filteredOptions.length === 0) {
    console.error('❌ No options found for type', optionType);
    return;
  }

  // Use same search logic as updateATMandPremium
  const searchRanges = [
    { name: 'Within $0.50', tolerance: 0.50 },
    { name: 'Within $1.00', tolerance: 1.00 },
    { name: 'Within $2.00', tolerance: 2.00 },
    { name: 'Within $5.00', tolerance: 5.00 },
    { name: 'Within $10.00', tolerance: 10.00 },
    { name: 'Within $25.00', tolerance: 25.00 },
    { name: 'Any strike', tolerance: Infinity }
  ];

  let atmStrike = null;
  let atmOption = null;

  for (const range of searchRanges) {
    const candidatesInRange = filteredOptions.filter(opt =>
      Math.abs(opt.strike - stockPrice) <= range.tolerance
    );

    if (candidatesInRange.length > 0) {
      // Directional sorting
      if (optionType === 'C') {
        candidatesInRange.sort((a, b) => {
          const aAbove = a.strike >= stockPrice;
          const bAbove = b.strike >= stockPrice;
          if (aAbove === bAbove) {
            return Math.abs(a.strike - stockPrice) - Math.abs(b.strike - stockPrice);
          }
          return aAbove ? -1 : 1;
        });
      } else {
        candidatesInRange.sort((a, b) => {
          const aBelow = a.strike <= stockPrice;
          const bBelow = b.strike <= stockPrice;
          if (aBelow === bBelow) {
            return Math.abs(a.strike - stockPrice) - Math.abs(b.strike - stockPrice);
          }
          return aBelow ? -1 : 1;
        });
      }

      atmOption = candidatesInRange[0];
      atmStrike = atmOption.strike;
      console.log(`✅ New ATM strike: ${atmStrike.toFixed(2)} (${range.name})`);
      break;
    }
  }

  if (!atmStrike) {
    console.error('❌ No suitable strike found');
    return;
  }

  // Update display
  const position = atmStrike > stockPrice ? 'OTM ⬆️' : atmStrike < stockPrice ? 'ITM ⬇️' : 'ATM 🎯';
  const positionColor = atmStrike > stockPrice ? '#10b981' : atmStrike < stockPrice ? '#f59e0b' : '#3b82f6';

  const atmStrikeEl = document.getElementById('atmStrikeValue');
  if (atmStrikeEl) {
    const oldStrike = atmStrikeEl.textContent;
    const newStrike = '$' + atmStrike.toFixed(2);

    if (oldStrike !== newStrike) {
      atmStrikeEl.textContent = newStrike;
      atmStrikeEl.style.color = positionColor;
      atmStrikeEl.style.animation = 'none';
      void atmStrikeEl.offsetWidth;
      atmStrikeEl.style.animation = 'flash-price 0.3s ease-in-out';
      console.log('✅ ATM STRIKE UPDATED:', oldStrike, '→', newStrike);
    }
  }

  const atmLabel = document.querySelector('.atm-strike-label');
  if (atmLabel) {
    atmLabel.textContent = `ATM Strike (${position})`;
  }

  // Update subscription to new strike
  if (window.appState && window.appState.ws && window.appState.ws.readyState === 1) {
    const ws = window.appState.ws;

    // 🔥 CRITICAL FIX: Unsubscribe from previous contract BEFORE subscribing to new one
    if (window.currentModalContract) {
      const [oldRoot, oldExp, oldStrike, oldRight] = window.currentModalContract.split(':');
      console.log('📡 Unsubscribing from previous contract:', window.currentModalContract);
      ws.send(JSON.stringify({
        type: 'untrack_contract',
        root: oldRoot,
        expiration: oldExp,
        strike: parseFloat(oldStrike),
        right: oldRight
      }));
    }

    const subscribeMessage = {
      type: 'track_contract',
      root: ticker,
      expiration: expiration,
      strike: atmStrike,
      right: optionType
    };

    console.log('📡 Re-subscribing to new strike:', subscribeMessage);
    ws.send(JSON.stringify(subscribeMessage));

    // Update the stored contract key
    const normalizedStrike = parseFloat(atmStrike).toString().replace(/\.0$/, '');
    window.currentModalContract = `${ticker}:${expiration}:${normalizedStrike}:${optionType}`;
    console.log('🔑 Updated modal contract key:', window.currentModalContract);
  }
}

// Update premium when user selects a different strike from dropdown
function updatePremiumForStrike(selectedStrike) {
  const ticker = document.getElementById('manualTicker').value.trim().toUpperCase();
  const expiration = document.getElementById('manualDTE').value;
  const optionType = document.querySelector('.form-radio-option.selected')?.getAttribute('data-value') || 'C';

  console.log('🔍 [UPDATE PREMIUM] Inputs:', { ticker, expiration, selectedStrike, optionType });

  if (!ticker || !expiration || !window.currentStrikeOptions) {
    console.log('⚠️ Missing data:', { ticker, expiration, hasOptions: !!window.currentStrikeOptions });
    return;
  }

  // Find the selected strike in our cached options
  const selectedOption = window.currentStrikeOptions.find(opt => opt.strike === selectedStrike);

  if (!selectedOption) {
    console.error('❌ Selected strike not found in cached options');
    console.log('Available strikes:', window.currentStrikeOptions.map(o => o.strike));
    return;
  }

  console.log('✅ Found option:', selectedOption);

  // 🔥 FIX: Use the expiration from the selectedOption, not the dropdown!
  // The cached options might have a different expiration if the data is stale
  const actualExpiration = selectedOption.expiration || expiration;
  console.log('📅 Using expiration:', actualExpiration, '(dropdown:', expiration, ')');

  const stockPrice = window.currentStockPrice || 0;

  // Update ATM Strike Display
  const position = selectedStrike > stockPrice ? 'OTM ⬆️' : selectedStrike < stockPrice ? 'ITM ⬇️' : 'ATM 🎯';
  const positionColor = selectedStrike > stockPrice ? '#10b981' : selectedStrike < stockPrice ? '#f59e0b' : '#3b82f6';

  document.getElementById('atmStrikeValue').textContent = '$' + selectedStrike.toFixed(2);
  document.getElementById('atmStrikeValue').style.color = positionColor;

  const atmLabel = document.querySelector('.atm-strike-label');
  if (atmLabel) {
    atmLabel.textContent = `Selected Strike (${position})`;
  }

  // Update Premium Display (BUY premium = ASK price)
  if (selectedOption.ask && selectedOption.ask > 0) {
    document.getElementById('premiumValue').textContent = '$' + selectedOption.ask.toFixed(2);
    document.getElementById('premiumValue').classList.remove('loading');
  } else if (selectedOption.bid && selectedOption.bid > 0) {
    // Fallback to bid if ask unavailable
    document.getElementById('premiumValue').textContent = '$' + selectedOption.bid.toFixed(2);
    document.getElementById('premiumValue').classList.remove('loading');
  } else {
    document.getElementById('premiumValue').textContent = 'Loading...';
    document.getElementById('premiumValue').classList.add('loading');
  }

  // Re-subscribe to WebSocket for the new strike
  if (window.appState && window.appState.ws && window.appState.ws.readyState === 1) {
    const ws = window.appState.ws;

    // Unsubscribe from previous contract
    if (window.currentModalContract) {
      const [oldRoot, oldExp, oldStrike, oldRight] = window.currentModalContract.split(':');
      console.log('📡 Unsubscribing from previous strike:', window.currentModalContract);
      ws.send(JSON.stringify({
        type: 'untrack_contract',
        root: oldRoot,
        expiration: oldExp,
        strike: parseFloat(oldStrike),
        right: oldRight
      }));
    }

    // Subscribe to new strike (use actualExpiration from the option data!)
    const subscribeMessage = {
      type: 'track_contract',
      root: ticker,
      expiration: actualExpiration,
      strike: selectedStrike,
      right: optionType
    };

    console.log('📡 Subscribing to new strike:', subscribeMessage);
    ws.send(JSON.stringify(subscribeMessage));

    // Update stored contract key (use actualExpiration!)
    const normalizedStrike = parseFloat(selectedStrike).toString().replace(/\.0$/, '');
    window.currentModalContract = `${ticker}:${actualExpiration}:${normalizedStrike}:${optionType}`;

    console.log('✅ Subscribed to WebSocket for strike:', selectedStrike);
    console.log('🔑 Updated modal contract key:', window.currentModalContract);
  }
}

async function updateATMandPremium(forceResetStrike = false) {
  // 🔥 FIX: Don't fetch live stock quotes in backtest mode
  if (window.backtestMode) {
    console.log('⏭️ Skipping ATM/Premium update - in backtest mode');
    return;
  }

  const ticker = document.getElementById('manualTicker').value.trim().toUpperCase();
  const expiration = document.getElementById('manualDTE').value;
  const optionType = document.querySelector('.form-radio-option.selected')?.getAttribute('data-value') || 'C';

  if (!ticker || !expiration) return;
  
  // Show groups
  document.getElementById('atmStrikeGroup').style.display = 'block';
  document.getElementById('premiumGroup').style.display = 'block';
  
  // Show loading
  document.getElementById('atmStrikeValue').textContent = 'Loading...';
  document.getElementById('premiumValue').textContent = 'Loading...';
  document.getElementById('premiumValue').classList.add('loading');
  
  // Enable buttons immediately since we have ticker + expiration
  document.getElementById('watchOnlyBtn').disabled = false;
  document.getElementById('buyInBtn').disabled = false;
  
  try {
    // Step 1: Get real stock price first
    console.log('📊 Fetching stock price for', ticker);
    const stockResponse = await fetch(`/api/stock-quote?symbol=${ticker}`, {
      credentials: 'include'
    });

    const stockData = await stockResponse.json();

    // Check if API returned an error
    if (!stockData.success || !stockData.response) {
      const errorMsg = stockData.error || 'ThetaData unavailable';
      console.error('❌ Stock quote error:', errorMsg);
      document.getElementById('atmStrikeValue').textContent = 'Unavailable';
      document.getElementById('atmStrikeValue').title = errorMsg;
      document.getElementById('premiumValue').textContent = 'N/A';
      document.getElementById('premiumValue').classList.remove('loading');

      // Show user-friendly message
      alert(`⚠️ Unable to fetch stock price for ${ticker}\n\n${errorMsg}\n\nPlease ensure ThetaData is running and market is open.`);
      return;
    }

    const stockPrice = stockData.response.price;

    if (!stockPrice || stockPrice <= 0) {
      console.error('❌ Invalid stock price:', stockPrice);
      document.getElementById('atmStrikeValue').textContent = 'Error';
      document.getElementById('premiumValue').textContent = 'N/A';
      document.getElementById('premiumValue').classList.remove('loading');
      return;
    }
    
    console.log('✅ Stock price:', stockPrice);

    // Step 2: Check cache first, then fetch options chain if needed
    const cacheKey = ticker + expiration;
    let optionsResponse;

    // Initialize cache if needed
    if (!window.cachedOptionsChain) {
      window.cachedOptionsChain = {};
    }

    // Check if data is already cached
    if (window.cachedOptionsChain[cacheKey]) {
      console.log('⚡ Using cached options chain for', cacheKey);
      optionsResponse = window.cachedOptionsChain[cacheKey];
    } else {
      // Fetch from API only if not cached
      console.log('📡 Fetching options chain from API for', cacheKey);
      const response = await fetch(`/api/options-chain?symbol=${ticker}&expiration=${expiration}`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        console.error('❌ Options chain fetch failed:', response.status);
        document.getElementById('atmStrikeValue').textContent = 'Error';
        document.getElementById('premiumValue').textContent = 'N/A';
        document.getElementById('premiumValue').classList.remove('loading');
        return;
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('❌ Expected JSON but got:', contentType);
        document.getElementById('atmStrikeValue').textContent = 'Error';
        document.getElementById('premiumValue').textContent = 'N/A';
        document.getElementById('premiumValue').classList.remove('loading');
        return;
      }

      const optionsData = await response.json();

      if (!optionsData.response || optionsData.response.length === 0) {
        document.getElementById('atmStrikeValue').textContent = 'No data';
        document.getElementById('premiumValue').textContent = 'N/A';
        document.getElementById('premiumValue').classList.remove('loading');
        return;
      }

      // Cache the fetched data
      optionsResponse = optionsData.response;
      window.cachedOptionsChain[cacheKey] = optionsResponse;
      console.log(`✅ Cached ${optionsResponse.length} options for`, cacheKey);
    }

    // Step 3: Filter options by type FIRST
    const filteredOptions = optionsResponse.filter(opt => opt.right === optionType);
    
    if (filteredOptions.length === 0) {
      console.error('❌ No options found for type', optionType);
      document.getElementById('atmStrikeValue').textContent = 'No data';
      document.getElementById('premiumValue').textContent = 'N/A';
      document.getElementById('premiumValue').classList.remove('loading');
      return;
    }
    
    console.log(`📊 Found ${filteredOptions.length} ${optionType} options`);

    // Step 4: Find 4 closest OTM strikes
    let otmStrikes = [];

    if (optionType === 'C') {
      // For CALLS: OTM means strikes >= stock price
      otmStrikes = filteredOptions
        .filter(opt => opt.strike >= stockPrice)
        .sort((a, b) => a.strike - b.strike) // Sort ascending (closest to stock price first)
        .slice(0, 4); // Take 4 closest
    } else {
      // For PUTS: OTM means strikes <= stock price
      otmStrikes = filteredOptions
        .filter(opt => opt.strike <= stockPrice)
        .sort((a, b) => b.strike - a.strike) // Sort descending (closest to stock price first)
        .slice(0, 4); // Take 4 closest
    }

    if (otmStrikes.length === 0) {
      console.error('❌ No OTM strikes found, falling back to all strikes');
      // Fallback: just take the 4 closest strikes regardless of OTM/ITM
      otmStrikes = filteredOptions
        .sort((a, b) => Math.abs(a.strike - stockPrice) - Math.abs(b.strike - stockPrice))
        .slice(0, 4);
    }

    if (otmStrikes.length === 0) {
      console.error('❌ No strikes found at all');
      document.getElementById('atmStrikeValue').textContent = 'No data';
      document.getElementById('premiumValue').textContent = 'N/A';
      document.getElementById('premiumValue').classList.remove('loading');
      return;
    }

    console.log(`✅ Found ${otmStrikes.length} OTM strikes`);

    // Step 5: Populate strike dropdown
    const strikeDropdown = document.getElementById('manualStrike');
    strikeDropdown.innerHTML = '<option value="">Select strike...</option>';

    otmStrikes.forEach((opt, index) => {
      const option = document.createElement('option');
      option.value = opt.strike;
      option.textContent = `$${opt.strike.toFixed(2)} ${index === 0 ? '(Closest)' : ''}`;
      strikeDropdown.appendChild(option);
    });

    // Show the strike selector
    document.getElementById('strikeGroup').style.display = 'block';

    // Store options data for later use when strike is selected
    window.currentStrikeOptions = otmStrikes;
    window.currentStockPrice = stockPrice;

    // 🔥 FIX: Only preserve strike if not forced to reset
    let atmStrike;
    let atmOption;

    if (forceResetStrike) {
      // Force reset (e.g., switching between CALL/PUT) - always select closest strike
      atmOption = otmStrikes[0];
      atmStrike = atmOption.strike;
      strikeDropdown.value = atmStrike;
      console.log('🔄 Force reset - selected closest strike:', atmStrike.toFixed(2));
    } else {
      // Try to preserve user's selection if valid
      const currentSelection = strikeDropdown.value;
      const hasUserSelection = currentSelection && currentSelection !== "";
      const isSelectionStillValid = hasUserSelection && otmStrikes.some(opt => opt.strike.toString() === currentSelection);

      if (hasUserSelection && isSelectionStillValid) {
        // Preserve user's selection
        atmStrike = parseFloat(currentSelection);
        atmOption = otmStrikes.find(opt => opt.strike === atmStrike) || otmStrikes[0];
        console.log('✅ Preserved user selection:', atmStrike.toFixed(2));
      } else {
        // No valid selection - auto-select closest
        atmOption = otmStrikes[0];
        atmStrike = atmOption.strike;
        strikeDropdown.value = atmStrike;
        console.log('✅ Auto-selected closest strike:', atmStrike.toFixed(2));
      }
    }

    // Step 6: Visual position indicators
    const position = atmStrike > stockPrice ? 'OTM ⬆️' : atmStrike < stockPrice ? 'ITM ⬇️' : 'ATM 🎯';
    const positionColor = atmStrike > stockPrice ? '#10b981' : atmStrike < stockPrice ? '#f59e0b' : '#3b82f6';
    
    document.getElementById('atmStrikeValue').textContent = '$' + atmStrike.toFixed(2);
    document.getElementById('atmStrikeValue').style.color = positionColor;
    
    const atmLabel = document.querySelector('.atm-strike-label');
    if (atmLabel) {
      atmLabel.textContent = `ATM Strike (${position})`;
    }
    
    // Step 6: Display BUY premium (ASK price)
    if (atmOption && atmOption.ask && atmOption.ask > 0) {
      document.getElementById('premiumValue').textContent = '$' + atmOption.ask.toFixed(2);
      document.getElementById('premiumValue').classList.remove('loading');
    } else if (atmOption && atmOption.bid && atmOption.bid > 0) {
      // Fallback to bid if ask unavailable
      document.getElementById('premiumValue').textContent = '$' + atmOption.bid.toFixed(2);
      document.getElementById('premiumValue').classList.remove('loading');
    } else {
      document.getElementById('premiumValue').textContent = 'N/A';
      document.getElementById('premiumValue').classList.remove('loading');
    }
    
    // Step 7: Subscribe to WebSocket for LIVE updates
// Check WebSocket availability
const wsAvailable = window.appState && window.appState.ws;
const wsReady = wsAvailable && window.appState.ws.readyState === 1; // OPEN
const wsConnecting = wsAvailable && window.appState.ws.readyState === 0; // CONNECTING

if (wsReady) {
  const ws = window.appState.ws;

  // 🔥 CRITICAL FIX: Unsubscribe from previous contract BEFORE subscribing to new one
  if (window.currentModalContract) {
    const [oldRoot, oldExp, oldStrike, oldRight] = window.currentModalContract.split(':');
    console.log('📡 Unsubscribing from previous contract:', window.currentModalContract);
    ws.send(JSON.stringify({
      type: 'untrack_contract',
      root: oldRoot,
      expiration: oldExp,
      strike: parseFloat(oldStrike),
      right: oldRight
    }));
  }

  // Subscribe to the new contract (stock quotes are auto-subscribed by the backend)
  const subscribeMessage = {
    type: 'track_contract',
    root: ticker,
    expiration: expiration,
    strike: atmStrike,
    right: optionType
  };

  console.log('📡 Subscribing to contract:', subscribeMessage);
  ws.send(JSON.stringify(subscribeMessage));

  // Store the contract key for this modal so we can identify updates
  // Normalize strike to remove .0 suffix for consistent comparison
  const normalizedStrike = parseFloat(atmStrike).toString().replace(/\.0$/, '');
  window.currentModalContract = `${ticker}:${expiration}:${normalizedStrike}:${optionType}`;

  console.log('✅ Subscribed to WebSocket for:', ticker, expiration, atmStrike + optionType);
  console.log('🔑 Modal contract key:', window.currentModalContract);
  console.log('⏰ Waiting for live premium updates via WebSocket...');

  // 🔥 REMOVE POLLING - WebSocket handles all updates via the handler in connectToSignalStream()
  // Clear any existing polling interval
  if (window.modalPremiumInterval) {
    clearInterval(window.modalPremiumInterval);
    window.modalPremiumInterval = null;
  }

  console.log('✅ Live WebSocket updates enabled - no polling needed');

} else if (wsConnecting) {
  // WebSocket is connecting - wait for it and retry
  console.log('🔌 WebSocket is connecting... waiting for connection');

  const waitForWS = () => {
    if (window.appState && window.appState.ws && window.appState.ws.readyState === 1) {
      console.log('✅ WebSocket connected! Retrying subscription...');
      // Retry the whole updateATMandPremium function
      updateATMandPremium(ticker, expiration, currentPrice, optionType);
    } else if (window.appState && window.appState.ws && window.appState.ws.readyState === 0) {
      // Still connecting, wait a bit more
      setTimeout(waitForWS, 100);
    } else {
      // Connection failed, fall back to polling
      console.warn('⚠️ WebSocket connection failed - using polling instead');
      startModalPolling();
    }
  };

  setTimeout(waitForWS, 100);

} else {
  console.log('ℹ️ WebSocket not available - using polling for live updates');
  startModalPolling();
}

// Helper function to start polling
function startModalPolling() {

  if (window.modalPremiumInterval) {
    clearInterval(window.modalPremiumInterval);
  }

  window.modalPremiumInterval = setInterval(async () => {
    // 🔥 FIX: Don't poll live options data in backtest mode
    if (window.backtestMode) {
      console.log('⏭️ Skipping modal polling - in backtest mode');
      clearInterval(window.modalPremiumInterval);
      return;
    }

    const modal = document.getElementById('manualEntryModal');
    if (!modal || !modal.classList.contains('active')) {
      clearInterval(window.modalPremiumInterval);
      return;
    }

    try {
      const response = await fetch(`/api/options-chain?symbol=${ticker}&expiration=${expiration}`, {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.response && data.response.length > 0) {
        const option = data.response.find(opt =>
          opt.strike === atmStrike && opt.right === optionType
        );

        // Use ASK price (what you pay to buy) instead of MID for market orders
        if (option && (option.ask || option.mid) && (option.ask > 0 || option.mid > 0)) {
          const premiumEl = document.getElementById('premiumValue');
          if (premiumEl) {
            const displayPrice = option.ask > 0 ? option.ask : option.mid;
            premiumEl.textContent = '$' + displayPrice.toFixed(2);
            premiumEl.classList.remove('loading');
            premiumEl.style.animation = 'flash-price 0.3s ease-in-out';
          }
        }
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  }, 1000); // Fallback polling at 5 seconds (slower since WebSocket failed)
}
    
  } catch (error) {
    console.error('Failed to get ATM/premium:', error);
    document.getElementById('atmStrikeValue').textContent = 'Error';
    document.getElementById('premiumValue').textContent = 'N/A';
    document.getElementById('premiumValue').classList.remove('loading');
  }
}
async function handleWatchOnly() {
  const ticker = document.getElementById('manualTicker').value.trim().toUpperCase();
  const expiration = document.getElementById('manualDTE').value;
  const optionType = document.querySelector('.form-radio-option.selected')?.getAttribute('data-value') || 'C';

  // FIX: Use the actual selected strike from dropdown, not ATM strike
  const strikeSelect = document.getElementById('manualStrike');
  const selectedStrike = parseFloat(strikeSelect.value);

  if (!ticker || !expiration || !selectedStrike) {
    console.log('⚠️ Please complete all fields (including strike selection)');
    return;
  }

  // 🔒 CRITICAL FIX: Read premium from data source, not UI display to prevent race conditions
  if (!window.currentStrikeOptions || window.currentStrikeOptions.length === 0) {
    console.error('❌ No strike data available. Please search for a ticker first.');
    showToast({
      type: 'error',
      title: 'Data Not Available',
      message: 'Please search for the ticker again to load strike data.'
    });
    return;
  }

  // Find the selected strike in cached data
  const selectedOption = window.currentStrikeOptions.find(opt => opt.strike === selectedStrike);

  if (!selectedOption) {
    console.error('❌ Selected strike not found in cached options. Strike:', selectedStrike);
    showToast({
      type: 'error',
      title: 'Invalid Strike',
      message: 'The selected strike is no longer available. Please refresh the search.'
    });
    return;
  }

  // Get premium from data source (BUY = ASK price, or fallback to BID)
  const premium = selectedOption.ask && selectedOption.ask > 0
    ? selectedOption.ask
    : (selectedOption.bid && selectedOption.bid > 0 ? selectedOption.bid : 0);

  if (!premium || premium <= 0) {
    console.error('❌ No valid premium available for selected strike');
    showToast({
      type: 'error',
      title: 'Premium Unavailable',
      message: 'Unable to get premium for this strike. Please try again or select a different strike.'
    });
    return;
  }

  console.log(`✅ VALIDATED: Strike ${selectedStrike} matches premium $${premium.toFixed(2)}`);
  console.log(`👁️ Watch-Only: ${ticker} ${selectedStrike}${optionType} @ $${premium.toFixed(2)}`);

  // Check for duplicates
  const duplicate = window.liveSignals.find(s =>
    s.root === ticker &&
    s.expiration === expiration &&
    s.strike === selectedStrike &&
    s.right === optionType
  );

  if (duplicate) {
    console.log('⚠️ Contract already being watched - skipping');
    document.getElementById('manualEntryModal').classList.remove('active');
    resetManualEntryForm();
    return;
  }

  // Calculate DTE
  const today = new Date();
  const expDate = new Date(
    expiration.substring(0, 4),
    parseInt(expiration.substring(4, 6)) - 1,
    expiration.substring(6, 8)
  );
  const dte = Math.floor((expDate - today) / (1000 * 60 * 60 * 24));

  // Create signal object
  const newSignal = {
    id: `manual-${ticker}-${expiration}-${selectedStrike}-${optionType}-${Date.now()}`,
    root: ticker,
    strike: selectedStrike,  // Use selected strike
    right: optionType,
    expiration: expiration,
    dte: dte,
    trader: 'manual',
    receivedAt: Date.now(),
    status: 'complete',
    confluence: null,
    action: 'WATCH',
    reason: 'Manual watchlist entry',
    currentPrice: premium,
    entryPrice: null,
    pnl: 0,
    hasPosition: false,
    isNew: true,
    isManual: true,
    autoCharted: true,
    watchOnly: true
  };

  // Close modal FIRST
  document.getElementById('manualEntryModal').classList.remove('active');
  resetManualEntryForm();

  // Add to signals list immediately (optimistic update)
  console.log('📊 Adding signal to liveSignals array:', newSignal);
  window.liveSignals.push(newSignal);
  console.log('📊 liveSignals now has', window.liveSignals.length, 'signals');

  // Subscribe to WebSocket for live updates
  if (window.appState && window.appState.ws && window.appState.ws.readyState === 1) {
    const ws = window.appState.ws;
    const subscribeMessage = {
      type: 'track_contract',
      root: ticker,
      expiration: expiration,
      strike: selectedStrike,
      right: optionType
    };
    console.log('📡 Subscribing to contract for live updates:', subscribeMessage);
    ws.send(JSON.stringify(subscribeMessage));
  }

  // Update UI - Force immediate render
  console.log('🎨 Forcing UI update for new watch signal');
  updateTraderSignals();
  updateChartTradeSelection();

  // Show success toast
  showToast({
    type: 'success',
    title: 'Added to Watchlist',
    message: `${ticker} ${selectedStrike}${optionType === 'C' ? ' CALL' : ' PUT'}`,
    details: `Expiration: ${expiration} | Premium: $${premium.toFixed(2)}`
  });

  // Save to database for persistence
  console.log('💾 Saving Watch-Only signal to database...', newSignal);
  try {
    // Get fresh CSRF token
    const verifyResp = await fetch('/api/auth/verify', { credentials: 'include' });
    const verifyData = await verifyResp.json();

    if (!verifyData.valid || !verifyData.csrfToken) {
      console.error('❌ Session expired - cannot save to database');
      return;
    }

    const response = await fetch('/api/broker/save-manual-entry', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': verifyData.csrfToken
      },
      body: JSON.stringify(newSignal)
    });

    const result = await response.json();
    console.log('💾 Database save response:', result);

    if (result.success) {
      console.log('✅ Manual entry saved to database - will persist on refresh');

      // Update balance display immediately if new balance was returned
      if (result.newBalance !== null && result.newBalance !== undefined) {
        const balanceEl = document.getElementById('activeAccountBalance');
        if (balanceEl) {
          balanceEl.textContent = `$${result.newBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          console.log(`💰 Updated balance display immediately after entry: $${result.newBalance.toFixed(2)}`);
        }
      }
    } else {
      console.error('❌ Failed to save to database:', result.error);
      showToast({
        type: 'warning',
        title: 'Database Save Failed',
        message: 'Signal added but may not persist after refresh'
      });
    }
  } catch (error) {
    console.error('❌ Error saving manual entry:', error);
    showToast({
      type: 'warning',
      title: 'Database Save Failed',
      message: 'Signal added but may not persist after refresh'
    });
  }

  // Flash notification - remove "new" pulse after 5 seconds
  setTimeout(() => {
    const foundSignal = window.liveSignals.find(s => s.id === newSignal.id);
    if (foundSignal) {
      foundSignal.isNew = false;
      updateTraderSignals();
    }
  }, 5000);
}

async function handleBuyIn() {
  const ticker = document.getElementById('manualTicker').value.trim().toUpperCase();
  const expiration = document.getElementById('manualDTE').value;
  const optionType = document.querySelector('.form-radio-option.selected')?.getAttribute('data-value') || 'C';

  // FIX: Use the actual selected strike from dropdown, not ATM strike
  const strikeSelect = document.getElementById('manualStrike');
  const selectedStrike = parseFloat(strikeSelect.value);

  if (!ticker || !expiration || !selectedStrike) {
    console.log('⚠️ Please complete all fields (including strike selection)');
    return;
  }

  // 🔒 CRITICAL FIX: Read premium from data source, not UI display to prevent race conditions
  if (!window.currentStrikeOptions || window.currentStrikeOptions.length === 0) {
    console.error('❌ No strike data available. Please search for a ticker first.');
    showToast({
      type: 'error',
      title: 'Data Not Available',
      message: 'Please search for the ticker again to load strike data.'
    });
    return;
  }

  // Find the selected strike in cached data
  const selectedOption = window.currentStrikeOptions.find(opt => opt.strike === selectedStrike);

  if (!selectedOption) {
    console.error('❌ Selected strike not found in cached options. Strike:', selectedStrike);
    showToast({
      type: 'error',
      title: 'Invalid Strike',
      message: 'The selected strike is no longer available. Please refresh the search.'
    });
    return;
  }

  // Get premium from data source (BUY = ASK price, or fallback to BID)
  const premium = selectedOption.ask && selectedOption.ask > 0
    ? selectedOption.ask
    : (selectedOption.bid && selectedOption.bid > 0 ? selectedOption.bid : 0);

  if (!premium || premium <= 0) {
    console.error('❌ No valid premium available for selected strike');
    showToast({
      type: 'error',
      title: 'Premium Unavailable',
      message: 'Unable to get premium for this strike. Please try again or select a different strike.'
    });
    return;
  }

  console.log(`✅ VALIDATED: Strike ${selectedStrike} matches premium $${premium.toFixed(2)}`);
  console.log(`📝 Buy-In: ${ticker} ${selectedStrike}${optionType} @ $${premium.toFixed(2)}`);

  // Get active account to label this trade
  let accountType = 'default';
  try {
    const accountsResponse = await fetch('/api/broker/accounts', { credentials: 'include' });
    const accountsData = await accountsResponse.json();
    if (accountsData.success && accountsData.activeAccount) {
      accountType = accountsData.activeAccount;
      console.log(`🏷️ Labeling trade as: ${accountType.toUpperCase()}`);
    }
  } catch (error) {
    console.error('Error fetching active account:', error);
  }

  // Check for duplicates - allow buy-in even if already watching
  const duplicate = window.liveSignals.find(s =>
    s.root === ticker &&
    s.expiration === expiration &&
    s.strike === selectedStrike &&
    s.right === optionType
  );

  if (duplicate) {
    console.log('⚠️ Contract already exists - proceeding with buy anyway');
    // Continue to buy modal anyway
  }

  // Calculate DTE
  const today = new Date();
  const expDate = new Date(
    expiration.substring(0, 4),
    parseInt(expiration.substring(4, 6)) - 1,
    expiration.substring(6, 8)
  );
  const dte = Math.floor((expDate - today) / (1000 * 60 * 60 * 24));

  // Create signal object
  const newSignal = {
    id: `manual-${ticker}-${expiration}-${selectedStrike}-${optionType}-${Date.now()}`,
    root: ticker,
    strike: selectedStrike,  // Use selected strike
    right: optionType,
    expiration: expiration,
    dte: dte,
    trader: 'manual',
    receivedAt: Date.now(),
    status: 'complete',
    confluence: null,
    action: 'BUY',
    reason: 'Manual entry - immediate buy',
    currentPrice: premium,
    entryPrice: premium,
    pnl: 0,
    hasPosition: false,
    isNew: true,
    isManual: true,
    autoCharted: true,
    watchOnly: false,
    accountType: accountType  // Label with active account
  };

  // Store temporarily for amount modal
  window.currentManualBuy = newSignal;

  // Close manual entry modal
  document.getElementById('manualEntryModal').classList.remove('active');

  // Open amount modal
  showAmountModal(newSignal);
}

function addToLiveCharts(signal) {
  // Auto-check the checkbox in Live Charts tab
  const contractStr = `${signal.root}-${signal.strike}-${signal.right}`;
  
  // Update trade selection
  updateChartTradeSelection();
  
  // Find and check the checkbox
  setTimeout(() => {
    const checkbox = document.querySelector(`input[type="checkbox"][value="${contractStr}"]`);
    if (checkbox) {
      checkbox.checked = true;
      updateCharts();
      
      console.log(`✅ Auto-added ${contractStr} to Live Charts`);
    }
  }, 500);
}

function openManualEntryModal() {
  const modal = document.getElementById('manualEntryModal');
  if (!modal) return;
  
  resetManualEntryForm();
  modal.classList.add('active');
}

function resetManualEntryForm() {
  // 🔒 CRITICAL: Clear cached strike data to prevent stale data between modal opens
  window.currentStrikeOptions = null;
  window.currentStockPrice = null;

  // 🔥 CRITICAL FIX: Unsubscribe from WebSocket when modal closes
  if (window.currentModalContract && window.appState?.ws?.readyState === 1) {
    const [oldRoot, oldExp, oldStrike, oldRight] = window.currentModalContract.split(':');
    console.log('📡 Modal closing - unsubscribing from:', window.currentModalContract);
    window.appState.ws.send(JSON.stringify({
      type: 'untrack_contract',
      root: oldRoot,
      expiration: oldExp,
      strike: parseFloat(oldStrike),
      right: oldRight
    }));
    window.currentModalContract = null;
  }

  // Clear options chain cache to prevent stale data
  if (window.cachedOptionsChain) {
    console.log('🗑️ Clearing options chain cache');
    window.cachedOptionsChain = {};
  }

  document.getElementById('manualTicker').value = '';
  document.getElementById('manualDTE').innerHTML = '<option value="">Select expiration...</option>';
  document.getElementById('manualStrike').innerHTML = '<option value="">Select strike...</option>';
  document.getElementById('searchStatus').textContent = '';
  document.getElementById('atmStrikeValue').textContent = '--';
  document.getElementById('premiumValue').textContent = 'Loading...';

  document.getElementById('dteGroup').style.display = 'none';
  document.getElementById('strikeGroup').style.display = 'none';
  document.getElementById('optionTypeGroup').style.display = 'none';
  document.getElementById('atmStrikeGroup').style.display = 'none';
  document.getElementById('premiumGroup').style.display = 'none';

  document.querySelectorAll('.form-radio-option').forEach(opt => {
    opt.classList.remove('selected');
  });

  document.getElementById('manualCallOption').classList.add('selected');

  document.getElementById('watchOnlyBtn').disabled = true;
  document.getElementById('buyInBtn').disabled = true;
  document.getElementById('manualSearchBtn').disabled = true;
}

async function validateAmount(amount) {
  const warning = document.getElementById('amountWarning');
  const error = document.getElementById('amountError');
  const confirmBtn = document.getElementById('confirmAmountBtn');
  
  if (!warning || !error || !confirmBtn) return;
  
  warning.style.display = 'none';
  error.style.display = 'none';
  confirmBtn.disabled = false;
  
  if (!amount || amount <= 0) {
    confirmBtn.disabled = true;
    return;
  }
  
  try {
    const response = await fetch('/api/broker/account', { credentials: 'include' });
    const data = await response.json();
    
    if (data.success) {
      const balance = data.cash || 0;
      
      if (amount > balance) {
        error.style.display = 'block';
        error.textContent = `❌ Insufficient funds. Available: ${balance.toFixed(2)}`;
        confirmBtn.disabled = true;
        return;
      }
      
      const percentage = (amount / balance) * 100;
      if (percentage > 30) {
        warning.style.display = 'block';
        warning.textContent = `⚠️ This is ${percentage.toFixed(1)}% of your account (>30% warning)`;
      }
    }
  } catch (error) {
    console.error('Error validating amount:', error);
  }
}

function showAmountModal(signal) {
  const modal = document.getElementById('amountModal');
  const title = document.getElementById('amountModalTitle');
  const subtitle = document.getElementById('amountModalSubtitle');
  
  if (!modal || !title || !subtitle) return;
  
  currentBuySignal = signal;
  
  title.textContent = `Buy ${signal.root} ${signal.strike}${signal.right}`;
  subtitle.textContent = `Trader: ${signal.trader === 'elite' ? 'ELITE ($50K MIN)' : signal.trader === 'manual' ? 'MANUAL ENTRY' : 'BRANDO + SHOOF ($10K MIN)'}`;
  
  document.querySelectorAll('.amount-option').forEach(o => o.classList.remove('selected'));
  document.getElementById('customAmountInput').value = '';
  document.getElementById('amountWarning').style.display = 'none';
  document.getElementById('amountError').style.display = 'none';
  document.getElementById('confirmAmountBtn').disabled = false;
  
  modal.classList.add('active');
}

window.showAmountModal = showAmountModal;

async function executeOrder(signal, amount) {
  // 🔥 FIX: Don't execute live orders in backtest mode
  if (window.backtestMode) {
    console.log('⏭️ Skipping order execution - in backtest mode');
    showToast({
      type: 'warning',
      title: 'Backtest Mode Active',
      message: 'Cannot execute live orders in backtest mode. Switch to live mode first.'
    });
    return;
  }

  try {
    const verifyResp = await fetch('/api/auth/verify', { credentials: 'include' });
    const verifyData = await verifyResp.json();

    if (!verifyData.valid || !verifyData.csrfToken) {
      showToast({
        type: 'error',
        title: 'Session Expired',
        message: 'Please login again to continue.'
      });
      return;
    }

    const optionsResp = await fetch(`/api/options-chain?symbol=${signal.root}&expiration=${signal.expiration}`);
    const optionsData = await optionsResp.json();

    const stockResp = await fetch(`/api/stock-quote?symbol=${signal.root}`);
    const stockData = await stockResp.json();
    
    // Convert expiration to YYYY-MM-DD format if needed
    const expiration = signal.expiration;
    let formattedExpiration;
    if (expiration.includes('-')) {
      // Already in YYYY-MM-DD format
      formattedExpiration = expiration;
    } else {
      // Convert from YYYYMMDD to YYYY-MM-DD
      formattedExpiration = `${expiration.substring(0,4)}-${expiration.substring(4,6)}-${expiration.substring(6,8)}`;
    }
    console.log('📅 Expiration conversion:', expiration, '→', formattedExpiration);

    // DEBUG: Log what we're sending
    console.log('🔍 ORDER REQUEST:');
    console.log('   Premium from signal:', signal.entryPrice);
    console.log('   Cash amount:', amount);
    console.log('   Simple calc (no buffer):', Math.floor(amount / (signal.entryPrice * 100)), 'contracts');

    const response = await fetch('/api/broker/order', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': verifyData.csrfToken
      },
      body: JSON.stringify({
        symbol: signal.root,
        expiration: formattedExpiration,
        strike: signal.strike,
        optionsData: optionsData.response || [],
        currentPrice: stockData.response?.price || signal.currentPrice || 0,
        direction: signal.right === 'C' ? 'CALL' : 'PUT',
        cashAmount: amount,
        signalId: signal.id,
        isManual: signal.isManual || false,
        premiumPrice: signal.entryPrice  // SEND THE EXACT PREMIUM FROM THE SIGNAL - DON'T LET BACKEND RECALCULATE
      })
    });
    
    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Order placement failed:', response.status, data);
      showToast({
        type: 'error',
        title: 'Order Failed',
        message: data.error || data.errors?.join(', ') || 'Unknown error',
        details: `Status: ${response.status}`
      });
      return;
    }

    if (data.success) {
      // 🔥 USE THE ACTUAL FILL PRICE FROM ALPACA/BROKER RESPONSE
      // data.entryPrice is the ACTUAL premium we paid (from Alpaca's filled_avg_price)
      const premiumPerShare = data.entryPrice;
      const premiumPerContract = premiumPerShare * 100;

      showToast({
        type: 'success',
        title: 'Order Placed!',
        message: `${data.quantity} contract${data.quantity > 1 ? 's' : ''} of ${signal.root} ${signal.strike}${signal.right}`,
        details: `Premium: $${premiumPerShare.toFixed(2)}/share | $${premiumPerContract.toFixed(2)}/contract | Total: $${data.estimatedCost.toFixed(2)}`
      });

      // Update signal state with ACTUAL values from order response - NO CALCULATIONS
      signal.hasPosition = true;
      signal.watchOnly = false;
      signal.positionId = data.positionId;  // FIX: Use data.positionId (PAPER-xxx) not data.orderId
      signal.entryPrice = data.entryPrice;  // 🔥 USE ACTUAL ALPACA FILL PRICE (what we really paid)
      signal.quantity = data.quantity;  // Store ACTUAL quantity from order response
      signal.estimatedCost = data.estimatedCost;  // Store ACTUAL cost from order response
      // accountType already set in handleBuyIn, preserve it

      // Find and update the signal in window.liveSignals array
      const existingSignalIndex = window.liveSignals.findIndex(s => s.id === signal.id);
      if (existingSignalIndex !== -1) {
        // Update existing signal in array with ACTUAL values
        window.liveSignals[existingSignalIndex] = {
          ...window.liveSignals[existingSignalIndex],
          hasPosition: true,
          watchOnly: false,
          positionId: data.positionId,  // FIX: Use data.positionId (PAPER-xxx) not data.orderId
          entryPrice: data.entryPrice,  // 🔥 USE ACTUAL ALPACA FILL PRICE (what we really paid)
          quantity: data.quantity,  // Store ACTUAL quantity
          estimatedCost: data.estimatedCost,  // Store ACTUAL cost
          accountType: signal.accountType  // Preserve account label
        };
        console.log(`✅ Updated existing signal in array with hasPosition=true (${signal.accountType})`);
      } else {
        // Add new signal to array
        window.liveSignals.push(signal);
        console.log(`✅ Added new signal to array with hasPosition=true (${signal.accountType})`);
      }

      // Subscribe to WebSocket for live updates
      if (window.appState && window.appState.ws && window.appState.ws.readyState === 1) {
        const ws = window.appState.ws;
        const subscribeMessage = {
          type: 'track_contract',
          root: signal.root,
          expiration: signal.expiration,
          strike: signal.strike,
          right: signal.right
        };
        console.log('📡 Subscribing to contract for live updates:', subscribeMessage);
        ws.send(JSON.stringify(subscribeMessage));
      }

// Save to database for persistence
console.log('💾 Saving Buy-In signal to database...', signal);
try {
  const saveResponse = await fetch('/api/broker/save-manual-entry', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': verifyData.csrfToken
    },
    body: JSON.stringify(signal)
  });

  const saveResult = await saveResponse.json();
  console.log('💾 Database save response:', saveResult);

  if (saveResult.success) {
    console.log('✅ Buy-in entry saved to database - will persist on refresh');
  } else {
    console.error('❌ Failed to save buy-in to database:', saveResult.error);
    console.log('⚠️ Order placed but may not persist after refresh:', saveResult.error);
  }
} catch (saveError) {
  console.error('❌ Error saving buy-in entry:', saveError);
  console.log('⚠️ Order placed but may not persist after refresh');
}

// If manual entry, auto-add to charts
if (signal.autoCharted) {
  addToLiveCharts(signal);
}

      updateTraderSignals();
      updateChartTradeSelection();
    } else {
      showToast({
        type: 'error',
        title: 'Order Failed',
        message: data.error || 'Unknown error'
      });
    }
  } catch (error) {
    console.error('Order error:', error);
    showToast({
      type: 'error',
      title: 'Connection Error',
      message: 'Failed to place order. Check your connection.'
    });
  }
}

// Show exit modal with chart and real-time premium data
async function showExitModal(signal) {
  // Calculate P&L using BID price (what you actually get when selling)
  const exitPrice = signal.exitPrice || signal.bid || signal.currentPrice;
  const pnlPercent = ((exitPrice - signal.entryPrice) / signal.entryPrice) * 100;
  const pnlDollars = (exitPrice - signal.entryPrice) * (signal.quantity || 1) * 100;
  const isProfit = pnlPercent >= 0;

  // Create modal HTML
  const modalHTML = `
    <div id="exitModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 10000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px);">
      <div style="background: #1a1a1a; border-radius: 16px; width: 900px; max-width: 90vw; max-height: 90vh; overflow: hidden; border: 1px solid #333; box-shadow: 0 20px 60px rgba(0,0,0,0.5);">

        <!-- Header -->
        <div style="padding: 20px 24px; border-bottom: 1px solid #2a2a2a; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h2 style="margin: 0; color: #fff; font-size: 22px; font-weight: 700;">${signal.root} $${signal.strike}${signal.right}</h2>
            <p style="margin: 4px 0 0 0; color: #888; font-size: 13px;">${signal.right === 'C' ? 'Call' : 'Put'} · Exp: ${formatExpiration(signal.expiration)}</p>
          </div>
          <button id="closeExitModal" style="background: none; border: none; color: #888; font-size: 28px; cursor: pointer; padding: 0; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 6px; transition: all 0.2s;">×</button>
        </div>

        <!-- Content -->
        <div style="padding: 24px; max-height: calc(90vh - 200px); overflow-y: auto;">

          <!-- Chart -->
          <div style="background: #0f0f0f; border-radius: 12px; padding: 16px; margin-bottom: 24px; border: 1px solid #2a2a2a;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <h3 style="margin: 0; color: #fff; font-size: 15px; font-weight: 600;">Premium Movement</h3>
              <div id="livePrice" style="color: ${isProfit ? '#10b981' : '#ef4444'}; font-size: 18px; font-weight: 700;">$${exitPrice.toFixed(2)}</div>
            </div>
            <canvas id="exitChart" width="850" height="300" style="width: 100%; height: 300px;"></canvas>
            <div id="chartLoading" style="text-align: center; padding: 40px; color: #666;">Loading price history...</div>
          </div>

          <!-- Entry/Exit Comparison -->
          <div style="display: flex; gap: 16px; margin-bottom: 24px;">
            <div style="flex: 1; background: #0f0f0f; border-radius: 12px; padding: 20px; border: 1px solid #2a2a2a;">
              <div style="color: #666; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Entry Price</div>
              <div style="color: #fff; font-size: 28px; font-weight: 700;">$${signal.entryPrice.toFixed(2)}</div>
              <div style="color: #666; font-size: 12px; margin-top: 4px;">${signal.quantity || 1} contract${(signal.quantity || 1) > 1 ? 's' : ''}</div>
            </div>

            <div style="display: flex; align-items: center; justify-content: center; padding: 0 8px;">
              <div style="font-size: 32px; color: ${isProfit ? '#10b981' : '#ef4444'};">→</div>
            </div>

            <div style="flex: 1; background: #0f0f0f; border-radius: 12px; padding: 20px; border: 1px solid ${isProfit ? '#10b981' : '#ef4444'}; border-width: 2px;">
              <div style="color: #666; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Current Exit Price (BID)</div>
              <div id="liveExitPrice" style="color: ${isProfit ? '#10b981' : '#ef4444'}; font-size: 28px; font-weight: 700;">$${exitPrice.toFixed(2)}</div>
              <div style="color: #666; font-size: 12px; margin-top: 4px;">Live market sell price...</div>
            </div>
          </div>

          <!-- P&L Display -->
          <div style="background: ${isProfit ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; border: 1px solid ${isProfit ? '#10b981' : '#ef4444'}; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="color: #888; font-size: 12px; margin-bottom: 4px;">Profit & Loss</div>
                <div id="livePnLPercent" style="color: ${isProfit ? '#10b981' : '#ef4444'}; font-size: 36px; font-weight: 800;">
                  ${isProfit ? '+' : ''}${pnlPercent.toFixed(2)}%
                </div>
              </div>
              <div style="text-align: right;">
                <div style="color: #888; font-size: 12px; margin-bottom: 4px;">Dollar P&L</div>
                <div id="livePnLDollars" style="color: ${isProfit ? '#10b981' : '#ef4444'}; font-size: 24px; font-weight: 700;">
                  ${isProfit ? '+' : ''}$${Math.abs(pnlDollars).toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div style="display: flex; gap: 12px;">
            <button id="cancelExitBtn" style="flex: 1; padding: 16px; background: #2a2a2a; border: 1px solid #3a3a3a; border-radius: 10px; color: #fff; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
              Cancel
            </button>
            <button id="confirmExitBtn" style="flex: 2; padding: 16px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border: none; border-radius: 10px; color: #fff; font-size: 16px; font-weight: 700; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);">
              Exit Position Now
            </button>
          </div>

        </div>

      </div>
    </div>
  `;

  // Add modal to DOM
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // Variable to store interval so we can stop it when exiting
  let priceUpdateInterval;

  // Set up event listeners
  document.getElementById('closeExitModal').addEventListener('click', () => {
    if (priceUpdateInterval) clearInterval(priceUpdateInterval);
    document.getElementById('exitModal').remove();
  });

  document.getElementById('cancelExitBtn').addEventListener('click', () => {
    if (priceUpdateInterval) clearInterval(priceUpdateInterval);
    document.getElementById('exitModal').remove();
  });

  document.getElementById('confirmExitBtn').addEventListener('click', () => {
    confirmAndExecuteExit(signal, priceUpdateInterval);
  });

  // Close modal on outside click
  document.getElementById('exitModal').addEventListener('click', (e) => {
    if (e.target.id === 'exitModal') {
      if (priceUpdateInterval) clearInterval(priceUpdateInterval);
      document.getElementById('exitModal').remove();
    }
  });

  // Hover effects
  const closeBtn = document.getElementById('closeExitModal');
  closeBtn.addEventListener('mouseenter', () => {
    closeBtn.style.background = '#2a2a2a';
    closeBtn.style.color = '#fff';
  });
  closeBtn.addEventListener('mouseleave', () => {
    closeBtn.style.background = 'none';
    closeBtn.style.color = '#888';
  });

  const cancelBtn = document.getElementById('cancelExitBtn');
  cancelBtn.addEventListener('mouseenter', () => {
    cancelBtn.style.background = '#333';
  });
  cancelBtn.addEventListener('mouseleave', () => {
    cancelBtn.style.background = '#2a2a2a';
  });

  const exitBtn = document.getElementById('confirmExitBtn');
  exitBtn.addEventListener('mouseenter', () => {
    exitBtn.style.transform = 'translateY(-2px)';
    exitBtn.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.4)';
  });
  exitBtn.addEventListener('mouseleave', () => {
    exitBtn.style.transform = 'none';
    exitBtn.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
  });

  // Start live price updates (assigned to outer variable)
  priceUpdateInterval = setInterval(() => {
    const livePriceEl = document.getElementById('livePrice');
    const liveExitPriceEl = document.getElementById('liveExitPrice');
    const livePnLPercentEl = document.getElementById('livePnLPercent');
    const livePnLDollarsEl = document.getElementById('livePnLDollars');

    if (!livePriceEl || !document.getElementById('exitModal')) {
      clearInterval(priceUpdateInterval);
      return;
    }

    // 🔥 CRITICAL FIX: Get LIVE BID price from window.liveSignals every interval
    let currentExitPrice = signal.exitPrice || signal.bid || signal.currentPrice;

    if (window.liveSignals && Array.isArray(window.liveSignals)) {
      const liveSignal = window.liveSignals.find(s =>
        s.root === signal.root &&
        s.strike === signal.strike &&
        s.right === signal.right &&
        s.expiration === signal.expiration
      );

      if (liveSignal) {
        // Use exitPrice (BID) for accurate sell price
        currentExitPrice = liveSignal.exitPrice || liveSignal.bid || liveSignal.currentPrice;
        // Update signal object so confirmExit uses latest price
        signal.exitPrice = currentExitPrice;
        signal.bid = liveSignal.bid;
        signal.currentPrice = liveSignal.currentPrice;
      }
    }

    // Update with latest live BID price (what you actually get when selling)
    const currentPnl = ((currentExitPrice - signal.entryPrice) / signal.entryPrice) * 100;
    const currentPnlDollars = (currentExitPrice - signal.entryPrice) * (signal.quantity || 1) * 100;
    const isProfitable = currentPnl >= 0;

    livePriceEl.textContent = `$${currentExitPrice.toFixed(2)}`;
    livePriceEl.style.color = isProfitable ? '#10b981' : '#ef4444';

    liveExitPriceEl.textContent = `$${currentExitPrice.toFixed(2)}`;
    liveExitPriceEl.style.color = isProfitable ? '#10b981' : '#ef4444';

    livePnLPercentEl.textContent = `${isProfitable ? '+' : ''}${currentPnl.toFixed(2)}%`;
    livePnLPercentEl.style.color = isProfitable ? '#10b981' : '#ef4444';

    livePnLDollarsEl.textContent = `${isProfitable ? '+' : ''}$${Math.abs(currentPnlDollars).toFixed(2)}`;
    livePnLDollarsEl.style.color = isProfitable ? '#10b981' : '#ef4444';
  }, 100); // Update every 100ms for smooth real-time updates

  // Fetch and draw chart
  try {
    const response = await fetch(`/api/options-history-db?symbol=${signal.root}&strike=${signal.strike}&right=${signal.right}&expiration=${signal.expiration}`, {
      credentials: 'include'
    });

    const data = await response.json();

    const chartLoading = document.getElementById('chartLoading');
    if (chartLoading) {
      chartLoading.style.display = 'none';
    }

    if (data.success && data.history && data.history.length > 0) {
      drawExitChart(data.history, signal);
    } else {
      // Show error message
      if (chartLoading) {
        chartLoading.style.display = 'block';
        chartLoading.textContent = 'No price history available';
      }
    }
  } catch (error) {
    console.error('Error fetching chart data:', error);
    const chartLoading = document.getElementById('chartLoading');
    if (chartLoading) {
      chartLoading.style.display = 'block';
      chartLoading.textContent = 'Failed to load chart';
    }
  }
}

// Draw the exit chart
function drawExitChart(history, signal) {
  const canvas = document.getElementById('exitChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  if (history.length === 0) return;

  // Calculate chart dimensions
  const padding = { top: 20, right: 60, bottom: 40, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Get price range - USE ASK to match market order methodology
  const prices = history.map(h => h.ask || h.mid);
  const minPrice = Math.min(...prices, signal.entryPrice) * 0.98;
  const maxPrice = Math.max(...prices, signal.currentPrice) * 1.02;
  const priceRange = maxPrice - minPrice;

  // Time range
  const times = history.map(h => h.timestamp);
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const timeRange = maxTime - minTime;

  // Helper functions
  const getX = (timestamp) => padding.left + ((timestamp - minTime) / timeRange) * chartWidth;
  const getY = (price) => padding.top + chartHeight - ((price - minPrice) / priceRange) * chartHeight;

  // Draw grid
  ctx.strokeStyle = '#2a2a2a';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = padding.top + (chartHeight / 5) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    // Price labels
    const price = maxPrice - (priceRange / 5) * i;
    ctx.fillStyle = '#666';
    ctx.font = '11px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`$${price.toFixed(2)}`, padding.left - 10, y + 4);
  }

  // Draw price line - USE ASK to match market order methodology
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2;
  ctx.beginPath();
  history.forEach((point, i) => {
    const x = getX(point.timestamp);
    const y = getY(point.ask || point.mid);
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();

  // Draw entry price line
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  const entryY = getY(signal.entryPrice);
  ctx.beginPath();
  ctx.moveTo(padding.left, entryY);
  ctx.lineTo(width - padding.right, entryY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Entry price label
  ctx.fillStyle = '#888';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Entry: $${signal.entryPrice.toFixed(2)}`, width - padding.right + 10, entryY + 4);

  // Draw current price line
  const isPnlPositive = signal.currentPrice >= signal.entryPrice;
  ctx.strokeStyle = isPnlPositive ? '#10b981' : '#ef4444';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  const currentY = getY(signal.currentPrice);
  ctx.beginPath();
  ctx.moveTo(padding.left, currentY);
  ctx.lineTo(width - padding.right, currentY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Current price label
  ctx.fillStyle = isPnlPositive ? '#10b981' : '#ef4444';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Exit: $${signal.currentPrice.toFixed(2)}`, width - padding.right + 10, currentY + 4);

  // Time axis labels
  ctx.fillStyle = '#666';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  const numTimeLabels = 5;
  for (let i = 0; i <= numTimeLabels; i++) {
    const timestamp = minTime + (timeRange / numTimeLabels) * i;
    const x = getX(timestamp);
    const date = new Date(timestamp);
    const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    ctx.fillText(timeStr, x, height - padding.bottom + 20);
  }
}

// Helper function to format expiration
function formatExpiration(exp) {
  if (!exp || exp.length !== 8) return exp;
  const year = exp.substring(0, 4);
  const month = exp.substring(4, 6);
  const day = exp.substring(6, 8);
  return `${month}/${day}/${year.substring(2)}`;
}

async function exitPosition(signal) {
  console.log(`EXIT POSITION DEBUG (Frontend):`);
  console.log(`   Signal ID: ${signal.id}`);
  console.log(`   Root: ${signal.root}`);
  console.log(`   Entry Price: $${signal.entryPrice}`);
  console.log(`   Current Price (ASK): $${signal.currentPrice}`);
  console.log(`   Exit Price (BID): $${signal.exitPrice || signal.bid || 'N/A'}`);
  console.log(`   Quantity: ${signal.quantity || 1}`);

  // Check if we have bid price for accurate exit
  const exitPrice = signal.exitPrice || signal.bid || signal.currentPrice;
  if (!exitPrice) {
    showToast({
      type: 'error',
      title: 'Cannot Exit',
      message: 'Exit price unavailable. Please wait for price update or refresh the page.'
    });
    console.error(`❌ Cannot exit: exitPrice is ${exitPrice}`);
    return;
  }

  if (!signal.entryPrice) {
    showToast({
      type: 'error',
      title: 'Cannot Exit',
      message: 'Entry price missing. Please contact support.'
    });
    console.error(`❌ Cannot exit: entryPrice is ${signal.entryPrice}`);
    return;
  }

  // Check if instant exit is enabled
  const instantExitEnabled = localStorage.getItem('instantExit') === 'true';

  if (instantExitEnabled) {
    // Skip modal and exit immediately at current price
    console.log('⚡ Instant exit enabled - skipping modal and exiting immediately');
    confirmAndExecuteExit(signal);
  } else {
    // Show exit modal with chart and P&L
    showExitModal(signal);
  }
}

// Execute the actual exit trade (called from exit modal)
// 🔥 UPDATED: Now waits for actual Alpaca fill and shows cool animations
async function confirmAndExecuteExit(signal, priceUpdateInterval, attempt = 1) {
  try {
    // 🔒 LOCK THE PRICE - Stop live updates immediately
    if (priceUpdateInterval) {
      clearInterval(priceUpdateInterval);
      console.log('🔒 Price updates LOCKED - no more changes until Alpaca fills');
    }

    // Show loading state on button
    const confirmBtn = document.getElementById('confirmExitBtn');
    const liveExitPriceEl = document.getElementById('liveExitPrice');
    const livePnLPercentEl = document.getElementById('livePnLPercent');
    const livePnLDollarsEl = document.getElementById('livePnLDollars');
    const exitPriceLabel = liveExitPriceEl?.previousElementSibling;

    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '⏳ Waiting for Alpaca fill...';
      confirmBtn.style.opacity = '0.7';
    }

    // Update label to show price is locked
    if (exitPriceLabel) {
      exitPriceLabel.textContent = '🔒 LOCKING PRICE...';
      exitPriceLabel.style.color = '#fbbf24';
    }

    const verifyResp = await fetch('/api/auth/verify', { credentials: 'include' });
    const verifyData = await verifyResp.json();

    if (!verifyData.valid || !verifyData.csrfToken) {
      showToast({
        type: 'error',
        title: 'Session Expired',
        message: 'Please login again to continue.'
      });
      return;
    }

    // Get the LATEST real-time BID price (what you actually get when selling)
    const latestExitPrice = signal.exitPrice || signal.bid || signal.currentPrice;

    // Use the trade's account label (not current UI mode) to ensure proper routing
    const tradeAccountType = signal.accountType || 'default';
    console.log(`Sending exit request for ${tradeAccountType.toUpperCase()} trade: Entry=$${signal.entryPrice}, Exit=$${latestExitPrice} (BID)`);

    const response = await fetch('/api/broker/exit', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': verifyData.csrfToken
      },
      body: JSON.stringify({
        positionId: signal.positionId || signal.id,
        accountType: tradeAccountType,  // Use signal's account label
        currentPrice: latestExitPrice,  // Use LATEST price, not stale
        entryPrice: signal.entryPrice
      })
    });

    const data = await response.json();

    if (data.success) {
      // Use ACTUAL exit price from Alpaca (not estimate)
      const actualExitPrice = data.exitPrice;

      // Calculate P&L correctly from actual prices
      // P&L per share = (exitPrice - entryPrice)
      // P&L per contract = (exitPrice - entryPrice) * 100 (each contract = 100 shares)
      // Total P&L = P&L per contract * quantity
      const actualPnlPercent = ((actualExitPrice - signal.entryPrice) / signal.entryPrice) * 100;
      const actualPnlDollars = (actualExitPrice - signal.entryPrice) * 100 * (signal.quantity || 1);
      const isProfit = actualPnlPercent >= 0;

      console.log(`✅ ACTUAL EXIT from Alpaca: $${actualExitPrice.toFixed(4)} | Entry: $${signal.entryPrice.toFixed(4)} | P&L: ${actualPnlPercent.toFixed(2)}% ($${actualPnlDollars.toFixed(2)})`);

      // 🎯 COOL ANIMATION: Show the ACTUAL Alpaca fill price prominently
      if (liveExitPriceEl && livePnLPercentEl && livePnLDollarsEl) {
        // Update label to show this is the ACTUAL ALPACA FILL
        if (exitPriceLabel) {
          exitPriceLabel.textContent = '✅ FILLED @ (ALPACA)';
          exitPriceLabel.style.color = isProfit ? '#10b981' : '#ef4444';
          exitPriceLabel.style.fontWeight = '700';
        }

        // Update button to show filled
        if (confirmBtn) {
          confirmBtn.innerHTML = '✅ FILLED!';
          confirmBtn.style.background = isProfit ? '#10b981' : '#ef4444';
        }

        // Update to ACTUAL values from Alpaca (not estimated)
        liveExitPriceEl.textContent = `$${actualExitPrice.toFixed(2)}`;
        livePnLPercentEl.textContent = `${isProfit ? '+' : ''}${actualPnlPercent.toFixed(2)}%`;
        livePnLDollarsEl.textContent = `${isProfit ? '+' : ''}$${Math.abs(actualPnlDollars).toFixed(2)}`;

        // Update colors
        const color = isProfit ? '#10b981' : '#ef4444';
        liveExitPriceEl.style.color = color;
        livePnLPercentEl.style.color = color;
        livePnLDollarsEl.style.color = color;

        // 🎆 POP ANIMATION - Big scale up and intense glow
        const animateElement = (el) => {
          el.style.transition = 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
          el.style.transform = 'scale(1.2)';
          el.style.textShadow = `0 0 25px ${color}, 0 0 50px ${color}, 0 0 75px ${color}`;

          setTimeout(() => {
            el.style.transform = 'scale(1.05)';
            el.style.textShadow = `0 0 15px ${color}`;
          }, 400);
        };

        animateElement(liveExitPriceEl);
        animateElement(livePnLPercentEl);
        animateElement(livePnLDollarsEl);

        // Flash the exit price box border with intense glow
        const exitBox = liveExitPriceEl.closest('div[style*="flex: 1"]');
        if (exitBox) {
          exitBox.style.transition = 'all 0.5s';
          exitBox.style.boxShadow = `0 0 40px ${color}, 0 0 80px ${color}`;
          exitBox.style.borderWidth = '3px';
          setTimeout(() => {
            exitBox.style.boxShadow = `0 0 20px ${color}`;
          }, 500);
        }

        // 🔥 Hold the display for 1.5 SECONDS so user can clearly see the actual fill
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      // Calculate P&L from ACTUAL Alpaca exit price
      let pnlPercent = actualPnlPercent;
      if (signal.entryPrice && actualExitPrice) {
        pnlPercent = ((actualExitPrice - signal.entryPrice) / signal.entryPrice) * 100;
      }

      // Update balance display immediately if new balance was returned
      if (data.newBalance !== null && data.newBalance !== undefined) {
        const balanceEl = document.getElementById('activeAccountBalance');
        if (balanceEl) {
          balanceEl.textContent = `$${data.newBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          console.log(`💰 Updated balance display immediately: $${data.newBalance.toFixed(2)}`);
        }
      }

      // Close the exit modal if it's open
      const exitModal = document.getElementById('exitModal');
      if (exitModal) {
        exitModal.remove();
      }

      showToast({
        type: 'success',
        title: 'Position Closed!',
        message: `${signal.root} ${signal.strike}${signal.right}`,
        details: `Exit: $${actualExitPrice.toFixed(2)} | P&L: ${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%`
      });

      // Update the signal in the array (not just local variable)
      const signalIndex = window.liveSignals.findIndex(s => s.id === signal.id);
      if (signalIndex !== -1) {
        window.liveSignals[signalIndex].hasPosition = false;
        window.liveSignals[signalIndex].watchOnly = true;
        window.liveSignals[signalIndex].positionId = null;
        window.liveSignals[signalIndex].pnl = pnlPercent;
        console.log('✅ Updated signal in array: hasPosition=false, watchOnly=true');
      }

      // Also update local reference
      signal.hasPosition = false;
      signal.watchOnly = true;
      signal.positionId = null;

      // 🔥 PHASE 1 FIX: Exit endpoint now handles database update atomically
      // No need for separate save call - prevents state synchronization bugs
      console.log('✅ Exit completed via unified atomic endpoint (database already updated)');

      // Check if user wants to auto-stop after exit
      const autoStopAfterExit = localStorage.getItem('autoStopAfterExit') === 'true';

      if (autoStopAfterExit) {
        console.log('🔄 Auto-stop enabled - stopping watch and marking in database...');

        // Mark as watch_only=0 in database so it doesn't reappear on refresh
        try {
          const stopResponse = await fetch('/api/analysis/remove-signal', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': verifyData.csrfToken
            },
            body: JSON.stringify({
              signalId: signal.id
            })
          });

          const stopResult = await stopResponse.json();
          if (stopResult.success) {
            console.log('✅ Auto-stop: Signal marked watch_only=0 in database');
          } else {
            console.error('❌ Auto-stop: Failed to update database:', stopResult.error);
          }
        } catch (stopError) {
          console.error('❌ Auto-stop: Error updating database:', stopError);
        }

        // Remove from array and unsubscribe
        window.liveSignals = window.liveSignals.filter(s => s.id !== signal.id);

        if (window.appState?.ws?.readyState === 1) {
          window.appState.ws.send(JSON.stringify({
            type: 'untrack_contract',
            root: signal.root,
            expiration: signal.expiration,
            strike: signal.strike,
            right: signal.right
          }));
          console.log('📡 Auto-stopped watching after exit:', signal.root, signal.strike + signal.right);
        }
      } else {
        // Keep watching - Stop button will now be enabled
        console.log('👁️ Continuing to watch after exit (Stop button now enabled)');
      }

      updateTraderSignals();
      updateChartTradeSelection();
    } else {
      // 🔥 PHASE 8: Retry on failure (up to 3 attempts)
      if (attempt < 3) {
        console.log(`🔄 Exit failed, retrying (attempt ${attempt}/3)...`);
        await new Promise(r => setTimeout(r, 1000 * attempt)); // Exponential backoff: 1s, 2s, 3s
        return confirmAndExecuteExit(signal, attempt + 1);
      } else {
        // Failed after 3 attempts
        showToast({
          type: 'error',
          title: 'Exit Failed After 3 Attempts',
          message: data.error || 'Unknown error',
          duration: 10000
        });
      }
    }
  } catch (error) {
    // 🔥 PHASE 8: Retry on network error (up to 3 attempts)
    if (attempt < 3) {
      console.log(`🔄 Network error, retrying (attempt ${attempt}/3)...`);
      await new Promise(r => setTimeout(r, 1000 * attempt)); // Exponential backoff
      return confirmAndExecuteExit(signal, attempt + 1);
    } else {
      console.error('Exit error after 3 attempts:', error);
      showToast({
        type: 'error',
        title: 'Connection Error After 3 Attempts',
        message: 'Failed to exit position. Please check your connection and try again.',
        duration: 10000
      });
    }
  }
}

// Make exit modal functions globally accessible for use in other views (e.g., My Trades)
window.showExitModal = showExitModal;
window.confirmAndExecuteExit = confirmAndExecuteExit;

// 🚫 NEW: Cancel pending orders for a position
async function cancelPendingOrders(signal, orderType = 'both') {
  try {
    console.log(`🚫 Cancelling ${orderType} orders for signal:`, signal);

    // Get fresh CSRF token
    const verifyResp = await fetch('/api/auth/verify', { credentials: 'include' });
    const verifyData = await verifyResp.json();

    if (!verifyData.valid || !verifyData.csrfToken) {
      showToast({
        type: 'error',
        title: 'Session Expired',
        message: 'Please login again to continue.'
      });
      return;
    }

    const orderTypeLabel = orderType === 'entry' ? 'Entry' : orderType === 'exit' ? 'Exit' : 'All';

    if (!confirm(`Cancel pending ${orderTypeLabel.toLowerCase()} order(s) for ${signal.root} ${signal.strike}${signal.right}?`)) {
      return;
    }

    console.log(`📤 Sending cancel request for ${orderType} orders`);

    const response = await fetch('/api/broker/cancel-pending', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': verifyData.csrfToken
      },
      body: JSON.stringify({
        positionId: signal.positionId || signal.id,
        orderType: orderType
      })
    });

    const data = await response.json();

    if (data.success) {
      const cancelledCount = data.cancelledCount || 0;
      if (cancelledCount > 0) {
        showToast({
          type: 'success',
          title: 'Orders Cancelled',
          message: `Successfully cancelled ${cancelledCount} pending ${orderTypeLabel.toLowerCase()} order(s)`
        });
        console.log(`✅ Cancelled ${cancelledCount} order(s):`, data.results);
      } else {
        showToast({
          type: 'info',
          title: 'No Pending Orders',
          message: `No pending ${orderTypeLabel.toLowerCase()} orders found for this position`
        });
        console.log(`ℹ️ No pending orders to cancel`);
      }
    } else {
      showToast({
        type: 'error',
        title: 'Cancellation Failed',
        message: data.error || 'Failed to cancel pending orders'
      });
      console.error('❌ Cancel failed:', data.error);
    }

  } catch (error) {
    console.error('Cancel error:', error);
    showToast({
      type: 'error',
      title: 'Connection Error',
      message: 'Failed to cancel orders. Check your connection.'
    });
  }
}

async function stopWatchingSignal(signal) {
  // No confirmation - just stop watching immediately
  console.log('🛑 Stopping watch for', signal.root, signal.strike + signal.right);

  try {
    // 1. Remove from local array FIRST (optimistic update)
    window.liveSignals = window.liveSignals.filter(s => s.id !== signal.id);
    
    // 2. Send WebSocket untrack (backend handles reference counting)
    if (window.appState?.ws?.readyState === 1) {
      window.appState.ws.send(JSON.stringify({
        type: 'untrack_contract',
        root: signal.root,
        expiration: signal.expiration,
        strike: signal.strike,
        right: signal.right
      }));
      console.log('📡 Sent untrack request for', signal.root, signal.strike + signal.right);
    }
    
    // 3. Remove from database ONLY if this is a manual entry
    if (signal.isManual) {
      console.log('🔍 ATTEMPTING TO REMOVE MANUAL ENTRY FROM DATABASE');
      console.log('   Signal ID:', signal.id);

      // Get fresh CSRF token
      const verifyResp = await fetch('/api/auth/verify', { credentials: 'include' });
      const verifyData = await verifyResp.json();

      if (!verifyData.valid || !verifyData.csrfToken) {
        console.error('❌ Session expired');
        return;
      }

      console.log('   CSRF Token:', verifyData.csrfToken ? 'Obtained' : 'MISSING!');

      const response = await fetch('/api/analysis/remove-signal', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': verifyData.csrfToken
        },
        body: JSON.stringify({
          signalId: signal.id
        })
      });

      console.log('📡 Response status:', response.status, response.ok);

      const result = await response.json();
      console.log('📦 Response data:', result);

      if (!result.success) {
        console.error('❌ DATABASE REMOVAL FAILED:', result.error);
      } else {
        console.log('✅ MANUAL SIGNAL SUCCESSFULLY REMOVED FROM DATABASE:', signal.id);
      }
    } else {
      console.log('ℹ️ OCR signal - removed from watchlist only (not from database)');
    }
    
    // 4. Update UI
    updateTraderSignals();
    updateChartTradeSelection();
    
    console.log('🗑️ Removed signal from watchlist:', signal.id);
    
  } catch (error) {
    console.error('❌ Error stopping watch:', error);

    // Rollback: Re-add signal if removal failed
    if (!window.liveSignals.find(s => s.id === signal.id)) {
      window.liveSignals.push(signal);
      updateTraderSignals();
      updateChartTradeSelection();
    }
  }
}

async function unwatchOCRSignal(signal) {
  if (!confirm(`Stop watching ${signal.root} ${signal.strike}${signal.right}?${signal.hasPosition ? '\n\n⚠️ WARNING: You still have an open position! This will only remove it from your watchlist.' : ''}`)) {
    return;
  }

  try {
    console.log('👁️ Unwatching OCR signal:', signal.id);

    // Get fresh CSRF token
    const verifyResp = await fetch('/api/auth/verify', { credentials: 'include' });
    const verifyData = await verifyResp.json();

    if (!verifyData.valid || !verifyData.csrfToken) {
      showToast({
        type: 'error',
        title: 'Session Expired',
        message: 'Please login again to continue.'
      });
      return;
    }

    // 1. Remove from local array FIRST (optimistic update)
    window.liveSignals = window.liveSignals.filter(s => s.id !== signal.id);

    // 2. Send WebSocket untrack (backend handles reference counting)
    if (window.appState?.ws?.readyState === 1) {
      window.appState.ws.send(JSON.stringify({
        type: 'untrack_contract',
        root: signal.root,
        expiration: signal.expiration,
        strike: signal.strike,
        right: signal.right
      }));
      console.log('📡 Sent untrack request for', signal.root, signal.strike + signal.right);
    }

    // 3. Store this user's unwatch preference in the database
    const response = await fetch('/api/analysis/unwatch-signal', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': verifyData.csrfToken
      },
      body: JSON.stringify({
        signalId: signal.id,
        root: signal.root,
        expiration: signal.expiration,
        strike: signal.strike,
        right: signal.right
      })
    });

    const result = await response.json();

    if (!result.success) {
      console.warn('⚠️ Failed to save unwatch preference:', result.error);
      // Rollback on failure
      if (!window.liveSignals.find(s => s.id === signal.id)) {
        window.liveSignals.push(signal);
        updateTraderSignals();
        updateChartTradeSelection();
      }
      alert('❌ Failed to unwatch: ' + result.error);
    } else {
      console.log('✅ Unwatched OCR signal saved to database');
    }

    // 4. Update UI
    updateTraderSignals();
    updateChartTradeSelection();

    console.log('✅ Unwatched OCR signal from your personal view');

  } catch (error) {
    console.error('❌ Error unwatching signal:', error);
    alert('❌ Failed to unwatch');

    // Rollback: Re-add signal if removal failed
    if (!window.liveSignals.find(s => s.id === signal.id)) {
      window.liveSignals.push(signal);
      updateTraderSignals();
      updateChartTradeSelection();
    }
  }
}

function initChartTabs() {
  const tabs = document.querySelectorAll('.chart-tab');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      const tabType = this.getAttribute('data-tab');
      
      tabs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      
      if (tabType === 'live') {
        loadLiveCharts();
      } else if (tabType === 'confluence') {
        loadConfluenceMeter();
      } else {
        loadPastTrades();
      }
    });
  });
}

function connectToSignalStream() {
  // 🔥 FIX: Don't set up WebSocket in backtest mode
  if (window.backtestMode) {
    console.log('⏭️ Skipping WebSocket signal stream - in backtest mode');
    return;
  }

  if (!window.appState || !window.appState.ws) {
    console.warn('⚠️ WebSocket not available');
    setTimeout(connectToSignalStream, 1000);
    return;
  }

  // 🔒 Prevent duplicate event listener registration
  if (window.signalStreamConnected) {
    console.log('✅ Signal stream already connected');
    return;
  }

  const ws = window.appState.ws;
  window.signalStreamConnected = true;

  ws.addEventListener('message', function(event) {
    try {
      const data = JSON.parse(event.data);
      
      // Log EVERY message type
      console.log('📨 WS Message:', data.type, data);
      
      if (data.type === 'trade_signal_received') {
        console.log('🚨 NEW SIGNAL:', data.signal);
        handleNewSignal(data.signal);
      }
      
      if (data.type === 'analysis_complete') {
        console.log('✅ ANALYSIS:', data.result);
        handleAnalysisUpdate(data.result);
      }

      if (data.type === 'copy_trade_executed') {
        console.log('🤖 COPY TRADE EXECUTED:', data);
        handleCopyTradeNotification(data);
      }

      if (data.type === 'copy_trade_failed') {
        console.log('❌ COPY TRADE FAILED:', data);
        handleCopyTradeFailure(data);
      }

      if (data.type === 'options_quote') {
        console.log('🔵 [WS] Received options_quote:', {
          contractKey: data.contractKey,
          strike: data.strike,
          bid: data.bid,
          ask: data.ask,
          hasQuoteNested: !!data.quote
        });

        // Extract both BID and ASK for accurate buy/sell pricing
        let bidPrice = null;
        let askPrice = null;

        // Try nested quote object first
        if (data.quote) {
          bidPrice = data.quote.bid || 0;
          askPrice = data.quote.ask || 0;
        }

        // Try flat structure
        if ((!bidPrice || bidPrice === 0) && (!askPrice || askPrice === 0)) {
          bidPrice = data.bid || 0;
          askPrice = data.ask || 0;
        }

        console.log('🔵 [WS] Extracted prices - bid:', bidPrice, 'ask:', askPrice);

        // Store both bid and ask in the quote data
        if (bidPrice > 0 || askPrice > 0) {
          const enrichedData = {
            ...data,
            bid: bidPrice,
            ask: askPrice,
            // currentPrice = ASK (what you pay to BUY)
            // exitPrice = BID (what you get when you SELL)
            currentPrice: askPrice > 0 ? askPrice : bidPrice,
            exitPrice: bidPrice > 0 ? bidPrice : askPrice
          };

          // Update signals
          handlePriceUpdate(enrichedData);

          // Update modal premium display
          const modal = document.getElementById('manualEntryModal');

          console.log('🔵 [MODAL CHECK] Modal active?', modal && modal.classList.contains('active'), 'Current contract:', window.currentModalContract);

          if (modal && modal.classList.contains('active') && window.currentModalContract) {
            // Normalize contract keys for comparison (handle 475 vs 475.0)
            const normalizeContractKey = (key) => {
              if (!key) return '';
              const parts = key.split(':');
              if (parts.length >= 3) {
                parts[2] = parseFloat(parts[2]).toString().replace(/\.0$/, '');
              }
              return parts.join(':');
            };
            const normalizedDataKey = normalizeContractKey(data.contractKey);
            const normalizedModalKey = normalizeContractKey(window.currentModalContract);

            // Match contract keys and verify strike
            const isMatchingContract = normalizedModalKey === normalizedDataKey;

            // Double-check: Extract strike from dropdown to ensure we're showing the right premium
            const strikeDropdown = document.getElementById('manualStrike');
            const selectedStrike = strikeDropdown && strikeDropdown.value ? parseFloat(strikeDropdown.value) : null;
            const dataStrike = data.strike || (data.contractKey ? parseFloat(data.contractKey.split(':')[2]) : null);

            // Only update if contract matches AND (no dropdown selection OR dropdown matches data)
            const strikeMatches = !selectedStrike || !dataStrike || Math.abs(selectedStrike - dataStrike) < 0.01;

            console.log(`[MODAL] Contract: ${normalizedDataKey} | Expected: ${normalizedModalKey} | Strike: ${dataStrike} | Selected: ${selectedStrike} | Match: ${isMatchingContract && strikeMatches}`);

            if (isMatchingContract && strikeMatches) {
              const premiumEl = document.getElementById('premiumValue');
              const premiumDisplay = document.getElementById('premiumGroup');

              if (premiumEl) {
                const newValue = '$' + enrichedData.currentPrice.toFixed(2);

                // Throttle to 500ms (half second) - 2 updates per second max
                const now = Date.now();
                if (!window.lastModalPremiumUpdate || (now - window.lastModalPremiumUpdate) >= 500) {
                  window.lastModalPremiumUpdate = now;

                  // Simple DOM update - no animation to reduce lag
                  premiumEl.textContent = newValue;
                  premiumEl.classList.remove('loading');
                  premiumEl.classList.add('live');

                  if (premiumDisplay) {
                    premiumDisplay.classList.add('live');
                  }

                  console.log(`✅ [MODAL] Updated premium to ${newValue}`);
                }
              }
            } else {
              if (!isMatchingContract) {
                console.log(`[MODAL] Skipping - wrong contract`);
              } else {
                console.log(`[MODAL] Skipping - wrong strike (got ${dataStrike}, need ${selectedStrike})`);
              }
            }
          }
        } else {
          console.warn('⚠️ No price extracted');
        }
      }
      
      if (data.type === 'stock_quote') {
        console.log('📈 STOCK QUOTE:', data.ticker, data.price);

        // If modal is open and tracking this ticker, just store the price
        const modal = document.getElementById('manualEntryModal');
        if (modal && modal.classList.contains('active')) {
          const modalTicker = document.getElementById('manualTicker')?.value?.trim()?.toUpperCase();

          if (modalTicker && data.ticker === modalTicker && data.price && data.price > 0) {
            // Store the new stock price but DON'T recalculate/change strike
            // Let user's selection stay as is
            window.currentStockPrice = data.price;
            console.log('✅ Stored new stock price:', data.price, '(not changing user strike selection)');
          }
        }
      }

      if (data.type === 'contract_tracked') {
        console.log('✅ CONTRACT TRACKED:', data);
        if (data.success) {
          console.log(`   - Contract: ${data.contract}`);
          console.log(`   - Subscriber count: ${data.subscriberCount}`);
          console.log(`   - Stream subscribed: ${data.streamSubscribed}`);
        }
      }

      if (data.type === 'subscription_confirmed') {
        console.log('✅ SUBSCRIBED:', data);
      }

      if (data.type === 'subscription_error') {
        console.error('❌ SUB ERROR:', data);
      }
      
    } catch (error) {
      console.error('❌ WS Error:', error);
    }
  });
  
  ws.addEventListener('close', function() {
    console.error('❌ WS CLOSED');
  });
  
  ws.addEventListener('error', function(error) {
    console.error('❌ WS ERROR:', error);
  });
  
  // Heartbeat
  const heartbeat = setInterval(() => {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify({ type: 'ping' }));
      console.log('💓 Ping');
    } else {
      console.warn('⚠️ WS state:', ws.readyState);
      clearInterval(heartbeat);
    }
  }, 30000);
  
  console.log('✅ Stream connected');
}

function handleNewSignal(signal) {
  console.log('📡 New signal:', signal);
  
  const newSignal = {
    id: `${signal.root}-${signal.expiration}-${signal.strike}-${signal.right}-${Date.now()}`,
    ...signal,
    receivedAt: Date.now(),
    status: 'analyzing',
    confluence: null,
    currentPrice: signal.price || null,
    entryPrice: signal.price || null,
    pnl: 0,
    hasPosition: false,
    isNew: true
  };
  
  window.liveSignals.push(newSignal);
  
  updateTraderSignals();
  updateChartTradeSelection();
  showTradeNotification(signal);
  
  setTimeout(() => {
    const foundSignal = window.liveSignals.find(s => s.id === newSignal.id);
    if (foundSignal) {
      foundSignal.isNew = false;
      updateTraderSignals();
    }
  }, 5000);
}

function showTradeNotification(signal) {
  if (!("Notification" in window)) return;
  
  if (Notification.permission === "granted") {
    const notification = new Notification(`⚡ New Trade Signal`, {
      body: `${signal.trader.toUpperCase()}: ${signal.root} ${signal.strike} ${signal.right === 'C' ? 'C' : 'P'}`,
      icon: '/favicon.ico',
      tag: signal.root,
      requireInteraction: true
    });
    
    notification.onclick = function() {
      window.focus();
      const confluenceTab = document.querySelector('[data-tab="confluence"]');
      if (confluenceTab) confluenceTab.click();
      notification.close();
    };
  }
}

function handleCopyTradeNotification(data) {
  // Show browser notification
  if ("Notification" in window && Notification.permission === "granted") {
    const notification = new Notification(`🤖 Copy Trade Executed!`, {
      body: `Copied ${data.trader}: ${data.signal.root} ${data.signal.strike}${data.signal.right}\n${data.quantity} contracts @ $${data.price.toFixed(2)}`,
      icon: '/favicon.ico',
      tag: 'copy-trade-' + data.orderId,
      requireInteraction: true
    });

    notification.onclick = function() {
      window.focus();
      notification.close();
    };
  }

  // Show in-page notification toast
  showCopyTradeToast(`✅ Copy trade executed: ${data.quantity}x ${data.signal.root} ${data.signal.strike}${data.signal.right} @ $${data.price.toFixed(2)}`, 'success');
}

function handleCopyTradeFailure(data) {
  // Show browser notification
  if ("Notification" in window && Notification.permission === "granted") {
    const notification = new Notification(`❌ Copy Trade Failed`, {
      body: `Failed to copy ${data.signal.root} ${data.signal.strike}${data.signal.right}\nReason: ${data.error}`,
      icon: '/favicon.ico',
      tag: 'copy-trade-failed',
      requireInteraction: true
    });

    notification.onclick = function() {
      window.focus();
      notification.close();
    };
  }

  // Show in-page notification toast
  showCopyTradeToast(`❌ Copy trade failed: ${data.signal.root} ${data.signal.strike}${data.signal.right} - ${data.error}`, 'error');
}

function showCopyTradeToast(message, type = 'success') {
  // Create toast container if it doesn't exist
  let container = document.getElementById('copyTradeToastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'copyTradeToastContainer';
    container.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 10px;
    `;
    document.body.appendChild(container);
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.className = 'copy-trade-toast';
  const bgColor = type === 'success' ? '#10b981' : '#ef4444';
  toast.style.cssText = `
    background: ${bgColor};
    color: white;
    padding: 16px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    font-size: 14px;
    font-weight: 500;
    max-width: 400px;
    animation: slideIn 0.3s ease-out;
  `;
  toast.textContent = message;

  // Add animation keyframes if not already added
  if (!document.getElementById('copyTradeToastStyles')) {
    const style = document.createElement('style');
    style.id = 'copyTradeToastStyles';
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(400px);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  container.appendChild(toast);

  // Auto remove after 5 seconds
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 300);
  }, 5000);
}

function updateChartTradeSelection() {
  const checkboxContainer = document.getElementById('tradeCheckboxes');
  if (!checkboxContainer) return;
  
  if (window.liveSignals.length === 0) {
    checkboxContainer.innerHTML = '<div class="empty-state-text" style="text-align:center;padding:20px;color:#6b7280;">No active signals</div>';
    return;
  }
  
  checkboxContainer.innerHTML = window.liveSignals.map(signal => {
    const contractStr = `${signal.root}-${signal.strike}-${signal.right}`;
    return `
      <label class="trade-checkbox-item">
        <input type="checkbox" value="${contractStr}" data-owned="${signal.hasPosition}" />
        <span class="trade-checkbox-label">
          ${signal.root} ${signal.strike} ${signal.right === 'C' ? 'C' : 'P'}
          <span>${signal.trader === 'elite' ? '🔥' : signal.trader === 'manual' ? '📝' : '💜'}</span>
        </span>
      </label>
    `;
  }).join('');
  
  checkboxContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', updateCharts);
  });
}

function handleAnalysisUpdate(result) {
  const signal = window.liveSignals.find(s => 
    s.root === result.root && 
    s.expiration === result.expiration &&
    s.strike === result.strike &&
    s.right === result.right &&
    s.status === 'analyzing'
  );
  
  if (signal) {
    signal.status = 'complete';
    signal.confluence = result.score;
    signal.action = result.action;
    signal.reason = result.reason;
    signal.breakdown = result.breakdown;
    updateTraderSignals();
  }
}

function handlePriceUpdate(data) {
  console.log('💹 Processing price update for:', data.contractKey);
  
  // Extract price from ANY structure
  // PRIORITY: Use ASK (market buy price) to match market order entry methodology
  let newPrice = null;
  if (data.quote) {
    if (data.quote.ask > 0) {
      newPrice = data.quote.ask;
    } else if (data.quote.mid > 0) {
      newPrice = data.quote.mid;
    } else if (data.quote.bid > 0 && data.quote.ask > 0) {
      newPrice = (data.quote.bid + data.quote.ask) / 2;
    } else if (data.quote.bid > 0) {
      newPrice = data.quote.bid;
    }
  } else if (data.ask > 0) {
    newPrice = data.ask;
  } else if (data.mid > 0) {
    newPrice = data.mid;
  } else if (data.bid > 0 && data.ask > 0) {
    newPrice = (data.bid + data.ask) / 2;
  } else if (data.bid > 0) {
    newPrice = data.bid;
  }
  
  if (!newPrice || newPrice <= 0) {
    console.warn('⚠️ Could not extract valid price from:', data);
    return;
  }
  
  let matchedSignals = 0;
  let uiNeedsUpdate = false;

  // Normalize contract keys for comparison (handle 475 vs 475.0)
  const normalizeContractKey = (key) => {
    if (!key) return '';
    const parts = key.split(':');
    if (parts.length >= 3) {
      parts[2] = parseFloat(parts[2]).toString().replace(/\.0$/, '');
    }
    return parts.join(':');
  };

  const normalizedDataKey = normalizeContractKey(data.contractKey);

  window.liveSignals.forEach(signal => {
    const contractKey = `${signal.root}:${signal.expiration}:${parseFloat(signal.strike).toString().replace(/\.0$/, '')}:${signal.right}`;

    if (normalizedDataKey === contractKey) {
      matchedSignals++;

      const oldPrice = signal.currentPrice;
      signal.currentPrice = newPrice;
      signal.lastPriceUpdate = Date.now();

      // Store bid/ask/exitPrice if available in data
      if (data.bid) signal.bid = data.bid;
      if (data.ask) signal.ask = data.ask;
      if (data.exitPrice) signal.exitPrice = data.exitPrice;

      console.log('✅ Updated', contractKey, ':', oldPrice?.toFixed(2), '→', newPrice.toFixed(2), `(bid: ${signal.bid?.toFixed(2)}, ask: ${signal.ask?.toFixed(2)})`);

      // Calculate P&L if we have entry price - use BID for exit P&L calculation
      if (signal.entryPrice && signal.currentPrice) {
        const oldPnL = signal.pnl;
        // If we have exitPrice (bid), use it for more accurate P&L when viewing exit
        const priceForPnL = signal.exitPrice || signal.currentPrice;
        signal.pnl = ((priceForPnL - signal.entryPrice) / signal.entryPrice) * 100;

        if (oldPnL !== signal.pnl) {
          console.log('💰 P&L:', signal.pnl.toFixed(2) + '%');
        }
      }
      
      // Update chart if exists
      if (chartManager.hasChart && chartManager.hasChart(signal)) {
        chartManager.updateChartPrice(signal, signal.currentPrice);
      }
      
      uiNeedsUpdate = true;
    }
  });
  
  if (uiNeedsUpdate && matchedSignals > 0) {
    console.log('🔄 Price updated for', matchedSignals, 'signals - scheduling UI update');

    // ✅ THROTTLE UI UPDATES: Only re-render once every 500ms max
    // This prevents UI freezing when many contracts are streaming
    if (!window.traderSignalsUpdatePending) {
      window.traderSignalsUpdatePending = true;

      const timeSinceLastUpdate = Date.now() - (window.lastTraderSignalsUpdate || 0);
      const delay = Math.max(0, 500 - timeSinceLastUpdate); // Wait until 500ms have passed

      setTimeout(() => {
        console.log('🔄 Executing throttled UI update');
        updateTraderSignals();
        window.lastTraderSignalsUpdate = Date.now();
        window.traderSignalsUpdatePending = false;
      }, delay);
    }
  } else if (matchedSignals === 0) {
    console.log('ℹ️ No matching signals found for:', data.contractKey);
  }
}
function updateTraderSignals() {
  const manualSignals = window.liveSignals.filter(s => s.isManual || s.trader === 'manual');
  const eliteSignals = window.liveSignals.filter(s => !s.isManual && s.trader === 'elite');
  const comboSignals = window.liveSignals.filter(s => !s.isManual && s.trader !== 'elite');

  const manualCount = document.getElementById('manualCount');
  const eliteCount = document.getElementById('eliteCount');
  const comboCount = document.getElementById('comboCount');

  if (manualCount) manualCount.textContent = `${manualSignals.length}/${manualSignals.length}`;
  if (eliteCount) eliteCount.textContent = `${eliteSignals.length}/${eliteSignals.length}`;
  if (comboCount) comboCount.textContent = `${comboSignals.length}/${comboSignals.length}`;

  renderTradesList('manualTradesList', manualSignals, '📝');
  renderTradesList('eliteTradesList', eliteSignals, '🔥');
  renderTradesList('comboTradesList', comboSignals, '💜');
}

// Make updateTraderSignals available globally for price updates from app.js
window.updateTraderSignals = updateTraderSignals;

function renderTradesList(containerId, signals, emptyIcon) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  if (signals.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">${emptyIcon}</div>
        <div class="empty-state-text">No active trades<br>Waiting for signals...</div>
      </div>
    `;
    return;
  }
  
  container.innerHTML = signals.map(signal => {
    let confluenceBadge = '';
    if (signal.status === 'analyzing') {
      confluenceBadge = '<span class="confluence-badge analyzing">⏳ Analyzing</span>';
    } else if (signal.confluence !== null) {
      const level = signal.confluence >= 75 ? 'high' : signal.confluence >= 50 ? 'medium' : 'low';
      confluenceBadge = `<span class="confluence-badge ${level}">${signal.confluence}%</span>`;
    }
    
    // Add manual badge
    const manualBadge = signal.isManual ? '<span class="manual-badge">📝 MANUAL</span>' : '';

    // Add account type badge (DEFAULT/PAPER/LIVE)
    let accountBadge = '';
    if (signal.accountType) {
      const accountType = signal.accountType.toUpperCase();
      const accountClass = signal.accountType.toLowerCase();
      const accountEmoji = accountType === 'PAPER' ? '📄' : accountType === 'LIVE' ? '💵' : '⚪';
      accountBadge = `<span class="account-badge ${accountClass}">${accountEmoji} ${accountType}</span>`;
    }

    let pnlDisplay = '';
    if (signal.pnl && signal.pnl !== 0) {
      const pnlClass = signal.pnl > 0 ? 'profit' : 'loss';
      const pnlSign = signal.pnl > 0 ? '+' : '';
      pnlDisplay = `<div class="trade-pnl ${pnlClass}">${pnlSign}${signal.pnl.toFixed(1)}%</div>`;
    }
    
    let confluenceBar = '';
    if (signal.confluence !== null) {
      const level = signal.confluence >= 75 ? 'high' : signal.confluence >= 50 ? 'medium' : 'low';
      confluenceBar = `
        <div class="mini-confluence-bar">
          <div class="mini-confluence-fill ${level}" style="width: ${signal.confluence}%"></div>
        </div>
      `;
    }
    
    const newPulse = signal.isNew ? '<div class="new-signal-pulse"></div>' : '';
    
    // Auto-charted indicator
    const autoChartedIndicator = signal.autoCharted ? '<div class="auto-charted-indicator">✅ Auto-charted</div>' : '';
    
    return `
  <div class="trade-item ${signal.status}" data-signal-id="${signal.id}">
    ${newPulse}
    <div class="trade-symbol">
      <span>${signal.root} ${signal.strike} ${signal.right === 'C' ? 'CALL' : 'PUT'}</span>
      ${manualBadge}
      ${accountBadge}
      ${confluenceBadge}
    </div>
    <div class="trade-details">
  ${signal.currentPrice ? `Now: $${signal.currentPrice.toFixed(2)}` : '⏳ Loading...'}
  ${signal.lastPriceUpdate ? `<span style="color: #6b7280; font-size: 9px; margin-left: 4px;">(${Math.floor((Date.now() - signal.lastPriceUpdate) / 1000)}s ago)</span>` : ''}
</div>
    ${pnlDisplay}
    ${confluenceBar}
    ${autoChartedIndicator}
    <div class="trade-action-buttons with-extra">
      <button class="trade-buy-btn" data-signal-id="${signal.id}" ${signal.hasPosition ? 'disabled' : ''}>
        💰 ${signal.hasPosition ? 'Entered' : 'Buy In'}
      </button>
      <button class="trade-exit-btn" data-signal-id="${signal.id}" ${!signal.hasPosition ? 'disabled' : ''}>
        🚪 Exit
      </button>
      <button class="trade-cancel-entry-btn ${signal.hasPendingEntry ? 'has-pending-order' : ''}" data-signal-id="${signal.id}" ${!signal.hasPendingEntry ? 'disabled' : ''} title="Cancel pending entry order">
        ⛔ Cancel Entry
      </button>
      <button class="trade-cancel-exit-btn ${signal.hasPendingExit ? 'has-pending-order' : ''}" data-signal-id="${signal.id}" ${!signal.hasPendingExit ? 'disabled' : ''} title="Cancel pending exit order">
        ⛔ Cancel Exit
      </button>
      ${signal.isManual
        ? `<button class="trade-stop-btn" data-signal-id="${signal.id}" ${signal.hasPosition ? 'disabled' : ''}>⛔ Stop</button>`
        : `<button class="trade-unwatch-btn" data-signal-id="${signal.id}" ${signal.hasPosition ? 'disabled' : ''}>👁️ Unwatch</button>`
      }
    </div>
  </div>
`;
  }).join('');
  
  container.querySelectorAll('.trade-buy-btn').forEach(btn => {
  btn.addEventListener('click', function(e) {
    console.log('💰 [BUY BUTTON] Clicked!', e.target);
    e.stopPropagation();
    const signalId = this.getAttribute('data-signal-id');
    console.log('💰 [BUY BUTTON] Signal ID:', signalId);
    const signal = window.liveSignals.find(s => s.id === signalId);
    console.log('💰 [BUY BUTTON] Found signal:', signal);
    if (signal) {
      showAmountModal(signal);
    } else {
      console.error('💰 [BUY BUTTON] Signal not found in liveSignals array');
    }
  });
});

container.querySelectorAll('.trade-exit-btn').forEach(btn => {
  btn.addEventListener('click', function(e) {
    console.log('🚪 [EXIT BUTTON] Clicked!', e.target);
    e.stopPropagation();
    const signalId = this.getAttribute('data-signal-id');
    console.log('🚪 [EXIT BUTTON] Signal ID:', signalId);
    const signal = window.liveSignals.find(s => s.id === signalId);
    console.log('🚪 [EXIT BUTTON] Found signal:', signal);
    if (signal) {
      exitPosition(signal);
    } else {
      console.error('🚪 [EXIT BUTTON] Signal not found in liveSignals array');
    }
  });
});

container.querySelectorAll('.trade-stop-btn').forEach(btn => {
  btn.addEventListener('click', function(e) {
    console.log('🛑 [STOP BUTTON] Clicked!', e.target);
    e.stopPropagation();
    e.preventDefault();
    const signalId = this.getAttribute('data-signal-id');
    console.log('🛑 [STOP BUTTON] Signal ID:', signalId);
    const signal = window.liveSignals.find(s => s.id === signalId);
    console.log('🛑 [STOP BUTTON] Found signal:', signal);
    if (signal) {
      stopWatchingSignal(signal);
    } else {
      console.error('🛑 [STOP BUTTON] Signal not found in liveSignals array');
    }
  });
});

// NEW: Unwatch button for OCR signals
container.querySelectorAll('.trade-unwatch-btn').forEach(btn => {
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    const signalId = this.getAttribute('data-signal-id');
    const signal = window.liveSignals.find(s => s.id === signalId);
    if (signal) unwatchOCRSignal(signal);
  });
});

// 🚫 NEW: Cancel Entry button
container.querySelectorAll('.trade-cancel-entry-btn').forEach(btn => {
  btn.addEventListener('click', function(e) {
    console.log('🚫 [CANCEL ENTRY] Clicked!', e.target);
    e.stopPropagation();
    const signalId = this.getAttribute('data-signal-id');
    console.log('🚫 [CANCEL ENTRY] Signal ID:', signalId);
    const signal = window.liveSignals.find(s => s.id === signalId);
    console.log('🚫 [CANCEL ENTRY] Found signal:', signal);
    if (signal) {
      cancelPendingOrders(signal, 'entry');
    } else {
      console.error('🚫 [CANCEL ENTRY] Signal not found in liveSignals array');
    }
  });
});

// 🚫 NEW: Cancel Exit button
container.querySelectorAll('.trade-cancel-exit-btn').forEach(btn => {
  btn.addEventListener('click', function(e) {
    console.log('🚫 [CANCEL EXIT] Clicked!', e.target);
    e.stopPropagation();
    const signalId = this.getAttribute('data-signal-id');
    console.log('🚫 [CANCEL EXIT] Signal ID:', signalId);
    const signal = window.liveSignals.find(s => s.id === signalId);
    console.log('🚫 [CANCEL EXIT] Found signal:', signal);
    if (signal) {
      cancelPendingOrders(signal, 'exit');
    } else {
      console.error('🚫 [CANCEL EXIT] Signal not found in liveSignals array');
    }
  });
});

container.querySelectorAll('.trade-item').forEach(item => {
  item.addEventListener('click', function(e) {
    if (e.target.classList.contains('trade-buy-btn') ||
        e.target.classList.contains('trade-exit-btn') ||
        e.target.classList.contains('trade-cancel-entry-btn') ||
        e.target.classList.contains('trade-cancel-exit-btn') ||
        e.target.classList.contains('trade-stop-btn') ||
        e.target.classList.contains('trade-unwatch-btn')) return;
    
    const signalId = this.getAttribute('data-signal-id');
    const signal = window.liveSignals.find(s => s.id === signalId);
    if (signal) showTradeDetails(signal);
  });
});
}

function showTradeDetails(signal) {
  const confluenceTab = document.querySelector('[data-tab="confluence"]');
  if (confluenceTab) {
    confluenceTab.click();
  }
  
  console.log('📊 Showing details for:', signal);
}

function loadLiveCharts() {
  const container = document.getElementById('chartsContainer');
  const tradeSelection = document.getElementById('tradeSelection');
  
  if (tradeSelection) {
    tradeSelection.classList.remove('hidden');
  }
  
  updateCharts();
}

function updateCharts() {
  const checkboxes = document.querySelectorAll('#tradeCheckboxes input[type="checkbox"]');
  const selected = Array.from(checkboxes).filter(cb => cb.checked);
  const chartsContainer = document.getElementById('chartsContainer');
  
  if (selected.length === 0) {
    chartsContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📈</div>
        <div class="empty-state-text">No Charts Selected</div>
        <div class="empty-state-hint">Select trades above or click "Watch All" to view charts</div>
      </div>
    `;
    chartsContainer.className = 'charts-container grid-1';
    return;
  }
  
  chartsContainer.className = `charts-container grid-${Math.min(selected.length, 9)}`;
  
  chartsContainer.innerHTML = selected.map(cb => {
    const parts = cb.value.split('-');
    const symbol = `${parts[0]} ${parts[1]} ${parts[2]}`;
    const canvasId = `chart-${cb.value}`;
    
    return `
      <div class="chart-box">
        <div class="chart-box-header">
          <div class="chart-box-symbol">${symbol}</div>
          <div class="chart-box-pnl" id="pnl-${parts[0]}-${parts[1]}-${parts[2]}">+0.0%</div>
        </div>
        <div class="chart-canvas" id="${canvasId}"></div>
      </div>
    `;
  }).join('');

  selected.forEach(cb => {
    const parts = cb.value.split('-');
    const signal = window.liveSignals.find(s => 
      s.root === parts[0] && 
      s.strike === parseFloat(parts[1]) && 
      s.right === parts[2]
    );
    
    if (signal) {
      const canvasId = `chart-${cb.value}`;
      setTimeout(() => {
        chartManager.createChart(canvasId, signal);
      }, 100);
    }
  });
}

function loadConfluenceMeter() {
  const container = document.getElementById('chartsContainer');
  const tradeSelection = document.getElementById('tradeSelection');
  
  if (tradeSelection) {
    tradeSelection.classList.add('hidden');
  }
  
  if (window.liveSignals.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚡</div>
        <div class="empty-state-text">No Active Signals</div>
        <div class="empty-state-hint">Signals will appear here when detected by OCR</div>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <div class="winrate-stats">
      <div class="winrate-card elite">
        <div class="winrate-label">🔥 Elite Entries Only</div>
        <div class="winrate-value" id="eliteWinrate">--</div>
        <div class="winrate-subtitle"><span id="eliteWins">0</span>W / <span id="eliteLosses">0</span>L (<span id="eliteTotal">0</span> trades)</div>
      </div>
      <div class="winrate-card combo">
        <div class="winrate-label">💜 Brando + Shoof Entries & Exits</div>
        <div class="winrate-value" id="comboWinrate">--</div>
        <div class="winrate-subtitle"><span id="comboWins">0</span>W / <span id="comboLosses">0</span>L (<span id="comboTotal">0</span> trades)</div>
      </div>
    </div>
    
    <div id="liveSignalsList"></div>
  `;
  
  loadWinrateStats();
  
  const signalsList = document.getElementById('liveSignalsList');
  signalsList.innerHTML = window.liveSignals.map(signal => {
    const traderClass = signal.trader === 'elite' ? 'elite' : 'combo';
    const traderName = signal.trader === 'elite' ? '🔥 ELITE ($50K MIN)' : signal.trader === 'manual' ? '📝 MANUAL ENTRY' : '💜 BRANDO + SHOOF ($10K MIN)';
    
    let statusHTML = '';
    if (signal.status === 'analyzing') {
      statusHTML = `
        <div class="analysis-status analyzing">
          <div class="status-spinner"></div>
          <span>Analyzing confluence... (${Math.floor((Date.now() - signal.receivedAt) / 1000)}s)</span>
        </div>
      `;
    } else if (signal.status === 'complete') {
      const confluenceLevel = signal.confluence >= 75 ? 'high' : signal.confluence >= 50 ? 'medium' : 'low';
      statusHTML = `
        <div class="analysis-status complete">
          <span class="status-icon">✅</span>
          <span>Analysis Complete</span>
        </div>
        
        <div class="confluence-meter">
          <div class="confluence-meter-label">
            <span>Price Action Confluence</span>
            <span class="confluence-percentage ${confluenceLevel}">${signal.confluence}%</span>
          </div>
          <div class="confluence-bar">
            <div class="confluence-bar-fill ${confluenceLevel}" style="width: ${signal.confluence}%"></div>
          </div>
        </div>
        
        <div class="trade-reasoning">
          <div class="reasoning-title">📊 Analysis</div>
          <div class="reasoning-text">${signal.reason || 'No analysis available'}</div>
          ${signal.breakdown ? `
            <div class="reasoning-factors">
              <div class="factor-item">
                <span class="factor-icon ${signal.breakdown.momentum > 15 ? 'positive' : 'negative'}">
                  ${signal.breakdown.momentum > 15 ? '📈' : '📉'}
                </span>
                <span>Momentum: ${signal.breakdown.momentum}/25</span>
              </div>
              <div class="factor-item">
                <span class="factor-icon ${signal.breakdown.strike > 15 ? 'positive' : 'neutral'}">
                  ${signal.breakdown.strike > 15 ? '🎯' : '⚪'}
                </span>
                <span>Strike: ${signal.breakdown.strike}/20</span>
              </div>
              <div class="factor-item">
                <span class="factor-icon ${signal.breakdown.volume > 10 ? 'positive' : 'neutral'}">
                  ${signal.breakdown.volume > 10 ? '📊' : '⚪'}
                </span>
                <span>Volume: ${signal.breakdown.volume}/15</span>
              </div>
              <div class="factor-item">
                <span class="factor-icon ${signal.breakdown.timing > 7 ? 'positive' : 'neutral'}">
                  ${signal.breakdown.timing > 7 ? '⏰' : '⚪'}
                </span>
                <span>Timing: ${signal.breakdown.timing}/10</span>
              </div>
            </div>
          ` : ''}
        </div>
        
        <div class="signal-action-buttons">
          <button class="signal-buy-btn" data-signal-id="${signal.id}" ${signal.hasPosition ? 'disabled' : ''}>
            💰 ${signal.hasPosition ? 'Entered' : 'Buy'}
          </button>
          <button class="signal-exit-btn" data-signal-id="${signal.id}" ${!signal.hasPosition ? 'disabled' : ''}>
            🚪 Exit
          </button>
        </div>
      `;
    }
    
    return `
      <div class="live-signal-item ${signal.status}">
        <div class="signal-header">
          <div class="signal-symbol">
            <span class="trader-badge ${traderClass}">${traderName}</span>
            <span>${signal.root} ${signal.strike} ${signal.right === 'C' ? 'CALL' : 'PUT'}</span>
          </div>
          <div class="signal-timestamp">${new Date(signal.receivedAt).toLocaleTimeString()}</div>
        </div>
        ${statusHTML}
      </div>
    `;
  }).join('');
  
  setTimeout(() => {
    document.querySelectorAll('.signal-buy-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const signalId = this.getAttribute('data-signal-id');
        const signal = window.liveSignals.find(s => s.id === signalId);
        if (signal) showAmountModal(signal);
      });
    });
    
    document.querySelectorAll('.signal-exit-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const signalId = this.getAttribute('data-signal-id');
        const signal = window.liveSignals.find(s => s.id === signalId);
        if (signal) exitPosition(signal);
      });
    });
  }, 100);
}

async function loadWinrateStats() {
  try {
    const response = await fetch('/api/analysis/winrates', { credentials: 'include' });
    const data = await response.json();
    
    if (data.success) {
      const eliteWinrate = document.getElementById('eliteWinrate');
      const comboWinrate = document.getElementById('comboWinrate');
      
      if (eliteWinrate) eliteWinrate.textContent = data.elite.winrate + '%';
      if (document.getElementById('eliteWins')) document.getElementById('eliteWins').textContent = data.elite.wins;
      if (document.getElementById('eliteLosses')) document.getElementById('eliteLosses').textContent = data.elite.losses;
      if (document.getElementById('eliteTotal')) document.getElementById('eliteTotal').textContent = data.elite.total;
      
      if (comboWinrate) comboWinrate.textContent = data.combo.winrate + '%';
      if (document.getElementById('comboWins')) document.getElementById('comboWins').textContent = data.combo.wins;
      if (document.getElementById('comboLosses')) document.getElementById('comboLosses').textContent = data.combo.losses;
      if (document.getElementById('comboTotal')) document.getElementById('comboTotal').textContent = data.combo.total;
    }
  } catch (error) {
    console.error('Error loading winrates:', error);
  }
}

function loadPastTrades() {
  const container = document.getElementById('chartsContainer');
  const tradeSelection = document.getElementById('tradeSelection');
  
  if (tradeSelection) {
    tradeSelection.classList.add('hidden');
  }
  
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">📜</div>
      <div class="empty-state-text">Past Trades</div>
      <div class="empty-state-hint">Trade history coming soon...</div>
    </div>
  `;
}

async function loadTraderSignals() {
  console.log('🔄 loadTraderSignals() called - fetching from database...');

  // 🔥 FIX: Don't call live endpoints in backtest mode
  if (window.backtestMode) {
    console.log('⏭️ Skipping trader signals load - in backtest mode');
    return;
  }

  try {
    const response = await fetch('/api/analysis/active-signals', {
      credentials: 'include'
    });

    console.log('📡 API Response status:', response.status, response.ok);

    if (response.ok) {
      const data = await response.json();
      console.log('📦 API Response data:', data);

      if (data.success && data.signals) {
        console.log(`📊 Raw signals from API: ${data.signals.length}`);

        // Enrich signals with missing UI fields
        window.liveSignals = data.signals
          .filter(signal => !signal.unwatched)
          .map(signal => {
            // Calculate DTE from expiration
            let dte = 0;
            if (signal.expiration) {
              const today = new Date();
              const expDate = new Date(
                signal.expiration.substring(0, 4),
                parseInt(signal.expiration.substring(4, 6)) - 1,
                signal.expiration.substring(6, 8)
              );
              dte = Math.floor((expDate - today) / (1000 * 60 * 60 * 24));
            }

            // Return enriched signal with all required fields
            // ✅ FIXED: Preserve hasPosition from database
            // A position exists if ANY of these are true:
            // 1. hasPosition is explicitly true/1 in the database
            // 2. A positionId exists (meaning an order was placed)
            // 3. watchOnly is explicitly false (inverse indicator)
            const hasPositionFromDB = Boolean(
              signal.hasPosition === true ||
              signal.hasPosition === 1 ||
              (signal.positionId && signal.positionId !== null && signal.positionId !== '') ||
              signal.watchOnly === false ||
              signal.watchOnly === 0
            );

            console.log(`🔍 [POSITION CHECK] ${signal.root} ${signal.strike}${signal.right}:`, {
              hasPosition: signal.hasPosition,
              positionId: signal.positionId,
              watchOnly: signal.watchOnly,
              accountType: signal.accountType,
              computed: hasPositionFromDB
            });

            // 🔥 CRITICAL: Ensure currentPrice is always set (use entryPrice as fallback)
            // This prevents "current price unavailable" errors on page reload
            const initialCurrentPrice = signal.currentPrice || signal.entryPrice || 0;

            return {
              ...signal,
              dte: dte,
              currentPrice: initialCurrentPrice,
              pnl: 0,
              hasPosition: hasPositionFromDB,
              isNew: false, // Don't show "new" pulse on page load
              autoCharted: signal.isManual || false,
              watchOnly: signal.watchOnly !== undefined ? signal.watchOnly : true,
              // Ensure status is 'complete' for manual entries without confluence
              status: signal.status || (signal.isManual ? 'complete' : 'analyzing')
            };
          });

        console.log(`✅ Loaded ${window.liveSignals.length} signals from database`);
        console.log('🔍 Signals array:', window.liveSignals);

        // Subscribe all signals to WebSocket for live price updates
        if (window.appState && window.appState.ws && window.appState.ws.readyState === 1) {
          const ws = window.appState.ws;
          console.log(`📡 Subscribing ${window.liveSignals.length} signals to WebSocket for live updates...`);

          window.liveSignals.forEach(signal => {
            const subscribeMessage = {
              type: 'track_contract',
              root: signal.root,
              expiration: signal.expiration,
              strike: signal.strike,
              right: signal.right
            };
            ws.send(JSON.stringify(subscribeMessage));
          });

          console.log('✅ All signals subscribed to WebSocket');
        } else {
          console.warn('⚠️ WebSocket not ready, signals will not receive live updates until reconnection');
        }

        console.log('🎨 Calling updateTraderSignals() to render UI...');
        updateTraderSignals();
        updateChartTradeSelection();
        console.log('✅ UI update complete');
      } else {
        console.warn('⚠️ API response missing success or signals:', data);
      }
    } else {
      console.error('❌ API request failed with status:', response.status);
    }
  } catch (error) {
    console.error('❌ Error loading signals:', error);
  }
}

window.addEventListener('beforeunload', () => {
  chartManager.removeAllCharts();
});

window.chartManager = chartManager;
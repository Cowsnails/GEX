// public/app.js - FIXED: Smart Live Updates Without Flicker
import { renderTradeSignals, updateSignalsLive } from './views/signals.js';
import { renderGEXDashboard, updateGEXLive } from './views/gex.js';
import { renderOptionsChain, updateOptionsLive } from './views/options.js';
import { renderStockView, updateStockLive } from './views/stock.js';
import { renderKeyLevels, updateLevelsLive } from './views/levels.js';
import { updateTimingWidgetOnly, initializeTimingWidget } from './views/timing-widget.js';
import { resetChartCache } from './charts/gex-chart.js';
import { render as renderMyTrades, updateLive as updateMyTradesLive, initMyTradesView } from './views/my-trades.js';
import { render as renderGlobalTrades, updateLive as updateGlobalTradesLive, initGlobalTradesView } from './views/global-trades.js';

// State
window.appState = {
  ws: null,
  currentView: 'signals',
  optionsData: [],
  stockData: null,
  expirations: [],
  filterATM: false,
  filterVolume: false,
  priceHistory: [],
  initialRenderDone: false // 🆕 Track if initial render is complete
};

// Initialize WebSocket connection with auto-reconnect
let reconnectAttempts = 0;
const maxReconnectDelay = 30000; // 30 seconds max

export function initWebSocket() {
  // 🔥 FIX: Don't initialize WebSocket in backtest mode
  if (window.backtestMode) {
    console.log('⏭️ Skipping WebSocket initialization - in backtest mode');
    return;
  }

  const ws = new WebSocket('ws://localhost:3000/ws');
  window.appState.ws = ws;

  ws.onopen = () => {
    document.getElementById('statusText').textContent = 'Connected';
    document.getElementById('status').style.color = '#10b981';
    reconnectAttempts = 0; // Reset on successful connection

    updateSymbol();

    // ✅ RE-SUBSCRIBE to all active contracts after reconnection
    if (window.liveSignals && window.liveSignals.length > 0) {
      console.log(`🔄 Re-subscribing ${window.liveSignals.length} contracts after reconnection...`);
      window.liveSignals.forEach(signal => {
        ws.send(JSON.stringify({
          type: 'track_contract',
          root: signal.root,
          expiration: signal.expiration,
          strike: signal.strike,
          right: signal.right
        }));
      });
      console.log('✅ All contracts re-subscribed');
    }
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    if (data.error) {
      document.getElementById('statusText').textContent = 'Error';
      document.getElementById('status').style.color = '#ef4444';
      return;
    }

    switch(data.type) {
      case 'options':
        window.appState.optionsData = data.response || [];
        if (data.latency) {
          document.getElementById('latency').textContent = `${data.latency}ms`;
        }

        // 🔥 FIXED: Use smart update instead of full re-render
        if (!window.appState.initialRenderDone) {
          render(); // First time: full render
        } else {
          liveUpdate(); // After that: just update values
        }
        break;

      case 'options_quote':
        // Live quote update for individual contract
        console.log('📊 Live options quote:', data.contractKey, 'mid:', data.mid);

        // Update manual entry modal if it matches the current contract
        if (window.currentModalContract === data.contractKey) {
          const premiumEl = document.getElementById('premiumValue');
          if (premiumEl && data.mid && data.mid > 0) {
            premiumEl.textContent = '$' + data.mid.toFixed(2);
            premiumEl.classList.remove('loading');
            console.log('✅ Updated modal premium:', data.mid);
          }
        }

        // Update signal in sidebar if it exists
        if (window.liveSignals && Array.isArray(window.liveSignals)) {
          const [root, expiration, strike, right] = data.contractKey.split(':');
          const strikeNum = parseFloat(strike);

          console.log(`🔍 Looking for signal: ${root} ${strike}${right} ${expiration} in ${window.liveSignals.length} signals`);

          const signal = window.liveSignals.find(s => {
            const matches = s.root === root &&
              s.expiration === expiration &&
              Math.abs(parseFloat(s.strike) - strikeNum) < 0.01 &&
              s.right === right;

            if (matches) {
              console.log(`✅ Found matching signal:`, s);
            }
            return matches;
          });

          if (signal && data.mid) {
            const oldPrice = signal.currentPrice;
            signal.currentPrice = data.mid;
            signal.lastPriceUpdate = Date.now();

            // Update P&L if there's an entry price
            if (signal.entryPrice) {
              signal.pnl = ((data.mid - signal.entryPrice) / signal.entryPrice) * 100;
            }

            console.log(`💰 Updated signal premium: ${oldPrice} → ${data.mid} (P&L: ${signal.pnl?.toFixed(1)}%)`);

            // Trigger UI update for signals
            if (typeof updateTraderSignals === 'function') {
              updateTraderSignals();
              console.log('🔄 Called updateTraderSignals()');
            } else {
              console.warn('⚠️ updateTraderSignals function not found');
            }
          } else if (!signal) {
            console.log(`⚠️ No matching signal found for ${data.contractKey}`);
          }
        }
        break;

      case 'stock_quote':
        // Live stock quote update
        console.log('📈 Live stock quote:', data.ticker, 'price:', data.price);

        // Update stock price display if it matches current symbol
        const currentSymbol = document.getElementById('symbolInput').value;
        if (data.ticker === currentSymbol && data.price) {
          document.getElementById('priceDisplay').textContent = `$${data.price.toFixed(2)}`;

          // Update price history
          if (window.appState) {
            window.appState.priceHistory.push(data.price);
            if (window.appState.priceHistory.length > 60) {
              window.appState.priceHistory.shift();
            }
          }
        }
        break;

      case 'stock':
        window.appState.stockData = data.response;
        if (window.appState.stockData?.price) {
          window.appState.priceHistory.push(window.appState.stockData.price);
          if (window.appState.priceHistory.length > 60) {
            window.appState.priceHistory.shift();
          }
        }
        document.getElementById('symbolDisplay').textContent =
          document.getElementById('symbolInput').value;
        document.getElementById('priceDisplay').textContent =
          window.appState.stockData?.price
            ? `$${window.appState.stockData.price.toFixed(2)}`
            : '$--';

        // 🔥 FIXED: Use smart update instead of full re-render
        if (!window.appState.initialRenderDone) {
          render(); // First time: full render
        } else {
          liveUpdate(); // After that: just update values
        }
        break;

      case 'expirations':
        window.appState.expirations = data.response || [];
        const select = document.getElementById('expSelect');
        select.innerHTML = window.appState.expirations.map(exp =>
          `<option value="${exp}">${formatDate(exp)}</option>`
        ).join('');
        break;
    }
  };

  ws.onerror = (error) => {
    console.error('❌ WebSocket error:', error);
    document.getElementById('statusText').textContent = 'Error';
    document.getElementById('status').style.color = '#ef4444';
  };

  ws.onclose = () => {
    // 🔥 FIX: Don't reconnect WebSocket in backtest mode
    if (window.backtestMode) {
      console.log('⏭️ WebSocket closed - not reconnecting (in backtest mode)');
      document.getElementById('statusText').textContent = 'Backtest Mode';
      document.getElementById('status').style.color = '#8b5cf6';
      return;
    }

    console.warn('🔴 WebSocket closed - attempting reconnection...');
    document.getElementById('statusText').textContent = 'Reconnecting...';
    document.getElementById('status').style.color = '#f59e0b';

    // ✅ AUTO-RECONNECT with exponential backoff
    reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), maxReconnectDelay);
    console.log(`🔄 Reconnect attempt ${reconnectAttempts} in ${delay}ms`);

    setTimeout(() => {
      console.log('🔌 Attempting to reconnect...');
      initWebSocket();
    }, delay);
  };
}

// 🆕 NEW: Smart live update function - only updates values, no re-render
function liveUpdate() {
  switch(window.appState.currentView) {
    case 'signals':
      updateSignalsLive();
      updateTimingWidgetOnly(); // Signals view has timing widget
      break;
    case 'gex':
      updateGEXLive();
      break;
    case 'my-trades':
      updateMyTradesLive();
      break;
    case 'global-trades':
      updateGlobalTradesLive();
      break;
    case 'options':
      updateOptionsLive();
      break;
    case 'stock':
      updateStockLive();
      break;
    case 'levels':
      updateLevelsLive();
      break;
  }
}

// Utility functions
export function formatDate(dateStr) {
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  return `${month}/${day}/${year}`;
}

// View management
window.setView = function(view) {
  window.appState.currentView = view;
  window.appState.initialRenderDone = false; // 🔥 Reset flag for new view
  
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');
  
  // Reset GEX chart cache when switching views
  if (view === 'gex') {
    resetChartCache();
  }
  
  render(); // Full render when switching views
}

// Filter management
window.toggleFilter = function(type) {
  if (type === 'atm') {
    window.appState.filterATM = !window.appState.filterATM;
    document.getElementById('atmFilter').classList.toggle('active');
  } else if (type === 'volume') {
    window.appState.filterVolume = !window.appState.filterVolume;
    document.getElementById('volumeFilter').classList.toggle('active');
  }
  
  // Filters require full re-render (structure changes)
  window.appState.initialRenderDone = false;
  render();
}

// Symbol subscription
window.updateSymbol = function() {
  const symbol = document.getElementById('symbolInput').value.toUpperCase();
  const exp = document.getElementById('expSelect').value;
  
  // Reset state when changing symbol/expiration
  window.appState.initialRenderDone = false;
  window.appState.priceHistory = [];
  
  window.appState.ws.send(JSON.stringify({ 
    type: 'subscribe', 
    symbol, 
    expiration: exp || '20251219'
  }));
}

// Main render function - only called on view change or first load
function render() {
  const content = document.getElementById('content');
  
  switch(window.appState.currentView) {
    case 'signals':
      content.innerHTML = renderTradeSignals();
      // Initialize timing widget after DOM is ready
      setTimeout(() => {
        if (typeof window.initializeTimingWidget === 'function') {
          window.initializeTimingWidget();
        }
      }, 0);
      break;
    case 'gex':
      content.innerHTML = renderGEXDashboard();
      // Draw initial GEX chart
      setTimeout(() => {
        if (window.calculateGEX && window.drawGEXChart && window.appState.stockData) {
          const gex = window.calculateGEX();
          if (gex) {
            window.drawGEXChart('gexProfileChart', gex, window.appState.stockData.price);
          }
        }
      }, 0);
      break;
    case 'my-trades':
      content.innerHTML = renderMyTrades();
      setTimeout(() => {
        initMyTradesView();
      }, 0);
      break;
    case 'global-trades':
      content.innerHTML = renderGlobalTrades();
      setTimeout(() => {
        initGlobalTradesView();
      }, 0);
      break;
    case 'options':
      content.innerHTML = renderOptionsChain();
      break;
    case 'stock':
      content.innerHTML = renderStockView();
      break;
    case 'levels':
      content.innerHTML = renderKeyLevels();
      break;
  }
  
  // Mark that initial render is complete
  window.appState.initialRenderDone = true;
}

// Initialize app on load
document.addEventListener('DOMContentLoaded', () => {
  initWebSocket();
});
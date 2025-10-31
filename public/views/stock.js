// public/views/stock.js - Stock Data View Renderer with Live Updates

export function renderStockView() {
  const { stockData } = window.appState;
  
  if (!stockData) return '<div>Loading stock data...</div>';
  
  return `
    <div class="metric-grid">
      <div class="metric-card">
        <div class="metric-title">Last Price</div>
        <div id="stock-last-price" class="metric-value">$${stockData.price.toFixed(2)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-title">Bid / Ask</div>
        <div id="stock-bid-ask" class="metric-value" style="font-size: 18px;">
          $${stockData.bid.toFixed(2)} / $${stockData.ask.toFixed(2)}
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-title">Bid Size / Ask Size</div>
        <div id="stock-bid-ask-size" class="metric-value" style="font-size: 18px;">
          ${stockData.bid_size.toLocaleString()} / ${stockData.ask_size.toLocaleString()}
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-title">Volume</div>
        <div id="stock-volume" class="metric-value">${stockData.volume.toLocaleString()}</div>
      </div>
    </div>
  `;
}

// ⭐ NEW: Live update function - updates without re-rendering
export function updateStockLive() {
  const { stockData } = window.appState;
  if (!stockData) return;
  
  // Update last price
  const lastPriceEl = document.getElementById('stock-last-price');
  if (lastPriceEl) {
    lastPriceEl.textContent = `$${stockData.price.toFixed(2)}`;
  }
  
  // Update bid/ask
  const bidAskEl = document.getElementById('stock-bid-ask');
  if (bidAskEl) {
    bidAskEl.textContent = `$${stockData.bid.toFixed(2)} / $${stockData.ask.toFixed(2)}`;
  }
  
  // Update bid/ask sizes
  const bidAskSizeEl = document.getElementById('stock-bid-ask-size');
  if (bidAskSizeEl) {
    bidAskSizeEl.textContent = `${stockData.bid_size.toLocaleString()} / ${stockData.ask_size.toLocaleString()}`;
  }
  
  // Update volume
  const volumeEl = document.getElementById('stock-volume');
  if (volumeEl) {
    volumeEl.textContent = stockData.volume.toLocaleString();
  }
}
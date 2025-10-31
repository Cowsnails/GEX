// public/views/levels.js - Key Levels View Renderer with Live Updates

export function renderKeyLevels() {
  const { stockData } = window.appState;
  const gex = window.calculateGEX();
  
  if (!gex) return '<div>Loading levels...</div>';
  
  const resistanceStrike = gex.topStrikes.find(s => s.type === 'resistance');
  const supportStrike = gex.topStrikes.find(s => s.type === 'support');
  
  return `
    <div class="metric-grid">
      <div class="metric-card">
        <div class="metric-title">Current Price</div>
        <div id="levels-current-price" class="metric-value">$${stockData?.price.toFixed(2) || '--'}</div>
      </div>
      <div class="metric-card">
        <div class="metric-title">Resistance</div>
        <div id="levels-resistance" class="metric-value negative">$${resistanceStrike?.strike || '--'}</div>
      </div>
      <div class="metric-card">
        <div class="metric-title">Support</div>
        <div id="levels-support" class="metric-value positive">$${supportStrike?.strike || '--'}</div>
      </div>
      <div class="metric-card">
        <div class="metric-title">GEX Ratio</div>
        <div id="levels-gex-ratio" class="metric-value neutral">${gex.gexRatio.toFixed(2)}</div>
      </div>
    </div>

    <div class="strike-levels" style="margin-top: 24px;">
      <div class="gex-card-title" style="margin-bottom: 16px;">All Key Levels</div>
      <div id="levels-strike-list">
        ${gex.topStrikes.map((strike, index) => `
          <div class="strike-bar" data-strike-index="${index}">
            <div class="strike-label" data-field="strike">$${strike.strike}</div>
            <div class="strike-bar-fill" data-field="bar" style="
              width: ${(strike.gex / gex.topStrikes[0].gex) * 100}%;
              background: ${strike.type === 'resistance' ? 'linear-gradient(90deg, #ef4444, #f87171)' : 'linear-gradient(90deg, #10b981, #34d399)'};
            "></div>
            <div class="strike-bar-value" data-field="value">
              ${(strike.gex / 1e9).toFixed(2)}B GEX
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ⭐ NEW: Live update function - updates without re-rendering
export function updateLevelsLive() {
  const { stockData } = window.appState;
  const gex = window.calculateGEX();
  if (!gex) return;
  
  // Update current price
  const currentPriceEl = document.getElementById('levels-current-price');
  if (currentPriceEl && stockData) {
    currentPriceEl.textContent = `$${stockData.price.toFixed(2)}`;
  }
  
  // Update resistance
  const resistanceStrike = gex.topStrikes.find(s => s.type === 'resistance');
  const resistanceEl = document.getElementById('levels-resistance');
  if (resistanceEl) {
    resistanceEl.textContent = resistanceStrike ? `$${resistanceStrike.strike}` : '--';
  }
  
  // Update support
  const supportStrike = gex.topStrikes.find(s => s.type === 'support');
  const supportEl = document.getElementById('levels-support');
  if (supportEl) {
    supportEl.textContent = supportStrike ? `$${supportStrike.strike}` : '--';
  }
  
  // Update GEX ratio
  const gexRatioEl = document.getElementById('levels-gex-ratio');
  if (gexRatioEl) {
    gexRatioEl.textContent = gex.gexRatio.toFixed(2);
  }
  
  // Update strike bars
  const strikeList = document.getElementById('levels-strike-list');
  if (!strikeList) return;
  
  gex.topStrikes.forEach((strike, index) => {
    const strikeBar = strikeList.querySelector(`[data-strike-index="${index}"]`);
    if (!strikeBar) return;
    
    // Update strike price
    const strikeLabel = strikeBar.querySelector('[data-field="strike"]');
    if (strikeLabel) {
      strikeLabel.textContent = `$${strike.strike}`;
    }
    
    // Update bar width and color
    const barFill = strikeBar.querySelector('[data-field="bar"]');
    if (barFill) {
      const width = (strike.gex / gex.topStrikes[0].gex) * 100;
      const background = strike.type === 'resistance' 
        ? 'linear-gradient(90deg, #ef4444, #f87171)' 
        : 'linear-gradient(90deg, #10b981, #34d399)';
      
      barFill.style.width = `${width}%`;
      barFill.style.background = background;
    }
    
    // Update GEX value
    const valueLabel = strikeBar.querySelector('[data-field="value"]');
    if (valueLabel) {
      valueLabel.textContent = `${(strike.gex / 1e9).toFixed(2)}B GEX`;
    }
  });
}
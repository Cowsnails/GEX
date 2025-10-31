// public/views/options.js - Options Chain View Renderer with Live Updates

export function renderOptionsChain() {
  const { optionsData, stockData, filterATM, filterVolume } = window.appState;
  
  let filtered = [...optionsData];
  
  if (filterATM && stockData) {
    filtered = filtered.filter(opt => 
      Math.abs(opt.strike - stockData.price) < 10
    );
  }
  
  if (filterVolume) {
    filtered = filtered.filter(opt => 
      (opt.bid_size + opt.ask_size) > 100
    );
  }
  
  const sorted = filtered.sort((a, b) => a.strike - b.strike);
  
  let html = '<div class="grid grid-9" id="options-grid-container">';
  html += `
    <div class="grid-header">Strike</div>
    <div class="grid-header">Type</div>
    <div class="grid-header">Bid</div>
    <div class="grid-header">Bid Size</div>
    <div class="grid-header">Ask</div>
    <div class="grid-header">Ask Size</div>
    <div class="grid-header">Mid</div>
    <div class="grid-header">Spread</div>
    <div class="grid-header">Total Size</div>
  `;
  
  sorted.forEach(opt => {
    const isCall = opt.right === 'C';
    const isATM = stockData && Math.abs(opt.strike - stockData.price) < 5;
    const spreadColor = opt.spread < 0.1 ? '#10b981' : opt.spread < 0.5 ? '#f59e0b' : '#ef4444';
    const totalSize = opt.bid_size + opt.ask_size;
    const optionKey = `${opt.strike}-${opt.right}`;
    
    html += `
      <div class="grid-row ${isCall ? 'call-row' : 'put-row'} ${isATM ? 'atm' : ''}" data-option="${optionKey}">
        $${opt.strike.toFixed(0)}
      </div>
      <div class="grid-row" data-option="${optionKey}">${opt.right}</div>
      <div class="grid-row" data-option="${optionKey}" data-field="bid">$${opt.bid.toFixed(2)}</div>
      <div class="grid-row" data-option="${optionKey}" data-field="bid_size">${opt.bid_size.toLocaleString()}</div>
      <div class="grid-row" data-option="${optionKey}" data-field="ask">$${opt.ask.toFixed(2)}</div>
      <div class="grid-row" data-option="${optionKey}" data-field="ask_size">${opt.ask_size.toLocaleString()}</div>
      <div class="grid-row" data-option="${optionKey}" data-field="mid">$${opt.mid.toFixed(2)}</div>
      <div class="grid-row" data-option="${optionKey}" data-field="spread" style="color: ${spreadColor}">
        $${opt.spread.toFixed(2)}
      </div>
      <div class="grid-row" data-option="${optionKey}" data-field="total_size">${totalSize.toLocaleString()}</div>
    `;
  });
  
  html += '</div>';
  return html;
}

// ⭐ NEW: Live update function - updates without re-rendering
export function updateOptionsLive() {
  const { optionsData, stockData, filterATM, filterVolume } = window.appState;
  if (!optionsData || optionsData.length === 0) return;
  
  let filtered = [...optionsData];
  
  if (filterATM && stockData) {
    filtered = filtered.filter(opt => 
      Math.abs(opt.strike - stockData.price) < 10
    );
  }
  
  if (filterVolume) {
    filtered = filtered.filter(opt => 
      (opt.bid_size + opt.ask_size) > 100
    );
  }
  
  // Check if filter changed (number of visible rows changed)
  const container = document.getElementById('options-grid-container');
  if (!container) return;
  
  const currentRows = container.querySelectorAll('[data-option]');
  const expectedRows = filtered.length * 9; // 9 cells per option
  
  // If number of rows changed due to filters, do nothing (full re-render needed)
  if (currentRows.length !== expectedRows) return;
  
  // Update each option's values
  filtered.forEach(opt => {
    const optionKey = `${opt.strike}-${opt.right}`;
    const spreadColor = opt.spread < 0.1 ? '#10b981' : opt.spread < 0.5 ? '#f59e0b' : '#ef4444';
    const totalSize = opt.bid_size + opt.ask_size;
    
    // Find all cells for this option
    const cells = document.querySelectorAll(`[data-option="${optionKey}"]`);
    
    cells.forEach(cell => {
      const field = cell.getAttribute('data-field');
      
      if (field === 'bid') {
        cell.textContent = `$${opt.bid.toFixed(2)}`;
      } else if (field === 'bid_size') {
        cell.textContent = opt.bid_size.toLocaleString();
      } else if (field === 'ask') {
        cell.textContent = `$${opt.ask.toFixed(2)}`;
      } else if (field === 'ask_size') {
        cell.textContent = opt.ask_size.toLocaleString();
      } else if (field === 'mid') {
        cell.textContent = `$${opt.mid.toFixed(2)}`;
      } else if (field === 'spread') {
        cell.textContent = `$${opt.spread.toFixed(2)}`;
        cell.style.color = spreadColor;
      } else if (field === 'total_size') {
        cell.textContent = totalSize.toLocaleString();
      }
    });
    
    // Update ATM highlighting
    if (stockData) {
      const isATM = Math.abs(opt.strike - stockData.price) < 5;
      const firstCell = document.querySelector(`[data-option="${optionKey}"]`);
      if (firstCell) {
        if (isATM) {
          firstCell.classList.add('atm');
        } else {
          firstCell.classList.remove('atm');
        }
      }
    }
  });
}
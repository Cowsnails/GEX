// public/charts/gex-chart.js - FIXED: Added cache reset for view navigation
// Uses offscreen buffer and dirty checking to eliminate flicker

let lastDrawnData = null;
let offscreenCanvas = null;
let offscreenCtx = null;

// 🔥 NEW: Function to reset cache when navigating back to GEX view
export function resetChartCache() {
  console.log('🔄 Resetting GEX chart cache');
  lastDrawnData = null;
  offscreenCanvas = null;
  offscreenCtx = null;
}

export function drawGEXChart(canvasId, gex, currentPrice) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.error('Canvas element not found:', canvasId);
    return;
  }
  
  // Create hash of current data to check if redraw is needed
  const dataHash = JSON.stringify({
    strikes: gex.allStrikes.map(s => ({ strike: s.strike, gex: s.netGEX })),
    price: currentPrice,
    callWall: gex.callWall,
    putWall: gex.putWall,
    zeroGamma: gex.zeroGammaLevel
  });
  
  // Skip redraw if data hasn't changed
  if (lastDrawnData === dataHash) {
    return;
  }
  lastDrawnData = dataHash;
  
  const ctx = canvas.getContext('2d');
  
  // Set canvas size only if changed
  const newWidth = canvas.offsetWidth;
  const newHeight = 400;
  if (canvas.width !== newWidth || canvas.height !== newHeight) {
    canvas.width = newWidth;
    canvas.height = newHeight;
    offscreenCanvas = null; // Reset offscreen buffer on size change
  }
  
  const width = canvas.width;
  const height = canvas.height;
  const padding = { top: 40, right: 60, bottom: 50, left: 80 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  // Create offscreen canvas for double buffering (eliminates flicker)
  if (!offscreenCanvas) {
    offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = width;
    offscreenCanvas.height = height;
    offscreenCtx = offscreenCanvas.getContext('2d');
  }
  
  // Draw everything to offscreen canvas first
  const drawCtx = offscreenCtx;
  
  // Get strike data sorted by strike price
  const strikes = gex.allStrikes.sort((a, b) => a.strike - b.strike);
  if (strikes.length === 0) return;
  
  // Find price range
  const minStrike = Math.min(...strikes.map(s => s.strike));
  const maxStrike = Math.max(...strikes.map(s => s.strike));
  const strikeRange = maxStrike - minStrike;
  
  // Find max GEX for scaling
  const maxGEX = Math.max(...strikes.map(s => Math.abs(s.netGEX)));
  
  // Helper function: Map strike to X coordinate
  const getX = (strike) => {
    return padding.left + ((strike - minStrike) / strikeRange) * chartWidth;
  };
  
  // Helper function: Map GEX to Y coordinate
  const getY = (gexValue) => {
    const normalized = gexValue / maxGEX;
    return padding.top + chartHeight / 2 - (normalized * chartHeight / 2);
  };
  
  // Draw background
  drawCtx.fillStyle = '#0f172a';
  drawCtx.fillRect(0, 0, width, height);
  
  // Draw zero line
  drawCtx.strokeStyle = '#475569';
  drawCtx.lineWidth = 2;
  drawCtx.setLineDash([5, 5]);
  drawCtx.beginPath();
  drawCtx.moveTo(padding.left, padding.top + chartHeight / 2);
  drawCtx.lineTo(width - padding.right, padding.top + chartHeight / 2);
  drawCtx.stroke();
  drawCtx.setLineDash([]);
  
  // Draw GEX bars
  strikes.forEach(strike => {
    const x = getX(strike.strike);
    const y = getY(strike.netGEX);
    const zeroY = padding.top + chartHeight / 2;
    const barWidth = Math.max(2, chartWidth / strikes.length * 0.8);
    
    // Determine color
    const isSupport = strike.netGEX < 0;
    const gradient = drawCtx.createLinearGradient(x, y, x, zeroY);
    
    if (isSupport) {
      gradient.addColorStop(0, '#10b981');
      gradient.addColorStop(1, '#059669');
    } else {
      gradient.addColorStop(0, '#ef4444');
      gradient.addColorStop(1, '#dc2626');
    }
    
    drawCtx.fillStyle = gradient;
    drawCtx.fillRect(x - barWidth / 2, Math.min(y, zeroY), barWidth, Math.abs(y - zeroY));
    
    // Highlight if this is call wall or put wall
    if (strike.strike === gex.callWall || strike.strike === gex.putWall) {
      drawCtx.strokeStyle = strike.strike === gex.callWall ? '#fca5a5' : '#86efac';
      drawCtx.lineWidth = 3;
      drawCtx.strokeRect(x - barWidth / 2 - 2, Math.min(y, zeroY) - 2, barWidth + 4, Math.abs(y - zeroY) + 4);
    }
  });
  
  // Draw current price line
  if (currentPrice) {
    const priceX = getX(currentPrice);
    drawCtx.strokeStyle = '#3b82f6';
    drawCtx.lineWidth = 3;
    drawCtx.setLineDash([]);
    drawCtx.beginPath();
    drawCtx.moveTo(priceX, padding.top);
    drawCtx.lineTo(priceX, height - padding.bottom);
    drawCtx.stroke();
    
    // Price label
    drawCtx.fillStyle = '#3b82f6';
    drawCtx.fillRect(priceX - 40, padding.top - 25, 80, 20);
    drawCtx.fillStyle = '#ffffff';
    drawCtx.font = 'bold 12px Arial';
    drawCtx.textAlign = 'center';
    drawCtx.fillText('$' + currentPrice.toFixed(0), priceX, padding.top - 11);
  }
  
  // Draw zero gamma level line
  if (gex.zeroGammaLevel) {
    const zgX = getX(gex.zeroGammaLevel);
    drawCtx.strokeStyle = '#8b5cf6';
    drawCtx.lineWidth = 3;
    drawCtx.setLineDash([10, 5]);
    drawCtx.beginPath();
    drawCtx.moveTo(zgX, padding.top);
    drawCtx.lineTo(zgX, height - padding.bottom);
    drawCtx.stroke();
    drawCtx.setLineDash([]);
    
    // Zero gamma label
    drawCtx.fillStyle = '#8b5cf6';
    drawCtx.fillRect(zgX - 45, height - padding.bottom + 5, 90, 20);
    drawCtx.fillStyle = '#ffffff';
    drawCtx.font = 'bold 11px Arial';
    drawCtx.textAlign = 'center';
    drawCtx.fillText('Zero Gamma', zgX, height - padding.bottom + 18);
  }
  
  // Draw X-axis labels (strikes)
  drawCtx.fillStyle = '#94a3b8';
  drawCtx.font = '11px Arial';
  drawCtx.textAlign = 'center';
  
  const labelCount = 8;
  const labelStep = Math.ceil(strikes.length / labelCount);
  
  for (let i = 0; i < strikes.length; i += labelStep) {
    const strike = strikes[i];
    const x = getX(strike.strike);
    drawCtx.fillText('$' + strike.strike.toFixed(0), x, height - padding.bottom + 20);
  }
  
  // Draw Y-axis labels (GEX values)
  drawCtx.textAlign = 'right';
  
  const yLabelCount = 5;
  for (let i = 0; i <= yLabelCount; i++) {
    const gexValue = maxGEX * (1 - 2 * i / yLabelCount);
    const y = getY(gexValue);
    
    drawCtx.fillStyle = '#94a3b8';
    drawCtx.fillText((gexValue / 1e9).toFixed(2) + 'B', padding.left - 10, y + 4);
    
    // Grid line
    drawCtx.strokeStyle = '#1e293b';
    drawCtx.lineWidth = 1;
    drawCtx.beginPath();
    drawCtx.moveTo(padding.left, y);
    drawCtx.lineTo(width - padding.right, y);
    drawCtx.stroke();
  }
  
  // Draw axis labels
  drawCtx.fillStyle = '#e2e8f0';
  drawCtx.font = 'bold 13px Arial';
  drawCtx.textAlign = 'center';
  
  // X-axis label
  drawCtx.fillText('Strike Price', width / 2, height - 5);
  
  // Y-axis label
  drawCtx.save();
  drawCtx.translate(20, height / 2);
  drawCtx.rotate(-Math.PI / 2);
  drawCtx.fillText('Net GEX (Billions)', 0, 0);
  drawCtx.restore();
  
  // Draw title
  drawCtx.fillStyle = '#f1f5f9';
  drawCtx.font = 'bold 16px Arial';
  drawCtx.textAlign = 'left';
  drawCtx.fillText('GEX Profile by Strike', padding.left, 25);
  
  // Draw legend
  const legendX = width - padding.right - 120;
  const legendY = padding.top + 10;
  
  // Resistance legend
  drawCtx.fillStyle = '#ef4444';
  drawCtx.fillRect(legendX, legendY, 15, 15);
  drawCtx.fillStyle = '#cbd5e1';
  drawCtx.font = '11px Arial';
  drawCtx.textAlign = 'left';
  drawCtx.fillText('Resistance', legendX + 20, legendY + 11);
  
  // Support legend
  drawCtx.fillStyle = '#10b981';
  drawCtx.fillRect(legendX, legendY + 20, 15, 15);
  drawCtx.fillText('Support', legendX + 20, legendY + 31);
  
  // Current price legend
  drawCtx.strokeStyle = '#3b82f6';
  drawCtx.lineWidth = 3;
  drawCtx.beginPath();
  drawCtx.moveTo(legendX, legendY + 45);
  drawCtx.lineTo(legendX + 15, legendY + 45);
  drawCtx.stroke();
  drawCtx.fillStyle = '#cbd5e1';
  drawCtx.fillText('Current Price', legendX + 20, legendY + 49);
  
  // Zero gamma legend
  drawCtx.strokeStyle = '#8b5cf6';
  drawCtx.lineWidth = 3;
  drawCtx.setLineDash([5, 3]);
  drawCtx.beginPath();
  drawCtx.moveTo(legendX, legendY + 65);
  drawCtx.lineTo(legendX + 15, legendY + 65);
  drawCtx.stroke();
  drawCtx.setLineDash([]);
  drawCtx.fillStyle = '#cbd5e1';
  drawCtx.fillText('Zero Gamma', legendX + 20, legendY + 69);
  
  // Copy offscreen buffer to visible canvas (single operation = no flicker)
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(offscreenCanvas, 0, 0);
  
  console.log('✅ GEX chart drawn successfully');
}
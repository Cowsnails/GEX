// public/views/gex.js - GEX Dashboard View Renderer with Live Updates

export function renderGEXDashboard() {
  const gex = window.calculateGEX();
  if (!gex) return '<div>Loading GEX data...</div>';
  
  let html = '<div class="gex-grid">';
  html += '<div class="gex-card"><div class="gex-card-title">Total GEX</div><div id="total-gex-value" class="gex-value neutral">$' + (gex.totalGEX / 1e9).toFixed(2) + 'B</div><div class="gex-subtitle">Absolute Gamma Exposure</div></div>';
  html += '<div class="gex-card"><div class="gex-card-title">Net GEX</div><div id="net-gex-value" class="gex-value ' + (gex.netGEX >= 0 ? 'positive' : 'negative') + '">' + (gex.netGEX >= 0 ? '+' : '') + (gex.netGEX / 1e9).toFixed(2) + 'B</div><div id="net-gex-regime" class="gex-subtitle">' + gex.regime.toUpperCase() + ' regime</div></div>';
  html += '<div class="gex-card"><div class="gex-card-title">Call GEX</div><div id="call-gex-value" class="gex-value positive">$' + (gex.callGEX / 1e9).toFixed(2) + 'B</div><div class="gex-subtitle">Positive Gamma</div></div>';
  html += '<div class="gex-card"><div class="gex-card-title">Put GEX</div><div id="put-gex-value" class="gex-value negative">$' + (gex.putGEX / 1e9).toFixed(2) + 'B</div><div class="gex-subtitle">Negative Gamma</div></div>';
  html += '</div>';
  
  // ⭐ ZERO GAMMA LEVEL CARD ⭐
  if (gex.zeroGammaLevel) {
    html += '<div id="zero-gamma-card" style="background:linear-gradient(135deg, #312e81 0%, #1e293b 100%);border-radius:16px;padding:32px;margin-bottom:24px;border:3px solid #6366f1;box-shadow:0 8px 32px rgba(99,102,241,0.3);">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
    html += '<div><div style="font-size:14px;color:#a5b4fc;margin-bottom:12px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">🎯 ZERO GAMMA LEVEL (GAMMA FLIP POINT)</div>';
    html += '<div id="zg-level-value" style="font-size:48px;font-weight:800;color:#fff;margin-bottom:8px;">$' + gex.zeroGammaLevel.toFixed(2) + '</div>';
    html += '<div id="zg-distance" style="font-size:16px;color:#cbd5e1;margin-bottom:16px;">' + (gex.distanceToZeroGamma >= 0 ? '+' : '') + gex.distanceToZeroGamma.toFixed(2) + '% from current price</div>';
    html += '<div id="zg-badge" style="display:inline-block;background:' + (gex.isAboveZeroGamma ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)') + ';border:2px solid ' + (gex.isAboveZeroGamma ? '#10b981' : '#ef4444') + ';padding:12px 24px;border-radius:8px;">';
    html += '<div id="zg-status" style="font-size:14px;color:' + (gex.isAboveZeroGamma ? '#10b981' : '#ef4444') + ';font-weight:700;">' + (gex.isAboveZeroGamma ? '🛡️ ABOVE ZERO GAMMA' : '⚡ BELOW ZERO GAMMA') + '</div>';
    html += '<div id="zg-status-text" style="font-size:12px;color:#cbd5e1;margin-top:4px;">' + (gex.isAboveZeroGamma ? 'Dealers stabilizing market' : 'Dealers destabilizing market') + '</div>';
    html += '</div></div>';
    html += '<div style="text-align:right;"><div id="zg-emoji" style="font-size:72px;margin-bottom:12px;">' + (gex.isAboveZeroGamma ? '🛡️' : '⚡') + '</div>';
    html += '<div id="zg-regime-label" style="font-size:20px;font-weight:800;color:' + (gex.isAboveZeroGamma ? '#10b981' : '#ef4444') + ';">' + (gex.isAboveZeroGamma ? 'STABILIZING' : 'DESTABILIZING') + '</div>';
    html += '<div style="font-size:13px;color:#94a3b8;margin-top:8px;">Market Regime</div></div>';
    html += '</div>';
    
    html += '<div style="margin-top:24px;padding-top:24px;border-top:1px solid rgba(148,163,184,0.2);">';
    html += '<div id="zg-explanation" style="font-size:14px;color:#cbd5e1;line-height:1.8;">';
    if (gex.isAboveZeroGamma) {
      html += '<strong style="color:#10b981;">✅ Above Zero Gamma (Positive Regime):</strong><br>';
      html += 'Dealers are LONG gamma and will stabilize the market by:<br>';
      html += '• <strong>Buying dips</strong> (supporting price on weakness)<br>';
      html += '• <strong>Selling rallies</strong> (capping price on strength)<br>';
      html += '• Expect <strong>lower volatility</strong> and range-bound trading';
    } else {
      html += '<strong style="color:#ef4444;">⚠️ Below Zero Gamma (Negative Regime):</strong><br>';
      html += 'Dealers are SHORT gamma and will destabilize the market by:<br>';
      html += '• <strong>Selling dips</strong> (accelerating downward moves)<br>';
      html += '• <strong>Buying rallies</strong> (accelerating upward moves)<br>';
      html += '• Expect <strong>higher volatility</strong> and breakout potential';
    }
    html += '</div></div>';
    html += '</div>';
  } else {
    html += '<div id="zero-gamma-card" style="background:linear-gradient(135deg, #374151 0%, #1e293b 100%);border-radius:12px;padding:24px;margin-bottom:24px;border:2px solid #4b5563;">';
    html += '<div style="text-align:center;"><div style="font-size:16px;color:#9ca3af;margin-bottom:8px;">🎯 ZERO GAMMA LEVEL</div>';
    html += '<div id="zg-level-value" style="font-size:24px;font-weight:700;color:#6b7280;">Calculating...</div>';
    html += '<div style="font-size:13px;color:#6b7280;margin-top:8px;">No zero crossing found in current range</div></div></div>';
  }
  
  // Advanced Metrics Grid
  html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px;">';
  html += '<div class="gex-card"><div class="gex-card-title">GEX Ratio</div><div id="gex-ratio-value" class="gex-value neutral">' + gex.gexRatio.toFixed(2) + '</div><div class="gex-subtitle">Call/Put GEX</div></div>';
  html += '<div class="gex-card"><div class="gex-card-title">Pin Risk</div><div id="pin-risk-value" class="gex-value neutral">' + (gex.pinRisk * 100).toFixed(1) + '%</div><div class="gex-subtitle">Concentration Risk</div></div>';
  html += '<div class="gex-card"><div class="gex-card-title">Vanna Exposure</div><div id="vanna-value" class="gex-value ' + (gex.vannaExposure >= 0 ? 'positive' : 'negative') + '">' + (gex.vannaExposure / 1e6).toFixed(1) + 'M</div><div class="gex-subtitle">IV Sensitivity</div></div>';
  html += '<div class="gex-card"><div class="gex-card-title">Valid Contracts</div><div id="valid-contracts-value" class="gex-value neutral">' + gex.validContracts + '</div><div class="gex-subtitle">of ' + gex.totalContracts + ' total</div></div>';
  html += '</div>';
  
  // Walls Display
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;">';
  html += '<div style="background:linear-gradient(135deg, #7f1d1d 0%, #1e293b 100%);border-radius:12px;padding:24px;border:2px solid #ef4444;">';
  html += '<div style="font-size:16px;color:#fca5a5;margin-bottom:8px;">🚧 CALL WALL (Resistance)</div>';
  html += '<div id="call-wall-value" style="font-size:36px;font-weight:700;color:#fff;margin-bottom:8px;">$' + (gex.callWall || '--') + '</div>';
  html += '<div id="call-wall-gex" style="font-size:14px;color:#cbd5e1;">GEX: $' + (gex.callWallGEX / 1e9).toFixed(2) + 'B</div>';
  html += '<div style="font-size:13px;color:#94a3b8;margin-top:8px;">Highest positive gamma above price</div></div>';
  html += '<div style="background:linear-gradient(135deg, #14532d 0%, #1e293b 100%);border-radius:12px;padding:24px;border:2px solid #10b981;">';
  html += '<div style="font-size:16px;color:#86efac;margin-bottom:8px;">🛡️ PUT WALL (Support)</div>';
  html += '<div id="put-wall-value" style="font-size:36px;font-weight:700;color:#fff;margin-bottom:8px;">$' + (gex.putWall || '--') + '</div>';
  html += '<div id="put-wall-gex" style="font-size:14px;color:#cbd5e1;">GEX: $' + (gex.putWallGEX / 1e9).toFixed(2) + 'B</div>';
  html += '<div style="font-size:13px;color:#94a3b8;margin-top:8px;">Highest negative gamma below price</div></div>';
  html += '</div>';
  
  // 📊 CHART SECTION
  html += '<div class="chart-container" style="padding:10px 20px;">';
  html += '<canvas id="gexProfileChart" style="width:100%;height:400px;display:block;margin:0 auto;"></canvas>';
  html += '</div>';
  
  html += '<div class="strike-levels"><div class="gex-card-title" style="margin-bottom: 16px;">Top GEX Strikes</div>';
  html += '<div id="top-strikes-list">';
  for (let i = 0; i < gex.topStrikes.length; i++) {
    const strike = gex.topStrikes[i];
    const positionIndicator = strike.isAbovePrice ? '↑' : strike.isBelowPrice ? '↓' : '=';
    html += '<div class="strike-bar">';
    html += '<div class="strike-label">$' + strike.strike + ' ' + positionIndicator + '</div>';
    html += '<div class="strike-bar-fill" style="width:' + (strike.gex / gex.topStrikes[0].gex * 100) + '%;background:' + (strike.type === 'resistance' ? 'linear-gradient(90deg, #ef4444, #f87171)' : 'linear-gradient(90deg, #10b981, #34d399)') + '"></div>';
    html += '<div class="strike-bar-value">' + (strike.gex / 1e9).toFixed(2) + 'B ' + (strike.type === 'resistance' ? '🚧' : '🛡️') + '</div>';
    html += '</div>';
  }
  html += '</div></div>';
  
  return html;
}

// ⭐ NEW: Live update function - updates without re-rendering
export function updateGEXLive() {
  const gex = window.calculateGEX();
  if (!gex) return;
  
  // Update main metric cards
  const totalGexEl = document.getElementById('total-gex-value');
  if (totalGexEl) totalGexEl.textContent = '$' + (gex.totalGEX / 1e9).toFixed(2) + 'B';
  
  const netGexEl = document.getElementById('net-gex-value');
  if (netGexEl) {
    netGexEl.textContent = (gex.netGEX >= 0 ? '+' : '') + (gex.netGEX / 1e9).toFixed(2) + 'B';
    netGexEl.className = 'gex-value ' + (gex.netGEX >= 0 ? 'positive' : 'negative');
  }
  
  const netGexRegimeEl = document.getElementById('net-gex-regime');
  if (netGexRegimeEl) netGexRegimeEl.textContent = gex.regime.toUpperCase() + ' regime';
  
  const callGexEl = document.getElementById('call-gex-value');
  if (callGexEl) callGexEl.textContent = '$' + (gex.callGEX / 1e9).toFixed(2) + 'B';
  
  const putGexEl = document.getElementById('put-gex-value');
  if (putGexEl) putGexEl.textContent = '$' + (gex.putGEX / 1e9).toFixed(2) + 'B';
  
  // Update zero gamma display
  if (gex.zeroGammaLevel) {
    const zgLevelEl = document.getElementById('zg-level-value');
    if (zgLevelEl) {
      zgLevelEl.textContent = '$' + gex.zeroGammaLevel.toFixed(2);
      zgLevelEl.style.color = '#fff';
      zgLevelEl.style.fontSize = '48px';
    }
    
    const zgDistanceEl = document.getElementById('zg-distance');
    if (zgDistanceEl) {
      zgDistanceEl.textContent = (gex.distanceToZeroGamma >= 0 ? '+' : '') + gex.distanceToZeroGamma.toFixed(2) + '% from current price';
    }
    
    const zgBadgeEl = document.getElementById('zg-badge');
    if (zgBadgeEl) {
      zgBadgeEl.style.background = gex.isAboveZeroGamma ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)';
      zgBadgeEl.style.borderColor = gex.isAboveZeroGamma ? '#10b981' : '#ef4444';
    }
    
    const zgStatusEl = document.getElementById('zg-status');
    if (zgStatusEl) {
      zgStatusEl.textContent = gex.isAboveZeroGamma ? '🛡️ ABOVE ZERO GAMMA' : '⚡ BELOW ZERO GAMMA';
      zgStatusEl.style.color = gex.isAboveZeroGamma ? '#10b981' : '#ef4444';
    }
    
    const zgStatusTextEl = document.getElementById('zg-status-text');
    if (zgStatusTextEl) {
      zgStatusTextEl.textContent = gex.isAboveZeroGamma ? 'Dealers stabilizing market' : 'Dealers destabilizing market';
    }
    
    const zgEmojiEl = document.getElementById('zg-emoji');
    if (zgEmojiEl) zgEmojiEl.textContent = gex.isAboveZeroGamma ? '🛡️' : '⚡';
    
    const zgRegimeLabelEl = document.getElementById('zg-regime-label');
    if (zgRegimeLabelEl) {
      zgRegimeLabelEl.textContent = gex.isAboveZeroGamma ? 'STABILIZING' : 'DESTABILIZING';
      zgRegimeLabelEl.style.color = gex.isAboveZeroGamma ? '#10b981' : '#ef4444';
    }
    
    const zgExplanationEl = document.getElementById('zg-explanation');
    if (zgExplanationEl) {
      let explanationHTML = '';
      if (gex.isAboveZeroGamma) {
        explanationHTML = '<strong style="color:#10b981;">✅ Above Zero Gamma (Positive Regime):</strong><br>';
        explanationHTML += 'Dealers are LONG gamma and will stabilize the market by:<br>';
        explanationHTML += '• <strong>Buying dips</strong> (supporting price on weakness)<br>';
        explanationHTML += '• <strong>Selling rallies</strong> (capping price on strength)<br>';
        explanationHTML += '• Expect <strong>lower volatility</strong> and range-bound trading';
      } else {
        explanationHTML = '<strong style="color:#ef4444;">⚠️ Below Zero Gamma (Negative Regime):</strong><br>';
        explanationHTML += 'Dealers are SHORT gamma and will destabilize the market by:<br>';
        explanationHTML += '• <strong>Selling dips</strong> (accelerating downward moves)<br>';
        explanationHTML += '• <strong>Buying rallies</strong> (accelerating upward moves)<br>';
        explanationHTML += '• Expect <strong>higher volatility</strong> and breakout potential';
      }
      zgExplanationEl.innerHTML = explanationHTML;
    }
  }
  
  // Update advanced metrics
  const gexRatioEl = document.getElementById('gex-ratio-value');
  if (gexRatioEl) gexRatioEl.textContent = gex.gexRatio.toFixed(2);
  
  const pinRiskEl = document.getElementById('pin-risk-value');
  if (pinRiskEl) pinRiskEl.textContent = (gex.pinRisk * 100).toFixed(1) + '%';
  
  const vannaEl = document.getElementById('vanna-value');
  if (vannaEl) {
    vannaEl.textContent = (gex.vannaExposure / 1e6).toFixed(1) + 'M';
    vannaEl.className = 'gex-value ' + (gex.vannaExposure >= 0 ? 'positive' : 'negative');
  }
  
  const validContractsEl = document.getElementById('valid-contracts-value');
  if (validContractsEl) validContractsEl.textContent = gex.validContracts.toString();
  
  // Update walls
  const callWallEl = document.getElementById('call-wall-value');
  if (callWallEl) callWallEl.textContent = '$' + (gex.callWall || '--');
  
  const callWallGexEl = document.getElementById('call-wall-gex');
  if (callWallGexEl) callWallGexEl.textContent = 'GEX: $' + (gex.callWallGEX / 1e9).toFixed(2) + 'B';
  
  const putWallEl = document.getElementById('put-wall-value');
  if (putWallEl) putWallEl.textContent = '$' + (gex.putWall || '--');
  
  const putWallGexEl = document.getElementById('put-wall-gex');
  if (putWallGexEl) putWallGexEl.textContent = 'GEX: $' + (gex.putWallGEX / 1e9).toFixed(2) + 'B';
  
  // Update top strikes list
  const topStrikesEl = document.getElementById('top-strikes-list');
  if (topStrikesEl) {
    let strikesHTML = '';
    for (let i = 0; i < gex.topStrikes.length; i++) {
      const strike = gex.topStrikes[i];
      const positionIndicator = strike.isAbovePrice ? '↑' : strike.isBelowPrice ? '↓' : '=';
      strikesHTML += '<div class="strike-bar">';
      strikesHTML += '<div class="strike-label">$' + strike.strike + ' ' + positionIndicator + '</div>';
      strikesHTML += '<div class="strike-bar-fill" style="width:' + (strike.gex / gex.topStrikes[0].gex * 100) + '%;background:' + (strike.type === 'resistance' ? 'linear-gradient(90deg, #ef4444, #f87171)' : 'linear-gradient(90deg, #10b981, #34d399)') + '"></div>';
      strikesHTML += '<div class="strike-bar-value">' + (strike.gex / 1e9).toFixed(2) + 'B ' + (strike.type === 'resistance' ? '🚧' : '🛡️') + '</div>';
      strikesHTML += '</div>';
    }
    topStrikesEl.innerHTML = strikesHTML;
  }
  
  // Redraw chart
  if (window.drawGEXChart && window.appState.stockData) {
    window.drawGEXChart('gexProfileChart', gex, window.appState.stockData.price);
  }
}
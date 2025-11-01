// public/views/signals.js - Updated with Live Updates
import { renderEntryTimingWidget } from './timing-widget.js';

export function renderTradeSignals() {
  // Start with the entry timing widget at the top
  let html = renderEntryTimingWidget();
  
  const signal = window.analyzeTradeSignal();
  if (!signal) return html + '<div style="text-align:center;padding:40px;color:#9ca3af;">Loading signal data...</div>';

  const currentPrice = window.appState.stockData ? window.appState.stockData.price : 0;
  const currentPriceDisplay = currentPrice > 0 ? currentPrice.toFixed(2) : 'N/A';
  
  const signalBg = signal.action === 'BUY' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : signal.action === 'SELL' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)';
  const signalEmoji = signal.action === 'BUY' ? '🚀' : signal.action === 'SELL' ? '📉' : '⸏';
  
  html += '<div id="signal-hero" style="background:' + signalBg + ';border-radius:16px;padding:32px;margin-bottom:24px;box-shadow:0 8px 32px rgba(0,0,0,0.3);">';
  html += '<div style="text-align:center;">';
  html += '<div id="signal-emoji" style="font-size:72px;margin-bottom:16px;">' + signalEmoji + '</div>';
  html += '<div id="signal-action" style="font-size:48px;font-weight:800;color:#fff;margin-bottom:8px;">' + signal.action + '</div>';
  html += '<div id="signal-reasoning" style="font-size:20px;color:rgba(255,255,255,0.9);margin-bottom:24px;">' + signal.reasoning[0] + '</div>';
  html += '<div style="display:inline-block;background:rgba(255,255,255,0.2);padding:12px 32px;border-radius:50px;backdrop-filter:blur(10px);">';
  html += '<span style="font-size:16px;color:rgba(255,255,255,0.8);margin-right:8px;">Confidence Score</span>';
  html += '<span id="signal-confidence" style="font-size:32px;font-weight:700;color:#fff;">' + signal.confidence + '%</span>';
  html += '</div></div></div>';
  
  // Four-column grid with IDs
  html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px;">';
  
  // Current Price
  html += '<div id="current-price-card" style="background:#1e293b;border-radius:12px;padding:24px;border:2px solid ' + (signal.action === 'BUY' ? '#10b981' : signal.action === 'SELL' ? '#ef4444' : '#334155') + ';">';
  html += '<div style="font-size:16px;color:#94a3b8;margin-bottom:8px;">📍 CURRENT PRICE</div>';
  html += '<div id="current-price-value" style="font-size:32px;font-weight:700;color:#fff;margin-bottom:4px;">$' + currentPriceDisplay + '</div>';
  html += '<div id="current-price-status" style="font-size:14px;color:' + (signal.action === 'BUY' ? '#10b981' : signal.action === 'SELL' ? '#ef4444' : '#6b7280') + ';">';
  html += signal.action === 'BUY' ? '✅ Good entry point' : signal.action === 'SELL' ? '⚠️ Exit/Short here' : '⸏ Wait for setup';
  html += '</div></div>';
  
  // Zero Gamma
  if (signal.levels.zeroGamma) {
    const zgColor = signal.metrics.regime === 'Stabilizing' ? '#10b981' : '#ef4444';
    const zgIcon = signal.metrics.regime === 'Stabilizing' ? '🛡️' : '⚡';
    html += '<div style="background:#1e293b;border-radius:12px;padding:24px;border:2px solid #6366f1;">';
    html += '<div style="font-size:16px;color:#94a3b8;margin-bottom:8px;">🎯 ZERO GAMMA</div>';
    html += '<div id="zero-gamma-value" style="font-size:32px;font-weight:700;color:#8b5cf6;margin-bottom:4px;">$' + signal.levels.zeroGamma.toFixed(2) + '</div>';
    html += '<div id="zero-gamma-regime" style="font-size:14px;color:' + zgColor + ';">' + zgIcon + ' ' + signal.metrics.regime + '</div></div>';
  } else {
    html += '<div style="background:#1e293b;border-radius:12px;padding:24px;border:2px solid #334155;">';
    html += '<div style="font-size:16px;color:#94a3b8;margin-bottom:8px;">🎯 ZERO GAMMA</div>';
    html += '<div id="zero-gamma-value" style="font-size:32px;font-weight:700;color:#6b7280;margin-bottom:4px;">N/A</div>';
    html += '<div id="zero-gamma-regime" style="font-size:14px;color:#6b7280;">Calculating...</div></div>';
  }
  
  // Support
  html += '<div style="background:#1e293b;border-radius:12px;padding:24px;border:2px solid #10b981;">';
  html += '<div style="font-size:16px;color:#94a3b8;margin-bottom:8px;">🛡️ SUPPORT</div>';
  html += '<div id="support-value" style="font-size:32px;font-weight:700;color:#10b981;margin-bottom:4px;">$' + (signal.levels.support !== 'N/A' ? signal.levels.support : '--') + '</div>';
  html += '<div id="support-distance" style="font-size:14px;color:#34d399;">' + signal.metrics.supportDistance + '% below</div></div>';
  
  // Resistance
  html += '<div style="background:#1e293b;border-radius:12px;padding:24px;border:2px solid #ef4444;">';
  html += '<div style="font-size:16px;color:#94a3b8;margin-bottom:8px;">🚧 RESISTANCE</div>';
  html += '<div id="resistance-value" style="font-size:32px;font-weight:700;color:#ef4444;margin-bottom:4px;">$' + (signal.levels.resistance !== 'N/A' ? signal.levels.resistance : '--') + '</div>';
  html += '<div id="resistance-distance" style="font-size:14px;color:#f87171;">' + signal.metrics.resistanceDistance + '% above</div></div>';
  
  html += '</div>';
  
  // Reasoning
  html += '<div style="background:#1e293b;border-radius:12px;padding:24px;margin-bottom:24px;">';
  html += '<div style="font-size:18px;font-weight:700;color:#fff;margin-bottom:16px;">📋 Signal Analysis</div>';
  html += '<div id="reasoning-list">';
  for (let i = 0; i < signal.reasoning.length; i++) {
    html += '<div style="display:flex;align-items:start;gap:12px;padding:12px;background:rgba(59,130,246,0.05);border-radius:8px;margin-bottom:8px;">';
    html += '<div style="min-width:24px;height:24px;background:#3b82f6;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;">' + (i + 1) + '</div>';
    html += '<div style="flex:1;color:#e0e6ed;font-size:14px;">' + signal.reasoning[i] + '</div>';
    html += '</div>';
  }
  html += '</div></div>';
  
  // Metrics with IDs
  html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">';
  html += '<div style="background:#1e293b;border-radius:8px;padding:16px;text-align:center;">';
  html += '<div style="font-size:12px;color:#94a3b8;margin-bottom:4px;">MOMENTUM</div>';
  html += '<div id="metric-momentum" style="font-size:20px;font-weight:700;color:' + (parseFloat(signal.metrics.momentum) > 0 ? '#10b981' : '#ef4444') + ';">' + signal.metrics.momentum + '%</div></div>';
  html += '<div style="background:#1e293b;border-radius:8px;padding:16px;text-align:center;">';
  html += '<div style="font-size:12px;color:#94a3b8;margin-bottom:4px;">PUT/CALL RATIO</div>';
  html += '<div id="metric-pcratio" style="font-size:20px;font-weight:700;color:#3b82f6;">' + signal.metrics.pcRatio + '</div></div>';
  html += '<div style="background:#1e293b;border-radius:8px;padding:16px;text-align:center;">';
  html += '<div style="font-size:12px;color:#94a3b8;margin-bottom:4px;">NET GEX</div>';
  html += '<div id="metric-netgex" style="font-size:20px;font-weight:700;color:' + (signal.metrics.netGEX >= 0 ? '#10b981' : '#ef4444') + ';">' + (signal.metrics.netGEX >= 0 ? '+' : '') + (signal.metrics.netGEX / 1e9).toFixed(2) + 'B</div></div>';
  html += '</div>';
  
  return html;
}

// ⭐ NEW: Live update function - updates without re-rendering
export function updateSignalsLive() {
  const signal = window.analyzeTradeSignal();
  if (!signal) return;
  
  const currentPrice = window.appState.stockData?.price || 0;
  
  // Update hero card background color
  const signalHero = document.getElementById('signal-hero');
  if (signalHero) {
    const signalBg = signal.action === 'BUY' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : signal.action === 'SELL' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)';
    signalHero.style.background = signalBg;
  }
  
  // Update emoji
  const signalEmoji = signal.action === 'BUY' ? '🚀' : signal.action === 'SELL' ? '📉' : '⸏';
  const emojiEl = document.getElementById('signal-emoji');
  if (emojiEl) emojiEl.textContent = signalEmoji;
  
  // Update main action
  const actionEl = document.getElementById('signal-action');
  if (actionEl) actionEl.textContent = signal.action;
  
  // Update reasoning
  const reasoningEl = document.getElementById('signal-reasoning');
  if (reasoningEl) reasoningEl.textContent = signal.reasoning[0];
  
  // Update confidence
  const confidenceEl = document.getElementById('signal-confidence');
  if (confidenceEl) confidenceEl.textContent = signal.confidence + '%';
  
  // Update current price card
  const priceCardEl = document.getElementById('current-price-card');
  if (priceCardEl) {
    const borderColor = signal.action === 'BUY' ? '#10b981' : signal.action === 'SELL' ? '#ef4444' : '#334155';
    priceCardEl.style.borderColor = borderColor;
  }
  
  const priceValueEl = document.getElementById('current-price-value');
  if (priceValueEl) {
    const priceDisplay = currentPrice > 0 ? currentPrice.toFixed(2) : 'N/A';
    priceValueEl.textContent = '$' + priceDisplay;
  }
  
  const priceStatusEl = document.getElementById('current-price-status');
  if (priceStatusEl) {
    const statusText = signal.action === 'BUY' ? '✅ Good entry point' : signal.action === 'SELL' ? '⚠️ Exit/Short here' : '⸏ Wait for setup';
    const statusColor = signal.action === 'BUY' ? '#10b981' : signal.action === 'SELL' ? '#ef4444' : '#6b7280';
    priceStatusEl.textContent = statusText;
    priceStatusEl.style.color = statusColor;
  }
  
  // Update zero gamma
  if (signal.levels.zeroGamma) {
    const zgValueEl = document.getElementById('zero-gamma-value');
    if (zgValueEl) {
      zgValueEl.textContent = '$' + signal.levels.zeroGamma.toFixed(2);
      zgValueEl.style.color = '#8b5cf6';
    }
    
    const zgRegimeEl = document.getElementById('zero-gamma-regime');
    if (zgRegimeEl) {
      const zgColor = signal.metrics.regime === 'Stabilizing' ? '#10b981' : '#ef4444';
      const zgIcon = signal.metrics.regime === 'Stabilizing' ? '🛡️' : '⚡';
      zgRegimeEl.textContent = zgIcon + ' ' + signal.metrics.regime;
      zgRegimeEl.style.color = zgColor;
    }
  }
  
  // Update support
  const supportEl = document.getElementById('support-value');
  if (supportEl && signal.levels.support !== 'N/A') {
    supportEl.textContent = '$' + signal.levels.support;
  }
  
  const supportDistEl = document.getElementById('support-distance');
  if (supportDistEl) {
    supportDistEl.textContent = signal.metrics.supportDistance + '% below';
  }
  
  // Update resistance
  const resistanceEl = document.getElementById('resistance-value');
  if (resistanceEl && signal.levels.resistance !== 'N/A') {
    resistanceEl.textContent = '$' + signal.levels.resistance;
  }
  
  const resistanceDistEl = document.getElementById('resistance-distance');
  if (resistanceDistEl) {
    resistanceDistEl.textContent = signal.metrics.resistanceDistance + '% above';
  }
  
  // Update reasoning list
  const reasoningListEl = document.getElementById('reasoning-list');
  if (reasoningListEl) {
    let reasoningHTML = '';
    for (let i = 0; i < signal.reasoning.length; i++) {
      reasoningHTML += '<div style="display:flex;align-items:start;gap:12px;padding:12px;background:rgba(59,130,246,0.05);border-radius:8px;margin-bottom:8px;">';
      reasoningHTML += '<div style="min-width:24px;height:24px;background:#3b82f6;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;">' + (i + 1) + '</div>';
      reasoningHTML += '<div style="flex:1;color:#e0e6ed;font-size:14px;">' + signal.reasoning[i] + '</div>';
      reasoningHTML += '</div>';
    }
    reasoningListEl.innerHTML = reasoningHTML;
  }
  
  // Update metrics
  const momentumEl = document.getElementById('metric-momentum');
  if (momentumEl) {
    momentumEl.textContent = signal.metrics.momentum + '%';
    momentumEl.style.color = parseFloat(signal.metrics.momentum) > 0 ? '#10b981' : '#ef4444';
  }
  
  const pcRatioEl = document.getElementById('metric-pcratio');
  if (pcRatioEl) pcRatioEl.textContent = signal.metrics.pcRatio;
  
  const netGexEl = document.getElementById('metric-netgex');
  if (netGexEl) {
    const netGex = signal.metrics.netGEX;
    netGexEl.textContent = (netGex >= 0 ? '+' : '') + (netGex / 1e9).toFixed(2) + 'B';
    netGexEl.style.color = netGex >= 0 ? '#10b981' : '#ef4444';
  }
}
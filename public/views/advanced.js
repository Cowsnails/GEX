// public/views/advanced.js - Advanced Analytics View Component

export function renderAdvancedAnalytics() {
  const analytics = window.getAdvancedAnalytics ? window.getAdvancedAnalytics() : null;
  
  if (!analytics) {
    return `
      <div style="text-align:center;padding:50px;color:#9ca3af;">
        <div style="font-size:48px;margin-bottom:20px;">⚡</div>
        <div style="font-size:20px;margin-bottom:10px;">Advanced Analytics Loading...</div>
        <div style="font-size:14px;">Analyzing market microstructure</div>
      </div>
    `;
  }
  
  const { dealerFlow, ivSkew, priceAcceleration, gammaFlipZone } = analytics;
  
  return `
    <div class="advanced-analytics-container">
      
      <!-- Header -->
      <div class="advanced-header">
        <div class="advanced-title">
          <span class="title-icon">🔬</span>
          <span>Advanced Market Analytics</span>
        </div>
        <div class="advanced-subtitle">Institutional-grade market microstructure analysis</div>
      </div>
      
      <!-- 4-Panel Grid -->
      <div class="analytics-grid">
        
        <!-- Panel 1: Dealer Delta-Hedging Flow -->
        <div class="analytics-panel">
          <div class="panel-header">
            <div class="panel-icon">💹</div>
            <div class="panel-title">Dealer Delta-Hedging Flow</div>
          </div>
          
          ${dealerFlow ? `
            <div class="flow-hero" style="border-color: ${dealerFlow.regimeColor};">
              <div class="flow-direction" style="color: ${dealerFlow.regimeColor};">
                ${dealerFlow.flowDirection}
              </div>
              <div class="flow-regime">${dealerFlow.regime}</div>
            </div>
            
            <div class="metric-row">
              <div class="metric-item">
                <div class="metric-label">Flow Intensity</div>
                <div class="metric-value">${dealerFlow.flowIntensity}%</div>
                <div class="metric-bar">
                  <div class="metric-bar-fill" style="width: ${dealerFlow.flowIntensity}%; background: ${dealerFlow.regimeColor};"></div>
                </div>
              </div>
            </div>
            
            <div class="metric-grid-2">
              <div class="stat-box-mini">
                <div class="stat-label-mini">Estimated Shares</div>
                <div class="stat-value-mini">${dealerFlow.estimatedShares.toLocaleString()}</div>
              </div>
              <div class="stat-box-mini">
                <div class="stat-label-mini">Price Change</div>
                <div class="stat-value-mini" style="color: ${dealerFlow.priceChange >= 0 ? '#10b981' : '#ef4444'};">
                  ${dealerFlow.priceChange >= 0 ? '+' : ''}${dealerFlow.priceChangePercent.toFixed(2)}%
                </div>
              </div>
            </div>
            
            <div class="info-box">
              <div class="info-title">📊 What This Means</div>
              <div class="info-text">
                Market makers are ${dealerFlow.flowDirection.toLowerCase()} approximately 
                <strong>${dealerFlow.estimatedShares.toLocaleString()} shares</strong> to hedge their options book. 
                This creates ${dealerFlow.flowDirection === 'BUYING' ? 'supportive' : 'resistive'} pressure.
              </div>
            </div>
            
            <div class="detail-metrics">
              <div class="detail-row">
                <span class="detail-label">Net Dealer Delta:</span>
                <span class="detail-value">${dealerFlow.netDealerDelta.toFixed(0)}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Call Exposure:</span>
                <span class="detail-value">${dealerFlow.callDeltaExposure.toFixed(0)}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Put Exposure:</span>
                <span class="detail-value">${dealerFlow.putDeltaExposure.toFixed(0)}</span>
              </div>
            </div>
          ` : '<div class="no-data">Calculating flow...</div>'}
        </div>
        
        <!-- Panel 2: IV Skew Scanner -->
        <div class="analytics-panel">
          <div class="panel-header">
            <div class="panel-icon">📈</div>
            <div class="panel-title">IV Skew Scanner</div>
          </div>
          
          ${ivSkew ? `
            <div class="skew-hero" style="border-color: ${ivSkew.skewColor};">
              <div class="skew-signal" style="color: ${ivSkew.skewColor};">
                ${ivSkew.skewSignal}
              </div>
              <div class="skew-message">${ivSkew.skewMessage}</div>
            </div>
            
            <div class="metric-grid-2">
              <div class="stat-box-mini">
                <div class="stat-label-mini">Put Skew</div>
                <div class="stat-value-mini" style="color: ${parseFloat(ivSkew.putSkewPercent) > 10 ? '#ef4444' : '#10b981'};">
                  ${ivSkew.putSkewPercent}%
                </div>
              </div>
              <div class="stat-box-mini">
                <div class="stat-label-mini">Call Skew</div>
                <div class="stat-value-mini" style="color: ${parseFloat(ivSkew.callSkewPercent) > 8 ? '#10b981' : '#6b7280'};">
                  ${ivSkew.callSkewPercent}%
                </div>
              </div>
            </div>
            
            <div class="iv-grid">
              <div class="iv-row">
                <span class="iv-label">ATM Calls:</span>
                <span class="iv-value">${ivSkew.atmCallIV}%</span>
              </div>
              <div class="iv-row">
                <span class="iv-label">ATM Puts:</span>
                <span class="iv-value">${ivSkew.atmPutIV}%</span>
              </div>
              <div class="iv-row">
                <span class="iv-label">OTM Calls:</span>
                <span class="iv-value">${ivSkew.otmCallIV}%</span>
              </div>
              <div class="iv-row">
                <span class="iv-label">OTM Puts:</span>
                <span class="iv-value">${ivSkew.otmPutIV}%</span>
              </div>
            </div>
            
            <div class="info-box">
              <div class="info-title">🎯 Interpretation</div>
              <div class="info-text">
                ${ivSkew.skewSignal === 'FEAR' ? 
                  'Elevated put skew indicates traders are paying premium for downside protection.' :
                ivSkew.skewSignal === 'GREED' ?
                  'Elevated call skew suggests strong demand for upside exposure.' :
                ivSkew.skewSignal === 'COMPLACENT' ?
                  'Calls trading at premium to puts - market complacency detected.' :
                  'Flat volatility structure suggests uncertainty about direction.'
                }
              </div>
            </div>
          ` : '<div class="no-data">Calculating skew...</div>'}
        </div>
        
        <!-- Panel 3: Price Acceleration Meter -->
        <div class="analytics-panel">
          <div class="panel-header">
            <div class="panel-icon">🚀</div>
            <div class="panel-title">Price Acceleration Meter</div>
          </div>
          
          ${priceAcceleration ? `
            <div class="accel-hero" style="border-color: ${priceAcceleration.momentumColor};">
              <div class="accel-state" style="color: ${priceAcceleration.momentumColor};">
                ${priceAcceleration.momentumState}
              </div>
              <div class="accel-message">${priceAcceleration.momentumMessage}</div>
            </div>
            
            <div class="gauge-container">
              <div class="gauge-label">Velocity Score</div>
              <div class="gauge">
                <div class="gauge-fill" style="width: ${priceAcceleration.velocityScore}%; background: linear-gradient(90deg, #3b82f6, #10b981);"></div>
              </div>
              <div class="gauge-value">${priceAcceleration.velocityScore}/100</div>
            </div>
            
            <div class="gauge-container">
              <div class="gauge-label">Acceleration Score</div>
              <div class="gauge">
                <div class="gauge-fill" style="width: ${priceAcceleration.accelScore}%; background: linear-gradient(90deg, #f59e0b, #ef4444);"></div>
              </div>
              <div class="gauge-value">${priceAcceleration.accelScore}/100</div>
            </div>
            
            <div class="metric-grid-2">
              <div class="stat-box-mini">
                <div class="stat-label-mini">Persistence</div>
                <div class="stat-value-mini">${priceAcceleration.persistence}%</div>
              </div>
              <div class="stat-box-mini">
                <div class="stat-label-mini">Jerk Signal</div>
                <div class="stat-value-mini">${priceAcceleration.jerkSignal}</div>
              </div>
            </div>
            
            <div class="info-box">
              <div class="info-title">⚡ Momentum Analysis</div>
              <div class="info-text">
                ${priceAcceleration.isAccelerating ? 
                  `Momentum is <strong>accelerating</strong> ${priceAcceleration.isPositive ? 'upward' : 'downward'}. ` :
                  `Momentum is <strong>decelerating</strong> - watch for potential reversal. `
                }
                Trend has persisted for ${priceAcceleration.persistence}% of recent history.
              </div>
            </div>
            
            <div class="detail-metrics">
              <div class="detail-row">
                <span class="detail-label">Velocity:</span>
                <span class="detail-value">${priceAcceleration.velocityPercent}%</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Direction:</span>
                <span class="detail-value">${priceAcceleration.isPositive ? '↗️ UP' : '↘️ DOWN'}</span>
              </div>
            </div>
          ` : '<div class="no-data">Calculating acceleration...</div>'}
        </div>
        
        <!-- Panel 4: Gamma Flip Zone Detector -->
        <div class="analytics-panel">
          <div class="panel-header">
            <div class="panel-icon">🎯</div>
            <div class="panel-title">Gamma Flip Zone Detector</div>
          </div>
          
          ${gammaFlipZone ? `
            <div class="flip-hero" style="border-color: ${gammaFlipZone.regimeColor};">
              <div class="flip-regime" style="color: ${gammaFlipZone.regimeColor};">
                ${gammaFlipZone.regime}
              </div>
              <div class="flip-level">Zero Gamma: $${gammaFlipZone.zeroGammaLevel.toFixed(2)}</div>
              <div class="flip-distance">${gammaFlipZone.distancePercent}% ${gammaFlipZone.isAboveZeroGamma ? 'above' : 'below'}</div>
            </div>
            
            <div class="metric-row">
              <div class="metric-item">
                <div class="metric-label">Flip Risk</div>
                <div class="metric-value">${gammaFlipZone.flipRisk}%</div>
                <div class="metric-bar">
                  <div class="metric-bar-fill" style="width: ${gammaFlipZone.flipRisk}%; background: ${gammaFlipZone.flipRisk > 70 ? '#ef4444' : gammaFlipZone.flipRisk > 40 ? '#f59e0b' : '#10b981'};"></div>
                </div>
              </div>
            </div>
            
            <div class="metric-grid-2">
              <div class="stat-box-mini">
                <div class="stat-label-mini">Volatility Outlook</div>
                <div class="stat-value-mini">${gammaFlipZone.volatilityExpectation}</div>
              </div>
              <div class="stat-box-mini">
                <div class="stat-label-mini">Dealer Behavior</div>
                <div class="stat-value-mini">${gammaFlipZone.dealerBehavior}</div>
              </div>
            </div>
            
            ${gammaFlipZone.nearestFlip ? `
              <div class="flip-zones">
                <div class="flip-zone-title">📍 Nearest Flip Zones</div>
                ${gammaFlipZone.flipZones.slice(0, 3).map(zone => `
                  <div class="flip-zone-item">
                    <div class="flip-zone-price">$${zone.price.toFixed(2)}</div>
                    <div class="flip-zone-type">${zone.type}</div>
                    <div class="flip-zone-dist">${zone.distancePercent.toFixed(1)}% away</div>
                  </div>
                `).join('')}
              </div>
            ` : ''}
            
            <div class="info-box">
              <div class="info-title">🛡️ Market Regime</div>
              <div class="info-text">
                ${gammaFlipZone.regimeDescription}
              </div>
            </div>
          ` : '<div class="no-data">Calculating gamma zones...</div>'}
        </div>
        
      </div>
      
      <!-- Bottom Summary Bar -->
      <div class="analytics-summary">
        <div class="summary-title">⚡ Real-Time Market Insights</div>
        <div class="summary-items">
          ${dealerFlow ? `
            <div class="summary-item">
              <span class="summary-label">Dealer Flow:</span>
              <span class="summary-value" style="color: ${dealerFlow.regimeColor};">${dealerFlow.regime}</span>
            </div>
          ` : ''}
          ${ivSkew ? `
            <div class="summary-item">
              <span class="summary-label">Skew:</span>
              <span class="summary-value" style="color: ${ivSkew.skewColor};">${ivSkew.skewSignal}</span>
            </div>
          ` : ''}
          ${priceAcceleration ? `
            <div class="summary-item">
              <span class="summary-label">Momentum:</span>
              <span class="summary-value" style="color: ${priceAcceleration.momentumColor};">${priceAcceleration.momentumState}</span>
            </div>
          ` : ''}
          ${gammaFlipZone ? `
            <div class="summary-item">
              <span class="summary-label">Regime:</span>
              <span class="summary-value" style="color: ${gammaFlipZone.regimeColor};">${gammaFlipZone.regime}</span>
            </div>
          ` : ''}
        </div>
      </div>
      
    </div>
    
    <style>
      .advanced-analytics-container {
        padding: 0;
      }
      
      .advanced-header {
        margin-bottom: 32px;
        padding-bottom: 24px;
        border-bottom: 2px solid #3d4a5c;
      }
      
      .advanced-title {
        font-size: 36px;
        font-weight: 700;
        color: #fff;
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 8px;
      }
      
      .title-icon {
        font-size: 42px;
      }
      
      .advanced-subtitle {
        font-size: 15px;
        color: #9ca3af;
        font-weight: 500;
      }
      
      .analytics-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 24px;
        margin-bottom: 24px;
      }
      
      .analytics-panel {
        background: linear-gradient(135deg, #1a2332 0%, #151b2e 100%);
        border: 2px solid #3d4a5c;
        border-radius: 16px;
        padding: 28px;
        position: relative;
        overflow: hidden;
      }
      
      .analytics-panel::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 4px;
        height: 100%;
        background: linear-gradient(180deg, #3b82f6, #8b5cf6);
        border-radius: 16px 0 0 16px;
      }
      
      .panel-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 24px;
        padding-bottom: 16px;
        border-bottom: 1px solid #2a3547;
      }
      
      .panel-icon {
        font-size: 32px;
      }
      
      .panel-title {
        font-size: 18px;
        font-weight: 700;
        color: #fff;
      }
      
      .flow-hero, .skew-hero, .accel-hero, .flip-hero {
        background: rgba(59, 130, 246, 0.05);
        border: 2px solid;
        border-radius: 12px;
        padding: 24px;
        text-align: center;
        margin-bottom: 24px;
      }
      
      .flow-direction, .skew-signal, .accel-state, .flip-regime {
        font-size: 28px;
        font-weight: 900;
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      
      .flow-regime, .skew-message, .accel-message {
        font-size: 14px;
        color: #9ca3af;
        font-weight: 600;
      }
      
      .flip-level {
        font-size: 20px;
        font-weight: 700;
        color: #fff;
        margin-bottom: 4px;
      }
      
      .flip-distance {
        font-size: 13px;
        color: #9ca3af;
        font-weight: 600;
      }
      
      .metric-row {
        margin-bottom: 20px;
      }
      
      .metric-item {
        background: rgba(59, 130, 246, 0.05);
        border-radius: 8px;
        padding: 16px;
      }
      
      .metric-label {
        font-size: 12px;
        color: #9ca3af;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-weight: 600;
        margin-bottom: 8px;
      }
      
      .metric-value {
        font-size: 24px;
        font-weight: 700;
        color: #fff;
        margin-bottom: 12px;
      }
      
      .metric-bar {
        width: 100%;
        height: 8px;
        background: #2a3547;
        border-radius: 4px;
        overflow: hidden;
      }
      
      .metric-bar-fill {
        height: 100%;
        border-radius: 4px;
        transition: width 0.3s ease;
      }
      
      .metric-grid-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 20px;
      }
      
      .stat-box-mini {
        background: rgba(59, 130, 246, 0.05);
        border: 1px solid #2a3547;
        border-radius: 8px;
        padding: 16px;
        text-align: center;
      }
      
      .stat-label-mini {
        font-size: 11px;
        color: #9ca3af;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-weight: 600;
        margin-bottom: 8px;
      }
      
      .stat-value-mini {
        font-size: 20px;
        font-weight: 700;
        color: #fff;
      }
      
      .info-box {
        background: rgba(59, 130, 246, 0.1);
        border: 1px solid #3b82f6;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 16px;
      }
      
      .info-title {
        font-size: 13px;
        font-weight: 700;
        color: #3b82f6;
        margin-bottom: 8px;
      }
      
      .info-text {
        font-size: 13px;
        color: #e0e6ed;
        line-height: 1.6;
      }
      
      .detail-metrics {
        background: rgba(10, 14, 39, 0.6);
        border-radius: 8px;
        padding: 12px;
      }
      
      .detail-row {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid #2a3547;
        font-size: 13px;
      }
      
      .detail-row:last-child {
        border-bottom: none;
      }
      
      .detail-label {
        color: #9ca3af;
      }
      
      .detail-value {
        color: #fff;
        font-weight: 600;
      }
      
      .iv-grid {
        background: rgba(10, 14, 39, 0.6);
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 20px;
      }
      
      .iv-row {
        display: flex;
        justify-content: space-between;
        padding: 10px 0;
        border-bottom: 1px solid #2a3547;
        font-size: 13px;
      }
      
      .iv-row:last-child {
        border-bottom: none;
      }
      
      .iv-label {
        color: #9ca3af;
        font-weight: 500;
      }
      
      .iv-value {
        color: #fff;
        font-weight: 700;
      }
      
      .gauge-container {
        margin-bottom: 20px;
      }
      
      .gauge-label {
        font-size: 12px;
        color: #9ca3af;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-weight: 600;
        margin-bottom: 8px;
      }
      
      .gauge {
        width: 100%;
        height: 32px;
        background: #2a3547;
        border-radius: 16px;
        overflow: hidden;
        margin-bottom: 8px;
        position: relative;
      }
      
      .gauge-fill {
        height: 100%;
        border-radius: 16px;
        transition: width 0.3s ease;
      }
      
      .gauge-value {
        text-align: right;
        font-size: 14px;
        font-weight: 700;
        color: #fff;
      }
      
      .flip-zones {
        background: rgba(10, 14, 39, 0.6);
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 16px;
      }
      
      .flip-zone-title {
        font-size: 12px;
        color: #9ca3af;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-weight: 600;
        margin-bottom: 12px;
      }
      
      .flip-zone-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px;
        background: rgba(59, 130, 246, 0.05);
        border-radius: 6px;
        margin-bottom: 8px;
      }
      
      .flip-zone-item:last-child {
        margin-bottom: 0;
      }
      
      .flip-zone-price {
        font-size: 16px;
        font-weight: 700;
        color: #fff;
      }
      
      .flip-zone-type {
        font-size: 11px;
        color: #3b82f6;
        font-weight: 600;
        text-transform: uppercase;
      }
      
      .flip-zone-dist {
        font-size: 12px;
        color: #9ca3af;
      }
      
      .analytics-summary {
        background: linear-gradient(135deg, #1a2332 0%, #151b2e 100%);
        border: 2px solid #3b82f6;
        border-radius: 12px;
        padding: 24px;
      }
      
      .summary-title {
        font-size: 18px;
        font-weight: 700;
        color: #fff;
        margin-bottom: 16px;
      }
      
      .summary-items {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 20px;
      }
      
      .summary-item {
        text-align: center;
        padding: 12px;
        background: rgba(59, 130, 246, 0.05);
        border-radius: 8px;
      }
      
      .summary-label {
        display: block;
        font-size: 11px;
        color: #9ca3af;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-weight: 600;
        margin-bottom: 6px;
      }
      
      .summary-value {
        display: block;
        font-size: 14px;
        font-weight: 700;
      }
      
      .no-data {
        text-align: center;
        padding: 40px;
        color: #6b7280;
        font-size: 14px;
      }
    </style>
  `;
}

// Live update function (updates values without re-rendering)
export function updateAdvancedLive() {
  // This function would update only the dynamic values
  // Similar pattern to other view updates
  const analytics = window.getAdvancedAnalytics ? window.getAdvancedAnalytics() : null;
  if (!analytics) return;
  
  // Update could be implemented here for smooth transitions
  // For now, the view will re-render on data changes
}
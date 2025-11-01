// public/analysis/signals.js - COMPLETE AI Trade Signal Analyzer with Zero Gamma Logic

export function analyzeTradeSignal() {
  // 🔥 FIX: Return fallback signal when market is closed (no data)
  if (!window.appState.optionsData.length || !window.appState.stockData) {
    return {
      action: 'WAIT',
      confidence: 0,
      reasoning: ['Market Closed - No Data Available'],
      metrics: {
        momentum: 'N/A',
        pcRatio: 'N/A',
        resistanceDistance: 'N/A',
        supportDistance: 'N/A',
        netGEX: 0,
        zeroGamma: 'N/A',
        regime: 'N/A'
      },
      levels: {
        resistance: 'N/A',
        support: 'N/A',
        zeroGamma: null
      },
      isNoData: true  // Flag to indicate this is placeholder data
    };
  }

  const price = window.appState.stockData.price;
  const gex = window.calculateGEX();

  if (!gex) {
    return {
      action: 'WAIT',
      confidence: 0,
      reasoning: ['Calculating GEX...'],
      metrics: {
        momentum: 'N/A',
        pcRatio: 'N/A',
        resistanceDistance: 'N/A',
        supportDistance: 'N/A',
        netGEX: 0,
        zeroGamma: 'N/A',
        regime: 'N/A'
      },
      levels: {
        resistance: 'N/A',
        support: 'N/A',
        zeroGamma: null
      },
      isNoData: true
    };
  }

  const momentum = window.appState.priceHistory.length >= 10
    ? ((window.appState.priceHistory[window.appState.priceHistory.length - 1] - window.appState.priceHistory[0]) / window.appState.priceHistory[0]) * 100
    : 0;
  
  // 🚀 Calculate P/C ratio using volume if available, otherwise use open_interest
  let callVolume = 0;
  let putVolume = 0;
  let callOI = 0;
  let putOI = 0;

  for (let i = 0; i < window.appState.optionsData.length; i++) {
    const opt = window.appState.optionsData[i];
    if (opt.right === 'C') {
      callVolume += opt.bid_size + opt.ask_size;
      callOI += opt.open_interest || 0;
    } else {
      putVolume += opt.bid_size + opt.ask_size;
      putOI += opt.open_interest || 0;
    }
  }

  // Use volume-based P/C ratio if sizes are available, otherwise fall back to OI-based ratio
  let pcRatio = 0;
  if (callVolume > 0 && putVolume > 0) {
    pcRatio = putVolume / callVolume;
  } else if (callOI > 0) {
    // Fallback to open_interest-based P/C ratio (more stable, less noisy)
    pcRatio = putOI / callOI;
    console.log('📊 Using OI-based P/C ratio (volume data unavailable in optimized mode)');
  }
  
  const nearestResistance = gex.callWall;
  const nearestSupport = gex.putWall;
  
  const resistanceDistance = nearestResistance ? ((nearestResistance - price) / price) * 100 : 999;
  const supportDistance = nearestSupport ? ((price - nearestSupport) / price) * 100 : 999;
  
  let zgContext = '';
  if (gex.zeroGammaLevel) {
    zgContext = gex.isAboveZeroGamma 
      ? 'Price above zero gamma (dealers stabilizing)' 
      : 'Price below zero gamma (dealers destabilizing)';
  }
  
  let action = 'WAIT';
  let confidence = 50;
  let reasoning = [];
  
  // SIGNAL 1: Strong bullish signal in stabilizing regime
  if (gex.isAboveZeroGamma && momentum > 0.5 && pcRatio < 0.8 && supportDistance > 1.5) {
    action = 'BUY';
    confidence = 85;
    reasoning = [
      'Strong upward momentum in stabilizing regime',
      zgContext,
      'Low put/call ratio (' + pcRatio.toFixed(2) + ') shows bullish sentiment',
      'Price well above support at $' + nearestSupport
    ];
  }
  // SIGNAL 2: Bounce play at support
  else if (supportDistance < 1 && momentum < 0.5) {
    action = 'BUY';
    confidence = 75;
    reasoning = [
      'Price approaching major support at $' + nearestSupport,
      'Put wall with $' + (gex.putWallGEX / 1e9).toFixed(2) + 'B GEX provides strong floor',
      zgContext,
      'Favorable risk/reward for bounce play'
    ];
  }
  // SIGNAL 3: Strong bearish signal in destabilizing regime
  else if (!gex.isAboveZeroGamma && momentum < -0.5 && pcRatio > 1.2) {
    action = 'SELL';
    confidence = 85;
    reasoning = [
      'Downward momentum in destabilizing regime',
      zgContext,
      'High put/call ratio (' + pcRatio.toFixed(2) + ') shows bearish sentiment',
      'Dealers will amplify moves below zero gamma'
    ];
  }
  // SIGNAL 4: Rejection at resistance
  else if (resistanceDistance < 1 && momentum > -0.5) {
    action = 'SELL';
    confidence = 75;
    reasoning = [
      'Price approaching resistance at $' + nearestResistance,
      'Call wall with $' + (gex.callWallGEX / 1e9).toFixed(2) + 'B GEX acts as ceiling',
      zgContext,
      'High probability of rejection - take profits'
    ];
  }
  // SIGNAL 5: Consolidation / Wait
  else {
    action = 'WAIT';
    confidence = 50;
    reasoning = [
      'Market consolidating between support and resistance',
      zgContext,
      'No clear directional bias - wait for breakout',
      'Current range: $' + nearestSupport + ' - $' + nearestResistance
    ];
  }
  
  return {
    action: action,
    confidence: confidence,
    reasoning: reasoning,
    metrics: {
      momentum: momentum.toFixed(2),
      pcRatio: pcRatio.toFixed(2),
      resistanceDistance: resistanceDistance.toFixed(2),
      supportDistance: supportDistance.toFixed(2),
      netGEX: gex.netGEX,
      zeroGamma: gex.zeroGammaLevel ? gex.zeroGammaLevel.toFixed(2) : 'N/A',
      regime: gex.isAboveZeroGamma ? 'Stabilizing' : 'Destabilizing'
    },
    levels: {
      resistance: nearestResistance || 'N/A',
      support: nearestSupport || 'N/A',
      zeroGamma: gex.zeroGammaLevel || null
    }
  };
}
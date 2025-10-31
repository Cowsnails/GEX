// public/analysis/advanced-analytics.js - Advanced Market Analytics Engine
// Dealer Delta-Hedging Flow, IV Skew, Price Acceleration, Gamma Flip Zone

/**
 * Calculate Dealer Delta-Hedging Flow
 * Shows real-time hedging pressure from market makers
 * Positive = dealers buying (bullish pressure)
 * Negative = dealers selling (bearish pressure)
 */
export function calculateDealerFlow() {
  const { optionsData, stockData, priceHistory } = window.appState;
  
  if (!optionsData.length || !stockData || priceHistory.length < 10) {
    return null;
  }
  
  const spot = stockData.price;
  const prevPrice = priceHistory[priceHistory.length - 2] || spot;
  const priceChange = spot - prevPrice;
  const priceChangePercent = (priceChange / prevPrice) * 100;
  
  // Calculate total dealer delta exposure
  let totalCallDelta = 0;
  let totalPutDelta = 0;
  let totalCallOI = 0;
  let totalPutOI = 0;
  
  for (let i = 0; i < optionsData.length; i++) {
    const opt = optionsData[i];
    const delta = opt.delta || 0;
    const oi = opt.open_interest || 0;
    const gamma = opt.gamma || 0;
    
    if (opt.right === 'C') {
      totalCallDelta += Math.abs(delta) * oi;
      totalCallOI += oi;
    } else {
      totalPutDelta += Math.abs(delta) * oi;
      totalPutOI += oi;
    }
  }
  
  // Net dealer position (negative = dealers are short)
  const netDealerDelta = -(totalCallDelta - totalPutDelta);
  
  // Hedging flow = price change * net delta exposure * 100 shares per contract
  const hedgingFlow = priceChange * netDealerDelta * 100;
  const flowDirection = hedgingFlow > 0 ? 'BUYING' : 'SELLING';
  const flowMagnitude = Math.abs(hedgingFlow);
  
  // Calculate flow intensity (normalized 0-100)
  const maxFlow = Math.max(totalCallDelta, totalPutDelta) * Math.abs(priceChange) * 100;
  const flowIntensity = maxFlow > 0 ? Math.min(100, (flowMagnitude / maxFlow) * 100) : 0;
  
  // Estimate shares being hedged
  const estimatedShares = Math.abs(netDealerDelta * priceChangePercent * 0.01);
  
  // Calculate flow acceleration (change in flow over last 5 ticks)
  const recentPrices = priceHistory.slice(-5);
  let flowAcceleration = 0;
  if (recentPrices.length >= 3) {
    const oldChange = recentPrices[1] - recentPrices[0];
    const newChange = recentPrices[recentPrices.length - 1] - recentPrices[recentPrices.length - 2];
    flowAcceleration = newChange - oldChange;
  }
  
  // Determine flow regime
  let regime = 'NEUTRAL';
  let regimeColor = '#6b7280';
  
  if (flowIntensity > 70) {
    regime = flowDirection === 'BUYING' ? 'STRONG BUY PRESSURE' : 'STRONG SELL PRESSURE';
    regimeColor = flowDirection === 'BUYING' ? '#10b981' : '#ef4444';
  } else if (flowIntensity > 40) {
    regime = flowDirection === 'BUYING' ? 'MODERATE BUY' : 'MODERATE SELL';
    regimeColor = flowDirection === 'BUYING' ? '#3b82f6' : '#f59e0b';
  }
  
  return {
    hedgingFlow: hedgingFlow,
    flowDirection: flowDirection,
    flowIntensity: Math.round(flowIntensity),
    estimatedShares: Math.round(estimatedShares),
    netDealerDelta: netDealerDelta,
    flowAcceleration: flowAcceleration,
    regime: regime,
    regimeColor: regimeColor,
    priceChange: priceChange,
    priceChangePercent: priceChangePercent,
    callDeltaExposure: totalCallDelta,
    putDeltaExposure: totalPutDelta,
    timestamp: Date.now()
  };
}

/**
 * IV Skew Scanner
 * Analyzes implied volatility across strikes
 * Detects unusual skew patterns indicating directional bias
 */
export function calculateIVSkew() {
  const { optionsData, stockData } = window.appState;
  
  if (!optionsData.length || !stockData) {
    return null;
  }
  
  const spot = stockData.price;
  
  // Separate calls and puts
  const calls = optionsData.filter(opt => opt.right === 'C');
  const puts = optionsData.filter(opt => opt.right === 'P');
  
  // Find ATM, OTM, and ITM options
  const atmRange = spot * 0.02; // Within 2% of spot
  
  const atmCalls = calls.filter(opt => Math.abs(opt.strike - spot) <= atmRange);
  const otmCalls = calls.filter(opt => opt.strike > spot + atmRange);
  const itmCalls = calls.filter(opt => opt.strike < spot - atmRange);
  
  const atmPuts = puts.filter(opt => Math.abs(opt.strike - spot) <= atmRange);
  const otmPuts = puts.filter(opt => opt.strike < spot - atmRange);
  const itmPuts = puts.filter(opt => opt.strike > spot + atmRange);
  
  // Calculate average IV for each category
  const avgIV = (opts) => {
    if (!opts.length) return 0;
    const sum = opts.reduce((acc, opt) => acc + (opt.iv || 0), 0);
    return sum / opts.length;
  };
  
  const atmCallIV = avgIV(atmCalls);
  const atmPutIV = avgIV(atmPuts);
  const otmCallIV = avgIV(otmCalls);
  const otmPutIV = avgIV(otmPuts);
  const itmCallIV = avgIV(itmCalls);
  const itmPutIV = avgIV(itmPuts);
  
  // Calculate skew metrics
  const putSkew = otmPutIV - atmPutIV; // Positive = fear (normal)
  const callSkew = otmCallIV - atmCallIV; // Positive = greed (unusual)
  const atmSkew = atmPutIV - atmCallIV; // Put/Call parity
  
  // Normalize skews to percentage
  const putSkewPercent = atmPutIV > 0 ? (putSkew / atmPutIV) * 100 : 0;
  const callSkewPercent = atmCallIV > 0 ? (callSkew / atmCallIV) * 100 : 0;
  
  // Detect skew anomalies
  let skewSignal = 'NEUTRAL';
  let skewColor = '#6b7280';
  let skewMessage = 'Normal volatility structure';
  
  if (putSkewPercent > 15) {
    skewSignal = 'FEAR';
    skewColor = '#ef4444';
    skewMessage = 'Elevated put skew - downside protection demand';
  } else if (callSkewPercent > 10) {
    skewSignal = 'GREED';
    skewColor = '#10b981';
    skewMessage = 'Elevated call skew - upside demand';
  } else if (atmSkew < -0.05) {
    skewSignal = 'COMPLACENT';
    skewColor = '#f59e0b';
    skewMessage = 'Calls more expensive than puts - low fear';
  } else if (putSkewPercent < 5) {
    skewSignal = 'FLAT';
    skewColor = '#3b82f6';
    skewMessage = 'Unusually flat skew - uncertainty';
  }
  
  // Calculate skew term structure (near vs far dated)
  const nearDated = optionsData.filter(opt => opt.iv > 0);
  const avgNearIV = avgIV(nearDated);
  
  // Build skew profile for visualization
  const skewProfile = [];
  const strikeStep = spot * 0.01;
  
  for (let strike = spot * 0.90; strike <= spot * 1.10; strike += strikeStep) {
    const callsAtStrike = calls.filter(opt => Math.abs(opt.strike - strike) < strikeStep);
    const putsAtStrike = puts.filter(opt => Math.abs(opt.strike - strike) < strikeStep);
    
    if (callsAtStrike.length > 0 || putsAtStrike.length > 0) {
      skewProfile.push({
        strike: strike,
        callIV: avgIV(callsAtStrike),
        putIV: avgIV(putsAtStrike),
        moneyness: ((strike - spot) / spot) * 100
      });
    }
  }
  
  return {
    // Core metrics
    putSkew: putSkew,
    callSkew: callSkew,
    atmSkew: atmSkew,
    putSkewPercent: putSkewPercent.toFixed(1),
    callSkewPercent: callSkewPercent.toFixed(1),
    
    // Average IVs
    atmCallIV: (atmCallIV * 100).toFixed(1),
    atmPutIV: (atmPutIV * 100).toFixed(1),
    otmCallIV: (otmCallIV * 100).toFixed(1),
    otmPutIV: (otmPutIV * 100).toFixed(1),
    
    // Signal
    skewSignal: skewSignal,
    skewColor: skewColor,
    skewMessage: skewMessage,
    
    // Visualization data
    skewProfile: skewProfile,
    
    timestamp: Date.now()
  };
}

/**
 * Price Acceleration Meter
 * Detects momentum acceleration/deceleration
 * Uses velocity and jerk (rate of change of acceleration)
 */
export function calculatePriceAcceleration() {
  const { priceHistory, stockData } = window.appState;
  
  if (priceHistory.length < 20 || !stockData) {
    return null;
  }
  
  const spot = stockData.price;
  
  // Calculate velocity (1st derivative) - last 10 ticks
  const recentPrices = priceHistory.slice(-10);
  const velocities = [];
  
  for (let i = 1; i < recentPrices.length; i++) {
    const velocity = recentPrices[i] - recentPrices[i - 1];
    velocities.push(velocity);
  }
  
  const avgVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
  const velocityPercent = (avgVelocity / spot) * 100;
  
  // Calculate acceleration (2nd derivative)
  const accelerations = [];
  
  for (let i = 1; i < velocities.length; i++) {
    const accel = velocities[i] - velocities[i - 1];
    accelerations.push(accel);
  }
  
  const avgAcceleration = accelerations.reduce((a, b) => a + b, 0) / accelerations.length;
  
  // Calculate jerk (3rd derivative - rate of change of acceleration)
  const jerks = [];
  
  for (let i = 1; i < accelerations.length; i++) {
    const jerk = accelerations[i] - accelerations[i - 1];
    jerks.push(jerk);
  }
  
  const avgJerk = jerks.reduce((a, b) => a + b, 0) / jerks.length;
  
  // Normalize metrics to 0-100 scale
  const maxVelocity = Math.max(...velocities.map(Math.abs));
  const velocityScore = maxVelocity > 0 ? Math.min(100, (Math.abs(avgVelocity) / maxVelocity) * 100) : 0;
  
  const maxAccel = Math.max(...accelerations.map(Math.abs));
  const accelScore = maxAccel > 0 ? Math.min(100, (Math.abs(avgAcceleration) / maxAccel) * 100) : 0;
  
  // Determine momentum state
  let momentumState = 'NEUTRAL';
  let momentumColor = '#6b7280';
  let momentumMessage = 'No clear momentum';
  
  if (avgVelocity > 0 && avgAcceleration > 0) {
    momentumState = 'ACCELERATING UP';
    momentumColor = '#10b981';
    momentumMessage = 'Strong upward momentum building';
  } else if (avgVelocity > 0 && avgAcceleration < 0) {
    momentumState = 'DECELERATING UP';
    momentumColor = '#f59e0b';
    momentumMessage = 'Upward momentum slowing - potential reversal';
  } else if (avgVelocity < 0 && avgAcceleration < 0) {
    momentumState = 'ACCELERATING DOWN';
    momentumColor = '#ef4444';
    momentumMessage = 'Strong downward momentum building';
  } else if (avgVelocity < 0 && avgAcceleration > 0) {
    momentumState = 'DECELERATING DOWN';
    momentumColor = '#3b82f6';
    momentumMessage = 'Downward momentum slowing - potential bounce';
  }
  
  // Jerk interpretation (momentum of momentum)
  let jerkSignal = 'STABLE';
  if (Math.abs(avgJerk) > maxAccel * 0.1) {
    if (avgJerk > 0) {
      jerkSignal = 'EXPLOSIVE UP';
    } else {
      jerkSignal = 'EXPLOSIVE DOWN';
    }
  }
  
  // Calculate momentum persistence (how long has current trend lasted)
  let persistenceCount = 0;
  const currentDirection = avgVelocity > 0;
  
  for (let i = velocities.length - 1; i >= 0; i--) {
    if ((velocities[i] > 0) === currentDirection) {
      persistenceCount++;
    } else {
      break;
    }
  }
  
  const persistence = Math.min(100, (persistenceCount / velocities.length) * 100);
  
  return {
    // Core metrics
    velocity: avgVelocity,
    velocityPercent: velocityPercent.toFixed(4),
    acceleration: avgAcceleration,
    jerk: avgJerk,
    
    // Scores (0-100)
    velocityScore: Math.round(velocityScore),
    accelScore: Math.round(accelScore),
    persistence: Math.round(persistence),
    
    // State
    momentumState: momentumState,
    momentumColor: momentumColor,
    momentumMessage: momentumMessage,
    jerkSignal: jerkSignal,
    
    // Trend direction
    isAccelerating: avgAcceleration > 0,
    isPositive: avgVelocity > 0,
    
    // Historical data for charting
    velocityHistory: velocities,
    accelerationHistory: accelerations,
    
    timestamp: Date.now()
  };
}

/**
 * Gamma Flip Zone Detector
 * Identifies price levels where gamma exposure flips sign
 * Critical for predicting volatility regimes
 */
export function calculateGammaFlipZone() {
  const { optionsData, stockData } = window.appState;
  
  if (!optionsData.length || !stockData) {
    return null;
  }
  
  const spot = stockData.price;
  const gex = window.calculateGEX ? window.calculateGEX() : null;
  
  if (!gex || !gex.zeroGammaLevel) {
    return null;
  }
  
  const zeroGamma = gex.zeroGammaLevel;
  const distanceToZG = spot - zeroGamma;
  const distancePercent = (distanceToZG / spot) * 100;
  
  // Calculate GEX at multiple price levels to find flip zones
  const priceRange = [];
  const step = spot * 0.01; // 1% steps
  
  for (let price = spot * 0.85; price <= spot * 1.15; price += step) {
    priceRange.push(price);
  }
  
  const gexProfile = [];
  
  for (let i = 0; i < priceRange.length; i++) {
    const price = priceRange[i];
    let netGEX = 0;
    
    for (let j = 0; j < optionsData.length; j++) {
      const opt = optionsData[j];
      const gamma = opt.gamma || 0;
      const oi = opt.open_interest || 0;
      
      const gex = gamma * oi * price * price;
      netGEX += opt.right === 'C' ? gex : -gex;
    }
    
    gexProfile.push({
      price: price,
      netGEX: netGEX,
      isAboveZero: netGEX > 0
    });
  }
  
  // Find all gamma flip points
  const flipZones = [];
  
  for (let i = 1; i < gexProfile.length; i++) {
    const prev = gexProfile[i - 1];
    const curr = gexProfile[i];
    
    if (prev.isAboveZero !== curr.isAboveZero) {
      flipZones.push({
        price: (prev.price + curr.price) / 2,
        type: curr.isAboveZero ? 'BULLISH FLIP' : 'BEARISH FLIP',
        distance: Math.abs(spot - ((prev.price + curr.price) / 2)),
        distancePercent: (Math.abs(spot - ((prev.price + curr.price) / 2)) / spot) * 100
      });
    }
  }
  
  // Sort by proximity to current price
  flipZones.sort((a, b) => a.distance - b.distance);
  
  // Determine current regime and risk
  const isAboveZG = spot > zeroGamma;
  const regime = isAboveZG ? 'POSITIVE GAMMA' : 'NEGATIVE GAMMA';
  const regimeColor = isAboveZG ? '#10b981' : '#ef4444';
  const regimeDescription = isAboveZG 
    ? 'Dealers are long gamma - stabilizing market (buy dips, sell rips)'
    : 'Dealers are short gamma - destabilizing market (sell dips, buy rips)';
  
  // Calculate flip risk (how close to flipping)
  const nearestFlip = flipZones[0];
  const flipRisk = nearestFlip ? Math.max(0, 100 - nearestFlip.distancePercent * 20) : 0;
  
  // Gamma density (how much gamma near current price)
  const nearbyGamma = optionsData.filter(opt => 
    Math.abs(opt.strike - spot) < spot * 0.05
  ).reduce((sum, opt) => sum + Math.abs(opt.gamma * opt.open_interest), 0);
  
  const gammaDensity = nearbyGamma / optionsData.length;
  
  return {
    // Zero Gamma Level
    zeroGammaLevel: zeroGamma,
    distanceToZG: distanceToZG,
    distancePercent: distancePercent.toFixed(2),
    
    // Current regime
    regime: regime,
    regimeColor: regimeColor,
    regimeDescription: regimeDescription,
    isAboveZeroGamma: isAboveZG,
    
    // Flip zones
    flipZones: flipZones.slice(0, 5), // Top 5 nearest flips
    nearestFlip: nearestFlip,
    flipRisk: Math.round(flipRisk),
    
    // Gamma concentration
    gammaDensity: gammaDensity,
    
    // Profile for visualization
    gexProfile: gexProfile,
    
    // Market implications
    volatilityExpectation: isAboveZG ? 'LOW' : 'HIGH',
    dealerBehavior: isAboveZG ? 'STABILIZING' : 'AMPLIFYING',
    
    timestamp: Date.now()
  };
}

/**
 * Composite Advanced Analytics
 * Combines all four metrics into unified view
 */
export function getAdvancedAnalytics() {
  return {
    dealerFlow: calculateDealerFlow(),
    ivSkew: calculateIVSkew(),
    priceAcceleration: calculatePriceAcceleration(),
    gammaFlipZone: calculateGammaFlipZone(),
    timestamp: Date.now()
  };
}
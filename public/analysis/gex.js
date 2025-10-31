// public/analysis/gex.js - COMPLETE Professional GEX Calculation Engine
// Based on SpotGamma & institutional methodologies

/**
 * Core GEX Formula: Γ × OI × Spot²
 * 
 * For calls: Positive GEX (dealers long gamma, stabilizing)
 * For puts: Negative GEX (dealers short gamma, destabilizing)
 * 
 * Key Metrics:
 * - Net GEX: Total market gamma exposure (calls - puts)
 * - Zero Gamma Level: Price where Net GEX crosses zero (gamma flip point)
 * - Call Wall: Highest positive gamma strike ABOVE price (resistance)
 * - Put Wall: Highest negative gamma strike BELOW price (support)
 * - Absolute Gamma: Total hedging pressure magnitude
 */

export function calculateGEX() {
  const optionsData = window.appState.optionsData;
  const stockData = window.appState.stockData;
  
  if (!optionsData || optionsData.length === 0 || !stockData) {
    return null;
  }
  
  const spot = stockData.price;
  if (!spot || spot <= 0) return null;
  
  console.log('📊 GEX Calculation - Spot: $' + spot.toFixed(2) + ' | Contracts: ' + optionsData.length);
  
  // Step 1: Calculate per-contract GEX with validation
  const contractsWithGEX = [];
  let validContracts = 0;
  let totalGammaCheck = 0;
  let totalOICheck = 0;
  
  for (let i = 0; i < optionsData.length; i++) {
    const option = optionsData[i];
    const gamma = option.gamma || 0;
    const openInterest = option.open_interest || 0;
    
    // GEX Formula: Γ × OI × Spot²
    const gex = gamma * openInterest * spot * spot;
    
    if (gamma !== 0 && openInterest !== 0) {
      validContracts++;
      totalGammaCheck += Math.abs(gamma);
      totalOICheck += openInterest;
    }
    
    contractsWithGEX.push({
      strike: option.strike,
      right: option.right,
      gex: option.right === 'C' ? gex : -gex,
      absGex: Math.abs(gex),
      gamma: gamma,
      open_interest: openInterest,
      delta: option.delta || 0,
      vanna: option.vanna || 0,
      charm: option.charm || 0
    });
  }
  
  console.log('✅ Valid contracts with gamma & OI: ' + validContracts + '/' + optionsData.length);
  
  // Step 2: Aggregate GEX by strike
  const strikeGEX = {};
  for (let i = 0; i < contractsWithGEX.length; i++) {
    const contract = contractsWithGEX[i];
    const strike = contract.strike;
    
    if (!strikeGEX[strike]) {
      strikeGEX[strike] = {
        strike: strike,
        callGEX: 0,
        putGEX: 0,
        totalGEX: 0,
        netGEX: 0,
        callOI: 0,
        putOI: 0
      };
    }
    
    if (contract.right === 'C') {
      strikeGEX[strike].callGEX += contract.gex;
      strikeGEX[strike].callOI += contract.open_interest;
    } else {
      strikeGEX[strike].putGEX += Math.abs(contract.gex);
      strikeGEX[strike].putOI += contract.open_interest;
    }
    
    strikeGEX[strike].netGEX += contract.gex;
    strikeGEX[strike].totalGEX = strikeGEX[strike].callGEX + strikeGEX[strike].putGEX;
  }
  
  const strikes = [];
  for (const key in strikeGEX) {
    strikes.push(strikeGEX[key]);
  }
  
  // Step 3: Calculate aggregate metrics
  let totalCallGEX = 0;
  let totalPutGEX = 0;
  let absoluteGamma = 0;
  
  for (let i = 0; i < contractsWithGEX.length; i++) {
    const contract = contractsWithGEX[i];
    if (contract.right === 'C') {
      totalCallGEX += contract.gex;
    } else {
      totalPutGEX += Math.abs(contract.gex);
    }
    absoluteGamma += contract.absGex;
  }
  
  const netGEX = totalCallGEX - totalPutGEX;
  const totalGEX = totalCallGEX + totalPutGEX;
  
  console.log('💰 Total GEX: $' + (totalGEX / 1e9).toFixed(2) + 'B | Net GEX: ' + (netGEX >= 0 ? '+' : '') + (netGEX / 1e9).toFixed(2) + 'B');
  
  // Step 4: FIXED Call Wall Detection (highest positive GEX ABOVE current price)
  const callWalls = strikes.filter(function(s) { 
    return s.netGEX > 0 && s.strike > spot; 
  });
  callWalls.sort(function(a, b) { return b.netGEX - a.netGEX; });
  const callWallStrike = callWalls[0];
  
  // Step 5: FIXED Put Wall Detection (highest negative GEX BELOW current price)
  const putWalls = strikes.filter(function(s) { 
    return s.netGEX < 0 && s.strike < spot; 
  });
  putWalls.sort(function(a, b) { return a.netGEX - b.netGEX; });
  const putWallStrike = putWalls[0];
  
  if (callWallStrike) {
    console.log('🚧 Call Wall: $' + callWallStrike.strike + ' (Resistance) - GEX: $' + (callWallStrike.netGEX / 1e9).toFixed(2) + 'B');
  }
  if (putWallStrike) {
    console.log('🛡️ Put Wall: $' + putWallStrike.strike + ' (Support) - GEX: $' + (Math.abs(putWallStrike.netGEX) / 1e9).toFixed(2) + 'B');
  }
  
  // Step 6: Calculate Zero Gamma Level (gamma flip point)
  const zeroGammaLevel = calculateZeroGammaLevel(contractsWithGEX, spot);
  
  if (zeroGammaLevel) {
    const zgDistance = ((zeroGammaLevel - spot) / spot * 100);
    console.log('🎯 Zero Gamma Level: $' + zeroGammaLevel.toFixed(2) + ' (' + (zgDistance > 0 ? '+' : '') + zgDistance.toFixed(2) + '% from spot)');
    console.log('   → Price ' + (spot > zeroGammaLevel ? 'ABOVE' : 'BELOW') + ' zero gamma = ' + (spot > zeroGammaLevel ? 'STABILIZING regime' : 'DESTABILIZING regime'));
  }
  
  // Step 7: Identify top GEX strikes for visualization
  strikes.sort(function(a, b) { return Math.abs(b.netGEX) - Math.abs(a.netGEX); });
  const topStrikes = [];
  for (let i = 0; i < Math.min(10, strikes.length); i++) {
    const s = strikes[i];
    topStrikes.push({
      strike: s.strike,
      gex: Math.abs(s.netGEX),
      netGex: s.netGEX,
      type: s.netGEX > 0 ? 'resistance' : 'support',
      callGex: s.callGEX,
      putGex: s.putGEX,
      callOI: s.callOI,
      putOI: s.putOI,
      isAbovePrice: s.strike > spot,
      isBelowPrice: s.strike < spot
    });
  }
  
  // Step 8: Calculate advanced Greeks exposure
  let vannaExposure = 0;
  let charmExposure = 0;
  let dageExposure = 0;
  
  for (let i = 0; i < contractsWithGEX.length; i++) {
    const c = contractsWithGEX[i];
    
    const vex = c.open_interest * c.vanna * spot;
    vannaExposure += c.right === 'C' ? vex : -vex;
    
    const cex = c.open_interest * c.charm * spot * (1 / 365);
    charmExposure += cex;
    
    const dage = c.gamma * c.delta * c.open_interest * spot;
    dageExposure += c.right === 'C' ? dage : -dage;
  }
  
  // Step 9: Calculate ratios
  const putCallGammaRatio = totalCallGEX > 0 ? totalPutGEX / totalCallGEX : 0;
  const gexRatio = totalPutGEX > 0 ? totalCallGEX / totalPutGEX : 0;
  
  // Step 10: Determine market regime
  const regime = netGEX > 0 ? 'positive' : 'negative';
  const regimeStrength = totalGEX > 0 ? Math.abs(netGEX) / totalGEX : 0;
  
  // Step 11: Calculate Pin Risk
  let maxStrikeGEX = 0;
  for (let i = 0; i < strikes.length; i++) {
    const absNet = Math.abs(strikes[i].netGEX);
    if (absNet > maxStrikeGEX) maxStrikeGEX = absNet;
  }
  const pinRisk = absoluteGamma > 0 ? maxStrikeGEX / absoluteGamma : 0;
  
  // Step 12: Find nearest resistance & support
  let nearestResistance = null;
  let nearestSupport = null;
  
  for (let i = 0; i < topStrikes.length; i++) {
    const s = topStrikes[i];
    if (s.type === 'resistance' && s.strike > spot && !nearestResistance) {
      nearestResistance = s;
    }
    if (s.type === 'support' && s.strike < spot && !nearestSupport) {
      nearestSupport = s;
    }
  }
  
  return {
    // Core metrics
    totalGEX: totalGEX,
    netGEX: netGEX,
    callGEX: totalCallGEX,
    putGEX: totalPutGEX,
    absoluteGamma: absoluteGamma,
    
    // Key levels (FIXED)
    callWall: callWallStrike ? callWallStrike.strike : null,
    callWallGEX: callWallStrike ? callWallStrike.netGEX : 0,
    putWall: putWallStrike ? putWallStrike.strike : null,
    putWallGEX: putWallStrike ? Math.abs(putWallStrike.netGEX) : 0,
    zeroGammaLevel: zeroGammaLevel,
    
    // Advanced Greeks
    vannaExposure: vannaExposure,
    charmExposure: charmExposure,
    dageExposure: dageExposure,
    
    // Ratios and regime
    gexRatio: gexRatio,
    putCallGammaRatio: putCallGammaRatio,
    regime: regime,
    regimeStrength: regimeStrength,
    
    // Risk metrics
    pinRisk: pinRisk,
    
    // Visualization data
    topStrikes: topStrikes,
    allStrikes: strikes,
    nearestResistance: nearestResistance,
    nearestSupport: nearestSupport,
    
    // Additional context
    spotPrice: spot,
    distanceToZeroGamma: zeroGammaLevel ? ((zeroGammaLevel - spot) / spot * 100) : null,
    isAboveZeroGamma: zeroGammaLevel ? spot > zeroGammaLevel : null,
    validContracts: validContracts,
    totalContracts: optionsData.length
  };
}

/**
 * Calculate Zero Gamma Level (Gamma Flip Point)
 * This is the price level where Net GEX crosses zero
 * Above this: dealers stabilize (buy dips, sell rallies)
 * Below this: dealers destabilize (sell dips, buy rallies)
 */
function calculateZeroGammaLevel(contracts, currentSpot) {
  const priceStep = currentSpot * 0.005;
  const priceRange = [];
  
  for (let price = currentSpot * 0.85; price <= currentSpot * 1.15; price += priceStep) {
    priceRange.push(price);
  }
  
  const gexProfile = [];
  for (let i = 0; i < priceRange.length; i++) {
    const price = priceRange[i];
    let netGEX = 0;
    
    for (let j = 0; j < contracts.length; j++) {
      const contract = contracts[j];
      const gamma = contract.gamma || 0;
      const oi = contract.open_interest || 0;
      
      const gex = gamma * oi * price * price;
      netGEX += contract.right === 'C' ? gex : -gex;
    }
    
    gexProfile.push({ price: price, netGEX: netGEX });
  }
  
  for (let i = 1; i < gexProfile.length; i++) {
    const prev = gexProfile[i - 1];
    const curr = gexProfile[i];
    
    if ((prev.netGEX > 0 && curr.netGEX < 0) || (prev.netGEX < 0 && curr.netGEX > 0)) {
      const slope = (curr.netGEX - prev.netGEX) / (curr.price - prev.price);
      if (slope !== 0) {
        const zeroCrossing = prev.price - (prev.netGEX / slope);
        return zeroCrossing;
      }
    }
  }
  
  return null;
}

/**
 * Calculate Vanna Exposure (VEX)
 * VEX = OI × Vanna × Spot × IV
 * Predicts dealer flows when implied volatility changes
 */
export function calculateVannaExposure(optionsData, stockData) {
  if (!optionsData || !stockData) return null;
  
  const spot = stockData.price;
  let totalVEX = 0;
  
  for (let i = 0; i < optionsData.length; i++) {
    const option = optionsData[i];
    const vanna = option.vanna || 0;
    const oi = option.open_interest || 0;
    const iv = option.iv || 0;
    
    const vex = oi * vanna * spot * iv;
    totalVEX += option.right === 'C' ? vex : -vex;
  }
  
  return totalVEX;
}

/**
 * Calculate Charm Exposure (CEX)
 * CEX = OI × Charm × Spot × (1/365)
 * Shows time-decay-driven rebalancing pressure
 */
export function calculateCharmExposure(optionsData, stockData) {
  if (!optionsData || !stockData) return null;
  
  const spot = stockData.price;
  let totalCEX = 0;
  
  for (let i = 0; i < optionsData.length; i++) {
    const option = optionsData[i];
    const charm = option.charm || 0;
    const oi = option.open_interest || 0;
    
    const cex = oi * charm * spot * (1 / 365);
    totalCEX += cex;
  }
  
  return totalCEX;
}

/**
 * Calculate Delta-Adjusted Gamma Exposure (DAGE)
 * DAGE = Γ × Δ × OI × 100 × Spot
 * Measures hedging flow acceleration
 */
export function calculateDAGE(optionsData, stockData) {
  if (!optionsData || !stockData) return null;
  
  const spot = stockData.price;
  let totalDAGE = 0;
  
  for (let i = 0; i < optionsData.length; i++) {
    const option = optionsData[i];
    const gamma = option.gamma || 0;
    const delta = option.delta || 0;
    const oi = option.open_interest || 0;
    
    const dage = gamma * delta * oi * 100 * spot;
    totalDAGE += option.right === 'C' ? dage : -dage;
  }
  
  return totalDAGE;
}
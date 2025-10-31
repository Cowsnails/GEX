// utils/marketHours.js - Market Hours Validation

/**
 * Check if a signal should be displayed based on market hours
 * Rules:
 * 1. System launches at 9:15 AM ET
 * 2. Ignore all signals received before 9:30 AM ET (discard for the day)
 * 3. Show all signals received after 9:30 AM ET
 * 4. Exception: Multi-day active trades (hasPosition = true) are ALWAYS shown
 */

export function shouldDisplaySignal(signal, receivedAt = Date.now()) {
  // If this is an active multi-day trade, ALWAYS show it
  if (signal.isMultiDayTrade || signal.hasPosition) {
    console.log(`✅ [MARKET HOURS] Multi-day trade - ALWAYS DISPLAY: ${signal.root}`);
    return {
      shouldDisplay: true,
      reason: 'Active multi-day trade',
      isPre market: false
    };
  }
  
  // Convert timestamp to ET (Eastern Time)
  const receivedDate = new Date(receivedAt);
  
  // Get time in ET timezone
  const etTime = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(receivedDate);
  
  const [hours, minutes] = etTime.split(':').map(Number);
  const timeInMinutes = hours * 60 + minutes;
  
  // Market hours: 9:30 AM ET = 9 * 60 + 30 = 570 minutes
  const MARKET_OPEN_TIME = 9 * 60 + 30; // 9:30 AM
  const MARKET_CLOSE_TIME = 16 * 60;     // 4:00 PM
  
  // Check if signal was received BEFORE market open (9:30 AM ET)
  if (timeInMinutes < MARKET_OPEN_TIME) {
    console.log(`🚫 [MARKET HOURS] PRE-MARKET signal rejected: ${signal.root} received at ${etTime} ET (before 9:30 AM)`);
    return {
      shouldDisplay: false,
      reason: `Pre-market signal (received ${etTime} ET, before 9:30 AM)`,
      isPreMarket: true,
      receivedTime: etTime
    };
  }
  
  // Check if signal was received AFTER market close (4:00 PM ET)
  if (timeInMinutes >= MARKET_CLOSE_TIME) {
    console.log(⚠️ [MARKET HOURS] AFTER-HOURS signal: ${signal.root} received at ${etTime} ET (after 4:00 PM)`);
    return {
      shouldDisplay: true, // You can change this to false if you want to ignore after-hours
      reason: `After-hours signal (received ${etTime} ET)`,
      isPreMarket: false,
      isAfterHours: true,
      receivedTime: etTime
    };
  }
  
  // Signal is within market hours (9:30 AM - 4:00 PM ET)
  console.log(`✅ [MARKET HOURS] Signal accepted: ${signal.root} received at ${etTime} ET (during market hours)`);
  return {
    shouldDisplay: true,
    reason: `Received during market hours (${etTime} ET)`,
    isPreMarket: false,
    receivedTime: etTime
  };
}

/**
 * Check if we're currently in market hours
 */
export function isMarketOpen() {
  const now = new Date();
  
  // Get current time in ET
  const etTime = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(now);
  
  const [hours, minutes] = etTime.split(':').map(Number);
  const timeInMinutes = hours * 60 + minutes;
  
  const MARKET_OPEN_TIME = 9 * 60 + 30;  // 9:30 AM
  const MARKET_CLOSE_TIME = 16 * 60;      // 4:00 PM
  
  // Check if it's a weekday (Monday = 1, Sunday = 0)
  const dayOfWeek = now.getDay();
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  
  return isWeekday && timeInMinutes >= MARKET_OPEN_TIME && timeInMinutes < MARKET_CLOSE_TIME;
}

/**
 * Get current ET time as string
 */
export function getCurrentETTime() {
  const now = new Date();
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(now);
}

/**
 * Mark a signal as a multi-day trade (in database)
 */
export function markAsMultiDayTrade(signalId) {
  // This will be called when user enters a position
  // The TradeHistoryManager should update the database
  console.log(`📌 [MARKET HOURS] Marking ${signalId} as multi-day trade`);
  return true;
}
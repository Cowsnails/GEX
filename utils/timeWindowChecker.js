// public/utils/timeWindowChecker.js - Time-based mode switching utility

/**
 * Check if current time is within the API polling window (12am - 4am)
 * During this window, GEX data fetching switches from WebSocket to API polling
 * to reduce server load during maintenance hours
 *
 * @returns {boolean} true if in polling window (12am-4am), false otherwise
 */
export function isInPollingWindow() {
  const now = new Date();
  const hour = now.getHours(); // 0-23

  // Between 12am (0) and 4am (4) - exclusive of 4am
  return hour >= 0 && hour < 4;
}

/**
 * Get the current mode based on time window
 * @returns {'websocket'|'polling'} current data fetching mode
 */
export function getCurrentMode() {
  return isInPollingWindow() ? 'polling' : 'websocket';
}

/**
 * Calculate milliseconds until mode switch
 * Useful for scheduling mode transitions
 * @returns {number} milliseconds until next mode switch
 */
export function getMillisecondsUntilModeSwitch() {
  const now = new Date();
  const hour = now.getHours();

  if (hour >= 0 && hour < 4) {
    // Currently in polling window (12am-4am)
    // Switch to WebSocket at 4am
    const switchTime = new Date(now);
    switchTime.setHours(4, 0, 0, 0);
    return switchTime - now;
  } else if (hour >= 4) {
    // Currently in WebSocket window
    // Switch to polling at midnight
    const switchTime = new Date(now);
    switchTime.setDate(switchTime.getDate() + 1); // Next day
    switchTime.setHours(0, 0, 0, 0);
    return switchTime - now;
  }
}

/**
 * Get a human-readable description of current mode
 * @returns {string} description of current mode
 */
export function getModeDescription() {
  const mode = getCurrentMode();
  const now = new Date();
  const hour = now.getHours();

  if (mode === 'polling') {
    return `API Polling Mode (12am-4am) - Currently ${hour}:00`;
  } else {
    return `WebSocket Mode (4am-12am) - Currently ${hour}:00`;
  }
}
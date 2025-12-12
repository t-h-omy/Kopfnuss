// Kopfnuss - Event Manager
// Manages seasonal events, seasonal currency, and event-based backgrounds

import { SEASONAL_EVENTS, BACKGROUNDS_UNIFIED } from '../data/balancingLoader.js';
import { logWarn } from './logging.js';
import {
  loadSeasonalCurrency,
  saveSeasonalCurrency,
  loadSeasonalTaskCount,
  saveSeasonalTaskCount,
  loadEventPopupShown,
  saveEventPopupShown,
  loadEventEndPopupShown,
  saveEventEndPopupShown,
  loadSeasonalUnlockedBackgrounds,
  saveSeasonalUnlockedBackgrounds,
  loadSelectedBackground,
  saveSelectedBackground,
  loadSeasonalLastKnownPurchasable,
  saveSeasonalLastKnownPurchasable,
  clearShopOpenedFlag,
  wasShopOpenedWithNewBackgrounds,
  getTodayDate
} from './storageManager.js';

/**
 * @typedef {Object} SeasonalEvent
 * @property {string} id - Unique identifier for the event (e.g., "christmas", "newYear")
 * @property {string} name - Display name of the event (e.g., "Weihnachten")
 * @property {string} emoticon - Emoji representing the event (e.g., "❄️")
 * @property {string} currencyName - Name of the seasonal currency in plural (e.g., "Schneeflocken")
 * @property {string} currencyNameSingular - Name of the seasonal currency in singular (e.g., "Schneeflocke")
 * @property {number} startMonth - Start month (1-12)
 * @property {number} startDay - Start day (1-31)
 * @property {number} endMonth - End month (1-12)
 * @property {number} endDay - End day (1-31)
 * @property {string} popupTitle - Title for the event popup
 * @property {string} popupDescription - Description text for the event popup
 */

/**
 * Get seasonal backgrounds from unified structure
 * Returns backgrounds in legacy format for compatibility
 * @returns {Object} Object with background IDs as keys
 */
function getSeasonalBackgroundsSource() {
  const backgrounds = {};
  
  // Safety check: ensure BACKGROUNDS_UNIFIED is an array
  if (!Array.isArray(BACKGROUNDS_UNIFIED)) {
    logWarn('[EventManager] BACKGROUNDS_UNIFIED is not an array, returning empty object');
    return backgrounds;
  }
  
  // Filter for seasonal backgrounds only
  BACKGROUNDS_UNIFIED
    .filter(bg => bg.category === 'seasonal' && bg.active)
    .forEach(bg => {
      // Convert to legacy format
      backgrounds[bg.id] = {
        id: bg.id,
        name: bg.name,
        file: bg.file,
        cost: bg.cost,
        tasksRequired: bg.requirements.minTasksSinceEventStart || 0,
        eventId: bg.event,
        isSeasonal: true
      };
    });
  
  return backgrounds;
}

/**
 * Get the current date or a simulated date for testing
 * @returns {Date} Current date object
 */
function getCurrentDate() {
  return new Date();
}

/**
 * Check if a date falls within an event's date range
 * Handles events that span year boundaries (e.g., Dec 15 - Jan 5)
 * @param {Date} date - Date to check
 * @param {Object} event - Event configuration object
 * @returns {boolean} True if the date is within the event's range
 */
function isDateInEventRange(date, event) {
  const month = date.getMonth() + 1; // getMonth() is 0-indexed
  const day = date.getDate();
  
  const startMonth = event.startMonth;
  const startDay = event.startDay;
  const endMonth = event.endMonth;
  const endDay = event.endDay;
  
  // Handle events that span year boundaries
  if (startMonth > endMonth) {
    // Event spans year boundary (e.g., Dec 15 - Jan 5)
    // Date is in range if it's after start OR before end
    if (month > startMonth || (month === startMonth && day >= startDay)) {
      return true;
    }
    if (month < endMonth || (month === endMonth && day <= endDay)) {
      return true;
    }
    return false;
  } else {
    // Normal event within same year
    if (month < startMonth || month > endMonth) {
      return false;
    }
    if (month === startMonth && day < startDay) {
      return false;
    }
    if (month === endMonth && day > endDay) {
      return false;
    }
    return true;
  }
}

/**
 * Get the currently active seasonal event
 * Returns the event based on current date
 * @returns {SeasonalEvent|null} Active event configuration or null if no event is active
 */
export function getActiveEvent() {
  const currentDate = getCurrentDate();
  
  for (const eventKey in SEASONAL_EVENTS) {
    const event = SEASONAL_EVENTS[eventKey];
    if (isDateInEventRange(currentDate, event)) {
      return event;
    }
  }
  
  return null;
}

/**
 * Check if any seasonal event is currently active
 * @returns {boolean} True if an event is active
 */
export function isEventActive() {
  return getActiveEvent() !== null;
}

/**
 * Get the next upcoming seasonal event
 * @returns {Object|null} Object with event and startDate, or null if no events configured
 */
export function getNextEvent() {
  const currentDate = getCurrentDate();
  const currentYear = currentDate.getFullYear();
  const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;
  
  let nextEvent = null;
  let nextStartDate = null;
  let minDaysUntilStart = Infinity;
  
  for (const eventKey in SEASONAL_EVENTS) {
    const event = SEASONAL_EVENTS[eventKey];
    
    // Calculate start date for this year
    let startDate = new Date(currentYear, event.startMonth - 1, event.startDay);
    
    // If the event start is in the past, check next year
    if (startDate < currentDate) {
      startDate = new Date(currentYear + 1, event.startMonth - 1, event.startDay);
    }
    
    // Calculate days until event starts
    const daysUntilStart = Math.ceil((startDate.getTime() - currentDate.getTime()) / MILLISECONDS_PER_DAY);
    
    // Keep track of the closest upcoming event
    if (daysUntilStart > 0 && daysUntilStart < minDaysUntilStart) {
      minDaysUntilStart = daysUntilStart;
      nextEvent = event;
      nextStartDate = startDate;
    }
  }
  
  if (nextEvent) {
    return {
      event: nextEvent,
      startDate: nextStartDate
    };
  }
  
  return null;
}

/**
 * Get the event end date as a Date object
 * @param {Object} event - Event configuration
 * @returns {Date} Event end date
 */
function getEventEndDate(event) {
  const currentDate = getCurrentDate();
  let year = currentDate.getFullYear();
  
  // If event spans year boundary and we're in the early months,
  // the end date is in the current year
  if (event.startMonth > event.endMonth) {
    if (currentDate.getMonth() + 1 <= event.endMonth) {
      // We're in the ending part of the event (new year)
    } else {
      // We're in the starting part, end is next year
      year += 1;
    }
  }
  
  return new Date(year, event.endMonth - 1, event.endDay, 23, 59, 59);
}

/**
 * Get days remaining until the active event ends
 * @returns {number|null} Days remaining or null if no event is active
 */
export function getDaysUntilEventEnd() {
  const activeEvent = getActiveEvent();
  if (!activeEvent) {
    return null;
  }
  
  const currentDate = getCurrentDate();
  const endDate = getEventEndDate(activeEvent);
  
  const diffTime = endDate.getTime() - currentDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}

/**
 * Get the current seasonal currency amount
 * @returns {number} Current seasonal currency amount (0 if no event active)
 */
export function getSeasonalCurrency() {
  const activeEvent = getActiveEvent();
  if (!activeEvent) {
    return 0;
  }
  return loadSeasonalCurrency(activeEvent.id);
}

/**
 * Add seasonal currency
 * @param {number} amount - Amount to add
 * @returns {Object} Result with success status and new total
 */
export function addSeasonalCurrency(amount) {
  const activeEvent = getActiveEvent();
  if (!activeEvent) {
    return {
      success: false,
      message: 'No active event'
    };
  }
  
  if (amount <= 0) {
    return {
      success: false,
      message: 'Invalid amount'
    };
  }
  
  const current = loadSeasonalCurrency(activeEvent.id);
  const newTotal = current + amount;
  saveSeasonalCurrency(activeEvent.id, newTotal);
  
  return {
    success: true,
    amount: amount,
    total: newTotal,
    eventId: activeEvent.id,
    emoticon: activeEvent.emoticon,
    currencyName: activeEvent.currencyName
  };
}

/**
 * Spend seasonal currency
 * @param {number} amount - Amount to spend
 * @returns {Object} Result with success status
 */
export function spendSeasonalCurrency(amount) {
  const activeEvent = getActiveEvent();
  if (!activeEvent) {
    return {
      success: false,
      message: 'No active event'
    };
  }
  
  const current = loadSeasonalCurrency(activeEvent.id);
  if (current < amount) {
    return {
      success: false,
      message: 'Not enough seasonal currency',
      current: current,
      required: amount
    };
  }
  
  const newTotal = current - amount;
  saveSeasonalCurrency(activeEvent.id, newTotal);
  
  return {
    success: true,
    spent: amount,
    remaining: newTotal
  };
}

/**
 * Increment the seasonal task counter
 * Called when a task is completed during an active event
 * @param {number} count - Number of tasks to add (default 1)
 * @returns {Object} Result with new task count
 */
export function incrementSeasonalTasks(count = 1) {
  const activeEvent = getActiveEvent();
  if (!activeEvent) {
    return {
      success: false,
      message: 'No active event'
    };
  }
  
  const current = loadSeasonalTaskCount(activeEvent.id);
  const newCount = current + count;
  saveSeasonalTaskCount(activeEvent.id, newCount);
  
  return {
    success: true,
    taskCount: newCount,
    eventId: activeEvent.id
  };
}

/**
 * Get the current seasonal task count
 * @returns {number} Tasks completed during the current event
 */
export function getSeasonalTaskCount() {
  const activeEvent = getActiveEvent();
  if (!activeEvent) {
    return 0;
  }
  return loadSeasonalTaskCount(activeEvent.id);
}

/**
 * Get seasonal backgrounds for the currently active event
 * @returns {Array} Array of seasonal background configurations
 */
export function getActiveEventBackgrounds() {
  const activeEvent = getActiveEvent();
  if (!activeEvent) {
    return [];
  }
  
  return Object.values(SEASONAL_BACKGROUNDS).filter(bg => bg.eventId === activeEvent.id);
}

/**
 * Check if a seasonal background can be unlocked
 * @param {string} backgroundId - ID of the seasonal background
 * @returns {Object} Result with canUnlock status and reason
 */
export function canUnlockSeasonalBackground(backgroundId) {
  const activeEvent = getActiveEvent();
  if (!activeEvent) {
    return {
      canUnlock: false,
      reason: 'No active event'
    };
  }
  
  const seasonalBackgroundsSource = getSeasonalBackgroundsSource();
  const background = seasonalBackgroundsSource[backgroundId];
  if (!background) {
    return {
      canUnlock: false,
      reason: 'Background not found'
    };
  }
  
  if (background.eventId !== activeEvent.id) {
    return {
      canUnlock: false,
      reason: 'Background is for a different event'
    };
  }
  
  // Check if already unlocked
  const unlockedBackgrounds = loadSeasonalUnlockedBackgrounds(activeEvent.id);
  if (unlockedBackgrounds.includes(backgroundId)) {
    return {
      canUnlock: false,
      reason: 'Already unlocked'
    };
  }
  
  // Check task requirement
  const taskCount = getSeasonalTaskCount();
  if (taskCount < background.tasksRequired) {
    return {
      canUnlock: false,
      reason: 'Not enough tasks completed',
      tasksNeeded: background.tasksRequired - taskCount
    };
  }
  
  // Check currency
  const currency = getSeasonalCurrency();
  if (currency < background.cost) {
    return {
      canUnlock: false,
      reason: 'Not enough seasonal currency',
      currencyNeeded: background.cost - currency
    };
  }
  
  return {
    canUnlock: true
  };
}

/**
 * Unlock a seasonal background
 * @param {string} backgroundId - ID of the seasonal background to unlock
 * @returns {Object} Result with success status
 */
export function unlockSeasonalBackground(backgroundId) {
  const canUnlockResult = canUnlockSeasonalBackground(backgroundId);
  if (!canUnlockResult.canUnlock) {
    return {
      success: false,
      message: canUnlockResult.reason,
      ...canUnlockResult
    };
  }
  
  const activeEvent = getActiveEvent();
  const seasonalBackgroundsSource = getSeasonalBackgroundsSource();
  const background = seasonalBackgroundsSource[backgroundId];
  
  // Spend the seasonal currency
  const spendResult = spendSeasonalCurrency(background.cost);
  if (!spendResult.success) {
    return spendResult;
  }
  
  // Add to unlocked seasonal backgrounds
  const unlockedBackgrounds = loadSeasonalUnlockedBackgrounds(activeEvent.id);
  unlockedBackgrounds.push(backgroundId);
  saveSeasonalUnlockedBackgrounds(activeEvent.id, unlockedBackgrounds);
  
  return {
    success: true,
    backgroundId: backgroundId,
    background: background
  };
}

/**
 * Check if a seasonal background is currently usable
 * (unlocked and event is active)
 * @param {string} backgroundId - ID of the background
 * @returns {boolean} True if the background can be used
 */
export function isSeasonalBackgroundUsable(backgroundId) {
  const seasonalBackgroundsSource = getSeasonalBackgroundsSource();
  const background = seasonalBackgroundsSource[backgroundId];
  if (!background) {
    return false;
  }
  
  const activeEvent = getActiveEvent();
  if (!activeEvent || activeEvent.id !== background.eventId) {
    return false;
  }
  
  const unlockedBackgrounds = loadSeasonalUnlockedBackgrounds(activeEvent.id);
  return unlockedBackgrounds.includes(backgroundId);
}

/**
 * Check if the currently equipped background is a seasonal one that is no longer usable
 * If so, reset to default background
 * @returns {Object} Result indicating if background was reset
 */
export function checkAndResetSeasonalBackground() {
  const selectedId = loadSelectedBackground();
  
  // Check if the selected background is a seasonal one
  const seasonalBackgroundsSource = getSeasonalBackgroundsSource();
  const seasonalBg = seasonalBackgroundsSource[selectedId];
  if (!seasonalBg) {
    // Not a seasonal background, nothing to do
    return {
      wasReset: false
    };
  }
  
  // It's a seasonal background - check if the event is still active
  const activeEvent = getActiveEvent();
  if (activeEvent && activeEvent.id === seasonalBg.eventId) {
    // Event is still active, keep the background
    return {
      wasReset: false
    };
  }
  
  // Event has ended - reset to default
  saveSelectedBackground('default');
  return {
    wasReset: true,
    previousBackground: seasonalBg
  };
}

/**
 * Check if the event start popup should be shown
 * @returns {boolean} True if popup should be shown
 */
export function shouldShowEventStartPopup() {
  const activeEvent = getActiveEvent();
  if (!activeEvent) {
    return false;
  }
  
  return !loadEventPopupShown(activeEvent.id);
}

/**
 * Mark the event start popup as shown
 */
export function markEventStartPopupShown() {
  const activeEvent = getActiveEvent();
  if (activeEvent) {
    saveEventPopupShown(activeEvent.id, true);
  }
}

/**
 * Check if the event end popup should be shown
 * Called when no event is active to check if a recent event ended
 * @returns {Object} Result with shouldShow and event info
 */
export function shouldShowEventEndPopup() {
  // Check each event to see if it recently ended
  const currentDate = getCurrentDate();
  
  for (const eventKey in SEASONAL_EVENTS) {
    const event = SEASONAL_EVENTS[eventKey];
    
    // Check if we showed the start popup for this event
    if (!loadEventPopupShown(event.id)) {
      continue; // Never showed start popup, so don't show end popup
    }
    
    // Check if we already showed the end popup
    if (loadEventEndPopupShown(event.id)) {
      continue;
    }
    
    // Check if the event just ended (we're within a day after the end)
    const endDate = new Date(currentDate.getFullYear(), event.endMonth - 1, event.endDay, 23, 59, 59);
    
    // Handle year boundary
    if (event.startMonth > event.endMonth && currentDate.getMonth() + 1 > event.endMonth) {
      // We're after the end month, so end date was in the previous period
      endDate.setFullYear(currentDate.getFullYear());
    }
    
    const daysSinceEnd = Math.floor((currentDate.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Show end popup if event ended within the last 7 days
    if (daysSinceEnd >= 0 && daysSinceEnd <= 7) {
      return {
        shouldShow: true,
        event: event
      };
    }
  }
  
  return {
    shouldShow: false
  };
}

/**
 * Mark the event end popup as shown
 * @param {string} eventId - ID of the event
 */
export function markEventEndPopupShown(eventId) {
  saveEventEndPopupShown(eventId, true);
}

/**
 * Clear all seasonal data for an event (called when event ends)
 * This resets currency, task count, and unlocked backgrounds for the event.
 * Note: This function is called automatically when the event end popup is shown
 * to ensure all seasonal data is cleared for the next occurrence of the event.
 * Per requirements, seasonal backgrounds must be unlocked again each year.
 * @param {string} eventId - ID of the event to clear
 */
export function clearEventData(eventId) {
  saveSeasonalCurrency(eventId, 0);
  saveSeasonalTaskCount(eventId, 0);
  saveSeasonalUnlockedBackgrounds(eventId, []);
}

/**
 * Get seasonal background info for display in shop
 * @param {string} backgroundId - ID of the seasonal background
 * @returns {Object|null} Background info with unlock status
 */
export function getSeasonalBackgroundInfo(backgroundId) {
  const seasonalBackgroundsSource = getSeasonalBackgroundsSource();
  const background = seasonalBackgroundsSource[backgroundId];
  if (!background) {
    return null;
  }
  
  const activeEvent = getActiveEvent();
  const isEventActiveForBg = activeEvent && activeEvent.id === background.eventId;
  
  if (!isEventActiveForBg) {
    return null; // Background's event is not active
  }
  
  const taskCount = getSeasonalTaskCount();
  const currency = getSeasonalCurrency();
  const unlockedBackgrounds = loadSeasonalUnlockedBackgrounds(activeEvent.id);
  const isUnlocked = unlockedBackgrounds.includes(backgroundId);
  const shopOpened = wasShopOpenedWithNewBackgrounds();
  
  // Check if this background is newly purchasable
  const isPurchasable = !isUnlocked && taskCount >= background.tasksRequired;
  // Show NEW badge if background is purchasable and shop hasn't been opened since it became available
  const isNewlyPurchasable = isPurchasable && !shopOpened;
  
  return {
    ...background,
    isUnlocked: isUnlocked,
    canAfford: currency >= background.cost,
    hasEnoughTasks: taskCount >= background.tasksRequired,
    tasksRemaining: Math.max(0, background.tasksRequired - taskCount),
    currencyRemaining: Math.max(0, background.cost - currency),
    eventEmoticon: activeEvent.emoticon,
    eventName: activeEvent.name,
    isNewlyPurchasable: isNewlyPurchasable
  };
}

/**
 * Get all seasonal backgrounds for the active event with their status
 * @returns {Array} Array of seasonal backgrounds with status info
 */
export function getAllActiveSeasonalBackgrounds() {
  const activeEvent = getActiveEvent();
  if (!activeEvent) {
    return [];
  }
  
  const seasonalBackgroundsSource = getSeasonalBackgroundsSource();
  
  return Object.keys(seasonalBackgroundsSource)
    .filter(id => seasonalBackgroundsSource[id].eventId === activeEvent.id)
    .map(id => getSeasonalBackgroundInfo(id))
    .filter(bg => bg !== null);
}

/**
 * Get IDs of seasonal backgrounds that are currently purchasable
 * (have enough tasks completed but not yet unlocked)
 * @returns {Array<string>} Array of purchasable seasonal background IDs
 */
function getPurchasableSeasonalBackgroundIds() {
  const activeEvent = getActiveEvent();
  if (!activeEvent) {
    return [];
  }
  
  const taskCount = getSeasonalTaskCount();
  const unlockedBackgrounds = loadSeasonalUnlockedBackgrounds(activeEvent.id);
  const seasonalBackgroundsSource = getSeasonalBackgroundsSource();
  
  return Object.keys(seasonalBackgroundsSource)
    .filter(id => {
      const bg = seasonalBackgroundsSource[id];
      // Must be for the active event
      if (bg.eventId !== activeEvent.id) return false;
      // Must have enough tasks
      if (taskCount < bg.tasksRequired) return false;
      // Must not already be unlocked
      if (unlockedBackgrounds.includes(id)) return false;
      return true;
    });
}

/**
 * Check for newly purchasable seasonal backgrounds
 * Similar to checkForNewlyPurchasableBackgrounds but for seasonal backgrounds
 * @returns {Object} Result with hasNew, newlyPurchasable array, and firstNewBackground
 */
export function checkForNewlyPurchasableSeasonalBackgrounds() {
  const activeEvent = getActiveEvent();
  if (!activeEvent) {
    return {
      newlyPurchasable: [],
      firstNewBackground: null,
      hasNew: false
    };
  }
  
  const currentPurchasable = getPurchasableSeasonalBackgroundIds();
  const lastKnownPurchasable = loadSeasonalLastKnownPurchasable(activeEvent.id);
  
  // Find backgrounds that are now purchasable but weren't before
  const newlyPurchasable = currentPurchasable.filter(
    id => !lastKnownPurchasable.includes(id)
  );
  
  // If new backgrounds became available, update lastKnownPurchasable to prevent showing the popup again
  // Also clear the shop opened flag so the NEW badge shows on the shop button
  if (newlyPurchasable.length > 0) {
    clearShopOpenedFlag();
    // Mark these backgrounds as "seen" in terms of the unlock popup
    // This prevents the popup from showing again on subsequent challenge completions
    const unlockedIds = loadSeasonalUnlockedBackgrounds(activeEvent.id);
    const updatedKnownPurchasable = [...new Set([...lastKnownPurchasable, ...newlyPurchasable])]
      .filter(id => !unlockedIds.includes(id));
    saveSeasonalLastKnownPurchasable(activeEvent.id, updatedKnownPurchasable);
  }
  
  // Get the first newly purchasable background object for display
  let firstNewBackground = null;
  if (newlyPurchasable.length > 0) {
    const bgId = newlyPurchasable[0];
    const seasonalBackgroundsSource = getSeasonalBackgroundsSource();
    firstNewBackground = {
      ...seasonalBackgroundsSource[bgId],
      eventEmoticon: activeEvent.emoticon,
      eventName: activeEvent.name,
      isSeasonal: true
    };
  }
  
  return {
    newlyPurchasable,
    firstNewBackground,
    hasNew: newlyPurchasable.length > 0
  };
}

/**
 * Update the list of known purchasable seasonal backgrounds
 * Should be called when shop is closed to mark backgrounds as "seen"
 */
export function updateKnownSeasonalPurchasableBackgrounds() {
  const activeEvent = getActiveEvent();
  if (!activeEvent) {
    return;
  }
  
  const currentPurchasable = getPurchasableSeasonalBackgroundIds();
  const lastKnownPurchasable = loadSeasonalLastKnownPurchasable(activeEvent.id);
  const unlockedIds = loadSeasonalUnlockedBackgrounds(activeEvent.id);
  
  // Combine current and last known, but remove any that have been purchased
  const allKnownPurchasable = [...new Set([...lastKnownPurchasable, ...currentPurchasable])]
    .filter(id => !unlockedIds.includes(id));
  
  saveSeasonalLastKnownPurchasable(activeEvent.id, allKnownPurchasable);
}

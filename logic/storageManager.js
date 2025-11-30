// Kopfnuss - Storage Manager
// Handles all localStorage operations with error handling

/**
 * Dev mode setting key (stored separately, never has dev prefix)
 */
const DEV_MODE_KEY = 'kopfnuss_use_dev_balancing';

/**
 * Cached dev mode state (initialized on first call, persists until page reload)
 * Using null to indicate not yet cached
 */
let cachedDevModeState = null;

/**
 * Load dev mode setting (this is stored separately and not affected by dev mode prefix)
 * This function is defined early because it's needed by getStoragePrefix()
 * Uses caching to avoid repeated localStorage reads
 * @returns {boolean} True if dev mode is enabled
 */
export function loadDevModeSetting() {
  // Return cached value if available
  if (cachedDevModeState !== null) {
    return cachedDevModeState;
  }
  
  try {
    const item = localStorage.getItem(DEV_MODE_KEY);
    if (item === null) {
      cachedDevModeState = false;
      return false;
    }
    cachedDevModeState = JSON.parse(item) === true;
    return cachedDevModeState;
  } catch (error) {
    console.error('Error loading dev mode setting:', error);
    cachedDevModeState = false;
    return false;
  }
}

/**
 * Save dev mode setting
 * Note: Changing dev mode requires an app reload, so the cache will be refreshed
 * @param {boolean} useDevBalancing - Whether dev mode is enabled
 * @returns {boolean} Success status
 */
export function saveDevModeSetting(useDevBalancing) {
  try {
    localStorage.setItem(DEV_MODE_KEY, JSON.stringify(useDevBalancing));
    // Update cache (though app will reload anyway)
    cachedDevModeState = useDevBalancing;
    return true;
  } catch (error) {
    console.error('Error saving dev mode setting:', error);
    return false;
  }
}

/**
 * Base storage keys for localStorage (without dev prefix)
 */
const BASE_STORAGE_KEYS = {
  CHALLENGES: 'kopfnuss_challenges_', // Will be appended with date
  PROGRESS: 'kopfnuss_progress',
  STREAK: 'kopfnuss_streak',
  DIAMONDS: 'kopfnuss_diamonds',
  DIAMONDS_EARNED: 'kopfnuss_diamonds_earned',
  UNLOCKED_BACKGROUNDS: 'kopfnuss_unlocked_backgrounds',
  SELECTED_BACKGROUND: 'kopfnuss_selected_background',
  LAST_KNOWN_PURCHASABLE_BACKGROUNDS: 'kopfnuss_last_known_purchasable_backgrounds',
  // Seasonal event storage keys (appended with event ID)
  SEASONAL_CURRENCY: 'kopfnuss_seasonal_currency_',
  SEASONAL_TASK_COUNT: 'kopfnuss_seasonal_tasks_',
  SEASONAL_UNLOCKED_BACKGROUNDS: 'kopfnuss_seasonal_backgrounds_',
  EVENT_POPUP_SHOWN: 'kopfnuss_event_popup_shown_',
  EVENT_END_POPUP_SHOWN: 'kopfnuss_event_end_popup_shown_'
};

/**
 * Get the dev mode prefix based on current dev mode state
 * Uses cached dev mode state for performance
 * @returns {string} Prefix for storage keys ('kopfnuss_dev_' or 'kopfnuss_')
 */
function getStoragePrefix() {
  const useDevBalancing = loadDevModeSetting();
  return useDevBalancing ? 'kopfnuss_dev_' : 'kopfnuss_';
}

/**
 * Get storage key with appropriate prefix based on dev mode
 * @param {string} baseKey - Base storage key
 * @returns {string} Full storage key with prefix
 */
function getStorageKey(baseKey) {
  const prefix = getStoragePrefix();
  // Extract the base key name (remove 'kopfnuss_' prefix if present)
  const keyName = baseKey.replace('kopfnuss_', '');
  return prefix + keyName;
}

/**
 * Dynamic storage keys that respect dev mode
 */
const STORAGE_KEYS = {
  get CHALLENGES() { return getStorageKey('kopfnuss_challenges_'); },
  get PROGRESS() { return getStorageKey('kopfnuss_progress'); },
  get STREAK() { return getStorageKey('kopfnuss_streak'); },
  get DIAMONDS() { return getStorageKey('kopfnuss_diamonds'); },
  get DIAMONDS_EARNED() { return getStorageKey('kopfnuss_diamonds_earned'); },
  get UNLOCKED_BACKGROUNDS() { return getStorageKey('kopfnuss_unlocked_backgrounds'); },
  get SELECTED_BACKGROUND() { return getStorageKey('kopfnuss_selected_background'); },
  get LAST_KNOWN_PURCHASABLE_BACKGROUNDS() { return getStorageKey('kopfnuss_last_known_purchasable_backgrounds'); },
  // Seasonal event storage keys (appended with event ID)
  get SEASONAL_CURRENCY() { return getStorageKey('kopfnuss_seasonal_currency_'); },
  get SEASONAL_TASK_COUNT() { return getStorageKey('kopfnuss_seasonal_tasks_'); },
  get SEASONAL_UNLOCKED_BACKGROUNDS() { return getStorageKey('kopfnuss_seasonal_backgrounds_'); },
  get SEASONAL_LAST_KNOWN_PURCHASABLE() { return getStorageKey('kopfnuss_seasonal_last_purchasable_'); },
  get EVENT_POPUP_SHOWN() { return getStorageKey('kopfnuss_event_popup_shown_'); },
  get EVENT_END_POPUP_SHOWN() { return getStorageKey('kopfnuss_event_end_popup_shown_'); }
};

/**
 * Get formatted date string for today (YYYY-MM-DD)
 * @returns {string} Date string
 */
export function getTodayDate() {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

/**
 * Save data to localStorage with error handling
 * @param {string} key - Storage key
 * @param {*} data - Data to store (will be JSON stringified)
 * @returns {boolean} Success status
 */
export function saveToStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Error saving to localStorage:', error);
    return false;
  }
}

/**
 * Load data from localStorage with error handling
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if key doesn't exist
 * @returns {*} Parsed data or default value
 */
export function loadFromStorage(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    if (item === null) {
      return defaultValue;
    }
    return JSON.parse(item);
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return defaultValue;
  }
}

/**
 * Remove data from localStorage
 * @param {string} key - Storage key
 * @returns {boolean} Success status
 */
export function removeFromStorage(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Error removing from localStorage:', error);
    return false;
  }
}

/**
 * Save daily challenges
 * @param {Array} challenges - Array of challenge objects
 * @param {string} date - Date string (YYYY-MM-DD), defaults to today
 * @returns {boolean} Success status
 */
export function saveChallenges(challenges, date = getTodayDate()) {
  const key = STORAGE_KEYS.CHALLENGES + date;
  return saveToStorage(key, challenges);
}

/**
 * Load daily challenges
 * @param {string} date - Date string (YYYY-MM-DD), defaults to today
 * @returns {Array|null} Array of challenge objects or null
 */
export function loadChallenges(date = getTodayDate()) {
  const key = STORAGE_KEYS.CHALLENGES + date;
  return loadFromStorage(key, null);
}

/**
 * Save overall progress
 * @param {Object} progress - Progress object
 * @returns {boolean} Success status
 */
export function saveProgress(progress) {
  return saveToStorage(STORAGE_KEYS.PROGRESS, progress);
}

/**
 * Load overall progress
 * @returns {Object} Progress object with default structure
 */
export function loadProgress() {
  return loadFromStorage(STORAGE_KEYS.PROGRESS, {
    totalTasksCompleted: 0,
    totalChallengesCompleted: 0,
    lastPlayedDate: null,
    tasksCompletedToday: 0
  });
}

/**
 * Save streak data
 * @param {Object} streak - Streak object
 * @returns {boolean} Success status
 */
export function saveStreak(streak) {
  return saveToStorage(STORAGE_KEYS.STREAK, streak);
}

/**
 * Load streak data
 * @returns {Object} Streak object with default structure
 */
export function loadStreak() {
  return loadFromStorage(STORAGE_KEYS.STREAK, {
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: null,
    isFrozen: false,
    lossReason: null // null, 'frozen', 'expired_restorable', 'expired_permanent'
  });
}

/**
 * Save diamond count
 * @param {number} diamonds - Number of diamonds
 * @returns {boolean} Success status
 */
export function saveDiamonds(diamonds) {
  return saveToStorage(STORAGE_KEYS.DIAMONDS, diamonds);
}

/**
 * Load diamond count
 * @returns {number} Number of diamonds
 */
export function loadDiamonds() {
  return loadFromStorage(STORAGE_KEYS.DIAMONDS, 0);
}

/**
 * Save total diamonds earned (for tracking spending correctly)
 * @param {number} count - Total diamonds earned historically
 * @returns {boolean} Success status
 */
export function saveDiamondsEarned(count) {
  return saveToStorage(STORAGE_KEYS.DIAMONDS_EARNED, count);
}

/**
 * Load total diamonds earned
 * @returns {number} Total diamonds earned historically
 */
export function loadDiamondsEarned() {
  return loadFromStorage(STORAGE_KEYS.DIAMONDS_EARNED, 0);
}

/**
 * Save unlocked backgrounds
 * @param {Array<string>} unlockedBackgrounds - Array of unlocked background IDs
 * @returns {boolean} Success status
 */
export function saveUnlockedBackgrounds(unlockedBackgrounds) {
  return saveToStorage(STORAGE_KEYS.UNLOCKED_BACKGROUNDS, unlockedBackgrounds);
}

/**
 * Load unlocked backgrounds
 * @returns {Array<string>} Array of unlocked background IDs (default always includes 'default')
 */
export function loadUnlockedBackgrounds() {
  const backgrounds = loadFromStorage(STORAGE_KEYS.UNLOCKED_BACKGROUNDS, ['default']);
  // Ensure 'default' is always included
  if (!backgrounds.includes('default')) {
    backgrounds.unshift('default');
  }
  return backgrounds;
}

/**
 * Save selected background
 * @param {string} backgroundId - ID of the selected background
 * @returns {boolean} Success status
 */
export function saveSelectedBackground(backgroundId) {
  return saveToStorage(STORAGE_KEYS.SELECTED_BACKGROUND, backgroundId);
}

/**
 * Load selected background
 * @returns {string} ID of the selected background (defaults to 'default')
 */
export function loadSelectedBackground() {
  return loadFromStorage(STORAGE_KEYS.SELECTED_BACKGROUND, 'default');
}

/**
 * Save last known purchasable backgrounds
 * Used to detect newly purchasable backgrounds for celebration popup
 * @param {Array<string>} backgroundIds - Array of background IDs that were purchasable
 * @returns {boolean} Success status
 */
export function saveLastKnownPurchasableBackgrounds(backgroundIds) {
  return saveToStorage(STORAGE_KEYS.LAST_KNOWN_PURCHASABLE_BACKGROUNDS, backgroundIds);
}

/**
 * Load last known purchasable backgrounds
 * @returns {Array<string>} Array of background IDs that were purchasable (defaults to empty array)
 */
export function loadLastKnownPurchasableBackgrounds() {
  return loadFromStorage(STORAGE_KEYS.LAST_KNOWN_PURCHASABLE_BACKGROUNDS, []);
}

/**
 * Clear all app data for current mode (dev or prod)
 * Only clears data for the current mode, never affects the other mode
 * @returns {boolean} Success status
 */
export function clearAllData() {
  try {
    const isDevMode = loadDevModeSetting();
    const prefix = isDevMode ? 'kopfnuss_dev_' : 'kopfnuss_';
    
    // Get all keys that belong to current mode
    const keys = Object.keys(localStorage);
    const keysToRemove = keys.filter(key => {
      // Skip dev mode setting key - should never be cleared
      if (key === DEV_MODE_KEY) return false;
      
      if (isDevMode) {
        // In dev mode, only clear dev keys
        return key.startsWith('kopfnuss_dev_');
      } else {
        // In prod mode, only clear prod keys (exclude dev keys)
        return key.startsWith('kopfnuss_') && !key.startsWith('kopfnuss_dev_') && key !== DEV_MODE_KEY;
      }
    });
    
    // Remove filtered keys
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    return true;
  } catch (error) {
    console.error('Error clearing data:', error);
    return false;
  }
}

/**
 * Get storage size info (for debugging)
 * @returns {Object} Storage info
 */
export function getStorageInfo() {
  try {
    let totalSize = 0;
    const keys = Object.keys(localStorage);
    const kopfnussKeys = keys.filter(key => key.startsWith('kopfnuss_'));
    
    kopfnussKeys.forEach(key => {
      const item = localStorage.getItem(key);
      totalSize += key.length + (item ? item.length : 0);
    });
    
    return {
      keyCount: kopfnussKeys.length,
      totalSizeBytes: totalSize,
      totalSizeKB: (totalSize / 1024).toFixed(2)
    };
  } catch (error) {
    console.error('Error getting storage info:', error);
    return null;
  }
}

// ============================================
// SEASONAL EVENT STORAGE FUNCTIONS
// ============================================

/**
 * Save seasonal currency for an event
 * @param {string} eventId - ID of the event
 * @param {number} amount - Amount of seasonal currency
 * @returns {boolean} Success status
 */
export function saveSeasonalCurrency(eventId, amount) {
  const key = STORAGE_KEYS.SEASONAL_CURRENCY + eventId;
  return saveToStorage(key, amount);
}

/**
 * Load seasonal currency for an event
 * @param {string} eventId - ID of the event
 * @returns {number} Amount of seasonal currency (defaults to 0)
 */
export function loadSeasonalCurrency(eventId) {
  const key = STORAGE_KEYS.SEASONAL_CURRENCY + eventId;
  return loadFromStorage(key, 0);
}

/**
 * Save seasonal task count for an event
 * @param {string} eventId - ID of the event
 * @param {number} count - Number of tasks completed during the event
 * @returns {boolean} Success status
 */
export function saveSeasonalTaskCount(eventId, count) {
  const key = STORAGE_KEYS.SEASONAL_TASK_COUNT + eventId;
  return saveToStorage(key, count);
}

/**
 * Load seasonal task count for an event
 * @param {string} eventId - ID of the event
 * @returns {number} Number of tasks completed (defaults to 0)
 */
export function loadSeasonalTaskCount(eventId) {
  const key = STORAGE_KEYS.SEASONAL_TASK_COUNT + eventId;
  return loadFromStorage(key, 0);
}

/**
 * Save seasonal unlocked backgrounds for an event
 * @param {string} eventId - ID of the event
 * @param {Array<string>} backgroundIds - Array of unlocked background IDs
 * @returns {boolean} Success status
 */
export function saveSeasonalUnlockedBackgrounds(eventId, backgroundIds) {
  const key = STORAGE_KEYS.SEASONAL_UNLOCKED_BACKGROUNDS + eventId;
  return saveToStorage(key, backgroundIds);
}

/**
 * Load seasonal unlocked backgrounds for an event
 * @param {string} eventId - ID of the event
 * @returns {Array<string>} Array of unlocked background IDs (defaults to empty array)
 */
export function loadSeasonalUnlockedBackgrounds(eventId) {
  const key = STORAGE_KEYS.SEASONAL_UNLOCKED_BACKGROUNDS + eventId;
  return loadFromStorage(key, []);
}

/**
 * Save event popup shown status
 * @param {string} eventId - ID of the event
 * @param {boolean} shown - Whether the popup was shown
 * @returns {boolean} Success status
 */
export function saveEventPopupShown(eventId, shown) {
  const key = STORAGE_KEYS.EVENT_POPUP_SHOWN + eventId;
  return saveToStorage(key, shown);
}

/**
 * Load event popup shown status
 * @param {string} eventId - ID of the event
 * @returns {boolean} Whether the popup was shown (defaults to false)
 */
export function loadEventPopupShown(eventId) {
  const key = STORAGE_KEYS.EVENT_POPUP_SHOWN + eventId;
  return loadFromStorage(key, false);
}

/**
 * Save event end popup shown status
 * @param {string} eventId - ID of the event
 * @param {boolean} shown - Whether the end popup was shown
 * @returns {boolean} Success status
 */
export function saveEventEndPopupShown(eventId, shown) {
  const key = STORAGE_KEYS.EVENT_END_POPUP_SHOWN + eventId;
  return saveToStorage(key, shown);
}

/**
 * Load event end popup shown status
 * @param {string} eventId - ID of the event
 * @returns {boolean} Whether the end popup was shown (defaults to false)
 */
export function loadEventEndPopupShown(eventId) {
  const key = STORAGE_KEYS.EVENT_END_POPUP_SHOWN + eventId;
  return loadFromStorage(key, false);
}

/**
 * Save last known purchasable seasonal backgrounds for an event
 * @param {string} eventId - ID of the event
 * @param {Array<string>} backgroundIds - Array of background IDs that were purchasable
 * @returns {boolean} Success status
 */
export function saveSeasonalLastKnownPurchasable(eventId, backgroundIds) {
  const key = STORAGE_KEYS.SEASONAL_LAST_KNOWN_PURCHASABLE + eventId;
  return saveToStorage(key, backgroundIds);
}

/**
 * Load last known purchasable seasonal backgrounds for an event
 * @param {string} eventId - ID of the event
 * @returns {Array<string>} Array of background IDs (defaults to empty array)
 */
export function loadSeasonalLastKnownPurchasable(eventId) {
  const key = STORAGE_KEYS.SEASONAL_LAST_KNOWN_PURCHASABLE + eventId;
  return loadFromStorage(key, []);
}

export { STORAGE_KEYS };

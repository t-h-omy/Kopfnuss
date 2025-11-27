// Kopfnuss - Storage Manager
// Handles all localStorage operations with error handling

/**
 * Storage keys for localStorage
 */
const STORAGE_KEYS = {
  CHALLENGES: 'kopfnuss_challenges_', // Will be appended with date
  PROGRESS: 'kopfnuss_progress',
  STREAK: 'kopfnuss_streak',
  DIAMONDS: 'kopfnuss_diamonds',
  DIAMONDS_EARNED: 'kopfnuss_diamonds_earned',
  UNLOCKED_BACKGROUNDS: 'kopfnuss_unlocked_backgrounds',
  SELECTED_BACKGROUND: 'kopfnuss_selected_background',
  LAST_KNOWN_PURCHASABLE_BACKGROUNDS: 'kopfnuss_last_known_purchasable_backgrounds'
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
 * Clear all app data (for reset/debugging)
 * @returns {boolean} Success status
 */
export function clearAllData() {
  try {
    // Get all keys that belong to Kopfnuss
    const keys = Object.keys(localStorage);
    const kopfnussKeys = keys.filter(key => key.startsWith('kopfnuss_'));
    
    // Remove all Kopfnuss keys
    kopfnussKeys.forEach(key => localStorage.removeItem(key));
    
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

export { STORAGE_KEYS };

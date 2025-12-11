// Kopfnuss - UI Bridge
// Bridge module for communication between logic modules and main UI
// This decouples logic modules from directly importing main.js

import { logError } from './logging.js';

// Module-level state (moved from main.js)
let currentScreen = null;
let currentChallengeIndex = null;
let returningFromTaskScreen = false;
let returningFromKopfnussScreen = false;
let returningFromZeitChallengeScreen = false;
let streakWasUnfrozen = false;
let streakWasIncremented = false;
let superChallengeResult = null;

// Function references (will be set by main.js via initialize)
let loadChallengesScreenFn = null;
let loadTaskScreenFn = null;
let loadKopfnussTaskScreenFn = null;
let loadZeitChallengeTaskScreenFn = null;
let loadStatsScreenFn = null;

// Challenge result notification callbacks
let notifyKopfnussChallengeResultCallback = null;
let notifyZeitChallengeResultCallback = null;

/**
 * Initialize the UI bridge with references to main.js screen loading functions
 * This must be called by main.js during initialization
 * @param {Object} functions - Object containing screen loading functions
 */
export function initializeUIBridge(functions) {
  loadChallengesScreenFn = functions.loadChallengesScreen;
  loadTaskScreenFn = functions.loadTaskScreen;
  loadKopfnussTaskScreenFn = functions.loadKopfnussTaskScreen;
  loadZeitChallengeTaskScreenFn = functions.loadZeitChallengeTaskScreen;
  loadStatsScreenFn = functions.loadStatsScreen;
}

/**
 * Get current screen state (for main.js to read)
 * @returns {Object} Current screen state
 */
export function getScreenState() {
  return {
    currentScreen,
    currentChallengeIndex,
    returningFromTaskScreen,
    returningFromKopfnussScreen,
    returningFromZeitChallengeScreen,
    streakWasUnfrozen,
    streakWasIncremented,
    superChallengeResult
  };
}

/**
 * Set screen state values (for main.js to modify)
 * @param {Object} state - State object with properties to set
 */
export function setScreenState(state) {
  if (state.hasOwnProperty('currentScreen')) currentScreen = state.currentScreen;
  if (state.hasOwnProperty('currentChallengeIndex')) currentChallengeIndex = state.currentChallengeIndex;
  if (state.hasOwnProperty('returningFromTaskScreen')) returningFromTaskScreen = state.returningFromTaskScreen;
  if (state.hasOwnProperty('returningFromKopfnussScreen')) returningFromKopfnussScreen = state.returningFromKopfnussScreen;
  if (state.hasOwnProperty('returningFromZeitChallengeScreen')) returningFromZeitChallengeScreen = state.returningFromZeitChallengeScreen;
  if (state.hasOwnProperty('streakWasUnfrozen')) streakWasUnfrozen = state.streakWasUnfrozen;
  if (state.hasOwnProperty('streakWasIncremented')) streakWasIncremented = state.streakWasIncremented;
  if (state.hasOwnProperty('superChallengeResult')) superChallengeResult = state.superChallengeResult;
}

/**
 * Show a screen by name
 * @param {string} screenName - Name of screen to show ('challenges', 'taskScreen', 'stats', 'kopfnussTaskScreen', 'zeitChallengeTaskScreen')
 * @param {*} data - Optional data to pass to screen (e.g., challengeIndex)
 */
export function showScreen(screenName, data = null) {
  const mainContent = document.getElementById('main-content');
  
  if (!mainContent) {
    logError('Main content element not found');
    return;
  }
  
  // Track if we're returning from task screen to challenges
  if (currentScreen === 'taskScreen' && screenName === 'challenges') {
    returningFromTaskScreen = true;
  }
  
  // Track if we're returning from Kopfnuss task screen to challenges
  if (currentScreen === 'kopfnussTaskScreen' && screenName === 'challenges') {
    returningFromKopfnussScreen = true;
  }
  
  // Track if we're returning from Zeit-Challenge task screen to challenges
  if (currentScreen === 'zeitChallengeTaskScreen' && screenName === 'challenges') {
    returningFromZeitChallengeScreen = true;
    // Cleanup Zeit challenge when leaving
    import('./zeitChallengeTaskController.js').then(module => {
      if (module.cleanupZeitChallengeTaskScreen) {
        module.cleanupZeitChallengeTaskScreen();
      }
    }).catch(() => {
      // Silently ignore if module not loaded
    });
  }
  
  // Store current screen
  currentScreen = screenName;
  
  // Clear current content
  mainContent.innerHTML = '';
  
  // Manage body class for task screen keyboard stability
  if (screenName === 'taskScreen' || screenName === 'kopfnussTaskScreen' || screenName === 'zeitChallengeTaskScreen') {
    document.body.classList.add('task-screen-active');
  } else {
    document.body.classList.remove('task-screen-active');
  }
  
  // Route to appropriate screen
  switch (screenName) {
    case 'challenges':
      if (loadChallengesScreenFn) loadChallengesScreenFn(mainContent);
      break;
    case 'taskScreen':
      currentChallengeIndex = data;
      if (loadTaskScreenFn) loadTaskScreenFn(mainContent, data);
      break;
    case 'kopfnussTaskScreen':
      if (loadKopfnussTaskScreenFn) loadKopfnussTaskScreenFn(mainContent);
      break;
    case 'zeitChallengeTaskScreen':
      if (loadZeitChallengeTaskScreenFn) loadZeitChallengeTaskScreenFn(mainContent);
      break;
    case 'stats':
      if (loadStatsScreenFn) loadStatsScreenFn(mainContent);
      break;
    default:
      logError('Unknown screen:', screenName);
  }
}

/**
 * Notify that streak was unfrozen by completing a challenge
 * This sets a flag that will trigger the streak unfrozen popup when returning to challenges screen
 * @param {number} newStreak - New streak count after unfreezing
 */
export function notifyStreakUnfrozen(newStreak) {
  streakWasUnfrozen = newStreak;
}

/**
 * Notify that streak was incremented by completing a challenge
 * This sets a flag that will trigger the streak celebration popup when returning to challenges screen
 * @param {number} newStreak - New streak count after incrementing
 */
export function notifyStreakIncremented(newStreak) {
  streakWasIncremented = newStreak;
}

/**
 * Notify super challenge result
 * This sets a flag that will trigger the appropriate popup when returning to challenges screen
 * @param {boolean} success - Whether the super challenge was completed without errors
 * @param {boolean} awardedDiamond - Whether a diamond was awarded
 * @param {Object|null} seasonalCurrencyAwarded - Seasonal currency info if awarded
 */
export function notifySuperChallengeResult(success, awardedDiamond, seasonalCurrencyAwarded = null) {
  superChallengeResult = { success, awardedDiamond, seasonalCurrencyAwarded };
}

/**
 * Register challenge result handler callbacks
 * This allows main.js to provide handlers for challenge result notifications
 * @param {Object} handlers - Object containing handler functions
 */
export function registerChallengeResultHandlers(handlers) {
  notifyKopfnussChallengeResultCallback = handlers.notifyKopfnussChallengeResult;
  notifyZeitChallengeResultCallback = handlers.notifyZeitChallengeResult;
}

/**
 * Bridge function to notify Kopfnuss Challenge result
 * @param {boolean} success - Whether the challenge was completed without errors
 * @param {Object|null} reward - Reward info if successful
 */
export function notifyKopfnussChallengeResultBridge(success, reward = null) {
  if (notifyKopfnussChallengeResultCallback) {
    notifyKopfnussChallengeResultCallback(success, reward);
  }
}

/**
 * Bridge function to notify Zeit-Challenge result
 * @param {boolean} success - Whether the challenge was completed in time
 * @param {Object|null} reward - Reward info if successful
 */
export function notifyZeitChallengeResultBridge(success, reward = null) {
  if (notifyZeitChallengeResultCallback) {
    notifyZeitChallengeResultCallback(success, reward);
  }
}

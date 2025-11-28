// Kopfnuss - Background Manager
// Manages background unlocking, selection, and display

import { BACKGROUNDS } from '../data/balancing.js';
import { 
  loadUnlockedBackgrounds, 
  saveUnlockedBackgrounds,
  loadSelectedBackground,
  saveSelectedBackground,
  loadDiamonds,
  saveDiamonds,
  loadProgress,
  loadLastKnownPurchasableBackgrounds,
  saveLastKnownPurchasableBackgrounds
} from './storageManager.js';

/**
 * Background states for shop display
 */
export const BACKGROUND_STATE = {
  LOCKED: 'locked',       // Not enough tasks completed
  PURCHASABLE: 'purchasable', // Requirement fulfilled, can buy with diamonds
  UNLOCKED: 'unlocked',   // Already purchased
  ACTIVE: 'active'        // Currently selected
};

/**
 * Get the state of a background for shop display
 * @param {Object} background - Background object from BACKGROUNDS config
 * @returns {string} One of BACKGROUND_STATE values
 */
export function getBackgroundState(background) {
  const selectedId = loadSelectedBackground();
  const unlockedIds = loadUnlockedBackgrounds();
  const progress = loadProgress();
  const totalTasksCompleted = progress.totalTasksCompleted || 0;
  
  // Check if this is the active background
  if (background.id === selectedId) {
    return BACKGROUND_STATE.ACTIVE;
  }
  
  // Check if already unlocked/purchased
  if (background.isDefault || unlockedIds.includes(background.id)) {
    return BACKGROUND_STATE.UNLOCKED;
  }
  
  // Check if requirement is fulfilled
  const tasksRequired = background.tasksRequired || 0;
  if (totalTasksCompleted >= tasksRequired) {
    return BACKGROUND_STATE.PURCHASABLE;
  }
  
  // Still locked
  return BACKGROUND_STATE.LOCKED;
}

/**
 * Get tasks remaining until a background becomes purchasable
 * @param {Object} background - Background object from BACKGROUNDS config
 * @returns {number} Number of tasks remaining (0 if already purchasable)
 */
export function getTasksRemaining(background) {
  const progress = loadProgress();
  const totalTasksCompleted = progress.totalTasksCompleted || 0;
  const tasksRequired = background.tasksRequired || 0;
  
  return Math.max(0, tasksRequired - totalTasksCompleted);
}

/**
 * Get all available backgrounds with their unlock status and state
 * Backgrounds are sorted by tasksRequired (lowest first)
 * @returns {Array<Object>} Array of background objects with unlock status and state
 */
export function getAllBackgrounds() {
  const unlockedIds = loadUnlockedBackgrounds();
  
  return Object.values(BACKGROUNDS)
    .map(bg => ({
      ...bg,
      isUnlocked: bg.isDefault || unlockedIds.includes(bg.id),
      state: getBackgroundState(bg),
      tasksRemaining: getTasksRemaining(bg)
    }))
    .sort((a, b) => (a.tasksRequired || 0) - (b.tasksRequired || 0));
}

/**
 * Get list of backgrounds that are currently purchasable (requirement fulfilled but not yet bought)
 * @returns {Array<string>} Array of background IDs that are purchasable
 */
export function getPurchasableBackgroundIds() {
  const allBackgrounds = getAllBackgrounds();
  return allBackgrounds
    .filter(bg => bg.state === BACKGROUND_STATE.PURCHASABLE)
    .map(bg => bg.id);
}

/**
 * Check for newly purchasable backgrounds (became purchasable since last check)
 * @returns {Object} Object with newlyPurchasable array and firstNewBackground object
 */
export function checkForNewlyPurchasableBackgrounds() {
  const currentPurchasable = getPurchasableBackgroundIds();
  const lastKnownPurchasable = loadLastKnownPurchasableBackgrounds();
  const unlockedIds = loadUnlockedBackgrounds();
  
  // Find backgrounds that are now purchasable but weren't before
  const newlyPurchasable = currentPurchasable.filter(
    id => !lastKnownPurchasable.includes(id)
  );
  
  // Update the stored list: combine with current purchasable, but remove any that have been purchased
  // This ensures we don't show celebration popup for backgrounds that were already handled
  const allKnownPurchasable = [...new Set([...lastKnownPurchasable, ...currentPurchasable])]
    .filter(id => !unlockedIds.includes(id)); // Remove purchased backgrounds
  saveLastKnownPurchasableBackgrounds(allKnownPurchasable);
  
  // Get the first newly purchasable background object for display
  const firstNewBackground = newlyPurchasable.length > 0 
    ? BACKGROUNDS[newlyPurchasable[0]] 
    : null;
  
  return {
    newlyPurchasable,
    firstNewBackground,
    hasNew: newlyPurchasable.length > 0
  };
}

/**
 * Get the currently selected background
 * @returns {Object} The selected background object
 */
export function getSelectedBackground() {
  const selectedId = loadSelectedBackground();
  const background = BACKGROUNDS[selectedId];
  
  // If selected background doesn't exist, return default
  if (!background) {
    return BACKGROUNDS.default;
  }
  
  return background;
}

/**
 * Get the file path for the currently selected background
 * @returns {string} The file path to the background image
 */
export function getSelectedBackgroundPath() {
  const background = getSelectedBackground();
  return `./assets/${background.file}`;
}

/**
 * Check if a background is unlocked
 * @param {string} backgroundId - The ID of the background to check
 * @returns {boolean} True if the background is unlocked
 */
export function isBackgroundUnlocked(backgroundId) {
  const background = BACKGROUNDS[backgroundId];
  if (!background) return false;
  if (background.isDefault) return true;
  
  const unlockedIds = loadUnlockedBackgrounds();
  return unlockedIds.includes(backgroundId);
}

/**
 * Unlock a background by spending diamonds
 * Requires the background to be purchasable (task requirement fulfilled)
 * @param {string} backgroundId - The ID of the background to unlock
 * @returns {Object} Result with success status and message
 */
export function unlockBackground(backgroundId) {
  const background = BACKGROUNDS[backgroundId];
  
  if (!background) {
    return {
      success: false,
      message: 'Hintergrund nicht gefunden'
    };
  }
  
  if (background.isDefault) {
    return {
      success: false,
      message: 'Standard-Hintergrund ist bereits freigeschaltet'
    };
  }
  
  if (isBackgroundUnlocked(backgroundId)) {
    return {
      success: false,
      message: 'Hintergrund ist bereits freigeschaltet'
    };
  }
  
  // Check if task requirement is fulfilled
  const state = getBackgroundState(background);
  if (state === BACKGROUND_STATE.LOCKED) {
    const tasksRemaining = getTasksRemaining(background);
    return {
      success: false,
      message: `Noch ${tasksRemaining} Aufgaben nötig`,
      isLocked: true
    };
  }
  
  const currentDiamonds = loadDiamonds();
  const cost = background.cost;
  
  if (currentDiamonds < cost) {
    return {
      success: false,
      message: `Nicht genug Diamanten. Du brauchst ${cost} 💎`,
      notEnoughDiamonds: true
    };
  }
  
  // Deduct diamonds
  const newDiamondCount = currentDiamonds - cost;
  saveDiamonds(newDiamondCount);
  
  // Add to unlocked backgrounds
  const unlockedIds = loadUnlockedBackgrounds();
  unlockedIds.push(backgroundId);
  saveUnlockedBackgrounds(unlockedIds);
  
  return {
    success: true,
    message: 'Hintergrund freigeschaltet!',
    newDiamondCount,
    background
  };
}

/**
 * Select a background as the current background
 * @param {string} backgroundId - The ID of the background to select
 * @returns {Object} Result with success status and message
 */
export function selectBackground(backgroundId) {
  const background = BACKGROUNDS[backgroundId];
  
  if (!background) {
    return {
      success: false,
      message: 'Hintergrund nicht gefunden'
    };
  }
  
  if (!isBackgroundUnlocked(backgroundId)) {
    return {
      success: false,
      message: 'Hintergrund muss zuerst freigeschaltet werden'
    };
  }
  
  saveSelectedBackground(backgroundId);
  
  return {
    success: true,
    message: 'Hintergrund ausgewählt!',
    background
  };
}

/**
 * Apply the selected background to the document
 * Updates the CSS variable for background image
 */
export function applySelectedBackground() {
  const backgroundPath = getSelectedBackgroundPath();
  document.documentElement.style.setProperty('--selected-background', `url('${backgroundPath}')`);
}

/**
 * Get background info for display
 * @param {string} backgroundId - The ID of the background
 * @returns {Object|null} Background info or null if not found
 */
export function getBackgroundInfo(backgroundId) {
  return BACKGROUNDS[backgroundId] || null;
}

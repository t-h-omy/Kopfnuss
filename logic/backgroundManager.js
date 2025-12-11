// Kopfnuss - Background Manager
// Manages background unlocking, selection, and display

import { BACKGROUNDS_UNIFIED } from '../data/balancingLoader.js';
import { 
  loadUnlockedBackgrounds, 
  saveUnlockedBackgrounds,
  loadSelectedBackground,
  saveSelectedBackground,
  loadDiamonds,
  saveDiamonds,
  loadProgress,
  loadLastKnownPurchasableBackgrounds,
  saveLastKnownPurchasableBackgrounds,
  wasShopOpenedWithNewBackgrounds,
  clearShopOpenedFlag
} from './storageManager.js';

/**
 * @typedef {Object} BackgroundRequirements
 * @property {number} [minTasksSinceStart] - Minimum tasks since app start (for standard backgrounds)
 * @property {number} [minTasksSinceEventStart] - Minimum tasks since event start (for seasonal backgrounds)
 */

/**
 * @typedef {Object} Background
 * @property {string} id - Unique identifier for the background
 * @property {string} name - Display name of the background
 * @property {string} file - File path to the background image
 * @property {string} category - Category: 'standard' or 'seasonal'
 * @property {number} cost - Cost in diamonds or seasonal currency
 * @property {string} currency - Currency type: 'diamonds' or 'seasonal'
 * @property {BackgroundRequirements} requirements - Unlock requirements
 * @property {boolean} active - Whether this background is currently active in the game
 * @property {boolean} [isDefault] - Whether this is the default background
 * @property {string} [event] - Event ID for seasonal backgrounds
 * @property {boolean} [isSeasonal] - Whether this is a seasonal background (legacy format)
 * @property {number} [tasksRequired] - Number of tasks required (legacy format)
 * @property {string} state - Current state (locked, purchasable, unlocked, active) - computed field
 * @property {number} [tasksRemaining] - Tasks remaining to unlock (computed field)
 * @property {boolean} [isNewlyPurchasable] - Whether this is newly purchasable (computed field)
 */

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
 * Convert unified background schema to legacy format for backward compatibility
 * @param {Object} unifiedBg - Background in new unified schema
 * @returns {Background} Background in legacy format
 */
function convertToLegacyFormat(unifiedBg) {
  const legacy = {
    id: unifiedBg.id,
    name: unifiedBg.name,
    file: unifiedBg.file,
    cost: unifiedBg.cost
  };
  
  // Add tasksRequired based on category
  if (unifiedBg.category === 'standard') {
    legacy.tasksRequired = unifiedBg.requirements.minTasksSinceStart || 0;
  } else {
    // Seasonal backgrounds
    legacy.tasksRequired = unifiedBg.requirements.minTasksSinceEventStart || 0;
    legacy.eventId = unifiedBg.event;
    legacy.isSeasonal = true;
  }
  
  if (unifiedBg.isDefault) {
    legacy.isDefault = true;
  }
  
  return legacy;
}

/**
 * Get all standard backgrounds from unified structure
 * Returns backgrounds in legacy format for compatibility
 * @returns {Object} Object with background IDs as keys
 */
function getBackgroundsSource() {
  const backgrounds = {};
  
  // Safety check: ensure BACKGROUNDS_UNIFIED is an array
  if (!Array.isArray(BACKGROUNDS_UNIFIED)) {
    console.warn('[BackgroundManager] BACKGROUNDS_UNIFIED is not an array, returning empty object');
    return backgrounds;
  }
  
  // Filter for standard backgrounds only
  BACKGROUNDS_UNIFIED
    .filter(bg => bg.category === 'standard' && bg.active)
    .forEach(bg => {
      backgrounds[bg.id] = convertToLegacyFormat(bg);
    });
  
  return backgrounds;
}

/**
 * Get seasonal backgrounds from unified structure
 * Returns backgrounds in legacy format for compatibility
 * @returns {Object} Object with background IDs as keys
 */
function getSeasonalBackgroundsSource() {
  const backgrounds = {};
  
  // Safety check: ensure BACKGROUNDS_UNIFIED is an array
  if (!Array.isArray(BACKGROUNDS_UNIFIED)) {
    console.warn('[BackgroundManager] BACKGROUNDS_UNIFIED is not an array, returning empty object');
    return backgrounds;
  }
  
  // Filter for seasonal backgrounds only
  BACKGROUNDS_UNIFIED
    .filter(bg => bg.category === 'seasonal' && bg.active)
    .forEach(bg => {
      backgrounds[bg.id] = convertToLegacyFormat(bg);
    });
  
  return backgrounds;
}

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
 * @returns {Background[]} Array of background objects with unlock status and state
 */
export function getAllBackgrounds() {
  const unlockedIds = loadUnlockedBackgrounds();
  const shopOpened = wasShopOpenedWithNewBackgrounds();
  
  const backgroundsSource = getBackgroundsSource();
  
  const backgrounds = Object.values(backgroundsSource)
    .map(bg => {
      const state = getBackgroundState(bg);
      return {
        ...bg,
        isUnlocked: bg.isDefault || unlockedIds.includes(bg.id),
        state: state,
        tasksRemaining: getTasksRemaining(bg),
        // Show NEW badge if background is purchasable and shop hasn't been opened since it became available
        isNewlyPurchasable: state === BACKGROUND_STATE.PURCHASABLE && !shopOpened
      };
    })
    .sort((a, b) => (a.tasksRequired || 0) - (b.tasksRequired || 0));
  
  return backgrounds;
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
    const unlockedIds = loadUnlockedBackgrounds();
    const updatedKnownPurchasable = [...new Set([...lastKnownPurchasable, ...newlyPurchasable])]
      .filter(id => !unlockedIds.includes(id));
    saveLastKnownPurchasableBackgrounds(updatedKnownPurchasable);
  }
  
  // Get the first newly purchasable background object for display
  const backgroundsSource = getBackgroundsSource();
  const firstNewBackground = newlyPurchasable.length > 0 
    ? backgroundsSource[newlyPurchasable[0]] 
    : null;
  
  return {
    newlyPurchasable,
    firstNewBackground,
    hasNew: newlyPurchasable.length > 0
  };
}

/**
 * Update the list of known purchasable backgrounds
 * Should be called when shop is closed to mark backgrounds as "seen"
 */
export function updateKnownPurchasableBackgrounds() {
  const currentPurchasable = getPurchasableBackgroundIds();
  const lastKnownPurchasable = loadLastKnownPurchasableBackgrounds();
  const unlockedIds = loadUnlockedBackgrounds();
  
  // Combine current and last known, but remove any that have been purchased
  const allKnownPurchasable = [...new Set([...lastKnownPurchasable, ...currentPurchasable])]
    .filter(id => !unlockedIds.includes(id));
  
  saveLastKnownPurchasableBackgrounds(allKnownPurchasable);
}

/**
 * Get the currently selected background
 * @returns {Background} The selected background object
 */
export function getSelectedBackground() {
  const selectedId = loadSelectedBackground();
  
  const backgroundsSource = getBackgroundsSource();
  const seasonalBackgroundsSource = getSeasonalBackgroundsSource();
  
  // Check regular backgrounds first
  const background = backgroundsSource[selectedId];
  if (background) {
    return background;
  }
  
  // Check seasonal backgrounds
  const seasonalBackground = seasonalBackgroundsSource[selectedId];
  if (seasonalBackground) {
    return seasonalBackground;
  }
  
  // If selected background doesn't exist in either, return default background
  // Explicitly check for 'default' ID first, then fallback to first background
  if (backgroundsSource['default']) {
    return backgroundsSource['default'];
  }
  
  // Final fallback: return first available background
  const firstId = Object.keys(backgroundsSource)[0];
  if (firstId) {
    return backgroundsSource[firstId];
  }
  
  // This should never happen, but provide a minimal fallback
  return {
    id: 'default',
    name: 'Standard',
    file: 'backgrounds/01_default/background_compressed.webp',
    cost: 0,
    tasksRequired: 0,
    isDefault: true
  };
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
  const backgroundsSource = getBackgroundsSource();
  const background = backgroundsSource[backgroundId];
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
  const backgroundsSource = getBackgroundsSource();
  const background = backgroundsSource[backgroundId];
  
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
  const backgroundsSource = getBackgroundsSource();
  const background = backgroundsSource[backgroundId];
  
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
 * @returns {Background|null} Background info or null if not found
 */
export function getBackgroundInfo(backgroundId) {
  const backgroundsSource = getBackgroundsSource();
  return backgroundsSource[backgroundId] || null;
}

/**
 * Check if NEW badge should be shown (backgrounds are purchasable and shop hasn't been opened yet)
 * @returns {boolean} True if NEW badge should be shown
 */
export function shouldShowNewBadge() {
  // Check if any backgrounds are currently purchasable
  const purchasableIds = getPurchasableBackgroundIds();
  if (purchasableIds.length === 0) {
    return false;
  }
  
  // Check if shop was already opened with these backgrounds
  return !wasShopOpenedWithNewBackgrounds();
}

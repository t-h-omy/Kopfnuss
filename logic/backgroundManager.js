// Kopfnuss - Background Manager
// Manages background unlocking, selection, and display

import { BACKGROUNDS } from '../data/balancing.js';
import { 
  loadUnlockedBackgrounds, 
  saveUnlockedBackgrounds,
  loadSelectedBackground,
  saveSelectedBackground,
  loadDiamonds,
  saveDiamonds
} from './storageManager.js';

/**
 * Get all available backgrounds with their unlock status
 * @returns {Array<Object>} Array of background objects with unlock status
 */
export function getAllBackgrounds() {
  const unlockedIds = loadUnlockedBackgrounds();
  
  return Object.values(BACKGROUNDS).map(bg => ({
    ...bg,
    isUnlocked: bg.isDefault || unlockedIds.includes(bg.id)
  }));
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

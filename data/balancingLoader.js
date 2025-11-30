// Kopfnuss - Balancing Loader Module
// This is the ONLY entry point for balancing data in the entire app.
// Dynamically loads either production or development balancing based on dev mode setting.

/**
 * Check if dev mode is enabled (reads directly from localStorage to avoid circular imports)
 * NOTE: This duplicates logic from storageManager.js intentionally to avoid circular imports,
 * since storageManager.js imports from this file. The dev mode check only happens once
 * during module initialization, and changing dev mode requires an app reload anyway.
 * @returns {boolean} True if dev mode is enabled
 */
function isDevModeEnabled() {
  try {
    const item = localStorage.getItem('kopfnuss_use_dev_balancing');
    if (item === null) {
      return false;
    }
    return JSON.parse(item) === true;
  } catch (error) {
    console.error('Error checking dev mode:', error);
    return false;
  }
}

// Determine which balancing to use based on dev mode (evaluated once at module load)
const useDevBalancing = isDevModeEnabled();

// Load the appropriate balancing file using top-level await
const balancingFile = useDevBalancing ? './balancing_dev.json' : './balancing_prod.json';
const response = await fetch(new URL(balancingFile, import.meta.url));
if (!response.ok) {
  throw new Error(`Failed to load balancing file: ${balancingFile}, status: ${response.status}`);
}
const balancingData = await response.json();

console.log(`[BalancingLoader] Loaded ${useDevBalancing ? 'DEV' : 'PROD'} balancing`);

/**
 * Balancing values for different mathematical operations
 * Designed for 6th grade level (10-12 years old)
 * Applied in: logic/taskGenerators.js
 */
export const BALANCING = balancingData.BALANCING;

/**
 * Game configuration constants
 * Applied in: Various game logic files
 */
export const CONFIG = balancingData.CONFIG;

/**
 * Challenge type definitions
 * Applied in: logic/challengeGenerator.js
 */
export const CHALLENGE_TYPES = balancingData.CHALLENGE_TYPES;

/**
 * Background customization configuration
 * Applied in: logic/backgroundManager.js, main.js
 */
export const BACKGROUNDS = balancingData.BACKGROUNDS;

/**
 * Seasonal events configuration
 * Applied in: logic/eventManager.js
 */
export const SEASONAL_EVENTS = balancingData.SEASONAL_EVENTS;

/**
 * Seasonal backgrounds configuration
 * Applied in: logic/backgroundManager.js, logic/eventManager.js
 */
export const SEASONAL_BACKGROUNDS = balancingData.SEASONAL_BACKGROUNDS;

/**
 * Check if currently using dev balancing
 * @returns {boolean} True if dev balancing is loaded
 */
export function isUsingDevBalancing() {
  return useDevBalancing;
}

/**
 * Get the full balancing data object
 * Useful for debugging or when all data is needed at once
 * @returns {Object} Complete balancing data
 */
export function getFullBalancingData() {
  return { ...balancingData };
}

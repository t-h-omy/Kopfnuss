// Kopfnuss - Balancing Configuration
// Defines min/max values for each operation type
// Used by: logic/taskGenerators.js
// 
// Balancing values are loaded from JSON files based on dev mode setting:
// - Production: data/balancing.production.json
// - Dev mode: data/balancing.dev.json

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

/**
 * Default balancing values (production)
 * These are used as fallback if JSON loading fails
 */
const DEFAULT_BALANCING = {
  addition: {
    min: 10,
    max: 1500
  },
  subtraction: {
    min: 10,
    max: 999
  },
  multiplication: {
    factor1: { min: 2, max: 20 },
    factor2: { min: 2, max: 20 }
  },
  division: {
    divisor: { min: 2, max: 12 },
    quotient: { min: 2, max: 20 }
  },
  squared: {
    min: 2,
    max: 20
  }
};

/**
 * Dev balancing values (easier for testing)
 */
const DEV_BALANCING = {
  addition: {
    min: 1,
    max: 10
  },
  subtraction: {
    min: 1,
    max: 10
  },
  multiplication: {
    factor1: { min: 1, max: 5 },
    factor2: { min: 1, max: 5 }
  },
  division: {
    divisor: { min: 2, max: 5 },
    quotient: { min: 1, max: 5 }
  },
  squared: {
    min: 1,
    max: 5
  }
};

/**
 * Balancing values for different mathematical operations
 * Designed for 6th grade level (10-12 years old)
 * Applied in: logic/taskGenerators.js - generateAdditionTask(), generateSubtractionTask(), etc.
 */
export const BALANCING = useDevBalancing ? DEV_BALANCING : DEFAULT_BALANCING;

/**
 * Default game configuration constants (production)
 */
const DEFAULT_CONFIG = {
  TASKS_PER_CHALLENGE: 8,
  DAILY_CHALLENGES: 5,
  TASKS_FOR_STREAK: 10,
  TASKS_PER_DIAMOND: 80,
  STREAK_RESCUE_COST: 1,
  FREEZE_AFTER_DAYS: 1,
  LOSE_AFTER_DAYS: 2
};

/**
 * Dev game configuration constants (faster progression for testing)
 */
const DEV_CONFIG = {
  TASKS_PER_CHALLENGE: 2,
  DAILY_CHALLENGES: 5,
  TASKS_FOR_STREAK: 2,
  TASKS_PER_DIAMOND: 4,
  STREAK_RESCUE_COST: 1,
  FREEZE_AFTER_DAYS: 1,
  LOSE_AFTER_DAYS: 2
};

/**
 * Game configuration constants
 * Applied in: Various game logic files
 */
export const CONFIG = useDevBalancing ? DEV_CONFIG : DEFAULT_CONFIG;

/**
 * Challenge type definitions
 * Applied in: logic/challengeGenerator.js - used for challenge node display
 */
export const CHALLENGE_TYPES = {
  addition: {
    name: 'Addition',
    icon: '➕',
    difficulty: 1
  },
  subtraction: {
    name: 'Subtraktion',
    icon: '➖',
    difficulty: 1
  },
  multiplication: {
    name: 'Multiplikation',
    icon: '✖️',
    difficulty: 2
  },
  division: {
    name: 'Division',
    icon: '➗',
    difficulty: 2
  },
  mixed: {
    name: 'Gemischt',
    icon: '🎲',
    difficulty: 3
  },
  squared: {
    name: 'Quadratzahlen',
    icon: 'x²',
    difficulty: 2
  }
};

/**
 * Background customization configuration
 * Applied in: logic/backgroundManager.js, main.js - Background Customization Screen
 * 
 * Each background has a tasksRequired property that determines how many total
 * completed tasks are needed before the background becomes purchasable.
 * The default background (tasksRequired: 0) is always available.
 */
export const BACKGROUNDS = {
  // Default background - always unlocked, cannot be purchased
  default: {
    id: 'default',
    name: 'Standard',
    file: 'backgrounds/background_compressed.webp',
    cost: 0,
    tasksRequired: 0,
    isDefault: true
  },
  // Unlockable backgrounds - can be purchased with diamonds after completing enough tasks
  sunset: {
    id: 'sunset',
    name: 'Sonnenuntergang',
    file: 'backgrounds/sunset_background_optimized.webp',
    cost: 2,
    tasksRequired: 70
  },
  unicorn: {
    id: 'unicorn',
    name: 'Einhorn',
    file: 'backgrounds/unicorn_background_optimized.webp',
    cost: 2,
    tasksRequired: 210
  },
  candy: {
    id: 'candy',
    name: 'Süßigkeiten',
    file: 'backgrounds/candy_background_optimized.webp',
    cost: 2,
    tasksRequired: 140
  },
  maineCoon: {
    id: 'maineCoon',
    name: 'Maine Coon',
    file: 'backgrounds/maine_coon_background_optimized.webp',
    cost: 2,
    tasksRequired: 280
  }
};

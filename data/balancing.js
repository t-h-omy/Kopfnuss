// Kopfnuss - Balancing Configuration
// Defines min/max values for each operation type
// Used by: logic/taskGenerators.js

/**
 * Balancing values for different mathematical operations
 * Designed for 6th grade level (10-12 years old)
 * Applied in: logic/taskGenerators.js - generateAdditionTask(), generateSubtractionTask(), etc.
 */
export const BALANCING = {
  // Addition task number range
  // Applied in: logic/taskGenerators.js - generateAdditionTask()
  addition: {
    min: 10,
    max: 1500
  },
  
  // Subtraction task number range (results are always positive)
  // Applied in: logic/taskGenerators.js - generateSubtractionTask()
  subtraction: {
    min: 10,
    max: 999
  },
  
  // Multiplication factor ranges
  // Applied in: logic/taskGenerators.js - generateMultiplicationTask()
  multiplication: {
    factor1: { min: 2, max: 20 },
    factor2: { min: 2, max: 20 }
  },
  
  // Division ranges (results are always whole numbers)
  // Applied in: logic/taskGenerators.js - generateDivisionTask()
  division: {
    divisor: { min: 2, max: 12 },
    quotient: { min: 2, max: 20 }
  },
  
  // Squared number range (z² where z is between min and max)
  // Applied in: logic/taskGenerators.js - generateSquaredTask()
  squared: {
    min: 2,
    max: 20
  }
};

/**
 * Game configuration constants
 * Applied in: Various game logic files
 */
export const CONFIG = {
  // Number of tasks shown per challenge session
  // Applied in: logic/challengeGenerator.js, logic/taskFlow.js
  TASKS_PER_CHALLENGE: 8,
  
  // Number of challenge nodes displayed on the challenges screen
  // Applied in: logic/challengeGenerator.js - generateDailyChallenges()
  DAILY_CHALLENGES: 5,
  
  // Minimum completed tasks per day to maintain/increment streak
  // Applied in: logic/streakManager.js
  TASKS_FOR_STREAK: 10,
  
  // Number of completed tasks needed to earn one diamond
  // Applied in: logic/diamondManager.js, main.js - diamond progress display
  TASKS_PER_DIAMOND: 80,
  
  // Diamond cost to rescue an expired streak
  // Applied in: main.js - showStreakRestorablePopup(), logic/streakManager.js
  STREAK_RESCUE_COST: 1,
  
  // Days of inactivity before streak freezes (shows frozen state)
  // Applied in: logic/streakManager.js - checkStreakStatusOnLoad()
  FREEZE_AFTER_DAYS: 1,
  
  // Days of inactivity before streak is permanently lost
  // Applied in: logic/streakManager.js - checkStreakStatusOnLoad()
  LOSE_AFTER_DAYS: 2
};

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

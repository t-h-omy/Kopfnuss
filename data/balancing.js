// Kopfnuss - Balancing Configuration
// Defines min/max values for each operation type

/**
 * Balancing values for different mathematical operations
 * Designed for 6th grade level (10-12 years old)
 */
export const BALANCING = {
  // Addition
  addition: {
    min: 10,
    max: 999
  },
  
  // Subtraction: Ensure positive results
  subtraction: {
    min: 10,
    max: 99
  },
  
  // Multiplication: One factor 2-12, other 2-20
  multiplication: {
    factor1: { min: 2, max: 12 },
    factor2: { min: 2, max: 20 }
  },
  
  // Division: Results should be whole numbers
  division: {
    divisor: { min: 2, max: 12 },
    quotient: { min: 2, max: 20 }
  },
  
  // Squared: z² where z is between min and max
  squared: {
    min: 2,
    max: 12
  }
};

/**
 * Game configuration constants
 */
export const CONFIG = {
  // Number of tasks per challenge
  TASKS_PER_CHALLENGE: 10,
  
  // Number of daily challenges
  DAILY_CHALLENGES: 5,
  
  // Minimum tasks per day to maintain streak
  TASKS_FOR_STREAK: 10,
  
  // Tasks needed to earn one diamond
  TASKS_PER_DIAMOND: 9,
  
  // Cost to rescue a streak
  STREAK_RESCUE_COST: 1,
  
  // Days before streak freezes
  FREEZE_AFTER_DAYS: 1,
  
  // Days before streak is lost
  LOSE_AFTER_DAYS: 2
};

/**
 * Challenge type definitions
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

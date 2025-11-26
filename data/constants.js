// Kopfnuss - Application Constants
// Centralized constants for animation timing, sparkle effects, and UI configuration

/**
 * Animation timing constants (in milliseconds)
 * These values should match corresponding CSS animation durations
 */
export const ANIMATION_TIMING = {
  // Focus highlight for challenge nodes - must match .challenge-focus-highlight in style.css
  FOCUS_HIGHLIGHT_DURATION: 800,
  
  // Reward button highlight - must match .reward-button-focus-highlight in style.css
  REWARD_HIGHLIGHT_DURATION: 1500,
  
  // Time before sparkle elements are removed
  SPARKLE_ANIMATION_DURATION: 1500,
  
  // First additional sparkle wave delay
  SPARKLE_WAVE_DELAY_1: 400,
  
  // Second additional sparkle wave delay
  SPARKLE_WAVE_DELAY_2: 800,
  
  // Time to wait for smooth scroll to settle before showing highlight
  SCROLL_SETTLE_DELAY: 300,
  
  // Time to wait for DOM to be fully rendered after requestAnimationFrame
  DOM_RENDER_DELAY: 100,
  
  // Delay before showing answer feedback
  ANSWER_FEEDBACK_DELAY: 1500
};

/**
 * Sparkle effect configuration
 */
export const SPARKLE_CONFIG = {
  // Number of sparkle particles per wave
  COUNT: 12,
  
  // Distance in pixels that sparkles move outward
  MOVE_DISTANCE: 40,
  
  // Delay between each sparkle appearing (in seconds)
  DELAY_MULTIPLIER: 0.08
};

/**
 * Confetti effect configuration
 */
export const CONFETTI_CONFIG = {
  // Colors for confetti pieces
  COLORS: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'],
  
  // Number of confetti pieces
  COUNT: 50,
  
  // Minimum animation duration in seconds
  MIN_DURATION: 1.5,
  
  // Variance in animation duration
  DURATION_VARIANCE: 1,
  
  // Time before confetti is removed (ms)
  CLEANUP_DELAY: 3000
};

/**
 * Resize behavior configuration
 */
export const RESIZE_CONFIG = {
  // Debounce delay for resize events (ms)
  DEBOUNCE_DELAY: 100,
  
  // Delay after orientation change (ms)
  ORIENTATION_CHANGE_DELAY: 100
};

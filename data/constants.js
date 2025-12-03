// Kopfnuss - Application Constants
// Centralized constants for animation timing, sparkle effects, and UI configuration
// Used by: main.js, logic/visualEffects.js, logic/popupManager.js, logic/taskScreenController.js

/**
 * Animation timing constants (in milliseconds)
 * These values control animation durations and delays throughout the app
 */
export const ANIMATION_TIMING = {
  // Duration of the pulsing highlight effect on challenge nodes after auto-scroll
  // Applied in: logic/visualEffects.js - scrollToAndHighlightChallenge()
  // CSS match: style.css - .challenge-focus-highlight animation
  FOCUS_HIGHLIGHT_DURATION: 800,
  
  // Duration of the glamorous highlight effect on the reward button
  // Applied in: logic/visualEffects.js - scrollToAndHighlightRewardButton()
  // CSS match: style.css - .reward-button-focus-highlight animation
  REWARD_HIGHLIGHT_DURATION: 1500,
  
  // Time before sparkle particle elements are removed from DOM
  // Applied in: logic/visualEffects.js - createSparkles()
  SPARKLE_ANIMATION_DURATION: 1500,
  
  // Delay before first additional sparkle wave appears
  // Applied in: logic/visualEffects.js - scrollToAndHighlightRewardButton()
  SPARKLE_WAVE_DELAY_1: 400,
  
  // Delay before second additional sparkle wave appears
  // Applied in: logic/visualEffects.js - scrollToAndHighlightRewardButton()
  SPARKLE_WAVE_DELAY_2: 800,
  
  // Time to wait for smooth scroll animation to complete before showing highlight
  // Applied in: logic/visualEffects.js - scrollToAndHighlightChallenge()
  SCROLL_SETTLE_DELAY: 300,
  
  // Time to wait for DOM rendering after requestAnimationFrame
  // Applied in: logic/visualEffects.js - scrollToAndHighlightChallenge()
  DOM_RENDER_DELAY: 100,
  
  // Delay before advancing to next task after showing correct/incorrect feedback
  // Applied in: logic/taskScreenController.js - handleSubmit()
  ANSWER_FEEDBACK_DELAY: 1500,
  
  // Delay before showing streak popup after initial app load
  // Applied in: main.js - loadInitialRoute()
  INITIAL_POPUP_DELAY: 100,
  
  // Interval between NEW badge shake animations on shop button
  // Applied in: main.js - sets CSS variable --shop-badge-shake-interval
  // CSS match: style.css - .shop-new-badge animation
  NEW_BADGE_SHAKE_INTERVAL_MS: 3000,
  
  // Duration of NEW badge shake animation on shop button
  // Applied in: main.js - sets CSS variable --shop-badge-shake-duration
  // CSS match: style.css - .shop-new-badge animation
  NEW_BADGE_SHAKE_DURATION_MS: 600,
  
  // Interval between reward button diamond shake animations
  // Applied in: main.js - sets CSS variable --reward-diamond-shake-interval
  // CSS match: style.css - .reward-diamond-icon animation
  REWARD_BUTTON_SHAKE_INTERVAL_MS: 2500,
  
  // Duration of reward button diamond shake animation
  // Applied in: main.js - sets CSS variable --reward-diamond-shake-duration
  // CSS match: style.css - .reward-diamond-icon animation
  REWARD_BUTTON_SHAKE_DURATION_MS: 500
};

/**
 * Sparkle effect configuration
 * Applied in: logic/visualEffects.js - createSparkles()
 */
export const SPARKLE_CONFIG = {
  // Number of sparkle particles created per wave around the reward button
  COUNT: 15,
  
  // Maximum distance in pixels that sparkles travel outward from center
  MOVE_DISTANCE: 30,
  
  // Delay multiplier between each sparkle appearing (in seconds)
  DELAY_MULTIPLIER: 0.08
};

/**
 * Super Challenge sparkle overlay configuration
 * Note: PARTICLE_COUNT is configured in balancing.js CONFIG.SUPER_CHALLENGE_SPARKLE_COUNT
 * Applied in: logic/visualEffects.js - startSuperChallengeSparkles()
 */
export const SUPER_CHALLENGE_SPARKLE_CONFIG = {
  // Time in ms between spawning new sparkle particles
  SPAWN_INTERVAL: 400,
  
  // Duration in ms for each sparkle particle animation
  PARTICLE_DURATION: 3000
};

/**
 * Confetti effect configuration
 * Applied in: logic/popupManager.js - createConfettiEffect()
 */
export const CONFETTI_CONFIG = {
  // Array of hex colors used for confetti pieces
  COLORS: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'],
  
  // Total number of confetti pieces spawned per celebration
  COUNT: 80,
  
  // Minimum fall animation duration in seconds
  MIN_DURATION: 1.5,
  
  // Random variance added to animation duration (0 to this value)
  DURATION_VARIANCE: 1,
  
  // Time in ms before confetti elements are removed from DOM
  CLEANUP_DELAY: 3000
};

/**
 * Resize behavior configuration
 * Applied in: main.js - window resize event handler
 */
export const RESIZE_CONFIG = {
  // Debounce delay for resize events to prevent rapid updates (ms)
  DEBOUNCE_DELAY: 100,
  
  // Delay after orientation change before updating app height (ms)
  ORIENTATION_CHANGE_DELAY: 100
};

/**
 * Visual effects configuration for challenge states and backgrounds
 * Applied in: main.js - loadChallengesScreen(), style.css via CSS variables
 */
export const VISUAL_CONFIG = {
  // Delay in ms before celebration graphic animation starts (after scroll completes)
  // Applied in: main.js - loadChallengesScreen()
  CELEBRATION_ANIMATION_DELAY: 800,
  
  // Opacity of the fullscreen background image (0.0 = invisible, 1.0 = fully visible)
  // Applied in: main.js → sets CSS variable --background-opacity
  // Affects: style.css - .challenges-container::before, .task-screen::before
  BACKGROUND_OPACITY: 1.00,
  
  // Size in pixels of splash graphic for standard challenges
  // Applied in: main.js - generateSplashRaysHtml()
  SPLASH_SIZE_STANDARD: 30,
  
  // Size in pixels of splash graphic for premium challenges (Kopfnuss, Zeit-Challenge)
  // Applied in: main.js - generateSplashRaysHtml()
  SPLASH_SIZE_PREMIUM: 30,
  
  // Size in pixels of splash graphic for Super Challenges
  // Applied in: main.js - generateSplashRaysHtml()
  SPLASH_SIZE_SUPER: 45,
  
  // Celebration background graphic size multiplier (celebration graphic size = splash size * this)
  // Applied in: main.js - celebration graphic sizing for completed challenges
  CELEBRATION_GRAPHIC_MULTIPLIER: 5.0
};

/**
 * Dev settings configuration
 * Applied in: main.js - dev settings controls
 */
export const DEV_SETTINGS_CONFIG = {
  // Duration in ms for dev feedback toast display
  // Applied in: main.js - showDevFeedback()
  // CSS match: style.css - .dev-feedback animation (0.3s + 1.7s = 2.0s total)
  FEEDBACK_DURATION: 2000,
  
  // Milliseconds in a day (used for date manipulation)
  // Applied in: main.js - dev advance day function
  MS_PER_DAY: 24 * 60 * 60 * 1000
};

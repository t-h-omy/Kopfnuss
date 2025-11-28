// Kopfnuss - Visual Effects Manager
// Centralized visual effects for sparkles, highlights, and scroll animations

import { ANIMATION_TIMING, SPARKLE_CONFIG, SUPER_CHALLENGE_SPARKLE_CONFIG } from '../data/constants.js';
import { CONFIG } from '../data/balancing.js';

// Track super challenge sparkle interval for cleanup
let superChallengeSparkleInterval = null;

/**
 * Create sparkle effects around an element
 * @param {HTMLElement} element - The element to create sparkles around
 */
export function createSparklesAroundElement(element) {
  if (!element) return;
  
  const rect = element.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const radius = Math.max(rect.width, rect.height) / 2 + 20;
  
  for (let i = 0; i < SPARKLE_CONFIG.COUNT; i++) {
    const sparkle = document.createElement('div');
    sparkle.className = 'reward-sparkle';
    
    // Calculate position around the button
    const angle = (i / SPARKLE_CONFIG.COUNT) * 2 * Math.PI;
    const startX = centerX + Math.cos(angle) * (radius * 0.5);
    const startY = centerY + Math.sin(angle) * (radius * 0.5);
    
    // Set CSS custom properties for animation direction
    const moveX = Math.cos(angle) * SPARKLE_CONFIG.MOVE_DISTANCE;
    const moveY = Math.sin(angle) * SPARKLE_CONFIG.MOVE_DISTANCE;
    sparkle.style.setProperty('--sparkle-x', `${moveX}px`);
    sparkle.style.setProperty('--sparkle-y', `${moveY}px`);
    
    sparkle.style.left = `${startX}px`;
    sparkle.style.top = `${startY}px`;
    sparkle.style.animationDelay = `${i * SPARKLE_CONFIG.DELAY_MULTIPLIER}s`;
    
    document.body.appendChild(sparkle);
    
    // Remove sparkle after animation
    setTimeout(() => {
      sparkle.remove();
    }, ANIMATION_TIMING.SPARKLE_ANIMATION_DURATION);
  }
}

/**
 * Start the super challenge sparkle overlay effect
 * Creates a continuous subtle sparkle animation across the screen
 * Sparkle count is configurable via CONFIG.SUPER_CHALLENGE_SPARKLE_COUNT
 */
export function startSuperChallengeSparkles() {
  // Stop any existing sparkle interval
  stopSuperChallengeSparkles();
  
  // Create container for sparkles
  let container = document.getElementById('super-challenge-sparkle-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'super-challenge-sparkle-container';
    container.className = 'super-challenge-sparkle-container';
    document.body.appendChild(container);
  }
  
  // Get sparkle count from config (balanceable)
  const sparkleCount = CONFIG.SUPER_CHALLENGE_SPARKLE_COUNT || 12;
  
  // Create initial sparkles
  for (let i = 0; i < sparkleCount; i++) {
    setTimeout(() => {
      createSuperChallengeSparkle(container);
    }, i * (SUPER_CHALLENGE_SPARKLE_CONFIG.SPAWN_INTERVAL / 2));
  }
  
  // Continuously spawn new sparkles
  superChallengeSparkleInterval = setInterval(() => {
    createSuperChallengeSparkle(container);
  }, SUPER_CHALLENGE_SPARKLE_CONFIG.SPAWN_INTERVAL);
}

/**
 * Create a single super challenge sparkle particle
 * @param {HTMLElement} container - Container to append sparkle to
 */
function createSuperChallengeSparkle(container) {
  if (!container) return;
  
  const sparkle = document.createElement('div');
  sparkle.className = 'super-challenge-sparkle';
  
  // Random position avoiding center UI elements (stay in corners/edges)
  const positions = [
    { x: Math.random() * 25, y: Math.random() * 100 },      // Left edge
    { x: 75 + Math.random() * 25, y: Math.random() * 100 }, // Right edge
    { x: Math.random() * 100, y: Math.random() * 15 },      // Top edge
    { x: Math.random() * 100, y: 85 + Math.random() * 15 }  // Bottom edge
  ];
  const pos = positions[Math.floor(Math.random() * positions.length)];
  
  sparkle.style.left = `${pos.x}%`;
  sparkle.style.top = `${pos.y}%`;
  
  // Random animation delay for variety
  sparkle.style.animationDelay = `${Math.random() * 0.5}s`;
  
  container.appendChild(sparkle);
  
  // Remove sparkle after animation
  setTimeout(() => {
    sparkle.remove();
  }, SUPER_CHALLENGE_SPARKLE_CONFIG.PARTICLE_DURATION);
}

/**
 * Stop the super challenge sparkle overlay effect
 */
export function stopSuperChallengeSparkles() {
  if (superChallengeSparkleInterval) {
    clearInterval(superChallengeSparkleInterval);
    superChallengeSparkleInterval = null;
  }
  
  // Remove container and all sparkles
  const container = document.getElementById('super-challenge-sparkle-container');
  if (container) {
    container.remove();
  }
}

/**
 * Scroll to an element and apply a highlight animation
 * @param {HTMLElement} element - The element to scroll to and highlight
 * @param {string} highlightClass - CSS class to apply for highlight animation
 * @param {number} highlightDuration - Duration of highlight animation (ms)
 * @param {Function} checkCondition - Optional function to check before showing highlight
 */
export function scrollToAndHighlight(element, highlightClass, highlightDuration, checkCondition = null) {
  if (!element) return;
  
  // Wait for DOM to be fully rendered
  requestAnimationFrame(() => {
    setTimeout(() => {
      // Smooth scroll to the element
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
      
      // Add highlight animation class after scroll completes
      setTimeout(() => {
        // Check condition if provided (e.g., no popup currently visible)
        if (checkCondition && !checkCondition()) {
          return;
        }
        
        element.classList.add(highlightClass);
        
        // Remove the class after animation completes
        setTimeout(() => {
          element.classList.remove(highlightClass);
        }, highlightDuration);
      }, ANIMATION_TIMING.SCROLL_SETTLE_DELAY);
    }, ANIMATION_TIMING.DOM_RENDER_DELAY);
  });
}

/**
 * Check if there's currently no popup visible
 * @returns {boolean} True if no popup is visible
 */
export function noPopupVisible() {
  return !document.querySelector('.popup-overlay');
}

/**
 * Scroll to and highlight a challenge row
 * @param {number} challengeIndex - Index of the challenge to scroll to
 */
export function scrollToAndHighlightChallenge(challengeIndex) {
  if (challengeIndex < 0) {
    return;
  }
  
  // Wait for DOM to be fully rendered
  requestAnimationFrame(() => {
    setTimeout(() => {
      const challengeRow = document.querySelector(`.challenge-row[data-index="${challengeIndex}"]`);
      if (challengeRow) {
        scrollToAndHighlight(
          challengeRow,
          'challenge-focus-highlight',
          ANIMATION_TIMING.FOCUS_HIGHLIGHT_DURATION,
          noPopupVisible
        );
      }
    }, ANIMATION_TIMING.DOM_RENDER_DELAY);
  });
}

/**
 * Scroll to and highlight the reward button with glamorous sparkle effect
 */
export function scrollToAndHighlightRewardButton() {
  // Wait for DOM to be fully rendered
  requestAnimationFrame(() => {
    setTimeout(() => {
      const rewardButton = document.getElementById('reward-button');
      if (rewardButton && rewardButton.classList.contains('active')) {
        // Smooth scroll to the reward button
        rewardButton.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
        
        // Add highlight animation and sparkles after scroll completes
        setTimeout(() => {
          // Check if there's no popup currently visible
          if (!noPopupVisible()) {
            return;
          }
          
          // Add glamorous highlight animation
          rewardButton.classList.add('reward-button-focus-highlight');
          
          // Create sparkle effects
          createSparklesAroundElement(rewardButton);
          
          // Create additional sparkle waves
          setTimeout(() => createSparklesAroundElement(rewardButton), ANIMATION_TIMING.SPARKLE_WAVE_DELAY_1);
          setTimeout(() => createSparklesAroundElement(rewardButton), ANIMATION_TIMING.SPARKLE_WAVE_DELAY_2);
          
          // Remove the highlight class after animation completes
          setTimeout(() => {
            rewardButton.classList.remove('reward-button-focus-highlight');
          }, ANIMATION_TIMING.REWARD_HIGHLIGHT_DURATION);
        }, ANIMATION_TIMING.SCROLL_SETTLE_DELAY);
      }
    }, ANIMATION_TIMING.DOM_RENDER_DELAY);
  });
}

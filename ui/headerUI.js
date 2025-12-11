// Kopfnuss - Header UI Module
// Manages updates to header displays (streak, diamonds, seasonal currency, progress)

import { getDiamondInfo } from '../logic/diamondManager.js';
import { CONFIG } from '../data/balancingLoader.js';

/**
 * Initialize header UI
 * Called once during app initialization
 */
export function initHeaderUI() {
  // No initialization needed for now
  // Could be used for event listeners in the future
}

/**
 * Update the header streak display with new values
 * @param {number} streakCount - The new streak count
 * @param {boolean} isFrozen - Whether the streak is frozen
 */
export function updateHeaderStreakDisplay(streakCount, isFrozen = false) {
  const streakCapsule = document.querySelector('.header-stats .stat-capsule:first-child');
  const streakIcon = streakCapsule?.querySelector('.stat-icon');
  const streakValue = streakCapsule?.querySelector('.stat-value');
  
  if (streakValue) {
    streakValue.textContent = streakCount;
  }
  
  if (streakCapsule && streakIcon) {
    if (isFrozen) {
      streakCapsule.classList.add('streak-frozen');
      streakIcon.textContent = '🧊';
    } else {
      streakCapsule.classList.remove('streak-frozen');
      streakIcon.textContent = '🔥';
    }
  }
}

/**
 * Update the diamond display in the challenges header
 */
export function updateHeaderDiamondsDisplay() {
  const diamondInfo = getDiamondInfo();
  const diamondValueElement = document.querySelector('.header-stats .stat-capsule:last-child .stat-value');
  if (diamondValueElement) {
    diamondValueElement.textContent = diamondInfo.current;
  }
}

/**
 * Update the diamond progress text showing tasks until next diamond
 * @param {number} totalTasksCompleted - Total tasks completed
 */
export function updateDiamondProgressText(totalTasksCompleted) {
  const progressElement = document.querySelector('.diamond-progress-info');
  if (progressElement) {
    const tasksUntilNext = CONFIG.TASKS_PER_DIAMOND - (totalTasksCompleted % CONFIG.TASKS_PER_DIAMOND);
    const progressText = tasksUntilNext === 1 
      ? 'Noch 1 Aufgabe bis +1 💎' 
      : `Noch ${tasksUntilNext} Aufgaben bis +1 💎`;
    progressElement.textContent = progressText;
  }
}

/**
 * Update seasonal currency display in header
 * @param {number} amount - Amount of seasonal currency
 */
export function updateHeaderSeasonalDisplay(amount) {
  const seasonalDisplay = document.querySelector('.stat-capsule.seasonal-currency .stat-value');
  if (seasonalDisplay) {
    seasonalDisplay.textContent = amount;
  }
}

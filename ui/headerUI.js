// Kopfnuss - Header UI Module
// Manages updates to header displays (streak, diamonds, seasonal currency, progress)

import { getDiamondInfo } from '../logic/diamondManager.js';
import { loadStreakStones, loadStreak } from '../logic/storageManager.js';
import { CONFIG } from '../data/balancingLoader.js';
import { showResourceInfoPopup } from '../logic/popupManager.js';
import { getActiveEvent } from '../logic/eventManager.js';

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
  // Select the third stat-capsule (streak, streak stones, diamonds)
  const diamondValueElement = document.querySelector('.header-stats .stat-capsule:nth-child(3) .stat-value');
  if (diamondValueElement) {
    diamondValueElement.textContent = diamondInfo.current;
  }
}

/**
 * Update the streak stones display in the challenges header
 */
export function updateHeaderStreakStonesDisplay() {
  const streakStones = loadStreakStones();
  // Select the second stat-capsule (after streak, before diamonds)
  const streakStonesValueElement = document.querySelector('.header-stats .stat-capsule:nth-child(2) .stat-value');
  if (streakStonesValueElement) {
    streakStonesValueElement.textContent = streakStones;
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

/**
 * Show diamond resource info popup
 */
export function showDiamondInfoPopup() {
  const diamondInfo = getDiamondInfo();
  
  showResourceInfoPopup({
    title: 'Diamanten 💎',
    use: 'Schalten Hintergründe frei & starten Premium-Challenges',
    source: 'Verdient durch Aufgaben & Tages-Challenges',
    progress: `Noch ${diamondInfo.tasksUntilNext} Aufgaben → 💎`
  });
}

/**
 * Show streak stones resource info popup
 */
export function showStreakStonesInfoPopup() {
  const streak = loadStreak();
  const currentStreak = streak.currentStreak || 0;
  const milestoneInterval = CONFIG.STREAK_MILESTONE_INTERVAL;
  
  // Calculate next milestone
  const nextMilestone = Math.ceil((currentStreak + 1) / milestoneInterval) * milestoneInterval;
  
  showResourceInfoPopup({
    title: 'Streak Stones ♦️',
    use: 'Schalten Hintergrund-Pakete frei',
    source: 'Verdient durch Streak-Meilensteine',
    progress: `🔥 ${currentStreak} / ${nextMilestone} → ♦️`
  });
}

/**
 * Show streak resource info popup
 */
export function showStreakInfoPopup() {
  const streak = loadStreak();
  const currentStreak = streak.currentStreak || 0;
  const milestoneInterval = CONFIG.STREAK_MILESTONE_INTERVAL;
  
  // Calculate next milestone
  const nextMilestone = Math.ceil((currentStreak + 1) / milestoneInterval) * milestoneInterval;
  
  showResourceInfoPopup({
    title: 'Streak 🔥',
    use: 'Zeigt, wie viele Tage du dranbleibst',
    source: 'Steigt, wenn du täglich mindestens 1 Challenge schaffst',
    progress: `Nächster Meilenstein bei ${nextMilestone} 🔥`
  });
}

/**
 * Show event resource info popup
 */
export function showEventResourceInfoPopup() {
  const activeEvent = getActiveEvent();
  
  if (!activeEvent) {
    return; // No active event, don't show popup
  }
  
  const eventEmoji = activeEvent.emoticon;
  
  // Calculate days until event ends
  const currentDate = new Date();
  let year = currentDate.getFullYear();
  
  // Handle events that span year boundary
  if (activeEvent.startMonth > activeEvent.endMonth) {
    if (currentDate.getMonth() + 1 <= activeEvent.endMonth) {
      // We're in the ending part of the event (new year)
    } else {
      // We're in the starting part, end is next year
      year += 1;
    }
  }
  
  const endDate = new Date(year, activeEvent.endMonth - 1, activeEvent.endDay, 23, 59, 59);
  const daysUntilEnd = Math.ceil((endDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
  
  showResourceInfoPopup({
    title: `Event-Ressource ${eventEmoji}`,
    use: 'Schalten Event-Hintergründe frei',
    source: 'Verdient durch Premium-Challenges während Events',
    progress: `Event endet in ${daysUntilEnd} Tagen`
  });
}

// Kopfnuss - Streak Manager
// Manages daily streak system

import { CONFIG } from '../data/balancing.js';
import { 
  loadStreak, 
  saveStreak, 
  loadProgress, 
  getTodayDate 
} from './storageManager.js';
import { loadDiamonds, saveDiamonds } from './diamondManager.js';

/**
 * Calculate days between two dates
 * Uses date components to avoid timezone issues
 * @param {string} date1 - First date (YYYY-MM-DD)
 * @param {string} date2 - Second date (YYYY-MM-DD)
 * @returns {number} Number of days difference
 */
function daysBetween(date1, date2) {
  const d1 = new Date(date1 + 'T00:00:00');
  const d2 = new Date(date2 + 'T00:00:00');
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Update streak based on current progress
 * @returns {Object} Updated streak object with additional metadata
 */
export function updateStreak() {
  const streak = loadStreak();
  const progress = loadProgress();
  const today = getTodayDate();
  const lastActiveDate = streak.lastActiveDate;
  
  // Track the previous streak count to detect new milestone
  const previousStreak = streak.currentStreak;
  let streakIncreased = false;
  
  // Check if player completed enough tasks today
  const tasksCompletedToday = progress.tasksCompletedToday || 0;
  const hasCompletedMinimum = tasksCompletedToday >= CONFIG.TASKS_FOR_STREAK;
  
  // If no previous date, initialize
  if (!lastActiveDate) {
    if (hasCompletedMinimum) {
      streak.currentStreak = 1;
      streak.longestStreak = 1;
      streak.lastActiveDate = today;
      streak.isFrozen = false;
      streakIncreased = previousStreak < 1;
    }
    saveStreak(streak);
    streak.streakIncreased = streakIncreased;
    streak.previousStreak = previousStreak;
    return streak;
  }
  
  const daysSinceLastActive = daysBetween(lastActiveDate, today);
  
  // Same day - just update if completed minimum
  if (daysSinceLastActive === 0) {
    if (hasCompletedMinimum && streak.currentStreak === 0) {
      streak.currentStreak = 1;
      streak.isFrozen = false;
      streakIncreased = previousStreak < 1;
    }
  }
  // Next day - increment streak if minimum completed
  else if (daysSinceLastActive === 1) {
    if (hasCompletedMinimum) {
      streak.currentStreak += 1;
      streak.isFrozen = false;
      streak.lastActiveDate = today;
      streakIncreased = true;
      
      // Update longest streak if necessary
      if (streak.currentStreak > streak.longestStreak) {
        streak.longestStreak = streak.currentStreak;
      }
    } else {
      // Freeze streak after 1 day of inactivity
      streak.isFrozen = true;
    }
  }
  // 2 days gap - streak is lost
  else if (daysSinceLastActive === 2) {
    if (!streak.isFrozen) {
      // Streak was lost
      streak.currentStreak = 0;
      streak.isFrozen = false;
    }
    // If player completes minimum today, start new streak
    if (hasCompletedMinimum) {
      streak.currentStreak = 1;
      streak.lastActiveDate = today;
      streak.isFrozen = false;
      streakIncreased = previousStreak < 1;
    }
  }
  // More than 2 days - streak definitely lost
  else if (daysSinceLastActive > 2) {
    streak.currentStreak = 0;
    streak.isFrozen = false;
    
    // If player completes minimum today, start new streak
    if (hasCompletedMinimum) {
      streak.currentStreak = 1;
      streak.lastActiveDate = today;
      streakIncreased = previousStreak < 1;
    }
  }
  
  saveStreak(streak);
  // Add metadata to indicate if this is a genuine new streak (not rescued/unfrozen)
  streak.streakIncreased = streakIncreased;
  streak.previousStreak = previousStreak;
  return streak;
}

/**
 * Get current streak information
 * @returns {Object} Streak information
 */
export function getStreakInfo() {
  const streak = updateStreak();
  const today = getTodayDate();
  const progress = loadProgress();
  
  const daysSinceLastActive = streak.lastActiveDate 
    ? daysBetween(streak.lastActiveDate, today)
    : null;
  
  let status = 'active';
  if (streak.isFrozen) status = 'frozen';
  if (streak.currentStreak === 0) status = 'inactive';
  
  const tasksCompletedToday = progress.tasksCompletedToday || 0;
  const tasksNeeded = Math.max(0, CONFIG.TASKS_FOR_STREAK - tasksCompletedToday);
  
  return {
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    status: status,
    isFrozen: streak.isFrozen,
    daysSinceLastActive: daysSinceLastActive,
    tasksCompletedToday: tasksCompletedToday,
    tasksNeededForStreak: tasksNeeded,
    canRescue: streak.isFrozen && daysSinceLastActive === 1
  };
}

/**
 * Rescue a frozen streak by spending a diamond
 * @returns {Object} Result with success status and message
 */
export function rescueStreak() {
  const streak = loadStreak();
  const diamonds = loadDiamonds();
  const today = getTodayDate();
  
  // Check if streak can be rescued
  if (!streak.isFrozen) {
    return {
      success: false,
      message: 'Streak is not frozen'
    };
  }
  
  const daysSinceLastActive = daysBetween(streak.lastActiveDate, today);
  if (daysSinceLastActive !== 1) {
    return {
      success: false,
      message: 'Streak can only be rescued within 1 day'
    };
  }
  
  // Check if player has enough diamonds
  if (diamonds < CONFIG.STREAK_RESCUE_COST) {
    return {
      success: false,
      message: `Not enough diamonds. Need ${CONFIG.STREAK_RESCUE_COST}, have ${diamonds}`
    };
  }
  
  // Spend diamond and unfreeze streak
  saveDiamonds(diamonds - CONFIG.STREAK_RESCUE_COST);
  
  streak.isFrozen = false;
  streak.lastActiveDate = today;
  // Mark that the streak was rescued (not genuinely increased)
  streak.wasRescued = true;
  saveStreak(streak);
  
  return {
    success: true,
    message: 'Streak rescued!',
    diamondsRemaining: diamonds - CONFIG.STREAK_RESCUE_COST,
    wasRescued: true
  };
}

/**
 * Reset streak (for testing or user request)
 * @returns {boolean} Success status
 */
export function resetStreak() {
  const streak = {
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: null,
    isFrozen: false
  };
  return saveStreak(streak);
}

/**
 * Check if player has met daily streak requirement
 * @returns {boolean} True if minimum tasks completed today
 */
export function hasMetDailyRequirement() {
  const progress = loadProgress();
  const tasksCompletedToday = progress.tasksCompletedToday || 0;
  return tasksCompletedToday >= CONFIG.TASKS_FOR_STREAK;
}

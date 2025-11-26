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
 * Streak loss reasons
 */
export const STREAK_LOSS_REASON = {
  NONE: null,
  FROZEN: 'frozen', // 1 day gap, streak is frozen but can be unfrozen by completing challenge
  EXPIRED_RESTORABLE: 'expired_restorable', // 2 day gap, can restore with diamond
  EXPIRED_PERMANENT: 'expired_permanent' // 3+ day gap, cannot restore
};

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
 * Check streak status on app load (before any updates)
 * This determines what popup to show
 * @returns {Object} Streak status info for popups
 */
export function checkStreakStatusOnLoad() {
  const streak = loadStreak();
  const today = getTodayDate();
  const lastActiveDate = streak.lastActiveDate;
  
  // No previous activity
  if (!lastActiveDate) {
    return {
      showPopup: false,
      lossReason: null,
      previousStreak: 0,
      isFrozen: false
    };
  }
  
  const daysSinceLastActive = daysBetween(lastActiveDate, today);
  
  // Same day - no popup needed
  if (daysSinceLastActive === 0) {
    return {
      showPopup: streak.isFrozen,
      lossReason: streak.isFrozen ? STREAK_LOSS_REASON.FROZEN : null,
      previousStreak: streak.currentStreak,
      isFrozen: streak.isFrozen
    };
  }
  
  // 1 day gap - streak is frozen
  if (daysSinceLastActive === 1) {
    return {
      showPopup: true,
      lossReason: STREAK_LOSS_REASON.FROZEN,
      previousStreak: streak.currentStreak,
      isFrozen: true
    };
  }
  
  // 2 day gap - streak expired but can be restored with diamond
  if (daysSinceLastActive === 2 && streak.currentStreak > 0) {
    return {
      showPopup: true,
      lossReason: STREAK_LOSS_REASON.EXPIRED_RESTORABLE,
      previousStreak: streak.currentStreak,
      isFrozen: false
    };
  }
  
  // 3+ day gap - streak permanently lost
  if (daysSinceLastActive >= 3 && streak.currentStreak > 0) {
    return {
      showPopup: true,
      lossReason: STREAK_LOSS_REASON.EXPIRED_PERMANENT,
      previousStreak: streak.currentStreak,
      isFrozen: false
    };
  }
  
  return {
    showPopup: false,
    lossReason: null,
    previousStreak: streak.currentStreak,
    isFrozen: streak.isFrozen
  };
}

/**
 * Mark streak status as handled (for popup tracking)
 * This prevents showing the same popup multiple times
 */
export function markStreakStatusHandled() {
  const streak = loadStreak();
  streak.statusHandledDate = getTodayDate();
  saveStreak(streak);
}

/**
 * Check if streak status popup was already shown today
 * @returns {boolean} True if popup was already shown today
 */
export function wasStreakStatusHandledToday() {
  const streak = loadStreak();
  const today = getTodayDate();
  return streak.statusHandledDate === today;
}

/**
 * Update streak based on current progress
 * @returns {Object} Updated streak object
 */
export function updateStreak() {
  const streak = loadStreak();
  const progress = loadProgress();
  const today = getTodayDate();
  const lastActiveDate = streak.lastActiveDate;
  
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
      streak.lossReason = null;
    }
    saveStreak(streak);
    return streak;
  }
  
  const daysSinceLastActive = daysBetween(lastActiveDate, today);
  
  // Same day - just update if completed minimum
  if (daysSinceLastActive === 0) {
    if (hasCompletedMinimum && streak.currentStreak === 0) {
      streak.currentStreak = 1;
      streak.isFrozen = false;
      streak.lossReason = null;
    }
  }
  // Next day - increment streak if minimum completed
  else if (daysSinceLastActive === 1) {
    if (hasCompletedMinimum) {
      streak.currentStreak += 1;
      streak.isFrozen = false;
      streak.lossReason = null;
      streak.lastActiveDate = today;
      
      // Update longest streak if necessary
      if (streak.currentStreak > streak.longestStreak) {
        streak.longestStreak = streak.currentStreak;
      }
    } else {
      // Freeze streak after 1 day of inactivity
      streak.isFrozen = true;
      streak.lossReason = STREAK_LOSS_REASON.FROZEN;
    }
  }
  // 2 days gap - streak is lost but restorable
  else if (daysSinceLastActive === 2) {
    if (streak.currentStreak > 0 && !streak.lossReason) {
      streak.lossReason = STREAK_LOSS_REASON.EXPIRED_RESTORABLE;
    }
    // Don't reset streak yet, allow restoration
    if (!streak.lossReason || streak.lossReason === STREAK_LOSS_REASON.FROZEN) {
      streak.currentStreak = 0;
      streak.isFrozen = false;
    }
    // If player completes minimum today AND hasn't chosen to restore the old streak,
    // start a new streak. We don't auto-start a new streak when the old one is restorable
    // because the player needs to see the popup and choose whether to restore or start fresh.
    if (hasCompletedMinimum && streak.lossReason !== STREAK_LOSS_REASON.EXPIRED_RESTORABLE) {
      streak.currentStreak = 1;
      streak.lastActiveDate = today;
      streak.isFrozen = false;
      streak.lossReason = null;
    }
  }
  // More than 2 days - streak definitely lost
  else if (daysSinceLastActive > 2) {
    if (streak.currentStreak > 0) {
      streak.lossReason = STREAK_LOSS_REASON.EXPIRED_PERMANENT;
    }
    streak.currentStreak = 0;
    streak.isFrozen = false;
    
    // If player completes minimum today, start new streak
    if (hasCompletedMinimum) {
      streak.currentStreak = 1;
      streak.lastActiveDate = today;
      streak.lossReason = null;
    }
  }
  
  saveStreak(streak);
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
    canRescue: streak.isFrozen && daysSinceLastActive === 1,
    lossReason: streak.lossReason
  };
}

/**
 * Unfreeze streak by completing a challenge
 * This is called when player completes a challenge while streak is frozen
 * @returns {Object} Result with success status and whether streak was unfrozen
 */
export function unfreezeStreakByChallenge() {
  const streak = loadStreak();
  const today = getTodayDate();
  
  // Check if streak is frozen
  if (!streak.isFrozen) {
    return {
      success: false,
      wasUnfrozen: false,
      message: 'Streak is not frozen'
    };
  }
  
  const daysSinceLastActive = streak.lastActiveDate 
    ? daysBetween(streak.lastActiveDate, today)
    : null;
  
  // Can only unfreeze if it's been 1 day
  if (daysSinceLastActive !== 1) {
    return {
      success: false,
      wasUnfrozen: false,
      message: 'Streak can only be unfrozen within 1 day'
    };
  }
  
  // Unfreeze and continue streak
  streak.isFrozen = false;
  streak.lossReason = null;
  streak.currentStreak += 1;
  streak.lastActiveDate = today;
  
  // Update longest streak if necessary
  if (streak.currentStreak > streak.longestStreak) {
    streak.longestStreak = streak.currentStreak;
  }
  
  saveStreak(streak);
  
  return {
    success: true,
    wasUnfrozen: true,
    message: 'Streak unfrozen!',
    newStreak: streak.currentStreak
  };
}

/**
 * Restore expired streak by spending a diamond (2-day gap only)
 * @returns {Object} Result with success status and message
 */
export function restoreExpiredStreak() {
  const streak = loadStreak();
  const diamonds = loadDiamonds();
  const today = getTodayDate();
  
  // Check if streak can be restored (2-day gap)
  const daysSinceLastActive = streak.lastActiveDate 
    ? daysBetween(streak.lastActiveDate, today)
    : null;
    
  if (daysSinceLastActive !== 2) {
    return {
      success: false,
      message: 'Streak can only be restored after exactly 2 days of inactivity'
    };
  }
  
  // Check if player has enough diamonds
  if (diamonds < CONFIG.STREAK_RESCUE_COST) {
    return {
      success: false,
      message: `Not enough diamonds. Need ${CONFIG.STREAK_RESCUE_COST}, have ${diamonds}`,
      needsDiamond: true
    };
  }
  
  // Spend diamond and restore streak
  saveDiamonds(diamonds - CONFIG.STREAK_RESCUE_COST);
  
  // Restore the streak and mark as active today
  streak.isFrozen = false;
  streak.lossReason = null;
  streak.lastActiveDate = today;
  // Continue the streak (don't reset to 1)
  streak.currentStreak += 1;
  
  // Update longest streak if necessary
  if (streak.currentStreak > streak.longestStreak) {
    streak.longestStreak = streak.currentStreak;
  }
  
  saveStreak(streak);
  
  return {
    success: true,
    message: 'Streak restored!',
    diamondsRemaining: diamonds - CONFIG.STREAK_RESCUE_COST,
    newStreak: streak.currentStreak
  };
}

/**
 * Accept permanent streak loss (3+ day gap)
 * Resets streak to 0 and clears loss reason
 */
export function acceptStreakLoss() {
  const streak = loadStreak();
  streak.currentStreak = 0;
  streak.isFrozen = false;
  streak.lossReason = null;
  // Don't clear lastActiveDate - keep it for future calculations
  saveStreak(streak);
  
  return {
    success: true,
    message: 'Streak reset'
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
  streak.lossReason = null;
  streak.lastActiveDate = today;
  saveStreak(streak);
  
  return {
    success: true,
    message: 'Streak rescued!',
    diamondsRemaining: diamonds - CONFIG.STREAK_RESCUE_COST
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
    isFrozen: false,
    lossReason: null
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

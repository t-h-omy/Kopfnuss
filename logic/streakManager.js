// Kopfnuss - Streak Manager
// Manages daily streak system

import { CONFIG } from '../data/balancing.js';
import { 
  loadStreak, 
  saveStreak, 
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
  
  // Same day - no popup needed (unless already frozen from before)
  if (daysSinceLastActive === 0) {
    return {
      showPopup: streak.isFrozen,
      lossReason: streak.isFrozen ? STREAK_LOSS_REASON.FROZEN : null,
      previousStreak: streak.currentStreak,
      isFrozen: streak.isFrozen
    };
  }
  
  // 1 day gap - next day after activity, streak continues normally
  // Player completed challenge yesterday, opens app today - no problem
  if (daysSinceLastActive === 1) {
    return {
      showPopup: false,
      lossReason: null,
      previousStreak: streak.currentStreak,
      isFrozen: false
    };
  }
  
  // 2 day gap - 1 complete inactive day, streak is frozen
  // Player completed challenge 2 days ago, missed yesterday, opens app today
  if (daysSinceLastActive === 2 && streak.currentStreak > 0) {
    return {
      showPopup: true,
      lossReason: STREAK_LOSS_REASON.FROZEN,
      previousStreak: streak.currentStreak,
      isFrozen: true
    };
  }
  
  // 3 day gap - streak expired but can be restored with diamond
  // Player missed 2 days
  if (daysSinceLastActive === 3 && streak.currentStreak > 0) {
    return {
      showPopup: true,
      lossReason: STREAK_LOSS_REASON.EXPIRED_RESTORABLE,
      previousStreak: streak.currentStreak,
      isFrozen: false
    };
  }
  
  // 4+ day gap - streak permanently lost
  if (daysSinceLastActive >= 4 && streak.currentStreak > 0) {
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
 * Update streak status based on time elapsed (does NOT increment streak)
 * This function handles streak freezing and loss detection only.
 * Streak progression is handled by incrementStreakByChallenge() when a challenge is completed.
 * @returns {Object} Updated streak object
 */
export function updateStreak() {
  const streak = loadStreak();
  const today = getTodayDate();
  const lastActiveDate = streak.lastActiveDate;
  
  // If no previous date, just return current streak (will be initialized on first challenge completion)
  if (!lastActiveDate) {
    saveStreak(streak);
    return streak;
  }
  
  const daysSinceLastActive = daysBetween(lastActiveDate, today);
  
  // Same day - no changes needed
  if (daysSinceLastActive === 0) {
    // No changes needed, streak status stays the same
  }
  // 1 day gap - next day after activity, streak continues normally
  // Player completed challenge yesterday, opens app today - no problem
  else if (daysSinceLastActive === 1) {
    // No freezing needed, this is normal behavior
    // The player has until the end of today to complete a challenge
  }
  // 2 days gap - 1 complete inactive day, streak is frozen
  // Player completed challenge 2 days ago, missed yesterday, opens app today
  else if (daysSinceLastActive === 2) {
    if (!streak.isFrozen && streak.currentStreak > 0) {
      streak.isFrozen = true;
      streak.lossReason = STREAK_LOSS_REASON.FROZEN;
    }
  }
  // 3 days gap - streak is lost but restorable with diamond
  else if (daysSinceLastActive === 3) {
    if (streak.currentStreak > 0 && streak.lossReason !== STREAK_LOSS_REASON.EXPIRED_RESTORABLE) {
      streak.lossReason = STREAK_LOSS_REASON.EXPIRED_RESTORABLE;
    }
    // Don't reset streak yet, allow restoration via popup
    streak.isFrozen = false;
  }
  // 4+ days gap - streak permanently lost
  else if (daysSinceLastActive >= 4) {
    if (streak.currentStreak > 0 && streak.lossReason !== STREAK_LOSS_REASON.EXPIRED_PERMANENT) {
      streak.lossReason = STREAK_LOSS_REASON.EXPIRED_PERMANENT;
    }
    streak.currentStreak = 0;
    streak.isFrozen = false;
  }
  
  saveStreak(streak);
  return streak;
}

/**
 * Increment streak by completing a challenge
 * This is called when player completes a full challenge
 * @returns {Object} Result with success status and whether streak was incremented
 */
export function incrementStreakByChallenge() {
  const streak = loadStreak();
  const today = getTodayDate();
  const lastActiveDate = streak.lastActiveDate;
  
  // If streak is frozen, don't increment here - use unfreezeStreakByChallenge instead
  if (streak.isFrozen) {
    return {
      success: false,
      wasIncremented: false,
      message: 'Streak is frozen, use unfreezeStreakByChallenge instead'
    };
  }
  
  // If streak has a loss reason (expired), don't auto-increment
  // Player needs to handle this via popup first
  if (streak.lossReason) {
    return {
      success: false,
      wasIncremented: false,
      message: 'Streak has a loss reason, must be handled first'
    };
  }
  
  // Check if already active today (already completed a challenge today)
  if (lastActiveDate === today) {
    return {
      success: true,
      wasIncremented: false,
      message: 'Already completed a challenge today',
      currentStreak: streak.currentStreak
    };
  }
  
  // If no previous date, start first streak
  if (!lastActiveDate) {
    streak.currentStreak = 1;
    streak.longestStreak = Math.max(streak.longestStreak || 0, 1);
    streak.lastActiveDate = today;
    streak.isFrozen = false;
    streak.lossReason = null;
    saveStreak(streak);
    
    return {
      success: true,
      wasIncremented: true,
      message: 'First streak day started!',
      newStreak: streak.currentStreak
    };
  }
  
  const daysSinceLastActive = daysBetween(lastActiveDate, today);
  
  // Next day - increment streak
  if (daysSinceLastActive === 1) {
    streak.currentStreak += 1;
    streak.isFrozen = false;
    streak.lossReason = null;
    streak.lastActiveDate = today;
    
    // Update longest streak if necessary
    if (streak.currentStreak > streak.longestStreak) {
      streak.longestStreak = streak.currentStreak;
    }
    
    saveStreak(streak);
    
    return {
      success: true,
      wasIncremented: true,
      message: 'Streak incremented!',
      newStreak: streak.currentStreak
    };
  }
  
  // More than 1 day gap - this shouldn't happen if updateStreak was called correctly
  // But handle it by starting a new streak
  if (daysSinceLastActive > 1) {
    streak.currentStreak = 1;
    streak.lastActiveDate = today;
    streak.isFrozen = false;
    streak.lossReason = null;
    saveStreak(streak);
    
    return {
      success: true,
      wasIncremented: true,
      message: 'New streak started after gap',
      newStreak: streak.currentStreak
    };
  }
  
  return {
    success: false,
    wasIncremented: false,
    message: 'Unexpected state'
  };
}

/**
 * Get current streak information
 * @returns {Object} Streak information
 */
export function getStreakInfo() {
  const streak = updateStreak();
  const today = getTodayDate();
  
  const daysSinceLastActive = streak.lastActiveDate 
    ? daysBetween(streak.lastActiveDate, today)
    : null;
  
  let status = 'active';
  if (streak.isFrozen) status = 'frozen';
  if (streak.currentStreak === 0) status = 'inactive';
  
  // Check if player has already completed a challenge today
  const hasCompletedChallengeToday = streak.lastActiveDate === today;
  
  return {
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    status: status,
    isFrozen: streak.isFrozen,
    daysSinceLastActive: daysSinceLastActive,
    hasCompletedChallengeToday: hasCompletedChallengeToday,
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
  
  // Can only unfreeze if it's been exactly 2 days (frozen state)
  // Day 0: last activity, Day 1: missed, Day 2: today (frozen, can unfreeze)
  if (daysSinceLastActive !== 2) {
    return {
      success: false,
      wasUnfrozen: false,
      message: 'Streak can only be unfrozen on frozen day (2 day gap)'
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
 * Check if player has met daily streak requirement (completed a challenge today)
 * @returns {boolean} True if a challenge was completed today
 */
export function hasMetDailyRequirement() {
  const streak = loadStreak();
  const today = getTodayDate();
  return streak.lastActiveDate === today;
}

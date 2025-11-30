// Kopfnuss - Diamond Manager
// Manages diamond earning and spending

import { CONFIG } from '../data/balancingLoader.js';
import { 
  loadDiamonds, 
  saveDiamonds as saveToStorage,
  loadProgress,
  loadDiamondsEarned,
  saveDiamondsEarned
} from './storageManager.js';

/**
 * Calculate how many diamonds should be awarded based on total tasks completed
 * @param {number} totalTasksCompleted - Total tasks completed by user
 * @returns {number} Number of diamonds that should be awarded
 */
function calculateDiamondsEarned(totalTasksCompleted) {
  return Math.floor(totalTasksCompleted / CONFIG.TASKS_PER_DIAMOND);
}

/**
 * Update diamonds based on current progress
 * Awards diamonds for every TASKS_PER_DIAMOND tasks completed
 * Properly handles spent diamonds by tracking total earned separately
 * @returns {Object} Diamond update result
 */
export function updateDiamonds() {
  const progress = loadProgress();
  const currentDiamonds = loadDiamonds();
  const totalTasksCompleted = progress.totalTasksCompleted || 0;
  
  // Calculate how many diamonds should have been earned in total based on tasks
  const totalShouldHaveEarned = calculateDiamondsEarned(totalTasksCompleted);
  
  // Load previously tracked earned count from persistent storage
  let previouslyTrackedEarned = loadDiamondsEarned();
  
  // Migration for existing users: if no earned tracking exists but user has completed tasks,
  // initialize the earned count to match what should have been earned based on tasks
  // This prevents re-awarding diamonds on first load after update
  if (previouslyTrackedEarned === 0 && totalShouldHaveEarned > 0) {
    previouslyTrackedEarned = totalShouldHaveEarned;
    saveDiamondsEarned(totalShouldHaveEarned);
  }
  
  // Calculate newly earned diamonds since last check
  const newlyEarned = Math.max(0, totalShouldHaveEarned - previouslyTrackedEarned);
  
  if (newlyEarned > 0) {
    // Add newly earned diamonds to current balance (preserving spent state)
    const totalDiamonds = currentDiamonds + newlyEarned;
    saveToStorage(totalDiamonds);
    
    // Persist the new total earned count
    saveDiamondsEarned(totalShouldHaveEarned);
    
    return {
      awarded: newlyEarned,
      total: totalDiamonds,
      tasksCompleted: totalTasksCompleted
    };
  }
  
  return {
    awarded: 0,
    total: currentDiamonds,
    tasksCompleted: totalTasksCompleted
  };
}

/**
 * Get diamond information
 * @returns {Object} Diamond info
 */
export function getDiamondInfo() {
  const diamonds = loadDiamonds();
  const progress = loadProgress();
  const totalTasksCompleted = progress.totalTasksCompleted || 0;
  
  const tasksUntilNextDiamond = CONFIG.TASKS_PER_DIAMOND - 
    (totalTasksCompleted % CONFIG.TASKS_PER_DIAMOND);
  
  const diamondsEarned = calculateDiamondsEarned(totalTasksCompleted);
  const diamondsSpent = diamondsEarned - diamonds;
  
  return {
    current: diamonds,
    earned: diamondsEarned,
    spent: diamondsSpent,
    tasksUntilNext: tasksUntilNextDiamond,
    progressToNext: ((CONFIG.TASKS_PER_DIAMOND - tasksUntilNextDiamond) / CONFIG.TASKS_PER_DIAMOND * 100).toFixed(0)
  };
}

/**
 * Spend diamonds
 * @param {number} amount - Number of diamonds to spend
 * @returns {Object} Result with success status
 */
export function spendDiamonds(amount) {
  const currentDiamonds = loadDiamonds();
  
  if (amount <= 0) {
    return {
      success: false,
      message: 'Invalid amount'
    };
  }
  
  if (currentDiamonds < amount) {
    return {
      success: false,
      message: `Not enough diamonds. Have ${currentDiamonds}, need ${amount}`
    };
  }
  
  const newAmount = currentDiamonds - amount;
  saveToStorage(newAmount);
  
  return {
    success: true,
    spent: amount,
    remaining: newAmount
  };
}

/**
 * Add diamonds (for testing or admin purposes)
 * @param {number} amount - Number of diamonds to add
 * @returns {boolean} Success status
 */
export function addDiamonds(amount) {
  if (amount <= 0) {
    return false;
  }
  
  const currentDiamonds = loadDiamonds();
  return saveToStorage(currentDiamonds + amount);
}

/**
 * Export saveDiamonds for use by other modules
 */
export { saveToStorage as saveDiamonds, loadDiamonds };

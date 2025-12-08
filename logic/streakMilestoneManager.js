// Kopfnuss - Streak Milestone Manager
// Manages streak milestone progression and rewards

import { CONFIG } from '../data/balancingLoader.js';
import {
  loadStreakStones,
  saveStreakStones,
  loadMilestoneProgress,
  saveMilestoneProgress
} from './storageManager.js';

/**
 * Check if player has reached a streak milestone
 * @param {number} currentStreak - Current streak count
 * @returns {boolean} True if milestone was just reached
 */
export function checkStreakMilestone(currentStreak) {
  const milestoneProgress = loadMilestoneProgress();
  const interval = CONFIG.STREAK_MILESTONE_INTERVAL;
  
  // Calculate how many milestones have been reached with current streak
  const milestonesReached = Math.floor(currentStreak / interval);
  
  // Check if we just crossed a milestone threshold
  const previousMilestonesReached = Math.floor((currentStreak - 1) / interval);
  
  return milestonesReached > previousMilestonesReached;
}

/**
 * Get milestone progress info
 * @returns {Object} Milestone progress information
 */
export function getMilestoneInfo() {
  const milestoneProgress = loadMilestoneProgress();
  const interval = CONFIG.STREAK_MILESTONE_INTERVAL;
  const milestonesEarned = Math.floor(milestoneProgress / interval);
  const daysUntilNext = interval - (milestoneProgress % interval);
  
  return {
    totalMilestones: milestonesEarned,
    daysToNextMilestone: daysUntilNext,
    milestoneInterval: interval,
    currentProgress: milestoneProgress
  };
}

/**
 * Increment milestone progress (called when streak increases)
 * Returns true if a milestone was reached
 * @returns {boolean} True if milestone was reached
 */
export function incrementMilestoneProgress() {
  const currentProgress = loadMilestoneProgress();
  const newProgress = currentProgress + 1;
  saveMilestoneProgress(newProgress);
  
  const interval = CONFIG.STREAK_MILESTONE_INTERVAL;
  return newProgress % interval === 0;
}

/**
 * Award streak stones as milestone reward
 * @returns {number} New streak stones count
 */
export function awardStreakStones() {
  const currentStones = loadStreakStones();
  const reward = CONFIG.STREAK_MILESTONE_REWARD_STREAK_STONES;
  const newStones = currentStones + reward;
  saveStreakStones(newStones);
  return newStones;
}

/**
 * Award diamonds as milestone reward
 * Note: This is handled by diamondManager, but we provide this wrapper for consistency
 * @returns {number} Number of diamonds awarded
 */
export function getMilestoneDiamondReward() {
  return CONFIG.STREAK_MILESTONE_REWARD_DIAMONDS;
}

/**
 * Get streak stones count
 * @returns {number} Current streak stones
 */
export function getStreakStones() {
  return loadStreakStones();
}

/**
 * Spend streak stones (for unlocking packs)
 * @param {number} amount - Amount to spend
 * @returns {boolean} Success status
 */
export function spendStreakStones(amount) {
  const current = loadStreakStones();
  if (current < amount) {
    return false;
  }
  saveStreakStones(current - amount);
  return true;
}

/**
 * Check if player has enough streak stones
 * @param {number} amount - Amount needed
 * @returns {boolean} True if player has enough
 */
export function hasEnoughStreakStones(amount) {
  return loadStreakStones() >= amount;
}

/**
 * Reset milestone progress (for testing or admin purposes)
 */
export function resetMilestoneProgress() {
  saveMilestoneProgress(0);
}

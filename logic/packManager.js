// Kopfnuss - Pack Manager
// Manages background pack unlocking and task tracking

import { BACKGROUND_PACKS, BACKGROUNDS_UNIFIED } from '../data/balancingLoader.js';
import {
  loadUnlockedPacks,
  saveUnlockedPacks,
  loadPackTaskCounts,
  savePackTaskCounts
} from './storageManager.js';
import { spendStreakStones, hasEnoughStreakStones } from './streakMilestoneManager.js';

/**
 * Get all pack definitions
 * @returns {Array} Array of pack objects
 */
export function getAllPacks() {
  return Object.values(BACKGROUND_PACKS);
}

/**
 * Get pack by ID
 * @param {string} packId - Pack ID
 * @returns {Object|null} Pack object or null if not found
 */
export function getPack(packId) {
  return BACKGROUND_PACKS[packId] || null;
}

/**
 * Check if a pack is unlocked
 * @param {string} packId - Pack ID
 * @returns {boolean} True if pack is unlocked
 */
export function isPackUnlocked(packId) {
  const unlockedPacks = loadUnlockedPacks();
  return unlockedPacks.includes(packId);
}

/**
 * Unlock a pack with streak stones
 * @param {string} packId - Pack ID to unlock
 * @returns {Object} Result with success status and message
 */
export function unlockPack(packId) {
  const pack = getPack(packId);
  
  if (!pack) {
    return {
      success: false,
      message: 'Pack not found'
    };
  }
  
  // Check if already unlocked
  if (isPackUnlocked(packId)) {
    return {
      success: false,
      message: 'Pack already unlocked'
    };
  }
  
  // Check if player has enough streak stones
  if (!hasEnoughStreakStones(pack.costStreakStones)) {
    return {
      success: false,
      message: 'Not enough streak stones',
      needsStreakStones: true,
      required: pack.costStreakStones,
      current: loadStreakStones()
    };
  }
  
  // Spend streak stones
  if (!spendStreakStones(pack.costStreakStones)) {
    return {
      success: false,
      message: 'Failed to spend streak stones'
    };
  }
  
  // Unlock the pack
  const unlockedPacks = loadUnlockedPacks();
  unlockedPacks.push(packId);
  saveUnlockedPacks(unlockedPacks);
  
  // Initialize task count for this pack
  const taskCounts = loadPackTaskCounts();
  taskCounts[packId] = 0;
  savePackTaskCounts(taskCounts);
  
  return {
    success: true,
    message: 'Pack unlocked successfully',
    packId: packId,
    packName: pack.name
  };
}

/**
 * Get tasks completed since pack unlock
 * @param {string} packId - Pack ID
 * @returns {number} Number of tasks completed since pack unlock
 */
export function getPackTaskCount(packId) {
  const taskCounts = loadPackTaskCounts();
  return taskCounts[packId] || 0;
}

/**
 * Increment task count for all unlocked packs
 * Called when a task is completed
 */
export function incrementPackTaskCounts() {
  const unlockedPacks = loadUnlockedPacks();
  const taskCounts = loadPackTaskCounts();
  
  unlockedPacks.forEach(packId => {
    taskCounts[packId] = (taskCounts[packId] || 0) + 1;
  });
  
  savePackTaskCounts(taskCounts);
}

/**
 * Get all backgrounds for a specific pack
 * @param {string} packId - Pack ID
 * @returns {Array} Array of background objects in this pack
 */
export function getPackBackgrounds(packId) {
  return BACKGROUNDS_UNIFIED.filter(bg => bg.pack === packId && bg.active);
}

/**
 * Get pack unlock status and cost
 * @param {string} packId - Pack ID
 * @returns {Object} Pack status information
 */
export function getPackStatus(packId) {
  const pack = getPack(packId);
  if (!pack) {
    return null;
  }
  
  const unlocked = isPackUnlocked(packId);
  const backgrounds = getPackBackgrounds(packId);
  const taskCount = unlocked ? getPackTaskCount(packId) : 0;
  
  return {
    id: pack.id,
    name: pack.name,
    cost: pack.costStreakStones,
    unlocked: unlocked,
    backgroundCount: backgrounds.length,
    tasksSinceUnlock: taskCount,
    backgrounds: backgrounds
  };
}

/**
 * Get all pack statuses (unlocked and locked)
 * @returns {Object} Object with unlocked and locked pack arrays
 */
export function getAllPackStatuses() {
  const packs = getAllPacks();
  const unlocked = [];
  const locked = [];
  
  packs.forEach(pack => {
    const status = getPackStatus(pack.id);
    if (status) {
      if (status.unlocked) {
        unlocked.push(status);
      } else {
        locked.push(status);
      }
    }
  });
  
  return { unlocked, locked };
}

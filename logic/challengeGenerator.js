// Kopfnuss - Challenge Generator
// Generates and manages daily challenges

import { generateTask, generateKopfnussTask } from './taskGenerators.js';
import { CONFIG, CHALLENGE_TYPES } from '../data/balancingLoader.js';
import { saveChallenges, loadChallenges, getTodayDate, saveKopfnussChallenge, loadKopfnussChallenge, saveZeitChallenge, loadZeitChallenge } from './storageManager.js';
import { logError } from './logging.js';

/**
 * @typedef {Object} Challenge
 * @property {string} id - Unique identifier (e.g., "challenge_0_addition")
 * @property {string} type - Operation type (addition, subtraction, multiplication, division, squared)
 * @property {string} name - Display name of the challenge
 * @property {string} icon - Emoji icon for the challenge
 * @property {string} difficulty - Difficulty level (easy, medium, hard)
 * @property {Task[]} tasks - Array of task objects
 * @property {string} state - Current state (locked, available, in_progress, completed, failed, super_locked, super_available, super_in_progress, super_completed, super_failed)
 * @property {number} errors - Number of errors made in this challenge
 * @property {number} currentTaskIndex - Index of the current task (0-based)
 * @property {string|null} completedAt - ISO timestamp when completed, or null
 * @property {string|null} startedAt - ISO timestamp when started, or null
 * @property {boolean} isSuperChallenge - Whether this is a super challenge
 * @property {string|null} superChallengeResult - Result of super challenge: 'success', 'failed', or null
 */

/**
 * Challenge states
 */
export const CHALLENGE_STATE = {
  LOCKED: 'locked',
  AVAILABLE: 'available',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  // Super challenge states
  SUPER_LOCKED: 'super_locked',
  SUPER_AVAILABLE: 'super_available',
  SUPER_IN_PROGRESS: 'super_in_progress',
  SUPER_COMPLETED: 'super_completed',
  SUPER_FAILED: 'super_failed'
};

/**
 * Kopfnuss Challenge states
 */
export const KOPFNUSS_STATE = {
  NOT_SPAWNED: 'not_spawned',
  AVAILABLE: 'available',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

/**
 * Zeit-Challenge states (same structure as Kopfnuss)
 */
export const ZEIT_CHALLENGE_STATE = {
  NOT_SPAWNED: 'not_spawned',
  AVAILABLE: 'available',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

/**
 * Generate tasks for a single challenge
 * @param {string} operationType - Type of operation
 * @param {number} count - Number of tasks to generate
 * @returns {Array} Array of task objects
 */
function generateTasksForChallenge(operationType, count = CONFIG.TASKS_PER_CHALLENGE) {
  const tasks = [];
  for (let i = 0; i < count; i++) {
    tasks.push(generateTask(operationType));
  }
  return tasks;
}

/**
 * Create a challenge object
 * @param {string} operationType - Type of operation
 * @param {number} index - Challenge index (0-4)
 * @param {boolean} isSuperChallenge - Whether this is a super challenge
 * @returns {Challenge} Challenge object
 */
function createChallenge(operationType, index, isSuperChallenge = false) {
  // Determine initial state based on index and super challenge status
  let state;
  if (index === 0) {
    state = isSuperChallenge ? CHALLENGE_STATE.SUPER_AVAILABLE : CHALLENGE_STATE.AVAILABLE;
  } else {
    state = isSuperChallenge ? CHALLENGE_STATE.SUPER_LOCKED : CHALLENGE_STATE.LOCKED;
  }
  
  return {
    id: `challenge_${index}_${operationType}`,
    type: operationType,
    name: CHALLENGE_TYPES[operationType].name,
    icon: CHALLENGE_TYPES[operationType].icon,
    difficulty: CHALLENGE_TYPES[operationType].difficulty,
    tasks: generateTasksForChallenge(operationType),
    state: state,
    errors: 0,
    currentTaskIndex: 0,
    completedAt: null,
    startedAt: null,
    isSuperChallenge: isSuperChallenge,
    superChallengeResult: null // 'success', 'failed', or null if not yet completed
  };
}

/**
 * Shuffle an array in place using Fisher-Yates algorithm
 * @param {Array} array - Array to shuffle
 * @returns {Array} The shuffled array (same reference)
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Generate 5 daily challenges
 * Challenges are randomly selected from all available types (max one of each type)
 * and shuffled so order varies each day
 * Has a configurable chance (CONFIG.SUPER_CHALLENGE_SPAWN_CHANCE) to include one Super Challenge
 * @returns {Challenge[]} Array of 5 challenge objects
 */
export function generateDailyChallenges() {
  const allChallengeTypes = [
    'addition',
    'subtraction',
    'multiplication',
    'division',
    'squared',
    'mixed'
  ];
  
  // Shuffle all challenge types and pick first 5
  shuffleArray(allChallengeTypes);
  const selectedTypes = allChallengeTypes.slice(0, 5);
  
  // Determine if a super challenge should spawn based on configured chance (default 25%)
  const spawnSuperChallenge = Math.random() < CONFIG.SUPER_CHALLENGE_SPAWN_CHANCE;
  
  // If spawning, randomly select index 2 or 3 for the super challenge
  const superChallengeIndex = spawnSuperChallenge ? (Math.random() < 0.5 ? 2 : 3) : -1;
  
  const challenges = selectedTypes.map((type, index) => 
    createChallenge(type, index, index === superChallengeIndex)
  );
  
  return challenges;
}

/**
 * Get or create today's challenges
 * If challenges exist for today, load them. Otherwise, generate new ones.
 * @returns {Challenge[]} Array of challenge objects
 */
export function getTodaysChallenges() {
  const today = getTodayDate();
  
  // Try to load existing challenges
  let challenges = loadChallenges(today);
  
  // If no challenges exist for today, generate new ones
  if (!challenges) {
    challenges = generateDailyChallenges();
    saveChallenges(challenges, today);
  }
  
  return challenges;
}

/**
 * Update a specific challenge
 * @param {number} challengeIndex - Index of challenge to update
 * @param {Object} updates - Object with properties to update
 * @returns {boolean} Success status
 */
export function updateChallenge(challengeIndex, updates) {
  const challenges = getTodaysChallenges();
  
  if (challengeIndex < 0 || challengeIndex >= challenges.length) {
    logError('Invalid challenge index:', challengeIndex);
    return false;
  }
  
  // Apply updates
  Object.assign(challenges[challengeIndex], updates);
  
  // Save updated challenges
  return saveChallenges(challenges);
}

/**
 * Get a specific challenge by index
 * @param {number} challengeIndex - Index of challenge
 * @returns {Challenge|null} Challenge object or null
 */
export function getChallenge(challengeIndex) {
  const challenges = getTodaysChallenges();
  
  if (challengeIndex < 0 || challengeIndex >= challenges.length) {
    logError('Invalid challenge index:', challengeIndex);
    return null;
  }
  
  return challenges[challengeIndex];
}

/**
 * Reset all challenges (generate new ones for today)
 * Also regenerates premium challenges (Zeit-Challenge or Kopfnuss-Challenge) with mutually exclusive spawn
 * @returns {Challenge[]} New array of challenges
 */
export function resetChallenges() {
  const challenges = generateDailyChallenges();
  saveChallenges(challenges);
  
  // Regenerate premium challenges with mutually exclusive spawn logic
  const today = getTodayDate();
  regeneratePremiumChallenges(today);
  
  return challenges;
}

/**
 * Regenerate premium challenges (Zeit-Challenge and Kopfnuss-Challenge) with mutually exclusive spawn
 * Zeit-Challenge is rolled first; if it doesn't spawn, Kopfnuss-Challenge is rolled
 * @param {string} date - Date string
 */
function regeneratePremiumChallenges(date) {
  const zeitSpawnProbability = CONFIG.ZEIT_CHALLENGE_SPAWN_PROBABILITY || 0.15;
  const kopfnussSpawnProbability = CONFIG.KOPFNUSS_SPAWN_PROBABILITY || 0.3;
  
  // First, roll for Zeit-Challenge
  const zeitSpawned = Math.random() < zeitSpawnProbability;
  
  if (zeitSpawned) {
    // Zeit-Challenge spawns, Kopfnuss does not
    const zeitChallenge = createZeitChallenge(true);
    saveZeitChallenge(zeitChallenge, date);
    const kopfnuss = createKopfnussChallenge(false);
    saveKopfnussChallenge(kopfnuss, date);
  } else {
    // Zeit-Challenge doesn't spawn, roll for Kopfnuss
    const kopfnussSpawned = Math.random() < kopfnussSpawnProbability;
    const kopfnuss = createKopfnussChallenge(kopfnussSpawned);
    saveKopfnussChallenge(kopfnuss, date);
    const zeitChallenge = createZeitChallenge(false);
    saveZeitChallenge(zeitChallenge, date);
  }
}

/**
 * Check if all challenges are completed
 * @returns {boolean} True if all challenges completed
 */
export function areAllChallengesCompleted() {
  const challenges = getTodaysChallenges();
  return challenges.every(challenge => 
    challenge.state === CHALLENGE_STATE.COMPLETED || 
    challenge.state === CHALLENGE_STATE.SUPER_COMPLETED
  );
}

/**
 * Check if a state represents a super challenge
 * @param {string} state - The challenge state
 * @returns {boolean} True if the state is a super challenge state
 */
export function isSuperChallengeState(state) {
  return state.startsWith('super_');
}

/**
 * Get the equivalent regular state for a super challenge state
 * @param {string} superState - The super challenge state
 * @returns {string} The equivalent regular state
 */
export function getSuperStateEquivalent(superState) {
  if (!isSuperChallengeState(superState)) {
    return superState;
  }
  return superState.replace('super_', '');
}

/**
 * Get challenge statistics
 * @returns {Object} Statistics object
 */
export function getChallengeStats() {
  const challenges = getTodaysChallenges();
  
  const completed = challenges.filter(c => 
    c.state === CHALLENGE_STATE.COMPLETED || c.state === CHALLENGE_STATE.SUPER_COMPLETED
  ).length;
  
  const inProgress = challenges.filter(c => 
    c.state === CHALLENGE_STATE.IN_PROGRESS || c.state === CHALLENGE_STATE.SUPER_IN_PROGRESS
  ).length;
  
  const available = challenges.filter(c => 
    c.state === CHALLENGE_STATE.AVAILABLE || c.state === CHALLENGE_STATE.SUPER_AVAILABLE
  ).length;
  
  const locked = challenges.filter(c => 
    c.state === CHALLENGE_STATE.LOCKED || c.state === CHALLENGE_STATE.SUPER_LOCKED
  ).length;
  
  const totalErrors = challenges.reduce((sum, c) => sum + c.errors, 0);
  
  return {
    total: challenges.length,
    completed,
    inProgress,
    available,
    locked,
    totalErrors
  };
}

// ============================================
// KOPFNUSS CHALLENGE FUNCTIONS
// ============================================

/**
 * Generate tasks for the Kopfnuss Challenge
 * @param {number} count - Number of tasks to generate
 * @returns {Array} Array of high-difficulty task objects
 */
function generateKopfnussTasksForChallenge(count = CONFIG.KOPFNUSS_TASK_COUNT) {
  // Validate task count with fallback
  const taskCount = Number(count) || 5;
  const tasks = [];
  for (let i = 0; i < taskCount; i++) {
    tasks.push(generateKopfnussTask());
  }
  return tasks;
}

/**
 * Create a new Kopfnuss Challenge object
 * @param {boolean} spawned - Whether the challenge spawned
 * @returns {Object} Kopfnuss Challenge object
 */
function createKopfnussChallenge(spawned) {
  if (!spawned) {
    return {
      state: KOPFNUSS_STATE.NOT_SPAWNED,
      spawned: false,
      tasks: [],
      errors: 0,
      currentTaskIndex: 0,
      completedAt: null,
      startedAt: null,
      result: null // 'success', 'failed', or null
    };
  }
  
  return {
    state: KOPFNUSS_STATE.AVAILABLE,
    spawned: true,
    tasks: generateKopfnussTasksForChallenge(),
    errors: 0,
    currentTaskIndex: 0,
    completedAt: null,
    startedAt: null,
    result: null
  };
}

/**
 * Generate or load today's Kopfnuss Challenge
 * Rolls for spawn probability if not yet generated for today
 * Uses mutually exclusive spawn with Zeit-Challenge
 * @param {boolean} forceSpawn - Force spawn the challenge (dev mode)
 * @returns {Object} Kopfnuss Challenge object
 */
export function getOrCreateKopfnussChallenge(forceSpawn = false) {
  const today = getTodayDate();
  
  // Try to load existing Kopfnuss Challenge
  let kopfnuss = loadKopfnussChallenge(today);
  
  // If no Kopfnuss Challenge exists for today, generate both premium challenges
  if (!kopfnuss) {
    if (forceSpawn) {
      // Force spawn - only create Kopfnuss, don't affect Zeit-Challenge
      kopfnuss = createKopfnussChallenge(true);
      saveKopfnussChallenge(kopfnuss, today);
      // If Zeit-Challenge doesn't exist, mark it as not spawned
      let zeit = loadZeitChallenge(today);
      if (!zeit) {
        zeit = createZeitChallenge(false);
        saveZeitChallenge(zeit, today);
      }
    } else {
      // Use mutually exclusive spawn logic
      regeneratePremiumChallenges(today);
      kopfnuss = loadKopfnussChallenge(today);
    }
  }
  
  return kopfnuss;
}

/**
 * Get today's Kopfnuss Challenge (if exists)
 * @returns {Object|null} Kopfnuss Challenge object or null
 */
export function getTodaysKopfnussChallenge() {
  const today = getTodayDate();
  return loadKopfnussChallenge(today);
}

/**
 * Update the Kopfnuss Challenge
 * @param {Object} updates - Object with properties to update
 * @returns {boolean} Success status
 */
export function updateKopfnussChallenge(updates) {
  const today = getTodayDate();
  let kopfnuss = loadKopfnussChallenge(today);
  
  if (!kopfnuss) {
    logError('No Kopfnuss Challenge found for today');
    return false;
  }
  
  // Apply updates
  Object.assign(kopfnuss, updates);
  
  // Save updated challenge
  return saveKopfnussChallenge(kopfnuss, today);
}

/**
 * Start the Kopfnuss Challenge
 * @returns {boolean} Success status
 */
export function startKopfnussChallenge() {
  const kopfnuss = getTodaysKopfnussChallenge();
  
  if (!kopfnuss || !kopfnuss.spawned) {
    logError('No Kopfnuss Challenge available');
    return false;
  }
  
  if (kopfnuss.state !== KOPFNUSS_STATE.AVAILABLE) {
    logError('Kopfnuss Challenge not in available state:', kopfnuss.state);
    return false;
  }
  
  return updateKopfnussChallenge({
    state: KOPFNUSS_STATE.IN_PROGRESS,
    startedAt: new Date().toISOString(),
    currentTaskIndex: 0,
    errors: 0
  });
}

/**
 * Complete the Kopfnuss Challenge
 * @param {number} errors - Number of errors made
 * @returns {Object} Result with success status and result
 */
export function completeKopfnussChallenge(errors) {
  const isPerfect = errors === 0;
  const result = isPerfect ? 'success' : 'failed';
  
  updateKopfnussChallenge({
    state: isPerfect ? KOPFNUSS_STATE.COMPLETED : KOPFNUSS_STATE.FAILED,
    completedAt: new Date().toISOString(),
    errors: errors,
    result: result
  });
  
  return {
    success: isPerfect,
    result: result,
    errors: errors
  };
}

/**
 * Reset the Kopfnuss Challenge after failure (regenerate tasks)
 * @returns {boolean} Success status
 */
export function resetKopfnussChallengeAfterFailure() {
  const kopfnuss = getTodaysKopfnussChallenge();
  
  if (!kopfnuss || !kopfnuss.spawned) {
    return false;
  }
  
  // Only reset if failed
  if (kopfnuss.state !== KOPFNUSS_STATE.FAILED) {
    return false;
  }
  
  return updateKopfnussChallenge({
    state: KOPFNUSS_STATE.AVAILABLE,
    tasks: generateKopfnussTasksForChallenge(),
    errors: 0,
    currentTaskIndex: 0,
    completedAt: null,
    startedAt: null,
    result: null
  });
}

/**
 * Force regenerate Kopfnuss Challenge (dev mode only)
 * @param {boolean} forceSpawn - Whether to force spawn
 * @returns {Object} New Kopfnuss Challenge
 */
export function regenerateKopfnussChallenge(forceSpawn = true) {
  const today = getTodayDate();
  const kopfnuss = createKopfnussChallenge(forceSpawn);
  saveKopfnussChallenge(kopfnuss, today);
  // When forcing Kopfnuss, ensure Zeit-Challenge is marked as not spawned
  if (forceSpawn) {
    const zeit = createZeitChallenge(false);
    saveZeitChallenge(zeit, today);
  }
  return kopfnuss;
}

// ============================================
// ZEIT-CHALLENGE FUNCTIONS
// ============================================

/**
 * Generate tasks for the Zeit-Challenge using normal difficulty (mixed tasks)
 * @param {number} count - Number of tasks to generate
 * @returns {Array} Array of normal-difficulty mixed task objects
 */
function generateZeitChallengeTasksForChallenge(count = CONFIG.ZEIT_CHALLENGE_TASK_COUNT) {
  // Validate task count with fallback
  const taskCount = Number(count) || 8;
  const tasks = [];
  for (let i = 0; i < taskCount; i++) {
    // Use normal difficulty mixed tasks (not Kopfnuss difficulty)
    tasks.push(generateTask('mixed'));
  }
  return tasks;
}

/**
 * Create a new Zeit-Challenge object
 * @param {boolean} spawned - Whether the challenge spawned
 * @returns {Object} Zeit-Challenge object
 */
function createZeitChallenge(spawned) {
  if (!spawned) {
    return {
      state: ZEIT_CHALLENGE_STATE.NOT_SPAWNED,
      spawned: false,
      tasks: [],
      errors: 0,
      currentTaskIndex: 0,
      completedAt: null,
      startedAt: null,
      result: null, // 'success', 'timeout', or null
      timeRemaining: null
    };
  }
  
  return {
    state: ZEIT_CHALLENGE_STATE.AVAILABLE,
    spawned: true,
    tasks: generateZeitChallengeTasksForChallenge(),
    errors: 0,
    currentTaskIndex: 0,
    completedAt: null,
    startedAt: null,
    result: null,
    timeRemaining: CONFIG.ZEIT_CHALLENGE_TIME_LIMIT_SECONDS || 120
  };
}

/**
 * Generate or load today's Zeit-Challenge
 * Uses mutually exclusive spawn with Kopfnuss-Challenge
 * @param {boolean} forceSpawn - Force spawn the challenge (dev mode)
 * @returns {Object} Zeit-Challenge object
 */
export function getOrCreateZeitChallenge(forceSpawn = false) {
  const today = getTodayDate();
  
  // Try to load existing Zeit-Challenge
  let zeit = loadZeitChallenge(today);
  
  // If no Zeit-Challenge exists for today, generate both premium challenges
  if (!zeit) {
    if (forceSpawn) {
      // Force spawn - only create Zeit-Challenge, don't affect Kopfnuss
      zeit = createZeitChallenge(true);
      saveZeitChallenge(zeit, today);
      // If Kopfnuss doesn't exist, mark it as not spawned
      let kopfnuss = loadKopfnussChallenge(today);
      if (!kopfnuss) {
        kopfnuss = createKopfnussChallenge(false);
        saveKopfnussChallenge(kopfnuss, today);
      }
    } else {
      // Use mutually exclusive spawn logic
      regeneratePremiumChallenges(today);
      zeit = loadZeitChallenge(today);
    }
  }
  
  return zeit;
}

/**
 * Get today's Zeit-Challenge (if exists)
 * @returns {Object|null} Zeit-Challenge object or null
 */
export function getTodaysZeitChallenge() {
  const today = getTodayDate();
  return loadZeitChallenge(today);
}

/**
 * Update the Zeit-Challenge
 * @param {Object} updates - Object with properties to update
 * @returns {boolean} Success status
 */
export function updateZeitChallenge(updates) {
  const today = getTodayDate();
  let zeit = loadZeitChallenge(today);
  
  if (!zeit) {
    logError('No Zeit-Challenge found for today');
    return false;
  }
  
  // Apply updates
  Object.assign(zeit, updates);
  
  // Save updated challenge
  return saveZeitChallenge(zeit, today);
}

/**
 * Start the Zeit-Challenge
 * @returns {boolean} Success status
 */
export function startZeitChallenge() {
  const zeit = getTodaysZeitChallenge();
  
  if (!zeit || !zeit.spawned) {
    logError('No Zeit-Challenge available');
    return false;
  }
  
  if (zeit.state !== ZEIT_CHALLENGE_STATE.AVAILABLE) {
    logError('Zeit-Challenge not in available state:', zeit.state);
    return false;
  }
  
  return updateZeitChallenge({
    state: ZEIT_CHALLENGE_STATE.IN_PROGRESS,
    startedAt: new Date().toISOString(),
    currentTaskIndex: 0,
    errors: 0,
    timeRemaining: CONFIG.ZEIT_CHALLENGE_TIME_LIMIT_SECONDS || 120
  });
}

/**
 * Complete the Zeit-Challenge (all tasks solved in time)
 * @param {number} errors - Number of errors made
 * @returns {Object} Result with success status
 */
export function completeZeitChallenge(errors) {
  // Zeit-Challenge always succeeds if completed in time (errors don't matter)
  updateZeitChallenge({
    state: ZEIT_CHALLENGE_STATE.COMPLETED,
    completedAt: new Date().toISOString(),
    errors: errors,
    result: 'success'
  });
  
  return {
    success: true,
    result: 'success',
    errors: errors
  };
}

/**
 * Fail the Zeit-Challenge (time ran out)
 * @param {number} errors - Number of errors made
 * @param {number} currentTaskIndex - Current task index when time ran out
 * @returns {Object} Result with failure status
 */
export function failZeitChallenge(errors, currentTaskIndex) {
  updateZeitChallenge({
    state: ZEIT_CHALLENGE_STATE.FAILED,
    completedAt: new Date().toISOString(),
    errors: errors,
    currentTaskIndex: currentTaskIndex,
    result: 'timeout',
    timeRemaining: 0
  });
  
  return {
    success: false,
    result: 'timeout',
    errors: errors
  };
}

/**
 * Reset the Zeit-Challenge after failure (regenerate tasks)
 * @returns {boolean} Success status
 */
export function resetZeitChallengeAfterFailure() {
  const zeit = getTodaysZeitChallenge();
  
  if (!zeit || !zeit.spawned) {
    return false;
  }
  
  // Only reset if failed
  if (zeit.state !== ZEIT_CHALLENGE_STATE.FAILED) {
    return false;
  }
  
  return updateZeitChallenge({
    state: ZEIT_CHALLENGE_STATE.AVAILABLE,
    tasks: generateZeitChallengeTasksForChallenge(),
    errors: 0,
    currentTaskIndex: 0,
    completedAt: null,
    startedAt: null,
    result: null,
    timeRemaining: CONFIG.ZEIT_CHALLENGE_TIME_LIMIT_SECONDS || 120
  });
}

/**
 * Force regenerate Zeit-Challenge (dev mode only)
 * @param {boolean} forceSpawn - Whether to force spawn
 * @returns {Object} New Zeit-Challenge
 */
export function regenerateZeitChallenge(forceSpawn = true) {
  const today = getTodayDate();
  const zeit = createZeitChallenge(forceSpawn);
  saveZeitChallenge(zeit, today);
  // When forcing Zeit-Challenge, ensure Kopfnuss is marked as not spawned
  if (forceSpawn) {
    const kopfnuss = createKopfnussChallenge(false);
    saveKopfnussChallenge(kopfnuss, today);
  }
  return zeit;
}

// Kopfnuss - Challenge Generator
// Generates and manages daily challenges

import { generateTask, generateKopfnussTask } from './taskGenerators.js';
import { CONFIG, CHALLENGE_TYPES } from '../data/balancingLoader.js';
import { saveChallenges, loadChallenges, getTodayDate, saveKopfnussChallenge, loadKopfnussChallenge } from './storageManager.js';

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
 * @returns {Object} Challenge object
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
 * @returns {Array} Array of 5 challenge objects
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
 * @returns {Array} Array of challenge objects
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
    console.error('Invalid challenge index:', challengeIndex);
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
 * @returns {Object|null} Challenge object or null
 */
export function getChallenge(challengeIndex) {
  const challenges = getTodaysChallenges();
  
  if (challengeIndex < 0 || challengeIndex >= challenges.length) {
    console.error('Invalid challenge index:', challengeIndex);
    return null;
  }
  
  return challenges[challengeIndex];
}

/**
 * Reset all challenges (generate new ones for today)
 * Also regenerates the Kopfnuss Challenge with a new spawn roll
 * @returns {Array} New array of challenges
 */
export function resetChallenges() {
  const challenges = generateDailyChallenges();
  saveChallenges(challenges);
  
  // Also regenerate Kopfnuss Challenge with new spawn roll
  const today = getTodayDate();
  const spawnProbability = CONFIG.KOPFNUSS_SPAWN_PROBABILITY || 0.3;
  const spawned = Math.random() < spawnProbability;
  const kopfnuss = createKopfnussChallenge(spawned);
  saveKopfnussChallenge(kopfnuss, today);
  
  return challenges;
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
  const tasks = [];
  for (let i = 0; i < count; i++) {
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
 * @param {boolean} forceSpawn - Force spawn the challenge (dev mode)
 * @returns {Object} Kopfnuss Challenge object
 */
export function getOrCreateKopfnussChallenge(forceSpawn = false) {
  const today = getTodayDate();
  
  // Try to load existing Kopfnuss Challenge
  let kopfnuss = loadKopfnussChallenge(today);
  
  // If no Kopfnuss Challenge exists for today, generate one
  if (!kopfnuss) {
    // Roll for spawn probability
    const spawnProbability = CONFIG.KOPFNUSS_SPAWN_PROBABILITY || 0.3;
    const spawned = forceSpawn || (Math.random() < spawnProbability);
    
    kopfnuss = createKopfnussChallenge(spawned);
    saveKopfnussChallenge(kopfnuss, today);
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
    console.error('No Kopfnuss Challenge found for today');
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
    console.error('No Kopfnuss Challenge available');
    return false;
  }
  
  if (kopfnuss.state !== KOPFNUSS_STATE.AVAILABLE) {
    console.error('Kopfnuss Challenge not in available state:', kopfnuss.state);
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
  return kopfnuss;
}

// Kopfnuss - Challenge Generator
// Generates and manages daily challenges

import { generateTask } from './taskGenerators.js';
import { CONFIG, CHALLENGE_TYPES } from '../data/balancing.js';
import { saveChallenges, loadChallenges, getTodayDate } from './storageManager.js';

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
 * One challenge (at index 2 or 3) is randomly designated as a Super Challenge
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
  
  // Randomly select index 2 or 3 for the super challenge
  // Based on CONFIG.DAILY_CHALLENGES: if 5 challenges, use index 2 or 3 (next-to-last or before that)
  const superChallengeIndex = Math.random() < 0.5 ? 2 : 3;
  
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
 * @returns {Array} New array of challenges
 */
export function resetChallenges() {
  const challenges = generateDailyChallenges();
  saveChallenges(challenges);
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

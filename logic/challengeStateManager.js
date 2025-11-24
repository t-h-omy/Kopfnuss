// Kopfnuss - Challenge State Manager
// Manages challenge state transitions and logic

import { 
  getTodaysChallenges, 
  updateChallenge,
  CHALLENGE_STATE 
} from './challengeGenerator.js';

/**
 * Start a challenge
 * @param {number} challengeIndex - Index of challenge to start
 * @returns {boolean} Success status
 */
export function startChallenge(challengeIndex) {
  const challenges = getTodaysChallenges();
  const challenge = challenges[challengeIndex];
  
  if (!challenge) {
    console.error('Challenge not found:', challengeIndex);
    return false;
  }
  
  // Only allow starting if challenge is available
  if (challenge.state !== CHALLENGE_STATE.AVAILABLE) {
    console.error('Challenge not available:', challenge.state);
    return false;
  }
  
  return updateChallenge(challengeIndex, {
    state: CHALLENGE_STATE.IN_PROGRESS,
    startedAt: new Date().toISOString(),
    currentTaskIndex: 0,
    errors: 0
  });
}

/**
 * Complete a challenge
 * @param {number} challengeIndex - Index of challenge
 * @param {number} errors - Number of errors made
 * @returns {boolean} Success status
 */
export function completeChallenge(challengeIndex, errors = 0) {
  const success = updateChallenge(challengeIndex, {
    state: CHALLENGE_STATE.COMPLETED,
    completedAt: new Date().toISOString(),
    errors: errors
  });
  
  if (success) {
    // Unlock next challenge
    unlockNextChallenge(challengeIndex);
  }
  
  return success;
}

/**
 * Fail a challenge (abandoned or too many errors)
 * @param {number} challengeIndex - Index of challenge
 * @param {number} errors - Number of errors made
 * @returns {boolean} Success status
 */
export function failChallenge(challengeIndex, errors = 0) {
  return updateChallenge(challengeIndex, {
    state: CHALLENGE_STATE.FAILED,
    completedAt: new Date().toISOString(),
    errors: errors
  });
}

/**
 * Unlock the next challenge after completing current one
 * @param {number} currentChallengeIndex - Index of completed challenge
 * @returns {boolean} Success status
 */
export function unlockNextChallenge(currentChallengeIndex) {
  const challenges = getTodaysChallenges();
  const nextIndex = currentChallengeIndex + 1;
  
  // Check if there is a next challenge
  if (nextIndex >= challenges.length) {
    return false; // No more challenges to unlock
  }
  
  const nextChallenge = challenges[nextIndex];
  
  // Only unlock if it's currently locked
  if (nextChallenge.state === CHALLENGE_STATE.LOCKED) {
    return updateChallenge(nextIndex, {
      state: CHALLENGE_STATE.AVAILABLE
    });
  }
  
  return false;
}

/**
 * Update current task index in a challenge
 * @param {number} challengeIndex - Index of challenge
 * @param {number} taskIndex - New task index
 * @returns {boolean} Success status
 */
export function updateTaskIndex(challengeIndex, taskIndex) {
  return updateChallenge(challengeIndex, {
    currentTaskIndex: taskIndex
  });
}

/**
 * Increment error count for a challenge
 * @param {number} challengeIndex - Index of challenge
 * @returns {boolean} Success status
 */
export function incrementErrors(challengeIndex) {
  const challenges = getTodaysChallenges();
  const challenge = challenges[challengeIndex];
  
  if (!challenge) {
    return false;
  }
  
  return updateChallenge(challengeIndex, {
    errors: challenge.errors + 1
  });
}

/**
 * Analyze errors for a challenge
 * @param {number} challengeIndex - Index of challenge
 * @returns {Object} Error analysis
 */
export function analyzeErrors(challengeIndex) {
  const challenges = getTodaysChallenges();
  const challenge = challenges[challengeIndex];
  
  if (!challenge) {
    return null;
  }
  
  const totalTasks = challenge.tasks.length;
  const errors = challenge.errors;
  const errorRate = (errors / totalTasks) * 100;
  
  let rating = 'perfect';
  if (errors > 0) rating = 'good';
  if (errors > 2) rating = 'okay';
  if (errors > 5) rating = 'needs_improvement';
  
  return {
    totalTasks,
    errors,
    correctAnswers: totalTasks - errors,
    errorRate: errorRate.toFixed(1),
    rating,
    isPerfect: errors === 0
  };
}

/**
 * Check if a challenge can be started
 * @param {number} challengeIndex - Index of challenge
 * @returns {Object} Object with canStart flag and reason
 */
export function canStartChallenge(challengeIndex) {
  const challenges = getTodaysChallenges();
  const challenge = challenges[challengeIndex];
  
  if (!challenge) {
    return {
      canStart: false,
      reason: 'Challenge not found'
    };
  }
  
  if (challenge.state === CHALLENGE_STATE.LOCKED) {
    return {
      canStart: false,
      reason: 'Challenge is locked. Complete previous challenges first.'
    };
  }
  
  if (challenge.state === CHALLENGE_STATE.COMPLETED) {
    return {
      canStart: false,
      reason: 'Challenge already completed today'
    };
  }
  
  if (challenge.state === CHALLENGE_STATE.FAILED) {
    return {
      canStart: false,
      reason: 'Challenge already attempted today'
    };
  }
  
  return {
    canStart: true,
    reason: null
  };
}

/**
 * Reset a challenge to available state (for retry)
 * @param {number} challengeIndex - Index of challenge
 * @returns {boolean} Success status
 */
export function resetChallenge(challengeIndex) {
  const challenges = getTodaysChallenges();
  const challenge = challenges[challengeIndex];
  
  if (!challenge) {
    return false;
  }
  
  return updateChallenge(challengeIndex, {
    state: CHALLENGE_STATE.AVAILABLE,
    errors: 0,
    currentTaskIndex: 0,
    completedAt: null,
    startedAt: null
  });
}

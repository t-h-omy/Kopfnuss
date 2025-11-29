// Kopfnuss - Task Flow Manager
// Manages the flow of tasks within a challenge

import { getChallenge } from './challengeGenerator.js';
import { 
  updateTaskIndex, 
  incrementErrors, 
  completeChallenge,
  analyzeErrors 
} from './challengeStateManager.js';
import { saveProgress, loadProgress, loadStreak } from './storageManager.js';
import { unfreezeStreakByChallenge, incrementStreakByChallenge } from './streakManager.js';
import { 
  isEventActive, 
  getActiveEvent, 
  addSeasonalCurrency, 
  incrementSeasonalTasks 
} from './eventManager.js';

/**
 * Task flow state
 */
let currentChallengeIndex = null;
let currentTaskIndex = 0;
let errors = 0;
let answers = []; // Store user answers for review
let streakUnfrozenDuringChallenge = false; // Track if streak was unfrozen

/**
 * Initialize task flow for a challenge
 * @param {number} challengeIndex - Index of challenge to start
 * @returns {Object} Initial state
 */
export function initializeTaskFlow(challengeIndex) {
  const challenge = getChallenge(challengeIndex);
  
  if (!challenge) {
    return null;
  }
  
  currentChallengeIndex = challengeIndex;
  currentTaskIndex = challenge.currentTaskIndex || 0;
  errors = challenge.errors || 0;
  answers = [];
  streakUnfrozenDuringChallenge = false; // Reset the flag for new challenge
  
  return {
    challengeIndex,
    taskIndex: currentTaskIndex,
    totalTasks: challenge.tasks.length,
    errors,
    challenge
  };
}

/**
 * Get the current task
 * @returns {Object|null} Current task object
 */
export function getCurrentTask() {
  if (currentChallengeIndex === null) {
    return null;
  }
  
  const challenge = getChallenge(currentChallengeIndex);
  if (!challenge || currentTaskIndex >= challenge.tasks.length) {
    return null;
  }
  
  return {
    task: challenge.tasks[currentTaskIndex],
    taskNumber: currentTaskIndex + 1,
    totalTasks: challenge.tasks.length,
    errors: errors
  };
}

/**
 * Validate user answer for current task
 * @param {number|string} userAnswer - User's answer
 * @returns {Object} Validation result
 */
export function validateAnswer(userAnswer) {
  const currentTask = getCurrentTask();
  
  if (!currentTask) {
    return {
      isValid: false,
      error: 'No active task'
    };
  }
  
  const correctAnswer = currentTask.task.answer;
  
  // Parse and validate answer - use parseInt for integer results
  let normalizedAnswer;
  if (typeof userAnswer === 'string') {
    const trimmed = userAnswer.trim();
    // Check if answer should be integer (all our tasks have integer answers)
    normalizedAnswer = parseInt(trimmed, 10);
    // Validate that it's a valid integer
    if (isNaN(normalizedAnswer) || trimmed !== normalizedAnswer.toString()) {
      return {
        isValid: false,
        error: 'Bitte gib eine ganze Zahl ein'
      };
    }
  } else {
    normalizedAnswer = Math.floor(userAnswer);
  }
  
  const isCorrect = normalizedAnswer === correctAnswer;
  
  // Store answer
  answers.push({
    taskIndex: currentTaskIndex,
    question: currentTask.task.question,
    correctAnswer: correctAnswer,
    userAnswer: normalizedAnswer,
    isCorrect: isCorrect
  });
  
  if (!isCorrect) {
    errors++;
    incrementErrors(currentChallengeIndex);
  }
  
  return {
    isValid: true,
    isCorrect: isCorrect,
    correctAnswer: correctAnswer,
    userAnswer: normalizedAnswer
  };
}

/**
 * Move to next task
 * @returns {Object} Next task state
 */
export function nextTask() {
  if (currentChallengeIndex === null) {
    return {
      hasNext: false,
      error: 'No active challenge'
    };
  }
  
  const challenge = getChallenge(currentChallengeIndex);
  currentTaskIndex++;
  
  // Update task index in storage
  updateTaskIndex(currentChallengeIndex, currentTaskIndex);
  
  // Update progress immediately when task is solved correctly
  // This ensures diamond progress updates in real-time
  const progress = loadProgress();
  const today = new Date().toISOString().split('T')[0];
  
  progress.totalTasksCompleted = (progress.totalTasksCompleted || 0) + 1;
  
  // Update tasks completed today
  if (progress.lastPlayedDate === today) {
    progress.tasksCompletedToday = (progress.tasksCompletedToday || 0) + 1;
  } else {
    progress.tasksCompletedToday = 1;
  }
  
  progress.lastPlayedDate = today;
  saveProgress(progress);
  
  // If a seasonal event is active, increment the seasonal task counter
  if (isEventActive()) {
    incrementSeasonalTasks(1);
  }
  
  const hasNext = currentTaskIndex < challenge.tasks.length;
  
  if (!hasNext) {
    // Challenge completed
    return {
      hasNext: false,
      isComplete: true,
      taskIndex: currentTaskIndex
    };
  }
  
  return {
    hasNext: true,
    isComplete: false,
    taskIndex: currentTaskIndex
  };
}

/**
 * Complete the current challenge
 * Updates progress and returns results
 * @returns {Object} Completion results
 */
export function completeCurrentChallenge() {
  if (currentChallengeIndex === null) {
    return null;
  }
  
  const challenge = getChallenge(currentChallengeIndex);
  
  // Check if a seasonal event is active for currency rewards
  const eventActive = isEventActive();
  const activeEvent = eventActive ? getActiveEvent() : null;
  
  // Determine super challenge result if applicable
  let superChallengeSuccess = null;
  let superChallengeAwardedDiamond = false;
  let seasonalCurrencyAwarded = null;
  
  if (challenge && challenge.isSuperChallenge) {
    // Super challenge success requires zero errors
    superChallengeSuccess = errors === 0;
    
    // If event is active, award seasonal currency instead of diamond
    if (superChallengeSuccess) {
      if (eventActive && activeEvent) {
        // Award seasonal currency instead of diamond during events
        const currencyResult = addSeasonalCurrency(1);
        if (currencyResult.success) {
          seasonalCurrencyAwarded = {
            amount: 1,
            emoticon: activeEvent.emoticon,
            currencyName: activeEvent.currencyName
          };
        }
        superChallengeAwardedDiamond = false;
      } else {
        // No event - award diamond as normal
        superChallengeAwardedDiamond = true;
      }
    }
  }
  
  // Mark challenge as complete (with super challenge result if applicable)
  completeChallenge(currentChallengeIndex, errors, superChallengeSuccess);
  
  // Update overall progress - only increment challenges completed
  // Tasks are already counted in nextTask() when each task is solved
  const progress = loadProgress();
  
  progress.totalChallengesCompleted = (progress.totalChallengesCompleted || 0) + 1;
  progress.lastPlayedDate = new Date().toISOString().split('T')[0];
  
  saveProgress(progress);
  
  // Handle streak progression
  let streakUnfrozenResult = null;
  let streakIncrementedResult = null;
  const streak = loadStreak();
  
  if (streak.isFrozen) {
    // Unfreeze streak if frozen
    streakUnfrozenResult = unfreezeStreakByChallenge();
    if (streakUnfrozenResult.wasUnfrozen) {
      streakUnfrozenDuringChallenge = true;
    }
  } else if (!streak.lossReason) {
    // If not frozen and no loss reason, increment streak by challenge completion
    streakIncrementedResult = incrementStreakByChallenge();
  }
  // Note: If there's a loss reason (expired streak), don't auto-increment
  // The player needs to handle this via the popup first
  
  // Get error analysis
  const errorAnalysis = analyzeErrors(currentChallengeIndex);
  
  const results = {
    challengeIndex: currentChallengeIndex,
    totalTasks: challenge.tasks.length,
    errors: errors,
    errorAnalysis: errorAnalysis,
    answers: answers,
    progress: progress,
    streakUnfrozen: streakUnfrozenResult && streakUnfrozenResult.wasUnfrozen ? streakUnfrozenResult.newStreak : null,
    streakIncremented: streakIncrementedResult && streakIncrementedResult.wasIncremented ? streakIncrementedResult.newStreak : null,
    // Super challenge specific results
    isSuperChallenge: challenge?.isSuperChallenge || false,
    superChallengeSuccess: superChallengeSuccess,
    superChallengeAwardedDiamond: superChallengeAwardedDiamond,
    seasonalCurrencyAwarded: seasonalCurrencyAwarded
  };
  
  // Reset task flow state
  resetTaskFlow();
  
  return results;
}

/**
 * Reset task flow state
 */
export function resetTaskFlow() {
  currentChallengeIndex = null;
  currentTaskIndex = 0;
  errors = 0;
  answers = [];
}

/**
 * Get current task flow state
 * @returns {Object} Current state
 */
export function getTaskFlowState() {
  const challenge = currentChallengeIndex !== null ? getChallenge(currentChallengeIndex) : null;
  
  return {
    challengeIndex: currentChallengeIndex,
    taskIndex: currentTaskIndex,
    errors: errors,
    answersCount: answers.length,
    isSuperChallenge: challenge?.isSuperChallenge || false,
    superChallengeFailed: challenge?.isSuperChallenge && errors > 0
  };
}

/**
 * Abandon current challenge
 * @returns {boolean} Success status
 */
export function abandonChallenge() {
  if (currentChallengeIndex === null) {
    return false;
  }
  
  // Reset the challenge state
  resetTaskFlow();
  return true;
}

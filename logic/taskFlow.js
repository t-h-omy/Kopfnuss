// Kopfnuss - Task Flow Manager
// Manages the flow of tasks within a challenge

import { getChallenge } from './challengeGenerator.js';
import { 
  updateTaskIndex, 
  incrementErrors, 
  completeChallenge,
  analyzeErrors 
} from './challengeStateManager.js';
import { saveProgress, loadProgress } from './storageManager.js';

/**
 * Task flow state
 */
let currentChallengeIndex = null;
let currentTaskIndex = 0;
let errors = 0;
let answers = []; // Store user answers for review

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
  
  // Mark challenge as complete
  completeChallenge(currentChallengeIndex, errors);
  
  // Update overall progress
  const progress = loadProgress();
  const challenge = getChallenge(currentChallengeIndex);
  
  progress.totalTasksCompleted += challenge.tasks.length;
  progress.totalChallengesCompleted += 1;
  progress.lastPlayedDate = new Date().toISOString().split('T')[0];
  
  // Get today's date
  const today = new Date().toISOString().split('T')[0];
  if (progress.lastPlayedDate === today) {
    // Increment tasks completed today
    progress.tasksCompletedToday = (progress.tasksCompletedToday || 0) + challenge.tasks.length;
  } else {
    // New day, reset counter
    progress.tasksCompletedToday = challenge.tasks.length;
  }
  
  saveProgress(progress);
  
  // Get error analysis
  const errorAnalysis = analyzeErrors(currentChallengeIndex);
  
  const results = {
    challengeIndex: currentChallengeIndex,
    totalTasks: challenge.tasks.length,
    errors: errors,
    errorAnalysis: errorAnalysis,
    answers: answers,
    progress: progress
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
  return {
    challengeIndex: currentChallengeIndex,
    taskIndex: currentTaskIndex,
    errors: errors,
    answersCount: answers.length
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

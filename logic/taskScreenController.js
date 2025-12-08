// Kopfnuss - Task Screen Controller
// Handles UI for task screen and integrates with task flow logic

import { 
  initializeTaskFlow, 
  getCurrentTask, 
  validateAnswer, 
  nextTask, 
  completeCurrentChallenge,
  abandonChallenge,
  getTaskFlowState
} from './taskFlow.js';
import { startChallenge } from './challengeStateManager.js';
import { showScreen, notifyStreakUnfrozen, notifyStreakIncremented, notifySuperChallengeResult, notifyMilestoneReached } from '../main.js';
import { startSuperChallengeSparkles, stopSuperChallengeSparkles } from './visualEffects.js';
import { getChallenge } from './challengeGenerator.js';
import { playAnswerFeedback, playChallengeComplete } from './audioBootstrap.js';

let taskFlowState = null;

/**
 * Motivation phrases for perfect completion (0 errors)
 */
const PERFECT_PHRASES = [
  'Bist du ein Mathe-Genie?',
  'Brillant gelöst!',
  'Null Fehler – das ist Spitzenklasse!',
  'Perfekt! Du bist unschlagbar!',
  'Mathe-Meister! Fantastisch!'
];

/**
 * General motivation phrases (when errors were made)
 */
const GENERAL_PHRASES = [
  'Stark gekämpft!',
  'Du bist super! Weiter so!',
  'Gute Arbeit – dranbleiben lohnt sich!',
  'Toll gemacht! Übung macht den Meister!',
  'Klasse Einsatz! Bleib am Ball!'
];

/**
 * Get a random phrase from a pool
 * @param {Array} pool - Array of phrases
 * @returns {string} Random phrase
 */
function getRandomPhrase(pool) {
  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
}

/**
 * Initialize task screen for a challenge
 * @param {number} challengeIndex - Index of challenge
 */
export function initTaskScreen(challengeIndex) {
  // Start the challenge
  startChallenge(challengeIndex);
  
  // Initialize task flow
  taskFlowState = initializeTaskFlow(challengeIndex);
  
  if (!taskFlowState) {
    console.error('Failed to initialize task flow');
    showScreen('challenges');
    return;
  }
  
  // Check if this is a super challenge and start sparkle effect
  const challenge = getChallenge(challengeIndex);
  if (challenge && challenge.isSuperChallenge) {
    startSuperChallengeSparkles();
  }
  
  // Display first task
  displayCurrentTask();
  
  // Setup event listeners
  setupTaskScreenEventListeners();
}

/**
 * Display the current task
 */
function displayCurrentTask() {
  const currentTask = getCurrentTask();
  
  if (!currentTask) {
    // No more tasks, complete the challenge
    handleChallengeCompletion();
    return;
  }
  
  // Update question display
  const questionElement = document.getElementById('task-question');
  if (questionElement) {
    questionElement.textContent = `${currentTask.task.question} = ?`;
  }
  
  // Update progress bar (visual segments instead of text)
  const progressElement = document.getElementById('task-progress');
  if (progressElement) {
    // Create segmented progress bar
    let progressBarHtml = '<div class="task-progress-bar">';
    for (let i = 1; i <= currentTask.totalTasks; i++) {
      const segmentClass = i < currentTask.taskNumber ? 'progress-segment filled' : 'progress-segment';
      progressBarHtml += `<div class="${segmentClass}"></div>`;
    }
    progressBarHtml += '</div>';
    progressElement.innerHTML = progressBarHtml;
  }
  
  // Clear input
  const inputElement = document.getElementById('task-input');
  if (inputElement) {
    inputElement.value = '';
    inputElement.focus();
  }
  
  // Clear feedback
  const feedbackElement = document.getElementById('task-feedback');
  if (feedbackElement) {
    feedbackElement.textContent = '';
    feedbackElement.className = 'task-feedback';
  }
}

/**
 * Handle answer submission
 */
function handleAnswerSubmit() {
  const inputElement = document.getElementById('task-input');
  const feedbackElement = document.getElementById('task-feedback');
  
  if (!inputElement || !feedbackElement) {
    return;
  }
  
  const userAnswer = inputElement.value.trim();
  
  if (userAnswer === '') {
    feedbackElement.textContent = 'Bitte gib eine Antwort ein';
    feedbackElement.className = 'task-feedback feedback-warning';
    return;
  }
  
  // Validate answer
  const result = validateAnswer(userAnswer);
  
  if (!result.isValid) {
    feedbackElement.textContent = result.error;
    feedbackElement.className = 'task-feedback feedback-error';
    return;
  }
  
  // Show feedback
  if (result.isCorrect) {
    feedbackElement.textContent = '✓ Richtig!';
    feedbackElement.className = 'task-feedback feedback-correct';
    
    // Play correct answer sound
    playAnswerFeedback(true);
    
    // Move to next task after a short delay (only on correct answer)
    setTimeout(() => {
      const nextTaskResult = nextTask();
      
      if (nextTaskResult.isComplete) {
        handleChallengeCompletion();
      } else {
        displayCurrentTask();
      }
    }, 1500);
  } else {
    feedbackElement.textContent = `✗ Falsch! Versuche es nochmal.`;
    feedbackElement.className = 'task-feedback feedback-incorrect';
    
    // Play wrong answer sound
    playAnswerFeedback(false);
    
    // Clear input and let user retry after a short delay
    setTimeout(() => {
      inputElement.value = '';
      inputElement.focus();
      feedbackElement.textContent = '';
      feedbackElement.className = 'task-feedback';
      // Refresh progress display (task number stays the same until correct answer)
      const currentTask = getCurrentTask();
      if (currentTask) {
        const progressElement = document.getElementById('task-progress');
        if (progressElement) {
          progressElement.textContent = `Aufgabe ${currentTask.taskNumber} von ${currentTask.totalTasks}`;
        }
      }
    }, 1500);
  }
}

/**
 * Handle challenge completion
 */
function handleChallengeCompletion() {
  // Stop super challenge sparkles if they were running
  stopSuperChallengeSparkles();
  
  // Play challenge complete sound
  playChallengeComplete();
  
  const results = completeCurrentChallenge();
  
  if (!results) {
    console.error('Failed to complete challenge');
    return;
  }
  
  // Notify main.js if streak was unfrozen during this challenge
  if (results.streakUnfrozen) {
    notifyStreakUnfrozen(results.streakUnfrozen);
  }
  
  // Notify main.js if streak was incremented during this challenge
  if (results.streakIncremented) {
    notifyStreakIncremented(results.streakIncremented);
  }
  
  // Notify main.js if a milestone was reached
  if (results.milestoneReached) {
    notifyMilestoneReached();
  }
  
  // Notify main.js if this was a super challenge
  if (results.isSuperChallenge) {
    notifySuperChallengeResult(results.superChallengeSuccess, results.superChallengeAwardedDiamond, results.seasonalCurrencyAwarded);
  }
  
  // Get appropriate motivation phrase
  const isPerfect = results.errorAnalysis.isPerfect;
  const motivationPhrase = isPerfect 
    ? getRandomPhrase(PERFECT_PHRASES) 
    : getRandomPhrase(GENERAL_PHRASES);
  
  // Build results content based on whether it was perfect or not
  let resultContent;
  if (isPerfect) {
    // Perfect completion: show perfect phrase, no error count
    resultContent = `
      <div class="task-results">
        <h2>Challenge Abgeschlossen!</h2>
        <div class="results-summary">
          <p class="perfect">🌟 ${motivationPhrase}</p>
        </div>
        <button id="back-to-challenges">Zurück zu Herausforderungen</button>
      </div>
    `;
  } else {
    // With errors: show error count and general motivation phrase
    resultContent = `
      <div class="task-results">
        <h2>Challenge Abgeschlossen!</h2>
        <div class="results-summary">
          <p>Fehler: ${results.errors}</p>
          <p class="motivation">${motivationPhrase}</p>
        </div>
        <button id="back-to-challenges">Zurück zu Herausforderungen</button>
      </div>
    `;
  }
  
  // Display results
  const container = document.getElementById('task-screen-content');
  if (container) {
    container.innerHTML = resultContent;
    
    // Add event listener for back button
    const backButton = document.getElementById('back-to-challenges');
    if (backButton) {
      backButton.addEventListener('click', () => {
        showScreen('challenges');
      });
    }
  }
}

/**
 * Setup event listeners for task screen
 */
function setupTaskScreenEventListeners() {
  // Submit button
  const submitButton = document.getElementById('submit-answer');
  if (submitButton) {
    submitButton.addEventListener('click', handleAnswerSubmit);
  }
  
  // Enter key on input
  const inputElement = document.getElementById('task-input');
  if (inputElement) {
    inputElement.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleAnswerSubmit();
      }
    });
  }
  
  // Back button (handled in main.js already, but kept for reference)
}

/**
 * Export function to make it available globally
 */
export { initTaskScreen as default };

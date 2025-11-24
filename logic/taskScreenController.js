// Kopfnuss - Task Screen Controller
// Handles UI for task screen and integrates with task flow logic

import { 
  initializeTaskFlow, 
  getCurrentTask, 
  validateAnswer, 
  nextTask, 
  completeCurrentChallenge,
  abandonChallenge 
} from './taskFlow.js';
import { startChallenge } from './challengeStateManager.js';
import { showScreen } from '../main.js';

let taskFlowState = null;

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
  
  // Update progress display
  const progressElement = document.getElementById('task-progress');
  if (progressElement) {
    progressElement.textContent = `Aufgabe ${currentTask.taskNumber} von ${currentTask.totalTasks} | Fehler: ${currentTask.errors}`;
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
  } else {
    feedbackElement.textContent = `✗ Falsch! Richtige Antwort: ${result.correctAnswer}`;
    feedbackElement.className = 'task-feedback feedback-incorrect';
  }
  
  // Move to next task after a short delay
  setTimeout(() => {
    const nextTaskResult = nextTask();
    
    if (nextTaskResult.isComplete) {
      handleChallengeCompletion();
    } else {
      displayCurrentTask();
    }
  }, 1500);
}

/**
 * Handle challenge completion
 */
function handleChallengeCompletion() {
  const results = completeCurrentChallenge();
  
  if (!results) {
    console.error('Failed to complete challenge');
    return;
  }
  
  // Display results
  const container = document.getElementById('task-screen-content');
  if (container) {
    container.innerHTML = `
      <div class="task-results">
        <h2>Challenge Abgeschlossen!</h2>
        <div class="results-summary">
          <p>Aufgaben: ${results.totalTasks}</p>
          <p>Fehler: ${results.errors}</p>
          <p>Bewertung: ${results.errorAnalysis.rating}</p>
          ${results.errorAnalysis.isPerfect ? '<p class="perfect">🌟 Perfekt! Keine Fehler!</p>' : ''}
        </div>
        <button id="back-to-challenges">Zurück zu Herausforderungen</button>
      </div>
    `;
    
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

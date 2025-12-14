// Kopfnuss - Task Screen Controller
// Single owner of all task screen UI operations
// Handles DOM manipulation, user interactions, and visual feedback

import { 
  initializeTaskFlow, 
  getCurrentTask, 
  validateAnswer, 
  nextTask, 
  completeCurrentChallenge,
  abandonChallenge,
  getTaskFlowState,
  incrementErrorCount
} from './taskFlow.js';
import { startChallenge } from './challengeStateManager.js';
import { showScreen, notifyStreakUnfrozen, notifyStreakIncremented, notifySuperChallengeResult, notifyMilestoneReached } from './uiBridge.js';
import { startSuperChallengeSparkles, stopSuperChallengeSparkles } from './visualEffects.js';
import { getChallenge } from './challengeGenerator.js';
import { playAnswerFeedback, playChallengeComplete } from './audioBootstrap.js';
import { VERSION } from '../version.js';
import { logError, logWarn } from './logging.js';

// Module state
let taskFlowState = null;
let isInitialized = false;

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
 * Initialize the task screen controller
 * Call once when the app starts to prepare the controller
 */
export function initTaskScreenController() {
  // No initialization needed currently
  // This function is provided for future extensibility
  isInitialized = true;
}

/**
 * Show task screen for a specific challenge
 * Builds the task screen UI and initializes the task flow
 * This is the main entry point for displaying a task screen
 * 
 * @param {HTMLElement} container - Container element to render task screen into
 * @param {number} challengeIndex - Index of challenge to display
 * @param {Function} onBackClick - Callback when back button is clicked
 */
export function showTaskScreenForChallenge(container, challengeIndex, onBackClick) {
  // Build task screen HTML
  container.innerHTML = `
    <div class="task-screen" id="task-screen-content">
      <div class="task-screen-main">
        <div class="task-header">
          <button id="back-button" aria-label="Zurück">←</button>
          <h2>Challenge ${challengeIndex + 1}</h2>
          <div class="task-header-spacer"></div>
        </div>
        <div class="task-progress" id="task-progress"></div>
        <div class="task-content">
          <div class="task-question" id="task-question"></div>
        </div>
        <div class="task-feedback" id="task-feedback"></div>
      </div>
      <div class="task-screen-footer">v${VERSION.string}</div>
    </div>
  `;
  
  // Add back button event listener
  const backButton = document.getElementById('back-button');
  if (backButton && onBackClick) {
    backButton.addEventListener('click', onBackClick);
  }
  
  // Start the challenge
  startChallenge(challengeIndex);
  
  // Initialize task flow logic
  taskFlowState = initializeTaskFlow(challengeIndex);
  
  if (!taskFlowState) {
    logError('Failed to initialize task flow');
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
 * Legacy function for backwards compatibility
 * @deprecated Use showTaskScreenForChallenge instead
 * @param {number} challengeIndex - Index of challenge
 */
export function initTaskScreen(challengeIndex) {
  logWarn('initTaskScreen is deprecated. This should not be called directly.');
  // This function is kept for backwards compatibility but shouldn't be used
  // The container and back button handling should come from showTaskScreenForChallenge
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
  
  // Check if this is a place-value input task
  const isPlaceValue = currentTask.task.metadata && currentTask.task.metadata.placeValueInput;
  
  if (isPlaceValue) {
    // Render place-value input UI
    renderPlaceValueInput();
  } else {
    // Render standard input UI
    renderStandardInput();
  }
  
  // Clear feedback
  const feedbackElement = document.getElementById('task-feedback');
  if (feedbackElement) {
    feedbackElement.textContent = '';
    feedbackElement.className = 'task-feedback';
  }
}

/**
 * Render standard input UI
 */
function renderStandardInput() {
  const taskContent = document.querySelector('.task-content');
  if (!taskContent) return;
  
  // Remove existing input elements
  const existingInput = taskContent.querySelector('.task-input-container');
  if (existingInput) {
    existingInput.remove();
  }
  
  // Add standard input
  const inputContainer = document.createElement('div');
  inputContainer.className = 'task-input-container';
  inputContainer.innerHTML = `
    <input type="number" id="task-input" inputmode="numeric" pattern="[0-9]*" placeholder="Deine Antwort" aria-label="Deine Antwort für die Rechenaufgabe">
    <button id="submit-answer">Prüfen</button>
  `;
  
  const questionElement = document.getElementById('task-question');
  if (questionElement && questionElement.parentNode) {
    questionElement.parentNode.appendChild(inputContainer);
  }
  
  // Focus the input
  const inputElement = document.getElementById('task-input');
  if (inputElement) {
    inputElement.value = '';
    inputElement.focus();
  }
  
  // Re-setup event listeners for standard input
  setupStandardInputListeners();
}

/**
 * Render place-value input UI
 */
function renderPlaceValueInput() {
  const taskContent = document.querySelector('.task-content');
  if (!taskContent) return;
  
  // Remove existing input elements
  const existingInput = taskContent.querySelector('.task-input-container');
  if (existingInput) {
    existingInput.remove();
  }
  
  // Add place-value input slots
  const inputContainer = document.createElement('div');
  inputContainer.className = 'task-input-container place-value-container';
  inputContainer.innerHTML = `
    <div class="place-value-inputs">
      <div class="place-value-slot">
        <label class="place-value-label">T</label>
        <input type="tel" id="digit-0" class="place-value-digit active" inputmode="numeric" pattern="[0-9]" maxlength="1" data-index="0" aria-label="Tausender">
      </div>
      <div class="place-value-slot">
        <label class="place-value-label">H</label>
        <input type="tel" id="digit-1" class="place-value-digit" inputmode="numeric" pattern="[0-9]" maxlength="1" data-index="1" aria-label="Hunderter" disabled>
      </div>
      <div class="place-value-slot">
        <label class="place-value-label">Z</label>
        <input type="tel" id="digit-2" class="place-value-digit" inputmode="numeric" pattern="[0-9]" maxlength="1" data-index="2" aria-label="Zehner" disabled>
      </div>
      <div class="place-value-slot">
        <label class="place-value-label">E</label>
        <input type="tel" id="digit-3" class="place-value-digit" inputmode="numeric" pattern="[0-9]" maxlength="1" data-index="3" aria-label="Einer" disabled>
      </div>
    </div>
  `;
  
  const questionElement = document.getElementById('task-question');
  if (questionElement && questionElement.parentNode) {
    questionElement.parentNode.appendChild(inputContainer);
  }
  
  // Focus the first digit input
  const firstInput = document.getElementById('digit-0');
  if (firstInput) {
    firstInput.focus();
  }
  
  // Setup event listeners for place-value inputs
  setupPlaceValueInputListeners();
}

/**
 * Setup event listeners for standard input
 */
function setupStandardInputListeners() {
  const submitButton = document.getElementById('submit-answer');
  if (submitButton) {
    submitButton.removeEventListener('click', handleAnswerSubmit);
    submitButton.addEventListener('click', handleAnswerSubmit);
  }
  
  const inputElement = document.getElementById('task-input');
  if (inputElement) {
    inputElement.removeEventListener('keypress', handleStandardInputKeypress);
    inputElement.addEventListener('keypress', handleStandardInputKeypress);
  }
}

/**
 * Handle keypress for standard input
 */
function handleStandardInputKeypress(e) {
  if (e.key === 'Enter') {
    handleAnswerSubmit();
  }
}

// Track place-value input state
let placeValueState = {
  currentIndex: 0,
  enteredDigits: ['', '', '', ''],
  correctDigits: []
};

/**
 * Setup event listeners for place-value inputs
 */
function setupPlaceValueInputListeners() {
  // Reset state
  const currentTask = getCurrentTask();
  if (currentTask && currentTask.task.metadata && currentTask.task.metadata.digitArray) {
    placeValueState.correctDigits = currentTask.task.metadata.digitArray;
    placeValueState.currentIndex = 0;
    placeValueState.enteredDigits = ['', '', '', ''];
  }
  
  // Add listeners to all digit inputs
  for (let i = 0; i < 4; i++) {
    const input = document.getElementById(`digit-${i}`);
    if (input) {
      // Remove old listeners
      input.removeEventListener('input', handlePlaceValueInput);
      input.removeEventListener('focus', handlePlaceValueFocus);
      input.removeEventListener('click', handlePlaceValueClick);
      
      // Add new listeners
      input.addEventListener('input', handlePlaceValueInput);
      input.addEventListener('focus', handlePlaceValueFocus);
      input.addEventListener('click', handlePlaceValueClick);
    }
  }
}

/**
 * Handle input in place-value digit slot
 */
function handlePlaceValueInput(e) {
  const input = e.target;
  const index = parseInt(input.dataset.index, 10);
  const value = input.value.trim();
  
  // Remove overwrite-mode class when typing (if present)
  if (input.classList.contains('overwrite-mode')) {
    input.classList.remove('overwrite-mode');
  }
  
  // Only process single digits
  if (value.length > 1) {
    input.value = value.charAt(value.length - 1);
    return;
  }
  
  // Validate digit (0-9)
  if (value !== '' && !/^[0-9]$/.test(value)) {
    input.value = '';
    return;
  }
  
  if (value !== '') {
    const digit = parseInt(value, 10);
    const correctDigit = placeValueState.correctDigits[index];
    
    // Store the entered digit
    placeValueState.enteredDigits[index] = value;
    
    // Validate the digit
    if (digit === correctDigit) {
      // Correct digit
      input.classList.remove('incorrect');
      input.classList.add('correct');
      
      // Move to next slot
      if (index < 3) {
        placeValueState.currentIndex = index + 1;
        const nextInput = document.getElementById(`digit-${index + 1}`);
        if (nextInput) {
          nextInput.disabled = false;
          nextInput.classList.add('active');
          nextInput.focus();
          
          // Remove active class from current
          input.classList.remove('active');
        }
      } else {
        // All digits entered correctly
        input.classList.remove('active');
        
        // Show success feedback
        const feedbackElement = document.getElementById('task-feedback');
        if (feedbackElement) {
          feedbackElement.textContent = '✓ Richtig!';
          feedbackElement.className = 'task-feedback feedback-correct';
        }
        
        // Play correct answer sound
        playAnswerFeedback(true);
        
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
    } else {
      // Incorrect digit
      input.classList.remove('correct');
      input.classList.add('incorrect');
      
      // Increment error count (both local taskFlow state and challenge state)
      // NOTE: We don't use validateAnswer() here because we're validating individual
      // digits rather than a complete answer. incrementErrorCount() handles both
      // the local error counter and the challenge state consistently.
      incrementErrorCount();
      
      // Show error feedback
      const feedbackElement = document.getElementById('task-feedback');
      if (feedbackElement) {
        feedbackElement.textContent = '✗ Falsch! Versuche es nochmal.';
        feedbackElement.className = 'task-feedback feedback-incorrect';
      }
      
      // Play wrong answer sound
      playAnswerFeedback(false);
      
      // Clear the input after a short delay
      setTimeout(() => {
        input.value = '';
        placeValueState.enteredDigits[index] = '';
        input.classList.remove('incorrect');
        input.focus();
        
        // Clear feedback
        const feedbackElement = document.getElementById('task-feedback');
        if (feedbackElement) {
          feedbackElement.textContent = '';
          feedbackElement.className = 'task-feedback';
        }
      }, 1500);
    }
  }
}

/**
 * Handle focus on place-value digit slot
 */
function handlePlaceValueFocus(e) {
  const input = e.target;
  const index = parseInt(input.dataset.index, 10);
  
  // If this slot already has a value and is being focused, prepare for overwrite
  if (input.value !== '') {
    // Show the existing digit in a lowlighted state (add class)
    input.classList.add('overwrite-mode');
  }
}

/**
 * Handle click on place-value digit slot
 * Enables easy overwriting of filled slots
 */
function handlePlaceValueClick(e) {
  const input = e.target;
  const index = parseInt(input.dataset.index, 10);
  
  // If the slot has a value, select all for easy overwrite and add visual indicator
  if (input.value !== '') {
    input.select();
    input.classList.add('overwrite-mode');
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
    logError('Failed to complete challenge');
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
  // Check if current task is place-value or standard
  const currentTask = getCurrentTask();
  const isPlaceValue = currentTask && currentTask.task.metadata && currentTask.task.metadata.placeValueInput;
  
  if (isPlaceValue) {
    setupPlaceValueInputListeners();
  } else {
    setupStandardInputListeners();
  }
  
  // Back button (handled in main.js already, but kept for reference)
}

/**
 * Export function to make it available globally
 */
export { initTaskScreen as default };

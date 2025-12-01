// Kopfnuss - Zeit-Challenge Task Screen Controller
// Handles UI for Zeit-Challenge task screen with timer and integrates with task flow logic

import { 
  getTodaysZeitChallenge,
  updateZeitChallenge,
  completeZeitChallenge,
  failZeitChallenge,
  ZEIT_CHALLENGE_STATE
} from './challengeGenerator.js';
import { CONFIG } from '../data/balancingLoader.js';
import { showScreen, notifyZeitChallengeResult } from '../main.js';
import { 
  isEventActive, 
  getActiveEvent, 
  addSeasonalCurrency 
} from './eventManager.js';
import { addDiamonds, loadDiamonds } from './diamondManager.js';

let zeitState = null;
let currentTaskIndex = 0;
let errors = 0;
let timerInterval = null;
let timeRemaining = 0;
let isInputDisabled = false;

/**
 * Motivation phrases for Zeit-Challenge completion
 */
const ZEIT_SUCCESS_PHRASES = [
  'Du hast der Zeit getrotzt!',
  'Blitzschnell gelöst!',
  'Perfektes Timing!',
  'Zeit ist kein Problem für dich!',
  'Rasend schnell!'
];

/**
 * Phrases for Zeit-Challenge timeout
 */
const ZEIT_TIMEOUT_PHRASES = [
  'Du warst knapp dran – versuch es gleich noch einmal!',
  'Die Zeit war zu kurz – nächstes Mal schaffst du es!',
  'Fast geschafft – bleib dran!',
  'Nur ein paar Sekunden haben gefehlt!'
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
 * Format time in mm:ss format
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time
 */
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Initialize Zeit-Challenge task screen
 */
export function initZeitChallengeTaskScreen() {
  // Load the Zeit-Challenge
  zeitState = getTodaysZeitChallenge();
  
  if (!zeitState || !zeitState.spawned || zeitState.state !== ZEIT_CHALLENGE_STATE.IN_PROGRESS) {
    console.error('Zeit-Challenge not in progress');
    showScreen('challenges');
    return;
  }
  
  currentTaskIndex = zeitState.currentTaskIndex || 0;
  errors = zeitState.errors || 0;
  timeRemaining = zeitState.timeRemaining || CONFIG.ZEIT_CHALLENGE_TIME_LIMIT_SECONDS || 120;
  isInputDisabled = false;
  
  // Display first task
  displayCurrentTask();
  
  // Setup event listeners
  setupTaskScreenEventListeners();
  
  // Start the timer
  startTimer();
}

/**
 * Start the countdown timer
 */
function startTimer() {
  // Clear any existing timer
  if (timerInterval) {
    clearInterval(timerInterval);
  }
  
  // Update timer display immediately
  updateTimerDisplay();
  
  // Start countdown
  timerInterval = setInterval(() => {
    timeRemaining--;
    
    // Update display
    updateTimerDisplay();
    
    // Save time remaining to state less frequently (every 10 seconds) to reduce I/O
    if (timeRemaining % 10 === 0 || timeRemaining <= 10) {
      updateZeitChallenge({
        timeRemaining: timeRemaining
      });
    }
    
    // Check if time ran out
    if (timeRemaining <= 0) {
      handleTimeout();
    }
  }, 1000);
}

/**
 * Stop the timer
 */
function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

/**
 * Update the timer display
 */
function updateTimerDisplay() {
  const timerElement = document.getElementById('zeit-timer');
  if (timerElement) {
    timerElement.textContent = formatTime(timeRemaining);
    
    // Add warning class when time is low
    if (timeRemaining <= 30) {
      timerElement.classList.add('timer-warning');
    } else {
      timerElement.classList.remove('timer-warning');
    }
    
    // Add critical class when time is very low
    if (timeRemaining <= 10) {
      timerElement.classList.add('timer-critical');
    } else {
      timerElement.classList.remove('timer-critical');
    }
  }
}

/**
 * Handle timeout - time ran out
 */
function handleTimeout() {
  // Stop the timer
  stopTimer();
  
  // Disable input
  isInputDisabled = true;
  const inputElement = document.getElementById('task-input');
  const submitButton = document.getElementById('submit-answer');
  if (inputElement) inputElement.disabled = true;
  if (submitButton) submitButton.disabled = true;
  
  // Fail the challenge
  failZeitChallenge(errors, currentTaskIndex);
  
  // Notify main.js about the failure (no reward)
  notifyZeitChallengeResult(false, null);
  
  // Get timeout phrase
  const motivationPhrase = getRandomPhrase(ZEIT_TIMEOUT_PHRASES);
  
  // Show timeout popup
  const resultContent = `
    <div class="task-results" style="background: linear-gradient(135deg, #FFF0F0 0%, #FFCCCC 100%); border: 3px solid #CD5C5C;">
      <h2 style="color: #8B0000;">Zeit abgelaufen! 😞</h2>
      <div class="results-summary">
        <p class="motivation">${motivationPhrase}</p>
        <p style="font-size: 14px; color: #666; margin-top: 8px;">Der Diamant ist weg, aber die Challenge wartet noch auf dich!</p>
      </div>
      <button id="back-to-challenges">Neuer Versuch</button>
    </div>
  `;
  
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
 * Display the current task
 */
function displayCurrentTask() {
  if (!zeitState || currentTaskIndex >= zeitState.tasks.length) {
    // No more tasks, complete the challenge
    handleZeitChallengeCompletion();
    return;
  }
  
  const currentTask = zeitState.tasks[currentTaskIndex];
  
  // Update question display
  const questionElement = document.getElementById('task-question');
  if (questionElement) {
    questionElement.textContent = `${currentTask.question} = ?`;
  }
  
  // Update progress display
  const progressElement = document.getElementById('task-progress');
  if (progressElement) {
    progressElement.textContent = `Aufgabe ${currentTaskIndex + 1} von ${zeitState.tasks.length}`;
  }
  
  // Clear input
  const inputElement = document.getElementById('task-input');
  if (inputElement) {
    inputElement.value = '';
    inputElement.focus();
    inputElement.disabled = isInputDisabled;
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
  if (isInputDisabled) return;
  
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
  
  // Parse answer - use strict comparison with normalized input
  const normalizedAnswer = parseInt(userAnswer, 10);
  if (isNaN(normalizedAnswer)) {
    feedbackElement.textContent = 'Bitte gib eine ganze Zahl ein';
    feedbackElement.className = 'task-feedback feedback-error';
    return;
  }
  
  const currentTask = zeitState.tasks[currentTaskIndex];
  const isCorrect = normalizedAnswer === currentTask.answer;
  
  // Show feedback
  if (isCorrect) {
    feedbackElement.textContent = '✓ Richtig!';
    feedbackElement.className = 'task-feedback feedback-correct';
    
    // Move to next task after a short delay (faster than Kopfnuss for time pressure)
    setTimeout(() => {
      currentTaskIndex++;
      
      // Update state in storage
      updateZeitChallenge({
        currentTaskIndex: currentTaskIndex
      });
      
      if (currentTaskIndex >= zeitState.tasks.length) {
        handleZeitChallengeCompletion();
      } else {
        displayCurrentTask();
      }
    }, 500); // Shorter delay for time pressure
  } else {
    errors++;
    feedbackElement.textContent = `✗ Falsch! Versuche es nochmal.`;
    feedbackElement.className = 'task-feedback feedback-incorrect';
    
    // Update errors in storage
    updateZeitChallenge({
      errors: errors
    });
    
    // Clear input and let user retry after a short delay
    setTimeout(() => {
      inputElement.value = '';
      inputElement.focus();
      feedbackElement.textContent = '';
      feedbackElement.className = 'task-feedback';
    }, 500); // Shorter delay for time pressure
  }
}

/**
 * Handle Zeit-Challenge completion (solved all tasks in time)
 */
function handleZeitChallengeCompletion() {
  // Stop the timer
  stopTimer();
  
  // Complete the challenge (always success if all tasks solved in time)
  const result = completeZeitChallenge(errors);
  
  // Handle rewards (always give reward regardless of errors)
  const rewardAmount = CONFIG.ZEIT_CHALLENGE_REWARD_AMOUNT || 2;
  const eventActive = isEventActive();
  const activeEvent = eventActive ? getActiveEvent() : null;
  
  let rewardInfo = null;
  if (eventActive && activeEvent) {
    // Award seasonal currency
    addSeasonalCurrency(rewardAmount);
    rewardInfo = {
      isDiamond: false,
      amount: rewardAmount,
      emoticon: activeEvent.emoticon
    };
  } else {
    // Award diamonds
    addDiamonds(rewardAmount);
    rewardInfo = {
      isDiamond: true,
      amount: rewardAmount
    };
  }
  
  // Notify main.js about the result
  notifyZeitChallengeResult(true, rewardInfo);
  
  // Get success phrase
  const motivationPhrase = getRandomPhrase(ZEIT_SUCCESS_PHRASES);
  
  // Build reward text
  const rewardText = rewardInfo.isDiamond 
    ? `+${rewardInfo.amount} 💎`
    : `+${rewardInfo.amount} ${rewardInfo.emoticon}`;
  
  // Build results content
  const resultContent = `
    <div class="task-results" style="background: linear-gradient(135deg, #E0F7FA 0%, #4DD0E1 100%); border: 3px solid #00ACC1;">
      <h2 style="color: #006064;">Zeit-Challenge geschafft! ⭐</h2>
      <div class="results-summary">
        <p class="perfect">⏱️ ${motivationPhrase}</p>
        <p style="font-size: 24px; margin-top: 16px;">${rewardText}</p>
      </div>
      <button id="back-to-challenges">Zurück zu Herausforderungen</button>
    </div>
  `;
  
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
}

/**
 * Cleanup function for when leaving the screen
 */
export function cleanupZeitChallengeTaskScreen() {
  stopTimer();
  // Reset all module-level variables to prevent state leakage
  zeitState = null;
  currentTaskIndex = 0;
  errors = 0;
  timeRemaining = 0;
  isInputDisabled = false;
}

export { initZeitChallengeTaskScreen as default };

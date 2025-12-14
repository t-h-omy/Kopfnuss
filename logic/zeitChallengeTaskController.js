// Kopfnuss - Zeit-Challenge Task Screen Controller
// Handles UI for Zeit-Challenge task screen with timer and integrates with task flow logic

import { 
  getTodaysZeitChallenge,
  updateZeitChallenge,
  completeZeitChallenge,
  failZeitChallenge,
  resetZeitChallengeAfterFailure,
  ZEIT_CHALLENGE_STATE
} from './challengeGenerator.js';
import { CONFIG } from '../data/balancingLoader.js';
import { showScreen, notifyZeitChallengeResultBridge } from './uiBridge.js';
import { 
  isEventActive, 
  getActiveEvent, 
  addSeasonalCurrency 
} from './eventManager.js';
import { addDiamonds, loadDiamonds } from './diamondManager.js';
import { createConfettiEffect } from './popupManager.js';
import { playZeitChallengeMusic, stopZeitChallengeMusic, playAnswerFeedback, playChallengeComplete, playFinalCountdownMusic, playTimesUp, playChallengeFailed, playDiamondEarn } from './audioBootstrap.js';
import { logError } from './logging.js';

let zeitState = null;
let currentTaskIndex = 0;
let errors = 0;
let timerInterval = null;
let timeRemaining = 0;
let isInputDisabled = false;
let finalCountdownStarted = false; // Track if final 10 seconds music has started

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
  // Clear any existing timer first to prevent multiple timers
  stopTimer();
  
  // Load the Zeit-Challenge
  zeitState = getTodaysZeitChallenge();
  
  if (!zeitState || !zeitState.spawned || zeitState.state !== ZEIT_CHALLENGE_STATE.IN_PROGRESS) {
    logError('Zeit-Challenge not in progress, state:', zeitState?.state);
    showScreen('challenges');
    return;
  }
  
  currentTaskIndex = zeitState.currentTaskIndex || 0;
  errors = zeitState.errors || 0;
  
  // Get time remaining, but ensure it's at least 1 second to prevent immediate timeout
  const storedTime = zeitState.timeRemaining;
  const defaultTime = CONFIG.ZEIT_CHALLENGE_TIME_LIMIT_SECONDS || 120;
  timeRemaining = (storedTime && storedTime > 0) ? storedTime : defaultTime;
  
  isInputDisabled = false;
  finalCountdownStarted = false; // Reset final countdown flag
  
  // Display first task
  displayCurrentTask();
  
  // Setup event listeners
  setupTaskScreenEventListeners();
  
  // Start background music (check if we should start with final countdown)
  if (timeRemaining <= 10) {
    finalCountdownStarted = true;
    playFinalCountdownMusic();
  } else {
    playZeitChallengeMusic();
  }
  
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
    
    // Start final countdown music when 10 seconds remain
    if (timeRemaining === 10 && !finalCountdownStarted) {
      finalCountdownStarted = true;
      playFinalCountdownMusic();
    }
    
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
  
  // Stop all music (including countdown music)
  stopZeitChallengeMusic();
  
  // Play times up sound
  playTimesUp();
  
  // Play challenge failed sound after a short delay
  setTimeout(() => {
    playChallengeFailed();
  }, 800);
  
  // Disable input
  isInputDisabled = true;
  const inputElement = document.getElementById('task-input');
  const submitButton = document.getElementById('submit-answer');
  if (inputElement) inputElement.disabled = true;
  if (submitButton) submitButton.disabled = true;
  
  // Fail the challenge
  failZeitChallenge(errors, currentTaskIndex);
  
  // Don't notify main.js - we show the result popup here in the task screen
  // For timeout, we show the failure screen directly here to avoid duplicate popups
  
  // Get timeout phrase
  const motivationPhrase = getRandomPhrase(ZEIT_TIMEOUT_PHRASES);
  
  // Calculate progress
  const totalTasks = zeitState.tasks.length;
  const completedTasks = currentTaskIndex;
  const totalTime = CONFIG.ZEIT_CHALLENGE_TIME_LIMIT_SECONDS || 120;
  const totalTimeFormatted = formatTime(totalTime);
  
  // Build debrief content for timeout
  const debriefContent = `
    <div class="task-results" style="background: linear-gradient(135deg, #FFF0F0 0%, #FFCCCC 100%); border: 3px solid #CD5C5C;">
      <h2 style="color: #8B0000;">Zeit abgelaufen! 😞</h2>
      <div class="results-summary">
        <p class="motivation">${motivationPhrase}</p>
        <div style="margin-top: 16px; padding: 12px; background: rgba(255,255,255,0.5); border-radius: 8px;">
          <p style="font-size: 14px; color: #8B0000;">📊 ${completedTasks} von ${totalTasks} Aufgaben geschafft</p>
          <p style="font-size: 14px; color: #8B0000;">❌ ${errors} Fehler</p>
          <p style="font-size: 14px; color: #8B0000;">⏰ Zeit: ${totalTimeFormatted}</p>
        </div>
        <p style="font-size: 14px; color: #666; margin-top: 12px;">Der Diamant ist weg, aber die Challenge wartet noch auf dich!</p>
      </div>
      <button id="back-to-challenges">Neuer Versuch</button>
    </div>
  `;
  
  // Display results
  const container = document.getElementById('task-screen-content');
  if (container) {
    container.innerHTML = debriefContent;
    
    // Add event listener for back button
    const backButton = document.getElementById('back-to-challenges');
    if (backButton) {
      backButton.addEventListener('click', () => {
        // Reset Zeit Challenge to allow restart after timeout
        resetZeitChallengeAfterFailure();
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
  
  // Update progress bar (visual segments instead of text)
  const progressElement = document.getElementById('task-progress');
  if (progressElement) {
    const currentTaskNumber = currentTaskIndex + 1;
    const totalTasks = zeitState.tasks.length;
    // Create segmented progress bar
    let progressBarHtml = '<div class="task-progress-bar">';
    for (let i = 1; i <= totalTasks; i++) {
      const segmentClass = i < currentTaskNumber ? 'progress-segment filled' : 'progress-segment';
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
    
    // Play correct answer sound
    playAnswerFeedback(true);
    
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
    
    // Play wrong answer sound
    playAnswerFeedback(false);
    
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
  
  // Play challenge complete sound
  playChallengeComplete();
  
  // Complete the challenge (always success if all tasks solved in time)
  const result = completeZeitChallenge(errors);
  
  // Get reward info but don't award yet - let player choose in popup
  const rewardAmount = CONFIG.ZEIT_CHALLENGE_REWARD_AMOUNT || 2;
  const eventActive = isEventActive();
  const activeEvent = eventActive ? getActiveEvent() : null;
  
  // Prepare reward info - mark as pending choice if event is active
  let rewardInfo = {
    amount: rewardAmount,
    eventActive: eventActive,
    pendingChoice: eventActive, // Player can choose if event is active
    emoticon: activeEvent ? activeEvent.emoticon : null
  };
  
  // If no event, award diamonds immediately
  if (!eventActive) {
    addDiamonds(rewardAmount);
    rewardInfo.isDiamond = true;
  }
  
  // Notify main.js about the result so popup shows when returning to challenges
  notifyZeitChallengeResultBridge(true, rewardInfo);
  
  // Get success phrase
  const motivationPhrase = getRandomPhrase(ZEIT_SUCCESS_PHRASES);
  
  // Build reward display - show choice if event is active
  let rewardDisplayHtml;
  if (rewardInfo.pendingChoice) {
    rewardDisplayHtml = `
      <div style="margin-top: 16px;">
        <p style="font-size: 14px; color: #006064; margin-bottom: 8px;">Wähle deine Belohnung:</p>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button id="choose-diamonds" class="reward-choice-btn" style="padding: 12px 20px; font-size: 18px; border: 2px solid #00ACC1; border-radius: 12px; background: linear-gradient(135deg, #E0F7FA 0%, #B2EBF2 100%); cursor: pointer; transition: all 0.2s;">
            +${rewardInfo.amount} 💎
          </button>
          <button id="choose-seasonal" class="reward-choice-btn" style="padding: 12px 20px; font-size: 18px; border: 2px solid #00ACC1; border-radius: 12px; background: linear-gradient(135deg, #E0F7FA 0%, #B2EBF2 100%); cursor: pointer; transition: all 0.2s;">
            +${rewardInfo.amount} ${rewardInfo.emoticon}
          </button>
        </div>
      </div>
    `;
  } else {
    const rewardText = `+${rewardInfo.amount} 💎`;
    rewardDisplayHtml = `<p style="font-size: 24px; margin-top: 16px;">${rewardText}</p>`;
  }
  
  // Calculate time used
  const totalTime = CONFIG.ZEIT_CHALLENGE_TIME_LIMIT_SECONDS || 120;
  const timeUsed = totalTime - timeRemaining;
  const timeUsedFormatted = formatTime(timeUsed);
  const timeRemainingFormatted = formatTime(timeRemaining);
  
  // Build debrief content similar to standard challenge
  const isPerfect = errors === 0;
  let debriefContent;
  
  if (isPerfect) {
    debriefContent = `
      <div class="task-results" style="background: linear-gradient(135deg, #E0F7FA 0%, #4DD0E1 100%); border: 3px solid #00ACC1;">
        <h2 style="color: #006064;">Zeit-Challenge geschafft! ⭐</h2>
        <div class="results-summary">
          <p class="perfect">🌟 Perfekt - keine Fehler!</p>
          <p style="margin-top: 8px;">⏱️ ${motivationPhrase}</p>
          <div style="margin-top: 16px; padding: 12px; background: rgba(255,255,255,0.5); border-radius: 8px;">
            <p style="font-size: 14px; color: #006064;">📊 ${zeitState.tasks.length} Aufgaben in ${timeUsedFormatted}</p>
            <p style="font-size: 14px; color: #006064;">⏰ Restzeit: ${timeRemainingFormatted}</p>
          </div>
          ${rewardDisplayHtml}
        </div>
        ${rewardInfo.pendingChoice ? '' : '<button id="back-to-challenges">Zurück zu Herausforderungen</button>'}
      </div>
    `;
  } else {
    debriefContent = `
      <div class="task-results" style="background: linear-gradient(135deg, #E0F7FA 0%, #4DD0E1 100%); border: 3px solid #00ACC1;">
        <h2 style="color: #006064;">Zeit-Challenge geschafft! ⭐</h2>
        <div class="results-summary">
          <p>Fehler: ${errors}</p>
          <p class="motivation" style="margin-top: 8px;">⏱️ ${motivationPhrase}</p>
          <div style="margin-top: 16px; padding: 12px; background: rgba(255,255,255,0.5); border-radius: 8px;">
            <p style="font-size: 14px; color: #006064;">📊 ${zeitState.tasks.length} Aufgaben in ${timeUsedFormatted}</p>
            <p style="font-size: 14px; color: #006064;">⏰ Restzeit: ${timeRemainingFormatted}</p>
          </div>
          ${rewardDisplayHtml}
        </div>
        ${rewardInfo.pendingChoice ? '' : '<button id="back-to-challenges">Zurück zu Herausforderungen</button>'}
      </div>
    `;
  }
  
  // Display results
  const container = document.getElementById('task-screen-content');
  if (container) {
    container.innerHTML = debriefContent;
    
    // Add confetti effect for celebration
    createConfettiEffect();
    
    // Handle reward choice buttons if event is active
    if (rewardInfo.pendingChoice) {
      const chooseDiamondsBtn = document.getElementById('choose-diamonds');
      const chooseSeasonalBtn = document.getElementById('choose-seasonal');
      
      if (chooseDiamondsBtn) {
        chooseDiamondsBtn.addEventListener('click', () => {
          // Play currency received sound
          playDiamondEarn();
          
          addDiamonds(rewardInfo.amount);
          rewardInfo.isDiamond = true;
          rewardInfo.pendingChoice = false;
          notifyZeitChallengeResultBridge(true, rewardInfo);
          showScreen('challenges');
        });
      }
      
      if (chooseSeasonalBtn) {
        chooseSeasonalBtn.addEventListener('click', () => {
          // Play currency received sound
          playDiamondEarn();
          
          addSeasonalCurrency(rewardInfo.amount);
          rewardInfo.isDiamond = false;
          rewardInfo.pendingChoice = false;
          notifyZeitChallengeResultBridge(true, rewardInfo);
          showScreen('challenges');
        });
      }
    } else {
      // Add event listener for back button
      const backButton = document.getElementById('back-to-challenges');
      if (backButton) {
        backButton.addEventListener('click', () => {
          showScreen('challenges');
        });
      }
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
  
  // Stop background music - ensure this happens even if other cleanup fails
  try {
    stopZeitChallengeMusic();
  } catch (e) {
    logError('Error stopping Zeit challenge music:', e);
  }
  
  // Reset all module-level variables to prevent state leakage
  zeitState = null;
  currentTaskIndex = 0;
  errors = 0;
  timeRemaining = 0;
  isInputDisabled = false;
  finalCountdownStarted = false;
}

export { initZeitChallengeTaskScreen as default };

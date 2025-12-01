// Kopfnuss - Kopfnuss Challenge Task Screen Controller
// Handles UI for Kopfnuss Challenge task screen and integrates with task flow logic

import { 
  getTodaysKopfnussChallenge,
  updateKopfnussChallenge,
  completeKopfnussChallenge,
  KOPFNUSS_STATE
} from './challengeGenerator.js';
import { CONFIG } from '../data/balancingLoader.js';
import { showScreen, notifyKopfnussChallengeResult } from '../main.js';
import { 
  isEventActive, 
  getActiveEvent, 
  addSeasonalCurrency 
} from './eventManager.js';
import { addDiamonds, loadDiamonds } from './diamondManager.js';

let kopfnussState = null;
let currentTaskIndex = 0;
let errors = 0;

/**
 * Motivation phrases for Kopfnuss Challenge completion (perfect)
 */
const KOPFNUSS_PERFECT_PHRASES = [
  'Du bist ein Mathe-Genie!',
  'Unfassbar! Kopfnuss geknackt!',
  'Brillant! Du bist unschlagbar!',
  'Perfekt! Diese Nuss war kein Problem!',
  'Meisterhaft gelöst!'
];

/**
 * Phrases for Kopfnuss Challenge failure
 */
const KOPFNUSS_FAILURE_PHRASES = [
  'Fast geschafft...',
  'Nächstes Mal klappt es!',
  'Übung macht den Meister!',
  'Bleib dran!',
  'Die nächste Kopfnuss wartet!'
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
 * Initialize Kopfnuss task screen
 */
export function initKopfnussTaskScreen() {
  // Load the Kopfnuss Challenge
  kopfnussState = getTodaysKopfnussChallenge();
  
  if (!kopfnussState || !kopfnussState.spawned || kopfnussState.state !== KOPFNUSS_STATE.IN_PROGRESS) {
    console.error('Kopfnuss Challenge not in progress');
    showScreen('challenges');
    return;
  }
  
  currentTaskIndex = kopfnussState.currentTaskIndex || 0;
  errors = kopfnussState.errors || 0;
  
  // Display first task
  displayCurrentTask();
  
  // Setup event listeners
  setupTaskScreenEventListeners();
}

/**
 * Display the current task
 */
function displayCurrentTask() {
  if (!kopfnussState || currentTaskIndex >= kopfnussState.tasks.length) {
    // No more tasks, complete the challenge
    handleKopfnussChallengeCompletion();
    return;
  }
  
  const currentTask = kopfnussState.tasks[currentTaskIndex];
  
  // Update question display
  const questionElement = document.getElementById('task-question');
  if (questionElement) {
    questionElement.textContent = `${currentTask.question} = ?`;
  }
  
  // Update progress display
  const progressElement = document.getElementById('task-progress');
  if (progressElement) {
    progressElement.textContent = `Aufgabe ${currentTaskIndex + 1} von ${kopfnussState.tasks.length}`;
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
  
  // Parse answer - use strict comparison with normalized input
  const normalizedAnswer = parseInt(userAnswer, 10);
  if (isNaN(normalizedAnswer)) {
    feedbackElement.textContent = 'Bitte gib eine ganze Zahl ein';
    feedbackElement.className = 'task-feedback feedback-error';
    return;
  }
  
  const currentTask = kopfnussState.tasks[currentTaskIndex];
  const isCorrect = normalizedAnswer === currentTask.answer;
  
  // Show feedback
  if (isCorrect) {
    feedbackElement.textContent = '✓ Richtig!';
    feedbackElement.className = 'task-feedback feedback-correct';
    
    // Move to next task after a short delay
    setTimeout(() => {
      currentTaskIndex++;
      
      // Update state in storage
      updateKopfnussChallenge({
        currentTaskIndex: currentTaskIndex
      });
      
      if (currentTaskIndex >= kopfnussState.tasks.length) {
        handleKopfnussChallengeCompletion();
      } else {
        displayCurrentTask();
      }
    }, 1500);
  } else {
    errors++;
    feedbackElement.textContent = `✗ Falsch! Versuche es nochmal.`;
    feedbackElement.className = 'task-feedback feedback-incorrect';
    
    // Update errors in storage
    updateKopfnussChallenge({
      errors: errors
    });
    
    // Clear input and let user retry after a short delay
    setTimeout(() => {
      inputElement.value = '';
      inputElement.focus();
      feedbackElement.textContent = '';
      feedbackElement.className = 'task-feedback';
    }, 1500);
  }
}

/**
 * Handle Kopfnuss Challenge completion
 */
function handleKopfnussChallengeCompletion() {
  const isPerfect = errors === 0;
  
  // Complete the challenge
  const result = completeKopfnussChallenge(errors);
  
  // Handle rewards
  let rewardInfo = null;
  if (isPerfect) {
    const rewardAmount = CONFIG.KOPFNUSS_REWARD_AMOUNT || 2;
    const eventActive = isEventActive();
    const activeEvent = eventActive ? getActiveEvent() : null;
    
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
    notifyKopfnussChallengeResult(true, rewardInfo);
  } else {
    // Notify main.js about the failure
    notifyKopfnussChallengeResult(false, null);
  }
  
  // Get appropriate phrase
  const motivationPhrase = isPerfect 
    ? getRandomPhrase(KOPFNUSS_PERFECT_PHRASES) 
    : getRandomPhrase(KOPFNUSS_FAILURE_PHRASES);
  
  // Build results content
  let resultContent;
  if (isPerfect) {
    const rewardText = rewardInfo.isDiamond 
      ? `+${rewardInfo.amount} 💎`
      : `+${rewardInfo.amount} ${rewardInfo.emoticon}`;
    
    resultContent = `
      <div class="task-results" style="background: linear-gradient(135deg, #FFFACD 0%, #FFD700 100%); border: 3px solid #DAA520;">
        <h2 style="color: #8B4513;">Kopfnuss geknackt! 🤔💥</h2>
        <div class="results-summary">
          <p class="perfect">🌟 ${motivationPhrase}</p>
          <p style="font-size: 24px; margin-top: 16px;">${rewardText}</p>
        </div>
        <button id="back-to-challenges">Zurück zu Herausforderungen</button>
      </div>
    `;
  } else {
    resultContent = `
      <div class="task-results" style="background: linear-gradient(135deg, #FFF0F0 0%, #FFCCCC 100%); border: 3px solid #CD5C5C;">
        <h2 style="color: #8B0000;">Diese Nuss war zu hart! 😞</h2>
        <div class="results-summary">
          <p>Fehler: ${errors}</p>
          <p class="motivation">${motivationPhrase}</p>
          <p style="font-size: 14px; color: #666; margin-top: 8px;">Der Diamant ist weg, aber bald wartet eine neue Chance!</p>
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
}

export { initKopfnussTaskScreen as default };

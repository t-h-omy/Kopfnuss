// Kopfnuss - Kopfnuss Challenge Task Screen Controller
// Handles UI for Kopfnuss Challenge task screen and integrates with task flow logic

import { 
  getTodaysKopfnussChallenge,
  updateKopfnussChallenge,
  completeKopfnussChallenge,
  KOPFNUSS_STATE
} from './challengeGenerator.js';
import { CONFIG } from '../data/balancingLoader.js';
import { showScreen, notifyKopfnussChallengeResultBridge } from './uiBridge.js';
import { 
  isEventActive, 
  getActiveEvent, 
  addSeasonalCurrency
} from './eventManager.js';
import { addDiamonds, loadDiamonds } from './diamondManager.js';
import { playAnswerFeedback, playChallengeComplete, playDiamondEarn, playChallengeFailed } from './audioBootstrap.js';
import { logError } from './logging.js';
import { updateHeaderSeasonalDisplay, updateHeaderDiamondsDisplay } from '../ui/headerUI.js';

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
    logError('Kopfnuss Challenge not in progress');
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
  
  // Update progress bar (visual segments instead of text)
  const progressElement = document.getElementById('task-progress');
  if (progressElement) {
    const currentTaskNumber = currentTaskIndex + 1;
    const totalTasks = kopfnussState.tasks.length;
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
    
    // Play correct answer sound
    playAnswerFeedback(true);
    
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
    
    // Play wrong answer sound
    playAnswerFeedback(false);
    
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
  
  // Play appropriate sound based on result
  if (isPerfect) {
    playChallengeComplete();
  } else {
    playChallengeFailed();
  }
  
  // Complete the challenge
  const result = completeKopfnussChallenge(errors);
  
  // Handle rewards - let player choose if event is active
  let rewardInfo = null;
  if (isPerfect) {
    const rewardAmount = CONFIG.KOPFNUSS_REWARD_AMOUNT || 2;
    const eventActive = isEventActive();
    const activeEvent = eventActive ? getActiveEvent() : null;
    
    // Prepare reward info - mark as pending choice if event is active
    rewardInfo = {
      amount: rewardAmount,
      eventActive: eventActive,
      pendingChoice: eventActive, // Player can choose if event is active
      emoticon: activeEvent ? activeEvent.emoticon : null
    };
    
    // If no event, award diamonds immediately
    if (!eventActive) {
      addDiamonds(rewardAmount);
      // Update diamond display in header
      updateHeaderDiamondsDisplay();
      rewardInfo.isDiamond = true;
    }
    
    // Notify main.js about the result
    notifyKopfnussChallengeResultBridge(true, rewardInfo);
  } else {
    // Notify main.js about the failure
    notifyKopfnussChallengeResultBridge(false, null);
  }
  
  // Get appropriate phrase
  const motivationPhrase = isPerfect 
    ? getRandomPhrase(KOPFNUSS_PERFECT_PHRASES) 
    : getRandomPhrase(KOPFNUSS_FAILURE_PHRASES);
  
  // Build results content
  let resultContent;
  if (isPerfect) {
    // Build reward display - show choice if event is active
    let rewardDisplayHtml;
    if (rewardInfo.pendingChoice) {
      rewardDisplayHtml = `
        <div style="margin-top: 16px;">
          <p style="font-size: 14px; color: #8B4513; margin-bottom: 8px;">Wähle deine Belohnung:</p>
          <div style="display: flex; gap: 12px; justify-content: center;">
            <button id="choose-diamonds" class="reward-choice-btn" style="padding: 12px 20px; font-size: 18px; border: 2px solid #DAA520; border-radius: 12px; background: linear-gradient(135deg, #FFFACD 0%, #FFE4B5 100%); cursor: pointer; transition: all 0.2s;">
              +${rewardInfo.amount} 💎
            </button>
            <button id="choose-seasonal" class="reward-choice-btn" style="padding: 12px 20px; font-size: 18px; border: 2px solid #DAA520; border-radius: 12px; background: linear-gradient(135deg, #FFFACD 0%, #FFE4B5 100%); cursor: pointer; transition: all 0.2s;">
              +${rewardInfo.amount} ${rewardInfo.emoticon}
            </button>
          </div>
        </div>
      `;
    } else {
      const rewardText = `+${rewardInfo.amount} 💎`;
      rewardDisplayHtml = `<p style="font-size: 24px; margin-top: 16px;">${rewardText}</p>`;
    }
    
    resultContent = `
      <div class="task-results" style="background: linear-gradient(135deg, #FFFACD 0%, #FFD700 100%); border: 3px solid #DAA520;">
        <h2 style="color: #8B4513;">Kopfnuss geknackt! 🤔💥</h2>
        <div class="results-summary">
          <p class="perfect">🌟 ${motivationPhrase}</p>
          ${rewardDisplayHtml}
        </div>
        ${rewardInfo.pendingChoice ? '' : '<button id="back-to-challenges">Zurück zu Herausforderungen</button>'}
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
    
    // Handle reward choice buttons if event is active
    if (isPerfect && rewardInfo.pendingChoice) {
      const chooseDiamondsBtn = document.getElementById('choose-diamonds');
      const chooseSeasonalBtn = document.getElementById('choose-seasonal');
      
      if (chooseDiamondsBtn) {
        chooseDiamondsBtn.addEventListener('click', () => {
          // Play currency received sound
          playDiamondEarn();
          
          addDiamonds(rewardInfo.amount);
          // Update diamond display in header
          updateHeaderDiamondsDisplay();
          rewardInfo.isDiamond = true;
          rewardInfo.pendingChoice = false;
          notifyKopfnussChallengeResultBridge(true, rewardInfo);
          showScreen('challenges');
        });
      }
      
      if (chooseSeasonalBtn) {
        chooseSeasonalBtn.addEventListener('click', () => {
          // Play currency received sound
          playDiamondEarn();
          
          const result = addSeasonalCurrency(rewardInfo.amount);
          // Update seasonal currency display in header
          if (result.success) {
            updateHeaderSeasonalDisplay(result.total);
          }
          rewardInfo.isDiamond = false;
          rewardInfo.pendingChoice = false;
          notifyKopfnussChallengeResultBridge(true, rewardInfo);
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

export { initKopfnussTaskScreen as default };

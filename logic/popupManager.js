// Kopfnuss - Popup Manager
// Centralized popup handling utilities

import { CONFETTI_CONFIG } from '../data/constants.js';

/**
 * Popup queue system for sequential popup display
 */
const popupQueue = [];
let isShowingPopup = false;

/**
 * Process next popup in queue
 */
export function processPopupQueue() {
  if (popupQueue.length === 0) {
    isShowingPopup = false;
    return;
  }
  
  isShowingPopup = true;
  const nextPopup = popupQueue.shift();
  nextPopup();
}

/**
 * Add popup to queue and process if not already showing
 * @param {Function} popupFn - Function that shows the popup
 */
export function queuePopup(popupFn) {
  popupQueue.push(popupFn);
  if (!isShowingPopup) {
    processPopupQueue();
  }
}

/**
 * Create a popup overlay element
 * @param {string} id - Unique ID for the overlay
 * @param {string} additionalClass - Additional CSS class for the overlay
 * @returns {HTMLElement} The overlay element
 */
export function createPopupOverlay(id, additionalClass = '') {
  const overlay = document.createElement('div');
  overlay.className = `popup-overlay ${additionalClass}`.trim();
  overlay.id = id;
  return overlay;
}

/**
 * Create a popup card element
 * @param {string} additionalClass - Additional CSS class for the card
 * @returns {HTMLElement} The card element
 */
export function createPopupCard(additionalClass = '') {
  const popupCard = document.createElement('div');
  popupCard.className = `popup-card ${additionalClass}`.trim();
  return popupCard;
}

/**
 * Close a popup by its overlay ID
 * @param {string} overlayId - The ID of the overlay to close
 * @param {boolean} removeConfetti - Whether to remove confetti elements
 */
export function closePopup(overlayId, removeConfetti = false) {
  const overlay = document.getElementById(overlayId);
  if (overlay) {
    overlay.remove();
  }
  
  if (removeConfetti) {
    removeConfettiPieces();
  }
}

/**
 * Remove all confetti pieces from the DOM
 */
export function removeConfettiPieces() {
  const confettiPieces = document.querySelectorAll('.confetti-piece');
  confettiPieces.forEach(piece => piece.remove());
}

/**
 * Create confetti celebration effect
 */
export function createConfettiEffect() {
  const { COLORS, COUNT, MIN_DURATION, DURATION_VARIANCE, CLEANUP_DELAY } = CONFETTI_CONFIG;
  
  for (let i = 0; i < COUNT; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti-piece';
    confetti.style.backgroundColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    confetti.style.left = Math.random() * 100 + 'vw';
    confetti.style.top = '-20px';
    confetti.style.animationDelay = Math.random() * 0.5 + 's';
    confetti.style.animationDuration = (Math.random() * DURATION_VARIANCE + MIN_DURATION) + 's';
    
    document.body.appendChild(confetti);
    
    // Remove confetti after animation
    setTimeout(() => {
      confetti.remove();
    }, CLEANUP_DELAY);
  }
}

/**
 * Show a generic celebration popup with configurable content
 * @param {Object} config - Popup configuration
 * @param {string} config.overlayId - Unique overlay ID
 * @param {string} config.overlayClass - Additional overlay CSS class
 * @param {string} config.cardClass - Additional card CSS class
 * @param {string} config.icon - Celebration icon (emoji)
 * @param {string} config.title - Popup title
 * @param {string} config.displayIcon - Icon for the display area
 * @param {string} config.displayText - Text for the display area
 * @param {string} config.displayClass - CSS class for display area
 * @param {string} config.description - Description text
 * @param {string} config.buttonId - Button ID
 * @param {string} config.buttonText - Button text
 * @param {boolean} config.showConfetti - Whether to show confetti
 * @param {Function} config.onClose - Callback when popup closes
 */
export function showCelebrationPopup(config) {
  const overlay = createPopupOverlay(config.overlayId, config.overlayClass || 'reward-popup-overlay');
  const popupCard = createPopupCard(config.cardClass || 'reward-popup-card');
  
  popupCard.innerHTML = `
    <div class="reward-celebration">${config.icon}</div>
    <h2>${config.title}</h2>
    <div class="${config.displayClass}">
      <span class="${config.displayIconClass || ''}">${config.displayIcon}</span>
      <span class="${config.displayTextClass || ''}">${config.displayText}</span>
    </div>
    <p>${config.description}</p>
    <button id="${config.buttonId}" class="btn-primary">${config.buttonText}</button>
  `;
  
  overlay.appendChild(popupCard);
  document.body.appendChild(overlay);
  
  if (config.showConfetti) {
    createConfettiEffect();
  }
  
  const closeButton = document.getElementById(config.buttonId);
  closeButton.addEventListener('click', () => {
    closePopup(config.overlayId, config.showConfetti);
    if (config.onClose && typeof config.onClose === 'function') {
      config.onClose();
    }
    processPopupQueue();
  });
}

/**
 * Show a streak status popup with configurable content
 * @param {Object} config - Popup configuration
 * @param {string} config.overlayId - Unique overlay ID
 * @param {string} config.iconClass - Additional class for the icon
 * @param {string} config.icon - Icon emoji
 * @param {string} config.title - Popup title
 * @param {string} config.displayClass - CSS class for streak display
 * @param {string} config.displayIcon - Icon for display
 * @param {string} config.displayIconClass - CSS class for display icon
 * @param {number} config.streakCount - Streak count to display
 * @param {string} config.description - Main description text
 * @param {string} config.hint - Optional hint text
 * @param {string} config.extraText - Optional extra text (e.g., no diamond text)
 * @param {string} config.buttonId - Button ID
 * @param {string} config.buttonText - Button text
 * @param {boolean} config.showConfetti - Whether to show confetti
 * @param {Function} config.onClose - Callback when popup closes
 */
export function showStreakPopup(config) {
  const overlay = createPopupOverlay(config.overlayId, 'streak-popup-overlay');
  const popupCard = createPopupCard('streak-popup-card');
  
  const iconClass = config.iconClass ? `streak-popup-icon ${config.iconClass}` : 'streak-popup-icon';
  const hintHtml = config.hint ? `<p class="streak-hint">${config.hint}</p>` : '';
  const extraHtml = config.extraText || '';
  
  popupCard.innerHTML = `
    <div class="${iconClass}">${config.icon}</div>
    <h2>${config.title}</h2>
    <div class="streak-info-display ${config.displayClass}">
      <span class="${config.displayIconClass}">${config.displayIcon}</span>
      <span class="streak-count">${config.streakCount} Tage</span>
    </div>
    <p>${config.description}</p>
    ${hintHtml}
    ${extraHtml}
    <button id="${config.buttonId}" class="btn-primary">${config.buttonText}</button>
  `;
  
  overlay.appendChild(popupCard);
  document.body.appendChild(overlay);
  
  if (config.showConfetti) {
    createConfettiEffect();
  }
  
  return overlay;
}

// Kopfnuss - Audio Bootstrap
// Non-invasive audio integration via event delegation and MutationObserver
// Hooks into the UI without modifying main.js logic

import { audioManager } from './audioManager.js';

/**
 * Map of popup overlay class patterns to their corresponding SFX
 */
const POPUP_SFX_MAP = {
  'reward-popup-overlay': 'success_fanfare',
  'diamond-celebration-popup-overlay': 'diamond_gain',
  'streak-celebration-popup-overlay': 'streak_gain',
  'streak-popup-overlay': 'streak_gain',
  'settings-popup-overlay': 'modal_open',
  'background-shop-overlay': 'modal_open',
  'confirmation-popup-overlay': 'modal_open',
  'background-confirm-overlay': 'modal_open',
  'super-challenge-popup-overlay': 'modal_open',
  'kopfnuss-popup-overlay': 'modal_open',
  'zeit-popup-overlay': 'modal_open',
  'event-info-popup-overlay': 'modal_open',
  'event-start-popup-overlay': 'success_fanfare',
  'task-exit-confirmation-overlay': 'modal_open'
};

/**
 * Track which popups have been seen to handle open/close properly
 * @type {Set<string>}
 */
const activePopupIds = new Set();

/**
 * Initialize audio bootstrap - called after DOM is ready
 */
function init() {
  // Start preloading SFX files (non-blocking)
  audioManager.preloadAll().catch(() => {
    // Silently ignore preload failures - synth fallback will be used
  });

  // Attach delegated event listeners
  attachClickSoundHandlers();
  attachNodeSelectionHandlers();
  
  // Start observing for popup changes
  startPopupObserver();
}

/**
 * Attach delegated click handler for UI sounds
 * Plays ui_click on button clicks and interactive elements
 */
function attachClickSoundHandlers() {
  document.addEventListener('click', (e) => {
    // Resume AudioContext on first user interaction (required for mobile)
    audioManager.ensureUserGestureResume();

    const target = e.target;
    
    // Check if the clicked element or its parent is a button or interactive element
    const isButton = target.matches('button, .btn-primary, .btn-secondary, .btn-danger');
    const isInButton = target.closest('button, .btn-primary, .btn-secondary, .btn-danger');
    const isStatCapsule = target.matches('.stat-capsule') || target.closest('.stat-capsule');
    const isShopButton = target.matches('.shop-button, .burger-menu-button') || 
                          target.closest('.shop-button, .burger-menu-button');
    
    // Play UI click sound for buttons and interactive capsules
    if (isButton || isInButton || isStatCapsule || isShopButton) {
      audioManager.play('ui_click');
    }
  }, { passive: true });
}

/**
 * Attach delegated handler for challenge node selection
 * Plays node_select when user clicks on a challenge node
 */
function attachNodeSelectionHandlers() {
  document.addEventListener('click', (e) => {
    const target = e.target;
    
    // Check for challenge node container clicks
    const nodeContainer = target.closest('.challenge-node-container, .kopfnuss-node-container, .zeit-node-container');
    
    if (nodeContainer) {
      // Check if the node is clickable (has cursor: pointer or is in an interactive state)
      const style = window.getComputedStyle(nodeContainer);
      if (style.cursor === 'pointer') {
        audioManager.play('node_select');
      }
    }
  }, { passive: true });
}

/**
 * Start MutationObserver to detect popup additions/removals
 * Plays appropriate SFX when popups appear or disappear
 */
function startPopupObserver() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      // Check for added nodes (popup opened)
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          handleAddedElement(node);
        }
      }
      
      // Check for removed nodes (popup closed)
      for (const node of mutation.removedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          handleRemovedElement(node);
        }
      }
    }
  });

  // Observe the body for child additions/removals
  observer.observe(document.body, {
    childList: true,
    subtree: false // Only direct children (popups are added to body)
  });
}

/**
 * Handle an element being added to the DOM
 * @param {Element} element
 */
function handleAddedElement(element) {
  // Check if this is a popup overlay
  if (!element.classList.contains('popup-overlay')) return;
  
  const classList = element.classList;
  const elementId = element.id;
  
  // Find matching SFX for this popup type
  for (const [className, sfxName] of Object.entries(POPUP_SFX_MAP)) {
    if (classList.contains(className) || elementId === className) {
      // Track this popup as active
      if (elementId) {
        activePopupIds.add(elementId);
      }
      
      // Play the open sound
      audioManager.play(sfxName);
      return;
    }
  }
  
  // Generic popup open sound if no specific match
  if (classList.contains('popup-overlay')) {
    if (elementId) {
      activePopupIds.add(elementId);
    }
    audioManager.play('modal_open');
  }
}

/**
 * Handle an element being removed from the DOM
 * @param {Element} element
 */
function handleRemovedElement(element) {
  // Check if this is a popup overlay that was tracked
  if (!element.classList.contains('popup-overlay')) return;
  
  const elementId = element.id;
  
  if (elementId && activePopupIds.has(elementId)) {
    activePopupIds.delete(elementId);
    audioManager.play('modal_close');
  }
}

/**
 * Play sound for answer feedback in task screens
 * Can be called externally for integration with task controllers
 * @param {boolean} isCorrect
 */
export function playAnswerFeedback(isCorrect) {
  audioManager.play(isCorrect ? 'answer_correct' : 'answer_incorrect');
}

/**
 * Play confetti pop sound
 * Can be called when confetti effect is triggered
 */
export function playConfettiPop() {
  audioManager.play('confetti_pop');
}

/**
 * Play countdown tick sound
 * For Zeit-Challenge timer
 */
export function playCountdownTick() {
  audioManager.play('countdown_tick');
}

/**
 * Play low time warning sound
 * For Zeit-Challenge when time is running out
 */
export function playLowTimeWarning() {
  audioManager.play('low_time_warning');
}

/**
 * Play not enough diamonds hint sound
 */
export function playNotEnoughDiamondsHint() {
  audioManager.play('not_enough_diamonds_hint');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  // DOM is already ready
  init();
}

// Export audioManager for direct access if needed
export { audioManager };

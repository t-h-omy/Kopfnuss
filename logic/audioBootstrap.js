// Kopfnuss - Audio Bootstrap
// Non-invasive audio integration via event delegation and MutationObserver
// Hooks into the UI without modifying main.js logic

import { audioManager } from './audioManager.js';
import { SFX_VOLUME } from '../data/constants.js';

/**
 * Map of popup overlay class patterns to their corresponding SFX
 */
const POPUP_SFX_MAP = {
  'reward-popup-overlay': 'success_fanfare',
  'diamond-celebration-popup-overlay': 'diamond_gain',
  'streak-celebration-popup-overlay': 'streak_popup',
  'streak-popup-overlay': 'streak_popup',
  'settings-popup-overlay': 'modal_open',
  'background-shop-overlay': 'modal_open',
  'confirmation-popup-overlay': 'modal_open',
  'background-confirm-overlay': 'modal_open',
  'super-challenge-popup-overlay': 'super_challenge_popup',
  'kopfnuss-popup-overlay': 'premium_challenge_popup',
  'zeit-popup-overlay': 'premium_challenge_popup',
  'event-info-popup-overlay': 'modal_open',
  'event-start-popup-overlay': 'success_fanfare',
  'task-exit-confirmation-overlay': 'modal_open',
  'background-unlock-celebration-popup-overlay': 'background_unlocked',
  'seasonal-background-unlock-celebration-popup-overlay': 'background_unlocked'
};

/**
 * Selector for challenge node containers that trigger node_select sound
 * Add new node container classes here as needed
 */
const NODE_CONTAINER_SELECTOR = '.challenge-node-container, .kopfnuss-node-container, .zeit-node-container';

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
    // Skip shop buttons as they trigger popup sounds instead
    if ((isButton || isInButton || isStatCapsule) && !isShopButton) {
      audioManager.play('ui_click', { volume: SFX_VOLUME.ui_click });
    }
  }, { passive: true });
}

/**
 * Attach delegated handler for challenge node selection
 * Plays ui_click when user clicks on a challenge node
 */
function attachNodeSelectionHandlers() {
  document.addEventListener('click', (e) => {
    const target = e.target;
    
    // Check for challenge node container clicks
    const nodeContainer = target.closest(NODE_CONTAINER_SELECTOR);
    
    if (nodeContainer) {
      // Check if the node is clickable (has cursor: pointer or is in an interactive state)
      const style = window.getComputedStyle(nodeContainer);
      if (style.cursor === 'pointer') {
        audioManager.play('ui_click', { volume: SFX_VOLUME.ui_click });
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
  // POPUP_SFX_MAP keys can match either as class names or element IDs
  for (const [identifier, sfxName] of Object.entries(POPUP_SFX_MAP)) {
    if (classList.contains(identifier) || elementId === identifier) {
      // Track this popup as active
      if (elementId) {
        activePopupIds.add(elementId);
      }
      
      // Play the open sound with appropriate volume
      const volume = SFX_VOLUME[sfxName] || 1.0;
      audioManager.play(sfxName, { volume });
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
  const sfxName = isCorrect ? 'answer_correct' : 'answer_incorrect';
  audioManager.play(sfxName, { volume: SFX_VOLUME[sfxName] });
}

/**
 * Play sound when a new task appears
 */
export function playNewTask() {
  audioManager.play('new_task');
}

/**
 * Play sound when a challenge starts
 */
export function playChallengeStart() {
  audioManager.play('challenge_start', { volume: SFX_VOLUME.challenge_start });
}

/**
 * Play sound when a challenge is successfully completed
 */
export function playChallengeComplete() {
  audioManager.play('challenge_complete', { volume: SFX_VOLUME.challenge_complete });
}

/**
 * Play sound when a challenge is failed
 */
export function playChallengeFailed() {
  audioManager.play('challenge_failed', { volume: SFX_VOLUME.challenge_failed });
}

/**
 * Play countdown tick sound
 * For Zeit-Challenge timer
 */
export function playCountdownTick() {
  audioManager.play('countdown_tick', { volume: SFX_VOLUME.countdown_tick });
}

/**
 * Play sound when time runs out
 */
export function playTimesUp() {
  audioManager.play('times_up', { volume: SFX_VOLUME.times_up });
}

/**
 * Play low time warning sound
 * For Zeit-Challenge when time is running out
 */
export function playLowTimeWarning() {
  audioManager.play('low_time_warning');
}

/**
 * Play sound when earning diamonds
 */
export function playDiamondEarn() {
  audioManager.play('diamond_earn', { volume: SFX_VOLUME.diamond_earn });
}

/**
 * Play sound when spending diamonds
 */
export function playDiamondSpend() {
  audioManager.play('diamond_spend');
}

/**
 * Play sound when a background is unlocked
 */
export function playBackgroundUnlocked() {
  audioManager.play('background_unlocked', { volume: SFX_VOLUME.background_unlocked });
}

/**
 * Play sound when reward popup opens
 */
export function playPopupRewardOpen() {
  audioManager.play('popup_reward_open');
}

/**
 * Play generic UI button tap sound
 */
export function playButtonTap() {
  audioManager.play('ui_click', { volume: SFX_VOLUME.ui_click });
}

/**
 * Play sound when tapping a challenge node
 */
export function playChallengeNodeTap() {
  audioManager.play('node_select');
}

/**
 * Play sound when claiming a reward
 */
export function playRewardClaim() {
  audioManager.play('reward_claim');
}

/**
 * Play sound when navigating back or closing
 */
export function playBackClose() {
  audioManager.play('back_close');
}

/**
 * Play sound when changing tabs or screens
 */
export function playScreenChange() {
  audioManager.play('screen_change');
}

/**
 * Play sparkle effect sound
 */
export function playSparkleEffect() {
  audioManager.play('sparkle_effect');
}

/**
 * Play sound when a challenge node is highlighted
 */
export function playNodeHighlight() {
  audioManager.play('node_highlight');
}

/**
 * Play sound when an action is not allowed
 */
export function playActionNotAllowed() {
  audioManager.play('action_not_allowed', { volume: SFX_VOLUME.action_not_allowed });
}

/**
 * Play confetti pop sound (legacy/alias)
 * Can be called when confetti effect is triggered
 */
export function playConfettiPop() {
  audioManager.play('confetti_pop');
}

/**
 * Play not enough diamonds hint sound (legacy/alias)
 */
export function playNotEnoughDiamondsHint() {
  audioManager.play('not_enough_diamonds_hint');
}

/**
 * Play sound when purchasing a background with diamonds
 */
export function playBackgroundPurchased() {
  audioManager.play('background_purchased', { volume: SFX_VOLUME.background_purchased });
}

/**
 * Play streak popup sound
 */
export function playStreakPopup() {
  audioManager.play('streak_popup', { volume: SFX_VOLUME.streak_popup });
}

/**
 * Play Zeit challenge background music (looping)
 */
export function playZeitChallengeMusic() {
  audioManager.playMusic('time_challenge_music', { volume: SFX_VOLUME.time_challenge_music });
}

/**
 * Play final 10 seconds countdown music (crossfade from main music)
 */
export function playFinalCountdownMusic() {
  audioManager.crossfadeMusic('countdown_tick', { volume: SFX_VOLUME.countdown_tick }, 0.5);
}

/**
 * Stop Zeit challenge background music
 */
export function stopZeitChallengeMusic() {
  audioManager.stopMusic();
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

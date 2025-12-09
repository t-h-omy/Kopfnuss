// Kopfnuss - Main Application Entry Point
// Routing und App-Initialisierung

import { getTodaysChallenges, areAllChallengesCompleted, resetChallenges, CHALLENGE_STATE, isSuperChallengeState, getOrCreateKopfnussChallenge, getTodaysKopfnussChallenge, KOPFNUSS_STATE, startKopfnussChallenge, regenerateKopfnussChallenge, resetKopfnussChallengeAfterFailure, getOrCreateZeitChallenge, getTodaysZeitChallenge, ZEIT_CHALLENGE_STATE, startZeitChallenge, regenerateZeitChallenge, resetZeitChallengeAfterFailure } from './logic/challengeGenerator.js';
import { completeChallenge as completeChallengeState } from './logic/challengeStateManager.js';
import { 
  getStreakInfo, 
  checkStreakStatusOnLoad, 
  markStreakStatusHandled, 
  wasStreakStatusHandledToday,
  restoreExpiredStreak,
  acceptStreakLoss,
  unfreezeStreakByChallenge,
  incrementStreakByChallenge,
  STREAK_LOSS_REASON
} from './logic/streakManager.js';
import { getDiamondInfo, updateDiamonds, addDiamonds, loadDiamonds, saveDiamonds, spendDiamonds } from './logic/diamondManager.js';
import {
  getStreakStones,
  awardStreakStones,
  getMilestoneDiamondReward,
  getMilestoneInfo
} from './logic/streakMilestoneManager.js';
import {
  unlockPack,
  getPackStatus,
  getAllPackStatuses,
  isPackUnlocked
} from './logic/packManager.js';
import { 
  clearAllData, 
  loadDevModeSetting, 
  saveDevModeSetting,
  loadProgress,
  saveProgress,
  loadStreak,
  saveStreak,
  saveSelectedBackground as saveSelectedBackgroundToStorage,
  loadAudioMutedSetting,
  saveAudioMutedSetting,
  markShopOpenedWithNewBackgrounds,
  saveStreakStones,
  loadMilestoneProgress,
  saveMilestoneProgress
} from './logic/storageManager.js';
import { VERSION } from './version.js';
import { CONFIG } from './data/balancingLoader.js';
import { ANIMATION_TIMING, RESIZE_CONFIG, VISUAL_CONFIG, DEV_SETTINGS_CONFIG } from './data/constants.js';
import { 
  scrollToAndHighlightChallenge, 
  scrollToAndHighlightRewardButton,
  startSuperChallengeSparkles,
  stopSuperChallengeSparkles
} from './logic/visualEffects.js';
import { 
  createConfettiEffect, 
  processPopupQueue, 
  queuePopup,
  closePopup,
  removeConfettiPieces
} from './logic/popupManager.js';
import {
  getAllBackgrounds,
  getSelectedBackground,
  applySelectedBackground,
  unlockBackground,
  selectBackground,
  isBackgroundUnlocked,
  BACKGROUND_STATE,
  checkForNewlyPurchasableBackgrounds,
  shouldShowNewBadge,
  updateKnownPurchasableBackgrounds
} from './logic/backgroundManager.js';
import {
  getActiveEvent,
  isEventActive,
  getDaysUntilEventEnd,
  getSeasonalCurrency,
  addSeasonalCurrency,
  getSeasonalTaskCount,
  incrementSeasonalTasks,
  getAllActiveSeasonalBackgrounds,
  unlockSeasonalBackground,
  shouldShowEventStartPopup,
  markEventStartPopupShown,
  shouldShowEventEndPopup,
  markEventEndPopupShown,
  checkAndResetSeasonalBackground,
  isSeasonalBackgroundUsable,
  clearEventData,
  checkForNewlyPurchasableSeasonalBackgrounds,
  updateKnownSeasonalPurchasableBackgrounds
} from './logic/eventManager.js';
import { audioManager } from './logic/audioManager.js';
import { 
  playBackgroundPurchased, 
  playZeitChallengeMusic, 
  stopZeitChallengeMusic,
  playDiamondEarn,
  playButtonTap
} from './logic/audioBootstrap.js';

/**
 * Set the --app-height CSS custom property for mobile keyboard stability
 * This prevents layout shifts when mobile keyboard appears/disappears
 */
function setAppHeight() {
  const appHeight = window.innerHeight;
  document.documentElement.style.setProperty('--app-height', `${appHeight}px`);
}

// Initialize app height on load
setAppHeight();

// Set background opacity from balancing config
document.documentElement.style.setProperty('--background-opacity', VISUAL_CONFIG.BACKGROUND_OPACITY);

// Set shadow CSS variables from balancing config
// These values can be tuned in data/balancing_prod.json or balancing_dev.json without touching CSS
document.documentElement.style.setProperty('--shadow-color', CONFIG.SHADOW_COLOR);
document.documentElement.style.setProperty('--shadow-blur-small', CONFIG.SHADOW_BLUR_SMALL);
document.documentElement.style.setProperty('--shadow-blur-large', CONFIG.SHADOW_BLUR_LARGE);
document.documentElement.style.setProperty('--shadow-spread-small', CONFIG.SHADOW_SPREAD_SMALL);
document.documentElement.style.setProperty('--shadow-spread-large', CONFIG.SHADOW_SPREAD_LARGE);
document.documentElement.style.setProperty('--shadow-offset-y-small', CONFIG.SHADOW_OFFSET_Y_SMALL);
document.documentElement.style.setProperty('--shadow-offset-y-large', CONFIG.SHADOW_OFFSET_Y_LARGE);

// Set animation timing CSS variables from constants
document.documentElement.style.setProperty('--shop-badge-shake-interval', `${ANIMATION_TIMING.NEW_BADGE_SHAKE_INTERVAL_MS}ms`);
document.documentElement.style.setProperty('--shop-badge-shake-duration', `${ANIMATION_TIMING.NEW_BADGE_SHAKE_DURATION_MS}ms`);
document.documentElement.style.setProperty('--reward-diamond-shake-interval', `${ANIMATION_TIMING.REWARD_BUTTON_SHAKE_INTERVAL_MS}ms`);
document.documentElement.style.setProperty('--reward-diamond-shake-duration', `${ANIMATION_TIMING.REWARD_BUTTON_SHAKE_DURATION_MS}ms`);

// Apply selected background on load
applySelectedBackground();

// Initialize audio mute state from storage
audioManager.setMuted(loadAudioMutedSetting());

// Update app height on resize (but NOT on focus/blur to prevent keyboard-related jumps)
// Use a debounced resize handler to avoid excessive updates
let resizeTimeout = null;
window.addEventListener('resize', () => {
  // Clear existing timeout
  if (resizeTimeout) {
    clearTimeout(resizeTimeout);
  }
  // Debounce resize events to prevent rapid updates
  resizeTimeout = setTimeout(() => {
    // Only update if we're not in a focused input state (keyboard likely showing)
    const activeElement = document.activeElement;
    const isInputFocused = activeElement && (
      activeElement.tagName === 'INPUT' || 
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.contentEditable === 'true'
    );
    
    if (!isInputFocused) {
      setAppHeight();
    }
  }, RESIZE_CONFIG.DEBOUNCE_DELAY);
});

// Also set on orientation change (more reliable than resize for orientation)
window.addEventListener('orientationchange', () => {
  // Wait for orientation change to complete
  setTimeout(setAppHeight, RESIZE_CONFIG.ORIENTATION_CHANGE_DELAY);
});

// Service Worker Registrierung mit Version Logging und automatischem Cache-Reset
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Register SW with updateViaCache: 'none' to bypass HTTP cache for SW file
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
      .then((registration) => {
        console.log('ServiceWorker registriert:', registration.scope);
        console.log('App Version:', VERSION.string);
        
        // Force update check immediately
        registration.update();
        
        // Prüfe auf Updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('Neuer ServiceWorker gefunden, installiere...');
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('Neue Version verfügbar! Cache wird geleert und Seite neu geladen...');
              // Clear all caches before reloading
              caches.keys().then((cacheNames) => {
                return Promise.all(
                  cacheNames.map((cacheName) => {
                    console.log('Lösche Cache:', cacheName);
                    return caches.delete(cacheName);
                  })
                );
              }).then(() => {
                // Tell SW to skip waiting
                newWorker.postMessage({ type: 'SKIP_WAITING' });
              }).catch((error) => {
                console.error('Cache löschen fehlgeschlagen:', error);
                // Still try to skip waiting even if cache deletion failed
                newWorker.postMessage({ type: 'SKIP_WAITING' });
              });
            }
          });
        });
      })
      .catch((error) => {
        console.error('ServiceWorker Registrierung fehlgeschlagen:', error);
      });
  });
  
  // Listen for controller change (when new SW takes over)
  // This ensures the page reloads if the SW was updated while the page was open
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    console.log('ServiceWorker Controller gewechselt, lade Seite neu...');
    window.location.reload();
  });
}

// Global state for current screen and data
let currentScreen = null;
let currentChallengeIndex = null;
let returningFromTaskScreen = false;
let returningFromKopfnussScreen = false; // Track if returning from Kopfnuss Challenge
let returningFromZeitChallengeScreen = false; // Track if returning from Zeit-Challenge
let streakWasUnfrozen = false; // Track if streak was unfrozen during challenge completion
let streakWasIncremented = false; // Track if streak was incremented during challenge completion
let milestoneWasReached = false; // Track if a streak milestone was reached during challenge completion
let devDiamondsEarned = 0; // Track diamonds earned from dev settings to show popup when settings close
let lastUsedGraphicIndex = -1; // Track last used background graphic for variety
let superChallengeResult = null; // Track super challenge result {success: boolean, awardedDiamond: boolean, seasonalCurrencyAwarded: object|null}
let kopfnussChallengeResult = null; // Track Kopfnuss Challenge result {success: boolean, reward: object|null}
let zeitChallengeResult = null; // Track Zeit-Challenge result {success: boolean, reward: object|null}

// Preload celebration images for faster display
const celebrationImageCache = [];
function preloadCelebrationImages() {
  const celebrationGraphics = [
    './assets/celebration/challenge-node-bg-1.webp',
    './assets/celebration/challenge-node-bg-2.webp',
    './assets/celebration/challenge-node-bg-3.webp',
    './assets/celebration/challenge-node-bg-4.webp',
    './assets/celebration/challenge-node-bg-5.webp'
  ];
  
  celebrationGraphics.forEach((src, index) => {
    const img = new Image();
    img.src = src;
    celebrationImageCache[index] = img;
  });
}

// Preload images on module load
preloadCelebrationImages();

/**
 * Update the header streak display with new values
 * @param {number} streakCount - The new streak count
 * @param {boolean} isFrozen - Whether the streak is frozen
 */
function updateHeaderStreakDisplay(streakCount, isFrozen = false) {
  const streakCapsule = document.querySelector('.header-stats .stat-capsule:first-child');
  const streakIcon = streakCapsule?.querySelector('.stat-icon');
  const streakValue = streakCapsule?.querySelector('.stat-value');
  
  if (streakValue) {
    streakValue.textContent = streakCount;
  }
  
  if (streakCapsule && streakIcon) {
    if (isFrozen) {
      streakCapsule.classList.add('streak-frozen');
      streakIcon.textContent = '🧊';
    } else {
      streakCapsule.classList.remove('streak-frozen');
      streakIcon.textContent = '🔥';
    }
  }
}

/**
 * Find the index of the currently unlocked (available or in_progress) challenge
 * @param {Array} challenges - Array of challenge objects
 * @returns {number} Index of the current unlocked challenge, or -1 if none found
 */
function findCurrentUnlockedChallengeIndex(challenges) {
  // First, look for an in_progress challenge (regular or super)
  const inProgressIndex = challenges.findIndex(c => 
    c.state === 'in_progress' || c.state === 'super_in_progress'
  );
  if (inProgressIndex !== -1) {
    return inProgressIndex;
  }
  
  // Then, look for the first available challenge (regular or super)
  const availableIndex = challenges.findIndex(c => 
    c.state === 'available' || c.state === 'super_available'
  );
  if (availableIndex !== -1) {
    return availableIndex;
  }
  
  // If no unlocked challenge found, return -1
  return -1;
}

/**
 * Show a screen by name
 * @param {string} screenName - Name of screen to show ('challenges', 'taskScreen', 'stats', 'kopfnussTaskScreen', 'zeitChallengeTaskScreen')
 * @param {*} data - Optional data to pass to screen (e.g., challengeIndex)
 */
export function showScreen(screenName, data = null) {
  const mainContent = document.getElementById('main-content');
  
  if (!mainContent) {
    console.error('Main content element not found');
    return;
  }
  
  // Track if we're returning from task screen to challenges
  if (currentScreen === 'taskScreen' && screenName === 'challenges') {
    returningFromTaskScreen = true;
  }
  
  // Track if we're returning from Kopfnuss task screen to challenges
  if (currentScreen === 'kopfnussTaskScreen' && screenName === 'challenges') {
    returningFromKopfnussScreen = true;
  }
  
  // Track if we're returning from Zeit-Challenge task screen to challenges
  if (currentScreen === 'zeitChallengeTaskScreen' && screenName === 'challenges') {
    returningFromZeitChallengeScreen = true;
    // Cleanup Zeit challenge when leaving
    import('./logic/zeitChallengeTaskController.js').then(module => {
      if (module.cleanupZeitChallengeTaskScreen) {
        module.cleanupZeitChallengeTaskScreen();
      }
    }).catch(() => {
      // Silently ignore if module not loaded
    });
  }
  
  // Store current screen
  currentScreen = screenName;
  
  // Clear current content
  mainContent.innerHTML = '';
  
  // Manage body class for task screen keyboard stability
  if (screenName === 'taskScreen' || screenName === 'kopfnussTaskScreen' || screenName === 'zeitChallengeTaskScreen') {
    document.body.classList.add('task-screen-active');
  } else {
    document.body.classList.remove('task-screen-active');
  }
  
  // Route to appropriate screen
  switch (screenName) {
    case 'challenges':
      loadChallengesScreen(mainContent);
      break;
    case 'taskScreen':
      currentChallengeIndex = data;
      loadTaskScreen(mainContent, data);
      break;
    case 'kopfnussTaskScreen':
      loadKopfnussTaskScreen(mainContent);
      break;
    case 'zeitChallengeTaskScreen':
      loadZeitChallengeTaskScreen(mainContent);
      break;
    case 'stats':
      loadStatsScreen(mainContent);
      break;
    default:
      console.error('Unknown screen:', screenName);
  }
}

/**
 * Load challenges screen
 * @param {HTMLElement} container - Container element
 */
function loadChallengesScreen(container) {
  // Get data
  const challenges = getTodaysChallenges();
  
  // Update streak status (this checks for freezing/expiration, but does not increment streak)
  const streakInfo = getStreakInfo();
  
  // Update diamonds based on progress and check if any were awarded
  const diamondResult = updateDiamonds();
  const diamondInfo = getDiamondInfo();
  
  // Store flag value and challenge index for animation before resetting
  const shouldAnimateBackground = returningFromTaskScreen;
  const justCompletedChallengeIndex = currentChallengeIndex;
  
  // Handle popup display when returning from task screen
  // Queue popups to show sequentially: first super challenge result, then diamond, then streak, then background unlock
  // After all popups close, scroll to the current unlocked challenge or reward button
  if (returningFromTaskScreen) {
    returningFromTaskScreen = false;
    
    // Check for super challenge result
    const showSuperChallengeSuccess = superChallengeResult && superChallengeResult.success;
    const showSuperChallengeFailure = superChallengeResult && !superChallengeResult.success;
    const storedSuperChallengeResult = superChallengeResult;
    superChallengeResult = null; // Reset the flag
    
    const showDiamond = diamondResult.awarded > 0;
    // Check if streak was unfrozen during challenge (streakWasUnfrozen is the new streak value or false)
    const showUnfrozen = typeof streakWasUnfrozen === 'number' && streakWasUnfrozen > 0;
    // Check if streak was incremented during challenge (only show if not unfrozen to avoid duplicate celebration)
    const showStreakIncremented = typeof streakWasIncremented === 'number' && streakWasIncremented > 0 && !showUnfrozen;
    // Check if milestone was reached
    const showMilestone = milestoneWasReached;
    
    // Check for newly purchasable backgrounds (regular)
    const backgroundUnlockResult = checkForNewlyPurchasableBackgrounds();
    const showBackgroundUnlock = backgroundUnlockResult.hasNew;
    const newlyPurchasableBackground = backgroundUnlockResult.firstNewBackground;
    
    // Check for newly purchasable seasonal backgrounds
    const seasonalBackgroundUnlockResult = checkForNewlyPurchasableSeasonalBackgrounds();
    const showSeasonalBackgroundUnlock = seasonalBackgroundUnlockResult.hasNew;
    const newlyPurchasableSeasonalBackground = seasonalBackgroundUnlockResult.firstNewBackground;
    
    // Reset the flags
    const unfrozenStreakValue = streakWasUnfrozen;
    const incrementedStreakValue = streakWasIncremented;
    streakWasUnfrozen = false;
    streakWasIncremented = false;
    milestoneWasReached = false;
    
    // Create a scroll callback that will be called after the last popup closes
    const scrollAfterPopups = () => {
      const allChallengesCompleted = areAllChallengesCompleted();
      if (allChallengesCompleted) {
        // All challenges completed - scroll to reward button with sparkle effect
        scrollToAndHighlightRewardButton();
      } else {
        const unlockedIdx = findCurrentUnlockedChallengeIndex(challenges);
        if (unlockedIdx >= 0) {
          scrollToAndHighlightChallenge(unlockedIdx);
        }
      }
    };
    
    // Queue popups: super challenge result first, then unfrozen, then diamond, then streak, then milestone, then background unlock
    const popupsToShow = [];
    
    if (showSuperChallengeSuccess) {
      popupsToShow.push((next) => showSuperChallengeSuccessPopup(storedSuperChallengeResult, next));
    } else if (showSuperChallengeFailure) {
      popupsToShow.push((next) => showSuperChallengeFailurePopup(next));
    }
    if (showUnfrozen) {
      popupsToShow.push((next) => showStreakUnfrozenPopup(unfrozenStreakValue, next));
    }
    if (showDiamond) {
      popupsToShow.push((next) => showDiamondCelebrationPopup(diamondResult.awarded, CONFIG.TASKS_PER_DIAMOND, next));
    }
    if (showStreakIncremented) {
      // Show streak celebration popup when streak was incremented by challenge completion
      popupsToShow.push((next) => showStreakCelebrationPopup(incrementedStreakValue, next));
    }
    if (showMilestone) {
      // Show milestone popup after streak celebration
      popupsToShow.push((next) => showStreakMilestonePopup(next));
    }
    if (showBackgroundUnlock && newlyPurchasableBackground) {
      // Show background unlock celebration popup when a new background becomes purchasable
      popupsToShow.push((next) => showBackgroundUnlockCelebrationPopup(newlyPurchasableBackground, next));
    }
    if (showSeasonalBackgroundUnlock && newlyPurchasableSeasonalBackground) {
      // Show seasonal background unlock celebration popup when a new seasonal background becomes purchasable
      popupsToShow.push((next) => showSeasonalBackgroundUnlockCelebrationPopup(newlyPurchasableSeasonalBackground, next));
    }
    
    // Chain popups together
    if (popupsToShow.length > 0) {
      let chain = scrollAfterPopups;
      for (let i = popupsToShow.length - 1; i >= 0; i--) {
        const popup = popupsToShow[i];
        const nextInChain = chain;
        chain = () => popup(nextInChain);
      }
      chain();
    }
  }
  
  // Handle popup display when returning from Kopfnuss task screen
  if (returningFromKopfnussScreen) {
    returningFromKopfnussScreen = false;
    
    // Check for Kopfnuss Challenge result
    const showKopfnussSuccess = kopfnussChallengeResult && kopfnussChallengeResult.success;
    const showKopfnussFailure = kopfnussChallengeResult && !kopfnussChallengeResult.success;
    const storedKopfnussResult = kopfnussChallengeResult;
    kopfnussChallengeResult = null; // Reset the flag
    
    if (showKopfnussSuccess && storedKopfnussResult.reward) {
      showKopfnussSuccessPopup(storedKopfnussResult.reward);
    } else if (showKopfnussFailure) {
      showKopfnussFailurePopup();
    }
  }
  
  // Handle popup display when returning from Zeit-Challenge task screen
  if (returningFromZeitChallengeScreen) {
    returningFromZeitChallengeScreen = false;
    
    // Check for Zeit-Challenge result
    const showZeitSuccess = zeitChallengeResult && zeitChallengeResult.success;
    const showZeitFailure = zeitChallengeResult && !zeitChallengeResult.success;
    const storedZeitResult = zeitChallengeResult;
    zeitChallengeResult = null; // Reset the flag
    
    if (showZeitSuccess && storedZeitResult.reward) {
      showZeitChallengeSuccessPopup(storedZeitResult.reward);
    } else if (showZeitFailure) {
      showZeitChallengeFailurePopup();
    }
  }
  
  // Create main container
  const challengesContainer = document.createElement('div');
  challengesContainer.className = 'challenges-container';
  
  // Create progress text with correct singular/plural form
  const tasksUntilNext = diamondInfo.tasksUntilNext;
  const progressText = tasksUntilNext === 1 
    ? 'Noch 1 Aufgabe bis +1 💎' 
    : `Noch ${tasksUntilNext} Aufgaben bis +1 💎`;
  
  // Use blue flame (frozen) icon when streak is frozen, normal fire otherwise
  const streakIcon = streakInfo.isFrozen ? '🧊' : '🔥';
  const streakClass = streakInfo.isFrozen ? 'stat-capsule streak-frozen' : 'stat-capsule';
  
  // Check for active seasonal event
  const activeEvent = getActiveEvent();
  const daysUntilEventEnd = getDaysUntilEventEnd();
  const seasonalCurrency = activeEvent ? getSeasonalCurrency() : 0;
  
  // Build event countdown HTML for row 2
  let eventCountdownHtml = '';
  if (activeEvent && daysUntilEventEnd !== null) {
    const dayText = daysUntilEventEnd === 1 ? 'Tag' : 'Tage';
    eventCountdownHtml = `
      <div class="event-countdown">
        <span class="event-emoticon">${activeEvent.emoticon}</span>
        <span class="event-countdown-text">Noch ${daysUntilEventEnd} ${dayText}</span>
      </div>
    `;
  }
  
  // Build seasonal currency display HTML for row 1
  let seasonalCurrencyHtml = '';
  if (activeEvent) {
    seasonalCurrencyHtml = `
      <div class="stat-capsule seasonal-currency">
        <span class="stat-icon">${activeEvent.emoticon}</span>
        <span class="stat-value">${seasonalCurrency}</span>
      </div>
    `;
  }
  
  // Check if NEW badge should be shown on shop button
  const showNewBadge = shouldShowNewBadge();
  const newBadgeHtml = showNewBadge ? '<span class="shop-new-badge">NEU</span>' : '';
  
  // Create fixed header with two-row layout
  // Row 1: Left (streak, diamonds, seasonal currency) | Right (shop, burger menu)
  // Row 2: Left (diamond progress) | Right (event countdown)
  const header = document.createElement('div');
  header.className = 'challenges-header';
  
  // Get streak stone info
  const streakStones = getStreakStones();
  
  header.innerHTML = `
    <div class="header-row header-row-1">
      <div class="header-row-left">
        <div class="header-stats">
          <div class="${streakClass}">
            <span class="stat-icon">${streakIcon}</span>
            <span class="stat-value">${streakInfo.currentStreak}</span>
          </div>
          <div class="stat-capsule">
            <span class="stat-icon">💎</span>
            <span class="stat-value">${diamondInfo.current}</span>
          </div>
          <div class="stat-capsule">
            <span class="stat-icon">🫧</span>
            <span class="stat-value">${streakStones}</span>
          </div>
          ${seasonalCurrencyHtml}
        </div>
      </div>
      <div class="header-row-right">
        <button class="shop-button ${showNewBadge ? 'has-new-badge' : ''}" id="shop-button" aria-label="Hintergründe anpassen">
          <span class="shop-icon">🛒</span>
          ${newBadgeHtml}
        </button>
        <button class="burger-menu-button" id="burger-menu-button" aria-label="Einstellungen öffnen">
          <span class="burger-icon">☰</span>
        </button>
      </div>
    </div>
    <div class="header-row header-row-2">
      <div class="header-row-left">
        <div class="diamond-progress-info">${progressText}</div>
      </div>
      <div class="header-row-right">
        ${eventCountdownHtml}
      </div>
    </div>
  `;
  
  // Add event listeners for buttons inside header
  const burgerButton = header.querySelector('#burger-menu-button');
  burgerButton.addEventListener('click', showSettingsPopup);
  
  const shopButton = header.querySelector('#shop-button');
  shopButton.addEventListener('click', () => {
    // Open shop without auto-scrolling - shop will show event backgrounds at top by default
    showBackgroundShopPopup(null);
  });
  
  // Add click handler for event countdown capsule (opens event popup)
  const eventCountdown = header.querySelector('.event-countdown');
  if (eventCountdown) {
    eventCountdown.addEventListener('click', () => {
      queuePopup(() => showEventInfoPopup());
    });
  }
  
  // Create page title (below fixed header)
  const pageTitle = document.createElement('h1');
  pageTitle.className = 'challenges-title';
  pageTitle.textContent = 'Tägliche Herausforderungen';
  
  // Create challenges map container
  const challengesMap = document.createElement('div');
  challengesMap.className = 'challenges-map';
  
  // Get or create premium challenges (mutually exclusive)
  const kopfnussChallenge = getOrCreateKopfnussChallenge();
  const zeitChallenge = getOrCreateZeitChallenge();
  
  // Helper function to generate splash rays HTML with scale value
  function generateSplashRaysHtml(className = 'challenge-splash', scale = VISUAL_CONFIG.STANDARD_CHALLENGE_SCALE) {
    const numRays = 12;
    const baseLength = Math.round(scale / 5); // Ray length is 1/5th of scale for proper proportions
    
    // Calculate container size to fit the rays
    const containerSize = scale;
    
    let raysHtml = '';
    for (let i = 0; i < numRays; i++) {
      const angle = (i * 360 / numRays);
      const length = baseLength + ((i % 3) * 6);
      raysHtml += `<div class="splash-ray" style="transform: translate(-50%, 0) rotate(${angle}deg); height: ${length}px;"></div>`;
    }
    return `<div class="${className}" style="width: ${containerSize}px; height: ${containerSize}px;">${raysHtml}</div>`;
  }
  
  // Create Zeit-Challenge section (if spawned and not completed)
  let zeitSectionHtml = '';
  if (zeitChallenge && zeitChallenge.spawned) {
    const isZeitCompleted = zeitChallenge.state === ZEIT_CHALLENGE_STATE.COMPLETED;
    const isZeitFailed = zeitChallenge.state === ZEIT_CHALLENGE_STATE.FAILED;
    const zeitRowClass = isZeitCompleted ? 'zeit-row zeit-completed' : 'zeit-row';
    const zeitEntryCost = CONFIG.ZEIT_CHALLENGE_ENTRY_COST || 1;
    const zeitRewardAmount = CONFIG.ZEIT_CHALLENGE_REWARD_AMOUNT || 2;
    
    // Build status icon
    let zeitStatusIcon = '';
    if (isZeitCompleted) {
      zeitStatusIcon = '<span class="zeit-status-icon">⭐</span>';
    }
    
    // Build cost/reward text - show reward if completed, cost otherwise
    let zeitCostOrRewardText = `Kosten: ${zeitEntryCost} 💎`;
    if (isZeitCompleted) {
      // Check if event is active - show seasonal currency or diamonds
      const activeEvent = getActiveEvent();
      if (activeEvent) {
        zeitCostOrRewardText = `Belohnung: +${zeitRewardAmount} ${activeEvent.emoticon}`;
      } else {
        zeitCostOrRewardText = `Belohnung: +${zeitRewardAmount} 💎`;
      }
    }
    
    // Build hint text
    let zeitHintText = 'Schaffst du alle Aufgaben rechtzeitig?';
    if (isZeitCompleted) {
      zeitHintText = 'Zeit bezwungen!';
    } else if (isZeitFailed) {
      zeitHintText = 'Erneut versuchen?';
    }
    
    // Build splash rays with premium scale
    const zeitSplashRays = generateSplashRaysHtml('zeit-splash challenge-splash', VISUAL_CONFIG.PREMIUM_CHALLENGE_SCALE);
    
    // Build celebration background for completed state
    let zeitCelebrationBg = '';
    if (isZeitCompleted) {
      // Select a random celebration graphic
      const zeitCelebrationGraphics = [
        'celebration/challenge-node-bg-1.webp', 
        'celebration/challenge-node-bg-2.webp', 
        'celebration/challenge-node-bg-3.webp', 
        'celebration/challenge-node-bg-4.webp', 
        'celebration/challenge-node-bg-5.webp'
      ];
      const graphicIndex = Math.floor(Math.random() * zeitCelebrationGraphics.length);
      const bgSize = VISUAL_CONFIG.PREMIUM_CHALLENGE_SCALE;
      zeitCelebrationBg = `
        <div class="zeit-bg-graphic challenge-bg-graphic challenge-bg-animate" style="width: ${bgSize}px; height: ${bgSize}px;">
          <img src="./assets/${zeitCelebrationGraphics[graphicIndex]}" alt="" aria-hidden="true">
        </div>
      `;
    }
    
    zeitSectionHtml = `
      <div class="zeit-section" id="zeit-section">
        <div class="${zeitRowClass}">
          <div class="zeit-node-container" id="zeit-node-container">
            ${zeitSplashRays}
            ${zeitCelebrationBg}
            <div class="zeit-glow"></div>
            <div class="zeit-node-wrapper">
              <div class="zeit-node">
                ⏱️
                ${zeitStatusIcon}
              </div>
            </div>
          </div>
          <div class="zeit-info-card">
            <h3>Zeit-Challenge</h3>
            <p class="zeit-cost">${zeitCostOrRewardText}</p>
            <p class="zeit-hint">${zeitHintText}</p>
          </div>
        </div>
      </div>
    `;
  }
  
  // Create Kopfnuss Challenge section (if spawned and not completed)
  let kopfnussSectionHtml = '';
  if (kopfnussChallenge && kopfnussChallenge.spawned) {
    const isKopfnussCompleted = kopfnussChallenge.state === KOPFNUSS_STATE.COMPLETED;
    const isKopfnussFailed = kopfnussChallenge.state === KOPFNUSS_STATE.FAILED;
    const kopfnussRowClass = isKopfnussCompleted ? 'kopfnuss-row kopfnuss-completed' : 'kopfnuss-row';
    const kopfnussRewardAmount = CONFIG.KOPFNUSS_REWARD_AMOUNT || 2;
    
    // Build status icon
    let kopfnussStatusIcon = '';
    if (isKopfnussCompleted) {
      kopfnussStatusIcon = '<span class="kopfnuss-status-icon">⭐</span>';
    }
    
    // Build cost/reward text - show reward if completed, cost otherwise
    let kopfnussCostOrRewardText = 'Kosten: 1 💎';
    if (isKopfnussCompleted) {
      const activeEvent = getActiveEvent();
      if (activeEvent) {
        kopfnussCostOrRewardText = `Belohnung: +${kopfnussRewardAmount} ${activeEvent.emoticon}`;
      } else {
        kopfnussCostOrRewardText = `Belohnung: +${kopfnussRewardAmount} 💎`;
      }
    }
    
    // Build hint text
    let hintText = 'Schwierige Bonus-Challenge';
    if (isKopfnussCompleted) {
      hintText = 'Erfolgreich geknackt!';
    } else if (isKopfnussFailed) {
      hintText = 'Erneut versuchen?';
    }
    
    // Build splash rays with premium scale
    const kopfnussSplashRays = generateSplashRaysHtml('kopfnuss-splash challenge-splash', VISUAL_CONFIG.PREMIUM_CHALLENGE_SCALE);
    
    // Build celebration background for completed state
    let kopfnussCelebrationBg = '';
    if (isKopfnussCompleted) {
      const kopfnussCelebrationGraphics = [
        'celebration/challenge-node-bg-1.webp', 
        'celebration/challenge-node-bg-2.webp', 
        'celebration/challenge-node-bg-3.webp', 
        'celebration/challenge-node-bg-4.webp', 
        'celebration/challenge-node-bg-5.webp'
      ];
      const graphicIndex = Math.floor(Math.random() * kopfnussCelebrationGraphics.length);
      const bgSize = VISUAL_CONFIG.PREMIUM_CHALLENGE_SCALE;
      kopfnussCelebrationBg = `
        <div class="kopfnuss-bg-graphic challenge-bg-graphic challenge-bg-animate" style="width: ${bgSize}px; height: ${bgSize}px;">
          <img src="./assets/${kopfnussCelebrationGraphics[graphicIndex]}" alt="" aria-hidden="true">
        </div>
      `;
    }
    
    kopfnussSectionHtml = `
      <div class="kopfnuss-section" id="kopfnuss-section">
        <div class="${kopfnussRowClass}">
          <div class="kopfnuss-node-container" id="kopfnuss-node-container">
            ${kopfnussSplashRays}
            ${kopfnussCelebrationBg}
            <div class="kopfnuss-glow"></div>
            <div class="kopfnuss-node-wrapper">
              <div class="kopfnuss-node">
                🤔
                ${kopfnussStatusIcon}
              </div>
            </div>
          </div>
          <div class="kopfnuss-info-card">
            <h3>Kopfnuss-Challenge</h3>
            <p class="kopfnuss-cost">${kopfnussCostOrRewardText}</p>
            <p class="kopfnuss-hint">${hintText}</p>
          </div>
        </div>
      </div>
    `;
  }
  
  // Create SVG for connection lines
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('class', 'challenges-path-svg');
  svg.setAttribute('preserveAspectRatio', 'none');
  
  // Create challenges list
  const challengesList = document.createElement('div');
  challengesList.className = 'challenges-list';
  
  // Add Zeit-Challenge section HTML if available (appears first, before daily challenges)
  // Only one of Zeit-Challenge or Kopfnuss can spawn due to mutually exclusive logic
  if (zeitSectionHtml) {
    challengesList.innerHTML = zeitSectionHtml;
  } else if (kopfnussSectionHtml) {
    // Add Kopfnuss section HTML if available
    challengesList.innerHTML = kopfnussSectionHtml;
  }
  
  // Store node positions for SVG path calculation
  const nodePositions = [];
  
  // Background graphics for completed challenges (512×512 WebP images from assets folder)
  const celebrationGraphics = [
    'celebration/challenge-node-bg-1.webp', 
    'celebration/challenge-node-bg-2.webp', 
    'celebration/challenge-node-bg-3.webp', 
    'celebration/challenge-node-bg-4.webp', 
    'celebration/challenge-node-bg-5.webp'
  ];
  
  challenges.forEach((challenge, index) => {
    const isLeftPosition = index % 2 === 0;
    const positionClass = isLeftPosition ? 'position-left' : 'position-right';
    
    const statusText = {
      'locked': 'Gesperrt',
      'available': 'Verfügbar',
      'in_progress': 'In Bearbeitung',
      'completed': 'Abgeschlossen',
      'failed': 'Fehlgeschlagen',
      'super_locked': 'Gesperrt',
      'super_available': 'Super Challenge',
      'super_in_progress': 'Super Challenge',
      'super_completed': 'Super Abgeschlossen',
      'super_failed': 'Abgeschlossen'
    }[challenge.state];
    
    // Create challenge row
    const challengeRow = document.createElement('div');
    challengeRow.className = `challenge-row ${positionClass} challenge-${challenge.state}`;
    challengeRow.dataset.index = index;
    
    // Create node container with splash effect
    const nodeContainer = document.createElement('div');
    nodeContainer.className = 'challenge-node-container';
    
    // Create splash effect (12 rays for comic-style effect)
    const splash = document.createElement('div');
    splash.className = 'challenge-splash';
    const numRays = 12;
    // Use appropriate scale value based on challenge type
    const isSuperChallenge = challenge.isSuperChallenge;
    const scale = isSuperChallenge ? VISUAL_CONFIG.SUPER_CHALLENGE_SCALE : VISUAL_CONFIG.STANDARD_CHALLENGE_SCALE;
    const baseLength = Math.round(scale / 5); // Ray length is 1/5th of scale for proper proportions
    
    // Set splash container size
    const containerSize = scale;
    splash.style.width = `${containerSize}px`;
    splash.style.height = `${containerSize}px`;
    
    for (let i = 0; i < numRays; i++) {
      const ray = document.createElement('div');
      ray.className = 'splash-ray';
      const angle = (i * 360 / numRays);
      // Use deterministic length based on ray index for consistent appearance
      const length = baseLength + ((i % 3) * 6);
      ray.style.transform = `translate(-50%, 0) rotate(${angle}deg)`;
      ray.style.height = `${length}px`;
      splash.appendChild(ray);
    }
    nodeContainer.appendChild(splash);
    
    // Add background graphic for completed challenges (regular and super)
    if (challenge.state === 'completed' || challenge.state === 'super_completed') {
      const bgGraphic = document.createElement('div');
      bgGraphic.className = 'challenge-bg-graphic';
      
      // Use appropriate scale value based on challenge type
      const isSuperChallenge = challenge.isSuperChallenge;
      const size = isSuperChallenge 
        ? VISUAL_CONFIG.SUPER_CHALLENGE_SCALE 
        : VISUAL_CONFIG.STANDARD_CHALLENGE_SCALE;
      bgGraphic.style.width = `${size}px`;
      bgGraphic.style.height = `${size}px`;
      
      // Select graphic using circular selection to ensure variety
      // Use modulo to cycle through graphics and add 1 to avoid same as last used
      const graphicIndex = (lastUsedGraphicIndex + 1 + Math.floor(Math.random() * (celebrationGraphics.length - 1))) % celebrationGraphics.length;
      lastUsedGraphicIndex = graphicIndex;
      
      const img = document.createElement('img');
      img.src = `./assets/${celebrationGraphics[graphicIndex]}`;
      img.alt = '';
      img.setAttribute('aria-hidden', 'true');
      bgGraphic.appendChild(img);
      
      // Only animate the newly completed challenge (not previously completed ones)
      // Add delay so animation plays after auto-scrolling is complete
      if (shouldAnimateBackground && index === justCompletedChallengeIndex) {
        setTimeout(() => {
          bgGraphic.classList.add('challenge-bg-animate');
        }, VISUAL_CONFIG.CELEBRATION_ANIMATION_DELAY);
      }
      
      nodeContainer.appendChild(bgGraphic);
    }
    
    // Create gradient wrapper for the node
    const nodeWrapper = document.createElement('div');
    nodeWrapper.className = 'challenge-node-wrapper';
    
    // Create the circular node
    const node = document.createElement('div');
    node.className = 'challenge-node';
    
    // Create icon span for potential grayscale filter on locked challenges
    const iconSpan = document.createElement('span');
    iconSpan.className = 'node-icon';
    iconSpan.innerHTML = challenge.icon;
    node.appendChild(iconSpan);
    
    // Add status icon based on state
    if (challenge.state === 'completed') {
      const statusIcon = document.createElement('span');
      statusIcon.className = 'status-icon';
      statusIcon.innerHTML = '⭐';
      node.appendChild(statusIcon);
    } else if (challenge.state === 'super_completed') {
      const statusIcon = document.createElement('span');
      statusIcon.className = 'status-icon';
      // Show diamond if super challenge was successful, otherwise star
      statusIcon.innerHTML = challenge.superChallengeResult === 'success' ? '💎' : '⭐';
      node.appendChild(statusIcon);
    } else if (challenge.state === 'locked' || challenge.state === 'super_locked') {
      const statusIcon = document.createElement('span');
      statusIcon.className = 'status-icon';
      statusIcon.innerHTML = '🔒';
      node.appendChild(statusIcon);
    }
    
    nodeWrapper.appendChild(node);
    nodeContainer.appendChild(nodeWrapper);
    
    // Create info card
    const infoCard = document.createElement('div');
    infoCard.className = 'challenge-info-card';
    infoCard.innerHTML = `
      <h3>${challenge.name}</h3>
      <p class="challenge-status">${statusText}</p>
    `;
    
    // Append elements in correct order based on position
    challengeRow.appendChild(nodeContainer);
    challengeRow.appendChild(infoCard);
    
    // Add click handler for available challenges (regular and super)
    if (challenge.state === 'available' || challenge.state === 'in_progress' ||
        challenge.state === 'super_available' || challenge.state === 'super_in_progress') {
      nodeContainer.style.cursor = 'pointer';
      nodeContainer.addEventListener('click', () => {
        // Play UI click sound
        playButtonTap();
        
        if (challenge.isSuperChallenge && 
            (challenge.state === 'super_available' || challenge.state === 'available')) {
          // Show super challenge popup before starting
          showSuperChallengeStartPopup(index);
        } else {
          showScreen('taskScreen', index);
        }
      });
    }
    
    challengesList.appendChild(challengeRow);
    
    // Store position info for path calculation
    nodePositions.push({
      index,
      isLeft: isLeftPosition
    });
  });
  
  challengesMap.appendChild(svg);
  challengesMap.appendChild(challengesList);
  
  // Create reward button section
  const rewardSection = document.createElement('div');
  rewardSection.className = 'reward-section';
  
  const allCompleted = areAllChallengesCompleted();
  const rewardButton = document.createElement('button');
  rewardButton.id = 'reward-button';
  rewardButton.className = allCompleted ? 'reward-button active' : 'reward-button disabled';
  rewardButton.innerHTML = `<span class="reward-diamond-icon ${allCompleted ? '' : 'shake-periodic'}">💎</span> Belohnung abholen`;
  rewardButton.disabled = !allCompleted;
  
  if (allCompleted) {
    rewardButton.addEventListener('click', () => {
      showRewardPopup();
    });
  }
  
  rewardSection.appendChild(rewardButton);
  
  // Create footer with version
  const footer = document.createElement('div');
  footer.className = 'challenges-footer';
  footer.innerHTML = `v${VERSION.string}`;
  
  challengesContainer.appendChild(header);
  challengesContainer.appendChild(pageTitle);
  challengesContainer.appendChild(challengesMap);
  challengesContainer.appendChild(rewardSection);
  challengesContainer.appendChild(footer);
  
  container.appendChild(challengesContainer);
  
  // Add click handler for Zeit-Challenge node after DOM is rendered
  const zeitNodeContainer = document.getElementById('zeit-node-container');
  if (zeitNodeContainer && zeitChallenge && zeitChallenge.spawned) {
    const isZeitCompleted = zeitChallenge.state === ZEIT_CHALLENGE_STATE.COMPLETED;
    
    if (!isZeitCompleted) {
      zeitNodeContainer.addEventListener('click', () => {
        playButtonTap();
        showZeitChallengeStartPopup();
      });
    }
  }
  
  // Add click handler for Kopfnuss node after DOM is rendered
  const kopfnussNodeContainer = document.getElementById('kopfnuss-node-container');
  if (kopfnussNodeContainer && kopfnussChallenge && kopfnussChallenge.spawned) {
    const isKopfnussCompleted = kopfnussChallenge.state === KOPFNUSS_STATE.COMPLETED;
    
    if (!isKopfnussCompleted) {
      kopfnussNodeContainer.addEventListener('click', () => {
        playButtonTap();
        showKopfnussChallengeStartPopup();
      });
    }
  }
  
  // Draw SVG paths after DOM is rendered
  requestAnimationFrame(() => {
    // Check if elements still exist in the DOM before drawing
    if (document.body.contains(svg) && document.body.contains(challengesList)) {
      drawConnectionPaths(svg, challengesList, nodePositions);
    }
  });
  
  // Auto-scroll logic: scroll to current unlocked challenge OR reward button if all completed
  const hasCelebrationPopup = document.querySelector('.popup-overlay');
  if (!hasCelebrationPopup) {
    if (allCompleted) {
      // All challenges completed - scroll to reward button with sparkle effect
      scrollToAndHighlightRewardButton();
    } else {
      // Find the current unlocked challenge and scroll to it
      const unlockedIndex = findCurrentUnlockedChallengeIndex(challenges);
      if (unlockedIndex >= 0) {
        scrollToAndHighlightChallenge(unlockedIndex);
      }
    }
  }
  // If popup exists, the scroll will happen when popup closes (handled in popup close handlers)
}

/**
 * Draw SVG connection paths between challenge nodes
 * @param {SVGElement} svg - The SVG element
 * @param {HTMLElement} challengesList - The challenges list container
 * @param {Array} nodePositions - Array of node position info
 */
function drawConnectionPaths(svg, challengesList, nodePositions) {
  try {
    const rows = challengesList.querySelectorAll('.challenge-row');
    if (rows.length < 2) return;
    
    // Get container dimensions
    const containerRect = challengesList.getBoundingClientRect();
    if (containerRect.height === 0) return; // Element not visible
    
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', containerRect.height + 'px');
    svg.style.height = containerRect.height + 'px';
    
    const svgNS = 'http://www.w3.org/2000/svg';
    
    // Draw paths between consecutive nodes
    for (let i = 0; i < rows.length - 1; i++) {
      const currentRow = rows[i];
      const nextRow = rows[i + 1];
      
      const currentNode = currentRow.querySelector('.challenge-node');
      const nextNode = nextRow.querySelector('.challenge-node');
      
      if (!currentNode || !nextNode) continue;
      
      const currentRect = currentNode.getBoundingClientRect();
      const nextRect = nextNode.getBoundingClientRect();
      
      // Calculate positions relative to container
      const x1 = currentRect.left + currentRect.width / 2 - containerRect.left;
      const y1 = currentRect.top + currentRect.height / 2 - containerRect.top;
      const x2 = nextRect.left + nextRect.width / 2 - containerRect.left;
      const y2 = nextRect.top + nextRect.height / 2 - containerRect.top;
      
      // Control points for quadratic bezier curve
      const midY = (y1 + y2) / 2;
      const controlX = (x1 + x2) / 2;
      
      // Create path
      const path = document.createElementNS(svgNS, 'path');
      path.setAttribute('class', 'path-line');
      path.setAttribute('d', `M ${x1} ${y1} Q ${controlX} ${midY} ${x2} ${y2}`);
      svg.appendChild(path);
    }
  } catch (error) {
    console.error('Error drawing connection paths:', error);
  }
}

/**
 * Load task screen
 * @param {HTMLElement} container - Container element
 * @param {number} challengeIndex - Index of challenge
 */
async function loadTaskScreen(container, challengeIndex) {
  // Update app height when entering task screen to ensure proper sizing
  setAppHeight();
  
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
          <input type="number" id="task-input" inputmode="numeric" pattern="[0-9]*" placeholder="Deine Antwort" aria-label="Deine Antwort für die Rechenaufgabe">
          <button id="submit-answer">Prüfen</button>
        </div>
        <div class="task-feedback" id="task-feedback"></div>
      </div>
      <div class="task-screen-footer">v${VERSION.string}</div>
    </div>
  `;
  
  // Add event listener for back button with confirmation
  const backButton = document.getElementById('back-button');
  backButton.addEventListener('click', () => {
    showTaskExitConfirmationPopup(() => {
      // Stop super challenge sparkles if running
      stopSuperChallengeSparkles();
      showScreen('challenges');
    }, 'standard');
  });
  
  // Initialize task screen controller
  try {
    const { initTaskScreen } = await import('./logic/taskScreenController.js');
    initTaskScreen(challengeIndex);
  } catch (error) {
    console.error('Error loading task screen controller:', error);
  }
}

/**
 * Load Kopfnuss Challenge task screen
 * @param {HTMLElement} container - Container element
 */
async function loadKopfnussTaskScreen(container) {
  // Update app height when entering task screen to ensure proper sizing
  setAppHeight();
  
  container.innerHTML = `
    <div class="task-screen" id="task-screen-content">
      <div class="task-screen-main">
        <div class="task-header" style="background: linear-gradient(135deg, #FFF8DC 0%, #FFFACD 100%); border: 2px solid #DAA520;">
          <button id="back-button" aria-label="Zurück">←</button>
          <h2 style="color: #8B4513;">🤔 Kopfnuss-Challenge</h2>
          <div class="task-header-spacer"></div>
        </div>
        <div class="task-progress" id="task-progress"></div>
        <div class="task-content">
          <div class="task-question" id="task-question"></div>
          <input type="number" id="task-input" inputmode="numeric" pattern="[0-9]*" placeholder="Deine Antwort" aria-label="Deine Antwort für die Rechenaufgabe">
          <button id="submit-answer">Prüfen</button>
        </div>
        <div class="task-feedback" id="task-feedback"></div>
      </div>
      <div class="task-screen-footer">v${VERSION.string}</div>
    </div>
  `;
  
  // Add event listener for back button with confirmation
  const backButton = document.getElementById('back-button');
  backButton.addEventListener('click', () => {
    showTaskExitConfirmationPopup(() => {
      showScreen('challenges');
    }, 'kopfnuss');
  });
  
  // Initialize Kopfnuss task screen controller
  try {
    const { initKopfnussTaskScreen } = await import('./logic/kopfnussTaskController.js');
    initKopfnussTaskScreen();
  } catch (error) {
    console.error('Error loading Kopfnuss task screen controller:', error);
  }
}

/**
 * Load Zeit-Challenge task screen
 * @param {HTMLElement} container - Container element
 */
async function loadZeitChallengeTaskScreen(container) {
  // Update app height when entering task screen to ensure proper sizing
  setAppHeight();
  
  const timeLimitSeconds = CONFIG.ZEIT_CHALLENGE_TIME_LIMIT_SECONDS || 120;
  const timeLimitMinutes = Math.floor(timeLimitSeconds / 60);
  const timeLimitRemainingSeconds = timeLimitSeconds % 60;
  const formattedTime = `${timeLimitMinutes}:${timeLimitRemainingSeconds.toString().padStart(2, '0')}`;
  
  container.innerHTML = `
    <div class="task-screen" id="task-screen-content">
      <div class="task-screen-main">
        <div class="task-header zeit-challenge-header" style="background: linear-gradient(135deg, #E0F7FA 0%, #B2EBF2 100%); border: 2px solid #00ACC1;">
          <button id="back-button" aria-label="Zurück">←</button>
          <h2 style="color: #006064;">⏱️ Zeit-Challenge</h2>
          <div class="zeit-timer-container">
            <span id="zeit-timer" class="zeit-timer">${formattedTime}</span>
          </div>
        </div>
        <div class="task-progress" id="task-progress"></div>
        <div class="task-content">
          <div class="task-question" id="task-question"></div>
          <input type="number" id="task-input" inputmode="numeric" pattern="[0-9]*" placeholder="Deine Antwort" aria-label="Deine Antwort für die Rechenaufgabe">
          <button id="submit-answer">Prüfen</button>
        </div>
        <div class="task-feedback" id="task-feedback"></div>
      </div>
      <div class="task-screen-footer">v${VERSION.string}</div>
    </div>
  `;
  
  // Add event listener for back button with confirmation
  const backButton = document.getElementById('back-button');
  backButton.addEventListener('click', () => {
    showTaskExitConfirmationPopup(() => {
      // Cleanup timer before leaving
      import('./logic/zeitChallengeTaskController.js').then(module => {
        if (module.cleanupZeitChallengeTaskScreen) {
          module.cleanupZeitChallengeTaskScreen();
        }
      });
      showScreen('challenges');
    }, 'zeit');
  });
  
  // Initialize Zeit-Challenge task screen controller
  try {
    const { initZeitChallengeTaskScreen } = await import('./logic/zeitChallengeTaskController.js');
    initZeitChallengeTaskScreen();
  } catch (error) {
    console.error('Error loading Zeit-Challenge task screen controller:', error);
  }
}

/**
 * Load stats screen
 * @param {HTMLElement} container - Container element
 */
function loadStatsScreen(container) {
  container.innerHTML = `
    <div class="stats-screen">
      <h1>Statistiken</h1>
      <p>Statistiken werden hier angezeigt</p>
    </div>
  `;
}

/**
 * Show reward popup with celebration effect
 * Awards 1 diamond and allows generating new challenges
 */
function showRewardPopup() {
  // Create popup overlay
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay reward-popup-overlay';
  overlay.id = 'reward-popup-overlay';
  
  // Create popup card
  const popupCard = document.createElement('div');
  popupCard.className = 'popup-card reward-popup-card';
  
  popupCard.innerHTML = `
    <div class="reward-celebration">🎉</div>
    <h2>Glückwunsch!</h2>
    <div class="reward-diamond-display">
      <span class="reward-diamond-icon">💎</span>
      <span class="reward-diamond-text">+1 Diamant</span>
    </div>
    <p>Du hast alle Herausforderungen gemeistert!</p>
    <button id="new-challenge-button" class="btn-primary">Neue Herausforderung</button>
  `;
  
  overlay.appendChild(popupCard);
  document.body.appendChild(overlay);
  
  // Add confetti effect
  createConfettiEffect();
  
  // Add event listener for new challenge button
  const newChallengeButton = document.getElementById('new-challenge-button');
  newChallengeButton.addEventListener('click', () => {
    // Play diamond earn sound
    playDiamondEarn();
    
    // Award the diamond when user confirms
    addDiamonds(1);
    
    // Close popup
    closeRewardPopup();
    
    // Generate new challenges
    resetChallenges();
    
    // Refresh challenges screen
    showScreen('challenges');
  });
}

/**
 * Close the reward popup
 */
function closeRewardPopup() {
  closePopup('reward-popup-overlay', true);
}

/**
 * Show diamond celebration popup when player earns diamonds from task completion
 * @param {number} diamondsAwarded - Number of diamonds awarded
 * @param {number} tasksPerDiamond - Number of tasks needed to earn one diamond
 * @param {Function} onClose - Optional callback to run after popup closes
 */
function showDiamondCelebrationPopup(diamondsAwarded, tasksPerDiamond, onClose = null) {
  // Create popup overlay
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay reward-popup-overlay';
  overlay.id = 'diamond-celebration-popup-overlay';
  
  // Create popup card
  const popupCard = document.createElement('div');
  popupCard.className = 'popup-card reward-popup-card';
  
  // Create message based on number of diamonds awarded
  const diamondText = diamondsAwarded === 1 
    ? `+1 Diamant` 
    : `+${diamondsAwarded} Diamanten`;
  
  // Create description based on number of diamonds awarded
  const descriptionText = diamondsAwarded === 1
    ? `Du hast ${tasksPerDiamond} Aufgaben gelöst und dafür einen Diamanten erhalten!`
    : `Du hast ${tasksPerDiamond * diamondsAwarded} Aufgaben gelöst und dafür ${diamondsAwarded} Diamanten erhalten!`;
  
  popupCard.innerHTML = `
    <div class="reward-celebration">🎉</div>
    <h2>Glückwunsch!</h2>
    <div class="reward-diamond-display">
      <span class="reward-diamond-icon">💎</span>
      <span class="reward-diamond-text">${diamondText}</span>
    </div>
    <p>${descriptionText}</p>
    <button id="diamond-celebration-close-button" class="btn-primary">Belohnung abholen</button>
  `;
  
  overlay.appendChild(popupCard);
  document.body.appendChild(overlay);
  
  // Add confetti effect
  createConfettiEffect();
  
  // Add event listener for close button
  const closeButton = document.getElementById('diamond-celebration-close-button');
  closeButton.addEventListener('click', () => {
    // Play diamond earn sound
    playDiamondEarn();
    
    closeDiamondCelebrationPopup();
    // Call onClose callback if provided (for sequential popups)
    if (onClose && typeof onClose === 'function') {
      onClose();
    }
  });
}

/**
 * Close the diamond celebration popup
 */
function closeDiamondCelebrationPopup() {
  closePopup('diamond-celebration-popup-overlay', true);
}

/**
 * Show streak celebration popup when player achieves a new streak milestone
 * @param {number} streakCount - Current streak count
 * @param {Function} onClose - Optional callback to run after popup closes
 */
function showStreakCelebrationPopup(streakCount, onClose = null) {
  // Create popup overlay
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay reward-popup-overlay';
  overlay.id = 'streak-celebration-popup-overlay';
  
  // Create popup card
  const popupCard = document.createElement('div');
  popupCard.className = 'popup-card reward-popup-card';
  
  // Create message based on streak count
  const streakText = streakCount === 1 
    ? `Tag 1` 
    : `${streakCount} Tage`;
  
  // Create description text
  const descriptionText = streakCount === 1
    ? `Du hast deinen ersten Streak-Tag erreicht! Mach morgen weiter!`
    : `Du hast ${streakCount} Tage in Folge geübt! Weiter so!`;
  
  popupCard.innerHTML = `
    <div class="reward-celebration">🎉</div>
    <h2>Neuer Streak!</h2>
    <div class="reward-streak-display">
      <span class="reward-streak-icon">🔥</span>
      <span class="reward-streak-text">${streakText}</span>
    </div>
    <p>${descriptionText}</p>
    <button id="streak-celebration-close-button" class="btn-primary">Super!</button>
  `;
  
  overlay.appendChild(popupCard);
  document.body.appendChild(overlay);
  
  // Add confetti effect
  createConfettiEffect();
  
  // Add event listener for close button
  const closeButton = document.getElementById('streak-celebration-close-button');
  closeButton.addEventListener('click', () => {
    closeStreakCelebrationPopup();
    // Call onClose callback if provided (for sequential popups)
    if (onClose && typeof onClose === 'function') {
      onClose();
    }
  });
}

/**
 * Close the streak celebration popup
 */
function closeStreakCelebrationPopup() {
  closePopup('streak-celebration-popup-overlay', true);
}

/**
 * Show background unlock celebration popup when player reaches enough tasks
 * to unlock a new background for purchase
 * @param {Object} background - The newly purchasable background object
 * @param {Function} onClose - Optional callback to run after popup closes
 */
function showBackgroundUnlockCelebrationPopup(background, onClose = null) {
  // Create popup overlay
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay reward-popup-overlay background-unlock-celebration-overlay';
  overlay.id = 'background-unlock-celebration-popup-overlay';
  
  // Create popup card
  const popupCard = document.createElement('div');
  popupCard.className = 'popup-card reward-popup-card background-unlock-celebration-card';
  
  popupCard.innerHTML = `
    <div class="reward-celebration">🎉</div>
    <h2>Neuer Hintergrund verfügbar!</h2>
    <div class="background-unlock-preview-container">
      <img src="./assets/${background.file}" alt="${background.name}" class="background-unlock-preview">
    </div>
    <p class="background-unlock-name"><strong>${background.name}</strong></p>
    <p>Du kannst diesen Hintergrund jetzt im Shop kaufen!</p>
    <button id="background-unlock-celebration-close-button" class="btn-primary">Super!</button>
  `;
  
  overlay.appendChild(popupCard);
  document.body.appendChild(overlay);
  
  // Add confetti effect
  createConfettiEffect();
  
  // Add event listener for close button
  const closeButton = document.getElementById('background-unlock-celebration-close-button');
  closeButton.addEventListener('click', () => {
    closeBackgroundUnlockCelebrationPopup();
    // Call onClose callback if provided (for sequential popups)
    if (onClose && typeof onClose === 'function') {
      onClose();
    }
    processPopupQueue();
  });
}

/**
 * Close the background unlock celebration popup
 */
function closeBackgroundUnlockCelebrationPopup() {
  closePopup('background-unlock-celebration-popup-overlay', true);
}

/**
 * Show seasonal background unlock celebration popup
 * Displayed when a seasonal background becomes purchasable (task requirement met)
 * @param {Object} background - The seasonal background that became purchasable
 * @param {Function} onClose - Callback when popup closes
 */
function showSeasonalBackgroundUnlockCelebrationPopup(background, onClose = null) {
  // Create popup overlay
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay reward-popup-overlay background-unlock-celebration-overlay';
  overlay.id = 'seasonal-background-unlock-celebration-popup-overlay';
  
  // Create popup card
  const popupCard = document.createElement('div');
  popupCard.className = 'popup-card reward-popup-card background-unlock-celebration-card seasonal-unlock-card';
  
  popupCard.innerHTML = `
    <div class="reward-celebration">${background.eventEmoticon}</div>
    <h2>Saisonaler Hintergrund verfügbar!</h2>
    <div class="background-unlock-preview-container">
      <img src="./assets/${background.file}" alt="${background.name}" class="background-unlock-preview">
    </div>
    <p class="background-unlock-name"><strong>${background.name}</strong></p>
    <p>Du kannst diesen Hintergrund jetzt im Shop für ${background.eventEmoticon} kaufen!</p>
    <button id="seasonal-background-unlock-celebration-close-button" class="btn-primary btn-event">Super!</button>
  `;
  
  overlay.appendChild(popupCard);
  document.body.appendChild(overlay);
  
  // Add confetti effect
  createConfettiEffect();
  
  // Add event listener for close button
  const closeButton = document.getElementById('seasonal-background-unlock-celebration-close-button');
  closeButton.addEventListener('click', () => {
    closeSeasonalBackgroundUnlockCelebrationPopup();
    // Call onClose callback if provided (for sequential popups)
    if (onClose && typeof onClose === 'function') {
      onClose();
    }
    processPopupQueue();
  });
}

/**
 * Close the seasonal background unlock celebration popup
 */
function closeSeasonalBackgroundUnlockCelebrationPopup() {
  closePopup('seasonal-background-unlock-celebration-popup-overlay', true);
}

/**
 * Show frozen streak information popup
 * Displayed when app opens and streak is frozen
 * @param {number} currentStreak - Current streak count
 * @param {Function} onClose - Callback when popup closes
 */
function showFrozenStreakPopup(currentStreak, onClose = null) {
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay streak-popup-overlay';
  overlay.id = 'frozen-streak-popup-overlay';
  
  const popupCard = document.createElement('div');
  popupCard.className = 'popup-card streak-popup-card';
  
  popupCard.innerHTML = `
    <div class="streak-popup-icon frozen-icon">🥶</div>
    <h2>Dein Streak ist eingefroren!</h2>
    <div class="streak-info-display frozen">
      <span class="streak-frozen-icon">🧊</span>
      <span class="streak-count">${currentStreak} Tage</span>
    </div>
    <p>Du hast gestern keine Challenge gemacht.</p>
    <p class="streak-hint">Schließe eine Challenge ab, um deinen Streak aufzutauen!</p>
    <button id="frozen-streak-close-button" class="btn-primary">Zeit zum Auftauen!</button>
  `;
  
  overlay.appendChild(popupCard);
  document.body.appendChild(overlay);
  
  const closeButton = document.getElementById('frozen-streak-close-button');
  closeButton.addEventListener('click', () => {
    overlay.remove();
    markStreakStatusHandled();
    if (onClose && typeof onClose === 'function') {
      onClose();
    }
    processPopupQueue();
  });
}

/**
 * Show streak unfrozen success popup
 * Displayed when player completes a challenge that unfreezes the streak
 * @param {number} newStreak - New streak count after unfreezing
 * @param {Function} onClose - Callback when popup closes
 */
function showStreakUnfrozenPopup(newStreak, onClose = null) {
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay streak-popup-overlay';
  overlay.id = 'streak-unfrozen-popup-overlay';
  
  const popupCard = document.createElement('div');
  popupCard.className = 'popup-card streak-popup-card';
  
  popupCard.innerHTML = `
    <div class="streak-popup-icon">🔥</div>
    <h2>Streak aufgetaut!</h2>
    <div class="streak-info-display active">
      <span class="streak-fire-icon">🔥</span>
      <span class="streak-count">${newStreak} Tage</span>
    </div>
    <p>Du hast eine Challenge abgeschlossen und deinen Streak gerettet!</p>
    <button id="streak-unfrozen-close-button" class="btn-primary">Super!</button>
  `;
  
  overlay.appendChild(popupCard);
  document.body.appendChild(overlay);
  
  createConfettiEffect();
  
  const closeButton = document.getElementById('streak-unfrozen-close-button');
  closeButton.addEventListener('click', () => {
    overlay.remove();
    const confettiPieces = document.querySelectorAll('.confetti-piece');
    confettiPieces.forEach(piece => piece.remove());
    if (onClose && typeof onClose === 'function') {
      onClose();
    }
    processPopupQueue();
  });
}

/**
 * Show streak restorable popup (2-day gap)
 * Player can pay 1 diamond to restore streak
 * @param {number} previousStreak - Streak count before it was lost
 * @param {Function} onClose - Callback when popup closes
 */
function showStreakRestorablePopup(previousStreak, onClose = null) {
  const diamonds = loadDiamonds();
  const hasDiamond = diamonds >= CONFIG.STREAK_RESCUE_COST;
  
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay streak-popup-overlay';
  overlay.id = 'streak-restorable-popup-overlay';
  
  const popupCard = document.createElement('div');
  popupCard.className = 'popup-card streak-popup-card';
  
  let buttonHtml, extraText;
  if (hasDiamond) {
    buttonHtml = `<button id="restore-streak-button" class="btn-primary">-1💎 Streak zurückholen</button>`;
    extraText = '';
  } else {
    buttonHtml = `<button id="restore-streak-button" class="btn-primary">Ich schaffe das!</button>`;
    extraText = `<p class="no-diamond-text">Du hast keinen Diamanten. Starte einen neuen Streak!</p>`;
  }
  
  popupCard.innerHTML = `
    <div class="streak-popup-icon lost-icon">😢</div>
    <h2>Streak verloren!</h2>
    <div class="streak-info-display lost">
      <span class="streak-lost-icon">💔</span>
      <span class="streak-count">${previousStreak} Tage</span>
    </div>
    <p>Du hast 2 Tage keine Challenge gemacht.</p>
    ${hasDiamond ? '<p class="streak-hint">Hole deinen Streak mit einem Diamanten zurück!</p>' : ''}
    ${extraText}
    ${buttonHtml}
  `;
  
  overlay.appendChild(popupCard);
  document.body.appendChild(overlay);
  
  const restoreButton = document.getElementById('restore-streak-button');
  restoreButton.addEventListener('click', () => {
    if (hasDiamond) {
      const result = restoreExpiredStreak();
      if (result.success) {
        overlay.remove();
        markStreakStatusHandled();
        // Show success feedback
        showStreakRestoredSuccessPopup(result.newStreak, onClose);
      }
    } else {
      // Accept loss and start fresh
      acceptStreakLoss();
      // Update header UI to show streak = 0
      updateHeaderStreakDisplay(0, false);
      overlay.remove();
      markStreakStatusHandled();
      if (onClose && typeof onClose === 'function') {
        onClose();
      }
      processPopupQueue();
    }
  });
}

/**
 * Show streak restored success popup
 * @param {number} newStreak - New streak count after restoration
 * @param {Function} onClose - Callback when popup closes
 */
function showStreakRestoredSuccessPopup(newStreak, onClose = null) {
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay streak-popup-overlay';
  overlay.id = 'streak-restored-popup-overlay';
  
  const popupCard = document.createElement('div');
  popupCard.className = 'popup-card streak-popup-card';
  
  popupCard.innerHTML = `
    <div class="streak-popup-icon">🎉</div>
    <h2>Streak gerettet!</h2>
    <div class="streak-info-display active">
      <span class="streak-fire-icon">🔥</span>
      <span class="streak-count">${newStreak} Tage</span>
    </div>
    <p>Dein Streak ist wieder aktiv!</p>
    <button id="streak-restored-close-button" class="btn-primary">Weiter!</button>
  `;
  
  overlay.appendChild(popupCard);
  document.body.appendChild(overlay);
  
  createConfettiEffect();
  
  // Update header UI with new streak and diamonds
  updateHeaderStreakDisplay(newStreak, false);
  const diamondDisplay = document.querySelector('.header-stats .stat-capsule:last-child .stat-value');
  if (diamondDisplay) {
    diamondDisplay.textContent = loadDiamonds();
  }
  
  const closeButton = document.getElementById('streak-restored-close-button');
  closeButton.addEventListener('click', () => {
    overlay.remove();
    const confettiPieces = document.querySelectorAll('.confetti-piece');
    confettiPieces.forEach(piece => piece.remove());
    if (onClose && typeof onClose === 'function') {
      onClose();
    }
    processPopupQueue();
  });
}

/**
 * Show streak permanently lost popup (3+ days gap)
 * @param {number} previousStreak - Streak count before it was lost
 * @param {Function} onClose - Callback when popup closes
 */
function showStreakLostPopup(previousStreak, onClose = null) {
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay streak-popup-overlay';
  overlay.id = 'streak-lost-popup-overlay';
  
  const popupCard = document.createElement('div');
  popupCard.className = 'popup-card streak-popup-card';
  
  popupCard.innerHTML = `
    <div class="streak-popup-icon lost-icon">😞</div>
    <h2>Streak verloren!</h2>
    <div class="streak-info-display lost">
      <span class="streak-lost-icon">💔</span>
      <span class="streak-count">${previousStreak} Tage</span>
    </div>
    <p>Du hast 3 oder mehr Tage pausiert.</p>
    <p class="streak-hint">Der Streak kann nicht wiederhergestellt werden.</p>
    <p class="motivation-text">🚀 Rocke den nächsten Streak!</p>
    <button id="streak-lost-close-button" class="btn-primary">Ich schaffe das!</button>
  `;
  
  overlay.appendChild(popupCard);
  document.body.appendChild(overlay);
  
  const closeButton = document.getElementById('streak-lost-close-button');
  closeButton.addEventListener('click', () => {
    acceptStreakLoss();
    // Update header UI to show streak = 0
    updateHeaderStreakDisplay(0, false);
    overlay.remove();
    markStreakStatusHandled();
    if (onClose && typeof onClose === 'function') {
      onClose();
    }
    processPopupQueue();
  });
}

/**
 * Show streak popup based on status
 * @param {Object} streakStatus - Status object from checkStreakStatusOnLoad
 * @param {Function} onClose - Optional callback when popup closes
 */
function showStreakPopupForStatus(streakStatus, onClose = null) {
  if (!streakStatus.showPopup) {
    if (onClose) onClose();
    return;
  }
  
  switch (streakStatus.lossReason) {
    case STREAK_LOSS_REASON.FROZEN:
      queuePopup(() => showFrozenStreakPopup(streakStatus.previousStreak, onClose));
      break;
    case STREAK_LOSS_REASON.EXPIRED_RESTORABLE:
      queuePopup(() => showStreakRestorablePopup(streakStatus.previousStreak, onClose));
      break;
    case STREAK_LOSS_REASON.EXPIRED_PERMANENT:
      queuePopup(() => showStreakLostPopup(streakStatus.previousStreak, onClose));
      break;
    default:
      if (onClose) onClose();
  }
}

/**
 * Check and show appropriate streak popup on app load
 * @param {Function} onAllPopupsClosed - Callback when all popups are closed
 */
function checkAndShowStreakPopups(onAllPopupsClosed = null) {
  // Skip if already handled today
  if (wasStreakStatusHandledToday()) {
    if (onAllPopupsClosed) onAllPopupsClosed();
    return;
  }
  
  const streakStatus = checkStreakStatusOnLoad();
  showStreakPopupForStatus(streakStatus, onAllPopupsClosed);
}

/**
 * Notify that streak was unfrozen by completing a challenge
 * This sets a flag that will trigger the unfreeze popup when returning to challenges screen
 * @param {number} newStreak - New streak count after unfreezing
 */
export function notifyStreakUnfrozen(newStreak) {
  streakWasUnfrozen = newStreak;
}

/**
 * Notify that streak was incremented by completing a challenge
 * This sets a flag that will trigger the streak celebration popup when returning to challenges screen
 * @param {number} newStreak - New streak count after incrementing
 */
export function notifyStreakIncremented(newStreak) {
  streakWasIncremented = newStreak;
}

/**
 * Notify that a streak milestone was reached
 * This sets a flag that will trigger the milestone popup when returning to challenges screen
 */
export function notifyMilestoneReached() {
  milestoneWasReached = true;
}

/**
 * Notify super challenge result
 * This sets a flag that will trigger the appropriate popup when returning to challenges screen
 * @param {boolean} success - Whether the super challenge was completed without errors
 * @param {boolean} awardedDiamond - Whether a diamond was awarded
 * @param {Object|null} seasonalCurrencyAwarded - Seasonal currency info if awarded
 */
export function notifySuperChallengeResult(success, awardedDiamond, seasonalCurrencyAwarded = null) {
  superChallengeResult = { success, awardedDiamond, seasonalCurrencyAwarded };
}

/**
 * Show streak milestone reached popup with reward selection
 * Player can choose between Streak Stone or Diamond
 * @param {Function} onClose - Optional callback when popup closes
 */
function showStreakMilestonePopup(onClose = null) {
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay reward-popup-overlay';
  overlay.id = 'streak-milestone-popup-overlay';
  
  const popupCard = document.createElement('div');
  popupCard.className = 'popup-card reward-popup-card';
  
  const milestoneInfo = getMilestoneInfo();
  const streakStoneReward = CONFIG.STREAK_MILESTONE_REWARD_STREAK_STONES;
  const diamondReward = CONFIG.STREAK_MILESTONE_REWARD_DIAMONDS;
  
  popupCard.innerHTML = `
    <div class="reward-celebration">🏆</div>
    <h2>Streak-Meilenstein erreicht!</h2>
    <p>Du hast einen Streak-Meilenstein erreicht!</p>
    <p class="milestone-choice-text">Wähle deine Belohnung:</p>
    <div class="milestone-rewards-container">
      <button class="milestone-reward-choice" id="choose-streak-stone">
        <div class="milestone-reward-icon">🫧</div>
        <div class="milestone-reward-amount">${streakStoneReward} Streak-Stein${streakStoneReward > 1 ? 'e' : ''}</div>
      </button>
      <button class="milestone-reward-choice" id="choose-diamond">
        <div class="milestone-reward-icon">💎</div>
        <div class="milestone-reward-amount">${diamondReward} Diamant${diamondReward > 1 ? 'en' : ''}</div>
      </button>
    </div>
  `;
  
  overlay.appendChild(popupCard);
  document.body.appendChild(overlay);
  
  // Show confetti
  createConfettiEffect();
  
  // Play reward sound
  playDiamondEarn();
  
  // Handle streak stone choice
  document.getElementById('choose-streak-stone').addEventListener('click', () => {
    awardStreakStones();
    overlay.remove();
    removeConfettiPieces();
    processPopupQueue();
    if (onClose) onClose();
  });
  
  // Handle diamond choice
  document.getElementById('choose-diamond').addEventListener('click', () => {
    addDiamonds(diamondReward);
    overlay.remove();
    removeConfettiPieces();
    processPopupQueue();
    if (onClose) onClose();
  });
}


/**
 * Show super challenge start popup
 * Displayed when player taps a super challenge to explain the rules
 * @param {number} challengeIndex - Index of the challenge to start after popup closes
 */
function showSuperChallengeStartPopup(challengeIndex) {
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay reward-popup-overlay';
  overlay.id = 'super-challenge-start-popup-overlay';
  
  const popupCard = document.createElement('div');
  popupCard.className = 'popup-card super-challenge-popup-card';
  
  // Check if a seasonal event is active to show appropriate reward choice
  const activeEvent = getActiveEvent();
  let rewardHtml;
  if (activeEvent) {
    // Show that player can choose between diamonds or event currency
    rewardHtml = `
      <div class="reward-choice-display" style="display: flex; gap: 8px; align-items: center; justify-content: center;">
        <span style="padding: 6px 12px; background: rgba(255,255,255,0.5); border-radius: 8px;">+1 💎</span>
        <span style="font-weight: bold; color: #9932CC;">oder</span>
        <span style="padding: 6px 12px; background: rgba(255,255,255,0.5); border-radius: 8px;">+1 ${activeEvent.emoticon}</span>
      </div>
    `;
  } else {
    rewardHtml = `<span>+1 💎</span>`;
  }
  
  popupCard.innerHTML = `
    <div class="super-icon">⭐</div>
    <h2>Super Challenge</h2>
    <p class="super-description">Das ist eine besondere Herausforderung!<br>Löse alle Aufgaben ohne Fehler.</p>
    <div class="super-reward-info">
      <span>🎯 Belohnung:</span>
      ${rewardHtml}
    </div>
    <div class="button-group">
      <button id="super-challenge-cancel-button" class="btn-secondary">Gerade nicht</button>
      <button id="super-challenge-start-button" class="btn-primary btn-super-challenge">Das schaff ich!</button>
    </div>
  `;
  
  overlay.appendChild(popupCard);
  document.body.appendChild(overlay);
  
  const startButton = document.getElementById('super-challenge-start-button');
  startButton.addEventListener('click', () => {
    overlay.remove();
    showScreen('taskScreen', challengeIndex);
  });
  
  const cancelButton = document.getElementById('super-challenge-cancel-button');
  cancelButton.addEventListener('click', () => {
    overlay.remove();
  });
}

/**
 * Show super challenge success popup
 * Displayed when player completes a super challenge without errors
 * @param {Object} challengeResult - The super challenge result with seasonalCurrencyAwarded info
 * @param {Function} onClose - Callback when popup closes
 */
function showSuperChallengeSuccessPopup(challengeResult, onClose = null) {
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay reward-popup-overlay';
  overlay.id = 'super-challenge-success-popup-overlay';
  
  const popupCard = document.createElement('div');
  popupCard.className = 'popup-card reward-popup-card super-success-popup-card';
  
  // Check if seasonal currency was marked as pending choice
  const seasonalReward = challengeResult && challengeResult.seasonalCurrencyAwarded;
  const pendingChoice = seasonalReward && seasonalReward.pendingChoice;
  
  let rewardDisplayHtml;
  let buttonsHtml;
  
  if (pendingChoice) {
    // Show choice buttons - player can pick diamonds or seasonal currency
    rewardDisplayHtml = `
      <div class="super-success-display" style="margin-bottom: 12px;">
        <p style="font-size: 13px; color: #9932CC; margin-bottom: 10px;">Wähle deine Belohnung:</p>
        <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
          <button id="super-choose-diamonds" class="reward-choice-btn" style="padding: 10px 16px; font-size: 16px; border: 2px solid #9932CC; border-radius: 10px; background: linear-gradient(135deg, #E8E0F0 0%, #D8BFD8 100%); cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 18px;">💎</span>
            <span>+1</span>
          </button>
          <button id="super-choose-seasonal" class="reward-choice-btn" style="padding: 10px 16px; font-size: 16px; border: 2px solid #9932CC; border-radius: 10px; background: linear-gradient(135deg, #E8E0F0 0%, #D8BFD8 100%); cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 18px;">${seasonalReward.emoticon}</span>
            <span>+1</span>
          </button>
        </div>
      </div>
    `;
    buttonsHtml = ''; // No close button, choices are the buttons
  } else if (seasonalReward && !pendingChoice) {
    // Seasonal currency already chosen/awarded
    rewardDisplayHtml = `
      <div class="super-success-display seasonal-reward">
        <span class="super-success-icon">${seasonalReward.emoticon}</span>
        <span class="super-success-text">+1 ${seasonalReward.currencyNameSingular}</span>
      </div>
    `;
    buttonsHtml = '<button id="super-success-close-button" class="btn-primary btn-super-challenge">Einsammeln</button>';
  } else {
    // Diamond reward
    rewardDisplayHtml = `
      <div class="super-success-display">
        <span class="super-success-icon">💎</span>
        <span class="super-success-text">+1 Diamant</span>
      </div>
    `;
    // Award the diamond only if not seasonal reward and no pending choice
    addDiamonds(1);
    
    // Update diamond display in header if visible
    const diamondDisplay = document.querySelector('.header-stats .stat-capsule:nth-child(2) .stat-value');
    if (diamondDisplay) {
      diamondDisplay.textContent = loadDiamonds();
    }
    buttonsHtml = '<button id="super-success-close-button" class="btn-primary btn-super-challenge">Einsammeln</button>';
  }
  
  popupCard.innerHTML = `
    <div class="reward-celebration">🎉</div>
    <h2>Super Challenge geschafft!</h2>
    ${rewardDisplayHtml}
    <p>Ich hab's gewusst: Du bist SUPER!</p>
    ${buttonsHtml}
  `;
  
  overlay.appendChild(popupCard);
  document.body.appendChild(overlay);
  
  createConfettiEffect();
  
  // Handle choice buttons if pending choice
  if (pendingChoice) {
    const chooseDiamondsBtn = document.getElementById('super-choose-diamonds');
    const chooseSeasonalBtn = document.getElementById('super-choose-seasonal');
    
    if (chooseDiamondsBtn) {
      chooseDiamondsBtn.addEventListener('click', () => {
        // Play currency received sound
        playDiamondEarn();
        
        addDiamonds(1);
        // Update diamond display
        const diamondDisplay = document.querySelector('.header-stats .stat-capsule:nth-child(2) .stat-value');
        if (diamondDisplay) {
          diamondDisplay.textContent = loadDiamonds();
        }
        overlay.remove();
        removeConfettiPieces();
        if (onClose && typeof onClose === 'function') {
          onClose();
        }
        processPopupQueue();
      });
    }
    
    if (chooseSeasonalBtn) {
      chooseSeasonalBtn.addEventListener('click', () => {
        // Play currency received sound
        playDiamondEarn();
        
        addSeasonalCurrency(1);
        overlay.remove();
        removeConfettiPieces();
        if (onClose && typeof onClose === 'function') {
          onClose();
        }
        processPopupQueue();
      });
    }
  } else {
    const closeButton = document.getElementById('super-success-close-button');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        overlay.remove();
        removeConfettiPieces();
        if (onClose && typeof onClose === 'function') {
          onClose();
        }
        processPopupQueue();
      });
    }
  }
}

/**
 * Show super challenge failure popup
 * Displayed when player makes an error during a super challenge
 * @param {Function} onClose - Callback when popup closes
 */
function showSuperChallengeFailurePopup(onClose = null) {
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay reward-popup-overlay';
  overlay.id = 'super-challenge-failure-popup-overlay';
  
  const popupCard = document.createElement('div');
  popupCard.className = 'popup-card reward-popup-card super-failure-popup-card';
  
  popupCard.innerHTML = `
    <div class="reward-celebration">😞</div>
    <h2>Super Challenge nicht geschafft</h2>
    <p>Beim nächsten Mal klappt es bestimmt!</p>
    <button id="super-failure-close-button" class="btn-primary">Nächstes Mal</button>
  `;
  
  overlay.appendChild(popupCard);
  document.body.appendChild(overlay);
  
  const closeButton = document.getElementById('super-failure-close-button');
  closeButton.addEventListener('click', () => {
    overlay.remove();
    if (onClose && typeof onClose === 'function') {
      onClose();
    }
    processPopupQueue();
  });
}

// ============================================
// KOPFNUSS CHALLENGE POPUPS
// ============================================

/**
 * Show Kopfnuss Challenge start confirmation popup
 * Displayed when player taps the Kopfnuss node
 */
function showKopfnussChallengeStartPopup() {
  const diamonds = loadDiamonds();
  const entryCost = CONFIG.KOPFNUSS_ENTRY_COST || 1;
  const rewardAmount = CONFIG.KOPFNUSS_REWARD_AMOUNT || 2;
  const hasDiamond = diamonds >= entryCost;
  
  // Check if a seasonal event is active to show appropriate reward choice
  const activeEvent = getActiveEvent();
  let rewardHtml;
  if (activeEvent) {
    // Show that player can choose between diamonds or event currency
    rewardHtml = `
      <div class="reward-choice-display" style="display: flex; gap: 8px; align-items: center; justify-content: center;">
        <span style="padding: 6px 12px; background: rgba(255,255,255,0.5); border-radius: 8px;">+${rewardAmount} 💎</span>
        <span style="font-weight: bold; color: #8B4513;">oder</span>
        <span style="padding: 6px 12px; background: rgba(255,255,255,0.5); border-radius: 8px;">+${rewardAmount} ${activeEvent.emoticon}</span>
      </div>
    `;
  } else {
    rewardHtml = `<span>+${rewardAmount} 💎</span>`;
  }
  
  if (!hasDiamond) {
    // Show "not enough diamonds" popup
    showKopfnussNotEnoughDiamondsPopup();
    return;
  }
  
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay reward-popup-overlay';
  overlay.id = 'kopfnuss-start-popup-overlay';
  
  const popupCard = document.createElement('div');
  popupCard.className = 'popup-card kopfnuss-popup-card';
  
  popupCard.innerHTML = `
    <div class="kopfnuss-icon">🤔</div>
    <h2>Kopfnuss-Challenge</h2>
    <p class="kopfnuss-description">Kosten: ${entryCost} Diamant. Kannst du sie fehlerfrei knacken?</p>
    <div class="kopfnuss-cost-info">
      <span>💎</span>
      <span>Einsatz: ${entryCost} Diamant</span>
    </div>
    <div class="kopfnuss-reward-info">
      <span>🎯 Belohnung:</span>
      ${rewardHtml}
    </div>
    <button id="kopfnuss-start-button" class="btn-primary btn-kopfnuss">Los geht's! (–${entryCost} 💎)</button>
    <button id="kopfnuss-cancel-button" class="btn-secondary" style="margin-top: 8px;">Abbrechen</button>
  `;
  
  overlay.appendChild(popupCard);
  document.body.appendChild(overlay);
  
  const startButton = document.getElementById('kopfnuss-start-button');
  startButton.addEventListener('click', () => {
    // Spend the diamond
    const spendResult = spendDiamonds(entryCost);
    if (!spendResult.success) {
      overlay.remove();
      showKopfnussNotEnoughDiamondsPopup();
      return;
    }
    
    // Update diamond display in header
    const diamondDisplay = document.querySelector('.header-stats .stat-capsule:nth-child(2) .stat-value');
    if (diamondDisplay) {
      diamondDisplay.textContent = loadDiamonds();
    }
    
    // Start the Kopfnuss Challenge
    startKopfnussChallenge();
    
    overlay.remove();
    showScreen('kopfnussTaskScreen');
  });
  
  const cancelButton = document.getElementById('kopfnuss-cancel-button');
  cancelButton.addEventListener('click', () => {
    overlay.remove();
  });
}

/**
 * Show popup when player doesn't have enough diamonds for Kopfnuss Challenge
 */
function showKopfnussNotEnoughDiamondsPopup() {
  const entryCost = CONFIG.KOPFNUSS_ENTRY_COST || 1;
  
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay';
  overlay.id = 'kopfnuss-no-diamonds-popup-overlay';
  
  const popupCard = document.createElement('div');
  popupCard.className = 'popup-card';
  
  popupCard.innerHTML = `
    <h2>💎 Nicht genug Diamanten</h2>
    <p>Du brauchst ${entryCost} Diamant für die Kopfnuss-Challenge.</p>
    <button id="kopfnuss-no-diamonds-ok-button" class="btn-primary">OK</button>
  `;
  
  overlay.appendChild(popupCard);
  document.body.appendChild(overlay);
  
  const okButton = document.getElementById('kopfnuss-no-diamonds-ok-button');
  okButton.addEventListener('click', () => {
    overlay.remove();
  });
}

/**
 * Show Kopfnuss Challenge success popup
 * @param {Object} rewardInfo - Reward information {isDiamond, amount, emoticon}
 * @param {Function} onClose - Callback when popup closes
 */
function showKopfnussSuccessPopup(rewardInfo, onClose = null) {
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay reward-popup-overlay';
  overlay.id = 'kopfnuss-success-popup-overlay';
  
  const popupCard = document.createElement('div');
  popupCard.className = 'popup-card reward-popup-card kopfnuss-success-popup-card';
  
  let rewardDisplayHtml;
  if (rewardInfo.isDiamond) {
    rewardDisplayHtml = `
      <div class="kopfnuss-success-display">
        <span class="kopfnuss-success-icon">💎</span>
        <span class="kopfnuss-success-text">+${rewardInfo.amount} Diamanten</span>
      </div>
    `;
  } else {
    rewardDisplayHtml = `
      <div class="kopfnuss-success-display">
        <span class="kopfnuss-success-icon">${rewardInfo.emoticon}</span>
        <span class="kopfnuss-success-text">+${rewardInfo.amount}</span>
      </div>
    `;
  }
  
  popupCard.innerHTML = `
    <div class="reward-celebration">💥</div>
    <h2>Kopfnuss geknackt!</h2>
    ${rewardDisplayHtml}
    <p>Unglaublich! Du hast die Kopfnuss geknackt!</p>
    <button id="kopfnuss-success-close-button" class="btn-primary btn-kopfnuss">Einsammeln</button>
  `;
  
  overlay.appendChild(popupCard);
  document.body.appendChild(overlay);
  
  createConfettiEffect();
  
  const closeButton = document.getElementById('kopfnuss-success-close-button');
  closeButton.addEventListener('click', () => {
    overlay.remove();
    removeConfettiPieces();
    if (onClose && typeof onClose === 'function') {
      onClose();
    }
    processPopupQueue();
  });
}

/**
 * Show Kopfnuss Challenge failure popup
 * @param {Function} onClose - Callback when popup closes
 */
function showKopfnussFailurePopup(onClose = null) {
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay reward-popup-overlay';
  overlay.id = 'kopfnuss-failure-popup-overlay';
  
  const popupCard = document.createElement('div');
  popupCard.className = 'popup-card reward-popup-card kopfnuss-failure-popup-card';
  
  popupCard.innerHTML = `
    <div class="reward-celebration">😞</div>
    <h2>Diese Nuss war zu hart!</h2>
    <p>Der Diamant ist weg, aber bald wartet eine neue Chance!</p>
    <button id="kopfnuss-failure-close-button" class="btn-primary">Nächstes Mal</button>
  `;
  
  overlay.appendChild(popupCard);
  document.body.appendChild(overlay);
  
  const closeButton = document.getElementById('kopfnuss-failure-close-button');
  closeButton.addEventListener('click', () => {
    overlay.remove();
    // Reset the Kopfnuss Challenge so it can be replayed
    resetKopfnussChallengeAfterFailure();
    if (onClose && typeof onClose === 'function') {
      onClose();
    }
    processPopupQueue();
  });
}

/**
 * Notify that Kopfnuss Challenge was completed
 * @param {boolean} success - Whether the challenge was completed without errors
 * @param {Object|null} reward - Reward info if successful
 */
export function notifyKopfnussChallengeResult(success, reward = null) {
  kopfnussChallengeResult = { success, reward };
}

// ============================================
// ZEIT-CHALLENGE POPUP FUNCTIONS
// ============================================

/**
 * Show Zeit-Challenge start popup
 */
function showZeitChallengeStartPopup() {
  const diamonds = loadDiamonds();
  const entryCost = CONFIG.ZEIT_CHALLENGE_ENTRY_COST || 1;
  const rewardAmount = CONFIG.ZEIT_CHALLENGE_REWARD_AMOUNT || 2;
  const timeLimitSeconds = CONFIG.ZEIT_CHALLENGE_TIME_LIMIT_SECONDS || 120;
  const timeLimitMinutes = Math.floor(timeLimitSeconds / 60);
  const hasDiamond = diamonds >= entryCost;
  
  // Check if a seasonal event is active to show appropriate reward choice
  const activeEvent = getActiveEvent();
  let rewardHtml;
  if (activeEvent) {
    // Show that player can choose between diamonds or event currency
    rewardHtml = `
      <div class="reward-choice-display" style="display: flex; gap: 8px; align-items: center; justify-content: center;">
        <span style="padding: 6px 12px; background: rgba(255,255,255,0.5); border-radius: 8px;">+${rewardAmount} 💎</span>
        <span style="font-weight: bold; color: #006064;">oder</span>
        <span style="padding: 6px 12px; background: rgba(255,255,255,0.5); border-radius: 8px;">+${rewardAmount} ${activeEvent.emoticon}</span>
      </div>
    `;
  } else {
    rewardHtml = `<span>+${rewardAmount} 💎</span>`;
  }
  
  if (!hasDiamond) {
    // Show "not enough diamonds" popup
    showZeitChallengeNotEnoughDiamondsPopup();
    return;
  }
  
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay reward-popup-overlay';
  overlay.id = 'zeit-start-popup-overlay';
  
  const popupCard = document.createElement('div');
  popupCard.className = 'popup-card zeit-popup-card';
  
  popupCard.innerHTML = `
    <div class="zeit-icon">⏱️</div>
    <h2>Zeit-Challenge</h2>
    <p class="zeit-description">Du hast nur begrenzt Zeit – schaffst du alle Aufgaben?</p>
    <div class="zeit-time-info">
      <span>⏰</span>
      <span>${timeLimitMinutes} Minuten Zeit</span>
    </div>
    <div class="zeit-cost-info">
      <span>💎</span>
      <span>Einsatz: ${entryCost} Diamant</span>
    </div>
    <div class="zeit-reward-info">
      <span>🎯 Belohnung:</span>
      ${rewardHtml}
    </div>
    <button id="zeit-start-button" class="btn-primary btn-zeit">Los geht's! (–${entryCost} 💎)</button>
    <button id="zeit-cancel-button" class="btn-secondary" style="margin-top: 8px;">Abbrechen</button>
  `;
  
  overlay.appendChild(popupCard);
  document.body.appendChild(overlay);
  
  const startButton = document.getElementById('zeit-start-button');
  startButton.addEventListener('click', () => {
    // Spend the diamond
    const spendResult = spendDiamonds(entryCost);
    if (!spendResult.success) {
      overlay.remove();
      showZeitChallengeNotEnoughDiamondsPopup();
      return;
    }
    
    // Update diamond display in header
    const diamondDisplay = document.querySelector('.header-stats .stat-capsule:nth-child(2) .stat-value');
    if (diamondDisplay) {
      diamondDisplay.textContent = loadDiamonds();
    }
    
    // Start the Zeit-Challenge
    startZeitChallenge();
    
    overlay.remove();
    showScreen('zeitChallengeTaskScreen');
  });
  
  const cancelButton = document.getElementById('zeit-cancel-button');
  cancelButton.addEventListener('click', () => {
    overlay.remove();
  });
}

/**
 * Show popup when player doesn't have enough diamonds for Zeit-Challenge
 */
function showZeitChallengeNotEnoughDiamondsPopup() {
  const entryCost = CONFIG.ZEIT_CHALLENGE_ENTRY_COST || 1;
  
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay';
  overlay.id = 'zeit-no-diamonds-popup-overlay';
  
  const popupCard = document.createElement('div');
  popupCard.className = 'popup-card';
  
  popupCard.innerHTML = `
    <h2>💎 Nicht genug Diamanten</h2>
    <p>Du brauchst ${entryCost} Diamant für die Zeit-Challenge.</p>
    <button id="zeit-no-diamonds-ok-button" class="btn-primary">OK</button>
  `;
  
  overlay.appendChild(popupCard);
  document.body.appendChild(overlay);
  
  const okButton = document.getElementById('zeit-no-diamonds-ok-button');
  okButton.addEventListener('click', () => {
    overlay.remove();
  });
}

/**
 * Show Zeit-Challenge success popup
 * @param {Object} rewardInfo - Reward information {isDiamond, amount, emoticon}
 * @param {Function} onClose - Callback when popup closes
 */
function showZeitChallengeSuccessPopup(rewardInfo, onClose = null) {
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay reward-popup-overlay';
  overlay.id = 'zeit-success-popup-overlay';
  
  const popupCard = document.createElement('div');
  popupCard.className = 'popup-card reward-popup-card zeit-success-popup-card';
  
  let rewardDisplayHtml;
  if (rewardInfo.isDiamond) {
    rewardDisplayHtml = `
      <div class="zeit-success-display">
        <span class="zeit-success-icon">💎</span>
        <span class="zeit-success-text">+${rewardInfo.amount} Diamanten</span>
      </div>
    `;
  } else {
    rewardDisplayHtml = `
      <div class="zeit-success-display">
        <span class="zeit-success-icon">${rewardInfo.emoticon}</span>
        <span class="zeit-success-text">+${rewardInfo.amount}</span>
      </div>
    `;
  }
  
  popupCard.innerHTML = `
    <div class="reward-celebration">⭐</div>
    <h2>Zeit-Challenge geschafft!</h2>
    ${rewardDisplayHtml}
    <p>Du hast der Zeit getrotzt!</p>
    <button id="zeit-success-close-button" class="btn-primary btn-zeit">Einsammeln</button>
  `;
  
  overlay.appendChild(popupCard);
  document.body.appendChild(overlay);
  
  createConfettiEffect();
  
  const closeButton = document.getElementById('zeit-success-close-button');
  closeButton.addEventListener('click', () => {
    overlay.remove();
    removeConfettiPieces();
    if (onClose && typeof onClose === 'function') {
      onClose();
    }
    processPopupQueue();
  });
}

/**
 * Show Zeit-Challenge failure popup (timeout)
 * @param {Function} onClose - Callback when popup closes
 */
function showZeitChallengeFailurePopup(onClose = null) {
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay reward-popup-overlay';
  overlay.id = 'zeit-failure-popup-overlay';
  
  const popupCard = document.createElement('div');
  popupCard.className = 'popup-card reward-popup-card zeit-failure-popup-card';
  
  popupCard.innerHTML = `
    <div class="reward-celebration">😞</div>
    <h2>Zeit abgelaufen!</h2>
    <p>Du warst knapp dran – versuch es gleich noch einmal!</p>
    <button id="zeit-failure-close-button" class="btn-primary">Neuer Versuch</button>
  `;
  
  overlay.appendChild(popupCard);
  document.body.appendChild(overlay);
  
  const closeButton = document.getElementById('zeit-failure-close-button');
  closeButton.addEventListener('click', () => {
    overlay.remove();
    // Reset the Zeit-Challenge so it can be replayed
    resetZeitChallengeAfterFailure();
    if (onClose && typeof onClose === 'function') {
      onClose();
    }
    processPopupQueue();
  });
}

/**
 * Show task screen exit confirmation popup
 * Asks user to confirm before leaving the task screen mid-challenge
 * @param {Function} onConfirm - Callback when user confirms exit
 * @param {string} challengeType - Type of challenge ('standard', 'kopfnuss', 'zeit')
 */
function showTaskExitConfirmationPopup(onConfirm, challengeType = 'standard') {
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay reward-popup-overlay';
  overlay.id = 'task-exit-confirmation-popup-overlay';
  
  const popupCard = document.createElement('div');
  popupCard.className = 'popup-card';
  
  // Customize message based on challenge type
  let title, message, icon, headerColor;
  switch(challengeType) {
    case 'kopfnuss':
      title = 'Kopfnuss abbrechen?';
      message = 'Wenn du jetzt abbrichst, ist der Diamant verloren und du musst neu beginnen.';
      icon = '🤔';
      headerColor = '#8B4513';
      break;
    case 'zeit':
      title = 'Zeit-Challenge abbrechen?';
      message = 'Wenn du jetzt abbrichst, ist der Diamant verloren und die Zeit läuft weiter.';
      icon = '⏱️';
      headerColor = '#006064';
      break;
    default:
      title = 'Challenge abbrechen?';
      message = 'Bist du sicher, dass du die Challenge abbrechen möchtest?';
      icon = '⚠️';
      headerColor = '#555';
  }
  
  popupCard.innerHTML = `
    <div class="exit-confirmation-icon" style="font-size: 48px; margin-bottom: 12px;">${icon}</div>
    <h2 style="color: ${headerColor}; margin-bottom: 12px;">${title}</h2>
    <p style="margin-bottom: 20px; color: #666;">${message}</p>
    <div style="display: flex; gap: 12px; justify-content: center;">
      <button id="exit-cancel-button" class="btn-secondary" style="padding: 12px 24px;">Nein, hier bleiben</button>
      <button id="exit-confirm-button" class="btn-primary" style="padding: 12px 24px; background: #CD5C5C;">Ja, zurück</button>
    </div>
  `;
  
  overlay.appendChild(popupCard);
  document.body.appendChild(overlay);
  
  // Cancel button - stay in task screen
  const cancelButton = document.getElementById('exit-cancel-button');
  cancelButton.addEventListener('click', () => {
    overlay.remove();
  });
  
  // Confirm button - exit task screen
  const confirmButton = document.getElementById('exit-confirm-button');
  confirmButton.addEventListener('click', () => {
    overlay.remove();
    if (onConfirm && typeof onConfirm === 'function') {
      onConfirm();
    }
  });
}

/**
 * Notify that Zeit-Challenge was completed
 * @param {boolean} success - Whether the challenge was completed in time
 * @param {Object|null} reward - Reward info if successful
 */
export function notifyZeitChallengeResult(success, reward = null) {
  zeitChallengeResult = { success, reward };
}

/**
 * Show seasonal event start popup
 * Displayed on first app launch during an active event
 * @param {Function} onClose - Callback when popup closes
 */
function showEventStartPopup(onClose = null) {
  const activeEvent = getActiveEvent();
  if (!activeEvent) {
    if (onClose) onClose();
    return;
  }
  
  const daysRemaining = getDaysUntilEventEnd();
  const dayText = daysRemaining === 1 ? 'Tag' : 'Tage';
  
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay event-popup-overlay';
  overlay.id = 'event-start-popup-overlay';
  
  const popupCard = document.createElement('div');
  popupCard.className = 'popup-card event-popup-card event-start-card';
  
  popupCard.innerHTML = `
    <div class="event-emoticon-large">${activeEvent.emoticon}</div>
    <h2>${activeEvent.popupTitle}</h2>
    <p class="event-description">${activeEvent.popupDescription}</p>
    <div class="event-info-section">
      <p class="event-how-to">Schließe Super Challenges ab, um <strong>${activeEvent.currencyName}</strong> zu sammeln!</p>
      <p class="event-unlock-info">Schalte besondere saisonale Hintergründe frei!</p>
    </div>
    <div class="event-end-date">
      <span>⏰ Noch <strong>${daysRemaining} ${dayText}</strong></span>
    </div>
    <button id="event-start-close-button" class="btn-primary btn-event">${activeEvent.emoticon} Hol ich mir!</button>
  `;
  
  overlay.appendChild(popupCard);
  document.body.appendChild(overlay);
  
  createConfettiEffect();
  
  const closeButton = document.getElementById('event-start-close-button');
  closeButton.addEventListener('click', () => {
    markEventStartPopupShown();
    overlay.remove();
    removeConfettiPieces();
    if (onClose && typeof onClose === 'function') {
      onClose();
    }
    processPopupQueue();
  });
}

/**
 * Show event info popup when countdown capsule is tapped
 * Similar to event start popup but doesn't mark as shown (can be viewed multiple times)
 * Uses popup queue system for sequential display
 */
function showEventInfoPopup() {
  const activeEvent = getActiveEvent();
  if (!activeEvent) {
    processPopupQueue();
    return;
  }
  
  const daysRemaining = getDaysUntilEventEnd();
  const dayText = daysRemaining === 1 ? 'Tag' : 'Tage';
  const seasonalCurrency = getSeasonalCurrency();
  const seasonalTasks = getSeasonalTaskCount();
  
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay event-popup-overlay';
  overlay.id = 'event-info-popup-overlay';
  
  const popupCard = document.createElement('div');
  popupCard.className = 'popup-card event-popup-card event-info-card';
  
  popupCard.innerHTML = `
    <div class="event-emoticon-large">${activeEvent.emoticon}</div>
    <h2>${activeEvent.popupTitle}</h2>
    <p class="event-description">${activeEvent.popupDescription}</p>
    <div class="event-info-section">
      <div class="event-stats">
        <div class="event-stat">
          <span class="event-stat-icon">${activeEvent.emoticon}</span>
          <span class="event-stat-value">${seasonalCurrency}</span>
          <span class="event-stat-label">${activeEvent.currencyName}</span>
        </div>
        <div class="event-stat">
          <span class="event-stat-icon">✅</span>
          <span class="event-stat-value">${seasonalTasks}</span>
          <span class="event-stat-label">Aufgaben</span>
        </div>
      </div>
      <p class="event-how-to">Schließe Super Challenges ab, um <strong>${activeEvent.currencyName}</strong> zu sammeln!</p>
    </div>
    <div class="event-end-date">
      <span>⏰ Noch <strong>${daysRemaining} ${dayText}</strong></span>
    </div>
    <button id="event-info-close-button" class="btn-primary btn-event">${activeEvent.emoticon} Weiter!</button>
  `;
  
  overlay.appendChild(popupCard);
  document.body.appendChild(overlay);
  
  const closeButton = document.getElementById('event-info-close-button');
  closeButton.addEventListener('click', () => {
    overlay.remove();
    processPopupQueue();
  });
}

/**
 * Show seasonal event end popup
 * Displayed on first app launch after an event ends
 * @param {Object} event - The event that ended
 * @param {boolean} backgroundWasReset - Whether a seasonal background was reset
 * @param {Function} onClose - Callback when popup closes
 */
function showEventEndPopup(event, backgroundWasReset = false, onClose = null) {
  if (!event) {
    if (onClose) onClose();
    return;
  }
  
  // Clear all seasonal data for this event (currency, tasks, unlocked backgrounds)
  // This ensures the player must earn everything again next time the event occurs
  clearEventData(event.id);
  
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay event-popup-overlay';
  overlay.id = 'event-end-popup-overlay';
  
  const popupCard = document.createElement('div');
  popupCard.className = 'popup-card event-popup-card event-end-card';
  
  let backgroundResetText = '';
  if (backgroundWasReset) {
    backgroundResetText = '<p class="event-background-reset">Dein saisonaler Hintergrund wurde auf den Standard zurückgesetzt.</p>';
  }
  
  popupCard.innerHTML = `
    <div class="event-emoticon-large">${event.emoticon}</div>
    <h2>${event.name}-Event beendet</h2>
    <p class="event-end-info">Das ${event.name}-Event ist vorbei!</p>
    <div class="event-end-details">
      <p>• Deine ${event.currencyName} wurden entfernt</p>
      <p>• Saisonale Hintergründe sind nicht mehr verfügbar</p>
      ${backgroundResetText}
    </div>
    <p class="event-next-time">Bis zum nächsten Mal!</p>
    <button id="event-end-close-button" class="btn-primary">OK</button>
  `;
  
  overlay.appendChild(popupCard);
  document.body.appendChild(overlay);
  
  const closeButton = document.getElementById('event-end-close-button');
  closeButton.addEventListener('click', () => {
    markEventEndPopupShown(event.id);
    overlay.remove();
    if (onClose && typeof onClose === 'function') {
      onClose();
    }
    processPopupQueue();
  });
}

/**
 * Show settings popup with options to reset data or generate new challenges
 */
function showSettingsPopup() {
  const isDevMode = loadDevModeSetting();
  const isAudioMuted = loadAudioMutedSetting();
  
  // Create popup overlay
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay settings-popup-overlay';
  overlay.id = 'settings-popup-overlay';
  
  // Create popup card
  const popupCard = document.createElement('div');
  popupCard.className = 'popup-card settings-popup-card';
  
  // Dev mode toggle HTML
  const devModeToggleClass = isDevMode ? 'dev-mode-toggle active' : 'dev-mode-toggle';
  const devModeToggleText = isDevMode ? 'AN' : 'AUS';
  
  // Check for active seasonal event (for dev controls)
  const activeEventForDev = isDevMode ? getActiveEvent() : null;
  const seasonalCurrencyForDev = activeEventForDev ? getSeasonalCurrency() : 0;
  
  // Seasonal currency controls (only visible during events in dev mode)
  const seasonalCurrencyHtml = activeEventForDev ? `
    <div class="dev-setting-row">
      <label>${activeEventForDev.emoticon} ${activeEventForDev.currencyName}:</label>
      <div class="dev-setting-controls">
        <button id="dev-seasonal-minus" class="dev-btn-small">-</button>
        <span id="dev-seasonal-value" class="dev-value">${seasonalCurrencyForDev}</span>
        <button id="dev-seasonal-plus" class="dev-btn-small">+</button>
      </div>
    </div>
  ` : '';
  
  // Dev settings section HTML (only visible in dev mode)
  const devSettingsHtml = isDevMode ? `
    <div class="dev-settings-section">
      <h3>🛠️ Dev-Einstellungen</h3>
      <div class="dev-settings-grid">
        <div class="dev-setting-row">
          <label>💎 Diamanten:</label>
          <div class="dev-setting-controls">
            <button id="dev-diamonds-minus" class="dev-btn-small">-</button>
            <span id="dev-diamonds-value" class="dev-value">${loadDiamonds()}</span>
            <button id="dev-diamonds-plus" class="dev-btn-small">+</button>
          </div>
        </div>
        <div class="dev-setting-row">
          <label>🫧 Streak-Steine:</label>
          <div class="dev-setting-controls">
            <button id="dev-streak-stones-minus" class="dev-btn-small">-</button>
            <span id="dev-streak-stones-value" class="dev-value">${getStreakStones()}</span>
            <button id="dev-streak-stones-plus" class="dev-btn-small">+</button>
          </div>
        </div>
        ${seasonalCurrencyHtml}
        <div class="dev-setting-row">
          <label>🔥 Streak:</label>
          <div class="dev-setting-controls">
            <button id="dev-streak-minus" class="dev-btn-small">-</button>
            <span id="dev-streak-value" class="dev-value">${getStreakInfo().currentStreak}</span>
            <button id="dev-streak-plus" class="dev-btn-small">+</button>
          </div>
        </div>
        <div class="dev-setting-row">
          <label>🧊 Streak Status:</label>
          <div class="dev-setting-controls">
            <button id="dev-freeze-streak" class="dev-btn-action">Einfrieren</button>
            <button id="dev-unfreeze-streak" class="dev-btn-action">Auftauen</button>
          </div>
        </div>
        <div class="dev-setting-row">
          <label>📅 Zeit:</label>
          <div class="dev-setting-controls">
            <button id="dev-advance-day" class="dev-btn-action">+1 Tag</button>
          </div>
        </div>
        <div class="dev-setting-row">
          <label>✅ Challenge:</label>
          <div class="dev-setting-controls">
            <button id="dev-complete-challenge" class="dev-btn-action">Abschließen</button>
          </div>
        </div>
        <div class="dev-setting-row">
          <label>🤔 Kopfnuss:</label>
          <div class="dev-setting-controls">
            <button id="dev-force-kopfnuss" class="dev-btn-action">Erzwingen</button>
          </div>
        </div>
        <div class="dev-setting-row">
          <label>⏱️ Zeit-Challenge:</label>
          <div class="dev-setting-controls">
            <button id="dev-force-zeit" class="dev-btn-action">Erzwingen</button>
          </div>
        </div>
        <div class="dev-setting-row">
          <label>📊 Gelöste Aufgaben:</label>
          <div class="dev-setting-controls">
            <button id="dev-tasks-minus" class="dev-btn-small">-10</button>
            <span id="dev-tasks-value" class="dev-value">${loadProgress().totalTasksCompleted || 0}</span>
            <button id="dev-tasks-plus" class="dev-btn-small">+10</button>
          </div>
        </div>
      </div>
    </div>
  ` : '';
  
  // Audio toggle state
  const audioToggleClass = isAudioMuted ? 'audio-toggle-switch' : 'audio-toggle-switch active';
  
  popupCard.innerHTML = `
    <h2>⚙️ Einstellungen</h2>
    <div class="settings-actions">
      <div class="audio-settings-section">
        <div class="audio-settings-row">
          <span class="audio-settings-label">🔊 Sound:</span>
          <div id="audio-toggle" class="${audioToggleClass}">
            <div class="audio-toggle-knob"></div>
          </div>
        </div>
      </div>
      <div class="dev-mode-section">
        <div class="dev-mode-row">
          <span class="dev-mode-label">🔧 Dev-Mode:</span>
          <button id="dev-mode-toggle" class="${devModeToggleClass}">
            <span class="toggle-text">${devModeToggleText}</span>
          </button>
        </div>
      </div>
      ${devSettingsHtml}
      <button id="regenerate-challenges-button" class="btn-settings">
        <span class="btn-icon">🔄</span>
        <span class="btn-text">Neue Herausforderungen generieren</span>
      </button>
      <button id="reset-all-data-button" class="btn-settings btn-danger">
        <span class="btn-icon">🗑️</span>
        <span class="btn-text">Speicherstand löschen und neu beginnen</span>
      </button>
    </div>
    <button id="close-settings-button" class="btn-secondary settings-close-button">Schließen</button>
  `;
  
  overlay.appendChild(popupCard);
  document.body.appendChild(overlay);
  
  // Add event listeners
  const closeBtn = document.getElementById('close-settings-button');
  const regenerateBtn = document.getElementById('regenerate-challenges-button');
  const resetBtn = document.getElementById('reset-all-data-button');
  const devModeToggle = document.getElementById('dev-mode-toggle');
  const audioToggle = document.getElementById('audio-toggle');
  
  if (closeBtn) closeBtn.addEventListener('click', closeSettingsPopup);
  if (regenerateBtn) regenerateBtn.addEventListener('click', handleRegenerateChallenges);
  if (resetBtn) resetBtn.addEventListener('click', handleResetAllData);
  if (devModeToggle) devModeToggle.addEventListener('click', handleDevModeToggle);
  if (audioToggle) audioToggle.addEventListener('click', handleAudioToggle);
  
  // Add dev settings event listeners if in dev mode
  if (isDevMode) {
    setupDevSettingsListeners();
  }
}

/**
 * Handle audio toggle click
 * Toggles audio mute state and updates UI
 */
function handleAudioToggle() {
  const currentMuted = loadAudioMutedSetting();
  const newMuted = !currentMuted;
  
  // Save to storage
  saveAudioMutedSetting(newMuted);
  
  // Update audioManager
  audioManager.setMuted(newMuted);
  
  // Update toggle UI
  const audioToggle = document.getElementById('audio-toggle');
  if (audioToggle) {
    if (newMuted) {
      audioToggle.classList.remove('active');
    } else {
      audioToggle.classList.add('active');
    }
  }
}

/**
 * Handle dev mode toggle
 * Shows reload confirmation popup
 */
function handleDevModeToggle() {
  const currentDevMode = loadDevModeSetting();
  const newDevMode = !currentDevMode;
  
  // Show reload confirmation popup
  showDevModeReloadPopup(newDevMode);
}

/**
 * Show reload confirmation popup after dev mode toggle
 * @param {boolean} newDevMode - The new dev mode state to apply
 */
function showDevModeReloadPopup(newDevMode) {
  // Close settings popup first
  closeSettingsPopup();
  
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay confirmation-popup-overlay';
  overlay.id = 'dev-mode-reload-popup-overlay';
  
  const popupCard = document.createElement('div');
  popupCard.className = 'popup-card confirmation-popup-card';
  
  popupCard.innerHTML = `
    <h2>🔄 Neustart erforderlich</h2>
    <p>App neu starten, um das neue Balancing zu aktivieren?</p>
    <div class="confirmation-buttons">
      <button id="confirm-reload-button" class="btn-primary">Neu starten</button>
      <button id="cancel-reload-button" class="btn-secondary">Abbrechen</button>
    </div>
  `;
  
  overlay.appendChild(popupCard);
  document.body.appendChild(overlay);
  
  const confirmBtn = document.getElementById('confirm-reload-button');
  const cancelBtn = document.getElementById('cancel-reload-button');
  
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      // Save the new dev mode setting
      saveDevModeSetting(newDevMode);
      // Reload the app
      window.location.reload();
    });
  }
  
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      overlay.remove();
    });
  }
}

/**
 * Show reload popup after dev settings change
 * @param {string} message - Message to display
 */
function showDevSettingsReloadPopup(message) {
  // Close settings popup first
  closeSettingsPopup();
  
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay confirmation-popup-overlay';
  overlay.id = 'dev-settings-reload-popup-overlay';
  
  const popupCard = document.createElement('div');
  popupCard.className = 'popup-card confirmation-popup-card';
  
  popupCard.innerHTML = `
    <h2>🔄 Neustart erforderlich</h2>
    <p>${message}</p>
    <div class="confirmation-buttons">
      <button id="confirm-dev-reload-button" class="btn-primary">Neu starten</button>
      <button id="cancel-dev-reload-button" class="btn-secondary">Abbrechen</button>
    </div>
  `;
  
  overlay.appendChild(popupCard);
  document.body.appendChild(overlay);
  
  const confirmBtn = document.getElementById('confirm-dev-reload-button');
  const cancelBtn = document.getElementById('cancel-dev-reload-button');
  
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      window.location.reload();
    });
  }
  
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      overlay.remove();
      // Re-open settings popup
      showSettingsPopup();
    });
  }
}

/**
 * Setup event listeners for dev settings controls
 */
function setupDevSettingsListeners() {
  // Diamond controls - update UI immediately without reload
  const diamondsMinus = document.getElementById('dev-diamonds-minus');
  const diamondsPlus = document.getElementById('dev-diamonds-plus');
  const diamondsValue = document.getElementById('dev-diamonds-value');
  
  if (diamondsMinus) {
    diamondsMinus.addEventListener('click', () => {
      const current = loadDiamonds();
      const newValue = Math.max(0, current - 1);
      saveDiamonds(newValue);
      // Update dev settings display
      if (diamondsValue) diamondsValue.textContent = newValue;
      // Update main UI diamond display
      const mainDiamondDisplay = document.querySelector('.header-stats .stat-capsule:last-child .stat-value');
      if (mainDiamondDisplay) mainDiamondDisplay.textContent = newValue;
      showDevFeedback('💎 ' + newValue);
    });
  }
  
  if (diamondsPlus) {
    diamondsPlus.addEventListener('click', () => {
      const current = loadDiamonds();
      const newValue = current + 1;
      saveDiamonds(newValue);
      // Update dev settings display
      if (diamondsValue) diamondsValue.textContent = newValue;
      // Update main UI diamond display
      const mainDiamondDisplay = document.querySelector('.header-stats .stat-capsule:last-child .stat-value');
      if (mainDiamondDisplay) mainDiamondDisplay.textContent = newValue;
      showDevFeedback('💎 ' + newValue);
    });
  }
  
  // Streak Stones controls
  const streakStonesMinus = document.getElementById('dev-streak-stones-minus');
  const streakStonesPlus = document.getElementById('dev-streak-stones-plus');
  const streakStonesValue = document.getElementById('dev-streak-stones-value');
  
  if (streakStonesMinus) {
    streakStonesMinus.addEventListener('click', () => {
      const current = getStreakStones();
      const newValue = Math.max(0, current - 1);
      saveStreakStones(newValue);
      // Update dev settings display
      if (streakStonesValue) streakStonesValue.textContent = newValue;
      // Update main UI streak stones display
      const mainStonesDisplay = document.querySelector('.header-stats .stat-capsule:nth-child(3) .stat-value');
      if (mainStonesDisplay) mainStonesDisplay.textContent = newValue;
      showDevFeedback('🫧 ' + newValue);
    });
  }
  
  if (streakStonesPlus) {
    streakStonesPlus.addEventListener('click', () => {
      const current = getStreakStones();
      const newValue = current + 1;
      saveStreakStones(newValue);
      // Update dev settings display
      if (streakStonesValue) streakStonesValue.textContent = newValue;
      // Update main UI streak stones display
      const mainStonesDisplay = document.querySelector('.header-stats .stat-capsule:nth-child(3) .stat-value');
      if (mainStonesDisplay) mainStonesDisplay.textContent = newValue;
      showDevFeedback('🫧 ' + newValue);
    });
  }
  
  // Streak controls
  const streakMinus = document.getElementById('dev-streak-minus');
  const streakPlus = document.getElementById('dev-streak-plus');
  const streakValue = document.getElementById('dev-streak-value');
  
  if (streakMinus) {
    streakMinus.addEventListener('click', () => {
      const streak = loadStreak();
      streak.currentStreak = Math.max(0, streak.currentStreak - 1);
      saveStreak(streak);
      
      // Also update milestone progress to match
      const milestoneProgress = Math.max(0, loadMilestoneProgress() - 1);
      saveMilestoneProgress(milestoneProgress);
      
      // Update dev settings display
      if (streakValue) streakValue.textContent = streak.currentStreak;
      // Update main UI streak display
      const mainStreakDisplay = document.querySelector('.header-stats .stat-capsule:first-child .stat-value');
      if (mainStreakDisplay) mainStreakDisplay.textContent = streak.currentStreak;
      showDevFeedback('🔥 ' + streak.currentStreak);
    });
  }
  
  if (streakPlus) {
    streakPlus.addEventListener('click', () => {
      const streak = loadStreak();
      streak.currentStreak += 1;
      if (streak.currentStreak > streak.longestStreak) {
        streak.longestStreak = streak.currentStreak;
      }
      saveStreak(streak);
      
      // Also update milestone progress to match
      const milestoneProgress = loadMilestoneProgress() + 1;
      saveMilestoneProgress(milestoneProgress);
      
      // Update dev settings display
      if (streakValue) streakValue.textContent = streak.currentStreak;
      // Update main UI streak display
      const mainStreakDisplay = document.querySelector('.header-stats .stat-capsule:first-child .stat-value');
      if (mainStreakDisplay) mainStreakDisplay.textContent = streak.currentStreak;
      showDevFeedback('🔥 ' + streak.currentStreak);
    });
  }
  
  // Freeze/Unfreeze streak - update UI immediately
  const freezeBtn = document.getElementById('dev-freeze-streak');
  const unfreezeBtn = document.getElementById('dev-unfreeze-streak');
  
  if (freezeBtn) {
    freezeBtn.addEventListener('click', () => {
      const streak = loadStreak();
      streak.isFrozen = true;
      saveStreak(streak);
      // Update main UI streak icon to frozen
      const streakCapsule = document.querySelector('.header-stats .stat-capsule:first-child');
      const streakIcon = streakCapsule?.querySelector('.stat-icon');
      if (streakCapsule) streakCapsule.classList.add('streak-frozen');
      if (streakIcon) streakIcon.textContent = '🧊';
      showDevFeedback('Streak eingefroren 🧊');
    });
  }
  
  if (unfreezeBtn) {
    unfreezeBtn.addEventListener('click', () => {
      const streak = loadStreak();
      streak.isFrozen = false;
      streak.lossReason = null;
      saveStreak(streak);
      // Update main UI streak icon to normal
      const streakCapsule = document.querySelector('.header-stats .stat-capsule:first-child');
      const streakIcon = streakCapsule?.querySelector('.stat-icon');
      if (streakCapsule) streakCapsule.classList.remove('streak-frozen');
      if (streakIcon) streakIcon.textContent = '🔥';
      showDevFeedback('Streak aufgetaut 🔥');
    });
  }
  
  // Advance day
  const advanceDayBtn = document.getElementById('dev-advance-day');
  
  if (advanceDayBtn) {
    advanceDayBtn.addEventListener('click', () => {
      const streak = loadStreak();
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      // Edge case: If currentStreak is 0, there's nothing to freeze or lose
      // User needs to complete a challenge first to start a streak
      if (!streak.currentStreak || streak.currentStreak === 0) {
        showDevFeedback('⚠️ Kein Streak vorhanden. Schließe zuerst eine Challenge ab.');
        return;
      }
      
      if (streak.lastActiveDate) {
        // Calculate current gap in days using date strings for accuracy
        const todayDate = new Date(todayStr + 'T12:00:00');
        const lastDate = new Date(streak.lastActiveDate + 'T12:00:00');
        const currentGap = Math.round((todayDate.getTime() - lastDate.getTime()) / DEV_SETTINGS_CONFIG.MS_PER_DAY);
        
        // Move lastActiveDate one more day back to increase the gap by 1
        lastDate.setTime(lastDate.getTime() - DEV_SETTINGS_CONFIG.MS_PER_DAY);
        streak.lastActiveDate = lastDate.toISOString().split('T')[0];
        
        const newGap = currentGap + 1;
        let message = '';
        // Gap interpretation (corrected):
        // 1 day = next day after activity, streak continues normally
        // 2 days = 1 complete inactive day, streak frozen
        // 3 days = 2 inactive days, streak expired (restorable with 💎)
        // 4+ days = streak permanently lost
        if (newGap === 1) {
          message = 'Lücke: 1 Tag → Streak normal (nächster Tag)';
        } else if (newGap === 2) {
          message = 'Lücke: 2 Tage → Streak wird eingefroren';
        } else if (newGap === 3) {
          message = 'Lücke: 3 Tage → Streak verloren (mit 💎 rettbar)';
        } else {
          message = `Lücke: ${newGap} Tage → Streak endgültig verloren`;
        }
        
        // Reset statusHandledDate so popup will show after reload
        streak.statusHandledDate = null;
        
        saveStreak(streak);
        showDevSettingsReloadPopup(`${message}. App neu starten?`);
      } else {
        // Has a streak but no lastActiveDate - this shouldn't happen normally
        // Show feedback that they need to complete a challenge first
        showDevFeedback('⚠️ Keine Aktivität vorhanden. Schließe zuerst eine Challenge ab.');
      }
    });
  }
  
  // Total tasks controls - update UI immediately
  const tasksMinus = document.getElementById('dev-tasks-minus');
  const tasksPlus = document.getElementById('dev-tasks-plus');
  const tasksValue = document.getElementById('dev-tasks-value');
  
  if (tasksMinus) {
    tasksMinus.addEventListener('click', () => {
      const progress = loadProgress();
      progress.totalTasksCompleted = Math.max(0, (progress.totalTasksCompleted || 0) - 10);
      saveProgress(progress);
      if (tasksValue) tasksValue.textContent = progress.totalTasksCompleted;
      // Update diamond progress text in main UI
      updateDiamondProgressText(progress.totalTasksCompleted);
      showDevFeedback('📊 ' + progress.totalTasksCompleted + ' Aufgaben');
    });
  }
  
  if (tasksPlus) {
    tasksPlus.addEventListener('click', () => {
      const progress = loadProgress();
      const oldTotal = progress.totalTasksCompleted || 0;
      const newTotal = oldTotal + 10;
      
      // Calculate diamonds earned from this increment
      const oldDiamonds = Math.floor(oldTotal / CONFIG.TASKS_PER_DIAMOND);
      const newDiamonds = Math.floor(newTotal / CONFIG.TASKS_PER_DIAMOND);
      const diamondsEarned = newDiamonds - oldDiamonds;
      
      progress.totalTasksCompleted = newTotal;
      saveProgress(progress);
      
      // Also increment seasonal tasks if an event is active
      const activeEvent = getActiveEvent();
      if (activeEvent) {
        incrementSeasonalTasks(10);
        // Update seasonal task display in header if visible
        const seasonalTaskValue = document.querySelector('.event-stat-value');
        if (seasonalTaskValue) {
          seasonalTaskValue.textContent = getSeasonalTaskCount();
        }
      }
      
      // Award diamonds if earned
      if (diamondsEarned > 0) {
        let currentDiamonds = loadDiamonds();
        currentDiamonds += diamondsEarned;
        saveDiamonds(currentDiamonds);
        
        // Track diamonds earned for popup when settings close
        devDiamondsEarned += diamondsEarned;
        
        // Update dev settings display
        const devDiamondValue = document.getElementById('dev-diamonds-value');
        if (devDiamondValue) devDiamondValue.textContent = currentDiamonds;
        // Update main UI diamond display
        const mainDiamondDisplay = document.querySelector('.header-stats .stat-capsule:last-child .stat-value');
        if (mainDiamondDisplay) mainDiamondDisplay.textContent = currentDiamonds;
      }
      
      if (tasksValue) tasksValue.textContent = progress.totalTasksCompleted;
      // Update diamond progress text in main UI
      updateDiamondProgressText(progress.totalTasksCompleted);
      
      // Show feedback with diamond info if earned
      if (diamondsEarned > 0) {
        showDevFeedback(`📊 ${newTotal} Aufgaben (+${diamondsEarned} 💎)`);
      } else {
        showDevFeedback('📊 ' + newTotal + ' Aufgaben');
      }
    });
  }
  
  // Complete Challenge button
  const completeChallengeBtn = document.getElementById('dev-complete-challenge');
  
  if (completeChallengeBtn) {
    completeChallengeBtn.addEventListener('click', () => {
      const challenges = getTodaysChallenges();
      
      // Find the first available or in_progress challenge (regular or super)
      const challengeIndex = challenges.findIndex(c => 
        c.state === CHALLENGE_STATE.AVAILABLE || 
        c.state === CHALLENGE_STATE.IN_PROGRESS ||
        c.state === CHALLENGE_STATE.SUPER_AVAILABLE ||
        c.state === CHALLENGE_STATE.SUPER_IN_PROGRESS
      );
      
      if (challengeIndex === -1) {
        showDevFeedback('❌ Keine Challenge verfügbar');
        return;
      }
      
      const challenge = challenges[challengeIndex];
      
      // Complete the challenge with 0 errors
      completeChallengeState(challengeIndex, 0);
      
      // Update progress - add tasks from this challenge
      const progress = loadProgress();
      const tasksInChallenge = challenge.tasks ? challenge.tasks.length : CONFIG.TASKS_PER_CHALLENGE;
      const oldTotal = progress.totalTasksCompleted || 0;
      const newTotal = oldTotal + tasksInChallenge;
      
      // Calculate diamonds earned
      const oldDiamonds = Math.floor(oldTotal / CONFIG.TASKS_PER_DIAMOND);
      const newDiamonds = Math.floor(newTotal / CONFIG.TASKS_PER_DIAMOND);
      const diamondsEarned = newDiamonds - oldDiamonds;
      
      progress.totalTasksCompleted = newTotal;
      progress.totalChallengesCompleted = (progress.totalChallengesCompleted || 0) + 1;
      progress.lastPlayedDate = new Date().toISOString().split('T')[0];
      saveProgress(progress);
      
      // Award diamonds if earned
      if (diamondsEarned > 0) {
        let currentDiamonds = loadDiamonds();
        currentDiamonds += diamondsEarned;
        saveDiamonds(currentDiamonds);
        devDiamondsEarned += diamondsEarned;
      }
      
      // Handle streak progression
      const streak = loadStreak();
      let streakMessage = '';
      
      if (streak.isFrozen) {
        // Unfreeze streak
        const result = unfreezeStreakByChallenge();
        if (result.wasUnfrozen) {
          streakMessage = ` (🔓 Streak ${result.newStreak})`;
        }
      } else if (!streak.lossReason) {
        // Increment streak
        const result = incrementStreakByChallenge();
        if (result.wasIncremented) {
          streakMessage = ` (🔥 Streak ${result.newStreak})`;
        }
      }
      
      // Show restart popup
      const overlay = document.createElement('div');
      overlay.className = 'popup-overlay';
      overlay.id = 'dev-restart-popup-overlay';
      
      const feedbackText = diamondsEarned > 0 
        ? `Challenge ${challengeIndex + 1} abgeschlossen! (+${diamondsEarned} 💎)${streakMessage}`
        : `Challenge ${challengeIndex + 1} abgeschlossen!${streakMessage}`;
      
      overlay.innerHTML = `
        <div class="popup-card">
          <h2>🔄 Neustart erforderlich</h2>
          <p>${feedbackText}</p>
          <p>App neu starten, um die Änderungen zu sehen?</p>
          <div class="popup-buttons">
            <button id="dev-restart-confirm" class="btn-primary">Neu starten</button>
            <button id="dev-restart-cancel" class="btn-secondary">Abbrechen</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(overlay);
      
      document.getElementById('dev-restart-confirm').addEventListener('click', () => {
        window.location.reload();
      });
      
      document.getElementById('dev-restart-cancel').addEventListener('click', () => {
        overlay.remove();
      });
    });
  }
  
  // Force Kopfnuss button
  const forceKopfnussBtn = document.getElementById('dev-force-kopfnuss');
  
  if (forceKopfnussBtn) {
    forceKopfnussBtn.addEventListener('click', () => {
      // Force regenerate Kopfnuss Challenge with guaranteed spawn
      regenerateKopfnussChallenge(true);
      
      // Show restart popup
      const overlay = document.createElement('div');
      overlay.className = 'popup-overlay';
      overlay.id = 'dev-kopfnuss-popup-overlay';
      
      overlay.innerHTML = `
        <div class="popup-card">
          <h2>🤔 Kopfnuss erzwungen</h2>
          <p>Kopfnuss-Challenge wurde erzwungen!</p>
          <p>App neu starten, um die Änderungen zu sehen?</p>
          <div class="popup-buttons">
            <button id="dev-kopfnuss-restart-confirm" class="btn-primary">Neu starten</button>
            <button id="dev-kopfnuss-restart-cancel" class="btn-secondary">Abbrechen</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(overlay);
      
      document.getElementById('dev-kopfnuss-restart-confirm').addEventListener('click', () => {
        window.location.reload();
      });
      
      document.getElementById('dev-kopfnuss-restart-cancel').addEventListener('click', () => {
        overlay.remove();
      });
    });
  }
  
  // Force Zeit-Challenge button
  const forceZeitBtn = document.getElementById('dev-force-zeit');
  
  if (forceZeitBtn) {
    forceZeitBtn.addEventListener('click', () => {
      // Force regenerate Zeit-Challenge with guaranteed spawn
      regenerateZeitChallenge(true);
      
      // Show restart popup
      const overlay = document.createElement('div');
      overlay.className = 'popup-overlay';
      overlay.id = 'dev-zeit-popup-overlay';
      
      overlay.innerHTML = `
        <div class="popup-card">
          <h2>⏱️ Zeit-Challenge erzwungen</h2>
          <p>Zeit-Challenge wurde erzwungen!</p>
          <p>App neu starten, um die Änderungen zu sehen?</p>
          <div class="popup-buttons">
            <button id="dev-zeit-restart-confirm" class="btn-primary">Neu starten</button>
            <button id="dev-zeit-restart-cancel" class="btn-secondary">Abbrechen</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(overlay);
      
      document.getElementById('dev-zeit-restart-confirm').addEventListener('click', () => {
        window.location.reload();
      });
      
      document.getElementById('dev-zeit-restart-cancel').addEventListener('click', () => {
        overlay.remove();
      });
    });
  }
  
  // Seasonal currency controls (only available during events)
  const seasonalMinus = document.getElementById('dev-seasonal-minus');
  const seasonalPlus = document.getElementById('dev-seasonal-plus');
  const seasonalValue = document.getElementById('dev-seasonal-value');
  
  if (seasonalMinus) {
    seasonalMinus.addEventListener('click', () => {
      const activeEvent = getActiveEvent();
      if (!activeEvent) return;
      
      const current = getSeasonalCurrency();
      if (current > 0) {
        addSeasonalCurrency(-1);
        const newValue = getSeasonalCurrency();
        if (seasonalValue) seasonalValue.textContent = newValue;
        // Update main UI seasonal currency display
        const mainSeasonalDisplay = document.querySelector('.stat-capsule.seasonal-currency .stat-value');
        if (mainSeasonalDisplay) mainSeasonalDisplay.textContent = newValue;
        showDevFeedback(`${activeEvent.emoticon} ${newValue}`);
      }
    });
  }
  
  if (seasonalPlus) {
    seasonalPlus.addEventListener('click', () => {
      const activeEvent = getActiveEvent();
      if (!activeEvent) return;
      
      addSeasonalCurrency(1);
      const newValue = getSeasonalCurrency();
      if (seasonalValue) seasonalValue.textContent = newValue;
      // Update main UI seasonal currency display
      const mainSeasonalDisplay = document.querySelector('.stat-capsule.seasonal-currency .stat-value');
      if (mainSeasonalDisplay) mainSeasonalDisplay.textContent = newValue;
      showDevFeedback(`${activeEvent.emoticon} ${newValue}`);
    });
  }
}

/**
 * Update the diamond progress text in the main UI
 * @param {number} totalTasksCompleted - Total tasks completed
 */
function updateDiamondProgressText(totalTasksCompleted) {
  const progressElement = document.querySelector('.diamond-progress-info');
  if (progressElement) {
    const tasksUntilNext = CONFIG.TASKS_PER_DIAMOND - (totalTasksCompleted % CONFIG.TASKS_PER_DIAMOND);
    const progressText = tasksUntilNext === 1 
      ? 'Noch 1 Aufgabe bis +1 💎' 
      : `Noch ${tasksUntilNext} Aufgaben bis +1 💎`;
    progressElement.textContent = progressText;
  }
}

/**
 * Show brief dev feedback message
 * @param {string} message - Message to display
 */
function showDevFeedback(message) {
  // Remove any existing feedback
  const existingFeedback = document.querySelector('.dev-feedback');
  if (existingFeedback) {
    existingFeedback.remove();
  }
  
  const feedback = document.createElement('div');
  feedback.className = 'dev-feedback';
  feedback.textContent = message;
  document.body.appendChild(feedback);
  
  // Remove after animation (duration matches CSS animation timing)
  setTimeout(() => {
    feedback.remove();
  }, DEV_SETTINGS_CONFIG.FEEDBACK_DURATION);
}

/**
 * Close the settings popup
 */
function closeSettingsPopup() {
  const overlay = document.getElementById('settings-popup-overlay');
  if (overlay) {
    overlay.remove();
  }
  
  // Show diamond celebration popup if diamonds were earned from dev settings
  if (devDiamondsEarned > 0) {
    const diamondsToShow = devDiamondsEarned;
    devDiamondsEarned = 0; // Reset before showing popup
    showDiamondCelebrationPopup(diamondsToShow, CONFIG.TASKS_PER_DIAMOND);
  }
}

/**
 * Handle regenerate challenges action
 * Generates new daily challenges without resetting other data
 */
function handleRegenerateChallenges() {
  // Close settings popup
  closeSettingsPopup();
  
  // Generate new challenges
  resetChallenges();
  
  // Refresh challenges screen
  showScreen('challenges');
}

/**
 * Handle reset all data action
 * Shows confirmation popup before resetting
 */
function handleResetAllData() {
  // Close settings popup first
  closeSettingsPopup();
  
  // Show confirmation popup
  showResetConfirmationPopup();
}

/**
 * Show confirmation popup for resetting all data
 */
function showResetConfirmationPopup() {
  // Create popup overlay
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay confirmation-popup-overlay';
  overlay.id = 'reset-confirmation-popup-overlay';
  
  // Create popup card
  const popupCard = document.createElement('div');
  popupCard.className = 'popup-card confirmation-popup-card';
  
  popupCard.innerHTML = `
    <h2>⚠️ Achtung</h2>
    <p>Willst du wirklich allen Fortschritt löschen und den Streak und alle Diamanten entfernen?</p>
    <div class="confirmation-buttons">
      <button id="confirm-reset-button" class="btn-danger">Ja</button>
      <button id="cancel-reset-button" class="btn-secondary">Nein</button>
    </div>
  `;
  
  overlay.appendChild(popupCard);
  document.body.appendChild(overlay);
  
  // Add event listeners
  const confirmBtn = document.getElementById('confirm-reset-button');
  const cancelBtn = document.getElementById('cancel-reset-button');
  
  if (confirmBtn) confirmBtn.addEventListener('click', executeFullReset);
  if (cancelBtn) cancelBtn.addEventListener('click', closeResetConfirmationPopup);
}

/**
 * Close the reset confirmation popup
 */
function closeResetConfirmationPopup() {
  const overlay = document.getElementById('reset-confirmation-popup-overlay');
  if (overlay) {
    overlay.remove();
  }
}

/**
 * Execute full reset of all save data
 */
function executeFullReset() {
  // Close confirmation popup
  closeResetConfirmationPopup();
  
  // Clear all data
  clearAllData();
  
  // Generate new challenges
  resetChallenges();
  
  // Apply default background after reset
  applySelectedBackground();
  
  // Refresh challenges screen
  showScreen('challenges');
}

/**
 * Create standard backgrounds tab content
 */
function createStandardBackgroundsTab(backgrounds, selectedBg) {
  let html = '<div class="backgrounds-grid">';
  
  backgrounds.forEach(bg => {
    const state = bg.state;
    const isDefault = bg.isDefault;
    
    let tileClass = 'background-tile';
    tileClass += ` state-${state}`;
    
    if (state === BACKGROUND_STATE.UNLOCKED || state === BACKGROUND_STATE.ACTIVE) {
      tileClass += ' unlocked';
    }
    if (state === BACKGROUND_STATE.LOCKED) {
      tileClass += ' locked';
    }
    if (state === BACKGROUND_STATE.ACTIVE) {
      tileClass += ' selected';
    }
    if (state === BACKGROUND_STATE.PURCHASABLE) {
      tileClass += ' purchasable';
    }
    
    let costHtml = '';
    if (isDefault) {
      costHtml = '<span class="background-cost">✓ Gratis</span>';
    } else if (state === BACKGROUND_STATE.ACTIVE || state === BACKGROUND_STATE.UNLOCKED) {
      costHtml = '<span class="background-cost">✓ Freigeschaltet</span>';
    } else if (state === BACKGROUND_STATE.PURCHASABLE) {
      costHtml = `<span class="background-cost">💎 ${bg.cost}</span>`;
    } else if (state === BACKGROUND_STATE.LOCKED) {
      const tasksText = bg.tasksRemaining === 1 ? 'Aufgabe' : 'Aufgaben';
      costHtml = `<span class="background-cost background-locked-text">Noch ${bg.tasksRemaining} ${tasksText} nötig</span>`;
    }
    
    let activeBadge = state === BACKGROUND_STATE.ACTIVE ? '<div class="background-selected-badge">Aktiv</div>' : '';
    let lockIcon = state === BACKGROUND_STATE.LOCKED ? '<div class="background-lock-icon">🔒</div>' : '';
    let newBadge = (state === BACKGROUND_STATE.PURCHASABLE && bg.isNewlyPurchasable) ? '<div class="background-new-badge">NEU</div>' : '';
    
    html += `
      <div class="${tileClass}" data-bg-id="${bg.id}" data-is-seasonal="false">
        <img src="./assets/${bg.file}" alt="${bg.name}" class="background-preview">
        ${lockIcon}
        ${activeBadge}
        ${newBadge}
        <div class="background-info">
          <div class="background-name">${bg.name}</div>
          ${costHtml}
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  return html;
}

/**
 * Create packs tab content
 */
function createPacksTab(packStatuses, selectedBg, streakStones) {
  let html = '<div class="packs-container">';
  
  // Show unlocked packs first
  packStatuses.unlocked.forEach(pack => {
    html += createPackSection(pack, selectedBg, streakStones, true);
  });
  
  // Then show locked packs
  packStatuses.locked.forEach(pack => {
    html += createPackSection(pack, selectedBg, streakStones, false);
  });
  
  html += '</div>';
  return html;
}

/**
 * Create a single pack section
 */
function createPackSection(pack, selectedBg, streakStones, isUnlocked) {
  let html = `<div class="pack-section ${isUnlocked ? 'unlocked' : 'locked'}" data-pack-id="${pack.id}">`;
  html += `<h3 class="pack-title">${pack.name}</h3>`;
  
  // Show unlock button if not unlocked
  if (!isUnlocked) {
    const canAfford = streakStones >= pack.cost;
    const buttonClass = canAfford ? 'pack-unlock-button' : 'pack-unlock-button disabled';
    html += `
      <button class="${buttonClass}" data-pack-id="${pack.id}">
        <span>🫧 ${pack.cost}</span>
        <span>Pack freischalten</span>
      </button>
    `;
  }
  
  // Show backgrounds in pack
  html += '<div class="pack-backgrounds-grid">';
  
  if (isUnlocked) {
    const backgrounds = getPackBackgroundsWithStates(pack.id, pack.tasksSinceUnlock);
    backgrounds.forEach(bg => {
      html += createPackBackgroundTile(bg, selectedBg, isUnlocked);
    });
  } else {
    // Show locked preview of backgrounds
    pack.backgrounds.forEach(bg => {
      html += createPackBackgroundTile(bg, selectedBg, false);
    });
  }
  
  html += '</div>';
  html += '</div>';
  return html;
}

/**
 * Create a background tile for a pack
 */
function createPackBackgroundTile(bg, selectedBg, isPackUnlocked) {
  const isActive = selectedBg.id === bg.id;
  
  let tileClass = 'background-tile pack-background-tile';
  let costHtml = '';
  let statusHtml = '';
  let lockIcon = '';
  
  if (!isPackUnlocked) {
    tileClass += ' pack-locked';
    lockIcon = '<div class="background-lock-icon">🔒</div>';
    costHtml = '<span class="background-cost background-locked-text">Pack gesperrt</span>';
  } else if (isActive) {
    tileClass += ' state-active selected';
    costHtml = '<span class="background-cost">✓ Aktiv</span>';
    statusHtml = '<div class="background-selected-badge">Aktiv</div>';
  } else if (bg.isUnlocked) {
    tileClass += ' state-unlocked unlocked';
    costHtml = '<span class="background-cost">✓ Freigeschaltet</span>';
  } else if (bg.hasEnoughTasks) {
    tileClass += ' state-purchasable purchasable';
    costHtml = `<span class="background-cost">💎 ${bg.cost}</span>`;
  } else {
    tileClass += ' state-locked locked';
    const tasksText = bg.tasksRemaining === 1 ? 'Aufgabe' : 'Aufgaben';
    costHtml = `<span class="background-cost background-locked-text">Noch ${bg.tasksRemaining} ${tasksText} nötig</span>`;
    lockIcon = '<div class="background-lock-icon">🔒</div>';
  }
  
  return `
    <div class="${tileClass}" data-bg-id="${bg.id}" data-is-pack="true">
      <img src="./assets/${bg.file}" alt="${bg.name}" class="background-preview">
      ${lockIcon}
      ${statusHtml}
      <div class="background-info">
        <div class="background-name">${bg.name}</div>
        ${costHtml}
      </div>
    </div>
  `;
}

/**
 * Create seasonal tab content
 */
function createSeasonalTab(seasonalBackgrounds, selectedBg, activeEvent) {
  let html = '';
  
  if (!activeEvent) {
    // Show "no event active" message
    html = `
      <div class="no-event-message">
        <p>🎈 Derzeit läuft kein saisonales Event.</p>
        <p>Schau bald wieder vorbei!</p>
      </div>
    `;
  } else if (seasonalBackgrounds.length === 0) {
    html = `
      <div class="no-event-message">
        <p>${activeEvent.emoticon} ${activeEvent.name}-Event läuft!</p>
        <p>Keine Hintergründe verfügbar.</p>
      </div>
    `;
  } else {
    html = '<div class="seasonal-backgrounds-grid">';
    
    seasonalBackgrounds.forEach(bg => {
      const isUnlocked = bg.isUnlocked;
      const hasEnoughTasks = bg.hasEnoughTasks;
      const isActive = selectedBg.id === bg.id;
      
      let tileClass = 'background-tile seasonal-tile';
      let costHtml = '';
      let statusHtml = '';
      let lockIcon = '';
      let newBadge = '';
      
      if (isActive) {
        tileClass += ' state-active selected';
        costHtml = '<span class="background-cost">✓ Aktiv</span>';
        statusHtml = '<div class="background-selected-badge">Aktiv</div>';
      } else if (isUnlocked) {
        tileClass += ' state-unlocked unlocked';
        costHtml = '<span class="background-cost">✓ Freigeschaltet</span>';
      } else if (!hasEnoughTasks) {
        tileClass += ' state-locked locked';
        const tasksText = bg.tasksRemaining === 1 ? 'Aufgabe' : 'Aufgaben';
        costHtml = `<span class="background-cost background-locked-text">Noch ${bg.tasksRemaining} ${tasksText} nötig</span>`;
        lockIcon = '<div class="background-lock-icon">🔒</div>';
      } else {
        tileClass += ' state-purchasable purchasable seasonal-purchasable';
        costHtml = `<span class="background-cost">${activeEvent.emoticon} ${bg.cost}</span>`;
        if (bg.isNewlyPurchasable) {
          newBadge = '<div class="background-new-badge">NEU</div>';
        }
      }
      
      html += `
        <div class="${tileClass}" data-bg-id="${bg.id}" data-is-seasonal="true">
          <img src="./assets/${bg.file}" alt="${bg.name}" class="background-preview">
          ${lockIcon}
          ${statusHtml}
          ${newBadge}
          <div class="background-info">
            <div class="background-name">${bg.name}</div>
            ${costHtml}
          </div>
        </div>
      `;
    });
    
    html += '</div>';
  }
  
  return html;
}

/**
 * Show background shop popup with 3-tab system
 * Tab 1: Standard & Default backgrounds
 * Tab 2: Background Packs
 * Tab 3: Seasonal backgrounds
 * @param {string|null} scrollToBackgroundId - Optional background ID to scroll to and highlight
 * @param {string} initialTab - Initial tab to show ('standard', 'packs', or 'seasonal')
 */
function showBackgroundShopPopup(scrollToBackgroundId = null, initialTab = 'standard') {
  const backgrounds = getAllBackgrounds();
  const selectedBg = getSelectedBackground();
  const diamonds = loadDiamonds();
  const streakStones = getStreakStones();
  
  // Get seasonal event info
  const activeEvent = getActiveEvent();
  const seasonalCurrency = activeEvent ? getSeasonalCurrency() : 0;
  const seasonalBackgrounds = activeEvent ? getAllActiveSeasonalBackgrounds() : [];
  
  // Get pack info
  const packStatuses = getAllPackStatuses();
  
  // Create popup overlay
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay background-shop-overlay';
  overlay.id = 'background-shop-overlay';
  
  // Create popup card
  const popupCard = document.createElement('div');
  popupCard.className = 'popup-card background-shop-card';
  
  // Create header with currencies
  let currencyDisplayHtml = `
    <div class="background-shop-diamonds">
      <span>💎</span>
      <span id="shop-diamond-count">${diamonds}</span>
    </div>
    <div class="background-shop-diamonds">
      <span>🫧</span>
      <span id="shop-streak-stone-count">${streakStones}</span>
    </div>
  `;
  
  if (activeEvent) {
    currencyDisplayHtml += `
      <div class="background-shop-seasonal-currency">
        <span>${activeEvent.emoticon}</span>
        <span id="shop-seasonal-count">${seasonalCurrency}</span>
      </div>
    `;
  }
  
  // Create tab navigation
  const tabsHtml = `
    <div class="shop-tabs">
      <button class="shop-tab ${initialTab === 'standard' ? 'active' : ''}" data-tab="standard">
        Standard
      </button>
      <button class="shop-tab ${initialTab === 'packs' ? 'active' : ''}" data-tab="packs">
        Pakete
      </button>
      <button class="shop-tab ${initialTab === 'seasonal' ? 'active' : ''}" data-tab="seasonal">
        Saisonal
      </button>
    </div>
  `;
  
  // Create standard backgrounds content
  const standardBackgroundsHtml = createStandardBackgroundsTab(backgrounds, selectedBg);
  
  // Create packs content
  const packsHtml = createPacksTab(packStatuses, selectedBg, streakStones);
  
  // Create seasonal content
  const seasonalHtml = createSeasonalTab(seasonalBackgrounds, selectedBg, activeEvent);
  
  popupCard.innerHTML = `
    <div class="background-shop-header-fixed">
      <h2>🎨 Hintergründe</h2>
      <div class="background-shop-header">
        ${currencyDisplayHtml}
      </div>
      ${tabsHtml}
    </div>
    <div class="background-shop-scrollable">
      <div class="shop-tab-content ${initialTab === 'standard' ? 'active' : ''}" data-tab-content="standard">
        ${standardBackgroundsHtml}
      </div>
      <div class="shop-tab-content ${initialTab === 'packs' ? 'active' : ''}" data-tab-content="packs">
        ${packsHtml}
      </div>
      <div class="shop-tab-content ${initialTab === 'seasonal' ? 'active' : ''}" data-tab-content="seasonal">
        ${seasonalHtml}
      </div>
    </div>
    <button id="close-background-shop" class="btn-secondary background-shop-close">Schließen</button>
  `;
  
  overlay.appendChild(popupCard);
  document.body.appendChild(overlay);
  
  // Prevent body scrolling when shop is open
  document.body.style.overflow = 'hidden';
  
  // Add tab switching handlers
  const tabButtons = popupCard.querySelectorAll('.shop-tab');
  const tabContents = popupCard.querySelectorAll('.shop-tab-content');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.dataset.tab;
      
      // Remove active from all tabs and contents
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Add active to clicked tab and corresponding content
      button.classList.add('active');
      const content = popupCard.querySelector(`[data-tab-content="${tabName}"]`);
      if (content) {
        content.classList.add('active');
      }
    });
  });
  
  // Add click handlers for standard background tiles
  const regularTiles = popupCard.querySelectorAll('.background-tile[data-is-seasonal="false"]:not([data-is-pack="true"])');
  regularTiles.forEach(tile => {
    const bgId = tile.dataset.bgId;
    const bg = backgrounds.find(b => b.id === bgId);
    
    if (bg && bg.state !== BACKGROUND_STATE.LOCKED) {
      tile.addEventListener('click', () => {
        handleBackgroundTileClick(bgId);
      });
    }
  });
  
  // Add click handlers for seasonal tiles
  const seasonalTiles = popupCard.querySelectorAll('.background-tile[data-is-seasonal="true"]');
  seasonalTiles.forEach(tile => {
    const bgId = tile.dataset.bgId;
    const bg = seasonalBackgrounds.find(b => b.id === bgId);
    
    if (bg && (bg.isUnlocked || bg.hasEnoughTasks)) {
      tile.addEventListener('click', () => {
        handleSeasonalBackgroundTileClick(bgId);
      });
    }
  });
  
  // Add pack unlock button handlers
  const packUnlockButtons = popupCard.querySelectorAll('.pack-unlock-button');
  packUnlockButtons.forEach(button => {
    const packId = button.dataset.packId;
    button.addEventListener('click', () => {
      handlePackUnlock(packId, overlay);
    });
  });
  
  // Add click handlers for pack background tiles
  const packTiles = popupCard.querySelectorAll('.background-tile[data-is-pack="true"]');
  packTiles.forEach(tile => {
    const bgId = tile.dataset.bgId;
    tile.addEventListener('click', () => {
      handlePackBackgroundTileClick(bgId);
    });
  });
  
  // Add close button handler
  const closeBtn = document.getElementById('close-background-shop');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeBackgroundShopPopup);
  }
}

/**
 * Close the background shop popup
 */
function closeBackgroundShopPopup() {
  const overlay = document.getElementById('background-shop-overlay');
  if (overlay) {
    overlay.remove();
  }
  
  // Re-enable body scrolling when shop closes
  document.body.style.overflow = '';
  
  // Mark shop as opened to hide NEW badge after closing
  markShopOpenedWithNewBackgrounds();
  // Update the list of known purchasable backgrounds (marks them as "seen")
  updateKnownPurchasableBackgrounds();
  updateKnownSeasonalPurchasableBackgrounds();
  
  // Update shop button to remove NEW badge class
  const shopButton = document.getElementById('shop-button');
  if (shopButton) {
    shopButton.classList.remove('has-new-badge');
    // Also remove the badge HTML
    const badgeElement = shopButton.querySelector('.shop-new-badge');
    if (badgeElement) {
      badgeElement.remove();
    }
  }
}

/**
 * Handle click on a background tile
 * Only called for non-locked backgrounds (purchasable, unlocked, or active)
 * @param {string} bgId - The ID of the clicked background
 */
function handleBackgroundTileClick(bgId) {
  const backgrounds = getAllBackgrounds();
  const bg = backgrounds.find(b => b.id === bgId);
  if (!bg) return;
  
  const state = bg.state;
  
  if (state === BACKGROUND_STATE.ACTIVE) {
    // Already active, do nothing
    return;
  }
  
  if (state === BACKGROUND_STATE.UNLOCKED) {
    // Background is unlocked - show selection confirmation
    showBackgroundSelectConfirmPopup(bg);
  } else if (state === BACKGROUND_STATE.PURCHASABLE) {
    // Background is purchasable - show unlock/purchase confirmation
    showBackgroundUnlockConfirmPopup(bg);
  }
  // Note: LOCKED state tiles are not clickable, so no handler needed
}

/**
 * Handle click on a seasonal background tile
 * @param {string} bgId - The ID of the seasonal background
 */
function handleSeasonalBackgroundTileClick(bgId) {
  const seasonalBackgrounds = getAllActiveSeasonalBackgrounds();
  const bg = seasonalBackgrounds.find(b => b.id === bgId);
  if (!bg) return;
  
  const selectedBg = getSelectedBackground();
  const isActive = selectedBg.id === bgId;
  
  if (isActive) {
    // Already active, do nothing
    return;
  }
  
  if (bg.isUnlocked) {
    // Seasonal background is unlocked - show selection confirmation
    showSeasonalBackgroundSelectConfirmPopup(bg);
  } else if (bg.hasEnoughTasks && bg.canAfford) {
    // Seasonal background is purchasable - show unlock confirmation
    showSeasonalBackgroundUnlockConfirmPopup(bg);
  } else if (bg.hasEnoughTasks) {
    // Has enough tasks but not enough currency
    showNotEnoughSeasonalCurrencyHint();
  }
}

/**
 * Show popup to confirm selecting a seasonal background
 * @param {Object} background - The seasonal background object
 */
function showSeasonalBackgroundSelectConfirmPopup(background) {
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay background-confirm-overlay';
  overlay.id = 'seasonal-background-select-confirm-overlay';
  
  const popupCard = document.createElement('div');
  popupCard.className = 'popup-card background-confirm-card';
  
  popupCard.innerHTML = `
    <h2>Hintergrund wählen?</h2>
    <img src="./assets/${background.file}" alt="${background.name}" class="background-confirm-preview">
    <p><strong>${background.name}</strong></p>
    <p class="seasonal-warning">⚠️ Dieser Hintergrund ist nur während des Events verfügbar.</p>
    <div class="background-confirm-buttons">
      <button id="confirm-seasonal-select-button" class="btn-primary">Ja</button>
      <button id="cancel-seasonal-select-button" class="btn-secondary">Nein</button>
    </div>
  `;
  
  overlay.appendChild(popupCard);
  document.body.appendChild(overlay);
  
  const confirmBtn = document.getElementById('confirm-seasonal-select-button');
  const cancelBtn = document.getElementById('cancel-seasonal-select-button');
  
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      // Select the seasonal background
      saveSelectedBackgroundToStorage(background.id);
      applySeasonalBackground(background);
      
      overlay.remove();
      closeBackgroundShopPopup();
      showBackgroundShopPopup();
    });
  }
  
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      overlay.remove();
    });
  }
}

/**
 * Show popup to confirm unlocking a seasonal background
 * @param {Object} background - The seasonal background object
 */
function showSeasonalBackgroundUnlockConfirmPopup(background) {
  const activeEvent = getActiveEvent();
  if (!activeEvent) return;
  
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay background-confirm-overlay';
  overlay.id = 'seasonal-background-unlock-confirm-overlay';
  
  const popupCard = document.createElement('div');
  popupCard.className = 'popup-card background-confirm-card';
  
  popupCard.innerHTML = `
    <h2>Hintergrund freischalten?</h2>
    <img src="./assets/${background.file}" alt="${background.name}" class="background-confirm-preview">
    <p><strong>${background.name}</strong></p>
    <div class="background-confirm-cost seasonal-cost">
      <span>${activeEvent.emoticon}</span>
      <span>${background.cost} ${activeEvent.currencyName}</span>
    </div>
    <p class="seasonal-warning">⚠️ Dieser Hintergrund ist nur während des Events verfügbar.</p>
    <div class="background-confirm-buttons">
      <button id="confirm-seasonal-unlock-button" class="btn-primary">Freischalten</button>
      <button id="cancel-seasonal-unlock-button" class="btn-secondary">Abbrechen</button>
    </div>
  `;
  
  overlay.appendChild(popupCard);
  document.body.appendChild(overlay);
  
  const confirmBtn = document.getElementById('confirm-seasonal-unlock-button');
  const cancelBtn = document.getElementById('cancel-seasonal-unlock-button');
  
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      const result = unlockSeasonalBackground(background.id);
      
      overlay.remove();
      
      if (result.success) {
        closeBackgroundShopPopup();
        showBackgroundShopPopup();
        createConfettiEffect();
      }
    });
  }
  
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      overlay.remove();
    });
  }
}

/**
 * Apply a seasonal background
 * @param {Object} background - The seasonal background object
 */
function applySeasonalBackground(background) {
  const backgroundPath = `./assets/${background.file}`;
  document.documentElement.style.setProperty('--selected-background', `url('${backgroundPath}')`);
}

/**
 * Show a hint when player doesn't have enough seasonal currency
 */
function showNotEnoughSeasonalCurrencyHint() {
  const activeEvent = getActiveEvent();
  if (!activeEvent) return;
  
  // Remove any existing hint
  const existingHint = document.querySelector('.not-enough-currency-hint');
  if (existingHint) {
    existingHint.remove();
  }
  
  // Create hint element
  const hint = document.createElement('div');
  hint.className = 'not-enough-currency-hint not-enough-diamonds-hint';
  hint.textContent = `${activeEvent.emoticon} Nicht genug ${activeEvent.currencyName}!`;
  
  document.body.appendChild(hint);
  
  // Remove after animation completes (3 seconds)
  setTimeout(() => {
    hint.remove();
  }, 3000);
}

/**
 * Handle pack unlock button click
 * @param {string} packId - The pack ID to unlock
 * @param {HTMLElement} overlay - The shop overlay element
 */
function handlePackUnlock(packId, overlay) {
  const result = unlockPack(packId);
  
  if (result.needsStreakStones) {
    showNotEnoughStreakStonesPopup(result.required, result.current);
  } else if (result.success) {
    // Refresh shop to show unlocked pack
    closeBackgroundShopPopup();
    showBackgroundShopPopup(null, 'packs');
  }
}

/**
 * Show "not enough streak stones" popup
 * @param {number} required - Required streak stones
 * @param {number} current - Current streak stones
 */
function showNotEnoughStreakStonesPopup(required, current) {
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay';
  overlay.id = 'not-enough-streak-stones-overlay';
  
  const popupCard = document.createElement('div');
  popupCard.className = 'popup-card';
  
  popupCard.innerHTML = `
    <h2>Nicht genug Streak-Steine!</h2>
    <p>Du benötigst <strong>${required} 🫧</strong> aber hast nur <strong>${current} 🫧</strong>.</p>
    <p>Erreiche Streak-Meilensteine, um mehr Streak-Steine zu verdienen!</p>
    <button id="close-not-enough-stones" class="btn-primary">OK</button>
  `;
  
  overlay.appendChild(popupCard);
  document.body.appendChild(overlay);
  
  document.getElementById('close-not-enough-stones').addEventListener('click', () => {
    overlay.remove();
  });
}

/**
 * Handle click on a pack background tile
 * @param {string} bgId - The ID of the pack background
 */
function handlePackBackgroundTileClick(bgId) {
  // Get pack backgrounds by finding which pack this background belongs to
  const allPacks = getAllPackStatuses();
  let targetBg = null;
  let packUnlocked = false;
  
  for (const pack of allPacks.unlocked) {
    const backgrounds = getPackBackgroundsWithStates(pack.id, pack.tasksSinceUnlock);
    targetBg = backgrounds.find(b => b.id === bgId);
    if (targetBg) {
      packUnlocked = true;
      break;
    }
  }
  
  if (!targetBg || !packUnlocked) {
    return; // Pack not unlocked or background not found
  }
  
  const selectedBg = getSelectedBackground();
  const isActive = selectedBg.id === bgId;
  
  if (isActive) {
    return; // Already active
  }
  
  if (targetBg.isUnlocked) {
    // Background is unlocked - select it
    selectBackground(bgId);
    closeBackgroundShopPopup();
    showBackgroundShopPopup(null, 'packs');
  } else if (targetBg.hasEnoughTasks) {
    // Background is purchasable - show unlock confirmation
    showPackBackgroundUnlockConfirmPopup(targetBg);
  }
}

/**
 * Show popup to confirm unlocking a pack background
 * @param {Object} background - The pack background object
 */
function showPackBackgroundUnlockConfirmPopup(background) {
  const diamonds = loadDiamonds();
  const canAfford = diamonds >= background.cost;
  
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay background-confirm-overlay';
  overlay.id = 'pack-background-unlock-confirm-overlay';
  
  const popupCard = document.createElement('div');
  popupCard.className = 'popup-card background-confirm-card';
  
  let buttonHtml;
  if (canAfford) {
    buttonHtml = `
      <button id="confirm-pack-bg-unlock-button" class="btn-primary">Ja, freischalten</button>
      <button id="cancel-pack-bg-unlock-button" class="btn-secondary">Nein</button>
    `;
  } else {
    buttonHtml = `<button id="close-pack-bg-unlock-button" class="btn-primary">OK</button>`;
  }
  
  let messageHtml = canAfford ? '' : '<p class="not-enough-diamonds-message">Nicht genug Diamanten!</p>';
  
  popupCard.innerHTML = `
    <h2>Hintergrund freischalten?</h2>
    <img src="./assets/${background.file}" alt="${background.name}" class="background-confirm-preview">
    <p><strong>${background.name}</strong></p>
    <div class="background-confirm-cost">
      <span>💎</span>
      <span>${background.cost} Diamanten</span>
    </div>
    ${messageHtml}
    <div class="background-confirm-buttons">
      ${buttonHtml}
    </div>
  `;
  
  overlay.appendChild(popupCard);
  document.body.appendChild(overlay);
  
  if (canAfford) {
    const confirmBtn = document.getElementById('confirm-pack-bg-unlock-button');
    const cancelBtn = document.getElementById('cancel-pack-bg-unlock-button');
    
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        const result = unlockBackground(background.id);
        if (result.success) {
          playBackgroundPurchased();
          overlay.remove();
          closeBackgroundShopPopup();
          showBackgroundShopPopup(null, 'packs');
        }
      });
    }
    
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        overlay.remove();
      });
    }
  } else {
    const closeBtn = document.getElementById('close-pack-bg-unlock-button');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        overlay.remove();
      });
    }
  }
}

/**
 * Show popup to confirm unlocking a background
 * @param {Object} background - The background object to unlock
 */
function showBackgroundUnlockConfirmPopup(background) {
  const diamonds = loadDiamonds();
  const canAfford = diamonds >= background.cost;
  
  // Create popup overlay
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay background-confirm-overlay';
  overlay.id = 'background-unlock-confirm-overlay';
  
  // Create popup card
  const popupCard = document.createElement('div');
  popupCard.className = 'popup-card background-confirm-card';
  
  let buttonHtml;
  let messageHtml = '';
  
  if (canAfford) {
    buttonHtml = `
      <button id="confirm-unlock-button" class="btn-primary">Freischalten</button>
      <button id="cancel-unlock-button" class="btn-secondary">Abbrechen</button>
    `;
  } else {
    buttonHtml = `
      <button id="cancel-unlock-button" class="btn-secondary">OK</button>
    `;
    messageHtml = `<p class="no-diamond-text">Du brauchst ${background.cost - diamonds} weitere 💎</p>`;
  }
  
  popupCard.innerHTML = `
    <h2>Hintergrund freischalten?</h2>
    <img src="./assets/${background.file}" alt="${background.name}" class="background-confirm-preview">
    <p><strong>${background.name}</strong></p>
    <div class="background-confirm-cost">
      <span>💎</span>
      <span>${background.cost} Diamanten</span>
    </div>
    ${messageHtml}
    <div class="background-confirm-buttons">
      ${buttonHtml}
    </div>
  `;
  
  overlay.appendChild(popupCard);
  document.body.appendChild(overlay);
  
  // Add event listeners
  const confirmBtn = document.getElementById('confirm-unlock-button');
  const cancelBtn = document.getElementById('cancel-unlock-button');
  
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      executeBackgroundUnlock(background.id);
    });
  }
  
  if (cancelBtn) {
    cancelBtn.addEventListener('click', closeBackgroundUnlockConfirmPopup);
  }
}

/**
 * Close the background unlock confirmation popup
 */
function closeBackgroundUnlockConfirmPopup() {
  const overlay = document.getElementById('background-unlock-confirm-overlay');
  if (overlay) {
    overlay.remove();
  }
}

/**
 * Execute background unlock
 * @param {string} bgId - The ID of the background to unlock
 */
function executeBackgroundUnlock(bgId) {
  const result = unlockBackground(bgId);
  
  // Close the confirmation popup
  closeBackgroundUnlockConfirmPopup();
  
  if (result.success) {
    // Play purchase sound
    playBackgroundPurchased();
    
    // Update the shop display
    closeBackgroundShopPopup();
    showBackgroundShopPopup();
    
    // Update diamond count in challenges header if visible
    updateDiamondDisplayInHeader();
    
    // Show unlock animation on the tile
    const tile = document.querySelector(`.background-tile[data-bg-id="${bgId}"]`);
    if (tile) {
      tile.classList.add('background-unlock-animation');
    }
    
    // Add confetti celebration
    createConfettiEffect();
  } else if (result.notEnoughDiamonds) {
    showNotEnoughDiamondsHint();
  }
}

/**
 * Show popup to confirm selecting a background
 * @param {Object} background - The background object to select
 */
function showBackgroundSelectConfirmPopup(background) {
  // Create popup overlay
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay background-confirm-overlay';
  overlay.id = 'background-select-confirm-overlay';
  
  // Create popup card
  const popupCard = document.createElement('div');
  popupCard.className = 'popup-card background-confirm-card';
  
  popupCard.innerHTML = `
    <h2>Hintergrund wählen?</h2>
    <img src="./assets/${background.file}" alt="${background.name}" class="background-confirm-preview">
    <p><strong>${background.name}</strong></p>
    <p>Möchtest du diesen Hintergrund verwenden?</p>
    <div class="background-confirm-buttons">
      <button id="confirm-select-button" class="btn-primary">Ja</button>
      <button id="cancel-select-button" class="btn-secondary">Nein</button>
    </div>
  `;
  
  overlay.appendChild(popupCard);
  document.body.appendChild(overlay);
  
  // Add event listeners
  const confirmBtn = document.getElementById('confirm-select-button');
  const cancelBtn = document.getElementById('cancel-select-button');
  
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      executeBackgroundSelect(background.id);
    });
  }
  
  if (cancelBtn) {
    cancelBtn.addEventListener('click', closeBackgroundSelectConfirmPopup);
  }
}

/**
 * Close the background select confirmation popup
 */
function closeBackgroundSelectConfirmPopup() {
  const overlay = document.getElementById('background-select-confirm-overlay');
  if (overlay) {
    overlay.remove();
  }
}

/**
 * Execute background selection
 * @param {string} bgId - The ID of the background to select
 */
function executeBackgroundSelect(bgId) {
  const result = selectBackground(bgId);
  
  // Close the confirmation popup
  closeBackgroundSelectConfirmPopup();
  
  if (result.success) {
    // Apply the new background immediately
    applySelectedBackground();
    
    // Update the shop display
    closeBackgroundShopPopup();
    showBackgroundShopPopup();
  }
}

/**
 * Show a hint when player doesn't have enough diamonds
 */
function showNotEnoughDiamondsHint() {
  // Remove any existing hint
  const existingHint = document.querySelector('.not-enough-diamonds-hint');
  if (existingHint) {
    existingHint.remove();
  }
  
  // Create hint element
  const hint = document.createElement('div');
  hint.className = 'not-enough-diamonds-hint';
  hint.textContent = '💎 Nicht genug Diamanten!';
  
  document.body.appendChild(hint);
  
  // Remove after animation completes (3 seconds)
  setTimeout(() => {
    hint.remove();
  }, 3000);
}

/**
 * Update the diamond display in the challenges header
 */
function updateDiamondDisplayInHeader() {
  const diamondInfo = getDiamondInfo();
  const diamondValueElement = document.querySelector('.header-stats .stat-capsule:last-child .stat-value');
  if (diamondValueElement) {
    diamondValueElement.textContent = diamondInfo.current;
  }
}

// Router Skeleton (kept for future use)
class Router {
  constructor() {
    this.routes = {};
    this.currentRoute = null;
  }
  
  addRoute(path, handler) {
    this.routes[path] = handler;
  }
  
  navigate(path) {
    this.currentRoute = path;
    if (this.routes[path]) {
      this.routes[path]();
    }
  }
  
  loadRoute(path) {
    this.navigate(path);
  }
  
  handlePopState() {
    // Handle browser back/forward
  }
}

// App Klasse
class KopfnussApp {
  constructor() {
    this.router = new Router();
  }
  
  init() {
    this.setupRoutes();
    this.setupEventListeners();
    this.loadInitialRoute();
  }
  
  setupRoutes() {
    this.router.addRoute('/', () => showScreen('challenges'));
    this.router.addRoute('/challenges', () => showScreen('challenges'));
    this.router.addRoute('/stats', () => showScreen('stats'));
  }
  
  setupEventListeners() {
    // Online/Offline Events
    window.addEventListener('online', () => {
      document.getElementById('offline-indicator')?.classList.add('hidden');
    });
    
    window.addEventListener('offline', () => {
      document.getElementById('offline-indicator')?.classList.remove('hidden');
    });
  }
  
  loadInitialRoute() {
    // Check streak status BEFORE loading the challenges screen
    // This must happen first so we know what popup to show
    const streakStatus = checkStreakStatusOnLoad();
    
    // Load challenges screen by default
    showScreen('challenges');
    
    // Check for seasonal event popups first (before streak popups)
    // Handle event end popup first (background reset), then event start popup
    const eventEndResult = shouldShowEventEndPopup();
    const backgroundResetResult = checkAndResetSeasonalBackground();
    
    // Apply the default background if a seasonal background was reset
    if (backgroundResetResult.wasReset) {
      applySelectedBackground();
    }
    
    // Chain of popups: event end -> event start -> streak
    const showEventEndPopupIfNeeded = () => {
      if (eventEndResult.shouldShow) {
        setTimeout(() => {
          showEventEndPopup(eventEndResult.event, backgroundResetResult.wasReset, () => {
            showEventStartPopupIfNeeded();
          });
        }, ANIMATION_TIMING.INITIAL_POPUP_DELAY);
      } else {
        showEventStartPopupIfNeeded();
      }
    };
    
    const showEventStartPopupIfNeeded = () => {
      if (shouldShowEventStartPopup()) {
        setTimeout(() => {
          showEventStartPopup(() => {
            showStreakPopupIfNeeded();
          });
        }, ANIMATION_TIMING.INITIAL_POPUP_DELAY);
      } else {
        showStreakPopupIfNeeded();
      }
    };
    
    const showStreakPopupIfNeeded = () => {
      if (streakStatus.showPopup && !wasStreakStatusHandledToday()) {
        setTimeout(() => {
          showStreakPopupForStatus(streakStatus);
        }, ANIMATION_TIMING.INITIAL_POPUP_DELAY);
      }
    };
    
    // Start the popup chain
    showEventEndPopupIfNeeded();
  }
  
  handleOfflineStatus() {
    const offlineIndicator = document.getElementById('offline-indicator');
    if (offlineIndicator) {
      if (navigator.onLine) {
        offlineIndicator.classList.add('hidden');
      } else {
        offlineIndicator.classList.remove('hidden');
      }
    }
  }
}

// App initialisieren wenn DOM bereit ist
// Note: With top-level await in balancingLoader.js, DOMContentLoaded may have already fired
// by the time this module executes. We need to check readyState to handle both cases.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const app = new KopfnussApp();
    app.init();
  });
} else {
  // DOM is already ready, init immediately
  const app = new KopfnussApp();
  app.init();
}

// Exports für Module
export { Router, KopfnussApp };

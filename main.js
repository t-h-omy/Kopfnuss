// Kopfnuss - Main Application Entry Point
// Routing und App-Initialisierung

import { getTodaysChallenges, areAllChallengesCompleted, resetChallenges } from './logic/challengeGenerator.js';
import { 
  getStreakInfo, 
  checkStreakStatusOnLoad, 
  markStreakStatusHandled, 
  wasStreakStatusHandledToday,
  restoreExpiredStreak,
  acceptStreakLoss,
  unfreezeStreakByChallenge,
  STREAK_LOSS_REASON
} from './logic/streakManager.js';
import { getDiamondInfo, updateDiamonds, addDiamonds, loadDiamonds } from './logic/diamondManager.js';
import { clearAllData } from './logic/storageManager.js';
import { VERSION } from './version.js';
import { CONFIG, BACKGROUNDS } from './data/balancing.js';
import { ANIMATION_TIMING, RESIZE_CONFIG, VISUAL_CONFIG } from './data/constants.js';
import { 
  scrollToAndHighlightChallenge, 
  scrollToAndHighlightRewardButton 
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
  checkForNewlyPurchasableBackgrounds
} from './logic/backgroundManager.js';

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

// Apply selected background on load
applySelectedBackground();

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
let streakWasUnfrozen = false; // Track if streak was unfrozen during challenge completion
let streakWasIncremented = false; // Track if streak was incremented during challenge completion
let lastUsedGraphicIndex = -1; // Track last used background graphic for variety

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
 * Find the index of the currently unlocked (available or in_progress) challenge
 * @param {Array} challenges - Array of challenge objects
 * @returns {number} Index of the current unlocked challenge, or -1 if none found
 */
function findCurrentUnlockedChallengeIndex(challenges) {
  // First, look for an in_progress challenge
  const inProgressIndex = challenges.findIndex(c => c.state === 'in_progress');
  if (inProgressIndex !== -1) {
    return inProgressIndex;
  }
  
  // Then, look for the first available challenge
  const availableIndex = challenges.findIndex(c => c.state === 'available');
  if (availableIndex !== -1) {
    return availableIndex;
  }
  
  // If no unlocked challenge found, return -1
  return -1;
}

/**
 * Show a screen by name
 * @param {string} screenName - Name of screen to show ('challenges', 'taskScreen', 'stats')
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
  
  // Store current screen
  currentScreen = screenName;
  
  // Clear current content
  mainContent.innerHTML = '';
  
  // Manage body class for task screen keyboard stability
  if (screenName === 'taskScreen') {
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
  // Queue popups to show sequentially: first diamond, then streak, then background unlock
  // After all popups close, scroll to the current unlocked challenge or reward button
  if (returningFromTaskScreen) {
    returningFromTaskScreen = false;
    
    const showDiamond = diamondResult.awarded > 0;
    // Check if streak was unfrozen during challenge (streakWasUnfrozen is the new streak value or false)
    const showUnfrozen = typeof streakWasUnfrozen === 'number' && streakWasUnfrozen > 0;
    // Check if streak was incremented during challenge (only show if not unfrozen to avoid duplicate celebration)
    const showStreakIncremented = typeof streakWasIncremented === 'number' && streakWasIncremented > 0 && !showUnfrozen;
    
    // Check for newly purchasable backgrounds
    const backgroundUnlockResult = checkForNewlyPurchasableBackgrounds();
    const showBackgroundUnlock = backgroundUnlockResult.hasNew;
    const newlyPurchasableBackground = backgroundUnlockResult.firstNewBackground;
    
    // Reset the flags
    const unfrozenStreakValue = streakWasUnfrozen;
    const incrementedStreakValue = streakWasIncremented;
    streakWasUnfrozen = false;
    streakWasIncremented = false;
    
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
    
    // Queue popups: unfrozen first, then diamond, then streak, then background unlock
    const popupsToShow = [];
    
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
    if (showBackgroundUnlock && newlyPurchasableBackground) {
      // Show background unlock celebration popup when a new background becomes purchasable
      popupsToShow.push((next) => showBackgroundUnlockCelebrationPopup(newlyPurchasableBackground, next));
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
  
  // Create main container
  const challengesContainer = document.createElement('div');
  challengesContainer.className = 'challenges-container';
  
  // Create burger menu button (positioned absolutely in container)
  const burgerButton = document.createElement('button');
  burgerButton.className = 'burger-menu-button';
  burgerButton.id = 'burger-menu-button';
  burgerButton.setAttribute('aria-label', 'Einstellungen öffnen');
  burgerButton.innerHTML = '<span class="burger-icon">☰</span>';
  burgerButton.addEventListener('click', showSettingsPopup);
  
  // Create shop button (positioned below burger menu)
  const shopButton = document.createElement('button');
  shopButton.className = 'shop-button';
  shopButton.id = 'shop-button';
  shopButton.setAttribute('aria-label', 'Hintergründe anpassen');
  shopButton.innerHTML = '<span class="shop-icon">🛒</span>';
  shopButton.addEventListener('click', () => {
    // Check for purchasable backgrounds to scroll to
    const backgrounds = getAllBackgrounds();
    const purchasableBackground = backgrounds.find(bg => bg.state === BACKGROUND_STATE.PURCHASABLE);
    const scrollToId = purchasableBackground ? purchasableBackground.id : null;
    showBackgroundShopPopup(scrollToId);
  });
  
  // Create header with streak and diamonds
  const header = document.createElement('div');
  header.className = 'challenges-header';
  
  // Create progress text with correct singular/plural form
  const tasksUntilNext = diamondInfo.tasksUntilNext;
  const progressText = tasksUntilNext === 1 
    ? 'Noch 1 Aufgabe bis +1 💎' 
    : `Noch ${tasksUntilNext} Aufgaben bis +1 💎`;
  
  // Use blue flame (frozen) icon when streak is frozen, normal fire otherwise
  const streakIcon = streakInfo.isFrozen ? '🧊' : '🔥';
  const streakClass = streakInfo.isFrozen ? 'stat-capsule streak-frozen' : 'stat-capsule';
  
  header.innerHTML = `
    <h1>Tägliche Herausforderungen</h1>
    <div class="header-stats">
      <div class="${streakClass}">
        <span class="stat-icon">${streakIcon}</span>
        <span class="stat-value">${streakInfo.currentStreak}</span>
      </div>
      <div class="stat-capsule">
        <span class="stat-icon">💎</span>
        <span class="stat-value">${diamondInfo.current}</span>
      </div>
    </div>
    <div class="diamond-progress-info">${progressText}</div>
  `;
  
  // Create challenges map container
  const challengesMap = document.createElement('div');
  challengesMap.className = 'challenges-map';
  
  // Create SVG for connection lines
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('class', 'challenges-path-svg');
  svg.setAttribute('preserveAspectRatio', 'none');
  
  // Create challenges list
  const challengesList = document.createElement('div');
  challengesList.className = 'challenges-list';
  
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
      'failed': 'Fehlgeschlagen'
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
    for (let i = 0; i < numRays; i++) {
      const ray = document.createElement('div');
      ray.className = 'splash-ray';
      const angle = (i * 360 / numRays);
      // Use deterministic length based on ray index for consistent appearance
      const length = 25 + ((i % 3) * 6);
      ray.style.transform = `translate(-50%, 0) rotate(${angle}deg)`;
      ray.style.height = `${length}px`;
      splash.appendChild(ray);
    }
    nodeContainer.appendChild(splash);
    
    // Add background graphic for completed challenges
    if (challenge.state === 'completed') {
      const bgGraphic = document.createElement('div');
      bgGraphic.className = 'challenge-bg-graphic';
      
      // Apply size from balancing constant
      const size = VISUAL_CONFIG.CELEBRATION_GRAPHIC_SIZE;
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
    
    // Add status icon
    if (challenge.state === 'completed') {
      const statusIcon = document.createElement('span');
      statusIcon.className = 'status-icon';
      statusIcon.innerHTML = '⭐';
      node.appendChild(statusIcon);
    } else if (challenge.state === 'locked') {
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
    
    // Add click handler for available challenges
    if (challenge.state === 'available' || challenge.state === 'in_progress') {
      nodeContainer.style.cursor = 'pointer';
      nodeContainer.addEventListener('click', () => {
        showScreen('taskScreen', index);
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
  rewardButton.textContent = 'Belohnung abholen';
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
  
  challengesContainer.appendChild(burgerButton);
  challengesContainer.appendChild(shopButton);
  challengesContainer.appendChild(header);
  challengesContainer.appendChild(challengesMap);
  challengesContainer.appendChild(rewardSection);
  challengesContainer.appendChild(footer);
  
  container.appendChild(challengesContainer);
  
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
          <h2>Challenge ${challengeIndex + 1}</h2>
          <button id="back-button">Zurück</button>
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
  
  // Add event listener for back button
  const backButton = document.getElementById('back-button');
  backButton.addEventListener('click', () => {
    showScreen('challenges');
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
 * Show settings popup with options to reset data or generate new challenges
 */
function showSettingsPopup() {
  // Create popup overlay
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay settings-popup-overlay';
  overlay.id = 'settings-popup-overlay';
  
  // Create popup card
  const popupCard = document.createElement('div');
  popupCard.className = 'popup-card settings-popup-card';
  
  popupCard.innerHTML = `
    <h2>⚙️ Einstellungen</h2>
    <div class="settings-actions">
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
  
  if (closeBtn) closeBtn.addEventListener('click', closeSettingsPopup);
  if (regenerateBtn) regenerateBtn.addEventListener('click', handleRegenerateChallenges);
  if (resetBtn) resetBtn.addEventListener('click', handleResetAllData);
}

/**
 * Close the settings popup
 */
function closeSettingsPopup() {
  const overlay = document.getElementById('settings-popup-overlay');
  if (overlay) {
    overlay.remove();
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
 * Show background shop popup with all available backgrounds
 * Supports four states: locked, purchasable, unlocked, active
 * @param {string|null} scrollToBackgroundId - Optional background ID to scroll to and highlight
 */
function showBackgroundShopPopup(scrollToBackgroundId = null) {
  const backgrounds = getAllBackgrounds();
  const selectedBg = getSelectedBackground();
  const diamonds = loadDiamonds();
  
  // Create popup overlay
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay background-shop-overlay';
  overlay.id = 'background-shop-overlay';
  
  // Create popup card
  const popupCard = document.createElement('div');
  popupCard.className = 'popup-card background-shop-card';
  
  // Create header with diamond count
  let headerHtml = `
    <h2>🎨 Hintergründe</h2>
    <div class="background-shop-header">
      <div class="background-shop-diamonds">
        <span>💎</span>
        <span id="shop-diamond-count">${diamonds}</span>
      </div>
    </div>
  `;
  
  // Create grid of background tiles
  let tilesHtml = '<div class="backgrounds-grid" id="backgrounds-grid">';
  
  backgrounds.forEach(bg => {
    const state = bg.state;
    const isDefault = bg.isDefault;
    
    // Build tile class based on state
    let tileClass = 'background-tile';
    tileClass += ` state-${state}`;
    
    // Add legacy classes for compatibility
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
    
    // Build cost/status HTML based on state
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
    
    // Build badges and icons
    let activeBadge = state === BACKGROUND_STATE.ACTIVE ? '<div class="background-selected-badge">Aktiv</div>' : '';
    let lockIcon = state === BACKGROUND_STATE.LOCKED ? '<div class="background-lock-icon">🔒</div>' : '';
    
    tilesHtml += `
      <div class="${tileClass}" data-bg-id="${bg.id}">
        <img src="./assets/${bg.file}" alt="${bg.name}" class="background-preview">
        ${lockIcon}
        ${activeBadge}
        <div class="background-info">
          <div class="background-name">${bg.name}</div>
          ${costHtml}
        </div>
      </div>
    `;
  });
  
  tilesHtml += '</div>';
  
  popupCard.innerHTML = `
    <div class="background-shop-content">
      ${headerHtml}
      ${tilesHtml}
    </div>
    <button id="close-background-shop" class="btn-secondary background-shop-close">Schließen</button>
  `;
  
  overlay.appendChild(popupCard);
  document.body.appendChild(overlay);
  
  // Add click handlers for tiles (only for interactive states)
  const tiles = popupCard.querySelectorAll('.background-tile');
  tiles.forEach(tile => {
    const bgId = tile.dataset.bgId;
    const bg = backgrounds.find(b => b.id === bgId);
    
    // Only make tiles clickable if they are purchasable, unlocked, or active
    if (bg && bg.state !== BACKGROUND_STATE.LOCKED) {
      tile.addEventListener('click', () => {
        handleBackgroundTileClick(bgId);
      });
    }
  });
  
  // Add close button handler
  const closeBtn = document.getElementById('close-background-shop');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeBackgroundShopPopup);
  }
  
  // Scroll to and highlight specific background if requested
  if (scrollToBackgroundId) {
    requestAnimationFrame(() => {
      setTimeout(() => {
        const targetTile = popupCard.querySelector(`.background-tile[data-bg-id="${scrollToBackgroundId}"]`);
        if (targetTile) {
          // Scroll tile into view
          targetTile.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
          
          // Apply highlight effect (same as reward button effect)
          setTimeout(() => {
            targetTile.classList.add('background-newly-purchasable-highlight');
            
            // Remove highlight after animation
            setTimeout(() => {
              targetTile.classList.remove('background-newly-purchasable-highlight');
            }, ANIMATION_TIMING.REWARD_HIGHLIGHT_DURATION);
          }, ANIMATION_TIMING.SCROLL_SETTLE_DELAY);
        }
      }, ANIMATION_TIMING.DOM_RENDER_DELAY);
    });
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
    
    // Show streak status popups after initial load if needed
    // This handles frozen/lost streaks on app open
    if (streakStatus.showPopup && !wasStreakStatusHandledToday()) {
      setTimeout(() => {
        showStreakPopupForStatus(streakStatus);
      }, ANIMATION_TIMING.INITIAL_POPUP_DELAY);
    }
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
document.addEventListener('DOMContentLoaded', () => {
  const app = new KopfnussApp();
  app.init();
});

// Exports für Module
export { Router, KopfnussApp };

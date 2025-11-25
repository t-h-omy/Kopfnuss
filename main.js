// Kopfnuss - Main Application Entry Point
// Routing und App-Initialisierung

import { getTodaysChallenges, areAllChallengesCompleted, resetChallenges } from './logic/challengeGenerator.js';
import { getStreakInfo } from './logic/streakManager.js';
import { getDiamondInfo, updateDiamonds, addDiamonds } from './logic/diamondManager.js';
import { clearAllData, loadStreak } from './logic/storageManager.js';
import { VERSION } from './version.js';
import { CONFIG } from './data/balancing.js';

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
  }, 100);
});

// Also set on orientation change (more reliable than resize for orientation)
window.addEventListener('orientationchange', () => {
  // Wait for orientation change to complete
  setTimeout(setAppHeight, 100);
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

// Animation timing constants (in milliseconds)
// FOCUS_HIGHLIGHT_DURATION must match the CSS animation duration in style.css (.challenge-focus-highlight)
const FOCUS_HIGHLIGHT_DURATION = 800;
const SCROLL_SETTLE_DELAY = 300; // Time to wait for smooth scroll to settle before showing highlight
const DOM_RENDER_DELAY = 100; // Time to wait for DOM to be fully rendered after requestAnimationFrame

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
 * Scroll to and highlight the specified challenge
 * @param {number} challengeIndex - Index of the challenge to scroll to
 */
function scrollToAndHighlightChallenge(challengeIndex) {
  if (challengeIndex < 0) {
    return;
  }
  
  // Wait for DOM to be fully rendered using requestAnimationFrame + small delay
  requestAnimationFrame(() => {
    setTimeout(() => {
      const challengeRow = document.querySelector(`.challenge-row[data-index="${challengeIndex}"]`);
      if (challengeRow) {
        // Smooth scroll to the challenge
        challengeRow.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
        
        // Add highlight animation class after scroll completes
        setTimeout(() => {
          // Check if there's no popup currently visible (don't highlight during celebrations)
          const hasPopup = document.querySelector('.popup-overlay');
          if (!hasPopup) {
            challengeRow.classList.add('challenge-focus-highlight');
            
            // Remove the class after animation completes
            setTimeout(() => {
              challengeRow.classList.remove('challenge-focus-highlight');
            }, FOCUS_HIGHLIGHT_DURATION);
          }
        }, SCROLL_SETTLE_DELAY);
      }
    }, DOM_RENDER_DELAY);
  });
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
  
  // Get previous streak data BEFORE updating
  const previousStreakData = loadStreak();
  const previousStreakCount = previousStreakData.currentStreak;
  
  // Update streak and get new data (this also calls updateStreak internally)
  const streakInfo = getStreakInfo();
  
  // Check if streak genuinely increased
  // When a streak is rescued (unfrozen), the count stays the same, so this check
  // automatically excludes rescued streaks from triggering the celebration popup.
  // The popup only shows when currentStreak > previousStreak (genuine new day achievement)
  const streakIncreased = streakInfo.currentStreak > previousStreakCount;
  
  // Update diamonds based on progress and check if any were awarded
  const diamondResult = updateDiamonds();
  const diamondInfo = getDiamondInfo();
  
  // Handle popup display when returning from task screen
  // Queue popups to show sequentially: first diamond, then streak (or vice versa)
  // After all popups close, scroll to the current unlocked challenge
  if (returningFromTaskScreen) {
    returningFromTaskScreen = false;
    
    const showDiamond = diamondResult.awarded > 0;
    const showStreak = streakIncreased && streakInfo.currentStreak > 0;
    
    // Create a scroll callback that will be called after the last popup closes
    const scrollAfterPopups = () => {
      const unlockedIdx = findCurrentUnlockedChallengeIndex(challenges);
      if (unlockedIdx >= 0) {
        scrollToAndHighlightChallenge(unlockedIdx);
      }
    };
    
    if (showDiamond && showStreak) {
      // Show both popups sequentially - diamond first, then streak, then scroll
      showDiamondCelebrationPopup(diamondResult.awarded, CONFIG.TASKS_PER_DIAMOND, () => {
        showStreakCelebrationPopup(streakInfo.currentStreak, scrollAfterPopups);
      });
    } else if (showDiamond) {
      showDiamondCelebrationPopup(diamondResult.awarded, CONFIG.TASKS_PER_DIAMOND, scrollAfterPopups);
    } else if (showStreak) {
      showStreakCelebrationPopup(streakInfo.currentStreak, scrollAfterPopups);
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
  
  // Create header with streak and diamonds
  const header = document.createElement('div');
  header.className = 'challenges-header';
  
  // Create progress text with correct singular/plural form
  const tasksUntilNext = diamondInfo.tasksUntilNext;
  const progressText = tasksUntilNext === 1 
    ? 'Noch 1 Aufgabe bis +1 💎' 
    : `Noch ${tasksUntilNext} Aufgaben bis +1 💎`;
  
  header.innerHTML = `
    <h1>Tägliche Herausforderungen</h1>
    <div class="header-stats">
      <div class="stat-capsule">
        <span class="stat-icon">🔥</span>
        <span class="stat-value">${streakInfo.currentStreak}${streakInfo.isFrozen ? ' ❄️' : ''}</span>
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
    
    // Create the circular node
    const node = document.createElement('div');
    node.className = 'challenge-node';
    node.innerHTML = challenge.icon;
    
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
    
    nodeContainer.appendChild(node);
    
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
  
  // Auto-scroll to current unlocked challenge
  // Find the current unlocked challenge and scroll to it
  const unlockedIndex = findCurrentUnlockedChallengeIndex(challenges);
  if (unlockedIndex >= 0) {
    // Check if any celebration popup is being shown
    const hasCelebrationPopup = document.querySelector('.popup-overlay');
    if (!hasCelebrationPopup) {
      // No popup, scroll immediately
      scrollToAndHighlightChallenge(unlockedIndex);
    }
    // If popup exists, the scroll will happen when popup closes (handled in popup close handlers)
  }
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
  const overlay = document.getElementById('reward-popup-overlay');
  if (overlay) {
    overlay.remove();
  }
  
  // Remove any remaining confetti
  const confettiPieces = document.querySelectorAll('.confetti-piece');
  confettiPieces.forEach(piece => piece.remove());
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
  const overlay = document.getElementById('diamond-celebration-popup-overlay');
  if (overlay) {
    overlay.remove();
  }
  
  // Remove any remaining confetti
  const confettiPieces = document.querySelectorAll('.confetti-piece');
  confettiPieces.forEach(piece => piece.remove());
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
  const overlay = document.getElementById('streak-celebration-popup-overlay');
  if (overlay) {
    overlay.remove();
  }
  
  // Remove any remaining confetti
  const confettiPieces = document.querySelectorAll('.confetti-piece');
  confettiPieces.forEach(piece => piece.remove());
}

/**
 * Create confetti celebration effect
 */
function createConfettiEffect() {
  const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
  const confettiCount = 50;
  const minDuration = 1.5;
  const durationVariance = 1;
  const cleanupDelay = 3000;
  
  for (let i = 0; i < confettiCount; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti-piece';
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.left = Math.random() * 100 + 'vw';
    confetti.style.top = '-20px';
    confetti.style.animationDelay = Math.random() * 0.5 + 's';
    confetti.style.animationDuration = (Math.random() * durationVariance + minDuration) + 's';
    
    document.body.appendChild(confetti);
    
    // Remove confetti after animation
    setTimeout(() => {
      confetti.remove();
    }, cleanupDelay);
  }
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
  
  // Refresh challenges screen
  showScreen('challenges');
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
    // Load challenges screen by default
    showScreen('challenges');
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

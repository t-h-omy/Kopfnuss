// Kopfnuss - Main Application Entry Point
// Routing und App-Initialisierung

import { getTodaysChallenges } from './logic/challengeGenerator.js';
import { getStreakInfo } from './logic/streakManager.js';
import { getDiamondInfo, updateDiamonds } from './logic/diamondManager.js';
import { VERSION } from './version.js';

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
  const streakInfo = getStreakInfo();
  const diamondInfo = getDiamondInfo();
  
  // Update diamonds based on progress
  updateDiamonds();
  
  // Create main container
  const challengesContainer = document.createElement('div');
  challengesContainer.className = 'challenges-container';
  
  // Create header with streak and diamonds
  const header = document.createElement('div');
  header.className = 'challenges-header';
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
  
  // Create footer with version
  const footer = document.createElement('div');
  footer.className = 'challenges-footer';
  footer.innerHTML = `v${VERSION.string}`;
  
  challengesContainer.appendChild(header);
  challengesContainer.appendChild(challengesMap);
  challengesContainer.appendChild(footer);
  
  container.appendChild(challengesContainer);
  
  // Draw SVG paths after DOM is rendered
  requestAnimationFrame(() => {
    // Check if elements still exist in the DOM before drawing
    if (document.body.contains(svg) && document.body.contains(challengesList)) {
      drawConnectionPaths(svg, challengesList, nodePositions);
    }
  });
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

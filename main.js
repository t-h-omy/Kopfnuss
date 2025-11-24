// Kopfnuss - Main Application Entry Point
// Routing und App-Initialisierung

import { getTodaysChallenges } from './logic/challengeGenerator.js';
import { getStreakInfo } from './logic/streakManager.js';
import { getDiamondInfo, updateDiamonds } from './logic/diamondManager.js';

// Service Worker Registrierung
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('ServiceWorker registriert:', registration.scope);
      })
      .catch((error) => {
        console.error('ServiceWorker Registrierung fehlgeschlagen:', error);
      });
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
  
  // Create header with streak and diamonds
  const header = document.createElement('div');
  header.className = 'challenges-header';
  header.innerHTML = `
    <h1>Tägliche Herausforderungen</h1>
    <div class="header-info">
      <div class="streak-display">
        🔥 Streak: ${streakInfo.currentStreak} ${streakInfo.isFrozen ? '(Eingefroren)' : ''}
      </div>
      <div class="diamond-display">
        💎 Diamanten: ${diamondInfo.current}
      </div>
    </div>
  `;
  
  // Create challenges list
  const challengesList = document.createElement('div');
  challengesList.className = 'challenges-list';
  
  challenges.forEach((challenge, index) => {
    const challengeCard = document.createElement('div');
    challengeCard.className = `challenge-card challenge-${challenge.state}`;
    challengeCard.dataset.index = index;
    
    const statusText = {
      'locked': 'Gesperrt',
      'available': 'Verfügbar',
      'in_progress': 'In Bearbeitung',
      'completed': 'Abgeschlossen',
      'failed': 'Fehlgeschlagen'
    }[challenge.state];
    
    challengeCard.innerHTML = `
      <div class="challenge-icon">${challenge.icon}</div>
      <div class="challenge-info">
        <h3>${challenge.name}</h3>
        <p>Status: ${statusText}</p>
        ${challenge.state === 'completed' ? `<p>Fehler: ${challenge.errors}</p>` : ''}
      </div>
    `;
    
    // Add click handler for available challenges
    if (challenge.state === 'available' || challenge.state === 'in_progress') {
      challengeCard.style.cursor = 'pointer';
      challengeCard.addEventListener('click', () => {
        showScreen('taskScreen', index);
      });
    }
    
    challengesList.appendChild(challengeCard);
  });
  
  container.appendChild(header);
  container.appendChild(challengesList);
}

/**
 * Load task screen
 * @param {HTMLElement} container - Container element
 * @param {number} challengeIndex - Index of challenge
 */
async function loadTaskScreen(container, challengeIndex) {
  container.innerHTML = `
    <div class="task-screen" id="task-screen-content">
      <div class="task-header">
        <h2>Challenge ${challengeIndex + 1}</h2>
        <button id="back-button">Zurück</button>
      </div>
      <div class="task-content">
        <div class="task-question" id="task-question"></div>
        <input type="number" id="task-input" placeholder="Deine Antwort">
        <button id="submit-answer">Prüfen</button>
      </div>
      <div class="task-progress" id="task-progress"></div>
      <div class="task-feedback" id="task-feedback"></div>
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

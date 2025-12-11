// Kopfnuss - Event Popup UI Module
// Manages event-related popups (event start, event info, event end)

import {
  getActiveEvent,
  getDaysUntilEventEnd,
  getSeasonalCurrency,
  getSeasonalTaskCount,
  markEventStartPopupShown,
  markEventEndPopupShown,
  clearEventData
} from '../logic/eventManager.js';
import { createConfettiEffect, removeConfettiPieces, processPopupQueue } from '../logic/popupManager.js';

/**
 * Show seasonal event start popup
 * Displayed on first app launch when a new event becomes active
 * @param {Function} onClose - Callback when popup closes
 */
export function showEventStartPopup(onClose = null) {
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
export function showEventInfoPopup() {
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
export function showEventEndPopup(event, backgroundWasReset = false, onClose = null) {
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

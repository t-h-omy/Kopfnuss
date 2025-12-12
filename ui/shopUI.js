// Kopfnuss - Shop UI Module
// Manages background shop UI, including display, selection, and unlock flows

import {
  getAllBackgrounds,
  getSelectedBackground,
  applySelectedBackground,
  unlockBackground,
  selectBackground,
  BACKGROUND_STATE,
  updateKnownPurchasableBackgrounds,
  getBackgroundPacksWithState,
  unlockPack
} from '../logic/backgroundManager.js';
import {
  getActiveEvent,
  getSeasonalCurrency,
  getAllActiveSeasonalBackgrounds,
  unlockSeasonalBackground,
  updateKnownSeasonalPurchasableBackgrounds
} from '../logic/eventManager.js';
import { loadDiamonds } from '../logic/diamondManager.js';
import { 
  saveSelectedBackground as saveSelectedBackgroundToStorage,
  markShopOpenedWithNewBackgrounds,
  loadStreakStones,
  saveStreakStones
} from '../logic/storageManager.js';
import { createConfettiEffect } from '../logic/popupManager.js';
import { playBackgroundPurchased } from '../logic/audioBootstrap.js';
import { ANIMATION_TIMING } from '../data/constants.js';
import { updateHeaderDiamondsDisplay, updateHeaderStreakStonesDisplay } from './headerUI.js';

/**
 * Initialize shop UI
 * Called once during app initialization
 */
export function initShopUI() {
  // No initialization needed for now
}

/**
 * Show background shop popup with all available backgrounds
 * @param {string|null} scrollToBackgroundId - Optional background ID to scroll to and highlight
 * @param {string|null} initialTab - Optional tab to show initially ('standard', 'packs', 'seasonal')
 */
export function showBackgroundShopPopup(scrollToBackgroundId = null, initialTab = null) {
  const backgrounds = getAllBackgrounds();
  const selectedBg = getSelectedBackground();
  const diamonds = loadDiamonds();
  
  // Get seasonal event info
  const activeEvent = getActiveEvent();
  const seasonalCurrency = activeEvent ? getSeasonalCurrency() : 0;
  const seasonalBackgrounds = activeEvent ? getAllActiveSeasonalBackgrounds() : [];
  
  // Create popup overlay
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay background-shop-overlay';
  overlay.id = 'background-shop-overlay';
  
  // Create popup card
  const popupCard = document.createElement('div');
  popupCard.className = 'popup-card background-shop-card';
  
  // Create header with diamond count and seasonal currency if active
  let currencyDisplayHtml = `
    <div class="background-shop-diamonds">
      <span>💎</span>
      <span id="shop-diamond-count">${diamonds}</span>
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
  
  // Determine which tab button should be active
  const activeTab = initialTab || 'standard';
  
  let headerHtml = `
    <h2>🎨 Hintergründe</h2>
    <div class="background-shop-header">
      ${currencyDisplayHtml}
    </div>
    <div class="shop-tab-header">
      <button class="shop-tab-button ${activeTab === 'standard' ? 'active' : ''}" data-tab="standard">Standard</button>
      <button class="shop-tab-button ${activeTab === 'packs' ? 'active' : ''}" data-tab="packs">Pakete</button>
      <button class="shop-tab-button ${activeTab === 'seasonal' ? 'active' : ''}" data-tab="seasonal">Event</button>
    </div>
  `;
  
  // Create seasonal section if event is active
  let seasonalSectionHtml = '';
  if (activeEvent && seasonalBackgrounds.length > 0) {
    seasonalSectionHtml = `
      <div class="seasonal-backgrounds-section">
        <h3 class="seasonal-section-title">${activeEvent.emoticon} ${activeEvent.name}-Event</h3>
        <div class="seasonal-backgrounds-grid">
    `;
    
    seasonalBackgrounds.forEach(bg => {
      const isUnlocked = bg.isUnlocked;
      const canAfford = bg.canAfford;
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
        // Add NEW badge for newly purchasable seasonal backgrounds
        if (bg.isNewlyPurchasable) {
          newBadge = '<div class="background-new-badge">NEU</div>';
        }
      }
      
      seasonalSectionHtml += `
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
    
    seasonalSectionHtml += `
        </div>
      </div>
    `;
  }
  
  // Create grid of regular background tiles
  let tilesHtml = '<div class="regular-backgrounds-section">';
  if (activeEvent) {
    tilesHtml += '<h3 class="regular-section-title">🎨 Hintergründe</h3>';
  }
  tilesHtml += '<div class="backgrounds-grid" id="backgrounds-grid">';
  
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
    let newBadge = (state === BACKGROUND_STATE.PURCHASABLE && bg.isNewlyPurchasable) ? '<div class="background-new-badge">NEU</div>' : '';
    
    tilesHtml += `
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
  
  tilesHtml += '</div></div>';
  
  // Create Packs tab content
  const packs = getBackgroundPacksWithState();
  const streakStones = loadStreakStones();
  
  // Sort packs: unlocked first, locked second
  const sortedPacks = [...packs].sort((a, b) => {
    if (a.unlocked && !b.unlocked) return -1;
    if (!a.unlocked && b.unlocked) return 1;
    return 0;
  });
  
  let packsContentHtml = '<div class="packs-section">';
  
  sortedPacks.forEach(pack => {
    const packClass = pack.unlocked ? 'pack-container unlocked' : 'pack-container locked';
    const canAfford = streakStones >= pack.costStreakStones;
    
    packsContentHtml += `
      <div class="${packClass}" data-pack-id="${pack.id}">
        <div class="pack-header">
          <h3 class="pack-name">${pack.unlocked ? '✓ ' : '🔒 '}${pack.name}</h3>
    `;
    
    // Add unlock button for locked packs
    if (!pack.unlocked) {
      const buttonClass = !canAfford ? 'pack-unlock-button pack-unlock-button-disabled' : 'pack-unlock-button';
      packsContentHtml += `
          <button class="btn-primary ${buttonClass}" data-pack-id="${pack.id}" data-cost="${pack.costStreakStones}" data-can-afford="${canAfford}">
            ♦️ ${pack.costStreakStones} freischalten
          </button>
      `;
    }
    
    packsContentHtml += `
        </div>
        <div class="backgrounds-grid">
    `;
    
    // Render backgrounds for this pack
    pack.backgrounds.forEach(bg => {
      const state = bg.state;
      const isActive = selectedBg.id === bg.id;
      
      // Build tile class based on state
      let tileClass = 'background-tile pack-background';
      tileClass += ` state-${state}`;
      
      // Add legacy classes for compatibility
      if (state === BACKGROUND_STATE.UNLOCKED || state === BACKGROUND_STATE.ACTIVE) {
        tileClass += ' unlocked';
      }
      if (state === BACKGROUND_STATE.LOCKED || state === BACKGROUND_STATE.LOCKED_BY_PACK || state === BACKGROUND_STATE.REQUIREMENTS_NOT_MET) {
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
      if (state === BACKGROUND_STATE.ACTIVE) {
        costHtml = '<span class="background-cost">✓ Aktiv</span>';
      } else if (state === BACKGROUND_STATE.UNLOCKED) {
        costHtml = '<span class="background-cost">✓ Freigeschaltet</span>';
      } else if (state === BACKGROUND_STATE.PURCHASABLE) {
        costHtml = `<span class="background-cost">💎 ${bg.cost}</span>`;
      } else if (state === BACKGROUND_STATE.LOCKED_BY_PACK) {
        costHtml = '<span class="background-cost background-locked-text">Pack freischalten</span>';
      } else if (state === BACKGROUND_STATE.REQUIREMENTS_NOT_MET) {
        const tasksText = bg.tasksRemaining === 1 ? 'Aufgabe' : 'Aufgaben';
        costHtml = `<span class="background-cost background-locked-text">Noch ${bg.tasksRemaining} ${tasksText}</span>`;
      }
      
      // Build badges and icons
      let activeBadge = state === BACKGROUND_STATE.ACTIVE ? '<div class="background-selected-badge">Aktiv</div>' : '';
      let lockIcon = (state === BACKGROUND_STATE.LOCKED || state === BACKGROUND_STATE.LOCKED_BY_PACK || state === BACKGROUND_STATE.REQUIREMENTS_NOT_MET) ? '<div class="background-lock-icon">🔒</div>' : '';
      
      packsContentHtml += `
        <div class="${tileClass}" data-bg-id="${bg.id}" data-is-pack="true" data-pack-id="${pack.id}">
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
    
    packsContentHtml += `
        </div>
      </div>
    `;
  });
  
  packsContentHtml += '</div>';
  
  // Build tab content HTML
  const tabStandardHtml = `
    <div class="shop-tab-content ${activeTab === 'standard' ? 'active' : ''}" id="shopTabStandard">
      ${seasonalSectionHtml}
      ${tilesHtml}
    </div>
  `;
  
  const tabPacksHtml = `
    <div class="shop-tab-content ${activeTab === 'packs' ? 'active' : ''}" id="shopTabPacks">
      ${packsContentHtml}
    </div>
  `;
  
  const tabSeasonalHtml = `
    <div class="shop-tab-content ${activeTab === 'seasonal' ? 'active' : ''}" id="shopTabSeasonal">
      <!-- Seasonal content will be added here in future -->
    </div>
  `;
  
  popupCard.innerHTML = `
    ${headerHtml}
    <div class="background-shop-content">
      ${tabStandardHtml}
      ${tabPacksHtml}
      ${tabSeasonalHtml}
    </div>
    <button id="close-background-shop" class="btn-secondary background-shop-close">Schließen</button>
  `;
  
  overlay.appendChild(popupCard);
  document.body.appendChild(overlay);
  
  // Add click handlers for tiles (regular backgrounds)
  const regularTiles = popupCard.querySelectorAll('.background-tile[data-is-seasonal="false"]');
  regularTiles.forEach(tile => {
    const bgId = tile.dataset.bgId;
    const bg = backgrounds.find(b => b.id === bgId);
    
    // Only make tiles clickable if they are purchasable, unlocked, or active
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
    
    // Only make tiles clickable if they are purchasable, unlocked, or active
    if (bg && (bg.isUnlocked || bg.hasEnoughTasks)) {
      tile.addEventListener('click', () => {
        handleSeasonalBackgroundTileClick(bgId);
      });
    }
  });
  
  // Add click handlers for pack backgrounds
  const packTiles = popupCard.querySelectorAll('.background-tile[data-is-pack="true"]');
  packTiles.forEach(tile => {
    const bgId = tile.dataset.bgId;
    const packId = tile.dataset.packId;
    const pack = packs.find(p => p.id === packId);
    
    if (pack) {
      const bg = pack.backgrounds.find(b => b.id === bgId);
      
      // Only make tiles clickable if they are purchasable, unlocked, or active
      if (bg && (bg.state === BACKGROUND_STATE.PURCHASABLE || bg.state === BACKGROUND_STATE.UNLOCKED || bg.state === BACKGROUND_STATE.ACTIVE)) {
        tile.addEventListener('click', () => {
          handleBackgroundTileClick(bgId);
        });
      }
    }
  });
  
  // Add click handlers for pack unlock buttons
  const packUnlockButtons = popupCard.querySelectorAll('.pack-unlock-button');
  packUnlockButtons.forEach(button => {
    const packId = button.dataset.packId;
    const cost = parseInt(button.dataset.cost);
    
    button.addEventListener('click', () => {
      handlePackUnlockClick(packId, cost);
    });
  });
  
  // Add tab switching handlers
  const tabButtons = popupCard.querySelectorAll('.shop-tab-button');
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.dataset.tab;
      
      // Remove active class from all buttons and tabs
      tabButtons.forEach(btn => btn.classList.remove('active'));
      const allTabs = popupCard.querySelectorAll('.shop-tab-content');
      allTabs.forEach(tab => tab.classList.remove('active'));
      
      // Add active class to clicked button and corresponding tab
      button.classList.add('active');
      const targetTabElement = popupCard.querySelector(`#shopTab${capitalizeFirstLetter(targetTab)}`);
      if (targetTabElement) {
        targetTabElement.classList.add('active');
      }
    });
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
export function closeBackgroundShopPopup() {
  const overlay = document.getElementById('background-shop-overlay');
  if (overlay) {
    overlay.remove();
  }
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
 * Get the currently active tab in the shop
 * @returns {string|null} The active tab name ('standard', 'packs', or 'seasonal'), or null if not found
 */
function getCurrentActiveTab() {
  const overlay = document.getElementById('background-shop-overlay');
  if (!overlay) return null;
  
  // Check which tab button is active
  const activeButton = overlay.querySelector('.shop-tab-button.active');
  if (activeButton) {
    return activeButton.dataset.tab;
  }
  
  return null;
}

/**
 * Refresh shop UI (re-opens shop with current state)
 * @param {string|null} activeTab - Optional tab to show after refresh
 */
export function refreshShopUI(activeTab = null) {
  // If no tab specified, try to preserve the current active tab
  if (!activeTab) {
    activeTab = getCurrentActiveTab();
  }
  
  closeBackgroundShopPopup();
  showBackgroundShopPopup(null, activeTab);
}

/**
 * Update NEW badge state on shop button
 * Called when background becomes newly purchasable
 */
export function updateShopNewBadgeState() {
  // This is handled automatically when shop closes
  // Badge is updated in closeBackgroundShopPopup
}

// ===== Internal Helper Functions =====

/**
 * Handle click on a background tile
 * @param {string} bgId - The ID of the clicked background
 */
function handleBackgroundTileClick(bgId) {
  const backgrounds = getAllBackgrounds();
  let bg = backgrounds.find(b => b.id === bgId);
  
  // If not found in regular backgrounds, check pack backgrounds
  if (!bg) {
    const packs = getBackgroundPacksWithState();
    for (const pack of packs) {
      bg = pack.backgrounds.find(b => b.id === bgId);
      if (bg) break;
    }
  }
  
  if (!bg) return;
  
  const state = bg.state;
  
  if (state === BACKGROUND_STATE.ACTIVE) {
    return;
  }
  
  if (state === BACKGROUND_STATE.UNLOCKED) {
    showBackgroundSelectConfirmPopup(bg);
  } else if (state === BACKGROUND_STATE.PURCHASABLE) {
    showBackgroundUnlockConfirmPopup(bg);
  }
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
    return;
  }
  
  if (bg.isUnlocked) {
    showSeasonalBackgroundSelectConfirmPopup(bg);
  } else if (bg.hasEnoughTasks && bg.canAfford) {
    showSeasonalBackgroundUnlockConfirmPopup(bg);
  } else if (bg.hasEnoughTasks) {
    showNotEnoughSeasonalCurrencyHint();
  }
}

/**
 * Show popup to confirm selecting a background
 * @param {Object} background - The background object to select
 */
function showBackgroundSelectConfirmPopup(background) {
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay background-confirm-overlay';
  overlay.id = 'background-select-confirm-overlay';
  
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
  
  closeBackgroundSelectConfirmPopup();
  
  if (result.success) {
    applySelectedBackground();
    refreshShopUI();
  }
}

/**
 * Show popup to confirm unlocking a background
 * @param {Object} background - The background object to unlock
 */
function showBackgroundUnlockConfirmPopup(background) {
  const diamonds = loadDiamonds();
  const canAfford = diamonds >= background.cost;
  
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay background-confirm-overlay';
  overlay.id = 'background-unlock-confirm-overlay';
  
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
  
  closeBackgroundUnlockConfirmPopup();
  
  if (result.success) {
    playBackgroundPurchased();
    refreshShopUI();
    updateHeaderDiamondsDisplay();
    
    // Show unlock animation on the tile
    const tile = document.querySelector(`.background-tile[data-bg-id="${bgId}"]`);
    if (tile) {
      tile.classList.add('background-unlock-animation');
    }
    
    createConfettiEffect();
  } else if (result.notEnoughDiamonds) {
    showNotEnoughDiamondsHint();
  }
}

/**
 * Show a hint when player doesn't have enough diamonds
 */
function showNotEnoughDiamondsHint() {
  const existingHint = document.querySelector('.not-enough-diamonds-hint');
  if (existingHint) {
    existingHint.remove();
  }
  
  const hint = document.createElement('div');
  hint.className = 'not-enough-diamonds-hint';
  hint.textContent = '💎 Nicht genug Diamanten!';
  
  document.body.appendChild(hint);
  
  setTimeout(() => {
    hint.remove();
  }, 3000);
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
      saveSelectedBackgroundToStorage(background.id);
      applySeasonalBackground(background);
      
      overlay.remove();
      refreshShopUI();
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
        refreshShopUI();
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
  
  const existingHint = document.querySelector('.not-enough-currency-hint');
  if (existingHint) {
    existingHint.remove();
  }
  
  const hint = document.createElement('div');
  hint.className = 'not-enough-currency-hint not-enough-diamonds-hint';
  hint.textContent = `${activeEvent.emoticon} Nicht genug ${activeEvent.currencyName}!`;
  
  document.body.appendChild(hint);
  
  setTimeout(() => {
    hint.remove();
  }, 3000);
}

/**
 * Handle click on a pack unlock button
 * @param {string} packId - The ID of the pack to unlock
 * @param {number} cost - Cost in streak stones
 */
function handlePackUnlockClick(packId, cost) {
  const streakStones = loadStreakStones();
  
  // Check if player has enough streak stones
  if (streakStones < cost) {
    showInsufficientStreakStonesPopup(cost, streakStones);
  } else {
    showPackUnlockConfirmPopup(packId, cost);
  }
}

/**
 * Show popup when player doesn't have enough streak stones
 * @param {number} required - Required amount of streak stones
 * @param {number} current - Current amount of streak stones
 */
function showInsufficientStreakStonesPopup(required, current) {
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay insufficient-stones-overlay';
  overlay.id = 'insufficient-stones-overlay';
  
  const popupCard = document.createElement('div');
  popupCard.className = 'popup-card insufficient-stones-card';
  
  const missing = required - current;
  
  popupCard.innerHTML = `
    <h2>Nicht genug Streak-Steine!</h2>
    <div class="insufficient-stones-display">
      <span class="insufficient-stones-icon">♦️</span>
      <span class="insufficient-stones-text">${current} / ${required}</span>
    </div>
    <p>Du brauchst noch <strong>${missing} Streak-Steine</strong>, um dieses Pack freizuschalten.</p>
    <p>Streak-Steine erhältst du durch tägliche Streaks!</p>
    <button id="close-insufficient-stones" class="btn-secondary">OK</button>
  `;
  
  overlay.appendChild(popupCard);
  document.body.appendChild(overlay);
  
  const closeBtn = document.getElementById('close-insufficient-stones');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      overlay.remove();
    });
  }
}

/**
 * Show confirmation popup for pack unlock
 * @param {string} packId - The ID of the pack to unlock
 * @param {number} cost - Cost in streak stones
 */
function showPackUnlockConfirmPopup(packId, cost) {
  const packs = getBackgroundPacksWithState();
  const pack = packs.find(p => p.id === packId);
  
  if (!pack) return;
  
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay background-confirm-overlay';
  overlay.id = 'pack-unlock-confirm-overlay';
  
  const popupCard = document.createElement('div');
  popupCard.className = 'popup-card background-confirm-card';
  
  popupCard.innerHTML = `
    <h2>Pack freischalten?</h2>
    <p><strong>${pack.name}</strong></p>
    <div class="background-confirm-cost">
      <span>♦️</span>
      <span>${cost} Streak-Steine</span>
    </div>
    <p>Dieses Pack enthält ${pack.backgrounds.length} exklusive Hintergründe!</p>
    <div class="background-confirm-buttons">
      <button id="confirm-pack-unlock-button" class="btn-primary">Freischalten</button>
      <button id="cancel-pack-unlock-button" class="btn-secondary">Abbrechen</button>
    </div>
  `;
  
  overlay.appendChild(popupCard);
  document.body.appendChild(overlay);
  
  const confirmBtn = document.getElementById('confirm-pack-unlock-button');
  const cancelBtn = document.getElementById('cancel-pack-unlock-button');
  
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      executePackUnlock(packId);
    });
  }
  
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      overlay.remove();
    });
  }
}

/**
 * Execute pack unlock
 * @param {string} packId - The ID of the pack to unlock
 */
function executePackUnlock(packId) {
  const currentStreakStones = loadStreakStones();
  const result = unlockPack(packId, currentStreakStones);
  
  // Close confirmation popup
  const confirmOverlay = document.getElementById('pack-unlock-confirm-overlay');
  if (confirmOverlay) {
    confirmOverlay.remove();
  }
  
  if (result.success) {
    // Deduct streak stones
    const newStreakStones = currentStreakStones - result.costStreakStones;
    saveStreakStones(newStreakStones);
    
    // Update header display
    updateHeaderStreakStonesDisplay();
    
    // Play success sound
    playBackgroundPurchased();
    
    // Show confetti
    createConfettiEffect();
    
    // Refresh shop UI staying on the Packs tab (this will re-render with the pack unlocked and moved to top)
    refreshShopUI('packs');
    
    // After refresh, scroll to the unlocked pack
    requestAnimationFrame(() => {
      setTimeout(() => {
        scrollToPackAfterUnlock(packId);
      }, ANIMATION_TIMING.DOM_RENDER_DELAY);
    });
  } else if (result.needsMoreStones) {
    showInsufficientStreakStonesPopup(result.required, result.current);
  }
}

/**
 * Scroll to a pack container after it has been unlocked
 * @param {string} packId - The ID of the pack to scroll to
 */
function scrollToPackAfterUnlock(packId) {
  const packContainer = document.querySelector(`.pack-container[data-pack-id="${packId}"]`);
  if (packContainer) {
    // Get the packs tab content to scroll within
    const packsTabContent = document.getElementById('shopTabPacks');
    if (packsTabContent) {
      // Calculate position relative to the scrollable container
      const containerTop = packContainer.offsetTop;
      
      // Scroll the tab content
      packsTabContent.scrollTo({
        top: containerTop - 20, // 20px offset for better visibility
        behavior: 'smooth'
      });
      
      // Apply highlight effect
      setTimeout(() => {
        packContainer.classList.add('background-newly-purchasable-highlight');
        
        // Remove highlight after animation
        setTimeout(() => {
          packContainer.classList.remove('background-newly-purchasable-highlight');
        }, ANIMATION_TIMING.REWARD_HIGHLIGHT_DURATION);
      }, ANIMATION_TIMING.SCROLL_SETTLE_DELAY);
    }
  }
}

/**
 * Capitalize the first letter of a string
 * @param {string} str - The string to capitalize
 * @returns {string} - The capitalized string
 */
function capitalizeFirstLetter(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

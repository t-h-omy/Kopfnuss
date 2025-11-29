// Kopfnuss - Balancing Configuration
// Defines min/max values for each operation type
// Used by: logic/taskGenerators.js
// 
// Balancing values are selected based on dev mode setting:
// - Production (default): Uses DEFAULT_BALANCING and DEFAULT_CONFIG
// - Dev mode: Uses DEV_BALANCING and DEV_CONFIG (easier values for testing)

/**
 * Check if dev mode is enabled (reads directly from localStorage to avoid circular imports)
 * NOTE: This duplicates logic from storageManager.js intentionally to avoid circular imports,
 * since storageManager.js imports from this file. The dev mode check only happens once
 * during module initialization, and changing dev mode requires an app reload anyway.
 * @returns {boolean} True if dev mode is enabled
 */
function isDevModeEnabled() {
  try {
    const item = localStorage.getItem('kopfnuss_use_dev_balancing');
    if (item === null) {
      return false;
    }
    return JSON.parse(item) === true;
  } catch (error) {
    console.error('Error checking dev mode:', error);
    return false;
  }
}

// Determine which balancing to use based on dev mode (evaluated once at module load)
const useDevBalancing = isDevModeEnabled();

/**
 * Production balancing values (used when dev mode is OFF)
 */
const DEFAULT_BALANCING = {
  addition: {
    min: 10,
    max: 1500
  },
  subtraction: {
    min: 10,
    max: 999
  },
  multiplication: {
    factor1: { min: 2, max: 20 },
    factor2: { min: 2, max: 20 }
  },
  division: {
    divisor: { min: 2, max: 12 },
    quotient: { min: 2, max: 20 }
  },
  squared: {
    min: 2,
    max: 20
  }
};

/**
 * Dev balancing values (easier for testing)
 */
const DEV_BALANCING = {
  addition: {
    min: 1,
    max: 10
  },
  subtraction: {
    min: 1,
    max: 10
  },
  multiplication: {
    factor1: { min: 1, max: 5 },
    factor2: { min: 1, max: 5 }
  },
  division: {
    divisor: { min: 2, max: 5 },
    quotient: { min: 1, max: 5 }
  },
  squared: {
    min: 1,
    max: 5
  }
};

/**
 * Balancing values for different mathematical operations
 * Designed for 6th grade level (10-12 years old)
 * Applied in: logic/taskGenerators.js - generateAdditionTask(), generateSubtractionTask(), etc.
 */
export const BALANCING = useDevBalancing ? DEV_BALANCING : DEFAULT_BALANCING;

/**
 * Production game configuration constants (used when dev mode is OFF)
 */
const DEFAULT_CONFIG = {
  TASKS_PER_CHALLENGE: 8,
  DAILY_CHALLENGES: 5,
  TASKS_FOR_STREAK: 10,
  TASKS_PER_DIAMOND: 80,
  STREAK_RESCUE_COST: 1,
  FREEZE_AFTER_DAYS: 1,
  LOSE_AFTER_DAYS: 2,
  // Super Challenge settings
  SUPER_CHALLENGE_SPAWN_CHANCE: 0.25, // 25% chance for a super challenge to spawn
  SUPER_CHALLENGE_SPARKLE_COUNT: 12,  // Number of sparkle particles during super challenge
  // Shadow settings for modern drop shadow effects
  SHADOW_COLOR: 'rgba(0, 0, 0, 0.12)',  // Default shadow color
  SHADOW_BLUR_SMALL: '8px',             // Blur radius for small elements (capsules, small cards)
  SHADOW_BLUR_LARGE: '16px',            // Blur radius for large elements (nodes, popups)
  SHADOW_SPREAD_SMALL: '0px',           // Spread for small elements
  SHADOW_SPREAD_LARGE: '2px',           // Spread for large elements
  SHADOW_OFFSET_Y_SMALL: '4px',         // Vertical offset for small elements
  SHADOW_OFFSET_Y_LARGE: '6px'          // Vertical offset for large elements
};

/**
 * Dev game configuration constants (faster progression for testing)
 */
const DEV_CONFIG = {
  TASKS_PER_CHALLENGE: 2,
  DAILY_CHALLENGES: 5,
  TASKS_FOR_STREAK: 2,
  TASKS_PER_DIAMOND: 4,
  STREAK_RESCUE_COST: 1,
  FREEZE_AFTER_DAYS: 1,
  LOSE_AFTER_DAYS: 2,
  // Super Challenge settings (higher chance for testing)
  SUPER_CHALLENGE_SPAWN_CHANCE: 0.75, // 75% chance in dev mode for easier testing
  SUPER_CHALLENGE_SPARKLE_COUNT: 12,  // Number of sparkle particles during super challenge
  // Shadow settings for modern drop shadow effects
  SHADOW_COLOR: 'rgba(0, 0, 0, 0.12)',  // Default shadow color
  SHADOW_BLUR_SMALL: '8px',             // Blur radius for small elements (capsules, small cards)
  SHADOW_BLUR_LARGE: '16px',            // Blur radius for large elements (nodes, popups)
  SHADOW_SPREAD_SMALL: '0px',           // Spread for small elements
  SHADOW_SPREAD_LARGE: '2px',           // Spread for large elements
  SHADOW_OFFSET_Y_SMALL: '4px',         // Vertical offset for small elements
  SHADOW_OFFSET_Y_LARGE: '6px'          // Vertical offset for large elements
};

/**
 * Game configuration constants
 * Applied in: Various game logic files
 */
export const CONFIG = useDevBalancing ? DEV_CONFIG : DEFAULT_CONFIG;

/**
 * Challenge type definitions
 * Applied in: logic/challengeGenerator.js - used for challenge node display
 */
export const CHALLENGE_TYPES = {
  addition: {
    name: 'Addition',
    icon: '➕',
    difficulty: 1
  },
  subtraction: {
    name: 'Subtraktion',
    icon: '➖',
    difficulty: 1
  },
  multiplication: {
    name: 'Multiplikation',
    icon: '✖️',
    difficulty: 2
  },
  division: {
    name: 'Division',
    icon: '➗',
    difficulty: 2
  },
  mixed: {
    name: 'Gemischt',
    icon: '🎲',
    difficulty: 3
  },
  squared: {
    name: 'Quadratzahlen',
    icon: 'x²',
    difficulty: 2
  }
};

/**
 * Production background customization configuration (used when dev mode is OFF)
 */
const DEFAULT_BACKGROUNDS = {
  // Default background - always unlocked, cannot be purchased
  default: {
    id: 'default',
    name: 'Standard',
    file: 'backgrounds/background_compressed.webp',
    cost: 0,
    tasksRequired: 0,
    isDefault: true
  },
  // Unlockable backgrounds - can be purchased with diamonds after completing enough tasks
  sunset: {
    id: 'sunset',
    name: 'Sonnenuntergang',
    file: 'backgrounds/sunset_background_optimized.webp',
    cost: 1,
    tasksRequired: 16
  },
  unicorn: {
    id: 'unicorn',
    name: 'Einhorn',
    file: 'backgrounds/unicorn_background_optimized.webp',
    cost: 2,
    tasksRequired: 70
  },
  candy: {
    id: 'candy',
    name: 'Süßigkeiten',
    file: 'backgrounds/candy_background_optimized.webp',
    cost: 2,
    tasksRequired: 140
  },
  maineCoon: {
    id: 'maineCoon',
    name: 'Maine Coon',
    file: 'backgrounds/maine_coon_background_optimized.webp',
    cost: 4,
    tasksRequired: 350
  },
  elephant: {
    id: 'elephant',
    name: 'Elefant',
    file: 'backgrounds/elephant_background_less_saturated.webp',
    cost: 4,
    tasksRequired: 530
  },
  pomeranian: {
    id: 'pomeranian',
    name: 'Pomeranian',
    file: 'backgrounds/pomeranian_background_soft_optimized.webp',
    cost: 3,
    tasksRequired: 710
  },
  snakeJungle: {
    id: 'snakeJungle',
    name: 'Dschungelschlange',
    file: 'backgrounds/snake_jungle_background_optimized.webp',
    cost: 4,
    tasksRequired: 230
  },
  capybara: {
    id: 'capybara',
    name: 'Capybara',
    file: 'backgrounds/capybara_background_less_saturated.webp',
    cost: 4,
    tasksRequired: 850
  },
  dino: {
    id: 'dino',
    name: 'Dinosaurier',
    file: 'backgrounds/dino_background_optimized.webp',
    cost: 3,
    tasksRequired: 1000
  },
  instruments: {
    id: 'instruments',
    name: 'Musikinstrumente',
    file: 'backgrounds/instruments_optimized.webp',
    cost: 3,
    tasksRequired: 1180
  },
  orca: {
    id: 'orca',
    name: 'Orca',
    file: 'backgrounds/orca_background_optimized.webp',
    cost: 3,
    tasksRequired: 1350
  }
};

/**
 * Dev background customization configuration (faster unlock for testing)
 */
const DEV_BACKGROUNDS = {
  // Default background - always unlocked, cannot be purchased
  default: {
    id: 'default',
    name: 'Standard',
    file: 'backgrounds/background_compressed.webp',
    cost: 0,
    tasksRequired: 0,
    isDefault: true
  },
  // Unlockable backgrounds - lower tasksRequired for faster testing
  sunset: {
    id: 'sunset',
    name: 'Sonnenuntergang',
    file: 'backgrounds/sunset_background_optimized.webp',
    cost: 2,
    tasksRequired: 5
  },
  unicorn: {
    id: 'unicorn',
    name: 'Einhorn',
    file: 'backgrounds/unicorn_background_optimized.webp',
    cost: 2,
    tasksRequired: 10
  },
  candy: {
    id: 'candy',
    name: 'Süßigkeiten',
    file: 'backgrounds/candy_background_optimized.webp',
    cost: 2,
    tasksRequired: 10
  },
  maineCoon: {
    id: 'maineCoon',
    name: 'Maine Coon',
    file: 'backgrounds/maine_coon_background_optimized.webp',
    cost: 2,
    tasksRequired: 15
  },
  elephant: {
    id: 'elephant',
    name: 'Elefant',
    file: 'backgrounds/elephant_background_less_saturated.webp',
    cost: 2,
    tasksRequired: 2
  },
  pomeranian: {
    id: 'pomeranian',
    name: 'Pomeranian',
    file: 'backgrounds/pomeranian_background_soft_optimized.webp',
    cost: 2,
    tasksRequired: 2
  },
  snakeJungle: {
    id: 'snakeJungle',
    name: 'Dschungelschlange',
    file: 'backgrounds/snake_jungle_background_optimized.webp',
    cost: 2,
    tasksRequired: 2
  },
  capybara: {
    id: 'capybara',
    name: 'Capybara',
    file: 'backgrounds/capybara_background_less_saturated.webp',
    cost: 2,
    tasksRequired: 3
  },
  dino: {
    id: 'dino',
    name: 'Dinosaurier',
    file: 'backgrounds/dino_background_optimized.webp',
    cost: 2,
    tasksRequired: 3
  },
  instruments: {
    id: 'instruments',
    name: 'Musikinstrumente',
    file: 'backgrounds/instruments_optimized.webp',
    cost: 2,
    tasksRequired: 4
  },
  orca: {
    id: 'orca',
    name: 'Orca',
    file: 'backgrounds/orca_background_optimized.webp',
    cost: 2,
    tasksRequired: 4
  }
};

/**
 * Background customization configuration
 * Applied in: logic/backgroundManager.js, main.js - Background Customization Screen
 * 
 * Each background has a tasksRequired property that determines how many total
 * completed tasks are needed before the background becomes purchasable.
 * The default background (tasksRequired: 0) is always available.
 */
export const BACKGROUNDS = useDevBalancing ? DEV_BACKGROUNDS : DEFAULT_BACKGROUNDS;

/**
 * Production seasonal events configuration
 * Each event has:
 * - id: Unique identifier for the event
 * - name: Display name (German)
 * - emoticon: Currency emoticon
 * - currencyName: Name of the seasonal currency (German)
 * - startMonth/startDay: Event start date (month 1-12, day 1-31)
 * - endMonth/endDay: Event end date (month 1-12, day 1-31)
 * - popupTitle: Title for the event start popup
 * - popupDescription: Short description for the event start popup
 * 
 * To add a new event:
 * 1. Add a new entry with unique id
 * 2. Define all required properties (name, emoticon, currencyName, dates, popup content)
 * 3. Create a subfolder in assets/backgrounds/{eventId}/ for seasonal backgrounds
 * 4. Add seasonal backgrounds to SEASONAL_BACKGROUNDS with eventId matching this event
 */
const DEFAULT_SEASONAL_EVENTS = {
  christmas: {
    id: 'christmas',
    name: 'Weihnachten',
    emoticon: '🍭',
    currencyName: 'Zuckerstangen',
    currencyNameSingular: 'Zuckerstange',
    startMonth: 12,
    startDay: 1,
    endMonth: 12,
    endDay: 31,
    popupTitle: 'Weihnachts-Event',
    popupDescription: 'Sammle Zuckerstangen und schalte weihnachtliche Hintergründe frei!'
  },
  newYear: {
    id: 'newYear',
    name: 'Neujahr',
    emoticon: '🎆',
    currencyName: 'Feuerwerksblitze',
    currencyNameSingular: 'Feuerwerksblitz',
    startMonth: 1,
    startDay: 1,
    endMonth: 1,
    endDay: 7,
    popupTitle: 'Neujahrs-Event',
    popupDescription: 'Sammle Feuerwerksblitze und schalte festliche Hintergründe frei!'
  },
  valentines: {
    id: 'valentines',
    name: 'Valentinstag',
    emoticon: '🌹',
    currencyName: 'Rosen',
    currencyNameSingular: 'Rose',
    startMonth: 2,
    startDay: 7,
    endMonth: 2,
    endDay: 14,
    popupTitle: 'Valentinstags-Event',
    popupDescription: 'Sammle Rosen und schalte romantische Hintergründe frei!'
  },
  easter: {
    id: 'easter',
    name: 'Ostern',
    emoticon: '🥚',
    currencyName: 'Ostereier',
    currencyNameSingular: 'Osterei',
    startMonth: 3,
    startDay: 15,
    endMonth: 4,
    endDay: 21,
    popupTitle: 'Oster-Event',
    popupDescription: 'Sammle Ostereier und schalte frühlingshafte Hintergründe frei!'
  },
  summer: {
    id: 'summer',
    name: 'Sommerferien',
    emoticon: '☀️',
    currencyName: 'Sonnen',
    currencyNameSingular: 'Sonne',
    startMonth: 7,
    startDay: 1,
    endMonth: 8,
    endDay: 31,
    popupTitle: 'Sommerferien-Event',
    popupDescription: 'Sammle Sonnen und schalte sommerliche Hintergründe frei!'
  },
  halloween: {
    id: 'halloween',
    name: 'Halloween',
    emoticon: '🎃',
    currencyName: 'Kürbislaternen',
    currencyNameSingular: 'Kürbislaterne',
    startMonth: 10,
    startDay: 15,
    endMonth: 10,
    endDay: 31,
    popupTitle: 'Halloween-Event',
    popupDescription: 'Sammle Kürbislaternen und schalte gruselige Hintergründe frei!'
  }
};

/**
 * Dev seasonal events configuration (extended event periods for testing)
 */
const DEV_SEASONAL_EVENTS = {
  christmas: {
    id: 'christmas',
    name: 'Weihnachten',
    emoticon: '🍭',
    currencyName: 'Zuckerstangen',
    currencyNameSingular: 'Zuckerstange',
    startMonth: 11,
    startDay: 1,
    endMonth: 12,
    endDay: 31,
    popupTitle: 'Weihnachts-Event',
    popupDescription: 'Sammle Zuckerstangen und schalte weihnachtliche Hintergründe frei!'
  },
  newYear: {
    id: 'newYear',
    name: 'Neujahr',
    emoticon: '🎆',
    currencyName: 'Feuerwerksblitze',
    currencyNameSingular: 'Feuerwerksblitz',
    startMonth: 1,
    startDay: 1,
    endMonth: 1,
    endDay: 15,
    popupTitle: 'Neujahrs-Event',
    popupDescription: 'Sammle Feuerwerksblitze und schalte festliche Hintergründe frei!'
  },
  valentines: {
    id: 'valentines',
    name: 'Valentinstag',
    emoticon: '🌹',
    currencyName: 'Rosen',
    currencyNameSingular: 'Rose',
    startMonth: 2,
    startDay: 1,
    endMonth: 2,
    endDay: 20,
    popupTitle: 'Valentinstags-Event',
    popupDescription: 'Sammle Rosen und schalte romantische Hintergründe frei!'
  },
  easter: {
    id: 'easter',
    name: 'Ostern',
    emoticon: '🥚',
    currencyName: 'Ostereier',
    currencyNameSingular: 'Osterei',
    startMonth: 3,
    startDay: 1,
    endMonth: 4,
    endDay: 30,
    popupTitle: 'Oster-Event',
    popupDescription: 'Sammle Ostereier und schalte frühlingshafte Hintergründe frei!'
  },
  summer: {
    id: 'summer',
    name: 'Sommerferien',
    emoticon: '☀️',
    currencyName: 'Sonnen',
    currencyNameSingular: 'Sonne',
    startMonth: 6,
    startDay: 1,
    endMonth: 8,
    endDay: 31,
    popupTitle: 'Sommerferien-Event',
    popupDescription: 'Sammle Sonnen und schalte sommerliche Hintergründe frei!'
  },
  halloween: {
    id: 'halloween',
    name: 'Halloween',
    emoticon: '🎃',
    currencyName: 'Kürbislaternen',
    currencyNameSingular: 'Kürbislaterne',
    startMonth: 10,
    startDay: 1,
    endMonth: 10,
    endDay: 31,
    popupTitle: 'Halloween-Event',
    popupDescription: 'Sammle Kürbislaternen und schalte gruselige Hintergründe frei!'
  }
};

/**
 * Seasonal events configuration
 * Applied in: logic/eventManager.js
 */
export const SEASONAL_EVENTS = useDevBalancing ? DEV_SEASONAL_EVENTS : DEFAULT_SEASONAL_EVENTS;

/**
 * Production seasonal backgrounds configuration
 * Seasonal backgrounds are only available during their associated event.
 * They cost seasonal currency (not diamonds) and require tasks completed during the event.
 * 
 * Seasonal backgrounds are organized in subfolders by eventId:
 * - backgrounds/christmas/
 * - backgrounds/newyear/
 * - backgrounds/valentines/
 * - backgrounds/easter/
 * - backgrounds/summer/
 * - backgrounds/halloween/
 * 
 * To add a new seasonal background:
 * 1. Add the image file to the appropriate event subfolder
 * 2. Add a new entry here with eventId matching the event
 * 3. The background will automatically appear during that event
 */
const DEFAULT_SEASONAL_BACKGROUNDS = {
  // Christmas backgrounds
  gingerbread: {
    id: 'gingerbread',
    name: 'Lebkuchen',
    file: 'backgrounds/christmas/gingerbread_optimized.webp',
    cost: 2,
    tasksRequired: 80,
    eventId: 'christmas',
    isSeasonal: true
  },
  christmasTree: {
    id: 'christmasTree',
    name: 'Weihnachtsbaum',
    file: 'backgrounds/christmas/christmas_tree_presents_mobile.webp',
    cost: 2,
    tasksRequired: 100,
    eventId: 'christmas',
    isSeasonal: true
  },
  // New Year's backgrounds
  newYearFireworks: {
    id: 'newYearFireworks',
    name: 'Feuerwerk',
    file: 'backgrounds/background_compressed.webp', // TODO: Add to backgrounds/newyear/
    cost: 2,
    tasksRequired: 50,
    eventId: 'newYear',
    isSeasonal: true
  },
  // Valentine's Day backgrounds
  valentinesHearts: {
    id: 'valentinesHearts',
    name: 'Herzchen',
    file: 'backgrounds/background_compressed.webp', // TODO: Add to backgrounds/valentines/
    cost: 2,
    tasksRequired: 60,
    eventId: 'valentines',
    isSeasonal: true
  },
  // Easter backgrounds
  easterBunny: {
    id: 'easterBunny',
    name: 'Osterhase',
    file: 'backgrounds/background_compressed.webp', // TODO: Add to backgrounds/easter/
    cost: 2,
    tasksRequired: 70,
    eventId: 'easter',
    isSeasonal: true
  },
  // Summer backgrounds
  summerBeach: {
    id: 'summerBeach',
    name: 'Strandparadies',
    file: 'backgrounds/background_compressed.webp', // TODO: Add to backgrounds/summer/
    cost: 2,
    tasksRequired: 90,
    eventId: 'summer',
    isSeasonal: true
  },
  // Halloween backgrounds
  halloweenSpooky: {
    id: 'halloweenSpooky',
    name: 'Gruselhaus',
    file: 'backgrounds/background_compressed.webp', // TODO: Add to backgrounds/halloween/
    cost: 2,
    tasksRequired: 80,
    eventId: 'halloween',
    isSeasonal: true
  }
};

/**
 * Dev seasonal backgrounds configuration (lower requirements for testing)
 * Seasonal backgrounds are organized in subfolders by eventId
 */
const DEV_SEASONAL_BACKGROUNDS = {
  // Christmas backgrounds
  gingerbread: {
    id: 'gingerbread',
    name: 'Lebkuchen',
    file: 'backgrounds/christmas/gingerbread_optimized.webp',
    cost: 2,
    tasksRequired: 5,
    eventId: 'christmas',
    isSeasonal: true
  },
  christmasTree: {
    id: 'christmasTree',
    name: 'Weihnachtsbaum',
    file: 'backgrounds/christmas/christmas_tree_presents_mobile.webp',
    cost: 2,
    tasksRequired: 10,
    eventId: 'christmas',
    isSeasonal: true
  },
  // New Year's backgrounds
  newYearFireworks: {
    id: 'newYearFireworks',
    name: 'Feuerwerk',
    file: 'backgrounds/background_compressed.webp', // TODO: Add to backgrounds/newyear/
    cost: 2,
    tasksRequired: 5,
    eventId: 'newYear',
    isSeasonal: true
  },
  // Valentine's Day backgrounds
  valentinesHearts: {
    id: 'valentinesHearts',
    name: 'Herzchen',
    file: 'backgrounds/background_compressed.webp', // TODO: Add to backgrounds/valentines/
    cost: 2,
    tasksRequired: 6,
    eventId: 'valentines',
    isSeasonal: true
  },
  // Easter backgrounds
  easterBunny: {
    id: 'easterBunny',
    name: 'Osterhase',
    file: 'backgrounds/background_compressed.webp', // TODO: Add to backgrounds/easter/
    cost: 2,
    tasksRequired: 7,
    eventId: 'easter',
    isSeasonal: true
  },
  // Summer backgrounds
  summerBeach: {
    id: 'summerBeach',
    name: 'Strandparadies',
    file: 'backgrounds/background_compressed.webp', // TODO: Add to backgrounds/summer/
    cost: 2,
    tasksRequired: 9,
    eventId: 'summer',
    isSeasonal: true
  },
  // Halloween backgrounds
  halloweenSpooky: {
    id: 'halloweenSpooky',
    name: 'Gruselhaus',
    file: 'backgrounds/background_compressed.webp', // TODO: Add to backgrounds/halloween/
    cost: 2,
    tasksRequired: 8,
    eventId: 'halloween',
    isSeasonal: true
  }
};

/**
 * Seasonal backgrounds configuration
 * Applied in: logic/backgroundManager.js, logic/eventManager.js
 */
export const SEASONAL_BACKGROUNDS = useDevBalancing ? DEV_SEASONAL_BACKGROUNDS : DEFAULT_SEASONAL_BACKGROUNDS;

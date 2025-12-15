// Service Worker für Kopfnuss PWA
// Offline-Funktionalität und Caching mit Versionskontrolle
// BUILD_TIMESTAMP: 2025-12-04T08:57:00Z - Forces browser to detect SW changes

// Version wird aus version.js importiert (in SW context manuell definiert)
// Bei Updates: Version in version.js UND hier aktualisieren
const APP_VERSION = '1.29.2';
const CACHE_NAME = `kopfnuss-v${APP_VERSION}`;
const CACHE_PREFIX = 'kopfnuss-v';

const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './main.js',
  './manifest.json',
  './version.js',
  './data/balancingLoader.js',
  './data/balancing_prod.json',
  './data/balancing_dev.json',
  './data/constants.js',
  './logic/taskGenerators.js',
  './logic/challengeGenerator.js',
  './logic/challengeStateManager.js',
  './logic/taskFlow.js',
  './logic/streakManager.js',
  './logic/diamondManager.js',
  './logic/storageManager.js',
  './logic/taskScreenController.js',
  './logic/kopfnussTaskController.js',
  './logic/zeitChallengeTaskController.js',
  './logic/popupManager.js',
  './logic/visualEffects.js',
  './logic/backgroundManager.js',
  './logic/eventManager.js',
  './assets/celebration/challenge-node-bg-1.webp',
  './assets/celebration/challenge-node-bg-2.webp',
  './assets/celebration/challenge-node-bg-3.webp',
  './assets/celebration/challenge-node-bg-4.webp',
  './assets/celebration/challenge-node-bg-5.webp',
  './assets/backgrounds/01_default/background_compressed.webp',
  './assets/backgrounds/02_standard/sunset_background_optimized.webp',
  './assets/backgrounds/02_standard/unicorn_background_optimized.webp',
  './assets/backgrounds/02_standard/candy_background_optimized.webp',
  './assets/backgrounds/02_standard/maine_coon_background_optimized.webp',
  './assets/backgrounds/02_standard/elefant_pattern_mobile.webp',
  './assets/backgrounds/02_standard/pomeranian_background_soft_optimized.webp',
  './assets/backgrounds/02_standard/snake_jungle_background_optimized.webp'
];

/**
 * Installation Event - Cache initialisieren
 * Wird ausgelöst wenn neuer Service Worker installiert wird
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing version:', APP_VERSION);
  
  event.waitUntil(
    // First, delete ALL old caches to ensure clean slate
    caches.keys()
      .then((cacheNames) => {
        const oldCaches = cacheNames.filter((cacheName) => cacheName !== CACHE_NAME);
        return Promise.all(
          oldCaches.map((cacheName) => {
            console.log('[SW] Deleting old cache during install:', cacheName);
            return caches.delete(cacheName);
          })
        );
      })
      .then(() => caches.open(CACHE_NAME))
      .then((cache) => {
        console.log('[SW] Caching app files for version:', APP_VERSION);
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[SW] Installation complete');
        // Skip waiting und aktiviere sofort den neuen Service Worker
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Installation failed:', error);
      })
  );
});

/**
 * Activation Event - Alte Caches aufräumen
 * Wird ausgelöst wenn neuer Service Worker aktiviert wird
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating version:', APP_VERSION);
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        // Finde alle alten Cache-Versionen
        const oldCaches = cacheNames.filter((cacheName) => {
          // Nur Kopfnuss-Caches berücksichtigen
          if (!cacheName.startsWith(CACHE_PREFIX)) {
            return false;
          }
          // Alte Versionen löschen
          return cacheName !== CACHE_NAME;
        });
        
        if (oldCaches.length > 0) {
          console.log('[SW] Deleting old caches:', oldCaches);
        }
        
        // Alle alten Caches löschen
        return Promise.all(
          oldCaches.map((cacheName) => {
            console.log('[SW] Deleting cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      })
      .then(() => {
        console.log('[SW] Activation complete, version:', APP_VERSION);
        // Übernehme Kontrolle über alle Clients sofort
        return self.clients.claim();
      })
      .catch((error) => {
        console.error('[SW] Activation failed:', error);
      })
  );
});

/**
 * Fetch Event - Network First Strategie mit Cache Fallback
 * Versucht zuerst Netzwerk, bei Fehler Cache
 */
self.addEventListener('fetch', (event) => {
  // Nur GET Requests cachen
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Prüfe ob Response gültig ist
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }
        
        // Clone Response für Cache
        const responseToCache = response.clone();
        
        // Speichere in Cache für Offline-Zugriff
        caches.open(CACHE_NAME)
          .then((cache) => {
            cache.put(event.request, responseToCache);
          })
          .catch((error) => {
            console.error('[SW] Cache put failed:', error);
          });
        
        return response;
      })
      .catch(() => {
        // Bei Netzwerkfehler versuche aus Cache zu laden
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              console.log('[SW] Serving from cache:', event.request.url);
              return cachedResponse;
            }
            
            // Wenn auch im Cache nicht vorhanden, zeige Offline-Seite
            // (könnte später implementiert werden)
            console.log('[SW] No cache available for:', event.request.url);
            return new Response('Offline - Resource not available', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

/**
 * Message Event - Kommunikation mit der App
 * Ermöglicht der App, mit dem Service Worker zu kommunizieren
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      version: APP_VERSION,
      cacheName: CACHE_NAME
    });
  }
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('[SW] Clearing all caches on request');
    event.waitUntil(
      caches.keys()
        .then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => {
              console.log('[SW] Deleting cache:', cacheName);
              return caches.delete(cacheName);
            })
          );
        })
        .then(() => {
          console.log('[SW] All caches cleared');
          // Re-cache essential files
          return caches.open(CACHE_NAME);
        })
        .then((cache) => {
          return cache.addAll(urlsToCache);
        })
        .then(() => {
          console.log('[SW] Cache refreshed with new files');
        })
    );
  }
});

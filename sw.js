// Service Worker für Kopfnuss PWA
// Offline-Funktionalität und Caching

const CACHE_NAME = 'kopfnuss-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/main.js',
  '/manifest.json',
  // TODO: Screens hinzufügen
  // TODO: Assets hinzufügen
];

// Installation - Cache initialisieren
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // TODO: URLs zum Cache hinzufügen
        // return cache.addAll(urlsToCache);
      })
  );
});

// Activation - Alte Caches löschen
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // TODO: Alte Cache-Versionen löschen
          // if (cacheName !== CACHE_NAME) {
          //   return caches.delete(cacheName);
          // }
        })
      );
    })
  );
});

// Fetch - Network First, dann Cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // TODO: Response klonen und cachen
        // const responseToCache = response.clone();
        // caches.open(CACHE_NAME).then((cache) => {
        //   cache.put(event.request, responseToCache);
        // });
        return response;
      })
      .catch(() => {
        // TODO: Bei Netzwerkfehler aus Cache laden
        // return caches.match(event.request);
      })
  );
});

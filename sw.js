const CACHE_NAME = 'futbol-stats-cache-v1';
const APP_SHELL = [
  './',
  './index.html',
  './index.tsx',
  './manifest.json',
  './icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache, caching app shell');
        return cache.addAll(APP_SHELL);
      })
      .catch(err => {
        console.error('Failed to cache app shell:', err);
      })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Ignora las peticiones que no son GET
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((response) => {
        // Devuelve desde la caché si está disponible, si no, busca en la red (Cache First)
        if (response) {
          return response;
        }

        return fetch(event.request).then((networkResponse) => {
          // Si la petición a la red tiene éxito, la añade a la caché y la devuelve
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      });
    })
  );
});
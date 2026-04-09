const CACHE_NAME = 'pdf-master-ai-v9';
const ASSETS_TO_CACHE = [
  './',
  'index.html',
  'manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip API calls - always network
  if (url.pathname.includes('/api/')) {
    return;
  }

  // Navigation requests (loading the app) - Cache First, then Network
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        
        // Fallback to index.html if specific path not found in cache
        return caches.match('index.html').then((indexResponse) => {
          return indexResponse || fetch(request);
        });
      }).catch(() => fetch(request))
    );
    return;
  }

  // External assets (fonts, icons, worker)
  const isExternalAsset = url.origin !== self.location.origin && (
    url.hostname.includes('fonts.') || 
    url.hostname.includes('gstatic.') ||
    url.hostname.includes('cdn-icons-png.') ||
    url.pathname.includes('pdf.worker')
  );

  // Internal assets or allowed external assets
  const isInternalAsset = url.origin === self.location.origin;
  const isStaticAsset = url.pathname.includes('/assets/') || 
                        url.pathname.endsWith('.js') || 
                        url.pathname.endsWith('.css') ||
                        url.pathname.endsWith('.png') ||
                        url.pathname.endsWith('.jpg') ||
                        url.pathname.endsWith('.svg') ||
                        url.pathname.endsWith('.json');

  if (isInternalAsset || isExternalAsset) {
    // Cache First strategy for assets to ensure offline works perfectly
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse && isStaticAsset) {
          // For static assets (versioned), return from cache immediately
          return cachedResponse;
        }

        if (cachedResponse) {
          // For other assets, return cached but update in background
          fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache);
              });
            }
          }).catch(() => {});
          return cachedResponse;
        }

        // Not in cache, fetch from network
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        });
      })
    );
  }
});

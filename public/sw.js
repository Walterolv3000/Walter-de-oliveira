const CACHE_NAME = 'pdf-master-ai-v11-desktop';
const ASSETS_TO_CACHE = [
  '/',
  'index.html',
  'manifest.json'
];

self.addEventListener('install', (event) => {
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

  // Skip API calls and Vite internal requests
  if (url.pathname.includes('/api/') || 
      url.search.includes('?import') || 
      url.search.includes('?url') ||
      url.search.includes('?t=')) {
    return;
  }

  // Navigation requests (loading the app) - Network First
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('index.html');
      })
    );
    return;
  }

  // External assets (fonts, icons, worker, cmaps)
  const isExternalAsset = url.origin !== self.location.origin && (
    url.hostname.includes('fonts.') || 
    url.hostname.includes('gstatic.') ||
    url.hostname.includes('cdn-icons-png.') ||
    url.hostname.includes('unpkg.com') ||
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

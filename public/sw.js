const CACHE_NAME = 'pdf-master-ai-v4';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap',
  'https://cdn-icons-png.flaticon.com/512/337/337946.png',
  'https://unpkg.com/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs'
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
  // Skip cross-origin requests (except fonts/icons) and API calls
  const isApiCall = event.request.url.includes('/api/');
  const isExternalAsset = event.request.url.startsWith('https://fonts.') || 
                          event.request.url.startsWith('https://cdn-icons-png.') ||
                          event.request.url.includes('pdf.worker.min.mjs');

  if (isApiCall) return;

  if (!event.request.url.startsWith(self.location.origin) && !isExternalAsset) {
    return;
  }

  // Stale-while-revalidate strategy for assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Only cache valid responses from our origin or allowed external assets
        if (networkResponse && networkResponse.status === 200 && 
           (event.request.url.startsWith(self.location.origin) || isExternalAsset)) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // If network fails, we already returned cachedResponse if it exists
      });

      return cachedResponse || fetchPromise;
    })
  );
});

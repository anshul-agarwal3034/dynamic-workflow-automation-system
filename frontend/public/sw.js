const CACHE_NAME = 'formpilotx-cache-v1';
const STATIC_ASSETS = [
  '/app/public/index.html',
  '/app/public/manifest.json',
  '/app/public/logo.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bypass non-GET requests or browser extension protocols
  if (event.request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // Network-First for API calls to ensure live telemetry and submissions
  if (
    url.pathname.includes('/forms') ||
    url.pathname.includes('/public/') ||
    url.pathname.includes('/dashboard') ||
    url.pathname.includes('/auth') ||
    url.pathname.includes('/responses')
  ) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Stale-While-Revalidate for app assets, scripts, stylesheets, and fonts
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

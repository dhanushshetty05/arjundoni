if (self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1') {
  self.addEventListener('install', () => {
    self.skipWaiting();
  });
  self.addEventListener('activate', (event) => {
    event.waitUntil(
      self.registration.unregister()
        .then(() => self.clients.matchAll())
        .then((clients) => {
          clients.forEach((client) => {
            client.navigate(client.url);
          });
        })
    );
  });
} else {
  const CACHE_NAME = 'filmadcc-v1';
  const ASSETS_TO_CACHE = [
    '/',
    '/manifest.json',
    '/logo.png',
    '/icon-192.png',
    '/icon-512.png'
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
          cacheNames.map((cache) => {
            if (cache !== CACHE_NAME) {
              return caches.delete(cache);
            }
          })
        );
      })
    );
    self.clients.claim();
  });

  self.addEventListener('fetch', (event) => {
    // Only handle GET requests and local requests
    if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
      return;
    }
    
    // Bypass internal Next.js/Webpack assets, HMR, and API endpoints
    const url = new URL(event.request.url);
    if (
      url.pathname.startsWith('/_next/') || 
      url.pathname.includes('webpack') || 
      url.pathname.startsWith('/api/')
    ) {
      return;
    }
    
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((response) => {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Cache the response dynamically
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          
          return response;
        }).catch(() => {
          // Fallback for offline if fetching fails
          return new Response('Offline content not available', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain' })
          });
        });
      })
    );
  });
}

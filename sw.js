const CACHE_NAME = 'raqqa-market-cache-v5'; // Bumped version for update
const APP_SHELL_URLS = [
  '/', // Cache the root URL
  '/index.html',
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

self.addEventListener('install', event => {
  console.log('Service Worker: Install Event v5');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching App Shell v5');
        const requests = APP_SHELL_URLS.map(url => new Request(url, { cache: 'reload' }));
        return cache.addAll(requests);
      })
      .then(() => {
        // Force the waiting service worker to become the active service worker.
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', event => {
  console.log('Service Worker: Activate Event v5');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Claiming clients v5');
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Always go to the network for API calls, external resources, and non-GET requests.
  if (url.origin !== self.origin || request.method !== 'GET') {
    return; // Let the browser handle it.
  }

  // For navigation requests, always serve index.html from the cache.
  // This is the core fix for SPA 404s.
  if (request.mode === 'navigate') {
    event.respondWith(
        caches.match('/index.html', { cacheName: CACHE_NAME }).then(response => {
            return response || fetch('/index.html');
        })
    );
    return;
  }

  // For other assets, use a "cache-first" strategy.
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      // If we have a cached response, return it.
      if (cachedResponse) {
        return cachedResponse;
      }

      // If not, fetch from network, cache it, and return it.
      return fetch(request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      });
    })
  );
});

// This message listener allows the app to trigger the update flow.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});


// --- PUSH NOTIFICATION LOGIC ---
self.addEventListener('push', event => {
  let data;
  try {
    data = event.data.json();
  } catch (e) {
    data = {
      title: 'إشعار جديد',
      body: event.data.text(),
      url: '/',
    };
  }

  const title = data.title || 'سوق محافظة الرقة';
  const options = {
    body: data.body || 'لديك إشعار جديد.',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
    },
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const urlToOpen = new URL(event.notification.data.url || '/', self.location.origin).href;
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    }).then(clientList => {
      // Check if a window is already open with the target URL
      for (const client of clientList) {
        // Use new URL objects to compare paths without hash
        const clientUrl = new URL(client.url);
        const targetUrl = new URL(urlToOpen);
        if (clientUrl.pathname === targetUrl.pathname && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window is found, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
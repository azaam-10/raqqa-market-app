const CACHE_NAME = 'raqqa-market-cache-v3'; // Bumped version for update
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon.svg'
];

// On install, cache the app shell.
self.addEventListener('install', event => {
  console.log('Service Worker: Install Event');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching App Shell');
        return cache.addAll(urlsToCache);
      })
  );
});

// On activate, take control and clean up old caches.
self.addEventListener('activate', event => {
  console.log('Service Worker: Activate Event');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Claiming clients');
      return self.clients.claim(); // Take control of all open clients
    })
  );
});

// Listen for message from client to skip waiting.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('Service Worker: Received SKIP_WAITING message, activating new worker.');
    self.skipWaiting();
  }
});

// Fetch event: Handles requests for a Progressive Web App (PWA)
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Always go to the network for Supabase API calls and non-GET requests.
  if (url.hostname.includes('supabase.co') || request.method !== 'GET') {
    return; // Let the browser handle it.
  }

  // For navigation requests (e.g., opening the app or navigating to a new page),
  // use a "network-first, falling back to cache" strategy.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Try to fetch from the network first.
          const networkResponse = await fetch(request);
          return networkResponse;
        } catch (error) {
          // If the network fails (e.g., offline), serve the main app shell from the cache.
          console.log('Network request for navigation failed, serving app shell from cache.');
          const cache = await caches.open(CACHE_NAME);
          // The './index.html' must be in the cache from the 'install' event.
          const cachedResponse = await cache.match('./index.html');
          return cachedResponse;
        }
      })()
    );
    return;
  }

  // For all other assets (CSS, JS, images), use a "cache-first" strategy.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(request);
      
      // If we have a response in the cache, return it.
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // If not in cache, fetch from network, cache it, and return response.
      try {
        const networkResponse = await fetch(request);
        // Ensure we got a valid response before caching.
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          await cache.put(request, responseToCache);
        }
        return networkResponse;
      } catch (error) {
        console.error('Fetch failed for asset:', request.url, error);
        throw error;
      }
    })()
  );
});


// --- PUSH NOTIFICATION LOGIC (unchanged) ---
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
    icon: './icons/icon.svg',
    badge: './icons/icon.svg',
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
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

const CACHE_NAME = 'raqqa-market-cache-v2'; // Bumped version for update
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
      // Don't skipWaiting here, let the user decide via the popup
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

// Fetch event: Cache falling back to network strategy
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Always go to the network for Supabase API calls and non-GET requests.
  if (url.hostname.includes('supabase.co') || request.method !== 'GET') {
    // For POST, PUT, DELETE, etc., always use the network.
    // This is crucial for authentication and data mutations.
    event.respondWith(fetch(request));
    return;
  }

  // For all other GET requests, use a "Cache then Network" strategy.
  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(request).then(cachedResponse => {
        const fetchPromise = fetch(request).then(networkResponse => {
          // If we get a valid response, update the cache.
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(err => {
          // Network failed, this will be handled by the cachedResponse being returned if it exists.
          console.warn(`Service Worker: Network request for ${request.url} failed.`, err);
        });

        // Return cached response immediately if available, otherwise wait for the network response.
        return cachedResponse || fetchPromise;
      });
    })
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

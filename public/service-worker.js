/* eslint-disable no-restricted-globals */

const CACHE_NAME = 'campusos-notifications-v1';
const NOTIFICATION_CACHE = 'notifications-cache-v1';
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Install event - cache static assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/logo192.png',
        '/logo512.png',
        '/manifest.json',
        '/sounds/notification.mp3',
      ]);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME, NOTIFICATION_CACHE];
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
          return null;
        }).filter(Boolean)
      );
    })
  );
  
  // Take control of all clients
  event.waitUntil(clients.claim());
});

// Fetch event - serve from cache, falling back to network
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin) && 
      !event.request.url.startsWith(API_BASE_URL)) {
    return;
  }

  // Handle API requests
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful API responses
          if (response.status === 200) {
            const responseToCache = response.clone();
            caches.open(NOTIFICATION_CACHE)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
          }
          return response;
        })
        .catch(() => {
          // If network fails, try to get from cache
          return caches.match(event.request);
        })
    );
    return;
  }

  // For non-API requests, try cache first, then network
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      })
  );
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let notificationData;
  try {
    notificationData = event.data.json();
  } catch (e) {
    console.warn('Push event data is not valid JSON:', event.data.text());
    return;
  }

  const { title, body, icon, data } = notificationData;
  const options = {
    body,
    icon: icon || '/logo192.png',
    badge: '/logo192.png',
    data,
    vibrate: [200, 100, 200],
    timestamp: Date.now(),
    actions: [
      {
        action: 'view',
        title: 'View',
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
      },
    ],
  };

  // Show the notification
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const { action, notification } = event;
  const { data } = notification;

  if (action === 'dismiss') {
    // Handle dismiss action
    return;
  }

  // Handle view action or default click
  const urlToOpen = data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then((clientList) => {
        // Check if there's already a tab open with this URL
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }

        // No matching tabs, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Background sync for failed requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notifications') {
    event.waitUntil(handleBackgroundSync());
  }
});

async function handleBackgroundSync() {
  // Get all pending sync operations from IndexedDB
  const pendingSyncs = []; // You'll need to implement this
  
  for (const syncItem of pendingSyncs) {
    try {
      await fetch(syncItem.url, syncItem.options);
      // Remove from IndexedDB if successful
    } catch (error) {
      console.error('Background sync failed:', error);
      throw error; // Will trigger another sync event
    }
  }
}

// Handle push subscription changes
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    Promise.resolve()
      .then(() => {
        if (!event.oldSubscription) {
          return null;
        }
        
        return self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: event.oldSubscription.options.applicationServerKey,
        });
      })
      .then((newSubscription) => {
        if (!newSubscription) {
          return null;
        }
        
        // Send the new subscription to your server
        return fetch(`${API_BASE_URL}/api/notifications/subscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            oldSubscription: event.oldSubscription,
            newSubscription,
          }),
        });
      })
  );
});

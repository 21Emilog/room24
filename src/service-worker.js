/* eslint-disable no-restricted-globals */
/*
  RentMzansi service worker leveraging CRA Workbox injection point.
  Workbox will replace self.__WB_MANIFEST with a list of build assets.
  Includes push notification support for messages.
*/

const PRECACHE_MANIFEST = self.__WB_MANIFEST || [];
const SHELL_CACHE = 'rentmzansi-shell-v2';
const RUNTIME_IMG_CACHE = 'rentmzansi-img-runtime-v1';
const MAP_TILE_HOST_PATTERNS = [
  'tile.openstreetmap.org',
  'tiles.stadiamaps.com'
];

// App icon for notifications
const APP_ICON = '/android-chrome-192x192.png';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(cache => {
      return Promise.all(
        PRECACHE_MANIFEST.map(entry => {
          const url = entry.url || entry; // Workbox entries have url property
          return cache.add(url);
        })
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => ![SHELL_CACHE, RUNTIME_IMG_CACHE].includes(k)).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

// Handle push notifications
self.addEventListener('push', event => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'RentMzansi';
    const options = {
      body: data.body || 'You have a new notification',
      icon: data.icon || APP_ICON,
      badge: APP_ICON,
      tag: data.tag || 'rentmzansi-notification',
      data: data.data || {},
      vibrate: [200, 100, 200],
      requireInteraction: false,
      actions: data.actions || []
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (error) {
    console.error('Error handling push notification:', error);
  }
});

// Handle notification click
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const data = event.notification.data || {};
  let targetUrl = '/';

  // Navigate based on notification type
  if (data.type === 'message') {
    targetUrl = '/?view=messages';
  } else if (data.type === 'inquiry') {
    targetUrl = '/?view=messages';
  } else if (data.url) {
    targetUrl = data.url;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          // Send message to navigate
          client.postMessage({ type: 'NOTIFICATION_CLICK', data });
          return;
        }
      }
      // Otherwise open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Same-origin: try cache first for precached shell/static assets
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request))
    );
    return;
  }

  // Runtime caching for images & map tiles
  const isImage = request.destination === 'image';
  const isMapTile = MAP_TILE_HOST_PATTERNS.some(host => url.host.includes(host));

  if (isImage || isMapTile) {
    event.respondWith(
      caches.open(RUNTIME_IMG_CACHE).then(cache => cache.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response.status === 200) cache.put(request, response.clone());
          return response;
        }).catch(() => cached || Response.error());
      }))
    );
    return;
  }

  // Default network-first strategy
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

/* eslint-disable no-restricted-globals */
/*
  Lightweight custom service worker for RentMzansi.
  NOTE: Placed in public/ to avoid CRA Workbox injection requirement.
  Includes push notification support for messages.
*/

const VERSION = 'rentmzansi-v2';
const CORE_ASSETS = [
  '/',
  '/index.html'
];

const MAP_TILE_HOST_PATTERNS = [
  'tile.openstreetmap.org',
  'tiles.stadiamaps.com'
];

// App icon for notifications
const APP_ICON = '/android-chrome-192x192.png';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(VERSION).then(cache => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())
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

  const isImage = request.destination === 'image';
  const isMapTile = MAP_TILE_HOST_PATTERNS.some(host => url.host.includes(host));

  if (isImage || isMapTile) {
    event.respondWith(
      caches.open('images-runtime').then(cache => cache.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response.status === 200) cache.put(request, response.clone());
          return response;
        }).catch(() => cached || Response.error());
      }))
    );
    return;
  }

  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

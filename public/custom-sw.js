/* eslint-disable no-restricted-globals */
/*
  Lightweight custom service worker for RentMzansi.
  NOTE: Placed in public/ to avoid CRA Workbox injection requirement.
*/

const VERSION = 'rentmzansi-v1';
const CORE_ASSETS = [
  '/',
  '/index.html'
];

const MAP_TILE_HOST_PATTERNS = [
  'tile.openstreetmap.org',
  'tiles.stadiamaps.com'
];

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

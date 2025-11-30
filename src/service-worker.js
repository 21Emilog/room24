/* eslint-disable no-restricted-globals */
/*
  Room24 service worker leveraging CRA Workbox injection point.
  Workbox will replace self.__WB_MANIFEST with a list of build assets.
*/

const PRECACHE_MANIFEST = self.__WB_MANIFEST || [];
const SHELL_CACHE = 'room24-shell-v1';
const RUNTIME_IMG_CACHE = 'room24-img-runtime-v1';
const MAP_TILE_HOST_PATTERNS = [
  'tile.openstreetmap.org',
  'tiles.stadiamaps.com'
];

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

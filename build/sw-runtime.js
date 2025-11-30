// Runtime Service Worker for dynamic listings snapshot caching
const RUNTIME_CACHE = 'runtime-v1';
let latestListingsPayload = [];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(RUNTIME_CACHE));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};
  if (type === 'SYNC_LISTINGS' && Array.isArray(payload)) {
    latestListingsPayload = payload;
    // Put a synthetic Response into cache for /listings-runtime.json
    const response = new Response(JSON.stringify({ listings: latestListingsPayload, ts: Date.now() }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }
    });
    caches.open(RUNTIME_CACHE).then(cache => cache.put('/listings-runtime.json', response));
  }
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname === '/listings-runtime.json') {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(cache => cache.match('/listings-runtime.json').then(match => {
        if (match) return match;
        // Fallback to synthetic runtime response if not cached yet
        return new Response(JSON.stringify({ listings: latestListingsPayload, ts: Date.now(), offline: true }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }))
    );
    return;
  }
  // Pass-through other requests
});

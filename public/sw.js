const CACHE_NAME = 'polski-pwa-v7';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // OBRAZKI: Cache-First (jedyny typ pliku który keszujemy lokalnie)
  if (event.request.destination === 'image') {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        return cachedResponse || fetch(event.request).then(networkResponse => {
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        });
      })
    );
    return;
  }
  // Pozostałe zasoby (w tym strumieniowanie audio MP3 z nagłówkiem Range, JSON, API)
  // obsługiwane bezpośrednio przez natywny stos przeglądarki.
});

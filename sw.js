const CACHE_NAME = 'neurofit-cache-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './src/herramientas/vanilla/index.html',
  './src/herramientas/vanilla/css/dashboard.css',
  './src/herramientas/vanilla/css/tool-base.css'
  // El resto de herramientas nativas JS se cargarán on-demand y se cachearán solas después
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Devuelve validación cacheada o busca en red
        return response || fetch(event.request).then(
          function(networkResponse) {
            // Guardar copias ocultas de las nuevas herramientas a medida que se navega offline
            if(!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }
            var responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(function(cache) {
                cache.put(event.request, responseToCache);
              });
            return networkResponse;
          }
        );
      })
  );
});

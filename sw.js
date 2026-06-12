// Service Worker — Artesanos del Torno
// Network-first: siempre pide la versión más reciente al servidor.
// La caché solo se usa como fallback si no hay conexión.
const CACHE_NAME = 'adt-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // Solo peticiones GET del mismo origen
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  // Network-first para todo: HTML, CSS, JS, imágenes
  event.respondWith(
    fetch(req)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, clone));
        return res;
      })
      .catch(() => caches.match(req))
  );
});

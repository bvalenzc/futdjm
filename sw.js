// Service worker de FUTDJM — cachea la app para que funcione instalada y sin
// conexión. Subí CACHE_VERSION cada vez que cambies el HTML/CSS/JS para que
// los usuarios reciban la versión nueva en vez de la vieja cacheada.
const CACHE_VERSION = 'futdjm-v1';

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './assets/escudo/escudo_djm_real.png',
  './assets/jugadores/banado.jpg',
  './assets/jugadores/chelo.jpg',
  './assets/jugadores/costas.jpg',
  './assets/jugadores/lucho.jpg',
  './assets/jugadores/mato.jpg',
  './assets/jugadores/maxv.jpg',
  './assets/jugadores/mrillon.jpg',
  './assets/jugadores/pancho.jpg',
  './assets/jugadores/pelaoizq.jpg',
  './assets/jugadores/puente.jpg',
  './assets/jugadores/rafinha.jpg',
  './assets/jugadores/valenz.jpg',
  './assets/jugadores/vanti.jpg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Network-first para el HTML (para no quedar pegado en una versión vieja
// mientras hay conexión), cache-first para todo lo demás (fotos, íconos).
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const isHtml = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');

  if (isHtml) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, res.clone()));
          return res;
        })
        .catch(() => caches.match(req).then((res) => res || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.status === 200 && req.url.startsWith(self.location.origin)) {
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, res.clone()));
        }
        return res;
      }).catch(() => cached);
    })
  );
});

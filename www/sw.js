// Simple app-shell cache so Morse Invaders loads instantly and works offline.
const CACHE = 'morse-invaders-v6';
const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/morse.js',
  './js/config.js',
  './js/themes.js',
  './js/audio.js',
  './js/progress.js',
  './js/keyer.js',
  './js/games/invaders.js',
  './js/games/falling.js',
  './js/games/rhythm.js',
  './js/games/missile.js',
  './js/main.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((hit) =>
      hit || fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() => hit)
    )
  );
});

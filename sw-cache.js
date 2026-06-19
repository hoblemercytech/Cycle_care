const CACHE_NAME = 'cyclecare-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/auth.html',
  '/policy.html',
  '/auth.js',
  '/logo.png',
  '/auth.css',
  '/reset-password.html',
  '/dashboard.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});

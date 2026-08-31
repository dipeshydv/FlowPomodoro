// ── Cache version: bump this string to force all clients to evict old cache ──
const CACHE_NAME = 'flowpomodoro-v4';

// Static assets that are safe to serve from cache (rarely change)
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/app/index.html',
  '/style.css',
  '/blog/',
  '/blog/index.html',
  '/public/manifest.json',
  '/assets/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// JS/CSS/HTML files: always network-first so code updates are never masked
const NETWORK_FIRST_PATTERNS = [/\.js$/, /\.mjs$/, /\.css$/, /\.html$/];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Network-first for JS/CSS/HTML: always try network, fall back to cache
  if (NETWORK_FIRST_PATTERNS.some(re => re.test(url.pathname))) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for static assets (images, fonts, icons)
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
      .catch(() => caches.match('/index.html'))
  );
});


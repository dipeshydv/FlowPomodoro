// ── Cache version: bump this string to force all clients to evict old cache ──
const CACHE_NAME = 'flowpomodoro-v5';

// Static assets that are safe to serve from cache (rarely change)
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/app/',
  '/app/index.html',
  '/app/dashboard.html',
  '/app/today.html',
  '/app/pomodoro.html',
  '/app/goals.html',
  '/app/planner.html',
  '/app/analytics.html',
  '/app/challenges.html',
  '/app/reviews.html',
  '/app/settings.html',
  '/style.css',
  '/css/variables.css',
  '/css/base.css',
  '/css/layout.css',
  '/css/components.css',
  '/css/features.css',
  '/css/animations.css',
  '/css/platform.css',
  '/blog/index.html',
  '/public/manifest.json',
  '/assets/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Same-origin JS/CSS/HTML files: always network-first so code updates are never masked
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

  // CRITICAL: Do NOT intercept cross-origin requests (e.g. Google Fonts, Font Awesome CDN, Analytics, audio).
  // Let the browser handle cross-origin requests natively in page context.
  // This prevents Service Worker connect-src CSP violations and prevents returning HTML fallbacks for stylesheets/fonts.
  if (url.origin !== self.location.origin) {
    return;
  }

  // Network-first for same-origin JS/CSS/HTML & navigation requests: always try network, fall back to cache
  if (NETWORK_FIRST_PATTERNS.some(re => re.test(url.pathname)) || event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;

          // For HTML navigation requests when offline, return offline fallback page
          if (event.request.mode === 'navigate') {
            const offlinePage = await caches.match('/app/dashboard.html') ||
                               await caches.match('/app/index.html') ||
                               await caches.match('/index.html');
            if (offlinePage) return offlinePage;
          }

          // Return an actual Response on network failure instead of undefined
          return new Response('Network error occurred', {
            status: 408,
            headers: { 'Content-Type': 'text/plain' }
          });
        })
    );
    return;
  }

  // Cache-first for same-origin static assets (images, icons, fonts)
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return networkResponse;
        });
      })
      .catch(async () => {
        // Return 404 response if static asset is missing rather than HTML index
        return new Response('Not found', { status: 404, statusText: 'Not Found' });
      })
  );
});



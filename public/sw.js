const CACHE_VERSION = 'bill-book-v1';
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const PRECACHE_URLS = [
  '/',
  '/pos',
  '/settings',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-512-maskable.png',
  '/icons/apple-touch-icon.png',
  '/icons/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) =>
        Promise.allSettled(
          PRECACHE_URLS.map((url) =>
            cache.add(new Request(url, { cache: 'reload' })).catch(() => null)
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (event.data.type === 'CACHE_URLS' && Array.isArray(event.data.urls)) {
    const urls = event.data.urls.filter(
      (u) => typeof u === 'string' && u.startsWith(self.location.origin)
    );
    event.waitUntil(
      caches.open(RUNTIME_CACHE).then((cache) =>
        Promise.allSettled(
          urls.map(async (url) => {
            const existing = await cache.match(url);
            if (!existing) {
              const res = await fetch(url);
              if (res && res.ok) {
                await cache.put(url, res);
              }
            }
          })
        )
      )
    );
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Immutable Next.js static chunks & icons: Cache-First
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.json'
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              const copy = response.clone();
              caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => caches.match(request));
      })
    );
    return;
  }

  // Document navigation requests: Network-First with multi-level offline App Shell fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => {
              cache.put(request, copy.clone());
              // Also keep clean pathname cached so /?tab=pos falls back cleanly
              if (url.search) {
                cache.put(new Request(url.pathname), copy);
              }
            });
          }
          return response;
        })
        .catch(async () => {
          const exact = await caches.match(request);
          if (exact) return exact;
          const byPath = await caches.match(url.pathname);
          if (byPath) return byPath;
          const root = await caches.match('/');
          if (root) return root;
          return new Response(
            '<!doctype html><html><body style="font-family:sans-serif;padding:24px;text-align:center"><h2>Bill Book Offline</h2><p>Please reopen the app from your home screen.</p></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  // Other same-origin GETs (RSC payloads, fonts, etc.): Stale-While-Revalidate / Network fallback
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});


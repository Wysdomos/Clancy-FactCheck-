/* Service worker: makes the app load offline and start instantly.
   Bump CACHE_VERSION every time you change data.js, app.js, app.css or index.html. */
const CACHE_VERSION = "clancy-factcheck-v2.0.1";
const ASSETS = [
  "./",
  "./index.html",
  "./app.css",
  "./app.js",
  "./data.js",
  "./manifest.webmanifest",
  "./favicon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./maskable-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Same-origin requests: serve from cache first, refresh the cache in the background.
   Everything else (the news links) goes straight to the network. */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => {
      const fresh = fetch(req).then((res) => {
        if (res && res.ok) caches.open(CACHE_VERSION).then((c) => c.put(req, res.clone()));
        return res;
      }).catch(() => cached);
      return cached || fresh;
    })
  );
});

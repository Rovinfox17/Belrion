const CACHE_NAME = "belrion-static-v1";
const STATIC_ASSETS = [
  "/logo.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
  );
  self.clients.claim();
});

// Cache-first only for our static icon assets; everything else (pages, Server
// Actions, API calls) goes straight to the network so data stays fresh.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isStaticAsset =
    event.request.method === "GET" &&
    url.origin === self.location.origin &&
    STATIC_ASSETS.includes(url.pathname);

  if (!isStaticAsset) return;

  event.respondWith(
    caches.match(event.request).then((cached) => cached ?? fetch(event.request))
  );
});

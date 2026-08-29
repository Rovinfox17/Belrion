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

self.addEventListener("push", (event) => {
  let payload = { title: "Belrion", body: "Tienes una visita próxima.", url: "/calendario" };
  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch {
      payload.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: payload.url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? "/calendario";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsList) => {
      for (const client of clientsList) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      if (clientsList.length > 0 && "focus" in clientsList[0]) {
        clientsList[0].navigate(targetUrl);
        return clientsList[0].focus();
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});

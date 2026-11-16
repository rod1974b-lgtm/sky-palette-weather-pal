// Retired service worker. Earlier versions of My Weather Pal cached app files
// here, which could keep serving an outdated (crashing) build. This version
// clears every cache, unregisters itself and reloads open tabs onto the live app.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: "window" });
      clients.forEach((c) => c.navigate(c.url));
    })()
  );
});

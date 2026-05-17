// Heritage Heroes — Service Worker
// Caches all game assets for offline play. Bump CACHE_VERSION on every release
// so users get the latest code (the SW clears old caches on activate).
//
// Release contract: when you ship new files, increment "heritage-heroes-v1" to
// "heritage-heroes-v2", etc. Installed users will get the update on their next
// page load (the activate handler deletes every old cache key).

const CACHE_VERSION = "heritage-heroes-v1";

const ASSETS = [
  "./",
  "./index.html",
  "./styles/main.css",
  "./src/heroes.js",
  "./src/render.js",
  "./src/stages.js",
  "./src/storage.js",
  "./src/audio.js",
  "./src/combat.js",
  "./src/screens.js",
  "./src/main.js",
  "./manifest.json",
  "./icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  // Only handle GET requests for same-origin URLs
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      // Fall back to network; if successful, opportunistically cache for next time
      return fetch(event.request).then((response) => {
        if (response && response.status === 200 && response.type === "basic") {
          const respClone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, respClone));
        }
        return response;
      }).catch(() => {
        // Offline and not in cache — return a simple fallback
        return new Response("Offline and not cached", { status: 503 });
      });
    })
  );
});

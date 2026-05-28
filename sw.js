// Heritage Heroes — Service Worker
//
// Strategy: stale-while-revalidate for same-origin GET requests.
//   - Serves the cached copy immediately (instant loads + full offline play).
//   - In the background, re-fetches and updates the cache, so the NEXT load
//     picks up freshly-deployed code. This self-heals staleness: a returning
//     player converges to the latest version within a load or two even if
//     CACHE_VERSION is never bumped.
//
// History: the previous handler was cache-first with no revalidation, so once
// a player cached the assets they were frozen on that version forever (new
// releases never reached them). Stale-while-revalidate fixes that.
//
// CACHE_VERSION now only needs bumping for a HARD reset (e.g. to force-evict a
// known-bad cached asset). The activate handler deletes every non-current cache.

const CACHE_VERSION = "heritage-heroes-v2";

// Precache list — MUST stay in sync with the <script>/<link> tags in
// index.html. test/test-sw.js enforces this; add a module here when you add
// one to index.html, or a cold offline load will break with a missing module.
const ASSETS = [
  "./",
  "./index.html",
  "./styles/main.css",
  "./src/heroes.js",
  "./src/calendar.js",
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
  // Only handle GET requests for same-origin URLs.
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Navigations (e.g. opening a shared "?share=..." challenge link) resolve to
  // the cached app shell when the exact URL isn't cached — the query string
  // varies but index.html is the same document.
  const isNavigation = event.request.mode === "navigate";

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_VERSION);
    const cached = await cache.match(event.request, { ignoreSearch: isNavigation });

    // Background revalidation. Fire-and-forget the cache update; skip caching
    // navigations so arbitrary ?share= variants don't grow the cache (the
    // shell is already precached as "./" and "./index.html").
    const fromNetwork = fetch(event.request).then((response) => {
      if (!isNavigation && response && response.status === 200 && response.type === "basic") {
        cache.put(event.request, response.clone());
      }
      return response;
    }).catch(() => null);

    // Serve cache immediately when we have it; revalidate in the background.
    if (cached) return cached;

    // No cache hit — wait on the network, then fall back to the shell (for
    // navigations) or a plain offline response.
    const networkResponse = await fromNetwork;
    if (networkResponse) return networkResponse;
    if (isNavigation) {
      const shell = (await cache.match("./index.html")) || (await cache.match("./"));
      if (shell) return shell;
    }
    return new Response("Offline and not cached", { status: 503 });
  })());
});

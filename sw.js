const CACHE_VERSION = "v3";
const PRE_CACHE = [
  "/",
  "/index.html",
  "/likes.html",
  "/style.css",
  "/script.js",
  "/fallback.json",
  "/icon-192.png"
];
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(PRE_CACHE))
      .then(() => self.skipWaiting())
  );
});
self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request)
      .then(cached => cached || fetchWithFallback(e))
  );
});
async function fetchWithFallback(event) {
  try {
    const res = await fetch(event.request);
    const cache = await caches.open(CACHE_VERSION);
    cache.put(event.request, res.clone());
    return res;
  } catch (err) {
    if (event.request.url.endsWith(".json")) {
      return caches.match("/fallback.json");
    }
    return new Response("Offline", { status: 503 });
  }
}

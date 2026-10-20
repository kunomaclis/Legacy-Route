const CACHE = "legacy-route-v1";
const ASSETS = [
  "./", "index.html", "manifest.webmanifest",
  "assets/css/base.css", "assets/css/themes.css", "assets/js/app.js", "assets/icons.svg", "assets/app-icon.svg",
  "assets/fonts/cinzel-latin-600-normal.woff2", "assets/fonts/cinzel-latin-700-normal.woff2",
  "assets/fonts/crimson-pro-latin-400-normal.woff2", "assets/fonts/crimson-pro-latin-400-italic.woff2", "assets/fonts/crimson-pro-latin-600-normal.woff2"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// Network first so guide edits show up right away; the cache only covers offline use.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match("index.html")))
  );
});

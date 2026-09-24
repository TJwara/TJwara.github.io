// Coursemaccon Finance — service worker
// Cache-first for the app shell so it works offline once installed.
// Bump CACHE_NAME whenever you change any cached file, so the new version replaces the old.
// Check APP_SHELL paths against the deployed directory: cache.addAll rejects a missing file.
const CACHE_NAME = "coursemaccon-finance-v3";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json",
  "./images/favicon.ico.png",
  "./images/favicon.ico.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => cached);
    }),
  );
});

// Tapping a notification focuses the app if it's already open, or opens it fresh —
// the same behaviour a native app's notifications have.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("./index.html");
    }),
  );
});

// Best-effort background check, where the browser supports it (mainly installed
// PWAs on Android/Chrome). The OS decides if/when this actually runs — there's no
// guaranteed timing, and no data to read from here (localStorage isn't available
// to a service worker), so this is a gentle nudge rather than a live alert.
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "check-alerts") {
    event.waitUntil(
      self.registration.showNotification("Coursemaccon Finance", {
        body: "Open the app to check your latest bills, budgets, and alerts.",
        icon: "images/favicon.ico.png",
        badge: "images/favicon.ico.png",
        tag: "periodic-check",
      }),
    );
  }
});

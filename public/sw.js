// Simple Service Worker to satisfy PWA installation criteria
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  // Pass-through fetch (online-first)
  e.respondWith(fetch(e.request));
});

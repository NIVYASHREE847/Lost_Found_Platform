const CACHE_NAME = 'inocreal-v10';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './PandP.html',
    './TandC.html',
    './style.css',
    './script.js',
    './logo.png',
    './favicon.png',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './manifest.json'
    // External assets removed to prevent loading hangs. 
    // The browser will still cache them via standard HTTP cache.
];

// Install Service Worker
self.addEventListener('install', (event) => {
    self.skipWaiting(); // Force activation
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE).catch(err => {
                console.log('Service Worker: Cache failed for some assets', err);
                // Don't fail the entire installation if some assets fail
                return Promise.resolve();
            });
        })
    );
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Take control immediately
    );
});

// Fetch Assets
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || fetch(event.request);
        })
    );
});

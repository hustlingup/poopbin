const CACHE_NAME = 'poopbin-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/src/style.css',
    '/src/main.js',
    '/src/cloud.js',
    '/src/particles.js',
    '/src/counter.js',
    '/manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener('fetch', (event) => {
    // For Firebase requests, we might want to skip caching or handle differently.
    // But for now, simple cache-first for assets, network-first for others.

    if (event.request.url.includes('firebase')) {
        return; // Let Firebase SDK handle its own networking
    }

    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

const CACHE_NAME = 'Pixstream-iptv-v1';
const urlsToCache = [
    '/index.html',
    '/css/styles.css',
    '/js/script.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/hls.js@latest',
    'https://pixstream.netlify.app/img/logo.png',
    'https://pixstream.netlify.app/img/no-logo.png'
];

// Install event - cache app shell
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Caching app shell');
                return cache.addAll(urlsToCache);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        })
    );
    self.clients.claim(); // Take control immediately
});

// Fetch event - serve cached content or fetch from network
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached response if found
                if (response) {
                    return response;
                }
                // Fetch from network for uncached requests (e.g., streams)
                return fetch(event.request)
                    .catch(() => {
                        // Fallback for offline mode
                        return new Response(
                            '<h1>Offline</h1><p>Streaming is unavailable offline. Please connect to the internet.</p>',
                            {
                                headers: { 'Content-Type': 'text/html' }
                            }
                        );
                    });
            })
    );
});
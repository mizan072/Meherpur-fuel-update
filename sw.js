const CACHE_NAME = 'fuel-tracker-v1';

// যেসব ফাইল ক্যাশ করে রাখা হবে
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/@phosphor-icons/web',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// ১. Service Worker Install
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// ২. Service Worker Activate & Cleanup old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(keys
                .filter(key => key !== CACHE_NAME && key !== 'api-cache')
                .map(key => caches.delete(key))
            );
        })
    );
});

// ৩. Fetch Request Handling
self.addEventListener('fetch', event => {
    const url = event.request.url;

    // Google Apps Script API Call (Network First, Fallback to Cache)
    if (url.includes('script.google.com')) {
        event.respondWith(
            fetch(event.request).then(response => {
                const clonedResponse = response.clone();
                caches.open('api-cache').then(cache => cache.put(event.request, clonedResponse));
                return response;
            }).catch(() => {
                return caches.match(event.request);
            })
        );
    } else {
        // Static Files (Stale While Revalidate)
        event.respondWith(
            caches.match(event.request).then(cachedResponse => {
                const networkFetch = fetch(event.request).then(response => {
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
                    return response;
                }).catch(() => console.log('Offline and no cache available.'));
                
                return cachedResponse || networkFetch;
            })
        );
    }
});

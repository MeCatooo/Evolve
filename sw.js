const CACHE_NAME = 'evolve-pwa-v2';
const APP_SHELL = [
    './',
    './index.html',
    './wiki.html',
    './save.html',
    './manifest.webmanifest',
    './pwa-icon-192.png',
    './pwa-icon-512.png',
    './evolve/main.js',
    './evolve/evolve.js',
    './evolve/evolve.css',
    './wiki/wiki.js',
    './wiki/wiki.css',
    './lib/buefy.min.0.9.22.css',
    './lib/weather-icons.min.css',
    './lib/weather-icons-wind.min.css',
    './lib/lz-string.min.js',
    './strings/strings.json',
    './strings/strings.cs-CZ.json',
    './strings/strings.de-DE.json',
    './strings/strings.es-ES.json',
    './strings/strings.im-PL.json',
    './strings/strings.it-IT.json',
    './strings/strings.ja-JP.json',
    './strings/strings.ko-KR.json',
    './strings/strings.pl-PL.json',
    './strings/strings.pt-BR.json',
    './strings/strings.ru-RU.json',
    './strings/strings.zh-CN.json',
    './strings/strings.zh-TW.json'
];
const CACHEABLE_HOSTS = new Set([
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'unpkg.com'
]);
const VENDOR_RESOURCES = [
    ['https://unpkg.com/jquery@3.6.3/dist/jquery.min.js', 'cors'],
    ['https://unpkg.com/vue@2.7.14/dist/vue.min.js', 'cors'],
    ['https://unpkg.com/buefy@0.9.22/dist/buefy.min.js', 'cors'],
    ['https://unpkg.com/@popperjs/core@2.9.2/dist/umd/popper.min.js', 'cors'],
    ['https://unpkg.com/sortablejs@1.10.2/Sortable.min.js', 'cors'],
    ['https://unpkg.com/chart.js@3.8.2/dist/chart.min.js', 'cors'],
    ['https://fonts.googleapis.com/css?family=Lato&display=swap', 'no-cors']
];

self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(APP_SHELL);
        await Promise.allSettled(VENDOR_RESOURCES.map(async ([url, mode]) => {
            const request = new Request(url, { mode, credentials: 'omit' });
            const response = await fetch(request);
            if (response.ok || response.type === 'opaque') {
                await cache.put(request, response);
            }
        }));
        await self.skipWaiting();
    })());
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const names = await caches.keys();
        await Promise.all(names.filter((name) => name.startsWith('evolve-pwa-') && name !== CACHE_NAME).map((name) => caches.delete(name)));
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') {
        return;
    }

    const url = new URL(request.url);
    const sameOrigin = url.origin === self.location.origin;
    if (!sameOrigin && !CACHEABLE_HOSTS.has(url.hostname)) {
        return;
    }

    if (request.mode === 'navigate') {
        event.respondWith((async () => {
            try {
                const response = await fetch(request);
                if (response.ok && sameOrigin) {
                    const cache = await caches.open(CACHE_NAME);
                    cache.put(request, response.clone());
                }
                return response;
            }
            catch {
                return await caches.match(request) || await caches.match('./index.html');
            }
        })());
        return;
    }

    event.respondWith((async () => {
        const cached = await caches.match(request);
        if (cached) {
            return cached;
        }
        try {
            const response = await fetch(request);
            if (response.ok || response.type === 'opaque') {
                const cache = await caches.open(CACHE_NAME);
                await cache.put(request, response.clone());
            }
            return response;
        }
        catch {
            return Response.error();
        }
    })());
});

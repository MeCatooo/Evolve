const CACHE_NAME = 'evolve-pwa-v3';
// How long to wait for the server before settling for the cached copy
const NETWORK_TIMEOUT = 4000;
// What the game can't start without. These are only ever cached as a complete set, so that
// the cache can't end up serving a new main.js with an older stylesheet or worker.
const CORE = [
    './index.html',
    './evolve/main.js',
    './evolve/evolve.js',
    './evolve/evolve.css',
    './strings/strings.json'
];
const APP_SHELL = [
    './wiki.html',
    './save.html',
    './manifest.webmanifest',
    './pwa-icon-192.png',
    './pwa-icon-512.png',
    './evolved.ico',
    './evolved-light.ico',
    './wiki/wiki.js',
    './wiki/wiki.css',
    './lib/buefy.min.0.9.22.css',
    './lib/weather-icons.min.css',
    './lib/weather-icons-wind.min.css',
    './lib/lz-string.min.js',
    './lib/cryptojs.min.js',
    './lib/noise.png',
    './lib/cat.png',
    './lib/dog.png',
    './lib/mine.png',
    './lib/copper-miner.png',
    './lib/blocking-resource.png',
    './lib/blocking-stack.png',
    './font/weathericons-regular-webfont.woff2',
    './font/weathericons-regular-webfont.woff',
    './font/weathericons-regular-webfont.ttf',
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
const CORE_URLS = new Set(['./', ...CORE].map((path) => new URL(path, self.location).href));

// A page that had to start from the cache sticks to it, rather than mixing in newer files
let cacheOnlyUntil = 0;

async function refreshCore(cache) {
    const responses = await Promise.all(CORE.map(async (path) => {
        const response = await fetch(path, { cache: 'no-cache' });
        if (!response.ok) {
            throw new Error(`${path}: ${response.status}`);
        }
        return response;
    }));
    await Promise.all(responses.map((response, i) => cache.put(CORE[i], response)));
}

self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        // Failing here keeps the previous version running, it's better off than one that can't start offline
        await refreshCore(cache);
        await Promise.allSettled(APP_SHELL.map((path) => cache.add(new Request(path, { cache: 'no-cache' }))));
        await Promise.allSettled(VENDOR_RESOURCES.map(async ([url, mode]) => {
            const request = new Request(url, { mode, credentials: 'omit' });
            const response = await caches.match(request) || await fetch(request);
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

function usable(response) {
    return response && (response.ok || response.type === 'opaqueredirect');
}

async function networkFirst(event, cache) {
    const request = event.request;
    const navigation = request.mode === 'navigate';
    const url = new URL(request.url);
    url.search = '';
    const core = CORE_URLS.has(url.href);
    const cached = async () => await cache.match(request, { ignoreSearch: navigation }) || (navigation ? await cache.match('./index.html') : undefined);

    if (core && !navigation && Date.now() < cacheOnlyUntil) {
        const copy = await cached();
        if (copy) {
            return copy;
        }
    }

    // Navigation requests can't be rebuilt, everything else revalidates against the server to skip the HTTP cache
    const network = fetch(navigation ? request : new Request(request, { cache: 'no-cache' })).then((response) => {
        if (response.ok && !core) {
            event.waitUntil(cache.put(request, response.clone()));
        }
        return response;
    });
    event.waitUntil(network.catch(() => undefined));

    const timeout = new Promise((resolve) => setTimeout(resolve, NETWORK_TIMEOUT));
    const response = await Promise.race([network.catch(() => undefined), timeout]);
    if (usable(response)) {
        if (navigation) {
            cacheOnlyUntil = 0;
            event.waitUntil(refreshCore(cache).catch(() => undefined));
        }
        return response;
    }

    const copy = await cached();
    if (copy) {
        if (navigation) {
            cacheOnlyUntil = Date.now() + 30000;
        }
        return copy;
    }
    return response || network;
}

async function cacheFirst(event) {
    const cached = await caches.match(event.request);
    if (cached) {
        return cached;
    }
    const response = await fetch(event.request);
    if (response.ok || response.type === 'opaque') {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(event.request, response.clone());
    }
    return response;
}

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') {
        return;
    }

    const url = new URL(request.url);
    if (url.origin === self.location.origin) {
        event.respondWith(caches.open(CACHE_NAME).then((cache) => networkFirst(event, cache)));
    }
    else if (CACHEABLE_HOSTS.has(url.hostname)) {
        // These urls are versioned, what's in the cache is always right
        event.respondWith(cacheFirst(event).catch(() => Response.error()));
    }
});

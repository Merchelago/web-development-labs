/*
 * Service Worker приложения «Мой список покупок».
 * Стратегии кэширования:
 *   - навигация (HTML-страницы)        — Network First с откатом на кэш;
 *   - оболочка приложения (CSS, JS, иконки) — Cache First;
 *   - прочие ресурсы того же сайта     — Stale While Revalidate.
 * При изменении VERSION создаётся новый кэш, старые удаляются при активации.
 */
const VERSION = 'v1.0.1';
const STATIC_CACHE = `shopping-static-${VERSION}`;
const RUNTIME_CACHE = `shopping-runtime-${VERSION}`;

const APP_SHELL = [
  './',
  './index.html',
  './offline.html',
  './manifest.json',
  './css/style.css',
  './js/app.js',
  './js/db.js',
  './js/ui.js',
  './js/pwa.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-192.png',
  './icons/favicon-32.png',
  './icons/apple-touch-icon.png',
  './icons/shortcut-add-96.png',
];

const SHELL_PATHS = new Set(APP_SHELL.map((p) => new URL(p, self.location).pathname));

// Установка: заранее кладём оболочку приложения в кэш
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL)));
});

// Активация: удаляем кэши предыдущих версий и берём управление открытыми вкладками
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith('shopping-') && key !== STATIC_CACHE && key !== RUNTIME_CACHE)
        .map((key) => caches.delete(key)),
    );
    await self.clients.claim();
  })());
});

// Сообщения от страницы: применить обновление, узнать версию
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'GET_VERSION') {
    event.source?.postMessage({ type: 'VERSION', version: VERSION, cache: STATIC_CACHE });
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
  } else if (SHELL_PATHS.has(url.pathname)) {
    event.respondWith(cacheFirst(request));
  } else {
    event.respondWith(staleWhileRevalidate(request, event));
  }
});

// Network First: свежая страница из сети, при её отсутствии — из кэша
async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetchWithTimeout(request, 3000);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return (await caches.match(request, { ignoreSearch: true }))
      || (await caches.match('./index.html'))
      || (await caches.match('./offline.html'));
  }
}

// Cache First: ресурсы оболочки отдаются из кэша, в сеть — только если их там нет
async function cacheFirst(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(STATIC_CACHE)).put(request, response.clone());
  return response;
}

// Stale While Revalidate: сразу отдаём кэш, параллельно обновляем его из сети
async function staleWhileRevalidate(request, event) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => undefined);
  event.waitUntil(network);
  return cached || (await network) || new Response('', { status: 504, statusText: 'Offline' });
}

function fetchWithTimeout(request, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    fetch(request).then(
      (response) => { clearTimeout(timer); resolve(response); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

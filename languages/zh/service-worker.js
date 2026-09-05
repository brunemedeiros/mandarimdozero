// Service worker do Mandarim do Zero — cache básico pra funcionar offline
// depois da primeira visita. Estratégia: network-first pros arquivos do
// próprio site (sempre pega a versão mais nova quando há internet), com
// fallback pro cache quando offline. Nunca intercepta chamadas ao Supabase
// (essas precisam de rede de verdade; o app já trata erro de rede sozinho).
const CACHE_NAME = 'mandarim-do-zero-v4';
const PRECACHE_URLS = [
  './',
  './index.html',
  './app.js',
  './content.js',
  './audio-manifest.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Só cuida de requisições GET do próprio domínio — Supabase e CDNs externos
  // seguem direto pra rede, sem passar pelo cache.
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;

  // cache: 'no-store' força ignorar o cache HTTP do próprio navegador nesse
  // fetch -- sem isso, "network-first" podia devolver uma resposta antiga
  // que o navegador já tinha em cache, mesmo com internet disponível.
  event.respondWith(
    fetch(event.request, { cache: 'no-store' })
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
  );
});

// Service worker do Mandarim do Zero — cache básico pra funcionar offline
// depois da primeira visita. Estratégia: network-first pros arquivos do
// próprio site (sempre pega a versão mais nova quando há internet), com
// fallback pro cache quando offline. Nunca intercepta chamadas ao Supabase
// (essas precisam de rede de verdade; o app já trata erro de rede sozinho).
const CACHE_NAME = 'mandarim-do-zero-v7';
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

// ---------- Push (Fase 3 do sistema de notificações) ----------
// A mensagem chega criptografada e o navegador já entrega decifrada aqui
// -- quem manda (Edge Function push-send ou notification-cron, ver
// shared/push.js) monta o payload como JSON simples {title, body, icon,
// actionTab}. Sem body/JSON válido, mostra um texto genérico em vez de
// falhar silenciosamente (alguém pediu push, merece ver ALGUMA coisa).
self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch (e) { payload = {}; }

  const title = payload.title || 'Notificação';
  const options = {
    body: payload.body || 'Você tem uma notificação nova.',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    data: { actionTab: payload.actionTab || null },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Clique na notificação do sistema: foca uma aba já aberta do app se
// existir (e manda a aba certa por postMessage -- ver listener em
// shared/push.js), senão abre uma nova já com ?notif_tab= na URL (não dá
// pra usar postMessage aqui: não existe ninguém escutando ainda numa aba
// que nem carregou -- shared/push.js lê esse parâmetro no carregamento e
// shared/auth.js aplica depois que o app termina de renderizar, ver
// applyPendingNotificationTab()).
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const actionTab = event.notification.data?.actionTab || null;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(self.location.pathname.replace('service-worker.js', 'index.html')));
      if (existing){
        if (actionTab) existing.postMessage({ type: 'notification-click', actionTab });
        return existing.focus();
      }
      const url = actionTab ? `./index.html?notif_tab=${encodeURIComponent(actionTab)}` : './index.html';
      return self.clients.openWindow(url);
    })
  );
});

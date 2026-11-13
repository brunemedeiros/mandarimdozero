// Service worker do Français avec Prof. Brune — cache básico pra funcionar
// offline depois da primeira visita. Estratégia: network-first pros arquivos
// do próprio site (sempre pega a versão mais nova quando há internet), com
// fallback pro cache quando offline. Nunca intercepta chamadas ao Supabase
// (essas precisam de rede de verdade; o app já trata erro de rede sozinho).
// __BUILD_ID__ é substituído pelo commit SHA em todo deploy (ver
// .github/workflows/deploy-pages.yml) -- versionamento automático em vez de
// incremento manual (v7, v11...): garante que todo push em main muda o nome
// do cache e força o navegador a buscar os arquivos novos, sem depender de
// alguém lembrar de bumpar um número (ver Fase 4 da tarefa PWA/mobile).
// Localmente (sem passar pelo Actions) o placeholder fica intacto -- ainda
// funciona, só não muda de versão entre testes locais.
// O fr e o zh moram no MESMO endereço (app.profbrune.com.br/fr e /zh) e por isso dividem a mesma lista de caches do
// navegador: cada um só mexe nos caches com o próprio prefixo (antes, publicar o fr apagava o cache do zh e vice-versa).
const BUILD_ID = '__BUILD_ID__';
const CACHE_PREFIX = 'frances-avec-prof-brune-';
const CACHE_NAME = CACHE_PREFIX + BUILD_ID;
// Tela "Sem internet" (decisão da autora, 2026-11-11: por enquanto o site só funciona com internet). Comum a todos os
// sites; entregue no lugar do app quando uma abertura não consegue falar com o servidor (ver o 'fetch' abaixo).
const OFFLINE_URL = '../shared/offline.html';
const PRECACHE_URLS = [
  OFFLINE_URL,
  './',
  './index.html',
  './app.js',
  './content.js',
  './curriculum-changes.js',
  './conjugation-data.js',
  './dictations.js',
  './challenges.js',
  './audio-manifest.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-192-maskable.png',
  './icons/icon-512-maskable.png',
  './icons/favicon-32.png',
  './icons/favicon-16.png',
  './logo/ativo1-lockup.svg',
  './logo/ativo3-icone.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Pré-cache também revalidando (no-cache): sem isso, um arquivo ainda no cache HTTP (max-age do servidor) podia
    // entrar no cache da versão nova com o conteúdo da anterior.
    await cache.addAll(PRECACHE_URLS.map((u) => new Request(u, { cache: 'no-cache' })));
    // Sem internet logo depois de uma publicação (2026-11-11, tests/pwa-cache): a lista acima tem só ~18 arquivos; os
    // outros (~200: shared/*.js, CSS, fontes, ícones) só entravam no cache novo na próxima abertura COM internet. Como o
    // 'activate' apaga o cache antigo, quem abria o app sem internet nesse intervalo recebia a página no lugar dos
    // scripts e o app não abria. Agora a versão nova busca de novo (no-cache: o que não mudou volta 304, sem corpo)
    // tudo o que a versão anterior tinha guardado. Arquivo que falhar (sumiu do site, rede caiu) é pulado: não
    // impede a instalação.
    const antigos = (await caches.keys()).filter((n) => n.startsWith(CACHE_PREFIX) && n !== CACHE_NAME);
    const urls = new Set();
    for (const n of antigos) for (const req of await (await caches.open(n)).keys()) urls.add(req.url);
    const jaTem = new Set((await cache.keys()).map((req) => req.url));
    await Promise.all([...urls].filter((u) => !jaTem.has(u)).map((u) =>
      fetch(u, { cache: 'no-cache' }).then((res) => (res.ok ? cache.put(u, res) : null)).catch(() => null)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n.startsWith(CACHE_PREFIX) && n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

// shared/pwa.js pergunta a versão deste SW quando ele assume a página (controllerchange) e só mostra o aviso
// "Nova versão disponível" se for diferente da versão que a página carregou (2026-11-11: antes aparecia em quase
// toda visita depois de um deploy, mesmo com a página já atualizada).
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'get-build-id' && event.ports && event.ports[0]){
    event.ports[0].postMessage({ buildId: BUILD_ID });
  }
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Só cuida de requisições GET do próprio domínio — Supabase e CDNs externos
  // seguem direto pra rede, sem passar pelo cache.
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;

  // cache: 'no-cache' (melhoria 4 da revisão de arquitetura, 2026-10-26): o navegador SEMPRE pergunta ao servidor
  // (If-None-Match/If-Modified-Since) antes de usar o cache HTTP -- então "network-first" nunca devolve uma versão
  // antiga quando há internet -- mas o que não mudou volta como 304, sem corpo. Antes era 'no-store', que baixava os
  // ~150 arquivos inteiros (cerca de 3,7 MB no fr) a cada abertura. Versão nova: cada deploy muda este arquivo
  // (__BUILD_ID__), o navegador instala o SW novo e shared/pwa.js oferece recarregar
  // só se a página estiver com a versão antiga; e cada arquivo alterado tem
  // ETag novo, então chega na hora (200) mesmo antes disso.
  event.respondWith(
    fetch(event.request, { cache: 'no-cache' })
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return paraAPagina(response);
      })
      // Sem internet: abrir o site (navegação) mostra a tela "Sem internet", nunca o app pela metade (2026-11-11: logada,
      // o app esperava ~40 s pelo servidor e mostrava a trilha zerada). Arquivo pedido por uma página já aberta: a cópia
      // guardada, se houver; senão erro de rede (antes ia a página no lugar do script, "Unexpected token '<'").
      .catch(() => (event.request.mode === 'navigate'
        ? caches.match(OFFLINE_URL)
        : caches.match(event.request)).then((cached) => cached || Response.error()))
  );
});

// Recarregar a página (puxar para baixo, F5) logo depois de uma publicação (2026-11-11, tests/pwa-cache): o Chromium
// guarda na memória da aba os scripts e CSS já carregados e, se o servidor disse que valem por 10 minutos (max-age=600
// do GitHub Pages), reaproveita esses arquivos SEM passar por aqui. Resultado: index.html novo com content.js e
// shared/*.js antigos (versões misturadas) até o aviso "Atualizar" aparecer. A página recebe então uma cópia com
// Cache-Control: no-cache, que obriga o navegador a passar por este service worker de novo ao recarregar. Não custa
// internet: a busca acima continua respondida com 304 quando nada mudou. Só para respostas 200 (o áudio em pedaços, 206,
// e erros passam como vieram).
function paraAPagina(response){
  if (response.status !== 200 || response.type !== 'basic') return response;
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'no-cache');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

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

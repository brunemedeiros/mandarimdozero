// ---------- PWA: registra o service worker (cache offline) ----------
// 'service-worker.js' é relativo ao HTML que carregou este script -- cada
// idioma continua com o seu próprio arquivo (cache list diferente por
// conteúdo/áudio), só o código de registro em si é idêntico.

// Versão do código que ESTA página carregou. O deploy (.github/workflows/
// deploy-pages.yml) troca o marcador pelo SHA curto do commit, o mesmo que
// vai para o service-worker.js. Localmente os dois ficam com o marcador
// intacto, então são iguais e o aviso não aparece.
const PWA_PAGE_BUILD_ID = '__BUILD_ID__';

if ('serviceWorker' in navigator){
  // Se esta aba JÁ tinha um controller antes de registrar, um novo
  // `controllerchange` depois é uma troca de service worker de verdade. Se
  // NUNCA teve controller (primeira visita), o primeiro `controllerchange` é
  // só o SW recém-instalado assumindo pela primeira vez -- não é
  // "atualização", é "chegada".
  const hadControllerAtLoad = !!navigator.serviceWorker.controller;

  // Nunca recarrega sozinho (não interromper lição/exercício/revisão em
  // andamento): só avisa com um banner dispensável e recarrega no clique em
  // "Atualizar".
  //
  // Aviso só quando a página está MESMO com o código antigo (2026-11-11):
  // como o service worker busca tudo na rede antes do cache (network-first),
  // quem abre ou recarrega o site depois de um deploy já recebe os arquivos
  // novos; o SW novo assume alguns segundos depois e o `controllerchange`
  // dispara mesmo assim. Antes, isso mostrava "Nova versão disponível" em
  // quase toda visita depois de um deploy (alarme falso). Agora a página
  // pergunta a versão ao SW novo e só mostra o aviso se for diferente da que
  // ela carregou (aba aberta há horas/dias, app instalado no celular).
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadControllerAtLoad) return;
    askControllerBuildId(3000).then((swBuildId) => {
      if (swBuildId && swBuildId === PWA_PAGE_BUILD_ID) return; // já está na versão nova
      showPwaUpdateBanner(); // versão diferente, ou SW sem resposta: avisa (comportamento antigo)
    });
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => { /* offline não crítico */ });
  });
}

// Pergunta ao service worker que controla a página qual é a versão dele
// (resposta pelo MessageChannel, ver o listener 'message' em
// fr/service-worker.js e zh/service-worker.js). Sem resposta em
// `timeoutMs`, devolve null.
function askControllerBuildId(timeoutMs){
  return new Promise((resolve) => {
    const ctrl = navigator.serviceWorker && navigator.serviceWorker.controller;
    if (!ctrl || typeof MessageChannel === 'undefined') return resolve(null);
    const channel = new MessageChannel();
    const timer = setTimeout(() => resolve(null), timeoutMs);
    channel.port1.onmessage = (event) => {
      clearTimeout(timer);
      resolve((event.data && event.data.buildId) || null);
    };
    try { ctrl.postMessage({ type: 'get-build-id' }, [channel.port2]); }
    catch (e) { clearTimeout(timer); resolve(null); }
  });
}

function showPwaUpdateBanner(){
  const banner = document.getElementById('pwa-update-banner');
  if (!banner) return; // tela sem o banner (não deveria acontecer, mas não trava nada)
  banner.style.display = 'flex';
}

document.addEventListener('DOMContentLoaded', () => {
  const banner = document.getElementById('pwa-update-banner');
  if (!banner) return;
  const dismissBtn = document.getElementById('pwa-update-dismiss-btn');
  const reloadBtn = document.getElementById('pwa-update-reload-btn');
  if (dismissBtn) dismissBtn.addEventListener('click', () => { banner.style.display = 'none'; });
  // Só aqui, com clique explícito, é que a página recarrega de fato --
  // pega a versão nova que o service worker já deixou pronta em segundo plano.
  if (reloadBtn) reloadBtn.addEventListener('click', () => { window.location.reload(); });
});

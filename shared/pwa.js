// ---------- PWA: registra o service worker (cache offline) ----------
// 'service-worker.js' é relativo ao HTML que carregou este script -- cada
// idioma continua com o seu próprio arquivo (cache list diferente por
// conteúdo/áudio), só o código de registro em si é idêntico.
if ('serviceWorker' in navigator){
  // Se esta aba JÁ tinha um controller antes de registrar, um novo
  // `controllerchange` depois é uma atualização de verdade (v1 -> v2). Se
  // NUNCA teve controller (primeira visita, aba abriu sem SW ativo ainda),
  // o primeiro `controllerchange` é só o SW recém-instalado assumindo pela
  // primeira vez -- não é "atualização", é "chegada", e mostrar um aviso de
  // "nova versão disponível" nesse momento seria falso positivo.
  const hadControllerAtLoad = !!navigator.serviceWorker.controller;

  // Fase 4/5 (PWA-ready): a versão anterior recarregava a página sozinha
  // assim que o novo service worker assumia (skipWaiting()+clients.claim()
  // no service-worker.js forçam essa troca de controller em segundo plano).
  // Isso viola a regra explícita de nunca interromper uma lição/exercício/
  // revisão em andamento -- em vez de recarregar automaticamente, só avisa
  // com um banner dispensável (mesmo padrão visual de
  // #review-reminder-banner, já escondido durante body.lesson-focus) e só
  // recarrega quando a pessoa clica em "Atualizar".
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadControllerAtLoad) return;
    showPwaUpdateBanner();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => { /* offline não crítico */ });
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

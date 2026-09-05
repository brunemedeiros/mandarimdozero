// ---------- PWA: registra o service worker (cache offline) ----------
// 'service-worker.js' é relativo ao HTML que carregou este script -- cada
// idioma continua com o seu próprio arquivo (cache list diferente por
// conteúdo/áudio), só o código de registro em si é idêntico.
if ('serviceWorker' in navigator){
  // Sem isso, uma pessoa que deixa a aba/PWA aberta por muito tempo continua
  // rodando o JS antigo em memória mesmo depois do service worker novo
  // assumir em segundo plano (skipWaiting()+clients.claim() no
  // service-worker.js já forçam essa troca de controller, mas a página já
  // carregada não se atualiza sozinha) -- foi exatamente isso que fez
  // alguém reportar "Meu perfil" abrindo a tela antiga de "Seu progresso"
  // muito depois dessa aba ter sido trocada por uma tela de identidade
  // própria. `controllerchange` dispara assim que o novo SW assume; recarrega
  // uma vez (guardado por `refreshing` pra nunca entrar num loop).
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => { /* offline não crítico */ });
  });
}

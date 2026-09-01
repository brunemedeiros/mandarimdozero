// ---------- PWA: registra o service worker (cache offline) ----------
// 'service-worker.js' é relativo ao HTML que carregou este script -- cada
// idioma continua com o seu próprio arquivo (cache list diferente por
// conteúdo/áudio), só o código de registro em si é idêntico.
if ('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => { /* offline não crítico */ });
  });
}

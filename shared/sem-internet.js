// ---------- Aviso "Você está sem internet" por cima do site (decisão da autora, 2026-11-13) ----------
// Por enquanto o site só funciona com internet (decisão de 2026-11-11). ABRIR o site sem internet já mostra a tela
// shared/offline.html (entregue pelo service worker). Este arquivo cuida do outro caso: a internet cair com o site JÁ
// aberto (no meio de uma lição, por exemplo). Na hora, uma caixa cobre o site e bloqueia toques e teclas; quando a
// internet volta, a caixa some sozinha e a aluna continua exatamente de onde parou (nada é recarregado, a lição em
// andamento não se perde). Comum a todos os sites (fr, zh e futuros): cada index.html só liga este .js e o .css.
//
// Ao voltar: se o progresso da conta ainda não foi confirmado com o servidor (progressLoadedOk, shared/auth.js), lê de
// novo (loadStateAndRender, o mesmo que o login faz). Isso acontece porque o supabase-js avisa "SIGNED_IN" toda vez que a
// aba volta a ficar visível (ex.: puxar a cortina do celular para ligar o modo avião) e o app relê o progresso; sem
// internet a leitura falha e, sem isto, o app ficava em "Ainda confirmando seu progresso salvo" até recarregar.
(function(){
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  var caixa = null;
  var inertes = [];   // elementos que ESTE aviso deixou inertes (para devolver só esses)
  var visivel = false;

  function texto(chave, padrao){
    try { if (typeof t === 'function'){ var v = t(chave); if (v && v !== chave) return v; } } catch (e) {}
    return padrao;
  }

  function montar(){
    if (caixa) return caixa;
    caixa = document.createElement('div');
    caixa.id = 'sem-internet-aviso';
    caixa.className = 'sem-internet-aviso';
    caixa.setAttribute('role', 'alertdialog');
    caixa.setAttribute('aria-modal', 'true');
    caixa.setAttribute('aria-labelledby', 'sem-internet-titulo');
    caixa.setAttribute('aria-describedby', 'sem-internet-texto');
    caixa.hidden = true;
    caixa.innerHTML =
      '<div class="sem-internet-cartao" tabindex="-1">' +
        '<img class="sem-internet-logo" src="./logo/ativo3-icone.svg" alt="">' +
        '<div class="sem-internet-titulo" id="sem-internet-titulo"></div>' +
        '<div class="sem-internet-texto" id="sem-internet-texto"></div>' +
      '</div>';
    var logo = caixa.querySelector('.sem-internet-logo');
    if (logo) logo.addEventListener('error', function(){ logo.remove(); });
    document.body.appendChild(caixa);
    return caixa;
  }

  function mostrar(){
    if (visivel || !document.body) return;
    var el = montar();
    el.querySelector('.sem-internet-titulo').textContent = texto('ui.offline.title', 'Você está sem internet');
    el.querySelector('.sem-internet-texto').textContent = texto('ui.offline.body', 'Assim que a internet voltar, você continua de onde parou.');
    // Tudo o que está na página fica inerte (sem toque, sem foco, sem teclado), menos o próprio aviso.
    inertes = [];
    Array.prototype.forEach.call(document.body.children, function(filho){
      if (filho === el || filho.inert) return;
      filho.inert = true;
      inertes.push(filho);
    });
    el.hidden = false;
    visivel = true;
    document.documentElement.classList.add('sem-internet');
    try { var audio = document.querySelectorAll('audio'); Array.prototype.forEach.call(audio, function(a){ a.pause(); }); } catch (e) {}
    try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {}
    var cartao = el.querySelector('.sem-internet-cartao');
    if (cartao) cartao.focus({ preventScroll: true });
  }

  function esconder(){
    if (!visivel) return;
    inertes.forEach(function(filho){ filho.inert = false; });
    inertes = [];
    if (caixa) caixa.hidden = true;
    visivel = false;
    document.documentElement.classList.remove('sem-internet');
    // Progresso da conta ainda não confirmado (ver o cabeçalho): lê de novo agora que a internet voltou.
    try {
      if (typeof CURRENT_USER !== 'undefined' && CURRENT_USER && typeof progressLoadedOk !== 'undefined' && !progressLoadedOk
          && typeof loadStateAndRender === 'function'){
        loadStateAndRender();
      }
    } catch (e) {}
  }

  // Teclas (atalhos da lição: 1 a 4, Enter, Espaço) não passam enquanto o aviso está aberto. O "inert" já tira o foco
  // do site; isto cobre atalhos presos ao document/window.
  document.addEventListener('keydown', function(ev){
    if (!visivel) return;
    ev.stopImmediatePropagation();
    ev.preventDefault();
  }, true);

  window.addEventListener('offline', mostrar);
  window.addEventListener('online', esconder);

  // Monta o aviso (escondido) já na abertura, com internet: assim o logo é baixado agora, e não na hora em que a internet
  // cai. Página que já carregou sem internet (raro: sem service worker): mostra assim que der.
  function conferirAgora(){ montar(); if (navigator.onLine === false) mostrar(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', conferirAgora);
  else conferirAgora();

  // Para testes: estado atual do aviso.
  window.semInternetAviso = { visivel: function(){ return visivel; } };
})();

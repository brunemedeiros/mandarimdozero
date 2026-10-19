// Janelas antigas (overlays do HTML de fr/zh que abrem e fecham trocando style.display): acessibilidade
// sem mexer em quem abre e fecha cada uma (etapa 2 do plano "Voz da Prof. Brune", 2026-10-19).
// - papel de janela: role="dialog", aria-modal e aria-labelledby apontando para o título (h2/h3);
// - ao abrir, o foco vai para dentro (primeiro campo/botão que não seja o X; [data-foco-inicial] vence) e o Tab
//   fica preso na janela de cima; ao fechar, volta para quem abriu;
// - Esc fecha a janela de cima tocando no próprio botão de fechar dela (o mesmo caminho do clique). Janela sem
//   botão de fechar (ex.: escolha obrigatória do idioma do site) não fecha com Esc.
// Só cuida das janelas que já existem no HTML ao carregar; as criadas por JS (amigos, mural, decks...) têm o
// próprio cuidado.
(function(){
  var SELECTOR = '.app-modal-overlay, .manual-modal-overlay, .streak-modal-overlay';
  var CLOSE_SELECTOR = '.app-modal-close, .manual-modal-close, [data-modal-close], #streak-modal-continue-btn';
  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  var stack = [];   // janelas abertas, a de cima por último
  var openers = new Map();
  var seq = 0;

  function isOpen(el){ return el.isConnected && el.style.display !== 'none' && getComputedStyle(el).display !== 'none'; }
  function visible(el){ return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length); }
  function focusables(el){ return Array.prototype.filter.call(el.querySelectorAll(FOCUSABLE), visible); }

  function prepare(el){
    if (el.querySelector('[role="dialog"], [role="alertdialog"]')) return; // já tem papel de janela dentro
    if (!el.hasAttribute('role')) el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    if (!el.hasAttribute('aria-labelledby') && !el.hasAttribute('aria-label')){
      var h = el.querySelector('h1, h2, h3');
      if (h){
        if (!h.id) h.id = 'janela-titulo-' + (++seq);
        el.setAttribute('aria-labelledby', h.id);
      }
    }
  }

  function onOpen(el){
    if (stack.indexOf(el) >= 0) return;
    prepare(el);
    openers.set(el, document.activeElement && document.activeElement !== document.body ? document.activeElement : null);
    stack.push(el);
    // espera quem abriu terminar de montar o conteúdo e de pôr o foco (ex.: busca do zh)
    setTimeout(function(){
      if (!isOpen(el) || el.contains(document.activeElement)) return;
      var preferred = el.querySelector('[data-foco-inicial]');
      var list = focusables(el);
      var target = preferred || list.filter(function(b){ return !b.matches(CLOSE_SELECTOR) || b.id === 'streak-modal-continue-btn'; })[0] || list[0];
      if (!target){ el.setAttribute('tabindex', '-1'); target = el; }
      try { target.focus({ preventScroll: true }); } catch (e) {}
    }, 30);
  }

  function onClose(el){
    var i = stack.indexOf(el);
    if (i < 0) return;
    stack.splice(i, 1);
    var back = openers.get(el);
    openers.delete(el);
    // só devolve o foco se ele estava dentro da janela (ou perdido no body) e quem abriu ainda está na tela
    if (back && back.isConnected && visible(back) && (!document.activeElement || document.activeElement === document.body || el.contains(document.activeElement))){
      try { back.focus({ preventScroll: true }); } catch (e) {}
    }
  }

  function sync(el){ if (isOpen(el)) onOpen(el); else onClose(el); }

  function top(){
    for (var i = stack.length - 1; i >= 0; i--){ if (isOpen(stack[i])) return stack[i]; stack.splice(i, 1); }
    return null;
  }

  document.addEventListener('keydown', function(e){
    var el = top();
    if (!el) return;
    // uma janela criada por JS (com o próprio cuidado) pode estar por cima: deixa com ela
    var act = document.activeElement;
    var otherDialog = act && act.closest && act.closest('[role="dialog"], [role="alertdialog"], dialog');
    if (otherDialog && otherDialog !== el && !el.contains(otherDialog)) return;
    if (e.key === 'Escape'){
      var close = el.querySelector(CLOSE_SELECTOR);
      if (close && visible(close)){ e.preventDefault(); e.stopPropagation(); close.click(); }
      return;
    }
    if (e.key === 'Tab'){
      var list = focusables(el);
      if (!list.length){ e.preventDefault(); return; }
      var first = list[0], last = list[list.length - 1];
      if (!el.contains(document.activeElement)){ e.preventDefault(); first.focus(); }
      else if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    }
  }, true);

  function init(){
    var mo = new MutationObserver(function(muts){
      muts.forEach(function(m){ if (m.target.matches && m.target.matches(SELECTOR)) sync(m.target); });
    });
    Array.prototype.forEach.call(document.querySelectorAll(SELECTOR), function(el){
      prepare(el);
      mo.observe(el, { attributes: true, attributeFilter: ['style', 'class', 'hidden'] });
      if (isOpen(el)) onOpen(el);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  window.ModalA11y = { top: top };
})();

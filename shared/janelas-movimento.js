// Saída animada das janelas, menus e gavetas (animações, itens 16 e 17; decisão da dona, 2026-11-25). Vale para todos os sites.
// A ENTRADA é só CSS (shared/movimento.css): a animação roda sozinha quando a janela passa a aparecer.
// A SAÍDA não pode atrasar quem fecha (Esc, X, tocar fora): a janela de verdade some na hora, como sempre, e no mesmo lugar fica
// por 0,15 s uma cópia só de desenho (classe .mov-fantasma: sem id, inert, aria-hidden, sem clique) que esmaece e é apagada.
// Assim nenhum código que abre ou fecha janela precisou mudar, e o foco, o Esc e os testes continuam olhando a janela real.
// Com "menos movimento" no aparelho, nada disto roda.
(function(){
  var ALVOS = '.app-modal-overlay, .manual-modal-overlay, .streak-modal-overlay, .tm-panel, .tm-backdrop, .tpop, .age-ack-overlay, .lang-switcher-dropdown, .user-dropdown, .mais-backdrop';
  var DURACAO = 170;
  var aberto = new WeakMap();

  function reduzido(){ return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function alvo(el){ return el && el.nodeType === 1 && el.matches(ALVOS) && !el.classList.contains('mov-fantasma'); }
  function estaAberto(el){ return el.isConnected && el.getClientRects().length > 0 && getComputedStyle(el).display !== 'none'; }

  function fantasma(el, antes, pai, depoisDe){
    if (reduzido() || !pai) return;
    var g = el.cloneNode(true);
    // Volta a cópia ao estado de ANTES de fechar (o atributo que mudou), para ela aparecer onde a janela estava.
    Object.keys(antes).forEach(function(attr){ if (antes[attr] === null) g.removeAttribute(attr); else g.setAttribute(attr, antes[attr]); });
    g.removeAttribute('id');
    Array.prototype.forEach.call(g.querySelectorAll('[id]'), function(x){ x.removeAttribute('id'); });
    g.setAttribute('aria-hidden', 'true');
    g.inert = true;
    g.classList.add('mov-fantasma');
    pai.insertBefore(g, depoisDe || null);
    setTimeout(function(){ if (g.parentNode) g.parentNode.removeChild(g); }, DURACAO);
  }

  function lembrar(el){ if (alvo(el)) aberto.set(el, estaAberto(el)); }

  var mo = new MutationObserver(function(muts){
    var antes = new Map();
    muts.forEach(function(m){
      if (m.type === 'attributes' && alvo(m.target)){
        var a = antes.get(m.target) || {};
        if (!(m.attributeName in a)) a[m.attributeName] = m.oldValue;
        antes.set(m.target, a);
      } else if (m.type === 'childList'){
        Array.prototype.forEach.call(m.removedNodes, function(n){
          // Janela criada por JS e apagada ao fechar: a cópia entra onde ela estava.
          if (alvo(n) && aberto.get(n)){ aberto.set(n, false); fantasma(n, {}, m.target, m.nextSibling); }
        });
        Array.prototype.forEach.call(m.addedNodes, lembrar);
      }
    });
    antes.forEach(function(attrs, el){
      var agora = estaAberto(el);
      if (aberto.get(el) && !agora) fantasma(el, attrs, el.parentNode, el.nextSibling);
      aberto.set(el, agora);
    });
  });

  function iniciar(){
    Array.prototype.forEach.call(document.querySelectorAll(ALVOS), lembrar);
    mo.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeOldValue: true, attributeFilter: ['style', 'class', 'hidden'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();

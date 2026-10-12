/* Comportamento das peças interativas do Design System do painel (Seleção, Popover, Redimensionável, Questionário, Aviso,
   Menu de navegação, Barra de menus, Menu de ações, Rolagem de mensagens, Código de dígitos, Janela, Janela de alerta, Anexos).
   JavaScript puro, sem dependências. Tudo fica dentro de uma função: só existe window.PainelUI (nada de let/const global,
   para não colidir com o app, ver .claude/rules/frontend-fr-zh.md). Texto vindo de fora entra sempre por textContent.
   Carregar DEPOIS do CSS do painel. Os eventos são delegados no document, então peças criadas depois também funcionam.
   O que cada peça espera no HTML está no guia: shared/painel/guia-de-estilo.html. */
(function(){
  'use strict';
  if (window.PainelUI) return;

  var ABERTOS = 'details.p-selecao[open], details.p-popover[open], details.p-data[open], details.p-menu[open], .p-menunav details[open], .p-barramenus details[open]';

  /* ---------- Seleção e Popover: fechar com Esc e com clique fora ---------- */
  document.addEventListener('click', function(e){
    document.querySelectorAll(ABERTOS).forEach(function(d){ if (!d.contains(e.target)) d.open = false; });
  });
  document.addEventListener('keydown', function(e){
    if (e.key !== 'Escape') return;
    document.querySelectorAll(ABERTOS).forEach(function(d){
      var tinhaFoco = d.contains(document.activeElement);
      d.open = false;
      if (tinhaFoco){ var s = d.querySelector('summary'); if (s) s.focus(); }
    });
  });

  /* ---------- Seleção: trocar o texto do gatilho ao escolher ---------- */
  document.addEventListener('change', function(e){
    var inp = e.target;
    if (!inp.matches || !inp.matches('details.p-selecao input[type="radio"]')) return;
    var d = inp.closest('details'), rotulo = inp.closest('label'), s = d.querySelector('summary');
    s.textContent = rotulo.textContent.trim();
    d.open = false;
    s.focus();
    d.dispatchEvent(new CustomEvent('p-selecao:mudou', { bubbles: true, detail: { valor: inp.value, rotulo: s.textContent } }));
  });

  /* ---------- Redimensionável: arrastar a alça ou usar o teclado ---------- */
  function limites(alca){ var m = parseFloat(alca.getAttribute('data-min')); if (!(m > 0 && m < 50)) m = 20; return [m / 100, 1 - m / 100]; }
  function emColuna(alca){ return alca.parentElement.getAttribute('data-direcao') === 'coluna'; }
  function tamanho(el, col){ var r = el.getBoundingClientRect(); return col ? r.height : r.width; }
  // Define a fatia do painel anterior dentro do par (anterior + seguinte); o resto do contêiner não muda.
  function definir(alca, fatia){
    var a = alca.previousElementSibling, b = alca.nextElementSibling; if (!a || !b) return;
    var col = emColuna(alca), lim = limites(alca);
    var soma = tamanho(a, col) + tamanho(b, col), total = tamanho(alca.parentElement, col) || soma;
    var f = Math.max(lim[0], Math.min(lim[1], fatia)), par = soma / total * 100;
    a.style.flex = '1 1 ' + (f * par) + '%'; b.style.flex = '1 1 ' + ((1 - f) * par) + '%';
    alca.setAttribute('aria-valuenow', String(Math.round(f * 100)));
    alca.dispatchEvent(new CustomEvent('p-redimensionou', { bubbles: true, detail: { fatia: f } }));
  }
  function fatiaAtual(alca){
    var a = alca.previousElementSibling, b = alca.nextElementSibling, col = emColuna(alca);
    return tamanho(a, col) / ((tamanho(a, col) + tamanho(b, col)) || 1);
  }
  document.addEventListener('pointerdown', function(e){
    var alca = e.target.closest && e.target.closest('.p-alca'); if (!alca || !alca.previousElementSibling || !alca.nextElementSibling) return;
    e.preventDefault();
    var cont = alca.parentElement, col = emColuna(alca), a = alca.previousElementSibling, b = alca.nextElementSibling;
    var iniA = tamanho(a, col), soma = iniA + tamanho(b, col), ini = col ? e.clientY : e.clientX;
    alca.classList.add('p-arrastando'); cont.classList.add('p-arrastando');
    try { alca.setPointerCapture(e.pointerId); } catch (x) {}
    function mover(ev){ definir(alca, (iniA + (col ? ev.clientY : ev.clientX) - ini) / soma); }
    function soltar(){
      alca.removeEventListener('pointermove', mover); alca.removeEventListener('pointerup', soltar); alca.removeEventListener('pointercancel', soltar);
      alca.classList.remove('p-arrastando'); cont.classList.remove('p-arrastando');
    }
    alca.addEventListener('pointermove', mover); alca.addEventListener('pointerup', soltar); alca.addEventListener('pointercancel', soltar);
  });
  document.addEventListener('keydown', function(e){
    var alca = e.target.closest && e.target.closest('.p-alca'); if (!alca) return;
    var col = emColuna(alca), menos = col ? 'ArrowUp' : 'ArrowLeft', mais = col ? 'ArrowDown' : 'ArrowRight', f = fatiaAtual(alca), lim = limites(alca);
    if (e.key === menos) f -= 0.05; else if (e.key === mais) f += 0.05; else if (e.key === 'Home') f = lim[0]; else if (e.key === 'End') f = lim[1]; else return;
    e.preventDefault(); definir(alca, f);
  });

  /* ---------- Questionário em passos ---------- */
  var LETRAS = 'ABCDEFGHIJ';
  function respondido(passo){
    var campos = passo.querySelectorAll('input, textarea');
    for (var i = 0; i < campos.length; i++){
      var c = campos[i];
      if ((c.type === 'radio' || c.type === 'checkbox') ? c.checked : c.value.trim() !== '') return true;
    }
    return false;
  }
  function valores(passo){
    var out = [], campos = passo.querySelectorAll('input, textarea');
    campos.forEach(function(c){
      if (c.type === 'radio' || c.type === 'checkbox'){ if (c.checked) out.push(c.value); }
      else if (c.value.trim() !== '') out.push(c.value.trim());
    });
    return out;
  }
  function mostrar(f){
    var passos = f._passos, i = f._i, passo = passos[i], ultimo = i === passos.length - 1;
    passos.forEach(function(p, j){ p.hidden = j !== i; });
    f.querySelector('.p-contador').textContent = 'Pergunta ' + (i + 1) + ' de ' + passos.length;
    f.querySelector('[data-p-anterior]').disabled = i === 0;
    var pular = f.querySelector('[data-p-pular]'); pular.hidden = !passo.hasAttribute('data-pular');
    var prox = f.querySelector('[data-p-proximo]');
    prox.textContent = ultimo ? (f.getAttribute('data-rotulo-fim') || 'Concluir') : 'Próxima';
    prox.disabled = passo.hasAttribute('data-obrigatorio') && !respondido(passo);
  }
  function iniciarQuestionario(f){
    if (f._passos) return;
    f._passos = Array.prototype.slice.call(f.querySelectorAll('.p-passo')); f._i = 0;
    f._passos.forEach(function(p){
      p.querySelectorAll('.p-opcao').forEach(function(o, k){
        if (!o.querySelector('.p-letra')){ var l = document.createElement('span'); l.className = 'p-letra'; l.setAttribute('aria-hidden', 'true'); l.textContent = LETRAS.charAt(k); o.appendChild(l); }
      });
    });
    mostrar(f);
  }
  function concluir(f){
    var respostas = {};
    f._passos.forEach(function(p, j){ respostas[p.getAttribute('data-id') || String(j + 1)] = valores(p); });
    f._passos.forEach(function(p){ p.hidden = true; });
    f.querySelector('.p-contador').hidden = true; f.querySelector('.p-rodape').hidden = true;
    var fim = f.querySelector('.p-fim'); if (fim) fim.hidden = false;
    f.dispatchEvent(new CustomEvent('p-questionario:fim', { bubbles: true, detail: { respostas: respostas } }));
  }
  document.addEventListener('click', function(e){
    var f = e.target.closest && e.target.closest('form.p-questionario'); if (!f) return;
    iniciarQuestionario(f);
    if (e.target.closest('[data-p-anterior]') && f._i > 0){ f._i--; mostrar(f); }
    else if (e.target.closest('[data-p-pular]')){ if (f._i < f._passos.length - 1){ f._i++; mostrar(f); } else concluir(f); }
    else if (e.target.closest('[data-p-proximo]')){ if (f._i < f._passos.length - 1){ f._i++; mostrar(f); } else concluir(f); }
  });
  document.addEventListener('input', function(e){
    var f = e.target.closest && e.target.closest('form.p-questionario'); if (!f || !f._passos) return;
    mostrar(f);
  });
  document.addEventListener('submit', function(e){ if (e.target.matches && e.target.matches('form.p-questionario')) e.preventDefault(); });

  /* ---------- Menu de navegação e Barra de menus: um aberto por vez, teclado e troca ao passar o mouse ---------- */
  function barraDe(d){ return d.closest('.p-menunav, .p-barramenus'); }
  // O evento toggle não borbulha, por isso a captura.
  document.addEventListener('toggle', function(e){
    var d = e.target; if (!d.matches || !d.matches('details') || !d.open) return;
    var barra = barraDe(d); if (!barra) return;
    barra.querySelectorAll('details[open]').forEach(function(o){ if (o !== d) o.open = false; });
  }, true);
  document.addEventListener('mouseover', function(e){
    var sm = e.target.closest && e.target.closest('.p-barramenus summary'); if (!sm) return;
    var d = sm.parentElement, barra = barraDe(d);
    if (!d.open && barra.querySelector('details[open]')) d.open = true;      // como numa barra de menus de programa: com um aberto, passar nos outros abre
  });
  document.addEventListener('keydown', function(e){
    var sm = e.target.closest && e.target.closest('.p-barramenus summary, .p-menunav summary, details.p-menu > summary');
    if (sm){
      var d = sm.parentElement, barra = barraDe(d);
      if (!barra){ if (e.key === 'ArrowDown'){ e.preventDefault(); d.open = true; var pri = d.querySelector('.p-menu-item:not([aria-disabled="true"])'); if (pri) pri.focus(); } return; }
      var todos = Array.prototype.slice.call(barra.querySelectorAll('details > summary')), i = todos.indexOf(sm);
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft'){
        var alvo = todos[(i + (e.key === 'ArrowRight' ? 1 : todos.length - 1)) % todos.length], estavaAberto = d.open;
        e.preventDefault(); alvo.focus(); if (estavaAberto) alvo.parentElement.open = true;
      } else if (e.key === 'ArrowDown'){
        e.preventDefault(); d.open = true; var primeiro = d.querySelector('.p-menu-item:not([aria-disabled="true"]), .p-menunav-painel a'); if (primeiro) primeiro.focus();
      }
      return;
    }
    var item = e.target.closest && e.target.closest('.p-menu-lista .p-menu-item, .p-menunav-painel a');
    if (item && (e.key === 'ArrowDown' || e.key === 'ArrowUp')){
      var raiz = item.closest('details') || item.closest('.p-menu-lista'), itens = Array.prototype.slice.call(raiz.querySelectorAll('.p-menu-item:not([aria-disabled="true"]), .p-menunav-painel a')), j = itens.indexOf(item);
      e.preventDefault(); itens[(j + (e.key === 'ArrowDown' ? 1 : itens.length - 1)) % itens.length].focus();
    }
  });
  document.addEventListener('click', function(e){
    var item = e.target.closest && e.target.closest('.p-barramenus .p-menu-item, details.p-menu .p-menu-item, .p-contexto-menu .p-menu-item, .p-menunav-painel a'); if (!item) return;
    if (item.getAttribute('role') === 'menuitemcheckbox') item.setAttribute('aria-checked', item.getAttribute('aria-checked') === 'true' ? 'false' : 'true');
    var d = item.closest('details'); if (d) d.open = false; else fecharContexto();
  });

  /* ---------- Rolagem de mensagens: começa embaixo, acompanha as novas e oferece "voltar ao fim" ---------- */
  var PERTO = 48; // px do fim que ainda contam como "estou lendo as últimas"
  function noFim(r){ return r.scrollHeight - r.scrollTop - r.clientHeight <= PERTO; }
  function irAoFim(r){
    var suave = !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (r.scrollTo) r.scrollTo({ top: r.scrollHeight, behavior: suave ? 'smooth' : 'auto' }); else r.scrollTop = r.scrollHeight;
  }
  function iniciarConversa(c){
    if (c._iniciada) return; c._iniciada = true;
    var r = c.querySelector('.p-conversa-rolagem'), b = c.querySelector('.p-ir-ao-fim'); if (!r) return;
    r.scrollTop = r.scrollHeight;
    var estavaNoFim = true;
    r.addEventListener('scroll', function(){ estavaNoFim = noFim(r); if (b) b.hidden = estavaNoFim; });
    if (b){ b.hidden = true; b.addEventListener('click', function(){ irAoFim(r); }); }
    if (window.MutationObserver) new MutationObserver(function(){
      if (estavaNoFim) { r.scrollTop = r.scrollHeight; } else if (b) b.hidden = false;   // quem subiu para ler não é arrastado
    }).observe(r, { childList: true, subtree: true });
  }
  // PainelUI.mensagem(lista, { texto, tipo: 'enviada' | 'recebida', autor, hora })  (parágrafos separados por linha em branco)
  function mensagem(lista, op){
    op = op || {};
    var li = document.createElement('li'); li.className = 'p-mensagem p-mensagem--' + (op.tipo === 'enviada' ? 'enviada' : 'recebida');
    var av = document.createElement('span'); av.className = 'p-avatar'; av.setAttribute('aria-hidden', 'true');
    av.textContent = (op.iniciais || String(op.autor || '?').split(/\s+/).map(function(w){ return w.charAt(0); }).join('').slice(0, 2)).toUpperCase();
    var bloco = document.createElement('div'); bloco.className = 'p-mensagem-bloco';
    var corpo = document.createElement('div'); corpo.className = 'p-mensagem-corpo';
    String(op.texto || '').split(/\n{2,}/).forEach(function(par){ var p = document.createElement('p'); p.textContent = par; corpo.appendChild(p); });
    bloco.appendChild(corpo);
    if (op.autor || op.hora){ var m = document.createElement('span'); m.className = 'p-mensagem-meta'; m.textContent = [op.autor, op.hora].filter(Boolean).join(' · '); bloco.appendChild(m); }
    li.appendChild(av); li.appendChild(bloco);
    lista.appendChild(li); return li;
  }

  /* ---------- Código de dígitos (OTP) ---------- */
  function otpCampos(o){ return Array.prototype.slice.call(o.querySelectorAll('input')); }
  function otpAviso(o){
    var cs = otpCampos(o), codigo = cs.map(function(c){ return c.value; }).join('');
    if (codigo.length === cs.length) o.dispatchEvent(new CustomEvent('p-otp:completo', { bubbles: true, detail: { codigo: codigo } }));
  }
  function otpPermitido(o, txt){ return o.getAttribute('data-tipo') === 'texto' ? txt : txt.replace(/\D/g, ''); }
  document.addEventListener('input', function(e){
    var c = e.target, o = c.closest && c.closest('.p-otp'); if (!o) return;
    var cs = otpCampos(o), i = cs.indexOf(c);
    c.value = otpPermitido(o, c.value).slice(-1);
    if (c.value && i < cs.length - 1) cs[i + 1].focus();
    otpAviso(o);
  });
  document.addEventListener('keydown', function(e){
    var c = e.target, o = c.closest && c.closest('.p-otp'); if (!o) return;
    var cs = otpCampos(o), i = cs.indexOf(c);
    if (e.key === 'Backspace' && !c.value && i > 0){ e.preventDefault(); cs[i - 1].value = ''; cs[i - 1].focus(); }
    else if (e.key === 'ArrowLeft' && i > 0){ e.preventDefault(); cs[i - 1].focus(); }
    else if (e.key === 'ArrowRight' && i < cs.length - 1){ e.preventDefault(); cs[i + 1].focus(); }
  });
  document.addEventListener('paste', function(e){
    var c = e.target, o = c.closest && c.closest('.p-otp'); if (!o) return;
    e.preventDefault();
    var txt = otpPermitido(o, (e.clipboardData || window.clipboardData).getData('text')), cs = otpCampos(o), i = cs.indexOf(c);
    for (var k = 0; k < txt.length && i + k < cs.length; k++) cs[i + k].value = txt.charAt(k);
    cs[Math.min(i + txt.length, cs.length - 1)].focus();
    otpAviso(o);
  });

  /* ---------- Janela (dialog) ---------- */
  // Botão com data-abrir-dialogo="id" abre o <dialog id="id"> como modal; data-fechar-dialogo (ou o X com rel="prev") fecha.
  document.addEventListener('click', function(e){
    var ab = e.target.closest && e.target.closest('[data-abrir-dialogo]');
    if (ab){ var d = document.getElementById(ab.getAttribute('data-abrir-dialogo')); if (d && d.showModal && !d.open){ d.showModal(); var f = d.querySelector('[data-foco-inicial]') || d.querySelector('input, textarea, select, button:not([rel="prev"])'); if (f) f.focus(); } return; }
    var fe = e.target.closest && e.target.closest('[data-fechar-dialogo], dialog button[rel="prev"]');
    if (fe){ var dd = fe.closest('dialog'); if (dd && dd.close) dd.close(); return; }
    if (e.target.matches && e.target.matches('dialog.p-dialogo[open]:not(.p-dialogo--alerta)') && e.target.close) e.target.close();   // clique no fundo (alerta exige resposta)
  });

  /* ---------- Menu de contexto (botão direito) ---------- */
  function fecharContexto(){ document.querySelectorAll('.p-contexto-menu:not([hidden])').forEach(function(m){ m.hidden = true; }); }
  document.addEventListener('contextmenu', function(e){
    var area = e.target.closest && e.target.closest('[data-menu-contexto]'); if (!area) return;
    var m = document.getElementById(area.getAttribute('data-menu-contexto')); if (!m) return;
    e.preventDefault(); fecharContexto(); m.hidden = false;
    var x = Math.max(8, Math.min(e.clientX, window.innerWidth - m.offsetWidth - 8)), y = Math.max(8, Math.min(e.clientY, window.innerHeight - m.offsetHeight - 8));
    m.style.left = x + 'px'; m.style.top = y + 'px';
    m._abertoEm = Date.now();
    var f = m.querySelector('.p-menu-item:not([aria-disabled="true"])'); if (f) f.focus({ preventScroll: true });
  });
  document.addEventListener('click', function(e){ if (!(e.target.closest && e.target.closest('.p-contexto-menu'))) fecharContexto(); });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape') fecharContexto(); });
  window.addEventListener('scroll', function(e){
    if (e.target.closest && e.target.closest('.p-contexto-menu')) return;                  // rolar dentro do próprio menu
    document.querySelectorAll('.p-contexto-menu:not([hidden])').forEach(function(m){ if (Date.now() - (m._abertoEm || 0) > 200) m.hidden = true; });
  }, true); window.addEventListener('resize', fecharContexto);

  /* ---------- Bloco que abre e fecha (collapsible) ---------- */
  document.addEventListener('click', function(e){
    var b = e.target.closest && e.target.closest('.p-colapsavel [aria-controls]'); if (!b) return;
    var alvo = document.getElementById(b.getAttribute('aria-controls')); if (!alvo) return;
    var abrir = alvo.hidden; alvo.hidden = !abrir; b.setAttribute('aria-expanded', String(abrir));
  });

  /* ---------- Combobox: campo com busca e lista de sugestões ---------- */
  function semAcento(t){ return String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function comboItens(c){ return Array.prototype.slice.call(c.querySelectorAll('.p-combo-lista li[role="option"]')); }
  function comboAbrir(c){ var l = c.querySelector('.p-combo-lista'); l.hidden = false; c.querySelector('input').setAttribute('aria-expanded', 'true'); }
  function comboFechar(c){
    var l = c.querySelector('.p-combo-lista'), inp = c.querySelector('input'); l.hidden = true; inp.setAttribute('aria-expanded', 'false'); inp.removeAttribute('aria-activedescendant');
    comboItens(c).forEach(function(i){ i.classList.remove('p-ativo'); });
    inp.value = c._rotulo || '';                                           // sem escolha nova, volta ao que estava escolhido
  }
  function comboFiltrar(c){
    var inp = c.querySelector('input'), q = (c._rotulo && inp.value === c._rotulo) ? '' : semAcento(inp.value), visiveis = 0;   // com o escolhido no campo, mostra todos
    comboItens(c).forEach(function(i){ var ok = !q || semAcento(i.textContent).indexOf(q) >= 0; i.hidden = !ok; if (ok) visiveis++; i.classList.remove('p-ativo'); });
    var vazio = c.querySelector('.p-combo-vazio'); if (vazio) vazio.hidden = visiveis > 0;
    var primeiro = comboItens(c).filter(function(i){ return !i.hidden; })[0]; if (primeiro) comboAtivar(c, primeiro);
  }
  function comboAtivar(c, item){
    comboItens(c).forEach(function(i){ i.classList.remove('p-ativo'); }); item.classList.add('p-ativo');
    if (!item.id) item.id = 'p-opt-' + Math.random().toString(36).slice(2, 8);
    c.querySelector('input').setAttribute('aria-activedescendant', item.id); item.scrollIntoView({ block: 'nearest' });
  }
  function comboEscolher(c, item){
    comboItens(c).forEach(function(i){ i.setAttribute('aria-selected', String(i === item)); });
    c._rotulo = item.textContent.trim(); c._valor = item.getAttribute('data-valor') || c._rotulo;
    c.querySelector('input').value = c._rotulo; c.setAttribute('data-valor', c._valor);
    comboFechar(c);
    c.dispatchEvent(new CustomEvent('p-combo:escolheu', { bubbles: true, detail: { valor: c._valor, rotulo: c._rotulo } }));
  }
  document.addEventListener('focusin', function(e){ var c = e.target.closest && e.target.closest('.p-combo'); if (c && e.target.matches('input')){ if (c._rotulo === undefined) c._rotulo = ''; comboFiltrar(c); comboAbrir(c); e.target.select(); } });
  document.addEventListener('input', function(e){ var c = e.target.closest && e.target.closest('.p-combo'); if (c && e.target.matches('input')){ comboFiltrar(c); comboAbrir(c); } });
  document.addEventListener('keydown', function(e){
    var c = e.target.closest && e.target.closest('.p-combo'); if (!c || !e.target.matches('input')) return;
    var vis = comboItens(c).filter(function(i){ return !i.hidden; }), at = vis.indexOf(c.querySelector('.p-ativo'));
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp'){ e.preventDefault(); comboAbrir(c); if (vis.length) comboAtivar(c, vis[(at + (e.key === 'ArrowDown' ? 1 : vis.length - 1)) % vis.length]); }
    else if (e.key === 'Enter'){ var a = c.querySelector('.p-ativo'); if (a && !c.querySelector('.p-combo-lista').hidden){ e.preventDefault(); comboEscolher(c, a); } }
    else if (e.key === 'Escape'){ comboFechar(c); }
  });
  document.addEventListener('click', function(e){ var c = e.target.closest && e.target.closest('.p-combo'); if (c && e.target.matches('input') && c.querySelector('.p-combo-lista').hidden){ comboFiltrar(c); comboAbrir(c); } });
  document.addEventListener('mousedown', function(e){
    var li = e.target.closest && e.target.closest('.p-combo-lista li[role="option"]');
    if (li){ e.preventDefault(); comboEscolher(li.closest('.p-combo'), li); return; }
    document.querySelectorAll('.p-combo').forEach(function(c){ if (!c.contains(e.target) && !c.querySelector('.p-combo-lista').hidden) comboFechar(c); });
  });

  /* ---------- Escolher data (calendário em português) ---------- */
  var SEMANA = ['Do', 'Se', 'Te', 'Qu', 'Qu', 'Se', 'Sá'];
  function iso(d){ return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function lerIso(t){ var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function mesmoDia(a, b){ return !!a && !!b && iso(a) === iso(b); }
  function calendario(d, ref, focarEm){
    var corpo = d.querySelector('.p-calendario'), sel = lerIso(d.getAttribute('data-valor')), hoje = new Date();
    d._ref = new Date(ref.getFullYear(), ref.getMonth(), 1); corpo.textContent = '';
    var topo = document.createElement('div'); topo.className = 'p-cal-topo';
    function nav(txt, rotulo, cls){ var b = document.createElement('button'); b.type = 'button'; b.className = 'outline p-cal-nav ' + cls; b.setAttribute('aria-label', rotulo); b.textContent = txt; return b; }
    var tit = document.createElement('strong'); tit.setAttribute('aria-live', 'polite');
    var nome = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(d._ref); tit.textContent = nome.charAt(0).toUpperCase() + nome.slice(1);
    topo.appendChild(nav('‹', 'Mês anterior', 'p-cal-ant')); topo.appendChild(tit); topo.appendChild(nav('›', 'Próximo mês', 'p-cal-prox')); corpo.appendChild(topo);
    var g = document.createElement('div'); g.className = 'p-cal-grade'; g.setAttribute('role', 'grid');
    SEMANA.forEach(function(n){ var s = document.createElement('span'); s.className = 'p-cal-sem'; s.textContent = n; g.appendChild(s); });
    var inicio = new Date(d._ref.getFullYear(), d._ref.getMonth(), 1 - d._ref.getDay()), alvoFoco = focarEm || sel || (mesmoDia(new Date(d._ref.getFullYear(), d._ref.getMonth(), hoje.getDate()), hoje) ? hoje : d._ref);
    for (var i = 0; i < 42; i++){
      var dia = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i), b = document.createElement('button');
      b.type = 'button'; b.className = 'p-dia' + (dia.getMonth() !== d._ref.getMonth() ? ' p-fora' : '') + (mesmoDia(dia, hoje) ? ' p-hoje' : '');
      b.setAttribute('data-data', iso(dia)); b.setAttribute('aria-pressed', String(mesmoDia(dia, sel))); b.tabIndex = mesmoDia(dia, alvoFoco) ? 0 : -1;
      b.setAttribute('aria-label', new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(dia)); b.textContent = String(dia.getDate()); g.appendChild(b);
    }
    corpo.appendChild(g);
    if (focarEm){ var f = g.querySelector('[data-data="' + iso(focarEm) + '"]'); if (f) f.focus(); }
  }
  document.addEventListener('toggle', function(e){ var d = e.target; if (d.matches && d.matches('details.p-data') && d.open) calendario(d, lerIso(d.getAttribute('data-valor')) || new Date()); }, true);
  document.addEventListener('click', function(e){
    var d = e.target.closest && e.target.closest('details.p-data'); if (!d) return;
    var nv = e.target.closest('.p-cal-ant, .p-cal-prox');
    if (nv){ calendario(d, new Date(d._ref.getFullYear(), d._ref.getMonth() + (nv.classList.contains('p-cal-prox') ? 1 : -1), 1)); return; }
    var dia = e.target.closest('.p-dia'); if (!dia) return;
    var v = dia.getAttribute('data-data'), s = d.querySelector('summary'); d.setAttribute('data-valor', v);
    s.textContent = lerIso(v).toLocaleDateString('pt-BR'); s.removeAttribute('data-vazio');
    var oculto = d.querySelector('input[type="hidden"]'); if (oculto) oculto.value = v;
    d.open = false; s.focus(); d.dispatchEvent(new CustomEvent('p-data:escolheu', { bubbles: true, detail: { data: v } }));
  });
  document.addEventListener('keydown', function(e){
    var dia = e.target.closest && e.target.closest('.p-dia'); if (!dia) return;
    var d = dia.closest('details.p-data'), at = lerIso(dia.getAttribute('data-data')), passo = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (passo) { e.preventDefault(); calendario(d, new Date(at.getFullYear(), at.getMonth() + 0, 1), new Date(at.getFullYear(), at.getMonth(), at.getDate() + passo)); }
    else if (e.key === 'PageUp' || e.key === 'PageDown'){ e.preventDefault(); var m = e.key === 'PageDown' ? 1 : -1; calendario(d, new Date(at.getFullYear(), at.getMonth() + m, 1), new Date(at.getFullYear(), at.getMonth() + m, Math.min(at.getDate(), 28))); }
  });

  // PainelUI.confirmar({ titulo, descricao, confirmar, cancelar, perigo }) -> Promise<boolean>. Substitui o confirm() do navegador.
  function confirmar(op){
    op = op || {};
    return new Promise(function(resolve){
      var raiz = document.querySelector('.painel'); if (!raiz){ resolve(false); return; }
      var d = document.createElement('dialog'); d.className = 'p-dialogo p-dialogo--alerta'; d.setAttribute('role', 'alertdialog');
      var a = document.createElement('article'), h = document.createElement('header'), t = document.createElement('h3'), p = document.createElement('p'), f = document.createElement('footer');
      t.textContent = op.titulo || 'Tem certeza?'; p.textContent = op.descricao || ''; h.appendChild(t); if (op.descricao) h.appendChild(p);
      var nao = document.createElement('button'); nao.type = 'button'; nao.className = 'secondary'; nao.textContent = op.cancelar || 'Cancelar'; nao.setAttribute('data-foco-inicial', '');
      var sim = document.createElement('button'); sim.type = 'button'; sim.textContent = op.confirmar || 'Continuar'; if (op.perigo) sim.className = 'p-perigo';
      var resposta = false;
      sim.addEventListener('click', function(){ resposta = true; d.close(); }); nao.addEventListener('click', function(){ d.close(); });
      d.addEventListener('close', function(){ if (d.parentNode) d.parentNode.removeChild(d); resolve(resposta); });
      f.appendChild(nao); f.appendChild(sim); a.appendChild(h); a.appendChild(f); d.appendChild(a); raiz.appendChild(d); d.showModal(); nao.focus();
    });
  }

  /* ---------- Anexos: arquivo, imagem e envio com progresso ---------- */
  var ICONE_ARQUIVO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>';
  // PainelUI.anexo(lista, { nome, detalhe, imagem (url), progresso (0 a 100, mostra o envio em andamento), aoRemover })
  // Devolve { elemento, progresso(pct), concluir(detalhe), falhar(msg), remover() }.
  function anexo(lista, op){
    op = op || {};
    var li = document.createElement('li'); li.className = 'p-anexo' + (op.imagem ? ' p-anexo--imagem' : '') + (op.progresso !== undefined ? ' p-anexo--enviando' : '');
    var media = document.createElement('span'); media.className = 'p-anexo-media';
    if (op.imagem){ var im = document.createElement('img'); im.src = op.imagem; im.alt = ''; media.appendChild(im); }
    else if (op.progresso !== undefined){ var sp = document.createElement('span'); sp.className = 'p-spinner'; sp.setAttribute('aria-hidden', 'true'); media.appendChild(sp); }
    else { media.insertAdjacentHTML('beforeend', ICONE_ARQUIVO); }
    var tx = document.createElement('span'); tx.className = 'p-anexo-texto';
    var nome = document.createElement('span'); nome.className = 'p-anexo-nome'; nome.textContent = op.nome || ''; nome.title = op.nome || '';
    var det = document.createElement('span'); det.className = 'p-anexo-detalhe'; tx.appendChild(nome); tx.appendChild(det);
    var x = document.createElement('button'); x.type = 'button'; x.className = 'p-anexo-remover'; x.setAttribute('aria-label', 'Remover ' + (op.nome || 'anexo')); x.textContent = '×';
    var barra = document.createElement('span'); barra.className = 'p-anexo-barra'; var enc = document.createElement('i'); barra.appendChild(enc);
    li.appendChild(media); li.appendChild(tx); li.appendChild(x);
    function pct(v){ v = Math.max(0, Math.min(100, Math.round(v))); enc.style.setProperty('--v', v + '%'); det.textContent = 'Enviando · ' + v + '%'; li.setAttribute('aria-busy', 'true'); }
    function remover(){
      li.classList.add('p-anexo--saindo');
      var fim = function(){ if (li.parentNode) li.parentNode.removeChild(li); if (typeof op.aoRemover === 'function') op.aoRemover(); };
      if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) fim(); else setTimeout(fim, 200);
    }
    x.addEventListener('click', remover);
    if (op.progresso !== undefined){ li.appendChild(barra); pct(op.progresso); } else det.textContent = op.detalhe || '';
    lista.appendChild(li);
    return {
      elemento: li, remover: remover, progresso: pct,
      concluir: function(detalhe){
        li.classList.remove('p-anexo--enviando'); li.removeAttribute('aria-busy'); if (barra.parentNode) barra.parentNode.removeChild(barra); det.textContent = detalhe || '';
        var sp2 = media.querySelector('.p-spinner'); if (sp2){ media.textContent = ''; media.insertAdjacentHTML('beforeend', ICONE_ARQUIVO); }
      },
      falhar: function(msg){ li.classList.remove('p-anexo--enviando'); li.classList.add('p-anexo--erro'); li.removeAttribute('aria-busy'); if (barra.parentNode) barra.parentNode.removeChild(barra); det.textContent = msg || 'Não foi possível enviar'; }
    };
  }

  /* ---------- Aviso temporário (toast) ---------- */
  // PainelUI.toast({ titulo, detalhe, acaoRotulo, aoAcao, duracao })   duracao em ms (padrão 5000; 0 = só fecha no X)
  function toast(op){
    op = op || {};
    var raiz = document.querySelector('.painel'); if (!raiz) return null;
    var caixa = raiz.querySelector('.p-toasts');
    if (!caixa){ caixa = document.createElement('div'); caixa.className = 'p-toasts'; raiz.appendChild(caixa); }
    var el = document.createElement('div'); el.className = 'p-toast'; el.setAttribute('role', 'status');
    var tx = document.createElement('div'); tx.className = 'p-toast-texto';
    var t = document.createElement('strong'); t.textContent = op.titulo || ''; tx.appendChild(t);
    if (op.detalhe){ var d = document.createElement('small'); d.textContent = op.detalhe; tx.appendChild(d); }
    var ac = document.createElement('div'); ac.className = 'p-toast-acoes';
    var timer = null;
    function fechar(){ if (timer) clearTimeout(timer); if (el.parentNode) el.parentNode.removeChild(el); }
    if (op.acaoRotulo){
      var b = document.createElement('button'); b.type = 'button'; b.className = 'outline'; b.textContent = op.acaoRotulo;
      b.addEventListener('click', function(){ try { if (typeof op.aoAcao === 'function') op.aoAcao(); } finally { fechar(); } });
      ac.appendChild(b);
    }
    var x = document.createElement('button'); x.type = 'button'; x.className = 'p-toast-fechar'; x.setAttribute('aria-label', 'Fechar'); x.textContent = '×';
    x.addEventListener('click', fechar); ac.appendChild(x);
    el.appendChild(tx); el.appendChild(ac); caixa.appendChild(el);
    var dur = op.duracao === undefined ? 5000 : op.duracao;
    if (dur > 0) timer = setTimeout(fechar, dur);
    return { fechar: fechar, elemento: el };
  }

  function iniciar(raiz){ (raiz || document).querySelectorAll('form.p-questionario').forEach(iniciarQuestionario); (raiz || document).querySelectorAll('.p-conversa').forEach(iniciarConversa); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ iniciar(); }); else iniciar();

  window.PainelUI = { toast: toast, mensagem: mensagem, confirmar: confirmar, anexo: anexo, iniciar: iniciar };
})();

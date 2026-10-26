// ---------- Modo foco fora das lições (Conjugação, Revisão, Desafios) ----------
// Quando a sessão de uma dessas áreas aparece na tela, o topo, os menus e os
// cartões laterais somem, como nas lições (reaproveita setLessonFocusMode e as
// regras de CSS de .lesson-focus). Em vez de tocar em cada ponto de entrada
// (a Revisão tem vários: modos, Deck, marco da trilha, rota restaurada), um
// MutationObserver olha os próprios wrappers da sessão e a aba ativa.
// Só desliga o foco que ele mesmo ligou (body[data-activity-focus]); o foco
// de uma lição da trilha continua sendo da lição.
(function(){
  // back = link de saída que já existe no topo da sessão; ganha ao lado a ⚑
  // (a ⚑ da topbar some no modo foco, ver shared/reports.js).
  const AREAS = [
    { tab: 'review', wrap: 'review-session-wrap', back: 'review-back-to-modes' },
    { tab: 'conjugaison', wrap: 'conj-practice-wrap', back: 'conj-back-to-select', lessonBar: true },
    // lessonBar: topo igual ao da trilha (progresso + ⚑ + ⌨️ + X) em vez do link de voltar (padrão das telas de exercício, 2026-10-23).
    { tab: 'conjugaison', wrap: 'conj-game-wrap', back: 'conj-game-back', lessonBar: true },
    // lessonBarFlag: a barra da lição só aparece quando o player marca data-lesson-bar="1" (hoje, as Expressões; os outros tipos seguem com o link).
    { tab: 'challenges', wrap: 'challenge-player-wrap', back: 'challenge-back-to-list', lessonBarFlag: 'lessonBar' }
  ];
  const tr = (k, fb) => (typeof t === 'function' ? t(k) : fb);

  function visible(el){ return !!el && el.style.display !== 'none'; }

  function activeArea(){
    return AREAS.find(a => {
      const view = document.getElementById('view-' + a.tab);
      return view && view.classList.contains('active') && visible(document.getElementById(a.wrap));
    });
  }

  // Topo no molde da lição: trilho de progresso, ⚑, ⌨️ (abre o modal de atalhos) e X (aciona o botão de voltar da sessão,
  // que fica escondido). O motor da sessão move o trilho (.lesson-progress-fill) pela largura.
  const LESSON_BAR_BTNS = [
    { cls: 'activity-flag-btn', icon: '⚑', key: 'report.entry.label', fb: 'Reportar problema', report: true },
    { cls: 'activity-kbd-btn', icon: '⌨️', key: 'ui.kbd.ariaTitle', fb: 'Atalhos do teclado' },
    { cls: 'activity-exit-btn', icon: '✕', key: 'games.exit', fb: 'Sair do jogo' }
  ];
  function labelLessonBar(root){
    root.querySelectorAll('[data-activity-label]').forEach(b => {
      const label = tr(b.getAttribute('data-activity-label'), b.getAttribute('data-activity-fb'));
      b.setAttribute('aria-label', label); b.title = label;
    });
  }
  function ensureLessonBar(area){
    const wrap = document.getElementById(area.wrap);
    const back = document.getElementById(area.back);
    if (!wrap || !back || wrap.querySelector('.activity-lesson-bar')) return;
    const bar = document.createElement('div');
    bar.className = 'lesson-focus-bar activity-lesson-bar';
    bar.innerHTML = '<div class="lesson-progress-track"><div class="lesson-progress-fill" style="width:0%"></div></div>';
    LESSON_BAR_BTNS.forEach(d => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'lesson-close-btn ' + d.cls;
      if (d.report) b.setAttribute('data-report-flag', '');
      b.setAttribute('data-activity-label', d.key);
      b.setAttribute('data-activity-fb', d.fb);
      b.textContent = d.icon;
      bar.appendChild(b);
    });
    labelLessonBar(bar);
    bar.querySelector('.activity-kbd-btn').addEventListener('click', () => {
      const m = document.getElementById('kbd-shortcuts-modal');
      if (m) m.style.display = 'flex';
    });
    bar.querySelector('.activity-exit-btn').addEventListener('click', () => back.click());
    // O link de voltar (e a barra com ⚑ que o envolve, se já existir) fica escondido: o X aciona o mesmo botão.
    const holder = back.parentElement && back.parentElement.classList.contains('activity-focus-bar') ? back.parentElement : back;
    holder.style.display = 'none';
    wrap.insertBefore(bar, wrap.firstChild);
  }

  // Barra do topo da sessão: o link de voltar à esquerda e a ⚑ à direita.
  function wantsLessonBar(area){
    if (area.lessonBar) return true;
    const w = area.lessonBarFlag ? document.getElementById(area.wrap) : null;
    return !!w && w.dataset[area.lessonBarFlag] === '1';
  }
  function ensureBar(area){
    if (wantsLessonBar(area)) return ensureLessonBar(area);
    // Tipo sem barra da lição: devolve o link de voltar (a barra anterior, se sobrou, sai).
    if (area.lessonBarFlag){
      const w = document.getElementById(area.wrap), old = w && w.querySelector('.activity-lesson-bar');
      if (old) old.remove();
      const b = document.getElementById(area.back);
      if (b){ b.style.display = ''; if (b.parentElement && b.parentElement.classList.contains('activity-focus-bar')) b.parentElement.style.display = ''; }
    }
    const back = document.getElementById(area.back);
    if (!back || back.parentElement.classList.contains('activity-focus-bar')) return;
    const bar = document.createElement('div');
    bar.className = 'activity-focus-bar';
    back.parentElement.insertBefore(bar, back);
    bar.appendChild(back);
    const flag = document.createElement('button');
    flag.type = 'button';
    flag.className = 'activity-report-btn';
    flag.setAttribute('data-report-flag', '');
    const label = tr('report.entry.label', 'Reportar problema');
    flag.setAttribute('aria-label', label);
    flag.title = label;
    flag.textContent = '⚑';
    bar.appendChild(flag);
  }

  function lessonOpen(){
    const app = document.getElementById('app');
    const unit = document.getElementById('unit-detail-wrap');
    return !!app && app.dataset.activeTab === 'path' && !!unit && unit.style.display === 'block';
  }

  function syncActivityFocus(){
    if (typeof setLessonFocusMode !== 'function') return;
    const area = activeArea();
    const owner = document.body.dataset.activityFocus;
    if (area){
      ensureBar(area);
      if (owner !== area.tab){
        document.body.dataset.activityFocus = area.tab;
        setLessonFocusMode(true);
      }
    } else if (owner){
      delete document.body.dataset.activityFocus;
      if (!lessonOpen()) setLessonFocusMode(false);
    }
  }

  function start(){
    const app = document.getElementById('app');
    if (!app || typeof MutationObserver === 'undefined') return;
    const mo = new MutationObserver(syncActivityFocus);
    mo.observe(app, { attributes: true, attributeFilter: ['data-active-tab'] });
    AREAS.forEach(a => {
      const view = document.getElementById('view-' + a.tab);
      const wrap = document.getElementById(a.wrap);
      if (view) mo.observe(view, { attributes: true, attributeFilter: ['class'] });
      if (wrap) mo.observe(wrap, { attributes: true, attributeFilter: ['style'] });
    });
    window.addEventListener('i18n:change', () => {
      document.querySelectorAll('.activity-report-btn').forEach(b => {
        const label = tr('report.entry.label', 'Reportar problema');
        b.setAttribute('aria-label', label); b.title = label;
      });
      labelLessonBar(document);
    });
    syncActivityFocus();
  }

  // A sessão reescreve o próprio conteúdo a cada passo (innerHTML) e a barra mora dentro dele, logo abaixo do cabeçalho (como
  // na lição: contexto da unidade, depois a barra). Fluxo: grab (pega a barra), reescreve o conteúdo, mount (põe de volta).
  function activityBarGrab(wrapId){
    syncActivityFocus();
    const w = document.getElementById(wrapId);
    return w ? w.querySelector('.activity-lesson-bar') : null;
  }
  function activityBarMount(wrapId, bar, afterSelector){
    const w = document.getElementById(wrapId);
    if (!w || !bar) return;
    const host = w.querySelector('[id$="-content"]');
    if (!host) return;
    const anchor = afterSelector ? host.querySelector(afterSelector) : null;
    if (anchor) anchor.after(bar); else host.prepend(bar);
  }
  function activityBarProgress(wrapId, pct){
    const w = document.getElementById(wrapId);
    const fill = w && w.querySelector('.activity-lesson-bar .lesson-progress-fill');
    if (fill) fill.style.width = Math.max(0, Math.min(100, pct)) + '%';
  }
  if (typeof window !== 'undefined'){
    window.activityBarGrab = activityBarGrab; window.activityBarMount = activityBarMount; window.activityBarProgress = activityBarProgress;
  }
  if (typeof window !== 'undefined') window.syncActivityFocus = syncActivityFocus;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();

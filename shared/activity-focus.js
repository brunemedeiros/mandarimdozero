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
    { tab: 'conjugaison', wrap: 'conj-practice-wrap', back: 'conj-back-to-select' },
    { tab: 'conjugaison', wrap: 'conj-game-wrap', back: 'conj-game-back' },
    { tab: 'challenges', wrap: 'challenge-player-wrap', back: 'challenge-back-to-list' }
  ];
  const tr = (k, fb) => (typeof t === 'function' ? t(k) : fb);

  function visible(el){ return !!el && el.style.display !== 'none'; }

  function activeArea(){
    return AREAS.find(a => {
      const view = document.getElementById('view-' + a.tab);
      return view && view.classList.contains('active') && visible(document.getElementById(a.wrap));
    });
  }

  // Barra do topo da sessão: o link de voltar à esquerda e a ⚑ à direita.
  function ensureBar(area){
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
    });
    syncActivityFocus();
  }

  if (typeof window !== 'undefined') window.syncActivityFocus = syncActivityFocus;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();

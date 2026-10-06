// Fase 7 da trilha (06/10/2026): modo MAPA, compartilhado fr/zh. Só DOM + seleção
// + acessibilidade; as REGRAS (estado, "pode pular?", o que cada botão faz)
// continuam nos app.js, que passam o modelo pronto. Preferência Trilha/Mapa só
// no aparelho (localStorage), como pediu a professora.
//
// model = { sections: [{ title, nodes: [{ key, kind, icon, label, state, aria, current? }] }] }
//   kind  : 'unit' | 'review' | 'checkpoint'
//   state : 'done' | 'skipped' | 'current' | 'available' | 'locked' | 'empty'
// describe(key) -> { eyebrow, title, goal, status, lines:[texto], actions:[{label, primary, onClick}] }
function trailViewPref(storageKey){
  try { return window.localStorage.getItem(storageKey) === 'map' ? 'map' : 'trail'; } catch (e) { return 'trail'; }
}
function setTrailViewPref(storageKey, view){
  try { window.localStorage.setItem(storageKey, view === 'map' ? 'map' : 'trail'); } catch (e) { /* ignore */ }
}

function trailEscape(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const TRAIL_MAP_STATE_LABEL = { done: 'Concluída', skipped: 'Pulada', current: 'Atual', available: 'Disponível', locked: 'Bloqueada', empty: 'Sem itens' };

// Constrói o mapa dentro de `root` (limpa o que havia). Devolve { select, close }.
function renderTrailMap(root, model, describe, opts){
  opts = opts || {};
  root.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'trail-map';
  const body = document.createElement('div');
  body.className = 'trail-map-body';
  const panel = document.createElement('aside');
  panel.className = 'tm-panel';
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'false');
  panel.setAttribute('aria-labelledby', 'tm-panel-title');
  const backdrop = document.createElement('div');
  backdrop.className = 'tm-backdrop';
  backdrop.hidden = true;

  model.sections.forEach(sec => {
    const s = document.createElement('section');
    s.className = 'trail-map-section';
    const h = document.createElement('h3');
    h.className = 'tm-section-title';
    h.textContent = sec.title;
    s.appendChild(h);
    const row = document.createElement('div');
    row.className = 'tm-nodes';
    sec.nodes.forEach(n => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `tm-node tm-${n.kind} ${n.state}`;
      b.dataset.key = n.key;
      b.setAttribute('aria-label', n.aria || `${n.label}, ${TRAIL_MAP_STATE_LABEL[n.state] || n.state}`);
      if (n.current) b.setAttribute('aria-current', 'step');
      b.innerHTML = `<span class="tm-icon" aria-hidden="true">${trailEscape(n.icon)}</span><span class="tm-label">${trailEscape(n.label)}</span>`;
      b.addEventListener('click', () => select(n.key, b));
      row.appendChild(b);
    });
    s.appendChild(row);
    body.appendChild(s);
  });

  let selectedBtn = null;
  function close(){
    panel.hidden = true; backdrop.hidden = true;
    if (selectedBtn){ selectedBtn.classList.remove('selected'); selectedBtn.setAttribute('aria-expanded', 'false'); selectedBtn.focus(); selectedBtn = null; }
  }
  function select(key, btn){
    btn = btn || body.querySelector(`.tm-node[data-key="${CSS.escape(String(key))}"]`);
    if (selectedBtn) { selectedBtn.classList.remove('selected'); selectedBtn.setAttribute('aria-expanded', 'false'); }
    selectedBtn = btn;
    if (btn){ btn.classList.add('selected'); btn.setAttribute('aria-expanded', 'true'); }
    const d = describe(key) || {};
    panel.innerHTML = `
      <button type="button" class="tm-close" aria-label="Fechar painel">✕</button>
      ${d.eyebrow ? `<div class="tm-eyebrow">${trailEscape(d.eyebrow)}</div>` : ''}
      <h3 id="tm-panel-title" class="tm-title">${trailEscape(d.title)}</h3>
      ${d.status ? `<div class="tm-status">${trailEscape(d.status)}</div>` : ''}
      ${d.goal ? `<p class="tm-goal">${trailEscape(d.goal)}</p>` : ''}
      ${(d.lines || []).map(l => `<p class="tm-line">${trailEscape(l)}</p>`).join('')}
      <div class="tm-actions"></div>`;
    const actions = panel.querySelector('.tm-actions');
    (d.actions || []).forEach(a => {
      const ab = document.createElement('button');
      ab.type = 'button';
      ab.className = 'btn ' + (a.primary ? 'btn-primary' : 'btn-secondary') + ' btn-block';
      ab.textContent = a.label;
      ab.addEventListener('click', () => { if (a.onClick) a.onClick(); });
      actions.appendChild(ab);
    });
    panel.querySelector('.tm-close').addEventListener('click', close);
    panel.hidden = false; backdrop.hidden = false;
    if (opts.onOpen) opts.onOpen(key);
  }
  backdrop.addEventListener('click', close);
  wrap.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden){ e.stopPropagation(); close(); } });

  wrap.appendChild(body);
  wrap.appendChild(panel);
  wrap.appendChild(backdrop);
  root.appendChild(wrap);
  return { select, close, panel };
}

// Alternador Trilha | Mapa (preferência só deste aparelho).
function buildTrailViewToggle(storageKey, onChange){
  const cur = trailViewPref(storageKey);
  const bar = document.createElement('div');
  bar.className = 'trail-view-toggle';
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', 'Modo de visualização da trilha');
  [['trail', 'Trilha'], ['map', 'Mapa']].forEach(([v, label]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tvt-btn' + (cur === v ? ' active' : '');
    b.dataset.view = v;
    b.setAttribute('aria-pressed', cur === v ? 'true' : 'false');
    b.textContent = label;
    b.addEventListener('click', () => { if (cur === v) return; setTrailViewPref(storageKey, v); onChange(v); });
    bar.appendChild(b);
  });
  return bar;
}

// ---------- Selos das conquistas (decisão da autora, 2026-11-24) ----------
// Peça comum a todos os sites. Cores, layout e passaporte em shared/selos.css.
// - formato = qual trilha é (SELO_POR_TRILHA);
// - cor da borda = nível, pela escala B (SELO_ESCALA, por número de níveis da trilha); ouro = sempre o nível máximo;
// - borda preenchida = quanto falta para o próximo nível (mesma barra do cartão da trilha em Progresso);
// - nível máximo = selo inteiro em ouro;
// - data só nas conquistas ganhas depois do registro em lote (BADGE_BACKFILL_EARNED_AT, as antigas têm data fictícia).
// Depende de shared/badge-tracks.js e shared/badge-tracks-app.js (badgeIconHTML, BADGE_BACKFILL_EARNED_AT) e de t().

// Escala B (aprovada pela autora): bronze e prata no começo, pedras no meio, ouro no máximo.
const SELO_ESCALA = {
  1: ['ouro'],
  2: ['prata', 'ouro'],
  3: ['bronze', 'prata', 'ouro'],
  4: ['bronze', 'prata', 'esmeralda', 'ouro'],
  5: ['bronze', 'prata', 'esmeralda', 'safira', 'ouro'],
  6: ['bronze', 'prata', 'esmeralda', 'safira', 'rubi', 'ouro'],
  7: ['bronze', 'prata', 'esmeralda', 'safira', 'ametista', 'rubi', 'ouro'],
};
const SELO_METAIS = ['bronze', 'prata', 'esmeralda', 'safira', 'ametista', 'rubi', 'ouro'];

// Metal do nível atual de uma trilha (view de badgeTrackViews ou de describeBadgeId).
function seloMetal(v){
  const total = Math.max(1, v.total || 1), lv = Math.max(1, v.level || 1);
  if (lv >= total) return 'ouro';
  const lista = SELO_ESCALA[Math.min(total, 7)];
  // Mais de 7 níveis: os do meio repetem a última pedra antes do ouro.
  return lista[Math.min(lv, lista.length - 1) - 1] || lista[lista.length - 2];
}

// Formatos (viewBox 120x120). Cada um é um caminho fechado: a borda e o preenchimento do progresso usam o mesmo caminho.
const SELO_FORMAS = (function(){
  const C = 60, f = (n) => n.toFixed(1);
  const poli = (pts) => 'M ' + pts.map(([x, y]) => f(x) + ' ' + f(y)).join(' L ') + ' Z';
  const radial = (n, rf, rot) => poli(Array.from({ length: n }, (_, k) => {
    const a = (k / n + (rot || 0)) * Math.PI * 2 - Math.PI / 2, r = rf(k, a);
    return [C + r * Math.cos(a), C + r * Math.sin(a)];
  }));
  const ondaLado = (x1, y1, x2, y2, n, amp) => {
    const pts = [], dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
    for (let i = 0; i <= n * 8; i++){ const t = i / (n * 8), o = -amp * Math.abs(Math.sin(Math.PI * n * t)); pts.push([x1 + dx * t + nx * o, y1 + dy * t + ny * o]); }
    return pts;
  };
  const circulo = 'M 60 3 A 57 57 0 1 1 59.9 3 Z';
  return {
    arco:       { d: 'M 14 112 V 52 A 46 46 0 0 1 106 52 V 112 Z', ajuste: [5, .94] },
    escudo:     { d: 'M 14 10 H 106 V 58 C 106 88 84 104 60 114 C 36 104 14 88 14 58 Z', ajuste: [-6, .86] },
    ondinhas:   { d: radial(56, (k) => k % 2 ? 56 : 59.5), ajuste: [0, .93] },
    octogono:   { d: radial(8, () => 58.5, 1 / 16), ajuste: [0, .92] },
    postal:     { d: poli([].concat(ondaLado(8, 8, 112, 8, 9, 3.5), ondaLado(112, 8, 112, 112, 9, 3.5), ondaLado(112, 112, 8, 112, 9, 3.5), ondaLado(8, 112, 8, 8, 9, 3.5))), ajuste: [0, .95] },
    pontinhos:  { d: circulo, ajuste: [0, .9], pontinhos: true },
    hexagono:   { d: radial(6, () => 59, 1 / 12), ajuste: [0, .9] },
    ingresso:   { d: 'M 8 12 H 112 V 46 A 14 14 0 0 0 112 74 V 108 H 8 V 74 A 14 14 0 0 0 8 46 Z', ajuste: [0, .9] },
    recortado:  { d: 'M 14 6 H 106 L 114 14 V 106 L 106 114 H 14 L 6 106 V 14 Z', ajuste: [0, .97] },
    roseta:     { d: radial(160, (k, a) => 54 + 4.5 * Math.cos(a * 14)), ajuste: [0, .9] },
    concavo:    { d: 'M 22 6 H 98 A 16 16 0 0 0 114 22 V 98 A 16 16 0 0 0 98 114 H 22 A 16 16 0 0 0 6 98 V 22 A 16 16 0 0 0 22 6 Z', ajuste: [0, .95] },
    oval:       { d: radial(90, (k, a) => 1 / Math.sqrt(Math.pow(Math.cos(a) / 58, 2) + Math.pow(Math.sin(a) / 47, 2))), ajuste: [0, .9] },
    duplo:      { d: circulo, ajuste: [0, .93] },
    pentagono:  { d: radial(5, () => 60, 0), ajuste: [7, .84] },
    bandeirola: { d: 'M 10 6 H 110 V 112 L 60 96 L 10 112 Z', ajuste: [-6, .9] },
    flor:       { d: radial(160, (k, a) => 52 + 6 * Math.cos(a * 8)), ajuste: [0, .86] },
  };
})();

// Um formato por trilha (como cada país tem o seu carimbo).
const SELO_POR_TRILHA = {
  days: 'arco', review: 'escudo', streak: 'ondinhas', xp: 'octogono', course1: 'postal', ear: 'pontinhos', explore: 'hexagono',
  weekend: 'ingresso', vocab: 'recortado', aced: 'roseta', dictation: 'concavo', challenge: 'oval', comeback: 'duplo',
  podium: 'pentagono', duo: 'bandeirola', friends: 'flor',
};

function seloTrilha(v){ return v.track || v.id; }
function seloNomeForma(v){ return v.classic ? 'duplo' : (SELO_POR_TRILHA[seloTrilha(v)] || 'duplo'); }
function seloForma(v){ return SELO_FORMAS[seloNomeForma(v)]; }

// Defs comuns (gradientes metálicos com as cores dos tokens de shared/selos.css e a "tinta falhada"), uma vez por página.
function ensureSeloDefs(){
  if (document.getElementById('selo-defs')) return;
  const box = document.createElement('div');
  box.id = 'selo-defs';
  box.setAttribute('aria-hidden', 'true');
  box.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  const grad = (id, a, b, c) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(${a})"/><stop offset=".5" style="stop-color:var(${b})"/><stop offset="1" style="stop-color:var(${c})"/></linearGradient>`;
  box.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" focusable="false"><defs>
    ${SELO_METAIS.map(m => grad('selo-g-' + m, `--selo-${m}-1`, `--selo-${m}-2`, `--selo-${m}-3`)).join('')}
    ${grad('selo-g-ouro-cheio', '--selo-ouro-cheio-1', '--selo-ouro-cheio-2', '--selo-ouro-cheio-3')}
    <filter id="selo-tinta" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="1" seed="7" result="r"/>
      <feColorMatrix in="r" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.9 1.25" result="m"/>
      <feComposite in="SourceGraphic" in2="m" operator="in"/>
    </filter></defs></svg>`;
  document.body.appendChild(box);
}

// Porcentagem até o próximo nível (null = desconhecida, ex.: perfil de outra pessoa).
function seloPct(v){
  if (v.maxed || (v.total && v.level >= v.total)) return 100;
  if (v.barTo == null || v.barValue == null) return null;
  return Math.max(0, Math.min(100, Math.round(((v.barValue - (v.barFrom || 0)) / Math.max(1, v.barTo - (v.barFrom || 0))) * 100)));
}

// Desenho da borda. estado: 'max' | 'nivel' | 'classic' | 'bloqueada'.
function seloBordaSVG(v, estado, pct, cls){
  ensureSeloDefs();
  const forma = seloForma(v), d = forma.d;
  const esc = (k) => `translate(60 60) scale(${k}) translate(-60 -60)`;
  const metal = estado === 'classic' ? null : seloMetal(v);
  const corMedia = estado === 'classic' ? 'var(--brand-fill)' : (estado === 'bloqueada' ? 'var(--paper-line)' : `var(--selo-${metal}-2)`);
  let corpo;
  if (estado === 'max'){
    corpo = `<path d="${d}" fill="url(#selo-g-ouro-cheio)" stroke="none"/>
      <g fill="none" filter="url(#selo-tinta)"><path d="${d}" stroke="var(--selo-ouro-2)" stroke-width="4.5"/><path d="${d}" stroke="var(--selo-ouro-borda)" stroke-width="2"/>
      <path class="selo-dentro" d="${d}" transform="${esc(.93)}" stroke="#FFFFFF" stroke-width="1.3" vector-effect="non-scaling-stroke" opacity=".85"/></g>`;
  } else if (estado === 'bloqueada'){
    corpo = `<g fill="none"><path d="${d}" stroke="${corMedia}" stroke-width="3" stroke-dasharray="6 5"/>
      <path class="selo-dentro" d="${d}" transform="${esc(.93)}" stroke="${corMedia}" stroke-width="1" vector-effect="non-scaling-stroke"/></g>`;
  } else {
    const p = pct == null ? 100 : pct; // sem dado de progresso (perfil de outra pessoa): borda cheia na cor do nível
    const traco = estado === 'classic' ? corMedia : `url(#selo-g-${metal})`;
    corpo = `<g fill="none" filter="url(#selo-tinta)">
      <path class="selo-trilho" d="${d}" stroke="${corMedia}" stroke-width="4.5"/>
      <path d="${d}" stroke="${traco}" stroke-width="4.5" pathLength="100" stroke-dasharray="${p} 100" stroke-linecap="round"/>
      <path class="selo-dentro" d="${d}" transform="${esc(.93)}" stroke="${corMedia}" stroke-width="1.3" vector-effect="non-scaling-stroke" opacity=".75"/></g>`;
  }
  const pontos = forma.pontinhos && estado !== 'max'
    ? Array.from({ length: 28 }, (_, k) => { const a = k / 28 * Math.PI * 2; return `<circle cx="${(60 + 50 * Math.cos(a)).toFixed(1)}" cy="${(60 + 50 * Math.sin(a)).toFixed(1)}" r="1.4" fill="${corMedia}"/>`; }).join('')
    : '';
  return `<svg class="selo-borda${cls ? ' ' + cls : ''}" viewBox="0 0 120 120" aria-hidden="true" focusable="false">${corpo}${pontos}</svg>`;
}

// Data curta no idioma do site ("06 nov 2026" / "06 Nov 2026"). Vazia para as conquistas antigas (data fictícia do registro em lote).
function seloData(iso){
  const ts = Date.parse(iso || '');
  const ficticia = Date.parse(typeof BADGE_BACKFILL_EARNED_AT !== 'undefined' ? BADGE_BACKFILL_EARNED_AT : '2026-10-01T00:00:00Z');
  if (!ts || ts <= ficticia) return '';
  const lang = (typeof getUiLang === 'function' && getUiLang()) || 'pt-BR';
  const loc = /^en/.test(lang) ? 'en-GB' : lang;
  return new Date(ts).toLocaleDateString(loc, { day: '2-digit', month: 'short', year: 'numeric' }).replace(/\./g, '').replace(/ de /g, ' ');
}

// Selo completo (Visão geral, perfil público, clássicas do Progresso). v = view da trilha, de describeBadgeId ou clássica.
// opts.bloqueada: conquista ainda não ganha (vitrine de quem não tem nenhuma). Mantém .track-chip / data-track-chip / .track-chip-name.
function seloHTML(v, opts){
  const o = opts || {};
  const estado = o.bloqueada ? 'bloqueada' : (v.classic ? 'classic' : ((v.maxed || v.level >= v.total) ? 'max' : 'nivel'));
  const pct = estado === 'nivel' ? seloPct(v) : null;
  const [desloc, escala] = seloForma(v).ajuste;
  const nivel = estado === 'bloqueada' ? t('badge.ui.locked')
    : estado === 'classic' ? t('badge.ui.classic')
    : estado === 'max' ? t('badge.stamp.max')
    : t('badge.ui.levelOf', { n: v.level, total: v.total });
  const faixa = estado === 'nivel' ? ` style="background:var(--selo-${seloMetal(v)}-2);color:var(--on-selo-${seloMetal(v)})"` : '';
  const data = estado === 'bloqueada' ? '' : seloData(o.earnedAt || v.earnedAt);
  const dica = estado === 'nivel' && pct != null ? t('badge.stamp.toNext', { pct, n: v.level + 1 }) : '';
  const nome = v.name || '';
  const rotulo = [nome, nivel, dica, data].filter(Boolean).join('. ');
  return `<button type="button" class="track-chip selo is-${estado}" data-track-chip="${escapeAttr(v.id)}" data-forma="${seloNomeForma(v)}"${dica ? ` title="${escapeAttr(dica)}"` : ''} aria-label="${escapeAttr(rotulo)}" style="--selo-desloc:${desloc}px;--selo-esc:${escala}">
    ${seloBordaSVG(v, estado, pct)}
    <span class="selo-miolo">${badgeIconHTML(v, 'selo-ico')}<span class="track-chip-name">${escapeHTML(nome)}</span><span class="selo-nivel"${faixa}>${escapeHTML(nivel)}</span>${data ? `<span class="selo-data">${escapeHTML(data)}</span>` : ''}</span>
  </button>`;
}

// Selo pequeno no lugar da medalha do cartão da trilha (Perfil > Progresso): só borda + ícone; barra e meta continuam no cartão.
function seloMiniHTML(v){
  const estado = v.level ? ((v.maxed || v.level >= v.total) ? 'max' : 'nivel') : 'bloqueada';
  return `<span class="selo-mini is-${estado}">${seloBordaSVG(v, estado, estado === 'nivel' ? seloPct(v) : null)}${badgeIconHTML(v)}${v.level ? '' : `<span class="track-medal-lock" aria-hidden="true"><img src="${BADGE_ICON_BASE}1f512.svg" alt="" width="14" height="14"></span>`}</span>`;
}

// Datas das conquistas da própria conta (id do nível -> earned_at). Falha de rede = sem datas (o selo só não mostra a data).
async function fetchOwnBadgeEarnedAt(){
  if (typeof CURRENT_USER === 'undefined' || !CURRENT_USER || typeof supabaseClient === 'undefined') return {};
  try {
    const { data, error } = await supabaseClient.from('earned_badges').select('badge_id, earned_at, language_app_key').eq('user_id', CURRENT_USER.id);
    if (error || !data) return {};
    const out = {};
    data.forEach(r => {
      if (r.language_app_key !== APP_KEY && !(typeof AccountProgress !== 'undefined' && AccountProgress.isAccountBadge(r.badge_id))) return;
      out[r.badge_id] = r.earned_at;
    });
    return out;
  } catch (e) { return {}; }
}

// Data do nível atual de uma view (o id gravado é "trilha.nível"; clássica = o próprio id).
function seloEarnedAtFor(v, mapa){
  if (!mapa) return '';
  if (v.classic) return mapa[v.id] || '';
  return mapa[BadgeTracks.levelId(seloTrilha(v), v.level)] || mapa[v.id] || '';
}

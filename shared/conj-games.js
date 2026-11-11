// ---------- Jogos da Conjugação (motor comum a qualquer idioma estudado) ----------
// Jogo de escolha entre duas formas (ex.: passé composé x imparfait), no formato do
// "Jogo de Conjugações" da autora: frase com lacuna, duas opções, e depois da resposta
// a explicação com o desenho da linha do tempo, a pista destacada, a tradução e o áudio.
// Jogo que não é de tempo verbal (être x avoir, tu x vous) não tem desenho: sem opts.sketch, a
// legenda (opts.tl) aparece sozinha como a regra. game.level ('A1', 'A2') vira etiqueta no cartão.
// Os dados ficam por idioma (fr/conj-games.js -> CONJ_GAMES); o texto de cada item vem
// por idioma do site (text['pt-BR'], text.en). Sem XP: é prática livre, como a Conjugação (mas conta o dia de estudo).
// Molde da trilha (2026-10-26): topo com progresso + ⚑ + ⌨️ + X (shared/activity-focus.js, lessonBar), respostas numeradas
// (wireKeyboardOptions + teclado global), "Não sei" (revela e conta como erro) e "Continuar →".
// ---------- Progresso de cada jogo, salvo na conta (2026-11-06, docs/jogos-reformulacao-plano.md) ----------
// STATE.conjGames[gameId] = { items: { itemId: { ok, at } }, rounds }: a ÚLTIMA resposta de cada frase ("Não sei" = erro)
// e o dia; rounds = partidas terminadas. Sem XP (prática livre). Site sem o campo no STATE (zh) não grava nada.
// Concluído (proposta da autora, ajustes em confirmação): todas as frases do jogo já respondidas, somando as partidas,
// e pelo menos CONJ_GAME_DONE_PCT% delas com a última resposta certa.
const CONJ_GAME_DONE_PCT = 70;
// Etapa 6 (decisão da autora, 2026-11-10, como o artifact de jogos): em toda partida a 1ª metade das frases é de ESCOLHA e a
// 2ª metade é ESCREVENDO a forma (Curta: 5 + 5; Completa: metade de cada). let: os testes que só cobrem a escolha desligam.
let CONJ_GAMES_TYPED_HALF = true;
function conjGameRecord(gameId, create){
  if (typeof STATE === 'undefined' || !STATE || !STATE.conjGames || typeof STATE.conjGames !== 'object') return null;
  const r = STATE.conjGames[gameId];
  if (r && typeof r === 'object'){ if (!r.items || typeof r.items !== 'object') r.items = {}; return r; }
  return create ? (STATE.conjGames[gameId] = { items: {}, rounds: 0 }) : null;
}
function recordConjGameAnswer(gameId, itemId, ok){
  const r = conjGameRecord(gameId, true);
  if (!r || itemId == null) return;
  const day = typeof todayStr === 'function' ? todayStr() : new Date().toISOString().slice(0, 10);
  r.items[String(itemId)] = { ok: !!ok, at: day };
}
function finishConjGameRound(gameId){
  const r = conjGameRecord(gameId, true);
  if (r) r.rounds = (Number(r.rounds) || 0) + 1;
}
// Status de um jogo (lista nova): seen/total frases respondidas, right = última resposta certa, pct sobre o total.
function conjGameStatus(game){
  const total = game && Array.isArray(game.items) ? game.items.length : 0;
  const r = game ? conjGameRecord(game.id, false) : null;
  let seen = 0, right = 0;
  if (r) game.items.forEach(it => { const e = r.items[String(it.id)]; if (e){ seen++; if (e.ok) right++; } });
  const pct = total ? Math.round(100 * right / total) : 0;
  return { seen, total, right, pct, rounds: r ? (Number(r.rounds) || 0) : 0, done: total > 0 && seen === total && pct >= CONJ_GAME_DONE_PCT };
}
// Painel do topo: jogos concluídos e acertos (frases cuja última resposta está certa, somando os jogos).
function conjGamesSummary(games){
  const st = (games || []).map(conjGameStatus);
  return { done: st.filter(s => s.done).length, total: st.length, right: st.reduce((a, s) => a + s.right, 0) };
}

function createConjGames({ games, soon = [], speak, ids, isLocked, onLocked, lang = 'fr' }){
  // soon: jogos "em breve" ({ id, level, title, free? }), só cartão sem abrir no fim do grupo do nível.
  // lang: idioma estudado (atributo lang="" das frases e formas); padrão 'fr', o site de português passa 'pt'.
  // isLocked(game): paywall (Jogos são Premium; true só com o bloqueio ligado E sem a permissão "Jogos da Conjugação");
  // onLocked(game): o que fazer ao tocar num jogo trancado (a janela Premium própria dos Jogos).
  const $ = id => document.getElementById(id);
  const esc = s => (typeof escapeHTML === 'function' ? escapeHTML(String(s == null ? '' : s))
    : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const tt = (k, p) => (typeof t === 'function' ? t(k, p) : k);
  const uiLang = () => (typeof getUiLang === 'function' && getUiLang()) || 'pt-BR';
  // Texto no idioma do site; português só como último recurso (o curso em inglês não deve mostrá-lo).
  const L = o => (o && typeof o === 'object') ? (o[uiLang()] || o.en || o['pt-BR'] || '') : (o || '');
  // Trecho em francês marcado com {chaves} nos textos (título, apresentação, regra e explicação) sai em azul,
  // para separar do português/inglês do site (pedido da autora, 2026-10-19). plain() tira as chaves (aria-label).
  const rich = s => esc(s).replace(/\{([^{}]+)\}/g, `<span class="cg-fr" lang="${lang}">$1</span>`);
  const plain = s => String(s == null ? '' : s).replace(/[{}]/g, '');
  const shuffle = a => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };

  const AXIS = '<line x1="4" y1="26" x2="122" y2="26" stroke="currentColor" stroke-width="2" opacity=".45"/><path d="M122 21 L130 26 L122 31 Z" fill="currentColor" opacity=".45"/>';
  const SKETCH = {
    point: AXIS + '<circle cx="64" cy="26" r="8" fill="var(--imperial-gold)" stroke="currentColor" stroke-width="2"/>',
    line: AXIS + '<rect x="18" y="19" width="92" height="14" rx="7" fill="var(--seal-red)" opacity=".85"/><path d="M24 26 h80" stroke="currentColor" stroke-width="2" stroke-dasharray="4 5"/>'
  };

  // mode: 'choice' (partida normal, duas opções) ou 'type' ("Revisar erros": escrever a forma). gameAt[i]: jogo da frase i
  // quando a revisão mistura jogos (senão vale S.game).
  const S = { game: null, order: [], gameAt: [], stages: [], mode: 'choice', idx: 0, hits: 0, log: [], answered: false, shownAt: 0, dirty: false };

  // Selo (regra 7 da dona, 2026-10-22): recurso Premium com o bloqueio DESLIGADO mostra só "⭐ Premium" e abre para
  // todos; com o bloqueio LIGADO, quem não tem a permissão vê "⭐ Premium" + cadeado e, ao tocar, o aviso Premium.
  function premiumSealHTML(g){
    const locked = !!(isLocked && isLocked(g));
    return `<span class="cg-premium" data-cg-seal="${locked ? 'locked' : 'open'}">⭐ ${esc(tt('games.premium'))}${locked
      ? ` <span class="cg-lock" role="img" aria-label="${esc(tt('games.locked'))}">🔒</span>` : ''}</span>`;
  }

  // ---------- Lista (etapas 2 e 3 da reformulação, 2026-11-06/08, docs/jogos-reformulacao-plano.md) ----------
  // No padrão da lista de Expressões (peças de shared/desafios.css): painel "X de Y jogos concluídos" + barra + acertos,
  // filtros Todos / Pendentes / Concluídos, grupos por nível recolhíveis com anel, cartão de álbum (pendente tracejado;
  // concluído com selo "✓ Concluído · N%"). Cartão (pedido da autora, 2026-11-08, como o artifact de jogos): título e UMA
  // frase do jogo com a lacuna e, entre parênteses, as duas opções (ou o verbo, com sampleHint:'verb'); embaixo tema e
  // "⭐ Premium". Em cada nível: grátis primeiro, Premium no fim, "em breve" por último. Convite "Premium: mais N jogos ·
  // Fale com a Prof. Brune" só quando o jogo trava de verdade (bloqueio ligado e sem a permissão; regra 7 da dona).
  const collapsedLevels = new Set();
  let listFilter = 'all';
  const plural = (base, n, p) => tt(base + (n === 1 ? '.one' : '.other'), p);
  const tidy = h => h.replace(/ ([?!:;])/g, '\u00a0$1'); // tipografia francesa: o sinal não cai sozinho na linha de baixo
  const LEVEL_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const levelRank = lv => { const i = LEVEL_ORDER.indexOf(lv); return i < 0 ? 99 : i; };

  function summaryHTML(){
    const sum = conjGamesSummary(games);
    const pct = sum.total ? Math.round(100 * sum.done / sum.total) : 0;
    return `<div class="cg-summary">
      <div class="challenge-progress" data-done="${sum.done}" data-total="${sum.total}">
        <div class="challenge-progress-label">${esc(plural('games.summary', sum.total, { done: sum.done, total: sum.total }))}</div>
        <div class="challenge-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="${sum.total}" aria-valuenow="${sum.done}"><div class="challenge-progress-fill" style="width:${pct}%"></div></div>
      </div>
      <span class="cg-summary-hits">${esc(plural('games.hits', sum.right, { n: sum.right }))}</span>
    </div>`;
  }

  function filtersHTML(){
    return `<div class="challenges-filter-chips cg-filters" role="group" aria-label="${esc(tt('games.filter.label'))}">
      ${['all', 'pending', 'done'].map(f => `<button type="button" class="challenges-filter-chip ${listFilter === f ? 'active' : ''}" data-cg-filter="${f}" aria-pressed="${listFilter === f}">${esc(tt('games.filter.' + f))}</button>`).join('')}
    </div>`;
  }

  function sampleHTML(g){
    const it = g.items.find(x => x.id === g.sample) || g.items[0];
    if (!it) return '';
    const hint = g.sampleHint === 'verb' && it.verb ? it.verb : optsHint(g);
    return `<span class="cg-card-sample" lang="${lang}">${tidy(`${esc(it.before)}<span class="cg-card-blank" aria-hidden="true"></span> <span class="cg-card-hint">(${esc(hint)})</span>${esc(it.after)}`)}</span>`;
  }

  function cardHTML(g){
    const st = conjGameStatus(g);
    const theme = L(g.theme);
    const locked = !!(isLocked && isLocked(g));
    return `<div class="cg-card-wrap">
      <button type="button" class="challenge-card expr-card cg-game-card cg-play ${st.done ? 'completed' : ''} ${locked ? 'locked' : ''}" data-game="${esc(g.id)}" data-done="${st.done ? 1 : 0}">
        ${st.done ? `<span class="expr-card-seal">${esc(tt('games.doneSeal', { pct: st.pct }))}</span>` : ''}
        <span class="challenge-card-expr">${rich(L(g.title))}</span>
        ${sampleHTML(g)}
        <span class="expr-card-foot">${theme ? `<span class="expr-reg expr-reg-neutral">${esc(theme)}</span>` : ''}${g.free ? '' : premiumSealHTML(g)}</span>
      </button>
    </div>`;
  }

  function soonCardHTML(g){
    return `<div class="cg-card-wrap">
      <div class="challenge-card expr-card cg-game-card cg-soon" data-soon="${esc(g.id)}" aria-disabled="true">
        <span class="challenge-card-expr">${rich(L(g.title))}</span>
        <span class="expr-card-foot"><span class="cg-soon-chip">${esc(tt('games.soon'))}</span></span>
      </div>
    </div>`;
  }

  const passes = g => listFilter === 'all' || (listFilter === 'done') === conjGameStatus(g).done;

  function levelSectionHTML(level){
    const all = games.filter(g => (g.level || '') === level);
    // grátis primeiro, Premium no fim (ordem do arquivo dentro de cada parte)
    const ordered = all.filter(g => g.free).concat(all.filter(g => !g.free));
    const shown = ordered.filter(passes);
    const soonHere = listFilter === 'all' ? soon.filter(g => (g.level || '') === level) : [];
    if (!shown.length && !soonHere.length) return '';
    const done = all.filter(g => conjGameStatus(g).done).length;
    const pct = all.length ? Math.round(100 * done / all.length) : 0;
    const collapsed = collapsedLevels.has(level) && listFilter === 'all';
    const lockedN = all.filter(g => !g.free && isLocked && isLocked(g)).length;
    const invite = lockedN && listFilter !== 'done' ? `<button type="button" class="cg-premium-invite" data-cg-invite="1">⭐ ${esc(plural('games.premiumMore', lockedN, { n: lockedN }))} · ${esc(tt('premiumContact.button'))}</button>` : '';
    return `<div class="challenges-level-section" data-level="${esc(level)}">
      <button type="button" class="challenges-level-heading" data-level="${esc(level)}" aria-expanded="${!collapsed}">
        <span class="challenges-level-chevron ${collapsed ? 'collapsed' : ''}" aria-hidden="true">▾</span>
        ${all.length ? `<span class="challenges-level-ring" style="--p:${pct}" data-complete="${pct === 100 ? 1 : 0}" role="img" aria-label="${esc(tt('games.ring.aria', { done, total: all.length }))}">${done}/${all.length}</span>` : ''}
        ${esc(level ? tt('games.levelName', { level }) : tt('games.tabGames'))}
        ${all.length ? `<span class="challenges-level-count">${listFilter === 'all' ? all.length : `${shown.length}/${all.length}`}</span>` : ''}
      </button>
      <div class="cg-level-body" ${collapsed ? 'hidden' : ''}>
        <div class="challenges-cards cg-cards">${shown.map(cardHTML).join('')}${soonHere.map(soonCardHTML).join('')}</div>
        ${invite}
      </div>
    </div>`;
  }

  function renderList(){
    const el = $(ids.list);
    if (!el) return;
    const levels = [...new Set(games.concat(soon).map(g => g.level || ''))].sort((a, b) => levelRank(a) - levelRank(b));
    const sections = levels.map(levelSectionHTML).join('');
    const due = dueEntries();
    const dueHTML = due.length ? `<button type="button" class="cg-due" id="cg-due">
      <span class="cg-due-ico" aria-hidden="true">🔁</span>
      <span class="cg-due-text"><b>${esc(tt('games.dueTitle', { n: due.length }))}</b><span>${esc(tt('games.dueSub'))}</span></span>
    </button>` : '';
    el.innerHTML = summaryHTML() + dueHTML + filtersHTML()
      + `<div class="challenges-level-sections cg-level-sections">${sections || `<div class="challenges-empty"><p>${esc(tt('games.filter.none'))}</p></div>`}</div>`;
    el.querySelectorAll('.cg-play').forEach(b => b.addEventListener('click', () => openIntro(b.dataset.game)));
    const dueBtn = el.querySelector('#cg-due');
    if (dueBtn) dueBtn.addEventListener('click', () => startReview(dueEntries()));
    el.querySelectorAll('[data-cg-invite]').forEach(b => b.addEventListener('click', () => { if (onLocked) onLocked(null); }));
    el.querySelectorAll('[data-cg-filter]').forEach(b => b.addEventListener('click', () => {
      listFilter = b.dataset.cgFilter;
      renderList();
      const again = el.querySelector(`[data-cg-filter="${listFilter}"]`);
      if (again) again.focus();
    }));
    el.querySelectorAll('.challenges-level-heading').forEach(b => b.addEventListener('click', () => {
      const lv = b.dataset.level;
      if (listFilter !== 'all') return; // com filtro, tudo aberto (como nas Expressões)
      if (collapsedLevels.has(lv)) collapsedLevels.delete(lv); else collapsedLevels.add(lv);
      renderList();
      const again = el.querySelector(`.challenges-level-heading[data-level="${lv}"]`);
      if (again) again.focus();
    }));
  }

  function show(playing){
    $(ids.select).style.display = playing ? 'none' : 'block';
    $(ids.wrap).style.display = playing ? 'block' : 'none';
  }

  function start(gameId, onlyIds){
    const g = games.find(x => x.id === gameId);
    if (!g) return;
    // PAYWALL: ponto único que trava os Jogos. Hoje isLocked devolve false (flag desligada no app.js).
    if (isLocked && isLocked(g)){ if (onLocked) onLocked(g); return; }
    const pool = onlyIds ? g.items.filter(it => onlyIds.includes(it.id)) : g.items;
    const order = onlyIds ? shuffle(pool) : (roundSize() === 'full' ? shuffle(pool) : pickRound(g));
    const half = CONJ_GAMES_TYPED_HALF && !onlyIds ? Math.ceil(order.length / 2) : order.length;
    const stages = order.map((_, i) => (i < half ? 'choice' : 'type'));
    // Etapa 7 (aprovada em 2026-11-11): no fim, "Corrija o erro" com frases prontas do jogo (2 na Curta, 4 na Completa) e,
    // depois delas, as frases que a aluna errou na parte de ESCOLHA, preenchidas com a opção que ela marcou (ownPending:
    // entram quando a parte de escolha termina). Mesmo interruptor da metade escrita.
    const fixOn = CONJ_GAMES_TYPED_HALF && !onlyIds;
    if (fixOn && Array.isArray(g.fix) && g.fix.length){
      shuffle(g.fix).slice(0, roundSize() === 'full' ? 4 : 2).forEach(f => { order.push(fixItem(f)); stages.push('fix'); });
    }
    Object.assign(S, { game: g, order, gameAt: [], stages, mode: 'choice', idx: 0, hits: 0, log: [], answered: false, ownPending: fixOn });
    if (typeof trackEvent === 'function') trackEvent('lesson_start', 'conj_game', { game: g.id });
    show(true);
    renderQuestion();
    window.scrollTo(0, 0);
  }

  // "Revisar erros" (etapa 4, 2026-11-08): só as frases erradas, agora ESCREVENDO a forma (ideia do artifact de jogos).
  // entries = [{ g, it }], podem ser de jogos diferentes (a revisão de outros dias mistura). Jogo trancado fica de fora.
  function startReview(entries){
    const ok = (entries || []).filter(e => e && e.g && e.it && !(isLocked && isLocked(e.g)));
    if (!ok.length) return;
    const mixed = shuffle(ok);
    const one = mixed.every(e => e.g === mixed[0].g) ? mixed[0].g : null;
    Object.assign(S, { game: one, order: mixed.map(e => e.it), gameAt: mixed.map(e => e.g), stages: mixed.map(() => 'type'), mode: 'type', idx: 0, hits: 0, log: [], answered: false });
    if (typeof trackEvent === 'function') trackEvent('lesson_start', 'conj_game_review', { games: [...new Set(mixed.map(e => e.g.id))].join(','), n: mixed.length });
    show(true);
    renderQuestion();
    window.scrollTo(0, 0);
  }

  // Erros de OUTROS dias: frase cuja última resposta foi errada antes de hoje (a de hoje aparece no fim da partida).
  // Acertou na revisão: sai da lista; errou de novo: volta amanhã.
  function dueEntries(){
    const today = typeof todayStr === 'function' ? todayStr() : new Date().toISOString().slice(0, 10);
    const out = [];
    games.forEach(g => {
      if (isLocked && isLocked(g)) return;
      const r = conjGameRecord(g.id, false);
      if (!r) return;
      g.items.forEach(it => { const e = r.items[String(it.id)]; if (e && e.ok === false && e.at < today) out.push({ g, it }); });
    });
    return out;
  }

  // ---------- Partida Curta x Completa e frases ainda não vistas (etapa 5, 2026-11-08) ----------
  // Curta = perRound frases (10, como sempre); Completa = todas as frases do jogo. Escolha da aluna na tela do jogo, lembrada NESTE aparelho
  // (localStorage, conveniência; o progresso de verdade fica na conta). Padrão: Curta.
  // A partida Curta puxa primeiro as frases que a aluna ainda não respondeu, depois as que ela errou por último e só então
  // as que já acertou: em 2 ou 3 partidas ela passa por todas (regra do "Concluído").
  const ROUND_KEY = 'conj-games-round';
  function roundSize(){ try { return localStorage.getItem(ROUND_KEY) === 'full' ? 'full' : 'short'; } catch (e) { return 'short'; } }
  function setRoundSize(v){ try { localStorage.setItem(ROUND_KEY, v); } catch (e) {} }
  function pickRound(g){
    const r = conjGameRecord(g.id, false), seen = it => r && r.items[String(it.id)];
    const unseen = g.items.filter(it => !seen(it)), wrong = g.items.filter(it => seen(it) && !seen(it).ok), right = g.items.filter(it => seen(it) && seen(it).ok);
    return [].concat(shuffle(unseen), shuffle(wrong), shuffle(right)).slice(0, g.perRound);
  }
  // Tela do jogo (pedido da autora, 2026-11-08): antes da partida, título, apresentação, quanto a aluna já fez e a
  // escolha Curta x Completa (no lugar do botão que ficava em cima da 1ª frase). Jogo com perRound >= frases: um botão só.
  function openIntro(gameId){
    const g = games.find(x => x.id === gameId);
    if (!g) return;
    if (isLocked && isLocked(g)){ if (onLocked) onLocked(g); return; }
    Object.assign(S, { game: g, order: [], gameAt: [], stages: [], mode: 'intro', idx: 0, hits: 0, log: [], answered: false });
    show(true);
    const bar = grabBar();
    const st = conjGameStatus(g), cur = roundSize(), both = g.items.length > g.perRound;
    // Mapa das frases (crítica de design, 2026-11-10): um pedaço por frase do jogo, verde = última resposta certa,
    // vermelho = errada, vazio = ainda não vista. Mostra o progresso e a regra do "Concluído" (todas + 70%) de relance.
    const rec = conjGameRecord(g.id, false);
    const cells = g.items.map(it => { const e = rec && rec.items[String(it.id)]; return e ? (e.ok ? 'is-right' : 'is-wrong') : 'is-new'; });
    const mapLabel = tt('games.intro.mapAria', { seen: st.seen, total: st.total, right: st.right });
    const map = `<div class="cg-intro-map" role="img" aria-label="${esc(mapLabel)}" style="--n:${g.items.length}">${cells.map(c => `<span class="${c}"></span>`).join('')}</div>`;
    const status = st.done
      ? `<span class="expr-card-seal cg-intro-seal">${esc(tt('games.doneSeal', { pct: st.pct }))}</span>`
      : `<p class="cg-intro-rule">${esc(st.seen ? tt('games.intro.status', { seen: st.seen, total: st.total, pct: st.pct }) : tt('games.intro.fresh', { total: st.total }))} ${esc(tt('games.intro.rule', { pct: CONJ_GAME_DONE_PCT }))}</p>`;
    const opt = (size, n, sub, title) => `<button type="button" class="cg-intro-opt ${cur === size || !both ? 'is-current' : ''}" data-cg-start="${size}">
        <span class="cg-intro-opt-title">${esc(tt(title, { n }))}</span>
        ${sub ? `<span class="cg-intro-opt-sub">${esc(tt(sub))}</span>` : ''}
      </button>`;
    $(ids.content).innerHTML = `
      <div class="cg-head">
        <span class="cg-eyebrow">${esc(tt('games.tabGames'))}${g.level ? ` · ${esc(g.level)}` : ''}</span>
        <h2 class="cg-title">${rich(L(g.title))}</h2>
      </div>
      <div class="cg-intro">
        <div class="cg-intro-progress">${map}${status}</div>
        <p class="cg-intro-lede">${rich(L(g.lede))}</p>
        <div class="cg-intro-opts" role="group" aria-label="${esc(tt('games.intro.choose'))}">
          ${both ? opt('short', g.perRound, 'games.intro.shortSub', 'games.intro.playShort') + opt('full', g.items.length, 'games.intro.fullSub', 'games.intro.playFull') : opt('full', g.items.length, '', 'games.intro.playFull')}
        </div>
      </div>`;
    const btns = $(ids.content).querySelectorAll('[data-cg-start]');
    btns.forEach(b => b.addEventListener('click', () => { if (both) setRoundSize(b.dataset.cgStart); start(g.id); }));
    if (typeof wireKeyboardOptions === 'function' && btns.length > 1) wireKeyboardOptions(btns, { mode: 'sequential' });
    mountBar(bar, '.cg-head');
    setProgress(0);
    window.scrollTo(0, 0);
    const def = $(ids.content).querySelector('.cg-intro-opt.is-current') || btns[0];
    setTimeout(() => { if (def && S.mode === 'intro') def.focus(); }, 0);
  }

  const item = () => S.order[S.idx];
  const gOf = () => S.gameAt[S.idx] || S.game;
  // Dica entre parênteses (cartão da lista e revisão escrita): as duas opções do jogo, ou o verbo (sampleHint: 'verb').
  const optsHint = g => `${g.opts.a.label.toLowerCase()} ou ${g.opts.b.label.toLowerCase()}`;
  // Frase do "Corrija o erro": a forma certa fica em fixForm (ans aponta para ela) e a regra mostrada é a da opção `kind`.
  const fixItem = f => ({ id: 'fix-' + f.id, before: f.before, after: f.after, ans: 'fixForm', fixForm: f.fix, wrongForm: f.wrong, optKey: f.kind, clue: f.clue, text: f.text, isFix: true });
  // Frases que a aluna errou nesta partida, de volta no "Corrija o erro" (ideia da autora, 2026-11-11): da ESCOLHA com a
  // opção que ela marcou, da parte ESCRITA com o que ela digitou, e "Não sei" com a lacuna vazia. Entram no fim, quando
  // cada parte termina (stage = 'choice' ou 'type').
  function appendOwnErrors(stage){
    S.log.filter(x => x.stage === stage && !x.ok).forEach(x => {
      const wrongForm = x.given == null ? null : (x.typed ? x.given : x.it[x.given]);
      S.order.push(Object.assign({}, x.it, { wrongForm, isFix: true, own: true }));
      S.stages.push('fix');
    });
  }

  // Frase com a lacuna; depois de responder, a forma certa entra na lacuna e a pista fica marcada.
  function sentenceHTML(it, filled){
    const mark = s => {
      if (!filled || !it.clue) return esc(s);
      const i = s.indexOf(it.clue);
      return i < 0 ? esc(s) : esc(s.slice(0, i)) + `<mark class="cg-clue">${esc(it.clue)}</mark>` + esc(s.slice(i + it.clue.length));
    };
    const gap = filled ? `<span class="cg-fill">${esc(it[it.ans])}</span>` : '<span class="cg-blank" aria-label="___">&nbsp;</span>';
    // Espaço antes de ? ! : ; (tipografia francesa) vira inseparável: o sinal não cai sozinho na linha de baixo.
    return `<p class="cg-sentence" lang="${lang}">${mark(it.before)}${gap}${mark(it.after)}</p>`.replace(/ ([?!:;])/g, '\u00a0$1');
  }

  // "Corrija o erro": a frase inteira com a forma errada no lugar (sem marcar qual é: achar o erro faz parte).
  function wrongSentenceHTML(it){
    if (it.wrongForm == null) return sentenceHTML(it, false); // "Não sei": volta com a lacuna
    return `<p class="cg-sentence" lang="${lang}">${esc(it.before)}${esc(it.wrongForm)}${esc(it.after)}</p>`.replace(/ ([?!:;])/g, '\u00a0$1');
  }

  function progressHTML(){
    return `<div class="cg-progress"><span>${esc(tt('games.counter', { i: S.idx + 1, n: S.order.length }))}</span></div>`;
  }

  // A barra do topo (criada por activity-focus.js) mora no conteúdo, logo abaixo do cabeçalho: pega antes de reescrever e recoloca depois.
  const grabBar = () => (window.activityBarGrab ? window.activityBarGrab(ids.wrap) : null);
  const mountBar = (bar, afterSel) => { if (window.activityBarMount) window.activityBarMount(ids.wrap, bar, afterSel); };
  const setProgress = pct => { if (window.activityBarProgress) window.activityBarProgress(ids.wrap, pct); };

  function renderQuestion(){
    // etapa da frase: escolha ou escrever (a revisão de erros é toda escrita)
    if (S.mode === 'type' || S.stages[S.idx] === 'type' || S.stages[S.idx] === 'fix') return renderTypeQuestion();
    const it = item(), g = gOf();
    S.answered = false;
    const bar = grabBar();
    // Mesmo visual da lição (2026-10-20, pedido da autora): cabeçalho discreto, frase centralizada num painel
    // bege; depois da resposta, o 🔊 fica colado na frase e a tradução logo abaixo (como o "Na frase" da lição).
    $(ids.content).innerHTML = `
      <div class="cg-head">
        <span class="cg-eyebrow">${esc(tt('games.tabGames'))}${g.level ? ` · ${esc(g.level)}` : ''}</span>
        <h2 class="cg-title">${rich(L(g.title))}</h2>
      </div>
      ${progressHTML()}
      <div class="cg-stage">
        <div class="cg-panel">
          ${it.verb ? `<span class="cg-verb" lang="${lang}">(${esc(it.verb)})</span>` : ''}
          <div class="cg-sentence-row">${sentenceHTML(it, false)}</div>
          <p class="cg-tr" hidden></p>
        </div>
        <div class="cg-choices">
          ${['a', 'b'].map((k, i) => `<button type="button" class="cg-choice" data-k="${k}" aria-keyshortcuts="${i + 1}">
            <span class="cg-choice-form" lang="${lang}">${esc(it[k])}</span><span class="cg-choice-label">${esc(g.opts[k].label)}</span></button>`).join('')}
        </div>
        <button type="button" class="exercise-dontknow cg-dontknow" id="cg-dontknow">${esc(tt('common.dontKnow'))}</button>
        <div class="cg-feedback" id="cg-feedback" aria-live="polite"></div>
      </div>`;
    const choices = $(ids.content).querySelectorAll('.cg-choice');
    choices.forEach(b => b.addEventListener('click', () => answer(b.dataset.k)));
    $('cg-dontknow').addEventListener('click', () => answer(null));
    // Número 1/2 em cada resposta; as teclas valem pelo teclado global do app (respeita janela aberta).
    if (typeof wireKeyboardOptions === 'function') wireKeyboardOptions(choices, { mode: 'sequential' });
    mountBar(bar, '.cg-head');
    setProgress(Math.round(100 * S.idx / S.order.length));
  }

  // Revisão escrita: mesma frase e mesmo painel; no lugar das opções, campo + teclado de acentos + Corrigir.
  // Dica: o verbo (se a frase tem) e as duas opções do jogo, para saber o que escrever (ex.: "(aller · tu ou vous)").
  function renderTypeQuestion(){
    const it = item(), g = gOf();
    S.answered = false;
    if (typeof clearKeyboardOptions === 'function') clearKeyboardOptions(); // números viram letras no campo, não atalhos
    const bar = grabBar();
    const expected = it[it.ans];
    const keys = typeof frAccentPickerHTML === 'function' ? frAccentPickerHTML(expected) : '';
    $(ids.content).innerHTML = `
      <div class="cg-head">
        <span class="cg-eyebrow">${esc(tt(S.mode === 'type' ? 'games.review.eyebrow' : 'games.tabGames'))}${g.level ? ` · ${esc(g.level)}` : ''}</span>
        <h2 class="cg-title">${rich(L(g.title))}</h2>
      </div>
      ${progressHTML()}
      ${S.mode !== 'type' && S.stages.indexOf('type') === S.idx ? `<p class="cg-stage-intro">${esc(tt('games.type.intro'))}</p>` : ''}
      ${S.mode !== 'type' && it.isFix && !it.own && S.order.findIndex(x => x.isFix && !x.own) === S.idx ? `<p class="cg-stage-intro">${esc(tt('games.fix.intro'))}</p>` : ''}
      ${S.mode !== 'type' && it.own && S.order.findIndex(x => x.own) === S.idx ? `<p class="cg-stage-intro">${esc(tt('games.fix.ownIntro'))}</p>` : ''}
      <div class="cg-stage">
        <div class="cg-panel">
          <span class="cg-verb" lang="${lang}">(${it.verb ? esc(it.verb) + ' · ' : ''}${esc(optsHint(g))})</span>
          <div class="cg-sentence-row">${it.isFix ? wrongSentenceHTML(it) : sentenceHTML(it, false)}</div>
          <p class="cg-tr" hidden></p>
        </div>
        <div class="cg-type">
          <label class="cg-type-label" for="cg-input">${esc(tt(it.isFix ? 'games.fix.label' : 'games.type.label'))}</label>
          <input id="cg-input" class="cg-input" type="text" lang="${lang}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="${esc(tt('games.type.placeholder'))}">
          ${keys ? `<div class="conj-accents cg-accents">${keys}</div>` : ''}
          <button type="button" class="btn btn-primary cg-check" id="cg-check" disabled>${esc(tt('games.type.check'))}</button>
        </div>
        <button type="button" class="exercise-dontknow cg-dontknow" id="cg-dontknow">${esc(tt('common.dontKnow'))}</button>
        <div class="cg-feedback" id="cg-feedback" aria-live="polite"></div>
      </div>`;
    const inp = $('cg-input'), btn = $('cg-check');
    inp.addEventListener('input', () => { btn.disabled = !inp.value.trim(); });
    // Enter dentro do campo pertence ao campo: corrige (não aciona o "Continuar" global).
    inp.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      e.preventDefault(); e.stopPropagation();
      if (!S.answered && inp.value.trim()) answerTyped(false);
    });
    btn.addEventListener('click', () => answerTyped(false));
    $('cg-dontknow').addEventListener('click', () => answerTyped(true));
    $(ids.content).querySelectorAll('.cg-accents .fr-accent-key').forEach(k => {
      k.addEventListener('mousedown', e => e.preventDefault());
      k.addEventListener('click', () => {
        if (S.answered) return;
        if (typeof insertAccentAtCursor === 'function') insertAccentAtCursor(inp, k.textContent);
        else { inp.value += k.textContent; inp.focus(); }
        btn.disabled = !inp.value.trim();
      });
    });
    mountBar(bar, '.cg-head');
    setProgress(Math.round(100 * S.idx / S.order.length));
    setTimeout(() => { if (!S.answered) inp.focus(); }, 0);
  }

  // Correção da revisão escrita: a mesma da Revisão de cartões (certo / "quase" = só acento ou uma letra / errou).
  // "Quase" conta como acerto (a forma está lá), com a resposta certa e o desenho letra a letra do erro.
  function answerTyped(revealed){
    if (S.answered) return;
    const it = item(), inp = $('cg-input'), typed = revealed ? '' : (inp ? inp.value : '');
    const expected = it[it.ans];
    const norm = v => String(v || '').normalize('NFC').replace(/[’]/g, "'").trim().replace(/\s+/g, ' ').toLowerCase();
    const verdict = revealed ? 'errou' : (typeof typedAnswerVerdictForExpected === 'function'
      ? typedAnswerVerdictForExpected(typed, expected) : (norm(typed) === norm(expected) ? 'ok' : 'errou'));
    answer(verdict === 'errou' ? (revealed ? null : '__typed') : it.ans, { typed, verdict, revealed });
  }

  function answer(k, typedInfo){
    if (S.answered) return;
    const it = item(), g = gOf(), ok = k === it.ans, revealed = k == null;
    S.answered = true;
    if (ok) S.hits++;
    S.log.push({ it, ok, given: typedInfo ? (typedInfo.revealed ? null : typedInfo.typed) : k, g, typed: !!typedInfo, stage: S.mode === 'type' ? 'review' : (S.stages[S.idx] || 'choice') });
    // frase pronta do "Corrija o erro" não é frase do jogo: não entra no progresso (concluído, % e erros de outros dias)
    if (!(it.isFix && !it.own)) recordConjGameAnswer(g.id, it.id, ok);
    S.dirty = true;
    const dk = $('cg-dontknow');
    if (dk) dk.classList.add('disabled');
    // Som de acerto/erro como na trilha; "Não sei" é silencioso (a resposta é só revelada).
    if (!revealed && typeof playFeedbackSound === 'function') playFeedbackSound(ok);
    if (typedInfo){
      const inp = $('cg-input'), chk = $('cg-check');
      if (inp){ inp.disabled = true; inp.classList.add(ok ? 'is-right' : 'is-wrong'); }
      // style.display: o display do .btn e do teclado venceria o atributo hidden
      if (chk) chk.style.display = 'none';
      $(ids.content).querySelectorAll('.cg-accents').forEach(a => { a.style.display = 'none'; });
    }
    $(ids.content).querySelectorAll('.cg-choice').forEach(b => {
      b.disabled = true;
      b.classList.add(b.dataset.k === it.ans ? 'is-right' : (b.dataset.k === k ? 'is-wrong' : 'is-dim'));
    });
    const opt = g.opts[it.optKey || it.ans], txt = L(it.text) || {};
    const full = it.before + it[it.ans] + it.after;
    // A frase preenchida (com a pista) fica no quadro de cima; a frase com a tradução e o 🔊 vão para o painel de resposta
    // (painel único do site, shared/core/painel-resposta.js), como na maquete da lição curta.
    $(ids.content).querySelector('.cg-sentence-row').innerHTML = sentenceHTML(it, true);
    const last = S.idx + 1 >= S.order.length;
    const fb = $('cg-feedback');
    const tidyFr = v => String(v).replace(/ ([?!:;])/g, '\u00a0$1');
    // Painel de resposta ÚNICO do site (decisão da autora, 2026-11-11; shared/core/painel-resposta.js): título "Isso mesmo!" /
    // "Quase lá!", a frase certa com a tradução e o 🔊, e a Prof. Brune com a regra (e o desenho, quando há) e a explicação.
    // "Quase" (acento ou uma letra) conta como acerto: painel verde com o desenho letra a letra do que ela escreveu.
    const almost = !!(typedInfo && typedInfo.verdict === 'quase');
    const estado = revealed ? 'revelada' : (almost ? 'quase' : (ok ? 'certo' : 'erro'));
    const regra = `<figure class="cg-timeline${SKETCH[opt.sketch] ? '' : ' cg-rule'}">${SKETCH[opt.sketch] ? `<svg viewBox="0 0 134 44" role="img" aria-label="${esc(plain(L(opt.tl)))}">${SKETCH[opt.sketch]}</svg>` : ''}<figcaption>${rich(L(opt.tl))}</figcaption></figure>`;
    const extra = almost && typeof typedAttemptHTML === 'function'
      ? `<div class="cg-pr-sua"><span class="cg-pr-sua-rot">${esc(tt('games.fb.youWrote'))}</span>${typedAttemptHTML(typedInfo.typed, it[it.ans])}</div>` : '';
    fb.innerHTML = painelRespostaHTML({ estado, frase: tidyFr(full), traducao: txt.tr || '', lang, ouvir: true, extra, regra,
      explicacao: rich(txt.why || ''), continuar: tt(last ? 'common.seeResultArrow' : 'common.continueArrow'), idContinuar: 'cg-next' });
    const ouvir = fb.querySelector('[data-pr-ouvir]');
    if (ouvir) ouvir.addEventListener('click', e => { if (speak) speak(full, e.currentTarget); });
    S.shownAt = performance.now();
    $('cg-next').addEventListener('click', next);
    setTimeout(() => { const n = $('cg-next'); if (n) n.focus(); }, 0);
  }

  function next(){
    // O mesmo toque/Enter que respondeu não pode também apertar "Próxima frase".
    if (performance.now() - S.shownAt < 350) return;
    S.idx++;
    const prev = S.stages[S.idx - 1];
    if (S.ownPending && (prev === 'choice' || prev === 'type') && S.stages[S.idx] !== prev) appendOwnErrors(prev);
    if (S.idx >= S.order.length) renderResult();
    else renderQuestion();
  }

  function renderResult(){
    const review = S.mode === 'type', g = S.game, n = S.order.length, miss = S.log.filter(x => !x.ok);
    if (typeof clearKeyboardOptions === 'function') clearKeyboardOptions();
    const bar = grabBar();
    // Sem XP (prática livre), mas o dia conta para a sequência, como a trilha (decisão da autora, 2026-10-26).
    // A revisão de erros não conta como partida (rounds), só grava as respostas.
    if (!review) finishConjGameRound(g.id);
    if (typeof registerStudyToday === 'function') registerStudyToday();
    S.dirty = false;
    if (typeof saveState === 'function') saveState(); // grava o dia e o progresso do jogo (STATE.conjGames)
    if (typeof registerStudyToday === 'function'){
      if (typeof renderTopbarStats === 'function') renderTopbarStats();
      if (typeof maybeShowStreakCelebration === 'function') maybeShowStreakCelebration();
    }
    if (typeof trackEvent === 'function') trackEvent('lesson_complete', review ? 'conj_game_review' : 'conj_game', { game: g ? g.id : 'mix', hits: S.hits, total: n, scorePct: n ? Math.round(100 * S.hits / n) : 0 });
    // Erros com o que a aluna respondeu (riscado) e a frase certa com a pista, como a lista da Revisão.
    const givenHTML = x => {
      if (x.given == null) return `<span class="cg-review-given">${esc(tt('games.youAnswered'))} ${esc(tt('common.dontKnow'))}</span>`;
      const v = x.typed ? x.given : x.it[x.given];
      return `<span class="cg-review-given">${esc(tt('games.youAnswered'))} <s lang="${lang}">${esc(v || '')}</s></span>`;
    };
    $(ids.content).innerHTML = `
      <div class="cg-result">
        <h2 class="cg-title">${esc(tt(review ? 'games.review.doneTitle' : 'games.resultTitle'))}</h2>
        <p class="cg-score"><b>${S.hits}</b> / ${n}</p>
        ${miss.length ? `<div class="cg-review"><h3>${esc(tt('games.reviewTitle', { n: miss.length }))}</h3><ul>
          ${miss.map(x => `<li>${sentenceHTML(x.it, true)}${givenHTML(x)}<span class="cg-review-tr">${esc((L(x.it.text) || {}).tr || '')}</span></li>`).join('')}
        </ul></div>` : `<p class="cg-perfect">${esc(tt('games.perfect'))}</p>`}
        <div class="cg-result-actions">
          ${miss.length ? `<button type="button" class="btn btn-primary" id="cg-mistakes">${esc(tt('games.review.btn'))}</button>` : ''}
          ${review ? '' : `<button type="button" class="btn ${miss.length ? 'btn-secondary' : 'btn-primary'}" id="cg-again">${esc(tt('games.again'))}</button>`}
          <button type="button" class="btn ${review && !miss.length ? 'btn-primary' : 'btn-secondary'}" id="cg-to-list">${esc(tt('games.backToGames'))}</button>
        </div>
      </div>`;
    mountBar(bar, null);
    setProgress(100);
    if (miss.length){
      const entries = miss.map(x => ({ g: x.g, it: x.it }));
      $('cg-mistakes').addEventListener('click', () => startReview(entries));
    }
    if (!review) $('cg-again').addEventListener('click', () => start(g.id));
    $('cg-to-list').addEventListener('click', exit);
  }

  function exit(){
    if (typeof clearKeyboardOptions === 'function') clearKeyboardOptions();
    // Saiu no meio da partida: as respostas já dadas ficam salvas (a partida não conta como terminada).
    if (S.dirty){ S.dirty = false; if (typeof saveState === 'function') saveState(); }
    show(false); renderList();
  }

  // As teclas 1/2 vêm do teclado global (wireKeyboardOptions); Enter segue pelo foco no botão "Continuar".
  const back = $(ids.back);
  if (back) back.addEventListener('click', exit);
  window.addEventListener('i18n:change', () => { if ($(ids.wrap) && $(ids.wrap).style.display === 'none') renderList(); });

  return { renderList, openIntro, start, startReview, dueEntries, exit, state: S };
}

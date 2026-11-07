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

function createConjGames({ games, speak, ids, isLocked, onLocked, lang = 'fr' }){
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

  const S = { game: null, order: [], idx: 0, hits: 0, log: [], answered: false, shownAt: 0, dirty: false };

  // Selo (regra 7 da dona, 2026-10-22): recurso Premium com o bloqueio DESLIGADO mostra só "⭐ Premium" e abre para
  // todos; com o bloqueio LIGADO, quem não tem a permissão vê "⭐ Premium" + cadeado e, ao tocar, o aviso Premium.
  function premiumSealHTML(g){
    const locked = !!(isLocked && isLocked(g));
    return `<span class="cg-premium" data-cg-seal="${locked ? 'locked' : 'open'}">⭐ ${esc(tt('games.premium'))}${locked
      ? ` <span class="cg-lock" role="img" aria-label="${esc(tt('games.locked'))}">🔒</span>` : ''}</span>`;
  }

  // ---------- Lista (etapa 2 da reformulação, 2026-11-06, docs/jogos-reformulacao-plano.md) ----------
  // No padrão da lista de Expressões (peças de shared/desafios.css): painel "X de Y jogos concluídos" + barra + acertos,
  // grupos por nível recolhíveis com anel, cartão de álbum (pendente tracejado; concluído com selo "✓ Concluído · N%").
  // Cartão: título, frase de exemplo com a lacuna e as duas opções, apresentação (2 linhas), tema e selo Premium.
  const collapsedLevels = new Set();
  const plural = (base, n, p) => tt(base + (n === 1 ? '.one' : '.other'), p);
  const tidy = h => h.replace(/ ([?!:;])/g, '\u00a0$1'); // tipografia francesa: o sinal não cai sozinho na linha de baixo

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

  function sampleHTML(g){
    const it = g.items.find(x => x.id === g.sample) || g.items[0];
    if (!it) return '';
    return `<span class="cg-card-sample" lang="${lang}">${tidy(`${esc(it.before)}<span class="cg-card-blank" aria-hidden="true"></span>${esc(it.after)}`)}</span>
      <span class="cg-card-opts" lang="${lang}">${esc(it.a)} / ${esc(it.b)}</span>`;
  }

  function cardHTML(g){
    const st = conjGameStatus(g);
    const theme = L(g.theme);
    return `<div class="cg-card-wrap">
      <button type="button" class="challenge-card expr-card cg-game-card cg-play ${st.done ? 'completed' : ''}" data-game="${esc(g.id)}" data-done="${st.done ? 1 : 0}">
        ${st.done ? `<span class="expr-card-seal">${esc(tt('games.doneSeal', { pct: st.pct }))}</span>` : ''}
        <span class="challenge-card-expr">${rich(L(g.title))}</span>
        ${sampleHTML(g)}
        <span class="cg-card-lede">${rich(L(g.lede))}</span>
        <span class="expr-card-foot">${theme ? `<span class="expr-reg expr-reg-neutral">${esc(theme)}</span>` : ''}${g.free ? '' : premiumSealHTML(g)}</span>
      </button>
    </div>`;
  }

  function levelSectionHTML(level){
    const list = games.filter(g => (g.level || '') === level);
    const done = list.filter(g => conjGameStatus(g).done).length;
    const pct = list.length ? Math.round(100 * done / list.length) : 0;
    const collapsed = collapsedLevels.has(level);
    return `<div class="challenges-level-section" data-level="${esc(level)}">
      <button type="button" class="challenges-level-heading" data-level="${esc(level)}" aria-expanded="${!collapsed}">
        <span class="challenges-level-chevron ${collapsed ? 'collapsed' : ''}" aria-hidden="true">▾</span>
        <span class="challenges-level-ring" style="--p:${pct}" data-complete="${pct === 100 ? 1 : 0}" role="img" aria-label="${esc(tt('games.ring.aria', { done, total: list.length }))}">${done}/${list.length}</span>
        ${esc(level ? tt('games.levelName', { level }) : tt('games.tabGames'))}
        <span class="challenges-level-count">${list.length}</span>
      </button>
      <div class="challenges-cards cg-cards" ${collapsed ? 'hidden' : ''}>${list.map(cardHTML).join('')}</div>
    </div>`;
  }

  function renderList(){
    const el = $(ids.list);
    if (!el) return;
    const levels = [...new Set(games.map(g => g.level || ''))];
    el.innerHTML = summaryHTML() + `<div class="challenges-level-sections cg-level-sections">${levels.map(levelSectionHTML).join('')}</div>`;
    el.querySelectorAll('.cg-play').forEach(b => b.addEventListener('click', () => start(b.dataset.game)));
    el.querySelectorAll('.challenges-level-heading').forEach(b => b.addEventListener('click', () => {
      const lv = b.dataset.level;
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
    Object.assign(S, { game: g, order: onlyIds ? shuffle(pool) : shuffle(pool).slice(0, g.perRound), idx: 0, hits: 0, log: [], answered: false });
    if (typeof trackEvent === 'function') trackEvent('lesson_start', 'conj_game', { game: g.id });
    show(true);
    renderQuestion();
    window.scrollTo(0, 0);
  }

  const item = () => S.order[S.idx];

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

  function progressHTML(){
    return `<div class="cg-progress"><span>${esc(tt('games.counter', { i: S.idx + 1, n: S.order.length }))}</span></div>`;
  }

  // A barra do topo (criada por activity-focus.js) mora no conteúdo, logo abaixo do cabeçalho: pega antes de reescrever e recoloca depois.
  const grabBar = () => (window.activityBarGrab ? window.activityBarGrab(ids.wrap) : null);
  const mountBar = (bar, afterSel) => { if (window.activityBarMount) window.activityBarMount(ids.wrap, bar, afterSel); };
  const setProgress = pct => { if (window.activityBarProgress) window.activityBarProgress(ids.wrap, pct); };

  function renderQuestion(){
    const it = item(), g = S.game;
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

  function answer(k){
    if (S.answered) return;
    const it = item(), g = S.game, ok = k === it.ans, revealed = k == null;
    S.answered = true;
    if (ok) S.hits++;
    S.log.push({ it, ok, given: k });
    recordConjGameAnswer(g.id, it.id, ok);
    S.dirty = true;
    const dk = $('cg-dontknow');
    if (dk) dk.classList.add('disabled');
    // Som de acerto/erro como na trilha; "Não sei" é silencioso (a resposta é só revelada).
    if (!revealed && typeof playFeedbackSound === 'function') playFeedbackSound(ok);
    $(ids.content).querySelectorAll('.cg-choice').forEach(b => {
      b.disabled = true;
      b.classList.add(b.dataset.k === it.ans ? 'is-right' : (b.dataset.k === k ? 'is-wrong' : 'is-dim'));
    });
    const opt = g.opts[it.ans], txt = L(it.text) || {};
    const full = it.before + it[it.ans] + it.after;
    const row = $(ids.content).querySelector('.cg-sentence-row');
    row.innerHTML = sentenceHTML(it, true)
      + `<button type="button" class="audio-btn cg-listen" aria-label="${esc(tt('games.listen'))}" title="${esc(tt('games.listen'))}">🔊</button>`;
    row.querySelector('.cg-listen').addEventListener('click', e => { if (speak) speak(full, e.currentTarget); });
    const tr = $(ids.content).querySelector('.cg-tr');
    tr.textContent = txt.tr || '';
    tr.hidden = !txt.tr;
    const last = S.idx + 1 >= S.order.length;
    const fb = $('cg-feedback');
    fb.innerHTML = `
      <p class="cg-verdict ${ok ? 'ok' : 'no'}">${esc(tt(ok ? 'games.right' : (revealed ? 'feedback.header.revealed' : 'games.wrong')))}${ok ? '' : ` <span>${esc(tt('games.answerWas', { form: it[it.ans] }))}</span>`}</p>
      <div class="cg-why">
        <figure class="cg-timeline${SKETCH[opt.sketch] ? '' : ' cg-rule'}">${SKETCH[opt.sketch] ? `<svg viewBox="0 0 134 44" role="img" aria-label="${esc(plain(L(opt.tl)))}">${SKETCH[opt.sketch]}</svg>` : ''}<figcaption>${rich(L(opt.tl))}</figcaption></figure>
        <div><h3>${rich(tt('games.whyTense', { tense: '{' + opt.label + '}' }))}</h3><p>${rich(txt.why || '')}</p></div>
      </div>
      <button type="button" class="btn btn-primary cg-next" id="cg-next">${esc(tt(last ? 'common.seeResultArrow' : 'common.continueArrow'))}</button>`;
    S.shownAt = performance.now();
    $('cg-next').addEventListener('click', next);
    setTimeout(() => { const n = $('cg-next'); if (n) n.focus(); }, 0);
  }

  function next(){
    // O mesmo toque/Enter que respondeu não pode também apertar "Próxima frase".
    if (performance.now() - S.shownAt < 350) return;
    S.idx++;
    if (S.idx >= S.order.length) renderResult();
    else renderQuestion();
  }

  function renderResult(){
    const g = S.game, n = S.order.length, miss = S.log.filter(x => !x.ok);
    if (typeof clearKeyboardOptions === 'function') clearKeyboardOptions();
    const bar = grabBar();
    // Sem XP (prática livre), mas o dia conta para a sequência, como a trilha (decisão da autora, 2026-10-26).
    finishConjGameRound(g.id);
    if (typeof registerStudyToday === 'function') registerStudyToday();
    S.dirty = false;
    if (typeof saveState === 'function') saveState(); // grava o dia e o progresso do jogo (STATE.conjGames)
    if (typeof registerStudyToday === 'function'){
      if (typeof renderTopbarStats === 'function') renderTopbarStats();
      if (typeof maybeShowStreakCelebration === 'function') maybeShowStreakCelebration();
    }
    if (typeof trackEvent === 'function') trackEvent('lesson_complete', 'conj_game', { game: g.id, hits: S.hits, total: n, scorePct: n ? Math.round(100 * S.hits / n) : 0 });
    $(ids.content).innerHTML = `
      <div class="cg-result">
        <h2 class="cg-title">${esc(tt('games.resultTitle'))}</h2>
        <p class="cg-score"><b>${S.hits}</b> / ${n}</p>
        ${miss.length ? `<div class="cg-review"><h3>${esc(tt('games.reviewTitle', { n: miss.length }))}</h3><ul>
          ${miss.map(x => `<li>${sentenceHTML(x.it, true)}<span class="cg-review-tr">${esc((L(x.it.text) || {}).tr || '')}</span></li>`).join('')}
        </ul></div>` : `<p class="cg-perfect">${esc(tt('games.perfect'))}</p>`}
        <div class="cg-result-actions">
          ${miss.length ? `<button type="button" class="btn btn-primary" id="cg-mistakes">${esc(tt('games.practiceMistakes'))}</button>` : ''}
          <button type="button" class="btn ${miss.length ? 'btn-secondary' : 'btn-primary'}" id="cg-again">${esc(tt('games.again'))}</button>
          <button type="button" class="btn btn-secondary" id="cg-to-list">${esc(tt('games.backToGames'))}</button>
        </div>
      </div>`;
    mountBar(bar, null);
    setProgress(100);
    const ids0 = miss.map(x => x.it.id);
    if (miss.length) $('cg-mistakes').addEventListener('click', () => start(g.id, ids0));
    $('cg-again').addEventListener('click', () => start(g.id));
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

  return { renderList, start, exit, state: S };
}

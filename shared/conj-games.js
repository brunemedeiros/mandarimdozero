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
function createConjGames({ games, speak, ids, isLocked, onLocked }){
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
  const rich = s => esc(s).replace(/\{([^{}]+)\}/g, '<span class="cg-fr" lang="fr">$1</span>');
  const plain = s => String(s == null ? '' : s).replace(/[{}]/g, '');
  const shuffle = a => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };

  const AXIS = '<line x1="4" y1="26" x2="122" y2="26" stroke="currentColor" stroke-width="2" opacity=".45"/><path d="M122 21 L130 26 L122 31 Z" fill="currentColor" opacity=".45"/>';
  const SKETCH = {
    point: AXIS + '<circle cx="64" cy="26" r="8" fill="var(--imperial-gold)" stroke="currentColor" stroke-width="2"/>',
    line: AXIS + '<rect x="18" y="19" width="92" height="14" rx="7" fill="var(--seal-red)" opacity=".85"/><path d="M24 26 h80" stroke="currentColor" stroke-width="2" stroke-dasharray="4 5"/>'
  };

  const S = { game: null, order: [], idx: 0, hits: 0, log: [], answered: false, shownAt: 0 };

  // Selo (regra 7 da dona, 2026-10-22): recurso Premium com o bloqueio DESLIGADO mostra só "⭐ Premium" e abre para
  // todos; com o bloqueio LIGADO, quem não tem a permissão vê "⭐ Premium" + cadeado e, ao tocar, o aviso Premium.
  function premiumSealHTML(g){
    const locked = !!(isLocked && isLocked(g));
    return `<span class="cg-premium" data-cg-seal="${locked ? 'locked' : 'open'}">⭐ ${esc(tt('games.premium'))}${locked
      ? ` <span class="cg-lock" role="img" aria-label="${esc(tt('games.locked'))}">🔒</span>` : ''}</span>`;
  }

  function renderList(){
    const el = $(ids.list);
    if (!el) return;
    el.innerHTML = games.map(g => `
      <article class="cg-card">
        <h3 class="cg-card-title">${g.level ? `<span class="cg-level">${esc(g.level)}</span>` : ''}${rich(L(g.title))}</h3>
        <p class="cg-card-lede">${rich(L(g.lede))}</p>
        <div class="cg-card-foot">
          <span class="cg-card-meta">${premiumSealHTML(g)}${esc(tt('games.perRound', { n: Math.min(g.perRound, g.items.length) }))}</span>
          <button type="button" class="btn btn-primary cg-play" data-game="${esc(g.id)}">${esc(tt('games.play'))}</button>
        </div>
      </article>`).join('');
    el.querySelectorAll('.cg-play').forEach(b => b.addEventListener('click', () => start(b.dataset.game)));
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
    return `<p class="cg-sentence" lang="fr">${mark(it.before)}${gap}${mark(it.after)}</p>`.replace(/ ([?!:;])/g, '\u00a0$1');
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
          ${it.verb ? `<span class="cg-verb" lang="fr">(${esc(it.verb)})</span>` : ''}
          <div class="cg-sentence-row">${sentenceHTML(it, false)}</div>
          <p class="cg-tr" hidden></p>
        </div>
        <div class="cg-choices">
          ${['a', 'b'].map((k, i) => `<button type="button" class="cg-choice" data-k="${k}" aria-keyshortcuts="${i + 1}">
            <span class="cg-choice-form" lang="fr">${esc(it[k])}</span><span class="cg-choice-label">${esc(g.opts[k].label)}</span></button>`).join('')}
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
    if (typeof registerStudyToday === 'function'){
      registerStudyToday();
      if (typeof saveState === 'function') saveState();
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
    show(false); renderList();
  }

  // As teclas 1/2 vêm do teclado global (wireKeyboardOptions); Enter segue pelo foco no botão "Continuar".
  const back = $(ids.back);
  if (back) back.addEventListener('click', exit);
  window.addEventListener('i18n:change', () => { if ($(ids.wrap) && $(ids.wrap).style.display === 'none') renderList(); });

  return { renderList, start, exit, state: S };
}

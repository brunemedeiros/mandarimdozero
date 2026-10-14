// ---------- Jogos da Conjugação (motor comum a qualquer idioma estudado) ----------
// Jogo de escolha entre duas formas (ex.: passé composé x imparfait), no formato do
// "Jogo de Conjugações" da autora: frase com lacuna, duas opções, e depois da resposta
// a explicação com o desenho da linha do tempo, a pista destacada, a tradução e o áudio.
// Os dados ficam por idioma (fr/conj-games.js -> CONJ_GAMES); o texto de cada item vem
// por idioma do site (text['pt-BR'], text.en). Sem XP: é prática livre, como a Conjugação.
function createConjGames({ games, speak, ids, isLocked, onLocked }){
  // isLocked(game): paywall (Jogos são Premium); onLocked(game): o que fazer ao tocar num jogo trancado.
  const $ = id => document.getElementById(id);
  const esc = s => (typeof escapeHTML === 'function' ? escapeHTML(String(s == null ? '' : s))
    : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const tt = (k, p) => (typeof t === 'function' ? t(k, p) : k);
  const uiLang = () => (typeof getUiLang === 'function' && getUiLang()) || 'pt-BR';
  // Texto no idioma do site; português só como último recurso (o curso em inglês não deve mostrá-lo).
  const L = o => (o && typeof o === 'object') ? (o[uiLang()] || o.en || o['pt-BR'] || '') : (o || '');
  const shuffle = a => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };

  const AXIS = '<line x1="4" y1="26" x2="122" y2="26" stroke="currentColor" stroke-width="2" opacity=".45"/><path d="M122 21 L130 26 L122 31 Z" fill="currentColor" opacity=".45"/>';
  const SKETCH = {
    point: AXIS + '<circle cx="64" cy="26" r="8" fill="var(--imperial-gold)" stroke="currentColor" stroke-width="2"/>',
    line: AXIS + '<rect x="18" y="19" width="92" height="14" rx="7" fill="var(--seal-red)" opacity=".85"/><path d="M24 26 h80" stroke="currentColor" stroke-width="2" stroke-dasharray="4 5"/>'
  };

  const S = { game: null, order: [], idx: 0, hits: 0, log: [], answered: false, shownAt: 0 };

  function renderList(){
    const el = $(ids.list);
    if (!el) return;
    el.innerHTML = games.map(g => `
      <article class="cg-card">
        <h3 class="cg-card-title">${esc(L(g.title))}</h3>
        <p class="cg-card-lede">${esc(L(g.lede))}</p>
        <div class="cg-card-foot">
          <span class="cg-card-meta"><span class="cg-premium" title="${esc(tt('games.premium'))}">🔒 ${esc(tt('games.premium'))}</span>${esc(tt('games.perRound', { n: Math.min(g.perRound, g.items.length) }))}</span>
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
    return `<p class="cg-sentence" lang="fr">${mark(it.before)}${gap}${mark(it.after)}</p>`;
  }

  function progressHTML(){
    const n = S.order.length;
    return `<div class="cg-progress"><span>${esc(tt('games.counter', { i: S.idx + 1, n }))}</span>
      <div class="cg-progress-bar" aria-hidden="true"><i style="width:${Math.round(100 * S.idx / n)}%"></i></div></div>`;
  }

  function renderQuestion(){
    const it = item(), g = S.game;
    S.answered = false;
    $(ids.content).innerHTML = `
      <h2 class="cg-title">${esc(L(g.title))}</h2>
      ${progressHTML()}
      <div class="cg-stage">
        <span class="cg-verb" lang="fr">(${esc(it.verb)})</span>
        ${sentenceHTML(it, false)}
        <div class="cg-choices">
          ${['a', 'b'].map((k, i) => `<button type="button" class="cg-choice" data-k="${k}" aria-keyshortcuts="${i + 1}">
            <span class="cg-choice-form" lang="fr">${esc(it[k])}</span><span class="cg-choice-label">${esc(g.opts[k].label)}</span></button>`).join('')}
        </div>
        <div class="cg-feedback" id="cg-feedback" aria-live="polite"></div>
      </div>`;
    $(ids.content).querySelectorAll('.cg-choice').forEach(b => b.addEventListener('click', () => answer(b.dataset.k)));
  }

  function answer(k){
    if (S.answered) return;
    const it = item(), g = S.game, ok = k === it.ans;
    S.answered = true;
    if (ok) S.hits++;
    S.log.push({ it, ok, given: k });
    $(ids.content).querySelectorAll('.cg-choice').forEach(b => {
      b.disabled = true;
      b.classList.add(b.dataset.k === it.ans ? 'is-right' : (b.dataset.k === k ? 'is-wrong' : 'is-dim'));
    });
    $(ids.content).querySelector('.cg-sentence').outerHTML = sentenceHTML(it, true);
    const opt = g.opts[it.ans], txt = L(it.text) || {};
    const full = it.before + it[it.ans] + it.after;
    const last = S.idx + 1 >= S.order.length;
    const fb = $('cg-feedback');
    fb.innerHTML = `
      <p class="cg-verdict ${ok ? 'ok' : 'no'}">${esc(tt(ok ? 'games.right' : 'games.wrong'))}${ok ? '' : ` <span>${esc(tt('games.answerWas', { form: it[it.ans] }))}</span>`}</p>
      <div class="cg-why">
        <figure class="cg-timeline"><svg viewBox="0 0 134 44" role="img" aria-label="${esc(L(opt.tl))}">${SKETCH[opt.sketch] || ''}</svg><figcaption>${esc(L(opt.tl))}</figcaption></figure>
        <div><h3>${esc(tt('games.whyTense', { tense: opt.label }))}</h3><p>${esc(txt.why || '')}</p></div>
      </div>
      <p class="cg-tr"><button type="button" class="audio-btn cg-listen" aria-label="${esc(tt('games.listen'))}" title="${esc(tt('games.listen'))}">🔊</button><span>${esc(txt.tr || '')}</span></p>
      <button type="button" class="btn btn-primary cg-next" id="cg-next">${esc(tt(last ? 'games.seeResult' : 'games.next'))}</button>`;
    fb.querySelector('.cg-listen').addEventListener('click', e => { if (speak) speak(full, e.currentTarget); });
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
    const ids0 = miss.map(x => x.it.id);
    if (miss.length) $('cg-mistakes').addEventListener('click', () => start(g.id, ids0));
    $('cg-again').addEventListener('click', () => start(g.id));
    $('cg-to-list').addEventListener('click', exit);
  }

  function exit(){ show(false); renderList(); }

  // 1/2 escolhem; Enter segue (quando a resposta já foi dada).
  document.addEventListener('keydown', e => {
    const wrap = $(ids.wrap);
    if (!wrap || wrap.style.display === 'none' || !S.game || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (!S.answered && (e.key === '1' || e.key === '2')){ e.preventDefault(); answer(e.key === '1' ? 'a' : 'b'); }
  });
  const back = $(ids.back);
  if (back) back.addEventListener('click', exit);
  window.addEventListener('i18n:change', () => { if ($(ids.wrap) && $(ids.wrap).style.display === 'none') renderList(); });

  return { renderList, start, exit, state: S };
}

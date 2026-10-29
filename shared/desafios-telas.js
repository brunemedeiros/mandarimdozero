// ---------- Desafios: telas do aluno (motor comum; ver o topo de shared/desafios.js) ----------
// Etapa 5c da paridade (docs/historico/29-paridade-desafios.md): categorias, lista e álbum de Expressões (busca,
// filtros, Expressão do dia), fila por nível (Ouça e traduza, Acentuação), o player e a devolutiva de cada tipo, a
// revisão dos erros, a linha "Desafios do Módulo N" da trilha, a janela Premium e o botão de áudio lento (🐢). Saíram do
// fr/app.js com o mesmo nome e o mesmo texto; o que é do idioma vem de registerChallenges (shared/desafios.js).
// Os Ditados (shared/ditados.js), quando o site os carrega, entram como um cartão da tela de categorias e na contagem
// da linha do módulo; sem eles, nada disso aparece.
function chHasDictations(){ return typeof dictHasConfig === 'function' && dictHasConfig(); }

// Botão de áudio devagar -- companheiro de qualquer "Écouter" manual
// (desafios/exemplos onde o áudio NÃO toca sozinho, decisão explícita da
// autora), exceto a frase de exemplo de vocabulário ("Na frase", ver
// renderBlockIntroCard) -- ali o áudio já é automático, e é a própria
// palavra do audio-btn genérico que já cobre repetição. O Ditado já tem seu
// próprio seletor de velocidade (0.75x/1x/1.5x, ver openDictationPlayer),
// então não ganha este botão extra.
const SLOW_AUDIO_RATE = 0.65;
function slowAudioBtnHTML(id){
  return `<button class="dictation-play-btn dictation-play-btn-slow" id="${id}" title="${t('fr.audio.listenSlower')}">🐢 ${chT('ch.slow')}</button>`;
}
function slowAudioIconBtnHTML(id){
  return `<button class="audio-btn audio-btn-slow" id="${id}" aria-label="${t('fr.audio.listenSlowly')}" title="${t('fr.audio.listenSlowly')}">🐢</button>`;
}

// ---------- Unidade opcional "Desafios do Módulo N" (Premium) ----------
let moduleChallengesLoadAttempted = false;

// Preenche os slots da Trilha. Roda depois do render síncrono: carrega os
// desafios do banco (uma vez) e o plano da conta; módulos sem nenhum
// desafio publicado simplesmente não ganham a linha.
async function fillModuleChallengeRows(){
  const slots = document.querySelectorAll('.module-challenges-slot');
  if (!slots.length) return;
  if (!CHALLENGES.length && !moduleChallengesLoadAttempted){
    moduleChallengesLoadAttempted = true;
    await loadChallengesFromDB();
  }
  await ensureChallengesPlanLoaded();
  await ensureChallengesSiteLangLoaded(); // M3
  // A Trilha pode ter sido redesenhada enquanto carregava: usa só os slots que ainda estão na tela.
  document.querySelectorAll('.module-challenges-slot').forEach(slot => {
    const module = MODULES.find(m => m.id === slot.dataset.moduleId);
    if (!module) return;
    const row = buildModuleChallengesRow(module);
    slot.innerHTML = '';
    if (row) slot.appendChild(row);
  });
}

// O lugar da linha no fim de cada módulo da trilha: o site chama no afterModule do renderModuleTrailList
// (shared/core/modulos-niveis.js) e depois fillModuleChallengeRows().
function appendModuleChallengesSlot(module, list){
  const challengesSlot = document.createElement('div');
  challengesSlot.className = 'module-challenges-slot';
  challengesSlot.dataset.moduleId = module.id;
  list.appendChild(challengesSlot);
}

function buildModuleChallengesRow(module){
  const items = studentChallenges().filter(c => challengeModuleId(c) === module.id); // M3: sem tradução no idioma do site, fora
  const dictations = chHasDictations() ? dictationsVisible(module.id) : [];
  const dictFree = dictations.filter(d => d.free !== false).length;
  const dictPremium = dictations.length - dictFree;
  // A unidade existe se o módulo tem desafios publicados OU ditados (1 Free +
  // vários Premium por módulo).
  if (!items.length && !dictations.length) return null;
  const mIdx = modulesOfLevel(module.level).findIndex(m => m.id === module.id);
  const premium = !CHALLENGE_PAYWALL_ENABLED || challengesPremiumUnlocked();
  const moduleOpen = moduleUnlocked(module);
  const done = items.filter(c => isChallengeCompleted(c.id)).length;
  const block = document.createElement('div');
  block.className = 'unit-block module-challenges'
    + (premium ? '' : ' premium-locked')
    + (premium && !moduleOpen ? ' locked' : '')
    + (premium && items.length && done === items.length ? ' done' : '');
  block.innerHTML = `
    <div class="ub-header">
      <div class="ub-icon">${premium ? '🧩' : '🔒'}</div>
      <div class="ub-info">
        <div class="ub-title-row">
          <span class="ub-title">${t('trail.moduleChallenges.title', { n: mIdx + 1 })}</span>
          ${premium ? (items.length ? `<span class="ub-badge">${done}/${items.length}</span>` : '') : `<span class="ub-badge ub-badge-premium">${t('trail.premiumBadge')}</span>`}
        </div>
        <div class="ub-goal">${t('trail.moduleChallenges.goal')}</div>
        <div class="ub-goal">${dictFree ? tp('fr.trail.freeDictation', dictFree) : ''}${dictFree && (dictPremium || items.length) ? ' · ' : ''}${(dictPremium || items.length) ? (chHasDictations() ? tpZero('fr.trail.dictationsAnd', dictPremium) + ' ' : '') + tpZero('fr.trail.premiumChallengesSuffix', items.length) : ''}</div>
      </div>
    </div>
  `;
  if (!premium){
    wireHeaderActivation(block.querySelector('.ub-header'), openPremiumChallengesModal);
  } else if (moduleOpen){
    wireHeaderActivation(block.querySelector('.ub-header'), () => openModuleChallenges(module.id));
  }
  return block;
}

function openPremiumChallengesModal(){
  applyChallengeI18n();
  const box = document.getElementById('premium-challenges-contact');
  if (box) box.innerHTML = typeof premiumContactButtonHTML === 'function' ? premiumContactButtonHTML() : '';
  document.getElementById('premium-challenges-modal').style.display = 'flex';
}
function openModuleChallenges(moduleId){
  pendingChallengesModuleFilter = moduleId;
  if (chHasDictations()) pendingDictationModuleFilter = null;
  switchTab('challenges');
}

function openChallengeReviewQueue(){
  const due = dueChallengeReviews();
  if (!due.length){ challengeReviewQueueActive = false; renderChallengeCategories(); return; }
  challengeReviewQueueActive = true;
  challengeQueueContext = null;
  openChallengePlayer(due[0]);
}
function renderChallengeReviewDoneScreen(){
  const content = document.getElementById('challenge-player-content');
  content.innerHTML = `
    <div class="challenge-queue-interstitial">
      <div class="big-emoji">🎉</div>
      <h3>${chT('ch.review.doneTitle')}</h3>
      <p>${chT('ch.review.doneSub')}</p>
      <button class="btn btn-primary btn-block" id="review-queue-back-btn">${chT('ch.review.back')}</button>
    </div>
  `;
  document.getElementById('review-queue-back-btn').addEventListener('click', () => {
    challengeReviewQueueActive = false;
    renderChallengeCategories();
  });
}
// Volta "para a lista": na fila de revisão, a lista é a tela de categorias.
function backToChallengesListOrCategories(){
  if (challengeReviewQueueActive){ challengeReviewQueueActive = false; renderChallengeCategories(); return; }
  renderChallengesList(currentChallengesCategory);
}
// "X de Y concluídos" + barra fina (cards de categoria e topo das listas).
function challengeProgressHTML(done, total){
  if (!total) return '';
  const pct = Math.round((done / total) * 100);
  return `<div class="challenge-progress" data-done="${done}" data-total="${total}">
    <div class="challenge-progress-label">${chT(total === 1 ? 'ch.catProgress.one' : 'ch.catProgress.many', { done, total })}</div>
    <div class="challenge-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${done}"><div class="challenge-progress-fill" style="width:${pct}%"></div></div>
  </div>`;
}

function markChallengeCompleted(id){
  STATE.completedChallenges[id] = true;
  trackEvent('lesson_complete', 'challenge', { challengeId: id });
  saveState();
  // Sem notificação aqui de propósito: "Missão concluída" é só pras 3
  // Missões do dia (ver checkDailyMissionCompletions em addXP()) -- estes
  // são os desafios de conteúdo (Expressões/Ouça e traduza/Acentuação, sem
  // XP desde a auditoria de XP), categoria diferente.
}
// Wrapper compartilhado pelas 3 telas de feedback (Expressões, Ouça e
// traduza, Acentuação): mesmo invólucro (classe correct/incorrect + header)
// e mesmo botão de concluir ao final -- só o corpo (bodyHTML) muda por tipo.
// outcome: 'ok' (acerto), 'partial' (erro leve -- conclui, com explicação)
// ou 'fail' (erro total -- NÃO conclui: oferece "Tentar de novo" e
// "Tentar mais tarde"). Se omitido, deriva de isCorrect (compatível com
// chamadores antigos).
function challengeFeedbackWrapperHTML(typeClass, isCorrect, headerText, bodyHTML, outcome){
  const out = outcome || (isCorrect ? 'ok' : 'fail');
  const cls = out === 'ok' ? 'correct' : out === 'partial' ? 'partial' : 'incorrect';
  return `
    <div class="${typeClass}-feedback ${cls}">
      <div class="${typeClass}-feedback-header"><span class="fb-ico" aria-hidden="true">${out === 'ok' ? '✓' : out === 'partial' ? '~' : '✕'}</span><span class="fb-title">${String(headerText).replace(/^[\u2705\u274C\u26A0\uFE0F\s]+/, '')}</span></div>
      ${bodyHTML}
      ${out === 'fail' ? challengeRetryButtonsHTML() : challengeCompleteButtonHTML()}
    </div>
  `;
}

function challengeRetryButtonsHTML(){
  return `<div class="challenge-retry-actions">
    <button class="btn btn-primary" id="challenge-retry-btn">${chT('ch.retryNow')}</button>
    <button class="btn btn-secondary" id="challenge-later-btn">${chT('ch.retryLater')}</button>
  </div>`;
}

function challengeCompleteButtonHTML(){
  return `<button class="btn btn-primary challenge-complete-btn" id="challenge-complete-btn" style="margin-top:16px;width:100%;">${chT('ch.complete')}</button>`;
}
function wireChallengeCompleteButton(c){
  const retry = document.getElementById('challenge-retry-btn');
  if (retry){
    retry.addEventListener('click', () => openChallengePlayer(c.id));
    const later = document.getElementById('challenge-later-btn');
    if (later) later.addEventListener('click', () => {
      // Sai sem concluir: o desafio continua pendente.
      challengeQueueContext = null;
      backToChallengesListOrCategories();
    });
    return;
  }
  const btn = document.getElementById('challenge-complete-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    markChallengeCompleted(c.id);
    if (challengeReviewQueueActive){
      const nextId = dueChallengeReviews()[0];
      if (nextId) openChallengePlayer(nextId);
      else renderChallengeReviewDoneScreen();
      return;
    }
    if (challengeQueueContext && challengeQueueContext.type === c.type && challengeQueueContext.level === c.level){
      const next = nextQueueChallenge(c.type, c.level);
      if (next) renderChallengeQueueContinueScreen(c, next);
      else renderChallengeQueueLevelDoneScreen(c);
      return;
    }
    renderChallengesList(currentChallengesCategory);
  });
}

const CHALLENGE_RESOURCE_ICON = { dictionary: '📖', article: '📰', youtube: '▶', youglish: '🎧' };

function challengeResourceCardHTML(r){
  const icon = CHALLENGE_RESOURCE_ICON[r.type] || '🔗';
  return `
    <a class="challenge-external-link" href="${escapeHtmlChallenge(r.url)}" target="_blank" rel="noopener">
      <span class="challenge-external-link-icon">${icon}</span>
      <span class="challenge-external-link-text">
        <span class="challenge-external-link-label">${escapeHtmlChallenge(r.buttonLabel || chT('ch.knowMore'))}</span>
        <span class="challenge-external-link-source">${escapeHtmlChallenge(r.sourceName || r.title)}</span>
      </span>
    </a>
  `;
}

function challengeExternalResourcesHTML(c){
  const shown = (c.externalResources || []).filter(r => r.approved !== false);
  if (!shown.length) return '';
  return `
    <div class="challenge-external-resources">
      <div class="challenge-external-resources-label">${chT('ch.goFurther')}</div>
      ${shown.map(challengeResourceCardHTML).join('')}
    </div>
  `;
}

async function renderChallengeCategories(){
  challengeReviewQueueActive = false;
  document.getElementById('challenges-categories-wrap').style.display = 'block';
  document.getElementById('challenges-list-wrap').style.display = 'none';
  document.getElementById('challenge-player-wrap').style.display = 'none';
  document.getElementById('challenges-admin-wrap').style.display = 'none';

  const wrap = document.getElementById('challenges-categories');
  wrap.innerHTML = loadingHTML(chT('ch.loading'));

  const ok = await loadChallengesFromDB();
  if (!ok){
    wrap.innerHTML = `<p class="challenges-empty">${chT('ch.loadError')}</p>
      <button class="btn btn-secondary" id="challenges-retry-btn">${chT('ch.retry')}</button>`;
    document.getElementById('challenges-retry-btn').addEventListener('click', () => renderChallengeCategories());
    return;
  }
  await ensureChallengesPlanLoaded();
  await ensureChallengesSiteLangLoaded(); // M3: a lista no inglês precisa do overlay

  // Cabeçalho muda quando a pessoa chegou pela unidade "Desafios do Módulo N"
  // da Trilha (challengesModuleFilter): mesmo menu, só recortado pro módulo.
  const moduleBack = document.getElementById('challenges-module-back');
  const titleEl = document.getElementById('challenges-categories-title');
  const subEl = document.getElementById('challenges-categories-sub');
  const filterModule = challengesModuleFilter ? MODULES.find(m => m.id === challengesModuleFilter) : null;
  if (filterModule){
    const idx = modulesOfLevel(filterModule.level).findIndex(m => m.id === filterModule.id);
    moduleBack.style.display = 'inline-flex';
    titleEl.textContent = chT('ch.moduleTitle', { n: idx + 1 });
    subEl.textContent = chT('ch.moduleSub', { title: filterModule.title });
  } else {
    moduleBack.style.display = 'none';
    titleEl.textContent = chT('ch.title');
    subEl.textContent = chT('ch.sub');
  }

  const adminBar = document.getElementById('challenges-admin-bar');
  adminBar.style.display = isChallengesAdmin() ? 'flex' : 'none';
  if (isChallengesAdmin()){
    document.getElementById('challenges-pending-count').textContent = pendingChallenges().length;
  }

  // Ditados não é um tipo de CHALLENGE_CATEGORIES (é uma tela/motor próprio,
  // view-dictation) -- entra como um card à parte que leva pra lá em vez de
  // renderChallengesList(). Passou a viver dentro de Desafios porque não
  // fazia sentido como aba própria no menu principal (pedido explícito).
  const listedNow = listedChallenges();
  const dictationsHere = chHasDictations() ? dictationsVisible(challengesModuleFilter) : [];
  const visibleCats = challengesModuleFilter ? CHALLENGE_CATEGORIES.filter(cat => listedNow.some(c => c.type === cat.type)) : CHALLENGE_CATEGORIES;
  const catSubtitle = (cat) => challengesModuleFilter
    ? chT(listedNow.filter(c => c.type === cat.type).length === 1 ? 'ch.count.one' : 'ch.count.many', { n: listedNow.filter(c => c.type === cat.type).length })
    : chT('ch.cat.' + cat.type + '.subtitle');
  const catProgress = (cat) => {
    const ofType = listedNow.filter(c => c.type === cat.type);
    return challengeProgressHTML(ofType.filter(c => isChallengeCompleted(c.id)).length, ofType.length);
  };
  const dueReviews = dueChallengeReviews();
  wrap.innerHTML = (dueReviews.length ? `
    <button class="challenge-category-card challenge-review-card" id="challenges-review-card">
      <div class="challenge-category-emoji">🔁</div>
      <div class="challenge-category-title">${chT('ch.review.title', { n: dueReviews.length })}</div>
      <div class="challenge-category-subtitle">${chT('ch.review.subtitle')}</div>
    </button>
  ` : '') + visibleCats.map(cat => `
    <button class="challenge-category-card" data-category="${cat.type}">
      <div class="challenge-category-emoji">${cat.emoji}</div>
      <div class="challenge-category-title">${chT('ch.cat.' + cat.type + '.title')}</div>
      <div class="challenge-category-subtitle">${catSubtitle(cat)}</div>
      ${catProgress(cat)}
    </button>
  `).join('') + (dictationsHere.length ? `
    <button class="challenge-category-card" id="challenges-dictation-card">
      <div class="challenge-category-emoji">📝</div>
      <div class="challenge-category-title">${chT('ch.cat.dictation.title')}</div>
      <div class="challenge-category-subtitle">${challengesModuleFilter ? chT(dictationsHere.length === 1 ? 'dict.count.one' : 'dict.count.many', { n: dictationsHere.length }) : chT('ch.cat.dictation.subtitle')}</div>
      ${challengeProgressHTML(dictationsHere.filter(d => isDictationDone(d.id)).length, dictationsHere.length)}
    </button>
  ` : '');
  // Anel de progresso no ícone de cada categoria (CSS lê --p, 0 a 100).
  wrap.querySelectorAll('.challenge-category-card').forEach(card => {
    const pr = card.querySelector('.challenge-progress');
    if (!pr) return;
    const d = Number(pr.dataset.done), t = Number(pr.dataset.total);
    card.style.setProperty('--p', t ? Math.round(d / t * 100) : 0);
    if (t && d >= t) card.dataset.complete = '1';
  });
  const reviewCard = document.getElementById('challenges-review-card');
  if (reviewCard) reviewCard.addEventListener('click', openChallengeReviewQueue);
  wrap.querySelectorAll('.challenge-category-card[data-category]').forEach(card => {
    card.addEventListener('click', () => renderChallengesList(card.dataset.category));
  });
  const dictCard = document.getElementById('challenges-dictation-card');
  if (dictCard) dictCard.addEventListener('click', () => {
    pendingDictationModuleFilter = challengesModuleFilter;
    switchTab('dictation');
  });
}

function challengeCardLabelHTML(c){
  if (c.type === 'expression') return `<div class="challenge-card-expr">${escapeHtmlChallenge(c.canonicalExpression)}</div>`;
  if (c.type === 'listen_translate') return `<div class="challenge-card-expr">${chT('ch.label.listen')}</div>`;
  if (c.type === 'accent') return `<div class="challenge-card-expr">${chT('ch.label.accent')}</div>`;
  if (c.type === 'cloze_grammar') return `<div class="challenge-card-expr">${chT('ch.label.cloze')}</div>`;
  return '';
}


function expressionRegisterChipHTML(c){
  const reg = c && Object.prototype.hasOwnProperty.call(EXPRESSION_REGISTERS, c.register) ? c.register : null;
  if (!reg) return '';
  return `<span class="expr-reg expr-reg-${reg}" title="${escapeHtmlChallenge(chT('ch.reg.' + reg + '.hint'))}">${EXPRESSION_REGISTERS[reg].icon} ${chT('ch.reg.' + reg)}</span>`;
}


function expressionAudioBtnHTML(c, extraClass){
  if (!c.expressionAudioFile) return '';
  return `<button type="button" class="expr-play ${extraClass || ''}" data-expr-audio="${escapeHtmlChallenge(c.expressionAudioFile)}" aria-label="${chT('ch.album.listen')}: ${escapeHtmlChallenge(c.canonicalExpression)}" title="${chT('ch.album.listen')}">▶</button>`;
}

function wireExpressionAudioButtons(container){
  container.querySelectorAll('[data-expr-audio]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      playPregeneratedAudio(`challenges/${btn.dataset.exprAudio}`, btn);
    });
  });
}


function expressionTodayHTML(list){
  const c = expressionOfTheDay(list);
  if (!c){
    return list.length ? `<section class="expr-today expr-today-done"><p>${chT('ch.today.allDone')}</p></section>` : '';
  }
  return `
    <section class="expr-today" aria-labelledby="expr-today-title">
      <div class="expr-today-eyebrow" id="expr-today-title">${chT('ch.today.title')}</div>
      <div class="expr-today-row">
        ${expressionAudioBtnHTML(c, 'expr-play-lg')}
        <div class="expr-today-text">
          <div class="expr-today-expr">${escapeHtmlChallenge(c.canonicalExpression)}</div>
          <div class="expr-today-meta"><span class="challenge-card-level">${escapeHtmlChallenge(c.level || '')}</span>${expressionRegisterChipHTML(c)}</div>
        </div>
      </div>
      <p class="expr-today-hint">${chT('ch.today.hint')}</p>
      <button type="button" class="btn btn-primary expr-today-cta" data-today-open="${escapeHtmlChallenge(c.id)}">${chT('ch.today.cta')}</button>
    </section>
  `;
}

// Cartão de expressão no estilo álbum de figurinhas: pendente tracejada com
// "O que será que significa?", concluída mostra o sentido e o selo. O áudio
// fica fora do <button> do cartão (botão dentro de botão não é válido).
function expressionCardHTML(c){
  const done = isChallengeCompleted(c.id);
  const locked = isChallengeLocked(c);
  // Cartão compacto (2026-10-19, pedido da autora): sem a etiqueta de nível (o cartão já está dentro do
  // "Nível X") e sem o "O que será que significa?" na pendente; concluída mostra o sentido.
  const middle = done
    ? `<span class="expr-card-meaning">${escapeHtmlChallenge(expressionCardMeaning(c))}</span>`
    : (locked ? `<span class="expr-card-hint">${chT('ch.album.locked')}</span>` : '');
  return `
    <div class="expr-card-wrap">
      <button class="challenge-card expr-card ${done ? 'completed' : ''} ${locked ? 'locked' : ''}" data-challenge-id="${c.id}">
        ${done ? `<span class="expr-card-seal">${chT('ch.album.seal')}</span>` : ''}
        <span class="challenge-card-expr">${escapeHtmlChallenge(c.canonicalExpression)}</span>
        ${middle}
        <span class="expr-card-foot">${expressionRegisterChipHTML(c)}${tierBadgeHTML(challengeTier(c))}</span>
      </button>
      ${locked ? '' : expressionAudioBtnHTML(c)}
    </div>
  `;
}

function challengeCardHTML(c){
  if (c.type === 'expression') return expressionCardHTML(c);
  const done = isChallengeCompleted(c.id);
  const locked = isChallengeLocked(c);
  return `
    <button class="challenge-card ${done ? 'completed' : ''} ${locked ? 'locked' : ''}" data-challenge-id="${c.id}">
      ${locked ? `<span class="challenge-card-check" title="${chT('tier.premium')}">🔒</span>` : (done ? '<span class="challenge-card-check">✅</span>' : '')}
      <div class="challenge-card-level">${c.level}</div>
      ${challengeCardLabelHTML(c)}
      ${tierBadgeHTML(challengeTier(c))}
    </button>
  `;
}

// M3: o overlay do idioma do site (challenges.<lang>.js) chega depois do boot; quando chega (ou o idioma muda), a lista
// visível é pintada de novo para mostrar os desafios que agora têm tradução (e esconder os que não têm).
function repaintChallengesForUiLanguage(){
  if (typeof document === 'undefined') return;
  const view = document.getElementById('view-challenges');
  if (!view || !view.classList.contains('active') || !CHALLENGES.length) return;
  const vis = id => { const el = document.getElementById(id); return !!(el && el.style.display !== 'none' && el.style.display !== ''); };
  if (vis('challenge-player-wrap') || vis('challenges-admin-wrap')) return;
  if (vis('challenges-list-wrap') && !challengeReviewQueueActive) renderChallengesList(currentChallengesCategory);
  else if (vis('challenges-categories-wrap')) renderChallengeCategories();
}

function renderChallengesList(type){
  currentChallengesCategory = type;
  challengeReviewQueueActive = false;
  document.getElementById('challenges-categories-wrap').style.display = 'none';
  document.getElementById('challenges-list-wrap').style.display = 'block';
  document.getElementById('challenge-player-wrap').style.display = 'none';
  document.getElementById('challenges-admin-wrap').style.display = 'none';
  CURRENT_CHALLENGE_PLAYER = null;

  const cat = CHALLENGE_CATEGORIES.find(c => c.type === type);
  document.getElementById('challenges-list-title').textContent = (cat ? chT('ch.cat.' + cat.type + '.title') : chT('ch.title')) + (challengesModuleFilter ? chT('ch.ofModule') : '');
  document.getElementById('challenges-level-tabs').style.display = 'none';

  const cardsWrap = document.getElementById('challenges-cards');
  const published = listedChallenges().filter(c => c.type === type);
  const groupByLevel = type === 'expression';
  document.getElementById('challenges-list-progress').innerHTML = challengeProgressHTML(published.filter(c => isChallengeCompleted(c.id)).length, published.length);

  if (published.length === 0){
    cardsWrap.className = 'challenges-cards';
    cardsWrap.innerHTML = `
      <div class="challenges-empty">
        <div class="big-emoji">${cat ? cat.emoji : '🧩'}</div>
        <h3>${chT('ch.emptyTitle')}</h3>
        <p>${chT('ch.emptySub')}</p>
      </div>
    `;
    return;
  }

  if (!groupByLevel){
    // Ouça e traduza/Acentuação: sem título próprio pra cada exercício (ao
    // contrário de Expressões, que mostra a expressão em si) -- uma grade
    // de cards ficava toda igual, impossível de distinguir um exercício do
    // outro. Em vez de listar, mostra o progresso por nível e entra direto
    // no próximo exercício não concluído (fila, "Continuar" pro próximo).
    cardsWrap.className = 'challenges-queue-levels';
    const levelsPresent = CHALLENGE_LEVELS_ORDER.filter(lvl => published.some(c => c.level === lvl));
    cardsWrap.innerHTML = levelsPresent.map(level => {
      const levelAll = published.filter(c => c.level === level);
      const levelChallenges = levelAll.filter(c => !isChallengeLocked(c));
      const lockedCount = levelAll.length - levelChallenges.length;
      const lockedNote = lockedCount > 0
        ? `<div class="challenge-queue-level-progress">${chT(lockedCount === 1 ? 'ch.lockedNote.one' : 'ch.lockedNote.many', { n: lockedCount })}</div>`
        : '';
      if (!levelChallenges.length){
        return `
          <div class="challenge-queue-level-card">
            <div class="challenge-queue-level-info">
              <div class="challenge-queue-level-name">${chT('ch.level', { level })}</div>
              ${lockedNote}
            </div>
            <button class="btn btn-secondary" data-premium-lock="1">${chT('ch.btn.premiumLock')}</button>
          </div>
        `;
      }
      const doneCount = levelChallenges.filter(c => isChallengeCompleted(c.id)).length;
      const allDone = doneCount === levelChallenges.length;
      return `
        <div class="challenge-queue-level-card">
          <div class="challenge-queue-level-info">
            <div class="challenge-queue-level-name">${chT('ch.level', { level })}</div>
            <div class="challenge-queue-level-progress">${chT(levelChallenges.length === 1 ? 'ch.progress.one' : 'ch.progress.many', { done: doneCount, total: levelChallenges.length })}</div>
            ${lockedNote}
            ${[...new Set(levelAll.map(challengeTier))].sort().map(tierBadgeHTML).join(' ')}
          </div>
          <button class="btn ${allDone ? 'btn-secondary' : 'btn-primary'}" data-level="${level}">
            ${allDone ? chT('ch.btn.review') : (doneCount > 0 ? chT('ch.btn.continue') : chT('ch.btn.start'))}
          </button>
        </div>
      `;
    }).join('');
    cardsWrap.querySelectorAll('[data-level]').forEach(btn => {
      btn.addEventListener('click', () => openChallengeQueueLevel(type, btn.dataset.level));
    });
    cardsWrap.querySelectorAll('[data-premium-lock]').forEach(btn => {
      btn.addEventListener('click', openPremiumChallengesModal);
    });
    return;
  }

  // Todos os níveis numa página só (estilo lingua.com), cada um com seus
  // próprios cards -- em vez de abas que escondem os outros níveis.
  cardsWrap.className = 'challenges-level-sections';
  cardsWrap.innerHTML = `
    ${expressionTodayHTML(published)}
    <div class="challenges-toolbar">
      <input type="search" class="challenges-search" id="challenges-search" placeholder="${chT('ch.search.placeholder')}" aria-label="${chT('ch.search.label')}" autocomplete="off" value="${escapeHtmlChallenge(challengesListSearch)}">
      <div class="challenges-filter-chips" role="group" aria-label="${chT('ch.filter.label')}">
        ${['all', 'pending', 'done'].map(f => `<button type="button" class="challenges-filter-chip ${challengesListFilter === f ? 'active' : ''}" data-filter="${f}" aria-pressed="${challengesListFilter === f}">${chT('ch.filter.' + f)}</button>`).join('')}
      </div>
    </div>
    <div id="challenges-level-sections-inner"></div>
  `;
  const fillSections = () => fillExpressionLevelSections(type, published);
  wireExpressionAudioButtons(cardsWrap.querySelector('.expr-today') || document.createElement('div'));
  cardsWrap.querySelectorAll('[data-today-open]').forEach(btn => {
    btn.addEventListener('click', () => openChallengePlayer(btn.dataset.todayOpen));
  });
  document.getElementById('challenges-search').addEventListener('input', e => {
    challengesListSearch = e.target.value;
    fillSections();
  });
  cardsWrap.querySelectorAll('.challenges-filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      challengesListFilter = chip.dataset.filter;
      cardsWrap.querySelectorAll('.challenges-filter-chip').forEach(ch => {
        const on = ch.dataset.filter === challengesListFilter;
        ch.classList.toggle('active', on);
        ch.setAttribute('aria-pressed', String(on));
      });
      fillSections();
    });
  });
  fillSections();
}

// Busca/filtro da lista de Expressões (07/10/2026). Só filtram a exibição --
// o anel de cada nível sempre mostra o progresso do nível inteiro (não do
// que está filtrado), pra não parecer que o progresso mudou ao buscar.
let challengesListSearch = '';
let challengesListFilter = 'all';

function challengeSearchHaystack(c){
  return normalizeForTranslationCompare([c.canonicalExpression, c.level].join(' '));
}

function fillExpressionLevelSections(type, published){
  const inner = document.getElementById('challenges-level-sections-inner');
  if (!inner) return;
  const q = normalizeForTranslationCompare(challengesListSearch);
  const matches = c => {
    if (challengesListFilter === 'pending' && isChallengeCompleted(c.id)) return false;
    if (challengesListFilter === 'done' && !isChallengeCompleted(c.id)) return false;
    return !q || challengeSearchHaystack(c).includes(q);
  };
  const filtering = challengesListFilter !== 'all' || !!q;
  const levelsPresent = CHALLENGE_LEVELS_ORDER.filter(lvl => published.some(c => c.level === lvl));
  const html = levelsPresent.map(level => {
    const levelAll = published.filter(c => c.level === level);
    const levelCards = levelAll.filter(matches);
    if (filtering && !levelCards.length) return '';
    const collapsed = collapsedChallengeLevels.has(level) && !filtering;
    const doneN = levelAll.filter(c => isChallengeCompleted(c.id)).length;
    const pct = levelAll.length ? Math.round(doneN / levelAll.length * 100) : 0;
    return `
      <div class="challenges-level-section">
        <button class="challenges-level-heading" data-level="${level}">
          <span class="challenges-level-chevron ${collapsed ? 'collapsed' : ''}">▾</span>
          <span class="challenges-level-ring" style="--p:${pct}" data-complete="${pct === 100 ? 1 : 0}" role="img" aria-label="${chT('ch.ring.aria', { done: doneN, total: levelAll.length })}">${doneN}/${levelAll.length}</span>
          ${t('fr.challenges.levelName', { level })}
          <span class="challenges-level-count">${filtering ? `${levelCards.length}/${levelAll.length}` : levelAll.length}</span>
        </button>
        <div class="challenges-cards" ${collapsed ? 'style="display:none;"' : ''}>
          ${levelCards.map(challengeCardHTML).join('')}
        </div>
      </div>
    `;
  }).join('');
  inner.innerHTML = html || `<div class="challenges-empty"><p>${chT('ch.search.none')}</p></div>`;

  inner.querySelectorAll('.challenge-card').forEach(card => {
    card.addEventListener('click', () => openChallengePlayer(card.dataset.challengeId));
  });
  wireExpressionAudioButtons(inner);
  inner.querySelectorAll('.challenges-level-heading').forEach(btn => {
    btn.addEventListener('click', () => {
      const level = btn.dataset.level;
      if (collapsedChallengeLevels.has(level)) collapsedChallengeLevels.delete(level);
      else collapsedChallengeLevels.add(level);
      fillExpressionLevelSections(type, published);
    });
  });
}

// ---------- Fila de exercícios (Ouça e traduza / Acentuação) ----------
// Só ativa enquanto o aluno está dentro de um nível acessado pela tela de
// progresso (openChallengeQueueLevel) -- concluir um exercício encadeia
// direto pro próximo não concluído do mesmo nível, em vez de voltar pra
// uma lista. null fora desse fluxo (Expressões, preview do admin etc.).
let challengeQueueContext = null;

function nextQueueChallenge(type, level){
  return playableChallenges().find(c => c.type === type && c.level === level && !isChallengeCompleted(c.id)) || null;
}

function openChallengeQueueLevel(type, level){
  challengeQueueContext = { type, level };
  const next = nextQueueChallenge(type, level) || playableChallenges().find(c => c.type === type && c.level === level);
  if (next) openChallengePlayer(next.id);
}

function queueLevelProgressLabel(type, level){
  const all = playableChallenges().filter(c => c.type === type && c.level === level);
  const done = all.filter(c => isChallengeCompleted(c.id)).length;
  return chT(all.length === 1 ? 'ch.progress.one' : 'ch.progress.many', { done, total: all.length });
}

function renderChallengeQueueContinueScreen(c, next){
  const content = document.getElementById('challenge-player-content');
  content.innerHTML = `
    <div class="challenge-queue-interstitial">
      <div class="big-emoji">✅</div>
      <h3>${chT('ch.queue.done')}</h3>
      <p>${chT('ch.queue.levelProgress', { level: escapeHtmlChallenge(c.level), progress: queueLevelProgressLabel(c.type, c.level) })}</p>
      <button class="btn btn-primary btn-block" id="queue-continue-btn">${chT('ch.queue.continue')}</button>
    </div>
  `;
  document.getElementById('queue-continue-btn').addEventListener('click', () => openChallengePlayer(next.id));
}

function renderChallengeQueueLevelDoneScreen(c){
  const content = document.getElementById('challenge-player-content');
  content.innerHTML = `
    <div class="challenge-queue-interstitial">
      <div class="big-emoji">🎉</div>
      <h3>${chT('ch.queue.levelDone', { level: escapeHtmlChallenge(c.level) })}</h3>
      <p>${chT('ch.queue.levelDoneSub')}</p>
      <button class="btn btn-primary btn-block" id="queue-back-btn">${chT('ch.queue.back')}</button>
    </div>
  `;
  document.getElementById('queue-back-btn').addEventListener('click', () => {
    challengeQueueContext = null;
    renderChallengesList(currentChallengesCategory);
  });
}

let challengePreviewMode = false;

function openChallengePlayer(id){
  const c = CHALLENGES.find(x => x.id === id);
  if (!c) return;
  // M3: desafio sem tradução no idioma do site não abre para o aluno (a prévia da admin continua abrindo).
  if (!challengePreviewMode && !challengeAvailableInSiteLang(c)) return;
  if (isChallengeLocked(c)){ openPremiumChallengesModal(); return; }

  document.getElementById('challenges-list-wrap').style.display = 'none';
  document.getElementById('challenge-player-wrap').style.display = 'block';
  document.getElementById('challenge-preview-banner').style.display = 'none';
  // Só pra diagnóstico de report (ver captureReportContext em
  // shared/reports.js) -- não existia nenhuma referência global ao desafio
  // aberto no momento (`c` era só uma variável local desta função).
  CURRENT_CHALLENGE_PLAYER = { id: c.id, type: c.type, level: c.level };

  if (c.type === 'listen_translate') return openListenTranslatePlayer(c);
  if (c.type === 'accent') return openAccentPlayer(c);
  if (c.type === 'cloze_grammar') return openClozeGrammarPlayer(c);
  return openExpressionPlayer(c);
}

// A pergunta e o feedback (Bonne réponse / exemplos / à vous de jouer) são
// duas telas distintas dentro do mesmo #challenge-player-content -- a
// segunda SUBSTITUI a primeira (innerHTML novo), não empilha por baixo.
// A frase de exemplo (c.example) não aparece mais na tela da pergunta --
// ela já entregava a resposta antes mesmo da hipótese -- só depois de
// responder, junto com o segundo exemplo (Exemplo 1 / Exemplo 2).
function openExpressionPlayer(c){
  renderExpressionQuestionScreen(c);
}

function renderExpressionQuestionScreen(c){
  stopExerciseAudio();
  const content = document.getElementById('challenge-player-content');
  content.innerHTML = `
    <div class="challenge-expression">
      ${escapeHtmlChallenge(c.canonicalExpression)}
      <button class="audio-btn audio-btn-lg" id="challenge-expression-play-btn" aria-label="${chT('ch.listenPron')}" title="${chT('ch.listenPron')}">🔊</button>
      ${c.expressionAudioFile ? slowAudioIconBtnHTML('challenge-expression-play-slow-btn') : ''}
    </div>
    ${c.register ? `<div class="expr-question-reg">${expressionRegisterChipHTML(c)}</div>` : ''}
    <div class="challenge-hypothesis">
      <p class="challenge-question">${escapeHtmlChallenge(c.question)}</p>
      <div class="challenge-choices-wrap">
        <div class="challenge-choices blurred" id="challenge-choices"></div>
        <button class="btn btn-secondary challenge-reveal-overlay-btn" id="challenge-reveal-btn">${chT('ch.expr.reveal')}</button>
      </div>
    </div>
  `;

  if (c.expressionAudioFile){
    document.getElementById('challenge-expression-play-btn').addEventListener('click', (e) => {
      playPregeneratedAudio(`challenges/${c.expressionAudioFile}`, e.currentTarget);
    });
    document.getElementById('challenge-expression-play-slow-btn').addEventListener('click', (e) => {
      playPregeneratedAudio(`challenges/${c.expressionAudioFile}`, e.currentTarget, false, SLOW_AUDIO_RATE);
    });
  }

  const choicesEl = document.getElementById('challenge-choices');
  const shuffled = shuffle(c.options.map((text, i) => ({ text, origIdx: i })));
  choicesEl.innerHTML = shuffled.map(o =>
    `<button class="challenge-choice-btn" data-orig-idx="${o.origIdx}">${escapeHtmlChallenge(o.text)}</button>`
  ).join('');

  document.getElementById('challenge-reveal-btn').addEventListener('click', (e) => {
    choicesEl.classList.remove('blurred');
    e.currentTarget.style.display = 'none';
    choicesEl.querySelectorAll('.challenge-choice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        answerChallenge(c, parseInt(btn.dataset.origIdx, 10));
      });
    });
  });
}

function answerChallenge(c, chosenIdx){
  const isCorrect = c.options[chosenIdx] === c.correctAnswer;
  // Desafios de conteúdo (Expressões/Ouça e traduza/Acentuação) continuam
  // clicáveis mesmo já concluídos (não há como "gastar" o desafio), então
  // não dão XP -- decisão de produto, ver auditoria do sistema de XP.
  renderExpressionFeedbackScreen(c, chosenIdx, isCorrect);
}

// Etapa 3 (decisão da dona, 2026-10-19): o modelo da frase termina em ponto
// ("significa <strong>{fr}</strong>."). Quando o texto já termina em ! ? … ou
// "...", não acrescentar o ponto (antes saía "Bom fim de semana!."). Texto que
// termina em ponto simples continua como antes (o ponto do texto sai e fica o
// do modelo).
function expressionMeaningLineHTML(key, param, raw){
  const trimmed = String(raw == null ? '' : raw).replace(/\s+$/, '');
  const keepsOwnEnd = /(?:[!?\u2026]|\.\.\.)$/.test(trimmed);
  const value = keepsOwnEnd ? trimmed : trimmed.replace(/[.\s]+$/, '');
  const html = chT(key, { [param]: escapeHtmlChallenge(value) });
  return keepsOwnEnd ? html.replace(/\.\s*$/, '') : html;
}

function renderExpressionFeedbackScreen(c, chosenIdx, isCorrect){
  const content = document.getElementById('challenge-player-content');
  // Etapa 3 (c1): com o site em outro idioma, o sentido vem da tradução do desafio (fr/challenges.en.js,
  // campo `meaning`) quando existe; sem tradução, continua o português do banco.
  const exprOv = challengeOverlay(c);
  const meaningShown = (exprOv && exprOv.meaning) ? exprOv.meaning : (c.meaning || {}).pt;
  const bodyHTML = `
      ${isCorrect ? '' : `<p class="challenge-feedback-chosen">${chT('ch.expr.yourAnswer', { chosen: escapeHtmlChallenge(c.options[chosenIdx]), correct: escapeHtmlChallenge(c.correctAnswer) })}</p>`}
      <p class="challenge-feedback-meaning"><strong>${escapeHtmlChallenge(c.canonicalExpression)}</strong><br>
      ${expressionMeaningLineHTML('ch.expr.signifies', 'fr', c.meaning[chCfg().lang])}<br>
      ${expressionMeaningLineHTML('ch.expr.inPt', 'pt', meaningShown)}</p>
      <p class="challenge-explanation">${escapeHtmlChallenge(c.explanation)}</p>

      <div class="challenge-second-example">
        <div class="challenge-second-example-label">${chT('ch.expr.example1')}</div>
        <p class="challenge-second-example-text">${escapeHtmlChallenge(c.example.text)}</p>
        ${c.example.audioFile ? `<div class="audio-btn-row"><button class="dictation-play-btn" id="challenge-example-play-btn">${chT('ch.listenFr')}</button>${slowAudioBtnHTML('challenge-example-play-slow-btn')}</div>` : ''}
      </div>

      <div class="challenge-second-example">
        <div class="challenge-second-example-label">${chT('ch.expr.example2')}</div>
        <p class="challenge-second-example-text">${escapeHtmlChallenge(c.secondExample.text)}</p>
        ${c.secondExample.audioFile ? `<div class="audio-btn-row"><button class="dictation-play-btn" id="challenge-second-example-play-btn">${chT('ch.listenFr')}</button>${slowAudioBtnHTML('challenge-second-example-play-slow-btn')}</div>` : ''}
      </div>

      <div class="challenge-microactivity">
        <div class="challenge-microactivity-label">${chT('ch.expr.yourTurn')}</div>
        <p class="challenge-microactivity-prompt">${escapeHtmlChallenge(c.microActivity.prompt)}</p>
        <button class="btn btn-secondary" id="challenge-reveal-answer-btn">${chT('ch.expr.showAnswer')}</button>
        <p class="challenge-microactivity-answer" id="challenge-microactivity-answer" style="display:none;">${escapeHtmlChallenge(c.microActivity.answer)}</p>
      </div>

      ${challengeExternalResourcesHTML(c)}
  `;
  content.innerHTML = challengeFeedbackWrapperHTML('challenge', isCorrect, isCorrect ? chT('ch.expr.right') : chT('ch.notQuite'), bodyHTML);
  recordChallengeReviewOutcome(c, isCorrect ? 'ok' : 'fail');

  if (c.example.audioFile){
    document.getElementById('challenge-example-play-btn').addEventListener('click', (e) => {
      playPregeneratedAudio(`challenges/${c.example.audioFile}`, e.currentTarget);
    });
    document.getElementById('challenge-example-play-slow-btn').addEventListener('click', (e) => {
      playPregeneratedAudio(`challenges/${c.example.audioFile}`, e.currentTarget, false, SLOW_AUDIO_RATE);
    });
  }
  if (c.secondExample.audioFile){
    document.getElementById('challenge-second-example-play-btn').addEventListener('click', (e) => {
      playPregeneratedAudio(`challenges/${c.secondExample.audioFile}`, e.currentTarget);
    });
    document.getElementById('challenge-second-example-play-slow-btn').addEventListener('click', (e) => {
      playPregeneratedAudio(`challenges/${c.secondExample.audioFile}`, e.currentTarget, false, SLOW_AUDIO_RATE);
    });
  }
  document.getElementById('challenge-reveal-answer-btn').addEventListener('click', () => {
    document.getElementById('challenge-reveal-answer-btn').style.display = 'none';
    document.getElementById('challenge-microactivity-answer').style.display = 'block';
  });
  wireChallengeCompleteButton(c);
}


function markedWordsHTML(parts){
  return parts.map(p => p.cls ? `<span class="tw-${p.cls}">${escapeHtmlChallenge(p.text)}</span>` : escapeHtmlChallenge(p.text)).join(' ');
}

function openListenTranslatePlayer(c){
  const content = document.getElementById('challenge-player-content');
  content.innerHTML = `
    <div class="challenge-expression">${chT('ch.label.listen')}</div>
    <div class="listen-translate-audio-wrap audio-btn-row">
      <button class="dictation-play-btn" id="lt-play-btn">${chT('ch.listenFr')}</button>
      ${slowAudioBtnHTML('lt-play-slow-btn')}
    </div>
    <div class="listen-translate-hint-wrap">
      <button class="btn btn-secondary" id="lt-hint-btn">${chT('ch.lt.hint')}</button>
      <p class="listen-translate-hint-text" id="lt-hint-text" style="display:none;"></p>
    </div>
    <label class="listen-translate-answer-label" for="lt-answer-input">${chT('ch.lt.label')}</label>
    <textarea class="listen-translate-answer-input" id="lt-answer-input" rows="2" placeholder="${chT('ch.lt.placeholder')}"></textarea>
    <div class="listen-translate-actions">
      <button class="btn btn-primary" id="lt-verify-btn">${chT('ch.verify')}</button>
    </div>
    <div id="lt-feedback-wrap" aria-live="polite" aria-atomic="true"></div>
  `;

  document.getElementById('lt-play-btn').addEventListener('click', (e) => {
    if (c.audioFile) playPregeneratedAudio(`challenges/${c.audioFile}`, e.currentTarget);
  });
  document.getElementById('lt-play-slow-btn').addEventListener('click', (e) => {
    if (c.audioFile) playPregeneratedAudio(`challenges/${c.audioFile}`, e.currentTarget, false, SLOW_AUDIO_RATE);
  });
  document.getElementById('lt-hint-btn').addEventListener('click', (e) => {
    document.getElementById('lt-hint-text').textContent = c.hintText;
    document.getElementById('lt-hint-text').style.display = 'block';
    e.currentTarget.style.display = 'none';
  });
  document.getElementById('lt-verify-btn').addEventListener('click', () => checkListenTranslateAnswer(c));
}

function translationAlertsHTML(an, outcome){
  if (outcome === 'fail') return '';
  const msgs = [];
  an.alerts.forEach(a => {
    if (a.type === 'negation') msgs.push(chT('ch.lt.alert.negation'));
    else if (a.type === 'number') msgs.push(chT('ch.lt.alert.number'));
    else if (a.type === 'mustInclude') msgs.push(chT('ch.lt.alert.mustInclude', { word: escapeHtmlChallenge(a.word) }));
    else if (a.type === 'mustExclude') msgs.push(chT('ch.lt.alert.mustExclude', { word: escapeHtmlChallenge(a.word) }));
  });
  const parts = msgs.map(m => `<p class="listen-translate-feedback-warning">⚠ ${m}</p>`);
  if (outcome === 'partial' && an.missingWords.length){
    parts.push(`<p class="listen-translate-feedback-row"><strong>${chT('ch.lt.missing')}</strong>${an.missingWords.map(escapeHtmlChallenge).join(', ')}</p>`);
  }
  return parts.join('');
}

function checkListenTranslateAnswer(c){
  const input = document.getElementById('lt-answer-input');
  const studentAnswer = input.value.trim();
  // Site em inglês com referências em inglês (overlay): comparador do idioma da
  // tradução (shared/translation-compare.js). Senão, a análise em português
  // completa (alertas de negação/número/mustInclude, 3 níveis).
  const lt = listenTranslateSetup(c);
  const i18nCmp = lt.lang !== 'pt-BR';
  let personMismatch, outcome, analysis = null, ptPt = null;
  if (i18nCmp){
    personMismatch = lt.cmp.personMismatch(studentAnswer);
    outcome = (!personMismatch && lt.cmp.isAcceptable(studentAnswer, lt.refs)) ? 'ok' : 'fail';
  } else {
    personMismatch = translationHasPersonMismatch(studentAnswer);
    // Resposta em português de Portugal: 'partial' e a forma do Brasil na devolutiva (regra da dona, 2026-10-26).
    const verdict = listenTranslateVerdict(studentAnswer, c.referenceTranslations, personMismatch, c);
    outcome = verdict.outcome;
    ptPt = verdict.ptPt;
    analysis = analyzeTranslation(ptPt ? ptPt.text : studentAnswer, c.referenceTranslations, c);
  }
  const isCorrect = outcome === 'ok';
  // Desafio de conteúdo continua clicável mesmo já concluído -- não dá XP
  // (mesma decisão de answerChallenge, ver auditoria do sistema de XP).

  const marked = (outcome !== 'ok' && studentAnswer && analysis) ? markTranslationWords(studentAnswer, analysis.bestRef || c.referenceTranslations[0]) : null;
  const yoursHTML = marked ? markedWordsHTML(marked.student) : escapeHtmlChallenge(studentAnswer || '—');
  const expectedHTML = marked ? markedWordsHTML(marked.reference) : escapeHtmlChallenge((analysis && analysis.bestRef) || lt.refs[0]);
  const ltBodyHTML = `
      ${ptPt ? ptVariantes().ptBrFeedbackHTML(ptPt.marks, { t: chT, keys: { line: 'ch.lt.ptpt', pair: 'ch.lt.ptpt.pair' }, esc: escapeHtmlChallenge, tag: 'p', cls: 'listen-translate-feedback-warning lt-ptpt-warning' }) : ''}${personMismatch ? `<p class="listen-translate-feedback-warning">${chT('ch.lt.agreement', { pronoun: escapeHtmlChallenge(personMismatch.pronoun), verb: escapeHtmlChallenge(personMismatch.verb) })}</p>` : ''}
      ${analysis ? translationAlertsHTML(analysis, outcome) : ''}
      <div class="fb-cmp">
        <p class="listen-translate-feedback-row"><strong>${chT('ch.lt.yours')}</strong>${yoursHTML}</p>
        <p class="listen-translate-feedback-row"><strong>${chT('ch.lt.expected')}</strong>${expectedHTML}</p>
      </div>
      <p class="listen-translate-feedback-row"><strong>${chT('ch.lt.original')}</strong>${escapeHtmlChallenge(c.sentenceFr)}</p>
      ${lt.explanation ? `<p class="listen-translate-feedback-row"><strong>${chT('ch.lt.explanation')}</strong>${escapeHtmlChallenge(lt.explanation)}</p>` : ''}
      <div class="audio-btn-row">
        <button class="dictation-play-btn" id="lt-replay-btn">${chT('ch.listenAgain')}</button>
        ${slowAudioBtnHTML('lt-replay-slow-btn')}
      </div>
  `;
  document.getElementById('lt-feedback-wrap').innerHTML = challengeFeedbackWrapperHTML('listen-translate', isCorrect, outcome === 'ok' ? chT('ch.lt.right') : outcome === 'partial' ? chT(ptPt ? 'ch.lt.partialPtPt' : 'ch.lt.partial') : chT('ch.notQuite'), ltBodyHTML, outcome);
  document.getElementById('lt-verify-btn').style.display = 'none';
  recordChallengeReviewOutcome(c, outcome);
  document.getElementById('lt-replay-btn').addEventListener('click', (e) => {
    if (c.audioFile) playPregeneratedAudio(`challenges/${c.audioFile}`, e.currentTarget);
  });
  document.getElementById('lt-replay-slow-btn').addEventListener('click', (e) => {
    if (c.audioFile) playPregeneratedAudio(`challenges/${c.audioFile}`, e.currentTarget, false, SLOW_AUDIO_RATE);
  });
  wireChallengeCompleteButton(c);
}


function openAccentPlayer(c){
  const content = document.getElementById('challenge-player-content');
  content.innerHTML = `
    <div class="challenge-expression">${chT('ch.label.accent')}</div>
    <div class="accent-audio-wrap audio-btn-row">
      <button class="dictation-play-btn" id="accent-play-btn">${chT('ch.listenFr')}</button>
      ${slowAudioBtnHTML('accent-play-slow-btn')}
    </div>
    <label class="listen-translate-answer-label" for="accent-answer-input">${chT('ch.accent.label')}</label>
    <input type="text" class="accent-answer-input" id="accent-answer-input" autocomplete="off" autocapitalize="off" spellcheck="false">
    ${chCfg().accentPickerHTML()}
    <div class="listen-translate-actions">
      <button class="btn btn-primary" id="accent-verify-btn">${chT('ch.verify')}</button>
    </div>
    <div id="accent-feedback-wrap" aria-live="polite" aria-atomic="true"></div>
  `;

  chCfg().wireAccentPicker(content, document.getElementById('accent-answer-input'));
  document.getElementById('accent-play-btn').addEventListener('click', (e) => {
    if (c.audioFile) playPregeneratedAudio(`challenges/${c.audioFile}`, e.currentTarget);
  });
  document.getElementById('accent-play-slow-btn').addEventListener('click', (e) => {
    if (c.audioFile) playPregeneratedAudio(`challenges/${c.audioFile}`, e.currentTarget, false, SLOW_AUDIO_RATE);
  });
  document.getElementById('accent-answer-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') checkAccentAnswer(c);
  });
  document.getElementById('accent-verify-btn').addEventListener('click', () => checkAccentAnswer(c));
}

function checkAccentAnswer(c){
  const input = document.getElementById('accent-answer-input');
  const studentAnswer = input.value.trim();
  const outcome = accentAnswerOutcome(studentAnswer, c.targetText);
  const isCorrect = outcome === 'ok';
  // Desafio de conteúdo continua clicável mesmo já concluído -- não dá XP
  // (mesma decisão de answerChallenge, ver auditoria do sistema de XP).

  const accentBodyHTML = `
      ${!isCorrect ? `<p class="accent-feedback-answer">${chT('ch.accent.yours', { answer: escapeHtmlChallenge(studentAnswer || '—') })}</p>` : ''}
      <div class="accent-feedback-correct-word">${escapeHtmlChallenge(c.targetText)}</div>
      <div class="audio-btn-row">
        <button class="dictation-play-btn" id="accent-replay-btn">${chT('ch.listenFr')}</button>
        ${slowAudioBtnHTML('accent-replay-slow-btn')}
      </div>
      ${(challengeText(c, 'explanation')) ? `<p class="accent-feedback-explanation">${escapeHtmlChallenge(challengeText(c, 'explanation'))}</p>` : ''}
  `;
  document.getElementById('accent-feedback-wrap').innerHTML = challengeFeedbackWrapperHTML('accent', isCorrect, outcome === 'ok' ? chT('ch.accent.right') : outcome === 'partial' ? chT('ch.accent.partial') : chT('ch.accent.wrong'), accentBodyHTML, outcome);
  document.getElementById('accent-verify-btn').style.display = 'none';
  recordChallengeReviewOutcome(c, outcome);
  document.getElementById('accent-replay-btn').addEventListener('click', (e) => {
    if (c.audioFile) playPregeneratedAudio(`challenges/${c.audioFile}`, e.currentTarget);
  });
  document.getElementById('accent-replay-slow-btn').addEventListener('click', (e) => {
    if (c.audioFile) playPregeneratedAudio(`challenges/${c.audioFile}`, e.currentTarget, false, SLOW_AUDIO_RATE);
  });
  wireChallengeCompleteButton(c);
}


function openClozeGrammarPlayer(c){
  stopExerciseAudio();
  const blanks = c.blanks || [];
  const chosen = blanks.map(() => null);
  const parts = clozeGrammarParts(c.sentenceFr);
  const content = document.getElementById('challenge-player-content');
  const sentenceHTML = parts.map((p, i) => escapeHtmlChallenge(p) +
    (i < parts.length - 1 ? `<span class="cloze-grammar-slot" data-slot="${i}">${CLOZE_GRAMMAR_BLANK}</span>` : '')).join('');
  content.innerHTML = `
    <div class="cloze-grammar">
      <p class="challenge-question">${chT('ch.cloze.instruction')}</p>
      <div class="cloze-grammar-sentence" id="cloze-grammar-sentence">${sentenceHTML}</div>
      ${blanks.map((b, i) => `
        <div class="cloze-grammar-group" data-blank="${i}">
          ${blanks.length > 1 ? `<div class="cloze-grammar-group-label">${chT('ch.cloze.blank', { n: i + 1 })}</div>` : ''}
          <div class="challenge-choices">
            ${shuffle(b.options.slice()).map(o => `<button class="challenge-choice-btn" data-blank="${i}" data-value="${escapeHtmlChallenge(o)}">${escapeHtmlChallenge(o)}</button>`).join('')}
          </div>
        </div>`).join('')}
      <p class="cloze-grammar-msg" id="cloze-grammar-msg"></p>
      <button class="btn btn-primary btn-block" id="cloze-grammar-verify-btn">${chT('ch.verify')}</button>
      <div id="cloze-grammar-feedback-wrap"></div>
    </div>
  `;
  content.querySelectorAll('.cloze-grammar-group .challenge-choice-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = Number(btn.dataset.blank);
      chosen[i] = btn.dataset.value;
      content.querySelectorAll(`.challenge-choice-btn[data-blank="${i}"]`).forEach(b => b.classList.toggle('selected', b === btn));
      const slot = content.querySelector(`.cloze-grammar-slot[data-slot="${i}"]`);
      if (slot){ slot.textContent = chosen[i]; slot.classList.add('filled'); }
      document.getElementById('cloze-grammar-msg').textContent = '';
    });
  });
  document.getElementById('cloze-grammar-verify-btn').addEventListener('click', () => {
    const res = clozeGrammarOutcome(c, chosen);
    if (!res.complete){ document.getElementById('cloze-grammar-msg').textContent = chT('ch.cloze.chooseAll'); return; }
    renderClozeGrammarFeedback(c, chosen, res);
  });
}

function renderClozeGrammarFeedback(c, chosen, res){
  const content = document.getElementById('challenge-player-content');
  content.querySelectorAll('.cloze-grammar-group .challenge-choice-btn').forEach(b => {
    const i = Number(b.dataset.blank);
    b.classList.add('disabled');
    if (b.dataset.value === c.blanks[i].answer) b.classList.add('correct');
    else if (b.dataset.value === chosen[i]) b.classList.add('incorrect');
  });
  content.querySelectorAll('.cloze-grammar-slot').forEach(s => {
    const i = Number(s.dataset.slot);
    s.classList.add(res.perBlank[i] ? 'correct' : 'incorrect');
  });
  document.getElementById('cloze-grammar-verify-btn').style.display = 'none';
  const isCorrect = res.outcome === 'ok';
  // Tradução e explicação no idioma do site (overlay fr/challenges.<lang>.js: translation/explanation);
  // sem overlay, o original em português.
  const clozeOv = challengeOverlay(c);
  const clozeTranslation = (clozeOv && clozeOv.translation) ? clozeOv.translation : c.translationPt;
  const clozeExplanation = (clozeOv && clozeOv.explanation) ? clozeOv.explanation : c.explanation;
  const bodyHTML = `
    ${isCorrect ? '' : `<p class="challenge-feedback-chosen">${chT('ch.cloze.yourAnswer')}: ${escapeHtmlChallenge(clozeGrammarFilled(c, chosen))}<br>${chT('ch.cloze.correct')}: <strong>${escapeHtmlChallenge(clozeGrammarFilled(c))}</strong></p>`}
    ${isCorrect ? `<p class="challenge-feedback-meaning"><strong>${escapeHtmlChallenge(clozeGrammarFilled(c))}</strong></p>` : ''}
    ${clozeTranslation ? `<p class="challenge-feedback-meaning">${chT('ch.cloze.translation')}: ${escapeHtmlChallenge(clozeTranslation)}</p>` : ''}
    <p class="challenge-explanation">${escapeHtmlChallenge(clozeExplanation || '')}</p>
  `;
  document.getElementById('cloze-grammar-feedback-wrap').innerHTML = challengeFeedbackWrapperHTML('challenge', isCorrect, isCorrect ? chT('ch.cloze.right') : chT('ch.notQuite'), bodyHTML, res.outcome);
  recordChallengeReviewOutcome(c, res.outcome);
  wireChallengeCompleteButton(c);
}


// ---------- Marcação (para site novo; o fr tem a mesma no index.html) ----------
// A seção da aba Desafios, igual à do fr/index.html (guarda: tests/paridade-sites/test_desafios_motor.js). Uma
// diferença de propósito: o subtítulo usa data-ch-i18n="ch.sub" (texto da configuração do site) em vez do
// data-i18n="fr.challenges.sub" do fr, que cita o francês.
function challengesScreenHTML(){
  return `
    <div id="challenges-categories-wrap">
      <button class="back-link" id="challenges-module-back" style="display:none;" data-ch-i18n="ch.static.backTrail">← Voltar à trilha</button>
      <div class="path-header">
        <h2 id="challenges-categories-title" data-i18n="nav.challenges">Desafios</h2>
        <p data-ch-i18n="ch.sub" id="challenges-categories-sub"></p>
      </div>
      <div class="challenges-admin-bar" id="challenges-admin-bar" style="display:none;">
        <button class="btn btn-secondary" id="challenges-admin-import-btn" data-i18n="adminChallenges.bar.import">📥 Importar JSON</button>
        <button class="btn btn-secondary" id="challenges-admin-review-btn" data-i18n="adminChallenges.bar.review">🛠️ Revisar pendentes (<span id="challenges-pending-count">0</span>)</button>
      </div>
      <div class="challenges-categories" id="challenges-categories"></div>
    </div>

    <div id="challenges-list-wrap" style="display:none;">
      <button class="back-link" id="challenges-list-back-btn" data-ch-i18n="ch.static.back">← Voltar às categorias</button>
      <div class="path-header">
        <h2 id="challenges-list-title" data-i18n="nav.challenges">Desafios</h2>
      </div>
      <div id="challenges-list-progress"></div>
      <div class="challenges-level-tabs" id="challenges-level-tabs" style="display:none;"></div>
      <div class="challenges-cards" id="challenges-cards"></div>
    </div>

    <div id="challenge-player-wrap" style="display:none;">
      <button class="back-link" id="challenge-back-to-list" data-ch-i18n="ch.static.backChallenges">← Voltar aos desafios</button>
      <div id="challenge-preview-banner" style="display:none;"></div>
      <div id="challenge-player-content" aria-live="polite" aria-atomic="true"></div>
    </div>

    <div id="challenges-admin-wrap" style="display:none;">
      <button class="back-link" id="challenges-admin-back-btn" data-i18n="fr.dictation.backToChallenges">← Voltar aos desafios</button>
      <div id="challenges-admin-content"></div>
    </div>
`;
}
// A janela Premium dos Desafios do Módulo, igual à do fr/index.html.
function challengesPremiumModalHTML(){
  return `
<div id="premium-challenges-modal" class="app-modal-overlay" style="display:none;">
  <div class="app-modal">
    <div class="app-modal-header">
      <h3 data-ch-i18n="prem.modal.title">🔒 Recurso Premium</h3>
      <button class="app-modal-close" id="premium-challenges-modal-close" aria-label="Fechar" data-i18n-attr="aria-label:common.close">✕</button>
    </div>
    <div class="app-modal-body">
      <p data-ch-i18n="prem.modal.p1">Os <strong>Desafios do Módulo</strong> reforçam cada tema da trilha com Expressões, Ouça e traduza, Acentuação e Ditados extras.</p>
      <p data-ch-i18n="prem.modal.p2">Eles fazem parte do plano Premium. Para pedir o Premium, fale com a Prof. Brune pelo botão abaixo.</p>
      <div id="premium-challenges-contact" class="premium-contact-wrap"></div>
    </div>
  </div>
</div>
`;
}
// Monta a seção e a janela quando o site não as tem no index.html (o fr tem: nada muda). Chamada por
// wireChallengesScreen() antes de ligar os listeners.
function mountChallengesScreen(){
  const view = document.getElementById('view-challenges');
  let mounted = false;
  if (view && !view.children.length){ view.innerHTML = challengesScreenHTML(); mounted = true; }
  if (!document.getElementById('premium-challenges-modal')){ document.body.insertAdjacentHTML('beforeend', challengesPremiumModalHTML()); mounted = true; }
  if (typeof challengesImportModalHTML === 'function' && !document.getElementById('challenges-import-modal')){ document.body.insertAdjacentHTML('beforeend', challengesImportModalHTML()); mounted = true; }
  if (mounted){
    if (typeof applyDomI18n === 'function') applyDomI18n(document);
    applyChallengeI18n();
  }
}

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

  // A fila "Revisar erros" abre o player direto da tela de categorias (sem passar pela lista): sem esconder as categorias,
  // elas ficavam empilhadas acima do player.
  document.getElementById('challenges-categories-wrap').style.display = 'none';
  document.getElementById('challenges-list-wrap').style.display = 'none';
  document.getElementById('challenge-player-wrap').style.display = 'block';
  document.getElementById('challenge-preview-banner').style.display = 'none';
  // Barra do topo no molde da trilha (X, ⌨️, ⚑, progresso): por enquanto só nas Expressões (shared/activity-focus.js).
  const playerWrap = document.getElementById('challenge-player-wrap');
  if (c.type === 'expression') playerWrap.dataset.lessonBar = '1'; else delete playerWrap.dataset.lessonBar;
  if (typeof syncActivityFocus === 'function') syncActivityFocus();
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

// ---------- Expressões em passos curtos, no molde da trilha (decisão da autora, 2026-10-26) ----------
// 1) pergunta com "Meu palpite" (livre, NÃO corrigido) e "Ver opções"; 2) resposta (opções coloridas + painel curto + Continuar);
// 3) "Veja em frases"; 4) "Sua vez" (digitar; o "Quase" é o da trilha, typedAnswerVerdictForExpected); 5) final ("Ir além" + Concluir
// ou Tentar de novo). A barra do topo (progresso, ⚑, ⌨️, X) é a de shared/activity-focus.js (data-lesson-bar no #challenge-player-wrap).
// XP da "Sua vez": só na PRIMEIRA conclusão do desafio (refazer concluído = 0, como na trilha), pago ao tocar em Concluir.
const EXPR_LAST_STEP = 4;
let EXPR_RUN = null; // { c, chosenIdx, isCorrect, revealed, answered, guess, turn: { verdict, revealed, typed }, xpPaid }

function exprHeadHTML(c){
  return `<div class="lesson-unit-context"><div class="lesson-hint-eyebrow">${chT('ch.title')}${c.level ? ' · ' + escapeHtmlChallenge(c.level) : ''}</div>
    <div class="lesson-unit-title">${chT('ch.cat.expression.title')}</div></div>`;
}

// A barra do topo mora dentro do conteúdo: pega antes de reescrever e recoloca logo abaixo do cabeçalho.
function exprRender(c, html, step){
  const content = document.getElementById('challenge-player-content');
  const bar = typeof activityBarGrab === 'function' ? activityBarGrab('challenge-player-wrap') : null;
  stopExerciseAudio();
  clearKeyboardOptions();
  content.innerHTML = exprHeadHTML(c) + html;
  if (typeof activityBarMount === 'function') activityBarMount('challenge-player-wrap', bar, '.lesson-unit-context');
  if (typeof activityBarProgress === 'function') activityBarProgress('challenge-player-wrap', Math.round(100 * step / EXPR_LAST_STEP));
  window.scrollTo(0, 0);
}

function exprWireAudio(id, file, rate){
  const btn = document.getElementById(id);
  if (btn && file) btn.addEventListener('click', (e) => playPregeneratedAudio(`challenges/${file}`, e.currentTarget, false, rate));
}

function exprMeaningBoxHTML(c){
  // Site em outro idioma: o sentido vem da tradução do desafio (fr/challenges.en.js, campo `meaning`) quando existe.
  const ov = challengeOverlay(c);
  const meaningShown = (ov && ov.meaning) ? ov.meaning : (c.meaning || {}).pt;
  return `<div class="feedback-inner-box expr-meaning-box"><strong>${escapeHtmlChallenge(c.canonicalExpression)}</strong><br>
    ${expressionMeaningLineHTML('ch.expr.signifies', 'fr', (c.meaning || {})[chCfg().lang])}<br>
    ${expressionMeaningLineHTML('ch.expr.inPt', 'pt', meaningShown)}
    ${c.explanation ? `<p class="challenge-explanation">${escapeHtmlChallenge(c.explanation)}</p>` : ''}</div>`;
}

function renderExpressionQuestionScreen(c){
  EXPR_RUN = { c, chosenIdx: null, isCorrect: false, revealed: false, answered: false, guess: '', turn: null, xpPaid: false };
  exprRender(c, `
    <div class="exercise-wrap expr-wrap">
      <div class="exercise-prompt-label">${chT('ch.expr.whatMeans')}</div>
      <div class="exercise-prompt">
        <div class="prompt-french">${escapeHtmlChallenge(c.canonicalExpression)}</div>
        <div class="audio-btn-row">
          <button class="audio-btn" id="challenge-expression-play-btn" aria-label="${chT('ch.listenPron')}" title="${chT('ch.listenPron')}">🔊</button>
          ${c.expressionAudioFile ? slowAudioIconBtnHTML('challenge-expression-play-slow-btn') : ''}
        </div>
        ${c.register ? `<div class="expr-question-reg">${expressionRegisterChipHTML(c)}</div>` : ''}
      </div>
      <div id="expr-stage">
        <div class="expr-guess">
          <label class="expr-guess-label" for="expr-guess-input">${chT('ch.expr.guessLabel')}</label>
          <input type="text" class="expr-guess-input" id="expr-guess-input" maxlength="120" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${chT('ch.expr.guessPlaceholder')}">
        </div>
        <div class="expr-guess-actions"><button class="btn btn-secondary" id="expr-see-options-btn">${chT('ch.expr.seeOptions')}</button></div>
      </div>
    </div>`, 0);
  exprWireAudio('challenge-expression-play-btn', c.expressionAudioFile);
  exprWireAudio('challenge-expression-play-slow-btn', c.expressionAudioFile, SLOW_AUDIO_RATE);
  const input = document.getElementById('expr-guess-input');
  document.getElementById('expr-see-options-btn').addEventListener('click', () => exprShowOptions(c));
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter'){ e.preventDefault(); exprShowOptions(c); } });
}

// O palpite é só reflexão: guardado na tela, nunca corrigido nem enviado.
function exprShowOptions(c){
  const run = EXPR_RUN;
  const stage = document.getElementById('expr-stage');
  if (!run || !stage || run.answered) return;
  run.guess = (document.getElementById('expr-guess-input') || { value: '' }).value.trim();
  const shuffled = shuffle(c.options.map((text, i) => ({ text, origIdx: i })));
  stage.innerHTML = `
    ${run.guess ? `<p class="expr-guess-line">${chT('ch.expr.yourGuess')} <strong>“${escapeHtmlChallenge(run.guess)}”</strong></p>` : ''}
    <div class="exercise-options">${shuffled.map(o =>
      `<button class="exercise-option" data-orig-idx="${o.origIdx}"><div class="opt-text">${escapeHtmlChallenge(o.text)}</div></button>`).join('')}</div>
    <button class="exercise-dontknow" id="expr-dontknow-btn">${t('common.dontKnow')}</button>`;
  const btns = stage.querySelectorAll('.exercise-option');
  btns.forEach(b => b.addEventListener('click', () => exprAnswer(c, parseInt(b.dataset.origIdx, 10))));
  document.getElementById('expr-dontknow-btn').addEventListener('click', () => exprAnswer(c, null));
  wireKeyboardOptions(btns, { mode: 'sequential' });
}

// origIdx null = "Não sei": revela a resposta, conta como erro e fica em silêncio (como na trilha).
function exprAnswer(c, origIdx){
  const run = EXPR_RUN;
  if (!run || run.answered) return;
  run.answered = true;
  run.revealed = origIdx == null;
  run.chosenIdx = origIdx;
  run.isCorrect = !run.revealed && c.options[origIdx] === c.correctAnswer;
  const stage = document.getElementById('expr-stage');
  stage.querySelectorAll('.exercise-option').forEach(b => {
    b.disabled = true;
    const text = c.options[parseInt(b.dataset.origIdx, 10)];
    if (text === c.correctAnswer) b.classList.add('correct');
    else if (!run.revealed && parseInt(b.dataset.origIdx, 10) === origIdx) b.classList.add('incorrect');
  });
  const dk = document.getElementById('expr-dontknow-btn');
  if (dk) dk.classList.add('disabled');
  if (!run.revealed) playFeedbackSound(run.isCorrect);
  recordChallengeReviewOutcome(c, run.isCorrect ? 'ok' : 'fail');
  if (typeof activityBarProgress === 'function') activityBarProgress('challenge-player-wrap', Math.round(100 / EXPR_LAST_STEP));
  const panel = document.createElement('div');
  panel.className = (run.isCorrect ? 'correct-feedback' : 'wrong-feedback') + ' expr-panel';
  panel.innerHTML = run.isCorrect ? `
    <div class="feedback-card-body">
      <div class="correct-feedback-header">✅ ${nextCorrectFeedbackPhrase()}</div>
      ${exprMeaningBoxHTML(c)}
      <button class="btn btn-primary btn-block correct-feedback-continue" id="expr-continue-btn">${t('common.continueArrow')}</button>
    </div>` : `
    <div class="feedback-card-body">
      <div class="wrong-feedback-header">${t(run.revealed ? 'feedback.header.revealed' : 'feedback.header.notThisTime')}</div>
      ${run.revealed ? '' : `<div class="wrong-feedback-why"><div class="wrong-feedback-why-label">${t('feedback.label.yourAnswer')}</div>
        <div class="feedback-inner-box">${escapeHtmlChallenge(c.options[origIdx])}</div></div>`}
      <div class="wrong-feedback-why"><div class="wrong-feedback-why-label">${t('feedback.label.answer')}</div>${exprMeaningBoxHTML(c)}</div>
      <button class="btn btn-primary btn-block wrong-feedback-continue" id="expr-continue-btn">${t('common.continueArrow')}</button>
    </div>`;
  stage.parentElement.appendChild(panel);
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  document.getElementById('expr-continue-btn').addEventListener('click', () => exprShowExamples(c));
}

function exprShowExamples(c){
  const exs = [c.example, c.secondExample].filter(ex => ex && ex.text);
  if (!exs.length) return exprShowYourTurn(c);
  exprRender(c, `
    <div class="exercise-wrap expr-wrap">
      <div class="exercise-prompt-label">${chT('ch.expr.seeInSentences')}</div>
      ${exs.map((ex, i) => `
        <div class="exercise-prompt expr-example">
          <div class="expr-example-label">${chT('ch.expr.example' + (i + 1))}</div>
          <div class="expr-example-text" lang="${chCfg().lang}">${escapeHtmlChallenge(ex.text)}</div>
          ${ex.audioFile ? `<div class="audio-btn-row"><button class="dictation-play-btn" id="expr-ex${i}-play">${chT('ch.listenFr')}</button>${slowAudioBtnHTML('expr-ex' + i + '-slow')}</div>` : ''}
        </div>`).join('')}
      <button class="btn btn-primary btn-block" id="expr-continue-btn">${t('common.continueArrow')}</button>
    </div>`, 2);
  exs.forEach((ex, i) => { exprWireAudio(`expr-ex${i}-play`, ex.audioFile); exprWireAudio(`expr-ex${i}-slow`, ex.audioFile, SLOW_AUDIO_RATE); });
  document.getElementById('expr-continue-btn').addEventListener('click', () => exprShowYourTurn(c));
}

// Respostas aceitas da "Sua vez": a do conteúdo (várias formas separadas por "/", como no resto do site) e, se o autor
// quiser, `microActivity.alsoAccept` (lista). Nada de variação inventada: só vale o que o autor escreveu + o "Quase" da trilha.
function exprTurnExpected(c){
  const m = c.microActivity || {};
  return [m.answer].concat(Array.isArray(m.alsoAccept) ? m.alsoAccept : []).filter(Boolean).join(' / ');
}
function exprTurnSentenceHTML(c, filled){
  const m = c.microActivity;
  const answer = String(m.answer || '').split('/')[0].trim();
  return escapeHtmlChallenge(m.prompt).replace(/_{3,}/, filled
    ? `<strong class="expr-filled">${escapeHtmlChallenge(answer)}</strong>`
    : '<span class="expr-blank" aria-label="___">&nbsp;</span>');
}

function exprShowYourTurn(c){
  const m = c.microActivity;
  if (!m || !m.prompt || !m.answer) return exprShowFinal(c);
  exprRender(c, `
    <div class="exercise-wrap expr-wrap">
      <div class="exercise-prompt-label">${chT('ch.expr.yourTurn')}</div>
      <div class="exercise-prompt"><div class="expr-turn-sentence" lang="${chCfg().lang}">${exprTurnSentenceHTML(c, false)}</div></div>
      <div id="expr-turn-stage">
        <label class="expr-guess-label" for="expr-turn-input">${chT('ch.expr.fillBlank')}</label>
        <input type="text" class="expr-guess-input" id="expr-turn-input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${chT('ch.expr.turnPlaceholder')}">
        ${chCfg().accentPickerHTML(m.answer)}
        <button class="btn btn-primary btn-block expr-verify" id="expr-turn-verify-btn">${chT('ch.verify')}</button>
        <button class="exercise-dontknow" id="expr-turn-dontknow-btn">${t('common.dontKnow')}</button>
      </div>
    </div>`, 3);
  const input = document.getElementById('expr-turn-input');
  chCfg().wireAccentPicker(document.getElementById('expr-turn-stage'), input);
  input.focus();
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter'){ e.preventDefault(); exprCheckTurn(c, false); } });
  document.getElementById('expr-turn-verify-btn').addEventListener('click', () => exprCheckTurn(c, false));
  document.getElementById('expr-turn-dontknow-btn').addEventListener('click', () => exprCheckTurn(c, true));
}

function exprCheckTurn(c, revealed){
  const run = EXPR_RUN;
  if (!run || run.turn) return;
  const input = document.getElementById('expr-turn-input');
  const typed = input.value.trim();
  if (!revealed && !typed){ input.focus(); return; }
  const verdict = revealed ? 'errou' : typedAnswerVerdictForExpected(typed, exprTurnExpected(c));
  run.turn = { verdict, revealed, typed };
  input.disabled = true;
  document.getElementById('expr-turn-verify-btn').disabled = true;
  document.getElementById('expr-turn-dontknow-btn').classList.add('disabled');
  if (!revealed) playFeedbackSound(verdict !== 'errou');
  const good = verdict !== 'errou';
  const answer = String(c.microActivity.answer).split('/')[0].trim();
  const panel = document.createElement('div');
  panel.className = (good ? 'correct-feedback' : 'wrong-feedback') + ' expr-panel';
  const full = `<div class="feedback-inner-box expr-turn-full" lang="${chCfg().lang}">${exprTurnSentenceHTML(c, true)}</div>`;
  panel.innerHTML = good ? `
    <div class="feedback-card-body">
      <div class="correct-feedback-header">✅ ${nextCorrectFeedbackPhrase()}</div>
      ${verdict === 'quase' ? `<div class="review-almost">${escapeHTML(t('review.almost'))}</div>` : ''}
      ${full}
      <button class="btn btn-primary btn-block correct-feedback-continue" id="expr-continue-btn">${t('common.continueArrow')}</button>
    </div>` : `
    <div class="feedback-card-body">
      <div class="wrong-feedback-header">${t(revealed ? 'feedback.header.revealed' : 'feedback.header.notThisTime')}</div>
      ${typed ? `<div class="wrong-feedback-why"><div class="wrong-feedback-why-label">${t('feedback.label.yourAnswer')}</div>
        <div class="feedback-inner-box">${typedAttemptHTML(typed, answer)}</div></div>` : ''}
      <div class="wrong-feedback-why"><div class="wrong-feedback-why-label">${t('feedback.label.fullSentence')}</div>${full}</div>
      <button class="btn btn-primary btn-block wrong-feedback-continue" id="expr-continue-btn">${t('common.continueArrow')}</button>
    </div>`;
  document.getElementById('expr-turn-stage').parentElement.appendChild(panel);
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  document.getElementById('expr-continue-btn').addEventListener('click', () => exprShowFinal(c));
}

// XP da "Sua vez" (constantes de shared/srs.js, ver .claude/rules/xp.md): digitar certo = EXERCISE_XP_PRODUCE, "quase" =
// EXERCISE_XP_ALMOST, errou ou "Não sei" = 0. Só vale na PRIMEIRA conclusão do desafio (refazer concluído = 0).
function exprTurnXP(c){
  const run = EXPR_RUN;
  if (!run || run.c.id !== c.id || !run.turn || run.turn.revealed) return 0;
  if (isChallengeCompleted(c.id) || challengePreviewMode) return 0;
  return run.turn.verdict === 'ok' ? EXERCISE_XP_PRODUCE : run.turn.verdict === 'quase' ? EXERCISE_XP_ALMOST : 0;
}

function exprShowFinal(c){
  const run = EXPR_RUN;
  const ok = run.isCorrect;
  const turn = run.turn;
  const xp = exprTurnXP(c);
  const mark = v => v === 'ok' ? '✓' : v === 'quase' ? '~' : '✕';
  exprRender(c, `
    <div class="exercise-wrap expr-wrap expr-final">
      <div class="expr-final-ico" aria-hidden="true">${ok ? '🎉' : '💪'}</div>
      <h3 class="expr-final-title">${chT(ok ? 'ch.expr.finalOk' : 'ch.expr.finalFail')}</h3>
      <ul class="expr-final-sum">
        <li><span>${chT('ch.expr.sumChoice')}</span><b>${ok ? '✓' : '✕'}</b></li>
        ${turn ? `<li><span>${chT('ch.expr.sumTurn')}</span><b>${turn.revealed ? '✕' : mark(turn.verdict)}</b></li>` : ''}
        ${xp ? `<li><span>${chT('ch.expr.sumXp')}</span><b>+${xp} XP</b></li>` : ''}
      </ul>
      ${challengeExternalResourcesHTML(c)}
      ${ok ? challengeCompleteButtonHTML() : challengeRetryButtonsHTML()}
    </div>`, EXPR_LAST_STEP);
  // O XP é pago antes do "Concluir" marcar o desafio como concluído (o listener de baixo roda depois deste).
  const done = document.getElementById('challenge-complete-btn');
  if (done) done.addEventListener('click', () => { if (!run.xpPaid){ run.xpPaid = true; addXP(exprTurnXP(c)); } });
  wireChallengeCompleteButton(c);
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
  let personMismatch, outcome, analysis = null;
  if (i18nCmp){
    personMismatch = lt.cmp.personMismatch(studentAnswer);
    outcome = (!personMismatch && lt.cmp.isAcceptable(studentAnswer, lt.refs)) ? 'ok' : 'fail';
  } else {
    personMismatch = translationHasPersonMismatch(studentAnswer);
    outcome = listenTranslateOutcome(studentAnswer, c.referenceTranslations, personMismatch, c);
    analysis = analyzeTranslation(studentAnswer, c.referenceTranslations, c);
  }
  const isCorrect = outcome === 'ok';
  // Desafio de conteúdo continua clicável mesmo já concluído -- não dá XP
  // (mesma decisão de answerChallenge, ver auditoria do sistema de XP).

  const marked = (outcome !== 'ok' && studentAnswer && analysis) ? markTranslationWords(studentAnswer, analysis.bestRef || c.referenceTranslations[0]) : null;
  const yoursHTML = marked ? markedWordsHTML(marked.student) : escapeHtmlChallenge(studentAnswer || '—');
  const expectedHTML = marked ? markedWordsHTML(marked.reference) : escapeHtmlChallenge((analysis && analysis.bestRef) || lt.refs[0]);
  const ltBodyHTML = `
      ${personMismatch ? `<p class="listen-translate-feedback-warning">${chT('ch.lt.agreement', { pronoun: escapeHtmlChallenge(personMismatch.pronoun), verb: escapeHtmlChallenge(personMismatch.verb) })}</p>` : ''}
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
  document.getElementById('lt-feedback-wrap').innerHTML = challengeFeedbackWrapperHTML('listen-translate', isCorrect, outcome === 'ok' ? chT('ch.lt.right') : outcome === 'partial' ? chT('ch.lt.partial') : chT('ch.notQuite'), ltBodyHTML, outcome);
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

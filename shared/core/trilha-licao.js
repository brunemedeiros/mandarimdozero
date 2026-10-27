// E4 lote paridade 5d-4: trilha e lição: abrir a unidade, passos, progresso, palavra nova, unidade concluída (paridade 5d, parte 4).
// Unifica funções que eram QUASE iguais em fr/app.js e zh/app.js. O que mudava por idioma passou para os ganchos LANG_HOOKS
// (fr/lang-hooks.js e zh/lang-hooks.js, carregados antes do app.js) ou para uma verificação explícita (typeof/in) no próprio código.
// Mesmos nomes globais; nenhuma chamada muda. Carregado antes do app.js.

function renderStepProgress(){
  const fillEl = document.getElementById('step-progress-fill');
  const u = UNITS.find(x => x.id === STATE.currentUnitId);
  const defs = currentStepDefs(u);
  const stepCount = defs.length;
  const stepKey = defs[STEP_STATE.currentStep].key;

  let intraStepFraction = 0;
  if (stepKey === 'vocab' && u && STEP_STATE.acq.unitId === u.id){
    // Progresso pelo NÚMERO DE PALAVRAS já cobertas (blocos inteiros já
    // concluídos + posição dentro do bloco/fase atual) -- mas, dentro da
    // fase atual, evolui exercício a exercício (mesmo dado do contador
    // "Exercício X de Y"), não pula direto pro fim da fase ao entrar nela.
    const acq = STEP_STATE.acq;
    const totalWords = (isLessonUnit(u) ? (acq.blocks[0] || []).length : (u.vocab || []).length) || 1;
    const wordsBeforeBlock = acq.blocks.slice(0, acq.blockIdx).flat().length;
    const curBlockSize = (acq.blocks[acq.blockIdx] || []).length;

    const seq = acqPhaseSequence(u, acq);
    const phaseIdx = seq.indexOf(acq.phase);
    const [rangeStart, rangeEnd] = phaseIdx >= 0 ? [phaseIdx / seq.length, (phaseIdx + 1) / seq.length] : [0, 1];
    const phaseFraction = acq.phase === 'intro'
      ? (curBlockSize ? acq.introIdx / curBlockSize : 0)
      : (STEP_STATE.exerciseList.length ? STEP_STATE.exerciseIndex / STEP_STATE.exerciseList.length : 0);
    const withinBlock = rangeStart + (rangeEnd - rangeStart) * phaseFraction;

    intraStepFraction = Math.min(1, (wordsBeforeBlock + curBlockSize * withinBlock) / totalWords);
  } else if (stepKey === 'exercises' || stepKey === 'checkpointExercises'){
    intraStepFraction = STEP_STATE.exerciseList.length ? STEP_STATE.exerciseIndex / STEP_STATE.exerciseList.length : 0;
  } else {
    const gramFraction = grammarStepFraction(u, stepKey); // shared/core/gramatica-cenario.js
    if (gramFraction != null) intraStepFraction = gramFraction;
  }

  const pct = ((STEP_STATE.currentStep + intraStepFraction) / stepCount) * 100;
  fillEl.style.width = `${Math.min(100, Math.max(0, pct))}%`;
}

// Cartão de introdução de UMA palavra do bloco atual (ETAPA 1). Mesmo
// conteúdo/recursos de antes (palavra, áudio, tradução, "Já sei?", frase de
// exemplo) -- só a posição mudou: em vez de "Palavra X de N" (a unidade
// inteira), mostra a posição dentro do pequeno bloco atual.
function renderBlockIntroCard(u, contentEl, nextBtn){
  const acq = STEP_STATE.acq;
  const block = acq.blocks[acq.blockIdx];
  const posInBlock = acq.introIdx;
  const idx = block[posInBlock];
  const v = u.vocab[idx];
  const cardId = studyWordCardId(u, idx); // chave estável do item (shared/study-trail-model.js)
  const card = STATE.cards.find(c => c.id === cardId);
  const alreadyKnown = studyWordHasEvidence(studyWordCardsFor(STATE.cards, u.id, idx)); // K2-E: nível de palavra
  const matchingPhrase = findMatchingPhrase(v, u);
  acq.introduced[idx] = true;

  const phraseHTML = matchingPhrase ? `
    <div class="vocab-phrase-example">
      <div class="vocab-phrase-label">${t('fr.blockIntro.inPhrase')}</div>
      ${LANG_HOOKS.introPhraseHTML(matchingPhrase)}
      <div class="vocab-phrase-trans">${matchingPhrase.t}</div>
    </div>
  ` : '';

  contentEl.innerHTML = `
    <div class="vocab-card-counter" role="img" aria-label="${t('lesson.vocabDots.aria', { pos: posInBlock + 1, total: block.length })}">${block.map((_, i) => `<span class="vc-dot${i <= posInBlock ? ' on' : ''}"></span>`).join('')}</div>
    <div class="vocab-card">
      ${LANG_HOOKS.introWordHTML(v)}
      <div class="vocab-card-trans">${v.t}</div>
      <button class="know-btn ${alreadyKnown ? 'known' : ''}" data-card-id="${cardId}" title="${t('fr.blockIntro.markKnownTitle')}">
        ${alreadyKnown ? t('zh.path.knownDone') : t('zh.path.knownAsk')}
      </button>
    </div>
    ${phraseHTML}
  `;

  wireAudioButtons(contentEl);
  LANG_HOOKS.wireIntroCard(contentEl);
  wireKnowButtons(contentEl);

  if (LANG_HOOKS.canSpeak(LANG_HOOKS.textOf(v))){
    const mainAudioBtn = contentEl.querySelector('.vocab-card .audio-btn');
    LANG_HOOKS.speak(LANG_HOOKS.textOf(v), mainAudioBtn, true);
  }

  nextBtn.style.display = 'flex';
  nextBtn.textContent = posInBlock < block.length - 1 ? t('zh.path.nextWordArrow') : t('zh.path.seeWhatLearnedArrow');
}

function buildUnitBlock(u){
  const state = unitBlockState(u);
  const unlocked = state !== 'locked';
  const isFinished = state === 'done' || state === 'skipped';
  const isGrammar = unitTypeOf(u) === 'grammar';
  // Só unidades com 2+ lições (Modelo B) ganham a lista expansível -- uma
  // unidade do motor antigo não tem lições reais pra mostrar (ver "Hierarquia
  // da Trilha", seção 11), então vira uma linha só, sem seta.
  const hasLessons = isLessonUnit(u) && u.lessons.length > 1;
  const { dueForReview } = unitCardCounts(u.id);

  const defaultExpanded = state === 'current';
  const expanded = hasLessons && (
    UNIT_BLOCK_EXPAND_OVERRIDE[u.id] !== undefined ? UNIT_BLOCK_EXPAND_OVERRIDE[u.id] : defaultExpanded
  );

  const pct = Math.round(unitProgressFraction(u) * 100);
  let fracLabel;
  if (isGrammar) fracLabel = state === 'done' ? t('trail.unit.done') : (state === 'skipped' ? t('trail.unit.skipped') : '');
  else if (hasLessons){
    const doneLessons = isFinished ? u.lessons.length : currentLessonIdx(u.id);
    fracLabel = tp('trail.unit.lessonsProgress', u.lessons.length === 1 ? 1 : 2, { done: doneLessons, total: u.lessons.length });
  }
  else fracLabel = `${pct}%`;
  if (dueForReview > 0) fracLabel += ` · 🔁 ${dueForReview}`;

  const block = document.createElement('div');
  block.className = 'unit-block'
    + (isGrammar ? ' grammar' : '')
    + (state === 'locked' ? ' locked' : '')
    + (state === 'done' ? ' done' : '')
    + (state === 'skipped' ? ' skipped' : '')
    + (state === 'current' ? ' current' : '')
    + (state === 'available' ? ' available' : '')
    + (expanded ? ' expanded' : '');
  if (state === 'current') block.setAttribute('aria-current', 'step');

  const badgeHTML = state === 'done' ? `<span class="ub-badge">✓</span>`
    : state === 'skipped' ? `<span class="ub-badge ub-badge-skipped" title="${t('trail.unit.skippedTitle')}">${t('trail.unit.skippedBadge')}</span>` : '';
  const typeChipHTML = isGrammar ? `<span class="ub-type-chip grammar">${t('trail.unit.grammarChip')}</span>` : '';
  const chevronHTML = hasLessons ? `<button class="ub-chevron" type="button" aria-label="${t(LANG_HOOKS.lessonKeys.expandLessons)}">▾</button>` : '';
  // Só lições JÁ concluídas (e que não são o Ponto de verificação, cujo
  // reteste tem efeitos colaterais bem mais pesados -- desbloqueio de
  // módulo/nível -- fora do escopo desta revisão leve) ficam clicáveis pra
  // reabrir em modo revisão (ver openLessonReview). "current" já abre
  // normal pelo cabeçalho da unidade; "locked" fica inerte.
  const lessonsHTML = hasLessons ? `
    <div class="ub-lessons" style="${expanded ? '' : 'display:none;'}">
      ${u.lessons.map((l, i) => {
        const st = lessonRowState(u, i);
        // Bypass de admin (ver comentário de isAdminUser acima) só se
        // aplica com Admin Mode ON -- OFF cai exatamente na mesma regra
        // usada por qualquer aluno (unlocked && já concluída), sem
        // segunda implementação (Fase 11 da spec de Admin Mode).
        // A lição atual (a próxima a fazer) abre de verdade pelo próprio título e
        // conta progresso, igual a clicar no cabeçalho da unidade (2026-10-07).
        const opensForReal = unlocked && st === 'current';
        const clickable = opensForReal || (isAdminUser() && isAdminModeOn()) || (unlocked && (st === 'done' || st === 'skipped') && !l.isCheckpoint);
        return `
          <div class="ub-lesson-row ${st}${clickable ? ' clickable' : ''}" ${clickable ? `data-lesson-idx="${i}"${opensForReal ? ' data-lesson-open="1"' : ''} role="button" tabindex="0"` : ''}>
            <div class="ub-lesson-dot ${st}">${st === 'done' ? '✓' : (st === 'skipped' ? '•' : i + 1)}</div>
            <div class="ub-lesson-title">${l.title}</div>
          </div>
        `;
      }).join('')}
    </div>
  ` : '';

  block.innerHTML = `
    <div class="ub-header">
      <div class="ub-icon">${UNIT_ICONS[u.id] || '📖'}</div>
      <div class="ub-info">
        <div class="ub-title-row"><span class="ub-title">${u.title}</span>${typeChipHTML}${badgeHTML}</div>
        ${u.goal ? `<div class="ub-goal">${u.goal}</div>` : ''}
      </div>
      <div class="ub-frac">${fracLabel}</div>
      ${chevronHTML}
    </div>
    ${lessonsHTML}
  `;

  wireHeaderActivation(block.querySelector('.ub-header'), (e) => {
    if (e.target.closest('.ub-chevron')) return;
    if (unlocked) openUnitDetail(u.id);
  });
  const chevron = block.querySelector('.ub-chevron');
  if (chevron){
    chevron.addEventListener('click', (e) => {
      e.stopPropagation();
      UNIT_BLOCK_EXPAND_OVERRIDE[u.id] = !expanded;
      renderUnitsGrid();
    });
  }
  block.querySelectorAll('.ub-lesson-row.clickable').forEach(row => {
    row.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(row.dataset.lessonIdx, 10);
      if (row.dataset.lessonOpen) openUnitDetail(u.id);
      else openLessonReview(u.id, idx);
    });
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); row.click(); }
    });
  });
  return block;
}

function openUnitDetail(unitId){
  STATE.currentUnitId = unitId;
  STATE.unitProgress[unitId].started = true;
  STEP_STATE.onChallengesScreen = false;
  STEP_STATE.onCheckpoint = null;
  STEP_STATE.onLevelTest = null;
  STEP_STATE.onLessonBoundaryScreen = null;
  STEP_STATE.onUnitCompleteScreen = false;
  STEP_STATE.conceptQueue = [];
  STEP_STATE.conceptsShown = new Set();
  STEP_STATE.comboCount = 0;
  // Invalida o estado de aquisição antigo -- sem isso, reabrir a MESMA
  // unidade numa lição diferente da última vez reaproveitaria os blocos da
  // lição errada.
  STEP_STATE.acq = { unitId: null, blocks: [], blockIdx: 0, phase: 'intro', introIdx: 0, wordMisses: {}, introduced: {}, lessonScore: { correct: 0, total: 0 }, xpAtLessonStart: STATE.xp };
  STEP_STATE.exerciseUnitId = null;
  STEP_STATE.checkpointUnitId = null;
  STEP_STATE.checkpointXpAtStart = null;
  setLessonFocusMode(true);

  document.getElementById('path-list-wrap').style.display = 'none';
  document.getElementById('unit-detail-wrap').style.display = 'block';
  document.getElementById('step-progress-wrap').style.display = '';
  document.getElementById('step-back-btn').style.display = '';

  const u = UNITS.find(x => x.id === unitId);
  // Unidades de gramática não mostram numeração ao aluno — só "Gramática",
  // sem "X de Y" (o cálculo interno via unitOrdinalInfo continua existindo,
  // só não é mais renderizado aqui).
  document.getElementById('ud-eyebrow').textContent = LANG_HOOKS.unitEyebrow(u);
  document.getElementById('ud-title').textContent = u.title;
  document.getElementById('ud-goal').textContent = u.goal;
  LANG_HOOKS.afterOpenUnit(u); // zh: botão "Manual da unidade" (some na unidade de gramática)
  const langNotice = document.getElementById('ud-lang-notice');
  if (langNotice){
    const untranslated = !CONTENT_I18N.isUnitTranslated(u.id);
    langNotice.hidden = !untranslated;
    langNotice.textContent = untranslated ? t('content.untranslatedNotice') : '';
  }

  STEP_STATE.currentStep = 0;
  renderStep();

  saveState();
  renderTopbarStats();

  if (typeof routerNavigate === 'function') routerNavigate({ type: 'unit', unitId });
}

function renderStep(){
  stopExerciseAudio();
  const u = UNITS.find(x => x.id === STATE.currentUnitId);
  const stepKey = currentStepDefs(u)[STEP_STATE.currentStep].key;
  const contentEl = document.getElementById('step-content');
  const backBtn = document.getElementById('step-back-btn');
  const nextBtn = document.getElementById('step-next-btn');
  hideAcqPhaseBanner();

  renderStepProgress();
  // Durante checkpoint/practice/mixed, o "Voltar" não faz sentido (a
  // navegação é do próprio motor de exercícios, sem histórico pra desfazer)
  // -- só aparece na introdução do bloco.
  // Na micro-checagem do diálogo não há "Voltar": voltar ao diálogo
  // deixaria copiar as respostas.
  const showBack = stepKey !== 'dialogueCheck' && (STEP_STATE.currentStep > 0
    || (stepKey === 'vocab' && STEP_STATE.acq.phase === 'intro' && (STEP_STATE.acq.blockIdx > 0 || STEP_STATE.acq.introIdx > 0))
    || grammarShowBack(stepKey));
  backBtn.style.display = showBack ? 'inline-flex' : 'none';

  // Unidade de gramática: passos próprios (shared/core/gramatica-cenario.js).
  if (renderGrammarUnitStep(u, stepKey, contentEl, nextBtn)) return;

  if (stepKey === 'vocab'){
    if (STEP_STATE.acq.unitId !== u.id || (isLessonUnit(u) && STEP_STATE.acq.lessonIdx !== currentLessonIdx(u.id))){
      STEP_STATE.acq = freshAcquisitionState(u.id, u);
    }
    if (STEP_STATE.acq.phase === 'bridge'){
      startBridgeQueue(u);
    } else if (STEP_STATE.acq.phase === 'intro'){
      renderBlockIntroCard(u, contentEl, nextBtn);
    } else {
      // checkpoint / practice / mixed reaproveitam o motor de exercícios
      // (STEP_STATE.exerciseList/exerciseIndex) -- a navegação própria dele
      // controla o avanço, sem o botão global "Continuar".
      const bannerText = acqPhaseBannerText(STEP_STATE.acq.phase);
      if (bannerText) setAcqPhaseBanner(bannerText);
      renderExerciseStep();
      nextBtn.style.display = 'none';
    }

  } else if (stepKey === 'exercises'){
    if (!STEP_STATE.exerciseList.length || STEP_STATE.exerciseUnitId !== u.id){
      STEP_STATE.exerciseList = buildExerciseSet(u);
      STEP_STATE.exerciseUnitId = u.id;
      STEP_STATE.exerciseIndex = 0;
      STEP_STATE.exerciseScore = 0;
      // XP real da tela de conclusão (mesmo raciocínio de xpAtLessonStart
      // em freshAcquisitionState) -- captura antes de qualquer addXP() desta
      // sessão de consolidação.
      STEP_STATE.checkpointXpAtStart = STATE.xp;
    }
    setAcqPhaseBanner(t('zh.path.banner.consolidation'));
    renderExerciseStep();

  } else if (stepKey === 'checkpointExercises'){
    // Lição final de uma unidade migrada (Modelo B) -- "Ponto de
    // verificação". Se o aluno acumulou 3+ palavras erradas ao longo das
    // lições anteriores DESTA unidade, roda primeiro uma "Revisão dos
    // Erros" isolada (✱); só depois entra na consolidação normal
    // (buildExerciseSet, já prioriza quem errou, mas cobre a unidade
    // inteira).
    if (STEP_STATE.checkpointUnitId !== u.id){
      STEP_STATE.checkpointUnitId = u.id;
      STEP_STATE.checkpointMisses = {};
      // XP real da tela de conclusão do checkpoint (mesmo raciocínio de
      // xpAtLessonStart em freshAcquisitionState) -- captura antes da
      // eventual Revisão dos Erros e da consolidação principal, já que as
      // duas juntas compõem a sessão desta "lição" (o Ponto de verificação).
      STEP_STATE.checkpointXpAtStart = STATE.xp;
      const misses = STATE.unitProgress[u.id].lessonMisses || {};
      const missedIdx = Object.keys(misses).map(Number).filter(i => misses[i] >= 1);
      if (missedIdx.length >= 3){
        STEP_STATE.checkpointPhase = 'errors';
        STEP_STATE.exerciseList = buildBlockCheckpointQueue(u, missedIdx);
      } else {
        STEP_STATE.checkpointPhase = 'main';
        STEP_STATE.exerciseList = buildExerciseSet(u);
      }
      STEP_STATE.exerciseIndex = 0;
      STEP_STATE.exerciseScore = 0;
    }
    setAcqPhaseBanner(STEP_STATE.checkpointPhase === 'errors' ? t('zh.path.banner.errorsReview') : t('zh.path.banner.checkpoint'));
    renderExerciseStep();

  } else if (stepKey === 'dialogue'){
    renderDialogueStep(u, contentEl, nextBtn);

  } else if (stepKey === 'dialogueCheck'){
    renderDialogueCheckStep(u, contentEl, nextBtn);

  } else if (stepKey === 'usage'){
    // Nota de uso da unidade (unidade antiga com `usageNote`; nenhuma unidade de hoje tem).
    const note = u.usageNote;
    contentEl.innerHTML = `
      <div class="usage-note">
        <div class="usage-note-title">${note.title} 🤔</div>
        <p class="usage-note-body">${note.body}</p>
      </div>
    `;
    nextBtn.textContent = t('common.continueArrow');
    nextBtn.style.display = 'flex';
  }
}

function renderUnitsGrid(){
  recalculateUnlockedUnits();
  // Trilha com módulos (fr): seletor de nível, Pontos de verificação etc. (shared/core/modulos-niveis.js). Sem módulos (zh
  // hoje): unidade a unidade, com o que o site põe depois de cada uma (histórias do zh).
  const modular = trailHasModules();
  if (modular){
    ensureTrailTeacherLink();
    // Fase 2: enquanto o aluno não escolheu um nível à mão, a trilha abre no
    // nível da unidade atual (antes voltava ao A1 a cada carregamento).
    if (!STATE.levelUserPicked){
      const nx = nextTrailItem(trailGroups(), STATE.unitProgress);
      const nu = nx && UNITS.find(x => x.id === nx.unitId);
      if (nu && nu.level) STATE.currentLevel = nu.level;
    }
    renderLevelSelect();
  }
  renderDailyGoalChip();
  renderDailyChallengesStrip();
  renderSideRankingCard();
  // Selo de nível concluído no título fixo da trilha (zh: sem seletor de nível); o fr não tem esse elemento.
  const levelBadge = document.getElementById('level-done-badge');
  if (levelBadge) levelBadge.style.display = UNITS.every(u => STATE.unitProgress[u.id]?.completed) ? '' : 'none';

  const grid = document.getElementById('units-grid');
  const levelModules = modular ? modulesOfLevel(STATE.currentLevel) : [];

  if (modular && !levelModules.length){
    grid.innerHTML = `
      <div class="level-empty" style="grid-column: 1 / -1;">
        <div class="big-emoji">🚧</div>
        <h3>${t('trail.comingSoon')}</h3>
        <p>${t('trail.levelPreparing', { level: STATE.currentLevel })}</p>
      </div>
    `;
    grid.insertBefore(buildTrailContinueCard(), grid.firstChild);
    return;
  }

  grid.innerHTML = '';
  grid.appendChild(buildTrailViewToggle(TRAIL_VIEW_KEY, () => renderUnitsGrid()));
  grid.appendChild(buildTrailContinueCard());
  if (trailViewPref(TRAIL_VIEW_KEY) === 'map'){
    const mapRoot = document.createElement('div');
    mapRoot.style.gridColumn = '1 / -1';
    grid.appendChild(mapRoot);
    // Mapa: fr = módulos do nível (shared/core/modulos-niveis.js); zh = renderTrailMapView (módulos ou não, com as histórias).
    LANG_HOOKS.trailMap(mapRoot, levelModules);
    return;
  }

  if (!modular){
    UNITS.forEach((u) => {
      grid.appendChild(buildUnitBlock(u));
      // Checkpoint de história (zh): aparece logo após a unidade que a desbloqueia, como um marco na trilha.
      const extra = LANG_HOOKS.trailAfterUnit(u);
      if (extra) grid.appendChild(extra);
    });
    return;
  }

  // Rótulo do módulo, unidades, Revisão do módulo e Ponto de verificação: shared/core/modulos-niveis.js (paridade B2).
  renderModuleTrailList(grid, levelModules, {
    afterUnit(u, list){
      const extra = LANG_HOOKS.trailAfterUnit(u); // histórias (zh); o fr não põe nada
      if (extra) list.appendChild(extra);
    },
    // Unidade opcional "Desafios do Módulo N" (Premium): o slot nasce vazio e
    // só vira uma linha se o módulo tiver desafios publicados -- os
    // desafios vêm do banco, que a Trilha não carrega por conta própria.
    afterModule(module, list){
      if (typeof appendModuleChallengesSlot === 'function') appendModuleChallengesSlot(module, list); // shared/desafios-telas.js (site com Desafios)
    }
  });
  if (typeof fillModuleChallengeRows === 'function') fillModuleChallengeRows();

  const reviewRow = typeof buildLevelReviewRow === 'function' ? buildLevelReviewRow(STATE.currentLevel) : null; // shared/ditados.js (site com Ditados)
  if (reviewRow) grid.appendChild(reviewRow);

  levelTestsOfLevel(STATE.currentLevel).forEach(test => {
    grid.appendChild(buildLevelTestCard(test));
  });
}

function markUnitCompleted(unitId, scorePct, { skipToast = false } = {}){
  const prog0 = STATE.unitProgress[unitId];
  if (prog0.completed){
    // Unidade pulada pelo Ponto de verificação que o aluno depois estuda de
    // verdade: passa a valer como concluída por lições (selos, XP, etiqueta).
    if (prog0.completedVia !== 'skip_test') return;
    prog0.completedVia = 'lessons';
    prog0.completedAt = todayStr();
  }
  STATE.unitProgress[unitId].completed = true;
  stampUnitCompletion(STATE.unitProgress[unitId], 'lessons', todayStr());
  const u = UNITS.find(x => x.id === unitId);
  const levelUnits = unitsOfLevel(u.level);
  const idx = levelUnits.findIndex(x => x.id === unitId);
  if (idx >= 0 && idx+1 < levelUnits.length){
    STATE.unitProgress[levelUnits[idx+1].id].unlocked = true;
  }
  addXP(25);
  registerStudyToday();
  // Faltava aqui: quem completa um Ponto de verificação como a primeira
  // atividade do dia nunca via nem a tela de sequência nem o pill do
  // topbar atualizado -- o fluxo seguinte (Missões do dia -> Trilha) não
  // chamava maybeShowStreakCelebration() em nenhum ponto.
  maybeShowStreakCelebration();
  if (typeof scorePct === 'number'){
    // Fase 6: estrelas retiradas do fluxo de UNIDADE -- STATE.daily.xp
    // (alimentado dentro de addXP()) já cobre o desafio diário equivalente
    // ('xp50'). registerDailyStars continua existindo pro Ponto de
    // verificação de MÓDULO (completeModuleUnits), sistema separado.
    registerDailyLessonCompleted(scorePct, isGrammarUnit(u));
  }
  trackEvent('lesson_complete', 'unit_checkpoint', { unitId, scorePct });
  // skipToast: quem conclui pelo fluxo normal do checkpoint (finishCurrentLesson)
  // já vê a tela própria de "Unidade concluída!" (Fase 4) -- o toast aqui é
  // só o fallback genérico pros outros caminhos que chegam a completar uma
  // unidade sem essa tela (checkUnitCompletion via Flashcard/"Já sei?").
  if (!skipToast){
    // Pequeno atraso pra ler como sequência ("+25 XP" ... "Unidade concluída!")
    // em vez de dois toasts aparecendo ao mesmo tempo, empilhados sem ordem.
    setTimeout(() => showToast(t(LANG_HOOKS.lessonKeys.unitDone)), 450);
  }
  saveState();
}

// ---------- Manual da unidade: só o que a aluna já viu (pedido da dona, 2026-10-26) ----------
// Regra PURA (sem STATE/DOM; reaproveitável por qualquer site): recebe a unidade e o que já foi visto e devolve os
// índices de vocabulário e frases, e se o diálogo entra. Nada do que a aluna ainda não viu aparece no manual.
//   seen.all           unidade concluída, releitura ou revisão: mostra tudo
//   seen.lessonsDone   lições concluídas desta unidade (o ponteiro real, STATE.unitProgress[id].lessonIdx)
//   seen.introducedIdx palavras já apresentadas na lição em andamento (STEP_STATE.acq.introduced)
//   seen.extraWordIdx  palavras desta unidade com evidência de estudo (cartão com reps > 0)
//   seen.dialogueDone  o passo do diálogo da lição em andamento já foi feito
//   seen.phraseHasWord (palavra) => (frase) => bool  (LANG_HOOKS.phraseHasWord)
// Frase vista = a frase da unidade que aparece como "Na frase" no cartão de uma palavra já vista (mesma escolha de
// findMatchingPhrase: a primeira frase da unidade que contém a palavra). As outras frases só aparecem nos exercícios do
// Ponto de verificação, então entram com a unidade concluída.
function unitSeenContent(unit, seen){
  const s = seen || {};
  const vocab = (unit && unit.vocab) || [];
  const phrases = (unit && unit.phrases) || [];
  const hasDialogue = !!(unit && unit.dialogue && Array.isArray(unit.dialogue.lines) && unit.dialogue.lines.length);
  if (s.all){
    return { all: true, vocabIdx: vocab.map((_, i) => i), phraseIdx: phrases.map((_, i) => i), dialogue: hasDialogue };
  }
  const lessons = (unit && Array.isArray(unit.lessons)) ? unit.lessons : [];
  const done = lessons.slice(0, Math.max(0, s.lessonsDone || 0));
  const words = new Set();
  done.forEach(l => (l.vocabIdx || []).forEach(i => words.add(i)));
  (s.introducedIdx || []).forEach(i => words.add(i));
  (s.extraWordIdx || []).forEach(i => words.add(i));
  const vocabIdx = [...words].map(Number).filter(i => Number.isInteger(i) && i >= 0 && i < vocab.length).sort((a, b) => a - b);
  const phraseSet = new Set();
  if (typeof s.phraseHasWord === 'function'){
    vocabIdx.forEach(i => {
      const pi = phrases.findIndex(s.phraseHasWord(vocab[i]));
      if (pi >= 0) phraseSet.add(pi);
    });
  }
  const dialogue = hasDialogue && (!!s.dialogueDone || done.some(l => l.includesDialogue));
  return { all: false, vocabIdx, phraseIdx: [...phraseSet].sort((a, b) => a - b), dialogue };
}

// Lê o estado do app (STATE/STEP_STATE) e chama a regra pura acima para a unidade `u`.
function unitSeenContentNow(u){
  const prog = (STATE.unitProgress && STATE.unitProgress[u.id]) || {};
  const reviewing = !!(STEP_STATE.lessonReview && STEP_STATE.lessonReview.unitId === u.id);
  if (prog.completed || reviewing) return unitSeenContent(u, { all: true });
  const lessonsDone = prog.lessonIdx || 0; // ponteiro real (currentLessonIdx devolveria o da revisão)
  const acq = STEP_STATE.acq || {};
  const sameSession = acq.unitId === u.id && (!isLessonUnit(u) || acq.lessonIdx === lessonsDone);
  const introducedIdx = sameSession ? Object.keys(acq.introduced || {}).map(Number) : [];
  const extraWordIdx = (u.vocab || []).map((_, i) => i)
    .filter(i => studyWordHasEvidence(studyWordCardsFor(STATE.cards, u.id, i)));
  let dialogueDone = false;
  const lesson = isLessonUnit(u) ? u.lessons[lessonsDone] : null;
  if (STATE.currentUnitId === u.id && (!isLessonUnit(u) || (lesson && lesson.includesDialogue))){
    const defs = currentStepDefs(u);
    const di = defs.findIndex(d => d.key === 'dialogue');
    dialogueDone = di >= 0 && STEP_STATE.currentStep > di;
  }
  return unitSeenContent(u, { lessonsDone, introducedIdx, extraWordIdx, dialogueDone, phraseHasWord: LANG_HOOKS.phraseHasWord });
}

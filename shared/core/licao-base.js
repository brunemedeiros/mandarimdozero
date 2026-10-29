// E4 lote paridade 5d-1: trilha, passos da lição, painel de resposta, telas simples da Revisão e Configurações (paridade 5d, parte 1).
// Unifica funções que eram QUASE iguais em fr/app.js e zh/app.js. O que mudava por idioma passou para os ganchos LANG_HOOKS
// (fr/lang-hooks.js e zh/lang-hooks.js, carregados antes do app.js) ou para uma verificação explícita (typeof/in) no próprio código.
// Mesmos nomes globais; nenhuma chamada muda. Carregado antes do app.js.

function isAdminUser(){
  return !!(typeof CURRENT_USER !== 'undefined' && CURRENT_USER && CURRENT_USER.email === ADMIN_EMAIL);
}

// ---------- Tela final "Parabéns" (estilo Busuu): estrelas, pontuação e
// recapitulação do vocabulário/frases vistos pela primeira vez na lição ----------
function currentStudentName(){
  if (!CURRENT_USER) return t('common.guest');
  const full = CURRENT_USER.user_metadata?.full_name || CURRENT_USER.email || t('common.guest');
  return full.split(' ')[0].split('@')[0];
}

function syncSidebarToggleLabel(){
  const btn = document.getElementById('sidebar-toggle-btn');
  const txt = t(document.getElementById('app').classList.contains('sidebar-collapsed') ? 'sidebar.expand' : 'sidebar.collapse');
  btn.title = txt; btn.setAttribute('aria-label', txt);
}

// Popula os campos de Configurações -- roda em QUALQUER entrada na aba
// (sidebar desktop ou o item "Configurações" do menu do avatar), não só
// quando o menu era o único caminho até aqui.
function renderSettingsView(){
  document.getElementById('settings-email').textContent = CURRENT_USER?.email || t('settings.account.guest');
  document.getElementById('settings-provider').textContent = CURRENT_USER?.app_metadata?.provider === 'google' ? 'Google' : (CURRENT_USER ? t('settings.account.emailPassword') : '—');
  switchSettingsSection(SETTINGS_SECTION);
  if (typeof refreshDeleteAccountBox === 'function') refreshDeleteAccountBox();
}

function switchSettingsSection(section){
  SETTINGS_SECTION = section;
  document.querySelectorAll('[data-settings-section]').forEach(btn => {
    const on = btn.dataset.settingsSection === section;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-pressed', String(on));
  });
  document.getElementById('settings-geral-content').style.display = section === 'geral' ? '' : 'none';
  document.getElementById('settings-notifications-content').style.display = section === 'notifications' ? '' : 'none';
  document.getElementById('settings-export-content').style.display = section === 'export' ? '' : 'none';
  if (section === 'notifications' && typeof renderNotificationPreferencesView === 'function') renderNotificationPreferencesView();
}

function renderReviewView(){
  renderReviewViewInner();
  if (typeof mountBankRequestMenu === 'function') mountBankRequestMenu();
}

// Fecha a lição/unidade atual. Unidades sem `lessons` (gramática, ou
// vocabulário ainda não migrado) e a última lição (isCheckpoint) de uma
// unidade migrada caem no fluxo de SEMPRE: marca a unidade concluída e
// mostra os desafios de hoje. Uma lição intermediária, em vez disso, só
// avança lessonIdx, persiste, e mostra a tela leve de "Lição concluída".
function finishCurrentLesson(u){
  // Revisão de uma lição já concluída: nenhum XP de lição/desafio/meta
  // diária deve contar de novo -- só sai de volta pra Trilha, limpando a
  // flag de revisão (ver STEP_STATE.lessonReview).
  if (STEP_STATE.lessonReview && STEP_STATE.lessonReview.unitId === u.id){
    STEP_STATE.lessonReview = null;
    exitToPath();
    return;
  }
  if (isLessonUnit(u) && !currentLesson(u).isCheckpoint){
    const finished = currentLesson(u);
    // Congela o progresso dos desafios de hoje ANTES das atualizações abaixo,
    // pra depois (renderLessonCompleteScreen) conseguir mostrar um chip
    // contextual só quando ESSA lição específica fez algum desafio avançar
    // -- não uma lista genérica dos 3 desafios do dia (essa já tem tela
    // própria, acessível pela aba "Desafios").
    const challengesBefore = todaysChallenges().map(c => Math.min(c.get(STATE.daily), c.target));
    const lessonKey = `${u.id}:${currentLessonIdx(u.id)}`;
    // Etapa 6: 1ª lição do curso ganha o bloco "Recado da Prof. Brune" na tela de conclusão. Decidido ANTES de a
    // lição avançar (o curso ainda está "novo"); o bloco já mostra o XP, então o aviso "+4 XP" de fechar a lição não
    // aparece por cima dele (o XP é somado do mesmo jeito).
    const welcomeB = typeof shouldShowWelcomeB === 'function' && shouldShowWelcomeB();
    STATE.unitProgress[u.id].lessonIdx = currentLessonIdx(u.id) + 1;
    addXP(LESSON_CLOSE_XP, welcomeB ? { quiet: true } : undefined);
    if (welcomeB){ markWelcome('b'); STEP_STATE.welcomeBShown = true; }
    // Terminar esta lição intermediária já conta como "estudei hoje" pro
    // streak -- antes só o Ponto de verificação (fim da unidade inteira)
    // contava, deixando quem completa 1-2 lições de uma unidade grande sem
    // crédito nenhum no dia.
    registerStudyToday();
    // Nota real da lição: acerto/total acumulado das fases avaliadas
    // (checkpoint + practice/mixed, ver advanceAcquisitionPhase) -- antes
    // isso vinha sempre undefined ("lição intermediária não tem nota"), o
    // que deixava desafios como "Pontue mais de 80% em N lições" quase
    // impossíveis de bater num dia normal (só um Ponto de verificação de
    // fim de unidade contava). Sem exercício avaliado nesta lição
    // (raríssimo, mas por garantia) cai pra undefined, mesmo comportamento
    // de antes.
    const ls = STEP_STATE.acq.lessonScore;
    const lessonScorePct = ls && ls.total ? Math.round((ls.correct / ls.total) * 100) : undefined;
    registerDailyLessonCompleted(lessonScorePct);
    trackEvent('lesson_complete', 'vocab_lesson', { unitId: u.id, lessonIdx: currentLessonIdx(u.id) - 1, scorePct: lessonScorePct });
    // Meta diária (§4 do artefato): só conta se a lição tinha conteúdo real
    // (>=3 palavras ou incluía diálogo) -- filtra o atalho degenerado de uma
    // lição minúscula "sobrando" no fim de uma unidade.
    registerDailyLessonForGoal(lessonKey, (finished.vocabIdx?.length || 0) >= 3 || !!finished.includesDialogue);
    saveState();
    renderTopbarStats();
    // XP real da lição (não hardcoded, não estrelas): delta entre o XP
    // atual e o snapshot tirado quando a lição começou (xpAtLessonStart),
    // cobrindo tanto o XP dos exercícios respondidos quanto o bônus de fechar a lição (LESSON_CLOSE_XP) de
    // conclusão logo acima -- STATE.xp só muda dentro de addXP() (ver
    // Fase 1), então esse delta é exatamente o que esta lição concedeu.
    const xpEarned = STATE.xp - STEP_STATE.acq.xpAtLessonStart;
    renderLessonCompleteScreen(u, finished, { challengesBefore, xpEarned, scorePct: lessonScorePct, welcomeB });
    return;
  }

  // Unidades de gramática pontuam por u.grammar.exercises/gramExerciseScore
  // (lista fixa, não gerada por buildExerciseSet) -- mesma distinção que já
  // existia no fluxo antigo, só centralizada aqui agora.
  const { total, correct } = unitFinalScore(u); // shared/core/gramatica-cenario.js
  const scorePct = total ? Math.round((correct / total) * 100) : 100;
  // XP real da UNIDADE (Fase 4): snapshot ANTES de markUnitCompleted (que
  // concede os +25 de bônus) -- skipToast:true porque quem chega aqui vai
  // ver a tela própria de "Unidade concluída!" logo abaixo, não o toast
  // genérico (esse continua existindo pra outros caminhos de conclusão que
  // não passam por uma tela, ex. checkUnitCompletion via Flashcard/"Já sei").
  const xpBeforeUnitBonus = STATE.xp;
  // Conquistas (trilha Gabaritou): 100% no ponto de verificação da unidade fica gravado, mesmo refazendo depois.
  if (scorePct >= 100 && STATE.unitProgress[STATE.currentUnitId]) STATE.unitProgress[STATE.currentUnitId].checkpointAced = true;
  markUnitCompleted(STATE.currentUnitId, scorePct, { skipToast: true });
  const unitXpEarned = STATE.xp - xpBeforeUnitBonus;
  // Meta diária (§4 do artefato): mesma régua de "conteúdo real" (>=3 itens)
  // usada na lição intermediária -- o Ponto de verificação/consolidação da
  // unidade sempre qualifica na prática, mas o filtro evita contar uma
  // unidade de gramática ou legado com uma lista de exercícios minúscula.
  registerDailyLessonForGoal(`${u.id}:checkpoint`, total >= 3);
  if (isLessonUnit(u)){
    STATE.unitProgress[u.id].lessonIdx = 0;
    STATE.unitProgress[u.id].lessonMisses = {};
  }
  renderUnitCompleteScreen(u, unitXpEarned);
}

function renderReviewViewInner(){
  syncReviewBackLink();
  stopExerciseAudio();
  const el = document.getElementById('review-content');

  if (!STATE.reviewQueue.length){
    releaseBadgeCelebrations();
    // Mesma fonte que startReviewSession()/Speed Review usam de verdade
    // (todaysReviewCount, com os mesmos tetos de novas/dia e intensidade)
    // -- senão esse número prometeria mais do que "Revisar tudo disponível"
    // realmente consegue puxar (o botão clicava e caía de volta nesta
    // mesma tela vazia).
    const allDue = STATE.reviewSessionClassReview ? 0 : todaysReviewCount(STATE.cards.filter(isCardLessonCompleted).filter(c => !isClassReviewCard(c)));
    el.innerHTML = `
      <div class="review-empty">
        <div class="big-emoji">${LANG_HOOKS.reviewEmptyEmoji}</div>
        <h3>${STATE.reviewSessionClassReview ? t('review.session.classEmptyTitle') : activeReviewTagFilter().length ? t('review.session.tagsEmptyTitle') : STATE.reviewSessionDeckId ? t('review.session.deckEmptyTitle') : (STATE.reviewSessionUnitFilter ? t('review.session.unitEmptyTitle') : t('review.session.allDoneTitle'))}</h3>
        <p>${allDue > 0 ? tp('review.session.pendingOverall', allDue === 1 ? 1 : 2, { n: allDue }) : t('review.session.comeBackLater')}</p>
        ${allDue > 0 ? `<button class="btn btn-primary" id="review-start-all">${t('review.session.reviewAllAvailable')}</button>` : ''}
        ${STATE.reviewSessionClassReview ? `<button class="btn btn-secondary" id="review-class-back">${t('review.backToStudent')}</button>` : ''}
      </div>
    `;
    document.getElementById('review-class-back')?.addEventListener('click', backToClassReviewTab);
    if (allDue > 0){
      document.getElementById('review-start-all').addEventListener('click', () => {
        STATE.reviewSessionUnitFilter = null;
        STATE.reviewSessionDeckId = null; // Fase D -- mesmo fallback de "abandona o escopo estreito" já usado pra unidade
        STATE.reviewSessionMilestone = null;
        startReviewSession();
      });
    }
    return;
  }

  if (STATE.reviewIndex >= STATE.reviewQueue.length){
    releaseBadgeCelebrations();
    // Streak conta aqui -- fim da SESSÃO inteira de Flashcard/Palavras
    // difíceis (os dois usam esta mesma tela, ver openReviewSession) -- não
    // a cada cartão avaliado (ver gradeCurrentCard).
    registerStudyToday();
    if (STATE.reviewSessionStartedAt){
      recordReviewSessionTime(STATE.reviewQueue.length, Date.now() - STATE.reviewSessionStartedAt);
      STATE.reviewSessionStartedAt = null;
      saveState();
    }
    maybeShowStreakCelebration();
    // Fase 5: o marco de Revisão conta como realizado só quando a SESSÃO termina
    // (sem nota mínima). A meta ganha moduleId/unitIds (sessão de marco) ou
    // unitId (sessão de uma unidade) para o painel da professora derivar depois.
    const msMeta = STATE.reviewSessionMilestone;
    if (msMeta) recordModuleReviewDone(msMeta.moduleId, STATE.reviewQueue.length);
    trackEvent('lesson_complete', 'flashcard_review', Object.assign({ count: STATE.reviewQueue.length },
      msMeta ? { moduleId: msMeta.moduleId, unitIds: msMeta.unitIds } : {},
      STATE.reviewSessionUnitFilter ? { unitId: STATE.reviewSessionUnitFilter } : {}));
    // Fase 6 do projeto de reorganização: terminar a revisão nunca deve
    // convidar a repetir a mesma bateria -- "Voltar" leva pra trilha,
    // "Praticar mais" leva pra PRATICAR (Combinar/Palavras difíceis), não
    // reinicia esta mesma sessão de revisão.
    el.innerHTML = `
      <div class="review-empty">
        <div class="big-emoji">🎉</div>
        <h3>${t('review.complete.title')}</h3>
        <p>${tp('review.complete.reviewed', STATE.reviewQueue.length === 1 ? 1 : 2, { n: STATE.reviewQueue.length })}</p>
        <div class="review-complete-actions">
          ${STATE.reviewSessionClassReview
            ? `<button class="btn btn-primary" id="review-class-back">${t('review.backToStudent')}</button>`
            : `<button class="btn btn-secondary" id="review-again">${t('review.back')}</button>
          <button class="btn btn-primary" id="review-go-practice">${t('review.practiceMore')}</button>`}
        </div>
      </div>
    `;
    checkUnitCompletion();
    document.getElementById('review-class-back')?.addEventListener('click', backToClassReviewTab);
    document.getElementById('review-again')?.addEventListener('click', () => {
      STATE.reviewSessionUnitFilter = null;
      STATE.reviewSessionDeckId = null; // Fase D
      STATE.reviewSessionMilestone = null;
      switchTab('path');
    });
    document.getElementById('review-go-practice')?.addEventListener('click', () => {
      STATE.reviewSessionUnitFilter = null;
      STATE.reviewSessionDeckId = null; // Fase D
      STATE.reviewSessionMilestone = null;
      backToReviewModeSelect();
    });
    renderProgressView();
    return;
  }

  const card = STATE.reviewQueue[STATE.reviewIndex];

  // Fase 4 (motor de tipos/templates, ver CLAUDE.md) -- despacho por
  // cardTypeId. Cartão nativo (Note/CardInstance, origin teacher/self)
  // K2-J: todo card da fila tem `card.cardInstance` (study/teacher/self nascem de
  // buildStudyWordCards/buildEngineCardsFromRow); normal cai no flip abaixo.
  {
    const cardTypeId = card.cardInstance.cardTypeId;
    // Fase 6C.2 -- Múltipla escolha/Digite a resposta seguem o mesmo
    // padrão de criação preguiçosa de STATE.reviewCardState já
    // estabelecido pra Normal na Fase 6C.1: só criado quando ausente
    // (cartão novo, gradeCurrentCard/reviewMoreCurrentCard já zeraram ao
    // avançar a fila), tipado (`kind`) pro card atual; re-renderizações
    // do MESMO cartão reaproveitam a mesma referência.
    if (cardTypeId === 'multiple_choice'){
      if (!STATE.reviewCardState){
        STATE.reviewCardState = { kind: 'multiple_choice', shuffledOptions: null, selectedIndex: null, answered: false, wasCorrect: null };
      }
      renderMultipleChoiceCard(el, card, STATE.reviewCardState, {
        onAnswered: (wasCorrect, grade) => gradeCurrentCard(grade),
      });
      return;
    }
    if (cardTypeId === 'type_answer'){
      if (!STATE.reviewCardState){
        STATE.reviewCardState = { kind: 'type_answer', typedAnswer: '', answered: false, wasCorrect: null };
      }
      renderTypeAnswerCard(el, card, STATE.reviewCardState, {
        onAnswered: (wasCorrect, grade) => gradeCurrentCard(grade),
      });
      return;
    }
    if (cardTypeId === 'cloze'){
      if (!STATE.reviewCardState){
        // markId identifica explicitamente a marca desta CardInstance --
        // ver comentário completo em renderClozeCard() pra motivo.
        STATE.reviewCardState = { kind: 'cloze', markId: card.cardInstance.markId, typedAnswer: '', answered: false, wasCorrect: null };
      }
      renderClozeCard(el, card, STATE.reviewCardState, {
        onAnswered: (wasCorrect, grade) => gradeCurrentCard(grade),
      });
      return;
    }
    // cardTypeId === 'normal' (inclusive uma das 2 metades de "Normal com
    // reverso", Fase 4a) cai no flip padrão abaixo.
  }

  // Fase 6C.1 (ver CLAUDE.md) -- "normal" (inclusive uma das 2 metades de
  // "Normal com reverso") extraído pro renderer renderNormalCard(),
  // seguindo o contrato aprovado na Fase 6C: (mountEl, card, localState,
  // callbacks). A SESSÃO (aqui) é quem cria/descarta STATE.reviewCardState
  // -- o renderer nunca lê/escreve STATE por nome, só recebe a referência
  // como parâmetro. Criação é preguiçosa (só quando ainda não existe --
  // gradeCurrentCard() já o zera ao avançar a
  // fila, então "ausente" aqui sempre significa "cartão novo, começar do
  // zero"; re-renderizações do MESMO cartão -- ex: depois de revelar --
  // reaproveitam a mesma referência, nunca recriam).
  if (!STATE.reviewCardState){
    STATE.reviewCardState = { kind: 'normal', revealed: false };
  }
  renderNormalCard(el, card, STATE.reviewCardState, {
    onAnswered: (wasCorrect, grade) => gradeCurrentCard(grade),
  });
}

function renderSpeedReview(){
  const el = document.getElementById('speed-review-content');

  // Projeto "Reorganização da experiência de revisão e prática": Speed
  // Review agora usa a fila DEVIDA (ver buildSpeedQueue), então fila vazia
  // é o caso normal e esperado de "você está em dia" -- bem diferente de
  // "ainda não tem vocabulário suficiente" (conta muito pouca palavra
  // aprendida no total). As duas mensagens não podem ser a mesma.
  if (SPEED_STATE.queue.length === 0){
    const pool = eligibleReviewPool();
    el.innerHTML = projectStudyWordsToA(pool).length < 4 ? `
      <div class="review-empty">
        <div class="big-emoji">⚡</div>
        <h3>${t('review.insufficientTitle')}</h3>
        <p>${t('review.speed.insufficientBody')}</p>
      </div>
    ` : `
      <div class="review-empty">
        <div class="big-emoji">${LANG_HOOKS.reviewEmptyEmoji}</div>
        <h3>${t('review.empty.upToDateTitle')}</h3>
        <p>${t('review.speed.upToDateBody')}</p>
        <button class="btn btn-primary" id="speed-go-practice">${t('review.practice')}</button>
      </div>
    `;
    document.getElementById('speed-go-practice')?.addEventListener('click', backToReviewModeSelect);
    return;
  }

  if (SPEED_STATE.hearts <= 0){
    stopSpeedTimer();
    if (!SPEED_STATE.dailyCounted){
      SPEED_STATE.dailyCounted = true;
      // Só a 1a sessão de Speed Review do dia rende XP real -- sem isso,
      // "Jogar de novo" (mesmo pool de palavras, sem gasto nenhum) virava
      // fonte infinita de XP depois que o modo passou a dar XP de verdade
      // (achado da autora: "logo após fazer o exercício ele já ficou
      // disponível de novo com as mesmas palavras"). Sessões seguintes no
      // mesmo dia continuam funcionando normalmente como prática (hearts,
      // pts, streak do minijogo) -- só não empilham XP de novo.
      ensureDailyBucket();
      const firstSpeedSessionToday = !STATE.daily.speedReviewSessions;
      registerDailySpeedReview();
      registerStudyToday();
      // 1x por sessão (não por resposta) -- evita um toast "+2 XP" a cada
      // pergunta num jogo rápido, e usa o mesmo guard de dailyCounted pra
      // nunca dobrar em caso de re-render desta tela.
      if (firstSpeedSessionToday && SPEED_STATE.correctCount > 0) addXP(SPEED_STATE.correctCount * SPEED_REVIEW_XP_PER_CORRECT);
    }
    maybeShowStreakCelebration();
    trackEvent('lesson_complete', 'speed_review', { score: SPEED_STATE.score });
    const speedScoreRecord = recordSpeedReviewScore(SPEED_STATE.score);
    const speedStreakRecord = recordSpeedReviewStreak(SPEED_STATE.bestStreak || 0);
    const speedIsRecord = speedScoreRecord || speedStreakRecord;
    if (speedIsRecord) saveState();
    // Fase 6 do projeto: nunca oferecer "Jogar de novo" repetindo a mesma
    // bateria de revisão -- Voltar/Praticar mais, igual à conclusão do
    // Flashcard (ver renderReviewView).
    releaseBadgeCelebrations();
    el.innerHTML = `
      <div class="speed-gameover">
        <div class="big-emoji">💔</div>
        <h3>${t('review.speed.gameOver')}</h3>
        <div class="score-num">${t('review.speed.points', { n: SPEED_STATE.score })}</div>
        <p>${tp('review.speed.answered', SPEED_STATE.index === 1 ? 1 : 2, { n: SPEED_STATE.index })}</p>
        <p class="review-record-line">${speedIsRecord ? `${t('review.records.newRecord')} ${speedRecordText(reviewRecords())}` : t('review.records.yourRecord', { record: speedRecordText(reviewRecords()) })}</p>
        <div class="review-complete-actions">
          <button class="btn btn-secondary" id="speed-back-btn">${t('review.back')}</button>
          <button class="btn btn-primary" id="speed-practice-btn">${t('review.practiceMore')}</button>
        </div>
      </div>
    `;
    document.getElementById('speed-back-btn').addEventListener('click', () => switchTab('path'));
    document.getElementById('speed-practice-btn').addEventListener('click', backToReviewModeSelect);
    return;
  }

  if (SPEED_STATE.index >= SPEED_STATE.queue.length){
    stopSpeedTimer();
    if (!SPEED_STATE.dailyCounted){
      SPEED_STATE.dailyCounted = true;
      // Só a 1a sessão de Speed Review do dia rende XP real -- sem isso,
      // "Jogar de novo" (mesmo pool de palavras, sem gasto nenhum) virava
      // fonte infinita de XP depois que o modo passou a dar XP de verdade
      // (achado da autora: "logo após fazer o exercício ele já ficou
      // disponível de novo com as mesmas palavras"). Sessões seguintes no
      // mesmo dia continuam funcionando normalmente como prática (hearts,
      // pts, streak do minijogo) -- só não empilham XP de novo.
      ensureDailyBucket();
      const firstSpeedSessionToday = !STATE.daily.speedReviewSessions;
      registerDailySpeedReview();
      registerStudyToday();
      // 1x por sessão (não por resposta) -- evita um toast "+2 XP" a cada
      // pergunta num jogo rápido, e usa o mesmo guard de dailyCounted pra
      // nunca dobrar em caso de re-render desta tela.
      if (firstSpeedSessionToday && SPEED_STATE.correctCount > 0) addXP(SPEED_STATE.correctCount * SPEED_REVIEW_XP_PER_CORRECT);
    }
    maybeShowStreakCelebration();
    // Fase 6 do projeto: idem -- sem "Jogar de novo" (a fila devida já foi
    // zerada de verdade nesta sessão; "de novo" mostraria vazio ou
    // reaproveitaria cartões que acabaram de ser respondidos).
    const speedIsRecord2 = recordSpeedReviewScore(SPEED_STATE.score);
    const speedStreakRecord2 = recordSpeedReviewStreak(SPEED_STATE.bestStreak || 0);
    if (speedIsRecord2 || speedStreakRecord2) saveState();
    releaseBadgeCelebrations();
    el.innerHTML = `
      <div class="speed-gameover">
        <div class="big-emoji">🏆</div>
        <h3>${t('review.complete.title')}</h3>
        <div class="score-num">${t('review.speed.points', { n: SPEED_STATE.score })}</div>
        <p class="review-record-line">${speedIsRecord2 || speedStreakRecord2 ? `${t('review.records.newRecord')} ${speedRecordText(reviewRecords())}` : t('review.records.yourRecord', { record: speedRecordText(reviewRecords()) })}</p>
        <div class="review-complete-actions">
          <button class="btn btn-secondary" id="speed-back-btn">${t('review.back')}</button>
          <button class="btn btn-primary" id="speed-practice-btn">${t('review.practiceMore')}</button>
        </div>
      </div>
    `;
    document.getElementById('speed-back-btn').addEventListener('click', () => switchTab('path'));
    document.getElementById('speed-practice-btn').addEventListener('click', backToReviewModeSelect);
    return;
  }

  const card = SPEED_STATE.queue[SPEED_STATE.index];
  const options = buildSpeedOptions(card);
  SPEED_STATE.answered = false;

  const heartsHTML = [0,1,2].map(i => `<span class="${i < SPEED_STATE.hearts ? '' : 'heart-lost'}">❤️</span>`).join('');

  el.innerHTML = `
    <div class="speed-header">
      <div class="speed-hearts">${heartsHTML}</div>
      <div class="speed-score">${t('review.speed.points', { n: SPEED_STATE.score })}</div>
    </div>
    <div class="speed-timer-track"><div class="speed-timer-fill" id="speed-timer-fill" style="width:100%"></div></div>
    <div class="speed-prompt">
      ${LANG_HOOKS.speedPromptHTML(card)}
    </div>
    <div class="speed-options">
      ${options.map((opt, i) => `<button class="speed-option" data-idx="${i}">${escapeHTML(cardAnswerText(opt))}</button>`).join('')}
    </div>
  `;

  el.querySelectorAll('.speed-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const chosenIdx = parseInt(btn.dataset.idx);
      answerSpeedQuestion(options[chosenIdx] === card, el, chosenIdx);
    });
  });

  runSpeedTimer(el, () => answerSpeedQuestion(false, el));
}

// Painel de resposta errada/revelada (estilo Duolingo): a explicação
// ("por que não foi essa") aparece AUTOMATICAMENTE -- não depende do aluno
// clicar em nada pra ver o porquê. `revealed` distingue "errei tentando"
// de "pedi pra ver a resposta" (via Não sei) -- nenhum dos dois conta como
// acerto normal, mas o rótulo comunica ao aluno qual foi o caso.
function showAnswerPanel(contentEl, ex, opts = {}){
  const revealed = !!opts.revealed;
  // Único funil compartilhado por TODO erro de verdade e todo "Não sei" de
  // TODO tipo de exercício -- ponto certo pra zerar o combo de acertos
  // seguidos (ver STEP_STATE.comboCount / showCorrectFeedbackPanel).
  STEP_STATE.comboCount = 0;
  // Erro de verdade (não "Não sei", que não conta como erro) numa palavra
  // com vocabIdx marcado: soma na contagem LOCAL DESTA SESSÃO, usada pra
  // decidir reforço extra na prática mista e prioridade na consolidação
  // final (ETAPA 7) -- não mexe no lapses/SM-2 persistente.
  if (!revealed && ex && typeof ex.vocabIdx === 'number' && STEP_STATE.acq.unitId === STATE.currentUnitId){
    STEP_STATE.acq.wordMisses[ex.vocabIdx] = (STEP_STATE.acq.wordMisses[ex.vocabIdx] || 0) + 1;
  }
  // Erro no Ponto de verificação: contagem PRÓPRIA (checkpointMisses), não
  // a de cima -- ver comentário em STEP_STATE.checkpointMisses sobre por
  // que reaproveitar acq.wordMisses aqui gerava a lista errada no card de
  // resultado do checkpoint. checkpointUnitId (diferente de acq.unitId) é
  // setado de forma confiável sempre que o checkpoint está em andamento
  // (ver renderStep, stepKey 'checkpointExercises'), então este sinal não
  // depende de o passo 'vocab' ter rodado antes na mesma sessão.
  if (!revealed && ex && typeof ex.vocabIdx === 'number' && STEP_STATE.checkpointUnitId === STATE.currentUnitId){
    STEP_STATE.checkpointMisses[ex.vocabIdx] = (STEP_STATE.checkpointMisses[ex.vocabIdx] || 0) + 1;
  }
  const wrap = contentEl.querySelector('.exercise-wrap') || contentEl;
  const explanation = answerExplanationHTML(ex);
  const panel = document.createElement('div');
  panel.className = 'wrong-feedback';
  panel.innerHTML = `
    <div class="feedback-card-body">
      <div class="wrong-feedback-header">${revealed ? t('feedback.header.revealed') : (opts.toneOnly ? (opts.toneOnly === 'wrong' ? t('feedback.tone.wrong') : t('feedback.tone.missing')) : t('feedback.header.notThisTime'))}</div>
      ${opts.attemptHTML ? `
        <div class="wrong-feedback-why">
          <div class="wrong-feedback-why-label">${t('feedback.label.yourAnswer')}</div>
          <div class="feedback-inner-box">${opts.attemptHTML}</div>
        </div>
      ` : ''}
      ${explanation ? `
        <div class="wrong-feedback-why">
          <div class="wrong-feedback-why-label">${ex && (ex.format === 'cloze' || ex.format === 'fullsentence') ? (ex.format === 'cloze' ? t('feedback.label.fullSentence') : t('feedback.label.correctAnswer')) : (revealed ? t('feedback.label.answer') : t('feedback.label.whyNot'))}</div>
          <div class="feedback-inner-box">${explanation}</div>
        </div>
      ` : ''}
      <button class="btn btn-primary btn-block wrong-feedback-continue" id="wrong-continue-btn">${t('common.continueArrow')}</button>
    </div>
  `;
  wrap.appendChild(panel);
  wireAudioButtons(panel);

  panel.querySelector('#wrong-continue-btn').addEventListener('click', () => {
    addStudyMinutes();
    STEP_STATE.exerciseIndex += 1;
    renderExerciseStep();
  });
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Grupos da trilha na ordem de estudo (um por nível, vazios descartados).
function trailGroups(){
  return LEVELS.map(lvl => unitsOfLevel(lvl.id)).filter(g => g.length);
}

// Resumo de progresso pro Perfil (shared/profile.js) -- NÃO usa
// STATE.currentLevel, que é só o ponteiro manual de qual nível a Trilha
// está mostrando (nem é persistido entre sessões). "Nível atual" pro
// Perfil é o primeiro nível ainda não 100% completo, derivado só de
// unitProgress -- cai no último nível da lista se tudo já tiver sido
// concluído. Também é gravado dentro de serializeState() pra o Perfil
// conseguir mostrar ESTE idioma enquanto a pessoa está no site do OUTRO,
// sem precisar carregar este content.js.
function computeProgressSummary(){
  const level = LEVELS.find(l => !levelCompleted(l.id)) || LEVELS[LEVELS.length - 1];
  const units = unitsOfLevel(level.id);
  const done = units.filter(u => STATE.unitProgress[u.id]?.completed).length;
  const pct = units.length ? Math.round((done / units.length) * 100) : 0;
  return { levelId: level.id, levelLabel: level.label, pct };
}

// Enter = avançar (estilo Memrise): sempre tenta clicar o botão de
// continuar que estiver na tela agora, em ordem de prioridade -- painel de
// erro/resposta revelada > painel de acerto do "ordenar frase" > fila de
// desafios > botão global "Continuar"/"Próxima palavra" (reaproveitado em
// vocabulário, diálogo, checkpoint etc.). Roda ANTES do guard de
// INPUT/TEXTAREA (abaixo) porque precisa funcionar mesmo com o campo de
// digitação ainda focado: o próprio input já tem seu handler de Enter
// (submete a resposta, ver ex. #cloze-input) que roda primeiro; se a
// resposta for CERTA o exercício já avança sozinho antes deste handler
// chegar a rodar (nada fica visível pra clicar); se for ERRADA, o painel só
// aparece depois de 500ms, então este Enter (o mesmo que respondeu) não
// acha nada ainda -- só um 2º Enter, já com o campo desabilitado (perdeu o
// foco sozinho), cai aqui e avança de verdade. Em múltipla escolha/cloze/
// cenário/V-ou-F ainda não respondidos, nenhum desses botões existe --
// Enter não faz nada, de propósito (não existe "resposta padrão" pra
// confirmar só com Enter).
function findEnterAdvanceTarget(){
  const wrongContinueBtn = document.getElementById('wrong-continue-btn');
  if (wrongContinueBtn) return wrongContinueBtn;
  const correctContinueBtn = document.getElementById('correct-continue-btn');
  if (correctContinueBtn) return correctContinueBtn;
  const queueContinueBtn = document.getElementById('queue-continue-btn');
  if (queueContinueBtn) return queueContinueBtn;
  // Expressões em passos (shared/desafios-telas.js) e o "Concluir" dos Desafios.
  const exprContinueBtn = document.getElementById('expr-continue-btn');
  if (exprContinueBtn) return exprContinueBtn;
  const challengeCompleteBtn = document.getElementById('challenge-complete-btn');
  if (challengeCompleteBtn) return challengeCompleteBtn;
  const stepNextBtn = document.getElementById('step-next-btn');
  if (stepNextBtn && stepNextBtn.offsetParent !== null) return stepNextBtn;
  return null;
}

// (Paridade B2: registerDailyStars (estrelas da tela de módulo concluído) está em shared/core/modulos-niveis.js, comum a todos os sites.)
function registerDailyLessonCompleted(scorePct, isGrammar){
  ensureDailyBucket();
  STATE.daily.lessons += 1;
  if (scorePct >= 80) STATE.daily.highScoreLessons += 1;
  if (scorePct >= 100) STATE.daily.perfectLessons += 1;
  if (isGrammar) STATE.daily.grammarLessons = (STATE.daily.grammarLessons || 0) + 1;
}

// Feedback do painel de erro/revelação, dividido em duas partes bem
// diferentes (ver seção 14 do pedido: "Por que errei?" != "Rever
// conteúdo"). A retomada de conteúdo (frase de origem/explicação da
// unidade) vem JUNTO da explicação, não atrás de um botão separado --
// "Por que não foi essa" já cumpre sozinho o papel de reconectar o aluno
// ao conteúdo, então um "Rever conteúdo" à parte só duplicava a função.
// Detalhe do painel de acerto/erro do "Complete a frase": SEMPRE a frase
// completa certa (com áudio) e a tradução -- igual no acerto e no erro. No
// erro/"Não sei", `withCorrect` acrescenta a resposta certa.
function clozeFeedbackDetailHTML(ex, withCorrect){
  const correct = withCorrect ? LANG_HOOKS.clozeCorrectHTML(ex.correctBlock) : '';
  return LANG_HOOKS.phraseFeedbackHTML(ex.phrase, ex.phrase.t, correct);
}

// ---------- Vocabulário palavra-por-palavra (estilo Memrise) ----------
// Procura um exemplo real de uso da palavra — nas frases da unidade, depois
// nas falas do diálogo (mesmo formato {f, t}) e, se ainda não achar, nas
// unidades anteriores já vistas. Aumenta bastante a cobertura sem inventar
// frase nova nenhuma, só reaproveitando conteúdo que já existe no curso, e
// nunca usa vocabulário que o aluno ainda não viu.
function findMatchingPhrase(word, unit){
  const sourcesOf = u2 => [...(u2.phrases || []), ...((u2.dialogue && u2.dialogue.lines) || [])];
  // Case-insensitive: uma frase que começa com a palavra ("Bonjour !") tem
  // maiúscula inicial e não batia com o vocabulário ("bonjour") sem isso.
  // Parêntese de partícula ("un kilo (de)") é anotação do vocabulário, não
  // faz parte da forma falada -- sem tirar, "un kilo (de)" nunca casava com
  // "Je prends un kilo de pommes." e o cartão ficava sem "Na frase".
  const contains = LANG_HOOKS.phraseHasWord(word);

  const inUnit = sourcesOf(unit).find(contains);
  if (inUnit) return inUnit;

  const unitIdx = UNITS.findIndex(u2 => u2.id === unit.id);
  for (let i = 0; i < unitIdx; i++){
    const match = sourcesOf(UNITS[i]).find(contains);
    if (match) return match;
  }
  return null;
}

// Passos de uma unidade de vocabulário (rótulos resolvidos a cada chamada, no idioma do site). Era getStepDefs no fr e
// STEP_DEFS no zh, com as mesmas chaves e os mesmos rótulos.
function getStepDefs(){
  return [
    { key: 'vocab', label: t('fr.step.vocab') },
    { key: 'dialogue', label: t('fr.step.dialogue') },
    { key: 'dialogueCheck', label: t('lesson.step.dialogueCheck') },
    { key: 'usage', label: t('fr.step.usage') },
    { key: 'exercises', label: t('fr.step.exercises') }
  ];
}

// Unidades migradas pra explicação contextual (`unit.concepts`, ver
// content.js) não têm mais `usageNote` -- a teoria dele já foi incorporada
// como cartões de conceito dentro do próprio ciclo de aquisição/diálogo, não
// como um passo à parte no fim. Sem esse filtro, essas unidades mostrariam
// um passo "Dica de uso" vazio.
function currentStepDefs(unit){
  const u = unit || UNITS.find(x => x.id === STATE.currentUnitId);
  if (isGrammarUnit(u)) return getStepDefsGrammar();
  if (isLessonUnit(u)){
    const lesson = currentLesson(u);
    if (lesson.isCheckpoint) return [{ key: 'checkpointExercises', label: t('trail.checkpoint.title') }];
    const steps = [];
    if (lesson.vocabIdx && lesson.vocabIdx.length) steps.push({ key: 'vocab', label: t('fr.step.vocab') });
    if (lesson.includesDialogue){
      steps.push({ key: 'dialogue', label: t('fr.step.dialogue') });
      if (u.dialogue && Array.isArray(u.dialogue.check) && u.dialogue.check.length) steps.push({ key: 'dialogueCheck', label: t('lesson.step.dialogueCheck') });
    }
    return steps;
  }
  return getStepDefs().filter(s => (s.key !== 'usage' || (u && u.usageNote)) && (s.key !== 'dialogueCheck' || (u && u.dialogue && Array.isArray(u.dialogue.check) && u.dialogue.check.length)));
}

function renderExerciseStep(){
  stopExerciseAudio();
  clearKeyboardOptions();
  const contentEl = document.getElementById('step-content');
  const nextBtn = document.getElementById('step-next-btn');
  const total = STEP_STATE.exerciseList.length;

  const u = UNITS.find(x => x.id === STATE.currentUnitId);
  renderStepProgress();

  if (STEP_STATE.exerciseIndex >= total){
    // Dentro do passo "vocab", este motor de exercícios também roda as
    // fases de checkpoint/practice/mixed da sessão de aquisição -- esgotar
    // a fila aqui significa "avance de fase", não "termine a unidade". Só
    // vira tela de conclusão de verdade na consolidação final (passo
    // "exercises").
    const exhaustedKey = currentStepDefs(u)[STEP_STATE.currentStep].key;
    if (exhaustedKey === 'vocab'){
      advanceAcquisitionPhase();
      return;
    }
    if (exhaustedKey === 'checkpointExercises' && STEP_STATE.checkpointPhase === 'errors'){
      // Revisão dos Erros (✱) terminada -> consolidação normal da unidade.
      STEP_STATE.checkpointPhase = 'main';
      STEP_STATE.exerciseList = buildExerciseSet(u);
      STEP_STATE.exerciseIndex = 0;
      STEP_STATE.exerciseScore = 0;
      setAcqPhaseBanner(t('zh.path.banner.checkpoint'));
      renderExerciseStep();
      return;
    }
    // XP real do checkpoint: delta contra o snapshot tirado ao entrar em
    // 'exercises'/'checkpointExercises' (ver Fase 1) -- cobre tanto a
    // eventual Revisão dos Erros quanto a consolidação principal, as duas
    // juntas compõem esta "lição". O +25 de markUnitCompleted (bônus por
    // concluir a UNIDADE) só é concedido depois, quando "Continuar" for
    // clicado (ver finishCurrentLesson) -- não pertence a este XP.
    const xpEarned = STATE.xp - STEP_STATE.checkpointXpAtStart;
    const scorePct = total ? Math.round((STEP_STATE.exerciseScore / total) * 100) : 0;
    renderLessonCompleteScreen(u, isLessonUnit(u) ? currentLesson(u) : null, {
      challengesBefore: null, xpEarned, scorePct, trackHistory: false
    });
    return;
  }

  const ex = STEP_STATE.exerciseList[STEP_STATE.exerciseIndex];
  STEP_STATE.exerciseAnswered = false;
  nextBtn.style.display = 'none';

  if (ex.format === 'reorder'){
    renderReorderExercise(ex, contentEl, nextBtn, total);
  } else if (ex.format === 'fullsentence'){
    renderFullSentenceExercise(ex, contentEl, nextBtn, total); // Frase completa (zh)
  } else if (ex.format === 'scenario'){
    renderScenarioExercise(ex, contentEl, nextBtn, total);
  } else if (ex.format === 'trueFalse'){
    renderTrueFalseExercise(ex, contentEl, nextBtn, total);
  } else if (ex.format === 'cloze'){
    renderClozeExercise(ex, contentEl, nextBtn, total);
  } else if (ex.format === 'type'){
    renderVocabTypeExercise(ex, contentEl, nextBtn, total);
  } else {
    renderMultipleChoiceExercise(ex, contentEl, nextBtn, total);
  }
}

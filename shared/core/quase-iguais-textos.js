// E4 lote 5b: quase iguais com texto de toast/plural e recapitulação com pinyin.
// Unifica funções que eram QUASE iguais em fr/app.js e zh/app.js. O que mudava por idioma passou para os ganchos LANG_HOOKS
// (fr/lang-hooks.js e zh/lang-hooks.js, carregados antes do app.js) ou para uma verificação explícita (typeof/in) no próprio código.
// Mesmos nomes globais; nenhuma chamada muda. Carregado antes do app.js.

function addXP(amount){
  // amount 0 (ex: exerciseXP() em modo de revisão de lição, ver comentário
  // lá) nunca deve gerar toast/notificação/checagem de badge -- não é XP
  // de verdade, é só o funil compartilhado sendo chamado com nada a somar.
  if (!amount) return;
  STATE.xp += amount;
  ensurePeriodXp();
  STATE.periodXp.amount += amount;
  // Fase 6 da tarefa de conclusão de lição/unidade: alimenta o desafio
  // diário 'xp50' (GENERAL_CHALLENGES), que substituiu 'stars40'.
  ensureDailyBucket();
  STATE.daily.xp += amount;
  showToast(t('toast.xpGain', { amount }));
  // Fase 1 do sistema de notificações (evento "Cliente" -- ver
  // shared/notifications.js): fire-and-forget, o anti-spam (cooldown/
  // daily_cap da categoria "gamificacao") já evita virar spam a cada
  // exercício respondido.
  fireNotificationEvent('xp_earned', 'gamificacao', { amount });
  // Quase todo badge depende de streak, unidade, XP ou revisões -- e todos
  // esses caminhos já chamam addXP() em algum ponto (mesmo os de streak, via
  // registerStudyToday() logo antes/depois). Centralizar a checagem aqui
  // evita espalhar "será que ganhei um badge?" em cada função separada.
  // Exceção: "Ouvido Treinado" depende só de tocar áudio, que nunca passa
  // perto de addXP() sozinho -- registerAudioPlay() dispara a checagem
  // direto, sem esperar o próximo XP ganho.
  checkAndCelebrateBadges();
  // Checa cada Missão do dia individualmente ANTES do bônus do conjunto --
  // "Missão concluída" de cada uma, depois (se for o caso) o toast de +30XP
  // por ter fechado as 3.
  checkDailyMissionCompletions();
  // Checa a cada ganho de XP -- qualquer ação pode ser a que fecha a
  // última das 3 Missões do dia (ver checkDailyMissionsBonus). A função já
  // se protege contra rodar duas vezes no mesmo dia; addXP(30) chamando
  // addXP() de novo aqui dentro é seguro (não reentra infinitamente porque
  // missionsBonusAwarded já fica true ANTES desse addXP(30)).
  checkDailyMissionsBonus();
}

function answerSpeedQuestion(isCorrect, el, chosenIdx){
  if (SPEED_STATE.answered) return;
  // A3: sessão já encerrada (a aluna saiu) nunca grava nota.
  if (!SPEED_STATE.active) return;
  SPEED_STATE.answered = true;
  stopSpeedTimer();

  const elapsed = Date.now() - SPEED_STATE.timerStart;
  const card = SPEED_STATE.queue[SPEED_STATE.index];
  const options = Array.from(el.querySelectorAll('.speed-option'));
  const correctText = cardAnswerText(card);

  options.forEach((btn, i) => {
    btn.classList.add('disabled');
    if (btn.textContent === correctText) btn.classList.add('correct');
    else if (i === chosenIdx) btn.classList.add('incorrect');
  });

  // Projeto "Reorganização da experiência de revisão e prática": Speed
  // Review agora É revisão (a mesma fila devida do Flashcard, ver
  // buildSpeedQueue) -- toda resposta grada o cartão de verdade, não só as
  // de cartões nunca estudados. Escala simplificada (a UI de múltipla
  // escolha não tem como distinguir "Difícil" de "Fácil"): certo = Bom(2),
  // errado/tempo esgotado = Errei(0). Regra explícita, só pra Speed Review
  // -- Combinar continua NÃO fazendo isso (reconhecimento, não revisão;
  // só promove cartão nunca estudado, ver onMatchTileClick).
  applyMemoryGrade(card, isCorrect ? 2 : 0);
  trackReviewAnswer('speed_review', card, isCorrect ? 2 : 0);

  if (isCorrect){
    const speedBonus = Math.max(10, Math.round(100 * (1 - elapsed / SPEED_TIME_LIMIT)));
    SPEED_STATE.score += speedBonus;
    SPEED_STATE.correctCount += 1;
    SPEED_STATE.streak += 1;
    if (SPEED_STATE.streak > (SPEED_STATE.bestStreak || 0)) SPEED_STATE.bestStreak = SPEED_STATE.streak;
    if (SPEED_STATE.streak > 0 && SPEED_STATE.streak % 15 === 0 && SPEED_STATE.hearts < 3){
      SPEED_STATE.hearts += 1;
      showToast(t('toast.extraLife'));
    }
    showToast(t('toast.pointsGain', { n: speedBonus }));
  } else {
    SPEED_STATE.hearts -= 1;
    SPEED_STATE.streak = 0;
  }

  // Streak só conta no fim da SESSÃO (ver renderSpeedReview), não a cada
  // resposta isolada -- mesmo raciocínio do Flashcard (ver gradeCurrentCard).
  SPEED_STATE.index += 1;

  // A3: guardado em SPEED_STATE.advanceHandle (stopSpeedSession cancela) e preso a ESTA sessão.
  const session = SPEED_STATE.session;
  if (SPEED_STATE.advanceHandle) clearTimeout(SPEED_STATE.advanceHandle);
  SPEED_STATE.advanceHandle = setTimeout(() => {
    SPEED_STATE.advanceHandle = null;
    if (!SPEED_STATE.active || SPEED_STATE.session !== session) return;
    renderSpeedReview();
  }, 700);
}

function onMatchTileClick(btn){
  if (MATCH_STATE.busy) return;
  if (btn.classList.contains('matched') || btn.classList.contains('flipped')) return;

  btn.classList.add('flipped');

  if (!MATCH_STATE.selected){
    MATCH_STATE.selected = btn;
    return;
  }

  const first = MATCH_STATE.selected;
  const second = btn;
  MATCH_STATE.selected = null;
  MATCH_STATE.busy = true;

  const isMatch = first.dataset.cardId === second.dataset.cardId && first.dataset.side !== second.dataset.side;
  MATCH_STATE.attempts += 1;
  document.querySelector('.match-attempts').textContent = t('zh.review.match.attempts', { n: MATCH_STATE.attempts });

  if (isMatch){
    first.classList.add('match-ok');
    second.classList.add('match-ok');
    MATCH_STATE.matchedCount += 1;
    document.querySelector('.match-pairs').textContent = t('zh.review.match.pairs', { done: MATCH_STATE.matchedCount, total: MATCH_STATE.pairs.length });
    addXP(2);
    // Fase 8: mesma regra explícita da Fase 6 (Speed Review) -- um par
    // certo num cartão NUNCA estudado é evidência suficiente pra promovê-lo
    // pro motor de memória (mesmo critério de registerExerciseCorrect()).
    // Um cartão já em ciclo de revisão continua intocado -- combinar pares
    // é reconhecimento, não recuperação ativa (Princípio 4), e reagendar
    // due aqui recriaria o 2º sistema de memória que a Regra 6 proíbe.
    const matchedCard = MATCH_STATE.pairs.find(c => c.id === first.dataset.cardId);
    if (matchedCard && matchedCard.reps === 0){
      applyMemoryGrade(matchedCard, 2); // grade 2 = "Bom"
    }

    setTimeout(() => {
      first.classList.add('matched');
      second.classList.add('matched');
      MATCH_STATE.busy = false;

      if (MATCH_STATE.matchedCount === MATCH_STATE.pairs.length){
        registerStudyToday();
        STATE.totalReviews += MATCH_STATE.pairs.length;
        registerDailyMatchGame();
        trackEvent('lesson_complete', 'match_game', { pairs: MATCH_STATE.pairs.length });
        const matchMs = MATCH_STATE.startedAt ? Date.now() - MATCH_STATE.startedAt : 0;
        const matchIsRecord = recordMatchTime(matchMs);
        saveState();
        renderTopbarStats();
        setTimeout(() => {
          maybeShowStreakCelebration();
          document.getElementById('match-review-content').innerHTML = `
            <div class="match-complete">
              <div class="big-emoji">🎉</div>
              <h3>${t('review.match.allMatched')}</h3>
              <div class="score-num">${tp('review.match.attempts', MATCH_STATE.attempts === 1 ? 1 : 2, { n: MATCH_STATE.attempts })}</div>
              ${matchMs ? `<p class="review-record-line">${t('review.records.time', { time: formatRecordSeconds(matchMs) })} · ${matchIsRecord ? t('review.records.newRecord') : t('review.records.yourRecord', { record: formatRecordSeconds(reviewRecords().matchBestMs) })}</p>` : ''}
              <button class="btn btn-primary" id="match-restart-btn">${t('review.match.playAgain')}</button>
            </div>
          `;
          document.getElementById('match-restart-btn').addEventListener('click', startMatchGame);
        }, 300);
      }
    }, 550);
  } else {
    setTimeout(() => {
      first.classList.add('wrong');
      second.classList.add('wrong');
    }, 400);
    setTimeout(() => {
      first.classList.remove('flipped', 'wrong');
      second.classList.remove('flipped', 'wrong');
      MATCH_STATE.busy = false;
    }, 1100);
  }
}

// Tela "Lição concluída!" / "Ponto de verificação concluído!" -- ÚNICA
// função, usada tanto no fim de uma lição intermediária quanto no fim do
// Ponto de verificação (checkpoint) de uma unidade Modelo B, mas com
// título/recap DIFERENTES pra cada caso (ver isCheckpoint abaixo) -- antes
// os dois casos mostravam o mesmo título "Lição concluída!", o que é
// literalmente errado pro checkpoint (ele conclui a unidade inteira, não
// uma lição) e confundia quem via essa tela logo antes da tela de "Unidade
// concluída/Parabéns" (renderUnitCompleteScreen) com um título quase
// idêntico ao dela (bug relatado, 2026-09-15). XP e nota são sempre reais
// (delta contra o snapshot tirado no início da lição/checkpoint, ver
// xpAtLessonStart/checkpointXpAtStart em freshAcquisitionState/renderStep;
// nunca hardcoded). Sem estrelas -- eram um sistema paralelo de pontuação,
// não uma representação do XP real (retirado do fluxo de UNIDADE na Fase 6
// -- ver GENERAL_CHALLENGES/addXP; lessonStars/registerDailyStars continuam
// existindo só pro Ponto de verificação de MÓDULO, sistema fr-only
// separado). trackHistory=false (usado pelo checkpoint, == isCheckpoint
// aqui) pula o cache de navegação/roteamento de Voltar-Avançar e a rota pro
// Flashcard -- concluir o Ponto de verificação já tem seu próprio fluxo em
// finishCurrentLesson (markUnitCompleted + renderUnitCompleteScreen +
// Desafios de hoje), que não deve ser desviado por aqui. Streak (maybeShow-
// StreakCelebration) só dispara aqui quando NÃO é checkpoint -- o caso
// checkpoint é sempre seguido por renderUnitCompleteScreen (que já chama a
// mesma função), e mostrar a comemoração de sequência entre o resultado do
// checkpoint e a tela de Unidade concluída/objetivos comunicacionais estava
// fora de ordem (mesmo bug relatado): a sequência deve aparecer só DEPOIS
// da tela de Unidade concluída, nunca entre ela e o resultado do checkpoint.
function renderLessonCompleteScreen(u, lesson, { challengesBefore, xpEarned, scorePct, trackHistory = true }){
  const contentEl = document.getElementById('step-content');
  const nextBtn = document.getElementById('step-next-btn');
  const backBtn = document.getElementById('step-back-btn');
  const isCheckpoint = !trackHistory;
  hideAcqPhaseBanner();
  backBtn.style.display = 'none';
  document.getElementById('step-progress-fill').style.width = '100%';
  if (!isCheckpoint) maybeShowStreakCelebration();

  const recapItems = lessonRecapItems(u, lesson);
  const recapLabel = (lesson && lesson.vocabIdx && lesson.vocabIdx.length)
    ? t('zh.path.lessonDone.recapVocab')
    : t('zh.path.lessonDone.recapMissed');

  // reps > 0 exclui as palavras que a PRÓPRIA lição acabou de ensinar --
  // todo cartão nasce com due=0, então cardsDueNow() sozinho as contaria
  // como "devidas" (0 <= agora é sempre verdade) no exato instante em que
  // isCardLessonCompleted() passa a liberá-las, fazendo esta tela dizer que
  // há cartões pra revisar (e mandar direto pro Flashcard) depois de toda
  // lição com vocabulário novo -- mesmo critério já usado em
  // unitCardCounts() pra "dueForReview".
  const dueCount = structuralCounts(eligibleReviewPool()).due; // K.7: Devido estrutural (não-New vencido)
  contentEl.innerHTML = `
    <div class="lesson-complete">
      <div class="lesson-complete-icon tier-pop">✅</div>
      <h2>${isCheckpoint ? t('zh.path.lessonDone.checkpointTitle') : t('zh.path.lessonDone.lessonTitle')}</h2>
      <p class="lesson-boundary-title">${(!isCheckpoint && lesson) ? lesson.title : ''}</p>
      <div class="lesson-complete-stats">
        <div class="lc-stat"><div class="lc-stat-label">${t('zh.path.lessonDone.xpEarned')}</div><div class="lc-stat-value">+${xpEarned} ⚡</div></div>
        ${scorePct !== undefined && scorePct !== null ? `<div class="lc-stat"><div class="lc-stat-label">${t('zh.path.lessonDone.score')}</div><div class="lc-stat-value">${scorePct}%</div></div>` : ''}
      </div>
      ${dueCount > 0 ? `<p class="lesson-boundary-due">${tp('zh.path.lessonDone.cardsWaiting', dueCount)}</p>` : ''}
      ${challengesBefore ? renderChallengeChipHTML(challengesBefore) : ''}
      ${typeof duoLessonStripHTML === 'function' ? duoLessonStripHTML() : ''}
      ${recapItems.length ? `
        <div class="lesson-recap">
          <div class="lesson-recap-label">${recapLabel}</div>
          ${recapItems.map(item => `
            <div class="lesson-recap-item">
              <div class="lesson-recap-french">${audioBtnHTML(LANG_HOOKS.recapText(item))}<span>${LANG_HOOKS.recapText(item)}</span>${LANG_HOOKS.recapExtra(item)}</div>
              <div class="lesson-recap-trans">${item.t}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;
  wireAudioButtons(contentEl);

  if (!trackHistory){
    nextBtn.textContent = t('common.continueArrow');
    nextBtn.style.display = 'flex';
    return;
  }

  STEP_STATE.onLessonBoundaryScreen = { dueCount };
  // Cache SEPARADO (não onLessonBoundaryScreen, que openUnitDetail() zera
  // toda vez que a unidade é reaberta -- inclusive quando é o PRÓPRIO
  // router reabrindo pra restaurar um Voltar) -- ver shared/router.js:
  // Voltar até "Lição" e depois Avançar até "Resultado" de novo precisa
  // reconstruir a MESMA tela (mesmo chip de desafio), sem recalcular nada
  // (nunca reexecuta finishCurrentLesson nem mexe em XP/progresso -- só
  // repete este render com os mesmos insumos).
  STEP_STATE.lastUnitResultCache = { unitId: u.id, lesson, challengesBefore, xpEarned, scorePct, trackHistory };
  nextBtn.textContent = dueCount > 0 ? t('zh.path.reviewNowArrow', { n: dueCount }) : t('common.continueArrow');
  nextBtn.style.display = 'flex';

  if (typeof routerNavigate === 'function') routerNavigate({ type: 'unitResult', unitId: u.id });
}

// Tela "Unidade concluída!" (Fase 4 da tarefa de conclusão de lição/unidade;
// Tier 3 da hierarquia de celebração) -- SEMPRE aparece ao concluir uma
// unidade (decisão explícita, ver Q6 da grilagem), substituindo o toast
// "Unidade concluída! 🏮" que markUnitCompleted mostrava antes (Q5). Roda
// DEPOIS da tela de "Lição concluída" do checkpoint (que já mostrou
// vocabulário/nota daquela lição) -- a lista "O que você aprendeu" (todas as
// palavras da unidade, uma vez) foi pedida pela autora; o resto é só o que a
// unidade como um todo desenvolveu: competências (títulos das
// lições não-checkpoint desta unidade) e o objetivo comunicacional
// (unit.goal), ambos já autorados em content.js, nunca inventados (ver
// CLAUDE.md, "Coerência pedagógica entre funcionalidades").
// XP sempre real: delta contra o snapshot tirado ANTES de markUnitCompleted
// rodar (ver finishCurrentLesson) -- mesmo mecanismo de delta usado desde a
// Fase 1, nunca hardcoded. Se por algum motivo o delta for 0, a tela ainda
// aparece com "+0 XP" (Q4) -- nunca é pulada silenciosamente.
function renderUnitCompleteScreen(u, xpEarned){
  const contentEl = document.getElementById('step-content');
  const nextBtn = document.getElementById('step-next-btn');
  const backBtn = document.getElementById('step-back-btn');
  hideAcqPhaseBanner();
  backBtn.style.display = 'none';
  document.getElementById('step-progress-fill').style.width = '100%';
  maybeShowStreakCelebration();

  const competencies = (u.lessons || []).filter(l => !l.isCheckpoint).map(l => l.title).filter(Boolean);
  // Todas as palavras novas da unidade, na ordem das lições (decisão da
  // autora: sem agrupar e sem destacar erradas), com áudio e tradução.
  // Sem vocabIdx nas lições, cai na ordem do próprio vocabulário.
  const seenWords = new Set();
  const unitWords = [];
  const pushWord = i => { const v = u.vocab && u.vocab[i]; if (v && !seenWords.has(i)){ seenWords.add(i); unitWords.push(v); } };
  (u.lessons || []).forEach(l => (l.vocabIdx || []).forEach(pushWord));
  (u.vocab || []).forEach((_, i) => pushWord(i));

  contentEl.innerHTML = `
    <div class="lesson-complete tier-bounce">
      <div class="lesson-complete-icon">🎉</div>
      <h2>${t('zh.path.unitDone.congrats', { name: currentStudentName() })}</h2>
      <p class="lesson-boundary-title">${u.title}</p>
      <div class="lesson-complete-stats">
        <div class="lc-stat"><div class="lc-stat-label">${t('zh.path.lessonDone.xpEarned')}</div><div class="lc-stat-value" id="uc-stat-xp">+0 ⚡</div></div>
      </div>
      ${competencies.length ? `
        <div class="unit-skills">
          <div class="unit-skills-label">${t('zh.path.unitDone.skills')}</div>
          ${competencies.map(c => `<div class="unit-skill-item"><span class="unit-skill-check">✓</span><span>${c}</span></div>`).join('')}
        </div>
      ` : ''}
      ${unitWords.length ? `
        <div class="lesson-recap">
          <div class="lesson-recap-label">${tp('zh.path.unitDone.learnedWords', unitWords.length === 1 ? 1 : 2, { n: unitWords.length })}</div>
          ${unitWords.map(item => `
            <div class="lesson-recap-item">
              <div class="lesson-recap-french">${audioBtnHTML(LANG_HOOKS.recapText(item))}<span>${LANG_HOOKS.recapText(item)}</span>${LANG_HOOKS.recapExtra(item)}</div>
              <div class="lesson-recap-trans">${item.t}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${u.goal ? `
        <div class="unit-skills">
          <div class="unit-skills-label">${t('zh.path.unitDone.goalReached')}</div>
          <div class="unit-skill-item"><span class="unit-skill-check">✓</span><span>${u.goal}</span></div>
        </div>
      ` : ''}
    </div>
  `;
  // Marco de fim de UNIDADE (tier 3) -- confete + contador subindo, o peso
  // que antes (por engano) a tela de "Lição concluída" do checkpoint levava
  // pra si mesma (ver comentário histórico removido de renderLessonCompleteScreen).
  wireAudioButtons(contentEl);
  spawnConfetti(20, 1800);
  animateCount(document.getElementById('uc-stat-xp'), xpEarned, { prefix: '+', suffix: ' ⚡' });

  STEP_STATE.onUnitCompleteScreen = true;
  // Cache pra restaurar via Voltar/Avançar (mesmo padrão de lastUnitResultCache)
  // -- nunca reexecuta markUnitCompleted nem recalcula XP.
  STEP_STATE.lastUnitCompleteCache = { unitId: u.id, xpEarned };
  nextBtn.textContent = t('common.continueArrow');
  nextBtn.style.display = 'flex';

  if (typeof routerNavigate === 'function') routerNavigate({ type: 'unitComplete', unitId: u.id });
}

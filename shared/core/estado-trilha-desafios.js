// E4 lote 4: estado e persistência, mapa da trilha, checkpoint, desafios e utilidades.
// Extraído de fr/app.js e zh/app.js, onde o texto era IDÊNTICO nos dois (levantamento: docs/i18n/e4-levantamento-funcoes.md).
// Sem renomear: continuam funções globais (os <script> clássicos compartilham o escopo, então STATE, UNITS etc. do app.js
// são achados na hora da chamada). Editar AQUI vale para os dois idiomas; se um idioma precisar de comportamento próprio,
// declare a função no app.js dele com o mesmo nome e um comentário explicando (a declaração do app.js, carregada depois, vence).
// Carregado antes do app.js em fr/index.html e zh/index.html.

function playFeedbackTone(ctx, freq, startTime, duration, peakGain){
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, startTime);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, startTime);
  g.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

// ---------- "Já sei?" — marca um cartão de vocabulário como já dominado ----------
// Aplica o mesmo efeito de responder "Fácil" no SM-2 (empurra o intervalo bem pra
// frente), sem precisar passar pelos exercícios da unidade. Conforme decidido,
// isso também conta para fins de conclusão da unidade (soma-se aos cartões que
// já foram estudados via exercícios normais).
function wireKnowButtons(container){
  container.querySelectorAll('.know-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const cardId = btn.dataset.cardId;
      const card = STATE.cards.find(c => c.id === cardId);
      if (!card) return;
      // K2-E: "já sei" é da PALAVRA. O botão grada/reseta o card A (o do id
      // recebido); se a palavra só tem evidência via a irmã B, não há o que
      // desmarcar em A -- avisa em vez de reescrever o histórico de B.
      const siblings = studyWordCardsFor(STATE.cards, card.unitId, card.vocabIdx);
      if (card.reps === 0 && studyWordHasEvidence(siblings)){
        showToast('Esta palavra já foi estudada pelo cartão inverso.');
        return;
      }

      if (card.reps > 0){
        // já estava marcado — permite desmarcar caso tenha sido engano.
        // Fase 15: precisa resetar TAMBÉM os campos do motor FSRS (não só
        // os legados de compatibilidade) -- senão o cartão ficava num
        // estado inconsistente (reps=0/due=0 mas state='review' e
        // stability>0), e desmarcar+remarcar de novo reaproveitava a
        // stability antiga em vez de tratar como aprendizagem nova.
        card.reps = 0;
        card.interval = 0;
        card.due = 0;
        card.ef = 2.5;
        card.firstLearnedDate = null;
        card.stability = 0;
        card.difficulty = 0;
        card.state = 'new';
        card.lastReview = null;
        card.fsrsReps = 0;
        card.fsrsLapses = 0;
        btn.classList.remove('known');
        btn.textContent = t('zh.path.knownAsk');
      } else {
        applyMemoryGrade(card, 3); // grade 3 = "Fácil" -- Fase 5: motor novo
        btn.classList.add('known');
        btn.textContent = t('zh.path.knownDone');
        showToast(t('toast.markedKnown'));
      }
      // K2-E: o rótulo reflete a PALAVRA (A ou B com histórico).
      const wordKnown = studyWordHasEvidence(siblings);
      btn.classList.toggle('known', wordKnown);
      btn.textContent = wordKnown ? '✓ Já sei' : 'Já sei?';

      saveState();
      checkUnitCompletion(STATE.currentUnitId);
      renderUnitsGrid(); // atualiza contadores de progresso na trilha (se visitada depois)
    });
  });
}

// Busca os flashcards atribuídos a esta conta (shared/teacher-flashcards.js)
// e mescla em STATE.cards -- precisa rodar ANTES de loadState()/
// applySerializedState(), pra que o merge por id lá (Fase 0: "cartão salvo
// sem correspondência na lista fresca é descartado silenciosamente")
// encontre esses ids já presentes e restaure o progresso de memória já
// acumulado. Busca TODOS os status (ativo e arquivado) de propósito --
// arquivar não pode apagar progresso já salvo, só tirar o cartão da fila
// de revisão (ver isCardLessonCompleted). Idempotente dentro da mesma
// sessão -- não recarrega uma edição feita pela professora no meio da
// sessão, mesmo princípio de STATE.units não recarregar ao vivo.
// Fase 5, fechamento -- dedup agora é POR CARD (checa `card.id` de cada
// elemento do array devolvido por buildCardFromTeacherFlashcard), não
// mais por um único id "representante" da linha. Isso é estritamente
// necessário pra normal_reversed/Cloze multi-marca: o id "representante"
// de uma linha cloze multi-marca (`t${row.id}`) nunca existe de verdade
// (os ids reais são `t${row.id}-c1`/`-c2`/...) -- checar só ele faria o
// guard de idempotência nunca bater, duplicando cartões numa 2ª chamada.
async function mergeTeacherFlashcardsIntoState(){
  if (typeof fetchFlashcardsForCurrentStudent !== 'function') return;
  const [rows, activeTeacher] = await Promise.all([
    fetchFlashcardsForCurrentStudent(APP_KEY),
    typeof fetchMyActiveTeacherId === 'function' ? fetchMyActiveTeacherId(APP_KEY) : Promise.resolve(undefined),
  ]);
  CLASS_ACTIVE_TEACHER_ID = activeTeacher;
  if (!rows.length) return;
  const existingIds = new Set(STATE.cards.map(c => c.id));
  rows.forEach(row => {
    buildCardFromTeacherFlashcard(row).forEach(card => {
      if (existingIds.has(card.id)) return;
      STATE.cards.push(card);
      existingIds.add(card.id);
    });
  });
}

// Busca os cartões que a PRÓPRIA aluna já criou (shared/own-flashcards.js)
// e mescla em STATE.cards -- mesmo motivo/posicionamento de
// mergeTeacherFlashcardsIntoState() (precisa rodar ANTES de loadState(),
// ver comentário lá). Busca todos os status de propósito, mesma razão.
// Fase 5, fechamento -- dedup por card, mesmo motivo/mecanismo de
// mergeTeacherFlashcardsIntoState() acima.
async function mergeSelfFlashcardsIntoState(){
  if (typeof fetchMyOwnFlashcards !== 'function') return;
  const rows = await fetchMyOwnFlashcards(APP_KEY);
  if (!rows.length) return;
  const existingIds = new Set(STATE.cards.map(c => c.id));
  rows.forEach(row => {
    buildCardFromSelfFlashcard(row).forEach(card => {
      if (existingIds.has(card.id)) return;
      STATE.cards.push(card);
      existingIds.add(card.id);
    });
  });
}

// Empurra um cartão recém-criado por shared/my-flashcards.js direto em
// STATE.cards, sem esperar o próximo boot (mergeSelfFlashcardsIntoState()
// só roda no carregamento do app) -- assim ele já entra na fila de revisão
// nesta mesma sessão. Idempotente pelo mesmo padrão do merge acima.
// Fase 5, fechamento -- buildCardFromSelfFlashcard() agora devolve `Card[]`
// (normal_reversed/Cloze multi-marca podem produzir 2+ cartões pra uma
// única linha criada); espalha TODOS em STATE.cards, checando cada id
// individualmente -- nunca `.push()` do array inteiro como 1 elemento só.
function addSelfFlashcardToState(row){
  const existingIds = new Set(STATE.cards.map(c => c.id));
  buildCardFromSelfFlashcard(row).forEach(card => {
    if (existingIds.has(card.id)) return;
    STATE.cards.push(card);
  });
}

// Espelha um arquivar/reativar feito em shared/my-flashcards.js direto no
// STATE.cards já carregado, mesmo motivo de addSelfFlashcardToState() --
// sem isto, isCardLessonCompleted() só veria o novo status no próximo boot.
// Casa por `rowId` (não pelo id com sufixo de revisão) -- arquivar/reativar
// nunca muda a revisão, mas o card já pode ter um id `s${id}-r${n}` se já
// foi editado antes, então reconstruir `s${rowId}` sem checar a revisão
// atual não encontraria o cartão certo.
// Fase 5, fechamento -- `.forEach()` em vez de `.find()`: uma linha agora
// pode ter gerado 2+ cartões que compartilham o MESMO rowId (as 2 metades
// de normal_reversed, ou c1/c2/... de um Cloze multi-marca) -- `.find()`
// só atualizaria o primeiro que aparecesse, deixando os demais com
// `flashcardStatus` desatualizado até o próximo reload.
function updateSelfFlashcardStatusInState(rowId, status){
  STATE.cards.forEach(c => {
    if (c.origin === 'self' && String(c.rowId) === String(rowId)) c.flashcardStatus = status;
  });
}

// Prop 4 (ver CLAUDE.md, "7 propostas") -- remove um cartão apagado de
// verdade (deleteOwnFlashcardPermanently) do STATE.cards JÁ CARREGADO
// nesta sessão -- sem isto, o cartão só sumiria da fila de revisão no
// próximo boot (mesmo motivo de updateSelfFlashcardStatusInState acima).
function removeSelfFlashcardFromState(rowId){
  STATE.cards = STATE.cards.filter(c => !(c.origin === 'self' && String(c.rowId) === String(rowId)));
}

// Prop 4 -- espelha uma EDIÇÃO de conteúdo (updateOwnFlashcardContent) na
// MESMA sessão: remove a entrada antiga (progresso de memória descartado
// de propósito, grillado com a autora) e insere uma fresca a partir da
// linha já atualizada (com `revision` incrementado) -- reaproveita
// addSelfFlashcardToState(), que já computa o id novo via
// flashcardIdForRow(). Sem isto, a edição só "resetaria" no próximo boot.
function replaceSelfFlashcardInState(rowId, updatedRow){
  removeSelfFlashcardFromState(rowId);
  addSelfFlashcardToState(updatedRow);
}

async function loadStateAndRender(){
  // Fase 3 do sistema de alunas particulares (ver CLAUDE.md): precisa
  // rodar ANTES de loadState(), pra que os cartões de professora já
  // estejam em STATE.cards quando applySerializedState() fizer o merge
  // por id (senão um cartão salvo sem correspondência na lista fresca é
  // descartado -- exatamente o bloqueio identificado na Fase 0).
  await mergeTeacherFlashcardsIntoState();
  await mergeSelfFlashcardsIntoState();
  await loadState();
  if (typeof applyPendingBankReviews === 'function') await applyPendingBankReviews();
  // Fase 10: aplica a preferência de frequência de revisão (padrão ou
  // salva) no motor FSRS -- precisa rodar antes de qualquer grading real.
  setDesiredRetention(reviewFrequencyToRetention(STATE.studySettings.reviewFrequency));
  seedEarnedBadges();
  renderTopbarStats();
  renderUnitsGrid();
  renderExportDeckSelect(ANKI_EXPORT_CONFIG);
  maybeShowReviewReminder();
  maybeSendStudyReminder();
  // +N da aba Aluno > Revisão (cartões da professora) já com o progresso carregado.
  if (typeof muralApplyBadges === 'function') muralApplyBadges();
}

function registerStudyToday(){
  const today = todayStr();

  // Histórico de atividade por dia (para o heatmap de progresso) — conta
  // quantas respostas de exercício/revisão aconteceram em cada dia.
  STATE.activityLog[today] = (STATE.activityLog[today] || 0) + 1;

  if (STATE.lastStudyDay === today) return; // streak já contabilizada hoje
  const yStr = dateStrDaysAgo(1);
  if (STATE.lastStudyDay === yStr){
    STATE.streak += 1;
  } else {
    // Perdeu o streak (não é a primeira vez estudando nem um dia normal de
    // continuação) -- se voltou depois de um hiato curto (perdeu 1 a 3 dias),
    // registra pro badge "De volta ao jogo" (artefato §8): recompensa
    // retomada rápida em vez de só punir a quebra.
    if (STATE.lastStudyDay){
      const gapDays = Math.round((new Date(today) - new Date(STATE.lastStudyDay)) / 86400000);
      if (gapDays >= 2 && gapDays <= 4) STATE.hadStreakComeback = true;
    }
    STATE.streak = 1;
  }
  STATE.lastStudyDay = today;
  // Marco de sequência (5, 10, 15... 365) para a atividade dos amigos (shared/friends.js, migration 086).
  if (typeof friendsRecordStreakMilestone === 'function') friendsRecordStreakMilestone(STATE.streak, today);
  // Não mostra a tela de sequência AGORA -- isso interromperia no meio de
  // uma atividade (ex: no meio de uma sessão de revisão, competindo até com
  // o áudio automático da próxima carta). Só marca que tem uma comemoração
  // pendente; maybeShowStreakCelebration() é quem decide o momento certo
  // (fim da atividade), chamada nas telas de "sessão concluída".
  STATE.pendingStreakCelebration = true;
}

function ensureDailyBucket(){
  const today = todayStr();
  if (STATE.daily.date !== today){
    STATE.daily = freshDailyBucket(today);
  } else {
    // Reconcilia: preenche só os campos que ainda NÃO existem no balde de
    // hoje -- cobre a conta que já tinha usado o app hoje antes de um
    // deploy adicionar um campo novo (ver auditoria "O problema dos 100%").
    // Nunca sobrescreve um campo que já tem valor real.
    const fresh = freshDailyBucket(today);
    Object.keys(fresh).forEach(key => {
      if (!(key in STATE.daily)) STATE.daily[key] = fresh[key];
    });
  }
}

function challengeById(id){
  for (const pool of ALL_CHALLENGE_POOLS){
    const found = pool.find(c => c.id === id);
    if (found) return found;
  }
  return null;
}

// As 3 missões do dia são sorteadas e a feasibility da secundária resolvida
// UMA VEZ (no primeiro acesso do dia), depois congeladas em
// STATE.daily.missions -- nunca recalculadas de novo no mesmo dia (rodada 1
// de grilling: "freeze feasibility once at day-start"). Isso também é o que
// o notification-cron passa a ler direto (state.daily.missions), em vez de
// resortear sozinho com sua própria cópia de dailySeed()/pickDailyFromPool().
function todaysChallenges(){
  ensureDailyBucket();
  if (!STATE.daily.missions){
    STATE.daily.missions = assignTodaysMissions();
    saveState();
  }
  return STATE.daily.missions.map(materializeMission).filter(Boolean);
}

// Tocar numa missão do dia leva à atividade dela (pedido da autora, 2026-10-15). Missão sem destino próprio
// (primeira lição, XP, nota alta, gramática, áudios, blocos, sequência) abre a próxima lição da trilha.
const DAILY_MISSION_TARGETS = {
  duo: 'friends',
  conj1: 'conjugaison', conjCorrect10: 'conjugaison', conjTenses2: 'conjugaison',
  reviews15: 'review', overdue3: 'review', speedReview1: 'review:speed', matchGame1: 'review:match',
  hanzi1: 'hanzi', hanzi2: 'hanzi',
};
function openDailyMissionTarget(id){
  const target = DAILY_MISSION_TARGETS[id] || 'path';
  const [tab, mode] = target.split(':');
  if (tab !== 'path' && !document.getElementById(`view-${tab}`)) return; // aba que não existe neste idioma
  if (typeof switchTab !== 'function') return;
  switchTab(tab);
  if (tab === 'friends'){
    setTimeout(() => document.getElementById('friends-duo')?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 400);
  } else if (tab === 'review' && mode && typeof openReviewSession === 'function'){
    openReviewSession(mode);
  } else if (tab === 'path' && typeof nextTrailItem === 'function' && typeof trailGroups === 'function' && typeof openUnitDetail === 'function'){
    const next = nextTrailItem(trailGroups(), STATE.unitProgress);
    if (next) openUnitDetail(next.unitId);
  }
}

function renderDailyChallengesScreen(){
  const contentEl = document.getElementById('step-content');
  const nextBtn = document.getElementById('step-next-btn');
  document.getElementById('step-back-btn').style.display = 'none';
  document.getElementById('step-progress-fill').style.width = '100%';

  contentEl.innerHTML = `
    <div class="challenges-screen">
      <h2>${t('trail.dailyMissions.caption')}</h2>
      ${todaysChallenges().map((c, i) => {
        // Number(...)||0: um campo ausente nunca mais vira NaN silencioso
        // (ver auditoria "O problema dos 100%") -- current fica sempre um
        // número válido entre 0 e c.target.
        const current = Math.min(Number(c.get(STATE.daily)) || 0, c.target);
        const pct = Math.round((current / c.target) * 100);
        return `
          <div class="daily-challenge-card">
            <div class="daily-challenge-icon-sq slot-${i}">${c.icon}</div>
            <div class="daily-challenge-body">
              <div class="daily-challenge-label">${c.label}</div>
              <div class="daily-challenge-progress-row">
                <div class="daily-challenge-progress-track"><div class="daily-challenge-progress-fill" style="width:${pct}%"></div></div>
                <div class="daily-challenge-fraction">${current}/${c.target}</div>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
  nextBtn.textContent = t('common.continueArrow');
  nextBtn.style.display = 'flex';

  // BUG real corrigido aqui (relatado pela autora, 2026-09-15): esta tela é
  // SEMPRE a próxima depois de "Unidade concluída!" (renderUnitCompleteScreen,
  // que já empurrou a rota 'unitComplete'). Empurrar a MESMA rota
  // 'unitComplete' de novo aqui é um no-op silencioso (routerNavigate só
  // ignora rotas iguais à atual) -- o hash da URL nunca avançava, ficando
  // travado em #/unit/X/complete pelo resto da sessão (Desafios -> Trilha
  // -> qualquer coisa), até a próxima navegação que de fato mude de rota.
  // Resultado: qualquer reload/restauração de aba nesse meio-tempo (aba em
  // segundo plano descartada e recarregada, ou um popstate espúrio com o
  // heap de JS ainda vivo) reexecutava a rota 'unitComplete' -- com o cache
  // ainda válido, isso literalmente reabria a tela "Parabéns" do zero, sem
  // nenhum clique do aluno. "Continuar" aqui sempre leva pra Trilha (ver
  // onChallengesScreen no listener de #step-next-btn), então a rota certa
  // pra esta tela é 'tab'/'path' (mesmo destino, hash vazio) -- se um reload
  // acontecer enquanto esta tela ainda está aberta, cai direto na Trilha,
  // nunca replay da celebração.
  if (typeof routerNavigate === 'function') routerNavigate({ type: 'tab', tab: 'path' });
}

// Segunda-feira da semana corrente, formato 'YYYY-MM-DD' -- mesmo padrão de
// chave usado no resto do app (activityLog, dailyLessonsLog etc.).
function currentWeekStart(){
  const d = new Date();
  const diffToMonday = d.getDay() === 0 ? -6 : 1 - d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  return `${monday.getFullYear()}-${String(monday.getMonth()+1).padStart(2,'0')}-${String(monday.getDate()).padStart(2,'0')}`;
}

function ensurePeriodXp(){
  const weekStart = currentWeekStart();
  if (STATE.periodXp.weekStart !== weekStart) STATE.periodXp = { weekStart, amount: 0 };
}

// Fins de semana com estudo no sábado E no domingo seguinte (dias do activityLog).
function countStudyWeekends(log){
  const key = dt => `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
  let n = 0;
  Object.keys(log || {}).forEach(k => {
    if (!(log[k] > 0)) return;
    const d = new Date(k + 'T12:00:00');
    if (d.getDay() !== 6) return;
    if (log[key(new Date(d.getTime() + 86400000))] > 0) n++;
  });
  return n;
}

function showBadgeUnlockCelebration(badge, onDone){
  const layer = document.getElementById('badge-unlock-layer');
  if (!layer){ onDone?.(); return; }
  const el = document.createElement('div');
  el.className = 'badge-unlock-toast';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.innerHTML = `
    <div class="badge-unlock-icon${badge.tier ? ' tier-' + badge.tier : ''}">${typeof badgeIconHTML === 'function' ? badgeIconHTML(badge) : badge.icon}</div>
    <div class="badge-unlock-text">
      <div class="badge-unlock-label">${badge.level > 1 ? t('badge.ui.levelUp') : t('badge.ui.newBadge')}</div>
      <div class="badge-unlock-name">${badge.name}</div>
      <div class="badge-unlock-desc">${badge.desc}</div>
    </div>
  `;
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    el.remove();
    onDone?.();
  };
  el.addEventListener('click', () => {
    finish();
    // Em modo foco de lição (ver setLessonFocusMode), switchTab() sozinho
    // não desfaz o .lesson-focus no #app/body -- a Trilha some, a tela de
    // Progresso renderiza sem o shell normal (topbar/sidebar) por baixo e
    // fica esticada. Fora de uma lição não tem esse estado pra limpar, e o
    // clique continua levando pra Progresso normalmente.
    if (document.body.classList.contains('lesson-focus')) return;
    switchTab('progress');
  });
  layer.appendChild(el);
  setTimeout(finish, 4000);
}

function recalculateUnlockedUnits(){
  // Regra única em shared/trail-state-model.js (recalcUnlocked): trilha de um
  // grupo só; a 1ª unidade liberada, as demais quando a anterior foi concluída.
  recalcUnlocked(trailGroups(), STATE.unitProgress);
}

// Progresso fracionário de 0 a 1: concluída conta 1 mesmo depois do reset de
// lessonIdx no fim da unidade (ver finishCurrentLesson); unidades com lições
// usam lessonIdx/lessons.length; as demais (motor antigo) usam a fração de
// palavras já aprendidas no SRS, como sempre foi.
function unitProgressFraction(u){
  const prog = STATE.unitProgress[u.id];
  if (prog.completed) return 1;
  if (isLessonUnit(u)){
    return u.lessons.length ? currentLessonIdx(u.id) / u.lessons.length : 0;
  }
  const { total, learned } = unitCardCounts(u.id);
  return total ? learned / total : 0;
}

// Estado da Unidade na trilha: "done" (concluída), "current" (desbloqueada,
// a próxima da fila) ou "locked". Note que precisa checar completed ANTES de
// olhar lessonIdx -- finishCurrentLesson zera lessonIdx ao fechar a unidade
// (pra permitir reabrir do início como revisão), então lessonIdx sozinho
// mentiria "0 de 4" numa unidade que na verdade já terminou.
// Fase 2: agora vem de trailItemState (shared/trail-state-model.js) --
// 'done' | 'skipped' | 'current' (só UMA por trilha) | 'available' | 'locked'.
function unitBlockState(u){
  return trailItemState(u, trailGroups(), STATE.unitProgress);
}

// Estado de UMA lição dentro do bloco expandido da unidade.
function lessonRowState(u, idx){
  if (unitBlockState(u) === 'skipped') return 'skipped';
  if (STATE.unitProgress[u.id].completed) return 'done';
  const cur = currentLessonIdx(u.id);
  if (idx < cur) return 'done';
  if (idx === cur) return 'current';
  return 'locked';
}

// .ub-header é uma div (não um <button>, porque contém a seta que é seu
// próprio botão -- button dentro de button é inválido) -- isto devolve a
// ela a ativação por teclado que um <button> teria de graça.
function wireHeaderActivation(el, handler){
  el.setAttribute('role', 'button');
  el.setAttribute('tabindex', '0');
  el.addEventListener('click', handler);
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); handler(e); }
  });
}

function isDailyChallengesStripCollapsed(){
  const v = localStorageSafeGet(CHALLENGES_STRIP_COLLAPSE_KEY);
  // Fase 3: sem preferência salva, a faixa começa recolhida no celular (ocupava
  // ~208px antes da primeira unidade) e aberta no desktop.
  if (v === null || v === undefined) return !!(window.matchMedia && window.matchMedia('(max-width: 899px)').matches);
  return v === '1';
}

// Faixa compacta e SEMPRE visível com as 3 Missões do dia (ex-"Desafios de
// hoje" -- ver artefato de navegação, rastreador) -- diferente de
// renderDailyChallengesScreen (tela cheia, só aparece ao terminar uma
// unidade), essa dá visibilidade contínua sem exigir terminar nada primeiro.
// Reaproveita a mesma fonte de dados (todaysChallenges()) -- não duplica
// lógica, só um resumo visual mais compacto dela. O título funciona como
// botão de recolher/expandir. Renderiza no MESMO markup em dois lugares
// (Trilha no mobile + card da sidebar no desktop, Fase 3): CSS decide qual
// dos dois fica visível conforme a largura da tela, nunca os dois juntos.
function renderDailyChallengesStrip(){
  const targets = ['daily-challenges-strip', 'side-missions-body']
    .map(id => document.getElementById(id))
    .filter(Boolean);
  if (!targets.length) return;
  ensureDailyBucket();
  const collapsed = isDailyChallengesStripCollapsed();
  const cardsHTML = todaysChallenges().map((c, i) => {
    // Number(...)||0: um campo ausente nunca mais vira NaN silencioso (ver
    // auditoria "O problema dos 100%") -- current fica sempre um número
    // válido entre 0 e c.target.
    const current = Math.min(Number(c.get(STATE.daily)) || 0, c.target);
    const pct = Math.round((current / c.target) * 100);
    const done = current >= c.target;
    return `
      <button type="button" class="dcs-card ${done ? 'done' : ''}" data-mission-go="${escapeAttr(String(c.id || ''))}">
        <div class="dcs-icon-sq slot-${i}">${c.icon}</div>
        <div class="dcs-body">
          <div class="dcs-card-label">${c.label}</div>
          <div class="dcs-progress-row">
            <div class="dcs-track"><div class="dcs-fill" style="width:${pct}%"></div></div>
            <div class="dcs-fraction">${current}/${c.target}</div>
          </div>
        </div>
      </button>
    `;
  }).join('') + (typeof duoDailyStripRowHTML === 'function' ? duoDailyStripRowHTML() : '');
  const html = `
    <button class="dcs-caption-btn" type="button" aria-expanded="${collapsed ? 'false' : 'true'}">
      <span class="dcs-caption">${t('trail.dailyMissions.caption')}</span>
      <span class="dcs-caption-chevron">▾</span>
    </button>
    <div class="dcs-cards" ${collapsed ? 'style="display:none;"' : ''}>${cardsHTML}</div>
  `;
  targets.forEach(strip => {
    strip.innerHTML = html;
    strip.querySelector('.dcs-caption-btn').addEventListener('click', () => {
      localStorageSafeSet(CHALLENGES_STRIP_COLLAPSE_KEY, isDailyChallengesStripCollapsed() ? '0' : '1');
      renderDailyChallengesStrip();
    });
    strip.querySelectorAll('[data-mission-go]').forEach(card => card.addEventListener('click', () => openDailyMissionTarget(card.dataset.missionGo)));
  });
}

// Divide o vocabulário da unidade em blocos de ACQ_BLOCK_SIZE palavras. Evita
// deixar um bloco final órfão de 1 palavra sozinha (funde no bloco anterior),
// já que um "grupo" de 1 não cumpre a função pedagógica de grupo pequeno.
function buildAcquisitionBlocks(unit){
  const n = unit.vocab.length;
  const blocks = [];
  let i = 0;
  while (i < n){
    let size = Math.min(ACQ_BLOCK_SIZE, n - i);
    if (n - (i + size) === 1) size += 1;
    blocks.push(Array.from({ length: size }, (_, k) => i + k));
    i += size;
  }
  return blocks;
}

// Progresso real dentro da lição: cada etapa (vocabulário/diálogo/dica de
// uso/exercícios, ou explicação/exercícios na gramática) vale uma fatia
// igual da barra -- mas dentro da etapa atual soma a fração já percorrida
// (carta de vocabulário atual, exercício atual), em vez de pular direto pra
// o fim da fatia assim que a etapa começa. Sem isso, a barra aparecia quase
// toda preenchida logo no 1º exercício, só porque "Exercícios" é a última
// das 4 etapas -- media a POSIÇÃO da etapa, não o que já foi de fato feito
// dentro dela.
// Fases que a sessão de aquisição do bloco ATUAL vai percorrer, na ordem --
// determinístico a partir do estado (não precisa adivinhar o futuro):
// "bridge" só existe pra unidades com lições, a partir da 2ª; "mixed" só
// entra quando este não é o primeiro bloco da unidade (mesma condição de
// advanceAcquisitionPhase). Cada fase recebe uma fatia igual da barra --
// simples e previsível, sem precisar conhecer de antemão quantos exercícios
// cada fase vai ter.
function acqPhaseSequence(u, acq){
  const seq = [];
  if (isLessonUnit(u) && currentLessonIdx(u.id) > 0) seq.push('bridge');
  seq.push('intro', 'checkpoint', 'practice');
  if (acq.blockIdx > 0) seq.push('mixed');
  return seq;
}

// Checagem imediata do bloco (ETAPA 2): recuperação ativa de reconhecimento
// (formato "meaning") pra CADA palavra recém-introduzida no bloco, uma de
// cada vez -- não é "você entendeu?", é "reconheça de novo, sem ajuda".
function buildBlockCheckpointQueue(unit, blockIndices){
  return blockIndices.map(idx => {
    const item = unit.vocab[idx];
    const distractors = shuffle(unit.vocab.filter(v => v !== item)).slice(0, 3);
    return { format: 'meaning', item, options: shuffle([item, ...distractors]), vocabIdx: idx };
  });
}

// Prática mista (ETAPA 5): uma rodada por palavra já introduzida (bloco atual
// + todos os anteriores), embaralhada -- força recuperar da memória em vez
// de repetir a ordem em que acabou de ver. Palavras com erro nesta sessão
// ganham uma repetição extra (mais exposição pra quem tem mais dificuldade,
// sem tratar palavra fácil e difícil da mesma forma).
function buildMixedQueue(unit, introducedIndices){
  const acq = STEP_STATE.acq;
  const base = introducedIndices.map(idx => buildVocabWordExercise(unit, idx, 'mixed'));
  const extra = introducedIndices
    .filter(idx => (acq.wordMisses[idx] || 0) >= 1)
    .map(idx => buildVocabWordExercise(unit, idx, 'mixed'));
  return shuffle([...base, ...extra]);
}

function buildPracticeQueue(unit, blockIndices){
  return blockIndices.map(idx => buildVocabWordExercise(unit, idx, 'practice'));
}

// Fim da introdução do bloco atual -> mostra os conceitos que esse bloco
// libera (se houver) e só DEPOIS começa a checagem imediata (ETAPA 2). Sem
// conceito pendente, comporta-se exatamente como antes (checagem na hora).
function finishBlockIntro(){
  const acq = STEP_STATE.acq;
  const u = UNITS.find(x => x.id === STATE.currentUnitId);
  runConceptQueueThen(pendingConceptsForBlock(u, acq.blockIdx), () => startBlockCheckpoint(u, acq));
}

// Ponte com a lição anterior (†, Modelo B): reconhece rapidamente 1-2
// itens da lição imediatamente anterior antes de entrar na introdução da
// lição atual -- gancho comunicativo curto, NUNCA a mistura cumulativa de
// todas as lições que existia antes (essa função é o substituto direto
// dela, com escopo muito menor e só entre lições consecutivas).
function startBridgeQueue(u){
  const idx = currentLessonIdx(u.id);
  const prevLesson = idx > 0 ? u.lessons[idx - 1] : null;
  const bridgeVocab = (prevLesson && prevLesson.vocabIdx || []).slice(0, 2);
  if (!bridgeVocab.length){
    STEP_STATE.acq.phase = 'intro';
    renderStep();
    return;
  }
  STEP_STATE.exerciseList = buildBlockCheckpointQueue(u, bridgeVocab);
  STEP_STATE.exerciseIndex = 0;
  STEP_STATE.exerciseScore = 0;
  setAcqPhaseBanner(t('zh.path.banner.recall'));
  renderExerciseStep();
}

function startBlockCheckpoint(u, acq){
  acq.phase = 'checkpoint';
  STEP_STATE.exerciseList = buildBlockCheckpointQueue(u, acq.blocks[acq.blockIdx]);
  STEP_STATE.exerciseIndex = 0;
  STEP_STATE.exerciseScore = 0;
  setAcqPhaseBanner(acqPhaseBannerText('checkpoint'));
  renderExerciseStep();
}

// Chamado quando a fila de exercícios da fase atual (checkpoint/practice/
// mixed) se esgota -- decide a PRÓXIMA fase da sessão de aquisição, em vez
// de simplesmente terminar a unidade (isso só acontece de fato depois da
// consolidação final, no passo "exercises" -- ver renderExerciseStep).
function advanceAcquisitionPhase(){
  const acq = STEP_STATE.acq;
  const u = UNITS.find(x => x.id === STATE.currentUnitId);

  if (acq.phase === 'bridge'){
    // Ponte concluída -> introdução normal da lição atual.
    acq.phase = 'intro';
    renderStep();
    return;
  }

  if (acq.phase === 'checkpoint'){
    // Checagem feita -> prática do próprio bloco (ETAPA 3). Conta pra nota
    // da lição (ver lessonScore em freshAcquisitionState) -- a ponte com a
    // lição anterior, acima, nunca conta, só as fases que testam o
    // conteúdo desta lição de verdade.
    acq.lessonScore.correct += STEP_STATE.exerciseScore;
    acq.lessonScore.total += STEP_STATE.exerciseList.length;
    acq.phase = 'practice';
    STEP_STATE.exerciseList = buildPracticeQueue(u, acq.blocks[acq.blockIdx]);
    STEP_STATE.exerciseIndex = 0;
    STEP_STATE.exerciseScore = 0;
    setAcqPhaseBanner(acqPhaseBannerText('practice'));
    renderExerciseStep();
    return;
  }

  if (acq.phase === 'practice'){
    acq.lessonScore.correct += STEP_STATE.exerciseScore;
    acq.lessonScore.total += STEP_STATE.exerciseList.length;
    if (acq.blockIdx > 0){
      // Já existe pelo menos um bloco anterior -> mistura tudo (ETAPA 5).
      acq.phase = 'mixed';
      const introducedIdx = acq.blocks.slice(0, acq.blockIdx + 1).flat();
      STEP_STATE.exerciseList = buildMixedQueue(u, introducedIdx);
      STEP_STATE.exerciseIndex = 0;
      STEP_STATE.exerciseScore = 0;
      setAcqPhaseBanner(acqPhaseBannerText('mixed'));
      renderExerciseStep();
      return;
    }
    // Primeiro bloco: ainda não há nada anterior pra misturar -- segue direto.
    advanceToNextBlockOrConsolidation();
    return;
  }

  if (acq.phase === 'mixed'){
    acq.lessonScore.correct += STEP_STATE.exerciseScore;
    acq.lessonScore.total += STEP_STATE.exerciseList.length;
    advanceToNextBlockOrConsolidation();
  }
}

// Acabou o ciclo do bloco atual: introduz o próximo bloco (ETAPA 4/6), ou,
// se não houver mais blocos, segue o fluxo normal da unidade (diálogo, dica
// de uso, consolidação final) -- mesmo avanço de passo que já existia.
function advanceToNextBlockOrConsolidation(){
  const acq = STEP_STATE.acq;
  if (acq.blockIdx < acq.blocks.length - 1){
    acq.blockIdx += 1;
    acq.phase = 'intro';
    acq.introIdx = 0;
    renderStep();
  } else {
    const u = UNITS.find(x => x.id === STATE.currentUnitId);
    advanceUnitStep(u);
  }
}

// ---------- Celebração visual (confete + contador animado) ----------
// Sistema compartilhado pelos tiers 2/3 da hierarquia de celebração (ver
// artefato "A Gramática da Recompensa"; tiers 4/6 não existem no site de
// chinês, que não tem módulos/testes de nível): peças de papel coloridas
// caindo em CSS puro (sem biblioteca externa), com intensidade
// (quantidade/duração) parametrizável, e um contador que sobe de 0 até o
// valor final em vez de aparecer pronto -- dá peso ao número sem precisar
// de confete. Ambos respeitam prefers-reduced-motion: o confete nem chega
// a ser criado e o contador mostra o valor final direto, sem pular quadros.
function prefersReducedMotion(){
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function spawnConfetti(count, durationMs){
  if (prefersReducedMotion() || !count) return;
  const layer = document.getElementById('confetti-layer');
  if (!layer) return;
  layer.innerHTML = '';
  for (let i = 0; i < count; i++){
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    piece.style.animationDuration = `${durationMs + Math.random() * 400}ms`;
    piece.style.animationDelay = `${Math.random() * 200}ms`;
    piece.style.setProperty('--rot', `${Math.random() * 360}deg`);
    layer.appendChild(piece);
  }
  setTimeout(() => { layer.innerHTML = ''; }, durationMs + 700);
}

// Conta de 0 até `to` dentro de `el`, com easing de desaceleração.
function animateCount(el, to, { duration = 650, suffix = '', prefix = '' } = {}){
  if (!el) return;
  if (prefersReducedMotion() || !to){
    el.textContent = `${prefix}${to}${suffix}`;
    return;
  }
  const start = performance.now();
  function tick(now){
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = `${prefix}${Math.round(to * eased)}${suffix}`;
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// Chip contextual dos Desafios de hoje (tier 2) -- só aparece quando ESSA
// lição fez de fato algum desafio avançar (comparando com `before`, tirado
// antes das atualizações em finishCurrentLesson). Mostra só o primeiro que
// avançou, nunca os 3: isso é um lembrete pontual e ligado ao que acabou de
// acontecer, não um resumo genérico -- esse já existe na tela/aba própria
// "Desafios de hoje".
function renderChallengeChipHTML(before){
  if (!before) return '';
  const challenges = todaysChallenges();
  for (let i = 0; i < challenges.length; i++){
    const c = challenges[i];
    const beforeVal = before[i] || 0;
    const afterVal = Math.min(c.get(STATE.daily), c.target);
    if (afterVal <= beforeVal) continue;
    const justCompleted = afterVal >= c.target && beforeVal < c.target;
    return `
      <div class="lesson-boundary-challenge-chip ${justCompleted ? 'done' : ''}">
        <span class="lbc-chip-icon">${c.icon}</span>
        <span class="lbc-chip-label">${justCompleted ? t('zh.path.missionDonePrefix') : t('zh.path.missionDayPrefix')}${c.label}</span>
        ${justCompleted ? '<span class="lbc-chip-check">✓</span>' : `<span class="lbc-chip-count">${afterVal}/${c.target}</span>`}
      </div>
    `;
  }
  return '';
}

// Comunica em que fase da sessão de aquisição o aluno está agora -- pra que
// a experiência pareça uma sessão contínua ("estou aprendendo -> agora
// consigo usar -> agora misturando") em vez de uma sequência de telas soltas
// sem relação entre si. Escondido por padrão a cada renderStep(); cada fase
// que precisa dele liga explicitamente.
// Some fases (checkpoint/practice/mixed/consolidação) são iniciadas por
// funções que chamam renderExerciseStep() diretamente (não renderStep()),
// pra não reconstruir a fila à toa -- então também escondem aqui o botão
// "Voltar" global, que só tem sentido na introdução do bloco (a navegação
// dessas fases é toda própria do motor de exercícios). Sem isso o botão
// ficava com a visibilidade "congelada" no último valor definido pela
// introdução, mesmo já estando na fase seguinte.
function setAcqPhaseBanner(text){
  const el = document.getElementById('acq-phase-banner');
  if (el){
    el.textContent = text;
    el.style.display = 'block';
  }
  const backBtn = document.getElementById('step-back-btn');
  if (backBtn) backBtn.style.display = 'none';
}

function hideAcqPhaseBanner(){
  const el = document.getElementById('acq-phase-banner');
  if (el) el.style.display = 'none';
}

function acqPhaseBannerText(phase){
  return {
    checkpoint: t('zh.path.banner.quickCheck'),
    practice: t('zh.path.banner.practice'),
    mixed: t('zh.path.banner.mixed')
  }[phase] || null;
}

// Nenhum atalho (1-4, "r", Enter) deve agir se um modal (ex.: "Atalhos do
// teclado", seletor de nível) estiver aberto por cima do exercício -- sem
// isso, um Enter ou número pressionado ali clicaria/selecionaria algo na
// tela de trás, escondida atrás do modal, sem o aluno perceber.
function anyAppModalOpen(){
  return Array.from(document.querySelectorAll('.app-modal-overlay')).some(m => m.style.display === 'flex');
}

function addStudyMinutes(){
  const today = todayStr();
  STATE.dailyMinutesLog[today] = (STATE.dailyMinutesLog[today] || 0) + ESTIMATED_SECONDS_PER_EXERCISE / 60;
  saveState();
}

// addStudyMinutes() é responsabilidade de quem chama (cada formato já
// registra o próprio minuto de estudo no momento em que marca a resposta
// como certa -- ver os pontos que chamam esta função), não desta função:
// ela só cuida da tela, pra não contar o minuto duas vezes.
function showCorrectFeedbackPanel(contentEl, detail){
  STEP_STATE.comboCount = (STEP_STATE.comboCount || 0) + 1;
  const combo = STEP_STATE.comboCount;
  const isMilestone = combo >= COMBO_MILESTONE_STEP && combo % COMBO_MILESTONE_STEP === 0;
  const inCombo = combo >= COMBO_MIN;
  const headerText = isMilestone ? t('feedback.combo.milestone', { n: combo }) : (inCombo ? nextComboPhrase() : nextCorrectFeedbackPhrase());
  const comboBadgeHTML = inCombo ? `<span class="correct-feedback-combo-badge">⚡ Combo x${combo}</span>` : '';

  const wrap = contentEl.querySelector('.exercise-wrap') || contentEl;
  const panel = document.createElement('div');
  panel.className = 'correct-feedback';
  panel.innerHTML = `
    <div class="feedback-card-body">
      <div class="correct-feedback-header">${comboBadgeHTML}✅ ${headerText}</div>
      ${detail ? `<div class="correct-feedback-trans feedback-inner-box">${detail}</div>` : ''}
      <button class="btn btn-primary btn-block correct-feedback-continue" id="correct-continue-btn">${t('common.continueArrow')}</button>
    </div>
  `;
  wrap.appendChild(panel);
  wireAudioButtons(panel);
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  document.getElementById('correct-continue-btn').addEventListener('click', () => {
    STEP_STATE.exerciseIndex += 1;
    renderExerciseStep();
  });
}

// Projeto "Reorganização da experiência de revisão e prática": Speed
// Review deixou de ser jogo de reconhecimento livre e virou REVISÃO de
// verdade -- "revisão rápida", a MESMA fila que o filtro de Revisão
// selecionou (reviewFilterQueue -- 2ª sessão de grilling), nunca mais
// getStudyQueue(scope:'all') nem uma seleção paralela própria. Isso
// resolve a inconsistência relatada ("cartas para revisão hoje: 12" mas
// "Speed Review: 32 palavras") -- os dois números eram fontes diferentes;
// agora são a mesma função, o mesmo número.
//
// Embaralhar destruiria a ordem que "Mais antigas primeiro" promete --
// só embaralha pros outros 2 filtros (mesmo princípio de startReviewSession).
// Fase 1 da reestruturação do formulário de flashcards do admin (ver
// CLAUDE.md) -- desde a migration 035, um cartão de professora "Completar
// a frase" pode não ter `front` (mapeado pra `back_hanzi` no zh, ver
// buildCardFromTeacherFlashcard) -- esse modo nunca exibiu hanzi/pinyin
// de frente em nenhuma tela (renderClozeCard nunca lê
// card.back_hanzi/card.front_pinyin). Combinar e Speed Review nunca
// entendem cloze -- pressupõem um par hanzi/tradução simples -- então um
// cartão cloze SEM back_hanzi quebraria a exibição deles (tile/prompt em
// branco). Cartões cloze já existentes continuam com back_hanzi
// preenchido (nunca migrados) e continuam elegíveis aqui, sem mudança de
// comportamento -- este filtro só passa a excluir cartões NOVOS criados
// sem front.
// Fase 4b -- reescrita em cima do motor de tipos (não mais presença de
// `back_hanzi`, que nem existe mais no card nativo). Elegível = tipos com
// par prompt/resposta curto e fixo (normal, múltipla escolha) -- cloze e
// "digite a resposta" ficam de fora (resposta aberta/digitada), mesmo
// critério de sempre.
function hasPlainFrontBack(card){
  // K2-I: todo card de STATE.cards tem cardInstance (study/teacher/self nascem de buildEngineCardsFromRow).
  return card.cardInstance.cardTypeId === 'normal' || card.cardInstance.cardTypeId === 'multiple_choice';
}

function hardWordsPool(){
  // Fase 7: delega pra getStudyQueue(scope:'hard') -- fonte única do
  // critério de "Palavras difíceis" (difficulty do FSRS + lapses, não
  // filtra por due). Mantido como wrapper só por compatibilidade de nome.
  return getStudyQueue(eligibleReviewPool(), { scope: 'hard' });
}

// Carrega a árvore de Decks do idioma atual sob demanda -- só quando uma
// sessão/contagem Deck-scoped é de fato solicitada (nunca no boot, nunca em
// resposta a re-render de UI -- não existe nenhuma tela de Deck ainda pra
// disparar isso sozinha). ensureDecksForCurrentUser()/fetchDecksForLanguage()
// (shared/deck-data.js, Fase C) já tratam "sem sessão"/"sem Deck ainda"
// graciosamente (devolvem vazio/erro estruturado, nunca lançam) -- nenhuma
// guarda extra precisa ser duplicada aqui. Cache simples em STATE.decks
// (nunca serializado, nunca uma contagem materializada -- só a leitura mais
// recente da árvore real) -- reaproveitado enquanto a sessão do app durar;
// isso é uma otimização pragmática (evita um round-trip por clique), nunca
// o cache de contagem que a seção "Performance" da Fase D proíbe.
// Fase E -- Study Trail <-> Course Decks. Liga cada card de trilha ao Course
// Unit Deck da sua unidade (unitId -> String(unitId) -> course_unit_id ->
// deck.id), SÓ mexendo em `deckId`. Bootstrap (ensure_course_decks) apenas
// pra conta autenticada; convidado só LÊ (SELECT público de kind='course')
// e, se os Decks ainda não existirem, os cards simplesmente ficam sem
// deckId (Study Trail intacto). Idempotente; carrega 1x por sessão do app
// quando bem sucedido. Nunca chamado no boot -- só sob demanda, junto do
// resto do fluxo Deck-scoped (ensureDecksLoadedForReview).
async function ensureCourseDecksLoaded(){
  if (typeof fetchCourseDecksForLanguage !== 'function' || typeof buildCourseDeckIndex !== 'function') return [];
  if (!STATE.courseDecksLoaded){
    if (CURRENT_USER && typeof ensureCourseDecksForCurrentUser === 'function'){
      await ensureCourseDecksForCurrentUser(APP_KEY, UNITS);
    }
    const courseDecks = await fetchCourseDecksForLanguage(APP_KEY);
    if (courseDecks.length){
      const known = new Set((STATE.decks || []).map(d => d.id));
      STATE.decks = (STATE.decks || []).concat(courseDecks.filter(d => !known.has(d.id)));
      STATE.courseDecksLoaded = true;
    }
  }
  assignCourseDeckIds(STATE.cards, buildCourseDeckIndex(STATE.decks || [], APP_KEY));
  return STATE.decks || [];
}

async function ensureDecksLoadedForReview(){
  if (!(STATE.decks && STATE.decks.length)){
    if (typeof ensureDecksForCurrentUser !== 'function' || typeof fetchDecksForLanguage !== 'function') return [];
    await ensureDecksForCurrentUser(APP_KEY);
    STATE.decks = await fetchDecksForLanguage(APP_KEY);
  }
  return ensureCourseDecksLoaded();
}

function shuffle(arr){
  const a = arr.slice();
  for (let i = a.length -1; i>0; i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

// Projeto "Aprimoramento do Flashcard": os 4 botões de resposta mostram o
// intervalo REAL que o motor agendaria (previewNextIntervalDays, mesma
// função que scheduleReview usa de verdade -- shared/fsrs.js), nunca texto
// estático.
function gradeButtonsHTML(card){
  const now = Date.now();
  const GRADES = [
    { grade: 0, label: t('review.grade.again'), cls: 'grade-again' },
    { grade: 1, label: t('review.grade.hard'), cls: 'grade-hard' },
    { grade: 2, label: t('review.grade.good'), cls: 'grade-good' },
    { grade: 3, label: t('review.grade.easy'), cls: 'grade-easy' },
  ];
  return `
    <div class="grade-buttons">
      ${GRADES.map(g => `<button class="grade-btn ${g.cls}" data-grade="${g.grade}">${g.label}<small>${formatReviewInterval(previewNextIntervalDays(card, g.grade, now))}</small></button>`).join('')}
    </div>
  `;
}

function checkUnitCompletion(explicitUnitId){
  const unitId = explicitUnitId || STATE.reviewSessionUnitFilter;
  if (!unitId) return;
  // K2-E: a unidade está aprendida quando TODA palavra tem evidência de
  // estudo em alguma CardInstance irmã -- B New não bloqueia mais.
  const pool = STATE.cards.filter(c => c.unitId === unitId);
  const allLearned = studyWordGroups(pool).every(studyWordHasEvidence);
  if (allLearned){
    markUnitCompleted(unitId);
  }
}

// ============================================================
// RENDER: Progresso / gamificação
// ============================================================
function renderGoalsView(){
  renderStudyPlanCard();
}

function renderProgressView(){
  const completedUnits = Object.values(STATE.unitProgress).filter(u=>u.completed).length;
  // K.3: "Palavras aprendidas" = SÓ Study Trail, em palavras (Note), com o
  // curso inteiro como denominador (Teacher/Self não entram aqui).
  const { total: totalCards, learned: learnedCards } = studyTrailWordProgress(STATE.cards);
  // K.3: o antigo "Pendentes agora" era cardsDueNow(STATE.cards) = qualquer card
  // com due<=agora, inclusive New (due=0) e lições ainda não concluídas -- uma
  // mistura. Agora: contagens ESTRUTURAIS (CardInstance) do universo estudável,
  // sem os filtros de sessão (origem/tag), e "Para estudar hoje" = a fila que
  // uma sessão entrega (mesma definição/número do hero da Revisão).
  const sc = structuralCounts(eligibleDeckReviewPool());
  const studyToday = trueDueReviewCount(eligibleReviewPool());

  // K.7: "Conteúdos estudados" (Note) de Teacher e Self, SEMPRE separados e
  // fora de "Palavras aprendidas"; só aparece a origem que tem conteúdo ativo.
  const ownContentCards = ['teacher', 'self'].map(o => {
    const m = ownContentProgress(STATE.cards, o);
    if (!m.total) return '';
    const label = o === 'teacher' ? 'Conteúdos da professora estudados' : 'Meus conteúdos estudados';
    return `<div class="stat-card" data-stat="content-${o}"><div class="num">${m.studied}/${m.total}</div><div class="label">${label}</div></div>`;
  }).join('');

  const guestWarning = !CURRENT_USER ? `
    <div class="guest-warning">
      ${t('zh.progress.guestWarning')}
      <button class="guest-warning-link" id="guest-login-prompt">${t('zh.progress.guestLogin')}</button>
    </div>
  ` : '';

  document.getElementById('stat-cards').innerHTML = guestWarning + `
    <div class="stat-card" data-stat="units"><div class="num">${completedUnits}/${UNITS.length}</div><div class="label">${t('zh.progress.statUnits')}</div></div>
    <div class="stat-card" data-stat="words"><div class="num">${learnedCards}/${totalCards}</div><div class="label">${t('zh.progress.statWords')}</div></div>
    <div class="stat-card" data-stat="streak"><div class="num">${effectiveStreak()}</div><div class="label">${t('zh.progress.statStreak')}</div></div>
    <div class="stat-card" data-stat="reviews"><div class="num">${STATE.totalReviews}</div><div class="label">${t('zh.progress.statReviews')}</div></div>
    <div class="stat-card" data-stat="new"><div class="num">${sc.new}</div><div class="label">${t('progress.statNew')}</div></div>
    <div class="stat-card" data-stat="learning"><div class="num">${sc.learning}</div><div class="label">${t('progress.statLearning')}</div></div>
    <div class="stat-card" data-stat="review"><div class="num">${sc.review}</div><div class="label">${t('progress.statReview')}</div></div>
    <div class="stat-card" data-stat="due"><div class="num">${sc.due}</div><div class="label">${t('progress.statDueNow')}</div></div>
    <div class="stat-card" data-stat="today" title="${escapeHTML(t('progress.statTodayTitle'))}"><div class="num">${studyToday}</div><div class="label">${t('progress.statToday')}</div></div>
    ${ownContentCards}
    <div class="stat-card" data-stat="xp"><div class="num">${STATE.xp}</div><div class="label">${t('zh.progress.statXp')}</div></div>
  `;

  if (!CURRENT_USER){
    document.getElementById('guest-login-prompt')?.addEventListener('click', () => {
      localStorageSafeRemove(LAST_LANGUAGE_KEY);
      sessionStorageSafeSet(GUEST_MODE_FLAG, '0');
      CURRENT_USER = null;
      goToNeutralGate();
    });
  }

  // Projeto "Reorganização da experiência de revisão e prática", Fase 3:
  // "Suas palavras" (fracas/medianas/fortes) responde "como está meu
  // vocabulário", não "o que eu devo estudar agora" -- mora em Progresso,
  // não mais na tela de Revisão (ver renderReviewModeSelect).
  renderVocabStrengthWidget();
  renderActivityHeatmap();
  renderProgressLineChart();

  // Conquistas com níveis: um cartão por trilha (shared/badge-tracks-app.js), clássicas no fim.
  const trackViews = badgeTrackViews(STATE);
  const classics = BADGES.filter(b => b.classic && b.check(STATE)).map(b => ({ id: b.id, classic: true, icon: b.icon, fluent: b.fluent, name: b.name, desc: b.desc, tier: 'classic' }));
  const levelsEarned = trackViews.reduce((a, v) => a + v.level, 0);
  const levelsTotal = trackViews.reduce((a, v) => a + v.total, 0);
  document.getElementById('badge-grid-count').textContent = t('badge.ui.count', { n: levelsEarned, total: levelsTotal });
  const badgeGridEl = document.getElementById('badge-grid');
  badgeGridEl.classList.add('has-tracks');
  badgeGridEl.innerHTML = trackViews.map(badgeTrackCardHTML).join('')
    + (classics.length ? `<div class="track-classics"><div class="track-classics-title">${t('badge.ui.classicTitle')}</div><div class="track-showcase">${classics.map(badgeShowcaseItemHTML).join('')}</div></div>` : '');
  wireTrackChips(badgeGridEl, trackViews.concat(classics));
}

// ---------- Heatmap de atividade diária (estilo GitHub) ----------
// Mostra as últimas ~18 semanas em grade: colunas = semanas, linhas = dias da
// semana (dom-sáb). Intensidade da cor reflete quantas respostas você deu
// naquele dia (STATE.activityLog), igual ao gráfico de contribuições do GitHub.
function renderActivityHeatmap(){
  const wrap = document.getElementById('heatmap-wrap');
  const WEEKS = 18;
  const totalDays = WEEKS * 7;

  // Gera os últimos totalDays dias reais, terminando hoje.
  const realDays = [];
  for (let i = totalDays - 1; i >= 0; i--){
    const d = new Date(Date.now() - i*86400000);
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const dd = String(d.getDate()).padStart(2,'0');
    const key = `${d.getFullYear()}-${mm}-${dd}`;
    realDays.push({ key, count: STATE.activityLog[key] || 0, date: d, dow: d.getDay() });
  }

  // Preenche com null nas duas pontas até alinhar em semanas completas de
  // domingo a sábado — sem isso, a última coluna ficaria torta (menos de 7
  // dias) sempre que "hoje" não caísse num sábado.
  const firstDow = realDays[0].dow;
  const lastDow = realDays[realDays.length-1].dow;
  const startPadding = Array.from({length: firstDow}, () => null);
  const endPadding = Array.from({length: 6 - lastDow}, () => null);
  const days = [...startPadding, ...realDays, ...endPadding];

  // Agrupa em semanas (colunas) de 7 dias cada
  const weeks = [];
  for (let i = 0; i < days.length; i += 7){
    weeks.push(days.slice(i, i+7));
  }

  function intensityClass(count){
    if (count === 0) return 'lvl-0';
    if (count <= 3) return 'lvl-1';
    if (count <= 8) return 'lvl-2';
    if (count <= 15) return 'lvl-3';
    return 'lvl-4';
  }

  const monthLabels = [];
  let lastMonth = null;
  weeks.forEach((week, wi) => {
    const firstRealDay = week.find(d => d !== null);
    if (firstRealDay){
      const m = firstRealDay.date.getMonth();
      if (m !== lastMonth){
        monthLabels.push({ weekIndex: wi, label: fmtDate(firstRealDay.date, { month:'short' }) });
        lastMonth = m;
      }
    }
  });

  const gridHTML = weeks.map(week => `
    <div class="heatmap-col">
      ${week.map(day => day === null
        ? `<div class="heatmap-cell lvl-0 empty"></div>`
        : `<div class="heatmap-cell ${intensityClass(day.count)}" title="${tp('zh.progress.heatCell', day.count, { date: fmtDate(day.date) })}"></div>`
      ).join('')}
    </div>
  `).join('');

  const labelsHTML = monthLabels.map(m =>
    `<span style="grid-column-start:${m.weekIndex + 1};">${m.label}</span>`
  ).join('');

  wrap.innerHTML = `
    <div class="heatmap-months" style="grid-template-columns: repeat(${weeks.length}, 1fr);">${labelsHTML}</div>
    <div class="heatmap-grid">${gridHTML}</div>
    <div class="heatmap-legend">
      <span>${t('zh.progress.heatLess')}</span>
      <div class="heatmap-cell lvl-0"></div>
      <div class="heatmap-cell lvl-1"></div>
      <div class="heatmap-cell lvl-2"></div>
      <div class="heatmap-cell lvl-3"></div>
      <div class="heatmap-cell lvl-4"></div>
      <span>${t('zh.progress.heatMore')}</span>
    </div>
  `;
}

// Valor herdado do antigo stepper (0-50 livre) pode não bater com
// nenhuma das 6 opções fixas -- aproxima pro mais próximo só pra exibição
// no <select> (não reescreve STATE, getStudyQueue aceita qualquer número
// como newCardsLimit normalmente).
function normalizeNewCardsPerDay(n){
  return NEW_CARDS_PER_DAY_OPTIONS.reduce((best, opt) =>
    Math.abs(opt - n) < Math.abs(best - n) ? opt : best, NEW_CARDS_PER_DAY_OPTIONS[0]);
}

// Persiste + reaplica ao motor imediatamente -- não precisa de botão "Salvar"
// (mesmo padrão dos outros pref-switch/toggle desta tela). renderReviewTodayWidget()
// também roda aqui porque newCardsPerDay entra direto no cálculo de trueCount
// (achado da 4ª rodada: o stepper antigo não atualizava o hero até o próximo
// render de tab -- número passava a hora sem refletir a mudança).
function updateStudySetting(patch){
  Object.assign(STATE.studySettings, patch);
  if (patch.reviewFrequency){
    setDesiredRetention(reviewFrequencyToRetention(patch.reviewFrequency));
  }
  renderReviewSettingsView();
  renderReviewTodayWidget();
  saveState();
}

// Algumas respostas têm mais de uma forma aceita, armazenadas juntas
// separadas por "/" (conjugação "paie/paye", vocabulário "un / une" etc.) --
// dar só UMA das formas é uma resposta completa, não deve ser tratado como
// diferente da string inteira "un / une". Usado tanto na conjugação quanto
// nos exercícios de digitar de ouvido (vocab-type/cloze).
function acceptedForms(expected){
  return (expected || '').split('/').map(s => s.trim()).filter(Boolean);
}

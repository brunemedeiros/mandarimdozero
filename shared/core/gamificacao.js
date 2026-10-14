// E4 lote 1b: conquistas, celebrações de sequência e missões do dia.
// Extraído de fr/app.js e zh/app.js, onde o texto era IDÊNTICO nos dois (levantamento: docs/i18n/e4-levantamento-funcoes.md).
// Sem renomear: continuam funções globais (os <script> clássicos compartilham o escopo, então STATE, UNITS etc. do app.js
// são achados na hora da chamada). Editar AQUI vale para os dois idiomas; se um idioma precisar de comportamento próprio,
// declare a função no app.js dele com o mesmo nome e um comentário explicando (a declaração do app.js, carregada depois, vence).
// Carregado antes do app.js em fr/index.html e zh/index.html.

function maybeShowStreakCelebration(){
  if (!STATE.pendingStreakCelebration) return;
  STATE.pendingStreakCelebration = false;
  // Nem todo lugar que chama registerStudyToday() (que muda STATE.streak)
  // também chama renderTopbarStats() logo em seguida -- vários caminhos só
  // chegam até aqui, no momento em que a comemoração de fato aparece.
  // Centralizar a atualização do pill aqui garante que ele nunca fique
  // mostrando um número velho enquanto a tela de sequência já mostra o novo.
  renderTopbarStats();
  // showStreakCelebration() é sempre chamada ANTES do innerHTML da tela de
  // conclusão (lição/unidade/sessão) ser escrito, no mesmo call site -- como
  // as duas coisas rodam na mesma volta síncrona, o navegador só pinta UM
  // quadro final, com o overlay de sequência já por cima, escondendo a tela
  // de conclusão atrás dele até a pessoa fechar o modal. Resultado relatado:
  // a tela de sequência parecia aparecer ANTES da tela de "Lição concluída",
  // quando devia ser o contrário. Um pequeno atraso garante que o quadro da
  // tela de conclusão pinte primeiro, e só depois o modal aparece por cima.
  setTimeout(showStreakCelebration, 500);
}

// ---------- Tela de sequência de streak (estilo Duolingo) ----------
// Aparece uma única vez por dia, na primeira atividade que ativa o streak
// (lição, checkpoint, revisão, jogo de combinar, conjugação...) — nunca de
// novo no mesmo dia, já que registerStudyToday() só chega até aqui na
// primeira chamada depois da virada do dia.
// STREAK_DAY_LABELS agora vem de shared/wizard.js (também usada por
// buildMinutesWeekData lá).
function buildStreakWeekData(){
  const days = [];
  for (let i = 6; i >= 0; i--){
    const d = new Date(Date.now() - i*86400000);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    days.push({ label: STREAK_DAY_LABELS[d.getDay()], done: !!STATE.activityLog[key], isToday: i === 0 });
  }
  return days;
}

function showStreakCelebration(){
  // Fase 1 do sistema de notificações.
  fireNotificationEvent('streak_completed', 'streak', { days: STATE.streak });
  document.getElementById('streak-days-num').textContent = STATE.streak;
  { const u = document.getElementById('streak-days-unit'); if (u) u.textContent = STATE.streak === 1 ? 'dia' : 'dias'; }
  document.getElementById('streak-week-row').innerHTML = buildStreakWeekData().map(d => `
    <div class="streak-day-item ${d.done ? 'done' : ''} ${d.isToday ? 'today' : ''}">
      <div class="streak-day-circle">${d.done ? '✓' : ''}</div>
      <div class="streak-day-label">${d.label}</div>
    </div>
  `).join('');
  document.getElementById('streak-modal-overlay').style.display = 'flex';
}

function dailySeed(str){
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

function pickDailyFromPool(pool, salt){
  return pool[dailySeed(STATE.daily.date + ':' + salt) % pool.length];
}

// Resolve o item sorteado do pool revisão/conjugação contra o estoque real
// do dia: devolve o item original (cabe), uma cópia com meta reduzida (tipo
// quantidade, ainda acima do piso) ou o item seguro do pool (conj1 -- nunca
// depende de estoque de revisão). Chamado uma única vez por dia dentro de
// assignTodaysMissions() -- nunca recalculado depois, senão a meta ficaria
// se movendo ao longo do dia conforme o estoque muda.
function resolveRevisaoMission(picked, pool, safeFallbackId){
  const fallback = () => pool.find(m => m.id === safeFallbackId) || picked;
  if (picked.id === 'reviews15'){
    const supply = missionReviewSupply();
    if (supply >= picked.target) return picked;
    if (supply >= MISSION_QUANTITY_FLOOR) return Object.assign({}, picked, { target: supply });
    return fallback();
  }
  if (picked.id === 'overdue3'){
    return missionOverdueSupply() >= picked.target ? picked : fallback();
  }
  if (picked.id === 'matchGame1'){
    return missionMatchGameFeasible() ? picked : fallback();
  }
  if (picked.id === 'speedReview1'){
    return missionSpeedReviewFeasible() ? picked : fallback();
  }
  return picked;
}

// Reconstrói o objeto completo (icon/label/get) do desafio a partir do
// registro persistido ({id, target}) -- state.daily.missions só guarda dados
// serializáveis (sincroniza com o Supabase), nunca funções.
function materializeMission(assigned){
  const base = challengeById(assigned.id);
  if (!base) return null; // pool mudou entre deploys -- atribuição órfã, ignora
  if (assigned.target === base.target) return base;
  const scaled = Object.assign({}, base, { target: assigned.target });
  if (base.labelForTarget) scaled.label = base.labelForTarget(assigned.target);
  return scaled;
}

// Bônus por completar as 3 Missões do dia (não por missão individual --
// cada ação que alimenta uma missão já dá XP por si só em outro lugar; o
// bônus aqui é só pelo conjunto das 3). Chamado de dentro de addXP() (ver
// comentário lá) pra ser checado depois de QUALQUER ganho de XP, já que
// qualquer um deles pode ser o que fecha a última missão do dia.
function checkDailyMissionsBonus(){
  ensureDailyBucket();
  if (STATE.daily.missionsBonusAwarded) return;
  const allDone = todaysChallenges().every(c => (Number(c.get(STATE.daily)) || 0) >= c.target);
  if (!allDone) return;
  STATE.daily.missionsBonusAwarded = true;
  addXP(30);
  showToast(t('toast.dailyMissionsAllDone'));
}

// Notificação "Missão concluída" -- uma por Missão do dia individual (não
// pelo conjunto das 3, isso já é o bônus acima). Guarda em
// STATE.daily.missionsNotified pra disparar exatamente uma vez por missão
// por dia, mesmo que addXP() rode várias vezes depois dela já ter batido a
// meta (ex.: XP de exercícios seguintes na mesma sessão). Chamada do mesmo
// lugar que checkDailyMissionsBonus() (dentro de addXP()), pelo mesmo
// motivo: qualquer ganho de XP pode ser o que fecha uma missão.
function checkDailyMissionCompletions(){
  ensureDailyBucket();
  todaysChallenges().forEach(c => {
    if (STATE.daily.missionsNotified[c.id]) return;
    const current = Number(c.get(STATE.daily)) || 0;
    if (current < c.target) return;
    STATE.daily.missionsNotified[c.id] = true;
    fireNotificationEvent('mission_completed', 'desafios', { mission_label: c.label, mission_icon: c.icon }, 'path');
  });
}

function seedEarnedBadges(){
  earnedBadgeIds = new Set(BADGES.filter(b => b.check(STATE)).map(b => b.id));
  // C4: conquistas da conta ganhas em outro idioma também valem aqui (sem celebrar de novo).
  loadAccountEarnedBadges().then(() => {
    earnedBadgeIds = AccountProgress.unionBadgeIds(earnedBadgeIds, accountEarnedBadgeRows);
    upsertEarnedBadges([...earnedBadgeIds]);
    if (typeof renderProgressView === 'function' && document.getElementById('badge-grid')) renderProgressView();
  });
  // Backfill/sincronização: garante que a tabela pública earned_badges
  // reflita tudo que já era verdade antes desta feature existir, ou que
  // uma sessão anterior não tenha conseguido gravar -- upsert idempotente,
  // sem custo de duplicar (ver shared/auth.js).
  upsertEarnedBadges([...earnedBadgeIds]);
}

function holdBadgeCelebrations(){ badgeCelebrationHeld = true; }

function releaseBadgeCelebrations(){
  if (!badgeCelebrationHeld) return;
  badgeCelebrationHeld = false;
  processBadgeCelebrationQueue();
}

function checkAndCelebrateBadges(){
  const newlyEarned = [];
  BADGES.forEach(b => {
    if (earnedBadgeIds.has(b.id)) return;
    if (b.check(STATE)){
      earnedBadgeIds.add(b.id);
      newlyEarned.push(b);
    }
  });
  if (newlyEarned.length){
    badgeCelebrationQueue.push(...newlyEarned);
    processBadgeCelebrationQueue();
    // Fase 1 do sistema de notificações -- um evento por badge (não um só
    // pro lote), mesma granularidade da celebração visual acima.
    newlyEarned.forEach(b => {
      fireNotificationEvent('achievement_unlocked', 'gamificacao', { badge_name: b.name, badge_icon: b.icon }, 'profile');
    });
    upsertEarnedBadges(newlyEarned.map(b => b.id));
  }
}

// Fila (não pilha): se dois badges forem ganhos no mesmo instante (ex.: XP
// cruza 500 no mesmo golpe que termina o nível), mostra um de cada vez --
// nunca dois cartões sobrepostos brigando pela mesma área da tela.
function processBadgeCelebrationQueue(){
  if (badgeCelebrationHeld || badgeCelebrationShowing || !badgeCelebrationQueue.length) return;
  badgeCelebrationShowing = true;
  const badge = badgeCelebrationQueue.shift();
  showBadgeUnlockCelebration(badge, () => {
    badgeCelebrationShowing = false;
    processBadgeCelebrationQueue();
  });
}

// ---------- Plano de estudo: wizard de meta + card de progresso (compartilhado) ----------
// Depende de STATE (STATE.studyGoal, STATE.dailyMinutesLog), saveState()
// (shared/auth.js) e do formato de conteúdo LEVELS/UNITS/STATE.unitProgress,
// já consistente entre os idiomas.
//
// Cada languages/<lang>/content.js e app.js precisa definir:
//   - LEVELS               (array [{id, label}, ...] -- níveis do curso deste
//                            idioma; um idioma novo/pequeno pode ter só 1 item)
//   - LEVEL_DESCRIPTIONS    (objeto { [levelId]: {tier, text} })
//   - LANGUAGE_STUDY_NAME   (string, ex: "francês" -- usado na pergunta do
//                            objetivo: "aprender ${LANGUAGE_STUDY_NAME}?")
// Só chamados dentro de funções, nunca no top-level deste arquivo -- a
// ordem de carregamento dos <script> não importa (hoisting normal).

const DAY_KEY_BY_JS_INDEX = ['sun','mon','tue','wed','thu','fri','sat'];
// Chaves de catálogo escritas por extenso (o lint de i18n só enxerga labelKey: literais).
const WIZARD_DAY_LABEL_KEYS = {
  mon: { labelKey: 'wizard.day.mon' }, tue: { labelKey: 'wizard.day.tue' }, wed: { labelKey: 'wizard.day.wed' },
  thu: { labelKey: 'wizard.day.thu' }, fri: { labelKey: 'wizard.day.fri' }, sat: { labelKey: 'wizard.day.sat' },
  sun: { labelKey: 'wizard.day.sun' },
};
const WIZARD_MONTH_LABEL_KEYS = [
  { labelKey: 'wizard.month.jan' }, { labelKey: 'wizard.month.feb' }, { labelKey: 'wizard.month.mar' },
  { labelKey: 'wizard.month.apr' }, { labelKey: 'wizard.month.may' }, { labelKey: 'wizard.month.jun' },
  { labelKey: 'wizard.month.jul' }, { labelKey: 'wizard.month.aug' }, { labelKey: 'wizard.month.sep' },
  { labelKey: 'wizard.month.oct' }, { labelKey: 'wizard.month.nov' }, { labelKey: 'wizard.month.dec' },
];

// Rótulos de dia da semana avaliados só no uso (t() nunca roda no carregamento
// do módulo). Proxy de 7 posições: fr/app.js e zh/app.js leem
// STREAK_DAY_LABELS[d.getDay()] como se fosse um array.
const STREAK_DAY_LABELS = new Proxy(new Array(7).fill(''), {
  get(target, prop, receiver){
    if (typeof prop === 'string' && /^[0-6]$/.test(prop)) return t(WIZARD_DAY_LABEL_KEYS[DAY_KEY_BY_JS_INDEX[Number(prop)]].labelKey);
    return Reflect.get(target, prop, receiver);
  }
});

function dayDefs(){
  return ['mon','tue','wed','thu','fri','sat','sun'].map(k => ({ key: k, label: t(WIZARD_DAY_LABEL_KEYS[k].labelKey) }));
}


function formatDatePt(date){
  return t('wizard.date', { day: date.getDate(), month: t(WIZARD_MONTH_LABEL_KEYS[date.getMonth()].labelKey), year: date.getFullYear() });
}

function objectiveOptions(){
  return [
    { id: 'fun', icon: '🎭', label: t('wizard.obj.fun') },
    { id: 'travel', icon: '🌍', label: t('wizard.obj.travel') },
    { id: 'friends', icon: '💬', label: t('wizard.obj.friends') },
    { id: 'work', icon: '💼', label: t('wizard.obj.work') },
    { id: 'education', icon: '🎓', label: t('wizard.obj.education') }
  ];
}

// Meta diária em LIÇÕES, não minutos (ver artefato "A Gramática da
// Recompensa", §4) -- 3 faixas nomeadas em vez de um stepper contínuo,
// porque "2 de 3 lições" é uma unidade literal que o aluno já vê na trilha,
// diferente de uma estimativa de minutos que ele não controla diretamente.
function dailyLessonTiers(){
  return [
    { id: 1, icon: '🌱', label: t('wizard.tier.1.label'), desc: t('wizard.tier.1.desc') },
    { id: 2, icon: '🎯', label: t('wizard.tier.2.label'), desc: t('wizard.tier.2.desc') },
    { id: 3, icon: '🔥', label: t('wizard.tier.3.label'), desc: t('wizard.tier.3.desc') }
  ];
}

function remainingUnitsForLevels(levels){
  if (!levels || !levels.length) return [];
  return UNITS.filter(u => levels.includes(u.level) && !STATE.unitProgress[u.id]?.completed);
}

// Lições restantes (não exercícios/minutos): unidades em Modelo B contam as
// lições que faltam de fato (considerando o progresso já feito dentro da
// unidade); unidades sem `lessons` (gramática, ou ainda não migradas) contam
// como 1 lição-equivalente, já que são concluídas de uma vez só.
function remainingLessonCountForUnit(u){
  if (Array.isArray(u.lessons) && u.lessons.length){
    const done = STATE.unitProgress[u.id]?.lessonIdx || 0;
    return Math.max(1, u.lessons.length - done);
  }
  return 1;
}

function estimateLessonsRemainingForLevels(levels){
  return remainingUnitsForLevels(levels).reduce((sum, u) => sum + remainingLessonCountForUnit(u), 0);
}

// Conta pra frente a partir de amanhã, só nos dias da semana marcados, até
// acumular minutos suficientes — devolve a data (não só "em X dias"), igual
// o resumo final do Busuu.
function estimateCompletionDate(minutesRemaining, days, dailyMinutes){
  if (!dailyMinutes) return null;
  if (minutesRemaining === 0) return new Date();
  const sessionsNeeded = Math.ceil(minutesRemaining / dailyMinutes);
  let count = 0;
  for (let i = 0; i < 3650; i++){
    const d = new Date(Date.now() + (i + 1) * 86400000);
    if (days[DAY_KEY_BY_JS_INDEX[d.getDay()]]){
      count++;
      if (count >= sessionsNeeded) return d;
    }
  }
  return null; // nenhum dia da semana selecionado — nunca chega lá
}

function buildLessonsWeekData(){
  const days = [];
  for (let i = 6; i >= 0; i--){
    const d = new Date(Date.now() - i*86400000);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const lessons = STATE.dailyLessonsLog[key] || 0;
    days.push({ label: STREAK_DAY_LABELS[d.getDay()], lessons, done: lessons >= STATE.studyGoal.dailyLessonsGoal && STATE.studyGoal.dailyLessonsGoal > 0, isToday: i === 0 });
  }
  return days;
}

// ---------- Assistente (wizard) de configuração da meta ----------
const STUDY_WIZARD_STEPS = ['objective', 'level', 'schedule', 'lessons', 'summary'];
let STUDY_WIZARD = null;

function openStudyPlanModal(){
  const goal = STATE.studyGoal;
  STUDY_WIZARD = {
    step: 0,
    objective: goal.objective,
    targetLevel: goal.levels?.length ? goal.levels[goal.levels.length - 1] : LEVELS[0].id,
    days: { ...goal.days },
    hour: goal.hour, minute: goal.minute,
    notifications: goal.notifications,
    dailyLessonsGoal: goal.dailyLessonsGoal || 2
  };
  document.getElementById('study-plan-modal').style.display = 'flex';
  renderStudyWizardStep();
}

function renderStudyWizardStep(){
  const stepName = STUDY_WIZARD_STEPS[STUDY_WIZARD.step];
  if (stepName === 'objective') renderWizardObjectiveStep();
  else if (stepName === 'level') renderWizardLevelStep();
  else if (stepName === 'schedule') renderWizardScheduleStep();
  else if (stepName === 'lessons') renderWizardLessonsStep();
  else if (stepName === 'summary') renderWizardSummaryStep();
}

function advanceWizard(){
  STUDY_WIZARD.step += 1;
  renderStudyWizardStep();
}

function renderWizardObjectiveStep(){
  const bodyEl = document.getElementById('study-plan-wizard-body');
  bodyEl.innerHTML = `
    <div class="wizard-question">${t('wizard.q.objective', { language: LANGUAGE_STUDY_NAME })}</div>
    <div class="wizard-option-list">
      ${objectiveOptions().map(o => `
        <button class="wizard-option-row ${STUDY_WIZARD.objective === o.id ? 'active' : ''}" data-objective="${o.id}">
          <span class="wizard-option-icon">${o.icon}</span>
          <span class="wizard-option-label">${o.label}</span>
        </button>
      `).join('')}
    </div>
  `;
  bodyEl.querySelectorAll('.wizard-option-row').forEach(btn => {
    btn.addEventListener('click', () => {
      STUDY_WIZARD.objective = btn.dataset.objective;
      advanceWizard();
    });
  });
}

function renderWizardLevelStep(){
  const bodyEl = document.getElementById('study-plan-wizard-body');
  bodyEl.innerHTML = `
    <div class="wizard-question">${t('wizard.q.level')}</div>
    <div class="wizard-level-list">
      ${LEVELS.map(l => {
        const desc = LEVEL_DESCRIPTIONS[l.id] || {};
        const active = STUDY_WIZARD.targetLevel === l.id;
        return `
          <button class="wizard-level-row ${active ? 'active' : ''}" data-level="${l.id}">
            <span class="wizard-level-circle">${l.id}</span>
            <span class="wizard-level-text">
              <span class="wizard-level-tier">${desc.tier || ''}</span>
              <span class="wizard-level-desc">${desc.text || ''}</span>
            </span>
          </button>
        `;
      }).join('')}
    </div>
  `;
  bodyEl.querySelectorAll('.wizard-level-row').forEach(btn => {
    btn.addEventListener('click', () => {
      STUDY_WIZARD.targetLevel = btn.dataset.level;
      advanceWizard();
    });
  });
}

function renderWizardScheduleStep(){
  const bodyEl = document.getElementById('study-plan-wizard-body');
  bodyEl.innerHTML = `
    <div class="wizard-question">${t('wizard.q.days')}</div>
    <div class="wizard-day-row">
      ${dayDefs().map(d => `
        <button class="wizard-day-chip ${STUDY_WIZARD.days[d.key] ? 'active' : ''}" data-day="${d.key}">
          <span class="wizard-day-check">${STUDY_WIZARD.days[d.key] ? '✓' : ''}</span>
          <span class="wizard-day-label">${d.label}</span>
        </button>
      `).join('')}
    </div>
    <div class="wizard-question" style="margin-top:26px;">${t('wizard.q.time')}</div>
    <div class="wizard-time-row">
      <input type="number" min="0" max="23" id="wizard-hour-input" value="${STUDY_WIZARD.hour}">
      <span class="wizard-time-sep">:</span>
      <input type="number" min="0" max="59" step="5" id="wizard-minute-input" value="${String(STUDY_WIZARD.minute).padStart(2,'0')}">
    </div>
    <div class="wizard-notif-row">
      <div class="wizard-notif-text">
        <div class="wizard-notif-title">${t('wizard.notif.title')}</div>
        <div class="wizard-notif-sub">${t('wizard.notif.sub')}</div>
      </div>
      <button class="pref-switch" id="wizard-notif-switch" role="switch" aria-checked="${STUDY_WIZARD.notifications}"><span class="pref-switch-knob"></span></button>
    </div>
    <button class="btn btn-primary btn-block wizard-continue-btn" id="wizard-continue-btn">${t('common.continue')}</button>
  `;

  bodyEl.querySelectorAll('.wizard-day-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const key = chip.dataset.day;
      STUDY_WIZARD.days[key] = !STUDY_WIZARD.days[key];
      chip.classList.toggle('active', STUDY_WIZARD.days[key]);
      chip.querySelector('.wizard-day-check').textContent = STUDY_WIZARD.days[key] ? '✓' : '';
    });
  });

  document.getElementById('wizard-hour-input').addEventListener('change', (e) => {
    STUDY_WIZARD.hour = Math.max(0, Math.min(23, parseInt(e.target.value) || 0));
  });
  document.getElementById('wizard-minute-input').addEventListener('change', (e) => {
    STUDY_WIZARD.minute = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
  });

  const notifSwitch = document.getElementById('wizard-notif-switch');
  notifSwitch.addEventListener('click', () => {
    STUDY_WIZARD.notifications = !STUDY_WIZARD.notifications;
    notifSwitch.setAttribute('aria-checked', STUDY_WIZARD.notifications);
    if (STUDY_WIZARD.notifications && 'Notification' in window && Notification.permission === 'default'){
      Notification.requestPermission();
    }
  });

  document.getElementById('wizard-continue-btn').addEventListener('click', advanceWizard);
}

function renderWizardLessonsStep(){
  const bodyEl = document.getElementById('study-plan-wizard-body');
  bodyEl.innerHTML = `
    <div class="wizard-question">${t('wizard.q.lessons')}</div>
    <div class="wizard-level-list">
      ${dailyLessonTiers().map(tr => `
        <button class="wizard-level-row ${STUDY_WIZARD.dailyLessonsGoal === tr.id ? 'active' : ''}" data-tier="${tr.id}">
          <span class="wizard-level-circle">${tr.icon}</span>
          <span class="wizard-level-text">
            <span class="wizard-level-tier">${tr.label}</span>
            <span class="wizard-level-desc">${tr.desc}</span>
          </span>
        </button>
      `).join('')}
    </div>
    <button class="btn btn-primary btn-block wizard-continue-btn" id="wizard-continue-btn">${t('common.continue')}</button>
  `;

  bodyEl.querySelectorAll('.wizard-level-row').forEach(btn => {
    btn.addEventListener('click', () => {
      STUDY_WIZARD.dailyLessonsGoal = parseInt(btn.dataset.tier, 10);
      bodyEl.querySelectorAll('.wizard-level-row').forEach(b => b.classList.toggle('active', b === btn));
    });
  });
  document.getElementById('wizard-continue-btn').addEventListener('click', advanceWizard);
}

function renderWizardSummaryStep(){
  const bodyEl = document.getElementById('study-plan-wizard-body');
  const levels = LEVELS.filter((l, i) => i <= LEVELS.findIndex(x => x.id === STUDY_WIZARD.targetLevel)).map(l => l.id);
  const lessonsRemaining = estimateLessonsRemainingForLevels(levels);
  const completionDate = estimateCompletionDate(lessonsRemaining, STUDY_WIZARD.days, STUDY_WIZARD.dailyLessonsGoal);
  const dateLabel = completionDate ? formatDatePt(completionDate) : t('wizard.summary.noDays');
  const goalText = LEVEL_DESCRIPTIONS[STUDY_WIZARD.targetLevel]?.text || '';
  const tier = dailyLessonTiers().find(tr => tr.id === STUDY_WIZARD.dailyLessonsGoal);

  bodyEl.innerHTML = `
    <div class="wizard-summary-title">${t('wizard.summary.title', { date: dateLabel })}</div>
    <div class="wizard-summary-goal-box">
      <span class="wizard-summary-goal-icon">🎯</span>
      <div>
        <div class="wizard-summary-goal-label">${t('wizard.summary.goalLabel')}</div>
        <div class="wizard-summary-goal-text">${goalText}</div>
      </div>
    </div>
    <div class="wizard-summary-plan-header">
      <div class="wizard-summary-plan-title">${t('wizard.summary.planTitle')}</div>
      <button class="wizard-summary-edit-btn" id="wizard-edit-btn">${t('wizard.summary.edit')}</button>
    </div>
    <div class="wizard-day-row wizard-summary-days">
      ${dayDefs().map(d => `
        <div class="wizard-day-chip ${STUDY_WIZARD.days[d.key] ? 'active' : ''}" style="pointer-events:none;">
          <span class="wizard-day-check">${STUDY_WIZARD.days[d.key] ? '✓' : ''}</span>
          <span class="wizard-day-label">${d.label}</span>
        </div>
      `).join('')}
    </div>
    <div class="wizard-summary-stats">
      <div>
        <div class="wizard-summary-stat-label">${t('wizard.summary.rhythm')}</div>
        <div class="wizard-summary-stat-value">${tier.icon} ${tier.label} · ${tier.desc}</div>
      </div>
      <div>
        <div class="wizard-summary-stat-label">${t('wizard.summary.time')}</div>
        <div class="wizard-summary-stat-value">🌅 ${String(STUDY_WIZARD.hour).padStart(2,'0')}:${String(STUDY_WIZARD.minute).padStart(2,'0')}</div>
      </div>
    </div>
    <button class="btn btn-primary btn-block wizard-continue-btn" id="wizard-save-btn">${t('wizard.summary.save')}</button>
  `;

  document.getElementById('wizard-edit-btn').addEventListener('click', () => {
    STUDY_WIZARD.step = 0;
    renderStudyWizardStep();
  });
  document.getElementById('wizard-save-btn').addEventListener('click', saveStudyWizard);
}

function saveStudyWizard(){
  const goal = STATE.studyGoal;
  goal.objective = STUDY_WIZARD.objective;
  goal.levels = LEVELS.filter((l, i) => i <= LEVELS.findIndex(x => x.id === STUDY_WIZARD.targetLevel)).map(l => l.id);
  goal.days = { ...STUDY_WIZARD.days };
  goal.hour = STUDY_WIZARD.hour;
  goal.minute = STUDY_WIZARD.minute;
  goal.notifications = STUDY_WIZARD.notifications;
  goal.dailyLessonsGoal = STUDY_WIZARD.dailyLessonsGoal;
  saveState();
  document.getElementById('study-plan-modal').style.display = 'none';
  renderStudyPlanCard();
}

// ---------- Card de progresso do plano (tela Estudo) ----------
function renderStudyPlanCard(){
  const subEl = document.getElementById('study-plan-sub');
  const bodyEl = document.getElementById('study-plan-body');
  const goal = STATE.studyGoal;

  if (!goal.dailyLessonsGoal || !goal.objective){
    subEl.textContent = t('wizard.card.setSub');
    bodyEl.innerHTML = `<button class="btn btn-primary btn-block" id="study-plan-cta-btn">${t('wizard.card.setCta')}</button>`;
    document.getElementById('study-plan-cta-btn').addEventListener('click', openStudyPlanModal);
    return;
  }

  const lessonsRemaining = estimateLessonsRemainingForLevels(goal.levels);
  const completionDate = estimateCompletionDate(lessonsRemaining, goal.days, goal.dailyLessonsGoal);
  const dateLabel = completionDate ? formatDatePt(completionDate) : null;
  const objLabel = objectiveOptions().find(o => o.id === goal.objective)?.label || '';
  const goalText = LEVEL_DESCRIPTIONS[goal.levels[goal.levels.length - 1]]?.text || objLabel;

  const week = buildLessonsWeekData();
  const weekTotal = week.reduce((sum, d) => sum + d.lessons, 0);
  const weekGoal = goal.dailyLessonsGoal * 7;
  const pct = weekGoal ? Math.min(100, Math.round((weekTotal / weekGoal) * 100)) : 0;
  const todayLessons = week[6].lessons;

  subEl.textContent = dateLabel ? t('wizard.card.subUntil', { date: dateLabel }) : t('wizard.card.subSet');
  bodyEl.innerHTML = `
    <div class="wizard-summary-goal-box">
      <span class="wizard-summary-goal-icon">🎯</span>
      <div>
        <div class="wizard-summary-goal-label">${t('wizard.summary.goalLabel')}</div>
        <div class="wizard-summary-goal-text">${goalText}</div>
      </div>
    </div>
    <div class="study-plan-ring-row">
      <div class="study-ring" style="--pct:${pct}">
        <div class="study-ring-inner">
          <div class="study-ring-num">${weekTotal}/${weekGoal}</div>
          <div class="study-ring-label">${t('wizard.card.lessonsThisWeek')}</div>
        </div>
      </div>
      <div class="study-plan-today">
        <div class="study-plan-today-label">${t('wizard.card.dailyGoal')}</div>
        <div class="study-plan-today-num">${tp('wizard.card.todayLessons', goal.dailyLessonsGoal, { done: todayLessons, goal: goal.dailyLessonsGoal })}</div>
        <div class="study-plan-estimate">${
          dateLabel ? t('wizard.card.estimate', { date: dateLabel }) : t('wizard.card.estimateNone')
        }</div>
      </div>
    </div>
    <div class="streak-week-row study-week-row">
      ${week.map(d => `
        <div class="streak-day-item ${d.done ? 'done' : ''} ${d.isToday ? 'today' : ''}">
          <div class="streak-day-circle">${d.done ? '✓' : ''}</div>
          <div class="streak-day-label">${d.label}</div>
        </div>
      `).join('')}
    </div>
  `;
}

// ---------- Chip de meta diária persistente (Home/Trilha) ----------
// A meta mora na seção "Metas" de Perfil (ver artefato de navegação,
// decisão #11 -- separada de "Progresso", que é só histórico/conquistas).
// Clique leva direto pro card completo -- não duplica nenhuma lógica do
// wizard/card, só resume o essencial.
function renderDailyGoalChip(){
  const chip = document.getElementById('daily-goal-chip');
  if (!chip) return;
  const goal = STATE.studyGoal.dailyLessonsGoal;
  if (!goal){ chip.style.display = 'none'; chip.innerHTML = ''; return; }
  ensureDailyBucket();
  // Number(...) || 0: nunca deixa um campo ausente virar NaN silencioso (ver
  // auditoria "O problema dos 100%" -- ensureDailyBucket() já reconcilia
  // isso na maioria dos casos, mas este piso garante que nunca mais apareça
  // "undefined" no texto nem uma barra cheia sem ter concluído).
  const done = Number(STATE.daily.lessonsForGoal) || 0;
  const pct = Math.min(100, Math.round((done / goal) * 100));
  const reached = done >= goal;
  chip.style.display = 'flex';
  chip.classList.toggle('done', reached);
  chip.innerHTML = `
    <span class="daily-goal-chip-icon">🎯</span>
    <div class="daily-goal-chip-body">
      <div class="daily-goal-chip-label">${tp('wizard.chip.label', goal, { done, goal })}</div>
      <div class="daily-goal-chip-track"><div class="daily-goal-chip-fill" style="width:${pct}%"></div></div>
    </div>
    ${reached ? '<span class="daily-goal-chip-check">✓</span>' : ''}
  `;
}
document.getElementById('daily-goal-chip')?.addEventListener('click', () => switchTab('goals'));

document.getElementById('study-plan-edit-btn').addEventListener('click', openStudyPlanModal);
document.getElementById('study-plan-modal-close').addEventListener('click', () => {
  document.getElementById('study-plan-modal').style.display = 'none';
});
document.getElementById('study-plan-modal').addEventListener('click', (e) => {
  if (e.target.id === 'study-plan-modal') document.getElementById('study-plan-modal').style.display = 'none';
});

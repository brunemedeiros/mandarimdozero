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
//   - estimateUnitExerciseCount(unit)  (específico: cada idioma tem seus
//                            próprios tipos de unidade/exercício)
// Só chamados dentro de funções, nunca no top-level deste arquivo -- a
// ordem de carregamento dos <script> não importa (hoisting normal).

const STREAK_DAY_LABELS = ['dom','seg','ter','qua','qui','sex','sáb'];

const DAY_DEFS = [
  { key: 'mon', label: 'seg' }, { key: 'tue', label: 'ter' }, { key: 'wed', label: 'qua' },
  { key: 'thu', label: 'qui' }, { key: 'fri', label: 'sex' }, { key: 'sat', label: 'sáb' }, { key: 'sun', label: 'dom' }
];
const DAY_KEY_BY_JS_INDEX = ['sun','mon','tue','wed','thu','fri','sat'];
const PT_MONTHS = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

function formatDatePt(date){
  return `${date.getDate()} ${PT_MONTHS[date.getMonth()]}, ${date.getFullYear()}`;
}

const OBJECTIVE_OPTIONS = [
  { id: 'fun', icon: '🎭', label: 'Diversão e cultura' },
  { id: 'travel', icon: '🌍', label: 'Viagem' },
  { id: 'friends', icon: '💬', label: 'Amigos e familiares' },
  { id: 'work', icon: '💼', label: 'Trabalho' },
  { id: 'education', icon: '🎓', label: 'Educação' }
];

function remainingUnitsForLevels(levels){
  if (!levels || !levels.length) return [];
  return UNITS.filter(u => levels.includes(u.level) && !STATE.unitProgress[u.id]?.completed);
}

function estimateMinutesRemainingForLevels(levels){
  const totalExercises = remainingUnitsForLevels(levels).reduce((sum, u) => sum + estimateUnitExerciseCount(u), 0);
  return Math.round(totalExercises * ESTIMATED_SECONDS_PER_EXERCISE / 60);
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

function buildMinutesWeekData(){
  const days = [];
  for (let i = 6; i >= 0; i--){
    const d = new Date(Date.now() - i*86400000);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const minutes = STATE.dailyMinutesLog[key] || 0;
    days.push({ label: STREAK_DAY_LABELS[d.getDay()], minutes, done: minutes >= STATE.studyGoal.dailyMinutes && STATE.studyGoal.dailyMinutes > 0, isToday: i === 0 });
  }
  return days;
}

// ---------- Assistente (wizard) de configuração da meta ----------
const STUDY_WIZARD_STEPS = ['objective', 'level', 'schedule', 'minutes', 'summary'];
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
    dailyMinutes: goal.dailyMinutes || 10
  };
  document.getElementById('study-plan-modal').style.display = 'flex';
  renderStudyWizardStep();
}

function renderStudyWizardStep(){
  const stepName = STUDY_WIZARD_STEPS[STUDY_WIZARD.step];
  if (stepName === 'objective') renderWizardObjectiveStep();
  else if (stepName === 'level') renderWizardLevelStep();
  else if (stepName === 'schedule') renderWizardScheduleStep();
  else if (stepName === 'minutes') renderWizardMinutesStep();
  else if (stepName === 'summary') renderWizardSummaryStep();
}

function advanceWizard(){
  STUDY_WIZARD.step += 1;
  renderStudyWizardStep();
}

function renderWizardObjectiveStep(){
  const bodyEl = document.getElementById('study-plan-wizard-body');
  bodyEl.innerHTML = `
    <div class="wizard-question">Qual é o seu principal objetivo ao aprender ${LANGUAGE_STUDY_NAME}?</div>
    <div class="wizard-option-list">
      ${OBJECTIVE_OPTIONS.map(o => `
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
    <div class="wizard-question">Que nível você quer alcançar?</div>
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
    <div class="wizard-question">Em quais dias da semana você deseja estudar?</div>
    <div class="wizard-day-row">
      ${DAY_DEFS.map(d => `
        <button class="wizard-day-chip ${STUDY_WIZARD.days[d.key] ? 'active' : ''}" data-day="${d.key}">
          <span class="wizard-day-check">${STUDY_WIZARD.days[d.key] ? '✓' : ''}</span>
          <span class="wizard-day-label">${d.label}</span>
        </button>
      `).join('')}
    </div>
    <div class="wizard-question" style="margin-top:26px;">Que hora do dia você deseja estudar?</div>
    <div class="wizard-time-row">
      <input type="number" min="0" max="23" id="wizard-hour-input" value="${STUDY_WIZARD.hour}">
      <span class="wizard-time-sep">:</span>
      <input type="number" min="0" max="59" step="5" id="wizard-minute-input" value="${String(STUDY_WIZARD.minute).padStart(2,'0')}">
    </div>
    <div class="wizard-notif-row">
      <div class="wizard-notif-text">
        <div class="wizard-notif-title">Notificações</div>
        <div class="wizard-notif-sub">Receber lembretes de quando você deve estudar — só funciona com o navegador aberto (não temos servidor de notificação push).</div>
      </div>
      <button class="pref-switch" id="wizard-notif-switch" role="switch" aria-checked="${STUDY_WIZARD.notifications}"><span class="pref-switch-knob"></span></button>
    </div>
    <button class="btn btn-primary btn-block wizard-continue-btn" id="wizard-continue-btn">Continuar</button>
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

function renderWizardMinutesStep(){
  const bodyEl = document.getElementById('study-plan-wizard-body');
  bodyEl.innerHTML = `
    <div class="wizard-question">Por quanto tempo você deseja estudar?</div>
    <div class="wizard-minutes-sub">Recomendamos 10 minutos por dia.</div>
    <div class="wizard-stepper">
      <button class="wizard-stepper-btn" id="wizard-minutes-minus">−</button>
      <div class="wizard-stepper-value">
        <div class="wizard-stepper-num" id="wizard-minutes-num">${STUDY_WIZARD.dailyMinutes}</div>
        <div class="wizard-stepper-label">minutos por dia</div>
      </div>
      <button class="wizard-stepper-btn" id="wizard-minutes-plus">+</button>
    </div>
    <button class="btn btn-primary btn-block wizard-continue-btn" id="wizard-continue-btn">Continuar</button>
  `;

  document.getElementById('wizard-minutes-minus').addEventListener('click', () => {
    STUDY_WIZARD.dailyMinutes = Math.max(5, STUDY_WIZARD.dailyMinutes - 5);
    document.getElementById('wizard-minutes-num').textContent = STUDY_WIZARD.dailyMinutes;
  });
  document.getElementById('wizard-minutes-plus').addEventListener('click', () => {
    STUDY_WIZARD.dailyMinutes = Math.min(60, STUDY_WIZARD.dailyMinutes + 5);
    document.getElementById('wizard-minutes-num').textContent = STUDY_WIZARD.dailyMinutes;
  });
  document.getElementById('wizard-continue-btn').addEventListener('click', advanceWizard);
}

function renderWizardSummaryStep(){
  const bodyEl = document.getElementById('study-plan-wizard-body');
  const levels = LEVELS.filter((l, i) => i <= LEVELS.findIndex(x => x.id === STUDY_WIZARD.targetLevel)).map(l => l.id);
  const minutesRemaining = estimateMinutesRemainingForLevels(levels);
  const completionDate = estimateCompletionDate(minutesRemaining, STUDY_WIZARD.days, STUDY_WIZARD.dailyMinutes);
  const dateLabel = completionDate ? formatDatePt(completionDate) : 'defina ao menos 1 dia da semana';
  const goalText = LEVEL_DESCRIPTIONS[STUDY_WIZARD.targetLevel]?.text || '';

  bodyEl.innerHTML = `
    <div class="wizard-summary-title">Você alcançará sua meta até <strong>${dateLabel}</strong></div>
    <div class="wizard-summary-goal-box">
      <span class="wizard-summary-goal-icon">⏱️</span>
      <div>
        <div class="wizard-summary-goal-label">Sua meta</div>
        <div class="wizard-summary-goal-text">${goalText}</div>
      </div>
    </div>
    <div class="wizard-summary-plan-header">
      <div class="wizard-summary-plan-title">Seu Plano de Estudo personalizado</div>
      <button class="wizard-summary-edit-btn" id="wizard-edit-btn">Editar</button>
    </div>
    <div class="wizard-day-row wizard-summary-days">
      ${DAY_DEFS.map(d => `
        <div class="wizard-day-chip ${STUDY_WIZARD.days[d.key] ? 'active' : ''}" style="pointer-events:none;">
          <span class="wizard-day-check">${STUDY_WIZARD.days[d.key] ? '✓' : ''}</span>
          <span class="wizard-day-label">${d.label}</span>
        </div>
      `).join('')}
    </div>
    <div class="wizard-summary-stats">
      <div>
        <div class="wizard-summary-stat-label">Duração</div>
        <div class="wizard-summary-stat-value">🕐 ${STUDY_WIZARD.dailyMinutes} minutos por dia</div>
      </div>
      <div>
        <div class="wizard-summary-stat-label">Horário</div>
        <div class="wizard-summary-stat-value">🌅 ${String(STUDY_WIZARD.hour).padStart(2,'0')}:${String(STUDY_WIZARD.minute).padStart(2,'0')}</div>
      </div>
    </div>
    <button class="btn btn-primary btn-block wizard-continue-btn" id="wizard-save-btn">Salvar Plano de Estudo</button>
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
  goal.dailyMinutes = STUDY_WIZARD.dailyMinutes;
  saveState();
  document.getElementById('study-plan-modal').style.display = 'none';
  renderStudyPlanCard();
}

// ---------- Card de progresso do plano (tela Estudo) ----------
function renderStudyPlanCard(){
  const subEl = document.getElementById('study-plan-sub');
  const bodyEl = document.getElementById('study-plan-body');
  const goal = STATE.studyGoal;

  if (!goal.dailyMinutes || !goal.objective){
    subEl.textContent = 'Defina quanto tempo por dia você quer estudar';
    bodyEl.innerHTML = `<button class="btn btn-primary btn-block" id="study-plan-cta-btn">Definir minha meta</button>`;
    document.getElementById('study-plan-cta-btn').addEventListener('click', openStudyPlanModal);
    return;
  }

  const minutesRemaining = estimateMinutesRemainingForLevels(goal.levels);
  const completionDate = estimateCompletionDate(minutesRemaining, goal.days, goal.dailyMinutes);
  const dateLabel = completionDate ? formatDatePt(completionDate) : null;
  const objLabel = OBJECTIVE_OPTIONS.find(o => o.id === goal.objective)?.label || '';
  const goalText = LEVEL_DESCRIPTIONS[goal.levels[goal.levels.length - 1]]?.text || objLabel;

  const week = buildMinutesWeekData();
  const weekTotal = Math.round(week.reduce((sum, d) => sum + d.minutes, 0));
  const weekGoal = goal.dailyMinutes * 7;
  const pct = weekGoal ? Math.min(100, Math.round((weekTotal / weekGoal) * 100)) : 0;
  const todayMinutes = Math.round(week[6].minutes);

  subEl.textContent = dateLabel ? `Meta até ${dateLabel}` : 'Meta definida';
  bodyEl.innerHTML = `
    <div class="wizard-summary-goal-box">
      <span class="wizard-summary-goal-icon">⏱️</span>
      <div>
        <div class="wizard-summary-goal-label">Sua meta</div>
        <div class="wizard-summary-goal-text">${goalText}</div>
      </div>
    </div>
    <div class="study-plan-ring-row">
      <div class="study-ring" style="--pct:${pct}">
        <div class="study-ring-inner">
          <div class="study-ring-num">${weekTotal}/${weekGoal}</div>
          <div class="study-ring-label">min esta semana</div>
        </div>
      </div>
      <div class="study-plan-today">
        <div class="study-plan-today-label">Meta diária</div>
        <div class="study-plan-today-num">${todayMinutes} / ${goal.dailyMinutes} min</div>
        <div class="study-plan-estimate">${
          dateLabel ? `Nesse ritmo, você alcança sua meta até <strong>${dateLabel}</strong>.` : 'Selecione ao menos um dia da semana pra calcularmos sua meta.'
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

document.getElementById('study-plan-edit-btn').addEventListener('click', openStudyPlanModal);
document.getElementById('study-plan-modal-close').addEventListener('click', () => {
  document.getElementById('study-plan-modal').style.display = 'none';
});
document.getElementById('study-plan-modal').addEventListener('click', (e) => {
  if (e.target.id === 'study-plan-modal') document.getElementById('study-plan-modal').style.display = 'none';
});

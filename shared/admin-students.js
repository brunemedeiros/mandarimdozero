// ---------- Alunos (admin) -- Fase 1 do sistema de alunos particulares ----------
// Tela só visível/alcançável pra conta da autora (isAdminUser). Vincula uma
// conta já existente (por @username) como aluna, num idioma específico,
// via a tabela teacher_students (shared/roles.js). Sem UI de flashcard
// ainda -- isso é fase futura, fora do escopo desta entrega (ver CLAUDE.md).
//
// Depende de (mesma posição de shared/admin-badges.js -- antes de app.js):
//   - shared/roles.js            (fetchMyStudents, assignStudentToTeacher, removeStudentLink)
//   - shared/admin-badges.js     (fetchAllProfiles, resolveProfileByUsername -- reaproveitados)
//   - shared/student-metrics.js  (fetchTeacherStudentMetrics -- Fase 6)
//   - shared/toast.js            (showToast)
//   - languages/<lang>/app.js    (isAdminUser)

// Fase 6 (ver CLAUDE.md) -- quais vínculos já tiveram o painel de métricas
// aberto nesta sessão, pra não refazer a chamada RPC a cada re-render (ex:
// depois de vincular/remover outra aluna). Reseta ao recarregar a página --
// não precisa persistir, é só cache de sessão.
const STUDENT_METRICS_CACHE = {};

// 'portugues' de propósito NÃO está em AVAILABLE_LANGUAGES (languages/
// index.js) -- decisão explícita (CLAUDE.md): só o schema já aceita o
// valor, sem nenhuma mudança visual no site até o curso existir de
// verdade. Esta tela de admin é código NOVO, então pode listar o idioma
// como opção de atribuição sem violar essa decisão -- é justamente o
// "anexar a possibilidade" que a autora pediu.
const STUDENT_LANGUAGE_LABELS = {
  get frances(){ return t('fieldEditor.lang.fr'); },
  get mandarim(){ return t('admin.students.lang.mandarim'); },
  get portugues(){ return t('admin.students.lang.portugues'); },
};

// CONSOLIDAÇÃO i18n (Fase 6, Admin A) -- helpers de texto compartilhados
// pelas telas de admin (flashcards/aulas/material). Funções (nunca
// constantes de módulo) pra t()/tp() ser avaliado no idioma ATUAL.
function adminSelectionCountLabel(n){
  return n === 0 ? t('admin.common.noneSelected') : tp('admin.common.selectedCount', n);
}
function adminForStudentsSuffix(n){
  return n > 1 ? t('admin.common.forNStudents', { n }) : '';
}
function adminEmptyForSuffix(n){
  return n > 1 ? t('admin.common.forTheseStudents') : n === 1 ? t('admin.common.forThisStudent') : t('admin.common.forNoStudent');
}

// Grillado explicitamente com a autora (ver CLAUDE.md, "rótulo do
// seletor de direção do cartão") -- pareamento idioma estudado/idioma
// nativo usado só pelo texto do radio "Idioma de cada lado" (shared/
// admin-flashcards.js + shared/my-flashcards.js). `mandarim`
// deliberadamente FORA deste mapa -- o seletor de direção já não se
// aplica a ele (par hanzi/pinyin inseparável, sem "back_pinyin" pra
// completar a inversão), então nunca precisa de um rótulo. `portugues`
// pareado com "inglês" foi uma decisão EXPLÍCITA da autora no grilling
// (não uma suposição minha) mesmo sem existir site/interface de
// português ainda -- se isso mudar quando o site de português for
// construído de verdade, é só atualizar esta entrada.
const FLASHCARD_DIRECTION_LANGUAGE_LABELS = {
  frances: { target: 'francês', native: 'português' },
  portugues: { target: 'português', native: 'inglês' },
};

async function renderAdminStudentsView(){
  const wrap = document.getElementById('admin-students-content');
  if (!wrap) return;
  if (!isAdminUser()){
    wrap.innerHTML = `<p class="profile-empty-note">${t('admin.common.adminOnly')}</p>`;
    return;
  }
  wrap.innerHTML = loadingHTML();

  const [students, profiles] = await Promise.all([fetchMyStudents(), fetchAllProfiles()]);

  // Aluno já vinculado some da lista "Conta do aluno" -- mas só pro MESMO
  // idioma que já tem vínculo. "Cada aluno vale pra 1 idioma" (Fase 1)
  // significa que a mesma conta pode ser vinculada de novo, legitimamente,
  // pra um idioma DIFERENTE (ex: Sandra de francês + Sandra de mandarim
  // como 2 vínculos separados) -- por isso o filtro depende do idioma
  // escolhido no 2º select, não é uma exclusão fixa de "quem já é aluno".
  const linkedUsernamesByLang = {};
  students.forEach(s => {
    if (!s.username) return;
    if (!linkedUsernamesByLang[s.language_app_key]) linkedUsernamesByLang[s.language_app_key] = new Set();
    linkedUsernamesByLang[s.language_app_key].add(s.username);
  });
  const usernameOptionsHTMLForLang = (lang) => {
    const linked = linkedUsernamesByLang[lang] || new Set();
    return profiles.filter(p => !linked.has(p.username))
      .map(p => `<option value="${p.username}">@${p.username}${p.display_name ? ` — ${escapeHTML(p.display_name)}` : ''}</option>`).join('');
  };
  const languageOptionsHTML = Object.entries(STUDENT_LANGUAGE_LABELS)
    .map(([key, label]) => `<option value="${key}">${label}</option>`).join('');
  const defaultLang = Object.keys(STUDENT_LANGUAGE_LABELS)[0];

  const studentsHTML = students.length ? students.map(s => `
    <div class="admin-badge-row">
      <div class="admin-badge-info">
        <div class="admin-badge-name">@${s.username || t('admin.common.removedUser')}${s.display_name ? ` <span class="admin-grant-badge-name">— ${escapeHTML(s.display_name)}</span>` : ''}</div>
        <div class="admin-badge-desc">${STUDENT_LANGUAGE_LABELS[s.language_app_key] || s.language_app_key} · ${t('admin.students.linkedOn', { date: fmtDate(s.created_at) })}</div>
      </div>
      <button class="admin-badge-delete-btn" data-toggle-metrics="${s.id}" data-metrics-student="${s.student_id}" data-metrics-lang="${s.language_app_key}" title="${t('admin.students.metricsTitle')}">📊</button>
      <button class="admin-badge-delete-btn" data-remove-link="${s.id}" title="${t('admin.students.removeLinkTitle')}">✕</button>
    </div>
    <div class="admin-badge-desc" id="metrics-link-${s.id}" style="display:none; padding:10px 0 14px;"></div>
  `).join('') : `<p class="profile-empty-note">${t('admin.students.none')}</p>`;

  wrap.innerHTML = `
    <div class="profile-section">
      <div class="section-label">${t('admin.students.linkTitle')}</div>
      <form id="admin-assign-student-form" class="profile-edit-form">
        <label class="profile-edit-label" for="admin-student-username">${t('admin.students.accountLabel')}</label>
        <select id="admin-student-username" class="profile-edit-input">
          <option value="" disabled selected>${t('admin.students.selectAccount')}</option>
          ${usernameOptionsHTMLForLang(defaultLang)}
        </select>
        <label class="profile-edit-label" for="admin-student-language">${t('fieldEditor.field.language')}</label>
        <select id="admin-student-language" class="profile-edit-input">${languageOptionsHTML}</select>
        <p class="profile-edit-error" id="admin-assign-student-error"></p>
        <button type="submit" class="btn btn-primary btn-block" id="admin-assign-student-btn">${t('admin.students.link')}</button>
      </form>
    </div>

    <div class="profile-section">
      <div class="section-label">${t('admin.students.yourStudents', { n: students.length })}</div>
      ${studentsHTML}
    </div>
  `;

  // Reconstrói a lista de contas disponíveis a cada troca de idioma -- um
  // aluno que já tem vínculo em Francês continua aparecendo aqui se ela
  // trocar pra Mandarim (ver comentário acima sobre linkedUsernamesByLang).
  document.getElementById('admin-student-language').addEventListener('change', (e) => {
    const usernameSelect = document.getElementById('admin-student-username');
    const opts = usernameOptionsHTMLForLang(e.target.value);
    usernameSelect.innerHTML = `<option value="" disabled selected>${t('admin.students.selectAccount')}</option>${opts}`;
  });

  document.getElementById('admin-assign-student-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('admin-assign-student-btn');
    const errorEl = document.getElementById('admin-assign-student-error');
    errorEl.textContent = '';
    btn.disabled = true;
    const result = await assignStudentToTeacher(
      document.getElementById('admin-student-username').value,
      document.getElementById('admin-student-language').value
    );
    btn.disabled = false;
    if (!result.ok){ errorEl.textContent = result.error; return; }
    showToast(t('admin.students.linkedToast', { username: result.target.username }));
    renderAdminStudentsView();
  });

  wrap.querySelectorAll('[data-remove-link]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm(t('admin.students.removeConfirm'))) return;
      await removeStudentLink(btn.dataset.removeLink);
      renderAdminStudentsView();
    });
  });

  wrap.querySelectorAll('[data-toggle-metrics]').forEach(btn => {
    btn.addEventListener('click', () => toggleStudentMetrics(btn));
  });
}


// Fase 6 + Painel do aluno ampliado (070) -- abre/fecha o painel de um
// vínculo específico. Busca as DUAS RPCs em paralelo (visão geral 070 +
// métricas dos cartões da professora 059) só na PRIMEIRA vez que o vínculo
// é aberto nesta sessão -- STUDENT_METRICS_CACHE evita refazer as chamadas.
async function toggleStudentMetrics(btn){
  const linkId = btn.dataset.toggleMetrics;
  const panel = document.getElementById(`metrics-link-${linkId}`);
  if (!panel) return;

  if (panel.style.display !== 'none'){
    panel.style.display = 'none';
    return;
  }

  if (!STUDENT_METRICS_CACHE[linkId]){
    panel.style.display = 'block';
    panel.innerHTML = 'Carregando painel do aluno...';
    const [overview, metrics] = await Promise.all([
      fetchTeacherStudentOverview(btn.dataset.metricsStudent, btn.dataset.metricsLang),
      fetchTeacherStudentMetrics(btn.dataset.metricsStudent, btn.dataset.metricsLang),
    ]);
    STUDENT_METRICS_CACHE[linkId] = { overview, metrics };
  }

  const cached = STUDENT_METRICS_CACHE[linkId];
  panel.style.display = 'block';
  panel.innerHTML = renderStudentPanelHTML(cached.overview, cached.metrics);
}

// ---------- Painel do aluno ampliado (070) -- helpers puros de render ----------
// Tudo aqui é string -> string (sem DOM, sem rede), testado em
// tests/painel-alunos/test_student_panel_unit.js. Todo texto vindo do banco
// passa por escapeHTML (shared/profile.js).

// Rótulo do histórico de acertos antes de existir dado: o evento
// 'review_answer' só começa a ser gravado quando esta versão for publicada.
// Data ESTIMADA de publicação -- ajustar se o deploy acontecer em outro dia.
const ANSWER_HISTORY_START_LABEL = '05/10/2026';

const STUDENT_PANEL_TAB_LABELS = {
  path: 'Trilha', review: 'Revisão', profile: 'Perfil', challenges: 'Desafios',
  conjugaison: 'Conjugação', leaderboard: 'Ranking', progress: 'Progresso',
  dictation: 'Ditados', 'my-flashcards': 'Meus cartões', settings: 'Configurações',
  goals: 'Metas', 'support-materials': 'Material de apoio', 'admin-badges': 'Painel de Admin',
  hanzi: 'Hanzi',
};
const STUDENT_PANEL_ACTIVITY_LABELS = {
  vocab_lesson: 'lição da trilha', unit_checkpoint: 'ponto de verificação',
  flashcard_review: 'revisão de flashcards', match_game: 'jogo Combinar',
  speed_review: 'revisão rápida', dictation: 'ditado', conjugation_session: 'conjugação',
  challenge: 'desafio', hanzi_lesson: 'lição de hanzi', hanzi_review: 'revisão de hanzi',
};

function studentPanelEsc(v){
  return escapeHTML(v == null ? '' : String(v));
}
function studentPanelNum(v){
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// "hoje"/"ontem"/"N dias atrás"/"sem registro" a partir de 'YYYY-MM-DD'.
function studentPanelDaysAgoLabel(dateStr){
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return 'sem registro';
  const days = Math.round((Date.parse(todayStr()) - Date.parse(dateStr)) / 86400000);
  if (days <= 0) return 'hoje';
  if (days === 1) return 'ontem';
  return `${days} dias atrás`;
}

// Lista das últimas N datas locais ('YYYY-MM-DD'), da mais antiga pra hoje.
function studentPanelLastDays(n){
  const out = [];
  for (let i = n - 1; i >= 0; i--) out.push(dateStrDaysAgo(i));
  return out;
}

function studentPanelActiveDaysCount(activityDays, n){
  const log = activityDays && typeof activityDays === 'object' ? activityDays : {};
  return studentPanelLastDays(n).filter(d => studentPanelNum(log[d]) > 0).length;
}

// Título de unidade/módulo do SITE ATUAL (UNITS/MODULES de content.js), só
// quando o idioma do progresso é o mesmo do site aberto; senão mostra o id.
function studentPanelUnitTitle(langKey, unitId){
  const sameSite = typeof APP_KEY !== 'undefined' && APP_KEY === langKey;
  if (sameSite && typeof UNITS !== 'undefined' && Array.isArray(UNITS)){
    const u = UNITS.find(x => String(x.id) === String(unitId));
    if (u && u.title) return `${studentPanelEsc(u.id)} · ${studentPanelEsc(u.title)}`;
  }
  return studentPanelEsc(unitId);
}
function studentPanelModuleTitle(langKey, moduleId){
  const sameSite = typeof APP_KEY !== 'undefined' && APP_KEY === langKey;
  if (sameSite && typeof MODULES !== 'undefined' && Array.isArray(MODULES)){
    const m = MODULES.find(x => String(x.id) === String(moduleId));
    if (m && m.title) return `${studentPanelEsc(m.title)}`;
  }
  return studentPanelEsc(moduleId);
}

function studentPanelLangLabel(key){
  return STUDENT_LANGUAGE_LABELS[key] ? STUDENT_LANGUAGE_LABELS[key].replace(' (em breve)', '') : studentPanelEsc(key);
}

// Texto humano de um evento da linha do tempo.
function studentPanelEventLabel(ev){
  const meta = ev && ev.meta && typeof ev.meta === 'object' ? ev.meta : {};
  const name = ev ? ev.name : '';
  if (ev && ev.type === 'tab_switch') return `Abriu a aba ${studentPanelEsc(STUDENT_PANEL_TAB_LABELS[name] || name)}`;
  if (ev && ev.type === 'report_submitted') return 'Enviou um relato de problema/sugestão';
  const what = STUDENT_PANEL_ACTIVITY_LABELS[name] || name;
  const unit = meta.unitId != null ? ` (${studentPanelUnitTitle(ev.lang, meta.unitId)})` : '';
  if (ev && ev.type === 'lesson_start') return `Começou ${studentPanelEsc(what)}${unit}`;
  if (ev && ev.type === 'lesson_complete'){
    let score = '';
    if (meta.scorePct != null) score = ` -- ${studentPanelNum(meta.scorePct)}%`;
    else if (meta.pct != null) score = ` -- ${studentPanelNum(meta.pct)}%`;
    else if (meta.score != null && name === 'dictation') score = ` -- nota ${studentPanelNum(meta.score)}`;
    else if (meta.count != null) score = ` -- ${studentPanelNum(meta.count)} cartões`;
    return `Concluiu ${studentPanelEsc(what)}${unit}${score}`;
  }
  return `${studentPanelEsc(ev && ev.type)} · ${studentPanelEsc(name)}`;
}

function studentPanelEventTime(at){
  const d = new Date(at);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function studentPanelPct(correct, total){
  const t = studentPanelNum(total);
  return t > 0 ? Math.round(studentPanelNum(correct) * 100 / t) : null;
}

// Faixa de 30 quadradinhos (1 por dia) -- reaproveita só tokens já
// calibrados nos dois temas (--jade / --paper-line).
function studentPanelActivityStripHTML(activityDays){
  const log = activityDays && typeof activityDays === 'object' ? activityDays : {};
  const cells = studentPanelLastDays(30).map(d => {
    const n = studentPanelNum(log[d]);
    const bg = n > 0 ? 'var(--jade)' : 'var(--paper-line)';
    return `<span title="${studentPanelEsc(d)}: ${n} atividade(s)" style="display:inline-block;width:9px;height:9px;margin:1px;border-radius:2px;background:${bg};"></span>`;
  }).join('');
  return `<div aria-label="Atividade dos últimos 30 dias" style="line-height:0;margin:4px 0;">${cells}</div>`;
}

function studentPanelDetailsHTML(title, body){
  return `<details style="margin-top:6px;"><summary style="cursor:pointer;">${title}</summary><div style="padding:4px 0 4px 12px;">${body}</div></details>`;
}

// Resumo + detalhes de UM idioma do aluno.
function studentPanelLanguageHTML(lang, isLinked, showLangHeader){
  const key = lang && lang.key;
  const streak = (typeof effectiveStreakFor === 'function')
    ? effectiveStreakFor(studentPanelNum(lang.streak), lang.lastStudyDay)
    : studentPanelNum(lang.streak);
  const ps = lang.progressSummary && typeof lang.progressSummary === 'object' ? lang.progressSummary : null;
  const levelLine = ps && ps.levelLabel ? `${studentPanelEsc(ps.levelLabel)} · ${studentPanelNum(ps.pct)}%` : 'sem registro';
  const units = Array.isArray(lang.unitsCompleted) ? lang.unitsCompleted : [];
  const q = lang.queue && typeof lang.queue === 'object' ? lang.queue : {};
  const active7 = studentPanelActiveDaysCount(lang.activityDays, 7);
  const active30 = studentPanelActiveDaysCount(lang.activityDays, 30);
  const lessons30 = studentPanelLastDays(30).reduce((s, d) => s + studentPanelNum((lang.dailyLessons || {})[d]), 0);

  const header = showLangHeader
    ? `<div class="admin-badge-name" style="margin-top:8px;">${studentPanelLangLabel(key)}${isLinked ? ' (idioma do vínculo)' : ''}</div>`
    : '';

  const summary = `
    <div>Último estudo: <strong>${studentPanelDaysAgoLabel(lang.lastStudyDay)}</strong> · Sequência: <strong>🔥 ${streak}</strong> · XP: <strong>${studentPanelNum(lang.xp)}</strong></div>
    <div>Nível: <strong>${levelLine}</strong> · Unidades concluídas: <strong>${units.length}</strong> (${studentPanelNum(lang.unitsStarted)} iniciadas)</div>
    <div>Dias ativos: <strong>${active7} nos últimos 7</strong> · ${active30} nos últimos 30</div>
    <div>Fila de revisão: <strong>${studentPanelNum(q.due)} devidos</strong> · ${studentPanelNum(q.new)} novos · ${studentPanelNum(q.learning)} aprendendo · ${studentPanelNum(q.review)} em revisão · ${studentPanelNum(q.weak)} fracos (errados 2+ vezes)</div>
    <div>Cartões próprios do aluno: <strong>${studentPanelNum(lang.ownCardsActive)}</strong> · Revisões feitas no total: ${studentPanelNum(lang.totalReviews)}</div>
  `;

  const unitsBody = units.length
    ? `<ul style="margin:0;padding-left:16px;">${units.map(u => `<li>${studentPanelUnitTitle(key, u)}</li>`).join('')}</ul>`
    : 'Nenhuma unidade concluída ainda.';

  const cps = lang.checkpoints && typeof lang.checkpoints === 'object' ? Object.entries(lang.checkpoints) : [];
  const cpBody = cps.length
    ? `<ul style="margin:0;padding-left:16px;">${cps.map(([id, c]) => `<li>${studentPanelModuleTitle(key, id)}: melhor nota <strong>${studentPanelNum(c && c.bestScore)}%</strong>${c && c.completed ? ' ✓' : ''}</li>`).join('')}</ul>`
    : 'Nenhum ponto de verificação feito ainda.';

  const actBody = `${studentPanelActivityStripHTML(lang.activityDays)}<div>${active30} dias ativos · ${lessons30} lições concluídas nos últimos 30 dias</div>`;

  const dicts = Array.isArray(lang.dictations) ? lang.dictations : [];
  const dictBody = `
    <div>Desafios concluídos: <strong>${studentPanelNum(lang.challengesCompleted)}</strong></div>
    ${dicts.length
      ? `<ul style="margin:0;padding-left:16px;">${dicts.map(d => `<li>${studentPanelEsc(d.id)}: melhor nota <strong>${studentPanelNum(d.bestScore)}</strong> · ${studentPanelNum(d.attempts)} tentativa(s)</li>`).join('')}</ul>`
      : '<div>Nenhum ditado feito ainda.</div>'}
  `;

  return `
    ${header}
    ${summary}
    ${studentPanelDetailsHTML('Unidades concluídas', unitsBody)}
    ${studentPanelDetailsHTML('Notas dos pontos de verificação', cpBody)}
    ${studentPanelDetailsHTML('Atividade dos últimos 30 dias', actBody)}
    ${studentPanelDetailsHTML('Ditados e desafios', dictBody)}
  `;
}

function studentPanelTimelineHTML(timeline){
  const items = Array.isArray(timeline) ? timeline : [];
  if (!items.length) return 'Nenhuma atividade registrada ainda.';
  return `<ul style="margin:0;padding-left:16px;">${items.map(ev =>
    `<li><span style="color:var(--ink-soft);">${studentPanelEsc(studentPanelEventTime(ev.at))}</span> -- ${studentPanelEventLabel(ev)}</li>`
  ).join('')}</ul>`;
}

function studentPanelAnswersHTML(answers, lessonScores){
  const a = answers && typeof answers === 'object' ? answers : {};
  const l = lessonScores && typeof lessonScores === 'object' ? lessonScores : {};
  const lessonsLine = studentPanelNum(l.last30Count) > 0
    ? `<div>Lições e pontos de verificação (30 dias): média <strong>${studentPanelNum(l.last30AvgPct)}%</strong> em ${studentPanelNum(l.last30Count)}</div>`
    : '';
  if (!studentPanelNum(a.allTotal)){
    return `<div>O histórico de acertos nas revisões começa a ser registrado a partir de ${ANSWER_HISTORY_START_LABEL}.</div>${lessonsLine}`;
  }
  const p7 = studentPanelPct(a.last7Correct, a.last7Total);
  const p30 = studentPanelPct(a.last30Correct, a.last30Total);
  return `
    <div>Revisões (7 dias): <strong>${p7 === null ? '--' : p7 + '%'}</strong> de acerto em ${studentPanelNum(a.last7Total)} cartões</div>
    <div>Revisões (30 dias): <strong>${p30 === null ? '--' : p30 + '%'}</strong> de acerto em ${studentPanelNum(a.last30Total)} cartões</div>
    ${lessonsLine}
  `;
}

// Painel completo: visão geral (070) + bloco dos cartões da professora (059).
function renderStudentPanelHTML(overview, metrics){
  let html = '';
  if (!overview || !Array.isArray(overview.languages)){
    html += '<p class="profile-empty-note">Não foi possível carregar a visão geral do aluno agora.</p>';
  } else {
    const linked = overview.linkedLanguage;
    const langs = overview.languages;
    const lastAccess = Array.isArray(overview.timeline) && overview.timeline[0] ? studentPanelEventTime(overview.timeline[0].at) : '';
    if (lastAccess) html += `<div>Último acesso ao app: <strong>${studentPanelEsc(lastAccess)}</strong></div>`;
    if (!langs.length){
      html += '<div>Ainda não há progresso salvo nesta conta.</div>';
    } else {
      if (!langs.some(l => l.key === linked)){
        html += `<div class="profile-edit-hint">Sem progresso em ${studentPanelLangLabel(linked)} -- estudando no site de ${langs.map(l => studentPanelLangLabel(l.key)).join(' e ')}.</div>`;
      }
      html += langs.map(l => studentPanelLanguageHTML(l, l.key === linked, langs.length > 1 || l.key !== linked)).join('');
    }
    html += studentPanelDetailsHTML('Histórico de acertos', studentPanelAnswersHTML(overview.answers, overview.lessonScores));
    html += studentPanelDetailsHTML('Linha do tempo (últimas atividades)', studentPanelTimelineHTML(overview.timeline));
  }
  html += `<div class="admin-badge-name" style="margin-top:10px;">Cartões que você criou</div>${renderStudentMetricsHTML(metrics)}`;
  return html;
}

// Renderiza só o que a function get_teacher_student_metrics devolve (migration
// 059, K.6) -- tudo agregado, nada de resposta/cartão individual. Duas unidades,
// nunca misturadas (docs/K-analytics-contrato.md):
//   CONTEÚDOS = Notes (contentsX): 1 conteúdo pode gerar vários cartões
//     (Reverso = 2, Cloze = N). Força é por conteúdo.
//   CARTÕES = CardInstances (cardsX): Novos/Aprendendo/Para revisar (estado
//     Review)/Devidos (vencidos, não-Novos).
// Arquivados são informativos e nunca entram nos totais ativos.
// Painel ampliado (070): sem cartões da professora NÃO esconde mais a última
// atividade (antes o retorno antecipado fazia o aluno parecer vazio).
function renderStudentMetricsHTML(m){
  if (!m || typeof m.contentsTotal !== 'number'){
    return '<p class="profile-empty-note">Não foi possível carregar as métricas agora.</p>';
  }
  const lastActivityLine = `<div>Última atividade geral da conta: <strong>${studentPanelDaysAgoLabel(m.lastStudyDay)}</strong></div>`;
  if (!m.contentsTotal && !m.archivedNotes){
    return `${lastActivityLine}<p class="profile-empty-note">Você ainda não criou nenhum cartão pra este aluno, na aba "📇 Flashcards".</p>`;
  }
  const archivedLine = m.archivedNotes
    ? `<div>Arquivados (fora das contagens acima): <strong>${m.archivedNotes} conteúdos</strong> · ${m.archivedCards} cartões</div>`
    : '';
  return `
    ${lastActivityLine}
    <div>Conteúdos que você criou pra ele: <strong>${m.contentsTotal} ativos</strong></div>
    <div>Conteúdos estudados: <strong>${m.contentsStudied} de ${m.contentsTotal}</strong> · ${m.contentsNotStarted} não iniciados</div>
    <div>Força dos conteúdos: ${m.contentsStrengthNotStarted} não iniciados · <strong>${m.contentsStrengthWeak} fracos</strong> · ${m.contentsStrengthMedium} médios · ${m.contentsStrengthStrong} fortes</div>
    <div>Cartões gerados desses conteúdos: <strong>${m.cardsTotal}</strong> · ${m.cardsNew} novos · ${m.cardsLearning} aprendendo · ${m.cardsReview} para revisar · ${m.cardsDue} devidos</div>
    ${archivedLine}
  `;
}

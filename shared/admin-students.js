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

// Fase 6 (ver CLAUDE.md) -- abre/fecha o painel de métricas de um vínculo
// específico. Só busca via RPC (fetchTeacherStudentMetrics,
// shared/student-metrics.js) na PRIMEIRA vez que este vínculo é aberto
// nesta sessão -- STUDENT_METRICS_CACHE evita refazer a chamada em
// cliques seguintes de abrir/fechar.
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
    panel.innerHTML = t('admin.students.metrics.loading');
    STUDENT_METRICS_CACHE[linkId] = await fetchTeacherStudentMetrics(btn.dataset.metricsStudent, btn.dataset.metricsLang);
  }

  panel.style.display = 'block';
  panel.innerHTML = renderStudentMetricsHTML(STUDENT_METRICS_CACHE[linkId]);
}

// Renderiza só o que a function get_teacher_student_metrics devolve --
// tudo agregado, nada de resposta/cartão individual (ver comentário na
// migration 029). `weak`/`medium`/`strong` usam a MESMA classificação de
// vocabStrengthBuckets() (fr/zh app.js) -- não um critério novo.
function renderStudentMetricsHTML(m){
  if (!m){
    return `<p class="profile-empty-note">${t('admin.students.metrics.failed')}</p>`;
  }
  if (!m.teacherCardsTotal){
    return `<p class="profile-empty-note">${t('admin.students.metrics.noCards')}</p>`;
  }
  const daysAgo = m.lastStudyDay
    ? Math.round((Date.parse(todayStr()) - Date.parse(m.lastStudyDay)) / 86400000)
    : null;
  const lastActivityLabel = daysAgo === null ? t('admin.students.metrics.noRecord')
    : daysAgo <= 0 ? t('admin.students.metrics.today')
    : daysAgo === 1 ? t('admin.students.metrics.yesterday')
    : t('admin.students.metrics.daysAgo', { n: daysAgo });
  return `
    <div>${t('admin.students.metrics.lastActivity', { label: lastActivityLabel })}</div>
    <div>${t('admin.students.metrics.cardsCreated', { n: m.teacherCardsActive })}${m.teacherCardsArchived ? t('admin.students.metrics.archivedSuffix', { n: m.teacherCardsArchived }) : ''}</div>
    <div>${t('admin.students.metrics.neverReviewed', { n: m.teacherCardsNeverReviewed })}</div>
    <div>${t('admin.students.metrics.memory', { weak: m.teacherCardsWeak, medium: m.teacherCardsMedium, strong: m.teacherCardsStrong })}</div>
  `;
}

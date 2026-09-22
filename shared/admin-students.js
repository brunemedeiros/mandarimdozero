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
  frances: 'Francês',
  mandarim: 'Chinês',
  portugues: 'Português (em breve)',
};

async function renderAdminStudentsView(){
  const wrap = document.getElementById('admin-students-content');
  if (!wrap) return;
  if (!isAdminUser()){
    wrap.innerHTML = `<p class="profile-empty-note">Esta tela é só pra administração da plataforma.</p>`;
    return;
  }
  wrap.innerHTML = loadingHTML();

  const [students, profiles] = await Promise.all([fetchMyStudents(), fetchAllProfiles()]);

  const usernameOptionsHTML = profiles.map(p => `<option value="${p.username}">@${p.username}${p.display_name ? ` — ${escapeHTML(p.display_name)}` : ''}</option>`).join('');
  const languageOptionsHTML = Object.entries(STUDENT_LANGUAGE_LABELS)
    .map(([key, label]) => `<option value="${key}">${label}</option>`).join('');

  const studentsHTML = students.length ? students.map(s => `
    <div class="admin-badge-row">
      <div class="admin-badge-info">
        <div class="admin-badge-name">@${s.username || '(usuário removido)'}${s.display_name ? ` <span class="admin-grant-badge-name">— ${escapeHTML(s.display_name)}</span>` : ''}</div>
        <div class="admin-badge-desc">${STUDENT_LANGUAGE_LABELS[s.language_app_key] || s.language_app_key} · vinculado em ${new Date(s.created_at).toLocaleDateString('pt-BR')}</div>
      </div>
      <button class="admin-badge-delete-btn" data-toggle-metrics="${s.id}" data-metrics-student="${s.student_id}" data-metrics-lang="${s.language_app_key}" title="Ver métricas">📊</button>
      <button class="admin-badge-delete-btn" data-remove-link="${s.id}" title="Remover vínculo">✕</button>
    </div>
    <div class="admin-badge-desc" id="metrics-link-${s.id}" style="display:none; padding:10px 0 14px;"></div>
  `).join('') : `<p class="profile-empty-note">Nenhum aluno vinculado ainda.</p>`;

  wrap.innerHTML = `
    <div class="profile-section">
      <div class="section-label">Vincular aluno</div>
      <form id="admin-assign-student-form" class="profile-edit-form">
        <label class="profile-edit-label" for="admin-student-username">Conta do aluno</label>
        <select id="admin-student-username" class="profile-edit-input">
          <option value="" disabled ${profiles.length ? 'selected' : ''}>Selecione uma conta...</option>
          ${usernameOptionsHTML}
        </select>
        <label class="profile-edit-label" for="admin-student-language">Idioma</label>
        <select id="admin-student-language" class="profile-edit-input">${languageOptionsHTML}</select>
        <p class="profile-edit-error" id="admin-assign-student-error"></p>
        <button type="submit" class="btn btn-primary btn-block" id="admin-assign-student-btn">Vincular</button>
      </form>
    </div>

    <div class="profile-section">
      <div class="section-label">Seus alunos (${students.length})</div>
      ${studentsHTML}
    </div>
  `;

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
    showToast(`✓ @${result.target.username} vinculado como aluno.`);
    renderAdminStudentsView();
  });

  wrap.querySelectorAll('[data-remove-link]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Remover este vínculo? O progresso e histórico do aluno continuam preservados -- ele só deixa de aparecer na sua lista.')) return;
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
    panel.innerHTML = 'Carregando métricas...';
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
    return '<p class="profile-empty-note">Não foi possível carregar as métricas agora.</p>';
  }
  if (!m.teacherCardsTotal){
    return '<p class="profile-empty-note">Você ainda não criou nenhum cartão pra este aluno, na aba "📇 Flashcards".</p>';
  }
  const daysAgo = m.lastStudyDay
    ? Math.round((Date.parse(todayStr()) - Date.parse(m.lastStudyDay)) / 86400000)
    : null;
  const lastActivityLabel = daysAgo === null ? 'sem registro'
    : daysAgo <= 0 ? 'hoje'
    : daysAgo === 1 ? 'ontem'
    : `${daysAgo} dias atrás`;
  return `
    <div>Última atividade geral: <strong>${lastActivityLabel}</strong></div>
    <div>Cartões que você criou pra ele: <strong>${m.teacherCardsActive} ativos</strong>${m.teacherCardsArchived ? `, ${m.teacherCardsArchived} arquivados` : ''}</div>
    <div>Ainda nunca revisados: <strong>${m.teacherCardsNeverReviewed}</strong></div>
    <div>Memória: <strong>${m.teacherCardsWeak} fracas</strong> · ${m.teacherCardsMedium} medianas · ${m.teacherCardsStrong} fortes</div>
  `;
}

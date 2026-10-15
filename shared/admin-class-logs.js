// ---------- Aulas (painel da professora) ----------
// Diário de aulas no Design System do painel (shared/painel/, classes p-*): lista por mês com filtros e busca, e o
// formulário "Registrar aula" ao lado. Só a professora vê isto (RLS, migration 031): não existe NENHUM caminho para o
// aluno enxergar este conteúdo (o aluno só lê o que a RPC get_my_class_logs libera, sem as notas privadas).
//
// As peças de HTML ficam em shared/teacher-classlogs-ui.js (dado -> string, testadas em Node). Aula em grupo = uma linha
// em teacher_class_logs por aluno; na tela volta a ser UMA aula (ver o comentário lá). Editar/apagar vale para o grupo todo.
//
// Regra herdada (UX-fix 5): mudar a seleção de pessoas, digitar na busca ou trocar filtro NUNCA refaz o formulário (apagaria o
// que a professora digitou): só os pedaços dependentes são atualizados por DOM. Re-render completo só ao abrir a aba.
//
// Depende de (antes de app.js, depois de shared/teacher-classlogs-ui.js):
//   - shared/roles.js              (fetchMyStudents)
//   - shared/teacher-class-logs.js (fetchAllClassLogs, createClassLog, updateClassLog, deleteClassLog, rótulos de Presença)
//   - shared/teacher-students-ui.js (tsuNorm), shared/admin-students.js (CLASSLOGS_VIEW lido pela ficha do aluno)
//   - shared/painel/painel-ui.js   (PainelUI.confirmar), shared/toast.js (showToast), shared/srs.js (todayStr)
//   - languages/<lang>/app.js      (isAdminUser)

const CLASSLOGS_VIEW = {
  links: [], rooms: [], labels: [], groups: [], truncated: false,
  filtros: { aluno: '', curso: '', busca: '' },
  selected: new Set(),
  preselect: null,      // student_id vindo da ficha do aluno: abre filtrado e com a pessoa escolhida
  token: 0, ligado: false,
};

function classLogsWrap(){ return document.getElementById('admin-classlogs-content'); }

// 094: turmas da professora (as mesmas do Mural), em todos os idiomas em que ela tem aluno.
async function fetchClassLogClassrooms(langs){
  const lists = await Promise.all(langs.map(async lang => {
    const { data, error } = await supabaseClient.rpc('mural_list', { p_lang: lang });
    if (error || !data || !data.as_teacher) return [];
    return (data.as_teacher.classrooms || []).map(c => ({ id: c.id, name: c.name, language_app_key: lang, members: c.members || [] }));
  }));
  return lists.flat();
}

function classLogLabelById(id){ return tclLabelById(CLASSLOGS_VIEW.labels, id); }

function classLogsRefreshList(){
  const box = document.querySelector('[data-aulas-lista]');
  if (!box) return;
  box.innerHTML = tclListHTML(tclFilterGroups(CLASSLOGS_VIEW.groups, CLASSLOGS_VIEW.filtros), CLASSLOGS_VIEW.groups.length, CLASSLOGS_VIEW.labels);
}

function classLogsRefreshForm(){
  const chips = document.querySelector('[data-chips]');
  if (chips) chips.innerHTML = tclChipsHTML(CLASSLOGS_VIEW.links, CLASSLOGS_VIEW.rooms, CLASSLOGS_VIEW.selected);
  // as caixas do seletor seguem a seleção (um reset do formulário devolve o estado original delas)
  document.querySelectorAll('[data-escolher-pessoa]').forEach(c => { c.checked = CLASSLOGS_VIEW.selected.has(c.value); });
  const btn = document.getElementById('aula-enviar');
  if (btn){
    const { n, r } = tclSelectionCounts(CLASSLOGS_VIEW.links, CLASSLOGS_VIEW.rooms, CLASSLOGS_VIEW.selected);
    btn.disabled = n + r === 0;
    btn.textContent = n + r ? tclSubmitLabel(n, r) : t('classlogs.form.submitOne');
  }
}

// Busca as aulas de novo e atualiza só a lista (depois de registrar, editar ou apagar).
async function classLogsReload(){
  const r = await fetchAllClassLogs();
  if (r.logs === null) return false;
  CLASSLOGS_VIEW.groups = tclGroupLogs(r.logs, CLASSLOGS_VIEW.links, CLASSLOGS_VIEW.rooms);
  CLASSLOGS_VIEW.truncated = r.truncated;
  classLogsRefreshList();
  return true;
}

async function renderAdminClassLogsView(){
  const wrap = classLogsWrap();
  if (!wrap) return;
  if (!isTeacherUser()){
    wrap.innerHTML = `<p class="profile-empty-note">${t('admin.common.adminOnly')}</p>`;
    return;
  }
  classLogsBind(wrap);
  const token = ++CLASSLOGS_VIEW.token;
  wrap.innerHTML = tclLoadingHTML();
  const [links, r, labels] = await Promise.all([fetchMyStudents(), fetchAllClassLogs(), fetchAttendanceLabels()]);
  if (token !== CLASSLOGS_VIEW.token) return;
  if (!links.length){ wrap.innerHTML = tclNoStudentsHTML(); return; }
  if (r.logs === null){
    wrap.innerHTML = `<div class="painel"><div class="p-pagina"><div class="p-alerta p-alerta--erro" role="alert"><span>${escapeHTML(t('classlogs.fail'))}</span></div></div></div>`;
    return;
  }
  const V = CLASSLOGS_VIEW;
  const rooms = await fetchClassLogClassrooms([...new Set(links.map(l => l.language_app_key))]);
  if (token !== CLASSLOGS_VIEW.token) return;
  V.links = links; V.rooms = rooms; V.labels = labels || []; V.groups = tclGroupLogs(r.logs, links, rooms); V.truncated = r.truncated;
  // Seleção vazia é um estado válido (nunca cai de volta para o primeiro aluno); some só quem deixou de ser aluno ou turma.
  const valid = new Set(links.map(l => tclLinkKey(l.student_id, l.language_app_key)).concat(rooms.map(c => tclRoomKey(c.id))));
  V.selected = new Set([...V.selected].filter(k => valid.has(k)));
  if (V.preselect){
    V.filtros.aluno = V.preselect;
    V.selected = new Set(links.filter(l => l.student_id === V.preselect).map(l => tclLinkKey(l.student_id, l.language_app_key)));
    V.preselect = null;
  } else if (V.filtros.aluno && !links.some(l => l.student_id === V.filtros.aluno)) V.filtros.aluno = '';
  wrap.innerHTML = tclPageHTML({ links, rooms, labels: V.labels, groups: V.groups, filtros: V.filtros, selected: V.selected, today: todayStr() });
  renderNotionReviewBox(wrap.querySelector('[data-aulas-notion]'));
}

async function classLogsRegister(form){
  const V = CLASSLOGS_VIEW;
  const errorEl = document.getElementById('aula-erro'), btn = document.getElementById('aula-enviar');
  errorEl.textContent = '';
  const chosen = V.links.filter(l => V.selected.has(tclLinkKey(l.student_id, l.language_app_key)));
  const chosenRooms = V.rooms.filter(c => V.selected.has(tclRoomKey(c.id)));
  if (!chosen.length && !chosenRooms.length){ errorEl.textContent = t('classlogs.form.needStudent'); return; }
  const ex = readClassLogExtras(form, 'new');
  const body = { classDate: document.getElementById('aula-data').value, topic: document.getElementById('aula-topico').value, homework: document.getElementById('aula-licao').value,
    observations: document.getElementById('aula-obs').value, notes: document.getElementById('aula-notas').value, attendanceLabelId: ex.attendanceLabelId, skills: ex.skills };
  btn.disabled = true;
  // Uma linha por aluno com o mesmo conteúdo (aula em grupo) e UMA linha por turma (sem aluno). As gravações saem juntas: ficam com
  // created_at quase igual, e é isso que a lista usa para juntar as linhas dos alunos de novo em uma aula só.
  const results = await Promise.all(chosen.map(l => createClassLog(Object.assign({ studentId: l.student_id, languageAppKey: l.language_app_key }, body)))
    .concat(chosenRooms.map(c => createClassLog(Object.assign({ classroomId: c.id, languageAppKey: c.language_app_key }, body)))));
  btn.disabled = false;
  const okN = results.filter(r => r.ok).length;
  if (!okN){ errorEl.textContent = results[0].error; return; }
  if (okN < results.length) errorEl.textContent = t('classlogs.form.partial', { ok: okN, total: results.length });
  else {
    showToast(okN > 1 ? t('admin.classLogs.registeredN', { n: okN }) : t('admin.classLogs.registered'));
    form.reset(); document.getElementById('aula-data').value = todayStr();   // mantém as pessoas escolhidas (várias aulas seguidas)
  }
  await classLogsReload();
  classLogsRefreshForm();
}

function classLogsOpenEdit(gid){
  const g = CLASSLOGS_VIEW.groups.find(x => String(x.gid) === String(gid));
  const wrap = classLogsWrap(); if (!g || !wrap) return;
  const old = document.getElementById('dlg-editar-aula'); if (old) old.remove();
  const holder = wrap.querySelector('.painel') || wrap;
  holder.insertAdjacentHTML('beforeend', tclEditDialogHTML(g, CLASSLOGS_VIEW.labels));
  const d = document.getElementById('dlg-editar-aula');
  d.addEventListener('close', () => d.remove());
  d.showModal();
}

async function classLogsSaveEdit(form){
  const g = CLASSLOGS_VIEW.groups.find(x => String(x.gid) === String(form.dataset.gid));
  const errorEl = document.getElementById('editar-erro'); errorEl.textContent = '';
  if (!g) return;
  const ex = readClassLogExtras(form, 'editar');
  const body = { classDate: document.getElementById('editar-data').value, topic: document.getElementById('editar-topico').value, homework: document.getElementById('editar-licao').value,
    observations: document.getElementById('editar-obs').value, notes: document.getElementById('editar-notas').value, attendanceLabelId: ex.attendanceLabelId, skills: ex.skills };
  const results = await Promise.all(g.logs.map(l => updateClassLog(l.id, body)));
  const bad = results.find(r => !r.ok);
  if (bad){ errorEl.textContent = bad.error; return; }
  document.getElementById('dlg-editar-aula').close();
  showToast(t('admin.classLogs.updated'));
  await classLogsReload();
}

async function classLogsDelete(gid){
  const g = CLASSLOGS_VIEW.groups.find(x => String(x.gid) === String(gid));
  if (!g) return;
  const n = g.logs.length;
  const opts = { titulo: t('classlogs.delete.title'), descricao: n > 1 ? t('classlogs.delete.textGroup', { n }) : t('classlogs.delete.text'), confirmar: t('classlogs.delete.confirm'), cancelar: t('classlogs.edit.cancel'), perigo: true };
  const ok = (window.PainelUI && PainelUI.confirmar) ? await PainelUI.confirmar(opts) : confirm(opts.descricao);
  if (!ok) return;
  await Promise.all(g.logs.map(l => deleteClassLog(l.id)));
  showToast(t('admin.classLogs.deleted'));
  await classLogsReload();
}

// Eventos delegados no contêiner da aba: ligados uma vez só.
function classLogsBind(wrap){
  if (CLASSLOGS_VIEW.ligado) return;
  CLASSLOGS_VIEW.ligado = true;
  wireAttendancePicker(wrap);
  const V = CLASSLOGS_VIEW;
  wrap.addEventListener('click', (e) => {
    let el;
    if ((el = e.target.closest('[data-editar-aula]'))){ el.closest('details')?.removeAttribute('open'); return classLogsOpenEdit(el.dataset.editarAula); }
    if ((el = e.target.closest('[data-apagar-aula]'))){ el.closest('details')?.removeAttribute('open'); return classLogsDelete(el.dataset.apagarAula); }
    if ((el = e.target.closest('[data-tirar-pessoa]'))){
      V.selected.delete(el.dataset.tirarPessoa);
      const cb = [...wrap.querySelectorAll('[data-escolher-pessoa]')].find(c => c.value === el.dataset.tirarPessoa); if (cb) cb.checked = false;
      return classLogsRefreshForm();
    }
    if ((el = e.target.closest('[data-ir-secao]'))){ e.preventDefault(); return switchTeacherPanelSection(el.dataset.irSecao); }
  });
  wrap.addEventListener('input', (e) => {
    if (e.target.matches('[data-aulas-busca]')){ V.filtros.busca = e.target.value; classLogsRefreshList(); }
    else if (e.target.matches('[data-buscar-pessoa]')){
      const q = tsuNorm(e.target.value).trim();
      wrap.querySelectorAll('[data-pessoa], [data-turma]').forEach(l => { l.hidden = !!q && !l.dataset.busca.includes(q); });
    }
  });
  wrap.addEventListener('change', (e) => {
    if (e.target.matches('[data-aulas-aluno]')){ V.filtros.aluno = e.target.value; classLogsRefreshList(); }
    else if (e.target.matches('[data-aulas-curso]')){ V.filtros.curso = e.target.value; classLogsRefreshList(); }
    else if (e.target.matches('[data-escolher-pessoa]')){
      if (e.target.checked) V.selected.add(e.target.value); else V.selected.delete(e.target.value);
      classLogsRefreshForm();
    }
  });
  wrap.addEventListener('reset', () => setTimeout(classLogsRefreshForm, 0));
  wrap.addEventListener('submit', (e) => {
    if (e.target.id === 'form-aula'){ e.preventDefault(); classLogsRegister(e.target); }
    else if (e.target.id === 'form-editar-aula'){ e.preventDefault(); classLogsSaveEdit(e.target); }
  });
}

// ---------- Presença no estilo do Notion (094) ----------
// Escolha + criar digitando + "⋯" (nome, cor, arquivar) dentro do próprio campo. Mexer num rótulo atualiza só os seletores
// (DOM), nunca o formulário em que a professora está digitando.
function readClassLogExtras(root, prefix){
  const box = root.querySelector(`[data-class-log-extras="${prefix}"]`);
  if (!box) return { attendanceLabelId: null, skills: [] };
  const att = box.querySelector(`input[name="${prefix}-att"]:checked`);
  return { attendanceLabelId: att && att.value ? att.value : null, skills: [...box.querySelectorAll('input[data-skill]:checked')].map(i => i.value) };
}

// Cor do rótulo novo: a primeira da lista que a professora ainda não usa (como o Notion, que varia as cores).
function nextAttendanceColor(){
  const labels = CLASSLOGS_VIEW.labels || [];
  const used = new Set(labels.filter(l => !l.archived).map(l => l.color));
  return CLASS_ATTENDANCE_COLORS.find(c => !used.has(c)) || CLASS_ATTENDANCE_COLORS[labels.length % CLASS_ATTENDANCE_COLORS.length];
}

// Re-renderiza só os chips de Presença (todos os formulários abertos), mantendo a escolha de cada um.
function refreshAttendanceChoices(selectIn){
  document.querySelectorAll('[data-att-choices]').forEach(box => {
    const prefix = box.dataset.attChoices;
    const checked = box.querySelector(`input[name="${prefix}-att"]:checked`);
    let current = checked ? checked.value : '';
    if (selectIn && selectIn.prefix === prefix) current = String(selectIn.id);
    // Aula nova não nasce com rótulo arquivado; aula já registrada mantém o dela.
    if (prefix === 'new' && current && (classLogLabelById(current) || {}).archived) current = '';
    box.innerHTML = tclPresencaHTML(prefix, CLASSLOGS_VIEW.labels, current);
  });
  classLogsRefreshList();
}

// Delegação no contêiner da aba (ligada uma vez): vale para "Registrar aula" e para a janela de edição.
function wireAttendancePicker(wrap){
  const V = CLASSLOGS_VIEW;
  const menuOf = (el) => el.closest('[data-class-log-extras]')?.querySelector('[data-att-menu]');
  const reload = async () => { V.labels = (await fetchAttendanceLabels()) || []; };
  const saveLabel = async (l, patch, errEl) => {
    const res = await saveAttendanceLabel(Object.assign({ id: l.id, name: l.name, color: l.color, countsAs: l.counts_as, archived: l.archived }, patch));
    if (!res.ok){ if (errEl) errEl.textContent = res.error; return false; }
    await reload(); refreshAttendanceChoices();
    return true;
  };
  wrap.addEventListener('click', async (e) => {
    const more = e.target.closest('[data-att-more]');
    if (more){
      const l = classLogLabelById(more.dataset.attMore), menu = menuOf(more);
      if (!l || !menu) return;
      menu.innerHTML = tclMenuRotuloHTML(l); menu.hidden = false;
      menu.querySelector('[data-att-rename]').focus();
      return;
    }
    const box = e.target.closest('[data-att-menu-label]');
    if (!box) return;
    const l = classLogLabelById(box.dataset.attMenuLabel), menu = box.closest('[data-att-menu]'), errEl = box.querySelector('[data-att-error]');
    const sw = e.target.closest('[data-att-color]');
    if (sw && l){
      if (await saveLabel(l, { color: sw.dataset.attColor }, errEl)) box.querySelectorAll('[data-att-color]').forEach(b => b.setAttribute('aria-pressed', String(b === sw)));
    } else if (e.target.closest('[data-att-archive]') && l){
      if (await saveLabel(l, { archived: true }, errEl)){ menu.hidden = true; menu.innerHTML = ''; }
    } else if (e.target.closest('[data-att-close]')){
      const input = box.querySelector('[data-att-rename]');
      if (l && input.value.trim() && input.value.trim() !== l.name && !(await saveLabel(l, { name: input.value }, errEl))) return;
      menu.hidden = true; menu.innerHTML = '';
    }
  });
  wrap.addEventListener('keydown', async (e) => {
    if (e.key !== 'Enter') return;
    const rename = e.target.closest('[data-att-rename]');
    if (rename){
      e.preventDefault();
      const box = rename.closest('[data-att-menu-label]'), l = classLogLabelById(box.dataset.attMenuLabel);
      if (l && rename.value.trim() && rename.value.trim() !== l.name) await saveLabel(l, { name: rename.value }, box.querySelector('[data-att-error]'));
      return;
    }
    const create = e.target.closest('[data-att-new]');
    if (!create) return;
    e.preventDefault();   // Enter no campo cria o rótulo, nunca envia o formulário da aula
    const name = create.value.trim(), prefix = create.dataset.attNew;
    if (!name) return;
    const res = await saveAttendanceLabel({ name, color: nextAttendanceColor(), countsAs: 'other', sortOrder: (V.labels || []).length + 1 });
    if (!res.ok){ showToast(res.error); return; }
    create.value = '';
    await reload();
    const made = (V.labels || []).find(l => l.name === name.slice(0, 40));
    refreshAttendanceChoices(made ? { prefix, id: made.id } : null);
  });
}

// ---------- Revisar do Notion (importação de 2026-10-15) ----------
// Tópicos que podiam ter anotação pessoal entraram SÓ nas Anotações (privadas), marcados com "[Notion] ". Aqui a professora
// edita o texto e decide: "Mostrar ao aluno" (vira Tópico ou Para a próxima aula; o original continua nas Anotações, sem a
// marca) ou "Deixar só para mim". Visual ainda o da tela antiga (a prévia no Design System espera aprovação da autora).
const NOTION_MARK = '[Notion] ';
const NOTION_HW_MARK = '[Notion] Para a próxima aula: ';

function notionReviewParts(notes){
  return String(notes || '').split('\n').filter(l => l.startsWith(NOTION_MARK)).map(l => l.startsWith(NOTION_HW_MARK)
    ? { field: 'homework', text: l.slice(NOTION_HW_MARK.length) }
    : { field: 'topic', text: l.slice(NOTION_MARK.length) });
}
function notionCleanNotes(notes){
  return String(notes || '').split('\n').map(l => l.startsWith(NOTION_HW_MARK) ? `Para a próxima aula: ${l.slice(NOTION_HW_MARK.length)}` : l.startsWith(NOTION_MARK) ? l.slice(NOTION_MARK.length) : l).join('\n').trim() || null;
}

async function fetchNotionReviewLogs(){
  if (!CURRENT_USER) return [];
  const { data, error } = await supabaseClient.from('teacher_class_logs')
    .select('id, student_id, classroom_id, class_date, topic, homework, notes')
    .eq('teacher_id', CURRENT_USER.id).like('notes', '[Notion]%')
    .order('class_date', { ascending: true });
  if (error){ console.error('Erro ao carregar aulas para revisar:', error); return []; }
  return (data || []).filter(l => String(l.notes || '').startsWith('[Notion]'));
}

function notionReviewWho(log){
  if (log.classroom_id){
    const c = CLASSLOGS_VIEW.rooms.find(x => String(x.id) === String(log.classroom_id));
    return `👥 ${escapeHTML(c ? c.name : '?')}`;
  }
  const l = CLASSLOGS_VIEW.links.find(x => x.student_id === log.student_id);
  return l ? escapeHTML(tclName(l)) : '?';
}

function notionReviewItemHTML(log){
  return `
    <div class="notion-review-item" data-notion-review="${log.id}">
      <div class="admin-badge-name">${notionReviewWho(log)} · ${fmtDate(new Date(`${log.class_date}T00:00:00`))}</div>
      ${notionReviewParts(log.notes).map((p, i) => `
        <label class="profile-edit-label" for="notion-rv-${log.id}-${i}">${p.field === 'homework' ? t('panel.classLog.review.toHomework') : t('panel.classLog.review.toTopic')}</label>
        <textarea id="notion-rv-${log.id}-${i}" class="profile-edit-input" rows="2" data-notion-field="${p.field}">${escapeHTML(p.text)}</textarea>`).join('')}
      <div class="notion-review-actions">
        <button type="button" class="btn btn-primary" data-notion-show="${log.id}">${t('panel.classLog.review.show')}</button>
        <button type="button" class="btn btn-secondary" data-notion-keep="${log.id}">${t('panel.classLog.review.keep')}</button>
      </div>
    </div>`;
}

async function renderNotionReviewBox(host){
  if (!host) return;
  const logs = await fetchNotionReviewLogs();
  if (!logs.length){ host.innerHTML = ''; return; }
  host.innerHTML = `
    <details class="profile-section notion-review" ${host.dataset.open === '0' ? '' : 'open'}>
      <summary class="section-label">${escapeHTML(tp('panel.classLog.review.title', logs.length))}</summary>
      <p class="profile-edit-hint">${t('panel.classLog.review.hint')}</p>
      ${logs.map(notionReviewItemHTML).join('')}
    </details>`;
  host.querySelector('details').addEventListener('toggle', (e) => { host.dataset.open = e.target.open ? '1' : '0'; });
  const finish = async (log, showToStudent, item) => {
    const patch = { notes: notionCleanNotes(log.notes), updated_at: new Date().toISOString() };
    if (showToStudent){
      item.querySelectorAll('[data-notion-field]').forEach(tx => {
        const v = tx.value.trim();
        if (!v) return;
        const f = tx.dataset.notionField;
        const cur = (f === 'topic' ? log.topic : log.homework) || '';
        patch[f] = cur ? `${cur}\n${v}` : v;
      });
    }
    const { error } = await supabaseClient.from('teacher_class_logs').update(patch).eq('id', log.id);
    if (error){ console.error('Erro ao revisar aula:', error); showToast(t('teacherLogs.err.saveFailed')); return; }
    showToast(showToStudent ? t('panel.classLog.review.shown') : t('panel.classLog.review.kept'));
    await renderNotionReviewBox(host);
    await classLogsReload();
  };
  logs.forEach(log => {
    const item = host.querySelector(`[data-notion-review="${log.id}"]`);
    item.querySelector('[data-notion-show]').addEventListener('click', () => finish(log, true, item));
    item.querySelector('[data-notion-keep]').addEventListener('click', () => finish(log, false, item));
  });
}

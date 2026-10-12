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
//   - shared/teacher-class-logs.js (fetchAllClassLogs, createClassLog, updateClassLog, deleteClassLog)
//   - shared/teacher-students-ui.js (tsuNorm), shared/admin-students.js (CLASSLOGS_VIEW lido pela ficha do aluno)
//   - shared/painel/painel-ui.js   (PainelUI.confirmar), shared/toast.js (showToast), shared/srs.js (todayStr)
//   - languages/<lang>/app.js      (isAdminUser)

const CLASSLOGS_VIEW = {
  links: [], groups: [], truncated: false,
  filtros: { aluno: '', curso: '', busca: '' },
  selected: new Set(),
  preselect: null,      // student_id vindo da ficha do aluno: abre filtrado e com a pessoa escolhida
  token: 0, ligado: false,
};

function classLogsWrap(){ return document.getElementById('admin-classlogs-content'); }

function classLogsRefreshList(){
  const box = document.querySelector('[data-aulas-lista]');
  if (!box) return;
  box.innerHTML = tclListHTML(tclFilterGroups(CLASSLOGS_VIEW.groups, CLASSLOGS_VIEW.filtros), CLASSLOGS_VIEW.groups.length);
}

function classLogsRefreshForm(){
  const chips = document.querySelector('[data-chips]');
  if (chips) chips.innerHTML = tclChipsHTML(CLASSLOGS_VIEW.links, CLASSLOGS_VIEW.selected);
  // as caixas do seletor seguem a seleção (um reset do formulário devolve o estado original delas)
  document.querySelectorAll('[data-escolher-pessoa]').forEach(c => { c.checked = CLASSLOGS_VIEW.selected.has(c.value); });
  const btn = document.getElementById('aula-enviar');
  if (btn){
    const n = CLASSLOGS_VIEW.selected.size;
    btn.disabled = n === 0;
    btn.textContent = n ? tclSubmitLabel(n) : t('classlogs.form.submitOne');
  }
}

// Busca as aulas de novo e atualiza só a lista (depois de registrar, editar ou apagar).
async function classLogsReload(){
  const r = await fetchAllClassLogs();
  if (r.logs === null) return false;
  CLASSLOGS_VIEW.groups = tclGroupLogs(r.logs, CLASSLOGS_VIEW.links);
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
  const [links, r] = await Promise.all([fetchMyStudents(), fetchAllClassLogs()]);
  if (token !== CLASSLOGS_VIEW.token) return;
  if (!links.length){ wrap.innerHTML = tclNoStudentsHTML(); return; }
  if (r.logs === null){
    wrap.innerHTML = `<div class="painel"><div class="p-pagina"><div class="p-alerta p-alerta--erro" role="alert"><span>${escapeHTML(t('classlogs.fail'))}</span></div></div></div>`;
    return;
  }
  const V = CLASSLOGS_VIEW;
  V.links = links; V.groups = tclGroupLogs(r.logs, links); V.truncated = r.truncated;
  // Seleção vazia é um estado válido (nunca cai de volta para o primeiro aluno); some só quem deixou de ser aluno.
  const valid = new Set(links.map(l => tclLinkKey(l.student_id, l.language_app_key)));
  V.selected = new Set([...V.selected].filter(k => valid.has(k)));
  if (V.preselect){
    V.filtros.aluno = V.preselect;
    V.selected = new Set(links.filter(l => l.student_id === V.preselect).map(l => tclLinkKey(l.student_id, l.language_app_key)));
    V.preselect = null;
  } else if (V.filtros.aluno && !links.some(l => l.student_id === V.filtros.aluno)) V.filtros.aluno = '';
  wrap.innerHTML = tclPageHTML({ links, groups: V.groups, filtros: V.filtros, selected: V.selected, today: todayStr() });
}

async function classLogsRegister(form){
  const V = CLASSLOGS_VIEW;
  const errorEl = document.getElementById('aula-erro'), btn = document.getElementById('aula-enviar');
  errorEl.textContent = '';
  const chosen = V.links.filter(l => V.selected.has(tclLinkKey(l.student_id, l.language_app_key)));
  if (!chosen.length){ errorEl.textContent = t('classlogs.form.needStudent'); return; }
  const body = { classDate: document.getElementById('aula-data').value, topic: document.getElementById('aula-topico').value, homework: document.getElementById('aula-licao').value,
    observations: document.getElementById('aula-obs').value, notes: document.getElementById('aula-notas').value };
  btn.disabled = true;
  // Uma linha por aluno com o mesmo conteúdo (aula em grupo). As gravações saem juntas: ficam com created_at quase igual,
  // e é isso que a lista usa para juntá-los de novo em uma aula só.
  const results = await Promise.all(chosen.map(l => createClassLog(Object.assign({ studentId: l.student_id, languageAppKey: l.language_app_key }, body))));
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
  holder.insertAdjacentHTML('beforeend', tclEditDialogHTML(g));
  const d = document.getElementById('dlg-editar-aula');
  d.addEventListener('close', () => d.remove());
  d.showModal();
}

async function classLogsSaveEdit(form){
  const g = CLASSLOGS_VIEW.groups.find(x => String(x.gid) === String(form.dataset.gid));
  const errorEl = document.getElementById('editar-erro'); errorEl.textContent = '';
  if (!g) return;
  const body = { classDate: document.getElementById('editar-data').value, topic: document.getElementById('editar-topico').value, homework: document.getElementById('editar-licao').value,
    observations: document.getElementById('editar-obs').value, notes: document.getElementById('editar-notas').value };
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
      wrap.querySelectorAll('[data-pessoa]').forEach(l => { l.hidden = !!q && !l.dataset.busca.includes(q); });
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

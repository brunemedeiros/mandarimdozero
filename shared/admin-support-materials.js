// ---------- Material de apoio (painel da professora) ----------
// Autoria de material de apoio no Design System do painel (shared/painel/, classes p-*): lista por mês de envio com filtros e
// busca, e o formulário "Enviar material" ao lado. Texto, link e arquivo são opcionais cada um, mas pelo menos um é exigido.
// Este conteúdo NUNCA entra em STATE.cards/FSRS (não é para memorizar); a aluna vê o que foi enviado a ela na tela
// shared/support-materials-view.js.
//
// As peças de HTML ficam em shared/teacher-materials-ui.js (dado -> string, testadas em Node). Um envio a várias pessoas =
// uma linha em teacher_support_materials por aluno; na tela volta a ser UM material (ver o comentário lá). Editar/apagar vale
// para o envio todo. Editar não troca o arquivo (decisão antiga). Apagar não remove o arquivo do Storage (também antigo).
//
// Regra herdada (UX-fix 5): mudar a seleção de pessoas, digitar na busca ou trocar filtro NUNCA refaz o formulário (apagaria o
// que a professora digitou): só os pedaços dependentes são atualizados por DOM. Re-render completo só ao abrir a aba.
//
// Depende de (antes de app.js, depois de shared/teacher-materials-ui.js):
//   - shared/roles.js                        (fetchMyStudents)
//   - shared/teacher-support-materials.js    (fetchAllSupportMaterials, createSupportMaterial, updateSupportMaterial, deleteSupportMaterial, uploadSupportMaterialFile)
//   - shared/teacher-students-ui.js (tsuNorm), shared/painel/painel-ui.js (PainelUI.confirmar, PainelUI.anexo), shared/toast.js (showToast)
//   - languages/<lang>/app.js                (isTeacherUser)

const MATERIALS_VIEW = {
  links: [], groups: [], truncated: false,
  filtros: { aluno: '', curso: '', busca: '' },
  selected: new Set(),
  token: 0, ligado: false, enviando: false,
};

function materialsWrap(){ return document.getElementById('admin-materials-content'); }

function materialsRefreshList(){
  const box = document.querySelector('[data-materiais-lista]');
  if (!box) return;
  box.innerHTML = tmtListHTML(tmtFilterGroups(MATERIALS_VIEW.groups, MATERIALS_VIEW.filtros), MATERIALS_VIEW.groups.length);
}

function materialsRefreshForm(){
  const chips = document.querySelector('#form-material [data-chips]');
  if (chips) chips.innerHTML = tmtChipsHTML(MATERIALS_VIEW.links, MATERIALS_VIEW.selected);
  document.querySelectorAll('[data-escolher-pessoa]').forEach(c => { c.checked = MATERIALS_VIEW.selected.has(c.value); });
  const btn = document.getElementById('material-enviar');
  if (btn){
    const n = MATERIALS_VIEW.selected.size;
    btn.disabled = n === 0 || MATERIALS_VIEW.enviando;
    btn.textContent = n ? tmtSubmitLabel(n) : t('materials.form.submitOne');
  }
}

// O arquivo escolhido aparece como anexo (com X para tirar); a escolha em si continua no campo de arquivo, que some enquanto há um.
function materialsShowFile(){
  const input = document.getElementById('material-arquivo'), list = document.querySelector('[data-material-anexo]'), box = document.querySelector('[data-material-arquivo]');
  if (!input || !list || !box) return;
  list.innerHTML = '';
  const f = input.files && input.files[0];
  const erro = document.getElementById('material-erro');
  if (f && f.size > TMT_MAX_FILE_BYTES){
    input.value = ''; if (erro) erro.textContent = t('materials.form.fileTooBig'); box.hidden = false; return;
  }
  box.hidden = !!f;
  if (!f) return;
  if (erro) erro.textContent = '';
  PainelUI.anexo(list, { nome: f.name, detalhe: tmtSize(f.size), aoRemover: () => { input.value = ''; box.hidden = false; } });
}

// Busca os materiais de novo e atualiza só a lista (depois de enviar, editar ou apagar).
async function materialsReload(){
  const r = await fetchAllSupportMaterials();
  if (r.rows === null) return false;
  MATERIALS_VIEW.groups = tmtGroupMaterials(r.rows, MATERIALS_VIEW.links);
  MATERIALS_VIEW.truncated = r.truncated;
  materialsRefreshList();
  return true;
}

async function renderAdminSupportMaterialsView(){
  const wrap = materialsWrap();
  if (!wrap) return;
  if (!isTeacherUser()){
    wrap.innerHTML = `<p class="profile-empty-note">${t('admin.common.adminOnly')}</p>`;
    return;
  }
  materialsBind(wrap);
  const token = ++MATERIALS_VIEW.token;
  wrap.innerHTML = tmtLoadingHTML();
  const [links, r] = await Promise.all([fetchMyStudents(), fetchAllSupportMaterials()]);
  if (token !== MATERIALS_VIEW.token) return;
  if (!links.length){ wrap.innerHTML = tmtNoStudentsHTML(); return; }
  if (r.rows === null){
    wrap.innerHTML = `<div class="painel"><div class="p-pagina"><div class="p-alerta p-alerta--erro" role="alert"><span>${escapeHTML(t('materials.fail'))}</span></div></div></div>`;
    return;
  }
  const V = MATERIALS_VIEW;
  V.links = links; V.groups = tmtGroupMaterials(r.rows, links); V.truncated = r.truncated;
  // Seleção vazia é um estado válido; some só quem deixou de ser aluno.
  const valid = new Set(links.map(l => tmtLinkKey(l.student_id, l.language_app_key)));
  V.selected = new Set([...V.selected].filter(k => valid.has(k)));
  if (V.filtros.aluno && !links.some(l => l.student_id === V.filtros.aluno)) V.filtros.aluno = '';
  wrap.innerHTML = tmtPageHTML({ links, groups: V.groups, filtros: V.filtros, selected: V.selected });
}

async function materialsSend(form){
  const V = MATERIALS_VIEW;
  if (V.enviando) return;
  const errorEl = document.getElementById('material-erro'), btn = document.getElementById('material-enviar');
  errorEl.textContent = '';
  const chosen = V.links.filter(l => V.selected.has(tmtLinkKey(l.student_id, l.language_app_key)));
  if (!chosen.length){ errorEl.textContent = t('materials.form.needStudent'); return; }
  const title = document.getElementById('material-titulo').value, description = document.getElementById('material-desc').value, linkUrl = document.getElementById('material-link').value;
  // Valida antes de subir o arquivo (não deixa arquivo órfão no Storage por um erro de digitação).
  if (!title.trim()){ errorEl.textContent = t('teacherMaterials.err.titleRequired'); return; }
  const file = document.getElementById('material-arquivo').files[0];
  if (!description.trim() && !linkUrl.trim() && !file){ errorEl.textContent = t('teacherMaterials.err.needContent'); return; }
  if (linkUrl.trim() && !isHttpUrl(linkUrl)){ errorEl.textContent = t('teacherMaterials.err.badLink'); return; }
  V.enviando = true; btn.disabled = true; btn.setAttribute('aria-busy', 'true');
  let fileUrl = null, fileName = null;
  if (file){
    const up = await uploadSupportMaterialFile(file);
    if (!up.ok){ V.enviando = false; btn.removeAttribute('aria-busy'); materialsRefreshForm(); errorEl.textContent = up.error; return; }
    fileUrl = up.url; fileName = up.fileName;
  }
  // Uma linha por aluno com o mesmo conteúdo (o arquivo sobe uma vez só). Saem juntas: ficam com created_at quase igual,
  // e é isso que a lista usa para juntá-las de novo em um envio só.
  const results = await Promise.all(chosen.map(l => createSupportMaterial({ studentId: l.student_id, languageAppKey: l.language_app_key, title, description, linkUrl, fileUrl, fileName })));
  V.enviando = false; btn.removeAttribute('aria-busy');
  const okN = results.filter(r => r.ok).length;
  if (!okN){ materialsRefreshForm(); errorEl.textContent = results[0].error; return; }
  if (okN < results.length) errorEl.textContent = t('materials.form.partial', { ok: okN, total: results.length });
  else {
    showToast(okN > 1 ? t('admin.materials.sentN', { n: okN }) : t('admin.materials.sent'));
    form.reset(); materialsShowFile();   // mantém as pessoas escolhidas (vários materiais seguidos)
  }
  await materialsReload();
  materialsRefreshForm();
}

function materialsOpenEdit(gid){
  const g = MATERIALS_VIEW.groups.find(x => String(x.gid) === String(gid));
  const wrap = materialsWrap(); if (!g || !wrap) return;
  const old = document.getElementById('dlg-editar-material'); if (old) old.remove();
  const holder = wrap.querySelector('.painel') || wrap;
  holder.insertAdjacentHTML('beforeend', tmtEditDialogHTML(g));
  const d = document.getElementById('dlg-editar-material');
  d.addEventListener('close', () => d.remove());
  d.showModal();
}

async function materialsSaveEdit(form){
  const g = MATERIALS_VIEW.groups.find(x => String(x.gid) === String(form.dataset.gid));
  const errorEl = document.getElementById('editar-erro'); errorEl.textContent = '';
  if (!g) return;
  const body = { title: document.getElementById('editar-titulo').value, description: document.getElementById('editar-desc').value, linkUrl: document.getElementById('editar-link').value };
  if (!body.description.trim() && !body.linkUrl.trim() && !g.file_url){ errorEl.textContent = t('teacherMaterials.err.needContent'); return; }
  const results = await Promise.all(g.rows.map(m => updateSupportMaterial(m.id, body)));
  const bad = results.find(r => !r.ok);
  if (bad){ errorEl.textContent = bad.error; return; }
  document.getElementById('dlg-editar-material').close();
  showToast(t('admin.materials.updated'));
  await materialsReload();
}

async function materialsDelete(gid){
  const g = MATERIALS_VIEW.groups.find(x => String(x.gid) === String(gid));
  if (!g) return;
  const n = g.rows.length;
  const opts = { titulo: t('materials.delete.title'), descricao: n > 1 ? t('materials.delete.textGroup', { n }) : t('materials.delete.text'), confirmar: t('materials.delete.confirm'), cancelar: t('materials.edit.cancel'), perigo: true };
  const ok = (window.PainelUI && PainelUI.confirmar) ? await PainelUI.confirmar(opts) : confirm(opts.descricao);
  if (!ok) return;
  await Promise.all(g.rows.map(m => deleteSupportMaterial(m.id)));
  showToast(t('admin.materials.deleted'));
  await materialsReload();
}

// Eventos delegados no contêiner da aba: ligados uma vez só.
function materialsBind(wrap){
  if (MATERIALS_VIEW.ligado) return;
  MATERIALS_VIEW.ligado = true;
  const V = MATERIALS_VIEW;
  wrap.addEventListener('click', (e) => {
    let el;
    if ((el = e.target.closest('[data-editar-material]'))){ el.closest('details')?.removeAttribute('open'); return materialsOpenEdit(el.dataset.editarMaterial); }
    if ((el = e.target.closest('[data-apagar-material]'))){ el.closest('details')?.removeAttribute('open'); return materialsDelete(el.dataset.apagarMaterial); }
    if ((el = e.target.closest('[data-tirar-pessoa]'))){
      V.selected.delete(el.dataset.tirarPessoa);
      const cb = [...wrap.querySelectorAll('[data-escolher-pessoa]')].find(c => c.value === el.dataset.tirarPessoa); if (cb) cb.checked = false;
      return materialsRefreshForm();
    }
    if ((el = e.target.closest('[data-ir-secao]'))){ e.preventDefault(); return switchTeacherPanelSection(el.dataset.irSecao); }
  });
  wrap.addEventListener('input', (e) => {
    if (e.target.matches('[data-materiais-busca]')){ V.filtros.busca = e.target.value; materialsRefreshList(); }
    else if (e.target.matches('[data-buscar-pessoa]')){
      const q = tsuNorm(e.target.value).trim();
      wrap.querySelectorAll('[data-pessoa]').forEach(l => { l.hidden = !!q && !l.dataset.busca.includes(q); });
    }
  });
  wrap.addEventListener('change', (e) => {
    if (e.target.matches('[data-materiais-aluno]')){ V.filtros.aluno = e.target.value; materialsRefreshList(); }
    else if (e.target.matches('[data-materiais-curso]')){ V.filtros.curso = e.target.value; materialsRefreshList(); }
    else if (e.target.matches('[data-escolher-pessoa]')){
      if (e.target.checked) V.selected.add(e.target.value); else V.selected.delete(e.target.value);
      materialsRefreshForm();
    } else if (e.target.matches('#material-arquivo')) materialsShowFile();
  });
  wrap.addEventListener('reset', () => setTimeout(() => { materialsRefreshForm(); materialsShowFile(); }, 0));
  wrap.addEventListener('submit', (e) => {
    if (e.target.id === 'form-material'){ e.preventDefault(); materialsSend(e.target); }
    else if (e.target.id === 'form-editar-material'){ e.preventDefault(); materialsSaveEdit(e.target); }
  });
}

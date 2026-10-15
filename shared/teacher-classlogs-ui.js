// ---------- Aulas (painel da professora): peças puras de tela ----------
// Dado -> string HTML (sem rede e sem DOM global), no Design System do painel (classes p-*). A orquestração (buscar,
// eventos, diálogos) fica em shared/admin-class-logs.js. Testado em tests/painel-aulas/test_classlogs_ui_unit.js.
// Todo texto do banco passa por escapeHTML; todo texto visível por t()/tp() (chaves classlogs.*).
//
// Modelo: uma aula em grupo é gravada como UMA linha por aluno em teacher_class_logs (mesmo conteúdo, criadas no mesmo
// instante, migration 031). Aqui essas linhas voltam a aparecer como UMA aula com vários avatares: mesmo conteúdo e
// criação dentro de TCL_GROUP_WINDOW_MS. Editar ou apagar uma aula em grupo vale para todas as linhas dela.
//
// 094: Presença (rótulo colorido da professora), Competências e aula de TURMA (1 linha com classroom_id e sem aluno). Os
// rótulos e as cores de Presença usam as classes globais do site (.att-pill, .skill-chip, .skill-toggle, definidas no index
// de fr e zh e iguais às da tela da aluna).
//
// Depende de: shared/i18n (t, tp, fmtDate), shared/profile.js (escapeHTML), shared/admin-students.js
// (STUDENT_LANGUAGE_LABELS), shared/teacher-students-ui.js (tsuInitials, tsuNorm, tsuTp) e
// shared/teacher-class-logs.js (CLASS_LOG_SKILLS, CLASS_ATTENDANCE_COLORS, classLogSkillLabel).

const TCL_GROUP_WINDOW_MS = 10000;

function tclEsc(v){ return escapeHTML(v == null ? '' : String(v)); }
// 'AAAA-MM-DD' no fuso local (new Date('2026-10-09') viraria o dia anterior no Brasil).
function tclLocalDate(d){
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d || ''));
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(d);
}
function tclName(link){ return (link && (link.display_name || link.username)) || t('admin.common.removedUser'); }
function tclLangLabel(key){ return STUDENT_LANGUAGE_LABELS[key] || key; }

// Chave estável de um vínculo (um aluno pode ter vínculo em dois idiomas).
function tclLinkKey(studentId, lang){ return `${studentId}|${lang}`; }

// Chave de uma turma na seleção de "quem teve a aula" (nunca colide com 'aluno|idioma').
function tclRoomKey(id){ return `turma|${id}`; }
function tclIsRoomKey(k){ return String(k).startsWith('turma|'); }

// Junta as linhas de uma mesma aula em grupo. links = vínculos ativos; linhas de quem não tem vínculo ativo ficam de fora.
// rooms = turmas da professora ({id, name, language_app_key, members}); aula de turma é UMA linha e vira um grupo sozinho.
function tclGroupLogs(logs, links, rooms){
  const byKey = {}; links.forEach(l => { byKey[tclLinkKey(l.student_id, l.language_app_key)] = l; });
  const roomById = {}; (rooms || []).forEach(r => { roomById[String(r.id)] = r; });
  const sorted = (logs || []).slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at) || a.id - b.id);
  const open = {}; const groups = [];
  const extras = (g) => ({ attendance_label_id: g.attendance_label_id == null ? null : g.attendance_label_id, skills: Array.isArray(g.skills) ? g.skills : [] });
  sorted.forEach(g => {
    if (g.classroom_id != null && !g.student_id){
      const room = roomById[String(g.classroom_id)] || { id: g.classroom_id, name: '?', language_app_key: g.language_app_key, members: [] };
      groups.push(Object.assign({ gid: g.id, class_date: g.class_date, topic: g.topic, homework: g.homework, observations: g.observations, notes: g.notes,
        createdMs: new Date(g.created_at).getTime(), logs: [g], links: [], classroom: room }, extras(g)));
      return;
    }
    const link = byKey[tclLinkKey(g.student_id, g.language_app_key)];
    if (!link) return;
    const x = extras(g);
    const content = [g.class_date, g.topic || '', g.homework || '', g.observations || '', g.notes || '', x.attendance_label_id, x.skills.join(',')].join('\u0001');
    const t0 = new Date(g.created_at).getTime();
    let grp = open[content];
    if (grp && Math.abs(t0 - grp.createdMs) <= TCL_GROUP_WINDOW_MS && !grp.logs.some(y => y.student_id === g.student_id && y.language_app_key === g.language_app_key)){
      grp.logs.push(g); grp.links.push(link);
    } else {
      grp = Object.assign({ gid: g.id, class_date: g.class_date, topic: g.topic, homework: g.homework, observations: g.observations, notes: g.notes, createdMs: t0, logs: [g], links: [link], classroom: null }, x);
      open[content] = grp; groups.push(grp);
    }
  });
  return groups.sort((a, b) => b.class_date.localeCompare(a.class_date) || b.createdMs - a.createdMs || b.gid - a.gid);
}

function tclFilterGroups(groups, f){
  const q = tsuNorm(f.busca).trim();
  return groups.filter(g => {
    const room = g.classroom;
    if (f.aluno && !g.links.some(l => l.student_id === f.aluno) && !(room && (room.members || []).includes(f.aluno))) return false;
    if (f.curso && !g.links.some(l => l.language_app_key === f.curso) && !(room && room.language_app_key === f.curso)) return false;
    if (q){
      const hay = tsuNorm([g.topic, g.homework, g.observations, g.notes, room && room.name, ...g.links.map(l => `${l.display_name || ''} ${l.username || ''}`)].join(' '));
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function tclMonthLabel(dateStr){ return fmtDate(tclLocalDate(dateStr), { month: 'long', year: 'numeric' }); }
function tclMonthKey(dateStr){ return String(dateStr).slice(0, 7); }

function tclAvatars(links, room){
  if (room) return `<div class="p-avatares"><span class="p-avatar" aria-hidden="true">👥</span></div>`;
  const shown = links.slice(0, 3).map(l => `<span class="p-avatar" aria-hidden="true">${tclEsc(tsuInitials(tclName(l)))}</span>`);
  if (links.length > 3) shown.push(`<span class="p-avatar" aria-hidden="true">+${links.length - 3}</span>`);
  return `<div class="p-avatares"${links.length > 1 ? ` role="img" aria-label="${tclEsc(t('classlogs.card.groupAria', { n: links.length }))}"` : ''}>${shown.join('')}</div>`;
}

function tclPeopleText(links, room){
  if (room) return `${room.name} · ${tp('panel.classLog.membersCount', (room.members || []).length)}`;
  if (links.length === 1) return t('classlogs.card.single', { name: tclName(links[0]), lang: tclLangLabel(links[0].language_app_key) });
  const names = links.slice(0, 3).map(tclName).join(', ') + (links.length > 3 ? ` +${links.length - 3}` : '');
  return t('classlogs.card.group', { names });
}

function tclLabelById(labels, id){ return id == null ? null : (labels || []).find(l => String(l.id) === String(id)) || null; }

// Selos da aula: turma, Presença (cor do rótulo) e Competências.
function tclBadgesHTML(g, labels){
  const label = tclLabelById(labels, g.attendance_label_id);
  return classLogBadgesHTML({ attendanceName: label && label.name, attendanceColor: label && label.color, skills: g.skills, classroomName: g.classroom && g.classroom.name });
}

function tclCardHTML(g, labels){
  const d = tclLocalDate(g.class_date);
  const day = String(d.getDate()).padStart(2, '0');
  const mon = fmtDate(d, { month: 'short' }).replace(/\./g, '');
  const rows = [['homework', g.homework], ['observations', g.observations], ['notes', g.notes]].filter(r => r[1]);
  const dl = rows.length ? `<dl>${rows.map(([k, v]) => `<dt>${tclEsc(t('classlogs.field.' + k))}</dt><dd>${tclEsc(v)}</dd>`).join('')}</dl>` : '';
  return `<article class="p-aula" data-aula="${tclEsc(g.gid)}">
    <div class="p-aula-dia"><b>${tclEsc(day)}</b><span>${tclEsc(mon)}</span></div>
    <div><h3>${tclEsc(g.topic || t('classlogs.card.noTopic'))}</h3>
      <div class="p-pessoa">${tclAvatars(g.links, g.classroom)}<small>${tclEsc(tclPeopleText(g.links, g.classroom))}</small></div>${tclBadgesHTML(g, labels)}${dl}</div>
    <details class="p-menu" data-alinhar="fim"><summary role="button" class="outline secondary p-pequeno">${tclEsc(t('classlogs.menu'))}</summary>
      <div class="p-menu-lista" role="menu"><button type="button" class="p-menu-item" role="menuitem" data-editar-aula="${tclEsc(g.gid)}">${tclEsc(t('classlogs.edit'))}</button>
      <button type="button" class="p-menu-item p-menu-item--perigo" role="menuitem" data-apagar-aula="${tclEsc(g.gid)}">${tclEsc(t('classlogs.delete'))}</button></div></details>
  </article>`;
}

// Lista agrupada por mês. total = quantas aulas existem sem filtro (para escolher o texto do vazio).
function tclListHTML(groups, total, labels){
  if (!groups.length){
    return `<div class="p-vazio"><strong>${tclEsc(t(total ? 'classlogs.empty.filtered' : 'classlogs.empty.title'))}</strong>${total ? '' : `<span>${tclEsc(t('classlogs.empty.text'))}</span>`}</div>`;
  }
  let out = '', month = '';
  groups.forEach(g => {
    const k = tclMonthKey(g.class_date);
    if (k !== month){ month = k; out += `<p class="p-mes">${tclEsc(tclMonthLabel(g.class_date))}</p>`; }
    out += tclCardHTML(g, labels);
  });
  return out;
}

function tclFiltersHTML(links, f){
  const langs = [...new Set(links.map(l => l.language_app_key))];
  const students = []; const seen = new Set();
  links.forEach(l => { if (!seen.has(l.student_id)){ seen.add(l.student_id); students.push(l); } });
  return `<div class="p-ferramentas">
    <select aria-label="${tclEsc(t('classlogs.filter.student.aria'))}" data-aulas-aluno><option value="">${tclEsc(t('classlogs.filter.student.all'))}</option>${students.map(l => `<option value="${tclEsc(l.student_id)}"${f.aluno === l.student_id ? ' selected' : ''}>${tclEsc(tclName(l))}</option>`).join('')}</select>
    ${langs.length > 1 ? `<select aria-label="${tclEsc(t('students.filter.course.aria'))}" data-aulas-curso><option value="">${tclEsc(t('students.filter.course.all'))}</option>${langs.map(k => `<option value="${tclEsc(k)}"${f.curso === k ? ' selected' : ''}>${tclEsc(tclLangLabel(k))}</option>`).join('')}</select>` : ''}
    <input class="p-cresce" type="search" placeholder="${tclEsc(t('classlogs.search.placeholder'))}" aria-label="${tclEsc(t('classlogs.search.aria'))}" value="${tclEsc(f.busca || '')}" data-aulas-busca>
  </div>`;
}

// Pessoas e turmas escolhidas (chips). Atualizado por DOM direto: nunca refaz o formulário.
function tclChipsHTML(links, rooms, selectedKeys){
  const people = links.filter(l => selectedKeys.has(tclLinkKey(l.student_id, l.language_app_key))).map(l => ({ key: tclLinkKey(l.student_id, l.language_app_key), name: tclName(l) }));
  const turmas = (rooms || []).filter(r => selectedKeys.has(tclRoomKey(r.id))).map(r => ({ key: tclRoomKey(r.id), name: `👥 ${r.name}` }));
  const chosen = people.concat(turmas);
  if (!chosen.length) return `<p class="p-subtitulo" style="margin:0">${tclEsc(t('classlogs.form.none'))}</p>`;
  return `<ul class="p-chips">${chosen.map(c => `<li class="p-chip">${tclEsc(c.name)} <button type="button" aria-label="${tclEsc(t('classlogs.form.removePerson', { name: c.name.replace(/^👥 /, '') }))}" data-tirar-pessoa="${tclEsc(c.key)}">×</button></li>`).join('')}</ul>`;
}

// "Registrar aula para 2 pessoas · 1 turma": n = pessoas, r = turmas escolhidas.
function tclSubmitLabel(n, r){
  const base = n > 1 ? tsuTp('classlogs.form.submit', n) : t('classlogs.form.submitOne');
  return r ? `${base} · ${tp('panel.classLog.classroomsSelected', r)}` : base;
}
function tclSelectionCounts(links, rooms, selectedKeys){
  return { n: links.filter(l => selectedKeys.has(tclLinkKey(l.student_id, l.language_app_key))).length, r: (rooms || []).filter(x => selectedKeys.has(tclRoomKey(x.id))).length };
}

// Presença no estilo do Notion: clicar escolhe, digitar um nome + Enter cria, "⋯" no rótulo renomeia, troca a cor e arquiva
// (arquivado some da lista; aulas antigas continuam com ele). O rótulo atual da aula aparece mesmo se arquivado.
function tclPresencaHTML(prefix, labels, current){
  const cur = current == null ? '' : String(current);
  const shown = (labels || []).filter(l => !l.archived || String(l.id) === cur);
  return `<label class="att-pill att-choice" data-color="gray"><input type="radio" name="${prefix}-att" value=""${cur ? '' : ' checked'}> ${tclEsc(t('panel.classLog.attendanceNone'))}</label>`
    + shown.map(l => `<span class="att-chip-wrap"><label class="att-pill att-choice" data-color="${tclEsc(l.color)}"><input type="radio" name="${prefix}-att" value="${tclEsc(l.id)}"${String(l.id) === cur ? ' checked' : ''}> ${tclEsc(l.name)}</label><button type="button" class="att-more" data-att-more="${tclEsc(l.id)}" aria-label="${tclEsc(t('panel.classLog.labels.edit', { name: l.name }))}" title="${tclEsc(t('panel.classLog.labels.edit', { name: l.name }))}">⋯</button></span>`).join('');
}

// Menu do "⋯": nome, 9 cores, arquivar e Pronto.
function tclMenuRotuloHTML(l){
  return `<div class="att-menu-box" data-att-menu-label="${tclEsc(l.id)}">
    <input type="text" data-att-rename maxlength="40" value="${tclEsc(l.name)}" aria-label="${tclEsc(t('panel.classLog.labels.name'))}">
    <div class="att-colors" role="group" aria-label="${tclEsc(t('panel.classLog.labels.color'))}">${CLASS_ATTENDANCE_COLORS.map(c => `<button type="button" class="att-pill att-swatch" data-color="${c}" data-att-color="${c}" aria-pressed="${l.color === c}">${tclEsc(t('panel.classLog.color.' + c))}</button>`).join('')}</div>
    <div class="att-menu-actions"><button type="button" class="secondary p-pequeno" data-att-archive>${tclEsc(t('panel.classLog.labels.archive'))}</button><button type="button" class="outline p-pequeno" data-att-close>${tclEsc(t('panel.classLog.labels.done'))}</button></div>
    <p class="profile-edit-error" data-att-error></p></div>`;
}

// Presença + Competências de uma aula (prefix = 'new' no formulário, 'editar' na janela de edição).
function tclExtrasHTML(prefix, labels, log){
  const current = log && log.attendance_label_id != null ? String(log.attendance_label_id) : '';
  const skills = new Set((log && log.skills) || []);
  return `<fieldset class="class-log-extras" data-class-log-extras="${prefix}">
    <legend>${tclEsc(t('panel.classLog.attendance'))}</legend>
    <div class="att-choices" data-att-choices="${prefix}">${tclPresencaHTML(prefix, labels, current)}</div>
    <input type="text" class="att-new" data-att-new="${prefix}" maxlength="40" autocomplete="off" placeholder="${tclEsc(t('panel.classLog.labels.createPlaceholder'))}" aria-label="${tclEsc(t('panel.classLog.labels.createPlaceholder'))}">
    <div class="att-menu" data-att-menu="${prefix}" hidden></div>
    <legend>${tclEsc(t('panel.classLog.skills'))}</legend>
    <div class="skill-toggles">${CLASS_LOG_SKILLS.map(k => `<label class="skill-toggle"><input type="checkbox" data-skill value="${k}"${skills.has(k) ? ' checked' : ''}> ${tclEsc(classLogSkillLabel(k))}</label>`).join('')}</div>
  </fieldset>`;
}

function tclFormHTML(links, rooms, selectedKeys, today, labels){
  const { n, r } = tclSelectionCounts(links, rooms, selectedKeys);
  const picker = links.map(l => {
    const key = tclLinkKey(l.student_id, l.language_app_key);
    return `<label data-pessoa data-busca="${tclEsc(tsuNorm(`${l.display_name || ''} ${l.username || ''}`))}"><input type="checkbox" value="${tclEsc(key)}"${selectedKeys.has(key) ? ' checked' : ''} data-escolher-pessoa> ${tclEsc(tclName(l))} <small>@${tclEsc(l.username || '')} · ${tclEsc(tclLangLabel(l.language_app_key))}</small></label>`;
  }).join('');
  const turmas = (rooms || []).length ? `<p class="p-subtitulo" style="margin:.7rem 0 .2rem"><b>${tclEsc(t('panel.classLog.classrooms'))}</b></p><small>${tclEsc(t('panel.classLog.classroomsHint'))}</small>
          <fieldset class="p-rolagem" style="max-height:9rem;overflow:auto" data-turmas>${rooms.map(c => `<label data-turma data-busca="${tclEsc(tsuNorm(c.name))}"><input type="checkbox" value="${tclEsc(tclRoomKey(c.id))}"${selectedKeys.has(tclRoomKey(c.id)) ? ' checked' : ''} data-escolher-pessoa> 👥 ${tclEsc(c.name)} <small>${tclEsc(tclLangLabel(c.language_app_key))} · ${tclEsc(tp('panel.classLog.membersCount', (c.members || []).length))}</small></label>`).join('')}</fieldset>` : '';
  const anyone = n + r > 0;
  return `<article><header><h3>${tclEsc(t('classlogs.form.title'))}</h3></header>
    <form id="form-aula" novalidate>
      <p class="p-subtitulo" style="margin:0 0 .4rem"><b>${tclEsc(t('classlogs.form.who'))}</b></p>
      <div data-chips>${tclChipsHTML(links, rooms, selectedKeys)}</div>
      <details class="p-popover" style="margin:.6rem 0 1rem"><summary role="button" class="outline p-pequeno">${tclEsc(t('classlogs.form.pick'))}</summary>
        <div class="p-popover-corpo"><small>${tclEsc(t('classlogs.form.pickHint'))}</small>
          <input type="search" placeholder="${tclEsc(t('students.search.placeholder'))}" aria-label="${tclEsc(t('students.search.aria'))}" data-buscar-pessoa>
          <fieldset class="p-rolagem" style="max-height:12rem;overflow:auto">${picker}</fieldset>${turmas}</div></details>
      <label>${tclEsc(t('classlogs.form.date'))}<input type="date" id="aula-data" value="${tclEsc(today)}"></label>
      <label>${tclEsc(t('classlogs.form.topic'))}<input id="aula-topico" autocomplete="off" placeholder="${tclEsc(t('admin.classLogs.topicPlaceholder'))}"></label>
      <label>${tclEsc(t('classlogs.form.homework'))}<input id="aula-licao" autocomplete="off" placeholder="${tclEsc(t('admin.classLogs.homeworkPlaceholder'))}"></label>
      <label>${tclEsc(t('classlogs.form.observations'))}<input id="aula-obs" autocomplete="off" placeholder="${tclEsc(t('admin.classLogs.observationsPlaceholder'))}"></label>
      <label>${tclEsc(t('classlogs.form.notes'))}<textarea id="aula-notas" rows="3" placeholder="${tclEsc(t('admin.classLogs.notesPlaceholder'))}"></textarea></label>
      ${tclExtrasHTML('new', labels, null)}
      <small>${tclEsc(t('classlogs.form.atLeastOne'))}</small>
      <p class="profile-edit-error" id="aula-erro" role="alert"></p>
      <div class="p-acoes" style="justify-content:flex-end"><button type="reset" class="secondary" data-limpar-aula>${tclEsc(t('classlogs.form.clear'))}</button><button type="submit" id="aula-enviar"${anyone ? '' : ' disabled'} data-rotulo-enviar>${tclEsc(anyone ? tclSubmitLabel(n, r) : t('classlogs.form.submitOne'))}</button></div>
    </form></article>`;
}

function tclEditDialogHTML(g, labels){
  const n = g.logs.length;
  return `<dialog id="dlg-editar-aula" class="p-dialogo" aria-labelledby="dlg-editar-aula-t"><article>
    <header><button type="button" rel="prev" aria-label="${tclEsc(t('common.close'))}" data-fechar-dialogo></button><h3 id="dlg-editar-aula-t">${tclEsc(t('classlogs.edit.title'))}</h3></header>
    <form id="form-editar-aula" data-gid="${tclEsc(g.gid)}" novalidate>
      ${n > 1 ? `<div class="p-alerta p-alerta--info"><span>${tclEsc(tsuTp('classlogs.edit.group', n))}</span></div>` : ''}
      <label>${tclEsc(t('classlogs.form.date'))}<input type="date" id="editar-data" value="${tclEsc(g.class_date)}"></label>
      <label>${tclEsc(t('classlogs.form.topic'))}<input id="editar-topico" value="${tclEsc(g.topic || '')}" autocomplete="off"></label>
      <label>${tclEsc(t('classlogs.form.homework'))}<input id="editar-licao" value="${tclEsc(g.homework || '')}" autocomplete="off"></label>
      <label>${tclEsc(t('classlogs.form.observations'))}<input id="editar-obs" value="${tclEsc(g.observations || '')}" autocomplete="off"></label>
      <label>${tclEsc(t('classlogs.form.notes'))}<textarea id="editar-notas" rows="3">${tclEsc(g.notes || '')}</textarea></label>
      ${tclExtrasHTML('editar', labels, g)}
      <p class="profile-edit-error" id="editar-erro" role="alert"></p>
      <footer><button type="button" class="secondary" data-fechar-dialogo>${tclEsc(t('classlogs.edit.cancel'))}</button><button type="submit">${tclEsc(t('classlogs.edit.save'))}</button></footer>
    </form></article></dialog>`;
}

function tclLoadingHTML(){
  return `<div class="painel"><div class="p-pagina"><div class="p-carregando" role="status"><span class="p-spinner" aria-hidden="true"></span><span>${tclEsc(t('classlogs.loading'))}</span></div></div></div>`;
}

function tclNoStudentsHTML(){
  return `<div class="painel"><div class="p-pagina" data-tcl="vazio"><header class="p-cabecalho"><div><h2>${tclEsc(t('classlogs.title'))}</h2><span class="p-subtitulo">${tclEsc(t('classlogs.sub'))}</span></div></header>
    <div class="p-vazio"><strong>${tclEsc(t('classlogs.noStudents.title'))}</strong><span>${tclEsc(t('classlogs.noStudents.text'))}</span><button type="button" data-ir-secao="students">${tclEsc(t('students.title'))}</button></div></div></div>`;
}

// Tela completa. st = { links, rooms, labels, groups, filtros, selected (Set de chaves: 'aluno|idioma' e 'turma|id'), today }
function tclPageHTML(st){
  const filtered = tclFilterGroups(st.groups, st.filtros);
  return `<div class="painel"><div class="p-pagina" data-tcl="pagina">
    <header class="p-cabecalho"><div><h2>${tclEsc(t('classlogs.title'))}</h2><span class="p-subtitulo">${tclEsc(t('classlogs.sub'))}</span></div></header>
    <div data-aulas-notion></div>
    <div class="p-grade-2 p-grade-2--larga">
      <div style="display:grid;gap:1rem;min-width:0;align-content:start">${tclFiltersHTML(st.links, st.filtros)}<div data-aulas-lista style="display:grid;gap:1rem">${tclListHTML(filtered, st.groups.length, st.labels)}</div></div>
      <aside class="p-lateral">${tclFormHTML(st.links, st.rooms, st.selected, st.today, st.labels)}</aside>
    </div></div></div>`;
}

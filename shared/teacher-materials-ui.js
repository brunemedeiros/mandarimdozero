// ---------- Material de apoio (painel da professora): peças puras de tela ----------
// Dado -> string HTML (sem rede e sem DOM global), no Design System do painel (classes p-*). A orquestração (buscar, enviar
// arquivo, eventos, diálogos) fica em shared/admin-support-materials.js. Testado em tests/painel-materiais/test_materials_ui_unit.js.
// Todo texto do banco passa por escapeHTML; todo texto visível por t()/tp() (chaves materials.*); todo link só vira href se for http(s).
//
// Modelo: um material enviado a várias pessoas é gravado como UMA linha por aluno em teacher_support_materials (mesmo conteúdo,
// criadas no mesmo instante). Aqui essas linhas voltam a aparecer como UM material com vários avatares (mesmo padrão das Aulas:
// mesmo conteúdo e criação dentro de TMT_GROUP_WINDOW_MS). Editar ou apagar vale para todas as linhas do material.
//
// Depende de: shared/i18n (t, tp, fmtDate), shared/profile.js (escapeHTML), shared/admin-students.js (STUDENT_LANGUAGE_LABELS),
// shared/teacher-students-ui.js (tsuInitials, tsuNorm, tsuTp).

const TMT_GROUP_WINDOW_MS = 10000;
const TMT_MAX_FILE_BYTES = 50 * 1024 * 1024;

function tmtEsc(v){ return escapeHTML(v == null ? '' : String(v)); }
function tmtName(link){ return (link && (link.display_name || link.username)) || t('admin.common.removedUser'); }
function tmtLangLabel(key){ return STUDENT_LANGUAGE_LABELS[key] || key; }
function tmtLinkKey(studentId, lang){ return `${studentId}|${lang}`; }
// Só http e https viram link clicável (um "javascript:" digitado ou vindo do banco nunca vira href).
function tmtSafeUrl(u){ return /^https?:\/\//i.test(String(u || '').trim()) ? String(u).trim() : ''; }
function tmtHost(u){ try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; } }
function tmtSize(bytes){
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1).replace('.', ',')} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// Junta as linhas de um mesmo envio. links = vínculos ativos; linhas de quem não tem vínculo ativo ficam de fora.
function tmtGroupMaterials(rows, links){
  const byKey = {}; links.forEach(l => { byKey[tmtLinkKey(l.student_id, l.language_app_key)] = l; });
  const mine = (rows || []).filter(m => byKey[tmtLinkKey(m.student_id, m.language_app_key)])
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at) || a.id - b.id);
  const open = {}; const groups = [];
  mine.forEach(m => {
    const content = [m.title, m.description || '', m.link_url || '', m.file_url || ''].join('\u0001');
    const t0 = new Date(m.created_at).getTime();
    let grp = open[content];
    const link = byKey[tmtLinkKey(m.student_id, m.language_app_key)];
    if (grp && Math.abs(t0 - grp.createdMs) <= TMT_GROUP_WINDOW_MS && !grp.rows.some(x => x.student_id === m.student_id && x.language_app_key === m.language_app_key)){
      grp.rows.push(m); grp.links.push(link);
    } else {
      grp = { gid: m.id, title: m.title, description: m.description, link_url: m.link_url, file_url: m.file_url, file_name: m.file_name, created_at: m.created_at, createdMs: t0, rows: [m], links: [link] };
      open[content] = grp; groups.push(grp);
    }
  });
  return groups.sort((a, b) => b.createdMs - a.createdMs || b.gid - a.gid);
}

function tmtFilterGroups(groups, f){
  const q = tsuNorm(f.busca).trim();
  return groups.filter(g => {
    if (f.aluno && !g.links.some(l => l.student_id === f.aluno)) return false;
    if (f.curso && !g.links.some(l => l.language_app_key === f.curso)) return false;
    if (q){
      const hay = tsuNorm([g.title, g.description, g.link_url, g.file_name, ...g.links.map(l => `${l.display_name || ''} ${l.username || ''}`)].join(' '));
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function tmtMonthLabel(iso){ return fmtDate(new Date(iso), { month: 'long', year: 'numeric' }); }
function tmtMonthKey(iso){ const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }

function tmtAvatars(links){
  const shown = links.slice(0, 3).map(l => `<span class="p-avatar" aria-hidden="true">${tmtEsc(tsuInitials(tmtName(l)))}</span>`);
  if (links.length > 3) shown.push(`<span class="p-avatar" aria-hidden="true">+${links.length - 3}</span>`);
  return `<div class="p-avatares"${links.length > 1 ? ` role="img" aria-label="${tmtEsc(t('materials.card.groupAria', { n: links.length }))}"` : ''}>${shown.join('')}</div>`;
}

function tmtPeopleText(links){
  if (links.length === 1) return t('materials.card.single', { name: tmtName(links[0]), lang: tmtLangLabel(links[0].language_app_key) });
  const names = links.slice(0, 3).map(tmtName).join(', ') + (links.length > 3 ? ` +${links.length - 3}` : '');
  return t('materials.card.group', { names });
}

function tmtCardHTML(g){
  const d = new Date(g.created_at);
  const day = String(d.getDate()).padStart(2, '0');
  const mon = fmtDate(d, { month: 'short' }).replace(/\./g, '');
  const link = tmtSafeUrl(g.link_url);
  const anexos = [
    link ? `<a class="p-selo p-selo--info" href="${tmtEsc(link)}" target="_blank" rel="noopener noreferrer">${tmtEsc(t('materials.card.link', { host: tmtHost(link) }))}</a>` : '',
    g.file_url && tmtSafeUrl(g.file_url) ? `<a class="p-selo p-selo--info" href="${tmtEsc(tmtSafeUrl(g.file_url))}" target="_blank" rel="noopener noreferrer">${tmtEsc(t('materials.card.file', { name: g.file_name || t('materials.card.fileNoName') }))}</a>` : '',
  ].filter(Boolean).join('');
  return `<article class="p-aula" data-material="${tmtEsc(g.gid)}">
    <div class="p-aula-dia" title="${tmtEsc(t('materials.card.sentOn', { date: fmtDate(d) }))}"><b>${tmtEsc(day)}</b><span>${tmtEsc(mon)}</span></div>
    <div><h3>${tmtEsc(g.title)}</h3>
      <div class="p-pessoa">${tmtAvatars(g.links)}<small>${tmtEsc(tmtPeopleText(g.links))}</small></div>
      ${g.description ? `<p class="p-material-texto">${tmtEsc(g.description)}</p>` : ''}
      ${anexos ? `<div class="p-material-anexos">${anexos}</div>` : ''}</div>
    <details class="p-menu" data-alinhar="fim"><summary role="button" class="outline secondary p-pequeno">${tmtEsc(t('materials.menu'))}</summary>
      <div class="p-menu-lista" role="menu"><button type="button" class="p-menu-item" role="menuitem" data-editar-material="${tmtEsc(g.gid)}">${tmtEsc(t('materials.edit'))}</button>
      <button type="button" class="p-menu-item p-menu-item--perigo" role="menuitem" data-apagar-material="${tmtEsc(g.gid)}">${tmtEsc(t('materials.delete'))}</button></div></details>
  </article>`;
}

// Lista agrupada por mês do envio. total = quantos materiais existem sem filtro (para escolher o texto do vazio).
function tmtListHTML(groups, total){
  if (!groups.length){
    return `<div class="p-vazio"><strong>${tmtEsc(t(total ? 'materials.empty.filtered' : 'materials.empty.title'))}</strong>${total ? '' : `<span>${tmtEsc(t('materials.empty.text'))}</span>`}</div>`;
  }
  let out = '', month = '';
  groups.forEach(g => {
    const k = tmtMonthKey(g.created_at);
    if (k !== month){ month = k; out += `<p class="p-mes">${tmtEsc(tmtMonthLabel(g.created_at))}</p>`; }
    out += tmtCardHTML(g);
  });
  return out;
}

function tmtFiltersHTML(links, f){
  const langs = [...new Set(links.map(l => l.language_app_key))];
  const students = []; const seen = new Set();
  links.forEach(l => { if (!seen.has(l.student_id)){ seen.add(l.student_id); students.push(l); } });
  return `<div class="p-ferramentas">
    <select aria-label="${tmtEsc(t('materials.filter.student.aria'))}" data-materiais-aluno><option value="">${tmtEsc(t('materials.filter.student.all'))}</option>${students.map(l => `<option value="${tmtEsc(l.student_id)}"${f.aluno === l.student_id ? ' selected' : ''}>${tmtEsc(tmtName(l))}</option>`).join('')}</select>
    ${langs.length > 1 ? `<select aria-label="${tmtEsc(t('students.filter.course.aria'))}" data-materiais-curso><option value="">${tmtEsc(t('students.filter.course.all'))}</option>${langs.map(k => `<option value="${tmtEsc(k)}"${f.curso === k ? ' selected' : ''}>${tmtEsc(tmtLangLabel(k))}</option>`).join('')}</select>` : ''}
    <input class="p-cresce" type="search" placeholder="${tmtEsc(t('materials.search.placeholder'))}" aria-label="${tmtEsc(t('materials.search.aria'))}" value="${tmtEsc(f.busca || '')}" data-materiais-busca>
  </div>`;
}

// Pessoas escolhidas (chips). Atualizado por DOM direto: nunca refaz o formulário.
function tmtChipsHTML(links, selectedKeys){
  const chosen = links.filter(l => selectedKeys.has(tmtLinkKey(l.student_id, l.language_app_key)));
  if (!chosen.length) return `<p class="p-subtitulo" style="margin:0">${tmtEsc(t('materials.form.none'))}</p>`;
  return `<ul class="p-chips">${chosen.map(l => `<li class="p-chip">${tmtEsc(tmtName(l))} <button type="button" aria-label="${tmtEsc(t('materials.form.removePerson', { name: tmtName(l) }))}" data-tirar-pessoa="${tmtEsc(tmtLinkKey(l.student_id, l.language_app_key))}">×</button></li>`).join('')}</ul>`;
}

function tmtSubmitLabel(n){ return n > 1 ? tsuTp('materials.form.submit', n) : t('materials.form.submitOne'); }

function tmtFormHTML(links, selectedKeys){
  const n = selectedKeys.size;
  const picker = links.map(l => {
    const key = tmtLinkKey(l.student_id, l.language_app_key);
    return `<label data-pessoa data-busca="${tmtEsc(tsuNorm(`${l.display_name || ''} ${l.username || ''}`))}"><input type="checkbox" value="${tmtEsc(key)}"${selectedKeys.has(key) ? ' checked' : ''} data-escolher-pessoa> ${tmtEsc(tmtName(l))} <small>@${tmtEsc(l.username || '')} · ${tmtEsc(tmtLangLabel(l.language_app_key))}</small></label>`;
  }).join('');
  return `<article><header><h3>${tmtEsc(t('materials.form.title'))}</h3></header>
    <form id="form-material" novalidate>
      <p class="p-subtitulo" style="margin:0 0 .4rem"><b>${tmtEsc(t('materials.form.who'))}</b></p>
      <div data-chips>${tmtChipsHTML(links, selectedKeys)}</div>
      <details class="p-popover" style="margin:.6rem 0 1rem"><summary role="button" class="outline p-pequeno">${tmtEsc(t('materials.form.pick'))}</summary>
        <div class="p-popover-corpo"><small>${tmtEsc(t('materials.form.pickHint'))}</small>
          <input type="search" placeholder="${tmtEsc(t('students.search.placeholder'))}" aria-label="${tmtEsc(t('students.search.aria'))}" data-buscar-pessoa>
          <fieldset class="p-rolagem" style="max-height:12rem;overflow:auto">${picker}</fieldset></div></details>
      <label>${tmtEsc(t('materials.form.titleLabel'))}<input id="material-titulo" autocomplete="off" placeholder="${tmtEsc(t('admin.materials.titlePlaceholder'))}"></label>
      <label>${tmtEsc(t('materials.form.desc'))}<textarea id="material-desc" rows="3" placeholder="${tmtEsc(t('admin.materials.descPlaceholder'))}"></textarea></label>
      <label>${tmtEsc(t('materials.form.link'))}<input type="url" id="material-link" autocomplete="off" placeholder="https://..."></label>
      <div data-material-arquivo><label>${tmtEsc(t('materials.form.file'))}<input type="file" id="material-arquivo"></label></div>
      <ul class="p-anexos" data-material-anexo></ul>
      <small>${tmtEsc(t('materials.form.atLeastOne'))}</small>
      <p class="profile-edit-error" id="material-erro" role="alert"></p>
      <div class="p-acoes" style="justify-content:flex-end"><button type="reset" class="secondary" data-limpar-material>${tmtEsc(t('materials.form.clear'))}</button><button type="submit" id="material-enviar"${n ? '' : ' disabled'}>${tmtEsc(n ? tmtSubmitLabel(n) : t('materials.form.submitOne'))}</button></div>
    </form></article>`;
}

function tmtEditDialogHTML(g){
  const n = g.rows.length;
  return `<dialog id="dlg-editar-material" class="p-dialogo" aria-labelledby="dlg-editar-material-t"><article>
    <header><button type="button" rel="prev" aria-label="${tmtEsc(t('common.close'))}" data-fechar-dialogo></button><h3 id="dlg-editar-material-t">${tmtEsc(t('materials.edit.title'))}</h3></header>
    <form id="form-editar-material" data-gid="${tmtEsc(g.gid)}" novalidate>
      ${n > 1 ? `<div class="p-alerta p-alerta--info"><span>${tmtEsc(tsuTp('materials.edit.group', n))}</span></div>` : ''}
      <label>${tmtEsc(t('materials.form.titleLabel'))}<input id="editar-titulo" value="${tmtEsc(g.title)}" autocomplete="off"></label>
      <label>${tmtEsc(t('materials.form.desc'))}<textarea id="editar-desc" rows="3">${tmtEsc(g.description || '')}</textarea></label>
      <label>${tmtEsc(t('materials.form.link'))}<input type="url" id="editar-link" value="${tmtEsc(g.link_url || '')}" autocomplete="off" placeholder="https://..."></label>
      ${g.file_url ? `<small>${tmtEsc(t('materials.edit.fileKept', { name: g.file_name || t('materials.card.fileNoName') }))}</small>` : ''}
      <p class="profile-edit-error" id="editar-erro" role="alert"></p>
      <footer><button type="button" class="secondary" data-fechar-dialogo>${tmtEsc(t('materials.edit.cancel'))}</button><button type="submit">${tmtEsc(t('materials.edit.save'))}</button></footer>
    </form></article></dialog>`;
}

function tmtLoadingHTML(){
  return `<div class="painel"><div class="p-pagina"><div class="p-carregando" role="status"><span class="p-spinner" aria-hidden="true"></span><span>${tmtEsc(t('materials.loading'))}</span></div></div></div>`;
}

function tmtNoStudentsHTML(){
  return `<div class="painel"><div class="p-pagina" data-tmt="vazio"><header class="p-cabecalho"><div><h2>${tmtEsc(t('materials.title'))}</h2><span class="p-subtitulo">${tmtEsc(t('materials.sub'))}</span></div></header>
    <div class="p-vazio"><strong>${tmtEsc(t('materials.noStudents.title'))}</strong><span>${tmtEsc(t('materials.noStudents.text'))}</span><button type="button" data-ir-secao="students">${tmtEsc(t('students.title'))}</button></div></div></div>`;
}

// Tela completa. st = { links, groups, filtros, selected (Set de chaves) }
function tmtPageHTML(st){
  const filtered = tmtFilterGroups(st.groups, st.filtros);
  return `<div class="painel"><div class="p-pagina" data-tmt="pagina">
    <header class="p-cabecalho"><div><h2>${tmtEsc(t('materials.title'))}</h2><span class="p-subtitulo">${tmtEsc(t('materials.sub'))}</span></div></header>
    <div class="p-grade-2 p-grade-2--larga">
      <div style="display:grid;gap:1rem;min-width:0;align-content:start">${tmtFiltersHTML(st.links, st.filtros)}<div data-materiais-lista style="display:grid;gap:1rem">${tmtListHTML(filtered, st.groups.length)}</div></div>
      <aside class="p-lateral">${tmtFormHTML(st.links, st.selected)}</aside>
    </div></div></div>`;
}

// ---------- Badges (painel de Admin): peças puras de tela ----------
// Dado -> string HTML (sem rede e sem DOM global), no Design System do painel (classes p-*). A orquestração (buscar, salvar,
// diálogos, eventos) fica em shared/admin-badges.js. Testado em tests/painel-admin/test_badges_ui_unit.js.
// Todo texto do banco passa por escapeHTML; todo texto visível por t()/tp() (chaves badges.* e admin.badges.*).
//
// Dados: catalog = badge_catalog ({id, name, icon, description}); grants = badge_grants já com username/display_name;
// profiles = {user_id, username, display_name}; builtin = SPECIAL_BADGES (automáticos, só leitura).
//
// Depende de: shared/i18n (t, tp, fmtDate), shared/profile.js (escapeHTML).

function tbdEsc(v){ return escapeHTML(v == null ? '' : String(v)); }
// Ícone: emoji vira texto escapado; o ícone SVG dos badges automáticos (constante do app, nunca vem do banco) entra como é.
// Em campos que só aceitam texto (opções de lista) o SVG não aparece.
function tbdIconHTML(b, builtin){ const i = b && b.icon; return (builtin || []).includes(b) && /^<svg/i.test(String(i || '')) ? i : tbdEsc(i); }
function tbdIconText(b){ return /^<svg/i.test(String(b && b.icon || '')) ? '' : String((b && b.icon) || ''); }
function tbdFindBadge(id, catalog, builtin){ return (catalog || []).find(b => b.id === id) || (builtin || []).find(b => b.id === id) || null; }

// Concessões filtradas por badge e busca (usuário, nome, nota, nome do badge).
function tbdFilterGrants(grants, f, catalog, builtin){
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const q = norm(f.busca).trim();
  return (grants || []).filter(g => {
    if (f.badge && g.badge_id !== f.badge) return false;
    if (q){
      const b = tbdFindBadge(g.badge_id, catalog, builtin);
      if (!norm([g.username, g.display_name, g.note, b && b.name].join(' ')).includes(q)) return false;
    }
    return true;
  });
}

function tbdCardHTML(b, memberCount){
  return `<article class="p-badge" data-badge="${tbdEsc(b.id)}">
    <div class="p-badge-icone" aria-hidden="true">${tbdEsc(b.icon)}</div>
    <div class="p-badge-texto"><h3>${tbdEsc(b.name)}</h3><small>${tbdEsc(b.description || '')}</small>
      <div class="p-material-anexos"><span class="p-selo p-selo--info">${tbdEsc(tp('admin.badges.members', memberCount))}</span><span class="p-selo" title="${tbdEsc(t('badges.card.idTitle'))}">${tbdEsc(b.id)}</span></div></div>
    <div class="p-acoes"><button type="button" class="outline p-pequeno" data-gerenciar-badge="${tbdEsc(b.id)}">${tbdEsc(t('badges.card.manage'))}</button>
    <details class="p-menu" data-alinhar="fim"><summary role="button" class="outline secondary p-pequeno">${tbdEsc(t('badges.menu'))}</summary>
      <div class="p-menu-lista" role="menu"><button type="button" class="p-menu-item" role="menuitem" data-editar-badge="${tbdEsc(b.id)}">${tbdEsc(t('badges.edit'))}</button>
      <div class="p-menu-sep" role="separator"></div>
      <button type="button" class="p-menu-item p-menu-item--perigo" role="menuitem" data-apagar-badge="${tbdEsc(b.id)}">${tbdEsc(t('badges.delete'))}</button></div></details></div>
  </article>`;
}

function tbdCatalogHTML(catalog, grants){
  if (!catalog.length) return `<div class="p-vazio"><strong>${tbdEsc(t('admin.badges.catalog.empty'))}</strong><span>${tbdEsc(t('badges.catalog.emptyText'))}</span></div>`;
  return `<div class="p-grade-badges">${catalog.map(b => tbdCardHTML(b, grants.filter(g => g.badge_id === b.id).length)).join('')}</div>`;
}

function tbdBuiltinHTML(builtin){
  return `<details class="p-automaticos"><summary>${tbdEsc(t('admin.badges.builtin.title'))} <span class="p-selo">${builtin.length}</span></summary>
    <p class="p-subtitulo">${tbdEsc(t('badges.builtin.hint'))}</p>
    <ul class="p-lista-simples">${builtin.map(b => `<li><span aria-hidden="true">${tbdIconHTML(b, builtin)}</span> <span><b>${tbdEsc(b.name)}</b><small>${tbdEsc(b.desc || '')}</small></span></li>`).join('')}</ul></details>`;
}

function tbdFiltersHTML(catalog, builtin, grants, f){
  const used = new Set(grants.map(g => g.badge_id));
  const opts = catalog.concat(builtin.filter(b => used.has(b.id)));
  return `<div class="p-ferramentas">
    <select aria-label="${tbdEsc(t('badges.filter.aria'))}" data-badges-filtro><option value="">${tbdEsc(t('badges.filter.all'))}</option>${opts.map(b => `<option value="${tbdEsc(b.id)}"${f.badge === b.id ? ' selected' : ''}>${tbdEsc(tbdIconText(b))} ${tbdEsc(b.name)}</option>`).join('')}</select>
    <input class="p-cresce" type="search" placeholder="${tbdEsc(t('badges.search.placeholder'))}" aria-label="${tbdEsc(t('badges.search.aria'))}" value="${tbdEsc(f.busca || '')}" data-badges-busca>
  </div>`;
}

function tbdGrantsTableHTML(grants, total, catalog, builtin){
  if (!grants.length) return `<div class="p-vazio"><strong>${tbdEsc(t(total ? 'badges.grants.emptyFiltered' : 'admin.badges.grants.empty'))}</strong></div>`;
  return `<article class="p-tabela p-tabela--compacta p-tabela--fluida"><table class="striped"><thead><tr>
    <th scope="col">${tbdEsc(t('badges.grants.colPerson'))}</th><th scope="col">${tbdEsc(t('badges.grants.colBadge'))}</th><th scope="col" class="p-oculta-movel">${tbdEsc(t('badges.grants.colNote'))}</th><th scope="col" class="p-oculta-movel">${tbdEsc(t('badges.grants.colDate'))}</th><th scope="col"><span class="p-so-leitor">${tbdEsc(t('badges.menu'))}</span></th>
  </tr></thead><tbody>${grants.map(g => {
    const b = tbdFindBadge(g.badge_id, catalog, builtin);
    const who = g.username ? `@${g.username}` : t('admin.common.removedUser');
    return `<tr data-concessao data-user="${tbdEsc(g.user_id)}" data-badge-id="${tbdEsc(g.badge_id)}">
      <td><strong>${tbdEsc(who)}</strong>${g.display_name ? `<br><small>${tbdEsc(g.display_name)}</small>` : ''}</td>
      <td>${b ? tbdIconHTML(b, builtin) : '🏅'} ${tbdEsc((b && b.name) || g.badge_id)}</td>
      <td class="p-oculta-movel">${tbdEsc(g.note || '')}</td><td class="p-oculta-movel">${tbdEsc(fmtDate(g.granted_at))}</td>
      <td><button type="button" class="outline secondary p-pequeno" data-revogar="1" aria-label="${tbdEsc(t('badges.grants.revokeAria', { username: g.username || '', badge: (b && b.name) || g.badge_id }))}">${tbdEsc(t('admin.badges.grants.revoke'))}</button></td></tr>`;
  }).join('')}</tbody></table></article>`;
}

function tbdCreateFormHTML(){
  return `<article><header><h3>${tbdEsc(t('admin.badges.create.title'))}</h3></header>
    <form id="form-criar-badge" novalidate>
      <label>${tbdEsc(t('admin.badges.create.name'))}<input id="badge-nome" maxlength="40" autocomplete="off" placeholder="${tbdEsc(t('admin.badges.create.namePh'))}"></label>
      <div class="p-grade-2" style="gap:.75rem">
        <label>${tbdEsc(t('admin.badges.create.icon'))}<input id="badge-icone" maxlength="8" autocomplete="off" placeholder="🛠️"></label>
        <label>${tbdEsc(t('badges.form.id'))}<input id="badge-id" maxlength="32" autocomplete="off" placeholder="${tbdEsc(t('admin.badges.create.idPh'))}"></label>
      </div>
      <small>${tbdEsc(t('badges.form.idHint'))}</small>
      <label>${tbdEsc(t('admin.materials.descOpt'))}<input id="badge-desc" maxlength="120" autocomplete="off" placeholder="${tbdEsc(t('admin.badges.create.descPh'))}"></label>
      <p class="profile-edit-error" id="badge-criar-erro" role="alert"></p>
      <div class="p-acoes" style="justify-content:flex-end"><button type="submit" id="badge-criar">${tbdEsc(t('admin.badges.create.btn'))}</button></div>
    </form></article>`;
}

function tbdGrantFormHTML(catalog, profiles){
  return `<article><header><h3>${tbdEsc(t('admin.badges.grant.title'))}</h3></header>
    <form id="form-conceder-badge" novalidate>
      <label>${tbdEsc(t('admin.badges.grant.badge'))}<select id="conceder-badge">${catalog.length ? catalog.map(b => `<option value="${tbdEsc(b.id)}">${tbdEsc(b.icon)} ${tbdEsc(b.name)}</option>`).join('') : `<option value="">${tbdEsc(t('admin.badges.grant.createFirst'))}</option>`}</select></label>
      <label>${tbdEsc(t('admin.badges.grant.username'))}<input id="conceder-usuario" maxlength="24" list="conceder-usuarios" autocomplete="off" placeholder="${tbdEsc(t('admin.badges.grant.usernamePh'))}"></label>
      <datalist id="conceder-usuarios">${(profiles || []).map(p => `<option value="${tbdEsc(p.username)}">${tbdEsc(p.display_name || '')}</option>`).join('')}</datalist>
      <label>${tbdEsc(t('admin.badges.grant.note'))}<input id="conceder-nota" maxlength="120" autocomplete="off" placeholder="${tbdEsc(t('admin.badges.grant.notePh'))}"></label>
      <p class="profile-edit-error" id="conceder-erro" role="alert"></p>
      <div class="p-acoes" style="justify-content:flex-end"><button type="submit" id="conceder-enviar"${catalog.length ? '' : ' disabled'}>${tbdEsc(t('admin.badges.grant.btn'))}</button></div>
    </form></article>`;
}

function tbdEditDialogHTML(b){
  return `<dialog id="dlg-editar-badge" class="p-dialogo" aria-labelledby="dlg-editar-badge-t"><article>
    <header><button type="button" rel="prev" aria-label="${tbdEsc(t('common.close'))}" data-fechar-dialogo></button><h3 id="dlg-editar-badge-t">${tbdEsc(t('badges.edit.title'))}</h3></header>
    <form id="form-editar-badge" data-id="${tbdEsc(b.id)}" novalidate>
      <label>${tbdEsc(t('admin.badges.create.name'))}<input id="editar-bnome" maxlength="40" value="${tbdEsc(b.name)}" autocomplete="off"></label>
      <div class="p-grade-2" style="gap:.75rem">
        <label>${tbdEsc(t('admin.badges.create.icon'))}<input id="editar-bicone" maxlength="8" value="${tbdEsc(b.icon)}" autocomplete="off"></label>
        <label>${tbdEsc(t('badges.form.id'))}<input id="editar-bid" maxlength="32" value="${tbdEsc(b.id)}" autocomplete="off"></label>
      </div>
      <small>${tbdEsc(t('badges.edit.idHint'))}</small>
      <label>${tbdEsc(t('admin.materials.descOpt'))}<input id="editar-bdesc" maxlength="120" value="${tbdEsc(b.description || '')}" autocomplete="off"></label>
      <p class="profile-edit-error" id="editar-berro" role="alert"></p>
      <footer><button type="button" class="secondary" data-fechar-dialogo>${tbdEsc(t('badges.edit.cancel'))}</button><button type="submit">${tbdEsc(t('admin.modal.saveChanges'))}</button></footer>
    </form></article></dialog>`;
}

// Janela "Gerenciar pessoas": quem já tem o badge vem primeiro e marcado; cada pessoa tem sua nota.
function tbdMembersDialogHTML(b, profiles, grants){
  const holders = new Map((grants || []).filter(g => g.badge_id === b.id).map(g => [g.user_id, g]));
  const sorted = (profiles || []).slice().sort((a, c) => (holders.has(c.user_id) - holders.has(a.user_id)) || String(a.username).localeCompare(String(c.username)));
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return `<dialog id="dlg-membros-badge" class="p-dialogo" aria-labelledby="dlg-membros-badge-t"><article>
    <header><button type="button" rel="prev" aria-label="${tbdEsc(t('common.close'))}" data-fechar-dialogo></button><h3 id="dlg-membros-badge-t">${tbdEsc(b.icon)} ${tbdEsc(b.name)}</h3></header>
    <form id="form-membros-badge" data-id="${tbdEsc(b.id)}" novalidate>
      <small>${tbdEsc(t('admin.modal.manageBadge.hint'))}</small>
      ${sorted.length ? `<input type="search" placeholder="${tbdEsc(t('students.search.placeholder'))}" aria-label="${tbdEsc(t('students.search.aria'))}" data-buscar-membro>
      <fieldset class="p-rolagem p-membros" style="max-height:min(50vh,22rem);overflow:auto">${sorted.map(p => {
        const g = holders.get(p.user_id);
        return `<div class="p-membro" data-membro data-busca="${tbdEsc(norm(`${p.username} ${p.display_name || ''}`))}">
          <label><input type="checkbox" data-user="${tbdEsc(p.user_id)}"${g ? ' checked data-tinha="1"' : ''}> @${tbdEsc(p.username)}${p.display_name ? ` <small>${tbdEsc(p.display_name)}</small>` : ''}</label>
          <input type="text" data-nota-membro="${tbdEsc(p.user_id)}" maxlength="120" value="${tbdEsc(g ? (g.note || '') : '')}" data-nota-original="${tbdEsc(g ? (g.note || '') : '')}" placeholder="${tbdEsc(t('admin.badges.manage.notePh'))}" aria-label="${tbdEsc(t('badges.members.noteAria', { username: p.username }))}">
        </div>`;
      }).join('')}</fieldset>` : `<p class="p-subtitulo">${tbdEsc(t('admin.badges.manage.empty'))}</p>`}
      <p class="profile-edit-error" id="membros-erro" role="alert"></p>
      <footer><button type="button" class="secondary" data-fechar-dialogo>${tbdEsc(t('badges.edit.cancel'))}</button><button type="submit">${tbdEsc(t('admin.modal.saveChanges'))}</button></footer>
    </form></article></dialog>`;
}

function tbdLoadingHTML(){
  return `<div class="painel"><div class="p-pagina"><div class="p-carregando" role="status"><span class="p-spinner" aria-hidden="true"></span><span>${tbdEsc(t('badges.loading'))}</span></div></div></div>`;
}

// Tela completa. st = { catalog, grants, profiles, builtin, filtros }
function tbdPageHTML(st){
  const shown = tbdFilterGrants(st.grants, st.filtros, st.catalog, st.builtin);
  return `<div class="painel"><div class="p-pagina" data-tbd="pagina">
    <header class="p-cabecalho"><div><h2>${tbdEsc(t('badges.title'))}</h2><span class="p-subtitulo">${tbdEsc(t('badges.sub'))}</span></div></header>
    <div class="p-grade-2 p-grade-2--larga">
      <div style="display:grid;gap:1.25rem;min-width:0;align-content:start">
        <section style="display:grid;gap:.75rem"><p class="p-mes">${tbdEsc(t('admin.badges.catalog.title'))}</p><div data-badges-catalogo>${tbdCatalogHTML(st.catalog, st.grants)}</div></section>
        <section style="display:grid;gap:.75rem"><p class="p-mes">${tbdEsc(t('admin.badges.grants.title'))}</p>${tbdFiltersHTML(st.catalog, st.builtin, st.grants, st.filtros)}<div data-badges-concessoes>${tbdGrantsTableHTML(shown, st.grants.length, st.catalog, st.builtin)}</div></section>
        ${tbdBuiltinHTML(st.builtin)}
      </div>
      <aside class="p-lateral">${tbdCreateFormHTML()}${tbdGrantFormHTML(st.catalog, st.profiles)}</aside>
    </div></div></div>`;
}

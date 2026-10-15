// ---------- Notificações (painel de Admin): peças puras de tela ----------
// Dado -> string HTML (sem rede e sem DOM global), no Design System do painel (classes p-*). A orquestração (buscar, salvar,
// diálogos, eventos) fica em shared/admin-notifications.js. Testado em tests/painel-admin/test_notifications_ui_unit.js.
// Todo texto do banco passa por escapeHTML; todo texto visível por t() (chaves notifications.* e admin.notifications.*).
//
// Cada linha de notification_templates é UMA variante de texto de um evento x canal x idioma do app; o motor sorteia uma variante
// ativa a cada envio. A lista agrupa por evento ("as variantes do XP", "as do badge").
//
// Depende de: shared/i18n (t), shared/profile.js (escapeHTML).

function tntEsc(v){ return escapeHTML(v == null ? '' : String(v)); }
function tntLangLabel(k){ return (LanguageRegistry.flagEmoji(k) ? LanguageRegistry.flagEmoji(k) + ' ' : '') + ((LanguageRegistry.byAppKey(k) || {}).name || String(k || '')); }
function tntChannelLabel(c){ return c === 'email' ? t('admin.notifications.channel.emailLower') : t('admin.notifications.channel.inAppLower'); }

// Eventos em ordem natural (user_inactive_3 antes de user_inactive_15).
function tntCompareEvents(a, b){ return String(a).localeCompare(String(b), 'pt', { numeric: true }); }

// Agrupa por evento já aplicando os filtros. labelOf(evento) dá o nome legível; é usado na busca.
function tntGroupTemplates(templates, f, labelOf){
  const q = String(f.busca || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const map = new Map();
  (templates || []).forEach(tpl => {
    if (f.evento && tpl.event_type !== f.evento) return;
    if (f.idioma && tpl.language_app_key !== f.idioma) return;
    if (f.canal && tpl.channel !== f.canal) return;
    if (q){
      const hay = [tpl.title, tpl.body, tpl.event_type, labelOf ? labelOf(tpl.event_type) : ''].join(' ').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
      if (!hay.includes(q)) return;
    }
    if (!map.has(tpl.event_type)) map.set(tpl.event_type, []);
    map.get(tpl.event_type).push(tpl);
  });
  return [...map.entries()].sort((a, b) => tntCompareEvents(a[0], b[0])).map(([eventType, variants]) => ({ eventType, variants }));
}

function tntCardHTML(tpl){
  return `<article class="p-aula p-variante" data-variante="${tntEsc(tpl.id)}"${tpl.active ? '' : ' data-inativa'}>
    <div class="p-aula-dia" aria-hidden="true"><b>${tntEsc(tpl.icon || '🔔')}</b></div>
    <div>${tpl.title ? `<h3>${tntEsc(tpl.title)}</h3>` : ''}<p class="p-material-texto" style="margin-top:${tpl.title ? '.1rem' : '0'}">${tntEsc(tpl.body)}</p>
      <div class="p-material-anexos"><span class="p-selo p-selo--info">${tntEsc(tntChannelLabel(tpl.channel))}</span><span class="p-selo">${tntEsc(tntLangLabel(tpl.language_app_key))}</span>
        <span class="p-selo ${tpl.active ? 'p-selo--ok' : 'p-selo--aviso'}">${tntEsc(tpl.active ? t('admin.notifications.status.active') : t('admin.notifications.status.inactive'))}</span></div></div>
    <details class="p-menu" data-alinhar="fim"><summary role="button" class="outline secondary p-pequeno">${tntEsc(t('notifications.menu'))}</summary>
      <div class="p-menu-lista" role="menu"><button type="button" class="p-menu-item" role="menuitem" data-editar-variante="${tntEsc(tpl.id)}">${tntEsc(t('admin.notifications.btn.edit'))}</button>
      <button type="button" class="p-menu-item" role="menuitem" data-alternar-variante="${tntEsc(tpl.id)}">${tntEsc(tpl.active ? t('admin.notifications.btn.deactivate') : t('admin.notifications.btn.activate'))}</button>
      <div class="p-menu-sep" role="separator"></div>
      <button type="button" class="p-menu-item p-menu-item--perigo" role="menuitem" data-apagar-variante="${tntEsc(tpl.id)}">${tntEsc(t('notifications.delete'))}</button></div></details>
  </article>`;
}

// groups = saída de tntGroupTemplates; total = quantas variantes existem sem filtro (para escolher o texto do vazio).
function tntListHTML(groups, total, labelOf, hintOf){
  if (!groups.length){
    return `<div class="p-vazio"><strong>${tntEsc(t(total ? 'notifications.empty.filtered' : 'admin.notifications.empty'))}</strong>${total ? '' : `<span>${tntEsc(t('notifications.empty.text'))}</span>`}</div>`;
  }
  return groups.map(g => {
    const hint = hintOf ? hintOf(g.eventType) : '';
    return `<section aria-label="${tntEsc(labelOf(g.eventType))}" style="display:grid;gap:.75rem"><p class="p-mes">${tntEsc(labelOf(g.eventType))} <span class="p-selo" style="text-transform:none;letter-spacing:0">${g.variants.length}</span></p>
      ${hint ? `<small class="p-subtitulo" style="margin-top:-.4rem">${tntEsc(hint)}</small>` : ''}${g.variants.map(tntCardHTML).join('')}</section>`;
  }).join('');
}

function tntFiltersHTML(templates, f, labelOf){
  const events = [...new Set((templates || []).map(x => x.event_type))].sort(tntCompareEvents);
  return `<div class="p-ferramentas">
    <select aria-label="${tntEsc(t('notifications.filter.event.aria'))}" data-notif-evento><option value="">${tntEsc(t('notifications.filter.event.all'))}</option>${events.map(e => `<option value="${tntEsc(e)}"${f.evento === e ? ' selected' : ''}>${tntEsc(labelOf(e))}</option>`).join('')}</select>
    <select aria-label="${tntEsc(t('notifications.filter.lang.aria'))}" data-notif-idioma><option value="">${tntEsc(t('notifications.filter.lang.all'))}</option>${LanguageRegistry.enabled().map(l => `<option value="${l.appKey}"${f.idioma === l.appKey ? ' selected' : ''}>${tntEsc(tntLangLabel(l.appKey))}</option>`).join('')}</select>
    <select aria-label="${tntEsc(t('notifications.filter.channel.aria'))}" data-notif-canal><option value="">${tntEsc(t('notifications.filter.channel.all'))}</option><option value="in_app"${f.canal === 'in_app' ? ' selected' : ''}>${tntEsc(t('admin.notifications.new.channelInApp'))}</option><option value="email"${f.canal === 'email' ? ' selected' : ''}>${tntEsc(t('admin.notifications.new.channelEmail'))}</option></select>
    <input class="p-cresce" type="search" placeholder="${tntEsc(t('notifications.search.placeholder'))}" aria-label="${tntEsc(t('notifications.search.aria'))}" value="${tntEsc(f.busca || '')}" data-notif-busca>
  </div>`;
}

function tntNewFormHTML(eventTypes, labelOf){
  return `<article><header><h3>${tntEsc(t('admin.notifications.new.title'))}</h3></header>
    <form id="form-variante" novalidate>
      <label>${tntEsc(t('admin.notifications.new.event'))}<input id="variante-evento" list="variante-eventos" autocomplete="off" placeholder="${tntEsc(t('admin.notifications.new.eventPh'))}"></label>
      <datalist id="variante-eventos">${eventTypes.map(e => `<option value="${tntEsc(e)}">${tntEsc(labelOf(e))}</option>`).join('')}</datalist>
      <div class="p-grade-2" style="gap:.75rem">
        <label>${tntEsc(t('admin.notifications.new.lang'))}<select id="variante-idioma">${LanguageRegistry.enabled().map(l => `<option value="${l.appKey}">${tntEsc(tntLangLabel(l.appKey))}</option>`).join('')}</select></label>
        <label>${tntEsc(t('admin.notifications.new.channel'))}<select id="variante-canal"><option value="in_app">${tntEsc(t('admin.notifications.new.channelInApp'))}</option><option value="email">${tntEsc(t('admin.notifications.new.channelEmail'))}</option></select></label>
      </div>
      <small>${tntEsc(t('admin.notifications.new.hint'))}</small>
      <label>${tntEsc(t('admin.notifications.new.titleLabel'))}<input id="variante-titulo" maxlength="60" autocomplete="off" placeholder="${tntEsc(t('admin.notifications.new.titlePh'))}"></label>
      <label>${tntEsc(t('admin.notifications.new.icon'))}<input id="variante-icone" maxlength="8" autocomplete="off" placeholder="🔔"></label>
      <label>${tntEsc(t('admin.notifications.new.body'))}<textarea id="variante-texto" maxlength="300" rows="3" placeholder="${tntEsc(t('admin.notifications.new.bodyPh'))}"></textarea></label>
      <p class="profile-edit-error" id="variante-erro" role="alert"></p>
      <div class="p-acoes" style="justify-content:flex-end"><button type="reset" class="secondary">${tntEsc(t('notifications.form.clear'))}</button><button type="submit" id="variante-criar">${tntEsc(t('admin.notifications.new.create'))}</button></div>
    </form></article>`;
}

function tntRuleHTML(rule){
  return `<article><header><h3>${tntEsc(t('admin.notifications.rule.title'))}</h3></header>
    <form id="form-regra-xp" novalidate>
      <small>${tntEsc(t('admin.notifications.rule.hint'))}</small>
      <label>${tntEsc(t('admin.notifications.rule.minXp'))}<input type="number" id="regra-minxp" min="0" max="999" value="${rule && rule.min_xp_amount != null ? tntEsc(rule.min_xp_amount) : ''}" placeholder="${tntEsc(t('admin.notifications.rule.minXpPh'))}"></label>
      <label>${tntEsc(t('admin.notifications.rule.cooldown'))}<input type="number" id="regra-intervalo" min="0" max="1440" value="${rule && rule.cooldown_minutes != null ? tntEsc(rule.cooldown_minutes) : 15}"></label>
      <label>${tntEsc(t('admin.notifications.rule.dailyCap'))}<input type="number" id="regra-maximo" min="0" max="99" value="${rule && rule.daily_cap != null ? tntEsc(rule.daily_cap) : 5}"></label>
      <p class="profile-edit-error" id="regra-erro" role="alert"></p>
      <div class="p-acoes" style="justify-content:flex-end"><button type="submit" id="regra-salvar">${tntEsc(t('admin.notifications.rule.save'))}</button></div>
    </form></article>`;
}

function tntEditDialogHTML(tpl, labelOf){
  return `<dialog id="dlg-editar-variante" class="p-dialogo" aria-labelledby="dlg-editar-variante-t"><article>
    <header><button type="button" rel="prev" aria-label="${tntEsc(t('common.close'))}" data-fechar-dialogo></button><h3 id="dlg-editar-variante-t">${tntEsc(t('admin.modal.editTemplate.title'))}</h3></header>
    <form id="form-editar-variante" data-id="${tntEsc(tpl.id)}" novalidate>
      <p class="p-subtitulo" style="margin:0"><b>${tntEsc(labelOf(tpl.event_type))}</b> · ${tntEsc(tntChannelLabel(tpl.channel))} · ${tntEsc(tntLangLabel(tpl.language_app_key))}</p>
      <small>${tntEsc(t('notifications.edit.fixed'))}</small>
      <label>${tntEsc(t('admin.notifications.new.titleLabel'))}<input id="editar-vtitulo" maxlength="60" value="${tntEsc(tpl.title || '')}" autocomplete="off"></label>
      <label>${tntEsc(t('admin.notifications.new.icon'))}<input id="editar-vicone" maxlength="8" value="${tntEsc(tpl.icon || '')}" autocomplete="off"></label>
      <label>${tntEsc(t('admin.notifications.new.body'))}<textarea id="editar-vtexto" maxlength="300" rows="3">${tntEsc(tpl.body || '')}</textarea></label>
      <p class="profile-edit-error" id="editar-verro" role="alert"></p>
      <footer><button type="button" class="secondary" data-fechar-dialogo>${tntEsc(t('notifications.edit.cancel'))}</button><button type="submit">${tntEsc(t('admin.modal.saveChanges'))}</button></footer>
    </form></article></dialog>`;
}

function tntLoadingHTML(){
  return `<div class="painel"><div class="p-pagina"><div class="p-carregando" role="status"><span class="p-spinner" aria-hidden="true"></span><span>${tntEsc(t('notifications.loading'))}</span></div></div></div>`;
}

// Tela completa. st = { templates, filtros, rule, labelOf, hintOf }
function tntPageHTML(st){
  const groups = tntGroupTemplates(st.templates, st.filtros, st.labelOf);
  const events = [...new Set(st.templates.map(x => x.event_type).concat(Object.keys(st.knownEvents || {})))];
  return `<div class="painel"><div class="p-pagina" data-tnt="pagina">
    <header class="p-cabecalho"><div><h2>${tntEsc(t('notifications.title'))}</h2><span class="p-subtitulo">${tntEsc(t('notifications.sub'))}</span></div></header>
    <div class="p-grade-2 p-grade-2--larga">
      <div style="display:grid;gap:1rem;min-width:0;align-content:start">${tntFiltersHTML(st.templates, st.filtros, st.labelOf)}<div data-notif-lista style="display:grid;gap:1rem">${tntListHTML(groups, st.templates.length, st.labelOf, st.hintOf)}</div></div>
      <aside class="p-lateral">${tntNewFormHTML(events, st.labelOf)}${tntRuleHTML(st.rule)}</aside>
    </div></div></div>`;
}

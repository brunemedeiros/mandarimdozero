// ---------- Notificações (admin) -- editor de variantes de texto ----------
// Terceira seção do Painel de Admin (troca gerida por shared/admin-panel.js:switchAdminPanelSection).
// Visual no Design System do painel (shared/admin-notifications-ui.js): lista agrupada por evento com filtros, formulário
// "Nova variante" e regra do XP ao lado, janela de edição e confirmação do painel ao apagar.
// CRUD sobre notification_templates (ver shared/supabase_migrations/
// 010_create_notification_tables.sql e 011_seed_client_event_templates.sql):
// cada linha é UMA variante de texto pra um evento × canal × idioma do app.
// O motor (shared/notifications.js) sorteia uma variante ativa a cada envio
// -- criar várias aqui é o que dá a "lista mais criativa" pedida (seção 13
// da arquitetura aprovada), sem precisar de deploy.
//
// Fase 1: só os 4 eventos "Cliente" têm de fato um gatilho no código (XP,
// badge, desafio, streak -- ver shared/notifications.js e o wiring em
// languages/<lang>/app.js). O calendário de reengajamento (seeds
// user_inactive_1..30 da migration 010) e qualquer evento novo de fases
// futuras (revisão atrasada, streak em risco...) já aparecem/editam aqui
// também -- a tela não hardcoda uma lista fixa de eventos, lista o que
// existir na tabela.
//
// 'push' não aparece aqui como opção de canal -- ele não tem pool de texto
// próprio, "pendura" no texto do in_app do mesmo evento (ver
// shared/notifications.js:fireNotificationEvent e o comentário equivalente
// no cron). 'email' (Fase 5) já tem provedor configurado e pool próprio --
// aparece como opção normal, ao lado de 'in_app'.
//
// Depende de (mesma posição de shared/admin-badges.js -- antes de app.js):
//   - shared/supabase-client.js (supabaseClient)
//   - shared/auth.js            (CURRENT_USER)
//   - shared/toast.js           (showToast)
//   - shared/profile.js         (escapeHTML)
//   - shared/admin-notifications-ui.js, shared/painel/painel-ui.js (PainelUI.confirmar)
//   - languages/<lang>/app.js   (isAdminUser)

const NOTIFICATION_TEMPLATE_EVENT_LABELS = {
  get xp_earned(){ return t('admin.notifications.event.xp_earned'); },
  get achievement_unlocked(){ return t('admin.notifications.event.achievement_unlocked'); },
  get mission_completed(){ return t('admin.notifications.event.mission_completed'); },
  get streak_completed(){ return t('admin.notifications.event.streak_completed'); },
  get featured_badge_reminder(){ return t('admin.notifications.event.featured_badge_reminder'); },
  get user_inactive_1(){ return t('admin.notifications.event.user_inactive_1'); },
  get user_inactive_3(){ return t('admin.notifications.event.user_inactive_3'); },
  get user_inactive_5(){ return t('admin.notifications.event.user_inactive_5'); },
  get user_inactive_7(){ return t('admin.notifications.event.user_inactive_7'); },
  get user_inactive_9(){ return t('admin.notifications.event.user_inactive_9'); },
  get user_inactive_15(){ return t('admin.notifications.event.user_inactive_15'); },
  get user_inactive_20(){ return t('admin.notifications.event.user_inactive_20'); },
  get user_inactive_30(){ return t('admin.notifications.event.user_inactive_30'); },
};

const NOTIFICATION_TEMPLATE_PLACEHOLDER_HINTS = {
  get xp_earned(){ return '{{amount}} -- ' + t('admin.notifications.hint.xp_earned'); },
  get achievement_unlocked(){ return '{{badge_name}} / {{badge_icon}} -- ' + t('admin.notifications.hint.achievement_unlocked'); },
  get mission_completed(){ return '{{mission_label}} / {{mission_icon}} -- ' + t('admin.notifications.hint.mission_completed'); },
  get streak_completed(){ return '{{days}} -- ' + t('admin.notifications.hint.streak_completed'); },
  get featured_badge_reminder(){ return t('admin.notifications.hint.none'); },
};

function notificationTemplateEventLabel(eventType){
  return NOTIFICATION_TEMPLATE_EVENT_LABELS[eventType] || eventType;
}

async function fetchAllNotificationTemplates(){
  const { data, error } = await supabaseClient
    .from('notification_templates')
    .select('*')
    .order('event_type', { ascending: true })
    .order('language_app_key', { ascending: true });
  if (error){ console.error('Erro ao carregar templates de notificação:', error); return []; }
  return data || [];
}

async function createNotificationTemplate({ eventType, languageAppKey, channel, title, body, icon }){
  const cleanEventType = String(eventType || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (cleanEventType.length < 3) return { ok: false, error: t('admin.notifications.err.eventId') };
  if (!body?.trim()) return { ok: false, error: t('admin.notifications.err.bodyRequired') };
  const cleanChannel = channel === 'email' ? 'email' : 'in_app';
  const { data, error } = await supabaseClient
    .from('notification_templates')
    .insert({
      event_type: cleanEventType,
      channel: cleanChannel,
      language_app_key: languageAppKey,
      title: title?.trim() || null,
      body: body.trim().slice(0, 300),
      icon: icon?.trim().slice(0, 8) || null,
      created_by: CURRENT_USER?.email || null,
    })
    .select()
    .single();
  if (error){
    if (error.code === '23505') return { ok: false, error: t('admin.notifications.err.duplicate') };
    console.error('Erro ao criar template de notificação:', error);
    return { ok: false, error: t('admin.notifications.err.createFailed') };
  }
  return { ok: true, template: data };
}

async function updateNotificationTemplate(id, { title, body, icon }){
  if (!body?.trim()) return { ok: false, error: t('admin.notifications.err.bodyRequired') };
  const { data, error } = await supabaseClient
    .from('notification_templates')
    .update({ title: title?.trim() || null, body: body.trim().slice(0, 300), icon: icon?.trim().slice(0, 8) || null })
    .eq('id', id)
    .select()
    .single();
  if (error){
    if (error.code === '23505') return { ok: false, error: t('admin.notifications.err.duplicate') };
    console.error('Erro ao editar template de notificação:', error);
    return { ok: false, error: t('teacherMaterials.err.saveFailed') };
  }
  return { ok: true, template: data };
}

async function toggleNotificationTemplateActive(id, active){
  const { error } = await supabaseClient.from('notification_templates').update({ active }).eq('id', id);
  return { ok: !error };
}

async function deleteNotificationTemplate(id){
  const { error } = await supabaseClient.from('notification_templates').delete().eq('id', id);
  return { ok: !error };
}

// ---------- Regra da categoria "gamificacao" (XP ganho) ----------
// notification_rules (ver shared/supabase_migrations/010 e 016) guarda
// cooldown/limite diário/piso de XP por categoria, mas até aqui só dava
// pra editar por SQL direto. Esta seção cobre só "gamificacao" -- é a
// categoria por trás do evento "XP ganho" e a única com um piso de valor
// (min_xp_amount) fazendo sentido hoje; as outras 8 categorias continuam
// editáveis só por SQL, sem motivo concreto ainda pra dar UI a elas.
async function fetchGamificacaoRule(){
  const { data, error } = await supabaseClient
    .from('notification_rules')
    .select('*')
    .eq('category', 'gamificacao')
    .maybeSingle();
  if (error){ console.error('Erro ao carregar regra de notificação:', error); return null; }
  return data;
}

async function updateGamificacaoRule({ cooldownMinutes, dailyCap, minXpAmount }){
  const { error } = await supabaseClient
    .from('notification_rules')
    .update({ cooldown_minutes: cooldownMinutes, daily_cap: dailyCap, min_xp_amount: minXpAmount })
    .eq('category', 'gamificacao');
  if (error){ console.error('Erro ao salvar regra de notificação:', error); return { ok: false }; }
  // Derruba o cache do motor (shared/notifications.js, carrega antes deste
  // arquivo) -- sem isso, a PRÓPRIA conta admin só veria a mudança valer
  // numa sessão nova, mesmo já tendo salvo.
  NOTIFICATION_RULES_CACHE = null;
  return { ok: true };
}

const NOTIF_VIEW = { templates: [], rule: null, filtros: { evento: '', idioma: '', canal: '', busca: '' }, token: 0, ligado: false };

function notificationsWrap(){ return document.getElementById('admin-notifications-content'); }

function notificationsRefreshList(){
  const box = document.querySelector('[data-notif-lista]');
  if (!box) return;
  const V = NOTIF_VIEW;
  box.innerHTML = tntListHTML(tntGroupTemplates(V.templates, V.filtros, notificationTemplateEventLabel), V.templates.length, notificationTemplateEventLabel, (e) => NOTIFICATION_TEMPLATE_PLACEHOLDER_HINTS[e] || '');
}

// Busca as variantes de novo e atualiza só a lista (e as opções do filtro de evento), sem refazer os formulários.
async function notificationsReload(){
  NOTIF_VIEW.templates = await fetchAllNotificationTemplates();
  const sel = document.querySelector('[data-notif-evento]');
  if (sel){
    const events = [...new Set(NOTIF_VIEW.templates.map(x => x.event_type))].sort(tntCompareEvents);
    if (NOTIF_VIEW.filtros.evento && !events.includes(NOTIF_VIEW.filtros.evento)) NOTIF_VIEW.filtros.evento = '';
    sel.innerHTML = `<option value="">${escapeHTML(t('notifications.filter.event.all'))}</option>` + events.map(e => `<option value="${escapeHTML(e)}"${NOTIF_VIEW.filtros.evento === e ? ' selected' : ''}>${escapeHTML(notificationTemplateEventLabel(e))}</option>`).join('');
  }
  notificationsRefreshList();
}

async function renderAdminNotificationsView(){
  const wrap = notificationsWrap();
  if (!wrap) return;
  if (!isAdminUser()){
    wrap.innerHTML = `<p class="profile-empty-note">${t('admin.common.adminOnly')}</p>`;
    return;
  }
  notificationsBind(wrap);
  const token = ++NOTIF_VIEW.token;
  wrap.innerHTML = tntLoadingHTML();
  const [templates, rule] = await Promise.all([fetchAllNotificationTemplates(), fetchGamificacaoRule()]);
  if (token !== NOTIF_VIEW.token) return;
  NOTIF_VIEW.templates = templates; NOTIF_VIEW.rule = rule;
  wrap.innerHTML = tntPageHTML({ templates, filtros: NOTIF_VIEW.filtros, rule, labelOf: notificationTemplateEventLabel, hintOf: (e) => NOTIFICATION_TEMPLATE_PLACEHOLDER_HINTS[e] || '', knownEvents: NOTIFICATION_TEMPLATE_EVENT_LABELS });
}

async function notificationsCreate(form){
  const btn = document.getElementById('variante-criar'), errorEl = document.getElementById('variante-erro');
  errorEl.textContent = '';
  btn.disabled = true;
  const result = await createNotificationTemplate({
    eventType: document.getElementById('variante-evento').value, languageAppKey: document.getElementById('variante-idioma').value,
    channel: document.getElementById('variante-canal').value, title: document.getElementById('variante-titulo').value,
    body: document.getElementById('variante-texto').value, icon: document.getElementById('variante-icone').value,
  });
  btn.disabled = false;
  if (!result.ok){ errorEl.textContent = result.error; return; }
  showToast(t('admin.notifications.toast.created'));
  form.reset();
  await notificationsReload();
}

async function notificationsSaveRule(){
  const btn = document.getElementById('regra-salvar'), errorEl = document.getElementById('regra-erro');
  errorEl.textContent = '';
  const minXpRaw = document.getElementById('regra-minxp').value;
  btn.disabled = true;
  const result = await updateGamificacaoRule({
    minXpAmount: minXpRaw === '' ? null : parseInt(minXpRaw, 10),
    cooldownMinutes: parseInt(document.getElementById('regra-intervalo').value, 10) || 0,
    dailyCap: parseInt(document.getElementById('regra-maximo').value, 10) || 0,
  });
  btn.disabled = false;
  if (!result.ok){ errorEl.textContent = t('teacherMaterials.err.saveFailed'); return; }
  showToast(t('admin.notifications.toast.ruleSaved'));
}

function notificationsOpenEdit(id){
  const tpl = NOTIF_VIEW.templates.find(x => String(x.id) === String(id));
  const wrap = notificationsWrap(); if (!tpl || !wrap) return;
  const old = document.getElementById('dlg-editar-variante'); if (old) old.remove();
  (wrap.querySelector('.painel') || wrap).insertAdjacentHTML('beforeend', tntEditDialogHTML(tpl, notificationTemplateEventLabel));
  const d = document.getElementById('dlg-editar-variante');
  d.addEventListener('close', () => d.remove());
  d.showModal();
}

async function notificationsSaveEdit(form){
  const errorEl = document.getElementById('editar-verro'); errorEl.textContent = '';
  const result = await updateNotificationTemplate(form.dataset.id, {
    title: document.getElementById('editar-vtitulo').value, icon: document.getElementById('editar-vicone').value, body: document.getElementById('editar-vtexto').value,
  });
  if (!result.ok){ errorEl.textContent = result.error; return; }
  document.getElementById('dlg-editar-variante').close();
  showToast(t('admin.notifications.toast.updated'));
  await notificationsReload();
}

async function notificationsToggle(id){
  const tpl = NOTIF_VIEW.templates.find(x => String(x.id) === String(id)); if (!tpl) return;
  const r = await toggleNotificationTemplateActive(id, !tpl.active);
  if (!r.ok){ showToast(t('plans.failed')); return; }
  await notificationsReload();
}

async function notificationsDelete(id){
  const tpl = NOTIF_VIEW.templates.find(x => String(x.id) === String(id)); if (!tpl) return;
  const opts = { titulo: t('notifications.delete.title'), descricao: t('notifications.delete.text', { text: (tpl.title || tpl.body || '').slice(0, 60) }), confirmar: t('notifications.delete.confirm'), cancelar: t('notifications.edit.cancel'), perigo: true };
  const ok = (window.PainelUI && PainelUI.confirmar) ? await PainelUI.confirmar(opts) : confirm(t('admin.notifications.confirm.delete'));
  if (!ok) return;
  const r = await deleteNotificationTemplate(id);
  if (!r.ok){ showToast(t('plans.failed')); return; }
  await notificationsReload();
}

// Eventos delegados no contêiner da aba: ligados uma vez só.
function notificationsBind(wrap){
  if (NOTIF_VIEW.ligado) return;
  NOTIF_VIEW.ligado = true;
  const V = NOTIF_VIEW;
  wrap.addEventListener('click', (e) => {
    let el;
    if ((el = e.target.closest('[data-editar-variante]'))){ el.closest('details')?.removeAttribute('open'); return notificationsOpenEdit(el.dataset.editarVariante); }
    if ((el = e.target.closest('[data-alternar-variante]'))){ el.closest('details')?.removeAttribute('open'); return notificationsToggle(el.dataset.alternarVariante); }
    if ((el = e.target.closest('[data-apagar-variante]'))){ el.closest('details')?.removeAttribute('open'); return notificationsDelete(el.dataset.apagarVariante); }
  });
  wrap.addEventListener('input', (e) => { if (e.target.matches('[data-notif-busca]')){ V.filtros.busca = e.target.value; notificationsRefreshList(); } });
  wrap.addEventListener('change', (e) => {
    if (e.target.matches('[data-notif-evento]')){ V.filtros.evento = e.target.value; notificationsRefreshList(); }
    else if (e.target.matches('[data-notif-idioma]')){ V.filtros.idioma = e.target.value; notificationsRefreshList(); }
    else if (e.target.matches('[data-notif-canal]')){ V.filtros.canal = e.target.value; notificationsRefreshList(); }
  });
  wrap.addEventListener('submit', (e) => {
    if (e.target.id === 'form-variante'){ e.preventDefault(); notificationsCreate(e.target); }
    else if (e.target.id === 'form-regra-xp'){ e.preventDefault(); notificationsSaveRule(); }
    else if (e.target.id === 'form-editar-variante'){ e.preventDefault(); notificationsSaveEdit(e.target); }
  });
}

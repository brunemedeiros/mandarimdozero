// ---------- Notificações (admin) -- editor de variantes de texto ----------
// Terceira seção do Painel de Admin (Badges / Analytics / Notificações --
// troca gerida por shared/admin-analytics.js:switchAdminPanelSection).
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

async function renderAdminNotificationsView(){
  const wrap = document.getElementById('admin-notifications-content');
  if (!wrap) return;
  if (!isAdminUser()){
    wrap.innerHTML = `<p class="profile-empty-note">${t('admin.common.adminOnly')}</p>`;
    return;
  }
  wrap.innerHTML = loadingHTML();

  const [templates, gamificacaoRule] = await Promise.all([fetchAllNotificationTemplates(), fetchGamificacaoRule()]);

  const eventOptionsHTML = Object.keys(NOTIFICATION_TEMPLATE_EVENT_LABELS).map(ev => `<option value="${ev}">${notificationTemplateEventLabel(ev)}</option>`).join('');

  // Agrupa por evento -- é assim que a autora pensa nisso ("as variantes do
  // XP", "as do badge"), não uma tabela crua linha a linha.
  const byEvent = new Map();
  templates.forEach(tpl => {
    if (!byEvent.has(tpl.event_type)) byEvent.set(tpl.event_type, []);
    byEvent.get(tpl.event_type).push(tpl);
  });

  const groupsHTML = byEvent.size ? [...byEvent.entries()].map(([eventType, variants]) => {
    const hint = NOTIFICATION_TEMPLATE_PLACEHOLDER_HINTS[eventType];
    const rowsHTML = variants.map(tpl => `
      <div class="admin-badge-row" data-template-id="${tpl.id}">
        <span class="admin-badge-icon">${tpl.icon || '🔔'}</span>
        <div class="admin-badge-info">
          <div class="admin-badge-name">${tpl.channel === 'email' ? '📧' : '📱'} ${tpl.language_app_key === 'frances' ? '🇫🇷' : '🇨🇳'} ${tpl.title ? escapeHTML(tpl.title) + ' -- ' : ''}${escapeHTML(tpl.body)}</div>
          <div class="admin-badge-desc">${tpl.channel === 'email' ? t('admin.notifications.channel.emailLower') : t('admin.notifications.channel.inAppLower')} · ${tpl.active ? t('admin.notifications.status.active') : t('admin.notifications.status.inactive')}</div>
        </div>
        <button class="admin-badge-edit-btn" data-template-toggle="${tpl.id}" data-template-active="${tpl.active}" title="${tpl.active ? t('admin.notifications.btn.deactivate') : t('admin.notifications.btn.activate')}">${tpl.active ? '👁️' : '🚫'}</button>
        <button class="admin-badge-edit-btn" data-template-edit="${tpl.id}" title="${t('admin.notifications.btn.edit')}">✏️</button>
        <button class="admin-badge-delete-btn" data-template-delete="${tpl.id}" title="${t('admin.notifications.btn.delete')}">🗑️</button>
      </div>
    `).join('');
    return `
      <div class="profile-section">
        <div class="section-label">${notificationTemplateEventLabel(eventType)}</div>
        ${hint ? `<p class="profile-edit-hint">${hint}</p>` : ''}
        ${rowsHTML}
      </div>
    `;
  }).join('') : `<p class="profile-empty-note">${t('admin.notifications.empty')}</p>`;

  wrap.innerHTML = `
    <div class="profile-section">
      <div class="section-label">${t('admin.notifications.rule.title')}</div>
      <p class="profile-edit-hint">${t('admin.notifications.rule.hint')}</p>
      <form id="admin-gamificacao-rule-form" class="profile-edit-form">
        <label class="profile-edit-label" for="admin-rule-min-xp">${t('admin.notifications.rule.minXp')}</label>
        <input type="number" id="admin-rule-min-xp" class="profile-edit-input" min="0" max="999" value="${gamificacaoRule?.min_xp_amount ?? ''}" placeholder="${t('admin.notifications.rule.minXpPh')}">
        <label class="profile-edit-label" for="admin-rule-cooldown">${t('admin.notifications.rule.cooldown')}</label>
        <input type="number" id="admin-rule-cooldown" class="profile-edit-input" min="0" max="1440" value="${gamificacaoRule?.cooldown_minutes ?? 15}">
        <label class="profile-edit-label" for="admin-rule-daily-cap">${t('admin.notifications.rule.dailyCap')}</label>
        <input type="number" id="admin-rule-daily-cap" class="profile-edit-input" min="0" max="99" value="${gamificacaoRule?.daily_cap ?? 5}">
        <p class="profile-edit-error" id="admin-gamificacao-rule-error"></p>
        <button type="submit" class="btn btn-primary btn-block" id="admin-gamificacao-rule-save-btn">${t('admin.notifications.rule.save')}</button>
      </form>
    </div>
    <div class="profile-section">
      <div class="section-label">${t('admin.notifications.new.title')}</div>
      <form id="admin-create-template-form" class="profile-edit-form">
        <label class="profile-edit-label" for="admin-template-event">${t('admin.notifications.new.event')}</label>
        <input type="text" id="admin-template-event" class="profile-edit-input" list="admin-template-event-datalist" placeholder="${t('admin.notifications.new.eventPh')}">
        <datalist id="admin-template-event-datalist">${eventOptionsHTML}</datalist>
        <label class="profile-edit-label" for="admin-template-lang">${t('admin.notifications.new.lang')}</label>
        <select id="admin-template-lang" class="profile-edit-input">
          <option value="frances">${t('admin.notifications.new.langFr')}</option>
          <option value="mandarim">${t('admin.notifications.new.langZh')}</option>
        </select>
        <label class="profile-edit-label" for="admin-template-channel">${t('admin.notifications.new.channel')}</label>
        <select id="admin-template-channel" class="profile-edit-input">
          <option value="in_app">${t('admin.notifications.new.channelInApp')}</option>
          <option value="email">${t('admin.notifications.new.channelEmail')}</option>
        </select>
        <p class="profile-edit-hint">${t('admin.notifications.new.hint')}</p>
        <label class="profile-edit-label" for="admin-template-title">${t('admin.notifications.new.titleLabel')}</label>
        <input type="text" id="admin-template-title" class="profile-edit-input" maxlength="60" placeholder="${t('admin.notifications.new.titlePh')}">
        <label class="profile-edit-label" for="admin-template-icon">${t('admin.notifications.new.icon')}</label>
        <input type="text" id="admin-template-icon" class="profile-edit-input" maxlength="8" placeholder="🔔">
        <label class="profile-edit-label" for="admin-template-body">${t('admin.notifications.new.body')}</label>
        <textarea id="admin-template-body" class="profile-edit-textarea" maxlength="300" rows="2" placeholder="${t('admin.notifications.new.bodyPh')}"></textarea>
        <p class="profile-edit-error" id="admin-create-template-error"></p>
        <button type="submit" class="btn btn-primary btn-block" id="admin-create-template-btn">${t('admin.notifications.new.create')}</button>
      </form>
    </div>
    ${groupsHTML}
  `;

  document.getElementById('admin-gamificacao-rule-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('admin-gamificacao-rule-save-btn');
    const errorEl = document.getElementById('admin-gamificacao-rule-error');
    errorEl.textContent = '';
    const minXpRaw = document.getElementById('admin-rule-min-xp').value;
    btn.disabled = true;
    const result = await updateGamificacaoRule({
      minXpAmount: minXpRaw === '' ? null : parseInt(minXpRaw, 10),
      cooldownMinutes: parseInt(document.getElementById('admin-rule-cooldown').value, 10) || 0,
      dailyCap: parseInt(document.getElementById('admin-rule-daily-cap').value, 10) || 0,
    });
    btn.disabled = false;
    if (!result.ok){ errorEl.textContent = t('teacherMaterials.err.saveFailed'); return; }
    showToast(t('admin.notifications.toast.ruleSaved'));
  });

  document.getElementById('admin-create-template-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('admin-create-template-btn');
    const errorEl = document.getElementById('admin-create-template-error');
    errorEl.textContent = '';
    btn.disabled = true;
    const result = await createNotificationTemplate({
      eventType: document.getElementById('admin-template-event').value,
      languageAppKey: document.getElementById('admin-template-lang').value,
      channel: document.getElementById('admin-template-channel').value,
      title: document.getElementById('admin-template-title').value,
      body: document.getElementById('admin-template-body').value,
      icon: document.getElementById('admin-template-icon').value,
    });
    btn.disabled = false;
    if (!result.ok){ errorEl.textContent = result.error; return; }
    showToast(t('admin.notifications.toast.created'));
    renderAdminNotificationsView();
  });

  wrap.querySelectorAll('[data-template-toggle]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await toggleNotificationTemplateActive(btn.dataset.templateToggle, btn.dataset.templateActive !== 'true');
      renderAdminNotificationsView();
    });
  });

  wrap.querySelectorAll('[data-template-delete]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm(t('admin.notifications.confirm.delete'))) return;
      await deleteNotificationTemplate(btn.dataset.templateDelete);
      renderAdminNotificationsView();
    });
  });

  wrap.querySelectorAll('[data-template-edit]').forEach(btn => {
    btn.addEventListener('click', () => {
      const t = templates.find(x => String(x.id) === btn.dataset.templateEdit);
      if (t) openEditNotificationTemplateModal(t);
    });
  });
}

// Modal simples de edição -- só título/emoji/texto (evento/canal/idioma não
// mudam depois de criado: trocar o evento de uma variante já existente
// mudaria o sentido dela; é mais claro criar uma nova e apagar a antiga).
function openEditNotificationTemplateModal(template){
  const modal = document.getElementById('admin-edit-template-modal');
  modal.dataset.templateId = template.id;
  document.getElementById('admin-edit-template-title').value = template.title || '';
  document.getElementById('admin-edit-template-icon').value = template.icon || '';
  document.getElementById('admin-edit-template-body').value = template.body || '';
  document.getElementById('admin-edit-template-error').textContent = '';
  modal.style.display = 'flex';
}

function closeEditNotificationTemplateModal(){
  document.getElementById('admin-edit-template-modal').style.display = 'none';
}

function wireEditNotificationTemplateModal(){
  const modal = document.getElementById('admin-edit-template-modal');
  if (!modal) return;

  document.getElementById('admin-edit-template-modal-close').addEventListener('click', closeEditNotificationTemplateModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeEditNotificationTemplateModal(); });

  document.getElementById('admin-edit-template-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('admin-edit-template-save-btn');
    const errorEl = document.getElementById('admin-edit-template-error');
    errorEl.textContent = '';
    btn.disabled = true;
    const result = await updateNotificationTemplate(modal.dataset.templateId, {
      title: document.getElementById('admin-edit-template-title').value,
      icon: document.getElementById('admin-edit-template-icon').value,
      body: document.getElementById('admin-edit-template-body').value,
    });
    btn.disabled = false;
    if (!result.ok){ errorEl.textContent = result.error; return; }
    closeEditNotificationTemplateModal();
    showToast(t('admin.notifications.toast.updated'));
    renderAdminNotificationsView();
  });
}

wireEditNotificationTemplateModal();

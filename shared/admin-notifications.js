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
  xp_earned: '⭐ XP ganho',
  achievement_unlocked: '🏅 Badge desbloqueado',
  challenge_completed: '🎯 Desafio concluído',
  streak_completed: '🔥 Sequência mantida',
  user_inactive_1: '👋 Reengajamento -- 1 dia sumida',
  user_inactive_3: '👋 Reengajamento -- 3 dias sumida',
  user_inactive_5: '👋 Reengajamento -- 5 dias sumida',
  user_inactive_7: '👋 Reengajamento -- 7 dias sumida',
  user_inactive_9: '👋 Reengajamento -- 9 dias sumida',
  user_inactive_15: '👋 Reengajamento -- 15 dias sumida',
  user_inactive_20: '👋 Reengajamento -- 20 dias sumida',
  user_inactive_30: '👋 Reengajamento -- 30 dias sumida',
};

const NOTIFICATION_TEMPLATE_PLACEHOLDER_HINTS = {
  xp_earned: '{{amount}} -- quantidade de XP ganho',
  achievement_unlocked: '{{badge_name}} / {{badge_icon}} -- nome e emoji do badge',
  challenge_completed: '(sem placeholders -- desafios não têm um título único e estável)',
  streak_completed: '{{days}} -- dias de sequência',
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
  if (cleanEventType.length < 3) return { ok: false, error: 'Dê um identificador de evento válido (ex: xp_earned).' };
  if (!body?.trim()) return { ok: false, error: 'Escreva o texto da notificação.' };
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
    if (error.code === '23505') return { ok: false, error: 'Já existe uma variante idêntica (mesmo evento/canal/idioma/texto).' };
    console.error('Erro ao criar template de notificação:', error);
    return { ok: false, error: 'Não foi possível criar agora.' };
  }
  return { ok: true, template: data };
}

async function updateNotificationTemplate(id, { title, body, icon }){
  if (!body?.trim()) return { ok: false, error: 'Escreva o texto da notificação.' };
  const { data, error } = await supabaseClient
    .from('notification_templates')
    .update({ title: title?.trim() || null, body: body.trim().slice(0, 300), icon: icon?.trim().slice(0, 8) || null })
    .eq('id', id)
    .select()
    .single();
  if (error){
    if (error.code === '23505') return { ok: false, error: 'Já existe uma variante idêntica (mesmo evento/canal/idioma/texto).' };
    console.error('Erro ao editar template de notificação:', error);
    return { ok: false, error: 'Não foi possível salvar agora.' };
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
    wrap.innerHTML = `<p class="profile-empty-note">Esta tela é só pra administração da plataforma.</p>`;
    return;
  }
  wrap.innerHTML = loadingHTML();

  const [templates, gamificacaoRule] = await Promise.all([fetchAllNotificationTemplates(), fetchGamificacaoRule()]);

  const eventOptionsHTML = Object.keys(NOTIFICATION_TEMPLATE_EVENT_LABELS).map(ev => `<option value="${ev}">${notificationTemplateEventLabel(ev)}</option>`).join('');

  // Agrupa por evento -- é assim que a autora pensa nisso ("as variantes do
  // XP", "as do badge"), não uma tabela crua linha a linha.
  const byEvent = new Map();
  templates.forEach(t => {
    if (!byEvent.has(t.event_type)) byEvent.set(t.event_type, []);
    byEvent.get(t.event_type).push(t);
  });

  const groupsHTML = byEvent.size ? [...byEvent.entries()].map(([eventType, variants]) => {
    const hint = NOTIFICATION_TEMPLATE_PLACEHOLDER_HINTS[eventType];
    const rowsHTML = variants.map(t => `
      <div class="admin-badge-row" data-template-id="${t.id}">
        <span class="admin-badge-icon">${t.icon || '🔔'}</span>
        <div class="admin-badge-info">
          <div class="admin-badge-name">${t.channel === 'email' ? '📧' : '📱'} ${t.language_app_key === 'frances' ? '🇫🇷' : '🇨🇳'} ${t.title ? escapeHTML(t.title) + ' -- ' : ''}${escapeHTML(t.body)}</div>
          <div class="admin-badge-desc">${t.channel === 'email' ? 'e-mail' : 'no app'} · ${t.active ? 'ativa' : 'desativada'}</div>
        </div>
        <button class="admin-badge-edit-btn" data-template-toggle="${t.id}" data-template-active="${t.active}" title="${t.active ? 'Desativar' : 'Ativar'}">${t.active ? '👁️' : '🚫'}</button>
        <button class="admin-badge-edit-btn" data-template-edit="${t.id}" title="Editar">✏️</button>
        <button class="admin-badge-delete-btn" data-template-delete="${t.id}" title="Excluir">🗑️</button>
      </div>
    `).join('');
    return `
      <div class="profile-section">
        <div class="section-label">${notificationTemplateEventLabel(eventType)}</div>
        ${hint ? `<p class="profile-edit-hint">${hint}</p>` : ''}
        ${rowsHTML}
      </div>
    `;
  }).join('') : `<p class="profile-empty-note">Nenhuma variante criada ainda.</p>`;

  wrap.innerHTML = `
    <div class="profile-section">
      <div class="section-label">⭐ Regra de "XP ganho"</div>
      <p class="profile-edit-hint">Controla quando a notificação de XP dispara -- não o texto dela (isso fica nas variantes abaixo). Revisões de palavras já bem sabidas dão XP bem baixo de propósito; abaixo do mínimo, a notificação nem é criada.</p>
      <form id="admin-gamificacao-rule-form" class="profile-edit-form">
        <label class="profile-edit-label" for="admin-rule-min-xp">XP mínimo pra notificar</label>
        <input type="number" id="admin-rule-min-xp" class="profile-edit-input" min="0" max="999" value="${gamificacaoRule?.min_xp_amount ?? ''}" placeholder="ex: 5 (0 ou vazio = sem piso)">
        <label class="profile-edit-label" for="admin-rule-cooldown">Intervalo mínimo entre notificações (minutos)</label>
        <input type="number" id="admin-rule-cooldown" class="profile-edit-input" min="0" max="1440" value="${gamificacaoRule?.cooldown_minutes ?? 15}">
        <label class="profile-edit-label" for="admin-rule-daily-cap">Máximo por dia</label>
        <input type="number" id="admin-rule-daily-cap" class="profile-edit-input" min="0" max="99" value="${gamificacaoRule?.daily_cap ?? 5}">
        <p class="profile-edit-error" id="admin-gamificacao-rule-error"></p>
        <button type="submit" class="btn btn-primary btn-block" id="admin-gamificacao-rule-save-btn">Salvar regra</button>
      </form>
    </div>
    <div class="profile-section">
      <div class="section-label">Nova variante</div>
      <form id="admin-create-template-form" class="profile-edit-form">
        <label class="profile-edit-label" for="admin-template-event">Evento</label>
        <input type="text" id="admin-template-event" class="profile-edit-input" list="admin-template-event-datalist" placeholder="ex: xp_earned">
        <datalist id="admin-template-event-datalist">${eventOptionsHTML}</datalist>
        <label class="profile-edit-label" for="admin-template-lang">Idioma do app</label>
        <select id="admin-template-lang" class="profile-edit-input">
          <option value="frances">🇫🇷 Francês</option>
          <option value="mandarim">🇨🇳 Mandarim</option>
        </select>
        <label class="profile-edit-label" for="admin-template-channel">Canal</label>
        <select id="admin-template-channel" class="profile-edit-input">
          <option value="in_app">📱 No app</option>
          <option value="email">📧 E-mail</option>
        </select>
        <p class="profile-edit-hint">Push não aparece aqui -- ele reaproveita o texto da variante "No app" do mesmo evento, sem pool próprio. No e-mail, o título vira o assunto. Placeholders tipo {{amount}}/{{days}} são substituídos pelo dado real do evento -- veja a dica de cada evento acima.</p>
        <label class="profile-edit-label" for="admin-template-title">Título (opcional)</label>
        <input type="text" id="admin-template-title" class="profile-edit-input" maxlength="60" placeholder="ex: Nova conquista!">
        <label class="profile-edit-label" for="admin-template-icon">Emoji (opcional)</label>
        <input type="text" id="admin-template-icon" class="profile-edit-input" maxlength="8" placeholder="🔔">
        <label class="profile-edit-label" for="admin-template-body">Texto</label>
        <textarea id="admin-template-body" class="profile-edit-textarea" maxlength="300" rows="2" placeholder="Ei, você esqueceu de mim? 🥺"></textarea>
        <p class="profile-edit-error" id="admin-create-template-error"></p>
        <button type="submit" class="btn btn-primary btn-block" id="admin-create-template-btn">Criar variante</button>
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
    if (!result.ok){ errorEl.textContent = 'Não foi possível salvar agora.'; return; }
    showToast('✓ Regra salva.');
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
    showToast('✓ Variante criada.');
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
      if (!confirm('Excluir esta variante de notificação?')) return;
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
    showToast('✓ Variante atualizada.');
    renderAdminNotificationsView();
  });
}

wireEditNotificationTemplateModal();

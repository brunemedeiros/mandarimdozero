// ---------- Preferências de notificação (Configurações > Notificações) ----------
// Fase 2: modo simples (interruptores mestre + horário silencioso) por
// cima de uma matriz avançada por categoria (seção 10 da arquitetura
// aprovada) -- a matriz é o dado real (notification_preferences.channels,
// ver migration 010), os interruptores mestre são atalhos que ligam/
// desligam um canal em todas as categorias de uma vez.
//
// Fase 3: o toggle de push virou de verdade -- liga a inscrição deste
// NAVEGADOR (shared/push.js) além de marcar a preferência da conta.
//
// Fase 5: o toggle de e-mail também virou de verdade. Mais simples que
// push -- e-mail não depende de permissão de navegador nem de inscrição
// local, é só a preferência da conta mesmo (mesmo tipo de toggle que
// in_app). Vai pro endereço já cadastrado na conta (Supabase Auth), sem
// campo novo pra digitar aqui.
//
// Depende de (mesma posição de shared/notifications.js -- antes de app.js):
//   - shared/supabase-client.js (supabaseClient)
//   - shared/auth.js            (CURRENT_USER)
//   - shared/toast.js           (showToast)
//   - shared/notifications.js   (ensureNotificationPreferencesLoaded)
//   - shared/push.js            (subscribeToPush, unsubscribeFromPush, getLocalPushSubscription)

// Omite "sistema" da lista? Não -- mantido, é uma categoria real (ver
// notification_rules, seed da 010) e a pessoa pode preferir não receber
// nem avisos de sistema no sino. "Social" não existe (ver seção 4 da
// arquitetura: sem recurso social hoje, sem preferência pra configurar).
const NOTIFICATION_PREF_CATEGORIES = [
  { id: 'estudo', labelKey: 'notif.cat.estudo' },
  { id: 'revisao', labelKey: 'notif.cat.revisao' },
  { id: 'streak', labelKey: 'notif.cat.streak' },
  { id: 'gamificacao', labelKey: 'notif.cat.gamificacao' },
  { id: 'ranking', labelKey: 'notif.cat.ranking' },
  { id: 'desafios', labelKey: 'notif.cat.desafios' },
  { id: 'conteudo', labelKey: 'notif.cat.conteudo' },
  { id: 'reengajamento', labelKey: 'notif.cat.reengajamento' },
  { id: 'sistema', labelKey: 'notif.cat.sistema' },
];

function notifPrefHourOptionsHTML(selected){
  const sel = selected === null || selected === undefined ? '' : String(selected);
  let html = `<option value="">--</option>`;
  for (let h = 0; h < 24; h++){
    html += `<option value="${h}" ${String(h) === sel ? 'selected' : ''}>${String(h).padStart(2, '0')}:00</option>`;
  }
  return html;
}

async function renderNotificationPreferencesView(){
  const wrap = document.getElementById('settings-notifications-content');
  if (!wrap) return;
  if (typeof CURRENT_USER === 'undefined' || !CURRENT_USER){
    wrap.innerHTML = `<p class="profile-empty-note">${t('notif.pref.guest')}</p>`;
    return;
  }
  wrap.innerHTML = loadingHTML();
  const prefs = await ensureNotificationPreferencesLoaded(true);
  if (!prefs){
    wrap.innerHTML = `<p class="profile-empty-note">${t('notif.pref.loadFailed')}</p>`;
    return;
  }

  // Push é por NAVEGADOR (ver shared/push.js), não por conta -- o estado do
  // toggle mestre reflete se ESTE navegador está inscrito de verdade, não
  // só se a categoria "permite" push (que pode estar assim de fábrica sem
  // nunca ter sido ativado aqui, ver notification_preferences default na
  // migration 010).
  const localPushSubscription = typeof getLocalPushSubscription === 'function' ? await getLocalPushSubscription() : null;
  const pushSubscribedHere = !!localPushSubscription;

  const anyInAppOn = NOTIFICATION_PREF_CATEGORIES.some(c => (prefs.channels?.[c.id] || []).includes('in_app'));
  const anyEmailOn = NOTIFICATION_PREF_CATEGORIES.some(c => (prefs.channels?.[c.id] || []).includes('email'));

  const matrixRowsHTML = NOTIFICATION_PREF_CATEGORIES.map(c => {
    const inAppChecked = (prefs.channels?.[c.id] || []).includes('in_app') ? 'checked' : '';
    const pushChecked = (prefs.channels?.[c.id] || []).includes('push') ? 'checked' : '';
    const emailChecked = (prefs.channels?.[c.id] || []).includes('email') ? 'checked' : '';
    return `
      <div class="notif-pref-matrix-row">
        <span class="notif-pref-matrix-label">${t(c.labelKey)}</span>
        <label class="notif-pref-matrix-cell" title="${t('notif.pref.titleMatrixInApp')}"><input type="checkbox" data-pref-category="${c.id}" data-pref-channel="in_app" ${inAppChecked}></label>
        <label class="notif-pref-matrix-cell" title="${t('notif.pref.titleMatrixPush')}"><input type="checkbox" data-pref-category="${c.id}" data-pref-channel="push" ${pushChecked}></label>
        <label class="notif-pref-matrix-cell" title="${t('notif.pref.titleMatrixEmail')}"><input type="checkbox" data-pref-category="${c.id}" data-pref-channel="email" ${emailChecked}></label>
      </div>
    `;
  }).join('');

  wrap.innerHTML = `
    <div class="section-label">${t('notif.pref.sectionTitle')}</div>
    <div class="pref-row">
      <div class="pref-row-text">
        <div class="pref-row-title">${t('notif.pref.inApp.title')}</div>
        <div class="pref-row-sub">${t('notif.pref.inApp.sub')}</div>
      </div>
      <button class="pref-switch" id="notif-pref-inapp-switch" role="switch" aria-checked="${anyInAppOn}"><span class="pref-switch-knob"></span></button>
    </div>
    <div class="pref-row">
      <div class="pref-row-text">
        <div class="pref-row-title">${t('notif.pref.push.title')}</div>
        <div class="pref-row-sub">${t('notif.pref.push.sub')}</div>
      </div>
      <button class="pref-switch" id="notif-pref-push-switch" role="switch" aria-checked="${pushSubscribedHere}"><span class="pref-switch-knob"></span></button>
    </div>
    <div class="pref-row">
      <div class="pref-row-text">
        <div class="pref-row-title">${t('notif.pref.email.title')}</div>
        <div class="pref-row-sub">${t('notif.pref.email.sub')}</div>
      </div>
      <button class="pref-switch" id="notif-pref-email-switch" role="switch" aria-checked="${anyEmailOn}"><span class="pref-switch-knob"></span></button>
    </div>

    <div class="section-label">${t('notif.pref.quiet.section')}</div>
    <div class="pref-row">
      <div class="pref-row-text">
        <div class="pref-row-title">${t('notif.pref.quiet.title')}</div>
        <div class="pref-row-sub">${t('notif.pref.quiet.sub')}</div>
      </div>
      <div class="notif-pref-quiet-hours">
        <select id="notif-pref-quiet-start" aria-label="${t('notif.pref.quiet.startAria')}">${notifPrefHourOptionsHTML(prefs.quiet_hours_start)}</select>
        <span>${t('notif.pref.quiet.until')}</span>
        <select id="notif-pref-quiet-end" aria-label="${t('notif.pref.quiet.endAria')}">${notifPrefHourOptionsHTML(prefs.quiet_hours_end)}</select>
      </div>
    </div>

    <details class="notif-pref-advanced">
      <summary>${t('notif.pref.advanced.summary')}</summary>
      <div class="notif-pref-matrix">
        <div class="notif-pref-matrix-row notif-pref-matrix-head">
          <span class="notif-pref-matrix-label"></span>
          <span class="notif-pref-matrix-cell">${t('notif.pref.matrix.app')}</span>
          <span class="notif-pref-matrix-cell">${t('notif.pref.matrix.push')}</span>
          <span class="notif-pref-matrix-cell">${t('notif.pref.matrix.email')}</span>
        </div>
        ${matrixRowsHTML}
      </div>
    </details>
  `;

  document.getElementById('notif-pref-inapp-switch').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const turningOn = btn.getAttribute('aria-checked') !== 'true';
    btn.setAttribute('aria-checked', String(turningOn));
    await setAllCategoriesChannel('in_app', turningOn);
    renderNotificationPreferencesView();
  });

  document.getElementById('notif-pref-push-switch').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const turningOn = btn.getAttribute('aria-checked') !== 'true';
    btn.disabled = true;
    if (turningOn){
      const result = await subscribeToPush();
      if (!result.ok){
        showToast(notificationPushErrorMessage(result.reason));
        btn.disabled = false;
        return;
      }
      await setAllCategoriesChannel('push', true);
      showToast(t('notif.pref.toast.pushOn'));
    } else {
      await unsubscribeFromPush();
      await setAllCategoriesChannel('push', false);
      showToast(t('notif.pref.toast.pushOff'));
    }
    renderNotificationPreferencesView();
  });

  document.getElementById('notif-pref-email-switch').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const turningOn = btn.getAttribute('aria-checked') !== 'true';
    btn.setAttribute('aria-checked', String(turningOn));
    await setAllCategoriesChannel('email', turningOn);
    renderNotificationPreferencesView();
  });

  wrap.querySelectorAll('[data-pref-category]').forEach(input => {
    input.addEventListener('change', () => setCategoryChannel(input.dataset.prefCategory, input.dataset.prefChannel, input.checked));
  });

  ['notif-pref-quiet-start', 'notif-pref-quiet-end'].forEach(id => {
    document.getElementById(id).addEventListener('change', saveNotificationQuietHours);
  });
}

function notificationPushErrorMessage(reason){
  switch (reason){
    case 'unsupported': return t('notif.pref.push.unsupported');
    case 'blocked': return t('notif.pref.push.blocked');
    case 'denied': return t('notif.pref.push.denied');
    default: return t('notif.pref.push.error');
  }
}

async function saveNotificationPreferenceChannels(channels){
  const { error } = await supabaseClient.from('notification_preferences').update({ channels }).eq('user_id', CURRENT_USER.id);
  if (error){ console.error('Erro ao salvar preferências de notificação:', error); return false; }
  if (NOTIFICATION_PREFERENCES_CACHE) NOTIFICATION_PREFERENCES_CACHE.channels = channels;
  return true;
}

async function setCategoryChannel(category, channel, enabled){
  const prefs = await ensureNotificationPreferencesLoaded();
  if (!prefs) return;
  const channels = { ...(prefs.channels || {}) };
  const current = new Set(channels[category] || []);
  if (enabled) current.add(channel); else current.delete(channel);
  channels[category] = [...current];
  await saveNotificationPreferenceChannels(channels);
}

async function setAllCategoriesChannel(channel, enabled){
  const prefs = await ensureNotificationPreferencesLoaded();
  if (!prefs) return;
  const channels = { ...(prefs.channels || {}) };
  NOTIFICATION_PREF_CATEGORIES.forEach(c => {
    const current = new Set(channels[c.id] || []);
    if (enabled) current.add(channel); else current.delete(channel);
    channels[c.id] = [...current];
  });
  await saveNotificationPreferenceChannels(channels);
}

async function saveNotificationQuietHours(){
  const startVal = document.getElementById('notif-pref-quiet-start').value;
  const endVal = document.getElementById('notif-pref-quiet-end').value;
  const payload = {
    quiet_hours_start: startVal === '' ? null : parseInt(startVal, 10),
    quiet_hours_end: endVal === '' ? null : parseInt(endVal, 10),
  };
  const { error } = await supabaseClient.from('notification_preferences').update(payload).eq('user_id', CURRENT_USER.id);
  if (error){ console.error('Erro ao salvar horário silencioso:', error); return; }
  if (NOTIFICATION_PREFERENCES_CACHE) Object.assign(NOTIFICATION_PREFERENCES_CACHE, payload);
  showToast(t('notif.pref.toast.saved'));
}

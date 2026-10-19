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
  // Amigos (073/074; push desde a 102): sino + push na hora (fila push_outbox + Edge Function push-dispatch).
  // Sem e-mail. Sem preferência salva o servidor entrega no sino E por push (para quem tem aparelho inscrito),
  // então a matriz mostra os dois ligados -- ver notifPrefEffectiveChannels.
  { id: 'amigos', labelKey: 'notif.cat.amigos', noEmail: true, defaultChannels: ['in_app', 'push'] },
];

// Canais efetivos de uma categoria: o que está salvo; para categoria só-in_app
// sem nada salvo, o padrão do servidor (ligado) -- evita mostrar desmarcado
// algo que na verdade chega.
function notifPrefEffectiveChannels(prefs, c){
  const saved = prefs && prefs.channels ? prefs.channels[c.id] : undefined;
  if (Array.isArray(saved)) return c.inAppOnly ? saved.filter(ch => ch === 'in_app') : (c.noEmail ? saved.filter(ch => ch !== 'email') : saved);
  return c.inAppOnly ? ['in_app'] : (c.defaultChannels ? [...c.defaultChannels] : []);
}
// Canal que a categoria não tem (desligado na matriz e ignorado pelos botões gerais).
function notifPrefChannelMissing(c, channel){
  return (c.inAppOnly && channel !== 'in_app') || (c.noEmail && channel === 'email');
}

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

  const anyInAppOn = NOTIFICATION_PREF_CATEGORIES.some(c => notifPrefEffectiveChannels(prefs, c).includes('in_app'));
  const anyEmailOn = NOTIFICATION_PREF_CATEGORIES.filter(c => !c.inAppOnly && !c.noEmail).some(c => (prefs.channels?.[c.id] || []).includes('email'));

  // Design System do painel (Pico escopado em .painel, 2026-10-17): blocos <article>, interruptores
  // input[role=switch] e a matriz por categoria numa tabela. Ids e data-pref-* continuam os mesmos.
  const matrixRowsHTML = NOTIFICATION_PREF_CATEGORIES.map(c => {
    const eff = notifPrefEffectiveChannels(prefs, c);
    const label = t(c.labelKey);
    const cell = (channel, titleKey, offAttr) => `<td><input type="checkbox" data-pref-category="${c.id}" data-pref-channel="${channel}" ${eff.includes(channel) ? 'checked' : ''} ${offAttr} aria-label="${escapeHTML(label + ': ' + t(titleKey))}"></td>`;
    const offAttr = c.inAppOnly ? `disabled title="${t('notif.pref.inAppOnly')}"` : '';
    const emailOffAttr = c.noEmail ? `disabled title="${t('notif.pref.noEmail')}"` : offAttr;
    return `
      <tr>
        <th scope="row">${label}</th>
        ${cell('in_app', 'notif.pref.matrix.app', '')}
        ${cell('push', 'notif.pref.matrix.push', offAttr)}
        ${cell('email', 'notif.pref.matrix.email', emailOffAttr)}
      </tr>
    `;
  }).join('');

  const switchRow = (id, titleKey, subKey, on) => `
      <label class="pref-row p-linha-opcao">
        <span class="pref-row-text">
          <span class="pref-row-title">${t(titleKey)}</span>
          <span class="pref-row-sub">${t(subKey)}</span>
        </span>
        <input type="checkbox" role="switch" id="${id}" ${on ? 'checked' : ''} aria-label="${escapeHTML(t(titleKey))}">
      </label>`;

  wrap.innerHTML = `
    <article>
      <header><h3>${t('notif.pref.sectionTitle')}</h3></header>
      ${switchRow('notif-pref-inapp-switch', 'notif.pref.inApp.title', 'notif.pref.inApp.sub', anyInAppOn)}
      ${switchRow('notif-pref-push-switch', 'notif.pref.push.title', 'notif.pref.push.sub', pushSubscribedHere)}
      ${switchRow('notif-pref-email-switch', 'notif.pref.email.title', 'notif.pref.email.sub', anyEmailOn)}
    </article>

    <article>
      <header><h3>${t('notif.pref.quiet.section')}</h3></header>
      <div class="pref-row p-linha-opcao cfg-silencio">
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
        <div class="cfg-matriz">
          <table>
            <thead><tr><td></td><th scope="col">${t('notif.pref.matrix.app')}</th><th scope="col">${t('notif.pref.matrix.push')}</th><th scope="col">${t('notif.pref.matrix.email')}</th></tr></thead>
            <tbody>${matrixRowsHTML}</tbody>
          </table>
        </div>
      </details>
    </article>

    <article>
      <header><h3>${t('friends.prefs.sectionTitle')}</h3></header>
      <div class="friends-prefs-box" id="friends-prefs-body"></div>
    </article>
  `;
  // Preferências de Amigos (tabela friend_settings), antes uma seção solta na
  // aba Perfil > Amigos. Desenhadas por shared/friends.js.
  if (typeof loadFriendsPrefs === 'function') loadFriendsPrefs();

  document.getElementById('notif-pref-inapp-switch').addEventListener('change', async (e) => {
    const input = e.currentTarget;
    input.disabled = true;
    await setAllCategoriesChannel('in_app', input.checked);
    renderNotificationPreferencesView();
  });

  document.getElementById('notif-pref-push-switch').addEventListener('change', async (e) => {
    const input = e.currentTarget;
    const turningOn = input.checked;
    input.disabled = true;
    if (turningOn){
      const result = await subscribeToPush();
      if (!result.ok){
        showToast(notificationPushErrorMessage(result.reason));
        input.checked = false;
        input.disabled = false;
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

  document.getElementById('notif-pref-email-switch').addEventListener('change', async (e) => {
    const input = e.currentTarget;
    input.disabled = true;
    await setAllCategoriesChannel('email', input.checked);
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
  const cat = NOTIFICATION_PREF_CATEGORIES.find(c => c.id === category);
  if (cat && notifPrefChannelMissing(cat, channel)) return; // canal que a categoria não tem
  const current = new Set(cat ? notifPrefEffectiveChannels(prefs, cat) : (channels[category] || []));
  if (enabled) current.add(channel); else current.delete(channel);
  channels[category] = [...current];
  await saveNotificationPreferenceChannels(channels);
}

async function setAllCategoriesChannel(channel, enabled){
  const prefs = await ensureNotificationPreferencesLoaded();
  if (!prefs) return;
  const channels = { ...(prefs.channels || {}) };
  NOTIFICATION_PREF_CATEGORIES.forEach(c => {
    if (notifPrefChannelMissing(c, channel)) return;
    const current = new Set(notifPrefEffectiveChannels(prefs, c));
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

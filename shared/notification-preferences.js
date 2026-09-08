// ---------- Preferências de notificação (Configurações > Notificações) ----------
// Fase 2 do sistema de notificações. Modo simples (um interruptor mestre +
// horário silencioso) por cima de uma matriz avançada por categoria
// (seção 10 da arquitetura aprovada) -- a matriz é o dado real
// (notification_preferences.channels, ver migration 010), o interruptor
// mestre é só um atalho que liga/desliga o canal in_app em todas as
// categorias de uma vez.
//
// Push e e-mail aparecem na matriz (a coluna já existe no dado, pensada
// desde a Fase 0 pras Fases 3/5) mas ficam desabilitados aqui: não existe
// NENHUM jeito de entregar por esses canais ainda (sem VAPID/push
// subscription, sem provedor de e-mail) -- deixar editável sem nenhum
// efeito seria enganoso.
//
// Depende de (mesma posição de shared/notifications.js -- antes de app.js):
//   - shared/supabase-client.js (supabaseClient)
//   - shared/auth.js            (CURRENT_USER)
//   - shared/toast.js           (showToast)
//   - shared/notifications.js   (ensureNotificationPreferencesLoaded)

// Omite "sistema" da lista? Não -- mantido, é uma categoria real (ver
// notification_rules, seed da 010) e a pessoa pode preferir não receber
// nem avisos de sistema no sino. "Social" não existe (ver seção 4 da
// arquitetura: sem recurso social hoje, sem preferência pra configurar).
const NOTIFICATION_PREF_CATEGORIES = [
  { id: 'estudo', label: '📘 Estudo' },
  { id: 'revisao', label: '🔄 Revisão' },
  { id: 'streak', label: '🔥 Sequência' },
  { id: 'gamificacao', label: '⭐ Conquistas e XP' },
  { id: 'ranking', label: '🏆 Ranking' },
  { id: 'desafios', label: '🎯 Desafios' },
  { id: 'conteudo', label: '📚 Novidades' },
  { id: 'reengajamento', label: '👋 Reengajamento' },
  { id: 'sistema', label: '⚙️ Sistema' },
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
    wrap.innerHTML = `<p class="profile-empty-note">Crie uma conta pra configurar notificações -- o modo convidado não guarda preferências.</p>`;
    return;
  }
  wrap.innerHTML = `<p class="profile-loading">Carregando...</p>`;
  const prefs = await ensureNotificationPreferencesLoaded(true);
  if (!prefs){
    wrap.innerHTML = `<p class="profile-empty-note">Não foi possível carregar suas preferências agora.</p>`;
    return;
  }

  const anyInAppOn = NOTIFICATION_PREF_CATEGORIES.some(c => (prefs.channels?.[c.id] || []).includes('in_app'));

  const matrixRowsHTML = NOTIFICATION_PREF_CATEGORIES.map(c => {
    const checked = (prefs.channels?.[c.id] || []).includes('in_app') ? 'checked' : '';
    return `
      <div class="notif-pref-matrix-row">
        <span class="notif-pref-matrix-label">${c.label}</span>
        <label class="notif-pref-matrix-cell" title="No app"><input type="checkbox" data-pref-category="${c.id}" ${checked}></label>
        <span class="notif-pref-matrix-cell disabled" title="Em breve (Fase 3)">--</span>
        <span class="notif-pref-matrix-cell disabled" title="Em breve (Fase 5)">--</span>
      </div>
    `;
  }).join('');

  wrap.innerHTML = `
    <div class="section-label">Notificações</div>
    <div class="pref-row">
      <div class="pref-row-text">
        <div class="pref-row-title">Notificações no app</div>
        <div class="pref-row-sub">Sino na topbar + central de notificações. Desligar aqui silencia tudo de uma vez -- ajuste fino por categoria em "Personalizar por categoria" abaixo.</div>
      </div>
      <button class="pref-switch" id="notif-pref-inapp-switch" role="switch" aria-checked="${anyInAppOn}"><span class="pref-switch-knob"></span></button>
    </div>
    <div class="pref-row">
      <div class="pref-row-text">
        <div class="pref-row-title">Alertas no navegador (push)</div>
        <div class="pref-row-sub">Ainda não existe esse canal na plataforma -- chega numa fase futura.</div>
      </div>
      <button class="pref-switch" role="switch" aria-checked="false" disabled title="Em breve"><span class="pref-switch-knob"></span></button>
    </div>
    <div class="pref-row">
      <div class="pref-row-text">
        <div class="pref-row-title">E-mails</div>
        <div class="pref-row-sub">Ainda não existe esse canal na plataforma -- chega numa fase futura.</div>
      </div>
      <button class="pref-switch" role="switch" aria-checked="false" disabled title="Em breve"><span class="pref-switch-knob"></span></button>
    </div>

    <div class="section-label">Horário silencioso</div>
    <div class="pref-row">
      <div class="pref-row-text">
        <div class="pref-row-title">Não notificar entre</div>
        <div class="pref-row-sub">Vale pras notificações calculadas automaticamente (revisão, sequência...) -- as que acontecem na hora (XP, badge) continuam aparecendo. Horário aproximado (ainda não ajustado ao seu fuso).</div>
      </div>
      <div class="notif-pref-quiet-hours">
        <select id="notif-pref-quiet-start" aria-label="Início do horário silencioso">${notifPrefHourOptionsHTML(prefs.quiet_hours_start)}</select>
        <span>até</span>
        <select id="notif-pref-quiet-end" aria-label="Fim do horário silencioso">${notifPrefHourOptionsHTML(prefs.quiet_hours_end)}</select>
      </div>
    </div>

    <details class="notif-pref-advanced">
      <summary>Personalizar por categoria</summary>
      <div class="notif-pref-matrix">
        <div class="notif-pref-matrix-row notif-pref-matrix-head">
          <span class="notif-pref-matrix-label"></span>
          <span class="notif-pref-matrix-cell">App</span>
          <span class="notif-pref-matrix-cell disabled">Push</span>
          <span class="notif-pref-matrix-cell disabled">E-mail</span>
        </div>
        ${matrixRowsHTML}
      </div>
    </details>
  `;

  document.getElementById('notif-pref-inapp-switch').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const turningOn = btn.getAttribute('aria-checked') !== 'true';
    btn.setAttribute('aria-checked', String(turningOn));
    await setAllCategoriesInApp(turningOn);
    renderNotificationPreferencesView();
  });

  wrap.querySelectorAll('[data-pref-category]').forEach(input => {
    input.addEventListener('change', () => setCategoryInApp(input.dataset.prefCategory, input.checked));
  });

  ['notif-pref-quiet-start', 'notif-pref-quiet-end'].forEach(id => {
    document.getElementById(id).addEventListener('change', saveNotificationQuietHours);
  });
}

async function saveNotificationPreferenceChannels(channels){
  const { error } = await supabaseClient.from('notification_preferences').update({ channels }).eq('user_id', CURRENT_USER.id);
  if (error){ console.error('Erro ao salvar preferências de notificação:', error); return false; }
  if (NOTIFICATION_PREFERENCES_CACHE) NOTIFICATION_PREFERENCES_CACHE.channels = channels;
  return true;
}

async function setCategoryInApp(category, enabled){
  const prefs = await ensureNotificationPreferencesLoaded();
  if (!prefs) return;
  const channels = { ...(prefs.channels || {}) };
  const current = new Set(channels[category] || []);
  if (enabled) current.add('in_app'); else current.delete('in_app');
  channels[category] = [...current];
  await saveNotificationPreferenceChannels(channels);
}

async function setAllCategoriesInApp(enabled){
  const prefs = await ensureNotificationPreferencesLoaded();
  if (!prefs) return;
  const channels = { ...(prefs.channels || {}) };
  NOTIFICATION_PREF_CATEGORIES.forEach(c => {
    const current = new Set(channels[c.id] || []);
    if (enabled) current.add('in_app'); else current.delete('in_app');
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
  showToast('✓ Preferências salvas.');
}

// ---------- Motor de notificações (Fase 1) ----------
// Cobre só os eventos "Cliente" da arquitetura aprovada (seção 7/18): XP
// ganho, badge desbloqueado, missão do dia concluída, streak batida -- disparados
// na hora, por quem está com o app aberto, sem depender do cron (Edge
// Function supabase/functions/notification-cron, ainda sem lógica de
// negócio -- isso é Fase 2 em diante: revisão atrasada, streak em risco,
// reengajamento). O sino da topbar e o dropdown (bottom sheet no mobile,
// reaproveitando a classe .user-dropdown do menu "Mais", Fase 6 de
// navegação) também vivem aqui.
//
// Depende de (mesma posição de shared/analytics.js -- antes de app.js):
//   - shared/supabase-client.js (supabaseClient)
//   - shared/auth.js            (CURRENT_USER)
//   - shared/profile.js         (escapeHTML)
//   - languages/<lang>/app.js   (APP_KEY, switchTab)
//
// Só funciona pra contas de verdade -- convidados (CURRENT_USER === false)
// ficam de fora, mesma exclusão de Ranking/badges/Analytics (RLS de todas
// as tabelas de notification_* exige um auth.uid() real).

let NOTIFICATION_RULES_CACHE = null; // Map<category, rule> -- carregado 1x por sessão (leitura pública, ver 010)
let NOTIFICATION_UNREAD_COUNT = 0;
let NOTIFICATION_PREFERENCES_CACHE = null; // { channels, quiet_hours_start, quiet_hours_end } | null

async function ensureNotificationRulesLoaded(){
  if (NOTIFICATION_RULES_CACHE) return NOTIFICATION_RULES_CACHE;
  const { data, error } = await supabaseClient.from('notification_rules').select('*');
  if (error){ console.error('Erro ao carregar regras de notificação:', error); return new Map(); }
  NOTIFICATION_RULES_CACHE = new Map((data || []).map(r => [r.category, r]));
  return NOTIFICATION_RULES_CACHE;
}

// Fase 2: preferências por conta (Configurações > Notificações, ver
// shared/notification-preferences.js). Carregada 1x por sessão/login e
// mantida em cache -- as próprias telas de preferência atualizam este
// cache direto ao salvar, sem precisar recarregar do banco.
async function ensureNotificationPreferencesLoaded(forceReload){
  if (typeof CURRENT_USER === 'undefined' || !CURRENT_USER){ NOTIFICATION_PREFERENCES_CACHE = null; return null; }
  if (NOTIFICATION_PREFERENCES_CACHE && !forceReload) return NOTIFICATION_PREFERENCES_CACHE;

  const { data, error } = await supabaseClient.from('notification_preferences').select('*').eq('user_id', CURRENT_USER.id).maybeSingle();
  if (error){ console.error('Erro ao carregar preferências de notificação:', error); return null; }

  if (data){
    NOTIFICATION_PREFERENCES_CACHE = data;
    return NOTIFICATION_PREFERENCES_CACHE;
  }

  // Primeira vez desta conta: garante que a linha exista, usando os
  // defaults da própria coluna (upsert só com user_id -- nunca sobrescreve
  // um valor já salvo, mesmo truque usado em shared/auth.js:onUserLoggedIn
  // pra profiles).
  const { error: upsertError } = await supabaseClient
    .from('notification_preferences')
    .upsert({ user_id: CURRENT_USER.id }, { onConflict: 'user_id' });
  if (upsertError){ console.error('Erro ao criar preferências de notificação:', upsertError); return null; }

  const { data: created, error: reloadError } = await supabaseClient.from('notification_preferences').select('*').eq('user_id', CURRENT_USER.id).maybeSingle();
  if (reloadError){ console.error('Erro ao recarregar preferências de notificação:', reloadError); return null; }
  NOTIFICATION_PREFERENCES_CACHE = created;
  return NOTIFICATION_PREFERENCES_CACHE;
}

// Categoria sem preferência salva ainda (cache não carregado, ou chave
// ausente do jsonb) conta como PERMITIDA -- mesmo default "tudo ligado" da
// coluna channels (ver migration 010), nunca bloqueia por falta de dado.
function notificationCategoryAllowsInApp(category){
  const channels = NOTIFICATION_PREFERENCES_CACHE?.channels?.[category];
  if (!Array.isArray(channels)) return true;
  return channels.includes('in_app');
}

function notificationCategoryAllowsPush(category){
  const channels = NOTIFICATION_PREFERENCES_CACHE?.channels?.[category];
  if (!Array.isArray(channels)) return false; // sem preferência salva ainda -- push nunca liga sozinho (diferente do in_app)
  return channels.includes('push');
}

// Fase 3: entrega via Web Push, chamando a Edge Function push-send no
// contexto do PRÓPRIO usuário (repassa o token da sessão -- a function
// nunca usa service role, só enxerga as inscrições de quem chamou, ver
// supabase/functions/push-send). Fire-and-forget de propósito (mesmo
// padrão do insert em notification_events): um push que falha não deve
// travar nem atrasar a experiência de quem está com o app aberto.
async function sendPushNotification(title, body, actionTab){
  try{
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session?.access_token) return;
    await fetch(`${SUPABASE_URL}/functions/v1/push-send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ title, body, actionTab: actionTab || null }),
    });
  }catch(e){
    console.error('Erro ao enviar push:', e);
  }
}

// Placeholders tipo {{amount}}/{{badge_name}}/{{days}} -- substituídos a
// partir do payload do evento (ver seção 8/9 da arquitetura). Chave sem
// correspondência no payload vira string vazia, nunca "undefined" na tela.
function fillNotificationPlaceholders(text, payload){
  return String(text || '').replace(/\{\{(\w+)\}\}/g, (_, key) => (payload && payload[key] != null) ? String(payload[key]) : '');
}

async function pickNotificationTemplate(eventType){
  const { data, error } = await supabaseClient
    .from('notification_templates')
    .select('*')
    .eq('event_type', eventType)
    .eq('channel', 'in_app')
    .eq('language_app_key', APP_KEY)
    .eq('active', true);
  if (error || !data?.length) return null;
  return data[Math.floor(Math.random() * data.length)];
}

// Anti-spam básico da Fase 1 (seção 5/16): cooldown por categoria (minutos
// desde a última notificação DESSA categoria pra essa conta) + limite
// diário + (Fase 1b) um piso de XP mínimo pro evento xp_earned -- cooldown/
// limite diário controlam FREQUÊNCIA, não o TAMANHO do ganho, então uma
// sequência de revisões maduras (XP bem baixo de propósito, ver reviewXP())
// ainda enchia o sino de notificações de "+1/+2/+3 XP" mesmo respeitando o
// cooldown. min_xp_amount é editável no Painel de Admin > Notificações.
async function passesAntiSpam(category, eventType, payload){
  const rules = await ensureNotificationRulesLoaded();
  const rule = rules.get(category);
  if (!rule || !rule.active) return false;

  if (eventType === 'xp_earned' && rule.min_xp_amount != null && (payload?.amount ?? 0) < rule.min_xp_amount) return false;

  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const queries = [
    supabaseClient.from('notifications').select('id', { count: 'exact', head: true })
      .eq('user_id', CURRENT_USER.id).eq('category', category).gte('created_at', startOfDay.toISOString()),
  ];
  if (rule.cooldown_minutes > 0){
    const since = new Date(Date.now() - rule.cooldown_minutes * 60000).toISOString();
    queries.push(
      supabaseClient.from('notifications').select('id', { count: 'exact', head: true })
        .eq('user_id', CURRENT_USER.id).eq('category', category).gte('created_at', since)
    );
  }
  const results = await Promise.all(queries);
  const [{ count: todayCount }, cooldownResult] = results;

  if (rule.daily_cap > 0 && (todayCount || 0) >= rule.daily_cap) return false;
  if (cooldownResult && (cooldownResult.count || 0) > 0) return false;
  return true;
}

// Ponto de entrada único pros 4 eventos "Cliente" da Fase 1. actionTab é
// opcional -- pra onde o clique na notificação deve levar (switchTab, não
// existe URL por tela neste app).
async function fireNotificationEvent(eventType, category, payload, actionTab){
  if (typeof CURRENT_USER === 'undefined' || !CURRENT_USER) return; // convidado

  // Sempre registra o evento bruto (mesmo que o anti-spam descarte depois)
  // -- log completo pra Fase 2+ medir volume real por categoria/evento,
  // mesmo padrão de trackEvent() em shared/analytics.js.
  supabaseClient.from('notification_events').insert({
    user_id: CURRENT_USER.id,
    language_app_key: APP_KEY,
    event_type: eventType,
    payload: payload || null,
    source: 'client',
  }).then(({ error }) => { if (error) console.error('Erro ao registrar evento de notificação:', error); });

  await ensureNotificationPreferencesLoaded();
  // Fase 3: push "pendura" no in-app -- as duas checagens abaixo (anti-spam
  // e limite diário) contam linhas de `notifications`, então desligar
  // in_app pra uma categoria também desliga push nela nesta fase (evita
  // duplicar o controle de anti-spam numa tabela separada só pra push).
  // Simplificação documentada -- não é o desenho "3 canais 100%
  // independentes" do wireframe original, mas cobre bem o caso real (quem
  // quer push quase sempre quer o histórico no sino também).
  if (!notificationCategoryAllowsInApp(category)) return;

  const ok = await passesAntiSpam(category, eventType, payload);
  if (!ok) return;

  const template = await pickNotificationTemplate(eventType);
  if (!template) return;

  const title = fillNotificationPlaceholders(template.title, payload);
  const body = fillNotificationPlaceholders(template.body, payload);
  if (!body) return;

  const { error } = await supabaseClient.from('notifications').insert({
    user_id: CURRENT_USER.id,
    language_app_key: APP_KEY,
    category,
    event_type: eventType,
    title: title || null,
    body,
    action_tab: actionTab || null,
  });
  if (error){ console.error('Erro ao criar notificação:', error); return; }

  NOTIFICATION_UNREAD_COUNT++;
  renderNotificationBellBadge();

  if (notificationCategoryAllowsPush(category)) sendPushNotification(title, body, actionTab);
}

// ---------- Sino + dropdown ----------

const NOTIFICATION_CATEGORY_ICON = {
  sistema: '⚙️', estudo: '📘', revisao: '🔄', streak: '🔥', gamificacao: '⭐',
  ranking: '🏆', desafios: '🎯', social: '👥', conteudo: '📚', reengajamento: '👋',
  perfil: '🏅',
};

const NOTIFICATIONS_FETCH_LIMIT = 30;

async function fetchRecentNotifications(){
  if (typeof CURRENT_USER === 'undefined' || !CURRENT_USER) return [];
  const { data, error } = await supabaseClient
    .from('notifications')
    .select('*')
    .eq('user_id', CURRENT_USER.id)
    .order('created_at', { ascending: false })
    .limit(NOTIFICATIONS_FETCH_LIMIT);
  if (error){ console.error('Erro ao carregar notificações:', error); return []; }
  return data || [];
}

async function refreshNotificationUnreadCount(){
  if (typeof CURRENT_USER === 'undefined' || !CURRENT_USER){
    NOTIFICATION_UNREAD_COUNT = 0;
    renderNotificationBellBadge();
    return;
  }
  const { count, error } = await supabaseClient
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', CURRENT_USER.id)
    .is('read_at', null);
  NOTIFICATION_UNREAD_COUNT = error ? 0 : (count || 0);
  renderNotificationBellBadge();
}

function renderNotificationBellBadge(){
  const badge = document.getElementById('notifications-badge');
  if (!badge) return;
  if (NOTIFICATION_UNREAD_COUNT > 0){
    badge.textContent = NOTIFICATION_UNREAD_COUNT > 9 ? '9+' : String(NOTIFICATION_UNREAD_COUNT);
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

// "agora" / "23min" / "4h" / "3d" -- não precisa de precisão maior que essa
// pra uma lista de notificações recentes (mesmo nível de detalhe usado em
// "concedido em" no Painel de Admin, só que relativo em vez de data cheia).
function notificationTimeAgoLabel(iso){
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min}min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  return `${Math.floor(hr / 24)}d`;
}

async function renderNotificationDropdown(){
  const list = document.getElementById('notifications-list');
  if (!list) return;
  list.innerHTML = loadingHTML();
  const items = await fetchRecentNotifications();
  if (!items.length){
    list.innerHTML = `<p class="notifications-empty">Nenhuma notificação ainda. Continue estudando! 📚</p>`;
    return;
  }
  list.innerHTML = items.map(n => `
    <button class="notification-item ${n.read_at ? '' : 'unread'}" data-notification-id="${n.id}" data-action-tab="${n.action_tab || ''}">
      <span class="notification-item-icon">${n.icon || NOTIFICATION_CATEGORY_ICON[n.category] || '🔔'}</span>
      <span class="notification-item-body">
        ${n.title ? `<span class="notification-item-title">${escapeHTML(n.title)}</span>` : ''}
        <span class="notification-item-text">${escapeHTML(n.body)}</span>
        <span class="notification-item-time">${notificationTimeAgoLabel(n.created_at)}</span>
      </span>
    </button>
  `).join('');

  list.querySelectorAll('[data-notification-id]').forEach(el => {
    el.addEventListener('click', async () => {
      await markNotificationRead(el.dataset.notificationId);
      el.classList.remove('unread');
      const tab = el.dataset.actionTab;
      document.getElementById('notifications-dropdown')?.classList.remove('open');
      if (tab === 'profile-edit'){
        // Lembrete de "badge em destaque" (ver checkFeaturedBadgeReminder no
        // cron) -- não é só trocar de aba, precisa abrir o modal de Editar
        // Perfil direto. switchTab('profile') dispara renderProfileView()
        // sem esperar (é async, tabHandlers não aguarda promise nenhuma) --
        // chama ela de novo aqui e espera, pra garantir que #profile-edit-btn
        // já existe no DOM antes do clique programático (idempotente, o
        // segundo render só substitui o mesmo conteúdo).
        switchTab('profile');
        if (typeof renderProfileView === 'function') await renderProfileView();
        document.getElementById('profile-edit-btn')?.click();
      } else if (tab){
        switchTab(tab);
      }
    });
  });
}

async function markNotificationRead(id){
  const { error } = await supabaseClient.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id).is('read_at', null);
  if (!error) refreshNotificationUnreadCount();
}

async function markAllNotificationsRead(){
  if (typeof CURRENT_USER === 'undefined' || !CURRENT_USER) return;
  await supabaseClient.from('notifications').update({ read_at: new Date().toISOString() })
    .eq('user_id', CURRENT_USER.id).is('read_at', null);
  refreshNotificationUnreadCount();
  renderNotificationDropdown();
}

// Ancora o dropdown embaixo do PRÓPRIO sino (não no canto fixo que
// .user-dropdown/.lang-switcher-dropdown usam) -- o sino não é o pill mais
// à direita da topbar, então o canto fixo deixava a lista flutuando longe
// do ícone que abriu ela. Mesmo tratamento em qualquer largura de tela --
// diferente do menu "Mais" (que vira folha inferior no mobile, ver
// .user-dropdown:not(.notifications-dropdown) dentro do media query),
// notificações sempre foram um popover compacto ancorado no sino, desktop
// ou mobile.
function positionNotificationsDropdown(){
  const dropdown = document.getElementById('notifications-dropdown');
  const btn = document.getElementById('notifications-topbar-btn');
  if (!dropdown || !btn) return;
  const rect = btn.getBoundingClientRect();
  // Largura REAL renderizada (não uma estimativa) -- só dá pra medir depois
  // que .open já foi aplicada (senão é display:none, largura 0). Chamada
  // depois de dropdown.classList.add('open') em toggleNotificationDropdown,
  // ainda no mesmo turno síncrono -- o navegador só pinta depois que o JS
  // termina, então não há flash na posição errada.
  const dropdownWidth = dropdown.getBoundingClientRect().width || 340;
  const margin = 12;
  let left = rect.right - dropdownWidth; // borda direita da lista exatamente sob a borda direita do sino
  left = Math.max(margin, Math.min(left, window.innerWidth - margin - dropdownWidth));
  dropdown.style.top = `${Math.round(rect.bottom + 8)}px`;
  dropdown.style.left = `${Math.round(left)}px`;
  dropdown.style.right = 'auto';
}

async function toggleNotificationDropdown(){
  const dropdown = document.getElementById('notifications-dropdown');
  if (!dropdown) return;
  const opening = !dropdown.classList.contains('open');
  document.querySelectorAll('.user-dropdown.open').forEach(d => d.classList.remove('open'));
  // Sem fundo escurecido aqui de propósito -- diferente do menu "Mais"
  // (folha inferior em tela cheia no mobile), notificações são sempre um
  // popover compacto ancorado no sino (ver positionNotificationsDropdown),
  // então não faz sentido escurecer o resto da tela por trás.
  if (opening){
    dropdown.classList.add('open'); // precisa estar visível ANTES de medir a largura real
    positionNotificationsDropdown();
    // A lista começa vazia ("Carregando...") -- mede mais estreita que o
    // conteúdo final (ver fetchRecentNotifications, assíncrono). Reposiciona
    // de novo depois que o conteúdo real já ocupou a largura definitiva --
    // senão a borda direita fica alguns px deslocada da borda do sino.
    await renderNotificationDropdown();
    positionNotificationsDropdown();
  }
}

function wireNotificationBell(){
  const btn = document.getElementById('notifications-topbar-btn');
  if (!btn) return;
  btn.addEventListener('click', (e) => { e.stopPropagation(); toggleNotificationDropdown(); });
  document.getElementById('notifications-mark-all-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    markAllNotificationsRead();
  });
  document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('notifications-dropdown');
    if (dropdown?.classList.contains('open') && !dropdown.contains(e.target) && e.target !== btn && !btn.contains(e.target)){
      dropdown.classList.remove('open');
    }
  });
}
wireNotificationBell();

// ---------- Convite e ajuda para ativar os alertas no celular (push) ----------
// Decisões da autora (2026-11-25, docs/historico/36-auditoria-seguranca-2026-11.md, "plano B e A"):
//   B) Configurações > Notificações: em vez do aviso que some ("Seu navegador não suporta" / "estão bloqueadas"),
//      uma caixa fixa com o passo a passo: iPhone/iPad sem o site na Tela de Início, ou permissão bloqueada no
//      navegador (Android: Chrome + ícone do app; computador: cadeado do endereço), com "Já liberei, tentar de novo".
//   A) Convite ao terminar uma lição: a partir da 2ª lição concluída (nunca no 1º acesso), de novo depois de 7 dias,
//      no máximo 3 vezes; sem "Não perguntar mais". No iPhone fora da Tela de Início o convite já mostra o passo a passo.
// O pedido de permissão do navegador só sai de um clique (regra da seção 11 da arquitetura de notificações).
// Tudo grátis. Vale para todos os sites (código comum; textos em shared/i18n, pt-BR e en).
//
// Depende de: shared/push.js (pushSupported, getLocalPushSubscription, subscribeToPush),
// shared/notification-preferences.js (setAllCategoriesChannel, renderNotificationPreferencesView),
// shared/toast.js (showToast), shared/auth.js (CURRENT_USER), shared/i18n (t).

const PUSH_INVITE_KEY = 'pushLessonInvite';
const PUSH_INVITE_MIN_LESSONS = 2;
const PUSH_INVITE_EVERY_DAYS = 7;
const PUSH_INVITE_MAX_SHOWS = 3;
const PUSH_INVITE_DAY_MS = 86400000;

function pushInviteLsGet(k){ try { return localStorage.getItem(k); } catch (e) { return null; } }
function pushInviteLsSet(k, v){ try { localStorage.setItem(k, v); } catch (e) { /* aba anônima */ } }

function pushPlatform(){
  const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
  const iPadOS = typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  if (/iPad|iPhone|iPod/.test(ua) || iPadOS) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}
function pushIsStandalone(){
  try { return !!(navigator.standalone || window.matchMedia('(display-mode: standalone)').matches); } catch (e) { return false; }
}

// Estado do convite por CONTA neste aparelho: { lessons, shown, last, done }.
function pushInviteStorageKey(){
  const uid = (typeof CURRENT_USER !== 'undefined' && CURRENT_USER && CURRENT_USER.id) || 'anon';
  return PUSH_INVITE_KEY + ':' + uid;
}
function pushInviteState(){
  try { return Object.assign({ lessons: 0, shown: 0, last: 0, done: false }, JSON.parse(pushInviteLsGet(pushInviteStorageKey()) || '{}')); }
  catch (e) { return { lessons: 0, shown: 0, last: 0, done: false }; }
}
function pushInviteSave(s){ pushInviteLsSet(pushInviteStorageKey(), JSON.stringify(s)); }

// Chamado por shared/core/licao-base.js ao concluir uma lição de verdade (não ao reabrir a tela pelo Voltar/Avançar).
function pushInviteNoteLessonDone(){
  if (typeof CURRENT_USER === 'undefined' || !CURRENT_USER) return;
  const s = pushInviteState();
  s.lessons = (s.lessons || 0) + 1;
  pushInviteSave(s);
}

// Regra pura (testada em tests/push-convite/): mostra o convite agora?
function pushLessonInviteDue(state, now){
  const s = state || {};
  if (s.done) return false;
  if ((s.lessons || 0) < PUSH_INVITE_MIN_LESSONS) return false;
  if ((s.shown || 0) >= PUSH_INVITE_MAX_SHOWS) return false;
  if (s.last && now - s.last < PUSH_INVITE_EVERY_DAYS * PUSH_INVITE_DAY_MS) return false;
  return true;
}

// 'push' = dá para pedir; 'ios' = iPhone/iPad sem o site na Tela de Início; 'blocked' = o navegador guardou "Bloquear";
// null = já ativado aqui, ou aparelho sem push (e sem caminho para ter).
async function pushEnvMode(){
  if (typeof CURRENT_USER === 'undefined' || !CURRENT_USER) return null;
  const supported = typeof pushSupported === 'function' && pushSupported();
  if (!supported) return (pushPlatform() === 'ios' && !pushIsStandalone()) ? 'ios' : null;
  if (Notification.permission === 'denied') return 'blocked';
  if (typeof getLocalPushSubscription !== 'function') return null;
  // serviceWorker.ready não resolve sem service worker: sem resposta em 4 s, trata como "não dá para ativar".
  const sub = await Promise.race([getLocalPushSubscription(), new Promise(r => setTimeout(() => r('timeout'), 4000))]);
  if (sub === 'timeout') return null;
  return sub ? null : 'push';
}

function pushStepsHTML(keys){
  return `<ol class="push-help-steps">${keys.map(k => `<li><span>${t(k)}</span></li>`).join('')}</ol>`;
}

// Caixa de ajuda (B). kind: 'ios' | 'blocked'. Na tela de Configurações leva "Já liberei, tentar de novo".
function pushHelpHTML(kind, { retry = true } = {}){
  if (kind === 'ios'){
    return `<div class="push-help" data-push-help="ios" role="note">
      <h4><span aria-hidden="true">📱</span> ${t('push.help.ios.title')}</h4>
      <p>${t('push.help.ios.intro')}</p>
      ${pushStepsHTML(['push.help.ios.step1', 'push.help.ios.step2', 'push.help.ios.step3'])}
    </div>`;
  }
  const platform = pushPlatform();
  const body = platform === 'android'
    ? `${pushStepsHTML(['push.help.android.step1', 'push.help.android.step2', 'push.help.android.step3'])}
       <p class="push-help-extra">${t('push.help.android.appIcon')}</p>`
    : pushStepsHTML(['push.help.desktop.step1', 'push.help.desktop.step2']);
  return `<div class="push-help" data-push-help="blocked" role="note">
      <h4><span aria-hidden="true">🔒</span> ${t(platform === 'desktop' ? 'push.help.blocked.titleDesktop' : 'push.help.blocked.title')}</h4>
      <p>${t('push.help.blocked.intro')}</p>
      ${body}
      ${retry ? `<button type="button" class="btn btn-primary push-help-retry" data-push-help-retry>${t('push.help.retry')}</button>` : ''}
    </div>`;
}

// Convite ao terminar a lição (A).
function pushLessonInviteHTML(mode){
  if (mode === 'ios'){
    return `<div class="push-invite-card" data-push-invite-card>
      ${pushHelpHTML('ios', { retry: false })}
      <div class="push-invite-actions"><button type="button" class="btn btn-secondary" data-push-invite-lesson="later">${t('push.invite.ok')}</button></div>
    </div>`;
  }
  return `<div class="push-invite-card" data-push-invite-card>
      <span class="push-invite-icon" aria-hidden="true">🔔</span>
      <h3>${t('push.invite.title')}</h3>
      <p>${t('push.invite.text')}</p>
      <div class="push-invite-actions">
        <button type="button" class="btn btn-primary" data-push-invite-lesson="enable">${t('push.invite.enable')}</button>
        <button type="button" class="btn btn-secondary" data-push-invite-lesson="later">${t('push.invite.later')}</button>
      </div>
    </div>`;
}

async function loadPushLessonInvite(){
  const slot = document.getElementById('push-lesson-invite');
  if (!slot) return;
  const now = Date.now();
  const state = pushInviteState();
  if (!pushLessonInviteDue(state, now)) return;
  const mode = await pushEnvMode();
  // 'blocked' não entra no convite: o clique não resolve; a ajuda fica em Configurações > Notificações.
  if (mode !== 'push' && mode !== 'ios') return;
  if (!document.body.contains(slot)) return; // a pessoa já saiu da tela
  state.shown = (state.shown || 0) + 1;
  state.last = now;
  pushInviteSave(state);
  slot.innerHTML = pushLessonInviteHTML(mode);
  slot.hidden = false;
}

function pushLessonInviteClose(){
  const slot = document.getElementById('push-lesson-invite');
  if (slot){ slot.hidden = true; slot.innerHTML = ''; }
}

// Liga o push neste aparelho (mesmo caminho do interruptor de Configurações). Devolve o resultado de subscribeToPush.
async function pushEnableHere(){
  if (typeof subscribeToPush !== 'function') return { ok: false, reason: 'error' };
  const res = await subscribeToPush();
  if (!res.ok) return res;
  if (typeof setAllCategoriesChannel === 'function'){
    try { await setAllCategoriesChannel('push', true); } catch (e) { console.error('Push: preferências', e); }
  }
  const s = pushInviteState(); s.done = true; pushInviteSave(s);
  return res;
}

async function pushInviteLessonAction(action, btn){
  if (action === 'later'){ pushLessonInviteClose(); return; }
  if (action !== 'enable') return;
  if (btn) btn.disabled = true;
  const res = await pushEnableHere();
  if (res.ok){
    showToast(t('notif.pref.toast.pushOn'));
    pushLessonInviteClose();
    return;
  }
  const card = document.querySelector('#push-lesson-invite [data-push-invite-card]');
  if ((res.reason === 'blocked' || res.reason === 'denied') && card){
    card.innerHTML = `${pushHelpHTML('blocked', { retry: false })}
      <div class="push-invite-actions"><button type="button" class="btn btn-secondary" data-push-invite-lesson="later">${t('push.invite.ok')}</button></div>`;
    return;
  }
  showToast(typeof notificationPushErrorMessage === 'function' ? notificationPushErrorMessage(res.reason) : t('notif.pref.push.error'));
  if (btn) btn.disabled = false;
}

// "Já liberei, tentar de novo" (Configurações > Notificações).
async function pushHelpRetry(btn){
  if (btn) btn.disabled = true;
  const res = await pushEnableHere();
  if (res.ok){
    showToast(t('notif.pref.toast.pushOn'));
  } else {
    showToast(res.reason === 'blocked' || res.reason === 'denied' ? t('push.help.stillBlocked')
      : (typeof notificationPushErrorMessage === 'function' ? notificationPushErrorMessage(res.reason) : t('notif.pref.push.error')));
  }
  if (typeof renderNotificationPreferencesView === 'function') renderNotificationPreferencesView();
}

if (typeof document !== 'undefined'){
  document.addEventListener('click', (e) => {
    const inv = e.target.closest && e.target.closest('[data-push-invite-lesson]');
    if (inv){ if (!inv.disabled) pushInviteLessonAction(inv.dataset.pushInviteLesson, inv); return; }
    const retry = e.target.closest && e.target.closest('[data-push-help-retry]');
    if (retry && !retry.disabled) pushHelpRetry(retry);
  });
}

if (typeof module !== 'undefined' && module.exports){
  module.exports = { pushLessonInviteDue, PUSH_INVITE_MIN_LESSONS, PUSH_INVITE_EVERY_DAYS, PUSH_INVITE_MAX_SHOWS };
}

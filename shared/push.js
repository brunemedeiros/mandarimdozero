// ---------- Push (Web Push API) -- Fase 3 do sistema de notificações ----------
// Só o lado "assinar/desassinar este navegador" mora aqui -- enviar de
// verdade é sempre do lado do servidor (Edge Function push-send ou o
// próprio notification-cron, nenhum dos dois pode rodar no navegador de
// quem vai RECEBER a notificação). Ver seção 11 da arquitetura aprovada.
//
// Depende de (mesma posição de shared/notifications.js -- antes de app.js):
//   - shared/supabase-client.js (supabaseClient)
//   - shared/auth.js            (CURRENT_USER)
//   - languages/<lang>/app.js   (APP_KEY)
//
// Chave pública VAPID -- segura pra expor no cliente (é a chave pública do
// par; a privada fica só como secret da Edge Function, nunca aqui). Gerada
// uma vez com a biblioteca web-push (ver PR) -- não muda a menos que as
// chaves sejam trocadas de propósito (o que invalidaria TODAS as
// inscrições existentes, exigindo re-inscrição de todo mundo).
const VAPID_PUBLIC_KEY = 'BHG5VZqeXu87TUOe6ddf2lav00q3VlHXDti5IbcWY8JHyIwoTYMulNb-z68TBqOmaODnTHC47d7-b4e5C0rpiMo';

function pushSupported(){
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

// PushManager.subscribe() exige a chave pública como Uint8Array (formato
// bruto), não a string base64url que a biblioteca web-push gera -- essa é
// a conversão padrão recomendada pela própria documentação da Push API.
function urlBase64ToUint8Array(base64String){
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

// Estado atual: se este NAVEGADOR específico já está inscrito -- diferente
// da preferência de categoria (notification_preferences.channels), que é
// por CONTA (vale em qualquer aparelho). Uma conta pode estar "querendo"
// push mas este navegador em particular nunca ter assinado (ex: segundo
// aparelho) -- é essa checagem que decide o estado inicial do toggle.
async function getLocalPushSubscription(){
  if (!pushSupported()) return null;
  try{
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  }catch(e){
    console.error('Erro ao checar inscrição de push:', e);
    return null;
  }
}

// Liga push NESTE navegador: pede permissão (só deve ser chamado a partir
// de um clique real, nunca sozinho no carregamento -- ver seção 11,
// "nunca no primeiro acesso") e grava a inscrição em push_subscriptions.
// Retorna { ok, reason } -- reason preenchido só quando ok:false, pra tela
// de preferências mostrar a mensagem certa (negado vs bloqueado vs sem
// suporte, ver diagrama da seção 11).
async function subscribeToPush(){
  if (typeof CURRENT_USER === 'undefined' || !CURRENT_USER) return { ok: false, reason: 'guest' };
  if (!pushSupported()) return { ok: false, reason: 'unsupported' };

  if (Notification.permission === 'denied'){
    return { ok: false, reason: 'blocked' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, reason: 'denied' };

  try{
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription){
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
    const json = subscription.toJSON();
    const { error } = await supabaseClient.from('push_subscriptions').upsert({
      user_id: CURRENT_USER.id,
      language_app_key: APP_KEY,
      endpoint: json.endpoint,
      keys: json.keys,
    }, { onConflict: 'user_id,endpoint' });
    if (error){ console.error('Erro ao salvar inscrição de push:', error); return { ok: false, reason: 'save_failed' }; }
    return { ok: true };
  }catch(e){
    console.error('Erro ao assinar push:', e);
    return { ok: false, reason: 'subscribe_failed' };
  }
}

// Desliga push NESTE navegador: apaga a linha em push_subscriptions (se a
// conta tiver assinado em outro aparelho, aquela linha continua intacta --
// só desliga o aparelho atual) e cancela a inscrição do navegador em si.
async function unsubscribeFromPush(){
  if (!pushSupported()) return { ok: true };
  try{
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return { ok: true };

    if (typeof CURRENT_USER !== 'undefined' && CURRENT_USER){
      await supabaseClient.from('push_subscriptions').delete().eq('user_id', CURRENT_USER.id).eq('endpoint', subscription.endpoint);
    }
    await subscription.unsubscribe();
    return { ok: true };
  }catch(e){
    console.error('Erro ao cancelar inscrição de push:', e);
    return { ok: false };
  }
}

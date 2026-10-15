// ---------- Push Dispatch (avisos de Amigos na hora, migration 102) ----------
//
// O banco põe na fila push_outbox os avisos de Amigos que a pessoa pode receber por push (cutucada, missão em dupla,
// pedido de amizade...) já no idioma do site dela, e chama esta function na hora (pg_net, ver _push_kick na 102).
// Aqui só se entrega: pega os pendentes com push_outbox_claim (marca como enviados de uma vez, sem repetir) e manda
// para todas as inscrições de navegador da conta, como o notification-cron (inscrição morta 404/410 é apagada).
//
// Quem chama não escolhe nada: o corpo é ignorado e a function só entrega o que o banco já decidiu. Por isso qualquer
// chamada com JWT válido (verify_jwt) é segura: no pior caso entrega antes o que já ia ser entregue.
//
// Secrets: os mesmos VAPID_* do push-send/notification-cron; SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY vêm do runtime.

import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:brunemed1310@gmail.com';
const vapidReady = !!(vapidPublicKey && vapidPrivateKey);
if (vapidReady) webpush.setVapidDetails(vapidSubject, vapidPublicKey!, vapidPrivateKey!);

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);
  // Sem VAPID não dá para assinar o push: não tira nada da fila (fica para quando os secrets existirem).
  if (!vapidReady) return json({ ok: false, error: 'vapid_missing' }, 200);

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data: rows, error } = await supabase.rpc('push_outbox_claim', { p_limit: 50 });
  if (error) {
    console.error('push-dispatch: falha ao ler a fila', error.message);
    return json({ ok: false, error: 'claim_failed' }, 500);
  }

  let sent = 0, failed = 0, pruned = 0;
  const subsByUser = new Map<string, any[]>();
  for (const row of rows ?? []) {
    if (!subsByUser.has(row.user_id)) {
      const { data: subs } = await supabase.from('push_subscriptions').select('*').eq('user_id', row.user_id);
      subsByUser.set(row.user_id, subs ?? []);
    }
    const payload = JSON.stringify({ title: row.title, body: row.body, actionTab: row.action_tab || null });
    for (const sub of subsByUser.get(row.user_id)!) {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload);
        sent++;
      } catch (e: any) {
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
          pruned++;
        } else {
          failed++;
          console.error('push-dispatch: falha ao enviar push', row.user_id, String(e?.message || e));
        }
      }
    }
  }
  return json({ ok: true, claimed: (rows ?? []).length, sent, failed, pruned });
});

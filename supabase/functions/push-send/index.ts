// ---------- Push Send (Fase 3 do sistema de notificações) ----------
//
// Entrega via Web Push pros eventos "Cliente" (XP, badge, desafio,
// streak -- ver shared/notifications.js) que a conta configurou pra
// também receber por push, além do sino. Eventos "Cron" (revisão
// atrasada, streak em risco...) NÃO passam por aqui -- o próprio
// notification-cron já roda no servidor e envia direto, sem precisar
// chamar outra function (ver supabase/functions/notification-cron).
//
// Roda no contexto do PRÓPRIO usuário que chama (repassa o cabeçalho
// Authorization do fetch feito pelo navegador) -- NÃO usa service role.
// Isso significa que a leitura de push_subscriptions respeita a RLS
// (owner-only, ver migration 013) automaticamente: cada conta só consegue
// mandar push pras PRÓPRIAS inscrições, nunca pra de outra pessoa, mesmo
// que tentasse forjar um user_id no corpo da requisição.
//
// Corpo esperado (JSON): { title?, body, actionTab? } -- o motor
// client-side já decidiu o texto final (placeholders já substituídos);
// esta function só entrega, não escolhe template nem aplica anti-spam de
// novo (isso já rodou antes, do lado de quem chamou).

import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3';

// SUPABASE_URL e SUPABASE_ANON_KEY são injetados automaticamente pelo
// runtime de Edge Functions, igual SUPABASE_SERVICE_ROLE_KEY em
// notification-cron -- não precisam ser configurados manualmente.
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
// Estes três NÃO são injetados automaticamente -- precisam ser
// configurados manualmente como secret (ver PR: painel do Supabase >
// Edge Functions > Secrets). VAPID_SUBJECT é um contato (mailto: ou
// https:) exigido pelo protocolo Web Push pra identificar quem está
// mandando, caso o provedor do navegador precise falar com alguém.
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:brunemed1310@gmail.com';
const vapidReady = !!(vapidPublicKey && vapidPrivateKey);
if (vapidReady) webpush.setVapidDetails(vapidSubject, vapidPublicKey!, vapidPrivateKey!);

// CORS (2026-11-25): o navegador chama esta função de app.profbrune.com.br com o
// cabeçalho Authorization, então antes manda uma "pergunta prévia" (OPTIONS).
// Sem resposta a ela (antes: 405, sem Access-Control-*), o Chrome/Edge/Opera nem
// enviavam o POST e nenhum push do site chegava. Mesmo molde do push-dispatch.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);
  // Sem as chaves VAPID não dá para assinar o push (antes a função nem subia).
  if (!vapidReady) return json({ ok: false, error: 'vapid_missing' }, 503);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ ok: false, error: 'missing_authorization' }, 401);

  let payload: { title?: string; body?: string; actionTab?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }
  if (!payload.body) {
    return json({ ok: false, error: 'missing_body' }, 400);
  }

  // Cliente "como o usuário" -- repassa o JWT de quem chamou, em vez de
  // service role, exatamente pra RLS filtrar as subscriptions certas
  // sozinha (ver cabeçalho do arquivo).
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: subscriptions, error } = await supabase.from('push_subscriptions').select('*');
  if (error) {
    console.error('push-send: falha ao ler push_subscriptions', error);
    return json({ ok: false, error: error.message }, 500);
  }

  const messagePayload = JSON.stringify({
    title: payload.title || 'Notificação',
    body: payload.body,
    actionTab: payload.actionTab || null,
  });

  let sent = 0;
  let removed = 0;
  const errors: string[] = [];

  for (const sub of subscriptions ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        messagePayload,
      );
      sent++;
    } catch (e: any) {
      // 404/410 = a inscrição não existe mais do lado do navegador (ex:
      // pessoa desinstalou, limpou dados) -- limpa aqui pra nunca mais
      // tentar de novo, mesmo padrão de "poda de inscrição morta" que
      // toda implementação de Web Push precisa ter.
      if (e?.statusCode === 404 || e?.statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        removed++;
      } else {
        errors.push(String(e?.message || e));
      }
    }
  }

  const summary = { ok: true, sent, removed, errorCount: errors.length, errors: errors.slice(0, 5) };
  return json(summary);
});

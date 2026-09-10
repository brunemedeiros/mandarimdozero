// ---------- Report Reply Send ----------
//
// Ação sob demanda (não cron) chamada só pela admin, a partir do Painel de
// Admin > Reports (ver shared/admin-reports.js), pra responder por e-mail
// quem enviou um report -- pedido motivador: "queria poder agradecer/
// explicar o que foi feito com o report, mesmo sem ter o e-mail à mão".
//
// Dois clientes distintos, cada um com o mínimo de privilégio necessário:
//   - `asCaller` (repassa o Authorization de quem chamou): confirma que
//     quem está chamando é mesmo a admin (mesmo e-mail já usado nas
//     policies RLS de reports_admin_*, migration 020) e lê/atualiza a
//     linha de `reports` -- RLS já cobre isso, não precisa de service
//     role pra essa parte.
//   - `serviceRole`: só pra resolver o e-mail de uma conta logada via
//     auth.admin.getUserById() -- a ÚNICA operação daqui que exige
//     service role (profiles NUNCA guarda e-mail, auth.users não é
//     legível via RLS/PostgREST comum -- mesmo padrão já usado em
//     getUserEmail() dentro de supabase/functions/notification-cron).
//
// Resolução do destinatário, nessa ordem:
//   1. reports.reporter_email já preenchido (convidado que informou, ou
//      resposta anterior já resolveu e cacheou aqui).
//   2. reports.user_id -> auth.admin.getUserById() (service role) -- e
//      grava de volta em reporter_email como cache, pra não bater na
//      Admin API de novo numa próxima resposta ao mesmo report.
//   3. Nenhum dos dois -> erro (convidado que não quis deixar e-mail).
//
// RESEND_API_KEY/RESEND_FROM_EMAIL: os MESMOS secrets já configurados pro
// notification-cron (Fase 5 do sistema de notificações) -- nenhum secret
// novo precisa ser criado pra esta function funcionar.

import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const resendApiKey = Deno.env.get('RESEND_API_KEY');
const resendFromEmail = Deno.env.get('RESEND_FROM_EMAIL');

// Mesmo e-mail já usado em TODAS as policies RLS "admin" do projeto (ver
// reports_admin_read_all/reports_admin_update, migration 020) -- nunca
// confiar só em o front-end esconder o botão de responder.
const ADMIN_EMAIL = 'brunemed1310@gmail.com';

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'method_not_allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ ok: false, error: 'missing_authorization' }, 401);
  }

  let payload: { report_id?: number | string; subject?: string; body?: string };
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: 'invalid_json' }, 400);
  }
  const reportId = payload.report_id;
  const subject = (payload.subject || '').trim();
  const body = (payload.body || '').trim();
  if (!reportId || !subject || !body) {
    return jsonResponse({ ok: false, error: 'missing_fields' }, 400);
  }

  const asCaller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: authData, error: authError } = await asCaller.auth.getUser();
  if (authError || authData?.user?.email !== ADMIN_EMAIL) {
    return jsonResponse({ ok: false, error: 'forbidden' }, 403);
  }

  const { data: report, error: reportError } = await asCaller
    .from('reports')
    .select('id, user_id, reporter_email')
    .eq('id', reportId)
    .single();
  if (reportError || !report) {
    return jsonResponse({ ok: false, error: 'report_not_found' }, 404);
  }

  let to: string | null = report.reporter_email || null;
  if (!to && report.user_id) {
    const serviceRole = createClient(supabaseUrl, serviceRoleKey);
    const { data: userData, error: userError } = await serviceRole.auth.admin.getUserById(report.user_id);
    if (userError) console.error('report-reply-send: falha ao buscar e-mail da conta', report.user_id, userError.message);
    to = userData?.user?.email || null;
  }
  if (!to) {
    return jsonResponse({ ok: false, error: 'no_email' }, 422);
  }

  if (!resendApiKey || !resendFromEmail) {
    return jsonResponse({ ok: false, error: 'email_not_configured' }, 500);
  }

  // white-space:pre-wrap preserva as quebras de linha que a admin digitou
  // no textarea, sem precisar converter \n em <br> manualmente.
  const html = `<div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
    <p style="font-size:15px;line-height:1.6;color:#241A15;white-space:pre-wrap;">${body.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>
    <p style="font-size:12px;color:#93856F;margin-top:32px;">Resposta ao report que você enviou no Francês/Mandarim do Zero.</p>
  </div>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendApiKey}` },
      body: JSON.stringify({ from: resendFromEmail, to, subject, html, text: body }),
    });
    if (!res.ok) {
      console.error('report-reply-send: falha ao enviar e-mail', reportId, res.status, await res.text());
      return jsonResponse({ ok: false, error: 'resend_failed' }, 502);
    }
  } catch (e: unknown) {
    console.error('report-reply-send: erro ao chamar Resend', reportId, String((e as Error)?.message || e));
    return jsonResponse({ ok: false, error: 'resend_failed' }, 502);
  }

  const { error: updateError } = await asCaller
    .from('reports')
    .update({ reporter_email: to, admin_reply: body, admin_reply_subject: subject, admin_reply_sent_at: new Date().toISOString() })
    .eq('id', reportId);
  if (updateError) console.error('report-reply-send: e-mail enviado mas falhou ao registrar no report', reportId, updateError.message);

  return jsonResponse({ ok: true, to }, 200);
});

// Edge Function `teacher-cards-digest`: e-mail diário "cartões novos da professora" (migration 141; proposta em
// docs/email-cartoes-professora-proposta.md). Agendada pelo cron `teacher-cards-digest-diario` (11:00 UTC), com a senha do
// agendamento (`x-cron-token` = secret NOTIFICATION_CRON_TOKEN, a mesma da notification-cron). Modo (desligado | teste | todos) vem da
// tabela teacher_cards_digest_settings: em `desligado` não envia NADA. No máximo 1 e-mail por aluno por dia (índice único no log).
// Rota pública única: `?u=<conta>&t=<assinatura>` (GET ou POST) = "Parar de receber" (link do e-mail e List-Unsubscribe de 1 clique).
// Regras e textos: core.mjs (testado em tests/email-cartoes-professora/). Deploy com verify_jwt:false (cada rota confere quem chama).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { CATEGORY, allowsDigest, decideKind, firstName, renderEmail, signUnsubscribe, unsubscribeConfirmPage, unsubscribePage, verifyUnsubscribe } from './core.mjs';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-cron-token, x-client-info', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const html = (status: number, body: string) => new Response(body, { status, headers: { ...CORS, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const secret = Deno.env.get('NOTIFICATION_CRON_TOKEN') || '';
const resendApiKey = Deno.env.get('RESEND_API_KEY');
const resendFrom = Deno.env.get('RESEND_FROM_EMAIL');

function safeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a), eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) diff |= (ea[i] || 0) ^ (eb[i] || 0);
  return diff === 0;
}
const todaySP = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
const daysSince = (iso: string | null | undefined) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : null);
// Chave PRÓPRIA da assinatura do link de sair (Vault `cards_digest_signing_key`, lida pela função do banco `cards_digest_signing_key()`;
// migration 142). Não é mais a senha do agendamento. Links já enviados antes (assinados com a senha do agendamento) continuam valendo:
// `verifyAny` confere a chave nova e, só para conferir, a antiga. Tirar a antiga depois de uns 30 dias.
let signingKeyCache: string | null = null;
async function signingKey(sb: any): Promise<string> {
  if (signingKeyCache) return signingKeyCache;
  const { data, error } = await sb.rpc('cards_digest_signing_key');
  if (error || typeof data !== 'string' || data.length < 32) throw new Error('sem_chave_de_assinatura');
  signingKeyCache = data;
  return data;
}
async function verifyAny(sb: any, uid: string, token: string): Promise<boolean> {
  let key = ''; try { key = await signingKey(sb); } catch (_) { /* cai para a conferência da chave antiga */ }
  if (key && await verifyUnsubscribe(key, uid, token)) return true;
  return await verifyUnsubscribe(secret, uid, token); // chave antiga: só para links já enviados
}
const unsubUrl = async (sb: any, uid: string, lang: string) => `${supabaseUrl}/functions/v1/teacher-cards-digest?u=${uid}&t=${await signUnsubscribe(await signingKey(sb), uid)}&l=${lang}`;

async function sendResend(to: string, mail: { subject: string; html: string; text: string }, unsubscribe: string | null): Promise<string | null> {
  if (!resendApiKey || !resendFrom) return 'resend_not_configured';
  const headers: Record<string, string> = {};
  if (unsubscribe) { headers['List-Unsubscribe'] = `<${unsubscribe}>`; headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click'; }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendApiKey}` },
      body: JSON.stringify({ from: resendFrom, to, subject: mail.subject, html: mail.html, text: mail.text, headers }),
    });
    if (!res.ok) return `resend_${res.status}: ${(await res.text()).slice(0, 200)}`;
    return null;
  } catch (e) { return `resend_exception: ${String((e as Error)?.message || e).slice(0, 200)}`; }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const url = new URL(req.url);
  const sb = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  // ---- Parar de receber (público; confere a assinatura). GET só mostra a confirmação; só o POST grava. ----
  const u = url.searchParams.get('u'), t = url.searchParams.get('t'), l = url.searchParams.get('l') === 'en' ? 'en' : 'pt';
  if (u || t) {
    if (!(await verifyAny(sb, u || '', t || ''))) return html(400, unsubscribePage(l, false));
    if (req.method === 'GET') return html(200, unsubscribeConfirmPage(l, `${supabaseUrl}/functions/v1/teacher-cards-digest?u=${encodeURIComponent(u as string)}&t=${encodeURIComponent(t as string)}&l=${l}`));
    if (req.method !== 'POST') return json(405, { ok: false, error: 'method_not_allowed' });
    const { data: row } = await sb.from('notification_preferences').select('channels').eq('user_id', u).maybeSingle();
    const channels = { ...((row && row.channels) || {}), [CATEGORY]: [] };
    const { error } = await sb.from('notification_preferences').upsert({ user_id: u, channels }, { onConflict: 'user_id' });
    if (error) { console.error('teacher-cards-digest: falha ao salvar saída', error.message); return html(500, unsubscribePage(l, false)); }
    return html(200, unsubscribePage(l, true));
  }

  if (req.method !== 'POST') return json(405, { ok: false, error: 'method_not_allowed' });
  if (secret.length < 24) return json(503, { ok: false, error: 'not_configured' });
  if (!safeEqual(req.headers.get('x-cron-token') || '', secret)) return json(401, { ok: false, error: 'unauthorized' });
  let body: any = {};
  try { const tx = await req.text(); body = tx ? JSON.parse(tx) : {}; } catch (_) { return json(400, { ok: false, error: 'invalid_json' }); }

  // ---- E-mail de teste só para o endereço informado (a dona confere a aparência antes de ligar) ----
  if (body && body.test_to) {
    const lang = body.test_lang === 'en' ? 'en' : 'pt', kind = body.test_kind === 'lembrete' ? 'lembrete' : 'novos';
    const mail = renderEmail({ lang, kind, nome: String(body.test_name || ''), n: Number(body.test_n) || 12, unsubscribeUrl: `${supabaseUrl}/functions/v1/teacher-cards-digest`, test: true });
    const err = await sendResend(String(body.test_to), mail, null);
    return json(err ? 502 : 200, { ok: !err, error: err, sent_to: body.test_to, kind, lang });
  }

  const dryRun = !!body.dry_run, today = todaySP();
  const { data: settings } = await sb.from('teacher_cards_digest_settings').select('*');
  const summary: any[] = [];
  for (const st of settings || []) {
    if (st.mode === 'desligado') { summary.push({ teacher: st.teacher_id, mode: st.mode, skipped: 'desligado' }); continue; }
    const { data: links } = await sb.from('teacher_students').select('student_id').eq('teacher_id', st.teacher_id).eq('status', 'active');
    let ids = [...new Set((links || []).map((x: any) => x.student_id))] as string[];
    if (st.mode === 'teste') ids = ids.filter(id => (st.test_student_ids || []).includes(id));
    for (const uid of ids) {
      const item: any = { student: uid };
      try {
        const { data: done } = await sb.from('teacher_cards_digest_log').select('id').eq('student_id', uid).eq('sent_on', today).limit(1);
        if (done && done.length) { item.skipped = 'ja_enviado_hoje'; summary.push(item); continue; }
        const { data: pref } = await sb.from('notification_preferences').select('channels').eq('user_id', uid).maybeSingle();
        if (!allowsDigest(pref && pref.channels)) { item.skipped = 'desligou'; summary.push(item); continue; }
        const { data: prof } = await sb.from('profiles').select('display_name').eq('user_id', uid).maybeSingle();
        const { data: prog } = await sb.from('progress').select('data').eq('user_id', uid).maybeSingle();
        const lang = prog?.data?._meta?.uiLanguage === 'en' ? 'en' : 'pt';
        const { data: lastNovos } = await sb.from('teacher_cards_digest_log').select('created_at').eq('student_id', uid).eq('kind', 'novos').eq('status', 'sent').order('created_at', { ascending: false }).limit(1);
        const since = lastNovos && lastNovos.length ? lastNovos[0].created_at : new Date(Date.now() - 3 * 86400000).toISOString();
        const { data: cards } = await sb.from('teacher_flashcards').select('created_at').eq('student_id', uid).eq('teacher_id', st.teacher_id).eq('status', 'active').not('bank_item_id', 'is', null);
        const totalCards = (cards || []).length, newCount = (cards || []).filter((c: any) => c.created_at > since).length;
        const { data: lastUse } = await sb.from('usage_events').select('created_at').eq('user_id', uid).order('created_at', { ascending: false }).limit(1);
        const lastActivity = lastUse && lastUse.length ? lastUse[0].created_at : null;
        const { data: rem } = await sb.from('teacher_cards_digest_log').select('created_at').eq('student_id', uid).eq('kind', 'lembrete').eq('status', 'sent').order('created_at', { ascending: false }).limit(20);
        const remindersSinceActivity = (rem || []).filter((r: any) => !lastActivity || r.created_at > lastActivity).length;
        const kind = decideKind({ newCount, totalCards, daysSinceActivity: daysSince(lastActivity), daysSinceReminder: rem && rem.length ? daysSince(rem[0].created_at) : null, remindersSinceActivity });
        if (!kind) { item.skipped = 'nada_a_avisar'; summary.push(item); continue; }
        const n = kind === 'novos' ? newCount : totalCards;
        item.kind = kind; item.n = n; item.lang = lang;
        if (dryRun) { item.dry_run = true; summary.push(item); continue; }
        const { data: au } = await sb.auth.admin.getUserById(uid);
        const to = au?.user?.email;
        if (!to) { item.skipped = 'sem_email'; summary.push(item); continue; }
        const { error: claimErr } = await sb.from('teacher_cards_digest_log').insert({ teacher_id: st.teacher_id, student_id: uid, kind, cards_count: n, sent_on: today, status: 'pending' });
        if (claimErr) { item.skipped = 'trava_do_dia'; summary.push(item); continue; }
        const unsubscribe = await unsubUrl(sb, uid, lang);
        const mail = renderEmail({ lang, kind, nome: firstName(prof?.display_name), n, unsubscribeUrl: unsubscribe });
        const err = await sendResend(to, mail, unsubscribe);
        await sb.from('teacher_cards_digest_log').update({ status: err ? 'error' : 'sent', error: err }).eq('student_id', uid).eq('sent_on', today);
        item.status = err ? 'error' : 'sent'; if (err) item.error = err;
      } catch (e) { item.error = String((e as Error)?.message || e).slice(0, 200); }
      summary.push(item);
    }
  }
  return json(200, { ok: true, dry_run: dryRun, today, summary });
});

// ---------- Google Agenda -> site (migration 117) ----------
//
// Sincronização em UM sentido: lê os eventos das agendas que a professora escolheu e o banco (gcal_ingest) reconhece o aluno e
// cria/atualiza a aula. Nunca escreve no Google (escopo só de leitura). Ida e volta completa fica para depois.
//
// Rotas (verify_jwt = false: a volta do login do Google não traz JWT; cada rota confere quem chama):
//   POST {action:'start', return_url}   professora logada (Authorization: Bearer <jwt>) -> {url} do consentimento do Google
//   GET  .../google-calendar/callback?code&state   volta do Google: troca o code, guarda o refresh token, volta ao site
//   POST {action:'sync'}                 x-sync-token = senha do Vault (pg_cron, todas as contas) OU professora (só a dela)
//   POST {action:'calendars'}            professora: atualiza a lista de agendas da conta Google
// Leitura: janela de 14 dias atrás a 90 dias à frente a cada rodada; na primeira vez de cada agenda, desde 2025-05-01 (para dar
// horário às aulas antigas importadas do Notion). Nunca loga token nem código.
// Secrets: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY já existem).
// A senha do cron fica só no Vault (gcal_sync_token) e é conferida por gcal_check_sync_token.

import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID') || '';
const CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') || '';
const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/google-calendar/callback`;
const SCOPES = 'openid email https://www.googleapis.com/auth/calendar.readonly';
const BACKFILL_FROM = '2025-05-01T00:00:00Z';
const ALLOWED_RETURN = [/^https:\/\/app\.profbrune\.com\.br\//, /^https:\/\/brunemedeiros\.github\.io\//, /^http:\/\/localhost(:\d+)?\//, /^http:\/\/127\.0\.0\.1(:\d+)?\//];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sync-token',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const admin = () => createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// Professora logada a partir do cabeçalho Authorization.
async function teacherFromRequest(req: Request): Promise<string | null> {
  const auth = req.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return null;
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data } = await userClient.auth.getUser();
  if (!data?.user) return null;
  const { data: isTeacher } = await userClient.rpc('is_teacher');
  return isTeacher ? data.user.id : null;
}

async function googleToken(params: Record<string, string>) {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, ...params }),
  });
  const body = await r.json().catch(() => ({}));
  return { ok: r.ok, body };
}

function emailFromIdToken(idToken?: string): string | null {
  try {
    const part = (idToken || '').split('.')[1];
    const payload = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=')));
    return payload.email || null;
  } catch { return null; }
}

async function gget(path: string, accessToken: string) {
  const r = await fetch(`https://www.googleapis.com/calendar/v3${path}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  const body = await r.json().catch(() => ({}));
  return { status: r.status, body };
}

async function listCalendars(accessToken: string) {
  const { status, body } = await gget('/users/me/calendarList?minAccessRole=reader&maxResults=250', accessToken);
  if (status !== 200) throw new Error(`calendarList ${status}`);
  return (body.items || []).map((c: any) => ({ id: c.id, summary: c.summaryOverride || c.summary, primary: !!c.primary }));
}

// Evento do Google -> formato do gcal_ingest.
export function mapEvent(e: any, calendarTz: string | null) {
  const allDay = !!(e.start && e.start.date && !e.start.dateTime);
  const attendees = (e.attendees || [])
    .filter((a: any) => !a.self && !a.resource && a.email)
    .map((a: any) => ({ email: String(a.email).toLowerCase(), name: a.displayName || null }));
  return {
    id: e.id,
    title: e.summary || null,
    start: allDay ? null : (e.start?.dateTime || null),
    end: allDay ? null : (e.end?.dateTime || null),
    time_zone: e.start?.timeZone || calendarTz || null,
    all_day: allDay,
    status: e.status === 'cancelled' ? 'cancelled' : 'confirmed',
    attendees,
  };
}

async function syncUser(sb: any, plan: any) {
  const userId = plan.user_id;
  const tok = await googleToken({ grant_type: 'refresh_token', refresh_token: plan.refresh_token });
  if (!tok.ok || !tok.body.access_token) {
    const reason = tok.body?.error === 'invalid_grant' ? 'reconnect' : `token ${tok.body?.error || 'erro'}`;
    await sb.rpc('gcal_set_error', { p_user: userId, p_error: reason });
    return { user: userId, error: reason };
  }
  const access = tok.body.access_token as string;
  const out: any[] = [];
  const now = Date.now();
  for (const src of plan.sources || []) {
    const backfill = !src.sync_token;
    const timeMin = backfill ? BACKFILL_FROM : new Date(now - 14 * 864e5).toISOString();
    const timeMax = new Date(now + 90 * 864e5).toISOString();
    let pageToken: string | null = null;
    const events: any[] = [];
    let calendarTz: string | null = null;
    let failed = false;
    do {
      const qs = new URLSearchParams({ singleEvents: 'true', showDeleted: 'true', maxResults: '2500', timeMin, timeMax });
      if (pageToken) qs.set('pageToken', pageToken);
      const { status, body } = await gget(`/calendars/${encodeURIComponent(src.calendar_id)}/events?${qs}`, access);
      if (status !== 200) {
        await sb.rpc('gcal_set_error', { p_user: userId, p_error: `events ${status} (${src.calendar_id})` });
        failed = true; break;
      }
      calendarTz = body.timeZone || calendarTz;
      for (const e of body.items || []) events.push(mapEvent(e, calendarTz));
      pageToken = body.nextPageToken || null;
    } while (pageToken);
    if (failed) { out.push({ calendar: src.calendar_id, error: true }); continue; }
    // Lotes de 300 para não estourar o tempo de uma chamada.
    for (let i = 0; i < events.length || i === 0; i += 300) {
      const batch = events.slice(i, i + 300);
      const last = i + 300 >= events.length;
      const { data, error } = await sb.rpc('gcal_ingest', {
        p_user: userId, p_calendar_id: src.calendar_id, p_events: batch,
        p_next_sync_token: last ? 'janela' : null, p_full: backfill,
      });
      if (error) { await sb.rpc('gcal_set_error', { p_user: userId, p_error: `ingest: ${error.message}` }); break; }
      out.push({ calendar: src.calendar_id, n: batch.length, counts: data?.counts });
      if (!events.length) break;
    }
  }
  await sb.rpc('gcal_retry_waiting', { p_user: userId });
  return { user: userId, calendars: out };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (!CLIENT_ID || !CLIENT_SECRET) return json({ ok: false, error: 'not_configured' }, 503);
  const url = new URL(req.url);
  const sb = admin();

  // ----- volta do Google -----
  if (req.method === 'GET' && url.pathname.endsWith('/callback')) {
    const state = url.searchParams.get('state') || '';
    const { data: rows } = /^[0-9a-f]{64}$/.test(state) ? await sb.rpc('gcal_take_state', { p_state: state }) : { data: null };
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row) return new Response('Link expirado. Volte ao site e clique em "Conectar Google Agenda" de novo.', { status: 400, headers: CORS });
    const back = new URL(row.return_url);
    const code = url.searchParams.get('code');
    if (!code) { back.searchParams.set('gcal', 'cancelado'); return Response.redirect(back.toString(), 302); }
    const tok = await googleToken({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI });
    if (!tok.ok || !tok.body.refresh_token) {
      back.searchParams.set('gcal', 'erro');
      return Response.redirect(back.toString(), 302);
    }
    let calendars: any[] = [];
    try { calendars = await listCalendars(tok.body.access_token); } catch { /* lista vem depois pelo botão */ }
    await sb.rpc('gcal_save_connection', {
      p_user: row.user_id, p_email: emailFromIdToken(tok.body.id_token), p_refresh: tok.body.refresh_token,
      p_scopes: tok.body.scope || SCOPES, p_calendars: calendars,
    });
    back.searchParams.set('gcal', 'ok');
    return Response.redirect(back.toString(), 302);
  }

  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);
  const body = await req.json().catch(() => ({}));
  const action = body?.action;

  if (action === 'start') {
    const user = await teacherFromRequest(req);
    if (!user) return json({ ok: false, error: 'not_authorized' }, 401);
    const ret = String(body.return_url || '');
    if (!ALLOWED_RETURN.some(rx => rx.test(ret))) return json({ ok: false, error: 'invalid_return_url' }, 400);
    const { data: state, error } = await sb.rpc('gcal_new_state', { p_user: user, p_return_url: ret });
    if (error) return json({ ok: false, error: 'state' }, 500);
    const auth = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    auth.search = new URLSearchParams({
      client_id: CLIENT_ID, redirect_uri: REDIRECT_URI, response_type: 'code', scope: SCOPES,
      access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true', state: String(state),
    }).toString();
    return json({ ok: true, url: auth.toString() });
  }

  if (action === 'sync') {
    const sent = req.headers.get('x-sync-token') || '';
    const fromCron = sent.length >= 32 && !!(await sb.rpc('gcal_check_sync_token', { p_token: sent })).data;
    const user = fromCron ? null : await teacherFromRequest(req);
    if (!fromCron && !user) return json({ ok: false, error: 'not_authorized' }, 401);
    const { data: plans, error } = await sb.rpc('gcal_sync_plan', { p_user: user });
    if (error) return json({ ok: false, error: 'plan' }, 500);
    const results = [];
    for (const p of plans || []) results.push(await syncUser(sb, p));
    return json({ ok: true, results: user ? results : results.map(r => ({ user: r.user, error: (r as any).error || null })) });
  }

  if (action === 'calendars') {
    const user = await teacherFromRequest(req);
    if (!user) return json({ ok: false, error: 'not_authorized' }, 401);
    const { data: plans } = await sb.rpc('gcal_sync_plan', { p_user: user });
    // gcal_sync_plan só traz quem já tem agenda ligada; para a lista, pega o token direto pela conexão.
    let refresh = plans?.[0]?.refresh_token;
    if (!refresh) {
      const { data } = await sb.from('google_calendar_connections').select('refresh_token').eq('user_id', user).maybeSingle();
      refresh = data?.refresh_token;
    }
    if (!refresh) return json({ ok: false, error: 'not_connected' }, 400);
    const tok = await googleToken({ grant_type: 'refresh_token', refresh_token: refresh });
    if (!tok.ok) return json({ ok: false, error: 'reconnect' }, 400);
    const calendars = await listCalendars(tok.body.access_token);
    await sb.rpc('gcal_save_calendars', { p_user: user, p_calendars: calendars });
    return json({ ok: true, n: calendars.length });
  }

  return json({ ok: false, error: 'unknown_action' }, 400);
});

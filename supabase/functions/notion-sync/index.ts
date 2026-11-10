// ---------- Conectar Notion -> site (migration 128) ----------
//
// Sincronização em UM sentido: lê as linhas do banco de aulas do Notion que a professora escolheu e o banco (notion_ingest)
// reconhece o aluno e completa (ou cria) a aula. Nunca escreve no Notion. Plano: docs/notion/plano-conectar-notion.md.
//
// Rotas (verify_jwt = false: a volta do login do Notion não traz JWT; cada rota confere quem chama):
//   POST {action:'start', return_url}     professora logada -> {url} do consentimento do Notion
//   GET  .../notion-sync/callback?code&state   volta do Notion: troca o code, guarda o token, volta ao site
//   POST {action:'databases'}             professora: bancos que ela autorizou -> [{id, title}]
//   POST {action:'columns', database_id}  professora: colunas do banco + sugestão do mapa -> {properties, suggested}
//   POST {action:'sync'}                  x-sync-token = senha do Vault do cron (todas as contas) OU professora (só a dela)
// Leitura: só as linhas editadas desde a última (filtro last_edited_time), e só com Data >= "importar desde".
// Secrets: NOTION_CLIENT_ID, NOTION_CLIENT_SECRET (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY já existem).
// A senha do cron é a mesma do Google Agenda (Vault gcal_sync_token, conferida por gcal_check_sync_token). Nunca loga token.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { mapRow, suggestColumns, FIELDS, FIELD_TYPES } from './map.mjs';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const CLIENT_ID = Deno.env.get('NOTION_CLIENT_ID') || '';
const CLIENT_SECRET = Deno.env.get('NOTION_CLIENT_SECRET') || '';
// Produção volta por https://agenda.profbrune.com.br/notion/callback (Netlify repassa, infra/agenda-netlify/netlify.toml).
// Staging volta direto para o Supabase. NOTION_REDIRECT_URI (secret, opcional) sobrepõe os dois.
const PROD_REF = 'eigjocalzwamisgqilhg';
const REDIRECT_URI = Deno.env.get('NOTION_REDIRECT_URI')
  || (SUPABASE_URL.includes(PROD_REF) ? 'https://agenda.profbrune.com.br/notion/callback' : `${SUPABASE_URL}/functions/v1/notion-sync/callback`);
const NOTION = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';
const ALLOWED_RETURN = [/^https:\/\/app\.profbrune\.com\.br\//, /^https:\/\/brunemedeiros\.github\.io\//, /^http:\/\/localhost(:\d+)?\//, /^http:\/\/127\.0\.0\.1(:\d+)?\//];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sync-token',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const admin = () => createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function teacherFromRequest(req: Request): Promise<string | null> {
  const auth = req.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return null;
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data } = await userClient.auth.getUser();
  if (!data?.user) return null;
  const { data: isTeacher } = await userClient.rpc('is_teacher');
  return isTeacher ? data.user.id : null;
}

async function notion(path: string, token: string, method = 'GET', body?: unknown) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch(`${NOTION}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Notion-Version': NOTION_VERSION, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (r.status === 429) { await new Promise(res => setTimeout(res, 1000 * (attempt + 1))); continue; }
    return { status: r.status, body: await r.json().catch(() => ({})) };
  }
  return { status: 429, body: {} };
}

const titleOf = (obj: any) =>
  (obj?.title || []).map((t: any) => t.plain_text || '').join('').trim()
  || Object.values(obj?.properties || {}).map((p: any) => p?.type === 'title' ? (p.title || []).map((t: any) => t.plain_text || '').join('') : '').join('').trim()
  || null;

async function syncUser(sb: any, plan: any) {
  const userId = plan.user_id;
  const map = plan.column_map || {};
  const filters: any[] = [{ property: map.date, date: { on_or_after: plan.import_from } }];
  if (plan.cursor) {
    // 2 min de folga: a hora do Notion é arredondada ao minuto
    filters.push({ timestamp: 'last_edited_time', last_edited_time: { on_or_after: new Date(new Date(plan.cursor).getTime() - 120000).toISOString() } });
  }
  const relationTitles = new Map<string, string>();
  const rows: any[] = [];
  let cursor: string | undefined;
  let maxEdited: string | null = null;
  do {
    const { status, body } = await notion(`/databases/${plan.database_id}/query`, plan.access_token, 'POST', {
      filter: filters.length > 1 ? { and: filters } : filters[0],
      sorts: [{ timestamp: 'last_edited_time', direction: 'ascending' }],
      page_size: 100, start_cursor: cursor,
    });
    if (status === 401) { await sb.rpc('notion_set_error', { p_user: userId, p_error: 'reconnect' }); return { user: userId, error: 'reconnect' }; }
    if (status !== 200) { await sb.rpc('notion_set_error', { p_user: userId, p_error: `query ${status} ${body?.code || ''}` }); return { user: userId, error: `query ${status}` }; }
    for (const page of body.results || []) {
      // Aluno numa coluna de relação: busca o título da página relacionada (uma vez por página).
      const rel = Object.values(page.properties || {}).find((p: any) => p?.id === map.student && p?.type === 'relation') as any;
      for (const r of rel?.relation || []) {
        if (relationTitles.has(r.id)) continue;
        const { status: s2, body: b2 } = await notion(`/pages/${r.id}`, plan.access_token);
        relationTitles.set(r.id, s2 === 200 ? (titleOf(b2) || '') : '');
      }
      rows.push(mapRow(page, map, relationTitles));
      if (!maxEdited || page.last_edited_time > maxEdited) maxEdited = page.last_edited_time;
    }
    cursor = body.has_more ? body.next_cursor : undefined;
  } while (cursor);

  const out: any[] = [];
  for (let i = 0; i < rows.length || i === 0; i += 200) {
    const batch = rows.slice(i, i + 200);
    const last = i + 200 >= rows.length;
    const { data, error } = await sb.rpc('notion_ingest', { p_user: userId, p_rows: batch, p_cursor: last ? maxEdited : null });
    if (error) { await sb.rpc('notion_set_error', { p_user: userId, p_error: `ingest: ${error.message}` }); return { user: userId, error: 'ingest' }; }
    out.push(data?.counts || {});
    if (!rows.length) break;
  }
  await sb.rpc('notion_retry_waiting', { p_user: userId });
  return { user: userId, rows: rows.length, counts: out };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (!CLIENT_ID || !CLIENT_SECRET) return json({ ok: false, error: 'not_configured' }, 503);
  const url = new URL(req.url);
  const sb = admin();

  // ----- volta do Notion -----
  if (req.method === 'GET' && url.pathname.endsWith('/callback')) {
    const state = url.searchParams.get('state') || '';
    const { data: rows } = /^[0-9a-f]{64}$/.test(state) ? await sb.rpc('notion_take_state', { p_state: state }) : { data: null };
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row) return new Response('Link expirado. Volte ao site e clique em "Conectar Notion" de novo.', { status: 400, headers: CORS });
    const back = new URL(row.return_url);
    const code = url.searchParams.get('code');
    if (!code) { back.searchParams.set('notion', 'cancelado'); return Response.redirect(back.toString(), 302); }
    const r = await fetch(`${NOTION}/oauth/token`, {
      method: 'POST',
      headers: { Authorization: `Basic ${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`, 'Content-Type': 'application/json', 'Notion-Version': NOTION_VERSION },
      body: JSON.stringify({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI }),
    });
    const tok = await r.json().catch(() => ({}));
    if (!r.ok || !tok.access_token) { back.searchParams.set('notion', 'erro'); return Response.redirect(back.toString(), 302); }
    await sb.rpc('notion_save_connection', {
      p_user: row.user_id, p_token: tok.access_token, p_workspace_id: tok.workspace_id || null,
      p_workspace_name: tok.workspace_name || null, p_bot_id: tok.bot_id || null,
    });
    back.searchParams.set('notion', 'ok');
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
    const { data: state, error } = await sb.rpc('notion_new_state', { p_user: user, p_return_url: ret });
    if (error) return json({ ok: false, error: 'state' }, 500);
    const auth = new URL(`${NOTION}/oauth/authorize`);
    auth.search = new URLSearchParams({ client_id: CLIENT_ID, response_type: 'code', owner: 'user', redirect_uri: REDIRECT_URI, state: String(state) }).toString();
    return json({ ok: true, url: auth.toString() });
  }

  if (action === 'databases' || action === 'columns') {
    const user = await teacherFromRequest(req);
    if (!user) return json({ ok: false, error: 'not_authorized' }, 401);
    const { data: token } = await sb.rpc('notion_token', { p_user: user });
    if (!token) return json({ ok: false, error: 'not_connected' }, 400);
    if (action === 'databases') {
      const { status, body: b } = await notion('/search', token, 'POST', { filter: { property: 'object', value: 'database' }, page_size: 100 });
      if (status === 401) return json({ ok: false, error: 'reconnect' }, 400);
      if (status !== 200) return json({ ok: false, error: `search ${status}` }, 502);
      return json({ ok: true, databases: (b.results || []).map((d: any) => ({ id: d.id, title: titleOf(d) || '(sem título)' })) });
    }
    const id = String(body.database_id || '');
    if (!/^[0-9a-f-]{32,36}$/.test(id)) return json({ ok: false, error: 'invalid_database' }, 400);
    const { status, body: db } = await notion(`/databases/${id}`, token);
    if (status !== 200) return json({ ok: false, error: `database ${status}` }, 502);
    const properties = Object.entries(db.properties || {}).map(([name, p]: [string, any]) => ({ id: p.id, name, type: p.type }));
    return json({ ok: true, title: titleOf(db), properties, suggested: suggestColumns(db.properties), fields: FIELDS, field_types: FIELD_TYPES });
  }

  if (action === 'sync') {
    const sent = req.headers.get('x-sync-token') || '';
    const fromCron = sent.length >= 32 && !!(await sb.rpc('gcal_check_sync_token', { p_token: sent })).data;
    const user = fromCron ? null : await teacherFromRequest(req);
    if (!fromCron && !user) return json({ ok: false, error: 'not_authorized' }, 401);
    const { data: plans, error } = await sb.rpc('notion_sync_plan', { p_user: user });
    if (error) return json({ ok: false, error: 'plan' }, 500);
    const results = [];
    for (const p of plans || []) results.push(await syncUser(sb, p));
    return json({ ok: true, results: user ? results : results.map((r: any) => ({ user: r.user, error: r.error || null })) });
  }

  return json({ ok: false, error: 'unknown_action' }, 400);
});

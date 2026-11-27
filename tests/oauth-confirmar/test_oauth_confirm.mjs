// 156 (achado A5): ligação do Google Agenda / Notion só depois de confirmada pela sessão logada.
// Peças puras (oauth-confirm.mjs), o que as Edge Functions fazem na volta do login e a leitura da volta no site.
// Rodar: node tests/oauth-confirmar/test_oauth_confirm.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
let ok = 0, bad = 0;
const check = (cond, msg) => { if (cond) { ok++; } else { bad++; console.log('FALHOU: ' + msg); } };

const M = await import(path.join(ROOT, 'supabase/functions/google-calendar/oauth-confirm.mjs'));

// 1. As duas cópias são iguais.
check(read('supabase/functions/google-calendar/oauth-confirm.mjs') === read('supabase/functions/notion-sync/oauth-confirm.mjs'),
  'oauth-confirm.mjs igual nas duas funções');

// 2. Código: 256 bits, base64url, sem repetir; hash SHA-256 hex.
const codes = new Set();
for (let i = 0; i < 2000; i++) codes.add(M.newConfirmCode());
check(codes.size === 2000, 'códigos não se repetem (2000)');
const c1 = [...codes][0];
check(M.isConfirmCode(c1), 'código tem o formato aceito');
check(c1.length === 43, 'código tem 43 caracteres (32 bytes)');
check(!M.isConfirmCode(''), 'vazio recusado');
check(!M.isConfirmCode(c1 + 'a'), 'tamanho errado recusado');
check(!M.isConfirmCode(c1.slice(0, 42) + '='), 'caractere fora do base64url recusado');
check(!M.isConfirmCode(null) && !M.isConfirmCode(123), 'tipo errado recusado');
const h1 = await M.hashConfirmCode(c1);
check(/^[0-9a-f]{64}$/.test(h1), 'hash tem 64 hex (casa com o check da tabela)');
check(h1 === await M.hashConfirmCode(c1), 'hash é estável');
check(h1 !== await M.hashConfirmCode(M.newConfirmCode()), 'hash muda com o código');
check(await M.hashConfirmCode('abc') === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', 'SHA-256 conhecido');

// 3. Decisão (mesmo critério da oauth_pending_confirm).
const now = Date.parse('2026-11-27T12:00:00Z');
const A = '11111111-1111-1111-1111-111111111111', B = '22222222-2222-2222-2222-222222222222';
const row = { user_id: A, expires_at: now + 60000, consumed_at: null };
check(M.decideConfirm(row, A, now) === 'ok', 'mesma pessoa dentro da validade = ok');
check(M.decideConfirm(row, B, now) === 'not_same_user', 'outra pessoa = not_same_user');
check(M.decideConfirm(row, null, now) === 'not_same_user', 'sem pessoa = not_same_user');
check(M.decideConfirm({ ...row, expires_at: now }, A, now) === 'expired', 'no limite = expirado');
check(M.decideConfirm({ ...row, expires_at: new Date(now - 1).toISOString() }, A, now) === 'expired', 'vencido (ISO) = expirado');
check(M.decideConfirm({ ...row, consumed_at: now - 5 }, A, now) === 'already_used', 'reusado = already_used');
check(M.decideConfirm(null, A, now) === 'not_found', 'inexistente = not_found');
check(M.decideConfirm({ ...row, expires_at: now + 1, consumed_at: null }, B, now) === 'not_same_user', 'outra pessoa antes de vencer');
check(M.CONFIRM_TTL_MS === 15 * 60 * 1000, 'validade 15 min');
check(M.CONFIRM_STATUS.not_same_user === 403 && M.CONFIRM_STATUS.expired === 410 && M.CONFIRM_STATUS.ok === 200
  && M.CONFIRM_STATUS.already_used === 409 && M.CONFIRM_STATUS.not_found === 404, 'códigos HTTP');

// 4. Endereço de volta.
const back = new URL(M.confirmReturnUrl('https://app.profbrune.com.br/fr/?x=1#painel', 'gcal', c1));
check(back.searchParams.get('gcal') === 'confirmar' && back.searchParams.get('c') === c1 && back.searchParams.get('x') === '1'
  && back.hash === '#painel', 'volta com gcal=confirmar&c=, mantém o resto');

// 5. Edge Functions: a volta não ativa mais a ligação; existe a ação confirm.
for (const [fn, prov, saveFn, param] of [['google-calendar', 'google', 'gcal_save_connection', 'gcal'], ['notion-sync', 'notion', 'notion_save_connection', 'notion']]) {
  const src = read(`supabase/functions/${fn}/index.ts`);
  const cb = src.slice(src.indexOf("url.pathname.endsWith('/callback')"), src.indexOf("if (req.method !== 'POST')"));
  check(cb.length > 100, `${fn}: trecho da volta encontrado`);
  check(!cb.includes(saveFn), `${fn}: a volta NÃO chama ${saveFn}`);
  check(cb.includes("sb.rpc('oauth_pending_save'") && cb.includes(`p_provider: '${prov}'`), `${fn}: a volta grava a pendência`);
  check(cb.includes(`confirmReturnUrl(back.toString(), '${param}', confirmCode)`), `${fn}: volta ao site com ${param}=confirmar`);
  check(!/console\.(log|error)\([^)]*confirmCode/.test(src), `${fn}: não loga o código`);
  check(src.includes("action === 'confirm'") && src.includes(`sb.rpc('oauth_pending_confirm', { p_provider: '${prov}'`), `${fn}: ação confirm`);
  check(src.includes('p_caller: caller') && src.includes('await userFromRequest(req)'), `${fn}: confirm usa quem está logado`);
  check(src.includes("from './oauth-confirm.mjs'"), `${fn}: importa as peças puras`);
}

// 6. Migration 156: só service_role, sem apagar nada (MCP), hash guardado.
const sql = read('shared/supabase_migrations/156_oauth_confirm_same_session.sql');
const code = sql.split('\n').filter(l => !l.trim().startsWith('--')).join('\n').toLowerCase();
check(!/\bdrop\b|\btruncate\b/.test(sql.toLowerCase()) && !/\bdelete\b/.test(sql.toLowerCase().replace(/on delete cascade/g, '')), '156 sem drop/delete/truncate (nem em comentário)');
check(code.includes('security definer set search_path = public'), '156 security definer + search_path');
check(/revoke execute on function public\.oauth_pending_save[\s\S]*from public, anon, authenticated/.test(code), '156 revoke das funções');
check(/revoke all on public\.oauth_pending_links from public, anon, authenticated/.test(code), '156 tabela fechada');
check(code.includes("check (code_hash ~ '^[0-9a-f]{64}$')"), '156 só hash na tabela');
check(code.includes("interval '15 minutes'"), '156 validade 15 min');

// 7. Site: lê a volta, tira o código do endereço e chama confirm.
for (const [file, pre, param, R] of [['shared/google-calendar.js', 'gcal', 'gcal', 'GCAL_RETURN'], ['shared/notion-sync.js', 'notion', 'notion', 'NOTION_RETURN']]) {
  const src = read(file);
  let replaced = null, calls = [];
  const ctx = {
    location: { href: `https://app.profbrune.com.br/fr/?a=1&${param}=confirmar&c=${c1}#x` },
    history: { state: null, replaceState: (_s, _t, u) => { replaced = u; } },
    URL, console, Promise, setTimeout,
    supabaseClient: { auth: { getSession: async () => ({ data: { session: { access_token: 'jwt' } } }) } },
    SUPABASE_URL: 'https://x.supabase.co',
    fetch: async (_u, o) => { calls.push(JSON.parse(o.body)); return { json: async () => ({ ok: false, error: 'not_same_user' }), status: 403 }; },
    showToast: (m) => calls.push({ toast: m }), t: k => k, ADMIN_CLASS_LOGS_STATE: {},
  };
  vm.createContext(ctx);
  vm.runInContext(src + `\n;globalThis.__R = ${R}; globalThis.__parse = ${pre}ParseReturn; globalThis.__confirm = ${pre}ConfirmReturn;`, ctx);
  check(ctx.__R && ctx.__R.status === 'confirmar' && ctx.__R.code === c1, `${file}: lê ${param}=confirmar e o código`);
  check(replaced === 'https://app.profbrune.com.br/fr/?a=1#x', `${file}: tira ${param} e c do endereço ao carregar (${replaced})`);
  check(ctx.__parse('https://app.profbrune.com.br/fr/?c=zz') === null, `${file}: sem ${param} não mexe`);
  const okR = ctx.__parse(`https://app.profbrune.com.br/fr/?${param}=ok&c=keep`);
  check(okR.status === 'ok' && okR.clean.includes('c=keep'), `${file}: volta antiga (${param}=ok) continua aceita e não mexe em outro c`);
  check(ctx.__parse(`https://app.profbrune.com.br/fr/?${param}=hack`) === null, `${file}: valor estranho ignorado`);
  await ctx.__confirm(c1);
  check(calls[0] && calls[0].action === 'confirm' && calls[0].code === c1, `${file}: chama a ação confirm com o código`);
  check(calls.some(c => c.toast === `panel.${pre}.confirmFailed`), `${file}: recusa mostra o aviso novo`);
}

// 8. Textos novos nos dois idiomas, en sem português.
const pt = read('shared/i18n/pt-BR.js'), en = read('shared/i18n/en.js');
for (const k of ['panel.gcal.confirmFailed', 'panel.notion.confirmFailed']) {
  check(pt.includes(`'${k}':`), `${k} em pt-BR`);
  const line = en.split('\n').find(l => l.includes(`'${k}':`)) || '';
  check(!!line, `${k} em en`);
  check(!/[ãõçáéíóúâêô]|navegador|ligação|logada/i.test(line), `${k} em en sem português`);
}

console.log(`${ok}/${ok + bad} verificações` + (bad ? ` (${bad} FALHOU)` : ''));
process.exit(bad ? 1 : 0);

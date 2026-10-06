#!/usr/bin/env node
// Teste de autenticação REAL no Staging (não toca produção, não usa Secret/service_role).
// Uso:  node tests/fase-grants/staging_auth_test.js
// As senhas são pedidas por prompt (digitação oculta) e ficam só na memória do processo.
// Só usa a chave PUBLICÁVEL do Staging (a mesma que um navegador usaria; não é segredo).
'use strict';
const readline = require('readline');

const STAGING_REF = 'ilfjzizjfcmhibkhwber';
const PROD_REF = 'eigjocalzwamisgqilhg';
const URL = `https://${STAGING_REF}.supabase.co`;
const PUBLISHABLE_KEY = 'sb_publishable_dj4ZuaQsArPDc2BmCQa-pw_k_fJZSt6';

// ---- Trava de projeto-alvo: aborta diante de qualquer ambiguidade ----
function assertTarget() {
  const host = new (require('url').URL)(URL).hostname;
  if (host !== `${STAGING_REF}.supabase.co` || URL.includes(PROD_REF) || PUBLISHABLE_KEY.includes(PROD_REF)) {
    console.error('ABORTADO: o alvo não é exclusivamente o Staging.'); process.exit(2);
  }
  if (process.env.SUPABASE_URL || process.env.SUPABASE_ANON_KEY) {
    console.error('ABORTADO: variáveis SUPABASE_URL/SUPABASE_ANON_KEY definidas no ambiente (ambiguidade).'); process.exit(2);
  }
  console.log('============================================================');
  console.log(' PROJETO TESTADO (project_ref): ' + STAGING_REF + '   [STAGING]');
  console.log(' URL: ' + URL);
  console.log(' Produção (' + PROD_REF + ') NÃO é usada por este script.');
  console.log('============================================================');
}

function askHidden(label) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = function (s) { if (s.includes(label)) rl.output.write(s); else rl.output.write(''); };
    rl.question(label, (a) => { rl.close(); process.stdout.write('\n'); resolve(a); });
  });
}
const ask = (label) => new Promise((resolve) => { const rl = readline.createInterface({ input: process.stdin, output: process.stdout }); rl.question(label, (a) => { rl.close(); resolve(a); }); });

async function signIn(email, password) {
  const r = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`login falhou (${email}): ${j.error_description || j.msg || r.status}`);
  const u = await (await fetch(`${URL}/auth/v1/user`, { headers: { apikey: PUBLISHABLE_KEY, Authorization: `Bearer ${j.access_token}` } })).json();
  if (u.email !== email) throw new Error('e-mail da sessão não confere');
  return { token: j.access_token, id: u.id, email };
}
const H = (s, extra) => ({ apikey: PUBLISHABLE_KEY, Authorization: `Bearer ${s.token}`, 'Content-Type': 'application/json', ...extra });
async function api(method, path, s, body, prefer) {
  const r = await fetch(`${URL}/rest/v1/${path}`, { method, headers: H(s, prefer ? { Prefer: prefer } : {}), body: body ? JSON.stringify(body) : undefined });
  let j = null; try { j = await r.json(); } catch (_) {}
  return { status: r.status, body: j };
}
const getProfile = async (s) => (await api('GET', `profiles?user_id=eq.${s.id}&select=user_id,role,plan_tier`, s)).body;

function classify(res) {
  const m = JSON.stringify(res.body || '');
  if (res.status >= 200 && res.status < 300 && Array.isArray(res.body) && res.body.length) return 'PERMITIDO (linha afetada)';
  if (res.status >= 200 && res.status < 300) return 'sem efeito (0 linhas / RLS)';
  if (/plan_role_protected/.test(m)) return 'BLOQUEADO pela proteção de plano/role (trigger 063/066)';
  if (/row-level security/.test(m)) return 'BLOQUEADO por RLS (policy)';
  if (/permission denied/.test(m)) return 'BLOQUEADO por GRANT ausente (permission denied) — NÃO é a proteção 063/066';
  return 'ERRO ' + res.status + ' ' + m.slice(0, 200);
}
const results = [];
function report(name, res, expectBlockedBy) {
  const c = classify(res);
  const ok = expectBlockedBy ? c.includes(expectBlockedBy) : null;
  results.push({ name, c, ok });
  console.log(`\n[${name}]\n  status HTTP: ${res.status}\n  corpo: ${JSON.stringify(res.body)}\n  => ${c}${ok === null ? '' : ok ? '   ✔ esperado' : '   ✘ INESPERADO'}`);
}

(async () => {
  assertTarget();
  const which = (await ask('Testes a rodar [A,B = existentes | C = primeiro perfil | ALL]: ')).trim().toUpperCase() || 'ALL';
  const want = (t) => which === 'ALL' || which.split(/[ ,]+/).includes(t);

  if (want('A') || want('B')) {
    const pf = await askHidden('Senha de staging-free@idiomas.test: ');
    const free = await signIn('staging-free@idiomas.test', pf);
    console.log('login ok (Free). perfil atual:', JSON.stringify(await getProfile(free)));
    const upd = (s, patch) => api('PATCH', `profiles?user_id=eq.${s.id}`, s, patch, 'return=representation');
    if (want('A')) {
      report('A1 Free: plan_tier -> premium', await upd(free, { plan_tier: 'premium' }), 'proteção de plano');
      report('A2 Free: role -> admin', await upd(free, { role: 'admin' }), 'proteção de plano');
      console.log('perfil Free após A:', JSON.stringify(await getProfile(free)));
    }
    if (want('B')) {
      const pp = await askHidden('Senha de staging-premium@idiomas.test: ');
      const prem = await signIn('staging-premium@idiomas.test', pp);
      console.log('login ok (Premium). perfil atual:', JSON.stringify(await getProfile(prem)));
      report('B1 Premium: role -> admin', await upd(prem, { role: 'admin' }), 'proteção de plano');
      report('B2 Premium: plan_tier -> free (rebaixar a si mesmo)', await upd(prem, { plan_tier: 'free' }), 'proteção de plano');
      console.log('perfil Premium após B:', JSON.stringify(await getProfile(prem)));
    }
  }

  if (want('C')) {
    const pn = await askHidden('Senha de staging-noprofile@idiomas.test: ');
    const np = await signIn('staging-noprofile@idiomas.test', pn);
    const before = await getProfile(np);
    console.log('login ok (sem perfil). perfis existentes para esta conta:', JSON.stringify(before));
    if (Array.isArray(before) && before.length) { console.log('ABORTADO: esta conta JÁ tem perfil; o teste C exige conta sem perfil.'); process.exit(3); }
    const conf = (await ask('ATENÇÃO: se a falha existir, o INSERT cria um perfil admin/premium que não pode ser apagado pelo usuário (eu neutralizo depois pelo MCP). Prosseguir? [digite SIM]: ')).trim();
    if (conf !== 'SIM') { console.log('Cancelado.'); process.exit(0); }
    const res = await api('POST', 'profiles', np, { user_id: np.id, role: 'admin', plan_tier: 'premium' }, 'return=representation');
    report('C Sem perfil: INSERT role=admin, plan_tier=premium', res, 'proteção de plano');
    console.log('perfil depois:', JSON.stringify(await getProfile(np)));
  }

  console.log('\n===== RESUMO =====');
  results.forEach((r) => console.log(`${r.ok === false ? '✘' : '✔'} ${r.name}: ${r.c}`));
  console.log('Cole esta saída inteira na conversa (não contém senhas nem tokens).');
})().catch((e) => { console.error('ERRO:', e.message); process.exit(1); });

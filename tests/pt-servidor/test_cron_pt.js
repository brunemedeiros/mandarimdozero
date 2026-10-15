// E6 mínima (docs/i18n/e6-minimo-servidor-pt.md): notification-cron com português (Q1), lembrete de badge pelo idioma
// principal (T5) e "site em inglês sem modelo em inglês ativo = sem aviso" (T1), no cron E no cliente (shared/notifications.js).
// Roda o handler REAL do cron (supabase/functions/notification-cron/index.ts e a cópia do painel
// docs/deploy/notification-cron-para-colar-no-painel.ts), types removidos pelo Node 22, com um banco falso em memória
// (sem rede). Rodar: node tests/pt-servidor/test_cron_pt.js
const fs = require('fs'), vm = require('vm'), path = require('path'), mod = require('module');
const ROOT = path.join(__dirname, '../..');
const SOURCES = [
  ['repo', path.join(ROOT, 'supabase/functions/notification-cron/index.ts')],
  ['painel', path.join(ROOT, 'docs/deploy/notification-cron-para-colar-no-painel.ts')],
];
let pass = 0, fail = 0;
const t = (n, ok, x) => { if (ok) pass++; else { fail++; console.log('FALHOU', n, x !== undefined ? JSON.stringify(x) : ''); } };
const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

// ---------- banco falso (só o que o cron usa) ----------
function fakeDb(tables, users) {
  const rows = (tb) => (tables[tb] = tables[tb] || []);
  function builder(tb) {
    const st = { filters: [], head: false, op: 'select' };
    const match = (r) => st.filters.every(([k, c, v]) => k === 'eq' ? r[c] === v : k === 'in' ? v.includes(r[c]) : k === 'is' ? (r[c] ?? null) === v : k === 'gte' ? String(r[c] ?? '') >= v : true);
    const run = () => {
      if (st.op === 'delete') { tables[tb] = rows(tb).filter((r) => !match(r)); return { error: null }; }
      const data = rows(tb).filter(match);
      return st.head ? { count: data.length, error: null } : { data, error: null };
    };
    const b = {
      select(_c, o) { if (o && o.head) st.head = true; return b; },
      eq(c, v) { st.filters.push(['eq', c, v]); return b; },
      in(c, v) { st.filters.push(['in', c, v]); return b; },
      is(c, v) { st.filters.push(['is', c, v]); return b; },
      gte(c, v) { st.filters.push(['gte', c, v]); return b; },
      order() { return b; }, limit() { return b; },
      delete() { st.op = 'delete'; return b; },
      maybeSingle() { const r = run(); return Promise.resolve({ data: (r.data || [])[0] || null, error: null }); },
      insert(row) { rows(tb).push({ created_at: new Date().toISOString(), ...row }); return Promise.resolve({ error: null }); },
      then(res, rej) { return Promise.resolve(run()).then(res, rej); },
    };
    return b;
  }
  return {
    from: builder,
    rpc: async () => ({ data: { notified: 0 }, error: null }),
    auth: { admin: { getUserById: async (id) => ({ data: { user: users[id] || null }, error: null }) } },
  };
}

function loadCron(file) {
  let src = fs.readFileSync(file, 'utf8').replace(/^import .*$/mg, '');
  const js = mod.stripTypeScriptTypes(src);
  const ctx = { console: { log() {}, error() {} }, Date, Object, Number, Array, Promise, Map, Set, JSON, String, Math, Response: class { constructor(b) { this.body = b; } },
    fetch: async () => ({ ok: true }), webpush: { setVapidDetails() {}, sendNotification: async () => {} },
    Deno: { env: { get: (k) => ({ SUPABASE_URL: 'http://x', SUPABASE_SERVICE_ROLE_KEY: 'k', VAPID_PUBLIC_KEY: 'p', VAPID_PRIVATE_KEY: 'q', RESEND_API_KEY: 'r', RESEND_FROM_EMAIL: 'f@example.invalid' })[k] }, serve(fn) { ctx.__handler = fn; } },
    createClient: () => ctx.__db,
  };
  vm.createContext(ctx);
  vm.runInContext(js + '\nthis.__B = blockForLanguage; this.__P = primaryLanguageAppKey; this.__L = LANGUAGES; this.__T = typeof templateLangsFor === "function" ? templateLangsFor : () => null;', ctx);
  return ctx;
}

const RULES = ['revisao', 'streak', 'estudo', 'reengajamento', 'desafios', 'ranking', 'perfil', 'supervisao']
  .map((category) => ({ category, active: true, daily_cap: 0, cooldown_minutes: 0, schedule_days: category === 'reengajamento' ? [1, 2, 3] : (category === 'supervisao' ? [3] : []) }));
const tpl = (event_type, language_app_key, ui_language, body, active = true, channel = 'in_app') => ({ event_type, channel, language_app_key, ui_language, active, title: null, body });
const U = (n) => `00000000-0000-0000-0000-0000000000${String(n).padStart(2, '0')}`;

async function runCron(ctx, tables, users = {}) {
  ctx.__db = fakeDb(tables, users);
  await ctx.__handler({});
  return tables;
}
const notif = (tables, user) => (tables.notifications || []).filter((n) => n.user_id === user);
const events = (tables, user) => (tables.notification_events || []).filter((n) => n.user_id === user);

(async () => {
  const sources = process.env.CRON_SRC ? [['env', process.env.CRON_SRC]] : SOURCES;
  for (const [label, file] of sources) {
    const ctx = loadCron(file);
    const L = (n) => `${label}: ${n}`;
    t(L('LANGUAGES tem portugues'), ctx.__L.some((l) => l.appKey === 'portugues' && l.id === 'pt'));
    t(L('bloco portugues@en é achado'), ctx.__B({ 'portugues@en': { a: 1 } }, 'portugues')?.a === 1);
    t(L('idioma principal de conta só pt'), ctx.__P({ 'portugues@en': { lastStudyDay: day(0) } }) === 'portugues');
    t(L('idioma principal: currentLearningLanguage pt vence'), ctx.__P({ frances: { lastStudyDay: day(0) }, 'portugues@en': { lastStudyDay: day(-3) }, _meta: { currentLearningLanguage: 'pt' } }) === 'portugues');
    t(L('modelos: en só en'), JSON.stringify(ctx.__T('en')) === '["en"]');
    t(L('modelos: pt-BR só pt-BR'), JSON.stringify(ctx.__T('pt-BR')) === '["pt-BR"]');

    // Cenário principal: várias contas, um disparo do cron.
    const atRisk = { streak: 3, lastStudyDay: day(-1) };
    const tables = {
      notification_rules: RULES,
      notification_templates: [
        tpl('streak_at_risk', 'portugues', 'en', 'PT-EN streak'),
        tpl('streak_at_risk', 'portugues', 'pt-BR', 'PT-PTBR streak (não pode sair)'),
        tpl('streak_at_risk', 'frances', 'pt-BR', 'FR-PTBR streak'),
        tpl('streak_at_risk', 'frances', 'en', 'FR-EN streak (inativo)', false),
        tpl('streak_at_risk', 'mandarim', 'pt-BR', 'ZH-PTBR streak'),
        tpl('streak_at_risk', 'mandarim', 'en', 'ZH-EN streak'),
        tpl('featured_badge_reminder', 'portugues', 'en', 'PT-EN badge'),
        tpl('featured_badge_reminder', 'frances', 'pt-BR', 'FR-PTBR badge'),
        tpl('featured_badge_reminder', 'frances', 'en', 'FR-EN badge'),
        tpl('user_inactive_2', 'portugues', 'en', 'PT-EN inactive 2'),
      ],
      progress: [
        { user_id: U(1), data: { 'portugues@en': atRisk, _meta: { uiLanguage: 'en' } } },                 // só pt, site en
        { user_id: U(2), data: { 'frances@en': atRisk, _meta: { uiLanguage: 'en' } } },                   // fr no site en, modelo en inativo
        { user_id: U(3), data: { frances: atRisk, _meta: { uiLanguage: 'pt-BR' } } },                     // fr em português (como hoje)
        { user_id: U(4), data: { 'mandarim@en': atRisk, _meta: { uiLanguage: 'en' } } },                  // zh no site en, modelo en ativo
        { user_id: U(5), data: { frances: atRisk, 'portugues@en': atRisk, _account: { streak: 3, lastStudyDay: day(-1) }, _meta: { uiLanguage: 'en', currentLearningLanguage: 'pt' } } },
        { user_id: U(6), data: { 'portugues@en': { lastStudyDay: day(-2) }, _meta: { uiLanguage: 'en' } } }, // reengajamento 2 dias
        { user_id: U(7), data: { 'portugues@en': { streak: 0 }, _meta: { uiLanguage: 'en' } } },          // lembrete de badge
        { user_id: U(8), data: { frances: { streak: 0 }, _meta: { uiLanguage: 'pt-BR' } } },              // lembrete de badge (fr, como antes)
        { user_id: U(9), data: { mandarim: { streak: 0 }, 'portugues@en': { streak: 0, lastStudyDay: day(0) }, _meta: { uiLanguage: 'en' } } },
      ],
      profiles: [U(7), U(8), U(9)].map((user_id) => ({ user_id, featured_badge_id: null })),
      badge_grants: [U(7), U(8), U(9)].map((user_id) => ({ user_id })),
      teacher_students: [], weekly_xp: [], push_subscriptions: [], notification_preferences: [],
    };
    await runCron(ctx, tables);
    const n1 = notif(tables, U(1));
    t(L('Q1: conta só de português recebe "sequência em risco" (portugues, inglês)'), n1.length === 1 && n1[0].language_app_key === 'portugues' && n1[0].body === 'PT-EN streak', n1);
    t(L('Q1: evento do cron gravado em portugues'), events(tables, U(1)).some((e) => e.language_app_key === 'portugues' && e.event_type === 'streak_at_risk'));
    t(L('T1: fr no site em inglês com modelo en inativo: SEM aviso (nunca o texto em português)'), notif(tables, U(2)).length === 0, notif(tables, U(2)));
    t(L('T1: o evento continua no log (notification_events)'), events(tables, U(2)).some((e) => e.event_type === 'streak_at_risk' && e.language_app_key === 'frances'));
    t(L('fr em português continua igual'), notif(tables, U(3)).map((n) => n.body).join() === 'FR-PTBR streak');
    t(L('zh no site em inglês com modelo en ativo: aviso em inglês'), notif(tables, U(4)).map((n) => n.body).join() === 'ZH-EN streak');
    const n5 = notif(tables, U(5)).filter((n) => n.event_type === 'streak_at_risk');
    t(L('conta fr+pt com _account: sequência em risco UMA vez, no idioma principal (pt)'), n5.length === 1 && n5[0].language_app_key === 'portugues', n5);
    t(L('conta fr+pt: o cron passa pelos dois idiomas'), events(tables, U(5)).filter((e) => e.event_type === 'streak_at_risk').length === 1);
    t(L('reengajamento do português (dia 2, inglês)'), notif(tables, U(6)).map((n) => `${n.language_app_key}:${n.body}`).join() === 'portugues:PT-EN inactive 2', notif(tables, U(6)));
    const b7 = notif(tables, U(7)).filter((n) => n.event_type === 'featured_badge_reminder');
    t(L('T5: lembrete de badge de conta só pt vai para portugues (não para frances)'), b7.length === 1 && b7[0].language_app_key === 'portugues' && b7[0].body === 'PT-EN badge', b7);
    const b8 = notif(tables, U(8)).filter((n) => n.event_type === 'featured_badge_reminder');
    t(L('T5: conta só fr continua em frances'), b8.length === 1 && b8[0].language_app_key === 'frances' && b8[0].body === 'FR-PTBR badge', b8);
    const e9 = events(tables, U(9)).filter((e) => e.event_type === 'featured_badge_reminder');
    t(L('T5: zh+pt sem idioma atual: o estudado por último (pt)'), e9.length === 1 && e9[0].language_app_key === 'portugues', e9);
    t(L('nenhum aviso em português para quem usa o site em inglês'), (tables.notifications || []).filter((n) => [U(1), U(2), U(4), U(5), U(6), U(7), U(9)].includes(n.user_id)).every((n) => !/PTBR/.test(n.body)));

    // e-mail: mesma regra (sem variante en de e-mail = sem e-mail)
    const tables2 = {
      notification_rules: RULES,
      notification_templates: [tpl('user_inactive_2', 'frances', 'en', 'FR-EN inactive'), tpl('user_inactive_2', 'frances', 'pt-BR', 'FR-PTBR inactive'), tpl('user_inactive_2', 'frances', 'pt-BR', 'FR-PTBR email', true, 'email')],
      progress: [{ user_id: U(20), data: { 'frances@en': { lastStudyDay: day(-2) }, _meta: { uiLanguage: 'en' } } },
                 { user_id: U(21), data: { frances: { lastStudyDay: day(-2) }, _meta: { uiLanguage: 'pt-BR' } } }],
      notification_preferences: [{ user_id: U(20), channels: { reengajamento: ['in_app', 'email'] } }, { user_id: U(21), channels: { reengajamento: ['in_app', 'email'] } }],
      profiles: [], badge_grants: [], teacher_students: [], weekly_xp: [], push_subscriptions: [],
    };
    const mailed = []; ctx.fetch = async (_u, o) => { mailed.push(JSON.parse(o.body).to); return { ok: true }; };
    await runCron(ctx, tables2, { [U(20)]: { email: 'a20@example.invalid' }, [U(21)]: { email: 'a21@example.invalid' } });
    t(L('T1 e-mail: sino em inglês sai, e-mail sem variante en NÃO sai'), notif(tables2, U(20)).map((n) => n.body).join() === 'FR-EN inactive' && !mailed.includes('a20@example.invalid'), { n: notif(tables2, U(20)), mailed });
    t(L('e-mail em português continua saindo (controle)'), mailed.join() === 'a21@example.invalid', mailed);
  }

  // ---------- mesma regra que a função SQL _progress_block (105): os MESMOS casos de progress_block_cases.json ----------
  // O cron recebe progress.data pelo PostgREST, com as chaves na ordem do jsonb (tamanho, depois bytes): reordenamos igual.
  const jsonbOrder = (o) => (o && typeof o === 'object' && !Array.isArray(o))
    ? Object.fromEntries(Object.keys(o).sort((x, y) => (Buffer.byteLength(x) - Buffer.byteLength(y)) || Buffer.compare(Buffer.from(x), Buffer.from(y))).map((k) => [k, o[k]]))
    : o;
  const reg = require(path.join(ROOT, 'languages/registry.js'));
  global.LanguageRegistry = reg.LanguageRegistry;
  const CS = require(path.join(ROOT, 'shared/course-storage.js'));
  const cron = loadCron(SOURCES[0][1]);
  const cases = JSON.parse(fs.readFileSync(path.join(__dirname, 'progress_block_cases.json'), 'utf8'));
  for (const c of cases) {
    const data = jsonbOrder(c.data);
    const got = c.site ? CS.blockFor(data, c.app, c.site) : cron.__B(data, c.app);
    t(`regra do bloco (${c.site ? 'course-storage.js' : 'cron'}): ${c.name}`, JSON.stringify(got ?? null) === JSON.stringify(c.expect), got);
  }

  // ---------- código igual nos dois arquivos (o do painel só tem comentários encurtados) ----------
  const norm = (f) => fs.readFileSync(f, 'utf8').split('\n')
    .map((l) => l.replace(/\s+\/\/ [^'"`]*$/, '').trimEnd())
    .filter((l) => l.trim() && !/^\s*\/\//.test(l)).join('\n');
  const a = norm(SOURCES[0][1]).split('\n'), b = norm(SOURCES[1][1]).split('\n');
  const firstDiff = a.findIndex((l, i) => l !== b[i]);
  t('cópia do painel tem o MESMO código do repo (sem contar comentários)', a.length === b.length && firstDiff === -1, firstDiff >= 0 ? { repo: a[firstDiff], painel: b[firstDiff] } : { a: a.length, b: b.length });

  // ---------- cliente: shared/notifications.js pickNotificationTemplate ----------
  const nsrc = fs.readFileSync(path.join(ROOT, 'shared/notifications.js'), 'utf8');
  const fnSrc = nsrc.match(/async function pickNotificationTemplate\(eventType\)\{[\s\S]*?\n\}\n/)[0];
  const mkClient = (rows) => ({ from() {
    const f = []; const b = { select() { return b; }, eq(c, v) { f.push([c, v]); return b; },
      then(res) { return Promise.resolve({ data: rows.filter((r) => f.every(([c, v]) => r[c] === v)), error: null }).then(res); } };
    return b; } });
  const cctx = { Promise, Math, APP_KEY: 'portugues' };
  vm.createContext(cctx);
  vm.runInContext(fnSrc + '\nthis.pick = pickNotificationTemplate;', cctx);
  const crow = [tpl('xp_earned', 'portugues', 'pt-BR', 'PT-PTBR xp'), tpl('xp_earned', 'frances', 'en', 'FR-EN xp'), tpl('xp_earned', 'frances', 'pt-BR', 'FR-PTBR xp')];
  cctx.supabaseClient = mkClient(crow); cctx.getUiLang = () => 'en';
  t('cliente T1: pt no site em inglês sem modelo en = sem aviso', (await cctx.pick('xp_earned')) === null);
  cctx.APP_KEY = 'frances';
  t('cliente: fr no site em inglês com modelo en = inglês', (await cctx.pick('xp_earned'))?.body === 'FR-EN xp');
  cctx.getUiLang = () => 'pt-BR';
  t('cliente: fr no site em português = português', (await cctx.pick('xp_earned'))?.body === 'FR-PTBR xp');
  cctx.supabaseClient = mkClient([tpl('xp_earned', 'frances', 'pt-BR', 'FR-PTBR xp')]); cctx.getUiLang = () => 'en';
  t('cliente T1: fr no site em inglês só com modelo pt-BR = sem aviso', (await cctx.pick('xp_earned')) === null);

  console.log(`cron/cliente pt: ${pass} passaram, ${fail} falharam`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });

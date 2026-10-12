// C4 da E3: conquistas da CONTA valem em qualquer idioma (união por badge_id); conquistas de CURSO seguem por idioma.
// Rodar: node tests/curso-progresso/test_conquistas_conta.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };

global.LanguageRegistry = require(path.join(ROOT, 'languages/registry.js'));
const AP = require(path.join(ROOT, 'shared/account-progress.js'));
const COURSE = ['unit_1', 'unit_half', 'unit_all', 'explorer', 'trained_ear', 'multitasker'];

// 1) classificação coerente com o catálogo real de cada idioma
for (const f of ['fr/app.js', 'zh/app.js']) {
  const src = read(f);
  const block = src.slice(src.indexOf('const BADGES = ['), src.indexOf('// ---------- Detecção + celebração'));
  const ids = [...block.matchAll(/\{ id:'([a-z_0-9]+)'/g)].map(m => m[1]);
  check(f + ': catálogo lido', ids.length >= 14, ids.length);
  for (const id of AP.ACCOUNT_BADGE_IDS) check(f + ': conquista da conta existe: ' + id, ids.includes(id));
  const unclassified = ids.filter(id => !AP.isAccountBadge(id) && !COURSE.includes(id) && !/^unit_/.test(id));
  check(f + ': toda conquista é de conta ou de curso', unclassified.length === 0, unclassified);
  check(f + ': usa badgeEarnedNow na grade', /badgeEarnedNow\(b, STATE\)/.test(src));
}
for (const id of COURSE) check('conquista de curso não é da conta: ' + id, !AP.isAccountBadge(id));

// 2) união
const own = new Set(['first_step']);
const rows = [{ badge_id: 'streak_7', language_app_key: 'mandarim' }, { badge_id: 'unit_1', language_app_key: 'mandarim' }, { badge_id: 'xp_500', language_app_key: 'mandarim' }];
const u = AP.unionBadgeIds(own, rows);
check('união traz conquista da conta de outro idioma', u.has('streak_7') && u.has('xp_500'));
check('união NÃO traz conquista de curso de outro idioma', !u.has('unit_1'));
check('união mantém as do idioma atual', u.has('first_step'));
check('união não remove nada (entrada vazia)', AP.unionBadgeIds(own, []).has('first_step') && AP.unionBadgeIds(own, null).size === 1);
check('entrada não é alterada', own.size === 1);
check('linhas inválidas ignoradas', AP.unionBadgeIds([], [null, {}, { badge_id: 'nada' }]).size === 0);
// propriedade: união ⊇ próprios, idempotente
let ok = true;
const all = [...AP.ACCOUNT_BADGE_IDS, ...COURSE];
for (let i = 0; i < 300; i++) {
  const o = all.filter(() => Math.random() < .3), r = all.filter(() => Math.random() < .3).map(b => ({ badge_id: b }));
  const a = AP.unionBadgeIds(o, r), b = AP.unionBadgeIds(a, r);
  if (!o.every(x => a.has(x)) || a.size !== b.size || [...a].some(x => !o.includes(x) && (!AP.isAccountBadge(x)))) ok = false;
}
check('propriedade (300 casos): contém os próprios, idempotente, só acrescenta conquistas da conta', ok);

// 3) badgeEarnedNow (auth.js) em sandbox
const auth = read('shared/auth.js');
const start = auth.indexOf('let accountEarnedBadgeRows'), end = auth.indexOf('// Tenta de novo (rede instável');
const ctx = { AccountProgress: AP, CURRENT_USER: { id: 'u1' }, console, result: null };
ctx.supabaseClient = { from: () => ({ select: () => ({ eq: async () => ctx.__resp }) }) };
vm.createContext(ctx);
vm.runInContext(auth.slice(start, end) + '\nthis.fns={loadAccountEarnedBadges,badgeEarnedNow,rows:()=>accountEarnedBadgeRows};', ctx);
(async () => {
  const b = id => ({ id, check: s => !!s[id] });
  ctx.__resp = { data: rows, error: null };
  await ctx.fns.loadAccountEarnedBadges();
  check('badge da conta ganho em outro idioma aparece como ganho', ctx.fns.badgeEarnedNow(b('streak_7'), {}));
  check('badge de curso de outro idioma NÃO aparece', !ctx.fns.badgeEarnedNow(b('unit_1'), {}));
  check('badge calculado no idioma atual continua ganho', ctx.fns.badgeEarnedNow(b('unit_1'), { unit_1: true }));
  ctx.__resp = { data: null, error: { message: 'rede' } };
  await ctx.fns.loadAccountEarnedBadges();
  check('erro de rede mantém o que já tinha (não perde conquista)', ctx.fns.rows().length === 3);
  ctx.CURRENT_USER = null;
  await ctx.fns.loadAccountEarnedBadges();
  check('sem conta: lista vazia, idioma atual segue calculando', ctx.fns.rows().length === 0 && ctx.fns.badgeEarnedNow(b('first_step'), { first_step: true }));

  // 4) perfil público de outra pessoa: conquista de curso só do idioma atual, da conta de qualquer um
  const pp = read('shared/leaderboard.js');
  check('perfil público: não filtra mais por idioma no SQL', !/fetchUserEarnedBadges[\s\S]{0,400}\.eq\('language_app_key', APP_KEY\)/.test(pp));
  check('perfil público: filtra no cliente por idioma ou conquista da conta', /language_app_key === APP_KEY \|\| AccountProgress\.isAccountBadge/.test(pp));
  // 5) tabela earned_badges inalterada: nenhuma migration nova
  const migs = fs.readdirSync(path.join(ROOT, 'shared/supabase_migrations')).filter(f => /^07[6-9]/.test(f));
  check('nenhuma migration nova no C4', migs.length === 0, migs);
  console.log(`conquistas da conta: ${passed} passaram, ${failed} falharam`);
  process.exit(failed ? 1 : 0);
})();

// Expressões em álbum + "Expressão de hoje" + registro (12/10/2026) --
// Playwright (Chromium real), só fr (o zh não tem Desafios). Mesmo stub do
// teste de Desafios do Módulo: lote A1-m1 real + lote de 80 expressões real.
// Rodar: node tests/desafios-album/test_playwright.js  (SHOTS=dir para prints)
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});

const lote = JSON.parse(fs.readFileSync(path.join(ROOT, 'fr/scripts/challenges_import/lote-a1-m1.json'), 'utf8'));
const expr80 = JSON.parse(fs.readFileSync(path.join(ROOT, 'fr/scripts/challenges_import/lote-expressoes-80.json'), 'utf8'));
const toRow = (it, status = 'published') => { const { id, type, level, ...data } = it; return { id, type, level, status, data: { ...data, status } }; };
const legacy = [
  toRow({ ...expr80[0], id: 'expr-old-001', level: 'A1' }),
  toRow({ id: 'lt-old-001', type: 'listen_translate', level: 'A1', sentenceFr: 'Je mange une pomme.', audioFile: 'x.mp3', hintText: 'Je ______ une pomme.', referenceTranslations: ['Eu como uma maçã.'], explanation: '' }),
  toRow({ id: 'accent-old-001', type: 'accent', level: 'A1', targetText: 'école', audioFile: 'y.mp3', explanation: '' }),
];
const ROWS = [...legacy, ...lote.map(i => toRow(i)), ...expr80.slice(0, 12).map(i => toRow(i))];

const STUB = `
(function(){
  const ROWS = ${JSON.stringify(ROWS)};
  function builder(table){
    const b = new Proxy({}, { get(_, prop){
      if (prop === 'then') return (ok) => Promise.resolve({ data: table === 'challenges' ? ROWS : [], error: null }).then(ok);
      if (prop === 'single' || prop === 'maybeSingle') return () => Promise.resolve({ data: null, error: null });
      return () => b;
    }});
    return b;
  }
  const client = {
    auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: async () => ({}) },
    from: builder, rpc: async () => ({ data: null, error: null }),
    channel: () => ({ on(){ return this; }, subscribe(){ return this; } }),
    storage: { from: () => ({ upload: async () => ({}), getPublicUrl: () => ({ data: { publicUrl: '' } }), remove: async () => ({}) }) },
    functions: { invoke: async () => ({ data: null, error: null }) },
  };
  window.supabase = { createClient: () => client };
})();`;


let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };

async function boot(browser, port, theme, width){
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: width || 1200, height: 900 }, colorScheme: theme || 'light' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
  await page.goto(`http://127.0.0.1:${port}/fr/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
  return { page, errors, ctx };
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const SHOTS = process.env.SHOTS;

  for (const [theme, width] of [['light', 1200], ['dark', 1200], ['light', 390], ['dark', 390]]){
    const tag = `${theme}/${width}`;
    const { page, errors, ctx } = await boot(browser, port, theme, width);
    const ev = (fn, a) => page.evaluate(fn, a);
    await ev(async () => { switchTab('challenges'); await renderChallengeCategories(); });
    // concluir 2 expressões para o álbum ter os dois estados
    await ev(() => { markChallengeCompleted('expr-a1m1-001'); markChallengeCompleted('expr-lote1-003'); renderChallengesList('expression'); });
    let r = await ev(() => ({
      cards: [...document.querySelectorAll('.expr-card')].map(c => ({ id: c.dataset.challengeId, done: c.classList.contains('completed'),
        meaning: (c.querySelector('.expr-card-meaning') || {}).textContent || null, hint: (c.querySelector('.expr-card-hint') || {}).textContent || null,
        reg: (c.querySelector('.expr-reg') || {}).textContent || null, seal: !!c.querySelector('.expr-card-seal'), tier: !!c.querySelector('.tier-badge'),
        audioInside: !!c.querySelector('button') })),
      plays: document.querySelectorAll('.expr-card-wrap > .expr-play').length,
      today: (document.querySelector('.expr-today-expr') || {}).textContent || null,
      todayReg: (document.querySelector('.expr-today .expr-reg') || {}).textContent || null,
    }));
    const done1 = r.cards.find(c => c.id === 'expr-a1m1-001');
    const pend = r.cards.find(c => c.id === 'expr-a1m1-002');
    const slang = r.cards.find(c => c.id === 'expr-lote1-003');
    check(`${tag}: todas as expressões viram cartão de álbum`, r.cards.length === 18, r.cards.length);
    check(`${tag}: concluída mostra sentido e selo`, done1 && done1.done && done1.seal && /Prazer em conhecer/.test(done1.meaning) && !done1.hint, done1);
    // 2026-10-19 (pedido da autora): sem "O que será que significa?" e sem a etiqueta de nível no cartão.
    check(`${tag}: pendente esconde o sentido, sem a pergunta`, pend && !pend.done && !pend.meaning && !pend.hint, pend);
    const lay = await ev(() => { const g = document.querySelector('.challenges-cards:has(> .expr-card-wrap)');
      const cols = getComputedStyle(g).gridTemplateColumns.split(' ').length;
      const secs = [...document.querySelectorAll('.challenges-level-section')].map(e => e.getBoundingClientRect());
      return { cols, chip: document.querySelectorAll('.expr-card .challenge-card-level').length,
        gaps: secs.slice(1).map((r, i) => Math.round(r.top - secs[i].bottom)) }; });
    check(`${tag}: cartões compactos (${width >= 760 ? '3 ou mais' : '2'} por linha), sem etiqueta de nível, níveis sem encostar`,
      (width >= 760 ? lay.cols >= 3 : lay.cols === 2) && lay.chip === 0 && lay.gaps.every(g => g >= 20), lay);
    check(`${tag}: sentido concluído sem o aviso "Registro:" do texto`, slang && slang.meaning && !/Registro/.test(slang.meaning) && /não estar nem aí/.test(slang.meaning), slang);
    check(`${tag}: etiqueta de registro em todo cartão`, r.cards.every(c => c.reg), r.cards.filter(c => !c.reg));
    check(`${tag}: gíria = Gíria; neutro = Dia a dia; familiar = Entre amigos`, /Gíria/.test(slang.reg) && /Dia a dia/.test(pend.reg) && /Entre amigos/.test(r.cards.find(c => c.id === 'expr-lote1-001').reg), [slang.reg, pend.reg]);
    check(`${tag}: Free/Premium continua no cartão`, r.cards.every(c => c.tier));
    check(`${tag}: áudio fora do botão do cartão (sem botão dentro de botão)`, r.cards.every(c => !c.audioInside) && r.plays === 18, r.plays);
    check(`${tag}: expressão de hoje é do A1 e pendente`, r.today && ['Comme ci, comme ça', 'Pas mal', 'Ça marche !', 'Pas de problème !', 'n\'importe quoi'].includes(r.today.trim()), r.today);
    // a de hoje nunca é "Pode ofender" enquanto houver outra
    r = await ev(() => { const list = listedChallenges().filter(c => c.type === 'expression' && c.register === 'vulgar'); return list.length ? (expressionOfTheDay(list.concat(listedChallenges().filter(c => c.id === 'expr-a1m1-002'))) || {}).id : 'x'; });
    check(`${tag}: "Pode ofender" só se não houver outra`, r === 'expr-a1m1-002', r);
    // clicar no áudio não abre o desafio
    r = await ev(() => { const b = document.querySelector('.expr-card-wrap > .expr-play'); b.click(); return getComputedStyle(document.getElementById('challenge-player-wrap')).display; });
    check(`${tag}: tocar o áudio não abre o desafio`, r === 'none', r);
    // botão "Descobrir o sentido" abre o desafio do dia, com a etiqueta de registro
    const todayId = await ev(() => document.querySelector('[data-today-open]').dataset.todayOpen);
    await ev(() => document.querySelector('[data-today-open]').click());
    r = await ev(() => ({ disp: getComputedStyle(document.getElementById('challenge-player-wrap')).display, reg: (document.querySelector('.expr-question-reg .expr-reg') || {}).textContent || null }));
    check(`${tag}: Descobrir o sentido abre o desafio`, r.disp === 'block' && r.reg, r);
    // concluir a do dia troca a expressão de hoje
    const nextToday = await ev((id) => { markChallengeCompleted(id); renderChallengesList('expression'); return document.querySelector('[data-today-open]').dataset.todayOpen; }, todayId);
    check(`${tag}: concluir a de hoje mostra a próxima`, nextToday && nextToday !== todayId, [todayId, nextToday]);
    // busca/filtro continuam
    r = await ev(() => { const s = document.getElementById('challenges-search'); s.value = 'pas'; s.dispatchEvent(new Event('input')); return document.querySelectorAll('.expr-card').length; });
    check(`${tag}: busca filtra os cartões`, r === 2, r);
    await ev(() => { const s = document.getElementById('challenges-search'); s.value = ''; s.dispatchEvent(new Event('input')); window.scrollTo(0, 0); });
    if (SHOTS){ fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, `album-${theme}-${width}.png`), fullPage: width < 800 ? false : false }); }
    check(`${tag}: sem erro de página`, errors.length === 0, errors);
    await ctx.close();
  }

  // Importação pelo painel: expressão sem registro é pulada; com registro entra
  {
    const { page, ctx } = await boot(browser, port, 'light', 1200);
    const r = await page.evaluate(async () => {
      await loadChallengesFromDB(true);
      const base = { type: 'expression', level: 'A2', canonicalExpression: 'x', meaning: { fr: 'x', pt: 'x' } };
      return importChallengesFromJSON(JSON.stringify([{ ...base, id: 'novo-sem-reg' }, { ...base, id: 'novo-com-reg', register: 'familiar' }, { ...base, id: 'novo-reg-errado', register: 'chique' }]));
    });
    check('import: sem registro e registro inválido pulados; com registro entra', r.insertedCount === 1 && r.skipped.length === 2 && r.skipped.every(x => /registro/.test(x)), r);
    await ctx.close();
  }

  // Inglês: etiqueta e textos traduzidos
  {
    const { page, ctx } = await boot(browser, port, 'light', 1200);
    const ev = (fn, a) => page.evaluate(fn, a);
    const r = await ev(async () => { if (typeof setUiLang === 'function') await setUiLang('en'); switchTab('challenges'); await renderChallengeCategories(); renderChallengesList('expression');
      return { lang: typeof getUiLang === 'function' ? getUiLang() : null, today: (document.querySelector('.expr-today-eyebrow') || {}).textContent, reg: (document.querySelector('.expr-reg') || {}).textContent }; });
    if (r.lang === 'en') check('en: textos em inglês', /Expression of the day/.test(r.today) && /(Everyday|Among friends|Slang|Can offend)/.test(r.reg), r);
    await ctx.close();
  }

  await browser.close(); server.close();
  console.log(`Álbum de Expressões playwright: ${passed}/${passed + failed} verificações — ${failed ? 'FALHOU' : 'OK'}`);
  process.exit(failed ? 1 : 0);
})();

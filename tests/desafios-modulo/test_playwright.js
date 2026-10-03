// Desafios do Módulo (Premium) -- Playwright (Chromium real), só fr (o zh não
// tem Desafios). Supabase do CDN trocado por um stub em memória; a tabela
// `challenges` devolve o lote real (fr/scripts/challenges_import/lote-a1-m1.json)
// + 3 desafios "antigos" sem moduleId. Free = convidado; Premium = PROFILE_CACHE.
// Rodar: node tests/desafios-modulo/test_playwright.js
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
const ROWS = [...legacy, ...lote.map(i => toRow(i))];

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

async function boot(browser, port, theme){
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1200, height: 900 }, colorScheme: theme || 'light' });
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

  // Paywall DESLIGADO (CHALLENGE_PAYWALL_ENABLED=false): Free e Premium veem tudo
  // aberto; o que muda é só o rótulo Free x Premium em cada item.
  for (const who of ['free', 'premium']){
    for (const theme of ['light', 'dark']){
      const { page, errors, ctx } = await boot(browser, port, theme);
      const ev = (fn, a) => page.evaluate(fn, a);
      const tag = `${who}/${theme}`;
      if (who === 'premium') await ev(() => { PROFILE_CACHE = { plan_tier: 'premium' }; });
      check(`${tag}: paywall desligado`, await ev(() => CHALLENGE_PAYWALL_ENABLED === false));
      await ev(async () => { renderUnitsGrid(); await fillModuleChallengeRows(); });
      let r = await ev(() => ({
        rows: [...document.querySelectorAll('.module-challenges')].map(e => e.textContent.replace(/\s+/g, ' ').trim()),
        locked: document.querySelectorAll('.module-challenges.premium-locked').length,
        icons: [...document.querySelectorAll('.module-challenges .ub-icon')].map(e => e.textContent.trim()),
      }));
      check(`${tag}: os 6 módulos têm a unidade, sem cadeado`, r.rows.length === 6 && r.locked === 0 && r.icons.every(i => i === '🧩'), r);
      check(`${tag}: módulo 1 diz 1 ditado Free + 2 ditados e 22 desafios Premium`, /1 ditado Free · 2 ditados e 22 desafios Premium/.test(r.rows[0]), r.rows[0]);
      check(`${tag}: módulo 2 diz 1 Free + 2 ditados e 0 desafios Premium`, /1 ditado Free · 2 ditados e 0 desafios Premium/.test(r.rows[1]), r.rows[1]);
      r = await ev(() => { const list = document.querySelector('.module-challenges-slot[data-module-id="A1-m1"]').parentElement; const kids = [...list.children]; return { cp: kids.findIndex(k => k.classList.contains('checkpoint')), sl: kids.findIndex(k => k.classList.contains('module-challenges-slot')) }; });
      check(`${tag}: unidade vem depois do Ponto de verificação`, r.sl === r.cp + 1, r);
      // clicar abre o módulo (nunca o aviso)
      await ev(() => document.querySelector('.module-challenges .ub-header').click());
      await page.waitForFunction(() => challengesModuleFilter === 'A1-m1' && document.querySelectorAll('.challenge-category-card').length > 0);
      r = await ev(() => ({ modal: getComputedStyle(document.getElementById('premium-challenges-modal')).display, title: document.getElementById('challenges-categories-title').textContent,
        cats: [...document.querySelectorAll('.challenge-category-card')].map(c => c.textContent.replace(/\s+/g, ' ').trim()) }));
      check(`${tag}: abre a visão do módulo sem aviso de bloqueio`, r.modal !== 'flex' && r.title === 'Desafios do Módulo 1', r);
      check(`${tag}: visão do módulo lista Ditados com 3 ditados`, r.cats.some(c => /Ditados 3 ditados/.test(c)), r.cats);
      // ditados do módulo: 1 Free + 2 Premium, todos abertos
      await ev(() => document.getElementById('challenges-dictation-card').click());
      await page.waitForFunction(() => dictationModuleFilter === 'A1-m1');
      r = await ev(() => ({ cards: [...document.querySelectorAll('.dictation-card')].map(c => c.querySelector('.tier-badge').textContent), locked: document.querySelectorAll('.dictation-card.locked').length }));
      check(`${tag}: ditados do módulo = Free, Premium, Premium, nenhum trancado`, JSON.stringify(r.cards) === '["Free","Premium","Premium"]' && r.locked === 0, r);
      r = await ev(() => { document.querySelectorAll('.dictation-card')[1].click(); return getComputedStyle(document.getElementById('dictation-player-wrap')).display; });
      check(`${tag}: ditado Premium abre (sem paywall)`, r === 'block', r);
      // lista geral de ditados: só os 6 Free
      r = await ev(() => { dictationModuleFilter = null; renderDictationList(); return [...document.querySelectorAll('.dictation-card')].map(c => c.querySelector('.tier-badge').textContent); });
      check(`${tag}: Desafios > Ditados mostra só os 6 Free (nenhum Premium)`, r.length === 6 && r.every(b => b === 'Free'), r);
      // aba Desafios geral: card Ditados diz "Ouça e escreva"
      await ev(async () => { challengesModuleFilter = null; switchTab('challenges'); await renderChallengeCategories(); });
      r = await ev(() => { renderChallengesList('expression'); return [...document.querySelectorAll('.challenge-card')].map(c => ({ b: c.querySelector('.tier-badge').textContent, lock: c.classList.contains('locked') })); });
      check(`${tag}: expressões: 5 do módulo Premium, a antiga Free, nada trancado`, r.length === 6 && r.filter(x => x.b === 'Premium').length === 5 && r.filter(x => x.b === 'Free').length === 1 && r.every(x => !x.lock), r);
      await ev(() => document.querySelector('.challenge-card').click());
      r = await ev(() => getComputedStyle(document.getElementById('challenge-player-wrap')).display);
      check(`${tag}: desafio de módulo abre sem aviso`, r === 'block', r);
      r = await ev(() => { renderChallengesList('listen_translate'); return document.getElementById('challenges-cards').textContent.replace(/\s+/g, ' '); });
      check(`${tag}: fila Ouça e traduza conta todos (sem aviso de trancados)`, /0\/9 concluído/.test(r) && !/no Premium/.test(r), r);
      check(`${tag}: nenhum pageerror`, errors.length === 0, errors.slice(0, 3));
      await ctx.close();
    }
  }

  // ditados: dados consistentes com o áudio esperado
  {
    const D = await (async () => { const src = fs.readFileSync(path.join(ROOT, 'fr/dictations.js'), 'utf8').replace('const DICTATIONS', 'global.__D'); eval(src); return global.__D; })();
    const ids = D.map(d => d.id);
    check('18 ditados: 6 Free (1 por módulo) + 12 Premium', D.length === 18 && D.filter(d => d.free).length === 6 && D.filter(d => !d.free).length === 12, ids);
    check('exatamente 1 Free por módulo', ['A1-m1','A1-m2','A1-m3','A1-m4','A1-m5','A1-m6'].every(m => D.filter(d => d.moduleId === m && d.free).length === 1));
    check('2 Premium por módulo', ['A1-m1','A1-m2','A1-m3','A1-m4','A1-m5','A1-m6'].every(m => D.filter(d => d.moduleId === m && !d.free).length === 2));
    check('ids únicos', new Set(ids).size === ids.length);
    check('d1 e d2 mantêm a posição 1 e 2 (áudio já existente diz "dictée 1/2")', ids[0] === 'd1' && ids[1] === 'd2');
    check('só pontuação suportada pelo gerador (. , ? !)', D.every(d => /[.!?]$/.test(d.text) && !/[;:…()«»]/.test(d.text)));
  }

  await browser.close(); server.close();
  console.log(`Desafios do Módulo playwright: ${passed}/${passed + failed} verificações` + (failed ? ` — ${failed} FALHAS` : ' — OK'));
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

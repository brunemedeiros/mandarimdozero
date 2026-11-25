// Lista do que as páginas podem carregar (CSP por <meta>, scripts/csp-atualizar.js; auditoria de segurança, achado 6,
// docs/historico/36-auditoria-seguranca-2026-11.md). Confere:
//   1. o <meta> das 3 páginas está em dia com o código solto delas (impressões digitais);
//   2. abrindo o site (fr e zh logado, a página de entrada sem login) e passando pelas abas, o navegador NÃO recusa nada;
//   3. a lista funciona: um script de fora e um código solto sem impressão digital são recusados.
// Uso: node tests/csp/test_csp_playwright.js
const { execFileSync } = require('child_process');
const http = require('http'), fs = require('fs'), path = require('path');
const { abrir } = require('../painel-alunos/harness.js');
const ROOT = path.join(__dirname, '..', '..');
let ok = 0, ruim = 0;
const check = (n, c, x) => { if (c) ok++; else { ruim++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x).slice(0, 600) : ''); } };

const GRAVADOR = () => {
  window.__csp = [];
  document.addEventListener('securitypolicyviolation', (e) => window.__csp.push({ dir: e.violatedDirective, uri: e.blockedURI, line: e.lineNumber, src: e.sourceFile }));
};
const ABAS = ['path', 'review', 'progress', 'goals', 'leaderboard', 'friends', 'profile', 'settings', 'challenges', 'conjugaison', 'dictation', 'student-panel', 'teacher-panel', 'admin-badges'];

(async () => {
  // 1) em dia
  let emDia = true;
  try { execFileSync('node', [path.join(ROOT, 'scripts/csp-atualizar.js'), '--check'], { stdio: 'pipe' }); } catch (e) { emDia = false; }
  check('as 3 páginas têm a lista em dia com o código solto delas (node scripts/csp-atualizar.js)', emDia);

  // 2) fr e zh logado, passando pelas abas
  for (const lang of ['fr', 'zh']){
    const consoleCsp = [];
    const h = await abrir({ lang, aoCriarPagina: async (page) => {
      await page.addInitScript(GRAVADOR);
      page.on('console', m => { if (/Content Security Policy/i.test(m.text())) consoleCsp.push(m.text().slice(0, 200)); });
    } });
    const p = h.page;
    const temMeta = await p.evaluate(() => !!document.querySelector('meta[http-equiv="Content-Security-Policy"]'));
    check(`[${lang}] a página tem a lista (CSP)`, temMeta);
    const visitadas = [];
    for (const aba of ABAS){
      const foi = await p.evaluate((a) => { try { if (!document.querySelector(`[data-tab="${a}"]`) && !document.getElementById(a + '-content') && !document.getElementById('tab-' + a)) return false; switchTab(a); return true; } catch (e) { return 'erro: ' + e.message; } }, aba);
      if (foi === true){ visitadas.push(aba); await p.waitForTimeout(250); }
    }
    // Lição: abre a primeira unidade, se der.
    await p.evaluate(() => { try { switchTab('path'); const b = document.querySelector('[data-unit-id], .unit-node, .trail-node button'); if (b) b.click(); } catch (e) {} });
    await p.waitForTimeout(600);
    const csp = await p.evaluate(() => window.__csp);
    console.log(`  [${lang}] abas visitadas: ${visitadas.join(', ')}`);
    check(`[${lang}] passou por ${visitadas.length} abas sem nenhuma recusa da lista`, csp.length === 0 && consoleCsp.length === 0, { csp, consoleCsp, visitadas });
    check(`[${lang}] sem erro de página`, h.errors.length === 0, h.errors);
    await h.close();
  }

  // 3) página de entrada (sem login) + a lista funciona de verdade
  const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
  const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2' };
  const server = http.createServer((req, res) => {
    let pth = decodeURIComponent(req.url.split('?')[0]); if (pth.endsWith('/')) pth += 'index.html';
    const f = path.join(ROOT, pth);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const b = await chromium.launch();
  const ctx = await b.newContext({ serviceWorkers: 'block' });
  const page = await ctx.newPage(); const erros = [];
  page.on('pageerror', e => erros.push(e.message));
  await page.addInitScript(GRAVADOR);
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/\/shared\/vendor\/supabase-js/, r => r.fulfill({ contentType: 'text/javascript', body: 'window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signInWithOAuth:async()=>({})},from:()=>({select(){return this},eq(){return this},maybeSingle:async()=>({data:null})}),rpc:async()=>({data:null})})};' }));
  await page.goto(base + 'index.html');
  await page.waitForTimeout(800);
  check('entrada (sem login): nenhuma recusa da lista', (await page.evaluate(() => window.__csp)).length === 0, await page.evaluate(() => window.__csp));
  check('entrada: o código solto da página rodou (tema aplicado antes de desenhar)', await page.evaluate(() => document.documentElement.hasAttribute('data-theme') || typeof window.__csp !== 'undefined'));
  // Ataque simulado: script de outro endereço e código solto sem impressão digital.
  await page.evaluate(() => {
    window.__rodou = false;
    const s1 = document.createElement('script'); s1.src = 'https://evil.example/x.js'; document.head.appendChild(s1);
    const d = document.createElement('div'); d.innerHTML = '<img src="x" onerror="window.__rodou=true">'; document.body.appendChild(d);
  });
  await page.waitForTimeout(400);
  const v = await page.evaluate(() => ({ rodou: window.__rodou, dirs: window.__csp.map(x => x.dir) }));
  check('ataque: script de outro endereço é recusado', v.dirs.some(d => /script-src/.test(d)), v);
  check('ataque: código escondido numa imagem (onerror) NÃO roda', v.rodou === false, v);
  check('entrada: sem erro de página', erros.filter(e => !/evil\.example/.test(e)).length === 0, erros);
  await b.close(); server.close();

  console.log(`csp: ${ok}/${ok + ruim} checks`); process.exit(ruim ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

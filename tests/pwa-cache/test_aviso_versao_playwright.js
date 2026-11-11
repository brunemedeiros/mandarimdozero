// Aviso "Nova versão disponível" (shared/pwa.js, 2026-11-11): só aparece quando a página está MESMO com o código antigo.
// Antes, aparecia em quase toda visita depois de um deploy: o service worker busca tudo na rede primeiro (a página já
// abre com os arquivos novos), mas o SW novo assume alguns segundos depois e o aviso aparecia mesmo assim (alarme falso).
// Agora o deploy grava o mesmo SHA em shared/pwa.js e no service-worker.js; a página pergunta a versão ao SW novo e só
// avisa se for diferente. Este teste liga o service worker de verdade (Chromium) com um servidor que imita o GitHub
// Pages e simula deploys trocando o __BUILD_ID__ dos dois arquivos, no fr e no zh:
//   1. depois de um deploy, a aluna abre/recarrega o site: SW novo assume, página já está na versão nova, SEM aviso;
//   2. aba aberta com a versão antiga e o navegador confere o SW sem recarregar: aviso aparece;
//   3. "Agora não" esconde o aviso; "Atualizar" recarrega e o aviso não volta.
// REPO_ROOT=<worktree> roda contra outra árvore (na origin/main de 2026-11-11 o item 1 falha: o aviso aparece).
// Rodar: node tests/pwa-cache/test_aviso_versao_playwright.js
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = process.env.REPO_ROOT || path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x).slice(0, 600) : ''); } };

function servidor(site){
  let build = 'deploy1';
  const comBuild = new Set([`/${site}/service-worker.js`, '/shared/pwa.js']); // os arquivos que o deploy-pages.yml carimba
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    const f = path.join(ROOT, p);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
    let body = fs.readFileSync(f);
    if (comBuild.has(p)) body = Buffer.from(body.toString('utf8').split('__BUILD_ID__').join(build));
    const etag = '"' + crypto.createHash('sha1').update(body).digest('hex').slice(0, 16) + '"';
    const headers = { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', etag, 'cache-control': 'max-age=600' };
    if (req.headers['if-none-match'] === etag){ res.writeHead(304, headers); return res.end(); }
    res.writeHead(200, headers); res.end(body);
  });
  return { server, deploy: (b) => { build = b; } };
}

async function rodar(browser, site){
  const { server, deploy } = servidor(site);
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/${site}/`;
  const ctx = await browser.newContext({ serviceWorkers: 'allow' });
  await ctx.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await ctx.addInitScript(() => {
    try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {}
    window.__trocas = 0;
    if (navigator.serviceWorker) navigator.serviceWorker.addEventListener('controllerchange', () => { window.__trocas++; });
  });
  const page = await ctx.newPage();
  const pronto = () => page.waitForFunction(() => typeof LANG_HOOKS === 'object' && document.readyState === 'complete', null, { timeout: 30000 });
  const avisoVisivel = () => page.evaluate(() => { const b = document.getElementById('pwa-update-banner'); return !!b && getComputedStyle(b).display !== 'none'; });
  const esperaTroca = () => page.waitForFunction(() => window.__trocas > 0, null, { timeout: 20000 }).then(() => true).catch(() => false);
  const cacheCom = (b) => page.evaluate(async (b) => (await caches.keys()).some(k => k.endsWith('-' + b)), b);
  const r = {};

  // 1ª visita instala o SW (deploy1); 2ª abertura já controlada
  await page.goto(base + 'index.html'); await pronto();
  await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 30000 });
  await page.reload(); await pronto(); await page.waitForTimeout(800);
  r.semAvisoAntes = !(await avisoVisivel());

  // 1. deploy2 e a aluna abre de novo: SW novo assume, mas a página já veio com o código novo
  deploy('deploy2');
  await page.reload(); await pronto();
  r.trocouNaAbertura = await esperaTroca();
  await page.waitForTimeout(3500); // mais que o tempo de espera da resposta do SW (3 s)
  r.paginaBuild = await page.evaluate(() => typeof PWA_PAGE_BUILD_ID === 'string' ? PWA_PAGE_BUILD_ID : null);
  r.cacheDeploy2 = await cacheCom('deploy2');
  r.avisoNaAbertura = await avisoVisivel();

  // 2. deploy3 com a aba aberta (página continua com o deploy2): o navegador confere o SW sem recarregar
  deploy('deploy3');
  await page.evaluate(() => { window.__trocas = 0; return navigator.serviceWorker.getRegistration().then(reg => reg && reg.update()); });
  r.trocouAbaAberta = await esperaTroca();
  r.avisoAbaAberta = await page.waitForFunction(() => { const b = document.getElementById('pwa-update-banner'); return b && getComputedStyle(b).display !== 'none'; }, null, { timeout: 6000 }).then(() => true).catch(() => false);

  // 3. "Agora não" esconde; "Atualizar" recarrega e não volta
  await page.click('#pwa-update-dismiss-btn');
  r.agoraNaoEsconde = !(await avisoVisivel());
  await page.evaluate(() => { document.getElementById('pwa-update-banner').style.display = 'flex'; });
  await Promise.all([page.waitForNavigation(), page.click('#pwa-update-reload-btn')]);
  await pronto(); await page.waitForTimeout(3500);
  r.buildDepoisDeAtualizar = await page.evaluate(() => typeof PWA_PAGE_BUILD_ID === 'string' ? PWA_PAGE_BUILD_ID : null);
  r.avisoDepoisDeAtualizar = await avisoVisivel();

  await ctx.close(); server.close();
  return r;
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  try {
    for (const site of ['fr', 'zh']){
      const r = await rodar(browser, site);
      check(`${site}: sem aviso antes de qualquer deploy`, r.semAvisoAntes, r);
      check(`${site}: deploy + abrir o site: SW novo assume (controllerchange, cache novo)`, r.trocouNaAbertura && r.cacheDeploy2, r);
      check(`${site}: deploy + abrir o site: a página já está na versão nova (deploy2)`, r.paginaBuild === 'deploy2', r);
      check(`${site}: deploy + abrir o site: SEM aviso "Nova versão disponível" (antes era alarme falso)`, r.avisoNaAbertura === false, r);
      check(`${site}: aba aberta com versão antiga + SW novo: aviso aparece`, r.trocouAbaAberta && r.avisoAbaAberta, r);
      check(`${site}: "Agora não" esconde o aviso`, r.agoraNaoEsconde, r);
      check(`${site}: "Atualizar" recarrega na versão nova e o aviso não volta`, r.buildDepoisDeAtualizar === 'deploy3' && r.avisoDepoisDeAtualizar === false, r);
    }
  } finally { await browser.close(); }
  console.log(`Aviso de nova versão (PWA): ${passed} passaram, ${failed} falharam`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

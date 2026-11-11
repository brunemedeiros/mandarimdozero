// Melhoria 4 da revisão de arquitetura (docs/revisao-codigo-compartilhado-arquitetura.md seção 8, 2026-10-26): o service
// worker busca com cache: 'no-cache' (revalida no servidor; 304 sem corpo para o que não mudou) em vez de 'no-store'
// (baixava tudo a cada abertura). Este teste liga o service worker de verdade (Chromium) com um servidor que imita o
// GitHub Pages (ETag + Cache-Control: max-age=600, 304 para If-None-Match igual) e prova, no fr e no zh:
//   1. depois da 1ª visita, abrir de novo quase não baixa corpo: os arquivos do site voltam 304;
//   2. versão nova continua chegando: um arquivo alterado no servidor (ETag novo) chega na próxima abertura, vai para o
//      cache do SW e o app usa a versão nova (mesmo com o arquivo ainda "fresco" no cache HTTP, max-age=600);
//   3. um service-worker.js novo (outro __BUILD_ID__) é instalado e assume (controllerchange), como no deploy;
//   4. sem internet, o app abre do cache do SW.
//   6. recarregar a mesma aba (puxar para baixo, F5) logo depois de uma publicação traz tudo novo, sem misturar
//      index.html novo com scripts antigos guardados na memória da aba (max-age=600 do GitHub Pages);
//   5. no mesmo endereço (app.profbrune.com.br/fr e /zh), publicar um site não apaga o cache do outro.
// REPO_ROOT=<worktree> roda contra outra árvore.
//
// Ajuste de 2026-11-11 (o teste passou a falhar 4/10 na main sem o site ter mudado; falhava igual no commit 21fd055, onde
// nasceu): o Playwright novo (1.63) passou a aplicar ao service worker duas coisas que antes só valiam para a página:
//   a) qualquer context.route() DESLIGA o cache HTTP (está na documentação do Playwright) e agora desliga também o do SW:
//      o SW deixava de mandar If-None-Match e tudo voltava 200 com corpo (a "falha" era do teste, não do site). Por isso a
//      internet de fora é bloqueada pelo próprio Chromium (--host-resolver-rules), sem route;
//   b) setOffline agora derruba também a rede do SW, então o item 4 passou a testar de verdade e achou um defeito do site
//      (consertado no service-worker.js do fr e do zh): logo depois de uma publicação, o cache novo só tinha os ~18
//      arquivos da lista fixa e o app não abria sem internet.
// "Abrir de novo" é fechar a aba e abrir outra (como a aluna faz): page.reload() na mesma aba reaproveita o cache em
// memória do Chromium e nem chega ao SW, o que não mede a abertura do app.
// Rodar: node tests/pwa-cache/test_playwright.js
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = process.env.REPO_ROOT || path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x).slice(0, 600) : ''); } };

function servidor(){
  const log = [];
  const patches = {}; // caminho -> função(texto) que muda o arquivo servido (simula deploy)
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    const f = path.join(ROOT, p);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); log.push({ p, s: 404, b: 0 }); return res.end(); }
    let body = fs.readFileSync(f);
    if (patches[p]) body = Buffer.from(patches[p](body.toString('utf8')));
    const etag = '"' + crypto.createHash('sha1').update(body).digest('hex').slice(0, 16) + '"';
    const headers = { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', etag, 'cache-control': 'max-age=600' };
    if (req.headers['if-none-match'] === etag){ res.writeHead(304, headers); log.push({ p, s: 304, b: 0 }); return res.end(); }
    res.writeHead(200, headers); log.push({ p, s: 200, b: body.length }); res.end(body);
  });
  return { server, log, patches };
}

async function rodar(browser, site){
  const { server, log, patches } = servidor();
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/${site}/`;
  const ctx = await browser.newContext({ serviceWorkers: 'allow' });
  // Sem ctx.route() de propósito: route desliga o cache HTTP (inclusive o do service worker). Ver o cabeçalho.
  await ctx.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
  let page = await ctx.newPage();
  const abrir = async () => { await page.close(); page = await ctx.newPage(); await page.goto(base + 'index.html'); };
  const pronto = () => page.waitForFunction(() => typeof LANG_HOOKS === 'object' && document.readyState === 'complete', null, { timeout: 30000 });
  const r = {};
  // 1ª visita: instala o SW
  await page.goto(base + 'index.html'); await pronto();
  await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 30000 });
  await page.waitForTimeout(800);
  // 2ª abertura já controlada pelo SW (enche o cache HTTP e o do SW)
  await abrir(); await pronto(); await page.waitForTimeout(800);
  // 3ª abertura: medida
  log.length = 0;
  await abrir(); await pronto(); await page.waitForTimeout(800);
  const locais = log.filter(x => /\.(js|css|html|svg|png|woff2|json)$/.test(x.p) && !x.p.endsWith('service-worker.js'));
  r.n = locais.length; r.n304 = locais.filter(x => x.s === 304).length; r.n200 = locais.filter(x => x.s === 200).length;
  r.bytes = locais.reduce((a, x) => a + x.b, 0);
  // versão nova de um arquivo (content.js ganha uma marca)
  const MARCA = 'versao-nova-' + Date.now();
  patches[`/${site}/content.js`] = (t) => t + `\n;window.__marcaDeploy = ${JSON.stringify(MARCA)};\n`;
  log.length = 0;
  await abrir(); await pronto(); await page.waitForTimeout(800);
  r.marcaNaPagina = await page.evaluate(() => window.__marcaDeploy || null);
  r.marcaNoCacheSW = await page.evaluate(async (m) => { const keys = await caches.keys(); for (const k of keys){ const c = await caches.open(k); const res = await c.match('content.js'); if (res && (await res.text()).includes(m)) return true; } return false; }, MARCA);
  r.contentStatus = (log.find(x => x.p === `/${site}/content.js`) || {}).s;
  r.marca = MARCA;
  // service-worker.js novo (deploy muda o __BUILD_ID__): instala e assume
  await page.evaluate(() => { window.__trocou = 0; navigator.serviceWorker.addEventListener('controllerchange', () => { window.__trocou++; }); });
  patches[`/${site}/service-worker.js`] = (t) => t.split('__BUILD_ID__').join('deploy2');
  await page.evaluate(() => navigator.serviceWorker.getRegistration().then(reg => reg && reg.update()));
  await page.waitForFunction(() => window.__trocou > 0, null, { timeout: 20000 }).catch(() => {});
  r.swNovoAssumiu = await page.evaluate(() => window.__trocou > 0);
  r.cacheNovo = await page.evaluate(async () => (await caches.keys()).filter(k => k.includes('deploy2')).length);
  // sem internet LOGO depois da publicação (o SW novo acabou de assumir, sem nenhuma abertura com internet no meio):
  // é o caso mais difícil, o cache novo precisa já ter tudo o que o app usa
  r.arquivosNoCacheNovo = await page.evaluate(async () => { for (const k of await caches.keys()) if (k.includes('deploy2')) return (await (await caches.open(k)).keys()).length; return 0; });
  await ctx.setOffline(true);
  const errosOffline = [];
  await page.close(); page = await ctx.newPage();
  page.on('pageerror', e => errosOffline.push(String(e).slice(0, 120)));
  await page.goto(base + 'index.html').catch(e => errosOffline.push(e.message.slice(0, 120)));
  r.offline = await page.waitForFunction(() => typeof LANG_HOOKS === 'object' && document.readyState === 'complete', null, { timeout: 20000 }).then(() => true).catch(() => false);
  r.errosOffline = errosOffline.slice(0, 3);
  await ctx.setOffline(false);
  await ctx.close(); server.close();
  return r;
}

// Recarregar a mesma aba logo depois de uma publicação (o SW novo ainda nem foi visto): antes do conserto de 2026-11-11 o
// Chromium reaproveitava da memória da aba os scripts carregados havia menos de 10 minutos e a página ficava com
// index.html novo e content.js/shared antigos até o aviso "Atualizar".
async function recarregarDepoisDePublicar(browser, site){
  const { server, patches } = servidor();
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/${site}/`;
  const ctx = await browser.newContext({ serviceWorkers: 'allow' });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
  let page = await ctx.newPage();
  const pronto = () => page.waitForFunction(() => typeof LANG_HOOKS === 'object' && document.readyState === 'complete', null, { timeout: 30000 });
  await page.goto(base + 'index.html'); await pronto();
  await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 30000 });
  await page.waitForTimeout(800);
  await page.close(); page = await ctx.newPage(); await page.goto(base + 'index.html'); await pronto(); await page.waitForTimeout(800);
  const M = 'publicacao-' + Date.now();
  patches[`/${site}/content.js`] = (t) => t + `\n;window.__mContent = ${JSON.stringify(M)};\n`;
  patches['/shared/pwa.js'] = (t) => t + `\n;window.__mShared = ${JSON.stringify(M)};\n`;
  patches[`/${site}/index.html`] = (t) => t.replace('</body>', `<script>window.__mHtml = ${JSON.stringify(M)};</script></body>`);
  patches[`/${site}/service-worker.js`] = (t) => t.split('__BUILD_ID__').join('deploy2');
  await page.reload(); await pronto(); await page.waitForTimeout(500);
  const r = await page.evaluate((M) => ({ html: window.__mHtml === M, content: window.__mContent === M, shared: window.__mShared === M }), M);
  await ctx.close(); server.close();
  return r;
}

// fr e zh moram no mesmo endereço e dividem a lista de caches: antes, o 'activate' de um apagava o cache do outro.
async function convivencia(browser){
  const { server, patches } = servidor();
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const origem = `http://127.0.0.1:${server.address().port}`;
  const ctx = await browser.newContext({ serviceWorkers: 'allow' });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
  const page = await ctx.newPage();
  const visitar = async (site) => {
    await page.goto(`${origem}/${site}/index.html`);
    await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 30000 });
    await page.waitForTimeout(800);
  };
  await visitar('fr'); await visitar('zh');
  patches['/zh/service-worker.js'] = (t) => t.split('__BUILD_ID__').join('deploy2');
  await page.evaluate(() => { window.__trocou = 0; navigator.serviceWorker.addEventListener('controllerchange', () => { window.__trocou++; }); });
  await page.evaluate(() => navigator.serviceWorker.getRegistration().then(reg => reg && reg.update()));
  await page.waitForFunction(() => window.__trocou > 0, null, { timeout: 20000 }).catch(() => {});
  const nomes = await page.evaluate(async () => caches.keys());
  await ctx.close(); server.close();
  const ok = nomes.some(n => n.startsWith('frances-')) && nomes.some(n => n.startsWith('chines-') && n.includes('deploy2'));
  if (!ok) console.log('  caches depois de publicar o zh:', JSON.stringify(nomes));
  return ok;
}

(async () => {
  // Internet de fora bloqueada pelo próprio Chromium (nome de site não resolve, exceto 127.0.0.1), sem route.
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'] });
  try {
    for (const site of ['fr', 'zh']){
      const r = await rodar(browser, site);
      console.log(`  ${site}: abertura com SW: ${r.n} arquivos do site, ${r.n304} com 304, ${r.n200} com 200, ${Math.round(r.bytes / 1024)} KB de corpo; cache novo depois da publicação: ${r.arquivosNoCacheNovo} arquivos`);
      check(`${site}: abrir de novo revalida (quase tudo 304, menos de 100 KB de corpo)`, r.n > 100 && r.n304 >= r.n - 2 && r.bytes < 100 * 1024, r);
      check(`${site}: arquivo alterado no servidor chega na próxima abertura (200) e a página usa a versão nova`, r.contentStatus === 200 && r.marcaNaPagina === r.marca, r);
      check(`${site}: a versão nova entra no cache do service worker`, r.marcaNoCacheSW === true, r);
      check(`${site}: service-worker.js novo (deploy) instala e assume, com cache novo`, r.swNovoAssumiu && r.cacheNovo === 1, r);
      const rr = await recarregarDepoisDePublicar(browser, site);
      check(`${site}: recarregar a aba logo depois de publicar traz index.html, content.js e shared/ novos (sem misturar versões)`, rr.html && rr.content && rr.shared, rr);
      check(`${site}: sem internet logo depois da publicação, abre do cache (sem erro de script)`, r.offline && r.errosOffline.length === 0, r);
    }
    check('fr e zh no mesmo endereço: publicar o zh não apaga o cache do fr (nem o contrário)', await convivencia(browser), undefined);
  } finally { await browser.close(); }
  console.log(`PWA cache (melhoria 4): ${passed} passaram, ${failed} falharam`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

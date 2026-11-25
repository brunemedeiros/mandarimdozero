// Anti-moldura (shared/anti-moldura.js; auditoria de segurança, achado 6, docs/historico/36-auditoria-seguranca-2026-11.md).
// Dois servidores locais: 127.0.0.1 (o site) e localhost (outro endereço, faz o papel do site malicioso).
// Uso: node tests/anti-moldura/test_playwright.js
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const ROOT = path.join(__dirname, '..', '..');
let ok = 0, ruim = 0;
const check = (n, c, x) => { if (c) ok++; else { ruim++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
function servidor(handler){ return new Promise(r => { const s = http.createServer(handler); s.listen(0, () => r(s)); }); }
const site = (req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
};

(async () => {
  const s1 = await servidor(site);
  const URL_SITE = `http://127.0.0.1:${s1.address().port}/sobre.html`;
  const moldura = (sandbox) => `<!doctype html><title>outro site</title><h1 id="mau">site de fora</h1><iframe id="f" src="${URL_SITE}" ${sandbox ? 'sandbox="allow-scripts"' : ''} width="400" height="300"></iframe>`;
  const s2 = await servidor((req, res) => { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(req.url.includes('sandbox') ? moldura(true) : moldura(false)); });
  const URL_FORA = `http://localhost:${s2.address().port}/`;
  const b = await chromium.launch();
  const ctx = await b.newContext();
  await ctx.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());

  // 1) aberto direto
  let p = await ctx.newPage();
  await p.goto(URL_SITE);
  check('aberto direto: página visível e no mesmo endereço', (await p.evaluate(() => getComputedStyle(document.documentElement).visibility)) === 'visible' && p.url() === URL_SITE, p.url());
  await p.close();

  // 2) dentro de moldura de outro endereço: o site some de dentro da moldura (o Chrome só deixa trocar a janela
  //    inteira com um clique da pessoa; se trocar, também vale)
  p = await ctx.newPage();
  await p.goto(URL_FORA);
  const f2 = await (await p.waitForSelector('#f')).contentFrame();
  await f2.waitForLoadState('load').catch(() => {});
  await p.waitForTimeout(500);
  const saiu = p.url() === URL_SITE;
  const vis2 = saiu ? 'saiu' : await f2.evaluate(() => getComputedStyle(document.documentElement).visibility).catch(() => 'sem-frame');
  check('moldura de outro endereço: o site some da moldura (ou abre na janela inteira)', saiu || vis2 === 'hidden', { url: p.url(), vis2 });
  await p.close();

  // 3) moldura com sandbox (não deixa sair): o site fica escondido
  p = await ctx.newPage();
  await p.goto(URL_FORA + '?sandbox');
  const fr = await (await p.waitForSelector('#f')).contentFrame();
  await fr.waitForLoadState('load');
  await p.waitForTimeout(300);
  const vis = await fr.evaluate(() => getComputedStyle(document.documentElement).visibility);
  check('moldura que não deixa sair: o site fica escondido e a página de fora continua', vis === 'hidden' && p.url().startsWith(URL_FORA), { vis, url: p.url() });
  await p.close();

  // 4) moldura do próprio site continua permitida
  p = await ctx.newPage();
  await p.goto(URL_SITE);
  await p.evaluate((u) => { const f = document.createElement('iframe'); f.id = 'own'; f.src = u; document.body.appendChild(f); }, URL_SITE);
  const own = await (await p.waitForSelector('#own')).contentFrame();
  await own.waitForLoadState('load');
  check('moldura do próprio site: continua visível', (await own.evaluate(() => getComputedStyle(document.documentElement).visibility)) === 'visible' && p.url() === URL_SITE);
  await p.close();

  // 5) todas as páginas do site carregam o anti-moldura logo no começo do <head>
  const paginas = ['index.html', 'fr/index.html', 'zh/index.html', 'sobre.html', 'privacidade-cookies.html', 'privacidade-google-agenda.html', 'privacidade-login.html', 'privacidade-notion.html', 'ajuda/index.html', 'contrato/index.html', 'teste-de-nivelamento-fr/index.html', 'teste-de-nivelamento-pt/index.html'];
  const sem = paginas.filter(f => { const s = fs.readFileSync(path.join(ROOT, f), 'utf8'); const i = s.indexOf('anti-moldura.js'); return i < 0 || i > s.indexOf('<script', s.indexOf('<head')) && s.indexOf('<script', s.indexOf('<head')) !== s.lastIndexOf('<script', i); });
  check('as 12 páginas carregam o anti-moldura antes de qualquer outro script', sem.length === 0, sem);

  await b.close(); s1.close(); s2.close();
  console.log(`anti-moldura: ${ok}/${ok + ruim} checks`); process.exit(ruim ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

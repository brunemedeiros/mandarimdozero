// Página do site `sair-cartoes/` (link "Parar de receber" do e-mail de cartões novos) no navegador real.
// A função do Supabase é trocada por uma de mentira (interceptação de rede); o que se confere é a PÁGINA: pergunta, POST certo, mensagens.
// Rodar: NODE_PATH=/opt/node22/lib/node_modules node tests/email-cartoes-professora/test_pagina_sair.js  (SHOTS=pasta para salvar capturas)
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '../..');
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.js': 'text/javascript' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(fs.readFileSync(f));
});
(async () => {
  await new Promise(r => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}/sair-cartoes/`;
  const browser = await chromium.launch();
  const SHOTS = process.env.SHOTS; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  async function run(label, query, answer, { scheme = 'light', width = 390 } = {}) {
    const ctx = await browser.newContext({ viewport: { width, height: 700 }, colorScheme: scheme, serviceWorkers: 'block' });
    const page = await ctx.newPage(); const errs = []; const posts = [];
    page.on('pageerror', e => errs.push(String(e)));
    await page.route('**/functions/v1/teacher-cards-digest**', route => {
      const rq = route.request(); posts.push({ m: rq.method(), url: rq.url(), body: rq.postData(), ct: rq.headers()['content-type'] });
      if (!answer) return route.abort();
      route.fulfill({ status: answer.s, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(answer.j) });
    });
    await page.goto(base + query);
    const out = { page, ctx, errs, posts };
    out.shot = async n => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${label}-${n}-${scheme}-${width}.png`) }); };
    return out;
  }
  // pt: pergunta, não grava ao abrir, botão faz POST simples e mostra "Pronto!"
  let r = await run('pt', '?u=abc&t=def&l=pt', { s: 200, j: { ok: true } });
  check('pt: só pergunta ao abrir e NÃO faz nenhum pedido sozinho', (await r.page.textContent('#t')) === 'Parar de receber estes e-mails?' && r.posts.length === 0);
  check('pt: botão "Sim, parar de receber" visível', (await r.page.textContent('#go')) === 'Sim, parar de receber' && await r.page.isVisible('#go'));
  await r.shot('pergunta'); await r.page.click('#go'); await r.page.waitForSelector('#t:has-text("Pronto!")');
  check('pt: clique faz 1 POST sem corpo e sem cabeçalho extra (sem pré-voo), com u, t e l certos', r.posts.length === 1 && r.posts[0].m === 'POST' && /u=abc&t=def&l=pt$/.test(r.posts[0].url) && !r.posts[0].body && !r.posts[0].ct, r.posts);
  check('pt: depois mostra "Pronto!" e esconde o botão', !(await r.page.isVisible('#go')) && /Configurações > Notificações/.test(await r.page.textContent('#m')));
  await r.shot('pronto'); check('pt: 0 erros de página', r.errs.length === 0, r.errs); await r.ctx.close();
  // en: nada em português
  r = await run('en', '?u=abc&t=def&l=en', { s: 200, j: { ok: true } }, { scheme: 'dark' });
  await r.shot('pergunta'); await r.page.click('#go'); await r.page.waitForSelector('#t:has-text("Done!")'); await r.shot('pronto');
  const txt = await r.page.evaluate(() => document.body.innerText + document.title);
  check('en: pergunta e resposta em inglês, sem português', !/[ãõçéêíóú]|Parar|Sim|Pronto|Continuar|Configurações/i.test(txt) && document_lang_ok(await r.page.evaluate(() => document.documentElement.lang)), txt);
  await r.ctx.close();
  // link inválido (POST 400) e sem parâmetros
  r = await run('inv', '?u=x&t=y&l=pt', { s: 400, j: { ok: false, error: 'invalid_link' } });
  await r.page.click('#go'); await r.page.waitForSelector('#t:has-text("não é válido")'); check('link inválido (400): mensagem certa e sem botão', !(await r.page.isVisible('#go'))); await r.shot('invalido'); await r.ctx.close();
  r = await run('sem', '', null); check('sem parâmetros: "não é válido" sem pedir nada', /não é válido/.test(await r.page.textContent('#t')) && !(await r.page.isVisible('#go')) && r.posts.length === 0); await r.ctx.close();
  // falha de rede: botão volta a funcionar para tentar de novo
  r = await run('rede', '?u=a&t=b&l=pt', null);
  await r.page.click('#go'); await r.page.waitForSelector('#t:has-text("Algo deu errado")');
  check('falha de rede: avisa e deixa tentar de novo', await r.page.isVisible('#go') && !(await r.page.isDisabled('#go'))); await r.shot('erro'); await r.ctx.close();
  // celular sem rolagem lateral, escuro
  r = await run('pt', '?u=abc&t=def&l=pt', { s: 200, j: { ok: true } }, { scheme: 'dark', width: 360 });
  check('360px escuro: sem rolagem lateral', await r.page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)); await r.shot('pergunta'); await r.ctx.close();
  await browser.close(); server.close();
  console.log(`Página sair-cartoes: ${passed}/${passed + failed} verificações — ${failed ? 'FALHOU' : 'OK'}`); process.exit(failed ? 1 : 0);
  function document_lang_ok(l) { return l === 'en'; }
})();

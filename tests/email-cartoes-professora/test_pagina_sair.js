// Página do site `sair-cartoes/` (link "Parar de receber" do e-mail de cartões novos) no navegador real.
// A função do Supabase é trocada por uma de mentira (interceptação de rede); o que se confere é a PÁGINA: pergunta com motivo, POST certo,
// desfazer, resumo semanal, mensagens e idioma. Rodar: NODE_PATH=/opt/node22/lib/node_modules node tests/email-cartoes-professora/test_pagina_sair.js
// (SHOTS=pasta salva capturas).
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '../..');
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.js': 'text/javascript' };
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
  // answer: função que recebe (corpo em objeto) e devolve { s, j } ou null (rede cai)
  async function run(label, query, answer, { scheme = 'light', width = 390 } = {}) {
    const ctx = await browser.newContext({ viewport: { width, height: 800 }, colorScheme: scheme, serviceWorkers: 'block' });
    const page = await ctx.newPage(); const errs = [], posts = [], outside = [];
    page.on('pageerror', e => errs.push(String(e)));
    page.on('request', rq => { const u = rq.url(); if (!u.startsWith('http://127.0.0.1') && !u.includes('/functions/v1/teacher-cards-digest') && !u.startsWith('data:')) outside.push(u); });
    await page.route('**/functions/v1/teacher-cards-digest**', route => {
      const rq = route.request(); const body = Object.fromEntries(new URLSearchParams(rq.postData() || ''));
      posts.push({ m: rq.method(), url: rq.url(), body, raw: rq.postData(), ct: rq.headers()['content-type'] });
      const a = answer && answer(body, posts.length); if (!a) return route.abort();
      route.fulfill({ status: a.s, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(a.j) });
    });
    await page.goto(base + query);
    const out = { page, ctx, errs, posts, outside };
    out.shot = async n => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${label}-${n}-${scheme}-${width}.png`), fullPage: true }); };
    out.title = () => page.textContent('#h');
    return out;
  }
  const OK = (b) => ({ s: 200, j: { ok: true, action: b.a } });
  const Q = '?u=abc&t=def&l=pt';

  // ---- pt: pergunta ----
  let r = await run('pt', Q, OK);
  check('pt: abre só perguntando, sem nenhum pedido sozinho', (await r.title()) === 'Quer mesmo sair da lista?' && r.posts.length === 0);
  const boxes = await r.page.$$eval('.opt', els => els.map(e => { const b = e.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width) }; }));
  check('pt: 6 motivos na ordem pedida, um embaixo do outro (mesma coluna, mesma largura)', boxes.length === 6 && boxes.every(b => b.x === boxes[0].x && b.w === boxes[0].w) && boxes.every((b, i) => i === 0 || b.y > boxes[i - 1].y), boxes);
  check('pt: texto dos motivos na ordem da dona', JSON.stringify(await r.page.$$eval('.opt', els => els.map(e => e.textContent))) === JSON.stringify(['Recebo e-mails demais', 'Estou sem tempo agora', 'Os cartões não servem para mim', 'Não é mais do meu interesse', 'Prefiro ver tudo no site', 'Outro motivo']));
  check('pt: "Parar de receber" funciona sem motivo (sair nunca depende de resposta)', await r.page.isEnabled('[data-a=sair]') && await r.page.isEnabled('[data-a=semanal]'));
  const sh = await r.page.$eval('.btn', e => getComputedStyle(e).boxShadow);
  check('pt: botão rosa com sombra rosa escura (sem roxo e sem borda)', (/color\(srgb 0\.5\d* 0\.2\d* 0\.5\d*\)/.test(sh) || /rgb\(\s*1[0-9]{2},\s*[0-9]{2},\s*1[0-9]{2}\)/.test(sh)) && !/34, 17, 63/.test(sh) && await r.page.$eval('.btn', e => getComputedStyle(e).borderTopWidth) === '0px', sh);
  check('pt: Anton e Nunito carregadas do próprio site, nada de Google Fonts nem outro domínio', await r.page.evaluate(async () => { await document.fonts.ready; return document.fonts.check('34px Anton', 'QUER'); }) && r.outside.length === 0, r.outside);
  await r.shot('pergunta');
  // motivo + sair
  await r.page.click('.opt:nth-child(2)');
  check('pt: escolher um motivo marca só ele (radio) e clicar de novo desmarca', (await r.page.$$eval('.opt[aria-checked=true]', e => e.length)) === 1);
  await r.page.click('.opt:nth-child(2)'); check('pt: desmarca ao clicar de novo', (await r.page.$$eval('.opt[aria-checked=true]', e => e.length)) === 0);
  await r.page.click('.opt:nth-child(2)'); await r.page.click('[data-a=sair]'); await r.page.waitForSelector('#h:has-text("saiu")');
  check('pt: sair com motivo = 1 POST urlencoded simples (sem pré-voo) com a=sair e r=sem_tempo', r.posts.length === 1 && r.posts[0].m === 'POST' && /u=abc&t=def&l=pt$/.test(r.posts[0].url) && r.posts[0].body.a === 'sair' && r.posts[0].body.r === 'sem_tempo' && !r.posts[0].body.o && /x-www-form-urlencoded/.test(r.posts[0].ct), r.posts);
  check('pt: mostra "Pronto", agradece o motivo e oferece desfazer', /Obrigada, anotei/.test(await r.page.textContent('.ok')) && await r.page.isVisible('[data-a=voltar]'));
  await r.shot('pronto');
  await r.page.click('[data-a=voltar]'); await r.page.waitForSelector('#h:has-text("voltou")');
  check('pt: desfazer = POST a=voltar sem motivo e mostra "Que bom que voltou"', r.posts.length === 2 && r.posts[1].body.a === 'voltar' && !r.posts[1].body.r);
  await r.shot('voltou'); check('pt: 0 erros de página', r.errs.length === 0, r.errs); await r.ctx.close();

  // ---- sair sem motivo ----
  r = await run('pt', Q, OK);
  await r.page.click('[data-a=sair]'); await r.page.waitForSelector('#h:has-text("saiu")');
  check('sair sem motivo: POST sem r e sem agradecimento de motivo', r.posts[0].body.a === 'sair' && !('r' in r.posts[0].body) && !/Obrigada/.test(await r.page.textContent('.ok'))); await r.ctx.close();

  // ---- resumo semanal com "Outro motivo" ----
  r = await run('pt', Q, OK);
  await r.page.click('.opt:nth-child(6)'); await r.page.waitForSelector('#oth'); await r.page.fill('#oth', '  não consigo   abrir  '); await r.shot('outro');
  await r.page.click('[data-a=semanal]'); await r.page.waitForSelector('#h:has-text("resumo")');
  check('semanal: POST a=semanal com motivo outro e o texto livre', r.posts[0].body.a === 'semanal' && r.posts[0].body.r === 'outro' && r.posts[0].body.o === 'não consigo   abrir', r.posts);
  check('semanal: confirma "todo domingo de manhã" (sem escolha de dia ou hora) e oferece voltar ao aviso do dia', /todo domingo de manhã/.test(await r.page.textContent('.ok')) && await r.page.$$eval('select', e => e.length) === 0 && /Voltar ao aviso do dia/.test(await r.page.textContent('.undo')));
  await r.shot('semanal'); await r.ctx.close();

  // ---- continuar recebendo ----
  r = await run('pt', Q, OK);
  await r.page.click('[data-a=keep]');
  check('continuar recebendo: não grava nada e diz "nada muda"', r.posts.length === 0 && /nada muda/.test(await r.title())); await r.ctx.close();

  // ---- en: nada em português ----
  r = await run('en', '?u=abc&t=def&l=en', OK, { scheme: 'dark' });
  const ptWords = /[ãõçéêíóú]|Parar|Sim,|Pronto|Continuar|Configurações|Motivo|Recebo|Obrigada|domingo/;
  let txt = await r.page.evaluate(() => document.body.innerText + document.title);
  check('en: pergunta em inglês, sem português, lang=en', !ptWords.test(txt) && await r.page.evaluate(() => document.documentElement.lang) === 'en', txt);
  await r.page.click('.opt:nth-child(1)'); await r.page.click('[data-a=sair]'); await r.page.waitForSelector('#h:has-text("left")');
  txt = await r.page.evaluate(() => document.body.innerText + document.title);
  check('en: POST com l=en e tela "Done" sem português', /l=en$/.test(r.posts[0].url) && r.posts[0].body.r === 'muitos_emails' && !ptWords.test(txt), txt);
  await r.shot('pronto'); await r.page.click('[data-a=voltar]'); await r.page.waitForSelector('#h:has-text("back")');
  txt = await r.page.evaluate(() => document.body.innerText); check('en: tela "back" sem português', !ptWords.test(txt), txt); await r.ctx.close();
  r = await run('en', '?u=abc&t=def&l=en', (b) => b.a === 'semanal' ? OK(b) : OK(b), { scheme: 'dark' });
  await r.page.click('[data-a=semanal]'); await r.page.waitForSelector('#h:has-text("summary")');
  txt = await r.page.evaluate(() => document.body.innerText); check('en: resumo semanal em inglês, "Sunday", sem português', /Sunday morning/.test(txt) && !ptWords.test(txt), txt); await r.ctx.close();

  // ---- link inválido e falhas ----
  r = await run('inv', '?u=x&t=y&l=pt', () => ({ s: 400, j: { ok: false, error: 'invalid_link' } }));
  await r.page.click('[data-a=sair]'); await r.page.waitForSelector('#h:has-text("não é válido")');
  check('link inválido (400): mensagem certa, sem botão de tentar de novo', !(await r.page.isVisible('[data-a=sair]'))); await r.shot('invalido'); await r.ctx.close();
  r = await run('sem', '', OK); check('sem parâmetros: "não é válido" sem pedir nada', /não é válido/.test(await r.title()) && r.posts.length === 0); await r.ctx.close();
  r = await run('rede', Q, (b, n) => (n === 1 ? null : OK(b)));
  await r.page.click('[data-a=sair]'); await r.page.waitForSelector('#h:has-text("deu errado")'); await r.shot('erro');
  await r.page.click('[data-a=retry]'); await r.page.waitForSelector('#h:has-text("saiu")');
  check('falha de rede: avisa, "Tentar de novo" repete a mesma ação e funciona', r.posts.length === 2 && r.posts[1].body.a === 'sair'); await r.ctx.close();
  r = await run('err500', Q, () => ({ s: 500, j: { ok: false } })); await r.page.click('[data-a=semanal]'); await r.page.waitForSelector('#h:has-text("deu errado")');
  check('erro 500 do servidor: mostra "deu errado" e não finge que deu certo', true); await r.ctx.close();

  // ---- celular escuro, sem rolagem lateral ----
  r = await run('pt', Q, OK, { scheme: 'dark', width: 360 });
  check('360px escuro: sem rolagem lateral', await r.page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)); await r.shot('pergunta');
  await r.page.click('.opt:nth-child(6)'); await r.page.fill('#oth', 'x'); await r.page.click('[data-a=sair]'); await r.page.waitForSelector('#h:has-text("saiu")'); await r.shot('pronto');
  check('360px escuro: depois de sair também sem rolagem lateral', await r.page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)); await r.ctx.close();
  // teclado: Tab chega nos motivos e Enter marca
  r = await run('pt', Q, OK); await r.page.keyboard.press('Tab'); await r.page.keyboard.press('Enter');
  check('teclado: Tab + Enter marca o 1º motivo', (await r.page.$$eval('.opt[aria-checked=true]', e => e.length)) === 1); await r.ctx.close();
  await browser.close(); server.close();
  console.log(`Página sair-cartoes: ${passed}/${passed + failed} verificações — ${failed ? failed + ' FALHAS' : 'OK'}`); process.exit(failed ? 1 : 0);
})();

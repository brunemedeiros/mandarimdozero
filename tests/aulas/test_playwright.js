// Página /aulas/ (Fase 6 do projeto GA4, docs/historico/35-google-analytics-consentimento.md): moldura com o formulário de
// aulas de francês do Google Forms. Confere: "Como conheceu a Prof. Brune?" marcada pelo utm_source (textos IGUAIS aos do
// formulário, copiados dele em 2026-11-24); sem utm ou valor desconhecido = nada marcado; nada além disso vai do link para o
// Google; aviso de cookies em pt-BR; nada ao Google antes da escolha nem depois de recusar; aceitar mede a moldura com o
// utm_* e sem o resto do link. A rede de fora é bloqueada (o formulário não carrega de verdade aqui).
// Rodar: node tests/aulas/test_playwright.js
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});

let ok = 0, fail = 0;
function check(name, cond, info){ if (cond) ok++; else { fail++; console.log('FALHOU:', name, info !== undefined ? JSON.stringify(info) : ''); } }

const FORM = 'https://docs.google.com/forms/d/e/1FAIpQLSfpHPNfRp_r6tyuSXuXFGHvVvsunvVjhyTprmNWU3zBepaAEA/viewform';
// Opções da pergunta "Como conheceu a Prof. Brune?" (entry.1856921042) no formulário publicado, 2026-11-24.
const FORM_OPTIONS = ['Instagram @prof.brune', 'Perfil pessoal da Brune (Instagram ou outra rede)', 'Indicação de amigo, familiar ou aluno', 'TikTok', 'Pesquisa no Google', 'Site app.profbrune.com.br', 'Mundo Lingo'];
const EXPECTED = {
  instagram: 'Instagram @prof.brune',
  pessoal: 'Perfil pessoal da Brune (Instagram ou outra rede)',
  tiktok: 'TikTok',
  indicacao: 'Indicação de amigo, familiar ou aluno',
  mundolingo: 'Mundo Lingo'
};
const GOOGLE = /google-analytics\.com|googletagmanager\.com|doubleclick\.net/;

async function open(browser, port, query, init){
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 }, locale: 'pt-BR' });
  const page = await ctx.newPage();
  const errors = [], google = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (GOOGLE.test(r.url())) google.push(r.url()); });
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.addInitScript(() => { window.__CONSENT_TEST__ = true; });
  if (init) await page.addInitScript(init);
  await page.goto(`http://127.0.0.1:${port}/aulas/${query || ''}`);
  return { ctx, page, errors, google };
}
const src = (page) => page.$eval('#app', f => f.getAttribute('src'));
function parse(u){ const x = new URL(u); return { base: x.origin + x.pathname, q: Object.fromEntries(x.searchParams), hash: x.hash }; }

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch();
  try {
    // os textos da página precisam existir no formulário (senão o Google ignora a marcação)
    for (const v of Object.values(EXPECTED)) check(`opção existe no formulário: ${v}`, FORM_OPTIONS.includes(v));

    // cada utm_source marca a opção certa
    for (const [utm, answer] of Object.entries(EXPECTED)){
      const { ctx, page, errors } = await open(browser, port, `?utm_source=${utm}&utm_medium=bio`);
      const p = parse(await src(page));
      check(`${utm}: abre o formulário de aulas, embutido`, p.base === FORM && p.q.embedded === 'true', p);
      check(`${utm}: marca "${answer}"`, p.q['entry.1856921042'] === answer && p.q.usp === 'pp_url', p.q);
      check(`${utm}: sem erro de página`, errors.length === 0, errors);
      await ctx.close();
    }
    // maiúsculas e espaços não atrapalham
    {
      const { ctx, page } = await open(browser, port, '?utm_source=%20Instagram%20');
      check('utm_source " Instagram ": marca o Instagram', parse(await src(page)).q['entry.1856921042'] === 'Instagram @prof.brune');
      await ctx.close();
    }
    // sem utm, valor desconhecido ou truque com nome de propriedade: nada marcado
    for (const q of ['', '?utm_source=facebook', '?origem=instagram', '?utm_source=constructor', '?utm_source=__proto__', '?utm_source=']){
      const { ctx, page, errors } = await open(browser, port, q);
      const p = parse(await src(page));
      check(`"${q || '(sem nada)'}": formulário sem opção marcada`, p.base === FORM && Object.keys(p.q).join(',') === 'embedded', p.q);
      check(`"${q || '(sem nada)'}": sem erro de página`, errors.length === 0, errors);
      await ctx.close();
    }
    // nada além da resposta vai do link para o Google
    {
      const { ctx, page } = await open(browser, port, '?utm_source=tiktok&utm_campaign=x&email=a%40b.com&nome=Ana#segredo');
      const s = await src(page); const p = parse(s);
      check('link com outros parâmetros: só embedded, usp e a resposta vão ao formulário', Object.keys(p.q).sort().join(',') === 'embedded,entry.1856921042,usp' && !p.hash && !/a%40b|a@b|Ana|segredo|campaign/.test(s), s);
      await ctx.close();
    }
    // aviso de cookies: pt-BR, nada ao Google antes da escolha; recusar não carrega nada
    {
      const { ctx, page, google } = await open(browser, port, '?utm_source=instagram&utm_medium=bio');
      await page.waitForSelector('#cc-banner', { timeout: 8000 });
      check('aviso em pt-BR', /Aceitar todos/.test(await page.$eval('#cc-banner', e => e.innerText)));
      check('título da aba', (await page.title()) === 'Aulas de francês · Prof. Brune');
      await page.waitForTimeout(400);
      check('nada ao Google antes da escolha', google.length === 0, google);
      await page.click('#cc-banner [data-cc="reject"]');
      await page.waitForTimeout(400);
      check('recusar: nada ao Google', google.length === 0, google);
      check('recusar: aviso some', !(await page.$('#cc-banner')));
      await ctx.close();
    }
    // aceitar: mede a moldura com o caminho /aulas/ e o utm_*, sem o resto do link
    {
      const { ctx, page, google } = await open(browser, port, '?utm_source=mundolingo&utm_medium=parceria&email=a%40b.com#x');
      await page.waitForSelector('#cc-banner');
      await page.click('#cc-banner [data-cc="accept"]');
      await page.waitForFunction(() => (window.dataLayer || []).some(a => a[0] === 'event' && a[1] === 'page_view'), null, { timeout: 5000 });
      const pv = await page.evaluate(() => (window.dataLayer || []).map(a => Array.from(a)).filter(a => a[0] === 'event' && a[1] === 'page_view').map(a => a[2]));
      const loc = pv[0] && pv[0].page_location;
      check('aceitar: pede o gtag.js', google.some(u => /gtag\/js\?id=G-CE3282C1FB/.test(u)), google);
      check('aceitar: 1 page_view', pv.length === 1, pv);
      check('aceitar: caminho /aulas/ com utm_source e utm_medium', /\/aulas\/\?/.test(loc) && /utm_source=mundolingo/.test(loc) && /utm_medium=parceria/.test(loc), loc);
      check('aceitar: sem e-mail nem # no endereço medido', !/email|a%40b|a@b|#/.test(loc), loc);
      check('aceitar: o formulário continua marcado', parse(await src(page)).q['entry.1856921042'] === 'Mundo Lingo');
      await ctx.close();
    }
  } finally {
    await browser.close(); server.close();
  }
  console.log(`aulas: ${ok}/${ok + fail} ok`);
  process.exit(fail ? 1 : 0);
})();

// Entrada bilíngue (2026-10-18): "Idioma do site" no topo da entrada (menu Português/English com bandeiras), começando
// pelo idioma do navegador (português se for português; qualquer outro, inglês). Depois do login, a escolha do curso
// tem "Eu falo..." (igual ao de Adicionar curso) e a resposta segue para o app ('ui-language-gate').
// Rodar: node tests/login-obrigatorio/test_entrada_idioma.js
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const SHOTS = process.env.SHOTS || '';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };
const GATE_STUB = /const GATE_STUB = `([\s\S]*?)`;/.exec(fs.readFileSync(path.join(__dirname, 'test_playwright.js'), 'utf8'))[1];
// Palavras que denunciam português na página em inglês.
const PT_WORDS = /\b(Entrar|senha|conta|Continuar|Esqueceu|Crie|grátis|Idioma|Carregando|Confirme|código|Reenviar|Usar outro|Qual idioma|Eu falo|Francês|Chinês|Dá para)\b/;

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const open = async (locale, theme, width, init) => {
    const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: width || 1200, height: 860 }, colorScheme: theme || 'light', locale });
    const page = await ctx.newPage(); const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
    await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: GATE_STUB }));
    if (init) await page.addInitScript(init);
    await page.goto(`${base}/index.html`);
    await page.waitForSelector('#gate-login', { state: 'visible' });
    return { ctx, page, errors };
  };
  const loginText = (page) => page.evaluate(() => document.getElementById('gate-login').innerText + ' ' + document.getElementById('site-lang').innerText + ' ' +
    [...document.querySelectorAll('#gate-login [placeholder]')].map(e => e.placeholder).join(' ') + ' ' + document.title);
  // o catálogo em inglês chega um instante depois de getUiLang() mudar: espera o título da página já traduzido
  const waitLang = (page, v) => page.waitForFunction((v) => getUiLang() === v && document.documentElement.lang === v &&
    document.title === (v === 'en' ? 'Languages with Prof. Brune' : 'Idiomas com Prof. Brune'), v, { timeout: 5000 });

  // 1) idioma inicial pelo navegador
  for (const [locale, want] of [['pt-BR', 'pt-BR'], ['pt-PT', 'pt-BR'], ['en-US', 'en'], ['es-ES', 'en'], ['fr-FR', 'en']]){
    const { ctx, page, errors } = await open(locale);
    await waitLang(page, want).catch(() => {});
    const txt = await loginText(page);
    const cur = await page.evaluate(() => document.getElementById('site-lang-current').textContent);
    if (want === 'en'){
      check(`${locale}: entrada abre em inglês`, /Languages with Prof\. Brune/.test(txt) && /Create a free account/.test(txt) && cur === 'English', txt);
      check(`${locale}: nada em português na entrada em inglês`, !PT_WORDS.test(txt), (txt.match(PT_WORDS) || [])[0]);
    } else {
      check(`${locale}: entrada abre em português`, /Idiomas com Prof\. Brune/.test(txt) && /Crie sua conta grátis/.test(txt) && /conta grátis e escolha/.test(txt) && cur === 'Português', txt);
      check(`${locale}: sem travessão no texto de cima`, !/—|--/.test(txt));
    }
    check(`${locale}: sem erros de página`, errors.length === 0, errors);
    await ctx.close();
  }

  // 2) escolha guardada vence o navegador
  {
    const { ctx, page } = await open('en-US', 'light', 1200, () => { try { if (!sessionStorage.getItem('x')){ localStorage.setItem('ui-language', 'pt-BR'); sessionStorage.setItem('x', '1'); } } catch (e) {} });
    check('escolha guardada (pt-BR) vence navegador em inglês', /Crie sua conta grátis/.test(await loginText(page)));
    await ctx.close();
  }

  // 3) menu "Idioma do site": bandeiras, teclado, troca da página inteira e volta
  for (const [theme, width] of [['light', 1200], ['dark', 1200], ['light', 390], ['dark', 390]]){
    const tag = `${theme}-${width}`;
    const { ctx, page, errors } = await open('pt-BR', theme, width);
    const btn = '#site-lang-btn';
    check(`${tag}: menu começa fechado`, await page.evaluate(() => document.getElementById('site-lang-menu').hidden && document.getElementById('site-lang-btn').getAttribute('aria-expanded') === 'false'));
    await page.click(btn);
    const m = await page.evaluate(() => ({ open: !document.getElementById('site-lang-menu').hidden, exp: document.getElementById('site-lang-btn').getAttribute('aria-expanded'),
      items: [...document.querySelectorAll('#site-lang-menu button')].map(b => ({ t: b.innerText.replace(/\s+/g, ' ').trim(), flag: (b.querySelector('img') || {}).src || '', checked: b.getAttribute('aria-checked'), role: b.getAttribute('role') })),
      focus: document.activeElement && document.activeElement.dataset.ui }));
    check(`${tag}: abre com Português e English, cada um com a bandeira`, m.open && m.exp === 'true' && m.items.length === 2 && /br\.svg$/.test(m.items[0].flag) && /us\.svg$/.test(m.items[1].flag) && /^Português/.test(m.items[0].t) && /^English/.test(m.items[1].t), m);
    check(`${tag}: o idioma atual vem marcado e recebe o foco`, m.items[0].checked === 'true' && m.items[1].checked === 'false' && m.focus === 'pt-BR' && m.items.every(i => i.role === 'menuitemradio'), m);
    const box = await page.evaluate(() => { const r = document.getElementById('site-lang-menu').getBoundingClientRect(); return { l: r.left, r: r.right, w: window.innerWidth }; });
    check(`${tag}: menu cabe na tela`, box.l >= 0 && box.r <= box.w, box);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/entrada-menu-${tag}.png` });
    await page.keyboard.press('ArrowDown');
    check(`${tag}: seta para baixo vai para English`, await page.evaluate(() => document.activeElement.dataset.ui === 'en'));
    await page.keyboard.press('Escape');
    check(`${tag}: Esc fecha e devolve o foco ao botão`, await page.evaluate(() => document.getElementById('site-lang-menu').hidden && document.activeElement.id === 'site-lang-btn'));
    await page.click(btn); await page.click('#site-lang-menu button[data-ui="en"]');
    await waitLang(page, 'en');
    const en = await loginText(page);
    check(`${tag}: escolher English troca a página inteira`, /Log in to pick up/.test(en) && /Continue with Google/.test(en) && /Your email/.test(en) && /Forgot your password\?/.test(en) && /Create a free account/.test(en) && !PT_WORDS.test(en), en);
    check(`${tag}: escolha fica guardada`, await page.evaluate(() => localStorage.getItem('ui-language') === 'en'));
    await page.click('#gate-toggle-mode-btn');
    check(`${tag}: modo cadastro em inglês`, await page.evaluate(() => document.getElementById('gate-submit-btn').textContent === 'Create account' && document.getElementById('gate-toggle-mode-btn').textContent === 'I already have an account'));
    await page.click('#gate-toggle-mode-btn');
    await page.click('#gate-submit-btn'); // campos vazios: o navegador barra, nada quebra
    await page.fill('#gate-email', 'x@x.com'); await page.fill('#gate-password', 'errada1'); await page.click('#gate-submit-btn');
    await page.waitForFunction(() => document.getElementById('gate-login-note').textContent.length > 0);
    check(`${tag}: erro de senha em inglês`, await page.evaluate(() => document.getElementById('gate-login-note').textContent === 'Wrong email or password.'));
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/entrada-en-${tag}.png` });
    await page.click(btn); await page.click('#site-lang-menu button[data-ui="pt-BR"]');
    await waitLang(page, 'pt-BR');
    const pt = await loginText(page);
    check(`${tag}: voltar para Português devolve o texto original`, /Entre para continuar de onde parou/.test(pt) && /Continuar com Google/.test(pt) && /Seu e-mail/.test(pt) && /Crie sua conta grátis/.test(pt), pt);
    check(`${tag}: sem rolagem horizontal`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
    check(`${tag}: botão do idioma com 38px ou mais`, await page.evaluate(() => document.getElementById('site-lang-btn').getBoundingClientRect().height >= 38));
    if (width === 390) check(`${tag}: no celular o rótulo "Idioma do site" some, mas continua para leitor de tela`, await page.evaluate(() => document.querySelector('.site-lang-lbl').getBoundingClientRect().width <= 1 && /Idioma do site/.test(document.getElementById('site-lang-btn').textContent)));
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/entrada-pt-${tag}.png` });
    check(`${tag}: sem erros de página`, errors.length === 0, errors);
    await ctx.close();
  }

  // 4) cadastro em inglês até a escolha do curso: código, "I speak..." e cursos do par
  for (const [locale, theme] of [['en-US', 'dark'], ['pt-BR', 'light']]){
    const tag = `${locale} ${theme}`;
    const want = locale === 'en-US' ? 'en' : 'pt-BR';
    const { ctx, page, errors } = await open(locale, theme, 520);
    await waitLang(page, want).catch(() => {});
    await page.click('#gate-toggle-mode-btn');
    await page.fill('#gate-email', 'nova@x.com'); await page.fill('#gate-password', 'segredo1');
    await page.click('#gate-submit-btn');
    await page.waitForSelector('#gate-verify', { state: 'visible' });
    check(`${tag}: cadastro grava ui_language=${want}`, await page.evaluate((w) => window.__calls.some(c => c[0] === 'signUp' && c[1].options.data.ui_language === w), want));
    const v = await page.evaluate(() => ({ t: document.getElementById('gate-verify').innerText, resend: document.getElementById('gate-resend-btn').textContent }));
    if (want === 'en'){
      check(`${tag}: tela do código em inglês`, /Confirm your email/.test(v.t) && /We sent a code to nova@x\.com\. Enter it here/.test(v.t) && /Resend code \(\d+s\)/.test(v.resend) && /Activate my account/.test(v.t) && !PT_WORDS.test(v.t), v);
      await page.fill('#gate-code', '999999'); await page.click('#gate-verify-btn');
      await page.waitForFunction(() => document.getElementById('gate-verify-note').classList.contains('err'));
      check(`${tag}: código errado avisa em inglês`, await page.evaluate(() => /That code doesn't work/.test(document.getElementById('gate-verify-note').textContent)));
    } else {
      check(`${tag}: tela do código em português`, /Confirme seu e-mail/.test(v.t) && /Enviamos um código para nova@x\.com\. Digite o código/.test(v.t) && /Reenviar código \(\d+s\)/.test(v.resend), v);
    }
    await page.fill('#gate-code', '123456'); await page.click('#gate-verify-btn');
    await page.waitForSelector('#gate-choose-language', { state: 'visible' });
    const ch = () => page.evaluate(() => ({ t: document.getElementById('gate-choose-language').innerText,
      pressed: (document.querySelector('#gate-speak button[aria-pressed="true"]') || {}).dataset,
      cards: [...document.querySelectorAll('#lang-grid .lang-card')].map(c => ({ id: c.dataset.lang, name: c.querySelector('.lang-name').textContent, beta: (c.querySelector('.lang-beta') || {}).textContent || '' })) }));
    let c = await ch();
    check(`${tag}: "Eu falo..." começa no idioma da entrada`, c.pressed && c.pressed.site === want, c.pressed);
    if (want === 'en'){
      check(`${tag}: escolha do curso em inglês`, /Which language do you want to learn\?/.test(c.t) && /I speak Portuguese/.test(c.t) && /I speak English/.test(c.t) && /flag menu/.test(c.t) && !PT_WORDS.test(c.t), c.t);
      check(`${tag}: quem fala inglês vê French e Chinese (beta), sem o curso em rascunho`, c.cards.map(x => x.name).join('|') === 'French|Chinese' && c.cards.every(x => x.beta === 'beta') && !c.cards.some(x => x.id === 'pt'), c.cards);
    } else {
      check(`${tag}: escolha do curso em português`, /Qual idioma você quer aprender\?/.test(c.t) && /Eu falo português/.test(c.t) && /Dá para adicionar outros cursos depois/.test(c.t), c.t);
      check(`${tag}: quem fala português vê Francês e Chinês, sem etiqueta`, c.cards.map(x => x.name).join('|') === 'Francês|Chinês' && c.cards.every(x => !x.beta), c.cards);
    }
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/entrada-curso-${locale}-${theme}.png` });
    // trocar "Eu falo..." troca a lista (a página continua no idioma dela)
    const other = want === 'en' ? 'pt-BR' : 'en';
    await page.click(`#gate-speak button[data-site="${other}"]`);
    c = await ch();
    check(`${tag}: trocar "Eu falo..." troca os cursos sem trocar a página`, c.pressed.site === other && c.cards.length === 2 && (other === 'en' ? c.cards[0].name === 'French' : c.cards[0].name === 'Francês') && await page.evaluate((w) => getUiLang() === w, want), c);
    await page.click(`#gate-speak button[data-site="${want}"]`);
    check(`${tag}: botões do "Eu falo..." com 44px`, await page.evaluate(() => [...document.querySelectorAll('#gate-speak button')].every(b => b.getBoundingClientRect().height >= 44)));
    // escolher o curso: grava o idioma para o app e pergunta a experiência no mesmo idioma
    await page.click('#lang-grid .lang-card[data-lang="fr"]');
    await page.waitForSelector('#gate-choose-experience', { state: 'visible' });
    const ex = await page.evaluate(() => ({ h: document.getElementById('gate-exp-title').textContent, t: document.getElementById('gate-choose-experience').innerText, gate: localStorage.getItem('ui-language-gate'), ui: localStorage.getItem('ui-language') }));
    check(`${tag}: resposta do "Eu falo..." segue para o app`, ex.gate === want && ex.ui === want, ex);
    check(`${tag}: pergunta da experiência no idioma certo`, want === 'en' ? (ex.h === 'Do you already know some French?' && /I'm a beginner/.test(ex.t) && !PT_WORDS.test(ex.t)) : (ex.h === 'Você já sabe algo de Francês?' && /Sou iniciante/.test(ex.t) && !/—/.test(ex.t)), ex);
    check(`${tag}: sem erros de página`, errors.length === 0, errors);
    await ctx.close();
  }

  // 5) quem fala inglês com a página em português: o curso sai em inglês (a página passa para inglês ao escolher)
  {
    const { ctx, page } = await open('pt-BR', 'light', 1200);
    await page.click('#gate-toggle-mode-btn');
    await page.fill('#gate-email', 'nova@x.com'); await page.fill('#gate-password', 'segredo1');
    await page.click('#gate-submit-btn');
    await page.waitForSelector('#gate-verify', { state: 'visible' });
    await page.fill('#gate-code', '123456'); await page.click('#gate-verify-btn');
    await page.waitForSelector('#gate-choose-language', { state: 'visible' });
    await page.click('#gate-speak button[data-site="en"]');
    await page.click('#lang-grid .lang-card[data-lang="zh"]');
    await page.waitForSelector('#gate-choose-experience', { state: 'visible' });
    const ex = await page.evaluate(() => ({ gate: localStorage.getItem('ui-language-gate'), ui: getUiLang(), h: document.getElementById('gate-exp-title').textContent }));
    check('"Eu falo inglês" com a página em português: curso em inglês', ex.gate === 'en' && ex.ui === 'en' && ex.h === 'Do you already know some Chinese?', ex);
    await ctx.close();
  }

  // 6) links dos e-mails em inglês
  {
    const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1200, height: 860 }, locale: 'en-US' });
    const page = await ctx.newPage();
    await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
    await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: GATE_STUB }));
    await page.goto(`${base}/index.html?confirmar=usado`);
    await page.waitForSelector('#gate-confirm-link', { state: 'visible' });
    await page.waitForFunction(() => getUiLang() === 'en');
    check('link de ativação em inglês', await page.evaluate(() => document.getElementById('gate-confirm-link-title').textContent === 'Activate your account' && document.getElementById('gate-confirm-link-btn').textContent === 'Activate my account'));
    await page.click('#gate-confirm-link-btn');
    await page.waitForSelector('#gate-confirm-link-login', { state: 'visible' });
    check('link vencido avisa em inglês', await page.evaluate(() => /already used or has expired/.test(document.getElementById('gate-confirm-link-note').textContent) && document.getElementById('gate-confirm-link-login').textContent === 'Go to login'));
    await ctx.close();
  }

  await browser.close(); server.close();
  console.log(`entrada bilíngue: ${passed}/${passed + failed} ok`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

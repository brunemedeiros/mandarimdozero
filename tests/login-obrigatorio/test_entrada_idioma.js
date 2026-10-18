// Entrada bilíngue (2026-10-18): "Idioma do site" no topo da entrada (menu Português/English com bandeiras), começando
// pelo idioma do navegador (português se for português; qualquer outro, inglês). Tela Entrar no estilo do Busuu e
// cadastro em 3 passos (curso, como entrar, seus dados com o @ conferido na hora pela 113); depois do código o @ é
// gravado (111) e o curso escolhido segue para o app ('ui-language-gate').
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
const PT_WORDS = /\b(Entrar|senha|Senha|conta|Continuar|Esqueceu|Crie|grátis|Idioma|Carregando|Confirme|código|Reenviar|Usar outro|Qual idioma|Eu falo|Francês|Chinês|Dá para|Passo|Voltar|Seus dados|Nome|livre|Conferindo)\b/;
const nb = (x) => String(x).replace(/\u00a0/g, ' ');

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
  const screenText = (page, id) => page.evaluate((id) => (document.getElementById(id).innerText + ' ' +
    [...document.querySelectorAll('#' + id + ' [placeholder]')].map(e => e.placeholder).join(' ')).replace(/\u00a0/g, ' '), id);
  const loginText = (page) => page.evaluate(() => (document.getElementById('gate-login').innerText + ' ' + document.getElementById('site-lang').innerText + ' ' +
    [...document.querySelectorAll('#gate-login [placeholder]')].map(e => e.placeholder).join(' ') + ' ' + document.title).replace(/\u00a0/g, ' '));
  // o catálogo em inglês chega um instante depois de getUiLang() mudar: espera o título da página já traduzido
  const waitLang = (page, v) => page.waitForFunction((v) => getUiLang() === v && document.documentElement.lang === v &&
    document.title.replace(/\u00a0/g, ' ') === (v === 'en' ? 'Languages with Prof. Brune' : 'Idiomas com Prof. Brune'), v, { timeout: 5000 });
  const visible = (page, id) => page.waitForSelector('#' + id, { state: 'visible', timeout: 5000 });
  const userState = (page, p) => page.evaluate((p) => ({ v: document.getElementById(p + '-username').value, msg: document.getElementById(p + '-username-msg').textContent,
    cls: document.getElementById(p + '-username-box').className, inv: document.getElementById(p + '-username').getAttribute('aria-invalid'),
    sugg: [...document.querySelectorAll('#' + p + '-username-sugg button')].map(b => b.textContent) }), p);
  const waitMsg = (page, p, re) => page.waitForFunction(([p, src]) => new RegExp(src).test(document.getElementById(p + '-username-msg').textContent), [p, re.source], { timeout: 5000 });

  // 1) idioma inicial pelo navegador
  for (const [locale, want] of [['pt-BR', 'pt-BR'], ['pt-PT', 'pt-BR'], ['en-US', 'en'], ['es-ES', 'en'], ['fr-FR', 'en']]){
    const { ctx, page, errors } = await open(locale);
    await waitLang(page, want).catch(() => {});
    const txt = await loginText(page);
    const cur = await page.evaluate(() => document.getElementById('site-lang-current').textContent);
    if (want === 'en'){
      check(`${locale}: entrada abre em inglês`, /Languages with Prof\. Brune/.test(txt) && /Continue with Google/.test(txt) && /Email/.test(txt) && /Password/.test(txt) && /Log in/.test(txt) && /Don't have an account\? Create a free account/.test(txt) && cur === 'English', txt);
      check(`${locale}: nada em português na entrada em inglês`, !PT_WORDS.test(txt), (txt.match(PT_WORDS) || [])[0]);
    } else {
      check(`${locale}: entrada abre em português`, /Idiomas com Prof\. Brune/.test(txt) && /Continuar com Google/.test(txt) && /E-mail/.test(txt) && /Senha/.test(txt) && /Esqueceu sua senha\?/.test(txt) && /Não tem conta\? Crie sua conta grátis/.test(txt) && cur === 'Português', txt);
      check(`${locale}: sem travessão`, !/—|--/.test(txt));
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

  // 3) tela Entrar (estilo Busuu) e menu "Idioma do site": bandeiras, teclado, troca da página inteira e volta; tema
  for (const [theme, width] of [['light', 1200], ['dark', 1200], ['light', 390], ['dark', 390]]){
    const tag = `${theme}-${width}`;
    const { ctx, page, errors } = await open('pt-BR', theme, width);
    const lay = await page.evaluate(() => {
      const r = (id) => document.getElementById(id).getBoundingClientRect();
      const img = document.querySelector('#gate-login .er-marca');
      const h1 = document.getElementById('gate-login-title');
      return { logo: !!img && img.complete && img.naturalWidth > 0 && /logo-mark\.svg$/.test(img.src),
        h1: h1.textContent.replace(/ /g, ' '), h1h: h1.getBoundingClientRect().height, lh: parseFloat(getComputedStyle(h1).lineHeight) || 30,
        labels: ['gate-email', 'gate-password'].every(id => { const l = document.querySelector(`label[for="${id}"]`); return l && l.offsetParent !== null && l.textContent.trim().length > 0; }),
        linkBelow: r('gate-signup-link').top > r('gate-submit-btn').bottom, forgotLeft: r('gate-forgot-btn').left < r('gate-submit-btn').left + 40,
        pill: parseFloat(getComputedStyle(document.getElementById('gate-submit-btn')).borderRadius) >= 25,
        noOld: !document.getElementById('gate-toggle-mode-btn') && !document.getElementById('gate-login-sub') };
    });
    check(`${tag}: Entrar: logo, título da marca em uma linha, campos com nome visível, "Esqueceu" à esquerda`, lay.logo && lay.h1 === 'Idiomas com Prof. Brune' && lay.h1h < lay.lh * 1.6 && lay.labels && lay.forgotLeft && lay.pill, lay);
    check(`${tag}: Entrar: "Crie sua conta grátis" fica embaixo do botão Entrar`, lay.linkBelow && lay.noOld, lay);
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
    check(`${tag}: escolher English troca a página inteira`, /Languages with Prof\. Brune/.test(en) && /Continue with Google/.test(en) && /you@email\.com/.test(en) && /Forgot your password\?/.test(en) && /Create a free account/.test(en) && !PT_WORDS.test(en), en);
    check(`${tag}: escolha fica guardada`, await page.evaluate(() => localStorage.getItem('ui-language') === 'en'));
    await page.click('#gate-submit-btn'); // campos vazios: o navegador barra, nada quebra
    await page.fill('#gate-email', 'x@x.com'); await page.fill('#gate-password', 'errada1'); await page.click('#gate-submit-btn');
    await page.waitForFunction(() => document.getElementById('gate-login-note').textContent.length > 0);
    check(`${tag}: erro de senha em inglês`, await page.evaluate(() => document.getElementById('gate-login-note').textContent === 'Wrong email or password.'));
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/entrada-en-${tag}.png` });
    await page.click(btn); await page.click('#site-lang-menu button[data-ui="pt-BR"]');
    await waitLang(page, 'pt-BR');
    const pt = await loginText(page);
    check(`${tag}: voltar para Português devolve o texto original`, /Idiomas com Prof\. Brune/.test(pt) && /Continuar com Google/.test(pt) && /seu@email\.com/.test(pt) && /Crie sua conta grátis/.test(pt) && /Entrar/.test(pt), pt);
    const th0 = await page.evaluate(() => ({ dark: isDarkThemeActive(), bg: getComputedStyle(document.body).backgroundColor }));
    await page.click('#theme-toggle-btn');
    const th1 = await page.evaluate(() => ({ dark: isDarkThemeActive(), attr: document.documentElement.getAttribute('data-theme'), bg: getComputedStyle(document.body).backgroundColor, saved: localStorage.getItem('app_theme'), pressed: document.getElementById('theme-toggle-btn').getAttribute('aria-pressed') }));
    check(`${tag}: botão de tema troca o tema e guarda a escolha`, th1.dark === !th0.dark && th1.attr === (th1.dark ? 'dark' : 'light') && th1.bg !== th0.bg && th1.saved === th1.attr && th1.pressed === String(th1.dark), { th0, th1 });
    await page.click('#theme-toggle-btn');
    check(`${tag}: segundo clique volta ao tema anterior`, await page.evaluate((d) => isDarkThemeActive() === d, th0.dark));
    check(`${tag}: sem rolagem horizontal`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
    check(`${tag}: botão do idioma com 38px ou mais`, await page.evaluate(() => document.getElementById('site-lang-btn').getBoundingClientRect().height >= 38));
    if (width === 390) check(`${tag}: no celular o rótulo "Idioma do site" some, mas continua para leitor de tela`, await page.evaluate(() => document.querySelector('.site-lang-lbl').getBoundingClientRect().width <= 1 && /Idioma do site/.test(document.getElementById('site-lang-btn').textContent)));
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/entrada-pt-${tag}.png` });
    check(`${tag}: sem erros de página`, errors.length === 0, errors);
    await ctx.close();
  }

  // 4) cadastro em 3 passos, em inglês (escuro, 520) e em português (claro, celular)
  for (const [locale, theme, width] of [['en-US', 'dark', 520], ['pt-BR', 'light', 390]]){
    const want = locale === 'en-US' ? 'en' : 'pt-BR';
    const tag = `${locale} ${theme}-${width}`;
    const E = want === 'en';
    const { ctx, page, errors } = await open(locale, theme, width);
    await waitLang(page, want).catch(() => {});
    const noScroll = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    // passo 1
    await page.click('#gate-signup-link');
    await visible(page, 'gate-signup-course');
    let st = await page.evaluate(() => ({ step: document.querySelector('#gate-signup-course .cad-passo').textContent, focus: document.activeElement && document.activeElement.tagName,
      pressed: (document.querySelector('#gate-signup-course .gate-speak button[aria-pressed="true"]') || {}).dataset,
      cards: [...document.querySelectorAll('#signup-grid .lang-card')].map(c => c.querySelector('.lang-name').textContent),
      back: document.querySelector('#gate-signup-course .cad-voltar').getBoundingClientRect().height }));
    check(`${tag}: passo 1 com "${E ? 'Step 1 of 3' : 'Passo 1 de 3'}", foco no título e "Eu falo..." no idioma da entrada`, st.step === (E ? 'Step 1 of 3' : 'Passo 1 de 3') && st.focus === 'H1' && st.pressed && st.pressed.site === want, st);
    check(`${tag}: passo 1 mostra os cursos do par`, st.cards.join('|') === (E ? 'French|Chinese' : 'Francês|Chinês'), st.cards);
    check(`${tag}: "Voltar" com 44px`, st.back >= 44, st.back);
    let txt = await screenText(page, 'gate-signup-course');
    if (E) check(`${tag}: passo 1 sem português`, !PT_WORDS.test(txt), (txt.match(PT_WORDS) || [])[0]);
    check(`${tag}: passo 1 sem rolagem horizontal`, await noScroll());
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/cadastro-1-${tag}.png`, fullPage: true });
    await page.click('#gate-signup-course .cad-voltar');
    await visible(page, 'gate-login');
    check(`${tag}: "Voltar" do passo 1 leva a Entrar`, true);
    await page.click('#gate-signup-link'); await visible(page, 'gate-signup-course');
    await page.click('#signup-grid .lang-card[data-lang="fr"]');
    // passo 2
    await visible(page, 'gate-signup-method');
    st = await page.evaluate(() => ({ step: document.querySelector('#gate-signup-method .cad-passo').textContent, hello: document.getElementById('signup-method-hello').textContent,
      helloLang: document.getElementById('signup-method-hello').getAttribute('lang'), title: document.getElementById('signup-method-title').textContent,
      flag: !!document.querySelector('#signup-method-flag svg') }));
    check(`${tag}: passo 2 com bandeira, "Bonjour !" em francês e o título do curso`, st.step === (E ? 'Step 2 of 3' : 'Passo 2 de 3') && st.hello === 'Bonjour !' && st.helloLang === 'fr' && st.flag
      && st.title === (E ? 'Create your account and start learning French' : 'Crie sua conta e comece o seu francês'), st);
    txt = await screenText(page, 'gate-signup-method');
    check(`${tag}: passo 2 tem Google e e-mail`, (E ? /Continue with Google/.test(txt) && /Continue with email/.test(txt) && /It's free/.test(txt) : /Continuar com Google/.test(txt) && /Continuar com e-mail/.test(txt) && /É grátis/.test(txt)), txt);
    if (E) check(`${tag}: passo 2 sem português`, !PT_WORDS.test(txt.replace('Bonjour', '')), (txt.match(PT_WORDS) || [])[0]);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/cadastro-2-${tag}.png`, fullPage: true });
    await page.click('#gate-signup-method .cad-voltar'); await visible(page, 'gate-signup-course');
    await page.click('#signup-grid .lang-card[data-lang="fr"]'); await visible(page, 'gate-signup-method');
    await page.click('#signup-email-btn');
    // passo 3
    await visible(page, 'gate-signup-data');
    check(`${tag}: passo 3 com o foco no nome`, await page.evaluate(() => document.activeElement.id === 'signup-name'));
    await page.fill('#signup-name', 'Raíssa Lima');
    await waitMsg(page, 'signup', E ? /already taken/ : /já é de outra pessoa/);
    let u = await userState(page, 'signup');
    check(`${tag}: @ montado do nome (raissa.lima) e já ocupado: aviso, 3 sugestões e campo marcado`, u.v === 'raissa.lima' && /ruim/.test(u.cls) && u.inv === 'true' && u.sugg.join('|') === '@raissalima|@raissa.lima2|@raissa.lima3', u);
    await page.fill('#signup-email', 'raissa@x.com'); await page.fill('#signup-password', 'segredo1');
    await page.click('#signup-submit');
    await page.waitForFunction(() => document.getElementById('signup-note').textContent.length > 0);
    check(`${tag}: com @ ocupado não cria a conta`, await page.evaluate((E) => document.getElementById('signup-note').textContent === (E ? 'Pick an available @.' : 'Escolha um @ livre.') && !window.__calls.some(c => c[0] === 'signUp'), E));
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/cadastro-3-ocupado-${tag}.png`, fullPage: true });
    await page.click('#signup-username-sugg button:nth-child(2)');
    u = await userState(page, 'signup');
    check(`${tag}: tocar na sugestão escolhe o @ livre`, u.v === 'raissa.lima2' && /ok/.test(u.cls) && u.inv === 'false' && (E ? /is available/ : /está livre/).test(u.msg) && u.sugg.length === 0, u);
    await page.fill('#signup-username', 'ab');
    await waitMsg(page, 'signup', E ? /3 to 24/ : /3 a 24/);
    check(`${tag}: @ curto avisa as regras`, /ruim/.test((await userState(page, 'signup')).cls));
    await page.fill('#signup-username', 'Admin!');
    await waitMsg(page, 'signup', E ? /can't be used/ : /não pode ser usado/);
    u = await userState(page, 'signup');
    check(`${tag}: maiúscula e símbolo somem; @ reservado sugere outros`, u.v === 'admin' && u.sugg.length === 3, u);
    await page.fill('#signup-username', 'raissa.oficial');
    await waitMsg(page, 'signup', E ? /is available/ : /está livre/);
    await page.fill('#signup-name', 'Raíssa Lima Souza');
    await page.waitForTimeout(500);
    check(`${tag}: depois de mexer no @, mudar o nome não troca o @`, (await userState(page, 'signup')).v === 'raissa.oficial');
    await page.fill('#signup-name', '');
    await page.click('#signup-submit');
    check(`${tag}: sem nome avisa`, await page.evaluate((E) => document.getElementById('signup-note').textContent === (E ? 'Enter your name.' : 'Digite seu nome.') && document.activeElement.id === 'signup-name', E));
    await page.fill('#signup-name', 'Raíssa Lima');
    await page.fill('#signup-email', 'raissa');
    await page.click('#signup-submit');
    check(`${tag}: e-mail errado avisa`, await page.evaluate((E) => document.getElementById('signup-note').textContent === (E ? 'Check the email address.' : 'Confira o e-mail.'), E));
    await page.fill('#signup-email', 'raissa@x.com'); await page.fill('#signup-password', '123');
    await page.click('#signup-submit');
    check(`${tag}: senha curta avisa`, await page.evaluate((E) => document.getElementById('signup-note').textContent === (E ? 'The password needs at least 6 characters.' : 'A senha precisa ter pelo menos 6 caracteres.'), E));
    await page.fill('#signup-password', 'segredo1');
    txt = await screenText(page, 'gate-signup-data');
    if (E) check(`${tag}: passo 3 sem português`, !PT_WORDS.test(txt), (txt.match(PT_WORDS) || [])[0]);
    check(`${tag}: passo 3 sem rolagem horizontal`, await noScroll());
    check(`${tag}: campos do passo 3 com nome ligado (label for)`, await page.evaluate(() => ['signup-name', 'signup-username', 'signup-email', 'signup-password'].every(id => !!document.querySelector(`label[for="${id}"]`))));
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/cadastro-3-livre-${tag}.png`, fullPage: true });
    await page.click('#signup-submit');
    await visible(page, 'gate-verify');
    check(`${tag}: cria a conta com nome e idioma do site`, await page.evaluate((w) => window.__calls.some(c => c[0] === 'signUp' && c[1].email === 'raissa@x.com' && c[1].password === 'segredo1' && c[1].options.data.full_name === 'Raíssa Lima' && c[1].options.data.ui_language === w), want));
    const intent = await page.evaluate(() => JSON.parse(localStorage.getItem('signup-intent') || 'null'));
    check(`${tag}: guarda curso, idioma e @ até o código`, intent && intent.lang === 'fr' && intent.speak === want && intent.username === 'raissa.oficial' && intent.name === 'Raíssa Lima', intent);
    await page.click('#gate-verify-back-btn');
    await visible(page, 'gate-signup-data');
    check(`${tag}: "Usar outro e-mail" volta para os dados, sem perder o que foi digitado`, await page.evaluate(() => document.getElementById('signup-name').value === 'Raíssa Lima' && document.getElementById('signup-username').value === 'raissa.oficial'));
    await page.click('#signup-submit');
    await visible(page, 'gate-verify');
    await page.fill('#gate-code', '123456'); await page.click('#gate-verify-btn');
    await visible(page, 'gate-choose-experience');
    const ex = await page.evaluate(() => ({ h: document.getElementById('gate-exp-title').textContent, gate: localStorage.getItem('ui-language-gate'),
      claim: window.__calls.filter(c => c[0] === 'rpc' && c[1][0] === 'claim_my_username').map(c => c[1][1]) }));
    check(`${tag}: depois do código grava o @ e o nome e vai para a experiência do curso escolhido`, ex.claim.length === 1 && ex.claim[0].p_username === 'raissa.oficial' && ex.claim[0].p_display_name === 'Raíssa Lima'
      && ex.h === (E ? 'Do you already know some French?' : 'Você já sabe algo de francês?') && ex.gate === want, ex);
    check(`${tag}: sem erros de página`, errors.length === 0, errors);
    await ctx.close();
  }

  // 5) quem fala inglês com a página em português: curso em inglês, título do passo 2 em português
  {
    const { ctx, page } = await open('pt-BR', 'light', 1200);
    await page.click('#gate-signup-link'); await visible(page, 'gate-signup-course');
    await page.click('#gate-signup-course .gate-speak button[data-site="en"]');
    const cards = await page.evaluate(() => [...document.querySelectorAll('#signup-grid .lang-card')].map(c => c.querySelector('.lang-name').textContent + '/' + ((c.querySelector('.lang-beta') || {}).textContent || '')));
    check('"Eu falo inglês" troca os cursos (French e Chinese, "em teste" no idioma da página) sem trocar a página', cards.join('|') === 'French/em teste|Chinese/em teste' && await page.evaluate(() => getUiLang() === 'pt-BR'), cards);
    await page.click('#signup-grid .lang-card[data-lang="zh"]'); await visible(page, 'gate-signup-method');
    check('passo 2 do chinês: 你好 e título em português', await page.evaluate(() => document.getElementById('signup-method-hello').textContent === '你好！' && document.getElementById('signup-method-hello').getAttribute('lang') === 'zh' && document.getElementById('signup-method-title').textContent === 'Crie sua conta e comece o seu chinês'));
    await page.click('#signup-email-btn'); await visible(page, 'gate-signup-data');
    await page.fill('#signup-name', 'Nova Pessoa'); await waitMsg(page, 'signup', /está livre/);
    await page.fill('#signup-email', 'nova@x.com'); await page.fill('#signup-password', 'segredo1');
    await page.click('#signup-submit'); await visible(page, 'gate-verify');
    await page.fill('#gate-code', '123456'); await page.click('#gate-verify-btn');
    await visible(page, 'gate-choose-experience');
    const ex = await page.evaluate(() => ({ gate: localStorage.getItem('ui-language-gate'), ui: getUiLang(), h: document.getElementById('gate-exp-title').textContent }));
    check('"Eu falo inglês" com a página em português: curso em inglês', ex.gate === 'en' && ex.ui === 'en' && ex.h === 'Do you already know some Chinese?', ex);
    await ctx.close();
  }

  // 6) o @ foi pego entre a checagem e o código: tela "Escolha outro @" com sugestões
  {
    const { ctx, page, errors } = await open('pt-BR', 'dark', 390);
    await page.click('#gate-signup-link'); await visible(page, 'gate-signup-course');
    await page.click('#signup-grid .lang-card[data-lang="fr"]'); await visible(page, 'gate-signup-method');
    await page.click('#signup-email-btn'); await visible(page, 'gate-signup-data');
    await page.fill('#signup-name', 'Nova Pessoa'); await waitMsg(page, 'signup', /está livre/);
    await page.fill('#signup-email', 'nova@x.com'); await page.fill('#signup-password', 'segredo1');
    await page.click('#signup-submit'); await visible(page, 'gate-verify');
    await page.evaluate(() => { window.__claimTaken = ['nova.pessoa']; });
    await page.fill('#gate-code', '123456'); await page.click('#gate-verify-btn');
    await visible(page, 'gate-signup-retry');
    await waitMsg(page, 'retry', /já é de outra pessoa/);
    const r = await page.evaluate(() => ({ sub: document.getElementById('signup-retry-sub').textContent, v: document.getElementById('retry-username').value,
      sugg: [...document.querySelectorAll('#retry-username-sugg button')].map(b => b.textContent) }));
    check('retry: explica que alguém pegou o @ e sugere outros', /@nova\.pessoa/.test(r.sub) && r.v === 'nova.pessoa' && r.sugg.join('|') === '@nova.pessoa2|@nova.pessoa3', r);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/cadastro-retry-dark-390.png`, fullPage: true });
    await page.click('#retry-username-sugg button');
    await page.click('#retry-submit');
    await visible(page, 'gate-choose-experience');
    check('retry: grava o @ novo e segue', await page.evaluate(() => window.__calls.filter(c => c[0] === 'rpc' && c[1][0] === 'claim_my_username').map(c => c[1][1].p_username).join('|') === 'nova.pessoa|nova.pessoa2'));
    check('retry: sem erros de página', errors.length === 0, errors);
    await ctx.close();
  }

  // 7) sem conseguir conferir o @ (rede): avisa, não bloqueia
  {
    const { ctx, page } = await open('pt-BR', 'light', 1200);
    await page.evaluate(() => { window.__checkDown = true; });
    await page.click('#gate-signup-link'); await visible(page, 'gate-signup-course');
    await page.click('#signup-grid .lang-card[data-lang="fr"]'); await visible(page, 'gate-signup-method');
    await page.click('#signup-email-btn'); await visible(page, 'gate-signup-data');
    await page.fill('#signup-name', 'Nova Pessoa'); await waitMsg(page, 'signup', /Não deu para conferir/);
    await page.fill('#signup-email', 'nova@x.com'); await page.fill('#signup-password', 'segredo1');
    await page.click('#signup-submit'); await visible(page, 'gate-verify');
    check('sem conferir o @: avisa e deixa criar a conta', await page.evaluate(() => window.__calls.some(c => c[0] === 'signUp')));
    await ctx.close();
  }

  // 8) cadastro pelo Google: guarda o curso antes de ir; na volta, vai direto para a experiência (sem gravar @)
  {
    const { ctx, page } = await open('pt-BR', 'light', 1200);
    await page.click('#gate-signup-link'); await visible(page, 'gate-signup-course');
    await page.click('#signup-grid .lang-card[data-lang="zh"]'); await visible(page, 'gate-signup-method');
    await page.click('#signup-google-btn');
    await page.waitForFunction(() => window.__calls.some(c => c[0] === 'oauth'));
    const intent = await page.evaluate(() => JSON.parse(localStorage.getItem('signup-intent') || 'null'));
    check('Google no passo 2: guarda o curso antes de sair', intent && intent.lang === 'zh' && intent.speak === 'pt-BR' && !intent.username, intent);
    await page.evaluate(() => afterAuthResolved({ id: 'g1' }));
    await visible(page, 'gate-choose-experience');
    check('volta do Google: experiência do curso escolhido, sem gravar @', await page.evaluate(() => document.getElementById('gate-exp-title').textContent === 'Você já sabe algo de chinês?' && !window.__calls.some(c => c[0] === 'rpc' && c[1][0] === 'claim_my_username')));
    // Google pela tela Entrar, sem cadastro guardado: escolha do curso de sempre
    await page.evaluate(() => localStorage.removeItem('signup-intent'));
    await page.evaluate(() => afterAuthResolved({ id: 'g2' }));
    await visible(page, 'gate-choose-language');
    check('Google pela tela Entrar (conta nova): escolha do curso', true);
    await ctx.close();
  }

  // 9) links dos e-mails em inglês
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

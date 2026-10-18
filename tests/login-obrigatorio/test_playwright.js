// Login obrigatório (2026-10-12): portão sem "Continuar sem conta", cadastro por e-mail confirmado por CÓDIGO,
// conta não confirmada recebe código novo, e link de perfil aberto sem login vira cartão de apresentação que
// devolve a pessoa ao perfil depois do login. Rodar: node tests/login-obrigatorio/test_playwright.js
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const SHOTS = process.env.SHOTS || '';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };

// Supabase mínimo do portão: sem sessão; signUp sem sessão (confirmação ligada); signIn de conta não confirmada.
const GATE_STUB = `window.supabase = { createClient: () => {
  window.__calls = [];
  const rec = (n, a) => { window.__calls.push([n, a]); };
  const q = () => { const b = new Proxy({}, { get(_, p){ if (p === 'then') return (ok) => ok({ data: null, error: null }); return () => b; } }); return b; };
  return {
    from: q, rpc: async () => ({ data: null, error: null }),
    auth: {
      getSession: async () => ({ data: { session: /type=recovery/.test(location.hash) ? { user: { id: 'r1', email: 'esqueci@x.com' } } : null } }),
      updateUser: async (a) => { rec('updateUser', a); return { data: { user: { id: 'r1' } }, error: null }; },
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }),
      signUp: async (a) => { rec('signUp', a); return { data: { user: { id: 'n1', email: a.email }, session: null }, error: null }; },
      signInWithPassword: async (a) => { rec('signIn', a);
        if (a.email === 'jaativa@x.com' || (a.email === 'outraaba@x.com' && window.__ativadaFora)) return { data: { user: { id: 'j1' }, session: {} }, error: null };
        if (a.email === 'outraaba@x.com') return { data: {}, error: { code: 'email_not_confirmed', message: 'Email not confirmed' } };
        return a.email === 'naoconfirmado@x.com'
        ? { data: {}, error: { code: 'email_not_confirmed', message: 'Email not confirmed' } }
        : { data: {}, error: { message: 'Invalid login credentials' } }; },
      resend: async (a) => { rec('resend', a); return { error: null }; },
      verifyOtp: async (a) => { rec('verifyOtp', a); if (a.token_hash === 'metade') return { data: { user: null, session: null }, error: null }; return (a.token === '123456' || a.token_hash === 'hashbom')
        ? { data: { user: { id: 'n1' }, session: {} }, error: null } : { data: {}, error: { message: 'Token has expired or is invalid' } }; },
      resetPasswordForEmail: async () => ({ error: null }), signInWithOAuth: async () => ({ error: null }),
    },
  };
} };`;

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const [theme, width] of [['light', 1200], ['dark', 1200], ['light', 390]]){
    // navegador em português: a entrada abre em português (navegador em outro idioma abre em inglês, testado abaixo)
    const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width, height: 860 }, colorScheme: theme, locale: 'pt-BR' });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
    await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: GATE_STUB }));
    // navegador que já estudou como convidado: antes entrava direto; agora vê o login
    await page.addInitScript(() => { try { localStorage.setItem('currentLearningLanguage', 'french'); localStorage.setItem('lastLanguage', 'french'); sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
    await page.goto(`http://127.0.0.1:${port}/index.html`);
    await page.waitForSelector('#gate-login', { state: 'visible' });
    const L = (n, c, x) => check(`${theme}-${width} ${n}`, c, x);
    L('portão mostra login (não entra como convidado)', await page.evaluate(() => location.pathname.endsWith('/index.html')));
    L('sem botão "Continuar sem conta"', !(await page.$('#gate-guest-btn')) && !(await page.evaluate(() => document.body.innerText.includes('Continuar sem conta'))));
    L('flag de convidado limpa', await page.evaluate(() => sessionStorage.getItem('guest_mode') === '0'));
    // cadastro
    await page.click('#gate-toggle-mode-btn');
    await page.fill('#gate-email', 'nova@x.com'); await page.fill('#gate-password', 'segredo1');
    await page.click('#gate-submit-btn');
    await page.waitForSelector('#gate-verify', { state: 'visible' });
    L('cadastro abre a tela do código', await page.evaluate(() => document.getElementById('gate-verify-email').textContent === 'nova@x.com'));
    // idioma do site vai no cadastro (user_metadata.ui_language) para o e-mail do Supabase Auth sair no idioma certo
    L('cadastro grava ui_language (navegador em português sem escolha guardada = pt-BR; em inglês, ver a entrada bilíngue abaixo)', await page.evaluate(() => window.__calls.some(c => c[0] === 'signUp' && c[1].email === 'nova@x.com' && c[1].options && c[1].options.data && c[1].options.data.ui_language === 'pt-BR')));
    L('reenviar começa bloqueado (60s)', await page.evaluate(() => document.getElementById('gate-resend-btn').disabled));
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/gate-codigo-${theme}-${width}.png` });
    await page.fill('#gate-code', '999999'); await page.click('#gate-verify-btn');
    await page.waitForFunction(() => document.getElementById('gate-verify-note').classList.contains('err'));
    L('código errado avisa', await page.evaluate(() => /não vale/.test(document.getElementById('gate-verify-note').textContent)));
    await page.fill('#gate-code', '123456'); await page.click('#gate-verify-btn');
    await page.waitForSelector('#gate-choose-language', { state: 'visible' });
    L('código certo confirma e segue para a escolha de idioma', await page.evaluate(() => window.__calls.some(c => c[0] === 'verifyOtp' && c[1].email === 'nova@x.com' && c[1].token === '123456' && c[1].type === 'email')));
    // o cadastro grava o idioma do site escolhido no topo da entrada; valor guardado desconhecido (es) cai em pt-BR
    for (const [saved, esperado] of [['pt-BR', 'pt-BR'], ['en', 'en'], ['es', 'pt-BR']]){
      await page.goto(`http://127.0.0.1:${port}/index.html`);
      await page.waitForSelector('#gate-login', { state: 'visible' });
      if (saved === 'es'){
        await page.evaluate(() => localStorage.setItem('ui-language', 'es'));
        await page.reload(); await page.waitForSelector('#gate-login', { state: 'visible' });
      } else {
        await page.click('#site-lang-btn'); await page.click(`#site-lang-menu button[data-ui="${saved}"]`);
        await page.waitForFunction((v) => getUiLang() === v, saved);
      }
      await page.click('#gate-toggle-mode-btn');
      await page.fill('#gate-email', 'idioma@x.com'); await page.fill('#gate-password', 'segredo1');
      await page.click('#gate-submit-btn');
      await page.waitForSelector('#gate-verify', { state: 'visible' });
      L(`cadastro com ui-language=${saved} grava ui_language=${esperado}`, await page.evaluate((e) => window.__calls.some(c => c[0] === 'signUp' && c[1].options.data.ui_language === e), esperado));
      await page.evaluate(() => localStorage.setItem('ui-language', 'pt-BR'));
    }
    // conta que o antivírus do e-mail já ativou (abriu o link sozinho): código falha, mas a senha entra direto
    for (const via of ['codigo', 'reenviar']){
      await page.goto(`http://127.0.0.1:${port}/index.html`);
      await page.waitForSelector('#gate-login', { state: 'visible' });
      await page.click('#gate-toggle-mode-btn');
      await page.fill('#gate-email', 'jaativa@x.com'); await page.fill('#gate-password', 'segredo1');
      await page.click('#gate-submit-btn');
      await page.waitForSelector('#gate-verify', { state: 'visible' });
      if (via === 'codigo'){ await page.fill('#gate-code', '999999'); await page.click('#gate-verify-btn'); }
      else { await page.evaluate(() => { const b = document.getElementById('gate-resend-btn'); b.disabled = false; b.click(); }); }
      await page.waitForSelector('#gate-choose-language', { state: 'visible' });
      L(`conta já ativa entra direto (${via})`, await page.evaluate(() => window.__calls.some(c => c[0] === 'signIn' && c[1].email === 'jaativa@x.com' && c[1].password === 'segredo1')));
    }
    // botão do e-mail: ?confirmar=<hash> só confirma com um toque
    await page.goto(`http://127.0.0.1:${port}/index.html?confirmar=hashbom`);
    await page.waitForSelector('#gate-confirm-link', { state: 'visible' });
    L('link do e-mail não confirma sozinho', await page.evaluate(() => !window.__calls.some(c => c[0] === 'verifyOtp') && !location.search.includes('confirmar')));
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/gate-ativar-${theme}-${width}.png` });
    await page.click('#gate-confirm-link-btn');
    await page.waitForSelector('#gate-choose-language', { state: 'visible' });
    L('toque no botão confirma pelo token_hash', await page.evaluate(() => window.__calls.some(c => c[0] === 'verifyOtp' && c[1].token_hash === 'hashbom' && c[1].type === 'email')));
    await page.goto(`http://127.0.0.1:${port}/index.html?confirmar=usado`);
    await page.waitForSelector('#gate-confirm-link', { state: 'visible' });
    await page.click('#gate-confirm-link-btn');
    await page.waitForSelector('#gate-confirm-link-login', { state: 'visible' });
    L('link usado avisa e oferece o login', await page.evaluate(() => /já foi usado/.test(document.getElementById('gate-confirm-link-note').textContent)));
    await page.click('#gate-confirm-link-login');
    L('"Ir para o login" abre o login', await page.isVisible('#gate-login'));
    // conta ativada fora desta aba (botão do e-mail em outra janela): a tela do código percebe ao voltar e avisa
    await page.goto(`http://127.0.0.1:${port}/index.html`);
    await page.waitForSelector('#gate-login', { state: 'visible' });
    await page.click('#gate-toggle-mode-btn');
    await page.fill('#gate-email', 'outraaba@x.com'); await page.fill('#gate-password', 'segredo1');
    await page.click('#gate-submit-btn');
    await page.waitForSelector('#gate-verify', { state: 'visible' });
    await page.evaluate(() => { window.dispatchEvent(new Event('focus')); });
    await page.waitForTimeout(300);
    L('antes de ativar continua na tela do código', await page.isVisible('#gate-verify'));
    await page.evaluate(() => { window.__ativadaFora = true; window.dispatchEvent(new Event('focus')); });
    await page.waitForFunction(() => document.getElementById('gate-verify-note').classList.contains('ok'));
    L('avisa "Sua conta foi ativada!"', await page.evaluate(() => /Sua conta foi ativada/.test(document.getElementById('gate-verify-note').textContent)));
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/gate-ativada-${theme}-${width}.png` });
    await page.waitForSelector('#gate-choose-language', { state: 'visible' });
    L('depois do aviso segue para o app', true);
    // os outros botões dos e-mails também só valem com um toque
    for (const [kind, type, title, next] of [['entrar', 'email', 'Entrar no app', '#gate-choose-language'],
      ['nova-senha', 'recovery', 'Crie uma senha nova', '#gate-new-password'], ['trocar-email', 'email_change', 'Confirmar o novo e-mail', '#gate-choose-language']]){
      await page.goto(`http://127.0.0.1:${port}/index.html?${kind}=hashbom`);
      await page.waitForSelector('#gate-confirm-link', { state: 'visible' });
      L(`${kind}: tela própria sem usar o link sozinho`, await page.evaluate((t) => document.getElementById('gate-confirm-link-title').textContent === t && !window.__calls.some(c => c[0] === 'verifyOtp') && !location.search, title));
      await page.click('#gate-confirm-link-btn');
      await page.waitForSelector(next, { state: 'visible' });
      L(`${kind}: toque usa o token_hash com o tipo certo`, await page.evaluate((t) => window.__calls.some(c => c[0] === 'verifyOtp' && c[1].token_hash === 'hashbom' && c[1].type === t), type));
    }
    await page.goto(`http://127.0.0.1:${port}/index.html?trocar-email=metade`);
    await page.waitForSelector('#gate-confirm-link', { state: 'visible' });
    await page.click('#gate-confirm-link-btn');
    await page.waitForFunction(() => document.getElementById('gate-confirm-link-note').classList.contains('ok'));
    L('troca de e-mail: pede o segundo endereço', await page.evaluate(() => /outro endereço/.test(document.getElementById('gate-confirm-link-note').textContent)));
    // conta não confirmada tentando entrar
    await page.goto(`http://127.0.0.1:${port}/index.html`);
    await page.waitForSelector('#gate-login', { state: 'visible' });
    await page.fill('#gate-email', 'naoconfirmado@x.com'); await page.fill('#gate-password', 'segredo1');
    await page.click('#gate-submit-btn');
    await page.waitForSelector('#gate-verify', { state: 'visible' });
    L('conta não confirmada recebe código novo', await page.evaluate(() => window.__calls.some(c => c[0] === 'resend' && c[1].type === 'signup' && c[1].email === 'naoconfirmado@x.com')));
    await page.click('#gate-verify-back-btn');
    L('"Usar outro e-mail" volta ao login', await page.isVisible('#gate-login'));
    // link de "Nova senha": tela de senha nova antes de entrar
    await page.goto("about:blank");
    await page.goto(`http://127.0.0.1:${port}/index.html#access_token=x&refresh_token=y&type=recovery`);
    await page.waitForSelector('#gate-new-password', { state: 'visible' });
    L('link de recuperação abre "Crie uma senha nova"', !(await page.isVisible('#gate-choose-language')));
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/gate-senha-nova-${theme}-${width}.png` });
    await page.fill('#gate-new-password-input', 'nova123'); await page.fill('#gate-new-password-confirm', 'nova124');
    await page.click('#gate-new-password-btn');
    L('senhas diferentes avisam', await page.evaluate(() => /não são iguais/.test(document.getElementById('gate-new-password-note').textContent) && !window.__calls.some(c => c[0] === 'updateUser')));
    await page.fill('#gate-new-password-confirm', 'nova123');
    await page.click('#gate-new-password-btn');
    await page.waitForSelector('#gate-choose-language', { state: 'visible' });
    L('senha nova salva e segue o fluxo', await page.evaluate(() => window.__calls.some(c => c[0] === 'updateUser' && c[1].password === 'nova123')));
    L('sem rolagem horizontal', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
    L('sem erros de página', errors.length === 0, errors);
    await ctx.close();
  }

  // ---- perfil aberto sem login (fr) ----
  const STUB = /const STUB = `([\s\S]*?)`;/.exec(fs.readFileSync(path.join(ROOT, 'tests/fase-i/test_playwright.js'), 'utf8'))[1];
  for (const lang of ['fr', 'zh']){
    const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1200, height: 860 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
    await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
    await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
    await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
    await page.waitForFunction(() => typeof renderPublicProfileInto === 'function');
    // renderiza o perfil como faria a página sem login (CURRENT_USER nulo), com o banco simulado
    const out = await page.evaluate(async () => {
      CURRENT_USER = null;
      fetchPublicProfileByUsername = async () => ({ profile: { user_id: 'S', username: 'ana', display_name: 'Ana Souza', avatar_url: null, bio: 'bio secreta' },
        badges: [{ id: 'student', icon: '🎓', name: 'Aluno/a' }], earnedBadges: [], isPublic: true, languages: [{ languageAppKey: 'frances', pct: 40 }] });
      const host = document.createElement('div'); document.body.prepend(host);
      await renderPublicProfileInto(host, 'ana');
      return { text: host.innerText, cta: !!host.querySelector('[data-login-cta]') };
    });
    check(`${lang} sem login: só nome e @`, out.text.includes('Ana Souza') && out.text.includes('@ana') && !out.text.includes('bio secreta') && !out.text.includes('40'), out.text);
    check(`${lang} sem login: botão Entrar`, out.cta);
    // clique guarda a rota; depois do login ela volta
    await page.evaluate(() => { history.replaceState(null, '', location.pathname + '#/user/ana'); });
    await Promise.all([page.waitForURL(/\/index\.html$|\/$/), page.click('[data-login-cta]')]).catch(() => {});
    const saved = await page.evaluate(() => localStorage.getItem('pendingRouteAfterLogin'));
    check(`${lang} rota guardada para depois do login`, saved === '#/user/ana', saved);
    await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
    await page.waitForFunction(() => typeof consumePendingRouteAfterLogin === 'function');
    const back = await page.evaluate(() => { consumePendingRouteAfterLogin(); return [location.hash, localStorage.getItem('pendingRouteAfterLogin')]; });
    check(`${lang} depois do login volta ao perfil`, back[0] === '#/user/ana' && back[1] === null, back);
    const evil = await page.evaluate(() => { history.replaceState(null, '', location.pathname); localStorage.setItem('pendingRouteAfterLogin', '#/x"><img src=x>'); consumePendingRouteAfterLogin(); return location.hash; });
    check(`${lang} rota estranha ignorada`, evil === '', evil);
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(`${passed}/${passed + failed} ok`);
  process.exit(failed ? 1 : 0);
})();

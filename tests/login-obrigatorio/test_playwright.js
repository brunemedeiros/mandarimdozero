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
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }),
      signUp: async (a) => { rec('signUp', a); return { data: { user: { id: 'n1', email: a.email }, session: null }, error: null }; },
      signInWithPassword: async (a) => { rec('signIn', a); return a.email === 'naoconfirmado@x.com'
        ? { data: {}, error: { code: 'email_not_confirmed', message: 'Email not confirmed' } }
        : { data: {}, error: { message: 'Invalid login credentials' } }; },
      resend: async (a) => { rec('resend', a); return { error: null }; },
      verifyOtp: async (a) => { rec('verifyOtp', a); return a.token === '123456'
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
    const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width, height: 860 }, colorScheme: theme });
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
    L('reenviar começa bloqueado (60s)', await page.evaluate(() => document.getElementById('gate-resend-btn').disabled));
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/gate-codigo-${theme}-${width}.png` });
    await page.fill('#gate-code', '999999'); await page.click('#gate-verify-btn');
    await page.waitForFunction(() => document.getElementById('gate-verify-note').classList.contains('err'));
    L('código errado avisa', await page.evaluate(() => /venceu|incorreto/.test(document.getElementById('gate-verify-note').textContent)));
    await page.fill('#gate-code', '123456'); await page.click('#gate-verify-btn');
    await page.waitForSelector('#gate-choose-language', { state: 'visible' });
    L('código certo confirma e segue para a escolha de idioma', await page.evaluate(() => window.__calls.some(c => c[0] === 'verifyOtp' && c[1].email === 'nova@x.com' && c[1].token === '123456' && c[1].type === 'email')));
    // conta não confirmada tentando entrar
    await page.goto(`http://127.0.0.1:${port}/index.html`);
    await page.waitForSelector('#gate-login', { state: 'visible' });
    await page.fill('#gate-email', 'naoconfirmado@x.com'); await page.fill('#gate-password', 'segredo1');
    await page.click('#gate-submit-btn');
    await page.waitForSelector('#gate-verify', { state: 'visible' });
    L('conta não confirmada recebe código novo', await page.evaluate(() => window.__calls.some(c => c[0] === 'resend' && c[1].type === 'signup' && c[1].email === 'naoconfirmado@x.com')));
    await page.click('#gate-verify-back-btn');
    L('"Usar outro e-mail" volta ao login', await page.isVisible('#gate-login'));
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

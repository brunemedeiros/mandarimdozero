// "Esqueceu sua senha?" (2026-11-16, relato da dona): o envio leva ~1,5 s; antes a tela não mostrava nada nesse meio-tempo,
// a pessoa clicava de novo, o Supabase recusava (429, espera de 60 s) e o erro apagava o "Enviamos um link". Agora: botão
// travado com "Enviando...", tela "Confira seu e-mail" com o endereço, reenviar com contagem e voltar; o 429 também leva à
// tela (o e-mail anterior já saiu). Rodar: node tests/login-obrigatorio/test_esqueci_senha.js [pasta-de-capturas]
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..'), OUT = process.argv[2] || '';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };
// Supabase do portão: sem sessão. resetPasswordForEmail demora 600 ms; o 1º pedido de cada e-mail passa e os seguintes,
// dentro de 60 s, voltam 429 com "after N seconds" (como o Supabase de verdade). window.__fail força erro comum.
const STUB = `window.supabase = { createClient: () => {
  window.__calls = []; window.__sentAt = {};
  const q = () => { const b = new Proxy({}, { get(_, p){ if (p === 'then') return (ok) => ok({ data: null, error: null }); return () => b; } }); return b; };
  return { from: q, rpc: async () => ({ data: null, error: null }),
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }),
      resetPasswordForEmail: async (email) => {
        window.__calls.push(email);
        await new Promise(r => setTimeout(r, 600));
        if (window.__fail) return { error: { message: 'Network error', status: 500 } };
        const last = window.__sentAt[email];
        if (last && Date.now() - last < 60000) return { error: { message: 'For security purposes, you can only request this after 51 seconds.', status: 429, code: 'over_email_send_rate_limit' } };
        window.__sentAt[email] = Date.now(); return { error: null };
      },
      signInWithOAuth: async () => ({ error: null }),
    } };
} };`;

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  if (OUT) fs.mkdirSync(OUT, { recursive: true });
  for (const [lang, theme, width] of [['pt-BR', 'light', 390], ['pt-BR', 'dark', 1200], ['en', 'light', 1200]]){
    const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width, height: 860 }, colorScheme: theme, locale: lang });
    const page = await ctx.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
    await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
    await page.addInitScript(([lg, th]) => { try { localStorage.setItem('ui-language', lg); localStorage.setItem('theme', th); } catch (e) {} }, [lang, theme]);
    await page.goto(`http://127.0.0.1:${port}/index.html`);
    await page.waitForSelector('#gate-login', { state: 'visible' });
    const L = (n, c, x) => check(`${lang}-${theme}-${width} ${n}`, c, x);
    const T = lang === 'en' ? { ask: 'Forgot your password?', send: 'Send link', sending: 'Sending...', title: 'Link on its way!', back: 'Back to sign in', resendIn: /Resend link in \d+ s/, sub: 'Open the email and tap Create new password.', stamp: 'Sent now' }
                            : { ask: 'Esqueceu a senha?', send: 'Enviar link', sending: 'Enviando...', title: 'Link a caminho!', back: 'Voltar para entrar', resendIn: /Reenviar link em \d+ s/, sub: 'Abra o e-mail e toque em Criar nova senha.', stamp: 'Enviado agora' };
    // "Esqueceu sua senha?" abre a tela só com o e-mail (pedido da dona, 2026-11-16), já preenchido com o do login
    await page.fill('#gate-email', 'aluna@x.com');
    await page.click('#gate-forgot-btn');
    await page.waitForSelector('#gate-forgot', { state: 'visible' });
    L('abre a tela própria, só com o e-mail, sem campo de senha', !(await page.isVisible('#gate-login')) && !(await page.$('#gate-forgot input[type=password]')) && (await page.inputValue('#gate-forgot-email')) === 'aluna@x.com');
    L('título e botão no idioma do site', (await page.textContent('#gate-forgot h1')).trim() === T.ask && (await page.textContent('#gate-forgot-send-btn')).trim() === T.send);
    L('nada enviado só por abrir a tela', await page.evaluate(() => window.__calls.length === 0));
    if (OUT) await page.screenshot({ path: path.join(OUT, `esqueci-pedido-${lang}-${theme}-${width}.png`) });
    // e-mail vazio: aviso, sem envio
    await page.fill('#gate-forgot-email', ''); await page.click('#gate-forgot-send-btn');
    L('sem e-mail: avisa e não envia', await page.evaluate(() => window.__calls.length === 0 && document.getElementById('gate-forgot-note').classList.contains('err')));
    await page.fill('#gate-forgot-email', 'aluna@x.com');
    await page.click('#gate-forgot-send-btn');
    L('enquanto envia: botão travado com "' + T.sending + '"', await page.evaluate(s => { const b = document.getElementById('gate-forgot-send-btn'); return b.disabled && b.textContent === s; }, T.sending));
    await page.evaluate(() => document.getElementById('gate-forgot-send-btn').click()); // clique repetido no meio do envio
    await page.waitForSelector('#gate-forgot-sent', { state: 'visible' });
    L('clique repetido durante o envio não manda outro pedido', await page.evaluate(() => window.__calls.length === 1), await page.evaluate(() => window.__calls));
    L('tela "' + T.title + '" com o e-mail', (await page.textContent('#gate-forgot-sent h1')).trim() === T.title && (await page.textContent('#gate-forgot-sent-email')) === 'aluna@x.com' && (await page.textContent('#gate-forgot-sent .fp-texto')).startsWith(T.sub));
    L('carta: carimbo no idioma do site, que cai uma vez, e o envelope sem rolagem lateral', (await page.textContent('#gate-forgot-carimbo')).trim() === T.stamp && await page.evaluate(() => document.getElementById('gate-forgot-carimbo').classList.contains('cai')));
    L('ícone do passo 1 é o envelope simples do Fluent (sem @)', await page.evaluate(() => { const e = document.querySelector('#gate-forgot .jp-icone .emo'); return !!e && /fluent\/2709\.svg/.test(getComputedStyle(e).getPropertyValue('--emo') + e.getAttribute('style')); }));
    L('sem mensagem de erro na tela', await page.evaluate(() => !document.querySelector('#gate-forgot-sent .gate-note.err')));
    L('reenviar travado com contagem', await page.evaluate(re => { const b = document.getElementById('gate-forgot-resend-btn'); return b.disabled && new RegExp(re).test(b.textContent); }, T.resendIn.source));
    L('sem rolagem lateral', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
    if (OUT) await page.screenshot({ path: path.join(OUT, `esqueci-${lang}-${theme}-${width}.png`) });
    // voltar e pedir de novo antes de 60 s: o Supabase recusa (429), mas a pessoa vai para a tela, sem erro, com a espera certa
    await page.click('#gate-forgot-back-btn');
    await page.waitForSelector('#gate-login', { state: 'visible' });
    L('"' + T.back + '" volta para o login', (await page.isVisible('#gate-login')) && !(await page.isVisible('#gate-forgot-sent')));
    L('volta ao login com o e-mail preenchido', (await page.inputValue('#gate-email')) === 'aluna@x.com');
    await page.click('#gate-forgot-btn'); await page.waitForSelector('#gate-forgot', { state: 'visible' });
    await page.click('#gate-forgot-send-btn');
    await page.waitForSelector('#gate-forgot-sent', { state: 'visible' });
    L('pedido recusado por pressa (429) também mostra a tela, sem erro', await page.evaluate(() => !document.querySelector('#gate-forgot-sent .gate-note.err') && !document.getElementById('gate-login-note').classList.contains('err')));
    L('contagem usa a espera que o Supabase mandou (51 s)', await page.evaluate(() => / (5[01]) s/.test(document.getElementById('gate-forgot-resend-btn').textContent)), await page.textContent('#gate-forgot-resend-btn'));
    // erro de verdade (sem rede): continua no login, com o aviso de erro
    await page.click('#gate-forgot-back-btn'); await page.waitForSelector('#gate-login', { state: 'visible' });
    await page.evaluate(() => { window.__fail = true; });
    await page.click('#gate-forgot-btn'); await page.waitForSelector('#gate-forgot', { state: 'visible' });
    await page.fill('#gate-forgot-email', 'outra@x.com'); await page.click('#gate-forgot-send-btn');
    await page.waitForFunction(() => !document.getElementById('gate-forgot-send-btn').disabled);
    L('erro de verdade: fica na tela do e-mail com o aviso e o botão volta', (await page.isVisible('#gate-forgot')) && await page.evaluate(() => document.getElementById('gate-forgot-note').classList.contains('err')));
    await page.click('#gate-forgot-cancel'); await page.waitForSelector('#gate-login', { state: 'visible' });
    L('"Voltar" da tela do e-mail leva ao login', await page.isVisible('#gate-login'));
    L('zero pageerror', errors.length === 0, errors);
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(`esqueci a senha: ${passed}/${passed + failed} checks`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

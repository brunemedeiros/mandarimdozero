// Excluir a própria conta (Configurações > Geral): botão só para aluna, janela com confirmação do e-mail, chamada da função e erros.
// Rodar: node tests/conta-excluir/test_playwright.js
const { chromium } = require(require.resolve('playwright', { paths: ['/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '../..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
const STUB = `(function(){const empty=new Proxy({},{get(_,p){if(p==='then')return(ok)=>Promise.resolve({data:[],error:null}).then(ok);return()=>empty}});
 const client={auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>{window.__signedOut=true;return{}}},from:()=>empty,channel:()=>({on(){return this},subscribe(){return this}}),storage:{from:()=>({})},functions:{invoke:async()=>({data:null,error:null})},rpc:async()=>({data:null,error:null})};
 window.supabase={createClient:()=>client}})();`;
let ok = 0, total = 0;
const L = (name, cond, extra) => { total++; if (cond) ok++; else console.log('  FALHOU:', name, extra === undefined ? '' : JSON.stringify(extra)); };
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); const port = server.address().port;
  const browser = await chromium.launch();
  for (const site of ['fr', 'zh']) {
    const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 430, height: 900 } });
    const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
    await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
    await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
    await page.goto(`http://127.0.0.1:${port}/${site}/index.html`);
    await page.waitForFunction(() => typeof renderSettingsView === 'function' && typeof refreshDeleteAccountBox === 'function', null, { timeout: 25000 });
    const T = `[${site}] `;
    const st = async (user, teacher) => page.evaluate(([u, te]) => {
      CURRENT_USER = u; window.isTeacherUser = () => te; window.isAdminUser = () => false; renderSettingsView();
      return document.getElementById('settings-delete-box').hidden;
    }, [user, teacher]);
    L(T + 'aluna logada vê o botão de excluir conta', (await st({ id: 'u1', email: 'ana@x.com', app_metadata: {} }, false)) === false);
    L(T + 'professora não vê o botão', (await st({ id: 't1', email: 'prof@x.com', app_metadata: {} }, true)) === true);
    L(T + 'sem login não vê o botão', (await page.evaluate(() => { CURRENT_USER = null; renderSettingsView(); return document.getElementById('settings-delete-box').hidden; })) === true);
    await st({ id: 'u1', email: 'ana@x.com', app_metadata: {} }, false);
    await page.evaluate(() => { document.getElementById('view-settings').classList.add('active'); document.getElementById('settings-geral-content').style.display = ''; });
    await page.click('#delete-account-open');
    L(T + 'janela abre com o botão de confirmar desligado', await page.evaluate(() => document.getElementById('delete-account-modal').style.display === 'flex' && document.getElementById('delete-account-yes').disabled));
    await page.fill('#delete-account-input', 'outra@x.com');
    L(T + 'e-mail errado mantém o botão desligado', await page.evaluate(() => document.getElementById('delete-account-yes').disabled));
    await page.fill('#delete-account-input', 'ANA@x.com ');
    L(T + 'e-mail certo (sem diferenciar maiúscula) liga o botão', await page.evaluate(() => !document.getElementById('delete-account-yes').disabled));
    await page.evaluate(() => { window.__calls = []; supabaseClient.functions.invoke = async (n, o) => { window.__calls.push([n, o]); return { data: { ok: false, error: 'not_allowed_for_teachers' }, error: null }; }; });
    await page.click('#delete-account-yes');
    await page.waitForFunction(() => document.getElementById('delete-account-error').textContent.length > 0);
    L(T + 'chama delete-my-account com o e-mail digitado', await page.evaluate(() => window.__calls.length === 1 && window.__calls[0][0] === 'delete-my-account' && window.__calls[0][1].body.confirm_email === 'ANA@x.com'));
    L(T + 'erro de professora aparece na janela e a janela continua aberta', await page.evaluate(() => /professora/i.test(document.getElementById('delete-account-error').textContent) && document.getElementById('delete-account-modal').style.display === 'flex'));
    await page.evaluate(() => { supabaseClient.functions.invoke = async () => ({ data: { ok: true }, error: null }); window.__reloaded = false; });
    await page.click('#delete-account-yes');
    await page.waitForFunction(() => window.__signedOut === true, null, { timeout: 5000 });
    L(T + 'sucesso: fecha a janela e sai da conta', await page.evaluate(() => document.getElementById('delete-account-modal').style.display === 'none' && window.__signedOut === true));
    await page.screenshot({ path: path.join('/tmp', `conta-excluir-${site}.png`) });
    L(T + 'sem erros de página', errs.length === 0, errs.slice(0, 2));
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(`conta excluir (navegador): ${ok}/${total} verificações — ${ok === total ? 'OK' : (total - ok) + ' FALHAS'}`);
  if (ok !== total) process.exit(1);
})();

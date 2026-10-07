// Progresso por palavra no navegador real (FR + ZH, convidado): trocar o idioma
// do site troca o histórico junto com a palavra (país do aluno; hanzi 巴/美).
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
const STUB = `(function(){const b=new Proxy({}, {get(_,p){ if(p==='then') return (ok)=>Promise.resolve({data:[],error:null}).then(ok); return ()=>b; }});
window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>({})},from:()=>b,rpc:async()=>({data:null,error:null}),channel:()=>({on(){return this},subscribe(){return this}}),storage:{from:()=>({upload:async()=>({}),getPublicUrl:()=>({data:{publicUrl:''}}),remove:async()=>({})})},functions:{invoke:async()=>({data:null,error:null})}})};})();`;
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x).slice(0, 300) : ''); } };


async function first(browser, port, lang){
  const mk = async (locale) => {
    const ctx = await browser.newContext({ serviceWorkers: 'block', locale });
    const page = await ctx.newPage(); const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
    await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
    await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
    await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
    await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 20000 });
    return { ctx, page, errors };
  };
  const arm = (page, isNew) => page.evaluate((isNew) => { CURRENT_USER = { id: 'u1' }; progressLoadedOk = true; progressAccountIsNew = isNew; progressAccountUiLanguage = null; pendingAccountUiLanguage = null; askUiLanguageOnFirstAccess(); return document.getElementById('ui-language-first-modal').style.display; }, isNew);
  // navegador em inglês: sugere English
  let { ctx, page, errors } = await mk('en-US');
  check(`${lang}: conta nova abre a pergunta`, (await arm(page, true)) === 'flex');
  check(`${lang}: navegador em inglês sugere English`, await page.evaluate(() => document.getElementById('ui-language-first-en').classList.contains('btn-primary') && !document.getElementById('ui-language-first-pt').classList.contains('btn-primary')));
  await page.click('#ui-language-first-en');
  await page.waitForFunction(() => getUiLang() === 'en', null, { timeout: 10000 });
  check(`${lang}: escolher English troca e fecha`, await page.evaluate(() => document.getElementById('ui-language-first-modal').style.display === 'none' && localStorage.getItem('ui-language') === 'en'));
  check(`${lang}: a escolha vai para a conta`, await page.evaluate(() => progressAccountUiLanguage === 'en' || pendingAccountUiLanguage === 'en'));
  check(`${lang}: nunca pergunta de novo neste navegador`, (await arm(page, true)) === 'none');
  check(`${lang}: sem erro de página (en)`, errors.length === 0, errors);
  await ctx.close();
  // navegador em português; conta que já tem progresso não pergunta
  ({ ctx, page, errors } = await mk('pt-BR'));
  check(`${lang}: conta com progresso não pergunta`, (await arm(page, false)) === 'none');
  check(`${lang}: conta nova, navegador pt sugere Português`, (await arm(page, true)) === 'flex' && await page.evaluate(() => document.getElementById('ui-language-first-pt').classList.contains('btn-primary')));
  await page.click('#ui-language-first-pt');
  check(`${lang}: escolher Português continua em português`, await page.evaluate(() => getUiLang()) === 'pt-BR');
  await ctx.close();
  // idioma já salvo na conta: não pergunta
  ({ ctx, page, errors } = await mk('en-US'));
  check(`${lang}: idioma já salvo na conta não pergunta`, await page.evaluate(() => { CURRENT_USER = { id: 'u1' }; progressLoadedOk = true; progressAccountIsNew = true; progressAccountUiLanguage = 'pt-BR'; askUiLanguageOnFirstAccess(); return document.getElementById('ui-language-first-modal').style.display; }) === 'none');
  await ctx.close();
}
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  await first(browser, port, 'fr'); await first(browser, port, 'zh');
  await browser.close(); server.close();
  console.log(`${passed} ok, ${failed} falhas`);
  process.exit(failed ? 1 : 0);
})();

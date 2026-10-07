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


async function modal(browser, port, lang){
  const ctx = await browser.newContext({ serviceWorkers: 'block' });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
  await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 20000 });
  const vis = () => page.evaluate(() => document.getElementById('ui-language-confirm-modal').style.display);
  const body = () => page.evaluate(() => document.getElementById('ui-language-confirm-body').textContent);
  const sel = (v) => page.evaluate((v) => { const s = document.getElementById('ui-language-select'); s.value = v; s.dispatchEvent(new Event('change')); }, v);
  await sel('en');
  check(`${lang}: aviso abre em português`, (await vis()) === 'flex' && /inglês.*progresso continua salvo/.test(await body()), await body());
  check(`${lang}: nada trocou antes de confirmar`, await page.evaluate(() => getUiLang()) === 'pt-BR');
  await page.click('#ui-language-confirm-no');
  check(`${lang}: cancelar fecha e devolve o seletor`, (await vis()) === 'none' && await page.evaluate(() => document.getElementById('ui-language-select').value) === 'pt-BR' && await page.evaluate(() => getUiLang()) === 'pt-BR');
  await sel('en'); await page.click('#ui-language-confirm-close');
  check(`${lang}: X também cancela`, await page.evaluate(() => getUiLang()) === 'pt-BR' && (await vis()) === 'none');
  await sel('en'); await page.click('#ui-language-confirm-yes');
  await page.waitForFunction(() => getUiLang() === 'en', null, { timeout: 10000 });
  check(`${lang}: confirmar troca para inglês`, (await vis()) === 'none');
  await sel('pt-BR');
  check(`${lang}: aviso de volta já em inglês`, /Portuguese.*progress stays saved/.test(await body()), await body());
  await page.click('#ui-language-confirm-yes');
  await page.waitForFunction(() => getUiLang() === 'pt-BR', null, { timeout: 10000 });
  check(`${lang}: volta ao português`, true);
  check(`${lang}: sem erro de página`, errors.length === 0, errors);
  await ctx.close();
}
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  await modal(browser, port, 'fr'); await modal(browser, port, 'zh');
  await browser.close(); server.close();
  console.log(`${passed} ok, ${failed} falhas`);
  process.exit(failed ? 1 : 0);
})();

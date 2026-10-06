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

async function run(browser, port, lang, cardId, textOf, ptWord, enWord, hanziId){
  const ctx = await browser.newContext({ serviceWorkers: 'block' });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
  await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 20000 });
  const word = (id, fnSrc) => page.evaluate(([id, fnSrc]) => { const c = STATE.cards.find(x => x.id === id); return c && new Function('c', fnSrc)(c); }, [id, fnSrc]);
  check(`${lang}: palavra em português`, (await word(cardId, textOf)) === ptWord, await word(cardId, textOf));
  // estuda a palavra em português
  await page.evaluate((id) => { const c = STATE.cards.find(x => x.id === id); c.reps = 4; c.due = 12345; c.state = 'review'; c.stability = 7; c.fsrsMigrated = true; }, cardId);
  await page.evaluate(() => setUiLang('en'));
  await page.waitForFunction(([id, fnSrc, en]) => { const c = STATE.cards.find(x => x.id === id); return c && new Function('c', fnSrc)(c) === en; }, [cardId, textOf, enWord], { timeout: 15000 });
  let c = await page.evaluate((id) => { const c = STATE.cards.find(x => x.id === id); return { reps: c.reps, due: c.due, state: c.state, id: c.id }; }, cardId);
  check(`${lang}: no inglês a palavra nova começa do zero`, c.reps === 0 && c.due === 0 && c.state === 'new' && c.id === cardId, c);
  await page.evaluate((id) => { const c = STATE.cards.find(x => x.id === id); c.reps = 2; c.due = 999; c.state = 'learning'; }, cardId);
  // salvar e reler o estado (como num reload)
  const saved = await page.evaluate(() => JSON.parse(JSON.stringify(serializeState())));
  check(`${lang}: save carrega a gaveta com o histórico do português`, saved.cardVariants && saved.cardVariants[cardId] && saved.cardVariants[cardId][ptWord] && saved.cardVariants[cardId][ptWord].reps === 4, saved.cardVariants);
  await page.evaluate(() => setUiLang('pt-BR'));
  await page.waitForFunction(([id, fnSrc, pt]) => { const c = STATE.cards.find(x => x.id === id); return c && new Function('c', fnSrc)(c) === pt; }, [cardId, textOf, ptWord], { timeout: 15000 });
  c = await page.evaluate((id) => { const c = STATE.cards.find(x => x.id === id); return { reps: c.reps, due: c.due, state: c.state }; }, cardId);
  check(`${lang}: voltar ao português restaura o histórico em português`, c.reps === 4 && c.due === 12345 && c.state === 'review', c);
  // simula "recarregar" depois de salvar no inglês: save antigo com a palavra em inglês, site em português
  await page.evaluate((s) => { STATE.cardVariants = {}; applySerializedState(s); }, saved);
  c = await page.evaluate((id) => { const c = STATE.cards.find(x => x.id === id); return { reps: c.reps, state: c.state }; }, cardId);
  check(`${lang}: carregar save salvo em inglês com o site em português troca certo`, c.reps === 4 && c.state === 'review', c);
  // cartões que não trocam de palavra continuam intactos
  const other = await page.evaluate((id) => { const c = STATE.cards.find(x => x.id !== id && x.unitId); c.reps = 9; return c.id; }, cardId);
  await page.evaluate(() => setUiLang('en')); await page.waitForTimeout(800); await page.evaluate(() => setUiLang('pt-BR')); await page.waitForTimeout(800);
  check(`${lang}: outro cartão não é afetado`, await page.evaluate((id) => STATE.cards.find(x => x.id === id).reps === 9, other));
  if (hanziId){
    await page.evaluate((id) => { const c = STATE.hanziCards.find(x => x.id === id); c.reps = 3; c.state = 'review'; }, hanziId);
    await page.evaluate(() => setUiLang('en'));
    await page.waitForFunction((id) => STATE.hanziCards.find(x => x.id === id).char === '美', hanziId, { timeout: 15000 });
    check(`${lang}: hanzi 美 começa do zero`, await page.evaluate((id) => { const c = STATE.hanziCards.find(x => x.id === id); return c.reps === 0 && c.state === 'new'; }, hanziId));
    await page.evaluate(() => setUiLang('pt-BR'));
    await page.waitForFunction((id) => STATE.hanziCards.find(x => x.id === id).char === '巴', hanziId, { timeout: 15000 });
    check(`${lang}: hanzi 巴 volta com o histórico`, await page.evaluate((id) => { const c = STATE.hanziCards.find(x => x.id === id); return c.reps === 3 && c.state === 'review'; }, hanziId));
  }
  check(`${lang}: sem erro de página`, errors.length === 0, errors);
  await ctx.close();
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const hz = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/i18n/content-zh-en/_hanzi.json'), 'utf8'));
  // acha o cartão 巴 por posição (id h<lição>-c<índice>)
  const sandbox = { window: {} }; require('vm').createContext(sandbox);
  require('vm').runInContext(fs.readFileSync(path.join(ROOT, 'zh/hanzi-data.js'), 'utf8') + ';this.H=HANZI_LESSONS;', sandbox);
  let hid = null; sandbox.H.forEach((l, i) => l.forEach((h, j) => { if (h.char === '巴') hid = `h${i}-c${j}`; }));
  await run(browser, port, 'fr', 'uA1-2-v8', 'return c.front', 'brésilien / brésilienne', 'américain / américaine');
  await run(browser, port, 'zh', 'u2-v6', 'return c.back_hanzi', '巴西', '美国', hid);
  await browser.close(); server.close();
  console.log(`${passed} ok, ${failed} falhas`);
  process.exit(failed ? 1 : 0);
})();

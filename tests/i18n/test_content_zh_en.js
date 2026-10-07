// Fase 10 -- conteúdo do mandarim em inglês (Chromium real).
// Rodar: node tests/i18n/test_content_zh_en.js
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
const STUB = `(function(){const b=()=>new Proxy({}, {get(_,p){if(p==='then')return (ok)=>Promise.resolve({data:[],error:null}).then(ok);return ()=>b();}});
const c={auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>({})},from:()=>b(),rpc:async()=>({data:null,error:null}),channel:()=>({on(){return this;},subscribe(){return this;}}),storage:{from:()=>({upload:async()=>({}),getPublicUrl:()=>({data:{publicUrl:''}}),remove:async()=>({})})},functions:{invoke:async()=>({data:null,error:null})}};
window.supabase={createClient:()=>c};})();`;
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x).slice(0, 300) : ''); } };
async function boot(browser, port, query){
  const ctx = await browser.newContext({ serviceWorkers: 'block' });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
  await page.goto(`http://127.0.0.1:${port}/zh/index.html${query}`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 20000 });
  return { ctx, page, errors };
}
const snap = (page) => page.evaluate(() => JSON.stringify([UNITS, LEVELS, STORIES, HANZI_LESSONS]));
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); const port = server.address().port;
  const browser = await chromium.launch();
  const pt = await boot(browser, port, '');
  const ptSnap = await snap(pt.page);
  check('pt-BR: unidade 1 original', await pt.page.evaluate(() => UNITS[0].title) === 'Cumprimentar e se despedir');
  check('pt-BR: sem erros', pt.errors.length === 0, pt.errors);
  const en = await boot(browser, port, '?ui=en');
  await en.page.waitForFunction(() => UNITS[0].title !== 'Cumprimentar e se despedir', null, { timeout: 8000 });
  const r = await en.page.evaluate(() => ({
    t1: UNITS[0].title, v0: UNITS[0].vocab[0], lv: LEVELS[0].label, ph: UNITS[0].phrases[0].t, dl: UNITS[0].dialogue.lines[0],
    ex: UNITS[0].concepts[0].blocks[0].examples[0], body: UNITS[0].concepts[0].blocks[0].body, st: STORIES[0].title, sl: STORIES[0].beats[0].lines[0], sq: STORIES[0].beats[0].question,
    h0: HANZI_LESSONS[0][0], h1: HANZI_LESSONS[0][1], card: STATE.cards.find(c => c.id === 'u1-v0'), hc: STATE.hanziCards[1], untr: UNITS.filter(u => !CONTENT_I18N.isUnitTranslated(u.id)).map(u => u.id) }));
  check('en: título/nível', r.t1 !== 'Cumprimentar e se despedir' && /Beginner/.test(r.lv), [r.t1, r.lv]);
  check('en: chinês e pinyin intactos', r.v0.c === '你好' && r.v0.p === 'nǐ hǎo' && /hello|hi/i.test(r.v0.t), r.v0);
  check('en: frase/diálogo/exemplo traduzidos, c/p intactos', /[A-Za-z]/.test(r.ph) && r.dl.c && /[A-Za-z]/.test(r.dl.t) && r.ex.c && /[A-Za-z]/.test(r.ex.t), r);
  check('en: HTML do conceito preservado', /<strong>/.test(r.body));
  check('en: história traduzida, pergunta com 4 opções e índice correto intacto', r.st === "Xiao Li's Family" || /[A-Za-z]/.test(r.st), r.st);
  check('en: pergunta/opções', r.sq.options.length === 4 && typeof r.sq.correctIndex === 'number' && /[A-Za-z]/.test(r.sq.prompt));
  check('en: hanzi traduzido, caractere/pinyin intactos', r.h1.char === '好' && r.h1.pinyin === 'hǎo' && /good/i.test(r.h1.meaning) && /[A-Za-z]/.test(r.h1.mnemonic), r.h1);
  check('en: cartões (vocab e hanzi) com texto em inglês, FSRS intacto', /hello|hi/i.test(r.card.back_trans) && r.card.state === 'new' && /good/i.test(r.hc.meaning) && r.hc.radicals[0].m !== '', [r.card.back_trans, r.hc.meaning]);
  check('en: todas as 18 unidades têm overlay', r.untr.length === 0, r.untr);
  await en.page.evaluate(() => openUnitDetail(1));
  check('en: tela da unidade em inglês, sem aviso', await en.page.evaluate(() => document.getElementById('ud-title').textContent !== 'Cumprimentar e se despedir' && document.getElementById('ud-lang-notice').hidden));
  await en.page.evaluate(() => { delete window.CONTENT_OVERLAYS.en.units[2]; CONTENT_I18N.apply('en'); openUnitDetail(2); });
  const n2 = await en.page.evaluate(() => { const e = document.getElementById('ud-lang-notice'); return { hidden: e.hidden, text: e.textContent }; });
  check('en: unidade sem tradução cai em português com aviso', !n2.hidden && /isn't available in English yet/.test(n2.text), n2);
  // persistência: texto salvo em português/inglês não volta por cima
  const saved = await en.page.evaluate(() => { CONTENT_I18N.apply('en'); const c = STATE.cards.find(x => x.id === 'u1-v0'); const data = JSON.parse(JSON.stringify(serializeState())); data.cards.find(x => x.id === 'u1-v0').back_trans = 'TEXTO ANTIGO SALVO'; applySerializedState(data); return STATE.cards.find(x => x.id === 'u1-v0').back_trans; });
  check('progresso carregado não sobrescreve o idioma atual', saved !== 'TEXTO ANTIGO SALVO' && /hello|hi/i.test(saved), saved);
  await en.page.evaluate(() => setUiLang('pt-BR'));
  await en.page.waitForFunction(() => UNITS[0].title === 'Cumprimentar e se despedir', null, { timeout: 8000 });
  check('volta pt-BR restaura unidades, níveis, histórias e hanzi byte a byte', await snap(en.page) === ptSnap);
  check('en: sem erros', en.errors.length === 0, en.errors);
  await browser.close(); server.close();
  console.log(`${passed} ok, ${failed} falhas`); process.exit(failed ? 1 : 0);
})();

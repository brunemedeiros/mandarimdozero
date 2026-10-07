// Fase 8 -- conteúdo do francês em inglês (Chromium real). A1-1 traduzida,
// A1-2 sem tradução (cai em português + aviso). Português idêntico ao original.
// Rodar: node tests/i18n/test_content_en.js
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
async function boot(browser, port, query, SITE = 'fr'){
  const ctx = await browser.newContext({ serviceWorkers: 'block' });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
  await page.goto(`http://127.0.0.1:${port}/${SITE}/index.html${query}`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 20000 });
  return { ctx, page, errors };
}
const snap = (page, id) => page.evaluate((uid) => { const u = UNITS.find(x => x.id === uid); return JSON.stringify(u); }, id);
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); const port = server.address().port;
  const browser = await chromium.launch();
  // pt-BR: nada muda em relação ao content.js original
  const pt = await boot(browser, port, '');
  const ptA11 = await snap(pt.page, 'A1-1'), ptA12 = await snap(pt.page, 'A1-2');
  const orig = await pt.page.evaluate(async () => { const t = await (await fetch('content.js')).text(); return t.length; });
  check('pt-BR: título A1-1 original', JSON.parse(ptA11).title === 'Cumprimentar e se despedir');
  check('pt-BR: cartão da trilha em português', await pt.page.evaluate(() => STATE.cards.find(c => c.id === 'uA1-1-v0').back_trans) === 'olá / bom dia');
  check('pt-BR: sem erros', pt.errors.length === 0, pt.errors);
  // en
  const en = await boot(browser, port, '?ui=en');
  await en.page.waitForFunction(() => UNITS[0].title !== 'Cumprimentar e se despedir', null, { timeout: 8000 });
  const u1 = JSON.parse(await snap(en.page, 'A1-1'));
  check('en: título', u1.title === 'Greeting and saying goodbye', u1.title);
  check('en: vocab traduzido', u1.vocab[0].t === 'hi, hello / good morning' && u1.vocab[0].f === 'bonjour');
  check('en: francês intacto', u1.phrases[0].f === 'Bonjour ! Je m\'appelle Guest.' && u1.dialogue.lines[0].f === 'Bonjour !');
  check('en: frase/cenário', u1.phrases[0].t === 'Hello! My name is Guest.' && /^You meet someone new/.test(u1.phrases[0].scenario));
  check('en: diálogo', u1.dialogue.title === 'Meeting on the street' && u1.dialogue.lines[1].t === 'Hello! How are you?');
  check('en: conceito com HTML', /<strong>bonjour<\/strong>/.test(u1.concepts[0].blocks[0].body) && u1.concepts[0].blocks[0].title === '"Bonjour" or "Bonsoir"?');
  check('en: verdadeiro/falso', /^This is what we say/.test(u1.trueFalseExercises[0].claim));
  check('en: lições', u1.lessons[0].title === 'Saying hello and goodbye');
  const u2 = JSON.parse(await snap(en.page, 'A1-2'));
  check('en: A1-2 traduzida', u2.title !== JSON.parse(ptA12).title);
  check('en: módulo/nível', await en.page.evaluate(() => MODULES[0].title + '|' + LEVELS[0].label) === 'First contacts|Level 1 · Débutant');
  check('en: cartão da trilha traduzido, id/FSRS intactos', await en.page.evaluate(() => { const c = STATE.cards.find(x => x.id === 'uA1-1-v0'); return c.back_trans === 'hi, hello / good morning' && c.state === 'new' && c.reps === 0; }));
  check('en: A1-1 e A1-5 traduzidas', await en.page.evaluate(() => [CONTENT_I18N.isUnitTranslated('A1-1'), CONTENT_I18N.isUnitTranslated('A1-5')].join()) === 'true,true');
  const allT = await en.page.evaluate(() => UNITS.filter(u => !CONTENT_I18N.isUnitTranslated(u.id)).map(u => u.id));
  check('en: todas as 30 unidades do A1 com overlay', allT.length === 0, allT);
  const g = await en.page.evaluate(() => { const u = UNITS.find(x => x.id === 'A1-g2'); const tb = u.grammar.blocks.find(b => b.table).table; return { keys: Object.keys(tb), forms: Object.values(tb)[0].map(r => r.form), ans: u.grammar.exercises.map(x => x.answer), hint: u.grammar.exercises[0].hint, prompt: u.grammar.exercises[0].prompt, title: u.title }; });
  check('en: gramática traduzida, formas e respostas francesas intactas', g.forms.join() === 'mon,ton,son,notre,votre,leur' && g.ans[0] === 'mon' && g.prompt === "C'est ___ frère." && /my/i.test(g.hint) && g.title !== 'Adjetivos possessivos', g);
  const gp = await en.page.evaluate(() => { openUnitDetail('A1-g2'); return document.getElementById('ud-title').textContent; });
  check('en: título da gramática na tela', gp === g.title, gp);
  await en.page.evaluate(() => exitToPath());
  // simula unidade ainda sem tradução
  await en.page.evaluate(() => { delete window.CONTENT_OVERLAYS.en.units['A1-5']; CONTENT_I18N.apply('en'); });
  const all = await en.page.evaluate(() => { const bad = []; UNITS.filter(u => u.type !== 'grammar').forEach(u => { if (!CONTENT_I18N.isUnitTranslated(u.id)) bad.push(u.id + ':sem overlay'); }); return bad; });
  check('en: só a unidade removida fica sem overlay', all.join() === 'A1-5:sem overlay', all);
  const same = await en.page.evaluate(() => { const bad = []; UNITS.filter(u => u.type !== 'grammar').forEach(u => u.vocab.forEach((v, i) => { if (/[ãõçáéíóúâêô]/i.test(v.t) && !/^[\x00-\x7F]*$/.test(v.t)) bad.push(u.id + ':v' + i + ':' + v.t); })); return bad; });
  check('en: vocabulário sem acentos do português (fora A1-5)', same.filter(x => !x.startsWith('A1-5')).length === 0, same.slice(0, 5));
  await en.page.evaluate(() => openUnitDetail('A1-5'));
  const n2 = await en.page.evaluate(() => { const e = document.getElementById('ud-lang-notice'); return { hidden: e.hidden, text: e.textContent, disp: getComputedStyle(e).display }; });
  check('en: aviso visível em unidade de gramática', !n2.hidden && n2.text === "This lesson isn't available in English yet. Showing Portuguese." && n2.disp !== 'none', n2);
  await en.page.evaluate(() => exitToPath());
  await en.page.evaluate(() => openUnitDetail('A1-1'));
  check('en: sem aviso em A1-1', await en.page.evaluate(() => document.getElementById('ud-lang-notice').hidden));
  check('en: título na tela', await en.page.evaluate(() => document.getElementById('ud-title').textContent) === 'Greeting and saying goodbye');
  // Fase 9: desafios e ditados no idioma do site
  await en.page.waitForFunction(() => window.CHALLENGES_I18N && window.CHALLENGES_I18N.en, null, { timeout: 8000 });
  const ph9 = await en.page.evaluate(() => {
    const c = { id: 'lt-auto-001', referenceTranslations: ['Comprei um livro novo ontem e já terminei.'], explanation: '' };
    const s = listenTranslateSetup(c);
    const nov = listenTranslateSetup({ id: 'nao-existe-xyz', referenceTranslations: ['Olá'] });
    return { lang: s.lang, refs: s.refs.length, ok: s.cmp.isAcceptable('I bought a new book yesterday and I already finished it.', s.refs), bad: s.cmp.isAcceptable('Comprei um livro novo ontem', s.refs),
      mis: !!s.cmp.personMismatch('I is tired'), fbLang: nov.lang, fbOk: nov.cmp.isAcceptable('Olá', nov.refs),
      task: dictationTask(DICTATIONS[0]), audio: dictationAudioPath(DICTATIONS[0]) };
  });
  check('en: Ouça e traduza compara em inglês', ph9.lang === 'en' && ph9.refs >= 2 && ph9.ok && !ph9.bad && ph9.mis, ph9);
  check('en: desafio sem tradução cai em português', ph9.fbLang === 'pt-BR' && ph9.fbOk, ph9);
  check('en: título do ditado em inglês e áudio ainda o de sempre', ph9.task === 'Introducing yourself in class' && ph9.audio === 'audio/dictation-d1-guided.mp3', ph9);
  // volta para pt-BR em tempo de execução: restaura byte a byte
  await en.page.evaluate(() => setUiLang('pt-BR'));
  await en.page.waitForFunction(() => UNITS[0].title === 'Cumprimentar e se despedir', null, { timeout: 8000 });
  check('volta pt-BR restaura A1-1 idêntico', await snap(en.page, 'A1-1') === ptA11);
  check('volta pt-BR: ditado e comparador em português', await en.page.evaluate(() => dictationTask(DICTATIONS[0]) === 'Se apresentando em sala de aula' && listenTranslateSetup({ id: 'lt-auto-001', referenceTranslations: ['x'] }).lang === 'pt-BR'));
  check('volta pt-BR restaura cartão', await en.page.evaluate(() => STATE.cards.find(c => c.id === 'uA1-1-v0').back_trans) === 'olá / bom dia');
  check('en: sem erros', en.errors.length === 0, en.errors);
  await browser.close(); server.close();
  console.log(`${passed} ok, ${failed} falhas`); process.exit(failed ? 1 : 0);
})();

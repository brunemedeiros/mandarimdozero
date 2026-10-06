// K2-F -- Playwright (Chromium real), FR + ZH, modo convidado com o
// Supabase do CDN substituído por um stub em memória (o proxy do sandbox
// bloqueia o CDN). "Autenticado" é simulado setando CURRENT_USER após o
// boot (o stub de rpc/select respeita o mesmo contrato da migration 051/052).
// Rodar: node tests/fase-e/test_playwright.js   (usa o playwright global)
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const NM = process.env.K2F_NM || '/tmp/claude-0/k2f/node_modules';
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});

const STUB = `
(function(){
  window.__DB = { decks: [] };
  window.__rpcCalls = [];
  window.__AUTH = false; // muda pra true = "conta autenticada" no stub
  function builder(table){
    const st = { table, filters: [] };
    const b = new Proxy({}, { get(_, prop){
      if (prop === 'then') return (ok) => {
        let data = [];
        if (table === 'decks'){
          data = window.__DB.decks.filter(d => st.filters.every(([k, v]) => d[k] === v));
          // RLS simulada: convidado/autenticado só veem kind=course (decks_course_select)
          data = data.filter(d => d.kind === 'course');
        }
        return Promise.resolve({ data, error: null }).then(ok);
      };
      if (prop === 'eq') return (k, v) => { st.filters.push([k, v]); return b; };
      if (prop === 'single' || prop === 'maybeSingle') return () => Promise.resolve({ data: null, error: null });
      return () => b;
    }});
    return b;
  }
  const client = {
    auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: async () => ({}) },
    from: builder,
    rpc: async (name, args) => {
      window.__rpcCalls.push({ name, args });
      if (name === 'ensure_course_decks'){
        if (!window.__AUTH) return { data: null, error: { message: 'permission denied for function ensure_course_decks' } };
        const lang = args.p_language_app_key, D = window.__DB.decks;
        let root = D.find(d => d.kind === 'course' && d.language_app_key === lang && d.course_unit_id == null);
        if (!root){ root = { id: 1000 + D.length, kind: 'course', name: lang, language_app_key: lang, course_unit_id: null, parent_deck_id: null, owner_id: null, teacher_id: null, is_public: false }; D.push(root); }
        args.p_units.forEach(u => { if (!D.find(d => d.kind === 'course' && d.language_app_key === lang && d.course_unit_id === u.unit_id))
          D.push({ id: 1000 + D.length, kind: 'course', name: u.title, language_app_key: lang, course_unit_id: u.unit_id, parent_deck_id: root.id, owner_id: null, teacher_id: null, is_public: false }); });
        return { data: D.filter(d => d.kind === 'course' && d.language_app_key === lang), error: null };
      }
      return { data: null, error: null };
    },
    channel: () => ({ on(){ return this; }, subscribe(){ return this; } }),
    storage: { from: () => ({ upload: async () => ({}), getPublicUrl: () => ({ data: { publicUrl: '' } }), remove: async () => ({}) }) },
    functions: { invoke: async () => ({ data: null, error: null }) },
  };
  window.supabase = { createClient: () => client };
})();`;

let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };

async function bootPage(browser, lang, port){
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1200, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  // a última rota registrada tem precedência: bloqueia externos primeiro, stub do CDN depois
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
  await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
  if (process.env.DBG) console.log('url', page.url());
  page.on('console', m => { if (process.env.DBG) console.log('console:', m.text().slice(0,200)); });
  try {
    await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
  } catch (e) {
    console.log('boot falhou; erros:', errors, 'estado:', await page.evaluate(() => ({ st: typeof STATE, cu: typeof CURRENT_USER !== 'undefined' ? CURRENT_USER : 'undef', guest: sessionStorage.getItem('guest_mode'), login: document.getElementById('login-screen') && document.getElementById('login-screen').style.display })));
    throw e;
  }
  return { page, errors, ctx };
}



const SQLJS = require(NM + '/sql.js'), JSZip = require(NM + '/jszip');
async function readApkg(buf){
  const zip = await JSZip.loadAsync(buf);
  const SQL = await SQLJS();
  const db = new SQL.Database(await zip.file('collection.anki2').async('uint8array'));
  const col = db.exec('select models from col')[0].values[0][0];
  const models = JSON.parse(col);
  const notes = db.exec('select guid, mid, flds, sfld from notes')[0].values.map(r => ({ guid: r[0], mid: String(r[1]), flds: r[2].split('\x1f'), sfld: r[3] }));
  const ncards = db.exec('select count(*) from cards')[0].values[0][0];
  return { models, notes, ncards };
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const lang of ['fr', 'zh']){
    console.log('== ' + lang);
    const ctxB = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1200, height: 900 }, acceptDownloads: true });
    const page = await ctxB.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
    await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
    await page.route(/jszip\.min\.js/, r => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(NM + '/jszip/dist/jszip.min.js', 'utf8') }));
    await page.route(/sql-wasm\.js/, r => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(NM + '/sql.js/dist/sql-wasm.js', 'utf8') }));
    await page.route(/sql-wasm\.wasm/, r => r.fulfill({ contentType: 'application/wasm', body: fs.readFileSync(NM + '/sql.js/dist/sql-wasm.wasm') }));
    await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
    await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
    await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
    const ev = (fn, arg) => page.evaluate(fn, arg);
    const isZh = lang === 'zh';
    const setup = await ev(() => {
      UNITS.forEach(x => { STATE.unitProgress[x.id] = { started: true, completed: true, lessonIdx: 99, lessonMisses: {} }; });
      STATE.studySettings.newCardsPerDay = 1000; STATE.studySettings.sessionIntensity = 'intense';
      const words = new Set(STATE.cards.filter(c => c.vocabIdx != null).map(c => c.unitId + ':' + c.vocabIdx)).size;
      // A estudado e B New numa palavra; ambos estudados noutra (B New continua na maioria)
      const u = UNITS.find(x => x.type !== 'grammar' && x.vocab.length >= 6);
      const mk = id => Object.assign(STATE.cards.find(c => c.id === id), { reps: 3, state: 'review', stability: 8, difficulty: 5, interval: 10, due: 1 });
      mk(`u${u.id}-v0`); mk(`u${u.id}-v1`); mk(`u${u.id}-v1-b`);
      return { words, cards: STATE.cards.length, uid: u.id };
    });
    const fsrsBefore = await ev(() => JSON.stringify(STATE.cards.map(c => [c.id, c.reps, c.due, c.stability])));
    // ---------- Speed (UI real)
    await ev(() => { switchTab('review'); });
    await page.click('#mode-card-speed');
    await page.waitForSelector('.speed-prompt .french, .speed-prompt .hanzi');
    const prompts = [], optionSets = []; let badOpt = false;
    const vocabByStudy = await ev(() => { const m = {}; UNITS.forEach(u => (u.vocab || []).forEach(v => { m[APP_KEY === 'mandarim' ? v.c : v.f] = v.t; })); return m; });
    const transSet = new Set(Object.values(vocabByStudy));
    for (let i = 0; i < 10; i++){
      const cur = await page.evaluate(() => ({ p: document.querySelector('.speed-prompt .french, .speed-prompt .hanzi')?.innerText, o: [...document.querySelectorAll('.speed-option')].map(e => e.innerText) }));
      if (!cur.p) break;
      prompts.push(cur.p); optionSets.push(cur.o);
      const right = vocabByStudy[cur.p];
      const idx = cur.o.findIndex(t => t === right);
      await page.click(`.speed-option[data-idx="${idx >= 0 ? idx : 0}"]`);
      await page.waitForFunction(p => { const el = document.querySelector('.speed-prompt .french, .speed-prompt .hanzi'); return !el || el.innerText !== p; }, cur.p, { timeout: 8000 }).catch(() => {});
    }
    check(lang + ' Speed UI: perguntas no idioma estudado (nenhuma é tradução = B)', prompts.length >= 5 && prompts.every(p => p in vocabByStudy), prompts);
    check(lang + ' Speed UI: cada palavra aparece no máximo 1 vez', new Set(prompts).size === prompts.length, prompts);
    check(lang + ' Speed UI: 4 opções sem repetição, todas traduções', optionSets.every(o => o.length === 4 && new Set(o).size === 4 && o.every(t => transSet.has(t))), optionSets[0]);
    const q = await ev(() => ({ len: SPEED_STATE.queue.length, hasB: SPEED_STATE.queue.some(c => !isStudyWordProjectionCard(c)), max: sessionIntensityToLimit(STATE.studySettings.sessionIntensity) }));
    check(lang + ' Speed UI: fila da sessão sem B', q.hasB === false && q.len <= q.max, q);
    // ---------- Combinar (UI real)
    await ev(() => { MATCH_STATE.pairSize = 8; switchTab('review'); renderReviewModeSelect(); });
    await page.click('#mode-card-match');
    await page.waitForSelector('.match-size-btn');
    const cnt = await ev(() => document.querySelector('#mode-card-match, .match-size-btn') && STATE.cards.length);
    await page.click('.match-size-btn[data-pairs="8"]');
    await page.click('#match-size-start-btn');
    await page.waitForSelector('.match-tile');
    const tiles = await page.$$eval('.match-tile', els => els.map(e => ({ id: e.dataset.cardId, side: e.dataset.side, text: e.innerText.replace('?', '').trim() })));
    check(lang + ' Combinar UI: 2 tiles por palavra, sem B nem texto repetido', tiles.length % 2 === 0 && tiles.length >= 8 && tiles.every(t => !t.id.endsWith('-b')) && new Set(tiles.map(t => t.id + '|' + t.side)).size === tiles.length, tiles.length);
    // K2-J: a unicidade é de (card, lado), não de texto: o conteúdo tem palavras repetidas entre unidades (ex.: 工作, manger) e cognatos (dormir/dormir), então 2 tiles com o mesmo texto são legítimos.
    check(lang + ' Combinar UI: cada palavra tem 1 frente e 1 verso', [...new Set(tiles.map(t => t.id))].every(id => tiles.filter(t => t.id === id).length === 2));
    const mcount = await ev(() => { renderReviewModeSelect(); return document.querySelector('#mode-card-match .count').innerText; });
    check(lang + ' Combinar UI: contador do modo = palavras (não 2x)', parseInt(mcount) === setup.words, [mcount, setup.words]);
    const fsrsAfter = await ev(() => JSON.stringify(STATE.cards.map(c => [c.id, c.reps, c.due, c.stability])));
    const changed = JSON.parse(fsrsAfter).filter((r, i) => JSON.stringify(r) !== JSON.stringify(JSON.parse(fsrsBefore)[i])).map(r => r[0]);
    check(lang + ' FSRS: só cards A respondidos no Speed mudaram; nenhum B mudou', changed.every(id => !id.endsWith('-b')) , changed);
    // ---------- Review/Deck continuam por CardInstance
    const rv = await ev(async () => { const n = STATE.cards.filter(c => c.unitId === STATE.cards[0].unitId && !isStudyTrailPhraseCard(c)).length; return { n, words: new Set(STATE.cards.filter(c => c.unitId === STATE.cards[0].unitId && c.vocabIdx != null).map(c => c.vocabIdx)).size, revPool: eligibleReviewPool().length, cards: STATE.cards.length }; });
    check(lang + ' Review/Deck: pool de Review segue com 2 CardInstances por palavra', rv.n === rv.words * 2 && rv.revPool === rv.cards, rv);
    // ---------- Anki (export real .apkg)
    await ev(() => { switchTab('settings'); switchSettingsSection('export'); });
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.click('#export-btn')]);
    const file = await dl.path();
    const apkg = await readApkg(fs.readFileSync(file));
    const names = Object.values(apkg.models).map(m => m.name);
    check(lang + ' Anki real: 2N cartões e 2N notas (A e B separados)', apkg.ncards === setup.cards && apkg.notes.length === setup.cards, [apkg.ncards, apkg.notes.length, setup.cards]);
    check(lang + ' Anki real: guids únicos, A e B distintos', new Set(apkg.notes.map(n => n.guid)).size === setup.cards && apkg.notes.filter(n => n.guid.endsWith('-b')).length === setup.words);
    const revModel = Object.values(apkg.models).find(m => /Reverso/.test(m.name)), baseModel = Object.values(apkg.models).find(m => !/Reverso|Cloze/.test(m.name));
    check(lang + ' Anki real: modelo Reverso presente, mesmos campos do Básico', !!revModel && revModel.flds.map(f => f.name).join() === baseModel.flds.map(f => f.name).join(), names);
    const front = m => m.tmpls[0].qfmt, back = m => m.tmpls[0].afmt;
    check(lang + ' Anki real: Reverso = Tradução na frente; Básico = idioma estudado na frente', /\{\{Tradução\}\}/.test(front(revModel)) && !/\{\{Tradução\}\}/.test(front(baseModel)));
    const u = await ev(uid => { const un = UNITS.find(x => x.id === uid); return { f: isZh => isZh ? un.vocab[0].c : un.vocab[0].f, v0: un.vocab[0], vb: un.vocab[2] }; }, setup.uid).catch(() => null);
    const v0 = await ev(uid => UNITS.find(x => x.id === uid).vocab[0], setup.uid);
    const noteA = apkg.notes.find(n => n.guid.endsWith(`u${setup.uid}-v0`)), noteB = apkg.notes.find(n => n.guid.endsWith(`u${setup.uid}-v0-b`));
    check(lang + ' Anki real: A no modelo Básico, B no modelo Reverso', noteA && noteB && apkg.models[noteA.mid].name === baseModel.name && apkg.models[noteB.mid].name === revModel.name);
    check(lang + ' Anki real: A e B com o MESMO conteúdo semântico por campo (só o template inverte)', JSON.stringify(noteA.flds) === JSON.stringify(noteB.flds), [noteA.flds, noteB.flds]);
    const studyWord = isZh ? v0.c : v0.f;
    check(lang + ' Anki real: campos corretos (palavra estudada + tradução' + (isZh ? ' + pinyin' : '') + ')', noteB.flds.includes(studyWord) && noteB.flds.includes(v0.t) && (!isZh || noteB.flds.includes(v0.p)), noteB.flds);
    check(lang + ' sem pageerror', errors.length === 0, errors);
    await ctxB.close();
  }
  await browser.close(); server.close();
  console.log(`K2-F playwright: ${passed}/${passed + failed} verificações` + (failed ? ` — ${failed} FALHAS` : ' — OK'));
  process.exit(failed ? 1 : 0);
})();

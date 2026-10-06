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
    const ST = isZh ? '你好' : 'bonjour', PY = 'nǐ hǎo', TR = isZh ? 'olá' : 'bom dia';
    const setup = await ev(([ST, PY, TR, isZh]) => {
      const fld = (id, l, v, x) => Object.assign({ id, lang: l, role: null, content: { value: v }, audio: null, image: null, pinyinFieldId: null }, x || {});
      const f2 = () => isZh ? [fld('h', 'zh', ST, { pinyinFieldId: 'p' }), fld('p', 'zh-pinyin', PY), fld('t', 'pt-BR', TR)] : [fld('s', 'fr', ST), fld('t', 'pt-BR', TR)];
      const cloze = isZh ? [fld('c', 'zh', '我{{c1::是|shì}}学生'), fld('t', 'pt-BR', 'eu sou aluno')] : [fld('c', 'fr', 'Je {{c1::suis}} étudiant'), fld('t', 'pt-BR', 'eu sou aluno')];
      const rows = [
        [101, 'normal', f2()], [102, 'normal_reversed', f2()], [103, 'cloze', cloze],
      ];
      const out = [];
      rows.forEach(([id, mode, fields]) => {
        const row = { id, language_app_key: APP_KEY, fields, card_generation_mode: mode, status: 'active', revision: 0, tags: [] };
        out.push(...buildCardFromTeacherFlashcard(Object.assign({ student_id: 'x' }, row, { id: id })));
        out.push(...buildCardFromSelfFlashcard(Object.assign({}, row, { id: id + 100 })));
      });
      out.forEach(c => { c.unitId = null; });
      STATE.cards = out.concat(STATE.cards.filter(c => c.origin === 'study').slice(0, 2));
      const snap = JSON.stringify(STATE.cards.map(c => [c.id, c.reps, c.due, c.stability, c.difficulty, c.lapses, c.state]));
      window.__snap = snap;
      return { n: STATE.cards.length, ids: STATE.cards.map(c => c.id) };
    }, [ST, PY, TR, isZh]);
    await ev(() => { switchTab('settings'); switchSettingsSection('export'); });
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.click('#export-btn')]);
    const apkg = await readApkg(fs.readFileSync(await dl.path()));
    const models = Object.values(apkg.models);
    const revModel = models.find(m => /Reverso/.test(m.name)), baseModel = models.find(m => !/Reverso|Cloze/.test(m.name)), clozeModel = models.find(m => /Cloze/.test(m.name));
    check(lang + ' apkg: modelos Básico + Reverso + Cloze presentes', !!revModel && !!baseModel && !!clozeModel, models.map(m => m.name));
    check(lang + ' apkg: cada CardInstance = 1 nota/1 cartão (nada agrupado)', apkg.notes.length === setup.n && apkg.ncards === setup.n, [apkg.notes.length, apkg.ncards, setup.n]);
    check(lang + ' apkg: guids únicos', new Set(apkg.notes.map(n => n.guid)).size === setup.n);
    check(lang + ' apkg: Reverso = Tradução na frente; Básico = estudado na frente', /\{\{Tradução\}\}/.test(revModel.tmpls[0].qfmt) && !/\{\{Tradução\}\}/.test(baseModel.tmpls[0].qfmt));
    for (const [who, pfx, base] of [['teacher', 't', 101], ['self', 's', 201]]){
      const normalId = pfx + base, revId = pfx + (base + 1), byGuid = id => apkg.notes.find(n => n.guid === (isZh ? 'mzc_' : 'fzc_') + id);
      const nN = byGuid(normalId), nA = byGuid(revId), nB = byGuid(revId + '-b');
      const nm = n => apkg.models[n.mid].name;
      check(lang + ' ' + who + ' normal → Básico, frente correta', nN && nm(nN) === baseModel.name && (isZh ? (nN.flds[0] === PY && nN.flds[1] === ST && nN.flds[2] === TR) : (nN.flds[0] === ST && nN.flds[1] === TR)), nN && nN.flds);
      check(lang + ' ' + who + ' reverso: A → Básico, B → Reverso', nA && nB && nm(nA) === baseModel.name && nm(nB) === revModel.name, [nA && nm(nA), nB && nm(nB)]);
      check(lang + ' ' + who + ' reverso: B com os mesmos campos semânticos de A, nenhum vazio', nA && nB && JSON.stringify(nA.flds) === JSON.stringify(nB.flds) && nB.flds.every(x => x.length) && nB.flds.includes(ST) && nB.flds.includes(TR) && (!isZh || nB.flds.includes(PY)), nB && nB.flds);
      check(lang + ' ' + who + ' reverso: guids distintos', nA && nB && nA.guid !== nB.guid);
      const cl = apkg.notes.filter(n => n.guid.includes(pfx + (base + 2)));
      check(lang + ' ' + who + ' cloze → modelo Cloze (inalterado)', cl.length === 1 && nm(cl[0]) === clozeModel.name, cl.map(nm));
    }
    const snap2 = await ev(() => JSON.stringify(STATE.cards.map(c => [c.id, c.reps, c.due, c.stability, c.difficulty, c.lapses, c.state])));
    check(lang + ' FSRS intacto após exportar', snap2 === await ev(() => window.__snap));
    check(lang + ' sem pageerror', errors.length === 0, errors);
    await ctxB.close();
  }
  await browser.close(); server.close();
  console.log(`K2-F hardening playwright: ${passed}/${passed + failed} verificações` + (failed ? ` — ${failed} FALHAS` : ' — OK'));
  process.exit(failed ? 1 : 0);
})();

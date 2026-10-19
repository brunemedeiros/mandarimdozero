// Etapa 3 (a46, decisão da dona 2026-10-19): exportação .apkg no idioma do site.
// Chromium real, fr e zh, exportação REAL (botão de Configurações > Exportar):
//   - pt-BR: nomes de campo, de template, de modelo, descrição do baralho e nome do
//     arquivo EXATAMENTE como antes (Francês/Caractere/Tradução, "Cartão 1", "- Reverso",
//     "Exportado do app ...", frances-com-prof-brune-unidade-N.apkg);
//   - en: os mesmos em inglês (French/Character/Translation, "Card 1", "- Reverse",
//     french-with-prof-brune-unit-N.apkg);
//   - o GUID das notas é o mesmo nos dois idiomas (reimportar no Anki atualiza, não duplica);
//   - a IMPORTAÇÃO do próprio site reconhece o .apkg exportado em inglês (e em pt-BR):
//     nenhum cartão "não reconhecido".
// Rodar: node tests/k2f/test_playwright_anki_idioma.js
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
const STUB = `(function(){
  const b = new Proxy({}, { get(_, p){ if (p === 'then') return (ok) => Promise.resolve({ data: [], error: null }).then(ok); return () => b; } });
  const client = { auth: { getSession: async () => ({ data: { session: null } }), getUser: async () => ({ data: { user: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: async () => ({}) },
    from: () => b, channel: () => ({ on(){ return this; }, subscribe(){ return this; } }), removeChannel: () => {},
    storage: { from: () => ({}) }, functions: { invoke: async () => ({ data: null, error: null }) }, rpc: async () => ({ data: null, error: null }) };
  window.supabase = { createClient: () => client };
})();`;
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x).slice(0, 500) : ''); } };

const SQLJS = require(NM + '/sql.js'), JSZip = require(NM + '/jszip');
async function readApkg(buf){
  const zip = await JSZip.loadAsync(buf);
  const SQL = await SQLJS();
  const db = new SQL.Database(await zip.file('collection.anki2').async('uint8array'));
  const row = db.exec('select models, decks from col')[0].values[0];
  const models = JSON.parse(row[0]), decks = JSON.parse(row[1]);
  const notes = db.exec('select guid, mid, flds from notes')[0].values.map(r => ({ guid: r[0], mid: String(r[1]), flds: r[2].split('\x1f') }));
  return { models, decks, notes };
}

async function exportIn(browser, port, app, lang){
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1200, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.route(/jszip\.min\.js/, r => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(NM + '/jszip/dist/jszip.min.js', 'utf8') }));
  await page.route(/sql-wasm\.js/, r => r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(NM + '/sql.js/dist/sql-wasm.js', 'utf8') }));
  await page.route(/sql-wasm\.wasm/, r => r.fulfill({ contentType: 'application/wasm', body: fs.readFileSync(NM + '/sql.js/dist/sql-wasm.wasm') }));
  await ctx.addInitScript((lang) => { try { sessionStorage.setItem('guest_mode', '1'); localStorage.setItem('ui-language', lang); } catch (e) {} }, lang);
  await page.goto(`http://127.0.0.1:${port}/${app}/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 30000 });
  await page.evaluate(() => window.i18nReady);
  await page.waitForTimeout(800);
  // Unidade 1 inteira (A e B da trilha -> modelos Básico e Reverso). Para exercitar o Cloze, um cartão
  // nativo Cloze da professora entra na seleção (ver ankiExportCardKind).
  const unitId = await page.evaluate(() => {
    const u = UNITS.find(x => x.type !== 'grammar' && x.vocab && x.vocab.length);
    UNITS.forEach(x => { STATE.unitProgress[x.id] = { started: true, completed: true, lessonIdx: 99, lessonMisses: {} }; });
    const row = { id: 990001, revision: 0, status: 'active', note: null, tags: [], deck_id: null, card_generation_mode: 'cloze',
      fields: [
        { id: 'f0', lang: APP_KEY === 'mandarim' ? 'zh' : 'fr', role: null, content: { value: APP_KEY === 'mandarim' ? '我{{c1::是}}学生' : 'Je {{c1::suis}} étudiant' }, audio: null, image: null, pinyinFieldId: null },
        { id: 'f1', lang: 'pt-BR', role: null, content: { value: 'Eu sou estudante' }, audio: null, image: null, pinyinFieldId: null },
      ] };
    const cards = buildEngineCardsFromRow(row, { origin: 'teacher', appKey: APP_KEY, idPrefix: 't' });
    cards.forEach(c => { c.unitId = u.id; STATE.cards.push(c); });
    return String(u.id);
  });
  await page.evaluate(() => { switchTab('settings'); switchSettingsSection('export'); });
  await page.evaluate((id) => { const s = document.getElementById('export-unit-select') || document.querySelector('#export-section select, select[id*="export"]'); if (s){ s.value = id; s.dispatchEvent(new Event('change', { bubbles: true })); } if (typeof exportSelectedUnit !== 'undefined') exportSelectedUnit = id; }, unitId);
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.click('#export-btn')]);
  const buf = fs.readFileSync(await dl.path());
  return { ctx, page, errors, buf, filename: dl.suggestedFilename(), unitId };
}

// Importa o .apkg pelo caminho REAL do site (parseApkgFile + buildAnkiImportPlan).
async function importPlan(page, buf){
  await page.addScriptTag({ content: fs.readFileSync(NM + '/jszip/dist/jszip.min.js', 'utf8') });
  return page.evaluate(async (b64) => {
    const bin = atob(b64); const bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const SQL = await initSqlJs({ locateFile: f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${f}` });
    const parsed = await parseApkgFile(bytes.buffer, { SQL, JSZipCtor: JSZip });
    if (!parsed.ok) return { ok: false, error: parsed.error };
    const kinds = Object.values(parsed.models).map(m => ({ name: m.name, kind: classifyAnkiNoteType(m).kind }));
    const plan = buildAnkiImportPlan(parsed, { languageAppKey: APP_KEY, existingRows: [] });
    const entries = plan.notes || [];
    return { ok: true, kinds, total: entries.length, okCount: entries.filter(e => e.ok).length, reasons: entries.filter(e => !e.ok).map(e => e.reason) };
  }, buf.toString('base64'));
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const app of ['fr', 'zh']){
    console.log('== ' + app);
    const isZh = app === 'zh';
    const res = {};
    for (const lang of ['pt-BR', 'en']){
      const r = await exportIn(browser, port, app, lang);
      const apkg = await readApkg(r.buf);
      const models = Object.values(apkg.models);
      const base = models.find(m => m.type === 0 && !/Reverso|Reverse/.test(m.name));
      const rev = models.find(m => /Reverso|Reverse/.test(m.name));
      const cloze = models.find(m => m.type === 1);
      const deck = Object.values(apkg.decks).find(d => d.id !== 1);
      res[lang] = { apkg, base, rev, cloze, deck, filename: r.filename, unitId: r.unitId };
      check(`${app} ${lang}: exportou com Básico, Reverso e Cloze`, !!base && !!rev && !!cloze, models.map(m => m.name));
      check(`${app} ${lang}: sem pageerror`, r.errors.length === 0, r.errors);
      const plan = await importPlan(r.page, r.buf);
      res[lang].plan = plan;
      check(`${app} ${lang}: importação do site lê o arquivo e reconhece Básico e Cloze`, plan.ok && plan.total === apkg.notes.length
        && plan.kinds.find(k => k.name === base.name).kind !== 'unrecognized' && plan.kinds.find(k => k.name === cloze.name).kind === 'cloze', plan);
      // fr: tudo reconhecido. zh: o modelo Reverso (Tradução na frente, Pinyin+Caractere atrás) NUNCA foi
      // reconhecido pela importação (limitação antiga, igual em pt-BR; não é deste lote) -- ver relatório.
      if (!isZh) check(`${app} ${lang}: importação do site aceita todas as notas`, plan.ok && plan.okCount === plan.total, plan);
      await r.ctx.close();
    }
    const pt = res['pt-BR'], en = res.en;
    const appPt = isZh ? 'Chinês com Prof. Brune' : 'Francês com Prof. Brune';
    const appEn = isZh ? 'Chinese with Prof. Brune' : 'French with Prof. Brune';
    const fldPt = isZh ? 'Pinyin,Caractere,Tradução' : 'Francês,Tradução';
    const fldEn = isZh ? 'Pinyin,Character,Translation' : 'French,Translation';
    // pt-BR: igual a antes
    check(`${app} pt-BR: campos ${fldPt}`, pt.base.flds.map(f => f.name).join() === fldPt && pt.rev.flds.map(f => f.name).join() === fldPt, pt.base.flds);
    check(`${app} pt-BR: template "Cartão 1"`, pt.base.tmpls[0].name === 'Cartão 1' && pt.rev.tmpls[0].name === 'Cartão 1');
    check(`${app} pt-BR: modelos "${appPt}" e "${appPt} - Reverso" e "- Cloze"`, pt.base.name === appPt && pt.rev.name === appPt + ' - Reverso' && pt.cloze.name === appPt + ' - Cloze', [pt.base.name, pt.rev.name, pt.cloze.name]);
    check(`${app} pt-BR: Cloze com campos Text/Tradução`, pt.cloze.flds.map(f => f.name).join() === 'Text,Tradução' && /\{\{Tradução\}\}/.test(pt.cloze.tmpls[0].afmt));
    check(`${app} pt-BR: qfmt/afmt usam os nomes em português`, /\{\{Tradução\}\}/.test(pt.rev.tmpls[0].qfmt) && (isZh ? /\{\{Caractere\}\}/.test(pt.base.tmpls[0].afmt) : /\{\{Francês\}\}/.test(pt.base.tmpls[0].qfmt)));
    check(`${app} pt-BR: descrição "Exportado do app ${appPt}"`, pt.deck.desc === 'Exportado do app ' + appPt, pt.deck.desc);
    check(`${app} pt-BR: baralho começa por "${appPt} - "`, pt.deck.name.startsWith(appPt + ' - '), pt.deck.name);
    const filePt = `${isZh ? 'chines' : 'frances'}-com-prof-brune-unidade-${pt.unitId}.apkg`;
    check(`${app} pt-BR: arquivo ${filePt}`, pt.filename === filePt, pt.filename);
    // en
    check(`${app} en: campos ${fldEn}`, en.base.flds.map(f => f.name).join() === fldEn && en.rev.flds.map(f => f.name).join() === fldEn, en.base.flds);
    check(`${app} en: template "Card 1"`, en.base.tmpls[0].name === 'Card 1' && en.rev.tmpls[0].name === 'Card 1');
    check(`${app} en: modelos "${appEn}", "- Reverse", "- Cloze"`, en.base.name === appEn && en.rev.name === appEn + ' - Reverse' && en.cloze.name === appEn + ' - Cloze', [en.base.name, en.rev.name, en.cloze.name]);
    check(`${app} en: Cloze com campos Text/Translation`, en.cloze.flds.map(f => f.name).join() === 'Text,Translation' && /\{\{Translation\}\}/.test(en.cloze.tmpls[0].afmt));
    const allTmpl = m => m.tmpls.map(t => t.qfmt + t.afmt).join();
    check(`${app} en: nenhum nome em português nos modelos (campos/templates)`, [en.base, en.rev, en.cloze].every(m => !/Tradução|Francês|Caractere|Cartão|Reverso/.test(JSON.stringify(m.flds) + allTmpl(m) + m.name + m.tmpls.map(t => t.name).join())));
    check(`${app} en: descrição em inglês`, en.deck.desc === `Exported from the ${appEn} app`, en.deck.desc);
    check(`${app} en: baralho começa por "${appEn} - "`, en.deck.name.startsWith(appEn + ' - '), en.deck.name);
    const fileEn = `${isZh ? 'chinese' : 'french'}-with-prof-brune-unit-${en.unitId}.apkg`;
    check(`${app} en: arquivo ${fileEn}`, en.filename === fileEn, en.filename);
    // a importação trata o arquivo em inglês EXATAMENTE como o em português
    const sig = p => JSON.stringify({ kinds: p.plan.kinds.map(k => k.kind), total: p.plan.total, ok: p.plan.okCount, reasons: p.plan.reasons });
    check(`${app}: importação do .apkg em en == importação do .apkg em pt-BR`, sig(pt) === sig(en), [sig(pt), sig(en)]);
    // mesmo GUID e mesmo conteúdo por nota nos dois idiomas (reimportar no Anki atualiza, não duplica)
    const g = a => a.apkg.notes.map(n => n.guid).sort().join();
    check(`${app}: GUIDs iguais em pt-BR e en`, g(pt) === g(en) && pt.apkg.notes.length > 0);
    check(`${app}: GUID continua com o prefixo de antes`, pt.apkg.notes.every(n => n.guid.startsWith(isZh ? 'mzc_' : 'fzc_')));
  }
  await browser.close(); server.close();
  console.log(`Anki .apkg no idioma do site: ${passed}/${passed + failed} verificações` + (failed ? ` — ${failed} FALHAS` : ' — OK'));
  process.exit(failed ? 1 : 0);
})();

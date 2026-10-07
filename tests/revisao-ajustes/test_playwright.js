// Ajustes da Revisão (2026-10-06): janela Adicionar (Deck no topo, "Criar cartão" fixo no rodapé), botão discreto de imagem por campo e nomes amigáveis das tags.
// Adicionar | Painel), tabela da Revisão, tela do Deck no formato do Anki,
// Painel em janela (filtros, lista, editor), Criar/Importar/Exportar,
// exclusão de Deck pessoal e o fim de "Meus Cartões". Playwright (Chromium
// real), FR + ZH.
// Harness da Fase H: convidado + Supabase stubado em memória; "autenticado"
// = CURRENT_USER setado depois do boot. O stub grava as escritas em
// own_flashcards/decks para conferir o que foi enviado ao banco.
// Rodar: node tests/deck-browser/test_playwright.js
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

const STUB = `
(function(){
  window.__DB = { decks: [], own_flashcards: [] };
  window.__writes = [];
  function builder(table){
    const st = { table, filters: [], ins: [], op: 'select', patch: null };
    const match = (row) => st.filters.every(([k, v]) => d(row, k, v)) && st.ins.every(([k, vs]) => vs.includes(row[k]));
    function d(row, k, v){ return row[k] === v; }
    const exec = () => {
      const rows = (window.__DB[table] || []);
      if (st.op === 'update'){
        const hit = rows.filter(match); hit.forEach(r => Object.assign(r, st.patch));
        window.__writes.push({ table, op: 'update', patch: st.patch, ids: hit.map(r => r.id) });
        return hit.map(r => ({ id: r.id }));
      }
      if (st.op === 'delete'){
        const hit = rows.filter(match);
        window.__DB[table] = rows.filter(r => !hit.includes(r));
        window.__writes.push({ table, op: 'delete', ids: hit.map(r => r.id) });
        return hit.map(r => ({ id: r.id }));
      }
      if (table === 'decks') return rows.filter(match);
      return rows.filter(match);
    };
    const b = new Proxy({}, { get(_, prop){
      if (prop === 'then') return (ok, ko) => Promise.resolve({ data: exec(), error: null }).then(ok, ko);
      if (prop === 'eq') return (k, v) => { st.filters.push([k, v]); return b; };
      if (prop === 'in') return (k, vs) => { st.ins.push([k, vs]); return b; };
      if (prop === 'update') return (p) => { st.op = 'update'; st.patch = p; return b; };
      if (prop === 'delete') return () => { st.op = 'delete'; return b; };
      if (prop === 'single' || prop === 'maybeSingle') return () => Promise.resolve({ data: null, error: null });
      return () => b;
    }});
    return b;
  }
  const client = {
    auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: async () => ({}) },
    from: builder,
    rpc: async () => ({ data: null, error: null }),
    channel: () => ({ on(){ return this; }, subscribe(){ return this; } }),
    storage: { from: () => ({ upload: async () => ({}), getPublicUrl: () => ({ data: { publicUrl: '' } }), remove: async () => ({}) }) },
    functions: { invoke: async () => ({ data: null, error: null }) },
  };
  window.supabase = { createClient: () => client };
})();`;

let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };

async function bootPage(browser, lang, port, theme, viewport){
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: viewport || { width: 1200, height: 900 }, colorScheme: theme || 'light' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
  await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
  return { page, errors, ctx };
}

// Árvore: root(9000) > Meus Decks(9001) > Verbos(9002) > Irregulares(9003); Comida(9004)
//         root > Cartões da professora(9100)
//         Curso (9200, sem parent) > unidade (9201, ligada à 1ª unidade de UNITS)
async function setup(page){
  return page.evaluate(() => {
    const A = APP_KEY, U = 'u-db';
    CURRENT_USER = { id: U };
    const unit = UNITS.find(u => (u.vocab || []).length);
    STATE.unitProgress = STATE.unitProgress || {};
    STATE.unitProgress[unit.id] = { started: true, completed: true, lessonIdx: 99, lessonMisses: {} };
    STATE.decks = [
      { id: 9000, kind: 'root', name: A === 'frances' ? 'Francês' : 'Mandarim', owner_id: U, language_app_key: A, parent_deck_id: null },
      { id: 9001, kind: 'personal_root', name: 'Meus Decks', owner_id: U, language_app_key: A, parent_deck_id: 9000 },
      { id: 9002, kind: 'personal', name: 'Verbos', owner_id: U, language_app_key: A, parent_deck_id: 9001 },
      { id: 9003, kind: 'personal', name: 'Irregulares', owner_id: U, language_app_key: A, parent_deck_id: 9002 },
      { id: 9004, kind: 'personal', name: 'Comida', owner_id: U, language_app_key: A, parent_deck_id: 9001 },
      { id: 9100, kind: 'teacher_root', name: 'Cartões da professora', owner_id: U, teacher_id: 't', language_app_key: A, parent_deck_id: 9000 },
      { id: 9200, kind: 'course', name: 'Curso', owner_id: null, language_app_key: A, parent_deck_id: null, course_unit_id: null },
      { id: 9201, kind: 'course', name: unit.title, owner_id: null, language_app_key: A, parent_deck_id: 9200, course_unit_id: String(unit.id) },
    ];
    STATE.courseDecksLoaded = true;
    assignCourseDeckIds(STATE.cards, buildCourseDeckIndex(STATE.decks, A));
    const rows = [
      { id: 501, deck_id: 9002, front: 'aller', back_trans: 'ir', tags: ['verbo'] },
      { id: 502, deck_id: 9003, front: 'être', back_trans: 'ser', tags: ['verbo', 'irregular'] },
      { id: 503, deck_id: 9004, front: 'pain', back_trans: 'pão', tags: ['comida'] },
      { id: 504, deck_id: 9004, front: 'eau', back_trans: 'água', tags: [] },
    ].map(r => Object.assign({ owner_id: U, language_app_key: A, status: 'active', revision: 0, front_is_target_language: true }, r));
    window.__DB.own_flashcards = rows.map(r => Object.assign({}, r));
    window.__DB.decks = STATE.decks.map(d => Object.assign({}, d));
    // Aluno vinculado à professora neste idioma (senão "Cartões da professora" some).
    window.__DB.teacher_students = [{ id: 1, teacher_id: 't', student_id: U, language_app_key: A, status: 'active' }];
    DECK_BROWSER.teacherLink = {};
    rows.forEach(r => buildCardFromSelfFlashcard(r).forEach(c => STATE.cards.push(c)));
    // 1 cartão da professora no teacher_root
    buildCardFromTeacherFlashcard({ id: 601, teacher_id: 't', student_id: U, language_app_key: A, status: 'active', revision: 0, front: 'prof', back_trans: 'p', front_is_target_language: true, tags: ['aula'], deck_id: 9100 }).forEach(c => STATE.cards.push(c));
    try { localStorage.removeItem('deckBrowserCollapsed:' + A); } catch (e) {}
    return { unitTitle: unit.title, courseCards: STATE.cards.filter(c => c.deckId === 9201).length };
  });
}


const SHOTS = process.env.SHOT_DIR || require('os').tmpdir();
const shot = (page, name) => page.screenshot({ path: path.join(SHOTS, name + '.png') });

// Funções de rede dos cartões próprios trocadas por versões em memória.
async function stubOwn(page){
  await page.evaluate(() => {
    fetchMyOwnFlashcards = async () => window.__DB.own_flashcards.map(r => Object.assign({}, r));
    fetchDecksForLanguage = async () => STATE.decks.map(d => Object.assign({}, d));
    ensureDecksForCurrentUser = async () => ({ ok: true, rootDeckId: 9000, personalRootDeckId: 9001 });
    hasActiveTeacherLink = async () => false;
    fetchMyPlanTier = async () => 'premium';
    window.__created = []; window.__updated = [];
    createOwnFlashcard = async ({ nativeState, deckId }) => {
      const row = Object.assign({ id: 700 + window.__created.length, owner_id: CURRENT_USER.id, language_app_key: APP_KEY, status: 'active', revision: 0, deck_id: deckId },
        nativeContentColumnsFromEditorState(nativeState));
      window.__created.push(row); window.__DB.own_flashcards.push(Object.assign({}, row));
      return { ok: true, card: row };
    };
    updateOwnFlashcardContent = async (id, payload) => {
      window.__updated.push({ id, payload });
      const r = window.__DB.own_flashcards.find(x => x.id === id);
      if (r && payload.nativeState) Object.assign(r, nativeContentColumnsFromEditorState(payload.nativeState), { revision: payload.revision });
      return { ok: true };
    };
    createPersonalDeck = async ({ name, parentDeckId }) => {
      const deck = { id: 9500 + STATE.decks.length, kind: 'personal', name: name.trim(), owner_id: CURRENT_USER.id, language_app_key: APP_KEY, parent_deck_id: parentDeckId };
      window.__DB.decks.push(Object.assign({}, deck));
      return { ok: true, deck };
    };
  });
}

const listRows = page => page.evaluate(() => Array.from(document.querySelectorAll('#deck-panel-modal [data-panel-open-note]')).map(r => r.dataset.panelOpenNote));
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const lang of ['fr', 'zh']){
    for (const vp of [{ width: 1200, height: 900 }, { width: 390, height: 760 }]){
      const tag = `${lang} ${vp.width}px`;
      const { page, errors, ctx } = await bootPage(browser, lang, port, 'light', vp);
      await setup(page);
      await stubOwn(page);
      await page.evaluate(() => {
        window.__uploads = [];
        uploadOwnFlashcardMedia = async (file, kind, fieldId) => { window.__uploads.push({ kind, type: file.type }); return { ok: true, url: 'https://x.supabase.co/storage/v1/object/public/flashcard-media/u/' + kind + '.png', path: 'u/' + kind + '.png' }; };
        switchTab('review');
      });
      await page.waitForSelector('#review-decks-table table.deck-table', { timeout: 8000 });

      // Adicionar: Deck de destino é o 1º controle; botão fixo no rodapé.
      await page.click('#review-deck-topbar-home [data-topbar-add]');
      await page.waitForSelector('#add-card-modal #my-flashcard-deck');
      const form = await page.evaluate(() => {
        const f = document.querySelector('#add-card-modal #my-create-flashcard-form');
        const first = f.querySelector('select, input, textarea');
        const bar = f.querySelector('.add-card-submit-bar');
        return { firstId: first && first.id, sticky: getComputedStyle(bar).position, hasBtn: !!bar.querySelector('#my-create-flashcard-btn') };
      });
      check(tag + ' Adicionar: Deck de destino primeiro', form.firstId === 'my-flashcard-deck', form);
      check(tag + ' Adicionar: Criar cartão no rodapé fixo', form.sticky === 'sticky' && form.hasBtn, form);
      // Com campos adicionados, o botão continua visível dentro da janela.
      await page.click('#add-card-modal [data-field-add]');
      await page.click('#add-card-modal [data-field-add]');
      await page.click('#add-card-modal [data-field-add]');
      const vis = await page.evaluate(() => {
        const m = document.querySelector('#add-card-modal .app-modal').getBoundingClientRect();
        const b = document.querySelector('#add-card-modal #my-create-flashcard-btn').getBoundingClientRect();
        return { inside: b.bottom <= m.bottom + 1 && b.top >= m.top, scrolls: document.querySelector('#add-card-modal .app-modal').scrollHeight > document.querySelector('#add-card-modal .app-modal').clientHeight };
      });
      check(tag + ' Adicionar: botão visível sem rolar', vis.inside, vis);

      // Imagem: só um link discreto até clicar.
      const img0 = await page.evaluate(() => {
        const b = document.querySelector('#add-card-modal [data-field-image-field]');
        return { link: b.querySelector('[data-field-image-pick]').textContent.trim(), input: b.querySelector('[data-field-image-input]').hidden, thumb: !!b.querySelector('img') };
      });
      check(tag + ' imagem: só o link discreto', img0.link === '🖼️ Imagem' && img0.input && !img0.thumb, img0);
      const fid = await page.evaluate(() => document.querySelector('#add-card-modal [data-field-image-field]').dataset.fieldImageField);
      const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
      await page.setInputFiles(`#add-card-modal [data-field-image-field="${fid}"] [data-field-image-input]`, { name: 'a.png', mimeType: 'image/png', buffer: png });
      await page.waitForSelector(`#add-card-modal [data-field-image-field="${fid}"] img`);
      const img1 = await page.evaluate((fid) => {
        const f = MY_FLASHCARDS_STATE.nativeCardState.fields.find(x => x.id === fid);
        const b = document.querySelector(`#add-card-modal [data-field-image-field="${fid}"]`);
        return { url: f.image && f.image.url, up: window.__uploads, btns: Array.from(b.querySelectorAll('.field-image-link')).map(x => x.textContent.trim()) };
      }, fid);
      check(tag + ' imagem: envia e grava no campo', /image\.png$/.test(img1.url || '') && img1.up.length === 1 && img1.up[0].kind === 'image', img1);
      check(tag + ' imagem: Trocar / Remover', img1.btns.join('|') === 'Trocar imagem|Remover', img1.btns);
      await page.setInputFiles(`#add-card-modal [data-field-image-field="${fid}"] [data-field-image-input]`, { name: 'a.txt', mimeType: 'text/plain', buffer: Buffer.from('x') });
      const bad = await page.evaluate((fid) => ({ err: document.querySelector(`#add-card-modal [data-field-image-field="${fid}"] [data-field-image-error]`).textContent, n: window.__uploads.length, url: MY_FLASHCARDS_STATE.nativeCardState.fields.find(x => x.id === fid).image.url }), fid);
      check(tag + ' imagem: formato inválido recusado sem perder a anterior', /JPG/.test(bad.err) && bad.n === 1 && /image\.png$/.test(bad.url), bad);
      await page.click(`#add-card-modal [data-field-image-field="${fid}"] [data-field-image-remove]`);
      const rm = await page.evaluate((fid) => MY_FLASHCARDS_STATE.nativeCardState.fields.find(x => x.id === fid).image, fid);
      check(tag + ' imagem: Remover tira a referência', rm === null, rm);
      if (vp.width === 390) await shot(page, `ajustes-add-${lang}-mobile`);
      await page.click('#add-card-modal [data-add-card-close]');

      // Nomes amigáveis das tags (Configurar e Painel).
      const labels = await page.evaluate(() => ({
        a: friendlyTagLabel('frances-geral'), b: friendlyTagLabel('modulo-1'), c: friendlyTagLabel('nivel-a1'), d: friendlyTagLabel('estudo'), e: friendlyTagLabel('verbo'), f: friendlyTagLabel('licao-3'),
      }));
      check(tag + ' nomes amigáveis', labels.a === 'Francês (geral)' && labels.b === 'Módulo 1' && labels.c === 'Nível A1' && labels.d === 'Trilha de Estudo' && labels.e === '#verbo' && labels.f === 'Lição 3', labels);
      await page.click('#review-deck-topbar-home [data-topbar-panel]');
      await page.waitForSelector('#deck-panel-modal [data-panel-tag]', { state: 'attached' });
      const chips = await page.evaluate(() => Array.from(document.querySelectorAll('#deck-panel-modal [data-panel-tag]')).map(b => ({ slug: b.dataset.panelTag, text: b.textContent.trim() })));
      const geral = chips.find(c => /-geral$/.test(c.slug));
      check(tag + ' Painel: tag geral com nome amigável', geral && !geral.text.startsWith('#') && /\(geral\)/.test(geral.text), chips.slice(0, 6));
      check(tag + ' Painel: tag do usuário continua com #', chips.some(c => c.slug === 'verbo' && c.text === '#verbo'), chips.slice(0, 10));
      check(tag + ' sem erros de página', errors.length === 0, errors);
      await ctx.close();
    }
  }
  await browser.close(); server.close();
  console.log(`\n${passed} passaram, ${failed} falharam`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

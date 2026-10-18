// Janelas da Revisão no Design System do painel (Pico, 2026-10-17): Configurar, Adicionar cartão, Painel e Exportar
// dentro de .painel; editor de campos em .p-editor sem a "ficha pautada"; divisórias da lista do Painel visíveis
// (no zh escuro a linha padrão sumia); X com 44px no celular; sem rolagem para o lado em 390px. fr e zh.
// Harness copiado de tests/deck-browser/test_playwright.js. Rodar: node tests/janelas-revisao/test_playwright.js
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
      // Unidade que o aluno nunca abriu: não pode aparecer como Deck.
      { id: 9202, kind: 'course', name: 'Unidade bloqueada', owner_id: null, language_app_key: A, parent_deck_id: 9200, course_unit_id: String((UNITS.find(u => u.id !== unit.id && (u.vocab || []).length) || {}).id) },
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
    const kidsIds = deckBrowserChildren(STATE.decks, 9200).map(d => d.id);
    return { lockedHidden: !kidsIds.includes(9202) && kidsIds.includes(9201), unitTitle: unit.title, courseCards: STATE.cards.filter(c => c.deckId === 9201).length };
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


// Cor do CSS -> [r, g, b, a] (aceita rgb(), rgba() e color(srgb r g b / a)); a linha é misturada ao fundo antes do contraste.
const parse = (c) => { let m = c.match(/color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)/);
  if (m) return [m[1] * 255, m[2] * 255, m[3] * 255, m[4] === undefined ? 1 : +m[4]];
  m = c.match(/[\d.]+/g).map(Number); return [m[0], m[1], m[2], m[3] === undefined ? 1 : m[3]]; };
const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
const ratio = (linha, fundo) => { const l = parse(linha), f = parse(fundo); const mix = [0, 1, 2].map(i => l[i] * l[3] + f[i] * (1 - l[3])); const x = lum(mix), y = lum(f); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const [lang, theme, mobile] of [['fr', 'light', false], ['zh', 'dark', false], ['fr', 'dark', false], ['zh', 'light', true]]){
    const L = `${lang} ${theme}${mobile ? ' celular' : ''}`;
    const vp = mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 };
    const { page, errors, ctx } = await bootPage(browser, lang, port, theme, vp);
    await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
    await setup(page); await stubOwn(page);
    await page.evaluate(() => switchTab('review'));
    await page.waitForSelector('#review-decks-table table.deck-table', { timeout: 8000 });
    // Configurar
    await page.evaluate(() => openReviewSettingsModal());
    check(L + ': Configurar dentro do painel', await page.evaluate(() => document.querySelector('.review-settings-modal').classList.contains('painel')));
    const x = await page.evaluate(() => { const b = document.querySelector('.review-settings-modal .app-modal-close').getBoundingClientRect(); return [b.width, b.height]; });
    check(L + ': X com área de toque ' + (mobile ? '44px' : 'normal') + ' ' + x, mobile ? (x[0] >= 44 && x[1] >= 44) : x[0] >= 32);
    await page.evaluate(() => closeReviewSettingsModal());
    // Adicionar
    await page.evaluate(() => openDeckDetail(9004));
    await page.click('#review-deck-wrap [data-topbar-add]');
    await page.waitForFunction(() => { const s = document.querySelector('#add-card-modal #my-flashcard-deck'); return s && s.value === '9004'; });
    const add = await page.evaluate(() => { const ta = document.querySelector('#add-card-modal [data-field-content]'); const cs = getComputedStyle(ta);
      return { painel: document.querySelector('#add-card-modal .app-modal').classList.contains('painel'), editor: document.getElementById('add-card-modal-body').classList.contains('p-editor'), pauta: cs.backgroundImage, borda: cs.borderTopStyle,
        criar: getComputedStyle(document.querySelector('#add-card-modal button.btn-primary')).borderRadius, over: document.documentElement.scrollWidth - innerWidth }; });
    check(L + ': Adicionar no painel com o editor da Professora', add.painel && add.editor, add);
    check(L + ': campo sem a ficha pautada e com borda', add.pauta === 'none' && add.borda === 'solid', add);
    check(L + ': Criar cartão em pílula', parseFloat(add.criar) >= 20, add);
    check(L + ': sem rolagem para o lado', add.over <= 0, add);
    await page.evaluate(() => document.querySelector('#add-card-modal [data-add-card-close]').click());
    await page.evaluate(() => switchTab('review'));
    // Painel
    await page.evaluate(() => openDeckPanel(9001));
    await page.waitForSelector('#deck-panel-modal [data-panel-open-note]');
    const pn = await page.evaluate(() => { const it = document.querySelector('#deck-panel-modal .deck-panel-item:not(.is-active)') || document.querySelector('#deck-panel-modal .deck-panel-item');
      let bg = 'rgba(0, 0, 0, 0)', el = it; while (el && /rgba\(0, 0, 0, 0\)|transparent/.test(bg)){ bg = getComputedStyle(el).backgroundColor; el = el.parentElement; }
      return { painel: document.querySelector('#deck-panel-modal .app-modal').classList.contains('painel'), editor: document.querySelector('#deck-panel-modal .deck-panel-editor').classList.contains('p-editor'), linha: getComputedStyle(it).borderBottomColor, fundo: bg }; });
    check(L + ': Painel no painel com o editor da Professora', pn.painel && pn.editor, pn);
    const r = ratio(pn.linha, pn.fundo);
    check(L + ': divisória da lista visível sobre o fundo (contraste ' + r.toFixed(2) + ')', r >= 1.25, pn);
    await page.click('#deck-panel-modal [data-panel-close]');
    // Exportar
    await page.evaluate(() => { switchTab('review'); document.querySelector('#review-deck-topbar-home .deck-more-menu').open = true; document.querySelector('#review-deck-topbar-home [data-deck-export]').click(); });
    await page.waitForFunction(() => { const m = document.getElementById('my-flashcards-export-modal'); return m && getComputedStyle(m).display !== 'none'; });
    check(L + ': Exportar no painel', await page.evaluate(() => document.querySelector('#my-flashcards-export-modal .app-modal').classList.contains('painel')));
    check(L + ': sem erros na página', errors.length === 0, errors);
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(`Janelas da Revisão (painel): ${passed} ok, ${failed} falhas`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

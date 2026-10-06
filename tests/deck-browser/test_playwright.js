// Navegador de Decks (shared/deck-browser.js): barra do topo (Decks |
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
    console.log('== ' + lang);
    const { page, errors, ctx } = await bootPage(browser, lang, port);
    const s = await setup(page);
    await stubOwn(page);
    check(lang + ' setup: cartões da trilha no Course Deck da unidade', s.courseCards > 0, s);

    // ---- 0) Meus Cartões não existe mais ----
    const gone = await page.evaluate(() => ({ btn: !!document.getElementById('review-my-flashcards-btn'), route: hashToRoute('#/my-flashcards'), imp: hashToRoute('#import=abc') }));
    check(lang + ' sem botão Meus Cartões; endereço antigo abre a Revisão', !gone.btn && gone.route.tab === 'review' && gone.imp.tab === 'review', gone);

    // ---- 1) Tabela + barra do topo ----
    await page.evaluate(() => switchTab('review'));
    await page.waitForSelector('#review-decks-table table.deck-table', { timeout: 8000 });
    const table = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('#review-decks-table tbody tr')).map(tr => ({
        id: tr.dataset.deckRow, name: tr.querySelector('.deck-table-link').textContent,
        nums: Array.from(tr.querySelectorAll('.deck-table-num')).map(td => Number(td.textContent)),
      }));
      const head = Array.from(document.querySelectorAll('#review-decks-table th')).map(th => th.textContent);
      const num = document.querySelector('#review-decks-table .deck-table-num'), th = document.querySelectorAll('#review-decks-table th')[1];
      const bar = document.querySelector('#review-deck-topbar-home .deck-topbar');
      const wrap = document.getElementById('review-mode-select-wrap').getBoundingClientRect();
      const b = bar.getBoundingClientRect();
      return { rows, head, studyBtns: document.querySelectorAll('#review-decks-table [data-study-deck], #review-decks-table .btn-primary').length,
        align: [getComputedStyle(num).textAlign, getComputedStyle(th).textAlign],
        bar: Array.from(bar.querySelectorAll('button')).map(x => x.textContent.trim()), barCenter: Math.abs((b.left + b.right) / 2 - (wrap.left + wrap.right) / 2),
        homeBtns: Array.from(document.querySelectorAll('#review-decks-table .deck-home-actions button')).map(x => x.textContent.trim()) };
    });
    check(lang + ' cabeçalho Deck|Novo|Aprendendo|Revisar', table.head.join('|') === 'Deck|Novo|Aprendendo|Revisar', table.head);
    const ids = table.rows.map(r => r.id);
    check(lang + ' sem linha da raiz do idioma; começa pela Trilha de Estudo', !ids.includes('lang') && ids[0] === '9200' && table.rows[0].name === 'Trilha de Estudo', table.rows[0]);
    check(lang + ' mostra Meus Decks, professora e subdecks pessoais', ['9001', '9100', '9002', '9003', '9004'].every(i => ids.includes(i)), ids);
    check(lang + ' Trilha começa fechada', !ids.includes('9201'), ids);
    check(lang + ' sem botão Estudar na tabela', table.studyBtns === 0, table.studyBtns);
    check(lang + ' números centralizados embaixo das colunas', table.align.join() === 'center,center', table.align);
    check(lang + ' barra do topo: Decks | Adicionar | Painel, centralizada', table.bar.join('|') === 'Decks|Adicionar|Painel' && table.barCenter < 3, table);

    // ---- 1b) Outros modos numa fileira só; sem bloco Flashcard ----
    const modes = await page.evaluate(() => {
      const row = document.getElementById('review-mode-cards-praticar');
      const cards = Array.from(row.querySelectorAll('.review-mode-card'));
      const tops = cards.map(c => Math.round(c.getBoundingClientRect().top));
      return { ids: cards.map(c => c.id), sameRow: new Set(tops).size === 1, flash: !!document.getElementById('mode-card-flashcard'),
        revisar: !!document.getElementById('review-mode-cards-revisar'), studyAll: !!document.getElementById('review-study-all-btn'),
        widget: document.getElementById('review-today-widget').textContent };
    });
    check(lang + ' Speed Review, Palavras difíceis e Combinar na mesma fileira', modes.ids.join() === 'mode-card-speed,mode-card-hard,mode-card-match' && modes.sameRow, modes);
    const speed = await page.evaluate(() => {
      const spans = Array.from(document.querySelectorAll('#mode-card-speed .speed-split span')).map(s => Number(s.textContent));
      const q = getStudyQueue(eligibleReviewPool(), { scope: 'due', newCardsLimit: STATE.studySettings.newCardsPerDay });
      const exp = [0, 0, 0];
      q.forEach(c => { exp[['new', 'learning', 'review'].indexOf(cardStudyBucket(c))]++; });
      const sp = document.querySelector('#mode-card-speed .speed-split').getBoundingClientRect();
      const card = document.getElementById('mode-card-speed').getBoundingClientRect();
      return { spans, exp, fits: sp.width <= card.width, legend: (document.querySelector('#mode-card-speed .speed-split-legend') || {}).textContent };
    });
    check(lang + ' Speed Review mostra Novo/Aprendendo/Revisar da sessão, cabendo no card', speed.spans.join() === speed.exp.join() && speed.fits && /novo/.test(speed.legend || ''), speed);
    check(lang + ' sem bloco Flashcard nem seção Revisar', !modes.flash && !modes.revisar, modes);
    check(lang + ' com revisões pendentes há "Estudar tudo"; sem elas, aviso de em dia', modes.studyAll || /em dia|Ainda não há/.test(modes.widget), modes);

    // ---- 1c) Sem vínculo ativo com professora: "Cartões da professora" some ----
    const noLink = await page.evaluate(async () => {
      window.__DB.teacher_students[0].status = 'removed';
      DECK_BROWSER.teacherLink = {};
      await renderReviewDeckTable();
      const ids = Array.from(document.querySelectorAll('#review-decks-table tbody tr')).map(tr => tr.dataset.deckRow);
      window.__DB.teacher_students[0].status = 'active';
      DECK_BROWSER.teacherLink = {};
      await renderReviewDeckTable();
      const back = Array.from(document.querySelectorAll('#review-decks-table tbody tr')).map(tr => tr.dataset.deckRow);
      return { ids, back };
    });
    check(lang + ' sem vínculo ativo: Cartões da professora não aparece', !noLink.ids.includes('9100') && noLink.ids.includes('9001'), noLink);
    check(lang + ' com vínculo ativo: volta a aparecer', noLink.back.includes('9100'), noLink);

    check(lang + ' embaixo da tabela: Criar Deck, Importar arquivo, Exportar', table.homeBtns.join('|') === 'Criar Deck|Importar arquivo|Exportar', table.homeBtns);
    const meus = await page.evaluate(() => getDeckCounts(STATE.decks, 9001, eligibleDeckReviewPool()).new);
    check(lang + ' Novo de Meus Decks = 4', table.rows.find(r => r.id === '9001').nums[0] === 4 && meus === 4, table.rows.find(r => r.id === '9001'));
    await page.click('[data-deck-toggle="9200"]');
    check(lang + ' abrir a Trilha mostra a unidade', (await page.evaluate(() => Array.from(document.querySelectorAll('#review-decks-table tbody tr')).map(tr => tr.dataset.deckRow))).includes('9201'));
    if (lang === 'fr') await shot(page, 'deck-home-fr');

    // ---- 1b) Criar Deck ----
    await page.click('[data-deck-create]');
    await page.fill('#deck-create-name', 'Viagem');
    await page.click('[data-deck-create-save]');
    await page.waitForFunction(() => STATE.decks.some(d => d.name === 'Viagem'));
    const created = await page.evaluate(() => Array.from(document.querySelectorAll('#review-decks-table .deck-table-link')).map(b => b.textContent));
    check(lang + ' Criar Deck: aparece na tabela', created.includes('Viagem'), created);

    // ---- 2) Tela do Deck ----
    await page.click('[data-deck-open="9002"]');
    const detail = await page.evaluate(() => {
      const w = document.getElementById('review-deck-wrap');
      return { visible: w.style.display !== 'none', modesHidden: document.getElementById('review-mode-select-wrap').style.display === 'none',
        title: w.querySelector('.deck-overview-title').textContent,
        labels: Array.from(w.querySelectorAll('.deck-overview-counts dt')).map(n => n.textContent),
        nums: Array.from(w.querySelectorAll('.deck-overview-counts dd')).map(n => Number(n.textContent)),
        study: !!w.querySelector('[data-deck-study]'), bar: Array.from(w.querySelectorAll('.deck-topbar button')).map(b => b.textContent.trim()),
        footer: Array.from(w.querySelectorAll('.deck-overview-footer button')).map(b => b.textContent.trim()), hash: location.hash };
    });
    check(lang + ' tela do Deck no lugar da tela de modos', detail.visible && detail.modesHidden, detail);
    check(lang + ' tela do Deck: nome com caminho', detail.title === 'Meus Decks › Verbos', detail.title);
    check(lang + ' tela do Deck: Novo/Aprendendo/Revisar + Estudar agora', detail.labels.join('|') === 'Novo:|Aprendendo:|Revisar:' && detail.nums[0] === 2 && detail.study, detail);
    check(lang + ' tela do Deck: mesma barra do topo', detail.bar.join('|') === 'Decks|Adicionar|Painel', detail.bar);
    check(lang + ' tela do Deck pessoal: Criar subdeck, Renomear, Publicar, Excluir', ['Criar subdeck', 'Renomear', 'Excluir'].every(b => detail.footer.includes(b)) && detail.footer.some(b => /Publicar|Público/.test(b)), detail.footer);
    check(lang + ' tela do Deck tem endereço próprio', detail.hash === '#/review/decks/9002', detail.hash);
    if (lang === 'fr') await shot(page, 'deck-detail-fr');
    await page.click('[data-deck-study]');
    const sess = await page.evaluate(() => ({ deck: STATE.reviewSessionDeckId, n: STATE.reviewQueue.length, ids: STATE.reviewQueue.map(c => c.rowId).sort() }));
    check(lang + ' Estudar agora: Deck + subdecks', sess.deck === 9002 && sess.n === 2 && sess.ids.join() === '501,502', sess);
    await page.click('#flashcard');
    const reveal = await page.evaluate(() => ({ grades: document.querySelectorAll('#review-content .grade-btn').length, more: !!document.getElementById('review-more-btn'), txt: document.getElementById('review-content').textContent.includes('Rever mais') }));
    check(lang + ' cartão revelado: 4 notas e sem "Rever mais"', reveal.grades === 4 && !reveal.more && !reveal.txt, reveal);
    await page.evaluate(() => backToReviewModeSelect());

    // Renomear
    await page.evaluate(() => openDeckDetail(9002));
    await page.evaluate(() => { renamePersonalDeck = async () => ({ ok: true }); });
    await page.click('[data-deck-rename]');
    await page.fill('#deck-rename-name', 'Verbos 2');
    await page.click('[data-deck-rename-save]');
    await page.waitForFunction(() => document.querySelector('.deck-overview-title').textContent.includes('Verbos 2'));
    check(lang + ' Renomear muda o nome na tela', true);
    await page.evaluate(() => { STATE.decks.find(d => d.id === 9002).name = 'Verbos'; });

    // Trilha: sem rodapé de Deck pessoal, com aviso; Adicionar vai para Meus Decks
    await page.evaluate(() => openDeckDetail(9201));
    const course = await page.evaluate(() => { const w = document.getElementById('review-deck-wrap'); return { footer: !!w.querySelector('.deck-overview-footer'), hint: w.textContent.includes('vêm das lições'), title: w.querySelector('.deck-overview-title').textContent }; });
    check(lang + ' tela da unidade da Trilha: sem botões de Deck pessoal, com aviso', !course.footer && course.hint && course.title.startsWith('Trilha de Estudo › '), course);
    await page.click('#review-deck-wrap [data-topbar-add]');
    await page.waitForSelector('#add-card-modal #my-flashcard-deck');
    check(lang + ' Adicionar na Trilha usa Meus Decks', await page.evaluate(() => document.querySelector('#add-card-modal #my-flashcard-deck').value) === '9001');
    await page.keyboard.press('Escape');

    // ---- 3) Adicionar: janela com o Deck da tela, campos já com idioma ----
    await page.evaluate(() => openDeckDetail(9004));
    await page.click('#review-deck-wrap [data-topbar-add]');
    await page.waitForFunction(() => { const s = document.querySelector('#add-card-modal #my-flashcard-deck'); return s && s.value === '9004'; });
    const add = await page.evaluate(() => ({ tab: document.getElementById('app').dataset.activeTab, langs: Array.from(document.querySelectorAll('#add-card-modal [data-field-lang]')).map(s => s.value), study: STUDY_LANG_FOR_APP_KEY[APP_KEY] }));
    check(lang + ' Adicionar: janela por cima, com o Deck da tela', add.tab === 'review', add);
    check(lang + ' Adicionar: 2 campos, 1º no idioma estudado e 2º em português', add.langs.join() === add.study + ',pt-BR', add);
    const inputs = await page.$$('#add-card-modal [data-field-content]');
    await inputs[0].fill('fromage'); await inputs[1].fill('queijo');
    if (lang === 'fr') await shot(page, 'deck-add-fr');
    await page.click('#add-card-modal #my-create-flashcard-btn');
    await page.waitForFunction(() => window.__created.length === 1 && document.querySelector('#add-card-modal .add-card-done'), null, { timeout: 8000 });
    const made = await page.evaluate(() => ({ row: window.__created[0], inState: STATE.cards.some(c => c.origin === 'self' && c.rowId === window.__created[0].id && c.deckId === 9004),
      stillOpen: !!document.getElementById('add-card-modal'), empty: Array.from(document.querySelectorAll('#add-card-modal [data-field-content]')).every(i => !i.value), deck: document.querySelector('#add-card-modal #my-flashcard-deck').value }));
    check(lang + ' Adicionar: cria no Deck e entra no STATE', made.row.deck_id === 9004 && made.inState, made);
    check(lang + ' Adicionar: continua aberta, limpa, no mesmo Deck', made.stillOpen && made.empty && made.deck === '9004', made);
    await page.click('#add-card-modal [data-add-card-close]');
    const afterClose = await page.evaluate(() => ({ modal: !!document.getElementById('add-card-modal'), novo: Number(document.querySelector('#review-deck-wrap .deck-overview-counts dd').textContent) }));
    check(lang + ' fechar atualiza a contagem (Comida: 2 -> 3)', !afterClose.modal && afterClose.novo === 3, afterClose);
    await page.evaluate(() => { STATE.cards = STATE.cards.filter(c => !(c.origin === 'self' && c.rowId === 700)); window.__DB.own_flashcards = window.__DB.own_flashcards.filter(r => r.id !== 700); });

    // ---- 4) Painel em janela ----
    await page.evaluate(() => openDeckDetail(9001));
    await page.click('#review-deck-wrap [data-topbar-panel]');
    await page.waitForSelector('#deck-panel-modal [data-panel-open-note]');
    await page.waitForFunction(() => DECK_BROWSER.panel && DECK_BROWSER.panel.ctx);
    const panel = await page.evaluate(() => ({
      overlay: !!document.querySelector('#deck-panel-modal.app-modal-overlay'), under: document.getElementById('review-deck-wrap').style.display === 'block',
      hash: location.hash, side: Array.from(document.querySelectorAll('#deck-panel-modal [data-panel-scope]')).map(b => b.textContent),
      active: document.querySelector('#deck-panel-modal [data-panel-scope].is-active').dataset.panelScope,
      tags: Array.from(document.querySelectorAll('#deck-panel-modal [data-panel-tag]')).map(b => b.dataset.panelTag).sort(),
      cols: getComputedStyle(document.querySelector('#deck-panel-modal [data-panel-grid]')).gridTemplateColumns.split(' ').length }));
    check(lang + ' Painel abre em janela por cima da tela do Deck', panel.overlay && panel.under && panel.hash === '#/review/decks/9001/panel', panel);
    check(lang + ' Painel: 3 colunas (filtros, lista, editor)', panel.cols === 3, panel.cols);
    check(lang + ' Painel: lateral com os Decks, começando no Deck aberto', panel.side.includes('Todos os Decks') && panel.side.includes('Meus Decks') && panel.side.includes('Trilha de Estudo') && panel.active === '9001', panel);
    check(lang + ' Painel: unidades da Trilha só aparecem com a Trilha selecionada', !panel.side.some(t => t === s.unitTitle), panel.side);
    check(lang + ' Painel: tags do escopo na lateral', panel.tags.join() === 'comida,irregular,verbo', panel.tags);
    check(lang + ' Painel: 4 Notes de Meus Decks', (await listRows(page)).length === 4);
    await page.fill('[data-panel-search]', 'pão');
    check(lang + ' busca pelo verso (pão -> 1)', (await listRows(page)).length === 1);
    await page.fill('[data-panel-search]', '');
    await page.click('#deck-panel-modal [data-panel-tag="verbo"]');
    check(lang + ' filtro #verbo -> 2', (await listRows(page)).length === 2);
    await page.click('#deck-panel-modal [data-panel-tag="comida"]');
    check(lang + ' 2 tags = OU -> 3', (await listRows(page)).length === 3);
    await page.click('#deck-panel-modal [data-panel-tag="verbo"]'); await page.click('#deck-panel-modal [data-panel-tag="comida"]');
    await page.click('#deck-panel-modal [data-panel-state="Aprendendo"]');
    check(lang + ' filtro de estado Aprendendo -> 0', (await listRows(page)).length === 0);
    await page.click('#deck-panel-modal [data-panel-state="all"]');
    await page.click('#deck-panel-modal [data-panel-scope="9002"]');
    check(lang + ' clicar num Deck da lateral muda o escopo (Verbos -> 2)', (await listRows(page)).length === 2);
    await page.click('#deck-panel-modal [data-panel-scope="9001"]');

    // Editor: clicar num cartão abre o editor à direita; salvar grava
    await page.click('#deck-panel-modal [data-panel-open-note="self:501"]');
    await page.waitForSelector('#deck-panel-modal #edit-my-native-flashcard-save');
    if (lang === 'fr') await shot(page, 'deck-panel-fr');
    const ed = await page.evaluate(() => ({ active: document.querySelector('#deck-panel-modal .deck-panel-item.is-active').dataset.panelOpenNote,
      vals: Array.from(document.querySelectorAll('#deck-panel-modal [data-panel-editor] [data-field-content]')).map(i => i.value) }));
    check(lang + ' editor mostra o cartão escolhido', ed.active === 'self:501' && ed.vals.includes('aller') && ed.vals.includes('ir'), ed);
    const fields = await page.$$('#deck-panel-modal [data-panel-editor] [data-field-content]');
    await fields[1].fill('ir (verbo)');
    await page.click('#deck-panel-modal #edit-my-native-flashcard-save');
    // Cartão antigo convertido ao editar: pede para confirmar o reinício do progresso.
    await page.click('#flashcard-reset-confirm-yes');
    await page.waitForFunction(() => window.__updated.length === 1);
    await page.waitForFunction(() => document.querySelector('#deck-panel-modal [data-panel-open-note="self:501"] .deck-panel-back') && document.querySelector('#deck-panel-modal [data-panel-open-note="self:501"] .deck-panel-back').textContent === 'ir (verbo)', null, { timeout: 8000 });
    const saved = await page.evaluate(() => ({ u: window.__updated[0], open: !!document.getElementById('deck-panel-modal'), still: !!document.querySelector('#deck-panel-modal #edit-my-native-flashcard-save') }));
    check(lang + ' salvar no Painel grava a Note, atualiza a lista e mantém a janela', saved.u.id === 501 && saved.open && saved.still, saved);

    // Cartão da professora: só leitura
    await page.click('#deck-panel-modal [data-panel-scope="9100"]');
    await page.click('#deck-panel-modal [data-panel-open-note="teacher:601"]');
    const ro = await page.evaluate(() => { const p = document.querySelector('#deck-panel-modal [data-panel-editor]'); return { cbs: document.querySelectorAll('#deck-panel-modal [data-panel-select]').length, form: !!p.querySelector('textarea, input[type=text]'), text: p.textContent }; });
    check(lang + ' cartão da professora: só leitura', ro.cbs === 0 && !ro.form && ro.text.includes('prof') && ro.text.includes('Somente') === false && ro.text.includes('só ela pode editar'), ro);

    // Gerenciar tags abre no lado direito
    await page.click('#deck-panel-modal [data-panel-manage-tags]');
    check(lang + ' Gerenciar tags abre no Painel', await page.evaluate(() => !!document.querySelector('#deck-panel-modal [data-panel-tag-manager]')));

    // Mover vários
    await page.click('#deck-panel-modal [data-panel-scope="9001"]');
    await page.check('#deck-panel-modal [data-panel-select="self:501"]');
    await page.check('#deck-panel-modal [data-panel-select="self:503"]');
    await page.selectOption('#deck-panel-modal [data-panel-move-target]', '9004');
    await page.evaluate(() => { window.__writes = []; });
    await page.click('#deck-panel-modal [data-panel-move]');
    await page.waitForFunction(() => window.__writes.length >= 2);
    const moved = await page.evaluate(() => ({ writes: window.__writes, state: STATE.cards.filter(c => c.origin === 'self' && [501, 503].includes(c.rowId)).map(c => c.deckId) }));
    check(lang + ' mover: 1 UPDATE de deck_id por Note', moved.writes.length === 2 && moved.writes.every(w => w.table === 'own_flashcards' && Object.keys(w.patch).join() === 'deck_id' && w.patch.deck_id === 9004), moved.writes);
    check(lang + ' mover: STATE.cards atualizado', moved.state.every(d => d === 9004), moved.state);
    // Excluir vários
    await page.check('#deck-panel-modal [data-panel-select="self:504"]');
    await page.evaluate(() => { window.__writes = []; });
    await page.click('#deck-panel-modal [data-panel-delete]');
    await page.waitForFunction(() => window.__writes.some(w => w.op === 'delete'));
    check(lang + ' excluir vários: apaga e tira da fila', await page.evaluate(() => !STATE.cards.some(c => c.origin === 'self' && c.rowId === 504)));

    // Fechar volta à tela do Deck
    await page.click('#deck-panel-modal [data-panel-close]');
    const closed = await page.evaluate(() => ({ modal: !!document.getElementById('deck-panel-modal'), hash: location.hash, view: DECK_BROWSER.view }));
    check(lang + ' fechar o Painel volta à tela do Deck', !closed.modal && closed.hash === '#/review/decks/9001' && closed.view === 'detail', closed);
    // Esc também fecha
    await page.click('#review-deck-wrap [data-topbar-panel]');
    await page.waitForSelector('#deck-panel-modal');
    await page.keyboard.press('Escape');
    check(lang + ' Esc fecha o Painel', await page.evaluate(() => !document.getElementById('deck-panel-modal')));

    // Painel da tela inicial: todos os Decks; tags finas da Trilha não viram botão
    await page.evaluate(() => backToDeckTable());
    await page.click('#review-deck-topbar-home [data-topbar-panel]');
    await page.waitForSelector('#deck-panel-modal [data-panel-open-note]');
    const root = await page.evaluate(() => ({ scope: DECK_BROWSER.panel.scopeId, hash: location.hash, chips: Array.from(document.querySelectorAll('#deck-panel-modal [data-panel-tag]')).map(b => b.dataset.panelTag) }));
    check(lang + ' Painel da tela inicial: todos os Decks', root.scope === 'lang' && root.hash === '#/review/decks/lang/panel', root);
    check(lang + ' sem botões unidade-*/licao-*', !root.chips.some(t => /^(unidade|licao)-/.test(t)), root.chips.slice(0, 30));
    await page.fill('[data-panel-search]', 'licao-1');
    check(lang + ' busca por licao-1 encontra a Trilha', (await listRows(page)).length > 0);
    await page.click('#deck-panel-modal [data-panel-open-note^="study:"]');
    check(lang + ' cartão da Trilha: só leitura', await page.evaluate(() => document.querySelector('#deck-panel-modal [data-panel-editor]').textContent.includes('vêm das lições')));
    await page.click('#deck-panel-modal [data-panel-close]');
    check(lang + ' fechar o Painel da tela inicial volta à tabela', await page.evaluate(() => DECK_BROWSER.view === 'home' && location.hash === '#/review'));

    // ---- 5) Exportar e Importar ----
    await page.click('#review-decks-table [data-deck-export]');
    await page.waitForFunction(() => { const m = document.getElementById('my-flashcards-export-modal'); return m && getComputedStyle(m).display !== 'none'; });
    check(lang + ' Exportar abre a janela de exportação', true);
    await page.evaluate(() => { document.getElementById('my-flashcards-export-modal').style.display = 'none'; });
    const payload = JSON.stringify({ languageAppKey: await page.evaluate(() => APP_KEY), cards: [{ front: 'chat', backTrans: 'gato', frontIsTargetLanguage: true }] });
    await page.evaluate(() => { window.__created = []; resolveOwnCreationDeck = async () => ({ ok: true, deckId: 9001, decks: STATE.decks }); });
    await page.setInputFiles('#review-decks-table [data-deck-import-file]', { name: 'cartoes.json', mimeType: 'application/json', buffer: Buffer.from(payload) });
    await page.waitForFunction(() => window.__created.length === 1, null, { timeout: 8000 });
    check(lang + ' Importar arquivo (.json) cria o cartão', await page.evaluate(() => window.__created[0].deck_id === 9001 && STATE.cards.some(c => c.origin === 'self' && c.rowId === window.__created[0].id)));

    // ---- 6) Endereços ----
    await page.evaluate(() => renderRoute(hashToRoute('#/review/decks/9002/panel')));
    await page.waitForFunction(() => DECK_BROWSER.panelOpen && document.querySelector('#deck-panel-modal [data-panel-open-note]'), null, { timeout: 8000 });
    check(lang + ' #/review/decks/9002/panel abre o Deck com o Painel por cima', await page.evaluate(() => DECK_BROWSER.view === 'detail' && DECK_BROWSER.nodeId === 9002 && DECK_BROWSER.panel.scopeId === 9002));
    await page.evaluate(() => renderRoute(hashToRoute('#/review/decks/99999')));
    await page.waitForTimeout(300);
    check(lang + ' Deck inexistente volta para a tabela (e fecha o Painel)', await page.evaluate(() => DECK_BROWSER.view === 'home' && !document.getElementById('deck-panel-modal')));

    // ---- 7) Excluir Deck pessoal ----
    // Estado: Verbos(9002) tem 502 (em Irregulares); 501/503 foram para Comida.
    await page.evaluate(() => openDeckDetail(9002));
    await page.click('[data-deck-delete]');
    const dlg = await page.evaluate(() => {
      const w = document.getElementById('review-deck-wrap');
      return { text: w.querySelector('.deck-delete-dialog').textContent, opts: Array.from(w.querySelectorAll('#deck-delete-target option')).map(o => o.value) };
    });
    check(lang + ' diálogo: mensagem da seção 5.4', dlg.text.includes('Excluir este deck irá excluir todos os cartões dentro dele') && dlg.text.includes('Mover para outro deck') && dlg.text.includes('Excluir permanentemente'), dlg.text);
    check(lang + ' diálogo: subárvore fora dos destinos', !dlg.opts.includes('9002') && !dlg.opts.includes('9003') && dlg.opts.includes('9001') && dlg.opts.includes('9004'), dlg.opts);
    await page.selectOption('#deck-delete-target', '9001');
    await page.evaluate(() => { window.__writes = []; });
    await page.click('[data-deck-delete-move]');
    await page.waitForFunction(() => document.getElementById('review-mode-select-wrap').style.display === 'block');
    const mv = await page.evaluate(() => ({ w: window.__writes, decks: STATE.decks.map(d => d.id), card502: STATE.cards.filter(c => c.origin === 'self' && c.rowId === 502).map(c => c.deckId) }));
    check(lang + ' mover: UPDATE de deck_id na subárvore, depois DELETE do Deck', mv.w[0].op === 'update' && mv.w[0].patch.deck_id === 9001 && mv.w[0].ids.join() === '502' && mv.w[1].table === 'decks' && mv.w[1].op === 'delete' && mv.w[1].ids.join() === '9002', mv.w);
    check(lang + ' mover: Deck e subdeck saem; cartão vai para Meus Decks', !mv.decks.includes(9002) && !mv.decks.includes(9003) && mv.card502.every(d => d === 9001), mv);
    await page.evaluate(() => openDeckDetail(9004));
    await page.click('[data-deck-delete]');
    await page.evaluate(() => { window.__writes = []; });
    await page.click('[data-deck-delete-perm]');
    await page.waitForFunction(() => document.getElementById('review-mode-select-wrap').style.display === 'block');
    const pd = await page.evaluate(() => ({ w: window.__writes, left: STATE.cards.filter(c => c.origin === 'self').map(c => c.rowId) }));
    check(lang + ' excluir permanentemente: DELETE das Notes + DELETE do Deck', pd.w[0].table === 'own_flashcards' && pd.w[0].op === 'delete' && pd.w[0].ids.sort().join() === '501,503' && pd.w[1].table === 'decks', pd.w);
    check(lang + ' excluir permanentemente: cartões saem do estado', !pd.left.includes(501) && !pd.left.includes(503), pd.left);
    const guard = await page.evaluate(async () => {
      const r1 = await deletePersonalDeckTree({ deck: STATE.decks.find(d => d.id === 9001), decks: STATE.decks, mode: 'delete' });
      STATE.decks.push({ id: 9300, kind: 'personal', name: 'X', owner_id: 'u-db', language_app_key: APP_KEY, parent_deck_id: 9001 });
      STATE.decks.push({ id: 9301, kind: 'personal', name: 'Y', owner_id: 'u-db', language_app_key: APP_KEY, parent_deck_id: 9300 });
      const r2 = await deletePersonalDeckTree({ deck: STATE.decks.find(d => d.id === 9300), decks: STATE.decks, mode: 'move', destination: STATE.decks.find(d => d.id === 9301) });
      return { r1: r1.ok, r2: r2.ok };
    });
    check(lang + ' guarda: Meus Decks não é excluível; destino dentro da subárvore recusado', guard.r1 === false && guard.r2 === false, guard);

    // XSS: aspas no nome do Deck e na frente do cartão não viram atributo
    const xss = await page.evaluate(async () => {
      STATE.decks.push({ id: 9400, kind: 'personal', name: 'x" onmouseover="window.__xss=1" y="', owner_id: 'u-db', language_app_key: APP_KEY, parent_deck_id: 9001 });
      STATE.decks.push({ id: 9401, kind: 'personal', name: 'filho', owner_id: 'u-db', language_app_key: APP_KEY, parent_deck_id: 9400 });
      buildCardFromSelfFlashcard({ id: 777, owner_id: 'u-db', language_app_key: APP_KEY, status: 'active', revision: 0, front: 'a" onfocus="window.__xss=2" b="', back_trans: 'z', front_is_target_language: true, tags: [], deck_id: 9400 }).forEach(c => STATE.cards.push(c));
      document.getElementById('review-decks-table').innerHTML = deckBrowserTableHTML();
      const t = document.querySelector('[data-deck-toggle="9400"]');
      openDeckPanel(9400);
      const cb = document.querySelector('[data-panel-select="self:777"]');
      const res = { tAttrs: t ? t.getAttributeNames() : [], cbAttrs: cb ? cb.getAttributeNames() : [] };
      closeDeckPanel({ silent: true });
      return res;
    });
    check(lang + ' XSS: aspas não criam atributo', !xss.tAttrs.includes('onmouseover') && !xss.cbAttrs.includes('onfocus') && xss.tAttrs.length > 0 && xss.cbAttrs.length > 0, xss);
    const mism = await page.evaluate(async () => {
      window.__writes = [];
      const r = await deletePersonalDeckTree({ deck: STATE.decks.find(d => d.id === 9400), decks: STATE.decks, mode: 'delete', expectedNotes: 1 });
      return { ok: r.ok, writes: window.__writes.length };
    });
    check(lang + ' excluir: banco diverge da tela -> nada é alterado', mism.ok === false && mism.writes === 0, mism);

    // Campos novos: idioma padrão
    const defaults = await page.evaluate(() => {
      const st = createNativeNoteEditorState({ cardGenerationMode: 'normal', languageAppKey: APP_KEY });
      const a = addFieldToEditorState(st, {}), b = addFieldToEditorState(st, {}), p = addFieldToEditorState(st, { role: 'prompt' }), d = addFieldToEditorState(st, { role: 'distractor' });
      const none = addFieldToEditorState(createNativeNoteEditorState({ cardGenerationMode: 'normal' }), {});
      return [a.lang, b.lang, p.lang, d.lang, none.lang, STUDY_LANG_FOR_APP_KEY[APP_KEY]];
    });
    check(lang + ' idioma padrão: 1º estudado, 2º pt-BR, pergunta estudado, opção pt-BR, sem site = vazio', defaults[0] === defaults[5] && defaults[1] === 'pt-BR' && defaults[2] === defaults[5] && defaults[3] === 'pt-BR' && defaults[4] == null, defaults);

    check(lang + ' sem erros de página', errors.length === 0, errors);
    // F5 com o Painel aberto (da tela inicial: depois do F5 a sessão de teste
    // volta a ser convidada, sem os Decks pessoais montados no setup)
    await page.evaluate(() => { openDeckPanel('lang'); });
    await page.reload();
    await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0, null, { timeout: 15000 });
    await page.waitForFunction(() => typeof DECK_BROWSER !== 'undefined' && DECK_BROWSER.panelOpen, null, { timeout: 8000 }).catch(() => {});
    const reloaded = await page.evaluate(() => ({ open: DECK_BROWSER.panelOpen, node: DECK_BROWSER.panel && DECK_BROWSER.panel.nodeId, hash: location.hash, tab: document.getElementById('app').dataset.activeTab, modal: !!document.getElementById('deck-panel-modal') }));
    check(lang + ' F5 com o Painel: reabre o Painel', reloaded.open && reloaded.node === 'lang' && reloaded.hash === '#/review/decks/lang/panel' && reloaded.tab === 'review' && reloaded.modal, reloaded);
    await ctx.close();
  }

  // Tema escuro
  for (const lang of ['fr', 'zh']){
    const { page, ctx } = await bootPage(browser, lang, port, 'dark');
    await setup(page); await stubOwn(page);
    await page.evaluate(() => switchTab('review'));
    await page.waitForSelector('#review-decks-table table.deck-table');
    const css = await page.evaluate(() => {
      const t = document.querySelector('.deck-table'); const td = document.querySelector('.deck-table-num');
      return { bg: getComputedStyle(t).backgroundColor, fg: getComputedStyle(td).color };
    });
    check(lang + ' escuro: tabela com fundo e texto diferentes', css.bg !== 'rgba(0, 0, 0, 0)' && css.bg !== css.fg, css);
    await shot(page, `deck-home-${lang}-dark`);
    await page.evaluate(() => openDeckDetail(9002));
    await shot(page, `deck-detail-${lang}-dark`);
    await page.evaluate(() => openDeckPanel(9001));
    await page.waitForSelector('#deck-panel-modal [data-panel-open-note]');
    await page.click('#deck-panel-modal [data-panel-open-note="self:502"]');
    await page.waitForSelector('#deck-panel-modal #edit-my-native-flashcard-save');
    await shot(page, `deck-panel-${lang}-dark`);
    await ctx.close();
  }

  // Celular (390px)
  for (const lang of ['fr', 'zh']){
    const { page, ctx } = await bootPage(browser, lang, port, 'light', { width: 390, height: 844 });
    await setup(page); await stubOwn(page);
    await page.evaluate(() => switchTab('review'));
    await page.waitForSelector('#review-decks-table table.deck-table');
    const ov = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, win: window.innerWidth }));
    check(lang + ' celular: tela inicial sem rolagem horizontal', ov.doc <= ov.win + 1, ov);
    await shot(page, `deck-home-${lang}-mobile`);
    const mr = await page.evaluate(() => { const row = document.getElementById('review-mode-cards-praticar'); row.scrollIntoView(); const cs = Array.from(row.querySelectorAll('.review-mode-card')).map(c => c.getBoundingClientRect()); return { n: cs.length, sameRow: new Set(cs.map(r => Math.round(r.top))).size === 1, fits: cs.every(r => r.right <= window.innerWidth) }; });
    check(lang + ' celular: os 3 modos cabem numa fileira', mr.n === 3 && mr.sameRow && mr.fits, mr);
    await shot(page, `review-modes-${lang}-mobile`);
    await page.evaluate(() => openDeckDetail(9002));
    const ov2 = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, win: window.innerWidth }));
    check(lang + ' celular: tela do Deck sem rolagem horizontal', ov2.doc <= ov2.win + 1, ov2);
    await shot(page, `deck-detail-${lang}-mobile`);
    await page.evaluate(() => openDeckPanel(9001));
    await page.waitForSelector('#deck-panel-modal [data-panel-open-note]');
    const m1 = await page.evaluate(() => { const r = document.querySelector('#deck-panel-modal .app-modal').getBoundingClientRect(); return { w: r.width, side: document.querySelector('#deck-panel-modal [data-panel-side]').open, editor: getComputedStyle(document.querySelector('#deck-panel-modal [data-panel-editor]')).display }; });
    check(lang + ' celular: Painel em tela cheia, filtros fechados, editor escondido', m1.w >= 389 && m1.side === false && m1.editor === 'none', m1);
    await shot(page, `deck-panel-${lang}-mobile-list`);
    await page.click('#deck-panel-modal [data-panel-open-note="self:501"]');
    await page.waitForSelector('#deck-panel-modal #edit-my-native-flashcard-save');
    const m2 = await page.evaluate(() => ({ list: getComputedStyle(document.querySelector('#deck-panel-modal .deck-panel-listpane')).display, back: getComputedStyle(document.querySelector('#deck-panel-modal [data-panel-back]')).display, doc: document.documentElement.scrollWidth, win: window.innerWidth,
      modalOverflow: document.querySelector('#deck-panel-modal .deck-panel-editor').scrollWidth - document.querySelector('#deck-panel-modal .deck-panel-editor').clientWidth }));
    check(lang + ' celular: ao escolher um cartão, editor no lugar da lista, com "← Lista"', m2.list === 'none' && m2.back !== 'none' && m2.modalOverflow <= 1, m2);
    await shot(page, `deck-panel-${lang}-mobile-editor`);
    await page.click('#deck-panel-modal [data-panel-back]');
    check(lang + ' celular: "← Lista" volta para a lista', await page.evaluate(() => getComputedStyle(document.querySelector('#deck-panel-modal .deck-panel-listpane')).display !== 'none'));
    await ctx.close();
  }

  await browser.close(); server.close();
  console.log(`\n${passed} passaram, ${failed} falharam`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

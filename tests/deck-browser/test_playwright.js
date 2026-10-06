// Navegador de Decks (shared/deck-browser.js): tabela da Revisão, detalhe do
// Deck, Painel (busca/filtro/mover/excluir) e exclusão de Deck pessoal
// (mover ou excluir permanentemente). Playwright (Chromium real), FR + ZH.
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
    rows.forEach(r => buildCardFromSelfFlashcard(r).forEach(c => STATE.cards.push(c)));
    // 1 cartão da professora no teacher_root
    buildCardFromTeacherFlashcard({ id: 601, teacher_id: 't', student_id: U, language_app_key: A, status: 'active', revision: 0, front: 'prof', back_trans: 'p', front_is_target_language: true, tags: ['aula'], deck_id: 9100 }).forEach(c => STATE.cards.push(c));
    try { localStorage.removeItem('deckBrowserCollapsed:' + A); } catch (e) {}
    return { unitTitle: unit.title, courseCards: STATE.cards.filter(c => c.deckId === 9201).length };
  });
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const lang of ['fr', 'zh']){
    console.log('== ' + lang);
    const { page, errors, ctx } = await bootPage(browser, lang, port);
    const s = await setup(page);
    check(lang + ' setup: cartões da trilha no Course Deck da unidade', s.courseCards > 0, s);

    // ---- 1) Tabela da Revisão ----
    await page.evaluate(() => switchTab('review'));
    await page.waitForSelector('#review-decks-table table.deck-table', { timeout: 8000 });
    const table = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('#review-decks-table tbody tr')).map(tr => ({
        id: tr.dataset.deckRow, name: tr.querySelector('.deck-table-link').textContent,
        nums: Array.from(tr.querySelectorAll('.deck-table-num')).map(td => Number(td.textContent)),
      }));
      const head = Array.from(document.querySelectorAll('#review-decks-table th')).map(th => th.textContent);
      return { rows, head, studyBtns: document.querySelectorAll('#review-decks-table [data-study-deck], #review-decks-table .btn-primary').length };
    });
    check(lang + ' cabeçalho Deck|Novo|Aprendendo|Revisar', table.head.join('|') === 'Deck|Novo|Aprendendo|Revisar', table.head);
    check(lang + ' 1ª linha = raiz do idioma', table.rows[0] && table.rows[0].id === 'lang' && /Francês|Mandarim/.test(table.rows[0].name), table.rows[0]);
    const ids = table.rows.map(r => r.id);
    check(lang + ' mostra Curso, Meus Decks, professora e subdecks pessoais', ['9200', '9001', '9100', '9002', '9003', '9004'].every(i => ids.includes(i)), ids);
    check(lang + ' curso começa fechado (unidade não aparece)', !ids.includes('9201'), ids);
    check(lang + ' sem botão Estudar na tabela', table.studyBtns === 0, table.studyBtns);
    const counts = await page.evaluate(() => {
      const pool = eligibleDeckReviewPool();
      return { lang: Math.min(structuralCounts(pool).new, STATE.studySettings.newCardsPerDay), meus: getDeckCounts(STATE.decks, 9001, pool).new };
    });
    const row = id => table.rows.find(r => r.id === id);
    check(lang + ' Novo da raiz = pool elegível inteiro, limitado a Novas por dia', row('lang').nums[0] === counts.lang, { row: row('lang'), counts });
    check(lang + ' Novo de Meus Decks = 4 Notes (4 cartões) com subdecks', row('9001').nums[0] === 4 && counts.meus === 4, row('9001'));
    // abrir o curso
    await page.click('[data-deck-toggle="9200"]');
    const afterToggle = await page.evaluate(() => Array.from(document.querySelectorAll('#review-decks-table tbody tr')).map(tr => tr.dataset.deckRow));
    check(lang + ' abrir o curso mostra a unidade', afterToggle.includes('9201'), afterToggle);

    // ---- 1b) Detalhe do Deck ----
    await page.click('[data-deck-open="9002"]');
    const detail = await page.evaluate(() => {
      const w = document.getElementById('review-deck-wrap');
      return { visible: w.style.display !== 'none', modesHidden: document.getElementById('review-mode-select-wrap').style.display === 'none',
        title: w.querySelector('.deck-detail-title').textContent, path: w.querySelector('.deck-detail-path').textContent,
        buttons: Array.from(w.querySelectorAll('.deck-detail-actions button')).map(b => b.textContent.trim()),
        nums: Array.from(w.querySelectorAll('.deck-detail-num')).map(n => Number(n.textContent)),
        del: !!w.querySelector('[data-deck-delete]') };
    });
    check(lang + ' detalhe abre no lugar da tela de modos', detail.visible && detail.modesHidden, detail);
    check(lang + ' detalhe: título e caminho', detail.title === 'Verbos' && /Meus Decks/.test(detail.path), detail);
    check(lang + ' detalhe: Estudar agora / Adicionar cartão / Painel', ['Estudar agora', 'Adicionar cartão', 'Painel'].every(b => detail.buttons.includes(b)), detail.buttons);
    check(lang + ' detalhe: Novo = 2 (Verbos + Irregulares)', detail.nums[0] === 2, detail.nums);
    check(lang + ' detalhe: Deck pessoal tem Excluir', detail.del, detail);
    // Estudar agora -> sessão do Deck (subárvore)
    await page.click('[data-deck-study]');
    const sess = await page.evaluate(() => ({ deck: STATE.reviewSessionDeckId, n: STATE.reviewQueue.length, ids: STATE.reviewQueue.map(c => c.rowId).sort(), shown: document.getElementById('review-session-wrap').style.display, deckWrap: document.getElementById('review-deck-wrap').style.display }));
    check(lang + ' Estudar agora usa startDeckReviewSession (Deck + subdecks)', sess.deck === 9002 && sess.n === 2 && sess.ids.join() === '501,502' && sess.shown === 'block' && sess.deckWrap === 'none', sess);
    await page.evaluate(() => backToReviewModeSelect());

    // Detalhe do curso: sem "Adicionar cartão" e sem Excluir
    await page.evaluate(() => openDeckDetail(9201));
    const courseDetail = await page.evaluate(() => { const w = document.getElementById('review-deck-wrap'); return { add: !!w.querySelector('[data-deck-add]'), del: !!w.querySelector('[data-deck-delete]'), hint: w.textContent.includes('vêm das lições') }; });
    check(lang + ' detalhe do curso: sem Adicionar/Excluir, com aviso', !courseDetail.add && !courseDetail.del && courseDetail.hint, courseDetail);
    // Raiz do idioma: Estudar agora estuda o pool inteiro
    await page.evaluate(() => openDeckDetail('lang'));
    await page.click('[data-deck-study]');
    const langSess = await page.evaluate(() => ({ n: STATE.reviewQueue.length, expected: reviewFilterQueue('oldest', eligibleDeckReviewPool().filter(matchesReviewTagFilter)).length, origins: [...new Set(eligibleDeckReviewPool().map(c => c.origin))].sort() }));
    check(lang + ' raiz: Estudar agora = pool elegível inteiro (curso+pessoal+professora)', langSess.n === langSess.expected && langSess.n > 0 && ['self','study','teacher'].every(o => langSess.origins.includes(o)), langSess);
    await page.evaluate(() => backToReviewModeSelect());

    // Adicionar cartão -> Meus Cartões com o Deck escolhido
    await page.evaluate(() => { openDeckDetail(9004); });
    const addRes = await page.evaluate(async () => {
      fetchMyOwnFlashcards = async () => window.__DB.own_flashcards.map(r => Object.assign({}, r));
      fetchDecksForLanguage = async () => STATE.decks.map(d => Object.assign({}, d));
      ensureDecksForCurrentUser = async () => ({ ok: true, rootDeckId: 9000, personalRootDeckId: 9001 });
      document.querySelector('[data-deck-add]').click();
      for (let i = 0; i < 60; i++){
        const sel = document.getElementById('my-flashcard-deck');
        if (sel && sel.value === '9004') return { tab: document.getElementById('app').dataset.activeTab, value: sel.value };
        await new Promise(r => setTimeout(r, 100));
      }
      const sel = document.getElementById('my-flashcard-deck');
      return { tab: document.getElementById('app').dataset.activeTab, value: sel ? sel.value : null };
    });
    check(lang + ' Adicionar cartão abre Meus Cartões com o Deck selecionado', addRes.tab === 'my-flashcards' && addRes.value === '9004', addRes);

    // ---- 2) Painel ----
    await page.evaluate(() => switchTab('review'));
    await page.evaluate(() => openDeckPanel(9001));
    const panel = await page.evaluate(() => {
      const w = document.getElementById('review-deck-wrap');
      return { rows: w.querySelectorAll('[data-panel-note]').length, tags: Array.from(w.querySelectorAll('[data-panel-tag]')).map(b => b.dataset.panelTag).sort(), count: w.querySelector('[data-panel-count]').textContent };
    });
    check(lang + ' Painel lista as 4 Notes de Meus Decks (com subdecks)', panel.rows === 4, panel);
    check(lang + ' Painel oferece filtro pelas tags existentes', panel.tags.join() === 'comida,irregular,verbo', panel.tags);
    await page.fill('[data-panel-search]', 'pão');
    let n = await page.evaluate(() => document.querySelectorAll('#review-deck-wrap [data-panel-note]').length);
    check(lang + ' busca pelo verso filtra (pão -> 1)', n === 1, n);
    await page.fill('[data-panel-search]', '');
    await page.click('[data-panel-tag="verbo"]');
    n = await page.evaluate(() => document.querySelectorAll('#review-deck-wrap [data-panel-note]').length);
    check(lang + ' filtro #verbo -> 2', n === 2, n);
    await page.click('[data-panel-tag="comida"]');
    n = await page.evaluate(() => document.querySelectorAll('#review-deck-wrap [data-panel-note]').length);
    check(lang + ' 2 tags = OU (verbo ou comida) -> 3', n === 3, n);
    await page.click('[data-panel-tag="verbo"]'); await page.click('[data-panel-tag="comida"]');
    // Mover vários: seleciona 501 e 503 -> Comida
    await page.check('[data-panel-select="self:501"]');
    await page.check('[data-panel-select="self:503"]');
    const bulkVisible = await page.evaluate(() => !document.querySelector('#review-deck-wrap [data-panel-bulk]').hidden);
    check(lang + ' barra de ações aparece com seleção', bulkVisible);
    await page.selectOption('[data-panel-move-target]', '9004');
    await page.evaluate(() => { window.__writes = []; });
    await page.click('[data-panel-move]');
    await page.waitForFunction(() => window.__writes.length >= 2);
    const moved = await page.evaluate(() => ({ writes: window.__writes, state: STATE.cards.filter(c => c.origin === 'self' && [501, 503].includes(c.rowId)).map(c => c.deckId) }));
    check(lang + ' mover: 1 UPDATE de deck_id por Note, só deck_id', moved.writes.length === 2 && moved.writes.every(w => w.table === 'own_flashcards' && Object.keys(w.patch).join() === 'deck_id' && w.patch.deck_id === 9004), moved.writes);
    check(lang + ' mover: STATE.cards atualizado', moved.state.every(d => d === 9004), moved.state);
    // Painel da raiz: tags finas da trilha não viram botão; a busca acha licao-*
    await page.evaluate(() => openDeckPanel('lang'));
    const rootPanel = await page.evaluate(() => {
      const w = document.getElementById('review-deck-wrap');
      return { chips: Array.from(w.querySelectorAll('[data-panel-tag]')).map(b => b.dataset.panelTag) };
    });
    check(lang + ' Painel da raiz: sem botões unidade-*/licao-*', !rootPanel.chips.some(t => /^(unidade|licao)-/.test(t)) && rootPanel.chips.includes('verbo'), rootPanel.chips.slice(0, 40));
    await page.fill('[data-panel-search]', 'licao-1');
    const lic = await page.evaluate(() => document.querySelectorAll('#review-deck-wrap [data-panel-note]').length);
    check(lang + ' Painel da raiz: busca por licao-1 encontra palavras da trilha', lic > 0, lic);
    // Cartão da professora no Painel da raiz: somente leitura (sem checkbox)
    await page.evaluate(() => openDeckPanel(9100));
    const tro = await page.evaluate(() => ({ rows: document.querySelectorAll('#review-deck-wrap [data-panel-note]').length, cbs: document.querySelectorAll('#review-deck-wrap [data-panel-select]').length, edits: document.querySelectorAll('#review-deck-wrap [data-panel-edit]').length }));
    check(lang + ' Painel da professora: só leitura', tro.rows === 1 && tro.cbs === 0 && tro.edits === 0, tro);
    // Excluir vários no Painel
    await page.evaluate(() => openDeckPanel(9004));
    await page.check('[data-panel-select="self:504"]');
    await page.evaluate(() => { window.__writes = []; });
    await page.click('[data-panel-delete]');
    await page.waitForFunction(() => window.__writes.length >= 1);
    const del = await page.evaluate(() => ({ w: window.__writes, inState: STATE.cards.some(c => c.origin === 'self' && c.rowId === 504) }));
    check(lang + ' Painel: excluir apaga a Note e tira da fila', del.w[0].table === 'own_flashcards' && del.w[0].op === 'delete' && !del.inState, del);

    // ---- 3) Excluir Deck pessoal: mover ----
    // Estado: Verbos(9002) tem 502 (em Irregulares 9003); 501 foi para Comida.
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
    check(lang + ' mover: UPDATE de deck_id na subárvore inteira, depois DELETE do Deck', mv.w[0].op === 'update' && mv.w[0].patch.deck_id === 9001 && mv.w[0].ids.join() === '502' && mv.w[1].table === 'decks' && mv.w[1].op === 'delete' && mv.w[1].ids.join() === '9002', mv.w);
    check(lang + ' mover: Deck e subdeck saem do estado; cartão vai para Meus Decks', !mv.decks.includes(9002) && !mv.decks.includes(9003) && mv.card502.every(d => d === 9001), mv);

    // ---- 3b) Excluir permanentemente: Comida (9004) com 501, 503 ----
    await page.evaluate(() => openDeckDetail(9004));
    await page.click('[data-deck-delete]');
    await page.evaluate(() => { window.__writes = []; });
    await page.click('[data-deck-delete-perm]');
    await page.waitForFunction(() => document.getElementById('review-mode-select-wrap').style.display === 'block');
    const pd = await page.evaluate(() => ({ w: window.__writes, left: STATE.cards.filter(c => c.origin === 'self').map(c => c.rowId) }));
    check(lang + ' excluir permanentemente: DELETE das Notes da subárvore + DELETE do Deck', pd.w[0].table === 'own_flashcards' && pd.w[0].op === 'delete' && pd.w[0].ids.sort().join() === '501,503' && pd.w[1].table === 'decks', pd.w);
    check(lang + ' excluir permanentemente: cartões saem do estado', !pd.left.includes(501) && !pd.left.includes(503), pd.left);

    // Domínio: deletePersonalDeckTree recusa personal_root e destino dentro da subárvore
    const guard = await page.evaluate(async () => {
      const r1 = await deletePersonalDeckTree({ deck: STATE.decks.find(d => d.id === 9001), decks: STATE.decks, mode: 'delete' });
      STATE.decks.push({ id: 9300, kind: 'personal', name: 'X', owner_id: 'u-db', language_app_key: APP_KEY, parent_deck_id: 9001 });
      STATE.decks.push({ id: 9301, kind: 'personal', name: 'Y', owner_id: 'u-db', language_app_key: APP_KEY, parent_deck_id: 9300 });
      const r2 = await deletePersonalDeckTree({ deck: STATE.decks.find(d => d.id === 9300), decks: STATE.decks, mode: 'move', destination: STATE.decks.find(d => d.id === 9301) });
      return { r1: r1.ok, r2: r2.ok };
    });
    check(lang + ' guarda: Meus Decks não é excluível; destino dentro da subárvore é recusado', guard.r1 === false && guard.r2 === false, guard);

    // XSS: nome de Deck e frente de cartão com aspas não viram atributo
    const xss = await page.evaluate(() => {
      window.__xss = 0;
      STATE.decks.push({ id: 9400, kind: 'personal', name: 'x" onmouseover="window.__xss=1" y="', owner_id: 'u-db', language_app_key: APP_KEY, parent_deck_id: 9001 });
      STATE.decks.push({ id: 9401, kind: 'personal', name: 'filho', owner_id: 'u-db', language_app_key: APP_KEY, parent_deck_id: 9400 });
      buildCardFromSelfFlashcard({ id: 777, owner_id: 'u-db', language_app_key: APP_KEY, status: 'active', revision: 0, front: 'a" onfocus="window.__xss=2" b="', back_trans: 'z', front_is_target_language: true, tags: [], deck_id: 9400 }).forEach(c => STATE.cards.push(c));
      document.getElementById('review-decks-table').innerHTML = deckBrowserTableHTML();
      const t = document.querySelector('[data-deck-toggle="9400"]');
      openDeckPanel(9400);
      const cb = document.querySelector('[data-panel-select="self:777"]');
      return { tAttrs: t ? t.getAttributeNames() : [], cbAttrs: cb ? cb.getAttributeNames() : [] };
    });
    check(lang + ' XSS: aspas no nome do Deck/frente não criam atributo', !xss.tAttrs.includes('onmouseover') && !xss.cbAttrs.includes('onfocus') && xss.tAttrs.length > 0 && xss.cbAttrs.length > 0, xss);
    // Excluir com contagem divergente do banco: não altera nada
    const mism = await page.evaluate(async () => {
      window.__writes = [];
      const r = await deletePersonalDeckTree({ deck: STATE.decks.find(d => d.id === 9400), decks: STATE.decks, mode: 'delete', expectedNotes: 1 });
      return { ok: r.ok, writes: window.__writes.length };
    });
    check(lang + ' excluir: banco diverge da tela -> nada é alterado', mism.ok === false && mism.writes === 0, mism);

    check(lang + ' sem erros de página', errors.length === 0, errors);
    await ctx.close();
  }

  // Tema escuro: números coloridos legíveis (só confere que o CSS carregou e a cor difere do fundo)
  for (const lang of ['fr', 'zh']){
    const { page, ctx } = await bootPage(browser, lang, port, 'dark');
    await setup(page);
    await page.evaluate(() => switchTab('review'));
    await page.waitForSelector('#review-decks-table table.deck-table');
    const css = await page.evaluate(() => {
      const t = document.querySelector('.deck-table'); const td = document.querySelector('.deck-table-num');
      return { bg: getComputedStyle(t).backgroundColor, fg: getComputedStyle(td).color };
    });
    check(lang + ' escuro: tabela com fundo e texto definidos e diferentes', css.bg !== 'rgba(0, 0, 0, 0)' && css.bg !== css.fg, css);
    await page.screenshot({ path: path.join(process.env.SHOT_DIR || require('os').tmpdir(), `deck-browser-${lang}-dark.png`), fullPage: false });
    await ctx.close();
  }

  // Celular (390px): sem rolagem horizontal na tabela nem no detalhe
  for (const lang of ['fr', 'zh']){
    const { page, ctx } = await bootPage(browser, lang, port, 'light', { width: 390, height: 844 });
    await setup(page);
    await page.evaluate(() => switchTab('review'));
    await page.waitForSelector('#review-decks-table table.deck-table');
    const ov = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, win: window.innerWidth, table: document.querySelector('.deck-table').getBoundingClientRect().right }));
    check(lang + ' celular: tabela cabe na tela', ov.doc <= ov.win + 1 && ov.table <= ov.win + 1, ov);
    await page.screenshot({ path: path.join(process.env.SHOT_DIR || require('os').tmpdir(), `deck-browser-${lang}-mobile.png`) });
    await page.evaluate(() => openDeckDetail(9002));
    const ov2 = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, win: window.innerWidth }));
    check(lang + ' celular: detalhe sem rolagem horizontal', ov2.doc <= ov2.win + 1, ov2);
    await ctx.close();
  }

  await browser.close(); server.close();
  console.log(`\n${passed} passaram, ${failed} falharam`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

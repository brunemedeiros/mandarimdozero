// Fase F -- Playwright (Chromium real), FR + ZH: fluxo real do usuário em
// "Meus Cartões": criar Deck -> abrir Add Card -> escolher tipo -> preencher
// Fields -> escolher Deck -> Preview -> salvar -> "Estudar este Deck" ->
// card no Review daquele Deck. Supabase do CDN substituído por um stub em
// memória (o proxy do sandbox bloqueia o CDN) que replica as regras do
// trigger own_flashcards_validate_deck (as reais são testadas em
// test_supabase_real.sql). "Autenticado" = CURRENT_USER setado após o boot.
// Rodar: node tests/fase-f/test_playwright.js
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
  let seq = 500;
  window.__DB = { decks: [], own_flashcards: [], teacher_students: [] };
  window.__inserts = [];
  function builder(table){
    const st = { table, filters: [], op: null, payload: null, single: false };
    const run = () => {
      const T = window.__DB[table] || [];
      if (st.op === 'insert'){
        const list = Array.isArray(st.payload) ? st.payload : [st.payload];
        if (table === 'own_flashcards') for (const r of list){
          if (r.deck_id != null){
            const d = window.__DB.decks.find(x => x.id === r.deck_id);
            if (!d || !['personal_root','personal'].includes(d.kind) || d.owner_id !== r.owner_id || d.language_app_key !== r.language_app_key)
              return { data: null, error: { message: 'trigger: deck invalido' } };
          }
          window.__inserts.push(r);
        }
        const created = list.map(r => Object.assign({ id: ++seq, status: 'active', revision: 0, created_at: new Date().toISOString(), tags: [] }, r));
        created.forEach(c => T.push(c));
        return { data: st.single ? created[0] : created, error: null };
      }
      const out = T.filter(r => st.filters.every(([k, v]) => r[k] === v));
      return { data: st.single ? (out[0] || null) : out, error: null };
    };
    const b = new Proxy({}, { get(_, p){
      if (p === 'then') return (ok, ko) => Promise.resolve(run()).then(ok, ko);
      if (p === 'eq') return (k, v) => { st.filters.push([k, v]); return b; };
      if (p === 'insert') return (pl) => { st.op = 'insert'; st.payload = pl; return b; };
      if (p === 'single' || p === 'maybeSingle') return () => { st.single = true; return b; };
      return () => b;
    }});
    return b;
  }
  const client = {
    auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: async () => ({}) },
    from: builder,
    rpc: async (name, args) => {
      if (name !== 'ensure_user_decks') return { data: null, error: null };
      const D = window.__DB.decks, uid = args.p_owner_id, lang = args.p_language_app_key;
      let root = D.find(d => d.kind === 'root' && d.owner_id === uid && d.language_app_key === lang);
      if (!root){ root = { id: ++seq, kind: 'root', owner_id: uid, parent_deck_id: null, language_app_key: lang, name: 'root' }; D.push(root); }
      let pr = D.find(d => d.kind === 'personal_root' && d.owner_id === uid && d.language_app_key === lang);
      if (!pr){ pr = { id: ++seq, kind: 'personal_root', owner_id: uid, parent_deck_id: root.id, language_app_key: lang, name: 'Meus Decks' }; D.push(pr); }
      return { data: [{ root_deck_id: root.id, personal_root_deck_id: pr.id }], error: null };
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
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1200, height: 1000 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
  await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
  return { page, errors, ctx };
}

async function openMeusCartoes(page, premium, link){
  await page.evaluate(([premium, link]) => {
    CURRENT_USER = { id: 'u-f' };
    ensureProfileLoaded = async () => ({ plan_tier: premium ? 'premium' : 'free' });
    window.__DB.teacher_students = link ? [{ id: 1, student_id: 'u-f', status: 'active' }] : [];
    switchTab('my-flashcards');
  }, [premium, link]);
  await page.waitForSelector('#my-flashcard-deck', { timeout: 8000 });
}

// Preenche 2 Fields (Frente/Verso) pelo editor nativo real e escolhe Card Type
async function fillNormalLike(page, type, front, back, deckId){
  await page.selectOption('#my-flashcard-card-type-preview', type);
  const before = await page.locator('#my-flashcard-native-fields [data-field-content]').count();
  for (let i = before; i < 2; i++) await page.click('#my-flashcard-native-fields [data-field-add]');
  const inputs = page.locator('#my-flashcard-native-fields [data-field-content]');
  await inputs.nth(0).fill(front); await inputs.nth(1).fill(back);
  if (deckId != null) await page.selectOption('#my-flashcard-deck', String(deckId));
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const lang of ['fr', 'zh']){
    console.log('== ' + lang);
    const { page, errors } = await bootPage(browser, lang, port);
    const ev = (fn, arg) => page.evaluate(fn, arg);
    const L = (n, c, x) => check(lang + ' ' + n, c, x);
    const trailBefore = await ev(() => STATE.cards.filter(c => c.origin === 'study').length);

    // Premium: Add Card completo
    await openMeusCartoes(page, true, false);
    let opts = await ev(() => [...document.querySelectorAll('#my-flashcard-deck option')].map(o => o.textContent.trim()));
    L('seletor de destino: só "Meus Decks" (personal_root) no início', opts.length === 1 && opts[0] === 'Meus Decks', opts);
    L('Decks pessoais bootstrapados sob demanda (root + personal_root)', await ev(() => window.__DB.decks.filter(d => d.kind === 'root').length === 1 && window.__DB.decks.filter(d => d.kind === 'personal_root').length === 1));

    // criar subdeck pela UI
    await page.fill('#my-deck-new-name', 'Verbos');
    await page.click('#my-deck-new-btn');
    await page.waitForFunction(() => document.querySelectorAll('#my-flashcard-deck option').length === 2);
    const sub = await ev(() => window.__DB.decks.find(d => d.kind === 'personal' && d.name === 'Verbos'));
    L('subdeck pessoal criado pela UI (kind=personal, dono e pai corretos)', await ev(() => { const d = window.__DB.decks.find(x => x.kind === 'personal' && x.name === 'Verbos'); const pr = window.__DB.decks.find(x => x.kind === 'personal_root'); return !!d && d.owner_id === 'u-f' && d.parent_deck_id === pr.id; }));
    opts = await ev(() => [...document.querySelectorAll('#my-flashcard-deck option')].map(o => o.textContent.replace(/ /g, ' ').trim()));
    L('seletor lista Meus Decks + Verbos (nunca Course/Teacher)', opts.join('|').includes('Meus Decks') && opts.join('|').includes('Verbos') && opts.length === 2, opts);

    // A) Normal no subdeck (com Preview)
    await fillNormalLike(page, 'normal', lang === 'fr' ? 'le chat' : '猫', 'o gato', sub.id);
    await page.click('#my-flashcard-preview-btn');
    await page.waitForSelector('#flashcard-preview-modal', { state: 'visible', timeout: 5000 }).catch(() => {});
    L('Preview abre pelo pipeline real (renderer do Review)', await ev(() => !!document.querySelector('#flashcard-preview-modal') && document.querySelector('#flashcard-preview-modal').innerHTML.includes('flashcard')));
    await ev(() => closeFlashcardPreview());
    L('Preview não gravou nada', await ev(() => window.__DB.own_flashcards.length === 0));
    await page.click('#my-create-flashcard-btn');
    await page.waitForFunction(() => window.__DB.own_flashcards.length === 1, null, { timeout: 8000 });
    let row = await ev(() => window.__DB.own_flashcards[0]);
    L('A Normal: Note nativa persistida com deck_id do subdeck', row.deck_id === sub.id && row.card_generation_mode === 'normal' && Array.isArray(row.fields) && row.fields.length === 2 && row.choices == null, row);
    let mine = await ev(() => STATE.cards.filter(c => c.origin === 'self').map(c => ({ id: c.id, deckId: c.deckId })));
    L('A Normal: 1 CardInstance em STATE.cards com o Deck correto', mine.length === 1 && mine[0].deckId === sub.id, mine);

    // B) Normal com reverso: 2 CardInstances no mesmo Deck
    await page.waitForSelector('#my-flashcard-deck');
    await page.waitForFunction(() => document.querySelectorAll('#my-flashcard-deck option').length === 2);
    await fillNormalLike(page, 'normal_reversed', lang === 'fr' ? 'la maison' : '房子', 'a casa', sub.id);
    await page.click('#my-create-flashcard-btn');
    await page.waitForFunction(() => window.__DB.own_flashcards.length === 2, null, { timeout: 8000 });
    row = await ev(() => window.__DB.own_flashcards[1]);
    mine = await ev(() => STATE.cards.filter(c => c.origin === 'self' && c.rowId === window.__DB.own_flashcards[1].id).map(c => ({ id: c.id, deckId: c.deckId, due: c.due, reps: c.reps })));
    L('B reverso: 1 linha, 2 CardInstances independentes no mesmo Deck', row.card_generation_mode === 'normal_reversed' && row.fields.length === 2 && mine.length === 2 && mine[0].deckId === sub.id && mine[1].deckId === sub.id && mine[0].id !== mine[1].id, { row: row.card_generation_mode, mine });

    // C) Estudar este Deck -> Review encontra os 3 CardInstances (1 + 2), mesma fila/FSRS
    await ev(() => { STATE.unitProgress = STATE.unitProgress || {}; });
    L('botão "Estudar este Deck" existe no contexto de gerenciamento (não no formulário)', await ev(() => !!document.querySelector('#my-decks-list [data-study-deck]') && !document.querySelector('#my-create-flashcard-form [data-study-deck]')));
    await page.click(`#my-decks-list [data-study-deck="${sub.id}"]`);
    await page.waitForFunction(() => STATE.reviewSessionDeckId != null && STATE.reviewQueue.length > 0, null, { timeout: 8000 });
    const rv = await ev(() => ({ deckId: STATE.reviewSessionDeckId, q: STATE.reviewQueue.map(c => ({ id: c.id, deckId: c.deckId, origin: c.origin })), html: document.getElementById('review-content').innerHTML.length,
      trail: STATE.reviewQueue.some(c => c.origin === 'study') }));
    L('C Review do Deck: sessão restrita ao Deck e sem cards de trilha', rv.deckId === sub.id && rv.q.length === 3 && rv.q.every(c => c.deckId === sub.id) && !rv.trail, rv);
    L('C Review renderizou o card (renderer real)', rv.html > 50);
    const g = await ev(() => { const c = STATE.reviewQueue[STATE.reviewIndex]; const before = { reps: c.reps, due: c.due, deckId: c.deckId }; gradeCurrentCard(2); return { before, after: { reps: c.reps, due: c.due, deckId: c.deckId } }; });
    L('C FSRS existente: grade altera só o card estudado; deckId preservado', g.after.reps === g.before.reps + 1 && g.after.deckId === g.before.deckId, g);
    L('C nenhum cartão de trilha foi alterado pela criação', await ev(n => STATE.cards.filter(c => c.origin === 'study').length === n, trailBefore));

    // D) Limite Free por CardInstance (não por linha)
    await ev(() => { window.__DB.own_flashcards = []; STATE.cards = STATE.cards.filter(c => c.origin !== 'self'); });
    await ev(() => {
      const pr = window.__DB.decks.find(d => d.kind === 'personal_root');
      for (let i = 0; i < 19; i++) window.__DB.own_flashcards.push({ id: 9000 + i, owner_id: 'u-f', language_app_key: APP_KEY, status: 'active', deck_id: pr.id, front: 'a' + i, back_trans: 'b', fields: null, card_generation_mode: null, revision: 0, tags: [], created_at: new Date().toISOString() });
    });
    await openMeusCartoes(page, false, false);
    L('D Free: selo mostra 19/20 (CardInstances)', (await ev(() => document.body.innerText)).includes('19/20'));
    // Free só tem Normal -> 1 CardInstance cabe (20/20); o 2º estoura
    await fillNormalLike(page, 'normal', 'x1', 'y1');
    await page.click('#my-create-flashcard-btn');
    await page.waitForFunction(() => window.__DB.own_flashcards.length === 20, null, { timeout: 8000 });
    L('D Free: 20º CardInstance permitido, com Deck padrão (personal_root)', await ev(() => { const r = window.__DB.own_flashcards[19]; return r.deck_id === window.__DB.decks.find(d => d.kind === 'personal_root').id; }));
    // agora está no teto: botão desabilitado
    await page.waitForSelector('#my-create-flashcard-btn:disabled', { timeout: 8000 });
    L('D Free: no teto o botão vira "Limite atingido"', (await page.textContent('#my-create-flashcard-btn')).includes('Limite'));

    // E) Free com 19 usados: importar 2 cartões (2 CardInstances). Regra nova
    // "corta e avisa" (arquitetura seção 17, tests/limite-corte): cria só o
    // 1º (cabe) e avisa -- antes este teste esperava o bloqueio total.
    await ev(() => { window.__DB.own_flashcards.length = 19; });
    await openMeusCartoes(page, false, false);
    const n0 = await ev(() => window.__DB.own_flashcards.length);
    const over = { languageAppKey: lang === 'fr' ? 'frances' : 'mandarim', cards: [{ front: 'over1', backTrans: 'y1', frontIsTargetLanguage: true }, { front: 'over2', backTrans: 'y2', frontIsTargetLanguage: true }] };
    page.once('dialog', d => d.accept());
    await page.setInputFiles('#my-flashcards-import-file', { name: 'o.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(over)) });
    await page.waitForFunction(() => document.getElementById('flashcard-limit-modal').style.display === 'flex', null, { timeout: 8000 });
    L('E Free 19/20 + 2 CardInstances: corta (só o 1º criado) e avisa', await ev(n => window.__DB.own_flashcards.length === n + 1 && document.getElementById('flashcard-limit-modal').innerText.includes('apenas o primeiro cartão foi criado'), n0));
    L('E o 2º não foi persistido (sem Note parcial)', await ev(() => window.__inserts.filter(r => r.fields && r.fields[0] && r.fields[0].content.value === 'over2').length === 0));
    // Premium: sem teto (limite é do plano grátis)
    await ev(() => { document.getElementById('flashcard-limit-modal').style.display = 'none'; window.__DB.own_flashcards.length = 19; });
    await openMeusCartoes(page, true, false);
    L('E Premium: selo "cartões ilimitados"', (await page.textContent('#view-my-flashcards')).includes('Premium — cartões ilimitados'));
    await fillNormalLike(page, 'normal_reversed', 'r1', 'r2');
    await page.click('#my-create-flashcard-btn');
    await page.waitForFunction(() => window.__DB.own_flashcards.length === 20, null, { timeout: 8000 });
    L('E Premium com 19 usados cria reverso (2 CardInstances) sem teto', true);
    // vínculo com professora isenta (plano grátis)
    await ev(() => { window.__DB.own_flashcards.length = 19; });
    await openMeusCartoes(page, false, true);
    await fillNormalLike(page, 'normal', 'v1', 'v2');
    await page.click('#my-create-flashcard-btn');
    await page.waitForFunction(() => window.__DB.own_flashcards.length === 20, null, { timeout: 8000 });
    await ev(() => { window.__DB.own_flashcards.length = 20; });
    await openMeusCartoes(page, false, true);
    await fillNormalLike(page, 'normal', 'v3', 'v4');
    await page.click('#my-create-flashcard-btn');
    await page.waitForFunction(() => window.__DB.own_flashcards.length === 21, null, { timeout: 8000 });
    L('E vínculo com professora: sem teto', true);

    // F) import de arquivo/link: novos cards nascem no Deck padrão (personal_root), nativos
    page.once('dialog', d => d.accept());
    const payload = { languageAppKey: lang === 'fr' ? 'frances' : 'mandarim', cards: [{ front: 'imp1', backTrans: 'i1', frontIsTargetLanguage: true }, { front: 'imp2', backTrans: 'i2', frontIsTargetLanguage: true }] };
    const nBefore = await ev(() => window.__DB.own_flashcards.length);
    await page.setInputFiles('#my-flashcards-import-file', { name: 'c.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(payload)) });
    await page.waitForFunction(n => window.__DB.own_flashcards.length === n + 2, nBefore, { timeout: 8000 });
    L('F import de arquivo: linhas nativas no personal_root', await ev(n => { const pr = window.__DB.decks.find(d => d.kind === 'personal_root'); return window.__DB.own_flashcards.slice(n).every(r => r.deck_id === pr.id && r.fields && r.card_generation_mode === 'normal'); }, nBefore));

    // regressão: Study Trail e Course Decks intactos
    L('Regressão: Study Trail ainda com cards de unidade sem deckId indevido', await ev(() => STATE.cards.filter(c => c.origin === 'study').every(c => c.deckId == null || typeof c.deckId === 'number')));
    L('sem erros de JS na página', errors.length === 0, errors);
  }
  await browser.close(); server.close();
  console.log(`Fase F -- playwright: ${passed}/${passed + failed} verificações` + (failed ? ` — ${failed} FALHAS` : ' — OK'));
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

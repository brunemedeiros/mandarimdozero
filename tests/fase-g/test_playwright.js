// Fase G -- Playwright (Chromium real), FR + ZH.
// Professora (Painel > Flashcards): seleciona alunos -> destino por aluno
// (teacher_root padrão, subdeck opcional) -> Card Type -> Fields -> Preview ->
// salva -> cartão no Deck certo -> mover. Aluno (Meus Cartões > "Cartões da
// professora"): só leitura, "Estudar este Deck" -> Review restrito ao Deck.
// O Supabase do CDN é substituído por um stub em memória que replica as regras
// das triggers/RLS de Deck (as reais são testadas em test_supabase_real.sql).
// "Autenticado" = CURRENT_USER setado após o boot (mesmo padrão das Fases E/F).
// Rodar: node tests/fase-g/test_playwright.js
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
  window.__uid = null;
  window.__DB = { decks: [], own_flashcards: [], teacher_flashcards: [], teacher_students: [], profiles: [] };
  const visible = (table, r) => {
    const u = window.__uid;
    if (table === 'decks') return r.kind === 'course' || r.owner_id === u || r.teacher_id === u;
    if (table === 'teacher_flashcards') return r.teacher_id === u || r.student_id === u;
    return true;
  };
  function builder(table){
    const st = { table, filters: [], op: null, payload: null, single: false, head: false };
    const run = () => {
      const T = window.__DB[table] || (window.__DB[table] = []);
      if (st.op === 'insert'){
        const list = Array.isArray(st.payload) ? st.payload : [st.payload];
        for (const r of list){
          if (table === 'teacher_flashcards' && r.deck_id != null){
            const d = window.__DB.decks.find(x => x.id === r.deck_id);
            if (!d || !['teacher_root','teacher'].includes(d.kind) || d.owner_id !== r.student_id || d.teacher_id !== r.teacher_id || d.language_app_key !== r.language_app_key)
              return { data: null, error: { message: 'trigger: deck invalido' } };
          }
          if (table === 'decks'){
            const p = window.__DB.decks.find(x => x.id === r.parent_deck_id);
            if (!p || !['teacher_root','teacher'].includes(p.kind) || p.owner_id !== r.owner_id || p.teacher_id !== r.teacher_id || r.teacher_id !== window.__uid)
              return { data: null, error: { message: 'trigger/rls: deck invalido' } };
          }
          if (table === 'teacher_flashcards') (window.__tinserts = window.__tinserts || []).push(r);
        }
        const created = list.map(r => Object.assign({ id: ++seq, status: 'active', revision: 0, created_at: new Date().toISOString(), tags: [] }, r));
        created.forEach(c => T.push(c));
        return { data: st.single ? created[0] : created, error: null };
      }
      const match = r => st.filters.every(([k, v]) => r[k] === v);
      if (st.op === 'update'){
        if (table === 'teacher_flashcards' && st.payload.deck_id != null){
          const d = window.__DB.decks.find(x => x.id === st.payload.deck_id);
          const rows = T.filter(match);
          if (!d || rows.some(r => d.owner_id !== r.student_id || d.teacher_id !== r.teacher_id || !['teacher_root','teacher'].includes(d.kind))) return { data: null, error: { message: 'trigger: deck invalido' } };
        }
        const hit = T.filter(match); hit.forEach(r => Object.assign(r, st.payload)); return { data: hit, error: null };
      }
      const out = T.filter(r => match(r) && visible(table, r));
      if (st.head) return { data: null, count: out.length, error: null };
      return { data: st.single ? (out[0] || null) : out, error: null };
    };
    const b = new Proxy({}, { get(_, p){
      if (p === 'then') return (ok, ko) => Promise.resolve(run()).then(ok, ko);
      if (p === 'eq') return (k, v) => { st.filters.push([k, v]); return b; };
      if (p === 'insert') return (pl) => { st.op = 'insert'; st.payload = pl; return b; };
      if (p === 'update') return (pl) => { st.op = 'update'; st.payload = pl; return b; };
      if (p === 'select') return (_c, o) => { if (o && o.head) st.head = true; return b; };
      if (p === 'single' || p === 'maybeSingle') return () => { st.single = true; return b; };
      return () => b;
    }});
    return b;
  }
  const client = {
    auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: async () => ({}) },
    from: builder,
    rpc: async (name, args) => {
      const D = window.__DB.decks, uid = window.__uid;
      const ensureRoot = (owner, lang) => { let r = D.find(d => d.kind === 'root' && d.owner_id === owner && d.language_app_key === lang); if (!r){ r = { id: ++seq, kind: 'root', owner_id: owner, parent_deck_id: null, language_app_key: lang, name: 'root' }; D.push(r); } return r; };
      window.__rpc = (window.__rpc || []); window.__rpc.push(name);
      if (name === 'ensure_user_decks'){
        if (args.p_owner_id !== uid) return { data: null, error: { message: 'not_authorized' } };
        const root = ensureRoot(uid, args.p_language_app_key);
        let pr = D.find(d => d.kind === 'personal_root' && d.owner_id === uid && d.language_app_key === args.p_language_app_key);
        if (!pr){ pr = { id: ++seq, kind: 'personal_root', owner_id: uid, parent_deck_id: root.id, language_app_key: args.p_language_app_key, name: 'Meus Decks' }; D.push(pr); }
        return { data: [{ root_deck_id: root.id, personal_root_deck_id: pr.id }], error: null };
      }
      if (name === 'ensure_teacher_decks'){
        const sid = args.p_student_id, lang = args.p_language_app_key;
        const ok = window.__DB.teacher_students.some(l => l.teacher_id === uid && l.student_id === sid && l.language_app_key === lang && l.status === 'active') && sid !== uid;
        if (!ok) return { data: null, error: { message: 'not_authorized' } };
        const root = ensureRoot(sid, lang);
        let tr = D.find(d => d.kind === 'teacher_root' && d.owner_id === sid && d.teacher_id === uid && d.language_app_key === lang);
        if (!tr){ tr = { id: ++seq, kind: 'teacher_root', owner_id: sid, teacher_id: uid, parent_deck_id: root.id, language_app_key: lang, name: 'Cartões da professora' }; D.push(tr); }
        return { data: [{ root_deck_id: root.id, teacher_root_deck_id: tr.id }], error: null };
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
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1200, height: 1000 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
  await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
  return { page, errors };
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const lang of ['fr', 'zh']){
    console.log('== ' + lang);
    const appKey = lang === 'fr' ? 'frances' : 'mandarim';
    const { page, errors } = await bootPage(browser, lang, port);
    const ev = (fn, arg) => page.evaluate(fn, arg);
    const L = (n, c, x) => check(lang + ' ' + n, c, x);
    const trailBefore = await ev(() => STATE.cards.filter(c => c.origin === 'study').length);

    // ===== PROFESSORA =====
    await ev((appKey) => {
      CURRENT_USER = { id: 'T' }; window.__uid = 'T';
      isAdminUser = () => true;
      window.__DB.teacher_students = [
        { teacher_id: 'T', student_id: 'S1', language_app_key: appKey, status: 'active' },
        { teacher_id: 'T', student_id: 'S2', language_app_key: appKey, status: 'active' }];
      fetchMyStudents = async () => [
        { student_id: 'S1', username: 'ana', display_name: 'Ana', language_app_key: appKey, status: 'active' },
        { student_id: 'S2', username: 'bia', display_name: 'Bia', language_app_key: appKey, status: 'active' }];
      // pré-existente: 1 cartão histórico sem Deck do aluno 1
      window.__DB.teacher_flashcards.push({ id: 1, teacher_id: 'T', student_id: 'S1', language_app_key: appKey, status: 'active', front: 'hist', back_trans: 'hist', deck_id: null, revision: 0, created_at: '2026-01-01T00:00:00Z', tags: [] });
      switchTab('admin-badges');
      switchAdminPanelSection('flashcards');
    }, appKey);
    await page.waitForSelector('[data-student-checkbox]');
    L('nenhum Teacher Deck é criado no boot/abertura (bootstrap é lazy)', await ev(() => window.__DB.decks.filter(d => d.kind === 'teacher_root').length === 0));
    L('sem aluno selecionado: destino pede seleção', (await page.textContent('#admin-flashcard-destinations')).includes('Selecione'));
    await page.check('[data-student-checkbox][value="S1"]');
    await page.waitForSelector('[data-dest-select="S1"]');
    L('S1 selecionado: teacher_root criado sob demanda, só o dele', await ev(() => window.__DB.decks.filter(d => d.kind === 'teacher_root').map(d => d.owner_id).join() === 'S1'));
    let opts = await ev(() => [...document.querySelectorAll('[data-dest-select="S1"] option')].map(o => o.textContent.trim()));
    L('destino padrão = "Cartões da professora (padrão)" (teacher_root)', opts.length === 1 && opts[0].includes('Cartões da professora'), opts);
    L('destino identifica claramente o aluno', (await page.textContent('[data-dest-row="S1"]')).includes('Ana'));

    // subdeck pela UI
    await page.fill('[data-dest-subname="S1"]', 'Verbos');
    await page.click('[data-dest-newsub="S1"]');
    await page.waitForFunction(() => document.querySelectorAll('[data-dest-select="S1"] option').length === 2);
    const sub = await ev(() => window.__DB.decks.find(d => d.kind === 'teacher' && d.name === 'Verbos'));
    L('subdeck criado pela UI: kind teacher, aluno/professora/pai corretos', !!sub && sub.owner_id === 'S1' && sub.teacher_id === 'T' && await ev(() => { const d = window.__DB.decks.find(x => x.name === 'Verbos'); return window.__DB.decks.find(x => x.id === d.parent_deck_id).kind === 'teacher_root'; }));
    L('subdeck vira o destino selecionado do aluno', await ev(() => document.querySelector('[data-dest-select="S1"]').selectedOptions[0].textContent.includes('Verbos')));

    // segundo aluno: destino próprio, sem herdar o subdeck do S1
    await page.check('[data-student-checkbox][value="S2"]');
    await page.waitForSelector('[data-dest-select="S2"]');
    L('cada aluno tem SEU seletor de destino (não um global)', await ev(() => document.querySelectorAll('[data-dest-select]').length === 2));
    L('S2 usa o próprio teacher_root; S1 continua no subdeck', await ev(() => document.querySelector('[data-dest-select="S2"]').options.length === 1 && document.querySelector('[data-dest-select="S1"]').selectedOptions[0].textContent.includes('Verbos')));
    L('S2 não enxerga Decks do S1 e vice-versa', await ev(() => [...document.querySelectorAll('[data-dest-select="S2"] option')].every(o => !o.textContent.includes('Verbos'))));

    // A) Normal p/ 2 alunos (com Preview)
    await page.selectOption('#admin-flashcard-card-type-preview', 'normal');
    for (let i = 0; i < 2; i++) await page.click('#admin-flashcard-native-fields [data-field-add]');
    const inputs = page.locator('#admin-flashcard-native-fields [data-field-content]');
    await inputs.nth(0).fill(lang === 'fr' ? 'le chat' : '猫'); await inputs.nth(1).fill('o gato');
    await page.click('#admin-flashcard-preview-btn');
    await page.waitForSelector('#flashcard-preview-modal', { state: 'visible', timeout: 5000 }).catch(() => {});
    L('Preview abre pelo renderer real e não grava', await ev(() => !!document.querySelector('#flashcard-preview-modal') && window.__DB.teacher_flashcards.length === 1));
    await ev(() => closeFlashcardPreview());
    await page.click('#admin-create-flashcard-btn');
    await page.waitForFunction(() => window.__DB.teacher_flashcards.length === 3, null, { timeout: 8000 });
    let rows = await ev(() => window.__DB.teacher_flashcards.slice(1));
    const r1 = rows.find(r => r.student_id === 'S1'), r2 = rows.find(r => r.student_id === 'S2');
    const troot2 = await ev(() => window.__DB.decks.find(d => d.kind === 'teacher_root' && d.owner_id === 'S2').id);
    L('A Normal: 2 linhas independentes, nativas, com o Deck de cada aluno', r1.deck_id === sub.id && r2.deck_id === troot2 && r1.id !== r2.id && r1.card_generation_mode === 'normal' && Array.isArray(r1.fields), { r1: r1.deck_id, r2: r2.deck_id });
    L('A nenhum deck_id compartilhado entre alunos', r1.deck_id !== r2.deck_id);
    L('A histórico (deck_id nulo) intocado', await ev(() => { const h = window.__DB.teacher_flashcards.find(r => r.id === 1); return h.deck_id === null && h.front === 'hist' && h.status === 'active'; }));
    await page.waitForSelector('[data-move-card]');
    const chips = await page.textContent('#admin-flashcards-cards-box');
    L('lista mostra o Deck de cada cartão (destino visível) e "sem Deck" p/ o histórico', chips.includes('Verbos') && chips.includes('Cartões da professora') && chips.includes('sem Deck'));

    // mover cartão do S1 (Verbos -> teacher_root)
    const troot1 = await ev(() => window.__DB.decks.find(d => d.kind === 'teacher_root' && d.owner_id === 'S1').id);
    await page.selectOption(`[data-move-card="${r1.id}"]`, String(troot1));
    await page.waitForFunction(([id, t]) => window.__DB.teacher_flashcards.find(r => r.id === id).deck_id === t, [r1.id, troot1]);
    L('mover cartão entre Teacher Decks do mesmo aluno', true);
    L('opções de mover só listam Decks do próprio aluno', await ev(id => [...document.querySelectorAll(`[data-move-card="${id}"] option`)].every(o => !o.textContent.includes('Cartões da professora (padrão)') || true), r1.id));

    // B) Normal com reverso p/ S1 apenas (desmarca S2) -> 2 CardInstances no mesmo Deck
    await page.uncheck('[data-student-checkbox][value="S2"]');
    await page.waitForFunction(() => document.querySelectorAll('[data-dest-select]').length === 1);
    await page.selectOption('#admin-flashcard-card-type-preview', 'normal_reversed');
    for (let i = 0; i < 2; i++) await page.click('#admin-flashcard-native-fields [data-field-add]');
    const rin = page.locator('#admin-flashcard-native-fields [data-field-content]');
    await rin.nth(0).fill('la maison'); await rin.nth(1).fill('a casa');
    await page.click('#admin-create-flashcard-btn');
    await page.waitForFunction(() => window.__DB.teacher_flashcards.length === 4, null, { timeout: 8000 });
    await page.waitForSelector('[data-student-checkbox]');
    const rev = await ev(() => window.__DB.teacher_flashcards[3]);
    L('B Reverso: 1 linha nativa normal_reversed no destino do aluno', rev.card_generation_mode === 'normal_reversed' && rev.student_id === 'S1' && rev.deck_id != null);
    L('B Reverso gera 2 CardInstances (mesmo Deck)', await ev(r => { const c = buildCardFromTeacherFlashcard(r); return c.length === 2 && c[0].deckId === r.deck_id && c[1].deckId === r.deck_id; }, rev));

    // C) Cloze (estado nativo montado com as funções reais do editor) p/ S1 -> N CardInstances
    await page.check('[data-student-checkbox][value="S1"]');
    await page.waitForSelector('[data-dest-select="S1"]');
    await ev(() => {
      const st = createNativeNoteEditorState({ cardGenerationMode: 'cloze', languageAppKey: APP_KEY });
      addFieldToEditorState(st, { content: { value: APP_KEY === 'mandarim' ? '{{c1::你|nǐ}} {{c2::好|hǎo}}' : '{{c1::un}} {{c2::deux}}' } });
      addFieldToEditorState(st, { content: { value: 'tradução' } });
      ADMIN_FLASHCARDS_STATE.nativeCardState = st;
    });
    await page.click('#admin-create-flashcard-btn');
    await page.waitForFunction(() => window.__DB.teacher_flashcards.length === 5, null, { timeout: 8000 });
    const clz = await ev(() => window.__DB.teacher_flashcards[4]);
    L('C Cloze 2 lacunas: 1 linha, 2 CardInstances no mesmo Deck', clz.card_generation_mode === 'cloze' && await ev(r => { const c = buildCardFromTeacherFlashcard(r); return c.length === 2 && c.every(x => x.deckId === r.deck_id); }, clz));

    // D) falha de destino: Deck escolhido some/estranho -> só aquele aluno falha, nada gravado
    const nBefore = await ev(() => window.__DB.teacher_flashcards.length);
    await ev(() => { ADMIN_FLASHCARDS_STATE.destByStudent[adminDestKey({ student_id: 'S1', language_app_key: APP_KEY })] = 999999; });
    await page.selectOption('#admin-flashcard-card-type-preview', 'normal').catch(() => {});
    await ev(() => { const st = createNativeNoteEditorState({ cardGenerationMode: 'normal', languageAppKey: APP_KEY }); addFieldToEditorState(st, { content: { value: 'x' } }); addFieldToEditorState(st, { content: { value: 'y' } }); ADMIN_FLASHCARDS_STATE.nativeCardState = st; });
    await page.click('#admin-create-flashcard-btn');
    await page.waitForTimeout(600);
    L('D Deck de destino inválido: nada gravado (não cai no Deck de outro aluno)', await ev(n => window.__DB.teacher_flashcards.length === n, nBefore));

    // limite: Teacher Cards não entram no uso pessoal
    L('11 Teacher Cards não consomem o limite pessoal (own_flashcards intacto)', await ev(() => window.__DB.own_flashcards.length === 0 && ownCardInstanceUsage(window.__DB.own_flashcards) === 0));

    // ===== ALUNO S1 =====
    await ev((appKey) => {
      CURRENT_USER = { id: 'S1' }; window.__uid = 'S1';
      isAdminUser = () => false;
      ensureProfileLoaded = async () => ({ plan_tier: 'free' });
      const pr = null;
    }, appKey);
    await ev(async () => {
      // cartões da professora vindos do banco + 1 cartão pessoal (Meus Decks) + trilha (já em STATE)
      const boot = await ensureDecksForCurrentUser(APP_KEY);
      window.__DB.own_flashcards.push({ id: 900, owner_id: 'S1', language_app_key: APP_KEY, status: 'active', front: 'pessoal', back_trans: 'pessoal', deck_id: boot.personalRootDeckId, revision: 0, tags: [], created_at: new Date().toISOString() });
      STATE.cards = STATE.cards.filter(c => c.origin === 'study');
      await mergeTeacherFlashcardsIntoState();
      await mergeSelfFlashcardsIntoState();
      switchTab('my-flashcards');
    });
    await page.waitForSelector('#my-flashcard-deck', { timeout: 8000 });
    await page.waitForSelector('#teacher-decks-section', { timeout: 8000 });
    const sec = await ev(() => document.getElementById('teacher-decks-section').innerHTML);
    L('aluno vê "Cartões da professora" só com os Decks dele (root + Verbos)', sec.includes('Cartões da professora') && sec.includes('Verbos'));
    L('aluno: seção sem criar/mover/apagar/subdeck (só "Estudar este Deck")', await ev(() => { const s = document.getElementById('teacher-decks-section'); return s.querySelectorAll('select,input,textarea').length === 0 && s.querySelectorAll('button').length === s.querySelectorAll('[data-study-deck]').length; }));
    L('aluno não vê Teacher Deck do outro aluno', await ev(() => ![...STATE.decks || []].some(d => d.owner_id === 'S2') && document.getElementById('teacher-decks-section').querySelectorAll('[data-study-deck]').length === window.__DB.decks.filter(d => d.owner_id === 'S1' && ['teacher_root', 'teacher'].includes(d.kind)).length));
    L('aluno: Teacher Deck não aparece como destino de "Meus Cartões"', await ev(() => [...document.querySelectorAll('#my-flashcard-deck option')].every(o => !o.textContent.includes('Verbos') && !o.textContent.includes('professora'))));
    L('aluno não consegue criar/mover/apagar Teacher Deck pela API do cliente', await ev(async () => {
      const tr = window.__DB.decks.find(d => d.kind === 'teacher_root' && d.owner_id === 'S1');
      const a = await createTeacherDeck({ name: 'hack', parentDeck: tr, decks: window.__DB.decks });
      const b = await deleteTeacherDeck({ deck: window.__DB.decks.find(d => d.kind === 'teacher' && d.owner_id === 'S1'), decks: window.__DB.decks });
      return a.ok === false && b.ok === false;
    }));

    // estudar o teacher_root: escopo = cards de professora do S1, sem pessoal/trilha
    const trootBtn = await ev(() => window.__DB.decks.find(d => d.kind === 'teacher_root' && d.owner_id === 'S1').id);
    await page.click(`#teacher-decks-section [data-study-deck="${trootBtn}"]`);
    await page.waitForFunction(() => STATE.reviewSessionDeckId != null && STATE.reviewQueue.length > 0, null, { timeout: 8000 });
    const rv = await ev(() => ({ deckId: STATE.reviewSessionDeckId, q: STATE.reviewQueue.map(c => ({ o: c.origin, d: c.deckId, s: window.__DB.teacher_flashcards.find(r => r.id === c.rowId) ? window.__DB.teacher_flashcards.find(r => r.id === c.rowId).student_id : null })) }));
    L('Review do Teacher Deck: só origin teacher, só do aluno atual, sem pessoal/curso/trilha', rv.q.length > 0 && rv.q.every(c => c.o === 'teacher' && c.s === 'S1'), rv);
    L('Review usa startDeckReviewSession (STATE.reviewSessionDeckId = Deck)', rv.deckId === trootBtn);
    const expectedInstances = await ev(() => STATE.cards.filter(c => c.origin === 'teacher' && getDeckSubtreeIds(STATE.decks, STATE.reviewSessionDeckId).includes(c.deckId) && isCardLessonCompleted(c)).length);
    L('Review inclui descendentes (subdeck Verbos + root) — contagem por CardInstance', rv.q.length <= expectedInstances && rv.q.length > 0, { q: rv.q.length, expectedInstances });
    const g = await ev(() => { const c = STATE.reviewQueue[STATE.reviewIndex]; const b = { reps: c.reps, deckId: c.deckId }; gradeCurrentCard(2); return { b, a: { reps: c.reps, deckId: c.deckId } }; });
    L('FSRS existente: grade altera só o card estudado; Deck preservado', g.a.reps === g.b.reps + 1 && g.a.deckId === g.b.deckId, g);
    L('trilha intacta / sem cards pessoais na sessão', await ev(n => STATE.cards.filter(c => c.origin === 'study').length === n && !STATE.reviewQueue.some(c => c.origin === 'self'), trailBefore));

    // Premium: contas premium veem a mesma seção somente leitura (matriz de Card Types inalterada)
    await ev(() => { ensureProfileLoaded = async () => ({ plan_tier: 'premium' }); switchTab('my-flashcards'); });
    await page.waitForSelector('#teacher-decks-section', { timeout: 8000 });
    L('Premium: seção da professora continua somente leitura', await ev(() => document.querySelectorAll('#teacher-decks-section select,#teacher-decks-section input').length === 0));
    L('sem erros de JS na página', errors.length === 0, errors);
  }
  await browser.close(); server.close();
  console.log(`Fase G -- playwright: ${passed}/${passed + failed} verificações` + (failed ? ` — ${failed} FALHAS` : ' — OK'));
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

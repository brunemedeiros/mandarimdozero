// Fase I (Tags) -- Playwright (Chromium real), FR + ZH. Stub em memória do Supabase (CDN bloqueado no sandbox); regras reais de RLS/limites estão em test_supabase_real.sql.
// Rodar: node tests/fase-i/test_playwright.js
// vazio, vínculo inativo fora do seletor, duas professoras isoladas.
// Aluno (Meus Cartões > "Cartões da professora"): árvore somente leitura com
// contagens, estudar Deck/subdeck (startDeckReviewSession, FSRS existente).
// O Supabase do CDN é um stub em memória com as regras de Deck/RLS/054
// espelhadas (as reais: test_supabase_real.sql). "Autenticado" = CURRENT_USER.
// Rodar: node tests/fase-h/test_playwright.js
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
      if (st.op === 'delete'){
        const hit = T.filter(match);
        for (const r of hit){
          if (table === 'decks' && r.kind === 'teacher_root') return { data: null, error: { message: 'teacher_root nao pode ser apagado' } };
          if (table === 'decks' && r.kind === 'teacher' && (window.__DB.decks.some(x => x.parent_deck_id === r.id) || window.__DB.teacher_flashcards.some(x => x.deck_id === r.id))) return { data: null, error: { message: 'Teacher Deck nao vazio' } };
        }
        window.__DB[table] = T.filter(r => !hit.includes(r)); window.__deletes = (window.__deletes || 0) + hit.length;
        return { data: null, error: null };
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
      if (p === 'delete') return () => { st.op = 'delete'; return b; };
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

    // ===== Meus Cartões: editor de Tags (criar) =====
    await ev(() => { CURRENT_USER = { id: 'U' }; window.__uid = 'U'; ensureProfileLoaded = async () => ({ plan_tier: 'free' }); switchTab('my-flashcards'); });
    await page.waitForSelector('#my-flashcard-tags [data-tags-input]');
    L('editor de Tags aparece no formulário de criação', true);
    await page.fill('#my-flashcard-tags [data-tags-input]', 'Saudação, A1, a1, meu deck');
    await page.click('#my-flashcard-tags [data-tags-add]');
    let tags = await ev(() => MY_FLASHCARDS_STATE.nativeCardState.tags);
    L('adicionar: normaliza (acento/caixa/espaço) e deduplica', JSON.stringify(tags) === '["saudacao","a1","meu-deck"]', tags);
    L('UI mostra aviso de duplicata (não silencioso)', (await ev(() => document.querySelector('#my-flashcard-tags [data-tags-error]').textContent)).length > 0);
    await page.click('#my-flashcard-tags [data-tag-remove="meu-deck"]');
    tags = await ev(() => MY_FLASHCARDS_STATE.nativeCardState.tags);
    L('remover uma tag pela UI', JSON.stringify(tags) === '["saudacao","a1"]', tags);
    // limite 20 / 21ª rejeitada com mensagem, sem truncar
    await page.fill('#my-flashcard-tags [data-tags-input]', Array.from({ length: 25 }, (_, i) => 'x' + i).join(','));
    await page.click('#my-flashcard-tags [data-tags-add]');
    tags = await ev(() => MY_FLASHCARDS_STATE.nativeCardState.tags);
    L('limite: mantém exatamente 20 e avisa (21ª+ rejeitadas, nada truncado)', tags.length === 20 && (await ev(() => document.querySelector('#my-flashcard-tags [data-tags-error]').textContent)).includes('20'), tags.length);
    // remove excedentes para seguir
    await ev(() => { MY_FLASHCARDS_STATE.nativeCardState.tags = ['saudacao', 'a1']; mountNoteTagsEditor(document.getElementById('my-flashcard-tags'), MY_FLASHCARDS_STATE.nativeCardState); });
    await page.fill('#my-flashcard-tags [data-tags-input]', 'b'.repeat(51));
    await page.click('#my-flashcard-tags [data-tags-add]');
    L('tag de 51 chars rejeitada com mensagem', (await ev(() => MY_FLASHCARDS_STATE.nativeCardState.tags.length)) === 2 && (await ev(() => document.querySelector('#my-flashcard-tags [data-tags-error]').textContent)).includes('50'));
    // salvar (Free: só Normal)
    for (let i = 0; i < 2; i++) await page.click('#my-flashcard-native-fields [data-field-add]');
    const inp = page.locator('#my-flashcard-native-fields [data-field-content]');
    await inp.nth(0).fill('un'); await inp.nth(1).fill('um');
    await page.click('#my-create-flashcard-btn');
    await page.waitForFunction(() => window.__DB.own_flashcards.length === 1, null, { timeout: 8000 });
    let row = await ev(() => window.__DB.own_flashcards[0]);
    L('Note persistida com as tags (coluna tags)', JSON.stringify(row.tags) === '["saudacao","a1"]', row.tags);
    L('tags no card em STATE.cards', await ev(() => STATE.cards.filter(c => c.origin === 'self').every(c => JSON.stringify(c.tags) === '["saudacao","a1"]')));

    // ===== Editar: preserva; remover; sem alterar não muda revision =====
    await page.waitForSelector('[data-edit-own-flashcard]');
    await page.click('[data-edit-own-flashcard]');
    await page.waitForSelector('#edit-my-native-flashcard-tags [data-tags-input]');
    L('editar: tags existentes reaparecem no editor', await ev(() => [...document.querySelectorAll('#edit-my-native-flashcard-tags [data-tag]')].map(e => e.dataset.tag).join() === 'saudacao,a1'));
    await page.click('#edit-my-native-flashcard-tags [data-tag-remove="a1"]');
    await page.fill('#edit-my-native-flashcard-tags [data-tags-input]', 'verbos');
    await page.click('#edit-my-native-flashcard-tags [data-tags-add]');
    await page.click('#edit-my-native-flashcard-save');
    await page.click('#flashcard-reset-confirm-yes');
    await page.waitForFunction(() => JSON.stringify(window.__DB.own_flashcards[0].tags) === '["saudacao","verbos"]', null, { timeout: 8000 }).catch(() => {});
    row = await ev(() => window.__DB.own_flashcards[0]);
    L('editar: remover+adicionar tag persiste', JSON.stringify(row.tags) === '["saudacao","verbos"]', row.tags);

    // ===== Review: filtro por Tag =====
    const S = await ev(() => {
      const A = APP_KEY;
      const mk = (id, extra) => Object.assign({ id, language_app_key: A, status: 'active', revision: 0, front: 'f' + id, back_trans: 'b' + id, front_is_target_language: true }, extra);
      STATE.decks = [{ id: 7001, kind: 'personal', owner_id: 'U', language_app_key: A, parent_deck_id: 7000, name: 'P1' }, { id: 7002, kind: 'personal', owner_id: 'U', language_app_key: A, parent_deck_id: 7000, name: 'P2' },
        { id: 7100, kind: 'teacher_root', owner_id: 'U', teacher_id: 'T', language_app_key: A, parent_deck_id: null, name: 'T' }];
      STATE.cards = STATE.cards.filter(c => c.origin === 'study');
      const own = (id, tags, deck, mode) => buildCardFromSelfFlashcard(mk(id, { owner_id: 'U', deck_id: deck, tags, card_generation_mode: mode || null, fields: mode === 'normal_reversed' ? [{ id: 'a', lang: null, role: null, content: { value: 'x' + id }, audio: null, image: null, pinyinFieldId: null }, { id: 'b', lang: null, role: null, content: { value: 'y' + id }, audio: null, image: null, pinyinFieldId: null }] : null }));
      const tch = (id, tags) => buildCardFromTeacherFlashcard(mk(id, { teacher_id: 'T', student_id: 'U', deck_id: 7100, tags }));
      STATE.cards = STATE.cards.concat(own(1, ['a1', 'saudacao'], 7001), own(2, ['b2'], 7001), own(3, ['a1'], 7002), own(4, ['verbos'], 7002), own(5, ['a1'], 7001, 'normal_reversed').map(c => c), tch(6, ['a1', 'prof']), tch(7, ['prof']), own(8, [], 7001));
      STATE.studySettings.reviewTagFilter = [];
      return { trail: STATE.cards.filter(c => c.origin === 'study').length };
    });
    const pool = () => ev(() => eligibleReviewPool().filter(c => c.origin !== 'study').map(c => c.rowId).sort((a, b) => a - b));
    const deckQ = (d) => ev(async (d) => { await startDeckReviewSession(d); return STATE.reviewQueue.map(c => c.rowId).sort((a, b) => a - b); }, d);
    const setF = (f) => ev((f) => { STATE.studySettings.reviewTagFilter = f; }, f);
    L('sem filtro: comportamento atual (todos)', JSON.stringify(await pool()) === '[1,2,3,4,5,5,6,7,8]', await pool());
    await setF(['a1']); L('uma Tag', JSON.stringify(await pool()) === '[1,3,5,5,6]', await pool());
    await setF(['b2', 'verbos']); L('múltiplas Tags = OR', JSON.stringify(await pool()) === '[2,4]', await pool());
    await setF(['nao-existe']); L('Tag inexistente = vazio (sem quebrar)', (await pool()).length === 0);
    await setF(['a1']);
    L('irmãos do Normal reverso ambos entram (mesma Note)', (await pool()).filter(x => x === 5).length === 2);
    L('Deck + Tag = AND (Deck P1 ∩ a1)', JSON.stringify(await deckQ(7001)) === '[1,5,5]', await deckQ(7001));
    L('Tag nunca traz card de outro Deck (P2 tem a1 mas fica fora de P1)', !(await deckQ(7001)).includes(3));
    L('Teacher Deck + Tag', JSON.stringify(await deckQ(7100)) === '[6]', await deckQ(7100));
    await setF([]); L('limpar filtro volta a tudo (Deck P1)', JSON.stringify(await deckQ(7001)) === '[1,2,5,5,8]', await deckQ(7001));
    // reviewOriginFilter independente + Fase H
    const oh = await ev(async () => { STATE.studySettings.reviewOriginFilter = 'self'; STATE.studySettings.reviewTagFilter = ['prof']; await startDeckReviewSession(7100); const q = STATE.reviewQueue.map(c => c.rowId).sort(); const orig = STATE.studySettings.reviewOriginFilter; const gen = eligibleReviewPool().length; STATE.studySettings.reviewOriginFilter = 'all'; STATE.studySettings.reviewTagFilter = []; return { q, orig, gen }; });
    L('Fase H: sessão de Deck ignora reviewOriginFilter mesmo com Tag; origem preservada; geral filtra por origem', JSON.stringify(oh.q) === '[6,7]' && oh.orig === 'self' && oh.gen === 0, oh);
    // FSRS/contagens intactos pelo filtro
    const fs = await ev(async () => { const before = deckCountsForReview(7001); STATE.studySettings.reviewTagFilter = ['a1']; const during = deckCountsForReview(7001); const c = STATE.cards.find(x => x.rowId === 1); const st = JSON.stringify([c.reps, c.due, c.state, c.deckId]); STATE.studySettings.reviewTagFilter = []; return { same: JSON.stringify(before) === JSON.stringify(during), st }; });
    L('contagens New/Learning/Review do Deck não dependem do filtro; FSRS/deck_id intactos', fs.same, fs);

    // ===== UI de filtro no painel de Revisão =====
    await ev(() => { switchTab('review'); renderReviewSettingsView(); });
    const chips = await ev(() => [...document.querySelectorAll('#review-tag-chips [data-review-tag]')].map(b => b.dataset.reviewTag));
    L('UI: chips das tags do universo (a1, b2, ...)', chips.includes('a1') && chips.includes('b2'), chips);
    L('UI: bloco de tags visível quando há tags', await ev(() => !document.getElementById('review-tag-filter-wrap').hidden));
    await ev(() => document.querySelector('#review-tag-chips [data-review-tag="a1"]').click());
    await ev(() => document.querySelector('#review-tag-chips [data-review-tag="b2"]').click());
    L('UI: selecionar 2 tags ⇒ filtro OR', JSON.stringify(await ev(() => STATE.studySettings.reviewTagFilter)) === '["a1","b2"]');
    L('UI: chips marcados (aria-pressed)', await ev(() => document.querySelectorAll('#review-tag-chips [aria-pressed="true"]').length === 2));
    await ev(() => document.getElementById('review-tag-clear').click());
    L('UI: limpar filtro', (await ev(() => STATE.studySettings.reviewTagFilter.length)) === 0);
    // estado vazio não quebra
    await ev(() => { STATE.studySettings.reviewTagFilter = ['nao-existe']; startReviewSession(); });
    L('estado vazio: Review não quebra e explica', (await ev(() => document.getElementById('review-content').textContent)).length > 0);
    await ev(() => { STATE.studySettings.reviewTagFilter = []; });
    // filtro serializa
    L('filtro persiste no estado salvo', await ev(() => { STATE.studySettings.reviewTagFilter = ['a1']; const s = JSON.stringify(serializeState()).includes('"reviewTagFilter":["a1"]'); STATE.studySettings.reviewTagFilter = []; return s; }));

    // ===== Aluno vê tags do Teacher Card mas sem controle de edição =====
    await ev((a) => { window.__DB.decks.push({ id: 7100, kind: 'teacher_root', owner_id: 'U', teacher_id: 'T', language_app_key: a, parent_deck_id: null, name: 'T' }); switchTab('my-flashcards'); }, appKey);
    await page.waitForSelector('#teacher-decks-section');
    const ro = await ev(() => { const el = document.querySelector('[data-teacher-tags]'); return { shown: !!el && el.textContent.includes('prof'), removeBtns: document.querySelectorAll('#teacher-decks-section [data-tag-remove], #teacher-decks-section [data-tags-input]').length }; });
    L('aluno: vê as tags dos Teacher Cards (somente leitura, sem input/remover)', ro.shown && ro.removeBtns === 0, ro);

    // ===== Professora: editor de Tags no admin =====
    await ev((a) => {
      CURRENT_USER = { id: 'T' }; window.__uid = 'T'; isAdminUser = () => true;
      window.__DB.teacher_students = [{ teacher_id: 'T', student_id: 'S1', language_app_key: a, status: 'active' }];
      fetchMyStudents = async () => [{ student_id: 'S1', username: 'ana', display_name: 'Ana', language_app_key: a, status: 'active' }];
      switchTab('admin-badges'); switchAdminPanelSection('flashcards');
    }, appKey);
    await page.waitForSelector('[data-student-checkbox]');
    await page.check('[data-student-checkbox][value="S1"]:visible');
    await page.waitForSelector('#admin-flashcard-tags [data-tags-input]');
    await page.fill('#admin-flashcard-tags [data-tags-input]', 'Professora Tag, a1');
    await page.click('#admin-flashcard-tags [data-tags-add]');
    await page.selectOption('#admin-flashcard-card-type-preview', 'normal');
    for (let i = 0; i < 2; i++) await page.click('#admin-flashcard-native-fields [data-field-add]');
    const ai = page.locator('#admin-flashcard-native-fields [data-field-content]');
    await ai.nth(0).fill('a'); await ai.nth(1).fill('b');
    await page.click('#admin-create-flashcard-btn');
    await page.waitForFunction(() => (window.__tinserts || []).length === 1, null, { timeout: 8000 });
    const ti = await ev(() => window.__tinserts[0]);
    L('professora cria Teacher Card com tags normalizadas', JSON.stringify(ti.tags) === '["professora-tag","a1"]', ti.tags);
    await page.waitForSelector('[data-row-tags]');
    L('lista da professora mostra as tags do cartão', await ev(() => document.querySelector('[data-row-tags]').textContent.includes('#professora-tag')));

    L('nenhum pageerror', errors.length === 0, errors.slice(0, 3));
  }
  await browser.close(); server.close();
  console.log(`Fase I (Tags) playwright: ${passed}/${passed + failed} verificações` + (failed ? ` — ${failed} FALHAS` : ' — OK'));
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

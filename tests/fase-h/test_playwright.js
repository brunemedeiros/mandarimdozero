// Fase H -- Playwright (Chromium real), FR + ZH.
// Professora (Painel > Flashcards): árvore por aluno+idioma, subdeck, cartão no
// subdeck, troca de aluno/idioma sem vazar Deck, mover, excluir Teacher Deck
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
    const otherKey = lang === 'fr' ? 'mandarim' : 'frances';
    const { page, errors } = await bootPage(browser, lang, port);
    const ev = (fn, arg) => page.evaluate(fn, arg);
    const L = (n, c, x) => check(lang + ' ' + n, c, x);
    const trailBefore = await ev(() => STATE.cards.filter(c => c.origin === 'study').length);

    // ===== PROFESSORA A =====
    await ev(([appKey, otherKey]) => {
      CURRENT_USER = { id: 'T' }; window.__uid = 'T';
      isAdminUser = () => true;
      window.__DB.teacher_students = [
        { teacher_id: 'T', student_id: 'S1', language_app_key: appKey, status: 'active' },
        { teacher_id: 'T', student_id: 'S1', language_app_key: otherKey, status: 'active' },
        { teacher_id: 'T', student_id: 'S2', language_app_key: appKey, status: 'active' },
        { teacher_id: 'T', student_id: 'S3', language_app_key: appKey, status: 'removed' }];
      // fetchMyStudents real devolve TODOS os status; a UI precisa filtrar os ativos
      fetchMyStudents = async () => [
        { student_id: 'S1', username: 'ana', display_name: 'Ana', language_app_key: appKey, status: 'active' },
        { student_id: 'S1', username: 'ana', display_name: 'Ana', language_app_key: otherKey, status: 'active' },
        { student_id: 'S2', username: 'bia', display_name: 'Bia', language_app_key: appKey, status: 'active' },
        { student_id: 'S3', username: 'cris', display_name: 'Cris', language_app_key: appKey, status: 'removed' }];
      window.__DB.teacher_flashcards.push({ id: 1, teacher_id: 'T', student_id: 'S1', language_app_key: appKey, status: 'active', front: 'hist', back_trans: 'hist', deck_id: null, revision: 0, created_at: '2026-01-01T00:00:00Z', tags: [] });
      switchTab('admin-badges');
      switchAdminPanelSection('flashcards');
    }, [appKey, otherKey]);
    await page.waitForSelector('[data-student-checkbox]');
    L('H6 vínculo removido não aparece no seletor de alunos', await ev(() => ![...document.querySelectorAll('[data-student-row]')].some(r => r.textContent.includes('cris')) && document.querySelectorAll('[data-student-checkbox]').length === 3));
    L('bootstrap é lazy: nenhum Teacher Deck no boot', await ev(() => window.__DB.decks.filter(d => d.kind === 'teacher_root').length === 0));

    // H8: aluno em 2 idiomas -- só a linha do idioma ativo é selecionada
    const activeLang = await ev(() => ADMIN_FLASHCARDS_STATE.langFilter);
    L('H8 idioma ativo inicial é 1 dos idiomas presentes', [appKey, otherKey].includes(activeLang), activeLang);
    await page.click(`[data-lang-filter="${appKey}"]`).catch(() => {});
    await page.check('[data-student-checkbox][value="S1"]:visible');
    await page.waitForSelector('[data-dest-select="S1"]');
    L('H8 aluno em 2 idiomas: 1 seletor de destino, só do idioma ativo', await ev(a => document.querySelectorAll('[data-dest-select="S1"]').length === 1 && window.__DB.decks.filter(d => d.kind === 'teacher_root').every(d => d.language_app_key === a), appKey));
    // H1: árvore visível
    await page.waitForSelector('[data-tree-list="S1"] [data-tree-row]');
    L('H1 árvore do aluno aparece com o teacher_root como raiz', await ev(() => { const rows = document.querySelectorAll('[data-tree-list="S1"] [data-tree-row]'); return rows.length === 1 && rows[0].textContent.includes('Cartões da professora'); }));
    L('H4 teacher_root não tem botão de excluir', await ev(() => document.querySelectorAll('[data-tree-list="S1"] [data-tree-delete]').length === 0));
    // H2: subdeck
    await page.fill('[data-dest-subname="S1"]', 'Verbos');
    await page.click('[data-dest-newsub="S1"]');
    await page.waitForFunction(() => document.querySelectorAll('[data-dest-select="S1"] option').length === 2);
    await page.waitForFunction(() => document.querySelectorAll('[data-tree-list="S1"] [data-tree-row]').length === 2);
    const sub = await ev(() => window.__DB.decks.find(d => d.kind === 'teacher' && d.name === 'Verbos'));
    L('H2 subdeck: kind teacher, aluno/professora/idioma herdados, sob o teacher_root', !!sub && sub.owner_id === 'S1' && sub.teacher_id === 'T' && sub.language_app_key === appKey && await ev(() => window.__DB.decks.find(x => x.id === window.__DB.decks.find(d => d.name === 'Verbos').parent_deck_id).kind === 'teacher_root'));
    await page.fill('[data-dest-subname="S1"]', '   ');
    await page.click('[data-dest-newsub="S1"]');
    L('H2 nome vazio rejeitado na UI (mensagem, nada criado)', await ev(() => document.querySelector('[data-dest-err="S1"]').textContent.length > 0 && window.__DB.decks.filter(d => d.kind === 'teacher').length === 1));
    // H1: card criado no subdeck
    await page.selectOption('#admin-flashcard-card-type-preview', 'normal');
    for (let i = 0; i < 2; i++) await page.click('#admin-flashcard-native-fields [data-field-add]');
    const inp = page.locator('#admin-flashcard-native-fields [data-field-content]');
    await inp.nth(0).fill(lang === 'fr' ? 'le chat' : '猫'); await inp.nth(1).fill('o gato');
    await page.click('#admin-create-flashcard-btn');
    await page.waitForFunction(() => window.__DB.teacher_flashcards.length === 2, null, { timeout: 8000 });
    const c1 = await ev(() => window.__DB.teacher_flashcards[1]);
    L('H1 cartão criado no subdeck escolhido (deck_id no INSERT), nativo', c1.deck_id === sub.id && c1.student_id === 'S1' && c1.language_app_key === appKey && Array.isArray(c1.fields));
    await page.waitForSelector('[data-tree-list="S1"] [data-tree-row]');
    L('H4 subdeck com cartão: botão de excluir desabilitado', await ev(() => { const b = document.querySelector('[data-tree-list="S1"] [data-tree-delete]'); return !!b && b.disabled; }));
    L('H11 histórico (deck_id nulo) intocado', await ev(() => { const h = window.__DB.teacher_flashcards.find(r => r.id === 1); return h.deck_id === null && h.front === 'hist'; }));

    // H8: trocar de aluno -> Deck anterior some do contexto
    await page.uncheck('[data-student-checkbox][value="S1"]');
    await page.check('[data-student-checkbox][value="S2"]');
    await page.waitForSelector('[data-dest-select="S2"]');
    await page.waitForFunction(() => document.querySelectorAll('[data-dest-select="S1"]').length === 0);
    L('H8 trocar de aluno: contexto do aluno anterior desaparece (seletor e árvore)', await ev(() => document.querySelectorAll('[data-dest-select="S1"],[data-tree-list="S1"]').length === 0 && ![...document.querySelectorAll('#admin-flashcard-destinations option')].some(o => o.textContent.includes('Verbos'))));
    await page.waitForSelector('[data-tree-list="S2"] [data-tree-row]');
    L('H8 S2 mostra só a própria árvore (só teacher_root)', await ev(() => document.querySelectorAll('[data-tree-list="S2"] [data-tree-row]').length === 1));
    // card p/ S2 vai pro teacher_root DELE (não herda deck do S1)
    await page.selectOption('#admin-flashcard-card-type-preview', 'normal');
    for (let i = 0; i < 2; i++) await page.click('#admin-flashcard-native-fields [data-field-add]');
    const inp2 = page.locator('#admin-flashcard-native-fields [data-field-content]');
    await inp2.nth(0).fill('a'); await inp2.nth(1).fill('b');
    await page.click('#admin-create-flashcard-btn');
    await page.waitForFunction(() => window.__DB.teacher_flashcards.length === 3, null, { timeout: 8000 });
    const c2 = await ev(() => window.__DB.teacher_flashcards[2]);
    const troot2 = await ev(() => window.__DB.decks.find(d => d.kind === 'teacher_root' && d.owner_id === 'S2').id);
    L('H8/H7 cartão do S2 no teacher_root do S2 (nunca no deck do S1)', c2.student_id === 'S2' && c2.deck_id === troot2 && c2.deck_id !== c1.deck_id);

    // H8: trocar de IDIOMA do mesmo aluno
    await page.click(`[data-lang-filter="${otherKey}"]`);
    await page.check('[data-student-checkbox][value="S1"]:visible');
    await page.waitForSelector('[data-dest-select="S1"]');
    L('H8 trocar de idioma zera a seleção e mostra a árvore do OUTRO idioma do aluno', await ev(o => document.querySelectorAll('[data-dest-select]').length === 1 && window.__DB.decks.filter(d => d.kind === 'teacher_root' && d.owner_id === 'S1').some(d => d.language_app_key === o) && ![...document.querySelectorAll('#admin-flashcard-destinations option')].some(x => x.textContent.includes('Verbos')), otherKey));
    L('H8 nenhum Deck do idioma anterior vaza no destino', await ev(o => { const id = Number(document.querySelector('[data-dest-select="S1"]').value); return window.__DB.decks.find(d => d.id === id).language_app_key === o; }, otherKey));
    await page.click(`[data-lang-filter="${appKey}"]`);
    await page.check('[data-student-checkbox][value="S1"]:visible');
    await page.waitForSelector('[data-dest-select="S1"]');

    // H3: mover cartão entre Teacher Decks; opções só do próprio aluno
    await page.waitForSelector(`[data-move-card="${c1.id}"]`);
    const troot1 = await ev(() => window.__DB.decks.find(d => d.kind === 'teacher_root' && d.owner_id === 'S1' && d.language_app_key === window.__appKey).id).catch(() => null);
    const troot1b = await ev(a => window.__DB.decks.find(d => d.kind === 'teacher_root' && d.owner_id === 'S1' && d.language_app_key === a).id, appKey);
    const moveOpts = await ev(id => [...document.querySelectorAll(`[data-move-card="${id}"] option`)].map(o => o.value).filter(Boolean), c1.id);
    L('H3 opções de mover: só Decks do mesmo aluno/idioma (e diferentes do atual)', moveOpts.length === 1 && moveOpts[0] === String(troot1b), moveOpts);
    const before = await ev(id => JSON.stringify({ ...window.__DB.teacher_flashcards.find(r => r.id === id), deck_id: null }), c1.id);
    await page.selectOption(`[data-move-card="${c1.id}"]`, String(troot1b));
    await page.waitForFunction(([id, t]) => window.__DB.teacher_flashcards.find(r => r.id === id).deck_id === t, [c1.id, troot1b]);
    const after = await ev(id => JSON.stringify({ ...window.__DB.teacher_flashcards.find(r => r.id === id), deck_id: null }), c1.id);
    L('H3 mover a Note muda SÓ deck_id (id/revision/fields/modo intactos)', before === after);
    await page.waitForFunction(() => { const b = document.querySelector('[data-tree-list="S1"] [data-tree-delete]'); return !!b && !b.disabled; });
    L('H3/H4 depois de mover, o subdeck esvaziado passa a poder ser excluído', true);

    // H4: excluir subdeck vazio pela árvore
    const delsBefore = await ev(() => window.__deletes || 0);
    await page.click('[data-tree-list="S1"] [data-tree-delete]');
    await page.waitForFunction(() => document.querySelectorAll('[data-tree-list="S1"] [data-tree-row]').length === 1);
    L('H4 subdeck vazio excluído pela UI (1 DELETE), teacher_root e cartões intactos', await ev(n => (window.__deletes || 0) === n + 1 && !window.__DB.decks.some(d => d.name === 'Verbos') && window.__DB.teacher_flashcards.length === 3 && window.__DB.teacher_flashcards.every(r => r.id === 1 || r.deck_id != null), delsBefore));

    // H6/H12: vínculo passa a inativo -> o aluno some do seletor no próximo render
    await ev(() => { window.__DB.teacher_students.forEach(l => { if (l.student_id === 'S2') l.status = 'removed'; }); });
    await ev(() => { const o = fetchMyStudents; fetchMyStudents = async () => (await o()).map(s => s.student_id === 'S2' ? { ...s, status: 'removed' } : s); renderAdminFlashcardsView(); });
    await page.waitForFunction(() => document.querySelectorAll('[data-student-checkbox]').length === 2);
    L('H6 vínculo inativo: aluno some do seletor, cartões históricos dele permanecem no banco', await ev(() => ![...document.querySelectorAll('[data-student-row]')].some(r => r.textContent.includes('bia')) && window.__DB.teacher_flashcards.some(r => r.student_id === 'S2')));

    // ===== ALUNO S1 =====
    await ev(() => {
      CURRENT_USER = { id: 'S1' }; window.__uid = 'S1'; isAdminUser = () => false;
      ensureProfileLoaded = async () => ({ plan_tier: 'free' });
    });
    await ev(async () => {
      const boot = await ensureDecksForCurrentUser(APP_KEY);
      window.__DB.own_flashcards.push({ id: 900, owner_id: 'S1', language_app_key: APP_KEY, status: 'active', front: 'pessoal', back_trans: 'pessoal', deck_id: boot.personalRootDeckId, revision: 0, tags: [], created_at: new Date().toISOString() });
      STATE.cards = STATE.cards.filter(c => c.origin === 'study');
      await mergeTeacherFlashcardsIntoState();
      await mergeSelfFlashcardsIntoState();
      switchTab('my-flashcards');
    });
    await page.waitForSelector('#teacher-decks-section', { timeout: 8000 });
    const sec = await ev(() => document.getElementById('teacher-decks-section').innerText);
    L('H5/H10 aluno vê a árvore com contagens New/Aprendendo/Revisar', /novos/.test(sec) && /aprendendo/.test(sec) && /para revisar/.test(sec) && sec.includes('Cartões da professora'), sec);
    L('H5 aluno: seção só leitura (sem select/input/textarea; só botões "Estudar")', await ev(() => { const s = document.getElementById('teacher-decks-section'); return s.querySelectorAll('select,input,textarea').length === 0 && s.querySelectorAll('button').length === s.querySelectorAll('[data-study-deck]').length; }));
    L('H5 aluno: seção separada de Meus Decks e Course', await ev(() => { const s = document.getElementById('teacher-decks-section'); return !s.querySelector('[data-deck-new],#my-deck-name') && !s.textContent.includes('Meus Decks'); }));
    L('H5 aluno não vê Decks de outro aluno nem de outro idioma', await ev(a => document.querySelectorAll('#teacher-decks-section [data-study-deck]').length === window.__DB.decks.filter(d => d.owner_id === 'S1' && d.language_app_key === a && ['teacher_root','teacher'].includes(d.kind)).length, appKey));
    // estudar
    const rootId = await ev(a => window.__DB.decks.find(d => d.kind === 'teacher_root' && d.owner_id === 'S1' && d.language_app_key === a).id, appKey);
    await page.click(`#teacher-decks-section [data-study-deck="${rootId}"]`);
    await page.waitForFunction(() => STATE.reviewSessionDeckId != null && STATE.reviewQueue.length > 0, null, { timeout: 8000 });
    const rv = await ev(() => ({ deckId: STATE.reviewSessionDeckId, q: STATE.reviewQueue.map(c => ({ o: c.origin, id: c.id })) }));
    L('H5 Review do Teacher Deck: só origin teacher (sem pessoal/curso/trilha)', rv.deckId === rootId && rv.q.length > 0 && rv.q.every(c => c.o === 'teacher'), rv);
    const g = await ev(() => { const c = STATE.reviewQueue[STATE.reviewIndex]; const b = { reps: c.reps, d: c.deckId }; gradeCurrentCard(2); return { b, a: { reps: c.reps, d: c.deckId } }; });
    L('H5 FSRS existente: grade altera só o card estudado; Deck preservado', g.a.reps === g.b.reps + 1 && g.a.d === g.b.d);
    L('H5 trilha intacta', await ev(n => STATE.cards.filter(c => c.origin === 'study').length === n, trailBefore));

    // ===== H9: duas professoras =====
    await ev((a) => {
      CURRENT_USER = { id: 'T2' }; window.__uid = 'T2'; isAdminUser = () => true;
      window.__DB.teacher_students.push({ teacher_id: 'T2', student_id: 'S1', language_app_key: a, status: 'active' });
      fetchMyStudents = async () => [{ student_id: 'S1', username: 'ana', display_name: 'Ana', language_app_key: a, status: 'active' }];
      switchTab('admin-badges'); switchAdminPanelSection('flashcards');
    }, appKey);
    await page.waitForSelector('[data-student-checkbox]');
    await page.check('[data-student-checkbox][value="S1"]');
    await page.waitForSelector('[data-tree-list="S1"] [data-tree-row]');
    const rootB = await ev(a => window.__DB.decks.find(d => d.kind === 'teacher_root' && d.teacher_id === 'T2' && d.language_app_key === a), appKey);
    L('H9 professora B tem a SUA raiz para o mesmo aluno/idioma', !!rootB && rootB.id !== rootId);
    L('H9 árvore de B não mostra nada da árvore de A', await ev(() => document.querySelectorAll('[data-tree-list="S1"] [data-tree-row]').length === 1));
    L('H9 destino de B só oferece a raiz de B', await ev(id => [...document.querySelectorAll('[data-dest-select="S1"] option')].every(o => Number(o.value) === id), rootB.id));
    L('H9 B não vê os cartões de A (lista de cartões vazia)', await ev(() => !document.getElementById('admin-flashcards-cards-box').textContent.includes('le chat') && !document.getElementById('admin-flashcards-cards-box').textContent.includes('猫')));
    // aluno enxerga as duas
    await ev(() => { CURRENT_USER = { id: 'S1' }; window.__uid = 'S1'; isAdminUser = () => false; switchTab('my-flashcards'); });
    await page.waitForSelector('#teacher-decks-section', { timeout: 8000 });
    await page.waitForFunction(() => document.querySelectorAll('#teacher-decks-section [data-study-deck]').length >= 2);
    L('H9 aluno enxerga as árvores das duas professoras', await ev(a => document.querySelectorAll('#teacher-decks-section [data-study-deck]').length === window.__DB.decks.filter(d => d.owner_id === 'S1' && d.language_app_key === a && ['teacher_root','teacher'].includes(d.kind)).length, appKey));
    L('sem erros de JS na página', errors.length === 0, errors);
  }
  await browser.close(); server.close();
  console.log(`Fase H -- playwright: ${passed}/${passed + failed} verificações` + (failed ? ` — ${failed} FALHAS` : ' — OK'));
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

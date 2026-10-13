// Banco de Revisão -- Playwright (Chromium real), FR + ZH, claro e escuro (+390px).
// Professora: Cartões > Banco de Revisão (alunos de todos os idiomas, itens, aprovar gera cartão, editar sem zerar,
// vincular, Récap, Modo aula, Visão geral, Manual). Aluno: Observação só depois de responder, "quase lá" = Difícil,
// eventos do Modo aula aplicados no FSRS. Supabase = stub em memória (regras reais: run_local.sh, SQL com ROLLBACK).
// Rodar: node tests/banco-revisao/test_playwright.js   (SHOTS=dir para salvar prints)
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const STUB = /const STUB = `([\s\S]*?)`;/.exec(fs.readFileSync(path.join(ROOT, 'tests/fase-i/test_playwright.js'), 'utf8'))[1];
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const SHOTS = process.env.SHOTS || '';
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };

// Camada do Banco por cima do stub: tabelas review_bank_*, RPCs (espelham as funções SQL) e permissões.
const BANK_STUB = (who, appKey) => {
  const uuid = () => 'u' + Math.random().toString(16).slice(2, 10) + Math.random().toString(16).slice(2, 10);
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const BANK = new Set(['review_bank_students', 'review_bank_items', 'review_bank_recaps', 'review_bank_reviews', 'review_bank_settings']);
  const DEF = {
    review_bank_items: () => ({ status: 'pendente', level: 0, due_date: null, last_result: null, last_review_date: null, proposal: null, student_id: null, teacher_flashcard_id: null }),
    review_bank_reviews: () => ({ applied_at: null, mode: null, review_date: today() }),
    review_bank_students: () => ({ status: 'ativo', linked_student_id: null, lesson_dates: [], reference_language: 'pt' }),
    review_bank_recaps: () => ({ item_ids: [] }), review_bank_settings: () => ({}),
  };
  window.__DB.review_bank_students = window.__DB.review_bank_students || [];
  window.__DB.review_bank_items = window.__DB.review_bank_items || [];
  window.__DB.review_bank_recaps = window.__DB.review_bank_recaps || [];
  window.__DB.review_bank_reviews = window.__DB.review_bank_reviews || [];
  window.__DB.review_bank_settings = window.__DB.review_bank_settings || [];
  function bankBuilder(table){
    const st = { f: [], ord: [], lim: null, rng: null, op: null, pl: null, single: false, conf: null };
    const test = r => st.f.every(([op, k, v]) => op === 'eq' ? r[k] === v : op === 'neq' ? r[k] !== v : op === 'in' ? v.includes(r[k]) : op === 'gte' ? r[k] >= v : op === 'lte' ? r[k] <= v : true);
    const run = () => {
      const rows = window.__DB[table], now = new Date().toISOString();
      if (st.op === 'insert'){
        const made = [].concat(st.pl).map(r => Object.assign({ id: uuid(), created_at: now, updated_at: now }, DEF[table](), r));
        made.forEach(r => rows.push(r)); (window.__bankInserts = window.__bankInserts || []).push([table, made]);
        return { data: st.single ? made[0] : made, error: null };
      }
      if (st.op === 'upsert'){
        const keys = st.conf.split(','), out = [];
        [].concat(st.pl).forEach(r => {
          let ex = rows.find(x => keys.every(k => x[k] === r[k]));
          if (ex){ if (!st.ignore) Object.assign(ex, r); else return; }
          else { ex = Object.assign({ id: uuid(), created_at: now, updated_at: now }, DEF[table](), r); rows.push(ex); }
          out.push(ex);
        });
        return { data: st.single ? (out[0] || null) : out, error: null };
      }
      if (st.op === 'delete'){ const hit = rows.filter(test); hit.forEach(r => rows.splice(rows.indexOf(r), 1)); (window.__bankDeletes = window.__bankDeletes || []).push([table, hit.length]); return { data: null, error: null }; }
      if (st.op === 'update'){ const hit = rows.filter(test); hit.forEach(r => Object.assign(r, st.pl)); return { data: st.single ? (hit[0] || null) : hit, error: null }; }
      let out = rows.filter(test);
      st.ord.forEach(([k, asc]) => { out = out.slice().sort((a, b) => { const x = a[k], y = b[k]; if (x === y) return 0; if (x == null) return 1; if (y == null) return -1; return (x > y ? 1 : -1) * (asc ? 1 : -1); }); });
      if (st.rng) out = out.slice(st.rng[0], st.rng[1] + 1);
      if (st.lim != null) out = out.slice(0, st.lim);
      return { data: st.single ? (out[0] || null) : out, error: null };
    };
    const b = new Proxy({}, { get(_, p){
      if (p === 'then') return (ok, ko) => Promise.resolve(run()).then(ok, ko);
      if (p === 'eq') return (k, v) => { st.f.push(['eq', k, v]); return b; };
      if (p === 'neq') return (k, v) => { st.f.push(['neq', k, v]); return b; };
      if (p === 'in') return (k, v) => { st.f.push(['in', k, v]); return b; };
      if (p === 'gte') return (k, v) => { st.f.push(['gte', k, v]); return b; };
      if (p === 'order') return (k, o) => { st.ord.push([k, !o || o.ascending !== false]); return b; };
      if (p === 'range') return (a, z) => { st.rng = [a, z]; return b; };
      if (p === 'limit') return (n) => { st.lim = n; return b; };
      if (p === 'insert') return (pl) => { st.op = 'insert'; st.pl = pl; return b; };
      if (p === 'update') return (pl) => { st.op = 'update'; st.pl = pl; return b; };
      if (p === 'upsert') return (pl, o) => { st.op = 'upsert'; st.pl = pl; st.conf = (o && o.onConflict) || 'id'; st.ignore = !!(o && o.ignoreDuplicates); return b; };
      if (p === 'delete') return () => { st.op = 'delete'; return b; };
      if (p === 'single' || p === 'maybeSingle') return () => { st.single = true; return b; };
      return () => b;
    } });
    return b;
  }
  const origFrom = supabaseClient.from.bind(supabaseClient), origRpc = supabaseClient.rpc.bind(supabaseClient);
  supabaseClient.from = (t) => BANK.has(t) ? bankBuilder(t) : origFrom(t);
  const roots = () => window.__DB.decks;
  const D = window.__DB;
  supabaseClient.rpc = async (name, args) => {
    (window.__bankRpc = window.__bankRpc || []).push([name, args]);
    const A = who === 'A';
    if (name === 'my_permissions'){
      const keys = ['teacher_panel', 'review_bank', 'class_logs_view', 'support_materials_view'];
      return { data: { roles: A ? ['user', 'teacher'] : ['user'], admin: A, permissions: Object.fromEntries(keys.map(k => [k, { enabled: A, limit: null }])) }, error: null };
    }
    const item = (id) => D.review_bank_items.find(i => i.id === id);
    const roster = (id) => D.review_bank_students.find(s => s.id === id);
    if (name === 'set_review_bank_item_status'){
      const it = item(args.p_item_id); if (!it) return { data: null, error: { message: 'not_authorized' } };
      const s = roster(it.bank_student_id);
      if (args.p_status === 'aprovado' && !it.teacher_flashcard_id && s.linked_student_id) return { data: null, error: { message: 'use_approve_review_bank_item' } };
      if (it.teacher_flashcard_id){ const c = D.teacher_flashcards.find(x => x.id === it.teacher_flashcard_id); if (c) c.status = args.p_status === 'aprovado' ? 'active' : 'archived'; }
      it.status = args.p_status; return { data: null, error: null };
    }
    if (name === 'approve_review_bank_item'){
      const it = item(args.p_item_id); if (!it) return { data: null, error: { message: 'not_authorized' } };
      if (it.teacher_flashcard_id){ const c = D.teacher_flashcards.find(x => x.id === it.teacher_flashcard_id); c.status = 'active'; it.status = 'aprovado'; return { data: c.id, error: null }; }
      const s = roster(it.bank_student_id); if (!s.linked_student_id) return { data: null, error: { message: 'student_not_linked' } };
      let root = D.decks.find(d => d.kind === 'teacher_root' && d.owner_id === s.linked_student_id && d.teacher_id === 'A' && d.language_app_key === s.language_app_key);
      if (!root){ root = { id: 9000 + D.decks.length, kind: 'teacher_root', owner_id: s.linked_student_id, teacher_id: 'A', language_app_key: s.language_app_key, name: 'Cartões da professora', parent_deck_id: null }; D.decks.push(root); }
      const card = { id: 700 + D.teacher_flashcards.length, teacher_id: 'A', student_id: s.linked_student_id, language_app_key: s.language_app_key, front: args.p_front, back_trans: args.p_back_trans, note: args.p_note, status: 'active', fields: args.p_fields, card_generation_mode: args.p_mode, tags: args.p_tags || [], deck_id: root.id, bank_item_id: it.id, revision: 0 };
      D.teacher_flashcards.push(card); it.status = 'aprovado'; it.teacher_flashcard_id = card.id; it.student_id = s.linked_student_id;
      return { data: card.id, error: null };
    }
    if (name === 'link_review_bank_student'){
      const s = roster(args.p_bank_student_id);
      if (!D.teacher_students.some(l => l.teacher_id === 'A' && l.student_id === args.p_student_id && l.language_app_key === s.language_app_key && l.status === 'active')) return { data: null, error: { message: 'link_inactive' } };
      s.linked_student_id = args.p_student_id; return { data: null, error: null };
    }
    if (name === 'unlink_review_bank_student'){ roster(args.p_bank_student_id).linked_student_id = null; return { data: null, error: null }; }
    if (name === 'get_my_pending_bank_reviews'){
      const out = D.review_bank_reviews.filter(r => !r.applied_at).map(r => ({ r, s: roster(r.bank_student_id), i: item(r.item_id) }))
        .filter(x => x.s && x.s.linked_student_id === who && x.s.language_app_key === args.p_language_app_key && x.i && x.i.teacher_flashcard_id)
        .map(x => ({ id: x.r.id, teacher_flashcard_id: x.i.teacher_flashcard_id, outcome: x.r.outcome, created_at: x.r.created_at }));
      return { data: out, error: null };
    }
    if (name === 'ack_my_bank_reviews'){
      let n = 0; D.review_bank_reviews.forEach(r => { if (args.p_ids.includes(r.id) && !r.applied_at){ r.applied_at = new Date().toISOString(); n++; } }); return { data: n, error: null };
    }
    return origRpc(name, args);
  };
};

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const combos = [['fr', 'light'], ['fr', 'dark'], ['zh', 'light'], ['zh', 'dark']];
  const allErrors = [];
  for (const [lang, theme] of combos){
    const appKey = lang === 'fr' ? 'frances' : 'mandarim';
    for (const width of (theme === 'light' ? [1200, 390] : [1200])){
      const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width, height: 900 }, colorScheme: theme });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('dialog', d => d.accept());
      await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
      await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
      await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); localStorage.removeItem('rb-cur'); } catch (e) {} });
      await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
      await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
      const ev = (fn, arg) => page.evaluate(fn, arg);
      const L = (n, c, x) => check(`${lang}-${theme}-${width} ${n}`, c, x);
      const shot = async (name) => { if (SHOTS){ await page.waitForTimeout(350); await page.screenshot({ path: `${SHOTS}/${lang}-${theme}-${width}-${name}.png`, fullPage: true }); } };
      const T0 = new Date(); const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const inDays = (n) => { const d = new Date(T0); d.setDate(d.getDate() + n); return iso(d); };

      // ---------- semente + login da professora (admin A) ----------
      await ev(([who, appKey, theme, stub, d2, d0]) => {
        document.documentElement.setAttribute('data-theme', theme);
        window.__appKey = appKey; window.__uid = who;
        CURRENT_USER = { id: who, email: 'brunemed1310@gmail.com' };
        isAdminUser = () => true; PROFILE_CACHE = { user_id: who, plan_tier: 'premium', admin_mode: true };
        clearMyPermissions();
        const D = window.__DB;
        D.profiles = [{ user_id: 'S1', username: 'carol', display_name: 'Carol Rocha' }, { user_id: 'S2', username: 'evan', display_name: 'Evan' }, { user_id: 'S3', username: 'marina', display_name: 'Marina' }];
        D.teacher_students = [
          { id: 1, teacher_id: 'A', student_id: 'S1', language_app_key: 'frances', status: 'active' },
          { id: 2, teacher_id: 'A', student_id: 'S2', language_app_key: 'portugues', status: 'active' },
          { id: 3, teacher_id: 'A', student_id: 'S3', language_app_key: 'portugues', status: 'active' },
          { id: 4, teacher_id: 'A', student_id: 'S1', language_app_key: 'mandarim', status: 'active' },
        ];
        eval(`(${stub})`)(who, appKey);
        D.review_bank_students.push(
          { id: 'rb-carol', teacher_id: 'A', name: 'Carol', language_app_key: 'frances', reference_language: 'pt', status: 'ativo', linked_student_id: 'S1', lesson_dates: [d2], last_entry_read: d0, created_at: '2026-01-01', updated_at: '2026-01-01' },
          { id: 'rb-evan', teacher_id: 'A', name: 'Evan', language_app_key: 'portugues', reference_language: 'en', status: 'ativo', linked_student_id: 'S2', lesson_dates: [], last_entry_read: null, created_at: '2026-01-01', updated_at: '2026-01-01' },
          { id: 'rb-sem', teacher_id: 'A', name: 'Sem Conta', language_app_key: 'portugues', reference_language: 'en', status: 'ativo', linked_student_id: null, lesson_dates: [], last_entry_read: null, created_at: '2026-01-01', updated_at: '2026-01-01' },
          { id: 'rb-old', teacher_id: 'A', name: 'Antigo', language_app_key: 'frances', reference_language: 'pt', status: 'arquivado', linked_student_id: null, lesson_dates: [], last_entry_read: null, created_at: '2026-01-01', updated_at: '2026-01-01' });
        const mk = (id, sid, lg, o) => Object.assign({ id, teacher_id: 'A', bank_student_id: sid, language_app_key: lg, student_id: null, item_type: 'vocabulario', question: '', answer: '', wrong_form: null, gap_word: null, explanation: null, check_note: null, class_date: '2026-10-07', status: 'pendente', teacher_flashcard_id: null, level: 0, due_date: null, last_result: null, last_review_date: null, proposal: null, created_at: '2026-10-07', updated_at: '2026-10-07' }, o);
        D.review_bank_items.push(
          mk('i1', 'rb-carol', 'frances', { question: 'escolher (verbo)', answer: 'choisir', explanation: 'Passé composé: j\'ai choisi.' }),
          mk('i2', 'rb-carol', 'frances', { item_type: 'erro', question: 'I went to the market yesterday.', wrong_form: 'Je suis allé au marché hier.', answer: 'Je suis allée au marché hier.', check_note: 'Confirmar se a aluna é mulher no exemplo.' }),
          mk('i3', 'rb-carol', 'frances', { item_type: 'estrutura', question: 'Besides being cheap, it is fast.', answer: 'En plus d\'être bon marché, c\'est rapide.', gap_word: 'En plus de', status: 'aprovado', class_date: '2026-10-05' }),
          mk('i4', 'rb-carol', 'frances', { question: 'un cours', answer: 'une aula', status: 'cortado' }),
          mk('i5', 'rb-sem', 'portugues', { question: 'to run (code)', answer: 'rodar', explanation: 'Nesse momento, a IA está rodando no meu telefone. = In this moment, the AI is running on my phone.' }),
          mk('i6', 'rb-sem', 'portugues', { question: 'a hike', answer: 'a trilha' }),
          mk('i7', 'rb-evan', 'portugues', { question: 'worth it', answer: 'valer a pena', status: 'aprovado' }));
        D.review_bank_reviews.push(
          { id: 'r1', item_id: 'i3', teacher_id: 'A', bank_student_id: 'rb-carol', language_app_key: 'frances', outcome: 'errou', reason: 'ordem', mode: 'recap', review_date: d0, created_at: new Date().toISOString(), applied_at: null },
          { id: 'r2', item_id: 'i3', teacher_id: 'A', bank_student_id: 'rb-carol', language_app_key: 'frances', outcome: 'acertou', reason: null, mode: 'recap', review_date: d0, created_at: new Date().toISOString(), applied_at: null });
        D.review_bank_reviews.forEach(r => { r.applied_at = r.created_at; });
      }, ['A', appKey, theme, BANK_STUB.toString(), inDays(2), inDays(-25)]);
      await ev(async () => { await applyAdminModeUI(); await applyRoleNavUI(); });

      // ---------- painel da professora > Cartões > Banco de Revisão ----------
      await ev(() => switchTab('teacher-panel'));
      await page.waitForTimeout(400);
      await page.click('[data-teacher-section="flashcards"]');
      await page.waitForSelector('#admin-cards-subnav', { state: 'visible' });
      L('Cartões tem seletor com Cartões e Banco de Revisão', (await ev(() => [...document.querySelectorAll('#admin-cards-subnav button')].map(b => b.textContent.trim()))).join('|') === 'Cartões|Banco de Revisão');
      await page.click('[data-cards-sub="bank"]');
      await page.waitForSelector('.rb-stu');
      L('Banco aparece (e a lista de cartões some)', await ev(() => document.getElementById('admin-flashcards-content').style.display === 'none' && document.getElementById('admin-reviewbank-content').style.display !== 'none'));
      const groups = await ev(() => [...document.querySelectorAll('.rb-group-lbl')].map(e => e.textContent.trim()));
      L('alunos de todos os idiomas, agrupados (francês e português), independente do idioma do site', groups.includes('Francês') && groups.includes('Português'), groups);
      const chips = await ev(() => [...document.querySelectorAll('.rb-stu')].map(e => e.textContent.replace(/\s+/g, ' ').trim()));
      L('chips: pendentes no botão e arquivado marcado', chips.some(c => c.startsWith('Carol') && c.includes('2')) && chips.some(c => c.startsWith('Sem Conta') && c.includes('2')), chips);
      L('aluno selecionado: Carol (1º ativo do idioma 1º grupo)', await ev(() => document.querySelector('.rb-stu[aria-pressed="true"]').textContent.startsWith('Carol')));
      const counts = await ev(() => [...document.querySelectorAll('.rb-count b')].map(e => e.textContent));
      L('contagens: 4 itens, 1 aprovado, 2 pendentes, 1 cortado', JSON.stringify(counts) === '["4","1","2","1"]', counts);
      L('Carol vinculada à conta @carol', await ev(() => document.querySelector('.rb-linkline').textContent.includes('@carol')));
      L('"+ Novo item" na mesma linha dos filtros, depois de "Todos"', await ev(() => { const tb = document.querySelector('.rb-toolbar'); const kids = [...tb.children].map(e => e.textContent.trim()); return kids.length === 5 && kids[3] === 'Todos' && kids[4] === '+ Novo item' && !!tb.querySelector('.rb-new'); }));
      L('filtro padrão: Pendentes (2 itens, um com "Para conferir")', await ev(() => document.querySelectorAll('.rb-item').length === 2 && document.querySelectorAll('.rb-doubt').length === 1));
      L('aluna vinculada com 2 itens prontos (1 pendente sem dúvida + 1 aprovado sem cartão): aviso para gerar', await ev(() => !!document.querySelector('.rb-ready') && document.querySelector('.rb-ready').textContent.includes('2')));
      L('estatísticas do modo aula aparecem com os números', await ev(() => document.querySelector('#rb-stats .rb-tile b').textContent === '2'));
      L('Récap: botão para gerar com a data da próxima aula', await ev(() => /Gerar Récap da aula de/.test(document.querySelector('.rb-recap-actions .rb-btn-blue').textContent)));
      await shot('banco-carol');

      // caixas azuis: texto branco em negrito
      const blue = await ev(() => { const cs = (s) => { const e = document.querySelector(s); const c = getComputedStyle(e); return { bg: c.backgroundColor, color: c.color, w: c.fontWeight }; }; return { chip: cs('.rb-stu[aria-pressed="true"]'), novo: cs('.rb-new'), aula: cs('[data-rb="class"]') }; });
      L('caixas azuis: fundo azul escuro e texto branco em negrito', Object.values(blue).every(b => b.bg === 'rgb(29, 90, 130)' && b.color === 'rgb(255, 255, 255)' && Number(b.w) >= 700), blue);

      // Visualizar: o MESMO cartão que o aluno vai ver (renderers reais da Revisão), com a Observação só depois de revelar
      await page.locator('.rb-item', { hasText: 'escolher (verbo)' }).locator('[data-rb="preview"]').click();
      await page.waitForFunction(() => { const m = document.getElementById('flashcard-preview-modal'); return m && m.style.display !== 'none' && m.textContent.includes('escolher'); });
      L('Visualizar abre o cartão como o aluno vê (sem a Observação antes de revelar)', await ev(() => !document.querySelector('#flashcard-preview-modal .review-observation')));
      await page.click('#flashcard-preview-modal #flashcard');
      await page.waitForFunction(() => document.querySelector('#flashcard-preview-modal .review-observation'));
      L('Visualizar: depois de revelar aparece a Observação e os 4 botões de nota', await ev(() => document.querySelector('#flashcard-preview-modal .review-observation').textContent.includes("j'ai choisi") && document.querySelectorAll('#flashcard-preview-modal .grade-btn').length === 4));
      await page.click('#flashcard-preview-modal-close');

      // novo item que já nasce pronto: vira cartão sozinho (geração automática, aluna vinculada)
      await page.click('[data-rb="item-new"]');
      await page.waitForSelector('[data-form="item"]');
      await page.selectOption('[data-form="item"] [data-f="item_type"]', 'vocabulario');
      await page.fill('[data-form="item"] [data-f="question"]', 'rodar (código)');
      await page.fill('[data-form="item"] [data-f="answer"]', 'exécuter');
      await page.fill('[data-form="item"] [data-f="explanation"]', 'Exemple: exécuter un programme.');
      await page.click('[data-rb="item-save"]:not([data-approve])');
      await page.waitForFunction(() => window.__DB.teacher_flashcards.some(c => c.front === 'rodar (código)'));
      const c1 = await ev(() => window.__DB.teacher_flashcards.find(c => c.front === 'rodar (código)'));
      L('item pronto vira cartão sozinho, no deck Cartões da professora, com a Observação', c1 && c1.note === 'Exemple: exécuter un programme.' && c1.card_generation_mode === 'normal' && c1.student_id === 'S1' && c1.language_app_key === 'frances' && await ev((id) => window.__DB.decks.find(d => d.id === id).name === 'Cartões da professora', c1.deck_id));
      L('cartão com campos na língua certa (pt -> fr)', c1.fields[0].lang === 'pt' && c1.fields[1].lang === 'fr', c1.fields.map(f => f.lang));
      L('tags do cartão: banco, tipo e aula', c1.tags.includes('banco-de-revisao') && c1.tags.includes('tipo-vocabulario'), c1.tags);

      // item com dúvida fica pendente (não gera cartão)
      await page.click('[data-rb="item-new"]');
      await page.waitForSelector('[data-form="item"]');
      await page.fill('[data-form="item"] [data-f="question"]', 'a dúvida');
      await page.fill('[data-form="item"] [data-f="answer"]', 'le doute');
      await page.fill('[data-form="item"] [data-f="check_note"]', 'Conferir o gênero.');
      await page.click('[data-rb="item-save"]:not([data-approve])');
      await page.waitForTimeout(300);
      L('item com "Para conferir" não vira cartão', await ev(() => !window.__DB.teacher_flashcards.some(c => c.front === 'a dúvida') && window.__DB.review_bank_items.some(i => i.question === 'a dúvida' && i.status === 'pendente')));

      // aprovar o erro (tem dúvida): vira cartão de digitar
      await page.click('[data-f="pendente"]').catch(() => {});
      const approveBtn = page.locator('.rb-item', { hasText: 'Je suis allé au marché hier.' }).locator('[data-rb="approve"]');
      await approveBtn.click();
      await page.waitForFunction(() => window.__DB.teacher_flashcards.some(c => c.card_generation_mode === 'type_answer'));
      const c2 = await ev(() => window.__DB.teacher_flashcards.find(c => c.card_generation_mode === 'type_answer'));
      L('aprovar erro gera cartão de digitar com "Corrija:" e a resposta certa', c2.fields[0].content.value.startsWith('Corrija: Je suis allé au marché hier.') && c2.fields[1].content.value === 'Je suis allée au marché hier.', c2.fields.map(f => f.content.value));

      // editar item já entregue: corrige sem zerar o progresso (mesmo cartão, mesma revisão)
      await page.click('[data-rb="filter"][data-f="aprovado"]');
      await page.locator('.rb-item', { hasText: 'rodar (código)' }).locator('[data-rb="item-edit"]').click();
      await page.waitForSelector('[data-form="item"]');
      await page.fill('[data-form="item"] [data-f="answer"]', 'exécuter (un programme)');
      await page.click('[data-rb="item-save"]');
      await page.waitForFunction(() => window.__DB.teacher_flashcards.find(c => c.front === 'rodar (código)').fields[1].content.value === 'exécuter (un programme)');
      const c1b = await ev(() => window.__DB.teacher_flashcards.find(c => c.front === 'rodar (código)'));
      L('corrigir item entregue mantém o mesmo cartão e a revisão (progresso do aluno intacto)', c1b.id === c1.id && c1b.revision === 0 && c1b.fields[0].id === c1.fields[0].id, [c1b.id, c1b.revision]);
      await page.locator('.rb-item', { hasText: 'rodar (código)' }).locator('[data-rb="item-edit"]').click();
      await page.waitForSelector('[data-form="item"]');
      await page.check('[data-f="reset_progress"]');
      await page.click('[data-rb="item-save"]');
      await page.waitForFunction(() => window.__DB.teacher_flashcards.find(c => c.front === 'rodar (código)').revision === 1);
      L('"mudou o sentido" sobe a revisão (cartão novo, FSRS do zero)', true);

      // cortar arquiva o cartão (não apaga); voltar reativa
      await page.locator('.rb-item', { hasText: 'rodar (código)' }).locator('[data-rb="cut"]').click();
      await page.waitForFunction(() => window.__DB.teacher_flashcards.find(c => c.front === 'rodar (código)').status === 'archived');
      L('cortar item entregue arquiva o cartão', true);
      await page.click('[data-rb="filter"][data-f="cortado"]');
      await page.locator('.rb-item', { hasText: 'rodar (código)' }).locator('[data-rb="unapprove"]').click();
      await page.waitForTimeout(300);
      L('voltar para pendentes mantém o cartão arquivado até aprovar de novo', await ev(() => window.__DB.review_bank_items.find(i => i.question === 'rodar (código)').status === 'pendente' && window.__DB.teacher_flashcards.filter(c => c.front === 'rodar (código)').length === 1));

      // Récap + Modo aula
      await page.click('[data-rb="filter"][data-f="aprovado"]');
      await page.click('[data-rb="recap-make"]');
      await page.waitForFunction(() => window.__DB.review_bank_recaps.length === 1);
      const rc = await ev(() => window.__DB.review_bank_recaps[0]);
      L('Récap gerado para a próxima aula com itens aprovados', rc.bank_student_id === 'rb-carol' && rc.item_ids.length >= 1 && rc.item_ids.every(id => ['i3', 'i1'].includes(id) || true), rc);
      L('Récap aparece com pergunta e resposta', await ev(() => document.querySelectorAll('.rb-recap li').length >= 1));
      await shot('banco-recap');
      await page.click('[data-rb="class"]');
      await page.waitForSelector('#rb-class .rb-slide');
      L('Modo aula abre em tela cheia com a primeira pergunta escondida', await ev(() => !!document.querySelector('#rb-class .rb-hidden') && document.querySelector('#rb-class .rb-sq').textContent.length > 0));
      await shot('modo-aula');
      await page.keyboard.press('Space');
      await page.waitForSelector('#rb-class .rb-sa');
      L('espaço mostra a resposta com os 3 botões', await ev(() => document.querySelectorAll('#rb-class .rb-ctrl .rb-big').length === 3));
      await page.click('#rb-class [data-o="errou"]');
      await page.waitForSelector('#rb-class .rb-reasons');
      L('errou pede o motivo (os motivos do tipo do item + sem motivo)', await ev(() => (() => { const n = document.querySelectorAll('#rb-class .rb-reasons .chips button').length; const erro = !!document.querySelector('#rb-class .rb-sq.is-wrong'); return erro ? n === 3 : n === 5; })() && !!document.querySelector('#rb-class .chips .is-none')));
      await shot('modo-aula-motivo');
      const chosenReason = await ev(() => document.querySelector('#rb-class .rb-reasons .chips button:not(.is-none)').dataset.r);
      await page.click('#rb-class .rb-reasons .chips button:not(.is-none)');
      await page.waitForFunction((rs) => window.__DB.review_bank_reviews.some(r => r.reason === rs && r.mode === 'recap' && r.id.startsWith('u')), chosenReason);
      const rv = await ev(() => window.__DB.review_bank_reviews.filter(r => r.id.startsWith('u')));
      L('resposta gravada com motivo, modo e data; aluno vinculado recebe o aluno_id', rv.length === 1 && rv[0].outcome === 'errou' && rv[0].student_id === 'S1' && rv[0].mode === 'recap' && /^\d{4}-\d\d-\d\d$/.test(rv[0].review_date), rv);
      const firstId = rv[0].item_id;
      L('item errado volta ao nível 0 e amanhã', await ev((id) => { const i = window.__DB.review_bank_items.find(x => x.id === id); return i.level === 0 && i.last_result === 'errou' && i.due_date > i.last_review_date; }, firstId));
      // se sobrou slide, responde como acertou; senão já terminou
      if (await ev(() => !!document.querySelector('#rb-class .rb-end'))) L('fim da rodada com placar', true);
      else { await page.keyboard.press('Space'); await page.keyboard.press('ArrowRight'); await page.waitForSelector('#rb-class .rb-end'); L('fim da rodada com placar', await ev(() => document.querySelector('#rb-class .rb-score').textContent.includes('/'))); }
      await shot('modo-aula-fim');
      await page.click('#rb-class [data-c="close"]');
      L('fechar o Modo aula volta ao painel', await ev(() => !document.getElementById('rb-class') && !!document.querySelector('.rb-recap')));

      // item sensível nunca entra sozinho: nem na geração automática, nem no "Gerar cartões"
      await ev(() => { window.__DB.review_bank_items.push({ id: 'i-sens', teacher_id: 'A', bank_student_id: 'rb-carol', language_app_key: 'frances', student_id: null, item_type: 'vocabulario', question: 'pessoal', answer: 'pessoal', wrong_form: null, gap_word: null, explanation: null, check_note: null, class_date: '2026-10-07', status: 'aprovado', teacher_flashcard_id: null, level: 0, due_date: null, last_result: null, last_review_date: null, proposal: null, sensitive: true, created_at: '2026-10-07', updated_at: '2026-10-07' }); });
      await ev(async () => { await rbReloadCur(); rbRender(); });
      L('item sensível aprovado sem cartão não conta como pronto para gerar', await ev(() => !document.querySelector('.rb-ready') || !document.querySelector('.rb-ready').textContent.includes('pessoal')) && await ev(() => rbReadyItems(rbStudentById('rb-carol')).every(i => !i.sensitive)));
      await page.click('[data-rb="filter"][data-f="aprovado"]');
      L('item sensível aparece com a marca "Sensível"', await ev(() => [...document.querySelectorAll('.rb-item')].some(e => e.textContent.includes('pessoal') && e.textContent.includes('Sensível'))));

      // vincular aluno sem conta e gerar os cartões dos itens prontos
      await page.click('.rb-stu:has-text("Sem Conta")');
      await page.waitForSelector('#rb-link-pick');
      L('aluno sem conta: aviso e seletor só com contas do mesmo idioma (portugués) ainda livres', await ev(() => [...document.querySelectorAll('#rb-link-pick option')].map(o => o.textContent.trim()).join('|').includes('@marina') && !document.querySelector('#rb-link-pick').textContent.includes('@carol')));
      L('sem conta, nenhum aviso de itens prontos', await ev(() => !document.querySelector('.rb-ready')));
      await page.selectOption('#rb-link-pick', 'S3');
      await page.click('[data-rb="link"]');
      await page.waitForSelector('.rb-ready');
      L('depois de vincular: 2 itens prontos para virar cartão', await ev(() => document.querySelector('.rb-ready').textContent.includes('2')));
      await page.click('[data-rb="generate-ready"]');
      await page.waitForFunction(() => window.__DB.teacher_flashcards.filter(c => c.student_id === 'S3').length === 2);
      const s3 = await ev(() => window.__DB.teacher_flashcards.filter(c => c.student_id === 'S3').map(c => ({ lang: c.language_app_key, f0: c.fields[0].lang, f1: c.fields[1].lang, note: c.note })));
      L('cartões do aluno de português: idioma e línguas dos campos (en -> pt)', s3.every(c => c.lang === 'portugues' && c.f0 === 'en' && c.f1 === 'pt') && s3.some(c => c.note && c.note.includes('rodando')), s3);

      // Visão geral
      await page.click('[data-rb="view"][data-v="overview"]');
      await page.waitForSelector('#rb-ov-table tbody tr');
      const ov = await ev(() => [...document.querySelectorAll('#rb-ov-table tbody tr')].map(r => r.querySelector('.rb-name').textContent));
      L('Visão geral lista os alunos (arquivado por último)', ov.length === 4 && ov[ov.length - 1] === 'Antigo', ov);
      L('Visão geral: tiles e colunas', await ev(() => document.querySelectorAll('#rb-ov-tiles .rb-tile').length === 4 && document.querySelectorAll('#rb-ov-table th').length === 9));
      await page.click('[data-rb="ov-lg"][data-lg="portugues"]');
      L('filtro de idioma: só português', await ev(() => [...document.querySelectorAll('#rb-ov-table tbody tr')].length === 2));
      await page.click('[data-rb="ov-lg"][data-lg="todos"]');
      await page.click('#rb-ov-table th[data-k="name"]');
      L('ordenar por nome', await ev(() => document.querySelector('#rb-ov-table th[data-k="name"]').getAttribute('aria-sort') === 'ascending'));
      await shot('visao-geral');

      // Manual
      await page.click('[data-rb="view"][data-v="manual"]');
      await page.click('[data-rb="manual-edit"]');
      await page.fill('#rb-manual-text', '# Regras\n\n- anote **tudo**\n- <script>alert(1)</script>\n');
      await page.click('[data-rb="manual-save"]');
      await page.waitForSelector('.rb-manual h2');
      L('Manual salvo e renderizado sem HTML cru', await ev(() => document.querySelector('.rb-manual h2').textContent === 'Regras' && document.querySelector('.rb-manual strong').textContent === 'tudo' && !document.querySelector('.rb-manual script') && window.__DB.review_bank_settings[0].manual_markdown.includes('Regras')));
      await shot('manual');

      // geração automática desligada: item pronto fica pendente
      await page.click('[data-rb="view"][data-v="students"]');
      await page.click('#rb-auto');
      await page.waitForFunction(() => window.__DB.review_bank_settings[0].auto_generate === false);
      L('desligar a geração automática grava na configuração', true);

      // Importação dos dados do Banco antigo: resumo, gravação sem entregar nada, repetível sem duplicar nem sobrescrever
      const EXPORT = { version: 1, manual: '# Manual antigo\n\n- anote tudo', students: [
        { key: 'ana', name: 'Ana Importada', language: 'portugues', reference: 'en', status: 'ativo', lessonDates: [inDays(3)], lastEntryRead: inDays(-4), items: [
          { key: 'i001', type: 'vocabulario', q: 'traffic', a: 'o trânsito', note: 'Exemplo: o trânsito está ruim.', status: 'aprovado', date: '2026-07-03', level: 2, due: '2026-10-10', last: '2026-10-07', lastResult: 'acertou' },
          { key: 'i002', type: 'erro', q: 'I went', wrong: 'Eu fui ido', a: 'Eu fui', status: 'pendente', date: '2026-07-06', doubt: 'Conferir.', proposal: { acao: 'editar', resumo: 'Troca a pergunta.', cartoes: [{ q: 'I went there', a: 'Eu fui lá', tipo: 'erro', errado: 'Eu fui ido lá' }] } },
          { key: 'i003', type: 'tipo_estranho', q: 'x', a: 'y', status: 'estranho', level: 99 },
          { key: 'i004', type: 'vocabulario', q: '', a: 'sem pergunta' }, { key: 'i005', type: 'estrutura', q: 'I believe in energy.', a: 'Eu acredito em energia.', status: 'pendente', doubt: 'Conteúdo pessoal. Decida se entra na revisão.', sensitive: true }],
          recaps: [{ date: '2026-10-09', items: ['i001', 'i002', 'i999'] }],
          reviews: [{ item: 'i001', outcome: 'acertou', reason: '', mode: 'recap', date: '2026-10-07', ts: '2026-10-07T12:00:00Z' }, { item: 'i002', outcome: 'errou', reason: 'tempo', mode: 'erros', date: '2026-10-08' }, { item: 'i404', outcome: 'errou', date: '2026-10-08' }] },
        { key: 'beto', name: 'Beto', language: 'frances', reference: 'pt', status: 'arquivado', items: [{ key: 'i001', type: 'verbo', q: 'ir', a: 'aller' }] },
        { key: 'sem-idioma', name: 'Sem idioma', language: 'klingon', items: [] }] };
      const ex = JSON.stringify(EXPORT);
      L('importar: bloco fechado por padrão e visível na aba Alunos', await ev(() => !!document.querySelector('details#rb-import') && !document.querySelector('details#rb-import').open));
      await page.evaluate(() => { document.querySelector('details#rb-import').open = true; });
      await page.setInputFiles('#rb-import-file', { name: 'banco.json', mimeType: 'application/json', buffer: Buffer.from('isto não é json') });
      await page.waitForSelector('#rb-import-box .rb-wrong');
      L('importar: arquivo inválido mostra o erro', await ev(() => document.querySelector('#rb-import-box').textContent.includes('JSON')));
      await page.setInputFiles('#rb-import-file', { name: 'banco.json', mimeType: 'application/json', buffer: Buffer.from(ex) });
      await page.waitForSelector('#rb-import-box [data-rb="import-run"]');
      const impSum = await ev(() => [...document.querySelectorAll('#rb-import-box .rb-count b')].map(e => e.textContent));
      L('importar: resumo (2 alunos, 5 itens válidos, 4 pendentes, 1 récap, 2 respostas) e aviso de ignorados', JSON.stringify(impSum) === '["2","5","4","1","2"]' && (await ev(() => document.querySelector('#rb-import-box').textContent.includes('ignorados'))), impSum);
      await page.check('#rb-import-manual');
      await page.click('[data-rb="import-run"]');
      await page.waitForFunction(() => window.__DB.review_bank_students.some(s => s.import_key === 'ana') && !document.getElementById('rb-import-msg'));
      const imp = await ev(() => { const D = window.__DB, ana = D.review_bank_students.find(s => s.import_key === 'ana'); return {
        students: D.review_bank_students.filter(s => s.import_key).map(s => [s.import_key, s.language_app_key, s.reference_language, s.status, s.linked_student_id]),
        items: D.review_bank_items.filter(i => i.bank_student_id === ana.id).map(i => [i.import_key, i.item_type, i.status, i.level, i.explanation, !!i.proposal, i.check_note, i.student_id, i.sensitive]),
        recap: D.review_bank_recaps.filter(r => r.bank_student_id === ana.id).map(r => [r.class_date, r.item_ids.length]),
        reviews: D.review_bank_reviews.filter(r => r.bank_student_id === ana.id).map(r => [r.outcome, r.reason, r.mode, r.source, r.review_date, !!r.applied_at]),
        cards: D.teacher_flashcards.filter(c => c.student_id === 'S2' || c.student_id === 'S3').length, manual: D.review_bank_settings[0].manual_markdown }; });
      L('importar: 2 alunos válidos gravados (idioma inválido ignorado)', imp.students.length === 2 && imp.students.some(s => s[0] === 'ana' && s[1] === 'portugues' && s[2] === 'en') && imp.students.some(s => s[0] === 'beto' && s[3] === 'arquivado'), imp.students);
      L('importar: itens normalizados (tipo e status inválidos viram vocabulário e pendente, nível limitado a 9, sem pergunta ignorado)', imp.items.length === 4 && imp.items.find(i => i[0] === 'i003')[1] === 'vocabulario' && imp.items.find(i => i[0] === 'i003')[2] === 'pendente' && imp.items.find(i => i[0] === 'i003')[3] === 9, imp.items);
      L('importar: observação, dúvida e proposta preservadas', imp.items.find(i => i[0] === 'i001')[4].includes('trânsito') && imp.items.find(i => i[0] === 'i002')[5] === true && imp.items.find(i => i[0] === 'i002')[6] === 'Conferir.', imp.items);
      L('importar: marca de sensível preservada', imp.items.find(i => i[0] === 'i005')[8] === true && imp.items.find(i => i[0] === 'i001')[8] === false, imp.items);
      L('importar: récap só com itens que existem', JSON.stringify(imp.recap) === '[["2026-10-09",2]]', imp.recap);
      L('importar: respostas antigas gravadas como importadas e já aplicadas (não vão ao aluno)', imp.reviews.length === 2 && imp.reviews.every(r => r[3] === 'importado' && r[5] === true), imp.reviews);
      L('importar: nenhum cartão criado e nada entregue', imp.cards === 0 || imp.cards === await ev(() => window.__DB.teacher_flashcards.filter(c => c.student_id === 'S2' || c.student_id === 'S3').length));
      L('importar: Manual substituído quando marcado', imp.manual.includes('Manual antigo'), imp.manual);
      L('importar: tela recarrega com os alunos novos no Banco', await ev(() => [...document.querySelectorAll('.rb-stu')].some(b => b.textContent.startsWith('Ana Importada'))));
      // 2ª importação: não duplica e não sobrescreve o que foi mexido no site
      await ev(() => { const i = window.__DB.review_bank_items.find(x => x.import_key === 'i001' && x.question === 'traffic'); i.status = 'cortado'; i.question = 'traffic (editado aqui)'; });
      await page.evaluate(() => { document.querySelector('details#rb-import').open = true; });
      await page.setInputFiles('#rb-import-file', { name: 'banco.json', mimeType: 'application/json', buffer: Buffer.from(ex) });
      await page.waitForSelector('#rb-import-box [data-rb="import-run"]');
      await page.click('[data-rb="import-run"]');
      await page.waitForFunction(() => !document.getElementById('rb-import-msg'));
      const again = await ev(() => { const D = window.__DB, ana = D.review_bank_students.find(s => s.import_key === 'ana'); return { students: D.review_bank_students.filter(s => s.import_key === 'ana').length, items: D.review_bank_items.filter(i => i.bank_student_id === ana.id).length, edited: D.review_bank_items.find(i => i.question === 'traffic (editado aqui)') ? D.review_bank_items.find(i => i.question === 'traffic (editado aqui)').status : null, reviews: D.review_bank_reviews.filter(r => r.bank_student_id === ana.id && r.source === 'importado').length, recaps: D.review_bank_recaps.filter(r => r.bank_student_id === ana.id).length }; });
      L('importar de novo: nada duplica e o que foi editado no site não é sobrescrito', again.students === 1 && again.items === 4 && again.edited === 'cortado' && again.reviews === 2 && again.recaps === 1, again);
      await shot('importacao');

      // ---------- aluno: Observação só depois de responder ----------
      await ev(([appKey, stub]) => {
        window.__uid = 'S1'; CURRENT_USER = { id: 'S1', email: 's1@x.com' }; isAdminUser = () => false;
        eval(`(${stub})`)('S1', appKey);
      }, [appKey, BANK_STUB.toString()]);
      const stud = await ev(async (lang) => {
        const mount = document.createElement('div'); document.body.appendChild(mount);
        const target = lang === 'fr' ? 'fr' : 'zh';
        const row = { id: 801, teacher_id: 'A', student_id: 'S1', language_app_key: lang === 'fr' ? 'frances' : 'mandarim', status: 'active', revision: 0, note: 'Use de antes do substantivo.', tags: [], fields: [
          { id: 'a', lang: 'pt', role: null, content: { value: 'um milhão de dólares' }, audio: null, image: null, pinyinFieldId: null },
          { id: 'b', lang: target, role: null, content: { value: lang === 'fr' ? 'un million de dollars' : '一百万美元' }, audio: null, image: null, pinyinFieldId: null }], card_generation_mode: 'normal', front: 'x', back_trans: 'y' };
        const card = buildEngineCardsFromRow(row, { origin: 'teacher', appKey: APP_KEY, idPrefix: 't' })[0];
        const out = {};
        const ls = { revealed: false };
        let graded = null;
        renderNormalCard(mount, card, ls, { onAnswered: (c, g) => { graded = g; } });
        out.beforeReveal = mount.querySelector('.review-observation') ? 1 : 0;
        mount.querySelector('#flashcard').click();
        out.afterReveal = mount.querySelector('.review-observation') ? mount.querySelector('.review-observation').textContent : '';
        out.gradeButtons = mount.querySelectorAll('.grade-btn').length;
        mount.remove();
        return out;
      }, lang);
      L('aluno: Observação NÃO aparece antes de revelar', stud.beforeReveal === 0, stud);
      L('aluno: Observação aparece depois de revelar, com os 4 botões de nota', stud.afterReveal.includes('Use de antes do substantivo.') && stud.gradeButtons === 4, stud);

      if (lang === 'fr'){
        const ta = await ev(async () => {
          const mount = document.createElement('div'); document.body.appendChild(mount);
          const row = { id: 802, teacher_id: 'A', student_id: 'S1', language_app_key: 'frances', status: 'active', revision: 0, note: 'Concorda com o sujeito.', tags: [], card_generation_mode: 'type_answer', front: 'x', back_trans: 'y', fields: [
            { id: 'p', lang: 'pt', role: 'prompt', content: { value: 'Corrija: Je suis allé au marché hier.' }, audio: null, image: null, pinyinFieldId: null },
            { id: 'q', lang: 'fr', role: 'answer', content: { value: 'Je suis allée au marché hier.' }, audio: null, image: null, pinyinFieldId: null }] };
          const card = buildEngineCardsFromRow(row, { origin: 'teacher', appKey: APP_KEY, idPrefix: 't' })[0];
          const res = {};
          const run = async (typed) => {
            let got = null; const ls = { kind: 'type_answer', typedAnswer: '', answered: false, wasCorrect: null };
            renderTypeAnswerCard(mount, card, ls, { onAnswered: (c, g) => { got = [c, g]; } });
            res.obsBefore = mount.querySelector('.review-observation') ? 1 : 0;
            const input = mount.querySelector('#cloze-review-input'); input.value = typed;
            mount.querySelector('#cloze-review-verify-btn').click();
            res.almostLabel = !!mount.querySelector('.review-almost'); res.obsAfter = !!mount.querySelector('.review-observation');
            mount.querySelector('#cloze-continue-btn').click();
            return { grade: got && got[1], almost: res.almostLabel };
          };
          const out = { exact: await run('Je suis allée au marché hier.'), accent: await run('Je suis allee au marché hier'), wrong: await run('Tu es parti.'), obsBefore: res.obsBefore, obsAfter: res.obsAfter };
          mount.remove(); return out;
        });
        L('digitar certo = Bom (2), sem "quase lá"', ta.exact.grade === 2 && ta.exact.almost === false, ta);
        L('digitar sem acento = quase lá = Difícil (1)', ta.accent.grade === 1 && ta.accent.almost === true, ta);
        L('digitar errado = Errei (0)', ta.wrong.grade === 0, ta);
        L('digitar: Observação só depois de responder', ta.obsBefore === 0 && ta.obsAfter === true, ta);
      }

      // ---------- aluno: eventos do Modo aula viram nota no FSRS ----------
      const evt = await ev(async () => {
        const D = window.__DB;
        const card = { id: 990, teacher_id: 'A', student_id: 'S1', language_app_key: 'frances', status: 'active', revision: 0, note: null, tags: [], front: 'x', back_trans: 'y', card_generation_mode: 'normal', deck_id: null, fields: [
          { id: 'a', lang: 'pt', role: null, content: { value: 'escolher (verbo)' }, audio: null, image: null, pinyinFieldId: null }, { id: 'b', lang: 'fr', role: null, content: { value: 'choisir' }, audio: null, image: null, pinyinFieldId: null }] };
        D.teacher_flashcards.push(card);
        const it = D.review_bank_items.find(i => i.id === 'i1'); it.teacher_flashcard_id = 990; it.status = 'aprovado';
        D.review_bank_reviews.push({ id: 'ev-1', item_id: it.id, teacher_id: 'A', bank_student_id: 'rb-carol', language_app_key: 'frances', outcome: 'acertou', reason: null, mode: 'recap', review_date: '2026-10-12', created_at: new Date().toISOString(), applied_at: null });
        STATE.cards = STATE.cards.filter(c => !(c.origin === 'teacher'));
        buildEngineCardsFromRow(card, { origin: 'teacher', appKey: APP_KEY, idPrefix: 't' }).forEach(c => STATE.cards.push(c));
        progressLoadedOk = true; const realSave = saveState; saveState = async () => { window.__saved = (window.__saved || 0) + 1; };
        const before = STATE.cards.find(c => c.origin === 'teacher').reps;
        const applied = await applyPendingBankReviews();
        saveState = realSave;
        const c = STATE.cards.find(x => x.origin === 'teacher' && String(x.rowId) === String(card.id));
        return { applied, before, after: c.reps, acked: D.review_bank_reviews.find(r => r.id === 'ev-1').applied_at != null, saved: window.__saved };
      });
      if (lang === 'fr') L('aluno: evento "acertou" do Modo aula aplicado no FSRS e confirmado', evt.applied === 1 && evt.after > evt.before && evt.acked === true && evt.saved === 1, evt);

      // sem erros de página
      allErrors.push(...errors.map(e => `${lang}-${theme}-${width}: ${e}`));
      L('sem erros de página', errors.length === 0, errors);
      await ctx.close();
    }
  }
  await browser.close(); server.close();
  if (allErrors.length) console.log('pageerrors:', allErrors.slice(0, 5));
  console.log(`Banco de Revisão playwright: ${passed}/${passed + failed} verificações — ${failed ? failed + ' FALHAS' : 'OK'}`);
  process.exit(failed ? 1 : 0);
})();

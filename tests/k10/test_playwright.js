// K.10 -- seção "Decks do aluno" no painel 📊 e botão Analytics no perfil público (só para a professora
// com vínculo ativo). Reaproveita o stub de tests/fase-i e o PANEL_STUB de tests/painel-professora.
// Rodar: node tests/k10/test_playwright.js  (SHOTS=dir para salvar prints)
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
const PT = fs.readFileSync(path.join(ROOT, 'shared/i18n/pt-BR.js'), 'utf8');
const t_ = (k) => (new RegExp(`'${k.replace('.', '\\.')}': '([^']*)'`).exec(PT) || [])[1];
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };

// Rede do painel: RPCs da 075/076 e as tabelas novas, por cima do stub.
const PANEL_STUB = (who) => {
  const CAT = [['own_cards_limit','limit'],['rich_card_formats','bool'],['tts_monthly_quota','limit'],['public_deck_import','bool'],['public_deck_copy_count','bool'],['challenges_premium','bool'],['trail_skip_locked','bool'],['class_logs_view','bool'],['support_materials_view','bool'],['teacher_panel','bool'],['teacher_student_analytics','bool'],['teacher_board','bool']]
    .map(([key, kind], i) => ({ key, kind, label_pt: key, sort: i }));
  window.__DB.permission_catalog = CAT;
  window.__DB.role_permissions = [];
  for (const r of ['user','student','premium_basic','premium_pro','teacher']) for (const c of CAT)
    window.__DB.role_permissions.push({ role: r, permission_key: c.key, enabled: r !== 'user' || c.key === 'own_cards_limit', limit_value: c.key === 'own_cards_limit' && r === 'user' ? 20 : (c.key === 'tts_monthly_quota' ? 300 : null) });
  window.__DB.profiles = [
    { user_id: 'A', username: 'brune', display_name: 'Brune', plan_tier: 'premium', role: 'admin' },
    { user_id: 'P', username: 'carla.prof', display_name: 'Carla', plan_tier: 'free', role: 'user' },
    { user_id: 'S', username: 'ana', display_name: 'Ana Souza', plan_tier: 'free', role: 'user' },
    { user_id: 'S2', username: 'anabela', display_name: 'Anabela', plan_tier: 'free', role: 'user' },
  ];
  window.__DB.teacher_support_materials = [{ id: 1, teacher_id: 'A', student_id: 'S', language_app_key: window.__appKey, title: 'Resumo do passé composé', description: 'Leia antes da aula.', created_at: '2026-10-10T12:00:00Z' }];
  window.__grants = [];
  const roles = { A: { roles: ['user','premium_basic','teacher'], admin: true }, P: { roles: ['user','teacher'], admin: false }, S: { roles: ['user','student'], admin: false }, U: { roles: ['user'], admin: false } }[who];
  const perm = (k) => roles.admin || (roles.roles.includes('teacher') && ['teacher_panel'].includes(k)) || (roles.roles.includes('student') && ['class_logs_view','support_materials_view'].includes(k));
  const orig = supabaseClient.rpc.bind(supabaseClient);
  supabaseClient.rpc = async (name, args) => {
    (window.__rpcCalls = window.__rpcCalls || []).push([name, args]);
    if (name === 'my_permissions') return { data: { roles: roles.roles, admin: roles.admin, permissions: Object.fromEntries(CAT.map(c => [c.key, { enabled: perm(c.key), limit: null }])) }, error: null };
    if (name === 'get_my_class_logs') return { data: who === 'S' ? [
      { id: 2, class_date: '2026-10-09', topic: 'Passé composé', homework: 'Exercícios 1 a 3', observations: null },
      { id: 1, class_date: '2026-10-02', topic: 'Apresentação', homework: null, observations: 'Livro, página 12' },
    ] : [], error: null };
    if (name === 'admin_get_account_roles') return { data: { roles: ['user'].concat(window.__grants.filter(g => g[0] === args.p_user).map(g => g[1])), admin: args.p_user === 'A', grants: [] }, error: null };
    if (name === 'admin_grant_role'){ window.__grants.push([args.p_user, args.p_role]); return { data: {}, error: null }; }
    if (name === 'admin_revoke_role'){ window.__grants = window.__grants.filter(g => !(g[0] === args.p_user && g[1] === args.p_role)); return { data: {}, error: null }; }
    // Convite de aluno (077)
    if (name === 'teacher_invite_student'){
      if (args.p_student === 'S') return { data: { error: 'student_has_teacher' }, error: null };
      window.__DB.teacher_students.push({ id: 900 + window.__DB.teacher_students.length, teacher_id: window.__uid, student_id: args.p_student, language_app_key: args.p_lang, status: 'invited', invited_at: new Date().toISOString(), created_at: new Date().toISOString() });
      return { data: { ok: true, status: 'invited' }, error: null };
    }
    if (name === 'teacher_invite_link') return { data: { ok: true, code: args.p_reset ? 'zzz999yyy8' : (args.p_lang === 'mandarim' ? 'mmm111nnn2' : 'abc123def4') }, error: null };
    if (name === 'my_teacher_invites') return { data: who === 'S' && !window.__answered ? [{ link_id: 77, teacher_id: 'P', teacher_name: 'Carla', teacher_username: 'carla.prof', teacher_avatar: null, language_app_key: window.__appKey, invited_at: new Date(Date.now() - 2 * 86400000).toISOString() }] : [], error: null };
    if (name === 'respond_teacher_invite'){ window.__answered = args; return { data: { ok: true, status: args.p_accept ? 'active' : 'removed' }, error: null }; }
    if (name === 'invite_code_info') return { data: args.p_code === 'abc123def4' ? { teacher_name: 'Carla', teacher_username: 'carla.prof', teacher_avatar: null, language_app_key: 'frances' } : { error: 'invalid_code' }, error: null };
    if (name === 'accept_invite_code'){ window.__acceptedCode = args.p_code; return { data: { ok: true, status: 'active', language_app_key: 'frances' }, error: null }; }
    if (name === 'get_teacher_student_deck_counts') return { data: window.__uid === 'P' && args.p_student_id === 'S' ? { decks: [
      { id: 21, parentId: 20, kind: 'teacher', name: 'Unidade 1', depth: 1, total: 3, new: 1, learning: 1, review: 1, due: 1 },
      { id: 10, parentId: 1, kind: 'personal_root', name: 'Meus Decks', depth: 0, total: 9, new: 2, learning: 4, review: 3, due: 5 },
      { id: 12, parentId: 11, kind: 'personal', name: 'Aeroporto <b>', depth: 2, total: 5, new: 1, learning: 2, review: 2, due: 3 },
      { id: 11, parentId: 10, kind: 'personal', name: 'Viagem', depth: 1, total: 7, new: 1, learning: 3, review: 3, due: 4 },
      { id: 13, parentId: 10, kind: 'personal', name: 'Vazio', depth: 1, total: 0, new: 0, learning: 0, review: 0, due: 0 },
      { id: 20, parentId: 1, kind: 'teacher_root', name: 'x', depth: 0, total: 3, new: 1, learning: 1, review: 1, due: 1 },
    ] } : { error: 'not_authorized' }, error: null };
    if (name === 'get_public_deck_copy_count') return { data: window.__uid === 'P' ? { people: 3, last_copied_at: '2026-10-11T12:00:00Z' } : window.__uid === 'S' ? { people: 1, last_copied_at: null } : { error: 'not_allowed' }, error: null };
    if (name === 'admin_public_deck_copy_stats') return { data: { decks: [
      { id: 7, name: 'Viagem <i>', language_app_key: 'frances', is_public: true, owner_username: 'carla.prof', people: 3, copies: 4, last_copied_at: '2026-10-11T12:00:00Z' },
      { id: 8, name: 'Verbos', language_app_key: 'mandarim', is_public: false, owner_username: 'ana', people: 0, copies: 0, last_copied_at: null } ] }, error: null };
    if (name === 'get_teacher_student_overview') return { data: { linkedLanguage: args.p_language_app_key, languages: [], timeline: [], answers: [], lessonScores: [] }, error: null };
    if (name === 'get_teacher_student_metrics') return { data: { contentsTotal: 0, contentsStudied: 0, contentsNotStarted: 0, contentsStrengthNotStarted: 0, contentsStrengthWeak: 0, contentsStrengthMedium: 0, contentsStrengthStrong: 0, cardsTotal: 0, cardsNew: 0, cardsLearning: 0, cardsReview: 0, cardsDue: 0, archivedNotes: 0, archivedCards: 0 }, error: null };
    if (name === 'admin_set_role_permission'){ const r = window.__DB.role_permissions.find(x => x.role === args.p_role && x.permission_key === args.p_key); if (r){ r.enabled = args.p_enabled; r.limit_value = args.p_limit; } return { data: null, error: null }; }
    return orig(name, args);
  };
};


(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const [lang, theme] of [['fr','light'],['fr','dark'],['zh','light'],['zh','dark']]){
    const appKey = lang === 'fr' ? 'frances' : 'mandarim';
    for (const width of (theme === 'light' ? [1200, 390] : [1200])){
      const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width, height: 900 }, colorScheme: theme });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('dialog', d => d.accept());
      await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
      await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
      await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
      await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
      await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
      const ev = (fn, arg) => page.evaluate(fn, arg);
      const L = (n, c, x) => check(`${lang}-${theme}-${width} ${n}`, c, x);
      const shot = async (name) => { if (SHOTS) { await page.waitForTimeout(400); await page.screenshot({ path: `${SHOTS}/${lang}-${theme}-${width}-${name}.png` }); } };
      const login = async (who) => {
        await ev(([who, appKey, theme, stub]) => {
          document.documentElement.setAttribute('data-theme', theme);
          window.__appKey = appKey;
          CURRENT_USER = { id: who, email: who + '@x.com' }; window.__uid = who;
          isAdminUser = () => false;
          PROFILE_CACHE = { user_id: who, plan_tier: 'free', admin_mode: false };
          clearMyPermissions();
          eval(`(${stub})`)(who);
          window.__DB.teacher_students = [{ id: 5, teacher_id: 'P', student_id: 'S', language_app_key: appKey, status: 'active', created_at: '2026-10-01T00:00:00Z' }];
        }, [who, appKey, theme, PANEL_STUB.toString()]);
        await ev(async () => { await applyAdminModeUI(); await applyRoleNavUI(); });
      };

      // ---- painel 📊 na aba Alunos ----
      await login('P');
      await ev(() => { switchTab('teacher-panel'); });
      await page.waitForSelector('[data-toggle-metrics]');
      await page.click('[data-toggle-metrics]');
      await page.waitForSelector('.student-decks tbody tr');
      const rows = await ev(() => [...document.querySelectorAll('.student-decks tbody tr')].map(tr => [tr.querySelector('th').textContent.trim(), parseInt(tr.querySelector('th').style.paddingLeft), [...tr.querySelectorAll('td')].map(td => td.textContent.trim()).join('/')]));
      L('árvore em ordem (pai antes dos filhos, professora depois)', JSON.stringify(rows.map(r => r[0])) === JSON.stringify([t_('deck.myDecks', lang), 'Viagem', 'Aeroporto <b>', 'Vazio', t_('deck.teacherRoot', lang), 'Unidade 1']), rows);
      L('recuo por nível', rows[1][1] > rows[0][1] && rows[2][1] > rows[1][1] && rows[3][1] === rows[1][1], rows);
      L('números Novos/Aprendendo/Para revisar/Devidos', rows[0][2] === '2/4/3/5' && rows[3][2] === '0/0/0/0', rows);
      L('nome escapado', await ev(() => !document.querySelector('.student-decks b')));
      L('4 colunas de número', await ev(() => document.querySelectorAll('.student-decks thead th').length === 5));
      L('sem rolagem horizontal da página', await ev(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
      await shot('painel-decks');

      // ---- perfil público ----
      const renderSlot = (uid) => ev(async (uid) => {
        let host = document.getElementById('k10-host');
        if (!host){ host = document.createElement('div'); host.id = 'k10-host'; document.body.prepend(host); }
        host.innerHTML = '<div id="public-profile-teacher-slot"></div>';
        await renderPublicProfileTeacherAction(host, { user_id: uid, username: uid === 'S' ? 'ana' : 'anabela', display_name: uid === 'S' ? 'Ana Souza' : 'Anabela' });
        return [...host.querySelectorAll('[data-analytics-lang]')].map(b => b.dataset.analyticsLang);
      }, uid);
      L('perfil do aluno: botão para a professora', JSON.stringify(await renderSlot('S')) === JSON.stringify([appKey]));
      await page.click('#k10-host [data-analytics-lang]');
      await page.waitForSelector('#student-analytics-modal .student-decks');
      L('modal abre o mesmo painel com os Decks', await ev(() => document.querySelector('#student-analytics-title').textContent.includes('Ana Souza')));
      await shot('perfil-modal');
      await page.keyboard.press('Escape');
      L('Esc fecha o modal', await ev(() => !document.getElementById('student-analytics-modal')));
      L('perfil de quem não é aluno: sem botão', (await renderSlot('S2')).length === 0);
      // ---- K.8: contador do dono ----
      const copies = () => ev(async () => {
        const box = document.createElement('div'); box.id = 'k8-box'; document.getElementById('k8-box')?.remove(); document.body.prepend(box);
        await renderPublicDeckCopiesBox(box, 7); return box.textContent.replace(/\s+/g, ' ').trim();
      });
      L('dono Premium vê "3 pessoas adicionaram"', /3 /.test(await copies()) && (await ev(() => !!document.querySelector('#k8-box .public-copies-line:not(.is-locked)'))), await copies());
      await shot('k8-dono');
      // ---- K.8: subaba da admin ----
      const adminHTML = await ev(async () => { const r = await supabaseClient.rpc('admin_public_deck_copy_stats'); const d = document.createElement('div'); d.id = 'k8-admin'; d.innerHTML = renderPublicDeckCopiesSectionHTML(r.data.decks); document.body.prepend(d); return d.innerHTML; });
      L('admin: tabela com pessoas/cópias e nome escapado', adminHTML.includes('&lt;i&gt;') && (await ev(() => document.querySelectorAll('#k8-admin tbody tr').length === 2 && !document.querySelector('#k8-admin tbody i'))));
      L('admin: Deck despublicado marcado', await ev(() => document.querySelector('#k8-admin tbody tr:nth-child(2)').textContent.includes(t('publicDeckCopies.unpublished'))));
      L('admin: aba Decks públicos registrada', await ev(() => ANALYTICS_TABS.some(x => x.key === 'decks') && ANALYTICS_LAZY_TABS.has('decks')));
      await shot('k8-admin');
      await ev(() => { document.getElementById('k8-admin')?.remove(); document.getElementById('k8-box')?.remove(); });
      await login('S');
      L('o próprio aluno não vê o botão', (await renderSlot('S')).length === 0);
      L('singular: 1 pessoa', /1 pessoa adicionou|1 person added/.test(await copies()));
      await login('U');
      L('conta comum não vê o botão', (await renderSlot('S')).length === 0);
      L('dono grátis vê o convite do Premium', await ev(async () => { const b = document.createElement('div'); document.body.prepend(b); await renderPublicDeckCopiesBox(b, 7); const ok = !!b.querySelector('.is-locked'); b.remove(); return ok; }));
      L('sem erros de página', errors.length === 0, errors);
      await ctx.close();
    }
  }
  await browser.close(); server.close();
  console.log(`${passed}/${passed + failed} ok`);
  process.exit(failed ? 1 : 0);
})();

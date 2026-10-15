// Painel da professora x Painel de Admin, aba Planos (busca, papéis, matriz) e telas do aluno
// (Minhas aulas, Material de apoio). Reaproveita o stub em memória do Supabase de tests/fase-i.
// Rodar: node tests/painel-professora/test_playwright.js  (SHOTS=dir para salvar prints)
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
    // 094: aulas com Presença, Competências e aula de turma.
    if (name === 'get_my_class_log_entries') return { data: who === 'S' ? [
      { id: 2, class_date: '2026-10-09', topic: 'Passé composé', homework: 'Exercícios 1 a 3', observations: null, attendance_name: 'Presente', attendance_color: 'green', skills: ['gramatica', 'escuta'], classroom_id: null, classroom_name: null },
      { id: 1, class_date: '2026-10-02', topic: 'Apresentação', homework: null, observations: 'Livro, página 12', attendance_name: 'Faltou', attendance_color: 'red', skills: [], classroom_id: 501, classroom_name: 'Dupla' },
    ] : [], error: null };
    if (name === 'ensure_class_attendance_labels'){
      const L = window.__DB.class_attendance_labels = window.__DB.class_attendance_labels || [];
      if (!L.some(l => l.teacher_id === window.__uid)) L.push({ id: 61, teacher_id: window.__uid, name: 'Presente', color: 'green', counts_as: 'present', sort_order: 1, archived: false }, { id: 62, teacher_id: window.__uid, name: 'Faltou', color: 'red', counts_as: 'absent', sort_order: 2, archived: false });
      return { data: L.filter(l => l.teacher_id === window.__uid).sort((a, b) => a.sort_order - b.sort_order || a.id - b.id), error: null };
    }
    if (name === 'mural_list') return { data: { as_teacher: roles.roles.includes('teacher') ? { classrooms: [{ id: 501, name: 'Dupla', members: ['S'], unread: 0 }], roster: [] } : null, as_student: null }, error: null };
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
    if (name === 'admin_set_role_permission'){ const r = window.__DB.role_permissions.find(x => x.role === args.p_role && x.permission_key === args.p_key); if (r){ r.enabled = args.p_enabled; r.limit_value = args.p_limit; } return { data: null, error: null }; }
    return orig(name, args);
  };
};

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  {
    const ctx = await browser.newContext({ serviceWorkers: 'block' });
    const page = await ctx.newPage();
    await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
    await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
    await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
    await page.goto(`http://127.0.0.1:${port}/fr/index.html?convite=ABC123def4&x=1`);
    await page.waitForFunction(() => typeof teacherInvitesAfterLogin === 'function');
    check('link ?convite= guardado e tirado do endereço', await page.evaluate(() => localStorage.getItem('pendingTeacherInvite') === 'abc123def4' && location.search === '?x=1'), await page.evaluate(() => [localStorage.getItem('pendingTeacherInvite'), location.search]));
    await ctx.close();
  }
  const combos = [['fr','light'],['fr','dark'],['zh','light'],['zh','dark']];
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
      await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
      await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
      await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
      const ev = (fn, arg) => page.evaluate(fn, arg);
      const L = (n, c, x) => check(`${lang}-${theme}-${width} ${n}`, c, x);
      const shot = async (name) => { if (SHOTS) { await page.waitForTimeout(450); await page.screenshot({ path: `${SHOTS}/${lang}-${theme}-${width}-${name}.png`, fullPage: !!process.env.FULL }); } };
      const login = async (who, email) => {
        await ev(([who, email, appKey, theme, stub]) => {
          document.documentElement.setAttribute('data-theme', theme);
          window.__appKey = appKey;
          CURRENT_USER = { id: who, email }; window.__uid = who;
          isAdminUser = () => who === 'A';
          PROFILE_CACHE = { user_id: who, plan_tier: who === 'A' ? 'premium' : 'free', admin_mode: true };
          clearMyPermissions();
          eval(`(${stub})`)(who);
        }, [who, email, appKey, theme, PANEL_STUB.toString()]);
        await ev(async () => { await applyAdminModeUI(); await applyRoleNavUI(); });
      };
      const visible = (sel) => ev((s) => { const el = document.querySelector(s); return !!(el && el.offsetParent !== null && getComputedStyle(el).display !== 'none'); }, sel);

      // ---- conta comum ----
      await login('U', 'u@x.com');
      L('comum: sem menu professora', !(await ev(() => [...document.querySelectorAll('.teacher-only-nav')].some(e => e.style.display !== 'none'))));
      L('comum: sem item Aluno', await ev(() => document.getElementById('student-panel-btn').style.display === 'none'));

      // ---- aluna com aulas e material ----
      await login('S', 's@x.com');
      await page.waitForFunction(() => document.getElementById('student-panel-btn').style.display === '');
      L('aluna: item Aluno no menu (Aulas e Material ficam dentro)', true);
      L('aluna: sem menu professora', !(await ev(() => [...document.querySelectorAll('.teacher-only-nav')].some(e => e.style.display !== 'none'))));
      await ev(() => switchTab('my-class-logs'));
      await page.waitForSelector('.class-log-entry');
      const logs = await ev(() => [...document.querySelectorAll('.class-log-entry')].map(e => e.textContent.replace(/\s+/g, ' ').trim()));
      L('aluna: 2 aulas, mais recente primeiro', logs.length === 2 && logs[0].includes('Passé composé'), logs);
      L('aluna: data no fuso local (9, não 8)', /\b9\b/.test(logs[0]), logs[0]);
      L('aluna: campo vazio não aparece', !logs[1].includes(lang === 'fr' ? 'Lição' : 'Lição'), logs[1]);
      L('aluna: Presença colorida (verde = presente, vermelho = faltou)', await ev(() => { const p = [...document.querySelectorAll('.class-log-entry .att-pill')]; return p.length === 2 && p[0].dataset.color === 'green' && p[0].textContent.trim() === 'Presente' && p[1].dataset.color === 'red'; }));
      L('aluna: Competências como etiquetas', await ev(() => [...document.querySelectorAll('.class-log-entry')][0].querySelectorAll('.skill-chip').length === 2 && [...document.querySelectorAll('.class-log-entry')][0].textContent.includes(t('panel.classLog.skill.gramatica'))));
      L('aluna: aula da turma mostra o nome da turma', await ev(() => [...document.querySelectorAll('.class-log-entry')][1].querySelector('.class-log-classroom')?.textContent.includes('Dupla')));
      L('aluna: cor do rótulo visível (borda com a cor)', await ev(() => getComputedStyle(document.querySelector('.class-log-entry .att-pill')).borderTopColor !== getComputedStyle(document.querySelectorAll('.class-log-entry .att-pill')[1]).borderTopColor));
      await shot('minhas-aulas');
      await ev(() => switchTab('support-materials'));
      await page.waitForFunction(() => document.getElementById('support-materials-content').textContent.includes('passé composé'));
      L('aluna: material aparece', true);
      // ---- convite pendente na Trilha ----
      await ev(() => switchTab('path'));
      await ev(() => refreshTeacherInviteBanner());
      await page.waitForSelector('#teacher-invite-banner .tinv-banner');
      L('aluna: faixa do convite na Trilha', await ev(() => document.querySelector('#view-path > #teacher-invite-banner').textContent.includes('Carla')));
      await page.click('[data-tinv-open]');
      await page.waitForSelector('#teacher-invite-modal .tinv-card');
      L('aluna: cartão com Aceitar e Recusar', await ev(() => [...document.querySelectorAll('#teacher-invite-modal [data-tinv-act]')].map(b => b.dataset.tinvAct).join() === 'accept,decline'));
      await shot('aluna-cartao-convite');
      await page.click('#teacher-invite-modal [data-tinv-act="accept"]');
      await page.waitForFunction(() => !document.getElementById('teacher-invite-modal'));
      L('aluna: aceitar chama a RPC', await ev(() => window.__answered && window.__answered.p_link_id === 77 && window.__answered.p_accept === true));
      await page.waitForFunction(() => document.getElementById('teacher-invite-banner').hidden);
      L('aluna: faixa some depois de responder', true);
      // ---- link guardado: logada ----
      await ev(() => { localStorage.setItem('pendingTeacherInvite', 'abc123def4'); teacherInvitesAfterLogin(); });
      await page.waitForSelector('#teacher-invite-modal .tinv-card');
      L('link: cartão com Agora não', await ev(() => !!document.querySelector('#teacher-invite-modal [data-tinv-act="later"]')));
      await page.click('#teacher-invite-modal [data-tinv-act="accept"]');
      await page.waitForFunction(() => !document.getElementById('teacher-invite-modal'));
      L('link: aceitar pelo código e esquecer o código', await ev(() => window.__acceptedCode === 'abc123def4' && !localStorage.getItem('pendingTeacherInvite')));
      // ---- link guardado: sem login ----
      await ev(async () => { CURRENT_USER = false; window.__gate = 0; goToNeutralGate = () => { window.__gate++; }; localStorage.setItem('pendingTeacherInvite', 'abc123def4'); window.__gateShown = await teacherInviteGateIfPending(); });
      L('sem login: cartão aparece', await ev(() => window.__gateShown === true && !!document.getElementById('teacher-invite-modal')));
      L('sem login: botão Entrar para aceitar', await ev(() => document.querySelector('#teacher-invite-modal [data-tinv-act="accept"]').textContent === t('tinvite.card.loginToAccept')));
      await shot('visitante-cartao-convite');
      await page.click('#teacher-invite-modal [data-tinv-act="accept"]');
      L('sem login: vai para o portão e guarda o código', await ev(() => window.__gate === 1 && localStorage.getItem('pendingTeacherInvite') === 'abc123def4'));
      await ev(() => { closeTeacherInviteCard(); localStorage.setItem('pendingTeacherInvite', 'xxxxxxxxxx'); });
      L('sem login: código inválido não mostra cartão', !(await ev(() => teacherInviteGateIfPending())) && await ev(() => !localStorage.getItem('pendingTeacherInvite')));

      // ---- professora (não admin) ----
      await login('P', 'p@x.com');
      L('professora: item Professora visível', await ev(() => [...document.querySelectorAll('.teacher-only-nav')].some(e => e.style.display !== 'none')));
      L('professora: item Admin escondido', await ev(() => [...document.querySelectorAll('.admin-only-nav')].every(e => e.style.display === 'none')));
      await ev(() => switchTab('teacher-panel'));
      await page.waitForTimeout(400);
      const tabs = await ev(() => [...document.querySelectorAll('#view-teacher-panel [data-teacher-section]')].map(b => b.textContent.trim()));
      L('professora: 5 abas (Mural entrou na Etapa 4)', tabs.length === 5, tabs);
      L('professora: Alunos abre (sem aviso de acesso negado)', !(await ev(() => document.getElementById('admin-students-content').textContent.includes(t('admin.common.adminOnly')))));
      L('professora: sem formulário de vincular (só a admin vincula)', await ev(() => !document.querySelector('#admin-assign-student-form')));
      // ---- convite: link ----
      await page.waitForSelector('#tinv-link-input');
      const dir = lang, code0 = lang === 'fr' ? 'abc123def4' : 'mmm111nnn2';
      L('convite: link do idioma atual', (await ev(() => document.getElementById('tinv-link-input').value)).endsWith(`/${dir}/?convite=${code0}`), await ev(() => document.getElementById('tinv-link-input').value));
      L('convite: WhatsApp leva o link', await ev((c) => { const h = document.getElementById('tinv-whats-btn').href; return h.startsWith('https://wa.me/?text=') && decodeURIComponent(h).includes(c); }, code0));
      await ev(() => document.querySelector(`[data-tinv-lang="${window.__appKey === 'frances' ? 'mandarim' : 'frances'}"]`).click());
      await page.waitForFunction((d) => document.getElementById('tinv-link-input')?.value.includes(d), lang === 'fr' ? '/zh/?convite=mmm111nnn2' : '/fr/?convite=abc123def4');
      L('convite: trocar idioma troca o link', true);
      await ev(() => document.querySelector(`[data-tinv-lang="${window.__appKey}"]`).click());
      await page.waitForFunction((c) => document.getElementById('tinv-link-input')?.value.includes(c), code0);
      await page.click('#tinv-reset-btn');
      await page.waitForFunction(() => document.getElementById('tinv-link-input')?.value.includes('zzz999yyy8'));
      L('convite: gerar outro link', true);
      // ---- convite: busca ----
      await page.fill('#tinv-search-input', 'ana');
      await page.waitForSelector('#tinv-search-list .plans-option');
      L('convite: busca não mostra a própria conta', await ev(() => ![...document.querySelectorAll('#tinv-search-list .plans-option-user')].some(e => e.textContent === '@carla.prof')));
      await page.keyboard.press('Enter');
      await page.waitForSelector('#tinv-send-btn');
      await page.click('#tinv-send-btn');
      await page.waitForFunction(() => document.getElementById('tinv-send-error')?.textContent.length > 0);
      L('convite: aluno com professora mostra o motivo', await ev(() => document.getElementById('tinv-send-error').textContent === t('tinvite.err.student_has_teacher')));
      await page.fill('#tinv-search-input', 'anabela');
      await page.waitForSelector('#tinv-search-list .plans-option');
      await page.keyboard.press('Enter');
      await page.waitForSelector('#tinv-send-btn');
      await page.click('#tinv-send-btn');
      await page.waitForSelector('.tinv-pending-row');
      L('convite: pendente aparece na lista', await ev(() => document.querySelector('.tinv-pending-row').textContent.includes('@anabela')));
      L('convite: rpc com o idioma escolhido', await ev(() => window.__rpcCalls.some(c => c[0] === 'teacher_invite_student' && c[1].p_student === 'S2' && c[1].p_lang === window.__appKey)));
      await shot('professora-convite');
      await page.click('[data-tinv-cancel]');
      await page.waitForFunction(() => !document.querySelector('.tinv-pending-row'));
      L('convite: cancelar tira da lista', await ev(() => window.__DB.teacher_students.some(r => r.student_id === 'S2' && r.status === 'removed')));
      // ---- Aulas (094): Presença, Competências, turma, rótulos ----
      await ev(() => { window.__DB.teacher_students.push({ id: 950, teacher_id: 'P', student_id: 'S', language_app_key: window.__appKey, status: 'active', created_at: '2026-10-01' });
        window.__DB.teacher_class_logs = [
          { id: 9001, teacher_id: 'P', student_id: 'S', classroom_id: null, language_app_key: window.__appKey, class_date: '2026-09-25', topic: null, homework: null, notes: '[Notion] Conversa sobre eleições e voltar com o ex\n[Notion] Para a próxima aula: ler o texto que ela esqueceu', attendance_label_id: 61, skills: [] },
          { id: 9002, teacher_id: 'P', student_id: 'S', classroom_id: null, language_app_key: window.__appKey, class_date: '2026-09-26', topic: null, homework: null, notes: '[Notion] fofoca', attendance_label_id: 61, skills: [] }]; });
      await ev(() => switchTeacherPanelSection('classlogs'));
      await page.waitForSelector('#admin-create-class-log-form [data-class-log-extras="new"]');
      // Revisar do Notion: editar e mostrar ao aluno / deixar só para mim
      await page.waitForSelector('#admin-notion-review [data-notion-review="9001"]');
      L('Notion: bloco de revisão com as 2 aulas marcadas', await ev(() => document.querySelectorAll('#admin-notion-review [data-notion-review]').length === 2 && document.querySelector('#admin-notion-review summary').textContent.includes('2')));
      L('Notion: tópico e "para a próxima aula" em caixas separadas', await ev(() => [...document.querySelectorAll('[data-notion-review="9001"] [data-notion-field]')].map(x => x.dataset.notionField + ':' + x.value).join('|') === 'topic:Conversa sobre eleições e voltar com o ex|homework:ler o texto que ela esqueceu'));
      await ev(() => { document.querySelector('#admin-notion-review details').open = true; });
      await page.fill('[data-notion-review="9001"] [data-notion-field="topic"]', 'Conversa sobre eleições');
      await page.fill('[data-notion-review="9001"] [data-notion-field="homework"]', 'Ler o texto');
      await shot('aulas-notion-revisao');
      await page.click('[data-notion-show="9001"]');
      await page.waitForFunction(() => window.__DB.teacher_class_logs.find(l => l.id === 9001).topic === 'Conversa sobre eleições');
      L('Notion: mostrar ao aluno grava só o texto editado e tira a marca das Anotações', await ev(() => { const l = window.__DB.teacher_class_logs.find(x => x.id === 9001); return l.homework === 'Ler o texto' && l.notes === 'Conversa sobre eleições e voltar com o ex\nPara a próxima aula: ler o texto que ela esqueceu'; }), await ev(() => window.__DB.teacher_class_logs.find(x => x.id === 9001)));
      await page.waitForFunction(() => document.querySelectorAll('#admin-notion-review [data-notion-review]').length === 1);
      await page.click('[data-notion-keep="9002"]');
      await page.waitForFunction(() => window.__DB.teacher_class_logs.find(l => l.id === 9002).notes === 'fofoca');
      L('Notion: deixar só para mim não mostra nada ao aluno', await ev(() => { const l = window.__DB.teacher_class_logs.find(x => x.id === 9002); return l.topic === null && l.homework === null; }));
      await page.waitForFunction(() => !document.querySelector('#admin-notion-review details'));
      L('Notion: bloco some quando acaba a revisão', true);
      await ev(() => { window.__DB.teacher_class_logs = []; });
      L('aulas: Presença com Sem registro, Presente e Faltou', await ev(() => [...document.querySelectorAll('[data-class-log-extras="new"] .att-choice')].map(l => l.textContent.trim()).join('|') === `${t('panel.classLog.attendanceNone')}|Presente|Faltou`));
      L('aulas: 7 Competências', await ev(() => document.querySelectorAll('[data-class-log-extras="new"] input[data-skill]').length === 7));
      L('aulas: turma aparece para escolher', await ev(() => !!document.querySelector('[data-classlog-classroom-checkbox][value="501"]')));
      await page.check('[data-classlog-student-checkbox][value="S"]');
      await page.check('[data-class-log-extras="new"] input[name="new-att"][value="61"]');
      await page.check('[data-class-log-extras="new"] input[data-skill][value="gramatica"]');
      await page.check('[data-class-log-extras="new"] input[data-skill][value="escuta"]');
      await page.fill('#admin-class-log-topic', 'Subjonctif');
      await shot('aulas-form');
      await page.click('#admin-create-class-log-btn');
      await page.waitForFunction(() => (window.__DB.teacher_class_logs || []).length === 1);
      L('aulas: grava Presença e Competências na aula do aluno', await ev(() => { const r = window.__DB.teacher_class_logs[0]; return r.student_id === 'S' && r.classroom_id === null && r.attendance_label_id === 61 && r.skills.join() === 'gramatica,escuta'; }), await ev(() => window.__DB.teacher_class_logs[0]));
      await page.waitForSelector('#admin-classlogs-list-box .att-pill');
      L('aulas: lista mostra a Presença colorida', await ev(() => document.querySelector('#admin-classlogs-list-box .att-pill').dataset.color === 'green'));
      // só Presença (Faltou), para a turma
      await page.uncheck('[data-classlog-student-checkbox][value="S"]');
      await page.check('[data-classlog-classroom-checkbox][value="501"]');
      await page.check('[data-class-log-extras="new"] input[name="new-att"][value="62"]');
      await page.click('#admin-create-class-log-btn');
      await page.waitForFunction(() => window.__DB.teacher_class_logs.length === 2);
      L('aulas: aula de turma é 1 linha sem aluno e com a turma', await ev(() => { const r = window.__DB.teacher_class_logs[1]; return r.student_id === null && r.classroom_id === 501 && r.attendance_label_id === 62; }), await ev(() => window.__DB.teacher_class_logs[1]));
      await page.waitForSelector('#admin-classlogs-list-box .class-log-classroom');
      L('aulas: lista da turma mostra o nome da turma', await ev(() => document.querySelector('#admin-classlogs-list-box .class-log-classroom').textContent.includes('Dupla')));
      // rótulos no estilo do Notion: criar digitando, ⋯ para cor/nome/arquivar, sem perder o que já foi digitado
      await page.fill('#admin-class-log-topic', 'Texto que não pode sumir');
      await page.fill('[data-att-new="new"]', 'Remarcada');
      await page.press('[data-att-new="new"]', 'Enter');
      await page.waitForFunction(() => [...document.querySelectorAll('[data-att-choices="new"] .att-choice')].some(l => l.textContent.includes('Remarcada')));
      L('rótulos: digitar + Enter cria e já seleciona', await ev(() => { const l = window.__DB.class_attendance_labels.find(x => x.name === 'Remarcada'); return !!l && l.teacher_id === 'P' && document.querySelector(`[data-att-choices="new"] input[value="${l.id}"]`).checked; }));
      L('rótulos: Enter no campo não registra aula', await ev(() => window.__DB.teacher_class_logs.length === 2));
      L('rótulos: o que já estava digitado continua lá', await ev(() => document.getElementById('admin-class-log-topic').value === 'Texto que não pode sumir'));
      L('rótulos: sem seção separada de rótulos', await ev(() => !document.getElementById('admin-att-labels')));
      const remId = await ev(() => window.__DB.class_attendance_labels.find(x => x.name === 'Remarcada').id);
      await page.click(`[data-att-choices="new"] [data-att-more="${remId}"]`);
      await page.waitForSelector('[data-att-menu="new"] .att-menu-box');
      L('rótulos: ⋯ abre nome + 9 cores (como no Notion)', await ev(() => document.querySelectorAll('[data-att-menu="new"] [data-att-color]').length === 9));
      await page.click('[data-att-menu="new"] [data-att-color="pink"]');
      await page.waitForFunction((id) => window.__DB.class_attendance_labels.find(x => x.id === id).color === 'pink', remId);
      L('rótulos: cor nova na hora no seletor', await ev((id) => document.querySelector(`[data-att-choices="new"] input[value="${id}"]`).closest('.att-choice').dataset.color === 'pink', remId));
      await shot('aulas-rotulos');
      await page.fill('[data-att-menu="new"] [data-att-rename]', 'Remarcada pela aluna');
      await page.click('[data-att-menu="new"] [data-att-close]');
      await page.waitForFunction((id) => window.__DB.class_attendance_labels.find(x => x.id === id).name === 'Remarcada pela aluna', remId);
      L('rótulos: renomear e Pronto fecha o menu', await ev(() => document.querySelector('[data-att-menu="new"]').hidden && [...document.querySelectorAll('[data-att-choices="new"] .att-choice')].some(l => l.textContent.includes('Remarcada pela aluna'))));
      L('rótulos: escolha continua marcada depois de editar', await ev((id) => document.querySelector(`[data-att-choices="new"] input[value="${id}"]`).checked, remId));
      await page.click(`[data-att-choices="new"] [data-att-more="${remId}"]`);
      await page.click('[data-att-menu="new"] [data-att-archive]');
      await page.waitForFunction((id) => window.__DB.class_attendance_labels.find(x => x.id === id).archived === true, remId);
      await page.waitForFunction(() => ![...document.querySelectorAll('[data-att-choices="new"] .att-choice')].some(l => l.textContent.includes('Remarcada')));
      L('rótulos: arquivar tira da lista de opções', true);
      L('rótulos: o texto digitado sobreviveu a tudo', await ev(() => document.getElementById('admin-class-log-topic').value === 'Texto que não pode sumir'));
      L('aulas: sem rolagem horizontal', await ev(() => document.documentElement.scrollWidth <= window.innerWidth + 1), await ev(() => [document.documentElement.scrollWidth, window.innerWidth]));
      await ev(() => switchTab('admin-badges'));
      L('professora: link antigo do Admin cai no painel da professora', await ev(() => document.getElementById('view-teacher-panel').classList.contains('active')));
      await shot('professora-alunos');

      // ---- admin ----
      await login('A', 'brunemed1310@gmail.com');
      L('admin: Professora e Admin no menu', await ev(() => [...document.querySelectorAll('.teacher-only-nav')].some(e => e.style.display !== 'none') && [...document.querySelectorAll('.admin-only-nav')].some(e => e.style.display !== 'none')));
      await ev(() => { switchTab('admin-badges'); switchAdminPanelSection('premium'); });
      await page.waitForSelector('#plans-search-input');
      const adminTabs = await ev(() => [...document.querySelectorAll('#view-admin-badges [data-admin-section]')].map(b => b.dataset.adminSection));
      L('admin: 5 abas, sem as da professora e sem Tags', JSON.stringify(adminTabs) === '["badges","analytics","notifications","reports","premium"]', adminTabs);
      await page.waitForSelector('.plans-matrix tbody tr');
      L('matriz: 12 permissões x 5 tipos', await ev(() => document.querySelectorAll('.plans-matrix tbody tr').length === 12 && document.querySelectorAll('.plans-matrix thead th').length === 6));
      await page.fill('#plans-search-input', 'a');
      await page.waitForTimeout(350);
      L('busca: 1 letra pede mais', (await ev(() => document.getElementById('plans-search-status').textContent)).length > 0);
      await page.fill('#plans-search-input', '@ana');
      await page.waitForSelector('.plans-option');
      const opts = await ev(() => [...document.querySelectorAll('.plans-option .plans-option-user')].map(e => e.textContent));
      L('busca: começa-com vem primeiro', opts[0] === '@ana' || opts[0] === '@anabela', opts);
      await page.keyboard.press('ArrowDown');
      L('busca: seta move a seleção', await ev(() => document.querySelector('.plans-option[aria-selected="true"]')?.dataset.i === '1'));
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press('Enter');
      await page.waitForSelector('[data-plan-role="teacher"]');
      L('conta: 3 interruptores', await ev(() => document.querySelectorAll('[data-plan-role]').length === 3));
      await page.click('[data-plan-role="teacher"]');
      await page.waitForFunction(() => document.querySelector('[data-plan-role="teacher"]').getAttribute('aria-checked') === 'true');
      L('conta: Professora concedida pela RPC', await ev(() => window.__grants.some(g => g[1] === 'teacher')));
      await shot('planos');
      await page.click('[data-plan-role="teacher"]');
      await page.waitForFunction(() => document.querySelector('[data-plan-role="teacher"]').getAttribute('aria-checked') === 'false');
      L('conta: Professora revogada', await ev(() => !window.__grants.some(g => g[1] === 'teacher')));
      // matriz: liga Formatos ricos para Grátis
      await ev(() => { const c = document.querySelector('.plans-cell[data-role="user"][data-key="rich_card_formats"] input[type=checkbox]'); c.click(); });
      await page.waitForFunction(() => document.querySelector('.plans-cell[data-role="user"][data-key="rich_card_formats"]').classList.contains('is-saved'));
      L('matriz: célula gravada', await ev(() => window.__DB.role_permissions.find(r => r.role === 'user' && r.permission_key === 'rich_card_formats').enabled === true));
      await ev(() => { const n = document.querySelector('.plans-cell[data-role="premium_pro"][data-key="tts_monthly_quota"] .plans-limit'); n.value = '600'; n.dispatchEvent(new Event('change')); });
      await page.waitForFunction(() => window.__DB.role_permissions.find(r => r.role === 'premium_pro' && r.permission_key === 'tts_monthly_quota').limit_value === 600);
      L('matriz: limite numérico gravado', true);
      L('sem rolagem horizontal na página', await ev(() => document.documentElement.scrollWidth <= window.innerWidth + 1), await ev(() => [document.documentElement.scrollWidth, window.innerWidth]));
      await ev(() => switchTab('teacher-panel'));
      await page.waitForTimeout(300);
      await shot('admin-professora');
      L('sem erros de página', errors.length === 0, errors);
      await ctx.close();
    }
  }
  await browser.close(); server.close();
  console.log(`${passed}/${passed + failed} ok`);
  process.exit(failed ? 1 : 0);
})();

// Sino da professora (108): Painel da professora > "Avisos dos alunos", separado do sino do topo.
// Reaproveita o stub em memória do Supabase de tests/fase-i; a tabela notifications ganha aqui um stub próprio com
// os filtros que o app usa (eq/neq/is/order/limit/head/update). Rodar: node tests/sino-professora/test_playwright.js
// (SHOTS=dir para salvar prints).
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

// Rede: papéis (my_permissions), mural vazio e a tabela notifications com filtros de verdade.
// noAudience = banco sem a 108 (coluna audience não existe): qualquer filtro por audience devolve erro 42703.
const BELL_STUB = ([who, noAudience]) => {
  const ago = (min) => new Date(Date.now() - min * 60000).toISOString();
  window.__NOTIF = [
    { id: 1, user_id: 'P', audience: 'teacher', category: 'supervisao', event_type: 'teacher_invite_accepted', language_app_key: 'portugues', action_tab: 'teacher-panel', read_at: null, created_at: ago(5),
      body: 'Ana aceitou seu convite e agora é seu aluno/a de português 🎉', params: { name: 'Ana', via: 'invite' } },
    { id: 2, user_id: 'P', audience: 'teacher', category: 'mural', event_type: 'mural_post', language_app_key: window.__appKey, action_tab: 'teacher-mural', read_at: null, created_at: ago(30),
      body: '📌 Bia postou no mural (turma Sábado): Oi, prof!', params: { name: 'Bia', classroom: 'Sábado', snippet: 'Oi, prof!' } },
    { id: 3, user_id: 'P', audience: 'teacher', category: 'mural', event_type: 'mural_comment', language_app_key: window.__appKey === 'frances' ? 'mandarim' : 'frances', action_tab: 'teacher-mural', read_at: null, created_at: ago(90),
      body: '💬 <img src=x onerror="window.__xss=1"> comentou no mural: oi', params: { name: '<img src=x onerror="window.__xss=1">', snippet: 'oi <b>x</b>' } },
    { id: 4, user_id: 'P', audience: 'teacher', category: 'supervisao', event_type: 'student_inactive_alert', language_app_key: 'mandarim', action_tab: 'admin-badges', read_at: null, created_at: ago(60 * 26),
      body: 'Sem aparecer há alguns dias: Caio (3 dias), Duda (1 dia). Talvez seja hora de mandar um alô 👋', params: { students: [{ name: 'Caio', days: 3 }, { name: 'Duda', days: 1 }] } },
    { id: 5, user_id: 'P', audience: 'teacher', category: 'supervisao', event_type: 'teacher_invite_declined', language_app_key: 'frances', action_tab: 'teacher-panel', read_at: ago(10), created_at: ago(60 * 50),
      body: 'Duda recusou o convite para as aulas de francês.', params: { name: 'Duda' } },
    { id: 8, user_id: 'P', audience: 'teacher', category: 'mural', event_type: 'mural_classroom_join', language_app_key: 'portugues', action_tab: 'teacher-mural', read_at: ago(60), created_at: ago(60 * 100),
      body: 'Frase antiga gravada sem params', params: null },
    { id: 6, user_id: 'P', audience: 'self', category: 'gamificacao', event_type: 'xp_earned', language_app_key: window.__appKey, action_tab: null, read_at: null, created_at: ago(2),
      title: 'Boa!', body: '+20 XP no bolso 💪', params: null },
    { id: 7, user_id: 'S', audience: 'self', category: 'mural', event_type: 'mural_post', language_app_key: window.__appKey, action_tab: 'my-mural', read_at: null, created_at: ago(3),
      body: '📌 Carla postou no mural: Leiam a página 3', params: null },
  ];
  window.__notifQueries = [];
  const roles = { P: { roles: ['user', 'teacher'] }, S: { roles: ['user', 'student'] } }[who];
  const origFrom = supabaseClient.from.bind(supabaseClient);
  supabaseClient.from = (table) => {
    if (table !== 'notifications') return origFrom(table);
    const st = { f: [], op: 'select', head: false, payload: null, order: null, limit: null };
    const run = () => {
      window.__notifQueries.push(st.f.map(x => x.join(':')).join(','));
      if (noAudience && st.f.some(([, k]) => k === 'audience')) return { data: null, count: null, error: { code: '42703', message: 'column notifications.audience does not exist' } };
      const ok = (r) => r.user_id === window.__uid && st.f.every(([op, k, v]) => op === 'eq' ? r[k] === v : op === 'neq' ? r[k] !== v : op === 'is' ? (r[k] ?? null) === v : true);
      const rows = window.__NOTIF.filter(ok);
      if (st.op === 'update'){ rows.forEach(r => Object.assign(r, st.payload)); return { data: rows, error: null }; }
      if (st.head) return { data: null, count: rows.length, error: null };
      let out = rows.slice();
      if (st.order) out.sort((a, b) => (a[st.order] < b[st.order] ? 1 : -1));
      if (st.limit) out = out.slice(0, st.limit);
      return { data: out, error: null };
    };
    const b = {
      select(_c, o){ if (o && o.head) st.head = true; return b; },
      update(p){ st.op = 'update'; st.payload = p; return b; },
      insert(){ return Promise.resolve({ data: null, error: null }); },
      eq(k, v){ st.f.push(['eq', k, v]); return b; },
      neq(k, v){ st.f.push(['neq', k, v]); return b; },
      is(k, v){ st.f.push(['is', k, v]); return b; },
      gte(){ return b; },
      order(k){ st.order = k; return b; },
      limit(n){ st.limit = n; return b; },
      maybeSingle(){ return b; },
      then(ok, ko){ return Promise.resolve(run()).then(ok, ko); },
    };
    return b;
  };
  const orig = supabaseClient.rpc.bind(supabaseClient);
  supabaseClient.rpc = async (name, args) => {
    if (name === 'my_permissions') return { data: { roles: roles.roles, admin: false, permissions: { teacher_panel: { enabled: roles.roles.includes('teacher') } } }, error: null };
    if (name === 'mural_list') return { data: { as_teacher: roles.roles.includes('teacher') ? { classrooms: [], roster: [] } : null, as_student: null }, error: null };
    return orig(name, args);
  };
};

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const combos = [['fr', 'light'], ['fr', 'dark'], ['zh', 'light'], ['zh', 'dark']];
  for (const [lang, theme] of combos){
    const appKey = lang === 'fr' ? 'frances' : 'mandarim';
    for (const width of [1200, 390]){
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
      const shot = async (name) => { if (SHOTS){ await page.waitForTimeout(450); await page.screenshot({ path: `${SHOTS}/${lang}-${theme}-${width}-${name}.png` }); } };
      const login = async (who, noAudience) => {
        await ev(([who, appKey, theme, stub, noAudience]) => {
          document.documentElement.setAttribute('data-theme', theme);
          window.__appKey = appKey;
          CURRENT_USER = { id: who, email: who + '@x.com' }; window.__uid = who;
          isAdminUser = () => false;
          PROFILE_CACHE = { user_id: who, plan_tier: 'free', admin_mode: false };
          clearMyPermissions();
          TBELL.open = false; TBELL.loaded = false; TBELL.items = []; TBELL.available = true;
          NOTIFICATION_AUDIENCE_COLUMN = true;
          eval(`(${stub})`)([who, noAudience]);
        }, [who, appKey, theme, BELL_STUB.toString(), !!noAudience]);
        await ev(async () => { await applyAdminModeUI(); await applyRoleNavUI(); await refreshNotificationUnreadCount(); });
        await page.waitForTimeout(150);
      };
      const noHScroll = () => ev(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

      // ---- professora (site em português) ----
      await login('P');
      L('topo: sino normal conta só o aviso da própria conta (1)', await ev(() => document.getElementById('notifications-badge').textContent === '1'));
      L('topo: consultas do sino normal filtram audience<>teacher', await ev(() => window.__notifQueries.some(q => q.includes('neq:audience:teacher'))));
      L('menu: ponto de avisos no item Painel da professora', await ev(() => !!document.querySelector('#teacher-panel-btn > .tbell-dot, .teacher-only-nav[data-tab="teacher-panel"] > .tbell-dot')));
      if (width === 390){
        L('celular: ponto também no botão Mais da barra de baixo', await ev(() => { const d = document.querySelector('#mais-btn > .tbell-dot'); return !!d && d.getBoundingClientRect().width > 0; }));
        await shot('menu');
      }
      await ev(() => switchTab('teacher-panel'));
      await page.waitForSelector('#tbell-btn');
      L('painel: sino com 4 não lidos', await ev(() => document.querySelector('#tbell-btn .mural-count')?.textContent === '4'), await ev(() => document.querySelector('#tbell-btn')?.textContent));
      L('painel: título em português', await ev(() => document.querySelector('#tbell-btn').textContent.includes('Avisos dos alunos')));
      L('painel: lista fechada no início', await ev(() => document.getElementById('tbell-panel').hidden));
      await shot('fechado');
      await page.click('#tbell-btn');
      await page.waitForSelector('.tbell-item');
      L('lista: 6 avisos da professora, nenhum do sino normal', await ev(() => document.querySelectorAll('.tbell-item').length === 6 && !document.querySelector('#tbell-panel').textContent.includes('XP')));
      const texts = await ev(() => [...document.querySelectorAll('.tbell-item-text')].map(e => e.textContent));
      L('frase pelo t(): aceitou (aluno de português)', texts[0] === 'Ana aceitou seu convite e agora é seu aluno/a de português 🎉', texts[0]);
      L('frase pelo t(): post na turma', texts[1] === 'Bia postou no mural (turma Sábado): Oi, prof!', texts[1]);
      L('aluno sumido pelo t(): lista com plural de dias', texts[3] === 'Sem aparecer há alguns dias: Caio (3 dias), Duda (1 dia). Talvez seja hora de mandar um alô 👋', texts[3]);
      L('sem params: mostra o body gravado', texts[5] === 'Frase antiga gravada sem params', texts[5]);
      L('nome com HTML escapado (sem XSS)', await ev(() => !document.querySelector('#tbell-panel img[src="x"]') && !window.__xss && document.querySelector('#tbell-panel').textContent.includes('<img src=x')));
      L('idioma do aluno em cada aviso (português, chinês...)', await ev(() => [...document.querySelectorAll('.tbell-lang')].map(e => e.textContent).join(',')) === `português,${lang === 'fr' ? 'francês' : 'chinês'},${lang === 'fr' ? 'chinês' : 'francês'},chinês,francês,português`);
      L('aviso de mural de outro idioma diz onde responder', await ev(() => document.querySelectorAll('.tbell-item-note').length === 2));
      L('não lidos marcados (4) e "Novo"', await ev(() => document.querySelectorAll('.tbell-item.is-unread').length === 4 && document.querySelectorAll('.tbell-new').length === 4));
      L('sem rolagem horizontal', await noHScroll());
      if (width === 390){
        const sizes = await ev(() => ['#tbell-btn', '#tbell-mark-all', '.tbell-item'].map(s => Math.round(document.querySelector(s).getBoundingClientRect().height)));
        L('alvos de toque >= 44px (botão, marcar todos, aviso)', sizes.every(h => h >= 44), sizes);
      }
      await shot('aberto');
      // mural de outro idioma: só marca como lido, continua na lista
      await page.click('.tbell-item-note >> xpath=ancestor::button');
      await page.waitForTimeout(100);
      L('mural de outro idioma: marca como lido e fica no sino', await ev(() => !document.getElementById('tbell-panel').hidden && window.__NOTIF.find(n => n.id === 3).read_at && document.querySelector('#tbell-btn .mural-count')?.textContent === '3'));
      // mural do idioma aberto: abre a aba Mural
      await page.click('.tbell-item >> nth=1');
      await page.waitForTimeout(150);
      L('mural do idioma aberto: abre Painel > Mural e marca como lido', await ev(() => TEACHER_PANEL_STATE.section === 'mural' && window.__NOTIF.find(n => n.id === 2).read_at && document.getElementById('tbell-panel').hidden));
      L('sino do topo não mudou (1)', await ev(() => document.getElementById('notifications-badge').textContent === '1'));
      // aluno sumido: abre Alunos
      await page.click('#tbell-btn'); await page.waitForSelector('.tbell-item');
      await page.click('.tbell-item >> nth=3');
      await page.waitForTimeout(150);
      L('aluno sumido: abre Painel > Alunos', await ev(() => TEACHER_PANEL_STATE.section === 'students' && window.__NOTIF.find(n => n.id === 4).read_at));
      // marcar todos
      await page.click('#tbell-btn'); await page.waitForSelector('.tbell-item');
      await page.click('#tbell-mark-all');
      await page.waitForTimeout(100);
      L('marcar todos: contador some, ponto do menu some, botão desativado', await ev(() => !document.querySelector('#tbell-btn .mural-count') && !document.querySelector('.tbell-dot') && document.getElementById('tbell-mark-all').disabled));
      L('marcar todos não mexe no sino normal', await ev(() => window.__NOTIF.find(n => n.id === 6).read_at === null));
      // site em inglês: mesma lista, frases do catálogo en
      await ev(() => setUiLang('en'));
      await page.waitForFunction(() => document.querySelector('#tbell-btn')?.textContent.includes('Student notifications'));
      const en = await ev(() => [...document.querySelectorAll('.tbell-item-text')].map(e => e.textContent));
      L('inglês: frase montada no idioma de quem lê (aviso gravado em português)', en[0] === 'Ana accepted your invitation and is now your Portuguese student 🎉', en[0]);
      L('inglês: nenhuma palavra em português nos avisos com params', !/aceitou|postou|comentou|recusou|aluno\/a|turma/.test([en[0], en[1], en[2], en[3], en[4]].join(' ')), en);
      L('inglês: aluno sumido com a frase e o plural em inglês', en[3] === "Haven't shown up in a few days: Caio (3 days), Duda (1 day). Maybe it's time to say hi 👋", en[3]);
      L('inglês: idioma do aluno em inglês', await ev(() => document.querySelector('.tbell-lang').textContent === 'Portuguese'));
      await shot('en');
      await ev(() => setUiLang('pt-BR'));

      // ---- banco sem a 108: tudo volta ao sino do topo, sem sino da professora ----
      await login('P', true);
      await ev(() => { TEACHER_PANEL_STATE.section = 'students'; return renderTeacherPanelView(); });
      await page.waitForTimeout(150);
      L('sem a 108: sino do topo mostra tudo (5 não lidos: 4 da professora + 1 da conta), sem erro', await ev(() => document.getElementById('notifications-badge').textContent === '5' && NOTIFICATION_AUDIENCE_COLUMN === false), await ev(() => document.getElementById('notifications-badge').textContent));
      L('sem a 108: sino da professora escondido', await ev(() => document.getElementById('teacher-bell').hidden && !document.querySelector('.tbell-dot')));
      await ev(() => toggleNotificationDropdown());
      await page.waitForSelector('.notification-item');
      L('sem a 108: lista do topo com os 7 avisos da conta (como antes)', await ev(() => document.querySelectorAll('#notifications-list .notification-item').length === 7));
      await ev(() => document.getElementById('notifications-dropdown').classList.remove('open'));

      // ---- com a 108: sino do topo só com os avisos da própria conta ----
      await login('P');
      await ev(() => toggleNotificationDropdown());
      await page.waitForSelector('.notification-item');
      L('com a 108: lista do topo só com o aviso da conta', await ev(() => document.querySelectorAll('#notifications-list .notification-item').length === 1));
      await ev(() => document.getElementById('notifications-dropdown').classList.remove('open'));

      // ---- aluno: sem sino da professora ----
      await login('S');
      L('aluno: sem sino da professora nem ponto no menu', await ev(() => (document.getElementById('teacher-bell').hidden || !document.getElementById('teacher-bell').innerHTML) && !document.querySelector('.tbell-dot')));
      L('aluno: sino do topo com o recado da professora (1)', await ev(() => document.getElementById('notifications-badge').textContent === '1'));

      L('sem pageerror', errors.length === 0, errors);
      await ctx.close();
    }
    console.log(`== ${lang} ${theme}`);
  }
  await browser.close(); server.close();
  console.log(`${passed}/${passed + failed} ${failed ? 'com falhas' : 'ok'}`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

// Mural da professora (087): Painel da professora > Mural (Turmas | Alunos, criar turma, alunos, link, escrever
// com anexo e "Para", editar, apagar), lado do aluno (menu Mural com +N, Perfil, turmas, comentar, postar), link da
// turma (?turma=) com e sem login e o aviso do sino que abre o Mural da professora.
// Banco simulado em memória (as regras de verdade estão em tests/mural/test_087.sql).
// Rodar: node tests/mural/test_playwright.js  (SHOTS=dir para salvar prints)
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
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

// Banco do mural em memória (window.__M sobrevive à troca de conta na mesma página).
const MURAL_FAKE = (who) => {
  const M = window.__M || (window.__M = {
    classrooms: [], members: [], posts: [], comments: [], seen: {}, seq: 100, uploads: [], removed: [], tick: 1,
    people: { P: { id: 'P', name: 'Carla Prof', username: 'carla.prof', avatar: null }, S: { id: 'S', name: 'Ana Souza', username: 'ana', avatar: null },
              S2: { id: 'S2', name: 'Anabela', username: 'anabela', avatar: null }, X: { id: 'X', name: 'Xavier', username: 'xavier', avatar: null } },
    linked: ['S', 'S2'],
  });
  const now = () => M.tick++;
  const lang = window.__appKey;
  const isMember = (cid, u) => M.members.some(m => m.c === cid && m.s === u);
  const visible = (p, u) => u === 'P' || (M.linked.includes(u) && (p.student ? p.student === u : isMember(p.classroom, u)));
  const inMural = (p, cid, sid) => cid ? p.classroom === cid : (!p.classroom && p.student === sid);
  const key = (cid, sid) => cid ? `c:${cid}` : `i:${sid}`;
  const unread = (u, cid, sid) => {
    const t0 = M.seen[`${u}|${key(cid, sid)}`] || 0;
    const ps = M.posts.filter(p => inMural(p, cid, sid) && visible(p, u));
    return ps.filter(p => p.author !== u && p.t > t0).length
      + M.comments.filter(c => ps.some(p => p.id === c.post) && c.author !== u && c.t > t0).length;
  };
  const prev = supabaseClient.rpc.bind(supabaseClient);
  supabaseClient.rpc = async (name, a) => {
    (window.__rpcCalls = window.__rpcCalls || []).push([name, a]);
    const ok = (data) => ({ data, error: null });
    if (name === 'my_permissions') return ok({ roles: who === 'P' ? ['user', 'teacher'] : ['user', 'student'], admin: false, permissions: {} });
    if (name === 'get_my_class_logs' || name === 'my_teacher_invites') return ok([]);
    if (name === 'mural_list'){
      const asTeacher = who === 'P' ? {
        classrooms: M.classrooms.map(c => ({ id: c.id, name: c.name, members: M.members.filter(m => m.c === c.id).map(m => m.s), unread: unread('P', c.id) })),
        roster: M.linked.map(s => ({ ...M.people[s], in_classroom: M.members.some(m => m.s === s), unread: unread('P', null, s) })),
      } : null;
      const asStudent = M.linked.includes(who) ? {
        teacher: M.people.P, individual_unread: unread(who, null, who), individual_posts: 0,
        classrooms: M.classrooms.filter(c => isMember(c.id, who)).map(c => ({ id: c.id, name: c.name, unread: unread(who, c.id) })),
      } : null;
      return ok({ as_teacher: asTeacher, as_student: asStudent });
    }
    if (name === 'mural_feed'){
      const cid = a.p_classroom_id, sid = cid ? null : (who === 'P' ? a.p_student_id : who);
      if (cid && !(who === 'P' || isMember(cid, who))) return ok({ error: 'not_authorized' });
      M.seen[`${who}|${key(cid, sid)}`] = now();
      const person = (u) => M.people[u];
      const posts = M.posts.filter(p => inMural(p, cid, sid) && visible(p, who)).sort((x, y) => y.t - x.t).map(p => ({
        id: p.id, author: person(p.author), by_teacher: p.author === 'P', body: p.body, attachments: p.attachments, created_at: new Date().toISOString(),
        edited_at: p.edited || null, target: p.classroom && p.student ? person(p.student) : null,
        can_edit: p.author === who && who === 'P', can_delete: p.author === who || who === 'P',
        comments: M.comments.filter(c => c.post === p.id).map(c => ({ id: c.id, author: person(c.author), by_teacher: c.author === 'P', body: c.body, created_at: new Date().toISOString(), can_delete: c.author === who || who === 'P' })),
      }));
      return ok({ posts, teacher: person('P'), is_teacher: who === 'P' });
    }
    if (name === 'mural_create_post'){
      if (!a.p_body && !(a.p_attachments || []).length) return ok({ error: 'empty' });
      const p = { id: ++M.seq, classroom: a.p_classroom_id, student: a.p_classroom_id ? (who === 'P' ? a.p_student_id : null) : (who === 'P' ? a.p_student_id : who),
        author: who, body: a.p_body, attachments: a.p_attachments || [], t: now() };
      M.posts.push(p); return ok({ ok: true, id: p.id });
    }
    if (name === 'mural_update_post'){
      const p = M.posts.find(x => x.id === a.p_post_id);
      const removed = p.attachments.map(x => x.path).filter(x => !a.p_attachments.some(y => y.path === x));
      Object.assign(p, { body: a.p_body.trim(), attachments: a.p_attachments, edited: new Date().toISOString() });
      return ok({ ok: true, removed_paths: removed });
    }
    if (name === 'mural_delete_post'){
      const p = M.posts.find(x => x.id === a.p_post_id);
      M.posts = M.posts.filter(x => x !== p); return ok({ ok: true, removed_paths: p.attachments.map(x => x.path) });
    }
    if (name === 'mural_add_comment'){ M.comments.push({ id: ++M.seq, post: a.p_post_id, author: who, body: a.p_body, t: now() }); return ok({ ok: true }); }
    if (name === 'mural_delete_comment'){ M.comments = M.comments.filter(c => c.id !== a.p_comment_id); return ok({ ok: true }); }
    if (name === 'mural_save_classroom'){
      if (!String(a.p_name || '').trim()) return ok({ error: 'invalid_name' });
      if (a.p_id){ M.classrooms.find(c => c.id === a.p_id).name = a.p_name.trim(); return ok({ ok: true, id: a.p_id }); }
      const c = { id: ++M.seq, name: a.p_name.trim() }; M.classrooms.push(c); return ok({ ok: true, id: c.id });
    }
    if (name === 'mural_set_classroom_members'){ M.members = M.members.filter(m => m.c !== a.p_id).concat(a.p_student_ids.map(s => ({ c: a.p_id, s }))); return ok({ ok: true }); }
    if (name === 'mural_classroom_link') return ok({ ok: true, code: a.p_reset ? 'novo222cod' : 'turma11cod' });
    if (name === 'mural_delete_classroom'){ M.classrooms = M.classrooms.filter(c => c.id !== a.p_id); return ok({ ok: true, removed_paths: [] }); }
    if (name === 'classroom_code_info') return ok(a.p_code === 'turma11cod' ? { teacher_id: 'P', teacher_name: 'Carla Prof', teacher_username: 'carla.prof', teacher_avatar: null, language_app_key: lang, classroom_name: M.classrooms[0]?.name || 'Turma' } : { error: 'invalid_code' });
    if (name === 'join_classroom_code'){
      if (!M.linked.includes(who)) M.linked.push(who);
      M.members.push({ c: M.classrooms[0].id, s: who }); window.__joined = a.p_code;
      return ok({ ok: true, new_link: true, language_app_key: lang, classroom_id: M.classrooms[0].id, classroom_name: M.classrooms[0].name });
    }
    return prev(name, a);
  };
  supabaseClient.storage = { from: () => ({
    upload: async (p, blob, o) => { M.uploads.push({ path: p, type: o.contentType, size: blob.size }); return { data: { path: p }, error: null }; },
    remove: async (ps) => { M.removed.push(...ps); return { data: [], error: null }; },
    createSignedUrls: async (ps) => ({ data: ps.map(p => ({ path: p, signedUrl: `http://127.0.0.1/signed/${encodeURIComponent(p)}` })), error: null }),
  }) };
};

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const combos = [['fr', 'light', 1200], ['fr', 'light', 390], ['fr', 'dark', 1200], ['zh', 'light', 1200], ['zh', 'dark', 390]];
  for (const [lang, theme, width] of combos){
    const appKey = lang === 'fr' ? 'frances' : 'mandarim';
    const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width, height: 900 }, colorScheme: theme });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('dialog', d => d.accept());
    await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
    await page.route(/127\.0\.0\.1\/signed\//, r => r.fulfill({ contentType: 'image/png', body: PNG }));
    await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
    await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
    await page.goto(`http://127.0.0.1:${port}/${lang}/index.html?turma=TURMA11COD&x=1`);
    await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
    const ev = (fn, arg) => page.evaluate(fn, arg);
    const L = (n, c, x) => check(`${lang}-${theme}-${width} ${n}`, c, x);
    const shot = async (name) => { if (SHOTS) { await page.waitForTimeout(400); await page.screenshot({ path: `${SHOTS}/${lang}-${theme}-${width}-${name}.png` }); } };
    L('link ?turma= guardado e tirado do endereço', await ev(() => localStorage.getItem('pendingClassroomCode') === 'turma11cod' && location.search === '?x=1'));
    await ev(() => localStorage.removeItem('pendingClassroomCode'));
    const login = async (who) => {
      await ev(([who, appKey, theme, stub]) => {
        document.documentElement.setAttribute('data-theme', theme);
        window.__appKey = appKey;
        CURRENT_USER = { id: who, email: `${who}@x.com` }; window.__uid = who;
        isAdminUser = () => false;
        PROFILE_CACHE = { user_id: who, plan_tier: 'free' };
        clearMyPermissions();
        eval(`(${stub})`)(who);
      }, [who, appKey, theme, MURAL_FAKE.toString()]);
      await ev(async () => { await applyRoleNavUI(); await refreshMuralBadges(); });
    };

    // ===== professora =====
    await login('P');
    L('professora sem professora: sem item Aluno', await ev(() => document.getElementById('student-panel-btn').style.display === 'none' && document.querySelector('.student-only-nav').style.display === 'none'));
    await ev(() => switchTab('teacher-panel'));
    await ev(() => document.querySelector('[data-teacher-section="mural"]').click());
    await page.waitForSelector('#admin-mural-content .mural-wrap');
    L('aba Mural no painel', await ev(() => document.getElementById('admin-mural-content').style.display === ''));
    L('seletor Turmas | Alunos', await ev(() => [...document.querySelectorAll('[data-mural-mode]')].map(b => b.dataset.muralMode).join() === 'classrooms,students'));
    L('formulário de nova turma escondido até clicar', !(await ev(() => document.querySelector('.mural-new-form').offsetParent)));
    L('sem turmas: convite para criar', await ev(() => document.querySelector('#admin-mural-content .mural-board-host').textContent.includes(t('mural.noClassrooms'))));
    await page.click('[data-mural-new]');
    await page.fill('#mural-new-name', 'Turma de quinta');
    await page.click('.mural-new-form button[type=submit]');
    await page.waitForSelector('.mural-manage[open]');
    L('turma criada e já aberta para pôr alunos', await ev(() => document.querySelector('.mural-chip.is-active').textContent.includes('Turma de quinta')));
    L('lista de alunos para marcar', await ev(() => document.querySelectorAll('.mural-member-list li').length === 2));
    await page.fill('.mural-member-filter', '@anab');
    L('busca por @ filtra', await ev(() => [...document.querySelectorAll('.mural-member-list li')].filter(li => !li.hidden).length === 1));
    await page.fill('.mural-member-filter', '');
    await page.check('.mural-member-list input[value="S"]');
    await page.click('[data-mural-save-members]');
    await page.waitForFunction(() => window.__M.members.length === 1);
    L('salva alunos da turma', await ev(() => window.__rpcCalls.some(c => c[0] === 'mural_set_classroom_members' && c[1].p_student_ids.join() === 'S')));
    await ev(() => { document.querySelector('.mural-manage').open = true; });
    await page.click('[data-mural-link]');
    await page.waitForSelector('.mural-link-box input');
    L('link da turma no idioma atual', (await ev(() => document.querySelector('.mural-link-box input').value)).endsWith(`/${lang}/?turma=turma11cod`), await ev(() => document.querySelector('.mural-link-box input').value));
    await shot('professora-turma');
    // escrever com anexos e "Para"
    L('"Para": turma toda ou um aluno da turma', await ev(() => [...document.querySelectorAll('.mural-target option')].map(o => o.value).join() === ',S'));
    await page.setInputFiles('#admin-mural-content .mural-file-input', [{ name: 'notas.txt', mimeType: 'text/plain', buffer: Buffer.from('x') }]);
    await page.waitForFunction(() => document.querySelector('#admin-mural-content .mural-composer-error').textContent.length > 0);
    L('arquivo que não é PDF/imagem é recusado', await ev(() => document.querySelector('#admin-mural-content .mural-composer-error').textContent.includes('notas.txt')));
    await page.setInputFiles('#admin-mural-content .mural-file-input', [
      { name: 'Aula 3 (revisão).pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 teste') },
      { name: 'quadro.png', mimeType: 'image/png', buffer: PNG }]);
    await page.waitForFunction(() => document.querySelectorAll('#admin-mural-content .mural-composer-file').length === 2);
    L('2 anexos prontos', true);
    await page.fill('#admin-mural-content .mural-composer-text', 'Aula de quinta remarcada para sexta. Material: https://exemplo.com/aula');
    await page.click('#admin-mural-content .mural-publish');
    await page.waitForSelector('#admin-mural-content .mural-post');
    L('anexos enviados para a pasta P/P/ com nome limpo', await ev(() => window.__M.uploads.length === 2 && window.__M.uploads.every(u => /^P\/P\/[a-z0-9]+-[a-z0-9]+-[A-Za-z0-9._-]+$/.test(u.path)) && window.__M.uploads[0].path.endsWith('Aula-3-revisao-.pdf')), await ev(() => window.__M.uploads.map(u => u.path)));
    L('post para a turma toda', await ev(() => window.__rpcCalls.some(c => c[0] === 'mural_create_post' && c[1].p_student_id === null && c[1].p_attachments.length === 2)));
    L('link no texto vira link', await ev(() => document.querySelector('.mural-post-body a')?.href === 'https://exemplo.com/aula'));
    await page.waitForFunction(() => document.querySelector('.mural-file-img img')?.src.includes('/signed/'));
    L('imagem e PDF com link assinado', await ev(() => document.querySelector('.mural-file')?.href.includes('/signed/')));
    await page.selectOption('#admin-mural-content .mural-target', 'S');
    await page.fill('#admin-mural-content .mural-composer-text', 'Ana, revise a unidade 3');
    await page.click('#admin-mural-content .mural-publish');
    await page.waitForFunction(() => document.querySelectorAll('#admin-mural-content .mural-post').length === 2);
    L('"Para" volta para a turma toda depois de publicar', await ev(() => document.querySelector('#admin-mural-content .mural-target').value === ''));
    L('recado só para a Ana mostra o cadeado', await ev(() => document.querySelector('.mural-post-target')?.textContent.includes('Ana Souza')));
    await shot('professora-mural');
    // editar e apagar
    await ev(() => document.querySelector('[data-mural-edit]').click());
    await page.fill('.mural-edit-form textarea', 'Ana, revise as unidades 3 e 4');
    await page.click('.mural-edit-form button[type=submit]');
    await page.waitForFunction(() => document.querySelector('.mural-post-body')?.textContent.includes('3 e 4'));
    L('editar recado', await ev(() => document.querySelector('.mural-post .mural-meta').textContent.includes(t('mural.edited'))));
    // Alunos: só quem não está em turma
    await ev(() => document.querySelector('[data-mural-mode="students"]').click());
    await page.waitForSelector('[data-mural-student]');
    L('Alunos: só quem está fora de turma', await ev(() => [...document.querySelectorAll('[data-mural-student]')].map(b => b.dataset.muralStudent).join() === 'S2'));
    await ev(() => document.querySelector('[data-mural-student="S2"]').click());
    await page.waitForSelector('#admin-mural-content .mural-composer');
    L('mural individual sem "Para"', await ev(() => !document.querySelector('#admin-mural-content .mural-target')));
    await page.fill('#admin-mural-content .mural-composer-text', 'Bela, mandei o exercício');
    await page.click('#admin-mural-content .mural-publish');
    await page.waitForSelector('#admin-mural-content .mural-post');
    L('post individual vai para o aluno', await ev(() => window.__rpcCalls.some(c => c[0] === 'mural_create_post' && c[1].p_classroom_id === null && c[1].p_student_id === 'S2')));
    await ev(() => document.querySelector('[data-mural-mode="classrooms"]').click());
    await page.waitForSelector('.mural-chip.is-active');

    // ===== aluna da turma =====
    await login('S');
    L('aluna: item Aluno no menu Mais e na barra lateral com +2', await ev(() => ['#student-panel-btn', '.student-only-nav'].every(sel => { const b = document.querySelector(sel); return b.style.display === '' && b.querySelector('.mural-count')?.textContent === '2'; })));
    L('aluna: +2 no botão Mais', await ev(() => document.querySelector('#mais-btn > .mural-count')?.textContent === '2'));
    L('aluna: Perfil sem o número do mural', await ev(() => ![...document.querySelectorAll('.tab-btn[data-tab="profile"]')].some(b => b.querySelector('.mural-count'))));
    await shot('aluna-menu');
    await ev(() => document.querySelector('.student-only-nav').click());
    await page.waitForSelector('#view-student-panel.active #my-mural-content .mural-post');
    L('Aluno: 4 abas Mural, Aulas, Material, Revisão', await ev(() => [...document.querySelectorAll('[data-student-section]')].map(b => b.dataset.studentSection).join() === 'mural,classlogs,materials,revisao'));
    L('aluna: abre na turma com novidade', await ev(() => document.querySelector('#my-mural-content .mural-chip.is-active')?.textContent.includes('Turma de quinta')));
    L('aluna: vê os 2 recados (o dela inclusive)', await ev(() => document.querySelectorAll('#my-mural-content .mural-post').length === 2));
    L('aluna: não edita nem apaga recado da professora', await ev(() => !document.querySelector('#my-mural-content [data-mural-edit], #my-mural-content [data-mural-del-post]')));
    await page.waitForFunction(() => !document.getElementById('student-panel-btn').querySelector('.mural-count'));
    L('aluna: +N some depois de abrir', true);
    await page.fill('#my-mural-content .mural-comment-form input', 'Combinado!');
    await page.click('#my-mural-content .mural-comment-form button');
    await page.waitForSelector('#my-mural-content .mural-comment');
    L('aluna: comenta', await ev(() => document.querySelector('#my-mural-content .mural-comment-body').textContent === 'Combinado!'));
    L('aluna: apaga o próprio comentário (botão)', await ev(() => !!document.querySelector('#my-mural-content [data-mural-del-comment]')));
    await page.fill('#my-mural-content .mural-composer-text', 'Alguém tem o PDF da aula?');
    await page.click('#my-mural-content .mural-publish');
    await page.waitForFunction(() => document.querySelectorAll('#my-mural-content .mural-post').length === 3);
    L('aluna: posta na turma (sem "Para")', await ev(() => !document.querySelector('#my-mural-content .mural-target') && window.__rpcCalls.some(c => c[0] === 'mural_create_post' && c[1].p_student_id === null && c[1].p_classroom_id)));
    L('aluna: apaga o próprio post', await ev(() => document.querySelectorAll('#my-mural-content [data-mural-del-post]').length === 1));
    L('aluna: chip do mural individual com a professora', await ev(() => [...document.querySelectorAll('#my-mural-content .mural-chip')].some(c => c.textContent.includes('Carla Prof'))));
    await shot('aluna-mural');
    await ev(() => document.querySelector('[data-student-section="classlogs"]').click());
    L('Aluno > Aulas mostra o registro', await ev(() => document.getElementById('my-class-logs-content').style.display === '' && document.getElementById('my-mural-content').style.display === 'none'));
    await ev(() => document.querySelector('[data-student-section="materials"]').click());
    L('Aluno > Material de apoio', await ev(() => document.getElementById('support-materials-content').style.display === ''));
    await ev(() => switchTab('my-mural'));
    L('aviso antigo "my-mural" abre Aluno > Mural', await ev(() => document.getElementById('view-student-panel').classList.contains('active') && STUDENT_PANEL_STATE.section === 'mural'));
    L('sem rolagem horizontal', await ev(() => document.documentElement.scrollWidth <= window.innerWidth + 1), await ev(() => [document.documentElement.scrollWidth, window.innerWidth]));

    // ===== aviso do sino abre o Mural da professora =====
    await login('P');
    L('professora: +2 no Painel da professora (post e comentário da aluna)', await ev(() => document.querySelector('#teacher-panel-btn .mural-count')?.textContent === '2'));
    await ev(() => { TEACHER_PANEL_STATE.section = 'students'; switchTab('teacher-mural'); });
    await page.waitForSelector('#admin-mural-content .mural-wrap');
    L('sino "teacher-mural" abre Painel > Mural', await ev(() => document.getElementById('view-teacher-panel').classList.contains('active') && TEACHER_PANEL_STATE.section === 'mural'));

    // ===== link da turma =====
    await login('X');
    L('sem professora: sem item Aluno', await ev(() => document.getElementById('student-panel-btn').style.display === 'none'));
    await ev(() => { localStorage.setItem('pendingClassroomCode', 'turma11cod'); muralAfterLogin(); });
    await page.waitForSelector('#classroom-join-modal .tinv-card');
    L('link: cartão com o nome da turma', await ev(() => document.getElementById('classroom-join-title').textContent.includes('Turma de quinta')));
    await shot('link-turma');
    await page.click('#classroom-join-modal [data-join-act="accept"]');
    await page.waitForFunction(() => !document.getElementById('classroom-join-modal'));
    L('link: entra na turma e esquece o código', await ev(() => window.__joined === 'turma11cod' && !localStorage.getItem('pendingClassroomCode')));
    await page.waitForSelector('#view-student-panel.active #my-mural-content .mural-post');
    L('link: abre o Mural da turma', true);
    await ev(async () => { CURRENT_USER = false; window.__gate = 0; goToNeutralGate = () => { window.__gate++; }; localStorage.setItem('pendingClassroomCode', 'turma11cod'); window.__shown = await muralClassroomGateIfPending(); });
    L('sem login: cartão com "Entrar para participar"', await ev(() => window.__shown === true && document.querySelector('#classroom-join-modal [data-join-act="accept"]').textContent === t('mural.join.login')));
    await page.click('#classroom-join-modal [data-join-act="accept"]');
    L('sem login: vai ao portão e guarda o código', await ev(() => window.__gate === 1 && localStorage.getItem('pendingClassroomCode') === 'turma11cod'));
    await ev(() => { closeClassroomJoinCard(); localStorage.setItem('pendingClassroomCode', 'xxxxxxxxxx'); });
    L('sem login: código inválido não mostra cartão', !(await ev(() => muralClassroomGateIfPending())) && await ev(() => !localStorage.getItem('pendingClassroomCode')));
    L('sem erros de página', errors.length === 0, errors);
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(`${passed}/${passed + failed} ok`);
  process.exit(failed ? 1 : 0);
})();

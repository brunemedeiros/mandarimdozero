// Harness do painel da professora no navegador real (Chromium + Playwright): sobe um servidor estático, troca só a
// rede (Supabase vira um stub) e abre a aba "Painel da professora" com alunos de exemplo. Nada toca produção.
// As RPCs get_teacher_student_overview / get_teacher_student_metrics devolvem objetos no MESMO formato validado por
// tests/painel-alunos/test_rpc.sql.
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH, '/opt/node22/lib/node_modules', '/opt/node-tools/node_modules'].filter(Boolean) }));
const ROOT = path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

const STUB = `(function(){
  const b = new Proxy({}, { get(_, p){ if (p === 'then') return (ok) => Promise.resolve({ data: [], error: null }).then(ok); return () => b; } });
  const client = { auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: async () => ({}) },
    from: () => b, channel: () => ({ on(){ return this; }, subscribe(){ return this; } }),
    storage: { from: () => ({}) }, functions: { invoke: async () => ({ data: null, error: null }) },
    rpc: async (name, args) => { window.__rpc = (window.__rpc || []); window.__rpc.push(name);
      if (name === 'get_teacher_student_overview') return { data: window.__OV(args.p_student_id, args.p_language_app_key), error: null };
      if (name === 'get_teacher_student_metrics') return { data: window.__MET(args.p_student_id), error: null };
      return { data: null, error: null }; } };
  window.supabase = { createClient: () => client };
})();`;

// Alunos de exemplo: [id, usuário, nome, idioma do vínculo, dias desde o último estudo (null = nunca), sequência, devidos]
const ALUNOS = [
  [1, 'marina.alves', 'Marina Alves', 'frances', 0, 23, 12],
  [2, 'rafa.costa', 'Rafael Costa', 'frances', 1, 4, 3],
  [3, 'helena.d', 'Helena Duarte', 'frances', 9, 7, 41],
  [4, 'tiagonunes', 'Tiago Nunes', 'frances', 4, 2, 18],
  [5, 'cafer', 'Camila Ferraz', 'frances', 3, 41, 0],
  [6, 'brunot', 'Bruno Teles', 'mandarim', 12, 3, 22],
  [7, 'novato', 'Novo Aluno', 'frances', null, 0, 0],
];


async function abrir({ lang = 'fr', scheme = 'light', width = 1280, height = 1000, alunos = ALUNOS, admin = true, falhar = [] } = {}){
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    const f = path.join(ROOT, p);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width, height }, colorScheme: scheme });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
  await page.addInitScript(([alunos, falhar]) => {
    const day = n => { const d = new Date(Date.now() - n * 86400000); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
    const byId = {}; alunos.forEach(a => { byId['s' + a[0]] = a; });
    const lg = (key, a) => ({ key, lastStudyDay: a[4] === null ? null : day(a[4]), streak: a[5], xp: 450, totalReviews: 480,
      progressSummary: { levelId: 'A2', levelLabel: 'A2', pct: 45 }, unitsCompleted: ['A1-1', 'A1-2'], unitsStarted: 4,
      checkpoints: { 'A1-m1': { completed: true, bestScore: 85 } },
      activityDays: a[4] === null ? {} : { [day(a[4])]: 2, [day(a[4] + 1)]: 1, [day(a[4] + 6)]: 1, [day(25)]: 1 }, dailyLessons: a[4] === null ? {} : { [day(a[4])]: 1 },
      dictations: [], challengesCompleted: 3, queue: { total: 40, new: 8, learning: 6, review: 26, due: a[6], weak: 4 }, ownCardsActive: 5 });
    window.__OV = (sid, link) => {
      if (falhar.includes(sid)) return null;
      const a = byId[sid]; if (!a) return null;
      const k = link;
      return { linkedLanguage: k, languages: a[4] === null ? [] : [lg(k, a)],
        timeline: a[4] === null ? [] : [{ at: new Date().toISOString(), type: 'lesson_complete', name: 'vocab_lesson', lang: k, meta: { unitId: 'A1-1', scorePct: 90 } }, { at: new Date(Date.now() - 36e5).toISOString(), type: 'tab_switch', name: 'review', lang: k, meta: {} }],
        answers: a[4] === null ? { allTotal: 0 } : { allTotal: 20, last7Total: 10, last7Correct: 8, last30Total: 20, last30Correct: 15 }, lessonScores: { last30Count: 3, last30AvgPct: 85 } };
    };
    window.__MET = (sid) => sid === 's1' ? { lastStudyDay: day(0), contentsTotal: 12, contentsStudied: 9, contentsNotStarted: 3, contentsStrengthNotStarted: 3, contentsStrengthWeak: 2, contentsStrengthMedium: 4, contentsStrengthStrong: 3, cardsTotal: 15, cardsNew: 3, cardsLearning: 4, cardsReview: 8, cardsDue: 5, archivedNotes: 1, archivedCards: 2 }
      : { lastStudyDay: null, contentsTotal: 0, archivedNotes: 0 };
  }, [alunos, falhar]);
  await page.goto(`http://127.0.0.1:${server.address().port}/${lang}/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 20000 });
  await page.evaluate(([alunos, admin, appKey]) => {
    CURRENT_USER = { id: 'T' }; isAdminUser = () => admin; try { hasPermission = () => true; isTeacherUser = () => true; } catch (e) {}
    const links = alunos.map(a => ({ id: a[0], student_id: 's' + a[0], username: a[1], display_name: a[2], language_app_key: a[3] === 'frances' ? appKey : a[3], status: 'active', created_at: new Date(Date.now() - a[0] * 9e7).toISOString() }));
    fetchMyStudents = async () => links.slice();
    fetchAllProfiles = async () => [{ username: 'novaaluna', display_name: 'Nova Aluna' }, { username: 'marina.alves', display_name: 'Marina Alves' }];
    // Diário de aulas em memória: mesmas funções que o app usa, sem rede (aula em grupo = uma linha por aluno, mesmo created_at).
    const lang = appKey; let nid = 100; const L = (id, sid, d, topic, hw, obs, notes, at) => ({ id, student_id: sid, language_app_key: lang, class_date: d, topic, homework: hw, observations: obs, notes, created_at: at, updated_at: at });
    window.__logs = [
      L(1, 's1', '2026-10-09', 'Passé composé com être', 'Exercícios 4 e 5 da apostila', 'Confunde avoir e être', 'Ótima pronúncia.', '2026-10-09T15:00:00Z'),
      L(2, 's1', '2026-10-02', 'Verbos do 1º grupo', null, null, 'Revisão de vocabulário.', '2026-10-02T15:00:00.100Z'),
      L(3, 's2', '2026-10-02', 'Verbos do 1º grupo', null, null, 'Revisão de vocabulário.', '2026-10-02T15:00:00.400Z'),
      L(4, 's3', '2026-09-20', 'Apresentações', 'Gravar um áudio', null, null, '2026-09-20T15:00:00Z'),
      L(5, 's4', '2026-09-30', 'Números', null, 'Usou o livro azul', null, '2026-09-30T15:00:00Z'),
    ];
    const clean = (o) => ['topic', 'homework', 'observations', 'notes'].map(k => (o[k] || '').trim());
    fetchAllClassLogs = async () => ({ logs: window.__logs.map(x => ({ ...x })), truncated: false });
    fetchClassLogs = async (sid) => window.__logs.filter(x => x.student_id === sid).map(x => ({ ...x }));
    createClassLog = async (o) => { const c = clean(o); if (!c.some(Boolean)) return { ok: false, error: t('teacherLogs.err.needOneField') };
      window.__logs.push({ id: nid++, student_id: o.studentId, language_app_key: o.languageAppKey, class_date: o.classDate, topic: c[0] || null, homework: c[1] || null, observations: c[2] || null, notes: c[3] || null, created_at: new Date().toISOString() }); return { ok: true }; };
    updateClassLog = async (id, o) => { const c = clean(o); if (!c.some(Boolean)) return { ok: false, error: t('teacherLogs.err.needOneField') };
      Object.assign(window.__logs.find(x => x.id === id), { class_date: o.classDate, topic: c[0] || null, homework: c[1] || null, observations: c[2] || null, notes: c[3] || null }); return { ok: true }; };
    deleteClassLog = async (id) => { window.__logs = window.__logs.filter(x => String(x.id) !== String(id)); return { ok: true }; };
    // Material de apoio em memória (envio a várias pessoas = uma linha por aluno, mesmo created_at).
    window.__mats = [
      { id: 1, teacher_id: 'T', student_id: 's1', language_app_key: lang, title: 'Resumo do passé composé', description: 'Leia antes da aula.\nFoque nos verbos com être.', link_url: 'https://exemplo.com/passe-compose', file_url: null, file_name: null, created_at: '2026-10-08T15:00:00Z' },
      { id: 2, teacher_id: 'T', student_id: 's1', language_app_key: lang, title: 'Lista de vocabulário', description: null, link_url: null, file_url: 'https://cdn.exemplo.com/vocab.pdf', file_name: 'vocab.pdf', created_at: '2026-10-02T15:00:00.100Z' },
      { id: 3, teacher_id: 'T', student_id: 's2', language_app_key: lang, title: 'Lista de vocabulário', description: null, link_url: null, file_url: 'https://cdn.exemplo.com/vocab.pdf', file_name: 'vocab.pdf', created_at: '2026-10-02T15:00:00.400Z' },
      { id: 4, teacher_id: 'T', student_id: 's3', language_app_key: lang, title: 'Números de 1 a 100', description: 'Áudio e tabela.', link_url: null, file_url: null, file_name: null, created_at: '2026-09-20T15:00:00Z' },
    ];
    window.__matUploads = [];
    fetchAllSupportMaterials = async () => ({ rows: window.__mats.map(x => ({ ...x })), truncated: false });
    uploadSupportMaterialFile = async (f) => { window.__matUploads.push(f.name); return { ok: true, url: 'https://cdn.exemplo.com/' + encodeURIComponent(f.name), fileName: f.name }; };
    createSupportMaterial = async (o) => { const ti = (o.title || '').trim(), de = (o.description || '').trim(), li = (o.linkUrl || '').trim();
      if (!ti) return { ok: false, error: t('teacherMaterials.err.titleRequired') }; if (!de && !li && !o.fileUrl) return { ok: false, error: t('teacherMaterials.err.needContent') };
      if (li && !isHttpUrl(li)) return { ok: false, error: t('teacherMaterials.err.badLink') };
      window.__mats.push({ id: nid++, teacher_id: 'T', student_id: o.studentId, language_app_key: o.languageAppKey, title: ti, description: de || null, link_url: li || null, file_url: o.fileUrl || null, file_name: o.fileUrl ? o.fileName : null, created_at: new Date().toISOString() }); return { ok: true }; };
    updateSupportMaterial = async (id, o) => { const li = (o.linkUrl || '').trim(); if (!(o.title || '').trim()) return { ok: false, error: t('teacherMaterials.err.titleRequired') }; if (li && !isHttpUrl(li)) return { ok: false, error: t('teacherMaterials.err.badLink') };
      Object.assign(window.__mats.find(x => x.id === id), { title: o.title.trim(), description: (o.description || '').trim() || null, link_url: li || null }); return { ok: true }; };
    deleteSupportMaterial = async (id) => { window.__mats = window.__mats.filter(x => String(x.id) !== String(id)); return { ok: true }; };
    window.__removidos = []; removeStudentLink = async (id) => { window.__removidos.push(id); return { ok: true }; };
    assignStudentToTeacher = async (u, l) => { window.__vinculou = [u, l]; return { ok: true, target: { username: u } }; };
    // Cartões e Decks da professora em memória (mesmas funções que o app usa, sem rede).
    let did = 500, cid = 1000; const iso = (d) => `2026-10-${String(d).padStart(2, '0')}T12:00:00Z`;
    window.__decks = links.map(l => ({ id: did++, owner_id: l.student_id, teacher_id: 'T', kind: 'teacher_root', parent_deck_id: null, name: 'Cartões da professora', language_app_key: l.language_app_key, created_at: iso(1) }));
    const rootOf = (sid) => window.__decks.find(d => d.owner_id === sid && d.kind === 'teacher_root').id;
    const temS1 = links.some(l => l.student_id === 's1');
    if (temS1) window.__decks.push({ id: did++, owner_id: 's1', teacher_id: 'T', kind: 'teacher', parent_deck_id: rootOf('s1'), name: 'Verbos', language_app_key: links.find(l => l.student_id === 's1').language_app_key, created_at: iso(2) });
    const native = (front, back, tags, mode) => { const st = createNativeNoteEditorState({ cardGenerationMode: mode || 'normal', fields: [{ content: { value: front }, lang: 'fr' }, { content: { value: back }, lang: 'pt-BR' }], tags: tags || [] }); return nativeContentColumnsFromEditorState(st); };
    const row = (sid, day, content, deckId, extra) => Object.assign({ id: cid++, teacher_id: 'T', student_id: sid, language_app_key: links.find(l => l.student_id === sid).language_app_key, deck_id: deckId == null ? rootOf(sid) : deckId, status: 'active', revision: 0, created_at: iso(day), image_url: null, audio_url: null }, content, extra || {});
    window.__cards = [];
    if (links.length >= 5){
      window.__cards = [
        row('s1', 9, native('le chat', 'o gato', ['animais', 'a1'])),
        row('s1', 8, native('manger', 'comer', ['verbos'], 'normal_reversed'), window.__decks[window.__decks.length - 1].id, { note: 'verbo do 1º grupo' }),
        row('s2', 8, native('manger', 'comer', ['verbos'], 'normal_reversed')),
        row('s2', 7, { front: 'la maison', back_trans: 'a casa', note: null, choices: null, cloze_sentence: null, cloze_answer: null, fields: null, card_generation_mode: null, front_is_target_language: true, tags: [] }),
        row('s3', 6, native('la porte', 'a porta'), null, { status: 'archived' }),
      ];
      for (let i = 1; i <= 12; i++) window.__cards.push(row('s4', 5, native('mot ' + i, 'palavra ' + i, ['lote'])));
    }
    const clone = (x) => JSON.parse(JSON.stringify(x));
    fetchDecksForLanguage = async (lang) => clone(window.__decks.filter(d => d.language_app_key === lang));
    ensureTeacherDecksForStudent = async (sid, lang) => ({ ok: true, rootDeckId: 1, teacherRootDeckId: rootOf(sid) });
    fetchAllTeacherFlashcards = async () => ({ cards: clone(window.__cards).sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id), truncated: false });
    createFlashcard = async ({ studentId, languageAppKey, nativeState, deckId }) => { const r = row(studentId, 12, nativeContentColumnsFromEditorState(nativeState), deckId); r.language_app_key = languageAppKey; r.created_at = new Date().toISOString(); window.__cards.push(r); return { ok: true, card: r }; };
    updateFlashcardContent = async (id, o) => { const c = window.__cards.find(x => x.id === id); if (o.nativeState) Object.assign(c, { revision: o.revision }, nativeContentColumnsFromEditorState(o.nativeState)); else Object.assign(c, { front: o.front || null, back_trans: o.backTrans, note: o.note || null, revision: o.revision }); return { ok: true }; };
    deleteFlashcardPermanently = async (id) => { window.__cards = window.__cards.filter(c => c.id !== Number(id)); return { ok: true }; };
    setFlashcardStatus = async (id, status) => { window.__cards.find(c => c.id === Number(id)).status = status; return { ok: true }; };
    setTeacherFlashcardDeck = async ({ note, destination }) => { window.__cards.find(c => c.id === note.id).deck_id = destination.id; return { ok: true }; };
    createTeacherDeck = async ({ name, parentDeck }) => { const n = (name || '').trim(); if (!n) return { ok: false, error: 'Dê um nome ao subdeck.' }; const d = { id: did++, owner_id: parentDeck.owner_id, teacher_id: 'T', kind: 'teacher', parent_deck_id: parentDeck.id, name: n, language_app_key: parentDeck.language_app_key, created_at: iso(3) }; window.__decks.push(d); return { ok: true, deck: clone(d) }; };
    deleteTeacherDeck = async ({ deck }) => { window.__decks = window.__decks.filter(d => d.id !== deck.id); return { ok: true }; };
    switchTab('teacher-panel'); switchTeacherPanelSection('students');
  }, [alunos, admin, lang === 'fr' ? 'frances' : 'mandarim']);
  return { page, errors, base: `http://127.0.0.1:${server.address().port}`, close: async () => { await browser.close(); server.close(); } };
}
module.exports = { abrir, ALUNOS };

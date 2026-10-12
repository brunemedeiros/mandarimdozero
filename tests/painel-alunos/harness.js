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
    fetchClassLogs = async (sid) => sid === 's1' ? [{ id: 'l1', student_id: 's1', class_date: '2026-10-09', topic: 'Passé composé com être', homework: 'Ex. 4 e 5', observations: '', notes: '', created_at: new Date().toISOString() }] : [];
    window.__removidos = []; removeStudentLink = async (id) => { window.__removidos.push(id); return { ok: true }; };
    assignStudentToTeacher = async (u, l) => { window.__vinculou = [u, l]; return { ok: true, target: { username: u } }; };
    switchTab('teacher-panel'); switchTeacherPanelSection('students');
  }, [alunos, admin, lang === 'fr' ? 'frances' : 'mandarim']);
  return { page, errors, base: `http://127.0.0.1:${server.address().port}`, close: async () => { await browser.close(); server.close(); } };
}
module.exports = { abrir, ALUNOS };

// Painel do aluno ampliado (070) -- Playwright (Chromium real), FR + ZH, tela
// real "🎓 Alunos" > 📊. Mesmo harness de tests/fase-k6/test_playwright.js: só
// a rede é substituída; a RPC get_teacher_student_overview devolve um objeto no
// MESMO formato validado por tests/painel-alunos/test_rpc.sql.
// Rodar: node tests/painel-alunos/test_playwright.js
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = process.env.SHOT_DIR || null;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
const STUB = `(function(){
  const b = new Proxy({}, { get(_, p){ if (p === 'then') return (ok) => Promise.resolve({ data: [], error: null }).then(ok); return () => b; } });
  const client = { auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: async () => ({}) },
    from: () => b, channel: () => ({ on(){ return this; }, subscribe(){ return this; } }),
    storage: { from: () => ({}) }, functions: { invoke: async () => ({ data: null, error: null }) },
    rpc: async (name, args) => { window.__rpc = (window.__rpc || []); window.__rpc.push(name);
      if (name === 'get_teacher_student_overview') return { data: window.__OV(args.p_student_id, args.p_language_app_key), error: null };
      if (name === 'get_teacher_student_metrics') return { data: { lastStudyDay: null, contentsTotal: 0, archivedNotes: 0 }, error: null };
      return { data: null, error: null }; } };
  window.supabase = { createClient: () => client };
})();`;
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x).slice(0, 600) : ''); } };

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const lang of ['fr', 'zh']){
    for (const scheme of ['light', 'dark']){
      console.log('== ' + lang + ' ' + scheme);
      const appKey = lang === 'fr' ? 'frances' : 'mandarim';
      const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1200, height: 1100 }, colorScheme: scheme });
      const page = await ctx.newPage(); const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
      await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
      await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
      await page.addInitScript((appKey) => {
        const day = n => { const d = new Date(Date.now() - n * 86400000); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
        const firstUnit = appKey === 'frances' ? 'A1-1' : '1';
        const lg = (key, extra) => Object.assign({ key, lastStudyDay: day(0), streak: 6, xp: 450, totalReviews: 30,
          progressSummary: { levelId: 'A1', levelLabel: 'A1', pct: 20 }, unitsCompleted: [firstUnit], unitsStarted: 2,
          checkpoints: {}, activityDays: { [day(0)]: 2, [day(1)]: 1, [day(10)]: 1 }, dailyLessons: { [day(0)]: 1 },
          dictations: [], challengesCompleted: 3, queue: { total: 10, new: 4, learning: 2, review: 4, due: 3, weak: 1 }, ownCardsActive: 5 }, extra || {});
        window.__OV = (student, link) => {
          if (student === 'p1') return { linkedLanguage: 'portugues', languages: [lg('frances')], timeline: [], answers: { allTotal: 0 }, lessonScores: { last30Count: 0 } };
          return { linkedLanguage: link, languages: [lg(appKey)],
            timeline: [{ at: new Date().toISOString(), type: 'lesson_complete', name: 'vocab_lesson', lang: appKey, meta: { unitId: firstUnit, scorePct: 90 } },
                       { at: new Date(Date.now() - 3600e3).toISOString(), type: 'tab_switch', name: 'review', lang: appKey, meta: {} }],
            answers: { allTotal: 20, last7Total: 10, last7Correct: 8, last30Total: 20, last30Correct: 15 },
            lessonScores: { last30Count: 3, last30AvgPct: 85 } };
        };
      }, appKey);
      await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
      await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
      const L = (n, c, x) => check(`${lang}/${scheme} ${n}`, c, x);
      await page.evaluate((appKey) => {
        CURRENT_USER = { id: 'T' }; isAdminUser = () => true;
        fetchMyStudents = async () => [
          { id: 1, student_id: 's1', username: 'al1', display_name: 'Aluno 1', language_app_key: appKey, status: 'active', created_at: new Date().toISOString() },
          { id: 2, student_id: 'p1', username: 'al2', display_name: 'Aluno PT', language_app_key: 'portugues', status: 'active', created_at: new Date().toISOString() }];
        fetchAllProfiles = async () => [];
        switchTab('admin-badges'); switchAdminPanelSection('students');
      }, appKey);
      await page.waitForSelector('[data-toggle-metrics]');
      const open = async (n) => { await page.click(`[data-toggle-metrics="${n}"]`); await page.waitForFunction((n) => { const t = document.getElementById('metrics-link-' + n).textContent; return t && !t.includes('Carregando'); }, n); return page.evaluate((n) => document.getElementById('metrics-link-' + n).innerText, n); };

      const t1 = await open(1);
      L('resumo: último estudo hoje, sequência, XP', t1.includes('Último estudo: hoje') && t1.includes('🔥 6') && t1.includes('450'), t1);
      L('resumo: dias ativos 7 = 2', t1.includes('2 nos últimos 7'), t1);
      L('resumo: fila e cartões próprios', t1.includes('3 devidos') && t1.includes('Cartões próprios do aluno: 5'), t1);
      L('0 cartões da professora ainda mostra última atividade', t1.includes('Última atividade geral da conta') && t1.includes('ainda não criou nenhum cartão'), t1);
      L('detalhes fechados por padrão', !t1.includes('Abriu a aba Revisão'), t1);
      // abrir todos os <details> (clique real em cada summary)
      const n = await page.$$eval('#metrics-link-1 summary', s => s.length);
      for (let i = 0; i < n; i++) await page.click(`#metrics-link-1 details:nth-of-type(${i + 1}) > summary`).catch(() => {});
      await page.$$eval('#metrics-link-1 details', ds => ds.forEach(d => { d.open = true; }));
      const t1b = await page.evaluate(() => document.getElementById('metrics-link-1').innerText);
      L('detalhes: linha do tempo', t1b.includes('Abriu a aba Revisão') && t1b.includes('Concluiu lição da trilha'), t1b);
      L('detalhes: unidade com título do site', lang === 'fr' ? t1b.includes('A1-1 · Cumprimentar') : /1 · /.test(t1b), t1b);
      L('detalhes: acertos 80% (7 dias)', t1b.includes('80%') && t1b.includes('85%'), t1b);
      L('2 RPCs na 1ª abertura', (await page.evaluate(() => window.__rpc.filter(x => x.startsWith('get_teacher_student_')).length)) === 2);
      if (OUT) await page.screenshot({ path: path.join(OUT, `painel-${lang}-${scheme}.png`), fullPage: false, clip: await page.$eval('#metrics-link-1', el => { const r = el.getBoundingClientRect(); return { x: Math.max(0, r.x - 10), y: Math.max(0, r.y - 60), width: Math.min(900, r.width + 20), height: Math.min(1000, r.height + 80) }; }) });

      const t2 = await open(2);
      L('vínculo portugues: nota + dados do francês', t2.includes('Sem progresso em Português') && t2.includes('estudando no site de Francês') && t2.includes('450'), t2);
      const t2raw = await page.evaluate(() => document.getElementById('metrics-link-2').textContent); // <details> fechado
      L('sem acertos ainda: data de início', t2raw.includes('começa a ser registrado'), t2raw);
      L('nenhum erro de página', errors.length === 0, errors);
      await ctx.close();
    }
  }
  await browser.close(); server.close();
  console.log(`${passed} ok, ${failed} falhas`); process.exit(failed ? 1 : 0);
})();

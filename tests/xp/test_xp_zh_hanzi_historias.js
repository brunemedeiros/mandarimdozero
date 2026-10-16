// Rodar: node tests/xp/test_xp_zh_hanzi_historias.js
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
// Cliente falso do Supabase com a tabela `progress` em memória (select/eq/maybeSingle/upsert); o resto devolve vazio.
const STUB = `(function(){
  const db = window.__db = { progress: null, weekly: [] };
  const empty = new Proxy({}, { get(_, p){ if (p === 'then') return (ok) => Promise.resolve({ data: [], error: null }).then(ok); return () => empty; } });
  function from(table){
    if (table === 'progress'){
      const q = { select(){ return q; }, eq(){ return q; },
        async maybeSingle(){ return { data: db.progress ? { data: JSON.parse(JSON.stringify(db.progress)) } : null, error: null }; },
        async upsert(p){ db.progress = JSON.parse(JSON.stringify(p.data)); return { error: null }; } };
      return q;
    }
    return empty;
  }
  const client = { auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: async () => ({}) },
    from, channel: () => ({ on(){ return this; }, subscribe(){ return this; } }),
    storage: { from: () => ({}) }, functions: { invoke: async () => ({ data: null, error: null }) }, rpc: async () => ({ data: null, error: null }) };
  window.supabase = { createClient: () => client };
})();`;
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x).slice(0, 400) : ''); } };
// XP de hanzi e histórias no app zh real: valores novos e trava de repetição (lição/história concluída não paga de novo).
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const ctx = await browser.newContext({ serviceWorkers: 'block' });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
  await page.goto(`http://127.0.0.1:${port}/zh/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && CURRENT_USER === false && typeof openStory === 'function' && typeof openHanziLesson === 'function', null, { timeout: 20000 });

  const consts = await page.evaluate(() => [HANZI_WRITE_XP, HANZI_TEST_XP, LESSON_CLOSE_XP, STORY_QUESTION_XP, STORY_DONE_XP]);
  check('constantes: escrita 2, teste 1, lição 4, pergunta 1, história 20', JSON.stringify(consts) === '[2,1,4,1,20]', consts);

  // ---- teste de hanzi: 1ª vez paga 1 por acerto; lição concluída paga 0 ----
  async function hanziTest(completed){
    return page.evaluate((completed) => {
      STATE.hanziLessonProgress[0].unlocked = true; STATE.hanziLessonProgress[0].completed = completed;
      openHanziLesson(0);
      HANZI_STUDY_STATE.charIndex = currentHanziLesson().length - 1; advanceHanziAfterWrite(); // monta o teste
      const x0 = STATE.xp; const item = HANZI_STUDY_STATE.testQueue[0];
      const btn = document.querySelectorAll('.exercise-option')[item.options.indexOf(item.char)];
      btn.click();
      return { gained: STATE.xp - x0, already: hanziLessonAlreadyCompleted() };
    }, completed);
  }
  const h1 = await hanziTest(false), h2 = await hanziTest(true);
  check('hanzi teste, 1ª vez: +1', h1.gained === 1 && !h1.already, h1);
  check('hanzi teste, lição concluída: +0', h2.gained === 0 && h2.already, h2);

  // ---- concluir lição de hanzi: +4 só na 1ª vez ----
  const hc = await page.evaluate(() => {
    STATE.hanziLessonProgress[1].completed = false;
    const a = STATE.xp; markHanziLessonCompleted(1); const b = STATE.xp; markHanziLessonCompleted(1);
    return [b - a, STATE.xp - b];
  });
  check('concluir lição de hanzi: +4, depois +0', JSON.stringify(hc) === '[4,0]', hc);

  // ---- história: pergunta certa +1 na 1ª vez e +0 depois de concluída; concluir +20 uma vez ----
  async function story(completed){
    return page.evaluate((completed) => {
      const s = STORIES[0]; STATE.storyProgress[s.id] = completed ? { completed: true } : undefined;
      if (!completed) delete STATE.storyProgress[s.id];
      openStory(s.id);
      const x0 = STATE.xp; let answered = 0, guard = 0;
      while (guard++ < 40){
        const opt = document.querySelector('.story-question-option:not(.disabled)');
        if (opt){
          const prompt = document.querySelector('.story-question:last-of-type .story-question-prompt')?.innerHTML;
          const beat = s.beats.find(b => b.question && b.question.prompt === prompt) || s.beats.filter(b => b.question)[answered];
          document.querySelectorAll('.story-question-option:not(.disabled)')[beat.question.correctIndex].click(); answered++;
          continue;
        }
        const fin = document.getElementById('story-finish-btn');
        if (fin){ fin.click(); break; }
        const next = [...document.querySelectorAll('.story-continue-btn')].pop();
        if (!next || next.disabled) break;
        const before = document.getElementById('story-wrap').style.display;
        next.click();
        if (document.getElementById('story-wrap').style.display === 'none') break;
      }
      return { answered, gained: STATE.xp - x0 };
    }, completed);
  }
  const s1 = await story(false), s2 = await story(true);
  check('história, 1ª vez: perguntas certas (3 x 1) + concluir 20 = 23', s1.answered === 3 && s1.gained === 23, s1);
  check('história já concluída: +0', s2.answered === 3 && s2.gained === 0, s2);
  // escrita de hanzi depende da biblioteca Hanzi Writer (CDN, bloqueada no teste): confere o código
  const zhSrc = require('fs').readFileSync(path.join(ROOT, 'zh', 'app.js'), 'utf8');
  check('escrita de hanzi: usa HANZI_WRITE_XP e a trava de lição concluída', /if \(!hanziLessonAlreadyCompleted\(\)\) addXP\(HANZI_WRITE_XP\)/.test(zhSrc));
  check('zh: sem addXP(3), addXP(5) ou addXP(20) soltos', !/addXP\((3|5|20)\)/.test(zhSrc));
  check('sem pageerror', errs.length === 0, errs);
  await browser.close(); server.close();
  console.log(`xp zh (hanzi e histórias): ${passed}/${passed + failed}`);
  process.exit(failed ? 1 : 0);
})();

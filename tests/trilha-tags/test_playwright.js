// Trilha tags + "Na frase" -- Playwright (adaptado do harness K2-E) (Chromium real), FR + ZH, modo convidado com o
// Supabase do CDN substituído por um stub em memória (o proxy do sandbox
// bloqueia o CDN). "Autenticado" é simulado setando CURRENT_USER após o
// boot (o stub de rpc/select respeita o mesmo contrato da migration 051/052).
// Rodar: node tests/fase-e/test_playwright.js   (usa o playwright global)
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
  window.__DB = { decks: [] };
  window.__rpcCalls = [];
  window.__AUTH = false; // muda pra true = "conta autenticada" no stub
  function builder(table){
    const st = { table, filters: [] };
    const b = new Proxy({}, { get(_, prop){
      if (prop === 'then') return (ok) => {
        let data = [];
        if (table === 'decks'){
          data = window.__DB.decks.filter(d => st.filters.every(([k, v]) => d[k] === v));
          // RLS simulada: convidado/autenticado só veem kind=course (decks_course_select)
          data = data.filter(d => d.kind === 'course');
        }
        return Promise.resolve({ data, error: null }).then(ok);
      };
      if (prop === 'eq') return (k, v) => { st.filters.push([k, v]); return b; };
      if (prop === 'single' || prop === 'maybeSingle') return () => Promise.resolve({ data: null, error: null });
      return () => b;
    }});
    return b;
  }
  const client = {
    auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: async () => ({}) },
    from: builder,
    rpc: async (name, args) => {
      window.__rpcCalls.push({ name, args });
      if (name === 'ensure_course_decks'){
        if (!window.__AUTH) return { data: null, error: { message: 'permission denied for function ensure_course_decks' } };
        const lang = args.p_language_app_key, D = window.__DB.decks;
        let root = D.find(d => d.kind === 'course' && d.language_app_key === lang && d.course_unit_id == null);
        if (!root){ root = { id: 1000 + D.length, kind: 'course', name: lang, language_app_key: lang, course_unit_id: null, parent_deck_id: null, owner_id: null, teacher_id: null, is_public: false }; D.push(root); }
        args.p_units.forEach(u => { if (!D.find(d => d.kind === 'course' && d.language_app_key === lang && d.course_unit_id === u.unit_id))
          D.push({ id: 1000 + D.length, kind: 'course', name: u.title, language_app_key: lang, course_unit_id: u.unit_id, parent_deck_id: root.id, owner_id: null, teacher_id: null, is_public: false }); });
        return { data: D.filter(d => d.kind === 'course' && d.language_app_key === lang), error: null };
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
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1200, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  // a última rota registrada tem precedência: bloqueia externos primeiro, stub do CDN depois
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
  await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
  if (process.env.DBG) console.log('url', page.url());
  page.on('console', m => { if (process.env.DBG) console.log('console:', m.text().slice(0,200)); });
  try {
    await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
  } catch (e) {
    console.log('boot falhou; erros:', errors, 'estado:', await page.evaluate(() => ({ st: typeof STATE, cu: typeof CURRENT_USER !== 'undefined' ? CURRENT_USER : 'undef', guest: sessionStorage.getItem('guest_mode'), login: document.getElementById('login-screen') && document.getElementById('login-screen').style.display })));
    throw e;
  }
  return { page, errors, ctx };
}




(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const lang of ['fr', 'zh']){
    console.log('== ' + lang);
    const course = lang === 'fr' ? 'frances-geral' : 'mandarim-geral';
    const { page, errors } = await bootPage(browser, lang, port);
    const ev = (fn, arg) => page.evaluate(fn, arg);
    const info = await ev(() => {
      const c = STATE.cards.find(x => x.origin === 'study');
      return { tags: c.tags, phrases: STATE.cards.filter(x => isStudyTrailPhraseCard(x)).length };
    });
    check(lang + ' boot: card da trilha com tags automáticas', ['estudo', course, 'palavra'].every(t => info.tags.includes(t)), info.tags);
    check(lang + ' boot: cartões "Na frase" existem (1 por frase de exemplo)', info.phrases > 0, info.phrases);
    // libera todas as unidades e abre o painel de configurar sessão
    await ev(() => { UNITS.forEach(x => { STATE.unitProgress[x.id] = { started: true, completed: true, lessonIdx: 99, lessonMisses: {} }; }); switchTab('review'); renderReviewSettingsView(); });
    const chips = await ev(() => [...document.querySelectorAll('#review-tag-chips [data-review-tag]')].map(b => b.dataset.reviewTag));
    check(lang + ' chips aparecem com tags grossas da trilha', chips.includes('estudo') && chips.includes(course), chips);
    check(lang + ' chips sem unidade-*/licao-*/palavra (sem poluição)', !chips.some(t => /^unidade-|^licao-/.test(t) || t === 'palavra'), chips);
    check(lang + ' chips: poucos', chips.length > 0 && chips.length <= 12, chips.length);
    // clique real num chip -> filtro ativo
    const tagToClick = lang === 'fr' ? 'modulo-1' : course;
    await ev(t => document.querySelector(`#review-tag-chips [data-review-tag="${t}"]`).click(), tagToClick);
    const r = await ev(t => ({ filt: STATE.studySettings.reviewTagFilter, pool: eligibleReviewPool().length, all: STATE.cards.filter(isCardLessonCompleted).length,
      allHave: eligibleReviewPool().every(c => c.tags.includes(t)) }), tagToClick);
    check(lang + ' clique no chip ativa filtro', JSON.stringify(r.filt) === JSON.stringify([tagToClick]), r.filt);
    check(lang + ' pool filtrado só com cards da tag', r.pool > 0 && r.allHave && (lang === 'zh' ? r.pool === r.all : r.pool < r.all), r);
    await ev(() => document.getElementById("review-tag-clear").click());
    const cleared = await ev(() => ({ f: STATE.studySettings.reviewTagFilter, n: eligibleReviewPool().length, all: STATE.cards.filter(isCardLessonCompleted).length }));
    check(lang + ' limpar volta a tudo', cleared.f.length === 0 && cleared.n === cleared.all, cleared);
    // filtro por unidade (seleção programática) funciona
    const unitF = await ev(() => {
      const c = STATE.cards.find(x => x.origin === 'study');
      const ut = c.tags.find(t => t.startsWith('unidade-'));
      updateStudySetting({ reviewTagFilter: [ut] });
      const pool = eligibleReviewPool();
      const out = { n: pool.length, same: pool.every(x => x.unitId === c.unitId), chipShown: !!document.querySelector(`#review-tag-chips [data-review-tag="${ut}"]`) };
      updateStudySetting({ reviewTagFilter: [] });
      return out;
    });
    check(lang + ' filtro por unidade-*: só a unidade, chip selecionado continua visível', unitF.n > 0 && unitF.same && unitF.chipShown, unitF);
    // "Na frase": cartão de frase de exemplo já existe para toda frase usada
    const ph = await ev(() => {
      const p = STATE.cards.find(c => isStudyTrailPhraseCard(c));
      const u = UNITS.find(x => x.id === p.unitId);
      const groups = studyWordGroups(STATE.cards.filter(c => c.unitId === u.id)).length;
      const speedPool = projectStudyWordsToA(eligibleReviewPool()).includes(p);
      updateStudySetting({ reviewTagFilter: ['na-frase'] });
      const naFrase = eligibleReviewPool().map(c => c.id);
      updateStudySetting({ reviewTagFilter: [] });
      const tags = p && p.tags;
      // revisão real do card de frase
      STATE.reviewQueue = [p]; STATE.reviewIndex = 0; STATE.reviewCardState = null; switchTab('review'); renderReviewView();
      const html = document.getElementById('review-content').innerText;
      return { ok: !!p, tags, groups, words: u.vocab.length, speedPool, naFrase, html: html.slice(0, 200), front: lang => 0 };
    });
    check(lang + ' cartão de frase existe', ph.ok);
    check(lang + ' tags da frase: na-frase sem palavra', ph.tags.includes('na-frase') && !ph.tags.includes('palavra'), ph.tags);
    check(lang + ' studyWordGroups ignora a frase', ph.groups === ph.words, ph);
    check(lang + ' Speed/Combinar não recebem a frase', ph.speedPool === false);
    check(lang + ' filtro na-frase -> só cartões de frase', ph.naFrase.length > 1 && ph.naFrase.every(id => /-[pd]\d+$/.test(id)), ph.naFrase.length);
    check(lang + ' card de frase renderiza na Revisão', ph.html.length > 0, ph.html);
    check(lang + ' sem pageerror', errors.length === 0, errors);
  }
  await browser.close(); server.close();
  console.log(`Trilha tags playwright: ${passed}/${passed + failed} verificações` + (failed ? ` — ${failed} FALHAS` : ' — OK'));
  process.exit(failed ? 1 : 0);
})();

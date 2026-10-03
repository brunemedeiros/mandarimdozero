// K.5 -- Playwright: contagens de Deck na UI real (Meus Decks / Cartões da professora), FR+ZH.
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
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
  await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
  return { page, errors, ctx };
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const lang of ['fr', 'zh']){
    console.log('== ' + lang);
    const { page, errors } = await bootPage(browser, lang, port);
    const ev = (fn, arg) => page.evaluate(fn, arg);
    const r = await ev(() => {
      const A = APP_KEY, NOW = Date.now(), DAY = 86400e3;
      CURRENT_USER = { id: 'u-k5' };
      const D = (id, parent, kind, extra) => Object.assign({ id, parent_deck_id: parent, kind, name: 'D' + id, owner_id: 'u-k5', language_app_key: A }, extra || {});
      STATE.decks = [D(1, null, 'personal_root'), D(2, 1, 'personal', { name: 'Pai' }), D(4, 2, 'personal', { name: 'Filho' }),
        D(10, null, 'teacher_root', { teacher_id: 't'}), D(11, 10, 'teacher', { teacher_id: 't', name: 'T1' })];
      const mk = (id, o, deckId, row, extra) => Object.assign({ id, origin: o, deckId, rowId: row, unitId: null, vocabIdx: null, flashcardStatus: 'active', reps: 0, state: 'new', due: 0, interval: 0, lapses: 0, stability: 0, difficulty: 0 }, extra || {});
      const rv = (extra) => Object.assign({ reps: 3, state: 'review', interval: 10, due: NOW - DAY }, extra);
      STATE.cards = STATE.cards.filter(c => c.origin === 'study').concat([
        mk('s1', 'self', 2, 1, rv()), mk('s1-b', 'self', 2, 1),                        // Reverse no Pai: review devido + New
        mk('s2-c1', 'self', 4, 2, rv({ due: NOW + 5 * DAY })), mk('s2-c2', 'self', 4, 2), mk('s2-c3', 'self', 4, 2, { reps: 1, state: 'learning', due: NOW - 1000 }),
        mk('s9', 'self', 4, 9, rv({ flashcardStatus: 'archived' })),                   // arquivado: fora
        mk('t1', 'teacher', 11, 1, rv()), mk('t1-b', 'teacher', 11, 1)]);
      const host = document.createElement('div'); host.id = 'k5-host'; document.body.appendChild(host);
      host.innerHTML = '<div id="pl">' + personalDecksListHTML(STATE.decks) + '</div><div id="tl">' + teacherDecksReadOnlyHTML(STATE.decks) + '</div>';
      const txt = sel => (host.querySelector(sel) || {}).innerText && host.querySelector(sel).innerText.replace(/\s+/g, ' ');
      return { pai: txt('[data-personal-deck-row="2"]'), filho: txt('[data-personal-deck-row="4"]'), raiz: txt('[data-personal-deck-row="1"]'), prof: txt('[data-teacher-deck-row="11"]'),
        btnFilho: !host.querySelector('[data-personal-deck-row="4"] [data-study-deck]').disabled,
        sum: deckReviewSummary(2), sumFilho: deckReviewSummary(4) };
    });
    // Pai agrega o Filho: s1,s1-b (2) + s2-c1..c3 (3) = 5 elegíveis (arquivado fora)
    check(lang + ' lista: Pai = 5 cartões (agrega Filho, arquivado fora)', /\(5 cartões ·/.test(r.pai), r.pai);
    check(lang + ' lista: Pai 2 novos · 1 aprendendo · 2 para revisar · 2 devidos', /2 novos · 1 aprendendo · 2 para revisar · 2 devidos/.test(r.pai), r.pai);
    check(lang + ' lista: Filho = 3 cartões, 1 devido (Review futuro e New não são devidos)', /\(3 cartões · 1 novos · 1 aprendendo · 1 para revisar · 1 devidos/.test(r.filho), r.filho);
    check(lang + ' lista: raiz pessoal = 5 (sem Teacher)', /\(5 cartões/.test(r.raiz), r.raiz);
    check(lang + ' Teacher Deck: só Teacher (2 cartões, 1 novo, 1 para revisar, 1 devido)', /\(2 cartões · 1 novos · 0 aprendendo · 1 para revisar · 1 devidos/.test(r.prof), r.prof);
    check(lang + ' botão "Estudar este Deck" habilitado', r.btnFilho === true);
    check(lang + ' deckReviewSummary: total inclui arquivado, elegíveis não; due presente', r.sum.totalCards === 6 && r.sum.eligibleCards === 5 && r.sum.archivedCards === 1 && r.sum.due === 2, r.sum);
    // Estudar este Deck: sessão usa o mesmo universo da contagem do Deck (elegível, subárvore)
    const s = await ev(() => { const sc = getStudyScopeForDeck(STATE.decks, 2, eligibleDeckReviewPool()); return { q: sc.map(c => c.id).sort(), n: deckCountsForReview(2).total }; });
    check(lang + ' Estudar este Deck usa o MESMO universo da contagem (5 cartões, sem Teacher/arquivado)', s.q.length === 5 && s.n === 5 && s.q.every(id => /^s/.test(id)) && !s.q.includes('s9'), s);
    check(lang + ' sem erro de página', errors.length === 0, errors);
  }
  await browser.close(); server.close();
  console.log(`K.5 playwright: ${passed}/${passed + failed} verificações — ${failed ? 'FALHOU' : 'OK'}`);
  process.exit(failed ? 1 : 0);
})();

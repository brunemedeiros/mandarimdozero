// K2-D -- Playwright (Chromium real), FR + ZH, modo convidado com o
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
    const { page, errors } = await bootPage(browser, lang, port);
    const ev = (fn, arg) => page.evaluate(fn, arg);
    const isZh = lang === 'zh';
    const setup = await ev(() => {
      UNITS.forEach(x => { STATE.unitProgress[x.id] = { started: true, completed: true, lessonIdx: 99, lessonMisses: {} }; });
      STATE.studySettings.newCardsPerDay = 1000; STATE.studySettings.sessionIntensity = 'all';
      const u = UNITS.find(x => x.type !== 'grammar' && x.vocab.length), v = u.vocab[0];
      window.__speak = [];
      const name = APP_KEY === 'mandarim' ? 'speakChinese' : 'speakFrench';
      window[name] = (t) => { window.__speak.push(t); };
      try { eval(name + ' = window.' + name); } catch (e) {}
      // teacher/self nativos (Normal com reverso)
      const fld = (id, l, val, x) => Object.assign({ id, lang: l, role: null, content: { value: val }, audio: null, image: null, pinyinFieldId: null }, x || {});
      const ST = APP_KEY === 'mandarim' ? '你好' : 'bonjour';
      const f2 = () => APP_KEY === 'mandarim' ? [fld('h', 'zh', ST, { pinyinFieldId: 'p' }), fld('p', 'zh-pinyin', 'nǐ hǎo'), fld('t', 'pt-BR', 'olá')] : [fld('s', 'fr', ST), fld('t', 'pt-BR', 'olá')];
      const mk = (fn, id) => fn({ id, language_app_key: APP_KEY, fields: f2(), card_generation_mode: 'normal_reversed', status: 'active', revision: 0, tags: [] });
      STATE.cards.push(...mk(buildCardFromTeacherFlashcard, 901), ...mk(buildCardFromSelfFlashcard, 902));
      return { uid: u.id, study: APP_KEY === 'mandarim' ? v.c : v.f, trans: v.t, pinyin: v.p || null, ST };
    });
    const ids = { studyA: `u${setup.uid}-v0`, studyB: `u${setup.uid}-v0-b`, tA: 't901', tB: 't901-b', sA: 's902', sB: 's902-b' };
    const renderOne = (id, poison, reveal) => ev(([id, poison, reveal]) => {
      const c = STATE.cards.find(x => x.id === id);
      ['lastDirection', 'reviewDirection', 'nextCardDirection'].forEach(k => { if (poison) c[k] = poison; else delete c[k]; });
      STATE.reviewQueue = [c]; STATE.reviewIndex = 0; STATE.reviewCardState = null; window.__speak.length = 0;
      switchTab('review'); renderReviewView();
      const before = { html: document.getElementById('review-content').innerHTML, speak: window.__speak.slice() };
      let after = null;
      if (reveal){ document.getElementById('flashcard').click(); after = { html: document.getElementById('review-content').innerHTML, speak: window.__speak.slice() }; }
      return { before, after, text: document.getElementById('flashcard').innerText };
    }, [id, poison, reveal]);
    for (const [label, id] of Object.entries(ids)){
      const clean = await renderOne(id, null, true), p1 = await renderOne(id, 'back-to-front', true), p2 = await renderOne(id, 'front-to-back', true);
      check(lang + ' ' + label + ': renderer idêntico com/sem poison (nenhuma variável de direção influencia)', clean.before.html === p1.before.html && clean.after.html === p1.after.html && clean.before.html === p2.before.html && clean.after.html === p2.after.html);
      const isB = label.endsWith('B');
      const frontHasStudy = await ev(([id, st]) => { const c = STATE.cards.find(x => x.id === id); STATE.reviewQueue = [c]; STATE.reviewIndex = 0; STATE.reviewCardState = null; renderReviewView(); return document.getElementById('flashcard').innerText.includes(st); }, [id, label.startsWith('study') ? setup.study : setup.ST]);
      check(lang + ' ' + label + ': ' + (isB ? 'B → frente = tradução' : 'A → frente = idioma estudado'), isB ? !frontHasStudy : frontHasStudy);
      check(lang + ' ' + label + ': verso revelado contém o outro lado', isB ? clean.after.html.includes(label.startsWith('study') ? setup.study : setup.ST) : clean.after.html.includes(label.startsWith('study') ? setup.trans : 'olá'));
      // autoplay: A toca ao entrar; B só depois de revelar
      check(lang + ' ' + label + ': autoplay ' + (isB ? 'só após revelar' : 'ao entrar'), isB ? (clean.before.speak.length === 0 && clean.after.speak.length === 1) : (clean.before.speak.length === 1), [clean.before.speak, clean.after && clean.after.speak]);
      if (isZh && label.startsWith('study')){
        check('zh ' + label + ': pinyin acompanha o hanzi (lado do hanzi)', clean.after.html.includes(setup.pinyin));
      }
    }
    // sessão/grade não escrevem direção em nenhum card
    const w = await ev(async () => {
      STATE.cards.forEach(c => { delete c.lastDirection; delete c.reviewDirection; });
      startReviewSession();
      const afterStart = STATE.cards.some(c => 'lastDirection' in c || 'reviewDirection' in c);
      const first = STATE.reviewQueue[0]; document.getElementById('flashcard').click();
      gradeCurrentCard(2);
      const afterGrade = STATE.cards.some(c => 'lastDirection' in c || 'reviewDirection' in c);
      const saved = JSON.stringify(serializeState()).match(/lastDirection|reviewDirection/g);
      return { afterStart, afterGrade, saved, reps: first && first.reps };
    });
    check(lang + ' startReviewSession não cria direção em nenhum card', w.afterStart === false);
    check(lang + ' gradeCurrentCard não grava lastDirection; o grau foi aplicado ao CardInstance', w.afterGrade === false && w.reps >= 1, w);
    check(lang + ' save serializado sem direção', !w.saved, w.saved);
    check(lang + ' sem pageerror', errors.length === 0, errors);
  }
  await browser.close(); server.close();
  console.log(`K2-G playwright: ${passed}/${passed + failed} verificações` + (failed ? ` — ${failed} FALHAS` : ' — OK'));
  process.exit(failed ? 1 : 0);
})();

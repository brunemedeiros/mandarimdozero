// K2-I -- alcançabilidade dos branches legados (!card.cardInstance) (Playwright real, FR+ZH). Base: harness da Fase K1. Harness da Fase H: Playwright (Chromium real), FR + ZH, modo convidado com o
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
    const { page, errors, ctx } = await bootPage(browser, lang, port);
    const ev = (fn, arg) => page.evaluate(fn, arg);
    // Instrumenta os 3 helpers: registra QUALQUER chamada com objeto sem cardInstance
    // (pseudo-opções de múltipla escolha {displayAnswerText} são o único caso sem cardInstance esperado).
    await ev(() => {
      window.__hits = { legacy: [], pseudo: 0, total: 0 };
      for (const name of ['hasPlainFrontBack', 'cardPromptText', 'cardAnswerText', 'cardPromptPinyinText']){
        if (typeof window[name] !== 'function') continue;
        const orig = window[name];
        window[name] = function(c){
          window.__hits.total++;
          if (c && !c.cardInstance){
            if ('displayAnswerText' in c) window.__hits.pseudo++;
            else window.__hits.legacy.push(name + ':' + (c && c.id));
          }
          return orig.apply(this, arguments);
        };
      }
      isCardLessonCompleted = () => true; // amplia o alcance: toda origem elegível
    });
    const setup = await ev(async () => {
      const A = APP_KEY, L = A === 'frances' ? 'fr' : 'zh';
      const fld = (id, lg, v) => ({ id, lang: lg, role: null, content: { value: v }, audio: null, image: null, pinyinFieldId: null });
      const mk = (id, extra) => Object.assign({ id, language_app_key: A, status: 'active', revision: 0, front: 'f' + id, back_trans: 'b' + id, front_is_target_language: true, tags: [], owner_id: 'u-i' }, extra);
      CURRENT_USER = { id: 'u-i' }; STATE.decksLoaded = true; STATE.courseDecksLoaded = true;
      STATE.decks = [{ id: 8000, kind: 'personal_root', name: 'R', owner_id: 'u-i', language_app_key: A, parent_deck_id: null }];
      const rows = [
        mk(1, { deck_id: 8000 }),                                   // legado (linha sem fields)
        mk(2, { deck_id: 8000, front_is_target_language: false }),  // legado invertido
        mk(3, { deck_id: 8000, fields: [fld('a', L, 'x'), fld('b', 'pt-BR', 'y')], card_generation_mode: 'normal_reversed', front: 'x', back_trans: 'y' }),
        mk(4, { deck_id: 8000, fields: [fld('a', L, 'p'), fld('b', 'pt-BR', 'q')], card_generation_mode: 'type_answer', front: 'p', back_trans: 'q' }),
        mk(5, { deck_id: 8000, fields: [fld('a', L, '{{c1::um}} e {{c2::dois}}'), fld('b', 'pt-BR', 'tr')], card_generation_mode: 'cloze', front: null, back_trans: 'tr' }),
        mk(6, { deck_id: 8000, choices: ['w1', 'w2'] }),            // múltipla escolha legada
      ];
      const self = rows.flatMap(r => buildCardFromSelfFlashcard(r));
      const teach = buildCardFromTeacherFlashcard(Object.assign(mk(7, { teacher_id: 't', student_id: 'u-i' }), {}));
      STATE.cards = STATE.cards.concat(self, teach);
      const all = STATE.cards;
      return { n: all.length, noCI: all.filter(c => !c.cardInstance).length, types: [...new Set(all.map(c => c.cardInstance.cardTypeId))], origins: [...new Set(all.map(c => c.origin))] };
    });
    check(lang + ' TODO card de STATE.cards (study/self/teacher, legado+nativo) tem cardInstance', setup.noCI === 0 && setup.n > 100, setup);
    check(lang + ' 5 Card Types presentes', ['normal', 'multiple_choice', 'type_answer', 'cloze'].every(t => setup.types.includes(t)), setup.types);

    const flows = await ev(async () => {
      STATE.studySettings.newCardsPerDay = 500; STATE.studySettings.sessionIntensity = 'intense';
      const out = {};
      // Review geral
      startReviewSession(); out.review = STATE.reviewQueue.length;
      // Deck
      await startDeckReviewSession(8000); out.deck = STATE.reviewQueue.length;
      // Speed: fila + opções de todos os cards
      const sq = buildSpeedQueue(); out.speedQ = sq.length;
      sq.forEach(c => { buildSpeedOptions(c).forEach(o => cardAnswerText(o)); cardPromptText(c); cardAnswerText(c); });
      STATE.cards.filter(c => c.cardInstance.cardTypeId === 'multiple_choice').forEach(c => buildSpeedOptions(c).forEach(o => cardAnswerText(o)));
      // Combinar
      startMatchGame(); out.match = MATCH_STATE.pairs.length;
      // Reports: Review + Speed
      switchTab('review'); STATE.reviewQueue = STATE.cards.filter(c => c.cardInstance).slice(0, 5); STATE.reviewIndex = 0;
      document.getElementById('review-session-wrap').style.display = 'block'; document.getElementById('review-content').style.display = 'block';
      try { captureReportContext({}); } catch (e) { out.reportErr = String(e); }
      // Anki export
      const M = { front: null, back: null }; const cfg = ANKI_EXPORT_CONFIG; const ac = cfg.cards('all'); out.anki = ac.length;
      ac.forEach(c => { cfg.sortField(c); if (c.cardInstance.cardTypeId === 'cloze') cfg.clozeFields(c, M); else { cfg.noteFields(c, M); if (cfg.reverseFields) cfg.reverseFields(c, M); } });
      return out;
    });
    check(lang + ' fluxos exercitados (Review, Deck, Speed, Combinar, Report, Anki)', flows.review > 0 && flows.deck > 0 && flows.speedQ > 0 && flows.match > 0 && flows.anki > 0 && !flows.reportErr, flows);
    const hits = await ev(() => window.__hits);
    check(lang + ' helpers chamados (instrumentação viva)', hits.total > 50, hits);
    check(lang + ' NENHUMA chamada dos helpers com objeto sem cardInstance (exceto pseudo-opções MC)', hits.legacy.length === 0, hits.legacy.slice(0, 5));
    check(lang + ' pseudo-opções MC (displayAnswerText) exercitadas', hits.pseudo > 0, hits);
    // Fronteira: card nativo nunca usa campos legados soltos
    const b = await ev(() => { const c = STATE.cards.find(x => x.origin === 'study'); return { hasFront: 'front' in c, hasBackHanzi: 'back_hanzi' in c, prompt: cardPromptText(c), answer: cardAnswerText(c), ok: hasPlainFrontBack(c) }; });
    check(lang + ' card da trilha: sem campos soltos front/back_hanzi; texto vem do CardInstance', !b.hasFront && !b.hasBackHanzi && b.prompt && b.answer && b.ok === true, b);
    check(lang + ' sem pageerror', errors.length === 0, errors);
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(`\nK2-I alcance: ${passed} ok, ${failed} falhas`);
  process.exit(failed ? 1 : 0);
})();

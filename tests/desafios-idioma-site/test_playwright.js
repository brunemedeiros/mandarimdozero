// M3 da revisão do código compartilhado (docs/revisao-codigo-compartilhado-erros.md, 2026-10-26): no site em inglês, Desafio
// publicado SEM a tradução dos campos que a tela mostra em português (fr/challenges.en.js) não aparece: nem na lista, nem na
// contagem, nem na fila, nem na revisão espaçada, nem na Expressão do dia, nem na linha "Desafios do Módulo" da trilha, e não
// abre. O progresso salvo dele continua intacto. No site em pt-BR nada muda (todos aparecem).
// 2026-10-26: os 16 Desafios da primeira leva (só na produção, retrato em docs/i18n/challenges-producao-sem-fonte.json) ganharam a
// tradução em inglês aprovada pela dona e voltam a aparecer e abrir no site em inglês.
// Desafios de verdade (lote A1-m1 e o de Complete a frase, com tradução) + 1 cópia de cada tipo com id novo (sem tradução).
// Rodar: node tests/desafios-idioma-site/test_playwright.js
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = process.env.REPO_ROOT || path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});

const lote = JSON.parse(fs.readFileSync(path.join(ROOT, 'fr/scripts/challenges_import/lote-a1-m1.json'), 'utf8'));
const cloze = JSON.parse(fs.readFileSync(path.join(ROOT, 'fr/scripts/challenges_import/lote-a1-m6-cloze.json'), 'utf8'));
const toRow = (it, status = 'published') => { const { id, type, level, ...data } = it; return { id, type, level, status, data: { ...data, status } }; };
// cópias sem tradução: mesmos dados, id que não existe no overlay, texto em português reconhecível
const PT = 'TEXTO SO EM PORTUGUES';
const semEn = [
  Object.assign(JSON.parse(JSON.stringify(lote.find(x => x.type === 'expression'))), { id: 'expr-zz-sem-en' }),
  Object.assign(JSON.parse(JSON.stringify(lote.find(x => x.type === 'listen_translate'))), { id: 'lt-zz-sem-en', explanation: PT, referenceTranslations: [PT] }),
  Object.assign(JSON.parse(JSON.stringify(lote.find(x => x.type === 'accent'))), { id: 'accent-zz-sem-en', explanation: PT }),
  Object.assign(JSON.parse(JSON.stringify(cloze[0])), { id: 'cloze-zz-sem-en', explanation: PT, translationPt: PT }),
];
semEn[0].meaning = Object.assign({}, semEn[0].meaning, { pt: PT });
const SEM = semEn.map(x => x.id);
// 16 da primeira leva (só na produção; retrato em docs/i18n/challenges-producao-sem-fonte.json): com a tradução em inglês
// aprovada em 2026-10-26, voltam a aparecer no site em inglês.
const leva1 = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/i18n/challenges-producao-sem-fonte.json'), 'utf8')).challenges;
const LEVA1 = leva1.map(x => x.id);
const ROWS = [...lote, ...cloze, ...semEn, ...leva1].map(i => toRow(i));

const STUB = `
(function(){
  const ROWS = ${JSON.stringify(ROWS)};
  function builder(table){
    const b = new Proxy({}, { get(_, prop){
      if (prop === 'then') return (ok) => Promise.resolve({ data: table === 'challenges' ? ROWS : [], error: null }).then(ok);
      if (prop === 'single' || prop === 'maybeSingle') return () => Promise.resolve({ data: null, error: null });
      return () => b;
    }});
    return b;
  }
  const client = {
    auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: async () => ({}) },
    from: builder, rpc: async () => ({ data: null, error: null }),
    channel: () => ({ on(){ return this; }, subscribe(){ return this; } }),
    storage: { from: () => ({ upload: async () => ({}), getPublicUrl: () => ({ data: { publicUrl: '' } }), remove: async () => ({}) }) },
    functions: { invoke: async () => ({ data: null, error: null }) },
  };
  window.supabase = { createClient: () => client };
})();`;

let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x).slice(0, 700) : ''); } };

async function boot(browser, port, lang){
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1200, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript((lang) => { try { sessionStorage.setItem('guest_mode', '1'); localStorage.setItem('ui-language', lang); } catch (e) {} }, lang);
  await page.goto(`http://127.0.0.1:${port}/fr/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
  if (lang === 'en') await page.waitForFunction(() => window.CHALLENGES_I18N && window.CHALLENGES_I18N.en && getUiLang() === 'en', null, { timeout: 15000 });
  return { page, errors, ctx };
}

async function cenario(page, SEM){
  return page.evaluate(async (SEM) => {
    // progresso salvo dos desafios sem tradução (concluído e revisão devida) + um com tradução
    const ontem = Date.now() - 3 * 86400000;
    SEM.concat(['lt-a1m1-001']).forEach(id => { STATE.completedChallenges[id] = true; STATE.challengeReviews[id] = { id, lastErrorAt: ontem, lastSeenAt: ontem, box: 1 }; });
    switchTab('challenges'); await renderChallengeCategories();
    const r = {};
    r.listed = listedChallenges().map(c => c.id);
    r.playable = playableChallenges().map(c => c.id);
    r.due = dueChallengeReviews();
    r.catHTML = document.getElementById('challenges-categories').innerHTML;
    r.lists = {};
    for (const type of ['expression', 'listen_translate', 'accent', 'cloze_grammar']){
      renderChallengesList(type);
      r.lists[type] = { ids: [...document.querySelectorAll('#challenges-cards [data-challenge-id]')].map(e => e.dataset.challengeId),
        progress: document.getElementById('challenges-list-progress').textContent.replace(/\s+/g, ' ').trim(), html: document.getElementById('view-challenges').innerHTML,
        next: (nextQueueChallenge(type, 'A1') || {}).id || null };
    }
    r.today = (expressionOfTheDay(listedChallenges().filter(c => c.type === 'expression')) || {}).id;
    // linha "Desafios do Módulo" da trilha (A1-m1 e A1-m6)
    r.moduleRows = ['A1-m1', 'A1-m6'].map(mid => { const m = MODULES.find(x => x.id === mid); const row = m && buildModuleChallengesRow(m); return row ? row.textContent.replace(/\s+/g, ' ').trim() : null; });
    // abrir direto (ex.: link antigo): não abre
    r.opened = {};
    for (const id of SEM){ renderChallengesList('expression'); openChallengePlayer(id); r.opened[id] = document.getElementById('challenge-player-wrap').style.display === 'block'; }
    // progresso salvo continua no save
    const saved = serializeState();
    r.savedCompleted = SEM.every(id => saved.completedChallenges && saved.completedChallenges[id] === true);
    r.savedReviews = SEM.every(id => saved.challengeReviews && saved.challengeReviews[id]);
    r.visibleText = document.body.innerText;
    return r;
  }, SEM);
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  try {
    // ---- site em inglês ----
    let { page, errors, ctx } = await boot(browser, port, 'en');
    const en = await cenario(page, SEM);
    const inter = (a) => a.filter(id => SEM.includes(id));
    check('en: nenhum desafio sem tradução na lista do aluno', inter(en.listed).length === 0, inter(en.listed));
    check('en: os desafios com tradução continuam (lote A1-m1 + Complete a frase + 16 da primeira leva)', en.listed.length === lote.length + cloze.length + leva1.length, en.listed.length);
    check('en: os 16 da primeira leva estão na lista do aluno', LEVA1.every(id => en.listed.includes(id)), LEVA1.filter(id => !en.listed.includes(id)));
    const leva = await page.evaluate((ids) => {
      const r = { opened: {}, overlay: {} };
      for (const id of ids){
        const c = studentChallenges().find(x => x.id === id);
        r.overlay[id] = !!challengeOverlay(c);
        renderChallengesList(c.type); openChallengePlayer(id);
        r.opened[id] = document.getElementById('challenge-player-wrap').style.display === 'block';
      }
      const lt = listenTranslateSetup(studentChallenges().find(x => x.id === 'lt-a1-001'));
      r.ltLang = lt.lang; r.ltRef = lt.refs[0]; r.ltOk = lt.cmp.isAcceptable('I am eating an apple', lt.refs);
      const b2 = listenTranslateSetup(studentChallenges().find(x => x.id === 'lt-b2-001'));
      r.b2Expl = b2.explanation;
      return r;
    }, LEVA1);
    check('en: os 16 da primeira leva têm tradução (overlay)', Object.values(leva.overlay).every(Boolean), leva.overlay);
    check('en: os 16 da primeira leva abrem', Object.values(leva.opened).every(Boolean), leva.opened);
    check('en: lt-a1-001 traduz para o inglês e aceita "I am eating an apple"', leva.ltLang === 'en' && leva.ltRef === "I'm eating an apple." && leva.ltOk, leva);
    check('en: explicação do lt-b2-001 em inglês', /^"Mener à bien" means/.test(leva.b2Expl || ''), leva.b2Expl);
    check('en: nenhum sem tradução no que dá para jogar', inter(en.playable).length === 0);
    check('en: revisão espaçada só com os traduzidos (lt-a1m1-001 devido, os 4 sem tradução fora)', JSON.stringify(en.due) === JSON.stringify(['lt-a1m1-001']), en.due);
    for (const [type, l] of Object.entries(en.lists)){
      check(`en: lista ${type} sem o desafio sem tradução`, inter(l.ids).length === 0 && (type !== 'expression' || l.ids.length > 0), l.ids);
      check(`en: fila de ${type} (próximo do A1) nunca é o sem tradução`, !SEM.includes(l.next), l.next);
      check(`en: lista ${type} sem o texto em português`, !l.html.includes(PT));
    }
    const totais = { expression: 5 + 9, listen_translate: 8 + 4, accent: 9 + 3, cloze_grammar: 6 };
    for (const [type, n] of Object.entries(totais)) check(`en: contagem de ${type} sem o sem tradução (total ${n})`, new RegExp('\\b' + n + '\\b').test(en.lists[type].progress) && !new RegExp('\\b' + (n + 1) + '\\b').test(en.lists[type].progress), en.lists[type].progress);
    check('en: Expressão do dia nunca é a sem tradução', en.today && !SEM.includes(en.today), en.today);
    check('en: linha "Desafios do Módulo" não conta os sem tradução', en.moduleRows[0] && en.moduleRows[1] && !en.moduleRows.join(' ').includes(PT), en.moduleRows);
    check('en: desafio sem tradução não abre', Object.values(en.opened).every(v => v === false), en.opened);
    check('en: progresso salvo dos sem tradução continua no save (concluído e revisão)', en.savedCompleted && en.savedReviews);
    check('en: nada de "TEXTO SO EM PORTUGUES" visível', !en.visibleText.includes(PT));
    check('en: sem erro de página', errors.filter(e => !/ERR_TUNNEL/.test(e)).length === 0, errors);
    // troca para pt-BR na mesma página: voltam
    const volta = await page.evaluate(async (SEM) => { await setUiLang('pt-BR'); await new Promise(r => setTimeout(r, 300)); renderChallengesList('expression'); return { listed: listedChallenges().map(c => c.id).filter(id => SEM.includes(id)), cards: [...document.querySelectorAll('#challenges-cards [data-challenge-id]')].map(e => e.dataset.challengeId) }; }, SEM);
    check('en -> pt-BR na mesma página: os 4 voltam', volta.listed.length === 4 && volta.cards.includes('expr-zz-sem-en'), volta);
    await ctx.close();

    // ---- site em pt-BR: nada muda ----
    ({ page, errors, ctx } = await boot(browser, port, 'pt-BR'));
    const pt = await cenario(page, SEM);
    check('pt-BR: todos os publicados na lista, inclusive os sem tradução', pt.listed.length === ROWS.length && SEM.every(id => pt.listed.includes(id)), pt.listed.length);
    check('pt-BR: revisão espaçada com todos os devidos', SEM.every(id => pt.due.includes(id)) && pt.due.includes('lt-a1m1-001'), pt.due);
    check('pt-BR: desafio sem tradução abre', Object.values(pt.opened).every(v => v === true), pt.opened);
    check('pt-BR: Expressões mostra a sem tradução', pt.lists.expression.ids.includes('expr-zz-sem-en'));
    const totaisPt = { expression: 6 + 9, listen_translate: 9 + 4, accent: 10 + 3, cloze_grammar: 7 };
    for (const [type, n] of Object.entries(totaisPt)) check(`pt-BR: contagem de ${type} com todos (total ${n})`, new RegExp('\\b' + n + '\\b').test(pt.lists[type].progress), pt.lists[type].progress);
    check('pt-BR: sem erro de página', errors.filter(e => !/ERR_TUNNEL/.test(e)).length === 0, errors);
    await ctx.close();
  } finally { await browser.close(); server.close(); }
  console.log(`Desafios no idioma do site (M3): ${passed} passaram, ${failed} falharam`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

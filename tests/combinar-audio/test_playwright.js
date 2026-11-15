// Combinar com áudio (2026-11-14): algumas cartas do idioma estudado viram carta de áudio (ícone 🔊, toca sozinha ao virar, tocar de
// novo repete) e a aluna combina o som com a tradução. Só palavra com mp3 pré-gerado; cerca de 1/3 dos pares; nunca dois sons iguais;
// opção "Com áudio" na tela de tamanho (padrão ligada, lembrada). XP (2 por par), recorde e memória do par certo não mudam.
// Playwright (Chromium), fr + zh, convidado com Supabase stubado. Rodar: node tests/combinar-audio/test_playwright.js
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
const STUB = `(function(){
  const b = () => new Proxy({}, { get(_, p){ if (p === 'then') return (ok) => Promise.resolve({ data: [], error: null }).then(ok);
    if (p === 'single' || p === 'maybeSingle') return () => Promise.resolve({ data: null, error: null }); return () => b(); } });
  const client = { auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: async () => ({}) },
    from: b, rpc: async () => ({ data: null, error: null }), channel: () => ({ on(){ return this; }, subscribe(){ return this; } }),
    storage: { from: () => ({ upload: async () => ({}), getPublicUrl: () => ({ data: { publicUrl: '' } }), remove: async () => ({}) }) },
    functions: { invoke: async () => ({ data: null, error: null }) } };
  window.supabase = { createClient: () => client };
})();`;
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };
const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function boot(browser, lang, port, opts, pre){
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1100, height: 900 }, colorScheme: 'light', ...(opts || {}) });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.route(/\.mp3(\?|$)/, r => r.fulfill({ contentType: 'audio/mpeg', body: Buffer.alloc(10) }));
  await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); } catch (e) {} });
  if (pre) await page.addInitScript(pre);
  await page.goto(`http://127.0.0.1:${port}/${lang}/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
  return { ctx, page, errors };
}
// Abre a tela de tamanho com um pool de palavras que têm mp3 (e algumas sem), sem depender do progresso da trilha.
async function abrirTamanho(page){
  await page.evaluate(() => {
    window.__falas = [];
    LANG_HOOKS.speak = (text) => { window.__falas.push(text); };
    const comMp3 = STATE.cards.filter(c => hasPlainFrontBack(c) && matchHasPregenAudio(cardPromptText(c)));
    const semMp3 = STATE.cards.filter(c => hasPlainFrontBack(c) && !matchHasPregenAudio(cardPromptText(c)));
    window.__pool = comMp3.slice(0, 14).concat(semMp3.slice(0, 6));
    projectStudyWordsToA = () => window.__pool;
    switchTab('review');
    document.getElementById('review-mode-select-wrap').style.display = 'none';
    document.getElementById('review-session-wrap').style.display = 'block';
    document.getElementById('review-content').style.display = 'none';
    document.getElementById('speed-review-content').style.display = 'none';
    document.getElementById('match-review-content').style.display = 'block';
    renderMatchSizePicker();
  });
}

async function suite(browser, lang, port){
  const L = lang.toUpperCase();
  const { ctx, page, errors } = await boot(browser, lang, port);

  // ---------- Opção na tela de tamanho ----------
  await abrirTamanho(page);
  check(L + ' tela de tamanho: opção "Com áudio" aparece, ligada por padrão', await page.evaluate(() => { const o = document.getElementById('match-audio-opt'); return !!o && o.getAttribute('aria-checked') === 'true' && o.querySelector('.mao-switch').classList.contains('on'); }));
  check(L + ' tela de tamanho: título e ajuda da opção', await page.evaluate(() => { const o = document.getElementById('match-audio-opt'); return /Com áudio/.test(o.textContent) && /sem som/.test(o.textContent); }));

  // ---------- Jogo com áudio (8 pares: 2 cartas de áudio) ----------
  await page.evaluate(() => { document.querySelector('.match-size-btn[data-pairs="8"]').click(); document.getElementById('match-size-start-btn').click(); });
  await wait(200);
  const j = await page.evaluate(() => {
    const au = [...document.querySelectorAll('.match-tile-audio')];
    return { total: document.querySelectorAll('.match-tile').length, audio: au.length,
      semTexto: au.every(b => !/[a-zA-Z一-鿿]/.test(b.querySelector('.match-tile-front').textContent) && !b.outerHTML.includes('data-text')),
      icone: au.every(b => !!b.querySelector('.match-audio-icon')), rotulo: au.every(b => /áudio/i.test(b.getAttribute('aria-label') || '')),
      lado: au.every(b => b.dataset.side === 'front'),
      comMp3: MATCH_STATE.tiles.filter(x => x.audio).every(x => matchHasPregenAudio(x.text)) };
  });
  check(L + ' jogo: 16 cartas e 2 de áudio (1/3 dos 8 pares)', j.total === 16 && j.audio === 2, j);
  check(L + ' jogo: carta de áudio mostra só o ícone, nada do texto no HTML, com rótulo acessível', j.semTexto && j.icone && j.rotulo, j);
  check(L + ' jogo: carta de áudio é sempre do lado do idioma estudado e só de palavra com mp3', j.lado && j.comMp3, j);

  // Virar a carta de áudio toca a palavra sozinha; tocar de novo repete sem contar como escolha
  const par = await page.evaluate(() => { const i = MATCH_STATE.tiles.findIndex(x => x.audio); return { i, id: MATCH_STATE.tiles[i].cardId, text: MATCH_STATE.tiles[i].text }; });
  await page.evaluate((i) => document.querySelector(`.match-tile[data-idx="${i}"]`).click(), par.i);
  check(L + ' virar a carta de áudio toca a palavra uma vez', await page.evaluate((t) => window.__falas.length === 1 && window.__falas[0] === t, par.text));
  await page.evaluate((i) => document.querySelector(`.match-tile[data-idx="${i}"]`).click(), par.i);
  check(L + ' tocar de novo na carta virada repete o áudio sem virar nem contar tentativa', await page.evaluate(() => window.__falas.length === 2 && MATCH_STATE.attempts === 0 && MATCH_STATE.selected !== null));

  // Combinar o som com a tradução: 2 XP, par certo, memória (palavra nova vira "Bom")
  const antes = await page.evaluate((id) => ({ xp: STATE.xp, reps: STATE.cards.find(c => c.id === id).reps }), par.id);
  const bi = await page.evaluate((id) => MATCH_STATE.tiles.findIndex(x => x.cardId === id && x.side === 'back'), par.id);
  await page.evaluate((i) => document.querySelector(`.match-tile[data-idx="${i}"]`).click(), bi);
  await wait(900);
  const dep = await page.evaluate((id) => ({ xp: STATE.xp, reps: STATE.cards.find(c => c.id === id).reps, ok: MATCH_STATE.matchedCount, att: MATCH_STATE.attempts, mt: document.querySelectorAll('.match-tile.matched').length }), par.id);
  check(L + ' combinar som + tradução: par certo, 1 tentativa, 2 XP', dep.ok === 1 && dep.att === 1 && dep.mt === 2 && dep.xp - antes.xp === 2, { antes, dep });
  check(L + ' combinar por áudio mantém a memória do par certo (palavra nova vira "Bom")', antes.reps !== 0 || dep.reps > 0, { antes, dep });

  // Errar: audio + tradução errada vira de volta e a carta de áudio toca de novo ao virar outra vez
  const err = await page.evaluate(() => { const a = MATCH_STATE.tiles.findIndex(x => x.audio && !document.querySelector(`.match-tile[data-idx="${MATCH_STATE.tiles.indexOf(x)}"]`).classList.contains('matched')); const b = MATCH_STATE.tiles.findIndex(x => x.side === 'back' && x.cardId !== MATCH_STATE.tiles[a].cardId && !document.querySelector(`.match-tile[data-idx="${MATCH_STATE.tiles.indexOf(x)}"]`).classList.contains('matched')); return { a, b }; });
  const nFalas = await page.evaluate(() => window.__falas.length);
  await page.evaluate((e) => { document.querySelector(`.match-tile[data-idx="${e.a}"]`).click(); document.querySelector(`.match-tile[data-idx="${e.b}"]`).click(); }, err);
  await wait(1200);
  check(L + ' par errado: toca o áudio ao virar e não acerta', await page.evaluate((n) => window.__falas.length === n + 1 && MATCH_STATE.matchedCount === 1, nFalas));

  // ---------- Opção desligada: jogo igual ao de antes ----------
  await abrirTamanho(page);
  await page.evaluate(() => document.getElementById('match-audio-opt').click());
  check(L + ' desligar a opção: fica desligada e é lembrada', await page.evaluate(() => document.getElementById('match-audio-opt').getAttribute('aria-checked') === 'false' && localStorage.getItem('match-with-audio') === '0'));
  await page.evaluate(() => { document.querySelector('.match-size-btn[data-pairs="8"]').click(); document.getElementById('match-size-start-btn').click(); });
  await wait(200);
  check(L + ' opção desligada: nenhuma carta de áudio, todas mostram texto', await page.evaluate(() => document.querySelectorAll('.match-tile-audio').length === 0 && [...document.querySelectorAll('.match-tile-front')].every(f => f.textContent.trim().length > 0)));

  // ---------- Sem palavra com mp3: sem opção ----------
  await page.evaluate(() => { localStorage.removeItem('match-with-audio'); MATCH_STATE.withAudio = null; window.__pool = STATE.cards.filter(c => hasPlainFrontBack(c) && !matchHasPregenAudio(cardPromptText(c))).slice(0, 14); renderMatchSizePicker(); });
  check(L + ' sem nenhuma palavra com mp3: a opção não aparece', await page.evaluate(() => !document.getElementById('match-audio-opt')));

  // ---------- Escolha das cartas de áudio (função pura): 1/3, nunca dois sons iguais ----------
  const pura = await page.evaluate(() => {
    const itens = [{ key: 'vert', hasAudio: true }, { key: 'verre', hasAudio: true }, { key: 'mer', hasAudio: true }, { key: 'mère', hasAudio: true }, { key: 'chat', hasAudio: false }, { key: 'pain', hasAudio: true }];
    const saved = LANG_HOOKS.familiaLatina;
    LANG_HOOKS.familiaLatina = { homofonos: [{ words: ['vert', 'verre', 'vers'] }, { words: ['mer', 'mère', 'maire'] }] };
    const a = matchPickAudioIndexes(itens, 3, [0, 1, 2, 3, 4, 5]);
    const b = matchPickAudioIndexes([{ key: 'shì', hasAudio: true }, { key: 'shì', hasAudio: true }, { key: 'nǐ', hasAudio: true }], 3, [0, 1, 2]);
    const c = matchPickAudioIndexes(itens, 0, [0, 1, 2, 3, 4, 5]);
    LANG_HOOKS.familiaLatina = saved;
    return { a, b, c };
  });
  check(L + ' escolha: nunca dois homófonos (vert/verre, mer/mère) e só palavra com mp3', JSON.stringify(pura.a) === '[0,2,5]', pura.a);
  check(L + ' escolha: mesmo pinyin com tom conta como mesmo som', JSON.stringify(pura.b) === '[0,2]', pura.b);
  check(L + ' escolha: máximo 0 = nenhuma carta de áudio', pura.c.length === 0, pura.c);

  check(L + ' sem erros de JS', errors.length === 0, errors);
  await ctx.close();
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch();
  try { for (const lang of ['fr', 'zh']) await suite(browser, lang, port); }
  finally { await browser.close(); server.close(); }
  console.log(`\ncombinar-audio: ${passed} ok, ${failed} falhas`);
  process.exit(failed ? 1 : 0);
})();

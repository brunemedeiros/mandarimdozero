// Etapa D das telas de exercício (2026-11-04, aprovada pela dona; docs/telas-exercicio-etapa-d-proposta.md), lote 1:
// Ouça e traduza, Acentuação e Complete a frase no molde da trilha: cabeçalho e barra do topo (⚑, ⌨️, ✕) sem o link de voltar,
// comando no idioma do site, progresso por passo (pergunta 50%, devolutiva 100%), "Não sei" (revela e conta como erro),
// "Continuar →" no fim (verde no acerto), Enter avança, números 1-N e teclas no Complete a frase (lacuna da vez).
// Rodar: node tests/desafios-etapa-d/test_playwright.js [pasta-de-capturas]
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = process.argv[2] || null;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
const toRow = (it) => { const { id, type, level, ...data } = it; return { id, type, level, status: 'published', data: { ...data, status: 'published' } }; };
const cloze = JSON.parse(fs.readFileSync(path.join(ROOT, 'fr/scripts/challenges_import/lote-a1-m6-cloze.json'), 'utf8'));
const ROWS = [
  toRow({ id: 'lt-1', type: 'listen_translate', level: 'A1', sentenceFr: 'Je mange une pomme.', audioFile: 'x.mp3', hintText: 'Je ______ une pomme.', referenceTranslations: ['Eu como uma maçã.'], explanation: '' }),
  toRow({ id: 'ac-1', type: 'accent', level: 'A1', targetText: 'école', audioFile: 'y.mp3', explanation: '' }),
  ...cloze.map(toRow)
];
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
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? JSON.stringify(x) : ''); } };
const CMD = { 'pt-BR': { lt: 'Ouça e escreva a tradução', ac: 'Ouça e escreva com os acentos', cl: 'Escolha a forma certa', cont: 'Continuar', rev: 'Resposta revelada' },
              en: { lt: 'Listen and write the translation', ac: 'Listen and write it with the accents', cl: 'Choose the right form', cont: 'Continue', rev: 'Answer revealed' } };

async function boot(browser, port, { lang, theme, vw, vh }){
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: vw, height: vh }, colorScheme: theme });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(([th, lg]) => { try { sessionStorage.setItem('guest_mode', '1'); localStorage.setItem('theme', th); localStorage.setItem('ui-language', lg); } catch (e) {} try { document.documentElement.dataset.theme = th; } catch (e) {} }, [theme, lang]);
  await page.goto(`http://127.0.0.1:${port}/fr/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
  await page.evaluate(() => { CURRENT_USER = { id: 'u-t' }; progressLoadedOk = true; ensureProfileLoaded = async () => ({ plan_tier: 'premium' }); window.__sounds = []; playPregeneratedAudio = () => {}; const ps = playFeedbackSound; playFeedbackSound = v => { window.__sounds.push(v); }; window.CHALLENGES_I18N = window.CHALLENGES_I18N || {}; window.CHALLENGES_I18N.en = Object.assign(window.CHALLENGES_I18N.en || {}, { 'lt-1': { referenceTranslations: ['I eat an apple.'] } }); switchTab('challenges'); });
  await page.waitForSelector('#challenges-categories .challenge-category-card', { timeout: 8000 });
  return { page, ctx, errors };
}
const vis = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); return !!e && e.offsetParent !== null && getComputedStyle(e).display !== 'none'; }, sel);
const prog = page => page.evaluate(() => { const f = document.querySelector('#challenge-player-wrap .lesson-progress-fill'); return f ? f.style.width : null; });
const rev = (page, id) => page.evaluate(i => !!(STATE.challengeReviews || {})[i], id);
const shot = async (page, name) => { if (OUT){ await page.waitForTimeout(150); await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: true }); } };
const frame = async (page, label, cmd) => {
  check(label + ': barra do topo', await vis(page, '#challenge-player-wrap .activity-lesson-bar'));
  check(label + ': ⚑, ⌨️ e ✕ na barra', await page.evaluate(() => ['.activity-flag-btn', '.activity-kbd-btn', '.activity-exit-btn'].every(s => document.querySelector('#challenge-player-wrap .activity-lesson-bar ' + s))));
  check(label + ': sem o link de voltar', !(await vis(page, '#challenge-back-to-list')));
  check(label + ': modo foco', await page.evaluate(() => document.getElementById('app').classList.contains('lesson-focus')));
  check(label + ': comando no idioma do site', (await page.textContent('#challenge-player-content .exercise-prompt-label')).trim() === cmd);
  check(label + ': cabeçalho Desafios · A1', /A1/.test(await page.textContent('#challenge-player-content .lesson-unit-context')));
  check(label + ': progresso 50% na pergunta', (await prog(page)) === '50%', await prog(page));
  check(label + ': "Não sei" visível', await vis(page, '#ch-dontknow-btn'));
  check(label + ': sem rolagem lateral', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
};

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  if (OUT) fs.mkdirSync(OUT, { recursive: true });

  for (const lang of ['pt-BR', 'en']) for (const theme of ['light', 'dark']) for (const [vw, vh, tag] of [[1200, 800, 'desktop'], [390, 844, 'celular']]){
    const L = `${lang}-${theme}-${tag}`, C = CMD[lang];
    const { page, ctx, errors } = await boot(browser, port, { lang, theme, vw, vh });

    // ---- Ouça e traduza: acerto pelo Enter, Continuar verde, Enter avança ----
    await page.evaluate(() => openChallengePlayer('lt-1')); await page.waitForSelector('#lt-answer-input');
    await frame(page, L + ' Ouça e traduza', C.lt);
    await shot(page, `lt-pergunta-${L}`);
    if (lang === 'pt-BR'){
      await page.fill('#lt-answer-input', 'Eu como uma maçã.');
      await page.press('#lt-answer-input', 'Enter');
      await page.waitForSelector('#challenge-complete-btn');
      check(L + ' lt: Enter verifica sem pular a devolutiva', await vis(page, '#challenge-complete-btn') && !(await page.evaluate(() => !!STATE.completedChallenges['lt-1'])));
      check(L + ' lt: progresso 100% na devolutiva', (await prog(page)) === '100%', await prog(page));
      check(L + ' lt: "Não sei" some', !(await vis(page, '#ch-dontknow-btn')));
      const btn = await page.evaluate(() => { const b = document.getElementById('challenge-complete-btn'); return { txt: b.textContent.trim(), green: b.classList.contains('correct-feedback-continue'), bg: getComputedStyle(b).backgroundColor, fill: getComputedStyle(document.documentElement).getPropertyValue('--success-fill').trim() }; });
      check(L + ' lt: botão Continuar no acerto', btn.txt.startsWith(C.cont), btn);
      check(L + ' lt: Continuar verde no acerto', btn.green, btn);
      check(L + ' lt: som de acerto', await page.evaluate(() => window.__sounds.slice(-1)[0] === true));
      await shot(page, `lt-acerto-${L}`);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(200);
      check(L + ' lt: Enter conclui', await page.evaluate(() => !!STATE.completedChallenges['lt-1']));
    }
    // "Não sei" no Ouça e traduza (en também)
    await page.evaluate(() => openChallengePlayer('lt-1')); await page.waitForSelector('#ch-dontknow-btn');
    await page.click('#ch-dontknow-btn'); await page.waitForTimeout(100);
    check(L + ' lt: Não sei revela', (await page.textContent('#lt-feedback-wrap')).includes(C.rev), await page.textContent('#lt-feedback-wrap .fb-title'));
    check(L + ' lt: Não sei sem "Sua resposta"', !(await page.evaluate(() => /lt\.yours|Sua resposta|Your answer/.test(document.getElementById('lt-feedback-wrap').textContent))));
    check(L + ' lt: Não sei conta como erro', await rev(page, 'lt-1'));
    check(L + ' lt: Não sei oferece tentar de novo', await vis(page, '#challenge-retry-btn'));
    check(L + ' lt: Não sei sem som', await page.evaluate(n => window.__sounds.length === n, lang === 'pt-BR' ? 1 : 0));
    check(L + ' lt: Não sei enche a barra', (await prog(page)) === '100%');
    await shot(page, `lt-naosei-${L}`);

    // ---- Acentuação: erro e "Não sei" ----
    await page.evaluate(() => openChallengePlayer('ac-1')); await page.waitForSelector('#accent-answer-input');
    await frame(page, L + ' Acentuação', C.ac);
    await shot(page, `ac-pergunta-${L}`);
    await page.fill('#accent-answer-input', 'xyz'); await page.press('#accent-answer-input', 'Enter'); await page.waitForTimeout(100);
    check(L + ' ac: erro mostra tentar de novo', await vis(page, '#challenge-retry-btn'));
    check(L + ' ac: foco no Tentar de novo', await page.evaluate(() => document.activeElement && document.activeElement.id === 'challenge-retry-btn'));
    check(L + ' ac: barra cheia', (await prog(page)) === '100%');
    await page.evaluate(() => openChallengePlayer('ac-1')); await page.waitForSelector('#ch-dontknow-btn');
    await page.click('#ch-dontknow-btn'); await page.waitForTimeout(100);
    check(L + ' ac: Não sei revela a palavra', (await page.textContent('#accent-feedback-wrap')).includes('école') && (await page.textContent('#accent-feedback-wrap')).includes(C.rev));
    await page.evaluate(() => openChallengePlayer('ac-1')); await page.waitForSelector('#accent-answer-input');
    await page.fill('#accent-answer-input', 'école'); await page.click('#accent-verify-btn'); await page.waitForTimeout(100);
    check(L + ' ac: acerto com Continuar verde', await page.evaluate(() => { const b = document.getElementById('challenge-complete-btn'); return !!b && b.classList.contains('correct-feedback-continue'); }));
    await shot(page, `ac-acerto-${L}`);

    // ---- Complete a frase: números, teclas na lacuna da vez, Não sei ----
    await page.evaluate(() => openChallengePlayer('cloze-a1m6-006')); await page.waitForSelector('#cloze-grammar-verify-btn');
    await frame(page, L + ' Complete a frase', C.cl);
    const hints = await page.evaluate(() => [...document.querySelectorAll('.cloze-grammar-group')].map(g => [...g.querySelectorAll('.kbd-hint')].map(h => h.textContent).join('')));
    check(L + ' cl: números 1-N em cada lacuna', hints[0] === '12' && hints[1] === '123', hints);
    await page.keyboard.press('2'); await page.waitForTimeout(60);
    const s1 = await page.evaluate(() => [...document.querySelectorAll('.cloze-grammar-group')].map(g => !!g.querySelector('.challenge-choice-btn.selected')));
    check(L + ' cl: tecla 2 escolhe na 1ª lacuna', s1[0] && !s1[1], s1);
    await page.keyboard.press('1'); await page.waitForTimeout(60);
    const s2 = await page.evaluate(() => [...document.querySelectorAll('.cloze-grammar-group')].map(g => !!g.querySelector('.challenge-choice-btn.selected')));
    check(L + ' cl: tecla 1 escolhe na 2ª lacuna (a da vez)', s2[0] && s2[1], s2);
    await shot(page, `cl-pergunta-${L}`);
    await page.click('#cloze-grammar-verify-btn'); await page.waitForTimeout(100);
    check(L + ' cl: devolutiva com barra cheia', (await prog(page)) === '100%');
    check(L + ' cl: teclas desligadas depois', await page.evaluate(() => typeof KEYBOARD_OPTION_MAP === 'undefined' || !KEYBOARD_OPTION_MAP || !KEYBOARD_OPTION_MAP.length));
    await page.evaluate(() => openChallengePlayer('cloze-a1m6-001')); await page.waitForSelector('#ch-dontknow-btn');
    await page.click('#ch-dontknow-btn'); await page.waitForTimeout(100);
    check(L + ' cl: Não sei preenche a lacuna com a certa', (await page.textContent('.cloze-grammar-slot')).trim() === 'avons');
    check(L + ' cl: Não sei revela e conta como erro', (await page.textContent('#cloze-grammar-feedback-wrap')).includes(C.rev) && await rev(page, 'cloze-a1m6-001'));
    await shot(page, `cl-naosei-${L}`);
    // ✕ sai do player
    await page.click('#challenge-player-wrap .activity-exit-btn'); await page.waitForTimeout(200);
    check(L + ' ✕ sai do player', !(await vis(page, '#challenge-player-wrap')));
    // ---- Lote 2: Ditados (modo foco, cabeçalho, comando, barra 50% -> 100%, Tentar de novo volta a 50%, ✕ volta à lista) ----
    const did = await page.evaluate(() => { const d = (typeof dictCfg === 'function' ? dictCfg().dictations() : [])[0]; return d && d.id; });
    check(L + ' ditado: há ditado no fr', !!did);
    await page.evaluate(i => { switchTab('dictation'); openDictationPlayer(i); }, did); await page.waitForSelector('#dictation-input');
    await page.waitForTimeout(100);
    const D = { cmd: lang === 'en' ? 'Listen and write what you hear' : 'Ouça e escreva o que você ouvir', title: lang === 'en' ? 'Dictations' : 'Ditados' };
    check(L + ' ditado: modo foco', await page.evaluate(() => document.getElementById('app').classList.contains('lesson-focus') && document.body.dataset.activityFocus === 'dictation'));
    check(L + ' ditado: barra com ⚑, ⌨️ e ✕', await page.evaluate(() => ['.activity-flag-btn', '.activity-kbd-btn', '.activity-exit-btn'].every(s => document.querySelector('#dictation-player-wrap .activity-lesson-bar ' + s))));
    check(L + ' ditado: barra logo abaixo do cabeçalho', await page.evaluate(() => { const c = document.querySelector('#dictation-player-content .lesson-unit-context'); return !!c && c.nextElementSibling && c.nextElementSibling.classList.contains('activity-lesson-bar'); }));
    check(L + ' ditado: sem o link de voltar', !(await vis(page, '#dictation-back-to-list')));
    check(L + ' ditado: cabeçalho com "' + D.title + ' · nível"', (await page.textContent('.dictation-player-module')).startsWith(D.title + ' · '));
    check(L + ' ditado: comando no idioma do site', (await page.textContent('.dictation-cmd')).trim() === D.cmd);
    const dprog = () => page.evaluate(() => document.querySelector('#dictation-player-wrap .lesson-progress-fill').style.width);
    check(L + ' ditado: 50% escrevendo', (await dprog()) === '50%', await dprog());
    check(L + ' ditado: sem rolagem lateral', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
    await shot(page, `dit-player-${L}`);
    await page.fill('#dictation-input', 'bonjour'); await page.click('#dictation-check-btn'); await page.waitForTimeout(150);
    check(L + ' ditado: 100% no resultado', (await dprog()) === '100%', await dprog());
    await shot(page, `dit-resultado-${L}`);
    await page.click('#dictation-retry-btn'); await page.waitForTimeout(80);
    check(L + ' ditado: Tentar de novo volta a 50%', (await dprog()) === '50%');
    await page.click('#dictation-player-wrap .activity-exit-btn'); await page.waitForTimeout(200);
    check(L + ' ditado: ✕ volta à lista', await vis(page, '#dictation-list-wrap') && !(await vis(page, '#dictation-player-wrap')));
    check(L + ' ditado: foco desligado na lista', await page.evaluate(() => !document.getElementById('app').classList.contains('lesson-focus')));
    // ---- Lote 3: Revisão (barra do topo com o progresso da sessão; linha "N / total" sem barrinha; ✕ volta aos modos) ----
    await page.evaluate(() => { const now = Date.now(); STATE.cards.slice(0, 3).forEach(c => { c.status = 'review'; c.due = now - 86400000; c.interval = 2; c.reps = 2; }); if (typeof isCardLessonCompleted === 'function') window.isCardLessonCompleted = () => true; switchTab('review'); openReviewSession('flashcard'); });
    await page.waitForTimeout(200);
    const qlen = await page.evaluate(() => STATE.reviewQueue.length);
    check(L + ' revisão: fila com cartões', qlen > 0, qlen);
    check(L + ' revisão: barra com ⚑, ⌨️ e ✕', await page.evaluate(() => ['.activity-flag-btn', '.activity-kbd-btn', '.activity-exit-btn'].every(s => document.querySelector('#review-session-wrap .activity-lesson-bar ' + s))));
    check(L + ' revisão: sem o link de voltar', !(await vis(page, '#review-back-to-modes')));
    check(L + ' revisão: ✕ com nome "Sair"/"Exit"', await page.evaluate(x => document.querySelector('#review-session-wrap .activity-exit-btn').getAttribute('aria-label') === x, lang === 'en' ? 'Exit' : 'Sair'));
    check(L + ' revisão: barrinha antiga escondida, contagem fica', await page.evaluate(() => { const b = document.querySelector('#review-content .review-progress-bar'); const c = document.querySelector('#review-content .review-progress-count'); return (!b || getComputedStyle(b).display === 'none') && !!c && c.offsetParent !== null; }));
    const rp = () => page.evaluate(() => document.querySelector('#review-session-wrap .lesson-progress-fill').style.width);
    check(L + ' revisão: 0% no primeiro cartão', (await rp()) === '0%', await rp());
    await shot(page, `rev-cartao-${L}`);
    await page.evaluate(() => { STATE.reviewIndex = STATE.reviewQueue.length; renderReviewView(); });
    await page.waitForTimeout(100);
    check(L + ' revisão: 100% no fim da sessão', (await rp()) === '100%', await rp());
    await page.evaluate(() => openReviewSession('match')); await page.waitForTimeout(150);
    check(L + ' revisão: jogo de pares sem trilha de progresso', await page.evaluate(() => getComputedStyle(document.querySelector('#review-session-wrap .lesson-progress-track')).visibility === 'hidden'));
    await page.evaluate(() => openReviewSession('flashcard')); await page.waitForTimeout(150);
    check(L + ' revisão: de volta ao Flashcard a trilha volta', await page.evaluate(() => getComputedStyle(document.querySelector('#review-session-wrap .lesson-progress-track')).visibility === 'visible'));
    await page.click('#review-session-wrap .activity-exit-btn'); await page.waitForTimeout(200);
    check(L + ' revisão: ✕ volta aos modos e desliga o foco', !(await vis(page, '#review-session-wrap')) && await page.evaluate(() => !document.getElementById('app').classList.contains('lesson-focus')));
    check(L + ' Ditados e Desafios: ✕ com nome "Sair"', await page.evaluate(x => [...document.querySelectorAll('#dictation-player-wrap .activity-exit-btn, #challenge-player-wrap .activity-exit-btn')].every(b => b.getAttribute('aria-label') === x), lang === 'en' ? 'Exit' : 'Sair'));
    check(L + ' zero pageerror', errors.length === 0, errors);
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(`etapa D (lotes 1, 2 e 3): ${passed}/${passed + failed} checks`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

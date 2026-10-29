// Etapa C (Expressões em passos, molde da trilha): palpite (não corrigido) -> opções numeradas -> painel curto -> "Veja em frases"
// -> "Sua vez" (digitar, com "Quase" da trilha e XP só na 1ª conclusão) -> tela final (Ir além + Concluir / Tentar de novo).
// Rodar: node tests/desafios-expressoes-passos/test_playwright.js [pasta-de-capturas]
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
const STUB = `
(function(){
  const ROWS = [{ id: 'ch-e1', type: 'expression', level: 'A1', status: 'published', data: { canonicalExpression: 'avoir faim', register: 'familiar', question: "Que signifie 'avoir faim' ?", options: ['Être fatigué', 'Avoir très envie de manger', 'Être content', 'Avoir soif'], correctAnswer: 'Avoir très envie de manger',
    meaning: { fr: 'Avoir envie de manger.', pt: 'Estar com fome.' }, explanation: "On utilise « avoir » avec la faim, la soif, le froid.", example: { text: "J'ai faim, je vais manger.", audioFile: 'a.mp3' }, secondExample: { text: 'Les enfants ont faim après l’école.' },
    microActivity: { prompt: "Il est midi et nous n'avons rien mangé : nous __________ !", answer: 'avons faim', alsoAccept: ['avons très faim'] },
    externalResources: [{ type: 'article', url: 'https://example.org/faim', buttonLabel: 'Saiba mais', sourceName: 'Exemplo', approved: true }] } },
  { id: 'ch-e2', type: 'expression', level: 'A1', status: 'published', data: { canonicalExpression: 'ça va', question: 'Que signifie « ça va » ?', options: ['Ça roule', 'Au revoir', 'Merci', 'Pardon'], correctAnswer: 'Ça roule',
    meaning: { fr: 'Comment allez-vous.', pt: 'Tudo bem.' }, explanation: 'Salut courant.', example: { text: 'Ça va.' }, secondExample: { text: 'Oui, ça va bien.' },
    microActivity: { prompt: 'Salut ! Comment __________ ?', answer: 'ça va' } } },
  { id: 'ch-a1', type: 'accent', level: 'A1', status: 'published', data: { audioFile: 'x.mp3', targetText: 'été' } }];
  function builder(table){
    const b = new Proxy({}, { get(_, p){
      if (p === 'then') return (ok, ko) => Promise.resolve({ data: table === 'challenges' ? ROWS : [], error: null }).then(ok, ko);
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
const L = { 'pt-BR': { when: 'QUANDO USAR', whenHint: 'Informal: use com amigos e pessoas próximas.', orderIt: 'MONTE A FRASE', tapHint: 'Toque nas palavras na ordem certa. Toque numa já colocada para devolvê-la.', whatMeans: 'O QUE SIGNIFICA?', seeSent: 'VEJA EM FRASES', turn: 'SUA VEZ', guess: 'Meu palpite (opcional)', see: 'Ver opções', dk: 'Não sei', cont: 'Continuar →', done: '✅ Concluir' },
            en: { when: 'WHEN TO USE IT', whenHint: 'Informal: use with friends and people close to you.', orderIt: 'BUILD THE SENTENCE', tapHint: 'Tap the words in the right order. Tap a placed one to send it back.', whatMeans: 'WHAT DOES IT MEAN?', seeSent: 'SEE IT IN SENTENCES', turn: 'YOUR TURN', guess: 'My guess (optional)', see: 'See options', dk: "I don't know", cont: 'Continue →', done: '✅ Complete' } };
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
  await page.evaluate(() => { window.CHALLENGES_I18N = window.CHALLENGES_I18N || {}; window.CHALLENGES_I18N.en = Object.assign(window.CHALLENGES_I18N.en || {}, { 'ch-e1': { meaning: 'To be hungry.' }, 'ch-e2': { meaning: 'It is going well.' } }); });
  await page.evaluate(() => { CURRENT_USER = { id: 'u-t' }; progressLoadedOk = true; ensureProfileLoaded = async () => ({ plan_tier: 'premium' }); window.__sounds = []; const ps = playFeedbackSound; playFeedbackSound = v => { window.__sounds.push(v); return ps(v); }; switchTab('challenges'); });
  await page.waitForSelector('#challenges-categories .challenge-category-card', { timeout: 8000 });
  return { page, ctx, errors };
}
const open = async (page, id = 'ch-e1') => { await page.evaluate(i => openChallengePlayer(i), id); await page.waitForSelector('#expr-see-options-btn'); await page.waitForTimeout(120); };
const pick = (page, right) => page.evaluate(r => { const c = CHALLENGES.find(x => x.id === 'ch-e1'); const b = [...document.querySelectorAll('.exercise-option')].find(e => (c.options[+e.dataset.origIdx] === c.correctAnswer) === r); b.click(); }, right);
const prog = page => page.evaluate(() => document.querySelector('#challenge-player-wrap .lesson-progress-fill').style.width);
// Do painel da resposta até a "Sua vez": passa pelos exemplos e pelo "Monte a frase" (com "Não sei" quando ele aparece).
const ateSuaVez = async (page) => { for (let i = 0; i < 6; i++){ if (await page.isVisible('#expr-turn-input')) return;
  if (await page.isVisible('#expr-order-dontknow-btn')) await page.click('#expr-order-dontknow-btn'); else await page.click('#expr-continue-btn'); await page.waitForTimeout(40); } };
const state = page => page.evaluate(() => ({ xp: STATE.xp, done: !!STATE.completedChallenges['ch-e1'], rev: !!STATE.challengeReviews['ch-e1'] }));

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  if (OUT) fs.mkdirSync(OUT, { recursive: true });

  // ===== Matriz: caminho feliz completo, 2 idiomas x 2 temas x 2 telas =====
  for (const lang of ['pt-BR', 'en']) for (const theme of ['light', 'dark']) for (const [vw, vh, tag] of [[1200, 800, 'desktop'], [390, 800, 'celular']]){
    const label = `${lang}-${theme}-${tag}`, X = L[lang];
    const { page, ctx, errors } = await boot(browser, port, { lang, theme, vw, vh });
    await open(page);
    const q = await page.evaluate(() => { const c = document.getElementById('challenge-player-content'), bar = c.querySelector('.activity-lesson-bar'), vis = el => !!el && el.offsetParent !== null;
      return { head: !!c.querySelector('.lesson-unit-context'), barAfterHead: !!bar && bar.previousElementSibling && bar.previousElementSibling.classList.contains('lesson-unit-context'),
        btns: bar ? bar.querySelectorAll('.lesson-close-btn').length : 0, backHidden: !vis(document.getElementById('challenge-back-to-list')), oldBarHidden: !vis(document.querySelector('#challenge-player-wrap .activity-focus-bar')),
        label: (c.querySelector('.exercise-prompt-label') || {}).textContent, guessLabel: (c.querySelector('.expr-guess-label') || {}).textContent,
        see: (document.getElementById('expr-see-options-btn') || {}).textContent, optionsHidden: !c.querySelector('.exercise-option'), noQuestion: !/Que signifie/.test(c.innerText),
        noBlur: !c.querySelector('.blurred'), reg: !!c.querySelector('.expr-reg') };
    });
    check(label + ' topo: cabeçalho, depois a barra com ⚑ ⌨️ ✕; link velho escondido', q.head && q.barAfterHead && q.btns === 3 && q.backHidden && q.oldBarHidden, q);
    check(label + ' pergunta: rótulo, palpite e "Ver opções" no idioma do site; sem opções, sem desfoque, sem frase em francês', q.label.toUpperCase() === X.whatMeans && q.guessLabel === X.guess && q.see === X.see && q.optionsHidden && q.noBlur && q.noQuestion, q);
    check(label + ' progresso 0%', (await prog(page)) === '0%');
    if (OUT) { await page.waitForTimeout(450); await page.screenshot({ path: path.join(OUT, `1-pergunta-${label}.png`) }); }
    await page.fill('#expr-guess-input', 'estar com fome?');
    await page.keyboard.press('Enter'); // Enter no palpite = Ver opções
    await page.waitForSelector('.exercise-option');
    const o = await page.evaluate(() => ({ n: document.querySelectorAll('.exercise-option').length, hints: [...document.querySelectorAll('.exercise-option .kbd-hint')].map(e => e.textContent).join(), line: (document.querySelector('.expr-guess-line') || {}).textContent, dk: (document.getElementById('expr-dontknow-btn') || {}).textContent, noInput: !document.getElementById('expr-guess-input') }));
    check(label + ' opções: 4, numeradas 1-4, palpite mostrado, "Não sei"', o.n === 4 && o.hints === '1,2,3,4' && /estar com fome/.test(o.line) && o.dk === X.dk && o.noInput, o);
    if (OUT) { await page.waitForTimeout(450); await page.screenshot({ path: path.join(OUT, `2-opcoes-${label}.png`) }); }
    await pick(page, true);
    const a = await page.evaluate(() => ({ panel: !!document.querySelector('.correct-feedback .expr-meaning-box'), correct: document.querySelectorAll('.exercise-option.correct').length, wrong: document.querySelectorAll('.exercise-option.incorrect').length, sounds: window.__sounds.join(), cont: (document.getElementById('expr-continue-btn') || {}).textContent, nr: !!document.getElementById('challenge-retry-btn') }));
    check(label + ' acerto: opção verde, painel com o sentido, som, "Continuar →"', a.panel && a.correct === 1 && a.wrong === 0 && a.sounds === 'true' && a.cont === X.cont && !a.nr, a);
    check(label + ' progresso 20%', (await prog(page)) === '20%');
    if (OUT) { await page.waitForTimeout(450); await page.screenshot({ path: path.join(OUT, `3-acerto-${label}.png`), fullPage: true }); }
    await page.keyboard.press('Enter'); // Enter avança
    await page.waitForSelector('.expr-example');
    const e = await page.evaluate(() => ({ label: (document.querySelector('.exercise-prompt-label') || {}).textContent, n: document.querySelectorAll('.expr-example').length, audio: [...document.querySelectorAll('.expr-example')].filter(x => x.querySelector('.dictation-play-btn')).length }));
    check(label + ' "Veja em frases": 2 exemplos e áudio só onde existe, progresso 40%', e.label.toUpperCase() === X.seeSent && e.n === 2 && e.audio === 1 && (await prog(page)) === '40%', e);
    const w = await page.evaluate(() => { const b = document.querySelector('.expr-when'); return { has: !!b, chip: !!(b && b.querySelector('.expr-reg')), label: b && b.querySelector('.expr-when-label').textContent, hint: b && b.querySelector('p').textContent, firstIsWhen: !!b && b.previousElementSibling.classList.contains('exercise-prompt-label') }; });
    check(label + ' "Quando usar": registro + cuidado no idioma do site, logo abaixo do título', w.has && w.chip && w.firstIsWhen && w.label.toUpperCase() === X.when && w.hint === X.whenHint, w);
    if (OUT) { await page.waitForTimeout(450); await page.screenshot({ path: path.join(OUT, `4-exemplos-${label}.png`) }); }
    await page.click('#expr-continue-btn');
    await page.waitForSelector('.reorder-blocks');
    const od = await page.evaluate(() => { const c = CHALLENGES.find(x => x.id === 'ch-e1'); const tokens = c.example.text.trim().split(/\s+/); const blocks = [...document.querySelectorAll('.reorder-block')].map(b => b.textContent);
      return { label: (document.querySelector('.exercise-prompt-label') || {}).textContent, tokens, blocks, slots: document.querySelectorAll('.reorder-slot.empty').length, hint: (document.querySelector('.reorder-wrap-hint') || {}).textContent, dk: (document.getElementById('expr-order-dontknow-btn') || {}).textContent, audio: !!document.getElementById('expr-order-play') }; });
    check(label + ' "Monte a frase": palavras do exemplo 1 embaralhadas, casas vazias, dica, "Não sei", áudio do exemplo, progresso 60%',
      od.label.toUpperCase() === X.orderIt && od.blocks.length === od.tokens.length && od.slots === od.tokens.length && [...od.blocks].sort().join('|') === [...od.tokens].sort().join('|') && od.blocks.join(' ') !== od.tokens.join(' ')
      && od.hint === X.tapHint && od.dk === X.dk && od.audio && (await prog(page)) === '60%', od);
    if (OUT) { await page.waitForTimeout(450); await page.screenshot({ path: path.join(OUT, `4b-ordenar-${label}.png`) }); }
    // monta na ordem certa: cada toque pega a próxima palavra ainda não usada
    for (const tok of od.tokens) await page.evaluate(t => { [...document.querySelectorAll('.reorder-block:not(.used)')].find(b => b.textContent === t).click(); }, tok);
    const or = await page.evaluate(() => ({ ok: !!document.querySelector('.correct-feedback .expr-order-full'), slots: [...document.querySelectorAll('.reorder-slot.correct')].length, wrongSlots: document.querySelectorAll('.reorder-slot.incorrect').length, sounds: window.__sounds.join(), xp: STATE.xp, full: (document.querySelector('.expr-order-full') || {}).textContent }));
    check(label + ' "Monte a frase" certo: casas verdes, painel com a frase inteira, som, sem XP', or.ok && or.slots === od.tokens.length && or.wrongSlots === 0 && or.sounds === 'true,true' && or.xp === 0 && or.full === od.tokens.join(' '), or);
    if (OUT) { await page.waitForTimeout(450); await page.screenshot({ path: path.join(OUT, `4c-ordenado-${label}.png`), fullPage: true }); }
    await page.keyboard.press('Enter'); // Enter avança
    await page.waitForSelector('#expr-turn-input');
    const t1 = await page.evaluate(() => ({ label: (document.querySelector('.exercise-prompt-label') || {}).textContent, blank: !!document.querySelector('.expr-blank'), acc: document.querySelectorAll('#expr-turn-stage .fr-accent-key').length > 0, dk: (document.getElementById('expr-turn-dontknow-btn') || {}).textContent, focus: document.activeElement && document.activeElement.id }));
    check(label + ' "Sua vez": lacuna, teclado de acentos, "Não sei", foco no campo, progresso 80%', t1.label.toUpperCase() === X.turn && t1.blank && t1.acc && t1.dk === X.dk && t1.focus === 'expr-turn-input' && (await prog(page)) === '80%', t1);
    if (OUT) { await page.waitForTimeout(450); await page.screenshot({ path: path.join(OUT, `5-suavez-${label}.png`) }); }
    await page.fill('#expr-turn-input', 'Avons faim.'); // maiúscula e ponto não contam
    await page.keyboard.press('Enter');
    await page.waitForSelector('.expr-turn-full');
    const t2 = await page.evaluate(() => ({ ok: !!document.querySelector('.correct-feedback .expr-turn-full'), almost: !!document.querySelector('.review-almost'), sounds: window.__sounds.join() }));
    check(label + ' "Sua vez": resposta certa (ignora maiúscula e ponto), sem "Quase", som', t2.ok && !t2.almost && t2.sounds === 'true,true,true', t2);
    if (OUT) { await page.waitForTimeout(450); await page.screenshot({ path: path.join(OUT, `6-suavez-acerto-${label}.png`), fullPage: true }); }
    await page.click('#expr-continue-btn');
    await page.waitForSelector('.expr-final');
    const f = await page.evaluate(() => ({ rows: [...document.querySelectorAll('.expr-final-sum li')].map(li => li.innerText.replace(/\s+/g, ' ')), links: document.querySelectorAll('.challenge-external-link').length, done: (document.getElementById('challenge-complete-btn') || {}).textContent, retry: !!document.getElementById('challenge-retry-btn') }));
    check(label + ' final: resumo (escolha ✓, Monte a frase ✓, Sua vez ✓, +2 XP), "Ir além" e Concluir', f.rows.length === 4 && /✓/.test(f.rows[0]) && /✓/.test(f.rows[1]) && /✓/.test(f.rows[2]) && /\+2 XP/.test(f.rows[3]) && f.links === 1 && f.done.trim() === X.done && !f.retry && (await prog(page)) === '100%', f);
    if (OUT) { await page.waitForTimeout(450); await page.screenshot({ path: path.join(OUT, `7-final-${label}.png`), fullPage: true }); }
    const before = await state(page);
    await page.click('#challenge-complete-btn');
    await page.waitForTimeout(150);
    const after = await state(page);
    check(label + ' Concluir: conclui o desafio e paga 2 XP (1ª conclusão)', !before.done && after.done && after.xp === before.xp + 2, { before, after });
    // refazer um desafio JÁ concluído: sem XP
    await open(page);
    await page.click('#expr-see-options-btn'); await pick(page, true); await ateSuaVez(page);
    await page.waitForSelector('#expr-turn-input'); await page.fill('#expr-turn-input', 'avons faim'); await page.keyboard.press('Enter'); await page.waitForSelector('.expr-turn-full'); await page.click('#expr-continue-btn');
    await page.waitForSelector('.expr-final');
    const rows2 = await page.evaluate(() => [...document.querySelectorAll('.expr-final-sum li')].length);
    const b2 = await state(page); await page.click('#challenge-complete-btn'); await page.waitForTimeout(150); const a2 = await state(page);
    check(label + ' refazer desafio já concluído: sem linha de XP e sem XP', rows2 === 3 && a2.xp === b2.xp, { rows2, b2, a2 });
    // saída pelo X volta à lista
    await open(page);
    await page.click('#challenge-player-wrap .activity-exit-btn');
    check(label + ' X sai do desafio e do modo foco', await page.evaluate(() => !document.body.dataset.activityFocus && document.getElementById('challenges-list-wrap').style.display === 'block' || document.getElementById('challenges-categories-wrap').style.display === 'block'));
    check(label + ' pageerrors = 0', errors.length === 0, errors);
    await ctx.close();
  }

  // ===== Casos de borda (pt-BR, claro, computador) =====
  const { page, ctx, errors } = await boot(browser, port, { lang: 'pt-BR', theme: 'light', vw: 1200, vh: 800 });
  const toTurn = async (right) => { await open(page); await page.click('#expr-see-options-btn'); await pick(page, right); await ateSuaVez(page); await page.waitForSelector('#expr-turn-input'); };
  // "Quase" (uma letra trocada em palavra de 5+ letras) vale 1 XP e mostra o aviso
  await toTurn(true); await page.fill('#expr-turn-input', 'avons fain'); await page.click('#expr-turn-verify-btn'); await page.waitForSelector('.expr-turn-full');
  check('Sua vez "quase": painel verde com o aviso Quase e a frase certa', await page.evaluate(() => !!document.querySelector('.correct-feedback .review-almost') && /avons faim/.test(document.querySelector('.expr-turn-full').innerText)));
  await page.click('#expr-continue-btn'); await page.waitForSelector('.expr-final');
  check('final com "quase": linha ~ e +1 XP', await page.evaluate(() => { const r = [...document.querySelectorAll('.expr-final-sum li')].map(l => l.innerText); return /~/.test(r[2]) && /\+1 XP/.test(r[3]); }));
  let b = await state(page); await page.click('#challenge-complete-btn'); await page.waitForTimeout(150); let a = await state(page);
  check('"quase" paga 1 XP', a.xp === b.xp + 1 && a.done, { b, a });
  // resposta alternativa escrita pelo autor (alsoAccept) vale; variação inventada não vale
  await page.evaluate(() => { delete STATE.completedChallenges['ch-e1']; });
  await toTurn(true); await page.fill('#expr-turn-input', 'avons très faim'); await page.click('#expr-turn-verify-btn'); await page.waitForSelector('.expr-turn-full');
  check('alternativa do autor (alsoAccept) vale como certa', await page.evaluate(() => !!document.querySelector('.correct-feedback') && !document.querySelector('.review-almost')));
  await toTurn(true); await page.fill('#expr-turn-input', 'avons soif'); await page.click('#expr-turn-verify-btn'); await page.waitForSelector('.expr-turn-full');
  check('resposta diferente: painel vermelho com a resposta marcada e a frase completa', await page.evaluate(() => !!document.querySelector('.wrong-feedback .typed-attempt') && /avons faim/.test(document.querySelector('.expr-turn-full').innerText)));
  await page.click('#expr-continue-btn'); await page.waitForSelector('.expr-final');
  b = await state(page); await page.click('#challenge-complete-btn'); await page.waitForTimeout(150); a = await state(page);
  check('"Sua vez" errada: conclui sem XP', a.xp === b.xp && a.done, { b, a });
  // campo vazio não verifica
  await page.evaluate(() => { delete STATE.completedChallenges['ch-e1']; });
  await toTurn(true); await page.click('#expr-turn-verify-btn');
  check('verificar com o campo vazio não faz nada', await page.evaluate(() => !document.querySelector('.expr-turn-full') && document.activeElement.id === 'expr-turn-input'));
  // "Não sei" na Sua vez: sem XP, resposta revelada, silencioso
  const s0 = await page.evaluate(() => window.__sounds.length);
  await page.click('#expr-turn-dontknow-btn'); await page.waitForSelector('.expr-turn-full');
  check('"Não sei" na Sua vez: revela a frase, sem som, cabeçalho "Resposta revelada"', await page.evaluate(n => document.querySelector('.wrong-feedback-header').innerText.includes('revelada') && window.__sounds.length === n, s0));
  await page.click('#expr-continue-btn'); await page.waitForSelector('.expr-final');
  b = await state(page); await page.click('#challenge-complete-btn'); await page.waitForTimeout(150); a = await state(page);
  check('"Não sei" na Sua vez: sem XP', a.xp === b.xp, { b, a });
  // errar a escolha: fica na fila de revisão, final com Tentar de novo (sem Concluir, sem XP)
  await page.evaluate(() => { delete STATE.completedChallenges['ch-e1']; delete STATE.challengeReviews['ch-e1']; });
  await open(page); await page.click('#expr-see-options-btn'); await pick(page, false);
  const w = await page.evaluate(() => ({ wrong: document.querySelectorAll('.exercise-option.incorrect').length, right: document.querySelectorAll('.exercise-option.correct').length, header: document.querySelector('.wrong-feedback-header').innerText, sounds: window.__sounds.slice(-1).join(), why: !!document.querySelector('.wrong-feedback .wrong-feedback-why') }));
  check('erro: opção errada vermelha, certa verde, painel "Não foi dessa vez", som de erro', w.wrong === 1 && w.right === 1 && /Não foi dessa vez/.test(w.header) && w.sounds === 'false' && w.why, w);
  await ateSuaVez(page); await page.waitForSelector('#expr-turn-input'); await page.fill('#expr-turn-input', 'avons faim'); await page.click('#expr-turn-verify-btn'); await page.waitForSelector('.expr-turn-full'); await page.click('#expr-continue-btn'); await page.waitForSelector('.expr-final');
  const ff = await page.evaluate(() => ({ retry: !!document.getElementById('challenge-retry-btn'), later: !!document.getElementById('challenge-later-btn'), complete: !!document.getElementById('challenge-complete-btn'), rev: !!STATE.challengeReviews['ch-e1'], done: !!STATE.completedChallenges['ch-e1'] }));
  check('erro na escolha: final com Tentar de novo/mais tarde, sem Concluir, fica na revisão, não conclui', ff.retry && ff.later && !ff.complete && ff.rev && !ff.done, ff);
  // "Não sei" na escolha: revela, silencioso, conta como erro
  await open(page); await page.click('#expr-see-options-btn'); const sn = await page.evaluate(() => window.__sounds.length); await page.click('#expr-dontknow-btn');
  const dk = await page.evaluate(n => ({ revealed: document.querySelector('.wrong-feedback-header').innerText.includes('revelada'), correct: document.querySelectorAll('.exercise-option.correct').length, wrong: document.querySelectorAll('.exercise-option.incorrect').length, silent: window.__sounds.length === n, noYours: !document.querySelector('.wrong-feedback-why-label') || ![...document.querySelectorAll('.wrong-feedback-why-label')].some(l => /Sua resposta/i.test(l.innerText)) }), sn);
  check('"Não sei" na escolha: resposta revelada em verde, silencioso, sem "Sua resposta"', dk.revealed && dk.correct === 1 && dk.wrong === 0 && dk.silent && dk.noYours, dk);
  // teclado: tecla 2 escolhe a 2ª opção; com palpite vazio não aparece a linha do palpite
  await open(page); await page.click('#expr-see-options-btn');
  check('palpite vazio: sem linha de palpite', await page.evaluate(() => !document.querySelector('.expr-guess-line')));
  const second = await page.evaluate(() => document.querySelectorAll('.exercise-option')[1].dataset.origIdx);
  await page.keyboard.press('2');
  check('tecla 2 escolhe a 2ª opção da tela', await page.evaluate(i => EXPR_RUN.chosenIdx === +i, second));
  // "Monte a frase": devolver palavra tocando na casa, errar a ordem e "Não sei"
  const paraOrdem = async () => { await open(page); await page.click('#expr-see-options-btn'); await pick(page, true); await page.click('#expr-continue-btn'); await page.click('#expr-continue-btn'); await page.waitForSelector('.reorder-blocks'); };
  await paraOrdem();
  const toks = await page.evaluate(() => CHALLENGES.find(x => x.id === 'ch-e1').example.text.trim().split(/\s+/));
  await page.evaluate(t => { [...document.querySelectorAll('.reorder-block:not(.used)')].find(b => b.textContent === t).click(); }, toks[0]);
  await page.evaluate(() => document.querySelector('.reorder-slot.filled').click());
  check('ordenar: tocar numa casa preenchida devolve a palavra', await page.evaluate(() => document.querySelectorAll('.reorder-slot.filled').length === 0 && document.querySelectorAll('.reorder-block.used').length === 0));
  for (const tok of [...toks].reverse()) await page.evaluate(t => { [...document.querySelectorAll('.reorder-block:not(.used)')].find(b => b.textContent === t).click(); }, tok);
  const oe = await page.evaluate(() => ({ bad: document.querySelectorAll('.reorder-slot.incorrect').length, header: (document.querySelector('.wrong-feedback-header') || {}).innerText, full: (document.querySelector('.expr-order-full') || {}).textContent, sound: window.__sounds.slice(-1).join(), hidden: document.getElementById('expr-order-blocks').style.display === 'none', ok: EXPR_RUN.order.ok }));
  check('ordenar errado: casas fora do lugar em vermelho, frase certa no painel, som de erro, blocos somem', oe.bad >= 1 && /Não foi dessa vez/.test(oe.header) && oe.full === toks.join(' ') && oe.sound === 'false' && oe.hidden && oe.ok === false, oe);
  await page.click('#expr-continue-btn'); await page.waitForSelector('#expr-turn-input');
  await paraOrdem(); const s1 = await page.evaluate(() => window.__sounds.length); await page.click('#expr-order-dontknow-btn');
  const od2 = await page.evaluate(n => ({ header: document.querySelector('.wrong-feedback-header').innerText, slots: [...document.querySelectorAll('.reorder-slot.correct')].map(x => x.textContent.trim()).join(' '), silent: window.__sounds.length === n, revealed: EXPR_RUN.order.revealed && !EXPR_RUN.order.ok }), s1);
  check('ordenar "Não sei": frase certa revelada, silencioso, conta como erro', /revelada/.test(od2.header) && od2.slots === toks.join(' ') && od2.silent && od2.revealed, od2);
  await page.click('#expr-continue-btn'); await page.waitForSelector('#expr-turn-input'); await page.click('#expr-turn-dontknow-btn'); await page.waitForSelector('.expr-turn-full'); await page.click('#expr-continue-btn'); await page.waitForSelector('.expr-final');
  check('final mostra "Monte a frase" como erro quando errou ou revelou', await page.evaluate(() => { const r = [...document.querySelectorAll('.expr-final-sum li')].map(l => l.innerText.replace(/\s+/g, ' ')); return r.length >= 3 && /Monte a frase\s*✕/.test(r[1]); }));
  // expressão sem registro e com exemplo de 2 palavras: sem "Quando usar" e sem o passo de ordenar
  await page.evaluate(() => openChallengePlayer('ch-e2')); await page.waitForSelector('#expr-see-options-btn'); await page.click('#expr-see-options-btn');
  await page.evaluate(() => { const c = CHALLENGES.find(x => x.id === 'ch-e2'); [...document.querySelectorAll('.exercise-option')].find(b => b.querySelector('.opt-text').textContent === c.correctAnswer).click(); });
  await page.click('#expr-continue-btn'); await page.waitForSelector('.expr-example');
  check('sem registro no dado: não aparece o "Quando usar"', await page.evaluate(() => !document.querySelector('.expr-when')));
  await page.click('#expr-continue-btn'); await page.waitForSelector('#expr-turn-input');
  check('exemplo de menos de 3 palavras: pula o "Monte a frase" e vai direto à "Sua vez"', await page.evaluate(() => !document.querySelector('.reorder-blocks') && !!document.getElementById('expr-turn-input')));
  // os outros tipos de desafio seguem com o link de voltar (sem barra da lição)
  await page.evaluate(() => openChallengePlayer('ch-a1')); await page.waitForSelector('#accent-verify-btn');
  check('Acentuação segue com o link de voltar e sem a barra da lição', await page.evaluate(() => { const vis = el => !!el && el.offsetParent !== null; return vis(document.getElementById('challenge-back-to-list')) && !document.querySelector('#challenge-player-wrap .activity-lesson-bar'); }));
  await page.evaluate(() => openChallengePlayer('ch-e1')); await page.waitForSelector('#expr-see-options-btn');
  check('voltando às Expressões a barra da lição volta e o link some', await page.evaluate(() => { const vis = el => !!el && el.offsetParent !== null; return !vis(document.getElementById('challenge-back-to-list')) && !!document.querySelector('#challenge-player-wrap .activity-lesson-bar'); }));
  check('casos de borda: zero pageerror', errors.length === 0, errors);
  await ctx.close();

  await browser.close(); server.close();
  console.log(`${passed}/${passed + failed} checks`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

// Etapas B e B2 (padrão das telas de exercício): Jogos e Prática da Conjugação no molde da trilha: cabeçalho, depois a barra
// (progresso + ⚑ + ⌨️ + X), respostas numeradas (1/2), "Não sei" (revela e conta como erro), som e tremida no erro,
// "Continuar →" e dia de estudo contado ao terminar (sem XP).
// Rodar: node tests/jogos-padrao-trilha/test_playwright.js [pasta-de-capturas]
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
  const ROWS = [{ id: 'ch-e1', type: 'expression', level: 'A1', status: 'published', data: { canonicalExpression: 'avoir faim', question: "Que signifie 'avoir faim' ?", options: ['Être fatigué', 'Avoir très envie de manger', 'Être content', 'Avoir soif'], correctAnswer: 'Avoir très envie de manger', meaning: { fr: 'Avoir envie de manger.', pt: 'Estar com fome.' }, explanation: 'Expression courante.', example: { text: "J'ai faim." }, secondExample: { text: 'Il a faim.' } } },
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
const T = { 'pt-BR': { cont: 'Continuar →', see: 'Ver resultado →', revealed: 'Resposta revelada', dk: 'Não sei', exit: 'Sair do jogo' },
            en: { cont: 'Continue →', see: 'See result →', revealed: 'Answer revealed', dk: "I don't know", exit: 'Leave the game' } };
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  if (OUT) fs.mkdirSync(OUT, { recursive: true });
  for (const lang of ['pt-BR', 'en']) for (const theme of ['light', 'dark']) for (const [vw, vh, tag] of [[1200, 800, 'desktop'], [390, 800, 'celular']]){
    const label = `${lang}-${theme}-${tag}`, X = T[lang];
    const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: vw, height: vh }, colorScheme: theme });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
    await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
    await page.addInitScript(([th, lg]) => { try { sessionStorage.setItem('guest_mode', '1'); localStorage.setItem('theme', th); localStorage.setItem('ui-language', lg); } catch (e) {} try { document.documentElement.dataset.theme = th; } catch (e) {} }, [theme, lang]);
    await page.goto(`http://127.0.0.1:${port}/fr/index.html`);
    await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
    await page.evaluate(() => { window.__events = []; window.__sounds = []; const ps = playFeedbackSound; playFeedbackSound = (v) => { window.__sounds.push(v); return ps(v); }; const o = trackEvent; trackEvent = (a, b, c) => { window.__events.push([a, b, c]); return o(a, b, c); }; switchTab('conjugaison'); });
    await page.click('#conj-mode-games');
    await page.click('.cg-play[data-game="etre-avoir"]');
    await page.waitForSelector('.cg-choice');
    await page.waitForTimeout(250);
    if (OUT) await page.screenshot({ path: path.join(OUT, `jogo-${label}.png`) });
    const q = await page.evaluate(() => {
      const bar = document.querySelector('#conj-game-wrap .lesson-focus-bar');
      const vis = el => !!el && el.offsetParent !== null;
      return {
        barAfterHead: !!(bar && bar.previousElementSibling && bar.previousElementSibling.classList.contains('cg-head')),
        bar: !!bar, track: !!(bar && bar.querySelector('.lesson-progress-track')), flag: !!(bar && bar.querySelector('[data-report-flag]')),
        kbd: !!(bar && bar.querySelector('.activity-kbd-btn')), exit: !!(bar && bar.querySelector('.activity-exit-btn')),
        exitLabel: bar ? bar.querySelector('.activity-exit-btn').getAttribute('aria-label') : '',
        backHidden: !vis(document.getElementById('conj-game-back')),
        width: bar ? bar.querySelector('.lesson-progress-fill').style.width : '',
        hints: [...document.querySelectorAll('.cg-choice .kbd-hint')].map(e => e.textContent),
        dk: (document.getElementById('cg-dontknow') || {}).textContent, dkVisible: vis(document.getElementById('cg-dontknow')),
        noInlineBar: !document.querySelector('.cg-progress-bar'), counter: (document.querySelector('.cg-progress span') || {}).textContent
      };
    });
    check(label + ' topo da trilha: progresso, ⚑, ⌨️ e X', q.bar && q.track && q.flag && q.kbd && q.exit, q);
    check(label + ' a barra fica logo abaixo do cabeçalho (como na lição)', q.barAfterHead, q);
    check(label + ' X com nome no idioma do site', q.exitLabel === X.exit, q.exitLabel);
    check(label + ' link "Voltar" escondido e sem barra fina dentro do conteúdo', q.backHidden && q.noInlineBar, q);
    check(label + ' progresso começa em 0% e o contador em texto continua', q.width === '0%' && /1/.test(q.counter || ''), q);
    check(label + ' respostas numeradas 1 e 2', q.hints.join() === '1,2', q.hints);
    check(label + ' "Não sei" visível no idioma do site', q.dkVisible && q.dk === X.dk, q);
    check(label + ' sem rolagem horizontal', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));

    // ⌨️ abre os atalhos; com a janela aberta a tecla 1 não responde
    await page.click('#conj-game-wrap .activity-kbd-btn');
    check(label + ' ⌨️ abre o modal de atalhos', await page.evaluate(() => getComputedStyle(document.getElementById('kbd-shortcuts-modal')).display === 'flex'));
    await page.keyboard.press('1');
    check(label + ' com o modal aberto a tecla 1 não responde', await page.evaluate(() => !CONJ_GAMES_UI.state.answered));
    await page.click('#kbd-shortcuts-modal-close');

    // Não sei: revela, conta como erro, esconde o botão
    await page.click('#cg-dontknow');
    await page.waitForSelector('.cg-verdict');
    const d = await page.evaluate(() => ({ verdict: document.querySelector('.cg-verdict').textContent, cls: document.querySelector('.cg-verdict').className,
      right: !!document.querySelector('.cg-choice.is-right'), wrong: !!document.querySelector('.cg-choice.is-wrong'),
      dkHidden: getComputedStyle(document.getElementById('cg-dontknow')).display === 'none',
      log: CONJ_GAMES_UI.state.log.map(x => x.ok), next: document.getElementById('cg-next').textContent.trim() }));
    check(label + ' "Não sei" revela a resposta e conta como erro', d.right && !d.wrong && /no/.test(d.cls) && d.log[0] === false && d.dkHidden && d.verdict.includes(X.revealed), d);
    check(label + ' botão "Continuar →"', d.next === X.cont, d.next);
    check(label + ' "Não sei" é silencioso', await page.evaluate(() => window.__sounds.length === 0));

    // 2ª frase: tecla 1 responde; progresso avançou para 10%
    await page.waitForTimeout(370);
    await page.click('#cg-next');
    await page.waitForSelector('.cg-choice:not(:disabled)');
    const w2 = await page.evaluate(() => document.querySelector('#conj-game-wrap .lesson-progress-fill').style.width);
    check(label + ' progresso avança no topo (10%)', w2 === '10%', w2);
    const ans2 = await page.evaluate(() => CONJ_GAMES_UI.state.order[CONJ_GAMES_UI.state.idx].ans);
    await page.keyboard.press(ans2 === 'a' ? '1' : '2');
    check(label + ' tecla numérica responde', await page.evaluate(() => CONJ_GAMES_UI.state.answered));
    check(label + ' som de acerto', await page.evaluate(() => window.__sounds.join() === 'true'));

    // termina o jogo; no fim: "Ver resultado →", dia de estudo contado, sem XP, evento de conclusão
    const before = await page.evaluate(() => ({ xp: STATE.xp, today: STATE.activityLog[todayStr()] || 0, last: STATE.lastStudyDay }));
    for (let i = 2; i <= 8; i++){
      await page.waitForTimeout(370); await page.click('#cg-next');
      if (i === 2){
        // erro de propósito na 3ª frase: tremida e som de erro (a contagem de acertos esperada no fim passa a 8 de 10 neste jogo)
        await page.evaluate(() => { const it = CONJ_GAMES_UI.state.order[CONJ_GAMES_UI.state.idx]; document.querySelector('.cg-choice[data-k="' + (it.ans === 'a' ? 'b' : 'a') + '"]').click(); });
        const w = await page.evaluate(() => ({ anim: getComputedStyle(document.querySelector('.cg-choice.is-wrong')).animationName, sounds: window.__sounds.join() }));
        check(label + ' erro: a resposta errada treme e toca o som de erro', /shakeWrong/.test(w.anim) && w.sounds === 'true,false', w);
        continue;
      }
      await page.evaluate(() => { const it = CONJ_GAMES_UI.state.order[CONJ_GAMES_UI.state.idx]; document.querySelector('.cg-choice[data-k="' + it.ans + '"]').click(); });
    }
    await page.waitForTimeout(370); await page.click('#cg-next');
    await page.evaluate(() => { const it = CONJ_GAMES_UI.state.order[CONJ_GAMES_UI.state.idx]; document.querySelector('.cg-choice[data-k="' + it.ans + '"]').click(); });
    const lastTxt = await page.evaluate(() => document.getElementById('cg-next').textContent.trim());
    check(label + ' última frase: "Ver resultado →"', lastTxt === X.see, lastTxt);
    await page.waitForTimeout(370); await page.click('#cg-next');
    await page.waitForSelector('.cg-result');
    const r = await page.evaluate(() => ({ xp: STATE.xp, today: STATE.activityLog[todayStr()] || 0, last: STATE.lastStudyDay, today_s: todayStr(),
      fill: document.querySelector('#conj-game-wrap .lesson-progress-fill').style.width,
      ev: window.__events.filter(e => e[0] === 'lesson_complete' && e[1] === 'conj_game').map(e => e[2]) }));
    check(label + ' fim: dia de estudo contado e XP inalterado', r.last === r.today_s && r.today === before.today + 1 && r.xp === before.xp, { before, r });
    check(label + ' fim: progresso 100% e evento lesson_complete', r.fill === '100%' && r.ev.length === 1 && r.ev[0].total === 10 && r.ev[0].hits === 8, r);
    // a comemoração de sequência (1º estudo do dia) aparece por cima do resultado; fechar para seguir o teste
    await page.waitForTimeout(800);
    check(label + ' fim: comemoração de sequência do 1º estudo do dia', await page.evaluate(() => getComputedStyle(document.getElementById('streak-modal-overlay')).display === 'flex'));
    await page.evaluate(() => { document.getElementById('streak-modal-overlay').style.display = 'none'; });
    if (OUT) await page.screenshot({ path: path.join(OUT, `resultado-${label}.png`) });

    // X sai do jogo (volta à lista, sai do foco)
    await page.click('#conj-game-wrap .activity-exit-btn');
    check(label + ' X sai do jogo e do modo foco', await page.evaluate(() => !document.body.dataset.activityFocus && document.getElementById('conj-select-wrap').style.display === 'block'));
    // ---- Prática da Conjugação (B2) ----
    await page.evaluate(() => { startConjSession(['avoir'], ['presente']); });
    await page.waitForSelector('#conj-practice-content .conj-verb-header');
    await page.waitForTimeout(200);
    if (OUT) await page.screenshot({ path: path.join(OUT, `pratica-${label}.png`) });
    const pr = await page.evaluate(() => {
      const c = document.getElementById('conj-practice-content'), bar = c.querySelector('.activity-lesson-bar'), vis = el => !!el && el.offsetParent !== null;
      return { first: !!bar && c.firstElementChild === bar, track: !!(bar && bar.querySelector('.lesson-progress-track')), flag: !!(bar && bar.querySelector('[data-report-flag]')),
        kbd: !!(bar && bar.querySelector('.activity-kbd-btn')), exit: !!(bar && bar.querySelector('.activity-exit-btn')),
        backHidden: !vis(document.getElementById('conj-back-to-select')), noThin: !document.querySelector('.conj-progress-bar'),
        width: bar ? bar.querySelector('.lesson-progress-fill').style.width : '', counter: (document.querySelector('.conj-progress span') || {}).textContent };
    });
    check(label + ' Prática: topo da trilha (progresso, ⚑, ⌨️, X) no alto do conteúdo', pr.first && pr.track && pr.flag && pr.kbd && pr.exit, pr);
    check(label + ' Prática: link de voltar escondido, barra fina removida, progresso 0%', pr.backHidden && pr.noThin && pr.width === '0%' && /1/.test(pr.counter || ''), pr);
    await page.click('#conj-verify-btn');
    await page.waitForSelector('#conj-next-verb-btn');
    check(label + ' Prática: depois de corrigir, a barra vai a 100% e continua uma só', await page.evaluate(() => document.querySelectorAll('#conj-practice-wrap .activity-lesson-bar').length === 1 && document.querySelector('#conj-practice-wrap .lesson-progress-fill').style.width === '100%'));
    await page.click('#conj-next-verb-btn');
    await page.waitForSelector('.conj-session-result');
    check(label + ' Prática: o resultado também tem a barra no topo', await page.evaluate(() => { const c = document.getElementById('conj-practice-content'); return c.firstElementChild.classList.contains('activity-lesson-bar'); }));
    await page.click('#conj-practice-wrap .activity-exit-btn');
    check(label + ' Prática: X volta à seleção e sai do foco', await page.evaluate(() => !document.body.dataset.activityFocus && document.getElementById('conj-select-wrap').style.display === 'block'));
    check(label + ' pageerrors = 0', errors.length === 0, errors);
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(`${passed}/${passed + failed} checks`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

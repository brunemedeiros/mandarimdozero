// Reformulação dos Jogos, etapa 1 (2026-11-06, docs/jogos-reformulacao-plano.md): progresso de cada jogo salvo na conta.
// STATE.conjGames[gameId] = { items: { itemId: { ok, at } }, rounds }: última resposta de cada frase, partidas terminadas;
// vai no serializeState (progress.data), volta pelo applySerializedState sem apagar nada (vence o dia mais recente);
// status do jogo (vistas/total, % pela última resposta, concluído = todas vistas e >= 70%); sair no meio guarda as respostas;
// o Recomeçar lista "Jogos da Conjugação". Sem XP. Etapa 2: lista no padrão das Expressões (painel, níveis, selo, exemplo, tema).
// Rodar: node tests/jogos-progresso/test_playwright.js
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
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
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  for (const lang of ['pt-BR', 'en']){
    const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 800 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
    await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
    await page.addInitScript(lg => { try { sessionStorage.setItem('guest_mode', '1'); localStorage.setItem('ui-language', lg); } catch (e) {} }, lang);
    await page.goto(`http://127.0.0.1:${port}/fr/index.html`);
    await page.waitForFunction(() => typeof STATE !== 'undefined' && STATE.cards && STATE.cards.length > 0 && CURRENT_USER === false, null, { timeout: 15000 });
    const L = lang + ':';
    check(L + ' STATE.conjGames começa vazio', await page.evaluate(() => JSON.stringify(STATE.conjGames) === '{}'));
    check(L + ' status sem progresso = 0, não concluído', await page.evaluate(() => { const s = conjGameStatus(CONJ_GAMES[0]); return s.seen === 0 && s.right === 0 && !s.done && s.total === CONJ_GAMES[0].items.length; }));

    // Partida inteira: acerta todas menos a 1ª (erra) e a 2ª ("Não sei").
    await page.evaluate(() => { switchTab('conjugaison'); });
    await page.click('#conj-mode-games');
    await page.click('.cg-play[data-game="etre-avoir"]');
    await page.waitForSelector('.cg-choice');
    const n = await page.evaluate(() => CONJ_GAMES_UI.state.order.length);
    const played = [];
    for (let i = 0; i < n; i++){
      const r = await page.evaluate(i => {
        const it = CONJ_GAMES_UI.state.order[CONJ_GAMES_UI.state.idx];
        if (i === 1) document.getElementById('cg-dontknow').click();
        else document.querySelector('.cg-choice[data-k="' + (i === 0 ? (it.ans === 'a' ? 'b' : 'a') : it.ans) + '"]').click();
        return it.id;
      }, i);
      played.push(r);
      await page.waitForTimeout(380);
      await page.click('#cg-next');
    }
    await page.waitForSelector('.cg-result');
    const st = await page.evaluate(() => JSON.parse(JSON.stringify(STATE.conjGames)));
    const rec = st['etre-avoir'] || { items: {} };
    check(L + ' partida terminada conta 1 rodada', rec.rounds === 1, rec.rounds);
    check(L + ' grava 1 registro por frase jogada', Object.keys(rec.items).length === n, Object.keys(rec.items));
    check(L + ' erro grava ok:false', rec.items[String(played[0])] && rec.items[String(played[0])].ok === false);
    check(L + ' "Não sei" grava ok:false', rec.items[String(played[1])] && rec.items[String(played[1])].ok === false);
    check(L + ' acerto grava ok:true com a data de hoje', await page.evaluate(id => { const e = STATE.conjGames['etre-avoir'].items[id]; return e.ok === true && e.at === todayStr(); }, String(played[2])));
    check(L + ' sem XP', await page.evaluate(() => STATE.xp === 0));
    const s1 = await page.evaluate(() => conjGameStatus(CONJ_GAMES.find(g => g.id === 'etre-avoir')));
    check(L + ' status: vistas = frases jogadas, acertos = n-2', s1.seen === n && s1.right === n - 2, s1);
    check(L + ' não concluído enquanto faltam frases (10 de 19)', !s1.done, s1);

    // Joga as frases restantes (todas certas) direto pelo registro: com tudo visto e >= 70%, fica concluído.
    const s2 = await page.evaluate(() => { const g = CONJ_GAMES.find(x => x.id === 'etre-avoir'); g.items.forEach(it => { if (!STATE.conjGames['etre-avoir'].items[String(it.id)]) recordConjGameAnswer(g.id, it.id, true); }); return conjGameStatus(g); });
    check(L + ' todas vistas e >= 70% = concluído', s2.done && s2.seen === s2.total && s2.pct >= 70, s2);
    const s3 = await page.evaluate(() => { const g = CONJ_GAMES.find(x => x.id === 'etre-avoir'); const items = g.items.slice(0, 7); items.forEach(it => recordConjGameAnswer(g.id, it.id, false)); return conjGameStatus(g); });
    check(L + ' última resposta errada derruba abaixo de 70% = não concluído', !s3.done && s3.pct < 70, s3);
    const sum = await page.evaluate(() => conjGamesSummary(CONJ_GAMES));
    check(L + ' resumo do topo: total de jogos e acertos', sum.total === 4 && sum.right === s3.right && sum.done === 0, sum);

    // Vai no save e volta sem apagar nada; vence o dia mais recente; registro malformado é ignorado.
    const rt = await page.evaluate(() => {
      const saved = serializeState();
      const has = !!saved.conjGames && JSON.stringify(saved.conjGames) === JSON.stringify(STATE.conjGames);
      const local = { 'etre-avoir': { items: { '1': { ok: false, at: '2026-01-02' }, '2': { ok: true, at: '2026-05-05' } }, rounds: 3 } };
      mergeConjGamesState(local, { 'etre-avoir': { items: { '1': { ok: true, at: '2026-03-01' }, '2': { ok: false, at: '2026-01-01' }, '3': { ok: 'x', at: '2026-01-01' }, '4': { ok: true, at: 'ontem' } }, rounds: 1 },
        'tu-vous': { items: { '5': { ok: true, at: '2026-02-02' } }, rounds: 2 }, '__proto__': { items: {} } });
      return { has, local };
    });
    check(L + ' serializeState leva conjGames', rt.has);
    check(L + ' junção: vence o dia mais recente', rt.local['etre-avoir'].items['1'].ok === true && rt.local['etre-avoir'].items['2'].ok === true, rt.local);
    check(L + ' junção: rodadas ficam com o maior número', rt.local['etre-avoir'].rounds === 3 && rt.local['tu-vous'].rounds === 2, rt.local);
    check(L + ' junção: registro malformado ignorado', !('3' in rt.local['etre-avoir'].items) && !('4' in rt.local['etre-avoir'].items), rt.local);
    const ap = await page.evaluate(() => { const copy = JSON.parse(JSON.stringify(STATE.conjGames)); STATE.conjGames = {}; applySerializedState({ conjGames: copy }); return JSON.stringify(STATE.conjGames) === JSON.stringify(copy); });
    check(L + ' applySerializedState devolve o progresso', ap);

    // Sair no meio: respostas ficam, partida não conta.
    await page.click('#cg-to-list');
    await page.click('.cg-play[data-game="tu-vous"]');
    await page.waitForSelector('.cg-choice');
    await page.evaluate(() => { const it = CONJ_GAMES_UI.state.order[0]; document.querySelector('.cg-choice[data-k="' + it.ans + '"]').click(); });
    await page.click('#conj-game-wrap .activity-exit-btn');
    const mid = await page.evaluate(() => STATE.conjGames['tu-vous']);
    check(L + ' sair no meio guarda a resposta e não conta rodada', mid && Object.keys(mid.items).length === 1 && mid.rounds === 0, mid);

    // Etapa 2 (lista no padrão das Expressões): painel, grupos por nível, selo só no concluído, frase de exemplo, tema, Premium.
    await page.evaluate(() => { const g = CONJ_GAMES.find(x => x.id === 'etre-avoir'); g.items.forEach(it => recordConjGameAnswer(g.id, it.id, true)); CONJ_GAMES_UI.renderList(); });
    const ls = await page.evaluate(() => {
      const q = s => document.querySelector(s), qa = s => [...document.querySelectorAll(s)];
      const card = id => q('.cg-game-card[data-game="' + id + '"]');
      return { label: q('.cg-summary .challenge-progress-label').textContent, hits: q('.cg-summary-hits').textContent, bar: q('.cg-summary .challenge-progress-fill').style.width,
        levels: qa('.cg-level-sections .challenges-level-section').map(x => x.dataset.level), ring: q('.challenges-level-section[data-level="A1"] .challenges-level-ring').textContent,
        doneSeal: (card('etre-avoir').querySelector('.expr-card-seal') || {}).textContent || '', doneCls: card('etre-avoir').classList.contains('completed'),
        pendSeal: !!card('tu-vous').querySelector('.expr-card-seal'), sample: card('etre-avoir').querySelector('.cg-card-sample').textContent, opts: card('etre-avoir').querySelector('.cg-card-opts').textContent,
        theme: card('tu-vous').querySelector('.expr-reg').textContent, prem: ['etre-avoir', 'pc-auxiliaire', 'tu-vous', 'pc-imparfait'].map(id => !!card(id).querySelector('.cg-premium')),
        hscroll: document.documentElement.scrollWidth > window.innerWidth + 1, noPt: lang => true };
    });
    const pt = lang === 'pt-BR';
    check(L + ' painel: "1 de 4" no idioma do site', pt ? ls.label === '1 de 4 jogos concluídos' : ls.label === '1 of 4 games completed', ls.label);
    check(L + ' painel: acertos e barra em 25%', /\d/.test(ls.hits) && (pt ? /acerto/.test(ls.hits) : /right answer/.test(ls.hits)) && ls.bar === '25%', ls);
    check(L + ' grupos por nível A1, A2 com anel 1/3', ls.levels.join() === 'A1,A2' && ls.ring === '1/3', ls);
    check(L + ' concluído com selo e %, pendente sem selo', ls.doneCls && /100%/.test(ls.doneSeal) && !ls.pendSeal, ls);
    check(L + ' frase de exemplo com as duas opções', /faim/.test(ls.sample) && ls.opts === "J'ai / Je suis", ls);
    check(L + ' tema no idioma do site', pt ? ls.theme === 'Formal ou informal' : ls.theme === 'Formal or informal', ls.theme);
    check(L + ' selo Premium só nos jogos não grátis', ls.prem.join() === 'false,true,true,false', ls.prem);
    check(L + ' celular sem rolagem horizontal', !ls.hscroll);
    await page.click('.challenges-level-heading[data-level="A1"]');
    check(L + ' recolher o nível esconde os cartões', await page.evaluate(() => document.querySelector('.challenges-level-section[data-level="A1"] .cg-cards').hidden && document.querySelector('.challenges-level-heading[data-level="A1"]').getAttribute('aria-expanded') === 'false'));
    await page.click('.challenges-level-heading[data-level="A1"]');

    // Recomeçar o curso lista os Jogos no que volta para o zero.
    const restartKey = await page.evaluate(() => t('restart.zero.games'));
    check(L + ' texto do Recomeçar existe no idioma do site', restartKey && restartKey !== 'restart.zero.games' && (lang === 'en' ? !/Jogos/.test(restartKey) : /Jogos/.test(restartKey)), restartKey);
    check(L + ' pageerrors = 0', errors.length === 0, errors);
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(`${passed}/${passed + failed} checks`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

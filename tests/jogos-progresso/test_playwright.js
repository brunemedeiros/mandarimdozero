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
    await page.click('.cg-play[data-game="etre-avoir"]'); await page.evaluate(() => { const b = document.querySelector('[data-cg-start="short"]') || document.querySelector('[data-cg-start]'); if (b) b.click(); });
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
    await page.click('.cg-play[data-game="tu-vous"]'); await page.evaluate(() => { const b = document.querySelector('[data-cg-start="short"]') || document.querySelector('[data-cg-start]'); if (b) b.click(); });
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
        pendSeal: !!card('tu-vous').querySelector('.expr-card-seal'), sample: card('etre-avoir').querySelector('.cg-card-sample').textContent, opts: card('etre-avoir').querySelector('.cg-card-hint').textContent,
        verbHint: card('pc-imparfait').querySelector('.cg-card-hint').textContent, lede: !!document.querySelector('.cg-card-lede'),
        order: qa('.challenges-level-section[data-level="A1"] .cg-game-card').map(c => c.dataset.game || c.dataset.soon),
        soon: qa('.cg-soon').map(c => c.closest('.challenges-level-section').dataset.level + ':' + c.dataset.soon), b1Count: !!document.querySelector('.challenges-level-section[data-level="B1"] .challenges-level-count'),
        theme: card('tu-vous').querySelector('.expr-reg').textContent, prem: ['etre-avoir', 'pc-auxiliaire', 'tu-vous', 'pc-imparfait'].map(id => !!card(id).querySelector('.cg-premium')),
        hscroll: document.documentElement.scrollWidth > window.innerWidth + 1, noPt: lang => true };
    });
    const pt = lang === 'pt-BR';
    check(L + ' painel: "1 de 4" no idioma do site', pt ? ls.label === '1 de 4 jogos concluídos' : ls.label === '1 of 4 games completed', ls.label);
    check(L + ' painel: acertos e barra em 25%', /\d/.test(ls.hits) && (pt ? /acerto/.test(ls.hits) : /right answer/.test(ls.hits)) && ls.bar === '25%', ls);
    check(L + ' grupos por nível A1, A2, B1 (só "em breve") com anel 1/3', ls.levels.join() === 'A1,A2,B1' && ls.ring === '1/3', ls);
    check(L + ' concluído com selo e %, pendente sem selo', ls.doneCls && /100%/.test(ls.doneSeal) && !ls.pendSeal, ls);
    check(L + ' cartão: frase do jogo com as duas opções entre parênteses, sem apresentação', /faim/.test(ls.sample) && ls.opts === '(avoir ou être)' && !ls.lede, ls);
    check(L + ' cartão do PC ou imparfait mostra o verbo', ls.verbHint === '(jouer)', ls.verbHint);
    check(L + ' nível: grátis primeiro, Premium depois, "em breve" no fim', ls.order.join() === 'etre-avoir,pc-auxiliaire,tu-vous,present-futur-proche', ls.order);
    check(L + ' "em breve" aprovados no nível certo; B1 sem contador', ls.soon.join() === 'A1:present-futur-proche,A2:futur-conditionnel,B1:indicatif-subjonctif' && !ls.b1Count, ls);
    check(L + ' tema no idioma do site', pt ? ls.theme === 'Formal ou informal' : ls.theme === 'Formal or informal', ls.theme);
    check(L + ' selo Premium só nos jogos não grátis', ls.prem.join() === 'false,true,true,false', ls.prem);
    check(L + ' celular sem rolagem horizontal', !ls.hscroll);
    await page.click('.challenges-level-heading[data-level="A1"]');
    check(L + ' recolher o nível esconde os cartões', await page.evaluate(() => document.querySelector('.challenges-level-section[data-level="A1"] .cg-level-body').hidden && document.querySelector('.challenges-level-heading[data-level="A1"]').getAttribute('aria-expanded') === 'false'));
    await page.click('.challenges-level-heading[data-level="A1"]');

    // Filtros (Todos / Pendentes / Concluídos): só filtram a exibição; "em breve" só em Todos.
    await page.click('[data-cg-filter="done"]');
    const fd = await page.evaluate(() => ({ cards: [...document.querySelectorAll('.cg-game-card')].map(c => c.dataset.game || c.dataset.soon), pressed: document.querySelector('[data-cg-filter="done"]').getAttribute('aria-pressed') }));
    check(L + ' filtro Concluídos: só o jogo concluído', fd.cards.join() === 'etre-avoir' && fd.pressed === 'true', fd);
    await page.click('[data-cg-filter="pending"]');
    const fp = await page.evaluate(() => [...document.querySelectorAll('.cg-game-card')].map(c => c.dataset.game || c.dataset.soon));
    check(L + ' filtro Pendentes: os 3 não concluídos, sem "em breve"', fp.join() === 'pc-auxiliaire,tu-vous,pc-imparfait', fp);
    await page.click('[data-cg-filter="all"]');
    check(L + ' "em breve" não abre jogo', await page.evaluate(() => { document.querySelector('.cg-soon').click(); return document.getElementById('conj-game-wrap').style.display !== 'block'; }));
    // Convite Premium no fim do grupo só com o bloqueio ligado (regra 7); grátis continua abrindo.
    check(L + ' bloqueio desligado: sem convite Premium', await page.evaluate(() => !document.querySelector('.cg-premium-invite')));
    const inv = await page.evaluate(() => { CONJ_GAMES_PAYWALL_ENABLED = true; const a = isChallengesAdmin; isChallengesAdmin = () => false; MY_PERMISSIONS = { conj_games: false }; CONJ_GAMES_UI.renderList();
      const r = [...document.querySelectorAll('.cg-premium-invite')].map(b => b.closest('.challenges-level-section').dataset.level + ':' + b.textContent.trim());
      document.querySelector('.cg-premium-invite').click(); const modal = getComputedStyle(document.getElementById('premium-games-modal')).display;
      document.getElementById('premium-games-modal').style.display = 'none'; CONJ_GAMES_PAYWALL_ENABLED = false; isChallengesAdmin = a; MY_PERMISSIONS = null; CONJ_GAMES_UI.renderList(); return { r, modal }; });
    check(L + ' bloqueio ligado: convite no fim do A1 (2 jogos) que abre a janela Premium', inv.r.length === 1 && /^A1:/.test(inv.r[0]) && /2/.test(inv.r[0]) && inv.modal === 'flex', inv);

    // Etapa 4: resultado com os erros e "Revisar erros" escrevendo; erros de outros dias voltam num cartão no topo.
    // a comemoração da sequência tem teste próprio (jogos-padrao-trilha); aqui ela só atrapalharia os cliques
    const hideStreak = () => page.evaluate(() => { const m = document.getElementById('streak-modal-overlay'); if (m) m.style.display = 'none'; });
    await page.evaluate(() => { maybeShowStreakCelebration = () => {}; const m = document.getElementById('streak-modal-overlay'); if (m) m.style.display = 'none'; STATE.conjGames = {}; CONJ_GAMES_UI.renderList(); });
    await page.click('.cg-play[data-game="etre-avoir"]'); await page.evaluate(() => { const b = document.querySelector('[data-cg-start="short"]') || document.querySelector('[data-cg-start]'); if (b) b.click(); });
    await page.waitForSelector('.cg-choice');
    const n2 = await page.evaluate(() => CONJ_GAMES_UI.state.order.length);
    for (let i = 0; i < n2; i++){
      await page.evaluate(i => { const it = CONJ_GAMES_UI.state.order[CONJ_GAMES_UI.state.idx];
        if (i === 1) document.getElementById('cg-dontknow').click();
        else document.querySelector('.cg-choice[data-k="' + (i === 0 ? (it.ans === 'a' ? 'b' : 'a') : it.ans) + '"]').click(); }, i);
      await page.waitForTimeout(380);
      await hideStreak();
      await page.click('#cg-next');
    }
    await page.waitForSelector('.cg-result');
    const rs = await page.evaluate(() => ({ items: document.querySelectorAll('.cg-review li').length, given: [...document.querySelectorAll('.cg-review-given')].map(x => x.textContent.trim()),
      strike: document.querySelectorAll('.cg-review-given s').length, btn: (document.getElementById('cg-mistakes') || {}).textContent, again: !!document.getElementById('cg-again') }));
    check(L + ' resultado: 2 erros, com o que a aluna respondeu (Não sei sem risco)', rs.items === 2 && rs.given.length === 2 && rs.strike === 1 && rs.again, rs);
    check(L + ' resultado: botão "Revisar erros" no idioma do site', rs.btn === (pt ? 'Revisar erros' : 'Review mistakes'), rs.btn);
    await hideStreak();
    await page.click('#cg-mistakes');
    await page.waitForSelector('#cg-input');
    const r0 = await page.evaluate(() => ({ mode: CONJ_GAMES_UI.state.mode, n: CONJ_GAMES_UI.state.order.length, choices: document.querySelectorAll('.cg-choice').length,
      keys: document.querySelectorAll('.cg-accents .fr-accent-key').length, disabled: document.getElementById('cg-check').disabled, hint: document.querySelector('.cg-verb').textContent, rounds: STATE.conjGames['etre-avoir'].rounds }));
    check(L + ' revisão: escrever (sem opções), 2 frases, teclado de acentos, Corrigir desligado com o campo vazio', r0.mode === 'type' && r0.n === 2 && r0.choices === 0 && r0.keys > 5 && r0.disabled, r0);
    check(L + ' revisão: dica com as duas opções', /avoir ou être/.test(r0.hint), r0.hint);
    await page.fill('#cg-input', 'xyz');
    await page.press('#cg-input', 'Enter'); // Enter no campo corrige
    const w = await page.evaluate(() => ({ ok: CONJ_GAMES_UI.state.log[0].ok, cls: document.querySelector('.cg-verdict').className, chk: getComputedStyle(document.getElementById('cg-check')).display, keys: getComputedStyle(document.querySelector('.cg-accents')).display, next: !!document.getElementById('cg-next'), attempt: !!document.querySelector('.cg-feedback .typed-attempt') }));
    check(L + ' revisão: errou -> vermelho, some o Corrigir e o teclado, sem desenho letra a letra', !w.ok && /no/.test(w.cls) && w.chk === 'none' && w.keys === 'none' && w.next && !w.attempt, w);
    await page.waitForTimeout(380); await hideStreak(); await page.click('#cg-next'); await page.waitForSelector('#cg-input');
    const exp = await page.evaluate(() => { const it = CONJ_GAMES_UI.state.order[1]; return it[it.ans]; });
    await page.fill('#cg-input', exp.toUpperCase()); await page.click('#cg-check');
    const c = await page.evaluate(() => ({ ok: CONJ_GAMES_UI.state.log[1].ok, cls: document.querySelector('.cg-verdict').className }));
    check(L + ' revisão: certo (maiúscula não importa)', c.ok && /ok/.test(c.cls), c);
    await page.waitForTimeout(380); await hideStreak(); await page.click('#cg-next');
    await page.waitForSelector('.cg-result');
    const rr = await page.evaluate(() => ({ title: document.querySelector('.cg-result .cg-title').textContent, again: !!document.getElementById('cg-again'), rounds: STATE.conjGames['etre-avoir'].rounds }));
    check(L + ' fim da revisão: título próprio, sem "Jogar de novo", não conta partida', rr.title === (pt ? 'Fim da revisão' : 'End of review') && !rr.again && rr.rounds === r0.rounds, rr);
    // "quase" (só acento) conta como acerto e mostra o desenho letra a letra
    const q = await page.evaluate(() => { const g = CONJ_GAMES.find(x => x.id === 'tu-vous'); const it = g.items.find(i => /ê/.test(i[i.ans])); CONJ_GAMES_UI.startReview([{ g, it }]); return it[it.ans]; });
    await page.waitForSelector('#cg-input');
    await page.fill('#cg-input', q.normalize('NFD').replace(/[\u0300-\u036f]/g, '')); await page.click('#cg-check');
    const qa = await page.evaluate(() => ({ ok: CONJ_GAMES_UI.state.log[0].ok, txt: document.querySelector('.cg-verdict').textContent, attempt: !!document.querySelector('.cg-feedback .typed-attempt') }));
    check(L + ' revisão: "quase" (sem acento) conta como acerto, com o desenho do erro', qa.ok && /Quase|Almost/.test(qa.txt) && qa.attempt, qa);
    await hideStreak(); await page.click('#conj-game-wrap .activity-exit-btn');
    // erros de outros dias: cartão no topo; erro de hoje não entra; jogo trancado não entra
    const due = await page.evaluate(() => { STATE.conjGames = { 'tu-vous': { items: { '1': { ok: false, at: '2026-01-01' }, '2': { ok: false, at: todayStr() }, '3': { ok: true, at: '2026-01-01' } }, rounds: 1 } }; CONJ_GAMES_UI.renderList();
      const a = { n: CONJ_GAMES_UI.dueEntries().length, card: (document.getElementById('cg-due') || {}).textContent || '' };
      CONJ_GAMES_PAYWALL_ENABLED = true; const adm = isChallengesAdmin; isChallengesAdmin = () => false; MY_PERMISSIONS = { conj_games: false };
      a.locked = CONJ_GAMES_UI.dueEntries().length; CONJ_GAMES_PAYWALL_ENABLED = false; isChallengesAdmin = adm; MY_PERMISSIONS = null; CONJ_GAMES_UI.renderList(); return a; });
    check(L + ' cartão "Revisar erros (1)": só o erro de outro dia; jogo trancado fica de fora', due.n === 1 && /\(1\)/.test(due.card) && due.locked === 0, due);
    await hideStreak();
    await page.click('#cg-due');
    await page.waitForSelector('#cg-input');
    const exp3 = await page.evaluate(() => { const it = CONJ_GAMES_UI.state.order[0]; return it[it.ans]; });
    await page.fill('#cg-input', exp3); await page.click('#cg-check');
    await page.waitForTimeout(380); await hideStreak(); await page.click('#cg-next');
    await page.waitForSelector('.cg-result');
    await page.click('#cg-to-list');
    check(L + ' acertou na revisão: sai da lista de outros dias', await page.evaluate(() => CONJ_GAMES_UI.dueEntries().length === 0 && !document.getElementById('cg-due')));

    // Etapa 5 + tela do jogo (2026-11-08): tocar no cartão abre a tela do jogo (título, apresentação, quanto já fez e
    // Curta x Completa); a escolha fica lembrada no aparelho; a partida Curta traz primeiro as frases não vistas.
    await page.evaluate(() => { try { localStorage.removeItem('conj-games-round'); } catch (e) {} STATE.conjGames = {}; CONJ_GAMES_UI.renderList(); });
    await hideStreak();
    await page.click('.cg-play[data-game="etre-avoir"]');
    await page.waitForSelector('.cg-intro');
    const t0 = await page.evaluate(() => ({ playing: !!document.querySelector('.cg-choice'), title: document.querySelector('#conj-game-content .cg-title').textContent,
      lede: (document.querySelector('.cg-intro-lede') || {}).textContent || '', status: !!document.querySelector('.cg-intro-status'), bar: !!document.querySelector('#conj-game-wrap .activity-exit-btn'),
      opts: [...document.querySelectorAll('[data-cg-start]')].map(b => b.dataset.cgStart + ':' + b.classList.contains('is-current') + ':' + b.querySelector('.cg-intro-opt-title').textContent.trim()),
      total: CONJ_GAMES.find(g => g.id === 'etre-avoir').items.length, toggleOnQuestion: !!document.querySelector('.cg-round') }));
    check(L + ' cartão abre a tela do jogo (sem começar), com título, apresentação e o X', !t0.playing && /avoir/.test(t0.title) && t0.lede.length > 30 && !t0.status && t0.bar, t0);
    check(L + ' tela do jogo: Curta (padrão, marcada) x Completa com o número de frases', t0.opts.length === 2 && /^short:true:.*10/.test(t0.opts[0]) && /^full:false:/.test(t0.opts[1]) && t0.opts[1].includes(String(t0.total)), t0.opts);
    await page.click('[data-cg-start="short"]'); await page.waitForSelector('.cg-choice');
    const q0 = await page.evaluate(() => ({ n: CONJ_GAMES_UI.state.order.length, toggle: !!document.querySelector('[data-cg-start]') }));
    check(L + ' Curta: 10 frases, sem escolha em cima da frase', q0.n === 10 && !q0.toggle, q0);
    const first = await page.evaluate(() => CONJ_GAMES_UI.state.order.map(i => i.id));
    for (let i = 0; i < q0.n; i++){
      await page.evaluate(() => { const it = CONJ_GAMES_UI.state.order[CONJ_GAMES_UI.state.idx]; document.querySelector('.cg-choice[data-k="' + it.ans + '"]').click(); });
      await page.waitForTimeout(380); await hideStreak(); await page.click('#cg-next');
    }
    await page.waitForSelector('.cg-result'); await hideStreak();
    await page.click('#cg-again'); await page.waitForSelector('.cg-choice'); // "Jogar de novo" vai direto, no mesmo tamanho
    const second = await page.evaluate(() => CONJ_GAMES_UI.state.order.map(i => i.id));
    const unseen = t0.total - first.length;
    check(L + ' "Jogar de novo" direto: a 2ª partida curta traz todas as ' + unseen + ' frases ainda não vistas', second.filter(id => !first.includes(id)).length === unseen && second.length === 10, { first, second });
    await hideStreak(); await page.click('#conj-game-wrap .activity-exit-btn');
    await page.click('.cg-play[data-game="etre-avoir"]'); await page.waitForSelector('.cg-intro');
    const st1 = await page.evaluate(() => (document.querySelector('.cg-intro-status') || {}).textContent || '');
    check(L + ' tela do jogo mostra quanto já fez', /19/.test(st1) && (pt ? /frases respondidas/.test(st1) : /sentences answered/.test(st1)), st1);
    await page.click('[data-cg-start="full"]'); await page.waitForSelector('.cg-choice');
    const f = await page.evaluate(() => ({ n: CONJ_GAMES_UI.state.order.length, ids: new Set(CONJ_GAMES_UI.state.order.map(i => i.id)).size, saved: localStorage.getItem('conj-games-round') }));
    check(L + ' Completa: todas as frases do jogo, sem repetir, e lembrada', f.n === t0.total && f.ids === t0.total && f.saved === 'full', f);
    await hideStreak(); await page.click('#conj-game-wrap .activity-exit-btn');
    await page.click('.cg-play[data-game="pc-imparfait"]'); await page.waitForSelector('.cg-intro');
    check(L + ' na próxima tela do jogo a Completa já vem marcada', await page.evaluate(() => document.querySelector('[data-cg-start="full"]').classList.contains('is-current')));
    await page.keyboard.press('1'); await page.waitForSelector('.cg-choice'); // atalho 1 = Curta
    check(L + ' tecla 1 escolhe Curta (10) e lembra', await page.evaluate(() => CONJ_GAMES_UI.state.order.length === 10 && localStorage.getItem('conj-games-round') === 'short'));
    await hideStreak(); await page.click('#conj-game-wrap .activity-exit-btn');
    check(L + ' X na tela do jogo volta para a lista', await page.evaluate(() => { CONJ_GAMES_UI.openIntro('tu-vous'); document.querySelector('#conj-game-wrap .activity-exit-btn').click(); return document.getElementById('conj-select-wrap').style.display === 'block' && !!document.querySelector('.cg-game-card'); }));

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

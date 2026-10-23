// Paridade, etapa 5a (docs/historico/27-paridade-conjugacao.md): a tela da Conjugação saiu do fr/app.js para
// shared/conjugacao.js (motor) + fr/conj-config.js (o que é do francês) + shared/conjugacao.css. Este teste prova que o
// fr faz EXATAMENTE o mesmo que antes, rodando a mesma sequência no fr de REF (main antes da mudança, num worktree
// temporário) e no fr desta árvore, no navegador de verdade (Playwright), e comparando tudo:
//  - correção (conjEvaluate) de TODOS os verbos x tempos x pessoas, com variações do que a aluna digita: certa, sem
//    acento, maiúscula, com espaço, letra a menos, letra trocada, acento trocado, feminino/plural (être), forma de outro
//    tempo, vazia, e o HTML "Sua resposta" (conjAnswerViewHTML) de cada uma; rótulo da pessoa (je/j', que je/qu'il),
//    texto falado, forma esperada (inclusive futur proche montado na hora), dica (conjHintPlaceholder);
//  - busca: conjSearchVerbs para os prefixos de todos os verbos e traduções e consultas soltas ("comer", "etre",
//    "se lever"...), e o HTML da lista;
//  - tela de escolha (HTML depois de cada clique: regulares/irregulares, tamanho, Top N, chips da busca);
//  - sessão inteira pelo DOM (sorteio com semente, dica, acento pelo teclado, Enter, corrigir, voltar, resultado,
//    "Praticar só os que errei"): HTML de cada página, CONJ_STATE, STATE.daily, XP, missões do dia, estado salvo;
//  - aba Jogos (lista, selo com a trava ligada x desligada, janela Premium) e um jogo inteiro.
// Rodar: node tests/paridade-sites/test_conjugacao.js   (REF padrão f22bda99; PARIDADE_5A_REF=<commit> para outro)
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..', '..');
const REF = process.env.PARIDADE_5A_REF || 'f22bda99';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
function serve(root){
  return http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    const f = path.join(root, p);
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
  });
}
const STUB = `(function(){
  const b = new Proxy({}, { get(_, p){ if (p === 'then') return (ok) => Promise.resolve({ data: [], error: null }).then(ok); return () => b; } });
  const client = { auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: async () => ({}) },
    from: () => b, channel: () => ({ on(){ return this; }, subscribe(){ return this; } }),
    storage: { from: () => ({}) }, functions: { invoke: async () => ({ data: null, error: null }) }, rpc: async () => ({ data: null, error: null }) };
  window.supabase = { createClient: () => client };
})();`;

let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? String(typeof x === 'string' ? x : JSON.stringify(x)).slice(0, 700) : ''); } };

async function fingerprint(browser, root){
  const server = serve(root);
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1200, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.clock.install({ time: new Date('2026-10-14T12:00:00Z') });
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await page.addInitScript(() => {
    try { sessionStorage.setItem('guest_mode', '1'); localStorage.setItem('ui-language', 'pt-BR'); } catch (e) {}
    let s = 12345; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647;
    window.__seed = (n) => { s = n; };
  });
  await page.goto(`http://127.0.0.1:${port}/fr/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && CURRENT_USER === false, null, { timeout: 20000 });
  await page.evaluate(() => { window.speechSynthesis && (window.speechSynthesis.speak = () => {}); HTMLMediaElement.prototype.play = function(){ return Promise.resolve(); }; });
  const out = {};
  const grab = async (name, fn, arg) => { out[name] = await page.evaluate(fn, arg); };
  const click = (sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) throw new Error('sem ' + s); e.click(); }, sel);
  const html = (sel) => page.evaluate((s) => { const e = document.querySelector(s); return e ? e.innerHTML : null; }, sel);
  const view = () => html('#view-conjugaison');
  const state = () => page.evaluate(() => JSON.stringify({ conj: CONJ_STATE, checked: CONJ_STATE.checked ? [...CONJ_STATE.checked] : null,
    daily: STATE.daily, xp: STATE.xp, modes: STATE.modesUsed, saved: serializeState(),
    missions: REVISAO_CONJ_CHALLENGES.map(c => [c.id, c.icon, c.label, c.target, c.get(STATE.daily)]) }));

  // ---- 1. estado inicial e tela de escolha
  out.estado_inicial = await state();
  await page.evaluate(() => switchTab('conjugaison'));
  out.escolha = await view();
  out.letras = await page.evaluate(() => conjAccentLetters().join(''));
  out.teclado = await page.evaluate(() => conjAccentPickerHTML());

  // ---- 2. correção de todos os verbos x tempos x pessoas, com as variações do que a aluna digita
  await grab('correcao', () => {
    const strip = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
    const swapAccent = s => s.replace(/é/, 'è').replace(/â/, 'a').replace(/ç/, 'c');
    const tenses = ['presente', 'passeCompose', 'imparfait', 'plusQueParfait', 'futurSimple', 'condPresente', 'subjPresente', 'imperatif', 'futurProche'];
    const res = {};
    Object.keys(CONJUGATION_VERBS).forEach(verb => {
      const rows = [];
      tenses.forEach((tk, ti) => {
        const forms = getConjForms(verb, tk) || [];
        rows.push(JSON.stringify(forms));
        for (let i = 0; i < 6; i++){
          const exp = forms[i] || '';
          rows.push(conjPersonLabel(i, exp, tk) + '|' + conjSpeakText(i, tk, exp) + '|' + conjHintPlaceholder(exp, 1) + '|' + conjHintPlaceholder(exp, 2));
          if (tk === 'futurProche') continue; // só forma/rótulo: a prática não oferece o futur proche
          rows.push(JSON.stringify(conjExpectedInfo(verb, tk, i)));
          const other = (getConjForms(verb, tenses[(ti + 1) % 8]) || [])[i] || '';
          const variants = [exp, strip(exp), exp.toUpperCase(), ' ' + exp + ' ', exp.slice(0, -1), exp.slice(0, -1) + 'x', swapAccent(exp), exp + 'e', exp + 'es', other, strip(other), ''];
          variants.forEach(v => {
            const ev = conjEvaluate(verb, tk, i, v);
            rows.push(v + '=>' + ev.status + '|' + ev.target + '|' + JSON.stringify(ev.otherForm) + '|' + conjAnswerViewHTML(v, ev.target, ev.status) + '|' + conjAnswerViewHTML(v, ev.target));
          });
        }
      });
      res[verb] = rows.join('\n');
    });
    return res;
  });
  await grab('mask', () => ['presente', 'imperatif', 'subjPresente', 'futurProche'].map(k => conjActiveMask(k).join()));

  // ---- 3. busca
  await grab('busca', () => {
    const qs = new Set(['comer', 'etre', 'être', 'fin', 'se lever', "s'asseoir", 'se', 'a', 'ir', 'manger', 'xyzw', 'FAZER', 'ter', 'Morar', 'ÉTRE', '  parler ', 'ser', "s'", 'abc', 'é']);
    Object.keys(CONJUGATION_VERBS).forEach(v => { qs.add(v.slice(0, 2)); qs.add(v.slice(0, 3)); qs.add(v.slice(1, 5)); });
    Object.values(VERB_TRANSLATIONS).forEach(tr => String(tr).split('/').forEach(x => { x = x.trim(); qs.add(x.slice(0, 3)); qs.add(x); }));
    return [...qs].map(q => q + '=>' + JSON.stringify(conjSearchVerbs(q)) + JSON.stringify(conjSearchVerbs(q, 3)));
  });
  for (const q of ['comer', 'etre', 'xyzw', 'fin', 'morar']){
    await page.fill('#conj-search-input', q);
    out['busca_lista_' + q] = await html('#conj-search-list');
  }
  await page.fill('#conj-search-input', '');
  // teclado na busca: ↓ ↑ Enter vira chip; Backspace com campo vazio tira o último
  await page.click('#conj-search-input'); await page.keyboard.type('comer'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowUp'); await page.keyboard.press('Enter');
  await page.keyboard.type('etre'); await page.keyboard.press('Enter');
  out.chips = await view();
  out.chips_estado = await state();
  await page.keyboard.press('Backspace');
  out.chips_back = await html('#conj-picked');
  await page.keyboard.type('fin'); await page.keyboard.press('Escape');
  out.esc = await html('#conj-search-list') + '|' + await page.inputValue('#conj-search-input');
  await page.evaluate(() => document.querySelector('.conj-chip-x').click());
  out.chips_x = await view();

  // ---- 4. filtros
  await click('#conj-toggle-regular'); out.f_regular = await view();
  await click('#conj-toggle-irregular'); out.f_irregular = await view();
  await page.focus('#conj-toggle-irregular'); await page.keyboard.press('Enter'); out.f_teclado = await view();
  await page.selectOption('#conj-size-select', '5'); await page.selectOption('#conj-topn-select', '25');
  await page.evaluate(() => { document.querySelector('#conj-tense-list input[data-tense="passeCompose"]').click(); document.querySelector('#conj-tense-list input[data-tense="imperatif"]').click();
    document.querySelector('#conj-verb-list input[data-group="g2"]').click(); });
  out.f_marcados = await view();
  out.f_estado = await state();
  // nada marcado: aviso
  await page.evaluate(() => { CONJ_STATE.selectedTenses = []; });
  await click('#conj-start-btn');
  out.f_vazio = await page.evaluate(() => (document.querySelector('.toast, #toast') || {}).textContent || '') + '|' + await page.evaluate(() => document.getElementById('conj-practice-wrap').style.display);
  await page.evaluate(() => { CONJ_STATE.selectedTenses = ['presente', 'passeCompose', 'imperatif']; renderConjSelectScreen(); });

  // ---- 5. sessão inteira pelo DOM (sorteio com semente)
  await page.evaluate(() => __seed(2026));
  await click('#conj-start-btn');
  out.s_estado0 = await state();
  const n = await page.evaluate(() => CONJ_STATE.verbQueue.length);
  for (let k = 0; k < n; k++){
    out['s_p' + k] = await view();
    // dica duas vezes, um acento pelo teclado, Enter, e respostas variadas
    await click('#conj-hint-btn'); out['s_dica1_' + k] = await view();
    await click('#conj-hint-btn'); out['s_dica2_' + k] = await view();
    await page.click('.conj-field input[data-idx]:not(:disabled)');
    await page.evaluate(() => document.querySelector('.conj-accents .fr-accent-key').click());
    await page.keyboard.press('Enter');
    out['s_foco' + k] = await page.evaluate(() => document.activeElement && document.activeElement.id);
    await page.evaluate((k) => {
      const strip = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
      const verb = CONJ_STATE.verbQueue[CONJ_STATE.verbIndex];
      let j = 0;
      document.querySelectorAll('.conj-field input[data-idx]:not(:disabled)').forEach((inp) => {
        const exp = (getConjForms(verb, inp.dataset.tense) || [])[Number(inp.dataset.idx)] || '';
        const m = (j++ + k) % 5;
        inp.value = m === 0 ? exp : m === 1 ? strip(exp) : m === 2 ? exp.slice(0, -1) : m === 3 ? '' : exp + 'e';
      });
    }, k);
    await click('#conj-verify-btn');
    out['s_corrigido' + k] = await view();
    out['s_estado' + k] = await state();
    if (k === 1){ await click('#conj-prev-verb-btn'); out.s_voltou = await view(); await click('#conj-next-verb-btn'); }
    await click('#conj-next-verb-btn');
  }
  out.s_resultado = await view();
  out.s_estado_fim = await state();
  await click('#conj-practice-mistakes-btn');
  out.s_erros = await view();
  out.s_erros_estado = await state();
  // sessão sem erro nenhum (botão "Nova sessão" em destaque) e volta à escolha
  await page.evaluate(() => startConjSession(['aller'], ['passeCompose']));
  await page.evaluate(() => { const v = ['suis allée', 'es allé', 'est allées', 'sommes allés', 'êtes allée', 'sont allées']; document.querySelectorAll('.conj-field input[data-idx]').forEach((inp, k) => { inp.value = v[k]; }); });
  await click('#conj-verify-btn');
  out.s_etre = await view();
  await click('#conj-next-verb-btn');
  out.s_perfeito = await view();
  await click('#conj-restart-btn');
  out.s_reinicio = await view();
  out.s_estado_reinicio = await state();
  await page.evaluate(() => startConjSession(['parler'], ['presente']));
  await click('#conj-back-to-select');
  out.s_voltar_escolha = await view();

  // ---- 6. Jogos: lista, selo (trava desligada e ligada), janela Premium e um jogo inteiro
  await click('#conj-mode-games');
  out.j_lista = await view();
  await page.evaluate(() => { CONJ_GAMES_PAYWALL_ENABLED = true; isChallengesAdmin = () => false; setConjMode('games'); });
  out.j_trava = await view();
  out.j_trava_lock = await page.evaluate(() => [isConjGameLocked(), conjGamesUnlocked()]);
  await click('.cg-play[data-game="pc-imparfait"]');
  out.j_janela = await page.evaluate(() => { const m = document.getElementById('premium-games-modal'); return m.style.display + '|' + m.innerHTML; });
  await click('#premium-games-modal-close');
  await page.evaluate(() => { CONJ_GAMES_PAYWALL_ENABLED = false; setConjMode('games'); __seed(31); });
  await click('.cg-play[data-game="tu-vous"]');
  for (let i = 0; i < 12; i++){
    const done = await page.evaluate(() => !document.querySelector('.cg-choice'));
    if (done) break;
    out['j_q' + i] = await html('#conj-game-content');
    await page.evaluate((i) => { const it = CONJ_GAMES_UI.state.order[CONJ_GAMES_UI.state.idx]; const k = i % 3 === 1 ? (it.ans === 'a' ? 'b' : 'a') : it.ans; document.querySelector('.cg-choice[data-k="' + k + '"]').click(); }, i);
    await page.clock.runFor(400);
    out['j_r' + i] = await html('#conj-game-content');
    await click('#cg-next');
  }
  out.j_fim = await html('#conj-game-content');
  await click('#conj-game-back');
  // teclado nas abas (← →)
  await page.focus('#conj-mode-games'); await page.keyboard.press('ArrowLeft');
  out.j_abas = await page.evaluate(() => [document.activeElement.id, document.getElementById('conj-practice-pane').hidden, document.getElementById('conj-games-pane').hidden].join());
  out.j_estado = await state();
  // site em inglês: frases de exemplo sem a tradução em português
  await page.evaluate(() => { window.__ui = window.getUiLang; window.getUiLang = () => 'en'; renderConjSelectScreen(); });
  out.en_escolha = await html('#conj-tense-list');
  await page.evaluate(() => { window.getUiLang = window.__ui; renderConjSelectScreen(); });
  out.erros = errors;
  await ctx.close();
  server.close();
  return out;
}

(async () => {
  let wt = null;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  try {
    wt = fs.mkdtempSync(path.join(os.tmpdir(), 'paridade-5a-'));
    execFileSync('git', ['worktree', 'add', '--detach', '-f', wt, REF], { cwd: ROOT, stdio: 'ignore' });
    const antes = await fingerprint(browser, wt);
    const depois = await fingerprint(browser, ROOT);
    check('a sequência rodou no fr de antes', Object.keys(antes).length > 60, Object.keys(antes).length);
    check('fr de antes: sem erro de página', antes.erros.length === 0, antes.erros);
    check('fr de agora: sem erro de página', depois.erros.length === 0, depois.erros);
    check('mesmas cenas', JSON.stringify(Object.keys(antes)) === JSON.stringify(Object.keys(depois)), [Object.keys(antes).length, Object.keys(depois).length]);
    let iguais = 0, total = 0;
    const norm = (v) => JSON.stringify(v).replace(/127\.0\.0\.1:\d+/g, 'HOST');
    for (const k of Object.keys(antes)){
      if (k === 'erros') continue;
      if (k === 'correcao'){ // um resultado por verbo
        for (const verb of Object.keys(antes.correcao)){
          total++;
          if (antes.correcao[verb] === (depois.correcao || {})[verb]){ iguais++; passed++; continue; }
          check('correção igual: ' + verb, false, { antes: antes.correcao[verb].slice(0, 300) });
        }
        continue;
      }
      total++;
      const a = norm(antes[k]), b = norm(depois[k]);
      if (a === b){ iguais++; passed++; continue; }
      let i = 0; while (i < a.length && a[i] === b[i]) i++;
      check('igual ao fr de antes: ' + k, false, { antes: a.slice(Math.max(0, i - 160), i + 200), depois: (b || '').slice(Math.max(0, i - 160), i + 200) });
    }
    // sanidade: as cenas mostram o que deviam
    const nCorr = Object.values(depois.correcao).reduce((n, s) => n + (s.match(/=>/g) || []).length, 0);
    check('correção cobriu os 241 verbos', Object.keys(depois.correcao).length === 241, Object.keys(depois.correcao).length);
    check('correção: dezenas de milhares de respostas, com ok, almost e wrong', nCorr > 100000 && /=>ok\|/.test(depois.correcao['parler']) && /=>almost\|/.test(depois.correcao['parler']) && /=>wrong\|/.test(depois.correcao['parler']), nCorr);
    check('elisão e "que": j\'ai, que j\', qu\'ils', /^j'\|j'ai/m.test(depois.correcao['avoir']) && /que j'/.test(depois.correcao['avoir']) && /qu'ils \/ qu'elles/.test(depois.correcao['parler']));
    check('futur proche montado na hora (vais parler)', /"vais parler"/.test(depois.correcao['parler']));
    check('busca: "comer" acha manger', /^comer=>\[\{"verb":"manger"/m.test(depois.busca.join('\n')));
    check('sessão teve resultado e "Praticar só os que errei"', /conj-session-result/.test(depois.s_resultado) && /conj-practice-mistakes-btn/.test(depois.s_resultado));
    check('XP e missões andaram na sessão', JSON.parse(depois.s_estado_fim).daily.conjugationSessions === 1 && JSON.parse(depois.s_estado_fim).xp > JSON.parse(depois.estado_inicial).xp);
    check('jogo inteiro até o resultado', /cg-result/.test(depois.j_fim));
    console.log(`  cenas iguais ao fr de antes: ${iguais}/${total} (correção: ${nCorr} respostas em 241 verbos)`);
  } finally {
    await browser.close();
    if (wt){ try { execFileSync('git', ['worktree', 'remove', '--force', wt], { cwd: ROOT, stdio: 'ignore' }); } catch (e) {} }
  }
  console.log(`Conjugação (fr antes x depois): ${passed} passaram, ${failed} falharam`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

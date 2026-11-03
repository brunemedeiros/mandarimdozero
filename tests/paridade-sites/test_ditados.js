// Paridade, etapa 5b (docs/historico/28-paridade-ditados.md): os Ditados saíram do fr/app.js para shared/ditados.js
// (motor) + fr/ditados-config.js (o que é do francês) + shared/ditados.css. Este teste prova que o fr faz EXATAMENTE o
// mesmo que antes, rodando a mesma sequência no fr de REF (main antes da mudança, num worktree temporário) e no fr desta
// árvore, no navegador de verdade (Playwright), e comparando tudo:
//  - correção de TODOS os ditados de fr/dictations.js com dezenas de variações do que a aluna digita (certa, minúsculas,
//    sem acento, sem pontuação, sem hífen, sem apóstrofo, apóstrofo curvo, œ -> oe, número em dígito, pontuação falada
//    "virgule"/"point", composto separado "vingt cinq", homófonos a/à et/est ces/ses..., concordância +e/+s, palavra
//    faltando, palavra a mais, palavras trocadas, erros de digitação com semente, frases fora de ordem, vazio...):
//    evaluateDictation, notas (classifyDictationError, dictationLightNoteText), frases e marcas por frase, palavras para
//    revisar, registro da tentativa (updateDictationRecord/sanitizeDictationRecord);
//  - a TELA: lista (geral, por módulo, "Revisão do A1", progresso), player, e o
//    resultado renderizado pelo DOM para cada variação (HTML com os erros marcados), com STATE.dictations,
//    STATE.dictationsAced, o estado salvo (serializeState), as conquistas (collectBadgeMetrics) e o XP depois de cada uma;
//  - botões do player (tocar/pausar, -15/+15, velocidade, volume/mudo, voltar ao início), áudio por frase com 404 caindo
//    na voz, "Refazer", "Verificar" vazio, os "voltar", a linha "Revisão do A1" da trilha e o site em inglês.
// Rodar: node tests/paridade-sites/test_ditados.js   (REF padrão 11ddcb84; PARIDADE_5B_REF=<commit> para outro)
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..', '..');
const { etapa7 } = require('./etapa7-neutro.js'); // Etapa 7 (2026-10-31): vocabulário aprovado pela dona
const REF = process.env.PARIDADE_5B_REF || '11ddcb84';
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

// Variações do que a aluna digita, a partir do texto certo (determinísticas: semente por ditado).
const VARIANTS_SRC = `(function(){
  window.__variants = function(text, seed){
    let s = seed; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const words = text.split(/\\s+/);
    const strip = x => x.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
    const typo = (w) => { if (w.length < 3) return w + 'x'; const i = 1 + Math.floor(rnd() * (w.length - 2)); return w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2); };
    const out = {
      certa: text,
      minusculas: text.toLowerCase(),
      sem_acento: strip(text),
      sem_pontuacao: text.replace(/[.,!?;:«»"…]/g, ''),
      sem_pontuacao_final: text.replace(/[.!?…]+(\\s|$)/g, '$1'),
      sem_hifen: text.replace(/-/g, ' '),
      hifen_colado: text.replace(/-/g, ''),
      sem_apostrofo: text.replace(/'/g, ''),
      apostrofo_espaco: text.replace(/'/g, "' "),
      apostrofo_curvo: text.replace(/'/g, '\\u2019'),
      aspas_curvas: text.replace(/"/g, '\\u201c'),
      oe: text.replace(/œ/g, 'oe').replace(/Œ/g, 'Oe'),
      espacos: '  ' + text.replace(/ /g, '   ') + '  ',
      quebras: text.replace(/\\. /g, '.\\n'),
      digitos: text.replace(/\\bvingt-cinq\\b/g, '25').replace(/\\bdeux\\b/g, '2').replace(/\\btrois\\b/g, '3').replace(/\\bdix\\b/g, '10').replace(/\\bhuit\\b/g, '8').replace(/\\bsept\\b/g, '7').replace(/\\bquinze\\b/g, '15').replace(/\\bcinq\\b/g, '5'),
      falada: text.replace(/,/g, ' virgule').replace(/\\./g, ' point').replace(/\\?/g, " point d'interrogation").replace(/!/g, " point d'exclamation"),
      homofonos: text.replace(/\\bà\\b/g, 'a').replace(/\\best\\b/g, 'et').replace(/\\bces\\b/g, 'ses').replace(/\\bou\\b/g, 'où').replace(/\\bson\\b/g, 'sont'),
      homofonos2: text.replace(/\\ba\\b/g, 'à').replace(/\\bet\\b/g, 'est').replace(/\\bc'est\\b/gi, "s'est").replace(/\\bmes\\b/g, 'mais'),
      concordancia: words.map((w, i) => i % 4 === 2 && /^[a-zà-ÿ]{4,}$/i.test(w) ? w + (i % 8 === 2 ? 'e' : 's') : w).join(' '),
      falta_palavra: words.filter((_, i) => i % 5 !== 3).join(' '),
      palavra_a_mais: words.map((w, i) => i % 6 === 2 ? w + ' très' : w).join(' '),
      trocadas: words.map((w, i, a) => i % 7 === 1 && a[i + 1] ? a[i + 1] : (i % 7 === 2 ? a[i - 1] : w)).join(' '),
      erros_digitacao: words.map((w, i) => i % 3 === 0 ? typo(w) : w).join(' '),
      erros_muitos: words.map((w) => rnd() < 0.5 ? typo(w) : w).join(' '),
      acento_trocado: text.replace(/é/g, 'è').replace(/à/g, 'â').replace(/ç/g, 'c'),
      maiusculas: text.toUpperCase(),
      so_metade: words.slice(0, Math.ceil(words.length / 2)).join(' '),
      frases_invertidas: text.split(/(?<=[.!?])\\s+/).reverse().join(' '),
      repetida: text + ' ' + text,
      uma_palavra: words[0],
      lixo: 'xyz abc qwe',
      abreviacoes: text.replace(/\\bMonsieur\\b/g, 'M.').replace(/\\bMadame\\b/g, 'Mme').replace(/\\bM\\. /g, 'Monsieur '),
      etc: text.replace(/\\.$/, ', etc.'),
      sem_espaco_pontuacao: text.replace(/ ([!?;:»])/g, '$1').replace(/« /g, '«'),
      ponto_virgula: text.replace(/,/g, ';'),
    };
    return out;
  };
})();`;

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
  // mp3 de frase: s1 existe, os outros dão 404 (para cair na voz do navegador)
  await page.addInitScript(() => {
    try { sessionStorage.setItem('guest_mode', '1'); localStorage.setItem('ui-language', 'pt-BR'); } catch (e) {}
    let s = 12345; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647;
    window.__seed = (n) => { s = n; };
  });
  await page.addInitScript(VARIANTS_SRC);
  await page.goto(`http://127.0.0.1:${port}/fr/index.html`);
  await page.waitForFunction(() => typeof STATE !== 'undefined' && CURRENT_USER === false, null, { timeout: 20000 });
  await page.evaluate(() => {
    window.__spoken = [];
    window.speechSynthesis && (window.speechSynthesis.speak = (u) => { window.__spoken.push(u && u.text); });
    window.__plays = [];
    HTMLMediaElement.prototype.play = function(){ window.__plays.push(this.src.replace(/^https?:\/\/[^/]+/, '')); return Promise.resolve(); };
    window.__toasts = []; const st = window.showToast; window.showToast = (m) => { window.__toasts.push(m); };
    showStreakCelebration = () => {};
  });
  const out = {};
  const html = (sel) => page.evaluate((s) => { const e = document.querySelector(s); return e ? e.innerHTML : null; }, sel);
  const click = (sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) throw new Error('sem ' + s); e.click(); }, sel);
  const state = () => page.evaluate(() => JSON.stringify({ dictations: STATE.dictations, aced: STATE.dictationsAced, xp: STATE.xp,
    daily: STATE.daily, modes: STATE.modesUsed, saved: serializeState(), badges: typeof collectBadgeMetrics === 'function' ? collectBadgeMetrics(STATE) : null }));

  out.estado_inicial = await state();

  // ---- 1. funções puras: todos os ditados x todas as variações
  out.puras = await page.evaluate(() => {
    const res = {};
    DICTATIONS.forEach((d, di) => {
      const rows = [];
      rows.push(JSON.stringify(splitDictationSentences(d.text)));
      rows.push(JSON.stringify(tokenizeDictationText(d.text)));
      rows.push(dictationAudioPath(d) + '|' + dictationSentenceAudioPath(d, 2) + '|' + dictationTask(d) + '|' + moduleTitleFor(d.moduleId) + '|' + dictationTier(d) + '|' + isDictationLocked(d));
      const vs = window.__variants(d.text, 1000 + di);
      let prev = undefined;
      Object.keys(vs).forEach(k => {
        const ev = evaluateDictation(d.text, vs[k]);
        rows.push(k + '=>' + JSON.stringify(ev));
        rows.push('  prep=' + prepareDictationUserText(vs[k], d.text));
        rows.push('  notas=' + JSON.stringify(ev.merged.map(x => x.type === 'match' && x.light ? dictationLightNoteText(x) : x.type === 'sub' ? classifyDictationError(x.correct, x.wrong) : null)));
        rows.push('  frases=' + JSON.stringify(dictationSentenceErrorFlags(d.text, ev)) + ' revisar=' + JSON.stringify(dictationWrongWords(ev)));
        const rec = updateDictationRecord(prev, ev, new Date('2026-10-14T12:00:00Z'));
        rows.push('  registro=' + JSON.stringify(rec) + ' limpo=' + JSON.stringify(sanitizeDictationRecord(rec)));
        prev = rec;
        ev.merged.forEach(x => { if (x.word) rows.push('  w=' + normalizeDictationWord(x.word) + '|' + dictLooseNorm(x.word)); });
      });
      res[d.id] = rows.join('\n');
    });
    return res;
  });
  out.puras_extra = await page.evaluate(() => {
    const words = [['peut-être', 'peut etre'], ['aujourd\'hui', 'aujourdhui'], ['œuf', 'oeuf'], ['été', 'ete'], ['là', 'la'], ['grand-mère', 'grandmère'], ['c\'est', 'cest'], ['français', 'francais']];
    return JSON.stringify({
      leve: words.map(([a, b]) => dictLightReason(normalizeDictationWord(a), normalizeDictationWord(b))),
      numeros: Array.from({ length: 101 }, (_, n) => frenchNumberWords(n)),
      sanitizar: [null, 5, 'x', { bestScore: 150, attempts: -2, lastScore: 33.6, lastAt: 7, wrongWords: ['a', 3, '', 'b'] }, { bestScore: NaN, attempts: 2.7, wrongWords: Array.from({ length: 40 }, (_, i) => 'w' + i) }].map(sanitizeDictationRecord),
      frases: ["M. Dupont est là. Mme Martin aussi !", "Il a dit : « Bonjour. » Puis il est parti...", "J. K. Rowling écrit. Etc. etc. Fin", "Il habite au n°. 5. C'est loin ?", 'Une phrase sans point'].map(splitDictationSentences),
      merge: mergeDictationDiff(diffDictationWords('Il est grand. Elle est petite.', 'Il et grand Elle petit.')),
      split: mergeSplitCompoundWords(tokenizeDictationText('vingt cinq ans'), tokenizeDictationText('vingt-cinq ans')),
      cor: [0, 59, 60, 79, 80, 100].map(dictationScoreColorVar),
      word: [dictationWordHtml('Bonjour!', '?', 1, 'dictation-word', 't'), dictationWordHtml('<b>', '', 0, 'x', ''), escapeHtmlDictation(`<a href="x">'&'</a>`)],
      visiveis: [null, 'A1-m1', 'A1-revisao', 'A1-m3', 'nada'].map(m => dictationsVisible(m).map(d => d.id)),
      revisao: [isLevelReviewId('A1-revisao'), isLevelReviewId('A1-m1'), isLevelReviewId(null)],
    });
  });

  // ---- 2. lista
  await page.evaluate(() => switchTab('challenges'));
  await page.evaluate(() => switchTab('dictation'));
  out.lista = await html('#view-dictation');
  await click('#dictation-explainer-toggle');
  out.lista_explicacao = await html('#dictation-explainer');
  await click('#dictation-explainer-toggle');
  for (const m of ['A1-m1', 'A1-m3', 'A1-revisao']){
    await page.evaluate((m) => { pendingDictationModuleFilter = m; switchTab('dictation'); }, m);
    out['lista_' + m] = await html('#view-dictation');
  }
  await click('#dictation-back-to-challenges');
  out.voltar_revisao = await page.evaluate(() => [document.querySelector('.view.active') && document.querySelector('.view.active').id, String(dictationModuleFilter), String(pendingChallengesModuleFilter)].join());
  await page.evaluate(() => { pendingDictationModuleFilter = 'A1-m2'; switchTab('dictation'); });
  await click('#dictation-back-to-challenges');
  out.voltar_desafios = await page.evaluate(() => [document.querySelector('.view.active') && document.querySelector('.view.active').id, String(dictationModuleFilter), String(challengesModuleFilter)].join());
  // (a trava Premium é const CHALLENGE_PAYWALL_ENABLED = false no fr: não dá para ligar de fora; o cadeado é conferido no teste do motor)
  // linha "Revisão do A1" da trilha
  out.trilha_revisao = await page.evaluate(() => { const r = buildLevelReviewRow('A1'); return r ? r.outerHTML : null; });
  out.trilha_revisao_A2 = await page.evaluate(() => { const r = buildLevelReviewRow('A2'); return r ? r.outerHTML : null; });
  out.trilha_revisao_clique = await page.evaluate(() => { const r = buildLevelReviewRow('A1'); if (!r) return null; document.body.appendChild(r); const h = r.querySelector('.ub-header'); h.click(); const v = document.querySelector('.view.active'); r.remove(); return [v && v.id, String(dictationModuleFilter), String(pendingChallengesModuleFilter), document.getElementById('dictation-back-to-challenges').textContent].join('|'); });

  // ---- 3. player e resultado de cada ditado x variação, pelo DOM
  await page.evaluate(() => { pendingDictationModuleFilter = null; switchTab('dictation'); });
  const ids = await page.evaluate(() => DICTATIONS.map(d => d.id));
  for (const id of ids){
    await page.evaluate((id) => { renderDictationList(); const c = document.querySelector('.dictation-card[data-dict-id="' + id + '"]'); if (c) c.click(); else openDictationPlayer(id); }, id);
    if (id === ids[0]){
      out.player = await html('#dictation-player-content');
      // botões do player
      out.player_botoes = await page.evaluate(() => {
        const r = [];
        const a = () => dictationAudioEl;
        const fire = (ev) => a().dispatchEvent(new Event(ev));
        Object.defineProperty(a(), 'duration', { configurable: true, get: () => 125 });
        Object.defineProperty(a(), 'paused', { configurable: true, get: () => !!window.__paused });
        window.__paused = true;
        document.getElementById('dictation-play-btn').click(); fire('play'); window.__paused = false;
        r.push(document.getElementById('dictation-play-btn').outerHTML, window.__plays.slice(-1)[0]);
        a().currentTime = 40; document.getElementById('dictation-skip-back').click(); r.push(a().currentTime);
        document.getElementById('dictation-skip-fwd').click(); r.push(a().currentTime);
        fire('loadedmetadata'); fire('timeupdate');
        r.push(document.getElementById('dictation-time-total').textContent, document.getElementById('dictation-time-current').textContent, document.getElementById('dictation-progress-fill').style.width);
        document.querySelector('.dictation-speed-btn[data-speed="0.75"]').click(); r.push(a().playbackRate, document.querySelector('.dictation-speed-controls').innerHTML);
        const vol = document.getElementById('dictation-volume-slider'); vol.value = 0; vol.dispatchEvent(new Event('input')); r.push(a().volume, document.getElementById('dictation-mute-btn').outerHTML);
        vol.value = 60; vol.dispatchEvent(new Event('input'));
        document.getElementById('dictation-mute-btn').click(); r.push(a().muted, vol.value, document.getElementById('dictation-mute-btn').outerHTML);
        document.getElementById('dictation-mute-btn').click(); r.push(a().muted, a().volume, vol.value);
        document.getElementById('dictation-restart-btn').click(); r.push(a().currentTime);
        const track = document.getElementById('dictation-progress-track');
        const rect = track.getBoundingClientRect();
        track.dispatchEvent(new PointerEvent('pointerdown', { clientX: rect.left + rect.width / 4, bubbles: true }));
        window.dispatchEvent(new PointerEvent('pointermove', { clientX: rect.left + rect.width / 2 }));
        r.push(Math.round(a().currentTime));
        window.dispatchEvent(new PointerEvent('pointerup', {}));
        window.dispatchEvent(new PointerEvent('pointermove', { clientX: rect.left }));
        r.push(Math.round(a().currentTime));
        document.getElementById('dictation-play-btn').click(); fire('pause'); window.__paused = true;
        r.push(document.getElementById('dictation-play-btn').outerHTML);
        fire('ended'); r.push(document.getElementById('dictation-play-btn').outerHTML);
        fire('error'); r.push(document.getElementById('dictation-play-btn').outerHTML, window.__toasts.slice(-1)[0]);
        // teclado de letras no campo
        const btn = document.querySelector('#dictation-player-content .fr-accent-picker button');
        if (btn){ document.getElementById('dictation-input').focus(); btn.click(); }
        r.push(document.getElementById('dictation-input').value);
        document.getElementById('dictation-input').value = '';
        // Verificar vazio
        document.getElementById('dictation-check-btn').click(); r.push(window.__toasts.slice(-1)[0], document.getElementById('dictation-result-wrap').innerHTML);
        return JSON.stringify(r);
      });
      await page.evaluate((id) => { renderDictationList(); const c = document.querySelector('.dictation-card[data-dict-id="' + id + '"]'); if (c) c.click(); else openDictationPlayer(id); }, id);
    }
    const di = ids.indexOf(id);
    const vs = await page.evaluate(([id, di]) => window.__variants(DICTATIONS.find(d => d.id === id).text, 1000 + di), [id, di]);
    for (const k of Object.keys(vs)){
      await page.evaluate((v) => { document.getElementById('dictation-input').value = v; document.getElementById('dictation-check-btn').click(); }, vs[k]);
      const r = await page.evaluate(() => [document.getElementById('dictation-result-wrap').innerHTML, document.getElementById('dictation-check-btn').style.display, document.getElementById('dictation-retry-btn').style.display].join('\n'));
      out['res_' + id + '_' + k] = r;
      await click('#dictation-retry-btn');
    }
    out['estado_' + id] = await state();
    out['lista_depois_' + id] = await page.evaluate(() => { renderDictationList(); return document.getElementById('dictation-cards').innerHTML + document.getElementById('dictation-list-progress').innerHTML; });
    await page.evaluate((id) => { const c = document.querySelector('.dictation-card[data-dict-id="' + id + '"]'); if (c) c.click(); else openDictationPlayer(id); }, id);
  }
  // áudio por frase: s1 do d1 existe (toca o mp3); frase sem mp3 (404) cai na voz
  await page.evaluate(() => { renderDictationList(); document.querySelector('.dictation-card[data-dict-id="d1"]').click(); });
  await page.evaluate(() => { document.getElementById('dictation-input').value = 'Bonjour'; document.getElementById('dictation-check-btn').click(); });
  out.frase_audio = await page.evaluate(async () => {
    const r = [];
    HTMLMediaElement.prototype.play = function(){ window.__plays.push(this.src.replace(/^https?:\/\/[^/]+/, '')); const el = this; setTimeout(() => el.dispatchEvent(new Event(/-s1\.mp3$/.test(el.src) ? 'ended' : 'error')), 5); return Promise.resolve(); };
    const btns = document.querySelectorAll('.dictation-sentence-play');
    btns[0].click(); await new Promise(ok => setTimeout(ok, 30)); r.push(btns[0].outerHTML, window.__plays.slice(-1)[0]);
    btns[1].click(); await new Promise(ok => setTimeout(ok, 30)); r.push(btns[1].outerHTML, window.__plays.slice(-1)[0], JSON.stringify(window.__spoken.slice(-1)));
    return r.join('\n');
  });
  await page.clock.runFor(2000);
  // voltar à lista e sair da aba (para o áudio)
  await click('#dictation-back-to-list');
  out.voltar_lista = await html('#view-dictation');
  await page.evaluate(() => switchTab('path'));
  out.depois_sair = await page.evaluate(() => String(dictationAudioEl));
  // site em inglês
  await page.evaluate(() => { window.__ui = window.getUiLang; window.getUiLang = () => 'en'; applyChallengeI18n(); pendingDictationModuleFilter = 'A1-revisao'; switchTab('dictation'); });
  out.en_lista = await html('#view-dictation');
  await page.evaluate(() => { document.querySelector('.dictation-card').click(); });
  out.en_player = await html('#dictation-player-content');
  out.en_audio = await page.evaluate(() => dictationAudioPath(DICTATIONS[0]) + '|' + dictationTask(DICTATIONS[0]));
  await page.evaluate(() => { document.getElementById('dictation-input').value = "bonjour je mappelle sophie, jai 25 ans et je suis francaise virgule et toi comment tu tappelle"; document.getElementById('dictation-check-btn').click(); });
  out.en_resultado = await html('#dictation-result-wrap');
  await page.evaluate(() => { window.getUiLang = window.__ui; applyChallengeI18n(); });
  out.estado_final = await state();
  out.erros = errors;
  await ctx.close();
  server.close();
  return out;
}

(async () => {
  let wt = null;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  try {
    wt = fs.mkdtempSync(path.join(os.tmpdir(), 'paridade-5b-'));
    execFileSync('git', ['worktree', 'add', '--detach', '-f', wt, REF], { cwd: ROOT, stdio: 'ignore' });
    const antes = await fingerprint(browser, wt);
    const depois = await fingerprint(browser, ROOT);
    check('a sequência rodou no fr de antes', Object.keys(antes).length > 600, Object.keys(antes).length);
    check('fr de antes: sem erro de página', antes.erros.length === 0, antes.erros);
    check('fr de agora: sem erro de página', depois.erros.length === 0, depois.erros);
    check('mesmas cenas', JSON.stringify(Object.keys(antes)) === JSON.stringify(Object.keys(depois)), [Object.keys(antes).length, Object.keys(depois).length]);
    let iguais = 0, total = 0;
    // lastAt = new Date() da tentativa: o relógio do teste anda com o tempo real (milissegundos diferentes entre as duas
    // rodadas); a hora é trocada por DATA, o resto do registro é comparado inteiro.
    const norm = (v) => etapa7(JSON.stringify(v).replace(/127\.0\.0\.1:\d+/g, 'HOST').replace(/2026-10-14T12:\d\d:\d\d\.\d{3}Z/g, 'DATA')); // etapa7: textos mudados de propósito (2026-10-31)
    for (const k of Object.keys(antes)){
      if (k === 'erros') continue;
      if (k === 'puras'){ // um resultado por ditado
        for (const id of Object.keys(antes.puras)){
          total++;
          if (antes.puras[id] === (depois.puras || {})[id]){ iguais++; passed++; continue; }
          check('correção igual: ' + id, false, { antes: antes.puras[id].slice(0, 300) });
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
    const nAval = Object.values(depois.puras).reduce((n, s) => n + (s.match(/^[a-z_0-9]+=>/gm) || []).length, 0);
    const nRes = Object.keys(depois).filter(k => k.startsWith('res_')).length;
    const allRes = Object.keys(depois).filter(k => k.startsWith('res_')).map(k => depois[k]).join('\n');
    check('correção cobriu os 21 ditados', Object.keys(depois.puras).length === 21, Object.keys(depois.puras).length);
    check('resultado com acerto, erro leve, troca, falta, a mais, pontuação e número', ['dictation-word"', 'dictation-word-near', 'dictation-word-wrong', 'dictation-word-correct', 'dictation-punct-missing', 'dictation-notes', 'has-error'].every(c => allRes.includes(c)));
    check('estado: 21 ditados registrados e ditados com 90+', Object.keys(JSON.parse(depois.estado_final).dictations).length === 21 && JSON.parse(depois.estado_final).aced > 0, JSON.parse(depois.estado_final).aced);
    check('frase sem mp3 caiu na voz do navegador', /\["/.test(depois.frase_audio.split('\n')[4] || ''), depois.frase_audio);
    console.log(`  cenas iguais ao fr de antes: ${iguais}/${total} (avaliação de ${nAval} respostas em 21 ditados; ${nRes} resultados renderizados pelo DOM)`);
  } finally {
    await browser.close();
    if (wt){ try { execFileSync('git', ['worktree', 'remove', '--force', wt], { cwd: ROOT, stdio: 'ignore' }); } catch (e) {} }
  }
  console.log(`Ditados (fr antes x depois): ${passed} passaram, ${failed} falharam`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

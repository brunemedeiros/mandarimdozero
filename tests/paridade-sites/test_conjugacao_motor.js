// Paridade, etapa 5a (docs/historico/27-paridade-conjugacao.md): o motor da Conjugação (shared/conjugacao.js) não
// depende do francês. Três provas:
//  1. leitura do código: o motor não cita tempo, pronome, verbo nem dado do francês (só nos padrões de reserva marcados);
//  2. a marcação que o motor monta (conjScreenHTML) é a mesma da seção #view-conjugaison do fr/index.html, então o site
//     novo pode deixar a seção vazia;
//  3. um "site" de mentira, de PORTUGUÊS (2 verbos, 2 tempos, pessoas eu/você/ele..., busca pela tradução em inglês),
//     ligado na página do fr só com registerConjugation(dados + regras) e a seção vazia: escolha, busca, chips, prática,
//     teclado com as letras do português, correção (certa, "quase" de acento, errada), XP, missões, resultado e
//     "Praticar só os que errei", sem nenhum texto do francês na tela. Claro e escuro, 390px.
// Rodar: node tests/paridade-sites/test_conjugacao_motor.js
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '/opt/node22/lib/node_modules'] }));
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
const STUB = `(function(){
  const b = new Proxy({}, { get(_, p){ if (p === 'then') return (ok) => Promise.resolve({ data: [], error: null }).then(ok); return () => b; } });
  const client = { auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }), signOut: async () => ({}) },
    from: () => b, channel: () => ({ on(){ return this; }, subscribe(){ return this; } }),
    storage: { from: () => ({}) }, functions: { invoke: async () => ({ data: null, error: null }) }, rpc: async () => ({ data: null, error: null }) };
  window.supabase = { createClient: () => client };
})();`;
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? String(typeof x === 'string' ? x : JSON.stringify(x)).slice(0, 600) : ''); } };

// ---- 1. leitura do código
{
  const src = read('shared/conjugacao.js');
  // linhas de código (sem comentário); as de reserva (padrão quando o site não informa) são marcadas e conferidas à parte
  const code = src.split('\n').filter(l => !/^\s*\/\//.test(l)).map(l => l.replace(/\s\/\/.*$/, '')).join('\n');
  const fr = ['CONJUGATION_VERBS', 'CONJUGATION_GROUPS', 'VERB_TRANSLATIONS', 'CONJ_TENSE_EXAMPLES', 'CONJ_GAMES\\b', 'speakFrench', 'imperatif',
    'passeCompose', 'plusQueParfait', 'subjPresente', 'futurProche', "'aller'", "'je'", "j'", 'ETRE_AUX', '\\bse \\|', 'latinaFr'];
  const achados = fr.filter(w => new RegExp(w).test(code));
  check('motor não cita dado/regra do francês (verbos, tempos, pronomes, voz)', achados.length === 0, achados);
  check('reservas de site antigo só nas bandeiras/chaves da busca (fr x pt)', (code.match(/'fr\.conj\.sel\.lang(Fr|Pt)'/g) || []).length === 2);
  const cfg = read('fr/conj-config.js');
  check('fr/conj-config.js tem o que é do francês', ['subjPresente', "que j'", 'IMPERATIF_ACTIVE', 'futurProche', 'ETRE_AUX', "/^(se |s')/", 'speakFrench'].every(w => cfg.includes(w)));
  check('fr/app.js não tem mais a tela da Conjugação', !/function (renderConjPracticeStep|conjEvaluate|conjSearchVerbs|renderConjSelectScreen|setConjMode)\(/.test(read('fr/app.js'))
    && /^wireConjugationScreen\(\);$/m.test(read('fr/app.js')));
  const html = read('fr/index.html');
  const iCss = html.indexOf('href="../shared/conjugacao.css"'), iStyleEnd = html.indexOf('</style>');
  const iMotor = html.indexOf('../shared/conjugacao.js'), iCfg = html.indexOf('"conj-config.js"'), iApp = html.indexOf('<script src="app.js">');
  check('fr carrega o CSS depois do <style> e o motor + a config antes do app.js', iCss > iStyleEnd && iMotor > 0 && iMotor < iCfg && iCfg < iApp);
  const zh = read('zh/index.html');
  check('zh não carrega nada da Conjugação (categoria A)', !/conjugacao|conj-config|conj-games/.test(zh));
  check('shared/conjugacao.css tem as classes da tela e dos Jogos', ['.conj-field', '.conj-answer-view', '.conj-search-opt', '.conj-tense-card', '.cg-choice', '.cg-why'].every(c => read('shared/conjugacao.css').includes(c)));
}

// Configuração de mentira do português (2 verbos). Dados escritos à mão a partir do português do Brasil.
const PT_CONFIG = `({
  lang: 'pt',
  verbs: {
    ser:   { g: 'irr', f: { presente: ['sou', 'é', 'é', 'somos', 'são', 'são'], preterito: ['fui', 'foi', 'foi', 'fomos', 'foram', 'foram'] } },
    falar: { g: 'reg', f: { presente: ['falo', 'fala', 'fala', 'falamos', 'falam', 'falam'], preterito: ['falei', 'falou', 'falou', 'falamos', 'falaram', 'falaram'] } },
  },
  groups: { reg: { label: 'Regulares', desc: '-ar, -er, -ir' }, irr: { label: 'Irregulares', desc: 'ser, ir, ter...' } },
  translations: { ser: 'to be', falar: 'to speak / to talk' },
  tenseExamples: { presente: { pt: 'Eu [falo] português.', t: 'I speak Portuguese.' } },
  exampleTranslationLang: 'en',
  tenses: [{ key: 'presente', label: 'Presente' }, { key: 'preterito', label: 'Pretérito perfeito' }],
  persons: ['eu', 'você', 'ele / ela', 'nós', 'vocês', 'eles / elas'],
  regularGroups: ['reg'], irregularGroups: ['irr'],
  topNOptions: [1], sessionSizes: [1, 2], sessionSize: 2, pickMax: 2,
  searchLangs: { target: 'pt', translation: 'en' },
  flags: { pt: '🇧🇷', en: '🇺🇸' },
  flagLabelKeys: { pt: 'fr.conj.sel.langPt', en: 'settings.uiLanguage.title' },
  accentGroups: () => [['á', 'à', 'â', 'ã'], ['ç'], ['é', 'ê'], ['í'], ['ó', 'ô', 'õ'], ['ú']],
  speak: () => {},
  games: null,
  keys: { searchLabel: 'fr.conj.sel.verbs', searchPh: 'fr.conj.sel.verbs' },
})`;

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

  // ---- 2. marcação montada = marcação do fr/index.html
  {
    const ctx = await browser.newContext({ serviceWorkers: 'block' });
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => errs.push(String(e)));
    await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
    await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
    await page.addInitScript(() => { try { sessionStorage.setItem('guest_mode', '1'); localStorage.setItem('ui-language', 'pt-BR'); } catch (e) {} });
    await page.goto(`http://127.0.0.1:${port}/fr/index.html`);
    await page.waitForFunction(() => typeof STATE !== 'undefined' && CURRENT_USER === false, null, { timeout: 20000 });
    const html = read('fr/index.html');
    const ini = html.indexOf('<div class="view" id="view-conjugaison">');
    const fim = html.indexOf('<!-- ===== MEU PERFIL', ini);
    const secao = html.slice(ini, fim);
    const r = await page.evaluate((secao) => {
      const canon = (htmlStr) => {
        const doc = new DOMParser().parseFromString('<body>' + htmlStr + '</body>', 'text/html');
        const walk = (n) => {
          if (n.nodeType === 8) return '';
          if (n.nodeType === 3) return n.textContent.replace(/\s+/g, ' ').trim();
          const attrs = [...n.attributes].map(a => a.name + '=' + JSON.stringify(a.value.replace(/\s+/g, ' ').trim())).sort().join(' ');
          return '<' + n.tagName.toLowerCase() + (attrs ? ' ' + attrs : '') + '>' + [...n.childNodes].map(walk).filter(Boolean).join('') + '</' + n.tagName.toLowerCase() + '>';
        };
        return [...doc.body.childNodes].map(walk).filter(Boolean).join('');
      };
      const div = document.createElement('div'); div.innerHTML = secao;
      return { estatica: canon(div.firstElementChild.innerHTML), montada: canon(conjScreenHTML()) };
    }, secao);
    let i = 0; while (i < r.estatica.length && r.estatica[i] === r.montada[i]) i++;
    check('conjScreenHTML() = seção #view-conjugaison do fr/index.html (mesmas tags, atributos e textos)', r.estatica === r.montada && r.estatica.length > 2000,
      { estatica: r.estatica.slice(Math.max(0, i - 100), i + 160), montada: r.montada.slice(Math.max(0, i - 100), i + 160) });
    check('fr: sem erro de página', errs.length === 0, errs);
    await ctx.close();
  }

  // ---- 3. site de mentira de português, ligado na página do fr
  for (const theme of ['light', 'dark']){
    const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 }, colorScheme: theme });
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => errs.push(String(e)));
    await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
    await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
    await page.addInitScript((th) => { try { sessionStorage.setItem('guest_mode', '1'); localStorage.setItem('ui-language', 'pt-BR'); localStorage.setItem('theme', th); } catch (e) {}
      let s = 7; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; }, theme);
    await page.goto(`http://127.0.0.1:${port}/fr/index.html`);
    await page.waitForFunction(() => typeof STATE !== 'undefined' && CURRENT_USER === false, null, { timeout: 20000 });
    const L = (n, c, x) => check(theme + ' pt de mentira: ' + n, c, x);
    // a seção fica VAZIA (como num index.html novo) e o site só fornece dados + regras
    const montou = await page.evaluate((cfgSrc) => {
      const old = document.getElementById('view-conjugaison');
      const fresh = old.cloneNode(false); old.replaceWith(fresh); // sem a marcação e sem os listeners do fr
      registerConjugation(eval(cfgSrc));
      wireConjugationScreen();
      switchTab('conjugaison');
      return { built: !!document.querySelector('#view-conjugaison #conj-select-wrap'), games: CONJ_GAMES_UI === null };
    }, PT_CONFIG);
    L('motor montou a tela na seção vazia; sem Jogos (games: null)', montou.built && montou.games, montou);
    const sel = await page.evaluate(() => ({
      tenses: [...document.querySelectorAll('#conj-tense-list .conj-tense-name')].map(x => x.textContent),
      ex: (document.querySelector('#conj-tense-list .conj-ex') || {}).outerHTML || '', tr: document.querySelectorAll('.conj-ex-tr').length,
      groups: [...document.querySelectorAll('#conj-verb-list .conj-check-item > span')].map(x => x.firstChild.textContent),
      topn: [...document.querySelectorAll('#conj-topn-select option')].map(o => o.textContent), sizes: [...document.querySelectorAll('#conj-size-select option')].map(o => o.value).join(),
      hint: document.getElementById('conj-size-hint').textContent, label: document.querySelector('.conj-search-label').textContent,
      state: JSON.stringify({ t: CONJ_STATE.selectedTenses, g: CONJ_STATE.selectedGroups, n: CONJ_STATE.topN, s: CONJ_STATE.sessionSize }) }));
    L('escolha: tempos, exemplo com o verbo em destaque (lang=pt), grupos, Top N e tamanhos do português', sel.tenses.join('|') === 'Presente|Pretérito perfeito'
      && /lang="pt"/.test(sel.ex) && /<b class="conj-ex-verb">falo<\/b>/.test(sel.ex) && sel.tr === 0 && sel.groups.join() === 'Regulares,Irregulares'
      && sel.topn.join() === 'Top 1,Todos (2)' && sel.sizes === '1,2' && /12/.test(sel.hint) && sel.label === 'Verbos'
      && sel.state === '{"t":["presente"],"g":["reg","irr"],"n":2,"s":2}', sel);
    // busca pela tradução em inglês e pelo verbo sem acento
    await page.click('#conj-search-input'); await page.keyboard.type('speak');
    const b1 = await page.evaluate(() => { const o = document.querySelector('.conj-search-opt'); return o && { verb: o.dataset.verb, word: o.querySelector('.conj-opt-word').textContent,
      lang: o.querySelector('.conj-opt-other').getAttribute('lang'), flag: o.querySelector('.conj-flag').innerHTML }; });
    L('busca "speak" acha falar pela tradução (bandeira da tradução, verbo com lang=pt)', b1 && b1.verb === 'falar' && b1.word === 'to speak (falar)' && b1.lang === 'pt' && /🇺🇸|img/.test(b1.flag), b1);
    await page.keyboard.press('Enter');
    await page.keyboard.type('SER');
    const b2 = await page.evaluate(() => { const o = document.querySelector('.conj-search-opt'); return o && { verb: o.dataset.verb, green: !!o.querySelector('rect[fill="#009739"]'), lang: o.querySelector('.conj-opt-word').getAttribute('lang') }; });
    L('busca "SER" acha ser com a bandeira do Brasil', b2 && b2.verb === 'ser' && b2.green && b2.lang === 'pt', b2);
    await page.keyboard.press('Enter');
    const chips = await page.evaluate(() => ({ chips: [...document.querySelectorAll('.conj-chip > span')].map(x => x.textContent + ':' + x.getAttribute('lang')).join(), off: document.getElementById('conj-filters').classList.contains('is-off') }));
    L('chips com lang=pt e filtros de lado', chips.chips === 'falar:pt,ser:pt' && chips.off, chips);
    await page.keyboard.type('fal'); await page.keyboard.press('Enter');
    L('limite de verbos do site (pickMax 2) avisa', await page.evaluate(() => CONJ_STATE.pickedVerbs.length === 2));
    await page.keyboard.press('Escape');
    await page.evaluate(() => document.querySelector('#conj-tense-list input[data-tense="preterito"]').click());
    await page.click('#conj-start-btn');
    await page.waitForSelector('.conj-tense-box');
    const p = await page.evaluate(() => ({ q: CONJ_STATE.verbQueue.join(), t: CONJ_STATE.sessionTenses.join(), boxes: document.querySelectorAll('.conj-tense-box').length,
      labels: [...document.querySelectorAll('.conj-tense-box[data-tense="presente"] .conj-field label')].map(l => l.textContent).join('|'),
      keys: [...document.querySelectorAll('.conj-accents .fr-accent-key')].map(k => k.textContent).join(''), tr: document.querySelector('.conj-verb-translation').textContent,
      tempo: document.querySelector('.conj-verb-header .tempo').textContent, text: document.getElementById('view-conjugaison').innerText }));
    L('prática: os 2 verbos na ordem, 2 tempos, pessoas do português, tradução e "Regular"', p.q === 'falar,ser' && p.t === 'presente,preterito' && p.boxes === 2
      && p.labels === 'eu|você|ele / ela|nós|vocês|eles / elas' && p.tr === 'to speak / to talk' && p.tempo === 'Regular', p);
    L('teclado só com as letras que os verbos do português usam (são, é), na ordem do teclado do português', p.keys === 'ãé', p.keys);
    L('nada do francês na tela', !/\b(je|tu|nous|vous|ils|Présent|Passé|Impératif|Subjonctif|j')\b/.test(p.text), p.text.slice(0, 300));
    // acento pelo teclado, corrigir: certa, "quase" (sem acento) e errada
    await page.click('.conj-field[data-tense="presente"][data-idx="0"] input');
    await page.evaluate(() => {
      const v = { presente: ['falo', 'fala', 'Fala', 'falamos', 'falao', ''], preterito: ['falei', 'falou', 'falou', 'falamos', 'falaram', 'falaram'] };
      document.querySelectorAll('.conj-field input[data-idx]').forEach(inp => { inp.value = v[inp.dataset.tense][Number(inp.dataset.idx)]; });
    });
    const xp0 = await page.evaluate(() => STATE.xp);
    await page.click('#conj-verify-btn');
    const c = await page.evaluate(() => ({ cls: [...document.querySelectorAll('.conj-tense-box[data-tense="presente"] .conj-field')].map(f => f.className.replace('conj-field', '').trim()).join(),
      x: [...document.querySelectorAll('.conj-field.wrong .conj-x')].map(e => e.textContent).join(''), speak: document.querySelector('.conj-field.ok .audio-btn').dataset.speak,
      tag: (document.querySelector('.conj-field.almost .conj-tag') || {}).textContent, daily: JSON.stringify([STATE.daily.conjugationCorrect, STATE.daily.conjugationTenses]), xp: STATE.xp }));
    L('correção: certas, "Fala" (maiúscula) = quase, "falao" errada com a letra marcada, vazia errada', c.cls === 'ok,ok,almost,ok,wrong,wrong' && c.tag === 'Quase' && c.x === 'o', c);
    L('áudio com o pronome do português ("eu falo")', c.speak === 'eu falo', c.speak);
    L('XP (regular = 1 por forma certa: 9) e missões do dia (3,5 arredonda para 4, mais 6) contaram', c.xp - xp0 === 9 && c.daily === '[10,["presente","preterito"]]', [c.xp - xp0, c.daily]);
    // "ser" com "e" no lugar de "é" = quase (acento)
    await page.click('#conj-next-verb-btn');
    await page.evaluate(() => {
      const v = { presente: ['sou', 'e', 'é', 'somos', 'sao', 'são'], preterito: ['fui', 'foi', 'foi', 'fomos', 'foram', 'fora'] };
      document.querySelectorAll('.conj-field input[data-idx]').forEach(inp => { inp.value = v[inp.dataset.tense][Number(inp.dataset.idx)]; });
    });
    const xp1 = await page.evaluate(() => STATE.xp);
    await page.click('#conj-verify-btn');
    const c2 = await page.evaluate(() => ({ almost: document.querySelectorAll('.conj-field.almost').length, wrong: document.querySelectorAll('.conj-field.wrong').length, xp: STATE.xp,
      tempo: document.querySelector('.conj-verb-header .tempo').textContent }));
    L('ser (irregular): "e"/"sao" = quase, "fora" errada, XP em dobro (9 certas = 18)', c2.almost === 2 && c2.wrong === 1 && c2.xp - xp1 === 18 && c2.tempo === 'Irregular', [c2, c2.xp - xp1]);
    await page.click('#conj-next-verb-btn');
    await page.waitForSelector('.conj-session-result');
    const r = await page.evaluate(() => ({ score: document.querySelector('.score-num').textContent, items: [...document.querySelectorAll('.conj-review-list li')].map(li => li.textContent.replace(/\s+/g, ' ').trim()),
      sessions: STATE.daily.conjugationSessions, modes: STATE.modesUsed.conjugation, missao: REVISAO_CONJ_CHALLENGES.find(m => m.id === 'conj1').get(STATE.daily) }));
    L('resultado: placar, revisão com o pronome do português e as missões', r.score === '20/24' && r.items.length === 6 && /falar, Presente/.test(r.items[0]) && /^falar, Presente ele /.test(r.items[0])
      && r.sessions === 1 && r.modes === true && r.missao === 1, r);
    await page.click('#conj-practice-mistakes-btn');
    const again = await page.evaluate(() => CONJ_STATE.verbQueue.join() + '|' + CONJ_STATE.sessionTenses.join());
    L('"Praticar só os que errei": falar e ser, nos 2 tempos', again === 'falar,ser|presente,preterito', again);
    const ov = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    L('sem rolagem horizontal em 390px', ov);
    // aba Jogos sem jogos: abre vazia, sem erro
    await page.click('#conj-back-to-select');
    await page.click('#conj-mode-games');
    L('aba Jogos sem jogos: lista vazia, sem erro', await page.evaluate(() => !document.getElementById('conj-games-pane').hidden && document.getElementById('conj-games-list').children.length === 0));
    L('sem erro de página', errs.length === 0, errs);
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(`Conjugação: motor independente do francês: ${passed} passaram, ${failed} falharam`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

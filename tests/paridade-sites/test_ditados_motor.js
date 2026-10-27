// Paridade, etapa 5b (docs/historico/28-paridade-ditados.md): o motor dos Ditados (shared/ditados.js) não depende do
// francês. Três provas:
//  1. leitura do código: o motor não cita dado, voz, teclado, abreviação nem função do francês ou dos Desafios do fr
//     (tudo isso chega pela configuração, fr/ditados-config.js); a ordem de carregamento no fr; o zh não carrega nada;
//  2. a marcação que o motor monta (dictationScreenHTML) é a mesma da seção #view-dictation do fr/index.html, então o
//     site novo pode deixar a seção vazia;
//  3. um "site" de mentira, de PORTUGUÊS com 1 ditado (site em inglês, como o /pt), ligado na página do fr só com
//     registerDictations(dados + família latina do português) e a seção vazia: lista, player com lang="pt" e o teclado
//     do português, correção com as regras do português (acento, número, contração, homófono), notas em inglês,
//     frases do texto com a voz, registro da tentativa, trava Premium de um 2º ditado, sem nenhum texto do francês na
//     tela e sem rolagem horizontal. Claro e escuro, 390px.
// Rodar: node tests/paridade-sites/test_ditados_motor.js
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
  const src = read('shared/ditados.js');
  const code = src.split('\n').filter(l => !/^\s*\/\//.test(l)).map(l => l.replace(/\s\/\/.*$/, '')).join('\n');
  const fr = ['speakFrench', 'canSpeakFrench', 'frAccentPicker', 'wireFrAccentPicker', 'fr-accent-picker', 'latinaFr', 'LANG_HOOKS', '\\bDICTATIONS\\b',
    'DICTATION_AUDIO_EN_READY', "'Mme\\.'", 'lang="fr"', "lang: 'fr'", 'CHALLENGE_PAYWALL_ENABLED', 'challengesPremiumUnlocked', '(?<!\\.)tierBadgeHTML\\(', 'challengeProgressHTML',
    'openPremiumChallengesModal', 'pendingChallengesModuleFilter', '\\bchT\\(', 'CHALLENGE_I18N', 'français', 'vingt'];
  const achados = fr.filter(w => new RegExp(w).test(code));
  check('motor não cita dado/voz/teclado/abreviação do francês nem função dos Desafios do fr', achados.length === 0, achados);
  check('só uma reserva fora da configuração: tpZero do fr (com cálculo próprio se o site não tiver)', (code.match(/tpZero/g) || []).length === 2);
  const cfg = read('fr/ditados-config.js');
  check('fr/ditados-config.js tem o que é do francês', ['DICTATIONS', 'latinaFr', 'speakFrench', 'canSpeakFrench', 'frAccentPickerHTML', "'Mme.'", 'DICTATION_AUDIO_EN_READY', "lang: 'fr'", 'CHALLENGE_PAYWALL_ENABLED'].every(w => cfg.includes(w)));
  const py = read('fr/scripts/dictation_sentences.py');
  const abbr = (cfg.match(/sentenceAbbreviations: \[([^\]]*)\]/) || [])[1] || '';
  const pyAbbr = (py.match(/_ABBREVIATIONS = \{([^}]*)\}/) || [])[1] || '';
  const lista = (s) => (s.match(/["']([^"']+)["']/g) || []).map(x => x.slice(1, -1)).sort().join(' ');
  check('abreviações do fr = as do gerador dos mp3 por frase (fr/scripts/dictation_sentences.py)', lista(abbr) && lista(abbr) === lista(pyAbbr), [lista(abbr), lista(pyAbbr)]);
  const app = read('fr/app.js');
  check('fr/app.js não tem mais os Ditados', !/function (renderDictationList|openDictationPlayer|renderDictationResult|evaluateDictation|splitDictationSentences|buildLevelReviewRow|dictationsVisible|isDictationDone|dictationTask)\(/.test(app)
    && /^wireDictationScreen\(\);$/m.test(app) && !/^    'dict\.(?!count\.)/m.test(app));
  const html = read('fr/index.html');
  const iCss = html.indexOf('href="../shared/ditados.css"'), iStyleEnd = html.indexOf('</style>'), iConjCss = html.indexOf('href="../shared/conjugacao.css"');
  const iDados = html.indexOf('<script src="dictations.js">'), iMotor = html.indexOf('../shared/ditados.js'), iCfg = html.indexOf('"ditados-config.js"'), iApp = html.indexOf('<script src="app.js">');
  check('fr carrega o CSS depois do <style> (e da Conjugação) e dados -> motor -> config -> app.js', iCss > iStyleEnd && iCss > iConjCss && iDados > 0 && iDados < iMotor && iMotor < iCfg && iCfg < iApp);
  const style = html.slice(html.indexOf('<style>'), iStyleEnd);
  const sobrou = style.split('\n').filter(l => /dictation/.test(l) && !/dictation-play-btn/.test(l) && !/^\s*\/\*/.test(l));
  check('o <style> do fr não tem mais regra do Ditado (fica só o áudio lento dos Desafios)', sobrou.length === 0, sobrou);
  const zh = read('zh/index.html');
  check('zh não carrega nada dos Ditados (categoria B)', !/ditados|dictations\.js|dictation-config/.test(zh));
  check('shared/ditados.css tem as classes da lista, do player e do resultado', ['.dictation-card', '.dictation-progress-track', '.dictation-speed-btn.active', '.dictation-textarea', '.dictation-word-near', '.dictation-word-wrong', '.dictation-sentence.has-error', '.dictation-score-badge'].every(c => read('shared/ditados.css').includes(c)));
}

// Ditado de mentira do PORTUGUÊS (texto escrito à mão; o /pt só tem site em inglês).
const PT_TEXT = 'Olá! Eu me chamo Ana e tenho vinte e cinco anos. Moro no Brasil, em São Paulo. Você está bem?';
const PT_CONFIG = `({
  lang: 'pt',
  dictations: () => window.__ptDict,
  taskTranslations: () => ({ en: { pt1: { task: 'Introducing yourself' }, pt2: { task: 'At the bakery' } } }),
  familia: () => window.__ptFam || (window.__ptFam = FamiliaLatina.criar(FamiliaLatinaIdiomas.pt)),
  audioPath: (d) => 'audio/pt-dictation-' + d.id + '.mp3',
  sentenceAudioPath: (d, n) => 'audio/pt-dictation-' + d.id + '-s' + n + '.mp3',
  sentenceAbbreviations: ['Sr.', 'Sra.', 'Dr.'],
  canSpeak: () => true,
  speak: (text, btn) => { window.__ptSpoken.push(text); },
  accentPickerHTML: () => '<div class="pt-letras">' + window.__ptFam.htmlTecladoDeAcentos('fr-accent-picker') + '</div>',
  wireAccentPicker: (content, input) => { content.querySelectorAll('.pt-letras button').forEach(b => b.addEventListener('click', () => { input.value += b.textContent; })); },
  paywallEnabled: () => window.__ptPaywall, premiumUnlocked: () => false,
  openPremium: () => { window.__ptPremium = (window.__ptPremium || 0) + 1; },
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
    const ini = html.indexOf('<div class="view" id="view-dictation">');
    const fim = html.indexOf('<!-- ===== DESAFIOS', ini);
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
      return { estatica: canon(div.firstElementChild.innerHTML), montada: canon(dictationScreenHTML()) };
    }, secao);
    let i = 0; while (i < r.estatica.length && r.estatica[i] === r.montada[i]) i++;
    check('dictationScreenHTML() = seção #view-dictation do fr/index.html (mesmas tags, atributos e textos)', r.estatica === r.montada && r.estatica.length > 1000,
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
    await page.addInitScript((th) => { try { sessionStorage.setItem('guest_mode', '1'); localStorage.setItem('ui-language', 'pt-BR'); localStorage.setItem('theme', th); } catch (e) {} }, theme);
    await page.goto(`http://127.0.0.1:${port}/fr/index.html`);
    await page.waitForFunction(() => typeof STATE !== 'undefined' && CURRENT_USER === false, null, { timeout: 20000 });
    await page.addScriptTag({ url: '/shared/core/familias/latina-idiomas.js' });
    await page.evaluate(() => { window.speechSynthesis && (window.speechSynthesis.speak = () => {}); HTMLMediaElement.prototype.play = function(){ return Promise.resolve(); }; });
    const L = (n, c, x) => check(theme + ' pt de mentira: ' + n, c, x);
    const montou = await page.evaluate(([cfgSrc, text]) => {
      window.__ptDict = [{ id: 'pt1', moduleId: 'A1-m1', level: 'A1', text, free: true }];
      window.__ptSpoken = []; window.__ptPaywall = false;
      window.getUiLang = () => 'en';
      const old = document.getElementById('view-dictation');
      const fresh = old.cloneNode(false); old.replaceWith(fresh); // sem a marcação e sem os listeners do fr
      registerDictations(eval(cfgSrc));
      window.__ptFam = FamiliaLatina.criar(FamiliaLatinaIdiomas.pt);
      wireDictationScreen();
      STATE.dictations = {}; STATE.dictationsAced = 0;
      switchTab('dictation');
      return { built: !!document.querySelector('#view-dictation #dictation-cards'), title: document.querySelector('#view-dictation h2').textContent,
        how: document.getElementById('dictation-explainer-toggle').textContent, back: document.getElementById('dictation-back-to-challenges').textContent };
    }, [PT_CONFIG, PT_TEXT]);
    L('motor montou a seção vazia, com os textos fixos no idioma do site (en)', montou.built && montou.title === 'Dictations' && /How does the dictation work/.test(montou.how) && montou.back === '← Back to challenges', montou);
    const lista = await page.evaluate(() => ({ cards: [...document.querySelectorAll('.dictation-card')].map(c => c.dataset.dictId + '|' + c.querySelector('.dictation-card-task').textContent + '|' + c.querySelector('.dictation-card-level').textContent),
      lock: document.querySelectorAll('.dictation-card.locked').length }));
    L('lista com o ditado do português e a tarefa em inglês', lista.cards.join() === 'pt1|Introducing yourself|A1' && lista.lock === 0, lista);
    await page.click('.dictation-card');
    const pl = await page.evaluate(() => ({ lang: document.getElementById('dictation-input').getAttribute('lang'), task: document.querySelector('.dictation-player-task').textContent,
      keys: [...document.querySelectorAll('#dictation-player-content .pt-letras button')].map(b => b.textContent).join(''), src: dictationAudioEl && dictationAudioEl.src.replace(/^.*\/fr\//, ''),
      play: document.getElementById('dictation-play-btn').textContent }));
    L('player: lang="pt", tarefa em inglês, teclado do português (ã õ ç...), mp3 do site', pl.lang === 'pt' && pl.task === 'Introducing yourself' && /ã/.test(pl.keys) && /õ/.test(pl.keys) && /ç/.test(pl.keys) && !/è|œ/.test(pl.keys)
      && pl.src === 'audio/pt-dictation-pt1.mp3' && /Listen to the dictation|Audio unavailable/.test(pl.play), pl);
    // teclado: a letra entra no campo
    await page.evaluate(() => { [...document.querySelectorAll('#dictation-player-content .pt-letras button')].find(b => b.textContent === 'ã').click(); });
    L('letra do teclado entra no campo', await page.evaluate(() => document.getElementById('dictation-input').value === 'ã'));
    // resposta com erros do português: sem acento (Ola, Sao), número em dígito (25), contração separada (em o = no),
    // homófono (esta x está), palavra trocada (Ana -> Anna)
    await page.evaluate(() => { document.getElementById('dictation-input').value = 'Ola! Eu me chamo Anna e tenho 25 anos. Moro em o Brasil, em Sao Paulo. Você esta bem?'; document.getElementById('dictation-check-btn').click(); });
    const res = await page.evaluate(() => ({ html: document.getElementById('dictation-result-wrap').innerHTML, text: document.getElementById('dictation-result-wrap').innerText,
      sentences: [...document.querySelectorAll('.dictation-sentence')].map(li => li.className.includes('has-error') ? 'X' : 'ok').join(),
      rec: JSON.stringify(STATE.dictations.pt1), aced: STATE.dictationsAced, score: document.querySelector('.dictation-score-badge').textContent }));
    L('resultado: erro leve de acento (Olá, São, está), troca (Anna/Ana), número por extenso e contração', /dictation-word-near[^>]*>Olá/.test(res.html) && /dictation-word-near[^>]*>São/.test(res.html)
      && /dictation-word-wrong[^>]*>Anna/.test(res.html) && /vinte e cinco/.test(res.text) && /\bno\b/.test(res.text), res.text.slice(0, 900));
    L('notas com as explicações do português em inglês (acento, homófono esta/está, contração, número)', /check the accents/.test(res.text) && /“está” means “is”|esta/.test(res.text) && /em \+ o = no|one word/.test(res.text) && /Spelled out/.test(res.text), res.text);
    L('frases do texto do português (4: exclamação, 2 pontos e interrogação), com as que têm erro marcadas', res.sentences === 'X,X,X,X', res.sentences);
    L('registro da tentativa (nota, 1 tentativa, palavras para revisar)', /"attempts":1/.test(res.rec) && JSON.parse(res.rec).bestScore === Number(res.score) && JSON.parse(res.rec).wrongWords.includes('Ana'), res.rec);
    L('nada do francês na tela', !/\b(français|française|Écouter|ditado|Ouvir|virgule|Bonjour)\b/i.test(res.text), res.text);
    // frase sem mp3: cai na voz do idioma (speak da configuração)
    await page.evaluate(() => { HTMLMediaElement.prototype.play = function(){ const el = this; setTimeout(() => el.dispatchEvent(new Event('error')), 5); return Promise.resolve(); }; });
    await page.evaluate(() => document.querySelectorAll('.dictation-sentence-play')[3].click());
    await page.waitForTimeout(80);
    L('frase sem mp3 tocou na voz do idioma ("Você está bem?")', await page.evaluate(() => window.__ptSpoken.join('|') === 'Você está bem?'), await page.evaluate(() => window.__ptSpoken));
    // texto certo: 100, conta para as conquistas (90 ou mais)
    await page.click('#dictation-retry-btn');
    await page.evaluate((t) => { document.getElementById('dictation-input').value = t; document.getElementById('dictation-check-btn').click(); }, PT_TEXT);
    const ok = await page.evaluate(() => ({ score: document.querySelector('.dictation-score-badge').textContent, aced: STATE.dictationsAced, rec: STATE.dictations.pt1 }));
    L('texto certo: 100, melhor nota sobe, 2 tentativas, conta 1 ditado com 90+', ok.score === '100' && ok.rec.bestScore === 100 && ok.rec.attempts === 2 && ok.aced === 1, ok);
    L('sem rolagem horizontal em 390px', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
    // trava Premium (2º ditado, free: false) com a trava ligada: cadeado e janela do site
    await page.click('#dictation-back-to-list');
    const lock = await page.evaluate(() => {
      window.__ptDict.push({ id: 'pt2', moduleId: 'A1-m1', level: 'A1', text: 'Bom dia! Eu quero um pão, por favor.', free: false });
      window.__ptPaywall = true; pendingDictationModuleFilter = 'A1-m1'; switchTab('dictation');
      const c = document.querySelector('.dictation-card.locked'); const r = { locked: c && c.dataset.dictId, title: c && c.querySelector('.challenge-card-check').title };
      c.click(); r.premium = window.__ptPremium; r.player = document.getElementById('dictation-player-wrap').style.display;
      r.progress = document.getElementById('dictation-list-progress').innerHTML;
      return r;
    });
    L('trava ligada: 2º ditado com cadeado ("Premium") abre a janela do site, não o player', lock.locked === 'pt2' && lock.title === 'Premium' && lock.premium === 1 && lock.player === 'none', lock);
    // "voltar" sem aba de Desafios: volta para a trilha (padrão)
    await page.evaluate(() => document.getElementById('dictation-back-to-challenges').click());
    L('"voltar" padrão leva à trilha', await page.evaluate(() => document.querySelector('.view.active').id === 'view-path'));
    L('sem erro de página', errs.length === 0, errs);
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(`Ditados: motor independente do francês: ${passed} passaram, ${failed} falharam`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

// Paridade, etapa 5c (docs/historico/29-paridade-desafios.md): o motor dos Desafios (shared/desafios.js,
// shared/desafios-telas.js, shared/desafios-admin.js, shared/desafios.css) não depende do francês. Três provas:
//  1. leitura do código: o motor não cita voz, teclado, família, dado nem texto do francês (tudo isso chega pela
//     configuração, fr/desafios-config.js); os textos comuns (CHALLENGE_I18N e as chaves fr.* que o motor usa) não citam
//     o francês; pt-BR e en com as mesmas chaves; o fr/app.js não tem mais os Desafios; a ordem de carregamento no fr; o
//     <style> do fr não tem mais regra dos Desafios; o zh não carrega nada;
//  2. a marcação que o motor monta (challengesScreenHTML, challengesPremiumModalHTML, challengesImportModalHTML) é a
//     mesma do fr/index.html, então o site novo pode deixar a seção vazia;
//  3. um "site" de mentira de PORTUGUÊS com 1 desafio de cada tipo (site em inglês, como o /pt; tabela própria; sem
//     Ditados), ligado na página do fr só com registerChallenges e a seção vazia, claro e escuro a 390px: categorias,
//     álbum e Expressão do dia, cada player em pergunta e devolutiva (Ouça e traduza corrigido em inglês, Acentuação com
//     as regras do português e o teclado dele, Complete a frase), revisão dos erros, linha da trilha, admin (lista,
//     edição, aprovação) e importação gravando na tabela do site, nenhum texto do francês e sem rolagem horizontal.
// Rodar: node tests/paridade-sites/test_desafios_motor.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const H = require('./desafios-harness.js');
const ROOT = H.ROOT;
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
let passed = 0, failed = 0;
const check = (n, c, x) => { if (c) passed++; else { failed++; console.log('  FALHOU:', n, x !== undefined ? String(typeof x === 'string' ? x : JSON.stringify(x)).slice(0, 700) : ''); } };
const MOTOR = ['shared/desafios.js', 'shared/desafios-telas.js', 'shared/desafios-admin.js'];

// ---- 1. leitura do código
{
  const semComentario = (src) => src.split('\n').filter(l => !/^\s*\/\//.test(l)).map(l => l.replace(/\s\/\/.*$/, '')).join('\n');
  const code = MOTOR.map(f => semComentario(read(f))).join('\n');
  const fr = ['speakFrench', 'canSpeakFrench', 'frAccentPicker', 'wireFrAccentPicker', 'fr-accent-picker', 'latinaFr', 'LANG_HOOKS', 'meaning\\.fr', "'Vérifier'", '"Vérifier"',
    'En savoir plus', 'Pour aller plus loin', 'Pratique francês', 'real French', '\\bfrançais\\b', 'DICTATIONS\\b', "from\\('challenges'\\)", "rpc\\('get_published_challenges'\\)"];
  const achados = fr.filter(w => new RegExp(w).test(code.replace(/<[^>]*data-i18n="fr\.challenges\.sub"[^>]*>/g, '')));
  check('motor não cita voz, teclado, família, dado, tabela nem texto do francês', achados.length === 0, achados);
  // Ditados: só pelo motor dos Ditados, protegido (site sem Ditados funciona)
  const usoDit = (code.match(/dictationsVisible\(|isDictationDone\(|pendingDictationModuleFilter/g) || []).length;
  check('Ditados só com chHasDictations() (site sem Ditados funciona)', /function chHasDictations\(\)/.test(code) && (code.match(/chHasDictations\(\)/g) || []).length >= 4 && usoDit === 5, usoDit);
  // textos comuns
  const sb = { window: {} }; sb.window = sb;
  vm.runInNewContext(read('shared/desafios.js').match(/const CHALLENGE_I18N = \{[\s\S]*?\n\};/)[0].replace('const CHALLENGE_I18N', 'this.CHALLENGE_I18N'), sb);
  const CI = sb.CHALLENGE_I18N;
  const kp = Object.keys(CI['pt-BR']).sort().join(), ke = Object.keys(CI.en).sort().join();
  check('CHALLENGE_I18N: pt-BR e en com as mesmas chaves', kp === ke && Object.keys(CI['pt-BR']).length > 100, [Object.keys(CI['pt-BR']).length, Object.keys(CI.en).length]);
  const citam = [...Object.entries(CI['pt-BR']), ...Object.entries(CI.en)].filter(([, v]) => /franc[eê]s|French|Vérifier|savoir|aller plus/i.test(v));
  check('CHALLENGE_I18N não cita o francês', citam.length === 0, citam);
  const cat = { window: {} }; cat.window = cat;
  vm.runInNewContext(read('shared/i18n/pt-BR.js'), cat); vm.runInNewContext(read('shared/i18n/en.js'), cat);
  const keysFr = [...new Set(MOTOR.flatMap(f => read(f).match(/'fr\.[\w.]+'/g) || []).map(k => k.slice(1, -1)))];
  const valores = keysFr.flatMap(k => ['pt-BR', 'en'].map(l => [k, l, (cat.I18N_CATALOG[l] || {})[k]]));
  check('chaves fr.* usadas pelo motor existem em pt-BR e en e não citam o francês', keysFr.length >= 8 && valores.every(([, , v]) => v && !/franc[eê]s|French/i.test(JSON.stringify(v))), [keysFr.length, valores.filter(([, , v]) => !v || /franc|French/i.test(JSON.stringify(v)))]);
  const cfg = read('fr/desafios-config.js');
  check('fr/desafios-config.js tem o que é do francês', ["lang: 'fr'", 'latinaFr()', 'frAccentPickerHTML(expected)', 'wireFrAccentPicker(', 'Pratique francês de verdade', 'Practice real French', 'En savoir plus', 'Pour aller plus loin'].every(w => cfg.includes(w)));
  const app = read('fr/app.js');
  const nomes = ['renderChallengeCategories', 'renderChallengesList', 'openChallengePlayer', 'checkListenTranslateAnswer', 'checkAccentAnswer', 'openClozeGrammarPlayer', 'renderChallengesAdmin', 'importChallengesFromJSON',
    'loadChallengesFromDB', 'chT', 'applyChallengeI18n', 'tpZero', 'slowAudioBtnHTML', 'expressionOfTheDay', 'expressionCardHTML', 'fillExpressionLevelSections', 'dueChallengeReviews', 'buildModuleChallengesRow', 'fillModuleChallengeRows', 'md5Hex', 'accentAnswerOutcome', 'analyzeTranslation'];
  check('fr/app.js não tem mais os Desafios', nomes.every(n => !new RegExp('^(async )?function ' + n + '\\(', 'm').test(app)) && !/CHALLENGE_I18N|^const CHALLENGE(?!S_STRIP_COLLAPSE_KEY)|^let CHALLENGES/m.test(app) && (app.match(/^wireChallengesScreen\(\);$/gm) || []).length === 1);
  // paridade 5d: renderUnitsGrid é comum (shared/core/trilha-licao.js) e liga a linha quando o site tem Desafios
  const trilha = fs.readFileSync(path.join(ROOT, 'shared/core/trilha-licao.js'), 'utf8');
  check('fr/app.js liga a linha da trilha pelo gancho afterModule', /afterModule\(module, list\)\{\n\s+if \(typeof appendModuleChallengesSlot === 'function'\) appendModuleChallengesSlot\(module, list\);/.test(trilha) && /fillModuleChallengeRows\(\);/.test(trilha) && !/function renderUnitsGrid/.test(app));
  const html = read('fr/index.html');
  const iStyleEnd = html.indexOf('</style>'), iCss = html.indexOf('href="../shared/desafios.css"'), iMod = html.indexOf('href="../shared/modulos-niveis.css"');
  const pos = (s) => html.indexOf(s);
  check('fr carrega o CSS logo depois do <style> e motor -> telas -> admin -> config -> app.js (depois dos Ditados)', iCss > iStyleEnd && iCss < iMod
    && pos('"ditados-config.js"') < pos('../shared/desafios.js"') && pos('../shared/desafios.js"') < pos('../shared/desafios-telas.js"') && pos('../shared/desafios-telas.js"') < pos('../shared/desafios-admin.js"')
    && pos('../shared/desafios-admin.js"') < pos('"desafios-config.js"') && pos('"desafios-config.js"') < pos('<script src="app.js">'));
  const style = html.slice(html.indexOf('<style>'), iStyleEnd).replace(/\/\*[\s\S]*?\*\//g, '');
  const sobrou = style.split('\n').filter(l => /\.(challenge-|challenges-(?!screen)|expr-|listen-translate|cloze-grammar|tier-badge|tw-(ok|near|bad|miss)|fb-cmp|fb-ico|audio-btn-slow|dictation-play-btn-slow|audio-btn-row|module-challenges)|#(view-challenges|challenge-|challenges-)/.test(l));
  check('o <style> do fr não tem mais regra dos Desafios (fica a .challenges-screen, das Missões do dia)', sobrou.length === 0, sobrou.slice(0, 5));
  const zh = read('zh/index.html');
  check('zh não carrega nada dos Desafios (categoria B)', !/(shared\/|")desafios(-telas|-admin|-config)?\.(js|css)/.test(zh));
  check('shared/desafios.css tem as peças das telas', ['.challenge-category-card', '.expr-card', '.expr-today', '.challenge-queue-level-card', '.listen-translate-feedback', '.accent-feedback', '.cloze-grammar-slot', '.tw-near', '.challenges-admin-card', '.challenge-preview-banner', '.module-challenges', '.dictation-play-btn-slow'].every(c => read('shared/desafios.css').includes(c)));
}

// Desafios de mentira do PORTUGUÊS (escritos à mão; o /pt só tem site em inglês), 1 de cada tipo.
const PT_ROWS = [
  { id: 'pt-expr-1', type: 'expression', level: 'A1', status: 'published', data: { moduleId: 'A1-m1', canonicalExpression: 'Tudo bem?', register: 'neutral', expressionAudioFile: 'pt-expr-1.mp3',
    meaning: { pt: 'Pergunta informal para saber se a pessoa está bem.' }, example: { text: 'Oi, Ana! Tudo bem?', audioFile: 'pt-ex-1.mp3' }, question: 'Quando se diz « Tudo bem? »?',
    options: ['Ao cumprimentar alguém', 'Ao pedir a conta', 'Ao ir dormir', 'Ao pedir desculpas'], correctAnswer: 'Ao cumprimentar alguém', explanation: 'É o cumprimento mais comum no Brasil.',
    secondExample: { text: 'E aí, tudo bem com você?', audioFile: 'pt-ex-2.mp3' }, microActivity: { prompt: 'Oi! ______? — Tudo ótimo!', answer: 'Tudo bem' }, externalResources: [] } },
  { id: 'pt-lt-1', type: 'listen_translate', level: 'A1', status: 'published', data: { moduleId: 'A1-m1', sentenceFr: 'Eu moro em São Paulo com a minha irmã.', audioFile: 'pt-lt-1.mp3',
    hintText: 'Eu moro em São Paulo com a minha ____.', referenceTranslations: ['Moro em São Paulo com minha irmã.'], explanation: '"Irmã" é a palavra para a irmã.' } },
  { id: 'pt-ac-1', type: 'accent', level: 'A1', status: 'published', data: { moduleId: 'A1-m1', targetText: 'avó', audioFile: 'pt-ac-1.mp3', explanation: 'O acento agudo: avó é a mãe da mãe.' } },
  { id: 'pt-cl-1', type: 'cloze_grammar', level: 'A1', status: 'published', data: { moduleId: 'A1-m1', sentenceFr: 'Ontem nós ___ ao cinema.', blanks: [{ options: ['fomos', 'vamos', 'iremos'], answer: 'fomos' }],
    translationPt: 'Ontem nós fomos ao cinema.', explanation: 'Ontem pede o passado: fomos.' } },
  { id: 'pt-ac-2', type: 'accent', level: 'A1', status: 'needs_review', data: { targetText: 'café', audioFile: 'pt-ac-2.mp3', explanation: 'Acento agudo no e.' } },
];
const PT_OVERLAY = { 'pt-expr-1': { meaning: 'An informal way to ask if someone is okay; also used as a greeting.' },
  'pt-lt-1': { referenceTranslations: ['I live in São Paulo with my sister.', 'I live in Sao Paulo with my sister.'], explanation: '"Irmã" means sister.' },
  'pt-ac-1': { explanation: 'Acute accent: avó means grandmother.' }, 'pt-cl-1': { translation: 'Yesterday we went to the movies.', explanation: '"Ontem" (yesterday) calls for the past: fomos.' } };
const PT_CONFIG = `({
  lang: 'pt',
  familia: () => window.__ptFam || (window.__ptFam = FamiliaLatina.criar(FamiliaLatinaIdiomas.pt)),
  table: 'pt_challenges', publishedRpc: 'get_published_pt_challenges',
  accentPickerHTML: () => '<div class="pt-letras">' + window.__ptFam.htmlTecladoDeAcentos('fr-accent-picker') + '</div>',
  wireAccentPicker: (content, input) => { content.querySelectorAll('.pt-letras button').forEach(b => b.addEventListener('click', () => { input.value += b.textContent; })); },
  texts: {
    'pt-BR': { 'ch.sub': 'Pratique português de verdade.', 'ch.verify': 'Verificar', 'ch.knowMore': 'Saiba mais', 'ch.goFurther': 'Para ir além' },
    en: { 'ch.sub': 'Practice real Portuguese: expressions, listening and spelling.', 'ch.verify': 'Check', 'ch.knowMore': 'Learn more', 'ch.goFurther': 'Go further' },
  },
})`;

(async () => {
  const browser = await H.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

  // ---- 2. marcação montada = marcação do fr/index.html
  {
    const { page, ctx, server, errors } = await H.boot(browser, ROOT, {});
    const html = read('fr/index.html');
    const ini = html.indexOf('<div class="view" id="view-challenges">'), fim = html.indexOf('<footer class="app-footer">', ini);
    const secao = html.slice(ini, fim).replace(/\s*<\/div>\s*$/, '');
    const premium = html.slice(html.indexOf('<div id="premium-challenges-modal"'), html.indexOf('<!-- Jogos da Conjugação (Premium)'));
    const imp = html.slice(html.indexOf('<div id="challenges-import-modal"'), html.indexOf('<!-- ===== MODAL: SELECIONAR NÍVEL ===== -->'));
    const r = await page.evaluate(([secao, premium, imp]) => {
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
      const div = document.createElement('div'); div.innerHTML = secao + '</div>';
      // a única diferença de propósito: o subtítulo usa o texto da configuração (ch.sub), não a chave que cita o francês
      const fixo = canon(div.firstElementChild.innerHTML).replace('<p data-i18n="fr.challenges.sub" id="challenges-categories-sub">Pratique francês de verdade: expressões, compreensão auditiva e ortografia.</p>', '<p data-ch-i18n="ch.sub" id="challenges-categories-sub"></p>');
      return { estatica: fixo, montada: canon(challengesScreenHTML()), p1: canon(premium), p2: canon(challengesPremiumModalHTML()), i1: canon(imp), i2: canon(challengesImportModalHTML()) };
    }, [secao, premium, imp]);
    let i = 0; while (i < r.estatica.length && r.estatica[i] === r.montada[i]) i++;
    check('challengesScreenHTML() = seção #view-challenges do fr/index.html (menos o subtítulo, que vem da configuração)', r.estatica === r.montada && r.estatica.length > 1500,
      { estatica: r.estatica.slice(Math.max(0, i - 100), i + 160), montada: r.montada.slice(Math.max(0, i - 100), i + 160) });
    check('challengesPremiumModalHTML() e challengesImportModalHTML() = janelas do fr/index.html', r.p1 === r.p2 && r.i1 === r.i2 && r.p1.length > 300 && r.i1.length > 300);
    check('fr: sem erro de página', errors.length === 0, errors);
    await ctx.close(); server.close();
  }

  // ---- 3. site de mentira de português, ligado na página do fr (site em inglês)
  for (const theme of ['light', 'dark']){
    const { page, ctx, server, errors } = await H.boot(browser, ROOT, { lang: 'en', theme, viewport: { width: 390, height: 844 } });
    await page.addScriptTag({ url: '/shared/core/familias/latina-idiomas.js' });
    const L = (n, c, x) => check(theme + ' pt de mentira: ' + n, c, x);
    const textoTela = () => page.evaluate(() => document.getElementById('view-challenges').innerText);
    const semFrances = (t) => !/\b(français|française|Vérifier|En savoir|Pour aller|Écouter|French|francês)\b/i.test(t);
    const montou = await page.evaluate(([cfgSrc, rows, ov]) => {
      window.__CH_TABLE = 'pt_challenges';
      window.__CH_ROWS = rows; window.CHALLENGES_I18N = { en: ov };
      DICT_CONFIG = null; // site sem Ditados
      ['view-challenges'].forEach(id => { const old = document.getElementById(id); const fresh = old.cloneNode(false); old.replaceWith(fresh); });
      ['premium-challenges-modal', 'challenges-import-modal'].forEach(id => document.getElementById(id).remove());
      registerChallenges(eval(cfgSrc));
      window.__ptFam = FamiliaLatina.criar(FamiliaLatinaIdiomas.pt);
      wireChallengesScreen();
      challengesLoadedAt = 0; STATE.completedChallenges = {}; STATE.challengeReviews = {};
      switchTab('challenges');
      return { built: !!document.querySelector('#view-challenges #challenges-categories'), modals: !!document.getElementById('premium-challenges-modal') && !!document.getElementById('challenges-import-modal') };
    }, [PT_CONFIG, PT_ROWS, PT_OVERLAY]);
    await page.waitForFunction(() => document.querySelector('#challenges-categories .challenge-category-card'));
    const cats = await page.evaluate(() => ({ title: document.getElementById('challenges-categories-title').textContent, sub: document.getElementById('challenges-categories-sub').textContent,
      cards: [...document.querySelectorAll('.challenge-category-card')].map(c => c.querySelector('.challenge-category-title').textContent + ':' + c.querySelector('.challenge-category-subtitle').textContent), dit: !!document.getElementById('challenges-dictation-card'),
      n: CHALLENGES.length, db: window.__dbLog.map(x => x.table || x.rpc) }));
    L('motor montou a seção e as janelas vazias; categorias em inglês, subtítulo do português, sem cartão de Ditados', montou.built && montou.modals && cats.title === 'Challenges' && /Portuguese/.test(cats.sub)
      && cats.cards.length === 4 && /Expressions/.test(cats.cards[0]) && !cats.dit && cats.n === 5, { montou, cats });
    // álbum e Expressão do dia
    await page.evaluate(() => document.querySelector('.challenge-category-card[data-category="expression"]').click());
    const album = await page.evaluate(() => ({ hoje: (document.querySelector('.expr-today-expr') || {}).textContent, cards: document.querySelectorAll('#challenges-level-sections-inner .expr-card').length, tier: (document.querySelector('.expr-card .tier-badge') || {}).textContent }));
    L('álbum com a expressão do português e a Expressão do dia', album.hoje === 'Tudo bem?' && album.cards === 1 && album.tier === 'Premium', album);
    // Expressão: pergunta e devolutiva
    await page.evaluate(() => { document.querySelector('[data-today-open]').click(); });
    // Expressões em passos (2026-10-26): palpite -> opções -> resposta -> "Veja em frases" -> "Sua vez" -> final. O texto de todos os passos
    // junto tem de trazer o sentido (idioma estudado e inglês), o exemplo e o texto da "Sua vez", sem nada em francês.
    await page.evaluate(() => { document.getElementById('expr-see-options-btn').click(); [...document.querySelectorAll('.exercise-option')].find(b => b.querySelector('.opt-text').textContent === 'Ao cumprimentar alguém').click(); });
    const passos = [];
    for (let i = 0; i < 8; i++){
      passos.push(await page.evaluate(() => document.getElementById('challenge-player-content').innerText));
      const fim = await page.evaluate(() => !!document.getElementById('challenge-complete-btn'));
      if (fim) break;
      await page.evaluate(() => { const d = document.getElementById('expr-turn-dontknow-btn'), o = document.getElementById('expr-order-dontknow-btn'); (d && d.offsetParent ? d : (o && o.offsetParent ? o : document.getElementById('expr-continue-btn'))).click(); });
    }
    const ex = passos.join('\n');
    // 2026-10-30 (autora): a linha "significa [definição no idioma estudado]" saiu do painel da resposta (ficava colada na expressão em destaque);
    // fica só o sentido no idioma do site (aqui, inglês da camada do curso). Por isso não se exige mais o meaning.pt na tela.
    L('Expressão: certa, com o sentido em inglês (camada do curso), exemplos e "Sua vez" (sem a definição no idioma estudado)', !/Pergunta informal/.test(ex) && /An informal way to ask/.test(ex) && /Oi, Ana! Tudo bem\?/.test(ex) && /Oi! .*Tudo ótimo!/.test(ex) && semFrances(ex), ex.slice(0, 900));
    await page.evaluate(() => document.getElementById('challenge-complete-btn').click());
    // Ouça e traduza: tradução para o inglês (comparador do idioma do site)
    const lt = [];
    for (const [ans, want] of [['I live in São Paulo with my sister.', 'correct'], ['I live in Rio with my brother', 'incorrect']]){
      await page.evaluate((a) => { openChallengePlayer('pt-lt-1'); document.getElementById('lt-play-btn').click(); document.getElementById('lt-answer-input').value = a; document.getElementById('lt-verify-btn').click(); }, ans);
      const r = await page.evaluate(() => ({ cls: document.querySelector('.listen-translate-feedback').className, txt: document.getElementById('challenge-player-content').innerText, verify: document.getElementById('lt-verify-btn').textContent }));
      lt.push(r.cls.includes(want) && /Eu moro em São Paulo/.test(r.txt) && semFrances(r.txt) && r.verify === 'Check');
      if (want === 'correct') await page.evaluate(() => document.getElementById('challenge-complete-btn').click()); else await page.evaluate(() => document.getElementById('challenge-later-btn').click());
    }
    L('Ouça e traduza: tradução em inglês certa e errada, frase original do português, botão "Check" da configuração', lt.every(Boolean), lt);
    // Acentuação: regras do português (acento = quase) e o teclado dele
    const ac = [];
    for (const [ans, want] of [['avó', 'correct'], ['avo', 'partial'], ['avô', 'partial'], ['ave', 'incorrect']]){
      await page.evaluate((a) => { openChallengePlayer('pt-ac-1'); const i = document.getElementById('accent-answer-input'); i.value = a; document.getElementById('accent-verify-btn').click(); }, ans);
      ac.push((await page.evaluate(() => document.querySelector('.accent-feedback').className)).includes(want) ? want : 'X');
      await page.evaluate(() => { const c = document.getElementById('challenge-complete-btn'); if (c) c.click(); else document.getElementById('challenge-later-btn').click(); });
    }
    L('Acentuação com as regras do português: avó certa, avo/avô quase, ave errada', ac.join() === 'correct,partial,partial,incorrect', ac);
    await page.evaluate(() => openChallengePlayer('pt-ac-1'));
    const kb = await page.evaluate(() => { const ks = [...document.querySelectorAll('#challenge-player-content .pt-letras button')]; const k = ks.find(b => b.textContent === 'ã'); if (k) k.click(); return { keys: ks.map(b => b.textContent).join(''), val: document.getElementById('accent-answer-input').value }; });
    L('teclado do português (ã õ ç, sem è œ) e a letra entra no campo', /ã/.test(kb.keys) && /õ/.test(kb.keys) && /ç/.test(kb.keys) && !/è|œ/.test(kb.keys) && kb.val === 'ã', kb);
    // Complete a frase
    await page.evaluate(() => { openChallengePlayer('pt-cl-1'); [...document.querySelectorAll('.challenge-choice-btn')].find(b => b.dataset.value === 'vamos').click(); document.getElementById('cloze-grammar-verify-btn').click(); });
    const cl = await page.evaluate(() => document.getElementById('challenge-player-content').innerText);
    L('Complete a frase: errada, com a certa, a tradução e a explicação em inglês', /Ontem nós fomos ao cinema/.test(cl) && /Yesterday we went to the movies/.test(cl) && /calls for the past/.test(cl), cl.slice(0, 500));
    await page.evaluate(() => document.getElementById('challenge-later-btn').click());
    // estado, revisão dos erros, conquistas
    const st = await page.evaluate(() => ({ done: Object.keys(STATE.completedChallenges).sort().join(), rev: Object.keys(STATE.challengeReviews).sort().join(), badges: collectBadgeMetrics(STATE).challengesDone }));
    L('estado: concluídos, erros na revisão espaçada e conquistas', st.done === 'pt-ac-1,pt-expr-1,pt-lt-1' && st.rev === 'pt-ac-1,pt-cl-1,pt-lt-1' && st.badges === 3, st);
    await page.evaluate(() => { Object.values(STATE.challengeReviews).forEach(e => { e.lastErrorAt -= 9 * 86400000; e.lastSeenAt -= 9 * 86400000; }); renderChallengeCategories(); });
    await page.waitForFunction(() => document.getElementById('challenges-review-card'));
    await page.evaluate(() => document.getElementById('challenges-review-card').click());
    L('revisão dos erros abre o primeiro devido', await page.evaluate(() => !!CURRENT_CHALLENGE_PLAYER && STATE.challengeReviews[CURRENT_CHALLENGE_PLAYER.id] !== undefined));
    // fila por nível (Acentuação)
    await page.evaluate(() => renderChallengesList('accent'));
    L('fila por nível da Acentuação', await page.evaluate(() => /Level A1/.test(document.getElementById('challenges-cards').innerText)), await page.evaluate(() => document.getElementById('challenges-cards').innerText));
    // linha da trilha (sem Ditados)
    const row = await page.evaluate(() => { const r = buildModuleChallengesRow(MODULES.find(m => m.id === 'A1-m1')); return r ? r.innerText : null; });
    L('linha "Desafios do Módulo 1" da trilha sem os Ditados', row && /Module 1/.test(row) && /4 Premium challenges/.test(row) && !/dictation/i.test(row), row);
    L('sem rolagem horizontal em 390px', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
    L('nada do francês na tela dos Desafios', semFrances(await textoTela()), (await textoTela()).slice(0, 400));
    // admin e importação na tabela do site
    await page.evaluate(() => { CURRENT_USER = { id: 'a', email: 'brunemed1310@gmail.com' }; challengesLoadedAt = 0; renderChallengeCategories(); });
    await page.waitForFunction(() => document.getElementById('challenges-admin-bar').style.display === 'flex');
    await page.evaluate(() => document.getElementById('challenges-admin-review-btn').click());
    await page.waitForFunction(() => document.querySelector('#challenges-admin-content .challenges-admin-filters'));
    const adm = await page.evaluate(() => ({ cards: document.querySelectorAll('.challenges-admin-card').length, txt: document.getElementById('challenges-admin-content').innerText }));
    L('admin: lista os 5 (1 pendente)', adm.cards === 5 && /café/.test(adm.txt), adm.cards);
    await page.evaluate(() => { window.__dbLog.length = 0; window.__confirmAnswer = true; document.querySelector('.challenges-admin-card[data-challenge-id="pt-ac-2"] [data-action="approve"]').click(); });
    await page.waitForTimeout(300);
    const ap = await page.evaluate(() => window.__dbLog.filter(x => x.op === 'update').map(x => x.table + ':' + x.calls[0][1][0].status));
    L('aprovar grava na tabela do site', ap.join() === 'pt_challenges:published', ap);
    await page.evaluate(() => { document.getElementById('challenges-admin-back-btn').click(); });
    await page.waitForFunction(() => document.querySelector('#challenges-categories .challenge-category-card'));
    await page.evaluate(() => { window.__dbLog.length = 0; document.getElementById('challenges-admin-import-btn').click(); document.getElementById('challenges-import-textarea').value = JSON.stringify([{ id: 'pt-ac-3', type: 'accent', level: 'A1', targetText: 'pé' }]); document.getElementById('challenges-import-submit-btn').click(); });
    await page.waitForTimeout(400);
    const imp = await page.evaluate(() => ({ ins: window.__dbLog.filter(x => x.op === 'insert').map(x => x.table + ':' + x.calls[0][1][0].map(r => r.id + '/' + r.status).join()), status: document.getElementById('challenges-import-status').textContent }));
    L('importação grava na tabela do site, como pendente', imp.ins.join() === 'pt_challenges:pt-ac-3/needs_review' && /1/.test(imp.status), imp);
    L('sem erro de página', errors.length === 0, errors);
    await ctx.close(); server.close();
  }
  await browser.close();
  console.log(`Desafios: motor independente do francês: ${passed} passaram, ${failed} falharam`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

// K2-F -- Speed/Combinar (word-level, projeção A) e Anki (CardInstance-level,
// A e B separados). Node/VM, código real.  Rodar: node tests/k2f/test_unit.js
const { loadLang, read, extractFunction, check, summary } = require('../fase-e/harness');
const vm = require('vm');

for (const lang of ['fr', 'zh']){
  console.log('== ' + lang);
  const ctx = loadLang(lang), isZh = lang === 'zh';
  const run = c => vm.runInContext(c, ctx);
  const src = read(lang + '/app.js');
  ['hasPlainFrontBack', 'cardPromptText', 'cardAnswerText', 'buildSpeedQueue', 'buildSpeedOptions', 'startMatchGame'].forEach(f => run(extractFunction(src, f)));
  run('this.shuffle = a => a.slice(); this.renderMatchGame = function(){}; this.trackEvent = function(){}; this.MATCH_STATE = { pairSize: 50, pairs: [], tiles: [] };');
  run('this.eligibleReviewPool = function(){ return STATE.cards; };');
  run('this.cardPromptPinyinText = function(){ return ""; };');
  ctx.STATE.studySettings.newCardsPerDay = 1000; ctx.STATE.studySettings.sessionIntensity = 'intense';

  const units = ctx.UNITS.filter(u => u.type !== 'grammar' && u.vocab && u.vocab.length);
  const u0 = units.find(u => u.vocab.length >= 5), N = u0.vocab.length;
  const fresh = () => { ctx.STATE.cards = ctx.buildCardsFromUnits(ctx.UNITS); return ctx.STATE.cards; };
  const A = i => ctx.STATE.cards.find(c => c.id === `u${u0.id}-v${i}`), B = i => ctx.STATE.cards.find(c => c.id === `u${u0.id}-v${i}-b`);
  const inUnit = arr => arr.filter(c => c.unitId === u0.id);
  const study = c => Object.assign(c, { reps: 3, state: 'review', stability: 8, difficulty: 5, interval: 10, due: 1 });

  // ---- projeção A (estrutural)
  fresh();
  check(lang + ' projeção: A é projeção, B não (frontFieldIndex < backFieldIndex, sem olhar sufixo de id)', ctx.isStudyWordProjectionCard(A(0)) && !ctx.isStudyWordProjectionCard(B(0)));
  const allCardsN = ctx.STATE.cards.length, total = ctx.STATE.cards.filter(c => !ctx.isStudyTrailPhraseCard(c)).length, words = ctx.studyWordGroups(ctx.STATE.cards).length;
  check(lang + ' A: N palavras / 2N CardInstances / projeção = N', total === 2 * words && ctx.projectStudyWordsToA(ctx.STATE.cards).length === words);
  check(lang + ' projeção só devolve direção A (nenhum B)', ctx.projectStudyWordsToA(ctx.STATE.cards).every(c => ctx.isStudyWordProjectionCard(c)));
  const snapFsrs = () => JSON.stringify(ctx.STATE.cards.map(c => [c.id, c.reps, c.due, c.stability, c.difficulty, c.lapses, c.state]));
  const s0 = snapFsrs(); ctx.projectStudyWordsToA(ctx.STATE.cards); check(lang + ' projeção é somente leitura (FSRS intacto, STATE.cards com 2N)', s0 === snapFsrs() && ctx.STATE.cards.length === allCardsN);

  // ---- Speed
  fresh();
  let q = ctx.buildSpeedQueue();
  check(lang + ' Speed: fila da trilha = 1 por palavra (N), sem B', inUnit(q).length === N && q.every(c => ctx.isStudyWordProjectionCard(c)), [inUnit(q).length, N]);
  check(lang + ' Speed: sem B na fila e respeitando o teto de intensidade (palavras, não 2N)', q.length <= 60 && !q.some(c => !ctx.isStudyWordProjectionCard(c)));
  fresh(); study(A(0));                      // A estudado, B New
  q = ctx.buildSpeedQueue();
  check(lang + ' Speed: A estudado + B New = 1 item (B New não cria 2ª palavra)', q.filter(c => c.vocabIdx === 0 && c.unitId === u0.id).length === 1);
  fresh(); study(A(0)); study(B(0));
  check(lang + ' Speed: ambos estudados = 1 item', ctx.buildSpeedQueue().filter(c => c.vocabIdx === 0 && c.unitId === u0.id).length === 1);
  fresh(); ctx.STATE.studySettings.newCardsPerDay = 3;
  check(lang + ' Speed: quota de New conta palavras (B não consome)', inUnit(ctx.buildSpeedQueue()).length + ctx.buildSpeedQueue().filter(c => c.unitId !== u0.id).length <= 3);
  ctx.STATE.studySettings.newCardsPerDay = 1000;
  // direção não depende de campos legados
  fresh(); A(0).reviewDirection = 'back-to-front'; A(0).lastDirection = 'back-to-front'; B(0).lastDirection = 'front-to-back';
  const q2 = ctx.buildSpeedQueue();
  check(lang + ' Speed: independe de reviewDirection/lastDirection', q2.some(c => c === A(0)) && !q2.some(c => c === B(0)));
  check(lang + ' Speed: pergunta=idioma estudado, resposta=tradução', ctx.cardPromptText(A(0)) === (isZh ? u0.vocab[0].c : u0.vocab[0].f) && ctx.cardAnswerText(A(0)) === u0.vocab[0].t);
  // distratores
  fresh();
  const opts = ctx.buildSpeedOptions(A(0));
  check(lang + ' Speed: distratores — sem B, sem irmão do mesmo Note, sem duplicata', opts.length === 4 && !opts.some(c => c === B(0)) && new Set(opts.map(c => c.vocabIdx)).size === 4 && opts.every(c => ctx.isStudyWordProjectionCard(c)));
  check(lang + ' Speed: todas as opções têm resposta na mesma direção (tradução)', opts.every(c => ctx.cardAnswerText(c) === ctx.cardAnswerText(ctx.STATE.cards.find(x => x.id === c.id))));
  for (let k = 0; k < 30; k++){ const o = ctx.buildSpeedOptions(A(1)); if (o.some(c => c.id.endsWith('-b')) ) { check(lang + ' Speed: B apareceu como distrator', false); break; } }
  // unidade com poucas palavras: fallback não traz B
  const small = units.find(u => u.vocab.length <= 3);
  if (small){ const c = ctx.STATE.cards.find(x => x.id === `u${small.id}-v0`); const o = ctx.buildSpeedOptions(c);
    check(lang + ' Speed: unidade pequena (fallback) também sem B nem irmão', o.every(x => ctx.isStudyWordProjectionCard(x)) && o.filter(x => x.unitId === small.id && x.vocabIdx === 0).length === 1); }
  // Teacher/Self preservados
  fresh();
  const t1 = { id: 't9', origin: 'teacher', unitId: null, reps: 0, due: 0, state: 'new', flashcardStatus: 'active', cardInstance: { cardTypeId: 'normal', frontFieldIndex: 1, backFieldIndex: 0 }, note: { fields: [{ text: 'x', lang: isZh ? 'zh' : 'fr' }, { text: 'y', lang: 'pt-BR' }] } };
  check(lang + ' Teacher/Self: card invertido (front>back) NÃO é tratado como B da trilha', ctx.isStudyWordProjectionCard(t1) === true && ctx.projectStudyWordsToA([t1]).length === 1);
  const t2 = Object.assign({}, t1, { id: 't9-b' });
  check(lang + ' Teacher/Self: 2 CardInstances continuam 2 itens', ctx.projectStudyWordsToA([t1, t2]).length === 2);

  // ---- Combinar
  fresh(); ctx.MATCH_STATE.pairSize = 4;
  ctx.startMatchGame();
  check(lang + ' Combinar: pares sem B nem palavra repetida', ctx.MATCH_STATE.pairs.length === 4 && ctx.MATCH_STATE.pairs.every(c => ctx.isStudyWordProjectionCard(c)) && new Set(ctx.MATCH_STATE.pairs.map(c => c.unitId + ':' + c.vocabIdx)).size === 4);
  check(lang + ' Combinar: 2 tiles por palavra (frente+verso), textos sem duplicata', ctx.MATCH_STATE.tiles.length === 8 && new Set(ctx.MATCH_STATE.tiles.map(t => t.text)).size === 8);
  ctx.MATCH_STATE.pairSize = 1000; ctx.startMatchGame();
  check(lang + ' Combinar: máximo = nº de palavras (não 2N)', ctx.MATCH_STATE.pairs.length === words);
  fresh(); study(A(0)); const s1 = snapFsrs(); ctx.MATCH_STATE.pairSize = 8; ctx.startMatchGame();
  check(lang + ' Combinar: apresentar a palavra não altera FSRS de A nem B', s1 === snapFsrs());
  fresh(); A(0).lastDirection = 'back-to-front'; ctx.MATCH_STATE.pairSize = 1000; ctx.startMatchGame();
  check(lang + ' Combinar: independe de lastDirection/reviewDirection', ctx.MATCH_STATE.pairs.length === words);

  // ---- Anki (classificação, campos, identidade)
  run(read('shared/anki-export.js'));
  const ankiSrc = read(lang + '/app.js');
  const start = ankiSrc.indexOf('const ANKI_EXPORT_CONFIG = {'), end = ankiSrc.indexOf('\n};', start) + 3;
  ctx.APP_IDENTITY = new Proxy({}, { get: () => new Proxy({}, { get: () => ({ name: 'App' }) }) });
  ctx.unitOrdinalInfo = () => ({ num: 1 }); ctx.unitsOfLevel = () => [];
  if (isZh) run(extractFunction(ankiSrc, 'zhTypeAnswerExportColumns')); 
  run(ankiSrc.slice(start, end).replace('const ANKI_EXPORT_CONFIG', 'this.ANKI_EXPORT_CONFIG'));
  ctx.ankiFieldHTML = ctx.ankiFieldHTML || ((t) => t);
  fresh(); const cfg = ctx.ANKI_EXPORT_CONFIG;
  ctx.cardPromptPinyinText = (c) => { const v = ctx.resolveCardContentView(c); return v.front.pinyinText || ''; };
  const all = cfg.cards('all');
  check(lang + ' Anki: exporta A e B (2N cartões), nada colapsado', all.length === allCardsN && all.filter(c => c.id.endsWith('-b')).length === words);
  check(lang + ' Anki: ids/guids únicos, A e B distintos', new Set(all.map(c => cfg.guidPrefix + c.id)).size === allCardsN);
  check(lang + ' Anki: A = basic, B = reverse (modelo próprio)', ctx.ankiExportCardKind(A(0)) === 'basic' && ctx.ankiExportCardKind(B(0)) === 'reverse');
  const word = isZh ? u0.vocab[0].c : u0.vocab[0].f, tr = u0.vocab[0].t;
  const fa = cfg.noteFields(A(0), null), fb = cfg.reverseFields(B(0), null);
  if (isZh){
    check('zh Anki A: Pinyin/Caractere/Tradução', fa[0] === u0.vocab[0].p && fa[1] === word && fa[2] === tr, fa);
    check('zh Anki B: MESMOS campos semânticos (Pinyin/Caractere/Tradução), direção no template', fb[0] === u0.vocab[0].p && fb[1] === word && fb[2] === tr, fb);
    check('zh Anki B: template reverso mostra Tradução na frente e revela Pinyin+Caractere', /\{\{Tradução\}\}/.test(cfg.reverseQfmt) && !/\{\{Pinyin\}\}/.test(cfg.reverseQfmt) && /\{\{Pinyin\}\}/.test(cfg.reverseAfmt) && /\{\{Caractere\}\}/.test(cfg.reverseAfmt));
  } else {
    check('fr Anki A: Francês/Tradução', fa[0] === word && fa[1] === tr, fa);
    check('fr Anki B: MESMOS campos semânticos (Francês/Tradução), direção no template', fb[0] === word && fb[1] === tr, fb);
    check('fr Anki B: template reverso mostra Tradução na frente e revela Francês', /\{\{Tradução\}\}/.test(cfg.reverseQfmt) && !/\{\{Francês\}\}/.test(cfg.reverseQfmt) && /\{\{Francês\}\}/.test(cfg.reverseAfmt));
  }
  check(lang + ' Anki: sortField de B é o texto estudado (não vazio)', cfg.sortField(B(0)) && cfg.sortField(B(0)).length > 0);
  // Teacher/Self e Cloze preservados
  // hardening: teacher/self INVERTIDO agora usa o modelo Reverso (ver test_anki_teacher_self_reverse.js); a expectativa antiga era 'basic'
  check(lang + ' Anki: teacher/self invertido → Reverso (decisão do hardening substitui a K2-F original)', ctx.ankiExportCardKind(t1) === 'reverse' && ctx.ankiExportCardKind(Object.assign({}, t1, { origin: 'self' })) === 'reverse');
  check(lang + ' Anki: Cloze continua cloze (CardInstance-level)', ctx.ankiExportCardKind({ origin: 'self', cardInstance: { cardTypeId: 'cloze' } }) === 'cloze');
}
summary('K2-F unit');

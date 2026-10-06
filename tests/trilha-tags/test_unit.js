// Trilha: tags automáticas (§11.1) + cartões "Na frase" opt-in.
// Node/VM sobre o código REAL. Rodar: node tests/trilha-tags/test_unit.js
const vm = require('vm');
const { loadLang, read, check, summary, fakeEnsureCourseDecks } = require('../fase-e/harness');

for (const lang of ['fr', 'zh']){
  console.log('== ' + lang);
  const ctx = loadLang(lang);
  const run = c => vm.runInContext(c, ctx);
  const isZh = lang === 'zh';
  const course = isZh ? 'mandarim-geral' : 'frances-geral';
  const units = ctx.UNITS.filter(u => u.type !== 'grammar' && u.vocab && u.vocab.length);
  const cards = ctx.buildCardsFromUnits(ctx.UNITS);
  const u0 = units[0];
  const A = cards.find(c => c.id === `u${u0.id}-v0`), B = cards.find(c => c.id === `u${u0.id}-v0-b`);

  // ---------- Tarefa 1: tags ----------
  check(lang + ' A tem estudo/curso/palavra', ['estudo', course, 'palavra'].every(t => A.tags.includes(t)), A.tags);
  check(lang + ' irmãs A/B com as MESMAS tags', JSON.stringify(A.tags) === JSON.stringify(B.tags));
  check(lang + ' unidade-<slug do título>', A.tags.includes('unidade-' + ctx.normalizeTagSlug(u0.title)), A.tags);
  check(lang + ' nível', A.tags.includes('nivel-' + ctx.normalizeTagSlug(u0.level)), A.tags);
  check(lang + ' licao-1 para vocab da 1ª lição', A.tags.includes('licao-1'), A.tags);
  const li2 = u0.lessons.findIndex(l => l.vocabIdx && l.vocabIdx.length) >= 0 ? u0.lessons[1] : null;
  if (li2 && li2.vocabIdx.length){
    const c2 = cards.find(c => c.id === `u${u0.id}-v${li2.vocabIdx[0]}`);
    check(lang + ' licao-2 para vocab da 2ª lição', c2.tags.includes('licao-2') && !c2.tags.includes('licao-1'), c2.tags);
  }
  if (isZh){
    check('zh: sem MODULES -> sem modulo-N', cards.every(c => !c.tags.some(t => /^modulo-/.test(t))));
  } else {
    check('fr: A1-1 está no modulo-1', A.tags.includes('modulo-1'), A.tags);
    const u5 = cards.find(c => c.unitId === 'A1-5');
    check('fr: A1-5 está no modulo-2', u5 && u5.tags.includes('modulo-2'), u5 && u5.tags);
  }
  check(lang + ' toda tag da trilha é canônica (normalizeTagSlug idempotente)', cards.every(c => c.tags.every(t => ctx.normalizeTagSlug(t) === t)));
  check(lang + ' toda Note da trilha passa validateNoteTags (20/50)', cards.every(c => ctx.validateNoteTags(c.tags).ok));
  check(lang + ' 1 tag unidade-* por card e distinta entre unidades', (() => {
    const per = new Map(); cards.forEach(c => { const t = c.tags.filter(x => /^unidade-/.test(x)); if (t.length !== 1) per.set('bad', 1); per.set(String(c.unitId), t[0]); });
    return !per.has('bad') && new Set([...per.values()]).size === per.size;
  })());

  // save não guarda tags; load re-deriva
  const s = ctx.serializeCardsForSave([A])[0];
  check(lang + ' save não contém tags', !('tags' in s));
  ctx.STATE.cards = ctx.buildCardsFromUnits(ctx.UNITS);
  ctx.applySerializedState({ cards: [Object.assign({}, s, { tags: ['lixo'] })] });
  const A2 = ctx.STATE.cards.find(c => c.id === A.id);
  check(lang + ' load: tags derivadas, nunca as do save', !A2.tags.includes('lixo') && A2.tags.includes('estudo'));

  // filtro de Review por tag enxerga a trilha
  run(`STATE.unitProgress = {}; UNITS.forEach(u => STATE.unitProgress[u.id] = {started:true, completed:true, lessonIdx:99});`);
  run(`STATE.studySettings.reviewTagFilter = ['${'unidade-' + ctx.normalizeTagSlug(u0.title)}'];`);
  const pool = run('eligibleReviewPool()');
  check(lang + ' filtro unidade-* -> só cards dessa unidade', pool.length === u0.vocab.length * 2 && pool.every(c => c.unitId === u0.id), pool.length);
  run(`STATE.studySettings.reviewTagFilter = ['${course}'];`);
  check(lang + ' filtro curso -> trilha toda', run('eligibleReviewPool()').length === ctx.STATE.cards.length);
  run(`STATE.studySettings.reviewTagFilter = [];`);
  check(lang + ' filtro vazio -> sem restrição', run('eligibleReviewPool()').length === ctx.STATE.cards.length);

  // chips: tags finas da trilha não poluem; tags de cartões próprios sim
  const own = { id: 's1', origin: 'self', tags: ['palavra', 'unidade-x', 'verbos'] };
  const vis = ctx.reviewFilterVisibleTags(ctx.STATE.cards.concat([own]));
  check(lang + ' chips: sem unidade-*/licao-* da trilha', !vis.some(t => t !== 'unidade-x' && /^unidade-|^licao-/.test(t)), vis);
  check(lang + ' chips: tags grossas da trilha presentes', vis.includes('estudo') && vis.includes(course), vis);
  check(lang + ' chips: tags de cartão próprio aparecem (mesmo "palavra"/"unidade-x")', ['palavra', 'unidade-x', 'verbos'].every(t => vis.includes(t)), vis);
  check(lang + ' chips: total pequeno', vis.length <= 15, vis.length);

  // Anki: comportamento da trilha mantido (unidadeN)
  run(read('shared/anki-export.js'));
  check(lang + ' Anki trilha continua unidadeN', ctx.ankiNoteTagsString(A) === `unidade${u0.id} `);

  // ---------- Tarefa 2: "Na frase" opt-in ----------
  const realStudyable = ctx.UNITS.some(u => (u.phrases || []).some(p => p.studyable === true));
  check(lang + ' nenhuma frase real marcada studyable (ninguém afetado)', !realStudyable);
  check(lang + ' sem frase estudável: nenhum card u*-p*', cards.every(c => !/-p\d+$/.test(c.id)));

  const units2 = JSON.parse(JSON.stringify(ctx.UNITS));
  const tu = units2.find(u => u.id === u0.id);
  tu.phrases[0].studyable = true;
  const cards2 = ctx.buildCardsFromUnits(units2);
  const P = cards2.filter(c => c.id === `u${u0.id}-p0`);
  check(lang + ' frase estudável -> 1 card u{unit}-p0', P.length === 1 && cards2.length === cards.length + 1, cards2.length - cards.length);
  const p = P[0];
  check(lang + ' card de frase: origin study, unitId, vocabIdx null, phraseIdx 0', p.origin === 'study' && p.unitId === u0.id && p.vocabIdx === null && p.phraseIdx === 0);
  const pv = ctx.resolveCardContentView(p);
  const ph = ctx.UNITS.find(u => u.id === u0.id).phrases[0];
  check(lang + ' frente = frase no idioma estudado, verso = tradução', pv.front.text === (isZh ? ph.c : ph.f) && pv.back.text === ph.t);
  if (isZh) check('zh: pinyin acompanha a frase', pv.front.pinyinText === ph.p);
  check(lang + ' tags: na-frase no lugar de palavra, sem licao', p.tags.includes('na-frase') && !p.tags.includes('palavra') && !p.tags.some(t => /^licao-/.test(t)) && p.tags.includes('estudo') && p.tags.includes(course), p.tags);
  check(lang + ' ids únicos', new Set(cards2.map(c => c.id)).size === cards2.length);
  // deck
  const store = []; const decks = fakeEnsureCourseDecks(store, ctx.APP_KEY, ctx.courseUnitsForDecks(ctx.UNITS));
  ctx.assignCourseDeckIds(cards2, ctx.buildCourseDeckIndex(decks, ctx.APP_KEY));
  const a2 = cards2.find(c => c.id === `u${u0.id}-v0`);
  check(lang + ' frase no MESMO Course Deck da unidade', p.deckId != null && p.deckId === a2.deckId);
  // gate
  ctx.UNITS.splice(0, ctx.UNITS.length, ...units2);
  run(`STATE.unitProgress = {}; STATE.unitProgress['${u0.id}'] = {started:true, completed:false, lessonIdx:99};`);
  check(lang + ' gate: unidade não concluída -> frase fora da revisão', ctx.isCardLessonCompleted(p) === false && ctx.isCardLessonCompleted(a2) === true);
  run(`STATE.unitProgress['${u0.id}'].completed = true;`);
  check(lang + ' gate: unidade concluída -> frase elegível', ctx.isCardLessonCompleted(p) === true);
  // métricas por palavra ignoram frase
  const unitPool = cards2.filter(c => c.unitId === u0.id);
  check(lang + ' studyWordGroups ignora frase', ctx.studyWordGroups(unitPool).length === u0.vocab.length);
  check(lang + ' isStudyTrailWordCard(frase) = false', !ctx.isStudyTrailWordCard(p) && ctx.isStudyTrailPhraseCard(p));
  check(lang + ' projectStudyWordsToA exclui frase (Speed/Combinar)', !ctx.projectStudyWordsToA(unitPool).includes(p) && ctx.projectStudyWordsToA(unitPool).length === u0.vocab.length);
  p.reps = 3;
  const wp = ctx.studyTrailWordProgress(unitPool);
  check(lang + ' studyTrailWordProgress: total = palavras, frase estudada não conta', wp.total === u0.vocab.length && wp.learned === 0, wp);
  // save/load progresso da frase
  const sp = ctx.serializeCardsForSave([p])[0];
  check(lang + ' save da frase = só id+progresso', sp.id === p.id && sp.reps === 3 && !('tags' in sp) && !('phraseIdx' in sp));
  const fresh = ctx.buildCardsFromUnits(units2);
  ctx.mergeSavedCards(fresh, [sp]);
  const pf = fresh.find(c => c.id === p.id);
  check(lang + ' load: progresso da frase volta, phraseIdx preservado', pf.reps === 3 && pf.phraseIdx === 0 && pf.tags.includes('na-frase'));
  // Anki: frase vai no modelo básico (não "reverse")
  check(lang + ' Anki: frase -> modelo basic', ctx.ankiExportCardKind(p) === 'basic');
}
summary('Trilha tags + Na frase unit');

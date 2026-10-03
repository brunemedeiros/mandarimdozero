// K.4 -- consolidação de progresso/conteúdo (Note) x CardInstance. Node/VM, código real.
// Rodar: node tests/k4/test_k4_progress.js
const { loadLang, read, extractFunction, check, summary } = require('../fase-e/harness');
const vm = require('vm');
for (const lang of ['fr', 'zh']){
  console.log('== ' + lang);
  const ctx = loadLang(lang), run = c => vm.runInContext(c, ctx), src = read(lang + '/app.js');
  ['unitCardCounts', 'checkUnitCompletion'].forEach(fn => run(extractFunction(src, fn)));
  const completed = []; ctx.markUnitCompleted = id => completed.push(id);
  const fresh = () => { ctx.STATE.cards = ctx.buildCardsFromUnits(ctx.UNITS); completed.length = 0; };
  const u0 = ctx.UNITS.filter(u => u.type !== 'grammar' && u.vocab && u.vocab.length).find(u => u.vocab.length >= 3), N = u0.vocab.length;
  const A = i => ctx.STATE.cards.find(c => c.id === `u${u0.id}-v${i}`), B = i => ctx.STATE.cards.find(c => c.id === `u${u0.id}-v${i}-b`);
  const study = (c, o) => Object.assign(c, { reps: 2, state: 'review', interval: 10, lapses: 0, stability: 8, difficulty: 5 }, o || {});
  const P = () => ctx.studyTrailWordProgress(ctx.STATE.cards);
  // 1. Study Trail
  fresh(); const total = P().total;
  check(lang + ' 1: nenhum estudado = 0 aprendidas', P().learned === 0);
  study(A(0)); check(lang + ' 1: A estudado/B New = 1', P().learned === 1);
  fresh(); study(B(0)); check(lang + ' 1: B estudado/A New = 1', P().learned === 1);
  study(A(0)); check(lang + ' 1: ambos = 1 palavra', P().learned === 1);
  // 2. Curso: denominador inclui não estudadas; Teacher/Self fora
  const T = (id, row, o) => Object.assign({ id, origin: 'teacher', rowId: row, flashcardStatus: 'active', reps: 1, state: 'review', interval: 10, lapses: 0, due: 1 }, o);
  const S = (id, row, o) => T(id, row, Object.assign({ origin: 'self' }, o));
  fresh(); ctx.STATE.cards.push(T('t1', 1), S('s1', 1));
  check(lang + ' 2: total = todas as palavras do curso (nº de Notes da trilha), Teacher/Self fora', P().total === total && total === ctx.STATE.cards.filter(c => c.origin === 'study').length / 2 && P().learned === 0);
  check(lang + ' 2: gráfico (datas) só trilha', ctx.wordLevelFirstLearnedDates(ctx.STATE.cards.concat([T('t9', 9, { firstLearnedDate: '2026-01-01' })])).length === 0);
  // 3. Unidade
  fresh(); let uc = ctx.unitCardCounts(u0.id);
  check(lang + ' 3: unidade = N palavras / 2N cartões', uc.total === N && uc.totalCards === 2 * N && uc.learned === 0, uc);
  for (let i = 0; i < N; i++) study(A(i));   // B New em todas
  check(lang + ' 3: B New não bloqueia conclusão', (ctx.checkUnitCompletion(u0.id), completed.includes(u0.id)));
  uc = ctx.unitCardCounts(u0.id); check(lang + ' 3: percentual não duplica A/B (learned=N de N)', uc.learned === N && uc.total === N, uc);
  fresh(); study(A(0)); ctx.checkUnitCompletion(u0.id); check(lang + ' 3: 1 palavra estudada não conclui', completed.length === 0);
  // 4/5. Teacher/Self: conteúdo por Note, força
  for (const mk of [T, S]){
    const o = mk === T ? 'teacher' : 'self';
    const cm = cs => ctx.ownContentProgress(cs, o);
    check(lang + ` 4/5 ${o}: 2 siblings = 1 conteúdo, um estudado => estudado`, (r => r.total === 1 && r.studied === 1)(cm([mk('x', 1), mk('x-b', 1, { reps: 0, state: 'new', due: 0 })])));
    check(lang + ` ${o}: nenhum estudado => não iniciado, força não iniciada`, (r => r.notStarted === 1 && r.strength.not_started === 1 && r.strength.weak === 0)(cm([mk('x', 1, { reps: 0, state: 'new', due: 0 })])));
    check(lang + ` ${o}: dois estudados => mais fraco`, cm([mk('x', 1, { interval: 90 }), mk('x-b', 1, { interval: 10 })]).strength.medium === 1);
    check(lang + ` ${o}: New não rebaixa`, cm([mk('x', 1, { interval: 90 }), mk('x-b', 1, { reps: 0, state: 'new', due: 0 })]).strength.strong === 1);
    check(lang + ` ${o} 6: arquivado fora do universo ativo`, cm([mk('x', 1, { flashcardStatus: 'archived' })]).total === 0);
    check(lang + ` ${o} 7: reverso 2 cartões / 1 Note`, ctx.structuralCounts([mk('x', 1), mk('x-b', 1)]).cards === 2 && cm([mk('x', 1), mk('x-b', 1)]).total === 1);
    check(lang + ` ${o} 8: Cloze N=3 cartões / 1 Note`, ctx.structuralCounts([1, 2, 3].map(k => mk('x-c' + k, 1))).cards === 3 && cm([1, 2, 3].map(k => mk('x-c' + k, 1))).total === 1);
    check(lang + ` ${o} 9: -rN agrupa pela Note (rowId), não pelo sufixo`, cm([mk('x-r2', 1), mk('x-r2-b', 1), mk('y-r1', 2)]).total === 2);
  }
  // 10. Mistura: Teacher e Self com o MESMO rowId não colidem; trilha à parte
  const mix = [T('t1', 1), S('s1', 1), T('t2', 2, { flashcardStatus: 'archived' })];
  fresh(); ctx.STATE.cards.push(...mix);
  check(lang + ' 10: Teacher/Self separados, mesmo rowId', ctx.ownContentProgress(ctx.STATE.cards, 'teacher').total === 1 && ctx.ownContentProgress(ctx.STATE.cards, 'self').total === 1);
  // 11. numerador <= denominador; Notes != CardInstances
  const w = P(), t = ctx.ownContentProgress(ctx.STATE.cards, 'teacher');
  check(lang + ' 11: numerador <= denominador e Notes != CardInstances', w.learned <= w.total && t.studied <= t.total && w.total * 2 === ctx.STATE.cards.filter(c => c.origin === 'study').length);
}
summary('K.4 progresso');

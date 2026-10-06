// A0 (Fase 0 da trilha): unidade concluída pelo fluxo normal tem lessonIdx=0
// (o app zera ao concluir) e seus cartões DEVEM continuar elegíveis na Revisão.
// Usa o estado REAL pós-conclusão, não lessonIdx:99 (valor que o app nunca grava).
// Rodar: node tests/trilha/test_a0_eligibility.js
const fs = require('fs');
const { loadLang, read, check, summary } = require('../fase-e/harness');

for (const lang of ['fr', 'zh']){
  console.log('== ' + lang);
  const ctx = loadLang(lang);
  const u = ctx.UNITS.find(x => x.type !== 'grammar' && x.vocab && x.vocab.length && (x.lessons || []).length);
  ctx.STATE.cards = ctx.buildCardsFromUnits(ctx.UNITS);
  const cards = ctx.STATE.cards.filter(c => c.unitId === u.id);
  const elig = () => cards.filter(c => ctx.isCardLessonCompleted(c)).length;

  ctx.STATE.unitProgress = { [u.id]: { started: true, completed: false, lessonIdx: 0 } };
  check(lang + ': unidade nova (lessonIdx 0, não concluída): 0 elegíveis', elig() === 0);

  ctx.STATE.unitProgress = { [u.id]: { started: true, completed: false, lessonIdx: 1 } };
  const parcial = elig();
  check(lang + ': em andamento (lição 1 feita): só cartões das lições feitas', parcial > 0 && parcial < cards.length);

  ctx.STATE.unitProgress = { [u.id]: { started: true, completed: true, lessonIdx: 0 } };
  check(lang + ': CONCLUÍDA com lessonIdx=0 (estado real): todos elegíveis (' + cards.length + ')', elig() === cards.length);

  ctx.STATE.unitProgress = { [u.id]: { started: false, completed: false, lessonIdx: 0 } };
  check(lang + ': não iniciada: 0 elegíveis', elig() === 0);
}

// Espelho do servidor (notification-cron): mesma regra.
const src = read('supabase/functions/notification-cron/index.ts');
const m = /function isCardLessonCompletedServer[\s\S]*?\n}\n/.exec(src)[0]
  .replace(/: any/g, '').replace(/: string/g, '').replace(/: boolean/g, '');
const fn = new Function('LESSON_VOCAB_MAP', m + '; return isCardLessonCompletedServer;')({ frances: { '1': [[0, 1], [2, 3]] } });
check('servidor: concluída com lessonIdx=0 libera cartão de lição', fn({ unitId: 1, vocabIdx: 3 }, { 1: { started: true, completed: true, lessonIdx: 0 } }, 'frances') === true);
check('servidor: em andamento só libera lições feitas', fn({ unitId: 1, vocabIdx: 3 }, { 1: { started: true, completed: false, lessonIdx: 1 } }, 'frances') === false
  && fn({ unitId: 1, vocabIdx: 0 }, { 1: { started: true, completed: false, lessonIdx: 1 } }, 'frances') === true);
check('servidor: não iniciada não libera', fn({ unitId: 1, vocabIdx: 0 }, { 1: { started: false, completed: false, lessonIdx: 0 } }, 'frances') === false);
summary();

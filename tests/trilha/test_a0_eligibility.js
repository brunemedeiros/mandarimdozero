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
  // Cada cenário é um estado de unidade independente (o progresso real nunca volta de "concluída" para "não iniciada"):
  // apaga a marca `released` do cenário anterior (Etapa 0 do currículo, 2.3 item 8; testada em tests/curriculo-ids).
  const elig = () => { cards.forEach(c => { delete c.released; }); return cards.filter(c => ctx.isCardLessonCompleted(c)).length; };

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
// Etapa 0b: unidade e lição vêm do mapa gerado (STUDY_ITEM_GATE); a função recebe a entrada do mapa ({unitId, lessonIdx}).
const m = require('module').stripTypeScriptTypes(/function isStudyWordReleasedServer[\s\S]*?\n}\n/.exec(src)[0]);
const srv = new Function(m + '; return isStudyWordReleasedServer;')();
// palavra na lição 1 (índice) e na lição 0 da unidade '1'
const fn = (lessonIdx, prog, card) => srv(card || {}, { unitId: '1', lessonIdx }, { 1: prog });
check('servidor: concluída com lessonIdx=0 libera cartão de lição', fn(1, { started: true, completed: true, lessonIdx: 0 }) === true);
check('servidor: em andamento só libera lições feitas', fn(1, { started: true, completed: false, lessonIdx: 1 }) === false
  && fn(0, { started: true, completed: false, lessonIdx: 1 }) === true);
check('servidor: não iniciada não libera', fn(0, { started: false, completed: false, lessonIdx: 0 }) === false);
check('servidor: released passa sempre (Etapa 0)', fn(1, { started: false, completed: false, lessonIdx: 0 }, { released: true }) === true);
summary('trilha a0');

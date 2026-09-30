// K2-D -- direção é propriedade do CardInstance (Node/VM, código real).
// Rodar: node tests/k2d/test_native_direction.js
const { loadLang, read, check, summary } = require('../fase-e/harness');

for (const lang of ['fr', 'zh']){
  console.log('== ' + lang);
  const ctx = loadLang(lang), isZh = lang === 'zh';
  const u = ctx.UNITS.filter(x => x.type !== 'grammar' && x.vocab && x.vocab.length)[0], v0 = u.vocab[0];
  const cards = ctx.buildCardsFromUnits(ctx.UNITS);
  const A = cards.find(c => c.id === `u${u.id}-v0`), B = cards.find(c => c.id === `u${u.id}-v0-b`);
  const study = isZh ? v0.c : v0.f;
  const view = c => JSON.stringify(ctx.resolveCardContentView(c));
  // A. direção
  const vA = ctx.resolveCardContentView(A), vB = ctx.resolveCardContentView(B);
  check(lang + ' A: frente=idioma estudado, verso=tradução', vA.front.text === study && vA.back.text === v0.t);
  check(lang + ' B: frente=tradução, verso=idioma estudado (oposto)', vB.front.text === v0.t && vB.back.text === study);
  // repetir review não alterna: aplicar grades sucessivas e reler a view
  const a0 = view(A), b0 = view(B);
  for (let i = 0; i < 4; i++){ ctx.applyMemoryGrade(A, 2); ctx.applyMemoryGrade(B, i % 2 ? 0 : 2); }
  check(lang + ' A/B: direção estável após várias revisões', view(A) === a0 && view(B) === b0);
  // C. campos legados não influenciam o nativo
  A.reviewDirection = 'back-to-front'; A.lastDirection = 'front-to-back';
  B.reviewDirection = 'front-to-back'; B.lastDirection = 'back-to-front';
  check(lang + ' reviewDirection/lastDirection não alteram a view nativa', view(A) === a0 && view(B) === b0);
  check(lang + ' nextCardDirection removido (K2-G); view idêntica', typeof ctx.nextCardDirection === 'undefined' && view(A) === a0);
  // B. independência
  const f = c => JSON.stringify([c.reps, c.due, c.stability, c.difficulty, c.lapses, c.state]);
  const fb = f(B);
  ctx.applyMemoryGrade(A, 3);
  check(lang + ' grade em A não altera B (reps/due/stability/difficulty/lapses)', f(B) === fb);
  const fa = f(A); ctx.applyMemoryGrade(B, 0);
  check(lang + ' grade em B não altera A', f(A) === fa);
  // D. mesmo deck, sem colapso
  check(lang + ' A e B são CardInstances distintos', A !== B && A.cardInstance.id !== B.cardInstance.id && A.id !== B.id);
  // Fonte: caminhos de Review não impõem direção legada a card nativo
  const src = read(lang + '/app.js');
  const code = src.split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
  check(lang + ' fonte (K2-G): sessão não escolhe direção (sem nextCardDirection/reviewDirection)', !/nextCardDirection|reviewDirection/.test(code));
  check(lang + ' fonte (K2-G): gradeCurrentCard não grava lastDirection', !/lastDirection/.test(code));
  check(lang + ' fonte (K2-G): renderNormalCard sem ramo legado nem isReverse', !/isReverse/.test(code));
  // nenhum card de trilha sem CardInstance (ramo legado inalcançável p/ Study Trail)
  check(lang + ' todo card da trilha tem CardInstance', cards.every(c => !!c.cardInstance));
}
summary('K2-D direção nativa');

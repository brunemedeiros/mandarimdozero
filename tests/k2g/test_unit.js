// K2-G -- remoção da infraestrutura legada de direção. Node/VM, código real.
// Rodar: node tests/k2g/test_unit.js
// Teste negativo: contra o código anterior à K2-G, os checks de "fonte" falham
// (nextCardDirection/reviewDirection/lastDirection/isReverse existiam em código).
const { loadLang, read, check, summary } = require('../fase-e/harness');
const noComments = src => src.split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
const FORBIDDEN = /nextCardDirection|reviewDirection|lastDirection/;

console.log('== fonte');
for (const f of ['fr/app.js', 'zh/app.js', 'shared/srs.js', 'shared/study-trail-model.js', 'shared/anki-export.js', 'shared/deck-engine.js', 'shared/flashcard-model.js']){
  check(f + ': sem nextCardDirection/reviewDirection/lastDirection em código', !FORBIDDEN.test(noComments(read(f))));
}
for (const f of ['fr/app.js', 'zh/app.js']){
  const code = noComments(read(f));
  check(f + ': sem isReverse em código (renderNormalCard estrutural)', !/\bisReverse\b/.test(code));
  check(f + ': sem escrita de direção em sessão/grade (sem ".lastDirection =" / ".reviewDirection =")', !/\.(lastDirection|reviewDirection)\s*=/.test(code));
}

for (const lang of ['fr', 'zh']){
  console.log('== ' + lang);
  const ctx = loadLang(lang), isZh = lang === 'zh';
  check(lang + ' nextCardDirection não existe mais', typeof ctx.nextCardDirection === 'undefined');
  const cards = ctx.buildCardsFromUnits(ctx.UNITS);
  check(lang + ' alcançabilidade: todo card da trilha tem CardInstance (ramo legado inalcançável)', cards.every(c => !!c.cardInstance));
  check(lang + ' cards da trilha nascem sem campos de direção', cards.every(c => !('lastDirection' in c) && !('reviewDirection' in c)));

  const u = ctx.UNITS.find(x => x.type !== 'grammar' && x.vocab && x.vocab.length);
  const A = cards.find(c => c.id === `u${u.id}-v0`), B = cards.find(c => c.id === A.id + '-b');
  const view = c => JSON.stringify(ctx.resolveCardContentView(c));
  const a0 = view(A), b0 = view(B);
  const study = isZh ? u.vocab[0].c : u.vocab[0].f;
  // poison
  [A, B].forEach(c => { c.lastDirection = 'back-to-front'; c.reviewDirection = 'back-to-front'; c.nextCardDirection = 'back-to-front'; });
  check(lang + ' poison de lastDirection/reviewDirection/nextCardDirection não altera A nem B', view(A) === a0 && view(B) === b0);
  [A, B].forEach(c => { c.lastDirection = 'front-to-back'; c.reviewDirection = 'front-to-back'; });
  check(lang + ' poison oposto também não altera', view(A) === a0 && view(B) === b0);
  const vA = ctx.resolveCardContentView(A), vB = ctx.resolveCardContentView(B);
  check(lang + ' A continua A (frente = idioma estudado), B continua B (frente = tradução)', vA.front.text === study && vA.back.text === u.vocab[0].t && vB.front.text === u.vocab[0].t && vB.back.text === study);
  check(lang + ' A/B são CardInstances independentes', A.cardInstance.id !== B.cardInstance.id && A.cardInstance.frontFieldIndex < A.cardInstance.backFieldIndex && B.cardInstance.frontFieldIndex > B.cardInstance.backFieldIndex);
  const before = JSON.stringify([B.reps, B.due, B.stability, B.difficulty, B.lapses, B.state]);
  ctx.applyMemoryGrade(A, 3);
  check(lang + ' FSRS de A não altera B', JSON.stringify([B.reps, B.due, B.stability, B.difficulty, B.lapses, B.state]) === before);

  // dados históricos: save antigo com direção no card da trilha é ignorado (whitelist) e nada quebra
  const fresh = ctx.buildCardsFromUnits(ctx.UNITS);
  const old = fresh.map(c => Object.assign({}, c, { lastDirection: 'back-to-front', reviewDirection: 'back-to-front', reps: c.id === A.id ? 5 : 0 }));
  ctx.mergeSavedCards(fresh, old);
  const fA = fresh.find(c => c.id === A.id), fB = fresh.find(c => c.id === B.id);
  check(lang + ' save histórico com lastDirection: progresso restaurado, direção ignorada, view intacta', fA.reps === 5 && !('lastDirection' in fA) && !('reviewDirection' in fA) && view(fB) === b0);
  // teacher/self: dado histórico com lastDirection fica inerte (sem consumidor)
  const t = ctx.buildEngineCardsFromRow({ id: 1, language_app_key: ctx.APP_KEY, front: isZh ? '你好' : 'bonjour', back_trans: 'olá', front_is_target_language: true, status: 'active', revision: 0 }, { origin: 'teacher', appKey: ctx.APP_KEY, idPrefix: 't' })[0];
  const t0 = view(t); t.lastDirection = 'back-to-front'; t.reviewDirection = 'back-to-front';
  check(lang + ' teacher com lastDirection histórico: view inalterada (inerte)', view(t) === t0);
}
summary('K2-G unit');

// Testes puros do catálogo de trilhas (shared/badge-tracks.js). Uso: node tests/conquistas/test_badge_tracks.js
const BT = require('../../shared/badge-tracks.js');
let ok = 0, fail = 0;
const check = (name, cond) => { if (cond) ok++; else { fail++; console.log('FALHA:', name); } };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Métricas de um aluno do francês no meio do caminho.
const frBase = {
  studyDays: 8, reviews: 120, streak: 2, xp: 600, courseDone: 15, courseTotal: 30, courseAced: false, audioPlays: 40,
  modesUsed: 3, modesTotal: 6, weekends: 0, wordsLearned: 60, wordsTotal: 204, checkpointsAced: 0, checkpointsTotal: 26,
  dictationsAced: 2, challengesDone: 0, challengesTotal: 12, friends: 1, podiumWeeks: 2, duoMissions: 5, comeback: false, levelLabel: 'A1'
};
const zhBase = Object.assign({}, frBase, { modesTotal: 5, courseTotal: 18, wordsTotal: 166, checkpointsTotal: 18,
  dictationsAced: null, challengesDone: null, challengesTotal: 0, levelLabel: 'HSK 1' });
const by = (list, id) => list.find(s => s.id === id);

// 1. Metas aprovadas (seção 7 da proposta)
const fr = BT.evaluate(frBase, []);
check('days: 1·7·20·50·100·200', eq(by(fr, 'days').goals, [1, 7, 20, 50, 100, 200]));
check('review: 50·100·200·500', eq(by(fr, 'review').goals, [50, 100, 200, 500]));
check('streak: 3·7·15·30·75·150·365', eq(by(fr, 'streak').goals, [3, 7, 15, 30, 75, 150, 365]));
check('xp: 100·500·2000·5000·10000·25000', eq(by(fr, 'xp').goals, [100, 500, 2000, 5000, 10000, 25000]));
check('ear: 100·500·2000·5000', eq(by(fr, 'ear').goals, [100, 500, 2000, 5000]));
check('weekend: 1·4·12·26·52', eq(by(fr, 'weekend').goals, [1, 4, 12, 26, 52]));
check('vocab fr: 25·50·100·150', eq(by(fr, 'vocab').goals, [25, 50, 100, 150]));
check('aced fr: 1·5·10·todos (26)', eq(by(fr, 'aced').goals, [1, 5, 10, 26]));
check('dictation: 5·25·100', eq(by(fr, 'dictation').goals, [5, 25, 100]));
check('challenge com 12 desafios: 10·12 (critério 8)', eq(by(fr, 'challenge').goals, [10, 12]));
check('challenge com 231: 10·50·200', eq(by(BT.evaluate(Object.assign({}, frBase, { challengesTotal: 231 }), []), 'challenge').goals, [10, 50, 200]));
check('challenge sem a lista carregada: 10·50·200', eq(by(BT.evaluate(Object.assign({}, frBase, { challengesTotal: 0 }), []), 'challenge').goals, [10, 50, 200]));
check('friends: 1·3·10', eq(by(fr, 'friends').goals, [1, 3, 10]));
check('podium: 1·5·10', eq(by(fr, 'podium').goals, [1, 5, 10]));
check('podium 2 semanas -> nível 1', by(fr, 'podium').level === 1);
check('podium sem dado carregado não aparece', !by(BT.evaluate(Object.assign({}, frBase, { podiumWeeks: null }), []), 'podium'));
check('podium é da conta', BT.isAccountId('podium.1'));
check('podium máximo recebe parabéns, prata não', BT.allowsCongrats('podium', 'max') && !BT.allowsCongrats('podium', 'silver'));
check('duo: 1·5·15', eq(by(fr, 'duo').goals, [1, 5, 15]));
check('duo 5 missões -> nível 2', by(fr, 'duo').level === 2);
check('duo sem dado carregado não aparece', !by(BT.evaluate(Object.assign({}, frBase, { duoMissions: null }), []), 'duo'));
check('duo é da conta', BT.isAccountId('duo.1'));
check('duo máximo recebe parabéns', BT.allowsCongrats('duo', 'max'));
check('course1 fr: 1·metade·todas·gabaritado', eq(by(fr, 'course1').goals, [1, 15, 30, 31]));
check('explore fr (6 modos): 3·5·6', eq(by(fr, 'explore').goals, [3, 5, 6]));

// 2. Níveis a partir das métricas
check('days 8 -> nível 2', by(fr, 'days').level === 2 && by(fr, 'days').nextGoal === 20);
check('review 120 -> nível 2', by(fr, 'review').level === 2);
check('xp 600 -> nível 2', by(fr, 'xp').level === 2);
check('course1 15/30 -> nível 2', by(fr, 'course1').level === 2);
check('streak 2 -> nível 0 (bloqueada)', by(fr, 'streak').level === 0 && by(fr, 'streak').tier === null);
check('friends 1 -> nível 1', by(fr, 'friends').level === 1);
check('comeback falso -> 0', by(fr, 'comeback').level === 0);

// 3. Site sem Ditado/Desafios (zh): trilhas somem; modos 3·4·5; vocabulário cortado pelo curso só se faltar
const zh = BT.evaluate(zhBase, []);
check('zh sem dictation', !by(zh, 'dictation'));
check('zh sem challenge', !by(zh, 'challenge'));
check('explore zh (5 modos): 3·4·5', eq(by(zh, 'explore').goals, [3, 4, 5]));
check('aced zh: 1·5·10·18', eq(by(zh, 'aced').goals, [1, 5, 10, 18]));
check('vocab cortado: curso com 120 palavras -> 25·50·100·120',
  eq(by(BT.evaluate(Object.assign({}, zhBase, { wordsTotal: 120 }), []), 'vocab').goals, [25, 50, 100, 120]));
check('vocab cortado: curso com 40 palavras -> 25·40',
  eq(by(BT.evaluate(Object.assign({}, zhBase, { wordsTotal: 40 }), []), 'vocab').goals, [25, 40]));

// 4. Nível máximo do curso exige gabaritar
const allDone = Object.assign({}, frBase, { courseDone: 30 });
check('todas as unidades sem 100% -> nível 3', by(BT.evaluate(allDone, []), 'course1').level === 3);
check('todas + gabaritado -> máximo', by(BT.evaluate(Object.assign({}, allDone, { courseAced: true }), []), 'course1').maxed);
check('gabaritado sem todas as unidades não sobe', by(BT.evaluate(Object.assign({}, frBase, { courseAced: true }), []), 'course1').level === 2);

// 5. Conquistas antigas valem como o nível equivalente (ninguém perde nada)
const legacy = BT.evaluate(Object.assign({}, frBase, { streak: 0, reviews: 0, xp: 0, courseDone: 0, audioPlays: 0, modesUsed: 0, studyDays: 0 }),
  ['streak_7', 'reviews_100', 'xp_500', 'unit_all', 'trained_ear', 'explorer', 'first_step', 'weekend', 'comeback']);
check('streak_7 -> Sequência nível 2', by(legacy, 'streak').level === 2);
check('reviews_100 -> Revisão nível 2', by(legacy, 'review').level === 2);
check('xp_500 -> XP nível 2', by(legacy, 'xp').level === 2);
check('unit_all -> Nível A1 nível 3', by(legacy, 'course1').level === 3);
check('unit_14 (zh) -> nível 3', by(BT.evaluate(zhBase, ['unit_14']), 'course1').level === 3);
check('unit_7 (zh) -> nível 2', by(BT.evaluate(Object.assign({}, zhBase, { courseDone: 0 }), ['unit_7']), 'course1').level === 2);
check('trained_ear -> Ouvido 1', by(legacy, 'ear').level === 1);
check('explorer -> Explorar 1', by(legacy, 'explore').level === 1);
check('first_step -> Primeiro Passo 1', by(legacy, 'days').level === 1);
check('weekend -> Fim de Semana 1', by(legacy, 'weekend').level === 1);
check('comeback -> De Volta ao Jogo (máximo)', by(legacy, 'comeback').maxed && by(legacy, 'comeback').tier === 'max');
check('id novo gravado vale mesmo se a métrica cair', by(BT.evaluate(Object.assign({}, frBase, { streak: 0 }), ['streak.4']), 'streak').level === 4);
check('nível gravado acima do total é cortado', by(BT.evaluate(frBase, ['friends.9']), 'friends').level === 3);

// 6. Molduras
check('4 níveis: bronze, prata, ouro, máximo', eq([1, 2, 3, 4].map(n => BT.tierFor(n, 4)), ['bronze', 'silver', 'gold', 'max']));
check('6 níveis: b b p p o máx', eq([1, 2, 3, 4, 5, 6].map(n => BT.tierFor(n, 6)), ['bronze', 'bronze', 'silver', 'silver', 'gold', 'max']));
check('7 níveis: b b p p o o máx', eq([1, 2, 3, 4, 5, 6, 7].map(n => BT.tierFor(n, 7)), ['bronze', 'bronze', 'silver', 'silver', 'gold', 'gold', 'max']));
check('3 níveis: b p máx', eq([1, 2, 3].map(n => BT.tierFor(n, 3)), ['bronze', 'silver', 'max']));
check('1 nível: máximo', BT.tierFor(1, 1) === 'max');

// 7. Parabéns: ouro e máximo; Amigos nunca
check('parabéns no ouro', BT.allowsCongrats('review', 'gold'));
check('parabéns no máximo', BT.allowsCongrats('streak', 'max'));
check('sem parabéns no bronze/prata', !BT.allowsCongrats('review', 'bronze') && !BT.allowsCongrats('review', 'silver'));
check('Amigos sem parabéns', !BT.allowsCongrats('friends', 'max'));

// 8. Ids e escopo
check('parseId novo', eq(BT.parseId('review.3'), { track: 'review', level: 3 }));
check('parseId course1.2', eq(BT.parseId('course1.2'), { track: 'course1', level: 2 }));
check('parseId antigo', BT.parseId('xp_100').legacy === true && BT.parseId('xp_100').track === 'xp');
check('parseId clássica', BT.parseId('multitasker').classic === 'multitasker');
check('parseId desconhecido', BT.parseId('qualquer.1') === null && BT.parseId('founder') === null);
check('conta: review.1, streak_3', BT.isAccountId('review.1') && BT.isAccountId('streak_3'));
check('curso: ear.1, course1.1, unit_1', !BT.isAccountId('ear.1') && !BT.isAccountId('course1.1') && !BT.isAccountId('unit_1'));

// 9. Nome com gênero e meta
const cat = { 'badge.track.review.1': 'Revisor(a) Aprendiz', 'badge.track.review.1.f': 'Revisora Aprendiz', 'badge.track.review.1.m': 'Revisor Aprendiz',
  'badge.track.xp.1': 'Primeiros Pontos', 'badge.track.review.goal': 'Faça {n} revisões', 'badge.track.course1.goal.3': 'Conclua todas as unidades do {level}' };
const t = (k, v) => { let s = cat[k]; if (s === undefined) return k; Object.keys(v || {}).forEach(x => { s = s.replace('{' + x + '}', v[x]); }); return s; };
check('feminino', BT.levelName(t, 'review', 1, 'feminine') === 'Revisora Aprendiz');
check('masculino', BT.levelName(t, 'review', 1, 'masculine') === 'Revisor Aprendiz');
check('outro/vazio -> (a)', BT.levelName(t, 'review', 1, 'other') === 'Revisor(a) Aprendiz' && BT.levelName(t, 'review', 1, null) === 'Revisor(a) Aprendiz');
check('nome sem gênero ignora o gênero', BT.levelName(t, 'xp', 1, 'feminine') === 'Primeiros Pontos');
check('meta geral com {n}', BT.goalText(t, 'review', 3, 200) === 'Faça 200 revisões');
check('meta própria do nível', BT.goalText(t, 'course1', 3, 30, { level: 'A1' }) === 'Conclua todas as unidades do A1');

console.log(`Conquistas (catálogo): ${ok} ok, ${fail} falhas`);
process.exit(fail ? 1 : 0);

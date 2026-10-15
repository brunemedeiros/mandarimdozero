// E4 lote 5e: assignTodaysMissions e freshDailyBucket (core + ganchos) dão o que cada idioma dava antes.
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.resolve(__dirname, '../..');
let ok = 0, bad = 0; const check = (c, m) => { if (c) ok++; else { bad++; console.log('FALHOU:', m); } };
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const core = read('shared/core/quase-iguais-dados.js');
for (const l of ['fr', 'zh']) {
  const calls = [];
  const ctx = { console, calls, EASY_CHALLENGES: ['E'], GENERAL_CHALLENGES: ['G'], REVISAO_CONJ_CHALLENGES: ['CONJ'], REVISAO_HANZI_CHALLENGES: ['HANZI'],
    pickDailyFromPool: (pool, k) => { calls.push(pool[0] + ':' + k); return { id: pool[0], target: 1 }; }, resolveRevisaoMission: (picked, pool, fb) => { calls.push('res:' + pool[0] + ':' + fb); return { id: picked.id, target: 2 }; } };
  vm.createContext(ctx);
  vm.runInContext(read(l + '/lang-hooks.js').replace('const LANG_HOOKS', 'var LANG_HOOKS') + '\n' + core.replace(/\bfunction (\w+)/g, 'var $1 = function $1'), ctx);
  const m = vm.runInContext('assignTodaysMissions()', ctx), pool = l === 'fr' ? 'CONJ' : 'HANZI', fb = l === 'fr' ? 'conj1' : 'hanzi1';
  check(calls.join('|') === `E:easy|${pool}:revcon|res:${pool}:${fb}|G:general`, l + ' missões sorteiam a lista de revisão do idioma: ' + calls.join('|'));
  check(m.length === 3 && m[1].id === pool, l + ' três missões');
  const b = vm.runInContext('freshDailyBucket("2026-10-15")', ctx), keys = Object.keys(b).sort();
  const expect = l === 'fr'
    ? ['audioPlaysToday', 'conjugationCorrect', 'conjugationSessions', 'conjugationTenses', 'date', 'exerciseFormatCounts', 'exerciseFormatsSeen', 'goalCountedLessonKeys', 'grammarLessons', 'highScoreLessons', 'lessons', 'lessonsForGoal', 'matchGamesPlayed', 'missions', 'missionsBonusAwarded', 'missionsNotified', 'overdueReviewsDone', 'perfectLessons', 'reviewsDone', 'speedReviewSessions', 'stars', 'xp']
    : ['audioPlaysToday', 'date', 'exerciseFormatCounts', 'exerciseFormatsSeen', 'goalCountedLessonKeys', 'hanziLessons', 'highScoreLessons', 'lessons', 'lessonsForGoal', 'matchGamesPlayed', 'missions', 'missionsBonusAwarded', 'missionsNotified', 'overdueReviewsDone', 'perfectLessons', 'reviewsDone', 'speedReviewSessions', 'xp'];
  check(JSON.stringify(keys) === JSON.stringify(expect), l + ' campos do dia: ' + keys.join(','));
  const b2 = vm.runInContext('freshDailyBucket("2026-10-16")', ctx);
  check(b.date === '2026-10-15' && b2.exerciseFormatsSeen !== b.exerciseFormatsSeen && (l === 'zh' || b2.conjugationTenses !== b.conjugationTenses), l + ' arrays novos a cada chamada');
}
for (const f of ['fr/app.js', 'zh/app.js']) check(!/function (assignTodaysMissions|freshDailyBucket)\(/.test(read(f)), f + ' não declara mais');
console.log(`lote 5e dados: ${ok} passaram, ${bad} falharam`); process.exit(bad ? 1 : 0);

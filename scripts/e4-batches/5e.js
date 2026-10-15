// Lote 5e: o que muda é só o DADO do idioma (qual lista de missões de revisão, quais contadores do dia).
const R = (pairs) => (s) => pairs.reduce((a, [x, y]) => a.split(x).join(y), s);
module.exports = {
  batch: '5e', file: 'quase-iguais-dados',
  desc: 'quase iguais em que só muda o dado do idioma (missões de revisão e contadores do dia)',
  functions: {
    assignTodaysMissions: { unify: R([["pickDailyFromPool(REVISAO_CONJ_CHALLENGES, 'revcon')", "pickDailyFromPool(LANG_HOOKS.revisaoPool(), 'revcon')"], ["resolveRevisaoMission(pickedRevisao, REVISAO_CONJ_CHALLENGES, 'conj1')", 'resolveRevisaoMission(pickedRevisao, LANG_HOOKS.revisaoPool(), LANG_HOOKS.revisaoFallbackId)']]),
      reverse: {
        fr: R([['LANG_HOOKS.revisaoPool()', 'REVISAO_CONJ_CHALLENGES'], ['LANG_HOOKS.revisaoFallbackId', "'conj1'"]]),
        zh: R([['LANG_HOOKS.revisaoPool()', 'REVISAO_HANZI_CHALLENGES'], ['LANG_HOOKS.revisaoFallbackId', "'hanzi1'"]]) } },
    // os contadores específicos do idioma (fr: stars, gramática, conjugação; zh: hanzi) vêm do gancho; a ordem das chaves do objeto não importa.
    freshDailyBucket: { semantic: true, unify: R([['date: today, xp: 0, stars: 0, lessons: 0,', 'date: today, xp: 0, ...LANG_HOOKS.dailyExtra(), lessons: 0,'],
      ['grammarLessons: 0, conjugationSessions: 0, conjugationCorrect: 0,\n    conjugationTenses: [], reviewsDone: 0,', 'reviewsDone: 0,']]) },
  },
  hooks: {
    fr: { revisaoPool: '() => REVISAO_CONJ_CHALLENGES', revisaoFallbackId: "'conj1'",
      dailyExtra: '() => ({ stars: 0, grammarLessons: 0, conjugationSessions: 0, conjugationCorrect: 0, conjugationTenses: [] })' },
    zh: { revisaoPool: '() => REVISAO_HANZI_CHALLENGES', revisaoFallbackId: "'hanzi1'",
      dailyExtra: '() => ({ hanziLessons: 0 })' },
  },
};

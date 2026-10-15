// E4 lote 5e: quase iguais em que só muda o dado do idioma (missões de revisão e contadores do dia).
// Unifica funções que eram QUASE iguais em fr/app.js e zh/app.js. O que mudava por idioma passou para os ganchos LANG_HOOKS
// (fr/lang-hooks.js e zh/lang-hooks.js, carregados antes do app.js) ou para uma verificação explícita (typeof/in) no próprio código.
// Mesmos nomes globais; nenhuma chamada muda. Carregado antes do app.js.

function assignTodaysMissions(){
  const easy = pickDailyFromPool(EASY_CHALLENGES, 'easy');
  const pickedRevisao = pickDailyFromPool(LANG_HOOKS.revisaoPool(), 'revcon');
  const revisao = resolveRevisaoMission(pickedRevisao, LANG_HOOKS.revisaoPool(), LANG_HOOKS.revisaoFallbackId);
  const general = pickDailyFromPool(GENERAL_CHALLENGES, 'general');
  return [easy, revisao, general].map(c => ({ id: c.id, target: c.target }));
}

// ---------- Desafios de hoje (estilo Busuu) ----------
// Contadores do dia (zeram sozinhos quando a data muda). Todo dia mostra
// exatamente 3 desafios, um de cada categoria — sorteados de forma
// determinística a partir da data (mudam de dia pra dia, mas são sempre os
// mesmos dentro do mesmo dia):
//   1. Fácil (EASY_CHALLENGES) — uma vitória rápida, garantida todo dia.
//   2. Revisão OU Conjugação (REVISAO_CONJ_CHALLENGES) — sempre puxa o aluno
//      pra uma dessas duas abas, que ele não necessariamente abriria sozinho.
//   3. Geral (GENERAL_CHALLENGES) — mais variado, ligado à Trilha em geral.
// Balde-padrão construído do zero a cada chamada -- nunca reaproveita
// arrays/objetos entre chamadas (um array compartilhado entre dois "dias"
// diferentes viraria um vazamento de estado sutil).
function freshDailyBucket(today){
  return {
    date: today, xp: 0, ...LANG_HOOKS.dailyExtra(), lessons: 0, highScoreLessons: 0, perfectLessons: 0,
    reviewsDone: 0, speedReviewSessions: 0, matchGamesPlayed: 0,
    lessonsForGoal: 0, goalCountedLessonKeys: [], exerciseFormatsSeen: [],
    exerciseFormatCounts: {}, audioPlaysToday: 0, overdueReviewsDone: 0,
    missionsBonusAwarded: false, missionsNotified: {}, missions: null
  };
}

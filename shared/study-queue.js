// ---------- Fila central de estudo (Fase 4) ----------
// Fase 4 do projeto de reestruturação do motor de memória: um único lugar
// decide QUAIS cartões cada modo de estudo recebe. Antes desta fase,
// Flashcard/Palavras Difíceis/Speed Review/Combinar tinham cada um sua
// própria lógica de seleção inline, repetida em fr/app.js e zh/app.js.
//
// getStudyQueue() só SELECIONA -- não embaralha, não decide direção de
// carta (front/back), não corta em pares pro Combinar. Isso é
// responsabilidade de cada atividade, conforme o fluxo do projeto:
//   getStudyQueue() -> atividade escolhe como apresentar -> resultado ->
//   registra evidência -> atualiza memória -> recalcula due.
//
// IMPORTANTE: esta fase mantém exatamente o mesmo critério de seleção que
// cada modo já usava antes -- o objetivo é só consolidar a lógica num
// único lugar, não mudar o que cada modo seleciona. Redefinir os critérios
// (ex: o que conta como "difícil" -- Fase 7, ou o que o Speed Review deve
// considerar -- Fase 6) é escopo das fases seguintes, não desta.
//
// scope:
//   'due'  (padrão) -- vencidos + um lote limitado de cartões novos
//                       (Flashcard, revisão geral da unidade toda)
//   'unit' -- vencidos primeiro, depois o resto do pool
//             (Flashcard, estudando uma unidade específica)
//   'hard' -- só os vencidos dentre os que hoje contam como "difícil"
//             (reps>0 && lapses>=2 -- mesmo critério de hardWordsPool())
//   'all'  -- o pool inteiro, sem filtro de due (Speed Review, Combinar --
//             não são revisão SRS, são prática de reconhecimento; due só
//             importa pras duas primeiras)
function getStudyQueue(pool, options){
  options = options || {};
  const scope = options.scope || 'due';

  if (scope === 'hard'){
    return cardsDueNow(pool.filter(c => c.reps > 0 && c.lapses >= 2));
  }

  if (scope === 'all'){
    return pool.slice();
  }

  const due = cardsDueNow(pool);
  const queue = due.slice();

  if (scope === 'unit'){
    const rest = pool.filter(c => !queue.includes(c));
    return queue.concat(rest);
  }

  // scope === 'due'
  const newLimit = options.newCardsLimit != null ? options.newCardsLimit : 10;
  const fresh = newCards(pool).slice(0, newLimit);
  fresh.forEach(c => { if (!queue.includes(c)) queue.push(c); });
  return queue;
}

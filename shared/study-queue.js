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
//
// options.newCardsLimit -- teto de cartões novos (scope 'due'). Fase 10:
// "novas palavras por dia", controlável pelo aluno.
// options.limit -- teto do TAMANHO TOTAL da fila (todos os scopes, opt-in).
// Fase 10: "intensidade da sessão".
function getStudyQueue(pool, options){
  options = options || {};
  const scope = options.scope || 'due';

  if (scope === 'hard'){
    // Fase 7: "precisa revisar agora" (due) e "é difícil" (desempenho/
    // histórico) são dimensões INDEPENDENTES -- uma palavra pode ser
    // difícil sem estar vencida. Por isso NÃO filtra por due aqui
    // (diferente de como este scope funcionava nas Fases 3-6).
    // Critério: usa `difficulty` do motor FSRS (Fase 2/3) em vez da regra
    // arbitrária antiga (lapses>=2 sozinho) -- reps>0 garante que o
    // cartão já foi estudado (senão difficulty ainda é 0, sem significado
    // real). "Difícil" = o motor considera acima da média (difficulty>=6
    // na escala 1-10) OU já foi esquecido ao menos uma vez (lapses>0) --
    // dois sinais reais e independentes do desempenho, não um número
    // mágico isolado. Ordenado por quem merece mais atenção primeiro.
    return pool.filter(c => c.reps > 0 && (c.lapses > 0 || c.difficulty >= 6))
      .sort((a, b) => (b.difficulty - a.difficulty) || (b.lapses - a.lapses));
  }

  let selected;

  if (scope === 'all'){
    selected = pool.slice();
  } else if (scope === 'unit'){
    const due = cardsDueNow(pool);
    const rest = pool.filter(c => !due.includes(c));
    selected = due.concat(rest);
  } else {
    // scope === 'due'. Fase 10: "novas palavras por dia" só é um controle
    // de verdade se cartões novos (reps===0, due:0) não entrarem já pelo
    // filtro de due<=now -- due=0 SEMPRE satisfaz due<=now, então
    // cardsDueNow(pool) sozinho já continha 100% dos cartões novos antes
    // de qualquer corte (achado documentado desde a Fase 4, nunca
    // corrigido até agora porque nada dependia disso de verdade). Corrigido
    // aqui: "devido" passa a significar só cartões JÁ estudados que
    // venceram (reps>0); cartões novos entram exclusivamente pela via
    // limitada por newCardsLimit.
    const dueReviewed = pool.filter(c => c.reps > 0 && c.due <= Date.now());
    const newLimit = options.newCardsLimit != null ? options.newCardsLimit : 10;
    const fresh = newCards(pool).slice(0, newLimit);
    selected = dueReviewed.concat(fresh);
  }

  // Fase 10: "intensidade da sessão" -- teto opcional do tamanho total da
  // fila, independente de quantos devidos/novos existirem.
  if (options.limit) selected = selected.slice(0, options.limit);
  return selected;
}

// ---------- Motor de repetição espaçada: FSRS (mesmo algoritmo usado pelo
// Anki atualmente, FSRS-6, 21 parâmetros -- NÃO a interface do Anki) ----------
// Puro algoritmo + migração -- não depende de nenhum conteúdo pedagógico
// específico de idioma, só do formato genérico de STATE.cards/hanziCards.
//
// Fase 3 do projeto de reestruturação do motor de memória: este arquivo
// coexiste com shared/srs.js (SM-2) sem apagar nenhum dado existente.
// Os campos SM-2 (reps/interval/ef/lapses/due) continuam sendo os únicos
// que de fato controlam Flashcard/Palavras Difíceis/Speed Review/Combinar
// nesta fase -- isso só muda na Fase 4 (fila única) e Fase 5 (Flashcard).
// Os campos FSRS abaixo (stability/difficulty/state/lastReview) são escritos
// UMA VEZ por cartão (migração idempotente, guardada por `stability ===
// undefined`) e ficam prontos, validados, esperando a fila/Flashcard passar
// a escrevê-los de verdade via scheduleReview(). Essa coexistência
// temporária e documentada é a exceção prevista pela Regra 8 do projeto.
//
// grade: 1=Errei(Again) 2=Difícil(Hard) 3=Bom(Good) 4=Fácil(Easy)
// (note que isso é 1 unidade a mais que o grade 0-3 do SM-2 em shared/srs.js
// -- convertido em gradeToFSRS() para os poucos pontos que precisam dos dois)

// Pesos padrão do FSRS-6 (Anki), otimizados pela equipe open-spaced-repetition
// sobre ~700M revisões reais. Fonte: wiki oficial do algoritmo
// (github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm, seção
// FSRS-6) e documentação do ts-fsrs (open-spaced-repetition/ts-fsrs). Não
// expostos na interface do aluno (Regra 9) -- só usados internamente aqui.
const FSRS_W = [
  0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722,
  0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425,
  0.0912, 0.0658, 0.1542
];

// Retenção desejada: probabilidade-alvo de lembrar no dia do vencimento.
// Fase 10: configurável via setDesiredRetention() -- a tela de
// Configurações > Revisões traduz "Mais frequente/Equilibrada/Mais
// espaçada" pra este número (ver reviewFrequencyToRetention() em app.js).
// shared/fsrs.js continua sem saber de STATE/UI -- só recebe o valor já
// traduzido, mantendo o motor puro/parametrizado.
let FSRS_DESIRED_RETENTION = 0.9;
function setDesiredRetention(value){
  if (typeof value === 'number' && value > 0 && value < 1) FSRS_DESIRED_RETENTION = value;
}

// Fase 10: traduz as 3 opções simples de "Frequência de revisão" (tela de
// Configurações) pra um valor real de retenção desejada -- nenhuma tela do
// app expõe esse número.
function reviewFrequencyToRetention(freq){
  if (freq === 'frequent') return 0.95;
  if (freq === 'spaced') return 0.85;
  return 0.9; // 'balanced' (padrão)
}

// Fase 10: traduz "Intensidade da sessão" pro teto de cartões numa sessão
// de Flashcard (getStudyQueue options.limit, shared/study-queue.js).
function sessionIntensityToLimit(intensity){
  if (intensity === 'light') return 15;
  if (intensity === 'intense') return 60;
  return 30; // 'normal' (padrão)
}

function fsrsClampDifficulty(d){
  return Math.min(10, Math.max(1, d));
}

// Retenção de REFERÊNCIA, fixa em 0.9 -- é a própria definição de
// "stability" no FSRS ("dias até a retenção cair a 90%"), não a preferência
// do usuário. Usada só dentro do `factor` de fsrsRetrievability/
// fsrsIntervalFromStability -- NUNCA trocar por FSRS_DESIRED_RETENTION aqui
// (bug já cometido uma vez: se as duas usarem o mesmo valor, o termo se
// cancela algebricamente e a fila do intervalo vira sempre === stability,
// tornando "Frequência de revisão" um no-op silencioso).
const FSRS_REFERENCE_RETENTION = 0.9;

// R(t,S) = (1 + factor * t/S) ^ (-w20), factor = 0.9^(-1/w20) - 1
// (garante R(S,S) = 0.9, i.e. estabilidade = dias até a retenção cair a 90%
// -- sempre relativo à retenção de REFERÊNCIA, não à preferência do usuário)
function fsrsRetrievability(elapsedDays, stability){
  if (stability <= 0) return 0;
  const w20 = FSRS_W[20];
  const factor = Math.pow(FSRS_REFERENCE_RETENTION, -1/w20) - 1;
  return Math.pow(1 + factor * elapsedDays / stability, -w20);
}

// Intervalo (em dias) tal que R(intervalo, stability) = FSRS_DESIRED_RETENTION
// (a preferência do usuário) -- inverso de fsrsRetrievability, usado pra
// decidir o próximo `due`. O `factor` no denominador fica fixo na retenção
// de REFERÊNCIA (0.9); só o numerador varia com a preferência do usuário.
function fsrsIntervalFromStability(stability){
  const w20 = FSRS_W[20];
  const factor = Math.pow(FSRS_REFERENCE_RETENTION, -1/w20) - 1;
  const interval = (stability / factor) * (Math.pow(FSRS_DESIRED_RETENTION, -1/w20) - 1);
  return Math.max(1, Math.round(interval));
}

// S0(G) = w[G-1] -- estabilidade inicial de uma palavra nova, por nota dada
// na primeira revisão (introduzido no FSRS-5, mantido no FSRS-6).
function fsrsInitialStability(grade){
  return FSRS_W[grade - 1];
}

// D0(G) = w4 - e^(w5*(G-1)) + 1, faixa 1-10
function fsrsInitialDifficulty(grade){
  return fsrsClampDifficulty(FSRS_W[4] - Math.exp(FSRS_W[5] * (grade - 1)) + 1);
}

// Atualiza a dificuldade após uma revisão: desloca proporcionalmente à nota
// (w6) e depois aplica reversão à média (w7) em direção à dificuldade inicial
// de uma resposta "Fácil" -- evita que uma palavra fique "presa" numa
// dificuldade extrema por causa de uma sequência de sorte/azar.
function fsrsNextDifficulty(difficulty, grade){
  const deltaD = -FSRS_W[6] * (grade - 3);
  const dPrime = difficulty + deltaD * (10 - difficulty) / 9;
  const meanReversionTarget = fsrsInitialDifficulty(4);
  const reverted = FSRS_W[7] * meanReversionTarget + (1 - FSRS_W[7]) * dPrime;
  return fsrsClampDifficulty(reverted);
}

// Estabilidade após um acerto (grade 2/3/4) -- cresce mais quando a
// recuperação foi "surpreendente" (R baixo = quase esquecendo) e menos
// quando já estava fácil de lembrar (R alto). w15 penaliza "Difícil", w16
// bonifica "Fácil".
function fsrsNextStabilityAfterRecall(difficulty, stability, retrievability, grade){
  const hardPenalty = grade === 2 ? FSRS_W[15] : 1;
  const easyBonus = grade === 4 ? FSRS_W[16] : 1;
  const growth = Math.exp(FSRS_W[8]) * (11 - difficulty) * Math.pow(stability, -FSRS_W[9])
    * (Math.exp(FSRS_W[10] * (1 - retrievability)) - 1) * hardPenalty * easyBonus;
  return stability * (growth + 1);
}

// Estabilidade após esquecer (grade 1/Errei) -- não zera: parte da
// estabilidade anterior (penalizada), preservando o Princípio 7 do projeto
// ("um erro não volta a palavra pro estado de nunca aprendida").
function fsrsNextStabilityAfterLapse(difficulty, stability, retrievability){
  return FSRS_W[11] * Math.pow(difficulty, -FSRS_W[12])
    * (Math.pow(stability + 1, FSRS_W[13]) - 1)
    * Math.exp(FSRS_W[14] * (1 - retrievability));
}

// ---------- Funil único de mutação de memória (equivalente a applySM2) ----------
// Função pura: não lê/escreve Supabase, não sabe de XP, não sabe de UI.
// grade: 1=Errei 2=Difícil 3=Bom 4=Fácil.
function scheduleReview(card, grade, now){
  now = now || Date.now();
  const DAY = 24*60*60*1000;
  const elapsedDays = card.lastReview ? Math.max(0, (now - card.lastReview) / DAY) : 0;
  const isNew = !card.state || card.state === 'new';
  const R = isNew ? 1 : fsrsRetrievability(elapsedDays, card.stability);

  if (isNew){
    card.stability = fsrsInitialStability(grade);
    card.difficulty = fsrsInitialDifficulty(grade);
    card.state = grade === 1 ? 'learning' : 'review';
    if (grade === 1) card.fsrsLapses = (card.fsrsLapses || 0) + 1;
  } else if (grade === 1){
    card.stability = fsrsNextStabilityAfterLapse(card.difficulty, card.stability, R);
    card.difficulty = fsrsNextDifficulty(card.difficulty, grade);
    card.state = 'relearning';
    card.fsrsLapses = (card.fsrsLapses || 0) + 1;
  } else {
    card.stability = fsrsNextStabilityAfterRecall(card.difficulty, card.stability, R, grade);
    card.difficulty = fsrsNextDifficulty(card.difficulty, grade);
    card.state = 'review';
  }

  card.lastReview = now;
  card.due = now + fsrsIntervalFromStability(card.stability) * DAY;
  card.fsrsReps = (card.fsrsReps || 0) + 1;
  // Um cartão avaliado de verdade pelo motor novo já é, por definição,
  // FSRS-nativo -- marca aqui também (não só em migrateCardToFSRS) pra que
  // um load futuro nunca tente rederivar/sobrescrever esse progresso real
  // a partir dos campos SM-2 legados (que podem nem estar mais sendo
  // atualizados, dependendo de quando a Fase 4/5 mudar quem grava devido).
  card.fsrsMigrated = true;
  return card;
}

// ---------- Funil único de mutação de memória, escala SM-2 (Fase 5) ----------
// Ponto de entrada real usado por Flashcard, revisão de hanzi, "Já sei?" e
// exercícios de lição a partir da Fase 5 -- recebe a nota na escala antiga
// (0=Errei, 1=Difícil, 2=Bom, 3=Fácil, a mesma que os botões da UI sempre
// usaram) e traduz internamente pra escala do FSRS (1=Again..4=Easy) antes
// de chamar scheduleReview(). Nenhuma tela precisa saber que a escala
// mudou por baixo -- Regra 9 (não expor parâmetros do FSRS na interface).
//
// due/stability/difficulty/state passam a ser escritos SÓ pelo motor novo
// a partir daqui (applySM2 nunca mais roda nestes 4 pontos de entrada) --
// um único "due" de verdade, como a Regra 6 do projeto exige.
//
// reps/lapses/interval continuam sendo atualizados aqui como uma PONTE DE
// COMPATIBILIDADE explícita (Regra 8) -- ainda são lidos por
// hardWordsPool()/vocabStrengthBuckets()/reviewXP() (Palavras Difíceis,
// "Suas palavras", XP decrescente por maturidade), que só serão
// redesenhados pra ler o modelo FSRS nativo nas Fases 7 e 9. `interval` é
// espelhado a partir de `stability` (mesmo papel conceitual: "força"/dias
// até a próxima revisão prevista). `ef` deixa de ser atualizado -- nada
// além do próprio applySM2 (retirado deste caminho) o lia.
//
// Diferença deliberada em relação ao applySM2 antigo: um erro (grade 0)
// NÃO zera mais `reps` -- SM-2 fazia isso, e é exatamente o comportamento
// que o Princípio 7 do projeto pede pra corrigir ("um erro não volta a
// palavra pro estado de nunca aprendida"). `lapses` continua incrementando
// normalmente em qualquer erro.
function applyMemoryGrade(card, sm2Grade, now){
  now = now || Date.now();
  const fsrsGrade = sm2Grade + 1; // 0..3 (Errei..Fácil) -> 1..4 (Again..Easy)
  scheduleReview(card, fsrsGrade, now);

  card.reps = (card.reps || 0) + 1;
  if (sm2Grade === 0) card.lapses = (card.lapses || 0) + 1;
  card.interval = Math.max(0, Math.round(card.stability));
  if (card.reps === 1 && !card.firstLearnedDate){
    card.firstLearnedDate = todayStr();
  }
  return card;
}

// ---------- Migração SM2 -> FSRS (Fase 3) ----------
// SM2 CARD -> migrateCardToFSRS() -> MEMORY CARD (campos FSRS adicionados,
// campos SM-2 preservados intactos). Idempotente por construção: só roda se
// o cartão ainda não tem `stability` -- rodar de novo é inofensivo (guard no
// call site). Não deriva de novo a cada load (evitaria que Fase 4/5
// escrevam evidência real via scheduleReview() sem ser sobrescritas).
function migrateCardToFSRS(card){
  // Guard explícito, não inferido de `stability` -- um cartão novo de
  // verdade também nasce com stability:0 (ver buildCardsFromUnits), então
  // checar "stability !== undefined" daria falso positivo e faria a
  // migração pular save antigo nenhum cartão que já tenha sido criado
  // nesta sessão antes de aplicar os dados salvos.
  if (card.fsrsMigrated) return card;

  if (!card.reps || card.reps === 0){
    // Nunca estudada no SM-2 -- nasce igual a um cartão novo de verdade,
    // sem inventar histórico que não existe.
    card.stability = 0;
    card.difficulty = 0;
    card.state = 'new';
    card.lastReview = null;
    card.fsrsReps = 0;
    card.fsrsLapses = 0;
    card.fsrsMigrated = true;
    return card;
  }

  // Já tinha histórico real no SM-2: aproxima a força pelo `interval` (dias
  // até vencer) -- preserva ranking relativo (carta com interval alto vira
  // stability alta), sem recalcular do zero e sem contradizer a regra
  // "não transforme palavras fortes em fracas".
  card.stability = Math.max(1, card.interval || 1);

  // Dificuldade aproximada a partir do ease factor do SM-2 (1.3-2.5, maior é
  // mais fácil) invertido pra escala FSRS (1-10, maior é mais difícil).
  const ef = card.ef || 2.5;
  card.difficulty = fsrsClampDifficulty(10 - ((ef - 1.3) / 1.2) * 9);

  card.state = (card.lapses || 0) > 0 && card.interval < 3 ? 'relearning' : 'review';

  // Sem timestamp real da última revisão salvo no SM-2 -- reconstrói a
  // partir de due-interval (aproximação razoável, nunca no futuro).
  card.lastReview = Math.min(Date.now(), (card.due || Date.now()) - (card.interval || 0) * 24*60*60*1000);

  // NÃO copia `due` de novo -- mantém o due do SM-2 como está, exatamente
  // pra evitar avalanche de cartões vencidos no dia da migração.
  card.fsrsReps = card.reps;
  card.fsrsLapses = card.lapses || 0;
  card.fsrsMigrated = true;
  return card;
}

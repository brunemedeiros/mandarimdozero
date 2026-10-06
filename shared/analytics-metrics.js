// K.2 -- CONTRATO DE MÉTRICAS DE ANALYTICS (camada PURA, sem UI/rede/estado).
//
// Duas famílias de métrica, nunca misturadas:
//
//   ESTRUTURAL  (unidade = CardInstance)  -- contagens de estudo/revisão:
//     total, New, Learning, Review, Para revisar, Devidos.
//     Reverso = 2 cartões; Cloze com N marcas = N cartões.
//
//   PEDAGÓGICA  (unidade = Note)          -- conteúdo/conhecimento:
//     conteúdos, estudados, não iniciados, força.
//     As CardInstances irmãs de uma Note pertencem ao MESMO conteúdo.
//
// Esta camada NÃO cria entidade nem tabela de métricas, NÃO duplica estado
// (tudo é derivado de STATE.cards já existente), NÃO altera FSRS/Review/Deck.
// Consome só o que já existe:
//   cardStudyBucket()   (shared/srs.js, K1) -- New/Learning/Review, fonte única
//   cardStrengthBucket()(shared/study-trail-model.js, K2-E) -- fraca/mediana/
//                        forte de UMA CardInstance (regra existente, intocada)
// Resolvidos em tempo de chamada (script global), como o resto de shared/.
//
// Identidade da Note (NUNCA inferida por sufixo de id -- `-b`, `-cN`, `-rN` --
// nem por direção/lastDirection/reviewDirection):
//   study   -> unitId + vocabIdx   (a mesma identidade de K2-E)
//   teacher -> rowId (linha de teacher_flashcards)
//   self    -> rowId (linha de own_flashcards)
// `rowId` é gravado pelo motor Note (buildEngineCardsFromRow) em TODA
// CardInstance da linha, inclusive reverso/Cloze/gerações -rN.
//
// Vocabulário (decisão K.1): "cartão" = CardInstance; "conteúdo" = Note;
// "palavra" = Note da Study Trail. "Devido" (due<=agora, não-New) é distinto
// de "Review" (estado FSRS). O limiar de 48h é regra de NOTIFICAÇÃO do cron,
// não definição de Devido -- não existe aqui.
//
// ELEGIBILIDADE: quem chama passa o universo já elegível (ex.:
// eligibleReviewPool/eligibleDeckReviewPool). Esta camada só exclui o que é
// inequivocamente inativo no próprio dado (Teacher/Self arquivados) e escopa
// por origem -- nunca reimplementa o gate de lição da Review.
//
// FORA desta fase (decisão K.1): histórico por Note. firstLearnedDate/
// lastReview são por CardInstance e NÃO são promovidos a "primeira vez da
// Note"; lastReview de cartões migrados é aproximado, então "última
// atividade" também não é calculada aqui.

const ANALYTICS_ORIGINS = ['study', 'teacher', 'self'];

// Força de CONTEÚDO (Note). 'not_started' é categoria própria -- nunca "fraca".
const NOTE_STRENGTH_KEYS = ['not_started', 'weak', 'medium', 'strong'];

function analyticsCardOrigin(card){
  return card && ANALYTICS_ORIGINS.indexOf(card.origin) !== -1 ? card.origin : null;
}

// Ativa para métricas ativas. Teacher/Self: só flashcardStatus==='active'
// (mesmo critério de isCardLessonCompleted e do cron K.0-C). Study não tem
// "arquivado": a elegibilidade dela é do pool passado pelo chamador.
function isAnalyticsActiveCard(card){
  const o = analyticsCardOrigin(card);
  if (!o) return false;
  if (o === 'teacher' || o === 'self') return card.flashcardStatus === 'active';
  return true;
}

// Chave da Note de uma CardInstance, ou null se não for possível agrupar.
// Sem rowId/unitId+vocabIdx NÃO se adivinha por id: o card vira Note própria
// (chave por card.id) -- conservador, nunca funde conteúdos distintos.
function analyticsNoteKey(card){
  const o = analyticsCardOrigin(card);
  if (!o) return null;
  if (o === 'study'){
    if (card.unitId != null && card.vocabIdx != null) return 'study:' + String(card.unitId) + ':' + String(card.vocabIdx);
    return 'study:id:' + String(card.id);
  }
  if (card.rowId != null) return o + ':' + String(card.rowId);
  return o + ':id:' + String(card.id);
}

// Filtra por origem e atividade. origin null/undefined = todas as origens
// reconhecidas (usar só para totais que não misturam semânticas).
function analyticsScope(cards, origin){
  return (cards || []).filter(c => isAnalyticsActiveCard(c) && (!origin || c.origin === origin));
}

// Agrupa em UMA passada: Map(noteKey -> CardInstances irmãs).
function groupCardsByNote(cards){
  const map = new Map();
  (cards || []).forEach(c => {
    const k = analyticsNoteKey(c);
    if (k == null) return;
    const g = map.get(k);
    if (g) g.push(c); else map.set(k, [c]);
  });
  return map;
}

// ---------- Estado e Devido (CardInstance) ----------

// New/Learning/Review: fonte única K1.
function cardNLR(card){ return cardStudyBucket(card); }

// Devido = não-New com due <= agora. New NÃO é devido só porque due===0.
function isCardDue(card, now){
  const t = now == null ? Date.now() : now;
  return cardStudyBucket(card) !== 'new' && !!card.due && card.due <= t;
}

// ---------- Contagens ESTRUTURAIS (CardInstance) ----------
// Mesma semântica de getDeckCounts (deck-engine.js): `review` aqui é o
// ESTADO (todos os Review); `reviewDue` é "Para revisar" (Review vencidos,
// idêntico a countReviewCards do Deck).
function structuralCounts(cards, now){
  const t = now == null ? Date.now() : now;
  const out = { cards: 0, new: 0, learning: 0, review: 0, reviewDue: 0, due: 0 };
  (cards || []).forEach(c => {
    if (!isAnalyticsActiveCard(c)) return;
    out.cards++;
    const b = cardStudyBucket(c);
    out[b]++;
    if (b !== 'new' && c.due && c.due <= t){
      out.due++;
      if (b === 'review') out.reviewDue++;
    }
  });
  return out;
}

// ---------- Métricas PEDAGÓGICAS (Note) ----------

// "Estudado": evidência de estudo (reps>0) em pelo menos UMA irmã.
function isNoteStudied(siblings){
  return (siblings || []).some(c => c.reps > 0);
}

// Força da Note: nenhuma irmã estudada = not_started; senão a MAIS FRACA entre
// as estudadas (irmã não estudada não rebaixa). Reusa a regra por CardInstance
// de K2-E (cardStrengthBucket), sem fórmula nova.
function noteStrengthBucket(siblings){
  const studied = (siblings || []).filter(c => c.reps > 0);
  if (!studied.length) return 'not_started';
  const rank = { weak: 0, medium: 1, strong: 2 };
  return studied.map(cardStrengthBucket).reduce((a, b) => rank[b] < rank[a] ? b : a);
}

// Agregação pedagógica de um conjunto de cards (já escopado pelo chamador).
// UMA passada de agrupamento + UMA de agregação.
function contentMetrics(cards){
  const groups = groupCardsByNote(analyticsScope(cards));
  const out = { notes: 0, studied: 0, notStarted: 0, strength: { not_started: 0, weak: 0, medium: 0, strong: 0 } };
  groups.forEach(g => {
    out.notes++;
    if (isNoteStudied(g)) out.studied++; else out.notStarted++;
    out.strength[noteStrengthBucket(g)]++;
  });
  return out;
}

// "Palavras aprendidas" -- SÓ Study Trail, por idioma (o chamador passa os
// cards do idioma). Denominador = curso inteiro: todas as palavras (Notes) do
// curso presentes em `cards` (a trilha constrói TODAS as unidades, liberadas ou
// não), ou `courseWordTotal` explícito quando o chamador conhece o total real.
// Numerador = palavras com alguma irmã estudada; conteúdo futuro nunca entra
// sem evidência. Teacher/Self nunca entram.
function studyTrailWordProgress(cards, courseWordTotal){
  // Cartões "Na frase" (opt-in, study-trail-model) não são palavras.
  const isPhrase = c => typeof isStudyTrailPhraseCard === 'function' && isStudyTrailPhraseCard(c);
  const m = contentMetrics((cards || []).filter(c => c.origin === 'study' && !isPhrase(c)));
  const total = courseWordTotal != null ? courseWordTotal : m.notes;
  return { total, learned: m.studied, notStarted: Math.max(0, total - m.studied), strength: m.strength };
}

// "Conteúdos estudados" -- Teacher OU Self, nunca misturados com a trilha nem
// entre si. Denominador = Notes ativas do escopo; numerador = Notes com alguma
// irmã reps>0.
function ownContentProgress(cards, origin){
  if (origin !== 'teacher' && origin !== 'self') throw new Error('ownContentProgress: origin deve ser teacher ou self');
  const m = contentMetrics((cards || []).filter(c => c.origin === origin));
  return { total: m.notes, studied: m.studied, notStarted: m.notStarted, strength: m.strength };
}

// Arquivados: contador INFORMATIVO separado (CardInstances e Notes), nunca
// somado às métricas ativas. Só Teacher/Self têm arquivamento.
function archivedCounts(cards, origin){
  const arch = (cards || []).filter(c => (c.origin === 'teacher' || c.origin === 'self')
    && c.flashcardStatus === 'archived' && (!origin || c.origin === origin));
  return { cards: arch.length, notes: groupCardsByNote(arch).size };
}

// Resumo por origem (uma chamada): estrutural + pedagógico, escopo explícito.
// Cada origem é calculada isoladamente -- não há total unificado da conta.
function analyticsSummaryByOrigin(cards, origin, now){
  const scoped = analyticsScope(cards, origin);
  return {
    origin,
    structural: structuralCounts(scoped, now),
    content: contentMetrics(scoped),
    archived: archivedCounts(cards, origin),
  };
}

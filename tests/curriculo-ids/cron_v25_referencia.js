// CÓPIA CONGELADA (referência para o teste antes x depois) das funções de contagem do notification-cron v25, como
// estavam antes da Etapa 0b (mapa à mão LESSON_VOCAB_MAP + regex no id). NÃO usar em produção; não atualizar.
// Gerada de supabase/functions/notification-cron/index.ts (commit 74a9af3) com types removidos.
const REVIEW_OVERDUE_STALE_MS = 48 * 60 * 60 * 1000;
const REVIEW_OVERDUE_MIN_COUNT = 3;
const LESSON_VOCAB_MAP                                             = {
  frances: {
    "A1-1": [[0,1,2], [3,4,5], [6,7,8,9], []],
    "A1-2": [[0,1,2], [3,4,5], [6,7,8,9], []],
    "A1-3": [[0,1,2], [3,4,5], [6,7,8,9], []],
    "A1-g1": [],
    "A1-4": [[0,1,2], [3,4,5], [6,7,8,9], []],
    "A1-g2": [],
    "A1-5": [[0,1,2], [3,4,5], [6,7,8,9], []],
    "A1-6": [[0,1,2], [3,4,5], [6,7,8,9], []],
    "A1-g3": [],
    "A1-7": [[0,1,2], [3,4,5], [6,7,8,9], []],
    "A1-8": [[0,1,2], [3,4,5], [6,7,8,9], []],
    "A1-g4": [],
    "A1-9": [[0,1,2], [3,4,5], [6,7,8,9], []],
    "A1-10": [[0,1,2], [3,4,5], [6,7,8], [9,10,11], [12,13], []],
    "A1-g10": [],
    "A1-11": [[0,1,2], [3,4,5], [6,7,8,9], []],
    "A1-12": [[0,1,2], [3,4,5], [6,7,8,9], []],
    "A1-13": [[0,1,2], [3,4,5], [6,7,8,9], []],
    "A1-14": [[0,1,2], [3,4,5], [6,7,8,9], []],
    "A1-g5": [],
    "A1-15": [[0,1,2], [3,4,5], [6,7,8,9], []],
    "A1-g6": [],
    "A1-16": [[0,1,2], [3,4,5], [6,7,8,9], []],
    "A1-g7": [],
    "A1-17": [[0,1,2], [3,4,5], [6,7,8,9], []],
    "A1-18": [[0,1,2], [3,4,5], [6,7,8,9], []],
    "A1-19": [[0,1,2], [3,4,5], [6,7,8,9], []],
    "A1-g8": [],
    "A1-20": [[0,1,2], [3,4,5], [6,7,8,9], []],
    "A1-g9": []
  },
  mandarim: {
    "1": [[0,1,2], [3,4,5], [6,7], []],
    "2": [[0,1,2], [3,4,5], [6,7,8,9], []],
    "3": [[0,1,2], [3,4,5], [6,7,8], [9,10,11], [12,13], []],
    "4": [[0,1,2], [3,4,5], [6,7,8], [9,10,11], []],
    "5": [[0,1,2], [3,4,5], [6,7,8], [9,10], []],
    "6": [[0,1,2], [3,4,5], [6,7,8], []],
    "7": [[0,1,2], [3,4,5], [6,7,8], []],
    "8": [[0,1,2], [3,4,5], [6,7,8], [9,10], []],
    "9": [[0,1,2], [3,4,5,6], []],
    "10": [[0,1,2], [3,4,5], [6,7], []],
    "11": [[0,1,2], [3,4,5], [6,7], []],
    "12": [[0,1,2], [3,4,5], [6,7], []],
    "13": [[0,1,2], [3,4,5,6], []],
    "14": [[0,1,2], [3,4,5], []],
    "15": [[0,1,2], [3,4,5], [6,7,8,9], []],
    "16": [[0,1,2], [3,4,5], [6,7,8,9], []],
    "17": [[0,1,2], [3,4,5], [6,7], []],
    "18": [[0,1,2], [3,4,5], [6,7,8,9], []]
  },
};

// Espelha isCardLessonCompleted() (fr/app.js, zh/app.js) usando
// LESSON_VOCAB_MAP em vez de UNITS (indisponível aqui).
function isCardLessonCompletedServer(card     , unitProgress     , languageAppKey        )          {
  const prog = unitProgress?.[card?.unitId];
  // A0 (06/10/2026): espelho do cliente -- unidade concluída libera tudo.
  if (prog?.completed) return true;
  if (!prog?.started) return false;
  const lessons = LESSON_VOCAB_MAP[languageAppKey]?.[String(card.unitId)];
  const lessonIdx = lessons ? lessons.findIndex((vocabIdxList) => vocabIdxList.includes(card.vocabIdx)) : -1;
  if (lessonIdx === -1) return !!prog.completed;
  return lessonIdx < prog.lessonIdx;
}

// K2-B: identidade da PALAVRA de um card da Study Trail. Hoje cada palavra é
// um card `u{unitId}-v{idx}`; a migração da trilha (K2-C) passa a gerar dois
// CardInstances por palavra: A (`u{unitId}-v{idx}`) e B (`u{unitId}-v{idx}-b`).
// A/B representam a MESMA palavra e devem contar uma vez só em "palavras
// prontas pra revisar". A identidade sai do id ancorado (não de "qualquer
// sufixo -b": ids de professora/aluna são `t{n}`/`s{n}` e nunca casam aqui).
// Devolve null pra qualquer card que não seja da trilha -- esses mantêm a
// contagem por card, como sempre.
const STUDY_CARD_ID_RE = /^(u.+-v(\d+))(-b)?$/;

function studyWordIdentity(card     )                                              {
  if (!card) return null;
  // origin explícito diferente de 'study' nunca é trilha. Saves antigos não
  // têm `origin`: aí só o formato do id decide (t{n}/s{n} nunca casam).
  if (card.origin != null && card.origin !== 'study') return null;
  const m = typeof card.id === 'string' ? STUDY_CARD_ID_RE.exec(card.id) : null;
  if (!m) return null;
  return { baseId: m[1], vocabIdx: Number(m[2]) };
}

function computeReviewOverdueCount(cards                   , unitProgress     , languageAppKey        )         {
  const now = Date.now();
  let count = 0;
  const seenStudyWords = new Set        ();
  for (const c of (cards || [])) {
    if (!(c && c.reps > 0 && c.due && (now - c.due) > REVIEW_OVERDUE_STALE_MS)) continue;
    // K.0-C: Teacher/Self não pertencem a nenhuma unidade (unitId null), então
    // não passam pelo gate de lição da trilha. Espelha isCardLessonCompleted()
    // do cliente (fr/zh app.js): só flashcardStatus==='active' os libera --
    // arquivado fica de fora. Cada CardInstance conta individualmente (sem
    // dedup por Note: o cron trabalha com CardInstances). New já foi excluído
    // acima (reps>0).
    if (c.origin === 'teacher' || c.origin === 'self') {
      if (c.flashcardStatus === 'active') count++;
      continue;
    }
    const word = studyWordIdentity(c);
    // Save da trilha que serialize só id+progresso (K2-C) pode não trazer
    // unitId/vocabIdx: completa a partir do id só quando faltarem, pra o
    // gate de lição continuar o mesmo. Com unitId presente nada muda.
    let gateCard = c;
    if (word && (c.unitId == null || c.vocabIdx == null)) {
      gateCard = { ...c, unitId: c.unitId ?? word.baseId.slice(1, word.baseId.lastIndexOf('-v')), vocabIdx: c.vocabIdx ?? word.vocabIdx };
    }
    if (!isCardLessonCompletedServer(gateCard, unitProgress, languageAppKey)) continue;
    if (word) {
      if (seenStudyWords.has(word.baseId)) continue;
      seenStudyWords.add(word.baseId);
    }
    count++;
  }
  return count;
}


module.exports = { computeReviewOverdueCount, REVIEW_OVERDUE_STALE_MS, REVIEW_OVERDUE_MIN_COUNT };

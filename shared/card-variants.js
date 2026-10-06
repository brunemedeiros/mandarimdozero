// Progresso por palavra, não por posição (i18n do conteúdo).
//
// Alguns cartões da trilha trocam a PALAVRA ESTUDADA conforme o idioma do site
// (ex.: o país do aluno: "brésilien / brésilienne" no português,
// "américain / américaine" no inglês; hanzi 巴 -> 美). O id do cartão
// (u2-v8, h4-c1) é a posição e continua o mesmo, então sem este módulo o
// histórico de uma palavra passaria a valer para outra ao trocar o idioma.
//
// Regra: quando a palavra de um cartão muda, o progresso atual vai para uma
// "gaveta" (STATE.cardVariants[id][palavra]) e o progresso da palavra nova é
// restaurado da gaveta, ou começa do zero. Ids e cartões que não trocam de
// palavra não são tocados. Funções puras (sem DOM/rede/STATE), testáveis em Node.
(function(root){
  'use strict';

  // Campos de memória (SM-2 + FSRS) que pertencem à palavra, não à posição.
  var CARD_PROGRESS_FIELDS = [
    'ef', 'interval', 'reps', 'due', 'lapses',
    'stability', 'difficulty', 'state', 'lastReview',
    'fsrsReps', 'fsrsLapses', 'fsrsMigrated'
  ];

  // Cartão novo: mesmos valores de buildCardsFromUnits() (fsrsMigrated ausente
  // de propósito, ver comentário lá).
  var FRESH_CARD_PROGRESS = {
    ef: 2.5, interval: 0, reps: 0, due: 0, lapses: 0,
    stability: 0, difficulty: 0, state: 'new', lastReview: null,
    fsrsReps: 0, fsrsLapses: 0
  };

  function snapshotProgress(card){
    var s = {};
    CARD_PROGRESS_FIELDS.forEach(function(k){ if (card[k] !== undefined) s[k] = card[k]; });
    return s;
  }

  // Troca o progresso do cartão de `oldWord` para `newWord`.
  // stash: STATE.cardVariants (objeto {id: {palavra: progresso}}); é mutado.
  // Devolve true se houve troca de palavra.
  function swapCardWordProgress(card, oldWord, newWord, stash){
    if (!card || !stash) return false;
    if (typeof oldWord !== 'string' || typeof newWord !== 'string') return false;
    if (oldWord === '' || newWord === '' || oldWord === newWord) return false;
    var slot = stash[card.id] || (stash[card.id] = {});
    slot[oldWord] = snapshotProgress(card);
    CARD_PROGRESS_FIELDS.forEach(function(k){ delete card[k]; });
    Object.assign(card, FRESH_CARD_PROGRESS, slot[newWord] || {});
    delete slot[newWord]; // o progresso ativo vive no próprio cartão
    return true;
  }

  // Gaveta vinda do save: só aceita o formato esperado (objeto de objetos).
  function normalizeCardVariants(raw){
    var out = {};
    if (!raw || typeof raw !== 'object') return out;
    Object.keys(raw).forEach(function(id){
      var slot = raw[id];
      if (!slot || typeof slot !== 'object') return;
      var clean = {};
      Object.keys(slot).forEach(function(word){
        if (slot[word] && typeof slot[word] === 'object') clean[word] = slot[word];
      });
      if (Object.keys(clean).length) out[id] = clean;
    });
    return out;
  }

  var api = {
    CARD_PROGRESS_FIELDS: CARD_PROGRESS_FIELDS,
    swapCardWordProgress: swapCardWordProgress,
    normalizeCardVariants: normalizeCardVariants
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.CardVariants = api;
})(typeof window !== 'undefined' ? window : globalThis);

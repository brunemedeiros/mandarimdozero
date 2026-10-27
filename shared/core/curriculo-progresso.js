// Mudanças de currículo no SALVAR e no CARREGAR do progresso, iguais para todos os sites (fr, zh e os próximos).
// C1 de docs/auditoria-paridade-fr-zh.md (Etapa 1 da paridade): o que era só do fr/app.js (Etapa 0a/0b do currículo,
// docs/i18n/curriculo/04-lacunas-e-propostas-fr.md seção 2) veio para cá; os dois app.js chamam estas funções em
// serializeState e applySerializedState.
//
// As funções puras (applyStudyKeyChanges, renameStudyIdsInRecords, applyUnitModuleMerges, stampUnitLessonIds,
// reconcileUnitLessonIdx, studyCurriculumChanges) moram em shared/study-trail-model.js; openUnitsBeforeOpenOnes em
// shared/trail-state-model.js; isCardLessonCompleted em shared/core/revisao-decks.js. Aqui fica só a ORDEM em que o
// carregamento as aplica sobre STATE. Usa do app.js: STATE, UNITS, trailGroups (chamados na hora do uso).
// Funciona sem MODULES (zh) e sem <site>/curriculum-changes.js (nenhuma mudança).

// serializeState: grava o id da lição atual de cada unidade (lessonIdx segue o id se a lição mudar de posição) e
// devolve os campos de currículo do bloco salvo. Usar com spread: `...curriculumSaveFields()`.
function curriculumSaveFields(){
  stampUnitLessonIds(STATE.unitProgress, UNITS);
  return {
    retiredStudyCards: STATE.retiredStudyCards,
    _curriculumVersion: studyCurriculumChanges().version,
  };
}

// applySerializedState, ANTES de devolver o progresso aos cartões: leva o save através das mudanças de currículo
// (<site>/curriculum-changes.js): fusões de chave, aposentados e órfãos para o arquivo (STATE.retiredStudyCards), volta
// de item arquivado, unidade/módulo fundido. Idempotente; sem mudança nenhuma não altera nada. Não muta `data`.
// Devolve o save ajustado:
//   cards               data.cards ajustado (para mergeSavedCards)
//   hasCards            true se há cartões a devolver (data.cards ou algum restaurado do arquivo)
//   cardVariants        data.cardVariants com os ids renomeados
//   hardSeenIds         data.reviewRecords.hardSeenIds renomeado, ou null se nenhuma fusão renomeou id
//   unitProgress, checkpointProgress   com UNIT_MERGES/MODULE_MERGES aplicados
function curriculumLoadPrepare(data){
  const changes = studyCurriculumChanges();
  const keyChanges = applyStudyKeyChanges(data.cards || [], {
    merges: changes.merges, retiredKeys: changes.retiredKeys, archive: data.retiredStudyCards,
    currentIds: STATE.cards.filter(c => c.origin === 'study').map(c => c.id), today: todayStr(),
  });
  STATE.retiredStudyCards = keyChanges.archive;
  const renamed = renameStudyIdsInRecords(keyChanges.renames, data.cardVariants,
    data.reviewRecords && data.reviewRecords.hardSeenIds);
  const unitMerged = applyUnitModuleMerges(data.unitProgress, data.checkpointProgress, changes.unitMerges, changes.moduleMerges);
  return {
    cards: keyChanges.cards,
    hasCards: !!(data.cards || keyChanges.restored.length),
    cardVariants: renamed.cardVariants,
    hardSeenIds: Object.keys(keyChanges.renames).length && Array.isArray(renamed.hardSeenIds) ? renamed.hardSeenIds : null,
    unitProgress: unitMerged.unitProgress,
    checkpointProgress: unitMerged.checkpointProgress,
  };
}

// applySerializedState, DEPOIS de STATE.unitProgress receber o save (só quando o save trouxe unitProgress):
// a lição salva mudou de posição -> lessonIdx segue o id (se sumiu, volta para a 1ª com palavra não liberada);
// unidade nova inserida antes de onde o aluno já está nasce aberta, mas não concluída (04, 2.10).
function curriculumLoadReconcileUnits(){
  reconcileUnitLessonIdx(STATE.unitProgress, UNITS, (u, vi) => {
    const c = STATE.cards.find(x => x.id === studyWordCardId(u, vi));
    return !!(c && c.released);
  });
  openUnitsBeforeOpenOnes(trailGroups(), STATE.unitProgress);
}

// applySerializedState, no fim da parte de cartões e unidades: marca `released` em todo cartão já liberado pelo
// portão de lição (04, 2.3 item 8). No 1º carregamento depois da chave estável, todo cartão que já estava na Revisão
// ganha a marca e continua lá mesmo se a palavra mudar de unidade. Só item com chave (`studyKey`).
function curriculumLoadStampReleased(){
  STATE.cards.forEach(c => { if (c.origin === 'study' && c.studyKey && !c.released) isCardLessonCompleted(c); });
}

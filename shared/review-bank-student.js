// Lado do aluno do Banco de Revisão (migration 081/082).
// 1) applyPendingBankReviews(): as respostas que a professora marcou no Modo aula (acertou, ajuda, errou)
//    viram nota no FSRS do PRÓPRIO aluno (só o dono grava o progresso). Acertou = Bom (2), ajuda = Difícil (1),
//    errou = Errei (0). Cada evento é confirmado (ack) depois de gravado; se o cartão ainda não chegou neste
//    aparelho, o evento fica pendente e entra no próximo carregamento.
// 2) refreshTeacherDeliveries(): ao voltar para a aba, busca de novo os cartões da professora (aprovar entrega
//    na hora) e aplica eventos pendentes. Nunca mexe numa sessão de Revisão em andamento: a fila já foi montada.
// Depende de: supabaseClient, CURRENT_USER, APP_KEY, STATE, progressLoadedOk (shared/auth.js), applyMemoryGrade
// (shared/fsrs.js), trackReviewAnswer (shared/analytics.js), saveState, mergeTeacherFlashcardsIntoState (app.js).

const BANK_OUTCOME_GRADE = { acertou: 2, ajuda: 1, errou: 0 };

function bankReviewTargetCard(teacherFlashcardId){
  const rowId = String(teacherFlashcardId);
  return (STATE.cards || []).find(c => c.origin === 'teacher' && String(c.rowId) === rowId && !String(c.id).endsWith('-b')) || null;
}

async function applyPendingBankReviews(){
  if (typeof supabaseClient === 'undefined' || typeof CURRENT_USER === 'undefined' || !CURRENT_USER) return 0;
  if (typeof progressLoadedOk !== 'undefined' && !progressLoadedOk) return 0;
  const { data, error } = await supabaseClient.rpc('get_my_pending_bank_reviews', { p_language_app_key: APP_KEY });
  if (error || !Array.isArray(data) || !data.length) return 0;
  const toAck = [];
  let applied = 0;
  data.forEach(ev => {
    const card = bankReviewTargetCard(ev.teacher_flashcard_id);
    if (!card) return;
    if (card.flashcardStatus === 'active'){
      const grade = BANK_OUTCOME_GRADE[ev.outcome];
      if (grade === undefined) return;
      applyMemoryGrade(card, grade, new Date(ev.created_at).getTime() || Date.now());
      if (typeof trackReviewAnswer === 'function') trackReviewAnswer('class_mode', card, grade);
      applied += 1;
    }
    toAck.push(ev.id);
  });
  if (!toAck.length) return 0;
  if (applied) await saveState();
  await supabaseClient.rpc('ack_my_bank_reviews', { p_ids: toAck });
  return applied;
}

let _teacherDeliveriesLastRefresh = 0;
async function refreshTeacherDeliveries(){
  if (typeof CURRENT_USER === 'undefined' || !CURRENT_USER) return;
  const now = Date.now();
  if (now - _teacherDeliveriesLastRefresh < 90000) return;
  _teacherDeliveriesLastRefresh = now;
  try {
    if (typeof mergeTeacherFlashcardsIntoState === 'function') await mergeTeacherFlashcardsIntoState();
    const n = await applyPendingBankReviews();
    if (typeof renderTopbarStats === 'function') renderTopbarStats();
    return n;
  } catch (e) { console.error('refreshTeacherDeliveries:', e); }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') refreshTeacherDeliveries();
});

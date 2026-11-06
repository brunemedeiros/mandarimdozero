// Lado do aluno do Banco de Revisão (migration 081/082).
// 1) applyPendingBankReviews(): as respostas que a professora marcou no Modo aula (nota 0 a 3; antes: acertou, ajuda, errou)
//    viram nota no FSRS do PRÓPRIO aluno (só o dono grava o progresso). Acertou = Bom (2), ajuda = Difícil (1),
//    errou = Errei (0). Cada evento é confirmado (ack) depois de gravado; se o cartão ainda não chegou neste
//    aparelho, o evento fica pendente e entra no próximo carregamento.
// 2) refreshTeacherDeliveries(): ao voltar para a aba, busca de novo os cartões da professora (aprovar entrega
//    na hora) e aplica eventos pendentes. Nunca mexe numa sessão de Revisão em andamento: a fila já foi montada.
// Depende de: supabaseClient, CURRENT_USER, APP_KEY, STATE, progressLoadedOk (shared/auth.js), applyMemoryGrade
// (shared/fsrs.js), trackReviewAnswer (shared/analytics.js), saveState, mergeTeacherFlashcardsIntoState (app.js).

const BANK_OUTCOME_GRADE = { acertou: 2, ajuda: 1, errou: 0 };

// ---------- Estudo em casa alimenta o Banco (migration 112, decisão da autora 2026-10-18) ----------
// Cada nota dada a um cartão da professora que veio do Banco (Aluno > Revisão) vira uma linha na fila local e é enviada
// por log_my_bank_review (estatística + estado FSRS espelhado no item, se a conta é individual). A fila sobrevive a
// offline/recarregar; se o banco ainda não tem a 112, a fila só espera (limite de 300 para não crescer sem fim).
const BANK_HOME_LOG_KEY = 'bank-home-log-v1';
const BANK_HOME_LOG_MAX = 300;
let _bankHomeFlushing = false;

function bankHomeLogRead(){
  try { const v = JSON.parse(localStorage.getItem(BANK_HOME_LOG_KEY + ':' + (CURRENT_USER && CURRENT_USER.id)) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
}
function bankHomeLogWrite(list){
  try { localStorage.setItem(BANK_HOME_LOG_KEY + ':' + (CURRENT_USER && CURRENT_USER.id), JSON.stringify(list.slice(-BANK_HOME_LOG_MAX))); } catch (e) {}
}
function bankHomeFsrsSnapshot(card){
  const o = {};
  ['stability', 'difficulty', 'state', 'lastReview', 'due', 'reps', 'lapses', 'interval', 'fsrsReps', 'fsrsLapses'].forEach(k => { if (card[k] !== undefined && card[k] !== null) o[k] = card[k]; });
  return o;
}
// Chamada por gradeCurrentCard() DEPOIS de applyMemoryGrade. Só cartões da professora (origin 'teacher') com linha própria.
// opts.correction (botão Voltar da Revisão): é a nota CORRIGIDA de um cartão já respondido. Se a resposta anterior ainda está na fila (não
// foi enviada), ela é trocada ali mesmo; se já foi, o envio usa correct_my_bank_review (127), que troca a de hoje em vez de somar outra.
function logBankHomeStudy(card, grade, typed, opts){
  try {
    if (!card || card.origin !== 'teacher' || card.rowId == null || typeof CURRENT_USER === 'undefined' || !CURRENT_USER) return;
    const list = bankHomeLogRead();
    const entry = { card: Number(card.rowId), grade, typed: !!typed, fsrs: bankHomeFsrsSnapshot(card), at: Date.now() };
    if (opts && opts.correction){
      let at = -1;
      for (let i = list.length - 1; i >= 0; i--){ if (list[i].card === entry.card){ at = i; break; } }
      if (at >= 0 && !(at === 0 && _bankHomeFlushing)){ entry.fix = !!list[at].fix; list[at] = entry; bankHomeLogWrite(list); flushBankHomeLog(); return; }
      entry.fix = true;
    }
    list.push(entry);
    bankHomeLogWrite(list);
    flushBankHomeLog();
  } catch (e) { console.error('logBankHomeStudy:', e); }
}
async function flushBankHomeLog(){
  if (_bankHomeFlushing || typeof supabaseClient === 'undefined' || typeof CURRENT_USER === 'undefined' || !CURRENT_USER) return;
  _bankHomeFlushing = true;
  try {
    let list = bankHomeLogRead();
    while (list.length){
      const e = list[0];
      const args = { p_card_id: e.card, p_grade: e.grade, p_typed: !!e.typed, p_fsrs: e.fsrs || null };
      let { error } = await supabaseClient.rpc(e.fix ? 'correct_my_bank_review' : 'log_my_bank_review', args);
      // Banco ainda sem a 127: a correção entra como resposta comum (não trava a fila).
      if (error && e.fix && (error.code === 'PGRST202' || error.code === '42883')) ({ error } = await supabaseClient.rpc('log_my_bank_review', args));
      if (error) break; // sem rede ou banco sem a 112: tenta de novo no próximo envio
      list = bankHomeLogRead().slice(1);
      bankHomeLogWrite(list);
    }
  } catch (e) {} finally { _bankHomeFlushing = false; }
}

function bankReviewTargetCard(teacherFlashcardId){
  const rowId = String(teacherFlashcardId);
  return (STATE.cards || []).find(c => c.origin === 'teacher' && String(c.rowId) === rowId && !String(c.id).endsWith('-b')) || null;
}

async function applyPendingBankReviews(){
  if (typeof supabaseClient === 'undefined' || typeof CURRENT_USER === 'undefined' || !CURRENT_USER) return 0;
  if (typeof progressLoadedOk !== 'undefined' && !progressLoadedOk) return 0;
  // Versão com a nota exata da professora (112); sem ela, cai no resultado antigo (acertou, ajuda, errou).
  let res = await supabaseClient.rpc('get_my_pending_bank_grades', { p_language_app_key: APP_KEY });
  if (res.error) res = await supabaseClient.rpc('get_my_pending_bank_reviews', { p_language_app_key: APP_KEY });
  const { data, error } = res;
  if (error || !Array.isArray(data) || !data.length) return 0;
  const toAck = [];
  let applied = 0;
  data.forEach(ev => {
    const card = bankReviewTargetCard(ev.teacher_flashcard_id);
    if (!card) return;
    if (card.flashcardStatus === 'active'){
      const grade = (ev.grade !== undefined && ev.grade !== null) ? Number(ev.grade) : BANK_OUTCOME_GRADE[ev.outcome];
      if (grade === undefined || !(grade >= 0 && grade <= 3)) return;
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
    if (typeof muralApplyBadges === 'function') muralApplyBadges(); // +N da aba Aluno > Revisão
    return n;
  } catch (e) { console.error('refreshTeacherDeliveries:', e); }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible'){ refreshTeacherDeliveries(); flushBankHomeLog(); }
});

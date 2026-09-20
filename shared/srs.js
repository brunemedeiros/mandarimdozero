// ---------- Utilitários de fila/data + ponte pra exercícios de lição ----------
// O motor de memória de verdade (FSRS-6: scheduleReview/applyMemoryGrade/
// migrateCardToFSRS) mora em shared/fsrs.js desde a Fase 3 da
// reestruturação; a seleção de quem entra numa sessão vem de
// shared/study-queue.js. Este arquivo ficou só com utilitários que não
// dependem do algoritmo em si -- filtro de due/novos, datas, XP por grade
// -- e a ponte que conecta exercícios de lição ao motor de memória. Não
// depende de nenhum conteúdo pedagógico específico de idioma, só do
// formato genérico de STATE.cards e de unit.vocab (array de itens de
// vocabulário por unidade), formato usado pelos dois idiomas.
// grade (escala SM2 usada nos 4 pontos de entrada -- Flashcard/Speed
// Review/Combinar/exercícios): 0=Errei, 1=Difícil, 2=Bom, 3=Fácil.
// Ver ARCHITECTURE.md na raiz do repo pra a arquitetura completa.

// Conecta o resultado de um exercício de vocabulário ao motor de memória
// usado pelo Flashcard — sem isso, "palavras aprendidas" (usado no card da
// trilha e na conclusão de unidade) só contava revisões feitas no Flashcard,
// deixando a contagem baixa mesmo depois de completar 100% dos exercícios.
// Cada acerto em exercício conta como um grade "Bom" (equivalente a acertar
// no Flashcard) — não tão generoso quanto "Fácil", mas já efetivamente
// marca a palavra como aprendida (reps > 0).
function registerExerciseCorrect(unit, vocabItem){
  const idx = unit.vocab.indexOf(vocabItem);
  if (idx === -1) return;
  const cardId = `u${unit.id}-v${idx}`;
  const card = STATE.cards.find(c => c.id === cardId);
  if (card && card.reps === 0){
    // Fase 5: exercícios de lição também alimentam o motor novo (via
    // applyMemoryGrade, shared/fsrs.js) -- não passam mais por applySM2.
    applyMemoryGrade(card, 2); // grade 2 = "Bom"
  }
}

// applySM2() (o motor SM-2 original) foi removido na Fase 15 da
// reestruturação de memória -- substituído por scheduleReview()/
// applyMemoryGrade() em shared/fsrs.js desde a Fase 3/5, sem nenhum call
// site restante. card.ef continua existindo em STATE.cards só como dado
// legado lido por migrateCardToFSRS() (bridge de migração, shared/fsrs.js)
// -- nenhum código novo escreve nele.

// Direção do flashcard (estilo Anki: frente->verso e verso->frente), igual
// pros dois idiomas -- só o CONTEÚDO de cada lado é específico de idioma
// (hanzi só existe no chinês), a alternância em si não. Cada card guarda
// `lastDirection` (persistido junto do resto de STATE.cards) e alterna a
// cada revisão -- por construção, uma carta só aparece 1x por sessão (a
// fila de revisão é montada 1x no início da sessão), então mostrar
// frente->verso nesta sessão automaticamente deixa verso->frente pra
// próxima vez que essa carta ficar due, nunca as duas juntas.
function nextCardDirection(card){
  return card.lastDirection === 'front-to-back' ? 'back-to-front' : 'front-to-back';
}

function cardsDueNow(pool){
  const now = Date.now();
  return pool.filter(c => c.due <= now);
}

function newCards(pool){
  return pool.filter(c => c.reps === 0 && c.due === 0);
}

// ---------- Gamificação ----------
const XP_PER_GRADE = { 0: 1, 1: 4, 2: 8, 3: 10 };

function todayStr(){
  const d = new Date();
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function dateStrDaysAgo(days){
  const d = new Date(Date.now() - days*86400000);
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// STATE.streak só é recalculado dentro de registerStudyToday() (fr/zh
// app.js), ou seja, só muda quando a pessoa efetivamente estuda -- se ela
// para de aparecer, o número fica CONGELADO no último valor alcançado em
// vez de zerar. Telas que exibem o streak como "status atual" (chama no
// topbar, card "Dias seguidos" do perfil) precisam checar aqui se ele
// ainda está vivo, não ler STATE.streak direto -- mesma regra de gap que
// registerStudyToday() já usa (hoje ou ontem = vivo, mais que isso =
// quebrado). Bug relatado pela autora (2026-09-18): notificação
// "user_inactive_3" batendo com o flame do topbar ainda mostrando "3".
function effectiveStreak(){
  if (!STATE.streak || !STATE.lastStudyDay) return 0;
  const today = todayStr();
  if (STATE.lastStudyDay === today || STATE.lastStudyDay === dateStrDaysAgo(1)) return STATE.streak;
  return 0;
}

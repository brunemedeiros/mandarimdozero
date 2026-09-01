// ---------- Motor de repetição espaçada: SM-2 (idêntico em espírito ao Anki) ----------
// Puro algoritmo + utilitários de data -- não depende de nenhum conteúdo
// pedagógico específico de idioma, só do formato genérico de STATE.cards
// (cada card com reps/interval/ef/lapses/due/firstLearnedDate) e de
// unit.vocab (array de itens de vocabulário por unidade), formato usado
// pelos dois idiomas.
// grade: 0=Errei, 1=Difícil, 2=Bom, 3=Fácil

// Conecta o resultado de um exercício de vocabulário ao mesmo sistema SM-2
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
    applySM2(card, 2); // grade 2 = "Bom"
  }
}

function applySM2(card, grade){
  const now = Date.now();
  const DAY = 24*60*60*1000;

  if (grade === 0){
    // Errou: reseta repetições, intervalo curto, aumenta lapses
    card.reps = 0;
    card.interval = 0;
    card.lapses += 1;
    card.ef = Math.max(1.3, card.ef - 0.2);
    card.due = now + (10*60*1000); // reaparece em 10 min (mesma sessão)
    return;
  }

  // Ajuste do EF conforme qualidade da resposta (mapeando 1/2/3 -> escala 0-5 do SM-2 original)
  const qMap = { 1: 3, 2: 4, 3: 5 }; // difícil~3, bom~4, fácil~5
  const q = qMap[grade];
  card.ef = Math.max(1.3, card.ef + (0.1 - (5-q)*(0.08 + (5-q)*0.02)));

  card.reps += 1;

  // Registra a data da primeira vez que essa palavra foi efetivamente
  // aprendida (reps saindo de 0) — usado no gráfico de progresso acumulado.
  if (card.reps === 1 && !card.firstLearnedDate){
    card.firstLearnedDate = todayStr();
  }

  if (card.reps === 1){
    card.interval = grade === 1 ? 1 : (grade === 2 ? 1 : 3);
  } else if (card.reps === 2){
    card.interval = grade === 1 ? 3 : (grade === 2 ? 6 : 8);
  } else {
    let base = card.interval * card.ef;
    if (grade === 1) base = card.interval * 1.2; // difícil: cresce pouco
    if (grade === 3) base = card.interval * card.ef * 1.3; // fácil: bônus
    card.interval = Math.round(base);
  }

  card.due = now + card.interval * DAY;
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

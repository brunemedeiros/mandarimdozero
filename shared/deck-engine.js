// ---------- Fase C do prompt-mestre "Decks, Tags e Painel" -- DECK ENGINE
// (ver CLAUDE.md, "Fase A/Fase B") ----------
//
// Motor de domínio PURO sobre a árvore de Decks -- nenhuma chamada de rede
// aqui (isso mora em shared/deck-data.js, a camada de I/O). Toda função
// deste arquivo recebe os dados já carregados (array de linhas de `decks`,
// ou array de cards no shape de STATE.cards) e devolve um resultado --
// nunca lê/escreve Supabase, nunca toca STATE global, nunca sabe de FR/ZH.
//
// Camadas, na ordem que o prompt-mestre pediu pra separar:
//   1. Tree            -- getDeckX/isDescendantOf/getDeckRoot
//   2. Destino/permissão -- canPlaceXNoteInDeck/canMoveDeck/canMoveXNote
//   3. Escopo de estudo -- getStudyScopeForDeck
//   4. CardInstance     -- generatedCardInstanceCount (delega ao motor
//                          existente, shared/flashcard-model.js -- nunca
//                          reimplementa geração de CardInstance)
//   5/6. Agregação      -- bucketCardState/countXCards/getDeckCounts
//   8/9/10. Movimentação/delete -- validateNoteMove/validateDeckMove/
//                                  validateDeckDeletion (só domínio --
//                                  quem persiste é shared/deck-data.js)
//
// Nenhuma dessas funções decide DIREÇÃO, Card Type ou Fields -- Deck nunca
// é fonte de conteúdo (regra 2.3 do prompt-mestre), só organização.

// ============================================================
// 1) TREE
// ============================================================

function getDeckById(decks, deckId){
  if (deckId == null) return null;
  return decks.find(d => d.id === deckId) || null;
}

function getDeckChildren(decks, deckId){
  return decks.filter(d => d.parent_deck_id === deckId);
}

function getDeckParent(decks, deckId){
  const deck = getDeckById(decks, deckId);
  if (!deck || deck.parent_deck_id == null) return null;
  return getDeckById(decks, deck.parent_deck_id);
}

// Cadeia até a raiz, do mais PRÓXIMO pro mais DISTANTE (mesma ordem do
// exemplo do prompt-mestre -- "Viagem" -> [Vocabulário, Meus Decks,
// Francês]). Limite de profundidade defensivo (mesmo valor da migration
// 049/decks_validate_hierarchy() no banco) -- nunca deveria disparar (o
// trigger de ciclo já impede isso na origem), mas o Engine não confia
// cegamente num array que pode ter vindo de qualquer lugar.
function getDeckAncestors(decks, deckId){
  const ancestors = [];
  let current = getDeckParent(decks, deckId);
  let guard = 0;
  while (current && guard < 100){
    ancestors.push(current);
    current = getDeckParent(decks, current.id);
    guard++;
  }
  return ancestors;
}

// TODOS os descendentes (filhos, netos, etc.), não só filhos imediatos --
// seção 4.1 do prompt-mestre, explícito. BFS simples sobre o array plano;
// mesmo guard defensivo de profundidade/visitados que getDeckAncestors().
function getDeckDescendants(decks, deckId){
  const result = [];
  const visited = new Set([deckId]);
  let frontier = [deckId];
  let guard = 0;
  while (frontier.length && guard < 1000){
    const next = [];
    frontier.forEach(id => {
      getDeckChildren(decks, id).forEach(child => {
        if (visited.has(child.id)) return; // defensivo -- nunca deveria repetir
        visited.add(child.id);
        result.push(child);
        next.push(child.id);
      });
    });
    frontier = next;
    guard++;
  }
  return result;
}

// [deckId, ...descendentes] -- é isto que C3 (escopo de estudo) e C6
// (agregação) usam pra saber "quais decks pertencem a este subtree".
function getDeckSubtreeIds(decks, deckId){
  return [deckId, ...getDeckDescendants(decks, deckId).map(d => d.id)];
}

function isDescendantOf(decks, deckId, ancestorId){
  return getDeckAncestors(decks, deckId).some(d => d.id === ancestorId);
}

function getDeckRoot(decks, deckId){
  const ancestors = getDeckAncestors(decks, deckId);
  if (ancestors.length) return ancestors[ancestors.length - 1];
  const deck = getDeckById(decks, deckId);
  return deck && deck.kind === 'root' ? deck : null;
}

// ============================================================
// 2) DESTINO / PERMISSÕES
// ============================================================
// Espelham EXATAMENTE as regras já garantidas pelos triggers da migration
// 049 (decks_validate_hierarchy/own_flashcards_validate_deck/
// teacher_flashcards_validate_deck) -- nunca uma fronteira de segurança
// nova, só feedback rápido no cliente antes de gastar uma chamada de rede
// (mesmo nível "trava de UI, não fronteira de segurança" já usado em
// outros limites deste app, ex.: teto de 20 cartões grátis). O banco
// continua sendo a fonte de verdade real.

function canUserAccessDeck(userId, deck, opts){
  opts = opts || {};
  if (!deck || !userId) return false;
  if (opts.isAdmin) return true;
  return deck.owner_id === userId || deck.teacher_id === userId;
}

// note: {owner_id, language_app_key} (shape de uma linha own_flashcards).
function canPlaceOwnNoteInDeck(note, deck){
  if (!note || !deck) return { ok: false, reason: 'missing_data' };
  if (!['personal_root', 'personal'].includes(deck.kind)){
    return { ok: false, reason: 'wrong_kind' };
  }
  if (deck.owner_id !== note.owner_id) return { ok: false, reason: 'wrong_owner' };
  if (deck.language_app_key !== note.language_app_key) return { ok: false, reason: 'wrong_language' };
  return { ok: true };
}

// note: {teacher_id, student_id, language_app_key} (shape de uma linha
// teacher_flashcards).
function canPlaceTeacherNoteInDeck(note, deck){
  if (!note || !deck) return { ok: false, reason: 'missing_data' };
  if (!['teacher_root', 'teacher'].includes(deck.kind)){
    return { ok: false, reason: 'wrong_kind' };
  }
  if (deck.owner_id !== note.student_id) return { ok: false, reason: 'wrong_student' };
  if (deck.teacher_id !== note.teacher_id) return { ok: false, reason: 'wrong_teacher' };
  if (deck.language_app_key !== note.language_app_key) return { ok: false, reason: 'wrong_language' };
  return { ok: true };
}

// Regra 2.9 (Public Deck) -- nenhum campo/checagem específica de
// visibilidade pública é adicionada aqui: is_public é só uma flag sobre um
// Deck pessoal já existente (ver migration 049), as regras acima (mesmo
// dono/mesmo idioma) já bastam -- não inventar uma 2ª checagem que
// "inviabilize o futuro" fluxo público, que continua não-implementado.

// Só decks 'personal' podem ser movidos -- root/personal_root/course/
// teacher_root/teacher NUNCA (seção 12, lista explícita de "não
// permitir"). destino também precisa ser um Deck pessoal do MESMO dono/
// idioma, nunca um descendente do próprio Deck sendo movido (ciclo), nunca
// o próprio Deck.
function canMoveDeck(decks, deck, destination){
  if (!deck || !destination) return { ok: false, reason: 'missing_data' };
  if (deck.kind !== 'personal') return { ok: false, reason: 'not_movable_kind' };
  if (destination.id === deck.id) return { ok: false, reason: 'same_deck' };
  if (!['personal_root', 'personal'].includes(destination.kind)){
    return { ok: false, reason: 'destination_wrong_kind' };
  }
  if (destination.owner_id !== deck.owner_id) return { ok: false, reason: 'different_owner' };
  if (destination.language_app_key !== deck.language_app_key) return { ok: false, reason: 'different_language' };
  if (isDescendantOf(decks, destination.id, deck.id) || destination.id === deck.id){
    return { ok: false, reason: 'destination_is_descendant' };
  }
  return { ok: true };
}

// note: linha own_flashcards (precisa de owner_id/language_app_key).
function canMoveOwnNote(note, destination){
  return canPlaceOwnNoteInDeck(note, destination);
}

// note: linha teacher_flashcards (precisa de teacher_id/student_id/
// language_app_key). Regra 2.7: "Aluno não pode mover Notes de Teacher
// Deck" -- não expressa aqui (este é só "o destino é válido?"), é
// responsabilidade do CHAMADOR nunca oferecer esta ação pro papel errado
// (mesma divisão de responsabilidade da RLS: teacher_flashcards_validate_deck
// já rejeita no banco se um aluno tentar, de qualquer forma).
function canMoveTeacherNote(note, destination){
  return canPlaceTeacherNoteInDeck(note, destination);
}

// ============================================================
// 3) ESCOPO DE ESTUDO
// ============================================================
// "Deck selecionado + todos os seus descendentes" (seção 6 do prompt-
// mestre) -- nunca só o Deck, nunca a conta inteira. `cards` já vem no
// shape de STATE.cards (fr/zh app.js), com `card.deckId` populado por
// buildEngineCardsFromRow() (shared/flashcard-model.js, Fase C) --
// cartões de trilha (origin:'study') nunca têm deckId real (Course Deck
// não é migrado nesta fase, regra 2.4/3.8), então nunca entram em nenhum
// escopo de Deck.
//
// Esta função NÃO reimplementa isCardLessonCompleted()/elegibilidade de
// revisão (isso é regra de app.js, não de Deck) -- espera que o CHAMADOR
// já tenha passado um pool elegível (ex.: eligibleReviewPool()) quando o
// uso for popular uma sessão de estudo real. Passar STATE.cards cru
// também funciona (útil pra telas administrativas que precisam ver TUDO,
// arquivado incluso) -- a função em si só filtra por Deck.
function getStudyScopeForDeck(decks, deckId, cards){
  const subtreeIds = new Set(getDeckSubtreeIds(decks, deckId));
  return cards.filter(c => c.deckId != null && subtreeIds.has(c.deckId));
}

// ============================================================
// 4) NOTE -> CARDINSTANCE
// ============================================================
// Delega 100% a buildEngineCardsFromRow() (shared/flashcard-model.js,
// já existente desde a Fase 4b/5/6B) -- NUNCA reimplementa a contagem de
// CardInstances por Card Type (Normal=1, normal_reversed=2, Cloze=N
// marcas, MC=1, Type Answer=1). `appKey` usa o próprio
// `row.language_app_key` da linha (sempre presente em own_flashcards/
// teacher_flashcards, e é exatamente o valor que APP_KEY representaria
// pra essa linha) -- `origin`/`idPrefix` não afetam CARDINALIDADE (só id/
// unitTitle do card resultante), valores neutros bastam.
//
// Legacy (sem fields/card_generation_mode): interpretNoteFromRow() já
// cai no ramo legado, que sempre produziu exatamente 1 CardInstance por
// linha (nenhum formato legado -- Normal/MC/Cloze de 1 marca -- jamais
// gerou mais de 1) -- resultado correto sem nenhum caso especial aqui,
// nenhuma "invenção" de CardInstance pra Legacy (regra 17 do prompt-
// mestre).
function generatedCardInstanceCount(row){
  return buildEngineCardsFromRow(row, {
    origin: 'self', appKey: row.language_app_key, idPrefix: 'x',
  }).length;
}

// ============================================================
// 5/6) CONTAGENS -- New / Learning / Review + agregador de Deck
// ============================================================
//
// Achado da auditoria (Fase A/C), documentado aqui em vez de escondido:
// `card.state` neste app SÓ assume 'new'/'review' pela via real de jogo
// (applyMemoryGrade -> scheduleReview, shared/fsrs.js) -- 'learning' e
// 'relearning' são valores que scheduleReview() sabe produzir, mas
// applyMemoryGrade() (o ÚNICO funil que os 4 pontos de entrada de
// verdade usam) nunca invoca scheduleReview() com o grade que os
// produziria: "Errei" (sm2Grade 0) tem um ramo PRÓPRIO que reseta
// state='new' direto (nunca chega a virar 'relearning'), e todo grade
// não-Errei sempre mapeia pra fsrsGrade>=2 (nunca 1), então o ramo
// `isNew && grade===1 -> 'learning'` de scheduleReview() nunca dispara
// por essa via também. Os 2 valores SÓ aparecem hoje via
// migrateCardToFSRS() (bridge de migração SM2->FSRS, um cartão antigo
// com lapses>0 e interval<3 pode nascer com state='relearning') -- um
// estado que persiste até a PRÓXIMA revisão daquele cartão (que sempre
// sobrescreve state via applyMemoryGrade/scheduleReview de novo).
//
// Decisão pro bucket "Learning" (pedida explicitamente pela seção 8):
// 'learning' E 'relearning' contam como Learning -- os dois representam
// "ainda não é uma revisão madura/consolidada", mesmo espírito da
// arquitetura consolidada (3 buckets conceituais, relearning é uma
// sub-fase de aprendizagem, não uma revisão "normal"). Nenhuma mudança no
// motor FSRS -- só uma classificação de leitura sobre o state já existente.
function bucketCardState(card){
  const state = card.state || 'new';
  if (state === 'learning' || state === 'relearning') return 'learning';
  if (state === 'review') return 'review';
  return 'new';
}

// "New": CardInstance que o motor considera novo AGORA -- inclui tanto o
// nunca-estudado quanto um cartão reiniciado via "Errei" (que
// applyMemoryGrade também leva de volta a state='new', de propósito, ver
// CLAUDE.md/shared/fsrs.js). Decisão explícita: usa `card.state`, NÃO a
// heurística reps===0&&due===0 de newCards() (shared/srs.js) -- essa
// outra função responde uma pergunta DIFERENTE ("nunca tentado, pra
// limitar quantos cartões novos entram por dia"), não "o que o motor
// classifica como novo agora" (seção 8: "Use o estado real existente").
// Sem filtro de due aqui -- New/Learning são sobre CLASSIFICAÇÃO de
// estado, só Review precisa da distinção estado x disponibilidade
// (seção 8, "Separe ESTADO de DISPONIBILIDADE").
function countNewCards(cards){
  return cards.filter(c => bucketCardState(c) === 'new').length;
}

function countLearningCards(cards){
  return cards.filter(c => bucketCardState(c) === 'learning').length;
}

// "Review": cards em estado review E devidos AGORA (disponibilidade, não
// só estado) -- reaproveita cardsDueNow() (shared/srs.js, já existente),
// nunca reimplementa a comparação de due.
function countReviewCards(cards){
  const dueNow = typeof cardsDueNow === 'function' ? cardsDueNow(cards) : cards.filter(c => c.due <= Date.now());
  return dueNow.filter(c => bucketCardState(c) === 'review').length;
}

// Agregador central -- pega TODOS os descendentes do Deck (C3), conta os
// 3 buckets sobre esse subtree inteiro. Mesmo critério de "cards já
// elegíveis passados pelo chamador" de getStudyScopeForDeck() -- este
// agregador nunca reimplementa isCardLessonCompleted().
function getDeckCounts(decks, deckId, cards){
  const scoped = getStudyScopeForDeck(decks, deckId, cards);
  return {
    new: countNewCards(scoped),
    learning: countLearningCards(scoped),
    review: countReviewCards(scoped),
  };
}

// ============================================================
// 8) MOVIMENTAÇÃO DE NOTE -- só domínio (validação), I/O em
// shared/deck-data.js
// ============================================================
// table: 'own' | 'teacher' -- decide qual checagem de destino usar.
// A "operação" em si (seção 11) é sempre `note.deck_id = destination.id`,
// nunca toca CardInstance/FSRS/IDs/revision/Fields/Tags -- o chamador
// (deck-data.js) só faz isso DEPOIS de validateNoteMove() devolver ok:true.
function validateNoteMove({ note, destination, decks, table }){
  if (!note || !destination || !decks) return { ok: false, reason: 'missing_data' };
  if (table === 'own') return canMoveOwnNote(note, destination);
  if (table === 'teacher') return canMoveTeacherNote(note, destination);
  return { ok: false, reason: 'unknown_table' };
}

// ============================================================
// 9) MOVIMENTAÇÃO DE DECK -- só domínio
// ============================================================
function validateDeckMove({ deck, destination, decks }){
  if (!deck || !destination || !decks) return { ok: false, reason: 'missing_data' };
  return canMoveDeck(decks, deck, destination);
}

// ============================================================
// 10) DELETE -- só identificação/validação, NENHUMA função de I/O de
// delete é criada nesta fase (seção 13: "não adicionar botão de delete,
// não criar UX", fluxo destrutivo completo fica pra fase futura que
// decidir mover-subtree-vs-apagar-permanente).
// ============================================================
function isDeckDeletableKind(deck){
  return !!deck && deck.kind === 'personal';
}

// hasChildren/hasNotes: booleans que o CHAMADOR já levantou (via
// getDeckChildren()/uma consulta de Notes por deck_id) -- este domínio
// não faz I/O, só decide se o estado informado permite deletar.
function validateDeckDeletion({ deck, hasChildren, hasNotes }){
  if (!isDeckDeletableKind(deck)){
    return { ok: false, reason: 'not_deletable_kind' };
  }
  if (hasChildren){
    return { ok: false, reason: 'has_children' };
  }
  if (hasNotes){
    return { ok: false, reason: 'has_notes' };
  }
  return { ok: true };
}

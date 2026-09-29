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
  // Fase G -- Teacher Deck só se move DENTRO da própria árvore (mesma
  // aluna/professora/idioma); regras próprias em canMoveTeacherDeck().
  if (deck.kind === 'teacher') return canMoveTeacherDeck(decks, deck, destination);
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

// ---------- Fase F -- limite Free/Premium por CardInstance (UMA regra só) ----------
//
// O teto de cartões próprios (Fase 5.1) contava LINHAS (Notes); a
// arquitetura pede CardInstances (Normal=1, Normal com reverso=2, Cloze
// com N lacunas=N). Este é o ÚNICO ponto que implementa essa regra --
// criação manual, import de arquivo/link, import Anki e import de perfil
// público chamam estas funções, nunca contam `.length` por conta própria.
// Reaproveita generatedCardInstanceCount() (que delega ao motor real,
// buildEngineCardsFromRow) -- nenhuma cardinalidade por Card Type é
// reimplementada aqui. Preflight puro: nada é gravado; como a contagem
// "usada" vem só de linhas JÁ persistidas, uma criação que falha nunca
// consome limite.

// Nunca lança: linha malformada conta 1 (mesma cardinalidade de uma linha
// Legacy) em vez de derrubar a tela.
function cardInstanceCountForRow(row){
  try {
    const n = generatedCardInstanceCount(row);
    return n > 0 ? n : 1;
  } catch (e){
    return 1;
  }
}

// Só linhas ativas consomem limite (arquivar nunca reduz nem aumenta o
// teto -- mesma regra da CONSOLIDAÇÃO-3).
function ownCardInstanceUsage(rows){
  return (rows || [])
    .filter(r => r && r.status === 'active')
    .reduce((sum, r) => sum + cardInstanceCountForRow(r), 0);
}

// Quantos CardInstances um Note editor state (ainda não salvo) vai gerar.
function cardInstanceCountForEditorState(editorState, languageAppKey){
  const row = noteEditorStateToRow(editorState);
  return cardInstanceCountForRow(Object.assign({}, row, {
    id: 0, language_app_key: languageAppKey, status: 'active',
  }));
}

// Preflight único. `editorStates`: os Notes que a operação vai criar.
// `limit`: teto do plano grátis (FREE_OWN_FLASHCARD_LIMIT, passado pelo
// chamador -- a constante vive em shared/my-flashcards.js).
function preflightOwnCardInstanceCreation({ activeRows, hasTeacherLink, editorStates, languageAppKey, limit }){
  const used = ownCardInstanceUsage(activeRows);
  const requested = (editorStates || []).reduce((sum, st) => sum + cardInstanceCountForEditorState(st, languageAppKey), 0);
  if (hasTeacherLink) return { ok: true, used, requested, remaining: Infinity };
  const remaining = Math.max(0, limit - used);
  return { ok: requested <= remaining, used, requested, remaining };
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
  // Fase G: 'teacher' (subdeck de professora) segue a MESMA regra dos
  // pessoais (só vazio: sem filhos e sem Notes). teacher_root nunca.
  return !!deck && (deck.kind === 'personal' || deck.kind === 'teacher');
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

// ============================================================
// 11) COURSE DECKS (Fase E -- Study Trail <-> Course Decks)
// ============================================================
// Domínio PURO (sem I/O, sem STATE) que liga a identidade PEDAGÓGICA de uma
// Unit (`unitId`, content.js -- string em fr "A1-1", number em zh 1) ao
// Course Deck correspondente (`decks.id`, bigint). NUNCA `unitId === deckId`:
// a chave de busca é (language_app_key, course_unit_id) e `course_unit_id`
// é sempre String(unitId) (migration 051). Deck organiza, nunca define
// conteúdo/direção/elegibilidade -- lesson completion continua sendo regra
// pedagógica do app (isCardLessonCompleted), não deste arquivo.

// Units que de fato viram Course Deck: as MESMAS que buildCardsFromUnits()
// (fr/zh app.js) transforma em cards -- unidades type:'grammar' (fr) e
// unidades sem vocabulário nunca geram card, então nunca ganham Deck.
// Devolve o payload exato que ensure_course_decks(p_units) espera.
function courseUnitsForDecks(units){
  return (units || [])
    .filter(u => u && u.type !== 'grammar' && Array.isArray(u.vocab) && u.vocab.length > 0)
    .map(u => ({ unit_id: String(u.id), title: u.title }));
}

function isCourseDeck(deck){
  return !!deck && deck.kind === 'course';
}

// Índice {rootId, byUnitId: Map<String(unitId), deck.id>} sobre os Decks já
// carregados. Só considera kind='course' do idioma pedido -- ignora
// qualquer outro kind por construção (nunca vaza Deck pessoal/de
// professora pro mapeamento de trilha).
function buildCourseDeckIndex(decks, languageAppKey){
  const byUnitId = new Map();
  let rootId = null;
  (decks || []).forEach(d => {
    if (!isCourseDeck(d) || d.language_app_key !== languageAppKey) return;
    if (d.course_unit_id == null) rootId = d.id;
    else byUnitId.set(String(d.course_unit_id), d.id);
  });
  return { rootId, byUnitId };
}

// Determinístico: mesma Unit -> mesmo deckId; Unit sem Course Deck -> null
// (Study Trail continua funcionando sem deckId, ver Fase E no CLAUDE.md).
function courseDeckIdForUnit(index, unitId){
  if (!index || unitId == null) return null;
  const id = index.byUnitId.get(String(unitId));
  return id != null ? id : null;
}

// Atribui `deckId` SÓ aos cards de trilha (origin 'study'), a partir do
// `unitId`. Não toca em NENHUM outro campo (id/unitId/FSRS/estado/vocabIdx)
// -- só `deckId`. Idempotente. Cards nativos (teacher/self) trazem deck_id
// da própria linha e nunca passam por aqui. Devolve quantos cards ficaram
// com deckId != null.
function assignCourseDeckIds(cards, index){
  let assigned = 0;
  (cards || []).forEach(c => {
    if (!c || c.origin !== 'study') return;
    c.deckId = courseDeckIdForUnit(index, c.unitId);
    if (c.deckId != null) assigned++;
  });
  return assigned;
}

// ============================================================
// 12) TEACHER DECKS (Fase G -- cartões da professora integrados ao Deck Engine)
// ============================================================
// Domínio PURO. Teacher Deck é propriedade do RELACIONAMENTO
// professora->aluno->idioma (owner_id = aluno, teacher_id = professora),
// nunca um agrupamento visual. Mesma árvore de `decks` -- sem estrutura
// paralela. Regras de banco (trigger decks_validate_hierarchy, RLS,
// teacher_flashcards_validate_deck) continuam sendo a autoridade final;
// aqui só se evita mandar ao banco o que o domínio já sabe que ele recusa.

// Decks da árvore que `teacherId` controla para `studentId`+idioma
// (teacher_root + subdecks). Nunca inclui Deck pessoal/curso/de outra
// professora/de outro aluno.
function getTeacherDecksForStudent(decks, { teacherId, studentId, languageAppKey }){
  return (decks || []).filter(d =>
    (d.kind === 'teacher_root' || d.kind === 'teacher') &&
    d.owner_id === studentId && d.teacher_id === teacherId &&
    d.language_app_key === languageAppKey);
}

// teacher_root = destino PADRÃO de um cartão novo (nenhuma categoria nova).
function getTeacherRootDeck(decks, { teacherId, studentId, languageAppKey }){
  return getTeacherDecksForStudent(decks, { teacherId, studentId, languageAppKey })
    .find(d => d.kind === 'teacher_root') || null;
}

// Árvore ordenada (pai antes dos filhos) com profundidade -- pra <select>
// indentado e lista do aluno. `depth` 0 = teacher_root.
function orderedTeacherDecks(decks, treeDecks){
  const list = treeDecks || [];
  const out = [];
  const walk = (parentId, depth) => {
    list.filter(d => (d.parent_deck_id == null ? null : d.parent_deck_id) === parentId)
      .sort((a, b) => a.id - b.id)
      .forEach(d => { out.push({ deck: d, depth }); walk(d.id, depth + 1); });
  };
  const roots = list.filter(d => d.kind === 'teacher_root');
  roots.forEach(r => { out.push({ deck: r, depth: 0 }); walk(r.id, 1); });
  return out;
}

// Criar subdeck: pai precisa ser teacher_root/teacher DA PRÓPRIA professora.
function canCreateTeacherSubdeck(parent, { teacherId }){
  if (!parent) return { ok: false, reason: 'missing_data' };
  if (!['teacher_root', 'teacher'].includes(parent.kind)) return { ok: false, reason: 'wrong_parent_kind' };
  if (parent.teacher_id !== teacherId) return { ok: false, reason: 'wrong_teacher' };
  return { ok: true };
}

// Mover Teacher Deck: só kind='teacher' (teacher_root nunca move -- é
// tratado em canMoveDeck via not_movable_kind), destino teacher_root/teacher
// da MESMA aluna+professora+idioma, nunca ele mesmo nem um descendente
// (ciclo). Nunca muda aluno/professora/idioma (só troca o pai).
function canMoveTeacherDeck(decks, deck, destination){
  if (!deck || !destination) return { ok: false, reason: 'missing_data' };
  if (deck.kind !== 'teacher') return { ok: false, reason: 'not_movable_kind' };
  if (destination.id === deck.id) return { ok: false, reason: 'same_deck' };
  if (!['teacher_root', 'teacher'].includes(destination.kind)) return { ok: false, reason: 'destination_wrong_kind' };
  if (destination.owner_id !== deck.owner_id) return { ok: false, reason: 'different_student' };
  if (destination.teacher_id !== deck.teacher_id) return { ok: false, reason: 'different_teacher' };
  if (destination.language_app_key !== deck.language_app_key) return { ok: false, reason: 'different_language' };
  if (isDescendantOf(decks, destination.id, deck.id)) return { ok: false, reason: 'destination_is_descendant' };
  return { ok: true };
}

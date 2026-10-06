// ---------- Fase C do prompt-mestre "Decks, Tags e Painel" -- camada de
// I/O do Deck Engine (ver CLAUDE.md, "Fase A/Fase B/Fase C") ----------
//
// Único arquivo que fala com o Supabase sobre `decks`/`deck_id` -- tudo
// aqui é fino: valida via shared/deck-engine.js (domínio puro, sem I/O)
// ANTES de qualquer INSERT/UPDATE, e nunca reimplementa a lógica de
// árvore/permissão que já mora lá. Mesmo padrão de toda outra camada de
// dado deste app (shared/own-flashcards.js/shared/teacher-flashcards.js):
// funções pequenas, 1 responsabilidade cada, sem nenhuma UI aqui dentro.
//
// Depende de:
//   - shared/supabase-client.js (supabaseClient)
//   - shared/auth.js            (CURRENT_USER)
//   - shared/deck-engine.js     (getDeckById/validateNoteMove/validateDeckMove)
//
// Atomicidade (seção 11 do prompt-mestre): cada operação de movimentação
// é 1 único UPDATE de 1 linha -- já atômico por natureza do protocolo
// Postgres (nenhum wrapper de transação precisa ser escrito aqui). Se o
// UPDATE falhar, a linha no banco continua exatamente como estava --
// nunca um estado intermediário.

// Todos os Decks de um idioma que a conta logada pode enxergar -- RLS
// (decks_owner_select/decks_teacher_select, migration 049) já resolve a
// união "dono da árvore OU professora que controla" numa única query
// (policies permissivas combinam com OR no Postgres) -- nunca 2
// consultas separadas.
async function fetchDecksForLanguage(languageAppKey){
  if (!CURRENT_USER) return [];
  const { data, error } = await supabaseClient
    .from('decks')
    .select('*')
    .eq('language_app_key', languageAppKey)
    .order('created_at', { ascending: true });
  if (error){ console.error('Erro ao carregar Decks:', error); return []; }
  return data || [];
}

// C11 -- Bootstrap. Wrapper fino sobre a RPC ensure_user_decks() (Fase B,
// migration 049, já idempotente/SECURITY DEFINER/autorizada internamente
// -- nunca reimplementada aqui). Só root+personal_root, mesmo escopo já
// travado na migration -- teacher_root fica pra uma fase futura que
// decidir o gatilho certo (ex.: no momento em que um vínculo
// teacher_students é criado), nunca disparado automaticamente daqui.
//
// Estratégia ÚNICA de quando chamar (evita a "criação duplicada" que o
// prompt-mestre proíbe explicitamente): o CHAMADOR (fr/zh app.js, no
// boot, antes de popular STATE.cards com deckId) chama isto 1x por
// idioma carregado -- nunca em paralelo pro mesmo idioma, nunca em
// resposta a cada re-render de UI. A idempotência da RPC (índice único
// parcial + releitura em caso de corrida, já testada na Fase B) cobre o
// resto -- chamar de novo nunca duplica nada, só devolve os mesmos ids.
async function ensureDecksForCurrentUser(languageAppKey){
  if (!CURRENT_USER) return { ok: false, error: 'Entre com sua conta.' };
  const { data, error } = await supabaseClient.rpc('ensure_user_decks', {
    p_owner_id: CURRENT_USER.id,
    p_language_app_key: languageAppKey,
  });
  if (error){ console.error('Erro ao inicializar Decks:', error); return { ok: false, error: 'Não foi possível preparar seus Decks agora.' }; }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || row.root_deck_id == null || row.personal_root_deck_id == null){
    return { ok: false, error: 'Não foi possível preparar seus Decks agora.' };
  }
  return { ok: true, rootDeckId: row.root_deck_id, personalRootDeckId: row.personal_root_deck_id };
}

// Fase F -- resolve o Deck de destino de uma criação PESSOAL. Única porta
// de entrada de "onde vai este cartão novo": criação manual, import de
// arquivo/link, import Anki e import de perfil público passam todos por
// aqui, nunca gravam sem destino. `deckId` ausente = Deck padrão =
// personal_root ("Meus Decks", Deck REAL criado por ensure_user_decks,
// aceito como destino de Note pelo trigger own_flashcards_validate_deck).
// Validação client-side via canPlaceOwnNoteInDeck (shared/deck-engine.js,
// nenhuma regra replicada aqui); RLS/trigger do banco continuam sendo a
// autoridade final. `decks` opcional: chamadores em lote (import) já têm a
// lista e evitam um round-trip por cartão.
async function resolveOwnCreationDeck({ languageAppKey, deckId, decks }){
  if (!CURRENT_USER) return { ok: false, error: 'Entre com sua conta.' };
  const boot = await ensureDecksForCurrentUser(languageAppKey);
  if (!boot.ok) return { ok: false, error: boot.error };
  const targetId = (deckId != null) ? deckId : boot.personalRootDeckId;
  const list = decks && decks.length ? decks : await fetchDecksForLanguage(languageAppKey);
  const deck = getDeckById(list, targetId);
  const check = canPlaceOwnNoteInDeck({ owner_id: CURRENT_USER.id, language_app_key: languageAppKey }, deck);
  if (!check.ok) return { ok: false, error: 'Escolha um Deck pessoal válido como destino.', reason: check.reason };
  return { ok: true, deckId: deck.id, decks: list };
}

// Criação de subdeck pessoal -- domínio necessário pra C9 (reorganizar
// subdecks pessoais) ter algo pra criar/mover; nenhuma UI é construída
// nesta fase pra chamar isto (seção 20, "não implementar Deck UI"), mas
// a camada de dado precisa existir pros testes de movimentação (seção 18)
// e pra uma fase futura (D+) poder ligar um botão real sem reescrever
// esta função. Validação de destino via getDeckById/kind aqui mesmo
// (mesmo critério de canPlaceOwnNoteInDeck, mas pra outro Deck no lugar
// de uma Note) -- nunca confia só na RLS/trigger do banco.
async function createPersonalDeck({ name, parentDeckId, languageAppKey, decks }){
  if (!CURRENT_USER) return { ok: false, error: 'Entre com sua conta.' };
  const parent = getDeckById(decks, parentDeckId);
  if (!parent) return { ok: false, error: 'Deck pai não encontrado.' };
  if (!['personal_root', 'personal'].includes(parent.kind)){
    return { ok: false, error: 'Só é possível criar um Deck dentro de "Meus Decks" ou de outro Deck pessoal.' };
  }
  if (parent.owner_id !== CURRENT_USER.id || parent.language_app_key !== languageAppKey){
    return { ok: false, error: 'Deck pai inválido.' };
  }
  const cleanName = (name || '').trim();
  if (!cleanName) return { ok: false, error: 'Digite um nome pro Deck.' };
  const { data, error } = await supabaseClient.from('decks').insert({
    owner_id: CURRENT_USER.id,
    teacher_id: null,
    parent_deck_id: parentDeckId,
    kind: 'personal',
    name: cleanName,
    language_app_key: languageAppKey,
  }).select().single();
  if (error){ console.error('Erro ao criar Deck:', error); return { ok: false, error: 'Não foi possível criar o Deck agora.' }; }
  return { ok: true, deck: data };
}

async function renamePersonalDeck(deckId, newName){
  if (!CURRENT_USER) return { ok: false, error: 'Entre com sua conta.' };
  const cleanName = (newName || '').trim();
  if (!cleanName) return { ok: false, error: 'Digite um nome pro Deck.' };
  const { error } = await supabaseClient.from('decks')
    .update({ name: cleanName })
    .eq('id', deckId).eq('owner_id', CURRENT_USER.id).eq('kind', 'personal');
  if (error){ console.error('Erro ao renomear Deck:', error); return { ok: false, error: 'Não foi possível renomear o Deck agora.' }; }
  return { ok: true };
}

// C8 -- Movimentação de Note própria. `note` é a linha own_flashcards
// (precisa de id/owner_id/language_app_key); `destination` é a linha de
// `decks` de destino. Valida via validateNoteMove() (shared/deck-engine.js,
// domínio puro) ANTES de qualquer chamada de rede -- nunca envia um
// UPDATE que o próprio domínio já sabe que a RLS/trigger vai rejeitar.
// A operação em si é SÓ `deck_id = destination.id` -- nunca toca
// CardInstance/FSRS/id/revision/Fields/Tags (regra explícita do
// prompt-mestre, seção 11 -- "Não fazer").
async function setOwnFlashcardDeck({ note, destination, decks }){
  if (!CURRENT_USER) return { ok: false, error: 'Entre com sua conta.' };
  const validation = validateNoteMove({ note, destination, decks, table: 'own' });
  if (!validation.ok) return validation;
  const { error } = await supabaseClient.from('own_flashcards')
    .update({ deck_id: destination.id })
    .eq('id', note.id).eq('owner_id', CURRENT_USER.id);
  if (error){ console.error('Erro ao mover cartão de Deck:', error); return { ok: false, error: 'Não foi possível mover o cartão agora.' }; }
  return { ok: true };
}

// C8 -- mesma operação pro lado da professora. `note` é a linha
// teacher_flashcards (precisa de id/teacher_id/student_id/
// language_app_key). Regra 2.7 (aluno não pode mover Note de Teacher
// Deck) não precisa de checagem aqui -- só quem tem RLS de escrita em
// teacher_flashcards (hoje só a admin/professora, decks_admin_write)
// consegue completar este UPDATE de qualquer forma; um aluno que tentasse
// chamar isto seria barrado pela RLS da própria tabela, mesma fronteira
// de sempre.
async function setTeacherFlashcardDeck({ note, destination, decks }){
  if (!CURRENT_USER) return { ok: false, error: 'Entre com sua conta.' };
  // Fase H -- só a PRÓPRIA professora move a Note (Note-level: um único
  // UPDATE de deck_id; CardInstances irmãos andam juntos, nada mais muda).
  if (!note || note.teacher_id !== CURRENT_USER.id) return { ok: false, error: 'Cartão inválido.', reason: 'wrong_teacher' };
  const validation = validateNoteMove({ note, destination, decks, table: 'teacher' });
  if (!validation.ok) return validation;
  const { error } = await supabaseClient.from('teacher_flashcards')
    .update({ deck_id: destination.id })
    .eq('id', note.id).eq('teacher_id', CURRENT_USER.id);
  if (error){ console.error('Erro ao mover cartão de Deck:', error); return { ok: false, error: 'Não foi possível mover o cartão agora.' }; }
  return { ok: true };
}

// C9 -- movimentação de Deck pessoal. Valida via validateDeckMove()
// (shared/deck-engine.js) -- rejeita root/personal_root/course/
// teacher_root/teacher, self, descendente, dono/idioma diferente (lista
// completa de "não permitir" da seção 12), ANTES de qualquer chamada de
// rede. A operação em si é só `parent_deck_id = destination.id` -- nunca
// toca nenhuma Note/CardInstance/FSRS (elas continuam apontando pro
// MESMO deck_id de sempre; é o Deck que muda de posição na árvore, os
// filhos -- Notes e subdecks -- vêm juntos "de graça" porque a
// associação é por deck_id/parent_deck_id, nunca duplicada).
async function moveDeck({ deck, destination, decks }){
  if (!CURRENT_USER) return { ok: false, error: 'Entre com sua conta.' };
  const validation = validateDeckMove({ deck, destination, decks });
  if (!validation.ok) return validation;
  const { error } = await supabaseClient.from('decks')
    .update({ parent_deck_id: destination.id })
    .eq('id', deck.id).eq('owner_id', CURRENT_USER.id).eq('kind', 'personal');
  if (error){ console.error('Erro ao mover Deck:', error); return { ok: false, error: 'Não foi possível mover o Deck agora.' }; }
  return { ok: true };
}

// ---------- Fase E -- Course Decks (Study Trail) ----------
//
// Leitura dos Course Decks de um idioma. NÃO exige sessão: a policy
// decks_course_select (migration 051) libera SELECT de kind='course' a
// qualquer papel, inclusive convidado (conteúdo do sistema, sem dado
// sensível). O filtro por kind aqui é redundante com a RLS de propósito --
// deixa explícito que esta função nunca lê Deck pessoal/de professora.
async function fetchCourseDecksForLanguage(languageAppKey){
  const { data, error } = await supabaseClient
    .from('decks')
    .select('*')
    .eq('kind', 'course')
    .eq('language_app_key', languageAppKey)
    .order('id', { ascending: true });
  if (error){ console.error('Erro ao carregar Course Decks:', error); return []; }
  return data || [];
}

// Bootstrap idempotente dos Course Decks. SÓ conta autenticada real -- a
// RPC é concedida apenas a `authenticated` (migration 051); convidado nunca
// chama isto (nem tenta: sem sessão o GRANT recusaria). `units` é a lista
// REAL de UNITS do content.js do idioma; courseUnitsForDecks() (deck-engine)
// filtra só as que geram cards. Nunca apaga Deck de Unit que sumiu.
async function ensureCourseDecksForCurrentUser(languageAppKey, units){
  if (!CURRENT_USER) return { ok: false, error: 'Entre com sua conta.' };
  const payload = courseUnitsForDecks(units);
  const { data, error } = await supabaseClient.rpc('ensure_course_decks', {
    p_language_app_key: languageAppKey,
    p_units: payload,
  });
  if (error){ console.error('Erro ao preparar Course Decks:', error); return { ok: false, error: 'Não foi possível preparar os Decks do curso agora.' }; }
  return { ok: true, decks: data || [] };
}

// ---------- Fase G -- Teacher Decks (cartões da professora) ----------
//
// Camada de I/O fina sobre shared/deck-engine.js (regras) e a migration 053
// (ensure_teacher_decks). Nenhuma regra de árvore é replicada aqui; o banco
// (RLS + triggers decks_validate_hierarchy/teacher_flashcards_validate_deck)
// continua sendo a autoridade final. Sempre a professora LOGADA
// (CURRENT_USER.id) -- teacher_id nunca vem de parâmetro.

// Bootstrap lazy do teacher_root de 1 aluno+idioma (idempotente; exige
// vínculo ativo -- checado DENTRO da RPC). Nunca chamado no boot do app:
// só quando a professora seleciona o aluno no formulário de cartão.
async function ensureTeacherDecksForStudent(studentId, languageAppKey){
  if (!CURRENT_USER) return { ok: false, error: 'Entre com sua conta.' };
  const { data, error } = await supabaseClient.rpc('ensure_teacher_decks', {
    p_student_id: studentId,
    p_language_app_key: languageAppKey,
  });
  if (error){ console.error('Erro ao preparar Decks da professora:', error); return { ok: false, error: 'Não foi possível preparar os Decks deste aluno agora.' }; }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || row.teacher_root_deck_id == null){
    return { ok: false, error: 'Não foi possível preparar os Decks deste aluno agora.' };
  }
  return { ok: true, rootDeckId: row.root_deck_id, teacherRootDeckId: row.teacher_root_deck_id };
}

// Destino de UM cartão novo para UM aluno. `deckId` ausente = teacher_root
// daquele aluno (padrão). Cada aluno resolve o SEU destino -- falha aqui
// nunca cai no Deck de outro aluno. `decks` opcional (lista já carregada).
async function resolveTeacherCreationDeck({ studentId, languageAppKey, deckId, decks }){
  if (!CURRENT_USER) return { ok: false, error: 'Entre com sua conta.' };
  const boot = await ensureTeacherDecksForStudent(studentId, languageAppKey);
  if (!boot.ok) return { ok: false, error: boot.error };
  const targetId = (deckId != null) ? deckId : boot.teacherRootDeckId;
  let list = decks && decks.length ? decks : null;
  if (!list || !getDeckById(list, targetId)) list = await fetchDecksForLanguage(languageAppKey);
  const deck = getDeckById(list, targetId);
  const check = canPlaceTeacherNoteInDeck(
    { teacher_id: CURRENT_USER.id, student_id: studentId, language_app_key: languageAppKey }, deck);
  if (!check.ok) return { ok: false, error: 'Escolha um Deck válido da árvore deste aluno como destino.', reason: check.reason };
  return { ok: true, deckId: deck.id, decks: list };
}

async function createTeacherDeck({ name, parentDeck, decks }){
  if (!CURRENT_USER) return { ok: false, error: 'Entre com sua conta.' };
  const check = canCreateTeacherSubdeck(parentDeck, { teacherId: CURRENT_USER.id });
  if (!check.ok) return { ok: false, error: 'Só é possível criar um Deck dentro da árvore deste aluno.', reason: check.reason };
  const cleanName = (name || '').trim();
  if (!cleanName) return { ok: false, error: 'Digite um nome pro Deck.' };
  if (cleanName.length > 60) return { ok: false, error: 'O nome do Deck pode ter no máximo 60 caracteres.' };
  const { data, error } = await supabaseClient.from('decks').insert({
    owner_id: parentDeck.owner_id,
    teacher_id: CURRENT_USER.id,
    parent_deck_id: parentDeck.id,
    kind: 'teacher',
    name: cleanName,
    language_app_key: parentDeck.language_app_key,
  }).select().single();
  if (error){ console.error('Erro ao criar Deck da professora:', error); return { ok: false, error: 'Não foi possível criar o Deck agora.' }; }
  return { ok: true, deck: data };
}

// Mover Teacher Deck dentro da própria árvore (só troca o pai).
async function moveTeacherDeck({ deck, destination, decks }){
  if (!CURRENT_USER) return { ok: false, error: 'Entre com sua conta.' };
  if (!deck || deck.teacher_id !== CURRENT_USER.id) return { ok: false, error: 'Deck inválido.', reason: 'wrong_teacher' };
  const validation = validateDeckMove({ deck, destination, decks });
  if (!validation.ok) return validation;
  const { error } = await supabaseClient.from('decks')
    .update({ parent_deck_id: destination.id })
    .eq('id', deck.id).eq('teacher_id', CURRENT_USER.id).eq('kind', 'teacher');
  if (error){ console.error('Erro ao mover Deck da professora:', error); return { ok: false, error: 'Não foi possível mover o Deck agora.' }; }
  return { ok: true };
}

// Excluir Teacher Deck: só subdeck vazio (sem filhos e sem Notes) -- mesma
// regra dos pessoais (validateDeckDeletion). Notes têm `on delete set null`,
// então NUNCA confiar só no banco: checa antes.
async function deleteTeacherDeck({ deck, decks }){
  if (!CURRENT_USER) return { ok: false, error: 'Entre com sua conta.' };
  if (!deck || deck.teacher_id !== CURRENT_USER.id) return { ok: false, error: 'Deck inválido.', reason: 'wrong_teacher' };
  const hasChildren = getDeckChildren(decks, deck.id).length > 0;
  const { count, error: cErr } = await supabaseClient.from('teacher_flashcards')
    .select('id', { count: 'exact', head: true }).eq('deck_id', deck.id);
  if (cErr){ console.error('Erro ao checar cartões do Deck:', cErr); return { ok: false, error: 'Não foi possível verificar o Deck agora.' }; }
  const validation = validateDeckDeletion({ deck, hasChildren, hasNotes: (count || 0) > 0 });
  if (!validation.ok){
    const msgs = {
      has_children: 'Este Deck tem subdecks. Esvazie-o (mova ou apague os subdecks) antes de apagar.',
      has_notes: 'Este Deck tem cartões. Mova os cartões para outro Deck antes de apagar.',
      not_deletable_kind: 'Este Deck não pode ser apagado.',
    };
    return Object.assign({ error: msgs[validation.reason] || 'Este Deck não pode ser apagado.' }, validation);
  }
  // A checagem acima é só UX: o trigger da migration 054 (e 055) é a
  // autoridade final e recusa o DELETE mesmo que o cliente erre.
  const { error } = await supabaseClient.from('decks').delete()
    .eq('id', deck.id).eq('teacher_id', CURRENT_USER.id).eq('kind', 'teacher');
  if (error){ console.error('Erro ao apagar Deck da professora:', error); return { ok: false, error: 'Não foi possível apagar o Deck agora.' }; }
  return { ok: true };
}

// ---------- Excluir Deck pessoal (doc de arquitetura, seção 5.4) ----------
//
// Considera a subárvore inteira. mode 'move': todas as Notes próprias da
// subárvore vão para `destination` (Meus Decks ou outro Deck pessoal FORA
// da subárvore) num único UPDATE de deck_id -- os cartões irmãos andam
// juntos porque o Deck é da Note. mode 'delete': apaga as Notes da
// subárvore (histórico vai junto) num único DELETE. Depois, apaga o Deck;
// os subdecks saem pela FK on delete cascade (migration 049). Só kind
// 'personal' do próprio usuário (personal_root/raiz/curso/professora nunca).
// Se o UPDATE/DELETE das Notes falhar, o Deck NÃO é apagado. Se o Deck não
// puder ser apagado depois de mover, os cartões já estão no destino (nada
// se perde) e o erro é devolvido.
async function deletePersonalDeckTree({ deck, decks, mode, destination }){
  if (!CURRENT_USER) return { ok: false, error: 'Entre com sua conta.' };
  if (!deck || deck.kind !== 'personal' || deck.owner_id !== CURRENT_USER.id){
    return { ok: false, error: 'Só é possível excluir um Deck pessoal seu.' };
  }
  const subtree = getDeckSubtreeIds(decks, deck.id);
  let notes = 0;
  if (mode === 'move'){
    if (!destination || !['personal_root', 'personal'].includes(destination.kind)
        || destination.owner_id !== CURRENT_USER.id
        || destination.language_app_key !== deck.language_app_key
        || subtree.includes(destination.id)){
      return { ok: false, error: 'Escolha um Deck pessoal fora deste para receber os cartões.' };
    }
    const { data, error } = await supabaseClient.from('own_flashcards')
      .update({ deck_id: destination.id })
      .eq('owner_id', CURRENT_USER.id).in('deck_id', subtree)
      .select('id');
    if (error){ console.error('Erro ao mover cartões do Deck:', error); return { ok: false, error: 'Não foi possível mover os cartões agora. Nada foi excluído.' }; }
    notes = (data || []).length;
  } else if (mode === 'delete'){
    const { data, error } = await supabaseClient.from('own_flashcards')
      .delete()
      .eq('owner_id', CURRENT_USER.id).in('deck_id', subtree)
      .select('id');
    if (error){ console.error('Erro ao excluir cartões do Deck:', error); return { ok: false, error: 'Não foi possível excluir os cartões agora. Nada foi excluído.' }; }
    notes = (data || []).length;
  } else {
    return { ok: false, error: 'Operação inválida.' };
  }
  const { error: delErr } = await supabaseClient.from('decks')
    .delete()
    .eq('id', deck.id).eq('owner_id', CURRENT_USER.id).eq('kind', 'personal');
  if (delErr){
    console.error('Erro ao excluir Deck:', delErr);
    return { ok: false, error: mode === 'move'
      ? 'Os cartões foram movidos, mas não foi possível excluir o Deck agora. Tente de novo.'
      : 'Os cartões foram excluídos, mas não foi possível excluir o Deck agora. Tente de novo.' };
  }
  return { ok: true, notes, subtree };
}

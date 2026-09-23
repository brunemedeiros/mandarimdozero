// ---------- Flashcards autorados pela PRÓPRIA aluna -- Fase 5 do sistema de
// alunas particulares (ver CLAUDE.md) ----------
// Irmão de shared/teacher-flashcards.js (mesma tabela-espelho, mesmo padrão
// de status active/archived), mas quem autora e quem é dona do cartão são a
// MESMA pessoa -- por isso a RLS de student_flashcards (migration 028) é
// "dono lê/escreve tudo", sem distinção professora/aluna.
//
// Depende de (mesma posição de shared/teacher-flashcards.js -- antes de app.js):
//   - shared/supabase-client.js (supabaseClient)
//   - shared/auth.js            (CURRENT_USER)

// Todos os cartões (ativos E arquivados) autorados pela conta LOGADA, num
// idioma específico. Inclui arquivados de propósito -- mesmo motivo de
// fetchFlashcardsForCurrentStudent (teacher-flashcards.js): STATE.cards
// precisa deles presentes pra não perder o progresso de memória já
// acumulado (ver applySerializedState/merge por id, Fase 0); só ficam de
// fora da FILA DE REVISÃO (isCardLessonCompleted checa `status` na
// origem 'self', fr/zh app.js).
async function fetchMyOwnFlashcards(languageAppKey){
  if (!CURRENT_USER) return [];
  const { data, error } = await supabaseClient
    .from('student_flashcards')
    .select('*')
    .eq('student_id', CURRENT_USER.id)
    .eq('language_app_key', languageAppKey)
    .order('created_at', { ascending: false });
  if (error){ console.error('Erro ao carregar seus flashcards:', error); return []; }
  return data || [];
}

// front/back_trans obrigatórios (mesma validação de createFlashcard em
// teacher-flashcards.js); note e frontPinyin opcionais, frontPinyin só faz
// sentido pra languageAppKey==='mandarim' (mesmo motivo da migration 027 --
// zh mostra hanzi e pinyin em campos separados no cartão de revisão).
//
// Prompt-mestre "flashcards -- 7 propostas" (ver CLAUDE.md): frontIsTargetLanguage
// -- qual lado tem o idioma estudado, decide rótulo + pronúncia automática
// (fr/zh app.js). Default `true` preserva o comportamento de todo cartão
// já existente.
function _validateOwnFlashcardContent({ front, backTrans }){
  const cleanFront = (front || '').trim();
  const cleanBack = (backTrans || '').trim();
  if (!cleanFront) return { ok: false, error: 'Digite o texto da frente do cartão.' };
  if (!cleanBack) return { ok: false, error: 'Digite a tradução (verso do cartão).' };
  return { ok: true, cleanFront, cleanBack };
}

async function createOwnFlashcard({ languageAppKey, front, backTrans, note, frontPinyin, frontIsTargetLanguage }){
  const v = _validateOwnFlashcardContent({ front, backTrans });
  if (!v.ok) return v;
  const { data, error } = await supabaseClient
    .from('student_flashcards')
    .insert({
      student_id: CURRENT_USER.id,
      language_app_key: languageAppKey,
      front: v.cleanFront,
      back_trans: v.cleanBack,
      note: (note || '').trim() || null,
      front_pinyin: (frontPinyin || '').trim() || null,
      front_is_target_language: frontIsTargetLanguage !== false,
    })
    .select()
    .single();
  if (error){ console.error('Erro ao criar seu flashcard:', error); return { ok: false, error: 'Não foi possível criar o cartão agora.' }; }
  return { ok: true, card: data };
}

async function setOwnFlashcardStatus(id, status){
  const { error } = await supabaseClient.from('student_flashcards').update({ status }).eq('id', id).eq('student_id', CURRENT_USER.id);
  return { ok: !error };
}

// Prop 4 (ver CLAUDE.md, "7 propostas") -- edição real (todos os campos)
// de um cartão que a própria aluna criou. `revision` calculado pelo
// CHAMADOR (`(card.revision||0)+1`) -- mesmo mecanismo de "reset via id
// novo" de updateFlashcardContent (shared/teacher-flashcards.js), ver
// comentário lá pra detalhe completo. Aqui quem edita e quem é dona da
// sessão são a MESMA pessoa -- fr/zh app.js chama replaceSelfFlashcardInState()
// logo em seguida pra refletir o reset NA MESMA sessão, sem esperar reload.
async function updateOwnFlashcardContent(id, { front, backTrans, note, frontPinyin, frontIsTargetLanguage, revision }){
  const v = _validateOwnFlashcardContent({ front, backTrans });
  if (!v.ok) return v;
  const { error } = await supabaseClient.from('student_flashcards').update({
    front: v.cleanFront,
    back_trans: v.cleanBack,
    note: (note || '').trim() || null,
    front_pinyin: (frontPinyin || '').trim() || null,
    front_is_target_language: frontIsTargetLanguage !== false,
    revision,
  }).eq('id', id).eq('student_id', CURRENT_USER.id);
  if (error){ console.error('Erro ao editar seu flashcard:', error); return { ok: false, error: 'Não foi possível salvar a edição agora.' }; }
  return { ok: true };
}

// Prop 4 -- delete físico de verdade (grillado: aceita perder o histórico
// de revisão pra poder apagar um cartão criado por engano; "arquivar" não
// resolve isso porque o cartão continuaria visível na lista de
// arquivados). Mesmo padrão de deleteFlashcardPermanently em
// shared/teacher-flashcards.js.
async function deleteOwnFlashcardPermanently(id){
  const { error } = await supabaseClient.from('student_flashcards').delete().eq('id', id).eq('student_id', CURRENT_USER.id);
  if (error){ console.error('Erro ao apagar seu flashcard:', error); return { ok: false }; }
  return { ok: true };
}

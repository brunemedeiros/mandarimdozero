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
async function createOwnFlashcard({ languageAppKey, front, backTrans, note, frontPinyin }){
  const cleanFront = (front || '').trim();
  const cleanBack = (backTrans || '').trim();
  if (!cleanFront) return { ok: false, error: 'Digite o texto da frente do cartão.' };
  if (!cleanBack) return { ok: false, error: 'Digite a tradução (verso do cartão).' };
  const { data, error } = await supabaseClient
    .from('student_flashcards')
    .insert({
      student_id: CURRENT_USER.id,
      language_app_key: languageAppKey,
      front: cleanFront,
      back_trans: cleanBack,
      note: (note || '').trim() || null,
      front_pinyin: (frontPinyin || '').trim() || null,
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

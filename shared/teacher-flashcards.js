// ---------- Flashcards autorados por professora -- Fase 2 do sistema de
// alunas particulares (ver CLAUDE.md) ----------
// Escopo desta fase: só CRIAR/ATRIBUIR o conteúdo do cartão a uma aluna.
// Não entra em STATE.cards nem na fila de revisão ainda -- isso é Fase 3
// ("integração com revisão"), fase separada e ainda não autorizada.
//
// Depende de (mesma posição de shared/roles.js -- antes de app.js):
//   - shared/supabase-client.js (supabaseClient)
//   - shared/auth.js            (CURRENT_USER)

async function fetchFlashcardsForStudent(studentId){
  if (!CURRENT_USER || !studentId) return [];
  const { data, error } = await supabaseClient
    .from('teacher_flashcards')
    .select('*')
    .eq('teacher_id', CURRENT_USER.id)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });
  if (error){ console.error('Erro ao carregar flashcards:', error); return []; }
  return data || [];
}

// front/back_trans obrigatórios (é o mínimo pra um cartão existir); note é
// opcional. languageAppKey vem do vínculo já existente em teacher_students
// (cada aluna vale pra 1 idioma -- não é escolhido de novo aqui).
async function createFlashcard({ studentId, languageAppKey, front, backTrans, note }){
  const cleanFront = (front || '').trim();
  const cleanBack = (backTrans || '').trim();
  if (!cleanFront) return { ok: false, error: 'Digite o texto da frente do cartão.' };
  if (!cleanBack) return { ok: false, error: 'Digite a tradução (verso do cartão).' };
  const { data, error } = await supabaseClient
    .from('teacher_flashcards')
    .insert({
      teacher_id: CURRENT_USER.id,
      student_id: studentId,
      language_app_key: languageAppKey,
      front: cleanFront,
      back_trans: cleanBack,
      note: (note || '').trim() || null,
    })
    .select()
    .single();
  if (error){ console.error('Erro ao criar flashcard:', error); return { ok: false, error: 'Não foi possível criar o cartão agora.' }; }
  return { ok: true, card: data };
}

async function setFlashcardStatus(id, status){
  const { error } = await supabaseClient.from('teacher_flashcards').update({ status }).eq('id', id);
  return { ok: !error };
}

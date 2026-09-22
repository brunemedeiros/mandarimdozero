// ---------- Flashcards autorados por professora -- Fase 2/3 do sistema de
// alunas particulares (ver CLAUDE.md) ----------
// Fase 2: só CRIAR/ATRIBUIR o conteúdo do cartão a uma aluna (admin).
// Fase 3 (integração com revisão): a própria aluna busca seus cartões
// (fetchFlashcardsForCurrentStudent) pra mesclar em STATE.cards no boot do
// app (fr/zh app.js).
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

// Todos os flashcards (ativos E arquivados) atribuídos à conta LOGADA como
// aluna, num idioma específico -- chamado do lado da aluna (RLS
// teacher_flashcards_student_read, migration 026: auth.uid()=student_id),
// não do lado da professora. Inclui arquivados de propósito: STATE.cards
// precisa deles presentes pra não perder o progresso de memória já
// acumulado (ver applySerializedState/merge por id, Fase 0) -- só ficam de
// fora da FILA DE REVISÃO (isCardLessonCompleted checa `status` na
// origem 'teacher', fr/zh app.js).
async function fetchFlashcardsForCurrentStudent(languageAppKey){
  if (!CURRENT_USER) return [];
  const { data, error } = await supabaseClient
    .from('teacher_flashcards')
    .select('*')
    .eq('student_id', CURRENT_USER.id)
    .eq('language_app_key', languageAppKey);
  if (error){ console.error('Erro ao carregar flashcards da aluna:', error); return []; }
  return data || [];
}

// front/back_trans obrigatórios (é o mínimo pra um cartão existir); note e
// frontPinyin são opcionais. frontPinyin só faz sentido pra
// languageAppKey==='mandarim' (ver migration 027 -- zh mostra pinyin e
// hanzi em campos separados no flashcard de revisão, diferente do fr que
// usa só `front`); a UI (shared/admin-flashcards.js) só mostra o campo
// quando a aluna selecionada é de mandarim. languageAppKey vem do vínculo
// já existente em teacher_students (cada aluna vale pra 1 idioma -- não é
// escolhido de novo aqui).
//
// Fase 8a (ver CLAUDE.md) -- imageUrl/audioUrl/choices são todos opcionais
// e independentes entre si (um cartão pode ter imagem sem ser múltipla
// escolha, ou múltipla escolha sem imagem). `choices` é um array de 1-3
// respostas ERRADAS -- a certa continua sendo `backTrans`, nunca duplicada
// aqui (ver comentário na migration 032). Vazio/undefined -> cartão comum.
async function createFlashcard({ studentId, languageAppKey, front, backTrans, note, frontPinyin, imageUrl, audioUrl, choices }){
  const cleanFront = (front || '').trim();
  const cleanBack = (backTrans || '').trim();
  if (!cleanFront) return { ok: false, error: 'Digite o texto da frente do cartão.' };
  if (!cleanBack) return { ok: false, error: 'Digite a tradução (verso do cartão).' };
  const cleanChoices = (choices || []).map(c => (c || '').trim()).filter(Boolean);
  const { data, error } = await supabaseClient
    .from('teacher_flashcards')
    .insert({
      teacher_id: CURRENT_USER.id,
      student_id: studentId,
      language_app_key: languageAppKey,
      front: cleanFront,
      back_trans: cleanBack,
      note: (note || '').trim() || null,
      front_pinyin: (frontPinyin || '').trim() || null,
      image_url: imageUrl || null,
      audio_url: audioUrl || null,
      choices: cleanChoices.length ? cleanChoices : null,
    })
    .select()
    .single();
  if (error){ console.error('Erro ao criar flashcard:', error); return { ok: false, error: 'Não foi possível criar o cartão agora.' }; }
  return { ok: true, card: data };
}

// Fase 8a -- upload de mídia pro bucket `flashcard-media` (migration 032,
// leitura pública/escrita restrita à pasta do próprio auth.uid() -- sempre
// a PROFESSORA aqui). Path com componente aleatório -- diferente do avatar
// (path fixo, upsert), cada cartão pode ter sua própria mídia sem
// sobrescrever a de outro. Devolve a URL pública já pronta pra gravar em
// createFlashcard(); não grava nada no banco sozinho.
async function uploadFlashcardMedia(file, kind){
  if (!CURRENT_USER) return { ok: false, error: 'Entre com sua conta.' };
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
  const path = `${CURRENT_USER.id}/${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabaseClient.storage
    .from('flashcard-media')
    .upload(path, file, { contentType: file.type || undefined, cacheControl: '3600' });
  if (error){ console.error(`Erro ao subir ${kind} do flashcard:`, error); return { ok: false, error: 'Não foi possível enviar o arquivo agora.' }; }
  const { data: pub } = supabaseClient.storage.from('flashcard-media').getPublicUrl(path);
  return { ok: true, url: pub.publicUrl };
}

async function setFlashcardStatus(id, status){
  const { error } = await supabaseClient.from('teacher_flashcards').update({ status }).eq('id', id);
  return { ok: !error };
}

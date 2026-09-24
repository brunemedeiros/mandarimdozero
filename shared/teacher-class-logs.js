// ---------- Histórico de Aula -- Fase 7 do sistema de alunas particulares
// (ver CLAUDE.md) ----------
// Diário de bordo da professora sobre suas próprias aulas com uma aluna
// específica -- diferente de teacher_flashcards/own_flashcards, isto
// NUNCA entra em STATE.cards nem no motor de revisão (FSRS/getStudyQueue).
// Só a professora tem acesso (RLS: auth.uid() = teacher_id, sem policy
// nenhuma pro lado da aluna, ver migration 031) -- por isso, diferente de
// fetchFlashcardsForStudent/fetchFlashcardsForCurrentStudent, só existe
// UMA função de leitura aqui (sempre do lado da professora).
//
// Depende de (mesma posição de shared/teacher-flashcards.js -- antes de
// app.js):
//   - shared/supabase-client.js (supabaseClient)
//   - shared/auth.js            (CURRENT_USER)

async function fetchClassLogs(studentId, languageAppKey){
  if (!CURRENT_USER || !studentId) return [];
  const { data, error } = await supabaseClient
    .from('teacher_class_logs')
    .select('*')
    .eq('teacher_id', CURRENT_USER.id)
    .eq('student_id', studentId)
    .eq('language_app_key', languageAppKey)
    .order('class_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error){ console.error('Erro ao carregar histórico de aula:', error); return []; }
  return data || [];
}

// Os 4 campos de conteúdo (tópico/lição de casa/observações/texto livre)
// são todos opcionais individualmente -- pedido explícito da autora, cada
// aula é diferente e nem toda aula tem lição de casa, por exemplo -- mas
// pelo menos 1 é exigido, pra não salvar uma entrada inteiramente vazia
// (só com data). classDate cai em "hoje" se não vier nada (mesmo default
// da coluna no banco, replicado aqui só pra devolver um valor consistente
// ao chamador se precisar).
async function createClassLog({ studentId, languageAppKey, classDate, topic, homework, observations, notes }){
  const cleanTopic = (topic || '').trim();
  const cleanHomework = (homework || '').trim();
  const cleanObservations = (observations || '').trim();
  const cleanNotes = (notes || '').trim();
  if (!cleanTopic && !cleanHomework && !cleanObservations && !cleanNotes){
    return { ok: false, error: 'Preencha pelo menos um campo (tópico, lição de casa, observações ou texto livre).' };
  }
  const { data, error } = await supabaseClient
    .from('teacher_class_logs')
    .insert({
      teacher_id: CURRENT_USER.id,
      student_id: studentId,
      language_app_key: languageAppKey,
      class_date: classDate || todayStr(),
      topic: cleanTopic || null,
      homework: cleanHomework || null,
      observations: cleanObservations || null,
      notes: cleanNotes || null,
    })
    .select()
    .single();
  if (error){ console.error('Erro ao criar registro de aula:', error); return { ok: false, error: 'Não foi possível salvar o registro agora.' }; }
  return { ok: true, log: data };
}

// Mesma validação de "pelo menos 1 campo preenchido" da criação --
// permite editar qualquer um dos campos (data inclusive).
async function updateClassLog(id, { classDate, topic, homework, observations, notes }){
  const cleanTopic = (topic || '').trim();
  const cleanHomework = (homework || '').trim();
  const cleanObservations = (observations || '').trim();
  const cleanNotes = (notes || '').trim();
  if (!cleanTopic && !cleanHomework && !cleanObservations && !cleanNotes){
    return { ok: false, error: 'Preencha pelo menos um campo (tópico, lição de casa, observações ou texto livre).' };
  }
  const { error } = await supabaseClient
    .from('teacher_class_logs')
    .update({
      class_date: classDate || todayStr(),
      topic: cleanTopic || null,
      homework: cleanHomework || null,
      observations: cleanObservations || null,
      notes: cleanNotes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error){ console.error('Erro ao editar registro de aula:', error); return { ok: false, error: 'Não foi possível salvar a edição agora.' }; }
  return { ok: true };
}

// DELETE físico de propósito -- diferente de teacher_flashcards/
// own_flashcards (status:'archived', nunca apagado, pra preservar
// progresso de memória FSRS), um registro de aula não tem nenhum estado
// de memória dependente dele (ver comentário na migration 031).
async function deleteClassLog(id){
  const { error } = await supabaseClient.from('teacher_class_logs').delete().eq('id', id);
  if (error){ console.error('Erro ao apagar registro de aula:', error); return { ok: false }; }
  return { ok: true };
}

// ---------- Material de apoio (professora) -- Fase 8b do sistema de
// alunas particulares (ver CLAUDE.md) ----------
// Terceiro tipo de conteúdo desta feature, e o primeiro que NUNCA entra em
// STATE.cards/FSRS -- "não-revisável" por definição (grillado): é um
// anexo/nota que a professora compartilha com a aluna, não algo que ela
// precisa memorizar. A aluna só LÊ (grillado: fora do escopo desta fase
// dar autoria a ela, diferente de "Meus Cartões", Fase 5).
//
// Grillado: texto + link + arquivo, todos opcionais individualmente (mas
// pelo menos 1 preenchido, mesma regra de teacher_class_logs); edição/
// exclusão físicas desde já (sem estado de memória dependente, mesmo
// raciocínio de teacher_class_logs).
//
// Depende de (mesma posição de shared/teacher-flashcards.js -- antes de
// app.js):
//   - shared/supabase-client.js (supabaseClient)
//   - shared/auth.js            (CURRENT_USER)

async function fetchSupportMaterialsForStudent(studentId){
  if (!CURRENT_USER || !studentId) return [];
  const { data, error } = await supabaseClient
    .from('teacher_support_materials')
    .select('*')
    .eq('teacher_id', CURRENT_USER.id)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });
  if (error){ console.error('Erro ao carregar materiais de apoio:', error); return []; }
  return data || [];
}

// Lado da aluna -- todos os materiais atribuídos a ela num idioma (RLS
// teacher_support_materials_student_read, migration 033: auth.uid() =
// student_id).
async function fetchSupportMaterialsForCurrentStudent(languageAppKey){
  if (!CURRENT_USER) return [];
  const { data, error } = await supabaseClient
    .from('teacher_support_materials')
    .select('*')
    .eq('student_id', CURRENT_USER.id)
    .eq('language_app_key', languageAppKey)
    .order('created_at', { ascending: false });
  if (error){ console.error('Erro ao carregar materiais de apoio da aluna:', error); return []; }
  return data || [];
}

// Upload pro bucket `support-materials` (migration 033, leitura pública,
// escrita restrita à pasta do próprio auth.uid() -- sempre a PROFESSORA
// aqui). Sem restrição de tipo (PDF/imagem/doc) -- diferente de
// uploadFlashcardMedia (que separa image/audio), aqui é só "um arquivo
// anexo", o nome original fica salvo (`fileName`) pra exibir na lista já
// que a URL pública é um path opaco.
async function uploadSupportMaterialFile(file){
  if (!CURRENT_USER) return { ok: false, error: 'Entre com sua conta.' };
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
  const path = `${CURRENT_USER.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabaseClient.storage
    .from('support-materials')
    .upload(path, file, { contentType: file.type || undefined, cacheControl: '3600' });
  if (error){ console.error('Erro ao subir material de apoio:', error); return { ok: false, error: 'Não foi possível enviar o arquivo agora.' }; }
  const { data: pub } = supabaseClient.storage.from('support-materials').getPublicUrl(path);
  return { ok: true, url: pub.publicUrl, fileName: file.name };
}

// title obrigatório (nome curto pro material); description/linkUrl/
// fileUrl todos opcionais INDIVIDUALMENTE, mas pelo menos 1 dos 3
// precisa estar presente -- mesmo critério de createClassLog (material
// sem nenhum conteúdo não serve pra nada).
async function createSupportMaterial({ studentId, languageAppKey, title, description, linkUrl, fileUrl, fileName }){
  const cleanTitle = (title || '').trim();
  if (!cleanTitle) return { ok: false, error: 'Digite um título pro material.' };
  const cleanDesc = (description || '').trim();
  const cleanLink = (linkUrl || '').trim();
  if (!cleanDesc && !cleanLink && !fileUrl){
    return { ok: false, error: 'Preencha ao menos a descrição, um link ou um arquivo.' };
  }
  const { data, error } = await supabaseClient
    .from('teacher_support_materials')
    .insert({
      teacher_id: CURRENT_USER.id,
      student_id: studentId,
      language_app_key: languageAppKey,
      title: cleanTitle,
      description: cleanDesc || null,
      link_url: cleanLink || null,
      file_url: fileUrl || null,
      file_name: fileUrl ? (fileName || null) : null,
    })
    .select()
    .single();
  if (error){ console.error('Erro ao criar material de apoio:', error); return { ok: false, error: 'Não foi possível criar o material agora.' }; }
  return { ok: true, material: data };
}

// Edição cobre título/descrição/link -- não o arquivo anexado (trocar/
// remover mídia não foi pedido no grilling; mesmo escopo restrito que
// teacher_flashcards teve pra edição -- ver CLAUDE.md).
async function updateSupportMaterial(id, { title, description, linkUrl }){
  const cleanTitle = (title || '').trim();
  if (!cleanTitle) return { ok: false, error: 'Digite um título pro material.' };
  const { error } = await supabaseClient
    .from('teacher_support_materials')
    .update({
      title: cleanTitle,
      description: (description || '').trim() || null,
      link_url: (linkUrl || '').trim() || null,
    })
    .eq('id', id);
  if (error){ console.error('Erro ao editar material de apoio:', error); return { ok: false, error: 'Não foi possível salvar agora.' }; }
  return { ok: true };
}

async function deleteSupportMaterial(id){
  const { error } = await supabaseClient.from('teacher_support_materials').delete().eq('id', id);
  return { ok: !error };
}

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

// Todos os materiais da professora de uma vez (a tela nova agrupa e filtra no navegador, sem uma ida ao banco por aluno).
// O limite do PostgREST é 1000 linhas: a tela avisa se chegar nele.
const SUPPORT_MATERIALS_FETCH_LIMIT = 1000;
async function fetchAllSupportMaterials(){
  if (!CURRENT_USER) return { rows: [], truncated: false };
  const { data, error } = await supabaseClient
    .from('teacher_support_materials')
    .select('*')
    .eq('teacher_id', CURRENT_USER.id)
    .order('created_at', { ascending: false })
    .limit(SUPPORT_MATERIALS_FETCH_LIMIT);
  if (error){ console.error('Erro ao carregar materiais de apoio:', error); return { rows: null, truncated: false }; }
  return { rows: data || [], truncated: (data || []).length >= SUPPORT_MATERIALS_FETCH_LIMIT };
}

// Só http/https: o link é aberto pela aluna (e por esta tela) como href.
function isHttpUrl(u){ return /^https?:\/\//i.test(String(u || '').trim()); }

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

// Upload pro bucket `support-materials` (migration 033; leitura FECHADA desde a 153, ver openSupportMaterialFile;
// escrita restrita à pasta do próprio auth.uid() -- sempre a PROFESSORA
// aqui). Sem restrição de tipo (PDF/imagem/doc) -- diferente de
// uploadFlashcardMedia (que separa image/audio), aqui é só "um arquivo
// anexo", o nome original fica salvo (`fileName`) pra exibir na lista já
// que a URL pública é um path opaco.
async function uploadSupportMaterialFile(file){
  if (!CURRENT_USER) return { ok: false, error: t('ownFlashcards.err.loginRequired') };
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
  const path = `${CURRENT_USER.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabaseClient.storage
    .from('support-materials')
    .upload(path, file, { contentType: file.type || undefined, cacheControl: '3600' });
  if (error){ console.error('Erro ao subir material de apoio:', error); return { ok: false, error: t('ownFlashcards.err.uploadFailed') }; }
  const { data: pub } = supabaseClient.storage.from('support-materials').getPublicUrl(path);
  return { ok: true, url: pub.publicUrl, fileName: file.name };
}

// Pasta fechada desde a migration 153 (2026-11-27): o arquivo abre por um link temporário (10 min) criado no
// clique, como os prints dos reports (shared/admin-reports.js, reportsOpenScreenshot). O Storage só assina para
// quem pode ler: a professora (pasta dela) ou a aluna que recebeu o material (com vínculo ativo). file_url continua
// gravado no formato antigo; o caminho do arquivo sai dele.
function supportMaterialPath(url){
  const m = String(url || '').match(/\/support-materials\/([^?#]+)/);
  if (!m) return '';
  try { return decodeURIComponent(m[1]); } catch (e) { return m[1]; }
}
async function openSupportMaterialFile(fileUrl){
  const path = supportMaterialPath(fileUrl);
  const w = window.open('', '_blank');
  if (w) { try { w.opener = null; } catch (e) {} }
  let url = null;
  if (path){
    try {
      const { data, error } = await supabaseClient.storage.from('support-materials').createSignedUrl(path, 600);
      if (!error && data && data.signedUrl) url = data.signedUrl;
    } catch (e) {}
  }
  if (url && w) { w.location.href = url; return; }
  if (url) { window.location.href = url; return; }
  if (w) w.close();
  if (typeof showToast === 'function') showToast(t('supportMaterials.fileError')); else alert(t('supportMaterials.fileError'));
}
if (typeof document !== 'undefined'){
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('[data-sm-file]');
    if (!a) return;
    e.preventDefault();
    openSupportMaterialFile(a.dataset.smFile);
  });
}

// title obrigatório (nome curto pro material); description/linkUrl/
// fileUrl todos opcionais INDIVIDUALMENTE, mas pelo menos 1 dos 3
// precisa estar presente -- mesmo critério de createClassLog (material
// sem nenhum conteúdo não serve pra nada).
async function createSupportMaterial({ studentId, languageAppKey, title, description, linkUrl, fileUrl, fileName }){
  const cleanTitle = (title || '').trim();
  if (!cleanTitle) return { ok: false, error: t('teacherMaterials.err.titleRequired') };
  const cleanDesc = (description || '').trim();
  const cleanLink = (linkUrl || '').trim();
  if (!cleanDesc && !cleanLink && !fileUrl){
    return { ok: false, error: t('teacherMaterials.err.needContent') };
  }
  if (cleanLink && !isHttpUrl(cleanLink)) return { ok: false, error: t('teacherMaterials.err.badLink') };
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
  if (error){ console.error('Erro ao criar material de apoio:', error); return { ok: false, error: t('teacherMaterials.err.createFailed') }; }
  return { ok: true, material: data };
}

// Edição cobre título/descrição/link -- não o arquivo anexado (trocar/
// remover mídia não foi pedido no grilling; mesmo escopo restrito que
// teacher_flashcards teve pra edição -- ver CLAUDE.md).
async function updateSupportMaterial(id, { title, description, linkUrl }){
  const cleanTitle = (title || '').trim();
  if (!cleanTitle) return { ok: false, error: t('teacherMaterials.err.titleRequired') };
  if ((linkUrl || '').trim() && !isHttpUrl(linkUrl)) return { ok: false, error: t('teacherMaterials.err.badLink') };
  const { error } = await supabaseClient
    .from('teacher_support_materials')
    .update({
      title: cleanTitle,
      description: (description || '').trim() || null,
      link_url: (linkUrl || '').trim() || null,
    })
    .eq('id', id);
  if (error){ console.error('Erro ao editar material de apoio:', error); return { ok: false, error: t('teacherMaterials.err.saveFailed') }; }
  return { ok: true };
}

async function deleteSupportMaterial(id){
  const { error } = await supabaseClient.from('teacher_support_materials').delete().eq('id', id);
  return { ok: !error };
}

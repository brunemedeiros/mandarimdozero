// ---------- Métricas da aluna pra professora -- Fase 6 do sistema de
// alunas particulares (ver CLAUDE.md) ----------
// Único ponto de acesso a QUALQUER dado de progresso de uma aluna do lado
// da professora -- chama a function SECURITY DEFINER
// get_teacher_student_metrics (migrations 029/058/059), que já faz a checagem de
// vínculo ativo e devolve só agregados sobre os cartões que a PRÓPRIA
// professora autorou pra essa aluna (teacher_flashcards), nunca dado bruto.
// Nunca ler `progress` diretamente daqui nem de nenhum outro lugar do lado
// da professora -- RLS de `progress` continua sem nenhuma policy nova,
// de propósito (ver comentário na migration).
//
// Depende de (mesma posição de shared/roles.js -- antes de app.js):
//   - shared/supabase-client.js (supabaseClient)

async function fetchTeacherStudentMetrics(studentId, languageAppKey){
  const { data, error } = await supabaseClient.rpc('get_teacher_student_metrics', {
    p_student_id: studentId,
    p_language_app_key: languageAppKey,
  });
  if (error || !data || data.error){
    if (error) console.error('Erro ao carregar métricas da aluna:', error);
    return null;
  }
  return data;
}

// K.9 (migration 078): Meus Decks do aluno e os Decks desta professora, com
// Novos/Aprendendo/Para revisar/Devidos por subárvore. Só nome + números.
async function fetchTeacherStudentDeckCounts(studentId, languageAppKey){
  const { data, error } = await supabaseClient.rpc('get_teacher_student_deck_counts', {
    p_student_id: studentId,
    p_language_app_key: languageAppKey,
  });
  if (error || !data || data.error || !Array.isArray(data.decks)){
    if (error) console.error('Erro ao carregar Decks do aluno:', error);
    return null;
  }
  return data.decks;
}

// Painel do aluno ampliado (migration 070) -- visão geral do aluno em TODOS
// os idiomas em que ele tem progresso (decisão da autora: como professora ela
// vê uso, progresso, sequência, últimas atividades etc.). Mesma checagem de
// vínculo ativo da 059, feita dentro da function. Devolve null em erro ou
// not_authorized (a UI mostra um aviso genérico).
async function fetchTeacherStudentOverview(studentId, languageAppKey){
  const { data, error } = await supabaseClient.rpc('get_teacher_student_overview', {
    p_student_id: studentId,
    p_language_app_key: languageAppKey,
  });
  if (error || !data || data.error){
    if (error) console.error('Erro ao carregar a visão geral do aluno:', error);
    return null;
  }
  return data;
}

// Recomeçar o curso (migration 123): últimos recomeços do aluno no idioma do vínculo (data e se desfez). Mesma checagem de
// vínculo ativo, feita dentro da function. Erro ou função ainda não aplicada = lista vazia (a ficha só não mostra o aviso).
async function fetchTeacherStudentRestarts(studentId, languageAppKey){
  try {
    const { data, error } = await supabaseClient.rpc('get_teacher_student_restarts', { p_student_id: studentId, p_language_app_key: languageAppKey });
    if (error || !data || data.error || !Array.isArray(data.restarts)) return [];
    return data.restarts;
  } catch (e) { return []; }
}

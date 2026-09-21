// ---------- Métricas da aluna pra professora -- Fase 6 do sistema de
// alunas particulares (ver CLAUDE.md) ----------
// Único ponto de acesso a QUALQUER dado de progresso de uma aluna do lado
// da professora -- chama a function SECURITY DEFINER
// get_teacher_student_metrics (migration 029), que já faz a checagem de
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

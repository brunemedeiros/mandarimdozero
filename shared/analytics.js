// ---------- Métricas de uso (compartilhado entre idiomas) ----------
// Registra eventos de navegação/conclusão em `usage_events` (Supabase,
// migration 007) -- só pra você (auth.jwt().email = admin, ver policy de
// leitura da tabela) enxergar o que os alunos mais usam. Nunca trava nem
// mostra erro pro aluno se falhar (offline, RLS etc.) -- mesmo padrão
// best-effort do upsert de weekly_xp em shared/auth.js:saveState().
//
// Depende de shared/supabase-client.js (supabaseClient) e de cada
// languages/<lang>/app.js já ter definido APP_KEY e CURRENT_USER antes de
// qualquer chamada real (não no load do script -- só quando um evento de
// verdade acontece, o que já é depois do app inteiro ter rodado).
//
// Só grava pra contas de verdade: convidados (CURRENT_USER === false) não
// têm user_id no Supabase pra satisfazer a foreign key/RLS, e ficam de
// fora desta primeira versão -- mesma exclusão que Ranking/badges já
// fazem pra modo convidado.
function trackEvent(eventType, eventName, meta){
  if (!CURRENT_USER) return;
  supabaseClient.from('usage_events').insert({
    user_id: CURRENT_USER.id,
    language_app_key: APP_KEY,
    event_type: eventType,
    event_name: eventName,
    meta: meta || null,
  }).then(({ error }) => {
    if (error) console.error('Erro ao registrar evento de uso:', error);
  });
}

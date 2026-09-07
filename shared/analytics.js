// ---------- Métricas de uso (compartilhado entre idiomas) ----------
// Registra eventos de navegação/conclusão em `usage_events` (Supabase,
// migration 007+008) -- só pra você (auth.jwt().email = admin, ver policy
// de leitura da tabela) enxergar o que os alunos mais usam. Nunca trava
// nem mostra erro pro aluno se falhar (offline, RLS etc.) -- mesmo padrão
// best-effort do upsert de weekly_xp em shared/auth.js:saveState().
//
// Depende de shared/supabase-client.js (supabaseClient) e de cada
// languages/<lang>/app.js já ter definido APP_KEY, CURRENT_USER e
// isAdminUser() antes de qualquer chamada real (não no load do script --
// só quando um evento de verdade acontece, o que já é depois do app
// inteiro ter rodado). Depende também de PROFILE_CACHE/ensureProfileLoaded
// (shared/profile.js, carregado antes deste arquivo).
//
// Só grava pra contas de verdade: convidados (CURRENT_USER === false) não
// têm user_id no Supabase pra satisfazer a foreign key/RLS, e ficam de
// fora desta primeira versão -- mesma exclusão que Ranking/badges já
// fazem pra modo convidado.
//
// ---------- Separação aluno/admin (arquitetural, não um filtro visual) ----------
// actor_type é calculado AQUI, no momento da gravação, a partir do e-mail
// autenticado (isAdminUser()) -- nunca confia em nada vindo de fora sobre
// "quem eu digo que sou". Por padrão, atividade de admin nem chega a ser
// gravada (ver checagem de PROFILE_CACHE.exclude_own_activity abaixo,
// default true): é o controle "Excluir minha atividade dos Analytics" no
// Painel de Admin > Analytics (shared/admin-analytics.js). Se essa
// preferência for desligada, o evento AINDA assim é marcado
// actor_type='admin' -- só deixa de ser descartado -- então o dashboard
// (que só lê actor_type='student') continua sem contar essa atividade.
// Um id por carregamento de página -- agrupa os eventos da mesma "visita"
// (ver comentário da migration 008). Gerado uma vez no load do script, não
// por chamada de trackEvent().
const ANALYTICS_SESSION_ID = (typeof crypto !== 'undefined' && crypto.randomUUID)
  ? crypto.randomUUID()
  : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function trackEvent(eventType, eventName, meta){
  if (!CURRENT_USER) return;

  const actorType = (typeof isAdminUser === 'function' && isAdminUser()) ? 'admin' : 'student';
  if (actorType === 'admin'){
    // PROFILE_CACHE só existe depois de ensureProfileLoaded() (chamado no
    // login, ver onUserLoggedIn em shared/auth.js). Se por algum motivo
    // ainda não carregou, assume o padrão (excluir) em vez de arriscar
    // contaminar as métricas de aluno.
    const exclude = PROFILE_CACHE ? PROFILE_CACHE.exclude_own_activity !== false : true;
    if (exclude) return;
  }

  supabaseClient.from('usage_events').insert({
    user_id: CURRENT_USER.id,
    language_app_key: APP_KEY,
    event_type: eventType,
    event_name: eventName,
    actor_type: actorType,
    session_id: ANALYTICS_SESSION_ID,
    meta: meta || null,
  }).then(({ error }) => {
    if (error) console.error('Erro ao registrar evento de uso:', error);
  });
}

-- Analytics (Fase 1 -- fundação): separa atividade de aluno da atividade
-- administrativa/de teste de forma ARQUITETURAL (uma coluna gravada em
-- cada evento, calculada no momento do insert a partir do e-mail
-- autenticado -- ver isAdminUser() em cada languages/<lang>/app.js e o uso
-- em shared/analytics.js:trackEvent()), não um filtro que só existe na
-- tela. Fica como texto livre, não um enum do Postgres: o app já vai
-- crescer pra mais tipos de conta no futuro (aluno/admin/desenvolvedora/
-- ...) e um enum exigiria uma migration só pra adicionar um valor novo.
alter table public.usage_events
  add column if not exists actor_type text not null default 'student';

-- Backfill: todo evento já gravado por uma conta com e-mail de admin passa
-- a ser marcado como tal -- sem isso, a atividade de teste da autora
-- registrada ANTES desta coluna existir ficaria contando como aluno pra
-- sempre. Migrations rodam com privilégio de owner no SQL Editor, então
-- este update lê auth.users mesmo sem existir (nem fazer sentido existir)
-- uma policy de select nela.
update public.usage_events
set actor_type = 'admin'
where user_id in (
  select id from auth.users where email = 'brunemed1310@gmail.com'
);

-- session_id: agrupa eventos do mesmo carregamento de página (um id
-- gerado uma vez por sessão em shared/analytics.js). Ainda não existe
-- nenhum evento explícito de início/fim de sessão -- fica pra quando a
-- Fase 2 (Atividade/DAU-WAU-MAU) precisar de fato agrupar por sessão; a
-- ideia é inferir a duração pela proximidade de timestamp dentro do mesmo
-- session_id, sem depender de um evento "session_ended" (pouco confiável:
-- beforeunload costuma cancelar o insert antes dele terminar).
alter table public.usage_events
  add column if not exists session_id uuid;

create index if not exists usage_events_actor_type_idx on public.usage_events (actor_type);
create index if not exists usage_events_session_id_idx on public.usage_events (session_id);

-- Preferência por conta: "Excluir minha atividade dos Analytics" (Painel
-- de Admin > Analytics). Default true -- atividade administrativa fica de
-- fora por padrão, como pedido. Vive em profiles (não numa tabela nova)
-- porque já é a tabela de identidade/preferência da conta; na prática só
-- tem efeito pra quem é admin hoje, mas não faz sentido restringir a
-- coluna a isso -- nasce pronta pra qualquer conta de teste futura
-- silenciar a própria atividade sem precisar de outra migration.
alter table public.profiles
  add column if not exists exclude_own_activity boolean not null default true;

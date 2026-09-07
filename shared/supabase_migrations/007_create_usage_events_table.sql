-- Métricas de uso: qual aba/ferramenta os alunos mais navegam e quais tipos
-- de lição (vocabulário, flashcard, ditado, conjugação, desafio, hanzi...)
-- eles de fato terminam. Um log append-only de eventos, nunca editado
-- depois de criado -- cada linha é um evento que já aconteceu.
--
-- Escrito por shared/analytics.js:trackEvent(), chamado nos pontos de
-- conclusão/navegação já existentes em cada app.js (nunca um listener de
-- clique genérico -- cliques em botões pontuais não são gravados, só
-- navegação de aba e conclusões de conteúdo, que é o que dá sinal real de
-- uso). Só para contas de verdade: convidados não têm user_id no Supabase
-- pra satisfazer a FK, e ficam de fora desta primeira versão (mesma
-- exclusão que Ranking/badges já fazem).
--
-- event_type agrupa por categoria ampla ('tab_switch', 'lesson_complete');
-- event_name identifica o item específico dentro do tipo (o id da aba, ou
-- o tipo de lição: 'vocab_lesson', 'unit_checkpoint', 'flashcard_review',
-- 'speed_review', 'match_game', 'hanzi_lesson', 'hanzi_review', 'dictation',
-- 'conjugation_session', 'challenge'). meta guarda contexto extra (unitId,
-- score, contagem de cartões etc.) sem precisar de uma coluna por caso.
create table if not exists public.usage_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  language_app_key text not null,
  event_type text not null,
  event_name text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists usage_events_created_at_idx on public.usage_events (created_at);
create index if not exists usage_events_user_id_idx on public.usage_events (user_id);
create index if not exists usage_events_event_type_name_idx on public.usage_events (event_type, event_name);

alter table public.usage_events enable row level security;

-- Só a própria conta grava os próprios eventos -- write-only do ponto de
-- vista do aluno, ele nunca lê isso de volta em tela nenhuma.
drop policy if exists "usage_events_owner_insert" on public.usage_events;
create policy "usage_events_owner_insert"
  on public.usage_events
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Leitura só pra conta admin -- diferente de weekly_xp/profiles (números
-- públicos por natureza, pro Ranking), isto é dado de comportamento de
-- CADA aluno, então fica igual à regra já usada nas policies de UPDATE de
-- badge_catalog/badge_grants (ver 005): só brunemed1310@gmail.com.
drop policy if exists "usage_events_admin_read" on public.usage_events;
create policy "usage_events_admin_read"
  on public.usage_events
  for select
  to authenticated
  using (auth.jwt() ->> 'email' = 'brunemed1310@gmail.com');

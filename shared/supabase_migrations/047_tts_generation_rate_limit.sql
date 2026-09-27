-- Fase 7f (implementação) -- TTS explícito por Field (ver CLAUDE.md) --
-- rate limiting.
--
-- A Edge Function nova (supabase/functions/tts-generate) precisa de uma
-- forma SEGURA de limitar quantas gerações de áudio uma conta pode pedir
-- num intervalo curto -- controle de custo (nenhum provedor de TTS real
-- está configurado hoje, mas a infraestrutura precisa nascer pronta pra
-- quando um existir). Avaliado antes de escrever esta migration: um
-- contador em memória dentro da própria Edge Function NÃO é seguro
-- (Edge Functions são efêmeras/sem estado compartilhado entre invocações
-- concorrentes -- resetaria a cada cold start e nunca protegeria de
-- verdade); a única forma SEGURA sem depender de infraestrutura nova de
-- terceiros é uma tabela mínima e aditiva no MESMO Postgres que toda a
-- plataforma já usa -- mesmo padrão de "aplicar migration aditiva/baixo
-- risco direto" já usado em toda a sessão (ver CLAUDE.md, topo do
-- arquivo).
--
-- Uma linha por GERAÇÃO bem-sucedida (não por tentativa) -- a Edge
-- Function insere depois do upload ter sucesso (ver
-- supabase/functions/tts-generate/index.ts), nunca antes; uma falha de
-- geração/upload nunca consome quota. RLS owner-only, mesmo padrão exato
-- de push_subscriptions (migration 013) -- cada conta só grava/lê a
-- PRÓPRIA contagem, nunca vê nem afeta a de outra.
create table if not exists public.tts_generation_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists tts_generation_log_user_created_idx
  on public.tts_generation_log (user_id, created_at desc);

alter table public.tts_generation_log enable row level security;

drop policy if exists "tts_generation_log_owner_insert" on public.tts_generation_log;
create policy "tts_generation_log_owner_insert"
  on public.tts_generation_log
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "tts_generation_log_owner_select" on public.tts_generation_log;
create policy "tts_generation_log_owner_select"
  on public.tts_generation_log
  for select
  to authenticated
  using (auth.uid() = user_id);

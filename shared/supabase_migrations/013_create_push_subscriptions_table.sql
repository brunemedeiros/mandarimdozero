-- Fase 3 do sistema de notificações: push/PWA de verdade (ver seção 11/18
-- da arquitetura aprovada). Antes desta migration não existia NENHUM jeito
-- de avisar alguém com o app fechado -- só o cron in-app (Fase 2), que
-- exige abrir a aba pra ver. Uma linha por inscrição de push do navegador
-- (Web Push API) -- uma conta pode ter mais de uma (celular + notebook,
-- por exemplo), por isso não é 1 linha por user_id.
create table if not exists public.push_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  language_app_key text not null,
  endpoint text not null,
  -- p256dh/auth: as duas chaves que o navegador gera pra essa inscrição
  -- (PushSubscription.toJSON().keys) -- precisa das duas pra criptografar
  -- a mensagem antes de enviar (biblioteca web-push cuida disso).
  keys jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- Só a própria conta grava/lê/apaga as próprias inscrições -- é dado
-- sensível o bastante (permite mandar notificação pro navegador de
-- alguém) pra nunca ter leitura pública, diferente de weekly_xp/badge_catalog.
-- A leitura (select) é usada pela Edge Function push-send, que roda no
-- contexto do PRÓPRIO usuário (repassa o JWT dele, não service role) --
-- ver supabase/functions/push-send/index.ts. O cron (notification-cron)
-- usa service role e ignora RLS, então não precisa de policy própria.
drop policy if exists "push_subscriptions_owner_insert" on public.push_subscriptions;
create policy "push_subscriptions_owner_insert"
  on public.push_subscriptions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "push_subscriptions_owner_select" on public.push_subscriptions;
create policy "push_subscriptions_owner_select"
  on public.push_subscriptions
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "push_subscriptions_owner_delete" on public.push_subscriptions;
create policy "push_subscriptions_owner_delete"
  on public.push_subscriptions
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Fase 0 do sistema de notificações: infraestrutura mínima -- só as 5
-- tabelas que a Fase 0 precisa (ver arquitetura aprovada, seção 8/18).
-- notification_queue, notification_deliveries e push_subscriptions ficam
-- pra quando push (Fase 3) e e-mail (Fase 5) existirem de fato -- não faz
-- sentido criar tabela pra canal que ainda não tem quem envie.
--
-- Contexto: hoje NADA disso existe -- é site estático + Supabase (banco +
-- auth), sem servidor próprio, sem cron, sem fila (auditoria confirmada).
-- Esta migration só cria a fundação de dados; a Edge Function + cron que
-- lê essas tabelas fora do navegador de alguém vem junto neste PR
-- (supabase/functions/notification-cron/), mas ainda sem a lógica de
-- negócio de cada evento -- isso é Fase 2 em diante.

-- ---------- notification_events ----------
-- Log append-only de todo evento que PODERIA virar notificação --
-- inclusive os que o motor decidir suprimir (auditoria do anti-spam,
-- seção 5). Espelha usage_events (007) de propósito: mesmo padrão já
-- validado neste projeto pra log de eventos por conta/idioma.
create table if not exists public.notification_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  language_app_key text not null,
  event_type text not null,
  payload jsonb,
  -- 'client' = disparado na hora por quem está com o app aberto (XP,
  -- badge, desafio concluído...); 'cron' = calculado pela Edge Function
  -- rodando fora do navegador (streak em risco, revisão atrasada,
  -- reengajamento...) -- ver seção 7 da arquitetura.
  source text not null default 'client' check (source in ('client', 'cron')),
  created_at timestamptz not null default now()
);

create index if not exists notification_events_user_id_idx on public.notification_events (user_id);
create index if not exists notification_events_event_type_idx on public.notification_events (event_type);
create index if not exists notification_events_created_at_idx on public.notification_events (created_at);

alter table public.notification_events enable row level security;

-- Só a própria conta grava os próprios eventos (o mesmo client que
-- dispara um evento imediato insere aqui) -- a Edge Function usa a
-- service role, que ignora RLS, então não precisa de policy própria pra
-- ela. Leitura só admin: é dado de auditoria interna, igual usage_events.
drop policy if exists "notification_events_owner_insert" on public.notification_events;
create policy "notification_events_owner_insert"
  on public.notification_events
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "notification_events_admin_read" on public.notification_events;
create policy "notification_events_admin_read"
  on public.notification_events
  for select
  to authenticated
  using (auth.jwt() ->> 'email' = 'brunemed1310@gmail.com');

-- ---------- notification_rules ----------
-- Configuração das regras de anti-spam por categoria (seção 5/16) --
-- prioridade, cooldown, limite diário -- em tabela, não hardcoded, pra
-- ajustar sem deploy. A categoria "reengajamento" também guarda o
-- calendário de dias em schedule_days (seção 13) -- é o dado que troca
-- o antigo 1-3-7-14-30 fixo por algo editável (seed abaixo já usa
-- 1-3-5-7-9-15-20-30, a sugestão da autora).
-- required_plan é reservado pro corte gratuito/premium (seção 21) --
-- ainda não há nenhuma conta premium na plataforma, então todo mundo
-- fica em 'free' até essa decisão ser tomada de verdade.
create table if not exists public.notification_rules (
  category text primary key,
  priority smallint not null default 2 check (priority between 1 and 4),
  cooldown_minutes integer not null default 60 check (cooldown_minutes >= 0),
  daily_cap integer not null default 3 check (daily_cap >= 0),
  active boolean not null default true,
  required_plan text not null default 'free' check (required_plan in ('free', 'premium')),
  schedule_days jsonb,
  updated_at timestamptz not null default now()
);

alter table public.notification_rules enable row level security;

-- Leitura pública: o cliente precisa saber cooldown/limite pra aplicar o
-- anti-spam localmente nos eventos imediatos (Fase 1). Escrita só admin
-- -- é você quem ajusta essas regras pelo editor (Painel de Admin).
drop policy if exists "notification_rules_public_read" on public.notification_rules;
create policy "notification_rules_public_read"
  on public.notification_rules
  for select
  to anon, authenticated
  using (true);

drop policy if exists "notification_rules_admin_write" on public.notification_rules;
create policy "notification_rules_admin_write"
  on public.notification_rules
  for all
  to authenticated
  using (auth.jwt() ->> 'email' = 'brunemed1310@gmail.com')
  with check (auth.jwt() ->> 'email' = 'brunemed1310@gmail.com');

create or replace function public.notification_rules_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_notification_rules_set_updated_at on public.notification_rules;
create trigger trg_notification_rules_set_updated_at
  before update on public.notification_rules
  for each row
  execute function public.notification_rules_set_updated_at();

insert into public.notification_rules (category, priority, cooldown_minutes, daily_cap, schedule_days)
values
  ('sistema', 1, 0, 10, null),
  ('estudo', 2, 240, 2, null),
  ('revisao', 2, 360, 2, null),
  ('streak', 2, 60, 2, null),
  ('gamificacao', 3, 15, 5, null),
  ('ranking', 3, 720, 1, null),
  ('desafios', 3, 240, 2, null),
  ('conteudo', 3, 1440, 1, null),
  ('reengajamento', 4, 1440, 1, '[1, 3, 5, 7, 9, 15, 20, 30]'::jsonb)
on conflict (category) do nothing;

-- ---------- notification_templates ----------
-- Pool de variantes de texto por evento × canal × idioma do app
-- (frances/mandarim) -- não um texto fixo por evento. O motor sorteia
-- uma variante ativa a cada envio (seção 8/9), e você edita/adiciona/
-- desativa pelo editor do Painel de Admin, sem deploy. body aceita
-- placeholders tipo {{word}}/{{days}} substituídos pelo payload do
-- evento correspondente em notification_events.
create table if not exists public.notification_templates (
  id bigint generated always as identity primary key,
  event_type text not null,
  channel text not null check (channel in ('in_app', 'push', 'email')),
  language_app_key text not null,
  title text,
  body text not null,
  icon text,
  active boolean not null default true,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Sem isso, reexecutar o seed abaixo (migration rodada 2x, por engano
  -- ou pra restaurar algo) duplicava cada variante -- "on conflict do
  -- nothing" não tem contra o que conflitar sem uma constraint aqui.
  -- Colisão real (mesmo evento+canal+idioma+texto) é sempre duplicata de
  -- verdade, nunca duas variantes distintas por coincidência.
  unique (event_type, channel, language_app_key, body)
);

create index if not exists notification_templates_lookup_idx
  on public.notification_templates (event_type, channel, language_app_key, active);

alter table public.notification_templates enable row level security;

drop policy if exists "notification_templates_public_read" on public.notification_templates;
create policy "notification_templates_public_read"
  on public.notification_templates
  for select
  to anon, authenticated
  using (true);

drop policy if exists "notification_templates_admin_write" on public.notification_templates;
create policy "notification_templates_admin_write"
  on public.notification_templates
  for all
  to authenticated
  using (auth.jwt() ->> 'email' = 'brunemed1310@gmail.com')
  with check (auth.jwt() ->> 'email' = 'brunemed1310@gmail.com');

create or replace function public.notification_templates_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_notification_templates_set_updated_at on public.notification_templates;
create trigger trg_notification_templates_set_updated_at
  before update on public.notification_templates
  for each row
  execute function public.notification_templates_set_updated_at();

-- Seed do calendário de reengajamento (seção 13) -- tom leve/brincalhão,
-- só canal in_app por enquanto (push/e-mail entram nas Fases 3/5, quando
-- esses canais de fato existirem). Editável/substituível a qualquer
-- momento pelo Painel de Admin -- este seed é só o ponto de partida.
insert into public.notification_templates (event_type, channel, language_app_key, body, created_by) values
  ('user_inactive_1', 'in_app', 'frances', 'Ei, você esqueceu de mim? 🥺 Só cinco minutinhos e você já faz seu estudo do dia.', 'seed'),
  ('user_inactive_1', 'in_app', 'frances', 'Seu francês tá aqui, esperando por você (com cara de cachorro pidão) 🐶', 'seed'),
  ('user_inactive_1', 'in_app', 'mandarim', 'Ei, você esqueceu de mim? 🥺 Só cinco minutinhos e seu mandarim do dia já tá feito.', 'seed'),
  ('user_inactive_1', 'in_app', 'mandarim', 'Seu chinês tá aqui, esperando por você (com cara de gatinho pidão) 🐱', 'seed'),

  ('user_inactive_3', 'in_app', 'frances', '3 dias sem aparecer... já sinto sua falta! Bora dar um oi rapidinho? 👋', 'seed'),
  ('user_inactive_3', 'in_app', 'frances', 'Psiu. Seu francês tá com saudade de ser praticado.', 'seed'),
  ('user_inactive_3', 'in_app', 'mandarim', '3 dias sem aparecer... já sinto sua falta! Bora dar um oi rapidinho? 👋', 'seed'),
  ('user_inactive_3', 'in_app', 'mandarim', 'Psiu. Seu 谢谢 tá com saudade de ser praticado.', 'seed'),

  ('user_inactive_5', 'in_app', 'frances', 'Cadê você? Seu francês continua aqui, na mesma página que você deixou 📖', 'seed'),
  ('user_inactive_5', 'in_app', 'frances', '5 dias! Que tal só um exercício rapidinho pra manter o ritmo?', 'seed'),
  ('user_inactive_5', 'in_app', 'mandarim', 'Cadê você? Seu mandarim continua aqui, na mesma página que você deixou 📖', 'seed'),
  ('user_inactive_5', 'in_app', 'mandarim', '5 dias! Que tal só um exercício rapidinho pra manter o ritmo?', 'seed'),

  ('user_inactive_7', 'in_app', 'frances', 'Uma semaninha... tá tudo bem por aí? Vem, a gente retoma juntos 🫶', 'seed'),
  ('user_inactive_7', 'in_app', 'frances', 'Seu streak tá dormindo. Que tal acordar ele com 5 minutinhos?', 'seed'),
  ('user_inactive_7', 'in_app', 'mandarim', 'Uma semaninha... tá tudo bem por aí? Vem, a gente retoma juntos 🫶', 'seed'),
  ('user_inactive_7', 'in_app', 'mandarim', 'Seu streak tá dormindo. Que tal acordar ele com 5 minutinhos?', 'seed'),

  ('user_inactive_9', 'in_app', 'frances', 'Já faz um tempinho! Sem pressa -- só lembrando que seu progresso te espera 🙂', 'seed'),
  ('user_inactive_9', 'in_app', 'frances', 'Quer retomar de onde parou? A gente te ajuda a lembrar rapidinho.', 'seed'),
  ('user_inactive_9', 'in_app', 'mandarim', 'Já faz um tempinho! Sem pressa -- só lembrando que seu progresso te espera 🙂', 'seed'),
  ('user_inactive_9', 'in_app', 'mandarim', 'Quer retomar de onde parou? A gente te ajuda a lembrar rapidinho.', 'seed'),

  ('user_inactive_15', 'in_app', 'frances', 'Sem pressa nenhuma -- mas se bater a vontade, seu progresso te espera aqui.', 'seed'),
  ('user_inactive_15', 'in_app', 'mandarim', 'Sem pressa nenhuma -- mas se bater a vontade, seu progresso te espera aqui.', 'seed'),

  ('user_inactive_20', 'in_app', 'frances', 'Seu francês segue guardadinho, do jeitinho que você deixou. Volta quando quiser 🙂', 'seed'),
  ('user_inactive_20', 'in_app', 'mandarim', 'Seu mandarim segue guardadinho, do jeitinho que você deixou. Volta quando quiser 🙂', 'seed'),

  ('user_inactive_30', 'in_app', 'frances', 'Seu progresso continua guardadinho aqui, do jeitinho que você deixou.', 'seed'),
  ('user_inactive_30', 'in_app', 'mandarim', 'Seu progresso continua guardadinho aqui, do jeitinho que você deixou.', 'seed')
on conflict (event_type, channel, language_app_key, body) do nothing;

-- ---------- notifications ----------
-- O registro que o sino lê (Fase 1) -- uma linha por notificação já
-- decidida pelo motor (passou pelo anti-spam), independente de quantos
-- canais ela dispara. action_tab (não action_url: o app navega por
-- switchTab(tab), não por URL própria por view) é a aba que o clique
-- abre, ex: 'review', 'leaderboard'.
create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  language_app_key text not null,
  category text not null,
  event_type text not null,
  title text,
  body text not null,
  action_tab text,
  read_at timestamptz,
  clicked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_unread_idx on public.notifications (user_id, read_at);
create index if not exists notifications_user_created_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

-- Insert: a própria conta grava (evento imediato client-side, Fase 1) --
-- a Edge Function usa service role e ignora RLS pros eventos calculados
-- por cron (Fase 2+). Select/update: só a própria conta lê e marca como
-- lida/clicada as próprias notificações.
drop policy if exists "notifications_owner_insert" on public.notifications;
create policy "notifications_owner_insert"
  on public.notifications
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "notifications_owner_read" on public.notifications;
create policy "notifications_owner_read"
  on public.notifications
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "notifications_owner_update" on public.notifications;
create policy "notifications_owner_update"
  on public.notifications
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------- notification_preferences ----------
-- Matriz categoria × canal por conta, mais horário silencioso -- uma
-- linha por usuário (jsonb), mesmo espírito de profiles. Default já
-- reflete a matriz recomendada na seção 10 (modo simples esconde isto,
-- mas o dado já nasce granular).
create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  channels jsonb not null default '{
    "sistema": ["in_app", "push", "email"],
    "estudo": ["in_app", "push", "email"],
    "revisao": ["in_app", "push"],
    "streak": ["in_app", "push", "email"],
    "gamificacao": ["in_app", "push"],
    "ranking": ["in_app", "push"],
    "desafios": ["in_app", "push"],
    "conteudo": ["in_app", "email"],
    "reengajamento": ["in_app", "push", "email"]
  }'::jsonb,
  quiet_hours_start smallint check (quiet_hours_start between 0 and 23),
  quiet_hours_end smallint check (quiet_hours_end between 0 and 23),
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

drop policy if exists "notification_preferences_owner_read" on public.notification_preferences;
create policy "notification_preferences_owner_read"
  on public.notification_preferences
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "notification_preferences_owner_insert" on public.notification_preferences;
create policy "notification_preferences_owner_insert"
  on public.notification_preferences
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "notification_preferences_owner_update" on public.notification_preferences;
create policy "notification_preferences_owner_update"
  on public.notification_preferences
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.notification_preferences_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_notification_preferences_set_updated_at on public.notification_preferences;
create trigger trg_notification_preferences_set_updated_at
  before update on public.notification_preferences
  for each row
  execute function public.notification_preferences_set_updated_at();

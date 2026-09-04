-- XP semanal por conta, alimentando o Ranking (Leaderboard). Granularidade
-- por idioma (language_app_key = APP_KEY de cada site, ver languages/index.js)
-- pra permitir tanto um ranking "Geral" (soma de todos os idiomas) quanto
-- um por idioma -- sem essa granularidade só um dos dois caberia aqui.
--
-- Escrito por shared/auth.js:saveState() a cada save bem-sucedido de
-- progresso, usando a MESMA segunda-feira/quantidade que já existe em
-- STATE.periodXp (ver Fase 4.3 -- currentWeekStart()/ensurePeriodXp() em
-- cada app.js). Linhas de semanas passadas não são apagadas: viram
-- histórico "de graça", útil se um ranking de semanas anteriores fizer
-- sentido no futuro -- a consulta do ranking atual simplesmente filtra por
-- week_start = semana corrente.
--
-- Não guarda nada além do número em si -- username/avatar/nome pro
-- ranking vêm de `profiles` (ver 001), mesma separação identidade/
-- progresso já estabelecida ali. É por isso que esta tabela pode ter
-- leitura pública sem nenhuma revisão extra: um inteiro não-negativo
-- ligado a um user_id, nada mais.
create table if not exists public.weekly_xp (
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  language_app_key text not null,
  amount integer not null default 0 check (amount >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, week_start, language_app_key)
);

alter table public.weekly_xp enable row level security;

-- Leitura pública -- é exatamente o que o Ranking precisa mostrar (XP de
-- QUALQUER conta, não só a própria), mesma razão de profiles/badge_catalog/
-- badge_grants (ver 001-003): nada sensível, só um número.
drop policy if exists "weekly_xp_public_read" on public.weekly_xp;
create policy "weekly_xp_public_read"
  on public.weekly_xp
  for select
  to anon, authenticated
  using (true);

-- Só a própria conta grava o próprio XP semanal (upsert = insert OU
-- update, dependendo se já existe linha pra essa semana/idioma).
drop policy if exists "weekly_xp_owner_insert" on public.weekly_xp;
create policy "weekly_xp_owner_insert"
  on public.weekly_xp
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "weekly_xp_owner_update" on public.weekly_xp;
create policy "weekly_xp_owner_update"
  on public.weekly_xp
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

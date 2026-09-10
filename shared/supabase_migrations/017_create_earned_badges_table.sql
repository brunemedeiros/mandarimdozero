-- Rollup público de badges de GAMEPLAY (BADGES em cada app.js -- Primeiro
-- Passo, Unidade 1 Completa, 100 XP...) conquistados por qualquer conta,
-- espelhando exatamente o padrão já usado por weekly_xp (ver 006): a fonte
-- de verdade continua sendo `progress` (privada, um jsonb por conta com
-- todo o STATE), mas essa tabela guarda só o que precisa ser público -- os
-- ids dos badges já ganhos, nada mais -- pra permitir ler a "vitrine" de
-- OUTRA pessoa (perfil público a partir do Ranking) sem abrir leitura
-- pública de `progress` inteira, que teria dados demais (vocabulário
-- estudado, dificuldade por palavra etc.) pra ser um risco aceitável.
--
-- Granularidade por idioma (language_app_key = APP_KEY, mesma convenção de
-- weekly_xp): BADGES é um catálogo DIFERENTE por idioma (ver o comentário
-- de saveProfileEdits() em shared/profile.js) -- um badge_id só faz
-- sentido resolvido dentro do catálogo do idioma em que foi ganho.
--
-- Escrita por upsertEarnedBadges() em shared/auth.js, chamada de dois
-- lugares em cada app.js: seedEarnedBadges() (sincroniza/faz backfill de
-- tudo que já era verdade ao carregar a sessão) e checkAndCelebrateBadges()
-- (grava só o que acabou de ser conquistado). Nunca apaga linha -- uma vez
-- ganho, o badge fica no histórico público pra sempre, mesmo idioma que a
-- própria earnedBadgeIds em memória nunca "desganha" um badge.
create table if not exists public.earned_badges (
  user_id uuid not null references auth.users(id) on delete cascade,
  language_app_key text not null,
  badge_id text not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, language_app_key, badge_id)
);

alter table public.earned_badges enable row level security;

-- Leitura pública -- é exatamente o que o perfil público (Ranking) precisa
-- mostrar, mesma razão de weekly_xp/profiles/badge_grants: só um id de
-- badge ligado a um user_id, nada sensível.
drop policy if exists "earned_badges_public_read" on public.earned_badges;
create policy "earned_badges_public_read"
  on public.earned_badges
  for select
  to anon, authenticated
  using (true);

-- Só a própria conta grava seus próprios badges (upsert = insert OU
-- no-op se a linha já existir, via onConflict no client).
drop policy if exists "earned_badges_owner_insert" on public.earned_badges;
create policy "earned_badges_owner_insert"
  on public.earned_badges
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "earned_badges_owner_update" on public.earned_badges;
create policy "earned_badges_owner_update"
  on public.earned_badges
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

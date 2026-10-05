-- Fase 8 dos Desafios: Premium protegido no SERVIDOR (NÃO APLICADA).
--
-- Problema: a policy `challenges_public_read_published` (001) deixa qualquer
-- pessoa, logada ou não, ler TODO desafio publicado pela API, inclusive os
-- Premium (data->>'moduleId' preenchido). A trava do app é só visual.
--
-- Solução (aditiva até o passo 3):
--  1) is_challenges_premium(): true para plan_tier='premium' ou a admin.
--  2) get_published_challenges(): devolve os publicados; para quem não é
--     Premium, os desafios com moduleId saem como "esqueleto" (id, type,
--     level, status e só moduleId/unitId/theme dentro de data), sem
--     perguntas, respostas, áudio ou explicações.
--  3) Troca a policy de leitura pública para só enxergar publicados SEM
--     moduleId (os abertos). Este passo muda o comportamento: um app antigo
--     que ainda faça select direto passa a ver apenas os desafios abertos.
--     Por isso só aplicar depois de publicar o código novo com
--     CHALLENGES_SERVER_GATING = true (fr/app.js).
--
-- Ordem recomendada (SQL Editor, tem DROP): Staging primeiro, depois produção.
-- Rollback: recriar a policy da 001 (using (status = 'published')).

create or replace function public.is_challenges_premium()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (auth.jwt() ->> 'email') = 'brunemed1310@gmail.com'
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.plan_tier = 'premium'
    ),
    false
  );
$$;

revoke all on function public.is_challenges_premium() from public;
grant execute on function public.is_challenges_premium() to anon, authenticated;

create or replace function public.get_published_challenges()
returns setof public.challenges
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id, c.type, c.level, c.status,
    case
      when c.data ->> 'moduleId' is null or public.is_challenges_premium()
        then c.data
      else jsonb_strip_nulls(jsonb_build_object(
        'moduleId', c.data -> 'moduleId',
        'unitId',   c.data -> 'unitId',
        'theme',    c.data -> 'theme'
      ))
    end as data,
    c.created_at, c.updated_at, c.published_at, c.published_by,
    c.rejected_at, c.rejected_by, c.unpublished_at, c.unpublished_by
  from public.challenges c
  where c.status = 'published';
$$;

revoke all on function public.get_published_challenges() from public;
grant execute on function public.get_published_challenges() to anon, authenticated;

-- PASSO 3 (só depois do código novo no ar): fecha a leitura direta dos Premium.
drop policy if exists "challenges_public_read_published" on public.challenges;
create policy "challenges_public_read_published"
  on public.challenges
  for select
  to anon, authenticated
  using (status = 'published' and (data ->> 'moduleId') is null);

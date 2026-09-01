-- Tabela de Desafios (Expressões / Ouça e traduza / Acentuação) com
-- publicação persistente real, controlada por RLS -- não mais uma
-- simulação de sessão no painel administrativo.
--
-- Formato: cada linha guarda os campos comuns (id, type, level, status)
-- como colunas de verdade, e todo o resto do desafio (o que hoje já vem
-- em challenges.js -- meaning, example, options, sentenceFr, targetText,
-- externalResources etc.) numa coluna jsonb `data`. Isso deixa o mapeamento
-- linha-do-banco -> objeto-do-app idêntico ao formato já usado no site
-- ({ id, type, level, status, ...data }), então nenhum componente de
-- renderização/preview/admin precisa mudar -- só a camada de
-- carregamento/mutação passa a falar com o Supabase em vez de mexer num
-- array em memória.
--
-- status: needs_review | approved | published | rejected
-- Só linhas com status = 'published' são visíveis pro aluno (aplicado via
-- RLS abaixo, não só por filtro no front).

create table if not exists public.challenges (
  id text primary key,
  type text not null check (type in ('expression', 'listen_translate', 'accent')),
  level text not null,
  status text not null default 'needs_review'
    check (status in ('needs_review', 'approved', 'published', 'rejected')),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  published_by text,
  rejected_at timestamptz,
  rejected_by text,
  unpublished_at timestamptz,
  unpublished_by text
);

alter table public.challenges enable row level security;

-- Qualquer pessoa (aluno logado ou não) só enxerga desafios publicados.
drop policy if exists "challenges_public_read_published" on public.challenges;
create policy "challenges_public_read_published"
  on public.challenges
  for select
  to anon, authenticated
  using (status = 'published');

-- Só a admin (identificada pelo e-mail, o mesmo já usado no front pra
-- mostrar o painel administrativo) pode ler tudo -- inclusive
-- needs_review/approved/rejected, pra alimentar a fila de revisão -- e
-- criar/editar/publicar/despublicar/rejeitar/excluir. O Postgres avalia as
-- policies com OR, então isso soma à leitura pública acima em vez de
-- restringi-la.
drop policy if exists "challenges_admin_read_all" on public.challenges;
create policy "challenges_admin_read_all"
  on public.challenges
  for select
  to authenticated
  using (auth.jwt() ->> 'email' = 'brunemed1310@gmail.com');

drop policy if exists "challenges_admin_write" on public.challenges;
create policy "challenges_admin_write"
  on public.challenges
  for insert
  to authenticated
  with check (auth.jwt() ->> 'email' = 'brunemed1310@gmail.com');

drop policy if exists "challenges_admin_update" on public.challenges;
create policy "challenges_admin_update"
  on public.challenges
  for update
  to authenticated
  using (auth.jwt() ->> 'email' = 'brunemed1310@gmail.com')
  with check (auth.jwt() ->> 'email' = 'brunemed1310@gmail.com');

drop policy if exists "challenges_admin_delete" on public.challenges;
create policy "challenges_admin_delete"
  on public.challenges
  for delete
  to authenticated
  using (auth.jwt() ->> 'email' = 'brunemed1310@gmail.com');

-- Mantém updated_at correto em qualquer UPDATE, sem depender do código do
-- front lembrar de setá-lo em cada chamada.
create or replace function public.challenges_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_challenges_set_updated_at on public.challenges;
create trigger trg_challenges_set_updated_at
  before update on public.challenges
  for each row
  execute function public.challenges_set_updated_at();

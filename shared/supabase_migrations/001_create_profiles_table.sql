-- Tabela de identidade do aluno (Meu Perfil), compartilhada entre TODOS os
-- idiomas do mesmo projeto Supabase (ver shared/supabase-client.js) -- uma
-- linha por conta, independente de quantos idiomas a pessoa estuda.
--
-- Não confundir com a tabela `progress`: `progress` guarda o ESTADO de
-- estudo de cada idioma (XP, streak, unidades concluídas...), namespaced
-- por APP_KEY dentro de uma coluna jsonb. `profiles` guarda só IDENTIDADE
-- (quem a pessoa é dentro do app), que não faz sentido duplicar por
-- idioma -- por isso é uma tabela própria, e não mais uma chave dentro do
-- jsonb de `progress`.
--
-- Campos classificados como "potencialmente público" na arquitetura do
-- Meu Perfil (username, display_name, bio, avatar_url) -- nenhum dado
-- sensível (e-mail, telefone, senha) mora aqui; esses continuam só em
-- auth.users. Isso é o que permite a leitura pública abaixo sem exigir
-- nenhuma revisão de segurança quando uma página de perfil público/
-- Leaderboard existir: a tabela já nasceu sem nada que precise ficar
-- escondido.
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  -- minúsculo, sem espaço/acento -- ver slugifyUsername() em
  -- shared/profile.js, que é quem gera/valida o valor antes de qualquer
  -- insert/update chegar aqui. O check abaixo é o cinto de segurança do
  -- lado do banco, não a validação principal.
  username text not null unique check (username ~ '^[a-z0-9_.-]{3,24}$'),
  display_name text,
  bio text check (char_length(bio) <= 160),
  -- Reservado (ver "Priorização" na arquitetura aprovada) -- upload de
  -- avatar é fase seguinte, não implementada agora.
  avatar_url text,
  -- Reservado pro futuro "1 conquista fixada no perfil/Leaderboard" --
  -- nenhuma UI usa esta coluna ainda.
  featured_badge_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Leitura pública: nenhum campo aqui é sensível (ver comentário acima), e
-- isso já deixa o schema pronto pra um perfil público/Leaderboard sem
-- precisar reabrir a policy depois. Hoje, na prática, só o próprio dono
-- lê o próprio perfil -- não existe nenhuma tela que liste perfis de
-- terceiros ainda.
drop policy if exists "profiles_public_read" on public.profiles;
create policy "profiles_public_read"
  on public.profiles
  for select
  to anon, authenticated
  using (true);

drop policy if exists "profiles_owner_insert" on public.profiles;
create policy "profiles_owner_insert"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "profiles_owner_update" on public.profiles;
create policy "profiles_owner_update"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Mesma função de updated_at já usada em challenges (001, na pasta de
-- migrations do fr) -- replicada aqui porque as duas tabelas vivem em
-- schemas de migration separados (challenges é conteúdo fr-only; profiles
-- é conta, compartilhada entre idiomas) e não faz sentido uma depender da
-- outra ter rodado antes.
create or replace function public.profiles_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_set_updated_at on public.profiles;
create trigger trg_profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.profiles_set_updated_at();

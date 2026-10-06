-- 073 -- Dados PRIVADOS do perfil (hoje: gênero).
--
-- Por quê: profiles é legível publicamente (policy profiles_public_read, migration 001), então um dado
-- sensível como gênero NUNCA pode morar lá. Esta tabela separada só pode ser lida/escrita pelo próprio dono
-- (RLS). Usada pelos placeholders de conteúdo ({nacionalidade}, {nacionalidade_t}) em
-- shared/profile-placeholders.js: masculino/feminino escolhem a forma; outro, prefiro não dizer e vazio usam
-- a forma neutra de duas terminações.
--
-- Valores: 'masculine' | 'feminine' | 'other' | 'undisclosed' | NULL (não preenchido).
--
-- Segurança:
--   * RLS ligada; 4 policies (select/insert/update/delete) só com auth.uid() = user_id. Nenhum acesso para
--     professora/admin, nenhuma leitura pública.
--   * anon SEM nenhum privilégio (revoke explícito, mesmo com o default da 065 que concederia DML a anon;
--     sem policy a RLS já bloquearia, o revoke é a segunda barreira).
--   * authenticated e service_role seguem o padrão DML da 065.
--   * on delete cascade em auth.users: apagar a conta apaga o dado.
--
-- Aditiva e idempotente. Não altera nenhuma tabela existente.
--
-- Rollback (manual): remover a tabela profile_private.

create table if not exists public.profile_private (
  user_id uuid primary key references auth.users(id) on delete cascade,
  gender text null check (gender is null or gender in ('masculine', 'feminine', 'other', 'undisclosed')),
  updated_at timestamptz not null default now()
);

alter table public.profile_private enable row level security;

-- Idempotência via pg_policies (sem remover policies; as ferramentas MCP travam nesse comando).
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profile_private' and policyname='profile_private_owner_select') then
    create policy profile_private_owner_select on public.profile_private
      for select to authenticated using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profile_private' and policyname='profile_private_owner_insert') then
    create policy profile_private_owner_insert on public.profile_private
      for insert to authenticated with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profile_private' and policyname='profile_private_owner_update') then
    create policy profile_private_owner_update on public.profile_private
      for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profile_private' and policyname='profile_private_owner_delete') then
    create policy profile_private_owner_delete on public.profile_private
      for delete to authenticated using (auth.uid() = user_id);
  end if;
end $$;

grant select, insert, update, delete on public.profile_private to authenticated, service_role;
revoke all on public.profile_private from anon;

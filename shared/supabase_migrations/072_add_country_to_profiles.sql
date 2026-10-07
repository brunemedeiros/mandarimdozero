-- País de origem do perfil (código ISO 3166-1 alfa-2, ex.: 'BR', 'US').
-- Usado pelos placeholders de conteúdo da trilha ({nacionalidade}) em
-- shared/profile-placeholders.js. Aditiva: coluna nullable, sem default
-- (NULL = o aluno não preencheu; o cliente assume Brasil nesse caso).
--
-- As proteções existentes de profiles (063/066: plan_tier/role; 060:
-- username/user_id) olham só essas colunas -- este campo NÃO é bloqueado e o
-- próprio usuário o edita pelo UPDATE normal de "Editar perfil".
--
-- ATENÇÃO (privacidade): a policy profiles_public_read (migration 001) deixa
-- qualquer um ler as colunas de profiles, então o país passa a ser legível
-- como nome/bio. Se isso não for desejado, trocar por uma view pública sem
-- a coluna antes de divulgar.
--
-- Rollback (manual): alter table public.profiles drop column if exists country;
alter table public.profiles
  add column if not exists country text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_country_format' and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_country_format check (country is null or country ~ '^[A-Z]{2}$');
  end if;
end $$;

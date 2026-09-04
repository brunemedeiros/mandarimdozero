-- Catálogo de badges especiais criados PELA ADMIN direto no app (tela
-- "Badges (admin)", só visível pra conta da autora -- ver isAdminUser em
-- cada app.js e shared/admin-badges.js). Complementa badge_grants (ver
-- 002): esta tabela guarda a DEFINIÇÃO do badge (nome, ícone, descrição);
-- badge_grants guarda QUEM recebeu QUAL badge.
--
-- Fundadora e Beta Tester (ver SPECIAL_BADGES em shared/profile.js) NÃO
-- entram aqui -- são badges por REGRA (e-mail / data de criação da conta),
-- calculados em código, sem precisar de linha nenhuma nesta tabela nem em
-- badge_grants. Esta tabela é só pra badges que exigem uma decisão manual
-- da autora (ex: reconhecer alguém que ajudou a testar/sugerir mudanças),
-- sem regra automática possível.
create table if not exists public.badge_catalog (
  id text primary key check (id ~ '^[a-z0-9_]{2,32}$'),
  name text not null check (char_length(name) <= 40),
  icon text not null check (char_length(icon) <= 8),
  description text check (char_length(description) <= 120),
  created_at timestamptz not null default now(),
  created_by text
);

alter table public.badge_catalog enable row level security;

-- Leitura pública -- mesma razão de profiles/badge_grants: nada sensível,
-- e é o que permite qualquer perfil (inclusive futuramente um perfil
-- público) mostrar o nome/ícone/descrição certos de um badge concedido.
drop policy if exists "badge_catalog_public_read" on public.badge_catalog;
create policy "badge_catalog_public_read"
  on public.badge_catalog
  for select
  to anon, authenticated
  using (true);

-- Só a autora cria ou remove badges do catálogo.
drop policy if exists "badge_catalog_admin_insert" on public.badge_catalog;
create policy "badge_catalog_admin_insert"
  on public.badge_catalog
  for insert
  to authenticated
  with check (auth.jwt() ->> 'email' = 'brunemed1310@gmail.com');

drop policy if exists "badge_catalog_admin_delete" on public.badge_catalog;
create policy "badge_catalog_admin_delete"
  on public.badge_catalog
  for delete
  to authenticated
  using (auth.jwt() ->> 'email' = 'brunemed1310@gmail.com');

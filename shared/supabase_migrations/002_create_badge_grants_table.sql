-- "Espaço" pra atribuir badges especiais (exclusivos, fora do sistema de
-- conquistas por gameplay) a contas específicas -- ex: alguém que ajudou a
-- testar/reportar erros/sugerir mudanças. Não confundir com o catálogo de
-- badges por gameplay (BADGES em cada app.js, checados contra STATE) --
-- esta tabela é só pra badges que dependem de uma decisão da autora
-- (concessão manual), não de progresso de estudo.
--
-- Os dois badges especiais atuais (Fundadora, Beta Tester -- ver
-- SPECIAL_BADGES em shared/profile.js) são calculados por REGRA (e-mail /
-- data de criação da conta), não precisam de linha nesta tabela. Ela existe
-- pronta pra quando a autora quiser conceder um badge especial a alguém
-- especificamente (sem regra automática possível), sem precisar de nova
-- migration na hora.
create table if not exists public.badge_grants (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id text not null,
  granted_at timestamptz not null default now(),
  granted_by text,
  note text,
  unique (user_id, badge_id)
);

alter table public.badge_grants enable row level security;

-- Leitura pública -- mesma razão de `profiles` (ver 001): nada sensível
-- aqui, e isso já deixa pronto pra um perfil público/Leaderboard mostrar
-- badges de qualquer conta no futuro.
drop policy if exists "badge_grants_public_read" on public.badge_grants;
create policy "badge_grants_public_read"
  on public.badge_grants
  for select
  to anon, authenticated
  using (true);

-- Só a autora concede ou revoga badges especiais.
drop policy if exists "badge_grants_admin_insert" on public.badge_grants;
create policy "badge_grants_admin_insert"
  on public.badge_grants
  for insert
  to authenticated
  with check (auth.jwt() ->> 'email' = 'brunemed1310@gmail.com');

drop policy if exists "badge_grants_admin_delete" on public.badge_grants;
create policy "badge_grants_admin_delete"
  on public.badge_grants
  for delete
  to authenticated
  using (auth.jwt() ->> 'email' = 'brunemed1310@gmail.com');

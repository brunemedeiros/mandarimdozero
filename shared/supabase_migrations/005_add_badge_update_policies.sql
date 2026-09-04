-- Complementa 002/003: as duas tabelas só tinham policy de INSERT/DELETE
-- (criar/apagar), nunca UPDATE -- então editar um badge do catálogo depois
-- de criado (id/nome/emoji/descrição) ou a nota de uma concessão específica
-- exigia excluir e recriar. Este arquivo só adiciona a policy que faltava,
-- mesma regra admin-only das outras.
drop policy if exists "badge_catalog_admin_update" on public.badge_catalog;
create policy "badge_catalog_admin_update"
  on public.badge_catalog
  for update
  to authenticated
  using (auth.jwt() ->> 'email' = 'brunemed1310@gmail.com')
  with check (auth.jwt() ->> 'email' = 'brunemed1310@gmail.com');

drop policy if exists "badge_grants_admin_update" on public.badge_grants;
create policy "badge_grants_admin_update"
  on public.badge_grants
  for update
  to authenticated
  using (auth.jwt() ->> 'email' = 'brunemed1310@gmail.com')
  with check (auth.jwt() ->> 'email' = 'brunemed1310@gmail.com');

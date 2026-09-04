-- Bucket de fotos de perfil (Meu Perfil, fase "Avatar/upload" da
-- arquitetura aprovada -- ver shared/supabase_migrations/001_create_profiles_table.sql,
-- onde a coluna profiles.avatar_url foi deixada reservada pra isso).
-- Compartilhado entre fr/zh, mesmo projeto Supabase (ver
-- shared/supabase-client.js). Um arquivo por conta, path fixo
-- `${user_id}/avatar.jpg` (upsert -- sempre sobrescreve, não acumula
-- versões antigas), gerado por shared/profile.js:uploadAvatar().
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Leitura pública: mesma lógica de `profiles` (ver 001) -- uma foto de
-- perfil não é dado sensível, e isso já deixa pronto pro futuro
-- perfil público/Leaderboard sem reabrir a policy depois.
drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'avatars');

-- Escrita só pelo dono, e só dentro da própria pasta -- o primeiro
-- segmento do path precisa ser o auth.uid() de quem está enviando, então
-- ninguém consegue sobrescrever/apagar a foto de outra conta.
drop policy if exists "avatars_owner_insert" on storage.objects;
create policy "avatars_owner_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_owner_update" on storage.objects;
create policy "avatars_owner_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_owner_delete" on storage.objects;
create policy "avatars_owner_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

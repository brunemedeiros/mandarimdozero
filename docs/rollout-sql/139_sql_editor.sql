-- 139 (SQL Editor): copia de shared/supabase_migrations/139_storage_lockdown.sql entre begin e commit.
-- Rodar PRIMEIRO no Staging (ilfjzizjfcmhibkhwber), depois na producao (eigjocalzwamisgqilhg).
begin;
-- 139: fecha as pastas de arquivos do Storage (auditoria de segurança de 2026-11-19,
-- registro em docs/historico/36-auditoria-seguranca-2026-11.md).
--
-- 1. report-screenshots (prints dos reports), decisão da dona: "só eu preciso ver".
--    Antes (021): pasta pública, qualquer visitante sem conta listava, baixava e
--    enviava arquivos de qualquer tipo e tamanho.
--    Agora: pasta privada; só a admin lê (o Painel abre o print por link
--    temporário, shared/admin-reports-ui.js); só quem está logado envia, e só
--    dentro da própria pasta (<uid>/...); só imagem de até 8 MB (o mesmo limite
--    do navegador, REPORT_SCREENSHOT_MAX_BYTES em shared/reports.js).
--    Os prints antigos continuam lá; a coluna reports.screenshot_url continua
--    guardando o endereço antigo, e o Painel tira dele o caminho do arquivo.
--
-- 2. avatars, flashcard-media e support-materials continuam PÚBLICAS (o link
--    direto da imagem/áudio/material continua abrindo para todo mundo, sem
--    passar por estas regras). O que muda é a regra de leitura pela API: antes
--    qualquer visitante LISTAVA a pasta inteira (e via os ids das contas); agora
--    cada conta só lista a própria pasta (necessário para trocar a foto, que usa
--    upsert, e para apagar o próprio arquivo).
--    avatars ganha limite de tipo e tamanho (o site sempre envia JPEG recortado).
--
-- Tem DROP POLICY: o Supabase não deixa ALTER POLICY em storage.objects
-- ("must be owner of table objects", testado no Staging em 2026-11-21) e a
-- ferramenta MCP trava em DROP. Vai pelo SQL Editor da autora:
-- docs/rollout-sql/139_sql_editor.sql (este arquivo entre begin; e commit;).

-- ---------- 1. report-screenshots ----------
update storage.buckets
   set public = false,
       file_size_limit = 8388608,
       allowed_mime_types = array['image/png','image/jpeg','image/webp','image/gif','image/heic','image/heif']
 where id = 'report-screenshots';

drop policy if exists "report_screenshots_public_read" on storage.objects;
drop policy if exists "report_screenshots_admin_read" on storage.objects;
create policy "report_screenshots_admin_read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'report-screenshots' and public.is_admin());

drop policy if exists "report_screenshots_public_insert" on storage.objects;
drop policy if exists "report_screenshots_owner_insert" on storage.objects;
create policy "report_screenshots_owner_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'report-screenshots'
              and (storage.foldername(name))[1] = (auth.uid())::text);

-- ---------- 2. pastas públicas: listar só a própria pasta ----------
update storage.buckets
   set file_size_limit = 5242880,
       allowed_mime_types = array['image/jpeg','image/png','image/webp']
 where id = 'avatars';

drop policy if exists "avatars_public_read" on storage.objects;
drop policy if exists "avatars_owner_read" on storage.objects;
create policy "avatars_owner_read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (auth.uid())::text);

drop policy if exists "flashcard_media_public_read" on storage.objects;
drop policy if exists "flashcard_media_owner_read" on storage.objects;
create policy "flashcard_media_owner_read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'flashcard-media' and (storage.foldername(name))[1] = (auth.uid())::text);

drop policy if exists "support_materials_public_read" on storage.objects;
drop policy if exists "support_materials_owner_read" on storage.objects;
create policy "support_materials_owner_read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'support-materials' and (storage.foldername(name))[1] = (auth.uid())::text);
commit;

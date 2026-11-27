-- 153: pasta "support-materials" (Material de apoio) fechada: só a aluna certa e a professora abrem o arquivo
-- (pedido da autora, 2026-11-27; docs/historico/36-auditoria-seguranca-2026-11.md).
--
-- Antes: pasta pública. O site guardava o endereço aberto do arquivo e quem tivesse o link abria sem login.
-- Agora: pasta privada; o site cria um link temporário (10 min) na hora do clique (shared/teacher-support-materials.js,
-- openSupportMaterialFile), e o Storage só assina para quem pode LER o arquivo:
--   - a professora: a própria pasta (regra support_materials_owner_read, já existia);
--   - a aluna: um arquivo que aparece num material que ELA consegue ver em teacher_support_materials. A subconsulta
--     roda com as regras (RLS) dessa tabela, então já vale "material enviado para ela + vínculo ativo com a professora".
-- Em 2026-11-27 havia 0 arquivos na pasta: nada fica quebrado. O endereço gravado em file_url não muda de formato
-- (o caminho do arquivo é tirado dele).
--
-- CREATE POLICY em storage.objects exige ser dono da tabela: aplicar pelo SQL Editor (docs/rollout-sql/153_sql_editor.sql).

update storage.buckets set public = false where id = 'support-materials';

create policy support_materials_student_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'support-materials'
    and exists (
      select 1 from public.teacher_support_materials m
       where m.file_url is not null
         and right(m.file_url, length(storage.objects.name) + 1) = '/' || storage.objects.name
    )
  );

-- Voltar atrás (SQL Editor): update storage.buckets set public = true where id = 'support-materials';
--                           drop policy support_materials_student_read on storage.objects;

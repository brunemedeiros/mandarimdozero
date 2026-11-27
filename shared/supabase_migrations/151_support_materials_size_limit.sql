-- 151: limite de tamanho na pasta "support-materials" (P2 da auditoria de 2026-11-25).
-- A pasta é pública e não tinha limite nenhum (0 arquivos em 2026-11-26). A tela já recusa arquivo acima de 50 MB
-- (TMT_MAX_FILE_BYTES em shared/teacher-materials-ui.js); agora o Storage também recusa. Tipos de arquivo continuam
-- livres (a tela aceita qualquer tipo): restringir só com a lista decidida pela autora.

update storage.buckets set file_size_limit = 52428800 where id = 'support-materials';

-- Voltar atrás: update storage.buckets set file_size_limit = null where id = 'support-materials';

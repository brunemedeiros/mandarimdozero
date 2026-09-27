-- Fase 7e (upload de áudio por Field, ver CLAUDE.md) -- endurece o bucket
-- `flashcard-media` (migration 032) no nível de INFRAESTRUTURA, não só no
-- cliente.
--
-- Achado da auditoria desta fase: o bucket sempre foi criado SEM
-- `file_size_limit`/`allowed_mime_types` (confirmado ao vivo via
-- `select * from storage.buckets where id='flashcard-media'` -- os dois
-- vinham `null` desde a criação em 2026-09-22, nunca configurados nem pela
-- migration nem pelo dashboard depois) -- ou seja, o Storage aceitava
-- QUALQUER arquivo de QUALQUER tamanho até agora; a única "validação" que
-- já existia era o atributo `accept="audio/*"` do `<input type="file">`
-- legado (shared/admin-flashcards.js/shared/my-flashcards.js), que é só um
-- filtro de picker do navegador -- nunca impede um upload via API/devtools.
-- Regra geral já travada neste arquivo ("nunca confiar somente no
-- cliente") exigia uma segunda camada de verdade -- esta migration é essa
-- camada.
--
-- Whitelist de MIME definida a partir do que o <audio> nativo do navegador
-- consegue reproduzir de forma confiável nos 2 apps (fr/zh) + o que já é
-- oferecido no `accept="audio/*"` legado -- nunca uma lista inventada sem
-- fonte. `audio/mp3` (não-oficial, mas visto na prática em alguns
-- navegadores/SOs para arquivos .mp3) incluído ao lado do `audio/mpeg`
-- oficial pela mesma razão de robustez. `audio/webm` incluído mesmo sem
-- upload de gravação implementado ainda (Fase 7g) -- é um formato de
-- upload de arquivo legítimo por si só, não exclusivo de MediaRecorder.
--
-- Verificado ao vivo ANTES desta migration: zero linha em
-- teacher_flashcards/own_flashcards tem audio_url preenchido hoje (0/7 e
-- 0/N) -- endurecer o bucket agora não quebra nenhum arquivo já
-- referenciado por um cartão real.
update storage.buckets
set
  file_size_limit = 5242880, -- 5 MiB -- ver CLAUDE.md pela justificativa completa (clipe de pronúncia/explicação curta de flashcard, não um podcast)
  allowed_mime_types = array[
    'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/aac',
    'audio/ogg', 'audio/wav', 'audio/webm', 'audio/x-m4a'
  ]
where id = 'flashcard-media';

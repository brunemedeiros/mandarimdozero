-- 072: libera imagens no bucket flashcard-media (botão "🖼️ Imagem" por
-- campo no editor de cartões, 2026-10-06). A 046 deixou o bucket só com
-- tipos de áudio; aqui acrescentamos JPG/PNG/WEBP/GIF. Limite de 5 MB e
-- policies continuam iguais. Aditiva: não muda nenhum arquivo nem linha.
update storage.buckets
set allowed_mime_types = array[
    'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/aac',
    'audio/ogg', 'audio/wav', 'audio/webm', 'audio/x-m4a',
    'image/jpeg', 'image/png', 'image/webp', 'image/gif'
  ]
where id = 'flashcard-media';

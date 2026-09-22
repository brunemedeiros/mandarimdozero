-- Fase 8a do sistema de alunas particulares (ver CLAUDE.md) -- novos
-- formatos de flashcard autorado pela professora: imagem, áudio próprio
-- (diferente do TTS automático que o app já tem) e múltipla escolha.
-- Escopo desta entrega, grillado antes de codar: só `teacher_flashcards`
-- (o cartão que a professora já cria) -- `student_flashcards` (Fase 5,
-- autoria pela própria aluna) fica de fora por enquanto, mesmo shape de
-- card resultante em STATE.cards poderia herdar isto depois sem mudança
-- de arquitetura, só não foi pedido nesta entrega.
--
-- `choices` marca o cartão como múltipla escolha: um array jsonb de
-- 1-3 respostas ERRADAS (a resposta certa continua sendo `back_trans`,
-- já existente -- nunca duplicada aqui, evita o cartão ficar com duas
-- fontes de verdade pra "qual é a certa"). null/vazio = cartão comum
-- (comportamento de sempre, vira igual a todo cartão). Grillado: quando
-- presente, o cartão SEMPRE aparece como quiz de múltipla escolha em
-- QUALQUER modo de revisão (não só Speed Review) -- decisão do lado do
-- cliente (fr/zh app.js), não precisa de mais nada aqui no schema.
alter table teacher_flashcards
  add column if not exists image_url text,
  add column if not exists audio_url text,
  add column if not exists choices jsonb;

-- Bucket de mídia de flashcard -- mesmo padrão de `avatars` (migration
-- 004): leitura pública (a aluna precisa ver/ouvir sem sessão de admin),
-- escrita restrita por pasta (primeiro segmento do path = auth.uid() de
-- quem envia, sempre a PROFESSORA aqui, nunca a aluna -- teacher_flashcards
-- só é escrito pela professora mesmo). Diferente de avatars (path fixo,
-- upsert), aqui cada upload é um arquivo NOVO (um cartão pode ter várias
-- mídias ao longo do tempo, sem sobrescrever a de outro cartão) -- mesmo
-- padrão de `report-screenshots` (021) nesse aspecto.
insert into storage.buckets (id, name, public)
values ('flashcard-media', 'flashcard-media', true)
on conflict (id) do nothing;

drop policy if exists "flashcard_media_public_read" on storage.objects;
create policy "flashcard_media_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'flashcard-media');

drop policy if exists "flashcard_media_owner_insert" on storage.objects;
create policy "flashcard_media_owner_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'flashcard-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "flashcard_media_owner_delete" on storage.objects;
create policy "flashcard_media_owner_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'flashcard-media' and (storage.foldername(name))[1] = auth.uid()::text);

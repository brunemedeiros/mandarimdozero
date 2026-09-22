-- Fase 8b do sistema de alunas particulares (ver CLAUDE.md) -- "material
-- de apoio", terceiro tipo de conteúdo desta feature e o primeiro que
-- NUNCA entra em STATE.cards/FSRS: um anexo/nota que a professora
-- compartilha com a aluna, não algo revisável. title obrigatório;
-- description/link_url/file_url todos opcionais individualmente (checado
-- no cliente, mesmo nível de rigor de teacher_class_logs -- pelo menos 1
-- dos 3 precisa estar presente pra o material fazer sentido).
create table if not exists teacher_support_materials (
  id bigint generated always as identity primary key,
  teacher_id uuid not null references auth.users(id),
  student_id uuid not null references auth.users(id),
  language_app_key text not null check (language_app_key in ('frances', 'mandarim', 'portugues')),
  title text not null,
  description text,
  link_url text,
  file_url text,
  file_name text,
  created_at timestamptz not null default now()
);

alter table teacher_support_materials enable row level security;

-- Professora gerencia (criar/editar/apagar) só o que ela mesma criou --
-- grillado: edição/exclusão físicas desde já (sem estado de memória FSRS
-- dependente da linha, mesmo raciocínio de teacher_class_logs).
drop policy if exists "teacher_support_materials_teacher_all" on teacher_support_materials;
create policy "teacher_support_materials_teacher_all"
  on teacher_support_materials for all
  using (auth.uid() = teacher_id)
  with check (auth.uid() = teacher_id);

-- Aluna só LÊ o que foi atribuído a ela -- grillado: ela é destinatária
-- passiva nesta fase, sem autoria própria (diferente de student_flashcards,
-- Fase 5).
drop policy if exists "teacher_support_materials_student_read" on teacher_support_materials;
create policy "teacher_support_materials_student_read"
  on teacher_support_materials for select
  using (auth.uid() = student_id);

-- Bucket de Storage pros arquivos anexados (PDF, imagem, doc etc.) --
-- mesmo padrão RLS do bucket flashcard-media (migration 032): leitura
-- pública, escrita restrita à pasta do próprio auth.uid() (sempre a
-- PROFESSORA aqui), path com componente aleatório (não upsert/fixo).
insert into storage.buckets (id, name, public)
values ('support-materials', 'support-materials', true)
on conflict (id) do nothing;

drop policy if exists "support_materials_public_read" on storage.objects;
create policy "support_materials_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'support-materials');

drop policy if exists "support_materials_owner_insert" on storage.objects;
create policy "support_materials_owner_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'support-materials' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "support_materials_owner_delete" on storage.objects;
create policy "support_materials_owner_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'support-materials' and (storage.foldername(name))[1] = auth.uid()::text);

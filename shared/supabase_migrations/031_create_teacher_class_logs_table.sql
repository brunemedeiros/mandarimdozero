-- Fase 7 do sistema de alunas particulares (ver CLAUDE.md) -- histórico de
-- "Aula": a professora registra, por aluna, o que foi trabalhado numa aula
-- específica. Diferente de teacher_flashcards/student_flashcards, isto não
-- entra em STATE.cards nem no motor de revisão -- é um diário de bordo da
-- professora sobre suas próprias aulas, não conteúdo revisável.
--
-- Grillado com a autora antes de codar (3 perguntas):
-- 1) Conteúdo: texto livre + campos estruturados opcionais (tópico, lição
--    de casa, observações) -- todos os 4 campos são opcionais, mas pelo
--    menos 1 é exigido no app (validação client-side em
--    shared/teacher-class-logs.js, não em CHECK constraint aqui -- mesmo
--    nível de rigor de outras validações de conteúdo já existentes no
--    app, ex. front/back de teacher_flashcards).
-- 2) Visibilidade: só a professora -- por isso RLS é uma única policy
--    (auth.uid() = teacher_id), sem nenhuma leitura pro lado da aluna
--    (diferente de teacher_flashcards, que tem policy própria pra
--    student_id = auth.uid()).
-- 3) Edição/exclusão: permitidas desde já -- diferente de
--    teacher_flashcards/student_flashcards (que usam status:'archived'
--    em vez de delete, pra preservar progresso de memória FSRS
--    acumulado), uma entrada de aula não tem nenhum estado de memória
--    dependente dela -- DELETE físico é seguro aqui, sem o mesmo motivo
--    pra soft-delete.
--
-- class_date é só DATA (sem hora) -- a autora relatou que registra várias
-- aulas juntas no fim do dia, então uma hora "de criação" automática
-- ficaria errada pra todas as entradas de um mesmo lote. Default = hoje,
-- mas editável no formulário (ela pode registrar uma aula de um dia
-- anterior).
create table if not exists teacher_class_logs (
  id bigint generated always as identity primary key,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  language_app_key text not null check (language_app_key in ('frances', 'mandarim', 'portugues')),
  class_date date not null default current_date,
  topic text,
  homework text,
  observations text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists teacher_class_logs_lookup_idx
  on teacher_class_logs (teacher_id, student_id, language_app_key, class_date desc);

alter table teacher_class_logs enable row level security;

-- Uma política só -- o dono (professora) lê/cria/edita/apaga suas próprias
-- entradas, ninguém mais (nem a aluna) tem nenhum acesso. Mesmo padrão de
-- "for all using/with check" já usado em student_flashcards (migration
-- 028), onde autor e dono também são a mesma pessoa.
create policy teacher_class_logs_owner_all on teacher_class_logs
  for all using (auth.uid() = teacher_id) with check (auth.uid() = teacher_id);

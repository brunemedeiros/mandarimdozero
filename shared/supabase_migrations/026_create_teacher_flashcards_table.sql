-- Fase 2 do sistema de alunas particulares (ver CLAUDE.md) -- flashcards
-- autorados por uma professora e atribuídos a uma aluna específica.
--
-- Escopo desta fase, de propósito: só o MODELO DE DADOS + autoria pela
-- professora. Este cartão NÃO entra em STATE.cards nem na fila de revisão
-- (getStudyQueue/FSRS) ainda -- isso é Fase 3 ("integração com revisão"),
-- travada como fase separada no prompt-mestre desta feature. A aluna não
-- tem hoje nenhuma tela que leia esta tabela.
--
-- Por que tabela própria (não uma linha solta em `progress`/`profiles`):
-- mesmo raciocínio já usado em `teacher_students` (migration 025) --
-- múltiplas linhas por aluna, dono é a professora que autorou, e o card
-- "pertence" à aluna (biblioteca dela) mas tem ORIGEM na professora --
-- ver distinção dono x origem no topo da seção do CLAUDE.md sobre esta
-- feature. Quando a Fase 3 vier, o join natural é por `student_id` +
-- `language_app_key`, o mesmo par que `teacher_students` já usa.
create table if not exists public.teacher_flashcards (
  id bigint generated always as identity primary key,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  language_app_key text not null check (language_app_key in ('frances', 'mandarim', 'portugues')),
  front text not null,
  back_trans text not null,
  -- Nota opcional da professora sobre o cartão (contexto, dica de uso) --
  -- não confundir com whyNote/usageNote do conteúdo de trilha, é um campo
  -- livre por cartão.
  note text,
  -- 'archived' em vez de delete físico: mesmo princípio geral do
  -- prompt-mestre desta feature ("nunca apagar histórico/dado ao remover
  -- associação") aplicado aqui por precaução -- quando a Fase 3 ligar isto
  -- à revisão, um cartão arquivado não devia levar junto qualquer estado
  -- de memória que a aluna já tenha acumulado nele.
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now()
);

alter table public.teacher_flashcards enable row level security;

-- Mesmo padrão de leitura de teacher_students (025): professora vê os
-- cartões que ela mesma autorou; aluna vê os cartões atribuídos a ela
-- (schema já pronto pra Fase 3 poder ler isso do lado da aluna, mesmo
-- que nenhuma tela dela use isso ainda nesta fase).
drop policy if exists teacher_flashcards_teacher_read on public.teacher_flashcards;
create policy teacher_flashcards_teacher_read on public.teacher_flashcards
  for select using (auth.uid() = teacher_id);

drop policy if exists teacher_flashcards_student_read on public.teacher_flashcards;
create policy teacher_flashcards_student_read on public.teacher_flashcards
  for select using (auth.uid() = student_id);

-- Escrita (insert/update/delete) só pra administração da plataforma, mesmo
-- padrão de 023/025 (e-mail hardcoded, mesma identidade admin que
-- isAdminUser() já usa no cliente).
drop policy if exists teacher_flashcards_admin_write on public.teacher_flashcards;
create policy teacher_flashcards_admin_write on public.teacher_flashcards
  for all using (auth.jwt() ->> 'email' = 'brunemed1310@gmail.com')
  with check (auth.jwt() ->> 'email' = 'brunemed1310@gmail.com');

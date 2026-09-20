-- Fase 1 do sistema de alunos particulares (ver CLAUDE.md, auditoria
-- 2026-09-19): vínculo professora <-> aluno. Tabela separada de `profiles`
-- (não um `profiles.teacher_id`) de propósito -- já nasce pronta se um dia
-- existir mais de uma professora, sem reescrever nada; hoje, na prática,
-- toda linha terá a autora como teacher_id.
--
-- language_app_key existe porque, confirmado com a autora, cada aluno vale
-- pra exatamente 1 idioma -- a mesma conta pode ter progresso em fr E zh
-- (progress é namespaced por idioma), mas como ALUNA dela a pessoa é
-- sempre de um idioma só (ex: aluna de francês que também estuda mandarim
-- sozinha, sem aula). Sem essa coluna o vínculo seria ambíguo assim que
-- Português para Estrangeiros existir e a mesma pessoa puder estudar dois
-- idiomas com ela. 'portugues' já é um valor aceito aqui (mesmo decisão
-- registrada no CLAUDE.md) -- só o valor no enum, nenhuma mudança visual
-- no site ainda: não existe `languages/pt/` nem conteúdo, é só o schema já
-- não precisar de outra migration quando o curso existir de verdade.
create table if not exists public.teacher_students (
  id bigint generated always as identity primary key,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  language_app_key text not null check (language_app_key in ('frances', 'mandarim', 'portugues')),
  status text not null default 'active' check (status in ('active', 'invited', 'removed')),
  created_at timestamptz not null default now(),
  unique (teacher_id, student_id, language_app_key)
);

alter table public.teacher_students enable row level security;

-- Leitura: a própria professora vê os próprios vínculos; o próprio aluno
-- vê que tem uma professora (não vê a lista de OUTROS alunos dela).
drop policy if exists "teacher_students_teacher_read" on public.teacher_students;
create policy "teacher_students_teacher_read"
  on public.teacher_students
  for select
  to authenticated
  using (auth.uid() = teacher_id);

drop policy if exists "teacher_students_student_read" on public.teacher_students;
create policy "teacher_students_student_read"
  on public.teacher_students
  for select
  to authenticated
  using (auth.uid() = student_id);

-- Escrita: só admin por enquanto -- mesmo padrão de badge_grants (na
-- prática só a autora, único 'admin' hoje via backfill da 024). Restritivo
-- de propósito: não presume um fluxo de convite onde a própria professora
-- se vincularia sozinha (só existe uma professora hoje) -- revisar quando
-- isso mudar, não decisão desta Fase 1.
drop policy if exists "teacher_students_admin_write" on public.teacher_students;
create policy "teacher_students_admin_write"
  on public.teacher_students
  for all
  to authenticated
  using (auth.jwt() ->> 'email' = 'brunemed1310@gmail.com')
  with check (auth.jwt() ->> 'email' = 'brunemed1310@gmail.com');

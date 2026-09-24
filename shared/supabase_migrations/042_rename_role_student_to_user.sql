-- Renomeia o valor de enum 'student' -> 'user' em profiles.role.
--
-- Motivação: a autora perguntou se o default 'student' de profiles.role
-- (migration 024) não era uma inconsistência de terminologia com o
-- restante da feature de alunas particulares, onde "aluno/a" sempre
-- significa vínculo FORMAL numa linha ativa de teacher_students (ver
-- CLAUDE.md, seção "Auditoria de terminologia 'aluno/student' x
-- 'usuário/user'"). Confirmado que era mesmo -- o comentário da própria
-- migration 024 ("toda conta existente já é implicitamente aluna")
-- reusava exatamente a palavra que o resto do código reserva pro vínculo
-- formal. Sem bug funcional (nenhum call site fazia `role === 'student'`
-- pra decidir vínculo -- isCardLessonCompleted/hasActiveTeacherLink etc.
-- sempre leram teacher_students, nunca profiles.role), mas a colisão de
-- nome era real e podia confundir uma sessão futura. Pedido explícito da
-- autora: "Rename it, run the migration. From 'student' to 'user'".
--
-- `role` continua um papel de PLATAFORMA (user/teacher/admin) --
-- distinto do "aluno formal" (vínculo em teacher_students), que nunca
-- teve nada a ver com esta coluna.
alter table public.profiles
  drop constraint if exists profiles_role_check;

update public.profiles
set role = 'user'
where role = 'student';

alter table public.profiles
  alter column role set default 'user';

alter table public.profiles
  add constraint profiles_role_check
    check (role in ('user', 'teacher', 'admin'));

-- Fase 1 do sistema de alunos particulares (ver CLAUDE.md, auditoria
-- 2026-09-19): primeira peça de um modelo real de "quem é aluno x quem é
-- professora", substituindo (só pra código NOVO -- ver abaixo) o teste de
-- igualdade de e-mail hardcoded que hoje é a única forma de "papel" que
-- existe na plataforma (isAdminUser()).
--
-- Vive em profiles (mesmo padrão de admin_mode/exclude_own_activity --
-- atributo de CONTA, uma linha por pessoa, compartilhado entre idiomas,
-- nunca por idioma dentro do jsonb de progress).
--
-- Default 'student': zero regressão -- toda conta existente hoje já é
-- implicitamente aluna, ninguém perde acesso a nada.
--
-- 'admin' e não só 'teacher': a autora já é mais que professora -- também é
-- a super-admin de plataforma (Badges/Analytics/Reports/Notificações no
-- Painel de Admin). Separar os dois papéis agora, mesmo com um só valendo
-- hoje, evita reabrir esta migration se um dia existir mais de uma
-- professora (cada uma só deveria ver OS PRÓPRIOS alunos, não o Painel de
-- Admin inteiro).
--
-- IMPORTANTE: esta migration só cria e povoa a coluna. isAdminUser()
-- (fr/app.js, zh/app.js) continua lendo o e-mail hardcoded -- migrar os
-- call sites existentes pra ler `role` é uma decisão à parte, fora do
-- escopo desta Fase 1 (ver riscos registrados no CLAUDE.md).
alter table public.profiles
  add column if not exists role text not null default 'student'
    check (role in ('student', 'teacher', 'admin'));

update public.profiles
set role = 'admin'
where user_id in (select id from auth.users where email = 'brunemed1310@gmail.com')
  and role <> 'admin';

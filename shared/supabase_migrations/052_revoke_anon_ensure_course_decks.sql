-- Fase E -- correção de segurança encontrada pelo teste real (tests/fase-e/
-- test_supabase_real.sql): a migration 051 fez `revoke ... from public` +
-- `grant ... to authenticated` em ensure_course_decks(), mas o Supabase
-- concede EXECUTE a `anon` por default privileges do schema public --
-- um grant DIRETO que `revoke from public` não remove. Resultado: um
-- visitante anônimo (guest) conseguia executar a função SECURITY DEFINER
-- e criar/renomear Course Decks. Revoga só de `anon` (a 051 não é alterada).
revoke execute on function public.ensure_course_decks(text, jsonb) from anon;

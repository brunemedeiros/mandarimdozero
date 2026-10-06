-- Desafios (fr), Fase 7: novo tipo "Complete a frase" (type 'cloze_grammar').
--
-- A tabela public.challenges (001_create_challenges_table.sql, nesta mesma
-- pasta) tem um CHECK inline em `type` que só aceita expression /
-- listen_translate / accent. Sem ampliar o CHECK, importar um desafio
-- cloze_grammar falha no INSERT. Esta migration troca o CHECK por um que
-- inclui 'cloze_grammar'. Não toca em linha nenhuma, nem em RLS.
--
-- Por que nesta pasta (fr/scripts/supabase_migrations) e não em
-- shared/supabase_migrations: a tabela challenges nasceu aqui (001-006) e o
-- próximo número livre em shared (070) já está reservado no CLAUDE.md para o
-- hardening pós-P8 do Public Deck.
--
-- STATUS: NÃO APLICADA. Tem DROP (de constraint), então vai pelo SQL Editor
-- do Supabase (as ferramentas MCP travam em DROP), aplicada pela autora,
-- primeiro no Staging e depois na produção, colando entre begin; / commit;.
-- O nome do CHECK inline gerado pelo Postgres costuma ser
-- challenges_type_check, mas o bloco abaixo acha o CHECK de `type` pela
-- definição, sem depender do nome.

do $$
declare r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'public.challenges'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%type%listen_translate%'
  loop
    execute format('alter table public.challenges drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.challenges
  add constraint challenges_type_check
  check (type in ('expression', 'listen_translate', 'accent', 'cloze_grammar'));

-- Verificação (só leitura):
-- select conname, pg_get_constraintdef(oid) from pg_constraint
--  where conrelid = 'public.challenges'::regclass and contype = 'c';

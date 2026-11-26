-- Migration 149 (resumo semanal + motivos de saída). Rodar no Staging (ou local); tudo em transação com ROLLBACK, zero resíduo.
-- Esperado: todas as linhas com ok = true.
begin;
with chk as (
  select 'tabela prefs existe, RLS ligada' k, (select relrowsecurity from pg_class where oid = 'public.teacher_cards_digest_prefs'::regclass) ok
  union all select 'tabela motivos existe, RLS ligada', (select relrowsecurity from pg_class where oid = 'public.cards_digest_exit_reasons'::regclass)
  union all select 'anon sem acesso às tabelas', not has_table_privilege('anon', 'public.teacher_cards_digest_prefs', 'select') and not has_table_privilege('anon', 'public.cards_digest_exit_reasons', 'select') and not has_table_privilege('anon', 'public.cards_digest_exit_reasons', 'insert')
  union all select 'authenticated sem acesso às tabelas', not has_table_privilege('authenticated', 'public.teacher_cards_digest_prefs', 'select') and not has_table_privilege('authenticated', 'public.cards_digest_exit_reasons', 'select') and not has_table_privilege('authenticated', 'public.cards_digest_exit_reasons', 'insert')
  union all select 'motivos sem coluna de usuário nem e-mail', not exists (select 1 from information_schema.columns where table_name = 'cards_digest_exit_reasons' and column_name in ('user_id', 'email', 'student_id'))
  union all select 'log ganhou frequency com padrão diario', exists (select 1 from information_schema.columns where table_name = 'teacher_cards_digest_log' and column_name = 'frequency' and column_default like '%diario%')
  union all select 'função do resumo: security definer + search_path', (select prosecdef and proconfig::text like '%search_path=public%' from pg_proc where oid = 'public.cards_digest_exit_summary()'::regprocedure)
  union all select 'função do resumo: anon sem execute, authenticated com', not has_function_privilege('anon', 'public.cards_digest_exit_summary()', 'execute') and has_function_privilege('authenticated', 'public.cards_digest_exit_summary()', 'execute')
)
select k, ok from chk;
-- constraints (cada insert inválido precisa falhar; o válido passa; tudo some no rollback)
do $$
declare ok_val boolean := true; msg text;
begin
  insert into public.cards_digest_exit_reasons (reason, action, lang) values ('muitos_emails', 'sair', 'pt');
  insert into public.cards_digest_exit_reasons (reason, other_text, action, lang) values ('outro', 'texto livre', 'semanal', 'en');
  begin insert into public.cards_digest_exit_reasons (reason, action) values ('inventado', 'sair'); ok_val := false; exception when check_violation then null; end;
  begin insert into public.cards_digest_exit_reasons (reason, action) values ('outro', 'apagar'); ok_val := false; exception when check_violation then null; end;
  begin insert into public.cards_digest_exit_reasons (reason, other_text, action) values ('outro', repeat('x', 201), 'sair'); ok_val := false; exception when check_violation then null; end;
  begin insert into public.cards_digest_exit_reasons (reason, action, lang) values ('outro', 'sair', 'es'); ok_val := false; exception when check_violation then null; end;
  begin insert into public.teacher_cards_digest_prefs (user_id, frequency) select id, 'mensal' from auth.users limit 1; ok_val := false; exception when check_violation then null; end;
  if not ok_val then raise exception 'constraint nao barrou'; end if;
  raise notice 'constraints ok';
end $$;
-- a função do resumo recusa quem não é professora (sem login = sem permissão)
do $$
begin
  begin perform public.cards_digest_exit_summary(); raise exception 'deveria ter recusado'; exception when others then
    if sqlerrm <> 'forbidden' then raise; end if;
  end;
  raise notice 'forbidden ok';
end $$;
rollback;

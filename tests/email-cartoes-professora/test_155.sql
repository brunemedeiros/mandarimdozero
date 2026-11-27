-- Migration 155 (motivos anônimos de verdade + resumo semanal na matriz de preferências). Rodar no Staging (ou local);
-- tudo em transação desfeita, zero resíduo. Esperado: todas as linhas com ok = true e o RESULTADO final com "zero resíduo".
with chk as (
  select 'RLS ligada' k, (select relrowsecurity from pg_class where oid = 'public.cards_digest_exit_answers'::regclass) ok
  union all select 'anon e authenticated sem acesso', not has_table_privilege('anon', 'public.cards_digest_exit_answers', 'select') and not has_table_privilege('authenticated', 'public.cards_digest_exit_answers', 'select') and not has_table_privilege('authenticated', 'public.cards_digest_exit_answers', 'insert')
  union all select 'sem conta, e-mail nem hora (nenhuma coluna de timestamp)', (select count(*) = 0 from information_schema.columns where table_name = 'cards_digest_exit_answers' and (column_name in ('user_id', 'email', 'student_id', 'created_at', 'updated_at') or data_type like 'timestamp%'))
  union all select 'week_of é date e id é uuid', (select count(*) = 2 from information_schema.columns where table_name = 'cards_digest_exit_answers' and ((column_name = 'week_of' and data_type = 'date') or (column_name = 'id' and data_type = 'uuid')))
  union all select 'função: definer + search_path + grants', (select prosecdef and proconfig::text like '%search_path=public%' from pg_proc where oid = 'public.cards_digest_exit_summary()'::regprocedure) and not has_function_privilege('anon', 'public.cards_digest_exit_summary()', 'execute') and has_function_privilege('authenticated', 'public.cards_digest_exit_summary()', 'execute')
)
select jsonb_agg(jsonb_build_object('k', k, 'ok', ok)) from chk;
do $$
declare w1 date; w2 date; n0 int; n1 int; e text := '';
begin
  select count(*) into n0 from public.cards_digest_exit_answers;
  begin
    insert into public.cards_digest_exit_answers (reason, action, lang) values ('sem_tempo', 'sair', 'pt');
    insert into public.cards_digest_exit_answers (reason, other_text, action, lang) values ('outro', 'texto', 'semanal', 'en');
    select min(week_of), max(week_of) into w1, w2 from public.cards_digest_exit_answers;
    e := e || 'semana_segunda=' || (extract(isodow from w1) = 1) || ' mesma_semana=' || (w1 = w2);
    begin insert into public.cards_digest_exit_answers (reason, action) values ('inventado', 'sair'); e := e || ' CONSTRAINT_FALHOU'; exception when check_violation then e := e || ' constraint_ok'; end;
    raise exception 'ROLLBACK_PROPOSITAL';
  exception when others then e := e || ' | ' || sqlerrm;
  end;
  select count(*) into n1 from public.cards_digest_exit_answers;
  begin perform public.cards_digest_exit_summary(); e := e || ' | summary_NAO_recusou'; exception when others then e := e || ' | summary: ' || sqlerrm; end;
  raise exception 'RESULTADO: % | antes % depois % (zero resíduo se iguais)', e, n0, n1;
end $$;

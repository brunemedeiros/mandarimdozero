-- 156 (ligação do Google Agenda / Notion só confirmada pela sessão logada). Transação + ROLLBACK.
-- Postgres local (run.sh) e também o Staging (mesmo arquivo, com raise no fim no lugar do rollback: ver run.sh).
begin;
create temp table r(ok boolean, name text) on commit drop;
insert into auth.users(id, email) values ('15600000-0000-0000-0000-0000000000a1','zz-oauth-a@example.invalid'),
 ('15600000-0000-0000-0000-0000000000b1','zz-oauth-b@example.invalid');

-- Ligação ativa antiga de A: a pendência não pode substituí-la antes da confirmação.
insert into google_calendar_connections(user_id, google_email, refresh_token, scopes)
 values ('15600000-0000-0000-0000-0000000000a1', 'antiga@x.invalid', 'REFRESH-ANTIGO', 's');

select oauth_pending_save('google', '15600000-0000-0000-0000-0000000000a1', repeat('a', 64),
  '{"email":"nova@x.invalid","refresh_token":"REFRESH-NOVO","scopes":"s2","calendars":[{"id":"cal1","summary":"Trabalho","primary":true}]}');
insert into r select refresh_token = 'REFRESH-ANTIGO', 'pendência não troca a ligação ativa' from google_calendar_connections where user_id = '15600000-0000-0000-0000-0000000000a1';
insert into r select payload is not null and consumed_at is null, 'pendência guardada (só hash)' from oauth_pending_links where code_hash = repeat('a', 64);

-- B tenta confirmar a de A: recusado, pendência descartada (tokens apagados), ligação de A intacta.
insert into r select oauth_pending_confirm('google', repeat('a', 64), '15600000-0000-0000-0000-0000000000b1') ->> 'error' = 'not_same_user', 'B confirmando a de A = not_same_user';
insert into r select payload is null and outcome = 'not_same_user', 'pendência descartada e sem tokens' from oauth_pending_links where code_hash = repeat('a', 64);
insert into r select refresh_token = 'REFRESH-ANTIGO', 'ligação de A não mudou' from google_calendar_connections where user_id = '15600000-0000-0000-0000-0000000000a1';
insert into r select oauth_pending_confirm('google', repeat('a', 64), '15600000-0000-0000-0000-0000000000a1') ->> 'error' = 'already_used', 'A depois da tentativa de B = já usado';
insert into r select not exists (select 1 from google_calendar_connections where user_id = '15600000-0000-0000-0000-0000000000b1'), 'B não ganhou ligação';

-- A confirma a própria: ativa (refresh novo + agendas), uso único.
select oauth_pending_save('google', '15600000-0000-0000-0000-0000000000a1', repeat('b', 64),
  '{"email":"nova@x.invalid","refresh_token":"REFRESH-NOVO","scopes":"s2","calendars":[{"id":"cal1","summary":"Trabalho","primary":true}]}');
insert into r select (oauth_pending_confirm('google', repeat('b', 64), '15600000-0000-0000-0000-0000000000a1') ->> 'ok')::boolean, 'A confirma a própria = ok';
insert into r select refresh_token = 'REFRESH-NOVO' and google_email = 'nova@x.invalid', 'ligação ativada com o token novo' from google_calendar_connections where user_id = '15600000-0000-0000-0000-0000000000a1';
insert into r select count(*) = 1, 'agendas gravadas' from google_calendar_sources where user_id = '15600000-0000-0000-0000-0000000000a1' and calendar_id = 'cal1';
insert into r select payload is null and outcome = 'confirmed', 'pendência usada sem tokens' from oauth_pending_links where code_hash = repeat('b', 64);
insert into r select oauth_pending_confirm('google', repeat('b', 64), '15600000-0000-0000-0000-0000000000a1') ->> 'error' = 'already_used', 'código reusado = recusado';

-- Expirado.
select oauth_pending_save('google', '15600000-0000-0000-0000-0000000000a1', repeat('c', 64), '{"refresh_token":"X"}');
update oauth_pending_links set expires_at = now() - interval '1 second' where code_hash = repeat('c', 64);
insert into r select oauth_pending_confirm('google', repeat('c', 64), '15600000-0000-0000-0000-0000000000a1') ->> 'error' = 'expired', 'código expirado = expired';
insert into r select payload is null and outcome = 'expired', 'expirado perde os tokens' from oauth_pending_links where code_hash = repeat('c', 64);
insert into r select refresh_token = 'REFRESH-NOVO', 'expirado não mexe na ligação' from google_calendar_connections where user_id = '15600000-0000-0000-0000-0000000000a1';

-- Inexistente, serviço trocado, sem pessoa.
insert into r select oauth_pending_confirm('google', repeat('d', 64), '15600000-0000-0000-0000-0000000000a1') ->> 'error' = 'not_found', 'código inexistente = not_found';
select oauth_pending_save('notion', '15600000-0000-0000-0000-0000000000a1', repeat('e', 64), '{"access_token":"NTOK","workspace_name":"WS"}');
insert into r select oauth_pending_confirm('google', repeat('e', 64), '15600000-0000-0000-0000-0000000000a1') ->> 'error' = 'not_found', 'código do Notion não vale no Google';
insert into r select oauth_pending_confirm('notion', repeat('e', 64), null) ->> 'error' = 'not_same_user', 'sem pessoa = not_same_user';

-- Notion: nova pendência substitui a anterior aberta; A confirma.
select oauth_pending_save('notion', '15600000-0000-0000-0000-0000000000a1', repeat('f', 64), '{"access_token":"NTOK1","workspace_name":"WS1"}');
select oauth_pending_save('notion', '15600000-0000-0000-0000-0000000000a1', repeat('1', 64), '{"access_token":"NTOK2","workspace_name":"WS2","workspace_id":"w2","bot_id":"b2"}');
insert into r select outcome = 'replaced' and payload is null, 'pendência anterior substituída' from oauth_pending_links where code_hash = repeat('f', 64);
insert into r select not exists (select 1 from notion_connections where user_id = '15600000-0000-0000-0000-0000000000a1'), 'Notion não ligado antes da confirmação';
insert into r select (oauth_pending_confirm('notion', repeat('1', 64), '15600000-0000-0000-0000-0000000000a1') ->> 'ok')::boolean, 'Notion: A confirma = ok';
insert into r select access_token = 'NTOK2' and workspace_name = 'WS2' and bot_id = 'b2', 'Notion ligado com o token novo' from notion_connections where user_id = '15600000-0000-0000-0000-0000000000a1';
insert into r select oauth_pending_confirm('notion', repeat('f', 64), '15600000-0000-0000-0000-0000000000a1') ->> 'error' = 'already_used', 'substituída não confirma depois';

-- Argumentos inválidos.
do $$ begin perform oauth_pending_save('github', '15600000-0000-0000-0000-0000000000a1', repeat('2', 64), '{}'); insert into r values (false, 'serviço inválido recusado');
exception when others then insert into r values (true, 'serviço inválido recusado'); end $$;
do $$ begin perform oauth_pending_save('google', '15600000-0000-0000-0000-0000000000a1', 'CODIGO-CRU', '{}'); insert into r values (false, 'código cru (não hash) recusado');
exception when others then insert into r values (true, 'código cru (não hash) recusado'); end $$;

-- Permissões: só service_role.
insert into r select not has_function_privilege('authenticated', 'public.oauth_pending_confirm(text, text, uuid)', 'execute')
  and not has_function_privilege('anon', 'public.oauth_pending_confirm(text, text, uuid)', 'execute')
  and not has_function_privilege('authenticated', 'public.oauth_pending_save(text, uuid, text, jsonb)', 'execute')
  and not has_function_privilege('anon', 'public.oauth_pending_save(text, uuid, text, jsonb)', 'execute'), 'funções fechadas para anon e authenticated';
insert into r select has_function_privilege('service_role', 'public.oauth_pending_confirm(text, text, uuid)', 'execute'), 'service_role executa';
insert into r select not has_table_privilege('authenticated', 'public.oauth_pending_links', 'select')
  and not has_table_privilege('anon', 'public.oauth_pending_links', 'select'), 'tabela fechada';
insert into r select relrowsecurity, 'RLS ligada' from pg_class where oid = 'public.oauth_pending_links'::regclass;
insert into r select bool_and(prosecdef and proconfig::text like '%search_path=public%'), 'security definer + search_path'
  from pg_proc where proname in ('oauth_pending_save', 'oauth_pending_confirm') and pronamespace = 'public'::regnamespace;

select (case when ok then 'ok   ' else 'FALHOU ' end) || name from r;
select count(*) filter (where ok) || '/' || count(*) || ' verificações (156)' from r;
rollback;

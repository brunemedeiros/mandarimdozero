-- Fase E -- teste REAL contra o Postgres do Supabase (projeto eigjocalzwamisgqilhg).
-- Tudo dentro de UMA transação com ROLLBACK final -- nenhum resíduo.
-- Executado via mcp__Supabase__execute_sql. Resultados voltam na mensagem de erro final (rollback garantido).
begin;
create temp table t_res(name text, ok boolean, detail text);
grant all on t_res to public;

-- 1) authenticated cria (fr: 3 units, uma delas com id "A1-1", outra texto qualquer)
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000aa","role":"authenticated"}', true);
select count(*) from ensure_course_decks('frances', '[{"unit_id":"A1-1","title":"Cumprimentar"},{"unit_id":"A1-2","title":"Se apresentar"},{"unit_id":"A1-3","title":"Números"}]'::jsonb);
insert into t_res select 'root: exatamente 1 por idioma', count(*)=1, count(*)::text from decks where kind='course' and language_app_key='frances' and course_unit_id is null;
insert into t_res select 'root: parent null/owner null/teacher null/is_public false', bool_and(parent_deck_id is null and owner_id is null and teacher_id is null and not is_public), '' from decks where kind='course' and course_unit_id is null;
insert into t_res select 'Unit Decks: 3 com course_unit_id textual', count(*)=3, string_agg(course_unit_id, ',' order by course_unit_id) from decks where kind='course' and course_unit_id is not null;
insert into t_res select 'Unit Decks: parent = root do mesmo idioma', bool_and(u.parent_deck_id = r.id), '' from decks u join decks r on r.kind='course' and r.course_unit_id is null and r.language_app_key=u.language_app_key where u.course_unit_id is not null;
insert into t_res select 'Unit Decks: owner/teacher nulos, is_public false', bool_and(owner_id is null and teacher_id is null and not is_public and kind='course'), '' from decks where course_unit_id is not null;
-- idempotência (+ renomeia título)
select count(*) from ensure_course_decks('frances', '[{"unit_id":"A1-1","title":"Cumprimentar (renomeado)"},{"unit_id":"A1-2","title":"Se apresentar"},{"unit_id":"A1-3","title":"Números"}]'::jsonb);
insert into t_res select 'idempotente: continua 1 root + 3 units', (select count(*) from decks where kind='course')=4, (select count(*)::text from decks where kind='course');
insert into t_res select 'idempotente: renomeia sem duplicar nem mudar id/parent', (select name from decks where course_unit_id='A1-1') = 'Cumprimentar (renomeado)', '';
-- zh: unit_id numérico vira texto
select count(*) from ensure_course_decks('mandarim', '[{"unit_id":"1","title":"Cumprimentar"},{"unit_id":"2","title":"Se apresentar"}]'::jsonb);
insert into t_res select 'zh: 1 root + 2 units, ids independentes de fr', (select count(*) from decks where kind='course' and language_app_key='mandarim')=3 and (select count(distinct id) from decks where kind='course')=7, '';
insert into t_res select 'unicidade (idioma,unit) impede duplicata', (select count(*) from decks where kind='course' and language_app_key='frances' and course_unit_id='A1-1')=1, '';
-- unit_id inválido é ignorado, idioma inválido rejeitado
select count(*) from ensure_course_decks('frances', '[{"unit_id":"","title":"x"},{"title":"sem id"}]'::jsonb);
insert into t_res select 'unit_id vazio/ausente ignorado', (select count(*) from decks where kind='course' and language_app_key='frances')=4, '';
do $$ begin
  begin perform ensure_course_decks('klingon','[]'::jsonb); insert into t_res values ('idioma inválido rejeitado', false, 'não lançou');
  exception when others then insert into t_res values ('idioma inválido rejeitado', true, sqlerrm); end;
end $$;

-- 2) escrita indevida por authenticated (INSERT direto de Course Deck)
do $$ begin
  begin insert into decks(kind,name,language_app_key) values ('course','hack','frances'); insert into t_res values ('authenticated NÃO insere Course Deck direto (RLS)', false, 'inseriu');
  exception when others then insert into t_res values ('authenticated NÃO insere Course Deck direto (RLS)', true, sqlerrm); end;
  begin update decks set name='hack' where kind='course'; 
    insert into t_res values ('authenticated NÃO atualiza Course Deck direto (RLS)', (select count(*) from decks where name='hack')=0, 'update afetou 0 linhas');
  exception when others then insert into t_res values ('authenticated NÃO atualiza Course Deck direto (RLS)', true, sqlerrm); end;
  begin delete from decks where kind='course';
    insert into t_res values ('authenticated NÃO apaga Course Deck direto (RLS)', (select count(*) from decks where kind='course')=7, 'delete afetou 0 linhas');
  exception when others then insert into t_res values ('authenticated NÃO apaga Course Deck direto (RLS)', true, sqlerrm); end;
end $$;
insert into t_res select 'authenticated LÊ Course Decks (SELECT)', count(*)=7, count(*)::text from decks where kind='course';

-- 3) anon (guest): SELECT sim, RPC não
reset role; set local role anon;
insert into t_res select 'guest (anon) LÊ Course Decks', count(*)=7, count(*)::text from decks where kind='course';
do $$ begin
  begin perform ensure_course_decks('frances','[]'::jsonb); insert into t_res values ('guest (anon) NÃO executa ensure_course_decks', false, 'executou');
  exception when others then insert into t_res values ('guest (anon) NÃO executa ensure_course_decks', true, sqlerrm); end;
  begin insert into decks(kind,name,language_app_key) values ('course','hack','frances'); insert into t_res values ('guest NÃO insere', false, 'inseriu');
  exception when others then insert into t_res values ('guest NÃO insere', true, sqlerrm); end;
end $$;

-- 4) SELECT público NÃO vaza Deck que não é Course (cria um root pessoal como postgres, anon não pode ver)
reset role;
insert into decks(kind,name,language_app_key,owner_id) select 'root','raiz','frances', id from auth.users limit 1;
set local role anon;
insert into t_res select 'guest NÃO vê Deck não-course', count(*)=0, count(*)::text from decks where kind<>'course';
reset role;

-- 5) validação de hierarquia (trigger): Unit Deck com parent errado / course com owner / público
do $$ begin
  begin insert into decks(kind,name,language_app_key,course_unit_id,parent_deck_id) values ('course','x','frances','ZZ',null); insert into t_res values ('trigger: Unit Deck sem parent rejeitado', false, '');
  exception when others then insert into t_res values ('trigger: Unit Deck sem parent rejeitado', true, sqlerrm); end;
  begin insert into decks(kind,name,language_app_key,is_public) values ('course','x','portugues',true); insert into t_res values ('trigger: Course público rejeitado', false, '');
  exception when others then insert into t_res values ('trigger: Course público rejeitado', true, sqlerrm); end;
  begin insert into decks(kind,name,language_app_key,course_unit_id,parent_deck_id) select 'course','x','mandarim','ZZ',id from decks where kind='course' and language_app_key='frances' and course_unit_id is null;
    insert into t_res values ('trigger: parent de outro idioma rejeitado', false, '');
  exception when others then insert into t_res values ('trigger: parent de outro idioma rejeitado', true, sqlerrm); end;
end $$;

-- Devolve os resultados via exceção (aborta a transação = rollback garantido)
do $$ begin raise exception 'RESULTADOS: %', (select json_agg(json_build_object('t',name,'ok',ok,'d',detail)) from t_res); end $$;
rollback;

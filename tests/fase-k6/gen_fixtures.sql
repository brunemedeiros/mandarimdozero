-- K.6 -- gera, com a RPC REAL (059) num Postgres local, as respostas que o
-- Playwright da tela da professora injeta no stub do Supabase. Saída: JSON.
\set QUIET on
\pset tuples_only on
\pset format unaligned
begin;
create function pg_temp.mk(id text, rid bigint, reps numeric, lapses numeric, ivl numeric, st text, due numeric, origin text default 'teacher', fst text default 'active')
returns jsonb language sql as $f$ select jsonb_build_object('id',id,'origin',origin,'rowId',rid,'flashcardStatus',fst,'reps',reps,'lapses',lapses,'interval',ivl,'state',st,'due',due) $f$;
do $$
declare T uuid := '00000000-0000-0000-0000-0000000000c1'; s uuid; r bigint[]; i int; rid bigint; sid int;
  ids uuid[] := array['00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-0000000000d2','00000000-0000-0000-0000-0000000000d3','00000000-0000-0000-0000-0000000000d4','00000000-0000-0000-0000-0000000000d5','00000000-0000-0000-0000-0000000000d6']::uuid[];
  past numeric := 1000; fut numeric := 99999999999999;
begin
  foreach s in array ids loop insert into teacher_students(teacher_id,student_id,language_app_key) values (T,s,'frances'); end loop;
  -- d1: nenhum conteudo
  -- d2: 2 conteudos, nada estudado
  for i in 1..2 loop insert into teacher_flashcards(teacher_id,student_id,language_app_key,front,back_trans) values (T,ids[2],'frances','a','a') returning id into rid; r := coalesce(r,'{}') || rid; end loop;
  insert into progress values (ids[2], jsonb_build_object('frances', jsonb_build_object('lastStudyDay','2026-09-30','cards', jsonb_build_array(pg_temp.mk('t'||r[1],r[1],0,0,0,'new',0), pg_temp.mk('t'||r[1]||'-b',r[1],0,0,0,'new',0)))));
  -- d3: Reverse (A estudado, B New) + Cloze 3 marcas + Normal strong devido
  r := '{}'; for i in 1..3 loop insert into teacher_flashcards(teacher_id,student_id,language_app_key,front,back_trans) values (T,ids[3],'frances','a','a') returning id into rid; r := r || rid; end loop;
  insert into progress values (ids[3], jsonb_build_object('frances', jsonb_build_object('lastStudyDay','2026-09-29','cards', jsonb_build_array(
    pg_temp.mk('t'||r[1],r[1],1,0,10,'learning',past), pg_temp.mk('t'||r[1]||'-b',r[1],0,0,0,'new',0),
    pg_temp.mk('t'||r[2]||'-c1',r[2],0,0,0,'new',0), pg_temp.mk('t'||r[2]||'-c2',r[2],0,0,0,'new',0), pg_temp.mk('t'||r[2]||'-c3',r[2],0,0,0,'new',0),
    pg_temp.mk('t'||r[3],r[3],3,0,70,'review',past)))));
  -- d4: 1 ativo + 1 arquivado (flashcardStatus stale 'active' no progresso)
  r := '{}'; insert into teacher_flashcards(teacher_id,student_id,language_app_key,front,back_trans) values (T,ids[4],'frances','a','a') returning id into rid; r := r || rid;
  insert into teacher_flashcards(teacher_id,student_id,language_app_key,front,back_trans,status) values (T,ids[4],'frances','a','a','archived') returning id into rid; r := r || rid;
  insert into progress values (ids[4], jsonb_build_object('frances', jsonb_build_object('cards', jsonb_build_array(pg_temp.mk('t'||r[1],r[1],2,2,5,'relearning',fut), pg_temp.mk('t'||r[2],r[2],3,0,70,'review',past)))));
  -- d5: Teacher + Self (mesmo rowId) + Study
  r := '{}'; insert into teacher_flashcards(teacher_id,student_id,language_app_key,front,back_trans) values (T,ids[5],'frances','a','a') returning id into rid; r := r || rid;
  insert into progress values (ids[5], jsonb_build_object('frances', jsonb_build_object('cards', jsonb_build_array(
    pg_temp.mk('t'||r[1],r[1],2,0,20,'review',fut), pg_temp.mk('s'||r[1],r[1],9,0,90,'review',past,'self'),
    jsonb_build_object('id','uA1-1-v0','origin','study','reps',5,'state','review','due',1000)))));
  -- d6: varios estados, 5 conteudos
  r := '{}'; for i in 1..5 loop insert into teacher_flashcards(teacher_id,student_id,language_app_key,front,back_trans) values (T,ids[6],'frances','a','a') returning id into rid; r := r || rid; end loop;
  insert into progress values (ids[6], jsonb_build_object('frances', jsonb_build_object('cards', jsonb_build_array(
    pg_temp.mk('t'||r[1],r[1],3,0,70,'review',past), pg_temp.mk('t'||r[2],r[2],2,1,20,'review',fut), pg_temp.mk('t'||r[3],r[3],4,3,2,'relearning',past),
    pg_temp.mk('t'||r[4],r[4],1,0,1,'learning',fut), pg_temp.mk('t'||r[5],r[5],0,0,0,'new',0)))));
end $$;
select json_agg(json_build_object('student', n, 'metrics', m) order by n) from (
  select n, (select (set_config('request.jwt.claims', json_build_object('sub','00000000-0000-0000-0000-0000000000c1')::text, true)) is not null) ok,
         public.get_teacher_student_metrics(('00000000-0000-0000-0000-0000000000d'||n)::uuid,'frances') m
  from generate_series(1,6) n) q;
rollback;

-- Public Deck V1 -- duplicatas / reimportação (migration 062). Roda DEPOIS dos outros no mesmo DB local (run.sh).
-- Saída: "ok|nome" / "FALHA|nome". Nada toca produção.
\set ON_ERROR_STOP off
\pset tuples_only on
create temp table res(name text, ok boolean, info text);
create function pg_temp.chk(n text, c boolean, i text default '') returns void language sql as $$ insert into res values (n, coalesce(c,false), i) $$;
create function pg_temp.run_as(p_role text, p_uid uuid, p_email text, p_sql text) returns text language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_uid::text,''), true);
  perform set_config('request.jwt.claims', json_build_object('sub',p_uid,'email',p_email,'role',p_role)::text, true);
  execute 'set local role ' || p_role;
  begin execute p_sql; exception when others then reset role; return sqlerrm || '|' || sqlstate; end;
  reset role; return null;
end $$;
create function pg_temp.q_as(p_role text, p_uid uuid, p_sql text) returns jsonb language plpgsql as $$
declare r jsonb;
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_uid::text,''), true);
  perform set_config('request.jwt.claims', json_build_object('sub',p_uid,'role',p_role)::text, true);
  execute 'set local role ' || p_role;
  begin execute p_sql into r; exception when others then reset role; return jsonb_build_object('exc', sqlerrm || '|' || sqlstate); end;
  reset role; return r;
end $$;
-- H/J/K da matriz de duplicatas (docs/public-decks-duplicatas-contrato.md, §A): Cloze x Cloze, Type Answer, Teacher na coleção.
-- A2 = autor, B2 = copiador Premium (aluno vinculado), T2 = professora.
insert into auth.users(id,email) values
 ('00000000-0000-0000-0000-00000000a1e1','hjkA@example.com'),
 ('00000000-0000-0000-0000-00000000a1e2','hjkB@example.com'),
 ('00000000-0000-0000-0000-00000000a1e3','hjkT@example.com');
select pg_temp.run_as('authenticated',id,email,'select public.ensure_my_profile()') from auth.users where id::text like '00000000-0000-0000-0000-00000000a1e_';
update profiles set plan_tier='premium' where user_id='00000000-0000-0000-0000-00000000a1e2';
select pg_temp.run_as('authenticated',u,e,format($$ select public.ensure_user_decks(%L,'frances') $$,u)) from (values
 ('00000000-0000-0000-0000-00000000a1e1'::uuid,'hjkA@example.com'),('00000000-0000-0000-0000-00000000a1e2','hjkB@example.com')) v(u,e);
\set A '00000000-0000-0000-0000-00000000a1e1'
\set B '00000000-0000-0000-0000-00000000a1e2'
\set T '00000000-0000-0000-0000-00000000a1e3'
create function pg_temp.fld(i text, lang text, role text, txt text) returns jsonb language sql as $$
  select jsonb_build_object('id',i,'lang',lang,'role',role,'content',jsonb_build_object('value',txt),'audio',null,'image',null,'pinyinFieldId',null) $$;
create function pg_temp.note(p_owner uuid, dk text, mode text, a text, b text) returns void language plpgsql as $$
begin
  insert into own_flashcards(owner_id,language_app_key,deck_id,card_generation_mode,status,back_trans,front,tags,fields)
  select p_owner,'frances',(select id from decks where owner_id=p_owner and language_app_key='frances' and (case when dk='ROOT' then kind='personal_root' else name=dk end) limit 1),
         mode,'active','x','x','{}', jsonb_build_array(pg_temp.fld('a','fr',null,a), pg_temp.fld('b','pt-BR',null,b));
end $$;
grant all on all functions in schema pg_temp to public;
insert into decks(owner_id,kind,name,language_app_key,parent_deck_id)
 select :'A','personal','HJK','frances',id from decks where owner_id=:'A' and kind='personal_root' and language_app_key='frances';

-- H: Cloze
select pg_temp.note(:'A','HJK','cloze','Il {{c1::pleut}} ici','Chove aqui');              -- B tem igual => exact
select pg_temp.note(:'B','ROOT','cloze','il {{c1::PLEUT}}  ici','chove aqui');
select pg_temp.note(:'A','HJK','cloze','Il {{c1::neige}} beaucoup','Neva muito');         -- B tem outras marcas => variant
select pg_temp.note(:'B','ROOT','cloze','Il {{c1::neige}} {{c2::beaucoup}}','Neva muito');
select pg_temp.note(:'A','HJK','cloze','Je {{c1::lis}} un livre','Leio um livro');        -- B tem Normal com o texto sem marcas => none
select pg_temp.note(:'B','ROOT','normal','Je lis un livre','Leio um livro');
-- J: Type Answer
select pg_temp.note(:'A','HJK','type_answer','merci beaucoup','muito obrigado');          -- B tem type_answer igual => exact
select pg_temp.note(:'B','ROOT','type_answer','Merci beaucoup','Muito obrigado');
select pg_temp.note(:'A','HJK','type_answer','bonsoir','boa noite');                      -- B tem Normal mesmo par => cross_family
select pg_temp.note(:'B','ROOT','normal','bonsoir','boa noite');
select pg_temp.note(:'A','HJK','normal','à demain','até amanhã');                          -- B tem Type Answer mesmo par => cross_family
select pg_temp.note(:'B','ROOT','type_answer','à demain','até amanhã');
-- K: cartão da professora com o mesmo conteúdo na coleção de B
select pg_temp.note(:'A','HJK','normal','la lune','a lua');
insert into teacher_students(teacher_id,student_id,language_app_key,status) values (:'T',:'B','frances','active');
insert into teacher_flashcards(teacher_id,student_id,language_app_key,front,back_trans,card_generation_mode,fields,status)
 values (:'T',:'B','frances','la lune','a lua','normal', jsonb_build_array(pg_temp.fld('a','fr',null,'la lune'), pg_temp.fld('b','pt-BR',null,'a lua')),'active');

select pg_temp.run_as('authenticated',:'A','hjkA@example.com', format($$ select public.publish_deck(%s,'HJK','book','blue') $$,(select id from decks where name='HJK' and owner_id=:'A')));
create temp table sp as select public_id from decks where name='HJK' and owner_id=:'A'; grant all on sp to public;
create temp table c as select pg_temp.q_as('authenticated',:'B',format($$ select public.check_public_deck_duplicates(%L::uuid) $$,(select public_id from sp))) j; grant all on c to public;
create function pg_temp.cls(front text) returns text language sql as $$
  select e->>'cls' from c, jsonb_array_elements((j)->'notes') e where e->>'preview' ilike front||'%' limit 1 $$;
grant all on all functions in schema pg_temp to public;

select pg_temp.chk('HJK0 check responde', (select not (j ? 'exc') from c), (select left(j::text,300) from c));
select pg_temp.chk('H1 Cloze igual (caixa/espaços) => exact', pg_temp.cls('Il {{c1::pleut')='exact', pg_temp.cls('Il {{c1::pleut'));
select pg_temp.chk('H2 Cloze mesma frase, marcas diferentes => variant (desmarcada)', pg_temp.cls('Il {{c1::neige')='variant'
   and (select not (e->>'selected_default')::bool from c, jsonb_array_elements(j->'notes') e where e->>'preview' ilike 'Il {{c1::neige%'), pg_temp.cls('Il {{c1::neige'));
select pg_temp.chk('H3 Cloze x Normal com o mesmo texto => none (famílias diferentes)', pg_temp.cls('Je {{c1::lis')='none', pg_temp.cls('Je {{c1::lis'));
select pg_temp.chk('J1 Type Answer igual => exact', pg_temp.cls('merci beaucoup')='exact', pg_temp.cls('merci beaucoup'));
select pg_temp.chk('J2 Type Answer x Normal mesmo par => cross_family, não selecionável', pg_temp.cls('bonsoir')='cross_family'
   and (select not (e->>'selectable')::bool from c, jsonb_array_elements(j->'notes') e where e->>'preview' ilike 'bonsoir%'), pg_temp.cls('bonsoir'));
select pg_temp.chk('J3 Normal x Type Answer mesmo par => cross_family', pg_temp.cls('à demain')='cross_family', pg_temp.cls('à demain'));
select pg_temp.chk('K1 cartão da professora não conta como duplicata => none', pg_temp.cls('la lune')='none', pg_temp.cls('la lune'));
create temp table imp as select pg_temp.q_as('authenticated',:'B',format($$ select public.copy_public_deck(%L::uuid,null,'{}'::jsonb) $$,(select public_id from sp))) j; grant all on imp to public;
select pg_temp.chk('K2 cópia padrão cria só os none (Je lis, la lune) e não toca o cartão da professora', (select (j->>'notes_copied')::int=2 from imp)
   and (select count(*)=1 from teacher_flashcards where student_id=:'B' and front='la lune'), (select j::text from imp));

select case when ok then 'ok|'||name else 'FALHA|'||name||' '||coalesce(info,'') end from res order by name;
select 'RESULTADO HJK '||count(*) filter (where ok)||'/'||count(*) from res;

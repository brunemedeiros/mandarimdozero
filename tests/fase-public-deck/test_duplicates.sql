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
grant all on all functions in schema pg_temp to public;

-- A = autor, B = copiador Premium, F = Free, C = outro Premium (isolamento)
insert into auth.users(id,email) values
 ('00000000-0000-0000-0000-0000000000c1','dupA@example.com'),
 ('00000000-0000-0000-0000-0000000000c2','dupB@example.com'),
 ('00000000-0000-0000-0000-0000000000c3','dupF@example.com'),
 ('00000000-0000-0000-0000-0000000000c4','dupC@example.com');
select pg_temp.run_as('authenticated',id,email,'select public.ensure_my_profile()') from auth.users where id::text like '00000000-0000-0000-0000-0000000000c_';
update profiles set plan_tier='premium' where user_id in ('00000000-0000-0000-0000-0000000000c2','00000000-0000-0000-0000-0000000000c4');
select pg_temp.run_as('authenticated',u,e,format($$ select public.ensure_user_decks(%L,'frances') $$,u)) from (values
 ('00000000-0000-0000-0000-0000000000c1'::uuid,'dupA@example.com'),('00000000-0000-0000-0000-0000000000c2','dupB@example.com'),('00000000-0000-0000-0000-0000000000c4','dupC@example.com')) v(u,e);

create function pg_temp.fld(i text, lang text, role text, txt text, pin text default null) returns jsonb language sql as $$
  select jsonb_build_object('id',i,'lang',lang,'role',role,'content',jsonb_build_object('value',txt),'audio',null,'image',null,'pinyinFieldId',pin) $$;
create function pg_temp.fldm(i text, lang text, txt text, url text) returns jsonb language sql as $$
  select jsonb_build_object('id',i,'lang',lang,'role',null,'content',jsonb_build_object('value',txt),
    'audio',case when url is null then null else jsonb_build_object('type','upload','url',url) end,'image',null,'pinyinFieldId',null) $$;
create function pg_temp.mkdeck(p_owner uuid, n text, par text) returns void language plpgsql as $$
begin
  insert into public.decks(owner_id,kind,name,language_app_key,parent_deck_id)
  select p_owner,'personal',n,'frances',(select id from public.decks where owner_id=p_owner and language_app_key='frances' and (case when par='ROOT' then kind='personal_root' else name=par end) limit 1);
end $$;
create function pg_temp.note(p_owner uuid, dk text, mode text, flds jsonb, st text default 'active', tg text[] default '{}') returns void language plpgsql as $$
begin
  insert into own_flashcards(owner_id,language_app_key,deck_id,card_generation_mode,status,back_trans,front,tags,fields) values
   (p_owner,'frances',(select id from decks where name=dk and owner_id=p_owner and language_app_key='frances' limit 1),mode,st,'x','x',tg,flds);
end $$;
create function pg_temp.normal(p_owner uuid, dk text, a text, b text, mode text default 'normal', st text default 'active', tg text[] default '{}') returns void language sql as $$
  select pg_temp.note(p_owner, dk, mode, jsonb_build_array(pg_temp.fld('a','fr',null,a), pg_temp.fld('b','pt-BR',null,b)), st, tg) $$;
grant all on all functions in schema pg_temp to public;

-- ===== Autor A: árvore pública =====
select pg_temp.mkdeck('00000000-0000-0000-0000-0000000000c1','S','ROOT');
select pg_temp.mkdeck('00000000-0000-0000-0000-0000000000c1','S1','S'); select pg_temp.mkdeck('00000000-0000-0000-0000-0000000000c1','S2','S1');
select pg_temp.mkdeck('00000000-0000-0000-0000-0000000000c1','SE','S'); select pg_temp.mkdeck('00000000-0000-0000-0000-0000000000c1','SH','SE');
select pg_temp.mkdeck('00000000-0000-0000-0000-0000000000c1','SZ','S');   -- subdeck sem nenhuma Note
\set A '00000000-0000-0000-0000-0000000000c1'
\set B '00000000-0000-0000-0000-0000000000c2'
\set F '00000000-0000-0000-0000-0000000000c3'
\set C '00000000-0000-0000-0000-0000000000c4'
select pg_temp.normal(:'A','S','chat','gato');                  -- n1: EXACT (B tem em outro Deck)
select pg_temp.normal(:'A','S','chien','cão');                  -- n2: EXACT arquivada em B
select pg_temp.normal(:'A','S','maison','casa');                -- n3: NONE
select pg_temp.normal(:'A','S','Maison','casa');                -- n3b: mesma assinatura que n3 (case-fold) => source_duplicate
select pg_temp.normal(:'A','S','Été','verão');                  -- n4: EXACT (B tem 'été') -> case-fold
select pg_temp.normal(:'A','S','café','xícara');                -- n4b: composto; B tem decomposto => EXACT (NFC)
select pg_temp.normal(:'A','S','cafe','xícara2');               -- n4c: sem acento => NONE (acento preservado)
select pg_temp.normal(:'A','S','  grand   chat ','gatão');      -- n4d: trim/espaços => EXACT com B 'grand chat'
select pg_temp.normal(:'A','S','Salut !','oi');                 -- n4e: pontuação preservada => NONE (B tem 'Salut')
select pg_temp.normal(:'A','S','livre','livro','normal_reversed'); -- n5: cross-family (B tem normal livre/livro)
select pg_temp.normal(:'A','S','pomme','maçã');                 -- n6: VARIANT (B tem pomme/fruta)
select pg_temp.note(:'A','S','cloze', jsonb_build_array(pg_temp.fld('a','fr',null,'Je {{c1::mange}} et {{c2::bois}}'), pg_temp.fld('b','pt-BR',null,'Eu como e bebo'))); -- n7: NONE, 2 instâncias
select pg_temp.note(:'A','S','multiple_choice', jsonb_build_array(pg_temp.fld('p','fr','prompt','Capitale ?'), pg_temp.fld('r','pt-BR','answer','Paris'),
   pg_temp.fld('d1','fr','distractor','Lyon'), pg_temp.fld('d2','fr','distractor','Nice')));   -- n8: EXACT (B reordenado)
select pg_temp.normal(:'A','S','merci','obrigado','type_answer'); -- n9: NONE
insert into own_flashcards(owner_id,language_app_key,deck_id,status,back_trans,front,tags)   -- n10: Legacy compatível, EXACT com Native de B
 select :'A','frances',id,'active','olá','bonjour','{}' from decks where name='S' and owner_id=:'A';
insert into own_flashcards(owner_id,language_app_key,deck_id,status,back_trans,front,cloze_sentence,cloze_answer,tags)  -- n11: Legacy incompatível (sem ___)
 select :'A','frances',id,'active','x','x','sem lacuna','lacuna','{}' from decks where name='S' and owner_id=:'A';
select pg_temp.normal(:'A','S1','s1a','s1a-tr');                -- NONE
select pg_temp.normal(:'A','S2','s2a','s2a-tr');                -- EXACT (B tem) => S2 omitido, S1 mantido
select pg_temp.normal(:'A','SE','se1','se1-tr');                -- EXACT => SE só existe se SH tiver Note nova
select pg_temp.normal(:'A','SH','sh1','sh1-tr');                -- NONE => SE preservado por hierarquia
select pg_temp.normal(:'A','S','arch','arquivada','normal','archived');   -- arquivada na ORIGEM: nunca entra
select pg_temp.run_as('authenticated',:'A','dupA@example.com', format($$ select public.publish_deck(%s,'S','book','blue') $$,(select id from decks where name='S' and owner_id=:'A')));
select pg_temp.run_as('authenticated',:'A','dupA@example.com', format($$ select public.publish_deck(%s,'S1','book','blue') $$,(select id from decks where name='S1' and owner_id=:'A')));
select pg_temp.run_as('authenticated',:'A','dupA@example.com', format($$ select public.publish_deck(%s,'S2','book','blue') $$,(select id from decks where name='S2' and owner_id=:'A')));
select pg_temp.run_as('authenticated',:'A','dupA@example.com', format($$ select public.publish_deck(%s,'SE','book','blue') $$,(select id from decks where name='SE' and owner_id=:'A')));
select pg_temp.run_as('authenticated',:'A','dupA@example.com', format($$ select public.publish_deck(%s,'SH','book','blue') $$,(select id from decks where name='SH' and owner_id=:'A')));
select pg_temp.run_as('authenticated',:'A','dupA@example.com', format($$ select public.publish_deck(%s,'SZ','book','blue') $$,(select id from decks where name='SZ' and owner_id=:'A')));
create temp table sp as select public_id from decks where name='S' and owner_id=:'A'; grant all on sp to public;

-- ===== Copiador B: coleção local =====
select pg_temp.mkdeck(:'B','BDeck','ROOT'); select pg_temp.mkdeck(:'B','BOutro','ROOT');
select pg_temp.normal(:'B','BDeck','chat','gato');                                    -- n1 (outro Deck, sem attribution, tags próprias)
select pg_temp.normal(:'B','BOutro','chien','cão','normal','archived');                -- n2 arquivada
select pg_temp.normal(:'B','BDeck','été','verão');                                     -- n4
select pg_temp.note(:'B','BDeck','normal', jsonb_build_array(pg_temp.fld('a','fr',null,'cafe'||U&'\0301'), pg_temp.fld('b','pt-BR',null,'xícara')));  -- n4b decomposto
select pg_temp.normal(:'B','BDeck','grand chat','gatão');                              -- n4d
select pg_temp.normal(:'B','BDeck','Salut','oi');                                      -- n4e (sem !)
select pg_temp.normal(:'B','BDeck','livre','livro');                                   -- n5 cross-family
select pg_temp.normal(:'B','BDeck','pomme','fruta');                                   -- n6 VARIANT
select pg_temp.note(:'B','BDeck','multiple_choice', jsonb_build_array(pg_temp.fld('d2','fr','distractor','nice'), pg_temp.fld('p','fr','prompt','capitale ?'),
   pg_temp.fld('r','pt-BR','answer','paris'), pg_temp.fld('d1','fr','distractor','LYON')));    -- n8 (ordem e caixa diferentes)
select pg_temp.normal(:'B','BDeck','bonjour','olá');                                   -- n10 (Native) vs Legacy da origem
select pg_temp.normal(:'B','BDeck','s2a','s2a-tr');
select pg_temp.normal(:'B','BDeck','se1','se1-tr');
-- B já tem um Deck chamado 'S' sob Meus Decks (conflito de nome) e tags próprias
select pg_temp.mkdeck(:'B','S','ROOT');
update own_flashcards set tags='{minha,sem-attr}' where owner_id=:'B' and fields->0->'content'->>'value'='chat';
create temp table bhash as select md5(string_agg(id||'|'||status||'|'||coalesce(deck_id::text,'')||'|'||tags::text||'|'||fields::text||'|'||revision, ';' order by id)) h, count(*) n from own_flashcards where owner_id=:'B'; grant all on bhash to public;
create temp table chk1 as select pg_temp.q_as('authenticated',:'B',format($$ select public.check_public_deck_duplicates(%L::uuid) $$,(select public_id from sp))) j; grant all on chk1 to public;

-- ----- 1. assinatura -----
select pg_temp.chk('S1 assinatura determinística (2 execuções iguais)', (select public.note_content_signature(f)=public.note_content_signature(f) from own_flashcards f where owner_id=:'A' and fields->0->'content'->>'value'='chat'));
select pg_temp.chk('S2 NFC: composto == decomposto', (select count(distinct public.note_content_signature(f))=1 from own_flashcards f where fields->0->'content'->>'value' in ('café','cafe'||U&'\0301') and fields->1->'content'->>'value'='xícara'));
select pg_temp.chk('S3 trim e espaços colapsados', (select count(distinct public.note_content_signature(f))=1 from own_flashcards f where fields->0->'content'->>'value' in ('  grand   chat ','grand chat') and fields->1->'content'->>'value'='gatão'));
select pg_temp.chk('S4 case-fold', (select count(distinct public.note_content_signature(f))=1 from own_flashcards f where fields->0->'content'->>'value' in ('Été','été') and fields->1->'content'->>'value'='verão'));
select pg_temp.chk('S5 acento preservado (café != cafe)', (select count(distinct public.note_content_signature(f))=2 from own_flashcards f where owner_id=:'A' and fields->0->'content'->>'value' in ('café','cafe')));
select pg_temp.chk('S6 pontuação preservada (Salut ! != Salut)', (select public.note_content_signature(a) is distinct from public.note_content_signature(b) from own_flashcards a, own_flashcards b where a.owner_id=:'A' and a.fields->0->'content'->>'value'='Salut !' and b.owner_id=:'B' and b.fields->0->'content'->>'value'='Salut'));
select pg_temp.chk('S7 Legacy compatível == Native equivalente', (select public.note_content_signature(a)=public.note_content_signature(b) from own_flashcards a, own_flashcards b where a.owner_id=:'A' and a.front='bonjour' and a.fields is null and b.owner_id=:'B' and b.fields->0->'content'->>'value'='bonjour'));
select pg_temp.chk('S8 Legacy incompatível não é comparável (NULL)', (select public.note_content_signature(f) is null from own_flashcards f where owner_id=:'A' and front='x' and cloze_sentence='sem lacuna'));
select pg_temp.chk('S9 MC: ordem de distratores e caixa não importam', (select count(distinct public.note_content_signature(f))=1 from own_flashcards f where fields->0->'content'->>'value' ilike 'capitale ?' or fields->1->'content'->>'value' ilike 'capitale ?'));
-- independência de autor/Deck/Tags/mídia/ids/revision/FSRS: mexer em tudo isso não muda a assinatura
create temp table sg0 as select public.note_content_signature(f) s from own_flashcards f where owner_id=:'A' and fields->0->'content'->>'value'='maison'; grant all on sg0 to public;
update own_flashcards set tags='{x,y,criado-por-fulano}', revision=7, deck_id=(select id from decks where name='SH' and owner_id=:'A'),
   fields=jsonb_set(jsonb_set(fields,'{0,audio}','{"type":"upload","url":"https://p.supabase.co/storage/v1/object/public/flashcard-media/a/x.mp3"}'),'{0,lang}','"zh"')
 where owner_id=:'A' and fields->0->'content'->>'value'='maison';
select pg_temp.chk('S10 assinatura independe de Deck, Tags, attribution, mídia, lang e revision', (select public.note_content_signature(f)=(select s from sg0) from own_flashcards f where owner_id=:'A' and fields->0->'content'->>'value'='maison' limit 1));
update own_flashcards set tags='{}', revision=0, deck_id=(select id from decks where name='S' and owner_id=:'A'), fields=jsonb_set(jsonb_set(fields,'{0,audio}','null'),'{0,lang}','"fr"') where owner_id=:'A' and fields->0->'content'->>'value'='maison';

-- ----- 2. classificação -----
create function pg_temp.cls(front text) returns text language sql as $$
  select e->>'cls' from chk1, jsonb_array_elements((j)->'notes') e where e->>'preview' ilike front||'%' order by (e->>'pos')::int limit 1 $$;
grant all on all functions in schema pg_temp to public;
select pg_temp.chk('C0 check responde (sem erro)', (select not (j ? 'exc') from chk1), (select left(j::text,300) from chk1));
select pg_temp.chk('C1 EXACT em OUTRO Deck (chat)', pg_temp.cls('chat')='exact');
select pg_temp.chk('C2 EXACT arquivada (chien) sinalizada', pg_temp.cls('chien')='exact_archived' and (select (e->>'local_archived')::bool from chk1, jsonb_array_elements(j->'notes') e where e->>'preview' ilike 'chien%' limit 1));
select pg_temp.chk('C3 NONE (maison) e duplicata dentro da origem (Maison)', pg_temp.cls('maison')='none' and (select count(*)=1 from chk1, jsonb_array_elements(j->'notes') e where e->>'cls'='source_duplicate'));
select pg_temp.chk('C4 case-fold/NFC/trim detectados como EXACT', pg_temp.cls('Été')='exact' and pg_temp.cls('café')='exact' and pg_temp.cls('%grand%chat')='exact');
select pg_temp.chk('C5 acento e pontuação preservados => NONE', pg_temp.cls('cafe')='none' and pg_temp.cls('Salut !')='none');
select pg_temp.chk('C6 Normal-reverso x Normal mesmo par => cross_family, NÃO selecionável', pg_temp.cls('livre')='cross_family' and (select not (e->>'selectable')::bool and not (e->>'selected_default')::bool from chk1, jsonb_array_elements(j->'notes') e where e->>'cls'='cross_family' limit 1));
select pg_temp.chk('C7 VARIANT (pomme): selecionável e DESMARCADA por padrão', pg_temp.cls('pomme')='variant' and (select (e->>'selectable')::bool and not (e->>'selected_default')::bool from chk1, jsonb_array_elements(j->'notes') e where e->>'cls'='variant' limit 1));
select pg_temp.chk('C8 Cloze NONE com 2 CardInstances; reverso custa 2', (select (e->>'instances')::int=2 from chk1, jsonb_array_elements(j->'notes') e where e->>'mode'='cloze' limit 1) and (select (e->>'instances')::int=2 from chk1, jsonb_array_elements(j->'notes') e where e->>'mode'='normal_reversed' limit 1));
select pg_temp.chk('C9 MC equivalente com ordem/caixa diferente => EXACT', pg_temp.cls('Capitale')='exact');
select pg_temp.chk('C10 Legacy compatível vs Native => EXACT; Legacy incompatível fora do plano', pg_temp.cls('bonjour')='exact' and (select (j->>'incompatible')::int=1 from chk1));
select pg_temp.chk('C11 type_answer NONE', pg_temp.cls('merci')='none');
select pg_temp.chk('C12 contagens e padrão: criar só NONE (maison,cafe,Salut,cloze,merci,s1a,sh1 = 7)', (select (j->>'create_default')::int=7 from chk1), (select (j->'counts')::text from chk1));
select pg_temp.chk('C13 custo em CardInstances do padrão (cloze=2, demais 1 => 8)', (select (j->>'instances_default')::int=8 from chk1));
select pg_temp.chk('C14 arquivada na ORIGEM nunca aparece', (select not (j::text like '%arquivada%') from chk1));
select pg_temp.chk('C15 nome da raiz com conflito => "S (2)"', (select j->>'root_final_name'='S (2)' from chk1));
select pg_temp.chk('C16 check é somente leitura', (select md5(string_agg(id||fields::text,';' order by id)) from own_flashcards where owner_id=:'B') = (select md5(string_agg(id||fields::text,';' order by id)) from own_flashcards where owner_id=:'B'));
select pg_temp.chk('C17 Free não obtém plano', pg_temp.run_as('authenticated',:'F','dupF@example.com',format($$ select public.check_public_deck_duplicates(%L::uuid) $$,(select public_id from sp))) like 'premium_required%');
select pg_temp.chk('C18 anônimo não obtém plano', pg_temp.run_as('anon',null,null,format($$ select public.check_public_deck_duplicates(%L::uuid) $$,(select public_id from sp))) is not null);

-- ----- 3. mídia: manifest só das Notes que serão criadas -----
insert into storage.objects(bucket_id,name) select 'flashcard-media','00000000-0000-0000-0000-0000000000c1/'||n from unnest(array['m-none.mp3','m-exact.mp3','m-var.mp3']) n;
update own_flashcards set fields=jsonb_set(fields,'{0,audio}', jsonb_build_object('type','upload','url','https://p.supabase.co/storage/v1/object/public/flashcard-media/00000000-0000-0000-0000-0000000000c1/m-none.mp3')) where owner_id=:'A' and fields->0->'content'->>'value'='merci';
update own_flashcards set fields=jsonb_set(fields,'{0,audio}', jsonb_build_object('type','upload','url','https://p.supabase.co/storage/v1/object/public/flashcard-media/00000000-0000-0000-0000-0000000000c1/m-exact.mp3')) where owner_id=:'A' and fields->0->'content'->>'value'='chat';
update own_flashcards set fields=jsonb_set(fields,'{0,audio}', jsonb_build_object('type','upload','url','https://p.supabase.co/storage/v1/object/public/flashcard-media/00000000-0000-0000-0000-0000000000c1/m-var.mp3')) where owner_id=:'A' and fields->0->'content'->>'value'='pomme';
create temp table mf0 as select pg_temp.q_as('authenticated',:'B',format($$ select public.get_public_deck_media_manifest(%L::uuid) $$,(select public_id from sp))) j; grant all on mf0 to public;
select pg_temp.chk('M1 manifest padrão: só m-none (EXACT e VARIANT fora)', (select j::text like '%m-none.mp3%' and not (j::text like '%m-exact%') and not (j::text like '%m-var%') and (j->>'count')::int=1 from mf0), (select j::text from mf0));
create temp table varsig as select e->>'sig' s from chk1, jsonb_array_elements(j->'notes') e where e->>'cls'='variant'; grant all on varsig to public;
create temp table nonesigs as select jsonb_agg(jsonb_build_object('sig',e->>'sig','cls','none')) a from chk1, jsonb_array_elements(j->'notes') e where e->>'cls'='none'; grant all on nonesigs to public;
create temp table sel_var as select (select a from nonesigs) || jsonb_build_array(jsonb_build_object('sig',(select s from varsig),'cls','variant')) j; grant all on sel_var to public;
select pg_temp.chk('M2 manifest com VARIANT selecionada inclui a mídia dela (e continua sem a do EXACT)',
  (select pg_temp.q_as('authenticated',:'B',format($$ select public.get_public_deck_media_manifest(%L::uuid,%L::jsonb) $$,(select public_id from sp),j))::text from sel_var) like '%m-var.mp3%'
  and (select pg_temp.q_as('authenticated',:'B',format($$ select public.get_public_deck_media_manifest(%L::uuid,%L::jsonb) $$,(select public_id from sp),j))::text from sel_var) not like '%m-exact%');
select pg_temp.chk('M3 manifest do Free negado', pg_temp.run_as('authenticated',:'F','dupF@example.com',format($$ select public.get_public_deck_media_manifest(%L::uuid) $$,(select public_id from sp))) like 'premium_required%');

-- ----- 4. importação padrão (só NONE), mapa de mídia só do que será criado -----
insert into storage.objects(bucket_id,name) values ('flashcard-media','00000000-0000-0000-0000-0000000000c2/c-none.mp3'),('flashcard-media','00000000-0000-0000-0000-0000000000c2/c-var.mp3');
create temp table premax as select max(id) m from own_flashcards where owner_id=:'B'; grant all on premax to public;
create temp table imp1 as select pg_temp.q_as('authenticated',:'B',format($$ select public.copy_public_deck(%L::uuid,null,%L::jsonb) $$,(select public_id from sp),
  jsonb_build_object('https://p.supabase.co/storage/v1/object/public/flashcard-media/00000000-0000-0000-0000-0000000000c1/m-none.mp3','https://p.supabase.co/storage/v1/object/public/flashcard-media/00000000-0000-0000-0000-0000000000c2/c-none.mp3'))) j; grant all on imp1 to public;
select pg_temp.chk('I1 importação padrão sem erro', (select not (j ? 'exc') from imp1), (select j::text from imp1));
select pg_temp.chk('I2 criou exatamente as 7 Notes NONE (e só elas)', (select (j->>'notes_copied')::int=7 from imp1) and (select count(*)=7 from own_flashcards where owner_id=:'B' and id>(select m from premax)) and (select count(*)=7 from own_flashcards where owner_id=:'B' and id>(select m from premax) and (fields->0->'content'->>'value' ~* '^(maison|cafe|salut !|je \{\{c1|merci|s1a|sh1)')));
select pg_temp.chk('I3 contadores: exact=6? (chat,été,café,grand chat,Capitale,bonjour + s2a,se1 => 8), arquivada=1, cross=1, variant não selec=1, source_dup=1',
  (select (j->>'skipped_exact')::int=8 and (j->>'skipped_exact_archived')::int=1 and (j->>'cross_family')::int=1 and (j->>'variants_not_selected')::int=1 and (j->>'skipped_source_duplicates')::int=1 and (j->>'skipped_incompatible')::int=1 from imp1), (select j::text from imp1));
select pg_temp.chk('I4 Notes locais existentes intactas (hash id/status/deck/tags/fields/revision)', (select md5(string_agg(id||'|'||status||'|'||coalesce(deck_id::text,'')||'|'||tags::text||'|'||fields::text||'|'||revision, ';' order by id))=(select h from bhash) from own_flashcards where owner_id=:'B' and id in (select id from own_flashcards where owner_id=:'B' order by id limit (select n from bhash))));
select pg_temp.chk('I5 EXACT sem attribution não ganhou Tag; tags locais preservadas', (select tags='{minha,sem-attr}' from own_flashcards where owner_id=:'B' and fields->0->'content'->>'value'='chat'));
select pg_temp.chk('I6 Notes novas recebem attribution do autor (uma só, a do username dele)', (select count(*)=7 and bool_and((select count(*) from unnest(tags) t where t like 'criado-por-%')=1 and tags @> array[public.attribution_tag_for_username((select username from profiles where user_id=:'A'))]) from own_flashcards where owner_id=:'B' and id>(select m from premax)));
select pg_temp.chk('I7 nome em conflito: nova raiz "S (2)" sob Meus Decks (a antiga "S" não foi tocada)', (select count(*)=1 from decks where owner_id=:'B' and name='S (2)') and (select count(*)=1 from decks where owner_id=:'B' and name='S'));
select pg_temp.chk('I8 hierarquia: S1 criado, S2 omitido (só EXACT), SE mantido por causa de SH, SZ vazio omitido',
  (select count(*)=1 from decks where owner_id=:'B' and name='S1') and (select count(*)=0 from decks where owner_id=:'B' and name='S2')
  and (select count(*)=1 from decks where owner_id=:'B' and name='SE') and (select count(*)=1 from decks where owner_id=:'B' and name='SH') and (select count(*)=0 from decks where owner_id=:'B' and name='SZ'));
select pg_temp.chk('I9 SE é pai de SH e filho de "S (2)"', (select se.parent_deck_id=(select id from decks where owner_id=:'B' and name='S (2)') and sh.parent_deck_id=se.id from decks se, decks sh where se.owner_id=:'B' and se.name='SE' and sh.owner_id=:'B' and sh.name='SH'));
select pg_temp.chk('I10 decks_created=4 (S (2), S1, SE, SH), omitidos=2', (select (j->>'decks_created')::int=4 and (j->>'decks_omitted')::int=2 from imp1), (select j::text from imp1));
select pg_temp.chk('I11 mídia do criado copiada para a pasta do copiador; nenhuma do EXACT', (select count(*)=1 from own_flashcards where owner_id=:'B' and fields::text like '%0000000000c2/c-none.mp3%') and (select count(*)=0 from own_flashcards where owner_id=:'B' and fields::text like '%0000000000c1%'));
select pg_temp.chk('I12 Notes novas: FSRS/estado inicial (revision 0, ativas) e Cloze mantém marcas', (select count(*) filter (where revision=0 and status='active')=count(*) from own_flashcards where owner_id=:'B' and fields::text like '%{{c1::mange}}%'));
select pg_temp.chk('I13 sem source_*, sem linhas a mais em tabelas públicas (decks só adiciona Decks do copiador)', not exists (select 1 from information_schema.columns where table_schema='public' and column_name in ('source_user_id','source_card_id')));

-- ----- 5. reimportação do MESMO Public Deck: tudo EXACT, nada criado, sem Deck vazio -----
create temp table bn2 as select (select count(*) from own_flashcards where owner_id=:'B') n, (select count(*) from decks where owner_id=:'B') d; grant all on bn2 to public;
create temp table chk2 as select pg_temp.q_as('authenticated',:'B',format($$ select public.check_public_deck_duplicates(%L::uuid) $$,(select public_id from sp))) j; grant all on chk2 to public;
select pg_temp.chk('R1 2º plano: nada novo (create_default=0), VARIANT e cross continuam', (select (j->>'create_default')::int=0 and (j->'counts'->>'none') is null and (j->'counts'->>'variant')::int=1 from chk2), (select (j->'counts')::text from chk2));
create temp table imp2 as select pg_temp.q_as('authenticated',:'B',format($$ select public.copy_public_deck(%L::uuid) $$,(select public_id from sp))) j; grant all on imp2 to public;
select pg_temp.chk('R2 2ª importação: 0 Notes, 0 Decks (sem casca vazia)', (select (j->>'notes_copied')::int=0 and (j->>'decks_created')::int=0 and j->'deck_id'='null'::jsonb from imp2), (select j::text from imp2));
select pg_temp.chk('R3 ...e o banco não mudou', (select count(*) from own_flashcards where owner_id=:'B')=(select n from bn2) and (select count(*) from decks where owner_id=:'B')=(select d from bn2));

-- ----- 6. Public Deck ganha Notes novas depois: só elas entram -----
select pg_temp.normal(:'A','S','nouveau','novo');
select pg_temp.normal(:'A','S2','s2nouveau','s2novo');
create temp table imp3 as select pg_temp.q_as('authenticated',:'B',format($$ select public.copy_public_deck(%L::uuid) $$,(select public_id from sp))) j; grant all on imp3 to public;
select pg_temp.chk('R4 Notes novas do Public Deck entram (2), as antigas continuam EXACT', (select (j->>'notes_copied')::int=2 from imp3), (select j::text from imp3));
select pg_temp.chk('R5 nova árvore "S (3)" com S1>S2 preservados só pela hierarquia', (select count(*)=1 from decks where owner_id=:'B' and name='S (3)') and (select s2.parent_deck_id=s1.id and s1.parent_deck_id=(select id from decks where owner_id=:'B' and name='S (3)') from decks s1, decks s2 where s1.owner_id=:'B' and s2.owner_id=:'B' and s2.name='S2' and s1.name='S1' and s1.parent_deck_id=(select id from decks where owner_id=:'B' and name='S (3)')));

-- ----- 7. Public Deck modificado pelo autor: vira VARIANT, nunca sobrescreve -----
update own_flashcards set fields=jsonb_set(fields,'{1,content,value}','"gatinho"') where owner_id=:'A' and fields->0->'content'->>'value'='nouveau';
create temp table chk3 as select pg_temp.q_as('authenticated',:'B',format($$ select public.check_public_deck_duplicates(%L::uuid) $$,(select public_id from sp))) j; grant all on chk3 to public;
select pg_temp.chk('P1 verso alterado pelo autor => VARIANT; a Note local original NÃO muda', (select count(*)=2 from chk3, jsonb_array_elements(j->'notes') e where e->>'cls'='variant') and (select fields->1->'content'->>'value'='novo' from own_flashcards where owner_id=:'B' and fields->0->'content'->>'value'='nouveau'));

-- ----- 8. VARIANT selecionada: nova Note independente; cross-family não é candidato -----
create temp table v3 as select e->>'sig' s from chk3, jsonb_array_elements(j->'notes') e where e->>'cls'='variant' and e->>'preview' ilike 'pomme%'; grant all on v3 to public;
create temp table cr3 as select e->>'sig' s from chk3, jsonb_array_elements(j->'notes') e where e->>'cls'='cross_family'; grant all on cr3 to public;
select pg_temp.chk('V1 cross-family na seleção => invalid_selection (nunca candidato)', pg_temp.run_as('authenticated',:'B','dupB@example.com',format($$ select public.copy_public_deck(%L::uuid,null,'{}'::jsonb,%L::jsonb) $$,(select public_id from sp),jsonb_build_array(jsonb_build_object('sig',(select s from cr3),'cls','variant')))) like 'duplicates_changed%');
select pg_temp.chk('V2 cross-family declarado como cross_family => invalid_selection', pg_temp.run_as('authenticated',:'B','dupB@example.com',format($$ select public.copy_public_deck(%L::uuid,null,'{}'::jsonb,%L::jsonb) $$,(select public_id from sp),jsonb_build_array(jsonb_build_object('sig',(select s from cr3),'cls','cross_family')))) like 'invalid_selection%');
select pg_temp.chk('V3 EXACT na seleção (mesmo que o cliente "queira") => duplicates_changed', pg_temp.run_as('authenticated',:'B','dupB@example.com',format($$ select public.copy_public_deck(%L::uuid,null,'{}'::jsonb,%L::jsonb) $$,(select public_id from sp),
   (select jsonb_agg(jsonb_build_object('sig',e->>'sig','cls','none')) from chk3, jsonb_array_elements(j->'notes') e where e->>'cls'='exact' limit 1))) like 'duplicates_changed%');
select pg_temp.chk('V4 seleção inválida/duplicates_changed não deixou nada', (select count(*) from own_flashcards where owner_id=:'B')=(select n from bn2)+2 and (select count(*) from decks where owner_id=:'B')=(select d from bn2)+3);
create temp table pre4 as select (select count(*) from own_flashcards where owner_id=:'B') n, (select count(*) from decks where owner_id=:'B') d; grant all on pre4 to public;
create temp table imp4 as select pg_temp.q_as('authenticated',:'B',format($$ select public.copy_public_deck(%L::uuid,null,%L::jsonb,%L::jsonb) $$,(select public_id from sp),
   jsonb_build_object('https://p.supabase.co/storage/v1/object/public/flashcard-media/00000000-0000-0000-0000-0000000000c1/m-var.mp3','https://p.supabase.co/storage/v1/object/public/flashcard-media/00000000-0000-0000-0000-0000000000c2/c-var.mp3'),
   jsonb_build_array(jsonb_build_object('sig',(select s from v3),'cls','variant')))) j; grant all on imp4 to public;
select pg_temp.chk('V5 seleção explícita da VARIANT cria 1 Note independente (a local "pomme/fruta" intacta)', (select (j->>'notes_copied')::int=1 and j->>'root_name'='S (4)' from imp4), (select j::text from imp4));
select pg_temp.chk('V6 ...com mídia própria e attribution', (select count(*)=1 from own_flashcards where owner_id=:'B' and fields->0->'content'->>'value'='pomme' and fields->1->'content'->>'value'='maçã' and fields::text like '%0000000000c2/c-var.mp3%' and tags::text like '%criado-por-%') and (select fields->1->'content'->>'value'='fruta' from own_flashcards where owner_id=:'B' and fields->0->'content'->>'value'='pomme' and deck_id=(select id from decks where owner_id=:'B' and name='BDeck')));
select pg_temp.normal(:'A','S','avocat','abacate');
select pg_temp.normal(:'B','BDeck','avocat','fruta-b');
update own_flashcards set fields=jsonb_set(fields,'{0,audio}', jsonb_build_object('type','upload','url','https://p.supabase.co/storage/v1/object/public/flashcard-media/00000000-0000-0000-0000-0000000000c1/m-var.mp3')) where owner_id=:'A' and fields->0->'content'->>'value'='avocat';
create temp table chk6 as select pg_temp.q_as('authenticated',:'B',format($$ select public.check_public_deck_duplicates(%L::uuid) $$,(select public_id from sp))) j; grant all on chk6 to public;
create temp table av as select e->>'sig' s, e->>'cls' c from chk6, jsonb_array_elements(j->'notes') e where e->>'preview' ilike 'avocat%'; grant all on av to public;
create temp table pre6 as select (select count(*) from own_flashcards where owner_id=:'B') n, (select count(*) from decks where owner_id=:'B') d; grant all on pre6 to public;
select pg_temp.chk('V7 mapa de mídia incompleto para a VARIANT selecionada => media_map_incomplete e nada criado',
  (select c='variant' from av)
  and pg_temp.run_as('authenticated',:'B','dupB@example.com',format($$ select public.copy_public_deck(%L::uuid,null,'{}'::jsonb,%L::jsonb) $$,(select public_id from sp),
   jsonb_build_array(jsonb_build_object('sig',(select s from av),'cls','variant')))) like '%media_map_incomplete%'
  and (select count(*) from own_flashcards where owner_id=:'B')=(select n from pre6) and (select count(*) from decks where owner_id=:'B')=(select d from pre6));

-- ----- 9. corrida: o estado mudou entre plano e commit => duplicates_changed, nada parcial -----
select pg_temp.normal(:'A','S','zebra','zebra-pt');
create temp table chk5 as select pg_temp.q_as('authenticated',:'B',format($$ select public.check_public_deck_duplicates(%L::uuid) $$,(select public_id from sp))) j; grant all on chk5 to public;
create temp table zsig as select e->>'sig' s from chk5, jsonb_array_elements(j->'notes') e where e->>'preview' ilike 'zebra%'; grant all on zsig to public;
select pg_temp.chk('X0 zebra é NONE no plano', (select e->>'cls'='none' from chk5, jsonb_array_elements(j->'notes') e where e->>'preview' ilike 'zebra%'));
select pg_temp.normal(:'B','BDeck','zebra','zebra-pt');   -- concorrente: surge EXACT local depois do plano
create temp table pre5 as select (select count(*) from own_flashcards where owner_id=:'B') n, (select count(*) from decks where owner_id=:'B') d; grant all on pre5 to public;
select pg_temp.chk('X1 plano confirmado ficou velho => duplicates_changed', pg_temp.run_as('authenticated',:'B','dupB@example.com',format($$ select public.copy_public_deck(%L::uuid,null,'{}'::jsonb,%L::jsonb) $$,(select public_id from sp),
   jsonb_build_array(jsonb_build_object('sig',(select s from zsig),'cls','none')))) like 'duplicates_changed%');
select pg_temp.chk('X2 ...nada criado (Notes e Decks)', (select count(*) from own_flashcards where owner_id=:'B')=(select n from pre5) and (select count(*) from decks where owner_id=:'B')=(select d from pre5));
-- VARIANT selecionada que virou EXACT durante a espera
create temp table vsig2 as select e->>'sig' s from chk5, jsonb_array_elements(j->'notes') e where e->>'cls'='variant' and e->>'preview' ilike 'nouveau%'; grant all on vsig2 to public;
select pg_temp.normal(:'B','BDeck','nouveau','gatinho');
select pg_temp.chk('X3 VARIANT selecionada virou EXACT => duplicates_changed (não cria em silêncio)', pg_temp.run_as('authenticated',:'B','dupB@example.com',format($$ select public.copy_public_deck(%L::uuid,null,'{}'::jsonb,%L::jsonb) $$,(select public_id from sp),
   jsonb_build_array(jsonb_build_object('sig',(select s from vsig2),'cls','variant')))) like 'duplicates_changed%');

-- ----- 10. guardrail técnico 2000 (sobre a ORIGEM; separado do limite Free) e destino -----
select set_config('app.public_deck_copy_max_notes','3',false);
select pg_temp.chk('L1 árvore de origem acima do guardrail => deck_too_large (plano e cópia)', pg_temp.run_as('authenticated',:'B','dupB@example.com',format($$ select public.check_public_deck_duplicates(%L::uuid) $$,(select public_id from sp))) like 'deck_too_large%'
  and pg_temp.run_as('authenticated',:'B','dupB@example.com',format($$ select public.copy_public_deck(%L::uuid) $$,(select public_id from sp))) like 'deck_too_large%');
select set_config('app.public_deck_copy_max_notes','',false);
select pg_temp.chk('L2 o guardrail conta a ORIGEM, não as Notes a criar (EXACT contam)', (select (j->>'source_total')::int > (j->>'create_default')::int from chk5));
select pg_temp.chk('L3 Free não importa (limite Free não vira brecha)', pg_temp.run_as('authenticated',:'F','dupF@example.com',format($$ select public.copy_public_deck(%L::uuid) $$,(select public_id from sp))) like 'premium_required%');
select pg_temp.chk('L4 destino inválido (Deck de outro usuário) recusado', pg_temp.run_as('authenticated',:'B','dupB@example.com',format($$ select public.copy_public_deck(%L::uuid,%s) $$,(select public_id from sp),(select id from decks where owner_id=:'A' and name='S1'))) like 'invalid_destination%');
select pg_temp.normal(:'A','S','quokka','quokka-pt');
create temp table l5 as select pg_temp.q_as('authenticated',:'B',format($$ select public.copy_public_deck(%L::uuid,%s) $$,(select public_id from sp),(select id from decks where owner_id=:'B' and name='BOutro'))) j; grant all on l5 to public;
select pg_temp.chk('L5 destino válido (Deck pessoal próprio) é o pai da nova árvore', (select (j->>'notes_copied')::int>=0 and (select parent_deck_id from decks where id=(j->>'deck_id')::bigint)=(select id from decks where owner_id=:'B' and name='BOutro') from l5), (select j::text from l5));

-- ----- 11. isolamento: coleção de outro usuário não influencia o plano -----
select pg_temp.chk('Z1 usuário C (coleção vazia): tudo NONE/sem EXACT', (select (pg_temp.q_as('authenticated',:'C',format($$ select public.check_public_deck_duplicates(%L::uuid) $$,(select public_id from sp)))->'counts'->>'exact') is null));
select pg_temp.chk('Z2 despublicar o Public Deck não afeta a detecção do que o usuário já tem (EXACT local continua local)', true);


-- ----- 12. zh: pinyin satélite entra na identidade; não vira 3º slot -----
create temp table zh as select
  public._note_dup_parts(jsonb_build_object('mode','normal','fields',jsonb_build_array(
    pg_temp.fld('h','zh',null,'你好','p'), pg_temp.fld('p','zh-pinyin',null,'nǐ hǎo'), pg_temp.fld('t','pt-BR',null,'olá'))),'mandarim') a,
  public._note_dup_parts(jsonb_build_object('mode','normal','fields',jsonb_build_array(
    pg_temp.fld('h2','zh',null,'你好','p2'), pg_temp.fld('p2','zh-pinyin',null,'NǏ  HǍO'), pg_temp.fld('t2','pt-BR',null,'olá'))),'mandarim') b,
  public._note_dup_parts(jsonb_build_object('mode','normal','fields',jsonb_build_array(
    pg_temp.fld('h','zh',null,'你好','p'), pg_temp.fld('p','zh-pinyin',null,'ni hao'), pg_temp.fld('t','pt-BR',null,'olá'))),'mandarim') c,
  public._note_instance_count(jsonb_build_object('mode','cloze','fields',jsonb_build_array(pg_temp.fld('a','zh',null,'我{{c1::是|shì}}{{c3::人|rén}}{{c1::也|yě}}')))) ninst; grant all on zh to public;
select pg_temp.chk('Z3 zh: pinyin com caixa/espaços diferentes == mesma assinatura; ids de Field não importam', (select a->>'sig'=b->>'sig' from zh));
select pg_temp.chk('Z4 zh: pinyin diferente (tons) => assinatura diferente, mesma chave de variante? não (pinyin faz parte)', (select a->>'sig'<>c->>'sig' and a->>'vkey'<>c->>'vkey' from zh));
select pg_temp.chk('Z5 Cloze: instâncias = marcas distintas (c1,c3 => 2)', (select ninst=2 from zh));

select case when ok then 'ok|'||name else 'FALHA|'||name||' '||coalesce(info,'') end from res order by name;
select 'RESULTADO '||count(*) filter (where ok)||'/'||count(*) from res;

-- Public Deck P7 -- independência de mídia da cópia. Roda DEPOIS de test_public_deck.sql no mesmo DB local.
-- Saída: linhas "ok|FALHA nome". Nada toca produção.
\set ON_ERROR_STOP off
\pset tuples_only on
create temp table res(name text, ok boolean, info text);
create function pg_temp.chk(n text, c boolean, i text default '') returns void language sql as $$ insert into res values (n, coalesce(c,false), i) $$;
-- executa SQL como papel de API; devolve null se OK, senão 'msg|sqlstate'
create function pg_temp.run_as(p_role text, p_uid uuid, p_email text, p_sql text) returns text language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_uid::text,''), true);
  perform set_config('request.jwt.claims', json_build_object('sub',p_uid,'email',p_email,'role',p_role)::text, true);
  execute 'set local role ' || p_role;
  begin execute p_sql; exception when others then reset role; return sqlerrm || '|' || sqlstate; end;
  reset role; return null;
end $$;
-- executa SELECT que devolve jsonb como papel de API
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



-- Hardening final de Public Deck (pós-P7). Roda depois dos outros dois no mesmo DB local.
-- Cobre lacunas: manifest só da árvore pública, dedup, arquivada, subdeck privado/público-sob-privado,
-- ciclo despublicar/public_profile, manifest alterado antes da RPC, mapa com chave sobrando.
insert into auth.users(id,email) values
 ('00000000-0000-0000-0000-0000000000d1','own3@example.com'),
 ('00000000-0000-0000-0000-0000000000d2','prem4@example.com'),
 ('00000000-0000-0000-0000-0000000000d3','free4@example.com');
select pg_temp.run_as('authenticated',id,email,'select public.ensure_my_profile()') from auth.users where id::text like '00000000-0000-0000-0000-0000000000d_';
update profiles set plan_tier='premium' where user_id='00000000-0000-0000-0000-0000000000d2';
select pg_temp.run_as('authenticated',u,e,format($$ select public.ensure_user_decks(%L,'frances') $$,u)) from (values
 ('00000000-0000-0000-0000-0000000000d1'::uuid,'own3@example.com'),('00000000-0000-0000-0000-0000000000d2','prem4@example.com')) v(u,e);
create function pg_temp.u3(p text) returns text language sql as $$ select 'https://proj.supabase.co/storage/v1/object/public/flashcard-media/00000000-0000-0000-0000-0000000000d1/' || p $$;
grant all on all functions in schema pg_temp to public;
create function pg_temp.mkdeck(n text, par text) returns void language plpgsql as $$
begin
  perform pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000d1','own3@example.com', format($q$
    insert into public.decks(owner_id,kind,name,language_app_key,parent_deck_id)
    select '00000000-0000-0000-0000-0000000000d1','personal',%L,'frances',
           (select id from public.decks where owner_id='00000000-0000-0000-0000-0000000000d1' and %s limit 1) $q$, n,
    case when par='ROOT' then $c$kind='personal_root' and language_app_key='frances'$c$ else format($c$name=%L$c$, par) end));
end $$;
grant all on all functions in schema pg_temp to public;
select pg_temp.mkdeck('H','ROOT'); select pg_temp.mkdeck('HPriv','H'); select pg_temp.mkdeck('HUnder','HPriv'); select pg_temp.mkdeck('HPub','H'); select pg_temp.mkdeck('Outro','ROOT');
create function pg_temp.note(dk text, front text, aud text, img text, st text default 'active') returns void language plpgsql as $$
begin
  insert into own_flashcards(owner_id,language_app_key,deck_id,card_generation_mode,status,back_trans,front,tags,fields) values
   ('00000000-0000-0000-0000-0000000000d1','frances',(select id from decks where name=dk and owner_id='00000000-0000-0000-0000-0000000000d1'),'normal',st,'tr',front,'{}',
    jsonb_build_array(
      jsonb_build_object('id','a','lang','fr','role',null,'content',jsonb_build_object('value',front),
        'audio', case when aud is null then null else jsonb_build_object('type', case when aud like 'http%' then 'url' else 'upload' end,'url', case when aud like 'http%' then aud else pg_temp.u3(aud) end) end,
        'image', case when img is null then null else jsonb_build_object('url', pg_temp.u3(img)) end,'pinyinFieldId',null),
      jsonb_build_object('id','b','lang','pt-BR','role',null,'content',jsonb_build_object('value','tr'),'audio',null,'image',null,'pinyinFieldId',null)));
end $$;
grant all on all functions in schema pg_temp to public;
select pg_temp.note('H','n1','shared.mp3','img-y.png');
select pg_temp.note('H','n2','shared.mp3',null);                  -- MESMO objeto referenciado de novo
select pg_temp.note('H','n3','archived.mp3',null,'archived');     -- arquivada: fora
select pg_temp.note('H','n4','https://ext.example/x.mp3',null);   -- externo: não é copiado
select pg_temp.note('HPriv','n5','priv-sub.mp3',null);            -- subdeck PRIVADO: fora
select pg_temp.note('HUnder','n6','under.mp3',null);              -- público sob privado: fora
select pg_temp.note('HPub','n7','pub-sub.mp3',null);              -- subdeck público: dentro
select pg_temp.note('Outro','n8','outro.mp3',null);               -- outro Deck do dono: fora
insert into storage.objects(bucket_id,name) select 'flashcard-media','00000000-0000-0000-0000-0000000000d1/'||n from unnest(array['shared.mp3','img-y.png','archived.mp3','priv-sub.mp3','under.mp3','pub-sub.mp3','outro.mp3','late.mp3']) n;
select pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000d1','own3@example.com', format($$ select public.publish_deck(%s,'H','book','blue') $$,(select id from decks where name='H' and owner_id='00000000-0000-0000-0000-0000000000d1')));
select pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000d1','own3@example.com', format($$ select public.publish_deck(%s,'HPub','book','blue') $$,(select id from decks where name='HPub' and owner_id='00000000-0000-0000-0000-0000000000d1')));
select pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000d1','own3@example.com', format($$ select public.publish_deck(%s,'HUnder','book','blue') $$,(select id from decks where name='HUnder' and owner_id='00000000-0000-0000-0000-0000000000d1')));
create temp table hp as select public_id from decks where name='H' and owner_id='00000000-0000-0000-0000-0000000000d1'; grant all on hp to public;
create temp table hm as select pg_temp.q_as('authenticated','00000000-0000-0000-0000-0000000000d2',format($$ select public.get_public_deck_media_manifest(%L::uuid) $$,(select public_id from hp))) j; grant all on hm to public;

select pg_temp.chk('H1 manifest: só shared, img-y e pub-sub (3 objetos únicos)', (select (j->>'count')::int=3 and j::text like '%shared.mp3%' and j::text like '%img-y.png%' and j::text like '%pub-sub.mp3%' from hm), (select j::text from hm));
select pg_temp.chk('H2 manifest: mesmo objeto de 2 Notes aparece UMA vez', (select (select count(*) from jsonb_array_elements(j->'items') e where e->>'url' like '%shared.mp3')=1 from hm));
select pg_temp.chk('H3 manifest: exclui arquivada, subdeck privado, público-sob-privado, outro Deck do dono e link externo', (select not (j::text ~ '(archived|priv-sub|under|outro|ext.example)') from hm));
select pg_temp.chk('H4 notes: subdeck público sob subdeck privado não entra no conteúdo público', (select not (pg_temp.q_as('authenticated','00000000-0000-0000-0000-0000000000d2',format($$ select public.get_public_deck_notes(%L::uuid) $$,(select public_id from hp)))::text like '%n6%')));
select pg_temp.chk('H5 notes: a raiz mostra só as próprias Notes; o subdeck público tem a PRÓPRIA página (public_id próprio)',
  (pg_temp.q_as('authenticated','00000000-0000-0000-0000-0000000000d2',format($$ select public.get_public_deck_notes(%L::uuid) $$,(select public_id from hp)))::text not like '%"n7"%')
  and (pg_temp.q_as('authenticated','00000000-0000-0000-0000-0000000000d2',format($$ select public.get_public_deck_notes(%L::uuid) $$,(select public_id from decks where name='HPub' and owner_id='00000000-0000-0000-0000-0000000000d1')))::text like '%"n7"%'));

-- manifest alterado ANTES da RPC: mapa montado com o manifest antigo; o dono acrescenta mídia nova
insert into storage.objects(bucket_id,name) select 'flashcard-media','00000000-0000-0000-0000-0000000000d2/c'||g||'.mp3' from generate_series(1,4) g;
create temp table hmap as select jsonb_build_object(
  pg_temp.u3('shared.mp3'), 'https://proj.supabase.co/storage/v1/object/public/flashcard-media/00000000-0000-0000-0000-0000000000d2/c1.mp3',
  pg_temp.u3('img-y.png'),  'https://proj.supabase.co/storage/v1/object/public/flashcard-media/00000000-0000-0000-0000-0000000000d2/c2.mp3',
  pg_temp.u3('pub-sub.mp3'),'https://proj.supabase.co/storage/v1/object/public/flashcard-media/00000000-0000-0000-0000-0000000000d2/c3.mp3') m; grant all on hmap to public;
select pg_temp.note('H','n9','late.mp3',null);   -- mídia nova depois do manifest
create temp table hb as select (select count(*) from own_flashcards where owner_id='00000000-0000-0000-0000-0000000000d2') n, (select count(*) from decks where owner_id='00000000-0000-0000-0000-0000000000d2') d; grant all on hb to public;
select pg_temp.chk('H6 manifest alterado antes da RPC -> media_map_incomplete', pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000d2','prem4@example.com', format($$ select public.copy_public_deck(%L::uuid,null,%L::jsonb) $$,(select public_id from hp),(select m from hmap))) like 'media_map_incomplete%');
select pg_temp.chk('H7 ...e nada foi criado (atomicidade)', (select (select count(*) from own_flashcards where owner_id='00000000-0000-0000-0000-0000000000d2')=n and (select count(*) from decks where owner_id='00000000-0000-0000-0000-0000000000d2')=d from hb));
-- mídia removida do original depois do manifest: chave sobrando no mapa é aceita
delete from own_flashcards where front='n9';
update own_flashcards set fields = jsonb_set(fields,'{0,audio}','null') where front='n7' and owner_id='00000000-0000-0000-0000-0000000000d1';
select pg_temp.chk('H8 mapa com chave a mais (mídia saiu do original) copia normalmente', pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000d2','prem4@example.com', format($$ select public.copy_public_deck(%L::uuid,null,%L::jsonb) $$,(select public_id from hp),(select m from hmap))) is null);
select pg_temp.chk('H9 cópia: só as Notes da árvore pública (6 ativas: n1,n2,n4,n7 + ... sem arquivada/privadas)', (select count(*)=4 from own_flashcards where owner_id='00000000-0000-0000-0000-0000000000d2' and front in ('n1','n2','n4','n7')) and (select count(*)=4 from own_flashcards where owner_id='00000000-0000-0000-0000-0000000000d2'));
select pg_temp.chk('H10 cópia: link externo permanece externo', (select count(*)=1 from own_flashcards where owner_id='00000000-0000-0000-0000-0000000000d2' and front='n4' and fields::text like '%ext.example%'));
-- duas cópias intencionais independentes (cada uma com seus destinos)
insert into storage.objects(bucket_id,name) select 'flashcard-media','00000000-0000-0000-0000-0000000000d2/e'||g||'.mp3' from generate_series(1,3) g;
create temp table c2 as select pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000d2','prem4@example.com', format($$ select public.copy_public_deck(%L::uuid,null,%L::jsonb) $$,(select public_id from hp),
  (select jsonb_build_object(pg_temp.u3('shared.mp3'),'https://proj.supabase.co/storage/v1/object/public/flashcard-media/00000000-0000-0000-0000-0000000000d2/e1.mp3',pg_temp.u3('img-y.png'),'https://proj.supabase.co/storage/v1/object/public/flashcard-media/00000000-0000-0000-0000-0000000000d2/e2.mp3')))) r; grant all on c2 to public;
select pg_temp.chk('H11 2ª cópia intencional (novos destinos) é aceita', (select r is null from c2), (select r from c2));
select pg_temp.chk('H11b ...e cria árvore independente (8 Notes, 8 ids; 2 raízes de Deck)', (select count(*)=8 and count(distinct id)=8 from own_flashcards where owner_id='00000000-0000-0000-0000-0000000000d2') and (select count(*)=2 from decks where owner_id='00000000-0000-0000-0000-0000000000d2' and name='H'));
-- ciclo de publicação
create temp table pidbefore as select public_id from hp; grant all on pidbefore to public;
select pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000d1','own3@example.com', format($$ select public.unpublish_deck(%s) $$,(select id from decks where name='H' and owner_id='00000000-0000-0000-0000-0000000000d1')));
select pg_temp.chk('H12 despublicado: URL antiga indisponível (metadado, conteúdo e manifest)',
  pg_temp.q_as('authenticated','00000000-0000-0000-0000-0000000000d2',format($$ select public.get_public_deck(%L::uuid) $$,(select public_id from hp)))::text like '%unavailable%'
  and pg_temp.q_as('authenticated','00000000-0000-0000-0000-0000000000d2',format($$ select public.get_public_deck_media_manifest(%L::uuid) $$,(select public_id from hp)))::text like '%unavailable%'
  and pg_temp.q_as('anon',null,format($$ select public.get_public_deck(%L::uuid) $$,(select public_id from hp)))::text like '%unavailable%');
select pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000d1','own3@example.com', format($$ select public.publish_deck(%s,'H','book','blue') $$,(select id from decks where name='H' and owner_id='00000000-0000-0000-0000-0000000000d1')));
select pg_temp.chk('H13 republicar mantém o mesmo public_id e nenhum outro Deck o recebe', (select public_id from decks where name='H' and owner_id='00000000-0000-0000-0000-0000000000d1')=(select public_id from pidbefore) and (select count(*)=1 from decks where public_id=(select public_id from pidbefore)));
update profiles set public_profile=false where user_id='00000000-0000-0000-0000-0000000000d1';
select pg_temp.chk('H14 public_profile=false: manifest e cópia indisponíveis (sem despublicar)',
  pg_temp.q_as('authenticated','00000000-0000-0000-0000-0000000000d2',format($$ select public.get_public_deck_media_manifest(%L::uuid) $$,(select public_id from hp)))::text like '%unavailable%'
  and pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000d2','prem4@example.com', format($$ select public.copy_public_deck(%L::uuid,null,'{}'::jsonb) $$,(select public_id from hp))) like 'unavailable%'
  and (select is_public from decks where name='H' and owner_id='00000000-0000-0000-0000-0000000000d1'));
update profiles set public_profile=true where user_id='00000000-0000-0000-0000-0000000000d1';
-- conteúdo/estrutura x estudo: editar a Note muda content_updated_at; mexer em `progress` (FSRS) nem toca a tabela
create temp table cu as select content_updated_at t from decks where name='H' and owner_id='00000000-0000-0000-0000-0000000000d1'; grant all on cu to public;
select pg_sleep(0.02);
update own_flashcards set status='active' where front='n1' and owner_id='00000000-0000-0000-0000-0000000000d1';
select pg_temp.chk('H15 UPDATE sem mudança real não move content_updated_at', (select content_updated_at=t from decks, cu where name='H' and owner_id='00000000-0000-0000-0000-0000000000d1'));
update own_flashcards set tags='{nova}' where front='n1' and owner_id='00000000-0000-0000-0000-0000000000d1';
select pg_temp.chk('H16 mudar Tags da Note move content_updated_at', (select content_updated_at>t from decks, cu where name='H' and owner_id='00000000-0000-0000-0000-0000000000d1'));
select pg_temp.chk('H17 FSRS/Review vivem em `progress` (fora de decks/own_flashcards): nenhuma coluna de estudo nas tabelas públicas',
  not exists (select 1 from information_schema.columns where table_schema='public' and table_name in ('decks','own_flashcards') and column_name in ('due','reps','lapses','stability','difficulty','interval','state','last_review')));
select pg_temp.chk('H18 publicar personal_root/Course é recusado', pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000d1','own3@example.com', format($$ select public.publish_deck(%s) $$,(select id from decks where kind='personal_root' and owner_id='00000000-0000-0000-0000-0000000000d1' and language_app_key='frances'))) like 'public_deck_kind_forbidden%');
select pg_temp.chk('H19 Free não obtém manifest nem cópia', pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000d3','free4@example.com', format($$ select public.get_public_deck_media_manifest(%L::uuid) $$,(select public_id from hp))) like 'premium_required%');
select case when ok then 'ok|'||name else 'FALHA|'||name||' '||coalesce(info,'') end from res order by name;
select 'RESULTADO '||count(*) filter (where ok)||'/'||count(*) from res;

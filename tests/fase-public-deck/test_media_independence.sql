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


-- ===== atores (novos, não colidem com test_public_deck.sql) =====
insert into auth.users(id,email) values
 ('00000000-0000-0000-0000-0000000000f1','owner2@example.com'),
 ('00000000-0000-0000-0000-0000000000f2','free2@example.com'),
 ('00000000-0000-0000-0000-0000000000f3','prem2@example.com'),
 ('00000000-0000-0000-0000-0000000000f4','prem3@example.com');
select pg_temp.run_as('authenticated',id,email,'select public.ensure_my_profile()') from auth.users where id::text like '00000000-0000-0000-0000-0000000000f_';
update profiles set plan_tier='premium' where user_id in ('00000000-0000-0000-0000-0000000000f3','00000000-0000-0000-0000-0000000000f4');
select pg_temp.run_as('authenticated',u,e,format($$ select public.ensure_user_decks(%L,'frances') $$,u)) from (values
 ('00000000-0000-0000-0000-0000000000f1'::uuid,'owner2@example.com'),('00000000-0000-0000-0000-0000000000f3','prem2@example.com'),('00000000-0000-0000-0000-0000000000f4','prem3@example.com')) v(u,e);
select pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000f1','owner2@example.com',$$ select public.ensure_user_decks('00000000-0000-0000-0000-0000000000f1','portugues') $$);

create function pg_temp.url(p text) returns text language sql as $$ select 'https://proj.supabase.co/storage/v1/object/public/flashcard-media/' || p $$;
grant all on all functions in schema pg_temp to public;

-- helper: flashcard_media_path
select pg_temp.chk('PATH url do bucket -> caminho', public.flashcard_media_path(pg_temp.url('a/b.mp3'))='a/b.mp3');
select pg_temp.chk('PATH link externo -> null', public.flashcard_media_path('https://ext.com/x.mp3') is null);
select pg_temp.chk('PATH outro bucket -> null', public.flashcard_media_path('https://p.supabase.co/storage/v1/object/public/avatars/a.png') is null);
select pg_temp.chk('PATH com .. -> null', public.flashcard_media_path(pg_temp.url('a/../b.mp3')) is null);
select pg_temp.chk('PATH com query -> null', public.flashcard_media_path(pg_temp.url('a/b.mp3?x=1')) is null);

-- ===== Deck público com mídia do dono =====
select pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000f1','owner2@example.com', $$
  insert into public.decks(owner_id,kind,name,language_app_key,parent_deck_id)
  select owner_id,'personal','Com Mídia',language_app_key,id from public.decks where kind='personal_root' and owner_id='00000000-0000-0000-0000-0000000000f1' and language_app_key='frances' $$);
select pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000f1','owner2@example.com', $$
  insert into public.decks(owner_id,kind,name,language_app_key,parent_deck_id)
  select owner_id,'personal','Sub com mídia',language_app_key,id from public.decks where name='Com Mídia' and owner_id='00000000-0000-0000-0000-0000000000f1' $$);
create temp table m as select (select id from decks where name='Com Mídia') d, (select id from decks where name='Sub com mídia') sd,
  'f1' o; grant all on m to public;
insert into storage.objects(bucket_id,name) values
 ('flashcard-media','00000000-0000-0000-0000-0000000000f1/audio-1.mp3'),('flashcard-media','00000000-0000-0000-0000-0000000000f1/image-1.png'),
 ('flashcard-media','00000000-0000-0000-0000-0000000000f1/audio-2.mp3'),('flashcard-media','00000000-0000-0000-0000-0000000000f1/tts-3.mp3'),
 ('flashcard-media','00000000-0000-0000-0000-0000000000f1/audio-4.mp3'),('flashcard-media','00000000-0000-0000-0000-0000000000f1/image-4.png'),
 ('flashcard-media','00000000-0000-0000-0000-0000000000f1/audio-5.mp3');
insert into own_flashcards(owner_id,language_app_key,deck_id,card_generation_mode,fields,tags,back_trans,front) values
 -- 0: sem mídia
 ('00000000-0000-0000-0000-0000000000f1','frances',(select d from m),'normal',
  '[{"id":"a","lang":"fr","role":null,"content":{"value":"sem midia"},"audio":null,"image":null,"pinyinFieldId":null},{"id":"b","lang":"pt-BR","role":null,"content":{"value":"sem mídia"},"audio":null,"image":null,"pinyinFieldId":null}]','{}','sem mídia','sem midia'),
 -- 1: áudio (upload) + imagem
 ('00000000-0000-0000-0000-0000000000f1','frances',(select d from m),'normal',
  format('[{"id":"a","lang":"fr","role":null,"content":{"value":"bonjour"},"audio":{"type":"upload","url":"%s","storagePath":"SEGREDO/a.mp3"},"image":{"url":"%s"},"pinyinFieldId":null},{"id":"b","lang":"pt-BR","role":null,"content":{"value":"olá"},"audio":null,"image":null,"pinyinFieldId":null}]',pg_temp.url('00000000-0000-0000-0000-0000000000f1/audio-1.mp3'),pg_temp.url('00000000-0000-0000-0000-0000000000f1/image-1.png'))::jsonb,'{}','olá','bonjour'),
 -- 2: MC com áudio no prompt e TTS gerado na resposta + link externo no distrator
 ('00000000-0000-0000-0000-0000000000f1','frances',(select sd from m),'multiple_choice',
  format('[{"id":"p","lang":"fr","role":"prompt","content":{"value":"maison"},"audio":{"type":"recording","url":"%s"},"image":null,"pinyinFieldId":null},{"id":"r","lang":"pt-BR","role":"answer","content":{"value":"casa"},"audio":{"type":"tts","generatedUrl":"%s","storagePath":"SEGREDO/t.mp3","generationKey":"SEGREDO-K"},"image":null,"pinyinFieldId":null},{"id":"d","lang":null,"role":"distractor","content":{"value":"carro"},"audio":{"type":"url","url":"https://ext.example/carro.mp3"},"image":null,"pinyinFieldId":null}]',
   pg_temp.url('00000000-0000-0000-0000-0000000000f1/audio-2.mp3'),pg_temp.url('00000000-0000-0000-0000-0000000000f1/tts-3.mp3'))::jsonb,'{}','casa','maison');
-- 3: LEGADO com áudio e imagem (vira Native pelo mapeamento)
insert into own_flashcards(owner_id,language_app_key,deck_id,front,back_trans,audio_url,image_url) values
 ('00000000-0000-0000-0000-0000000000f1','frances',(select d from m),'merci','obrigado',pg_temp.url('00000000-0000-0000-0000-0000000000f1/audio-4.mp3'),pg_temp.url('00000000-0000-0000-0000-0000000000f1/image-4.png'));
select pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000f1','owner2@example.com', format($$ select public.publish_deck(%s,'Deck com mídia','book','blue') $$,(select d from m)));
select pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000f1','owner2@example.com', format($$ select public.publish_deck(%s,'Sub','book','green') $$,(select sd from m)));
create temp table pid as select public_id from decks where id=(select d from m); grant all on pid to public;
create function pg_temp.mp(p text) returns text language sql as $$ select '00000000-0000-0000-0000-0000000000f1/' || p $$;

-- ===== legado + mídia: incompatível quando não há Field de destino seguro =====
insert into own_flashcards(owner_id,language_app_key,front,back_trans,audio_url) values
 ('00000000-0000-0000-0000-0000000000f1','portugues','oi','hi',pg_temp.url('00000000-0000-0000-0000-0000000000f1/audio-5.mp3'));
select pg_temp.chk('LEG legado portugues com mídia -> incompatível (não publica parcial)', (select public.public_note_native(f) is null from own_flashcards f where language_app_key='portugues' and front='oi'));
select pg_temp.chk('LEG legado frances com mídia -> compatível, mídia no Field do idioma estudado',
  (select (public.public_note_native(f)->'fields'->0->'audio'->>'url') = pg_temp.url('00000000-0000-0000-0000-0000000000f1/audio-4.mp3')
      and (public.public_note_native(f)->'fields'->0->'image'->>'url') = pg_temp.url('00000000-0000-0000-0000-0000000000f1/image-4.png')
      and public.public_note_native(f)->'fields'->1->'audio' = 'null'::jsonb from own_flashcards f where front='merci' and owner_id='00000000-0000-0000-0000-0000000000f1'));
select pg_temp.chk('LEG linha legada original não foi alterada', (select audio_url=pg_temp.url('00000000-0000-0000-0000-0000000000f1/audio-4.mp3') and fields is null from own_flashcards where front='merci' and owner_id='00000000-0000-0000-0000-0000000000f1'));

-- ===== manifest =====
select pg_temp.chk('MAN anon sem permissão', pg_temp.run_as('anon',null,'x',format($$ select public.get_public_deck_media_manifest(%L::uuid) $$,(select public_id from pid))) like '%permission denied%');
select pg_temp.chk('MAN free -> premium_required', pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000f2','free2@example.com',format($$ select public.get_public_deck_media_manifest(%L::uuid) $$,(select public_id from pid))) like 'premium_required%');
select pg_temp.chk('MAN dono não-Premium -> premium_required', pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000f1','owner2@example.com',format($$ select public.get_public_deck_media_manifest(%L::uuid) $$,(select public_id from pid))) like 'premium_required%');
update profiles set plan_tier='premium' where user_id='00000000-0000-0000-0000-0000000000f1';
select pg_temp.chk('MAN dono Premium -> cannot_copy_own_deck', pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000f1','owner2@example.com',format($$ select public.get_public_deck_media_manifest(%L::uuid) $$,(select public_id from pid))) like 'cannot_copy_own_deck%');
update profiles set plan_tier='free' where user_id='00000000-0000-0000-0000-0000000000f1';
create temp table man as select pg_temp.q_as('authenticated','00000000-0000-0000-0000-0000000000f3',format($$ select public.get_public_deck_media_manifest(%L::uuid) $$,(select public_id from pid))) j; grant all on man to public;
select pg_temp.chk('MAN premium: 6 URLs do bucket (áudio, imagem, gravação, tts gerado, legado áudio+imagem), link externo NÃO listado',
  (select (j->>'count')::int=6 and not (j::text like '%ext.example%') from man), (select j::text from man));
select pg_temp.chk('MAN inclui subdeck público; não vaza storagePath/generationKey', (select j::text like '%audio-2.mp3%' and not (j::text ~ '(SEGREDO|storagePath|generationKey)') from man));
select pg_temp.chk('MAN deck sem mídia -> lista vazia', pg_temp.q_as('authenticated','00000000-0000-0000-0000-0000000000f3',format($$ select public.get_public_deck_media_manifest(%L::uuid) $$,(select public_id from decks where id=(select sd from m)))) is not null);

-- ===== cópia SEM mapa: recusada e NADA é criado =====
create temp table before_cnt as select (select count(*) from own_flashcards where owner_id='00000000-0000-0000-0000-0000000000f3') n, (select count(*) from decks where owner_id='00000000-0000-0000-0000-0000000000f3') d; grant all on before_cnt to public;
select pg_temp.chk('CP sem mapa -> media_map_incomplete', pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000f3','prem2@example.com', format($$ select public.copy_public_deck(%L::uuid) $$,(select public_id from pid))) like 'media_map_incomplete%');
select pg_temp.chk('CP sem mapa: atomicidade (nenhum Deck/Note criado)', (select (select count(*) from own_flashcards where owner_id='00000000-0000-0000-0000-0000000000f3')=n and (select count(*) from decks where owner_id='00000000-0000-0000-0000-0000000000f3')=d from before_cnt));

-- ===== mapa inválido =====
-- (destino inexistente no Storage / pasta de outro usuário / sem mudança / link externo)
select pg_temp.chk('MAPA destino inexistente no Storage -> invalid_media_map', pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000f3','prem2@example.com',
  format($$ select public.copy_public_deck(%L::uuid, null, %L::jsonb) $$,(select public_id from pid), jsonb_build_object(pg_temp.url(pg_temp.mp('audio-1.mp3')), pg_temp.url('00000000-0000-0000-0000-0000000000f3/nao-existe.mp3')))) like 'invalid_media_map%');
insert into storage.objects(bucket_id,name) values ('flashcard-media','00000000-0000-0000-0000-0000000000f4/outro.mp3');
select pg_temp.chk('MAPA destino na pasta de OUTRO usuário -> invalid_media_map', pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000f3','prem2@example.com',
  format($$ select public.copy_public_deck(%L::uuid, null, %L::jsonb) $$,(select public_id from pid), jsonb_build_object(pg_temp.url(pg_temp.mp('audio-1.mp3')), pg_temp.url('00000000-0000-0000-0000-0000000000f4/outro.mp3')))) like 'invalid_media_map%');
select pg_temp.chk('MAPA destino == origem (continua no arquivo do original) -> invalid_media_map', pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000f3','prem2@example.com',
  format($$ select public.copy_public_deck(%L::uuid, null, %L::jsonb) $$,(select public_id from pid), jsonb_build_object(pg_temp.url(pg_temp.mp('audio-1.mp3')), pg_temp.url(pg_temp.mp('audio-1.mp3'))))) like 'invalid_media_map%');
select pg_temp.chk('MAPA destino link externo -> invalid_media_map', pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000f3','prem2@example.com',
  format($$ select public.copy_public_deck(%L::uuid, null, %L::jsonb) $$,(select public_id from pid), jsonb_build_object(pg_temp.url(pg_temp.mp('audio-1.mp3')), 'https://ext.example/x.mp3'))) like 'invalid_media_map%');
select pg_temp.chk('MAPA não-objeto -> invalid_media_map', pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000f3','prem2@example.com',
  format($$ select public.copy_public_deck(%L::uuid, null, '[]'::jsonb) $$,(select public_id from pid))) like 'invalid_media_map%');
select pg_temp.chk('MAPA inválido: atomicidade (nada criado)', (select (select count(*) from own_flashcards where owner_id='00000000-0000-0000-0000-0000000000f3')=n and (select count(*) from decks where owner_id='00000000-0000-0000-0000-0000000000f3')=d from before_cnt));

-- ===== cópia correta: o cliente duplicou os objetos na PRÓPRIA pasta =====
insert into storage.objects(bucket_id,name)
 select 'flashcard-media','00000000-0000-0000-0000-0000000000f3/pubcopy-'||i||'.'||ext from (values (1,'mp3'),(2,'png'),(3,'mp3'),(4,'mp3'),(5,'mp3'),(6,'png')) v(i,ext);
create temp table mm as select jsonb_build_object(
  pg_temp.url(pg_temp.mp('audio-1.mp3')), pg_temp.url('00000000-0000-0000-0000-0000000000f3/pubcopy-1.mp3'),
  pg_temp.url(pg_temp.mp('image-1.png')), pg_temp.url('00000000-0000-0000-0000-0000000000f3/pubcopy-2.png'),
  pg_temp.url(pg_temp.mp('audio-2.mp3')), pg_temp.url('00000000-0000-0000-0000-0000000000f3/pubcopy-3.mp3'),
  pg_temp.url(pg_temp.mp('tts-3.mp3')), pg_temp.url('00000000-0000-0000-0000-0000000000f3/pubcopy-4.mp3'),
  pg_temp.url(pg_temp.mp('audio-4.mp3')), pg_temp.url('00000000-0000-0000-0000-0000000000f3/pubcopy-5.mp3'),
  pg_temp.url(pg_temp.mp('image-4.png')), pg_temp.url('00000000-0000-0000-0000-0000000000f3/pubcopy-6.png')) j; grant all on mm to public;
create temp table cpm as select pg_temp.q_as('authenticated','00000000-0000-0000-0000-0000000000f3',format($$ select public.copy_public_deck(%L::uuid, null, %L::jsonb) $$,(select public_id from pid),(select j from mm))) j; grant all on cpm to public;
select pg_temp.chk('CP com mapa: copiou 4 Notes (3 + 1 do subdeck público), 0 incompatíveis', (select (j->>'notes_copied')::int=4 and (j->>'skipped_incompatible')::int=0 from cpm), (select j::text from cpm));
select pg_temp.chk('CP media_remapped reporta as URLs reescritas', (select (j->>'media_remapped')::int=6 from cpm), (select j::text from cpm));
select pg_temp.chk('IND nenhuma Note copiada referencia a pasta do autor original', not exists (select 1 from own_flashcards where owner_id='00000000-0000-0000-0000-0000000000f3' and fields::text like '%0000000000f1%'));
select pg_temp.chk('IND toda mídia da cópia aponta para objeto EXISTENTE da pasta do copiador', (select bool_and(exists (select 1 from storage.objects o where o.bucket_id='flashcard-media' and o.name=public.flashcard_media_path(u)) and split_part(public.flashcard_media_path(u),'/',1)='00000000-0000-0000-0000-0000000000f3')
   from own_flashcards f cross join lateral public.native_fields_media_urls(f.fields) u where f.owner_id='00000000-0000-0000-0000-0000000000f3'));
select pg_temp.chk('IND 6 referências de mídia na cópia (áudio, imagem, gravação, tts gerado, legado áudio+imagem)', (select count(*)=6 from own_flashcards f cross join lateral public.native_fields_media_urls(f.fields) u where f.owner_id='00000000-0000-0000-0000-0000000000f3'));
select pg_temp.chk('IND link externo permanece link (não é do app)', (select count(*)=1 from own_flashcards where owner_id='00000000-0000-0000-0000-0000000000f3' and fields::text like '%ext.example/carro.mp3%'));
select pg_temp.chk('IND sem storagePath/generationKey do original na cópia', not exists (select 1 from own_flashcards where owner_id='00000000-0000-0000-0000-0000000000f3' and fields::text ~ '(storagePath|generationKey|SEGREDO)'));
select pg_temp.chk('IND Legado virou Native com mídia remapeada no Field do idioma estudado', (select (fields->0->'audio'->>'url')=pg_temp.url('00000000-0000-0000-0000-0000000000f3/pubcopy-5.mp3') and (fields->0->'image'->>'url')=pg_temp.url('00000000-0000-0000-0000-0000000000f3/pubcopy-6.png') and card_generation_mode='normal' from own_flashcards where owner_id='00000000-0000-0000-0000-0000000000f3' and back_trans='obrigado'));
select pg_temp.chk('IND Notes/CardInstances independentes (ids distintos, dono diferente)', (select count(*)=4 from own_flashcards c where c.owner_id='00000000-0000-0000-0000-0000000000f3' and c.id not in (select id from own_flashcards where owner_id='00000000-0000-0000-0000-0000000000f1')));
select pg_temp.chk('IND atribuição = autor original', (select bool_and(tags @> array['criado-por-'||(select username from profiles where user_id='00000000-0000-0000-0000-0000000000f1')]) from own_flashcards where owner_id='00000000-0000-0000-0000-0000000000f3'));
create temp table snap as select id, fields from own_flashcards where owner_id='00000000-0000-0000-0000-0000000000f3'; grant all on snap to public;

-- ===== o autor destrói/altera tudo =====
delete from storage.objects where bucket_id='flashcard-media' and name like '00000000-0000-0000-0000-0000000000f1/%';
select pg_temp.chk('ORIG original perdeu os arquivos (simulação de exclusão)', (select count(*)=0 from storage.objects where name like '00000000-0000-0000-0000-0000000000f1/%'));
select pg_temp.chk('IND após apagar mídia original: cópia ainda aponta para objetos existentes', (select bool_and(exists (select 1 from storage.objects o where o.bucket_id='flashcard-media' and o.name=public.flashcard_media_path(u)))
   from own_flashcards f cross join lateral public.native_fields_media_urls(f.fields) u where f.owner_id='00000000-0000-0000-0000-0000000000f3'));
select pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000f1','owner2@example.com', format($$ select public.unpublish_deck(%s) $$,(select d from m)));
select pg_temp.chk('IND após despublicar: cópia intacta', (select count(*)=4 and bool_and(s.fields=f.fields) from own_flashcards f join snap s using(id) where f.owner_id='00000000-0000-0000-0000-0000000000f3'));
update own_flashcards set audio_url=pg_temp.url('00000000-0000-0000-0000-0000000000f1/novo.mp3'), fields=null where owner_id='00000000-0000-0000-0000-0000000000f1' and front='merci';
update own_flashcards set fields=replace(fields::text,'audio-1.mp3','trocado.mp3')::jsonb where owner_id='00000000-0000-0000-0000-0000000000f1' and fields::text like '%audio-1.mp3%';
select pg_temp.chk('IND após substituir mídia do original: cópia intacta', (select count(*)=4 and bool_and(s.fields=f.fields) from own_flashcards f join snap s using(id) where f.owner_id='00000000-0000-0000-0000-0000000000f3'));
delete from decks where id=(select d from m);
select pg_temp.chk('IND após excluir o Deck original: cópia intacta', (select count(*)=4 and bool_and(s.fields=f.fields) from own_flashcards f join snap s using(id) where f.owner_id='00000000-0000-0000-0000-0000000000f3'));
update profiles set display_name='Outro Nome Qualquer' where user_id='00000000-0000-0000-0000-0000000000f1';
select pg_temp.chk('IND após trocar display_name do autor: atribuição histórica igual', (select bool_and(tags @> array['criado-por-'||(select username from profiles where user_id='00000000-0000-0000-0000-0000000000f1')]) from own_flashcards where owner_id='00000000-0000-0000-0000-0000000000f3'));

-- ===== cópia de cópia =====
select pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000f3','prem2@example.com', format($$ select public.publish_deck(%s,'Cópia republicada','book','gray') $$,(select (j->>'deck_id')::bigint from cpm)));
create temp table pid2 as select public_id from decks where id=(select (j->>'deck_id')::bigint from cpm); grant all on pid2 to public;
create temp table man2 as select pg_temp.q_as('authenticated','00000000-0000-0000-0000-0000000000f4',format($$ select public.get_public_deck_media_manifest(%L::uuid) $$,(select public_id from pid2))) j; grant all on man2 to public;
select pg_temp.chk('CC manifest (cópia republicada, subdeck privado) aponta para a pasta do 1º copiador (f3), não do autor', (select (j->>'count')::int=4 and j::text like '%0000000000f3%' and not j::text like '%0000000000f1%' from man2), (select j::text from man2));
insert into storage.objects(bucket_id,name) select 'flashcard-media','00000000-0000-0000-0000-0000000000f4/pubcopy-'||i||'.bin' from generate_series(1,6) i;
create temp table mm2 as select jsonb_object_agg(it->>'url', pg_temp.url('00000000-0000-0000-0000-0000000000f4/pubcopy-'||ord||'.bin')) j from (select it, ord from jsonb_array_elements((select j->'items' from man2)) with ordinality t(it, ord)) q; grant all on mm2 to public;
create temp table cc2 as select pg_temp.q_as('authenticated','00000000-0000-0000-0000-0000000000f4',format($$ select public.copy_public_deck(%L::uuid, null, %L::jsonb) $$,(select public_id from pid2),(select j from mm2))) j; grant all on cc2 to public;
select pg_temp.chk('CC copia de copia OK e sem referência a f1/f3', (select (j->>'notes_copied')::int=3 from cc2) and not exists (select 1 from own_flashcards where owner_id='00000000-0000-0000-0000-0000000000f4' and (fields::text like '%0000000000f1%' or fields::text like '%0000000000f3%')), (select j::text from cc2));
select pg_temp.chk('CC atribuição da cópia de cópia = só o autor original', (select bool_and(tags @> array['criado-por-'||(select username from profiles where user_id='00000000-0000-0000-0000-0000000000f1')] and not tags @> array['criado-por-'||(select username from profiles where user_id='00000000-0000-0000-0000-0000000000f3')]) from own_flashcards where owner_id='00000000-0000-0000-0000-0000000000f4'));

-- ===== limites TÉCNICOS (configuráveis) =====
select pg_temp.chk('LIM padrão: 2000 notas / 2000 mídias', public.public_deck_copy_max_notes()=2000 and public.public_deck_copy_max_media()=2000);
select pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000f1','owner2@example.com', $$
  insert into public.decks(owner_id,kind,name,language_app_key,parent_deck_id)
  select owner_id,'personal','Limites',language_app_key,id from public.decks where kind='personal_root' and owner_id='00000000-0000-0000-0000-0000000000f1' and language_app_key='frances' $$);
select pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000f1','owner2@example.com', $$
  insert into public.decks(owner_id,kind,name,language_app_key,parent_deck_id)
  select owner_id,'personal','Limites sub',language_app_key,id from public.decks where name='Limites' and owner_id='00000000-0000-0000-0000-0000000000f1' $$);
create temp table lm as select (select id from decks where name='Limites') d, (select id from decks where name='Limites sub') sd; grant all on lm to public;
insert into own_flashcards(owner_id,language_app_key,deck_id,front,back_trans) select '00000000-0000-0000-0000-0000000000f1','frances',(select d from lm),'l'||g,'t'||g from generate_series(1,2) g;
insert into own_flashcards(owner_id,language_app_key,deck_id,front,back_trans) select '00000000-0000-0000-0000-0000000000f1','frances',(select sd from lm),'s'||g,'u'||g from generate_series(1,2) g;
select pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000f1','owner2@example.com', format($$ select public.publish_deck(%s,'Limites','book','blue') $$,(select d from lm)));
select pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000f1','owner2@example.com', format($$ select public.publish_deck(%s,'Limites sub','book','blue') $$,(select sd from lm)));
create temp table lpid as select public_id from decks where id=(select d from lm); grant all on lpid to public;
select set_config('app.public_deck_copy_max_notes','1',false);
select pg_temp.chk('LIM get_public_deck_notes sinaliza truncated (2 notas > limite 1)', (pg_temp.q_as('authenticated','00000000-0000-0000-0000-0000000000f3',format($$ select public.get_public_deck_notes(%L::uuid) $$,(select public_id from lpid)))->>'truncated')='true');
select set_config('app.public_deck_copy_max_notes','4',false);
select pg_temp.chk('LIM exatamente no limite (4 notas = raiz 2 + subdeck 2) copia', pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000f3','prem2@example.com', format($$ select public.copy_public_deck(%L::uuid) $$,(select public_id from lpid))) is null);
select set_config('app.public_deck_copy_max_notes','3',false);
select pg_temp.chk('LIM limite+1 (4 > 3, contando subdeck público) -> deck_too_large', pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000f3','prem2@example.com', format($$ select public.copy_public_deck(%L::uuid) $$,(select public_id from lpid))) like 'deck_too_large%');
select set_config('app.public_deck_copy_max_notes','',false);
select set_config('app.public_deck_copy_max_media','1',false);
select pg_temp.chk('LIM mapa de mídia acima do limite técnico -> deck_media_too_large', pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000f3','prem2@example.com',
  format($$ select public.copy_public_deck(%L::uuid, null, %L::jsonb) $$,(select public_id from lpid), jsonb_build_object(pg_temp.url(pg_temp.mp('a.mp3')),pg_temp.url('00000000-0000-0000-0000-0000000000f3/pubcopy-1.mp3'),pg_temp.url(pg_temp.mp('b.mp3')),pg_temp.url('00000000-0000-0000-0000-0000000000f3/pubcopy-2.png')))) like 'deck_media_too_large%');
select set_config('app.public_deck_copy_max_media','',false);
select pg_temp.chk('LIM não confunde com o limite Free de 20 CardInstances (Free segue recusado, premium não tem teto de 20)', pg_temp.run_as('authenticated','00000000-0000-0000-0000-0000000000f2','free2@example.com', format($$ select public.copy_public_deck(%L::uuid) $$,(select public_id from lpid))) like 'premium_required%');

select case when ok then 'ok' else 'FALHA' end || '|' || name || case when ok then '' else '  ' || coalesce(info,'') end from res order by ok, name;
select 'RESULTADO ' || count(*) filter (where ok) || '/' || count(*) from res;

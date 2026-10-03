-- D2 -- fixtures do teste diferencial (Postgres LOCAL). Dono dd1 (Premium, perfil público), copiador dd3 (Premium).
-- Decks públicos com mídia em todos os formatos suportados pelo modelo: upload (com storagePath/generationKey),
-- TTS (generatedUrl), imagem, link externo, URL com '..'/query (não é do bucket), JSON null, mídia compartilhada
-- entre Notes, Legacy com audio_url/image_url, MC/cloze/reverso/type_answer, Note arquivada, subdecks, zh com pinyin.
\set ON_ERROR_STOP on
create schema if not exists d2t;
create or replace function d2t.u(p text) returns text language sql immutable as $$ select 'https://proj.supabase.co/storage/v1/object/public/flashcard-media/' || p $$;
create or replace function d2t.as_user(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
end $$;
create unique index if not exists bucketid_objname on storage.objects(bucket_id, name);
delete from own_flashcards where owner_id in ('00000000-0000-0000-0000-000000000dd1','00000000-0000-0000-0000-000000000dd3');
delete from decks where owner_id in ('00000000-0000-0000-0000-000000000dd1','00000000-0000-0000-0000-000000000dd3') and kind = 'personal';
delete from storage.objects where split_part(name,'/',1) in ('00000000-0000-0000-0000-000000000dd1','00000000-0000-0000-0000-000000000dd3');
insert into auth.users(id,email) values ('00000000-0000-0000-0000-000000000dd1','d2own@example.com'),('00000000-0000-0000-0000-000000000dd3','d2prem@example.com') on conflict do nothing;
do $$ declare u uuid; begin
  foreach u in array array['00000000-0000-0000-0000-000000000dd1'::uuid,'00000000-0000-0000-0000-000000000dd3'::uuid] loop
    perform d2t.as_user(u); set local role authenticated;
    perform public.ensure_my_profile(); perform public.ensure_user_decks(u,'frances'); perform public.ensure_user_decks(u,'mandarim');
    reset role;
  end loop; end $$;
update profiles set plan_tier='premium', public_profile=true where user_id in ('00000000-0000-0000-0000-000000000dd1','00000000-0000-0000-0000-000000000dd3');

create temp table dk(k text primary key, id bigint);
insert into dk select 'fr_root', id from decks where owner_id='00000000-0000-0000-0000-000000000dd1' and kind='personal_root' and language_app_key='frances';
insert into dk select 'zh_root', id from decks where owner_id='00000000-0000-0000-0000-000000000dd1' and kind='personal_root' and language_app_key='mandarim';
insert into decks(owner_id,kind,name,language_app_key,parent_deck_id) select '00000000-0000-0000-0000-000000000dd1','personal','D2 Mídia','frances',id from dk where k='fr_root';
insert into dk select 'main', id from decks where name='D2 Mídia' and owner_id='00000000-0000-0000-0000-000000000dd1';
insert into decks(owner_id,kind,name,language_app_key,parent_deck_id) select '00000000-0000-0000-0000-000000000dd1','personal','D2 Sub','frances',id from dk where k='main';
insert into dk select 'sub', id from decks where name='D2 Sub' and owner_id='00000000-0000-0000-0000-000000000dd1';
insert into decks(owner_id,kind,name,language_app_key,parent_deck_id) select '00000000-0000-0000-0000-000000000dd1','personal','D2 SubSub','frances',id from dk where k='sub';
insert into dk select 'subsub', id from decks where name='D2 SubSub' and owner_id='00000000-0000-0000-0000-000000000dd1';
insert into decks(owner_id,kind,name,language_app_key,parent_deck_id) select '00000000-0000-0000-0000-000000000dd1','personal','D2 Quirk','frances',id from dk where k='fr_root';
insert into dk select 'quirk', id from decks where name='D2 Quirk' and owner_id='00000000-0000-0000-0000-000000000dd1';
insert into decks(owner_id,kind,name,language_app_key,parent_deck_id) select '00000000-0000-0000-0000-000000000dd1','personal','D2 ZH','mandarim',id from dk where k='zh_root';
insert into dk select 'zh', id from decks where name='D2 ZH' and owner_id='00000000-0000-0000-0000-000000000dd1';

-- Notes (ordem de created_at = ordem de inserção)
create function pg_temp.f(lang text, val text, extra jsonb default '{}'::jsonb, id text default 'a') returns jsonb language sql as
$$ select jsonb_build_object('id',id,'lang',lang,'content',jsonb_build_object('value',val)) || extra $$;
insert into own_flashcards(owner_id,language_app_key,deck_id,front,back_trans,fields,card_generation_mode,tags,created_at)
select '00000000-0000-0000-0000-000000000dd1',case when x.dk='zh' then 'mandarim' else 'frances' end,(select id from dk where k=x.dk),'x','y',x.fields,x.mode,x.tags, now() + (x.n || ' ms')::interval
from (values
 (1,'main','normal','{vocab}'::text[], jsonb_build_array(pg_temp.f('fr','chat', jsonb_build_object('audio', jsonb_build_object('type','upload','url',d2t.u('00000000-0000-0000-0000-000000000dd1/chat.mp3'),'storagePath','00000000-0000-0000-0000-000000000dd1/chat.mp3','generationKey','g1','mimeType','audio/mpeg')), 'a'), pg_temp.f('pt-BR','gato','{}','b'))),
 (2,'main','normal','{}', jsonb_build_array(pg_temp.f('fr','chien', jsonb_build_object('audio', jsonb_build_object('type','tts','url',d2t.u('00000000-0000-0000-0000-000000000dd1/chien-u.mp3'),'generatedUrl',d2t.u('00000000-0000-0000-0000-000000000dd1/chien-g.mp3'),'generationKey','k2','text','chien')),'a'), pg_temp.f('pt-BR','cão','{}','b'))),
 (3,'main','normal','{a,b}', jsonb_build_array(pg_temp.f('fr','maison', jsonb_build_object('image', jsonb_build_object('url',d2t.u('00000000-0000-0000-0000-000000000dd1/maison.png'),'storagePath','x/y.png','generationKey','zz')),'a'), pg_temp.f('pt-BR','casa','{}','b'))),
 (4,'main','normal','{}', jsonb_build_array(pg_temp.f('fr','ext', jsonb_build_object('audio', jsonb_build_object('type','url','url','https://ext.example.com/a.mp3')),'a'), pg_temp.f('pt-BR','externo', jsonb_build_object('image', jsonb_build_object('url',d2t.u('00000000-0000-0000-0000-000000000dd1/../evil.png'))),'b'))),
 (5,'main','normal','{}', jsonb_build_array(pg_temp.f('fr','query', jsonb_build_object('audio', jsonb_build_object('type','upload','url',d2t.u('00000000-0000-0000-0000-000000000dd1/q.mp3?x=1'))),'a'), pg_temp.f('pt-BR','consulta', jsonb_build_object('audio', 'null'::jsonb),'b'))),
 (6,'main','multiple_choice','{mc}', jsonb_build_array(
     pg_temp.f('fr','Qui ?', jsonb_build_object('role','prompt','audio', jsonb_build_object('type','upload','url',d2t.u('00000000-0000-0000-0000-000000000dd1/qui.mp3'))),'p'),
     pg_temp.f('pt-BR','Quem?', jsonb_build_object('role','answer','image', jsonb_build_object('url',d2t.u('00000000-0000-0000-0000-000000000dd1/quem.png'))),'r'),
     pg_temp.f('pt-BR','Onde?', jsonb_build_object('role','distractor'),'d1'))),
 (7,'main','cloze','{}', jsonb_build_array(pg_temp.f('fr','Le {{c1::chat}} dort.', jsonb_build_object('audio', jsonb_build_object('type','upload','url',d2t.u('00000000-0000-0000-0000-000000000dd1/cloze.mp3'))),'a'), pg_temp.f('pt-BR','O gato dorme.','{}','b'))),
 (8,'main','normal_reversed','{}', jsonb_build_array(pg_temp.f('fr','pomme', jsonb_build_object('image', jsonb_build_object('url',d2t.u('00000000-0000-0000-0000-000000000dd1/pomme.png'))),'a'), pg_temp.f('pt-BR','maçã', jsonb_build_object('image', jsonb_build_object('url',d2t.u('00000000-0000-0000-0000-000000000dd1/maca.png'))),'b'))),
 (9,'main','normal','{}', jsonb_build_array(pg_temp.f('fr','sans','{}','a'), pg_temp.f('pt-BR','sem mídia','{}','b'))),
 (10,'sub','normal','{}', jsonb_build_array(pg_temp.f('fr','chat bis', jsonb_build_object('audio', jsonb_build_object('type','upload','url',d2t.u('00000000-0000-0000-0000-000000000dd1/chat.mp3'))),'a'), pg_temp.f('pt-BR','gato bis', jsonb_build_object('audio', jsonb_build_object('type','upload','url',d2t.u('00000000-0000-0000-0000-000000000dd1/chat.mp3'))),'b'))),
 (11,'subsub','type_answer','{}', jsonb_build_array(pg_temp.f('fr','écrire', jsonb_build_object('audio', jsonb_build_object('type','upload','url',d2t.u('00000000-0000-0000-0000-000000000dd1/ecrire.mp3'))),'a'), pg_temp.f('pt-BR','escrever', jsonb_build_object('image', jsonb_build_object('url',d2t.u('00000000-0000-0000-0000-000000000dd1/escrever.png'))),'b'))),
 (12,'main','normal','{}', jsonb_build_array(pg_temp.f('fr','zzz último', jsonb_build_object('audio', jsonb_build_object('type','upload','url',d2t.u('00000000-0000-0000-0000-000000000dd1/zlast.mp3'))),'a'), pg_temp.f('pt-BR','último','{}','b'))),
 (13,'quirk','normal','{}', jsonb_build_array(pg_temp.f('fr','gerada', jsonb_build_object('image', jsonb_build_object('url',d2t.u('00000000-0000-0000-0000-000000000dd1/qi.png'),'generatedUrl',d2t.u('00000000-0000-0000-0000-000000000dd1/qg.png'))),'a'), pg_temp.f('pt-BR','imagem gerada','{}','b'))),
 (14,'zh','type_answer','{zh}', jsonb_build_array(pg_temp.f('zh','你好', jsonb_build_object('pinyinFieldId','py','audio', jsonb_build_object('type','upload','url',d2t.u('00000000-0000-0000-0000-000000000dd1/nihao.mp3'))),'h'), pg_temp.f('zh-pinyin','nǐ hǎo','{}','py'), pg_temp.f('pt-BR','olá', jsonb_build_object('image', jsonb_build_object('url',d2t.u('00000000-0000-0000-0000-000000000dd1/ola.png'))),'t')))
) x(n, dk, mode, tags, fields);
-- Legacy com mídia (audio_url/image_url) e Note ARQUIVADA com mídia (não copiada)
insert into own_flashcards(owner_id,language_app_key,deck_id,front,back_trans,audio_url,image_url,tags,created_at)
values ('00000000-0000-0000-0000-000000000dd1','frances',(select id from dk where k='main'),'legado','legado pt',
        d2t.u('00000000-0000-0000-0000-000000000dd1/legacy.mp3'), d2t.u('00000000-0000-0000-0000-000000000dd1/legacy.png'), '{leg}', now() + interval '100 ms');
insert into own_flashcards(owner_id,language_app_key,deck_id,front,back_trans,fields,card_generation_mode,status,created_at)
values ('00000000-0000-0000-0000-000000000dd1','frances',(select id from dk where k='main'),'x','y',
        jsonb_build_array(pg_temp.f('fr','arquivada', jsonb_build_object('audio', jsonb_build_object('type','upload','url',d2t.u('00000000-0000-0000-0000-000000000dd1/arch.mp3'))),'a'), pg_temp.f('pt-BR','arq','{}','b')),
        'normal','archived', now() + interval '101 ms');
-- objetos no Storage: originais do dono e cópias "já feitas" pelo copiador
insert into storage.objects(bucket_id,name)
select distinct 'flashcard-media', public.flashcard_media_path(u) from (
  select e #>> '{audio,url}' u from own_flashcards f, jsonb_array_elements(f.fields) e where owner_id='00000000-0000-0000-0000-000000000dd1'
  union select e #>> '{audio,generatedUrl}' from own_flashcards f, jsonb_array_elements(f.fields) e where owner_id='00000000-0000-0000-0000-000000000dd1'
  union select e #>> '{image,url}' from own_flashcards f, jsonb_array_elements(f.fields) e where owner_id='00000000-0000-0000-0000-000000000dd1'
  union select e #>> '{image,generatedUrl}' from own_flashcards f, jsonb_array_elements(f.fields) e where owner_id='00000000-0000-0000-0000-000000000dd1'
  union select audio_url from own_flashcards where owner_id='00000000-0000-0000-0000-000000000dd1'
  union select image_url from own_flashcards where owner_id='00000000-0000-0000-0000-000000000dd1') q where public.flashcard_media_path(u) is not null;
insert into storage.objects(bucket_id,name)
select bucket_id, '00000000-0000-0000-0000-000000000dd3/pubcopy-' || replace(name,'/','_') from storage.objects where split_part(name,'/',1)='00000000-0000-0000-0000-000000000dd1';
-- coleção do copiador: EXACT de "sans" (sem mídia) e de "chien" (com mídia) => não entram no manifest/cópia
insert into own_flashcards(owner_id,language_app_key,deck_id,front,back_trans,fields,card_generation_mode)
select '00000000-0000-0000-0000-000000000dd3','frances',(select id from decks where owner_id='00000000-0000-0000-0000-000000000dd3' and kind='personal_root' and language_app_key='frances'),
       front, back_trans, fields, card_generation_mode from own_flashcards where owner_id='00000000-0000-0000-0000-000000000dd1' and fields -> 0 -> 'content' ->> 'value' in ('sans','chien');
-- publicar
do $$ declare d bigint; ids bigint[]; begin
  select array_agg(id order by id) into ids from dk where k in ('main','sub','subsub','quirk','zh');
  perform d2t.as_user('00000000-0000-0000-0000-000000000dd1'); set local role authenticated;
  foreach d in array ids loop
    perform public.publish_deck(d,'d2','book','gray');
  end loop;
  reset role; end $$;
create table if not exists d2t.decks(k text primary key, id bigint, public_id uuid);
truncate d2t.decks;
insert into d2t.decks select dk.k, dk.id, d.public_id from dk join decks d on d.id = dk.id;
select 'fixtures', count(*) from own_flashcards where owner_id='00000000-0000-0000-0000-000000000dd1';
